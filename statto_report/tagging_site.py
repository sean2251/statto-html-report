"""The shared video-tagging site: one static page, no data of its own.

A team's Set up editor exports a small *game file* per game
(``<team>_tag_<opponent>_<date>.tagging.json``: that game's data plus its video
link). A helper opens this site, drops the game file in, and gets the usual
single-game tagging page -- rendered right here in their browser, from the
report code baked into this page. Because the page is served from a real web
address, the embedded YouTube player works; nothing is ever uploaded anywhere.
Game files are kept in the browser (IndexedDB) so a helper can come back to a
game without the file, and tags save in the browser's localStorage exactly as
on a per-game tagging page.

Host it once, anywhere static (GitHub Pages via .github/workflows/
tagging-site.yml, Cloudflare Pages, Netlify ...), and every team can use it:

    python3 -m statto_report.tagging_site path/to/output_dir
"""

import os
import sys

from .render import json_for_script, page_template

GAME_FILE_KIND = "tagging-game"
GAME_FILE_VERSION = 1

_LOADER = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Statto video tagging</title>
<meta name="color-scheme" content="dark light">
<style>
  :root { --bg:#17181A; --card:#212226; --fg:#ECECEC; --dim:#9C9CA1; --line:rgba(236,236,236,.15); --accent:#4FD1AE; --bad:#E8604C; }
  @media (prefers-color-scheme: light) { :root { --bg:#F7F7F6; --card:#FFFFFF; --fg:#1A1A1A; --dim:#6B6B70; --line:rgba(26,26,26,.14); --accent:#1F9D74; --bad:#C0392B; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  h2 { font-size: 17px; margin: 32px 0 10px; }
  p { margin: 0 0 10px; }
  .dim { color: var(--dim); font-size: 14px; }
  .drop { margin-top: 20px; border: 2px dashed var(--line); border-radius: 14px; padding: 28px 16px; text-align: center; background: var(--card); }
  .drop.over { border-color: var(--accent); }
  button { font: inherit; cursor: pointer; border-radius: 999px; border: 1px solid var(--line); background: transparent; color: var(--fg); padding: 7px 16px; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #0b1f18; font-weight: 600; }
  .games { list-style: none; padding: 0; margin: 0; }
  .games li { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); margin-bottom: 8px; }
  .games .info { flex: 1 1 240px; min-width: 0; }
  .games .name { font-weight: 600; }
  .error { color: var(--bad); margin-top: 12px; }
  ol { padding-left: 20px; } li { margin-bottom: 4px; }
</style>
</head>
<body>
<main>
  <h1>Statto video tagging</h1>
  <p class="dim">Tag a game’s film for your team’s stats. The video plays right in the page.</p>

  <div class="drop" id="drop">
    <p><strong>Drop the game file your team sent you here</strong><br><span class="dim">It ends in <code>.tagging.json</code></span></p>
    <p><button class="primary" id="choose" type="button">Choose game file…</button></p>
    <input id="file" type="file" accept=".json,application/json" hidden>
    <div class="error" id="error" hidden></div>
  </div>

  <section id="recent" hidden>
    <h2>Your games on this computer</h2>
    <ul class="games" id="games"></ul>
    <p class="dim">Removing a game from this list doesn’t delete its tags.</p>
  </section>

  <h2>How it works</h2>
  <ol>
    <li>Open the game file above. Your games stay listed here, so next time just click <em>Continue tagging</em>.</li>
    <li>Tag as you watch. Your work saves automatically <strong>in this browser</strong> — keep using the same browser on the same computer.</li>
    <li>When you’re done (or done for the day), click <strong>Export annotations JSON</strong> at the bottom of the tagging page and send that file back to whoever sent you the game file.</li>
  </ol>
  <p class="dim">Nothing is uploaded: this site is just the tagging page. Your game files and tags never leave your browser.</p>
</main>
<script>
(function () {
  var TEMPLATE = __TEMPLATE_JSON__;
  var KIND = __KIND_JSON__, MAX_VERSION = __VERSION_JSON__;
  var DB_NAME = 'statto-tagging-site', STORE = 'games';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode), store = t.objectStore(STORE), out;
        var r = fn(store);
        if (r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { resolve(out); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }
  var getGame = function (id) { return tx('readonly', function (s) { return s.get(id); }); };
  var putGame = function (rec) { return tx('readwrite', function (s) { return s.put(rec); }); };
  var delGame = function (id) { return tx('readwrite', function (s) { return s.delete(id); }); };
  var allGames = function () { return tx('readonly', function (s) { return s.getAll(); }); };

  function showError(msg) { var e = document.getElementById('error'); e.textContent = msg; e.hidden = false; }

  function validate(file) {
    if (!file || file.statto !== KIND || !file.report || !Array.isArray(file.report.games) || file.report.games.length !== 1) {
      throw new Error('That isn’t a Statto game file. Ask for the “.tagging.json” game file (made with “Share for tagging” in the Set up editor).');
    }
    if (Number(file.version) > MAX_VERSION) {
      throw new Error('That game file was made by a newer version of the Statto tools than this site. Reload this page, or ask whoever sent it to check the tagging site address.');
    }
    return file;
  }
  function gameId(file) { return file.teamName + '|' + (file.gameUUID || file.report.games[0].uuid); }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Replace this loader with the tagging page for `file`, on this same origin.
  function openGame(id, file) {
    history.replaceState(null, '', '#game=' + encodeURIComponent(id));
    var setupKey = 'statto-report-setup::' + file.teamName;
    // Escaped so nothing in the data can close this <script> early.
    var lit = function (v) { return JSON.stringify(v).replace(/</g, '\\u003c'); };
    var inject = '<script>window.__STATTO_TAGONLY_GAME__=0;window.__STATTO_TAGGING_SITE__=true;' +
      '(function(){try{localStorage.setItem(' + lit(setupKey) + ',' + lit(JSON.stringify(file.setup || {})) +
      ');}catch(e){}})();<\/script>\n';
    var html = TEMPLATE
      .replace('__PAGE_TITLE__', function () { return esc(file.title || 'Video tagging'); })
      .replace('__REPORT_DATA_JSON__', function () { return JSON.stringify(file.report).replace(/</g, '\\u003c'); })
      .replace('<script id="report-data"', function (m) { return inject + m; });
    document.open();
    document.write(html);
    document.close();
  }

  function taggedCount(file) {
    try {
      var ann = JSON.parse(localStorage.getItem('statto-report-annotations::' + file.teamName) || '{}');
      var n = 0;
      (file.report.games[0].points || []).forEach(function (pt) {
        (pt.passes || []).forEach(function (p) { if (ann.passes && ann.passes[p.uuid]) n++; });
        (pt.blocks || []).forEach(function (b) { if (ann.blocks && ann.blocks[b.uuid]) n++; });
      });
      return n;
    } catch (e) { return 0; }
  }

  function renderList() {
    allGames().then(function (recs) {
      recs = (recs || []).sort(function (a, b) { return (b.openedAt || '').localeCompare(a.openedAt || ''); });
      var ul = document.getElementById('games');
      ul.innerHTML = '';
      document.getElementById('recent').hidden = !recs.length;
      recs.forEach(function (rec) {
        var g = rec.file.report.games[0];
        var li = document.createElement('li');
        li.innerHTML = '<div class="info"><div class="name"></div><div class="dim"></div></div>';
        li.querySelector('.name').textContent = 'vs ' + g.opponent + ' · ' + rec.file.teamName;
        li.querySelector('.dim').textContent = g.dateDisplay + ' · ' + taggedCount(rec.file) + ' events tagged';
        var go = document.createElement('button'); go.className = 'primary'; go.type = 'button'; go.textContent = 'Continue tagging';
        go.onclick = function () { rec.openedAt = new Date().toISOString(); putGame(rec).then(function () { openGame(rec.id, rec.file); }); };
        var rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'Remove';
        rm.onclick = function () { if (confirm('Remove this game from the list? Your tags are kept.')) delGame(rec.id).then(renderList); };
        li.appendChild(go); li.appendChild(rm);
        ul.appendChild(li);
      });
    }).catch(function () {});
  }

  function loadFile(f) {
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var file;
      try { file = validate(JSON.parse(reader.result)); }
      catch (e) { showError(e instanceof SyntaxError ? 'That file isn’t a Statto game file (it isn’t valid JSON).' : e.message); return; }
      var rec = { id: gameId(file), file: file, openedAt: new Date().toISOString() };
      putGame(rec).catch(function () {}).then(function () { openGame(rec.id, file); });
    };
    reader.readAsText(f);
  }

  var input = document.getElementById('file'), drop = document.getElementById('drop');
  document.getElementById('choose').onclick = function () { input.click(); };
  input.onchange = function () { loadFile(input.files && input.files[0]); input.value = ''; };
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files && e.dataTransfer.files[0]); });

  // Coming back to a game (the tagging page's address keeps #game=...).
  var m = /#game=([^&]+)/.exec(location.hash);
  if (m) {
    var id = decodeURIComponent(m[1]);
    getGame(id).then(function (rec) {
      if (rec) openGame(id, rec.file);
      else { history.replaceState(null, '', location.pathname); renderList(); }
    }).catch(renderList);
  } else {
    renderList();
  }
})();
</script>
</body>
</html>
"""


def build_tagging_site_html():
    """The whole shared tagging site: a single self-contained index.html."""
    template_json = json_for_script(page_template()).replace("</", "<\\/")
    return (
        _LOADER
        .replace("__TEMPLATE_JSON__", template_json)
        .replace("__KIND_JSON__", '"%s"' % GAME_FILE_KIND)
        .replace("__VERSION_JSON__", str(GAME_FILE_VERSION))
    )


def write_tagging_site(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(build_tagging_site_html())
    # GitHub Pages: serve files as-is (no Jekyll processing).
    open(os.path.join(out_dir, ".nojekyll"), "w").close()
    return path


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "tagging_site"
    print("Wrote %s" % write_tagging_site(out))
