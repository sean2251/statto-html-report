// The team site's server: a Cloudflare Worker in front of one D1 database.
//
// Everything a team's site stores lives in that database: the Statto export,
// the season's set-up (tournaments, video links, photos, lines), every video
// tag, who's tagging which game, and the published Team Report. The pages
// themselves (public/) hold no data; they fetch it from /api once signed in.
//
// Three logins, one password each:
//   editor  -- everything (and sets the other two passwords)
//   tagger  -- tags games, claims games; reads what tagging needs
//   viewer  -- reads the published Team Report (or no password at all, if the
//              editor turns the viewer password off)
//
// First run: a brand-new site has no editor password. The sign-in page then
// offers "Set up this site": the site writes a one-time setup code to its own
// logs (Cloudflare dashboard -> the Worker -> Logs, which only the account
// owner can read), and whoever enters that code chooses the editor password.
// (An EDITOR_PASSWORD secret, if one is set on the Worker, also works.)
// Passwords are stored only as salted PBKDF2 hashes and changed from the site.

const SCHEMA_VERSION = 1;
const SESSION_DAYS = 30;
const CHUNK = 900_000;               // D1 caps a value at ~2 MB; store big files in parts
const MAX_UPLOAD = 60 * 1024 * 1024;
const PBKDF2_ITERATIONS = 10_000;    // kept low enough for the Workers free plan's CPU limit;
                                     // brute force is held off by the login rate limits below
const LOGIN_WINDOW_SECS = 15 * 60;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_GLOBAL = 100;
const ROLES = ['editor', 'tagger', 'viewer'];
const ACTIVE_SECS = 5 * 60;          // "tagging now" if they saved within this long

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT,
     created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_failures (ip TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS login_failures_at ON login_failures (at)`,
  `CREATE TABLE IF NOT EXISTS blob_parts (name TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL,
     PRIMARY KEY (name, part))`,
  `CREATE TABLE IF NOT EXISTS blobs (name TEXT PRIMARY KEY, parts INTEGER NOT NULL, size INTEGER NOT NULL,
     content_type TEXT, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS tags (kind TEXT NOT NULL, key TEXT NOT NULL, game TEXT, data TEXT,
     updated_by TEXT, updated_at INTEGER NOT NULL, seq INTEGER NOT NULL, PRIMARY KEY (kind, key))`,
  `CREATE INDEX IF NOT EXISTS tags_seq ON tags (seq)`,
  `CREATE INDEX IF NOT EXISTS tags_game ON tags (game)`,
  `CREATE TABLE IF NOT EXISTS claims (game TEXT PRIMARY KEY, name TEXT, status TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS activity (game TEXT NOT NULL, name TEXT NOT NULL, at INTEGER NOT NULL,
     PRIMARY KEY (game, name))`,
];

const now = () => Math.floor(Date.now() / 1000);
const enc = new TextEncoder();

// ---------- responses ----------
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}
const fail = (message, status = 400, extra = {}) => json({ error: message, ...extra }, status);

class HttpError extends Error {
  constructor(message, status = 400, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

// ---------- schema ----------
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
  await db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', ?)`).bind(String(SCHEMA_VERSION)).run();
  schemaReady = true;
}

async function getSetting(db, key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}
async function setSetting(db, key, value) {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, String(value)).run();
}

// ---------- crypto helpers ----------
function b64(bytes) { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); }
function unb64(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
function randomToken(n = 32) { return b64(crypto.getRandomValues(new Uint8Array(n))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c])); }
async function sha256(text) { return b64(await crypto.subtle.digest('SHA-256', enc.encode(text))); }

