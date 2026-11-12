# Statto Reports team site

A website for one team: the Set up editor, a live tagging hub for everyone
helping with film, and the Team Report — all online, with everything stored on
the site rather than in anyone's browser or on anyone's computer. It runs on
Cloudflare's free plan (Workers + a D1 database). Each team runs its own copy,
so a team's data is only ever on its own site.

| Login | Who | Can |
|---|---|---|
| **Set up editor** | You (and any co-coaches) | Upload Statto exports, set up tournaments, video links, photos and lines, tag, publish the Team Report, change passwords, download backups |
| **Video tagger** | Helpers | Pick games in the tagging hub, tag them — several people can tag at once, even the same game, and see each other's progress live |
| **Team Report** | The team | Open the published Team Report. The editor can drop this password so anyone with the link can view |

Each login has one shared password. Taggers also enter their name, which is
how the hub shows who's on which game.

## Setting up your team's site

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up). About 10 minutes.

1. Click **Deploy to Cloudflare**:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sean2251/statto-html-report/tree/main/site)

   Sign in to Cloudflare and GitHub when asked. Give the project a name — it
   becomes part of your site's address (`<name>.<your-account>.workers.dev`).
2. When it asks for **EDITOR_PASSWORD**, choose the Set up editor password (at
   least 10 characters). The database is created for you.
3. Open your site's address, sign in as the **Set up editor**, and upload your
   team's `.statto` export. Coming from the Mac app or a Set up editor file?
   Add its saved work on the same screen (see [Moving an existing season in](#moving-an-existing-season-in)).
4. Open **Site settings** in the editor and set the **Video tagger** password,
   and either a **Team Report** password or "anyone with the link".
5. Send helpers the site address and the tagger password, and the team the
   address (plus the viewer password, if you set one).

**If the button doesn't work for you**, deploy from a terminal instead
(needs [Node](https://nodejs.org/)):

```bash
git clone https://github.com/sean2251/statto-html-report.git
```

```bash
cd statto-html-report/site && npm install
```

```bash
npx wrangler login
```

```bash
npx wrangler deploy
```

```bash
npx wrangler secret put EDITOR_PASSWORD
```

`wrangler deploy` creates the database the first time. You can also add or
change the `EDITOR_PASSWORD` secret in the Cloudflare dashboard: **Workers &
Pages → your site → Settings → Variables and Secrets**.

## Using it

- **Stat'd more games?** Export the whole team from Statto again and use
  **Add newer Statto export** on the editor's Set up tab — in any order.
  Video links, tags and lines stay with the right games.
- **Tagging:** helpers sign in as **Video tagger** and land in the tagging hub:
  every game with progress, who's claimed it, and who's tagging right now. They
  pick a game and tag; every tag saves to the site immediately, so anyone can
  carry on where someone stopped, on any computer. You can also tag from the
  editor's Video annotation editor, and see helpers' tags arrive as they work.
  To put someone on a game, use **Share for tagging** on its row in the editor
  (or they click **Claim** in the hub).
- **Publishing:** **Publish Team Report** on the Set up tab puts the current
  report at `<your site>/view`. It's a snapshot: publish again after changes.
- **Passwords:** change any of them in **Site settings**. Changing one signs
  out everyone using it, which is how you remove someone's access.
- **Backups:** **Site settings → Download a backup** saves everything (export,
  set-up, lines, tags, the Team Report) as one file. Keep one now and then;
  **Restore backup** puts it back.

### Moving an existing season in

On the first sign-in, the "Start your season" screen takes the `.statto`
export plus your existing work:

- **From the Mac app:** the season folder's `season_data.json`, with that
  folder's `season.statto`.
- **From a Set up editor file:** its **Set up → Export all custom data** file,
  with the `.statto` that editor was built from.

Add newer exports afterwards from the editor.

## Updating your site to a new version

The site doesn't update itself. When there's a new version:

- **If you used the button:** Cloudflare put a copy of this `site/` folder in a
  new repository in your GitHub account, and redeploys whenever it changes.
  Replace that repository's files with the latest `site/` folder from here (or
  use **Sync fork**, if GitHub shows that button on it). Your data is untouched:
  it lives in the database, not the code.
- **From a terminal:** pull the latest code and run `npx wrangler deploy` in
  `site/` again.

## Costs and limits

Cloudflare's free plan comfortably covers a team: the database holds a few
megabytes per season, and tagging writes a few thousand rows on a busy day,
far below the free daily limits. Videos stay on YouTube. Nothing pauses when
the site isn't used.

## How it works (for developers)

- `src/worker.js` — the server: sign-in (salted PBKDF2 password hashes, session
  cookies, rate-limited logins), the season export and set-up (stored in parts,
  with revision numbers so two editor windows can't silently overwrite each
  other), tags (one row per tagged event, with a change counter the pages poll),
  claims and activity for the hub, the published report, backup and restore.
  It creates its database tables itself on first use.
- `web/` — the site's own pages. The editor and tagging pages download the
  `.statto` export and build the report in the browser with the JavaScript stats
  engine (`statto_report/templates/stats.js`), then show the same report page
  as everywhere else, in team-site mode.
- `public/` — what's actually served: `web/` plus the report page template and
  stats engine, generated by `node build.mjs` from `statto_report/templates/`.
  It's committed (so a deploy needs no build step); `tests/test_stats_parity.py`
  fails if it's out of date.
- Run it locally with a local database: put `EDITOR_PASSWORD="…"` in
  `site/.dev.vars`, then `npm install` and `npx wrangler dev`.
- Tests: `tests/test_site.py` starts a local copy and checks the API rules and
  the whole flow in a browser (two taggers at once included).
