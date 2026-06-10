// Mulberry32 seeded PRNG — deterministic for same seed
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateSeed(dateStr: string): number {
  // dateStr = 'YYYY-MM-DD'
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function slateNumber(dateStr: string): number {
  const epoch = new Date('2024-01-01');
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - epoch.getTime()) / 86400000) + 1;
}

export type RNG = () => number;

// Weighted random pick
export function weightedPick<T>(items: T[], weights: number[], rng: RNG): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Draw from right-skewed distribution
export function skewedDraw(
  rng: RNG,
  floor: number,
  proj: number,
  ceiling: number,
  volatility: number,
  boomChance: number,
  gameScriptBonus: number = 0
): number {
  const isBoom = rng() < boomChance + gameScriptBonus;
  if (isBoom) {
    // Boom: draw from proj to ceiling+, right tail
    const extra = rng() * (ceiling - proj) * 1.3;
    return Math.max(floor, proj + extra);
  }
  // Normal distribution approximation via Box-Muller
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const sigma = (ceiling - floor) * volatility * 0.25;
  const raw = proj + z * sigma;
  return Math.max(0, Math.min(raw, ceiling * 1.4));
}
