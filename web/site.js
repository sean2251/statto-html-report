// Shared code for the team site's pages (sign-in, season setup, tagging hub, viewer,
// settings). Defines window.Site. No dependencies; the stats engine
// (assets/stats.js) and the report page template (assets/report-template.js)
// are loaded by the pages that need them.
(function () {
  'use strict';

  // Every team's pages live under its own address, /t/<slug>/ (the same files
  // for each team); BASE is that prefix, or '' on the site's own pages (the
  // first sign-in, "Upload new team").
  const BASE = (location.pathname.match(/^\/t\/[a-z0-9-]+/) || [''])[0];

  // A call to this team's API (or the site's, on the site's own pages).
  function api(method, path, body, contentType) { return call(method, BASE + path, body, contentType); }
  // A call to the site's own API (setup, the admin login, the list of teams).
  function siteApi(method, path, body, contentType) { return call(method, path, body, contentType); }

  async function call(method, path, body, contentType) {
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
  // (Comes back to this page after signing in.)
  async function requireRole(need) {
    const status = await api('GET', '/api/status');
    const ok = status.session && ALLOWED[need].includes(status.session.role);
    const open = need === 'viewer' && status.viewerOpen;
    if (!ok && !open) {
      location.replace(BASE + '/?next=' + encodeURIComponent(location.pathname + location.search) + '&role=' + need);
      return new Promise(() => {}); // never resolves; we're leaving
    }
    return status;
  }

  async function logout() {
    await api('POST', '/api/logout', '');
    location.href = BASE + '/';
  }

  async function loadReport() {
    const r = await fetch(BASE + '/api/statto', { cache: 'no-store' });
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

  // Send a whole annotation store to a team (e.g. brought in from the old Mac app).
  // base: that team's address, if not this page's.
  async function uploadAnnotations(report, annotations, base) {
    const gameOf = gameIndex(report);
    const changes = [];
    for (const kind of ['passes', 'blocks', 'points']) {
      for (const [key, data] of Object.entries((annotations && annotations[kind]) || {})) {
        if (data) changes.push({ kind, key, game: gameOf(kind, key), data });
      }
    }
    for (let i = 0; i < changes.length; i += 400) {
      await call('POST', (base == null ? BASE : base) + '/api/tags', JSON.stringify({ changes: changes.slice(i, i + 400) }));
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

  // ---- the top bar every signed-in page shares ----
  // The same bar is drawn inside report pages (Season setup, tagging pages,
  // the Team Report) by report.js, from barConfig() handed over as
  // window.__STATTO_SITE_BAR__ -- keep the two in step.
  const ROLE_LABEL = { editor: 'Admin', tagger: 'Tagger', viewer: 'Team Report viewer' };
  const BAR_LINKS = {
    editor: [['home', '/', 'Home'], ['editor', '/editor', 'Season setup'], ['tag', '/tag', 'Tagging hub'],
      ['view', '/view', 'Team Report'], ['settings', '/settings', 'Site settings']],
    tagger: [['tag', '/tag', 'Tagging hub'], ['view', '/view', 'Team Report']],
    viewer: [['view', '/view', 'Team Report']],
  };
  const PAGE_PATH = { home: '/', editor: '/editor', tag: '/tag', view: '/view', settings: '/settings' };
  // status: /api/status (a team's, or the site's on the site's own pages).
  function barConfig(status, current) {
    const s = status.session;
    const here = status.team ? status.team.slug : null;
    const base = here ? '/t/' + here : '';
    const links = s ? BAR_LINKS[s.role] : (status.viewerOpen ? BAR_LINKS.viewer : []);
    return {
      team: status.teamName || 'All teams',
      base,
      home: base + '/',
      role: s ? s.role : null,
      name: s ? (s.name || ROLE_LABEL[s.role]) : null,
      roleLabel: s ? ROLE_LABEL[s.role] : null,
      links: here ? links.map(([key, href, label]) => [key, base + href, label]) : [],
      current,
      // The admin's team switcher: every team, each opening the same page there.
      teams: status.teams ? status.teams.map(t => ({ name: t.name, slug: t.slug, current: t.slug === here,
        href: '/t/' + t.slug + (PAGE_PATH[current] || '/') })) : null,
      newTeam: status.teams ? '/new' : null,
      // Other teams this browser is signed in to (taggers and viewers).
      others: (status.signedIn || []).map(t => ({ name: t.name, href: '/t/' + t.slug + '/' + (t.role === 'viewer' ? 'view' : 'tag') })),
    };
  }
  // A dropdown in the bar: <details> with a menu; closes on any click outside.
  function dropdown(cls, summary, title, menu) {
    const d = el('details', { class: cls }, [el('summary', { title }, summary), el('div', { class: 'site-menu' }, menu)]);
    document.addEventListener('click', e => { if (!d.contains(e.target)) d.open = false; });
    return d;
  }
  function renderBar(status, current) {
    const cfg = barConfig(status, current);
    const links = cfg.links.map(([key, href, label]) =>
      el('a', { href, class: 'site-link' + (key === current ? ' active' : ''), 'aria-current': key === current ? 'page' : false }, label));
    let account;
    if (cfg.role) {
      const who = cfg.name === cfg.roleLabel ? cfg.roleLabel : cfg.name + ' · ' + cfg.roleLabel;
      const menu = [el('div', { class: 'dim' }, 'Signed in as ' + who)];
      if (cfg.others.length) {
        menu.push(el('div', { class: 'dim' }, 'Also signed in to:'),
          el('div', { class: 'site-menu-list' }, cfg.others.map(t => el('a', { href: t.href, class: 'site-menu-item' }, t.name))));
      }
      menu.push(el('button', { type: 'button', onclick: logout }, 'Sign out'));
      account = dropdown('site-account', [cfg.name,
        cfg.name === cfg.roleLabel ? null : el('span', { class: 'role' }, '· ' + cfg.roleLabel),
        el('span', { class: 'caret', 'aria-hidden': 'true' }, '▾')], 'Signed in as ' + who, menu);
    } else {
      account = el('a', { href: cfg.home, class: 'site-link' }, 'Sign in');
    }
    let brand;
    if (cfg.teams) {
      brand = dropdown('site-teams', [el('span', { class: 'site-brand' }, cfg.team), el('span', { class: 'caret', 'aria-hidden': 'true' }, '▾')],
        'Switch team', [
          el('div', { class: 'site-menu-list' }, cfg.teams.map(t => el('a', {
            href: t.href, class: 'site-menu-item' + (t.current ? ' current' : ''), 'aria-current': t.current ? 'true' : false,
          }, [t.current ? '✓ ' : '', t.name]))),
          el('a', { href: cfg.newTeam, class: 'btn site-new-team' }, '+ Upload new team'),
        ]);
    } else {
      brand = el('a', { href: cfg.home, class: 'site-brand' }, cfg.team);
    }
    const bar = el('header', { class: 'site-bar' }, [
      brand,
      el('nav', { class: 'site-links', 'aria-label': 'Site' }, links),
      account,
    ]);
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  window.Site = { base: BASE, api, siteApi, requireRole, logout, loadReport, loadSeason, loadTags, uploadAnnotations, writeReportPage, readFile, el, flash, ago, barConfig, renderBar, ROLE_LABEL };
})();
