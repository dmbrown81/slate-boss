// Gridiron balance harness — PERMANENT. Run with `npm run balance:gridiron`.
//
// The headline metric is the SKILL GAP: how much a synergy-aware reward policy
// out-champions a random one. If that gap is small, the roguelike meta-layer is
// noise (building doesn't matter). Keep this committed; run it on every
// balance-affecting change.

import {
  scoreFootballPlay, shuffle, cardCost, randomBossScheme, randomEnvironment,
  DRIVE_BUDGET, DRIVES_PER_MATCH, HAND_SIZE, AUDIBLES_PER_DRIVE,
  TEAM_ARCHETYPES, TEAM_PROFILES,
  type FbBossSchemeKey, type FbCard, type FbConceptKey, type FbEnvironmentKey, type TeamArchetype,
} from '../src/lib/footballRogue';
import {
  createRun, gameTargets, generateRewards, isChampionship, SEASON_GAMES,
  overtimeTargets, overtimeGameNumber,
  type FbRunState, type Reward,
} from '../src/lib/footballRun';
import { MAX_WAR_ROOM_PURCHASES, shopCredit } from '../src/lib/gridironEconomy';
import { mulberry32, stringSeed, type RNG } from '../src/lib/rng';

// Loss-cause attribution (per the v3 stress-test spec): a lost drive is either a
// dead_draw (the hand never assembled a scoring play, even after audibles) or
// underpowered (plays were made but the engine fell short of the target). High
// dead_draw% means losses feel like bad luck, not bad building — that's unfair,
// not hard, and we fix it by tuning draw/ratios, not by lowering targets.
type LossCause = 'dead_draw' | 'underpowered';

// The four identity lanes the meta should support as viable OPTIMAL lines.
type Lane = 'pass' | 'ground' | 'defense' | 'mobile';
const LANE_CONCEPTS: Record<Lane, FbConceptKey[]> = {
  pass: ['double_stack_bomb', 'shootout_stack', 'stack_td', 'checkdown'],
  ground: ['ground_pound', 'designed_run', 'field_goal'],
  defense: ['pick_six', 'takeaway', 'sack'],
  mobile: ['qb_keeper', 'designed_run'],
};
const LANE_TEAM: Record<Lane, TeamArchetype> = {
  pass: 'air_raid', ground: 'ground_game', defense: 'defensive_pressure', mobile: 'mobile_qb',
};

const isDefSplash = (c: FbConceptKey) => c === 'pick_six' || c === 'takeaway' || c === 'sack';

// ── Tactical play: greedy value-per-credit, audible to seek a strong play ────
// `prefer` (optional) commits the pilot to a lane: it plays the best IN-LANE
// concept it can, only falling back off-lane when nothing in-lane is playable.
// That is what makes the per-lane gauge honest — it measures whether COMMITTING
// to a lane wins, not whether the deck can be played as something else.
interface GameResult { won: boolean; drive: number; bomb: boolean; keeper: boolean; takeawayGame: boolean; score: number; concepts: Record<string, number>; lossCause?: LossCause; }

