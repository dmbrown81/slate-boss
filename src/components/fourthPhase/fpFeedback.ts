// Fourth Phase game-feel channel: one call site per game event, routed through
// the shared feedback module (src/lib/feedback.ts). Presentation only — nothing
// here can touch scoring. Prefs persist so a muted phone stays muted.

import { audioCue, defaultHapticsEnabled, haptic, type AudioCueEvent, type HapticEvent } from '../../lib/feedback';

export type FourthPhaseFeelEvent =
  | 'card_tap'
  | 'run_series'
  | 'cash'
  | 'big_cash'
  | 'drive_clear'
  | 'buy'
  | 'kickoff'
  | 'win'
  | 'loss';

interface FeelRoute {
  audio: AudioCueEvent;
  haptic?: HapticEvent;
}

const ROUTES: Record<FourthPhaseFeelEvent, FeelRoute> = {
  card_tap: { audio: 'card_tap' },
  run_series: { audio: 'score_tick', haptic: 'tap' },
  cash: { audio: 'cash', haptic: 'cash' },
  big_cash: { audio: 'big_cash', haptic: 'signature' },
  drive_clear: { audio: 'drive_clear', haptic: 'drive_clear' },
  buy: { audio: 'buy', haptic: 'tap' },
  kickoff: { audio: 'kickoff', haptic: 'drive_clear' },
  win: { audio: 'win', haptic: 'win' },
  loss: { audio: 'turnover', haptic: 'turnover' },
};

export interface FourthPhaseFeelPrefs {
  sound: boolean;
  haptics: boolean;
}

const FP_FEEL_KEY = 'fourth_phase_feel_v1';

export function loadFeelPrefs(): FourthPhaseFeelPrefs {
  const fallback: FourthPhaseFeelPrefs = { sound: true, haptics: defaultHapticsEnabled() };
  try {
    const raw = localStorage.getItem(FP_FEEL_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<FourthPhaseFeelPrefs>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : fallback.sound,
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : fallback.haptics,
    };
  } catch {
    return fallback;
  }
}

export function saveFeelPrefs(prefs: FourthPhaseFeelPrefs): void {
  try {
    localStorage.setItem(FP_FEEL_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function playFeel(event: FourthPhaseFeelEvent, prefs: FourthPhaseFeelPrefs): void {
  const route = ROUTES[event];
  audioCue(route.audio, prefs.sound);
  if (route.haptic) haptic(route.haptic, prefs.haptics);
}
