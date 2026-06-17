import type { Player, Slate } from '../types';

export type RoguePatternKey =
  | 'single_stack'
  | 'double_stack'
  | 'bring_back'
  | 'game_stack'
  | 'chalk_core'
  | 'leverage_core'
  | 'stars_scrubs'
  | 'bellcow_build'
  | 'punt_value'
  | 'fragile_ceiling';

export type RogueCoordinatorKey =
  | 'air_raid'
  | 'leverage_desk'
  | 'salary_wizard'
  | 'bring_back_theory'
  | 'dome_model'
  | 'red_zone_sheet'
  | 'chalk_shield'
  | 'late_swap_pass';

export type RogueLedgerKind = 'base' | 'pattern' | 'coordinator' | 'final';

export interface RoguePattern {
  key: RoguePatternKey;
  name: string;
  description: string;
  edgeAdd: number;
  edgeMult: number;
  count: number;
  playerIds: string[];
}

export interface RogueCoordinator {
  key: RogueCoordinatorKey;
  name: string;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare';
  family: 'base_points' | 'flat_edge' | 'x_edge' | 'utility';
  description: string;
}

export interface RogueLedgerEntry {
  id: string;
  kind: RogueLedgerKind;
  label: string;
  detail: string;
  baseDelta?: number;
  edgeAdd?: number;
  edgeMult?: number;
  runningBase: number;
  runningEdge: number;
}

export interface RogueScoreResult {
  basePoints: number;
  adjustedBasePoints: number;
  flatEdge: number;
  xEdge: number;
  edgeMultiplier: number;
  finalScore: number;
  buildLabel: string;
  headline: string;
  patterns: RoguePattern[];
  coordinators: RogueCoordinator[];
  ledger: RogueLedgerEntry[];
}

interface ScoreInput {
  players: Player[];
  basePoints: number;
  slate?: Slate;
  coordinatorKeys?: RogueCoordinatorKey[];
}

export const ROGUE_COORDINATORS: Record<RogueCoordinatorKey, RogueCoordinator> = {
  air_raid: {
    key: 'air_raid',
    name: 'Air Raid Coordinator',
    rarity: 'starter',
    family: 'flat_edge',
    description: 'QB stacks add extra Edge. Double stacks get the full bonus.',
  },
  leverage_desk: {
    key: 'leverage_desk',
    name: 'Leverage Desk',
    rarity: 'starter',
    family: 'x_edge',
    description: 'Low-owned ceiling players multiply your Edge.',
  },
  salary_wizard: {
    key: 'salary_wizard',
    name: 'Salary Wizard',
    rarity: 'starter',
    family: 'base_points',
    description: 'Cheap value plays add Base Points before Edge is applied.',
  },
  bring_back_theory: {
    key: 'bring_back_theory',
    name: 'Bring-Back Theory',
    rarity: 'common',
    family: 'x_edge',
    description: 'Bring-back lineups get a stronger multiplier.',
  },
  dome_model: {
    key: 'dome_model',
    name: 'Dome Model',
    rarity: 'common',
    family: 'x_edge',
    description: 'Players from positive game environments increase Edge.',
  },
  red_zone_sheet: {
    key: 'red_zone_sheet',
    name: 'Red Zone Sheet',
    rarity: 'common',
    family: 'flat_edge',
    description: 'Workhorse RBs and red-zone TEs add small Edge bonuses.',
  },
  chalk_shield: {
    key: 'chalk_shield',
    name: 'Chalk Shield',
    rarity: 'uncommon',
    family: 'flat_edge',
    description: 'Chalk Core builds keep their safety without losing all upside.',
  },
  late_swap_pass: {
    key: 'late_swap_pass',
    name: 'Late Swap Pass',
    rarity: 'rare',
    family: 'utility',
    description: 'Future utility item: replace one scratched player after lock.',
  },
};

export const STARTER_ROGUE_COORDINATOR_KEYS: RogueCoordinatorKey[] = [
  'air_raid',
  'salary_wizard',
  'leverage_desk',
];

function round(n: number, places = 1): number {
  const scale = 10 ** places;
  return Math.round(n * scale) / scale;
}

function sum(players: Player[], picker: (player: Player) => number): number {
  return players.reduce((total, player) => total + picker(player), 0);
}

