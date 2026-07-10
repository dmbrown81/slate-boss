import { stringSeed } from '../../lib/rng';
import { FP as FB } from './fourthPhaseStyles';
import {
  BASE_METER,
  formatMeter,
  randomFourthPhaseBoss,
  type FourthPhaseBossKey,
  type FourthPhaseScoreResult,
  type FourthPhaseTeamKey,
} from '../../lib/fourthPhase';

// ---------------------------------------------------------------------------
// Pure logic behind the Lab's tutorial and feedback layers. No JSX here so the
// component files stay fast-refresh clean and this stays unit-testable.
// ---------------------------------------------------------------------------

/** One completed (or failed) drive: how many calls it took and how it ended. */
export interface DriveLogEntry {
  calls: number;
  cleared: boolean;
}

// The Wordle-style spoiler-light share grid: one row per drive, one square per
// call used. Green squares are setup calls, the gold square is the call that
// cleared the drive, red squares are a drive that died. Row length IS the
// story — a two-square row brags "cleared it in two" without spoiling how.
export function dailyShareGrid(driveLog: DriveLogEntry[]): string {
  return driveLog
    .map((drive) => {
      const calls = Math.max(1, drive.calls);
      if (!drive.cleared) return '🟥'.repeat(calls);
      return calls === 1 ? '🟨' : '🟩'.repeat(calls - 1) + '🟨';
    })
    .join('\n');
}

export function dailyShareText(input: {
  label: string;
  won: boolean;
  score: number;
  streak: number;
  drives: number;
  drivesCleared: number;
  grid: string;
  runCode: string;
  /** The day's named modifier — gives the share a proper noun to carry. */
  modifierName?: string;
}): string {
  const streakPart = input.streak > 1 ? ` · 🔥${input.streak}` : '';
  const title = input.modifierName
    ? `Fourth Phase Daily ${input.label} — ${input.modifierName}`
    : `Fourth Phase Daily ${input.label}`;
  return [
    title,
    `${input.won ? 'W' : 'L'} · ${input.drivesCleared}/${input.drives} drives · ${input.score} pts${streakPart}`,
    input.grid,
    input.runCode,
  ].filter(Boolean).join('\n');
}

export interface CashInSnapshot {
  points: number;
  situation: string;
  bigPlay: number;
  meter: number;
  reason: string;
}

export interface PlayResolution {
  key: number;
  explanation: string;
  stages: { label: string; value: string; color: string }[];
  impact: 'normal' | 'cash' | 'huge';
  /** The boss's punish line when it visibly ate this play (boss ledger entry). */
  bossLine?: string;
}

// Played first-run tutorial. Teaches the job first (clear the drive target before
// calls run out), then the one trick that wins games, by making the player do it
// instead of asking them to read a panel. Advances on real series (executePlay).
export const TUTORIAL_STEPS = [
  {
    title: 'Your job: clear the drive',
    body: 'Hit the Drive Target at the top before your calls run out. Start simple: tap one blue Offense card below, then press Run Series. Offense gains safe yards.',
    cta: null,
  },
  {
    title: 'Now the trick that wins games',
    body: 'Purple Crowd builds momentum. Blue Offense cashes it into an explosive score. Cards resolve left to right, so tap a Crowd card first, then an Offense card.',
    cta: null,
  },
  {
    title: 'That is the loop',
    body: 'Build momentum, cash with Offense, clear the target. Same cards in the wrong order score less. Red Defense cards create leverage: stops, pressure, and short fields. Gold Special Teams cards create hidden yards for later.',
    cta: 'Got it. Call it',
  },
] as const;

// The very first run a player ever sees should end against a boss whose effect
// reads in one clause AND leaves the tutorial's lesson intact. Prevent Defense
// is out: it caps Explosive, which disables the exact cash-momentum trick the
// coach just taught. Re-rolling the seed (not overriding the boss) keeps run
// codes honest: the boss is still derived from the seed, so sharing/importing
// this run reproduces it exactly.
const GENTLE_FIRST_BOSSES: readonly FourthPhaseBossKey[] = ['stackedBox', 'turnoverDrill'];

export function firstRunSeed(team: FourthPhaseTeamKey): number {
  let seed = stringSeed(`fourth-phase-lab:${team}:${Date.now()}`);
  for (let step = 0; step < 64 && !GENTLE_FIRST_BOSSES.includes(randomFourthPhaseBoss(seed, team)); step += 1) {
    seed += 1;
  }
  return seed;
}

