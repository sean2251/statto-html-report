"""App settings and the per-platform places the app keeps things.

Only this module knows about operating systems' conventions, so adding Windows
later means extending these few functions (plus `open_in_file_browser` /
`choose_folder`), nothing else.
"""

import json
import os
import subprocess
import sys

APP_NAME = "Statto Reports"

# Where the shared, data-free tagging site is hosted (see tagging_site.py).
# Anyone can host their own copy and change this in Settings.
DEFAULT_TAGGING_SITE_URL = "https://sean2251.github.io/statto-html-report/"


def _home():
    return os.path.expanduser("~")


def settings_dir():
    """Where the app keeps its own settings and log (not your season data)."""
    if sys.platform == "darwin":
        base = os.path.join(_home(), "Library", "Application Support")
    elif os.name == "nt":
        base = os.environ.get("APPDATA") or os.path.join(_home(), "AppData", "Roaming")
    else:
        base = os.environ.get("XDG_CONFIG_HOME") or os.path.join(_home(), ".config")
    return os.path.join(base, APP_NAME)


def default_seasons_dir():
    """Seasons live in Documents by default, where people expect their files."""
    return os.path.join(_home(), "Documents", "Statto Seasons")


DEFAULTS = {
    "seasonsDir": None,          # None = default_seasons_dir()
    "taggingSiteUrl": DEFAULT_TAGGING_SITE_URL,
    "ownSiteFolder": "",         # optional: a folder (e.g. a git clone) to publish tagging pages into
}


class Settings:
    def __init__(self, path=None):
        self.path = path or os.path.join(settings_dir(), "settings.json")
        self.values = dict(DEFAULTS)
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                stored = json.load(f)
            if isinstance(stored, dict):
                self.values.update({k: v for k, v in stored.items() if k in DEFAULTS})
        except (OSError, ValueError):
            pass

    def get(self, key):
        return self.values.get(key)

    @property
    def seasons_dir(self):
        return os.path.expanduser(self.values.get("seasonsDir") or default_seasons_dir())

    def public(self):
        return {
            "seasonsDir": self.seasons_dir,
            "defaultSeasonsDir": default_seasons_dir(),
            "taggingSiteUrl": self.values.get("taggingSiteUrl") or DEFAULT_TAGGING_SITE_URL,
            "defaultTaggingSiteUrl": DEFAULT_TAGGING_SITE_URL,
            "ownSiteFolder": self.values.get("ownSiteFolder") or "",
            "canChooseFolder": sys.platform == "darwin",
            "fileBrowserName": file_browser_name(),
        }

    def update(self, changes):
        for k, v in (changes or {}).items():
            if k not in DEFAULTS:
                continue
            if isinstance(v, str):
                v = v.strip()
            if k in ("seasonsDir", "ownSiteFolder") and v:
                v = os.path.abspath(os.path.expanduser(v))
            if k == "taggingSiteUrl" and v and not v.startswith(("https://", "http://")):
                raise ValueError("The tagging site address should start with https://")
            self.values[k] = v or DEFAULTS[k]
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.values, f, indent=2)
        os.replace(tmp, self.path)


def file_browser_name():
    """What this OS calls its file browser, for button labels."""
    if sys.platform == "darwin":
        return "Finder"
    if os.name == "nt":
        return "File Explorer"
    return "file manager"


def open_in_file_browser(path):
    """Show a folder (or reveal a file) in Finder / Explorer / the file manager."""
    if sys.platform == "darwin":
        args = ["open", "-R", path] if os.path.isfile(path) else ["open", path]
    elif os.name == "nt":
        args = ["explorer", "/select,", path] if os.path.isfile(path) else ["explorer", path]
    else:
        args = ["xdg-open", path if os.path.isdir(path) else os.path.dirname(path)]
    subprocess.Popen(args)


def choose_folder(prompt="Choose a folder"):
    """Native folder picker. Returns a path, or None if cancelled/unsupported."""
    if sys.platform == "darwin":
        script = 'POSIX path of (choose folder with prompt %s)' % json.dumps(prompt)
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
        if r.returncode != 0:
            return None  # cancelled
        return r.stdout.strip().rstrip("/") or None
    return None