// `driveSink` (optional) collects each CLEARED drive's final score, for the
// ceiling-distribution probe (⑤). It does not affect play.
function playGame(run: FbRunState, targets: number[], environment: FbEnvironmentKey, bossScheme: FbBossSchemeKey, championship: boolean, rng: RNG, prefer?: Set<FbConceptKey>, driveSink?: number[]): GameResult {
  let full = shuffle([...run.deck], rng);
  let stacks = 0, ground = 0, qbRuns = 0, defPlays = 0, bomb = false, keeper = false, total = 0;
  const concepts: Record<string, number> = {};
  for (let d = 0; d < DRIVES_PER_MATCH; d++) {
    let hand = full.slice(0, HAND_SIZE); let deck = full.slice(HAND_SIZE); let discard: FbCard[] = [];
    let score = 0, budget = DRIVE_BUDGET[d], aud = AUDIBLES_PER_DRIVE, executed = 0;
    const counts: Partial<Record<FbConceptKey, number>> = {}; let guard = 0;
    while (score < targets[d] && guard++ < 60) {
      const combos: number[][] = [];
      const rec = (s: number, cur: number[]) => { if (cur.length) combos.push([...cur]); if (cur.length === 4) return; for (let i = s; i < hand.length; i++) rec(i + 1, [...cur, i]); };
      rec(0, []);
      let best: { ids: number[]; metric: number; total: number; cost: number; concept: FbConceptKey; qbRun: boolean } | null = null;
      let bestInLane: typeof best = null;
      for (const cmb of combos) {
        const cards = cmb.map((i) => hand[i]); const cost = cards.reduce((s, c) => s + cardCost(c), 0); if (cost > budget) continue;
        const res = scoreFootballPlay(cards, { coordinators: run.coordinators, environment, bossScheme, playbook: run.playbook, bombGames: run.bombGames, keeperGames: run.keeperGames, takeawayGames: run.takeawayGames, stacksThisMatch: stacks, groundBonusThisMatch: ground, qbRunsThisMatch: qbRuns, defPlaysThisMatch: defPlays, conceptCountsThisDrive: counts, driveIndex: d, championship });
        if (!res.valid) continue;
        const metric = res.total / cost;
        const cand = { ids: cmb, metric, total: res.total, cost: res.cost, concept: res.concept, qbRun: cards.some((c) => c.action === 'scramble' || c.action === 'qb_sneak') };
        if (!best || metric > best.metric) best = cand;
        if (prefer?.has(res.concept) && (!bestInLane || metric > bestInLane.metric)) bestInLane = cand;
      }
      // Stay on identity, but don't refuse a vastly better off-lane play (a real
      // committed player still kicks the field goal / takes the open look). The
      // hard commitment is in the BUILD (lane-forced rewards), not a play straitjacket.
      if (prefer && bestInLane && best && bestInLane.total >= 0.7 * best.total) best = bestInLane;
      if ((!best || (best.total < 200 && aud > 0)) && aud > 0) { aud--; const pool = shuffle([...deck, ...discard], rng); hand = pool.slice(0, HAND_SIZE); deck = pool.slice(HAND_SIZE); discard = []; continue; }
      if (!best) break;
      score += best.total; total += best.total; budget -= best.cost; executed++;
      counts[best.concept] = (counts[best.concept] ?? 0) + 1; concepts[best.concept] = (concepts[best.concept] ?? 0) + 1;
      if (best.concept.includes('stack')) stacks++;
      if (best.concept === 'ground_pound') ground += 6;
      if (best.qbRun) qbRuns++;
      if (isDefSplash(best.concept)) defPlays++;
      if (best.concept === 'double_stack_bomb') bomb = true;
      if (best.concept === 'qb_keeper') keeper = true;
      const ids = new Set(best.ids); const played = best.ids.map((i) => hand[i]); discard = [...discard, ...played]; hand = hand.filter((_, i) => !ids.has(i));
      while (hand.length < HAND_SIZE) { if (deck.length === 0) { if (!discard.length) break; deck = shuffle(discard, rng); discard = []; } hand.push(deck.shift()!); }
      if (budget < Math.min(...hand.map((c) => cardCost(c)), Infinity)) break;
    }
    if (score < targets[d]) {
      // dead_draw = the hand never assembled a single scoring play (even after
      // burning audibles); underpowered = plays were made but the engine fell
      // short. The greedy pilot always plays its best available concept, so a
      // dead_draw is genuine draw-screw, not stubbornness.
      const lossCause: LossCause = executed === 0 ? 'dead_draw' : 'underpowered';
      return { won: false, drive: d + 1, bomb, keeper, takeawayGame: defPlays >= 2, score: total, concepts, lossCause };
    }
    driveSink?.push(score);
    full = shuffle([...deck, ...hand, ...discard], rng);
  }
  return { won: true, drive: 3, bomb, keeper, takeawayGame: defPlays >= 2, score: total, concepts };
}

// ── Reward policies ──────────────────────────────────────────────────────────
// Every policy is now ECONOMY-AWARE: each shop credits the win purse + interest,
// then the pilot buys what its policy/funds allow. 'none' = hoard, buy nothing
// (the un-built floor). eco_greedy/eco_patient probe spend-now-vs-bank.
type RewardPolicy = 'synergy' | 'naive' | 'random' | 'none' | 'eco_greedy' | 'eco_patient' | 'commit';

