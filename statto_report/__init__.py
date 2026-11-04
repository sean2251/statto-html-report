"""
statto_report

Turns a Statto (.statto) export into the Set up editor -- one
self-contained HTML page, from which the read-only Team Report is published.
See the top-level statto_to_html_report.py for CLI usage, and statto_app/ for
the local app built on top of this package.

Package layout:
    constants.py   Field-dimension constants shared by the stats engine.
    statto_io.py   Reading .statto files and small formatting helpers.
    stats.py       The stats engine: turns raw Statto relations into the
                   report data structure consumed by the HTML template.
    render.py      Assembles the final HTML by combining stats.py's output
                   with the templates/ assets.
    tagging_site.py
                   Builds the shared, data-free video-tagging site.
    cli.py         argparse wiring and the `main()` entry point.
    templates/     The report's HTML skeleton, CSS, and client-side JS.
"""

from .render import generate_html

__all__ = ["generate_html"]
