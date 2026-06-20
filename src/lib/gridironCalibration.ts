import type { RNG } from './rng';

export const GRIDIRON_CALIBRATION_SOURCE = {
  label: 'nfl_dfs Phase 2A local research pass',
  seasons: '2023-2025',
  generatedFrom: [
    'player_week_features_asof_reg.parquet',
    'team_week_features_asof_reg.parquet',
    'game_week_features_asof_reg.parquet',
    'defense_vs_position_features_asof_reg.parquet',
    'outcome_labels_reg.parquet',
  ],
  caveats: [
    'Use as historical calibration, not live projection.',
    'Keep Gridiron fictional: no NFL teams, players, marks, salaries, or slate names.',
    'Do not tune from snap_offense_pct until the upstream aggregation is reviewed.',
  ],
} as const;

export const GRIDIRON_ENVIRONMENT_WEIGHTS = {
  clear: 45,
  dome: 25,
  wind: 12,
  snow: 8,
  primetime: 10,
} as const;

export const GRIDIRON_OUTCOME_BANDS = {
  QB: { median: 14.5, strong: 21.4, ceiling: 27.1, smash: 30.9 },
  RB: { median: 5.3, strong: 12.0, ceiling: 19.7, smash: 25.5 },
  WR: { median: 4.8, strong: 10.9, ceiling: 18.9, smash: 24.0 },
  TE: { median: 3.5, strong: 8.2, ceiling: 13.9, smash: 17.8 },
  DST: { median: 5.0, strong: 9.0, ceiling: 13.9, smash: 16.0 },
  K: { median: 8.0, strong: 11.0, ceiling: 15.0, smash: 17.0 },
} as const;

export const GRIDIRON_USAGE_BANDS = {
  qb: {
    attemptsLast3: { median: 30.0, strong: 34.5, ceiling: 38.3 },
    rushYardsLast3: { median: 11.3, strong: 24.3, ceiling: 36.7 },
    pressuredPctLast3: { median: 0.232, high: 0.312, danger: 0.475 },
  },
  rb: {
    carriesLast3: { median: 6.3, strong: 13.0, ceiling: 16.7 },
    targetsLast3: { median: 1.7, strong: 3.0, ceiling: 4.3 },
    redZoneCarriesLast3: { median: 1.0, strong: 2.0, ceiling: 3.3 },
  },
  receiver: {
    targetsLast3: { median: 3.7, strong: 6.3, ceiling: 8.7 },
    targetShareLast3: { median: 0.117, strong: 0.202, ceiling: 0.271 },
    airYardsShareLast3: { median: 0.154, strong: 0.276, ceiling: 0.377 },
    woprLast3: { median: 0.288, strong: 0.493, ceiling: 0.663 },
  },
  tightEnd: {
    targetsLast3: { median: 2.3, strong: 4.7, ceiling: 6.7 },
    redZoneTargetsLast3: { median: 0.3, strong: 0.7, ceiling: 1.3 },
  },
} as const;

export const GRIDIRON_MATCHUP_BANDS = {
  impliedTeamTotal: { low: 17.0, median: 22.0, high: 26.8 },
  gameTotal: { low: 38.5, median: 44.0, high: 49.5 },
  passRateLast3: { low: 0.46, median: 0.552, high: 0.641 },
  defenseAllowedLast3: {
    QB: { tough: 12.0, median: 17.7, soft: 24.2 },
    RB: { tough: 15.0, median: 22.0, soft: 30.6 },
    WR: { tough: 23.0, median: 33.1, soft: 44.8 },
    TE: { tough: 6.8, median: 12.3, soft: 19.1 },
  },
} as const;

export function weightedKey<const T extends string>(weights: Record<T, number>, rng: RNG): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return entries[0][0];

  let roll = rng() * total;
  for (const [key, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}
