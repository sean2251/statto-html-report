"""Start the Statto Reports app: launch the local server and open the browser.

If the app is already running, this just opens its home page again, so
double-clicking the app a second time does the obvious thing.
"""

import argparse
import json
import logging
import os
import sys
import urllib.request
import webbrowser

from . import __version__
from .server import App, make_server
from .settings import Settings, settings_dir

# A fixed port keeps the address (and so the browser's per-site settings, like
# light/dark theme) the same every launch. If something else holds it, the next
# free one in this range is used.
PREFERRED_PORTS = range(8642, 8652)


def _running_app_url():
    """URL of an already-running copy of this app, if there is one."""
    for port in PREFERRED_PORTS:
        try:
            with urllib.request.urlopen("http://127.0.0.1:%d/api/ping" % port, timeout=0.5) as r:
                if json.loads(r.read().decode("utf-8")).get("app") == "statto-reports":
                    return "http://127.0.0.1:%d/" % port
        except Exception:
            continue
    return None


def _setup_logging(verbose):
    os.makedirs(settings_dir(), exist_ok=True)
    handlers = [logging.FileHandler(os.path.join(settings_dir(), "app.log"), encoding="utf-8")]
    # A packaged (windowed) app has no console to write to.
    if sys.stderr is not None and not getattr(sys, "frozen", False):
        handlers.append(logging.StreamHandler())
    logging.basicConfig(level=logging.INFO if verbose else logging.WARNING,
                        format="%(asctime)s %(levelname)s %(message)s", handlers=handlers)


def main(argv=None):
    parser = argparse.ArgumentParser(prog="statto_app", description="Statto Reports — the local app.")
    parser.add_argument("--port", type=int, default=None, help="Port to listen on (default: 8642, or the next free one)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open the browser automatically")
    parser.add_argument("--seasons-dir", default=None, help="Use this seasons folder for this run (doesn't change Settings)")
    parser.add_argument("--settings-file", default=None, help=argparse.SUPPRESS)
    parser.add_argument("--verbose", action="store_true", help="Log every request")
    args = parser.parse_args(argv)
    _setup_logging(args.verbose)

    existing = None if args.port else _running_app_url()
    if existing:
        print("Statto Reports is already running at %s" % existing)
        if not args.no_browser:
            webbrowser.open(existing)
        return 0

    settings = Settings(args.settings_file)
    if args.seasons_dir:
        settings.values["seasonsDir"] = os.path.abspath(args.seasons_dir)
    app = App(settings)
    app.store.ensure_root()

    server = None
    for port in ([args.port] if args.port else PREFERRED_PORTS):
        try:
            server = make_server(app, port)
            break
        except OSError:
            continue
    if server is None:
        # Every preferred port is taken: let the OS pick one.
        server = make_server(app, 0)
    url = "http://127.0.0.1:%d/" % server.server_address[1]
    print("Statto Reports %s running at %s" % (__version__, url))
    print("Seasons folder: %s" % settings.seasons_dir)
    print("Use the Quit button on the home page (or Ctrl+C here) to stop.")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
