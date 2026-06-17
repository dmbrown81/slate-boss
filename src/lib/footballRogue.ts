// Football Card Rogue — first playable engine slice.
//
// Concept: a "card" is a football ACTION (Deep Ball, Power Run, Deep Catch,
// Interception...) whose value is weighted by the source player's archetype.
// Each quarter you assemble a "play" (drive) from cards in hand. Scoring is
// deterministic — Base x Mult — so the player feels full agency. The variance
// lives in the DRAW (do you hold the cards to complete the stack?), not in dice.
//
// This module is intentionally standalone from the classic sim / rogueScoring.

import { PLAYER_TEMPLATES, type PlayerTemplate } from './seedData';

// ── Tunables (balance lives here) ──────────────────────────────────────────
export const HAND_SIZE = 8;
export const QUARTERS = 4;
export const AUDIBLES = 2;
export const DEFAULT_TARGET = 700;
export const MAX_PLAY_CARDS = 4;

// ── Card model ─────────────────────────────────────────────────────────────
export type FbPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
export type FbSide = 'pass' | 'run' | 'catch' | 'kick' | 'defense';
export type FbActionType =
  | 'deep_pass' | 'short_pass' | 'scramble' | 'qb_sneak'
  | 'power_run' | 'breakaway_run'
  | 'deep_catch' | 'short_catch' | 'checkdown_catch'
  | 'field_goal' | 'extra_point'
  | 'sack' | 'interception' | 'return_td';

export interface FbCard {
  id: string;          // unique instance id
  playerId: string;    // source player (for stack matching)
  playerName: string;
  team: string;
  position: FbPosition;
  action: FbActionType;
  label: string;       // display name, e.g. "Deep Ball"
  side: FbSide;
  value: number;       // base "chips"
}

export type FbCoordinatorKey = 'air_raid';

export interface FbCoordinator {
  key: FbCoordinatorKey;
  name: string;
  description: string;
}

export const FB_COORDINATORS: Record<FbCoordinatorKey, FbCoordinator> = {
  air_raid: {
    key: 'air_raid',
    name: 'Air Raid Coordinator',
    description: 'QB stack plays get an extra multiplier.',
  },
};

// ── Environments (per-match modifier) ───────────────────────────────────────
export type FbEnvironmentKey = 'clear' | 'dome' | 'snow' | 'wind' | 'primetime';

export interface FbEnvironment {
  key: FbEnvironmentKey;
  label: string;
  description: string;
}

export const FB_ENVIRONMENTS: Record<FbEnvironmentKey, FbEnvironment> = {
  clear: { key: 'clear', label: '☀️ Clear Skies', description: 'No weather effects. Play it straight.' },
  dome: { key: 'dome', label: '🏟️ Dome', description: 'Passing plays score +15% base.' },
  snow: { key: 'snow', label: '❄️ Snow Game', description: 'Passing −20% base, ground game +20% base.' },
  wind: { key: 'wind', label: '🌬️ Wind Tunnel', description: 'Deep passing plays lose multiplier.' },
  primetime: { key: 'primetime', label: '🌙 Primetime', description: 'Chaos: every play +0.2 mult, but the target is higher.' },
};

export const FB_ENVIRONMENT_KEYS: FbEnvironmentKey[] = ['clear', 'dome', 'snow', 'wind', 'primetime'];

// ── Ledger / result ─────────────────────────────────────────────────────────
export type FbLedgerKind = 'base' | 'synergy' | 'coordinator' | 'environment' | 'final';

export interface FbLedgerEntry {
  id: string;
  kind: FbLedgerKind;
  label: string;
  detail: string;
  baseDelta?: number;
  multAdd?: number;
  baseFactor?: number;
}

export interface FbPlayResult {
  valid: boolean;
  reason?: string;     // why a selection is not a legal play
  playName: string;
  flavor: string;
  base: number;
  mult: number;
  total: number;
  ledger: FbLedgerEntry[];
}

// ── Card factory ────────────────────────────────────────────────────────────
const r = Math.round;

function actionLabel(action: FbActionType): string {
  switch (action) {
    case 'deep_pass': return 'Deep Ball';
    case 'short_pass': return 'Quick Pass';
    case 'scramble': return 'Scramble';
    case 'qb_sneak': return 'QB Sneak';
    case 'power_run': return 'Power Run';
    case 'breakaway_run': return 'Breakaway';
    case 'deep_catch': return 'Deep Catch';
    case 'short_catch': return 'Quick Catch';
    case 'checkdown_catch': return 'Checkdown';
    case 'field_goal': return 'Field Goal';
    case 'extra_point': return 'Extra Point';
    case 'sack': return 'Sack';
    case 'interception': return 'Interception';
    case 'return_td': return 'Return TD';
  }
}

