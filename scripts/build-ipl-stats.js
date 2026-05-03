#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const inputDir = process.argv[2] || path.join(process.cwd(), 'data', 'cricsheet', 'ipl_male_json');
const outJs = process.argv[3] || path.join(process.cwd(), 'data', 'ipl-2026-season-stats.js');
const outJson = outJs.replace(/\.js$/, '.json');

const TEAM_SLUGS = {
  'Gujarat Titans': 'gt',
  'Royal Challengers Bengaluru': 'rcb',
  'Royal Challengers Bangalore': 'rcb',
  'Mumbai Indians': 'mi',
  'Kolkata Knight Riders': 'kkr',
  'Sunrisers Hyderabad': 'srh',
  'Chennai Super Kings': 'csk',
  'Rajasthan Royals': 'rr',
  'Punjab Kings': 'pbks',
  'Delhi Capitals': 'dc',
  'Lucknow Super Giants': 'lsg',
};

const BOWLER_WICKET_KINDS = new Set(['bowled', 'caught', 'caught and bowled', 'lbw', 'stumped', 'hit wicket']);
const NON_BATTER_OUTS = new Set(['run out', 'retired hurt', 'retired out', 'obstructing the field']);
const WK_HINTS = new Set([
  'KL Rahul', 'JM Sharma', 'JC Buttler', 'SV Samson', 'MS Dhoni', 'Abishek Porel',
  'Ishan Kishan', 'RR Pant', 'Q de Kock', 'Nicholas Pooran', 'PD Salt', 'Phil Salt',
  'JC Buttler', 'Dhruv Jurel', 'Prabhsimran Singh', 'Ryan Rickelton', 'Heinrich Klaasen',
  'P Simran Singh', 'H Klaasen', 'N Pooran', 'TL Seifert', 'Kumar Kushagra', 'RD Rickelton',
]);

const ROLE_OVERRIDES = {
  'Washington Sundar': 'ar', 'R Tewatia': 'ar', 'Rashid Khan': 'ar', 'GD Phillips': 'wk',
  'KH Pandya': 'ar', 'R Shepherd': 'ar', 'JG Bethell': 'ar', 'LS Livingstone': 'ar',
  'HH Pandya': 'ar', 'MJ Santner': 'ar', 'SN Thakur': 'ar', 'C Bosch': 'ar',
  'SP Narine': 'ar', 'C Green': 'ar', 'Ramandeep Singh': 'ar', 'TL Seifert': 'wk',
  'Abhishek Sharma': 'ar', 'H Klaasen': 'wk', 'PJ Cummins': 'bowl',
  'S Dube': 'ar', 'RA Jadeja': 'ar', 'AJ Hosein': 'ar', 'J Overton': 'ar',
  'MP Stoinis': 'ar', 'C Connolly': 'ar', 'M Jansen': 'ar', 'P Simran Singh': 'wk',
  'AR Patel': 'ar', 'KA Jamieson': 'ar', 'MR Marsh': 'ar', 'N Pooran': 'wk',
  'Shahbaz Ahmed': 'ar', 'A Nortje': 'bowl',
};

const PLAYER_NATIONS = {
  'JC Buttler': 'ENG', 'K Rabada': 'RSA', 'Rashid Khan': 'AFG', 'GD Phillips': 'NZ', 'JO Holder': 'WI',
  'PD Salt': 'ENG', 'JG Bethell': 'ENG', 'TH David': 'AUS', 'R Shepherd': 'WI', 'JR Hazlewood': 'AUS', 'JA Duffy': 'NZ',
  'SE Rutherford': 'WI', 'RD Rickelton': 'RSA', 'Q de Kock': 'RSA', 'HH Pandya': 'IND', 'AM Ghazanfar': 'AFG', 'MJ Santner': 'NZ', 'TA Boult': 'NZ', 'C Bosch': 'RSA',
  'R Powell': 'WI', 'FH Allen': 'NZ', 'TL Seifert': 'NZ', 'C Green': 'AUS', 'SP Narine': 'WI', 'B Muzarabani': 'ZIM',
  'H Klaasen': 'RSA', 'TM Head': 'AUS', 'LS Livingstone': 'ENG', 'DA Payne': 'ENG', 'D Madushanka': 'SL', 'PJ Cummins': 'AUS', 'E Malinga': 'SL',
  'D Brevis': 'RSA', 'MW Short': 'AUS', 'Noor Ahmad': 'AFG', 'AJ Hosein': 'WI', 'MJ Henry': 'NZ', 'J Overton': 'ENG',
  'D Ferreira': 'RSA', 'SO Hetmyer': 'WI', 'LG Pretorius': 'RSA', 'RA Jadeja': 'IND', 'JC Archer': 'ENG', 'N Burger': 'RSA',
  'C Connolly': 'AUS', 'MP Stoinis': 'AUS', 'M Jansen': 'RSA', 'XC Bartlett': 'AUS',
  'T Stubbs': 'RSA', 'DA Miller': 'RSA', 'P Nissanka': 'SL', 'KA Jamieson': 'NZ', 'PVD Chameera': 'SL', 'L Ngidi': 'RSA',
  'AK Markram': 'RSA', 'MR Marsh': 'AUS', 'N Pooran': 'WI', 'A Nortje': 'RSA', 'GF Linde': 'RSA',
};

