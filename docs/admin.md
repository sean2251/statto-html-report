# Running your site (for the admin)

Once signed in as the admin, every page shares one top bar:

- **the team name** at the top left: a dropdown of every team, with
  **+ Upload new team** at the bottom;
- the team's pages: **Home**, **Season setup**, **Tagging hub**, **Team
  Report**, **Site settings**;
- the account menu on the right, with **Sign out**.

The home page shows the team's season at a glance — games, the latest export,
tagging progress, when the Team Report was last published — and warns you if
the team's tagger or viewer password isn't set yet.

## Teams

Each Statto export you upload becomes its own **team** — another season, or
another team altogether — completely separate from the others:

| Each team has its own | |
|---|---|
| Address | `<your site>/t/ramp-2026/` — send people this one |
| Season setup | tournaments, video links, photos, lines |
| Tags and tagging hub | |
| Team Report | at `<team address>/view` |
| Passwords | tagger and viewer, set in that team's **Site settings**; they only open that team |

Its helpers and players only ever see that team. There's one **admin**
password for the whole site, and it opens every team.

- **Switching:** pick a team from the dropdown at the top left. You land on the
  same page there (Season setup to Season setup, and so on).
- **Adding one:** **+ Upload new team**. Choose its `.statto` export and a
  name; it starts empty, with no passwords yet.
- **Managing them:** **Site settings → All teams** lists every team and its
  address. **Make main** chooses which team the site's plain address opens;
  **Delete…** removes a team and everything in it (download its backup first).
  Renaming a team (**Site settings → This team**) keeps its address.

## Season setup

Where you author the season: the [Set up tab](report-guide.md#set-up----season-setup)
(tournaments, video links, player photos, newer exports), the [Video annotation
editor](report-guide.md#video-annotation-editor----season-setup) (tag film
yourself, and watch helpers' tags arrive) and [Line set
up](report-guide.md#line-set-up--line-analysis----season-setup--team-report).
Everything saves to the site as you go; the pill at the bottom right says
**All changes saved**.

- **Stat'd more games?** Export the whole team from Statto again and use **Add
  newer Statto export** on the Set up tab — in any order. Video links, tags and
  lines stay with the right games.
- **Getting film tagged:** add each game's YouTube link on the Set up tab, then
  send helpers the team's address and tagger password. They pick games in the
  [tagging hub](tagging.md). To put someone on a game, use **Share for
  tagging** on its row (or they click **Claim** in the hub).
- **Tags from before the site:** a helper sent you a tags file (from the old
  tagging pages' **Export annotations JSON**)? In the **Tagging hub**, click
  **Upload tags** on that game's row (only the admin sees it) and choose the
  file. Only that game's tags are taken; where an event is already tagged,
  the file's values replace the same fields and the rest are kept. Taggers'
  hubs update by themselves; publish the Team Report again to include them.
- **Publishing:** **Publish Team Report** on the Set up tab puts the current
  report at `<team address>/view`. It's a snapshot: publish again after
  changes. **Preview Team Report** shows it first.

## Passwords

In **Site settings**: the team's tagger and viewer passwords at the top, the
admin password (for the whole site) at the bottom. Turn on **Anyone with the
link can open the Team Report** to drop the viewer password for that team.
Changing a password signs out everyone using it, which is how you remove
someone's access. Forgot the admin password? See
[Setting up](setup.md#forgot-the-admin-password).

## Backups

**Site settings → Download a backup** saves everything of that team's (the
Statto export, set-up, lines, tags, the Team Report) as one file. Keep one now
and then; **Restore backup** puts it back into whichever team's settings you
restore it from.

## Moving an old season in

From the old Statto Reports Mac app or a Set up editor file, the **Upload new
team** screen takes the `.statto` export plus your existing work:

- **From the Mac app:** the season folder's `season_data.json`, with that
  folder's `season.statto`.
- **From a Set up editor file:** its **Set up → Export all custom data** file,
  with the `.statto` that editor was built from.

Add newer exports afterwards from Season setup.
