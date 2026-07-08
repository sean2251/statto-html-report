#!/usr/bin/env python3
"""
statto_to_html_report.py

Generates a single self-contained HTML report (season overview + one page
per game) from a Statto (.statto) export file. Includes:
  - Season record and a sortable season leaderboard table
  - Per-game score, a clickable point-by-point log, an interactive field
    diagram (pass routes + defensive block locations) that redraws per
    selected point, and a sortable per-game box score

Usage:
    python3 statto_to_html_report.py path/to/yourfile.statto [-o output.html]

This is a thin CLI wrapper; the implementation lives in the statto_report/
package (see statto_report/__init__.py for the module layout).
"""

from statto_report.cli import main

if __name__ == "__main__":
    main()