function sideOf(action: FbActionType): FbSide {
  if (action === 'deep_pass' || action === 'short_pass') return 'pass';
  if (action === 'scramble' || action === 'qb_sneak' || action === 'power_run' || action === 'breakaway_run') return 'run';
  if (action === 'deep_catch' || action === 'short_catch' || action === 'checkdown_catch') return 'catch';
  if (action === 'field_goal' || action === 'extra_point') return 'kick';
  return 'defense';
}

let cardCounter = 0;
function makeCard(t: PlayerTemplate, action: FbActionType, value: number): FbCard {
  cardCounter += 1;
  return {
    id: `${t.id}-${action}-${cardCounter}`,
    playerId: t.id,
    playerName: t.name,
    team: t.team,
    position: t.position === 'DST' ? 'DST' : (t.position as FbPosition),
    action,
    label: actionLabel(action),
    side: sideOf(action),
    value: r(value),
  };
}

// Each player contributes a small bundle of action cards, weighted by archetype.
function cardsForPlayer(t: PlayerTemplate): FbCard[] {
  const proj = t.baseProjection;
  const ceil = t.baseCeiling;
  const out: FbCard[] = [];

  switch (t.archetype) {
    case 'pocket_qb':
      out.push(makeCard(t, 'deep_pass', ceil * 1.5));
      out.push(makeCard(t, 'short_pass', proj * 2.4));
      out.push(makeCard(t, 'short_pass', proj * 2.2));
      out.push(makeCard(t, 'scramble', ceil * 0.7));
      break;
    case 'rushing_qb':
      out.push(makeCard(t, 'deep_pass', ceil * 1.3));
      out.push(makeCard(t, 'short_pass', proj * 2.0));
      out.push(makeCard(t, 'scramble', ceil * 1.1));
      out.push(makeCard(t, 'qb_sneak', 42));
      break;
    case 'workhorse_rb':
      out.push(makeCard(t, 'power_run', proj * 2.8));
      out.push(makeCard(t, 'power_run', proj * 2.4));
      out.push(makeCard(t, 'breakaway_run', ceil * 1.8));
      out.push(makeCard(t, 'checkdown_catch', proj * 1.4));
      break;
    case 'pass_catching_rb':
      out.push(makeCard(t, 'power_run', proj * 2.0));
      out.push(makeCard(t, 'checkdown_catch', proj * 2.4));
      out.push(makeCard(t, 'breakaway_run', ceil * 1.6));
      break;
    case 'alpha_wr':
      out.push(makeCard(t, 'short_catch', proj * 2.8));
      out.push(makeCard(t, 'deep_catch', ceil * 2.0));
      out.push(makeCard(t, 'deep_catch', ceil * 1.8));
      break;
    case 'boom_bust_wr':
      out.push(makeCard(t, 'deep_catch', ceil * 2.1));
      out.push(makeCard(t, 'deep_catch', ceil * 1.9));
      out.push(makeCard(t, 'short_catch', proj * 1.8));
      break;
    case 'possession_wr':
      out.push(makeCard(t, 'short_catch', proj * 2.8));
      out.push(makeCard(t, 'short_catch', proj * 2.5));
      break;
    case 'slot_wr':
      out.push(makeCard(t, 'short_catch', proj * 2.6));
      out.push(makeCard(t, 'checkdown_catch', proj * 2.0));
      break;
    case 'redzone_te':
      out.push(makeCard(t, 'deep_catch', ceil * 1.9));
      out.push(makeCard(t, 'short_catch', proj * 2.4));
      break;
    case 'punt_te':
      out.push(makeCard(t, 'short_catch', proj * 2.2));
      break;
    case 'strong_dst':
      out.push(makeCard(t, 'sack', 40));
      out.push(makeCard(t, 'interception', 78));
      break;
    case 'risky_dst':
      out.push(makeCard(t, 'interception', 72));
      out.push(makeCard(t, 'return_td', 135));
      break;
  }
  return out;
}