function deckLean(deck: FbCard[]) {
  // Identity signal per lane (catches are shared support and don't vote) — must
  // match footballRun.deckLean so the harness reads leans the way the shop does.
  let pass = 0, run = 0, def = 0, qb = 0;
  for (const c of deck) {
    if (c.action === 'scramble' || c.action === 'qb_sneak') qb++;
    else if (c.side === 'pass') pass++;
    else if (c.side === 'run') run++;
    else if (c.side === 'defense') def++;
  }
  return { pass, run, def, qb };
}

// Synergy-aware value: prefer scaling pieces early, double down on the deck's lean.
function synergyScore(rw: Reward, run: FbRunState, gameNumber: number): number {
  const id = rw.id;
  const lean = deckLean(run.deck);
  const mobileLean = lean.qb >= 5 && lean.qb >= lean.def;
  const passLean = !mobileLean && lean.pass >= lean.run && lean.pass >= lean.def;
  const runLean = !mobileLean && lean.run > lean.pass && lean.run >= lean.def;
  const defLean = !mobileLean && lean.def > lean.pass && lean.def > lean.run;
  const early = (SEASON_GAMES - gameNumber); // 4..1 — scaling worth more early

  // Season-long compounders (the premium keystones) lead each lane.
  if (id === 'coord-franchise_qb') return 60 + early * 14 + (passLean ? 25 : 0);
  if (id === 'coord-improviser') return 60 + early * 14 + (mobileLean ? 25 : 0);
  if (id === 'coord-takeaway_machine') return 60 + early * 14 + (defLean ? 25 : 0);
  if (id === 'coord-two_minute_drill') return 52 + early * 10 + (passLean ? 22 : 0); // Legendary pass build-around
  if (id === 'coord-power_sweep') return 50 + early * 10 + (runLean ? 24 : 0);       // Rare ground Big-Play scaler
  if (id === 'coord-bell_cow') return 55 + early * 12 + (runLean ? 25 : 0);
  if (id === 'coord-air_raid') return 45 + early * 8 + (passLean ? 20 : 0);
  if (id === 'coord-read_option') return 45 + early * 8 + (mobileLean ? 20 : 0);
  if (id === 'coord-pressure_chain') return 45 + early * 8 + (defLean ? 20 : 0);
  if (id === 'coord-west_coast') return 30 + (passLean ? 18 : 0);
  if (id === 'coord-broken_play') return 30 + (mobileLean ? 18 : 0);
  if (id === 'coord-ball_hawk') return 25 + (defLean ? 30 : 0);
  if (id === 'coord-salary_wizard') return 35;
  if (id.startsWith('pb-')) {
    const con = id.slice(3) as keyof typeof run.playbook;
    const conS = String(con);
    const onLean = ((conS.includes('stack') || conS === 'checkdown') && passLean)
      || (conS === 'ground_pound' && runLean)
      || ((conS === 'pick_six' || conS === 'takeaway') && defLean)
      || (conS === 'qb_keeper' && mobileLean);
    const committedLevel = run.playbook[con] ?? 0; // concentration: ride what you've already leveled
    return 28 + (onLean ? 26 : 4) + committedLevel * 22 + early * 3;
  }
  if (id.startsWith('train-')) {
    const m = id.slice(6);
    const passT = m === 'explosive' || m === 'hot_route';
    const runT = m === 'discounted';
    const defT = m === 'explosive' || m === 'protected';
    const mobileT = m === 'clutch' || m === 'explosive';
    return 22 + ((passT && passLean) || (runT && runLean) || (defT && defLean) || (mobileT && mobileLean) ? 14 : 0);
  }
  if (id.startsWith('card-')) {
    const k = id.slice(5);
    const passCard = k === 'deep_wr' || k === 'gunslinger' || k === 'value_slot';
    const runCard = k === 'bell_rb';
    const defCard = k === 'shutdown_dst';
    const mobileCard = k === 'scrambler';
    return 18 + ((passCard && passLean) || (runCard && runLean) || (defCard && defLean) || (mobileCard && mobileLean) ? 14 : 0);
  }
  if (id === 'trim') return run.deck.length > 30 ? 34 : 16;
  if (id === 'upgrade') return 20;
  return 10;
}

