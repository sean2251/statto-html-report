"""Assembles the final report HTML from templates/ and a computed report dict."""

import html as _html
import json
import os

from .stats import compute_team_report
from .statto_io import load_statto

_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")


def _read_template(filename):
    with open(os.path.join(_TEMPLATE_DIR, filename), "r", encoding="utf-8") as f:
        return f.read()


def generate_html(statto_path, title=None):
    """Read a .statto export and return (html, team_name) for the season report.

    ``title`` overrides the browser tab title (the ``<title>`` tag). This is what
    distinguishes otherwise-identical builds -- e.g. one video-tagging site per
    opponent, deployed side by side, whose tabs would all read the same without
    it. When omitted, the title falls back to "<team> — Season Report".
    """
    data = load_statto(statto_path)
    teams = data.get("teams", [])
    if not teams:
        raise ValueError("No teams found in this .statto file.")
    # Use the first team (a .statto file almost always has exactly one)
    team_entry = teams[0]
    relations = team_entry.get("data", {}).get("relations", {})
    team_name = team_entry.get("data", {}).get("team", {}).get("name", "Team")

    report = compute_team_report(relations, team_name)
    report_json = json.dumps(report)

    page_title = title if (title and title.strip()) else f"{team_name} — Set up editor"

    html = (
        _read_template("report.html")
        .replace("__REPORT_CSS__", _read_template("report.css"))
        .replace("__REPORT_JS__", _read_template("report.js"))
        .replace("__PAGE_TITLE__", _html.escape(page_title, quote=False))
        .replace("__REPORT_DATA_JSON__", report_json)
    )
    return html, team_name