function kickerCards(team: string): FbCard[] {
  const fakeKicker: PlayerTemplate = {
    id: `${team.toLowerCase()}_k`, name: `${team} K`, team, position: 'WR',
    archetype: 'possession_wr', baseSalary: 0, baseProjection: 0, baseFloor: 0,
    baseCeiling: 0, baseVolatility: 0, baseBoomChance: 0, baseOwnership: 0,
  };
  return [
    { ...makeCard(fakeKicker, 'field_goal', 55), position: 'K' },
    { ...makeCard(fakeKicker, 'field_goal', 55), position: 'K' },
    { ...makeCard(fakeKicker, 'extra_point', 22), position: 'K' },
  ];
}

export interface FbDeckInfo {
  teamId: string;
  teamName: string;
  opponentId: string;
  cards: FbCard[];
}

// Starter deck: Ironhawks offense + defense, a few Blazers pass-catchers for
// bring-back potential, plus kicker cards.
export function buildStarterDeck(): FbDeckInfo {
  const homeId = 'IRN';
  const oppId = 'BLZ';
  const home = PLAYER_TEMPLATES.filter((t) => t.team === homeId);
  const bringBack = PLAYER_TEMPLATES.filter(
    (t) => t.team === oppId && (t.position === 'WR' || t.position === 'TE'),
  ).slice(0, 3);

  const cards: FbCard[] = [];
  home.forEach((t) => cards.push(...cardsForPlayer(t)));
  bringBack.forEach((t) => cards.push(...cardsForPlayer(t)));
  cards.push(...kickerCards(homeId));

  return { teamId: homeId, teamName: 'Ironhawks', opponentId: oppId, cards };
}

// ── Play scoring (the heart) ────────────────────────────────────────────────
interface ScoreOpts {
  coordinators?: FbCoordinatorKey[];
  environment?: FbEnvironmentKey;
}

function blank(): FbPlayResult {
  return { valid: false, playName: '—', flavor: 'Select cards to call a play.', base: 0, mult: 1, total: 0, ledger: [] };
}