// Lane-EXPLICIT reward value for the commitment gauge: force the buyer onto a
// lane's keystones regardless of what the deck currently leans, so the gauge
// measures the lane as an intended OPTIMAL line.
const LANE_COORD: Record<Lane, string[]> = {
  pass: ['coord-franchise_qb', 'coord-air_raid', 'coord-west_coast', 'coord-two_minute_drill'],
  ground: ['coord-bell_cow', 'coord-salary_wizard', 'coord-power_sweep'],
  defense: ['coord-takeaway_machine', 'coord-pressure_chain', 'coord-ball_hawk'],
  mobile: ['coord-improviser', 'coord-read_option', 'coord-broken_play'],
};
const LANE_PB: Record<Lane, string[]> = {
  pass: ['pb-double_stack_bomb', 'pb-stack_td', 'pb-checkdown'],
  ground: ['pb-ground_pound', 'pb-field_goal'],
  defense: ['pb-pick_six', 'pb-takeaway'],
  mobile: ['pb-qb_keeper', 'pb-stack_td'],
};
function laneScore(rw: Reward, run: FbRunState, lane: Lane, gameNumber: number): number {
  const id = rw.id;
  const early = SEASON_GAMES - gameNumber;
  const ci = LANE_COORD[lane].indexOf(id);
  if (ci >= 0) return 80 - ci * 6 + early * 10;            // lane coordinators, season ones first
  if (id.startsWith('coord-')) return 8;                   // off-lane coordinator: avoid
  const pj = LANE_PB[lane].indexOf(id);
  if (pj >= 0) { const con = id.slice(3) as keyof typeof run.playbook; return 42 - pj * 4 + (run.playbook[con] ?? 0) * 22 + early * 3; }
  if (id.startsWith('pb-')) return 4;                      // off-lane game plan
  if (id.startsWith('train-') || id.startsWith('card-')) return synergyScore(rw, run, gameNumber); // lean-fit stabilizers
  if (id === 'trim') return run.deck.length > 30 ? 30 : 14;
  if (id === 'upgrade') return 16;
  return 8;
}

// One shop visit: spend Funds per policy. Returns the run + Funds spent. The
// shelf shrinks as items sell; the synergy family banks rather than buy junk.
function runShop(run: FbRunState, policy: RewardPolicy, gameNumber: number, rng: RNG, lane?: Lane): { run: FbRunState; spent: number } {
  if (policy === 'none') return { run, spent: 0 };
  let r = run; let spent = 0;
  let shelf = generateRewards(r, rng);
  for (let i = 0; i < MAX_WAR_ROOM_PURCHASES; i++) {
    const affordable = shelf.filter((rw) => rw.cost <= r.funds);
    if (affordable.length === 0) break;
    let pick: Reward | undefined;
    if (policy === 'random') {
      if (rng() < 0.3) break;                    // sometimes stop early / bank
      pick = affordable[Math.floor(rng() * affordable.length)];
    } else if (policy === 'naive') {
      const order = ['coordinator', 'playbook', 'card', 'upgrade', 'training', 'trim'];
      pick = [...affordable].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
    } else {
      // synergy / eco_greedy / eco_patient / commit: all buy the BEST-fit
      // affordable item; they differ in WHETHER TO BANK (the spend-vs-save call)
      // and, for commit, in scoring rewards by a forced lane.
      const scorer = policy === 'commit' && lane
        ? (rw: Reward) => laneScore(rw, r, lane, gameNumber)
        : (rw: Reward) => synergyScore(rw, r, gameNumber);
      pick = [...affordable].sort((a, b) => scorer(b) - scorer(a))[0];
      const best = scorer(pick);
      if (policy === 'eco_patient') {
        const keystone = pick.kind === 'coordinator' || pick.kind === 'playbook';
        if (!keystone && r.funds < 9) break;     // hold cheap turns to afford keystones
        if (best < 30 && r.funds < 12) break;
      } else if (policy === 'eco_greedy') {
        if (best < 10) break;                    // spend now on anything decent, never bank
      } else if (best < 16) break;               // synergy: never buy total junk
    }
    if (!pick) break;
    r = pick.apply({ ...r, funds: r.funds - pick.cost });
    spent += pick.cost;
    shelf = shelf.filter((x) => x.id !== pick!.id);
  }
  return { run: r, spent };
}

