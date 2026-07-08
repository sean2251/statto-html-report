"""
The stats engine: turns raw Statto relations (points/possessions/passes/
blocks/...) into the report data structure consumed by templates/report.js.

The season report is built game by game (see _build_game_report): each game
contributes a "game report" (point log, box score, summary) and rolls its
box-score rows up into season_stats/season_games_played, which are then
reduced into the season leaderboard once every game has been processed.

Notes on the numbers: Huck/Swing/Dump classification and endzone boundaries
assume standard USAU pitch dimensions (a 70 x 40 yard playing field with 20
yard endzones); distances are computed in yards via constants.py.
"""

import math

from .constants import ENDZONE_FRACTION, FIELD_LENGTH_YD, FIELD_WIDTH_YD, HUCK_DISTANCE_YD
from .statto_io import fmt_display_date, safe_uuid


def _pct(numer, denom):
    return round(100.0 * numer / denom, 2) if denom else None


def _player_name_lookup(players_by_uuid):
    def player_name(uuid):
        uuid = safe_uuid(uuid)
        if not uuid:
            return None
        p = players_by_uuid.get(uuid)
        return p["name"] if p else None
    return player_name


def _index_passes_by_possession(all_passes):
    """Group every pass in the season by possessionUUID, sorted chronologically.

    This is season-wide (not per game) since possessionUUIDs are already
    unique across the whole export -- building it once and handing it to
    each game avoids redoing the same grouping/sort on every iteration.
    """
    passes_by_possession = {}
    for pa in all_passes:
        passes_by_possession.setdefault(pa.get("possessionUUID"), []).append(pa)
    for lst in passes_by_possession.values():
        lst.sort(key=lambda pa: pa.get("createdAt", ""))
    return passes_by_possession


# ---------------------------------------------------------------------------
# Per-game indexing: slice the season-wide relation lists down to this game's
# points/possessions/blocks, keyed the way the rest of this module expects
# (point/possession numbering, blocks grouped by point, etc).
# ---------------------------------------------------------------------------

def _index_game(game, all_points, all_possessions, all_blocks, all_opposition_errors, passes_by_possession):
    game_uuid = game["uuid"]
    points = [pt for pt in all_points if pt.get("gameUUID") == game_uuid]
    points.sort(key=lambda pt: pt.get("createdAt", ""))
    point_number = {pt["uuid"]: i + 1 for i, pt in enumerate(points)}

    possessions = [po for po in all_possessions if po.get("pointUUID") in point_number]
    possessions.sort(key=lambda po: po.get("createdAt", ""))
    possession_number = {}
    counter_per_point = {}
    for po in possessions:
        pt_uuid = po["pointUUID"]
        counter_per_point[pt_uuid] = counter_per_point.get(pt_uuid, 0) + 1
        possession_number[po["uuid"]] = counter_per_point[pt_uuid]

    possessions_by_point = {}
    for po in possessions:
        possessions_by_point.setdefault(po["pointUUID"], []).append(po)

    blocks_by_point = {}
    for bl in all_blocks:
        if bl.get("pointUUID") in point_number:
            blocks_by_point.setdefault(bl["pointUUID"], []).append(bl)

    opposition_errors_for_game = [oe for oe in all_opposition_errors if oe.get("pointUUID") in point_number]
    opp_errors_by_point = {}
    for oe in opposition_errors_for_game:
        opp_errors_by_point.setdefault(oe.get("pointUUID"), []).append(oe)

    return {
        "points": points,
        "point_number": point_number,
        "possessions": possessions,
        "possession_number": possession_number,
        "passes_by_possession": passes_by_possession,
        "possessions_by_point": possessions_by_point,
        "blocks_by_point": blocks_by_point,
        "opp_errors_by_point": opp_errors_by_point,
    }


# ---------------------------------------------------------------------------
# Point log + team-wide (combined/offense/defense) line stats for one game:
# clean/dirty holds, breaks, red-zone entries/conversions, and the per-point
# log entries (score progression, passes, blocks, lineup) shown on each
# game page.
# ---------------------------------------------------------------------------

