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
  { key: 'catchCompletionPct', label: 'Catch Cmp%', full: 'Catch completion percentage (of times targeted as a receiver)', numeric: true, percent: true },
  { key: 'assists', label: 'Ast', full: 'Assists (throw that led directly to a goal)', numeric: true },
  { key: 'secondaryAssists', label: 'S.Ast', full: 'Secondary assists (the pass before the assist)', numeric: true },
  { key: 'assistAttempts', label: 'Ast Att', full: 'Assist attempts (throws targeting the endzone, whether completed or not)', numeric: true },
  { key: 'assistCompletionPct', label: 'Ast Cmp%', full: 'Assist completion percentage (assists / assist attempts)', numeric: true, percent: true },
  { key: 'goals', label: 'Goals', full: 'Goals scored', numeric: true },
  { key: 'plusMinus', label: '+/-', full: 'Plus-minus (goals + assists − turnovers)', numeric: true },
  { key: 'turnovers', label: 'Turns', full: 'Turnovers (thrower errors + receiver errors)', numeric: true },
  { key: 'throwerErrors', label: 'Thr Err', full: 'Throwing errors (throwaways)', numeric: true },
  { key: 'receiverErrors', label: 'Rec Err', full: 'Receiving errors (drops)', numeric: true },
  { key: 'blocks', label: 'Blk', full: 'Defensive blocks', numeric: true },
  { key: 'huckAttempts', label: 'Hck Att', full: 'Huck attempts (throws gaining 27+ yards downfield)', numeric: true },
  { key: 'huckCompletions', label: 'Hck Cmp', full: 'Huck completions', numeric: true },
  { key: 'huckCompletionPct', label: 'Hck Cmp%', full: 'Huck completion percentage', numeric: true, percent: true },
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
  const fieldBtn = el('button', { class: 'tab', 'data-target': 'field-analysis' }, [document.createTextNode('Field Analysis')]);
  nav.appendChild(fieldBtn);
  const genderBtn = el('button', { class: 'tab', 'data-target': 'gender-analysis' }, [document.createTextNode('Gender Analysis')]);
  nav.appendChild(genderBtn);
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
function formatCell(v, col) {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'number') {
    const n = Number.isInteger(v) ? v : Math.round(v * 100) / 100;
    return col && col.percent ? `${n}%` : String(n);
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

function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => csvCell(c.full || c.label));
  const lines = rows.map(r => columns.map(c => csvCell(r[c.key])));
  const csv = [header, ...lines].map(line => line.join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename }, []);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildStatsTable(rows, columns, initialSortKey, filename) {
  let sortKey = initialSortKey;
  let sortDir = -1;
  let currentSorted = rows;
  const container = el('div', { class: 'stats-block' });
  const wrap = el('div', { class: 'table-scroll' });
  const table = el('table', { class: 'stats' });
  wrap.appendChild(table);
  container.appendChild(wrap);

  const dlBtn = el('button', { class: 'csv-download', type: 'button' }, [document.createTextNode('Download CSV')]);
  dlBtn.addEventListener('click', () => downloadCSV(currentSorted, columns, filename || 'stats.csv'));
  container.appendChild(dlBtn);

  function render() {
    currentSorted = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortDir * av.localeCompare(bv);
      return sortDir * ((av ?? 0) - (bv ?? 0));
    });
    table.innerHTML = '';
    const thead = el('thead', {}, []);
    const trh = el('tr', {}, []);
    columns.forEach(col => {
      const th = el('th', { class: col.key === sortKey ? 'sorted' : '', title: col.full || col.label }, [
        document.createTextNode(col.label),
        col.key === sortKey ? el('span', { class: 'arrow' }, [document.createTextNode(sortDir === -1 ? '▼' : '▲')]) : null,
      ]);
      th.addEventListener('click', () => {
        if (sortKey === col.key) sortDir *= -1; else { sortKey = col.key; sortDir = col.numeric ? -1 : 1; }
        render();
      });
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el('tbody', {}, []);
    currentSorted.forEach(r => {
      const tr = el('tr', {}, []);
      columns.forEach(col => tr.appendChild(el('td', {}, [document.createTextNode(formatCell(r[col.key], col))])));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }
  render();
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

  const marker = svgEl('marker', { id: 'arrowhead', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' });
  marker.appendChild(svgEl('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#F3F1E9' }));
  const defs = svgEl('defs', {});
  defs.appendChild(marker);
  const markerTO = svgEl('marker', { id: 'arrowhead-to', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' });
  markerTO.appendChild(svgEl('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#E8604C' }));
  defs.appendChild(markerTO);
  const markerGoal = svgEl('marker', { id: 'arrowhead-goal', markerWidth: 9, markerHeight: 9, refX: 7, refY: 3.5, orient: 'auto' });
  markerGoal.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: '#FFB800' }));
  defs.appendChild(markerGoal);
  svg.insertBefore(defs, svg.firstChild);

  const routeLayer = svgEl('g', { class: 'routes' });
  svg.appendChild(routeLayer);
  return { svg, routeLayer };
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
    if (p.turnover) { stroke = '#E8604C'; markerEnd = 'url(#arrowhead-to)'; dash = '3 3'; }
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
      'stroke-dasharray': dash === '0' ? undefined : dash,
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
// contexts, so we key on the pass, not the {pass, gameIndex} wrapper).
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

  const passMap = new Map(); // pass object -> gameIndex
  const addAll = list => list.forEach(({ pass, gameIndex }) => passMap.set(pass, gameIndex));

  if (categories.has('all')) {
    addAll(base);
  } else {
    if (categories.has('assistAttempts')) addAll(base.filter(t => t.pass.endY < ENDZONE_FRAC));
    if (categories.has('huckAttempts')) addAll(base.filter(t => (t.pass.startY - t.pass.endY) * FIELD_LENGTH_YD_JS >= IMPACT_HUCK_YD));
    if (categories.has('throwingErrors')) addAll(base.filter(t => t.pass.throwerError));
    if (categories.has('receivingErrors')) addAll(base.filter(t => t.pass.receiverError));
  }
  const passes = [...passMap.entries()].map(([pass, gameIndex]) => ({ pass, gameIndex }));
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

  const passMap = new Map(); // pass object -> {gameIndex, pointNumber}
  const addAll = list => list.forEach(t => passMap.set(t.pass, t));

  if (categories.has('all')) {
    addAll(matching);
  } else {
    if (categories.has('assistAttempts')) addAll(matching.filter(t => t.pass.endY < ENDZONE_FRAC));
    if (categories.has('huckAttempts')) addAll(matching.filter(t => (t.pass.startY - t.pass.endY) * FIELD_LENGTH_YD_JS >= IMPACT_HUCK_YD));
    if (categories.has('throwingErrors')) addAll(matching.filter(t => t.pass.throwerError));
    if (categories.has('receivingErrors')) addAll(matching.filter(t => t.pass.receiverError));
  }

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
    if (p.turnover) { stroke = '#E8604C'; markerEnd = 'url(#arrowhead-to)'; dash = '3 3'; }
    else if (p.assist) { stroke = '#FFB800'; markerEnd = 'url(#arrowhead-goal)'; width = 3; }
    const line = svgEl('line', {
      x1, y1, x2, y2, stroke, 'stroke-width': width, 'marker-end': markerEnd,
      'stroke-dasharray': dash === '0' ? undefined : dash,
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

function buildImpactCategoryDropdown(onChange) {
  const wrap = el('div', { class: 'game-filter' }, []);
  const btn = el('button', { class: 'game-filter-btn', type: 'button' }, []);
  const panel = el('div', { class: 'game-filter-panel' }, []);
  panel.style.display = 'none';
  let selected = new Set(['all']);
  const cbs = {};

  function updateLabel() {
    if (selected.has('all')) { btn.textContent = 'Showing: All throws'; return; }
    if (selected.size === 0) { btn.textContent = 'Showing: nothing'; return; }
    const labels = IMPACT_CATEGORIES.filter(c => selected.has(c.key)).map(c => c.label);
    btn.textContent = labels.length === 1 ? `Showing: ${labels[0]}` : `Showing: ${labels.length} filters`;
  }

  IMPACT_CATEGORIES.forEach(cat => {
    const cb = el('input', { type: 'checkbox' }, []);
    cb.checked = cat.key === 'all';
    const row = el('label', { class: 'game-filter-row' }, [cb, document.createTextNode(cat.label)]);
    panel.appendChild(row);
    cbs[cat.key] = cb;
    cb.addEventListener('change', () => {
      if (cat.key === 'all') {
        if (cb.checked) {
          selected = new Set(['all']);
          IMPACT_CATEGORIES.forEach(c => { if (c.key !== 'all') cbs[c.key].checked = false; });
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
    a.catchCompletionPct = pctOrNull(a.catches, a.receivingTargets);
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

// Generalized version of buildToggle for more than two options.
function buildSegToggle(options, onChange) {
  const wrap = el('div', { class: 'seg-toggle' }, []);
  const btns = options.map((opt, i) => {
    const btn = el('button', { class: 'seg-btn' + (i === 0 ? ' active' : ''), type: 'button' }, [document.createTextNode(opt.label)]);
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
  { label: 'Catch completion', main: p => fmtPct(p.catchCompletionPct), sub: p => `${p.catches}/${p.receivingTargets}` },
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

function buildComparisonTable(rowDefs, players) {
  const wrap = el('div', { class: 'table-scroll' }, []);
  const table = el('table', { class: 'stats compare' }, []);
  const thead = el('thead', {}, []);
  const headRow = el('tr', {}, [el('th', { class: 'row-label' }, [])]);
  players.forEach(p => headRow.appendChild(el('th', {}, [document.createTextNode(p.player)])));
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

  const names = REPORT.seasonLeaderboard.map(r => r.player).slice().sort((a, b) => a.localeCompare(b));
  let selectedOrder = defaultAll ? names.slice(0, maxPlayers) : [];

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

// ---------- Bootstrap: build nav + all sections on load ----------
function init() {
  buildNav();
  const main = document.getElementById('main');
  main.appendChild(buildSeasonSection());
  main.appendChild(buildPlayerAnalysisSection());
  main.appendChild(buildFieldAnalysisSection());
  main.appendChild(buildGenderAnalysisSection());
  REPORT.games.forEach((g, i) => main.appendChild(buildGameSection(g, i)));
}
init();
