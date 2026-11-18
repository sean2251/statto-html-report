# Statto Stats

A stats website for ultimate frisbee teams, built from
Statto exports. Upload your team's export and you
get a place to set up the season, a live hub where helpers tag the game film
together, and a mobile **Team Report** your players open: team performance,
every game, players, lines, field position, gender equity, time series,
advanced stats and film clips.

![How it works: take stats in Statto and export the .statto file; upload it to your site as a team, adding newer exports as you go; set up the season and tag film in Season setup; helpers tag games live in the tagging hub; then publish the Team Report your team opens.](docs/how-it-works.svg)

It runs on Cloudflare's free plan, as your own site: your data never leaves it.
One site holds as many teams or seasons as you like, each completely separate.

## Who does what

| Login | Who | Can |
|---|---|---|
| **Admin** | You (and any co-coaches) | Everything, on every team: upload exports and new teams, Season setup, tag, publish Team Reports, passwords, backups. One password for the whole site |
| **Video tagger** | Helpers | On one team: pick games in its tagging hub and tag them — several at once, with progress live |
| **Team Report** | Your team | On one team: open its published Team Report. Optional: you can let anyone with the link in |

## Where to start

| You are… | Read |
|---|---|
| Setting up a site for your team | [Setting up your site](docs/setup.md) — about 10 minutes, with the **Deploy to Cloudflare** button |
| Running a site (the admin) | [Running your site](docs/admin.md): teams, Season setup, publishing, passwords, backups |
| Helping tag film | [Tagging film](docs/tagging.md) |
| On the team, reading the Team Report | [The report, tab by tab](docs/report-guide.md), including the [stat glossary](docs/report-guide.md#stat-glossary) |
| Changing the code | [For developers](docs/developers.md) |

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sean2251/statto-stats)

## Try it

[`examples/example_season.statto`](examples/example_season.statto) is a
made-up season (three games, invented names). Upload it as a team on your site
to see everything before using your own data.

## Coming from the Mac app?

The Statto Reports Mac app, the command-line report builder and the shared
GitHub Pages tagging site have been retired in favour of the site. Your
seasons move in on the site's **Upload new team** screen, with the season
folder's `season_data.json` — see [Moving an old season in](docs/admin.md#moving-an-old-season-in).
The last app release stays on the
[Releases page](https://github.com/sean2251/statto-stats/releases), and the old
code is in the history before the move to the site.
