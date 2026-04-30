#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const inputDir = process.argv[2] || path.join(process.cwd(), 'data', 'cricsheet', 'tests_json');
const outJs = process.argv[3] || path.join(process.cwd(), 'data', 'wtc-test-data.js');

const WTC_TEAMS = [
  'Australia',
  'New Zealand',
  'South Africa',
  'Sri Lanka',
  'Pakistan',
  'India',
  'England',
  'Bangladesh',
  'West Indies',
];

const TEAM_META = {
  Australia: { slug: 'aus', nat: 'AUS' },
  'New Zealand': { slug: 'nz', nat: 'NZ' },
  'South Africa': { slug: 'rsa', nat: 'RSA' },
  'Sri Lanka': { slug: 'sl', nat: 'SL' },
  Pakistan: { slug: 'pak', nat: 'PAK' },
  India: { slug: 'ind', nat: 'IND' },
  England: { slug: 'eng', nat: 'ENG' },
  Bangladesh: { slug: 'ban', nat: 'BAN' },
  'West Indies': { slug: 'wi', nat: 'WI' },
};

const DISPLAY_NAMES = {
  'TM Head': 'Travis Head',
  'J Weatherald': 'Jake Weatherald',
  'M Labuschagne': 'Marnus Labuschagne',
  'MG Neser': 'Michael Neser',
  'SPD Smith': 'Steven Smith',
  'UT Khawaja': 'Usman Khawaja',
  'AT Carey': 'Alex Carey',
  'C Green': 'Cameron Green',
  'BJ Webster': 'Beau Webster',
  'MA Starc': 'Mitchell Starc',
  'SM Boland': 'Scott Boland',
  'TWM Latham': 'Tom Latham',
  'DP Conway': 'Devon Conway',
  'JA Duffy': 'Jacob Duffy',
  'KS Williamson': 'Kane Williamson',
  'R Ravindra': 'Rachin Ravindra',
  'DJ Mitchell': 'Daryl Mitchell',
  'TA Blundell': 'Tom Blundell',
  'GD Phillips': 'Glenn Phillips',
  'ZGF Foulkes': 'Zak Foulkes',
  'AY Patel': 'Ajaz Patel',
  'MD Rae': 'Michael Rae',
  'AK Markram': 'Aiden Markram',
  'RD Rickelton': 'Ryan Rickelton',
  'T Stubbs': 'Tristan Stubbs',
  'T Bavuma': 'Temba Bavuma',
  'T de Zorzi': 'Tony de Zorzi',
  'PWA Mulder': 'Wiaan Mulder',
  'S Muthusamy': 'Senuran Muthusamy',
  'K Verreynne': 'Kyle Verreynne',
  'M Jansen': 'Marco Jansen',
  'SR Harmer': 'Simon Harmer',
  'KA Maharaj': 'Keshav Maharaj',
  'P Nissanka': 'Pathum Nissanka',
  'LU Igalagamage': 'Lahiru Udara',
  'LD Chandimal': 'Dinesh Chandimal',
  'NGRP Jayasuriya': 'Prabath Jayasuriya',
  'DM de Silva': 'Dhananjaya de Silva',
  'PHKD Mendis': 'Kamindu Mendis',
  'BKG Mendis': 'Kusal Mendis',
  'GS Dinusha': 'Sonal Dinusha',
  'KTH Ratnayake': 'Tharindu Ratnayake',
  'MVT Fernando': 'Vishwa Fernando',
  'AM Fernando': 'Asitha Fernando',
  'YBK Jaiswal': 'Yashasvi Jaiswal',
  'B Sai Sudharsan': 'Sai Sudharsan',
  'RR Pant': 'Rishabh Pant',
  'RA Jadeja': 'Ravindra Jadeja',
  'JJ Bumrah': 'Jasprit Bumrah',
  'Z Crawley': 'Zak Crawley',
  'BM Duckett': 'Ben Duckett',
  'JG Bethell': 'Jacob Bethell',
  'JE Root': 'Joe Root',
  'HC Brook': 'Harry Brook',
  'BA Stokes': 'Ben Stokes',
  'JL Smith': 'Jamie Smith',
  'WG Jacks': 'Will Jacks',
  'BA Carse': 'Brydon Carse',
  'MJ Potts': 'Matthew Potts',
  'JC Tongue': 'Josh Tongue',
  'JD Campbell': 'John Campbell',
  'BA King': 'Brandon King',
  'KAR Hodge': 'Kavem Hodge',
  'TA Imlach': 'Tevin Imlach',
  'A Athanaze': 'Alick Athanaze',
  'JP Greaves': 'Justin Greaves',
  'RL Chase': 'Roston Chase',
  'A Phillip': 'Anderson Phillip',
  'SD Hope': 'Shai Hope',
  'JNT Seales': 'Jayden Seales',
  'KAJ Roach': 'Kemar Roach',
  'Agha Salman': 'Salman Ali Agha',
  'Nauman Ali': 'Noman Ali',
  'Nazmul Hossain Shanto': 'Najmul Hossain Shanto',
  'Mominul Haque': 'Mominul Haque Showrab',
  'Liton Das': 'Litton Kumer Das',
  'Mehedi Hasan Miraz': 'Mehidy Hasan Miraz',
  'Ebadat Hossain': 'Ebadot Hossain Chowdhury',
};

