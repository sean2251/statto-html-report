"""Tests for the team site (site/): a real local copy of it, run by Wrangler
(Cloudflare's local Workers runtime, with a local D1 database), driven through
its API and in headless Chromium.

Needs Node, site/node_modules (cd site && npm install) and Playwright for the
browser parts; skipped without them. CI sets STATTO_REQUIRE_SITE_TESTS=1 so a
missing piece fails instead of silently skipping.
"""

import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request

from helpers import EXAMPLE, ROOT, TEAM, example_bytes, legacy_bundle, without_earliest_game

SITE = os.path.join(ROOT, "site")
WRANGLER = os.path.join(SITE, "node_modules", ".bin", "wrangler")
EDITOR_PW = "editor-pass-for-tests"
TAGGER_PW = "tagger-pass-for-tests"
VIEWER_PW = "viewer-pass-for-tests"

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover
    sync_playwright = None

REQUIRED = os.environ.get("STATTO_REQUIRE_SITE_TESTS") == "1"


def setUpModule():
    missing = []
    if not shutil.which("node"):
        missing.append("Node")
    if not os.path.exists(WRANGLER):
        missing.append("site/node_modules (cd site && npm install)")
    if sync_playwright is None:
        missing.append("Playwright")
    if missing:
        msg = "Team site tests need: " + ", ".join(missing)
        if REQUIRED:
            raise RuntimeError(msg)
        raise unittest.SkipTest(msg)


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class LocalSite:
    """A fresh copy of the team site, with an empty database."""

    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.port = free_port()
        self.base = "http://127.0.0.1:%d" % self.port
        self.log = open(os.path.join(self.tmp.name, "wrangler.log"), "w")
        self.proc = subprocess.Popen(
            [WRANGLER, "dev", "--port", str(self.port), "--ip", "127.0.0.1",
             "--persist-to", os.path.join(self.tmp.name, "state"),
             "--var", "EDITOR_PASSWORD:" + EDITOR_PW, "--show-interactive-dev-session=false"],
            cwd=SITE, stdout=self.log, stderr=subprocess.STDOUT, start_new_session=True)
        deadline = time.time() + 90
        while time.time() < deadline:
            try:
                urllib.request.urlopen(self.base + "/api/status", timeout=2)
                return
            except Exception:
                time.sleep(0.5)
        self.stop()
        raise RuntimeError("The local team site didn't start; see wrangler's log.")

    def stop(self):
        if self.proc.poll() is None:
            os.killpg(self.proc.pid, 15)
            try:
                self.proc.wait(10)
            except subprocess.TimeoutExpired:
                os.killpg(self.proc.pid, 9)
        self.log.close()
        self.tmp.cleanup()


class Api:
    """A signed-in (or not) API client with its own cookie."""

    def __init__(self, base):
        self.base = base
        self.cookie = None

    def call(self, method, path, body=None, ctype="application/json", raw=False):
        data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Origin", self.base)
        if data is not None:
            req.add_header("Content-Type", ctype)
        if self.cookie:
            req.add_header("Cookie", self.cookie)
        try:
            with urllib.request.urlopen(req) as r:
                set_cookie = r.headers.get("Set-Cookie")
                if set_cookie:
                    self.cookie = set_cookie.split(";")[0]
                payload = r.read()
                return r.status, (payload if raw else json.loads(payload or b"null"))
        except urllib.error.HTTPError as e:
            payload = e.read()
            try:
                return e.code, json.loads(payload)
            except ValueError:
                return e.code, payload

    def login(self, role, password, name=None):
        status, body = self.call("POST", "/api/login", {"role": role, "password": password, "name": name})
        assert status == 200, body
        return self


def wait_until(check, timeout=20.0, message="condition"):
    deadline = time.time() + timeout
    while True:
        value = check()
        if value:
            return value
        if time.time() > deadline:
            raise AssertionError("Timed out waiting for " + message)
        time.sleep(0.25)


