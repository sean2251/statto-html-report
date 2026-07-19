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

## What's in the report

The top nav has eight destinations: **Season**, a **Games** dropdown (hover
or click to jump to any individual game), **Player Analysis**, **Line
Analysis**, **Thrower-Receiver Analysis**, **Field Analysis**,
**Gender Analysis**, and **Raw Data**.

### Season

- Season W–L record, plus total cumulative point differential across every
  game
- A **Scoring Efficiency** panel with three ring gauges (Total / Offensive /
  Defensive) and a toggle between three ways of counting a "chance": **Per
  Point**, **Per Possession**, and **First Possession** (i.e. no
  turnover-and-recovery detours)
- A schedule grid — click any game card to jump straight to that game
- A sortable **season leaderboard** covering every tracked stat (see
  [Stat glossary](#stat-glossary) below), with:
  - A **games filter** so you can scope the leaderboard to any subset of
    games instead of the whole season
  - **Download CSV** on every table

### Games (one page per game, reached via the Games dropdown)

- Score, opponent, and result
- A **Combined / O-line / D-line** toggle over the core box stats
  (completions, hucks, blocks, opponent turnovers, red-zone conversion),
  scoped to which side of the disc a point started on
- The same **Scoring Efficiency** ring gauges as the Season tab, scoped to
  this game
- An interactive **point-differential chart** — click any dot to jump to
  that point in the log below
- A point-by-point log labeled **Clean hold / Dirty hold / Break / Opp
  hold / Broken**, showing who scored and who threw the assist. Use the
  **← / →** arrow keys to step through points (and, for multi-possession
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

- **Season Totals** — games, points played, touches, goals, assists,
  blocks, turnovers, plus/minus, and five scoring-efficiency stats scoped
  to that player specifically
- **Efficiency & Averages** — a Thrower/Receiver toggle switches between
  completion rates and reception rates, huck stats, assist stats, and a
  set of per-game and per-pass averages (see [Stat glossary](#stat-glossary))
- **Directions** — a rose diagram per player showing which direction they
  tend to throw toward and receive from, throws and receptions side by
  side
- **Connections** — a dual-Sankey per player: the top 5 people who throw
  to them on the left, the top 5 people they throw to on the right, each
  connection split into green (completed) and red (incomplete) segments;
  hover any segment for the exact count
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
tournaments — auto-identified from game dates and labeled like "Jul 10-11
Tournament" — each with its own independently detected/named lines). Each
tournament's heading is editable, so you can rename "Jul 10-11 Tournament"
to e.g. "Regionals" — the custom name shows up everywhere (with the dates
kept alongside for context) and is saved with your lines. This
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
4. **Compare** — once you have 1+ named lines, pick which ones to compare
   (and which games to include) for a stats table (points played, hold/break
   rate, throw/huck/assist completion, blocks, opponent turnovers forced,
   red-zone conversion), per-line **Scoring Efficiency** gauges, and per-line
   **field diagrams** with the same category filter used elsewhere

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

### Raw Data

Export the underlying data behind the report, scoped to a shared **games
filter** (1 to all games):

- **CSV exports** (six, each with a live row-count preview before you
  download): **Passes** (one row per pass, with derived yardage/huck/
  assist-attempt columns so you don't have to re-derive field geometry
  yourself), **Points** (one row per point — including points the opponent
  held with zero of our recorded passes, since Statto only tracks this
  team's actions, making this the only reliable source for point-by-point
  score progression), **Blocks**, **Players (per game)** (every selected
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
    usable if it ever gets separated from the file below.
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
| **Plus/minus** | Goals + assists − turnovers |

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