def _build_point_log(idx, player_name):
    points = idx["points"]
    possessions_by_point = idx["possessions_by_point"]
    passes_by_possession = idx["passes_by_possession"]
    blocks_by_point = idx["blocks_by_point"]
    opp_errors_by_point = idx["opp_errors_by_point"]
    possession_number = idx["possession_number"]
    point_number = idx["point_number"]

    point_log = []
    our_score = 0
    opp_score = 0
    player_points_through = {}  # playerUUID -> cumulative points played so far this game
    point_touchers = {}   # pt_uuid -> set of playerUUIDs who threw or caught during the point
    point_qualifies = {}  # pt_uuid -> bool, started on offense OR the point included a block
    point_meta = {}       # pt_uuid -> {isOffense, scored, hadOppTurnover, hadOurTurnover}
    offense_points_total = 0
    clean_holds = 0
    dirty_holds = 0
    defense_points_total = 0
    breaks = 0
    clean_breaks = 0
    red_zone_entries = 0
    red_zone_conversions = 0
    red_zone_far = 2 * ENDZONE_FRACTION  # 20 yd in front of the goal line, i.e. 20 yd out from the endzone

    # Per-line-type (combined/offense/defense) team stats, for the Combined/O-line/D-line
    # toggle: same metrics as the game summary cards, but scoped to which side the point started on.
    line_stats = {
        bucket: {"throws": 0, "completions": 0, "huckAttempts": 0, "huckCompletions": 0,
                 "blocks": 0, "oppTurnovers": 0, "redZoneEntries": 0, "redZoneConversions": 0}
        for bucket in ("combined", "offense", "defense")
    }

    for pt in points:
        pt_uuid = pt["uuid"]
        pt_possessions = possessions_by_point.get(pt_uuid, [])
        pt_passes = []
        pass_entries = []
        pt_throws = 0
        pt_completions = 0
        pt_huck_attempts = 0
        pt_huck_completions = 0
        for po in pt_possessions:
            po_passes = passes_by_possession.get(po["uuid"], [])
            pt_passes.extend(po_passes)
            for pa in po_passes:
                sx, sy = pa.get("startX", 0.0), pa.get("startY", 0.0)
                ex, ey = pa.get("endX", 0.0), pa.get("endY", 0.0)
                is_te = bool(pa.get("isThrowerError"))
                is_re = bool(pa.get("isReceiverError"))
                completed = not is_te and not is_re
                pt_throws += 1
                if completed:
                    pt_completions += 1
                pass_gain_yd = (sy - ey) * FIELD_LENGTH_YD
                if pass_gain_yd >= HUCK_DISTANCE_YD:
                    pt_huck_attempts += 1
                    if completed:
                        pt_huck_completions += 1
                pass_entries.append({
                    "possession": possession_number[po["uuid"]],
                    "thrower": player_name(pa.get("throwerUUID")),
                    "receiver": player_name(pa.get("receiverUUID")),
                    "startX": sx, "startY": sy, "endX": ex, "endY": ey,
                    "turnover": is_te or is_re,
                    "throwerError": is_te,
                    "receiverError": is_re,
                    "assist": bool(pa.get("isAssist")),
                    "secondaryAssist": bool(pa.get("isSecondaryAssist")),
                })

        block_entries = []
        for bl in blocks_by_point.get(pt_uuid, []):
            block_entries.append({
                "player": player_name(bl.get("playerUUID")),
                "locationX": bl.get("locationX", 0.0),
                "locationY": bl.get("locationY", 0.0),
                "callahan": bool(bl.get("isCallahan")),
                "stallOut": bool(bl.get("isStallOut")),
            })

        touchers = set()
        for pa in pt_passes:
            tu = safe_uuid(pa.get("throwerUUID"))
            if tu:
                touchers.add(tu)
            ru = safe_uuid(pa.get("receiverUUID"))
            if ru:
                touchers.add(ru)
        point_touchers[pt_uuid] = touchers
        point_qualifies[pt_uuid] = bool(pt.get("isOffense")) or bool(block_entries)

        assist_pass = next((pa for pa in pt_passes if pa.get("isAssist")), None)
        sec_assist_pass = next((pa for pa in pt_passes if pa.get("isSecondaryAssist")), None)
        result = pt.get("result", 0)
        scored = result == 1
        is_offense = bool(pt.get("isOffense"))
        had_turnover = any(pa.get("isThrowerError") or pa.get("isReceiverError") for pa in pt_passes)
        had_opp_turnover = bool(block_entries) or bool(opp_errors_by_point.get(pt_uuid))
        point_meta[pt_uuid] = {
            "isOffense": is_offense,
            "scored": scored,
            "hadOppTurnover": had_opp_turnover,
            "hadOurTurnover": had_turnover,
        }

        if is_offense:
            offense_points_total += 1
            if scored:
                if had_turnover:
                    dirty_holds += 1
                else:
                    clean_holds += 1
        else:
            defense_points_total += 1
            if scored:
                breaks += 1
                if not had_turnover:
                    clean_breaks += 1

        # Red zone: did we have the disc (about to throw) within 20 yd of our
        # attacking endzone at any point? A throw's start location is used as
        # the "we have the disc here" marker, since that's true regardless of
        # whether the throw itself succeeds.
        entered_red_zone = any(
            ENDZONE_FRACTION < pa.get("startY", 0.0) <= red_zone_far for pa in pt_passes
        )
        if entered_red_zone:
            red_zone_entries += 1
            # Ignore scores where the actual assist was a huck thrown from
            # beyond 20 yd out -- that's not a conversion of the red-zone look.
            if scored and assist_pass is not None and assist_pass.get("startY", 0.0) <= red_zone_far:
                red_zone_conversions += 1

        pt_opp_turnovers = len(block_entries) + len(opp_errors_by_point.get(pt_uuid, []))
        pt_red_zone_conversion = bool(
            entered_red_zone and scored and assist_pass is not None
            and assist_pass.get("startY", 0.0) <= red_zone_far
        )
        bucket = "offense" if is_offense else "defense"
        for key in ("combined", bucket):
            ls = line_stats[key]
            ls["throws"] += pt_throws
            ls["completions"] += pt_completions
            ls["huckAttempts"] += pt_huck_attempts
            ls["huckCompletions"] += pt_huck_completions
            ls["blocks"] += len(block_entries)
            ls["oppTurnovers"] += pt_opp_turnovers
            ls["redZoneEntries"] += 1 if entered_red_zone else 0
            ls["redZoneConversions"] += 1 if pt_red_zone_conversion else 0

        lineup = []
        for puuid in pt.get("playerUUIDs", []) or []:
            lineup.append({
                "player": player_name(puuid),
                "pointsThrough": player_points_through.get(puuid, 0) + 1,
            })
        lineup.sort(key=lambda x: x["player"])
        for puuid in pt.get("playerUUIDs", []) or []:
            player_points_through[puuid] = player_points_through.get(puuid, 0) + 1

        point_log.append({
            "number": point_number[pt_uuid],
            "isOffense": is_offense,
            "scored": scored,
            "result": result,
            "ourScoreBefore": our_score,
            "oppScoreBefore": opp_score,
            "assist": player_name(assist_pass["throwerUUID"]) if assist_pass else None,
            "secondaryAssist": player_name(sec_assist_pass["throwerUUID"]) if sec_assist_pass else None,
            "goal": player_name(assist_pass["receiverUUID"]) if assist_pass else None,
            "passes": pass_entries,
            "blocks": block_entries,
            "lineup": lineup,
        })

        if result == 1:
            our_score += 1
        elif result == -1:
            opp_score += 1

    return {
        "point_log": point_log,
        "our_score": our_score,
        "opp_score": opp_score,
        "point_touchers": point_touchers,
        "point_qualifies": point_qualifies,
        "point_meta": point_meta,
        "line_stats": line_stats,
        "offense_points_total": offense_points_total,
        "clean_holds": clean_holds,
        "dirty_holds": dirty_holds,
        "defense_points_total": defense_points_total,
        "breaks": breaks,
        "clean_breaks": clean_breaks,
        "red_zone_entries": red_zone_entries,
        "red_zone_conversions": red_zone_conversions,
    }


