import type { TournamentConfig, TournamentType } from '../types';

export const TOURNAMENTS: Record<TournamentType, TournamentConfig> = {
  mini_gpp: {
    key: 'mini_gpp',
    name: 'Starter Tournament',
    description: '100-player contest with bigger prizes than a Double-Up, but harder to cash.',
    entrants: 100,
    prizeSummary: '1st: ~22% pool · Top 25% cash',
    difficulty: 'Medium',
  },
  large_gpp: {
    key: 'large_gpp',
    name: 'Big Tournament',
    description: '500-player field. Stacks, upside, and lower-popularity plays matter more.',
    entrants: 500,
    prizeSummary: '1st: ~20% pool · Top 15% cash',
    difficulty: 'Hard',
  },
  double_up: {
    key: 'double_up',
    name: 'Safe 50/50',
    description: 'Finish in the top half and double your entry. Best for learning.',
    entrants: 100,
    prizeSummary: 'Top 50%: 2x entry',
    difficulty: 'Lower variance',
  },
  winner_take_all: {
    key: 'winner_take_all',
    name: 'Winner Take All',
    description: 'Small table, brutal payout. First or nothing.',
    entrants: 25,
    prizeSummary: '1st: full pool',
    difficulty: 'Very high variance',
  },
};

export const DEFAULT_TOURNAMENT_TYPE: TournamentType = 'double_up';
export const TOURNAMENT_ORDER: TournamentType[] = ['double_up', 'mini_gpp', 'large_gpp', 'winner_take_all'];
export const STARTER_TOURNAMENT_TYPES: TournamentType[] = ['double_up', 'mini_gpp'];

export function getTournament(type: TournamentType): TournamentConfig {
  return TOURNAMENTS[type] ?? TOURNAMENTS[DEFAULT_TOURNAMENT_TYPE];
}

export function isTournamentType(value: string | null): value is TournamentType {
  return Boolean(value && value in TOURNAMENTS);
}

export function isStarterTournament(type: TournamentType): boolean {
  return STARTER_TOURNAMENT_TYPES.includes(type);
}

export function computePayout(rank: number, totalEntrants: number, entryFee: number, type: TournamentType): number {
  const pool = totalEntrants * entryFee;
  const pct = rank / totalEntrants;

  if (type === 'double_up') return pct <= 0.5 ? entryFee * 2 : 0;

  if (type === 'winner_take_all') return rank === 1 ? pool : 0;

  if (type === 'large_gpp') {
    return weightedPayout(rank, pool, [
      { throughRank: 1, weight: 18 },
      { throughRank: 2, weight: 10 },
      { throughRank: 3, weight: 7 },
      { throughRank: 5, weight: 4 },
      { throughRank: 10, weight: 2 },
      { throughRank: 25, weight: 1 },
      { throughRank: 50, weight: 0.6 },
      { throughRank: 75, weight: 0.3 },
    ]);
  }

  return weightedPayout(rank, pool, [
    { throughRank: 1, weight: 20 },
    { throughRank: 2, weight: 12 },
    { throughRank: 3, weight: 8 },
    { throughRank: 5, weight: 5 },
    { throughRank: 10, weight: 3 },
    { throughRank: 20, weight: 2 },
    { throughRank: 25, weight: 1 },
  ]);
}

interface PayoutBand {
  throughRank: number;
  weight: number;
}

function weightedPayout(rank: number, pool: number, bands: PayoutBand[]): number {
  let previousRank = 0;
  let totalWeight = 0;
  let rankWeight = 0;

  for (const band of bands) {
    const count = band.throughRank - previousRank;
    totalWeight += count * band.weight;
    if (rank > previousRank && rank <= band.throughRank) rankWeight = band.weight;
    previousRank = band.throughRank;
  }

  if (!rankWeight || !totalWeight) return 0;
  return (pool * rankWeight) / totalWeight;
}

// Worst rank that still cashes in this contest format
export function cashLineRank(totalEntrants: number, type: TournamentType): number {
  if (type === 'winner_take_all') return 1;
  if (type === 'double_up') return Math.floor(totalEntrants * 0.5);
  if (type === 'large_gpp') return Math.floor(totalEntrants * 0.15);
  return Math.floor(totalEntrants * 0.25);
}

export function isCash(rank: number, totalEntrants: number, type: TournamentType): boolean {
  if (type === 'double_up') return rank / totalEntrants <= 0.5;
  if (type === 'winner_take_all') return rank === 1;
  if (type === 'large_gpp') return rank / totalEntrants <= 0.15;
  return rank / totalEntrants <= 0.25;
}
