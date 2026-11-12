// The stats engine, in JavaScript: a faithful port of statto_report/stats.py
// (plus the bits of statto_io.py it needs), so a .statto export can be turned
// into the report data structure entirely in the browser -- no Python needed.
//
// It must produce exactly what the Python version produces: tests/
// test_stats_parity.py runs both on the same exports and compares the results.
// When you change one, change the other (until the Python one is retired).
//
// Usable as a plain <script> (defines window.StattoStats) and from Node
// (module.exports), with no dependencies:
//   StattoStats.readStatto(arrayBuffer) -> Promise<data.json contents>
//   StattoStats.computeTeamReport(relations, teamName) -> report
//   StattoStats.reportFromStatto(arrayBuffer) -> Promise<{ report, teamName }>
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StattoStats = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- constants (statto_report/constants.py) ----
  const FIELD_WIDTH_YD = 40.0;
  const FIELD_LENGTH_YD = 110.0;
  const ENDZONE_FRACTION = 20.0 / FIELD_LENGTH_YD;
  const HUCK_DISTANCE_YD = 27.0;
  const HIGH_LEVERAGE_THRESHOLD = 7.0;

  // ---- Python-compatible helpers ----

  // Python's round(x, n): rounds to the nearest representable decimal, with
  // exact halves going to the even digit (round(0.125, 2) == 0.12), judged on
  // the double's exact value (round(2.675, 2) == 2.67).
  function pyRound(x, n) {
    if (!isFinite(x)) return x;
    const neg = x < 0;
    // toFixed computes the exact decimal expansion (up to 100 digits, plenty
    // for the magnitudes here), so ties are judged on the double's true value.
    const [intPart, frac] = Math.abs(x).toFixed(100).split('.');
    let big = BigInt(intPart + frac.slice(0, n));
    const next = frac[n], tail = frac.slice(n + 1);
    const up = next > '5' || (next === '5' && (/[1-9]/.test(tail) || big % 2n === 1n));
    if (up) big += 1n;
    const str = big.toString().padStart(n + 1, '0');
    const out = Number(str.slice(0, str.length - n) + '.' + str.slice(str.length - n));
    return neg ? -out : out;
  }

  function pct(numer, denom) {
    return denom ? pyRound(100.0 * numer / denom, 2) : null;
  }

  // dict.get(key, default): the default only when the key is absent.
  function get(obj, key, dflt) {
    return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : dflt;
  }

  function safeUuid(v) { return typeof v === 'string' ? v : null; }

  // Python string ordering for sort keys (code point order).
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function sortBy(arr, keyFn, reverse) {
    // Array.prototype.sort is stable, like Python's sorted().
    return arr.sort((x, y) => (reverse ? -1 : 1) * cmp(keyFn(x), keyFn(y)));
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // statto_io.fmt_display_date: 'Jul 8, 2026', or the input unchanged if unparseable.
  function fmtDisplayDate(isoTs) {
    if (!isoTs) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:[+-]\d{2}:?\d{2})?$/.exec(String(isoTs).replace('Z', ''));
    if (!m) return isoTs;
    const month = Number(m[2]), day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return isoTs;
    return MONTHS[month - 1] + ' ' + day + ', ' + m[1];
  }

  function playerNameLookup(playersByUuid) {
    return function playerName(uuid) {
      uuid = safeUuid(uuid);
      if (!uuid) return null;
      const p = playersByUuid.get(uuid);
      return p ? p.name : null;
    };
  }

  function indexPassesByPossession(allPasses) {
    const byPossession = new Map();
    for (const pa of allPasses) {
      const k = get(pa, 'possessionUUID', null);
      if (!byPossession.has(k)) byPossession.set(k, []);
      byPossession.get(k).push(pa);
    }
    for (const lst of byPossession.values()) sortBy(lst, pa => get(pa, 'createdAt', ''));
    return byPossession;
  }

  function groupInto(map, key, value) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  }

  // ---- per-game indexing ----
  function indexGame(game, allPoints, allPossessions, allBlocks, allOppositionErrors, passesByPossession) {
    const gameUuid = game.uuid;
    const points = sortBy(allPoints.filter(pt => get(pt, 'gameUUID', null) === gameUuid && [1, -1].includes(get(pt, 'result', null))),
      pt => get(pt, 'createdAt', ''));
    const pointNumber = new Map(points.map((pt, i) => [pt.uuid, i + 1]));

    const possessions = sortBy(allPossessions.filter(po => pointNumber.has(get(po, 'pointUUID', null))), po => get(po, 'createdAt', ''));
    const possessionNumber = new Map();
    const counterPerPoint = new Map();
    for (const po of possessions) {
      const n = (counterPerPoint.get(po.pointUUID) || 0) + 1;
      counterPerPoint.set(po.pointUUID, n);
      possessionNumber.set(po.uuid, n);
    }
    const possessionsByPoint = new Map();
    for (const po of possessions) groupInto(possessionsByPoint, po.pointUUID, po);

    const blocksByPoint = new Map();
    for (const bl of allBlocks) if (pointNumber.has(get(bl, 'pointUUID', null))) groupInto(blocksByPoint, bl.pointUUID, bl);

    const oppErrorsByPoint = new Map();
    for (const oe of allOppositionErrors) if (pointNumber.has(get(oe, 'pointUUID', null))) groupInto(oppErrorsByPoint, get(oe, 'pointUUID', null), oe);

    return { points, pointNumber, possessions, possessionNumber, passesByPossession, possessionsByPoint, blocksByPoint, oppErrorsByPoint };
  }

  // ---- point leverage ----
  function leverageWinProbTable(target) {
    const wp = [];
    for (let i = 0; i <= target; i++) wp.push(new Array(target + 1).fill(0.0));
    for (let i = target; i >= 0; i--) {
      for (let j = target; j >= 0; j--) {
        if (i === target) wp[i][j] = 1.0;
        else if (j === target) wp[i][j] = 0.0;
        else wp[i][j] = 0.5 * wp[i + 1][j] + 0.5 * wp[i][j + 1];
      }
    }
    return wp;
  }

  function pointLeverage(wp, ourBefore, oppBefore, target) {
    if (ourBefore >= target || oppBefore >= target) return 10.0;
    const raw = Math.abs(wp[ourBefore + 1][oppBefore] - wp[ourBefore][oppBefore + 1]);
    return pyRound(Math.pow(raw, 0.5) * 10, 2);
  }

  function eff(numer, denom) { return { numer, denom, pct: pct(numer, denom) }; }

  function leverageSplitEfficiency(pointLog, threshold) {
    function bucketSummary(pts) {
      const offense = pts.filter(p => p.isOffense);
      const defense = pts.filter(p => !p.isOffense);
      const offScored = offense.filter(p => p.scored).length;
      const defScored = defense.filter(p => p.scored).length;
      return {
        pointCount: pts.length,
        holdRate: eff(offScored, offense.length),
        breakRate: eff(defScored, defense.length),
        totalScoringEfficiency: eff(offScored + defScored, pts.length),
      };
    }
    return {
      highLeverage: bucketSummary(pointLog.filter(p => p.leverage >= threshold)),
      lowLeverage: bucketSummary(pointLog.filter(p => p.leverage < threshold)),
    };
  }

  // ---- point log + line stats ----
  function buildPointLog(idx, playerName, allStallouts) {
    const { points, possessionsByPoint, passesByPossession, blocksByPoint, oppErrorsByPoint, possessionNumber, pointNumber } = idx;
    const stalledPossessionUuids = new Set(allStallouts.map(so => get(so, 'possessionUUID', null)));

    const pointLog = [];
    let ourScore = 0, oppScore = 0;
    const playerPointsThrough = new Map();
    const pointTouchers = new Map();
    const pointQualifies = new Map();
    const pointMeta = new Map();
    let offensePointsTotal = 0, cleanHolds = 0, dirtyHolds = 0, defensePointsTotal = 0, breaks = 0, cleanBreaks = 0;
    let redZoneEntries = 0, redZoneConversions = 0;
    const redZoneFar = 2 * ENDZONE_FRACTION;

    const lineStats = {};
    for (const b of ['combined', 'offense', 'defense']) {
      lineStats[b] = { throws: 0, completions: 0, huckAttempts: 0, huckCompletions: 0, blocks: 0, oppTurnovers: 0, redZoneEntries: 0, redZoneConversions: 0 };
    }

    for (const pt of points) {
      const ptUuid = pt.uuid;
      const ptPossessions = possessionsByPoint.get(ptUuid) || [];
      const ptPasses = [];
      const passEntries = [];
      let ptThrows = 0, ptCompletions = 0, ptHuckAttempts = 0, ptHuckCompletions = 0;
      for (const po of ptPossessions) {
        const poPasses = passesByPossession.get(po.uuid) || [];
        ptPasses.push(...poPasses);
        for (const pa of poPasses) {
          const sx = get(pa, 'startX', 0.0), sy = get(pa, 'startY', 0.0);
          const ex = get(pa, 'endX', 0.0), ey = get(pa, 'endY', 0.0);
          const isTe = !!get(pa, 'isThrowerError', null);
          const isRe = !!get(pa, 'isReceiverError', null);
          const completed = !isTe && !isRe;
          ptThrows += 1;
          if (completed) ptCompletions += 1;
          const passGainYd = (sy - ey) * FIELD_LENGTH_YD;
          if (passGainYd >= HUCK_DISTANCE_YD) {
            ptHuckAttempts += 1;
            if (completed) ptHuckCompletions += 1;
          }
          passEntries.push({
            uuid: get(pa, 'uuid', null),
            possession: possessionNumber.get(po.uuid),
            thrower: playerName(get(pa, 'throwerUUID', null)),
            receiver: playerName(get(pa, 'receiverUUID', null)),
            startX: sx, startY: sy, endX: ex, endY: ey,
            turnover: isTe || isRe,
            throwerError: isTe,
            receiverError: isRe,
            assist: !!get(pa, 'isAssist', null),
            secondaryAssist: !!get(pa, 'isSecondaryAssist', null),
          });
        }
      }

      const blockEntries = [];
      for (const bl of (blocksByPoint.get(ptUuid) || [])) {
        const blCreated = get(bl, 'createdAt', '');
        const afterOurPossessions = ptPossessions.filter(po => get(po, 'createdAt', '') < blCreated).length;
        blockEntries.push({
          uuid: get(bl, 'uuid', null),
          player: playerName(get(bl, 'playerUUID', null)),
          locationX: get(bl, 'locationX', 0.0),
          locationY: get(bl, 'locationY', 0.0),
          callahan: !!get(bl, 'isCallahan', null),
          stallOut: !!get(bl, 'isStallOut', null),
          createdAt: blCreated,
          afterOurPossessions,
        });
      }

      const touchers = new Set();
      for (const pa of ptPasses) {
        const tu = safeUuid(get(pa, 'throwerUUID', null));
        if (tu) touchers.add(tu);
        const ru = safeUuid(get(pa, 'receiverUUID', null));
        if (ru) touchers.add(ru);
      }
      pointTouchers.set(ptUuid, touchers);
      pointQualifies.set(ptUuid, !!get(pt, 'isOffense', null) || blockEntries.length > 0);

      const assistPass = ptPasses.find(pa => get(pa, 'isAssist', null)) || null;
      const secAssistPass = ptPasses.find(pa => get(pa, 'isSecondaryAssist', null)) || null;
      const result = get(pt, 'result', 0);
      const scored = result === 1;
      const isOffense = !!get(pt, 'isOffense', null);
      const hadTurnover = ptPasses.some(pa => get(pa, 'isThrowerError', null) || get(pa, 'isReceiverError', null))
        || ptPossessions.some(po => stalledPossessionUuids.has(get(po, 'uuid', null)));
      const oppErrs = oppErrorsByPoint.get(ptUuid) || [];
      const hadOppTurnover = blockEntries.length > 0 || oppErrs.length > 0;
      pointMeta.set(ptUuid, { isOffense, scored, hadOppTurnover, hadOurTurnover: hadTurnover });

      if (isOffense) {
        offensePointsTotal += 1;
        if (scored) { if (hadTurnover) dirtyHolds += 1; else cleanHolds += 1; }
      } else {
        defensePointsTotal += 1;
        if (scored) { breaks += 1; if (!hadTurnover) cleanBreaks += 1; }
      }

      const enteredRedZone = ptPasses.some(pa => { const y = get(pa, 'startY', 0.0); return ENDZONE_FRACTION < y && y <= redZoneFar; });
      if (enteredRedZone) {
        redZoneEntries += 1;
        if (scored && assistPass !== null && get(assistPass, 'startY', 0.0) <= redZoneFar) redZoneConversions += 1;
      }

      const ptOppTurnovers = blockEntries.length + oppErrs.length;
      const ptRedZoneConversion = !!(enteredRedZone && scored && assistPass !== null && get(assistPass, 'startY', 0.0) <= redZoneFar);
      const bucket = isOffense ? 'offense' : 'defense';
      for (const key of ['combined', bucket]) {
        const ls = lineStats[key];
        ls.throws += ptThrows;
        ls.completions += ptCompletions;
        ls.huckAttempts += ptHuckAttempts;
        ls.huckCompletions += ptHuckCompletions;
        ls.blocks += blockEntries.length;
        ls.oppTurnovers += ptOppTurnovers;
        ls.redZoneEntries += enteredRedZone ? 1 : 0;
        ls.redZoneConversions += ptRedZoneConversion ? 1 : 0;
      }

      const playerUuids = get(pt, 'playerUUIDs', []) || [];
      const lineup = playerUuids.map(puuid => ({ player: playerName(puuid), pointsThrough: (playerPointsThrough.get(puuid) || 0) + 1 }));
      sortBy(lineup, x => x.player);
      for (const puuid of playerUuids) playerPointsThrough.set(puuid, (playerPointsThrough.get(puuid) || 0) + 1);

      const ourPossessions = ptPossessions.length;
      let defensivePossessions = isOffense
        ? (scored ? ourPossessions - 1 : ourPossessions)
        : (scored ? ourPossessions : ourPossessions + 1);
      defensivePossessions = Math.max(0, defensivePossessions);

      pointLog.push({
        uuid: ptUuid,
        number: pointNumber.get(ptUuid),
        isOffense,
        defensivePossessions,
        scored,
        result,
        ourScoreBefore: ourScore,
        oppScoreBefore: oppScore,
        assist: assistPass ? playerName(assistPass.throwerUUID) : null,
        secondaryAssist: secAssistPass ? playerName(secAssistPass.throwerUUID) : null,
        goal: assistPass ? playerName(assistPass.receiverUUID) : null,
        passes: passEntries,
        blocks: blockEntries,
        oppositionErrors: oppErrs.length,
        lineup,
      });

      if (result === 1) ourScore += 1;
      else if (result === -1) oppScore += 1;
    }

    const target = Math.max(ourScore, oppScore, 1);
    const wp = leverageWinProbTable(target);
    for (const entry of pointLog) entry.leverage = pointLeverage(wp, entry.ourScoreBefore, entry.oppScoreBefore, target);

    return {
      pointLog, ourScore, oppScore, pointTouchers, pointQualifies, pointMeta, lineStats,
      offensePointsTotal, cleanHolds, dirtyHolds, defensePointsTotal, breaks, cleanBreaks,
      redZoneEntries, redZoneConversions,
    };
  }

  // ---- per-possession scoring efficiency ----
  function possessionScoringEfficiency(idx) {
    const ptIsOffense = new Map(idx.points.map(pt => [pt.uuid, !!get(pt, 'isOffense', null)]));
    const numer = { total: 0, offense: 0, defense: 0 };
    const denom = { total: 0, offense: 0, defense: 0 };
    for (const po of idx.possessions) {
      const poPasses = idx.passesByPossession.get(po.uuid) || [];
      const poScored = poPasses.length ? !!get(poPasses[poPasses.length - 1], 'isAssist', null) : false;
      const poIsOffense = ptIsOffense.has(po.pointUUID) ? ptIsOffense.get(po.pointUUID) : false;
      denom.total += 1;
      if (poScored) numer.total += 1;
      const b = poIsOffense ? 'offense' : 'defense';
      denom[b] += 1;
      if (poScored) numer[b] += 1;
    }
    return [numer, denom];
  }

  const SEASON_SUM_KEYS = ['pointsPlayed', 'highLeveragePointsPlayed', 'offensePlayed', 'defensePlayed', 'offenseWon', 'defenseWon',
    'touches', 'throws', 'throwCompletions', 'catches', 'receivingTargets', 'possessionsInitiated', 'assists', 'secondaryAssists',
    'assistAttempts', 'goals', 'plusMinus', 'turnovers', 'throwerErrors', 'receiverErrors', 'blocks', 'stallsFor', 'stallsAgainst',
    'huckAttempts', 'huckCompletions', 'huckTargets', 'huckReceptions', 'assistReceptionAttempts', 'utilQualifyingPoints',
    'utilTouchedPoints', 'defTurnoverPoints', 'turnoverRecoveryDenom', 'turnoverRecoveryNumer', 'throwDist', 'throwGain',
    'catchDist', 'catchGain', 'throwIncompleteDist', 'catchIncompleteDist'];

  // ---- per-game box score (also accumulates season totals) ----
  function buildBoxScore(idx, ctx, allBlocks, allStallouts, playerName, seasonStats, seasonGamesPlayed) {
    const { points, pointNumber, possessions, possessionNumber, passesByPossession } = idx;
    const { pointTouchers, pointQualifies, pointMeta } = ctx;

    const gamePlayerPoints = new Map();
    for (const pt of points) {
      for (const puuid of (get(pt, 'playerUUIDs', []) || [])) {
        if (typeof puuid !== 'string') continue;
        if (!gamePlayerPoints.has(puuid)) gamePlayerPoints.set(puuid, new Set());
        gamePlayerPoints.get(puuid).add(pointNumber.get(pt.uuid));
      }
    }
    const uuidByNumber = new Map([...pointNumber].map(([k, v]) => [v, k]));
    const leverageByNumber = new Map(ctx.pointLog.map(p => [p.number, p.leverage]));
    const gamePasses = [];
    for (const po of possessions) gamePasses.push(...(passesByPossession.get(po.uuid) || []));

    const boxScore = [];
    for (const [puuid, played] of gamePlayerPoints) {
      const isPlayed = pt => played.has(pointNumber.get(pt.uuid));
      const offensePlayed = points.filter(pt => isPlayed(pt) && get(pt, 'isOffense', null)).length;
      const defensePlayed = played.size - offensePlayed;
      const offenseWon = points.filter(pt => isPlayed(pt) && get(pt, 'isOffense', null) && get(pt, 'result', null) === 1).length;
      const defenseWon = points.filter(pt => isPlayed(pt) && !get(pt, 'isOffense', null) && get(pt, 'result', null) === 1).length;

      let throws = 0, throwerErrors = 0, catches = 0, receiverErrors = 0, assists = 0, secAssists = 0, goals = 0;
      let throwDist = 0.0, throwGain = 0.0, catchDist = 0.0, catchGain = 0.0;
      let receivingTargets = 0, huckAttempts = 0, huckCompletions = 0, assistAttempts = 0, throwIncomplete = 0;
      let throwIncompleteDist = 0.0, catchIncompleteDist = 0.0, huckTargets = 0, huckReceptions = 0, assistReceptionAttempts = 0;

      for (const pa of gamePasses) {
        const isTe = !!get(pa, 'isThrowerError', null);
        const isRe = !!get(pa, 'isReceiverError', null);
        const completed = !isTe && !isRe;
        const sx = get(pa, 'startX', 0.0), sy = get(pa, 'startY', 0.0);
        const ex = get(pa, 'endX', 0.0), ey = get(pa, 'endY', 0.0);
        const distYd = Math.hypot((sx - ex) * FIELD_WIDTH_YD, (sy - ey) * FIELD_LENGTH_YD);
        const gainYd = (sy - ey) * FIELD_LENGTH_YD;

        if (get(pa, 'throwerUUID', null) === puuid) {
          throws += 1;
          if (isTe) throwerErrors += isRe ? 0.5 : 1;
          if (isTe || isRe) { throwIncomplete += 1; throwIncompleteDist += distYd; }
          if (completed) { throwDist += distYd; throwGain += gainYd; }
          if (get(pa, 'isAssist', null)) assists += 1;
          if (get(pa, 'isSecondaryAssist', null)) secAssists += 1;
          if (gainYd >= HUCK_DISTANCE_YD) { huckAttempts += 1; if (completed) huckCompletions += 1; }
          if (ey < ENDZONE_FRACTION) assistAttempts += 1;
        }
        if (get(pa, 'receiverUUID', null) === puuid) {
          receivingTargets += 1;
          if (isRe) receiverErrors += isTe ? 0.5 : 1;
          if (completed) { catches += 1; catchDist += distYd; catchGain += gainYd; }
          else catchIncompleteDist += distYd;
          if (get(pa, 'isAssist', null)) goals += 1;
          if (gainYd >= HUCK_DISTANCE_YD) { huckTargets += 1; if (completed) huckReceptions += 1; }
          if (ey < ENDZONE_FRACTION) assistReceptionAttempts += 1;
        }
      }

      const possessionsInitiated = possessions.filter(po => get(po, 'initiatorUUID', null) === puuid).length;
      const inGame = bl => pointNumber.has(get(bl, 'pointUUID', null));
      const defBlocks = allBlocks.filter(bl => get(bl, 'playerUUID', null) === puuid && inGame(bl)).length;
      const stallFor = allBlocks.filter(bl => get(bl, 'playerUUID', null) === puuid && inGame(bl) && get(bl, 'isStallOut', null)).length;
      const stallAgainst = allStallouts.filter(so => get(so, 'playerUUID', null) === puuid && possessionNumber.has(get(so, 'possessionUUID', null))).length;
      throwerErrors += stallAgainst;

      const turnovers = throwerErrors + receiverErrors;
      const touches = catches + possessionsInitiated;
      const throwCompletions = throws - throwIncomplete;
      const plusMinus = goals + assists + defBlocks - turnovers;
      let highLeveragePointsPlayed = 0;
      for (const n of played) if ((leverageByNumber.has(n) ? leverageByNumber.get(n) : 0.0) >= HIGH_LEVERAGE_THRESHOLD) highLeveragePointsPlayed += 1;

      let utilQualifying = 0, utilTouched = 0;
      let defTurnoverPoints = 0, recoveryDenom = 0, recoveryNumer = 0;
      for (const num of played) {
        const u = uuidByNumber.get(num);
        if (pointQualifies.get(u)) {
          utilQualifying += 1;
          if ((pointTouchers.get(u) || new Set()).has(puuid)) utilTouched += 1;
        }
        const meta = pointMeta.get(u) || {};
        if (!meta.isOffense && meta.hadOppTurnover) defTurnoverPoints += 1;
        if (meta.hadOurTurnover) { recoveryDenom += 1; if (meta.scored) recoveryNumer += 1; }
      }

      const row = {
        playerUUID: puuid,
        player: playerName(puuid),
        pointsPlayed: played.size,
        highLeveragePointsPlayed,
        offensePlayed, defensePlayed, offenseWon, defenseWon,
        touches,
        throws,
        throwCompletions,
        throwCompletionPct: pct(throwCompletions, throws),
        catches,
        receivingTargets,
        catchCompletionPct: pct(catches, catches + receiverErrors),
        possessionsInitiated,
        assists,
        secondaryAssists: secAssists,
        assistAttempts,
        assistCompletionPct: pct(assists, assistAttempts),
        goals,
        plusMinus,
        turnovers,
        throwerErrors,
        receiverErrors,
        blocks: defBlocks,
        stallsFor: stallFor,
        stallsAgainst: stallAgainst,
        huckAttempts,
        huckCompletions,
        huckCompletionPct: pct(huckCompletions, huckAttempts),
        huckTargets,
        huckReceptions,
        huckReceptionPct: pct(huckReceptions, huckTargets),
        assistReceptionAttempts,
        assistReceptionPct: pct(goals, assistReceptionAttempts),
        utilQualifyingPoints: utilQualifying,
        utilTouchedPoints: utilTouched,
        offensiveUtilization: pct(utilTouched, utilQualifying),
        totalScoringEfficiency: pct(offenseWon + defenseWon, played.size),
        offensiveScoringEfficiency: pct(offenseWon, offensePlayed),
        defensiveScoringEfficiency: pct(defenseWon, defensePlayed),
        defTurnoverPoints,
        defensiveTurnoverEfficiency: pct(defTurnoverPoints, defensePlayed),
        turnoverRecoveryDenom: recoveryDenom,
        turnoverRecoveryNumer: recoveryNumer,
        pointRecovery: pct(recoveryNumer, recoveryDenom),
        throwDist, throwGain, catchDist, catchGain, throwIncompleteDist, catchIncompleteDist,
      };
      boxScore.push(row);

      if (!seasonStats.has(puuid)) {
        const acc = { player: playerName(puuid) };
        for (const k of SEASON_SUM_KEYS) acc[k] = 0;
        seasonStats.set(puuid, acc);
      }
      const acc = seasonStats.get(puuid);
      for (const k of SEASON_SUM_KEYS) acc[k] += row[k];
      seasonGamesPlayed.set(puuid, (seasonGamesPlayed.get(puuid) || 0) + 1);
    }
    sortBy(boxScore, r => r.pointsPlayed, true);
    return boxScore;
  }

  // ---- game summary ----
  function buildGameSummary(ctx, ppNumer, ppDenom) {
    const ls = ctx.lineStats;
    const total = ctx.offensePointsTotal + ctx.defensePointsTotal;
    const holds = ctx.cleanHolds + ctx.dirtyHolds;
    function lineSummary(b) {
      const d = ls[b];
      return {
        throws: d.throws,
        throwCompletions: d.completions,
        throwCompletionPct: pct(d.completions, d.throws),
        huckAttempts: d.huckAttempts,
        huckCompletions: d.huckCompletions,
        huckCompletionPct: pct(d.huckCompletions, d.huckAttempts),
        blocks: d.blocks,
        opponentTurnovers: d.oppTurnovers,
        redZoneEntries: d.redZoneEntries,
        redZoneConversions: d.redZoneConversions,
        redZoneRate: pct(d.redZoneConversions, d.redZoneEntries),
      };
    }
    return {
      offensePointsTotal: ctx.offensePointsTotal,
      cleanHolds: ctx.cleanHolds,
      dirtyHolds: ctx.dirtyHolds,
      holdRate: pct(holds, ctx.offensePointsTotal),
      defensePointsTotal: ctx.defensePointsTotal,
      breaks: ctx.breaks,
      breakRate: pct(ctx.breaks, ctx.defensePointsTotal),
      lineStats: { combined: lineSummary('combined'), offense: lineSummary('offense'), defense: lineSummary('defense') },
      scoringEfficiency: {
        perPoint: {
          total: eff(holds + ctx.breaks, total),
          offense: eff(holds, ctx.offensePointsTotal),
          defense: eff(ctx.breaks, ctx.defensePointsTotal),
        },
        perPossession: {
          total: eff(ppNumer.total, ppDenom.total),
          offense: eff(ppNumer.offense, ppDenom.offense),
          defense: eff(ppNumer.defense, ppDenom.defense),
        },
        firstPossession: {
          total: eff(ctx.cleanHolds + ctx.cleanBreaks, total),
          offense: eff(ctx.cleanHolds, ctx.offensePointsTotal),
          defense: eff(ctx.cleanBreaks, ctx.defensePointsTotal),
        },
      },
      clutchEfficiency: leverageSplitEfficiency(ctx.pointLog, HIGH_LEVERAGE_THRESHOLD),
    };
  }

  function buildGameReport(game, rel, passesByPossession, playerName, seasonStats, seasonGamesPlayed) {
    const idx = indexGame(game, rel.points, rel.possessions, rel.blocks, rel.oppErrors, passesByPossession);
    const ctx = buildPointLog(idx, playerName, rel.stallouts);
    const [ppNumer, ppDenom] = possessionScoringEfficiency(idx);
    const boxScore = buildBoxScore(idx, ctx, rel.blocks, rel.stallouts, playerName, seasonStats, seasonGamesPlayed);
    const summary = buildGameSummary(ctx, ppNumer, ppDenom);
    const resultChar = ctx.ourScore > ctx.oppScore ? 'W' : ctx.ourScore < ctx.oppScore ? 'L' : 'T';
    return [{
      uuid: get(game, 'uuid', null),
      opponent: get(game, 'opponent', 'Unknown'),
      date: get(game, 'date', ''),
      dateDisplay: fmtDisplayDate(get(game, 'date', '')),
      ourScore: ctx.ourScore,
      oppScore: ctx.oppScore,
      result: resultChar,
      points: ctx.pointLog,
      boxScore,
      summary,
    }, resultChar];
  }

  // ---- season rollups ----
  function buildSeasonLeaderboard(seasonStats, seasonGamesPlayed) {
    const out = [];
    for (const [puuid, acc] of seasonStats) {
      const row = Object.assign({}, acc);
      row.playerUUID = puuid;
      row.gamesPlayed = seasonGamesPlayed.get(puuid) || 0;
      row.throwCompletionPct = pct(row.throwCompletions, row.throws);
      row.catchCompletionPct = pct(row.catches, row.catches + row.receiverErrors);
      row.huckCompletionPct = pct(row.huckCompletions, row.huckAttempts);
      row.assistCompletionPct = pct(row.assists, row.assistAttempts);
      row.huckReceptionPct = pct(row.huckReceptions, row.huckTargets);
      row.assistReceptionPct = pct(row.goals, row.assistReceptionAttempts);
      row.offensiveUtilization = pct(row.utilTouchedPoints, row.utilQualifyingPoints);
      row.totalScoringEfficiency = pct(row.offenseWon + row.defenseWon, row.pointsPlayed);
      row.offensiveScoringEfficiency = pct(row.offenseWon, row.offensePlayed);
      row.defensiveScoringEfficiency = pct(row.defenseWon, row.defensePlayed);
      row.defensiveTurnoverEfficiency = pct(row.defTurnoverPoints, row.defensePlayed);
      row.pointRecovery = pct(row.turnoverRecoveryNumer, row.turnoverRecoveryDenom);
      out.push(row);
    }
    return sortBy(out, r => r.pointsPlayed, true);
  }

  function sumEff(gameReports, pick) {
    let numer = 0, denom = 0;
    for (const g of gameReports) { const e = pick(g.summary); numer += e.numer; denom += e.denom; }
    return { numer, denom, pct: pct(numer, denom) };
  }

  function buildSeasonScoringEfficiency(gameReports) {
    const out = {};
    for (const mode of ['perPoint', 'perPossession', 'firstPossession']) {
      out[mode] = {};
      for (const c of ['total', 'offense', 'defense']) out[mode][c] = sumEff(gameReports, s => s.scoringEfficiency[mode][c]);
    }
    return out;
  }

  function buildSeasonClutchEfficiency(gameReports) {
    const out = {};
    for (const b of ['highLeverage', 'lowLeverage']) {
      out[b] = {
        pointCount: gameReports.reduce((n, g) => n + g.summary.clutchEfficiency[b].pointCount, 0),
        holdRate: sumEff(gameReports, s => s.clutchEfficiency[b].holdRate),
        breakRate: sumEff(gameReports, s => s.clutchEfficiency[b].breakRate),
        totalScoringEfficiency: sumEff(gameReports, s => s.clutchEfficiency[b].totalScoringEfficiency),
      };
    }
    return out;
  }

  function computeTeamReport(relations, teamName) {
    const players = get(relations, 'players', []);
    const playersByUuid = new Map(players.map(p => [p.uuid, p]));
    const playerGenders = {};
    for (const p of players) if (get(p, 'name', null)) playerGenders[p.name] = get(p, 'gender', null);
    const rel = {
      points: get(relations, 'points', []),
      possessions: get(relations, 'possessions', []),
      blocks: get(relations, 'defensiveBlocks', []),
      stallouts: get(relations, 'stallOutsAgainst', []),
      oppErrors: get(relations, 'oppositionErrors', []),
    };
    const playerName = playerNameLookup(playersByUuid);
    const passesByPossession = indexPassesByPossession(get(relations, 'passes', []));
    const gamesSorted = sortBy(get(relations, 'games', []).slice(), g => get(g, 'date', ''));

    const gameReports = [];
    const seasonStats = new Map();
    const seasonGamesPlayed = new Map();
    let wins = 0, losses = 0, ties = 0;
    for (const game of gamesSorted) {
      const [report, r] = buildGameReport(game, rel, passesByPossession, playerName, seasonStats, seasonGamesPlayed);
      gameReports.push(report);
      if (r === 'W') wins += 1; else if (r === 'L') losses += 1; else ties += 1;
    }
    return {
      teamName,
      record: { wins, losses, ties },
      games: gameReports,
      seasonLeaderboard: buildSeasonLeaderboard(seasonStats, seasonGamesPlayed),
      seasonScoringEfficiency: buildSeasonScoringEfficiency(gameReports),
      seasonClutchEfficiency: buildSeasonClutchEfficiency(gameReports),
      playerGenders,
    };
  }

  // ---- reading a .statto export (a zip holding data.json) ----
  async function inflateRaw(bytes) {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }

  // Minimal zip reader: finds the central directory and returns { name: Uint8Array }
  // for the entries `want(name)` selects. Handles stored and deflated entries.
  async function unzip(buffer, want) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a zip file');
    const count = view.getUint16(eocd + 10, true);
    let p = view.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    const out = {};
    for (let n = 0; n < count; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) throw new Error('bad zip directory');
      const method = view.getUint16(p + 10, true);
      const compSize = view.getUint32(p + 20, true);
      const nameLen = view.getUint16(p + 28, true);
      const extraLen = view.getUint16(p + 30, true);
      const commentLen = view.getUint16(p + 32, true);
      const localOffset = view.getUint32(p + 42, true);
      const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      p += 46 + nameLen + extraLen + commentLen;
      if (!want(name)) continue;
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(start, start + compSize);
      if (method === 0) out[name] = data;
      else if (method === 8) out[name] = await inflateRaw(data);
      else throw new Error('unsupported zip compression method ' + method);
    }
    return out;
  }

  // statto_io.load_statto: the export's data.json (at the root, or the first
  // one found in a subfolder).
  async function readStatto(buffer) {
    let files;
    try {
      files = await unzip(buffer, name => name === 'data.json' || name.endsWith('/data.json'));
    } catch (e) {
      throw new Error('That file isn’t a Statto export (.statto).');
    }
    const name = files['data.json'] ? 'data.json' : Object.keys(files)[0];
    if (!name) throw new Error('That .statto file has no data in it (missing data.json).');
    return JSON.parse(new TextDecoder().decode(files[name]));
  }

  // render.build_report: the report for the export's (first) team.
  async function reportFromStatto(buffer) {
    const data = await readStatto(buffer);
    const teams = get(data, 'teams', []);
    if (!teams.length) throw new Error('No teams found in this .statto file.');
    const team = teams[0];
    const teamData = get(team, 'data', {});
    const relations = get(teamData, 'relations', {});
    const teamName = get(get(teamData, 'team', {}), 'name', 'Team');
    return { report: computeTeamReport(relations, teamName), teamName };
  }

  return { computeTeamReport, readStatto, reportFromStatto, fmtDisplayDate, pyRound, _unzip: unzip };
});
