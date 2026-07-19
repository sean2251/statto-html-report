// ---------- Report data & shared stats-table column definitions ----------
const REPORT = JSON.parse(document.getElementById('report-data').textContent);

const STAT_COLUMNS = [
  { key: 'player', label: 'Player', full: 'Player', numeric: false },
  { key: 'pointsPlayed', label: 'Pts', full: 'Points played', numeric: true },
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
  { key: 'plusMinus', label: '+/-', full: 'Plus-minus (goals + assists − turnovers)', numeric: true },
  { key: 'turnovers', label: 'Turns', full: 'Turnovers (thrower errors + receiver errors)', numeric: true },
  { key: 'throwerErrors', label: 'Thr Err', full: 'Throwing errors (throwaways)', numeric: true },
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
  const seasonBtn = el('button', { class: 'tab active', 'data-target': 'season' }, [document.createTextNode('Season')]);
  nav.appendChild(seasonBtn);
  nav.appendChild(buildGamesNavDropdown());
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
  const rawDataBtn = el('button', { class: 'tab', 'data-target': 'raw-data' }, [document.createTextNode('Raw Data')]);
  nav.appendChild(rawDataBtn);
  nav.querySelectorAll('button.tab:not(.nav-games-btn)').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.getAttribute('data-target')));
  });
  nav.appendChild(buildThemeToggle());
}

function showView(id) {
  document.querySelectorAll('section.view').forEach(s => s.classList.toggle('active', s.id === id));
  document.querySelectorAll('header.topnav button.tab').forEach(b => {
    if (b.classList.contains('nav-games-btn')) {
      b.classList.toggle('active', id.startsWith('game-'));
    } else {
      b.classList.toggle('active', b.getAttribute('data-target') === id);
    }
  });
  document.querySelectorAll('.nav-games-row').forEach(r => r.classList.toggle('active', r.getAttribute('data-target') === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
      visibleColumns.forEach(col => tr.appendChild(el('td', {}, [document.createTextNode(formatCell(r[col.key], col, r))])));
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
  const marker = svgEl('marker', { id: 'arrowhead', markerWidth: 9, markerHeight: 9, refX: 7, refY: 3.5, orient: 'auto' });
  marker.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: '#F3F1E9' }));
  const defs = svgEl('defs', {});
  defs.appendChild(marker);
  const markerTO = svgEl('marker', { id: 'arrowhead-to', markerWidth: 9, markerHeight: 9, refX: 7, refY: 3.5, orient: 'auto' });
  markerTO.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: '#E8604C' }));
  defs.appendChild(markerTO);
  // Turnovers split by whose mistake it was: a throwaway ends in an X (the
  // disc sailed off to nowhere), a drop ends in a hollow circle at the
  // receiver's spot (hands got there, didn't hold it). Shape -- not color --
  // carries the distinction, so it survives colorblindness and small sizes.
  const markerThrowaway = svgEl('marker', { id: 'marker-throwaway', markerWidth: 9, markerHeight: 9, refX: 4.5, refY: 4.5, orient: 'auto' });
  markerThrowaway.appendChild(svgEl('path', { d: 'M1.3,1.3 L7.7,7.7 M7.7,1.3 L1.3,7.7', stroke: '#E8604C', 'stroke-width': 1.6, fill: 'none' }));
  defs.appendChild(markerThrowaway);
  const markerDrop = svgEl('marker', { id: 'marker-drop', markerWidth: 9, markerHeight: 9, refX: 4.5, refY: 4.5, orient: 'auto' });
  markerDrop.appendChild(svgEl('circle', { cx: 4.5, cy: 4.5, r: 3, fill: 'none', stroke: '#E8604C', 'stroke-width': 1.6 }));
  defs.appendChild(markerDrop);
  // Assist (scoring) lines render 1.5x thicker (stroke-width 3 vs 2 for a
  // regular pass), and a marker's size scales with its line's stroke-width
  // by default -- so this marker's own box is shrunk by that same 2/3 ratio,
  // keeping the rendered arrowhead the same on-screen size as every other one.
  const markerGoal = svgEl('marker', { id: 'arrowhead-goal', markerWidth: 6, markerHeight: 6, refX: 4.67, refY: 2.33, orient: 'auto' });
  markerGoal.appendChild(svgEl('path', { d: 'M0,0 L4.67,2.33 L0,4.67 Z', fill: '#FFB800' }));
  defs.appendChild(markerGoal);
  svg.insertBefore(defs, svg.firstChild);

  const routeLayer = svgEl('g', { class: 'routes' });
  svg.appendChild(routeLayer);
  return { svg, routeLayer };
}

