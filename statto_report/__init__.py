"""
statto_report

Turns a Statto (.statto) export into a single self-contained HTML season
report. See the top-level statto_to_html_report.py for CLI usage.

Package layout:
    constants.py   Field-dimension constants shared by the stats engine.
    statto_io.py   Reading .statto files and small formatting helpers.
    stats.py       The stats engine: turns raw Statto relations into the
                   report data structure consumed by the HTML template.
    render.py      Assembles the final HTML by combining stats.py's output
                   with the templates/ assets.
    cli.py         argparse wiring and the `main()` entry point.
    templates/     The report's HTML skeleton, CSS, and client-side JS.
"""

from .render import generate_html

__all__ = ["generate_html"]
