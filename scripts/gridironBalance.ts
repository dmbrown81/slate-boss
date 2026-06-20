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
  type FbRunState, type Reward,
} from '../src/lib/footballRun';
import { shopCredit } from '../src/lib/gridironEconomy';
import { mulberry32, stringSeed, type RNG } from '../src/lib/rng';

// Loss-cause attribution (per the v3 stress-test spec): a lost drive is either a
// dead_draw (the hand never assembled a scoring play, even after audibles) or
// underpowered (plays were made but the engine fell short of the target). High
// dead_draw% means losses feel like bad luck, not bad building — that's unfair,
// not hard, and we fix it by tuning draw/ratios, not by lowering targets.
type LossCause = 'dead_draw' | 'underpowered';

// ── Tactical play: greedy value-per-credit, audible to seek a strong play ────
interface GameResult { won: boolean; drive: number; bomb: boolean; score: number; concepts: Record<string, number>; lossCause?: LossCause; }

function playGame(run: FbRunState, targets: number[], environment: FbEnvironmentKey, bossScheme: FbBossSchemeKey, championship: boolean, rng: RNG): GameResult {
  let full = shuffle([...run.deck], rng);
  let stacks = 0, ground = 0, bomb = false, total = 0;
  const concepts: Record<string, number> = {};
  for (let d = 0; d < DRIVES_PER_MATCH; d++) {
    let hand = full.slice(0, HAND_SIZE); let deck = full.slice(HAND_SIZE); let discard: FbCard[] = [];
    let score = 0, budget = DRIVE_BUDGET[d], aud = AUDIBLES_PER_DRIVE, executed = 0;
    const counts: Partial<Record<FbConceptKey, number>> = {}; let guard = 0;
    while (score < targets[d] && guard++ < 60) {
      const combos: number[][] = [];
      const rec = (s: number, cur: number[]) => { if (cur.length) combos.push([...cur]); if (cur.length === 4) return; for (let i = s; i < hand.length; i++) rec(i + 1, [...cur, i]); };
      rec(0, []);
      let best: { ids: number[]; metric: number; total: number; cost: number; concept: FbConceptKey } | null = null;
      for (const cmb of combos) {
        const cards = cmb.map((i) => hand[i]); const cost = cards.reduce((s, c) => s + cardCost(c), 0); if (cost > budget) continue;
        const res = scoreFootballPlay(cards, { coordinators: run.coordinators, environment, bossScheme, playbook: run.playbook, bombGames: run.bombGames, stacksThisMatch: stacks, groundBonusThisMatch: ground, conceptCountsThisDrive: counts, driveIndex: d, championship });
        if (!res.valid) continue;
        const metric = res.total / cost;
        if (!best || metric > best.metric) best = { ids: cmb, metric, total: res.total, cost: res.cost, concept: res.concept };
      }
      if ((!best || (best.total < 200 && aud > 0)) && aud > 0) { aud--; const pool = shuffle([...deck, ...discard], rng); hand = pool.slice(0, HAND_SIZE); deck = pool.slice(HAND_SIZE); discard = []; continue; }
      if (!best) break;
      score += best.total; total += best.total; budget -= best.cost; executed++;
      counts[best.concept] = (counts[best.concept] ?? 0) + 1; concepts[best.concept] = (concepts[best.concept] ?? 0) + 1;
      if (best.concept.includes('stack')) stacks++;
      if (best.concept === 'ground_pound') ground += 6;
      if (best.concept === 'double_stack_bomb') bomb = true;
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
      return { won: false, drive: d + 1, bomb, score: total, concepts, lossCause };
    }
    full = shuffle([...deck, ...hand, ...discard], rng);
  }
  return { won: true, drive: 3, bomb, score: total, concepts };
}

// ── Reward policies ──────────────────────────────────────────────────────────
// Every policy is now ECONOMY-AWARE: each shop credits the win purse + interest,
// then the pilot buys what its policy/funds allow. 'none' = hoard, buy nothing
// (the un-built floor). eco_greedy/eco_patient probe spend-now-vs-bank.
type RewardPolicy = 'synergy' | 'naive' | 'random' | 'none' | 'eco_greedy' | 'eco_patient';

function deckLean(deck: FbCard[]) {
  let pass = 0, run = 0, def = 0;
  for (const c of deck) {
    if (c.side === 'pass' || c.side === 'catch') pass++;
    else if (c.side === 'run') run++;
    else if (c.side === 'defense') def++;
  }
  return { pass, run, def };
}