// Run-one explanation copy: the engine's strings name Leverage/Explosive, but
// during the tutorial only two nouns exist (Yards, Momentum). Same numbers,
// staged vocabulary.
export function stagedExplanation(result: FourthPhaseScoreResult): string {
  if (result.bust) return 'No clean shape - the series broke down and momentum bled.';
  if (result.didCash) return `Crowd built momentum -> Offense cashed it -> ${result.points} progress.`;
  if (result.situation.utility && result.meterCharged > 0.05) return `${result.situation.label} built +${result.meterCharged.toFixed(2)} momentum.`;
  return `${result.situation.label} gained ${result.points} progress.`;
}

// Post-series safety net for players past the tutorial: when a series goes
// wrong in one of the three classic ways, name the mistake and the next move
// in football language. One sentence, diagnostic, never generic. The caller
// shows each lesson at most once per run so this never becomes nagging.
export function diagnoseWeakSeries(
  result: FourthPhaseScoreResult,
  meterBefore: number,
): { lesson: string; text: string } | null {
  if (result.bust) {
    return {
      lesson: 'bust',
      text: 'That was a Busted Play: those phases make no clean series, so it scored a penalty and bled momentum. A single blue Offense card is always a safe Checkdown.',
    };
  }
  if (!result.didCash && result.meterCharged > 0.3 && result.points < 25) {
    return {
      lesson: 'chargeNoCash',
      text: `You built momentum to ${formatMeter(result.meterAfter)} but didn't score with it. Next series: put a blue Offense card after a Crowd card to cash it in.`,
    };
  }
  if (!result.didCash && meterBefore > BASE_METER + 0.5 && result.points < 40) {
    return {
      lesson: 'satOnHeat',
      text: `Momentum was hot at ${formatMeter(meterBefore)} and that series didn't cash it — hot momentum bleeds while you wait. Offense cashes it.`,
    };
  }
  return null;
}

// `staged` = the first tutorial run: only two nouns exist yet (Yards, Momentum),
// so the breakdown stays in that vocabulary. Leverage/Explosive arrive run two.
export function buildResolution(result: FourthPhaseScoreResult, explanation: string, key: number, staged = false, bossLine?: string): PlayResolution {
  const stages = staged
    ? [{ label: 'Yards', value: `${result.yards}`, color: '#5fb4ff' }]
    : [
      { label: 'Yards', value: `${result.yards}`, color: '#5fb4ff' },
      { label: 'Leverage', value: `+${result.execution.toFixed(2)}`, color: '#ff7c93' },
      { label: 'Explosive', value: `x${result.bigPlay.toFixed(2)}`, color: '#f4c24f' },
    ];
  if (result.didCash) {
    stages.push({ label: staged ? 'Momentum cashed' : 'Cash', value: formatMeter(result.meterAfterCash), color: '#34c771' });
  } else if (result.meterCharged > 0) {
    stages.push({ label: 'Momentum', value: `+${result.meterCharged.toFixed(2)}`, color: '#a987ff' });
  }
  stages.push({ label: 'Drive', value: `${result.points}`, color: result.didCash ? FB.gold : FB.text });
  return {
    key,
    explanation,
    stages,
    impact: result.points >= 180 || result.bigPlay >= 4 ? 'huge' : result.didCash ? 'cash' : 'normal',
    bossLine,
  };
}

// Decide whether a series earns the cash-in celebration, and why. Replaces the old
// bare `points >= 120` magic number with reasons that scale to the drive and the run.
export function evaluateCashIn(
  result: FourthPhaseScoreResult,
  target: number,
  prevBest: number,
): { show: boolean; reason: string } {
  if (result.situation.key === 'complementaryFootball') {
    return { show: true, reason: 'Complementary Football: all four phases' };
  }
  if (result.points >= target) {
    return { show: true, reason: 'Drive crusher: cleared the target in one series' };
  }
  if (result.points > prevBest && result.points >= 80) {
    return { show: true, reason: `New run best: ${result.points}` };
  }
  if (result.didCash && result.bigPlay >= 2.5) {
    return { show: true, reason: `Meter cash x${result.bigPlay.toFixed(2)}` };
  }
  if (result.points >= Math.max(60, Math.round(target * 0.3))) {
    return { show: true, reason: 'Explosive play' };
  }
  return { show: false, reason: '' };
}