const STYLE_OVERRIDES = {
  'MG Neser': 'Right arm Medium fast',
  'C Green': 'Right arm Fast medium',
  'BJ Webster': 'Right arm Medium',
  'MA Starc': 'Left arm Fast',
  'SM Boland': 'Right arm Fast medium',
  'JA Duffy': 'Right arm Fast medium',
  'R Ravindra': 'Slow left arm Orthodox',
  'DJ Mitchell': 'Right arm Medium',
  'GD Phillips': 'Right arm Offbreak',
  'ZGF Foulkes': 'Right arm Medium fast',
  'AY Patel': 'Slow left arm Orthodox',
  'MD Rae': 'Right arm Medium fast',
  'AK Markram': 'Right arm Offbreak',
  'T Stubbs': 'Right arm Offbreak',
  'PWA Mulder': 'Right arm Medium',
  'S Muthusamy': 'Slow left arm Orthodox',
  'M Jansen': 'Left arm Fast medium',
  'SR Harmer': 'Right arm Offbreak',
  'KA Maharaj': 'Slow left arm Orthodox',
  'NGRP Jayasuriya': 'Slow left arm Orthodox',
  'DM de Silva': 'Right arm Offbreak',
  'PHKD Mendis': 'Right arm Offbreak',
  'GS Dinusha': 'Slow left arm Orthodox',
  'KTH Ratnayake': 'Right arm Offbreak',
  'MVT Fernando': 'Left arm Medium fast',
  'AM Fernando': 'Right arm Medium fast',
  'RA Jadeja': 'Slow left arm Orthodox',
  'Nithish Kumar Reddy': 'Right arm Medium fast',
  'Washington Sundar': 'Right arm Offbreak',
  'Kuldeep Yadav': 'Left arm Wrist spin',
  'JJ Bumrah': 'Right arm Fast',
  'Mohammed Siraj': 'Right arm Fast medium',
  'JG Bethell': 'Slow left arm Orthodox',
  'JE Root': 'Right arm Offbreak',
  'BA Stokes': 'Left arm Medium fast',
  'WG Jacks': 'Right arm Offbreak',
  'BA Carse': 'Right arm Fast medium',
  'MJ Potts': 'Right arm Medium fast',
  'JC Tongue': 'Right arm Fast medium',
  'JD Campbell': 'Right arm Offbreak',
  'KAR Hodge': 'Slow left arm Orthodox',
  'A Athanaze': 'Right arm Offbreak',
  'JP Greaves': 'Right arm Medium',
  'RL Chase': 'Right arm Offbreak',
  'A Phillip': 'Right arm Fast medium',
  'JNT Seales': 'Right arm Fast medium',
  'KAJ Roach': 'Right arm Fast medium',
  'Amad Butt': 'Right arm Medium fast',
  'Hasan Ali': 'Right arm Fast medium',
  'Khurram Shahzad': 'Right arm Medium fast',
  'Mohammad Abbas': 'Right arm Fast medium',
  'Nauman Ali': 'Slow left arm Orthodox',
  'Sajid Khan': 'Right arm Offbreak',
  'Agha Salman': 'Right arm Offbreak',
  'Shaheen Shah Afridi': 'Left arm Fast',
  'Mehedi Hasan Miraz': 'Right arm Offbreak',
  'Taijul Islam': 'Slow left arm Orthodox',
  'Nayeem Hasan': 'Right arm Offbreak',
  'Ebadat Hossain': 'Right arm Fast medium',
  'Shoriful Islam': 'Left arm Medium fast',
  'Taskin Ahmed': 'Right arm Fast',
  'Nahid Rana': 'Right arm Fast',
};

