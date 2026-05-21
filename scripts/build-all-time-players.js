#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2] || path.join(process.cwd(), 'data', 'cricsheet', 'tests_json');
const ODI_DIR  = process.argv[3] || path.join(process.cwd(), 'data', 'cricsheet', 'odis_male_json');
const T20_DIR  = process.argv[4] || path.join(process.cwd(), 'data', 'cricsheet', 't20s_male_json');
const LEGENDS  = process.argv[5] || path.join(process.cwd(), 'data', 'cricket-legends.json');
const OUT_JS   = process.argv[6] || path.join(process.cwd(), 'data', 'all-time-players.js');
const OUT_JSON = OUT_JS.replace(/\.js$/, '.json');

// ─── Full-member nations (ICC Full Members) ───────────────────────────────────
// Only these nations appear in the output / era-normalization pool.
const FULL_MEMBERS = new Set([
  'Afghanistan','Australia','Bangladesh','England','India','Ireland',
  'New Zealand','Pakistan','South Africa','Sri Lanka','West Indies','Zimbabwe',
]);

// ─── Birth years lookup (Cricsheet-era players not in legends JSON) ───────────
// Used only for age-at-milestone display in the Comparador tab.
const BORN_YEARS = {
  // India
  'vkohli':1988, 'rgsharma':1987, 'sayadav':1990, 'abhisheksharma':2000,
  'klrahul':1992, 'tilakvarma':2002, 'ybkjaiswal':2001, 'hhpandya':1993,
  'sksharma':1990, 'ravindrajadeja':1988, 'msdhoni':1981, 'skraina':1986,
  'jjbumrah':1993, 'kyadav':1994, 'arshdeepsingh':2001, 'iksharma':1994,
  'yuvrajsingh':1981, 'gautamgambhir':1981, 'msvijay':1984, 'rpant':1997,
  // Pakistan
  'babarazam':1994, 'mohammadrizwan':1992, 'fakharzaman':1990,
  'shoaibmalik':1982, 'imadwasim':1995, 'shadabkhan':1998, 'harisrauf':1993,
  'naseemshah':2003, 'mohammadamir':1992, 'imamulhaq':1995,
  // Australia
  'ajfinch':1986, 'dawarner':1986, 'gjmaxwell':1988, 'spdsmith':1989,
  'thdavid':1996, 'mwade':1987, 'patcummins':1993, 'mstarc':1990,
  'jhhazlewood':1991, 'mmarsh':1991, 'trhead':1994, 'jsfraser-mcgurk':2002,
  // England
  'jeroot':1990, 'hcbrook':2000, 'pdsalt':1999, 'djmalan':1987,
  'jcbuttler':1990, 'jmbairstow':1989, 'bajstokes':1991, 'smcurran':1998,
  'markwood':1990, 'phsalt':1999, 'wcross':2000, 'jmsimpson':1987,
  // South Africa
  'revandermerwe':1984, 'qdekock':1992, 'fduplessis':1984, 'da miller':1989,
  'davmiller':1989, 'krabada':1995, 'hevanderDussen':1989, 'atnortje':1993,
  'mpretorious':1989, 'hevanDussen':1989,
  // New Zealand
  'kswilliamson':1990, 'tgsouthee':1988, 'lhferguson':1991,
  'darylmitchell':1991, 'glphillips':1996, 'rachadwick':1989,
  'mjs':1990, 'jds':1988,
  // Sri Lanka
  'pwhdeSilva':1995, 'pwhdeSilva':1995, 'whasalanka':1993,
  'charithAsalanka':1997, 'dmdkarunaratne':1988, 'pwhdesilva':1995,
  // West Indies
  'sphope':1993, 'jcharles':1988, 'kpollard':1987,
  'djbravo':1983, 'crussell':1988, 'sbpooran':1995, 'rovpowell':1998,
  // Bangladesh
  'mdshafiuddin':1994, 'shoriful':2001, 'littonkumar':1994,
  // Afghanistan
  'rashidkhan':1998, 'mohammadnabi':1985, 'azmatullah':2001, 'ibrahimzadran':2002,
  // Zimbabwe
  'seanwilliams':1986,
};