function normName(name = '') {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function ensurePlayer(players, name, team, registry = {}) {
  const id = registry[name] || normName(name);
  if (!players[id]) {
    players[id] = {
      id,
      name,
      namesSeen: new Set([name]),
      team,
      teams: new Set(team ? [team] : []),
      matches: new Set(),
      innings: 0,
      runs: 0,
      balls: 0,
      outs: 0,
      battingPositions: [],
      battingPositionCounts: {},
      fours: 0,
      sixes: 0,
      bowlBalls: 0,
      bowlRuns: 0,
      wickets: 0,
      dotBalls: 0,
      bowlPhaseBalls: { pp: 0, middle: 0, death: 0 },
      catches: 0,
      stumpings: 0,
      runouts: 0,
      fifties: 0,
      hundreds: 0,
    };
  }
  if (team) {
    players[id].name = name;
    players[id].namesSeen.add(name);
    players[id].team = team;
    players[id].teams.add(team);
  }
  return players[id];
}

function isLegalBall(delivery) {
  return !(delivery.extras && (delivery.extras.wides || delivery.extras.noballs));
}

function countsForBatterBall(delivery) {
  return !(delivery.extras && delivery.extras.wides);
}

function bowlerRuns(delivery) {
  const extras = delivery.extras || {};
  return (delivery.runs?.batter || 0) + (extras.wides || 0) + (extras.noballs || 0);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function ensureTeamMatchStats(matchStats, team) {
  if (!matchStats[team]) {
    matchStats[team] = { runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0 };
  }
  return matchStats[team];
}

function ballsToOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function phaseForOver(overNumber) {
  if (overNumber < 6) return 'pp';
  if (overNumber < 15) return 'middle';
  return 'death';
}

function assignBattingPosition(order, player) {
  if (order.has(player.id)) return;
  const position = order.size + 1;
  order.set(player.id, position);
  player.battingPositions.push(position);
  player.battingPositionCounts[position] = (player.battingPositionCounts[position] || 0) + 1;
}

function sampleAdjustedScore(score, sample, fullSample) {
  if (score === null || score === undefined) return null;
  if (score <= 0) return 0;
  return Math.round(score * Math.min(1, sample / fullSample));
}

function inferRole(player) {
  if (ROLE_OVERRIDES[player.name]) return ROLE_OVERRIDES[player.name];
  if (WK_HINTS.has(player.name)) return 'wk';
  if (player.bowlBalls >= 48 && (player.balls >= 36 || player.runs >= 80)) return 'ar';
  if (player.bowlBalls >= 36 && player.runs >= 120) return 'ar';
  if (player.bowlBalls >= 24 && player.balls === 0) return 'bowl';
  if (player.bowlBalls >= 36) return 'bowl';
  return 'bat';
}

function bucketForRole(role) {
  if (role === 'wk') return 'wicketKeepers';
  if (role === 'ar') return 'allRounders';
  if (role === 'bowl') return 'bowlers';
  return 'batters';
}

function calcFormScore(role, stats) {
  if (!stats) return null;
  if (role === 'bat' || role === 'wk') {
    return Math.min(100, Math.round(
      Math.min((stats.sr / 150) * 40, 48) +
      Math.min((stats.avg / 35) * 35, 44) +
      Math.min((stats.boundary_pct / 40) * 15, 18) +
      Math.min((stats.impact / 0.3) * 10, 12)
    ));
  }
  if (role === 'bowl') {
    return Math.min(100, Math.round(
      Math.max(0, Math.min(((8.5 - stats.econ) / 3) * 20 + 20, 36)) +
      Math.max(0, Math.min(((28 - stats.bowling_avg) / 15) * 25 + 25, 40)) +
      Math.min(stats.wkts_per_match * 10, 18) +
      Math.min((stats.dot_pct / 40) * 15, 18)
    ));
  }
  const bat = calcFormScore('bat', {
    sr: stats.batSr,
    avg: stats.batAvg,
    boundary_pct: stats.boundary_pct,
    impact: stats.impact,
  });
  const bowl = calcFormScore('bowl', {
    econ: stats.bowlEcon,
    bowling_avg: stats.bowlAvg,
    wkts_per_match: stats.wktsPerMatch,
    dot_pct: stats.dot_pct,
  });
  return Math.min(100, Math.round((bat + bowl) / 2));
}

function buildStats(player, role) {
  const battingAvg = player.outs ? player.runs / player.outs : player.runs;
  const sr = player.balls ? (player.runs / player.balls) * 100 : 0;
  const boundaryPct = player.runs ? ((player.fours * 4 + player.sixes * 6) / player.runs) * 100 : 0;
  const impact = ((player.fifties || 0) + 2 * (player.hundreds || 0)) / Math.max(player.innings, 1);
  const positionTotal = player.battingPositions.reduce((total, position) => total + position, 0);
  const avgPosition = player.battingPositions.length ? positionTotal / player.battingPositions.length : null;
  const positionBuckets = player.battingPositions.reduce((buckets, position) => {
    if (position <= 2) buckets.open += 1;
    else if (position <= 4) buckets.top += 1;
    else if (position <= 7) buckets.middle += 1;
    else buckets.finish += 1;
    return buckets;
  }, { open: 0, top: 0, middle: 0, finish: 0 });
  const positionPct = Object.fromEntries(Object.entries(positionBuckets).map(([bucket, count]) => [
    bucket,
    player.battingPositions.length ? round((count / player.battingPositions.length) * 100, 1) : 0,
  ]));
  const econ = player.bowlBalls ? player.bowlRuns / (player.bowlBalls / 6) : 12;
  const bowlingAvg = player.wickets ? player.bowlRuns / player.wickets : player.bowlRuns || 50;
  const wktsPerMatch = player.matches.size ? player.wickets / player.matches.size : 0;
  const dotPct = player.bowlBalls ? (player.dotBalls / player.bowlBalls) * 100 : 0;
  const phasePct = Object.fromEntries(Object.entries(player.bowlPhaseBalls).map(([phase, balls]) => [
    phase,
    player.bowlBalls ? round((balls / player.bowlBalls) * 100, 1) : 0,
  ]));
  const batStats = {
    apps: player.matches.size,
    sr: round(sr, 2),
    avg: round(battingAvg, 2),
    boundary_pct: round(boundaryPct, 2),
    impact: round(impact, 3),
  };
  const bowlStats = {
    apps: player.matches.size,
    econ: round(econ, 2),
    bowling_avg: round(bowlingAvg, 2),
    wkts_per_match: round(wktsPerMatch, 2),
    dot_pct: round(dotPct, 2),
  };
  const rawBatScore = player.balls ? calcFormScore('bat', batStats) : null;
  const rawBowlScore = player.bowlBalls ? calcFormScore('bowl', bowlStats) : null;
  const batScore = sampleAdjustedScore(rawBatScore, player.balls, 36);
  const bowlScore = sampleAdjustedScore(rawBowlScore, player.bowlBalls, 48);
  const fieldScore = Math.min(100, Math.round(((player.catches + player.runouts) * 10 + player.stumpings * 16) / Math.max(player.matches.size, 1)));
  const weights = {
    bat: [0.85, 0.10, 0.05],
    wk: [0.72, 0.03, 0.25],
    ar: [0.48, 0.47, 0.05],
    bowl: [0.18, 0.77, 0.05],
  }[role] || [0.7, 0.2, 0.1];
  const weightedParts = [
    [batScore, weights[0]],
    [bowlScore, weights[1]],
    [fieldScore || null, weights[2]],
  ].filter(([score]) => score !== null && score !== undefined);
  const weightTotal = weightedParts.reduce((total, [, weight]) => total + weight, 0) || 1;
  const overall = Math.round(weightedParts.reduce((total, [score, weight]) => total + score * weight, 0) / weightTotal);

  return {
    apps: player.matches.size,
    bat: {
      ...batStats,
      runs: player.runs,
      balls: player.balls,
      outs: player.outs,
      fifties: player.fifties,
      hundreds: player.hundreds,
      position_counts: player.battingPositionCounts,
      position_pct: positionPct,
      avg_position: avgPosition === null ? null : round(avgPosition, 1),
      score: batScore,
      raw_score: rawBatScore,
    },
    bowl: {
      ...bowlStats,
      balls: player.bowlBalls,
      runs: player.bowlRuns,
      wickets: player.wickets,
      phase_balls: player.bowlPhaseBalls,
      phase_pct: phasePct,
      score: bowlScore,
      raw_score: rawBowlScore,
    },
    field: {
      catches: player.catches,
      stumpings: player.stumpings,
      runouts: player.runouts,
      score: fieldScore,
    },
    overall,
    source: 'cricsheet',
  };
}

function legacyStats(stats, role) {
  if (role === 'bowl') return {
    apps: stats.apps,
    econ: stats.bowl.econ,
    bowling_avg: stats.bowl.bowling_avg,
    wkts_per_match: stats.bowl.wkts_per_match,
    dot_pct: stats.bowl.dot_pct,
    source: stats.source,
  };
  if (role === 'ar') return {
    apps: stats.apps,
    batSr: stats.bat.sr,
    batAvg: stats.bat.avg,
    boundary_pct: stats.bat.boundary_pct,
    impact: stats.bat.impact,
    bowlEcon: stats.bowl.econ,
    bowlAvg: stats.bowl.bowling_avg,
    wktsPerMatch: stats.bowl.wkts_per_match,
    dot_pct: stats.bowl.dot_pct,
    source: stats.source,
  };
  return {
    apps: stats.apps,
    sr: stats.bat.sr,
    avg: stats.bat.avg,
    boundary_pct: stats.bat.boundary_pct,
    impact: stats.bat.impact,
    source: stats.source,
  };
}

function statLine(player, role, stats) {
  if (role === 'bowl') return `${stats.bowl.wkts_per_match.toFixed(1)} wkt/m · Econ ${stats.bowl.econ.toFixed(1)}`;
  if (role === 'ar') return `${stats.bat.avg.toFixed(1)} avg · Econ ${stats.bowl.econ.toFixed(1)}`;
  return `SR ${stats.bat.sr.toFixed(0)} · Avg ${stats.bat.avg.toFixed(1)}`;
}

function processMatch(filePath, seasonPlayers, matches, options = {}) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const info = raw.info || {};
  if (info.gender !== 'male' || info.match_type !== 'T20') return;
  if (info.event?.name !== 'Indian Premier League') return;

  const teams = info.teams || [];
  if (!teams.every(team => TEAM_SLUGS[team])) return;
  if (options.season && String(info.season) !== options.season) return;
  if (options.beforeSeason && String(info.season) >= options.beforeSeason) return;

  const matchId = path.basename(filePath, '.json');
  const registry = info.registry?.people || {};
  const teamByPlayer = {};
  const matchStats = {};
  const scores = [];
  const maxBalls = (info.overs || 20) * 6;

  Object.entries(info.players || {}).forEach(([team, names]) => {
    names.forEach(name => {
      teamByPlayer[name] = team;
      ensurePlayer(seasonPlayers, name, team, registry).matches.add(matchId);
    });
  });

  (raw.innings || []).forEach((innings, inningsIndex) => {
    if (inningsIndex >= teams.length) return;
    const battingTeam = innings.team;
    const bowlingTeam = teams.find(team => team !== battingTeam);
    const inningsBatters = new Set();
    const battingOrder = new Map();
    const inningsRuns = {};
    let inningsTotal = 0;
    let inningsBalls = 0;
    let inningsWickets = 0;

    (innings.overs || []).forEach(over => {
      const phase = phaseForOver(over.over || 0);
      (over.deliveries || []).forEach(delivery => {
        const batter = ensurePlayer(seasonPlayers, delivery.batter, battingTeam, registry);
        const nonStriker = ensurePlayer(seasonPlayers, delivery.non_striker, battingTeam, registry);
        const bowler = ensurePlayer(seasonPlayers, delivery.bowler, bowlingTeam, registry);
        assignBattingPosition(battingOrder, batter);
        assignBattingPosition(battingOrder, nonStriker);

        if (!inningsBatters.has(batter.id)) {
          batter.innings += 1;
          inningsBatters.add(batter.id);
        }

        batter.runs += delivery.runs?.batter || 0;
        inningsTotal += delivery.runs?.total || 0;
        inningsRuns[batter.id] = (inningsRuns[batter.id] || 0) + (delivery.runs?.batter || 0);
        if (countsForBatterBall(delivery)) batter.balls += 1;
        if ((delivery.runs?.batter || 0) === 4) batter.fours += 1;
        if ((delivery.runs?.batter || 0) === 6) batter.sixes += 1;

        bowler.bowlRuns += bowlerRuns(delivery);
        if (isLegalBall(delivery)) {
          bowler.bowlBalls += 1;
          bowler.bowlPhaseBalls[phase] += 1;
          inningsBalls += 1;
          if (delivery.runs?.total === 0) bowler.dotBalls += 1;
        }

        (delivery.wickets || []).forEach(wicket => {
          inningsWickets += 1;
          const out = ensurePlayer(seasonPlayers, wicket.player_out, teamByPlayer[wicket.player_out] || battingTeam, registry);
          if (!NON_BATTER_OUTS.has(wicket.kind)) out.outs += 1;
          if (BOWLER_WICKET_KINDS.has(wicket.kind)) bowler.wickets += 1;
          (wicket.fielders || []).forEach(fielder => {
            const f = ensurePlayer(seasonPlayers, fielder.name, teamByPlayer[fielder.name], registry);
            if (wicket.kind === 'stumped') f.stumpings += 1;
            else if (wicket.kind === 'run out') f.runouts += 1;
            else f.catches += 1;
          });
        });
      });
    });

    Object.entries(inningsRuns).forEach(([id, runs]) => {
      if (runs >= 100) seasonPlayers[id].hundreds += 1;
      else if (runs >= 50) seasonPlayers[id].fifties += 1;
    });

    const ballsForNrr = inningsWickets >= 10 ? maxBalls : inningsBalls;
    const battingStats = ensureTeamMatchStats(matchStats, battingTeam);
    const bowlingStats = ensureTeamMatchStats(matchStats, bowlingTeam);
    battingStats.runsFor += inningsTotal;
    battingStats.ballsFor += ballsForNrr;
    bowlingStats.runsAgainst += inningsTotal;
    bowlingStats.ballsAgainst += ballsForNrr;
    scores.push({
      team: battingTeam,
      runs: inningsTotal,
      wickets: inningsWickets,
      balls: inningsBalls,
      overs: ballsToOvers(inningsBalls),
    });
  });

  const winner = info.outcome?.winner || info.outcome?.eliminator;
  if (matches) {
    matches.push({
      id: matchId,
      date: info.dates?.[0],
      matchNumber: info.event?.match_number,
      teams,
      winner,
      result: info.outcome?.result,
      margin: info.outcome?.by || null,
      scores,
      teamStats: matchStats,
    });
  }
}

function buildStandings(matches) {
  const teamSeeds = Object.entries(TEAM_SLUGS).reduce((items, [team, slug]) => {
    if (!items.some(item => item.slug === slug)) items.push({ team, slug });
    return items;
  }, []);
  const table = Object.fromEntries(teamSeeds.map(({ team, slug }) => [slug, {
    abbr: slug.toUpperCase(),
    full: team,
    flag: slug,
    m: 0,
    w: 0,
    l: 0,
    nr: 0,
    pts: 0,
    runsFor: 0,
    ballsFor: 0,
    runsAgainst: 0,
    ballsAgainst: 0,
  }]));

  matches.forEach(match => {
    const teams = match.teams || [];
    const countsForNrr = !!match.winner || match.result === 'tie';
    teams.forEach(team => {
      const slug = TEAM_SLUGS[team];
      if (!table[slug]) return;
      table[slug].m += 1;
      if (!countsForNrr) return;
      const stats = match.teamStats?.[team] || {};
      table[slug].runsFor += stats.runsFor || 0;
      table[slug].ballsFor += stats.ballsFor || 0;
      table[slug].runsAgainst += stats.runsAgainst || 0;
      table[slug].ballsAgainst += stats.ballsAgainst || 0;
    });

    const winnerSlug = TEAM_SLUGS[match.winner];
    if (winnerSlug && table[winnerSlug]) {
      table[winnerSlug].w += 1;
      table[winnerSlug].pts += 2;
      teams.filter(team => team !== match.winner).forEach(team => {
        const slug = TEAM_SLUGS[team];
        if (table[slug]) table[slug].l += 1;
      });
    } else {
      teams.forEach(team => {
        const slug = TEAM_SLUGS[team];
        if (!table[slug]) return;
        table[slug].nr += 1;
        table[slug].pts += 1;
      });
    }
  });

  return Object.values(table)
    .map(row => {
      const forRate = row.ballsFor ? row.runsFor / (row.ballsFor / 6) : 0;
      const againstRate = row.ballsAgainst ? row.runsAgainst / (row.ballsAgainst / 6) : 0;
      return {
        pos: 0,
        abbr: row.abbr,
        full: row.full,
        flag: row.flag,
        m: row.m,
        w: row.w,
        l: row.l,
        nr: row.nr,
        pts: row.pts,
        nrr: round(forRate - againstRate, 3),
        rcb: row.flag === 'rcb',
      };
    })
    .sort((a, b) => (b.pts - a.pts) || (b.nrr - a.nrr) || (b.w - a.w) || a.full.localeCompare(b.full))
    .map((row, index) => ({ ...row, pos: index + 1 }));
}

function careerSnapshot(player) {
  if (!player || !player.matches.size) return null;
  const stats = buildStats(player, inferRole(player));
  return {
    apps: stats.apps,
    names: [...player.namesSeen],
    bat: {
      runs: stats.bat.runs,
      balls: stats.bat.balls,
      sr: stats.bat.sr,
      avg: stats.bat.avg,
      boundary_pct: stats.bat.boundary_pct,
    },
    bowl: {
      balls: stats.bowl.balls,
      wickets: stats.bowl.wickets,
      econ: stats.bowl.econ,
      bowling_avg: stats.bowl.bowling_avg,
      wkts_per_match: stats.bowl.wkts_per_match,
      dot_pct: stats.bowl.dot_pct,
    },
  };
}

function buildCareerMap(players) {
  return Object.fromEntries(Object.values(players)
    .map(player => [player.id, careerSnapshot(player)])
    .filter(([, stats]) => stats));
}

function buildOutput(players, matches, careerMap = {}) {
  const squads = {};
  Object.values(TEAM_SLUGS).forEach(slug => {
    squads[slug] = { batters: [], wicketKeepers: [], allRounders: [], bowlers: [] };
  });

  Object.values(players).forEach(player => {
    const slug = TEAM_SLUGS[player.team];
    if (!slug) return;
    const role = inferRole(player);
    const stats = buildStats(player, role);
    const career = careerMap[player.id] || null;
    if (career) stats.career = career;
    const score = stats.overall;
    const row = {
      id: player.id,
      num: Number.parseInt(player.id.slice(0, 2), 16) % 99 || 1,
      name: player.name,
      aliases: [...player.namesSeen],
      nat: PLAYER_NATIONS[player.name] || 'IND',
      tag: '',
      role,
      stats: { ...legacyStats(stats, role), profile: stats },
      score,
      detail: statLine(player, role, stats),
      matches: player.matches.size,
      runs: player.runs,
      wickets: player.wickets,
    };
    squads[slug][bucketForRole(role)].push(row);
  });

  Object.values(squads).forEach(squad => {
    Object.values(squad).forEach(group => {
      group.sort((a, b) => (b.score - a.score) || (b.matches - a.matches) || a.name.localeCompare(b.name));
    });
  });

  return {
    source: 'Cricsheet ball-by-ball',
    generatedAt: new Date().toISOString(),
    season: '2026',
    matchesProcessed: matches.length,
    lastMatchDate: matches.map(m => m.date).sort().at(-1) || null,
    matches: matches.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    standings: buildStandings(matches),
    squads,
  };
}

function inferBatRoleLabel(player) {
  const total = player.battingPositions.length;
  if (!total) return null;
  let open = 0; let top = 0; let middle = 0; let finish = 0;
  player.battingPositions.forEach(pos => {
    if (pos <= 2) open++;
    else if (pos <= 4) top++;
    else if (pos <= 7) middle++;
    else finish++;
  });
  if (open / total >= 0.6) return 'opener';
  if ((open + top) / total >= 0.7) return 'top-order';
  if (middle / total >= 0.5) return 'middle-order';
  if (finish / total >= 0.4) return 'finisher';
  return 'versatile';
}

function inferBowlPhaseLabel(player) {
  if (!player.bowlBalls) return null;
  const pp = player.bowlPhaseBalls.pp / player.bowlBalls;
  const middle = player.bowlPhaseBalls.middle / player.bowlBalls;
  const death = player.bowlPhaseBalls.death / player.bowlBalls;
  if (pp >= 0.45) return 'powerplay';
  if (death >= 0.45) return 'death';
  if (middle >= 0.55) return 'middle-overs';
  return 'mixed';
}

function sampleConfidence(player) {
  const apps = player.matches.size;
  if (apps >= 8 && (player.balls >= 120 || player.bowlBalls >= 150)) return 'high';
  if (apps >= 4 && (player.balls >= 60 || player.bowlBalls >= 72)) return 'medium';
  return 'low';
}

function buildPlayerHistory(seasonFiles, allSeasons) {
  const playerMap = {};

  for (const season of allSeasons) {
    const seasonFileList = seasonFiles[season] || [];
    const seasonPlayers = {};
    seasonFileList.forEach(file => {
      try {
        processMatch(file, seasonPlayers, null, { season });
      } catch (e) {
        console.warn(`History ${season} ${file}: ${e.message}`);
      }
    });

    const seasonStatCache = {};
    Object.values(seasonPlayers).forEach(player => {
      if (!player.matches.size) return;
      const role = inferRole(player);
      const stats = buildStats(player, role);
      seasonStatCache[player.id] = { player, role, stats };
    });

    const roleGroups = {};
    Object.values(seasonStatCache).forEach(({ player, role, stats }) => {
      (roleGroups[role] = roleGroups[role] || []).push({ id: player.id, stats });
    });

    const batPercentiles = {};
    const bowlPercentiles = {};

    const computePct = (group, which, minBalls, dest) => {
      const eligible = group.filter(p => (which === 'bat' ? p.stats.bat.balls : p.stats.bowl.balls || 0) >= minBalls && p.stats[which].score !== null);
      if (eligible.length < 3) return;
      const sorted = [...eligible].sort((a, b) => (a.stats[which].score || 0) - (b.stats[which].score || 0));
      sorted.forEach(({ id }, i) => { dest[id] = Math.round(((i + 1) / sorted.length) * 100); });
    };

    const batGroup = [...(roleGroups.bat || []), ...(roleGroups.wk || [])];
    computePct(batGroup, 'bat', 36, batPercentiles);
    computePct(roleGroups.bowl || [], 'bowl', 36, bowlPercentiles);
    computePct(roleGroups.ar || [], 'bat', 24, batPercentiles);
    computePct(roleGroups.ar || [], 'bowl', 24, bowlPercentiles);

    Object.values(seasonStatCache).forEach(({ player, role, stats }) => {
      if (!player.runs && !player.wickets && !player.balls && !player.bowlBalls) return;

      const entry = {
        season,
        teams: [...player.teams],
        matches: player.matches.size,
        role,
        bat: (player.balls > 0 || player.runs > 0) ? {
          innings: player.innings,
          runs: player.runs,
          balls: player.balls,
          outs: player.outs,
          avg: stats.bat.avg,
          sr: stats.bat.sr,
          boundary_pct: stats.bat.boundary_pct,
          impact: stats.bat.impact,
          fifties: player.fifties,
          hundreds: player.hundreds,
          avg_position: stats.bat.avg_position,
          position_pct: stats.bat.position_pct,
          batRoleLabel: inferBatRoleLabel(player),
          score: stats.bat.score,
          raw_score: stats.bat.raw_score,
        } : null,
        bowl: player.bowlBalls > 0 ? {
          balls: player.bowlBalls,
          runs: player.bowlRuns,
          wickets: player.wickets,
          econ: stats.bowl.econ,
          bowling_avg: stats.bowl.bowling_avg,
          wkts_per_match: stats.bowl.wkts_per_match,
          dot_pct: stats.bowl.dot_pct,
          phase_pct: stats.bowl.phase_pct,
          bowlPhaseLabel: inferBowlPhaseLabel(player),
          score: stats.bowl.score,
          raw_score: stats.bowl.raw_score,
        } : null,
        field: { catches: player.catches, stumpings: player.stumpings, runouts: player.runouts },
        batScore: stats.bat.score,
        bowlScore: stats.bowl.score,
        overallScore: stats.overall,
        confidence: sampleConfidence(player),
        batPercentile: batPercentiles[player.id] ?? null,
        bowlPercentile: bowlPercentiles[player.id] ?? null,
      };

      if (!playerMap[player.id]) {
        playerMap[player.id] = { id: player.id, name: player.name, namesSeen: [...player.namesSeen], seasons: [] };
      } else {
        playerMap[player.id].name = player.name;
        player.namesSeen.forEach(n => {
          if (!playerMap[player.id].namesSeen.includes(n)) playerMap[player.id].namesSeen.push(n);
        });
      }
      playerMap[player.id].seasons.push(entry);
    });
  }

  return playerMap;
}

if (!fs.existsSync(inputDir)) {
  console.error(`Input directory not found: ${inputDir}`);
  process.exit(1);
}

function jsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
  });
}

