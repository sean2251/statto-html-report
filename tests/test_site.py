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
import urllib.parse
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

    def __init__(self, editor_password=EDITOR_PW, persist_to=None):
        self.tmp = tempfile.TemporaryDirectory()
        self.port = free_port()
        self.base = "http://127.0.0.1:%d" % self.port
        self.log_path = os.path.join(self.tmp.name, "wrangler.log")
        self.log = open(self.log_path, "w")
        extra = ["--var", "EDITOR_PASSWORD:" + editor_password] if editor_password else []
        self.proc = subprocess.Popen(
            [WRANGLER, "dev", "--port", str(self.port), "--ip", "127.0.0.1",
             "--persist-to", persist_to or os.path.join(self.tmp.name, "state"),
             "--show-interactive-dev-session=false"] + extra,
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

    def setup_code(self, label="setup code"):
        """The newest code of this kind the site wrote to its logs."""
        import re
        def find():
            with open(self.log_path) as f:
                codes = re.findall(re.escape(label) + r": ([A-Z0-9]{4}-[A-Z0-9]{4})", f.read())
            return codes[-1] if codes else None
        return wait_until(find, message="a %s in the logs" % label)

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
    """A signed-in (or not) API client with its own cookies (like a browser:
    the admin's cookie and one per team it's signed in to)."""

    def __init__(self, base, team=None):
        self.base = base
        self.prefix = "/t/" + team if team else ""
        self.cookies = {}

    @property
    def cookie(self):
        return "; ".join("%s=%s" % kv for kv in self.cookies.items()) or None

    def for_team(self, team):
        """The same browser, talking to another team's API."""
        other = Api(self.base, team)
        other.cookies = self.cookies
        return other

    def call(self, method, path, body=None, ctype="application/json", raw=False, site=False):
        """`path` is this team's (/api/... under /t/<team>), or the site's own
        with site=True (or when this client has no team)."""
        data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
        req = urllib.request.Request(self.base + ("" if site else self.prefix) + path, data=data, method=method)
        req.add_header("Origin", self.base)
        if data is not None:
            req.add_header("Content-Type", ctype)
        if self.cookie:
            req.add_header("Cookie", self.cookie)
        try:
            with urllib.request.urlopen(req) as r:
                for set_cookie in r.headers.get_all("Set-Cookie") or []:
                    name, _, value = set_cookie.split(";")[0].partition("=")
                    if value and "Max-Age=0" not in set_cookie:
                        self.cookies[name] = value
                    else:
                        self.cookies.pop(name, None)
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

    def create_team(self, name, statto=None):
        """As the admin: a new team from a Statto export; returns its slug."""
        status, body = self.call("POST", "/api/teams?name=%s&games=3" % urllib.parse.quote(name),
                                 statto or example_bytes(), "application/octet-stream", site=True)
        assert status == 200, body
        return body["slug"]


def no_redirects():
    """A urllib opener that reports redirects instead of following them."""
    class Keep(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    return urllib.request.build_opener(Keep)


def location_of(url):
    """Where the site sends a plain GET of `url` (or None if it doesn't redirect)."""
    try:
        no_redirects().open(url)
        return None
    except urllib.error.HTTPError as e:
        return e.headers.get("Location") if e.code in (301, 302, 303, 307, 308) else None


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
        cls.team = Api(cls.site.base).login("editor", EDITOR_PW).create_team("RAMP 2026")

    @classmethod
    def tearDownClass(cls):
        cls.site.stop()

    def api(self, team=None):
        return Api(self.site.base, team or self.team)

    def test_permissions_and_sign_in(self):
        self.assertEqual(self.team, "ramp-2026")
        anon = self.api()
        status, body = anon.call("GET", "/api/status")
        self.assertTrue(body["editorReady"])
        self.assertFalse(body["taggerReady"])
        self.assertEqual(body["teamName"], "RAMP 2026")
        self.assertIsNone(body["teams"], "only the admin sees the list of teams")
        self.assertEqual(anon.call("GET", "/api/statto")[0], 401)
        self.assertEqual(anon.call("GET", "/api/report")[0], 401, "viewer password required by default")
        self.assertEqual(anon.call("POST", "/api/login", {"role": "tagger", "name": "A", "password": "x" * 12})[0], 409,
                         "tagger password not set yet")
        self.assertEqual(anon.call("GET", "/api/teams", site=True)[0], 401)
        self.assertEqual(Api(self.site.base).call("POST", "/api/login", {"role": "tagger", "name": "A", "password": "x" * 12})[0], 400,
                         "the site's own sign-in is for the admin only")

        editor = self.api().login("editor", EDITOR_PW)
        self.assertEqual(editor.call("PUT", "/api/statto", example_bytes(), "application/octet-stream")[0], 200)
        self.assertEqual(editor.call("PUT", "/api/statto", b"not a zip", "application/octet-stream")[0], 400)
        self.assertEqual(editor.call("POST", "/api/settings", {"passwords": {"tagger": "short"}})[0], 400)
        editor.call("POST", "/api/settings", {"passwords": {"tagger": TAGGER_PW, "viewer": VIEWER_PW}})

        tagger = self.api().login("tagger", TAGGER_PW, "Alex")
        self.assertEqual(tagger.call("GET", "/api/statto", raw=True)[0], 200)
        self.assertEqual(tagger.call("PUT", "/api/season", {"statto": "custom-data"})[0], 403)
        self.assertEqual(tagger.call("GET", "/api/settings")[0], 403)
        self.assertEqual(tagger.call("GET", "/api/backup")[0], 403)
        self.assertEqual(tagger.call("GET", "/api/teams", site=True)[0], 401, "a tagger isn't the admin")
        self.assertEqual(tagger.call("POST", "/api/tags", {"changes": [{"kind": "passes", "key": "P1", "game": "G", "data": {"hand": "Flick"}}]})[0], 200)

        viewer = self.api().login("viewer", VIEWER_PW)
        self.assertEqual(viewer.call("GET", "/api/statto")[0], 403)
        self.assertEqual(viewer.call("GET", "/api/report")[0], 404, "nothing published yet")

        # A request from another website is refused even with a valid cookie.
        req = urllib.request.Request(self.site.base + "/t/ramp-2026/api/settings", data=b"{}", method="POST")
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
        self.assertEqual(self.api().call("GET", "/api/report")[0], 404)

    def test_season_revisions_and_backup(self):
        editor = self.api().login("editor", EDITOR_PW)
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
        self.assertEqual(backup["teamName"], "RAMP 2026")
        self.assertIn("season", backup["blobs"])
        status, restored = editor.call("POST", "/api/restore", backup)
        self.assertEqual(status, 200, restored)

    def test_teams_are_separate(self):
        admin = Api(self.site.base).login("editor", EDITOR_PW)
        other = admin.create_team("RAMP 2025")
        self.assertEqual(other, "ramp-2025")
        self.assertEqual(admin.create_team("RAMP 2025"), "ramp-2025-2", "addresses stay unique")
        a, b = admin.for_team(self.team), admin.for_team(other)
        a.call("POST", "/api/settings", {"passwords": {"tagger": "tagger-for-team-a", "viewer": "viewer-for-team-a"}})
        b.call("POST", "/api/settings", {"passwords": {"tagger": "tagger-for-team-b"}})
        b.call("PUT", "/api/season?force=1", {"statto": "custom-data", "setup": {"version": 2, "note": "team b"}})
        b.call("POST", "/api/tags", {"changes": [{"kind": "passes", "key": "B1", "game": "GB", "data": {"hand": "Hammer"}}]})

        # One team's password doesn't open another's.
        tagger_a = self.api().login("tagger", "tagger-for-team-a", "Alex")
        self.assertEqual(tagger_a.for_team(other).call("POST", "/api/login",
                         {"role": "tagger", "name": "Alex", "password": "tagger-for-team-a"})[0], 401)
        self.assertEqual(tagger_a.for_team(other).call("GET", "/api/statto")[0], 401)
        self.assertEqual(tagger_a.for_team(other).call("POST", "/api/tags", {"changes": [{"kind": "passes", "key": "X", "data": {}}]})[0], 401)
        self.assertNotIn("B1", [c["key"] for c in tagger_a.call("GET", "/api/tags?since=0")[1]["changes"]])
        self.assertIsNone(tagger_a.call("GET", "/api/season")[1]["data"].get("setup", {}).get("note"))

        # The same browser can be signed in to both, and each team only sees its own.
        tagger_a.for_team(other).login("tagger", "tagger-for-team-b", "Alex")
        self.assertEqual(len(tagger_a.cookies), 2)
        self.assertEqual([c["key"] for c in tagger_a.for_team(other).call("GET", "/api/tags?since=0")[1]["changes"]], ["B1"])
        self.assertEqual(tagger_a.call("GET", "/api/hub")[0], 200, "still signed in to the first team")
        status = tagger_a.call("GET", "/api/status")[1]
        self.assertEqual([t["slug"] for t in status["signedIn"]], [other])
        self.assertIsNone(status["teams"])
        # Signing out on one team leaves the other.
        tagger_a.for_team(other).call("POST", "/api/logout", b"")
        self.assertEqual(tagger_a.for_team(other).call("GET", "/api/hub")[0], 401)
        self.assertEqual(tagger_a.call("GET", "/api/hub")[0], 200)

        # The admin sees and manages every team.
        teams = admin.call("GET", "/api/teams", site=True)[1]["teams"]
        self.assertEqual([t["slug"] for t in teams if t["slug"].startswith("ramp")], [self.team, other, "ramp-2025-2"])
        self.assertTrue(teams[0]["main"])
        self.assertIsNotNone(admin.for_team(other).call("GET", "/api/status")[1]["teams"])
        self.assertEqual(tagger_a.call("POST", "/api/teams/" + other, {"action": "main"}, site=True)[0], 401)

        # The plain address and the old one-team addresses open the main team.
        self.assertEqual(location_of(self.site.base + "/"), self.site.base + "/t/%s/" % self.team)
        self.assertEqual(location_of(self.site.base + "/tag?game=G1"), self.site.base + "/t/%s/tag?game=G1" % self.team)
        admin.call("POST", "/api/teams/" + other, {"action": "main"}, site=True)
        self.assertEqual(location_of(self.site.base + "/view"), self.site.base + "/t/%s/view" % other)
        self.assertEqual(location_of(self.site.base + "/t/" + other), self.site.base + "/t/%s/" % other)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(self.site.base + "/t/no-such-team/")
        self.assertEqual(ctx.exception.code, 404)

        # Deleting a team takes everything in it (and needs its name typed).
        self.assertEqual(admin.call("POST", "/api/teams/" + other, {"action": "delete", "confirm": "nope"}, site=True)[0], 400)
        status, body = admin.call("POST", "/api/teams/" + other, {"action": "delete", "confirm": "RAMP 2025"}, site=True)
        self.assertEqual(status, 200, body)
        self.assertEqual([t["slug"] for t in body["teams"] if t["slug"].startswith("ramp")], [self.team, "ramp-2025-2"])
        self.assertEqual(admin.for_team(other).call("GET", "/api/status")[0], 404)
        self.assertEqual(location_of(self.site.base + "/"), self.site.base + "/t/%s/" % self.team, "back to the first team")
        # A new team at the freed address starts empty.
        self.assertEqual(admin.create_team("RAMP 2025"), other)
        self.assertEqual(admin.for_team(other).call("GET", "/api/tags?since=0")[1]["changes"], [])
        self.assertFalse(admin.for_team(other).call("GET", "/api/status")[1]["taggerReady"])
        self.assertEqual(tagger_a.for_team(other).call("GET", "/api/hub")[0], 401)

    def test_admin_password_is_for_the_whole_site(self):
        admin = Api(self.site.base).login("editor", EDITOR_PW)
        other = admin.create_team("Second Club")
        # Signed in once, the admin can work on any team.
        self.assertEqual(admin.for_team(other).call("GET", "/api/settings")[0], 200)
        self.assertEqual(admin.for_team(self.team).call("GET", "/api/settings")[0], 200)
        # Signing in from a team's page is the same admin login.
        via_team = self.api(other).login("editor", EDITOR_PW)
        self.assertEqual(via_team.call("GET", "/api/teams", site=True)[0], 200)
        self.assertEqual(admin.call("POST", "/api/admin/password", {"password": "short"}, site=True)[0], 400)


class FirstRunSetupTests(unittest.TestCase):
    """A brand-new site with no EDITOR_PASSWORD secret is claimed with a
    one-time code from its own logs."""

    def test_setup_with_a_code_from_the_logs(self):
        site = LocalSite(editor_password=None)
        try:
            anon = Api(site.base)
            status = anon.call("GET", "/api/status")[1]
            self.assertTrue(status["setupNeeded"])
            self.assertFalse(status["editorReady"])
            self.assertEqual(anon.call("POST", "/api/login", {"role": "editor", "password": "x" * 12})[0], 409)
            # No code issued yet.
            self.assertEqual(anon.call("POST", "/api/setup", {"code": "AAAA-AAAA", "password": "y" * 12})[0], 401)

            self.assertEqual(anon.call("POST", "/api/setup/code", b"")[0], 200)
            code = site.setup_code()
            self.assertEqual(anon.call("POST", "/api/setup", {"code": "WRNG-CODE", "password": "y" * 12})[0], 401)
            self.assertEqual(anon.call("POST", "/api/setup", {"code": code, "password": "short"})[0], 400)
            # The code is case- and dash-insensitive, and signs the editor in.
            editor = Api(site.base)
            status_code, body = editor.call("POST", "/api/setup", {"code": code.lower().replace("-", ""), "password": "the-new-editor-pass"})
            self.assertEqual(status_code, 200, body)
            self.assertEqual(body["role"], "editor")
            self.assertEqual(editor.call("GET", "/api/teams")[0], 200)

            status = anon.call("GET", "/api/status")[1]
            self.assertFalse(status["setupNeeded"])
            self.assertTrue(status["editorReady"])
            # Setup is closed for good; the password works for signing in.
            self.assertEqual(anon.call("POST", "/api/setup/code", b"")[0], 409)
            self.assertEqual(anon.call("POST", "/api/setup", {"code": code, "password": "z" * 12})[0], 409)
            Api(site.base).login("editor", "the-new-editor-pass")
        finally:
            site.stop()

    def test_setup_in_the_browser(self):
        site = LocalSite(editor_password=None)
        pw = sync_playwright().start()
        try:
            browser = pw.chromium.launch()
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(site.base + "/")
            page.wait_for_selector("body[data-ready]")
            self.assertTrue(page.is_visible("#f-setup"))
            self.assertFalse(page.is_visible("#f-editor"))
            page.click("#setup-code")
            page.wait_for_selector("text=Code sent to the logs")
            page.fill("#f-setup [name=code]", site.setup_code())
            page.fill("#f-setup [name=password]", "browser-editor-pass")
            page.click("#f-setup button[type=submit]")
            page.wait_for_url("**/new")
            page.wait_for_selector("#f-new")  # signed in, ready to upload the first team
            self.assertEqual(errors, [])
            browser.close()
        finally:
            pw.stop()
            site.stop()


class PasswordResetTests(unittest.TestCase):
    """A forgotten editor password is reset with a one-time code from the logs."""

    @classmethod
    def setUpClass(cls):
        cls.site = LocalSite()

    @classmethod
    def tearDownClass(cls):
        cls.site.stop()

    def test_1_reset_rules(self):
        base = self.site.base
        old_session = Api(base).login("editor", EDITOR_PW)
        anon = Api(base)
        # Setup is closed on a site that has an editor password; reset is open.
        self.assertEqual(anon.call("POST", "/api/setup/code", b"")[0], 409)
        self.assertEqual(anon.call("POST", "/api/reset", {"code": "AAAA-AAAA", "password": "x" * 12})[0], 401,
                         "no reset code issued yet")
        self.assertEqual(anon.call("POST", "/api/reset/code", b"")[0], 200)
        code = self.site.setup_code("password reset code")
        self.assertEqual(anon.call("POST", "/api/reset", {"code": "WRNG-CODE", "password": "x" * 12})[0], 401)
        self.assertEqual(anon.call("POST", "/api/reset", {"code": code, "password": "short"})[0], 400)
        status, body = anon.call("POST", "/api/reset", {"code": code, "password": "the-reset-password"})
        self.assertEqual(status, 200, body)
        self.assertEqual(anon.call("GET", "/api/teams")[0], 200, "signed in by the reset")
        # Everyone on the old password is signed out; the old password no longer works.
        self.assertEqual(old_session.call("GET", "/api/teams")[0], 401)
        self.assertEqual(Api(base).call("POST", "/api/login", {"role": "editor", "password": EDITOR_PW})[0], 401)
        Api(base).login("editor", "the-reset-password")
        # The code is used up.
        self.assertEqual(anon.call("POST", "/api/reset", {"code": code, "password": "another-password"})[0], 401)

    def test_2_reset_in_the_browser(self):
        pw = sync_playwright().start()
        try:
            browser = pw.chromium.launch()
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(self.site.base + "/")
            page.wait_for_selector("body[data-ready]")
            self.assertFalse(page.is_visible("#f-setup"))
            page.click("#forgot")
            self.assertTrue(page.is_visible("#f-reset"))
            self.assertFalse(page.is_visible("#f-editor"))
            page.click("#reset-code")
            page.wait_for_selector("text=Code sent to the logs")
            page.fill("#f-reset [name=code]", self.site.setup_code("password reset code"))
            page.fill("#f-reset [name=password]", "browser-reset-pass")
            page.click("#f-reset button[type=submit]")
            page.wait_for_url("**/new")  # no teams on this site yet: on to upload one
            page.wait_for_selector("#f-new")
            self.assertEqual(errors, [])
            browser.close()
        finally:
            pw.stop()
        Api(self.site.base).login("editor", "browser-reset-pass")


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
    export, publishing and viewing, then a second team. One site, steps in order."""

    team = None  # the first team's address, made in test_1

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

    def sign_in(self, ctx, role, password, name=None, go=None, team=None):
        """Sign in from the team's page; the admin lands on the home page, so
        `go` then opens another of the team's pages (e.g. "/editor" for Season setup)."""
        t = "/t/" + (team or BrowserTests.team)
        page = ctx.new_page()
        page.goto(self.base + t + "/")
        page.wait_for_selector("body[data-ready]")  # sign-in handlers attached
        if name:
            page.fill("#f-tagger [name=name]", name)
        if password is not None:
            page.fill("#f-%s [name=password]" % role, password)
        page.click("#f-%s button" % role)
        if role == "editor":
            page.wait_for_selector("#home:not([hidden])")
        if go:
            page.goto(self.base + t + go)
        return page

    def setup_rows(self, page):
        page.wait_for_selector("table.setup-games", timeout=30000)
        return page.eval_on_selector_all("table.setup-games tbody tr", """trs => trs.map(tr => [
            tr.cells[0].textContent.split('·')[0].replace('vs', '').trim(),
            tr.querySelector('input.setup-video-input').value,
            tr.querySelector('select').selectedOptions[0].textContent])""")

    def editor_api(self):
        return Api(self.base, BrowserTests.team).login("editor", EDITOR_PW)

    def test_1_first_run_brings_in_existing_work(self):
        ctx = self.context()
        # A site with no teams yet: the admin signs in at the plain address
        # and goes on to upload the first one.
        page = ctx.new_page()
        page.goto(self.base + "/")
        page.wait_for_selector("body[data-ready]")
        self.assertFalse(page.is_visible("#f-tagger"), "no teams yet, so no tagger sign-in")
        page.fill("#f-editor [name=password]", EDITOR_PW)
        page.click("#f-editor button")
        page.wait_for_url("**/new")
        page.wait_for_selector("#f-new")
        # Who's signed in shows even here.
        self.assertEqual(page.text_content(".site-account summary").replace("▾", "").strip(), "Admin")
        page.set_input_files("#f-new [name=statto]", self.files["partial.statto"])
        # The name is suggested from the export: the team and its latest year.
        wait_until(lambda: page.input_value("#f-new [name=name]").startswith(TEAM), message="suggested team name")
        page.fill("#f-new [name=name]", "Sample Club 2025")
        page.set_input_files("#f-new [name=data]", self.files["season_data.json"])
        page.click("#f-new button[type=submit]")
        page.wait_for_url("**/t/sample-club-2025/")
        BrowserTests.team = "sample-club-2025"
        page.wait_for_selector("#home:not([hidden])")
        self.assertIn("no video tagger and Team Report password", page.text_content("#home-notes"))
        page.goto(self.base + "/t/sample-club-2025/editor")
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
        editor = self.editor_api()
        tags = {c["key"]: c for c in editor.call("GET", "/api/tags?since=0")[1]["changes"]}
        self.assertEqual(tags[p0]["data"]["hand"], "Flick")
        self.assertEqual(tags[p0]["by"], "Alex")
        self.assertEqual(tags[p1]["by"], "Blake")

        # The editor's own annotation editor gets them live too.
        ed = self.sign_in(editor_ctx, "editor", EDITOR_PW, go="/editor")
        self.setup_rows(ed)
        blake.evaluate(tag, [2, "Hammer"])
        wait_until(lambda: len(ed.evaluate("() => Object.keys(loadAnnotations().passes)")) >= 3, message="editor sees new tags")

        # The hub shows progress and who's tagging now.
        blake.click(".site-bar a:has-text('Tagging hub')")
        blake.wait_for_selector(".game")
        text = blake.text_content(".game >> nth=0")
        self.assertIn("3/", text)
        self.assertIn("Alex tagging now", text)
        for c in (alex_ctx, blake_ctx, editor_ctx):
            c.close()
        self.assertEqual(self.errors, [])

    def test_3_newer_export_keeps_everything(self):
        ctx = self.context()
        page = self.sign_in(ctx, "editor", EDITOR_PW, go="/editor")
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
        page = self.sign_in(ctx, "editor", EDITOR_PW, go="/editor")
        self.setup_rows(page)
        page.click("text=Publish Team Report")
        page.wait_for_selector(".app-dialog >> text=Team Report published")
        ctx.close()

        viewer_ctx = self.context()
        view = viewer_ctx.new_page()
        view.goto(self.base + "/view")  # the old address: sent to the main team
        view.wait_for_url("**/t/%s/?next=*" % BrowserTests.team)  # viewer password needed
        view.wait_for_selector("body[data-ready]")
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

    def test_6_home_page_and_top_bar(self):
        def bar_links(page):
            page.wait_for_selector(".site-bar")
            return page.eval_on_selector_all(".site-bar .site-links a", "e => e.map(x => x.textContent)")

        # The admin: a home page instead of the sign-in cards, with the bar.
        ctx = self.context()
        home = self.sign_in(ctx, "editor", EDITOR_PW)
        self.assertFalse(home.is_visible("#signin-cards"))
        cards = home.eval_on_selector_all(".home-card h3", "e => e.map(x => x.textContent)")
        self.assertEqual(cards, ["Season setup", "Tagging hub", "Team Report", "Site settings"])
        self.assertIn("3 games", home.text_content(".home-card >> nth=0"))
        self.assertIn("events tagged", home.text_content(".home-card >> nth=1"))
        self.assertIn("Published", home.text_content(".home-card >> nth=2"))
        admin_links = ["Home", "Season setup", "Tagging hub", "Team Report", "Site settings"]
        self.assertEqual(bar_links(home), admin_links)
        # Coming back to / while signed in stays on the home page.
        home.goto(self.base + "/")
        home.wait_for_selector("#home:not([hidden])")
        self.assertTrue(home.url.endswith("/t/%s/" % self.team), home.url)
        # The team name at the top left is the admin's team switcher.
        self.assertEqual(home.text_content(".site-teams summary").replace("▾", "").strip(), "Sample Club 2025")

        # The same bar on every page, with the current one marked.
        for path, current in (("/editor", "Season setup"), ("/tag", "Tagging hub"), ("/settings", "Site settings"), ("/view", "Team Report")):
            page = ctx.new_page()
            page.goto(self.base + "/t/" + self.team + path)
            page.wait_for_selector(".site-teams summary", state="visible", timeout=10000)
            self.assertEqual(bar_links(page), admin_links, path)
            self.assertEqual(page.text_content(".site-bar .site-link.active"), current, path)
            page.close()
        editor = ctx.new_page()
        editor.goto(self.base + "/t/" + self.team + "/editor")
        editor.wait_for_selector("table.setup-games")
        self.assertEqual(editor.eval_on_selector_all("#topnav a", "e => e.length"), 0, "no stray links in the tab row")

        # The account menu signs out, back to the sign-in cards.
        home.click(".site-account summary")
        home.click(".site-menu button:has-text('Sign out')")
        home.wait_for_selector("#signin-cards:not([hidden])")
        self.assertFalse(home.is_visible(".site-bar"))
        self.assertTrue(home.url.endswith("/t/%s/" % self.team), home.url)
        ctx.close()

        # A tagger: hub and Team Report only; the tagging page explains live saving.
        tctx = self.context()
        hub = self.sign_in(tctx, "tagger", TAGGER_PW, "Casey")
        hub.wait_for_selector(".game")
        self.assertEqual(bar_links(hub), ["Tagging hub", "Team Report"])
        self.assertEqual(hub.get_attribute(".site-account summary", "title"), "Signed in as Casey · Tagger")
        self.assertFalse(hub.is_visible(".site-teams"), "only the admin can switch teams")
        hub.click(".game >> nth=0 >> .actions a.btn")  # "Tag" or "Continue"
        hub.wait_for_selector("#topnav .tab.active")
        self.assertEqual(bar_links(hub), ["Tagging hub", "Team Report"])
        # ...and on the tagging page itself, top right.
        self.assertEqual(hub.get_attribute(".site-account summary", "title"), "Signed in as Casey · Tagger")
        text = hub.text_content("#data-editor")
        self.assertIn("saves to the team site as you go", text)
        self.assertNotIn("Export annotations JSON", text)
        tctx.close()
        self.assertEqual(self.errors, [])

    def test_5_published_report_carries_no_site_data(self):
        status, html = Api(self.base, self.team).call("GET", "/api/report", raw=True)
        html = html.decode("utf-8")
        self.assertEqual(status, 200)
        self.assertNotIn("window.__STATTO_APP__=", html)
        self.assertNotIn("window.__STATTO_SYNC__=", html)
        # (report.js mentions the stats engine's path for the editor's on-demand
        # loader; what matters is that nothing in the file loads it.)
        self.assertNotIn('<script src="/assets/stats.js"', html)

    def test_7_a_second_team_and_switching(self):
        ctx = self.context()
        home = self.sign_in(ctx, "editor", EDITOR_PW)
        # Upload new team, from the team switcher.
        home.click(".site-teams summary")
        home.click(".site-teams a:has-text('Upload new team')")
        home.wait_for_url("**/new")
        home.set_input_files("#f-new [name=statto]", self.files["full.statto"])
        home.fill("#f-new [name=name]", "Other Club")
        home.click("#f-new button[type=submit]")
        home.wait_for_url("**/t/other-club/")
        home.wait_for_selector("#home:not([hidden])")
        self.assertIn("3 games", home.text_content(".home-card >> nth=0"))
        self.assertIn("0 events tagged", home.text_content(".home-card >> nth=1"), "nothing shared with the first team")
        self.assertIn("Not published yet", home.text_content(".home-card >> nth=2"))

        # Both teams in the switcher; switching keeps you on the same page.
        editor = ctx.new_page()
        editor.goto(self.base + "/t/other-club/editor")
        editor.wait_for_selector("table.setup-games")
        self.assertEqual(editor.text_content(".site-teams summary").replace("▾", "").strip(), "Other Club")
        editor.click(".site-teams summary")
        names = editor.eval_on_selector_all(".site-teams .site-menu-item", "e => e.map(x => x.textContent)")
        self.assertEqual(names, ["Sample Club 2025", "✓ Other Club"])
        editor.click(".site-teams .site-menu-item:has-text('Sample Club 2025')")
        editor.wait_for_url("**/t/%s/editor" % self.team)
        rows = self.setup_rows(editor)
        self.assertEqual(rows[2], ["Tumbleweed", "https://youtu.be/TW", "Spring"], "the first team's set-up")
        ctx.close()

        # A tagger for the first team isn't signed in to the second...
        Api(self.base, "other-club").login("editor", EDITOR_PW).call(
            "POST", "/api/settings", {"passwords": {"tagger": "other-club-tagger"}})
        tctx = self.context()
        hub = self.sign_in(tctx, "tagger", TAGGER_PW, "Dana")
        hub.wait_for_selector(".game")
        other = tctx.new_page()
        other.goto(self.base + "/t/other-club/tag")
        other.wait_for_url("**/t/other-club/?next=*")
        other.wait_for_selector("#signin-cards:not([hidden])")
        # ...until they sign in to it too; then the menu lists the other team.
        other.fill("#f-tagger [name=name]", "Dana")
        other.fill("#f-tagger [name=password]", "other-club-tagger")
        other.click("#f-tagger button")
        other.wait_for_selector(".game")
        other.click(".site-account summary")
        self.assertIn("Sample Club 2025", other.text_content(".site-account .site-menu"))
        hub.reload()
        hub.wait_for_selector(".game")  # still signed in to the first team
        tctx.close()
        self.assertEqual(self.errors, [])


def v1_database(statto, tagger_pw, session_token):
    """SQL for a site from before teams (schema 1): one team's data in
    team-less tables, with a signed-in tagger."""
    import base64
    import hashlib

    def pw_hash(pw):
        salt = b"0123456789abcdef"
        bits = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 10000)
        return "pbkdf2$10000$%s$%s" % (base64.b64encode(salt).decode(), base64.b64encode(bits).decode())

    def q(v):
        return "'" + str(v).replace("'", "''") + "'"
    token_hash = base64.b64encode(hashlib.sha256(session_token.encode()).digest()).decode()
    season = json.dumps({"statto": "custom-data", "setup": {"version": 2, "note": "from before teams"}})
    now = int(time.time())
    return ";\n".join([
        "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        "CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)",
        "CREATE TABLE login_failures (ip TEXT NOT NULL, at INTEGER NOT NULL)",
        "CREATE TABLE blob_parts (name TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (name, part))",
        "CREATE TABLE blobs (name TEXT PRIMARY KEY, parts INTEGER NOT NULL, size INTEGER NOT NULL, content_type TEXT, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, updated_by TEXT)",
        "CREATE TABLE tags (kind TEXT NOT NULL, key TEXT NOT NULL, game TEXT, data TEXT, updated_by TEXT, updated_at INTEGER NOT NULL, seq INTEGER NOT NULL, PRIMARY KEY (kind, key))",
        "CREATE TABLE claims (game TEXT PRIMARY KEY, name TEXT, status TEXT NOT NULL, updated_at INTEGER NOT NULL)",
        "CREATE TABLE activity (game TEXT NOT NULL, name TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (game, name))",
        "INSERT INTO settings VALUES ('schema_version', '1'), ('team_name', 'RAMP 2026'), ('viewer_open', '1'), ('game_count', '3'), "
        "('password_tagger', %s), ('password_editor', %s)" % (q(pw_hash(tagger_pw)), q(pw_hash(EDITOR_PW))),
        "INSERT INTO blob_parts VALUES ('statto', 0, X'%s'), ('season', 0, X'%s')" % (statto.hex(), season.encode().hex()),
        "INSERT INTO blobs VALUES ('statto', 1, %d, 'application/octet-stream', 1, %d, 'Admin'), "
        "('season', 1, %d, 'application/json', 4, %d, 'Admin')" % (len(statto), now, len(season.encode()), now),
        "INSERT INTO tags VALUES ('passes', 'P1', 'G1', '{\"hand\":\"Flick\"}', 'Alex', %d, 1), "
        "('blocks', 'B1', 'G1', '{\"kind\":\"Layout\"}', 'Alex', %d, 2)" % (now, now),
        "INSERT INTO claims VALUES ('G1', 'Alex', 'tagging', %d)" % now,
        "INSERT INTO sessions VALUES (%s, 'tagger', 'Alex', %d, %d)" % (q(token_hash), now, now + 86400),
    ]) + ";\n"


