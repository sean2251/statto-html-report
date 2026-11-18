# Setting up your site

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up). It
takes about 10 minutes, and runs on Cloudflare's free plan.

The site is a Cloudflare **Worker** (it runs code, so it can check passwords
and save tags) with a **D1** database. In the Cloudflare dashboard both live
under **Workers & Pages** — don't create a Pages project.

## Option A: the Deploy to Cloudflare button

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sean2251/statto-stats)

Sign in to Cloudflare and GitHub when asked, give the project a name (it
becomes part of your site's address, `<name>.<your-account>.workers.dev`) and
deploy. Cloudflare copies this repository into a new one in your GitHub account
and creates the database. Then go to [First sign-in](#first-sign-in).

## Option B: import the repository

Use this if you own this repository (or your own fork of it): every merge to
`main` then redeploys the site.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Workers** →
   **Import a repository**. Connect GitHub if asked and pick the repository.
2. **Project name:** your choice (e.g. `ramp-stats`).
3. Leave the **path** (root directory) empty, the **Build command** empty, and
   the **Deploy command** as `npx wrangler deploy`.
4. **Deploy**. The build log ends with your site's address. A warning that the
   config's Worker name differs from your project name is fine: Cloudflare uses
   your project name.

**From a terminal instead** (needs [Node](https://nodejs.org/)): clone the
repository, then run `npm install`, `npx wrangler login` and
`npx wrangler deploy` (it creates the database the first time), and continue
with First sign-in.

## First sign-in

1. Open your site's address. A new site shows **Set up this site**.
2. Click **Show a setup code**. In the Cloudflare dashboard, open **Workers &
   Pages** → your site → **Observability** (Logs), and find the line
   “Statto team site setup code”. It can take a minute to appear — refresh the
   logs. Only someone signed in to your Cloudflare account can see it, which is
   what stops a stranger from claiming your site.
3. Enter the code and choose the **Admin** password (at least 10 characters).
   You're signed in.
4. **Upload new team**: choose your team's `.statto` export and a name (it
   suggests one, like “RAMP 2026”; the name also makes the team's address,
   `/t/ramp-2026/`).
5. Open the team's **Site settings** and set its **Video tagger** password,
   and either a **Team Report** password or “anyone with the link”.
6. Send helpers the team's address and the tagger password, and the team the
   address (plus the viewer password, if you set one).

Then see [Running your site](admin.md).

## Forgot the admin password?

Click **Forgot the password?** under the Admin sign-in. Like the first sign-in,
it puts a one-time code in your site's logs (Cloudflare → your site →
**Observability**); enter it and choose a new password. Anyone still signed in
with the old one is signed out.

## Updating to a new version

Your data lives in the database, not the code, so updating never touches it.

- **Imported the repository (Option B):** every merge to `main` redeploys.
- **Used the button (Option A):** Cloudflare made a copy of this repository in
  your GitHub account and redeploys whenever it changes. Bring it up to date
  with **Sync fork** if GitHub shows that button on it, or by replacing its
  files with the latest from here.
- **From a terminal:** pull the latest code and run `npx wrangler deploy`.

## Preview builds (optional)

When Cloudflare is connected to the repository, it can also build a temporary
**preview** copy of the site for each branch or pull request, with its own
address, so you can try changes before merging them. Previews inherit nothing
from the live site: `wrangler.jsonc` gives them their own D1 database (the
`previews` block), so testing a preview never touches your real teams. All
previews share that one database; the first time, claim it with **Set up this
site** and a setup code (its logs are under the same Worker in Cloudflare),
then upload a copy of a Statto export to test with.

The database ID in that block belongs to the RAMP site's Cloudflare account.
If you run your own copy: create a D1 database for previews (**Storage &
Databases → D1 → Create**) and put its ID in the `previews` block, or delete the
block and turn off non-production branch builds in your Worker's **Settings →
Builds**. Either way, your live site deploys from `main` as usual.

## Costs and limits

Cloudflare's free plan comfortably covers several teams: the database holds a
few megabytes per season, and tagging writes a few thousand rows on a busy day,
far below the free daily limits. Videos stay on YouTube. Nothing pauses when
the site isn't used.