# ---------------------------------------------------------------------------
# Per-possession scoring efficiency (team-wide, for the "Per Possession" view).
# A possession is "ours" by definition (this dataset only tracks our team's
# actions); it counts as scored if its final recorded pass was the assist.
# ---------------------------------------------------------------------------

def _possession_scoring_efficiency(idx):
    points = idx["points"]
    possessions = idx["possessions"]
    passes_by_possession = idx["passes_by_possession"]

    pt_is_offense = {pt["uuid"]: bool(pt.get("isOffense")) for pt in points}
    numer = {"total": 0, "offense": 0, "defense": 0}
    denom = {"total": 0, "offense": 0, "defense": 0}
    for po in possessions:
        po_passes = passes_by_possession.get(po["uuid"], [])
        po_scored = bool(po_passes[-1].get("isAssist")) if po_passes else False
        po_is_offense = pt_is_offense.get(po["pointUUID"], False)
        denom["total"] += 1
        if po_scored:
            numer["total"] += 1
        bucket = "offense" if po_is_offense else "defense"
        denom[bucket] += 1
        if po_scored:
            numer[bucket] += 1

    return numer, denom


# ---------------------------------------------------------------------------
# Per-game player box score. Also accumulates each player's raw counts into
# season_stats/season_games_played (mutated in place) so the season
# leaderboard can be built once every game has been processed -- percentages
# are re-derived from the summed raw counts afterwards, not averaged as an
# average-of-averages.
# ---------------------------------------------------------------------------

