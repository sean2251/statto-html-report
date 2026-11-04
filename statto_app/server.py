"""The app's local web server.

It listens only on 127.0.0.1 (this computer), serves the home page and each
season's Set up editor, and gives the editor somewhere to save to: the season
folder on disk. Standard library only.

Every state-changing request must come from this server's own pages: the Host
header has to be the loopback address (blocks DNS-rebinding) and a POST has to
carry a matching Origin (blocks other websites from posting to it).
"""

import json
import logging
import os
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

from statto_report.render import json_for_script, render_html

from . import __version__
from .own_site import publish_to_folder
from .settings import Settings, choose_folder, open_in_file_browser
from .store import SeasonStore, StoreError
from statto_report.tagging_site import build_tagging_site_html

log = logging.getLogger("statto_app")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
MAX_BODY = 300 * 1024 * 1024  # a .statto export or a data bundle full of photos


class App:
    """Shared state for request handlers."""

    def __init__(self, settings=None):
        self.settings = settings or Settings()
        self.store = SeasonStore(self.settings.seasons_dir)
        self.server = None

    def reload_store(self):
        self.store = SeasonStore(self.settings.seasons_dir)


def season_api_path(season_id):
    return "/api/seasons/" + quote(season_id, safe="")


def editor_html(app, season):
    report, team = season.report()
    meta = season.meta()
    boot = {
        "appVersion": __version__,
        "seasonId": season.id,
        "seasonName": meta.get("name") or season.id,
        "api": season_api_path(season.id),
        "home": "/",
        "folder": season.path,
        "revision": season.revision(),
        "data": season.data(),
        "taggingSiteUrl": app.settings.public()["taggingSiteUrl"],
        "ownSiteConfigured": bool(app.settings.get("ownSiteFolder")),
        "fileBrowserName": app.settings.public()["fileBrowserName"],
    }
    inject = '<script id="statto-app-bootstrap">window.__STATTO_APP__=%s;</script>' % json_for_script(boot)
    title = "%s — Set up editor" % (meta.get("name") or team)
    return render_html(report, title, inject)