async function hashPassword(password, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(bits)}`;
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyPassword(password, stored) {
  const [scheme, , salt] = String(stored).split('$');
  if (scheme !== 'pbkdf2') return false;
  return timingSafeEqual(await hashPassword(password, salt), stored);
}

// ---------- passwords & settings ----------
// A role's password hash; the editor's falls back to the EDITOR_PASSWORD secret
// until one is set from the site.
async function passwordFor(env, role) {
  return await getSetting(env.DB, 'password_' + role);
}

async function siteStatus(env) {
  const db = env.DB;
  const [teamName, viewerOpen, editorHash, taggerHash, viewerHash] = await Promise.all([
    getSetting(db, 'team_name'), getSetting(db, 'viewer_open'),
    passwordFor(env, 'editor'), passwordFor(env, 'tagger'), passwordFor(env, 'viewer'),
  ]);
  return {
    teamName: teamName || null,
    editorReady: !!(editorHash || env.EDITOR_PASSWORD),
    setupNeeded: !(editorHash || env.EDITOR_PASSWORD),
    taggerReady: !!taggerHash,
    viewerOpen: viewerOpen === '1',
    viewerReady: viewerOpen === '1' || !!viewerHash,
  };
}

// ---------- first-run setup ----------
const SETUP_CODE_SECS = 60 * 60;
const SETUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

async function setupNeeded(env) {
  return !((await passwordFor(env, 'editor')) || env.EDITOR_PASSWORD);
}

// Writes the setup code to the Worker's logs (making one if there's no live
// one). The code itself never goes back to the browser.
async function logSetupCode(env) {
  if (!(await setupNeeded(env))) throw new HttpError('This site is already set up.', 409);
  const db = env.DB;
  let code = null;
  const stored = await getSetting(db, 'setup_code');
  if (stored) {
    const [c, expires] = stored.split('|');
    if (Number(expires) > now()) code = c;
  }
  if (!code) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    code = Array.from(bytes, b => SETUP_ALPHABET[b % SETUP_ALPHABET.length]).join('');
    code = code.slice(0, 4) + '-' + code.slice(4);
    await setSetting(db, 'setup_code', code + '|' + (now() + SETUP_CODE_SECS));
  }
  console.log('Statto team site setup code: ' + code + ' (valid for an hour; enter it on the site’s sign-in page)');
  return { ok: true };
}

// Checks the code, sets the editor password, and signs the editor in.
async function completeSetup(request, env) {
  if (!(await setupNeeded(env))) throw new HttpError('This site is already set up. Sign in as the editor.', 409);
  const body = await request.json().catch(() => ({}));
  const db = env.DB;
  const ip = clientIp(request);
  await checkLoginRate(db, ip);
  const stored = await getSetting(db, 'setup_code');
  const [code, expires] = stored ? stored.split('|') : [null, 0];
  const given = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const want = code ? code.replace(/-/g, '') : '';
  if (!code || Number(expires) <= now() || !timingSafeEqual(given, want)) {
    await db.prepare('INSERT INTO login_failures (ip, at) VALUES (?, ?)').bind(ip, now()).run();
    throw new HttpError(code && Number(expires) > now()
      ? 'That setup code isn’t right. Copy it exactly from the Logs.'
      : 'That setup code has expired. Click “Show a setup code” again.', 401);
  }
  checkNewPassword(body.password);
  await setSetting(db, 'password_editor', await hashPassword(body.password));
  await db.prepare("DELETE FROM settings WHERE key = 'setup_code'").run();
  return startSession(request, env, 'editor', null);
}

function checkNewPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new HttpError('Use at least 10 characters for a password.');
  if (pw.length > 200) throw new HttpError('That password is too long.');
}

// ---------- sessions ----------
const COOKIE = 'statto_session';
function cookieHeader(token, maxAge, secure) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function readCookie(request) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(request.headers.get('Cookie') || '');
  return m ? m[1] : null;
}

async function currentSession(request, env) {
  const token = readCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare('SELECT role, name, expires_at FROM sessions WHERE token_hash = ?')
    .bind(await sha256(token)).first();
  if (!row || row.expires_at < now()) return null;
  return { role: row.role, name: row.name || null };
}

// Who may do what. Editors can do everything a tagger or viewer can.
const ALLOWED = {
  editor: ['editor'],
  tagger: ['editor', 'tagger'],
  viewer: ['editor', 'tagger', 'viewer'],
};
async function requireRole(request, env, need) {
  const session = await currentSession(request, env);
  if (need === 'viewer' && !session && (await getSetting(env.DB, 'viewer_open')) === '1') return { role: 'viewer', name: null };
  if (!session) throw new HttpError('Please sign in.', 401);
  if (!ALLOWED[need].includes(session.role)) throw new HttpError('Your login can’t do that.', 403);
  return session;
}

function clientIp(request) { return request.headers.get('CF-Connecting-IP') || 'local'; }

async function login(request, env) {
  const body = await request.json().catch(() => ({}));
  const role = body.role, password = body.password;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
  if (!ROLES.includes(role)) throw new HttpError('Choose which login to use.');
  if (role === 'tagger' && !name) throw new HttpError('Enter your name, so others can see who’s tagging what.');
  const db = env.DB;
  const ip = clientIp(request);
  await checkLoginRate(db, ip);
  let ok = false;
  const stored = await passwordFor(env, role);
  if (stored) ok = await verifyPassword(String(password || ''), stored);
  else if (role === 'editor' && env.EDITOR_PASSWORD) ok = timingSafeEqual(String(password || ''), String(env.EDITOR_PASSWORD));
  else if (role === 'viewer' && (await getSetting(db, 'viewer_open')) === '1') ok = true;
  else throw new HttpError(role === 'editor'
    ? 'This site isn’t set up yet: use “Set up this site” on this page first.'
    : 'The editor hasn’t set this password yet.', 409);
  if (!ok) {
    await db.prepare('INSERT INTO login_failures (ip, at) VALUES (?, ?)').bind(ip, now()).run();
    throw new HttpError('That password isn’t right.', 401);
  }
  return startSession(request, env, role, name || null);
}

async function checkLoginRate(db, ip) {
  await db.prepare('DELETE FROM login_failures WHERE at < ?').bind(now() - LOGIN_WINDOW_SECS).run();
  const [mine, all] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM login_failures WHERE ip = ?').bind(ip).first(),
    db.prepare('SELECT COUNT(*) AS n FROM login_failures').first(),
  ]);
  if (mine.n >= MAX_FAILS_PER_IP || all.n >= MAX_FAILS_GLOBAL) {
    throw new HttpError('Too many wrong passwords. Wait 15 minutes and try again.', 429);
  }
}

async function startSession(request, env, role, name) {
  const db = env.DB;
  const token = randomToken();
  const t = now();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
    db.prepare('INSERT INTO sessions (token_hash, role, name, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await sha256(token), role, name || null, t, t + SESSION_DAYS * 86400),
  ]);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ role, name: name || null }, 200, { 'Set-Cookie': cookieHeader(token, SESSION_DAYS * 86400, secure) });
}

async function logout(request, env) {
  const token = readCookie(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  const secure = new URL(request.url).protocol === 'https:';
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0, secure) });
}

// ---------- blobs (big files, stored in parts) ----------
async function putBlob(db, name, bytes, contentType, by, baseRevision) {
  const meta = await db.prepare('SELECT revision FROM blobs WHERE name = ?').bind(name).first();
  const current = meta ? meta.revision : 0;
  if (baseRevision != null && Number(baseRevision) !== current) {
    throw new HttpError('This was saved from somewhere else in the meantime.', 409, { revision: current });
  }
  const parts = Math.max(1, Math.ceil(bytes.byteLength / CHUNK));
  const stmts = [db.prepare('DELETE FROM blob_parts WHERE name = ?').bind(name)];
  for (let i = 0; i < parts; i++) {
    stmts.push(db.prepare('INSERT INTO blob_parts (name, part, data) VALUES (?, ?, ?)')
      .bind(name, i, bytes.slice(i * CHUNK, (i + 1) * CHUNK)));
  }
  stmts.push(db.prepare(`INSERT INTO blobs (name, parts, size, content_type, revision, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET parts = excluded.parts, size = excluded.size, content_type = excluded.content_type,
        revision = excluded.revision, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(name, parts, bytes.byteLength, contentType, current + 1, now(), by || null));
  await db.batch(stmts); // all-or-nothing
  return current + 1;
}

