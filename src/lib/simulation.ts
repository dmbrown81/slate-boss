import { mulberry32, skewedDraw, type RNG } from './rng';
import type { Player, PlayerScore, ContestEntry, ContestResult, Lineup, Slate, ModifierKey, TournamentType } from '../types';
import { getLineupPlayers, isValid } from './lineupValidation';
import { SALARY_CAP } from '../types';
import { gradeLineup } from './grading';
import { computePayout, DEFAULT_TOURNAMENT_TYPE, getTournament } from './payout';
import { generateShare } from './shareCard';

function scorePlayer(
  player: Player,
  rng: RNG,
  gameScriptFactor: number,
  qbBoom: boolean,
  equippedModifier: ModifierKey | null
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
  const raw = skewedDraw(rng, player.floor, proj, player.ceiling, player.volatility, boomChance, gameBonus);

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
  isUser = false
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
      const score = scorePlayer(player, rng, gsf, false, equippedModifier);
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
      equippedModifier
    );
    scores.push(score);
  }

  const totalScore = scores.reduce((s, sc) => s + sc.final, 0);
  return { lineupPlayers: players, scores, totalScore, isUser };
}

function buildOpponentLineup(slate: Slate, rng: RNG, isContrarian: boolean): Player[] {
  // Ownership-weighted selection that clusters on chalk (or contrarian)
  const tryBuild = (): Player[] | null => {
    const result: Player[] = [];
    const salaryCap = SALARY_CAP;
    let remaining = salaryCap;

    const positions: Array<{ pos: string; count: number }> = [
      { pos: 'QB', count: 1 },
      { pos: 'RB', count: 2 },
      { pos: 'WR', count: 2 },
      { pos: 'TE', count: 1 },
      { pos: 'FLEX', count: 1 },
      { pos: 'DST', count: 1 },
    ];

    for (const { pos, count } of positions) {
      const pool = slate.players.filter((p) => {
        if (result.some((r) => r.id === p.id)) return false;
        if (pos === 'FLEX') return p.position === 'RB' || p.position === 'WR' || p.position === 'TE';
        if (pos === 'QB') return p.position === 'QB';
        if (pos === 'RB') return p.position === 'RB';
        if (pos === 'WR') return p.position === 'WR';
        if (pos === 'TE') return p.position === 'TE';
        if (pos === 'DST') return p.position === 'DST';
        return false;
      });

      for (let i = 0; i < count; i++) {
        const available = pool.filter(
          (p) => !result.some((r) => r.id === p.id) && p.salary <= remaining
        );
        if (!available.length) return null;

        const weights = available.map((p) => {
          const ownBase = isContrarian ? (1 / (p.ownership + 1)) * 50 : p.ownership;
          return Math.max(0.1, ownBase);
        });

        const totalW = weights.reduce((a, b) => a + b, 0);
        let r = rng() * totalW;
        let chosen = available[available.length - 1];
        for (let j = 0; j < available.length; j++) {
          r -= weights[j];
          if (r <= 0) { chosen = available[j]; break; }
        }

        result.push(chosen);
        remaining -= chosen.salary;
      }
    }

    if (remaining < 0) return null;
    return result;
  };

  for (let attempt = 0; attempt < 20; attempt++) {
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
  tournamentType: TournamentType = DEFAULT_TOURNAMENT_TYPE
): ContestResult {
  if (!isValid(userLineup)) throw new Error('Invalid lineup');

  const rng = mulberry32(slate.seed + 9999);
  const tournament = getTournament(tournamentType);

  const userPlayers = getLineupPlayers(userLineup);

  // Build field. Most opponents are chalk-biased, with a contrarian tail.
  const field: ContestEntry[] = [];
  const opponentCount = tournament.entrants - 1;
  const chalkCutoff = Math.floor(opponentCount * (tournamentType === 'large_gpp' || tournamentType === 'winner_take_all' ? 0.82 : 0.88));
  for (let i = 0; i < opponentCount; i++) {
    const isContrarian = i >= chalkCutoff;
    const lineupPlayers = buildOpponentLineup(slate, rng, isContrarian);
    const entry = simulateEntry(lineupPlayers, rng, slate, null);
    field.push(entry);
  }

  // Simulate user
  const userEntry = simulateEntry(userPlayers, rng, slate, equippedModifier, true);

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

  const grades = gradeLineup(userLineup, userEntry, slate);
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
