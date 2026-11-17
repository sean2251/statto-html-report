# Statto Reports team site

A website for your teams: Season setup for the admin, a live tagging hub for everyone
helping with film, and the Team Report — all online, with everything stored on
the site rather than in anyone's browser or on anyone's computer. It runs on
Cloudflare's free plan (Workers + a D1 database).

One site holds as many **teams** as you like. Each Statto export you upload
becomes its own team (another season, or another team altogether), completely
separate from the others: its own address (`<your site>/t/ramp-2026/`), set-up,
tags, tagging hub, Team Report and tagger and viewer passwords. As the admin
you switch between them from the team name at the top left.

| Login | Who | Can |
|---|---|---|
| **Admin** | You (and any co-coaches) | Everything, on every team: upload Statto exports and new teams, set up tournaments, video links, photos and lines, tag, publish Team Reports, change passwords, download backups. One password for the whole site |
| **Video tagger** | Helpers | On one team: pick games in its tagging hub and tag them — several people can tag at once, even the same game, and see each other's progress live |
| **Team Report** | The team | On one team: open its published Team Report. The admin can drop this password so anyone with the link can view |

Each login has one shared password; the tagger and viewer passwords are set
per team, so a team's helpers and players only ever see that team. Taggers
also enter their name, which is how the hub shows who's on which game. Someone
who helps two teams signs in to each, and stays signed in to both.

## Setting up your team's site

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up). About 10 minutes.

The site is a Cloudflare **Worker** (it runs code, so it can check passwords and
save tags) with a **D1** database. In the dashboard both live under **Workers &
Pages**, next to Pages projects — don't create a Pages project.

### Option A: the Deploy to Cloudflare button (other teams)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sean2251/statto-html-report/tree/main/site)

