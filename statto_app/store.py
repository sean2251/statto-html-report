"""Seasons on disk: one folder per season holding its Statto export, the data
you add in the editor, backups and published files.

    <seasons dir>/
      RAMP 2026/
        season.json          app metadata (name, team, save revision, ...)
        season.statto        the latest Statto export for this season
        season_data.json     everything added in the editor: tournaments, video
                             links, photos, lines and video tags (the editor's
                             "custom data" bundle format)
        backups/             earlier season_data.json / season.statto copies
        published/           Team Reports and tagging pages saved from the editor

Everything here is plain files, so a season folder can be copied, backed up or
synced (e.g. iCloud Drive / Dropbox) like any other folder. Nothing in this
module is platform-specific.
"""

import json
import os
import re
import shutil
import threading
import time
import zipfile
from datetime import datetime, timezone

from statto_report.render import build_report

SEASON_META = "season.json"
SEASON_STATTO = "season.statto"
SEASON_DATA = "season_data.json"
BACKUPS_DIR = "backups"
PUBLISHED_DIR = "published"

# A data backup is taken before an overwrite at most this often (autosave runs
# every few seconds while you work; this keeps a useful history, not thousands
# of near-identical files) -- and always before a bigger change such as an
# import or a new Statto export.
BACKUP_INTERVAL_SECS = 10 * 60
MAX_BACKUPS = 40


class StoreError(Exception):
    """A problem to show the user (bad file, unknown season, ...)."""

    def __init__(self, message, status=400, **extra):
        super().__init__(message)
        self.status = status
        self.extra = extra


