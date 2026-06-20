import type { FbRunState } from './footballRun';
import { STARTING_FUNDS } from './gridironEconomy';

export const GRIDIRON_RUN_STORAGE_KEY = 'gridiron_run_v1';
// v2 added Front Office Funds + card Player Traits. We still read v1 saves and
// migrate them (backfill funds) so an in-progress season survives the upgrade.
const STORAGE_VERSION = 2;
const READABLE_VERSIONS = new Set([1, 2]);

export type GridironPersistedPhase = 'match' | 'reward';

export interface GridironPersistedRun {
  version: number;
  savedAt: string;
  phase: GridironPersistedPhase;
  run: FbRunState;
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

export function saveGridironRun(phase: GridironPersistedPhase, run: FbRunState): void {
  try {
    if (!canUseStorage() || run.status !== 'playing') return;
    const payload: GridironPersistedRun = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      phase,
      run,
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