interface SeasonOut { champion: boolean; gamesWon: number; perGame: number[]; spent: number; lossCause?: LossCause; }
function playSeason(policy: RewardPolicy, team: TeamArchetype = 'balanced', seasonIndex = 0, lane?: Lane, driveSink?: number[]): SeasonOut {
  const rng = mulberry32(stringSeed(`gridiron-balance:${BALANCE_SEED}:${team}:${policy}:${lane ?? '-'}:${seasonIndex}`));
  let run = createRun(team, Math.floor(rng() * 0x7fffffff));
  const prefer = lane ? new Set(LANE_CONCEPTS[lane]) : undefined;
  const perGame = [0, 0, 0, 0, 0];
  let spent = 0;
  for (let g = 1; g <= SEASON_GAMES; g++) {
    const environment = randomEnvironment(rng);
    const bossScheme = randomBossScheme(g, isChampionship(g), rng);
    const res = playGame(run, gameTargets(environment, g), environment, bossScheme, isChampionship(g), rng, prefer, driveSink);
    if (!res.won) return { champion: false, gamesWon: g - 1, perGame, spent, lossCause: res.lossCause };
    perGame[g - 1] = 1;
    run = {
      ...run,
      bombGames: run.bombGames + (res.bomb ? 1 : 0),
      keeperGames: run.keeperGames + (res.keeper ? 1 : 0),
      takeawayGames: run.takeawayGames + (res.takeawayGame ? 1 : 0),
    };
    if (!isChampionship(g)) {
      const credit = shopCredit(run.funds, g);
      run = { ...run, funds: run.funds + credit.total };
      const shopped = runShop(run, policy, g, rng, lane);
      run = shopped.run; spent += shopped.spent;
    }
  }
  return { champion: true, gamesWon: SEASON_GAMES, perGame, spent };
}

// ── Run ──────────────────────────────────────────────────────────────────────
const N = Number(process.argv[2] ?? 1500);
const BALANCE_SEED = process.env.GRIDIRON_BALANCE_SEED ?? 'gridiron-balance-v1';
const verdict = (g: number, hi: number, mid: number) => (g >= hi ? '✅' : g >= mid ? '🟡' : '❌');

// ── (1) Decisiveness on the baseline (balanced) team: does building matter? ───
const policies: RewardPolicy[] = ['synergy', 'naive', 'random', 'none'];
const champ: Record<RewardPolicy, number> = { synergy: 0, naive: 0, random: 0, none: 0 };

console.log(`\nGridiron balance — ${N} seasons per cell (seed: ${BALANCE_SEED})\n`);
console.log('① DECISIVENESS (Ironhawks / balanced baseline)');
console.log('policy   | champion | avgGamesWon | per-game clear (G1→G5)');
console.log('---------|----------|-------------|------------------------');
for (const p of policies) {
  let wins = 0, gw = 0; const pg = [0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) { const s = playSeason(p, 'balanced', i); if (s.champion) wins++; gw += s.gamesWon; s.perGame.forEach((w, i2) => pg[i2] += w); }
  champ[p] = (100 * wins) / N;
  console.log(`${p.padEnd(8)} | ${(100 * wins / N).toFixed(1).padStart(6)}%  | ${(gw / N).toFixed(2).padStart(10)}  | ${pg.map((x) => `${Math.round(100 * x / N)}%`.padStart(4)).join(' ')}`);
}
const rewardGap = champ.synergy - champ.random;
const buildGap = Math.max(champ.synergy, champ.naive) - champ.none;
console.log(`\nBUILD GAP   (best − no-rewards):     ${buildGap.toFixed(1)} pts  ${verdict(buildGap, 30, 18)}`);
console.log(`REWARD GAP  (synergy − random pick): ${rewardGap.toFixed(1)} pts  ${verdict(rewardGap, 25, 12)}`);
console.log(buildGap >= 30 && rewardGap >= 12 ? '✅ the roguelike meta-layer is decisive' : '❌ meta-layer too weak');