class UpgradeTests(unittest.TestCase):
    """A site from before teams: its data becomes the first team, and old
    links and sign-ins keep working."""

    def test_upgrade_from_one_team(self):
        state = tempfile.mkdtemp()
        try:
            sql = os.path.join(state, "v1.sql")
            with open(sql, "w") as f:
                f.write(v1_database(example_bytes(), TAGGER_PW, "old-tagger-token"))
            subprocess.run([WRANGLER, "d1", "execute", "statto-team-site", "--local", "--persist-to", state, "--file", sql],
                           cwd=SITE, check=True, capture_output=True, timeout=120)
            site = LocalSite(editor_password=None, persist_to=state)
            try:
                base = site.base + "/t/ramp-2026"
                # The old addresses open the converted team.
                self.assertEqual(location_of(site.base + "/"), base + "/")
                self.assertEqual(location_of(site.base + "/tag?game=G1"), base + "/tag?game=G1")
                status = Api(site.base, "ramp-2026").call("GET", "/api/status")[1]
                self.assertEqual(status["teamName"], "RAMP 2026")
                self.assertTrue(status["taggerReady"])
                self.assertTrue(status["viewerOpen"], "team settings carried over")
                # The tagger who was signed in still is, on the team.
                tagger = Api(site.base, "ramp-2026")
                tagger.cookies["statto_session"] = "old-tagger-token"
                tags = tagger.call("GET", "/api/tags?since=0")[1]
                self.assertEqual(sorted(c["key"] for c in tags["changes"]), ["B1", "P1"])
                self.assertEqual(tags["seq"], 2)
                self.assertEqual(tagger.call("GET", "/api/hub")[1]["games"]["G1"]["claim"]["name"], "Alex")
                self.assertEqual(tagger.call("GET", "/api/season")[1]["data"]["setup"]["note"], "from before teams")
                self.assertEqual(tagger.call("GET", "/api/statto", raw=True)[1], example_bytes())
                self.assertEqual(tagger.call("GET", "/api/teams", site=True)[0], 401, "a tagger session isn't the admin")
                # The passwords still work: the tagger's for the team, the admin's for everything.
                Api(site.base, "ramp-2026").login("tagger", TAGGER_PW, "Blake")
                admin = Api(site.base).login("editor", EDITOR_PW)
                self.assertEqual([t["slug"] for t in admin.call("GET", "/api/teams")[1]["teams"]], ["ramp-2026"])
                # New tags carry on from the old sequence.
                self.assertEqual(tagger.call("POST", "/api/tags", {"changes": [{"kind": "passes", "key": "P2", "game": "G1", "data": {}}]})[1]["seq"], 3)
            finally:
                site.stop()
        finally:
            shutil.rmtree(state, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
