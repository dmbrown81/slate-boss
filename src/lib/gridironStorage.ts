import type { FbRunState } from './footballRun';
import { STARTING_FUNDS, type ShopCreditInfo } from './gridironEconomy';
import { defaultHapticsEnabled } from './feedback';

export const GRIDIRON_RUN_STORAGE_KEY = 'gridiron_run_v1';
export const GRIDIRON_HISTORY_STORAGE_KEY = 'gridiron_history_v1';
export const GRIDIRON_DAILY_STORAGE_KEY = 'gridiron_daily_v1';
export const GRIDIRON_PREFS_STORAGE_KEY = 'gridiron_prefs_v1';
// v2 added Front Office Funds + card Player Traits. v3 added the season-long lane
// counters (keeperGames / takeawayGames) for the mobile & defense compounders. We
// still read older saves and migrate them (additive backfill) so an in-progress
// season survives the upgrade.
const STORAGE_VERSION = 3;
const READABLE_VERSIONS = new Set([1, 2, 3]);

export type GridironPersistedPhase = 'match' | 'reward';

export interface GridironWarRoomSave {
  rewardIds: string[];
  rerolls: number;
  purchases: number;
  creditInfo: ShopCreditInfo | null;
}

export interface GridironPersistedRun {
  version: number;
  savedAt: string;
  phase: GridironPersistedPhase;
  run: FbRunState;
  warRoom?: GridironWarRoomSave;
}

export interface GridironRunHistoryEntry {
  id: string;
  completedAt: string;
  seed: number;
  team: FbRunState['team'];
  won: boolean;
  gamesWon: number;
  score: number;
  identityTitle: string;
  debrief: string;
  // Optional Overtime score-chase results (only present if the player entered OT).
  overtimeRound?: number;   // furthest Overtime round reached
  overtimeScore?: number;   // total points scored across Overtime
  overtimeBestDrive?: number; // single best Overtime drive
}

