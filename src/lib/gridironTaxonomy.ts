// Gridiron — content taxonomy (rarity-as-LABEL, category, lane, role).
//
// This layer is presentation/data ONLY. It does not change any scoring, reward
// power, price, or balance number — it just makes the existing content legible
// as an ecosystem (Common/Uncommon/Rare/Legendary, what lane it serves, what
// channel it pushes). Rarity here is descriptive of CURRENT strength, not a new
// power tier. Run codes (team + seed) also live here so a run is shareable and
// replayable from a single string.

import { FB_COORDINATORS, TEAM_PROFILES, TEAM_ARCHETYPES, type FbCoordinatorKey, type TeamArchetype } from './footballRogue';
import type { Reward, FilmToolKey, FrontOfficeKey } from './footballRun';

export type FbRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type FbLane = 'pass' | 'ground' | 'defense' | 'mobile' | 'flex';
export type FbCategory =
  | 'Coordinator' | 'Game Plan' | 'Film Tool' | 'Front Office'
  | 'Player Card' | 'Training' | 'Roster Move';

export interface RarityMeta { key: FbRarity; label: string; color: string; bg: string; border: string; rank: number; }

// Gray → green → purple → gold, reusing the existing palette so nothing clashes.
export const RARITY_META: Record<FbRarity, RarityMeta> = {
  common: { key: 'common', label: 'Common', color: '#9aa6b5', bg: '#141b24', border: '#2a3543', rank: 0 },
  uncommon: { key: 'uncommon', label: 'Uncommon', color: '#34c771', bg: '#0c2419', border: '#1f6b44', rank: 1 },
  rare: { key: 'rare', label: 'Rare', color: '#b7a7ff', bg: '#140f24', border: '#5a4ba0', rank: 2 },
  legendary: { key: 'legendary', label: 'Legendary', color: '#f0b429', bg: '#2a210c', border: '#5a4112', rank: 3 },
};

export const LANE_LABEL: Record<FbLane, string> = {
  pass: 'Pass', ground: 'Ground', defense: 'Defense', mobile: 'Mobile', flex: 'Flex',
};

// ── Coordinator taxonomy ─────────────────────────────────────────────────────
// Rarity tracks CURRENT strength: flat helpers are Common, within-game ramps
// Uncommon, season-long compounders Rare. Legendary is reserved (Phase 6).
const COORD_RARITY: Record<FbCoordinatorKey, FbRarity> = {
  salary_wizard: 'common', west_coast: 'common', ball_hawk: 'common', broken_play: 'common',
  air_raid: 'uncommon', bell_cow: 'uncommon', read_option: 'uncommon', pressure_chain: 'uncommon',
  franchise_qb: 'rare', improviser: 'rare', takeaway_machine: 'rare', power_sweep: 'rare',
  two_minute_drill: 'legendary',
};

const COORD_LANE: Record<FbCoordinatorKey, FbLane> = {
  air_raid: 'pass', franchise_qb: 'pass', west_coast: 'pass', two_minute_drill: 'pass',
  bell_cow: 'ground', salary_wizard: 'ground', power_sweep: 'ground',
  ball_hawk: 'defense', pressure_chain: 'defense', takeaway_machine: 'defense',
  read_option: 'mobile', improviser: 'mobile', broken_play: 'mobile',
};

export interface CoordinatorTaxonomy { rarity: FbRarity; lane: FbLane; role: string; }

export function coordinatorTaxonomy(key: FbCoordinatorKey): CoordinatorTaxonomy {
  const c = FB_COORDINATORS[key];
  const role = c.channel === 'big_play' ? 'Big Play' : c.channel === 'execution' ? 'Execution' : 'Base';
  return { rarity: COORD_RARITY[key] ?? 'common', lane: COORD_LANE[key] ?? 'flex', role };
}

// ── Concept (Game Plan) lane ─────────────────────────────────────────────────
const CONCEPT_LANE: Record<string, FbLane> = {
  double_stack_bomb: 'pass', shootout_stack: 'pass', stack_td: 'pass', checkdown: 'pass',
  ground_pound: 'ground', designed_run: 'ground', field_goal: 'ground',
  pick_six: 'defense', takeaway: 'defense', sack: 'defense',
  qb_keeper: 'mobile',
};

