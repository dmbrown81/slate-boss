import type { TournamentConfig, TournamentType } from '../types';

export const TOURNAMENTS: Record<TournamentType, TournamentConfig> = {
  mini_gpp: {
    key: 'mini_gpp',
    name: '100-Man GPP',
    description: 'Current feel: beat a small field, top 20% cash, first place matters.',
    entrants: 100,
    prizeSummary: '1st: 20% pool · Top 20% cash',
    difficulty: 'Medium',
  },
  large_gpp: {
    key: 'large_gpp',
    name: '500-Man GPP',
    description: 'Bigger field, bigger top prize, much tougher to ship.',
    entrants: 500,
    prizeSummary: '1st: 25% pool · Top 18% cash',
    difficulty: 'Hard',
  },
  double_up: {
    key: 'double_up',
    name: '50/50 Double-Up',
    description: 'Finish in the top half and roughly double your entry.',
    entrants: 100,
    prizeSummary: 'Top 50%: 1.8x entry',
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

export const DEFAULT_TOURNAMENT_TYPE: TournamentType = 'mini_gpp';
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

  if (type === 'double_up') return pct <= 0.5 ? entryFee * 1.8 : 0;

  if (type === 'winner_take_all') return rank === 1 ? pool : 0;

  if (type === 'large_gpp') {
    if (rank === 1) return pool * 0.25;
    if (pct <= 0.01) return pool * 0.08;
    if (pct <= 0.03) return pool * 0.035;
    if (pct <= 0.08) return pool * 0.012;
    if (pct <= 0.18) return entryFee * 1.8;
    return 0;
  }

  if (pct <= 0.01) return pool * 0.20;
  if (pct <= 0.02) return pool * 0.10;
  if (pct <= 0.05) return pool * 0.05;
  if (pct <= 0.10) return pool * 0.03;
  if (pct <= 0.20) return entryFee * 2;
  return 0;
}

export function isCash(rank: number, totalEntrants: number, type: TournamentType): boolean {
  if (type === 'double_up') return rank / totalEntrants <= 0.5;
  if (type === 'winner_take_all') return rank === 1;
  if (type === 'large_gpp') return rank / totalEntrants <= 0.18;
  return rank / totalEntrants <= 0.20;
}