// ─── Era definitions ──────────────────────────────────────────────────────────
const TEST_ERAS = [
  { key:'era1', label:'Golden Age',   years:'1877–1919', from:1877, to:1919 },
  { key:'era2', label:'Bradman Era',  years:'1920–1945', from:1920, to:1945 },
  { key:'era3', label:'Post-War',     years:'1946–1969', from:1946, to:1969 },
  { key:'era4', label:'Pace & Power', years:'1970–1994', from:1970, to:1994 },
  { key:'era5', label:'Modern',       years:'1995–2012', from:1995, to:2012 },
  { key:'era6', label:'T20 Era',      years:'2013+',     from:2013, to:2099 },
];
const ODI_ERAS = [
  { key:'odi1', label:'Pioneer ODI',    years:'1971–1991', from:1971, to:1991 },
  { key:'odi2', label:'Classic ODI',    years:'1992–2006', from:1992, to:2006 },
  { key:'odi3', label:'Power Play Era', years:'2007–2015', from:2007, to:2015 },
  { key:'odi4', label:'Surge Era',      years:'2016+',     from:2016, to:2099 },
];
const T20_ERAS = [
  { key:'t1', label:'Early T20I',  years:'2005–2015', from:2005, to:2015 },
  { key:'t2', label:'Modern T20I', years:'2016+',     from:2016, to:2099 },
];

function assignEra(midYear, eras) {
  for (const e of eras) if (midYear >= e.from && midYear <= e.to) return e.key;
  return eras[eras.length - 1].key;
}

// ─── Minimum qualifying thresholds ───────────────────────────────────────────
const MIN = {
  test: { bat:{ inn:40, runs:1500 }, bowl:{ wkts:75,  balls:2000 } },
  odi:  { bat:{ inn:60, runs:2000 }, bowl:{ wkts:75,  balls:2500 } },
  t20i: { bat:{ inn:45, runs:700  }, bowl:{ wkts:50,  balls:900  } },
};

// ─── Helper functions ─────────────────────────────────────────────────────────
const normKey = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
const round   = (v, d = 2) => { const f = 10 ** d; return Math.round((v + Number.EPSILON) * f) / f; };

// ─── Cricsheet parsing ────────────────────────────────────────────────────────
const BOWLER_KINDS = new Set(['bowled','caught','caught and bowled','lbw','stumped','hit wicket']);

function parseDir(dir, matchType) {
  const rawMap   = new Map();       // cricketer name → raw stats accumulator
  const teamVotes = new Map();      // normKey → Map<team, count>  (for country resolution)
  const nameMeta  = new Map();      // normKey → { firstYear, lastYear }

  if (!fs.existsSync(dir)) return { rawMap, teamVotes, nameMeta };

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    let match;
    try { match = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
    catch { continue; }

    const info = match.info || {};
    if (info.match_type !== matchType || info.gender !== 'male') continue;
    const year = parseInt((info.dates?.[0] || '').slice(0, 4), 10) || 0;

    // Tally team membership votes per player from official roster
    for (const [team, roster] of Object.entries(info.players || {})) {
      for (const pn of (roster || [])) {
        const nk = normKey(pn);
        if (!teamVotes.has(nk)) teamVotes.set(nk, new Map());
        const tv = teamVotes.get(nk);
        tv.set(team, (tv.get(team) || 0) + 1);
      }
    }

    for (const innings of (match.innings || [])) {
      const batAcc  = new Map();
      const outsSet = new Set();

      for (const over of (innings.overs || [])) {
        for (const d of (over.deliveries || [])) {
          if (d.batter) {
            if (!batAcc.has(d.batter)) batAcc.set(d.batter, { runs:0, balls:0 });
            const b = batAcc.get(d.batter);
            b.runs += d.runs?.batter || 0;
            if (!d.extras?.wides) b.balls += 1;
          }
          if (d.bowler) {
            const bs = getOrCreate(rawMap, d.bowler);
            if (!d.extras?.wides) bs.bowlBalls += 1;
            bs.bowlRuns += (d.runs?.total || 0)
              - (d.extras?.byes    || 0)
              - (d.extras?.legbyes || 0)
              - (d.extras?.penalty || 0);
            bs.matches.add(file);
            updateMeta(nameMeta, d.bowler, year);
          }
          for (const wk of (d.wickets || [])) {
            outsSet.add(wk.player_out);
            if (BOWLER_KINDS.has(wk.kind) && d.bowler) {
              const bs = getOrCreate(rawMap, d.bowler);
              const k  = file + innings.team;
              bs.inningsWkts.set(k, (bs.inningsWkts.get(k) || 0) + 1);
              bs.wickets += 1;
            }
          }
        }
      }
      batAcc.forEach((val, name) => {
        const s = getOrCreate(rawMap, name);
        s.batInns += 1; s.runs += val.runs; s.balls += val.balls;
        s.high = Math.max(s.high, val.runs);
        const isOut = outsSet.has(name);
        if (!isOut) s.notOuts += 1;
        if (val.runs >= 100) s.hundreds += 1; else if (val.runs >= 50) s.fifties += 1;
        s.matches.add(file);
        updateMeta(nameMeta, name, year);
        s.batInnArr.push({ year, runs: val.runs, balls: val.balls, out: isOut });
      });
    }
  }

  // Resolve primary team for each player (most votes, Full Member preferred)
  const nameTeam = new Map();
  for (const [nk, tv] of teamVotes) {
    let best = null, bestScore = -1;
    for (const [team, count] of tv) {
      const score = count * (FULL_MEMBERS.has(team) ? 1000 : 1);
      if (score > bestScore) { best = team; bestScore = score; }
    }
    if (best) nameTeam.set(nk, best);
  }

  return { rawMap, nameTeam, nameMeta };
}