async function getBlob(db, name) {
  const meta = await db.prepare('SELECT parts, size, content_type, revision, updated_at FROM blobs WHERE name = ?').bind(name).first();
  if (!meta) return null;
  const { results } = await db.prepare('SELECT data FROM blob_parts WHERE name = ? ORDER BY part').bind(name).all();
  const out = new Uint8Array(meta.size);
  let off = 0;
  for (const r of results) { const b = new Uint8Array(r.data); out.set(b, off); off += b.byteLength; }
  return { bytes: out, contentType: meta.content_type, revision: meta.revision, updatedAt: meta.updated_at };
}

async function readBody(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_UPLOAD) throw new HttpError('That file is too large.', 413);
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_UPLOAD) throw new HttpError('That file is too large.', 413);
  return new Uint8Array(buf);
}

function blobResponse(blob, fallbackType) {
  return new Response(blob.bytes, {
    headers: {
      'Content-Type': blob.contentType || fallbackType,
      'Cache-Control': 'no-store',
      'X-Revision': String(blob.revision),
      'X-Updated-At': String(blob.updatedAt),
    },
  });
}

// ---------- tags ----------
const TAG_KINDS = ['passes', 'blocks', 'points'];

async function getTags(env, since) {
  const { results } = await env.DB.prepare(
    'SELECT kind, key, game, data, updated_by, updated_at, seq FROM tags WHERE seq > ? ORDER BY seq').bind(since).all();
  const top = await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM tags').first();
  return {
    seq: top.seq,
    changes: results.map(r => ({ kind: r.kind, key: r.key, game: r.game, data: r.data ? JSON.parse(r.data) : null, by: r.updated_by, at: r.updated_at })),
  };
}