class ApiTests(unittest.TestCase):
    """The server's rules, without a browser."""

    @classmethod
    def setUpClass(cls):
        cls.site = LocalSite()

    @classmethod
    def tearDownClass(cls):
        cls.site.stop()

    def test_permissions_and_sign_in(self):
        anon = Api(self.site.base)
        status, body = anon.call("GET", "/api/status")
        self.assertTrue(body["editorReady"])
        self.assertFalse(body["taggerReady"])
        self.assertEqual(anon.call("GET", "/api/statto")[0], 401)
        self.assertEqual(anon.call("GET", "/api/report")[0], 401, "viewer password required by default")
        self.assertEqual(anon.call("POST", "/api/login", {"role": "tagger", "name": "A", "password": "x" * 12})[0], 409,
                         "tagger password not set yet")

        editor = Api(self.site.base).login("editor", EDITOR_PW)
        self.assertEqual(editor.call("PUT", "/api/statto?team=" + TEAM.replace(" ", "%20"), example_bytes(),
                                     "application/octet-stream")[0], 200)
        self.assertEqual(editor.call("PUT", "/api/statto", b"not a zip", "application/octet-stream")[0], 400)
        self.assertEqual(editor.call("POST", "/api/settings", {"passwords": {"tagger": "short"}})[0], 400)
        editor.call("POST", "/api/settings", {"passwords": {"tagger": TAGGER_PW, "viewer": VIEWER_PW}})

        tagger = Api(self.site.base).login("tagger", TAGGER_PW, "Alex")
        self.assertEqual(tagger.call("GET", "/api/statto", raw=True)[0], 200)
        self.assertEqual(tagger.call("PUT", "/api/season", {"statto": "custom-data"})[0], 403)
        self.assertEqual(tagger.call("GET", "/api/settings")[0], 403)
        self.assertEqual(tagger.call("GET", "/api/backup")[0], 403)
        self.assertEqual(tagger.call("POST", "/api/tags", {"changes": [{"kind": "passes", "key": "P1", "game": "G", "data": {"hand": "Flick"}}]})[0], 200)

        viewer = Api(self.site.base).login("viewer", VIEWER_PW)
        self.assertEqual(viewer.call("GET", "/api/statto")[0], 403)
        self.assertEqual(viewer.call("GET", "/api/report")[0], 404, "nothing published yet")

        # A request from another website is refused even with a valid cookie.
        req = urllib.request.Request(self.site.base + "/api/settings", data=b"{}", method="POST")
        req.add_header("Origin", "https://evil.example")
        req.add_header("Cookie", editor.cookie)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 403)

        # Changing a password signs out everyone using it.
        editor.call("POST", "/api/settings", {"passwords": {"tagger": TAGGER_PW + "-new"}})
        self.assertEqual(tagger.call("GET", "/api/hub")[0], 401)

        # The viewer password can be switched off.
        editor.call("POST", "/api/settings", {"viewerOpen": True})
        self.assertEqual(Api(self.site.base).call("GET", "/api/report")[0], 404)

    def test_season_revisions_and_backup(self):
        editor = Api(self.site.base).login("editor", EDITOR_PW)
        bundle = {"statto": "custom-data", "setup": {"version": 2, "videoLinks": {}}, "lines": None}
        status, first = editor.call("PUT", "/api/season?rev=0", bundle)
        if status == 409:  # another test saved first; start from the current revision
            status, first = editor.call("PUT", "/api/season?rev=%d" % first["revision"], bundle)
        self.assertEqual(status, 200)
        rev = first["revision"]
        self.assertEqual(editor.call("PUT", "/api/season?rev=%d" % (rev - 1), bundle)[0], 409, "stale revision refused")
        self.assertEqual(editor.call("PUT", "/api/season?rev=%d" % rev, bundle)[0], 200)
        status, backup = editor.call("GET", "/api/backup")
        self.assertEqual(backup["statto"], "team-site-backup")
        self.assertIn("season", backup["blobs"])
        status, restored = editor.call("POST", "/api/restore", backup)
        self.assertEqual(status, 200, restored)


class RateLimitTests(unittest.TestCase):
    def test_too_many_wrong_passwords(self):
        site = LocalSite()
        try:
            api = Api(site.base)
            codes = [api.call("POST", "/api/login", {"role": "editor", "password": "wrong-%d" % i})[0] for i in range(11)]
            self.assertEqual(codes[:10], [401] * 10)
            self.assertEqual(codes[10], 429)
            # Even the right password is refused until the window passes.
            self.assertEqual(api.call("POST", "/api/login", {"role": "editor", "password": EDITOR_PW})[0], 429)
        finally:
            site.stop()