const WK_HINTS = new Set([
  'AT Carey', 'TA Blundell', 'RD Rickelton', 'K Verreynne', 'LU Igalagamage',
  'BKG Mendis', 'KL Rahul', 'Dhruv Jurel', 'RR Pant', 'JL Smith', 'TA Imlach',
  'SD Hope', 'Mohammad Rizwan', 'Muhammad Ghazi Ghori', 'Litton Kumer Das',
  'Liton Das',
]);

const ANNOUNCED_SQUADS = {
  pak: {
    name: 'Pakistan',
    note: '16-player squad announced for Bangladesh Test series. Switches to latest XI after that scorecard lands.',
    until: '2026-05-08',
    rows: [
      ['Shan Masood', 'PAK', 'bat', 'C', '', 'Shan Masood'],
      ['Abdullah Fazal', 'PAK', 'bat', '', '', 'Abdullah Fazal'],
      ['Amad Butt', 'PAK', 'ar', '', 'Right arm Medium fast', 'Amad Butt'],
      ['Azan Awais', 'PAK', 'bat', '', '', 'Azan Awais'],
      ['Babar Azam', 'PAK', 'bat', '', '', 'Babar Azam'],
      ['Hasan Ali', 'PAK', 'bowl', '', 'Right arm Fast medium', 'Hasan Ali'],
      ['Imam-ul-Haq', 'PAK', 'bat', '', '', 'Imam-ul-Haq'],
      ['Khurram Shahzad', 'PAK', 'bowl', '', 'Right arm Medium fast', 'Khurram Shahzad'],
      ['Mohammad Abbas', 'PAK', 'bowl', '', 'Right arm Fast medium', 'Mohammad Abbas'],
      ['Mohammad Rizwan', 'PAK', 'wk', '', '', 'Mohammad Rizwan'],
      ['Muhammad Ghazi Ghori', 'PAK', 'wk', '', '', 'Muhammad Ghazi Ghori'],
      ['Noman Ali', 'PAK', 'bowl', '', 'Slow left arm Orthodox', 'Nauman Ali'],
      ['Sajid Khan', 'PAK', 'bowl', '', 'Right arm Offbreak', 'Sajid Khan'],
      ['Salman Ali Agha', 'PAK', 'ar', '', 'Right arm Offbreak', 'Agha Salman'],
      ['Saud Shakeel', 'PAK', 'bat', '', '', 'Saud Shakeel'],
      ['Shaheen Shah Afridi', 'PAK', 'bowl', '', 'Left arm Fast', 'Shaheen Shah Afridi'],
    ],
  },
  ban: {
    name: 'Bangladesh',
    note: '15-player squad named for first Pakistan Test. Switches to latest XI after that scorecard lands.',
    until: '2026-05-08',
    rows: [
      ['Najmul Hossain Shanto', 'BAN', 'bat', 'C', '', 'Nazmul Hossain Shanto'],
      ['Mahmudul Hasan Joy', 'BAN', 'bat', '', '', 'Mahmudul Hasan Joy'],
      ['Shadman Islam', 'BAN', 'bat', '', '', 'Shadman Islam'],
      ['Mominul Haque Showrab', 'BAN', 'bat', '', '', 'Mominul Haque'],
      ['Mushfiqur Rahim', 'BAN', 'bat', '', '', 'Mushfiqur Rahim'],
      ['Litton Kumer Das', 'BAN', 'wk', '', '', 'Liton Das'],
      ['Mehidy Hasan Miraz', 'BAN', 'ar', 'VC', 'Right arm Offbreak', 'Mehedi Hasan Miraz'],
      ['Taijul Islam', 'BAN', 'bowl', '', 'Slow left arm Orthodox', 'Taijul Islam'],
      ['Nayeem Hasan', 'BAN', 'bowl', '', 'Right arm Offbreak', 'Nayeem Hasan'],
      ['Ebadot Hossain Chowdhury', 'BAN', 'bowl', '', 'Right arm Fast medium', 'Ebadat Hossain'],
      ['Shoriful Islam', 'BAN', 'bowl', '', 'Left arm Medium fast', 'Shoriful Islam'],
      ['Taskin Ahmed', 'BAN', 'bowl', '', 'Right arm Fast', 'Taskin Ahmed'],
      ['Nahid Rana', 'BAN', 'bowl', '', 'Right arm Fast', 'Nahid Rana'],
      ['Tanzid Hasan', 'BAN', 'bat', '', '', 'Tanzid Hasan'],
      ['Amite Hasan', 'BAN', 'bat', '', '', 'Amite Hasan'],
    ],
  },
};

const BOWLER_WICKET_KINDS = new Set(['bowled', 'caught', 'caught and bowled', 'lbw', 'stumped', 'hit wicket']);

