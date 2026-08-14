# Statto HTML Season Report

`statto_to_html_report.py` turns a single Statto (`.statto`) export into one
self-contained, interactive HTML report covering your whole season: team
performance, individual games, per-player breakdowns, field-position
analysis, and gender-equity analysis for mixed rosters. No server, no
internet connection, and no dependencies beyond the Python standard library
— open the output file in any browser and everything runs client-side.

## Requirements

- Python 3
- No third-party packages (uses only `argparse`, `json`, `math`, `os`,
  `zipfile`, `tempfile`, and `datetime` from the standard library)

## Usage

```bash
python3 statto_to_html_report.py path/to/yourfile.statto -o report.html
```

If you skip `-o`, the report is written to `<yourfile>_report.html` in the
current directory. Open the resulting file directly in a browser — it's a
single HTML file with everything (data, styling, and behavior) baked in, so
it's easy to share or archive.

The report remembers your light/dark theme choice in the browser it's
opened in (via `localStorage`, since this is a file you own and open
yourself, not something running inside a hosted app).

## Example

`examples/` has a fully made-up 3-game season (fake players, fake opponents,
no real data) so you can see what a report looks like without needing a
`.statto` export of your own:

- [`examples/example_report.html`](examples/example_report.html) — download
  it and open it in a browser (GitHub doesn't render HTML files inline)
- `examples/example_season.statto` — the fake data behind it
- `examples/generate_example_data.py` — the script that generated it, if you
  want to regenerate or tweak it

```bash
python3 examples/generate_example_data.py
python3 statto_to_html_report.py examples/example_season.statto -o examples/example_report.html
```

## Recommended workflow: from a `.statto` file to a team report

This is the end-to-end path for whoever is leading the effort — coach,
captain, or stats keeper. Every step below saves its data in *your* browser,
and the final **Publish** step bakes it all into one file you hand to the
team. (The separate helper instructions in the next section are what you send
to anyone pitching in on video tagging.)

**1. Generate the report.** Run the tool on your Statto export:

```bash
python3 statto_to_html_report.py path/to/season.statto -o report.html
```

Open `report.html` in a browser. If you want the film features (embedded
video and "grab current time"), open it through a local web server rather
than double-clicking it — see the note at the end of this section.

**2. Set up your season** — the **Set up** tab:

- **Tournaments** — group your games and name them (e.g. "Regionals"). These
  groups then appear in every games filter across the report.
- **Video links** — paste one YouTube link per game. This powers the **▶
  Watch game** button on each game page and all the film-tagging tools.
- **Player photos** — give each player a round avatar, either one at a time or
  by tagging faces on a single team photo.

**3. Curate your lines** — the **Line Analysis** tab. Confirm the recurring
7-person lineups the tool auto-detects, name them, and compare them like
players.

**4. Tag the film** — the **Data Editor** tab (optional, but it's what unlocks
clip queries like "show me all our inside-flick turnovers"). Either:

- **Do it yourself**, stepping through each pass, block, and defensive
  possession; or
- **Split it across helpers** — on the **Set up** tab's Games table, click
  **Create tagging page** for a game to produce a stripped-down, single-game
  file, and send one to each helper (point them at *For video-tagging
  helpers*, below). When they email back their exported annotations JSON,
  click **Upload tags** next to that game to merge it in.

**5. Publish for the team** — the **Set up** tab, **Publish for team
(read-only)**. This downloads one self-contained HTML file with all your
tournaments, lines, photos, video links, and film tags baked in, but with the
editing surfaces stripped down to a clean, read-only report (no Set up tab;
the Data Editor becomes a read-only film-clip browser). Email it, AirDrop it,
or drop it on any static host (GitHub Pages, a Netlify drag-and-drop deploy,
etc.) to share a link.

> **A note on the video player.** The embedded YouTube player only works when
> the report is opened from a web address (`http://…`), not straight off disk
> (`file://`) — YouTube blocks the embed otherwise. The simplest fix is to
> serve the folder locally: in a terminal, `cd` into the report's folder and
> run `python3 -m http.server`, then open the `http://localhost:8000/…` URL it
> prints. (Hosting the report online works too.) The same applies to a
> **published team report**: its baked-in tags, video links and photos load
> from the browser's storage, which is also blocked off `file://`, so serve it
> over `http(s)` too. Your own authoring report — where you entered the data —
> works fine straight off disk apart from the embedded player.

## For video-tagging helpers (no coding needed)

Someone sent you an HTML file (something like `team_tag_glass_cannons.html`)
and asked you to tag one game's film. Here's how — no experience needed. You
have **two options**; pick one.

- **Option A — Easiest, works right away.** Double-click the file, watch the
  game video in a separate tab, and type each timestamp by hand. Nothing to
  install.
- **Option B — Smoother.** Run one tiny "local server" so the video plays
  *inside* the tagging page and a **Grab current time** button fills in
  timestamps for you. Needs a 2-minute, one-time setup.

Either way, **your work saves automatically in that browser as you go**, and at
the end you'll click one button to send it back. Two rules: stick to the
**same browser on the same computer** the whole time (your work lives in that
browser), and don't forget the final **Export** step.

### The tagging screen

However you open the file, you'll see one **Video Tagging** tab and a screen
laid out in three columns — video, field, tags — so the diagram sits directly
beside the boxes you fill in from it:

```
 ┌───────────────────┐  ┌──────────┐  ┌────────────────────────┐
 │                   │  │          │  │ Thrower → Receiver     │
 │    GAME VIDEO     │  │  FIELD   │  │ Point 1 · Completed    │
 │  (or a "Watch on  │  │ DIAGRAM  │  │ Hand ▾     Release ▾   │
 │   YouTube" link   │  │          │  │ Distance ▾ Stall ▾     │
 │   if not hosting) │  │ (one     │  │ Catch ▾    Highlight ▾ │
 │                   │  │  pass    │  │ Notes […]              │
 │                   │  │  lit up) │  │ Timestamp [mm:ss]      │
 │                   │  │          │  ├────────────────────────┤
 │                   │  │ [←] 3/60 │  │ KEYBOARD SHORTCUTS     │
 │                   │  │     [→]  │  │ 1 Flick under …        │
 └───────────────────┘  └──────────┘  └────────────────────────┘
```

The columns aren't equal thirds — each is sized to its own shape. The video is
landscape and takes the leftover width; the field is portrait (110 × 40 yards,
so nearly 3× taller than wide) and stays narrow; the tag panel is a fixed-width
form that stays in view as you scroll. On a narrow screen the tag panel drops to
a full-width row underneath, and below ~860px everything stacks.

The field diagram shows the current pass (bright, with the others dimmed). The
panel on the right is where you describe **that** pass. Use **← / →** on your
keyboard (or the **Prev / Next** buttons) to move through every pass in the
game, one at a time.

**Resizing the field.** Drag the bottom-right corner of the field diagram to
make it bigger or smaller. Only the width is draggable — the height follows
automatically, so the pitch always keeps its true 110 × 40 yard proportions and
can't be stretched out of shape. Your chosen size is remembered in this browser,
so you only set it once.

You step through more than just passes — a game's events, in the order they
happened, are: the **Pull** (opening every defensive point — who pulled, and
where it landed), each **Defensive possession** (our scheme while they had it),
**Opponent turnovers** that weren't our blocks, our **Blocks**, and every
**pass**.

### Choose how much to tag

At the top of the screen is a two-way toggle:

- **All events** — every event above, including every completed pass.
- **All events except throws** — skips the routine passes (the ones that were
  completed and didn't score). Everything else stays: pulls, opponent
  turnovers, blocks, defensive possessions, turnovers and assists. On a typical
  game this is roughly a third of the events, so it's *much* faster.

It's only a filter on what you're shown — nothing is deleted, and you can flip
between the two at any time without losing tags. The counters (`3 / 56` and the
"tagged in this view" count at the bottom) follow whichever mode you're in.

### How to tag each pass

1. Watch that pass on the video.
2. In the panel, pick whatever applies — **Hand**, **Release**, **Distance**,
   **Stall**, **Catch**, **Highlight** are single-choice dropdowns; **Turnover
   reason** (shown only on turnovers) is checkboxes, so check as many reasons
   as genuinely applied. **You don't have to fill every box** — just set the
   ones the coach asked for, and leave the rest blank. Add a **Note** if
   useful.
3. Set the **Timestamp** (the moment in the video):
   - **Option B (self-hosting):** scrub the embedded video to the moment and
     click **Grab current time**, or **Grab 2s before** — you usually notice a
     throw a beat after it happens, so the useful moment is slightly behind
     where the video is when you reach for the button. Use **Jump ▶** to
     re-check it.
   - **Option A:** read the time off your video (e.g. `12:04`) and type it into
     the timestamp box as `mm:ss`.
4. Press **→** for the next pass and repeat.

### Keyboard shortcuts

Most throws are one of a handful of common types, so the number keys fill those
in at a stroke — each also stamps the video time 2 seconds back:

| Key | Fills in |
|---|---|
| **1** | Flick under — Hand: Flick, Release: Forceside, Distance: Under, Stall: Mid, Catch: Uncontested |
| **2** | Backhand reset — Hand: Backhand, Distance: Reset, Stall: High, Catch: Uncontested |
| **3** | Break reset — Hand: Backhand, Release: Breakside around, Distance: Reset, Stall: High, Catch: Uncontested |

The **Stall** dropdown spells out the stall count each band covers — *Low
(< stall 3)*, *Mid (stall 3–7)*, *High (stall > 7)* — so taggers don't have to
guess where the boundaries are. That's a display label only: the value saved in
an annotation stays the short `Low` / `Mid` / `High`, so games tagged before the
wording changed still read back correctly and still match a Stall filter.
| **,** | Nudge the timestamp 1 second earlier |
| **.** | Nudge the timestamp 1 second later |
| **← →** | Previous / next event |

The same list is printed on screen, under the tagging panel. Two things to know:
a number key only applies to a **pass** (it does nothing on a pull, block or
defensive possession), and it fills in **only** the tags listed — anything you
set yourself is left alone, so pressing **2** after **1** keeps the Release
from **1**. All shortcuts pause while you're typing in a text box.

### When you're finished → send it back

Scroll to the bottom and click **Export annotations JSON**. Your browser
downloads a small `.json` file (usually to your **Downloads** folder), named
after the game you tagged — e.g. `ramp_2025_tag_anthem_jul_12_2025_annotations.json`
— so the coach can tell whose game is whose. **Email that file back to the
coach** — that's it. (You do *not* send the big HTML file back.)

---

### Option B setup: run a local server (one time)

Only needed if you want the embedded player + "Grab current time." Because of a
YouTube rule, the video won't play when a page is opened straight off your disk;
running a tiny local server fixes it. Pick your operating system.

#### Mac

1. Put the `.html` file in its own folder (e.g. make a new folder on your
   Desktop called `tagging` and drag the file into it).
2. Open **Terminal**: press **⌘ Cmd + Space**, type `Terminal`, press
   **Return**. A window with plain text appears — that's normal.
3. Type `cd ` (the letters c, d, then a **space**), then **drag the `tagging`
   folder from Finder onto the Terminal window** and let go. It pastes the
   folder's location for you. Press **Return**.
4. Type this and press **Return**:

   ```
   python3 -m http.server
   ```

   - If a popup asks to *install command line developer tools*, click
     **Install**, wait for it to finish, then run the command again. (No popup
     and it just works? Great.)
   - You should see a line like `Serving HTTP on :: port 8000 …`. **Leave this
     window open** while you tag.
5. Open your web browser and go to this address:

   ```
   http://localhost:8000/
   ```

   Click the `.html` file in the list that appears (or add its name to the
   address, e.g. `http://localhost:8000/team_tag_glass_cannons.html`).
6. Tag away — the video now plays inside the page.
7. **When you're done:** click back on the Terminal window and press
   **Control + C** (that's the Control key, *not* Command) to stop the server.
   You can close Terminal.

#### Windows

1. Put the `.html` file in its own folder (e.g. a new folder on your Desktop
   called `tagging`).
2. **Install Python once** (if you don't have it): go to
   [python.org/downloads](https://www.python.org/downloads/), click the big
   download button, run the installer, and — importantly — **tick the box that
   says "Add Python to PATH"** on the first screen, then click **Install Now**.
3. Open the `tagging` folder in **File Explorer**. Click the **address bar**
   (the strip at the top showing the folder path), type `cmd`, and press
   **Enter**. A black **Command Prompt** window opens, already pointed at your
   folder.
4. Type this and press **Enter**:

   ```
   python -m http.server
   ```

   - If it says `'python' is not recognized`, Python isn't installed / wasn't
     added to PATH — redo step 2 (make sure that box is ticked).
   - You should see `Serving HTTP on … port 8000 …`. **Leave this window open**
     while you tag.
5. Open your web browser and go to:

   ```
   http://localhost:8000/
   ```

   Click the `.html` file (or add its name, e.g.
   `http://localhost:8000/team_tag_glass_cannons.html`).
6. Tag away — the video now plays inside the page.
7. **When you're done:** click the black window and press **Ctrl + C** to stop
   the server, then close it.

> **Stuck on the video?** If it shows a red error or a "Watch on YouTube" link
> instead of playing, you're almost certainly opening the file directly instead
> of through `http://localhost:8000/` — go back to step 5. Either way you can
> still tag using **Option A** (type timestamps by hand); nothing is lost.

## What's in the report

The top nav has nine destinations: **Set up**, **Season**, a **Games**
dropdown (hover or click to jump to any individual game), **Player
Analysis**, **Line Analysis**, **Thrower-Receiver Analysis**, **Field
Analysis**, **Gender Analysis**, and **Raw Data**.

### Set up

One-time (per browser) configuration that the rest of the report reads from.
Everything here is saved in `localStorage`, not baked into the `.statto`
file:

- **Export / Import all custom data** — two buttons at the top. Because
  everything you add on top of the report (tournament names, video links,
  player photos, curated lines, and every video tag) lives only in this
  browser, **Export all custom data** bundles all of it into one JSON file —
  a backup, or a way to carry your work onto a freshly regenerated report when
  new games are added. **Import all custom data** replaces the matching data in
  this browser from such a file and reloads. It maps each section onto the
  current report's storage, so an export made before a regenerate still lands.

- **Tournaments** — name your tournaments and assign each game to one. This
  starts pre-filled from a date-based auto-grouping (games on the same or
  consecutive days), which you can rename, split, merge, or rebuild from
  scratch. These groups then appear in **every games filter** across the
  report: each tournament is a group header you can check/uncheck to select
  all its games at once, while still ticking individual games as before.
  Other tabs pick up tournament changes automatically the next time you
  click into them (no page reload needed) — a tab you haven't revisited
  since an edit keeps its current state until you do.
- **Games** — a table to assign each game's tournament, paste a single
  **video link** per game (which shows up as a **▶ Watch game** button on the
  game's own page), and split video tagging across people: **Create tagging
  page** downloads a stripped single-game HTML (just a "Video Tagging" tab,
  locked to that game) to hand a helper; when they send back their exported
  annotations JSON, **Upload tags** merges it here (filtered to that game, so
  a wrong file can't affect others). Each row shows an `X/Y tagged` count.
- **Player photos** — give each player a round avatar, two ways: upload one
  photo per player and crop it to a circle (drag to pan, slider to zoom), or
  **tag several at once from a single team photo** — upload one group shot,
  click each face to drop a circle, drag it to centre / drag its handle to
  resize, and pick the player's name from a dropdown. Each named circle is
  cropped to its own round avatar (each name maps to one face).

  Once set, a player's face shows up above their column in **Player
  Analysis**'s side-by-side comparison, and photos download as a ZIP from the
  **Raw Data** tab. Anyone without one just shows their name, so a
  half-photographed roster still reads consistently.
- **Publish for the team** — everything you enter on this tab (plus your
  curated lines and film tags) is saved in *your* browser only, so it doesn't
  travel with the HTML file on its own. **Publish for team (read-only)** bakes
  it all into one standalone HTML file that opens with everything preloaded —
  email it, AirDrop it, or drop it on any static host (GitHub Pages, Netlify
  drop, etc.) to get a link. The team gets a clean, read-only report: no Set up
  tab, the Data Editor becomes a read-only **Film Clips** browser (positioned
  right of Games — filter tags → jump to video clips, no editing), while
  **Line Analysis stays editable** so a teammate can build their own lines on
  top of yours. Because Line Analysis is the only thing a teammate can change,
  re-opening a newer team report refreshes the film tags, video links and
  photos (the sharer's, always the latest) while keeping the recipient's own
  lines untouched — so a browser that opened an earlier build always catches up
  to your latest tags and links instead of getting stuck on a stale copy.

  **Open it from a host, not straight off disk.** The preloaded data lives in
  the browser's `localStorage`, which browsers block for pages opened as a
  local `file://…` (double-clicking the downloaded file). Serve it over
  `http(s)` — any static host (GitHub Pages, Netlify drop, a shared link) or
  even a quick `python3 -m http.server` — and everything loads. Opened from
  disk, the video links, film clips and photos will look missing.

  **Guided tours.** The team build — and only the team build — walks a first-time
  visitor through each tab: a dimmed overlay highlights one element at a time
  with a short explanation and a Next button. Each tab introduces itself once
  per browser and then stays quiet; the **? Guide** button in the nav replays the
  current tab's tour any time. Steps whose target isn't there are dropped before
  the tour starts, so a game with no video link or no tagged film simply skips
  those steps rather than pointing at nothing. Arrow keys step through it, Esc
  or **Skip** closes it. The person building the report never sees any of this.

  **Collaborating on video tagging.** Split games among helpers. For each game,
  use **Create tagging page** to hand a helper a single-game tagging file (it
  has the video link baked in). They tag it, click **Export annotations JSON**,
  and send just that small file back; you **Upload tags** on that game's row to
  merge it (per field on Statto's stable pass IDs, filtered to that game, so
  overlapping taggers don't clobber and a mis-sent file can't pollute other
  games). When everything's collected, **Publish for team**. Note that hosting
  the report online doesn't make tagging live-collaborative — each person's
  tags stay in their own browser until exported.

### Data Editor

Step through a game's events on its field diagram and tag them, building a
richer, queryable film dataset on top of the raw Statto data.

- Pick a game, then move step-by-step with **← / →** (or Prev/Next) through
  every **pass**, **block**, **pull**, **defensive possession** and
  **opponent turnover**. The focused pass is highlighted on the field diagram
  while the rest of the point dims, so you always know exactly which one
  you're tagging.
- An **All events / All events except throws** toggle sits at the top. The
  second mode skips the routine passes (completed, non-scoring) and keeps
  everything else, which is far quicker to work through. It's purely a view
  filter — flip between the two freely without losing tags.
- **Pulls** open every defensive point: record **who pulled**, and click the
  field to mark **where the pull landed** (or pick Out-of-bounds).
- **Opponent turnovers** that weren't your blocks get their own step (Huck
  turnover / Throwing error / Receiver error). Statto records nothing for
  these, so they're inferred as opponent possessions you won the disc back
  from without a block.
- **Defensive possessions** are woven into the stepping in the right place:
  the opponent gets a new offensive possession each time they gain the disc
  (they receive your pull, or you turn it over), so a scrappy point can have
  several, and even a clean opponent hold shows up as its own step. Each one
  lets you tag your **Defensive scheme** (Zone / Force forehand / Force
  backhand / Force return) for that possession.
- Tag each pass with a few composable fields — **Hand** (backhand/flick/…),
  **Release** (forceside/breakside/…), **Distance** (reset/under/away/…),
  **Stall**, **Catch**, and, for turnovers, one or more **Turnover reasons**
  (checkboxes, not a single choice — a turnover can be both "Too far" and
  "Into doublecoverage" at once) — plus free-text notes. Blocks get their own
  **Block type**. Because these are separate fields rather than one flat
  label, questions compose ("inside flick turnovers", "% of turnovers that
  were around backhands").
- **Timestamps**: if the game has a video link (from Set up), the editor
  embeds the YouTube player — scrub to the moment and click **Grab current
  time**, or **Jump** back to a saved time. No link, or prefer to type it?
  Enter a timestamp as `mm:ss` manually. (The embedded player is the one part
  of the report that needs a network connection; everything else is offline.)
  It also needs the report opened from a **web address** (http/https), not a
  local `file://` — YouTube rejects the embed otherwise (its "error 153"). If
  you're double-clicking the HTML off disk, either serve the folder locally
  (`python3 -m http.server` in that folder, then open the printed
  `http://localhost:…` URL) or host the report; the editor falls back to a
  "Watch on YouTube" link and manual timestamps when it can't embed.
- Tags are saved in your browser per team, ride along when you **Publish for
  team**, and have their own **Export / Import annotations JSON** backup (this
  is also how a helper's single-game tagging comes back — see the Set up tab's
  per-game **Upload tags**). They key to Statto's stable pass IDs, so they
  survive regenerating the report as you log more games.
- A **Tag / Query** toggle at the top switches between the stepping editor and
  a **Query** view, which covers **all five event kinds** — Passes, Blocks,
  Pulls, D-possessions and Opp turnovers — each with its own filters (pass
  outcome and tag fields; block type; pull landing and puller; defensive
  scheme; opponent-turnover type). Results are a clip list where each entry
  **deep-links to that moment in the game's video**. The summary is the share
  of every event of that kind in scope, so *Pulls + Landing = Out-of-bounds*
  reads directly as "X of Y pulls (Z%)", and for passes an **Outcome** filter
  re-scopes the denominator so *Outcome = Turnover, Release = Around, Hand =
  Backhand* reads as "X of Y turnovers (Z%)". A **Copy timestamp links**
  button grabs every result's video link at once (e.g. to paste into a
  scouting doc or share with players).

### Season

- Season W–L record, plus total cumulative point differential across every
  game
- A **Scoring Efficiency** panel with three ring gauges (Total / Offensive /
  Defensive) and a toggle between three ways of counting a "chance": **Per
  Point**, **Per Possession**, and **First Possession** (i.e. no
  turnover-and-recovery detours)
- A **Clutch Efficiency** table splitting hold rate / break rate / total
  scoring efficiency into **high-leverage** points (Leverage ≥ 7 — the
  moments closest to deciding the season's games) vs. everything else, so
  you can see whether performance actually holds up when it matters most
- A schedule grid — click any game card to jump straight to that game
- A sortable **season leaderboard** covering every tracked stat (see
  [Stat glossary](#stat-glossary) below), with:
  - A **games filter** so you can scope the leaderboard to any subset of
    games — or whole tournaments at once (see [Set up](#set-up)) — instead
    of the whole season
  - **Download CSV** on every table

### Games (one page per game, reached via the Games dropdown)

- Score, opponent, and result
- A **▶ Watch game** button, if you've added a video link for this game on
  the [Set up](#set-up) tab
Top to bottom: **Summary Statistics → Scoring Efficiency → Point
differential → the point log / field diagram / tagged events columns →
Clutch Efficiency → Box score.**

- A **Combined / Offensive points / Defensive points** toggle over the core
  box stats (completions, hucks, blocks, opponent turnovers, red-zone
  conversion), scoped to which side of the disc a point started on
- The same **Scoring Efficiency** ring gauges as the Season tab, scoped to
  this game
- An interactive **point-differential chart** — click any dot to jump to
  that point in the log below, with a colored strip beneath it showing each
  point's Leverage (same scale as the point log and the Thrower-Receiver
  heatmap), so you can see at a glance when the game actually got tense,
  independent of the score margin above it
- The same **Clutch Efficiency** table as the Season tab, scoped to this
  game's high- vs. low-leverage points
- A point-by-point log with real column headers (**#, Score, Result, Type,
  Line¹, Leverage²**) and two numbered footnotes underneath:
  - **Result** is **Clean hold / Dirty hold / Break / Opp hold / Broken**;
    click a row (or step through with **← / →**) to see the point play out
    in the field diagram beside it — kept out of the row itself so the table
    doesn't feel too busy. Every person who touched the disc gets an
    initialled circle at the spot they threw or caught from; the throws that
    decided the point (the assist and scorer, or the turnover) are ringed in
    gold
  - **Line** is which curated line (from Line Analysis) was on the field
    for that point — blank if you haven't assigned one, and it updates
    live if you curate lines later in the same session without needing to
    reload
  - **Leverage**, 0–10 and colored by the same scale as the
    Thrower-Receiver heatmap, is how much that specific point's outcome
    could swing the game's eventual result. A double-game-point scores a
    10; a point in an already-decided blowout scores near 0. It's modeled
    as a fair (50/50) race to this game's actual final winning score
    (retroactive by design, so it sidesteps soft-cap/hard-cap/win-by-2
    rules entirely), with a square-root reshape on top so a tied score
    with just a couple points left still reads as clearly high-stakes
    instead of getting compressed toward the bottom of the scale — see
    [Stat glossary](#stat-glossary) for the exact formula

- **Film tags.** Once a game has been tagged in the Data Editor, the layout
  gains a third column — point log, field diagram, **Tagged events** — and
  until then nothing changes, so an untagged game looks exactly as it always
  did:
  - A dim **▶** next to a point's number means it has tagged film, so you
    can see at a glance how far tagging has got
  - The **Tagged events** column lists the selected point's tagged events in
    the order they happened (pull, defensive possessions, blocks, passes,
    opponent turnovers) with their tags and notes. Each event with a
    timestamp links straight to that moment in the game video, and a single
    **▶ Watch point** link at the top jumps to where the point starts
  - Tagged passes carry their tags into the diagram's existing hover
    tooltip, and a tagged **pull** shows where it landed as a teal marker —
    the only two things actually drawn on the field, to keep it uncluttered
  - Everything degrades on its own: no video link means timestamps show as
    plain text instead of links, a point with one tagged pass shows just that
    one row, and a point with none shows a quiet placeholder (so the diagram
    never jumps between layouts as you step through). On narrower screens the
    column drops to a full-width row beneath the other two

  Use the **← / →** arrow keys to step through points (and,
  for multi-possession
  points, through each possession in order) without touching the mouse
- An interactive **field diagram** for the selected point:
  - USAU-dimensioned pitch (70×40 yd, 20 yd endzones, brick marks shown)
  - Pass routes color-coded (white = completed, gold = the scoring assist,
    red dashed = turnover — ending in an ✕ for a throwaway or a hollow
    circle for a drop), hover any line to see who threw to whom
  - Small "Poss 1 / Poss 2…" tabs for points with more than one possession
    — the focused possession renders in full color, the rest fade to thin
    ghost lines
  - Three initials bubbles marking the final throw sequence of the point
    (2nd assist/earlier throw → assist/turnover thrower → scorer/intended
    target)
  - A lineup strip showing all 7 players on the field for that point, each
    with their cumulative points played in the game so far
- A sortable **box score** for the game (Download CSV available here too)

### Player Analysis

Pick 1–7 players (and, separately, which games to include) to compare
side by side:

- **Season Totals** — games, points played, high-leverage points played,
  touches, goals, assists, blocks, turnovers, plus/minus, and five
  scoring-efficiency stats scoped to that player specifically (see
  [Stat glossary](#stat-glossary) for what "high-leverage" means)
- **Efficiency & Averages** — a Thrower/Receiver toggle switches between
  completion rates and reception rates, huck stats, assist stats, and a
  set of per-game and per-pass averages (see [Stat glossary](#stat-glossary))
- **Directions** — a rose diagram per player showing which direction they
  tend to throw toward and receive from, throws and receptions side by
  side; wedge length shows relative frequency in that direction, and hover
  a wedge for the exact count
- **Connections** — a dual-Sankey per player: the top 7 people who throw
  to them on the left, the top 7 people they throw to on the right, each
  connection split into green (completed) and red (incomplete) segments;
  hover any ribbon or name's bar for the exact throw/completion counts
- **Impact Map** — one mini field diagram per selected player, with a
  shared filter for which category of throw to show (All throws, Assist
  attempts, Huck attempts, Throwing errors, Receiving errors, Blocks — "All
  throws" is exclusive with the rest, the others can be combined)

### Line Analysis

Compares specific 7-person lineups ("lines") the way Player Analysis compares
individual players — useful for questions like "which line is best in the
red zone" or "which line gets the most blocks." A line isn't something
Statto tracks directly, so this tab walks you through building one:

A toggle at the top switches between **Across Tournaments** (one pool of
lines for the whole season) and **Within Tournament** (pick 1-to-all
tournaments — the ones you defined on the [Set up](#set-up) tab, each with
its own independently detected/named lines). Tournament names and
game assignments are managed on the Set up tab now, not here. This
matters because rosters can differ a lot tournament to tournament: a
within-tournament line stays specific to that weekend's roster, and since
each tournament's lines are tracked separately rather than merged, you can
still put e.g. "O-line @ Jul 10-11" and "O-line @ Jul 17-18" side by side in
the comparison table to see how that line's performance changed weekend to
weekend.

The tab itself walks through the workflow with numbered instructions, but in
short:

1. **Pick points in a visual matrix** — every point in scope is a row (game
   by game, point by point), every player who appears in any of them is a
   column, with a dot marking who was on the field. The biggest group of
   points that look like a recurring lineup comes **pre-checked** — review
   it, checking or unchecking rows as needed. Click a player's column to
   filter down to just the points featuring them (stack a few clicks to zero
   in on an exact combination); click a row's checkbox — or shift-click for
   a range — to adjust the selection, with a "select all visible" box for
   grabbing everything currently filtered in at once
2. **Assign or create** — with points selected, either add them to an
   existing line or type a name and create a new one, right from a bulk
   action bar under the grid; an **Unassign** button removes points from
   whatever line currently owns them
3. **Repeat** — once a group is saved, it drops out of the (default
   unassigned-only) grid and the next-biggest recurring group is
   automatically pre-checked in its place, so confirming groups one after
   another converges toward just the one-off points. Flip **"Show all"** any
   time to bring already-assigned points back into view for editing
4. **See who's on each line** — a **Line rosters** section (above the
   comparison) gives every named line its own card listing everyone who
   played on it and the share of that line's points they were on the field
   for (e.g. *86% · 12/14*), sorted most-present first. A player who appears
   on more than one of the shown lines is **highlighted in gold** with a small
   count chip, so overlap between lines — the same handful of people carrying
   several lines — is obvious at a glance.
5. **Compare** — once you have 1+ named lines, pick which ones to compare
   (and which games to include) for a stats table (points played, **avg
   point leverage** — the mean Leverage across a line's points, showing
   which lines get deployed in the tightest, highest-stakes moments vs.
   mostly decided games — hold/break rate, throw/huck/assist completion,
   blocks, opponent turnovers forced, red-zone conversion), per-line
   **Scoring Efficiency** gauges, and per-line **field diagrams** with the
   same category filter used elsewhere.

   The last two rows are small **histograms of possession length** — how many
   throws a possession took, split by how it ended: one for possessions that
   scored, one for possessions that turned it over. Bars are that line's
   *share* of possessions in each bucket (1–9 throws, then 10+), so lines that
   played more points don't just look bigger, and the y-scale is shared across
   the row so columns read against each other directly. Hover a bar for the
   raw count; the caption gives the median and sample size. A possession that
   neither scored nor turned — the point ended around it — is in neither
   histogram.

   In the **published team report** the point-picking panel moves below the
   comparison, since teammates come here to read lines rather than curate them.

A **"Clear all line data"** button (with a confirmation prompt first) wipes
every saved line from this browser if you want to start over.

Your named lines are saved in the browser (`localStorage`), plus an
**Export/Import lines.json** button so your curation survives regenerating
the report with new games, moving to another device, or sharing the file
with a teammate.

### Thrower-Receiver Analysis

Looks at specific thrower → receiver connections rather than individual
players or lines:

- A **heatmap** (throwers × receivers, axis-labeled so rows/columns are
  never ambiguous) gives an at-a-glance view of the whole passing network —
  click any cell to add that exact pair to the **Compare Pairs** section
  below (up to 7 at once) and jump straight to it. A **"Color by" toggle**
  switches what each cell shows:
  **Number of Passes**, **Total Yards**, **Avg Yards / Throw**, **Forward
  Yards**, or **Avg Forward Yards / Throw**. Only Number of Passes splits
  each cell into two segments (color = completed count, red = incomplete
  count, sized proportionally) — the other four are yardage stats with no
  incomplete-pass analog, so their cells are a single solid color. Colors
  come from a multi-hue scale (navy → teal → gold) rather than shades of
  one color, so nearby values stay visually distinct, and every cell has a
  hairline border so boxes never blur together even at the low end of the
  scale. A gradient legend below the grid spells out what the colors mean.
  A second **"Totals" / "Per thrower" toggle** rescales every metric
  against each thrower's own numbers: Number of Passes, Total Yards, and
  Forward Yards switch from a raw count to that receiver's *share of the
  thrower's total* (e.g. "18% of Sean's throws went to Emily"); Avg Yards /
  Throw and Avg Forward Yards / Throw switch to a *ratio against the
  thrower's own average* (e.g. "1.3x Sean's average yards per throw" for
  their favorite deep look). The legend and cell tooltips update to match
  — percentages for share metrics, "x" ratios for rate metrics — and the
  color scale's floor is the smallest value actually observed rather than
  a fixed zero when there's no natural zero to anchor to (a ratio-to-average)
- **Compare Pairs** — pick up to 7 pairs, either from the selector or by
  clicking cells in the heatmap above (a caption under the heatmap spells
  this out), with a **"Deselect all"** button next to the selector to clear
  the picks in one click. Shows a compact stats table with one row per
  selected pair, followed by a **field-diagram comparison** — same category
  filter (Assist attempts / Huck attempts / Throwing errors / Receiving
  errors) as Player Analysis's Impact Map, plus a direction rose diagram per
  pair showing that connection's overall throw-direction tendency
- **All pairs data** — the full **sortable, filterable table**, one row per
  pair that's actually thrown to (throws, completions/%, assist attempts/%,
  huck attempts/completions/%, total and per-pass forward yards, total and
  per-pass pass distance), at the bottom of the page. Every column filters
  live: text columns by substring, numeric columns by a "≥" minimum — handy
  for e.g. "N ≥ 10" to cut out noise. CSV download reflects whatever's
  currently filtered

A shared **Games filter** scopes the heatmap, Compare Pairs, and the All
pairs data table together.

### Field Analysis

One large, screen-responsive field diagram with independently combinable
filters:

- Separate **Thrower** and **Receiver** dropdowns (1 to all players each)
  — a pass only shows if it matches both, so you can look at everything
  thrown *by* someone, everything thrown *to* someone, or a specific
  thrower→receiver connection
- **Games** filter
- **Combined / O-points / D-points**, matching the same convention used
  everywhere else in the report (based on which side the *point* started
  on)
- **Full Field / Red Zone** — Red Zone shows entire possessions that had
  at least one throw originating within 20 yd of the goal line, including
  the throws from before the disc got there; a long throw that merely
  *lands* in the endzone from farther out doesn't by itself qualify
- **Final Throw / Entire Possession** — for goals and turnovers
  specifically, choose between showing just the deciding throw or the
  whole possession that led to it
- **Export as PNG**, which bakes in a small header summarizing exactly
  which filters were active

### Gender Analysis

For mixed rosters, using Statto's own player gender field (no external
spreadsheet needed): infers each point's on-field gender ratio (4
women-matching players / 3 men-matching, or 3/4) directly from who was on
the field, then compares every thrower's actual rate of throwing to WMPs
against the rate you'd expect from someone who paid no attention to
gender at all.

- Default view: **deviation from gender-blind fairness** — one boxplot for
  WMP throwers, one for MMP throwers, each player shown as a jittered dot
  in percentage points above/below their own personal fair-share baseline,
  with hover tooltips and a 0pp reference line
- Toggle to **raw % by ratio** to see the original two-panel view (percent
  of throws to WMPs under each gender ratio, with the fair-share line drawn
  in for each group)
- A **games filter** and a **minimum-throws filter** (5+/10+/20+/All),
  since a player with only a couple of relevant throws can swing wildly by
  chance alone
- A full written explanation with a worked example sits above the chart —
  worth reading once if the "percentage points above/below fairness" idea
  is new to you

### Advanced Stats — Ultiworld EDGE Stats

One row per player, filterable by game/tournament, with the **EDGE** family of
goal-equivalent and efficiency metrics:
**EDGE-O / EDGE-B / EDGE** (production — offensive, block, and total goal
equivalents), **xEO / xEB / xE** (the same per unit of expected opportunity),
**CP+** (a retention-rate twist on completion %), **PE-O / PE-B / PE**
(per-possession efficiency, empirical-Bayes smoothed), and **CR** (a 0–100
composite rank). Each stat has a plain-language description on the page, which
also links out to the [Ultiworld EDGE reference page](https://docs.google.com/document/d/1ZgBKIX0DtGNomjwr1EuvsOkK4QRB6GP4/edit)
for the full definitions and worked examples.

Two things to know, since this report only has *your* team's season and no
league data: the framework's league-relative ratings (**PER-O**, **PER**) are
omitted, and the game-condition adjustments use your own season's scoring
efficiency as the reference — so the numbers are comparable across your roster
but not against outside benchmarks. (Opponent turnovers, needed for the game
scoring-efficiency term, are inferred from the per-point defensive-possession
count.)

### Raw Data

Export the underlying data behind the report, scoped to a shared **games
filter** (1 to all games):

- **CSV exports** (six, each with a live row-count preview before you
  download): **Passes** (one row per pass, with derived yardage/huck/
  assist-attempt columns, plus that pass's point's **leverage**, so you
  don't have to re-derive field geometry yourself), **Points** (one row per
  point — including points the opponent held with zero of our recorded
  passes, since Statto only tracks this team's actions, making this the
  only reliable source for point-by-point score progression — also carries
  **leverage**), **Blocks**, **Players (per game)** (every selected
  game's box score combined into one file — the one bulk export that isn't
  already available a game at a time), **Season Leaderboard**, and
  **Game Summaries** (one row per game, with the nested line-stats/
  scoring-efficiency data flattened into columns)
- **Machine-readable export** — two paired files, each with its own
  **Download** and **Copy to Clipboard** buttons, meant to be handed to an
  LLM together:
  - **Data (JSON)** — the raw per-game data (points/passes/blocks/lineups,
    box scores, summaries) plus a season leaderboard for the selection. It
    carries its own glossary, a short orientation section (coordinate
    system, what turnover/assist/isOffense mean), a **style guide** (the
    report's actual colors, fonts, and field-diagram drawing conventions,
    copied from its own CSS/SVG code), and a **formulas** section (exact
    definitions for the trickier derived stats, plus a gotcha about
    combining rate stats across games) — all self-contained, so it's still
    usable if it ever gets separated from the file below. It also carries
    the two video-tagged event lists that exist nowhere in the Statto data
    itself — **pullEvents** (who pulled, where it landed) and
    **opponentTurnoverEvents** (opponent turnovers that weren't our blocks)
    — for whatever games have been tagged. A **roster[]** array names every
    player with `hasPhoto` / `photoFile`, pairing up with the photo ZIP below.
  - **Player photos (ZIP)** — one PNG per player who has one, named
    `photos/first_last.png` to match `roster[].photoFile`. Photos are
    deliberately *not* base64'd into the JSON: 256px PNGs would add megabytes
    to a file meant to be pasted into a chat, and an LLM can't view an image
    out of a JSON string field anyway. Hand over the ZIP alongside the JSON
    when you want faces (player cards, an awards graphic, a scouting
    one-pager); skip it and nothing else changes.
  - **Context (Markdown)** — the fuller companion: the same glossary,
    orientation, style guide, and formulas in prose/table form, a
    ready-to-use prompt template for generating a game summary (narrative,
    individual outliers relative to season norms, and the supporting stats
    — not just a stat dump), and a set of example questions — descriptive,
    actionable (practice focus areas, lineup changes, turnover-risk
    connections), and visual (asking the LLM to draw a custom chart or
    field diagram in the report's own style)

  This export deliberately doesn't include every derived table the report
  itself shows (a thrower-receiver pair matrix, for instance) — those are a
  simple aggregation over the raw passes below, and the useful slice
  depends entirely on the question. Rather than lock an LLM into the
  report's own predefined views, the formulas section gives it the exact
  math to compute whatever slice a question actually needs, consistent
  with what the report itself would show.

## Stat glossary

A few terms that come up throughout the report and aren't self-explanatory:

| Term | Meaning |
|---|---|
| **Clean hold** | An offensive-starting point that was won with no turnover along the way |
| **Dirty hold** | An offensive-starting point that was won, but only after at least one turnover and recovery |
| **Break** | A defensive-starting point that was won |
| **Opp hold** | A defensive-starting point that was lost (the opponent just held their own point) |
| **Broken** | An offensive-starting point that was lost |
| **Huck (attempt/completion)** | A throw that gains 27+ yards downfield, regardless of who threw it |
| **Assist attempt** | A throw whose target location is inside the attacking endzone, whether or not it was actually caught |
| **Huck/assist reception** | The receiver-side mirror of the above: how often *this player*, when targeted deep or in the endzone, actually came down with it |
| **Red zone** | Within 20 yd of the attacking endzone; a red-zone "entry" requires a throw that *originated* there, not one that merely lands there from farther out |
| **Offensive utilization** | Of the points a player was on the field for that either started on offense or where their line got a block, the percentage where they recorded at least one touch |
| **Scoring efficiency (Per Point / Per Possession / First Possession)** | Three ways of measuring conversion rate — by point, by individual possession (a point with a turnover-and-recovery has more than one), or restricted to clean, first-try conversions only |
| **Plus/minus** | Goals + assists + blocks − turnovers |
| **Leverage** | How much a single point's outcome could swing the game's eventual result, 0–10 (10 = a double-game-point, where either team scoring next ends the game outright; near 0 = an already-decided blowout). Modeled as a fair (50/50) race to that game's actual final winning score, with a square-root reshape so mid-to-late-game situations don't read as more compressed than they feel — see [Games](#games-one-page-per-game-reached-via-the-games-dropdown) |
| **High-leverage points played** | How many of a player's points had Leverage ≥ 7 — points close to a coin flip on the game's outcome, typically late and close — as opposed to raw points played, which counts every point regardless of how much it mattered |

## Notes on data quality

- A very small number of passes or blocks in a Statto export can have a
  blank/unresolvable player reference (Statto allows this for plays
  attributed to "Unknown"). These are excluded from anything scoped to a
  specific player, since there's no real identity to attribute them to —
  this can occasionally make a total look a few events lower than you
  might expect from a quick manual count.
- Field-position stats (yardage, huck/red-zone thresholds, the field
  diagram itself) assume standard USAU dimensions: a 70×40 yd playing
  field with 20 yd endzones at each end.

## Output

A single `.html` file — no build step, no server, works fully offline once
generated. Safe to email, upload to shared storage, or open straight from
your downloads folder.

## Code layout

`statto_to_html_report.py` is a thin CLI wrapper; the implementation lives in
the `statto_report/` package:

| File | Responsibility |
|---|---|
| `statto_io.py` | Reading `.statto` exports, date formatting |
| `constants.py` | Field-dimension constants (pitch size, huck/red-zone thresholds) |
| `stats.py` | The stats engine — turns raw Statto relations into the report data structure, one function per stage (per-game indexing, point log, box score, game summary, season rollups) |
| `render.py` | Combines `stats.py`'s output with the `templates/` assets into the final HTML |
| `cli.py` | `argparse` wiring and `main()` |
| `templates/report.html` | The page skeleton (nav/main/footer placeholders) |
| `templates/report.css` | All styling |
| `templates/report.js` | All client-side interactivity (tables, field diagrams, charts) |

The generated report stays a single self-contained file — at build time,
`render.py` reads `report.css`/`report.js` off disk and inlines them into
`report.html` alongside the season data, so nothing in `templates/` needs to
ship alongside the output.

To add a new stat or report section: add the computation to `stats.py`
(it'll show up in the JSON blob embedded in the page) and render it in
`templates/report.js`. To change styling, edit `templates/report.css`
directly — it's a real CSS file, so your editor's linting/autocomplete works
normally.
