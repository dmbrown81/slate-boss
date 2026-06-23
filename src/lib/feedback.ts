// Gridiron — tactile feedback (haptics only, opt-in).
//
// Mobile-first juice that teaches weight without an asset pipeline: a short pulse
// on a drive clear, a longer one on a turnover, a triplet on a signature engine
// trigger. No audio (deferred by every reviewer until comprehension lands), so
// this stays a single guarded call to navigator.vibrate.
//
// Guards: respects the caller's `enabled` flag (the persisted haptics pref) and
// the platform's reduced-motion preference; degrades silently where vibration is
// unsupported (desktop, iOS Safari) so it never throws.

export type HapticEvent = 'drive_clear' | 'turnover' | 'signature' | 'tap';

const PATTERNS: Record<HapticEvent, number | number[]> = {
  tap: 8,
  drive_clear: 22,
  turnover: 42,
  signature: [10, 30, 10],
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function haptic(event: HapticEvent, enabled: boolean): void {
  if (!enabled) return;
  if (prefersReducedMotion()) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[event]);
  } catch {
    // Some browsers throw if vibration is blocked by a permissions policy.
  }
}

// Heuristic default: haptics on for touch devices, off on desktop (where there's
// no vibration motor and the pref would just be dead UI).
export function defaultHapticsEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.vibrate !== 'function') return false;
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return true;
    }
  }
  return true;
}
