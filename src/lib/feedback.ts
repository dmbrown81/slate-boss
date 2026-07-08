// Gridiron — tactile + light audio feedback (both opt-in/guarded).
//
// Mobile-first juice that teaches weight without an asset pipeline: a short pulse
// on a drive clear, a longer one on a turnover, a triplet on a signature engine
// trigger. Audio is deliberately tiny and disabled by default; it exists only as
// optional score punctuation, never as required information.
//
// Guards: respects the caller's `enabled` flag (the persisted haptics pref) and
// the platform's reduced-motion preference; degrades silently where vibration is
// unsupported (desktop, iOS Safari) so it never throws.

export type HapticEvent = 'drive_clear' | 'turnover' | 'signature' | 'tap' | 'cash' | 'win';
export type AudioCueEvent =
  | 'drive_clear'
  | 'turnover'
  | 'signature'
  | 'score_tick'
  | 'card_tap'
  | 'cash'
  | 'big_cash'
  | 'buy'
  | 'kickoff'
  | 'win';

const PATTERNS: Record<HapticEvent, number | number[]> = {
  tap: 8,
  drive_clear: 22,
  turnover: 42,
  signature: [10, 30, 10],
  cash: [12, 34, 18],
  win: [18, 50, 18, 50, 34],
};

const AUDIO_PATTERNS: Record<AudioCueEvent, { freq: number; at: number; dur: number; gain: number }[]> = {
  score_tick: [{ freq: 440, at: 0, dur: 0.045, gain: 0.018 }],
  card_tap: [{ freq: 660, at: 0, dur: 0.03, gain: 0.014 }],
  // Cash-in: a quick major arpeggio — the "register ring" of the core loop.
  cash: [
    { freq: 523.25, at: 0, dur: 0.06, gain: 0.024 },
    { freq: 659.25, at: 0.05, dur: 0.07, gain: 0.024 },
    { freq: 783.99, at: 0.1, dur: 0.1, gain: 0.022 },
  ],
  // Huge series: same shape an octave brighter with a longer tail.
  big_cash: [
    { freq: 523.25, at: 0, dur: 0.06, gain: 0.026 },
    { freq: 783.99, at: 0.055, dur: 0.07, gain: 0.026 },
    { freq: 1046.5, at: 0.11, dur: 0.14, gain: 0.024 },
    { freq: 1318.5, at: 0.19, dur: 0.16, gain: 0.018 },
  ],
  buy: [
    { freq: 880, at: 0, dur: 0.05, gain: 0.02 },
    { freq: 1174.66, at: 0.055, dur: 0.08, gain: 0.02 },
  ],
  kickoff: [
    { freq: 146.83, at: 0, dur: 0.1, gain: 0.03 },
    { freq: 196, at: 0.08, dur: 0.12, gain: 0.024 },
  ],
  // Run won: a short fanfare, still quiet enough to live under a thumb.
  win: [
    { freq: 523.25, at: 0, dur: 0.09, gain: 0.026 },
    { freq: 659.25, at: 0.09, dur: 0.09, gain: 0.026 },
    { freq: 783.99, at: 0.18, dur: 0.09, gain: 0.026 },
    { freq: 1046.5, at: 0.27, dur: 0.22, gain: 0.026 },
  ],
  drive_clear: [
    { freq: 523.25, at: 0, dur: 0.07, gain: 0.026 },
    { freq: 659.25, at: 0.065, dur: 0.08, gain: 0.024 },
  ],
  signature: [
    { freq: 392, at: 0, dur: 0.055, gain: 0.022 },
    { freq: 587.33, at: 0.055, dur: 0.08, gain: 0.024 },
    { freq: 783.99, at: 0.13, dur: 0.09, gain: 0.02 },
  ],
  turnover: [
    { freq: 220, at: 0, dur: 0.12, gain: 0.026 },
    { freq: 164.81, at: 0.095, dur: 0.15, gain: 0.02 },
  ],
};

let audioContext: AudioContext | null = null;

export function prefersReducedMotion(): boolean {
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

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    audioContext ??= new AudioCtor();
    return audioContext;
  } catch {
    return null;
  }
}

export function audioCue(event: AudioCueEvent, enabled: boolean): void {
  if (!enabled) return;
  if (prefersReducedMotion()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + 0.01;
    for (const tone of AUDIO_PATTERNS[event]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = event === 'turnover' ? 'sawtooth' : 'sine';
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, start + tone.at);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + tone.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + tone.at);
      osc.stop(start + tone.at + tone.dur + 0.02);
    }
  } catch {
    // WebAudio can be blocked or unavailable; feedback is optional.
  }
}

// ---------------------------------------------------------------------------
// Crowd noise. Sine cues are UI punctuation; the crowd is atmosphere. Both are
// synthesized (no asset pipeline): a stadium is, acoustically, band-passed
// noise — a murmur loop that swells with the momentum meter, and a roar burst
// for signature cash-ins. All volumes stay under the cues.
// ---------------------------------------------------------------------------

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  // Pink-ish noise via a cheap running filter; pure white reads as static.
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.94 + white * 0.06;
    data[i] = last * 3.2;
  }
  return noiseBuffer;
}

/** One-shot crowd roar: swells fast, decays slow. For signature cash-ins and wins. */
export function crowdRoar(enabled: boolean): void {
  if (!enabled || prefersReducedMotion()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + 0.01;
    const source = ctx.createBufferSource();
    source.buffer = getNoiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, start);
    filter.frequency.exponentialRampToValueAtTime(1500, start + 0.28);
    filter.frequency.exponentialRampToValueAtTime(500, start + 1.3);
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.055, start + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(start + 1.5);
  } catch {
    // Atmosphere is optional; never throw.
  }
}

interface MurmurNodes {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

let murmur: MurmurNodes | null = null;

/**
 * Continuous stadium murmur tied to the momentum meter. `level` is 0..1
 * (meter fill); 0 ramps silent. The room literally gets louder and brighter
 * as the crowd charges — the meter IS the crowd.
 */
export function setCrowdMurmur(level: number, enabled: boolean): void {
  const ctx = audioContext; // never create a context just for ambience
  const target = enabled && !prefersReducedMotion() ? Math.max(0, Math.min(1, level)) : 0;
  if (!murmur && (target <= 0 || !ctx)) return;
  try {
    const context = ctx ?? getAudioContext();
    if (!context) return;
    if (!murmur) {
      const source = context.createBufferSource();
      source.buffer = getNoiseBuffer(context);
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.6;
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
      murmur = { source, filter, gain };
    }
    const now = context.currentTime;
    const volume = target <= 0 ? 0.0001 : 0.003 + target * 0.016;
    murmur.gain.gain.cancelScheduledValues(now);
    murmur.gain.gain.setTargetAtTime(volume, now, 0.4);
    murmur.filter.frequency.setTargetAtTime(420 + target * 900, now, 0.5);
  } catch {
    // Atmosphere is optional; never throw.
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