function avg(players: Player[], picker: (player: Player) => number): number {
  return players.length ? sum(players, picker) / players.length : 0;
}

function byGame(players: Player[]): Array<[string, Player[]]> {
  const map = new Map<string, Player[]>();
  players.forEach((player) => {
    const group = map.get(player.gameId) ?? [];
    group.push(player);
    map.set(player.gameId, group);
  });
  return [...map.entries()];
}

function makePattern(
  key: RoguePatternKey,
  name: string,
  description: string,
  edgeAdd: number,
  edgeMult: number,
  playerIds: string[],
): RoguePattern {
  return {
    key,
    name,
    description,
    edgeAdd,
    edgeMult,
    count: playerIds.length,
    playerIds,
  };
}

export function detectRoguePatterns(players: Player[]): RoguePattern[] {
  const patterns: RoguePattern[] = [];
  const qb = players.find((player) => player.position === 'QB');
  const passCatchers = qb
    ? players.filter((player) => player.team === qb.team && (player.position === 'WR' || player.position === 'TE'))
    : [];
  const bringBacks = qb
    ? players.filter((player) => player.team === qb.opponent && player.position !== 'DST')
    : [];
  const projected = sum(players, (player) => player.displayedProjection);
  const averageOwnership = avg(players, (player) => player.ownership);
  const ceiling = sum(players, (player) => player.ceiling);
  const expensive = players.filter((player) => player.salary >= 7000);
  const cheap = players.filter((player) => player.salary <= 4500);
  const puntValues = cheap.filter((player) => player.displayedProjection / (player.salary / 1000) >= 1.85);
  const bellcows = players.filter((player) => player.archetype === 'workhorse_rb');
  const fragile = players.filter((player) => player.volatility >= 0.7 && player.ceiling >= 30);
  const biggestGameStack = byGame(players)
    .map(([, group]) => group)
    .sort((a, b) => b.length - a.length)[0] ?? [];

  if (qb && passCatchers.length >= 2) {
    patterns.push(makePattern(
      'double_stack',
      'Double Stack',
      `${qb.name} is paired with ${passCatchers.length} same-team pass catchers.`,
      0.28,
      1,
      [qb.id, ...passCatchers.map((player) => player.id)],
    ));
  } else if (qb && passCatchers.length === 1) {
    patterns.push(makePattern(
      'single_stack',
      'Single Stack',
      `${qb.name} is paired with ${passCatchers[0].name}.`,
      0.16,
      1,
      [qb.id, passCatchers[0].id],
    ));
  }

  if (qb && passCatchers.length > 0 && bringBacks.length > 0) {
    patterns.push(makePattern(
      'bring_back',
      'Bring-Back',
      `Opponent skill player adds shootout correlation against ${qb.team}.`,
      0.12,
      1.08,
      [qb.id, ...bringBacks.map((player) => player.id)],
    ));
  }

  if (biggestGameStack.length >= 4) {
    patterns.push(makePattern(
      'game_stack',
      'Game Stack',
      `${biggestGameStack.length} lineup spots come from one game environment.`,
      0.14,
      1.07,
      biggestGameStack.map((player) => player.id),
    ));
  }

  if (averageOwnership >= 18 && projected >= 112) {
    patterns.push(makePattern(
      'chalk_core',
      'Chalk Core',
      'Popular, high-projection lineup shape with a strong floor.',
      0.08,
      1,
      players.filter((player) => player.ownership >= 18).map((player) => player.id),
    ));
  }

  if (averageOwnership <= 15 && ceiling >= 170) {
    patterns.push(makePattern(
      'leverage_core',
      'Leverage Core',
      'Lower-owned lineup with enough ceiling to pass the field.',
      0.14,
      1.06,
      players.filter((player) => player.ownership <= 15).map((player) => player.id),
    ));
  }

  if (expensive.length >= 2 && cheap.length >= 2) {
    patterns.push(makePattern(
      'stars_scrubs',
      'Stars and Scrubs',
      'Premium ceiling is funded by cheap salary punts.',
      0.1,
      1,
      [...expensive, ...cheap].map((player) => player.id),
    ));
  }

  if (bellcows.length >= 2) {
    patterns.push(makePattern(
      'bellcow_build',
      'Bellcow Build',
      'Multiple workhorse backs add touch stability.',
      0.09,
      1,
      bellcows.map((player) => player.id),
    ));
  }

  if (puntValues.length > 0) {
    patterns.push(makePattern(
      'punt_value',
      'Punt Value',
      `${puntValues.length} cheap player${puntValues.length === 1 ? '' : 's'} beat the value threshold.`,
      Math.min(0.2, puntValues.length * 0.07),
      1,
      puntValues.map((player) => player.id),
    ));
  }

  if (fragile.length >= 2) {
    patterns.push(makePattern(
      'fragile_ceiling',
      'Fragile Ceiling',
      'Multiple volatile ceiling plays create a boom path.',
      0.08,
      1.06,
      fragile.map((player) => player.id),
    ));
  }

  return patterns;
}

