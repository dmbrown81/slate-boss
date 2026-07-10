import { stringSeed } from '../../lib/rng';
import { FOURTH_PHASE_TEAMS, type FourthPhaseTeamKey } from '../../lib/fourthPhase';

export const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];

const FP_HISTORY_KEY = 'fourth_phase_history_v1';
const FP_DAILY_KEY = 'fourth_phase_daily_v1';
export const FP_PROGRESS_KEY = 'fourth_phase_progress_v1';
const FP_TUTORIAL_KEY = 'fp-tutorial-done';

export interface FourthPhaseRunMeta {
  dailyLabel?: string;
  dailyPractice?: boolean;
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