export interface GridironDailyRecord {
  date: string;
  completedAt: string;
  seed: number;
  team: FbRunState['team'];
  won: boolean;
  gamesWon: number;
  score: number;
  streak: number;
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function isPersistedPhase(value: unknown): value is GridironPersistedPhase {
  return value === 'match' || value === 'reward';
}

function isPersistedRun(value: unknown): value is GridironPersistedRun {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<GridironPersistedRun>;
  return (
    typeof v.version === 'number' && READABLE_VERSIONS.has(v.version) &&
    isPersistedPhase(v.phase) &&
    !!v.run &&
    v.run.status === 'playing' &&
    typeof v.run.seed === 'number' &&
    typeof v.run.gameNumber === 'number'
  );
}

// Bring an older save up to the current run shape (additive fields only).
function migrate(persisted: GridironPersistedRun): GridironPersistedRun {
  const run = persisted.run;
  if (typeof run.funds !== 'number') run.funds = STARTING_FUNDS;
  if (typeof run.keeperGames !== 'number') run.keeperGames = 0;
  if (typeof run.takeawayGames !== 'number') run.takeawayGames = 0;
  if (typeof run.stake !== 'number') run.stake = 1;
  if (!Array.isArray(run.upgrades)) run.upgrades = [];
  return { ...persisted, version: STORAGE_VERSION, run };
}

export function loadGridironRun(): GridironPersistedRun | null {
  try {
    if (!canUseStorage()) return null;
    const raw = localStorage.getItem(GRIDIRON_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPersistedRun(parsed) ? migrate(parsed) : null;
  } catch {
    return null;
  }
}

export function saveGridironRun(phase: GridironPersistedPhase, run: FbRunState, warRoom?: GridironWarRoomSave): void {
  try {
    if (!canUseStorage() || run.status !== 'playing') return;
    const payload: GridironPersistedRun = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      phase,
      run,
      ...(phase === 'reward' && warRoom ? { warRoom } : {}),
    };
    localStorage.setItem(GRIDIRON_RUN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be blocked or full. Losing persistence should not break play.
  }
}

export function clearGridironRun(): void {
  try {
    if (!canUseStorage()) return;
    localStorage.removeItem(GRIDIRON_RUN_STORAGE_KEY);
  } catch {
    // noop
  }
}

function isHistoryEntry(value: unknown): value is GridironRunHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<GridironRunHistoryEntry>;
  return (
    typeof v.id === 'string' &&
    typeof v.completedAt === 'string' &&
    typeof v.seed === 'number' &&
    typeof v.team === 'string' &&
    typeof v.won === 'boolean' &&
    typeof v.gamesWon === 'number' &&
    typeof v.score === 'number' &&
    typeof v.identityTitle === 'string' &&
    typeof v.debrief === 'string'
  );
}

export function loadGridironHistory(): GridironRunHistoryEntry[] {
  try {
    if (!canUseStorage()) return [];
    const raw = localStorage.getItem(GRIDIRON_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

export function saveGridironHistoryEntry(entry: GridironRunHistoryEntry): void {
  try {
    if (!canUseStorage()) return;
    const current = loadGridironHistory().filter((item) => item.id !== entry.id);
    const next = [entry, ...current]
      .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
      .slice(0, 10);
    localStorage.setItem(GRIDIRON_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be blocked or full. History is motivational, not required.
  }
}

export function bestGridironHistoryRun(history = loadGridironHistory()): GridironRunHistoryEntry | null {
  return [...history].sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1;
    if (a.gamesWon !== b.gamesWon) return b.gamesWon - a.gamesWon;
    return b.score - a.score;
  })[0] ?? null;
}

// The deepest Overtime push on record — the score-chase leaderboard, local-only.
export function bestGridironOvertimeRun(history = loadGridironHistory()): GridironRunHistoryEntry | null {
  return [...history]
    .filter((e) => (e.overtimeRound ?? 0) > 0)
    .sort((a, b) => (b.overtimeRound ?? 0) - (a.overtimeRound ?? 0) || (b.overtimeScore ?? 0) - (a.overtimeScore ?? 0))[0] ?? null;
}

function isDailyRecord(value: unknown): value is GridironDailyRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<GridironDailyRecord>;
  return (
    typeof v.date === 'string' &&
    typeof v.completedAt === 'string' &&
    typeof v.seed === 'number' &&
    typeof v.team === 'string' &&
    typeof v.won === 'boolean' &&
    typeof v.gamesWon === 'number' &&
    typeof v.score === 'number' &&
    typeof v.streak === 'number'
  );
}

export function loadGridironDaily(): GridironDailyRecord | null {
  try {
    if (!canUseStorage()) return null;
    const raw = localStorage.getItem(GRIDIRON_DAILY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isDailyRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGridironDailyResult(entry: Omit<GridironDailyRecord, 'completedAt' | 'streak'>): GridironDailyRecord | null {
  try {
    if (!canUseStorage()) return null;
    const previous = loadGridironDaily();
    const streak = previous?.date === entry.date
      ? previous.streak
      : previous?.date === previousUtcDate(entry.date)
        ? previous.streak + 1
        : 1;
    const record: GridironDailyRecord = {
      ...entry,
      completedAt: new Date().toISOString(),
      streak,
    };
    localStorage.setItem(GRIDIRON_DAILY_STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

function previousUtcDate(date: string): string {
  const atMidnight = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(atMidnight)) return '';
  return new Date(atMidnight - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── Player preferences (device-local, not per-run) ───────────────────────────
// Two presentation toggles + the preview's "show math" state. Kept tiny on
// purpose: this is an alpha, not a settings framework. `showMath` is the only one
// the match screen overrides (Game 1 always shows the equation to teach it).
export interface GridironPrefs {
  quickResults: boolean;   // snap non-splash theatre + halve the count-up
  hapticsEnabled: boolean; // navigator.vibrate on clears / turnovers / signatures
  showMath: boolean;       // expand the live equation in the play preview
}

function defaultPrefs(): GridironPrefs {
  return { quickResults: false, hapticsEnabled: defaultHapticsEnabled(), showMath: false };
}

export function loadGridironPrefs(): GridironPrefs {
  const fallback = defaultPrefs();
  try {
    if (!canUseStorage()) return fallback;
    const raw = localStorage.getItem(GRIDIRON_PREFS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GridironPrefs>;
    return {
      quickResults: typeof parsed.quickResults === 'boolean' ? parsed.quickResults : fallback.quickResults,
      hapticsEnabled: typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : fallback.hapticsEnabled,
      showMath: typeof parsed.showMath === 'boolean' ? parsed.showMath : fallback.showMath,
    };
  } catch {
    return fallback;
  }
}

export function saveGridironPrefs(prefs: GridironPrefs): void {
  try {
    if (!canUseStorage()) return;
    localStorage.setItem(GRIDIRON_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a nicety; never let storage failure break play.
  }
}
