"""The JavaScript stats engine (statto_report/templates/stats.js) must produce
exactly what the Python one (statto_report/stats.py) does.

Runs both on the same .statto exports -- the example season, a partial export,
and variations built to hit the edge cases (both-fault turnovers, stall-outs,
missing coordinates, shared blame, ties, unusual dates) -- and compares every
value. Needs Node 18+; skipped without it.
"""

import copy
import io
import json
import math
import os
import shutil
import subprocess
import tempfile
import unittest
import zipfile

from helpers import ROOT, example_bytes, without_earliest_game

from statto_report.render import build_report

NODE = shutil.which("node")
STATS_JS = os.path.join(ROOT, "statto_report", "templates", "stats.js")

RUNNER = r"""
const fs = require('fs');
const S = require(process.argv[1]);
(async () => {
  const out = {};
  for (const f of process.argv.slice(2)) {
    try { out[f] = await S.reportFromStatto(fs.readFileSync(f)); }
    catch (e) { out[f] = { error: e.message }; }
  }
  process.stdout.write(JSON.stringify(out));
})();
"""


def rewrite(data, mutate):
    """A copy of a .statto export with its data.json changed by `mutate`."""
    src = zipfile.ZipFile(io.BytesIO(data))
    doc = json.loads(src.read("data.json"))
    mutate(doc["teams"][0]["data"])
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name in src.namelist():
            z.writestr(name, json.dumps(doc) if name == "data.json" else src.read(name))
    return out.getvalue()


def edge_cases(team):
    rel = team["relations"]
    passes = rel["passes"]
    # shared-blame turnovers, and plain receiver drops
    for pa in passes[::17]:
        pa["isThrowerError"] = True
        pa["isReceiverError"] = True
    for pa in passes[5::23]:
        pa["isReceiverError"] = True
    # missing coordinates fall back to 0.0
    for pa in passes[3::31]:
        pa.pop("startX", None)
        pa.pop("endY", None)
    # a few stall-outs against us
    rel["stallOutsAgainst"] = [
        {"uuid": "SO-%d" % i, "possessionUUID": po["uuid"], "playerUUID": rel["players"][i % len(rel["players"])]["uuid"]}
        for i, po in enumerate(rel["possessions"][::40])
    ]
    # junk (non-string) uuids and a stall-out block
    if rel.get("defensiveBlocks"):
        rel["defensiveBlocks"][0]["isStallOut"] = True
        rel["defensiveBlocks"][-1]["playerUUID"] = 0
    passes[1]["throwerUUID"] = None
    # a tied game and a date with fractional seconds + offset
    rel["games"][0]["date"] = rel["games"][0]["date"].replace("Z", ".123+00:00")
    team["team"]["name"] = "Edge <Case> FC"


def no_games(team):
    team["relations"]["games"] = []


@unittest.skipUnless(NODE, "Node isn't installed")
class StatsParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        base = example_bytes()
        cls.cases = {
            "example": base,
            "partial": without_earliest_game(base),
            "edge_cases": rewrite(base, edge_cases),
            "no_games": rewrite(base, no_games),
        }
        cls.paths = {}
        for name, data in cls.cases.items():
            path = os.path.join(cls.tmp.name, name + ".statto")
            with open(path, "wb") as f:
                f.write(data)
            cls.paths[name] = path
        result = subprocess.run([NODE, "-e", RUNNER, STATS_JS] + list(cls.paths.values()),
                                capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        cls.js = json.loads(result.stdout)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def assertSame(self, py, js, path="report"):
        if isinstance(py, dict):
            self.assertIsInstance(js, dict, path)
            self.assertEqual(sorted(py), sorted(js), "keys differ at " + path)
            for k in py:
                self.assertSame(py[k], js[k], path + "." + k)
        elif isinstance(py, list):
            self.assertIsInstance(js, list, path)
            self.assertEqual(len(py), len(js), "length differs at " + path)
            for i, (a, b) in enumerate(zip(py, js)):
                self.assertSame(a, b, "%s[%d]" % (path, i))
        elif isinstance(py, bool) or py is None or isinstance(py, str):
            self.assertEqual(py, js, path)
        else:  # numbers: Python may write 1.0 where JSON from JS has 1
            self.assertIsInstance(js, (int, float), path)
            if float(py).is_integer() and float(js).is_integer():
                self.assertEqual(float(py), float(js), path)
            else:
                # Raw distance sums can differ in the last binary digit (Python's
                # math.hypot and JavaScript's Math.hypot round their final bit
                # differently). Far below anything the report displays.
                self.assertTrue(math.isclose(py, js, rel_tol=1e-12, abs_tol=1e-12),
                                "%s: %r != %r" % (path, py, js))

    def check(self, name):
        report, team = build_report(self.paths[name])
        # Round-trip through JSON, exactly as the report is embedded in a page.
        py = json.loads(json.dumps({"report": report, "teamName": team}))
        self.assertNotIn("error", self.js[self.paths[name]], self.js[self.paths[name]])
        self.assertSame(py, self.js[self.paths[name]])

    def test_example_season(self):
        self.check("example")

    def test_partial_export(self):
        self.check("partial")

    def test_edge_cases(self):
        self.check("edge_cases")

    def test_no_games(self):
        self.check("no_games")

    def test_not_a_statto_file(self):
        bad = os.path.join(self.tmp.name, "bad.statto")
        with open(bad, "wb") as f:
            f.write(b"this is not a zip")
        r = subprocess.run([NODE, "-e", RUNNER, STATS_JS, bad], capture_output=True, text=True, timeout=60)
        self.assertIn("isn’t a Statto export", json.loads(r.stdout)[bad]["error"])


if __name__ == "__main__":
    unittest.main()
