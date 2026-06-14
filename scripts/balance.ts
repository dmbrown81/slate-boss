/**
 * Dev-only Monte Carlo balance harness.
 *
 * Runs many simulated contests for a set of lineup "archetypes" across every contest
 * type and reports cash rate, top-10 rate, win rate, and ROI. Use it to answer the
 * core design question: do stronger builds cash meaningfully more than weak ones?
 *
 * Run with:  npm run balance            (default seeds)
 *            npm run balance -- 300      (override seed count)
 *
 * Pure game logic only — no DOM, no React. Executed via tsx.
 */
import type { Lineup, Player, Slate, TournamentType } from '../src/types/index.ts';
import { generateSlate } from '../src/lib/slateGenerator.ts';
import { runContest } from '../src/lib/simulation.ts';
import { addPlayer, emptyLineup, isValid, remainingSalary } from '../src/lib/lineupValidation.ts';
import { TOURNAMENT_ORDER, TOURNAMENTS, isCash } from '../src/lib/payout.ts';

type SlotNeed = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST';
const NEEDS: SlotNeed[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST'];

function eligible(need: SlotNeed, p: Player): boolean {
  if (need === 'FLEX') return p.position === 'RB' || p.position === 'WR' || p.position === 'TE';
  if (need === 'QB') return p.position === 'QB';
  return p.position === need;
}

function cheapestFor(need: SlotNeed, slate: Slate, used: Set<string>): number {
  const pool = slate.players.filter((p) => !used.has(p.id) && eligible(need, p));
  if (!pool.length) return 0;
  return Math.min(...pool.map((p) => p.salary));
}

type ScoreFn = (p: Player, lineup: Lineup) => number;

// Greedy builder that reserves the cheapest salary for the remaining slots so the
// result stays under the cap regardless of how aggressive the strategy is.
function buildLineup(slate: Slate, score: ScoreFn): Lineup | null {
  let lineup = emptyLineup();
  const used = new Set<string>();

  for (let i = 0; i < NEEDS.length; i++) {
    const need = NEEDS[i];
    const reserve = NEEDS.slice(i + 1).reduce((s, n) => s + cheapestFor(n, slate, used), 0);
    const budget = remainingSalary(lineup) - reserve;

    const pool = slate.players.filter((p) => !used.has(p.id) && eligible(need, p));
    const affordable = pool.filter((p) => p.salary <= budget);
    const candidates = (affordable.length ? affordable : pool)
      .slice()
      .sort((a, b) => score(b, lineup) - score(a, lineup));

    let added = false;
    for (const c of candidates) {
      const next = addPlayer(lineup, c);
      if (next) { lineup = next; used.add(c.id); added = true; break; }
    }
    if (!added) return null;
  }
  return isValid(lineup) ? lineup : null;
}

const qbTeam = (lineup: Lineup) => lineup.QB?.team;

const STRATEGIES: Record<string, ScoreFn> = {
  random: () => Math.random(),
  projection: (p) => p.displayedProjection,
  value: (p) => p.displayedProjection / (p.salary / 1000),
  safe: (p) => p.floor - p.volatility * 10,
  contrarian: (p) => (25 - p.ownership) + p.ceiling * 0.4,
  // "Strong" build: solid projected value plus a QB combo bias.
  strong: (p, lineup) => {
    const combo = (p.position === 'WR' || p.position === 'TE') && p.team === qbTeam(lineup) ? 1000 : 0;
    return p.displayedProjection * 1.4 + (p.displayedProjection / (p.salary / 1000)) + combo;
  },
};

interface Tally { n: number; cash: number; top10: number; win: number; roiSum: number; }

function pct(part: number, whole: number): string {
  return whole === 0 ? '  —  ' : `${((part / whole) * 100).toFixed(1)}%`.padStart(6);
}

function main() {
  const seeds = Number(process.argv[2]) || 150;
  const entryFee = 1;

  console.log(`\nSlate Boss balance harness — ${seeds} seeds × ${Object.keys(STRATEGIES).length} archetypes × ${TOURNAMENT_ORDER.length} contests\n`);

  for (const type of TOURNAMENT_ORDER as TournamentType[]) {
    const tally: Record<string, Tally> = {};
    for (const name of Object.keys(STRATEGIES)) tally[name] = { n: 0, cash: 0, top10: 0, win: 0, roiSum: 0 };

    for (let s = 0; s < seeds; s++) {
      const slate = generateSlate(`balance-${s}`);
      for (const [name, score] of Object.entries(STRATEGIES)) {
        const lineup = buildLineup(slate, score);
        if (!lineup) continue;
        const result = runContest(lineup, slate, entryFee, null, type);
        const t = tally[name];
        t.n += 1;
        if (isCash(result.userRank, result.totalEntrants, type)) t.cash += 1;
        if (result.userRank <= 10) t.top10 += 1;
        if (result.userRank === 1) t.win += 1;
        t.roiSum += (result.payout - entryFee) / entryFee;
      }
    }

    console.log(`── ${TOURNAMENTS[type].name} (${TOURNAMENTS[type].entrants} entrants) ${'─'.repeat(20)}`);
    console.log(`${'archetype'.padEnd(12)} ${'cash'.padStart(6)} ${'top10'.padStart(6)} ${'win'.padStart(6)} ${'ROI'.padStart(8)}`);
    for (const name of Object.keys(STRATEGIES)) {
      const t = tally[name];
      const roi = t.n ? `${(t.roiSum / t.n * 100).toFixed(1)}%`.padStart(8) : '   —    ';
      console.log(`${name.padEnd(12)} ${pct(t.cash, t.n)} ${pct(t.top10, t.n)} ${pct(t.win, t.n)} ${roi}`);
    }
    console.log('');
  }
}

main();
