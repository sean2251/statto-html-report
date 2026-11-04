"""Tests for the Statto Reports app, the season store and the tagging site.

Standard library only:  python3 -m unittest discover -s tests
"""

import base64
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

from helpers import EXAMPLE, bundle, example_bytes, without_earliest_game

from statto_app.server import App, make_server
from statto_app.settings import Settings
from statto_app.store import ConflictError, SeasonStore, StoreError
from statto_report.render import build_report, generate_html
from statto_report.tagging_site import build_tagging_site_html


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = SeasonStore(os.path.join(self.tmp.name, "seasons"))

    def tearDown(self):
        self.tmp.cleanup()

    def test_create_and_list(self):
        s = self.store.create("RAMP: 2026/Fall", example_bytes())
        self.assertEqual(s.id, "RAMP- 2026-Fall")  # made safe as a folder name
        self.assertEqual(s.meta()["teamName"], "Sample Ultimate Club")
        self.assertEqual(s.meta()["gameCount"], 3)
        again = self.store.create("RAMP: 2026/Fall", example_bytes())
        self.assertEqual(again.id, "RAMP- 2026-Fall (2)")
        self.assertEqual({x.id for x in self.store.list()}, {s.id, again.id})

    def test_rejects_non_statto(self):
        with self.assertRaises(StoreError):
            self.store.create("x", b"not a zip")
        self.assertEqual(self.store.list(), [])

    def test_unknown_or_unsafe_season_ids(self):
        for bad in ("nope", "../etc", ".hidden", ""):
            with self.assertRaises(StoreError):
                self.store.get(bad)

    def test_save_data_revisions_and_conflicts(self):
        s = self.store.create("S", example_bytes())
        self.assertEqual(s.save_data(bundle(setup={"version": 2}), base_revision=0), 1)
        self.assertEqual(s.save_data(bundle(setup={"version": 2}), base_revision=1), 2)
        with self.assertRaises(ConflictError):
            s.save_data(bundle(), base_revision=1)  # someone else saved rev 2
        self.assertEqual(s.save_data(bundle(lines={}), base_revision=1, force=True), 3)
        self.assertIn("lines", s.data())
        with self.assertRaises(StoreError):
            s.save_data({"not": "a bundle"})

    def test_import_on_create_and_backups(self):
        s = self.store.create("S", example_bytes(), bundle(setup={"version": 1, "videoLinks": {"0": "u"}}))
        self.assertEqual(s.data()["setup"]["videoLinks"], {"0": "u"})
        s.save_data(bundle(), backup_reason="import")
        self.assertTrue(any("import" in f for f in os.listdir(s.p("backups"))))

    def test_replace_statto_reports_new_and_missing_games(self):
        s = self.store.create("S", without_earliest_game(example_bytes()))
        self.assertEqual(s.meta()["gameCount"], 2)
        result = s.replace_statto(example_bytes())
        self.assertEqual(result["games"], 3)
        self.assertEqual(len(result["added"]), 1)
        self.assertEqual(result["removed"], [])
        # Going back to the partial export drops a game: needs confirming.
        with self.assertRaises(ConflictError) as ctx:
            s.replace_statto(without_earliest_game(example_bytes()))
        self.assertTrue(ctx.exception.extra.get("needsConfirm"))
        self.assertEqual(s.meta()["gameCount"], 3)  # unchanged
        self.assertEqual(len(s.replace_statto(without_earliest_game(example_bytes()), confirm=True)["removed"]), 1)
        self.assertTrue(any(f.endswith(".statto") for f in os.listdir(s.p("backups"))))

    def test_publish(self):
        s = self.store.create("S", example_bytes())
        path = s.publish("../../evil name.html", "<html></html>")
        self.assertEqual(os.path.dirname(path), s.p("published"))
        self.assertEqual(s.published_files(), ["evil name.html"])


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        settings = Settings(os.path.join(cls.tmp.name, "settings.json"))
        settings.values["seasonsDir"] = os.path.join(cls.tmp.name, "seasons")
        cls.app = App(settings)
        cls.server = make_server(cls.app, 0)
        cls.base = "http://127.0.0.1:%d" % cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.tmp.cleanup()

    def request(self, method, path, body=None, origin=True, ctype="application/json"):
        req = urllib.request.Request(self.base + path, data=body, method=method)
        if body is not None:
            req.add_header("Content-Type", ctype)
        if origin:
            req.add_header("Origin", self.base)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def create_season(self, name):
        payload = json.dumps({"name": name, "statto": base64.b64encode(example_bytes()).decode()}).encode()
        status, body = self.request("POST", "/api/seasons", payload)
        self.assertEqual(status, 200, body)
        return json.loads(body)

    def test_ping_and_home(self):
        status, body = self.request("GET", "/api/ping", origin=False)
        self.assertEqual(json.loads(body)["app"], "statto-reports")
        status, body = self.request("GET", "/", origin=False)
        self.assertIn(b"Statto Reports", body)

    def test_posts_need_our_origin(self):
        self.assertEqual(self.request("POST", "/api/quit", b"", origin=False)[0], 403)
        req = urllib.request.Request(self.base + "/api/quit", data=b"", method="POST")
        req.add_header("Origin", "https://evil.example")
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 403)

    def test_rejects_foreign_host_header(self):
        req = urllib.request.Request(self.base + "/api/seasons")
        req.add_header("Host", "evil.example")
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 403)

    def test_season_round_trip(self):
        s = self.create_season("Round trip")
        path = "/api/seasons/" + urllib.request.quote(s["id"], safe="")
        status, html = self.request("GET", "/seasons/%s/editor" % urllib.request.quote(s["id"], safe=""), origin=False)
        self.assertEqual(status, 200)
        self.assertIn(b'<script id="statto-app-bootstrap">window.__STATTO_APP__=', html)
        b = json.dumps(bundle(setup={"version": 2, "videoLinks": {}})).encode()
        status, body = self.request("POST", path + "/data?rev=0", b)
        self.assertEqual((status, json.loads(body)["revision"]), (200, 1))
        status, body = self.request("POST", path + "/data?rev=0", b)
        self.assertEqual(status, 409)
        status, body = self.request("POST", path + "/publish?name=team.html", b"<html>r</html>", ctype="text/html")
        self.assertEqual(json.loads(body)["file"], "team.html")
        status, body = self.request("GET", "/seasons/%s/published/team.html" % urllib.request.quote(s["id"], safe=""), origin=False)
        self.assertEqual(body, b"<html>r</html>")

    def test_tagging_site_served(self):
        status, body = self.request("GET", "/tagging-site/", origin=False)
        self.assertEqual(status, 200)
        self.assertIn(b"Statto video tagging", body)


class RenderTests(unittest.TestCase):
    def test_generate_html_has_game_uuids(self):
        html, team = generate_html(EXAMPLE)
        self.assertEqual(team, "Sample Ultimate Club")
        report, _ = build_report(EXAMPLE)
        self.assertTrue(all(g.get("uuid") for g in report["games"]))
        self.assertNotIn("__REPORT_DATA_JSON__", html)
        self.assertNotIn("statto-app-bootstrap\">window", html)

    def test_tagging_site_is_self_contained(self):
        html = build_tagging_site_html()
        for placeholder in ("__TEMPLATE_JSON__", "__KIND_JSON__", "__VERSION_JSON__"):
            self.assertNotIn(placeholder, html)
        # The embedded page template keeps its placeholders for the browser to fill.
        self.assertIn("__REPORT_DATA_JSON__", html)
        # Nothing in the embedded template can close the loader's <script> early.
        script = html[html.index("var TEMPLATE"):]
        self.assertNotIn("</script", script[:script.index(";\n")])


if __name__ == "__main__":
    unittest.main()
