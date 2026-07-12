import { mulberry32, stringSeed, type RNG } from '../rng';
import {
  PHASE_JOB,
  PHASE_SHORT,
  FOURTH_PHASE_INSTALL_CROWD_CHARGE,
  FOURTH_PHASE_INSTALL_LEVERAGE,
  FOURTH_PHASE_INSTALL_STRENGTH,
  cardContributionLabel,
  cardPlayChips,
  fourthPhaseReserveCards,
  prepareFourthPhaseTeamDeck,
  shuffleFourthPhase,
} from './deck';
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
export const FOURTH_PHASE_DECK_MAX_SIZE = 30;
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
  /** The real concepts a player should expect to draw and build around. */
  corePackage: string;
}

export interface FourthPhaseBuildIdentity {
  label: string;
  detail: string;
  installedCount: number;
}

// Playbooks are named like coaching philosophies, not fake franchises: the
// shortName is the scheme on the binder tab, the name is the nickname coaches
// use for the whole approach. All fictional, no real-team or licensed IP.
export const FOURTH_PHASE_TEAMS: Record<FourthPhaseTeamKey, FourthPhaseTeamProfile> = {
  balanced: {
    key: 'balanced',
    name: 'The Complete Game',
    shortName: 'Pro Style',
    signatureJoker: 'theGenius',
    identity: 'Balanced script: run game, quick game, play action, and all four phases are live.',
    corePackage: 'Inside Zone • Stick • Mesh • Play Action Boot',
  },
  airRaid: {
    key: 'airRaid',
    name: 'The Aerial Show',
    shortName: 'Air Raid',
    signatureJoker: 'hurryUp',
    identity: 'Pass-heavy spacing: Mesh, Y-Cross, Four Verts, and a thinner run-game floor.',
    corePackage: 'Bubble Screen • Mesh • Y-Cross • Four Verticals',
  },
  smashmouth: {
    key: 'smashmouth',
    name: 'Ground & Pound',
    shortName: 'Power',
    signatureJoker: 'silentCount',
    identity: 'Run-first body blows: Inside Zone, Duo, and Play Action are the backbone.',
    corePackage: 'QB Keep • Inside Zone • Duo • Play Action Boot',
  },
  blackAndBlue: {
    key: 'blackAndBlue',
    name: 'The Junkyard',
    shortName: 'Pressure',
    signatureJoker: 'pickSixSpecialist',
    identity: 'Defense-first package: pressure and takeaways create short-field shots.',
    corePackage: 'A-Gap Mug • Sim Pressure • Strip Pressure • Boundary Fade',
  },
  loudHouse: {
    key: 'loudHouse',
    name: 'Home Field Advantage',
    shortName: 'Spread',
    signatureJoker: 'twelfthMan',
    identity: 'Tempo spacing: quick game and crowd momentum turn clean scripts explosive.',
    corePackage: 'Bubble Screen • Stick • Tempo • Pressure Roar',
  },
  specialTeamsChaos: {
    key: 'specialTeamsChaos',
    name: 'The Hidden Game',
    shortName: 'Multiple',
    signatureJoker: 'fieldGeneral',
    identity: 'Oddball answers: hidden yards, field flips, and mixed scripts open strange windows.',
    corePackage: 'Pooch Kick • Fake Punt • Return Lane • Hidden Yards',
  },
};

/** A plain-language receipt for the deck the player actually finished with. */
export function fourthPhaseBuildIdentity(cards: readonly FourthPhaseCard[], team: FourthPhaseTeamKey): FourthPhaseBuildIdentity {
  const counts = cards.reduce<Record<FourthPhaseCard['phase'], number>>(
    (result, card) => ({ ...result, [card.phase]: result[card.phase] + 1 }),
    { offense: 0, defense: 0, specialTeams: 0, crowd: 0 },
  );
  const phase = (Object.entries(counts) as [FourthPhaseCard['phase'], number][])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const installed = cards.filter((card) => card.installed);
  const installedNames = installed.slice(0, 3).map((card) => card.roleName);
  const phaseLabel = phase === 'specialTeams' ? 'Hidden-Yards' : phase === 'crowd' ? 'Momentum' : phase === 'defense' ? 'Pressure' : 'Offense';
  return {
    label: `${FOURTH_PHASE_TEAMS[team].shortName} · ${phaseLabel} lean · ${installed.length} coached up`,
    detail: installedNames.length
      ? `Your defining installs: ${installedNames.join(', ')}${installed.length > installedNames.length ? ` +${installed.length - installedNames.length} more` : ''}.`
      : 'You finished on the untouched starting game plan.',
    installedCount: installed.length,
  };
}

