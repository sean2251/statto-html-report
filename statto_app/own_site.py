"""Publishing a tagging page to *your own* hosted site.

The site is just a folder: the app writes the page into it. If that folder is a
git clone (e.g. a repo that Cloudflare Pages / GitHub Pages / Netlify deploys
from), the app also commits and pushes, using your existing git credentials --
the same thing you'd otherwise do by hand in a terminal.
"""

import os
import shutil
import subprocess

from .store import StoreError, _write_atomic, safe_file_name


def _git(folder, *args, timeout=90):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")  # never hang on a password prompt
    return subprocess.run(["git", "-C", folder] + list(args), capture_output=True,
                          text=True, timeout=timeout, env=env)


def publish_to_folder(folder, filename, html, message):
    """Write `html` as `filename` into `folder`; commit + push if it's a git
    repo. Returns a dict describing what happened, for showing the user."""
    if not folder:
        raise StoreError("Set “My own tagging site folder” in the app’s Settings first.")
    if not os.path.isdir(folder):
        raise StoreError("Your own-site folder doesn’t exist any more: %s" % folder)
    name = safe_file_name(filename)
    path = os.path.join(folder, name)
    _write_atomic(path, html)
    result = {"path": path, "file": name, "git": False, "pushed": False, "log": ""}

    if not os.path.exists(os.path.join(folder, ".git")) or not shutil.which("git"):
        result["note"] = "Saved. This folder isn’t a git repository, so upload it to your host the way you normally do."
        return result
    result["git"] = True
    log = []
    try:
        for args in (("add", "--", name), ("commit", "-m", message, "--", name)):
            r = _git(folder, *args)
            log.append("$ git %s\n%s%s" % (" ".join(args[:1]), r.stdout, r.stderr))
            if r.returncode != 0:
                if args[0] == "commit" and "nothing to commit" in (r.stdout + r.stderr):
                    break
                result["log"] = "\n".join(log)
                result["note"] = "Saved, but git couldn’t commit it — see the details below."
                return result
        r = _git(folder, "push")
        log.append("$ git push\n%s%s" % (r.stdout, r.stderr))
        result["log"] = "\n".join(log)
        if r.returncode == 0:
            result["pushed"] = True
            result["note"] = "Saved, committed and pushed. Your host should deploy it in a minute or two."
        else:
            result["note"] = "Saved and committed, but the push failed — see the details below. You can push from a terminal or GitHub Desktop instead."
    except subprocess.TimeoutExpired:
        result["log"] = "\n".join(log)
        result["note"] = "Saved, but git took too long to respond. Check the folder in GitHub Desktop or a terminal."
    return result
