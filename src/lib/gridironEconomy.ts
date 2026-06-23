// Gridiron — Front Office Funds (the transmission).
//
// Funds are the BETWEEN-GAME currency (distinct from in-match Play Budget). They
// flow through the War Room shop into player development, scheme installs, and
// staff hires. The one rule that gives a roguelike its between-round soul is
// INTEREST: banking funds earns a little more, so every shop is a real decision —
// spend now for power, or hoard for a keystone coordinator later.
//
// Kept deliberately gentle: interest is a nudge, not a dominant hoarding strategy
// (the balance harness guards that hoarding stays viable-but-not-optimal).

export const STARTING_FUNDS = 6;

// Win purse, indexed by the game number you just CLEARED (1..4). The
// championship (game 5) has no shop after it, so its purse is unused.
export const WIN_PURSE: Record<number, number> = { 1: 5, 2: 6, 3: 7, 4: 8 };

export const INTEREST_PER = 5;   // +1 Fund per $5 banked at shop entry…
export const INTEREST_CAP = 3;   // …capped so hoarding never snowballs out of control.

export const SKIP_REWARD = 2;    // bank this many Funds for taking nothing.
export const REROLL_BASE = 2;    // first reroll in a shop…
export const REROLL_STEP = 1;    // …+1 each additional reroll.
export const MAX_WAR_ROOM_PURCHASES = 2; // buy one reward, optionally a second.

// What the War Room shows the player when they walk in after a win.
export interface ShopCreditInfo { purse: number; interest: number; total: number; gameCleared: number }

export function interestOn(funds: number, cap: number = INTEREST_CAP): number {
  return Math.min(cap, Math.floor(Math.max(0, funds) / INTEREST_PER));
}

// Funds credited on clearing game `gameCleared` (purse + interest on the balance
// you walked in with). Returns the breakdown so the War Room can show the math.
// `interestCap` lets the Deep Pockets Front Office upgrade raise the ceiling;
// it defaults to INTEREST_CAP so existing callers (and the harness) are unchanged.
export function shopCredit(funds: number, gameCleared: number, interestCap: number = INTEREST_CAP): { purse: number; interest: number; total: number } {
  const purse = WIN_PURSE[gameCleared] ?? 0;
  const interest = interestOn(funds, interestCap);
  return { purse, interest, total: purse + interest };
}

export function rerollCost(rerollsThisShop: number): number {
  return REROLL_BASE + REROLL_STEP * rerollsThisShop;
}
