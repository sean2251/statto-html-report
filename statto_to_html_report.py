#!/usr/bin/env python3
"""
statto_to_html_report.py

Builds the Set up editor -- one self-contained HTML page -- from a Statto
(.statto) export. In the editor you add tournaments, video links, photos, film
tags and lines, then publish the read-only Team Report with all the analysis.

Usage:
    python3 statto_to_html_report.py path/to/yourfile.statto [-o output.html]

For a no-terminal workflow that also saves everything to disk, use the app
instead: python3 statto_app.py (see the README).

This is a thin CLI wrapper; the implementation lives in the statto_report/
package (see statto_report/__init__.py for the module layout).
"""

from statto_report.cli import main

if __name__ == "__main__":
    main()