function hasPattern(patterns: RoguePattern[], key: RoguePatternKey): boolean {
  return patterns.some((pattern) => pattern.key === key);
}

function patternLine(pattern: RoguePattern, base: number, flatEdge: number, xEdge: number): RogueLedgerEntry {
  return {
    id: `pattern-${pattern.key}`,
    kind: 'pattern',
    label: pattern.name,
    detail: pattern.description,
    edgeAdd: pattern.edgeAdd || undefined,
    edgeMult: pattern.edgeMult !== 1 ? pattern.edgeMult : undefined,
    runningBase: round(base),
    runningEdge: round((1 + flatEdge) * xEdge, 2),
  };
}

function coordinatorLine(
  key: RogueCoordinatorKey,
  detail: string,
  base: number,
  flatEdge: number,
  xEdge: number,
  deltas: Pick<RogueLedgerEntry, 'baseDelta' | 'edgeAdd' | 'edgeMult'> = {},
): RogueLedgerEntry {
  const coordinator = ROGUE_COORDINATORS[key];
  return {
    id: `coordinator-${key}`,
    kind: 'coordinator',
    label: coordinator.name,
    detail,
    ...deltas,
    runningBase: round(base),
    runningEdge: round((1 + flatEdge) * xEdge, 2),
  };
}

