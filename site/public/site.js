// Shared code for the team site's pages (login, editor, tagging hub, viewer,
// settings). Defines window.Site. No dependencies; the stats engine
// (assets/stats.js) and the report page template (assets/report-template.js)
// are loaded by the pages that need them.
(function () {
  'use strict';

  async function api(method, path, body, contentType) {
    const opts = { method, headers: {}, cache: 'no-store' };
    if (body !== undefined) {
      opts.body = body;
      opts.headers['Content-Type'] = contentType || 'application/json';
    }
    const r = await fetch(path, opts);
    const isJson = (r.headers.get('Content-Type') || '').includes('application/json');
    const data = isJson ? await r.json().catch(() => ({})) : null;
    if (!r.ok) {
      const err = new Error((data && data.error) || ('Error ' + r.status));
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const ALLOWED = { editor: ['editor'], tagger: ['editor', 'tagger'], viewer: ['editor', 'tagger', 'viewer'] };

  // The signed-in session, or a trip to the login page (which comes back here).
  async function requireRole(need, page) {
    const status = await api('GET', '/api/status');
    const ok = status.session && ALLOWED[need].includes(status.session.role);
    const open = need === 'viewer' && status.viewerOpen;
    if (!ok && !open) {
      location.replace('/?next=' + encodeURIComponent(page) + '&role=' + need);
      return new Promise(() => {}); // never resolves; we're leaving
    }
    return status;
  }

  async function logout() {
    await api('POST', '/api/logout', '');
    location.href = '/';
  }

  async function loadReport() {
    const r = await fetch('/api/statto', { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Couldn’t load the Statto export (' + r.status + ').');
    return window.StattoStats.reportFromStatto(await r.arrayBuffer());
  }

  async function loadSeason() { return api('GET', '/api/season'); }

  // Every tag on the server, as the report's annotation store + the sequence
  // number to poll for changes after.
  async function loadTags() {
    const j = await api('GET', '/api/tags?since=0');
    const annotations = { version: 1, passes: {}, blocks: {}, points: {} };
    for (const c of j.changes) {
      if (c.data && annotations[c.kind]) annotations[c.kind][c.key] = c.data;
    }
    return { seq: j.seq, annotations };
  }

  // Which game every annotation key belongs to (for importing tags).
  function gameIndex(report) {
    const m = new Map();
    report.games.forEach(g => (g.points || []).forEach(pt => {
      if (pt.uuid) m.set('pt:' + pt.uuid, g.uuid);
      (pt.passes || []).forEach(p => p.uuid && m.set('passes:' + p.uuid, g.uuid));
      (pt.blocks || []).forEach(b => b.uuid && m.set('blocks:' + b.uuid, g.uuid));
    }));
    return (kind, key) => kind === 'points' ? m.get('pt:' + String(key).split('#')[0]) || null : m.get(kind + ':' + key) || null;
  }

  // Send a whole annotation store to the server (e.g. imported from the Mac app).
  async function uploadAnnotations(report, annotations) {
    const gameOf = gameIndex(report);
    const changes = [];
    for (const kind of ['passes', 'blocks', 'points']) {
      for (const [key, data] of Object.entries((annotations && annotations[kind]) || {})) {
        if (data) changes.push({ kind, key, game: gameOf(kind, key), data });
      }
    }
    for (let i = 0; i < changes.length; i += 400) {
      await api('POST', '/api/tags', JSON.stringify({ changes: changes.slice(i, i + 400) }));
    }
    return changes.length;
  }

  // Replace this page with the report page built from `report`, set up by
  // `globals` (window.__STATTO_*__ values the report script reads at start).
  function writeReportPage(report, title, globals) {
    const lit = v => JSON.stringify(v).replace(/</g, '\\u003c');
    let boot = '';
    for (const [k, v] of Object.entries(globals)) boot += 'window.' + k + '=' + lit(v) + ';';
    // One script, id'd so publishing strips it: it must never travel in a file.
    const inject = '<script id="statto-app-bootstrap">' + boot + '<\/script>\n';
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = window.STATTO_REPORT_TEMPLATE
      .replace('__PAGE_TITLE__', () => esc(title))
      .replace('__REPORT_DATA_JSON__', () => JSON.stringify(report).replace(/</g, '\\u003c'))
      .replace('<script id="report-data"', m => inject + m);
    document.open();
    document.write(html);
    document.close();
  }

  function readFile(file, how) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      if (how === 'text') r.readAsText(file); else r.readAsArrayBuffer(file);
    });
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children || [])) if (c != null) e.append(c);
    return e;
  }

  function flash(text, isError) {
    const box = document.getElementById('flash');
    if (!box) { alert(text); return; }
    box.textContent = text;
    box.className = 'msg' + (isError ? ' err' : '');
    box.hidden = false;
  }

  function ago(secs) {
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.round(secs / 60) + ' min ago';
    if (secs < 86400) return Math.round(secs / 3600) + ' h ago';
    return Math.round(secs / 86400) + ' d ago';
  }

  window.Site = { api, requireRole, logout, loadReport, loadSeason, loadTags, uploadAnnotations, writeReportPage, readFile, el, flash, ago };
})();