// Synergy-aware value: prefer scaling pieces early, double down on the deck's lean.
function synergyScore(rw: Reward, run: FbRunState, gameNumber: number): number {
  const id = rw.id;
  const lean = deckLean(run.deck);
  const passLean = lean.pass >= lean.run && lean.pass >= lean.def;
  const runLean = lean.run > lean.pass && lean.run >= lean.def;
  const defLean = lean.def > lean.pass && lean.def > lean.run;
  const early = (SEASON_GAMES - gameNumber); // 4..1 — scaling worth more early

  if (id === 'coord-franchise_qb') return 60 + early * 14 + (passLean ? 25 : 0);
  if (id === 'coord-bell_cow') return 55 + early * 12 + (runLean ? 25 : 0);
  if (id === 'coord-air_raid') return 45 + early * 8 + (passLean ? 20 : 0);
  if (id === 'coord-west_coast') return 30 + (passLean ? 18 : 0);
  if (id === 'coord-ball_hawk') return 25 + (defLean ? 30 : 0);
  if (id === 'coord-salary_wizard') return 35;
  if (id.startsWith('pb-')) {
    const con = id.slice(3) as keyof typeof run.playbook;
    const conS = String(con);
    const onLean = ((conS.includes('stack') || conS === 'checkdown') && passLean) || (conS === 'ground_pound' && runLean) || (conS === 'pick_six' && defLean);
    const committedLevel = run.playbook[con] ?? 0; // concentration: ride what you've already leveled
    return 28 + (onLean ? 26 : 4) + committedLevel * 22 + early * 3;
  }
  if (id.startsWith('train-')) {
    const m = id.slice(6);
    const passT = m === 'explosive' || m === 'hot_route';
    const runT = m === 'discounted' || m === 'clutch';
    const defT = m === 'explosive' || m === 'protected';
    return 22 + ((passT && passLean) || (runT && runLean) || (defT && defLean) ? 14 : 0);
  }
  if (id.startsWith('card-')) {
    const k = id.slice(5);
    const passCard = k === 'deep_wr' || k === 'gunslinger' || k === 'value_slot';
    const runCard = k === 'bell_rb';
    const defCard = k === 'shutdown_dst';
    return 18 + ((passCard && passLean) || (runCard && runLean) || (defCard && defLean) ? 14 : 0);
  }
  if (id === 'trim') return run.deck.length > 30 ? 34 : 16;
  if (id === 'upgrade') return 20;
  return 10;
}

// One shop visit: spend Funds per policy. Returns the run + Funds spent. The
// shelf shrinks as items sell; the synergy family banks rather than buy junk.
function runShop(run: FbRunState, policy: RewardPolicy, gameNumber: number, rng: RNG): { run: FbRunState; spent: number } {
  if (policy === 'none') return { run, spent: 0 };
  let r = run; let spent = 0;
  let shelf = generateRewards(r, rng);
  for (let i = 0; i < 16; i++) {
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
      // synergy / eco_greedy / eco_patient: all buy the BEST-fit affordable item;
      // they differ only in WHETHER TO BANK across shops (the spend-vs-save call).
      pick = [...affordable].sort((a, b) => synergyScore(b, r, gameNumber) - synergyScore(a, r, gameNumber))[0];
      const best = synergyScore(pick, r, gameNumber);
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
function playSeason(policy: RewardPolicy, team: TeamArchetype = 'balanced', seasonIndex = 0): SeasonOut {
  const rng = mulberry32(stringSeed(`gridiron-balance:${BALANCE_SEED}:${team}:${policy}:${seasonIndex}`));
  let run = createRun(team, Math.floor(rng() * 0x7fffffff));
  const perGame = [0, 0, 0, 0, 0];
  let spent = 0;
  for (let g = 1; g <= SEASON_GAMES; g++) {
    const environment = randomEnvironment(rng);
    const bossScheme = randomBossScheme(g, isChampionship(g), rng);
    const res = playGame(run, gameTargets(environment, g), environment, bossScheme, isChampionship(g), rng);
    if (!res.won) return { champion: false, gamesWon: g - 1, perGame, spent, lossCause: res.lossCause };
    perGame[g - 1] = 1;
    run = { ...run, bombGames: run.bombGames + (res.bomb ? 1 : 0) };
    if (!isChampionship(g)) {
      const credit = shopCredit(run.funds, g);
      run = { ...run, funds: run.funds + credit.total };
      const shopped = runShop(run, policy, g, rng);
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
console.log('──────────────────────────────────────────────\n');