const files = jsonFiles(inputDir);

// Single scan: group valid IPL files by season
const seasonFiles = {};
files.forEach(file => {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const info = raw.info || {};
    if (info.gender !== 'male' || info.match_type !== 'T20') return;
    if (info.event?.name !== 'Indian Premier League') return;
    if (!info.teams?.every(t => TEAM_SLUGS[t])) return;
    const season = String(info.season);
    (seasonFiles[season] = seasonFiles[season] || []).push(file);
  } catch (e) {
    console.warn(`Scan ${file}: ${e.message}`);
  }
});
const allSeasons = Object.keys(seasonFiles).sort();

const careerPlayers = {};
files.forEach(file => {
  try {
    processMatch(file, careerPlayers, null, { beforeSeason: '2026' });
  } catch (error) {
    console.warn(`Skipping career ${file}: ${error.message}`);
  }
});

const players = {};
const matches = [];
(seasonFiles['2026'] || []).forEach(file => {
  try {
    processMatch(file, players, matches, { season: '2026' });
  } catch (error) {
    console.warn(`Skipping ${file}: ${error.message}`);
  }
});

const output = buildOutput(players, matches, buildCareerMap(careerPlayers));
fs.mkdirSync(path.dirname(outJs), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(outJs, `globalThis.CRICSHEET_IPL_STATS = ${JSON.stringify(output)};\n`);

console.log(`Processed ${output.matchesProcessed} IPL 2026 matches`);
console.log(`Wrote ${outJson}`);
console.log(`Wrote ${outJs}`);

// Build per-season player history
const playerHistoryMap = buildPlayerHistory(seasonFiles, allSeasons);
const historyOutput = {
  generatedAt: new Date().toISOString(),
  seasons: allSeasons,
  players: playerHistoryMap,
};
const historyJs = path.join(path.dirname(outJs), 'ipl-player-history.js');
const historyJson = path.join(path.dirname(outJs), 'ipl-player-history.json');
fs.writeFileSync(historyJson, `${JSON.stringify(historyOutput, null, 2)}\n`);
fs.writeFileSync(historyJs, `globalThis.IPL_PLAYER_HISTORY = ${JSON.stringify(historyOutput)};\n`);

console.log(`Generated history for ${Object.keys(playerHistoryMap).length} players across ${allSeasons.length} seasons`);
console.log(`Wrote ${historyJson}`);
console.log(`Wrote ${historyJs}`);