def _build_box_score(idx, point_log_ctx, all_blocks, all_stallouts, player_name,
                      season_stats, season_games_played):
    points = idx["points"]
    point_number = idx["point_number"]
    possessions = idx["possessions"]
    possession_number = idx["possession_number"]
    passes_by_possession = idx["passes_by_possession"]
    point_touchers = point_log_ctx["point_touchers"]
    point_qualifies = point_log_ctx["point_qualifies"]
    point_meta = point_log_ctx["point_meta"]

    game_player_points = {}
    for pt in points:
        for puuid in pt.get("playerUUIDs", []) or []:
            if not isinstance(puuid, str):
                continue
            game_player_points.setdefault(puuid, set()).add(point_number[pt["uuid"]])

    game_passes = [pa for po in possessions for pa in passes_by_possession.get(po["uuid"], [])]
    uuid_by_number = {v: k for k, v in point_number.items()}

    box_score = []
    for puuid, points_played_set in game_player_points.items():
        offense_played = sum(1 for pt in points if point_number[pt["uuid"]] in points_played_set and pt.get("isOffense"))
        defense_played = len(points_played_set) - offense_played
        offense_won = sum(1 for pt in points if point_number[pt["uuid"]] in points_played_set and pt.get("isOffense") and pt.get("result") == 1)
        defense_won = sum(1 for pt in points if point_number[pt["uuid"]] in points_played_set and not pt.get("isOffense") and pt.get("result") == 1)

        throws = thrower_errors = 0
        catches = receiver_errors = 0
        assists = sec_assists = goals = 0
        throw_dist_total = throw_gain_total = 0.0
        catch_dist_total = catch_gain_total = 0.0
        receiving_targets = 0
        huck_attempts = huck_completions = 0
        assist_attempts = 0
        throw_incomplete = 0
        throw_incomplete_dist_total = 0.0
        catch_incomplete_dist_total = 0.0
        huck_targets = huck_receptions = 0
        assist_reception_attempts = 0

        for pa in game_passes:
            is_te = bool(pa.get("isThrowerError"))
            is_re = bool(pa.get("isReceiverError"))
            completed = not is_te and not is_re
            sx, sy = pa.get("startX", 0.0), pa.get("startY", 0.0)
            ex, ey = pa.get("endX", 0.0), pa.get("endY", 0.0)
            dist_yd = math.hypot((sx - ex) * FIELD_WIDTH_YD, (sy - ey) * FIELD_LENGTH_YD)
            gain_yd = (sy - ey) * FIELD_LENGTH_YD

            if pa.get("throwerUUID") == puuid:
                throws += 1
                if is_te:
                    thrower_errors += 1
                if is_te or is_re:
                    throw_incomplete += 1
                    throw_incomplete_dist_total += dist_yd
                if completed:
                    throw_dist_total += dist_yd
                    throw_gain_total += gain_yd
                if pa.get("isAssist"):
                    assists += 1
                if pa.get("isSecondaryAssist"):
                    sec_assists += 1
                if gain_yd >= HUCK_DISTANCE_YD:
                    huck_attempts += 1
                    if completed:
                        huck_completions += 1
                if ey < ENDZONE_FRACTION:
                    assist_attempts += 1
            if pa.get("receiverUUID") == puuid:
                receiving_targets += 1
                if is_re:
                    receiver_errors += 1
                if completed:
                    catches += 1
                    catch_dist_total += dist_yd
                    catch_gain_total += gain_yd
                else:
                    catch_incomplete_dist_total += dist_yd
                if pa.get("isAssist"):
                    goals += 1
                if gain_yd >= HUCK_DISTANCE_YD:
                    huck_targets += 1
                    if completed:
                        huck_receptions += 1
                if ey < ENDZONE_FRACTION:
                    assist_reception_attempts += 1

        possessions_initiated = sum(1 for po in possessions if po.get("initiatorUUID") == puuid)
        def_blocks_count = sum(1 for bl in all_blocks if bl.get("playerUUID") == puuid and bl.get("pointUUID") in point_number)
        stall_for = sum(1 for bl in all_blocks if bl.get("playerUUID") == puuid and bl.get("pointUUID") in point_number and bl.get("isStallOut"))
        stall_against = sum(1 for so in all_stallouts if so.get("playerUUID") == puuid and so.get("possessionUUID") in possession_number)

        turnovers = thrower_errors + receiver_errors
        touches = catches + possessions_initiated
        throw_completions = throws - throw_incomplete
        plus_minus = goals + assists - turnovers

        util_qualifying = 0
        util_touched = 0
        for num in points_played_set:
            pt_uuid_n = uuid_by_number[num]
            if point_qualifies.get(pt_uuid_n):
                util_qualifying += 1
                if puuid in point_touchers.get(pt_uuid_n, set()):
                    util_touched += 1

        def_turnover_points = 0
        turnover_recovery_denom = 0
        turnover_recovery_numer = 0
        for num in points_played_set:
            pt_uuid_n = uuid_by_number[num]
            meta = point_meta.get(pt_uuid_n, {})
            if not meta.get("isOffense") and meta.get("hadOppTurnover"):
                def_turnover_points += 1
            if meta.get("hadOurTurnover"):
                turnover_recovery_denom += 1
                if meta.get("scored"):
                    turnover_recovery_numer += 1

        row = {
            "playerUUID": puuid,
            "player": player_name(puuid),
            "pointsPlayed": len(points_played_set),
            "offensePlayed": offense_played,
            "defensePlayed": defense_played,
            "offenseWon": offense_won,
            "defenseWon": defense_won,
            "touches": touches,
            "throws": throws,
            "throwCompletions": throw_completions,
            "throwCompletionPct": _pct(throw_completions, throws),
            "catches": catches,
            "receivingTargets": receiving_targets,
            "catchCompletionPct": _pct(catches, receiving_targets),
            "possessionsInitiated": possessions_initiated,
            "assists": assists,
            "secondaryAssists": sec_assists,
            "assistAttempts": assist_attempts,
            "assistCompletionPct": _pct(assists, assist_attempts),
            "goals": goals,
            "plusMinus": plus_minus,
            "turnovers": turnovers,
            "throwerErrors": thrower_errors,
            "receiverErrors": receiver_errors,
            "blocks": def_blocks_count,
            "stallsFor": stall_for,
            "stallsAgainst": stall_against,
            "huckAttempts": huck_attempts,
            "huckCompletions": huck_completions,
            "huckCompletionPct": _pct(huck_completions, huck_attempts),
            "huckTargets": huck_targets,
            "huckReceptions": huck_receptions,
            "huckReceptionPct": _pct(huck_receptions, huck_targets),
            "assistReceptionAttempts": assist_reception_attempts,
            "assistReceptionPct": _pct(goals, assist_reception_attempts),
            "utilQualifyingPoints": util_qualifying,
            "utilTouchedPoints": util_touched,
            "offensiveUtilization": _pct(util_touched, util_qualifying),
            "totalScoringEfficiency": _pct(offense_won + defense_won, len(points_played_set)),
            "offensiveScoringEfficiency": _pct(offense_won, offense_played),
            "defensiveScoringEfficiency": _pct(defense_won, defense_played),
            "defTurnoverPoints": def_turnover_points,
            "defensiveTurnoverEfficiency": _pct(def_turnover_points, defense_played),
            "turnoverRecoveryDenom": turnover_recovery_denom,
            "turnoverRecoveryNumer": turnover_recovery_numer,
            "pointRecovery": _pct(turnover_recovery_numer, turnover_recovery_denom),
            "throwDist": throw_dist_total,
            "throwGain": throw_gain_total,
            "catchDist": catch_dist_total,
            "catchGain": catch_gain_total,
            "throwIncompleteDist": throw_incomplete_dist_total,
            "catchIncompleteDist": catch_incomplete_dist_total,
        }
        box_score.append(row)

        # accumulate season totals (raw/summable counts only; percentages are
        # re-derived after summing so they aren't just an average-of-averages)
        acc = season_stats.setdefault(puuid, {
            "player": player_name(puuid), "pointsPlayed": 0, "offensePlayed": 0,
            "defensePlayed": 0, "offenseWon": 0, "defenseWon": 0, "touches": 0,
            "throws": 0, "throwCompletions": 0, "catches": 0, "receivingTargets": 0,
            "possessionsInitiated": 0, "assists": 0, "secondaryAssists": 0,
            "assistAttempts": 0, "goals": 0, "plusMinus": 0, "turnovers": 0,
            "throwerErrors": 0, "receiverErrors": 0, "blocks": 0, "stallsFor": 0,
            "stallsAgainst": 0, "huckAttempts": 0, "huckCompletions": 0,
            "huckTargets": 0, "huckReceptions": 0, "assistReceptionAttempts": 0,
            "utilQualifyingPoints": 0, "utilTouchedPoints": 0,
            "defTurnoverPoints": 0, "turnoverRecoveryDenom": 0, "turnoverRecoveryNumer": 0,
            "throwDist": 0.0, "throwGain": 0.0, "catchDist": 0.0, "catchGain": 0.0,
            "throwIncompleteDist": 0.0, "catchIncompleteDist": 0.0,
        })
        for k in acc:
            if k != "player":
                acc[k] += row[k]
        season_games_played[puuid] = season_games_played.get(puuid, 0) + 1

    box_score.sort(key=lambda r: r["pointsPlayed"], reverse=True)
    return box_score