class BrowserTests(unittest.TestCase):
    """The whole flow in a browser: first run, two taggers at once, a newer
    export, publishing and viewing. One site, steps in order."""

    @classmethod
    def setUpClass(cls):
        cls.site = LocalSite()
        cls.base = cls.site.base
        cls.tmp = tempfile.TemporaryDirectory()
        cls.files = {}
        for name, data in (("partial.statto", without_earliest_game(example_bytes())), ("full.statto", example_bytes())):
            path = os.path.join(cls.tmp.name, name)
            with open(path, "wb") as f:
                f.write(data)
            cls.files[name] = path
        path = os.path.join(cls.tmp.name, "season_data.json")
        with open(path, "w") as f:
            json.dump(legacy_bundle({"0": "https://youtu.be/NH", "1": "https://youtu.be/TW"},
                                    tournaments=[{"id": "t1", "label": "Spring", "gameIndices": [1]}]), f)
        cls.files["season_data.json"] = path
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.errors = []

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.site.stop()
        cls.tmp.cleanup()

    def context(self):
        ctx = self.browser.new_context(accept_downloads=True)
        # First-time Team Report viewers get guided tours; mark them seen.
        ctx.add_init_script("""try { localStorage.setItem('statto-report-tours-seen::' + %s, JSON.stringify(
            Object.fromEntries(['season','game','data-editor','player-analysis','line-analysis','thrower-receiver-analysis',
            'field-analysis','gender-analysis','time-series','advanced-stats','raw-data'].map(k => [k, true])))); } catch (e) {}"""
                            % json.dumps(TEAM))

        def watch(page):
            page.on("pageerror", lambda e: self.errors.append(str(e)))
            page.on("dialog", lambda d: d.accept())
        ctx.on("page", watch)
        return ctx

    def sign_in(self, ctx, role, password, name=None):
        page = ctx.new_page()
        page.goto(self.base + "/")
        if name:
            page.fill("#f-tagger [name=name]", name)
        if password is not None:
            page.fill("#f-%s [name=password]" % role, password)
        page.click("#f-%s button" % role)
        return page

    def setup_rows(self, page):
        page.wait_for_selector("table.setup-games", timeout=30000)
        return page.eval_on_selector_all("table.setup-games tbody tr", """trs => trs.map(tr => [
            tr.cells[0].textContent.split('·')[0].replace('vs', '').trim(),
            tr.querySelector('input.setup-video-input').value,
            tr.querySelector('select').selectedOptions[0].textContent])""")

    def editor_api(self):
        return Api(self.base).login("editor", EDITOR_PW)

    def test_1_first_run_brings_in_existing_work(self):
        ctx = self.context()
        page = self.sign_in(ctx, "editor", EDITOR_PW)
        page.wait_for_selector("#f-upload")
        page.set_input_files("#f-upload [name=statto]", self.files["partial.statto"])
        page.set_input_files("#f-upload [name=data]", self.files["season_data.json"])
        page.click("#f-upload button")
        self.assertEqual(self.setup_rows(page), [
            ["Night Herons", "https://youtu.be/NH", "— Unassigned —"],
            ["Tumbleweed", "https://youtu.be/TW", "Spring"],
        ])
        # The old index-keyed data is converted and saved back to the server.
        api = self.editor_api()
        wait_until(lambda: (api.call("GET", "/api/season")[1]["data"] or {}).get("setup", {}).get("version") == 2,
                   message="converted set-up saved")
        api.call("POST", "/api/settings", {"passwords": {"tagger": TAGGER_PW, "viewer": VIEWER_PW}})
        ctx.close()
        self.assertEqual(self.errors, [])

    def test_2_two_taggers_on_one_game(self):
        alex_ctx, blake_ctx, editor_ctx = self.context(), self.context(), self.context()
        hub = self.sign_in(alex_ctx, "tagger", TAGGER_PW, "Alex")
        hub.wait_for_selector(".game")
        games = hub.eval_on_selector_all(".game .name", "e => e.map(x => x.textContent)")
        self.assertTrue(games[0].startswith("vs Tumbleweed"), games)  # newest first
        hub.click(".game >> nth=0 >> button:has-text('Claim')")
        hub.wait_for_selector(".game >> nth=0 >> text=Alex is on it")

        blake = self.sign_in(blake_ctx, "tagger", TAGGER_PW, "Blake")
        blake.wait_for_selector(".game")
        # Both open the same game.
        hub.click(".game >> nth=0 >> a:has-text('Tag')")
        blake.click(".game >> nth=0 >> a:has-text('Tag')")
        for p in (hub, blake):
            p.wait_for_selector("#topnav .tab.active")
            self.assertEqual(p.evaluate("() => REPORT.games[TAGONLY_GAME].opponent"), "Tumbleweed")
            self.assertEqual(p.evaluate("() => loadSetupData().videoLinks[TAGONLY_GAME]"), "https://youtu.be/TW")
        tag = """([i, hand]) => { const a = loadAnnotations(); const g = REPORT.games[TAGONLY_GAME];
            const p = g.points[0].passes[i]; a.passes[p.uuid] = { hand, timestamp: 10 + i }; saveAnnotations(a); return p.uuid; }"""
        p0 = hub.evaluate(tag, [0, "Flick"])
        p1 = blake.evaluate(tag, [1, "Backhand"])
        # Each sees the other's tag within a poll or two, and neither overwrites the other.
        for p in (hub, blake):
            wait_until(lambda p=p: set(p.evaluate("() => Object.keys(loadAnnotations().passes)")) >= {p0, p1},
                       message="tags from the other tagger")
            p.wait_for_selector(".app-status-saved")
        editor = Api(self.base).login("editor", EDITOR_PW)
        tags = {c["key"]: c for c in editor.call("GET", "/api/tags?since=0")[1]["changes"]}
        self.assertEqual(tags[p0]["data"]["hand"], "Flick")
        self.assertEqual(tags[p0]["by"], "Alex")
        self.assertEqual(tags[p1]["by"], "Blake")

        # The editor's own annotation editor gets them live too.
        ed = self.sign_in(editor_ctx, "editor", EDITOR_PW)
        self.setup_rows(ed)
        blake.evaluate(tag, [2, "Hammer"])
        wait_until(lambda: len(ed.evaluate("() => Object.keys(loadAnnotations().passes)")) >= 3, message="editor sees new tags")

        # The hub shows progress and who's tagging now.
        blake.click("#topnav a:has-text('Games')")
        blake.wait_for_selector(".game")
        text = blake.text_content(".game >> nth=0")
        self.assertIn("3/", text)
        self.assertIn("Alex tagging now", text)
        for c in (alex_ctx, blake_ctx, editor_ctx):
            c.close()
        self.assertEqual(self.errors, [])

    def test_3_newer_export_keeps_everything(self):
        ctx = self.context()
        page = self.sign_in(ctx, "editor", EDITOR_PW)
        self.setup_rows(page)
        # The editor checks the new export, saves it, and reloads itself.
        with page.expect_navigation(timeout=30000):
            page.set_input_files("input[type=file][accept='.statto']", self.files["full.statto"])
        self.assertEqual(self.setup_rows(page), [
            ["Glass Cannons", "", "— Unassigned —"],
            ["Night Herons", "https://youtu.be/NH", "— Unassigned —"],
            ["Tumbleweed", "https://youtu.be/TW", "Spring"],
        ])
        counts = page.eval_on_selector_all(".setup-tag-count", "e => e.map(x => x.textContent)")
        self.assertTrue(counts[2].startswith("3/"), counts)
        ctx.close()
        self.assertEqual(self.errors, [])

    def test_4_publish_and_view(self):
        ctx = self.context()
        page = self.sign_in(ctx, "editor", EDITOR_PW)
        self.setup_rows(page)
        page.click("text=Publish Team Report")
        page.wait_for_selector(".app-dialog >> text=Team Report published")
        ctx.close()

        viewer_ctx = self.context()
        view = viewer_ctx.new_page()
        view.goto(self.base + "/view")
        view.wait_for_url("**/?next=*")  # viewer password needed
        view.fill("#f-viewer [name=password]", VIEWER_PW)
        view.click("#f-viewer button")
        view.wait_for_selector("#topnav button.tab")
        self.assertIsNone(view.evaluate("() => APP"))
        self.assertEqual(view.evaluate("() => loadSetupData().videoLinks[2]"), "https://youtu.be/TW")
        for tab in view.query_selector_all("#topnav button.tab[data-target]"):
            if tab.is_visible():
                tab.click()
        viewer_ctx.close()

        # Switch the viewer password off: anyone with the link gets straight in.
        self.editor_api().call("POST", "/api/settings", {"viewerOpen": True})
        open_ctx = self.context()
        view = open_ctx.new_page()
        view.goto(self.base + "/view")
        view.wait_for_selector("#topnav button.tab")
        open_ctx.close()
        self.assertEqual(self.errors, [])

    def test_5_published_report_carries_no_site_data(self):
        status, html = Api(self.base).call("GET", "/api/report", raw=True)
        html = html.decode("utf-8")
        self.assertEqual(status, 200)
        self.assertNotIn("window.__STATTO_APP__=", html)
        self.assertNotIn("window.__STATTO_SYNC__=", html)
        # (report.js mentions the stats engine's path for the editor's on-demand
        # loader; what matters is that nothing in the file loads it.)
        self.assertNotIn('<script src="/assets/stats.js"', html)


if __name__ == "__main__":
    unittest.main()
