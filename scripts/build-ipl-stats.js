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
]);

function normName(name = '') {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function ensurePlayer(players, name, team, registry = {}) {
  const id = registry[name] || normName(name);
  if (!players[id]) {
    players[id] = {
      id,
      name,
      team,
      teams: new Set(team ? [team] : []),
      matches: new Set(),
      innings: 0,
      runs: 0,
      balls: 0,
      outs: 0,
      fours: 0,
      sixes: 0,
      bowlBalls: 0,
      bowlRuns: 0,
      wickets: 0,
      dotBalls: 0,
      catches: 0,
      stumpings: 0,
      runouts: 0,
      fifties: 0,
      hundreds: 0,
    };
  }
  if (team) {
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

function inferRole(player) {
  if (WK_HINTS.has(player.name)) return 'wk';
  if (player.bowlBalls >= 48 && (player.balls >= 36 || player.runs >= 80)) return 'ar';
  if (player.bowlBalls >= 36 && player.runs >= 120) return 'ar';
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
  const econ = player.bowlBalls ? player.bowlRuns / (player.bowlBalls / 6) : 12;
  const bowlingAvg = player.wickets ? player.bowlRuns / player.wickets : player.bowlRuns || 50;
  const wktsPerMatch = player.matches.size ? player.wickets / player.matches.size : 0;
  const dotPct = player.bowlBalls ? (player.dotBalls / player.bowlBalls) * 100 : 0;

  if (role === 'bowl') {
    return {
      apps: player.matches.size,
      econ: round(econ, 2),
      bowling_avg: round(bowlingAvg, 2),
      wkts_per_match: round(wktsPerMatch, 2),
      dot_pct: round(dotPct, 2),
      source: 'cricsheet',
    };
  }
  if (role === 'ar') {
    return {
      apps: player.matches.size,
      batSr: round(sr, 2),
      batAvg: round(battingAvg, 2),
      boundary_pct: round(boundaryPct, 2),
      impact: round(impact, 3),
      bowlEcon: round(econ, 2),
      bowlAvg: round(bowlingAvg, 2),
      wktsPerMatch: round(wktsPerMatch, 2),
      dot_pct: round(dotPct, 2),
      source: 'cricsheet',
    };
  }
  return {
    apps: player.matches.size,
    sr: round(sr, 2),
    avg: round(battingAvg, 2),
    boundary_pct: round(boundaryPct, 2),
    impact: round(impact, 3),
    source: 'cricsheet',
  };
}

function statLine(player, role, stats) {
  if (role === 'bowl') return `${stats.wkts_per_match.toFixed(1)} wkt/m · Econ ${stats.econ.toFixed(1)}`;
  if (role === 'ar') return `${stats.batAvg.toFixed(1)} avg · Econ ${stats.bowlEcon.toFixed(1)}`;
  return `SR ${stats.sr.toFixed(0)} · Avg ${stats.avg.toFixed(1)}`;
}

function processMatch(filePath, seasonPlayers, matches) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const info = raw.info || {};
  if (info.gender !== 'male' || info.match_type !== 'T20') return;
  if (String(info.season) !== '2026') return;
  if (info.event?.name !== 'Indian Premier League') return;

  const teams = info.teams || [];
  if (!teams.every(team => TEAM_SLUGS[team])) return;

  const matchId = path.basename(filePath, '.json');
  const registry = info.registry?.people || {};
  const teamByPlayer = {};

  Object.entries(info.players || {}).forEach(([team, names]) => {
    names.forEach(name => {
      teamByPlayer[name] = team;
      ensurePlayer(seasonPlayers, name, team, registry).matches.add(matchId);
    });
  });

  (raw.innings || []).forEach(innings => {
    const battingTeam = innings.team;
    const bowlingTeam = teams.find(team => team !== battingTeam);
    const inningsBatters = new Set();
    const inningsRuns = {};

    (innings.overs || []).forEach(over => {
      (over.deliveries || []).forEach(delivery => {
        const batter = ensurePlayer(seasonPlayers, delivery.batter, battingTeam, registry);
        const bowler = ensurePlayer(seasonPlayers, delivery.bowler, bowlingTeam, registry);

        if (!inningsBatters.has(batter.id)) {
          batter.innings += 1;
          inningsBatters.add(batter.id);
        }

        batter.runs += delivery.runs?.batter || 0;
        inningsRuns[batter.id] = (inningsRuns[batter.id] || 0) + (delivery.runs?.batter || 0);
        if (countsForBatterBall(delivery)) batter.balls += 1;
        if ((delivery.runs?.batter || 0) === 4) batter.fours += 1;
        if ((delivery.runs?.batter || 0) === 6) batter.sixes += 1;

        bowler.bowlRuns += bowlerRuns(delivery);
        if (isLegalBall(delivery)) {
          bowler.bowlBalls += 1;
          if (delivery.runs?.total === 0) bowler.dotBalls += 1;
        }

        (delivery.wickets || []).forEach(wicket => {
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
  });

  matches.push({
    id: matchId,
    date: info.dates?.[0],
    matchNumber: info.event?.match_number,
    teams,
    winner: info.outcome?.winner,
  });
}

function buildOutput(players, matches) {
  const squads = {};
  Object.values(TEAM_SLUGS).forEach(slug => {
    squads[slug] = { batters: [], wicketKeepers: [], allRounders: [], bowlers: [] };
  });

  Object.values(players).forEach(player => {
    const slug = TEAM_SLUGS[player.team];
    if (!slug) return;
    const role = inferRole(player);
    const stats = buildStats(player, role);
    const score = calcFormScore(role, stats);
    const row = {
      num: Number.parseInt(player.id.slice(0, 2), 16) % 99 || 1,
      name: player.name,
      nat: '',
      tag: '',
      role,
      stats,
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
      group.sort((a, b) => (b.matches - a.matches) || (b.score - a.score) || a.name.localeCompare(b.name));
    });
  });

  return {
    source: 'Cricsheet ball-by-ball',
    generatedAt: new Date().toISOString(),
    season: '2026',
    matchesProcessed: matches.length,
    lastMatchDate: matches.map(m => m.date).sort().at(-1) || null,
    matches: matches.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    squads,
  };
}

if (!fs.existsSync(inputDir)) {
  console.error(`Input directory not found: ${inputDir}`);
  process.exit(1);
}

const files = fs.readdirSync(inputDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.join(inputDir, file));

const players = {};
const matches = [];
files.forEach(file => {
  try {
    processMatch(file, players, matches);
  } catch (error) {
    console.warn(`Skipping ${file}: ${error.message}`);
  }
});

const output = buildOutput(players, matches);
fs.mkdirSync(path.dirname(outJs), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(outJs, `globalThis.CRICSHEET_IPL_STATS = ${JSON.stringify(output)};\n`);

console.log(`Processed ${output.matchesProcessed} IPL 2026 matches`);
console.log(`Wrote ${outJson}`);
console.log(`Wrote ${outJs}`);
