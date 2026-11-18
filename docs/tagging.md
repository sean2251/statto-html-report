# Tagging film

You've been asked to help tag a game's film. Everything happens on the team's
site, in your browser: nothing to install, nothing to send back. Every tag
saves as you go, and others can tag at the same time — even the same game.

## Signing in

1. Open the team's address you were sent (it looks like
   `https://<something>.workers.dev/t/<team>/`).
2. Under **Video tagger**, enter your name (it's how others see who's on which
   game) and the tagger password the admin gave you, and sign in.

You land in the **Tagging hub**. You stay signed in on that browser for 30
days. Helping more than one team? Sign in on each team's address; you stay
signed in to all of them, and the account menu at the top right lists them.

## The tagging hub

Every game, newest first, with:

- how much is tagged (`12/60 tagged` and a progress bar),
- who's claimed it (**Alex is on it**) and who's **tagging now**, live,
- buttons: **Tag** (or **Continue**) opens the game; **Claim** puts your name
  on it so others pick another (**Take over** if someone else had it);
  **Mark done** when it's finished; **Release** or **Reopen** to undo.

The list updates by itself. **Hide finished games** keeps it short.

Nothing stops two people tagging the same game: each tag saves on its own, and
you see each other's arrive within a few seconds. To split a game, agree who
takes which half.

## The tagging screen

You'll see one **Video Tagging** tab and a screen laid out in three columns — video, field, tags — so the diagram sits directly
beside the boxes you fill in from it:

```
 ┌───────────────────┐  ┌──────────┐  ┌────────────────────────┐
 │                   │  │          │  │ Thrower → Receiver     │
 │    GAME VIDEO     │  │  FIELD   │  │ Point 1 · Completed    │
 │                   │  │ DIAGRAM  │  │ Hand ▾     Release ▾   │
 │                   │  │          │  │ Distance ▾ Stall ▾     │
 │                   │  │ (one     │  │ Catch ▾    Highlight ▾ │
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
can't be stretched out of shape. Your chosen size is remembered on this
computer, so you only set it once.

You step through more than just passes — a game's events, in the order they
happened, are: the **Pull** (opening every defensive point — who pulled, and
where it landed), each **Defensive possession** (our scheme while they had it),
**Opponent turnovers** that weren't our blocks, our **Blocks**, and every
**pass**.

## Choose how much to tag

At the top of the screen is a two-way toggle:

- **All events** — every event above, including every completed pass.
- **All events except throws** — skips the routine passes (the ones that were
  completed and didn't score). Everything else stays: pulls, opponent
  turnovers, blocks, defensive possessions, turnovers and assists. On a typical
  game this is roughly a third of the events, so it's *much* faster.

It's only a filter on what you're shown — nothing is deleted, and you can flip
between the two at any time without losing tags. The counters (`3 / 56` and the
"tagged in this view" count at the bottom) follow whichever mode you're in.

## How to tag each pass

1. Watch that pass on the video.
2. In the panel, pick whatever applies — **Hand**, **Release**, **Distance**,
   **Stall**, **Catch**, **Highlight** are single-choice dropdowns; **Turnover
   reason** (shown only on turnovers) is checkboxes, so check as many reasons
   as genuinely applied. **You don't have to fill every box** — just set the
   ones the coach asked for, and leave the rest blank. Add a **Note** if
   useful.
3. Set the **Timestamp** (the moment in the video): scrub the video to the
   moment and click **Grab current time**, or **Grab 2s before** — you usually
   notice a throw a beat after it happens, so the useful moment is slightly
   behind where the video is when you reach for the button. Use **Jump ▶** to
   re-check it. (No video on the page? The admin hasn't added the game's
   YouTube link yet; you can type the time as `mm:ss` instead.)
4. Press **→** for the next pass and repeat.

## Keyboard shortcuts

Most throws are one of a handful of common types, so the number keys fill those
in at a stroke — each also stamps the video time 2 seconds back:

| Key | Fills in |
|---|---|
| **1** | Flick under — Hand: Flick, Release: Forceside, Distance: Under, Stall: Mid, Catch: Uncontested |
| **2** | Backhand reset — Hand: Backhand, Distance: Reset, Stall: High, Catch: Uncontested |
| **3** | Break reset — Hand: Backhand, Release: Breakside around, Distance: Reset, Stall: High, Catch: Uncontested |
| **,** | Nudge the timestamp 1 second earlier |
| **.** | Nudge the timestamp 1 second later |
| **← →** | Previous / next event |

The same list is printed on screen, under the tagging panel. Two things to know:
a number key only applies to a **pass** (it does nothing on a pull, block or
defensive possession), and it fills in **only** the tags listed — anything you
set yourself is left alone, so pressing **2** after **1** keeps the Release
from **1**. All shortcuts pause while you're typing in a text box.

The **Stall** dropdown spells out the stall count each band covers — *Low
(< stall 3)*, *Mid (stall 3–7)*, *High (stall > 7)* — so you don't have to
guess where the boundaries are.

## When you're finished

There's nothing to export or send: your tags are already on the site. Go back
to the **Tagging hub** (top bar) and click **Mark done** on the game. Stopped
halfway? Just leave; you (or anyone) can **Continue** later from any computer.
