import type { FbRunState } from './footballRun';
import { STARTING_FUNDS, type ShopCreditInfo } from './gridironEconomy';

export const GRIDIRON_RUN_STORAGE_KEY = 'gridiron_run_v1';
export const GRIDIRON_HISTORY_STORAGE_KEY = 'gridiron_history_v1';
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