export interface FourthPhaseBossProfile {
  key: FourthPhaseBossKey;
  name: string;
  effect: string;
}

export const FOURTH_PHASE_BOSSES: Record<FourthPhaseBossKey, FourthPhaseBossProfile> = {
  none: { key: 'none', name: 'Open Field', effect: 'No boss pressure.' },
  stackedBox: { key: 'stackedBox', name: 'Stacked Box', effect: 'Offense Yards are cut in half.' },
  noFlyZone: { key: 'noFlyZone', name: 'No-Fly Zone', effect: 'Only two Offense cards are clean.' },
  roadGame: { key: 'roadGame', name: 'Road Game', effect: 'Momentum cap forced to x2.0 with heavier bleed.' },
  turnoverDrill: { key: 'turnoverDrill', name: 'Ball Security', effect: 'Defense creates less leverage.' },
  fieldPositionWar: { key: 'fieldPositionWar', name: 'Touchback Machine', effect: 'Special Teams hidden-yards payout is suppressed.' },
  adaptiveDc: { key: 'adaptiveDc', name: 'Got Your Number', effect: 'Repeated situations score 0.' },
  preventDefense: { key: 'preventDefense', name: 'Prevent Defense', effect: 'Explosive multiplier is capped.' },
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

const FOURTH_PHASE_TEAM_CODES: Record<FourthPhaseTeamKey, string> = {
  balanced: 'BAL',
  airRaid: 'AIR',
  smashmouth: 'SMA',
  blackAndBlue: 'BLA',
  loudHouse: 'STA',
  specialTeamsChaos: 'STC',
};

const FOURTH_PHASE_LEGACY_TEAM_CODES: Partial<Record<string, FourthPhaseTeamKey>> = {
  LOU: 'loudHouse',
};

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

export function fourthPhaseRunCode(seed: number, team: FourthPhaseTeamKey, stake = 1): string {
  const teamCode = FOURTH_PHASE_TEAM_CODES[team];
  const base = `FP-${teamCode}-${seed.toString(36).toUpperCase()}`;
  return stake > 1 ? `${base}-S${stake}` : base;
}

export function parseFourthPhaseRunCode(code: string): { seed: number; team: FourthPhaseTeamKey; stake: number } | null {
  const match = code.trim().toUpperCase().match(/^FP-([A-Z0-9]{2,3})-([A-Z0-9]+)(?:-S([0-9]))?$/);
  if (!match) return null;
  const [, teamCode, seedCode, stakeCode] = match;
  const team = FOURTH_PHASE_LEGACY_TEAM_CODES[teamCode] ?? (Object.keys(FOURTH_PHASE_TEAM_CODES) as FourthPhaseTeamKey[]).find(
    (key) => FOURTH_PHASE_TEAM_CODES[key] === teamCode,
  );
  const seed = Number.parseInt(seedCode, 36);
  if (!team || !Number.isFinite(seed)) return null;
  return { seed, team, stake: Math.max(1, Number.parseInt(stakeCode ?? '1', 10) || 1) };
}

export function randomFourthPhaseBoss(seed: number, team: FourthPhaseTeamKey): FourthPhaseBossKey {
  const rng = mulberry32(stringSeed(`fourth-phase-boss:${seed}:${team}`));
  return BOSS_KEYS[Math.floor(rng() * BOSS_KEYS.length)];
}

export function fourthPhaseTargets(team: FourthPhaseTeamKey, seed: number): [number, number, number] {
  const rng = mulberry32(stringSeed(`fourth-phase-targets:${seed}:${team}`));
  const bump = Math.floor(rng() * 10);
  if (team === 'airRaid') return [335 + bump, 653 + bump, 1109 + bump];
  if (team === 'smashmouth') return [194 + bump, 380 + bump, 648 + bump];
  if (team === 'blackAndBlue') return [256 + bump, 500 + bump, 850 + bump];
  if (team === 'loudHouse') return [186 + bump, 364 + bump, 618 + bump];
  if (team === 'specialTeamsChaos') return [191 + bump, 374 + bump, 637 + bump];
  return [279 + bump, 547 + bump, 929 + bump];
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

export type FourthPhaseDriveAct = 'opening' | 'counterpunch' | 'closing';

export const FOURTH_PHASE_DRIVE_ACT_LABEL: Record<FourthPhaseDriveAct, string> = {
  opening: 'Opening Script',
  counterpunch: 'Counterpunch',
  closing: 'Closing Drive',
};

export function fourthPhaseDriveAct(driveIndex: number): FourthPhaseDriveAct {
  if (driveIndex <= 0) return 'opening';
  if (driveIndex === 1) return 'counterpunch';
  return 'closing';
}

/**
 * Seeded game-flow draw policy. Opening and counterpunch calls are live in the
 * first two drives; explicitly closing calls stay dormant until Drive 3. Three
 * act-appropriate inserts are promoted into the opening hand. This makes a
 * closing roar or pressure call arrive with the climax without hidden score
 * rolls or leaking "fourth-quarter" language into the opening drive.
 */
export function buildFourthPhaseDrivePile(
  cards: readonly FourthPhaseCard[],
  seed: number,
  driveIndex: number,
  spotlightCount = 3,
): FourthPhaseCard[] {
  const act = fourthPhaseDriveAct(driveIndex);
  const eligible = driveIndex >= 2
    ? [...cards]
    : cards.filter((card) => card.driveAct !== 'closing');
  const installed = shuffleFourthPhase(
    eligible.filter((card) => card.installed),
    mulberry32(stringSeed(`fourth-phase-drive-installed:${seed}:${driveIndex}`)),
  );
  const installedIds = new Set(installed.map((card) => card.id));
  const spotlight = shuffleFourthPhase(
    eligible.filter((card) => card.driveAct === act && !installedIds.has(card.id)),
    mulberry32(stringSeed(`fourth-phase-drive-spotlight:${seed}:${driveIndex}`)),
  );
  const flexible = shuffleFourthPhase(
    eligible.filter((card) => card.driveAct !== act && !installedIds.has(card.id)),
    mulberry32(stringSeed(`fourth-phase-drive-flex:${seed}:${driveIndex}`)),
  );
  const featured = [...installed, ...spotlight].slice(0, Math.max(0, spotlightCount));
  const featuredIds = new Set(featured.map((card) => card.id));
  const remainder = shuffleFourthPhase(
    [...installed, ...spotlight, ...flexible].filter((card) => !featuredIds.has(card.id)),
    mulberry32(stringSeed(`fourth-phase-drive-rest:${seed}:${driveIndex}`)),
  );
  return [...featured, ...remainder];
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
  if (boss === 'fieldPositionWar') return 'answers Touchback Machine';
  if (boss === 'noFlyZone') return 'answers No-Fly Zone';
  if (boss === 'stackedBox') return 'answers Stacked Box';
  if (boss === 'turnoverDrill') return 'answers Ball Security';
  if (boss === 'adaptiveDc') return 'answers Got Your Number';
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

function offerTagsForCard(card: FourthPhaseCard, team: FourthPhaseTeamKey, boss: FourthPhaseBossKey): string[] {
  const tags = [`${PHASE_SHORT[card.phase]} ${PHASE_JOB[card.phase]}`, FOURTH_PHASE_DRIVE_ACT_LABEL[card.driveAct]];
  if (team === 'airRaid' && card.phase === 'offense' && card.tags.includes('kind:pass')) tags.unshift('team identity');
  if (team === 'smashmouth' && card.phase === 'offense' && card.tags.includes('kind:run')) tags.unshift('team identity');
  if (team === 'blackAndBlue' && card.phase === 'defense') tags.unshift('team identity');
  if (team === 'loudHouse' && card.phase === 'crowd') tags.unshift('team identity');
  if (team === 'specialTeamsChaos' && card.phase === 'specialTeams') tags.unshift('team identity');
  if (boss === 'stackedBox' && card.phase !== 'offense') tags.unshift('boss answer');
  if (boss === 'noFlyZone' && card.phase !== 'offense') tags.unshift('boss answer');
  if (boss === 'roadGame' && card.phase !== 'crowd') tags.unshift('boss answer');
  if (boss === 'turnoverDrill' && card.phase !== 'defense') tags.unshift('boss answer');
  if (boss === 'fieldPositionWar' && card.phase !== 'specialTeams') tags.unshift('boss answer');
  if (boss === 'preventDefense' && !card.tags.includes('kind:shot')) tags.unshift('boss answer');
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

const BOSS_PREFERRED_PRACTICE: Partial<Record<FourthPhaseBossKey, SituationKey[]>> = {
  roadGame: ['houseCall', 'blackout'],
  fieldPositionWar: ['drive', 'houseCall'],
  noFlyZone: ['fieldFlip', 'pickSix'],
  stackedBox: ['fieldFlip', 'stand'],
  turnoverDrill: ['drive', 'houseCall'],
  adaptiveDc: ['complementaryFootball', 'momentumShift'],
  preventDefense: ['drive', 'fieldFlip'],
};

/** The guaranteed pre-boss drill: the first boss-preferred situation with room to grow. */
function scoutedPracticeKeyFor(nextBoss: FourthPhaseBossKey, practice: FourthPhasePracticeBook): SituationKey | null {
  return (BOSS_PREFERRED_PRACTICE[nextBoss] ?? []).find((key) => (practice[key] ?? 0) < 3) ?? null;
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
  const pool = [...(BOSS_PREFERRED_PRACTICE[boss] ?? []), ...(preferred[team] ?? []), ...PRACTICE_KEYS]
    .filter((key, index, all) => all.indexOf(key) === index)
    .filter((key) => (practice[key] ?? 0) < 3);
  if (!pool.length) return 'houseCall';
  const rng = mulberry32(stringSeed(`fourth-phase-practice:${seed}:${driveIndex}:${reroll}:${team}:${boss}`));
  return pool[Math.floor(rng() * pool.length)];
}

// Concrete numbers only — this string is the shop's promise, so it must mirror
// applyPracticeBonus in engine.ts exactly (+5 Yards / +0.03 Exec per level;
// +0.12 BP per level on cashing situations, +0.05 otherwise; utility packages
// for Field Flip and Crowd Surge).
function practiceDrillDetail(situation: SituationKey, level: number): string {
  if (situation === 'fieldFlip') {
    return `Level ${level}: Field Flip also pays +${level} draw and +$${level * 2}.`;
  }
  if (situation === 'blackout') {
    return `Level ${level}: Crowd Surge also charges +${(level * 0.15).toFixed(2)} momentum.`;
  }
  const cashes = situation === 'houseCall' || situation === 'complementaryFootball';
  const bigPlay = level * (cashes ? 0.12 : 0.05);
  return `Level ${level}: ${SITUATION_LABELS[situation]} gains +${level * 5} Yards, +${(level * 0.03).toFixed(2)} Leverage, +${bigPlay.toFixed(2)} Explosive.`;
}

/** Jokers the coach considers a legitimate response lane to the named boss. */
function bossAnswerJokerIds(boss: FourthPhaseBossKey): readonly FourthPhaseJokerId[] {
  if (boss === 'none') return [];
  const generalists: FourthPhaseJokerId[] = ['closer', 'pressBoxAngle', 'redZonePackage'];
  return boss === 'roadGame' ? ['roadWarriors', 'homeCooking', 'sustainedDrive', ...generalists] : generalists;
}

/**
 * The defense's halftime adjustment target: the situation the player leaned on
 * most in Drive 1. The Checkdown stays exempt (it is the taught safety valve)
 * and busts are already punished. Deterministic — the repeat book's insertion
 * order is play order, so ties break toward the earlier-established call.
 */
export function halftimeCounterFor(repeated: Partial<Record<SituationKey, number>>): SituationKey | null {
  let best: SituationKey | null = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(repeated) as [SituationKey, number][]) {
    if (key === 'checkdown' || key === 'bustedPlay') continue;
    if ((count ?? 0) > bestCount) {
      best = key;
      bestCount = count ?? 0;
    }
  }
  return bestCount >= 1 ? best : null;
}

export function generateFourthPhaseWarRoomOffers(
  owned: readonly FourthPhaseJokerState[],
  seed: number,
  driveIndex: number,
  team: FourthPhaseTeamKey,
  boss: FourthPhaseBossKey,
  reroll = 0,
  practice: FourthPhasePracticeBook = {},
  /** The boss actually taking the field NEXT drive; triggers the SCOUTED guarantee. */
  nextBoss: FourthPhaseBossKey = 'none',
  /** The mutable game-plan deck; reserve offers are selected from its missing inserts. */
  activeCards: readonly FourthPhaseCard[] = prepareFourthPhaseTeamDeck(team),
): FourthPhaseWarRoomOffer[] {
  const ownedIds = new Set(owned.map((joker) => joker.id));
  const pool = FOURTH_PHASE_JOKER_POOL.filter((joker) => !ownedIds.has(joker.id));
  const ordered = shuffleFourthPhase(pool, mulberry32(stringSeed(`fourth-phase-offers:${seed}:${driveIndex}:${owned.length}:${reroll}`)));
  // Price by rarity so a buy is a tradeoff with a story, not a flat menu: a
  // legendary you can only afford because you banked last drive's skip is a
  // decision the player remembers. Discount tokens still floor at $1.
  const offerFor = (def: (typeof ordered)[number]): FourthPhaseWarRoomOffer => ({
    id: `joker:${def.id}`,
    kind: 'joker',
    cost: def.rarity === 'legendary' ? 6 : def.rarity === 'rare' ? 5 : 4,
    label: def.name,
    detail: def.effect,
    tags: offerTagsForJoker(def.id, team, boss),
    joker: { id: def.id },
  });
  const jokerOffers = ordered.slice(0, 1).map(offerFor);
  const reserve = shuffleFourthPhase(
    fourthPhaseReserveCards(team, activeCards),
    mulberry32(stringSeed(`fourth-phase-card-offers:${seed}:${driveIndex}:${reroll}:${activeCards.length}`)),
  );
  const nextAct = fourthPhaseDriveAct(driveIndex + 1);
  const actMatch = reserve.find((card) => card.driveAct === nextAct);
  const selectedReserve = [actMatch, ...reserve.filter((card) => card.id !== actMatch?.id)].filter(
    (card): card is FourthPhaseCard => Boolean(card),
  ).slice(0, 2);
  const cardOffers: FourthPhaseWarRoomOffer[] = selectedReserve.map((reserveCard) => {
    const card: FourthPhaseCard = {
      ...reserveCard,
      value: reserveCard.value + FOURTH_PHASE_INSTALL_STRENGTH,
      installed: true,
      tags: [...reserveCard.tags, 'warRoom:installed'],
    };
    const chips = cardPlayChips(card);
    return {
      id: `card:${card.id}`,
      kind: 'card',
      cost: card.tier === 'franchise' || card.tier === 'playmaker' ? 5 : card.tier === 'captain' || card.tier === 'scheme' ? 4 : 3,
      label: card.roleName,
      detail: `COACHED UP: +${FOURTH_PHASE_INSTALL_STRENGTH} call strength, +${FOURTH_PHASE_INSTALL_LEVERAGE.toFixed(2)} Leverage${card.phase === 'crowd' ? `, +${FOURTH_PHASE_INSTALL_CROWD_CHARGE.toFixed(1)} momentum` : ''}. ${cardContributionLabel(card)}${chips.length ? ` • ${chips.join(' + ')}` : ''}.`,
      tags: offerTagsForCard(card, team, boss),
      card,
    };
  });
  // The coach names next drive's problem before the offers appear; the shop
  // must never shrug at it. Pre-boss drafts guarantee a response lane through
  // the practice drill (a plan, not a power spike — guaranteeing the premium
  // boss jokers blew the win-rate gates). Jokers that happen to answer the
  // boss still earn the SCOUTED tag when the seed deals them naturally.
  const answerIds = bossAnswerJokerIds(nextBoss);
  if (answerIds.length) {
    const scouted = jokerOffers.find((offer) => Boolean(offer.joker && (answerIds as readonly string[]).includes(offer.joker.id)));
    if (scouted) scouted.tags = [...new Set(['SCOUTED', ...scouted.tags])].slice(0, 3);
  }
  const scoutedDrill = nextBoss !== 'none' ? scoutedPracticeKeyFor(nextBoss, practice) : null;
  const situation = scoutedDrill ?? practiceKeyFor(team, boss, seed, driveIndex, reroll, practice);
  const level = (practice[situation] ?? 0) + 1;
  const drill: FourthPhaseWarRoomOffer = {
    id: `practice:${situation}:${level}`,
    kind: 'practice',
    cost: 3,
    label: `${SITUATION_LABELS[situation]} Drill`,
    detail: practiceDrillDetail(situation, level),
    tags: scoutedDrill
      ? [...new Set(['SCOUTED', ...practiceTags(situation, team, boss)])].slice(0, 3)
      : practiceTags(situation, team, boss),
    situation,
  };
  return [...cardOffers, ...jokerOffers, drill];
}

export function activeBossForDrive(run: Pick<FourthPhaseRunSeed, 'boss'>, driveIndex: number, bossFromDrive = 2): FourthPhaseBossKey {
  return driveIndex >= bossFromDrive ? run.boss : 'none';
}