// changes: [{ kind, key, game, data }] -- data replaces that event's tags (null clears them).
async function putTags(env, session, changes) {
  if (!Array.isArray(changes) || !changes.length) return { saved: 0 };
  if (changes.length > 500) throw new HttpError('Too many changes at once.');
  const db = env.DB;
  const t = now();
  const by = session.name || session.role;
  const stmts = [];
  const games = new Set();
  for (const c of changes) {
    if (!c || !TAG_KINDS.includes(c.kind) || typeof c.key !== 'string' || !c.key || c.key.length > 200) {
      throw new HttpError('Bad tag change.');
    }
    const data = c.data == null ? null : JSON.stringify(c.data);
    if (data && data.length > 20_000) throw new HttpError('That tag is too large.');
    const game = typeof c.game === 'string' ? c.game.slice(0, 100) : null;
    if (game) games.add(game);
    stmts.push(db.prepare(`INSERT INTO tags (kind, key, game, data, updated_by, updated_at, seq)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, (SELECT COALESCE(MAX(seq), 0) + 1 FROM tags))
        ON CONFLICT(kind, key) DO UPDATE SET game = COALESCE(excluded.game, tags.game), data = excluded.data,
          updated_by = excluded.updated_by, updated_at = excluded.updated_at, seq = excluded.seq`)
      .bind(c.kind, c.key, game, data, by, t));
  }
  for (const g of games) {
    stmts.push(db.prepare(`INSERT INTO activity (game, name, at) VALUES (?, ?, ?)
        ON CONFLICT(game, name) DO UPDATE SET at = excluded.at`).bind(g, by, t));
  }
  await db.batch(stmts);
  const top = await db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM tags').first();
  return { saved: changes.length, seq: top.seq };
}

// ---------- the tagging hub ----------
async function hub(env) {
  const db = env.DB;
  const t = now();
  const [claims, activity, counts] = await Promise.all([
    db.prepare('SELECT game, name, status, updated_at FROM claims').all(),
    db.prepare('SELECT game, name, at FROM activity WHERE at > ? ORDER BY at DESC').bind(t - 7 * 86400).all(),
    db.prepare(`SELECT game, COUNT(*) AS n FROM tags WHERE data IS NOT NULL AND kind IN ('passes', 'blocks') GROUP BY game`).all(),
  ]);
  const games = {};
  const g = id => (games[id] = games[id] || { claim: null, tagged: 0, active: [], recent: [] });
  for (const c of claims.results) g(c.game).claim = { name: c.name, status: c.status, at: c.updated_at };
  for (const c of counts.results) if (c.game) g(c.game).tagged = c.n;
  for (const a of activity.results) {
    const entry = g(a.game);
    (t - a.at <= ACTIVE_SECS ? entry.active : entry.recent).push({ name: a.name, at: a.at });
  }
  return { now: t, games };
}

