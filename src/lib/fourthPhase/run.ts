import { mulberry32, stringSeed, type RNG } from '../rng';
import { prepareFourthPhaseTeamDeck, shuffleFourthPhase } from './deck';
import { BASE_METER, BASE_METER_CAP } from './meter';
import { applyFourthPhaseDrawStart } from './engine';
import { FOURTH_PHASE_JOKER_POOL } from './jokers';
import { SITUATION_LABELS } from './situations';
import type {
  FourthPhaseBossKey,
  FourthPhaseCard,
  FourthPhaseJokerId,
  FourthPhaseJokerState,
  FourthPhasePracticeBook,
  FourthPhaseTeamKey,
  FourthPhaseWarRoomOffer,
  MeterState,
  SituationKey,
} from './types';

export const FOURTH_PHASE_HAND_SIZE = 8;
export const FOURTH_PHASE_PLAY_LIMIT = 5;
export const FOURTH_PHASE_JOKER_LIMIT = 5;
export const FOURTH_PHASE_DRIVES = 3;
export const FOURTH_PHASE_DISCARDS = 2;
/** Plays allowed per drive before a stalled drive is a loss. Shared by the lab UI and the balance harness. */
export const FOURTH_PHASE_MAX_PLAYS_PER_DRIVE = 8;
export const FOURTH_PHASE_WAR_ROOM_BUY_LIMIT = 2;
export const FOURTH_PHASE_WAR_ROOM_REROLL_COST = 2;
/** Most Special Teams discount tokens a run can bank at once. */
export const FOURTH_PHASE_DISCOUNT_TOKEN_CAP = 3;
/** Most tokens one War Room offer can consume. */
export const FOURTH_PHASE_DISCOUNT_PER_OFFER = 2;

/**
 * Spend banked Special Teams discount tokens on one War Room offer.
 * Shaves $1 per token, at most FOURTH_PHASE_DISCOUNT_PER_OFFER per offer,
 * never below $1. Shared by the Lab UI and the balance harness so the two
 * economies cannot diverge.
 */
export function discountedOfferCost(cost: number, tokens: number): { cost: number; used: number } {
  const used = Math.max(0, Math.min(FOURTH_PHASE_DISCOUNT_PER_OFFER, Math.floor(tokens), cost - 1));
  return { cost: cost - used, used };
}

export interface FourthPhaseTeamProfile {
  key: FourthPhaseTeamKey;
  name: string;
  shortName: string;
  signatureJoker: FourthPhaseJokerId;
  identity: string;
}

export const FOURTH_PHASE_TEAMS: Record<FourthPhaseTeamKey, FourthPhaseTeamProfile> = {
  balanced: {
    key: 'balanced',
    name: 'Ironwood Engineers',
    shortName: 'Balanced',
    signatureJoker: 'theGenius',
    identity: 'All four phases are live from snap one.',
  },
  airRaid: {
    key: 'airRaid',
    name: 'Canyon Comets',
    shortName: 'Air Raid',
    signatureJoker: 'hurryUp',
    identity: 'Offense and Crowd can explode, but the floor is thinner.',
  },
  smashmouth: {
    key: 'smashmouth',
    name: 'Foundry Maulers',
    shortName: 'Smashmouth',
    signatureJoker: 'silentCount',
    identity: 'Low-rank Offense and Special Teams grind out safe value.',
  },
  blackAndBlue: {
    key: 'blackAndBlue',
    name: 'Harbor Bruisers',
    shortName: 'Black & Blue',
    signatureJoker: 'pickSixSpecialist',
    identity: 'Defense and hidden yards build the floor off-meter.',
  },
  loudHouse: {
    key: 'loudHouse',
    name: 'Summit Noise',
    shortName: 'Loud House',
    signatureJoker: 'twelfthMan',
    identity: 'Crowd charges fast, but Base must be drafted carefully.',
  },
  specialTeamsChaos: {
    key: 'specialTeamsChaos',
    name: 'River City Sparks',
    shortName: 'ST Chaos',
    signatureJoker: 'fieldGeneral',
    identity: 'Fuel, draw, and money create odd scoring windows.',
  },
};

export interface FourthPhaseBossProfile {
  key: FourthPhaseBossKey;
  name: string;
  effect: string;
}

