#!/usr/bin/env python3
"""
Generate a fake .statto file with made-up names and 3 games, for use as a
repo example (see examples/example_season.statto / example_report.html).

Usage:
    python3 examples/generate_example_data.py
    python3 ../statto_to_html_report.py examples/example_season.statto -o examples/example_report.html
"""

import json
import os
import random
import uuid
import zipfile
from datetime import datetime, timedelta

random.seed(42)

def U():
    return str(uuid.uuid4()).upper()

TEAM_UUID = U()
NOW = datetime(2026, 4, 1, 12, 0, 0)

def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

# 14-player fake roster: 7 WMP (gender=1), 7 MMP (gender=0)
WMP_NAMES = ["Riley Fenwick", "Jordan Maple", "Casey Windham", "Sam Okafor",
             "Frankie Delgado", "Robin Achterberg", "Quinn Marchetti"]
MMP_NAMES = ["Devon Castellano", "Miles Thackeray", "Theo Bramblewood", "Ezra Volkov",
             "Julian Pemberton", "Nate Kowalczyk", "Ollie Rasmussen"]

players = []
for i, name in enumerate(WMP_NAMES):
    players.append({
        "avatarData": {}, "number": i + 1, "gender": 1, "nickname": {},
        "teamUUID": TEAM_UUID, "sortIndex": i, "uuid": U(),
        "createdAt": iso(NOW), "sortName": name.split(" ")[1] + " " + name.split(" ")[0],
        "name": name,
    })
for i, name in enumerate(MMP_NAMES):
    players.append({
        "avatarData": {}, "number": i + 8, "gender": 0, "nickname": {},
        "teamUUID": TEAM_UUID, "sortIndex": i + 7, "uuid": U(),
        "createdAt": iso(NOW), "sortName": name.split(" ")[1] + " " + name.split(" ")[0],
        "name": name,
    })

wmp_players = [p for p in players if p["gender"] == 1]
mmp_players = [p for p in players if p["gender"] == 0]

OPPONENTS = ["Glass Cannons", "Night Herons", "Tumbleweed", "Salt Flats Sundowners"]

ENDZONE = 20.0 / 110.0  # matches statto_report.constants.ENDZONE_FRACTION

def rand_x():
    return random.uniform(0.05, 0.95)

def make_lineup():
    """7 players: 4/3 split of WMP/MMP, alternating which gender has 4."""
    if random.random() < 0.5:
        return random.sample(wmp_players, 4) + random.sample(mmp_players, 3)
    return random.sample(wmp_players, 3) + random.sample(mmp_players, 4)

def build_possession(game_points, all_possessions, all_passes, all_blocks, all_opp_errors,
                      point_uuid, lineup_uuids, start_y, clock, ends_in_score, is_break_start=False):
    """Build one of our possessions: a chain of passes from start_y toward the endzone.
    Returns (possession_uuid, final_clock, scored_this_possession)."""
    po_uuid = U()
    initiator = random.choice(lineup_uuids)
    all_possessions.append({
        "pointUUID": point_uuid, "uuid": po_uuid, "startY": start_y,
        "initiatorUUID": initiator, "startX": rand_x(), "createdAt": iso(clock),
    })
    clock += timedelta(seconds=2)

    n_passes = random.randint(2, 6)
    y = start_y
    thrower = initiator
    scored = False
    for i in range(n_passes):
        is_last = (i == n_passes - 1)
        receiver = random.choice([p for p in lineup_uuids if p != thrower])
        sx, sy = rand_x(), y
        # advance downfield (toward 0); occasionally a long huck-style gain
        step = random.uniform(0.25, 0.45) if random.random() < 0.15 else random.uniform(0.05, 0.18)
        y = max(0.02, y - step)
        ex, ey = rand_x(), y

        thrower_error = False
        receiver_error = False
        is_assist = False
        if is_last:
            if ends_in_score:
                ey = random.uniform(0.01, ENDZONE - 0.01)
                is_assist = True
                scored = True
            else:
                # turnover: either a throwaway or a drop
                if random.random() < 0.6:
                    thrower_error = True
                else:
                    receiver_error = True

        all_passes.append({
            "uuid": U(), "createdAt": iso(clock),
            "isReceiverError": receiver_error, "isAssist": is_assist, "isThrowerError": thrower_error,
            "endY": ey, "throwerUUID": thrower, "isSecondaryAssist": False,
            "startY": sy, "endX": ex, "startX": sx,
            "possessionUUID": po_uuid, "receiverUUID": receiver,
        })
        clock += timedelta(seconds=random.uniform(2, 6))
        thrower = receiver

    # mark secondary assist on the pass before the assist, sometimes
    if scored and n_passes >= 2 and random.random() < 0.5:
        game_passes_for_po = [p for p in all_passes if p["possessionUUID"] == po_uuid]
        game_passes_for_po[-2]["isSecondaryAssist"] = True

    return po_uuid, clock, scored


