// The team site's server: a Cloudflare Worker in front of one D1 database.
//
// One site holds any number of teams: each Statto export the admin uploads
// becomes its own, completely separate team (say "RAMP 2026" and "RAMP 2025"),
// with its own address (/t/<slug>/), Statto export, set-up, tags, tagging hub,
// Team Report and tagger/viewer passwords. The pages themselves (public/) hold
// no data; they fetch it from /t/<slug>/api once signed in.
//
// Logins, one password each:
//   editor  -- the admin: everything, on every team (one password for the
//              whole site). "editor" is its internal name; people see "Admin".
//   tagger  -- per team: tags that team's games, claims games
//   viewer  -- per team: reads that team's published Team Report (or no
//              password at all, if the admin turns it off for that team)
// A browser can be signed in to several teams at once (one cookie per team);
// a team's pages and API only ever see that team.
//
// First run: a brand-new site has no admin password. The sign-in page then
// offers "Set up this site": the site writes a one-time setup code to its own
// logs (Cloudflare dashboard -> the Worker -> Logs, which only the account
// owner can read), and whoever enters that code chooses the admin password.
// A forgotten admin password is reset the same way, with its own code.
// (An EDITOR_PASSWORD secret, if one is set on the Worker, also works.)
// Passwords are stored only as salted PBKDF2 hashes and changed from the site.
//
// The old single-team layout (schema version 1) is converted on first use:
// its data becomes the first team, and the old addresses (/, /tag, /view, ...)
// redirect to the site's main team, so links already shared keep working.

const SCHEMA_VERSION = 2;
const SESSION_DAYS = 30;
const CHUNK = 900_000;               // D1 caps a value at ~2 MB; store big files in parts
const MAX_UPLOAD = 60 * 1024 * 1024;
const PBKDF2_ITERATIONS = 10_000;    // kept low enough for the Workers free plan's CPU limit;
                                     // brute force is held off by the login rate limits below
const LOGIN_WINDOW_SECS = 15 * 60;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_GLOBAL = 100;
const ROLES = ['editor', 'tagger', 'viewer'];
const TEAM_ROLES = ['tagger', 'viewer'];
// What people see for each role. ("editor" is the admin login's internal name:
// it's stored in sessions and as password_editor, so it stays.)
const ROLE_LABEL = { editor: 'Admin', tagger: 'Tagger', viewer: 'Viewer' };
const whoIs = session => session.name || ROLE_LABEL[session.role] || session.role;
const ACTIVE_SECS = 5 * 60;          // "tagging now" if they saved within this long
const MAX_TEAMS = 100;