class ConflictError(StoreError):
    def __init__(self, message, **extra):
        super().__init__(message, status=409, **extra)


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _stamp():
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def _write_atomic(path, data):
    """Write bytes/str to path via a temp file + rename, so a crash mid-write
    can never leave a half-written season file behind."""
    tmp = path + ".tmp"
    mode = "wb" if isinstance(data, (bytes, bytearray)) else "w"
    kwargs = {} if mode == "wb" else {"encoding": "utf-8"}
    with open(tmp, mode, **kwargs) as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def _read_json(path, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


_UNSAFE = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def safe_folder_name(name):
    """A season name made safe to use as a folder name on Mac and Windows."""
    cleaned = _UNSAFE.sub("-", str(name or "")).strip().strip(".")
    cleaned = re.sub(r"\s+", " ", cleaned)[:80].strip()
    return cleaned or "Season"


def safe_file_name(name, default="file.html"):
    base = os.path.basename(str(name or "")).strip()
    base = _UNSAFE.sub("_", base).strip().strip(".")
    return base or default


def check_statto_bytes(data):
    """Raise StoreError unless `data` looks like a Statto export (a zip with a
    data.json inside)."""
    import io
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = zf.namelist()
    except zipfile.BadZipFile:
        raise StoreError("That file isn’t a Statto export (.statto). In Statto, export the team and choose the .statto file it saves.")
    if not any(n == "data.json" or n.endswith("/data.json") for n in names):
        raise StoreError("That .statto file has no data in it (missing data.json).")


def check_custom_data(bundle):
    if not isinstance(bundle, dict) or bundle.get("statto") != "custom-data":
        raise StoreError("That doesn’t look like a “custom data” export. In an older Set up editor, use Set up → “Export all custom data”.")


class Season:
    """One season folder."""

    def __init__(self, path):
        self.path = path
        self.id = os.path.basename(path)
        self.lock = threading.RLock()
        self._report_cache = None  # (statto mtime, report, team name)

    # ---- paths ----
    def p(self, *parts):
        return os.path.join(self.path, *parts)

    # ---- metadata ----
    def meta(self):
        return _read_json(self.p(SEASON_META), {}) or {}

    def _write_meta(self, meta):
        meta["updatedAt"] = _now_iso()
        _write_atomic(self.p(SEASON_META), json.dumps(meta, indent=2))

    def summary(self):
        meta = self.meta()
        data = self.data() or {}
        ann = data.get("annotations") or {}
        setup = data.get("setup") or {}
        return {
            "id": self.id,
            "name": meta.get("name") or self.id,
            "teamName": meta.get("teamName"),
            "games": meta.get("gameCount"),
            "updatedAt": meta.get("dataSavedAt") or meta.get("updatedAt"),
            "stattoUpdatedAt": meta.get("stattoUpdatedAt"),
            "videoLinks": len(setup.get("videoLinks") or {}),
            "taggedEvents": len(ann.get("passes") or {}) + len(ann.get("blocks") or {}),
            "published": self.published_files(),
            "folder": self.path,
        }

    # ---- the Statto export & computed report ----
    def report(self):
        """(report dict, team name) for this season's export, cached until the
        export file changes."""
        path = self.p(SEASON_STATTO)
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            raise StoreError("This season’s Statto export is missing.", status=404)
        with self.lock:
            if self._report_cache and self._report_cache[0] == mtime:
                return self._report_cache[1], self._report_cache[2]
            report, team = build_report(path)
            self._report_cache = (mtime, report, team)
            return report, team

    def replace_statto(self, data, confirm=False):
        """Swap in a newer Statto export. Without `confirm`, refuses (with a
        ConflictError explaining why) when the team changed or games that were
        in the old export are missing from the new one."""
        check_statto_bytes(data)
        tmp = self.p(SEASON_STATTO + ".incoming")
        with self.lock:
            _write_atomic(tmp, data)
            try:
                new_report, new_team = build_report(tmp)
            except Exception as e:
                os.remove(tmp)
                raise StoreError("Couldn’t read that Statto export: %s" % e)
            old_report, old_team = None, None
            if os.path.exists(self.p(SEASON_STATTO)):
                try:
                    old_report, old_team = self.report()
                except Exception:
                    pass
            old_games = {g.get("uuid"): g for g in (old_report or {}).get("games", [])}
            new_uuids = {g.get("uuid") for g in new_report.get("games", [])}
            added = [g for g in new_report.get("games", []) if g.get("uuid") not in old_games]
            removed = [g for u, g in old_games.items() if u not in new_uuids]
            problems = []
            if old_team and new_team != old_team:
                problems.append("This export is for “%s”, but the season is “%s”." % (new_team, old_team))
            if removed:
                problems.append("%d game(s) in the current export aren’t in this one: %s. Their video links, tags and lines are kept, but won’t show until a later export includes them again."
                                % (len(removed), ", ".join("vs " + g.get("opponent", "?") for g in removed)))
            if problems and not confirm:
                os.remove(tmp)
                raise ConflictError(" ".join(problems), needsConfirm=True)
            if os.path.exists(self.p(SEASON_STATTO)):
                self._backup_file(SEASON_STATTO, "season")
            self._backup_data("before-new-export")
            os.replace(tmp, self.p(SEASON_STATTO))
            self._report_cache = None
            meta = self.meta()
            meta["teamName"] = new_team
            meta["gameCount"] = len(new_report.get("games", []))
            meta["stattoUpdatedAt"] = _now_iso()
            self._write_meta(meta)
        return {
            "added": ["vs %s (%s)" % (g.get("opponent"), g.get("dateDisplay")) for g in added],
            "removed": ["vs %s (%s)" % (g.get("opponent"), g.get("dateDisplay")) for g in removed],
            "games": len(new_report.get("games", [])),
        }

    # ---- editor data ----
    def data(self):
        return _read_json(self.p(SEASON_DATA))

    def revision(self):
        return int(self.meta().get("dataRevision") or 0)

    def save_data(self, bundle, base_revision=None, force=False, backup_reason=None):
        """Write the editor's custom-data bundle. `base_revision` is the
        revision the editor last loaded/saved; a mismatch means another window
        saved since, so the write is refused unless `force`."""
        check_custom_data(bundle)
        with self.lock:
            meta = self.meta()
            current = int(meta.get("dataRevision") or 0)
            if not force and base_revision is not None and int(base_revision) != current:
                raise ConflictError("This season was saved from another window.", revision=current)
            self._backup_data(backup_reason)
            _write_atomic(self.p(SEASON_DATA), json.dumps(bundle, separators=(",", ":")))
            meta["dataRevision"] = current + 1
            meta["dataSavedAt"] = _now_iso()
            self._write_meta(meta)
            return meta["dataRevision"]

    def _backup_data(self, reason=None):
        """Copy season_data.json into backups/ -- always when `reason` is
        given, otherwise only if the newest data backup is old enough."""
        if not os.path.exists(self.p(SEASON_DATA)):
            return
        if reason is None:
            newest = max((os.path.getmtime(f) for f in self._backups("season_data")), default=0)
            if time.time() - newest < BACKUP_INTERVAL_SECS:
                return
        self._backup_file(SEASON_DATA, "season_data", reason)

    def _backups(self, prefix):
        d = self.p(BACKUPS_DIR)
        if not os.path.isdir(d):
            return []
        return [os.path.join(d, f) for f in os.listdir(d) if f.startswith(prefix + "-")]

    def _backup_file(self, filename, prefix, reason=None):
        os.makedirs(self.p(BACKUPS_DIR), exist_ok=True)
        ext = os.path.splitext(filename)[1]
        name = "%s-%s%s%s" % (prefix, _stamp(), ("-" + reason) if reason else "", ext)
        shutil.copy2(self.p(filename), self.p(BACKUPS_DIR, name))
        old = sorted(self._backups(prefix), key=os.path.getmtime)
        for f in old[:-MAX_BACKUPS]:
            try:
                os.remove(f)
            except OSError:
                pass

    # ---- published files ----
    def publish(self, filename, html):
        os.makedirs(self.p(PUBLISHED_DIR), exist_ok=True)
        name = safe_file_name(filename)
        if not name.lower().endswith((".html", ".json")):
            name += ".html"
        path = self.p(PUBLISHED_DIR, name)
        _write_atomic(path, html)
        return path

    def published_files(self):
        d = self.p(PUBLISHED_DIR)
        if not os.path.isdir(d):
            return []
        files = [f for f in os.listdir(d) if not f.startswith(".") and not f.endswith(".tmp")]
        return sorted(files, key=lambda f: -os.path.getmtime(os.path.join(d, f)))


class SeasonStore:
    """All the seasons in one folder (the "seasons folder")."""

    def __init__(self, root):
        self.root = root
        self._seasons = {}
        self._lock = threading.Lock()

    def ensure_root(self):
        os.makedirs(self.root, exist_ok=True)

    def _season(self, folder):
        with self._lock:
            s = self._seasons.get(folder)
            if s is None:
                s = Season(os.path.join(self.root, folder))
                self._seasons[folder] = s
            return s

    def get(self, season_id):
        if not season_id or season_id != os.path.basename(season_id) or season_id.startswith("."):
            raise StoreError("Unknown season.", status=404)
        path = os.path.join(self.root, season_id)
        if not os.path.isfile(os.path.join(path, SEASON_META)):
            raise StoreError("Unknown season.", status=404)
        return self._season(season_id)

    def list(self):
        if not os.path.isdir(self.root):
            return []
        out = []
        for name in os.listdir(self.root):
            if name.startswith("."):
                continue
            if os.path.isfile(os.path.join(self.root, name, SEASON_META)):
                out.append(self._season(name))
        return sorted(out, key=lambda s: s.meta().get("dataSavedAt") or s.meta().get("updatedAt") or "", reverse=True)

    def create(self, name, statto_bytes, custom_data=None):
        check_statto_bytes(statto_bytes)
        if custom_data is not None:
            check_custom_data(custom_data)
        self.ensure_root()
        base = safe_folder_name(name)
        folder, n = base, 2
        while os.path.exists(os.path.join(self.root, folder)):
            folder = "%s (%d)" % (base, n)
            n += 1
        path = os.path.join(self.root, folder)
        os.makedirs(path)
        try:
            _write_atomic(os.path.join(path, SEASON_STATTO), statto_bytes)
            report, team = build_report(os.path.join(path, SEASON_STATTO))
        except Exception as e:
            shutil.rmtree(path, ignore_errors=True)
            if isinstance(e, StoreError):
                raise
            raise StoreError("Couldn’t read that Statto export: %s" % e)
        meta = {
            "app": "statto-season", "version": 1,
            "name": str(name or "").strip() or folder,
            "teamName": team,
            "gameCount": len(report.get("games", [])),
            "createdAt": _now_iso(),
            "stattoUpdatedAt": _now_iso(),
            "dataRevision": 0,
        }
        _write_atomic(os.path.join(path, SEASON_META), json.dumps(meta, indent=2))
        season = self._season(folder)
        if custom_data is not None:
            season.save_data(custom_data, force=True)
        return season
