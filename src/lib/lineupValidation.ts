import type { Lineup, Player, RosterSlot } from '../types';
import { SALARY_CAP } from '../types';

export function isFlexEligible(p: Player) {
  return p.position === 'RB' || p.position === 'WR' || p.position === 'TE';
}

export function canFillSlot(slot: RosterSlot, player: Player): boolean {
  switch (slot) {
    case 'QB': return player.position === 'QB';
    case 'RB1':
    case 'RB2': return player.position === 'RB';
    case 'WR1':
    case 'WR2': return player.position === 'WR';
    case 'TE': return player.position === 'TE';
    case 'FLEX': return isFlexEligible(player);
    case 'DST': return player.position === 'DST';
  }
}

export function totalSalary(lineup: Lineup): number {
  return Object.values(lineup).reduce((sum, p) => sum + (p ? p.salary : 0), 0);
}

export function remainingSalary(lineup: Lineup): number {
  return SALARY_CAP - totalSalary(lineup);
}

export function openSlotCount(lineup: Lineup): number {
  return Object.values(lineup).filter((p) => p === null).length;
}

export function averageSalaryLeftPerOpenSlot(lineup: Lineup): number {
  const open = openSlotCount(lineup);
  if (open === 0) return 0;
  return remainingSalary(lineup) / open;
}

export function isComplete(lineup: Lineup): boolean {
  return Object.values(lineup).every((p) => p !== null);
}

export function isValid(lineup: Lineup): boolean {
  if (!isComplete(lineup)) return false;
  if (totalSalary(lineup) > SALARY_CAP) return false;

  // All players unique
  const ids = Object.values(lineup).filter(Boolean).map((p) => p!.id);
  return new Set(ids).size === ids.length;
}

export function getLineupPlayers(lineup: Lineup): Player[] {
  return Object.values(lineup).filter(Boolean) as Player[];
}

export function lineupProjectedPoints(lineup: Lineup): number {
  return getLineupPlayers(lineup).reduce((sum, p) => sum + p.displayedProjection, 0);
}

export function lineupAvgOwnership(lineup: Lineup): number {
  const players = getLineupPlayers(lineup);
  if (!players.length) return 0;
  return players.reduce((sum, p) => sum + p.ownership, 0) / players.length;
}

// Try to add a player to a lineup — returns updated lineup or null if no valid slot
export function addPlayer(lineup: Lineup, player: Player): Lineup | null {
  const slots: RosterSlot[] = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'DST'];

  // Check player not already in lineup
  const existing = getLineupPlayers(lineup);
  if (existing.some((p) => p.id === player.id)) return null;

  for (const slot of slots) {
    if (canFillSlot(slot, player) && lineup[slot] === null) {
      const updated = { ...lineup, [slot]: player };
      if (totalSalary(updated) <= SALARY_CAP) return updated;
    }
  }
  return null;
}

export function removePlayer(lineup: Lineup, player: Player): Lineup {
  const updated = { ...lineup };
  for (const key of Object.keys(updated) as RosterSlot[]) {
    if (updated[key]?.id === player.id) updated[key] = null;
  }
  return updated;
}

export function emptyLineup(): Lineup {
  return { QB: null, RB1: null, RB2: null, WR1: null, WR2: null, TE: null, FLEX: null, DST: null };
}
