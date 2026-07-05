import type { FourthPhaseTeamKey } from './types';

/**
 * Stakes and career progression. Stake 1 is exactly the shipped baseline
 * tuning; every higher stake layers named modifiers on top so a run's
 * difficulty is always explainable in one card. Progression (team unlocks,
 * per-team stake ladders) is pure data here — persistence lives in the UI.
 */

export interface FourthPhaseStakeProfile {
  level: number;
  name: string;
  shortName: string;
  color: string;
  tagline: string;
  /** Cumulative, player-facing modifier list. Must match the numbers below. */
  modifiers: string[];
  targetScale: number;
  /** 0-based drive index at which the boss defense activates. */
  bossFromDrive: number;
  discardsPerDrive: number;
  startMoney: number;
}

export const FOURTH_PHASE_STAKES: readonly FourthPhaseStakeProfile[] = [
  {
    level: 1,
    name: 'Rookie Stake',
    shortName: 'Rookie',
    color: '#e8edf4',
    tagline: 'The standard road game.',
    modifiers: ['Boss defense on the final drive'],
    targetScale: 1,
    bossFromDrive: 2,
    discardsPerDrive: 2,
    startMoney: 8,
  },
  {
    level: 2,
    name: 'Pro Stake',
    shortName: 'Pro',
    color: '#62b7ff',
    tagline: 'Tighter targets, same calls.',
    modifiers: ['Drive Targets +12%', 'Boss defense on the final drive'],
    targetScale: 1.12,
    bossFromDrive: 2,
    discardsPerDrive: 2,
    startMoney: 8,
  },
  {
    level: 3,
    name: 'All-Pro Stake',
    shortName: 'All-Pro',
    color: '#ad91ff',
    tagline: 'The boss shows up early.',
    modifiers: ['Drive Targets +12%', 'Boss defense from Drive 2'],
    targetScale: 1.12,
    bossFromDrive: 1,
    discardsPerDrive: 2,
    startMoney: 8,
  },
  {
    level: 4,
    name: 'Legend Stake',
    shortName: 'Legend',
    color: '#f2bd3d',
    tagline: 'Everything is against you.',
    modifiers: ['Drive Targets +25%', 'Boss defense from Drive 2', 'One redraw per drive', 'Start with $6'],
    targetScale: 1.25,
    bossFromDrive: 1,
    discardsPerDrive: 1,
    startMoney: 6,
  },
];

export function fourthPhaseStake(level: number): FourthPhaseStakeProfile {
  const clamped = Math.min(Math.max(1, Math.round(level || 1)), FOURTH_PHASE_STAKES.length);
  return FOURTH_PHASE_STAKES[clamped - 1];
}

export interface FourthPhaseProgress {
  runs: number;
  wins: number;
  drivesCleared: number;
  bestSeries: number;
  /** Highest stake level won per team; absent or 0 means no win yet. */
  stakeWins: Partial<Record<FourthPhaseTeamKey, number>>;
  /** Id of the last run folded in, so re-applying the same completion is a no-op. */
  lastRunId?: string;
}

export const EMPTY_FOURTH_PHASE_PROGRESS: FourthPhaseProgress = {
  runs: 0,
  wins: 0,
  drivesCleared: 0,
  bestSeries: 0,
  stakeWins: {},
};

export interface FourthPhaseRunOutcome {
  id: string;
  team: FourthPhaseTeamKey;
  stake: number;
  won: boolean;
  drivesCleared: number;
  bestSeries: number;
}

export function recordFourthPhaseResult(progress: FourthPhaseProgress, outcome: FourthPhaseRunOutcome): FourthPhaseProgress {
  if (progress.lastRunId === outcome.id) return progress;
  const stakeWins = { ...progress.stakeWins };
  if (outcome.won) {
    stakeWins[outcome.team] = Math.max(stakeWins[outcome.team] ?? 0, outcome.stake);
  }
  return {
    runs: progress.runs + 1,
    wins: progress.wins + (outcome.won ? 1 : 0),
    drivesCleared: progress.drivesCleared + Math.max(0, outcome.drivesCleared),
    bestSeries: Math.max(progress.bestSeries, outcome.bestSeries),
    stakeWins,
    lastRunId: outcome.id,
  };
}

const TEAM_KEYS: readonly FourthPhaseTeamKey[] = [
  'balanced',
  'airRaid',
  'smashmouth',
  'blackAndBlue',
  'loudHouse',
  'specialTeamsChaos',
];

export interface FourthPhaseTeamUnlock {
  unlocked: boolean;
  requirement: string;
  progressLabel: string;
}

/**
 * One legible unlock condition per team. Conditions only read the career
 * progress record, so they can be re-evaluated after every run and diffed
 * to announce fresh unlocks.
 */
export function fourthPhaseTeamUnlocks(progress: FourthPhaseProgress): Record<FourthPhaseTeamKey, FourthPhaseTeamUnlock> {
  const distinctWinners = TEAM_KEYS.filter((team) => (progress.stakeWins[team] ?? 0) >= 1).length;
  const bestStakeWin = TEAM_KEYS.reduce((best, team) => Math.max(best, progress.stakeWins[team] ?? 0), 0);
  return {
    balanced: {
      unlocked: true,
      requirement: 'Available from kickoff',
      progressLabel: '',
    },
    airRaid: {
      unlocked: progress.wins >= 1,
      requirement: 'Win a run with any team',
      progressLabel: `${Math.min(progress.wins, 1)}/1 wins`,
    },
    smashmouth: {
      unlocked: progress.drivesCleared >= 8,
      requirement: 'Clear 8 career drives',
      progressLabel: `${Math.min(progress.drivesCleared, 8)}/8 drives`,
    },
    loudHouse: {
      unlocked: progress.bestSeries >= 120,
      requirement: 'Score 120+ in a single series',
      progressLabel: `best ${progress.bestSeries}`,
    },
    blackAndBlue: {
      unlocked: distinctWinners >= 2,
      requirement: 'Win with two different teams',
      progressLabel: `${Math.min(distinctWinners, 2)}/2 teams`,
    },
    specialTeamsChaos: {
      unlocked: bestStakeWin >= 2,
      requirement: 'Win a Pro Stake run',
      progressLabel: bestStakeWin >= 2 ? 'done' : `best stake ${bestStakeWin || '—'}`,
    },
  };
}

/** Highest stake a team may attempt: one above its best win, capped at the ladder top. */
export function fourthPhaseMaxStake(progress: FourthPhaseProgress, team: FourthPhaseTeamKey): number {
  return Math.min(FOURTH_PHASE_STAKES.length, (progress.stakeWins[team] ?? 0) + 1);
}

export function newlyUnlockedTeams(before: FourthPhaseProgress, after: FourthPhaseProgress): FourthPhaseTeamKey[] {
  const wasLocked = fourthPhaseTeamUnlocks(before);
  const nowUnlocked = fourthPhaseTeamUnlocks(after);
  return TEAM_KEYS.filter((team) => !wasLocked[team].unlocked && nowUnlocked[team].unlocked);
}