def build_game(opponent, game_date, target_diff, hold_rate=0.62, break_rate=0.40):
    """Build one game. target_diff > 0 means we should win, < 0 means we lose."""
    game_uuid = U()
    game = {
        "result": 1 if target_diff > 0 else (-1 if target_diff < 0 else 0),
        "playerLimit": 7, "teamUUID": TEAM_UUID, "isFinished": True,
        "uuid": game_uuid, "opponent": opponent, "date": iso(game_date),
        "windSpeed": random.randint(0, 10), "createdAt": iso(game_date + timedelta(minutes=1)),
        "pitchKind": 0,
    }

    points, possessions, passes, blocks, opp_errors = [], [], [], [], []
    clock = game_date + timedelta(minutes=5)
    our_score = opp_score = 0
    target_total = random.randint(13, 16)
    is_offense = random.random() < 0.5

    while our_score + opp_score < target_total:
        pt_uuid = U()
        lineup = [p["uuid"] for p in make_lineup()]
        clock += timedelta(seconds=random.uniform(20, 50))

        scored = None  # decided below
        had_our_turnover = False

        if is_offense:
            # Hold attempt from our own backfield.
            roll = random.random()
            if roll < hold_rate:
                # clean hold
                po_uuid, clock, scored = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.75, 0.95), clock, ends_in_score=True)
            elif roll < hold_rate + 0.23:
                # dirty hold: turn it over, force our own block/recovery, then score
                _, clock, _ = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.75, 0.95), clock, ends_in_score=False)
                had_our_turnover = True
                clock += timedelta(seconds=random.uniform(10, 30))
                if random.random() < 0.5:
                    opp_errors.append({"createdAt": iso(clock), "pointUUID": pt_uuid, "uuid": U()})
                else:
                    blocks.append({
                        "locationX": rand_x(), "pointUUID": pt_uuid, "isCallahan": False,
                        "uuid": U(), "locationY": random.uniform(0.3, 0.6), "isStallOut": random.random() < 0.3,
                        "playerUUID": random.choice(lineup),
                    })
                _, clock, scored = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.35, 0.6), clock, ends_in_score=True)
            else:
                # broken: turn it over and never get it back
                _, clock, _ = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.75, 0.95), clock, ends_in_score=False)
                had_our_turnover = True
                scored = False
        else:
            # Defensive point: try to force a turnover and break.
            roll = random.random()
            if roll < break_rate:
                # break: force a turnover right away, then score (clean break)
                clock += timedelta(seconds=random.uniform(15, 40))
                if random.random() < 0.5:
                    opp_errors.append({"createdAt": iso(clock), "pointUUID": pt_uuid, "uuid": U()})
                else:
                    blocks.append({
                        "locationX": rand_x(), "pointUUID": pt_uuid, "isCallahan": random.random() < 0.03,
                        "uuid": U(), "locationY": random.uniform(0.3, 0.6), "isStallOut": random.random() < 0.3,
                        "playerUUID": random.choice(lineup),
                    })
                _, clock, scored = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.35, 0.65), clock, ends_in_score=True)
            elif roll < break_rate + 0.15:
                # break, but dirty: we get it, turn it over ourselves, get it back again, then score
                clock += timedelta(seconds=random.uniform(15, 40))
                blocks.append({
                    "locationX": rand_x(), "pointUUID": pt_uuid, "isCallahan": False,
                    "uuid": U(), "locationY": random.uniform(0.3, 0.6), "isStallOut": False,
                    "playerUUID": random.choice(lineup),
                })
                _, clock, _ = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.35, 0.65), clock, ends_in_score=False)
                had_our_turnover = True
                clock += timedelta(seconds=random.uniform(10, 25))
                opp_errors.append({"createdAt": iso(clock), "pointUUID": pt_uuid, "uuid": U()})
                _, clock, scored = build_possession(
                    points, possessions, passes, blocks, opp_errors,
                    pt_uuid, lineup, random.uniform(0.35, 0.65), clock, ends_in_score=True)
            else:
                # opponent holds; we never touch the disc this point
                scored = False

        result = 1 if scored else -1
        if scored:
            our_score += 1
        else:
            opp_score += 1

        points.append({
            "uuid": pt_uuid, "isOffense": is_offense, "result": result,
            "playerUUIDs": lineup, "gameUUID": game_uuid, "createdAt": iso(clock),
        })
        clock += timedelta(seconds=random.uniform(20, 40))

        # Ultimate rule: whoever conceded receives (plays offense) next point.
        is_offense = not scored

    game["result"] = 1 if our_score > opp_score else (-1 if our_score < opp_score else 0)
    return game, points, possessions, passes, blocks, opp_errors, our_score, opp_score