// ── (2) PER-TEAM VIABILITY: is the meta solved, or are ≥3 lines competitive? ──
// Each team is piloted by a skilled (synergy) policy committing to its own deck.
// Acceptance: champion-rate spread ≤ ~15 pts (no auto-win / dead team), and
// dead_draw losses < ~10% (losses are about building, not bad luck).
console.log('\n② PER-TEAM VIABILITY (skilled pilot, synergy rewards)');
console.log('team        | arch     | diff   | champion | avgGW | deadDraw% of losses');
console.log('------------|----------|--------|----------|-------|--------------------');
const teamChamp: Record<TeamArchetype, number> = { balanced: 0, air_raid: 0, ground_game: 0, mobile_qb: 0, defensive_pressure: 0 };
let globalLosses = 0, globalDead = 0;
for (const team of TEAM_ARCHETYPES) {
  const prof = TEAM_PROFILES[team];
  let wins = 0, gw = 0, losses = 0, dead = 0;
  for (let i = 0; i < N; i++) {
    const s = playSeason('synergy', team, i);
    if (s.champion) wins++; else { losses++; if (s.lossCause === 'dead_draw') dead++; }
    gw += s.gamesWon;
  }
  teamChamp[team] = (100 * wins) / N;
  globalLosses += losses; globalDead += dead;
  const deadPct = losses ? (100 * dead) / losses : 0;
  console.log(`${prof.displayName.padEnd(11)} | ${team.slice(0, 8).padEnd(8)} | ${prof.difficulty.padEnd(6)} | ${(100 * wins / N).toFixed(1).padStart(6)}%  | ${(gw / N).toFixed(2)} | ${deadPct.toFixed(1).padStart(5)}%`);
}
const champVals = TEAM_ARCHETYPES.map((t) => teamChamp[t]);
const spread = Math.max(...champVals) - Math.min(...champVals);
const competitive = champVals.filter((v) => v >= 25).length;       // teams that can realistically win
const deadDrawPct = globalLosses ? (100 * globalDead) / globalLosses : 0;
console.log(`\nSPREAD      (max − min champion):    ${spread.toFixed(1)} pts  ${verdict(40 - spread, 25, 15)}  (want ≤ ~15)`);
console.log(`COMPETITIVE (teams ≥ 25% champion):  ${competitive} / 5    ${verdict(competitive, 4, 3)}  (want ≥ 3 viable lines)`);
console.log(`DEAD-DRAW   (% of losses to bad draw): ${deadDrawPct.toFixed(1)}%  ${verdict(20 - deadDrawPct, 12, 5)}  (want < ~10%)`);
console.log(spread <= 18 && competitive >= 3 && deadDrawPct < 12 ? '✅ the meta is multi-path, not solved' : '⚠️ rebalance: a team is dead/auto-win or losses are draw-screw');

// ── (3) ECONOMY: does the Front Office layer reward smart spending? ───────────
// smart spend (synergy) should beat random spend; spend-it-all (greedy) and
// bank-for-keystones (patient) should BOTH be viable — neither dominating proves
// the spend-now-vs-bank decision is real, not solved.
console.log('\n③ FRONT OFFICE ECONOMY (Ironhawks / balanced baseline)');
console.log('policy     | champion | avg $ spent / season');
console.log('-----------|----------|---------------------');
const ecoPolicies: RewardPolicy[] = ['synergy', 'random', 'eco_greedy', 'eco_patient', 'none'];
const ecoChamp: Partial<Record<RewardPolicy, number>> = {};
for (const p of ecoPolicies) {
  let wins = 0, totSpent = 0;
  for (let i = 0; i < N; i++) { const s = playSeason(p, 'balanced', i); if (s.champion) wins++; totSpent += s.spent; }
  ecoChamp[p] = (100 * wins) / N;
  console.log(`${p.padEnd(10)} | ${(100 * wins / N).toFixed(1).padStart(6)}%  | ${(totSpent / N).toFixed(1).padStart(6)}`);
}
const smartSpendGap = (ecoChamp.synergy ?? 0) - (ecoChamp.random ?? 0);
const bankVsSpend = Math.abs((ecoChamp.eco_greedy ?? 0) - (ecoChamp.eco_patient ?? 0));
console.log(`\nSMART-SPEND  (synergy − random spend): ${smartSpendGap.toFixed(1)} pts  ${verdict(smartSpendGap, 12, 6)}  (want spending well to matter)`);
console.log(`SPEND vs BANK (|greedy − patient|):    ${bankVsSpend.toFixed(1)} pts  ${verdict(20 - bankVsSpend, 8, 4)}  (want neither dominant: small gap)`);
console.log(smartSpendGap >= 6 && bankVsSpend <= 16 ? '✅ the economy is a real decision, not a formality' : '⚠️ tune purse/interest/prices');

