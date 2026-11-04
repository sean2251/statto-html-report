"""Shared test fixtures: the fake example season, and variations of it."""

import io
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMPLE = os.path.join(ROOT, "examples", "example_season.statto")
TEAM = "Sample Ultimate Club"


def example_bytes():
    with open(EXAMPLE, "rb") as f:
        return f.read()


def without_earliest_game(data):
    """The example export minus its earliest-dated game -- as if that game's
    film was stat'd later than the others."""
    src = zipfile.ZipFile(io.BytesIO(data))
    doc = json.loads(src.read("data.json"))
    rel = doc["teams"][0]["data"]["relations"]
    first = min(rel["games"], key=lambda g: g["date"])["uuid"]
    rel["games"] = [g for g in rel["games"] if g["uuid"] != first]
    rel["points"] = [p for p in rel["points"] if p.get("gameUUID") != first]
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        for name in src.namelist():
            z.writestr(name, json.dumps(doc) if name == "data.json" else src.read(name))
    return out.getvalue()


def bundle(**sections):
    """An "Export all custom data" bundle with the given sections."""
    b = {"statto": "custom-data", "version": 1, "teamName": TEAM}
    b.update(sections)
    return b


def legacy_bundle(video_links, tournaments=None, lines=None):
    """A bundle as an editor from before game IDs would have exported it:
    video links, tournaments and line points all keyed by game *position*."""
    return bundle(
        setup={"version": 1, "tournaments": tournaments or [], "videoLinks": video_links, "playerPhotos": {}},
        lines={"version": 1, "lines": lines or [], "tournamentLabels": {}},
        annotations={"version": 1, "passes": {}, "blocks": {}, "points": {}},
    )