export const FOURTH_PHASE_BOSSES: Record<FourthPhaseBossKey, FourthPhaseBossProfile> = {
  none: { key: 'none', name: 'Open Field', effect: 'No boss pressure.' },
  stackedBox: { key: 'stackedBox', name: 'Stacked Box', effect: 'Offense Yards are cut in half.' },
  noFlyZone: { key: 'noFlyZone', name: 'No-Fly Zone', effect: 'Only two Offense cards are clean.' },
  roadGame: { key: 'roadGame', name: 'Road Game', effect: 'Meter cap forced to x2.0 with heavier bleed.' },
  turnoverDrill: { key: 'turnoverDrill', name: 'Turnover Drill', effect: 'Defense subtracts Execution.' },
  fieldPositionWar: { key: 'fieldPositionWar', name: 'Field Position War', effect: 'Special Teams gives no fuel.' },
  adaptiveDc: { key: 'adaptiveDc', name: 'Adaptive DC', effect: 'Repeated situations score 0.' },
  preventDefense: { key: 'preventDefense', name: 'Prevent Defense', effect: 'BigPlay is capped.' },
};

const BOSS_KEYS: readonly FourthPhaseBossKey[] = [
  'stackedBox',
  'noFlyZone',
  'roadGame',
  'turnoverDrill',
  'fieldPositionWar',
  'adaptiveDc',
  'preventDefense',
];

export interface FourthPhaseRunSeed {
  seed: number;
  team: FourthPhaseTeamKey;
  deck: FourthPhaseCard[];
  jokers: FourthPhaseJokerState[];
  practice: FourthPhasePracticeBook;
  boss: FourthPhaseBossKey;
  targets: [number, number, number];
  money: number;
  meter: MeterState;
}

export function fourthPhaseRunCode(seed: number, team: FourthPhaseTeamKey): string {
  const teamCode = FOURTH_PHASE_TEAMS[team].shortName.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase();
  return `FP-${teamCode}-${seed.toString(36).toUpperCase()}`;
}

export function parseFourthPhaseRunCode(code: string): { seed: number; team: FourthPhaseTeamKey } | null {
  const match = code.trim().toUpperCase().match(/^FP-([A-Z0-9]{2,3})-([A-Z0-9]+)$/);
  if (!match) return null;
  const [, teamCode, seedCode] = match;
  const team = (Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[]).find(
    (key) => FOURTH_PHASE_TEAMS[key].shortName.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() === teamCode,
  );
  const seed = Number.parseInt(seedCode, 36);
  if (!team || !Number.isFinite(seed)) return null;
  return { seed, team };
}

export function randomFourthPhaseBoss(seed: number, team: FourthPhaseTeamKey): FourthPhaseBossKey {
  const rng = mulberry32(stringSeed(`fourth-phase-boss:${seed}:${team}`));
  return BOSS_KEYS[Math.floor(rng() * BOSS_KEYS.length)];
}

export function fourthPhaseTargets(team: FourthPhaseTeamKey, seed: number): [number, number, number] {
  const rng = mulberry32(stringSeed(`fourth-phase-targets:${seed}:${team}`));
  const bump = Math.floor(rng() * 10);
  if (team === 'airRaid') return [296 + bump, 576 + bump, 978 + bump];
  if (team === 'smashmouth') return [232 + bump, 456 + bump, 778 + bump];
  if (team === 'blackAndBlue') return [262 + bump, 512 + bump, 870 + bump];
  if (team === 'loudHouse') return [208 + bump, 408 + bump, 694 + bump];
  if (team === 'specialTeamsChaos') return [212 + bump, 416 + bump, 708 + bump];
  return [276 + bump, 540 + bump, 916 + bump];
}

export function createFourthPhaseRun(team: FourthPhaseTeamKey = 'balanced', seed = stringSeed(`fourth-phase:${Date.now()}`)): FourthPhaseRunSeed {
  const profile = FOURTH_PHASE_TEAMS[team];
  const deck = shuffleFourthPhase(prepareFourthPhaseTeamDeck(team), mulberry32(seed));
  const jokers: FourthPhaseJokerState[] = [{ id: profile.signatureJoker }];
  const meter = applyFourthPhaseDrawStart(
    { meter: BASE_METER, meterCap: BASE_METER_CAP },
    { jokers, boss: 'none', wins: 0 },
  );
  return {
    seed,
    team,
    deck,
    jokers,
    practice: {},
    boss: randomFourthPhaseBoss(seed, team),
    targets: fourthPhaseTargets(team, seed),
    money: 8,
    meter: { meter: meter.meter, meterCap: meter.meterCap },
  };
}