// ── (4) PER-LANE COMMITMENT: is each identity a viable OPTIMAL line? ──────────
// Each lane is piloted by a 'commit' policy on its signature team: the buyer
// forces that lane's keystones and the player forces in-lane play. This is the
// honest gauge for the variety work — per-TEAM viability (②) can hide a lane by
// letting a deck win as something else (e.g. Volts played as a passing deck);
// this forces the identity and asks whether COMMITTING to it actually wins.
console.log('\n④ PER-LANE COMMITMENT (forced commit, signature team)');
console.log('lane     | team        | champion | avgGW');
console.log('---------|-------------|----------|------');
const lanes: Lane[] = ['pass', 'ground', 'defense', 'mobile'];
const laneChamp: Record<Lane, number> = { pass: 0, ground: 0, defense: 0, mobile: 0 };
for (const lane of lanes) {
  const team = LANE_TEAM[lane];
  let wins = 0, gw = 0;
  for (let i = 0; i < N; i++) { const s = playSeason('commit', team, i, lane); if (s.champion) wins++; gw += s.gamesWon; }
  laneChamp[lane] = (100 * wins) / N;
  console.log(`${lane.padEnd(8)} | ${TEAM_PROFILES[team].displayName.padEnd(11)} | ${(100 * wins / N).toFixed(1).padStart(6)}%  | ${(gw / N).toFixed(2)}`);
}
const laneVals = lanes.map((l) => laneChamp[l]);
const laneSpread = Math.max(...laneVals) - Math.min(...laneVals);
console.log(`\nLANE SPREAD (max − min commit champion): ${laneSpread.toFixed(1)} pts  ${verdict(20 - laneSpread, 10, 4)}  (want ≤ ~10)`);
console.log(laneSpread <= 12 ? '✅ all four identity lanes are viable optimal lines' : '⚠️ a lane is not a real commit target — deepen it');
console.log('──────────────────────────────────────────────\n');

// ── (5) CEILING: drive-score distribution + Overtime reach ────────────────────
// Balatro's drama comes from the gap between a normal score and a spike. We want
// the CAMPAIGN distribution to stay tight (no single drive trivializing a game),
// while OVERTIME — a separate post-championship mode — opens a real ceiling.
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(p * sortedAsc.length)));
  return sortedAsc[idx];
}

// Replay a synergy season; if it wins the championship, keep playing Overtime
// rounds (no shop, climbing targets) until it stalls. Returns furthest round and
// the single biggest drive seen in OT — the visible ceiling.
function playOvertimeReach(team: TeamArchetype, seasonIndex: number): { champion: boolean; round: number; best: number } {
  const rng = mulberry32(stringSeed(`gridiron-balance:${BALANCE_SEED}:otreach:${team}:${seasonIndex}`));
  let run = createRun(team, Math.floor(rng() * 0x7fffffff));
  for (let g = 1; g <= SEASON_GAMES; g++) {
    const env = randomEnvironment(rng);
    const boss = randomBossScheme(g, isChampionship(g), rng);
    const res = playGame(run, gameTargets(env, g), env, boss, isChampionship(g), rng);
    if (!res.won) return { champion: false, round: 0, best: 0 };
    run = { ...run, bombGames: run.bombGames + (res.bomb ? 1 : 0), keeperGames: run.keeperGames + (res.keeper ? 1 : 0), takeawayGames: run.takeawayGames + (res.takeawayGame ? 1 : 0) };
    if (!isChampionship(g)) { run = { ...run, funds: run.funds + shopCredit(run.funds, g).total }; run = runShop(run, 'synergy', g, rng).run; }
  }
  let round = 1, best = 0;
  while (round <= 60) {
    const env = randomEnvironment(rng);
    const boss = randomBossScheme(overtimeGameNumber(round), true, rng);
    const sink: number[] = [];
    const res = playGame(run, overtimeTargets(env, round), env, boss, true, rng, undefined, sink);
    for (const s of sink) if (s > best) best = s;
    if (!res.won) return { champion: true, round, best };
    round++;
  }
  return { champion: true, round, best };
}