const SCHEMA = [
  // Site-wide: the admin password, setup/reset codes, the main team.
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  // team is NULL for the admin (every team), else the team the login is for.
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT,
     created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, team INTEGER)`,
  `CREATE TABLE IF NOT EXISTS login_failures (ip TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS login_failures_at ON login_failures (at)`,
  // Big files, named "<team id>/statto", "<team id>/season", "<team id>/report".
  `CREATE TABLE IF NOT EXISTS blob_parts (name TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL,
     PRIMARY KEY (name, part))`,
  `CREATE TABLE IF NOT EXISTS blobs (name TEXT PRIMARY KEY, parts INTEGER NOT NULL, size INTEGER NOT NULL,
     content_type TEXT, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  // Per team: password_tagger, password_viewer, viewer_open, game_count.
  `CREATE TABLE IF NOT EXISTS team_settings (team INTEGER NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
     PRIMARY KEY (team, key))`,
  `CREATE TABLE IF NOT EXISTS team_tags (team INTEGER NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, game TEXT,
     data TEXT, updated_by TEXT, updated_at INTEGER NOT NULL, seq INTEGER NOT NULL, PRIMARY KEY (team, kind, key))`,
  `CREATE INDEX IF NOT EXISTS team_tags_seq ON team_tags (team, seq)`,
  `CREATE INDEX IF NOT EXISTS team_tags_game ON team_tags (team, game)`,
  `CREATE TABLE IF NOT EXISTS team_claims (team INTEGER NOT NULL, game TEXT NOT NULL, name TEXT, status TEXT NOT NULL,
     updated_at INTEGER NOT NULL, PRIMARY KEY (team, game))`,
  `CREATE TABLE IF NOT EXISTS team_activity (team INTEGER NOT NULL, game TEXT NOT NULL, name TEXT NOT NULL,
     at INTEGER NOT NULL, PRIMARY KEY (team, game, name))`,
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
  const version = await getSetting(db, 'schema_version');
  if (version === '1') await migrateFromOneTeam(db);
  else if (version == null) await setSetting(db, 'schema_version', SCHEMA_VERSION);
  schemaReady = true;
}

// Schema 1 held one team in tables without a team column. Its data becomes
// team 1 (if there is any), all in one transaction. Every step is safe to run
// twice, in case two first requests arrive together.
const OLD_TEAM_SETTINGS = ['viewer_open', 'game_count', 'password_tagger', 'password_viewer'];
async function migrateFromOneTeam(db) {
  try { await db.prepare('ALTER TABLE sessions ADD COLUMN team INTEGER').run(); }
  catch (e) { if (!/duplicate column/i.test(String(e && e.message))) throw e; }
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS tags (kind TEXT NOT NULL, key TEXT NOT NULL, game TEXT, data TEXT,
      updated_by TEXT, updated_at INTEGER NOT NULL, seq INTEGER NOT NULL, PRIMARY KEY (kind, key))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS claims (game TEXT PRIMARY KEY, name TEXT, status TEXT NOT NULL, updated_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS activity (game TEXT NOT NULL, name TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (game, name))`),
  ]);
  const has = await db.prepare(`SELECT
      (SELECT COUNT(*) FROM blobs WHERE name IN ('statto', 'season', 'report')) +
      (SELECT COUNT(*) FROM tags) +
      (SELECT COUNT(*) FROM settings WHERE key IN ('team_name', 'password_tagger', 'password_viewer')) AS n`).first();
  const keys = OLD_TEAM_SETTINGS.map(k => `'${k}'`).join(', ');
  const stmts = [];
  if (has.n) {
    const name = ((await getSetting(db, 'team_name')) || 'Team').slice(0, 80);
    stmts.push(
      db.prepare('INSERT OR IGNORE INTO teams (id, slug, name, created_at) VALUES (1, ?, ?, ?)').bind(slugify(name), name, now()),
      db.prepare(`INSERT OR IGNORE INTO team_settings (team, key, value) SELECT 1, key, value FROM settings WHERE key IN (${keys})`),
      db.prepare(`INSERT OR IGNORE INTO team_tags (team, kind, key, game, data, updated_by, updated_at, seq)
        SELECT 1, kind, key, game, data, updated_by, updated_at, seq FROM tags`),
      db.prepare(`INSERT OR IGNORE INTO team_claims (team, game, name, status, updated_at) SELECT 1, game, name, status, updated_at FROM claims`),
      db.prepare(`INSERT OR IGNORE INTO team_activity (team, game, name, at) SELECT 1, game, name, at FROM activity`),
      db.prepare(`UPDATE blob_parts SET name = '1/' || name WHERE name IN ('statto', 'season', 'report')`),
      db.prepare(`UPDATE blobs SET name = '1/' || name WHERE name IN ('statto', 'season', 'report')`),
      // Signed-in taggers and viewers stay signed in, to team 1; admins (editor) stay admins.
      db.prepare(`UPDATE sessions SET team = 1 WHERE role IN ('tagger', 'viewer') AND team IS NULL`),
    );
  } else {
    stmts.push(db.prepare(`DELETE FROM sessions WHERE role IN ('tagger', 'viewer') AND team IS NULL`));
  }
  stmts.push(
    db.prepare(`DELETE FROM settings WHERE key IN ('team_name', ${keys})`),
    db.prepare('DROP TABLE IF EXISTS tags'),
    db.prepare('DROP TABLE IF EXISTS claims'),
    db.prepare('DROP TABLE IF EXISTS activity'),
    db.prepare(`UPDATE settings SET value = ? WHERE key = 'schema_version'`).bind(String(SCHEMA_VERSION)),
  );
  await db.batch(stmts); // all-or-nothing
}

async function getSetting(db, key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}
async function setSetting(db, key, value) {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, String(value)).run();
}
async function getTeamSetting(db, team, key) {
  const row = await db.prepare('SELECT value FROM team_settings WHERE team = ? AND key = ?').bind(team.id, key).first();
  return row ? row.value : null;
}
async function setTeamSetting(db, team, key, value) {
  await db.prepare(`INSERT INTO team_settings (team, key, value) VALUES (?, ?, ?)
      ON CONFLICT(team, key) DO UPDATE SET value = excluded.value`).bind(team.id, key, String(value)).run();
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

// ---------- teams ----------
function slugify(name) {
  return String(name || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'team';
}
const teamRow = r => r && { id: r.id, slug: r.slug, name: r.name, createdAt: r.created_at };

async function teamBySlug(db, slug) {
  return teamRow(await db.prepare('SELECT id, slug, name, created_at FROM teams WHERE slug = ?').bind(slug).first());
}
async function listTeams(db) {
  const { results } = await db.prepare('SELECT id, slug, name, created_at FROM teams ORDER BY id').all();
  const main = await mainTeamId(db, results);
  return results.map(r => ({ ...teamRow(r), main: r.id === main }));
}
// The team the site's plain address (and the old one-team addresses) open:
// the one the admin chose, else the first.
async function mainTeamId(db, rows) {
  const chosen = Number(await getSetting(db, 'main_team'));
  if (rows.some(r => r.id === chosen)) return chosen;
  return rows.length ? rows[0].id : null;
}
async function mainTeam(db) {
  const { results } = await db.prepare('SELECT id, slug, name, created_at FROM teams ORDER BY id').all();
  const id = await mainTeamId(db, results);
  return teamRow(results.find(r => r.id === id));
}

async function createTeam(request, env, url, admin) {
  const db = env.DB;
  const name = String(url.searchParams.get('name') || '').trim().slice(0, 80);
  if (!name) throw new HttpError('Give the team a name.');
  const bytes = await readBody(request);
  checkStatto(bytes);
  const count = await db.prepare('SELECT COUNT(*) AS n FROM teams').first();
  if (count.n >= MAX_TEAMS) throw new HttpError('This site already has ' + MAX_TEAMS + ' teams. Delete one first.');
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await teamBySlug(db, slug); i++) slug = (base.slice(0, 36) + '-' + i);
  await db.prepare('INSERT INTO teams (slug, name, created_at) VALUES (?, ?, ?)').bind(slug, name, now()).run();
  const team = await teamBySlug(db, slug);
  await putBlob(db, blobName(team, 'statto'), bytes, 'application/octet-stream', whoIs(admin), null);
  const games = Number(url.searchParams.get('games'));
  if (Number.isInteger(games) && games >= 0) await setTeamSetting(db, team, 'game_count', games);
  return { slug, name, id: team.id };
}

// Everything a team has, gone. (The admin types the team's name to confirm.)
async function deleteTeam(db, team) {
  const id = team.id;
  await db.batch([
    db.prepare('DELETE FROM team_tags WHERE team = ?').bind(id),
    db.prepare('DELETE FROM team_claims WHERE team = ?').bind(id),
    db.prepare('DELETE FROM team_activity WHERE team = ?').bind(id),
    db.prepare('DELETE FROM team_settings WHERE team = ?').bind(id),
    db.prepare('DELETE FROM sessions WHERE team = ?').bind(id),
    db.prepare("DELETE FROM blob_parts WHERE name LIKE ? || '/%'").bind(String(id)),
    db.prepare("DELETE FROM blobs WHERE name LIKE ? || '/%'").bind(String(id)),
    db.prepare('DELETE FROM teams WHERE id = ?').bind(id),
  ]);
}

async function changeTeam(env, slug, body) {
  const db = env.DB;
  const team = await teamBySlug(db, slug);
  if (!team) throw new HttpError('There’s no team at that address.', 404);
  if (body.action === 'main') {
    await setSetting(db, 'main_team', team.id);
  } else if (body.action === 'delete') {
    if (String(body.confirm || '').trim() !== team.name) throw new HttpError('Type the team’s name exactly to delete it.');
    await deleteTeam(db, team);
  } else {
    throw new HttpError('Unknown action.');
  }
  return { teams: await listTeams(db) };
}

// ---------- passwords & settings ----------
async function adminPasswordHash(env) { return getSetting(env.DB, 'password_editor'); }
async function setupNeeded(env) { return !((await adminPasswordHash(env)) || env.EDITOR_PASSWORD); }

async function siteStatus(env) {
  const needed = await setupNeeded(env);
  return { editorReady: !needed, setupNeeded: needed };
}

async function teamStatus(env, team) {
  const db = env.DB;
  const [site, viewerOpen, taggerHash, viewerHash] = await Promise.all([
    siteStatus(env), getTeamSetting(db, team, 'viewer_open'),
    getTeamSetting(db, team, 'password_tagger'), getTeamSetting(db, team, 'password_viewer'),
  ]);
  return {
    ...site,
    team: { slug: team.slug, name: team.name },
    teamName: team.name,
    taggerReady: !!taggerHash,
    viewerOpen: viewerOpen === '1',
    viewerReady: viewerOpen === '1' || !!viewerHash,
  };
}

// ---------- one-time codes in the Worker's logs: first-run setup & password reset ----------
// Both prove "this is the person who runs the site": the code is written only to
// the Worker's own logs (Cloudflare dashboard -> the Worker -> Observability),
// which only the Cloudflare account can read; it never goes back to a browser.
// Codes last an hour, wrong ones count toward the login rate limits, and
// setup and reset use separate codes.
const LOG_CODE_SECS = 60 * 60;
const LOG_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const LOG_CODES = {
  setup: { key: 'setup_code', label: 'setup code', button: 'Show a setup code' },
  reset: { key: 'reset_code', label: 'password reset code', button: 'Show a reset code' },
};

// Writes the code to the logs, reusing a live one so repeated clicks don't
// invalidate a code someone is already copying.
async function logCode(env, kind) {
  const { key, label } = LOG_CODES[kind];
  const db = env.DB;
  let code = null;
  const stored = await getSetting(db, key);
  if (stored) {
    const [c, expires] = stored.split('|');
    if (Number(expires) > now()) code = c;
  }
  if (!code) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    code = Array.from(bytes, b => LOG_CODE_ALPHABET[b % LOG_CODE_ALPHABET.length]).join('');
    code = code.slice(0, 4) + '-' + code.slice(4);
    await setSetting(db, key, code + '|' + (now() + LOG_CODE_SECS));
  }
  console.log('Statto team site ' + label + ': ' + code + ' (valid for an hour; enter it on the site’s sign-in page)');
  return { ok: true };
}

// Checks a code (case- and dash-insensitive) and uses it up. Throws if wrong.
async function redeemCode(request, env, kind, body) {
  const { key, label, button } = LOG_CODES[kind];
  const db = env.DB;
  const ip = clientIp(request);
  await checkLoginRate(db, ip);
  const stored = await getSetting(db, key);
  const [code, expires] = stored ? stored.split('|') : [null, 0];
  const given = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const want = code ? code.replace(/-/g, '') : '';
  if (!code || Number(expires) <= now() || !timingSafeEqual(given, want)) {
    await db.prepare('INSERT INTO login_failures (ip, at) VALUES (?, ?)').bind(ip, now()).run();
    throw new HttpError(code && Number(expires) > now()
      ? 'That ' + label + ' isn’t right. Copy it exactly from the logs.'
      : 'That ' + label + ' has expired or hasn’t been made yet. Click “' + button + '” first.', 401);
  }
  checkNewPassword(body.password);
  await db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
}

async function logSetupCode(env) {
  if (!(await setupNeeded(env))) throw new HttpError('This site is already set up.', 409);
  return logCode(env, 'setup');
}

// First run: the code sets the first admin password and signs them in.
async function completeSetup(request, env) {
  if (!(await setupNeeded(env))) throw new HttpError('This site is already set up. Sign in instead.', 409);
  const body = await request.json().catch(() => ({}));
  await redeemCode(request, env, 'setup', body);
  await setSetting(env.DB, 'password_editor', await hashPassword(body.password));
  return startSession(request, env, 'editor', null, null);
}

async function logResetCode(env) {
  if (await setupNeeded(env)) throw new HttpError('This site isn’t set up yet: use “Set up this site” instead.', 409);
  return logCode(env, 'reset');
}

// Forgotten admin password: the code sets a new one, signs out everyone using
// the old one, and signs this person in.
async function completeReset(request, env) {
  if (await setupNeeded(env)) throw new HttpError('This site isn’t set up yet: use “Set up this site” instead.', 409);
  const body = await request.json().catch(() => ({}));
  await redeemCode(request, env, 'reset', body);
  await setAdminPassword(env.DB, body.password);
  return startSession(request, env, 'editor', null, null);
}

async function setAdminPassword(db, password) {
  checkNewPassword(password);
  await setSetting(db, 'password_editor', await hashPassword(password));
  await db.prepare("DELETE FROM sessions WHERE role = 'editor'").run();
}

function checkNewPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new HttpError('Use at least 10 characters for a password.');
  if (pw.length > 200) throw new HttpError('That password is too long.');
}

// ---------- sessions ----------
// The admin's session is in statto_session; each team's tagger or viewer
// session in its own statto_t<team id>, so one browser can hold several.
// (Before teams, everyone's session was in statto_session; those carried
// over, so a statto_session can also hold a team session.)
const ADMIN_COOKIE = 'statto_session';
const teamCookie = id => 'statto_t' + id;
function cookieHeader(name, token, maxAge, secure) {
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function readCookies(request) {
  const out = [];
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const m = /^\s*(statto_session|statto_t\d+)=([^;\s]+)/.exec(part);
    if (m) out.push({ cookie: m[1], token: m[2] });
  }
  return out.slice(0, 40);
}

// Every live session this browser holds: [{ role, name, team, cookie, hash }].
async function allSessions(request, env) {
  const cookies = readCookies(request);
  if (!cookies.length) return [];
  const hashes = await Promise.all(cookies.map(c => sha256(c.token)));
  const { results } = await env.DB.prepare(
    `SELECT token_hash, role, name, team, expires_at FROM sessions WHERE token_hash IN (${hashes.map(() => '?').join(', ')})`)
    .bind(...hashes).all();
  const t = now();
  return results.filter(r => r.expires_at >= t).map(r => ({
    role: r.role, name: r.name || null, team: r.team == null ? null : Number(r.team),
    cookie: cookies[hashes.indexOf(r.token_hash)].cookie, hash: r.token_hash,
  }));
}
const adminOf = list => list.find(s => s.role === 'editor' && s.team == null) || null;
const sessionForTeam = (list, team) => adminOf(list) || list.find(s => s.team === team.id && TEAM_ROLES.includes(s.role)) || null;
const publicSession = s => s && { role: s.role, name: s.name };

// Who may do what. The admin can do everything a tagger or viewer can.
const ALLOWED = {
  editor: ['editor'],
  tagger: ['editor', 'tagger'],
  viewer: ['editor', 'tagger', 'viewer'],
};
async function requireRole(request, env, team, need) {
  const session = sessionForTeam(await allSessions(request, env), team);
  if (need === 'viewer' && !session && (await getTeamSetting(env.DB, team, 'viewer_open')) === '1') return { role: 'viewer', name: null };
  if (!session) throw new HttpError('Please sign in.', 401);
  if (!ALLOWED[need].includes(session.role)) throw new HttpError('Your login can’t do that.', 403);
  return session;
}
async function requireAdmin(request, env) {
  const admin = adminOf(await allSessions(request, env));
  if (!admin) throw new HttpError('Please sign in as the admin.', 401);
  return admin;
}

function clientIp(request) { return request.headers.get('CF-Connecting-IP') || 'local'; }

// Signing in, on a team's page (any login) or the site's own page (admin only).
async function login(request, env, team) {
  const body = await request.json().catch(() => ({}));
  const role = body.role, password = String(body.password || '');
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
  if (!ROLES.includes(role) || (!team && role !== 'editor')) throw new HttpError('Choose which login to use.');
  if (role === 'tagger' && !name) throw new HttpError('Enter your name, so others can see who’s tagging what.');
  const db = env.DB;
  const ip = clientIp(request);
  await checkLoginRate(db, ip);
  let ok = false;
  if (role === 'editor') {
    const stored = await adminPasswordHash(env);
    if (stored) ok = await verifyPassword(password, stored);
    else if (env.EDITOR_PASSWORD) ok = timingSafeEqual(password, String(env.EDITOR_PASSWORD));
    else throw new HttpError('This site isn’t set up yet: use “Set up this site” on this page first.', 409);
  } else {
    const stored = await getTeamSetting(db, team, 'password_' + role);
    if (stored) ok = await verifyPassword(password, stored);
    else if (role === 'viewer' && (await getTeamSetting(db, team, 'viewer_open')) === '1') ok = true;
    else throw new HttpError('The admin hasn’t set this password yet.', 409);
  }
  if (!ok) {
    await db.prepare('INSERT INTO login_failures (ip, at) VALUES (?, ?)').bind(ip, now()).run();
    throw new HttpError('That password isn’t right.', 401);
  }
  return startSession(request, env, role, name || null, role === 'editor' ? null : team);
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

async function startSession(request, env, role, name, team) {
  const db = env.DB;
  const token = randomToken();
  const t = now();
  const cookie = team ? teamCookie(team.id) : ADMIN_COOKIE;
  // The session this cookie held before (if any) is replaced.
  const old = readCookies(request).filter(c => c.cookie === cookie);
  const stmts = [db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t)];
  for (const c of old) stmts.push(db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(c.token)));
  stmts.push(db.prepare('INSERT INTO sessions (token_hash, role, name, team, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(await sha256(token), role, name || null, team ? team.id : null, t, t + SESSION_DAYS * 86400));
  await db.batch(stmts);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ role, name: name || null }, 200, { 'Set-Cookie': cookieHeader(cookie, token, SESSION_DAYS * 86400, secure) });
}

// Signing out on a team's page ends what gives access there (the admin login,
// or this team's); on the site's own page, every login this browser holds.
async function logout(request, env, team) {
  const list = await allSessions(request, env);
  const ending = team ? list.filter(s => s.team == null || s.team === team.id) : list;
  const secure = new URL(request.url).protocol === 'https:';
  if (ending.length) await env.DB.batch(ending.map(s => env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.hash)));
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  const cookies = new Set(ending.map(s => s.cookie));
  if (!team) readCookies(request).forEach(c => cookies.add(c.cookie));
  for (const c of cookies) headers.append('Set-Cookie', cookieHeader(c, '', 0, secure));
  return new Response(JSON.stringify({ ok: true }), { headers });
}

// The other teams this browser is signed in to as a tagger or viewer (for the
// account menu), never including teams it has no login for.
async function otherTeams(env, list, team) {
  const ids = [...new Set(list.filter(s => s.team != null && (!team || s.team !== team.id)).map(s => s.team))];
  if (!ids.length) return [];
  const { results } = await env.DB.prepare(`SELECT id, slug, name FROM teams WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id`)
    .bind(...ids).all();
  return results.map(r => ({ slug: r.slug, name: r.name, role: list.find(s => s.team === r.id).role }));
}

// ---------- blobs (big files, stored in parts) ----------
const blobName = (team, what) => team.id + '/' + what;

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

function checkStatto(bytes) {
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new HttpError('That file isn’t a Statto export (.statto).');
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

async function getTags(env, team, since) {
  const { results } = await env.DB.prepare(
    'SELECT kind, key, game, data, updated_by, updated_at, seq FROM team_tags WHERE team = ? AND seq > ? ORDER BY seq').bind(team.id, since).all();
  const top = await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM team_tags WHERE team = ?').bind(team.id).first();
  return {
    seq: top.seq,
    changes: results.map(r => ({ kind: r.kind, key: r.key, game: r.game, data: r.data ? JSON.parse(r.data) : null, by: r.updated_by, at: r.updated_at })),
  };
}

// changes: [{ kind, key, game, data }] -- data replaces that event's tags (null clears them).
// quiet: an upload or restore, not someone tagging -- don't show them in the
// hub as "tagging now".
async function putTags(env, team, session, changes, quiet) {
  if (!Array.isArray(changes) || !changes.length) return { saved: 0 };
  if (changes.length > 500) throw new HttpError('Too many changes at once.');
  const db = env.DB;
  const t = now();
  const by = whoIs(session);
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
    stmts.push(db.prepare(`INSERT INTO team_tags (team, kind, key, game, data, updated_by, updated_at, seq)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, (SELECT COALESCE(MAX(seq), 0) + 1 FROM team_tags WHERE team = ?1))
        ON CONFLICT(team, kind, key) DO UPDATE SET game = COALESCE(excluded.game, team_tags.game), data = excluded.data,
          updated_by = excluded.updated_by, updated_at = excluded.updated_at, seq = excluded.seq`)
      .bind(team.id, c.kind, c.key, game, data, by, t));
  }
  for (const g of quiet ? [] : games) {
    stmts.push(db.prepare(`INSERT INTO team_activity (team, game, name, at) VALUES (?, ?, ?, ?)
        ON CONFLICT(team, game, name) DO UPDATE SET at = excluded.at`).bind(team.id, g, by, t));
  }
  await db.batch(stmts);
  const top = await db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM team_tags WHERE team = ?').bind(team.id).first();
  return { saved: changes.length, seq: top.seq };
}

// A tagged event: any kind (passes, blocks, and point-level events -- pulls,
// defensive possessions, opponent turnovers) with at least one field set. The
// same rule as the pages' counts (StattoStats.taggedEvents).
const TAGGED = "data IS NOT NULL AND data <> '{}'";

// ---------- the tagging hub ----------
async function hub(env, team) {
  const db = env.DB;
  const t = now();
  const [claims, activity, counts] = await Promise.all([
    db.prepare('SELECT game, name, status, updated_at FROM team_claims WHERE team = ?').bind(team.id).all(),
    db.prepare('SELECT game, name, at FROM team_activity WHERE team = ? AND at > ? ORDER BY at DESC').bind(team.id, t - 7 * 86400).all(),
    db.prepare(`SELECT game, COUNT(*) AS n FROM team_tags WHERE team = ? AND ${TAGGED} GROUP BY game`).bind(team.id).all(),
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

async function setClaim(env, team, session, body) {
  const game = typeof body.game === 'string' ? body.game.slice(0, 100) : '';
  if (!game) throw new HttpError('Which game?');
  const db = env.DB;
  const by = whoIs(session);
  const action = body.action;
  if (action === 'touch') {
    // Opened the game: show them as working on it (doesn't claim it).
    await db.prepare(`INSERT INTO team_activity (team, game, name, at) VALUES (?, ?, ?, ?)
        ON CONFLICT(team, game, name) DO UPDATE SET at = excluded.at`).bind(team.id, game, by, now()).run();
  } else if (action === 'release') {
    await db.prepare('DELETE FROM team_claims WHERE team = ? AND game = ?').bind(team.id, game).run();
  } else if (action === 'claim' || action === 'done' || action === 'reopen') {
    // The admin can assign a game to anyone; taggers claim it for themselves.
    const name = session.role === 'editor' && typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : by;
    const status = action === 'done' ? 'done' : 'tagging';
    await db.prepare(`INSERT INTO team_claims (team, game, name, status, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(team, game) DO UPDATE SET name = excluded.name, status = excluded.status, updated_at = excluded.updated_at`)
      .bind(team.id, game, name, status, now()).run();
  } else {
    throw new HttpError('Unknown action.');
  }
  return hub(env, team);
}

// ---------- the home page's summary (signed-in only) ----------
async function seasonSummary(env, team) {
  const db = env.DB;
  const [statto, report, games, tagged, done] = await Promise.all([
    db.prepare('SELECT updated_at FROM blobs WHERE name = ?').bind(blobName(team, 'statto')).first(),
    db.prepare('SELECT updated_at FROM blobs WHERE name = ?').bind(blobName(team, 'report')).first(),
    getTeamSetting(db, team, 'game_count'),
    db.prepare(`SELECT COUNT(*) AS n FROM team_tags WHERE team = ? AND ${TAGGED}`).bind(team.id).first(),
    db.prepare("SELECT COUNT(*) AS n FROM team_claims WHERE team = ? AND status = 'done'").bind(team.id).first(),
  ]);
  return {
    games: games ? Number(games) : null,
    stattoUpdatedAt: statto ? statto.updated_at : null,
    reportPublishedAt: report ? report.updated_at : null,
    taggedEvents: tagged.n,
    gamesDone: done.n,
  };
}

// ---------- a team's settings (admin) ----------
async function updateTeamSettings(env, team, body) {
  const db = env.DB;
  if (body.teamName !== undefined) {
    const n = String(body.teamName || '').trim().slice(0, 80);
    if (n) { await db.prepare('UPDATE teams SET name = ? WHERE id = ?').bind(n, team.id).run(); team.name = n; }
  }
  if (body.viewerOpen !== undefined) await setTeamSetting(db, team, 'viewer_open', body.viewerOpen ? '1' : '0');
  if (Number.isInteger(body.gameCount) && body.gameCount >= 0) await setTeamSetting(db, team, 'game_count', body.gameCount);
  if (body.passwords && typeof body.passwords === 'object') {
    for (const role of TEAM_ROLES) {
      const pw = body.passwords[role];
      if (pw === undefined || pw === null || pw === '') continue;
      checkNewPassword(pw);
      await setTeamSetting(db, team, 'password_' + role, await hashPassword(pw));
      // A changed password signs everyone using it (on this team) out.
      await db.prepare('DELETE FROM sessions WHERE team = ? AND role = ?').bind(team.id, role).run();
    }
  }
  return teamStatus(env, team);
}

// ---------- a team's backup / restore (admin) ----------
async function backup(env, team) {
  const db = env.DB;
  const out = { statto: 'team-site-backup', version: 2, exportedAt: new Date().toISOString(), teamName: team.name, blobs: {}, tags: [], claims: [] };
  for (const what of ['statto', 'season', 'report']) {
    const b = await getBlob(db, blobName(team, what));
    if (b) out.blobs[what] = { contentType: b.contentType, revision: b.revision, data: b64(b.bytes) };
  }
  out.tags = (await db.prepare('SELECT kind, key, game, data, updated_by, updated_at FROM team_tags WHERE team = ? AND data IS NOT NULL').bind(team.id).all()).results;
  out.claims = (await db.prepare('SELECT game, name, status, updated_at FROM team_claims WHERE team = ?').bind(team.id).all()).results;
  return out;
}

// Restores into this team (backups from before teams existed work too).
async function restore(env, team, body) {
  if (!body || body.statto !== 'team-site-backup') throw new HttpError('That isn’t a team site backup.');
  const db = env.DB;
  for (const [what, b] of Object.entries(body.blobs || {})) {
    if (!['statto', 'season', 'report'].includes(what)) continue;
    await putBlob(db, blobName(team, what), unb64(b.data), b.contentType, 'restore', null);
  }
  const tags = Array.isArray(body.tags) ? body.tags : [];
  for (let i = 0; i < tags.length; i += 200) {
    await putTags(env, team, { name: 'restore', role: 'editor' }, tags.slice(i, i + 200).map(r => ({
      kind: r.kind, key: r.key, game: r.game, data: r.data ? JSON.parse(r.data) : null,
    })), true);
  }
  return { ok: true, blobs: Object.keys(body.blobs || {}).length, tags: tags.length };
}

// ---------- routing ----------
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return new URL(origin).host === new URL(request.url).host;
}

// The site's own API: setup, the admin login, the list of teams.
async function handleSiteApi(request, env, url, path) {
  const method = request.method;
  if (path === '/api/status' && method === 'GET') {
    const list = await allSessions(request, env);
    const admin = adminOf(list);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM teams').first();
    return json({
      ...(await siteStatus(env)),
      hasTeams: count.n > 0,
      session: publicSession(admin),
      teams: admin ? await listTeams(env.DB) : null,
      signedIn: await otherTeams(env, list, null),
    });
  }
  if (path === '/api/login' && method === 'POST') return login(request, env, null);
  if (path === '/api/setup/code' && method === 'POST') return json(await logSetupCode(env));
  if (path === '/api/setup' && method === 'POST') return completeSetup(request, env);
  if (path === '/api/reset/code' && method === 'POST') return json(await logResetCode(env));
  if (path === '/api/reset' && method === 'POST') return completeReset(request, env);
  if (path === '/api/logout' && method === 'POST') return logout(request, env, null);

  if (path === '/api/teams') {
    const admin = await requireAdmin(request, env);
    if (method === 'GET') return json({ teams: await listTeams(env.DB) });
    // A new team, from its Statto export (the request body).
    if (method === 'POST') return json(await createTeam(request, env, url, admin));
  }
  const m = /^\/api\/teams\/([a-z0-9-]+)$/.exec(path);
  if (m && method === 'POST') {
    await requireAdmin(request, env);
    return json(await changeTeam(env, m[1], await request.json().catch(() => ({}))));
  }
  if (path === '/api/admin/password' && method === 'POST') {
    await requireAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    await setAdminPassword(env.DB, body.password);
    return json({ ok: true });
  }
  throw new HttpError('Not found.', 404);
}

// One team's API, at /t/<slug>/api/...
async function handleTeamApi(request, env, url, team, path) {
  const method = request.method;
  const db = env.DB;
  if (path === '/api/status' && method === 'GET') {
    const list = await allSessions(request, env);
    const session = sessionForTeam(list, team);
    const admin = adminOf(list);
    return json({
      ...(await teamStatus(env, team)),
      session: publicSession(session),
      season: session ? await seasonSummary(env, team) : null,
      teams: admin ? await listTeams(db) : null,
      signedIn: await otherTeams(env, list, team),
    });
  }
  if (path === '/api/login' && method === 'POST') return login(request, env, team);
  if (path === '/api/logout' && method === 'POST') return logout(request, env, team);

  // The Statto export: the admin replaces it; taggers read it to build the tagging pages.
  if (path === '/api/statto') {
    if (method === 'GET') {
      await requireRole(request, env, team, 'tagger');
      const blob = await getBlob(db, blobName(team, 'statto'));
      return blob ? blobResponse(blob, 'application/octet-stream') : fail('No Statto export yet.', 404);
    }
    if (method === 'PUT') {
      const s = await requireRole(request, env, team, 'editor');
      const bytes = await readBody(request);
      checkStatto(bytes);
      const revision = await putBlob(db, blobName(team, 'statto'), bytes, 'application/octet-stream', whoIs(s), null);
      const games = Number(url.searchParams.get('games'));
      if (Number.isInteger(games) && games >= 0) await setTeamSetting(db, team, 'game_count', games);
      return json({ revision });
    }
  }

  // The season's set-up (tournaments, video links, photos, lines): one JSON
  // bundle with a revision number, so two Season setup windows can't silently
  // overwrite each other.
  if (path === '/api/season') {
    if (method === 'GET') {
      await requireRole(request, env, team, 'tagger');
      const blob = await getBlob(db, blobName(team, 'season'));
      if (!blob) return json({ revision: 0, data: null });
      return json({ revision: blob.revision, data: JSON.parse(new TextDecoder().decode(blob.bytes)) });
    }
    if (method === 'PUT') {
      const s = await requireRole(request, env, team, 'editor');
      const bytes = await readBody(request);
      let parsed;
      try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw new HttpError('That isn’t valid JSON.'); }
      if (!parsed || parsed.statto !== 'custom-data') throw new HttpError('That isn’t a season data bundle.');
      delete parsed.annotations; // tags live in their own table
      const rev = url.searchParams.get('force') === '1' ? null : url.searchParams.get('rev');
      const revision = await putBlob(db, blobName(team, 'season'), enc.encode(JSON.stringify(parsed)), 'application/json', whoIs(s), rev);
      return json({ revision });
    }
  }

  if (path === '/api/tags') {
    if (method === 'GET') {
      await requireRole(request, env, team, 'tagger');
      return json(await getTags(env, team, Number(url.searchParams.get('since') || 0)));
    }
    if (method === 'POST') {
      const s = await requireRole(request, env, team, 'tagger');
      const body = await request.json().catch(() => null);
      // The admin's "Upload tags" (an old annotations file) is quiet.
      return json(await putTags(env, team, s, body && body.changes, !!(body && body.upload) && s.role === 'editor'));
    }
  }

  if (path === '/api/hub' && method === 'GET') { await requireRole(request, env, team, 'tagger'); return json(await hub(env, team)); }
  if (path === '/api/claims' && method === 'POST') {
    const s = await requireRole(request, env, team, 'tagger');
    return json(await setClaim(env, team, s, await request.json().catch(() => ({}))));
  }

  // The published Team Report.
  if (path === '/api/report') {
    if (method === 'GET') {
      await requireRole(request, env, team, 'viewer');
      const blob = await getBlob(db, blobName(team, 'report'));
      return blob ? blobResponse(blob, 'text/plain; charset=utf-8') : fail('No Team Report has been published yet.', 404);
    }
    if (method === 'PUT') {
      const s = await requireRole(request, env, team, 'editor');
      const revision = await putBlob(db, blobName(team, 'report'), await readBody(request), 'text/plain; charset=utf-8', whoIs(s), null);
      return json({ revision, publishedAt: now() });
    }
  }

  if (path === '/api/settings') {
    if (method === 'GET') { await requireRole(request, env, team, 'editor'); return json(await teamStatus(env, team)); }
    if (method === 'POST') {
      await requireRole(request, env, team, 'editor');
      return json(await updateTeamSettings(env, team, await request.json().catch(() => ({}))));
    }
  }
  if (path === '/api/backup' && method === 'GET') {
    await requireRole(request, env, team, 'editor');
    return json(await backup(env, team), 200, { 'Content-Disposition': `attachment; filename="${team.slug}-backup.json"` });
  }
  if (path === '/api/restore' && method === 'POST') {
    await requireRole(request, env, team, 'editor');
    return json(await restore(env, team, await request.json().catch(() => null)));
  }
  throw new HttpError('Not found.', 404);
}

// A team's pages: the same files for every team, served under its address.
const TEAM_PAGES = new Set(['/', '/editor', '/tag', '/view', '/settings']);
// The addresses from before teams: they open the main team.
const OLD_PAGES = new Set(['/', '/editor', '/tag', '/view', '/settings']);

function noTeamPage() {
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>No team here</title><link rel="stylesheet" href="/site.css"></head><body><div class="center">
<p>There’s no team at this address. Check the link you were sent.</p><p class="dim"><a href="/">Go to the team site</a></p>
</div></body></html>`, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function route(request, env, url) {
  const path = url.pathname;
  const isApi = /^(\/t\/[^/]+)?\/api\//.test(path);
  if (isApi || path.startsWith('/t/') || path === '/t' || OLD_PAGES.has(path)) await ensureSchema(env.DB);
  if (isApi && request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) throw new HttpError('Forbidden.', 403);

  const m = /^\/t\/([^/]+)(\/.*)?$/.exec(path);
  if (m) {
    const slug = m[1].toLowerCase();
    const rest = m[2] || '';
    const team = await teamBySlug(env.DB, slug);
    if (rest.startsWith('/api/')) {
      if (!team) throw new HttpError('There’s no team at this address.', 404);
      return handleTeamApi(request, env, url, team, rest.replace(/\/+$/, ''));
    }
    if (!team) return noTeamPage();
    if (!rest) return Response.redirect(url.origin + '/t/' + team.slug + '/' + url.search, 302);
    if (!TEAM_PAGES.has(rest)) return new Response('Not found.', { status: 404 });
    return env.ASSETS.fetch(new Request(new URL(rest, url.origin), request));
  }
  if (path.startsWith('/api/')) return handleSiteApi(request, env, url, path.replace(/\/+$/, ''));
  if (OLD_PAGES.has(path)) {
    const team = await mainTeam(env.DB);
    if (team) return Response.redirect(url.origin + '/t/' + team.slug + path + url.search, 302);
    // No teams yet: the site's own sign-in / setup page.
    if (path !== '/') return Response.redirect(url.origin + '/' + url.search, 302);
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      return await route(request, env, url);
    } catch (e) {
      const isApi = /^(\/t\/[^/]+)?\/api\//.test(url.pathname);
      if (!(e instanceof HttpError)) console.error(e);
      if (isApi) return e instanceof HttpError ? fail(e.message, e.status, e.extra) : fail('Something went wrong on the server.', 500);
      return new Response('Something went wrong on the server.', { status: 500 });
    }
  },
};
