import { mulberry32, stringSeed, type RNG } from '../rng';
import { prepareFourthPhaseTeamDeck, shuffleFourthPhase } from './deck';
import { BASE_METER, BASE_METER_CAP } from './meter';
import { applyFourthPhaseDrawStart } from './engine';
import { FOURTH_PHASE_JOKER_POOL } from './jokers';
import type {
  FourthPhaseBossKey,
  FourthPhaseCard,
  FourthPhaseJokerId,
  FourthPhaseJokerState,
  FourthPhaseTeamKey,
  MeterState,
} from './types';

export const FOURTH_PHASE_HAND_SIZE = 8;
export const FOURTH_PHASE_PLAY_LIMIT = 5;
export const FOURTH_PHASE_JOKER_LIMIT = 5;
export const FOURTH_PHASE_DRIVES = 3;
export const FOURTH_PHASE_DISCARDS = 2;
/** Plays allowed per drive before a stalled drive is a loss. Shared by the lab UI and the balance harness. */
export const FOURTH_PHASE_MAX_PLAYS_PER_DRIVE = 8;

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
  boss: FourthPhaseBossKey;
  targets: [number, number, number];
  money: number;
  meter: MeterState;
}

export function fourthPhaseRunCode(seed: number, team: FourthPhaseTeamKey): string {
  const teamCode = FOURTH_PHASE_TEAMS[team].shortName.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase();
  return `FP-${teamCode}-${seed.toString(36).toUpperCase()}`;
}

export function randomFourthPhaseBoss(seed: number, team: FourthPhaseTeamKey): FourthPhaseBossKey {
  const rng = mulberry32(stringSeed(`fourth-phase-boss:${seed}:${team}`));
  return BOSS_KEYS[Math.floor(rng() * BOSS_KEYS.length)];
}

export function fourthPhaseTargets(team: FourthPhaseTeamKey, seed: number): [number, number, number] {
  const rng = mulberry32(stringSeed(`fourth-phase-targets:${seed}:${team}`));
  const bump = Math.floor(rng() * 10);
  if (team === 'loudHouse') return [186 + bump, 366 + bump, 614 + bump];
  if (team === 'specialTeamsChaos') return [180 + bump, 356 + bump, 600 + bump];
  return [198 + bump, 394 + bump, 666 + bump];
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

export function activeBossForDrive(run: Pick<FourthPhaseRunSeed, 'boss'>, driveIndex: number): FourthPhaseBossKey {
  return driveIndex >= 2 ? run.boss : 'none';
}
