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


def build_report(statto_path):
    """Read a .statto export and return (report_dict, team_name)."""
    data = load_statto(statto_path)
    teams = data.get("teams", [])
    if not teams:
        raise ValueError("No teams found in this .statto file.")
    # Use the first team (a .statto file almost always has exactly one)
    team_entry = teams[0]
    relations = team_entry.get("data", {}).get("relations", {})
    team_name = team_entry.get("data", {}).get("team", {}).get("name", "Team")
    return compute_team_report(relations, team_name), team_name


def json_for_script(value):
    """JSON that is safe to place inside a <script> element ("<" escaped)."""
    return json.dumps(value).replace("<", "\\u003c")


def page_template():
    """The report page with CSS and JS inlined but the title and report data
    still as the ``__PAGE_TITLE__`` / ``__REPORT_DATA_JSON__`` placeholders.
    The shared tagging site fills these in the browser, from a game file."""
    return (
        _read_template("report.html")
        .replace("__REPORT_CSS__", _read_template("report.css"))
        .replace("__REPORT_JS__", _read_template("report.js"))
    )


def render_html(report, title, head_inject=""):
    """Render the Set up editor page for an already-computed report dict.

    ``head_inject`` is raw HTML (normally one <script>) placed just before the
    report-data script, i.e. before the report script runs. The local app uses
    it to hand the editor its season's saved data.
    """
    html = (
        page_template()
        .replace("__PAGE_TITLE__", _html.escape(title, quote=False))
        .replace("__REPORT_DATA_JSON__", json_for_script(report))
    )
    if head_inject:
        marker = '<script id="report-data"'
        html = html.replace(marker, head_inject + "\n" + marker, 1)
    return html


def generate_html(statto_path, title=None):
    """Read a .statto export and return (html, team_name) for the Set up editor.

    ``title`` overrides the browser tab title (the ``<title>`` tag). This is what
    distinguishes otherwise-identical builds -- e.g. one video-tagging site per
    opponent, deployed side by side, whose tabs would all read the same without
    it. When omitted, the title falls back to "<team> — Set up editor".
    """
    report, team_name = build_report(statto_path)
    page_title = title if (title and title.strip()) else f"{team_name} — Set up editor"
    return render_html(report, page_title), team_name