// Which end-marker a turnover pass gets: X for the thrower's mistake, hollow
// circle for the receiver's. Falls back to the plain red arrowhead for a
// turnover pass carrying neither flag (shouldn't happen in Statto data).
function turnoverMarker(p) {
  if (p.throwerError) return 'url(#marker-throwaway)';
  if (p.receiverError) return 'url(#marker-drop)';
  return 'url(#arrowhead-to)';
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

function possessionsInPoint(point) {
  const nums = [...new Set((point.passes || []).map(p => p.possession).filter(n => n != null))];
  return nums.sort((a, b) => a - b);
}

function renderPoint(routeLayer, point, focusPossession) {
  routeLayer.innerHTML = '';
  const multi = possessionsInPoint(point).length > 1;
  (point.passes || []).forEach((p, i) => {
    const x1 = p.startX * PITCH_W, y1 = p.startY * PITCH_H;
    const x2 = p.endX * PITCH_W, y2 = p.endY * PITCH_H;
    const isFocused = !multi || focusPossession == null || p.possession === focusPossession;
    let stroke = '#F3F1E9', markerEnd = 'url(#arrowhead)', width = 2, dash = '0';
    if (p.turnover) { stroke = '#E8604C'; markerEnd = turnoverMarker(p); dash = '3 3'; }
    else if (p.assist) { stroke = '#FFB800'; markerEnd = 'url(#arrowhead-goal)'; width = 3; }

    if (!isFocused) {
      // Ghost line: a faint, thin trace so the shape of other possessions stays
      // visible without competing with the focused possession's full-color route.
      const ghost = svgEl('line', {
        x1, y1, x2, y2, stroke: 'rgba(243,241,233,0.4)', 'stroke-width': 1, opacity: 0,
      });
      routeLayer.appendChild(ghost);
      ghost.style.transition = 'opacity 0.3s ease';
      requestAnimationFrame(() => ghost.setAttribute('opacity', 0.5));
      attachPassHover(routeLayer, x1, y1, x2, y2, p);
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
    attachPassHover(routeLayer, x1, y1, x2, y2, p);
  });
  (point.blocks || []).forEach(b => {
    const cx = b.locationX * PITCH_W, cy = b.locationY * PITCH_H;
    const c = svgEl('circle', { cx, cy, r: 5, fill: b.callahan ? '#FFB800' : '#F3F1E9', stroke: '#0E2426', 'stroke-width': 1.2, opacity: 0 });
    routeLayer.appendChild(c);
    c.style.transition = 'opacity 0.3s ease 0.5s';
    requestAnimationFrame(() => c.setAttribute('opacity', 1));
    const title = svgEl('title', {});
    title.textContent = (b.player || 'Unknown') + (b.callahan ? ' — Callahan!' : ' — block');
    c.appendChild(title);
  });

  // Final-throw-sequence bubbles: always shown regardless of possession focus,
  // since they mark how the point overall was decided, not a single possession's detail.
  const seq = finalSequence(point);
  if (seq) {
    [seq.second, seq.first, seq.target].forEach(node => {
      if (!node) return;
      const cx = node.x * PITCH_W, cy = node.y * PITCH_H;
      const g = svgEl('g', { opacity: 0 });
      g.appendChild(svgEl('circle', { cx, cy, r: 10, fill: '#0E2426', stroke: '#FFB800', 'stroke-width': 1.5 }));
      const label = svgEl('text', {
        x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 9, 'font-weight': 700, fill: '#F3F1E9', 'font-family': 'ui-monospace, monospace',
      });
      label.textContent = initials(node.name);
      g.appendChild(label);
      const title = svgEl('title', {});
      title.textContent = `${node.name || 'Unknown'} — ${node.role}`;
      g.appendChild(title);
      routeLayer.appendChild(g);
      g.style.transition = 'opacity 0.3s ease 0.6s';
      requestAnimationFrame(() => g.setAttribute('opacity', 1));
    });
  }
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
    let stroke = '#F3F1E9', markerEnd = 'url(#arrowhead)', width = 2, dash = '0';
    if (p.turnover) { stroke = '#E8604C'; markerEnd = turnoverMarker(p); dash = '3 3'; }
    else if (p.assist) { stroke = '#FFB800'; markerEnd = 'url(#arrowhead-goal)'; width = 3; }
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
    const bin = Math.min(DIRECTION_BINS - 1, Math.floor(angle / binWidth));
    bins[bin] += 1;
  });
  return bins;
}