function normName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z]/g, '');
}

function displayName(name) {
  return DISPLAY_NAMES[name] || name;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function emptyStats() {
  return {
    matches: new Set(),
    batInns: 0,
    notOuts: 0,
    runs: 0,
    balls: 0,
    hundreds: 0,
    fifties: 0,
    high: 0,
    bowlInnings: new Map(),
    bowlBalls: 0,
    bowlRuns: 0,
    wickets: 0,
    catches: 0,
    stumpings: 0,
    runouts: 0,
  };
}

function finalStats(stats) {
  const matches = stats.matches.size;
  const dismissals = stats.batInns - stats.notOuts;
  const batAvg = dismissals ? stats.runs / dismissals : 0;
  const batSr = stats.balls ? (stats.runs / stats.balls) * 100 : 0;
  const bowlAvg = stats.wickets ? stats.bowlRuns / stats.wickets : 0;
  const econ = stats.bowlBalls ? stats.bowlRuns / (stats.bowlBalls / 6) : 0;
  const bowlSr = stats.wickets ? stats.bowlBalls / stats.wickets : 0;
  return {
    matches,
    bat: {
      inns: stats.batInns,
      runs: stats.runs,
      balls: stats.balls,
      avg: round(batAvg, 2),
      sr: round(batSr, 2),
      hundreds: stats.hundreds,
      fifties: stats.fifties,
      high: stats.high,
    },
    bowl: {
      balls: stats.bowlBalls,
      runs: stats.bowlRuns,
      wickets: stats.wickets,
      avg: round(bowlAvg, 2),
      econ: round(econ, 2),
      sr: round(bowlSr, 2),
      fiveWickets: [...stats.bowlInnings.values()].filter(wickets => wickets >= 5).length,
    },
    field: {
      catches: stats.catches,
      stumpings: stats.stumpings,
      runouts: stats.runouts,
    },
  };
}

function readMatches() {
  return fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8')))
    .filter(match => match.info?.match_type === 'Test' && match.info?.gender === 'male');
}

function latestTeamAppearances(matches) {
  const latest = {};
  matches.forEach(match => {
    const date = (match.info.dates || [])[0] || '';
    WTC_TEAMS.forEach(team => {
      const players = match.info.players?.[team];
      if (!players) return;
      if (!latest[team] || date > latest[team].date) {
        latest[team] = {
          date,
          opponent: (match.info.teams || []).find(candidate => candidate !== team) || '',
          players,
          venue: [match.info.venue, match.info.city].filter(Boolean).join(', '),
        };
      }
    });
  });
  return latest;
}

function createAliasMap(squads) {
  const aliases = {};
  Object.values(squads).forEach(squad => {
    squad.rows.forEach(([name, , , , , statsKey]) => {
      aliases[normName(name)] = name;
      aliases[normName(statsKey || name)] = name;
    });
  });
  Object.entries(DISPLAY_NAMES).forEach(([source, display]) => {
    aliases[normName(source)] = display;
  });
  return aliases;
}

function inferRole(name, stats) {
  if (WK_HINTS.has(name) || WK_HINTS.has(displayName(name))) return 'wk';
  if (stats.bowlBalls >= 600 && (stats.runs >= 500 || stats.batInns >= 20)) return 'ar';
  if (stats.bowlBalls >= 240 && stats.runs >= 700) return 'ar';
  if (stats.bowlBalls >= 240) return 'bowl';
  return 'bat';
}

function buildSquads(matches) {
  const latest = latestTeamAppearances(matches);
  const squads = {};
  WTC_TEAMS.forEach(team => {
    const meta = TEAM_META[team];
    const override = ANNOUNCED_SQUADS[meta.slug];
    const latestDate = latest[team]?.date || '';
    if (override && (!latestDate || latestDate < override.until)) {
      squads[meta.slug] = {
        name: override.name,
        note: override.note,
        rows: override.rows,
      };
      return;
    }

    const latestInfo = latest[team];
    const rows = (latestInfo?.players || []).map(player => [
      displayName(player),
      meta.nat,
      'bat',
      '',
      STYLE_OVERRIDES[player] || STYLE_OVERRIDES[displayName(player)] || '',
      player,
    ]);
    squads[meta.slug] = {
      name: team,
      note: latestInfo
        ? `Last men's Test XI: v ${latestInfo.opponent}, ${latestInfo.date}.`
        : 'No recent Test XI found in Cricsheet.',
      rows,
    };
  });
  return squads;
}

function ensure(stats, name) {
  if (!stats[name]) stats[name] = { career: emptyStats(), cycle: emptyStats() };
  return stats[name];
}

function aggregateStats(matches, squads) {
  const aliases = createAliasMap(squads);
  const stats = {};
  Object.values(squads).forEach(squad => {
    squad.rows.forEach(([name]) => ensure(stats, name));
  });

  const playerFor = name => aliases[normName(name)];
  const mapsForDate = date => ['career', date >= '2025-06-01' && date <= '2027-06-30' ? 'cycle' : null].filter(Boolean);

  matches.forEach((match, matchIndex) => {
    const date = (match.info.dates || [])[0] || '';
    const periods = mapsForDate(date);
    const matchId = match.info.match_type_number || `${date}-${matchIndex}`;
    (match.innings || []).forEach((innings, inningsIndex) => {
      const batters = new Map();
      const bowlers = new Map();
      const outs = new Set();
      (innings.overs || []).forEach(over => {
        (over.deliveries || []).forEach(delivery => {
          if (!batters.has(delivery.batter)) batters.set(delivery.batter, { runs: 0, balls: 0 });
          const batter = batters.get(delivery.batter);
          batter.runs += delivery.runs?.batter || 0;
          if (!delivery.extras?.wides) batter.balls += 1;

          if (!bowlers.has(delivery.bowler)) bowlers.set(delivery.bowler, { balls: 0, runs: 0, wickets: 0 });
          const bowler = bowlers.get(delivery.bowler);
          if (!delivery.extras?.wides) bowler.balls += 1;
          bowler.runs += (delivery.runs?.total || 0)
            - (delivery.extras?.byes || 0)
            - (delivery.extras?.legbyes || 0)
            - (delivery.extras?.penalty || 0);

          (delivery.wickets || []).forEach(wicket => {
            outs.add(wicket.player_out);
            if (BOWLER_WICKET_KINDS.has(wicket.kind)) bowler.wickets += 1;
            (wicket.fielders || []).forEach(fielder => {
              const display = playerFor(fielder.name);
              if (!display) return;
              periods.forEach(period => {
                const target = ensure(stats, display)[period];
                target.matches.add(matchId);
                if (wicket.kind === 'stumped') target.stumpings += 1;
                else if (wicket.kind === 'run out') target.runouts += 1;
                else target.catches += 1;
              });
            });
          });
        });
      });

      batters.forEach((value, name) => {
        const display = playerFor(name);
        if (!display) return;
        periods.forEach(period => {
          const target = ensure(stats, display)[period];
          target.matches.add(matchId);
          target.batInns += 1;
          target.runs += value.runs;
          target.balls += value.balls;
          target.high = Math.max(target.high, value.runs);
          if (!outs.has(name)) target.notOuts += 1;
          if (value.runs >= 100) target.hundreds += 1;
          else if (value.runs >= 50) target.fifties += 1;
        });
      });

      bowlers.forEach((value, name) => {
        const display = playerFor(name);
        if (!display) return;
        periods.forEach(period => {
          const target = ensure(stats, display)[period];
          target.matches.add(matchId);
          target.bowlBalls += value.balls;
          target.bowlRuns += value.runs;
          target.wickets += value.wickets;
          if (value.balls) {
            const key = `${matchId}-${inningsIndex}`;
            target.bowlInnings.set(key, (target.bowlInnings.get(key) || 0) + value.wickets);
          }
        });
      });
    });
  });

  const finalized = {};
  Object.entries(stats).forEach(([name, periods]) => {
    finalized[name] = {
      career: finalStats(periods.career),
      cycle: finalStats(periods.cycle),
    };
  });

  Object.values(squads).forEach(squad => {
    squad.rows = squad.rows.map(row => {
      const [name, nat, role, tag, bowlingStyle, statsKey] = row;
      const roleSource = finalized[name]?.career || finalStats(emptyStats());
      const inferred = role === 'bat' ? inferRole(statsKey || name, {
        bowlBalls: roleSource.bowl.balls,
        runs: roleSource.bat.runs,
        batInns: roleSource.bat.inns,
      }) : role;
      return [name, nat, inferred, tag, bowlingStyle, statsKey || name];
    });
  });

  return finalized;
}

const matches = readMatches();
const squads = buildSquads(matches);
const stats = aggregateStats(matches, squads);
const output = `window.WTC_TEST_DATA = ${JSON.stringify({ squads, stats })};\n`;

fs.mkdirSync(path.dirname(outJs), { recursive: true });
fs.writeFileSync(outJs, output);

console.log(`Wrote ${outJs}`);
console.log(`Processed ${matches.length} men's Test scorecards`);
