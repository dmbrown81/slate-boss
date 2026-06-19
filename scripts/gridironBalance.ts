// Gridiron balance harness — PERMANENT. Run with `npm run balance:gridiron`.
//
// The headline metric is the SKILL GAP: how much a synergy-aware reward policy
// out-champions a random one. If that gap is small, the roguelike meta-layer is
// noise (building doesn't matter). Keep this committed; run it on every
// balance-affecting change.

import {
  scoreFootballPlay, shuffle, randomEnvironment,
  DRIVE_BUDGET, DRIVES_PER_MATCH, HAND_SIZE, AUDIBLES_PER_DRIVE,
  type FbCard, type FbConceptKey,
} from '../src/lib/footballRogue';
import {
  createRun, gameTargets, generateRewards, isChampionship, SEASON_GAMES,
  type FbRunState, type Reward,
} from '../src/lib/footballRun';

// ── Tactical play: greedy value-per-credit, audible to seek a strong play ────
interface GameResult { won: boolean; drive: number; bomb: boolean; score: number; concepts: Record<string, number>; }

function playGame(run: FbRunState, targets: number[]): GameResult {
  let full = shuffle([...run.deck]);
  let stacks = 0, ground = 0, bomb = false, total = 0;
  const concepts: Record<string, number> = {};
  for (let d = 0; d < DRIVES_PER_MATCH; d++) {
    let hand = full.slice(0, HAND_SIZE); let deck = full.slice(HAND_SIZE); let discard: FbCard[] = [];
    let score = 0, budget = DRIVE_BUDGET[d], aud = AUDIBLES_PER_DRIVE;
    const counts: Partial<Record<FbConceptKey, number>> = {}; let guard = 0;
    while (score < targets[d] && guard++ < 60) {
      const combos: number[][] = [];
      const rec = (s: number, cur: number[]) => { if (cur.length) combos.push([...cur]); if (cur.length === 4) return; for (let i = s; i < hand.length; i++) rec(i + 1, [...cur, i]); };
      rec(0, []);
      let best: { ids: number[]; metric: number; total: number; cost: number; concept: FbConceptKey } | null = null;
      for (const cmb of combos) {
        const cards = cmb.map((i) => hand[i]); const cost = cards.reduce((s, c) => s + c.cost, 0); if (cost > budget) continue;
        const res = scoreFootballPlay(cards, { coordinators: run.coordinators, environment: 'clear', playbook: run.playbook, bombGames: run.bombGames, stacksThisMatch: stacks, groundBonusThisMatch: ground, conceptCountsThisDrive: counts });
        if (!res.valid) continue;
        const metric = res.total / cost;
        if (!best || metric > best.metric) best = { ids: cmb, metric, total: res.total, cost: res.cost, concept: res.concept };
      }
      if ((!best || (best.total < 200 && aud > 0)) && aud > 0) { aud--; const pool = shuffle([...deck, ...discard]); hand = pool.slice(0, HAND_SIZE); deck = pool.slice(HAND_SIZE); discard = []; continue; }
      if (!best) break;
      score += best.total; total += best.total; budget -= best.cost;
      counts[best.concept] = (counts[best.concept] ?? 0) + 1; concepts[best.concept] = (concepts[best.concept] ?? 0) + 1;
      if (best.concept.includes('stack')) stacks++;
      if (best.concept === 'ground_pound') ground += 6;
      if (best.concept === 'double_stack_bomb') bomb = true;
      const ids = new Set(best.ids); const played = best.ids.map((i) => hand[i]); discard = [...discard, ...played]; hand = hand.filter((_, i) => !ids.has(i));
      while (hand.length < HAND_SIZE) { if (deck.length === 0) { if (!discard.length) break; deck = shuffle(discard); discard = []; } hand.push(deck.shift()!); }
      if (budget < Math.min(...hand.map((c) => c.cost), Infinity)) break;
    }
    if (score < targets[d]) return { won: false, drive: d + 1, bomb, score: total, concepts };
    full = shuffle([...deck, ...hand, ...discard]);
  }
  return { won: true, drive: 3, bomb, score: total, concepts };
}

// ── Reward policies ──────────────────────────────────────────────────────────
// 'none' = take no rewards (measures the un-built starter-deck floor).
type RewardPolicy = 'synergy' | 'naive' | 'random' | 'none';

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

function pickReward(rewards: Reward[], policy: RewardPolicy, run: FbRunState, gameNumber: number): Reward {
  if (policy === 'random') return rewards[Math.floor(Math.random() * rewards.length)];
  if (policy === 'naive') {
    const order = ['coordinator', 'playbook', 'card', 'upgrade', 'trim'];
    return [...rewards].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
  }
  return [...rewards].sort((a, b) => synergyScore(b, run, gameNumber) - synergyScore(a, run, gameNumber))[0];
}

interface SeasonOut { champion: boolean; gamesWon: number; perGame: number[]; }
function playSeason(policy: RewardPolicy): SeasonOut {
  let run = createRun();
  const perGame = [0, 0, 0, 0, 0];
  for (let g = 1; g <= SEASON_GAMES; g++) {
    const res = playGame(run, gameTargets(randomEnvironment(), g));
    if (!res.won) return { champion: false, gamesWon: g - 1, perGame };
    perGame[g - 1] = 1;
    run = { ...run, bombGames: run.bombGames + (res.bomb ? 1 : 0) };
    if (policy !== 'none' && !isChampionship(g)) run = pickReward(generateRewards(run), policy, run, g).apply(run);
  }
  return { champion: true, gamesWon: SEASON_GAMES, perGame };
}

// ── Run ──────────────────────────────────────────────────────────────────────
const N = Number(process.argv[2] ?? 1500);
const policies: RewardPolicy[] = ['synergy', 'naive', 'random', 'none'];
const champ: Record<RewardPolicy, number> = { synergy: 0, naive: 0, random: 0, none: 0 };

console.log(`\nGridiron balance — ${N} seasons per reward policy\n`);
console.log('policy   | champion | avgGamesWon | per-game clear (G1→G5)');
console.log('---------|----------|-------------|------------------------');
for (const p of policies) {
  let wins = 0, gw = 0; const pg = [0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) { const s = playSeason(p); if (s.champion) wins++; gw += s.gamesWon; s.perGame.forEach((w, i2) => pg[i2] += w); }
  champ[p] = (100 * wins) / N;
  console.log(`${p.padEnd(8)} | ${(100 * wins / N).toFixed(1).padStart(6)}%  | ${(gw / N).toFixed(2).padStart(10)}  | ${pg.map((x) => `${Math.round(100 * x / N)}%`.padStart(4)).join(' ')}`);
}
const rewardGap = champ.synergy - champ.random;       // does which reward you pick matter?
const buildGap = Math.max(champ.synergy, champ.naive) - champ.none; // does building at all matter?
const verdict = (g: number, hi: number, mid: number) => (g >= hi ? '✅' : g >= mid ? '🟡' : '❌');
console.log('\n──────────────────────────────────────────────');
console.log(`BUILD GAP   (best − no-rewards):     ${buildGap.toFixed(1)} pts  ${verdict(buildGap, 30, 18)}  — does building matter at all?`);
console.log(`REWARD GAP  (synergy − random pick): ${rewardGap.toFixed(1)} pts  ${verdict(rewardGap, 25, 12)}  — does which reward you pick matter?`);
console.log(buildGap >= 30 && rewardGap >= 12 ? '✅ the roguelike meta-layer is decisive' : '❌ meta-layer still too weak — keep tuning');
console.log('──────────────────────────────────────────────\n');