class Handler(BaseHTTPRequestHandler):
    server_version = "StattoReports/" + __version__
    app = None  # set by make_server

    # ---- plumbing ----
    def log_message(self, fmt, *args):
        log.info("%s - %s", self.address_string(), fmt % args)

    def _allowed_hosts(self):
        port = self.server.server_address[1]
        return {"127.0.0.1:%d" % port, "localhost:%d" % port}

    def _check_host(self):
        return (self.headers.get("Host") or "") in self._allowed_hosts()

    def _check_origin(self):
        origin = self.headers.get("Origin")
        if origin is None:
            return False
        return urlparse(origin).netloc in self._allowed_hosts() and origin.startswith("http://")

    def _send(self, status, body, content_type="application/json; charset=utf-8", extra_headers=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, obj, status=200):
        self._send(status, json.dumps(obj))

    def _error(self, message, status=400, **extra):
        payload = {"error": message}
        payload.update(extra)
        self._json(payload, status)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise StoreError("That file is too large.", status=413)
        return self.rfile.read(n) if n else b""

    def _json_body(self):
        try:
            return json.loads(self._body().decode("utf-8") or "null")
        except ValueError:
            raise StoreError("That file isn’t valid JSON.")

    # ---- routing ----
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self._check_host():
            return self._send(HTTPStatus.FORBIDDEN, "Forbidden", "text/plain")
        url = urlparse(self.path)
        parts = [unquote(p) for p in url.path.split("/") if p]
        try:
            if not parts:
                return self._static("home.html", "text/html; charset=utf-8")
            if parts == ["api", "ping"]:
                return self._json({"app": "statto-reports", "version": __version__})
            if parts == ["api", "seasons"]:
                return self._json({"seasons": [s.summary() for s in self.app.store.list()]})
            if parts == ["api", "settings"]:
                return self._json(self.app.settings.public())
            if parts and parts[0] == "tagging-site":
                return self._send(200, build_tagging_site_html(), "text/html; charset=utf-8")
            if len(parts) == 3 and parts[0] == "seasons" and parts[2] == "editor":
                season = self.app.store.get(parts[1])
                return self._send(200, editor_html(self.app, season), "text/html; charset=utf-8")
            if len(parts) == 4 and parts[0] == "seasons" and parts[2] == "published":
                season = self.app.store.get(parts[1])
                name = os.path.basename(parts[3])
                path = season.p("published", name)
                if not os.path.isfile(path):
                    raise StoreError("Not found.", status=404)
                with open(path, "rb") as f:
                    ctype = "application/json" if name.endswith(".json") else "text/html; charset=utf-8"
                    return self._send(200, f.read(), ctype)
            if parts[0] == "static" and len(parts) == 2:
                return self._static(parts[1])
            raise StoreError("Not found.", status=404)
        except StoreError as e:
            if parts and parts[0] == "seasons":
                return self._send(e.status, "<p>%s <a href='/'>Back to your seasons</a></p>" % e, "text/html; charset=utf-8")
            return self._error(str(e), e.status, **e.extra)
        except Exception as e:  # pragma: no cover - surfaced to the UI
            log.exception("GET %s failed", self.path)
            return self._error("Something went wrong: %s" % e, 500)

    def _static(self, name, ctype=None):
        path = os.path.join(STATIC_DIR, os.path.basename(name))
        if not os.path.isfile(path):
            raise StoreError("Not found.", status=404)
        if ctype is None:
            ctype = {"css": "text/css", "js": "text/javascript", "svg": "image/svg+xml", "png": "image/png"}.get(
                name.rsplit(".", 1)[-1], "application/octet-stream")
        with open(path, "rb") as f:
            self._send(200, f.read(), ctype)

    def do_POST(self):
        if not self._check_host() or not self._check_origin():
            return self._send(HTTPStatus.FORBIDDEN, "Forbidden", "text/plain")
        url = urlparse(self.path)
        q = {k: v[-1] for k, v in parse_qs(url.query).items()}
        parts = [unquote(p) for p in url.path.split("/") if p]
        try:
            if parts == ["api", "seasons"]:
                return self._create_season(q)
            if parts == ["api", "settings"]:
                try:
                    self.app.settings.update(self._json_body() or {})
                except ValueError as e:
                    raise StoreError(str(e))
                self.app.reload_store()
                return self._json(self.app.settings.public())
            if parts == ["api", "choose-folder"]:
                return self._json({"path": choose_folder(q.get("prompt") or "Choose a folder")})
            if parts == ["api", "open-folder"]:
                target = q.get("path") or self.app.settings.seasons_dir
                allowed = [self.app.settings.seasons_dir, self.app.settings.get("ownSiteFolder") or ""]
                real = os.path.realpath(target)
                if not any(a and (real == os.path.realpath(a) or real.startswith(os.path.realpath(a) + os.sep)) for a in allowed):
                    raise StoreError("Can only open folders inside your seasons folder.", status=403)
                os.makedirs(self.app.settings.seasons_dir, exist_ok=True)
                open_in_file_browser(target)
                return self._json({"ok": True})
            if parts == ["api", "quit"]:
                self._json({"ok": True})
                threading.Thread(target=self.app.server.shutdown, daemon=True).start()
                return None
            if len(parts) == 4 and parts[:2] == ["api", "seasons"]:
                season = self.app.store.get(parts[2])
                action = parts[3]
                if action == "data":
                    rev = season.save_data(self._json_body(), base_revision=q.get("rev"),
                                           force=q.get("force") == "1",
                                           backup_reason="import" if q.get("import") == "1" else None)
                    return self._json({"revision": rev})
                if action == "statto":
                    return self._json(season.replace_statto(self._body(), confirm=q.get("confirm") == "1"))
                if action == "publish":
                    path = season.publish(q.get("name") or "team_report.html", self._body())
                    return self._json({"path": path, "file": os.path.basename(path),
                                       "url": "/seasons/%s/published/%s" % (quote(season.id, safe=""), quote(os.path.basename(path)))})
                if action == "publish-own-site":
                    folder = self.app.settings.get("ownSiteFolder")
                    msg = q.get("message") or ("Add tagging page " + (q.get("name") or ""))
                    return self._json(publish_to_folder(folder, q.get("name") or "tagging.html", self._body(), msg))
                if action == "open-folder":
                    sub = q.get("sub")
                    path = season.p(sub) if sub in ("published", "backups") else season.path
                    if sub and q.get("file"):
                        path = os.path.join(path, os.path.basename(q["file"]))
                    if not os.path.exists(path):
                        path = season.path
                    open_in_file_browser(path)
                    return self._json({"ok": True})
            raise StoreError("Not found.", status=404)
        except StoreError as e:
            return self._error(str(e), e.status, **e.extra)
        except Exception as e:  # pragma: no cover
            log.exception("POST %s failed", self.path)
            return self._error("Something went wrong: %s" % e, 500)

    def _create_season(self, q):
        """POST /api/seasons?name=... with a JSON body {statto: <base64>, data: <bundle>|null}."""
        import base64
        body = self._json_body() or {}
        try:
            statto = base64.b64decode(body.get("statto") or "", validate=True)
        except ValueError:
            raise StoreError("Couldn’t read that Statto file.")
        if not statto:
            raise StoreError("Choose your team’s .statto export first.")
        season = self.app.store.create(body.get("name") or q.get("name") or "", statto, body.get("data"))
        return self._json(season.summary())


def make_server(app, port=0, host="127.0.0.1"):
    handler = type("BoundHandler", (Handler,), {"app": app})
    server = ThreadingHTTPServer((host, port), handler)
    server.daemon_threads = True
    app.server = server
    return server