// ── Film Tool / Front Office rarity (label only) ─────────────────────────────
const FILM_RARITY: Partial<Record<FilmToolKey, FbRarity>> = {
  film_cut: 'common', contract_restructure: 'common', bulk_up: 'common', reliable_hands: 'common',
  depth_chart: 'common', film_grind: 'common',
  deep_threat: 'uncommon', clutch_reps: 'uncommon', boss_prep: 'uncommon',
  clone_tape: 'rare', explosive_pkg: 'rare', hot_route_install: 'rare',
  flea_flicker: 'rare', gadget_gamble: 'rare',
};
export function filmToolRarity(key: FilmToolKey): FbRarity { return FILM_RARITY[key] ?? 'uncommon'; }

const FRONT_OFFICE_RARITY: Record<FrontOfficeKey, FbRarity> = {
  reroll_discount: 'uncommon', extra_audible: 'uncommon', film_room_expansion: 'uncommon',
  staff_expansion: 'rare', deep_pockets: 'rare', extra_reward: 'rare',
};
export function frontOfficeRarity(key: FrontOfficeKey): FbRarity { return FRONT_OFFICE_RARITY[key] ?? 'uncommon'; }

// ── Reward taxonomy (parsed from the reward id) ──────────────────────────────
export interface RewardTaxonomy { category: FbCategory; rarity: FbRarity; lane: FbLane; }

export function rewardTaxonomy(reward: Reward): RewardTaxonomy {
  const id = reward.id;
  if (id.startsWith('coord-')) {
    const key = id.slice(6) as FbCoordinatorKey;
    const t = coordinatorTaxonomy(key);
    return { category: 'Coordinator', rarity: t.rarity, lane: t.lane };
  }
  if (id.startsWith('pb-')) {
    const concept = id.slice(3);
    return { category: 'Game Plan', rarity: 'uncommon', lane: CONCEPT_LANE[concept] ?? 'flex' };
  }
  if (id.startsWith('card-')) return { category: 'Player Card', rarity: 'common', lane: 'flex' };
  if (id.startsWith('train-')) return { category: 'Training', rarity: 'common', lane: 'flex' };
  if (id === 'trim') return { category: 'Roster Move', rarity: 'common', lane: 'flex' };
  if (id === 'upgrade') return { category: 'Player Card', rarity: 'common', lane: 'flex' };
  return { category: 'Player Card', rarity: 'common', lane: 'flex' };
}

// ── "Rarest reward owned" — for the run recap / story line ────────────────────
export interface RarestOwned { label: string; rarity: FbRarity; }

export function rarestOwned(coordinators: FbCoordinatorKey[]): RarestOwned | null {
  let best: RarestOwned | null = null;
  for (const key of coordinators) {
    const rarity = COORD_RARITY[key] ?? 'common';
    if (!best || RARITY_META[rarity].rank > RARITY_META[best.rarity].rank) {
      best = { label: FB_COORDINATORS[key].name, rarity };
    }
  }
  return best;
}

// ── Run codes — a single shareable/replayable string of team + seed ──────────
// Format: TEAMSHORT-BASE36SEED, e.g. "VLT-2K9F4P". The short code identifies the
// starting class; the seed reproduces every weather roll, boss, reward shelf, and
// draw. Player decisions stay the player's (the Balatro seed model).
const SHORT_TO_TEAM: Record<string, TeamArchetype> = Object.fromEntries(
  TEAM_ARCHETYPES.map((t) => [TEAM_PROFILES[t].shortName.toUpperCase(), t]),
);

export function formatRunCode(team: TeamArchetype, seed: number): string {
  return `${TEAM_PROFILES[team].shortName.toUpperCase()}-${(seed >>> 0).toString(36).toUpperCase()}`;
}

export function parseRunCode(input: string): { team: TeamArchetype; seed: number } | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, '');
  const m = raw.match(/^([A-Z]{2,4})-([0-9A-Z]+)$/);
  if (!m) return null;
  const team = SHORT_TO_TEAM[m[1]];
  if (!team) return null;
  const seed = parseInt(m[2], 36);
  if (!Number.isFinite(seed) || seed < 0) return null;
  return { team, seed: seed >>> 0 };
}