export function scoreRogueLineup({
  players,
  basePoints,
  slate,
  coordinatorKeys = STARTER_ROGUE_COORDINATOR_KEYS,
}: ScoreInput): RogueScoreResult {
  let adjustedBase = basePoints;
  let flatEdge = 0;
  let xEdge = 1;
  const patterns = detectRoguePatterns(players);
  const ledger: RogueLedgerEntry[] = [{
    id: 'base-points',
    kind: 'base',
    label: 'Base Fantasy Points',
    detail: 'Contest simulation score before lineup-engine effects.',
    runningBase: round(adjustedBase),
    runningEdge: 1,
  }];

  patterns.forEach((pattern) => {
    flatEdge += pattern.edgeAdd;
    xEdge *= pattern.edgeMult;
    ledger.push(patternLine(pattern, adjustedBase, flatEdge, xEdge));
  });

  const coordinatorSet = new Set(coordinatorKeys);

  if (coordinatorSet.has('air_raid')) {
    const passCatchers = patterns.find((pattern) => pattern.key === 'double_stack')?.count ?? 0;
    if (hasPattern(patterns, 'double_stack')) {
      flatEdge += 0.16;
      ledger.push(coordinatorLine('air_raid', 'Double Stack gets the full coordinator bonus.', adjustedBase, flatEdge, xEdge, { edgeAdd: 0.16 }));
    } else if (hasPattern(patterns, 'single_stack')) {
      flatEdge += 0.08;
      ledger.push(coordinatorLine('air_raid', 'Single Stack gets a smaller coordinator bonus.', adjustedBase, flatEdge, xEdge, { edgeAdd: 0.08 }));
    } else if (passCatchers > 0) {
      flatEdge += 0.04;
      ledger.push(coordinatorLine('air_raid', 'Partial stack bonus found.', adjustedBase, flatEdge, xEdge, { edgeAdd: 0.04 }));
    }
  }

  if (coordinatorSet.has('salary_wizard')) {
    const puntValue = patterns.find((pattern) => pattern.key === 'punt_value');
    if (puntValue) {
      const baseDelta = Math.min(8, puntValue.count * 2.5);
      adjustedBase += baseDelta;
      ledger.push(coordinatorLine('salary_wizard', 'Cheap value plays add points before Edge multiplies.', adjustedBase, flatEdge, xEdge, { baseDelta }));
    }
  }

  if (coordinatorSet.has('leverage_desk')) {
    const leveragePlayers = players.filter((player) => player.ownership <= 12 && player.ceiling >= 24);
    if (leveragePlayers.length > 0) {
      const edgeMult = 1 + Math.min(0.18, leveragePlayers.length * 0.045);
      xEdge *= edgeMult;
      ledger.push(coordinatorLine('leverage_desk', `${leveragePlayers.length} low-owned ceiling play${leveragePlayers.length === 1 ? '' : 's'} boost Edge.`, adjustedBase, flatEdge, xEdge, { edgeMult }));
    }
  }

  if (coordinatorSet.has('bring_back_theory') && hasPattern(patterns, 'bring_back')) {
    xEdge *= 1.12;
    ledger.push(coordinatorLine('bring_back_theory', 'Bring-back correlation gets a stronger multiplier.', adjustedBase, flatEdge, xEdge, { edgeMult: 1.12 }));
  }

  if (coordinatorSet.has('dome_model') && slate) {
    const boostedGames = new Set(slate.games.filter((game) => game.gameScriptFactor > 0.35).map((game) => game.id));
    const boostedPlayers = players.filter((player) => boostedGames.has(player.gameId));
    if (boostedPlayers.length >= 2) {
      const edgeMult = 1 + Math.min(0.12, boostedPlayers.length * 0.025);
      xEdge *= edgeMult;
      ledger.push(coordinatorLine('dome_model', `${boostedPlayers.length} players are in positive game environments.`, adjustedBase, flatEdge, xEdge, { edgeMult }));
    }
  }

  if (coordinatorSet.has('red_zone_sheet')) {
    const redZonePlayers = players.filter((player) => player.archetype === 'workhorse_rb' || player.archetype === 'redzone_te');
    if (redZonePlayers.length > 0) {
      const edgeAdd = Math.min(0.12, redZonePlayers.length * 0.03);
      flatEdge += edgeAdd;
      ledger.push(coordinatorLine('red_zone_sheet', `${redZonePlayers.length} touchdown-equity player${redZonePlayers.length === 1 ? '' : 's'} add Edge.`, adjustedBase, flatEdge, xEdge, { edgeAdd }));
    }
  }

  if (coordinatorSet.has('chalk_shield') && hasPattern(patterns, 'chalk_core')) {
    flatEdge += 0.08;
    ledger.push(coordinatorLine('chalk_shield', 'Popular strong plays keep some tournament Edge.', adjustedBase, flatEdge, xEdge, { edgeAdd: 0.08 }));
  }

  const edgeMultiplier = Math.max(0.75, (1 + flatEdge) * xEdge);
  const finalScore = adjustedBase * edgeMultiplier;

  ledger.push({
    id: 'final-engine-score',
    kind: 'final',
    label: 'Final Engine Score',
    detail: `${round(adjustedBase)} Base Points x ${round(edgeMultiplier, 2)} Edge.`,
    runningBase: round(adjustedBase),
    runningEdge: round(edgeMultiplier, 2),
  });

  const buildLabel = finalScore >= 260
    ? 'Run-Warping Engine'
    : finalScore >= 220
      ? 'Nasty Engine'
      : finalScore >= 180
        ? 'Live Build'
        : finalScore >= 145
          ? 'Playable Shell'
          : 'Thin Engine';

  const topPatterns = patterns.slice(0, 2).map((pattern) => pattern.name);
  const headline = topPatterns.length
    ? `${topPatterns.join(' + ')} powered this lineup.`
    : 'No major lineup pattern fired yet.';

  return {
    basePoints: round(basePoints),
    adjustedBasePoints: round(adjustedBase),
    flatEdge: round(flatEdge, 2),
    xEdge: round(xEdge, 2),
    edgeMultiplier: round(edgeMultiplier, 2),
    finalScore: round(finalScore),
    buildLabel,
    headline,
    patterns,
    coordinators: coordinatorKeys.map((key) => ROGUE_COORDINATORS[key]),
    ledger,
  };
}

