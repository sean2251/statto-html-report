# For developers

The whole repository is one Cloudflare Worker project: no framework, no build
step at deploy time, and one dependency (Wrangler, Cloudflare's CLI).

## Layout

| Path | What it is |
|---|---|
| `src/worker.js` | The server: teams, sign-in, every API route, the database schema |
| `web/` | The site's own pages: sign-in and home (`index.html`), Season setup (`editor.html`), the tagging hub and tagging pages (`tag.html`), the Team Report (`view.html`), Site settings, Upload new team (`new.html`), and the shared code and styles (`site.js`, `site.css`) |
| `report/` | The report page — `report.html` (skeleton), `report.css`, `report.js` (every tab, the tagging editor, saving and live tag sync) — and `stats.js`, the stats engine that turns a `.statto` export into the report's data |
| `build.mjs` | Builds `public/` from `web/` and `report/` |
| `public/` | What's actually served. Generated, but committed, so a deploy needs no build step |
| `wrangler.jsonc` | The Worker's config: assets, the database, preview builds |
| `tests/` | The tests and their fixtures |
| `examples/` | A made-up season (`example_season.statto`) to try the site with, and the script that generated it |

## How it works

- **Addresses.** Each team's pages are the same files from `public/`, served
  under the team's address, `/t/<slug>/...`; its API is `/t/<slug>/api/...`.
  The site's own API, `/api/...`, has first-run setup, password reset, the
  admin login and the list of teams. The old one-team addresses (`/`, `/tag`,
  `/view`, ...) redirect to the main team.
- **Storage.** One D1 database: a `teams` table, and every team's settings,
  files (the Statto export, set-up and published Team Report, stored in parts),
  tags (one row per tagged event, with a change counter the pages poll),
  claims and activity keyed by team. The Worker creates its tables on first
  use and converts a database from an older version.
- **Sign-in.** Salted PBKDF2 password hashes; session cookies (the admin's,
  and one per team, so a browser can be signed in to several); rate-limited
  logins; first-run setup and password resets by one-time codes written to the
  Worker's logs.
- **Reports.** Season setup and the tagging pages download the team's `.statto`
  export and build the report in the browser with `report/stats.js`, then show
  the report page in site mode. Publishing bakes the current data into a
  standalone copy of the report page, which the site stores and serves at
  `<team address>/view`.

## Running it locally

```bash
npm install
```

```bash
npx wrangler dev
```

It runs at `http://localhost:8787` with a local database (in `.wrangler/`);
the setup code appears in its output. Or put `EDITOR_PASSWORD="…"` in a
`.dev.vars` file to skip setup. Upload `examples/example_season.statto` as a
team to try things.

## Making a change

1. Work on a branch. Pages and site behaviour go in `web/` and `src/`; stats in
   `report/stats.js`; what the report shows in `report/report.js`; styling in
   `report/report.css` or `web/site.css`.
2. After changing `web/` or `report/`, rebuild `public/` and commit it:

   ```bash
   npm run build
   ```

3. Open a pull request. The **Tests** workflow runs on it, and Cloudflare
   builds a preview copy of the site (see
   [Preview builds](setup.md#preview-builds-optional)). Merge when it's green;
   that redeploys the live site.

A published Team Report is a snapshot, so a change to the report reaches a
team only when the admin publishes again.

If a change alters how saved data is **stored** (rather than only reading
it), existing data needs converting when it's read, as the move from game
positions to game IDs did (`migrateLegacyStorage` in `report.js`) and the move
to multiple teams did (`migrateFromOneTeam` in `worker.js`).

## Tests

The tests are Python (`unittest`) driving Node, Wrangler and a headless
browser:

```bash
python3 -m pip install -r tests/requirements.txt
```

```bash
python3 -m playwright install chromium
```

```bash
npm test
```

- `tests/test_stats.py` checks `report/stats.js` against results frozen in
  `tests/fixtures/` (the example season, a partial export, edge cases, no
  games), and that `public/` is up to date. If you change a stat on purpose,
  refresh the fixtures with `STATTO_REFRESH_FIXTURES=1` and say so in the pull
  request.
- `tests/test_site.py` starts a local copy of the site with Wrangler and tests
  the API's rules (passwords, teams kept apart, rate limits, setup and reset
  codes, upgrading an old database) and the whole flow in a browser (two
  taggers at once, a newer export, publishing, switching teams).

`.github/workflows/tests.yml` runs both on every push to `main` and every pull
request.