console.log('\n⑤ CEILING (campaign drive distribution + Overtime reach)');
const campaignDrives: number[] = [];
for (const team of TEAM_ARCHETYPES) for (let i = 0; i < N; i++) playSeason('synergy', team, i, undefined, campaignDrives);
campaignDrives.sort((a, b) => a - b);
const medDrive = percentile(campaignDrives, 0.5);
const p99Drive = percentile(campaignDrives, 0.99);
const driveRatio = p99Drive / Math.max(1, medDrive);
console.log(`campaign cleared-drive scores: n=${campaignDrives.length}  median=${medDrive}  p99=${p99Drive}  p99/median=${driveRatio.toFixed(2)}×  ${verdict(8 - driveRatio, 5, 3)} (want tight: ≤ ~3×)`);

const OT_N = Math.max(30, Math.floor(N / 8));
const otReached: number[] = [];
const otBest: number[] = [];
for (const team of TEAM_ARCHETYPES) for (let i = 0; i < OT_N; i++) {
  const r = playOvertimeReach(team, i);
  if (r.champion) { otReached.push(r.round); otBest.push(r.best); }
}
otReached.sort((a, b) => a - b);
otBest.sort((a, b) => a - b);
const otMedRound = percentile(otReached, 0.5);
const otMaxRound = otReached[otReached.length - 1] ?? 0;
const otCeil = percentile(otBest, 0.99);
console.log(`overtime reach (${otReached.length} champion builds): median=R${otMedRound}  max=R${otMaxRound}  | OT best-drive median=${percentile(otBest, 0.5)}  p99=${otCeil}`);
console.log(`OT ceiling vs campaign median drive: ${(otCeil / Math.max(1, medDrive)).toFixed(1)}×  ${verdict(otCeil / Math.max(1, medDrive), 3, 1.8)} (want Overtime to open a real ceiling: ≥ ~3×)`);
console.log('──────────────────────────────────────────────\n');

if (process.env.GRIDIRON_DEBUG) {
  const cases: [string, TeamArchetype, RewardPolicy, Lane | undefined][] = [
    ['Volts synergy', 'mobile_qb', 'synergy', undefined],
    ['ground commit', 'ground_game', 'commit', 'ground'],
    ['defense commit', 'defensive_pressure', 'commit', 'defense'],
  ];
  for (const [label, team, policy, lane] of cases) {
    console.log(`DEBUG ${label}:`);
    for (let i = 0; i < 4; i++) {
      const rng = mulberry32(stringSeed(`gridiron-balance:${BALANCE_SEED}:${team}:${policy}:${lane ?? '-'}:${i}`));
      let run = createRun(team, Math.floor(rng() * 0x7fffffff));
      const prefer = lane ? new Set(LANE_CONCEPTS[lane]) : undefined;
      const pg: string[] = [];
      for (let g = 1; g <= SEASON_GAMES; g++) {
        const environment = randomEnvironment(rng);
        const bossScheme = randomBossScheme(g, isChampionship(g), rng);
        const res = playGame(run, gameTargets(environment, g), environment, bossScheme, isChampionship(g), rng, prefer);
        pg.push(`G${g}:${res.won ? 'W' : `L@d${res.drive}/${res.lossCause}`}`);
        if (!res.won) break;
        run = { ...run, bombGames: run.bombGames + (res.bomb ? 1 : 0), keeperGames: run.keeperGames + (res.keeper ? 1 : 0), takeawayGames: run.takeawayGames + (res.takeawayGame ? 1 : 0) };
        if (!isChampionship(g)) { run = { ...run, funds: run.funds + shopCredit(run.funds, g).total }; run = runShop(run, policy, g, rng, lane).run; }
      }
      console.log(`  s${i}: ${pg.join(' ')} | coords=[${run.coordinators.join(',')}] pb=${JSON.stringify(run.playbook)}`);
    }
  }
}
