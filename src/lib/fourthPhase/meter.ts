import type { Rank } from './types';

export const BASE_METER = 1;
export const BASE_METER_CAP = 6;
export const ABSOLUTE_METER_CAP = 12;
export const SUSTAINED_TICK = 0.1;
export const DEFAULT_BLEED_RATE = 0.25;
export const LOW_SCORE_BLEED_THRESHOLD = 18;
// Holding a charged meter is no longer free: a scoring play that ignores a hot
// meter (instead of cashing it) bleeds this fraction of the charge above x1.0.
// This is what makes "cash now vs keep building" a real decision.
export const HOLD_BLEED_RATE = 0.12;

export function crowdChargeForRank(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 0.6;
  if (rank === '7' || rank === '8' || rank === '9' || rank === '10') return 0.4;
  return 0.2;
}

export function clampMeter(value: number, cap: number): number {
  return Math.min(Math.max(BASE_METER, value), Math.max(BASE_METER, cap));
}

export function applyMeterCharge(current: number, charge: number, cap: number): number {
  return clampMeter(current + Math.max(0, charge), cap);
}

export function applyMeterBleed(current: number, rate = DEFAULT_BLEED_RATE): number {
  return BASE_METER + (Math.max(BASE_METER, current) - BASE_METER) * Math.max(0, 1 - rate);
}

export function formatMeter(value: number): string {
  return `x${value.toFixed(1)}`;
}

export function meterTightness(value: number, cap: number): number {
  if (cap <= BASE_METER) return 0;
  return (clampMeter(value, cap) - BASE_METER) / (cap - BASE_METER);
}
