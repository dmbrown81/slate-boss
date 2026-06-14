import { mulberry32, skewedDraw, type RNG } from './rng';
import type { Player, PlayerScore, ContestEntry, ContestResult, Lineup, Slate, ModifierKey, TournamentType } from '../types';
import { getLineupPlayers, isValid } from './lineupValidation';
import { SALARY_CAP } from '../types';
import { gradeLineup } from './grading';
import { computePayout, DEFAULT_TOURNAMENT_TYPE, getTournament } from './payout';
import { generateShare } from './shareCard';

// Per-contest variance shaping. Lower = scores cluster near projection, so pre-lock
// build quality decides outcomes more often; higher = more boom/bust swing.
const CONTEST_VARIANCE: Record<TournamentType, number> = {
  double_up: 0.8,
  mini_gpp: 1.0,
  large_gpp: 1.15,
  winner_take_all: 1.3,
};

// Extra smoothing for a player's first few contests so early skill is visible.
function beginnerVarianceScale(contestsPlayed: number): number {
  if (contestsPlayed <= 0) return 0.8;
  if (contestsPlayed === 1) return 0.9;
  if (contestsPlayed === 2) return 0.95;
  return 1;
}

function scorePlayer(
  player: Player,
  rng: RNG,
  gameScriptFactor: number,
  qbBoom: boolean,
  equippedModifier: ModifierKey | null,
  varianceScale: number = 1
): PlayerScore {
  const gameBonus = gameScriptFactor * 0.06;

  let boomChance = player.boomChance;
  // Correlated: if QB boomed and this is a same-team pass-catcher, boost boom chance
  if (qbBoom && (player.position === 'WR' || player.position === 'TE')) {
    boomChance = Math.min(0.9, boomChance + 0.25);
  }
  // Modifier: anchor defense reduces DST volatility
  if (equippedModifier === 'anchor_defense' && player.position === 'DST') {
    boomChance = Math.min(0.5, boomChance + 0.1);
  }
  // Modifier: correlated — same-team QB+WR/TE get an extra boost (handled at lineup level below)

  const proj = player.trueProjection;

  // Single correlated draw with game script
  const raw = skewedDraw(rng, player.floor, proj, player.ceiling, player.volatility, boomChance, gameBonus, varianceScale);

  const boomHit = raw >= player.ceiling * 0.9;

  // Quarter splits: roughly 20/30/20/30 distribution with some variance
  const q1Frac = 0.18 + rng() * 0.08;
  const q2Frac = 0.28 + rng() * 0.08;
  const q3Frac = 0.18 + rng() * 0.08;
  const q1 = raw * q1Frac;
  const q2 = raw * q2Frac;
  const q3 = raw * q3Frac;
  void (raw - q1 - q2 - q3); // q4 not needed here

  // Ticker events
  const events: string[] = [];
  if (boomHit) {
    events.push(`${player.name} 🔥 +${raw.toFixed(1)} pts`);
  } else if (raw < player.floor * 0.5) {
    events.push(`${player.name} disappoints — ${raw.toFixed(1)} pts`);
  }

  return { playerId: player.id, q1, q2, q3, final: raw, boomHit, events };
}

function gameScriptForPlayer(player: Player, slate: Slate): number {
  const game = slate.games.find((g) => g.id === player.gameId);
  return game?.gameScriptFactor ?? 0;
}

