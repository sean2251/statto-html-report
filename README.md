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

## What's in the report

The top nav has five destinations: **Season**, a **Games** dropdown (hover
or click to jump to any individual game), **Player Analysis**, **Field
Analysis**, and **Gender Analysis**.

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
    red dashed = turnover), hover any line to see who threw to whom
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