function buildRoseChart(counts, size, color) {
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
  for (let i = 0; i < n; i++) {
    const [x, y] = polarPoint(cx, cy, outerMax, i * binWidth);
    svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: x, y2: y, style: 'stroke:rgba(var(--chalk-rgb),0.08);', 'stroke-width': 1 }));
  }

  for (let i = 0; i < n; i++) {
    const val = counts[i];
    const r = innerR + (val / maxVal) * (outerMax - innerR);
    const a1 = i * binWidth + gapDeg / 2;
    const a2 = (i + 1) * binWidth - gapDeg / 2;
    const p1 = polarPoint(cx, cy, r, a1);
    const p2 = polarPoint(cx, cy, r, a2);
    const p3 = polarPoint(cx, cy, innerR, a2);
    const p4 = polarPoint(cx, cy, innerR, a1);
    const d = `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 1 ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} A ${innerR} ${innerR} 0 0 0 ${p4[0]} ${p4[1]} Z`;
    svg.appendChild(svgEl('path', { d, style: `fill:${color};`, opacity: val > 0 ? 0.9 : 0.12 }));
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
      buildRoseChart(throwBins, 150, 'var(--chalk)'),
      el('div', { class: 'rose-label' }, [document.createTextNode('Throws')]),
    ]);
    const receiveCol = el('div', { class: 'rose-col' }, [
      buildRoseChart(receiveBins, 150, 'var(--chalk)'),
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

// ---------- Connections: dual Sankey of top-5 throwers-to and receivers-from ----------

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
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
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

function buildSankeyDiagram(throwers, receivers) {
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

  function addRibbon(d, color, title) {
    const g = svgEl('path', { d, style: `fill:${color};`, opacity: 0.6 });
    const t = svgEl('title', {}); t.textContent = title;
    g.appendChild(t);
    svg.appendChild(g);
  }
  function addNodeAndLabel(x, y0, y1, name, labelAnchor, labelX) {
    svg.appendChild(svgEl('rect', { x, y: y0, width: nodeW, height: Math.max(0.5, y1 - y0), style: 'fill:rgba(var(--chalk-rgb),0.5);' }));
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
    addNodeAndLabel(leftX, item.nodeY0, item.nodeY1, item.name, 'start', leftX + nodeW + 6);
    const frac = item.total ? item.completed / item.total : 0;
    const splitNodeY = item.nodeY0 + (item.nodeY1 - item.nodeY0) * frac;
    const splitCenterY = item.centerY0 + (item.centerY1 - item.centerY0) * frac;
    if (item.completed > 0) {
      addRibbon(sankeyRibbonPath(leftX + nodeW, item.nodeY0, splitNodeY, centerX - nodeW / 2, item.centerY0, splitCenterY),
        'var(--good)', `${item.name}: ${item.completed} completed`);
    }
    if (item.incomplete > 0) {
      addRibbon(sankeyRibbonPath(leftX + nodeW, splitNodeY, item.nodeY1, centerX - nodeW / 2, splitCenterY, item.centerY1),
        'var(--bad)', `${item.name}: ${item.incomplete} incomplete`);
    }
  });

  layoutSide(receivers).forEach(item => {
    // Same idea on the right: label sits just inside the ribbon area, to the
    // left of the right node.
    addNodeAndLabel(rightX, item.nodeY0, item.nodeY1, item.name, 'end', rightX - 6);
    const frac = item.total ? item.completed / item.total : 0;
    const splitNodeY = item.nodeY0 + (item.nodeY1 - item.nodeY0) * frac;
    const splitCenterY = item.centerY0 + (item.centerY1 - item.centerY0) * frac;
    if (item.completed > 0) {
      addRibbon(sankeyRibbonPath(centerX + nodeW / 2, item.centerY0, splitCenterY, rightX, item.nodeY0, splitNodeY),
        'var(--good)', `${item.name}: ${item.completed} completed`);
    }
    if (item.incomplete > 0) {
      addRibbon(sankeyRibbonPath(centerX + nodeW / 2, splitCenterY, item.centerY1, rightX, splitNodeY, item.nodeY1),
        'var(--bad)', `${item.name}: ${item.incomplete} incomplete`);
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
    card.appendChild(el('div', { class: 'impact-card-name' }, [document.createTextNode(`Thrower: ${p.player}`)]));
    if (!throwers.length && !receivers.length) {
      card.appendChild(el('p', { class: 'pitch-caption' }, [document.createTextNode('No connections recorded.')]));
    } else {
      card.appendChild(buildSankeyDiagram(throwers, receivers));
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
  { key: 'offense', label: 'O-line' },
  { key: 'defense', label: 'D-line' },
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

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: 'display:block;' });

  const zeroY = yFor(0);
  svg.appendChild(svgEl('line', { x1: padL, y1: zeroY, x2: W - padR, y2: zeroY, style: 'stroke:rgba(var(--chalk-rgb),0.25);', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
  [0, minM, maxM].filter((v, i, arr) => arr.indexOf(v) === i).forEach(v => {
    const y = yFor(v);
    const t = svgEl('text', { x: padL - 6, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 9, style: 'fill:var(--chalk-dim);', 'font-family': 'ui-monospace, monospace' });
    t.textContent = (v > 0 ? '+' : '') + v;
    svg.appendChild(t);
  });

  const pathStr = margins.map((m, i) => `${xFor(i)},${yFor(m)}`).join(' ');
  const poly = svgEl('polyline', { points: pathStr, fill: 'none', style: 'stroke:rgba(var(--chalk-rgb),0.4);', 'stroke-width': 1.5 });
  svg.appendChild(poly);
  requestAnimationFrame(() => {
    let len = 0;
    try { len = poly.getTotalLength(); } catch (e) { len = 0; }
    if (len) {
      poly.style.strokeDasharray = len;
      poly.style.strokeDashoffset = len;
      poly.style.transition = 'stroke-dashoffset 0.8s ease';
      requestAnimationFrame(() => { poly.style.strokeDashoffset = 0; });
    }
  });

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
  startG.appendChild(svgEl('circle', { cx: xFor(0), cy: yFor(0), r: 3, style: 'fill:var(--chalk-dim);', opacity: 0.6 }));
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
    const halo = svgEl('circle', { cx, cy, r: 8, fill: 'none', style: 'stroke:var(--chalk);', 'stroke-width': 2, opacity: 0 });
    const dot = svgEl('circle', { cx, cy, r: 4, style: `fill:${color};stroke:var(--ink);`, 'stroke-width': 1 });
    const hit = svgEl('circle', { cx, cy, r: 10, fill: 'transparent' });
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
  game.points.forEach(pt => {
    const entry = diffChart.dotsByNumber.get(pt.number);
    if (entry) entry.hit && entry.hit.addEventListener('click', () => selectPoint(pt, rowByNumber.get(pt.number)));
  });

  const grid = el('div', { class: 'game-grid' }, []);
  const log = el('div', { class: 'point-log' }, []);
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

  function selectPoint(pt, rowEl, forcedFocus) {
    log.querySelectorAll('.point-row').forEach(r => r.classList.remove('selected'));
    if (rowEl) rowEl.classList.add('selected');

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
    const small = [];
    if (pt.goal) small.push(pt.goal);
    if (pt.assist) small.push('ast ' + pt.assist);

    const row = el('div', { class: 'point-row', tabindex: '0', role: 'button' }, [
      el('span', { class: 'pnum' }, [document.createTextNode('#' + pt.number)]),
      el('span', { class: 'pscore' }, [document.createTextNode(pt.ourScoreBefore + '-' + pt.oppScoreBefore)]),
      el('div', { class: 'pdetail' }, [
        el('span', { class: 'goal' }, [document.createTextNode(title)]),
        small.length ? el('small', {}, [document.createTextNode(small.join(' \u00b7 '))]) : null,
      ]),
      el('span', { class: 'presult badge ' + (pt.scored ? 'W' : 'L') }, [document.createTextNode(pt.isOffense ? 'O' : 'D')]),
    ]);
    row.addEventListener('click', () => selectPoint(pt, row));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPoint(pt, row); } });
    rowByNumber.set(pt.number, row);
    log.appendChild(row);
    if (i === 0) requestAnimationFrame(() => selectPoint(pt, row));
  });

  grid.appendChild(log);
  grid.appendChild(pitchWrap);
  section.appendChild(grid);

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Box score')]));
  section.appendChild(buildStatsTable(game.boxScore, STAT_COLUMNS, 'pointsPlayed', `${slug(game.opponent)}_${slug(game.dateDisplay)}_box_score.csv`));

  return section;
}

// Raw, summable per-player fields carried on each game's boxScore rows.
// Percentages are always re-derived from these sums, never averaged directly,
// so filtering to a subset of games stays mathematically correct.
// ---------- Shared widgets: season aggregation, game filters, toggles, scoring-efficiency gauges ----------
const SEASON_RAW_FIELDS = [
  'pointsPlayed', 'offensePlayed', 'defensePlayed', 'offenseWon', 'defenseWon', 'touches',
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

function buildGameFilterDropdown(onChange) {
  const wrap = el('div', { class: 'game-filter' }, []);
  const btn = el('button', { class: 'game-filter-btn', type: 'button' }, []);
  const panel = el('div', { class: 'game-filter-panel' }, []);
  panel.style.display = 'none';
  let selected = new Set(REPORT.games.map((g, i) => i));

  function updateLabel() {
    btn.textContent = selected.size === REPORT.games.length
      ? `Games: All (${REPORT.games.length})`
      : `Games: ${selected.size} of ${REPORT.games.length}`;
  }

  const selectAllCb = el('input', { type: 'checkbox' }, []);
  selectAllCb.checked = true;
  const selectAllRow = el('label', { class: 'game-filter-row' }, [selectAllCb, document.createTextNode('Select all')]);
  panel.appendChild(selectAllRow);
  panel.appendChild(el('div', { class: 'game-filter-sep' }, []));

  const gameCbs = [];
  REPORT.games.forEach((g, i) => {
    const cb = el('input', { type: 'checkbox' }, []);
    cb.checked = true;
    const row = el('label', { class: 'game-filter-row' }, [cb, document.createTextNode(`vs ${g.opponent} (${g.dateDisplay})`)]);
    panel.appendChild(row);
    gameCbs.push(cb);
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(i); else selected.delete(i);
      selectAllCb.checked = selected.size === REPORT.games.length;
      selectAllCb.indeterminate = selected.size > 0 && selected.size < REPORT.games.length;
      updateLabel();
      onChange([...selected].sort((a, b) => a - b));
    });
  });

  selectAllCb.addEventListener('change', () => {
    if (selectAllCb.checked) { selected = new Set(REPORT.games.map((g, i) => i)); gameCbs.forEach(cb => { cb.checked = true; }); }
    else { selected = new Set(); gameCbs.forEach(cb => { cb.checked = false; }); }
    selectAllCb.indeterminate = false;
    updateLabel();
    onChange([...selected].sort((a, b) => a - b));
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
  { label: 'Touches', get: p => p.touches },
  { label: 'Goals', get: p => p.goals },
  { label: 'Assists', get: p => p.assists },
  { label: '2nd assists', get: p => p.secondaryAssists },
  { label: 'Blocks', get: p => p.blocks },
  { label: 'Thrower errors', get: p => p.throwerErrors },
  { label: 'Receiver errors', get: p => p.receiverErrors },
  { label: 'Plus/minus', get: p => p.plusMinus },
  { label: 'Total scoring efficiency', get: p => fmtPct(p.totalScoringEfficiency) },
  { label: 'Offensive scoring efficiency', get: p => fmtPct(p.offensiveScoringEfficiency) },
  { label: 'Defensive scoring efficiency', get: p => fmtPct(p.defensiveScoringEfficiency) },
  { label: 'Defensive turnover efficiency', get: p => fmtPct(p.defensiveTurnoverEfficiency) },
  { label: 'Point recovery', get: p => fmtPct(p.pointRecovery) },
];
const PLAYER_THROWER_RATE_ROWS = [
  { label: 'Throw completion', main: p => fmtPct(p.throwCompletionPct), sub: p => `${p.throwCompletions}/${p.throws}` },
  { label: 'Huck completion', main: p => fmtPct(p.huckCompletionPct), sub: p => `${p.huckCompletions}/${p.huckAttempts}` },
  { label: 'Assist completion', main: p => fmtPct(p.assistCompletionPct), sub: p => `${p.assists}/${p.assistAttempts}` },
  { label: 'Completions / game', main: p => fmtAvg(safeDiv(p.throwCompletions, p.gamesPlayed)), sub: p => `${p.throwCompletions} total` },
  { label: 'Throwaways / game', main: p => fmtAvg(safeDiv(p.throwerErrors, p.gamesPlayed)), sub: p => `${p.throwerErrors} total` },
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
  { label: 'Drops / game', main: p => fmtAvg(safeDiv(p.receiverErrors, p.gamesPlayed)), sub: p => `${p.receiverErrors} total` },
  { label: 'Total receiving gain', main: p => fmtYd(safeDiv(p.catchGain, 1)), sub: p => `over ${p.gamesPlayed} game${p.gamesPlayed === 1 ? '' : 's'}` },
  { label: 'Receiving gain / game', main: p => fmtYd(safeDiv(p.catchGain, p.gamesPlayed)), sub: p => `${safeDiv(p.catchGain, 1)} yd total` },
  { label: 'Receiving gain / pass', main: p => fmtYd(safeDiv(p.catchGain, p.catches)), sub: p => `${p.catches} receptions` },
  { label: 'Avg completed catch distance', main: p => fmtYd(safeDiv(p.catchDist, p.catches)), sub: p => `${p.catches} receptions` },
  { label: 'Avg incomplete catch distance', main: p => fmtYd(safeDiv(p.catchIncompleteDist, p.receivingTargets - p.catches)), sub: p => `${p.receivingTargets - p.catches} incomplete` },
];

function buildComparisonTable(rowDefs, players, labelKey) {
  const key = labelKey || 'player';
  const wrap = el('div', { class: 'table-scroll' }, []);
  const table = el('table', { class: 'stats compare' }, []);
  const thead = el('thead', {}, []);
  const headRow = el('tr', {}, [el('th', { class: 'row-label' }, [])]);
  players.forEach(p => headRow.appendChild(el('th', {}, [document.createTextNode(p[key])])));
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el('tbody', {}, []);
  rowDefs.forEach(rd => {
    const tr = el('tr', {}, [el('td', { class: 'row-label' }, [document.createTextNode(rd.label)])]);
    players.forEach(p => {
      let cellChildren;
      if (rd.main) {
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
  return wrap;
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
    contentArea.appendChild(buildComparisonTable(PLAYER_BASIC_ROWS, players));

    const rateHeaderRow = el('div', { class: 'section-title-row' }, [el('span', {}, [document.createTextNode('Efficiency & Averages')])]);
    const rateTableHolder = el('div', {}, []);
    let mode = 'thrower';
    function renderRateTable() {
      rateTableHolder.innerHTML = '';
      rateTableHolder.appendChild(buildComparisonTable(mode === 'thrower' ? PLAYER_THROWER_RATE_ROWS : PLAYER_RECEIVER_RATE_ROWS, players));
    }
    renderRateTable();
    rateHeaderRow.appendChild(buildToggle('Thrower', 'Receiver', (which) => {
      mode = which === 'a' ? 'thrower' : 'receiver';
      renderRateTable();
    }));
    contentArea.appendChild(rateHeaderRow);
    contentArea.appendChild(rateTableHolder);

    contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Directions')]));
    contentArea.appendChild(buildDirectionsSection(players, selectedGames));

    contentArea.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('Connections')]));
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

// Groups games into tournaments: games on the same day or on consecutive
// days (a gap of more than 1 calendar day starts a new tournament) are
// treated as one event. Tournament ids are positional (sorted-ascending),
// so -- like pointKey below -- they stay stable across regenerations as
// long as new games are only appended, never inserted into a date gap that
// would merge two existing tournaments into one.
function identifyTournaments() {
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
    return { id: 'tournament-' + i, dateKeys: keys, gameIndices, label: formatTournamentLabel(keys) };
  });
}

const LINES_SCHEMA_VERSION = 1;

// Point identity is (gameIndex, pointNumber). This stays stable across
// report regenerations as long as existing games are only ever appended to
// (never reordered or re-edited) -- exactly how this tool is used through a
// season, but worth knowing if you ever hand-edit an already-logged game.
function pointKey(gameIndex, pointNumber) { return gameIndex + '|' + pointNumber; }

function linesStorageKey() { return 'statto-report-lines::' + REPORT.teamName; }

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
  const ppNumer = { total: 0, offense: 0, defense: 0 };
  const ppDenom = { total: 0, offense: 0, defense: 0 };

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
    offensePlayed, defensePlayed,
    holds, holdRate: pct(holds, offensePlayed),
    breaks, breakRate: pct(breaks, defensePlayed),
    pointsWon, pointsWonRate: pct(pointsWon, points.length),
    throws: combined.throws, throwCompletions: combined.completions, throwCompletionPct: pct(combined.completions, combined.throws),
    huckAttempts: combined.huckAttempts, huckCompletions: combined.huckCompletions, huckCompletionPct: pct(combined.huckCompletions, combined.huckAttempts),
    assistAttempts, assists, assistCompletionPct: pct(assists, assistAttempts),
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

const LINE_ROWS = [
  { label: 'Points played', get: l => l.pointsPlayed },
  { label: 'Offensive points', get: l => l.offensePlayed },
  { label: 'Defensive points', get: l => l.defensePlayed },
  { label: 'Points won', main: l => fmtPct(l.pointsWonRate), sub: l => `${l.pointsWon}/${l.pointsPlayed}` },
  { label: 'Hold rate', main: l => fmtPct(l.holdRate), sub: l => `${l.holds}/${l.offensePlayed}` },
  { label: 'Break rate', main: l => fmtPct(l.breakRate), sub: l => `${l.breaks}/${l.defensePlayed}` },
  { label: 'Throw completion', main: l => fmtPct(l.throwCompletionPct), sub: l => `${l.throwCompletions}/${l.throws}` },
  { label: 'Huck completion', main: l => fmtPct(l.huckCompletionPct), sub: l => `${l.huckCompletions}/${l.huckAttempts}` },
  { label: 'Assist completion', main: l => fmtPct(l.assistCompletionPct), sub: l => `${l.assists}/${l.assistAttempts}` },
  { label: 'Blocks', get: l => l.blocks },
  { label: 'Opponent turnovers forced', get: l => l.oppTurnovers },
  { label: 'Red zone conversion', main: l => fmtPct(l.redZoneRate), sub: l => `${l.redZoneConversions}/${l.redZoneEntries}` },
];

function buildLineAnalysisSection() {
  const section = el('section', { class: 'view', id: 'line-analysis' }, []);
  section.appendChild(el('p', { class: 'eyebrow' }, [document.createTextNode('Line Analysis')]));
  section.appendChild(el('p', { class: 'hero-sub' }, [document.createTextNode('Detect recurring 7-person lineups, name them, then compare them like players.')]));

  const TOURNAMENTS = identifyTournaments();
  const savedData = loadLinesData();
  let lines = savedData.lines;
  let tournamentLabels = savedData.tournamentLabels; // tournament id -> custom name
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
  section.appendChild(managementWrap);
  section.appendChild(compareWrap);

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

  // Display name for a tournament: the user's custom name with the default
  // date range kept for context -- "Regionals (Jul 10–11)". Falling back to
  // the plain date-based label keeps these unique even if two tournaments
  // get typed the same custom name.
  function tournamentDisplay(t) {
    const custom = (tournamentLabels[t.id] || '').trim();
    if (!custom) return t.label;
    return custom + ' (' + t.label.replace(' Tournament', '') + ')';
  }

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
      // The tournament heading doubles as its rename field: type a custom
      // name ("Regionals") or clear it to fall back to the date-based
      // default. Saved alongside the lines themselves -- same localStorage
      // entry, same exported lines.json.
      const t = scope.tournament;
      const labelInput = el('input', { type: 'text', class: 'line-name-input line-scope-title-input', placeholder: t.label }, []);
      labelInput.value = tournamentLabels[t.id] || '';
      labelInput.addEventListener('change', () => {
        const v = labelInput.value.trim();
        if (v) tournamentLabels[t.id] = v; else delete tournamentLabels[t.id];
        persist();
        renderTournamentSelector();
        renderAll();
      });
      block.appendChild(el('div', { class: 'line-scope-title-row' }, [
        labelInput,
        el('span', { class: 'line-scope-dates' }, [document.createTextNode(t.label)]),
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

  function renderCompare() {
    compareWrap.innerHTML = '';
    const relevantLines = scopeMode === 'across'
      ? lines.filter(l => !l.tournamentId)
      : lines.filter(l => l.tournamentId && selectedTournamentIds.includes(l.tournamentId));
    if (!relevantLines.length) return;

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

      contentArea.appendChild(buildComparisonTable(LINE_ROWS, entities, 'name'));

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
      r.roseWrap.appendChild(buildRoseChart(computeDirectionBins(tagged, 'thrower'), 130, 'var(--chalk)'));
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

  section.appendChild(el('h2', { class: 'section-title' }, [document.createTextNode('All pairs data')]));
  const tableWrap = el('div', {}, []);
  section.appendChild(tableWrap);

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
  'pointIsOffense', 'pointScored', 'pointResult',
];
const POINT_EXPORT_COLUMNS = [
  'opponent', 'date', 'pointNumber', 'isOffense', 'scored', 'result',
  'ourScoreBefore', 'oppScoreBefore', 'assist', 'secondaryAssist', 'goal',
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
        ourScoreBefore: pt.ourScoreBefore, oppScoreBefore: pt.oppScoreBefore,
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
  'Plus/minus': 'Goals + assists - turnovers.',
};

const RAW_DATA_NOTES = [
  'Coordinate system: startX/startY/endX/endY on every pass are fractions from 0 to 1 of the field. Y decreases toward the attacking endzone (Y=0 is inside it, Y=1 is this team’s own endzone); X is field width and has no directional meaning.',
  'A pass is "completed" when both throwerError and receiverError are false. throwerError is the thrower’s own mistake (a bad throw); receiverError is a drop. They are mutually exclusive.',
  '"assist" flags the pass that directly led to a goal; "secondaryAssist" flags the pass immediately before it.',
  'On a point: isOffense = this team started the point with the disc, trying to score ("O-point"); false = defense ("D-point"). scored / result=1 = this team scored that point; result=-1 = the opponent scored.',
  'Blocks are this team’s own defensive plays (turnovers forced on the opponent); locationX/locationY is where the block happened.',
  'Statto only records this team’s own actions -- a point the opponent won by simply holding their own possession has zero recorded passes for that point, so point and score counts should always come from the points data, never by counting passes.',
  'Player names (not IDs) are the join key across points, passes, blocks, lineup, and boxScore within this export.',
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
  plusMinus: 'goals + assists - turnovers   // turnovers = throwerErrors + receiverErrors',
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

function buildRawDataExportJSON(gameIndices) {
  const meta = rawDataSelectionMeta(gameIndices);
  return {
    exportedAt: new Date().toISOString(),
    teamName: REPORT.teamName,
    gamesIncluded: meta.gamesIncluded,
    seasonRecordForSelection: meta.seasonRecordForSelection,
    glossary: RAW_DATA_GLOSSARY,
    notes: RAW_DATA_NOTES,
    styleGuide: RAW_DATA_STYLE_GUIDE,
    formulas: RAW_DATA_FORMULAS,
    games: meta.games,
    seasonLeaderboardForSelection: aggregateSeasonStats(gameIndices),
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
    \`blocks[]\` (every defensive block), and \`lineup[]\` (who was on the field)
  - \`boxScore[]\` — every player's per-game stats (throws, completions,
    blocks, scoring efficiency, and more)
  - \`summary\` — team-level game stats: hold/break rates, line stats split
    by combined/offense/defense, and three scoring-efficiency views
- \`seasonLeaderboardForSelection[]\` — the same kind of per-player stats as
  each game's \`boxScore\`, but totaled across every game in this export
- \`glossary\` / \`notes\` / \`styleGuide\` / \`formulas\` — the same reference
  material as the sections below, duplicated inside the JSON itself in case
  this file gets separated from it

**Key things to know:**

- Coordinates (\`startX\`/\`startY\`/\`endX\`/\`endY\` on every pass) are fractions
  from 0 to 1 of the field. Y decreases toward the attacking endzone (Y=0 is
  inside it, Y=1 is this team's own endzone); X is field width and has no
  directional meaning.
- A pass is "completed" when both \`throwerError\` and \`receiverError\` are
  false. \`assist\` flags the pass that directly led to a goal;
  \`secondaryAssist\` flags the pass immediately before it.
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

  function renderCounts() {
    captionEntries.forEach(({ def, caption }) => {
      const n = def.rowsFn(selectedGames).length;
      caption.textContent = `${n.toLocaleString()} ${pluralizeUnit(def.unit, n)} across ${selectedGames.length} game${selectedGames.length === 1 ? '' : 's'}`;
    });
    const jsonKB = Math.round(JSON.stringify(buildRawDataExportJSON(selectedGames)).length / 1024);
    jsonCaption.textContent = `~${jsonKB.toLocaleString()} KB across ${selectedGames.length} game${selectedGames.length === 1 ? '' : 's'}`;
    const mdKB = Math.round(buildRawDataMarkdown(selectedGames).length / 1024);
    mdCaption.textContent = `~${mdKB.toLocaleString()} KB, same games as above`;
  }

  controlsRow.appendChild(buildGameFilterDropdown((indices) => { selectedGames = indices; renderCounts(); }));
  renderCounts();
  return section;
}

// ---------- Bootstrap: build nav + all sections on load ----------
function init() {
  buildNav();
  const main = document.getElementById('main');
  main.appendChild(buildSeasonSection());
  main.appendChild(buildPlayerAnalysisSection());
  main.appendChild(buildLineAnalysisSection());
  main.appendChild(buildThrowerReceiverSection());
  main.appendChild(buildFieldAnalysisSection());
  main.appendChild(buildGenderAnalysisSection());
  main.appendChild(buildRawDataSection());
  REPORT.games.forEach((g, i) => main.appendChild(buildGameSection(g, i)));
}
init();