# ---------------------------------------------------------------------------
# Game summary: hold/break rates, per-line-type box stats, and the three
# scoring-efficiency views (per point / per possession / first possession).
# ---------------------------------------------------------------------------

def _build_game_summary(point_log_ctx, pp_numer, pp_denom):
    line_stats = point_log_ctx["line_stats"]
    clean_holds = point_log_ctx["clean_holds"]
    dirty_holds = point_log_ctx["dirty_holds"]
    breaks = point_log_ctx["breaks"]
    clean_breaks = point_log_ctx["clean_breaks"]
    offense_points_total = point_log_ctx["offense_points_total"]
    defense_points_total = point_log_ctx["defense_points_total"]
    total_points = offense_points_total + defense_points_total

    def eff(numer, denom):
        return {"numer": numer, "denom": denom, "pct": _pct(numer, denom)}

    def line_summary(bucket):
        d = line_stats[bucket]
        return {
            "throws": d["throws"],
            "throwCompletions": d["completions"],
            "throwCompletionPct": _pct(d["completions"], d["throws"]),
            "huckAttempts": d["huckAttempts"],
            "huckCompletions": d["huckCompletions"],
            "huckCompletionPct": _pct(d["huckCompletions"], d["huckAttempts"]),
            "blocks": d["blocks"],
            "opponentTurnovers": d["oppTurnovers"],
            "redZoneEntries": d["redZoneEntries"],
            "redZoneConversions": d["redZoneConversions"],
            "redZoneRate": _pct(d["redZoneConversions"], d["redZoneEntries"]),
        }

    return {
        "offensePointsTotal": offense_points_total,
        "cleanHolds": clean_holds,
        "dirtyHolds": dirty_holds,
        "holdRate": _pct(clean_holds + dirty_holds, offense_points_total),
        "defensePointsTotal": defense_points_total,
        "breaks": breaks,
        "breakRate": _pct(breaks, defense_points_total),
        "lineStats": {
            "combined": line_summary("combined"),
            "offense": line_summary("offense"),
            "defense": line_summary("defense"),
        },
        "scoringEfficiency": {
            "perPoint": {
                "total": eff(clean_holds + dirty_holds + breaks, total_points),
                "offense": eff(clean_holds + dirty_holds, offense_points_total),
                "defense": eff(breaks, defense_points_total),
            },
            "perPossession": {
                "total": eff(pp_numer["total"], pp_denom["total"]),
                "offense": eff(pp_numer["offense"], pp_denom["offense"]),
                "defense": eff(pp_numer["defense"], pp_denom["defense"]),
            },
            "firstPossession": {
                "total": eff(clean_holds + clean_breaks, total_points),
                "offense": eff(clean_holds, offense_points_total),
                "defense": eff(clean_breaks, defense_points_total),
            },
        },
    }


