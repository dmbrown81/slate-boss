import { stringSeed } from '../../lib/rng';
import { FOURTH_PHASE_TEAMS, type FourthPhaseBossKey, type FourthPhaseTeamKey } from '../../lib/fourthPhase';

export const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];

const FP_HISTORY_KEY = 'fourth_phase_history_v1';
const FP_DAILY_KEY = 'fourth_phase_daily_v1';
export const FP_PROGRESS_KEY = 'fourth_phase_progress_v1';
const FP_TUTORIAL_KEY = 'fp-tutorial-done';
const FP_GRUDGE_KEY = 'fourth_phase_grudge_v1';

export interface FourthPhaseRunMeta {
  dailyLabel?: string;
  dailyPractice?: boolean;
  /** First-run teaching only; normal seeds use the drive-aware opening draw. */
  tutorialOpening?: boolean;
}

export interface FourthPhaseRunRecord {
  id: string;
  date: string;
  seed: number;
  team: FourthPhaseTeamKey;
  stake: number;
  score: number;
  won: boolean;
  bestPlay: number;
  runCode: string;
  dailyLabel?: string;
  /** The run's boss (absent on records saved before REMATCH shipped). */
  boss?: FourthPhaseBossKey;
}

/** The boss that ended the player's last run. One field, one grudge. */
export interface FourthPhaseGrudge {
  boss: FourthPhaseBossKey;
  runCode: string;
  date: string;
}

export function loadFourthPhaseGrudge(): FourthPhaseGrudge | null {
  return readJson<FourthPhaseGrudge | null>(FP_GRUDGE_KEY, null);
}

export interface FourthPhaseDailyRecord {
  date: string;
  seed: number;
  team: FourthPhaseTeamKey;
  score: number;
  won: boolean;
  streak: number;
  /** Wordle-style emoji share grid for this daily (absent on records saved before it shipped). */
  grid?: string;
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadFourthPhaseHistory(): FourthPhaseRunRecord[] {
  const history = readJson<FourthPhaseRunRecord[]>(FP_HISTORY_KEY, []);
  return Array.isArray(history) ? history.slice(0, 10) : [];
}

export function bestFourthPhaseRun(history = loadFourthPhaseHistory()): FourthPhaseRunRecord | null {
  return [...history].sort((a, b) => b.score - a.score || Number(b.won) - Number(a.won))[0] ?? null;
}

export function loadFourthPhaseDaily(): FourthPhaseDailyRecord | null {
  return readJson<FourthPhaseDailyRecord | null>(FP_DAILY_KEY, null);
}

export function utcDateLabel(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function previousUtcDateLabel(label: string): string {
  const date = new Date(`${label}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return utcDateLabel(date);
}

export function fourthPhaseDailySeed(label = utcDateLabel()): { label: string; seed: number; team: FourthPhaseTeamKey } {
  const seed = stringSeed(`fourth-phase-daily:${label}`);
  return { label, seed, team: teamKeys[Math.abs(seed) % teamKeys.length] };
}

export function saveFourthPhaseCompletion(record: FourthPhaseRunRecord, dailyPractice?: boolean, grid?: string) {
  const history = [record, ...loadFourthPhaseHistory().filter((entry) => entry.id !== record.id)].slice(0, 10);
  writeJson(FP_HISTORY_KEY, history);
  // The grudge book: a loss plants a REMATCH flag on the boss that ended the
  // run; beating that boss (any run) clears it.
  if (record.boss) {
    if (!record.won) {
      writeJson<FourthPhaseGrudge>(FP_GRUDGE_KEY, { boss: record.boss, runCode: record.runCode, date: record.date });
    } else if (loadFourthPhaseGrudge()?.boss === record.boss) {
      try {
        localStorage.removeItem(FP_GRUDGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }
  if (!record.dailyLabel || dailyPractice) return;
  const previous = loadFourthPhaseDaily();
  const streak = previous?.date === previousUtcDateLabel(record.dailyLabel) ? previous.streak + 1 : 1;
  writeJson<FourthPhaseDailyRecord>(FP_DAILY_KEY, {
    date: record.dailyLabel,
    seed: record.seed,
    team: record.team,
    score: record.score,
    won: record.won,
    streak,
    grid,
  });
}

// ---------------------------------------------------------------------------
// Game-day conditions are NOT playable cards. One deterministic condition per
// UTC day is declared before entry, so the daily is a puzzle with a proper noun
// instead of a temporally impossible event shuffled into the player's hand.
// All effects are run-parameter changes (money, redraws, targets, meter cap) —
// the scoring engine is untouched, so the preview stays exact by construction.
// ---------------------------------------------------------------------------

export interface FourthPhaseGameDayCondition {
  key: string;
  name: string;
  detail: string;
  startMoneyDelta?: number;
  redrawsDelta?: number;
  targetScale?: number;
  meterCapMax?: number;
}

const GAME_DAY_CONDITIONS: FourthPhaseGameDayCondition[] = [
  { key: 'primeTime', name: 'PRIME TIME', detail: 'Targets +10%. The whole country is watching.', targetScale: 1.1 },
  { key: 'shortWeek', name: 'SHORT WEEK', detail: 'One fewer redraw per drive. Thursday-night legs.', redrawsDelta: -1 },
  { key: 'homecoming', name: 'HOMECOMING', detail: 'Start with +$4. The boosters showed up.', startMoneyDelta: 4 },
  { key: 'silentCount', name: 'SILENT COUNT', detail: 'Momentum caps at x4.0. The crowd stays seated.', meterCapMax: 4 },
  { key: 'sundayClassic', name: 'SUNDAY CLASSIC', detail: 'No twist. Just you, the seed, and the scoreboard.' },
];

export function dailyModifierFor(label: string): FourthPhaseGameDayCondition {
  const seed = stringSeed(`fourth-phase-daily-mod:${label}`);
  return GAME_DAY_CONDITIONS[Math.abs(seed) % GAME_DAY_CONDITIONS.length];
}

export function isTutorialDone(): boolean {
  try {
    return Boolean(localStorage.getItem(FP_TUTORIAL_KEY));
  } catch {
    return false;
  }
}

export function markTutorialDone() {
  try {
    localStorage.setItem(FP_TUTORIAL_KEY, '1');
  } catch {
    /* ignore */
  }
}