function simulateEntry(
  players: Player[],
  rng: RNG,
  slate: Slate,
  equippedModifier: ModifierKey | null = null,
  isUser = false,
  varianceScale = 1
): ContestEntry {
  // Find QB
  const qb = players.find((p) => p.position === 'QB');
  let qbBoomHit = false;
  const scores: PlayerScore[] = [];
  const qbTeam = qb?.team;

  // Score QB first
  for (const player of players) {
    const gsf = gameScriptForPlayer(player, slate);
    if (player.position === 'QB') {
      const score = scorePlayer(player, rng, gsf, false, equippedModifier, varianceScale);
      qbBoomHit = score.boomHit;
      scores.push(score);
    }
  }

  // Score rest with QB correlation
  for (const player of players) {
    if (player.position === 'QB') continue;
    const gsf = gameScriptForPlayer(player, slate);
    const sameTeamAsQB = player.team === qbTeam;

    // Modifier: correlated gives extra boom to same-team pass-catchers
    const modifierBoost = equippedModifier === 'correlated' && sameTeamAsQB ? 0.12 : 0;
    const effectiveBoom = qbBoomHit && sameTeamAsQB;

    const score = scorePlayer(
      { ...player, boomChance: player.boomChance + modifierBoost },
      rng,
      gsf,
      effectiveBoom,
      equippedModifier,
      varianceScale
    );
    scores.push(score);
  }

  const totalScore = scores.reduce((s, sc) => s + sc.final, 0);
  return { lineupPlayers: players, scores, totalScore, isUser };
}

type OpponentArchetype = 'safe_chalk' | 'balanced' | 'qb_combo' | 'contrarian' | 'stars_scrubs' | 'casual' | 'sharp';
type LineupNeed = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST';