def _build_game_report(game, all_points, all_possessions, all_blocks, all_stallouts,
                        all_opposition_errors, passes_by_possession, player_name,
                        season_stats, season_games_played):
    """Process one game end to end: point log, box score, and summary."""
    idx = _index_game(game, all_points, all_possessions, all_blocks,
                       all_opposition_errors, passes_by_possession)

    point_log_ctx = _build_point_log(idx, player_name)
    pp_numer, pp_denom = _possession_scoring_efficiency(idx)
    box_score = _build_box_score(idx, point_log_ctx, all_blocks, all_stallouts,
                                  player_name, season_stats, season_games_played)
    summary = _build_game_summary(point_log_ctx, pp_numer, pp_denom)

    our_score = point_log_ctx["our_score"]
    opp_score = point_log_ctx["opp_score"]
    if our_score > opp_score:
        result_char = "W"
    elif our_score < opp_score:
        result_char = "L"
    else:
        result_char = "T"

    game_report = {
        "opponent": game.get("opponent", "Unknown"),
        "date": game.get("date", ""),
        "dateDisplay": fmt_display_date(game.get("date", "")),
        "ourScore": our_score,
        "oppScore": opp_score,
        "result": result_char,
        "points": point_log_ctx["point_log"],
        "boxScore": box_score,
        "summary": summary,
    }
    return game_report, result_char