export function scoreFootballPlay(cards: FbCard[], opts: ScoreOpts = {}): FbPlayResult {
  if (cards.length === 0) return blank();

  const coordinators = new Set(opts.coordinators ?? []);
  const env = opts.environment ?? 'clear';

  const passCards = cards.filter((c) => c.side === 'pass');
  const catches = cards.filter((c) => c.side === 'catch');
  const runs = cards.filter((c) => c.action === 'power_run' || c.action === 'breakaway_run');
  const qbRuns = cards.filter((c) => c.action === 'scramble' || c.action === 'qb_sneak');
  const kicks = cards.filter((c) => c.side === 'kick');
  const defense = cards.filter((c) => c.side === 'defense');

  let base = cards.reduce((s, c) => s + c.value, 0);
  let mult = 1;
  const ledger: FbLedgerEntry[] = [{
    id: 'base', kind: 'base', label: 'Base Yards', detail: `${cards.length} card${cards.length === 1 ? '' : 's'} on the play.`,
  }];

  let playName = 'Busted Play';
  let flavor = 'No real concept — these cards do not combine.';
  let deepInvolved = false;
  let isPassPlay = false;

  const qbTeam = passCards[0]?.team;
  const sameTeamCatches = qbTeam ? catches.filter((c) => c.team === qbTeam) : [];
  const oppCatches = qbTeam ? catches.filter((c) => c.team !== qbTeam) : [];

  if (defense.length > 0) {
    // Defensive scoring play
    if (defense.some((c) => c.action === 'return_td')) {
      playName = 'Pick Six';
      flavor = 'Defense takes it to the house.';
      mult += 0.6;
      ledger.push({ id: 'pick6', kind: 'synergy', label: 'Pick Six', detail: 'Return touchdown swings the game.', multAdd: 0.6 });
    } else if (defense.some((c) => c.action === 'interception')) {
      playName = 'Takeaway';
      flavor = 'A turnover flips the field.';
      mult += 0.25;
      ledger.push({ id: 'takeaway', kind: 'synergy', label: 'Takeaway', detail: 'Interception adds momentum.', multAdd: 0.25 });
    } else {
      playName = 'Sack';
      flavor = 'Get to the quarterback.';
    }
  } else if (passCards.length > 0 && sameTeamCatches.length > 0) {
    isPassPlay = true;
    deepInvolved = passCards.some((c) => c.action === 'deep_pass') || sameTeamCatches.some((c) => c.action === 'deep_catch');
    if (sameTeamCatches.length >= 2) {
      playName = 'Double-Stack Bomb';
      flavor = `${passCards[0].playerName} hits ${sameTeamCatches.length} targets.`;
      mult += 1.2;
      ledger.push({ id: 'double_stack', kind: 'synergy', label: 'Double Stack', detail: 'QB paired with multiple same-team receivers.', multAdd: 1.2 });
    } else {
      playName = 'Stack TD';
      flavor = `${passCards[0].playerName} → ${sameTeamCatches[0].playerName}.`;
      mult += 0.6;
      ledger.push({ id: 'single_stack', kind: 'synergy', label: 'QB Stack', detail: 'QB paired with a same-team receiver.', multAdd: 0.6 });
    }
    if (deepInvolved) {
      mult += 0.3;
      ledger.push({ id: 'redzone', kind: 'synergy', label: 'Shot Play', detail: 'A deep shot adds explosive upside.', multAdd: 0.3 });
    }
    if (oppCatches.length > 0) {
      mult += 0.4;
      playName = 'Shootout Stack';
      flavor = 'Bring-back correlation — both sides scoring.';
      ledger.push({ id: 'bring_back', kind: 'synergy', label: 'Bring-Back', detail: 'Opponent pass-catcher completes the shootout.', multAdd: 0.4 });
    }
  } else if (passCards.length > 0 && cards.every((c) => c.side === 'pass' || c.action === 'checkdown_catch')) {
    playName = 'Checkdown';
    flavor = 'Safe, short, keeps the chains moving.';
  } else if (runs.length >= 2) {
    playName = 'Ground & Pound';
    flavor = 'Pound the rock — high floor.';
    mult += 0.4;
    ledger.push({ id: 'ground', kind: 'synergy', label: 'Ground & Pound', detail: 'Stacked run game grinds it out.', multAdd: 0.4 });
  } else if (runs.length === 1) {
    playName = 'Designed Run';
    flavor = 'One carry, one read.';
  } else if (qbRuns.length > 0 && passCards.length === 0 && catches.length === 0) {
    playName = 'QB Keeper';
    flavor = 'The quarterback tucks and runs.';
  } else if (kicks.length > 0 && cards.every((c) => c.side === 'kick')) {
    playName = kicks.some((c) => c.action === 'field_goal') ? 'Field Goal' : 'Extra Point';
    flavor = 'Reliable points on the board.';
  }

  // Coordinator: Air Raid boosts stack plays
  if (coordinators.has('air_raid') && isPassPlay) {
    mult += 0.5;
    ledger.push({ id: 'air_raid', kind: 'coordinator', label: 'Air Raid Coordinator', detail: 'Stack play gets the coordinator multiplier.', multAdd: 0.5 });
  }

  // Busted play penalty — discourage random card dumps
  if (playName === 'Busted Play') {
    mult = 0.5;
    ledger.push({ id: 'busted', kind: 'synergy', label: 'No Concept', detail: 'Mismatched cards — half value.', multAdd: -0.5 });
  }

  // Environment
  let envBaseFactor = 1;
  if (env === 'dome' && isPassPlay) envBaseFactor = 1.15;
  if (env === 'snow') envBaseFactor = isPassPlay ? 0.8 : (runs.length > 0 ? 1.2 : 1);
  if (env === 'wind' && isPassPlay && deepInvolved) mult = Math.max(1, mult - 0.5);
  if (env === 'primetime') mult += 0.2;
  if (envBaseFactor !== 1) {
    base = base * envBaseFactor;
    ledger.push({ id: 'env', kind: 'environment', label: FB_ENVIRONMENTS[env].label, detail: FB_ENVIRONMENTS[env].description, baseFactor: envBaseFactor });
  } else if ((env === 'wind' || env === 'primetime') && (isPassPlay || env === 'primetime')) {
    ledger.push({ id: 'env', kind: 'environment', label: FB_ENVIRONMENTS[env].label, detail: FB_ENVIRONMENTS[env].description });
  }

  const total = Math.max(0, Math.floor(base * mult));
  ledger.push({ id: 'final', kind: 'final', label: 'Play Total', detail: `${r(base)} base × ${round2(mult)} mult.` });

  return {
    valid: playName !== 'Busted Play',
    playName,
    flavor,
    base: r(base),
    mult: round2(mult),
    total,
    ledger,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Deck helpers ────────────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function targetForEnvironment(env: FbEnvironmentKey): number {
  return env === 'primetime' ? Math.round(DEFAULT_TARGET * 1.25) : DEFAULT_TARGET;
}

export function randomEnvironment(): FbEnvironmentKey {
  return FB_ENVIRONMENT_KEYS[Math.floor(Math.random() * FB_ENVIRONMENT_KEYS.length)];
}