const OPPONENT_SLOTS: LineupNeed[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST'];

const FIELD_MIX: Record<TournamentType, Record<OpponentArchetype, number>> = {
  double_up: {
    safe_chalk: 38,
    balanced: 26,
    qb_combo: 10,
    contrarian: 4,
    stars_scrubs: 6,
    casual: 14,
    sharp: 2,
  },
  mini_gpp: {
    safe_chalk: 18,
    balanced: 24,
    qb_combo: 22,
    contrarian: 12,
    stars_scrubs: 10,
    casual: 8,
    sharp: 6,
  },
  large_gpp: {
    safe_chalk: 10,
    balanced: 18,
    qb_combo: 26,
    contrarian: 18,
    stars_scrubs: 12,
    casual: 6,
    sharp: 10,
  },
  winner_take_all: {
    safe_chalk: 6,
    balanced: 12,
    qb_combo: 28,
    contrarian: 22,
    stars_scrubs: 14,
    casual: 6,
    sharp: 12,
  },
};

function eligibleForNeed(need: LineupNeed, player: Player): boolean {
  if (need === 'FLEX') return player.position === 'RB' || player.position === 'WR' || player.position === 'TE';
  return player.position === need;
}

function pickWeighted<T>(items: T[], weights: number[], rng: RNG): T {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let cursor = rng() * total;
  for (let i = 0; i < items.length; i++) {
    cursor -= Math.max(0, weights[i]);
    if (cursor <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickArchetype(tournamentType: TournamentType, rng: RNG): OpponentArchetype {
  const mix = FIELD_MIX[tournamentType] ?? FIELD_MIX.mini_gpp;
  const entries = Object.entries(mix) as Array<[OpponentArchetype, number]>;
  return pickWeighted(entries.map(([key]) => key), entries.map(([, weight]) => weight), rng);
}

function cheapestRemainingCost(slate: Slate, selected: Player[], needs: LineupNeed[]): number {
  const used = new Set(selected.map((p) => p.id));
  return needs.reduce((sum, need) => {
    const cheapest = slate.players
      .filter((p) => !used.has(p.id) && eligibleForNeed(need, p))
      .sort((a, b) => a.salary - b.salary)[0];
    return sum + (cheapest?.salary ?? 0);
  }, 0);
}

function playerArchetypeScore(player: Player, selected: Player[], archetype: OpponentArchetype): number {
  const qb = selected.find((p) => p.position === 'QB');
  const value = player.displayedProjection / (player.salary / 1000);
  const comboBonus = qb && player.team === qb.team && (player.position === 'WR' || player.position === 'TE') ? 12 : 0;
  const bringBackBonus = qb && player.team === qb.opponent && player.position !== 'DST' ? 5 : 0;
  const cheapBonus = Math.max(0, (6200 - player.salary) / 450);
  const expensiveBonus = Math.max(0, (player.salary - 6800) / 500);

  switch (archetype) {
    case 'safe_chalk':
      return player.displayedProjection * 1.25 + player.floor * 0.8 + player.ownership * 0.45 - player.volatility * 8;
    case 'balanced':
      return player.displayedProjection * 1.1 + value * 4 + player.ownership * 0.2 + comboBonus * 0.5;
    case 'qb_combo':
      return player.displayedProjection + value * 2 + comboBonus + bringBackBonus;
    case 'contrarian':
      return player.ceiling * 0.75 + value * 2 + Math.max(0, 24 - player.ownership) * 0.9 + comboBonus * 0.55;
    case 'stars_scrubs':
      return player.displayedProjection + player.ceiling * 0.35 + expensiveBonus * 5 + cheapBonus * 3;
    case 'casual':
      return player.displayedProjection * 0.75 + player.ownership * 0.65 + expensiveBonus * 1.5;
    case 'sharp':
      return player.displayedProjection * 1.2 + value * 5 + comboBonus * 0.8 + Math.max(0, 18 - player.ownership) * 0.25;
  }
}

function buildOpponentLineup(slate: Slate, rng: RNG, tournamentType: TournamentType): Player[] {
  const archetype = pickArchetype(tournamentType, rng);

  const tryBuild = (): Player[] | null => {
    const result: Player[] = [];

    for (let i = 0; i < OPPONENT_SLOTS.length; i++) {
      const need = OPPONENT_SLOTS[i];
      const remainingNeeds = OPPONENT_SLOTS.slice(i + 1);
      const reserved = cheapestRemainingCost(slate, result, remainingNeeds);
      const salaryUsed = result.reduce((sum, p) => sum + p.salary, 0);
      const budget = SALARY_CAP - salaryUsed - reserved;
      const usedIds = new Set(result.map((p) => p.id));
      const pool = slate.players.filter((p) => !usedIds.has(p.id) && eligibleForNeed(need, p));
      const affordable = pool.filter((p) => p.salary <= budget);
      const candidates = affordable.length ? affordable : pool.filter((p) => p.salary <= SALARY_CAP - salaryUsed);

      if (!candidates.length) return null;

      const ranked = [...candidates]
        .sort((a, b) => playerArchetypeScore(b, result, archetype) - playerArchetypeScore(a, result, archetype))
        .slice(0, archetype === 'casual' ? 8 : 5);
      const weights = ranked.map((_, index) => Math.max(0.1, ranked.length - index + rng() * 0.35));
      result.push(pickWeighted(ranked, weights, rng));
    }

    const salary = result.reduce((sum, p) => sum + p.salary, 0);
    if (salary > SALARY_CAP) return null;
    return result;
  };

  for (let attempt = 0; attempt < 30; attempt++) {
    const lineup = tryBuild();
    if (lineup) return lineup;
  }

  // fallback: top projected players by position
  const fallback: Player[] = [];
  const addTop = (pos: string, flexOk = false) =>
    slate.players
      .filter((p) => flexOk ? (p.position === 'RB' || p.position === 'WR' || p.position === 'TE') : p.position === pos)
      .filter((p) => !fallback.some((f) => f.id === p.id))
      .sort((a, b) => b.trueProjection - a.trueProjection)[0];
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'DST'].forEach((pos) => {
    const p = addTop(pos);
    if (p) fallback.push(p);
  });
  const flex = addTop('FLEX', true);
  if (flex) fallback.push(flex);
  return fallback;
}

export function runContest(
  userLineup: Lineup,
  slate: Slate,
  entryFee: number,
  equippedModifier: ModifierKey | null = null,
  tournamentType: TournamentType = DEFAULT_TOURNAMENT_TYPE,
  userContestsPlayed = Number.POSITIVE_INFINITY
): ContestResult {
  if (!isValid(userLineup)) throw new Error('Invalid lineup');

  const rng = mulberry32(slate.seed + 9999);
  const tournament = getTournament(tournamentType);

  // Contest variance shapes the whole field; the user gets extra beginner smoothing
  // for their first few contests so good early builds cash more reliably.
  const contestVariance = CONTEST_VARIANCE[tournamentType] ?? 1;
  const userVariance = contestVariance * beginnerVarianceScale(userContestsPlayed);

  const userPlayers = getLineupPlayers(userLineup);

  // Build field. Most opponents are chalk-biased, with a contrarian tail.
  const field: ContestEntry[] = [];
  const opponentCount = tournament.entrants - 1;
  for (let i = 0; i < opponentCount; i++) {
    const lineupPlayers = buildOpponentLineup(slate, rng, tournamentType);
    const entry = simulateEntry(lineupPlayers, rng, slate, null, false, contestVariance);
    field.push(entry);
  }

  // Simulate user
  const userEntry = simulateEntry(userPlayers, rng, slate, equippedModifier, true, userVariance);

  // Rank user (lower = better)
  const allScores = [...field.map((e) => e.totalScore), userEntry.totalScore].sort((a, b) => b - a);
  const userRank = allScores.indexOf(userEntry.totalScore) + 1;

  // Quarter ranks
  const quarterRanks: [number, number, number, number] = [0, 0, 0, 0];
  const qKeys = ['q1', 'q2', 'q3', 'final'] as const;
  qKeys.forEach((q, qi) => {
    const userQ = userEntry.scores.reduce((s, sc) => s + sc[q], 0);
    const fieldQs = field.map((e) => e.scores.reduce((s, sc) => s + sc[q], 0));
    const sorted = [...fieldQs, userQ].sort((a, b) => b - a);
    quarterRanks[qi] = sorted.indexOf(userQ) + 1;
  });

  const payout = computePayout(userRank, tournament.entrants, entryFee, tournamentType);
  const xpGained = Math.max(10, Math.floor(50 - userRank * 0.4) + (userEntry.scores.some((s) => s.boomHit) ? 15 : 0));

  // Best/worst/value/regret
  const scored = userPlayers.map((p) => {
    const sc = userEntry.scores.find((s) => s.playerId === p.id)!;
    return { player: p, score: sc.final };
  });
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const bestPlayer = sorted[0].player;
  const worstPlayer = sorted[sorted.length - 1].player;
  const valuePlayer = scored.sort((a, b) => (b.score / b.player.salary) - (a.score / a.player.salary))[0].player;

  // Regret: highest scorer among players not in lineup, low ownership
  const notInLineup = slate.players.filter((p) => !userPlayers.some((u) => u.id === p.id));
  const fieldScores: Record<string, number> = {};
  field.forEach((e) => e.scores.forEach((s) => {
    if (!fieldScores[s.playerId] || s.final > fieldScores[s.playerId]) fieldScores[s.playerId] = s.final;
  }));

  const regretCandidates = notInLineup
    .filter((p) => p.ownership < 20 && fieldScores[p.id] !== undefined)
    .sort((a, b) => (fieldScores[b.id] ?? 0) - (fieldScores[a.id] ?? 0));
  const biggestRegret = regretCandidates[0] ?? null;

  const grades = gradeLineup(userLineup, userEntry, slate, tournamentType);
  const shareCard = generateShare(userRank, tournament.entrants, userEntry.totalScore, slate.slateNumber, userEntry.scores, userPlayers);

  return {
    userEntry,
    field,
    userRank,
    userScore: userEntry.totalScore,
    totalEntrants: tournament.entrants,
    payout,
    entryFee,
    tournament,
    xpGained,
    bestPlayer,
    worstPlayer,
    bestValue: valuePlayer,
    biggestRegret,
    grades,
    shareCard,
    quarterRanks,
  };
}