async function setClaim(env, session, body) {
  const game = typeof body.game === 'string' ? body.game.slice(0, 100) : '';
  if (!game) throw new HttpError('Which game?');
  const db = env.DB;
  const by = session.name || session.role;
  const action = body.action;
  if (action === 'touch') {
    // Opened the game: show them as working on it (doesn't claim it).
    await db.prepare(`INSERT INTO activity (game, name, at) VALUES (?, ?, ?)
        ON CONFLICT(game, name) DO UPDATE SET at = excluded.at`).bind(game, by, now()).run();
  } else if (action === 'release') {
    await db.prepare('DELETE FROM claims WHERE game = ?').bind(game).run();
  } else if (action === 'claim' || action === 'done' || action === 'reopen') {
    // An editor can assign a game to anyone; taggers claim it for themselves.
    const name = session.role === 'editor' && typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : by;
    const status = action === 'done' ? 'done' : 'tagging';
    await db.prepare(`INSERT INTO claims (game, name, status, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(game) DO UPDATE SET name = excluded.name, status = excluded.status, updated_at = excluded.updated_at`)
      .bind(game, name, status, now()).run();
  } else {
    throw new HttpError('Unknown action.');
  }
  return hub(env);
}

// ---------- settings (editor) ----------
async function updateSettings(env, body) {
  const db = env.DB;
  if (body.teamName !== undefined) {
    const n = String(body.teamName || '').trim().slice(0, 80);
    if (n) await setSetting(db, 'team_name', n);
  }
  if (body.viewerOpen !== undefined) await setSetting(db, 'viewer_open', body.viewerOpen ? '1' : '0');
  if (body.passwords && typeof body.passwords === 'object') {
    for (const role of ROLES) {
      const pw = body.passwords[role];
      if (pw === undefined || pw === null || pw === '') continue;
      checkNewPassword(pw);
      await setSetting(db, 'password_' + role, await hashPassword(pw));
      // A changed password signs everyone using it out.
      await db.prepare('DELETE FROM sessions WHERE role = ?').bind(role).run();
    }
  }
  return siteStatus(env);
}

// ---------- backup / restore (editor) ----------
async function backup(env) {
  const db = env.DB;
  const out = { statto: 'team-site-backup', version: 1, exportedAt: new Date().toISOString(), blobs: {}, tags: [], claims: [] };
  const { results: names } = await db.prepare('SELECT name FROM blobs').all();
  for (const { name } of names) {
    const b = await getBlob(db, name);
    out.blobs[name] = { contentType: b.contentType, revision: b.revision, data: b64(b.bytes) };
  }
  out.tags = (await db.prepare('SELECT kind, key, game, data, updated_by, updated_at FROM tags WHERE data IS NOT NULL').all()).results;
  out.claims = (await db.prepare('SELECT game, name, status, updated_at FROM claims').all()).results;
  out.teamName = await getSetting(db, 'team_name');
  return out;
}

async function restore(env, session, body) {
  if (!body || body.statto !== 'team-site-backup') throw new HttpError('That isn’t a team site backup.');
  const db = env.DB;
  for (const [name, b] of Object.entries(body.blobs || {})) {
    if (!['statto', 'season', 'report'].includes(name)) continue;
    await putBlob(db, name, unb64(b.data), b.contentType, 'restore', null);
  }
  const tags = Array.isArray(body.tags) ? body.tags : [];
  for (let i = 0; i < tags.length; i += 200) {
    await putTags(env, { name: 'restore', role: 'editor' }, tags.slice(i, i + 200).map(r => ({
      kind: r.kind, key: r.key, game: r.game, data: r.data ? JSON.parse(r.data) : null,
    })));
  }
  if (body.teamName) await setSetting(db, 'team_name', body.teamName);
  return { ok: true, blobs: Object.keys(body.blobs || {}).length, tags: tags.length };
}

// ---------- routing ----------
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return new URL(origin).host === new URL(request.url).host;
}

