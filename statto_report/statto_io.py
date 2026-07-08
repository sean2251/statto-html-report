"""Reading .statto export files and small formatting helpers."""

import json
import os
import tempfile
import zipfile
from datetime import datetime


def load_statto(statto_path):
    """Unzip a .statto export and return its parsed data.json contents."""
    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(statto_path, "r") as zf:
            zf.extractall(tmpdir)
        data_json_path = os.path.join(tmpdir, "data.json")
        if not os.path.isfile(data_json_path):
            for root, _, files in os.walk(tmpdir):
                for fname in files:
                    if fname == "data.json":
                        data_json_path = os.path.join(root, fname)
        with open(data_json_path, "r", encoding="utf-8") as f:
            return json.load(f)


def fmt_display_date(iso_ts):
    """Render an ISO timestamp as e.g. 'Jul 8, 2026' for display in the report."""
    if not iso_ts:
        return ""
    cleaned = iso_ts.replace("Z", "")
    try:
        dt = datetime.fromisoformat(cleaned)
        return dt.strftime("%b %-d, %Y")
    except Exception:
        return iso_ts


def safe_uuid(v):
    """Statto sometimes stores a UUID field as non-string junk; normalize that to None."""
    return v if isinstance(v, str) else None