export function drawFourthPhaseCards(
  deck: readonly FourthPhaseCard[],
  discard: readonly FourthPhaseCard[],
  count: number,
  rng: RNG,
): { deck: FourthPhaseCard[]; discard: FourthPhaseCard[]; drawn: FourthPhaseCard[] } {
  let drawPile = [...deck];
  let discardPile = [...discard];
  const drawn: FourthPhaseCard[] = [];
  while (drawn.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = shuffleFourthPhase(discardPile, rng);
      discardPile = [];
    }
    const card = drawPile.shift();
    if (!card) break;
    drawn.push(card);
  }
  return { deck: drawPile, discard: discardPile, drawn };
}

export function draftFourthPhaseJokers(owned: readonly FourthPhaseJokerState[], seed: number, driveIndex: number): FourthPhaseJokerState[] {
  const ownedIds = new Set(owned.map((joker) => joker.id));
  const pool = FOURTH_PHASE_JOKER_POOL.filter((joker) => !ownedIds.has(joker.id));
  const ordered = shuffleFourthPhase(pool, mulberry32(stringSeed(`fourth-phase-draft:${seed}:${driveIndex}:${owned.length}`)));
  return ordered.slice(0, 3).map((joker) => ({ id: joker.id }));
}

const PRACTICE_KEYS: readonly SituationKey[] = [
  'houseCall',
  'fieldFlip',
  'pickSix',
  'drive',
  'momentumShift',
  'complementaryFootball',
  'blackout',
  'stand',
];

function bossTag(boss: FourthPhaseBossKey): string | null {
  if (boss === 'roadGame') return 'fixes Road Game';
  if (boss === 'fieldPositionWar') return 'answers Field Position War';
  if (boss === 'noFlyZone') return 'answers No-Fly Zone';
  if (boss === 'stackedBox') return 'answers Stacked Box';
  if (boss === 'turnoverDrill') return 'answers Turnover Drill';
  if (boss === 'adaptiveDc') return 'answers Adaptive DC';
  if (boss === 'preventDefense') return 'answers Prevent Defense';
  return null;
}

function offerTagsForJoker(jokerId: FourthPhaseJokerId, team: FourthPhaseTeamKey, boss: FourthPhaseBossKey): string[] {
  const tags: string[] = [];
  if (['fieldGeneral', 'returnAce', 'hiddenYards'].includes(jokerId)) tags.push('feeds ST economy');
  if (['twelfthMan', 'studentSection', 'blackoutCurtain', 'homeRunThreat', 'doubleMove'].includes(jokerId)) tags.push('feeds Crowd cash-in');
  if (['pickSixSpecialist', 'silentCount', 'bendDontBreak'].includes(jokerId)) tags.push('defensive floor');
  if (['hurryUp', 'twoMinuteDrill', 'leadBlocker'].includes(jokerId)) tags.push('order puzzle');
  if (['roadWarriors', 'closer', 'pressBoxAngle', 'redZonePackage', 'scriptedSeries'].includes(jokerId)) tags.push('boss-drive plan');
  if (team === 'specialTeamsChaos' && tags.includes('feeds ST economy')) tags.unshift('team identity');
  if (team === 'loudHouse' && tags.includes('feeds Crowd cash-in')) tags.unshift('team identity');
  if (boss === 'roadGame' && ['roadWarriors', 'homeCooking', 'sustainedDrive'].includes(jokerId)) tags.unshift('fixes Road Game');
  if (boss !== 'none' && ['closer', 'pressBoxAngle', 'redZonePackage'].includes(jokerId)) tags.unshift(bossTag(boss) ?? 'boss answer');
  return [...new Set(tags)].slice(0, 3);
}

function practiceTags(situation: SituationKey, team: FourthPhaseTeamKey, boss: FourthPhaseBossKey): string[] {
  const tags: string[] = [];
  if (situation === 'fieldFlip') tags.push('feeds ST economy');
  if (situation === 'houseCall' || situation === 'blackout') tags.push('feeds Crowd cash-in');
  if (situation === 'pickSix' || situation === 'stand') tags.push('defensive floor');
  if (situation === 'complementaryFootball' || situation === 'momentumShift') tags.push('phase glue');
  if (team === 'specialTeamsChaos' && situation === 'fieldFlip') tags.unshift('team identity');
  if (team === 'loudHouse' && (situation === 'houseCall' || situation === 'blackout')) tags.unshift('team identity');
  if (boss !== 'none') tags.push(bossTag(boss) ?? 'boss prep');
  return [...new Set(tags)].slice(0, 3);
}