def main():
    all_games, all_points, all_possessions, all_passes = [], [], [], []
    all_blocks, all_opp_errors = [], []

    game_plans = [
        (OPPONENTS[0], datetime(2026, 3, 7, 13, 0, 0), 1, 0.62, 0.40),    # win
        (OPPONENTS[1], datetime(2026, 3, 14, 13, 0, 0), -1, 0.40, 0.18),  # loss
        (OPPONENTS[2], datetime(2026, 3, 21, 13, 0, 0), 1, 0.62, 0.40),   # win
    ]

    for opponent, date, target, hold_rate, break_rate in game_plans:
        game, points, possessions, passes, blocks, opp_errors, our_s, opp_s = build_game(
            opponent, date, target, hold_rate, break_rate)
        # Re-roll if the target result didn't come out right (keeps the example's
        # narrative -- 2 wins, 1 loss -- reliable despite the randomness above).
        attempts = 0
        while ((target > 0 and our_s <= opp_s) or (target < 0 and our_s >= opp_s)) and attempts < 50:
            game, points, possessions, passes, blocks, opp_errors, our_s, opp_s = build_game(
                opponent, date, target, hold_rate, break_rate)
            attempts += 1
        all_games.append(game)
        all_points.extend(points)
        all_possessions.extend(possessions)
        all_passes.extend(passes)
        all_blocks.extend(blocks)
        all_opp_errors.extend(opp_errors)
        print(f"{opponent}: {our_s}-{opp_s} ({'W' if our_s > opp_s else 'L'})")

    data = {
        "teams": [{
            "uuid": TEAM_UUID,
            "data": {
                "team": {
                    "uuid": TEAM_UUID, "gender": 0, "imageData": {}, "name": "Sample Ultimate Club",
                    "minHuckDistance": 30, "createdAt": iso(NOW),
                },
                "relations": {
                    "points": all_points,
                    "concededGoals": [],
                    "groups": [],
                    "passes": all_passes,
                    "players": players,
                    "possessions": all_possessions,
                    "stallOutsAgainst": [],
                    "games": all_games,
                    "oppositionErrors": all_opp_errors,
                    "defensiveBlocks": all_blocks,
                },
            },
        }],
        "filename": "example_season.statto",
        "metadata": {},
    }

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "example_season.statto")
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("data.json", json.dumps(data))
        zf.writestr("app-version.txt", "1.6.10")

    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