function getOrCreate(map, name) {
  if (!map.has(name)) map.set(name, {
    batInns:0, notOuts:0, runs:0, balls:0, high:0,
    hundreds:0, fifties:0, bowlBalls:0, bowlRuns:0, wickets:0,
    inningsWkts: new Map(), matches: new Set(),
    batInnArr: [],
  });
  return map.get(name);
}
function updateMeta(meta, name, year) {
  if (!meta.has(name)) meta.set(name, { firstYear:year, lastYear:year });
  const m = meta.get(name);
  if (year) { m.firstYear = Math.min(m.firstYear, year); m.lastYear = Math.max(m.lastYear, year); }
}
function finalise(raw) {
  const mat = raw.matches.size, dism = raw.batInns - raw.notOuts;
  return {
    mat, batInns:raw.batInns, runs:raw.runs, hs:raw.high,
    avg:     dism ? round(raw.runs / dism) : (raw.batInns > 0 ? raw.runs : 0),
    sr:      raw.balls ? round((raw.runs / raw.balls) * 100) : null,
    h100:    raw.hundreds, h50:raw.fifties,
    wkts:    raw.wickets,
    bowl_avg: raw.wickets   ? round(raw.bowlRuns / raw.wickets)      : null,
    econ:     raw.bowlBalls ? round(raw.bowlRuns / (raw.bowlBalls/6)) : null,
    fwi:     [...raw.inningsWkts.values()].filter(w => w >= 5).length,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
function qualBat(st, fmt) {
  return st && st.batInns >= MIN[fmt].bat.inn && st.runs >= MIN[fmt].bat.runs;
}
function qualBowl(st, fmt) {
  if (!st || st.wkts < MIN[fmt].bowl.wkts) return false;
  return st.wkts * (st.bowl_avg || 30) >= MIN[fmt].bowl.balls;
}

// ─── Raw benchmark scoring (same approach as WTC Player Board) ────────────────
// scaledScore: maps value linearly from [floor, ceiling] to [0, points]
function scaledScore(value, floor, ceiling, points) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const ratio = (Number(value) - floor) / (ceiling - floor);
  return Math.max(0, Math.min(ratio, 1)) * points;
}

// Batting benchmarks: [floor, ceiling, max_points]
// ceiling = elite all-time benchmark; floor = absolute minimum to contribute
const BAT_BENCH = {
  // Test: avg ceiling raised to 56 so Bradman/Tendulkar reach ~97; sr weight lower (many legends lack SR data)
  test: { runs:[150,5000,32], avg:[18,56,46], h100:[0,12,14], sr:[35,65,6]  },
  odi:  { runs:[500,8000,28], avg:[25,55,32], sr:[60,105,28], h100:[0,12,10] },
  t20i: { runs:[400,3500,20], sr:[100,175,42], avg:[18,48,26], h50:[0,30,10] },
};

// Bowling benchmarks (base = floor score every qualifier gets for turning up)
const BWL_BENCH = {
  test: { base:18, wkts:[10,220,34], neg_avg:[0,34,38], fwi:[0,12,8]          },
  odi:  { base:15, wkts:[50,300,35], neg_avg:[0,25,28], neg_econ:[0,3.5,20]   },
  t20i: { base:10, wkts:[40,150,25], neg_econ:[0,3.5,42], neg_avg:[0,15,21]  },
};

function rawBatScore(st, fmt) {
  const b = BAT_BENCH[fmt];
  const sr = st.sr || (fmt === 't20i' ? 115 : fmt === 'odi' ? 72 : 47);
  let s;
  if (fmt === 'test') {
    s = scaledScore(st.runs,     ...b.runs)  +
        scaledScore(st.avg,      ...b.avg)   +
        scaledScore(st.h100||0,  ...b.h100)  +
        scaledScore(sr,          ...b.sr);
  } else if (fmt === 'odi') {
    s = scaledScore(st.runs,     ...b.runs)  +
        scaledScore(st.avg,      ...b.avg)   +
        scaledScore(sr,          ...b.sr)    +
        scaledScore(st.h100||0,  ...b.h100);
  } else {
    s = scaledScore(st.runs,     ...b.runs)  +
        scaledScore(sr,          ...b.sr)    +
        scaledScore(st.avg,      ...b.avg)   +
        scaledScore(st.h50||0,   ...b.h50);
  }
  return round(Math.min(98, s), 1);
}

function rawBowlScore(st, fmt) {
  const b  = BWL_BENCH[fmt];
  const ba = st.bowl_avg || (fmt === 'test' ? 45 : fmt === 'odi' ? 40 : 35);
  const ec = st.econ     || (fmt === 'test' ? 3.5 : fmt === 'odi' ? 5.5 : 8.5);
  let s    = b.base;
  if (fmt === 'test') {
    s += scaledScore(st.wkts,    ...b.wkts)     +
         scaledScore(55 - ba,    ...b.neg_avg)   +
         scaledScore(st.fwi||0,  ...b.fwi);
  } else if (fmt === 'odi') {
    s += scaledScore(st.wkts,    ...b.wkts)     +
         scaledScore(45 - ba,    ...b.neg_avg)   +
         scaledScore(7.5 - ec,   ...b.neg_econ);
  } else {
    s += scaledScore(st.wkts,    ...b.wkts)     +
         scaledScore(9.5 - ec,   ...b.neg_econ)  +
         scaledScore(35 - ba,    ...b.neg_avg);
  }
  return round(Math.min(98, s), 1);
}

function computeScores(playerArr, fmt) {
  for (const p of playerArr) {
    if (!p[fmt] || !FULL_MEMBERS.has(p.country)) continue;
    if (qualBat(p[fmt], fmt))  p[fmt].bat_score  = rawBatScore(p[fmt], fmt);
    if (qualBowl(p[fmt], fmt)) p[fmt].bowl_score = rawBowlScore(p[fmt], fmt);
  }
}

// Batting milestone snapshots at key innings counts (for Comparador tab).
const MILESTONE_INN = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200];
function computeBatMilestones(innArr, bornYear) {
  if (!innArr || innArr.length < 10) return null;
  const sorted = [...innArr].sort((a, b) => a.year - b.year);
  let cumRuns = 0, cumBalls = 0, cumInn = 0, cumOuts = 0, cumH100 = 0, cumH50 = 0;
  const result = {};
  for (const inn of sorted) {
    cumInn++;
    cumRuns += inn.runs;
    cumBalls += inn.balls || 0;
    if (inn.out) cumOuts++;
    if (inn.runs >= 100) cumH100++;
    else if (inn.runs >= 50) cumH50++;
    if (MILESTONE_INN.includes(cumInn)) {
      result[cumInn] = {
        year: inn.year || null,
        age:  (bornYear && inn.year) ? (inn.year - bornYear) : null,
        runs: cumRuns,
        avg:  cumOuts ? round(cumRuns / cumOuts, 1) : cumRuns,
        sr:   cumBalls ? round(cumRuns / cumBalls * 100, 1) : null,
        h100: cumH100,
        h50:  cumH50,
      };
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function inferRole(p) {
  let runs = 0, wkts = 0;
  for (const f of ['test','odi','t20i']) {
    if (!p[f]) continue;
    runs = Math.max(runs, p[f].runs);
    wkts = Math.max(wkts, p[f].wkts);
  }
  if (runs >= 3000 && wkts >= 150) return 'ar';
  if (wkts >= 100 && runs < 1500)  return 'bowl';
  if (runs > 0)                     return 'bat';
  return 'bowl';
}

function overallScore(st) {
  if (!st) return null;
  const { bat_score: bat, bowl_score: bowl } = st;
  if (bat == null && bowl == null) return null;
  // Single-dimension players: slight discount for not contributing in the other
  if (bat  == null) return round(bowl * 0.94, 1);
  if (bowl == null) return round(bat  * 0.94, 1);
  // Both dimensions scored: use the stronger as primary, weaker as bonus
  const hi = Math.max(bat, bowl), lo = Math.min(bat, bowl);
  // True all-rounder bonus: if both scores are genuinely good, award a small bonus
  if (hi >= 55 && lo >= 50) return round(Math.min(100, bat * 0.55 + bowl * 0.45 + 3), 1);
  // Otherwise the stronger dimension dominates
  return round(hi * 0.84 + lo * 0.16, 1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('Reading Cricsheet data...');
const { rawMap: testRaw, nameTeam: testNT, nameMeta: testMeta } = parseDir(TEST_DIR, 'Test');
const { rawMap: odiRaw,  nameTeam: odiNT,  nameMeta: odiMeta  } = parseDir(ODI_DIR,  'ODI');
const { rawMap: t20Raw,  nameTeam: t20NT,  nameMeta: t20Meta  } = parseDir(T20_DIR,  'T20');
console.log(`  Tests: ${testRaw.size} | ODIs: ${odiRaw.size} | T20Is: ${t20Raw.size} players`);

// Load legends
const legends = JSON.parse(fs.readFileSync(LEGENDS,'utf8')).players.filter(l=>l.key&&l.name&&l.country);
const legendByCricsheet  = new Map(legends.filter(l=>l.cricsheet_name).map(l=>[normKey(l.cricsheet_name), l.key]));
const legendByNormName   = new Map(legends.map(l=>[normKey(l.name), l.key]));

// ─── Build player map ─────────────────────────────────────────────────────────
const players = new Map();

function addLegend(leg) {
  if (players.has(leg.key)) return;
  const p = { key:leg.key, name:leg.name, country:leg.country, born:leg.born||null, test:null, odi:null, t20i:null };
  for (const fmt of ['test','odi','t20i']) {
    if (!leg[fmt]) continue;
    const s = leg[fmt];
    p[fmt] = {
      mat:s.mat, batInns:s.inn, runs:s.runs, hs:s.hs, avg:s.avg, sr:s.sr,
      h100:s.h100, h50:s.h50, wkts:s.wkts||0, bowl_avg:s.bowl_avg, econ:s.econ, fwi:s.fwi||0,
      _fy:leg.career_start_test||null, _ly:leg.career_end_test||null, bat_score:null, bowl_score:null,
    };
  }
  players.set(leg.key, p);
}
for (const leg of legends) addLegend(leg);

// Cricsheet-only players (not covered by any legend)
const allNames = new Set([...testRaw.keys(), ...odiRaw.keys(), ...t20Raw.keys()]);
for (const name of allNames) {
  const nk = normKey(name);
  if (legendByCricsheet.has(nk) || legendByNormName.has(nk)) continue;

  const key = 'cs-' + nk;
  const country = testNT.get(nk) || odiNT.get(nk) || t20NT.get(nk) || 'Unknown';
  if (!FULL_MEMBERS.has(country)) continue;  // skip non-Full-Member players entirely

  if (!players.has(key)) players.set(key, { key, name, country, born:null, test:null, odi:null, t20i:null });
  const p = players.get(key);

  const fmts = [];
  if (testRaw.has(name)) fmts.push(['test', testRaw.get(name), testMeta.get(name)]);
  if (odiRaw.has(name))  fmts.push(['odi',  odiRaw.get(name),  odiMeta.get(name)]);
  if (t20Raw.has(name))  fmts.push(['t20i', t20Raw.get(name),  t20Meta.get(name)]);
  for (const [fmt, raw, meta] of fmts) {
    if (p[fmt]) continue;
    p[fmt] = { ...finalise(raw), _fy:meta?.firstYear||null, _ly:meta?.lastYear||null,
               bat_score:null, bowl_score:null };
    if (raw.batInnArr?.length >= 20) {
      p.batMilestones = p.batMilestones || {};
      const bornYear = p.born || BORN_YEARS[normKey(p.name)] || null;
      p.batMilestones[fmt] = computeBatMilestones(raw.batInnArr, bornYear);
    }
  }
}

// ─── Era assignment ───────────────────────────────────────────────────────────
function midYear(p, fmt) {
  const s  = p[fmt];
  const fy = s?._fy  || (p.born ? p.born + 18 : null);
  const ly = s?._ly  || null;
  if (!fy && !ly) return null;
  return Math.round(((fy || ly) + (ly || fy)) / 2);
}

for (const p of players.values()) {
  p._era = {};
  for (const [fmt, eras] of [['test',TEST_ERAS],['odi',ODI_ERAS],['t20i',T20_ERAS]]) {
    if (!p[fmt]) continue;
    const m = midYear(p, fmt);
    p._era[fmt] = m ? assignEra(m, eras) : eras[eras.length-1].key;
    p[fmt].era  = p._era[fmt];
  }
}

// ─── Compute scores ───────────────────────────────────────────────────────────
console.log('Computing raw benchmark scores...');
const playerArr = [...players.values()];
computeScores(playerArr, 'test');
computeScores(playerArr, 'odi');
computeScores(playerArr, 't20i');

for (const p of playerArr) {
  p.role = inferRole(p);
  for (const fmt of ['test','odi','t20i']) {
    if (p[fmt]) p[fmt].overall = overallScore(p[fmt]);
  }
}

const FMT_W = { test:1.0, odi:0.9, t20i:0.8 };
for (const p of playerArr) {
  const scored = ['test','odi','t20i'].filter(f => p[f]?.overall != null);
  if (!scored.length) { p.global_bat=null; p.global_bowl=null; p.global_overall=null; continue; }
  let bs=0,bw=0, ws=0,ww=0, os=0,ow=0;
  for (const f of scored) {
    const w = FMT_W[f];
    if (p[f].bat_score  != null) { bs += p[f].bat_score  * w; bw += w; }
    if (p[f].bowl_score != null) { ws += p[f].bowl_score * w; ww += w; }
    os += p[f].overall * w; ow += w;
  }
  p.global_bat     = bw > 0 ? round(bs/bw,1) : null;
  p.global_bowl    = ww > 0 ? round(ws/ww,1) : null;
  p.global_overall = ow > 0 ? round(os/ow,1) : null;
  // Multi-format coverage bonus: reward players who excelled across formats.
  // 2 formats → +2%, 3 formats → +4%. Capped at 100.
  if (scored.length >= 2 && p.global_overall != null) {
    const bonus = scored.length === 3 ? 1.04 : 1.02;
    p.global_overall = Math.min(100, round(p.global_overall * bonus, 1));
  }
}

// ─── Clean up & output ───────────────────────────────────────────────────────
const finalList = playerArr
  .filter(p => FULL_MEMBERS.has(p.country) && p.global_overall != null)
  .map(p => {
    delete p._era;
    // Compute global career span from per-format first/last years
    const fys = ['test','odi','t20i'].map(f => p[f]?._fy).filter(Boolean);
    const lys = ['test','odi','t20i'].map(f => p[f]?._ly).filter(Boolean);
    if (fys.length) p.career_start = Math.min(...fys);
    if (lys.length) p.career_end   = Math.max(...lys);
    // Estimate for pre-Cricsheet legends with no match data but a birth year
    if (!p.career_start && p.born) { p.career_start = p.born + 20; p.career_end = p.born + 38; }
    for (const f of ['test','odi','t20i']) {
      if (p[f]) { delete p[f]._fy; delete p[f]._ly; delete p[f]._batZ; delete p[f]._bowlZ; }
    }
    return p;
  })
  .sort((a,b) => (b.global_overall ?? -1) - (a.global_overall ?? -1));

const erasRef = {
  test: Object.fromEntries(TEST_ERAS.map(e=>[e.key,{label:e.label,years:e.years}])),
  odi:  Object.fromEntries(ODI_ERAS.map(e=>[e.key,{label:e.label,years:e.years}])),
  t20i: Object.fromEntries(T20_ERAS.map(e=>[e.key,{label:e.label,years:e.years}])),
};

console.log(`Writing ${finalList.length} scored players...`);
fs.mkdirSync(path.dirname(OUT_JS), { recursive: true });
const payload = { generated: new Date().toISOString().slice(0, 10), eras: erasRef, players: finalList };
const jsonStr = JSON.stringify(payload);
fs.writeFileSync(OUT_JS,   `window.ALL_TIME_PLAYERS = ${jsonStr};\n`);
fs.writeFileSync(OUT_JSON, jsonStr + '\n');
console.log('Done. JSON:', Math.round(fs.statSync(OUT_JSON).size / 1024) + 'KB');