function practiceKeyFor(team: FourthPhaseTeamKey, boss: FourthPhaseBossKey, seed: number, driveIndex: number, reroll: number, practice: FourthPhasePracticeBook): SituationKey {
  const preferred: Partial<Record<FourthPhaseTeamKey, SituationKey[]>> = {
    balanced: ['complementaryFootball', 'momentumShift', 'houseCall'],
    airRaid: ['houseCall', 'drive', 'blackout'],
    smashmouth: ['drive', 'fieldFlip', 'stand'],
    blackAndBlue: ['pickSix', 'stand', 'momentumShift'],
    loudHouse: ['houseCall', 'blackout', 'complementaryFootball'],
    specialTeamsChaos: ['fieldFlip', 'complementaryFootball', 'houseCall'],
  };
  const bossPreferred: Partial<Record<FourthPhaseBossKey, SituationKey[]>> = {
    roadGame: ['houseCall', 'blackout'],
    fieldPositionWar: ['drive', 'houseCall'],
    noFlyZone: ['fieldFlip', 'pickSix'],
    stackedBox: ['fieldFlip', 'stand'],
    turnoverDrill: ['drive', 'houseCall'],
    adaptiveDc: ['complementaryFootball', 'momentumShift'],
    preventDefense: ['drive', 'fieldFlip'],
  };
  const pool = [...(bossPreferred[boss] ?? []), ...(preferred[team] ?? []), ...PRACTICE_KEYS]
    .filter((key, index, all) => all.indexOf(key) === index)
    .filter((key) => (practice[key] ?? 0) < 3);
  if (!pool.length) return 'houseCall';
  const rng = mulberry32(stringSeed(`fourth-phase-practice:${seed}:${driveIndex}:${reroll}:${team}:${boss}`));
  return pool[Math.floor(rng() * pool.length)];
}

// Concrete numbers only — this string is the shop's promise, so it must mirror
// applyPracticeBonus in engine.ts exactly (+5 Yards / +0.03 Exec per level;
// +0.12 BP per level on cashing situations, +0.05 otherwise; utility packages
// for Field Flip and The Blackout).
function practiceDrillDetail(situation: SituationKey, level: number): string {
  if (situation === 'fieldFlip') {
    return `Level ${level}: Field Flip also pays +${level} draw and +$${level * 2}.`;
  }
  if (situation === 'blackout') {
    return `Level ${level}: The Blackout also charges +${(level * 0.15).toFixed(2)} meter.`;
  }
  const cashes = situation === 'houseCall' || situation === 'complementaryFootball';
  const bigPlay = level * (cashes ? 0.12 : 0.05);
  return `Level ${level}: ${SITUATION_LABELS[situation]} gains +${level * 5} Yards, +${(level * 0.03).toFixed(2)} Exec, +${bigPlay.toFixed(2)} BP.`;
}

export function generateFourthPhaseWarRoomOffers(
  owned: readonly FourthPhaseJokerState[],
  seed: number,
  driveIndex: number,
  team: FourthPhaseTeamKey,
  boss: FourthPhaseBossKey,
  reroll = 0,
  practice: FourthPhasePracticeBook = {},
): FourthPhaseWarRoomOffer[] {
  const ownedIds = new Set(owned.map((joker) => joker.id));
  const pool = FOURTH_PHASE_JOKER_POOL.filter((joker) => !ownedIds.has(joker.id));
  const ordered = shuffleFourthPhase(pool, mulberry32(stringSeed(`fourth-phase-offers:${seed}:${driveIndex}:${owned.length}:${reroll}`)));
  const jokerOffers = ordered.slice(0, 3).map((def): FourthPhaseWarRoomOffer => ({
    id: `joker:${def.id}`,
    kind: 'joker',
    cost: 4,
    label: def.name,
    detail: def.effect,
    tags: offerTagsForJoker(def.id, team, boss),
    joker: { id: def.id },
  }));
  const situation = practiceKeyFor(team, boss, seed, driveIndex, reroll, practice);
  const level = (practice[situation] ?? 0) + 1;
  const drill: FourthPhaseWarRoomOffer = {
    id: `practice:${situation}:${level}`,
    kind: 'practice',
    cost: 3,
    label: `${SITUATION_LABELS[situation]} Drill`,
    detail: practiceDrillDetail(situation, level),
    tags: practiceTags(situation, team, boss),
    situation,
  };
  return [...jokerOffers, drill];
}

export function activeBossForDrive(run: Pick<FourthPhaseRunSeed, 'boss'>, driveIndex: number): FourthPhaseBossKey {
  return driveIndex >= 2 ? run.boss : 'none';
}