# ---------------------------------------------------------------------------
# Season-wide rollups, built once every game has contributed to season_stats.
# ---------------------------------------------------------------------------

def _build_season_leaderboard(season_stats, season_games_played):
    season_leaderboard = []
    for puuid, acc in season_stats.items():
        row = dict(acc)
        row["playerUUID"] = puuid
        row["gamesPlayed"] = season_games_played.get(puuid, 0)
        row["throwCompletionPct"] = _pct(row["throwCompletions"], row["throws"])
        row["catchCompletionPct"] = _pct(row["catches"], row["receivingTargets"])
        row["huckCompletionPct"] = _pct(row["huckCompletions"], row["huckAttempts"])
        row["assistCompletionPct"] = _pct(row["assists"], row["assistAttempts"])
        row["huckReceptionPct"] = _pct(row["huckReceptions"], row["huckTargets"])
        row["assistReceptionPct"] = _pct(row["goals"], row["assistReceptionAttempts"])
        row["offensiveUtilization"] = _pct(row["utilTouchedPoints"], row["utilQualifyingPoints"])
        row["totalScoringEfficiency"] = _pct(row["offenseWon"] + row["defenseWon"], row["pointsPlayed"])
        row["offensiveScoringEfficiency"] = _pct(row["offenseWon"], row["offensePlayed"])
        row["defensiveScoringEfficiency"] = _pct(row["defenseWon"], row["defensePlayed"])
        row["defensiveTurnoverEfficiency"] = _pct(row["defTurnoverPoints"], row["defensePlayed"])
        row["pointRecovery"] = _pct(row["turnoverRecoveryNumer"], row["turnoverRecoveryDenom"])
        season_leaderboard.append(row)
    season_leaderboard.sort(key=lambda r: r["pointsPlayed"], reverse=True)
    return season_leaderboard


