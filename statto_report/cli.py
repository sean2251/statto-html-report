"""Command-line entry point: argparse wiring for the report generator."""

import argparse
import os

from .render import generate_html


def build_arg_parser():
    parser = argparse.ArgumentParser(
        description="Generate a self-contained HTML season report from a .statto file."
    )
    parser.add_argument("statto_file", help="Path to the .statto file to convert")
    parser.add_argument(
        "-o", "--output", default=None,
        help="Output .html file path (default: <name>_report.html in the current directory)",
    )
    parser.add_argument(
        "-t", "--title", default=None,
        help=(
            "Browser tab title (the <title> tag). Use this to tell otherwise-"
            "identical builds apart -- e.g. a separate video-tagging site per "
            "opponent. Default: \"<team> — Season Report\"."
        ),
    )
    return parser


def main():
    parser = build_arg_parser()
    args = parser.parse_args()

    html, team_name = generate_html(args.statto_file, title=args.title)

    if args.output:
        output_path = args.output
    else:
        base = os.path.splitext(os.path.basename(args.statto_file))[0]
        output_path = f"{base}_report.html"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Wrote {output_path}  (team: {team_name})")