Sign in to Cloudflare and GitHub when asked, give the project a name (it becomes
part of your site's address, `<name>.<your-account>.workers.dev`) and deploy.
Cloudflare copies this `site/` folder into a new repository in your GitHub
account and creates the database. Then go to [First sign-in](#first-sign-in).

### Option B: import this repository (whoever owns it)

This deploys straight from the repository, so every merge to `main` redeploys
the site.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Workers** →
   **Import a repository**. Connect GitHub if asked and pick the repository.
2. **Project name:** your choice (e.g. `ramp2026-stats`).
3. Under **Advanced settings**, set the **path** (root directory) to `site`.
4. Leave **Build command** empty; **Deploy command** stays `npx wrangler deploy`.
5. **Deploy**. The build log ends with your site's address. A warning that the
   config's Worker name differs from your project name is fine: Cloudflare uses
   your project name.

### First sign-in

1. Open your site's address. A new site shows **Set up this site**.
2. Click **Show a setup code**. In the Cloudflare dashboard, open **Workers &
   Pages** → your site → **Observability** (Logs), and find the line
   “Statto team site setup code”. It can take a minute to appear — refresh the
   logs. Only someone signed in to your Cloudflare account can see it, which is
   what stops a stranger from claiming your site.
3. Enter the code and choose the **Admin** password (at least 10
   characters). You're signed in.
4. **Upload new team**: choose your team's `.statto` export and give the team a
   name (it suggests one, like "RAMP 2026"; the name also makes the team's
   address). Coming from the Mac app or a Set up editor file? Add its saved
   work on the same screen (see
   [Moving an existing season in](#moving-an-existing-season-in)).
5. Open the team's **Site settings** and set its **Video tagger** password,
   and either a **Team Report** password or "anyone with the link".
6. Send helpers the team's address and tagger password, and the team the
   address (plus the viewer password, if you set one). The site's plain
   address opens your **main** team too (the first, unless you choose another).

**From a terminal instead** (needs [Node](https://nodejs.org/)): clone this
repository, then in `site/` run `npm install`, `npx wrangler login` and
`npx wrangler deploy` (it creates the database the first time), and continue
with First sign-in. Setting an `EDITOR_PASSWORD` secret on the Worker also works
as the first admin password, but Cloudflare can drop dashboard secrets when a
Worker deploys from GitHub, so the setup code is the reliable way.

## Using it

Once signed in, every page shares one top bar: the team name, the pages your
login can use, and an account menu on the right with **Sign out**. The admin's
home page shows the team's season at a glance — games, the latest export,
tagging progress and when the Team Report was last published — with a card for
each area. Taggers land in the tagging hub, viewers in the Team Report. To
switch logins, sign out from the account menu.

### More than one team

- **Switching:** for the admin, the team name at the top left is a dropdown of
  every team; pick one to open the same page there (Season setup to Season
  setup, and so on).
- **Adding one:** **Upload new team** at the bottom of that dropdown. Choose its
  `.statto` export and a name; it starts empty, with no passwords yet.
- **Separate means separate:** each team has its own tagger and viewer
  passwords, set in that team's **Site settings**, and those only open that
  team. Its pages never show the others.
- **Managing them:** **Site settings → All teams** lists every team and its
  address. **Make main** chooses which one the site's plain address opens;
  **Delete…** removes a team and everything in it (download its backup first).
  Renaming a team (Site settings → This team) keeps its address.

- **Stat'd more games?** Export the whole team from Statto again and use
  **Add newer Statto export** on Season setup's Set up tab — in any order.
  Video links, tags and lines stay with the right games.
- **Tagging:** helpers sign in as **Video tagger** and land in the tagging hub:
  every game with progress, who's claimed it, and who's tagging right now. They
  pick a game and tag; every tag saves to the site immediately, so anyone can
  carry on where someone stopped, on any computer. You can also tag from the
  Video annotation editor in Season setup, and see helpers' tags arrive as they work.
  To put someone on a game, use **Share for tagging** on its row in Season setup
  (or they click **Claim** in the hub).
- **Publishing:** **Publish Team Report** on the Set up tab puts the current
  report at `<team address>/view`. It's a snapshot: publish again after changes.
- **Passwords:** change any of them in **Site settings**: the team's tagger and
  viewer passwords at the top, the admin password (for the whole site) at the
  bottom. Changing one signs out everyone using it, which is how you remove
  someone's access.
- **Forgot the admin password?** Click **Forgot the password?** under the Admin
  sign-in. Like the first sign-in, it puts a one-time code in your
  site's logs (Cloudflare → your site → **Observability**); enter it and choose
  a new password. Anyone still signed in with the old one is signed out.
- **Backups:** **Site settings → Download a backup** saves everything of that
  team's (export, set-up, lines, tags, the Team Report) as one file. Keep one
  now and then; **Restore backup** puts it back (into whichever team's
  settings you restore it from).

### Moving an existing season in

The **Upload new team** screen takes the `.statto` export plus your existing
work:

- **From the Mac app:** the season folder's `season_data.json`, with that
  folder's `season.statto`.
- **From a Set up editor file:** its **Set up → Export all custom data** file,
  with the `.statto` that editor was built from.

Add newer exports afterwards from Season setup.

## Updating your site to a new version

The site doesn't update itself. When there's a new version:

- **If you used the button:** Cloudflare put a copy of this `site/` folder in a
  new repository in your GitHub account, and redeploys whenever it changes.
  Replace that repository's files with the latest `site/` folder from here (or
  use **Sync fork**, if GitHub shows that button on it). Your data is untouched:
  it lives in the database, not the code.

**From a one-team version (before teams):** the first time the new version
runs, your season becomes the site's first team, at an address made from its
name (e.g. `/t/ramp-2026/`), and the main one. Everyone stays signed in, the
passwords stay the same, and old links (`<your site>/`, `/tag`, `/view`) open
that team. Download a backup from Site settings before updating, just in case.
- **From a terminal:** pull the latest code and run `npx wrangler deploy` in
  `site/` again.

## Preview builds (optional)

When Cloudflare is connected to the repository, it can also build a temporary
**preview** copy of the site for each branch or pull request, with its own
address, so you can try changes before merging them. Previews inherit nothing
from the live site: `site/wrangler.jsonc` gives them their own D1 database
(the `previews` block), so testing a preview never touches your real season.
All previews share that one database; the first time, claim it with **Set up
this site** and a setup code (its logs are under the same Worker in
Cloudflare), then upload a copy of your Statto export to test with.

The database ID in that block belongs to the RAMP 2026 site's Cloudflare
account. If you run your own copy: create a D1 database for previews
(**Storage & Databases → D1 → Create**), put its ID in the `previews` block,
or delete the block and turn off non-production branch builds in your Worker's
**Settings → Builds**. Either way, your live site deploys from `main` as usual.

## Costs and limits

Cloudflare's free plan comfortably covers a team: the database holds a few
megabytes per season, and tagging writes a few thousand rows on a busy day,
far below the free daily limits. Videos stay on YouTube. Nothing pauses when
the site isn't used.

## How it works (for developers)

- `src/worker.js` — the server: teams (each at `/t/<slug>/`, its API at
  `/t/<slug>/api/...`; the site's own API at `/api/...` for setup, the admin
  login and the list of teams; old one-team databases are converted on first
  use), first-run setup (a one-time code written to the
  Worker's logs), sign-in (salted PBKDF2 password hashes, session
  cookies — the admin's, and one per team — rate-limited logins), each team's
  export and set-up (stored in parts,
  with revision numbers so two Season setup windows can't silently overwrite each
  other), tags (one row per tagged event, with a change counter the pages poll),
  claims and activity for the hub, the published report, backup and restore.
  It creates its database tables itself on first use.
- `web/` — the site's own pages: the same files serve every team (they find
  their team from the address). Season setup and the tagging pages download the
  `.statto` export and build the report in the browser with the JavaScript stats
  engine (`statto_report/templates/stats.js`), then show the same report page
  as everywhere else, in team-site mode.
- `public/` — what's actually served: `web/` plus the report page template and
  stats engine, generated by `node build.mjs` from `statto_report/templates/`.
  It's committed (so a deploy needs no build step); `tests/test_stats_parity.py`
  fails if it's out of date.
- Run it locally with a local database: `npm install` then `npx wrangler dev`
  (the setup code appears in its output); or put `EDITOR_PASSWORD="…"` in
  `site/.dev.vars` to skip setup.
- Tests: `tests/test_site.py` starts a local copy and checks the API rules and
  the whole flow in a browser (two taggers at once, two teams, and converting a
  one-team database included).