def _build_season_scoring_efficiency(game_reports):
    def sum_eff(mode, category):
        numer = sum(g["summary"]["scoringEfficiency"][mode][category]["numer"] for g in game_reports)
        denom = sum(g["summary"]["scoringEfficiency"][mode][category]["denom"] for g in game_reports)
        return {"numer": numer, "denom": denom, "pct": _pct(numer, denom)}

    return {
        mode: {category: sum_eff(mode, category) for category in ("total", "offense", "defense")}
        for mode in ("perPoint", "perPossession", "firstPossession")
    }


def compute_team_report(relations, team_name):
    """Build the full season report dict for one team from raw Statto relations."""
    players_by_uuid = {p["uuid"]: p for p in relations.get("players", [])}
    # Statto's native "gender" field (0/1) already encodes the WMP/MMP matching
    # designation used for mixed-gender lines -- verified against this roster's
    # own point-by-point rosters, which split cleanly 4-and-3 or 3-and-4 by this
    # field on every single point, never anything else.
    player_genders = {p["name"]: p.get("gender") for p in relations.get("players", []) if p.get("name")}
    games = relations.get("games", [])
    all_points = relations.get("points", [])
    all_possessions = relations.get("possessions", [])
    all_passes = relations.get("passes", [])
    all_blocks = relations.get("defensiveBlocks", [])
    all_stallouts = relations.get("stallOutsAgainst", [])
    all_opposition_errors = relations.get("oppositionErrors", [])

    player_name = _player_name_lookup(players_by_uuid)
    passes_by_possession = _index_passes_by_possession(all_passes)
    games_sorted = sorted(games, key=lambda g: g.get("date", ""))

    game_reports = []
    season_stats = {}  # playerUUID -> accumulator dict
    season_games_played = {}  # playerUUID -> count of games with any points played
    wins = losses = ties = 0

    for game in games_sorted:
        game_report, result_char = _build_game_report(
            game, all_points, all_possessions, all_blocks, all_stallouts,
            all_opposition_errors, passes_by_possession, player_name,
            season_stats, season_games_played,
        )
        game_reports.append(game_report)
        if result_char == "W":
            wins += 1
        elif result_char == "L":
            losses += 1
        else:
            ties += 1

    return {
        "teamName": team_name,
        "record": {"wins": wins, "losses": losses, "ties": ties},
        "games": game_reports,
        "seasonLeaderboard": _build_season_leaderboard(season_stats, season_games_played),
        "seasonScoringEfficiency": _build_season_scoring_efficiency(game_reports),
        "playerGenders": player_genders,
    }
