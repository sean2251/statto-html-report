// ---------- Report data & shared stats-table column definitions ----------
const REPORT = JSON.parse(document.getElementById('report-data').textContent);

// Captured before init() builds anything into #topnav / #main, so this is the
// pristine generated file (CSS, JS and report data all inlined, containers
// still empty). The "Download shareable copy" button on Set up injects a
// localStorage seed into this snapshot and hands back a standalone HTML with
// the user's tournaments, curated lines, video links and player photos baked
// in -- so the file can be emailed or hosted and everyone who opens it sees
// the same preloaded data, with no separate import step.
const PRISTINE_DOC_HTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

// "Published for the team" copies inject a flag (before this script runs) that
// strips the authoring UI down to a clean, read-only viewer: no Set up tab, the
// Data Editor becomes a read-only "Film Clips" browser, and Line Analysis shows
// comparisons without the line-curation controls. The underlying data is baked
// in by the same seed the shareable copy uses -- see buildDistributableHtml.
const VIEWER_MODE = !!(typeof window !== 'undefined' && window.__STATTO_VIEWER__);
// A per-game "video tagging" page: a stripped build showing only the Data
// Editor, locked to this one game, for handing to a helper to tag. Set by the
// injected flag in a page built via downloadGameTaggingPage.
const TAGONLY_GAME = (typeof window !== 'undefined' && typeof window.__STATTO_TAGONLY_GAME__ === 'number') ? window.__STATTO_TAGONLY_GAME__ : null;

const STAT_COLUMNS = [
  { key: 'player', label: 'Player', full: 'Player', numeric: false },
  { key: 'pointsPlayed', label: 'Pts', full: 'Points played', numeric: true },
  { key: 'highLeveragePointsPlayed', label: 'HLV Pts', full: 'High-leverage points played: how many of this player’s points had Leverage ≥ 7 (0–10 scale) -- points close to a coin flip on the game’s outcome, typically late and close', numeric: true },
  { key: 'offensePlayed', label: 'O Pld', full: 'Points played on offense', numeric: true },
  { key: 'defensePlayed', label: 'D Pld', full: 'Points played on defense', numeric: true },
  { key: 'offenseWon', label: 'O Won', full: 'Offensive points won (held)', numeric: true },
  { key: 'defenseWon', label: 'D Won', full: 'Defensive points won (broken)', numeric: true },
  { key: 'touches', label: 'Touches', full: 'Touches (catches + possessions initiated)', numeric: true },
  { key: 'throws', label: 'Throws', full: 'Throws attempted', numeric: true },
  { key: 'throwCompletionPct', label: 'Thr Cmp%', full: 'Throw completion percentage', numeric: true, percent: true },
  { key: 'catches', label: 'Catches', full: 'Passes caught', numeric: true },
  { key: 'catchCompletionPct', label: 'Catch Cmp%', full: 'Catch completion percentage (catches / (catches + drops) -- excludes targets lost to a thrower error, since that’s not on the receiver)', numeric: true, percent: true },
  { key: 'assists', label: 'Ast', full: 'Assists (throw that led directly to a goal)', numeric: true, hidden: true },
  { key: 'secondaryAssists', label: 'S.Ast', full: 'Secondary assists (the pass before the assist)', numeric: true },
  { key: 'assistAttempts', label: 'Ast Att', full: 'Assist attempts (throws targeting the endzone, whether completed or not)', numeric: true },
  { key: 'assistCompletionPct', label: 'Ast Cmp%', full: 'Assists (count) and assist completion percentage (assists / assist attempts)', numeric: true, percent: true, comboCountKey: 'assists' },
  { key: 'goals', label: 'Goals', full: 'Goals scored', numeric: true },
  { key: 'plusMinus', label: '+/-', full: 'Plus-minus (goals + assists + blocks − turnovers)', numeric: true },
  { key: 'turnovers', label: 'Turns', full: 'Turnovers (thrower errors + receiver errors; thrower errors include stall-outs)', numeric: true },
  { key: 'throwerErrors', label: 'Thr Err', full: 'Throwing errors (throwaways, plus getting stalled out)', numeric: true },
  { key: 'receiverErrors', label: 'Rec Err', full: 'Receiving errors (drops)', numeric: true },
  { key: 'blocks', label: 'Blk', full: 'Defensive blocks', numeric: true },
  { key: 'huckAttempts', label: 'Hck Att', full: 'Huck attempts (throws gaining 27+ yards downfield)', numeric: true },
  { key: 'huckCompletions', label: 'Hck Cmp', full: 'Huck completions', numeric: true, hidden: true },
  { key: 'huckCompletionPct', label: 'Hck Cmp%', full: 'Huck completions (count) and huck completion percentage', numeric: true, percent: true, comboCountKey: 'huckCompletions' },
  { key: 'offensiveUtilization', label: 'O Util%', full: 'Offensive utilization: of the points where the player started on offense (or their line got a block), the percentage where they recorded at least one touch', numeric: true, percent: true },
  { key: 'throwGain', label: 'Thr Gain (yd)', full: 'Net downfield yards gained on completed throws', numeric: true },
  { key: 'catchGain', label: 'Catch Gain (yd)', full: 'Net downfield yards gained on receptions', numeric: true },
];
const SEASON_ONLY_COLUMNS = [
  { key: 'totalScoringEfficiency', label: 'Score Eff%', full: 'Total scoring efficiency: percentage of points played that were scored', numeric: true, percent: true },
  { key: 'offensiveScoringEfficiency', label: 'O Score Eff%', full: 'Offensive scoring efficiency: percentage of offensive points played that were scored (hold rate)', numeric: true, percent: true },
  { key: 'defensiveScoringEfficiency', label: 'D Score Eff%', full: 'Defensive scoring efficiency: percentage of defensive points played that were scored (break rate)', numeric: true, percent: true },
  { key: 'defensiveTurnoverEfficiency', label: 'D Turn Eff%', full: 'Defensive turnover efficiency: percentage of defensive points played where the opposition turned the disc over at least once', numeric: true, percent: true },
  { key: 'pointRecovery', label: 'Recovery%', full: 'Point recovery: percentage of points played with at least one turnover by this team that were still won', numeric: true, percent: true },
];
const SEASON_COLUMNS = [
  ...STAT_COLUMNS.slice(0,1),
  { key: 'gamesPlayed', label: 'GP', full: 'Games played', numeric: true },
  ...STAT_COLUMNS.slice(1),
  ...SEASON_ONLY_COLUMNS,
];

// ---------- DOM helper utilities ----------
function el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  (children || []).forEach(c => { if (c) e.appendChild(c); });
  return e;
}
function text(tag, cls, str) { return el(tag, { class: cls }, [document.createTextNode(str)]); }

// ---------- Theme toggle & top nav ----------
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function buildThemeToggle() {
  const btn = el('button', { class: 'theme-toggle', type: 'button', title: 'Toggle light/dark theme', 'aria-label': 'Toggle light/dark theme' }, []);
  const sunSVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"></circle><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"></path></svg>';
  const moonSVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.6 15.1A9 9 0 1 1 8.9 3.4a7.2 7.2 0 0 0 11.7 11.7z"></path></svg>';
  function renderIcon() {
    btn.innerHTML = currentTheme() === 'light' ? sunSVG : moonSVG;
  }
  renderIcon();
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('statto-report-theme', next); } catch (e) {}
    renderIcon();
  });
  return btn;
}

function buildGamesNavDropdown() {
  const wrap = el('div', { class: 'nav-games-wrap' }, []);
  const btn = el('button', { class: 'tab nav-games-btn', type: 'button' }, [
    document.createTextNode('Games '),
    el('span', { class: 'nav-caret' }, [document.createTextNode('▾')]),
  ]);
  const panel = el('div', { class: 'nav-games-panel' }, []);
  document.body.appendChild(panel); // portal to <body> so the nav's overflow-x:auto never clips it

  REPORT.games.forEach((g, i) => {
    const row = el('button', { class: 'nav-games-row', type: 'button', 'data-target': 'game-' + i }, [
      document.createTextNode('vs ' + g.opponent + ' '),
      el('span', { class: 'pill ' + g.result }, [document.createTextNode(g.result)]),
    ]);
    row.addEventListener('click', () => {
      showView('game-' + i);
      closePanel();
    });
    panel.appendChild(row);
  });

  function positionPanel() {
    const r = btn.getBoundingClientRect();
    panel.style.left = r.left + 'px';
    panel.style.top = (r.bottom + 4) + 'px';
  }
  function openPanel() { positionPanel(); panel.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); }

  let hoverTimer = null;
  wrap.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); openPanel(); });
  wrap.addEventListener('mouseleave', () => { hoverTimer = setTimeout(closePanel, 200); });
  panel.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); });
  panel.addEventListener('mouseleave', () => { hoverTimer = setTimeout(closePanel, 200); });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.classList.contains('open')) closePanel(); else openPanel();
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && !panel.contains(e.target)) closePanel();
  });
  window.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionPanel(); }, true);
  window.addEventListener('resize', () => { if (panel.classList.contains('open')) positionPanel(); });

  wrap.appendChild(btn);
  return wrap;
}

function buildNav() {
  const nav = document.getElementById('topnav');
  nav.appendChild(el('div', { class: 'brand' }, [document.createTextNode(REPORT.teamName)]));

  // Per-game tagging page: a single "Video Tagging" tab, nothing else.
  if (TAGONLY_GAME != null) {
    const tagBtn = el('button', { class: 'tab active', 'data-target': 'data-editor' }, [document.createTextNode('Video Tagging')]);
    tagBtn.addEventListener('click', () => showView('data-editor'));
    nav.appendChild(tagBtn);
    nav.appendChild(buildThemeToggle());
    return;
  }

  if (!VIEWER_MODE) {
    const setupBtn = el('button', { class: 'tab', 'data-target': 'setup' }, [document.createTextNode('Set up')]);
    nav.appendChild(setupBtn);
    // In the full/editing report the Data Editor sits up front, next to Set up.
    const dataEditorBtn = el('button', { class: 'tab', 'data-target': 'data-editor' }, [document.createTextNode('Data Editor')]);
    nav.appendChild(dataEditorBtn);
  }
  const seasonBtn = el('button', { class: 'tab active', 'data-target': 'season' }, [document.createTextNode('Season')]);
  nav.appendChild(seasonBtn);
  nav.appendChild(buildGamesNavDropdown());
  // In the read-only team report the Data Editor becomes "Film Clips" and sits
  // right of the Games dropdown, alongside the other analysis tabs.
  if (VIEWER_MODE) {
    const filmBtn = el('button', { class: 'tab', 'data-target': 'data-editor' }, [document.createTextNode('Film Clips')]);
    nav.appendChild(filmBtn);
  }
  const playerBtn = el('button', { class: 'tab', 'data-target': 'player-analysis' }, [document.createTextNode('Player Analysis')]);
  nav.appendChild(playerBtn);
  const lineBtn = el('button', { class: 'tab', 'data-target': 'line-analysis' }, [document.createTextNode('Line Analysis')]);
  nav.appendChild(lineBtn);
  const trBtn = el('button', { class: 'tab', 'data-target': 'thrower-receiver-analysis' }, [document.createTextNode('Thrower-Receiver Analysis')]);
  nav.appendChild(trBtn);
  const fieldBtn = el('button', { class: 'tab', 'data-target': 'field-analysis' }, [document.createTextNode('Field Analysis')]);
  nav.appendChild(fieldBtn);
  const genderBtn = el('button', { class: 'tab', 'data-target': 'gender-analysis' }, [document.createTextNode('Gender Analysis')]);
  nav.appendChild(genderBtn);
  const advancedBtn = el('button', { class: 'tab', 'data-target': 'advanced-stats' }, [document.createTextNode('Advanced Stats')]);
  nav.appendChild(advancedBtn);
  const rawDataBtn = el('button', { class: 'tab', 'data-target': 'raw-data' }, [document.createTextNode('Raw Data')]);
  nav.appendChild(rawDataBtn);
  nav.querySelectorAll('button.tab:not(.nav-games-btn)').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.getAttribute('data-target')));
  });
  // Replays the current tab's walkthrough. Team report only -- the person who
  // built the report doesn't need talking through their own tabs.
  if (VIEWER_MODE) {
    const guideBtn = el('button', { class: 'tour-guide-btn', type: 'button', title: 'Show me around this tab' }, [document.createTextNode('? Guide')]);
    guideBtn.addEventListener('click', () => { const id = currentViewId(); if (id) startTour(id); });
    nav.appendChild(guideBtn);
  }
  nav.appendChild(buildThemeToggle());
}

// Game sections are built once at init() and just shown/hidden by class
// toggle (never rebuilt), but the "Line" column on each point row depends
// on Line Analysis's curated lines, which live in localStorage and can
// change *after* this game page was built -- e.g. the user names a line,
// then switches straight to a game page in the same session without a
// reload. Each buildGameSection registers a refresher here so showView can
// re-pull the current lines data and update the column live on every visit.
const gameViewRefreshers = new Map();

// Every analysis tab reads the tournament setup (its game filter groups its
// games by tournament; Line Analysis scopes lines by tournament). Those tabs
// are built once at init and never rebuilt, so a tournament change made on
// the Set up tab wouldn't otherwise reach them without a full page reload.
// Instead we track a revision that bumps on every tournament edit, register
// each tab's build function here, and -- when you click into a tab whose
// content predates the latest edit -- rebuild just that tab from current
// data. Tabs you haven't touched since the edit keep all their in-tab state
// (selected players, filter picks); the disruptive rebuild only happens on
// the first visit after an actual change.
let tournamentsRevision = 0;
const rebuildableViews = new Map(); // id -> { buildFn, revision }

function mountRebuildableView(buildFn) {
  const section = buildFn();
  document.getElementById('main').appendChild(section);
  rebuildableViews.set(section.id, { buildFn, revision: tournamentsRevision });
}

function showView(id) {
  const rv = rebuildableViews.get(id);
  if (rv && rv.revision !== tournamentsRevision) {
    const old = document.getElementById(id);
    if (old && old.parentNode) {
      const fresh = rv.buildFn();
      old.parentNode.replaceChild(fresh, old);
    }
    rv.revision = tournamentsRevision;
  }
  document.querySelectorAll('section.view').forEach(s => s.classList.toggle('active', s.id === id));
  document.querySelectorAll('header.topnav button.tab').forEach(b => {
    if (b.classList.contains('nav-games-btn')) {
      b.classList.toggle('active', id.startsWith('game-'));
    } else {
      b.classList.toggle('active', b.getAttribute('data-target') === id);
    }
  });
  document.querySelectorAll('.nav-games-row').forEach(r => r.classList.toggle('active', r.getAttribute('data-target') === id));
  if (gameViewRefreshers.has(id)) gameViewRefreshers.get(id)();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // A tour in progress belongs to the tab you just left.
  endTour();
  maybeAutoTour(id);
}

// ---------- Sortable stats tables & CSV export ----------
// comboCountKey (optional, row required): folds a companion count column
// (e.g. huck completions) into this percentage cell as "23 (68%)" instead
// of a separate column -- the attempts/completions/% triplet only needs the
// attempts column (volume) and this merged cell (efficiency); the raw count
// stays visible, just no longer independently sortable.
function formatCell(v, col, row) {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'number') {
    const n = Number.isInteger(v) ? v : Math.round(v * 100) / 100;
    if (col && col.percent) {
      if (col.comboCountKey && row && row[col.comboCountKey] != null) {
        return `${row[col.comboCountKey]} (${n}%)`;
      }
      return `${n}%`;
    }
    return String(n);
  }
  return v;
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s;
  if (typeof v === 'number') {
    s = Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  } else {
    s = String(v);
  }
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'data';
}

// Shared by CSV export and Line Analysis's lines.json export.
function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename }, []);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Player photos ----------
// A player's Set-up photo as a small circular <img>, or null when they don't
// have one. Every caller falls back to just the name, so a roster that's only
// half photographed looks deliberate rather than broken.
function playerAvatar(name, size) {
  const src = (loadSetupData().playerPhotos || {})[name];
  if (!src) return null;
  return el('img', {
    class: 'avatar', src, alt: '', loading: 'lazy',
    style: `width:${size}px;height:${size}px;`,
  }, []);
}
// Name preceded by the player's photo when there is one -- the standard way a
// player is labelled anywhere a face helps.
function playerNameWithAvatar(name, size, cls) {
  const wrap = el('span', { class: 'avatar-name' + (cls ? ' ' + cls : '') }, []);
  const img = playerAvatar(name, size);
  if (img) wrap.appendChild(img);
  wrap.appendChild(el('span', {}, [document.createTextNode(name)]));
  return wrap;
}

// ---------- Minimal ZIP writer (store-only) ----------
// Just enough of the ZIP spec to bundle the player photos into one download.
// No compression: the entries are PNGs, which are already deflate-compressed,
// so storing them costs nothing and keeps this to a few dozen lines with no
// external library (the report has to stay a single self-contained file).
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
// files: [{ name, data: Uint8Array }] -> Uint8Array of a .zip
function buildZip(files) {
  const enc = new TextEncoder();
  const entries = files.map(f => ({ name: enc.encode(f.name), data: f.data, crc: crc32(f.data) }));
  const localSize = entries.reduce((s, e) => s + 30 + e.name.length + e.data.length, 0);
  const centralSize = entries.reduce((s, e) => s + 46 + e.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const dv = new DataView(out.buffer);
  let p = 0;
  entries.forEach(e => {
    e.offset = p;
    dv.setUint32(p, 0x04034b50, true);      // local file header
    dv.setUint16(p + 4, 20, true);          // version needed
    dv.setUint16(p + 6, 0, true);           // flags
    dv.setUint16(p + 8, 0, true);           // method: stored
    dv.setUint16(p + 10, 0, true);          // mod time
    dv.setUint16(p + 12, 0x21, true);       // mod date (1980-01-01: no clock in a zip we regenerate)
    dv.setUint32(p + 14, e.crc, true);
    dv.setUint32(p + 18, e.data.length, true);
    dv.setUint32(p + 22, e.data.length, true);
    dv.setUint16(p + 26, e.name.length, true);
    dv.setUint16(p + 28, 0, true);          // extra length
    p += 30;
    out.set(e.name, p); p += e.name.length;
    out.set(e.data, p); p += e.data.length;
  });
  const centralStart = p;
  entries.forEach(e => {
    dv.setUint32(p, 0x02014b50, true);      // central directory header
    dv.setUint16(p + 4, 20, true);          // version made by
    dv.setUint16(p + 6, 20, true);          // version needed
    dv.setUint16(p + 8, 0, true);
    dv.setUint16(p + 10, 0, true);
    dv.setUint16(p + 12, 0, true);
    dv.setUint16(p + 14, 0x21, true);
    dv.setUint32(p + 16, e.crc, true);
    dv.setUint32(p + 20, e.data.length, true);
    dv.setUint32(p + 24, e.data.length, true);
    dv.setUint16(p + 28, e.name.length, true);
    dv.setUint16(p + 30, 0, true);          // extra
    dv.setUint16(p + 32, 0, true);          // comment
    dv.setUint16(p + 34, 0, true);          // disk number
    dv.setUint16(p + 36, 0, true);          // internal attrs
    dv.setUint32(p + 38, 0, true);          // external attrs
    dv.setUint32(p + 42, e.offset, true);
    p += 46;
    out.set(e.name, p); p += e.name.length;
  });
  dv.setUint32(p, 0x06054b50, true);        // end of central directory
  dv.setUint16(p + 8, entries.length, true);
  dv.setUint16(p + 10, entries.length, true);
  dv.setUint32(p + 12, centralStart ? p - centralStart : 0, true);
  dv.setUint32(p + 16, centralStart, true);
  return out;
}

// "data:image/png;base64,...." -> raw bytes
function dataUrlToBytes(dataUrl) {
  const bin = atob(String(dataUrl).split(',')[1] || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// The player photos set up on the Set up tab, as ZIP entries named after the
// player so the mapping survives outside the report.
function playerPhotoFiles() {
  const photos = loadSetupData().playerPhotos || {};
  return Object.keys(photos).sort().map(name => ({
    player: name,
    name: 'photos/' + slug(name) + '.png',
    data: dataUrlToBytes(photos[name]),
  }));
}

function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => csvCell(c.full || c.label));
  const lines = rows.map(r => columns.map(c => csvCell(r[c.key])));
  const csv = [header, ...lines].map(line => line.join(',')).join('\r\n');
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// Generic CSV writer for the Raw Data tab: turns an array of flat row
// objects into a CSV, using the row objects' own keys as headers rather
// than a separate {key,label} column-def list (unlike downloadCSV above,
// used by the sortable/filterable tables). columnOrder (optional) is a
// plain array of key names; when omitted, columns are auto-detected as the
// union of every row's keys in first-seen order, so an export can't
// silently drop a field if the underlying data later grows one.
function downloadObjectsAsCSV(rows, filename, columnOrder) {
  let columns = columnOrder;
  if (!columns) {
    columns = [];
    const seen = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => { if (!seen.has(k)) { seen.add(k); columns.push(k); } }));
  }
  const header = columns.map(csvCell);
  const lines = rows.map(r => columns.map(c => csvCell(r[c])));
  const csv = [header, ...lines].map(line => line.join(',')).join('\r\n');
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// Recursively flattens a nested object into {a_b_c: value} pairs, joining
// keys with "_". Used for game.summary, which nests several levels deep
// (e.g. summary.lineStats.combined.throws,
// summary.scoringEfficiency.perPoint.total.pct -- see _build_game_summary
// in stats.py).
function flattenObject(obj, prefix, out) {
  out = out || {};
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    const key = prefix ? `${prefix}_${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flattenObject(v, key, out);
    } else {
      out[key] = v;
    }
  });
  return out;
}

// filterable (opt-in, default off -- both existing callers get byte-for-byte
// identical behavior): adds a persistent per-column filter-input row. Header
// and filter inputs are built once, outside the render cycle, so a filter
// input's focus/cursor position survives every keystroke -- only <tbody>
// gets rebuilt on a filter or sort change. Text columns filter by
// case-insensitive substring; numeric columns filter by a "at least N"
// minimum (a full min/max range would double the row height for little
// practical gain over just thinning out noise).
function buildStatsTable(rows, columns, initialSortKey, filename, opts) {
  const filterable = !!(opts && opts.filterable);
  // hidden columns (a completions count folded into a companion % column's
  // combo display -- see formatCell) stay in `columns` so CSV export keeps
  // full fidelity, but are skipped when building the visible table itself.
  const visibleColumns = columns.filter(c => !c.hidden);
  let sortKey = initialSortKey;
  let sortDir = -1;
  let currentSorted = rows;
  const filters = {}; // col.key -> current filter input value

  const container = el('div', { class: 'stats-block' });
  const wrap = el('div', { class: 'table-scroll' });
  const table = el('table', { class: 'stats' });
  wrap.appendChild(table);
  container.appendChild(wrap);

  const dlBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Download CSV')]);
  dlBtn.addEventListener('click', () => downloadCSV(currentSorted, columns, filename || 'stats.csv'));
  container.appendChild(dlBtn);

  const thead = el('thead', {}, []);
  const headRow = el('tr', {}, []);
  const thByKey = {};
  visibleColumns.forEach(col => {
    const th = el('th', { title: col.full || col.label }, [
      document.createTextNode(col.label),
      el('span', { class: 'arrow' }, []),
    ]);
    th.addEventListener('click', () => {
      if (sortKey === col.key) sortDir *= -1; else { sortKey = col.key; sortDir = col.numeric ? -1 : 1; }
      updateHeaderSortIndicators();
      renderBody();
    });
    thByKey[col.key] = th;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const filterInputByKey = {};
  if (filterable) {
    const filterRow = el('tr', { class: 'filter-row' }, []);
    visibleColumns.forEach(col => {
      const input = el('input', {
        type: col.numeric ? 'number' : 'text',
        placeholder: col.numeric ? '≥' : 'filter…',
        class: 'col-filter-input',
      }, []);
      input.addEventListener('input', () => { filters[col.key] = input.value; renderBody(); });
      filterInputByKey[col.key] = input;
      filterRow.appendChild(el('th', {}, [input]));
    });
    thead.appendChild(filterRow);
  }
  table.appendChild(thead);
  const tbody = el('tbody', {}, []);
  table.appendChild(tbody);

  function passesFilters(r) {
    return visibleColumns.every(col => {
      const fv = filters[col.key];
      if (fv === undefined || fv === '') return true;
      if (col.numeric) {
        const n = Number(fv);
        return Number.isNaN(n) ? true : (Number(r[col.key]) || 0) >= n;
      }
      return String(r[col.key] ?? '').toLowerCase().includes(fv.toLowerCase());
    });
  }

  function updateHeaderSortIndicators() {
    visibleColumns.forEach(col => {
      const th = thByKey[col.key];
      th.classList.toggle('sorted', col.key === sortKey);
      th.querySelector('.arrow').textContent = col.key === sortKey ? (sortDir === -1 ? '▼' : '▲') : '';
    });
  }

  function renderBody() {
    const filtered = filterable ? rows.filter(passesFilters) : rows;
    currentSorted = [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortDir * av.localeCompare(bv);
      return sortDir * ((av ?? 0) - (bv ?? 0));
    });
    tbody.innerHTML = '';
    currentSorted.forEach(r => {
      const tr = el('tr', {}, []);
      visibleColumns.forEach(col => {
        // avatar:true on a column (the Player column of a per-player table)
        // puts the player's photo in front of their name; every other column,
        // and every player without a photo, renders as plain text as before.
        const cell = (col.avatar && typeof r[col.key] === 'string')
          ? playerNameWithAvatar(r[col.key], 22)
          : document.createTextNode(formatCell(r[col.key], col, r));
        tr.appendChild(el('td', {}, [cell]));
      });
      tbody.appendChild(tr);
    });
  }

  // Lets an external control (the pair heatmap's cell click) drive a filter
  // programmatically -- attached to the returned node rather than adding a
  // second return value, so plain `container.appendChild`-style callers
  // (both existing ones) are completely unaffected.
  container.setFilter = function (key, value) {
    filters[key] = value;
    if (filterInputByKey[key]) filterInputByKey[key].value = value;
    renderBody();
  };

  updateHeaderSortIndicators();
  renderBody();
  return container;
}

/* ---------------- pitch (field) diagram ---------------- */
// USAU pitch: 40yd wide x 110yd total length (70yd playing field + 20yd
// endzone at each end), drawn at 8px per yard.
const YD_PX = 8;
const PITCH_W = 40 * YD_PX;  // 320
const PITCH_H = 110 * YD_PX; // 880
const ENDZONE_FRAC = 20 / 110;
const BRICK_FRAC = 20 / 110; // brick mark sits 20yd in front of each goal line
const FIELD_LENGTH_YD_JS = 110;
const FIELD_WIDTH_YD_JS = 40; // mirrors FIELD_WIDTH_YD in statto_report/constants.py
const IMPACT_HUCK_YD = 27;
const RED_ZONE_FAR = 2 * ENDZONE_FRAC; // 20 yd out from the goal line, per the same red-zone definition used elsewhere

// ---------- Field diagram: pitch, pass routes, per-point rendering ----------
function svgEl(tag, attrs) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// Shared floating tooltip for pass hover, reused across every game's field diagram.
let passTooltipEl = null;
function getPassTooltip() {
  if (!passTooltipEl) {
    passTooltipEl = el('div', { class: 'pass-tooltip' }, []);
    document.body.appendChild(passTooltipEl);
  }
  return passTooltipEl;
}
function positionPassTooltip(evt) {
  const t = getPassTooltip();
  const pad = 14;
  const vw = window.innerWidth, vh = window.innerHeight;
  const rect = t.getBoundingClientRect();
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  if (x + rect.width > vw - 8) x = evt.clientX - rect.width - pad;
  if (y + rect.height > vh - 8) y = evt.clientY - rect.height - pad;
  t.style.left = x + 'px';
  t.style.top = y + 'px';
}
function showPassTooltip(evt, text) {
  const t = getPassTooltip();
  t.textContent = text;
  t.style.display = 'block';
  positionPassTooltip(evt);
}
function hidePassTooltip() {
  if (passTooltipEl) passTooltipEl.style.display = 'none';
}

// Adds an invisible, generously-wide "hit stroke" on top of a thin pass line so
// hovering it is easy, then shows the thrower/receiver names in a floating tooltip.
// `extra`, if given, is appended (e.g. which game this pass is from) -- only
// relevant where a diagram spans more than one game, so callers within a single
// game's own field diagram simply omit it and get the original plain tooltip.
function attachPassHover(routeLayer, x1, y1, x2, y2, p, extra) {
  const hit = svgEl('line', {
    x1, y1, x2, y2, stroke: '#000', 'stroke-width': 14, opacity: 0,
    'pointer-events': 'stroke', style: 'cursor: pointer;',
  });
  let label = `${p.thrower || 'Unknown'} \u2192 ${p.receiver || 'Unknown'}`;
  if (p.throwerError) label += ' \u00b7 throwaway';
  else if (p.receiverError) label += ' \u00b7 drop';
  if (extra) label += ` \u00b7 ${extra}`;
  hit.addEventListener('mouseenter', (e) => showPassTooltip(e, label));
  hit.addEventListener('mousemove', (e) => positionPassTooltip(e));
  hit.addEventListener('mouseleave', hidePassTooltip);
  routeLayer.appendChild(hit);
}

let pitchSeq = 0;
function buildPitch() {
  const svg = svgEl('svg', { viewBox: `0 0 ${PITCH_W} ${PITCH_H}`, width: '100%', style: 'max-width:340px; display:block; margin:0 auto;' });
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: PITCH_W, height: PITCH_H, fill: '#2E5339', rx: 6 }));
  const ezH = PITCH_H * ENDZONE_FRAC;
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: PITCH_W, height: ezH, fill: '#1F3B27' }));
  svg.appendChild(svgEl('rect', { x: 0, y: PITCH_H - ezH, width: PITCH_W, height: ezH, fill: '#1F3B27' }));
  [ezH, PITCH_H - ezH, PITCH_H / 2].forEach(y => {
    svg.appendChild(svgEl('line', { x1: 0, y1: y, x2: PITCH_W, y2: y, stroke: 'rgba(243,241,233,0.35)', 'stroke-width': 1.5, 'stroke-dasharray': y === PITCH_H/2 ? '4 4' : '0' }));
  });
  svg.appendChild(svgEl('rect', { x: 1, y: 1, width: PITCH_W - 2, height: PITCH_H - 2, fill: 'none', stroke: 'rgba(243,241,233,0.35)', 'stroke-width': 1.5, rx: 6 }));

  // Brick marks: centered on the field, 20yd in front of each goal line.
  const brickX = PITCH_W / 2;
  const brickTopY = ezH + PITCH_H * BRICK_FRAC;
  const brickBottomY = (PITCH_H - ezH) - PITCH_H * BRICK_FRAC;
  [brickTopY, brickBottomY].forEach(cy => {
    const brick = svgEl('circle', { cx: brickX, cy, r: 3.5, fill: '#9FB6B4', opacity: 0.55 });
    const title = svgEl('title', {});
    title.textContent = 'Brick mark';
    brick.appendChild(title);
    svg.appendChild(brick);
  });

  // End-markers are sized past their SVG default so the direction/outcome of
  // a route reads at a glance even in a dense, many-line diagram -- a marker
  // that only shows up under zoom defeats the point of it.
  // Marker ids are per-pitch. They used to be fixed strings, which meant every
  // diagram on the page defined the same six ids and every url(#...) in the
  // document resolved to the FIRST copy -- one that usually sits in an inactive,
  // display:none section, so the browser had nothing to paint and the
  // arrowheads/Xs/Os silently vanished on every diagram except whichever one
  // happened to own the first definition.
  const uid = ++pitchSeq;
  svg.setAttribute('data-mk', uid);
  const marker = svgEl('marker', { id: 'arrowhead-' + uid, markerWidth: 9, markerHeight: 9, refX: 7, refY: 3.5, orient: 'auto' });
  marker.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: '#F3F1E9' }));
  const defs = svgEl('defs', {});
  defs.appendChild(marker);
  const markerTO = svgEl('marker', { id: 'arrowhead-to-' + uid, markerWidth: 9, markerHeight: 9, refX: 7, refY: 3.5, orient: 'auto' });
  markerTO.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: '#E8604C' }));
  defs.appendChild(markerTO);
  // Turnovers split by whose mistake it was: a throwaway ends in an X (the
  // disc sailed off to nowhere), a drop ends in a hollow circle at the
  // receiver's spot (hands got there, didn't hold it). Shape -- not color --
  // carries the distinction, so it survives colorblindness and small sizes.
  const markerThrowaway = svgEl('marker', { id: 'marker-throwaway-' + uid, markerWidth: 9, markerHeight: 9, refX: 4.5, refY: 4.5, orient: 'auto' });
  markerThrowaway.appendChild(svgEl('path', { d: 'M1.3,1.3 L7.7,7.7 M7.7,1.3 L1.3,7.7', stroke: '#E8604C', 'stroke-width': 1.6, fill: 'none' }));
  defs.appendChild(markerThrowaway);
  const markerDrop = svgEl('marker', { id: 'marker-drop-' + uid, markerWidth: 9, markerHeight: 9, refX: 4.5, refY: 4.5, orient: 'auto' });
  markerDrop.appendChild(svgEl('circle', { cx: 4.5, cy: 4.5, r: 3, fill: 'none', stroke: '#E8604C', 'stroke-width': 1.6 }));
  defs.appendChild(markerDrop);
  // Both-fault turnover (thrower AND receiver error): the throwaway X inside
  // the drop's circle, so a shared-blame turnover reads as its own symbol.
  const markerBoth = svgEl('marker', { id: 'marker-both-' + uid, markerWidth: 11, markerHeight: 11, refX: 5.5, refY: 5.5, orient: 'auto' });
  markerBoth.appendChild(svgEl('circle', { cx: 5.5, cy: 5.5, r: 4.2, fill: 'none', stroke: '#E8604C', 'stroke-width': 1.4 }));
  markerBoth.appendChild(svgEl('path', { d: 'M3,3 L8,8 M8,3 L3,8', stroke: '#E8604C', 'stroke-width': 1.4, fill: 'none' }));
  defs.appendChild(markerBoth);
  // Assist (scoring) lines render 1.5x thicker (stroke-width 3 vs 2 for a
  // regular pass), and a marker's size scales with its line's stroke-width
  // by default -- so this marker's own box is shrunk by that same 2/3 ratio,
  // keeping the rendered arrowhead the same on-screen size as every other one.
  const markerGoal = svgEl('marker', { id: 'arrowhead-goal-' + uid, markerWidth: 6, markerHeight: 6, refX: 4.67, refY: 2.33, orient: 'auto' });
  markerGoal.appendChild(svgEl('path', { d: 'M0,0 L4.67,2.33 L0,4.67 Z', fill: '#FFB800' }));
  defs.appendChild(markerGoal);
  svg.insertBefore(defs, svg.firstChild);

  const routeLayer = svgEl('g', { class: 'routes' });
  routeLayer.setAttribute('data-mk', uid);
  svg.appendChild(routeLayer);
  return { svg, routeLayer };
}

// The end-marker reference for the pitch a route layer belongs to. Every
// renderer goes through this rather than naming an id directly, so a diagram
// can only ever point at its own markers.
function markerRef(routeLayer, name) {
  const uid = routeLayer && routeLayer.getAttribute('data-mk');
  return uid ? `url(#${name}-${uid})` : 'none';
}

// Which end-marker a turnover pass gets: X for the thrower's mistake, hollow
// circle for the receiver's. Falls back to the plain red arrowhead for a
// turnover pass carrying neither flag (shouldn't happen in Statto data).
function turnoverMarker(p, routeLayer) {
  if (p.throwerError && p.receiverError) return markerRef(routeLayer, 'marker-both');
  if (p.throwerError) return markerRef(routeLayer, 'marker-throwaway');
  if (p.receiverError) return markerRef(routeLayer, 'marker-drop');
  return markerRef(routeLayer, 'arrowhead-to');
}

// One shared legend under every field diagram, decoding the line colors and
// the throwaway/drop end-markers.
function buildFieldLegend() {
  const legend = el('div', { class: 'diff-legend field-legend' }, []);
  [
    ['#8a8a86', '→', 'Completed'],
    ['#FFB800', '→', 'Assist'],
    ['#E8604C', '✕', 'Throwaway'],
    ['#E8604C', '○', 'Drop'],
    ['#E8604C', '⊗', 'Throwaway & Drop'],
  ].forEach(([color, glyph, label]) => {
    legend.appendChild(el('span', { class: 'item' }, [
      el('span', { class: 'field-legend-glyph', style: `color:${color};` }, [document.createTextNode(glyph)]),
      document.createTextNode(label),
    ]));
  });
  return legend;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// Identifies the three players in the point's final throw sequence:
// 2nd assist/turnover-setup thrower -> assist/turnover thrower -> scorer/intended target.
// For a scored point this is the assist + secondary-assist passes (flagged by Statto).
// For a lost point, our own passes only cover our side of the play, so the last
// recorded pass (which should be our turnover) is used as the best-effort proxy
// for "the throw that ended our involvement in the point."
function finalSequence(point) {
  const passes = point.passes || [];
  if (!passes.length) return null;
  let firstPass, secondPass = null, targetPass;
  if (point.scored) {
    const assistPass = passes.find(p => p.assist);
    if (!assistPass) return null;
    firstPass = assistPass;
    targetPass = assistPass;
    secondPass = passes.find(p => p.secondaryAssist) || null;
  } else {
    const last = passes[passes.length - 1];
    if (!last.turnover) return null;
    firstPass = last;
    targetPass = last;
    const idx = passes.indexOf(last);
    secondPass = idx > 0 ? passes[idx - 1] : null;
  }
  return {
    second: secondPass ? { name: secondPass.thrower, x: secondPass.startX, y: secondPass.startY, role: point.scored ? '2nd assist' : 'earlier throw' } : null,
    first: { name: firstPass.thrower, x: firstPass.startX, y: firstPass.startY, role: point.scored ? 'assist' : 'turnover' },
    target: { name: targetPass.receiver, x: targetPass.endX, y: targetPass.endY, role: point.scored ? 'scorer' : 'intended target' },
  };
}

// Radius of the player circles on a game's field diagram -- a step up from the
// r=10 bubbles that used to mark only the deciding throws, since there's now
// one on every touch, but small enough that a busy possession stays readable.
const PASS_NODE_R = 12;

// One circular player marker for a field diagram: their initials on a dark
// disc, ringed in the accent colour.
function buildPlayerNodeMarker(name, cx, cy, r, accent) {
  const g = svgEl('g', {});
  g.appendChild(svgEl('circle', { cx, cy, r, fill: '#0E2426' }));
  const label = svgEl('text', {
    x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': Math.round(r * 0.8), 'font-weight': 700, fill: '#F3F1E9',
    'font-family': 'ui-monospace, monospace',
  });
  label.textContent = initials(name);
  g.appendChild(label);
  g.appendChild(svgEl('circle', {
    class: 'pass-node-ring', cx, cy, r, fill: 'none',
    stroke: accent, 'stroke-width': accent === '#FFB800' ? 2.2 : 1.5,
  }));
  return g;
}

function possessionsInPoint(point) {
  const nums = [...new Set((point.passes || []).map(p => p.possession).filter(n => n != null))];
  return nums.sort((a, b) => a - b);
}

function renderPoint(routeLayer, point, focusPossession) {
  routeLayer.innerHTML = '';
  const multi = possessionsInPoint(point).length > 1;
  // Video tags, if any have been made for this point. They only ever *add* to
  // the diagram (a hover detail, the pull's landing spot), so an untagged or
  // half-tagged point renders exactly as it always did.
  const ann = loadAnnotations();
  (point.passes || []).forEach((p, i) => {
    const x1 = p.startX * PITCH_W, y1 = p.startY * PITCH_H;
    const x2 = p.endX * PITCH_W, y2 = p.endY * PITCH_H;
    const isFocused = !multi || focusPossession == null || p.possession === focusPossession;
    let stroke = '#F3F1E9', markerEnd = markerRef(routeLayer, 'arrowhead'), width = 2, dash = '0';
    if (p.turnover) { stroke = '#E8604C'; markerEnd = turnoverMarker(p, routeLayer); dash = '3 3'; }
    else if (p.assist) { stroke = '#FFB800'; markerEnd = markerRef(routeLayer, 'arrowhead-goal'); width = 3; }

    if (!isFocused) {
      // Ghost line: a faint, thin trace so the shape of other possessions stays
      // visible without competing with the focused possession's full-color route.
      const ghost = svgEl('line', {
        x1, y1, x2, y2, stroke: 'rgba(243,241,233,0.4)', 'stroke-width': 1, opacity: 0,
      });
      routeLayer.appendChild(ghost);
      ghost.style.transition = 'opacity 0.3s ease';
      requestAnimationFrame(() => ghost.setAttribute('opacity', 0.5));
      attachPassHover(routeLayer, x1, y1, x2, y2, p, passTags(p));
      return;
    }

    const line = svgEl('line', {
      x1, y1, x2, y2, stroke, 'stroke-width': width, 'marker-end': markerEnd,
      'stroke-dasharray': dash === '0' ? 'none' : dash,
      opacity: 0,
    });
    routeLayer.appendChild(line);
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (dash === '0') {
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.style.transition = `stroke-dashoffset 0.5s ease ${i * 90}ms, opacity 0.05s ease ${i * 90}ms`;
    } else {
      line.style.transition = `opacity 0.3s ease ${i * 90}ms`;
    }
    requestAnimationFrame(() => {
      line.setAttribute('opacity', p.turnover ? 0.85 : 1);
      if (dash === '0') line.style.strokeDashoffset = 0;
    });
    attachPassHover(routeLayer, x1, y1, x2, y2, p, passTags(p));
  });
  // A tagged pass carries its film tags into the existing hover tooltip --
  // detail on demand, nothing extra drawn on the diagram itself.
  function passTags(p) {
    const tags = filmTagValues(ann.passes[p.uuid], FILM_PASS_TAG_KEYS);
    return tags.length ? tags.join(' · ') : undefined;
  }
  (point.blocks || []).forEach(b => {
    const cx = b.locationX * PITCH_W, cy = b.locationY * PITCH_H;
    const c = svgEl('circle', { cx, cy, r: 5, fill: b.callahan ? '#FFB800' : '#F3F1E9', stroke: '#0E2426', 'stroke-width': 1.2, opacity: 0 });
    routeLayer.appendChild(c);
    c.style.transition = 'opacity 0.3s ease 0.5s';
    requestAnimationFrame(() => c.setAttribute('opacity', 1));
    const title = svgEl('title', {});
    const blockTags = filmTagValues(ann.blocks[b.uuid], ['type', 'highlight']);
    title.textContent = (b.player || 'Unknown') + (b.callahan ? ' — Callahan!' : ' — block')
      + (blockTags.length ? ' · ' + blockTags.join(' · ') : '');
    c.appendChild(title);
  });

  // Where our pull landed, when the point's pull has been tagged with a spot.
  // Teal ring + dot, matching the Data Editor's own pull marker.
  if (!point.isOffense && point.uuid) {
    const pull = (ann.points || {})[point.uuid + '#pull'];
    if (pull && !pull.outOfBounds && pull.landX != null && pull.landY != null) {
      const cx = pull.landX * PITCH_W, cy = pull.landY * PITCH_H;
      const ring = svgEl('circle', { cx, cy, r: 8, fill: 'none', stroke: '#4FD1AE', 'stroke-width': 1.6, opacity: 0 });
      const dot = svgEl('circle', { cx, cy, r: 3, fill: '#4FD1AE', stroke: '#0E2426', 'stroke-width': 1, opacity: 0 });
      const t = svgEl('title', {});
      t.textContent = 'Pull' + (pull.puller ? ' by ' + pull.puller : '') + ' — landed here';
      dot.appendChild(t);
      routeLayer.appendChild(ring);
      routeLayer.appendChild(dot);
      [ring, dot].forEach(n => {
        n.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => n.setAttribute('opacity', 1));
      });
    }
  }

  // Final-throw-sequence bubbles: always shown regardless of possession focus,
  // since they mark how the point overall was decided, not a single possession's detail.
  // Player circles along the point's chain of touches -- one per person at the
  // spot they threw or caught from. These replace the old bubbles that marked
  // only the deciding throws; those keep their gold ring and their role in the
  // tooltip, so nothing is lost by unifying the two.
  const seq = finalSequence(point);
  const keyOf = (name, x, y) => `${name}@${x.toFixed(4)},${y.toFixed(4)}`;
  const roleAt = new Map();
  if (seq) [seq.second, seq.first, seq.target].forEach(n => {
    if (n) roleAt.set(keyOf(n.name, n.x, n.y), n.role);
  });

  const nodes = [];
  const pushNode = (name, x, y) => {
    if (!name) return;
    const last = nodes[nodes.length - 1];
    // The receiver of one pass is the thrower of the next, at the same spot --
    // collapse those into a single circle rather than stacking two.
    if (last && keyOf(last.name, last.x, last.y) === keyOf(name, x, y)) return;
    nodes.push({ name, x, y });
  };
  (point.passes || []).forEach(p => {
    if (multi && focusPossession != null && p.possession !== focusPossession) return;
    pushNode(p.thrower, p.startX, p.startY);
    // A pure throwaway ends where the disc landed, not on a player -- the X
    // marker already says that. A drop (or a shared-blame turnover) does end on
    // the receiver, so they get a circle.
    if (!(p.throwerError && !p.receiverError)) pushNode(p.receiver, p.endX, p.endY);
  });

  nodes.forEach((n, i) => {
    const role = roleAt.get(keyOf(n.name, n.x, n.y));
    const g = buildPlayerNodeMarker(
      n.name, n.x * PITCH_W, n.y * PITCH_H, PASS_NODE_R,
      role ? '#FFB800' : 'rgba(243,241,233,0.85)'
    );
    const title = svgEl('title', {});
    title.textContent = n.name + (role ? ` — ${role}` : '');
    g.appendChild(title);
    g.setAttribute('opacity', 0);
    routeLayer.appendChild(g);
    g.style.transition = `opacity 0.3s ease ${(0.5 + i * 0.04).toFixed(2)}s`;
    requestAnimationFrame(() => g.setAttribute('opacity', 1));
  });
}

// ---------- Player "impact map": this player's passes/blocks plotted on a pitch ----------

function gatherThrownPasses(name, gameIndices) {
  const out = [];
  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      (pt.passes || []).forEach(p => { if (p.thrower === name) out.push({ pass: p, gameIndex: gi }); });
    });
  });
  return out;
}
function gatherReceivedPasses(name, gameIndices) {
  const out = [];
  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      (pt.passes || []).forEach(p => { if (p.receiver === name) out.push({ pass: p, gameIndex: gi }); });
    });
  });
  return out;
}
function gatherPlayerBlocks(name, gameIndices) {
  const out = [];
  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      (pt.blocks || []).forEach(b => { if (b.player === name) out.push({ block: b, gameIndex: gi }); });
    });
  });
  return out;
}

const IMPACT_CATEGORIES = [
  { key: 'all', label: 'All throws' },
  { key: 'assistAttempts', label: 'Assist attempts' },
  { key: 'huckAttempts', label: 'Huck attempts' },
  { key: 'throwingErrors', label: 'Throwing errors' },
  { key: 'receivingErrors', label: 'Receiving errors' },
  { key: 'blocks', label: 'Blocks' },
];

// Categories other than "All throws" can be combined; a pass matching more than
// one selected category (e.g. a huck that was also a throwing error) is only
// drawn once, via Map-based dedup keyed on the underlying pass object itself
// (each pass may appear in both the "thrown" and "received" lists in different
// contexts, so we key on the pass, not the {pass, gameIndex} wrapper). Shared
// by computeImpactData, computeFieldAnalysisData, and Line Analysis's own
// pass gathering -- same five categories mean the same thing everywhere.
function filterTaggedByCategory(tagged, categories) {
  const map = new Map(); // pass object -> tagged entry
  const addAll = list => list.forEach(t => map.set(t.pass, t));
  if (categories.has('all')) {
    addAll(tagged);
  } else {
    if (categories.has('assistAttempts')) addAll(tagged.filter(t => t.pass.endY < ENDZONE_FRAC));
    if (categories.has('huckAttempts')) addAll(tagged.filter(t => (t.pass.startY - t.pass.endY) * FIELD_LENGTH_YD_JS >= IMPACT_HUCK_YD));
    if (categories.has('throwingErrors')) addAll(tagged.filter(t => t.pass.throwerError));
    if (categories.has('receivingErrors')) addAll(tagged.filter(t => t.pass.receiverError));
  }
  return [...map.values()];
}

// role: 'thrower' bases every category on passes this player threw; 'receiver'
// bases them on passes thrown to this player. This gives clean, symmetric
// meanings for each category, e.g. "Throwing errors" as thrower = this
// player's own throwaways; as receiver = throwaways aimed at this player
// (someone else's mistake, not theirs). Blocks are unaffected by role.
function computeImpactData(name, gameIndices, categories, role) {
  const thrown = gatherThrownPasses(name, gameIndices);
  const received = gatherReceivedPasses(name, gameIndices);
  const base = role === 'receiver' ? received : thrown;
  const blocks = categories.has('blocks') ? gatherPlayerBlocks(name, gameIndices) : [];
  const passes = filterTaggedByCategory(base, categories);
  return { passes, blocks };
}

// ---------- Field Analysis: same idea as the player impact map, generalized to
// any number of players, any point type (combined/offense/defense-starting),
// and with an option to expand goal/turnover passes out to their whole possession ----------

function gatherAllPassesTagged(gameIndices, pointTypeFilter) {
  const out = [];
  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      if (pointTypeFilter === 'offense' && !pt.isOffense) return;
      if (pointTypeFilter === 'defense' && pt.isOffense) return;
      (pt.passes || []).forEach(p => {
        out.push({ pass: p, gameIndex: gi, pointNumber: pt.number });
      });
    });
  });
  return out;
}
function gatherAllBlocksTagged(gameIndices, pointTypeFilter) {
  const out = [];
  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      if (pointTypeFilter === 'offense' && !pt.isOffense) return;
      if (pointTypeFilter === 'defense' && pt.isOffense) return;
      (pt.blocks || []).forEach(b => { out.push({ block: b, gameIndex: gi }); });
    });
  });
  return out;
}

function computeFieldAnalysisData(throwerNames, receiverNames, gameIndices, categories, pointTypeFilter, possessionMode, fieldMode) {
  const throwerSet = new Set(throwerNames);
  const receiverSet = new Set(receiverNames);
  const allTagged = gatherAllPassesTagged(gameIndices, pointTypeFilter);

  if (fieldMode === 'redzone') {
    // Red Zone view ignores the throw/outcome category entirely: a possession
    // qualifies if it has a pass matching the thrower/receiver combo AND that
    // pass was thrown from within 20 yd of the goal line (using the pass's start
    // location, so a huck thrown from further out that merely lands in the
    // endzone does not, by itself, qualify the possession). Once a possession
    // qualifies, every pass in it is shown -- including throws from before the
    // disc ever entered the red zone -- regardless of who threw them.
    const relevant = allTagged.filter(t => throwerSet.has(t.pass.thrower) && receiverSet.has(t.pass.receiver));
    const possKey = t => `${t.gameIndex}|${t.pointNumber}|${t.pass.possession}`;
    const qualifying = new Set();
    relevant.forEach(t => {
      if (t.pass.startY > ENDZONE_FRAC && t.pass.startY <= RED_ZONE_FAR) qualifying.add(possKey(t));
    });
    const passMap = new Map();
    allTagged.forEach(t => {
      if (qualifying.has(possKey(t))) passMap.set(t.pass, t);
    });
    const passes = [...passMap.entries()].map(([pass, meta]) => ({ pass, gameIndex: meta.gameIndex }));
    return { passes, blocks: [] };
  }

  // A pass matches only if its thrower is in the selected Thrower set AND its
  // receiver is in the selected Receiver set -- i.e. this is a thrower->receiver
  // combo filter, not "involves any of these players in any role."
  const matching = allTagged.filter(t => throwerSet.has(t.pass.thrower) && receiverSet.has(t.pass.receiver));

  // pass object -> {gameIndex, pointNumber}; kept as a Map (not the plain
  // array filterTaggedByCategory returns) since the possession-expansion
  // step below needs to look up and overwrite entries by pass identity.
  const passMap = new Map(filterTaggedByCategory(matching, categories).map(t => [t.pass, t]));

  // Blocks aren't a thrower->receiver event, so they match on either dropdown.
  let blocks = [];
  if (categories.has('blocks')) {
    blocks = gatherAllBlocksTagged(gameIndices, pointTypeFilter).filter(t => throwerSet.has(t.block.player) || receiverSet.has(t.block.player));
  }

  if (possessionMode === 'possession') {
    // Any matched pass that is itself a goal or a turnover gets expanded to include
    // every other pass in that same possession (matched by game + point + possession
    // number), regardless of the player/point-type filters, so the full story of that
    // scoring or losing possession shows up once any part of it matches.
    const toExpand = [...passMap.values()].filter(t => t.pass.assist || t.pass.turnover);
    toExpand.forEach(t => {
      const game = REPORT.games[t.gameIndex];
      const point = (game.points || []).find(pt => pt.number === t.pointNumber);
      if (!point) return;
      (point.passes || []).forEach(p => {
        if (p.possession === t.pass.possession) {
          passMap.set(p, { gameIndex: t.gameIndex, pointNumber: t.pointNumber });
        }
      });
    });
  }

  const passes = [...passMap.entries()].map(([pass, meta]) => ({ pass, gameIndex: meta.gameIndex }));
  return { passes, blocks };
}

// ---------- Gender Analysis: throwing distribution to WMPs vs a gender-blind fair share ----------

// Every point splits the field either 4-WMP/3-MMP or 3-WMP/4-MMP. If a thrower
// ignored gender entirely, they'd hit a WMP receiver at a rate equal to
// (WMP teammates excluding themselves) / 6, since there are always 6 other
// players on the field with them. That's the "fair share" baseline everything
// here is measured against.
function expectedWmpShare(wmpCountOnField, throwerIsWmp) {
  return (wmpCountOnField - (throwerIsWmp ? 1 : 0)) / 6;
}

function computeGenderAnalysis(gameIndices) {
  const genders = REPORT.playerGenders || {};
  const perThrower = new Map(); // name -> { r4: {wm,total}, r3: {wm,total} }

  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      const lineup = pt.lineup || [];
      if (!lineup.length) return;
      const wmpCount = lineup.filter(e => genders[e.player] === 1).length;
      if (wmpCount !== 3 && wmpCount !== 4) return; // defensive; should always be one of these
      const ratioKey = wmpCount === 3 ? 'r4' : 'r3'; // r4 = 4MMP/3WMP, r3 = 3MMP/4WMP
      (pt.passes || []).forEach(p => {
        const tg = genders[p.thrower], rg = genders[p.receiver];
        if (tg == null || rg == null) return;
        if (!perThrower.has(p.thrower)) {
          perThrower.set(p.thrower, { r4: { wm: 0, total: 0 }, r3: { wm: 0, total: 0 } });
        }
        const bucket = perThrower.get(p.thrower)[ratioKey];
        bucket.total += 1;
        if (rg === 1) bucket.wm += 1;
      });
    });
  });

  const results = [];
  perThrower.forEach((buckets, name) => {
    const gender = genders[name];
    const totalThrows = buckets.r4.total + buckets.r3.total;
    if (!totalThrows) return;
    let weightedSum = 0, weightedDenom = 0;
    let pct4 = null, exp4 = null, pct3 = null, exp3 = null;
    if (buckets.r4.total > 0) {
      pct4 = buckets.r4.wm / buckets.r4.total;
      exp4 = expectedWmpShare(3, gender === 1);
      weightedSum += (pct4 - exp4) * buckets.r4.total;
      weightedDenom += buckets.r4.total;
    }
    if (buckets.r3.total > 0) {
      pct3 = buckets.r3.wm / buckets.r3.total;
      exp3 = expectedWmpShare(4, gender === 1);
      weightedSum += (pct3 - exp3) * buckets.r3.total;
      weightedDenom += buckets.r3.total;
    }
    results.push({
      name, gender, totalThrows,
      throws4: buckets.r4.total, pct4, exp4,
      throws3: buckets.r3.total, pct3, exp3,
      weightedAvgDiff: weightedDenom ? weightedSum / weightedDenom : null,
    });
  });
  return results;
}

function quartiles(sorted) {
  function pct(p) {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  return { q1: pct(0.25), median: pct(0.5), q3: pct(0.75) };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// groups: [{ label, color, points: [{name, value, n}], refLine, refColor }]
function buildBoxplotChart(groups, opts) {
  const o = opts || {};
  const W = o.width || 380, H = o.height || 340;
  const padL = 46, padR = 16, padT = o.title ? 32 : 12, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = groups.length;
  const bandW = innerW / n;

  const allVals = groups.flatMap(g => g.points.map(p => p.value));
  const refVals = groups.filter(g => g.refLine != null).map(g => g.refLine);
  let yMin = o.yMin, yMax = o.yMax;
  if (yMin == null || yMax == null) {
    const all = allVals.concat(refVals);
    const dMin = Math.min(...all, 0), dMax = Math.max(...all, 0);
    const pad = (dMax - dMin) * 0.2 || 5;
    yMin = dMin - pad; yMax = dMax + pad;
  }
  if (o.yTickStep) {
    yMin = Math.floor(yMin / o.yTickStep) * o.yTickStep;
    yMax = Math.ceil(yMax / o.yTickStep) * o.yTickStep;
  }
  function yPos(v) { return padT + innerH * (1 - (v - yMin) / (yMax - yMin || 1)); }

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: 'display:block;' });

  if (o.title) {
    const t = svgEl('text', { x: W / 2, y: 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, style: 'fill:var(--chalk);' });
    t.textContent = o.title;
    svg.appendChild(t);
  }

  if (o.yTickStep) {
    // Fixed-step gridlines (e.g. every 5pp) that always land exactly on 0,
    // rather than a fixed tick *count* that can shift depending on the data range.
    const step = o.yTickStep;
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax + 1e-9; v += step) {
      const y = yPos(v);
      const isZero = Math.abs(v) < 1e-9;
      svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, style: `stroke:rgba(var(--chalk-rgb),${isZero ? 0.22 : 0.08});`, 'stroke-width': 1 }));
      const lbl = svgEl('text', { x: padL - 8, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 9, style: 'fill:var(--chalk-dim);' });
      lbl.textContent = o.yFormat ? o.yFormat(v) : String(Math.round(v));
      svg.appendChild(lbl);
    }
  } else {
    const yTicks = o.yTicks || 5;
    for (let i = 0; i <= yTicks; i++) {
      const v = yMin + (yMax - yMin) * i / yTicks;
      const y = yPos(v);
      svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, style: 'stroke:rgba(var(--chalk-rgb),0.08);', 'stroke-width': 1 }));
      const lbl = svgEl('text', { x: padL - 8, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 9, style: 'fill:var(--chalk-dim);' });
      lbl.textContent = o.yFormat ? o.yFormat(v) : String(Math.round(v));
      svg.appendChild(lbl);
    }
  }

  groups.forEach((g, i) => {
    const cx = padL + bandW * (i + 0.5);
    const boxW = Math.min(64, bandW * 0.5);

    if (g.refLine != null) {
      const y = yPos(g.refLine);
      svg.appendChild(svgEl('line', {
        x1: cx - boxW * 0.9, y1: y, x2: cx + boxW * 0.9, y2: y,
        style: `stroke:${g.refColor || 'var(--chalk-dim)'};`, 'stroke-width': 2, 'stroke-dasharray': '4 3',
      }));
    }

    const vals = g.points.map(p => p.value).sort((a, b) => a - b);
    if (vals.length) {
      const q = quartiles(vals);
      const iqr = q.q3 - q.q1;
      const loW = Math.max(vals[0], q.q1 - 1.5 * iqr);
      const hiW = Math.min(vals[vals.length - 1], q.q3 + 1.5 * iqr);
      svg.appendChild(svgEl('line', { x1: cx, y1: yPos(loW), x2: cx, y2: yPos(hiW), style: 'stroke:rgba(var(--chalk-rgb),0.4);', 'stroke-width': 1 }));
      svg.appendChild(svgEl('rect', {
        x: cx - boxW / 2, y: yPos(q.q3), width: boxW, height: Math.max(1, yPos(q.q1) - yPos(q.q3)),
        style: `fill:${g.color};stroke:${g.color};`, opacity: 0.28, 'stroke-width': 1.5,
      }));
      const medY = yPos(q.median);
      svg.appendChild(svgEl('line', { x1: cx - boxW / 2, y1: medY, x2: cx + boxW / 2, y2: medY, style: `stroke:${g.color};`, 'stroke-width': 2 }));
    }

    g.points.forEach(p => {
      const jitter = ((hashStr(p.name) % 1000) / 1000 - 0.5) * boxW * 0.85;
      const px = cx + jitter, py = yPos(p.value);
      const dot = svgEl('circle', { cx: px, cy: py, r: 3.5, style: `fill:${g.color}; cursor:pointer;`, opacity: 0.85 });
      const tip = o.tooltip ? o.tooltip(p) : `${p.name}: ${p.value} (n=${p.n})`;
      dot.addEventListener('mouseenter', (e) => showPassTooltip(e, tip));
      dot.addEventListener('mousemove', (e) => positionPassTooltip(e));
      dot.addEventListener('mouseleave', hidePassTooltip);
      svg.appendChild(dot);
    });

    const xlbl = svgEl('text', { x: cx, y: H - padB + 20, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, style: 'fill:var(--chalk);' });
    xlbl.textContent = g.label;
    svg.appendChild(xlbl);
  });

  return svg;
}

const GENDER_WMP_COLOR = '#D9A441';
const GENDER_MMP_COLOR = '#6F93AD';

function buildGenderAnalysisSection() {
  const section = el('section', { class: 'view', id: 'gender-analysis' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Gender Analysis')]));

  const explainer = el('div', { class: 'gender-explainer' }, []);
  [
    'Mixed-gender ultimate points are always played with either 4 women-matching players (WMP) and 3 men-matching players (MMP) on the field, or 3 WMPs and 4 MMPs. If a thrower paid zero attention to gender and just threw to whichever of their 6 teammates happened to be open, the share of their throws that landed on a WMP would depend entirely on how many WMPs were on the field with them that point.',
    'For example: on a point with 4 WMP on the field, a MMP thrower has 4 WMP teammates and 2 other MMP teammates to choose from, so a perfectly gender-blind MMP would complete about 4/6 ≈ 67% of throws to WMPs. A WMP thrower on that same point has 3 WMP teammates and 3 MMP teammates, so their gender-blind rate would be 3/6 = 50% instead. Those two numbers swap on a point with 4 MMP/3 WMP.',
    'The chart below measures how far each player’s actual rate sits from their own personal version of that baseline, in percentage points (pp), averaged across however many of each point type they played. 0pp means a player threw to WMPs at exactly the rate gender-blind randomness would predict for them. A positive number means more of their throws went to WMPs than that baseline predicts; a negative number means fewer.',
    'As a concrete example: say a MMP thrower’s personal gender-blind baseline — given the specific mix of 4-WMP and 3-WMP points they played — works out to 55%. A value of +1.9pp means they actually threw to WMPs about 56.9% of the time: 1.9 points above what gender-blind randomness predicts for them specifically. A WMP thrower showing −1.9pp threw to WMPs about 1.9 points less often than their own baseline would predict.',
    'Players with only a handful of relevant throws can swing a long way on this metric by chance alone, so use the throw-count filter below to focus on more reliable sample sizes.',
    'Finally, it’s important to keep in mind that any deviations from fairness are not a statement on how good or bad a player is, how good or bad a mixed team is, or how well or poorly that player/team values any of their teammates. This is intended to be a single data point and lacks any context that might explain why a person or team has the numbers they do.',
  ].forEach(text => explainer.appendChild(el('p', {}, [document.createTextNode(text)])));
  section.appendChild(explainer);

  const controlsRow = el('div', { class: 'controls-row' }, []);
  section.appendChild(controlsRow);

  const chartWrap = el('div', { class: 'gender-chart-wrap' }, []);
  section.appendChild(chartWrap);

  const legend = el('div', { class: 'diff-legend' }, []);
  section.appendChild(legend);

  let selectedGames = REPORT.games.map((g, i) => i);
  let minThrows = 5;
  let mode = 'deviation';

  function setLegend(items) {
    legend.innerHTML = '';
    items.forEach(([color, text]) => {
      legend.appendChild(el('span', { class: 'item' }, [
        el('span', { class: 'swatch', style: `background:${color};` }, []),
        document.createTextNode(text),
      ]));
    });
  }

  function render() {
    chartWrap.innerHTML = '';
    const data = computeGenderAnalysis(selectedGames);

    if (mode === 'deviation') {
      const filtered = data.filter(d => d.totalThrows >= minThrows && d.weightedAvgDiff != null);
      const wmpPoints = filtered.filter(d => d.gender === 1).map(d => ({ name: d.name, value: Math.round(d.weightedAvgDiff * 1000) / 10, n: d.totalThrows }));
      const mmpPoints = filtered.filter(d => d.gender === 0).map(d => ({ name: d.name, value: Math.round(d.weightedAvgDiff * 1000) / 10, n: d.totalThrows }));
      const svg = buildBoxplotChart([
        { label: 'WMP throwers', color: GENDER_WMP_COLOR, points: wmpPoints, refLine: 0 },
        { label: 'MMP throwers', color: GENDER_MMP_COLOR, points: mmpPoints, refLine: 0 },
      ], {
        width: 440, height: 380, yTickStep: 5,
        yFormat: v => `${v > 0 ? '+' : ''}${Math.round(v)}pp`,
        tooltip: p => `${p.name}: ${p.value > 0 ? '+' : ''}${p.value}pp (n=${p.n})`,
      });
      chartWrap.appendChild(svg);
      setLegend([
        [GENDER_WMP_COLOR, 'WMP throwers'],
        [GENDER_MMP_COLOR, 'MMP throwers'],
        ['var(--chalk-dim)', '0pp = perfectly gender-blind fair share, weighted across both ratios'],
      ]);
    } else {
      const grid = el('div', { class: 'gender-raw-grid' }, []);
      const chart4 = buildBoxplotChart([
        { label: 'WMP', color: GENDER_WMP_COLOR, refLine: (1 / 3) * 100, points: data.filter(d => d.gender === 1 && d.throws4 >= minThrows).map(d => ({ name: d.name, value: Math.round(d.pct4 * 1000) / 10, n: d.throws4 })) },
        { label: 'MMP', color: GENDER_MMP_COLOR, refLine: 50, points: data.filter(d => d.gender === 0 && d.throws4 >= minThrows).map(d => ({ name: d.name, value: Math.round(d.pct4 * 1000) / 10, n: d.throws4 })) },
      ], {
        title: 'gender ratio: 4MMP/3WMP', yMin: 0, yMax: 100, width: 300, height: 360,
        yFormat: v => `${Math.round(v)}%`, tooltip: p => `${p.name}: ${p.value}% to WMP (n=${p.n})`,
      });
      const chart3 = buildBoxplotChart([
        { label: 'WMP', color: GENDER_WMP_COLOR, refLine: 50, points: data.filter(d => d.gender === 1 && d.throws3 >= minThrows).map(d => ({ name: d.name, value: Math.round(d.pct3 * 1000) / 10, n: d.throws3 })) },
        { label: 'MMP', color: GENDER_MMP_COLOR, refLine: (2 / 3) * 100, points: data.filter(d => d.gender === 0 && d.throws3 >= minThrows).map(d => ({ name: d.name, value: Math.round(d.pct3 * 1000) / 10, n: d.throws3 })) },
      ], {
        title: 'gender ratio: 3MMP/4WMP', yMin: 0, yMax: 100, width: 300, height: 360,
        yFormat: v => `${Math.round(v)}%`, tooltip: p => `${p.name}: ${p.value}% to WMP (n=${p.n})`,
      });
      grid.appendChild(el('div', { class: 'gender-raw-chart' }, [chart4]));
      grid.appendChild(el('div', { class: 'gender-raw-chart' }, [chart3]));
      chartWrap.appendChild(grid);
      setLegend([
        [GENDER_WMP_COLOR, 'WMP throwers'],
        [GENDER_MMP_COLOR, 'MMP throwers'],
        ['var(--chalk-dim)', 'dashed line = gender-blind fair share for that group'],
      ]);
    }
  }

  controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; render(); }));
  controlsRow.appendChild(buildSegToggle([
    { key: 5, label: '5+ throws' },
    { key: 10, label: '10+ throws' },
    { key: 20, label: '20+ throws' },
    { key: 0, label: 'All' },
  ], (key) => { minThrows = key; render(); }));
  controlsRow.appendChild(buildToggle('Deviation from gender-blind fairness', 'Raw % by Ratio', (which) => {
    mode = which === 'a' ? 'deviation' : 'raw';
    render();
  }));

  render();
  return section;
}

function buildFieldAnalysisSection() {
  const section = el('section', { class: 'view', id: 'field-analysis' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Field Analysis')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Overlay throws, outcomes, and blocks across any combination of players and games.')]));

  const controlsRow = el('div', { class: 'controls-row field-analysis-controls' }, []);
  section.appendChild(controlsRow);

  const pitchWrap = el('div', { class: 'field-analysis-pitch-wrap' }, []);
  const { svg, routeLayer } = buildPitch();
  svg.style.width = 'auto';
  svg.style.height = 'auto';
  svg.style.maxWidth = '82vw';
  svg.style.maxHeight = '58vh';
  pitchWrap.appendChild(svg);
  section.appendChild(pitchWrap);
  section.appendChild(buildFieldLegend());

  const exportRow = el('div', { class: 'field-analysis-export-row' }, []);
  const exportBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Export as PNG')]);
  exportRow.appendChild(exportBtn);
  section.appendChild(exportRow);

  let selectedThrowers = REPORT.seasonLeaderboard.map(r => r.player);
  let selectedReceivers = REPORT.seasonLeaderboard.map(r => r.player);
  let selectedGames = REPORT.games.map((g, i) => i);
  let categories = new Set(['all']);
  let pointTypeFilter = 'combined';
  let possessionMode = 'final';
  let fieldMode = 'full';

  function render() {
    const { passes, blocks } = computeFieldAnalysisData(selectedThrowers, selectedReceivers, selectedGames, categories, pointTypeFilter, possessionMode, fieldMode);
    renderPlayerImpact(routeLayer, passes, blocks);
  }

  const categoryControl = buildImpactCategoryDropdown((cats) => { categories = cats; render(); });
  const possessionControl = buildToggle('Final Throw', 'Entire Possession', (which) => {
    possessionMode = which === 'a' ? 'final' : 'possession';
    render();
  });

  function updateControlAvailability() {
    const disabled = fieldMode === 'redzone';
    categoryControl.classList.toggle('control-disabled', disabled);
    possessionControl.classList.toggle('control-disabled', disabled);
  }

  controlsRow.appendChild(categoryControl);
  controlsRow.appendChild(buildPlayerSelector((names) => { selectedThrowers = names; render(); }, { maxPlayers: Infinity, defaultAll: true, includeSelectAll: true, roleLabel: 'Thrower' }));
  controlsRow.appendChild(buildPlayerSelector((names) => { selectedReceivers = names; render(); }, { maxPlayers: Infinity, defaultAll: true, includeSelectAll: true, roleLabel: 'Receiver' }));
  controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; render(); }));
  controlsRow.appendChild(buildSegToggle([
    { key: 'combined', label: 'Combined' },
    { key: 'offense', label: 'O-points' },
    { key: 'defense', label: 'D-points' },
  ], (key) => { pointTypeFilter = key; render(); }));
  controlsRow.appendChild(possessionControl);
  controlsRow.appendChild(buildToggle('Full Field', 'Red Zone', (which) => {
    fieldMode = which === 'a' ? 'full' : 'redzone';
    updateControlAvailability();
    render();
  }));

  function describeSelection() {
    const allNames = REPORT.seasonLeaderboard.map(r => r.player);
    function playersLabel(names) {
      if (names.length === allNames.length) return 'All';
      if (names.length <= 3) return names.join(', ');
      return `${names.length} selected`;
    }
    const gamesLabel = selectedGames.length === REPORT.games.length ? 'All Games'
      : selectedGames.length <= 2 ? selectedGames.map(gi => REPORT.games[gi].opponent).join(', ')
      : `${selectedGames.length} Games`;
    const pointTypeLabel = pointTypeFilter === 'combined' ? 'Combined' : pointTypeFilter === 'offense' ? 'O-Points' : 'D-Points';
    const modeLabel = fieldMode === 'redzone' ? 'Red Zone' : 'Full Field';
    const lines = [
      `Thrower: ${playersLabel(selectedThrowers)}`,
      `Receiver: ${playersLabel(selectedReceivers)}`,
      `Games: ${gamesLabel}`,
      `Points: ${pointTypeLabel}`,
      `View: ${modeLabel}`,
    ];
    if (fieldMode === 'full') {
      const catLabels = IMPACT_CATEGORIES.filter(c => categories.has(c.key)).map(c => c.label);
      lines.push(`Showing: ${catLabels.length ? catLabels.join(', ') : 'None'}`);
      lines.push(`Detail: ${possessionMode === 'possession' ? 'Entire Possession' : 'Final Throw'}`);
    }
    return lines;
  }

  exportBtn.addEventListener('click', () => exportFieldAnalysisPNG(svg, describeSelection()));

  updateControlAvailability();
  render();
  return section;
}

// Rasterizes the current field diagram plus a small header summarizing the
// active filters, and downloads it as a single PNG.
function exportFieldAnalysisPNG(svgElement, configLines) {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const svgW = PITCH_W, svgH = PITCH_H;
    const padding = 24;
    const lineHeight = 20;
    const headerHeight = 30 + configLines.length * lineHeight + 14;
    const canvas = document.createElement('canvas');
    canvas.width = (svgW + padding * 2) * scale;
    canvas.height = (svgH + headerHeight + padding * 2) * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const cs = getComputedStyle(document.documentElement);
    const bg = (cs.getPropertyValue('--ink') || '#17181A').trim();
    const fg = (cs.getPropertyValue('--chalk') || '#ECECEC').trim();
    const fgDim = (cs.getPropertyValue('--chalk-dim') || '#9C9CA1').trim();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, svgW + padding * 2, svgH + headerHeight + padding * 2);

    ctx.fillStyle = fg;
    ctx.font = 'bold 16px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('Field Analysis', padding, padding + 16);

    ctx.font = '12px ui-monospace, "SF Mono", monospace';
    ctx.fillStyle = fgDim;
    configLines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + 38 + i * lineHeight);
    });

    ctx.drawImage(img, padding, headerHeight + padding, svgW, svgH);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {
      const dlUrl = URL.createObjectURL(blob);
      const a = el('a', { href: dlUrl, download: 'field_analysis.png' }, []);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    }, 'image/png');
  };
  img.src = url;
}

// Same visual language as the game-tab field diagram (color-coded lines, hover
// tooltips), but rendered immediately with no draw-in stagger, since a season's
// worth of "All throws" for one player can be a lot of lines to animate through.
// Since this view can span multiple games, the hover tooltip also names which
// game each line/block came from -- omitted in the single-game field diagram,
// where it would just be redundant clutter.
function renderPlayerImpact(routeLayer, passes, blocks) {
  routeLayer.innerHTML = '';
  passes.forEach(({ pass: p, gameIndex }) => {
    const x1 = p.startX * PITCH_W, y1 = p.startY * PITCH_H;
    const x2 = p.endX * PITCH_W, y2 = p.endY * PITCH_H;
    let stroke = '#F3F1E9', markerEnd = markerRef(routeLayer, 'arrowhead'), width = 2, dash = '0';
    if (p.turnover) { stroke = '#E8604C'; markerEnd = turnoverMarker(p, routeLayer); dash = '3 3'; }
    else if (p.assist) { stroke = '#FFB800'; markerEnd = markerRef(routeLayer, 'arrowhead-goal'); width = 3; }
    const line = svgEl('line', {
      x1, y1, x2, y2, stroke, 'stroke-width': width, 'marker-end': markerEnd,
      'stroke-dasharray': dash === '0' ? 'none' : dash,
      opacity: p.turnover ? 0.85 : 1,
    });
    routeLayer.appendChild(line);
    const game = REPORT.games[gameIndex];
    attachPassHover(routeLayer, x1, y1, x2, y2, p, game ? `vs ${game.opponent}` : null);
  });
  blocks.forEach(({ block: b, gameIndex }) => {
    const cx = b.locationX * PITCH_W, cy = b.locationY * PITCH_H;
    const c = svgEl('circle', { cx, cy, r: 5, fill: b.callahan ? '#FFB800' : '#F3F1E9', stroke: '#0E2426', 'stroke-width': 1.2 });
    routeLayer.appendChild(c);
    const title = svgEl('title', {});
    const game = REPORT.games[gameIndex];
    const gameLabel = game ? ` \u00b7 vs ${game.opponent}` : '';
    title.textContent = (b.player || 'Unknown') + (b.callahan ? ' — Callahan!' : ' — block') + gameLabel;
    c.appendChild(title);
  });
}

// categoryList overrides the default IMPACT_CATEGORIES -- used by Thrower-
// Receiver Analysis to drop "Blocks" (not a thrower->receiver event, so it'd
// just always be an empty no-op checkbox there).
function buildImpactCategoryDropdown(onChange, categoryList) {
  const categories = categoryList || IMPACT_CATEGORIES;
  const wrap = el('div', { class: 'game-filter' }, []);
  const btn = el('button', { class: 'game-filter-btn', type: 'button' }, []);
  const panel = el('div', { class: 'game-filter-panel' }, []);
  panel.style.display = 'none';
  let selected = new Set(['all']);
  const cbs = {};

  function updateLabel() {
    if (selected.has('all')) { btn.textContent = 'Showing: All throws'; return; }
    if (selected.size === 0) { btn.textContent = 'Showing: nothing'; return; }
    const labels = categories.filter(c => selected.has(c.key)).map(c => c.label);
    btn.textContent = labels.length === 1 ? `Showing: ${labels[0]}` : `Showing: ${labels.length} filters`;
  }

  categories.forEach(cat => {
    const cb = el('input', { type: 'checkbox' }, []);
    cb.checked = cat.key === 'all';
    const row = el('label', { class: 'game-filter-row' }, [cb, document.createTextNode(cat.label)]);
    panel.appendChild(row);
    cbs[cat.key] = cb;
    cb.addEventListener('change', () => {
      if (cat.key === 'all') {
        if (cb.checked) {
          selected = new Set(['all']);
          categories.forEach(c => { if (c.key !== 'all') cbs[c.key].checked = false; });
        } else {
          selected.delete('all');
        }
      } else {
        if (cb.checked) {
          selected.add(cat.key);
          if (selected.has('all')) { selected.delete('all'); cbs.all.checked = false; }
        } else {
          selected.delete(cat.key);
        }
      }
      updateLabel();
      onChange(selected);
    });
  });

  updateLabel();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) panel.style.display = 'none';
  });

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  return wrap;
}

// ---------- Directions: rose diagram of which way a player likes to throw/receive ----------

const DIRECTION_BINS = 16;

// angle convention: 0 = straight toward the attacking endzone ("up"), increasing clockwise
function polarPoint(cx, cy, r, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

function computeDirectionBins(taggedPasses, role) {
  const bins = new Array(DIRECTION_BINS).fill(0);
  const binWidth = 360 / DIRECTION_BINS;
  taggedPasses.forEach(({ pass }) => {
    if (role === 'receiver' && pass.turnover) return; // can't "receive from a direction" on a drop/throwaway
    const dx = pass.endX - pass.startX;
    const dy = pass.endY - pass.startY;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;
    let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    // Round (not floor) so each bin is CENTRED on its labelled direction: bin 0
    // spans [-11.25°, 11.25°) around straight-up, not [0°, 22.5°). Otherwise the
    // cardinal labels sit on bin edges and a straight-upfield throw renders
    // pointing up-and-right, splitting near-identical throws across two wedges.
    const bin = Math.round(angle / binWidth) % DIRECTION_BINS;
    bins[bin] += 1;
  });
  return bins;
}

// One label per DIRECTION_BINS=16 wedge, in bin order (bin 0 is CENTRED on 0°
// = straight upfield, then clockwise -- see polarPoint's angle convention and
// the centred binning in computeDirectionBins).
const DIRECTION_BIN_LABELS = [
  'straight upfield', 'upfield, slightly right', 'upfield-right', 'right, slightly upfield',
  'straight right', 'right, slightly back', 'back-right', 'back, slightly right',
  'straight back (toward own endzone)', 'back, slightly left', 'back-left', 'left, slightly back',
  'straight left', 'left, slightly upfield', 'upfield-left', 'upfield, slightly left',
];

// labelPrefix names what's being counted ("Throws", "Receptions") for the
// hover tooltip; omit it where the chart's own caption already makes that
// clear (e.g. a single-purpose pair rose that's always throws).
function buildRoseChart(counts, size, color, labelPrefix) {
  const n = counts.length;
  const maxVal = Math.max(...counts, 1);
  const cx = size / 2, cy = size / 2;
  const outerMax = size / 2 - 4;
  const innerR = outerMax * 0.08;
  const gapDeg = 2;
  const binWidth = 360 / n;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: '100%', style: 'display:block;' });

  [0.25, 0.5, 0.75, 1].forEach(f => {
    svg.appendChild(svgEl('circle', {
      cx, cy, r: innerR + f * (outerMax - innerR), fill: 'none',
      style: 'stroke:rgba(var(--chalk-rgb),0.12);', 'stroke-width': 1,
    }));
  });
  // Grid spokes sit on the bin BOUNDARIES (half a bin off each centre), so they
  // fall between petals rather than skewering them.
  for (let i = 0; i < n; i++) {
    const [x, y] = polarPoint(cx, cy, outerMax, (i + 0.5) * binWidth);
    svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: x, y2: y, style: 'stroke:rgba(var(--chalk-rgb),0.08);', 'stroke-width': 1 }));
  }

  for (let i = 0; i < n; i++) {
    const val = counts[i];
    const r = innerR + (val / maxVal) * (outerMax - innerR);
    // Each wedge is centred on its bin's direction (i * binWidth), matching the
    // centred binning in computeDirectionBins and the cardinal labels.
    const a1 = i * binWidth - binWidth / 2 + gapDeg / 2;
    const a2 = i * binWidth + binWidth / 2 - gapDeg / 2;
    const p1 = polarPoint(cx, cy, r, a1);
    const p2 = polarPoint(cx, cy, r, a2);
    const p3 = polarPoint(cx, cy, innerR, a2);
    const p4 = polarPoint(cx, cy, innerR, a1);
    const d = `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 1 ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} A ${innerR} ${innerR} 0 0 0 ${p4[0]} ${p4[1]} Z`;
    const wedge = svgEl('path', { d, style: `fill:${color}; cursor:pointer;`, opacity: val > 0 ? 0.9 : 0.12 });
    const dirLabel = DIRECTION_BIN_LABELS[i] || `bin ${i}`;
    const tipText = `${labelPrefix ? labelPrefix + ', ' : ''}${dirLabel}: ${val} ${val === 1 ? 'pass' : 'passes'}`;
    wedge.addEventListener('mouseenter', (e) => showPassTooltip(e, tipText));
    wedge.addEventListener('mousemove', (e) => positionPassTooltip(e));
    wedge.addEventListener('mouseleave', hidePassTooltip);
    svg.appendChild(wedge);
  }
  return svg;
}

function buildDirectionsSection(players, gameIndices) {
  const wrap = el('div', {}, []);
  const grid = el('div', { class: 'impact-grid' }, []);
  players.forEach(p => {
    const thrown = gatherThrownPasses(p.player, gameIndices);
    const received = gatherReceivedPasses(p.player, gameIndices);
    const throwBins = computeDirectionBins(thrown, 'thrower');
    const receiveBins = computeDirectionBins(received, 'receiver');

    const card = el('div', { class: 'impact-card' }, []);
    card.appendChild(el('div', { class: 'impact-card-name' }, [document.createTextNode(p.player)]));
    const roseRow = el('div', { class: 'rose-row' }, []);
    const throwCol = el('div', { class: 'rose-col' }, [
      buildRoseChart(throwBins, 150, 'var(--chalk)', 'Throws'),
      el('div', { class: 'rose-label' }, [document.createTextNode('Throws')]),
    ]);
    const receiveCol = el('div', { class: 'rose-col' }, [
      buildRoseChart(receiveBins, 150, 'var(--chalk)', 'Receptions'),
      el('div', { class: 'rose-label' }, [document.createTextNode('Receptions')]),
    ]);
    roseRow.appendChild(throwCol);
    roseRow.appendChild(receiveCol);
    card.appendChild(roseRow);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

// ---------- Connections: dual Sankey of top-7 throwers-to and receivers-from ----------

function computeTopConnections(name, gameIndices) {
  const received = gatherReceivedPasses(name, gameIndices); // this player as receiver -> group by thrower
  const thrown = gatherThrownPasses(name, gameIndices);     // this player as thrower -> group by receiver

  function groupBy(list, keyFn) {
    const map = new Map();
    list.forEach(({ pass }) => {
      const key = keyFn(pass);
      if (!key) return;
      if (!map.has(key)) map.set(key, { name: key, completed: 0, incomplete: 0, total: 0 });
      const g = map.get(key);
      g.total += 1;
      if (pass.turnover) g.incomplete += 1; else g.completed += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 7);
  }

  return {
    throwers: groupBy(received, pa => pa.thrower),
    receivers: groupBy(thrown, pa => pa.receiver),
  };
}

function sankeyRibbonPath(x1, y1a, y1b, x2, y2a, y2b) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1a} C ${midX} ${y1a} ${midX} ${y2a} ${x2} ${y2a} L ${x2} ${y2b} C ${midX} ${y2b} ${midX} ${y1b} ${x1} ${y1b} Z`;
}

// centerName is the player this card is about -- needed so hover tooltips
// on the throwers (left) and receivers (right) sides can spell out the
// actual thrower -> receiver direction, not just name the other player.
function buildSankeyDiagram(throwers, receivers, centerName) {
  const W = 380, H = 260;
  const nodeW = 10;
  const leftX = 30, centerX = W / 2, rightX = W - 30 - nodeW;
  const gap = 6;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: 'display:block;' });

  function shortName(fullName) {
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length < 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  function layoutSide(list) {
    const total = list.reduce((s, x) => s + x.total, 0) || 1;
    let nodeCursor = 0, centerCursor = 0;
    return list.map(item => {
      const nodeH = (item.total / total) * (H - gap * (list.length - 1));
      const nodeY0 = nodeCursor, nodeY1 = nodeCursor + nodeH;
      nodeCursor += nodeH + gap;
      const centerH = (item.total / total) * H;
      const centerY0 = centerCursor, centerY1 = centerCursor + centerH;
      centerCursor += centerH;
      return Object.assign({}, item, { nodeY0, nodeY1, centerY0, centerY1 });
    });
  }

  function attachTip(node, text) {
    node.style.cursor = 'pointer';
    node.addEventListener('mouseenter', (e) => showPassTooltip(e, text));
    node.addEventListener('mousemove', (e) => positionPassTooltip(e));
    node.addEventListener('mouseleave', hidePassTooltip);
  }
  function addRibbon(d, color, title) {
    const g = svgEl('path', { d, style: `fill:${color};` , opacity: 0.6 });
    attachTip(g, title);
    svg.appendChild(g);
  }
  function addNodeAndLabel(x, y0, y1, name, labelAnchor, labelX, tipText) {
    const rect = svgEl('rect', { x, y: y0, width: nodeW, height: Math.max(0.5, y1 - y0), style: 'fill:rgba(var(--chalk-rgb),0.5);' });
    attachTip(rect, tipText);
    svg.appendChild(rect);
    const label = svgEl('text', {
      x: labelX, y: (y0 + y1) / 2, 'text-anchor': labelAnchor, 'dominant-baseline': 'middle',
      'font-size': 10, 'font-weight': 600, style: 'fill:var(--chalk);',
    });
    label.textContent = shortName(name);
    svg.appendChild(label);
  }

  svg.appendChild(svgEl('rect', { x: centerX - nodeW / 2, y: 0, width: nodeW, height: H, style: 'fill:var(--chalk);', opacity: 0.9 }));

  layoutSide(throwers).forEach(item => {
    // Label sits just inside the ribbon area (to the right of the left node),
    // not out past the diagram edge, so long names don't get clipped.
    const passWord = item.total === 1 ? 'pass' : 'passes';
    addNodeAndLabel(leftX, item.nodeY0, item.nodeY1, item.name, 'start', leftX + nodeW + 6,
      `${item.name} → ${centerName}: ${item.total} ${passWord} (${item.completed} completed, ${item.incomplete} incomplete)`);
    const frac = item.total ? item.completed / item.total : 0;
    const splitNodeY = item.nodeY0 + (item.nodeY1 - item.nodeY0) * frac;
    const splitCenterY = item.centerY0 + (item.centerY1 - item.centerY0) * frac;
    if (item.completed > 0) {
      addRibbon(sankeyRibbonPath(leftX + nodeW, item.nodeY0, splitNodeY, centerX - nodeW / 2, item.centerY0, splitCenterY),
        'var(--good)', `${item.name} → ${centerName}: ${item.completed} of ${item.total} ${passWord} completed`);
    }
    if (item.incomplete > 0) {
      addRibbon(sankeyRibbonPath(leftX + nodeW, splitNodeY, item.nodeY1, centerX - nodeW / 2, splitCenterY, item.centerY1),
        'var(--bad)', `${item.name} → ${centerName}: ${item.incomplete} of ${item.total} ${passWord} incomplete`);
    }
  });

  layoutSide(receivers).forEach(item => {
    // Same idea on the right: label sits just inside the ribbon area, to the
    // left of the right node.
    const passWord = item.total === 1 ? 'pass' : 'passes';
    addNodeAndLabel(rightX, item.nodeY0, item.nodeY1, item.name, 'end', rightX - 6,
      `${centerName} → ${item.name}: ${item.total} ${passWord} (${item.completed} completed, ${item.incomplete} incomplete)`);
    const frac = item.total ? item.completed / item.total : 0;
    const splitNodeY = item.nodeY0 + (item.nodeY1 - item.nodeY0) * frac;
    const splitCenterY = item.centerY0 + (item.centerY1 - item.centerY0) * frac;
    if (item.completed > 0) {
      addRibbon(sankeyRibbonPath(centerX + nodeW / 2, item.centerY0, splitCenterY, rightX, item.nodeY0, splitNodeY),
        'var(--good)', `${centerName} → ${item.name}: ${item.completed} of ${item.total} ${passWord} completed`);
    }
    if (item.incomplete > 0) {
      addRibbon(sankeyRibbonPath(centerX + nodeW / 2, splitCenterY, item.centerY1, rightX, splitNodeY, item.nodeY1),
        'var(--bad)', `${centerName} → ${item.name}: ${item.incomplete} of ${item.total} ${passWord} incomplete`);
    }
  });

  return svg;
}

function buildConnectionsSection(players, gameIndices) {
  const wrap = el('div', {}, []);
  const grid = el('div', { class: 'impact-grid connections-grid' }, []);
  players.forEach(p => {
    const { throwers, receivers } = computeTopConnections(p.player, gameIndices);
    const card = el('div', { class: 'impact-card' }, []);
    card.appendChild(el('div', { class: 'impact-card-name' }, [document.createTextNode(p.player)]));
    if (!throwers.length && !receivers.length) {
      card.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No connections recorded.')]));
    } else {
      card.appendChild(buildSankeyDiagram(throwers, receivers, p.player));
    }
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

function buildImpactSection(players, gameIndices) {
  const wrap = el('div', {}, []);
  const headerRow = el('div', { class: 'section-title-row' }, [el('span', {}, [document.createTextNode('Impact Map')])]);
  const grid = el('div', { class: 'impact-grid' }, []);

  const renderers = [];
  players.forEach(p => {
    const card = el('div', { class: 'impact-card' }, []);
    const nameEl = el('div', { class: 'impact-card-name' }, [document.createTextNode(`Thrower: ${p.player}`)]);
    card.appendChild(nameEl);
    const { svg, routeLayer } = buildPitch();
    card.appendChild(svg);
    grid.appendChild(card);
    renderers.push({ name: p.player, routeLayer, nameEl });
  });

  let categories = new Set(['all']);
  let role = 'thrower';

  function renderAll() {
    renderers.forEach(r => {
      r.nameEl.textContent = `${role === 'receiver' ? 'Receiver' : 'Thrower'}: ${r.name}`;
      const { passes, blocks } = computeImpactData(r.name, gameIndices, categories, role);
      renderPlayerImpact(r.routeLayer, passes, blocks);
    });
  }

  const impactControls = el('div', { class: 'controls-row' }, []);
  impactControls.appendChild(buildImpactCategoryDropdown((cats) => { categories = cats; renderAll(); }));
  impactControls.appendChild(buildToggle('Thrower', 'Receiver', (which) => {
    role = which === 'a' ? 'thrower' : 'receiver';
    renderAll();
  }));
  headerRow.appendChild(impactControls);
  wrap.appendChild(headerRow);
  wrap.appendChild(grid);
  wrap.appendChild(buildFieldLegend());
  renderAll();
  return wrap;
}

// Point-differential chart: point number on the x-axis, running score margin
// (our score - opponent score) on the y-axis, one dot per point plus a "game
// start" anchor at 0-0. Dots are colored by how that point was decided; the
// connecting line is a single neutral color so the color-coding stays on the dots.
// ---------- Per-game section: score bug, point log, box score ----------
function fmtPct(v) { return v == null ? '–' : `${v}%`; }

const GAME_LINE_MODES = [
  { key: 'combined', label: 'Combined' },
  { key: 'offense', label: 'Offensive points' },
  { key: 'defense', label: 'Defensive points' },
];

function buildGameSummary(summary) {
  const wrap = el('div', {}, []);
  const grid = el('div', { class: 'summary-grid' }, []);
  function card(label, value, sub) {
    const c = el('div', { class: 'summary-card' }, [
      el('div', { class: 'label' }, [document.createTextNode(label)]),
      el('div', { class: 'value' }, [document.createTextNode(value)]),
    ]);
    if (sub) c.appendChild(el('div', { class: 'sub' }, [document.createTextNode(sub)]));
    return c;
  }

  function renderMode(mode) {
    grid.innerHTML = '';
    const s = summary.lineStats[mode];
    grid.appendChild(card('Completions', `${s.throwCompletions}/${s.throws}`, fmtPct(s.throwCompletionPct)));
    grid.appendChild(card('Hucks', `${s.huckCompletions}/${s.huckAttempts}`, fmtPct(s.huckCompletionPct)));
    grid.appendChild(card('Blocks', String(s.blocks)));
    grid.appendChild(card('Opponent turns', String(s.opponentTurnovers)));
    grid.appendChild(card('Red zone', `${s.redZoneConversions}/${s.redZoneEntries}`, fmtPct(s.redZoneRate)));
  }
  renderMode('combined');

  wrap.appendChild(grid);
  wrap.appendChild(el('div', { class: 'eff-toggle-row' }, [buildSegToggle(GAME_LINE_MODES, renderMode)]));
  return wrap;
}

function buildDiffChart(points) {
  const W = 900, H = 170;
  const padL = 28, padR = 14, padT = 16, padB = 24;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const stripGap = 10, stripH = 14;
  const totalH = H + stripGap + stripH;

  const margins = [0];
  points.forEach(pt => {
    const ourAfter = pt.ourScoreBefore + (pt.result === 1 ? 1 : 0);
    const oppAfter = pt.oppScoreBefore + (pt.result === -1 ? 1 : 0);
    margins.push(ourAfter - oppAfter);
  });
  const minM = Math.min(0, ...margins);
  const maxM = Math.max(0, ...margins);
  const span = (maxM - minM) || 1;
  const nodeCount = margins.length;

  const xFor = i => padL + (nodeCount > 1 ? (i / (nodeCount - 1)) * innerW : innerW / 2);
  const yFor = m => padT + (maxM - m) / span * innerH;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${totalH}`, width: '100%', style: 'display:block;' });

  const zeroY = yFor(0);
  svg.appendChild(svgEl('line', { x1: padL, y1: zeroY, x2: W - padR, y2: zeroY, style: 'stroke:rgba(var(--chalk-rgb),0.25);', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
  [0, minM, maxM].filter((v, i, arr) => arr.indexOf(v) === i).forEach(v => {
    const y = yFor(v);
    const t = svgEl('text', { x: padL - 6, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 9, style: 'fill:var(--chalk-dim);', 'font-family': 'ui-monospace, monospace' });
    t.textContent = (v > 0 ? '+' : '') + v;
    svg.appendChild(t);
  });

  // Each segment is coloured by how the point it leads INTO was decided:
  // green if we got a break, red if we were broken, neutral for a hold either
  // way -- so momentum swings jump out.
  for (let i = 1; i < nodeCount; i++) {
    const pt = points[i - 1];
    let segColor = 'rgba(var(--chalk-rgb),0.45)';
    if (pt.isOffense && pt.result === -1) segColor = 'var(--bad)';        // broken
    else if (!pt.isOffense && pt.result === 1) segColor = 'var(--good)';  // break
    svg.appendChild(svgEl('line', {
      x1: xFor(i - 1), y1: yFor(margins[i - 1]), x2: xFor(i), y2: yFor(margins[i]),
      style: `stroke:${segColor};`, 'stroke-width': 2.5, 'stroke-linecap': 'round',
    }));
  }

  const labelEvery = points.length <= 12 ? 1 : points.length <= 24 ? 2 : Math.ceil(points.length / 12);
  points.forEach((pt, idx) => {
    const i = idx + 1;
    if (idx % labelEvery !== 0 && idx !== points.length - 1) return;
    const t = svgEl('text', { x: xFor(i), y: H - padB + 14, 'text-anchor': 'middle', 'font-size': 8.5, style: 'fill:var(--chalk-dim);', 'font-family': 'ui-monospace, monospace' });
    t.textContent = String(pt.number);
    svg.appendChild(t);
  });

  // "Game start" anchor at 0-0
  const startG = svgEl('g', {});
  startG.appendChild(svgEl('circle', { cx: xFor(0), cy: yFor(0), r: 4, style: 'fill:var(--chalk-dim);', opacity: 0.6 }));
  const startTitle = svgEl('title', {});
  startTitle.textContent = 'Game start (0–0)';
  startG.appendChild(startTitle);
  svg.appendChild(startG);

  const dotsByNumber = new Map();
  points.forEach((pt, idx) => {
    const i = idx + 1;
    const cx = xFor(i), cy = yFor(margins[i]);
    let color = 'var(--chalk-dim)'; // hold, or opponent holding serve on us -- both "expected", no break either way
    if (pt.isOffense && pt.result === 1) color = 'var(--chalk-dim)';  // hold
    else if (pt.isOffense && pt.result === -1) color = 'var(--bad)';  // broken
    else if (!pt.isOffense && pt.result === 1) color = 'var(--good)'; // break
    const g = svgEl('g', { style: 'cursor:pointer;' });
    const halo = svgEl('circle', { cx, cy, r: 11, fill: 'none', style: 'stroke:var(--chalk);', 'stroke-width': 2, opacity: 0 });
    const dot = svgEl('circle', { cx, cy, r: 6, style: `fill:${color};stroke:var(--ink);`, 'stroke-width': 1.2 });
    const hit = svgEl('circle', { cx, cy, r: 13, fill: 'transparent' });
    const title = svgEl('title', {});
    const marginLabel = margins[i] > 0 ? `+${margins[i]}` : String(margins[i]);
    title.textContent = `Point ${pt.number} \u00b7 ${pt.isOffense ? 'Offense' : 'Defense'} \u00b7 ${pt.scored ? 'Scored' : 'Conceded'} \u00b7 margin ${marginLabel}`;
    hit.appendChild(title);
    g.appendChild(halo);
    g.appendChild(dot);
    g.appendChild(hit);
    svg.appendChild(g);
    dotsByNumber.set(pt.number, { halo, hit });
  });

  // Leverage strip: one colored segment per point, same low->high scale as
  // the point log's leverage badge and the Thrower-Receiver heatmap, so the
  // moments that mattered most to the outcome are visible at a glance below
  // the margin line itself (a separate strip rather than a second y-axis,
  // since leverage and score margin aren't the same unit).
  const colW = nodeCount > 1 ? innerW / (nodeCount - 1) : innerW;
  const stripY = H + stripGap;
  points.forEach((pt, idx) => {
    const i = idx + 1;
    const cx = xFor(i);
    const lv = pt.leverage || 0;
    const rect = svgEl('rect', {
      x: cx - colW / 2, y: stripY, width: Math.max(1, colW - 1), height: stripH,
      style: `fill:${heatmapColorForT(lv / 10)};`,
    });
    const title = svgEl('title', {});
    title.textContent = `Point ${pt.number} · Leverage ${lv.toFixed(1)}`;
    rect.appendChild(title);
    svg.appendChild(rect);
  });

  return { svg, dotsByNumber };
}

function buildGameSection(game, index) {
  const section = el('section', { class: 'view', id: 'game-' + index }, []);
  const eyebrow = el('p', { class: 'eyebrow' }, [document.createTextNode(game.dateDisplay + ' \u00b7 ' + (game.result === 'W' ? 'Win' : game.result === 'L' ? 'Loss' : 'Tie'))]);
  section.appendChild(eyebrow);
  const bug = el('div', { class: 'score-bug' }, [
    el('div', { class: 'side' }, [
      el('div', { class: 'label' }, [document.createTextNode(REPORT.teamName)]),
      el('div', { class: 'num us' }, [document.createTextNode(String(game.ourScore))]),
    ]),
    el('div', { class: 'dash' }, [document.createTextNode('\u2013')]),
    el('div', { class: 'side' }, [
      el('div', { class: 'label' }, [document.createTextNode(game.opponent)]),
      el('div', { class: 'num' }, [document.createTextNode(String(game.oppScore))]),
    ]),
    el('span', { class: 'badge ' + game.result }, [document.createTextNode(game.result === 'W' ? 'WIN' : game.result === 'L' ? 'LOSS' : 'TIE')]),
  ]);
  section.appendChild(bug);

  // "Watch" link from the Set up tab's per-game video URL. The URL lives in
  // localStorage and can be set after this page was built, so it's refreshed
  // on every visit alongside the point-log Line column (see below).
  const watchLink = el('a', { class: 'game-watch-link', target: '_blank', rel: 'noopener noreferrer' }, [document.createTextNode('▶ Watch game')]);
  const watchWrap = el('div', { class: 'game-watch-wrap' }, [watchLink]);
  watchWrap.style.display = 'none';
  section.appendChild(watchWrap);
  function refreshVideoLink() {
    const url = loadSetupData().videoLinks[index];
    if (url) { watchLink.href = url; watchWrap.style.display = ''; }
    else { watchLink.removeAttribute('href'); watchWrap.style.display = 'none'; }
  }

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Summary Statistics')]));
  section.appendChild(buildGameSummary(game.summary));

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Scoring Efficiency')]));
  section.appendChild(buildScoringEfficiencyWidget(game.summary.scoringEfficiency));

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Point differential')]));
  const diffChart = buildDiffChart(game.points);
  const diffWrap = el('div', { class: 'diff-chart-wrap' }, [diffChart.svg]);
  section.appendChild(diffWrap);
  section.appendChild(el('div', { class: 'diff-legend' }, [
    el('span', { class: 'item' }, [el('span', { class: 'swatch', style: 'background:var(--chalk-dim);' }, []), document.createTextNode('Hold')]),
    el('span', { class: 'item' }, [el('span', { class: 'swatch', style: 'background:var(--bad);' }, []), document.createTextNode('Broken')]),
    el('span', { class: 'item' }, [el('span', { class: 'swatch', style: 'background:var(--good);' }, []), document.createTextNode('Break')]),
  ]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [
    document.createTextNode('The colored strip below the chart is each point’s Leverage. The closer to 10 (more gold/amber) the more critical the point to the outcome of the game.'),
  ]));
  game.points.forEach(pt => {
    const entry = diffChart.dotsByNumber.get(pt.number);
    if (entry) entry.hit && entry.hit.addEventListener('click', () => selectPoint(pt, rowByNumber.get(pt.number)));
  });

  const grid = el('div', { class: 'game-grid' }, []);
  // Third column: the selected point's video-tagged events. The whole column is
  // hidden (and the grid falls back to two columns) until this game has some
  // film tagged, so an untagged game looks exactly as it did before -- but once
  // any of it is tagged the column stays put, and points without tags show a
  // quiet placeholder rather than making the diagram jump between layouts.
  const filmWrap = el('div', { class: 'film-strip' }, []);
  filmWrap.style.display = 'none';
  const logWrap = el('div', {}, []);
  const logHeader = el('div', { class: 'point-row point-log-header' }, [
    el('span', { class: 'pnum' }, [document.createTextNode('#')]),
    el('span', { class: 'pscore' }, [document.createTextNode('Score')]),
    el('div', { class: 'pdetail' }, [document.createTextNode('Result')]),
    el('span', { class: 'presult-head' }, [document.createTextNode('Type')]),
    el('span', { class: 'pline' }, [document.createTextNode('Line')]),
    el('span', { class: 'pleverage-head' }, [document.createTextNode('Leverage')]),
  ]);
  const log = el('div', { class: 'point-log' }, [logHeader]);
  logWrap.appendChild(log);
  const pitchWrap = el('div', { class: 'pitch-wrap' }, []);
  const { svg, routeLayer } = buildPitch();
  const possTabs = el('div', { class: 'poss-tabs' }, []);
  pitchWrap.appendChild(possTabs);
  pitchWrap.appendChild(svg);
  const caption = el('p', { class: 'pitch-caption' }, [document.createTextNode('Select a point to see its passes and blocks.')]);
  pitchWrap.appendChild(caption);
  const lineupLabel = el('p', { class: 'lineup-label' }, [document.createTextNode('On the field (points played this game)')]);
  const lineupRow = el('div', { class: 'lineup-row' }, []);
  lineupLabel.style.display = 'none';
  pitchWrap.appendChild(lineupLabel);
  pitchWrap.appendChild(lineupRow);
  pitchWrap.appendChild(buildFieldLegend());
  pitchWrap.appendChild(el('p', { class: 'kbd-hint' }, [document.createTextNode('Tip: use ← / → to step through points (and possessions).')]));

  // Flattened step sequence for arrow-key navigation: one step per possession
  // for multi-possession points (in order), one step for everything else.
  const steps = [];
  game.points.forEach(pt => {
    const possNums = possessionsInPoint(pt);
    if (possNums.length > 1) possNums.forEach(num => steps.push({ pt, poss: num }));
    else steps.push({ pt, poss: null });
  });
  let currentStep = 0;
  const rowByNumber = new Map();
  let selectedDotEntry = null;
  let selectedPoint = null;

  // Renders the selected point's tagged events under the diagram: one compact
  // line each, in the order they happened, deep-linking to the moment in the
  // game video where a timestamp was recorded. Nothing renders at all when the
  // point has no tags -- the common case before a game has been worked through.
  function renderFilm(pt) {
    filmWrap.innerHTML = '';
    const rows = pt ? pointFilmRows(pt) : [];
    const vid = parseYouTubeId(loadSetupData().videoLinks[index]);
    const stamps = rows.map(r => r.rec.timestamp).filter(t => t != null);
    const earliest = stamps.length ? Math.min.apply(null, stamps) : null;

    const head = el('div', { class: 'film-head' }, [
      el('span', { class: 'film-title' }, [document.createTextNode('Tagged events')]),
    ]);
    if (!rows.length) {
      filmWrap.appendChild(head);
      filmWrap.appendChild(el('p', { class: 'film-empty' }, [document.createTextNode('Nothing tagged for this point yet.')]));
      return;
    }
    head.appendChild(el('span', { class: 'film-count' }, [document.createTextNode(String(rows.length))]));
    // One link straight to where the point starts on the video -- the earliest
    // timestamp anyone recorded in it.
    if (vid && earliest != null) {
      head.appendChild(el('a', {
        class: 'film-watch', href: youtubeTimestampUrl(vid, earliest),
        target: '_blank', rel: 'noopener noreferrer',
      }, [document.createTextNode('▶ Watch point (' + formatTimestamp(earliest) + ')')]));
    }
    filmWrap.appendChild(head);

    const list = el('div', { class: 'film-list' }, []);
    rows.forEach(({ ev, rec }) => {
      const d = filmEventDescriptor(ev, rec);
      const parts = [
        el('span', { class: 'film-kind film-kind-' + ev.kind }, [document.createTextNode(d.kind)]),
        el('span', { class: 'film-main' }, [document.createTextNode(d.main)]),
      ];
      if (d.tags.length) parts.push(el('span', { class: 'film-tags' }, [document.createTextNode(d.tags.join(' · '))]));
      if (rec.notes) parts.push(el('span', { class: 'film-note' }, [document.createTextNode('“' + rec.notes + '”')]));
      if (rec.timestamp != null) {
        parts.push(vid
          ? el('a', { class: 'film-ts', href: youtubeTimestampUrl(vid, rec.timestamp), target: '_blank', rel: 'noopener noreferrer' },
              [document.createTextNode('▶ ' + formatTimestamp(rec.timestamp))])
          : el('span', { class: 'film-ts film-ts-plain' }, [document.createTextNode(formatTimestamp(rec.timestamp))]));
      }
      list.appendChild(el('div', { class: 'film-row' }, parts));
    });
    filmWrap.appendChild(list);
  }

  function selectPoint(pt, rowEl, forcedFocus) {
    log.querySelectorAll('.point-row').forEach(r => r.classList.remove('selected'));
    if (rowEl) rowEl.classList.add('selected');
    selectedPoint = pt;
    renderFilm(pt);

    if (selectedDotEntry) selectedDotEntry.halo.setAttribute('opacity', 0);
    const dotEntry = diffChart.dotsByNumber.get(pt.number);
    if (dotEntry) { dotEntry.halo.setAttribute('opacity', 1); selectedDotEntry = dotEntry; }

    const possNums = possessionsInPoint(pt);
    possTabs.innerHTML = '';
    let resolvedFocus = null;
    if (possNums.length > 1) {
      possTabs.style.display = 'flex';
      // Mouse clicks on a point row default to the possession that decided it;
      // keyboard navigation passes an explicit forcedFocus (starting at the first).
      resolvedFocus = forcedFocus != null ? forcedFocus : possNums[possNums.length - 1];
      const buttons = possNums.map(num => {
        const btn = el('button', { class: 'poss-tab' + (num === resolvedFocus ? ' active' : ''), type: 'button' }, [document.createTextNode('Poss ' + num)]);
        btn.addEventListener('click', () => {
          resolvedFocus = num;
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderPoint(routeLayer, pt, resolvedFocus);
          currentStep = steps.findIndex(s => s.pt === pt && s.poss === resolvedFocus);
        });
        possTabs.appendChild(btn);
        return btn;
      });
      renderPoint(routeLayer, pt, resolvedFocus);
    } else {
      possTabs.style.display = 'none';
      renderPoint(routeLayer, pt, null);
    }
    currentStep = steps.findIndex(s => s.pt === pt && s.poss === resolvedFocus);

    lineupRow.innerHTML = '';
    if (pt.lineup && pt.lineup.length) {
      lineupLabel.style.display = 'block';
      pt.lineup.forEach(p => {
        const chip = el('div', { class: 'lineup-chip', title: `${p.player}: ${p.pointsThrough} point${p.pointsThrough === 1 ? '' : 's'} played this game (through this point)` }, [
          document.createTextNode(p.player + ' '),
          el('span', { class: 'count' }, [document.createTextNode(String(p.pointsThrough))]),
        ]);
        lineupRow.appendChild(chip);
      });
    } else {
      lineupLabel.style.display = 'none';
    }

    const parts = [];
    if (pt.goal) parts.push(`<b>${pt.goal}</b> scored`);
    if (pt.assist) parts.push(`assist ${pt.assist}`);
    if (pt.secondaryAssist) parts.push(`2nd assist ${pt.secondaryAssist}`);
    caption.innerHTML = `Point ${pt.number} \u00b7 ${pt.isOffense ? 'Offense' : 'Defense'} \u00b7 ${pt.scored ? 'Scored' : 'Conceded'}` + (parts.length ? ' \u2014 ' + parts.join(', ') : '');
  }

  function goToStep(newIdx) {
    if (newIdx < 0 || newIdx >= steps.length) return;
    const { pt, poss } = steps[newIdx];
    const rowEl = rowByNumber.get(pt.number);
    selectPoint(pt, rowEl, poss);
    if (rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('keydown', (e) => {
    if (!section.classList.contains('active')) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goToStep(currentStep + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goToStep(currentStep - 1); }
  });

  // "Line" column: which curated line (Line Analysis) this point belongs to,
  // if any. Lines live in localStorage and can be created/edited *after*
  // this page was already built, so each row's label is refreshed on every
  // visit via gameViewRefreshers rather than only computed once here.
  const lineCells = []; // { key, el }
  function refreshLineColumn() {
    const lines = loadLinesData().lines;
    const nameByKey = new Map();
    lines.forEach(l => l.pointKeys.forEach(k => nameByKey.set(k, l.name)));
    lineCells.forEach(({ key, el: cellEl }) => {
      const name = nameByKey.get(key) || '—';
      cellEl.textContent = name;
      cellEl.title = name === '—' ? 'No curated line assigned to this point yet (see Line Analysis)' : `Line: ${name}`;
    });
  }
  // A dim ▶ on any point that has tagged film, so you can spot what's been
  // covered without opening each one. Like the Line column, tags can arrive
  // after this page was built, so it's recomputed on every visit.
  const filmMarks = []; // { pt, el }
  function refreshFilmMarks() {
    let gameHasFilm = false;
    filmMarks.forEach(({ pt, el: markEl }) => {
      const n = pointFilmRows(pt).length;
      if (n) gameHasFilm = true;
      markEl.textContent = n ? '▶' : '';
      markEl.title = n ? `${n} tagged film event${n === 1 ? '' : 's'} in this point` : '';
    });
    // The third column only exists once this game has film -- otherwise the
    // grid stays two-column exactly as it was before tagging existed.
    grid.classList.toggle('has-film', gameHasFilm);
    filmWrap.style.display = gameHasFilm ? '' : 'none';
    renderFilm(selectedPoint);
  }
  gameViewRefreshers.set(section.id, () => { refreshLineColumn(); refreshVideoLink(); refreshFilmMarks(); });

  game.points.forEach((pt, i) => {
    let title;
    if (pt.result === 1) {
      if (pt.isOffense) {
        const hadTurnover = (pt.passes || []).some(p => p.turnover);
        title = hadTurnover ? 'Dirty hold' : 'Clean hold';
      } else {
        title = 'Break';
      }
    } else if (pt.result === -1) {
      title = pt.isOffense ? 'Broken' : 'Opp hold';
    } else {
      title = 'No score';
    }

    // Leverage (0-10): how much this specific point's outcome could swing the
    // game's eventual result -- 10 is a true double-game-point. A colored dot
    // (the same sequential scale as the Thrower-Receiver heatmap) carries the
    // magnitude so the number itself can stay in plain, always-legible ink.
    const leverageDot = el('span', {
      class: 'pleverage-dot', style: `background:${heatmapColorForT((pt.leverage || 0) / 10)};`,
    }, []);
    const leverageBadge = el('span', {
      class: 'pleverage',
      title: 'Leverage: how much this point could swing the game\u2019s outcome (0\u201310, 10 = double game point)',
    }, [leverageDot, document.createTextNode((pt.leverage != null ? pt.leverage.toFixed(1) : '\u2014'))]);

    const lineSpan = el('span', { class: 'pline' }, [document.createTextNode('\u2014')]);
    lineCells.push({ key: pointKey(index, pt.number), el: lineSpan });

    const filmMark = el('span', { class: 'pfilm' }, []);
    filmMarks.push({ pt, el: filmMark });

    const row = el('div', { class: 'point-row', tabindex: '0', role: 'button' }, [
      el('span', { class: 'pnum' }, [document.createTextNode('#' + pt.number), filmMark]),
      el('span', { class: 'pscore' }, [document.createTextNode(pt.ourScoreBefore + '-' + pt.oppScoreBefore)]),
      el('div', { class: 'pdetail' }, [
        el('span', { class: 'goal' }, [document.createTextNode(title)]),
      ]),
      el('span', { class: 'presult badge ' + (pt.scored ? 'W' : 'L') }, [document.createTextNode(pt.isOffense ? 'O' : 'D')]),
      lineSpan,
      leverageBadge,
    ]);
    row.addEventListener('click', () => selectPoint(pt, row));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPoint(pt, row); } });
    rowByNumber.set(pt.number, row);
    log.appendChild(row);
    if (i === 0) requestAnimationFrame(() => selectPoint(pt, row));
  });
  refreshLineColumn();
  refreshVideoLink();
  refreshFilmMarks();

  grid.appendChild(logWrap);
  grid.appendChild(pitchWrap);
  grid.appendChild(filmWrap);
  section.appendChild(grid);

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Clutch Efficiency')]));
  section.appendChild(buildClutchEfficiencyWidget(game.summary.clutchEfficiency));

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Box score')]));
  section.appendChild(buildStatsTable(game.boxScore, STAT_COLUMNS, 'pointsPlayed', `${slug(game.opponent)}_${slug(game.dateDisplay)}_box_score.csv`));

  return section;
}

// Raw, summable per-player fields carried on each game's boxScore rows.
// Percentages are always re-derived from these sums, never averaged directly,
// so filtering to a subset of games stays mathematically correct.
// ---------- Shared widgets: season aggregation, game filters, toggles, scoring-efficiency gauges ----------
const SEASON_RAW_FIELDS = [
  'pointsPlayed', 'highLeveragePointsPlayed', 'offensePlayed', 'defensePlayed', 'offenseWon', 'defenseWon', 'touches',
  'throws', 'throwCompletions', 'catches', 'receivingTargets', 'possessionsInitiated',
  'assists', 'secondaryAssists', 'assistAttempts', 'goals', 'plusMinus', 'turnovers',
  'throwerErrors', 'receiverErrors', 'blocks', 'stallsFor', 'stallsAgainst',
  'huckAttempts', 'huckCompletions', 'huckTargets', 'huckReceptions', 'assistReceptionAttempts',
  'utilQualifyingPoints', 'utilTouchedPoints',
  'defTurnoverPoints', 'turnoverRecoveryDenom', 'turnoverRecoveryNumer',
  'throwDist', 'throwGain', 'catchDist', 'catchGain', 'throwIncompleteDist', 'catchIncompleteDist',
];

function pctOrNull(numer, denom) {
  return denom ? Math.round((100 * numer / denom) * 100) / 100 : null;
}

function aggregateSeasonStats(gameIndices) {
  const acc = new Map();
  gameIndices.forEach(gi => {
    const game = REPORT.games[gi];
    (game.boxScore || []).forEach(row => {
      let a = acc.get(row.playerUUID);
      if (!a) {
        a = { playerUUID: row.playerUUID, player: row.player, gamesPlayed: 0 };
        SEASON_RAW_FIELDS.forEach(f => { a[f] = 0; });
        acc.set(row.playerUUID, a);
      }
      SEASON_RAW_FIELDS.forEach(f => { a[f] += row[f] || 0; });
      a.gamesPlayed += 1;
    });
  });
  const rows = [...acc.values()].map(a => {
    a.throwCompletionPct = pctOrNull(a.throwCompletions, a.throws);
    // Excludes thrower errors from the denominator -- see the matching
    // comment in stats.py's _build_box_score for why catches + receiverErrors
    // already is "targets that weren't the thrower's mistake."
    a.catchCompletionPct = pctOrNull(a.catches, a.catches + a.receiverErrors);
    a.huckCompletionPct = pctOrNull(a.huckCompletions, a.huckAttempts);
    a.assistCompletionPct = pctOrNull(a.assists, a.assistAttempts);
    a.huckReceptionPct = pctOrNull(a.huckReceptions, a.huckTargets);
    a.assistReceptionPct = pctOrNull(a.goals, a.assistReceptionAttempts);
    a.offensiveUtilization = pctOrNull(a.utilTouchedPoints, a.utilQualifyingPoints);
    a.totalScoringEfficiency = pctOrNull(a.offenseWon + a.defenseWon, a.pointsPlayed);
    a.offensiveScoringEfficiency = pctOrNull(a.offenseWon, a.offensePlayed);
    a.defensiveScoringEfficiency = pctOrNull(a.defenseWon, a.defensePlayed);
    a.defensiveTurnoverEfficiency = pctOrNull(a.defTurnoverPoints, a.defensePlayed);
    a.pointRecovery = pctOrNull(a.turnoverRecoveryNumer, a.turnoverRecoveryDenom);
    return a;
  });
  rows.sort((r1, r2) => r2.pointsPlayed - r1.pointsPlayed);
  return rows;
}

// Games filter used everywhere in the report. Games are grouped by the
// tournaments configured on the Set up tab (getTournaments), with an
// "Unassigned" group for the rest; a group checkbox toggles all its games at
// once, while individual game checkboxes still work one at a time. The
// onChange contract is unchanged -- it always receives a sorted array of the
// selected game indices -- so every call site is tournament-aware for free.
function buildGameFilterDropdown(onChange) {
  const wrap = el('div', { class: 'game-filter' }, []);
  const btn = el('button', { class: 'game-filter-btn', type: 'button' }, []);
  const panel = el('div', { class: 'game-filter-panel' }, []);
  panel.style.display = 'none';
  let selected = new Set(REPORT.games.map((g, i) => i));

  const tournaments = getTournaments();
  const unassigned = unassignedGameIndices(tournaments);
  // Build display groups: each configured tournament, then Unassigned (only
  // if it has any games). When there are no tournaments at all, this is a
  // single "Unassigned" group holding every game -- i.e. a flat list.
  const groups = tournaments
    .map(t => ({ label: t.label, indices: t.gameIndices }))
    .filter(g => g.indices.length);
  if (unassigned.length) groups.push({ label: tournaments.length ? 'Unassigned' : 'All games', indices: unassigned });

  const gameCbByIndex = new Map();
  const groupControls = [];

  function updateLabel() {
    btn.textContent = selected.size === REPORT.games.length
      ? `Games: All (${REPORT.games.length})`
      : `Games: ${selected.size} of ${REPORT.games.length}`;
  }
  function syncGroupState() {
    groupControls.forEach(gc => {
      const n = gc.indices.filter(i => selected.has(i)).length;
      gc.cb.checked = n === gc.indices.length;
      gc.cb.indeterminate = n > 0 && n < gc.indices.length;
    });
  }
  function emit() { updateLabel(); syncGroupState(); onChange([...selected].sort((a, b) => a - b)); }

  const selectAllCb = el('input', { type: 'checkbox' }, []);
  selectAllCb.checked = true;
  panel.appendChild(el('label', { class: 'game-filter-row' }, [selectAllCb, document.createTextNode('Select all')]));
  panel.appendChild(el('div', { class: 'game-filter-sep' }, []));
  selectAllCb.addEventListener('change', () => {
    if (selectAllCb.checked) { selected = new Set(REPORT.games.map((g, i) => i)); }
    else { selected = new Set(); }
    selectAllCb.indeterminate = false;
    gameCbByIndex.forEach((cb, i) => { cb.checked = selected.has(i); });
    emit();
  });

  groups.forEach(group => {
    const groupCb = el('input', { type: 'checkbox' }, []);
    groupCb.checked = true;
    const groupRow = el('label', { class: 'game-filter-row game-filter-group' }, [
      groupCb, document.createTextNode(`${group.label} (${group.indices.length})`),
    ]);
    panel.appendChild(groupRow);
    groupControls.push({ cb: groupCb, indices: group.indices });
    groupCb.addEventListener('change', () => {
      group.indices.forEach(i => { if (groupCb.checked) selected.add(i); else selected.delete(i); });
      group.indices.forEach(i => { gameCbByIndex.get(i).checked = groupCb.checked; });
      selectAllCb.checked = selected.size === REPORT.games.length;
      selectAllCb.indeterminate = selected.size > 0 && selected.size < REPORT.games.length;
      emit();
    });

    group.indices.forEach(i => {
      const g = REPORT.games[i];
      const cb = el('input', { type: 'checkbox' }, []);
      cb.checked = true;
      panel.appendChild(el('label', { class: 'game-filter-row game-filter-game' }, [cb, document.createTextNode(`vs ${g.opponent} (${g.dateDisplay})`)]));
      gameCbByIndex.set(i, cb);
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(i); else selected.delete(i);
        selectAllCb.checked = selected.size === REPORT.games.length;
        selectAllCb.indeterminate = selected.size > 0 && selected.size < REPORT.games.length;
        emit();
      });
    });
  });

  updateLabel();
  syncGroupState();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) panel.style.display = 'none';
  });

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  return wrap;
}

function zeroPlayerRow(name) {
  const r = { player: name, playerUUID: null, gamesPlayed: 0 };
  SEASON_RAW_FIELDS.forEach(f => { r[f] = 0; });
  r.throwCompletionPct = null;
  r.catchCompletionPct = null;
  r.huckCompletionPct = null;
  r.assistCompletionPct = null;
  r.huckReceptionPct = null;
  r.assistReceptionPct = null;
  r.offensiveUtilization = null;
  r.totalScoringEfficiency = null;
  r.offensiveScoringEfficiency = null;
  r.defensiveScoringEfficiency = null;
  r.defensiveTurnoverEfficiency = null;
  r.pointRecovery = null;
  return r;
}

function buildToggle(labelA, labelB, onChange) {
  const wrap = el('div', { class: 'seg-toggle' }, []);
  const btnA = el('button', { class: 'seg-btn active', type: 'button' }, [document.createTextNode(labelA)]);
  const btnB = el('button', { class: 'seg-btn', type: 'button' }, [document.createTextNode(labelB)]);
  btnA.addEventListener('click', () => {
    if (btnA.classList.contains('active')) return;
    btnA.classList.add('active'); btnB.classList.remove('active');
    onChange('a');
  });
  btnB.addEventListener('click', () => {
    if (btnB.classList.contains('active')) return;
    btnB.classList.add('active'); btnA.classList.remove('active');
    onChange('b');
  });
  wrap.appendChild(btnA);
  wrap.appendChild(btnB);
  return wrap;
}

// Generalized version of buildToggle for more than two options. activeKey
// sets which option starts selected (default: the first) -- needed anywhere
// the toggle gets rebuilt by a re-render but its state lives outside it.
function buildSegToggle(options, onChange, activeKey) {
  const wrap = el('div', { class: 'seg-toggle' }, []);
  const activeIdx = Math.max(0, options.findIndex(o => o.key === activeKey));
  const btns = options.map((opt, i) => {
    const btn = el('button', { class: 'seg-btn' + (i === activeIdx ? ' active' : ''), type: 'button' }, [document.createTextNode(opt.label)]);
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(opt.key);
    });
    wrap.appendChild(btn);
    return btn;
  });
  return wrap;
}

const SCORING_EFF_GAUGES = [
  { key: 'total', label: 'Total Scoring Efficiency' },
  { key: 'offense', label: 'Offensive Scoring Efficiency' },
  { key: 'defense', label: 'Defensive Scoring Efficiency' },
];
const SCORING_EFF_MODES = [
  { key: 'perPoint', label: 'Per Point' },
  { key: 'perPossession', label: 'Per Possession' },
  { key: 'firstPossession', label: 'First Possession' },
];

// Three ring gauges (Total/Offensive/Defensive scoring efficiency) with a
// Per Point / Per Possession / First Possession toggle underneath. Each ring is
// a CSS conic-gradient "donut" (simpler and more reliable for centered
// two-line text than hand-rolled SVG arc math).
function buildScoringEfficiencyWidget(scoringEfficiency) {
  const wrap = el('div', { class: 'eff-widget' }, []);
  const gaugesWrap = el('div', { class: 'eff-gauges' }, []);

  const rings = SCORING_EFF_GAUGES.map(def => {
    const pctEl = el('div', { class: 'eff-pct' }, []);
    const fracEl = el('div', { class: 'eff-frac' }, []);
    const inner = el('div', { class: 'eff-ring-inner' }, [pctEl, fracEl]);
    const ring = el('div', { class: 'eff-ring' }, [inner]);
    const gauge = el('div', { class: 'eff-gauge' }, [ring, el('div', { class: 'eff-label' }, [document.createTextNode(def.label)])]);
    gaugesWrap.appendChild(gauge);
    return { key: def.key, ring, pctEl, fracEl };
  });

  function renderMode(mode) {
    const data = scoringEfficiency[mode];
    rings.forEach(r => {
      const d = data[r.key];
      const pctVal = d.pct;
      r.ring.style.setProperty('--pct', pctVal == null ? 0 : pctVal);
      r.pctEl.textContent = pctVal == null ? '–' : `${Math.round(pctVal)}%`;
      r.fracEl.textContent = `${d.numer}/${d.denom}`;
    });
  }
  renderMode('perPoint');

  wrap.appendChild(gaugesWrap);
  wrap.appendChild(el('div', { class: 'eff-toggle-row' }, [buildSegToggle(SCORING_EFF_MODES, renderMode)]));
  return wrap;
}

// Clutch Efficiency: hold rate / break rate / total scoring efficiency,
// split into high-leverage points (Leverage >= 7, i.e. the moments closest
// to deciding the game) vs. everything else -- built with buildComparisonTable
// (below) by treating the two leverage buckets as if they were two "players".
const CLUTCH_EFFICIENCY_ROWS = [
  { label: 'Points', get: b => b.pointCount },
  { label: 'Hold rate', main: b => fmtPct(b.holdRate.pct), sub: b => `${b.holdRate.numer}/${b.holdRate.denom}` },
  { label: 'Break rate', main: b => fmtPct(b.breakRate.pct), sub: b => `${b.breakRate.numer}/${b.breakRate.denom}` },
  { label: 'Total scoring efficiency', main: b => fmtPct(b.totalScoringEfficiency.pct), sub: b => `${b.totalScoringEfficiency.numer}/${b.totalScoringEfficiency.denom}` },
];
function buildClutchEfficiencyWidget(clutchEfficiency) {
  const wrap = el('div', {}, []);
  const buckets = [
    { name: 'High-leverage (≥ 7)', ...clutchEfficiency.highLeverage },
    { name: 'Low-leverage (< 7)', ...clutchEfficiency.lowLeverage },
  ];
  wrap.appendChild(buildComparisonTable(CLUTCH_EFFICIENCY_ROWS, buckets, 'name', { mobileCards: true }));
  wrap.appendChild(el('p', { class: 'pitch-caption' }, [
    document.createTextNode('High-leverage points are those with Leverage ≥ 7 (0–10 scale) -- close to a coin flip on the game’s outcome, typically late and close. Comparing hold/break/scoring rates in these moments against everything else shows whether performance holds up when a point mattered most.'),
  ]));
  return wrap;
}

// ---------- Player comparison table (used by Player Analysis) ----------
function safeDiv(numer, denom, decimals) {
  if (!denom) return null;
  const f = Math.pow(10, decimals == null ? 1 : decimals);
  return Math.round((numer / denom) * f) / f;
}
function fmtYd(v) { return v == null ? '–' : `${v} yd`; }
function fmtAvg(v) { return v == null ? '–' : `${v}`; }

const PLAYER_BASIC_ROWS = [
  { label: 'Games played', get: p => p.gamesPlayed },
  { label: 'Offensive points', get: p => p.offensePlayed },
  { label: 'Defensive points', get: p => p.defensePlayed },
  { label: 'High-leverage points played', get: p => p.highLeveragePointsPlayed },
  { label: 'Touches', headline: true, get: p => p.touches },
  { label: 'Goals', headline: true, get: p => p.goals },
  { label: 'Assists', headline: true, get: p => p.assists },
  { label: '2nd assists', get: p => p.secondaryAssists },
  { label: 'Blocks', headline: true, get: p => p.blocks },
  { label: 'Thrower errors', lowerBetter: true, get: p => p.throwerErrors },
  { label: 'Receiver errors', lowerBetter: true, get: p => p.receiverErrors },
  { label: 'Plus/minus', headline: true, get: p => p.plusMinus },
  { label: 'Total scoring efficiency', headline: true, tip: 'Share of all points this player was on the field for that their team scored.', get: p => fmtPct(p.totalScoringEfficiency) },
  { label: 'Offensive scoring efficiency', tip: 'Of the offensive (O-line) points they played, the share scored — the hold rate while they were on.', get: p => fmtPct(p.offensiveScoringEfficiency) },
  { label: 'Defensive scoring efficiency', tip: 'Of the defensive (D-line) points they played, the share scored — the break rate while they were on.', get: p => fmtPct(p.defensiveScoringEfficiency) },
  { label: 'Defensive turnover efficiency', tip: 'Of the defensive points they played, the share where the opponent turned the disc over at least once — whether or not the team then scored.', get: p => fmtPct(p.defensiveTurnoverEfficiency) },
  { label: 'Point recovery', tip: 'Of the points they played where their team turned the disc over at least once, the share still won.', get: p => fmtPct(p.pointRecovery) },
];
const PLAYER_THROWER_RATE_ROWS = [
  { label: 'Throw completion', main: p => fmtPct(p.throwCompletionPct), sub: p => `${p.throwCompletions}/${p.throws}` },
  { label: 'Huck completion', main: p => fmtPct(p.huckCompletionPct), sub: p => `${p.huckCompletions}/${p.huckAttempts}` },
  { label: 'Assist completion', main: p => fmtPct(p.assistCompletionPct), sub: p => `${p.assists}/${p.assistAttempts}` },
  { label: 'Completions / game', main: p => fmtAvg(safeDiv(p.throwCompletions, p.gamesPlayed)), sub: p => `${p.throwCompletions} total` },
  { label: 'Throwaways / game', lowerBetter: true, main: p => fmtAvg(safeDiv(p.throwerErrors, p.gamesPlayed)), sub: p => `${p.throwerErrors} total` },
  { label: 'Total throwing gain', main: p => fmtYd(safeDiv(p.throwGain, 1)), sub: p => `over ${p.gamesPlayed} game${p.gamesPlayed === 1 ? '' : 's'}` },
  { label: 'Throwing gain / game', main: p => fmtYd(safeDiv(p.throwGain, p.gamesPlayed)), sub: p => `${safeDiv(p.throwGain, 1)} yd total` },
  { label: 'Throwing gain / pass', main: p => fmtYd(safeDiv(p.throwGain, p.throwCompletions)), sub: p => `${p.throwCompletions} completions` },
  { label: 'Avg completed throw distance', main: p => fmtYd(safeDiv(p.throwDist, p.throwCompletions)), sub: p => `${p.throwCompletions} completions` },
  { label: 'Avg incomplete throw distance', main: p => fmtYd(safeDiv(p.throwIncompleteDist, p.throws - p.throwCompletions)), sub: p => `${p.throws - p.throwCompletions} incomplete` },
];
const PLAYER_RECEIVER_RATE_ROWS = [
  { label: 'Catch completion', main: p => fmtPct(p.catchCompletionPct), sub: p => `${p.catches}/${p.catches + p.receiverErrors}` },
  { label: 'Huck reception', main: p => fmtPct(p.huckReceptionPct), sub: p => `${p.huckReceptions}/${p.huckTargets}` },
  { label: 'Assist reception', main: p => fmtPct(p.assistReceptionPct), sub: p => `${p.goals}/${p.assistReceptionAttempts}` },
  { label: 'Receptions / game', main: p => fmtAvg(safeDiv(p.catches, p.gamesPlayed)), sub: p => `${p.catches} total` },
  { label: 'Drops / game', lowerBetter: true, main: p => fmtAvg(safeDiv(p.receiverErrors, p.gamesPlayed)), sub: p => `${p.receiverErrors} total` },
  { label: 'Total receiving gain', main: p => fmtYd(safeDiv(p.catchGain, 1)), sub: p => `over ${p.gamesPlayed} game${p.gamesPlayed === 1 ? '' : 's'}` },
  { label: 'Receiving gain / game', main: p => fmtYd(safeDiv(p.catchGain, p.gamesPlayed)), sub: p => `${safeDiv(p.catchGain, 1)} yd total` },
  { label: 'Receiving gain / pass', main: p => fmtYd(safeDiv(p.catchGain, p.catches)), sub: p => `${p.catches} receptions` },
  { label: 'Avg completed catch distance', main: p => fmtYd(safeDiv(p.catchDist, p.catches)), sub: p => `${p.catches} receptions` },
  { label: 'Avg incomplete catch distance', main: p => fmtYd(safeDiv(p.catchIncompleteDist, p.receivingTargets - p.catches)), sub: p => `${p.receivingTargets - p.catches} incomplete` },
];

// Per-column categorical colour for the mobile comparison bars.
function compareColorVar(i) { return 'var(--pc' + ((i % 7) + 1) + ')'; }

// A row's formatted display string for one entity (the same text the table cell
// shows), and a numeric magnitude parsed out of it for sizing a bar.
function compareRowDisplay(rd, p) {
  if (rd.main) return rd.main(p);
  if (rd.get) return formatCell(rd.get(p));
  return '';
}
function compareRowNumeric(rd, p) {
  if (rd.render) return null; // custom mini-chart cells have no single value
  const raw = rd.main ? rd.main(p) : (rd.get ? rd.get(p) : null);
  if (typeof raw === 'number') return raw;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '' || s === '–') return null; // en-dash = "no data"
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

// Mobile-only alternative to the comparison table: one block per stat, with
// every selected entity drawn as a labelled bar so the whole field is
// comparable without a sideways scroll. Headline stats (rows flagged
// `headline`, else the first six) show up front; the rest sit behind a
// "show all" toggle. Hidden above the mobile breakpoint -- see .compare-block.
function buildCompareCards(rowDefs, players, key) {
  const cards = el('div', { class: 'compare-cards' }, []);

  const legend = el('div', { class: 'cmp-legend' }, []);
  players.forEach((p, i) => {
    legend.appendChild(el('span', { class: 'cmp-key' }, [
      el('span', { class: 'cmp-dot', style: 'background:' + compareColorVar(i) }, []),
      document.createTextNode(p[key]),
    ]));
  });
  cards.appendChild(legend);

  function statBlock(rd) {
    const block = el('div', { class: 'cmp-row' }, []);
    const lbl = el('div', { class: 'cmp-lbl' + (rd.tip ? ' has-tip' : '') }, [el('span', {}, [document.createTextNode(rd.label)])]);
    if (rd.tip) lbl.title = rd.tip;
    if (rd.lowerBetter) lbl.appendChild(el('span', { class: 'cmp-hint' }, [document.createTextNode('lower is better')]));
    block.appendChild(lbl);

    // A row that draws its own cell (e.g. a mini histogram) can't be a bar --
    // stack the rendered element under each entity's name instead.
    if (rd.render) {
      players.forEach((p) => {
        block.appendChild(el('div', { class: 'cmp-render' }, [
          el('span', { class: 'cmp-nm' }, [document.createTextNode(p[key])]),
          el('div', { class: 'cmp-render-cell' }, [rd.render(p, players)]),
        ]));
      });
      return block;
    }

    const nums = players.map(p => compareRowNumeric(rd, p));
    const present = nums.filter(v => v != null);
    const isPct = players.some(p => /%\s*$/.test(String(compareRowDisplay(rd, p))));
    const maxAbs = Math.max(1, ...present.map(v => Math.abs(v)));
    const allEqual = present.length > 1 && present.every(v => v === present[0]);
    const best = (present.length > 1 && !allEqual)
      ? (rd.lowerBetter ? Math.min.apply(null, present) : Math.max.apply(null, present)) : null;

    players.forEach((p, i) => {
      const v = nums[i];
      const empty = v == null; // "–" / no data: no bar at all, not a stray nub
      const isLead = v != null && best != null && v === best;
      const neg = v != null && v < 0;
      const w = empty ? 0 : (isPct ? Math.max(2, Math.min(100, v)) : Math.max(2, (Math.abs(v) / maxAbs) * 100));
      block.appendChild(el('div', { class: 'cmp-bar' + (isLead ? ' lead' : '') }, [
        el('span', { class: 'cmp-nm' }, [document.createTextNode(p[key])]),
        el('span', { class: 'cmp-track' }, [
          el('span', { class: 'cmp-fill' + (neg ? ' neg' : '') + (empty ? ' empty' : ''), style: 'width:' + w + '%;' + (neg || empty ? '' : 'background:' + compareColorVar(i)) }, []),
        ]),
        el('span', { class: 'cmp-v' }, [document.createTextNode(compareRowDisplay(rd, p))]),
      ]));
    });
    return block;
  }

  const headlineRows = rowDefs.filter(r => r.headline);
  const primary = headlineRows.length ? headlineRows : rowDefs.slice(0, 6);
  const rest = headlineRows.length ? rowDefs.filter(r => !r.headline) : rowDefs.slice(6);
  primary.forEach(rd => cards.appendChild(statBlock(rd)));

  if (rest.length) {
    const restWrap = el('div', { class: 'cmp-rest' }, []);
    restWrap.style.display = 'none';
    rest.forEach(rd => restWrap.appendChild(statBlock(rd)));
    const total = rowDefs.length;
    const btn = el('button', { class: 'cmp-more', type: 'button' }, [document.createTextNode('Show all ' + total + ' stats')]);
    let open = false;
    btn.addEventListener('click', () => {
      open = !open;
      restWrap.style.display = open ? '' : 'none';
      btn.textContent = open ? 'Show fewer stats' : ('Show all ' + total + ' stats');
    });
    cards.appendChild(btn);
    cards.appendChild(restWrap);
  }
  return cards;
}

function buildComparisonTable(rowDefs, players, labelKey, opts) {
  const key = labelKey || 'player';
  const wrap = el('div', { class: 'table-scroll' }, []);
  const table = el('table', { class: 'stats compare' }, []);
  const thead = el('thead', {}, []);
  const headRow = el('tr', {}, [el('th', { class: 'row-label' }, [])]);
  players.forEach(p => {
    // Only the player comparison gets faces -- the same table also compares
    // lines and thrower-receiver pairs, which have no single photo.
    const avatar = (key === 'player') ? playerAvatar(p[key], 80) : null;
    const cell = el('th', {}, []);
    if (avatar) cell.appendChild(el('div', { class: 'compare-avatar' }, [avatar]));
    cell.appendChild(el('div', {}, [document.createTextNode(p[key])]));
    headRow.appendChild(cell);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el('tbody', {}, []);
  rowDefs.forEach(rd => {
    // A row can carry a `tip`: a hover explanation on its label, marked with a
    // dotted underline + help cursor so it reads as "there's more here."
    const labelCell = rd.tip
      ? el('td', { class: 'row-label has-tip', title: rd.tip }, [document.createTextNode(rd.label)])
      : el('td', { class: 'row-label' }, [document.createTextNode(rd.label)]);
    const tr = el('tr', {}, [labelCell]);
    players.forEach(p => {
      let cellChildren;
      // A row can render its own cell content (a mini chart rather than a
      // number); it gets every column's row object so it can share a scale.
      if (rd.render) {
        cellChildren = [rd.render(p, players)];
      } else if (rd.main) {
        const mainVal = rd.main(p);
        cellChildren = [
          el('div', { class: 'rate-pct' }, [document.createTextNode(mainVal)]),
          el('div', { class: 'rate-frac' }, [document.createTextNode(mainVal === '–' ? '–' : rd.sub(p))]),
        ];
      } else {
        cellChildren = [document.createTextNode(formatCell(rd.get(p)))];
      }
      tr.appendChild(el('td', {}, cellChildren));
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  // The table stays the desktop view; on a phone it's swapped for a stacked
  // stat-bar view (opts.mobileCards) so all entities compare without a sideways
  // scroll. CSS picks which is visible at the breakpoint.
  const block = el('div', { class: 'compare-block' }, [wrap]);
  if (opts && opts.mobileCards) block.appendChild(buildCompareCards(rowDefs, players, key));
  return block;
}

function buildPlayerSelector(onChange, options) {
  const opts = options || {};
  const maxPlayers = opts.maxPlayers || 7;
  const defaultAll = !!opts.defaultAll;
  const includeSelectAll = !!opts.includeSelectAll;
  const roleLabel = opts.roleLabel || 'Player';

  const wrap = el('div', { class: 'game-filter' }, []);
  const btn = el('button', { class: 'game-filter-btn', type: 'button' }, []);
  const panel = el('div', { class: 'game-filter-panel' }, []);
  panel.style.display = 'none';

  // items lets callers select from an arbitrary list (e.g. named lines)
  // instead of the season roster -- same widget either way. initialSelected
  // pre-checks a specific subset, letting a caller that rebuilds the widget
  // (e.g. after renaming a tournament) carry the user's selection across.
  // preserveOrder skips the alphabetical re-sort when the caller already
  // handed over a meaningful order (e.g. thrower-receiver pairs sorted by
  // throw count, where alphabetical would bury the busiest connections).
  const names = (opts.items || REPORT.seasonLeaderboard.map(r => r.player)).slice();
  if (!opts.preserveOrder) names.sort((a, b) => a.localeCompare(b));
  let selectedOrder = opts.initialSelected
    ? opts.initialSelected.filter(n => names.includes(n)).slice(0, maxPlayers)
    : (defaultAll ? names.slice(0, maxPlayers) : []);

  function updateLabel() {
    if (selectedOrder.length === 0) { btn.textContent = `Select ${roleLabel}…`; return; }
    if (selectedOrder.length === names.length) { btn.textContent = `${roleLabel}: All (${names.length})`; return; }
    btn.textContent = `${roleLabel}: ${selectedOrder.length} selected`;
  }

  const entries = [];
  let selectAllCb = null;
  function updateDisabledStates() {
    const atMax = selectedOrder.length >= maxPlayers;
    entries.forEach(({ cb, row }) => {
      if (!cb.checked) {
        cb.disabled = atMax;
        row.classList.toggle('disabled', atMax);
      }
    });
    if (selectAllCb) {
      selectAllCb.checked = selectedOrder.length === names.length;
      selectAllCb.indeterminate = selectedOrder.length > 0 && selectedOrder.length < names.length;
    }
  }

  if (includeSelectAll) {
    selectAllCb = el('input', { type: 'checkbox' }, []);
    const selectAllRow = el('label', { class: 'game-filter-row' }, [selectAllCb, document.createTextNode('Select all')]);
    panel.appendChild(selectAllRow);
    panel.appendChild(el('div', { class: 'game-filter-sep' }, []));
    selectAllCb.addEventListener('change', () => {
      selectedOrder = selectAllCb.checked ? names.slice(0, maxPlayers) : [];
      entries.forEach(({ name, cb }) => { cb.checked = selectedOrder.includes(name); });
      updateLabel();
      updateDisabledStates();
      onChange(selectedOrder.slice());
    });
  }

  names.forEach(name => {
    const cb = el('input', { type: 'checkbox' }, []);
    cb.checked = selectedOrder.includes(name);
    const row = el('label', { class: 'game-filter-row' }, [cb, document.createTextNode(name)]);
    panel.appendChild(row);
    entries.push({ name, cb, row });
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (selectedOrder.length >= maxPlayers) { cb.checked = false; return; }
        selectedOrder.push(name);
      } else {
        selectedOrder = selectedOrder.filter(n => n !== name);
      }
      updateLabel();
      updateDisabledStates();
      onChange(selectedOrder.slice());
    });
  });

  updateLabel();
  updateDisabledStates();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) panel.style.display = 'none';
  });

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  return wrap;
}

// ---------- Player Analysis section (assembles all the widgets above) ----------
function buildPlayerAnalysisSection() {
  const section = el('section', { class: 'view', id: 'player-analysis' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Player analysis')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Compare up to 7 players side by side, across the games you choose.')]));

  const headerRow = el('div', { class: 'section-title-row' }, [el('span', {}, [document.createTextNode('Players')])]);
  const controlsRow = el('div', { class: 'controls-row' }, []);
  const contentArea = el('div', {}, []);

  let selectedPlayers = [];
  let selectedGames = REPORT.games.map((g, i) => i);

  function render() {
    contentArea.innerHTML = '';
    if (!selectedPlayers.length) {
      contentArea.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Select 1–7 players above to compare their stats side by side.')]));
      return;
    }
    const statsPool = aggregateSeasonStats(selectedGames);
    const players = selectedPlayers.map(name => statsPool.find(r => r.player === name) || zeroPlayerRow(name));

    contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Season Totals')]));
    contentArea.appendChild(buildComparisonTable(PLAYER_BASIC_ROWS, players, 'player', { mobileCards: true }));

    const rateHeaderRow = el('div', { class: 'section-title-row' }, [el('span', {}, [document.createTextNode('Efficiency & Averages')])]);
    const rateTableHolder = el('div', {}, []);
    let mode = 'thrower';
    function renderRateTable() {
      rateTableHolder.innerHTML = '';
      rateTableHolder.appendChild(buildComparisonTable(mode === 'thrower' ? PLAYER_THROWER_RATE_ROWS : PLAYER_RECEIVER_RATE_ROWS, players, 'player', { mobileCards: true }));
    }
    renderRateTable();
    rateHeaderRow.appendChild(buildToggle('Thrower', 'Receiver', (which) => {
      mode = which === 'a' ? 'thrower' : 'receiver';
      renderRateTable();
    }));
    contentArea.appendChild(rateHeaderRow);
    contentArea.appendChild(rateTableHolder);

    contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Directions')]));
    contentArea.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode(
      'Which way each player’s throws and receptions tend to go. Each wedge points in the direction the disc traveled (straight up = toward the attacking endzone), and how far it reaches out from the center shows how often that player threw or received in that direction, relative to their own other directions — not compared across players. Hover a wedge for the exact count.'
    )]));
    contentArea.appendChild(buildDirectionsSection(players, selectedGames));

    contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Connections')]));
    contentArea.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode(
      'Who each player’s top 7 connections are. On the left, the players who throw to them most; on the right, the players they throw to most — the player named on the card sits in the middle. Ribbon thickness shows how much of that player’s total volume each connection accounts for, and color splits completed (green) from incomplete (red). Hover a ribbon or a name’s bar for the exact throw counts.'
    )]));
    contentArea.appendChild(buildConnectionsSection(players, selectedGames));

    contentArea.appendChild(buildImpactSection(players, selectedGames));
  }

  controlsRow.appendChild(buildPlayerSelector((names) => { selectedPlayers = names; render(); }));
  controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; render(); }));
  headerRow.appendChild(controlsRow);
  section.appendChild(headerRow);
  section.appendChild(contentArea);
  render();
  return section;
}

// ---------- Set up section: tournaments, per-game video links, player photos ----------
// All of this is user configuration saved in localStorage (see loadSetupData),
// not derived from the .statto file, so it lives entirely client-side like the
// curated lines. Tournaments defined here drive the tournament grouping in the
// game filter and Line Analysis everywhere else in the report.
function buildSetupSection() {
  const section = el('section', { class: 'view', id: 'setup' }, []);
  section.appendChild(text('p', 'eyebrow', 'Set up'));
  section.appendChild(text('p', 'hero-sub', 'Group games into tournaments, add a video link per game, and set player photos. Everything here is saved in this browser.'));

  // ---- Back up / restore everything you've added on top of the report ----
  const exportAllBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Export all custom data')]);
  exportAllBtn.addEventListener('click', exportAllCustomData);
  const importAllBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Import all custom data')]);
  const importAllInput = el('input', { type: 'file', accept: 'application/json,.json' }, []);
  importAllInput.style.display = 'none';
  importAllBtn.addEventListener('click', () => importAllInput.click());
  importAllInput.addEventListener('change', () => {
    const file = importAllInput.files && importAllInput.files[0];
    importAllInput.value = '';
    if (file) importAllCustomData(file);
  });
  section.appendChild(el('div', { class: 'controls-row de-io-row' }, [exportAllBtn, importAllBtn, importAllInput]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Everything you add on top of the report — tournament names, video links, player photos, curated lines and video tags — is saved only in this browser. Export it to one file to back it up or move it onto a freshly regenerated report; importing replaces the matching data here and reloads.')]));

  const data = loadSetupData();
  // Seed the working tournament list from any saved config, else from the
  // date-based auto-detection (getTournaments' fallback) so the user starts
  // from a sensible grouping rather than a blank slate.
  let tournaments = (data.tournaments && data.tournaments.length)
    ? data.tournaments.map(t => ({ id: t.id, label: t.label, gameIndices: (t.gameIndices || []).slice() }))
    : getTournaments().map(t => ({ id: t.id, label: t.label, gameIndices: t.gameIndices.slice() }));
  let videoLinks = Object.assign({}, data.videoLinks);
  let playerPhotos = Object.assign({}, data.playerPhotos);

  function persist() { saveSetupData({ tournaments, videoLinks, playerPhotos }); }
  // Tournament edits bump the global revision so the analysis tabs rebuild
  // from the new grouping on the next click into them (see showView). Photo
  // edits bump it too, since players' faces now appear in those tabs' tables
  // and headers. Video links don't -- they're read live wherever they're used.
  function persistTournaments() { persist(); tournamentsRevision++; }
  function persistPhotos() { persist(); tournamentsRevision++; }

  function tournamentIdOf(gi) {
    const t = tournaments.find(t => t.gameIndices.includes(gi));
    return t ? t.id : '';
  }
  function assignGame(gi, tid) {
    tournaments.forEach(t => { t.gameIndices = t.gameIndices.filter(i => i !== gi); });
    if (tid) {
      const t = tournaments.find(t => t.id === tid);
      if (t) { t.gameIndices.push(gi); t.gameIndices.sort((a, b) => a - b); }
    }
  }

  // ---- Tournaments subsection ----
  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Tournaments')]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Name your tournaments here, then assign each game to one in the table below. These groups appear in every games filter across the report; other tabs pick up your changes the next time you open them.')]));
  const tournamentList = el('div', { class: 'setup-tournament-list' }, []);
  section.appendChild(tournamentList);
  const addBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('+ Add tournament')]);
  addBtn.addEventListener('click', () => {
    tournaments.push({ id: newTournamentId(), label: 'New tournament', gameIndices: [] });
    persistTournaments();
    renderTournaments();
    renderGamesTable();
  });
  section.appendChild(el('div', { class: 'controls-row' }, [addBtn]));

  function renderTournaments() {
    tournamentList.innerHTML = '';
    if (!tournaments.length) {
      tournamentList.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No tournaments yet — add one to start grouping games.')]));
      return;
    }
    tournaments.forEach(t => {
      const nameInput = el('input', { type: 'text', class: 'line-name-input', value: t.label }, []);
      nameInput.addEventListener('change', () => {
        t.label = nameInput.value.trim() || t.label;
        nameInput.value = t.label;
        persistTournaments();
        renderGamesTable();
      });
      const count = el('span', { class: 'setup-tournament-count' }, [document.createTextNode(`${t.gameIndices.length} game${t.gameIndices.length === 1 ? '' : 's'}`)]);
      const del = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Delete')]);
      del.addEventListener('click', () => {
        tournaments = tournaments.filter(x => x.id !== t.id);
        persistTournaments();
        renderTournaments();
        renderGamesTable();
      });
      tournamentList.appendChild(el('div', { class: 'setup-tournament-row' }, [nameInput, count, del]));
    });
  }

  // ---- Games table: assignment + one video link each ----
  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Games')]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Assign each game to a tournament and paste its video link. To split video tagging across people, use “Create tagging page” to hand each helper a single-game tagging file; when they send back their exported annotations JSON, “Upload tags” merges it here (only that game’s tags, so a wrong file can’t affect others).')]));
  const gamesTableWrap = el('div', { class: 'table-scroll' }, []);
  section.appendChild(gamesTableWrap);

  function renderGamesTable() {
    gamesTableWrap.innerHTML = '';
    const table = el('table', { class: 'stats setup-games' }, []);
    const thead = el('thead', {}, [el('tr', {}, [
      el('th', {}, [document.createTextNode('Game')]),
      el('th', {}, [document.createTextNode('Tournament')]),
      el('th', {}, [document.createTextNode('Video link')]),
      el('th', {}, [document.createTextNode('Video tagging')]),
    ])]);
    table.appendChild(thead);
    const tbody = el('tbody', {}, []);
    REPORT.games.forEach((g, i) => {
      const select = el('select', { class: 'setup-select' }, []);
      select.appendChild(el('option', { value: '' }, [document.createTextNode('— Unassigned —')]));
      tournaments.forEach(t => {
        const opt = el('option', { value: t.id }, [document.createTextNode(t.label)]);
        select.appendChild(opt);
      });
      select.value = tournamentIdOf(i);
      select.addEventListener('change', () => {
        assignGame(i, select.value);
        persistTournaments();
        renderTournaments();
      });

      const urlInput = el('input', { type: 'url', class: 'setup-video-input', placeholder: 'https://…', value: videoLinks[i] || '' }, []);
      urlInput.addEventListener('change', () => {
        const v = urlInput.value.trim();
        if (v) videoLinks[i] = v; else delete videoLinks[i];
        persist();
      });

      // Per-game video-tagging: hand out a single-game tagging page, then
      // re-import that game's annotations JSON when it comes back.
      const total = gameAnnotationUUIDs(i).size;
      const tagged = gameTaggedCount(i);
      const createBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Create tagging page')]);
      createBtn.addEventListener('click', () => downloadGameTaggingPage(i));
      const uploadInput = el('input', { type: 'file', accept: 'application/json,.json' }, []);
      uploadInput.style.display = 'none';
      const uploadBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Upload tags')]);
      uploadBtn.addEventListener('click', () => uploadInput.click());
      uploadInput.addEventListener('change', () => {
        const file = uploadInput.files && uploadInput.files[0];
        uploadInput.value = '';
        if (!file) return;
        importGameAnnotationsFile(i, file, (n) => { renderGamesTable(); });
      });
      const countEl = el('span', { class: 'setup-tag-count' }, [document.createTextNode(`${tagged}/${total} tagged`)]);
      const tagCell = el('td', {}, [
        el('div', { class: 'setup-tag-actions' }, [createBtn, uploadBtn, uploadInput, countEl]),
      ]);

      tbody.appendChild(el('tr', {}, [
        el('td', {}, [document.createTextNode(`vs ${g.opponent}`), el('span', { class: 'setup-game-date' }, [document.createTextNode(' · ' + g.dateDisplay)])]),
        el('td', {}, [select]),
        el('td', {}, [urlInput]),
        tagCell,
      ]));
    });
    table.appendChild(tbody);
    gamesTableWrap.appendChild(table);
  }

  // ---- Player photos ----
  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Player photos')]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Give each player a circular photo — upload one per person below, or tag several at once from a single team photo. Saved in this browser for use elsewhere in the report.')]));

  const roster = REPORT.seasonLeaderboard.map(r => r.player).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const tagTeamBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Tag from a team photo')]);
  tagTeamBtn.addEventListener('click', () => {
    openTeamPhotoTagger(roster, playerPhotos, (map) => {
      Object.assign(playerPhotos, map);
      persistPhotos();
      renderPhotos();
    });
  });
  section.appendChild(el('div', { class: 'controls-row' }, [tagTeamBtn]));

  const photoGrid = el('div', { class: 'setup-photo-grid' }, []);
  section.appendChild(photoGrid);

  function renderPhotoCard(name) {
    const card = el('div', { class: 'setup-photo-card' }, []);
    const has = !!playerPhotos[name];
    const avatar = has
      ? el('img', { class: 'setup-avatar', src: playerPhotos[name], alt: name })
      : el('div', { class: 'setup-avatar setup-avatar-placeholder' }, [document.createTextNode(initials(name))]);
    card.appendChild(avatar);
    card.appendChild(el('div', { class: 'setup-photo-name' }, [document.createTextNode(name)]));

    const fileInput = el('input', { type: 'file', accept: 'image/*' }, []);
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      openPhotoCropper(name, file, (dataUrl) => {
        playerPhotos[name] = dataUrl;
        persistPhotos();
        const fresh = renderPhotoCard(name);
        photoGrid.replaceChild(fresh, card);
      });
      fileInput.value = '';
    });
    const btnRow = el('div', { class: 'setup-photo-actions' }, []);
    const uploadBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode(has ? 'Change' : 'Add photo')]);
    uploadBtn.addEventListener('click', () => fileInput.click());
    btnRow.appendChild(uploadBtn);
    if (has) {
      const removeBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Remove')]);
      removeBtn.addEventListener('click', () => {
        delete playerPhotos[name];
        persistPhotos();
        const fresh = renderPhotoCard(name);
        photoGrid.replaceChild(fresh, card);
      });
      btnRow.appendChild(removeBtn);
    }
    card.appendChild(btnRow);
    card.appendChild(fileInput);
    return card;
  }

  function renderPhotos() {
    photoGrid.innerHTML = '';
    roster.forEach(name => photoGrid.appendChild(renderPhotoCard(name)));
  }

  // ---- Publish ----
  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Publish for the team')]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Everything you set up here — tournaments, video links, player photos, curated lines and film tags — is saved in this browser only, so it doesn’t travel with the report file on its own. Publish bakes it all into one standalone HTML file to email, AirDrop, or host: the team gets a clean, read-only report — no Set up tab, the Data Editor becomes a read-only “Film Clips” browser — while Line Analysis stays editable so they can build their own lines on top of yours.')]));
  const publishBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Publish for team (read-only)')]);
  publishBtn.addEventListener('click', publishForTeam);
  section.appendChild(el('div', { class: 'controls-row' }, [publishBtn]));

  renderTournaments();
  renderGamesTable();
  renderPhotos();
  return section;
}

// Modal circular-crop uploader. Loads `file`, lets the user pan (drag) and
// zoom (slider) within a square viewport whose inscribed circle is the crop,
// then renders that circle to a 256px PNG data URL passed to onSave. Output
// is transparent outside the circle so it drops straight into a round avatar.
function openPhotoCropper(name, file, onSave) {
  const V = 300;        // on-screen viewport (square) size in px
  const OUT = 256;      // exported image size in px
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  const overlay = el('div', { class: 'cropper-overlay' }, []);
  const viewport = el('div', { class: 'cropper-viewport' }, []);
  viewport.style.width = V + 'px';
  viewport.style.height = V + 'px';
  const imgEl = el('img', { class: 'cropper-img', src: objectUrl, alt: '' }, []);
  imgEl.setAttribute('draggable', 'false');
  viewport.appendChild(imgEl);
  viewport.appendChild(el('div', { class: 'cropper-ring' }, []));

  const zoom = el('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', class: 'cropper-zoom' }, []);
  const saveBtn = el('button', { class: 'pill-btn cropper-save', type: 'button' }, [document.createTextNode('Save')]);
  const cancelBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Cancel')]);

  const dialog = el('div', { class: 'cropper-dialog' }, [
    el('div', { class: 'cropper-title' }, [document.createTextNode('Crop photo — ' + name)]),
    viewport,
    el('div', { class: 'cropper-zoom-row' }, [el('span', {}, [document.createTextNode('Zoom')]), zoom]),
    el('div', { class: 'cropper-actions' }, [cancelBtn, saveBtn]),
  ]);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  let baseScale = 1, z = 1, tx = 0, ty = 0; // image transform within viewport
  function dispW() { return img.naturalWidth * baseScale * z; }
  function dispH() { return img.naturalHeight * baseScale * z; }
  function clamp() {
    // keep the image covering the whole viewport (so the circle is never empty)
    tx = Math.min(0, Math.max(V - dispW(), tx));
    ty = Math.min(0, Math.max(V - dispH(), ty));
  }
  function apply() {
    imgEl.style.width = dispW() + 'px';
    imgEl.style.height = dispH() + 'px';
    imgEl.style.left = tx + 'px';
    imgEl.style.top = ty + 'px';
  }

  img.onload = () => {
    baseScale = V / Math.min(img.naturalWidth, img.naturalHeight); // "cover"
    z = 1; tx = (V - dispW()) / 2; ty = (V - dispH()) / 2;
    clamp(); apply();
  };
  img.src = objectUrl;

  zoom.addEventListener('input', () => {
    // zoom about the viewport centre so the framed subject stays put
    const cx = (V / 2 - tx) / (baseScale * z);
    const cy = (V / 2 - ty) / (baseScale * z);
    z = parseFloat(zoom.value);
    tx = V / 2 - cx * baseScale * z;
    ty = V / 2 - cy * baseScale * z;
    clamp(); apply();
  });

  let dragging = false, lastX = 0, lastY = 0;
  viewport.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    tx += e.clientX - lastX; ty += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    clamp(); apply();
  });
  function endDrag(e) { dragging = false; try { viewport.releasePointerCapture(e.pointerId); } catch (err) {} }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  function close() {
    URL.revokeObjectURL(objectUrl);
    document.body.removeChild(overlay);
  }
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  saveBtn.addEventListener('click', () => {
    const canvas = el('canvas', {}, []);
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    const scale = OUT / V; // viewport px -> output px
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, tx * scale, ty * scale, dispW() * scale, dispH() * scale);
    let out;
    try { out = canvas.toDataURL('image/png'); } catch (e) { out = null; }
    close();
    if (out) onSave(out);
  });
}

// Modal for tagging faces on a single team photo. The user uploads one photo,
// clicks each face to drop a circle, drags it to centre / drags its handle to
// resize, and picks that person's name from a dropdown. On save, each named
// circle is rendered to its own 256px circular PNG (identical crop math to
// openPhotoCropper) and returned as a { name: dataUrl } map -- so it feeds the
// exact same playerPhotos store as the per-player uploader. No face detection:
// placement is entirely manual, which keeps this dependency-free and offline.
function openTeamPhotoTagger(roster, existingPhotos, onSaveMany) {
  const OUT = 256;            // exported avatar size in px
  const MAX_W = 760, MAX_H = 460; // on-screen stage bounds
  const overlay = el('div', { class: 'cropper-overlay' }, []);
  const dialog = el('div', { class: 'cropper-dialog tagger-dialog' }, []);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  dialog.appendChild(el('div', { class: 'cropper-title' }, [document.createTextNode('Tag players on a team photo')]));

  const body = el('div', { class: 'tagger-body' }, []);
  dialog.appendChild(body);

  const saveBtn = el('button', { class: 'pill-btn cropper-save', type: 'button' }, [document.createTextNode('Save tagged players')]);
  const cancelBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Cancel')]);
  const actions = el('div', { class: 'cropper-actions' }, [cancelBtn, saveBtn]);
  saveBtn.style.display = 'none';
  dialog.appendChild(actions);

  let objectUrl = null;
  function close() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (overlay.parentNode) document.body.removeChild(overlay);
  }
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // ---- Step 1: choose a team photo ----
  const fileInput = el('input', { type: 'file', accept: 'image/*' }, []);
  fileInput.style.display = 'none';
  const chooseBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Choose team photo')]);
  chooseBtn.addEventListener('click', () => fileInput.click());
  const chooseWrap = el('div', { class: 'tagger-choose' }, [
    el('p', { class: 'pitch-caption' }, [document.createTextNode('Upload one photo with several players in it. You’ll click each face to tag it.')]),
    chooseBtn,
  ]);
  body.appendChild(chooseWrap);
  body.appendChild(fileInput);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => startTagging(img);
    img.src = objectUrl;
  });

  // ---- Step 2: place + name circles ----
  function startTagging(img) {
    body.removeChild(chooseWrap);
    saveBtn.style.display = '';

    const scale = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
    const dispW = img.naturalWidth * scale, dispH = img.naturalHeight * scale;
    const r0 = Math.max(18, Math.min(img.naturalWidth, img.naturalHeight) * 0.09); // default face radius (natural px)

    body.appendChild(el('p', { class: 'pitch-caption tagger-help' }, [
      document.createTextNode('Click a face to drop a circle. Drag it to centre, drag the corner handle to resize, then pick the player’s name. Circles without a name are ignored.'),
    ]));

    const stage = el('div', { class: 'tagger-stage' }, []);
    stage.style.width = dispW + 'px';
    stage.style.height = dispH + 'px';
    const imgEl = el('img', { class: 'tagger-img', src: img.src, alt: '' }, []);
    imgEl.setAttribute('draggable', 'false');
    stage.appendChild(imgEl);
    body.appendChild(stage);

    const tags = []; // { id, cx, cy, r, name, circle, select }
    let colorIdx = 0;
    const COLORS = ['#4FD1AE', '#E8604C', '#F0C85A', '#6FA8DC', '#C68FE6', '#EF8CA0', '#8FD16B', '#E0A15A'];

    function clampTag(t) {
      t.r = Math.max(10, Math.min(t.r, img.naturalWidth / 2, img.naturalHeight / 2));
      t.cx = Math.min(img.naturalWidth - t.r, Math.max(t.r, t.cx));
      t.cy = Math.min(img.naturalHeight - t.r, Math.max(t.r, t.cy));
    }
    function place(t) {
      const d = t.r * 2 * scale;
      t.circle.style.width = d + 'px';
      t.circle.style.height = d + 'px';
      t.circle.style.left = (t.cx - t.r) * scale + 'px';
      t.circle.style.top = (t.cy - t.r) * scale + 'px';
    }

    function refreshSelectStates() {
      const used = new Set(tags.map(t => t.name).filter(Boolean));
      tags.forEach(t => {
        Array.from(t.select.options).forEach(opt => {
          // disable names taken by *other* circles so each maps to one face
          opt.disabled = opt.value && opt.value !== t.name && used.has(opt.value);
        });
        t.circle.classList.toggle('tagged-named', !!t.name);
        t.circle.style.setProperty('--tag-color', t.color);
      });
    }

    function addTag(cx, cy) {
      const t = { id: 'tag-' + Math.random().toString(36).slice(2, 8), cx, cy, r: r0, name: '', color: COLORS[colorIdx++ % COLORS.length] };
      const circle = el('div', { class: 'tagger-circle' }, []);
      const handle = el('div', { class: 'tagger-handle' }, []);
      const removeBtn = el('button', { class: 'tagger-remove', type: 'button', title: 'Remove' }, [document.createTextNode('×')]);
      const select = el('select', { class: 'tagger-name-select' }, []);
      select.appendChild(el('option', { value: '' }, [document.createTextNode('— name —')]));
      roster.forEach(n => select.appendChild(el('option', { value: n }, [document.createTextNode(n)])));
      const label = el('div', { class: 'tagger-name' }, [select]);
      circle.appendChild(handle);
      circle.appendChild(removeBtn);
      circle.appendChild(label);
      stage.appendChild(circle);
      t.circle = circle; t.select = select;
      tags.push(t);
      clampTag(t); place(t); refreshSelectStates();

      select.addEventListener('change', () => { t.name = select.value; refreshSelectStates(); });
      select.addEventListener('pointerdown', (e) => e.stopPropagation());
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        stage.removeChild(circle);
        tags.splice(tags.indexOf(t), 1);
        refreshSelectStates();
      });

      // drag the whole circle to reposition
      let mode = null, lastX = 0, lastY = 0;
      circle.addEventListener('pointerdown', (e) => {
        if (e.target === select || e.target === removeBtn) return;
        e.stopPropagation();
        mode = (e.target === handle) ? 'resize' : 'move';
        lastX = e.clientX; lastY = e.clientY;
        circle.setPointerCapture(e.pointerId);
      });
      circle.addEventListener('pointermove', (e) => {
        if (!mode) return;
        const dx = (e.clientX - lastX) / scale, dy = (e.clientY - lastY) / scale;
        lastX = e.clientX; lastY = e.clientY;
        if (mode === 'move') { t.cx += dx; t.cy += dy; }
        else { t.r += (dx + dy) / 2; }
        clampTag(t); place(t);
      });
      function end(e) { if (mode) { mode = null; try { circle.releasePointerCapture(e.pointerId); } catch (err) {} } }
      circle.addEventListener('pointerup', end);
      circle.addEventListener('pointercancel', end);
    }

    // click on the photo background drops a new circle centred there
    imgEl.addEventListener('click', (e) => {
      const rect = stage.getBoundingClientRect();
      addTag((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
    });

    saveBtn.addEventListener('click', () => {
      const out = {};
      tags.forEach(t => {
        if (!t.name) return;
        const canvas = el('canvas', {}, []);
        canvas.width = OUT; canvas.height = OUT;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
        ctx.clip();
        // source square = the circle's bounding box in natural coords
        ctx.drawImage(img, t.cx - t.r, t.cy - t.r, t.r * 2, t.r * 2, 0, 0, OUT, OUT);
        try { out[t.name] = canvas.toDataURL('image/png'); } catch (err) {}
      });
      close();
      if (Object.keys(out).length) onSaveMany(out);
    });
  }
}

// ---------- Season section (record, schedule, leaderboard) ----------
function buildSeasonSection() {
  const section = el('section', { class: 'view active', id: 'season' }, []);
  const r = REPORT.record;
  const totalDiff = REPORT.games.reduce((sum, g) => sum + (g.ourScore - g.oppScore), 0);
  const diffClass = totalDiff > 0 ? 'good' : totalDiff < 0 ? 'bad' : '';
  const diffLabel = totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Season record')]));
  section.appendChild(el('div', { class: 'hero-record' }, [
    el('div', { class: 'digits' }, [
      el('span', { class: 'w' }, [document.createTextNode(String(r.wins))]),
      el('span', { class: 'sep' }, [document.createTextNode('\u2013')]),
      el('span', { class: 'l' }, [document.createTextNode(String(r.losses))]),
      r.ties ? el('span', { class: 'sep' }, [document.createTextNode('\u2013' + r.ties)]) : null,
    ]),
    el('div', { class: 'hero-diff' }, [
      el('div', { class: 'hero-diff-value ' + diffClass }, [document.createTextNode(diffLabel)]),
      el('div', { class: 'hero-diff-label' }, [document.createTextNode('Point Diff')]),
    ]),
  ]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode(REPORT.teamName + ' \u00b7 ' + REPORT.games.length + ' games this season')]));

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Schedule')]));
  const grid = el('div', { class: 'schedule-grid' }, []);
  REPORT.games.forEach((g, i) => {
    const card = el('button', { class: 'game-card' }, [
      el('div', { class: 'opp' }, [document.createTextNode('vs ' + g.opponent)]),
      el('div', { class: 'date' }, [document.createTextNode(g.dateDisplay)]),
      el('div', { class: 'score-row' }, [
        el('span', { class: 'score' }, [document.createTextNode(g.ourScore + '\u2013' + g.oppScore)]),
        el('span', { class: 'badge ' + g.result }, [document.createTextNode(g.result)]),
      ]),
    ]);
    card.addEventListener('click', () => showView('game-' + i));
    grid.appendChild(card);
  });
  section.appendChild(grid);

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Scoring Efficiency')]));
  section.appendChild(buildScoringEfficiencyWidget(REPORT.seasonScoringEfficiency));

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Clutch Efficiency')]));
  section.appendChild(buildClutchEfficiencyWidget(REPORT.seasonClutchEfficiency));

  const leaderboardHeader = el('div', { class: 'section-title-row' }, [
    el('span', {}, [document.createTextNode('Season leaderboard')]),
  ]);
  const tableHolder = el('div', {}, []);
  let currentTableEl = buildStatsTable(REPORT.seasonLeaderboard, SEASON_COLUMNS, 'pointsPlayed', `${slug(REPORT.teamName)}_season_leaderboard.csv`);
  tableHolder.appendChild(currentTableEl);
  leaderboardHeader.appendChild(buildGameFilterDropdown((selectedIndices) => {
    const rows = aggregateSeasonStats(selectedIndices);
    const newTableEl = buildStatsTable(rows, SEASON_COLUMNS, 'pointsPlayed', `${slug(REPORT.teamName)}_season_leaderboard.csv`);
    tableHolder.replaceChild(newTableEl, currentTableEl);
    currentTableEl = newTableEl;
  }));
  section.appendChild(leaderboardHeader);
  section.appendChild(tableHolder);

  return section;
}

// ---------- Line Analysis: detect/confirm/name recurring 7-person lineups,
// then compare them the same way Player Analysis compares individual players.
// Curated lines are user data (not derived from Statto), so they live in
// localStorage plus an export/import JSON round-trip -- see saveLinesData/loadLinesData. ----------

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Days since epoch for a 'YYYY-MM-DD' key, via Date.UTC -- deliberately not
// wall-clock Date diffing, so this can't be thrown off by DST or timezone.
function dateKeyToUTCDays(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

function formatTournamentLabel(dateKeys) {
  const first = dateKeys[0], last = dateKeys[dateKeys.length - 1];
  const [fy, fm, fd] = first.split('-').map(Number);
  const [ly, lm, ld] = last.split('-').map(Number);
  if (first === last) return `${MONTH_ABBR[fm - 1]} ${fd} Tournament`;
  if (fm === lm) return `${MONTH_ABBR[fm - 1]} ${fd}–${ld} Tournament`;
  return `${MONTH_ABBR[fm - 1]} ${fd} – ${MONTH_ABBR[lm - 1]} ${ld} Tournament`;
}

// Groups games into tournaments by date: games on the same day or on
// consecutive days (a gap of more than 1 calendar day starts a new
// tournament) are treated as one event. Tournament ids are positional
// (sorted-ascending), so -- like pointKey below -- they stay stable across
// regenerations as long as new games are only appended, never inserted into
// a date gap that would merge two existing tournaments into one.
//
// This is only the *default* grouping now: the Set up tab lets the user
// override game-to-tournament assignment and labels entirely (see
// getTournaments / loadSetupData). This function seeds that first-run
// default and is the fallback whenever no setup data is saved yet.
function autoDetectTournaments() {
  const gameDates = REPORT.games.map((g, i) => ({ gameIndex: i, dateKey: (g.date || '').slice(0, 10) }));
  const dayKeys = [...new Set(gameDates.map(g => g.dateKey))].sort();

  const dayGroups = [];
  let current = [];
  dayKeys.forEach(key => {
    if (!current.length) { current = [key]; return; }
    const gap = dateKeyToUTCDays(key) - dateKeyToUTCDays(current[current.length - 1]);
    if (gap <= 1) current.push(key);
    else { dayGroups.push(current); current = [key]; }
  });
  if (current.length) dayGroups.push(current);

  return dayGroups.map((keys, i) => {
    const keySet = new Set(keys);
    const gameIndices = gameDates.filter(g => keySet.has(g.dateKey)).map(g => g.gameIndex).sort((a, b) => a - b);
    return { id: 'tournament-' + i, gameIndices, label: formatTournamentLabel(keys) };
  });
}

// The single source of truth for tournaments everywhere outside the Set up
// tab (the game filter, Line Analysis). Returns the user's saved
// configuration if they've set one up, else the date-based auto-detection.
// Each tournament is { id, label, gameIndices } -- gameIndices already
// filtered to valid, in-range indices and sorted, so callers can trust them.
function getTournaments() {
  const saved = loadSetupData().tournaments;
  const source = (saved && saved.length) ? saved : autoDetectTournaments();
  const maxIndex = REPORT.games.length;
  return source.map(t => ({
    id: t.id,
    label: t.label,
    gameIndices: (t.gameIndices || []).filter(i => Number.isInteger(i) && i >= 0 && i < maxIndex).sort((a, b) => a - b),
  }));
}

// Game indices that belong to no tournament under the current configuration.
function unassignedGameIndices(tournaments) {
  const ts = tournaments || getTournaments();
  const claimed = new Set();
  ts.forEach(t => t.gameIndices.forEach(i => claimed.add(i)));
  return REPORT.games.map((g, i) => i).filter(i => !claimed.has(i));
}

const SETUP_SCHEMA_VERSION = 1;

function setupStorageKey() { return 'statto-report-setup::' + REPORT.teamName; }

// Set up tab data: user-defined tournaments (game-to-tournament assignment +
// labels), one video URL per game, and a circular-cropped photo per player.
// Photos are stored as PNG data URLs, bounded to 256px on the crop side, so
// even a full roster stays comfortably within localStorage's budget. All
// three are independent maps so a partial/older saved blob still loads.
function loadSetupData() {
  try {
    const raw = localStorage.getItem(setupStorageKey());
    if (!raw) return { tournaments: [], videoLinks: {}, playerPhotos: {} };
    const parsed = JSON.parse(raw) || {};
    return {
      tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
      videoLinks: (parsed.videoLinks && typeof parsed.videoLinks === 'object') ? parsed.videoLinks : {},
      playerPhotos: (parsed.playerPhotos && typeof parsed.playerPhotos === 'object') ? parsed.playerPhotos : {},
    };
  } catch (e) { return { tournaments: [], videoLinks: {}, playerPhotos: {} }; }
}

function saveSetupData(data) {
  try {
    localStorage.setItem(setupStorageKey(), JSON.stringify({
      version: SETUP_SCHEMA_VERSION, teamName: REPORT.teamName,
      tournaments: data.tournaments || [],
      videoLinks: data.videoLinks || {},
      playerPhotos: data.playerPhotos || {},
    }));
    return true;
  } catch (e) { return false; }
}

function newTournamentId() { return 'tournament-' + Math.random().toString(36).slice(2, 10); }

const LINES_SCHEMA_VERSION = 1;

// Point identity is (gameIndex, pointNumber). This stays stable across
// report regenerations as long as existing games are only ever appended to
// (never reordered or re-edited) -- exactly how this tool is used through a
// season, but worth knowing if you ever hand-edit an already-logged game.
function pointKey(gameIndex, pointNumber) { return gameIndex + '|' + pointNumber; }

function linesStorageKey() { return 'statto-report-lines::' + REPORT.teamName; }

// ---------- Data Editor: per-pass / per-block film annotations ----------
// The Data Editor (a tab built in a later phase) lets you step through every
// pass on a game's field diagram and tag it with descriptive attributes plus
// a video timestamp, for querying later ("all inside-flick turnovers", "% of
// turnovers that were around backhands", each deep-linking to the game video).
//
// Tags are modelled as several small, orthogonal fields rather than one flat
// label, so questions compose: "inside flick turnover" is release:inside AND
// hand:flick AND (the base pass is a turnover). Outcome (completed / throwaway
// / drop / assist) already comes from Statto, so these fields are purely
// descriptive. Vocabularies are fixed built-ins (below); values are stored as
// plain strings, so the lists can grow later without a data migration.
const ANNOTATION_VOCAB = {
  hand: ['Backhand', 'Offhand backhand', 'Flick', 'Hammer', 'Scoober', 'Other'],
  release: ['Forceside', 'Breakside around', 'Breakside inside', 'Over-the-top', 'Unmarked'],
  distance: ['Reset', 'Under', 'Upline', 'Away', 'Huck', 'Other'],
  stall: ['Low', 'Mid', 'High'],
  // only meaningful when the base pass is a turnover
  turnoverReason: ['Underthrown', 'Overthrown', 'Thrown OB', 'Into poach', 'Into doublecoverage', 'Miscommunication', 'Hand/foot blocked', 'Receiver not open', 'Drop'],
  catch: ['Uncontested', 'Contested', 'Layout/difficult'],
  highlight: ['Crazy highlight', 'Normal highlight'],
};

// Longer wording for a dropdown, where the stored value alone doesn't say
// enough. Only the *label* changes -- the value written to an annotation stays
// the short string, so games tagged before this existed keep matching, the
// keyboard presets keep working, and compact places (the film strip, the query
// result tags) stay readable.
const VOCAB_LABELS = {
  stall: {
    'Low': 'Low (< stall 3)',
    'Mid': 'Mid (stall 3–7)',
    'High': 'High (stall > 7)',
  },
};
function vocabLabel(field, value) {
  const map = VOCAB_LABELS[field];
  return (map && map[value]) || value;
}

// Defensive blocks (Ds) get their own small vocab.
const BLOCK_VOCAB = {
  type: ['Layout/run-through D', 'Hand/foot block', 'Sky/boxout', 'Help/poach D', 'Stall D', 'Stand still D', 'Reset D'],
};
// Number-key shortcuts for the throws that come up over and over, so the
// common case is one keystroke instead of five dropdowns. Each also stamps the
// video time 2s back (see applyPreset). The on-screen legend is generated from
// this object, so the keys and their descriptions can't drift apart.
const TAG_PRESETS = {
  '1': {
    label: 'Flick under',
    tags: { hand: 'Flick', release: 'Forceside', distance: 'Under', stall: 'Mid', catch: 'Uncontested' },
  },
  '2': {
    label: 'Backhand reset',
    tags: { hand: 'Backhand', distance: 'Reset', stall: 'High', catch: 'Uncontested' },
  },
  '3': {
    label: 'Break reset',
    tags: { hand: 'Backhand', release: 'Breakside around', distance: 'Reset', stall: 'High', catch: 'Uncontested' },
  },
};
const TAG_PRESET_FIELD_LABELS = {
  hand: 'Hand', release: 'Release', distance: 'Distance', stall: 'Stall', catch: 'Catch',
};

// Point-level: our defensive scheme while the opponent is on offence, and how
// the opponent gave the disc back when it wasn't one of our blocks.
const POINT_VOCAB = {
  defScheme: ['Zone', 'Force forehand', 'Force backhand', 'Force return'],
  oppTurnover: ['Huck turnover', 'Throwing error', 'Receiver error'],
};

function annotationsStorageKey() { return 'statto-report-annotations::' + REPORT.teamName; }

// Annotation store shape (one localStorage entry for the team):
//   { version, teamName,
//     passes:  { <passUUID>:  { hand, release, distance, stall, turnoverReason: [..], catch, timestamp, notes } },
//     blocks:  { <blockUUID>: { type, timestamp, notes } },
//     points:  { <pointUUID>: { defScheme } } }
// turnoverReason is an array (a turnover can have more than one cause at
// once, e.g. "Too far" AND "Into doublecoverage") -- every other tag field is
// a single value. Every field is optional -- a pass with only a timestamp, or
// only a hand, is valid. Annotations for a UUID no longer present in the report (e.g. a game
// was re-logged) are kept rather than dropped, so nothing is silently lost.
const ANNOTATIONS_SCHEMA_VERSION = 1;

function loadAnnotations() {
  try {
    const raw = localStorage.getItem(annotationsStorageKey());
    if (!raw) return { passes: {}, blocks: {}, points: {} };
    const parsed = JSON.parse(raw);
    return {
      passes: (parsed && parsed.passes && typeof parsed.passes === 'object') ? parsed.passes : {},
      blocks: (parsed && parsed.blocks && typeof parsed.blocks === 'object') ? parsed.blocks : {},
      points: (parsed && parsed.points && typeof parsed.points === 'object') ? parsed.points : {},
    };
  } catch (e) { return { passes: {}, blocks: {}, points: {} }; }
}

function saveAnnotations(data) {
  try {
    localStorage.setItem(annotationsStorageKey(), JSON.stringify({
      version: ANNOTATIONS_SCHEMA_VERSION,
      teamName: REPORT.teamName,
      passes: data.passes || {},
      blocks: data.blocks || {},
      points: data.points || {},
    }));
  } catch (e) {}
}

// Merge an incoming {uuid: {field: value}} store into a target one, per-field
// (not per-record), so two taggers who annotated the same pass with different
// fields both survive; on a same-field conflict the incoming value wins.
function mergeAnnotationStore(target, incoming) {
  if (!incoming || typeof incoming !== 'object') return;
  Object.keys(incoming).forEach(uuid => {
    const rec = incoming[uuid];
    if (!rec || typeof rec !== 'object') return;
    target[uuid] = Object.assign({}, target[uuid], rec);
  });
}

// Pull the video id out of the game's Set up link -- handles youtu.be/ID,
// youtube.com/watch?v=ID, /embed/ID and /shorts/ID (with any extra params).
function parseYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url, location.href);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?#]+)/);
    return m ? m[2] : null;
  } catch (e) { return null; }
}

// The YouTube IFrame Player API is an external script -- only loaded here, on
// the Data Editor, and only when a game actually has a video link. Everything
// else in the report stays offline/self-contained; this is the one live-only
// convenience (agreed for the editor, which is used while watching film).
let _ytApiState = 'idle'; // idle | loading | ready
const _ytReadyCbs = [];
function ensureYouTubeAPI(cb) {
  if (window.YT && window.YT.Player) { cb(); return; }
  _ytReadyCbs.push(cb);
  if (_ytApiState !== 'idle') return;
  _ytApiState = 'loading';
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (typeof prev === 'function') prev();
    _ytApiState = 'ready';
    _ytReadyCbs.splice(0).forEach(f => { try { f(); } catch (e) {} });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

function formatTimestamp(sec) {
  if (sec == null || isNaN(sec)) return '';
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = (h ? String(m).padStart(2, '0') : String(m));
  return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
}
// Accepts "h:mm:ss", "mm:ss", or plain seconds; returns whole seconds or null.
function parseTimestamp(str) {
  if (str == null) return null;
  str = String(str).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const parts = str.split(':').map(p => p.trim());
  if (!parts.every(p => /^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + parseInt(p, 10), 0);
}

// Bakes the current localStorage data (setup + lines + annotations, all scoped
// to this team) into a fresh copy of the pristine report HTML and downloads it.
// The injected seed runs before the main report script.
//
// By default a key is written only if the recipient doesn't already have it, so
// opening the file never clobbers their own work on the same team. But in a
// team (viewer) report the recipient can ONLY edit lines -- Set up is hidden and
// the Data Editor is read-only -- so the setup config (tournaments, video links,
// photos) and the annotations are the sharer's alone. Those are force-refreshed
// on every open, otherwise a browser that opened an older team report keeps its
// stale setup blob forever and never picks up newly added video links, photos or
// tags (the missing "Watch"/timestamp links being the visible symptom). Lines
// stay non-destructive in every build; annotations stay non-destructive on a
// tagging page, where the recipient is the one creating them.
function buildDistributableHtml(opts) {
  opts = opts || {};
  const seed = {};
  [setupStorageKey(), linesStorageKey(), annotationsStorageKey()].forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) seed[k] = v;
  });
  const forceKeys = opts.viewer ? [setupStorageKey(), annotationsStorageKey()] : [];
  // < keeps any "<" in the data (e.g. a stray character in a label) from
  // being read as markup once this sits inside a <script> tag.
  const seedJson = JSON.stringify(seed).replace(/</g, '\\u003c');
  const forceJson = JSON.stringify(forceKeys).replace(/</g, '\\u003c');
  let inject = '<script>(function(){try{var d=' + seedJson + ',f=' + forceJson +
    ';for(var k in d){if(f.indexOf(k)>=0||localStorage.getItem(k)===null){localStorage.setItem(k,d[k]);}}}catch(e){}})();<\/script>\n';
  // Mode flags must be set before the report script reads VIEWER_MODE / TAGONLY_GAME.
  if (opts.viewer) inject = '<script>window.__STATTO_VIEWER__=true;<\/script>\n' + inject;
  if (opts.tagOnlyGame != null) inject = '<script>window.__STATTO_TAGONLY_GAME__=' + Number(opts.tagOnlyGame) + ';<\/script>\n' + inject;
  const marker = '<script id="report-data"';
  let html = PRISTINE_DOC_HTML;
  return html.indexOf(marker) !== -1
    ? html.replace(marker, inject + marker)
    : html.replace('<\/body>', inject + '<\/body>');
}

// Locked-down viewer for the team -- Set up hidden, Data Editor reduced to a
// read-only "Film Clips" browser (Line Analysis stays editable).
function publishForTeam() {
  downloadFile(buildDistributableHtml({ viewer: true }), slug(REPORT.teamName) + '_team_report.html', 'text/html;charset=utf-8;');
}

// ---------- Export / import ALL custom data (Set up tab) ----------
// Everything a user adds on top of the generated report -- tournament names,
// per-game video links, player photos, curated lines, and every video-tagging
// annotation -- lives in exactly these three localStorage keys. This bundles
// all three into one file (and restores from it) so a season's worth of setup
// and tagging can be backed up, or moved onto a freshly regenerated report,
// in a single step.
const CUSTOM_DATA_VERSION = 1;
function customDataSections() {
  return [
    { name: 'setup', key: setupStorageKey(), label: 'tournaments, video links & photos' },
    { name: 'lines', key: linesStorageKey(), label: 'curated lines' },
    { name: 'annotations', key: annotationsStorageKey(), label: 'video tags' },
  ];
}
function buildCustomDataBundle() {
  const bundle = {
    statto: 'custom-data', version: CUSTOM_DATA_VERSION,
    teamName: REPORT.teamName, exportedAt: new Date().toISOString(),
  };
  customDataSections().forEach(({ name, key }) => {
    const raw = localStorage.getItem(key);
    let val = null;
    if (raw) { try { val = JSON.parse(raw); } catch (e) { val = null; } }
    bundle[name] = val;
  });
  return bundle;
}
function exportAllCustomData() {
  downloadFile(JSON.stringify(buildCustomDataBundle(), null, 2),
    slug(REPORT.teamName) + '_custom_data.json', 'application/json');
}
// Rewrites each present section under THIS report's storage keys (not the
// file's), so a bundle exported before a regenerate still lands even if the
// team name changed. Reloads afterwards so every tab rebuilds from the
// imported data rather than trying to live-patch each one.
function importAllCustomData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); } catch (e) { alert('That file isn’t valid JSON.'); return; }
    if (!parsed || parsed.statto !== 'custom-data') {
      alert('That doesn’t look like a Statto “custom data” export.');
      return;
    }
    const present = customDataSections().filter(({ name }) => parsed[name] && typeof parsed[name] === 'object');
    if (!present.length) { alert('That file has no custom data in it.'); return; }
    const teamNote = (parsed.teamName && parsed.teamName !== REPORT.teamName)
      ? `\n\nNote: this file was exported from “${parsed.teamName}”, but this report is “${REPORT.teamName}”. Import anyway only if it’s the same team.`
      : '';
    const ok = window.confirm(
      'Import custom data (' + present.map(p => p.label).join(', ') + ')?\n\n' +
      'This replaces the matching data currently saved in this browser, then reloads the page. ' +
      'Export a backup first if you might want the current data back.' + teamNote
    );
    if (!ok) return;
    present.forEach(({ name, key }) => {
      try { localStorage.setItem(key, JSON.stringify(parsed[name])); } catch (e) {}
    });
    location.reload();
  };
  reader.readAsText(file);
}

// A stripped page for one game: only the Data Editor, locked to that game, for
// handing to a helper to do the video tagging. They export their annotations
// JSON and send it back; it's re-imported per game on the Set up tab.
function downloadGameTaggingPage(gameIndex) {
  const g = REPORT.games[gameIndex];
  downloadFile(buildDistributableHtml({ tagOnlyGame: gameIndex }),
    slug(REPORT.teamName) + '_tag_' + slug(g.opponent) + '.html', 'text/html;charset=utf-8;');
}

// The pass/block UUIDs that belong to one game -- used to (a) count how much of
// a game is tagged and (b) filter a re-imported annotations file to just that
// game, so a mis-sent file can't pollute other games.
function gameAnnotationUUIDs(gameIndex) {
  const set = new Set();
  const g = REPORT.games[gameIndex];
  (g.points || []).forEach(pt => {
    (pt.passes || []).forEach(p => { if (p.uuid) set.add(p.uuid); });
    (pt.blocks || []).forEach(b => { if (b.uuid) set.add(b.uuid); });
  });
  return set;
}
function gameTaggedCount(gameIndex) {
  const ann = loadAnnotations();
  let n = 0;
  gameAnnotationUUIDs(gameIndex).forEach(uuid => { if (ann.passes[uuid] || ann.blocks[uuid]) n++; });
  return n;
}
function importGameAnnotationsFile(gameIndex, file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      // Allow this game's pass/block UUIDs plus its per-possession defensive-
      // scheme keys ("<pointUUID>#d<n>"), so a wrong file can't touch others.
      const allowed = gameAnnotationUUIDs(gameIndex);
      (REPORT.games[gameIndex].points || []).forEach(pt => {
        if (!pt.uuid) return;
        for (let d = 1; d <= (pt.defensivePossessions || 0); d++) {
          allowed.add(pt.uuid + '#d' + d);
          allowed.add(pt.uuid + '#o' + d);
        }
        allowed.add(pt.uuid + '#pull');
      });
      const ann = loadAnnotations();
      let n = 0;
      const merge = (target, incoming) => {
        if (!incoming || typeof incoming !== 'object') return;
        Object.keys(incoming).forEach(uuid => {
          if (!allowed.has(uuid) || !incoming[uuid]) return;
          target[uuid] = Object.assign({}, target[uuid], incoming[uuid]);
          n++;
        });
      };
      merge(ann.passes, parsed.passes);
      merge(ann.blocks, parsed.blocks);
      merge(ann.points, parsed.points);
      saveAnnotations(ann);
      onDone(n);
    } catch (e) { alert('Could not read that annotations file.'); }
  };
  reader.readAsText(file);
}

// Both curated lines and any custom tournament names travel together --
// one localStorage entry, and one exported lines.json covers both.
// tournamentLabels maps tournament id -> user-chosen name (absent = use the
// default date-based label); files saved before this field existed just
// come back with an empty map.
function loadLinesData() {
  try {
    const raw = localStorage.getItem(linesStorageKey());
    if (!raw) return { lines: [], tournamentLabels: {} };
    const parsed = JSON.parse(raw);
    return {
      lines: (parsed && Array.isArray(parsed.lines)) ? parsed.lines : [],
      tournamentLabels: (parsed && parsed.tournamentLabels && typeof parsed.tournamentLabels === 'object') ? parsed.tournamentLabels : {},
    };
  } catch (e) { return { lines: [], tournamentLabels: {} }; }
}

function saveLinesData(lines, tournamentLabels) {
  try {
    localStorage.setItem(linesStorageKey(), JSON.stringify({ version: LINES_SCHEMA_VERSION, teamName: REPORT.teamName, lines, tournamentLabels }));
  } catch (e) {}
}

function newLineId() { return 'line-' + Math.random().toString(36).slice(2, 10); }

// Every point across the season with a full 7-person lineup recorded, tagged
// with its stable identity. Points with a partial lineup (missing data) are
// excluded from auto-detection but still surfaced separately so they aren't
// silently invisible. gameIndexFilter (array/Set of game indices) restricts
// this to one tournament's games; omit it for the whole season.
function getAllFullLineupPoints(gameIndexFilter) {
  const allowed = gameIndexFilter ? new Set(gameIndexFilter) : null;
  const out = [];
  REPORT.games.forEach((game, gameIndex) => {
    if (allowed && !allowed.has(gameIndex)) return;
    (game.points || []).forEach(pt => {
      const names = (pt.lineup || []).map(e => e.player);
      if (names.length === 7) {
        out.push({ gameIndex, pointNumber: pt.number, lineupNames: names.slice().sort() });
      }
    });
  });
  return out;
}

function lineupOverlapCount(a, b) {
  const setB = new Set(b);
  let n = 0;
  a.forEach(name => { if (setB.has(name)) n++; });
  return n;
}

// A line's roster caption is recomputed from its *current* pointKeys every
// render (rather than trusting a seedLineup captured once at creation time)
// so it stays accurate as points are added/removed via the matrix picker --
// the most common exact 7-name lineup among the line's points, which is a
// reasonable "what is this line" label even if manual edits mixed in a few
// points with a slightly different roster (a sub, an injury, etc.).
function modeLineupForKeys(keys) {
  const counts = new Map(); // signature -> { count, names }
  keys.forEach(key => {
    const [giStr, pnStr] = key.split('|');
    const game = REPORT.games[Number(giStr)];
    const pt = game && (game.points || []).find(p => p.number === Number(pnStr));
    const names = pt ? (pt.lineup || []).map(e => e.player).sort() : [];
    if (names.length !== 7) return;
    const sig = names.join('|');
    const entry = counts.get(sig) || { count: 0, names };
    entry.count++;
    counts.set(sig, entry);
  });
  let best = null;
  counts.forEach(entry => { if (!best || entry.count > best.count) best = entry; });
  return best ? best.names : [];
}

// Who actually played on a line and how often: for each of the line's points,
// count every player in that point's lineup. Returns the point total and a
// name -> points-present map, so a caller can show "on 12 of 14 points (86%)".
// Uses the line's full point set (not the compare-tab games filter), so a
// line's roster reads the same however the comparison below it is scoped.
function lineRosterPresence(pointKeys) {
  let total = 0;
  const counts = new Map();
  pointKeys.forEach(key => {
    const [giStr, pnStr] = key.split('|');
    const game = REPORT.games[Number(giStr)];
    const pt = game && (game.points || []).find(p => p.number === Number(pnStr));
    if (!pt) return;
    total++;
    new Set((pt.lineup || []).map(e => e.player)).forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
  });
  return { total, counts };
}

// Permissive enough that a line which occasionally subs a player or two
// still gets grouped rather than fragmenting into many near-duplicate
// candidates. Previously an adjustable toggle in the UI; fixed now since
// changing it had no visible effect on its own (only the button that
// consumed it did), which read as a broken control rather than a real one.
const LINE_DETECT_THRESHOLD = 5;

// Greedy grouping: each still-unassigned exact lineup is compared against
// each existing group's fixed *seed* lineup (not pairwise across every point
// already in the group) -- sharing >=N of 7 players isn't a transitive
// relation (A~B, B~C doesn't imply A~C), so comparing against one fixed
// reference point per group is what keeps this well-defined.
function autoDetectLines(threshold, claimedKeys, gameIndexFilter) {
  const claimed = claimedKeys || new Set();
  const allPoints = getAllFullLineupPoints(gameIndexFilter).filter(p => !claimed.has(pointKey(p.gameIndex, p.pointNumber)));

  const byExact = new Map(); // sorted-lineup key -> { lineupNames, points }
  allPoints.forEach(p => {
    const key = p.lineupNames.join('|');
    if (!byExact.has(key)) byExact.set(key, { lineupNames: p.lineupNames, points: [] });
    byExact.get(key).points.push(p);
  });
  const exactLineups = [...byExact.values()].sort((a, b) => b.points.length - a.points.length);

  const groups = [];
  exactLineups.forEach(entry => {
    let target = null;
    for (const g of groups) {
      if (lineupOverlapCount(entry.lineupNames, g.seedLineup) >= threshold) { target = g; break; }
    }
    if (!target) {
      target = { seedLineup: entry.lineupNames, points: [] };
      groups.push(target);
    }
    target.points.push(...entry.points);
  });

  return groups.map(g => {
    const freq = new Map();
    g.points.forEach(p => p.lineupNames.forEach(n => freq.set(n, (freq.get(n) || 0) + 1)));
    const playerFrequency = [...freq.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const gameCount = new Set(g.points.map(p => p.gameIndex)).size;
    return {
      seedLineup: g.seedLineup,
      pointKeys: g.points.map(p => pointKey(p.gameIndex, p.pointNumber)),
      count: g.points.length,
      gameCount,
      playerFrequency,
    };
  }).sort((a, b) => b.count - a.count);
}

function resolveLinePoints(pointKeys, selectedGameIndices) {
  const gameSet = new Set(selectedGameIndices);
  const out = [];
  pointKeys.forEach(key => {
    const [giStr, pnStr] = key.split('|');
    const gameIndex = Number(giStr), pointNumber = Number(pnStr);
    if (!gameSet.has(gameIndex)) return;
    const game = REPORT.games[gameIndex];
    const pt = game && (game.points || []).find(p => p.number === pointNumber);
    if (pt) out.push({ gameIndex, point: pt });
  });
  return out;
}

function emptyLineTypeBucket() {
  return { throws: 0, completions: 0, huckAttempts: 0, huckCompletions: 0, blocks: 0, oppTurnovers: 0, redZoneEntries: 0, redZoneConversions: 0 };
}

// Mirrors the same per-point formulas statto_report/stats.py uses in
// _build_point_log / _build_game_summary (huck/red-zone/hold/break
// definitions, combined/offense/defense line-type bucketing, scoring
// efficiency modes) -- just applied here, in JS, to an arbitrary point subset
// (a named line's points) instead of "this game, bucketed by offense/defense-
// starting point."
//
// Known approximation: per-possession scoring efficiency is reconstructed by
// grouping each point's passes by their `possession` number, since the JSON
// doesn't expose a standalone possession count. A possession that ended with
// zero throws (an immediate stall-out) leaves no trace in `pt.passes` and so
// isn't counted -- rare enough in practice not to justify a new Python-side
// field just for this one nested toggle mode.
function computeLineStats(pointKeys, selectedGameIndices) {
  const points = resolveLinePoints(pointKeys, selectedGameIndices).map(r => r.point);

  const buckets = { combined: emptyLineTypeBucket(), offense: emptyLineTypeBucket(), defense: emptyLineTypeBucket() };
  let offensePlayed = 0, defensePlayed = 0;
  let cleanHolds = 0, dirtyHolds = 0, breaks = 0, cleanBreaks = 0, pointsWon = 0;
  let assistAttempts = 0, assists = 0;
  let leverageSum = 0;
  const ppNumer = { total: 0, offense: 0, defense: 0 };
  const ppDenom = { total: 0, offense: 0, defense: 0 };
  // Throw counts of individual possessions, kept as raw samples so the compare
  // table can draw their distribution rather than just an average.
  const scoringPossThrows = [];
  const turnoverPossThrows = [];

  points.forEach(pt => {
    const isOffense = !!pt.isOffense;
    const scored = !!pt.scored;
    const passes = pt.passes || [];
    const hadTurnover = passes.some(p => p.turnover);
    const bucketKey = isOffense ? 'offense' : 'defense';

    if (isOffense) {
      offensePlayed++;
      if (scored) { if (hadTurnover) dirtyHolds++; else cleanHolds++; }
    } else {
      defensePlayed++;
      if (scored) { breaks++; if (!hadTurnover) cleanBreaks++; }
    }
    if (scored) pointsWon++;
    leverageSum += (pt.leverage || 0);

    let ptThrows = 0, ptCompletions = 0, ptHuckAttempts = 0, ptHuckCompletions = 0;
    const assistPass = passes.find(p => p.assist);
    passes.forEach(p => {
      ptThrows++;
      if (!p.turnover) ptCompletions++;
      const gain = (p.startY - p.endY) * FIELD_LENGTH_YD_JS;
      if (gain >= IMPACT_HUCK_YD) { ptHuckAttempts++; if (!p.turnover) ptHuckCompletions++; }
      if (p.endY < ENDZONE_FRAC) { assistAttempts++; if (p.assist) assists++; }
    });

    const ptBlocks = (pt.blocks || []).length;
    const ptOppTurnovers = ptBlocks + (pt.oppositionErrors || 0);
    const enteredRedZone = passes.some(p => p.startY > ENDZONE_FRAC && p.startY <= RED_ZONE_FAR);
    const ptRedZoneConversion = !!(enteredRedZone && scored && assistPass && assistPass.startY <= RED_ZONE_FAR);

    [buckets.combined, buckets[bucketKey]].forEach(b => {
      b.throws += ptThrows;
      b.completions += ptCompletions;
      b.huckAttempts += ptHuckAttempts;
      b.huckCompletions += ptHuckCompletions;
      b.blocks += ptBlocks;
      b.oppTurnovers += ptOppTurnovers;
      if (enteredRedZone) b.redZoneEntries++;
      if (ptRedZoneConversion) b.redZoneConversions++;
    });

    const byPoss = new Map();
    passes.forEach(p => {
      if (!byPoss.has(p.possession)) byPoss.set(p.possession, []);
      byPoss.get(p.possession).push(p);
    });
    byPoss.forEach(possPasses => {
      const last = possPasses[possPasses.length - 1];
      const possScored = !!(last && last.assist);
      ppDenom.total++; if (possScored) ppNumer.total++;
      ppDenom[bucketKey]++; if (possScored) ppNumer[bucketKey]++;
      // How long a possession ran before it ended, split by how it ended.
      // A possession that neither scored nor turned (the point ended around it,
      // or the log stops) belongs to neither distribution.
      if (possScored) scoringPossThrows.push(possPasses.length);
      else if (last && last.turnover) turnoverPossThrows.push(possPasses.length);
    });
  });

  function pct(numer, denom) { return denom ? Math.round((100 * numer / denom) * 100) / 100 : null; }
  function eff(numer, denom) { return { numer, denom, pct: pct(numer, denom) }; }
  function lineTypeSummary(b) {
    return {
      throws: b.throws, throwCompletions: b.completions, throwCompletionPct: pct(b.completions, b.throws),
      huckAttempts: b.huckAttempts, huckCompletions: b.huckCompletions, huckCompletionPct: pct(b.huckCompletions, b.huckAttempts),
      blocks: b.blocks, opponentTurnovers: b.oppTurnovers,
      redZoneEntries: b.redZoneEntries, redZoneConversions: b.redZoneConversions, redZoneRate: pct(b.redZoneConversions, b.redZoneEntries),
    };
  }

  const totalPoints = offensePlayed + defensePlayed;
  const holds = cleanHolds + dirtyHolds;
  const combined = buckets.combined;

  return {
    pointsPlayed: points.length,
    avgLeverage: points.length ? Math.round((leverageSum / points.length) * 100) / 100 : null,
    offensePlayed, defensePlayed,
    holds, holdRate: pct(holds, offensePlayed),
    breaks, breakRate: pct(breaks, defensePlayed),
    pointsWon, pointsWonRate: pct(pointsWon, points.length),
    throws: combined.throws, throwCompletions: combined.completions, throwCompletionPct: pct(combined.completions, combined.throws),
    huckAttempts: combined.huckAttempts, huckCompletions: combined.huckCompletions, huckCompletionPct: pct(combined.huckCompletions, combined.huckAttempts),
    assistAttempts, assists, assistCompletionPct: pct(assists, assistAttempts),
    scoringPossThrows, turnoverPossThrows,
    blocks: combined.blocks, oppTurnovers: combined.oppTurnovers,
    redZoneEntries: combined.redZoneEntries, redZoneConversions: combined.redZoneConversions, redZoneRate: pct(combined.redZoneConversions, combined.redZoneEntries),
    lineStats: { combined: lineTypeSummary(buckets.combined), offense: lineTypeSummary(buckets.offense), defense: lineTypeSummary(buckets.defense) },
    scoringEfficiency: {
      perPoint: {
        total: eff(holds + breaks, totalPoints),
        offense: eff(holds, offensePlayed),
        defense: eff(breaks, defensePlayed),
      },
      perPossession: {
        total: eff(ppNumer.total, ppDenom.total),
        offense: eff(ppNumer.offense, ppDenom.offense),
        defense: eff(ppNumer.defense, ppDenom.defense),
      },
      firstPossession: {
        total: eff(cleanHolds + cleanBreaks, totalPoints),
        offense: eff(cleanHolds, offensePlayed),
        defense: eff(cleanBreaks, defensePlayed),
      },
    },
  };
}

// Line Analysis's own version of gatherAllPassesTagged/gatherAllBlocksTagged:
// scoped to a fixed set of points (a line's assigned points) rather than an
// offense/defense filter, since a line's diagram should include every pass
// in its points regardless of thrower/receiver identity.
function gatherLinePassesTagged(pointKeys, selectedGameIndices) {
  const out = [];
  resolveLinePoints(pointKeys, selectedGameIndices).forEach(({ gameIndex, point }) => {
    (point.passes || []).forEach(p => out.push({ pass: p, gameIndex }));
  });
  return out;
}
function gatherLineBlocksTagged(pointKeys, selectedGameIndices) {
  const out = [];
  resolveLinePoints(pointKeys, selectedGameIndices).forEach(({ gameIndex, point }) => {
    (point.blocks || []).forEach(b => out.push({ block: b, gameIndex }));
  });
  return out;
}
function computeLineFieldData(pointKeys, selectedGameIndices, categories) {
  const tagged = gatherLinePassesTagged(pointKeys, selectedGameIndices);
  const passes = filterTaggedByCategory(tagged, categories);
  const blocks = categories.has('blocks') ? gatherLineBlocksTagged(pointKeys, selectedGameIndices) : [];
  return { passes, blocks };
}

// ---------- Possession-length histogram (Line Analysis compare table) ----------
// Buckets are 1..9 throws then "10+", fixed rather than data-driven so the
// same bar means the same thing in every column of the row.
const POSS_HISTO_BUCKETS = 10;
function possHistoCounts(values) {
  const counts = new Array(POSS_HISTO_BUCKETS).fill(0);
  (values || []).forEach(n => {
    const i = Math.min(Math.max(n, 1), POSS_HISTO_BUCKETS) - 1;
    counts[i]++;
  });
  return counts;
}
function medianOf(values) {
  if (!values || !values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
// `allSeries` is every column's raw sample array for this row. Bars are drawn as
// a share of that line's own possessions (lines play different numbers of
// points, so raw counts would just show who played more), on a y-scale shared
// across the row so the columns can be read against each other.
function buildPossHistogram(values, allSeries, color) {
  const counts = possHistoCounts(values);
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return el('span', { class: 'histo-empty' }, [document.createTextNode('–')]);

  let maxShare = 0;
  (allSeries || []).forEach(series => {
    const c = possHistoCounts(series);
    const t = c.reduce((a, b) => a + b, 0);
    if (t) c.forEach(v => { maxShare = Math.max(maxShare, v / t); });
  });
  if (!maxShare) maxShare = 1;

  const W = 132, H = 46, gap = 2;
  const barW = (W - gap * (POSS_HISTO_BUCKETS - 1)) / POSS_HISTO_BUCKETS;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H + 12}`, width: W, height: H + 12, class: 'histo-svg' });
  counts.forEach((n, i) => {
    const share = n / total;
    const h = Math.max(n ? 1.5 : 0, (share / maxShare) * H);
    const x = i * (barW + gap);
    const rect = svgEl('rect', {
      x, y: H - h, width: barW, height: h, rx: 1.5,
      fill: color, opacity: n ? 0.9 : 0.16,
    });
    const title = svgEl('title', {});
    const label = (i === POSS_HISTO_BUCKETS - 1) ? '10+ throws' : `${i + 1} throw${i ? 's' : ''}`;
    title.textContent = `${label}: ${n} possession${n === 1 ? '' : 's'} (${Math.round(share * 100)}%)`;
    rect.appendChild(title);
    svg.appendChild(rect);
  });
  svg.appendChild(svgEl('line', {
    x1: 0, y1: H + 0.5, x2: W, y2: H + 0.5,
    stroke: 'rgba(var(--chalk-rgb),0.25)', 'stroke-width': 1,
  }));
  [[0, '1'], [4, '5'], [9, '10+']].forEach(([i, txt]) => {
    const t = svgEl('text', {
      x: i * (barW + gap) + barW / 2, y: H + 10, 'text-anchor': 'middle',
      'font-size': 7, fill: 'var(--chalk-dim)', 'font-family': 'ui-monospace, monospace',
    });
    t.textContent = txt;
    svg.appendChild(t);
  });

  const med = medianOf(values);
  return el('div', { class: 'histo-cell' }, [
    svg,
    el('div', { class: 'histo-foot' }, [document.createTextNode(`median ${med} · n=${total}`)]),
  ]);
}

const LINE_ROWS = [
  { label: 'Points played', get: l => l.pointsPlayed },
  { label: 'Avg point leverage', get: l => l.avgLeverage },
  { label: 'Offensive points', get: l => l.offensePlayed },
  { label: 'Defensive points', get: l => l.defensePlayed },
  { label: 'Points won', main: l => fmtPct(l.pointsWonRate), sub: l => `${l.pointsWon}/${l.pointsPlayed}` },
  { label: 'Hold rate', main: l => fmtPct(l.holdRate), sub: l => `${l.holds}/${l.offensePlayed}` },
  { label: 'Break rate', main: l => fmtPct(l.breakRate), sub: l => `${l.breaks}/${l.defensePlayed}` },
  { label: 'Throw completion', main: l => fmtPct(l.throwCompletionPct), sub: l => `${l.throwCompletions}/${l.throws}` },
  { label: 'Huck completion', main: l => fmtPct(l.huckCompletionPct), sub: l => `${l.huckCompletions}/${l.huckAttempts}` },
  { label: 'Assist completion', main: l => fmtPct(l.assistCompletionPct), sub: l => `${l.assists}/${l.assistAttempts}` },
  { label: 'Blocks', get: l => l.blocks },
  { label: 'Opponent turnovers', get: l => l.oppTurnovers },
  { label: 'Red zone conversion', main: l => fmtPct(l.redZoneRate), sub: l => `${l.redZoneConversions}/${l.redZoneEntries}` },
  {
    label: 'Throws per scoring possession',
    render: (l, all) => buildPossHistogram(l.scoringPossThrows, all.map(x => x.scoringPossThrows), 'var(--good)'),
  },
  {
    label: 'Throws per turnover possession',
    render: (l, all) => buildPossHistogram(l.turnoverPossThrows, all.map(x => x.turnoverPossThrows), 'var(--bad)'),
  },
];

function buildLineAnalysisSection() {
  const section = el('section', { class: 'view', id: 'line-analysis' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Line Analysis')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Detect recurring 7-person lineups, name them, then compare them like players.')]));

  // Tournaments are now configured on the Set up tab (getTournaments); this
  // tab just consumes them. Labels live there too, so there's no rename UI
  // here anymore.
  const TOURNAMENTS = getTournaments();
  const savedData = loadLinesData();
  let lines = savedData.lines;
  // Carried through save/import untouched so any pre-existing custom labels in
  // an older lines.json aren't destroyed, even though they're no longer edited here.
  let tournamentLabels = savedData.tournamentLabels;
  let selectedGames = REPORT.games.map((g, i) => i);
  // Rosters often differ tournament to tournament, so a line's identity can
  // either span the whole season ('across', tournamentId: null on the line)
  // or be scoped to one tournament at a time ('within', tagged with that
  // tournament's id) -- see currentScopes(). Lines from both modes coexist
  // in `lines`; only the current mode's subset is shown/edited at once.
  let scopeMode = 'across';
  let selectedTournamentIds = TOURNAMENTS.map(t => t.id);

  const modeControlsRow = el('div', { class: 'controls-row' }, []);
  const tournamentSelectorHolder = el('div', {}, []);
  modeControlsRow.appendChild(buildToggle('Across Tournaments', 'Within Tournament', (which) => {
    scopeMode = which === 'a' ? 'across' : 'within';
    renderTournamentSelector();
    renderAll();
  }));
  modeControlsRow.appendChild(tournamentSelectorHolder);
  section.appendChild(modeControlsRow);

  const managementWrap = el('div', { class: 'line-mgmt' }, []);
  const compareWrap = el('div', {}, []);
  // Teammates come here to read the comparison, not to curate lines, so in the
  // published report the line-picking panel drops below it. In the editing
  // report the picker is the job, so it stays on top.
  if (VIEWER_MODE) {
    section.appendChild(compareWrap);
    section.appendChild(managementWrap);
  } else {
    section.appendChild(managementWrap);
    section.appendChild(compareWrap);
  }

  function renderTournamentSelector() {
    tournamentSelectorHolder.innerHTML = '';
    if (scopeMode !== 'within') return;
    tournamentSelectorHolder.appendChild(buildPlayerSelector((labels) => {
      selectedTournamentIds = TOURNAMENTS.filter(t => labels.includes(tournamentDisplay(t))).map(t => t.id);
      renderAll();
    }, {
      maxPlayers: Infinity, defaultAll: true, includeSelectAll: true, roleLabel: 'Tournament',
      items: TOURNAMENTS.map(t => tournamentDisplay(t)),
      initialSelected: TOURNAMENTS.filter(t => selectedTournamentIds.includes(t.id)).map(t => tournamentDisplay(t)),
    }));
  }

  // In across-mode there's one pseudo-scope covering the whole season; in
  // within-mode there's one real scope per selected tournament, each with
  // its own independently detected/managed/compared set of lines.
  function currentScopes() {
    if (scopeMode === 'across') return [{ tournament: null, tournamentId: null, gameIndices: null }];
    return TOURNAMENTS.filter(t => selectedTournamentIds.includes(t.id))
      .map(t => ({ tournament: t, tournamentId: t.id, gameIndices: t.gameIndices }));
  }

  function claimedKeySet() {
    const s = new Set();
    lines.forEach(l => l.pointKeys.forEach(k => s.add(k)));
    return s;
  }
  function persist() { saveLinesData(lines, tournamentLabels); }
  function renderAll() { renderManagement(); renderCompare(); }

  // The tournament's configured label from the Set up tab.
  function tournamentDisplay(t) { return t.label; }

  function buildConfirmedLineRow(line) {
    const row = el('div', { class: 'line-confirmed' }, []);
    const nameInput = el('input', { type: 'text', class: 'line-name-input' }, []);
    nameInput.value = line.name;
    nameInput.addEventListener('change', () => {
      line.name = nameInput.value.trim() || line.name;
      persist();
      renderCompare();
    });
    const roster = modeLineupForKeys(line.pointKeys);
    const meta = el('div', { class: 'line-candidate-meta' }, [document.createTextNode(
      `${line.pointKeys.length} point${line.pointKeys.length === 1 ? '' : 's'}` + (roster.length ? ` · most often ${roster.join(', ')}` : '')
    )]);
    const deleteBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Delete line')]);
    deleteBtn.addEventListener('click', () => {
      lines = lines.filter(l => l.id !== line.id);
      persist();
      renderAll();
    });
    row.appendChild(el('div', { class: 'line-confirmed-head' }, [nameInput, deleteBtn]));
    row.appendChild(meta);
    return row;
  }

  // The visual, click-driven replacement for one-point-at-a-time editing:
  // every point in this scope as a row, every player who appears in any of
  // them as a column, a filled dot where that player was on the field for
  // that point. Rows are grouped by exact lineup so a recurring line shows
  // up as an obvious block of matching dot-patterns instead of requiring
  // the detection algorithm to find it first. Click a column header to
  // filter down to points containing that player (stack a few to find an
  // exact combination); click row checkboxes (shift-click for a range) to
  // multi-select, then assign the selection to a new or existing line in
  // one action below. Returns a small API so a caller (the "auto-select"
  // button in buildScopeManagementBlock) can pre-check a detected
  // candidate's points without a full re-render.
  function buildLineupMatrixPicker(scope, scopedLines) {
    const points = getAllFullLineupPoints(scope.gameIndices);
    const freq = new Map();
    points.forEach(p => p.lineupNames.forEach(n => freq.set(n, (freq.get(n) || 0) + 1)));
    const players = [...freq.keys()].sort((a, b) => (freq.get(b) - freq.get(a)) || a.localeCompare(b));

    // Chronological -- game by game, point by point -- rather than grouped
    // by lineup. Finding the recurring group is now the auto-suggested
    // selection's job (below), so the list itself just reads like the log
    // it is.
    const rows = points.slice().sort((a, b) => (a.gameIndex - b.gameIndex) || (a.pointNumber - b.pointNumber));

    const selected = new Set();
    const activeFilters = new Set();
    let lastVisIndex = null;
    let showAssigned = false;

    const wrap = el('div', { class: 'line-matrix-wrap' }, []);
    if (!rows.length) {
      wrap.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No points with a full 7-person lineup in this scope yet.')]));
      return { el: wrap };
    }

    // Default behavior: the biggest not-yet-assigned recurring lineup comes
    // pre-checked, so there's usually nothing to do but confirm it and hit
    // Create -- add or remove individual points first if it's not quite
    // right. Once assigned, that group leaves the (default-filtered)
    // unassigned view and the next call to this function -- after every
    // create/assign/unassign, the whole management block re-renders --
    // suggests whatever's biggest next.
    const suggested = autoDetectLines(LINE_DETECT_THRESHOLD, claimedKeySet(), scope.gameIndices).filter(c => c.count >= 2)[0];
    if (suggested) suggested.pointKeys.forEach(k => selected.add(k));

    const visibilityRow = el('div', { class: 'line-matrix-visibility-row' }, []);
    visibilityRow.appendChild(buildToggle('Unassigned only', 'Show all', (which) => {
      showAssigned = which === 'b';
      renderRows();
    }));
    wrap.appendChild(visibilityRow);

    const bulkBar = el('div', { class: 'line-matrix-bulkbar' }, []);
    const bulkCountEl = el('span', { class: 'line-matrix-bulk-count' }, []);
    const assignSelect = el('select', { class: 'line-point-add-select' }, []);
    const assignBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Add to line')]);
    const newNameInput = el('input', { type: 'text', class: 'line-name-input', placeholder: 'New line name…' }, []);
    const createBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Create line')]);
    const unassignBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Unassign')]);
    const clearBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Clear selection')]);

    function refreshAssignOptions() {
      assignSelect.innerHTML = '';
      assignSelect.appendChild(el('option', { value: '' }, [document.createTextNode(scopedLines.length ? 'Add to existing line…' : 'No existing lines yet')]));
      scopedLines.forEach(l => assignSelect.appendChild(el('option', { value: l.id }, [document.createTextNode(l.name)])));
    }
    refreshAssignOptions();

    function updateBulkBar() {
      const n = selected.size;
      bulkCountEl.textContent = n
        ? `${n} point${n === 1 ? '' : 's'} selected`
        : 'Nothing selected -- check rows below, or click a player column to filter.';
      assignBtn.disabled = !n || !assignSelect.value;
      createBtn.disabled = !n;
      unassignBtn.disabled = !n;
      clearBtn.style.visibility = n ? 'visible' : 'hidden';
    }
    assignSelect.addEventListener('change', updateBulkBar);
    assignBtn.addEventListener('click', () => {
      if (!assignSelect.value || !selected.size) return;
      const keySet = new Set(selected);
      lines.forEach(l => { l.pointKeys = l.pointKeys.filter(k => !keySet.has(k)); });
      const target = lines.find(l => l.id === assignSelect.value);
      if (target) target.pointKeys.push(...keySet);
      persist();
      renderAll();
    });
    createBtn.addEventListener('click', () => {
      const name = newNameInput.value.trim();
      if (!name) { newNameInput.focus(); return; }
      if (!selected.size) return;
      const keySet = new Set(selected);
      lines.forEach(l => { l.pointKeys = l.pointKeys.filter(k => !keySet.has(k)); });
      lines.push({ id: newLineId(), name, seedLineup: modeLineupForKeys([...keySet]), pointKeys: [...keySet], tournamentId: scope.tournamentId });
      persist();
      renderAll();
    });
    unassignBtn.addEventListener('click', () => {
      if (!selected.size) return;
      const keySet = new Set(selected);
      lines.forEach(l => { l.pointKeys = l.pointKeys.filter(k => !keySet.has(k)); });
      persist();
      renderAll();
    });
    clearBtn.addEventListener('click', () => { selected.clear(); renderRows(); });
    bulkBar.appendChild(bulkCountEl);
    bulkBar.appendChild(el('span', { class: 'line-matrix-bulk-group' }, [assignSelect, assignBtn]));
    bulkBar.appendChild(el('span', { class: 'line-matrix-bulk-group' }, [newNameInput, createBtn]));
    bulkBar.appendChild(el('span', { class: 'line-matrix-bulk-group' }, [unassignBtn, clearBtn]));
    wrap.appendChild(bulkBar);

    const table = el('table', { class: 'line-matrix' }, []);
    const thead = el('thead', {}, []);
    const headRow = el('tr', {}, []);
    const selectAllCb = el('input', { type: 'checkbox', title: 'Select all visible rows' }, []);
    selectAllCb.addEventListener('change', () => {
      const visKeys = [...tbody.querySelectorAll('tr')].map(tr => tr.dataset.key);
      visKeys.forEach(k => { if (selectAllCb.checked) selected.add(k); else selected.delete(k); });
      renderRows();
    });
    headRow.appendChild(el('th', { class: 'line-matrix-cb-th' }, [selectAllCb]));
    headRow.appendChild(el('th', { class: 'line-matrix-label-th' }, [document.createTextNode('Point')]));
    headRow.appendChild(el('th', { class: 'line-matrix-owner-th' }, [document.createTextNode('Line')]));
    players.forEach(name => {
      const th = el('th', { class: 'line-matrix-player-th', title: name }, [document.createTextNode(initials(name))]);
      th.addEventListener('click', () => {
        if (activeFilters.has(name)) activeFilters.delete(name); else activeFilters.add(name);
        th.classList.toggle('active', activeFilters.has(name));
        renderRows();
      });
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = el('tbody', {}, []);
    table.appendChild(tbody);
    const tableScroll = el('div', { class: 'line-matrix-scroll' }, []);
    tableScroll.appendChild(table);
    wrap.appendChild(tableScroll);

    function renderRows() {
      tbody.innerHTML = '';
      // Row rebuild invalidates any remembered shift-click anchor -- visible
      // row order/positions may have just changed (a filter toggled, select
      // all, clear), so starting a fresh range next time is safer than
      // silently selecting the wrong rows.
      lastVisIndex = null;
      let visIndex = 0;
      const visKeys = [];
      rows.forEach(p => {
        const key = pointKey(p.gameIndex, p.pointNumber);
        const owner = lines.find(l => l.pointKeys.includes(key));
        // Already-settled points drop out of the working view by default --
        // that's what makes repeating "confirm the suggestion, save, repeat"
        // converge instead of scrolling past an ever-growing list.
        if (!showAssigned && owner) return;
        if (activeFilters.size && ![...activeFilters].every(name => p.lineupNames.includes(name))) return;
        visKeys.push(key);
        const myVisIndex = visIndex++;
        const game = REPORT.games[p.gameIndex];
        const rowClasses = [owner ? 'owned' : '', selected.has(key) ? 'picked' : ''].filter(Boolean).join(' ');
        const tr = el('tr', rowClasses ? { class: rowClasses } : {}, []);
        tr.dataset.key = key;
        const cb = el('input', { type: 'checkbox' }, []);
        cb.checked = selected.has(key);
        cb.addEventListener('click', (e) => {
          if (e.shiftKey && lastVisIndex != null) {
            const lo = Math.min(lastVisIndex, myVisIndex), hi = Math.max(lastVisIndex, myVisIndex);
            const state = cb.checked;
            [...tbody.querySelectorAll('tr')].slice(lo, hi + 1).forEach(rowEl => {
              rowEl.querySelector('input[type=checkbox]').checked = state;
              rowEl.classList.toggle('picked', state);
              if (state) selected.add(rowEl.dataset.key); else selected.delete(rowEl.dataset.key);
            });
          } else {
            tr.classList.toggle('picked', cb.checked);
            if (cb.checked) selected.add(key); else selected.delete(key);
          }
          lastVisIndex = myVisIndex;
          updateBulkBar();
        });
        tr.appendChild(el('td', { class: 'line-matrix-cb' }, [cb]));
        tr.appendChild(el('td', { class: 'line-matrix-label' }, [document.createTextNode(`vs ${game.opponent} · pt ${p.pointNumber}`)]));
        tr.appendChild(el('td', { class: 'line-matrix-owner' }, [document.createTextNode(owner ? owner.name : '—')]));
        players.forEach(name => {
          tr.appendChild(el('td', { class: 'line-matrix-cell' + (p.lineupNames.includes(name) ? ' present' : '') }, []));
        });
        tbody.appendChild(tr);
      });
      selectAllCb.checked = visKeys.length > 0 && visKeys.every(k => selected.has(k));
      updateBulkBar();
    }
    renderRows();

    return { el: wrap };
  }

  function buildScopeManagementBlock(scope) {
    const block = el('div', { class: 'line-scope-block' }, []);
    if (scope.tournament) {
      // Tournament name comes from the Set up tab now (rename it there).
      block.appendChild(el('div', { class: 'line-scope-title-row' }, [
        el('span', { class: 'line-scope-title' }, [document.createTextNode(scope.tournament.label)]),
      ]));
    }

    block.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Your lines')]));
    const scopedLines = lines.filter(l => (l.tournamentId || null) === scope.tournamentId);
    if (!scopedLines.length) {
      block.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No lines confirmed yet — follow the steps below to create your first one.')]));
    } else {
      scopedLines.forEach(line => block.appendChild(buildConfirmedLineRow(line)));
    }

    block.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Pick points for a line')]));
    block.appendChild(el('ol', { class: 'line-matrix-instructions' }, [
      el('li', {}, [document.createTextNode('We pre-check the biggest group of points below that look like a recurring lineup — review it, checking or unchecking rows as needed (click a player’s column to filter to points featuring them; shift-click a row to select a range).')]),
      el('li', {}, [document.createTextNode('Type a name and click “Create line,” or pick an existing line and click “Add to line.”')]),
      el('li', {}, [document.createTextNode('That group drops off the list so you can repeat with the next one. Switch to “Show all” if you need to bring a settled point back to fix it.')]),
    ]));

    const matrix = buildLineupMatrixPicker(scope, scopedLines);
    block.appendChild(matrix.el);

    const partialCount = (scope.gameIndices ? REPORT.games.filter((g, i) => scope.gameIndices.includes(i)) : REPORT.games)
      .reduce((sum, g) => sum + (g.points || []).filter(pt => (pt.lineup || []).length !== 7).length, 0);
    if (partialCount) {
      block.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode(
        `${partialCount} point${partialCount === 1 ? '' : 's'} in this scope have an incomplete lineup on record and aren't shown above.`
      )]));
    }

    return block;
  }

  function renderManagement() {
    managementWrap.innerHTML = '';
    currentScopes().forEach(scope => managementWrap.appendChild(buildScopeManagementBlock(scope)));

    // Export/Import always cover every line regardless of mode -- one backup
    // file for both across-tournament and every tournament's own lines.
    const ioRow = el('div', { class: 'controls-row' }, []);
    const exportBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Export lines.json')]);
    exportBtn.addEventListener('click', () => {
      downloadFile(
        JSON.stringify({ version: LINES_SCHEMA_VERSION, teamName: REPORT.teamName, lines, tournamentLabels }, null, 2),
        slug(REPORT.teamName) + '_lines.json',
        'application/json'
      );
    });
    const importBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Import lines.json')]);
    const importInput = el('input', { type: 'file', accept: '.json' }, []);
    importInput.style.display = 'none';
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (parsed && Array.isArray(parsed.lines)) {
            lines = parsed.lines;
            tournamentLabels = (parsed.tournamentLabels && typeof parsed.tournamentLabels === 'object') ? parsed.tournamentLabels : {};
            persist();
            renderTournamentSelector();
            renderAll();
          }
        } catch (e) { /* malformed file -- ignore */ }
        importInput.value = '';
      };
      reader.readAsText(file);
    });
    const clearAllBtn = el('button', { class: 'csv-download danger', type: 'button' }, [document.createTextNode('Clear all line data')]);
    clearAllBtn.disabled = !lines.length;
    clearAllBtn.addEventListener('click', () => {
      if (!lines.length) return;
      const ok = window.confirm(
        `Delete all ${lines.length} confirmed line${lines.length === 1 ? '' : 's'}? ` +
        'This clears every line you’ve created (across every tournament and the whole-season view) from this browser. ' +
        'Export a backup first if you might want them back.'
      );
      if (!ok) return;
      lines = [];
      persist();
      renderAll();
    });
    ioRow.appendChild(exportBtn);
    ioRow.appendChild(importBtn);
    ioRow.appendChild(importInput);
    ioRow.appendChild(clearAllBtn);
    managementWrap.appendChild(ioRow);
  }

  function displayName(line) {
    if (!line.tournamentId) return line.name;
    const t = TOURNAMENTS.find(t => t.id === line.tournamentId);
    return line.name + (t ? ' · ' + tournamentDisplay(t) : '');
  }

  // One card per line listing who played on it and how often, sitting above the
  // comparison. Players who appear on more than one of the shown lines are
  // highlighted so overlap between lines is obvious at a glance.
  function buildLineRostersSection(relevantLines) {
    const wrap = el('div', { class: 'line-rosters' }, []);
    wrap.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Line rosters')]));

    const rosters = relevantLines.map(line => Object.assign({ line }, lineRosterPresence(line.pointKeys)));
    // How many of these lines each player appears on, so shared players stand out.
    const lineCountByName = new Map();
    rosters.forEach(r => r.counts.forEach((_, name) => lineCountByName.set(name, (lineCountByName.get(name) || 0) + 1)));
    const anyShared = [...lineCountByName.values()].some(n => n > 1);

    wrap.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode(
      'Everyone who played on each line, and the share of that line’s points they were on the field for.' +
      (anyShared ? ' Players highlighted in gold appear on more than one of these lines.' : '')
    )]));

    const grid = el('div', { class: 'line-roster-grid' }, []);
    rosters.forEach(({ line, total, counts }) => {
      const card = el('div', { class: 'line-roster-card' }, []);
      card.appendChild(el('div', { class: 'line-roster-name' }, [document.createTextNode(displayName(line))]));
      card.appendChild(el('div', { class: 'line-roster-sub' }, [document.createTextNode(`${total} point${total === 1 ? '' : 's'}`)]));
      if (!total) {
        card.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No points with a full lineup recorded.')]));
        grid.appendChild(card);
        return;
      }
      const list = el('div', { class: 'line-roster-list' }, []);
      [...counts.entries()]
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
        .forEach(([name, n]) => {
          const pct = Math.round((n / total) * 100);
          const nLines = lineCountByName.get(name) || 1;
          const shared = nLines > 1;
          const rowEl = el('div', { class: 'line-roster-row' + (shared ? ' shared' : '') }, []);
          if (shared) rowEl.title = `${name} plays on ${nLines} of these lines`;
          rowEl.appendChild(el('span', { class: 'line-roster-fill', style: `width:${pct}%;` }, []));
          const nameEl = el('span', { class: 'line-roster-player' }, [document.createTextNode(name)]);
          if (shared) nameEl.appendChild(el('span', { class: 'line-roster-chip' }, [document.createTextNode(String(nLines))]));
          rowEl.appendChild(nameEl);
          rowEl.appendChild(el('span', { class: 'line-roster-pct' }, [document.createTextNode(`${pct}% · ${n}/${total}`)]));
          list.appendChild(rowEl);
        });
      card.appendChild(list);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function renderCompare() {
    compareWrap.innerHTML = '';
    const relevantLines = scopeMode === 'across'
      ? lines.filter(l => !l.tournamentId)
      : lines.filter(l => l.tournamentId && selectedTournamentIds.includes(l.tournamentId));
    if (!relevantLines.length) return;

    compareWrap.appendChild(buildLineRostersSection(relevantLines));

    compareWrap.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Compare lines')]));
    const controlsRow = el('div', { class: 'controls-row' }, []);
    compareWrap.appendChild(controlsRow);
    const contentArea = el('div', {}, []);
    compareWrap.appendChild(contentArea);

    // Lines are identified by their (already-unique) display name here, not
    // id, since buildPlayerSelector's widget is built around "the value is
    // both the checkbox label and the returned identifier."
    let selectedNames = relevantLines.map(displayName);

    function renderContent() {
      contentArea.innerHTML = '';
      const selectedLines = relevantLines.filter(l => selectedNames.includes(displayName(l)));
      if (!selectedLines.length) {
        contentArea.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Select 1 or more lines above to compare.')]));
        return;
      }
      const entities = selectedLines.map(l => Object.assign({ name: displayName(l) }, computeLineStats(l.pointKeys, selectedGames)));

      contentArea.appendChild(buildComparisonTable(LINE_ROWS, entities, 'name', { mobileCards: true }));
      contentArea.appendChild(el('p', { class: 'pitch-caption' }, [
        document.createTextNode('Avg point leverage is the mean Leverage (0–10) across a line’s points — a line that only sees the field when the game is already decided will read lower here than one that gets deployed in close, high-stakes moments, even at the same points-played total.'),
      ]));

      contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Scoring Efficiency')]));
      const gaugeGrid = el('div', { class: 'impact-grid' }, []);
      entities.forEach(en => {
        gaugeGrid.appendChild(el('div', { class: 'impact-card' }, [
          el('div', { class: 'impact-card-name' }, [document.createTextNode(en.name)]),
          buildScoringEfficiencyWidget(en.scoringEfficiency),
        ]));
      });
      contentArea.appendChild(gaugeGrid);

      contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Field Diagrams')]));
      let fieldCategories = new Set(['all']);
      const renderers = [];
      const fieldGrid = el('div', { class: 'impact-grid' }, []);
      selectedLines.forEach(line => {
        const card = el('div', { class: 'impact-card' }, [el('div', { class: 'impact-card-name' }, [document.createTextNode(displayName(line))])]);
        const { svg, routeLayer } = buildPitch();
        card.appendChild(svg);
        fieldGrid.appendChild(card);
        renderers.push({ line, routeLayer });
      });
      function renderFields() {
        renderers.forEach(r => {
          const { passes, blocks } = computeLineFieldData(r.line.pointKeys, selectedGames, fieldCategories);
          renderPlayerImpact(r.routeLayer, passes, blocks);
        });
      }
      contentArea.appendChild(el('div', { class: 'controls-row' }, [
        buildImpactCategoryDropdown((cats) => { fieldCategories = cats; renderFields(); }),
      ]));
      contentArea.appendChild(fieldGrid);
      contentArea.appendChild(buildFieldLegend());
      renderFields();
    }

    controlsRow.appendChild(buildPlayerSelector((names) => { selectedNames = names; renderContent(); }, {
      maxPlayers: Infinity, defaultAll: true, includeSelectAll: true, roleLabel: 'Line',
      items: relevantLines.map(displayName),
    }));
    controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; renderContent(); }));
    renderContent();
  }

  renderTournamentSelector();
  renderAll();
  return section;
}

// ---------- Thrower-Receiver Analysis: one row per (thrower, receiver) pair
// that's actually occurred, plus field diagrams for up to 7 selected pairs ----------

// Yardage stats follow the same convention as every other per-pass average
// already shown in the report (stats.py's throwGain/throwDist, surfaced in
// Player Analysis's Efficiency & Averages table): completed passes only,
// since a pass that never landed doesn't have a meaningful "yards gained."
// "Forward yards" mirrors the existing Gain stats (net downfield
// Y-displacement); "total yards" mirrors the existing Dist stats
// (straight-line pass distance, via FIELD_WIDTH_YD_JS).
function computePairStats(gameIndices) {
  const gameSet = new Set(gameIndices);
  const byPair = new Map(); // "thrower|receiver" -> accumulator

  REPORT.games.forEach((game, gi) => {
    if (!gameSet.has(gi)) return;
    (game.points || []).forEach(pt => {
      (pt.passes || []).forEach(p => {
        if (!p.thrower || !p.receiver) return;
        const key = p.thrower + '|' + p.receiver;
        let a = byPair.get(key);
        if (!a) {
          a = {
            thrower: p.thrower, receiver: p.receiver,
            n: 0, completed: 0, assistAttempts: 0, assists: 0,
            huckAttempts: 0, huckCompletions: 0,
            totalForwardYards: 0, totalYards: 0,
          };
          byPair.set(key, a);
        }
        a.n++;
        const completed = !p.turnover;
        if (completed) a.completed++;
        if (p.endY < ENDZONE_FRAC) {
          a.assistAttempts++;
          if (p.assist) a.assists++;
        }
        const gain = (p.startY - p.endY) * FIELD_LENGTH_YD_JS;
        if (gain >= IMPACT_HUCK_YD) {
          a.huckAttempts++;
          if (completed) a.huckCompletions++;
        }
        if (completed) {
          a.totalForwardYards += gain;
          a.totalYards += Math.hypot((p.startX - p.endX) * FIELD_WIDTH_YD_JS, (p.startY - p.endY) * FIELD_LENGTH_YD_JS);
        }
      });
    });
  });

  return [...byPair.values()].map(a => Object.assign({}, a, {
    pair: a.thrower + ' → ' + a.receiver,
    incomplete: a.n - a.completed,
    completionPct: pctOrNull(a.completed, a.n),
    assistCompletionPct: pctOrNull(a.assists, a.assistAttempts),
    huckCompletionPct: pctOrNull(a.huckCompletions, a.huckAttempts),
    avgForwardYardsPerPass: safeDiv(a.totalForwardYards, a.completed),
    avgTotalYardsPerPass: safeDiv(a.totalYards, a.completed),
  }));
}

const PAIR_COLUMNS = [
  { key: 'thrower', label: 'Thrower', full: 'Thrower', numeric: false },
  { key: 'receiver', label: 'Receiver', full: 'Receiver', numeric: false },
  { key: 'n', label: 'N', full: 'Throws attempted', numeric: true },
  { key: 'completed', label: 'Completed', full: 'Completed throws', numeric: true, hidden: true },
  { key: 'completionPct', label: 'Cmp%', full: 'Completed throws (count) and completion percentage', numeric: true, percent: true, comboCountKey: 'completed' },
  { key: 'assistAttempts', label: 'Ast Att', full: 'Assist attempts (throws targeting the endzone, whether completed or not)', numeric: true },
  { key: 'assistCompletionPct', label: 'Ast Cmp%', full: 'Assists (count) and assist completion percentage', numeric: true, percent: true, comboCountKey: 'assists' },
  { key: 'huckAttempts', label: 'Hck Att', full: 'Huck attempts (throws gaining 27+ yards downfield)', numeric: true },
  { key: 'huckCompletions', label: 'Hck Cmp', full: 'Huck completions', numeric: true, hidden: true },
  { key: 'huckCompletionPct', label: 'Hck Cmp%', full: 'Huck completions (count) and huck completion percentage', numeric: true, percent: true, comboCountKey: 'huckCompletions' },
  { key: 'totalForwardYards', label: 'Total Fwd Yd', full: 'Total forward (downfield) yards gained on completed throws', numeric: true },
  { key: 'avgForwardYardsPerPass', label: 'Avg Fwd Yd', full: 'Average forward yards per completed pass', numeric: true },
  { key: 'totalYards', label: 'Total Yd', full: 'Total pass distance on completed throws', numeric: true },
  { key: 'avgTotalYardsPerPass', label: 'Avg Total Yd', full: 'Average pass distance per completed pass', numeric: true },
];

// The heatmap's metric toggle. valueFn picks what colors each cell's main
// (non-red) portion; "Number of Passes" colors by completed count
// specifically (not raw attempts) since the incomplete portion already
// carries the rest of that total in red. The other four are yardage stats,
// which -- like every other yardage stat in this report -- only exist for
// completed passes, so their color also only reflects the completed side.
//
// Deliberately a multi-hue sequential ramp (blue -> teal -> gold), not a
// single-hue opacity fade: at low opacity a single hue reads as
// indistinguishable shades of the page background, which is exactly the
// "hard to tell where one box ends and another begins" problem. A hue *and*
// lightness shift keeps every value visibly distinct. Stops are picked per
// theme (not just var(--chalk)-style CSS custom properties) since a fixed
// RGB triple needs different endpoints to stay legible against a near-black
// vs. a near-white page background. Kept clear of red/orange on purpose --
// this heatmap reserves that hue exclusively for "incomplete pass."
const HEATMAP_SEQUENTIAL_STOPS = {
  dark: [[58, 84, 138], [56, 176, 165], [240, 200, 90]],
  light: [[35, 58, 102], [27, 122, 111], [191, 129, 22]],
};
function sequentialHeatColor(t) {
  const stops = HEATMAP_SEQUENTIAL_STOPS[currentTheme()] || HEATMAP_SEQUENTIAL_STOPS.dark;
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - i;
  const a = stops[i], b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * localT);
  const g = Math.round(a[1] + (b[1] - a[1]) * localT);
  const bl = Math.round(a[2] + (b[2] - a[2]) * localT);
  return `rgb(${r}, ${g}, ${bl})`;
}
// Real pair data is right-skewed -- most pairs cluster at the low end of
// the domain with a handful of outliers stretching the max out, which
// crushes everything that actually matters (e.g. an 8% pair and a 25%
// pair) into the same narrow, barely-distinguishable slice of a linear
// scale. A sqrt power curve spends more of the color range on that low
// end without changing the domain or breaking monotonicity, so nearby
// low/mid values pull apart visually. Cells and the legend gradient both
// go through this so they never drift apart.
function heatmapColorForT(t) {
  return sequentialHeatColor(Math.pow(Math.max(0, Math.min(1, t)), 0.55));
}

// "share" metrics (Number of Passes, Total Yards, Forward Yards) are sums:
// in "Per thrower" scope, a pair's value becomes its % share of the
// thrower's own total for that metric -- naturally 0-100%, floors at 0.
// "rate" metrics (the two per-throw averages) aren't summable, so "Per
// thrower" instead expresses a pair's rate as a multiple of the thrower's
// own overall rate (1.00x = exactly average). A ratio has no natural zero,
// so its color domain floors at the smallest ratio actually observed rather
// than 0 -- otherwise real variation gets compressed into a sliver of the
// scale (see domainMin below).
const HEATMAP_METRICS = [
  {
    key: 'n', label: 'Number of Passes', kind: 'share',
    rawValueFn: p => p.completed, rawIncompleteFn: p => p.incomplete,
    throwerTotalFn: t => t.n,
    fmtTotals: v => Math.round(v).toLocaleString(), unitTotals: '',
  },
  {
    key: 'totalYards', label: 'Total Yards', kind: 'share',
    rawValueFn: p => p.totalYards, rawIncompleteFn: null,
    throwerTotalFn: t => t.totalYards,
    fmtTotals: v => Math.round(v).toLocaleString(), unitTotals: ' yd',
  },
  {
    key: 'avgTotalYardsPerPass', label: 'Avg Yards / Throw', kind: 'rate',
    rawValueFn: p => p.avgTotalYardsPerPass, rawIncompleteFn: null,
    throwerTotalFn: t => safeDiv0(t.totalYards, t.completed),
    fmtTotals: v => (Math.round(v * 10) / 10).toLocaleString(), unitTotals: ' yd',
  },
  {
    key: 'totalForwardYards', label: 'Forward Yards', kind: 'share',
    rawValueFn: p => p.totalForwardYards, rawIncompleteFn: null,
    throwerTotalFn: t => t.totalForwardYards,
    fmtTotals: v => Math.round(v).toLocaleString(), unitTotals: ' yd',
  },
  {
    key: 'avgForwardYardsPerPass', label: 'Avg Forward Yards / Throw', kind: 'rate',
    rawValueFn: p => p.avgForwardYardsPerPass, rawIncompleteFn: null,
    throwerTotalFn: t => safeDiv0(t.totalForwardYards, t.completed),
    fmtTotals: v => (Math.round(v * 10) / 10).toLocaleString(), unitTotals: ' yd',
  },
];

// Null-safe divide returning 0 (not null/NaN) on a zero denominator -- every
// caller in the heatmap's color math wants "nothing to show" for that case,
// not a sentinel requiring separate handling.
function safeDiv0(numer, denom) {
  return denom ? numer / denom : 0;
}

function computeThrowerAggregates(pairStats) {
  const agg = new Map(); // thrower -> { n, completed, totalYards, totalForwardYards }
  pairStats.forEach(p => {
    let t = agg.get(p.thrower);
    if (!t) { t = { n: 0, completed: 0, totalYards: 0, totalForwardYards: 0 }; agg.set(p.thrower, t); }
    t.n += p.n;
    t.completed += p.completed;
    t.totalYards += p.totalYards;
    t.totalForwardYards += p.totalForwardYards;
  });
  return agg;
}

// scopeMode: 'totals' returns the metric's raw magnitude; 'perThrower'
// rescales it against the thrower's own aggregate (share or ratio-to-mean,
// per the metric's kind -- see HEATMAP_METRICS comment above).
function heatmapScaledValue(metric, rawValue, thrower, throwerAgg, scopeMode) {
  if (scopeMode === 'totals') return rawValue;
  const t = throwerAgg.get(thrower) || { n: 0, completed: 0, totalYards: 0, totalForwardYards: 0 };
  return safeDiv0(rawValue, metric.throwerTotalFn(t));
}

function heatmapIncompleteScaledValue(metric, p, throwerAgg, scopeMode) {
  if (!metric.rawIncompleteFn) return 0;
  return heatmapScaledValue(metric, metric.rawIncompleteFn(p) || 0, p.thrower, throwerAgg, scopeMode);
}

// Compact display string -- used for both legend labels (metric-only, no
// thrower name) and as the leading fragment of a cell's tooltip.
function formatHeatmapValue(metric, value, scopeMode) {
  if (scopeMode === 'totals') return metric.fmtTotals(value) + metric.unitTotals;
  if (metric.kind === 'share') return `${(value * 100).toFixed(1)}%`;
  return `${value.toFixed(2)}x`;
}

// N x N grid, throwers (rows) and receivers (columns) sorted by their total
// throw involvement descending, each cell shaded by pass count for that
// specific pair. Gives an at-a-glance view of the whole passing network
// before drilling into the table -- clicking a cell filters the table below
// it to that exact pair via buildStatsTable's setFilter hook.
// Each cell splits into two proportional segments (a 2px surface gap between
// them, no border -- see the dataviz mark spec) rather than one flat square:
// the left segment (neutral chalk hue) sized and colored by the completed
// side of this pair's passes under the selected metric, the right segment
// (red/--bad, a genuine status use -- an incomplete pass is a real failure
// state) sized and colored by incomplete-pass count. The split ratio itself
// is always completed-vs-incomplete *count*, regardless of metric, since
// yardage only exists for completed passes; only the left segment's color
// intensity changes when the metric toggles. A lone incomplete still gets a
// minimum visible sliver rather than rounding to invisible.
function buildPairHeatmap(pairStats, metricKey, scopeMode, onCellClick) {
  const metric = HEATMAP_METRICS.find(m => m.key === metricKey) || HEATMAP_METRICS[0];
  const throwerAgg = computeThrowerAggregates(pairStats);
  const throwerTotals = new Map(), receiverTotals = new Map();
  const cellByKey = new Map(); // "thrower|receiver" -> pairStats row
  let maxMetric = 0, minMetric = Infinity, maxIncomplete = 0;
  pairStats.forEach(p => {
    throwerTotals.set(p.thrower, (throwerTotals.get(p.thrower) || 0) + p.n);
    receiverTotals.set(p.receiver, (receiverTotals.get(p.receiver) || 0) + p.n);
    cellByKey.set(p.thrower + '|' + p.receiver, p);
    const raw = metric.rawValueFn(p) || 0;
    const scaled = heatmapScaledValue(metric, raw, p.thrower, throwerAgg, scopeMode);
    if (scaled > maxMetric) maxMetric = scaled;
    if (scaled < minMetric) minMetric = scaled;
    const incompleteScaled = heatmapIncompleteScaledValue(metric, p, throwerAgg, scopeMode);
    if (incompleteScaled > maxIncomplete) maxIncomplete = incompleteScaled;
  });
  if (!isFinite(minMetric)) minMetric = 0;
  // A ratio-to-average has no natural zero (see HEATMAP_METRICS comment), so
  // its color domain floors at the smallest value actually observed; every
  // other combination floors at a true, meaningful 0.
  const domainMin = (metric.kind === 'rate' && scopeMode === 'perThrower') ? minMetric : 0;
  const domainSpan = (maxMetric - domainMin) || 1;
  const throwers = [...throwerTotals.keys()].sort((a, b) => throwerTotals.get(b) - throwerTotals.get(a));
  const receivers = [...receiverTotals.keys()].sort((a, b) => receiverTotals.get(b) - receiverTotals.get(a));

  const cellSize = 32;
  const gap = 2;
  // axisTitleW/H reserve a band for the "THROWER"/"RECEIVER" axis titles,
  // outside the per-player name labels -- so the grid reads correctly
  // before a viewer even looks at an individual cell.
  const axisTitleW = 22, axisTitleH = 22;
  // 150px comfortably fits every real name (longest observed, "Seokhee
  // Burningham", measures ~116px) with room to spare -- trimmed down from
  // 170 so the axis title band doesn't push the grid past the container
  // width and force a horizontal scrollbar on a full roster.
  const labelW = axisTitleW + 150, labelH = axisTitleH + 120;
  // Two legend rows (main metric + incomplete) each need their own bar,
  // min/max labels, and real breathing room between them -- see
  // buildLegendRow/legendRowH below.
  const legendRowH = 54;
  const legendH = legendRowH * 2 + 20;
  const gridW = receivers.length * cellSize;
  const gridH = throwers.length * cellSize;
  const W = Math.max(labelW + gridW + 6, 340);
  const H = labelH + gridH + legendH + 14;
  // Native pixel size (not width:100%) so cells stay legible for a large
  // roster -- the wrapping .pair-heatmap-wrap scrolls horizontally instead
  // of shrinking the grid down to fit a narrow viewport.
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, style: 'display:block;' });

  const defs = svgEl('defs', {});
  svg.appendChild(defs);
  // Main legend gradient samples heatmapColorForT (the same power-curve
  // used for the cells themselves) at fine intervals, so the bar's visual
  // gradation always matches what the cells actually show -- a raw 3-stop
  // gradient would misrepresent the curve once it's no longer linear.
  const mainGrad = svgEl('linearGradient', { id: 'heatmap-main-grad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
  const GRAD_SAMPLES = 16;
  for (let i = 0; i <= GRAD_SAMPLES; i++) {
    const t = i / GRAD_SAMPLES;
    mainGrad.appendChild(svgEl('stop', { offset: `${t * 100}%`, style: `stop-color: ${heatmapColorForT(t)};` }));
  }
  defs.appendChild(mainGrad);
  const incompleteGrad = svgEl('linearGradient', { id: 'heatmap-incomplete-grad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
  incompleteGrad.appendChild(svgEl('stop', { offset: '0%', style: 'stop-color:var(--bad); stop-opacity:0.2;' }));
  incompleteGrad.appendChild(svgEl('stop', { offset: '100%', style: 'stop-color:var(--bad); stop-opacity:0.95;' }));
  defs.appendChild(incompleteGrad);

  receivers.forEach((name, ci) => {
    const x = labelW + ci * cellSize + cellSize / 2;
    const t = svgEl('text', {
      x, y: labelH - 8, 'text-anchor': 'start', 'font-size': 11.5, style: 'fill:var(--chalk-dim);',
      transform: `rotate(-45 ${x} ${labelH - 8})`,
    });
    t.textContent = name;
    svg.appendChild(t);
  });
  throwers.forEach((name, ri) => {
    const y = labelH + ri * cellSize + cellSize / 2;
    const t = svgEl('text', {
      x: labelW - 8, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 11.5, style: 'fill:var(--chalk-dim);',
    });
    t.textContent = name;
    svg.appendChild(t);
  });

  // Axis titles -- orient the reader (rows = who threw it, columns = who
  // caught it) before they read a single cell. Styled like the report's
  // "eyebrow" labels (uppercase, letter-spaced, muted) rather than the
  // per-player name labels, so they read as structure, not data.
  const axisTitleStyle = 'fill:var(--chalk-dim); font-weight:700; letter-spacing:0.09em;';
  const receiverTitle = svgEl('text', {
    x: labelW + gridW / 2, y: 14, 'text-anchor': 'middle', 'font-size': 10.5, style: axisTitleStyle,
  });
  receiverTitle.textContent = 'RECEIVER';
  svg.appendChild(receiverTitle);
  const throwerTitleX = axisTitleW - 8, throwerTitleY = labelH + gridH / 2;
  const throwerTitle = svgEl('text', {
    x: throwerTitleX, y: throwerTitleY, 'text-anchor': 'middle', 'font-size': 10.5, style: axisTitleStyle,
    transform: `rotate(-90 ${throwerTitleX} ${throwerTitleY})`,
  });
  throwerTitle.textContent = 'THROWER';
  svg.appendChild(throwerTitle);

  // Complete/incomplete only applies in "Number of Passes" mode -- the other
  // four metrics are yardage stats with no incomplete-pass analog, so their
  // cells are a single solid color with nothing to split.
  const showsIncomplete = metric.key === 'n';
  // A hairline border in the same neutral hue as the labels, on every cell
  // regardless of fill -- this is what actually keeps adjacent low-value
  // cells (which used to fade toward the page background and blur
  // together) visibly bounded.
  const cellStroke = 'stroke: rgba(var(--chalk-rgb), 0.25); stroke-width: 1;';

  throwers.forEach((thrower, ri) => {
    receivers.forEach((receiver, ci) => {
      const p = cellByKey.get(thrower + '|' + receiver);
      if (!p) return;
      const x = labelW + ci * cellSize, y = labelH + ri * cellSize;
      const cellW = cellSize - 1, cellH = cellSize - 1;
      const total = p.n || 1;
      const raw = metric.rawValueFn(p) || 0;
      const scaledVal = heatmapScaledValue(metric, raw, thrower, throwerAgg, scopeMode);
      const colorT = (scaledVal - domainMin) / domainSpan;

      const mainPhrase = scopeMode === 'totals'
        ? `${formatHeatmapValue(metric, scaledVal, scopeMode)} (${metric.label})`
        : metric.kind === 'share'
          ? `${formatHeatmapValue(metric, scaledVal, scopeMode)} of ${thrower}'s total (${metric.label})`
          : `${formatHeatmapValue(metric, scaledVal, scopeMode)} ${thrower}'s average (${metric.label})`;
      const tipText = `${thrower} → ${receiver}: ${mainPhrase} · ${p.completed}/${p.n} complete` +
        (p.incomplete ? `, ${p.incomplete} incomplete` : '');
      function attachHover(node) {
        node.addEventListener('mouseenter', (e) => showPassTooltip(e, tipText));
        node.addEventListener('mousemove', (e) => positionPassTooltip(e));
        node.addEventListener('mouseleave', hidePassTooltip);
        node.addEventListener('click', () => onCellClick(thrower, receiver));
      }

      if (!showsIncomplete) {
        const rect = svgEl('rect', {
          x, y, width: cellW, height: cellH,
          style: `fill:${heatmapColorForT(colorT)}; cursor:pointer; ${cellStroke}`,
        });
        attachHover(rect);
        svg.appendChild(rect);
        return;
      }

      // The split *width* ratio is always this pair's own completed-vs-
      // incomplete count -- a structural fact about the connection, not a
      // magnitude -- regardless of which scope is selected; only each
      // segment's color intensity changes with Totals vs. Per thrower.
      let redW = p.incomplete > 0 ? Math.max(3, cellW * (p.incomplete / total)) : 0;
      redW = Math.min(redW, cellW);
      const mainW = Math.max(0, cellW - (redW > 0 ? redW + gap : 0));

      if (mainW > 0) {
        const mainRect = svgEl('rect', {
          x, y, width: mainW, height: cellH,
          style: `fill:${heatmapColorForT(colorT)}; cursor:pointer; ${cellStroke}`,
        });
        attachHover(mainRect);
        svg.appendChild(mainRect);
      }
      if (redW > 0) {
        const incompleteScaled = heatmapIncompleteScaledValue(metric, p, throwerAgg, scopeMode);
        const redOpacity = 0.35 + 0.6 * (incompleteScaled / (maxIncomplete || 1));
        const redRect = svgEl('rect', {
          x: x + mainW + (mainW > 0 ? gap : 0), y, width: redW, height: cellH,
          style: `fill:var(--bad); cursor:pointer; ${cellStroke}`, opacity: redOpacity,
        });
        attachHover(redRect);
        svg.appendChild(redRect);
      }
    });
  });

  // Legend: gradient bar(s) explaining the color scale(s) -- the selected
  // metric always, plus incomplete-pass count (red) only when that split is
  // showing -- each with min/max labels so the gradation is never just
  // implied. The min label is a real "0" everywhere except a ratio-to-
  // average scale, where it's the smallest ratio actually observed (see
  // domainMin above).
  function buildLegendRow(y, gradId, label, minVal, maxVal) {
    const barW = Math.min(320, W - labelW - 10);
    const barX = labelW;
    const barH = 14;
    const g = svgEl('g', {});
    const labelText = svgEl('text', { x: barX, y: y - 6, 'font-size': 11, style: 'fill:var(--chalk-dim); font-weight:600;' });
    labelText.textContent = label;
    g.appendChild(labelText);
    g.appendChild(svgEl('rect', {
      x: barX, y, width: barW, height: barH, rx: 3, fill: `url(#${gradId})`,
      style: 'stroke: rgba(var(--chalk-rgb), 0.25); stroke-width: 1;',
    }));
    const minLabel = svgEl('text', { x: barX, y: y + barH + 14, 'font-size': 10, style: 'fill:var(--chalk-dim);' });
    minLabel.textContent = minVal;
    g.appendChild(minLabel);
    const maxLabel = svgEl('text', { x: barX + barW, y: y + barH + 14, 'text-anchor': 'end', 'font-size': 10, style: 'fill:var(--chalk-dim);' });
    maxLabel.textContent = maxVal;
    g.appendChild(maxLabel);
    svg.appendChild(g);
  }
  const legendY0 = labelH + gridH + 26;
  buildLegendRow(
    legendY0, 'heatmap-main-grad', metric.label,
    formatHeatmapValue(metric, domainMin, scopeMode), formatHeatmapValue(metric, maxMetric, scopeMode)
  );
  if (showsIncomplete) {
    // A full legendRowH of clearance (not a small fixed offset) so the two
    // scales -- "how many/much" in the main color, "how often it failed"
    // in red -- read as two separate legends, not one crowded block.
    const incompleteLabel = scopeMode === 'perThrower' ? 'Incomplete (% of throws)' : 'Incomplete passes';
    const incompleteMaxLabel = scopeMode === 'perThrower' ? `${(maxIncomplete * 100).toFixed(1)}%` : String(maxIncomplete);
    buildLegendRow(legendY0 + legendRowH, 'heatmap-incomplete-grad', incompleteLabel, scopeMode === 'perThrower' ? '0.0%' : '0', incompleteMaxLabel);
  }

  return svg;
}

function gatherPairPassesTagged(thrower, receiver, gameIndices) {
  const out = [];
  gameIndices.forEach(gi => {
    (REPORT.games[gi].points || []).forEach(pt => {
      (pt.passes || []).forEach(p => {
        if (p.thrower === thrower && p.receiver === receiver) out.push({ pass: p, gameIndex: gi });
      });
    });
  });
  return out;
}

// Blocks excluded: not a thrower->receiver event, so that checkbox would
// always be an empty no-op for this view.
const PAIR_IMPACT_CATEGORIES = IMPACT_CATEGORIES.filter(c => c.key !== 'blocks');

function buildPairComparisonSection(pairs, gameIndices) {
  const wrap = el('div', {}, []);
  const grid = el('div', { class: 'impact-grid' }, []);
  const renderers = [];
  pairs.forEach(p => {
    const card = el('div', { class: 'impact-card' }, []);
    card.appendChild(el('div', { class: 'impact-card-name' }, [document.createTextNode(`${p.thrower} → ${p.receiver}`)]));
    const { svg, routeLayer } = buildPitch();
    card.appendChild(svg);
    const roseWrap = el('div', { class: 'pair-rose-wrap' }, []);
    card.appendChild(roseWrap);
    grid.appendChild(card);
    renderers.push({ thrower: p.thrower, receiver: p.receiver, routeLayer, roseWrap });
  });

  let categories = new Set(['all']);
  function renderAll() {
    renderers.forEach(r => {
      const tagged = gatherPairPassesTagged(r.thrower, r.receiver, gameIndices);
      renderPlayerImpact(r.routeLayer, filterTaggedByCategory(tagged, categories), []);
      // The rose diagram always reflects every throw for this pair,
      // independent of the category filter above -- it's showing the
      // connection's overall direction tendency, not one outcome slice of it.
      r.roseWrap.innerHTML = '';
      r.roseWrap.appendChild(buildRoseChart(computeDirectionBins(tagged, 'thrower'), 130, 'var(--chalk)', 'Throws'));
    });
  }

  const controlsRow = el('div', { class: 'controls-row' }, []);
  controlsRow.appendChild(buildImpactCategoryDropdown((cats) => { categories = cats; renderAll(); }, PAIR_IMPACT_CATEGORIES));
  wrap.appendChild(controlsRow);
  wrap.appendChild(grid);
  wrap.appendChild(buildFieldLegend());
  renderAll();
  return wrap;
}

function buildThrowerReceiverSection() {
  const section = el('section', { class: 'view', id: 'thrower-receiver-analysis' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Thrower-Receiver Analysis')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Compare specific thrower → receiver connections: who throws to whom, how often, and how well it works.')]));

  const controlsRow = el('div', { class: 'controls-row' }, []);
  section.appendChild(controlsRow);
  const heatmapControlsRow = el('div', { class: 'controls-row heatmap-toggle-row' }, []);
  section.appendChild(heatmapControlsRow);
  const heatmapScopeRow = el('div', { class: 'controls-row heatmap-toggle-row' }, []);
  section.appendChild(heatmapScopeRow);
  const heatmapWrap = el('div', { class: 'pair-heatmap-wrap' }, []);
  section.appendChild(heatmapWrap);
  section.appendChild(el('p', { class: 'pitch-caption' }, [
    document.createTextNode('Click any cell above to add that pair to '),
    el('b', {}, [document.createTextNode('Compare Pairs')]),
    document.createTextNode(' below (up to 7 at once).'),
  ]));

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Compare Pairs')]));
  const selectorRow = el('div', { class: 'controls-row' }, []);
  section.appendChild(selectorRow);
  const compareWrap = el('div', {}, []);
  section.appendChild(compareWrap);

  const tableToggleBtn = el('button', { type: 'button', class: 'section-title-toggle' }, [
    document.createTextNode('All pairs data'),
    el('span', { class: 'section-title-toggle-arrow' }, [document.createTextNode('▸')]),
  ]);
  section.appendChild(tableToggleBtn);
  const tableWrap = el('div', {}, []);
  // Collapsed by default -- the big sortable table duplicates the Compare
  // Pairs table above for anyone who just wants to browse, not something a
  // first-time visitor needs open immediately.
  tableWrap.style.display = 'none';
  section.appendChild(tableWrap);
  tableToggleBtn.addEventListener('click', () => {
    const collapsed = tableWrap.style.display === 'none';
    tableWrap.style.display = collapsed ? '' : 'none';
    tableToggleBtn.classList.toggle('expanded', collapsed);
  });

  let selectedGames = REPORT.games.map((g, i) => i);
  let pairStats = [];
  let selectedPairLabels = [];
  let heatmapMetric = 'n';
  let heatmapScope = 'totals';

  function renderHeatmap() {
    heatmapWrap.innerHTML = '';
    heatmapWrap.appendChild(buildPairHeatmap(pairStats, heatmapMetric, heatmapScope, (thrower, receiver) => {
      addPairToCompare(thrower, receiver);
    }));
  }

  // Clicking a cell adds that connection to the Compare Pairs section below
  // (same cap as the selector widget itself) rather than filtering the big
  // table -- a click is "show me this pair", not "narrow the list".
  function addPairToCompare(thrower, receiver) {
    const label = thrower + ' → ' + receiver;
    if (!selectedPairLabels.includes(label) && selectedPairLabels.length < 7) {
      selectedPairLabels = [...selectedPairLabels, label];
    }
    renderSelector();
    const heading = section.querySelector('.section-title');
    if (heading && heading.scrollIntoView) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTop() {
    pairStats = computePairStats(selectedGames);
    renderHeatmap();

    tableWrap.innerHTML = '';
    tableWrap.appendChild(buildStatsTable(pairStats, PAIR_COLUMNS, 'n', `${slug(REPORT.teamName)}_thrower_receiver.csv`, { filterable: true }));

    renderSelector();
  }

  function renderSelector() {
    selectorRow.innerHTML = '';
    const labels = [...pairStats].sort((a, b) => b.n - a.n).map(p => p.pair);
    selectedPairLabels = selectedPairLabels.filter(l => labels.includes(l));
    selectorRow.appendChild(buildPlayerSelector((chosen) => {
      selectedPairLabels = chosen;
      renderCompare();
    }, {
      maxPlayers: 7, defaultAll: false, includeSelectAll: false, roleLabel: 'Pair',
      items: labels, initialSelected: selectedPairLabels, preserveOrder: true,
    }));
    const deselectBtn = el('button', { type: 'button', class: 'game-filter-btn' }, [document.createTextNode('Deselect all')]);
    deselectBtn.classList.toggle('control-disabled', selectedPairLabels.length === 0);
    deselectBtn.addEventListener('click', () => {
      if (!selectedPairLabels.length) return;
      selectedPairLabels = [];
      renderSelector();
    });
    selectorRow.appendChild(deselectBtn);
    renderCompare();
  }

  function renderCompare() {
    compareWrap.innerHTML = '';
    const chosen = pairStats.filter(p => selectedPairLabels.includes(p.pair));
    if (!chosen.length) {
      compareWrap.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Select up to 7 pairs above (or click a cell in the heatmap) to compare their field diagrams.')]));
      return;
    }
    // One row per selected pair -- the same stats as the big table above,
    // scoped down to just the pairs being compared so they sit right next
    // to the field diagrams they describe.
    compareWrap.appendChild(buildStatsTable(chosen, PAIR_COLUMNS, 'n', `${slug(REPORT.teamName)}_compared_pairs.csv`));
    compareWrap.appendChild(buildPairComparisonSection(chosen, selectedGames));
  }

  controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; renderTop(); }));
  heatmapControlsRow.appendChild(el('span', { class: 'heatmap-toggle-label' }, [document.createTextNode('Color by:')]));
  heatmapControlsRow.appendChild(buildSegToggle(
    HEATMAP_METRICS.map(m => ({ key: m.key, label: m.label })),
    (key) => { heatmapMetric = key; renderHeatmap(); },
    heatmapMetric
  ));
  heatmapScopeRow.appendChild(el('span', { class: 'heatmap-toggle-label' }, [document.createTextNode('Scale:')]));
  heatmapScopeRow.appendChild(buildToggle('Totals', 'Per thrower', (which) => {
    heatmapScope = which === 'a' ? 'totals' : 'perThrower';
    renderHeatmap();
  }));
  renderTop();
  return section;
}

// ---------- Raw Data: CSV + machine-readable exports of everything behind
// the report, scoped to a shared Games filter ----------

// Naive "+s" breaks on words already ending in s/x/z/ch/sh (e.g. "pass" -> "passs").
function pluralizeUnit(word, n) {
  if (n === 1) return word;
  return /[sxz]$|[cs]h$/.test(word) ? word + 'es' : word + 's';
}

const PASS_EXPORT_COLUMNS = [
  'opponent', 'date', 'pointNumber', 'possession', 'thrower', 'receiver',
  'startX', 'startY', 'endX', 'endY', 'completed', 'throwerError', 'receiverError',
  'assist', 'secondaryAssist', 'gainYards', 'distYards', 'isHuckAttempt', 'isAssistAttempt',
  'pointIsOffense', 'pointScored', 'pointResult', 'pointLeverage',
];
const POINT_EXPORT_COLUMNS = [
  'opponent', 'date', 'pointNumber', 'isOffense', 'scored', 'result',
  'ourScoreBefore', 'oppScoreBefore', 'leverage', 'assist', 'secondaryAssist', 'goal',
  'passCount', 'blockCount', 'lineup',
];
const BLOCK_EXPORT_COLUMNS = [
  'opponent', 'date', 'pointNumber', 'player', 'locationX', 'locationY', 'isCallahan', 'isStallOut',
];

function passRowsForExport(gameIndices) {
  const rows = [];
  gameIndices.forEach(gi => {
    const game = REPORT.games[gi];
    (game.points || []).forEach(pt => {
      (pt.passes || []).forEach(p => {
        const gain = (p.startY - p.endY) * FIELD_LENGTH_YD_JS;
        const dist = Math.hypot((p.startX - p.endX) * FIELD_WIDTH_YD_JS, (p.startY - p.endY) * FIELD_LENGTH_YD_JS);
        rows.push({
          opponent: game.opponent, date: game.dateDisplay,
          pointNumber: pt.number, possession: p.possession,
          thrower: p.thrower, receiver: p.receiver,
          startX: p.startX, startY: p.startY, endX: p.endX, endY: p.endY,
          completed: !p.turnover, throwerError: p.throwerError, receiverError: p.receiverError,
          assist: p.assist, secondaryAssist: p.secondaryAssist,
          gainYards: Math.round(gain * 100) / 100, distYards: Math.round(dist * 100) / 100,
          isHuckAttempt: gain >= IMPACT_HUCK_YD, isAssistAttempt: p.endY < ENDZONE_FRAC,
          pointIsOffense: pt.isOffense, pointScored: pt.scored, pointResult: pt.result,
          pointLeverage: pt.leverage,
        });
      });
    });
  });
  return rows;
}

// Includes points with zero recorded passes (e.g. the opponent just held
// their own point -- Statto only tracks this team's actions) so this is the
// only reliable source for point-by-point score progression.
function pointRowsForExport(gameIndices) {
  const rows = [];
  gameIndices.forEach(gi => {
    const game = REPORT.games[gi];
    (game.points || []).forEach(pt => {
      rows.push({
        opponent: game.opponent, date: game.dateDisplay,
        pointNumber: pt.number, isOffense: pt.isOffense, scored: pt.scored, result: pt.result,
        ourScoreBefore: pt.ourScoreBefore, oppScoreBefore: pt.oppScoreBefore, leverage: pt.leverage,
        assist: pt.assist, secondaryAssist: pt.secondaryAssist, goal: pt.goal,
        passCount: (pt.passes || []).length, blockCount: (pt.blocks || []).length,
        lineup: (pt.lineup || []).map(e => e.player).join('; '),
      });
    });
  });
  return rows;
}

function blockRowsForExport(gameIndices) {
  const rows = [];
  gameIndices.forEach(gi => {
    const game = REPORT.games[gi];
    (game.points || []).forEach(pt => {
      (pt.blocks || []).forEach(b => {
        rows.push({
          opponent: game.opponent, date: game.dateDisplay, pointNumber: pt.number,
          player: b.player, locationX: b.locationX, locationY: b.locationY,
          isCallahan: b.callahan, isStallOut: b.stallOut,
        });
      });
    });
  });
  return rows;
}

// Every selected game's box-score rows combined into one file -- the one
// export that doesn't already exist anywhere else (each game page only
// offers its own single-game box score). Columns auto-detected from the
// rows themselves, so it can't silently drop a field stats.py later adds.
function playerGameRowsForExport(gameIndices) {
  const rows = [];
  gameIndices.forEach(gi => {
    const game = REPORT.games[gi];
    (game.boxScore || []).forEach(r => {
      rows.push(Object.assign({ opponent: game.opponent, date: game.dateDisplay }, r));
    });
  });
  return rows;
}

function seasonLeaderboardRowsForExport(gameIndices) {
  return aggregateSeasonStats(gameIndices);
}

// game.summary nests several levels deep (summary.lineStats.combined.*,
// summary.scoringEfficiency.perPoint.total.*, ...) so it's flattened via
// flattenObject into columns like lineStats_combined_throws.
function gameSummaryRowsForExport(gameIndices) {
  return gameIndices.map(gi => {
    const game = REPORT.games[gi];
    return Object.assign(
      { opponent: game.opponent, date: game.dateDisplay, ourScore: game.ourScore, oppScore: game.oppScore, result: game.result },
      flattenObject(game.summary, '')
    );
  });
}

// Mirrors the terms already defined in README.md's Stat glossary table --
// copied content (there's no way to read a repo file from the generated
// page at runtime), kept here so the JSON export is self-describing for an
// LLM that has never seen this codebase.
const RAW_DATA_GLOSSARY = {
  'Clean hold': 'An offensive-starting point that was won with no turnover along the way.',
  'Dirty hold': 'An offensive-starting point that was won, but only after at least one turnover and recovery.',
  'Break': 'A defensive-starting point that was won.',
  'Opp hold': 'A defensive-starting point that was lost (the opponent just held their own point).',
  'Broken': 'An offensive-starting point that was lost.',
  'Huck (attempt/completion)': 'A throw that gains 27+ yards downfield, regardless of who threw it.',
  'Assist attempt': "A throw whose target location is inside the attacking endzone, whether or not it was actually caught.",
  'Huck/assist reception': 'The receiver-side mirror of the above: how often the targeted player, when thrown deep or into the endzone, actually came down with it.',
  'Red zone': 'Within 20 yd of the attacking endzone; a red-zone entry requires a throw that originated there, not one that merely lands there from farther out.',
  'Offensive utilization': 'Of the points a player was on the field for that either started on offense or where their line got a block, the percentage where they recorded at least one touch.',
  'Scoring efficiency (Per Point / Per Possession / First Possession)': 'Three ways of measuring conversion rate -- by point, by individual possession (a point with a turnover-and-recovery has more than one), or restricted to clean, first-try conversions only.',
  'WMP / MMP': 'Gender-matching designation for mixed-gender ultimate: WMP = women-matching player, MMP = men-matching player. Every mixed point is 4 WMP + 3 MMP or 3 WMP + 4 MMP. Each player’s designation is in roster[].gender.',
  'Plus/minus': 'Goals + assists + blocks - turnovers.',
  'Leverage': "How much a single point's outcome could swing the game's eventual result, on a 0-10 scale (10 = a double-game-point, where either team scoring next ends the game outright; near 0 = a game already decided, e.g. a big blowout). Modeled as a fair (50/50) race to this game's actual final winning score, with a square-root reshape so mid-to-late-game situations (e.g. tied with just a couple points left) read as meaningfully important rather than compressed near the bottom -- see the 'leverage' formula below for the exact computation.",
  'High-leverage points played': "How many of a player's points had Leverage >= 7 (0-10 scale) -- points close to a coin flip on the game's outcome, typically late and close, as opposed to raw points played which counts every point regardless of how much it mattered.",
};

const RAW_DATA_NOTES = [
  'Coordinate system: startX/startY/endX/endY on every pass are fractions from 0 to 1 of the field. Y decreases toward the attacking endzone (Y=0 is inside it, Y=1 is this team’s own endzone); X is field width and has no directional meaning.',
  'A pass is "completed" when both throwerError and receiverError are false. throwerError is the thrower’s own mistake (a bad throw); receiverError is a drop. A single turnover can be flagged as BOTH (shared blame) -- in that case the report charges the thrower 0.5 of a throwaway and the receiver 0.5 of a drop, so it still totals one turnover; per-player throwerErrors/receiverErrors/turnovers/plusMinus can therefore be half-integers.',
  'Stall-outs (our thrower getting stalled) are a turnover with no pass -- Statto records them as their own event, not a pass, so no pass row is flagged for them. They are still counted as a thrower error in the per-player aggregates: a stall-out adds to that player’s throwerErrors and turnovers (and subtracts from plusMinus), and it counts as an offensive turnover for the point (affecting clean-vs-dirty hold and turnover recovery). stallsAgainst in the box score is the separate per-player count of them. Because of this, summing the pass-level throwerError flags will fall short of the box-score throwerErrors total by the number of stall-outs.',
  '"assist" flags the pass that directly led to a goal; "secondaryAssist" flags the pass immediately before it.',
  'On a point: isOffense = this team started the point with the disc, trying to score ("O-point"); false = defense ("D-point"). scored / result=1 = this team scored that point; result=-1 = the opponent scored.',
  'Blocks are this team’s own defensive plays (turnovers forced on the opponent); locationX/locationY is where the block happened.',
  'Statto only records this team’s own actions -- a point the opponent won by simply holding their own possession has zero recorded passes for that point, so point and score counts should always come from the points data, never by counting passes.',
  'Player names (not IDs) are the join key across points, passes, blocks, lineup, and boxScore within this export.',
  'roster (top level) lists every player who appears in a box score this season. Each entry carries their mixed-line gender designation -- gender is "WMP" (women-matching player) or "MMP" (men-matching player), with genderCode 1 or 0 respectively (both null if the player has no gender set) -- and hasPhoto and photoFile. Photos are NOT embedded here — they travel as a separate "player photos" ZIP downloaded from the same Raw Data tab, in which each file is named exactly as photoFile says (e.g. photos/sean_mcsweeney.png). If you were given that ZIP alongside this file, use photoFile to match a face to a name; if you weren’t, ignore it — nothing else depends on it.',
  'pullEvents (top level, separate from games) is a manually video-tagged list, one entry per defensive point that has been tagged: who pulled and where our pull landed. puller is the player name (or null if untagged). landX/landY are 0-1 field fractions in the same coordinate system as passes (null when outOfBounds is true, or when a spot wasn’t marked); outOfBounds=true means the pull sailed out. It is only present for points a tagger has marked, so it may be empty or cover only some defensive points.',
  'opponentTurnoverEvents (top level) is the other manually video-tagged list: opponent turnovers that were NOT one of our blocks (those are in games[].points[].blocks). Statto records nothing for them, so each is inferred as an opponent possession we won the disc back from, identified by pointNumber + opponentPossession (their n-th offensive possession that point); type is one of Huck turnover / Throwing error / Receiver error, or null if untagged. Like pullEvents, only tagged ones appear.',
  'Film tags: a pass or block in games[].points[] may carry a "filmTags" object when someone has video-tagged it. On a pass: hand (backhand/forehand/etc.), release, distance, stall (Low/Mid/High), catch, highlight, turnoverReason (an ARRAY -- a turnover can have several causes), plus timestamp (seconds into that game’s video) and notes. On a block: type, highlight, timestamp, notes. A point may also carry filmTags: defScheme (the defence called), pull (where our pull landed -- puller, landX/landY 0-1 or outOfBounds), defensivePossessions[] (each with defScheme), and opponentTurnovers[] (each with a type). Every field is optional and tags exist only where a tagger added them, so most passes have none. (pullEvents/opponentTurnoverEvents above are flattened, game-context copies of the same point-level tags, handy for "list every tagged pull".)',
  'videoLinks (top level) maps each selected game to its YouTube URL. To deep-link a tagged moment, append the tag’s timestamp: `<url>&t=<timestamp>s`.',
  'lines (top level) is the user’s curated line groupings (e.g. "O line", "D line"): each has a name, optional tournament, pointCount, the points it covers (gameIndex + pointNumber), and a roster listing how many of the line’s points each player was on (pctOfLinePoints). Lines are a season-level curation and are deliberately NOT filtered by the selected games.',
  'tournaments (top level) groups the selected games the way the report does -- custom names if the user set them, else auto-detected -- so questions can be scoped to an event ("at Regionals...").',
  'advancedStatsForSelection (top level) is one row per player of the Ultiworld "EDGE" goal-equivalent / efficiency metrics (EDGE-O, EDGE-B, EDGE, xE, CP+, PE, CR, ...) for the selected games; advancedStatsGlossary defines every column. EDGE is a league-ranking framework adapted here to a single team, so game-condition adjustments use this season’s own scoring efficiency as the reference and the purely league-relative ratings are omitted -- read these as relative across your own roster, not against outside benchmarks.',
  'See "glossary" above for definitions of Huck, Red zone, Clean/Dirty hold, and the other Statto-specific terms used throughout this data.',
].join(' ');

// Structured, machine-readable tokens describing this report's own visual
// language -- colors, typography, and field-diagram conventions -- so an
// LLM asked to build a custom chart or field diagram from this export can
// match the report's look instead of guessing. Every value here is copied
// from the actual CSS custom properties / SVG constants the report itself
// uses (report.css :root block, report.js PITCH_W/PITCH_H/marker defs), not
// invented for this export -- so it stays accurate as long as it's updated
// alongside them.
const RAW_DATA_STYLE_GUIDE = {
  summary: 'Tokens and conventions this report itself uses to draw its charts and field diagrams. Match these if asked to generate a new chart or field diagram "in the style of" this report.',
  typography: {
    sansFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif',
    monoFont: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
    monoUsage: 'every numeric/stat value, so digits align in columns (CSS font-variant-numeric: tabular-nums)',
    sectionEyebrow: 'uppercase text, 0.14em letter-spacing, 11px, font-weight 700, muted/dim text color',
  },
  colorTheme: {
    note: 'The report supports both a dark theme (default) and a light theme; pick one rather than mixing tokens across them.',
    dark: { background: '#17181A', surface: '#212226', textPrimary: '#ECECEC', textMuted: '#9C9CA1', good: '#4FD1AE', bad: '#E8604C' },
    light: { background: '#F7F7F6', surface: '#FFFFFF', textPrimary: '#1A1A1A', textMuted: '#6B6B70', good: '#1F9D74', bad: '#C0392B' },
    usage: '"good" = positive/breaks/wins, "bad" = negative/turnovers/losses/incomplete. These are reserved for status only -- never reuse them as a plain magnitude color in a chart (e.g. a heatmap), since that collides with their status meaning.',
  },
  sequentialPalette: {
    description: 'A multi-hue navy -> teal -> gold ramp (e.g. for a heatmap cell color) rather than shades of one color, so nearby values stay visually distinct. Deliberately avoids red/orange, which are reserved for turnovers/bad status above.',
    dark: ['rgb(58,84,138)', 'rgb(56,176,165)', 'rgb(240,200,90)'],
    light: ['rgb(35,58,102)', 'rgb(27,122,111)', 'rgb(191,129,22)'],
  },
  fieldDiagram: {
    orientation: 'Portrait -- the field runs top-to-bottom, not left-to-right.',
    dimensionsYd: { length: 110, width: 40, endzoneDepth: 20 },
    coordinateSystem: 'startX/startY/endX/endY (and locationX/locationY for blocks) are 0-1 fractions of the field, matching the games[] pass/block data below. Y=0 is inside the attacking endzone (top of the diagram), Y=1 is this team’s own endzone (bottom); X is field width and has no directional meaning.',
    colors: { field: '#2E5339', endzone: '#1F3B27', boundaryAndYardLines: 'rgba(243,241,233,0.35)', brickMark: '#9FB6B4' },
    passLines: {
      completed: { stroke: '#F3F1E9', strokeWidth: 2, endMarker: 'solid triangle arrowhead' },
      assist: { stroke: '#FFB800', strokeWidth: 3, endMarker: 'solid triangle arrowhead, same on-screen size as a completed pass’s arrowhead despite the thicker line -- shrink the marker itself to compensate if using SVG markerUnits="strokeWidth"' },
      turnover: { stroke: '#E8604C', strokeWidth: 2, dashArray: '3 3', opacity: 0.85, endMarker: 'X for the thrower’s own error (throwaway); hollow circle (O) for a drop. Shape carries the distinction, not just color, so it still reads for colorblind viewers.' },
    },
    markerSizing: 'End markers are drawn noticeably larger than SVG defaults so direction/outcome reads at a glance even with many overlapping routes in one diagram -- a marker that only shows up on zoom defeats the point of it.',
  },
  chartConventions: [
    'Sequential (magnitude) scales use one consistent ramp light-to-dark (or the multi-hue ramp above), never a rainbow; always pair with a legend giving the min/max values.',
    'Never use red or orange for a plain magnitude scale -- see colorTheme.usage above.',
    'Adjacent cells/marks (e.g. heatmap cells) get a 1-2px hairline border or gap in the surface color so low values stay visually bounded instead of fading into the background.',
    'A legend is always shown for 2+ series/categories; a single-series chart doesn’t need one.',
    'Numeric table columns use the monospace font with tabular figures so digits align vertically; everything else uses the sans font.',
  ],
};

// Exact formulas for this report's trickier derived stats, phrased against
// this export's own field names -- not because you can't recompute a
// thrower-receiver pair table or similar from passes[] yourself (that's a
// straightforward groupby and you should, scoped however the question
// actually needs), but because a handful of these numbers have a specific,
// slightly non-obvious definition that's easy to get subtly wrong -- and
// getting it wrong means your answer quietly disagrees with the report a
// human is also looking at.
const RAW_DATA_FORMULAS = {
  completedPass: '!pass.throwerError && !pass.receiverError  (equivalently: !pass.turnover)',
  huckAttempt: '(pass.startY - pass.endY) * 110 >= 27   // yards gained on this throw >= 27yd, regardless of who threw it',
  assistAttempt: 'pass.endY < 20/110   // the target location is inside the attacking endzone, whether or not it was caught',
  redZoneEntry: 'the pass ORIGINATES at startY < 20/110 of the attacking endzone -- a pass that merely lands in the red zone from farther out does not count',
  catchCompletionPct: 'catches / (catches + receiverErrors)   // deliberately excludes throwerErrors from the denominator -- a receiver’s catch rate shouldn’t be dinged for a bad throw they never had a chance at',
  plusMinus: 'goals + assists + blocks - turnovers   // turnovers = throwerErrors + receiverErrors; throwerErrors includes stall-outs against us',
  leverage: 'a fair race-to-N win probability model, where N = this game’s actual final winning score and each point is an independent 50/50 coin flip. WP(i,j) = P(reach N before the opponent) from score state (i,j), via WP(i,j) = 0.5*WP(i+1,j) + 0.5*WP(i,j+1), boundary WP(N,j)=1 / WP(i,N)=0. rawSwing = abs(WP(ourScoreBefore+1, oppScoreBefore) - WP(ourScoreBefore, oppScoreBefore+1)) -- how far apart the two possible outcomes of this specific point are in win probability. leverage(point) = 10 * sqrt(rawSwing). The sqrt is a deliberate reshape, not part of the probability math: rawSwing alone decays like 1/sqrt(points remaining) for a tied score approaching the target, which on a straight *10 scale crushes everything short of the last point or two into single digits -- e.g. for a race to 15, tied 13-13 has exactly half the rawSwing of double-game-point 14-14. sqrt spreads that back out while keeping the double-game-point at exactly 10 and a decided blowout at ~0. p=0.5 is intentional: this measures game-state importance (score, points remaining), not team strength.',
  highLeveragePointsPlayed: 'count of a player’s points with point.leverage >= 7 (0-10 scale) -- for player p: count(point for point in game.points if p in point.lineup and point.leverage >= 7, across whatever games are in scope).',
  throwerReceiverPair: 'group passes[] by (thrower, receiver) across whatever games/players the question needs: n = count, completed = count where completedPass, totalYards = sum of straight-line pass distance (Math.hypot((startX-endX)*40, (startY-endY)*110) yards), totalForwardYards = sum of max(0, (startY-endY)*110).',
  combiningRatesAcrossGames: 'GOTCHA: when combining a rate stat (scoring efficiency, hold rate, completion %, ...) across more than one game, sum the underlying counts first and divide once -- never average the per-game percentages. Games have different point/possession counts, so an unweighted average of percentages silently misrepresents the combined rate. Each game’s summary.scoringEfficiency.*.* already carries numer/denom for exactly this reason.',
};

// Shared by the JSON and Markdown exports so they always describe the exact
// same slice of the season.
function rawDataSelectionMeta(gameIndices) {
  const games = gameIndices.map(gi => REPORT.games[gi]);
  return {
    games,
    gamesIncluded: games.map(g => `vs ${g.opponent} (${g.dateDisplay})`),
    seasonRecordForSelection: {
      wins: games.filter(g => g.result === 'W').length,
      losses: games.filter(g => g.result === 'L').length,
      ties: games.filter(g => g.result === 'T').length,
    },
  };
}

// Pull events are a video-tagging annotation (kept in localStorage, not in the
// baseline REPORT), one per defensive point: where our pull landed. Collected
// here so the machine-readable export carries them alongside the game data.
function collectPullEvents(gameIndices) {
  const points = (loadAnnotations().points) || {};
  const out = [];
  gameIndices.forEach(gi => {
    const g = REPORT.games[gi];
    (g.points || []).forEach(pt => {
      if (pt.isOffense || !pt.uuid) return; // pulls only happen on our defensive points
      const rec = points[pt.uuid + '#pull'];
      if (!rec) return;
      out.push({
        opponent: g.opponent,
        date: g.dateDisplay,
        pointNumber: pt.number,
        puller: rec.puller || null,
        outOfBounds: !!rec.outOfBounds,
        landX: (!rec.outOfBounds && rec.landX != null) ? rec.landX : null,
        landY: (!rec.outOfBounds && rec.landY != null) ? rec.landY : null,
        notes: rec.notes || null,
        videoTimestampSec: (rec.timestamp != null ? rec.timestamp : null),
      });
    });
  });
  return out;
}

// Opponent turnovers that weren't our blocks are synthesized events too (see
// the Data Editor's buildSteps): Statto records nothing for them, so a tagged
// one only exists in the annotations store. Same collection treatment as pulls.
function collectOppTurnoverEvents(gameIndices) {
  const points = (loadAnnotations().points) || {};
  const out = [];
  gameIndices.forEach(gi => {
    const g = REPORT.games[gi];
    (g.points || []).forEach(pt => {
      if (!pt.uuid) return;
      for (let d = 1; d <= (pt.defensivePossessions || 0); d++) {
        const rec = points[pt.uuid + '#o' + d];
        if (!rec) continue;
        out.push({
          opponent: g.opponent,
          date: g.dateDisplay,
          pointNumber: pt.number,
          opponentPossession: d,
          type: rec.oppTurnover || null,
          notes: rec.notes || null,
          videoTimestampSec: (rec.timestamp != null ? rec.timestamp : null),
        });
      }
    });
  });
  return out;
}

// Drop undefined/null/empty-array fields from a tag record so the export
// carries only what was actually set (every annotation field is optional).
function cleanTagRecord(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (v === undefined || v === null) return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = v;
  });
  return Object.keys(out).length ? out : null;
}

// Merge the video-tagging annotations (localStorage, not baked into REPORT)
// onto a COPY of the games slice: per-pass and per-block tags as `filmTags`,
// and point-level tags (defence called, pull, defensive possessions, opponent
// turnovers) as a point `filmTags`. Mutates the passed-in clone and returns it.
function mergeFilmTagsIntoGames(games) {
  const ann = loadAnnotations();
  games.forEach(g => {
    (g.points || []).forEach(pt => {
      (pt.passes || []).forEach(p => {
        const t = p.uuid && cleanTagRecord(ann.passes[p.uuid]);
        if (t) p.filmTags = t;
      });
      (pt.blocks || []).forEach(b => {
        const t = b.uuid && cleanTagRecord(ann.blocks[b.uuid]);
        if (t) b.filmTags = t;
      });
      if (!pt.uuid) return;
      const tags = cleanTagRecord(ann.points[pt.uuid]) || {};
      const pull = cleanTagRecord(ann.points[pt.uuid + '#pull']);
      if (pull) tags.pull = pull;
      const defPoss = [], oppTOs = [];
      for (let d = 1; d <= (pt.defensivePossessions || 0); d++) {
        const dr = cleanTagRecord(ann.points[pt.uuid + '#d' + d]);
        if (dr) defPoss.push(Object.assign({ possession: d }, dr));
        const or = cleanTagRecord(ann.points[pt.uuid + '#o' + d]);
        if (or) oppTOs.push(Object.assign({ possession: d }, or));
      }
      if (defPoss.length) tags.defensivePossessions = defPoss;
      if (oppTOs.length) tags.opponentTurnovers = oppTOs;
      if (Object.keys(tags).length) pt.filmTags = tags;
    });
  });
  return games;
}

// Per-game YouTube links for the selected games (Set up tab, localStorage).
function collectVideoLinks(gameIndices) {
  const vl = loadSetupData().videoLinks || {};
  return gameIndices.filter(gi => vl[gi]).map(gi => ({
    gameIndex: gi, opponent: REPORT.games[gi].opponent,
    date: REPORT.games[gi].dateDisplay, url: vl[gi],
  }));
}

// How the selected games group into tournaments (custom labels if the user set
// them, else auto-detected), matching the report's own grouping.
function collectTournamentsForExport(gameIndices) {
  const sel = new Set(gameIndices);
  return getTournaments().map(t => ({
    label: t.label,
    games: t.gameIndices.filter(i => sel.has(i)).map(i => ({
      gameIndex: i, opponent: REPORT.games[i].opponent, date: REPORT.games[i].dateDisplay,
    })),
  })).filter(t => t.games.length);
}

// The user's curated lines (Line Analysis). Season-level curation, so NOT
// filtered by the game selection -- each line carries the points it covers and
// a roster with how often each player was on it.
function collectLinesForExport() {
  const data = loadLinesData();
  const labelById = {};
  getTournaments().forEach(t => { labelById[t.id] = t.label; });
  return (data.lines || []).map(l => {
    const presence = lineRosterPresence(l.pointKeys);
    const roster = [...presence.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([player, n]) => ({
        player, pointsPresent: n,
        pctOfLinePoints: presence.total ? Math.round((n / presence.total) * 1000) / 10 : 0,
      }));
    return {
      name: l.name,
      tournament: l.tournamentId ? (labelById[l.tournamentId] || null) : null,
      pointCount: l.pointKeys.length,
      points: l.pointKeys.map(k => ({ gameIndex: Number(k.split('|')[0]), pointNumber: Number(k.split('|')[1]) })),
      roster,
    };
  });
}

// field key -> { label, description } for every Advanced Stats (EDGE) column,
// keyed by the SAME field name the advancedStatsForSelection rows use so the two
// join directly, so each number can be cited with a name and an explanation.
function advancedStatsGlossary() {
  const g = {};
  ADVANCED_COLUMNS.forEach(c => { if (c.key !== 'player') g[c.key] = { label: c.label, description: c.full }; });
  return g;
}

function buildRawDataExportJSON(gameIndices) {
  const meta = rawDataSelectionMeta(gameIndices);
  // Deep-clone so merging film tags never mutates the live REPORT.games.
  const gamesWithTags = mergeFilmTagsIntoGames(JSON.parse(JSON.stringify(meta.games)));
  return {
    exportedAt: new Date().toISOString(),
    teamName: REPORT.teamName,
    gamesIncluded: meta.gamesIncluded,
    seasonRecordForSelection: meta.seasonRecordForSelection,
    glossary: RAW_DATA_GLOSSARY,
    notes: RAW_DATA_NOTES,
    styleGuide: RAW_DATA_STYLE_GUIDE,
    formulas: RAW_DATA_FORMULAS,
    games: gamesWithTags,
    // Names are the join key everywhere in this export; roster[] is the one
    // place that also carries each player's gender designation (for mixed lines)
    // and whether they have a photo in the companion player-photos ZIP.
    roster: allPlayerNames().map(name => {
      const has = !!(loadSetupData().playerPhotos || {})[name];
      const gc = (REPORT.playerGenders || {})[name];
      return {
        name,
        gender: gc === 1 ? 'WMP' : (gc === 0 ? 'MMP' : null),
        genderCode: (gc === 1 || gc === 0) ? gc : null,
        hasPhoto: has,
        photoFile: has ? 'photos/' + slug(name) + '.png' : null,
      };
    }),
    seasonLeaderboardForSelection: aggregateSeasonStats(gameIndices),
    // Project each row down to the documented columns only -- computeAdvancedStats
    // also carries internal intermediates (thrge, adjT, ...) that aren't in the
    // glossary and would just be noise in the export.
    advancedStatsForSelection: computeAdvancedStats(gameIndices).map(r => {
      const o = {};
      ADVANCED_COLUMNS.forEach(c => { o[c.key] = r[c.key]; });
      return o;
    }),
    advancedStatsGlossary: advancedStatsGlossary(),
    lines: collectLinesForExport(),
    videoLinks: collectVideoLinks(gameIndices),
    tournaments: collectTournamentsForExport(gameIndices),
    pullEvents: collectPullEvents(gameIndices),
    opponentTurnoverEvents: collectOppTurnoverEvents(gameIndices),
  };
}

// A companion .md file meant to travel alongside the JSON export -- broader
// prose context than the JSON's own glossary/notes fields, plus concrete
// instructions and example prompts for a person handing this data to an
// LLM. The JSON stays self-contained on its own (glossary/notes duplicated
// there) in case someone only grabs that file, but this is the richer,
// more actionable companion for people who want it.
// Renders RAW_DATA_STYLE_GUIDE to markdown -- built from the same object
// embedded in the JSON export (not a separately hand-written copy) so the
// two can't drift apart.
function styleGuideMarkdown() {
  const sg = RAW_DATA_STYLE_GUIDE;
  const colorRows = Object.keys(sg.colorTheme.dark).map(key =>
    `| ${key} | ${sg.colorTheme.dark[key]} | ${sg.colorTheme.light[key]} |`
  );
  const passLineRows = Object.entries(sg.fieldDiagram.passLines).map(([kind, spec]) =>
    `| ${kind} | ${spec.stroke} | ${spec.strokeWidth}${spec.dashArray ? ` (dashed: ${spec.dashArray})` : ''} | ${spec.endMarker} |`
  );
  const conventions = sg.chartConventions.map(c => `- ${c}`).join('\n');
  return `## Visual style guide

If asked to generate a custom chart or field diagram "in the style of" this
report, match these tokens rather than guessing — they're copied directly
from the report's own CSS and SVG drawing code, not invented for this file.

**Typography**
- Sans (body, labels, chart titles): \`${sg.typography.sansFont}\`
- Monospace (${sg.typography.monoUsage}): \`${sg.typography.monoFont}\`
- Section headers: ${sg.typography.sectionEyebrow}

**Color theme** — pick dark or light, don't mix tokens across them:

| Token | Dark | Light |
|---|---|---|
${colorRows.join('\n')}

\`good\`/\`bad\` are reserved for status (wins/breaks vs. losses/turnovers) —
never reuse them as a plain magnitude color in a chart.

**Sequential (magnitude) palette** — ${sg.sequentialPalette.description}
- Dark: ${sg.sequentialPalette.dark.join(' → ')}
- Light: ${sg.sequentialPalette.light.join(' → ')}

**Field diagram conventions**
- ${sg.fieldDiagram.orientation} ${sg.fieldDiagram.dimensionsYd.length}yd × ${sg.fieldDiagram.dimensionsYd.width}yd, ${sg.fieldDiagram.dimensionsYd.endzoneDepth}yd endzones.
- Coordinates: ${sg.fieldDiagram.coordinateSystem}
- Field \`${sg.fieldDiagram.colors.field}\`, endzones \`${sg.fieldDiagram.colors.endzone}\`, yard/boundary lines \`${sg.fieldDiagram.colors.boundaryAndYardLines}\`, brick marks \`${sg.fieldDiagram.colors.brickMark}\`.
- Pass lines:

| Kind | Color | Width | End marker |
|---|---|---|---|
${passLineRows.join('\n')}

- ${sg.fieldDiagram.markerSizing}

**General chart conventions**
${conventions}
`;
}

// Renders RAW_DATA_FORMULAS to markdown, same "built from the JSON's own
// object" approach as styleGuideMarkdown above.
function formulasMarkdown() {
  const labels = {
    completedPass: 'A pass is "completed"',
    huckAttempt: 'Huck attempt',
    assistAttempt: 'Assist attempt',
    redZoneEntry: 'Red-zone entry',
    catchCompletionPct: 'Catch completion %',
    plusMinus: 'Plus/minus',
    throwerReceiverPair: 'Thrower-receiver pair stats (not precomputed below)',
  };
  const rows = Object.entries(RAW_DATA_FORMULAS)
    .filter(([key]) => key !== 'combiningRatesAcrossGames')
    .map(([key, formula]) => `| ${labels[key] || key} | ${formula} |`);
  return `## Formulas & derived-stat gotchas

This export deliberately does **not** include every derived table the report
itself shows on screen — a thrower-receiver pair matrix, for instance, is
just a groupby over \`passes[]\` below, and the useful slice depends entirely
on the question (one game vs. the whole season, two specific players,
O-points only, ...). Rather than lock you into the report's own predefined
tables, compute what the question actually needs, fresh, using these exact
formulas so the answer matches what a human sees in the report itself:

| What | Formula |
|---|---|
${rows.join('\n')}

> **${RAW_DATA_FORMULAS.combiningRatesAcrossGames}**
`;
}

function buildRawDataMarkdown(gameIndices) {
  const meta = rawDataSelectionMeta(gameIndices);
  const record = `${meta.seasonRecordForSelection.wins}-${meta.seasonRecordForSelection.losses}` +
    (meta.seasonRecordForSelection.ties ? `-${meta.seasonRecordForSelection.ties}` : '');
  const jsonFilename = `${slug(REPORT.teamName)}_raw_data.json`;
  const gamesList = meta.gamesIncluded.map(g => `- ${g}`).join('\n');
  const glossaryTable = ['| Term | Meaning |', '|---|---|']
    .concat(Object.entries(RAW_DATA_GLOSSARY).map(([term, def]) => `| ${term} | ${def} |`))
    .join('\n');

  return `# ${REPORT.teamName} — Raw Data Context & Usage Guide

This file is a companion to \`${jsonFilename}\`, an export of ${REPORT.teamName}'s
Ultimate frisbee season data. Upload or paste **both files** together when
working with an LLM — the JSON has the numbers, this file explains what
they mean and how to use them well.

**Games included in this export:** ${meta.games.length} game${meta.games.length === 1 ? '' : 's'}, record ${record}
${gamesList}

## How the data is organized

The JSON has these top-level sections:

- \`games[]\` — one entry per game (opponent, date, score, result), each with:
  - \`points[]\` — one entry per point played, with \`passes[]\` (every throw),
    \`blocks[]\` (every defensive block), and \`lineup[]\` (who was on the field).
    A tagged pass or block also carries \`filmTags\` (throw hand/release/
    distance/stall, or block type and highlight, plus a video \`timestamp\` and notes); a
    point may carry \`filmTags\` too (defence called, pull spot, defensive
    possessions, opponent turnovers)
  - \`boxScore[]\` — every player's per-game stats (throws, completions,
    blocks, scoring efficiency, and more)
  - \`summary\` — team-level game stats: hold/break rates, line stats split
    by combined/offense/defense, and three scoring-efficiency views
- \`seasonLeaderboardForSelection[]\` — the same kind of per-player stats as
  each game's \`boxScore\`, but totaled across every game in this export
- \`advancedStatsForSelection[]\` — one row per player of the Ultiworld **EDGE**
  goal-equivalent / efficiency metrics for the selection; \`advancedStatsGlossary\`
  defines each column. Adapted to a single team, so read them as relative
  across your own roster, not against outside benchmarks
- \`lines[]\` — the user's curated line groupings (name, the points each
  covers, and a per-player presence roster). Season-level, **not** filtered by
  the game selection
- \`videoLinks[]\` — the YouTube URL per selected game; append \`&t=<timestamp>s\`
  from any \`filmTags.timestamp\` to deep-link a tagged moment
- \`tournaments[]\` — how the selected games group into tournaments (custom
  names if set), for event-scoped questions
- \`roster[]\` — every player, with their mixed-line gender designation
  (\`gender\`: \`"WMP"\`/\`"MMP"\`, \`genderCode\`: \`1\`/\`0\`, both \`null\` if unset),
  plus \`hasPhoto\` and \`photoFile\`. Photos are
  deliberately **not** embedded in the JSON (base64 images would add
  megabytes to a file meant to be pasted into a chat, and can't be viewed
  out of a string field anyway). They come as a separate
  \`${slug(REPORT.teamName)}_player_photos.zip\` from the same Raw Data tab,
  where each file is named exactly as \`photoFile\` says. If you were handed
  that ZIP too, use it to put faces to names — in a scouting one-pager, a
  season-awards graphic, or player cards. If not, ignore \`roster[]\`.
- \`pullEvents[]\` / \`opponentTurnoverEvents[]\` — video-tagged events that
  exist nowhere in the underlying Statto data; only present for games
  somebody has tagged (flattened copies of the point \`filmTags\` above)
- \`glossary\` / \`notes\` / \`styleGuide\` / \`formulas\` — the same reference
  material as the sections below, duplicated inside the JSON itself in case
  this file gets separated from it

**Key things to know:**

- Coordinates (\`startX\`/\`startY\`/\`endX\`/\`endY\` on every pass) are fractions
  from 0 to 1 of the field. Y decreases toward the attacking endzone (Y=0 is
  inside it, Y=1 is this team's own endzone); X is field width and has no
  directional meaning.
- A pass is "completed" when both \`throwerError\` and \`receiverError\` are
  false. A single turnover can be flagged as **both** (shared blame); when
  that happens the report charges 0.5 of a throwaway and 0.5 of a drop, so
  per-player \`throwerErrors\`/\`receiverErrors\`/\`turnovers\`/\`plusMinus\`
  can be half-integers while team turnover totals stay whole. \`assist\`
  flags the pass that directly led to a goal; \`secondaryAssist\` flags the
  pass immediately before it.
- On a point: \`isOffense\` = this team started the point with the disc,
  trying to score ("O-point"); false = defense ("D-point"). \`scored\` /
  \`result=1\` = this team scored that point; \`result=-1\` = the opponent did.
- Blocks are this team's own defensive plays (turnovers forced on the
  opponent); \`locationX\`/\`locationY\` is where the block happened.
- **Statto only records this team's own actions.** A point the opponent won
  by simply holding their own possession has zero recorded passes for that
  point — never infer score or point counts by counting passes; use the
  \`points[]\` array itself, which has one entry per point regardless.
- Player **names** (not IDs) are the join key across \`points\`, \`passes\`,
  \`blocks\`, \`lineup\`, and \`boxScore\` within this export.

## Glossary

${glossaryTable}

${styleGuideMarkdown()}
${formulasMarkdown()}
## Generating a game summary

To get a good game summary out of an LLM, ask for these three things
specifically rather than just "summarize this game":

> Using the attached JSON, write a concise summary (3–5 paragraphs) of our
> game against **[Opponent]** on **[date]**. Cover:
> 1. **Narrative** — how the game unfolded: momentum shifts, runs of points
>    won or lost in a row, and the turning point if there was one.
> 2. **Individual outliers** — players whose performance in this game stood
>    out from their own season norms (compare this game's \`boxScore\` row
>    for each player against their row in \`seasonLeaderboardForSelection\`,
>    adjusted for games played). Call out standout performances and rough
>    patches alike.
> 3. **The stats that actually explain the story** — hold/break rate,
>    red-zone conversion, the O-line vs. D-line split, and the most
>    productive thrower-receiver connections. Don't list every number —
>    pick the ones that support points 1 and 2.
> Keep it tight enough that a coach could read it in under a minute.

## Example questions to ask

Descriptive:

- "What were the biggest momentum swings in [game], and what changed?"
- "Which thrower-receiver pairs had both high volume and a high completion
  percentage this season?"
- "How does our red-zone conversion rate compare between O-line and D-line
  points, across the whole season?"

Actionable / coaching-focused:

- "Based on turnovers, drops, and huck completion rate across the season,
  what would you suggest as a practice focus for next week?"
- "Which two or three players have the biggest gap between their offensive
  and defensive scoring efficiency — what might explain it, and is there a
  lineup change worth trying?"
- "Are there thrower-receiver connections we rely on heavily that have a
  below-average completion rate? Those are our biggest turnover risk."
- "Looking at each player's stats game by game, is anyone trending up or
  down significantly over the season — fatigue, improvement, a role change?"
- "Given our hold rate vs. break rate this season, are we winning more
  through offense or defense? What does that suggest about how we should
  prepare for our next opponent?"
- "Identify our most common turnover situations — is there a pattern by
  field position, point type (O vs D), or specific player worth addressing?"

Visual (uses the style guide above):

- "Draw an SVG field diagram of every completed pass thrown by [player] this
  season, in the style of this report."
- "Build a small bar chart comparing hold rate vs. break rate across our
  games, using the report's color theme."

---
Generated ${new Date().toISOString().slice(0, 10)} from ${REPORT.teamName}'s season report.
`;
}

// Shared by the JSON and Markdown export cards: a Download + Copy button
// pair, with the Copy button's label reverting after a moment to confirm
// success or failure. contentFn/filenameFn are re-evaluated on each click
// so they always reflect the current games selection.
function buildExportButtonRow(downloadLabel, copyLabel, contentFn, filenameFn, mime) {
  const row = el('div', { class: 'controls-row' }, []);
  const downloadBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode(downloadLabel)]);
  const copyBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode(copyLabel)]);
  downloadBtn.addEventListener('click', () => downloadFile(contentFn(), filenameFn(), mime));
  copyBtn.addEventListener('click', () => {
    const original = copyBtn.textContent;
    const revert = () => setTimeout(() => { copyBtn.textContent = original; }, 1500);
    navigator.clipboard.writeText(contentFn())
      .then(() => { copyBtn.textContent = 'Copied!'; revert(); })
      .catch(() => { copyBtn.textContent = 'Copy failed'; revert(); });
  });
  row.appendChild(downloadBtn);
  row.appendChild(copyBtn);
  return row;
}

function buildRawDataSection() {
  const section = el('section', { class: 'view', id: 'raw-data' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Raw Data')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Export the data behind this report — as CSVs for a spreadsheet, or as one structured JSON file to hand to an LLM.')]));

  let selectedGames = REPORT.games.map((g, i) => i);

  const controlsRow = el('div', { class: 'controls-row' }, []);
  section.appendChild(controlsRow);

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('CSV Exports')]));
  const exportGrid = el('div', { class: 'export-grid' }, []);
  section.appendChild(exportGrid);

  const EXPORTS = [
    {
      title: 'Passes',
      desc: 'One row per pass: thrower, receiver, coordinates, outcome flags, and derived yardage/huck/assist-attempt fields.',
      rowsFn: passRowsForExport, columns: PASS_EXPORT_COLUMNS, unit: 'pass',
      filename: () => `${slug(REPORT.teamName)}_passes.csv`,
    },
    {
      title: 'Points',
      desc: 'One row per point, including points the opponent held with no recorded passes — the only reliable source for point-by-point score progression.',
      rowsFn: pointRowsForExport, columns: POINT_EXPORT_COLUMNS, unit: 'point',
      filename: () => `${slug(REPORT.teamName)}_points.csv`,
    },
    {
      title: 'Blocks',
      desc: 'One row per defensive block: who, where, and whether it was a Callahan or a stall-out.',
      rowsFn: blockRowsForExport, columns: BLOCK_EXPORT_COLUMNS, unit: 'block',
      filename: () => `${slug(REPORT.teamName)}_blocks.csv`,
    },
    {
      title: 'Players (per game)',
      desc: "Every selected game's box score rows combined into one file — one row per player per game.",
      rowsFn: playerGameRowsForExport, columns: null, unit: 'row',
      filename: () => `${slug(REPORT.teamName)}_players_per_game.csv`,
    },
    {
      title: 'Season Leaderboard',
      desc: 'One row per player, totals summed across the selected games — the same numbers shown on the Season tab.',
      rowsFn: seasonLeaderboardRowsForExport, columns: null, unit: 'player',
      filename: () => `${slug(REPORT.teamName)}_season_leaderboard.csv`,
    },
    {
      title: 'Game Summaries',
      desc: 'One row per game: score, hold/break rates, line stats, and all three scoring-efficiency views, flattened.',
      rowsFn: gameSummaryRowsForExport, columns: null, unit: 'game',
      filename: () => `${slug(REPORT.teamName)}_game_summaries.csv`,
    },
  ];

  const captionEntries = [];
  EXPORTS.forEach(def => {
    const card = el('div', { class: 'export-card' }, []);
    card.appendChild(el('div', { class: 'export-card-title' }, [document.createTextNode(def.title)]));
    card.appendChild(el('p', { class: 'export-card-desc' }, [document.createTextNode(def.desc)]));
    const caption = el('p', { class: 'export-card-count' }, []);
    card.appendChild(caption);
    const btn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Download CSV')]);
    btn.addEventListener('click', () => downloadObjectsAsCSV(def.rowsFn(selectedGames), def.filename(), def.columns));
    card.appendChild(btn);
    exportGrid.appendChild(card);
    captionEntries.push({ def, caption });
  });

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Machine-Readable Export')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('A JSON file with the raw data, plus a companion Markdown file with the broader context, instructions, and example questions for using it with an LLM. Upload or paste both together.')]));

  const exportPairGrid = el('div', { class: 'export-grid' }, []);
  section.appendChild(exportPairGrid);

  const jsonCard = el('div', { class: 'export-card' }, [
    el('div', { class: 'export-card-title' }, [document.createTextNode('Data (JSON)')]),
    el('p', { class: 'export-card-desc' }, [document.createTextNode("Every selected game's raw points/passes/blocks/lineups, box scores, and summaries, plus a season leaderboard for the selection.")]),
  ]);
  const jsonCaption = el('p', { class: 'export-card-count' }, []);
  jsonCard.appendChild(jsonCaption);
  jsonCard.appendChild(buildExportButtonRow(
    'Download JSON', 'Copy JSON',
    () => JSON.stringify(buildRawDataExportJSON(selectedGames), null, 2),
    () => `${slug(REPORT.teamName)}_raw_data.json`, 'application/json'
  ));
  exportPairGrid.appendChild(jsonCard);

  const mdCard = el('div', { class: 'export-card' }, [
    el('div', { class: 'export-card-title' }, [document.createTextNode('Context (Markdown)')]),
    el('p', { class: 'export-card-desc' }, [document.createTextNode('A glossary, field-by-field orientation, instructions for generating a game summary, and example questions with an eye on actionable insights.')]),
  ]);
  const mdCaption = el('p', { class: 'export-card-count' }, []);
  mdCard.appendChild(mdCaption);
  mdCard.appendChild(buildExportButtonRow(
    'Download Context (.md)', 'Copy Context',
    () => buildRawDataMarkdown(selectedGames),
    () => `${slug(REPORT.teamName)}_raw_data_context.md`, 'text/markdown'
  ));
  exportPairGrid.appendChild(mdCard);

  // Photos ship as a ZIP rather than inside the JSON: base64-ing 256px PNGs
  // into a text file would add megabytes to an export meant to be pasted into
  // a chat, and an LLM can't view an image out of a JSON string field anyway.
  // The JSON's roster[] carries each player's photoFile name so the two line up.
  const photoCard = el('div', { class: 'export-card' }, [
    el('div', { class: 'export-card-title' }, [document.createTextNode('Player photos (ZIP)')]),
    el('p', { class: 'export-card-desc' }, [document.createTextNode('One PNG per player, named after them (photos/first_last.png) — the filenames match the roster[].photoFile field in the JSON, so an LLM or a slide deck can pair a face to a name.')]),
  ]);
  const photoCaption = el('p', { class: 'export-card-count' }, []);
  photoCard.appendChild(photoCaption);
  const photoBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Download photos (.zip)')]);
  photoBtn.addEventListener('click', () => {
    const files = playerPhotoFiles();
    if (!files.length) return;
    downloadFile(buildZip(files), `${slug(REPORT.teamName)}_player_photos.zip`, 'application/zip');
  });
  photoCard.appendChild(el('div', { class: 'controls-row' }, [photoBtn]));
  exportPairGrid.appendChild(photoCard);

  function renderCounts() {
    captionEntries.forEach(({ def, caption }) => {
      const n = def.rowsFn(selectedGames).length;
      caption.textContent = `${n.toLocaleString()} ${pluralizeUnit(def.unit, n)} across ${selectedGames.length} game${selectedGames.length === 1 ? '' : 's'}`;
    });
    const jsonKB = Math.round(JSON.stringify(buildRawDataExportJSON(selectedGames)).length / 1024);
    jsonCaption.textContent = `~${jsonKB.toLocaleString()} KB across ${selectedGames.length} game${selectedGames.length === 1 ? '' : 's'}`;
    const mdKB = Math.round(buildRawDataMarkdown(selectedGames).length / 1024);
    mdCaption.textContent = `~${mdKB.toLocaleString()} KB, same games as above`;
    const files = playerPhotoFiles();
    const photoKB = Math.round(files.reduce((s, f) => s + f.data.length, 0) / 1024);
    photoBtn.disabled = files.length === 0;
    photoCaption.textContent = files.length
      ? `${files.length} photo${files.length === 1 ? '' : 's'}, ~${photoKB.toLocaleString()} KB`
      : 'No player photos set yet — add them on the Set up tab.';
  }

  controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; renderCounts(); }));
  renderCounts();
  return section;
}

// ---------- Taggable events ----------
// Every taggable event in one point, in the order it happened. Shared by the
// Data Editor's stepper and the Query pane so the two always agree on what
// exists and -- for the synthesized events (pull, defensive possession,
// opponent turnover) -- on the annotation key each one is stored under.
function buildPointEvents(pt) {
  const out = [];
  // Every defensive point opens with a Pull (our pull to the opponent), ahead
  // of the first defensive-possession/scheme event.
  if (!pt.isOffense) out.push({ kind: 'pull', pt, uuid: pt.uuid + '#pull' });
  // Interleave our offensive possessions (their passes) with the opponent's
  // offensive possessions (= our defensive possessions), in chronological
  // order: the disc starts with whoever received the pull (isOffense) and
  // flips on every turnover. Each defensive possession becomes its own event
  // so it can be tagged with its scheme -- and a clean opponent hold (no
  // passes, no blocks of ours) stays reachable rather than being skipped.
  const passesByPoss = new Map();
  (pt.passes || []).forEach(p => {
    if (!p.uuid) return;
    if (!passesByPoss.has(p.possession)) passesByPoss.set(p.possession, []);
    passesByPoss.get(p.possession).push(p);
  });
  const ourPossNums = [...passesByPoss.keys()].sort((a, b) => a - b);
  const defCount = pt.defensivePossessions || 0;
  // Blocks bucketed by how many of our possessions preceded them (from
  // stats.py), so each block lands mid-point -- right after the opponent
  // possession it ended and before the possession it handed us -- instead of
  // all being dumped at the end of the point.
  const blocksBefore = new Map();
  (pt.blocks || []).forEach(b => {
    if (!b.uuid) return;
    const gi = (b.afterOurPossessions != null) ? b.afterOurPossessions : ourPossNums.length;
    if (!blocksBefore.has(gi)) blocksBefore.set(gi, []);
    blocksBefore.get(gi).push(b);
  });
  const emitBlocksBefore = (gi) => {
    const list = blocksBefore.get(gi) || [];
    list.forEach(b => out.push({ kind: 'block', pt, item: b, uuid: b.uuid }));
    blocksBefore.delete(gi);
    return list.length;
  };
  // Every opponent possession we won the disc back from ended in a turnover:
  // either one of our blocks (a recorded event) or an unforced opponent error.
  // Statto records nothing at all for the latter, so we synthesize the event
  // here. Held pending until we see whether a block claimed it.
  let ourIdx = 0, defIdx = 0;
  let pendingOppTurn = null;
  // Settles the pending turnover: if a block of ours is waiting at this point
  // in the flow, that block WAS the turnover; otherwise it was unforced and we
  // emit the synthesized event. Resolving the block here (rather than only on
  // the way into one of our possessions) matters when we won the disc back but
  // recorded no passes with it -- an immediate re-turnover leaves no possession
  // to hang the block off, and the turnover would otherwise be double-counted.
  const flushOppTurn = () => {
    if (pendingOppTurn == null) return;
    const n = pendingOppTurn;
    pendingOppTurn = null;
    if (emitBlocksBefore(ourIdx)) return;
    out.push({ kind: 'oppTurn', pt, defN: n, uuid: pt.uuid + '#o' + n });
  };
  let turn = pt.isOffense ? 'us' : 'them';
  const total = ourPossNums.length + defCount;
  for (let s = 0; s < total; s++) {
    const takeUs = (turn === 'us') ? (ourIdx < ourPossNums.length) : (defIdx >= defCount);
    if (takeUs) {
      flushOppTurn();
      emitBlocksBefore(ourIdx); // any further blocks bucketed at this possession
      passesByPoss.get(ourPossNums[ourIdx]).forEach(p => out.push({ kind: 'pass', pt, item: p, uuid: p.uuid }));
      ourIdx++;
      turn = 'them';
    } else {
      flushOppTurn();
      defIdx++;
      out.push({ kind: 'def', pt, defN: defIdx, uuid: pt.uuid + '#d' + defIdx });
      // The opponent's last possession of a point they scored ended in a goal,
      // not a turnover -- every other one gave us the disc back.
      pendingOppTurn = (pt.result === -1 && defIdx === defCount) ? null : defIdx;
      turn = 'us';
    }
  }
  flushOppTurn();
  // Any blocks after our last recorded possession (or missing order info).
  [...blocksBefore.keys()].sort((a, b) => a - b).forEach(gi => emitBlocksBefore(gi));
  return out;
}

// The stored annotation record for an event, whichever store it lives in.
function annotationRecordFor(ann, ev) {
  if (ev.kind === 'pass') return ann.passes[ev.uuid];
  if (ev.kind === 'block') return ann.blocks[ev.uuid];
  return (ann.points || {})[ev.uuid];  // pull / def / oppTurn
}

// ---------- Film tags on a game's point diagram ----------
// The tag values stored on one annotation record, flattened to display strings
// (a multi-select field like turnoverReason holds an array).
function filmTagValues(rec, keys) {
  const out = [];
  if (!rec) return out;
  keys.forEach(k => {
    const v = rec[k];
    if (Array.isArray(v)) { if (v.length) out.push(v.join(' + ')); }
    else if (v) out.push(v);
  });
  return out;
}
const FILM_PASS_TAG_KEYS = ['hand', 'release', 'distance', 'stall', 'catch', 'highlight', 'turnoverReason'];

// How one tagged event reads in the film strip: a short kind label, who/what it
// was, and its tag values. Kept in one place so the strip and the diagram
// tooltips describe an event the same way.
function filmEventDescriptor(ev, rec) {
  if (ev.kind === 'pass') {
    const p = ev.item;
    return { kind: 'Pass', main: `${p.thrower || '?'} → ${p.receiver || '?'}`, tags: filmTagValues(rec, FILM_PASS_TAG_KEYS) };
  }
  if (ev.kind === 'block') {
    return { kind: 'Block', main: ev.item.player || '?', tags: filmTagValues(rec, ['type', 'highlight']) };
  }
  if (ev.kind === 'pull') {
    const landing = rec.outOfBounds ? 'Out-of-bounds' : (rec.landX != null ? 'In-bounds' : null);
    return { kind: 'Pull', main: rec.puller || 'Pull', tags: landing ? [landing] : [] };
  }
  if (ev.kind === 'def') {
    return { kind: 'Defence', main: `Their possession ${ev.defN}`, tags: filmTagValues(rec, ['defScheme']) };
  }
  return { kind: 'Opp TO', main: `Their possession ${ev.defN}`, tags: filmTagValues(rec, ['oppTurnover']) };
}

// The tagged events of one point, in the order they happened. Empty when
// nothing in this point has been tagged -- which is the normal case until
// someone works through the game in the Data Editor, so every caller treats an
// empty result as "show nothing at all" rather than as an empty state.
function pointFilmRows(point) {
  const ann = loadAnnotations();
  const rows = [];
  buildPointEvents(point).forEach(ev => {
    const rec = annotationRecordFor(ann, ev);
    if (rec && Object.keys(rec).length) rows.push({ ev, rec });
  });
  return rows;
}

function youtubeTimestampUrl(vid, secs) {
  return `https://www.youtube.com/watch?v=${vid}&t=${secs}s`;
}

// Every player who appears in a box score this season -- the candidate pullers.
function allPlayerNames() {
  const set = new Set();
  REPORT.games.forEach(g => (g.boxScore || []).forEach(r => { if (r.player) set.add(r.player); }));
  return [...set].sort();
}

// The event kinds the Query pane can list, with the filter dropdowns each one
// offers and the noun used in its "N of M ..." summary line.
const QUERY_KINDS = {
  pass: { label: 'Passes', word: 'passes', filterKeys: ['hand', 'release', 'distance', 'stall', 'catch', 'highlight', 'turnoverReason'] },
  block: { label: 'Blocks', word: 'blocks', filterKeys: ['type', 'highlight'] },
  pull: { label: 'Pulls', word: 'pulls', filterKeys: ['landing', 'puller'] },
  def: { label: 'D-possessions', word: 'defensive possessions', filterKeys: ['defScheme'] },
  oppTurn: { label: 'Opp turnovers', word: 'opponent turnovers', filterKeys: ['oppTurnover'] },
};

// ---------- Data Editor: Query pane ----------
// Reads the film annotations back out: filter tagged passes (or blocks) across
// any games and get a clip list, each result deep-linking to that moment in
// the game's YouTube video. Percentages are relative to the chosen outcome
// population, so "set Outcome = Turnover, Release = Around, Hand = Backhand"
// directly answers "what share of turnovers were around backhands".
function buildAnnotationQueryPane() {
  const pane = el('div', { class: 'de-query' }, []);
  pane.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('Filter your tagged events — passes, blocks, pulls, defensive possessions or opponent turnovers — across any games. Each result deep-links to the moment in that game’s video. The percentage is the share of every event of that kind in scope, so e.g. Pulls + Landing = Out-of-bounds reads directly as “what fraction of our pulls went out”.')]));

  let selectedGames = REPORT.games.map((g, i) => i);
  let showKind = 'pass';
  const filters = {};

  function labeled(labelText, node) {
    return el('div', { class: 'de-qfield' }, [el('span', { class: 'de-field-label' }, [document.createTextNode(labelText)]), node]);
  }

  const topRow = el('div', { class: 'de-query-top' }, []);
  pane.appendChild(topRow);
  topRow.appendChild(labeled('Games', buildGameFilterDropdown(idx => { selectedGames = idx; render(); })));
  topRow.appendChild(labeled('Show', buildSegToggle(
    Object.keys(QUERY_KINDS).map(k => ({ key: k, label: QUERY_KINDS[k].label })),
    (k) => { showKind = k; buildFilterControls(); render(); }, showKind)));

  const filterRow = el('div', { class: 'de-query-filters' }, []);
  pane.appendChild(filterRow);

  const summary = el('div', { class: 'de-query-summary' }, []);
  const copyBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Copy timestamp links')]);
  copyBtn.addEventListener('click', copyLinks);
  pane.appendChild(el('div', { class: 'controls-row de-query-summary-row' }, [summary, copyBtn]));

  const results = el('div', { class: 'de-query-results' }, []);
  pane.appendChild(results);

  let lastLinks = [];

  function dropdown(labelText, options, key) {
    const sel = el('select', { class: 'de-select' }, [el('option', { value: '' }, [document.createTextNode('Any')])]);
    options.forEach(v => sel.appendChild(el('option', { value: v }, [document.createTextNode(vocabLabel(key, v))])));
    sel.value = filters[key] || '';
    sel.addEventListener('change', () => { filters[key] = sel.value; render(); });
    return labeled(labelText, sel);
  }

  function buildFilterControls() {
    Object.keys(filters).forEach(k => delete filters[k]);
    filterRow.innerHTML = '';
    if (showKind === 'pass') {
      // Outcome comes from the pass data itself (not a tag), so it re-scopes
      // the denominator: "of the turnovers, how many were around backhands".
      filterRow.appendChild(dropdown('Outcome', ['Completed', 'Turnover', 'Assist'], 'outcome'));
      filterRow.appendChild(dropdown('Hand', ANNOTATION_VOCAB.hand, 'hand'));
      filterRow.appendChild(dropdown('Release', ANNOTATION_VOCAB.release, 'release'));
      filterRow.appendChild(dropdown('Distance', ANNOTATION_VOCAB.distance, 'distance'));
      filterRow.appendChild(dropdown('Stall', ANNOTATION_VOCAB.stall, 'stall'));
      filterRow.appendChild(dropdown('Catch', ANNOTATION_VOCAB.catch, 'catch'));
      filterRow.appendChild(dropdown('Highlight', ANNOTATION_VOCAB.highlight, 'highlight'));
      filterRow.appendChild(dropdown('Turnover reason', ANNOTATION_VOCAB.turnoverReason, 'turnoverReason'));
    } else if (showKind === 'block') {
      filterRow.appendChild(dropdown('Block type', BLOCK_VOCAB.type, 'type'));
      filterRow.appendChild(dropdown('Highlight', ANNOTATION_VOCAB.highlight, 'highlight'));
    } else if (showKind === 'pull') {
      filterRow.appendChild(dropdown('Landing', ['In-bounds', 'Out-of-bounds'], 'landing'));
      filterRow.appendChild(dropdown('Puller', allPlayerNames(), 'puller'));
    } else if (showKind === 'def') {
      filterRow.appendChild(dropdown('Defensive scheme', POINT_VOCAB.defScheme, 'defScheme'));
    } else if (showKind === 'oppTurn') {
      filterRow.appendChild(dropdown('Turnover type', POINT_VOCAB.oppTurnover, 'oppTurnover'));
    }
  }

  function outcomeMatch(rec, val) {
    if (!val) return true;
    if (val === 'Turnover') return !!rec.turnover;
    if (val === 'Assist') return !!rec.assist;
    if (val === 'Completed') return !rec.turnover;
    return true;
  }
  const OUTCOME_WORD = { Turnover: 'turnovers', Assist: 'assists', Completed: 'completed passes' };

  // One row per event of the selected kind, tagged or not -- untagged ones are
  // the denominator; only tagged ones become results.
  function describe(ev, a) {
    if (ev.kind === 'pass') {
      const p = ev.item;
      return {
        main: `${p.thrower || '?'} → ${p.receiver || '?'}`,
        outcome: p.assist ? 'Assist' : (p.throwerError && p.receiverError) ? 'Throwaway + drop' : p.throwerError ? 'Throwaway' : p.receiverError ? 'Drop' : 'Completed',
        turnover: p.turnover, assist: p.assist,
      };
    }
    if (ev.kind === 'block') return { main: `${ev.item.player || '?'} — block`, outcome: '' };
    if (ev.kind === 'pull') {
      return {
        main: a.puller ? `${a.puller} — pull` : 'Pull',
        outcome: a.outOfBounds ? 'Out-of-bounds' : (a.landX != null ? 'In-bounds' : ''),
      };
    }
    if (ev.kind === 'def') return { main: `Defensive possession ${ev.defN}`, outcome: '' };
    return { main: `Opponent turnover (their possession ${ev.defN})`, outcome: '' };
  }

  function gather() {
    const ann = loadAnnotations();
    const setup = loadSetupData();
    const rows = [];
    selectedGames.forEach(gi => {
      const g = REPORT.games[gi];
      const vid = parseYouTubeId(setup.videoLinks[gi]);
      (g.points || []).forEach(pt => {
        buildPointEvents(pt).forEach(ev => {
          if (ev.kind !== showKind) return;
          const a = annotationRecordFor(ann, ev) || {};
          rows.push(Object.assign({ opponent: g.opponent, point: pt.number, a, vid, timestamp: a.timestamp }, describe(ev, a)));
        });
      });
    });
    return rows;
  }

  function tagMatch(a) {
    return (QUERY_KINDS[showKind].filterKeys || []).every(k => {
      if (!filters[k]) return true;
      // Landing isn't a stored string -- it's read off the pull's coordinates.
      if (k === 'landing') {
        return filters[k] === 'Out-of-bounds' ? !!a.outOfBounds : (!a.outOfBounds && a.landX != null);
      }
      // turnoverReason can hold several values at once -- match if the
      // selected reason is one of them (also accepts an older single-string
      // tag from before multi-select).
      const v = a[k];
      if (Array.isArray(v)) return v.includes(filters[k]);
      return v === filters[k];
    });
  }

  function render() {
    const all = gather();
    const population = showKind === 'pass' ? all.filter(r => outcomeMatch(r, filters.outcome)) : all;
    // Results are always actual clips (rows with at least one tag), so the
    // list stays meaningful even with no tag filter set; the percentage still
    // uses the full outcome population as its denominator.
    const matches = population.filter(r => Object.keys(r.a).length > 0 && tagMatch(r.a));
    const pop = population.length;
    const pct = pop ? Math.round((matches.length / pop) * 1000) / 10 : 0;
    const popWord = (showKind === 'pass' && filters.outcome) ? OUTCOME_WORD[filters.outcome] : QUERY_KINDS[showKind].word;
    summary.textContent = `${matches.length} of ${pop} ${popWord} in scope (${pct}%)`;

    results.innerHTML = '';
    lastLinks = [];
    if (!matches.length) {
      results.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode(`No tagged ${QUERY_KINDS[showKind].word} match — tag some in the Tag view, or loosen the filters.`)]));
      copyBtn.disabled = true;
      return;
    }
    matches.forEach(r => {
      // Every stored tag value worth showing, minus the ones already spelled
      // out in the row's own label (a pull's puller, a pull's landing).
      const tags = [];
      ['hand', 'release', 'distance', 'stall', 'catch', 'highlight', 'turnoverReason', 'type', 'defScheme', 'oppTurnover'].forEach(k => {
        const v = r.a[k];
        if (Array.isArray(v)) { if (v.length) tags.push(v.join(' + ')); }
        else if (v) tags.push(v);
      });
      if (r.a.notes) tags.push('“' + r.a.notes + '”');
      const label = `vs ${r.opponent} · Pt ${r.point} · ${r.main}` + (r.outcome ? ` · ${r.outcome}` : '');
      const meta = el('span', { class: 'de-result-meta' }, [document.createTextNode(label)]);
      const tagsEl = el('span', { class: 'de-result-tags' }, [document.createTextNode(tags.join(' · '))]);
      let linkEl;
      if (r.vid && r.timestamp != null) {
        const url = `https://www.youtube.com/watch?v=${r.vid}&t=${r.timestamp}s`;
        lastLinks.push(url);
        linkEl = el('a', { class: 'de-result-link', href: url, target: '_blank', rel: 'noopener noreferrer' }, [document.createTextNode('▶ ' + formatTimestamp(r.timestamp))]);
      } else {
        linkEl = el('span', { class: 'de-result-nolink' }, [document.createTextNode(r.timestamp != null ? formatTimestamp(r.timestamp) + ' (no video)' : 'no timestamp')]);
      }
      results.appendChild(el('div', { class: 'de-result-row' }, [meta, tagsEl, linkEl]));
    });
    copyBtn.disabled = lastLinks.length === 0;
  }

  function copyLinks() {
    if (!lastLinks.length) return;
    const text = lastLinks.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    const orig = 'Copy timestamp links';
    copyBtn.textContent = `Copied ${lastLinks.length} link${lastLinks.length === 1 ? '' : 's'}`;
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
  }

  buildFilterControls();
  render();
  return { pane, refresh: render };
}

// ---------- Data Editor ----------
// Draws a point's passes/blocks with a single item focused (full colour) and
// the rest dimmed, so you can see exactly which pass/block you're tagging. No
// entrance animation -- stepping needs to feel instant.
function renderEditorItem(routeLayer, point, focus) {
  routeLayer.innerHTML = '';
  (point.passes || []).forEach(p => {
    const x1 = p.startX * PITCH_W, y1 = p.startY * PITCH_H;
    const x2 = p.endX * PITCH_W, y2 = p.endY * PITCH_H;
    const isFocus = focus.kind === 'pass' && p.uuid === focus.uuid;
    let stroke = '#F3F1E9', markerEnd = markerRef(routeLayer, 'arrowhead'), width = 2, dash = '0';
    if (p.turnover) { stroke = '#E8604C'; markerEnd = turnoverMarker(p, routeLayer); dash = '3 3'; }
    else if (p.assist) { stroke = '#FFB800'; markerEnd = markerRef(routeLayer, 'arrowhead-goal'); width = 3; }
    const line = svgEl('line', {
      x1, y1, x2, y2, stroke, 'stroke-width': isFocus ? width + 1.5 : width,
      'marker-end': markerEnd, 'stroke-dasharray': dash === '0' ? 'none' : dash,
      opacity: isFocus ? 1 : 0.22,
    });
    routeLayer.appendChild(line);
    attachPassHover(routeLayer, x1, y1, x2, y2, p);
    if (isFocus) {
      routeLayer.appendChild(svgEl('circle', { cx: x1, cy: y1, r: 4, fill: '#0E2426', stroke, 'stroke-width': 1.6 }));
      routeLayer.appendChild(svgEl('circle', { cx: x2, cy: y2, r: 4, fill: stroke, stroke: '#0E2426', 'stroke-width': 1.2 }));
    }
  });
  (point.blocks || []).forEach(b => {
    const cx = b.locationX * PITCH_W, cy = b.locationY * PITCH_H;
    const isFocus = focus.kind === 'block' && b.uuid === focus.uuid;
    // On a defensive-possession step our blocks are the relevant plays, so
    // keep them full-strength even though no single one is "focused".
    const emphasize = isFocus || focus.kind === 'def';
    if (isFocus) routeLayer.appendChild(svgEl('circle', { cx, cy, r: 9, fill: 'none', stroke: '#4FD1AE', 'stroke-width': 2 }));
    const c = svgEl('circle', { cx, cy, r: 5, fill: b.callahan ? '#FFB800' : '#F3F1E9', stroke: '#0E2426', 'stroke-width': 1.2, opacity: emphasize ? 1 : 0.35 });
    const title = svgEl('title', {});
    title.textContent = (b.player || 'Unknown') + (b.callahan ? ' — Callahan!' : ' — block');
    c.appendChild(title);
    routeLayer.appendChild(c);
  });
}

function buildDataEditorSection(viewer, tagOnlyGame) {
  const tagOnly = (tagOnlyGame != null);
  const section = el('section', { class: 'view' + (tagOnly ? ' active' : ''), id: 'data-editor' }, []);

  // In a published team report the whole tagging editor is stripped out --
  // just the read-only clip browser remains, so the team can explore the film
  // that was tagged without any authoring UI.
  if (viewer) {
    section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Film Clips')]));
    section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Browse the tagged film: filter passes, blocks, pulls, defensive possessions or opponent turnovers, and jump straight to the moment in the game video.')]));
    section.appendChild(buildAnnotationQueryPane().pane);
    return section;
  }

  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode(tagOnly ? 'Video Tagging' : 'Data Editor')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode(tagOnly
    ? 'Tag this game’s events — passes, blocks, pulls, defensive possessions and opponent turnovers — with throw type, release, outcome detail, and a video timestamp. When you’re done, click “Export annotations JSON” at the bottom and send the file back.'
    : 'Step through a game’s events — passes, blocks, pulls, defensive possessions and opponent turnovers — and tag each one, to build a richer, queryable film dataset.')]));

  const tagPane = el('div', {}, []);
  if (!tagOnly) {
    // Tag mode = the stepping editor; Query mode = filter the tagged data back
    // out into a clip list. Both live in this one tab so the whole rich-dataset
    // workflow stays together. (A single-game tagging page shows the tag editor
    // only -- no query view.)
    const queryPaneObj = buildAnnotationQueryPane();
    const queryPane = queryPaneObj.pane;
    queryPane.style.display = 'none';
    section.appendChild(el('div', { class: 'controls-row de-mode-row' }, [buildSegToggle(
      [{ key: 'tag', label: 'Tag' }, { key: 'query', label: 'Query' }],
      (k) => {
        const q = k === 'query';
        tagPane.style.display = q ? 'none' : '';
        queryPane.style.display = q ? '' : 'none';
        if (q) queryPaneObj.refresh();
      }
    )]));
    section.appendChild(tagPane);
    section.appendChild(queryPane);
  } else {
    section.appendChild(tagPane);
  }

  let gameIndex = tagOnly ? tagOnlyGame : 0;
  let allSteps = [];   // every event in the game
  let steps = [];      // allSteps narrowed by the events filter -- what's stepped through
  let eventFilter = 'all';
  let stepIdx = 0;
  let annotations = loadAnnotations();
  let player = null, playerVideoId = null;

  // ---- events filter (top of the tag pane, both here and on a tagging page) ----
  tagPane.appendChild(el('div', { class: 'de-events-row' }, [
    buildSegToggle([
      { key: 'all', label: 'All events' },
      { key: 'noThrows', label: 'All events except throws' },
    ], (k) => setEventFilter(k), eventFilter),
    el('span', { class: 'de-events-note' }, [document.createTextNode('“Except throws” skips completed passes that didn’t score — much faster to get through. Pulls, opponent turnovers, blocks, defensive possessions, turnovers and assists all stay, and your tags are kept either way.')]),
  ]));

  // ---- game picker (fixed to one game on a tagging page) ----
  if (tagOnly) {
    const g = REPORT.games[tagOnlyGame];
    tagPane.appendChild(el('div', { class: 'controls-row de-game-row' }, [
      el('span', { class: 'de-inline-label' }, [document.createTextNode('Game')]),
      el('span', { class: 'de-game-fixed' }, [document.createTextNode(`vs ${g.opponent} — ${g.dateDisplay}`)]),
    ]));
  } else {
    const gameSelect = el('select', { class: 'setup-select de-game-select' }, []);
    REPORT.games.forEach((g, i) => gameSelect.appendChild(el('option', { value: String(i) }, [document.createTextNode(`vs ${g.opponent} — ${g.dateDisplay}`)])));
    gameSelect.addEventListener('change', () => { gameIndex = parseInt(gameSelect.value, 10); loadGame(); });
    tagPane.appendChild(el('div', { class: 'controls-row de-game-row' }, [el('span', { class: 'de-inline-label' }, [document.createTextNode('Game')]), gameSelect]));
  }

  // ---- layout: video | field | tag panel ----
  // Three columns rather than two so the field sits directly beside the tags
  // you're filling in from it. Widths are deliberately NOT equal thirds: the
  // video is landscape and wants width, the field is portrait and wants a
  // narrow column, the panel is a fixed-width form. See .de-layout.
  const layout = el('div', { class: 'de-layout' }, []);
  tagPane.appendChild(layout);
  const videoCol = el('div', { class: 'de-video-col' }, []);
  const fieldCol = el('div', { class: 'de-field-col' }, []);
  const rightCol = el('div', { class: 'de-right' }, []);
  layout.appendChild(videoCol);
  layout.appendChild(fieldCol);
  layout.appendChild(rightCol);

  // video
  const playerHost = el('div', { class: 'de-player-host' }, []);
  // Resizable wrapper, mirroring the field diagram: the bottom-right corner
  // drags the width (the 16:9 host fixes the height, so it can't be distorted)
  // and the chosen size is remembered across sessions.
  const videoResize = el('div', { class: 'de-video-resize' }, [playerHost]);
  const videoHint = el('p', { class: 'de-pitch-hint de-video-hint' }, [document.createTextNode('Drag the bottom-right corner of the video to resize it.')]);
  videoHint.style.display = 'none';
  const noVideoMsg = el('p', { class: 'pitch-caption de-no-video' }, [document.createTextNode('No video link for this game yet — add one on the Set up tab to enable the embedded player and “grab current time.” You can still type a timestamp manually below.')]);
  const playerNote = el('p', { class: 'pitch-caption de-player-note' }, []);
  playerNote.style.display = 'none';
  videoCol.appendChild(videoResize);
  videoCol.appendChild(videoHint);
  videoCol.appendChild(noVideoMsg);
  videoCol.appendChild(playerNote);
  // Remembered width -- same pattern (and the same background-tab caveat) as the
  // pitch below: commit on pointer release, with a debounced observer backup.
  const VIDEO_SIZE_KEY = 'statto-report-tag-video-width::' + REPORT.teamName;
  try {
    const savedV = parseInt(localStorage.getItem(VIDEO_SIZE_KEY), 10);
    if (savedV > 0) videoResize.style.width = savedV + 'px';
  } catch (e) {}
  function saveVideoWidth() {
    try { localStorage.setItem(VIDEO_SIZE_KEY, String(Math.round(videoResize.getBoundingClientRect().width))); } catch (e) {}
  }
  videoResize.addEventListener('pointerup', saveVideoWidth);
  videoResize.addEventListener('mouseup', saveVideoWidth);
  if (typeof ResizeObserver === 'function') {
    let vTimer = null;
    new ResizeObserver(() => { clearTimeout(vTimer); vTimer = setTimeout(saveVideoWidth, 300); }).observe(videoResize);
  }

  // field diagram
  const { svg, routeLayer } = buildPitch();
  const pitchWrap = el('div', { class: 'pitch-wrap de-pitch' }, [svg]);
  fieldCol.appendChild(pitchWrap);
  // Remembered across sessions -- a tagger who sizes the pitch to their screen
  // shouldn't have to do it again every time they reopen the page.
  const PITCH_SIZE_KEY = 'statto-report-tag-pitch-width::' + REPORT.teamName;
  try {
    const saved = parseInt(localStorage.getItem(PITCH_SIZE_KEY), 10);
    if (saved > 0) pitchWrap.style.width = saved + 'px';
  } catch (e) {}
  function savePitchWidth() {
    try { localStorage.setItem(PITCH_SIZE_KEY, String(Math.round(pitchWrap.getBoundingClientRect().width))); } catch (e) {}
  }
  // A corner drag always ends in a pointer release, so that's what commits the
  // size. Deliberately not ResizeObserver alone: like requestAnimationFrame it
  // rides the rendering pipeline, which a browser stops for a background tab --
  // the size would silently fail to save. The observer is a supplement for
  // resizes that don't come from a drag.
  pitchWrap.addEventListener('pointerup', savePitchWidth);
  pitchWrap.addEventListener('mouseup', savePitchWidth);
  if (typeof ResizeObserver === 'function') {
    let saveTimer = null;
    new ResizeObserver(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(savePitchWidth, 300);
    }).observe(pitchWrap);
  }
  fieldCol.appendChild(el('p', { class: 'de-pitch-hint' }, [document.createTextNode('Drag the bottom-right corner of the field to resize it.')]));
  const stepCaption = el('p', { class: 'pitch-caption de-step-caption' }, []);
  fieldCol.appendChild(stepCaption);

  // Translate a DOM click on the pitch to 0-1 field fractions (matches the
  // startX/Y coordinate system used everywhere else).
  function pitchClickFrac(evt) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    const clamp = (v) => Math.max(0, Math.min(1, v));
    return { x: Math.round(clamp(loc.x / PITCH_W) * 1000) / 1000, y: Math.round(clamp(loc.y / PITCH_H) * 1000) / 1000 };
  }
  // On a Pull step, clicking the field marks where the pull landed.
  svg.addEventListener('click', (evt) => {
    const step = steps[stepIdx];
    if (!step || step.kind !== 'pull') return;
    const frac = pitchClickFrac(evt);
    if (!frac) return;
    setPointField(step.uuid, 'landX', frac.x);
    setPointField(step.uuid, 'landY', frac.y);
    setPointField(step.uuid, 'outOfBounds', undefined);
    render();
  });
  // Draws the recorded pull-landing spot on top of the (dimmed) point routes.
  function drawPullMarker(fx, fy) {
    const cx = fx * PITCH_W, cy = fy * PITCH_H;
    routeLayer.appendChild(svgEl('circle', { cx, cy, r: 8, fill: 'none', stroke: '#4FD1AE', 'stroke-width': 2 }));
    const c = svgEl('circle', { cx, cy, r: 4, fill: '#4FD1AE', stroke: '#0E2426', 'stroke-width': 1.2 });
    const title = svgEl('title', {});
    title.textContent = 'Pull landing';
    c.appendChild(title);
    routeLayer.appendChild(c);
  }

  // step controls
  const prevBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('← Prev')]);
  const nextBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Next →')]);
  const stepCounter = el('span', { class: 'de-step-counter' }, []);
  prevBtn.addEventListener('click', () => goToStep(stepIdx - 1));
  nextBtn.addEventListener('click', () => goToStep(stepIdx + 1));
  fieldCol.appendChild(el('div', { class: 'controls-row de-step-nav' }, [prevBtn, stepCounter, nextBtn]));
  fieldCol.appendChild(el('p', { class: 'kbd-hint' }, [document.createTextNode('Tip: use ← / → to step through passes (arrow keys are ignored while typing in a field).')]));

  // ---- edit panel (rebuilt per step) ----
  // Panel + shortcut legend share one sticky wrapper so they travel together;
  // sticking the panel on its own made it ride over the legend below it.
  const panelStack = el('div', { class: 'de-panel-stack' }, []);
  rightCol.appendChild(panelStack);
  const panel = el('div', { class: 'de-panel' }, []);
  panelStack.appendChild(panel);

  // Shortcut legend, sitting under the tag panel it applies to. Built from
  // TAG_PRESETS so it always describes what the keys actually do.
  const shortcutBox = el('div', { class: 'de-shortcuts' }, [
    el('div', { class: 'de-shortcuts-title' }, [document.createTextNode('Keyboard shortcuts')]),
  ]);
  const shortcutList = el('div', { class: 'de-shortcut-list' }, []);
  Object.keys(TAG_PRESETS).forEach(key => {
    const preset = TAG_PRESETS[key];
    const parts = Object.keys(preset.tags).map(f => `${TAG_PRESET_FIELD_LABELS[f] || f}: ${vocabLabel(f, preset.tags[f])}`);
    shortcutList.appendChild(el('div', { class: 'de-shortcut' }, [
      el('kbd', {}, [document.createTextNode(key)]),
      el('div', { class: 'de-shortcut-body' }, [
        el('span', { class: 'de-shortcut-name' }, [document.createTextNode(preset.label)]),
        el('span', { class: 'de-shortcut-tags' }, [document.createTextNode(parts.join(' · ') + ' · stamps 2s back')]),
      ]),
    ]));
  });
  [
    [',', 'Timestamp −1s', 'Nudge the recorded moment one second earlier'],
    ['.', 'Timestamp +1s', 'Nudge the recorded moment one second later'],
    ['←  →', 'Previous / next event', 'Step through the game'],
  ].forEach(([key, name, desc]) => {
    shortcutList.appendChild(el('div', { class: 'de-shortcut' }, [
      el('kbd', {}, [document.createTextNode(key)]),
      el('div', { class: 'de-shortcut-body' }, [
        el('span', { class: 'de-shortcut-name' }, [document.createTextNode(name)]),
        el('span', { class: 'de-shortcut-tags' }, [document.createTextNode(desc)]),
      ]),
    ]));
  });
  shortcutBox.appendChild(shortcutList);
  shortcutBox.appendChild(el('p', { class: 'de-shortcut-note' }, [
    document.createTextNode('The number keys only apply to a pass, and fill in just the tags listed — anything you set yourself is left alone. Shortcuts pause while you’re typing in a box.'),
  ]));
  panelStack.appendChild(shortcutBox);

  function currentRecord(create) {
    const step = steps[stepIdx];
    if (!step) return null;
    const store = step.kind === 'pass' ? annotations.passes : annotations.blocks;
    if (!store[step.uuid] && create) store[step.uuid] = {};
    return store[step.uuid] || null;
  }
  function setField(key, value) {
    const step = steps[stepIdx];
    if (!step) return;
    const store = step.kind === 'pass' ? annotations.passes : annotations.blocks;
    const rec = store[step.uuid] || (store[step.uuid] = {});
    if (value === undefined || value === '' || value === null) delete rec[key];
    else rec[key] = value;
    if (Object.keys(rec).length === 0) delete store[step.uuid];
    saveAnnotations(annotations);
    updateTaggedCount();
  }
  // Point/possession-level annotation (our defensive scheme while the opponent
  // had it), keyed by "<pointUUID>#d<n>" for the opponent's n-th offensive
  // possession that point -- independent of the focused pass/block.
  function setPointField(annKey, field, value) {
    const store = annotations.points || (annotations.points = {});
    const rec = store[annKey] || (store[annKey] = {});
    if (value === undefined || value === '' || value === null) delete rec[field];
    else rec[field] = value;
    if (Object.keys(rec).length === 0) delete store[annKey];
    saveAnnotations(annotations);
    updateTaggedCount();
  }

  function annField(labelText, vocabList, key, rec) {
    const sel = el('select', { class: 'de-select' }, [el('option', { value: '' }, [document.createTextNode('—')])]);
    vocabList.forEach(v => sel.appendChild(el('option', { value: v }, [document.createTextNode(vocabLabel(key, v))])));
    sel.value = (rec && rec[key]) || '';
    sel.addEventListener('change', () => setField(key, sel.value || undefined));
    return el('label', { class: 'de-field' }, [el('span', { class: 'de-field-label' }, [document.createTextNode(labelText)]), sel]);
  }

  // Checkbox-group version of annField, for tags where more than one option
  // can genuinely apply at once (e.g. a turnover can be both "Too far" and
  // "Into doublecoverage"). Stored as an array; an emptied selection deletes
  // the field entirely, same as annField's blank "—".
  function annMultiField(labelText, vocabList, key, rec) {
    const current = new Set(Array.isArray(rec && rec[key]) ? rec[key] : (rec && rec[key] ? [rec[key]] : []));
    const box = el('div', { class: 'de-multi-box' }, []);
    vocabList.forEach(v => {
      const cb = el('input', { type: 'checkbox' }, []);
      cb.checked = current.has(v);
      cb.addEventListener('change', () => {
        if (cb.checked) current.add(v); else current.delete(v);
        setField(key, current.size ? Array.from(current) : undefined);
      });
      box.appendChild(el('label', { class: 'de-multi-option' }, [cb, document.createTextNode(v)]));
    });
    return el('div', { class: 'de-field de-field-wide' }, [el('span', { class: 'de-field-label' }, [document.createTextNode(labelText)]), box]);
  }

  // Notes + timestamp rows are shared by pass, block and defensive-possession
  // panels; each passes its own writer (setField for pass/block records,
  // setPointField for defensive possessions) so the same UI edits the right
  // store.
  function appendNotesRow(rec, write) {
    const notes = el('textarea', { class: 'de-notes', rows: '2', placeholder: 'Notes (optional)' }, []);
    notes.value = rec.notes || '';
    notes.addEventListener('change', () => write(notes.value.trim() || undefined));
    panel.appendChild(el('label', { class: 'de-field de-field-wide' }, [el('span', { class: 'de-field-label' }, [document.createTextNode('Notes')]), notes]));
  }
  function appendTimestampRow(rec, write) {
    const tsInput = el('input', { type: 'text', class: 'de-ts-input', placeholder: 'mm:ss' }, []);
    tsInput.value = formatTimestamp(rec.timestamp);
    tsInput.addEventListener('change', () => {
      const secs = parseTimestamp(tsInput.value);
      write(secs == null ? undefined : secs);
      tsInput.value = formatTimestamp(secs);
    });
    const grabBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Grab current time')]);
    grabBtn.addEventListener('click', () => {
      if (!player || !player.getCurrentTime) return;
      const secs = Math.floor(player.getCurrentTime());
      tsInput.value = formatTimestamp(secs);
      write(secs);
    });
    // You notice a throw a beat after it happens, so the useful timestamp is
    // almost always slightly behind where the video is when you reach for it.
    const grabBackBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Grab 2s before')]);
    grabBackBtn.addEventListener('click', () => {
      if (!player || !player.getCurrentTime) return;
      const secs = Math.max(0, Math.floor(player.getCurrentTime()) - 2);
      tsInput.value = formatTimestamp(secs);
      write(secs);
    });
    const jumpBtn = el('button', { class: 'pill-btn', type: 'button' }, [document.createTextNode('Jump ▶')]);
    jumpBtn.addEventListener('click', () => {
      const secs = parseTimestamp(tsInput.value);
      if (player && player.seekTo && secs != null) { player.seekTo(secs, true); player.playVideo && player.playVideo(); }
    });
    if (!player) { grabBtn.disabled = true; grabBackBtn.disabled = true; jumpBtn.disabled = true; }
    panel.appendChild(el('div', { class: 'de-ts-row' }, [
      el('span', { class: 'de-field-label' }, [document.createTextNode('Timestamp')]),
      tsInput, grabBtn, grabBackBtn, jumpBtn,
    ]));
  }

  function renderPanel() {
    panel.innerHTML = '';
    const step = steps[stepIdx];
    if (!step) { panel.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No passes recorded for this game.')])); return; }

    // Pull (defensive point opener): where our pull landed. Click the field to
    // set a spot, or pick "Out-of-bounds". Keyed to "<pointUUID>#pull".
    if (step.kind === 'pull') {
      const annKey = step.uuid;
      const rec = (annotations.points || {})[annKey] || {};
      panel.appendChild(el('div', { class: 'de-panel-head' }, [
        el('div', { class: 'de-panel-title' }, [document.createTextNode('Pull')]),
        el('div', { class: 'de-panel-sub' }, [document.createTextNode(`Point ${step.pt.number} · Our pull (defensive point)`)]),
      ]));
      const status = rec.outOfBounds
        ? 'Landed out-of-bounds.'
        : (rec.landX != null && rec.landY != null)
          ? `Landed at x ${rec.landX}, y ${rec.landY} on the field.`
          : 'Not set yet — click the field to mark where the pull landed.';
      panel.appendChild(el('p', { class: 'pitch-caption de-pull-status' }, [document.createTextNode(status)]));
      const sel = el('select', { class: 'de-select' }, [
        el('option', { value: '' }, [document.createTextNode('In-bounds (click the field)')]),
        el('option', { value: 'oob' }, [document.createTextNode('Out-of-bounds')]),
      ]);
      sel.value = rec.outOfBounds ? 'oob' : '';
      sel.addEventListener('change', () => {
        if (sel.value === 'oob') {
          setPointField(annKey, 'outOfBounds', true);
          setPointField(annKey, 'landX', undefined);
          setPointField(annKey, 'landY', undefined);
        } else {
          setPointField(annKey, 'outOfBounds', undefined);
        }
        render();
      });
      panel.appendChild(el('label', { class: 'de-field de-field-wide' }, [el('span', { class: 'de-field-label' }, [document.createTextNode('Landing')]), sel]));
      // Who pulled -- one of the seven on the field for this defensive point.
      const pullerNames = (step.pt.lineup || []).map(e => e.player).filter(Boolean).sort();
      const pullerSel = el('select', { class: 'de-select' }, [el('option', { value: '' }, [document.createTextNode('—')])]);
      pullerNames.forEach(n => pullerSel.appendChild(el('option', { value: n }, [document.createTextNode(n)])));
      // Keep a previously-tagged puller selectable even if they aren't in the
      // recorded lineup (partial-lineup points).
      if (rec.puller && !pullerNames.includes(rec.puller)) pullerSel.appendChild(el('option', { value: rec.puller }, [document.createTextNode(rec.puller)]));
      pullerSel.value = rec.puller || '';
      pullerSel.addEventListener('change', () => setPointField(annKey, 'puller', pullerSel.value || undefined));
      panel.appendChild(el('label', { class: 'de-field de-field-wide' }, [el('span', { class: 'de-field-label' }, [document.createTextNode('Puller')]), pullerSel]));
      appendNotesRow(rec, (v) => setPointField(annKey, 'notes', v));
      appendTimestampRow(rec, (v) => setPointField(annKey, 'timestamp', v));
      return;
    }

    // Opponent turnover that wasn't one of our blocks -- they gave the disc
    // back on their own. Statto records nothing for these, so the step exists
    // purely to be tagged. Keyed to "<pointUUID>#o<n>".
    if (step.kind === 'oppTurn') {
      const annKey = step.uuid;
      const rec = (annotations.points || {})[annKey] || {};
      panel.appendChild(el('div', { class: 'de-panel-head' }, [
        el('div', { class: 'de-panel-title' }, [document.createTextNode('Opponent turnover')]),
        el('div', { class: 'de-panel-sub' }, [document.createTextNode(`Point ${step.pt.number} · Ended their possession ${step.defN} (not one of our blocks)`)]),
      ]));
      const sel = el('select', { class: 'de-select' }, [el('option', { value: '' }, [document.createTextNode('—')])]);
      POINT_VOCAB.oppTurnover.forEach(v => sel.appendChild(el('option', { value: v }, [document.createTextNode(v)])));
      sel.value = rec.oppTurnover || '';
      sel.addEventListener('change', () => setPointField(annKey, 'oppTurnover', sel.value || undefined));
      panel.appendChild(el('label', { class: 'de-field de-field-wide' }, [el('span', { class: 'de-field-label' }, [document.createTextNode('Turnover type')]), sel]));
      appendNotesRow(rec, (v) => setPointField(annKey, 'notes', v));
      appendTimestampRow(rec, (v) => setPointField(annKey, 'timestamp', v));
      return;
    }

    // Defensive possession: just our scheme for this one opponent possession
    // (plus a timestamp/notes), keyed to "<pointUUID>#d<n>".
    if (step.kind === 'def') {
      const annKey = step.uuid;
      const rec = (annotations.points || {})[annKey] || {};
      panel.appendChild(el('div', { class: 'de-panel-head' }, [
        el('div', { class: 'de-panel-title' }, [document.createTextNode('Defensive possession ' + step.defN)]),
        el('div', { class: 'de-panel-sub' }, [document.createTextNode(`Point ${step.pt.number} · Defensive possession ${step.defN}`)]),
      ]));
      const sel = el('select', { class: 'de-select' }, [el('option', { value: '' }, [document.createTextNode('—')])]);
      POINT_VOCAB.defScheme.forEach(v => sel.appendChild(el('option', { value: v }, [document.createTextNode(v)])));
      sel.value = rec.defScheme || '';
      sel.addEventListener('change', () => setPointField(annKey, 'defScheme', sel.value || undefined));
      panel.appendChild(el('label', { class: 'de-field de-field-wide' }, [el('span', { class: 'de-field-label' }, [document.createTextNode('Defensive scheme')]), sel]));
      panel.appendChild(el('p', { class: 'de-field-note' }, [document.createTextNode('“Force forehand” and “Force backhand” are named from a right-handed player’s perspective.')]));
      appendNotesRow(rec, (v) => setPointField(annKey, 'notes', v));
      appendTimestampRow(rec, (v) => setPointField(annKey, 'timestamp', v));
      return;
    }

    const rec = currentRecord(false) || {};
    if (step.kind === 'pass') {
      const p = step.item;
      const outcome = p.assist ? 'Assist (goal)' : (p.throwerError && p.receiverError) ? 'Throwaway + drop' : p.throwerError ? 'Throwaway' : p.receiverError ? 'Drop' : 'Completed';
      panel.appendChild(el('div', { class: 'de-panel-head' }, [
        el('div', { class: 'de-panel-title' }, [document.createTextNode(`${p.thrower || 'Unknown'} → ${p.receiver || 'Unknown'}`)]),
        el('div', { class: 'de-panel-sub' }, [document.createTextNode(`Point ${step.pt.number} · ${outcome}`)]),
      ]));
      const grid = el('div', { class: 'de-field-grid' }, []);
      grid.appendChild(annField('Hand', ANNOTATION_VOCAB.hand, 'hand', rec));
      grid.appendChild(annField('Release', ANNOTATION_VOCAB.release, 'release', rec));
      grid.appendChild(annField('Distance', ANNOTATION_VOCAB.distance, 'distance', rec));
      grid.appendChild(annField('Stall', ANNOTATION_VOCAB.stall, 'stall', rec));
      grid.appendChild(annField('Catch', ANNOTATION_VOCAB.catch, 'catch', rec));
      grid.appendChild(annField('Highlight', ANNOTATION_VOCAB.highlight, 'highlight', rec));
      panel.appendChild(grid);
      // Turnover reason can genuinely be more than one thing at once (e.g.
      // "Too far" AND "Into doublecoverage"), so it's a checkbox group rather
      // than a single-choice dropdown like the fields above.
      if (p.turnover) panel.appendChild(annMultiField('Turnover reason', ANNOTATION_VOCAB.turnoverReason, 'turnoverReason', rec));
    } else {
      const b = step.item;
      panel.appendChild(el('div', { class: 'de-panel-head' }, [
        el('div', { class: 'de-panel-title' }, [document.createTextNode(`${b.player || 'Unknown'} — block`)]),
        el('div', { class: 'de-panel-sub' }, [document.createTextNode(`Point ${step.pt.number} · Defensive block`)]),
      ]));
      const grid = el('div', { class: 'de-field-grid' }, []);
      grid.appendChild(annField('Block type', BLOCK_VOCAB.type, 'type', rec));
      grid.appendChild(annField('Highlight', ANNOTATION_VOCAB.highlight, 'highlight', rec));
      panel.appendChild(grid);
    }

    appendNotesRow(rec, (v) => setField('notes', v));
    appendTimestampRow(rec, (v) => setField('timestamp', v));
  }

  // The stored record behind any step, whichever annotation store it lives in.
  function stepRecord(step) {
    if (!step) return null;
    if (step.kind === 'pass') return annotations.passes[step.uuid];
    if (step.kind === 'block') return annotations.blocks[step.uuid];
    return (annotations.points || {})[step.uuid];  // pull / def / oppTurn
  }
  const taggedCount = el('span', { class: 'de-tagged-count' }, []);
  // Counts the events currently in view, so it re-scopes with the events
  // filter -- "12 of 40" while skipping throws, not 12 of every pass in the game.
  function updateTaggedCount() {
    let n = 0;
    steps.forEach(st => { const rec = stepRecord(st); if (rec && Object.keys(rec).length) n++; });
    taggedCount.textContent = `${n} of ${steps.length} events tagged in this view`;
  }

  function render() {
    const step = steps[stepIdx];
    if (step) {
      renderEditorItem(routeLayer, step.pt, { kind: step.kind, uuid: step.uuid });
      if (step.kind === 'pull') {
        const rec = (annotations.points || {})[step.uuid] || {};
        if (!rec.outOfBounds && rec.landX != null && rec.landY != null) drawPullMarker(rec.landX, rec.landY);
      }
      svg.style.cursor = step.kind === 'pull' ? 'crosshair' : '';
      const kindLabel = step.kind === 'pass'
        ? `Pass ${step.item.thrower || '?'} → ${step.item.receiver || '?'}`
        : step.kind === 'block'
          ? `Block by ${step.item.player || '?'}`
          : step.kind === 'pull'
            ? 'Pull'
            : step.kind === 'oppTurn'
              ? 'Opponent turnover'
              : `Defensive possession ${step.defN}`;
      stepCaption.textContent = `Point ${step.pt.number} · ${kindLabel}`;
      stepCounter.textContent = `${stepIdx + 1} / ${steps.length}`;
    } else {
      routeLayer.innerHTML = '';
      svg.style.cursor = '';
      stepCaption.textContent = '';
      stepCounter.textContent = '0 / 0';
    }
    prevBtn.disabled = stepIdx <= 0;
    nextBtn.disabled = stepIdx >= steps.length - 1;
    renderPanel();
  }

  function goToStep(idx) {
    if (idx < 0 || idx >= steps.length) return;
    stepIdx = idx;
    render();
  }

  // Builds the complete event list for the selected game (allSteps), then
  // narrows it to the current view (steps) via the events filter.
  function buildSteps() {
    allSteps = [];
    REPORT.games[gameIndex].points.forEach(pt => {
      buildPointEvents(pt).forEach(ev => allSteps.push(ev));
    });
    allSteps.forEach((st, i) => { st.ai = i; });
    refilterSteps();
  }

  // "All events except throws" drops the routine passes -- the ones that were
  // completed and didn't score -- and keeps every other event. It's purely a
  // view filter: nothing is written, so tags made in either mode are all still
  // there in the other.
  function isPlainThrow(st) {
    return st.kind === 'pass' && !st.item.turnover && !st.item.assist;
  }
  function refilterSteps() {
    steps = (eventFilter === 'noThrows') ? allSteps.filter(st => !isPlainThrow(st)) : allSteps.slice();
  }
  function setEventFilter(mode) {
    if (mode === eventFilter) return;
    const cur = steps[stepIdx];
    const curAi = cur ? cur.ai : 0;
    eventFilter = mode;
    refilterSteps();
    // Stay on the same event if it survived the filter, else the next one along.
    const idx = steps.findIndex(st => st.ai >= curAi);
    stepIdx = (idx < 0) ? Math.max(0, steps.length - 1) : idx;
    render();
    updateTaggedCount();
  }

  // Fall back to a plain "watch on YouTube" link (+ manual timestamps) when
  // the video can't be embedded -- opened as a local file, embedding disabled
  // by the owner, a bad link, etc.
  function showPlayerFallback(vid, reason) {
    playerHost.style.display = 'none';
    videoHint.style.display = 'none';
    playerHost.innerHTML = '';
    player = null; playerVideoId = null;
    playerNote.innerHTML = '';
    playerNote.appendChild(document.createTextNode(reason + ' '));
    playerNote.appendChild(el('a', { href: 'https://www.youtube.com/watch?v=' + vid, target: '_blank', rel: 'noopener noreferrer', class: 'de-watch-inline' }, [document.createTextNode('Watch on YouTube ↗')]));
    playerNote.style.display = '';
    renderPanel();
  }

  function refreshPlayer() {
    const url = loadSetupData().videoLinks[gameIndex];
    const vid = parseYouTubeId(url);
    playerNote.style.display = 'none';
    videoHint.style.display = 'none';
    if (!vid) { playerHost.style.display = 'none'; noVideoMsg.style.display = ''; player = null; playerVideoId = null; renderPanel(); return; }
    noVideoMsg.style.display = 'none';
    // The YouTube player needs a real http(s) origin to validate against.
    // Opened straight off disk (file://) it can't, and rejects the embed with
    // "error 153" -- so don't even try; offer the watch link instead.
    if (location.protocol === 'file:') {
      showPlayerFallback(vid, 'The embedded player needs the report opened from a web address (http/https), not a local file — serve the folder locally or host it to scrub inline. For now, type timestamps manually and');
      return;
    }
    playerHost.style.display = '';
    videoHint.style.display = '';
    ensureYouTubeAPI(() => {
      if (player && playerVideoId === vid) return;
      if (player && player.loadVideoById) { player.loadVideoById(vid); playerVideoId = vid; renderPanel(); return; }
      playerHost.innerHTML = '';
      const target = el('div', {}, []);
      target.id = 'de-yt-' + Math.random().toString(36).slice(2, 8);
      playerHost.appendChild(target);
      // Passing the page origin is what avoids the "error 153" configuration
      // rejection on http(s) hosts.
      const playerVars = { rel: 0, modestbranding: 1, enablejsapi: 1 };
      if (location.origin && location.origin !== 'null') playerVars.origin = location.origin;
      player = new YT.Player(target.id, {
        videoId: vid, width: '100%', height: '100%',
        playerVars: playerVars,
        events: {
          onReady: () => renderPanel(),
          onError: (e) => {
            const code = e && e.data;
            let why = 'This video couldn’t be embedded here';
            if (code === 101 || code === 150) why = 'The video’s owner has disabled embedding for this video';
            else if (code === 100) why = 'The video wasn’t found — check the link on the Set up tab';
            else if (code === 2 || code === 153) why = 'The player rejected this page’s configuration (often a missing origin or an unsupported host)';
            showPlayerFallback(vid, why + '.');
          },
        },
      });
      playerVideoId = vid;
    });
  }

  function loadGame() {
    buildSteps();
    stepIdx = 0;
    updateTaggedCount();
    refreshPlayer();
    render();
  }

  // ---- keyboard shortcuts ----
  // Writes a field on whichever kind of event is selected: passes and blocks
  // are keyed by their own uuid, the synthesized events by their point key.
  function setCurrentField(key, value) {
    const step = steps[stepIdx];
    if (!step) return;
    if (step.kind === 'pass' || step.kind === 'block') setField(key, value);
    else setPointField(step.uuid, key, value);
  }
  function grabTimeWithOffset(offset) {
    if (!player || !player.getCurrentTime) return false;
    setCurrentField('timestamp', Math.max(0, Math.floor(player.getCurrentTime()) + offset));
    return true;
  }
  // Nudging works off the timestamp already recorded; with none yet it falls
  // back to where the video is, so "," / "." are useful before a grab too.
  function nudgeTimestamp(delta) {
    const step = steps[stepIdx];
    if (!step) return;
    const rec = stepRecord(step) || {};
    let base = rec.timestamp;
    if (base == null) {
      if (!player || !player.getCurrentTime) return;
      base = Math.floor(player.getCurrentTime());
    }
    setCurrentField('timestamp', Math.max(0, base + delta));
    renderPanel();
  }
  function applyPreset(key) {
    const step = steps[stepIdx];
    const preset = TAG_PRESETS[key];
    if (!preset || !step || step.kind !== 'pass') return;
    // Only the fields a preset names are written -- it tops up the tag rather
    // than resetting the whole record, so anything you set by hand survives.
    Object.keys(preset.tags).forEach(field => setField(field, preset.tags[field]));
    grabTimeWithOffset(-2);
    renderPanel();
  }

  // arrow-key stepping + tagging shortcuts, all ignored while typing in a field
  document.addEventListener('keydown', (e) => {
    if (!section.classList.contains('active')) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goToStep(stepIdx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goToStep(stepIdx - 1); }
    else if (TAG_PRESETS[e.key]) { e.preventDefault(); applyPreset(e.key); }
    else if (e.key === ',') { e.preventDefault(); nudgeTimestamp(-1); }
    else if (e.key === '.') { e.preventDefault(); nudgeTimestamp(1); }
  });

  // ---- export / import + tagged count ----
  // On a single-game tagging page the file names itself after that game
  // (mirroring the tagging page's own filename, plus the date so two games
  // against the same opponent don't come back as identical files). In the full
  // Data Editor the export spans every game, so it stays team-wide.
  function annotationsFilename() {
    if (!tagOnly) return slug(REPORT.teamName) + '_annotations.json';
    const g = REPORT.games[tagOnlyGame];
    return slug(REPORT.teamName) + '_tag_' + slug(g.opponent) + '_' + slug(g.dateDisplay) + '_annotations.json';
  }
  const exportBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Export annotations JSON')]);
  exportBtn.addEventListener('click', () => {
    downloadFile(JSON.stringify({ version: ANNOTATIONS_SCHEMA_VERSION, teamName: REPORT.teamName, passes: annotations.passes, blocks: annotations.blocks, points: annotations.points }, null, 2),
      annotationsFilename(), 'application/json');
  });
  const importBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Import annotations JSON')]);
  const importInput = el('input', { type: 'file', accept: 'application/json,.json' }, []);
  importInput.style.display = 'none';
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files && importInput.files[0];
    importInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        // Field-level merge (not whole-record replace) so combining several
        // taggers who touched the same pass keeps everyone's fields -- e.g. one
        // added Hand, another added Release. On a genuine conflict of the same
        // field, the imported file wins.
        mergeAnnotationStore(annotations.passes, parsed.passes);
        mergeAnnotationStore(annotations.blocks, parsed.blocks);
        mergeAnnotationStore(annotations.points || (annotations.points = {}), parsed.points);
        saveAnnotations(annotations);
        updateTaggedCount();
        render();
      } catch (e) { alert('Could not read that annotations file.'); }
    };
    reader.readAsText(file);
  });
  tagPane.appendChild(el('div', { class: 'controls-row de-io-row' }, [exportBtn, importBtn, taggedCount, importInput]));

  // Refresh on every visit: pick up a video link added on Set up, or
  // annotations changed by an import elsewhere, without a reload.
  gameViewRefreshers.set('data-editor', () => { annotations = loadAnnotations(); refreshPlayer(); updateTaggedCount(); render(); });

  loadGame();
  return section;
}

// ---------- Advanced Stats: the "EDGE" goal-equivalent / efficiency family ----------
// Implements Table 1 of the BBSM EDGE framework (minus EDGE-PM). The framework
// is league-relative; this report has only one team, so:
//   * game-condition adjustments (AdjT/AdjB) use this selection's own overall
//     scoring efficiency as the "league" reference, and
//   * the purely league-relative ratings (PER-O, PER) are omitted.
// Every input comes from the per-game box score plus the per-point defensive-
// possession count, so it recomputes for any game/tournament subset. Notable
// interpretations (see the on-page descriptions too): "yards" = net downfield
// throwing+receiving gain; the goal-equivalent pool (Goals + Turns*GmSE) is
// split 75% to yardage share, 25% to scoring share; AdjB mirrors AdjT.
function computeAdvancedStats(gameIndices) {
  // ---- per-game team quantities + goal-equivalent coefficients ----
  let sumGmG = 0, sumGmT = 0;
  const perGame = gameIndices.map(gi => {
    const g = REPORT.games[gi];
    let tGoals = 0, tAssists = 0, tTurns = 0, tYards = 0;
    (g.boxScore || []).forEach(r => {
      tGoals += r.goals; tAssists += r.assists; tTurns += r.turnovers;
      tYards += (r.throwGain || 0) + (r.catchGain || 0);
    });
    // Opponent turnovers we don't record directly, but each opponent offensive
    // possession that didn't end in their goal is one -- and we know the number
    // of their possessions per point and whether they scored it.
    const oppTurns = (g.points || []).reduce((s, pt) => s + Math.max(0, (pt.defensivePossessions || 0) - (pt.result === -1 ? 1 : 0)), 0);
    const GmG = g.ourScore + g.oppScore;
    const GmT = tTurns + oppTurns;
    const GmSE = (GmG + GmT) > 0 ? GmG / (GmG + GmT) : 0;
    sumGmG += GmG; sumGmT += GmT;
    const pool = tGoals + tTurns * GmSE; // total offensive goal-equivalent pool
    const Ycoeff = tYards > 0 ? 0.75 * pool / tYards : 0;
    const Scoeff = (tGoals + tAssists) > 0 ? 0.25 * pool / (tGoals + tAssists) : 0;
    return { g, GmSE, Ycoeff, Scoeff };
  });
  // "League" scoring-efficiency stand-in = this whole selection (both teams).
  const refSE = (sumGmG + sumGmT) > 0 ? sumGmG / (sumGmG + sumGmT) : 0.5;

  // ---- per-player additive components ----
  const byPlayer = new Map();
  function acc(name) {
    if (!byPlayer.has(name)) byPlayer.set(name, {
      player: name, gamesPlayed: 0, edgeO: 0, edgeB: 0, thrge: 0, recge: 0,
      tchPlus: 0, adjT: 0, adjB: 0, xOO: 0, xDO: 0, xOpPoss: 0,
    });
    return byPlayer.get(name);
  }
  perGame.forEach(({ g, GmSE, Ycoeff, Scoeff }) => {
    (g.boxScore || []).forEach(r => {
      const a = acc(r.player);
      a.gamesPlayed += 1;
      const yards = (r.throwGain || 0) + (r.catchGain || 0);
      a.edgeO += yards * Ycoeff + (r.goals + r.assists) * Scoeff - r.turnovers * GmSE;
      a.edgeB += r.blocks * GmSE;
      a.thrge += (r.throwGain || 0) * Ycoeff + r.assists * Scoeff;
      a.recge += (r.catchGain || 0) * Ycoeff + r.goals * Scoeff;
      a.tchPlus += r.throws + r.receiverErrors + 0.5 * r.goals;
      const seFactor = refSE > 0 ? GmSE / refSE : 1;
      a.adjT += r.turnovers * seFactor;
      a.adjB += r.blocks * seFactor;
      const OLP = r.offensePlayed, DLP = r.defensePlayed, d = 2 - GmSE;
      if (GmSE > 0 && d > 0) {
        const xP = OLP * (1 / d) * (1 / GmSE) + DLP * ((1 - GmSE) / d) * (1 / GmSE);
        const xOp = OLP * ((1 - GmSE) / d) * (1 / GmSE) + DLP * (1 / d) * (1 / GmSE);
        a.xOpPoss += xOp;
        a.xOO += xP * GmSE; a.xDO += xOp * GmSE;
      }
    });
  });
  const rows = [...byPlayer.values()];

  // ---- xE priors: a fixed 30 "prior possessions" at the population rate ----
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const PRIOR = 30;
  const aEO = PRIOR * (sum('xOO') > 0 ? sum('edgeO') / sum('xOO') : 0);
  const aEB = PRIOR * (sum('xDO') > 0 ? sum('edgeB') / sum('xDO') : 0);
  const aCP = PRIOR * (sum('tchPlus') > 0 ? (sum('tchPlus') - sum('adjT')) / sum('tchPlus') : 0);

  // ---- PE priors: method-of-moments Beta fit to the per-player rate spread ----
  function betaFit(rateFn) {
    const rs = rows.map(rateFn).filter(x => x != null && isFinite(x) && x > 0 && x < 1);
    if (rs.length < 3) return { a: 1, b: 1 };
    const m = rs.reduce((s, x) => s + x, 0) / rs.length;
    const v = rs.reduce((s, x) => s + (x - m) * (x - m), 0) / rs.length;
    if (v <= 0 || v >= m * (1 - m)) return { a: 1, b: 1 };
    const a = m * m * (1 - m) / v - m;   // = ((1-m)/v - 1/m) * m^2
    const b = a * (1 / m - 1);
    return (a > 0 && b > 0) ? { a, b } : { a: 1, b: 1 };
  }
  const peO = betaFit(r => { const den = r.thrge + r.recge + r.adjT; return den > 0 ? (r.thrge + r.recge) / den : null; });
  const peB = betaFit(r => (r.xOpPoss > 0 ? r.adjB / r.xOpPoss : null));

  rows.forEach(r => {
    r.edge = r.edgeO + r.edgeB;
    r.xEO = 100 * (r.edgeO + aEO) / (r.xOO + PRIOR);
    r.xEB = 100 * (r.edgeB + aEB) / (r.xDO + PRIOR);
    r.xE = r.xEO + r.xEB;
    r.cpPlus = 100 * (r.tchPlus - r.adjT + aCP) / (r.tchPlus + PRIOR);
    const peoNum = r.thrge + r.recge;
    r.peO = (peoNum + peO.a) / (peoNum + r.adjT + peO.a + peO.b);
    r.peB = (r.adjB + peB.a) / (r.xOpPoss + peB.a + peB.b);
    r.pe = r.peO + r.peB;
  });

  // ---- CR: average percentile rank (0-100) in EDGE, xE, PE within the selection ----
  function pctRanks(key) {
    const sorted = [...rows].sort((x, y) => x[key] - y[key]);
    const map = new Map();
    sorted.forEach((r, i) => map.set(r, rows.length > 1 ? (i / (rows.length - 1)) * 100 : 100));
    return map;
  }
  const rE = pctRanks('edge'), rX = pctRanks('xE'), rP = pctRanks('pe');
  rows.forEach(r => { r.cr = (rE.get(r) + rX.get(r) + rP.get(r)) / 3; });

  return rows;
}

const ADVANCED_COLUMNS = [
  { key: 'player', label: 'Player', full: 'Player', numeric: false },
  { key: 'gamesPlayed', label: 'GP', full: 'Games played in the current selection', numeric: true },
  { key: 'edgeO', label: 'EDGE-O', full: 'Offensive goal equivalents = your share (by yards and by scores) of the team’s scoring value, minus the value of your turnovers. Team EDGE-O sums to the team’s goals.', numeric: true },
  { key: 'edgeB', label: 'EDGE-B', full: 'Block goal equivalents = your blocks valued at what a turnover costs (block × game scoring efficiency).', numeric: true },
  { key: 'edge', label: 'EDGE', full: 'Total goal equivalents produced (EDGE-O + EDGE-B).', numeric: true },
  { key: 'xEO', label: 'xEO', full: 'Offensive goal equivalents per unit of expected offensive opportunity (×100), smoothed with a 30-possession prior.', numeric: true },
  { key: 'xEB', label: 'xEB', full: 'Block goal equivalents per unit of expected defensive opportunity (×100), 30-possession prior.', numeric: true },
  { key: 'xE', label: 'xE', full: 'Combined productivity (xEO + xEB).', numeric: true },
  { key: 'cpPlus', label: 'CP+', full: 'Modified completion / disc-retention rate: touches you kept alive out of your touches (goals count as half a touch, drops as a full one), with turnovers adjusted for game scoring conditions.', numeric: true, percent: true },
  { key: 'peO', label: 'PE-O', full: 'Offensive efficiency: throwing + receiving goal equivalents per player possession, empirical-Bayes smoothed.', numeric: true },
  { key: 'peB', label: 'PE-B', full: 'Block efficiency: adjusted blocks per opponent possession, empirical-Bayes smoothed.', numeric: true },
  { key: 'pe', label: 'PE', full: 'Player efficiency (PE-O + PE-B).', numeric: true },
  { key: 'cr', label: 'CR', full: 'Composite rating (0–100): the average of your percentile ranks in EDGE, xE and PE within the current selection.', numeric: true },
];

const ADV_DESCRIPTIONS = [
  ['EDGE-O', 'Offensive goal equivalents. A share-based allocation: the game’s scoring value (goals, plus the value tied up in turnovers) is split 75% by each player’s yardage share and 25% by their scoring share, then their own turnovers are subtracted. Across the team it sums to the goals scored.'],
  ['EDGE-B', 'Block goal equivalents — a block is worth what a turnover costs (block × the game’s scoring efficiency).'],
  ['EDGE', 'Total production: EDGE-O + EDGE-B.'],
  ['xEO / xEB', 'The same production, expressed per unit of expected opportunity (offensive / defensive), scaled ×100 and smoothed toward the roster average with a 30-possession prior so small samples don’t dominate. Opportunities are estimated from O-line and D-line points played.'],
  ['xE', 'Combined productivity, xEO + xEB.'],
  ['CP+', 'A retention-rate twist on completion %: of your touches (a goal counts as half a touch, a drop as a full one), how many you kept alive — turnovers adjusted for game scoring conditions.'],
  ['PE-O / PE-B / PE', 'Per-possession efficiency: goal equivalents per offensive possession (PE-O) and adjusted blocks per opponent possession (PE-B), each shrunk toward the roster distribution via an empirical-Bayes (Beta) prior. PE = PE-O + PE-B.'],
  ['CR', 'A composite ranking (0–100): the average of your percentile ranks in EDGE, xE and PE among the players in the current selection.'],
];

function buildAdvancedStatsSection() {
  const section = el('section', { class: 'view', id: 'advanced-stats' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Advanced Stats')]));
  section.appendChild(el('h1', { class: 'adv-subtitle' }, [document.createTextNode('Ultiworld EDGE Stats')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('The EDGE family of goal-equivalent and efficiency metrics, one row per player.')]));
  section.appendChild(el('p', { class: 'pitch-caption' }, [
    document.createTextNode('These come from the “EDGE” framework, which is built to rank players against a whole league. This report has only your team’s season, so game-condition adjustments use your own season’s scoring efficiency as the reference, and the purely league-relative ratings (PER-O, PER) are left out. Read the numbers as comparable across your own roster, not against outside benchmarks. Percentages and rates shift as you change the game/tournament filter, since the priors and reference are recomputed over the selection. Full definitions and worked examples are in the '),
    el('a', { href: 'https://docs.google.com/document/d/1ZgBKIX0DtGNomjwr1EuvsOkK4QRB6GP4/edit', target: '_blank', rel: 'noopener noreferrer' }, [document.createTextNode('Ultiworld EDGE reference page')]),
    document.createTextNode('.'),
  ]));

  const filename = () => slug(REPORT.teamName) + '_advanced_stats.csv';
  const header = el('div', { class: 'section-title-row' }, [el('span', {}, [document.createTextNode('Player metrics')])]);
  const tableHolder = el('div', {}, []);
  let current = buildStatsTable(computeAdvancedStats(REPORT.games.map((g, i) => i)), ADVANCED_COLUMNS, 'edge', filename());
  tableHolder.appendChild(current);
  header.appendChild(buildGameFilterDropdown((indices) => {
    const fresh = buildStatsTable(computeAdvancedStats(indices), ADVANCED_COLUMNS, 'edge', filename());
    tableHolder.replaceChild(fresh, current);
    current = fresh;
  }));
  section.appendChild(header);
  section.appendChild(tableHolder);

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('What these mean')]));
  const list = el('div', { class: 'adv-desc' }, []);
  ADV_DESCRIPTIONS.forEach(([term, body]) => {
    list.appendChild(el('div', { class: 'adv-desc-item' }, [
      el('div', { class: 'adv-desc-term' }, [document.createTextNode(term)]),
      el('div', { class: 'adv-desc-body' }, [document.createTextNode(body)]),
    ]));
  });
  section.appendChild(list);
  return section;
}

// ---------- Guided tours (published team report only) ----------
// A short walkthrough per tab: dim everything, cut a hole around one element,
// explain it, Next. Teammates open this report cold and with no one to ask, so
// each tab introduces itself once and then gets out of the way -- the "Guide"
// button in the nav replays it on demand.
//
// Steps name their target with a selector scoped to the section. A step whose
// target is missing or hidden is dropped before the tour starts, so the same
// script works whether or not a game has film tagged, a video link, or lines
// built yet.
const TOURS = {
  season: [
    { title: 'Welcome', body: 'This is your season report — every game, point and throw the team logged, in one page. Nothing here is live: it’s a snapshot you can explore freely, and you can’t break it.' },
    { sel: '#topnav', title: 'The tabs', body: 'Each tab is a different way to slice the same season. Work left to right the first time — Season for the overview, Games for a single game, then the analysis tabs.' },
    { sel: '.hero-record', title: 'Season record', body: 'Wins–losses, and how the team scored overall. The number underneath is total point differential across the season.' },
    { sel: '.schedule-grid', title: 'Every game', body: 'Click any game card to jump straight to that game’s page.' },
    { sel: '.eff-widget', title: 'Scoring efficiency', body: 'How often a possession, a point, or a red-zone trip ended in a goal. Hover a gauge for the raw counts behind the percentage.' },
    { sel: '.section-title-row', title: 'Filter to what you care about', body: 'This dropdown scopes the leaderboard below to any games you pick — one game, one tournament, or the whole season.' },
    { sel: '.stats-block', title: 'Season leaderboard', body: 'Every tracked stat, per player. Click a column header to sort by it, hover a header to see what it means, and use Download CSV for a spreadsheet.' },
  ],
  game: [
    { title: 'A single game', body: 'This page replays one game from the score down to individual throws. Use the Games menu up top to switch games.' },
    { sel: '.score-bug', title: 'Final score', body: 'The result, and who it was against.' },
    { sel: '.game-watch-wrap', title: 'Game video', body: 'Opens the full game footage in a new tab.' },
    { sel: '.diff-chart-wrap', title: 'How the game flowed', body: 'Score margin point by point — the shape shows runs and collapses. The colour strip underneath is each point’s Leverage: gold means the game hinged on it. Click any dot to open that point.' },
    { sel: '.point-log', title: 'Point by point', body: 'One row per point: the score, what happened, and which line was on. Click a row — or use the ← / → arrow keys — to load that point into the diagram.' },
    { sel: '.pitch-wrap', title: 'The field diagram', body: 'Every throw in the selected point. White means completed, gold is the assist, red dashed is a turnover. Each circle is a player at the spot they threw or caught from; hover a throw for detail.' },
    { sel: '.film-strip', title: 'Tagged film', body: 'If someone has tagged this point from the video, its events are listed here — and each ▶ jumps straight to that moment in the footage.' },
    { sel: '.stats-block', title: 'Box score', body: 'Every player’s numbers for this game, sortable and downloadable.' },
  ],
  'data-editor': [
    { title: 'Film Clips', body: 'A searchable index of everything tagged from the game videos. Build a filter, get a clip list, jump to each moment.' },
    { sel: '.de-query-top', title: 'Pick your scope', body: 'Choose which games to search, and which kind of event — passes, blocks, pulls, defensive possessions or opponent turnovers.' },
    { sel: '.de-query-filters', title: 'Narrow it down', body: 'Combine tags to answer a question: outcome Turnover plus hand Backhand plus release Around gives you every around-backhand turnover.' },
    { sel: '.de-query-summary-row', title: 'How common is it?', body: 'The count and percentage are out of every event of that kind in scope — so it reads as “this happened in 12% of our turnovers”. Copy timestamp links grabs the whole list of video links at once.' },
    { sel: '.de-query-results', title: 'The clips', body: 'Each result shows its tags and links straight to that moment in the game video.' },
  ],
  'player-analysis': [
    { title: 'Player Analysis', body: 'Put players side by side across whichever games you choose.' },
    { sel: '.section-title-row', title: 'Choose players and games', body: 'Add up to 7 players from the dropdown. The games filter beside it scopes every number to the games you pick.' },
    { sel: '#player-analysis > div:last-child', title: 'The comparison', body: 'Once you’ve picked players, each gets a column: their stats, a map of where they throw and catch, and a rose diagram of their throwing directions.' },
  ],
  'line-analysis': [
    { title: 'Line Analysis', body: 'Treat a recurring 7-person lineup as if it were a player, and compare lines the same way.' },
    { sel: '#line-analysis > .controls-row', title: 'Across or within tournaments', body: 'Choose whether a line means the same 7 all season, or the same 7 within one tournament.' },
    { sel: '.line-mgmt', title: 'Build your lines', body: 'The report finds lineups that played together repeatedly; you confirm and name the ones that are real. This is editable — your lines are saved in this browser.' },
    { sel: '#line-analysis > div:last-child', title: 'Compare them', body: 'Named lines get compared here on hold rate, break rate, efficiency and average leverage.' },
  ],
  'thrower-receiver-analysis': [
    { title: 'Thrower-Receiver Analysis', body: 'Which connections the team actually uses, and which ones work.' },
    { sel: '#thrower-receiver-analysis > .controls-row', title: 'Scope and filters', body: 'Pick games, and optionally limit to a category of throw like hucks or turnovers.' },
    { sel: '.pair-heatmap-wrap', title: 'The connection matrix', body: 'Throwers down the side, receivers across the top; the brighter the cell the more that connection happened. Switch the metric above to view completion rate or yards instead. Click any cell to add that pair to the comparison below.' },
    { sel: '#thrower-receiver-analysis .section-title-toggle', title: 'All pairs', body: 'Expand this for the full sortable table of every pair, downloadable as a CSV.' },
  ],
  'field-analysis': [
    { title: 'Field Analysis', body: 'Every throw the team made, overlaid on one pitch — useful for spotting where the offence actually lives.' },
    { sel: '.field-analysis-controls', title: 'Choose what to plot', body: 'Filter by players, games and throw category. Everything you pick is drawn on the same field.' },
    { sel: '.field-analysis-pitch-wrap', title: 'The overlay', body: 'Each line is one throw. Patterns show up fast: a wall of short resets, or hucks all going to one side.' },
    { sel: '.field-analysis-export-row', title: 'Save the picture', body: 'Export the diagram as a PNG to drop into a team chat or a scouting doc.' },
  ],
  'gender-analysis': [
    { title: 'Gender Analysis', body: 'In mixed ultimate, touch distribution is worth watching. This tab measures it directly rather than by feel.' },
    { sel: '.gender-explainer', title: 'How to read it', body: 'Worth reading once — it explains what the chart measures and what counts as balanced given who was on the field.' },
    { sel: '#gender-analysis > .controls-row', title: 'Pick a view', body: 'Switch between metrics and scope the chart to whichever games you want.' },
    { sel: '.gender-chart-wrap', title: 'The chart', body: 'Each dot is a player against the fairness line. Distance from that line is how far their share of touches sits from an even split.' },
  ],
  'advanced-stats': [
    { title: 'Advanced Stats', body: 'The Ultiworld EDGE metrics: a way of valuing every yard, score and turnover on one scale so players can be compared with a single number.' },
    { sel: '#advanced-stats .pitch-caption', title: 'Read this first', body: 'These were designed to rank players across a whole league. This report only has your season, so treat the numbers as comparing your own roster to each other — not to outside benchmarks.' },
    { sel: '#advanced-stats .section-title-row', title: 'Scope it', body: 'The filter recomputes everything for the games you pick, including the baselines the ratings are measured against.' },
    { sel: '#advanced-stats .stats-block, #advanced-stats table.stats', title: 'The table', body: 'One row per player. Sort by any column; hover a header for a one-line definition.' },
    { sel: '.adv-desc', title: 'What each one means', body: 'Plain-language definitions of every column, in case a header tooltip isn’t enough.' },
  ],
  'raw-data': [
    { title: 'Raw Data', body: 'The underlying data, for when you want to do your own analysis rather than read someone else’s.' },
    { sel: '#raw-data > .controls-row', title: 'Scope every export', body: 'This filter applies to all the downloads below.' },
    { sel: '#raw-data .export-grid', title: 'Spreadsheet exports', body: 'One CSV per kind of record — passes, points, blocks, box scores. Each card tells you how many rows you’ll get.' },
    { sel: '#raw-data .export-grid:last-of-type', title: 'For asking an AI', body: 'The JSON is the data; the Markdown explains what every field means and suggests questions worth asking. Hand an assistant both together.' },
  ],
};

const TOUR_PAD = 6;
let tourState = null;

function toursSeenKey() { return 'statto-report-tours-seen::' + REPORT.teamName; }
function loadToursSeen() {
  try { return JSON.parse(localStorage.getItem(toursSeenKey())) || {}; } catch (e) { return {}; }
}
function saveToursSeen(seen) {
  try { localStorage.setItem(toursSeenKey(), JSON.stringify(seen)); } catch (e) {}
}
// Game pages all share one tour; every other view is keyed by its own id.
function tourKeyForView(id) { return String(id).startsWith('game-') ? 'game' : id; }

function tourTargetFor(step, viewId) {
  if (!step.sel) return null;
  const section = document.getElementById(viewId);
  if (!section) return null;
  // A selector starting with "#" is already absolute; anything else is scoped
  // to the section being toured, so the same step works on any game page.
  const found = step.sel.split(',')
    .map(s => s.trim())
    .map(s => (s.charAt(0) === '#' ? document.querySelector(s) : section.querySelector(s)))
    .find(Boolean);
  if (!found) return null;
  const r = found.getBoundingClientRect();
  // Hidden or collapsed (a film strip with nothing tagged, a missing video
  // link) -- drop the step rather than pointing at nothing.
  if (!found.offsetParent && found !== document.body) return null;
  if (r.width < 2 || r.height < 2) return null;
  return found;
}

function endTour() {
  if (!tourState) return;
  window.removeEventListener('resize', tourState.reposition);
  window.removeEventListener('scroll', tourState.reposition, true);
  document.removeEventListener('keydown', tourState.onKey, true);
  document.documentElement.style.scrollBehavior = tourState.priorScrollBehavior;
  tourState.root.remove();
  tourState = null;
}

function startTour(viewId) {
  endTour();
  const key = tourKeyForView(viewId);
  const defs = TOURS[key];
  if (!defs) return;
  // Resolve now: an unavailable target drops its step, so the counter is honest.
  const steps = defs.filter(s => !s.sel || tourTargetFor(s, viewId));
  if (!steps.length) return;

  const root = el('div', { class: 'tour-root' }, []);
  const backdrop = el('div', { class: 'tour-backdrop' }, []);
  const hole = el('div', { class: 'tour-hole' }, []);
  const pop = el('div', { class: 'tour-pop', role: 'dialog', 'aria-modal': 'true' }, []);
  root.appendChild(backdrop);
  root.appendChild(hole);
  root.appendChild(pop);
  document.body.appendChild(root);

  let i = 0;
  const priorScrollBehavior = document.documentElement.style.scrollBehavior;
  // Measuring straight after scrollIntoView needs the scroll to be instant;
  // the stylesheet sets smooth scrolling globally.
  document.documentElement.style.scrollBehavior = 'auto';

  function reposition() {
    if (!tourState) return;
    const step = steps[i];
    const target = step.sel ? tourTargetFor(step, viewId) : null;
    if (!target) {
      // No element to point at (the intro step): collapse the highlight to a
      // zero-size box so its box-shadow still dims the whole screen, and centre
      // the card. Hiding the box outright would take the dim with it.
      hole.classList.add('tour-hole-empty');
      hole.style.top = Math.round(window.innerHeight / 2) + 'px';
      hole.style.left = Math.round(window.innerWidth / 2) + 'px';
      hole.style.width = '0px';
      hole.style.height = '0px';
      pop.classList.add('tour-pop-centered');
      pop.style.top = ''; pop.style.left = '';
      return;
    }
    pop.classList.remove('tour-pop-centered');
    hole.classList.remove('tour-hole-empty');
    const r = target.getBoundingClientRect();
    const top = Math.max(4, r.top - TOUR_PAD);
    const left = Math.max(4, r.left - TOUR_PAD);
    const height = Math.min(r.height + TOUR_PAD * 2, window.innerHeight - top - 4);
    const width = Math.min(r.width + TOUR_PAD * 2, window.innerWidth - left - 4);
    hole.style.top = top + 'px';
    hole.style.left = left + 'px';
    hole.style.width = width + 'px';
    hole.style.height = height + 'px';

    // Prefer below the target, flip above when there isn't room.
    const pr = pop.getBoundingClientRect();
    const below = top + height + 12;
    const popTop = (below + pr.height < window.innerHeight - 8)
      ? below
      : Math.max(8, top - pr.height - 12);
    const popLeft = Math.min(
      Math.max(8, left + width / 2 - pr.width / 2),
      window.innerWidth - pr.width - 8
    );
    pop.style.top = popTop + 'px';
    pop.style.left = popLeft + 'px';
  }

  function render() {
    const step = steps[i];
    pop.innerHTML = '';
    pop.appendChild(el('div', { class: 'tour-count' }, [document.createTextNode(`${i + 1} of ${steps.length}`)]));
    pop.appendChild(el('div', { class: 'tour-title' }, [document.createTextNode(step.title)]));
    pop.appendChild(el('p', { class: 'tour-body' }, [document.createTextNode(step.body)]));
    const row = el('div', { class: 'tour-actions' }, []);
    const skip = el('button', { class: 'tour-skip', type: 'button' }, [document.createTextNode(i === steps.length - 1 ? '' : 'Skip')]);
    skip.addEventListener('click', endTour);
    if (i < steps.length - 1) row.appendChild(skip);
    if (i > 0) {
      const back = el('button', { class: 'tour-btn tour-back', type: 'button' }, [document.createTextNode('Back')]);
      back.addEventListener('click', () => { i--; render(); });
      row.appendChild(back);
    }
    const next = el('button', { class: 'tour-btn tour-next', type: 'button' }, [document.createTextNode(i === steps.length - 1 ? 'Done' : 'Next')]);
    next.addEventListener('click', () => {
      if (i === steps.length - 1) { endTour(); return; }
      i++; render();
    });
    row.appendChild(next);
    pop.appendChild(row);

    const target = step.sel ? tourTargetFor(step, viewId) : null;
    // Scrolling is forced instant while a tour is open, so the element is
    // already in its final place and can be measured straight away. The extra
    // frame afterwards only refines it -- positioning must not depend on a
    // callback that never fires in a background tab.
    if (target) target.scrollIntoView({ block: 'center', inline: 'nearest' });
    reposition();
    next.focus();
    requestAnimationFrame(reposition);
  }

  function onKey(e) {
    if (!tourState) return;
    if (e.key === 'Escape') { e.preventDefault(); endTour(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (i < steps.length - 1) { i++; render(); } else endTour(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) { i--; render(); } }
  }

  tourState = { root, reposition, onKey, priorScrollBehavior };
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  document.addEventListener('keydown', onKey, true);
  render();
}

// First visit to a tab in the team report runs its tour once, then never again
// on this browser unless the Guide button is used.
function maybeAutoTour(viewId) {
  if (!VIEWER_MODE) return;
  const key = tourKeyForView(viewId);
  if (!TOURS[key]) return;
  const seen = loadToursSeen();
  if (seen[key]) return;
  seen[key] = true;
  saveToursSeen(seen);
  // Let the view finish rendering (some rebuild on show) before measuring it.
  setTimeout(() => { if (document.getElementById(viewId)) startTour(viewId); }, 400);
}

function currentViewId() {
  const active = document.querySelector('main section.view.active');
  return active ? active.id : null;
}

// ---------- Bootstrap: build nav + all sections on load ----------
function init() {
  buildNav();
  const main = document.getElementById('main');
  // Per-game tagging page: just the Data Editor, locked to one game.
  if (TAGONLY_GAME != null) {
    main.appendChild(buildDataEditorSection(false, TAGONLY_GAME));
    return;
  }

  if (!VIEWER_MODE) main.appendChild(buildSetupSection());
  main.appendChild(buildDataEditorSection(VIEWER_MODE));
  // Every analysis tab groups/scopes by tournament, so each is registered as
  // a rebuildable view -- see showView / tournamentsRevision -- to pick up
  // tournament edits from the Set up tab on the next click into it.
  mountRebuildableView(buildSeasonSection);
  mountRebuildableView(buildPlayerAnalysisSection);
  mountRebuildableView(buildLineAnalysisSection);
  mountRebuildableView(buildThrowerReceiverSection);
  mountRebuildableView(buildFieldAnalysisSection);
  mountRebuildableView(buildGenderAnalysisSection);
  mountRebuildableView(buildAdvancedStatsSection);
  mountRebuildableView(buildRawDataSection);
  REPORT.games.forEach((g, i) => main.appendChild(buildGameSection(g, i)));
  // Season is active on load without going through showView, so its tour has
  // to be kicked off here.
  maybeAutoTour('season');
}
init();