async function handleApi(request, env, url) {
  await ensureSchema(env.DB);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(request)) throw new HttpError('Forbidden.', 403);

  if (path === '/api/status' && method === 'GET') {
    const status = await siteStatus(env);
    const session = await currentSession(request, env);
    return json({ ...status, session });
  }
  if (path === '/api/login' && method === 'POST') return login(request, env);
  if (path === '/api/setup/code' && method === 'POST') return json(await logSetupCode(env));
  if (path === '/api/setup' && method === 'POST') return completeSetup(request, env);
  if (path === '/api/logout' && method === 'POST') return logout(request, env);

  // The Statto export: the editor replaces it; taggers read it to build the tagging pages.
  if (path === '/api/statto') {
    if (method === 'GET') {
      await requireRole(request, env, 'tagger');
      const blob = await getBlob(env.DB, 'statto');
      return blob ? blobResponse(blob, 'application/octet-stream') : fail('No Statto export yet.', 404);
    }
    if (method === 'PUT') {
      const s = await requireRole(request, env, 'editor');
      const bytes = await readBody(request);
      if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new HttpError('That file isn’t a Statto export (.statto).');
      const revision = await putBlob(env.DB, 'statto', bytes, 'application/octet-stream', s.name || s.role, null);
      const teamName = url.searchParams.get('team');
      if (teamName && !(await getSetting(env.DB, 'team_name'))) await setSetting(env.DB, 'team_name', teamName.slice(0, 80));
      return json({ revision });
    }
  }

  // The season's set-up (tournaments, video links, photos, lines): one JSON
  // bundle with a revision number, so two editor windows can't silently
  // overwrite each other.
  if (path === '/api/season') {
    if (method === 'GET') {
      await requireRole(request, env, 'tagger');
      const blob = await getBlob(env.DB, 'season');
      if (!blob) return json({ revision: 0, data: null });
      return json({ revision: blob.revision, data: JSON.parse(new TextDecoder().decode(blob.bytes)) });
    }
    if (method === 'PUT') {
      const s = await requireRole(request, env, 'editor');
      const bytes = await readBody(request);
      let parsed;
      try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw new HttpError('That isn’t valid JSON.'); }
      if (!parsed || parsed.statto !== 'custom-data') throw new HttpError('That isn’t a season data bundle.');
      delete parsed.annotations; // tags live in their own table
      const rev = url.searchParams.get('force') === '1' ? null : url.searchParams.get('rev');
      const revision = await putBlob(env.DB, 'season', enc.encode(JSON.stringify(parsed)), 'application/json', s.name || s.role, rev);
      return json({ revision });
    }
  }

  if (path === '/api/tags') {
    if (method === 'GET') {
      await requireRole(request, env, 'tagger');
      return json(await getTags(env, Number(url.searchParams.get('since') || 0)));
    }
    if (method === 'POST') {
      const s = await requireRole(request, env, 'tagger');
      const body = await request.json().catch(() => null);
      return json(await putTags(env, s, body && body.changes));
    }
  }

  if (path === '/api/hub' && method === 'GET') { await requireRole(request, env, 'tagger'); return json(await hub(env)); }
  if (path === '/api/claims' && method === 'POST') {
    const s = await requireRole(request, env, 'tagger');
    return json(await setClaim(env, s, await request.json().catch(() => ({}))));
  }

  // The published Team Report.
  if (path === '/api/report') {
    if (method === 'GET') {
      await requireRole(request, env, 'viewer');
      const blob = await getBlob(env.DB, 'report');
      return blob ? blobResponse(blob, 'text/plain; charset=utf-8') : fail('No Team Report has been published yet.', 404);
    }
    if (method === 'PUT') {
      const s = await requireRole(request, env, 'editor');
      const revision = await putBlob(env.DB, 'report', await readBody(request), 'text/plain; charset=utf-8', s.name || s.role, null);
      return json({ revision, publishedAt: now() });
    }
  }

  if (path === '/api/settings') {
    if (method === 'GET') { await requireRole(request, env, 'editor'); return json(await siteStatus(env)); }
    if (method === 'POST') {
      await requireRole(request, env, 'editor');
      return json(await updateSettings(env, await request.json().catch(() => ({}))));
    }
  }
  if (path === '/api/backup' && method === 'GET') {
    await requireRole(request, env, 'editor');
    return json(await backup(env), 200, { 'Content-Disposition': 'attachment; filename="team-site-backup.json"' });
  }
  if (path === '/api/restore' && method === 'POST') {
    const s = await requireRole(request, env, 'editor');
    return json(await restore(env, s, await request.json().catch(() => null)));
  }
  throw new HttpError('Not found.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        if (e instanceof HttpError) return fail(e.message, e.status, e.extra);
        console.error(e);
        return fail('Something went wrong on the server.', 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
