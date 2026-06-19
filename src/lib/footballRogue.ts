// Football Card Rogue — core engine (refactor slice).
//
// A "card" is a football ACTION (Deep Ball, Power Run, Deep Catch, Interception)
// whose value is weighted by the source player's archetype. You assemble a
// "play" from cards in hand. Scoring is deterministic and split into THREE
// visible channels so no single play trivializes a target:
//
//     drivePoints = base × (1 + execution) × bigPlay
//       base      = card yards + base-feeding coordinators        (the fuel)
//       execution = clean-concept flat bonuses                    (reliable)
//       bigPlay   = elite synergies + scaling coordinators        (exponential)
//
// Resource model = Play Budget (a salary cap, the DFS soul): every card has a
// cap cost; you call as many plays per drive as you can afford. A match is 3
// drives with escalating targets. Variance lives in the draw, never in a roll.

import { PLAYER_TEMPLATES, type PlayerTemplate } from './seedData';

// ── Tunables (balance lives here) ──────────────────────────────────────────
export const HAND_SIZE = 8;
export const DRIVES_PER_MATCH = 3;
export const AUDIBLES_PER_DRIVE = 3;
export const MAX_PLAY_CARDS = 4;
export const DRIVE_BUDGET = [24, 26, 28];            // cap credits per drive (affords ~3-4 plays)
export const DRIVE_TARGET = [700, 880, 1120];        // game-1 drive targets (escalate across the season)

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
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  position: FbPosition;
  action: FbActionType;
  label: string;
  side: FbSide;
  value: number;   // base yards
  cost: number;    // cap credits to play
}

export type FbConceptKey =
  | 'double_stack_bomb' | 'shootout_stack' | 'stack_td' | 'checkdown'
  | 'ground_pound' | 'designed_run' | 'qb_keeper'
  | 'field_goal' | 'extra_point'
  | 'pick_six' | 'takeaway' | 'sack' | 'busted_play';

// ── Coordinators (scaling "jokers") ─────────────────────────────────────────
export type FbCoordinatorKey =
  | 'air_raid' | 'bell_cow' | 'salary_wizard'
  | 'franchise_qb' | 'west_coast' | 'ball_hawk';

export interface FbCoordinator {
  key: FbCoordinatorKey;
  name: string;
  channel: 'base' | 'execution' | 'big_play';
  scaling: 'within_game' | 'season' | 'flat';
  description: string;
}

export const FB_COORDINATORS: Record<FbCoordinatorKey, FbCoordinator> = {
  air_raid: {
    key: 'air_raid', name: 'Air Raid Coordinator', channel: 'execution', scaling: 'within_game',
    description: '+0.25 Execution on stack plays for every stack you have already completed this match.',
  },
  bell_cow: {
    key: 'bell_cow', name: 'Bell Cow', channel: 'base', scaling: 'within_game',
    description: '+8 Base per run card, and +6 permanent Base each time you call Ground & Pound this match.',
  },
  salary_wizard: {
    key: 'salary_wizard', name: 'Salary Wizard', channel: 'base', scaling: 'flat',
    description: 'Cheap cards (cost 1) add +12 Base before multipliers.',
  },
  franchise_qb: {
    key: 'franchise_qb', name: 'Franchise QB', channel: 'big_play', scaling: 'season',
    description: '+0.2 Big Play on every play for each earlier game in which you landed a Bomb.',
  },
  west_coast: {
    key: 'west_coast', name: 'West Coast Guru', channel: 'execution', scaling: 'flat',
    description: 'Short passing — Checkdowns and quick passes gain +0.3 Execution.',
  },
  ball_hawk: {
    key: 'ball_hawk', name: 'Ball-Hawk DC', channel: 'big_play', scaling: 'flat',
    description: 'Defensive plays (Sack, Takeaway, Pick Six) gain ×1.3 Big Play.',
  },
};

export const STARTER_COORDINATORS: FbCoordinatorKey[] = ['air_raid', 'bell_cow'];
export const MAX_COORDINATORS = 5;

// Run-level "Game Plan": commit to a concept and level it (Planet-card analog).
// Each level adds flat Base/Execution; committing PAST level 1 adds a growing
// Big Play (X-mult) — so concentrating levels on one concept compounds, while
// spreading them stays flat. This is the early-flat → late-multiplicative pivot.
export type FbPlaybook = Partial<Record<FbConceptKey, number>>; // concept -> level

export const GAME_PLAN_STEP: Partial<Record<FbConceptKey, { base: number; exec: number }>> = {
  double_stack_bomb: { base: 0, exec: 0.26 },
  stack_td: { base: 0, exec: 0.22 },
  shootout_stack: { base: 0, exec: 0.24 },
  ground_pound: { base: 48, exec: 0.05 },
  checkdown: { base: 30, exec: 0.12 },
  field_goal: { base: 58, exec: 0 },
  pick_six: { base: 0, exec: 0.3 },
  takeaway: { base: 0, exec: 0.18 },
};
export const GAME_PLAN_COMMIT_XMULT = 0.13; // Big Play added per level beyond 1

// ── Environments (per-match modifier) ───────────────────────────────────────
export type FbEnvironmentKey = 'clear' | 'dome' | 'snow' | 'wind' | 'primetime';

export interface FbEnvironment { key: FbEnvironmentKey; label: string; description: string; }

export const FB_ENVIRONMENTS: Record<FbEnvironmentKey, FbEnvironment> = {
  clear: { key: 'clear', label: '☀️ Clear Skies', description: 'No weather effects.' },
  dome: { key: 'dome', label: '🏟️ Dome', description: 'Passing plays score +15% Base.' },
  snow: { key: 'snow', label: '❄️ Snow Game', description: 'Passing −20% Base, ground game +20% Base.' },
  wind: { key: 'wind', label: '🌬️ Wind Tunnel', description: 'Deep passing loses its Big Play bonus.' },
  primetime: { key: 'primetime', label: '🌙 Primetime', description: 'Chaos: +0.2 Big Play on every play, but targets are higher.' },
};

export const FB_ENVIRONMENT_KEYS: FbEnvironmentKey[] = ['clear', 'dome', 'snow', 'wind', 'primetime'];

// ── Scoring context + result ────────────────────────────────────────────────
export interface FbScoreContext {
  coordinators: FbCoordinatorKey[];
  environment: FbEnvironmentKey;
  stacksThisMatch: number;                       // for Air Raid scaling
  groundBonusThisMatch: number;                  // accumulated Bell Cow base
  conceptCountsThisDrive: Partial<Record<FbConceptKey, number>>; // anti-spam
  playbook?: FbPlaybook;                          // run-level concept upgrades
  bombGames?: number;                            // earlier games with a Bomb (Franchise QB)
}

export type FbLedgerKind = 'base' | 'execution' | 'big_play' | 'coordinator' | 'environment' | 'spam' | 'final';

export interface FbLedgerEntry {
  id: string;
  kind: FbLedgerKind;
  label: string;
  detail: string;
}

export interface FbPlayResult {
  valid: boolean;
  concept: FbConceptKey;
  playName: string;
  flavor: string;
  base: number;
  execution: number;  // flat mult, e.g. 0.6
  bigPlay: number;    // x mult, e.g. 1.8
  total: number;
  cost: number;
  ledger: FbLedgerEntry[];
}

// ── Card factory ────────────────────────────────────────────────────────────
const r = Math.round;
const round2 = (n: number) => Math.round(n * 100) / 100;

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

// Cap cost: salary tier of the source player (the DFS soul), with overrides
// for kicking/defense actions whose value is independent of salary.
function costFor(t: PlayerTemplate, action: FbActionType): number {
  if (action === 'field_goal') return 2;
  if (action === 'extra_point') return 1;
  if (action === 'sack') return 2;
  if (action === 'interception') return 3;
  if (action === 'return_td') return 4;
  const s = t.baseSalary;
  if (s > 8000) return 4;
  if (s > 6000) return 3;
  if (s > 4000) return 2;
  return 1;
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
    cost: costFor(t, action),
  };
}

function cardsForPlayer(t: PlayerTemplate): FbCard[] {
  const proj = t.baseProjection;
  const ceil = t.baseCeiling;
  const out: FbCard[] = [];
  switch (t.archetype) {
    // QB is the only passer, so it carries plenty of pass cards — a pass play
    // needs a QB pass card in hand to connect with your catch cards.
    case 'pocket_qb':
      out.push(
        makeCard(t, 'deep_pass', ceil * 1.5), makeCard(t, 'deep_pass', ceil * 1.3),
        makeCard(t, 'short_pass', proj * 2.4), makeCard(t, 'short_pass', proj * 2.2),
        makeCard(t, 'short_pass', proj * 2.0), makeCard(t, 'scramble', ceil * 0.7),
      );
      break;
    case 'rushing_qb':
      out.push(
        makeCard(t, 'deep_pass', ceil * 1.3), makeCard(t, 'short_pass', proj * 2.0),
        makeCard(t, 'short_pass', proj * 1.9), makeCard(t, 'scramble', ceil * 1.1),
        makeCard(t, 'qb_sneak', 42),
      );
      break;
    case 'workhorse_rb':
      out.push(makeCard(t, 'power_run', proj * 2.8), makeCard(t, 'power_run', proj * 2.4), makeCard(t, 'breakaway_run', ceil * 1.8), makeCard(t, 'checkdown_catch', proj * 1.4));
      break;
    case 'pass_catching_rb':
      out.push(makeCard(t, 'power_run', proj * 2.0), makeCard(t, 'checkdown_catch', proj * 2.4), makeCard(t, 'breakaway_run', ceil * 1.6));
      break;
    case 'alpha_wr':
      out.push(makeCard(t, 'short_catch', proj * 2.8), makeCard(t, 'deep_catch', ceil * 2.0));
      break;
    case 'boom_bust_wr':
      out.push(makeCard(t, 'deep_catch', ceil * 2.1), makeCard(t, 'short_catch', proj * 1.8));
      break;
    case 'possession_wr':
      out.push(makeCard(t, 'short_catch', proj * 2.8));
      break;
    case 'slot_wr':
      out.push(makeCard(t, 'short_catch', proj * 2.6));
      break;
    case 'redzone_te':
      out.push(makeCard(t, 'deep_catch', ceil * 1.9), makeCard(t, 'short_catch', proj * 2.4));
      break;
    case 'punt_te':
      out.push(makeCard(t, 'short_catch', proj * 2.2));
      break;
    case 'strong_dst':
      out.push(makeCard(t, 'sack', 40), makeCard(t, 'interception', 78));
      break;
    case 'risky_dst':
      out.push(makeCard(t, 'interception', 72), makeCard(t, 'return_td', 135));
      break;
  }
  return out;
}

function kickerCards(team: string): FbCard[] {
  const k: PlayerTemplate = {
    id: `${team.toLowerCase()}_k`, name: `${team} K`, team, position: 'WR',
    archetype: 'possession_wr', baseSalary: 0, baseProjection: 0, baseFloor: 0,
    baseCeiling: 0, baseVolatility: 0, baseBoomChance: 0, baseOwnership: 0,
  };
  return [
    { ...makeCard(k, 'field_goal', 55), position: 'K' },
    { ...makeCard(k, 'field_goal', 55), position: 'K' },
    { ...makeCard(k, 'extra_point', 22), position: 'K' },
  ];
}

export interface FbDeckInfo { teamId: string; teamName: string; opponentId: string; cards: FbCard[]; }

export function buildStarterDeck(): FbDeckInfo {
  const homeId = 'IRN';
  const oppId = 'BLZ';
  const home = PLAYER_TEMPLATES.filter((t) => t.team === homeId);
  // A few opponent pass-catchers enable the occasional bring-back (Shootout
  // Stack) — but only one card each, so they don't flood the deck with catches
  // that can't form your own stacks.
  const bringBack = PLAYER_TEMPLATES.filter((t) => t.team === oppId && (t.position === 'WR' || t.position === 'TE')).slice(0, 2);
  const cards: FbCard[] = [];
  home.forEach((t) => cards.push(...cardsForPlayer(t)));
  bringBack.forEach((t) => cards.push(...cardsForPlayer(t).slice(0, 1)));
  cards.push(...kickerCards(homeId));
  return { teamId: homeId, teamName: 'Ironhawks', opponentId: oppId, cards };
}

// ── Play scoring (three channels) ───────────────────────────────────────────
function blank(): FbPlayResult {
  return { valid: false, concept: 'busted_play', playName: '—', flavor: 'Select cards to call a play.', base: 0, execution: 0, bigPlay: 1, total: 0, cost: 0, ledger: [] };
}

export function scoreFootballPlay(cards: FbCard[], ctx: FbScoreContext): FbPlayResult {
  if (cards.length === 0) return blank();

  const co = new Set(ctx.coordinators);
  const env = ctx.environment;
  const cost = cards.reduce((s, c) => s + c.cost, 0);

  const passCards = cards.filter((c) => c.side === 'pass');
  const catches = cards.filter((c) => c.side === 'catch');
  const runs = cards.filter((c) => c.action === 'power_run' || c.action === 'breakaway_run');
  const qbRuns = cards.filter((c) => c.action === 'scramble' || c.action === 'qb_sneak');
  const kicks = cards.filter((c) => c.side === 'kick');
  const defense = cards.filter((c) => c.side === 'defense');

  let base = cards.reduce((s, c) => s + c.value, 0);
  let execution = 0;
  let bigPlay = 1;
  const ledger: FbLedgerEntry[] = [{ id: 'base', kind: 'base', label: 'Base Yards', detail: `${cards.length} card${cards.length === 1 ? '' : 's'} on the play.` }];

  let concept: FbConceptKey = 'busted_play';
  let playName = 'Busted Play';
  let flavor = 'No real concept — these cards do not combine.';
  let isStack = false;

  const qbTeam = passCards[0]?.team;
  const sameTeamCatches = qbTeam ? catches.filter((c) => c.team === qbTeam) : [];
  const oppCatches = qbTeam ? catches.filter((c) => c.team !== qbTeam) : [];

  if (defense.length > 0) {
    if (defense.some((c) => c.action === 'return_td')) {
      concept = 'pick_six'; playName = 'Pick Six'; flavor = 'Defense takes it to the house.';
      bigPlay *= 1.6; ledger.push({ id: 'bp', kind: 'big_play', label: 'Pick Six', detail: 'Return touchdown — Big Play ×1.6.' });
    } else if (defense.some((c) => c.action === 'interception')) {
      concept = 'takeaway'; playName = 'Takeaway'; flavor = 'A turnover flips the field.';
      execution += 0.25; ledger.push({ id: 'ex', kind: 'execution', label: 'Takeaway', detail: 'Interception — Execution +0.25.' });
    } else {
      concept = 'sack'; playName = 'Sack'; flavor = 'Get to the quarterback.';
    }
  } else if (passCards.length > 0 && sameTeamCatches.length > 0) {
    isStack = true;
    const deepInvolved = passCards.some((c) => c.action === 'deep_pass') || sameTeamCatches.some((c) => c.action === 'deep_catch');
    if (sameTeamCatches.length >= 2) {
      concept = 'double_stack_bomb'; playName = 'Double-Stack Bomb'; flavor = `${passCards[0].playerName} hits ${sameTeamCatches.length} targets.`;
      execution += 0.4; bigPlay *= 1.5;
      ledger.push({ id: 'ex', kind: 'execution', label: 'Double Stack', detail: 'Execution +0.4.' });
      ledger.push({ id: 'bp', kind: 'big_play', label: 'Double Stack', detail: 'Big Play ×1.5.' });
    } else {
      concept = 'stack_td'; playName = 'Stack TD'; flavor = `${passCards[0].playerName} → ${sameTeamCatches[0].playerName}.`;
      execution += 0.6; ledger.push({ id: 'ex', kind: 'execution', label: 'QB Stack', detail: 'Execution +0.6.' });
    }
    if (deepInvolved && !(env === 'wind')) { bigPlay *= 1.2; ledger.push({ id: 'shot', kind: 'big_play', label: 'Shot Play', detail: 'Deep shot — Big Play ×1.2.' }); }
    if (oppCatches.length > 0) {
      concept = 'shootout_stack'; playName = 'Shootout Stack'; flavor = 'Bring-back correlation — both sides scoring.';
      bigPlay *= 1.4; ledger.push({ id: 'bb', kind: 'big_play', label: 'Bring-Back', detail: 'Shootout — Big Play ×1.4.' });
    }
  } else if (passCards.length > 0 && cards.every((c) => c.side === 'pass' || c.action === 'checkdown_catch')) {
    concept = 'checkdown'; playName = 'Checkdown'; flavor = 'Safe, short, keeps the chains moving.';
  } else if (runs.length >= 2) {
    concept = 'ground_pound'; playName = 'Ground & Pound'; flavor = 'Pound the rock — high floor.';
    execution += 0.4; ledger.push({ id: 'ex', kind: 'execution', label: 'Ground & Pound', detail: 'Execution +0.4.' });
  } else if (runs.length === 1) {
    concept = 'designed_run'; playName = 'Designed Run'; flavor = 'One carry, one read.';
  } else if (qbRuns.length > 0 && passCards.length === 0 && catches.length === 0) {
    concept = 'qb_keeper'; playName = 'QB Keeper'; flavor = 'The quarterback tucks and runs.';
  } else if (kicks.length > 0 && cards.every((c) => c.side === 'kick')) {
    const fg = kicks.some((c) => c.action === 'field_goal');
    concept = fg ? 'field_goal' : 'extra_point'; playName = fg ? 'Field Goal' : 'Extra Point'; flavor = 'Reliable points on the board.';
  }

  // ── Coordinators ──
  if (co.has('bell_cow')) {
    if (runs.length > 0) { const add = runs.length * 8; base += add; ledger.push({ id: 'bc-run', kind: 'coordinator', label: 'Bell Cow', detail: `+${add} Base from run cards.` }); }
    if (ctx.groundBonusThisMatch > 0) { base += ctx.groundBonusThisMatch; ledger.push({ id: 'bc-acc', kind: 'coordinator', label: 'Bell Cow (built up)', detail: `+${ctx.groundBonusThisMatch} accumulated ground Base.` }); }
  }
  if (co.has('salary_wizard')) {
    const cheap = cards.filter((c) => c.cost === 1).length;
    if (cheap > 0) { const add = cheap * 12; base += add; ledger.push({ id: 'sw', kind: 'coordinator', label: 'Salary Wizard', detail: `+${add} Base from ${cheap} value card${cheap === 1 ? '' : 's'}.` }); }
  }
  if (co.has('air_raid') && isStack && ctx.stacksThisMatch > 0) {
    const add = round2(0.25 * ctx.stacksThisMatch);
    execution += add;
    ledger.push({ id: 'ar', kind: 'coordinator', label: 'Air Raid Coordinator', detail: `+${add} Execution (scales with ${ctx.stacksThisMatch} prior stack${ctx.stacksThisMatch === 1 ? '' : 's'}).` });
  }
  if (co.has('west_coast') && (concept === 'checkdown' || (passCards.length > 0 && !isStack))) {
    execution += 0.3;
    ledger.push({ id: 'wc', kind: 'coordinator', label: 'West Coast Guru', detail: '+0.3 Execution on short passing.' });
  }
  if (co.has('ball_hawk') && defense.length > 0) {
    bigPlay *= 1.3;
    ledger.push({ id: 'bh', kind: 'coordinator', label: 'Ball-Hawk DC', detail: 'Defensive play — Big Play ×1.3.' });
  }
  const bombGames = ctx.bombGames ?? 0;
  if (co.has('franchise_qb') && bombGames > 0) {
    const mult = 1 + 0.2 * bombGames;
    bigPlay *= mult;
    ledger.push({ id: 'fqb', kind: 'coordinator', label: 'Franchise QB', detail: `Big Play ×${round2(mult)} (${bombGames} prior Bomb game${bombGames === 1 ? '' : 's'}).` });
  }

  // ── Game Plan (leveled concept commitment) ──
  const lvl = ctx.playbook?.[concept] ?? 0;
  const step = GAME_PLAN_STEP[concept];
  if (lvl > 0 && step && concept !== 'busted_play') {
    if (step.base) base += lvl * step.base;
    if (step.exec) execution += lvl * step.exec;
    let detail = `${playName} Lv${lvl}`;
    if (lvl >= 2) {
      const xm = round2(1 + GAME_PLAN_COMMIT_XMULT * (lvl - 1));
      bigPlay *= xm;
      detail += ` — commit ×${xm} Big Play`;
    }
    ledger.push({ id: 'pb', kind: 'coordinator', label: `Game Plan Lv${lvl}`, detail });
  }

  // ── Busted play penalty ──
  if (concept === 'busted_play') { bigPlay *= 0.5; ledger.push({ id: 'busted', kind: 'big_play', label: 'No Concept', detail: 'Mismatched cards — Big Play ×0.5.' }); }

  // ── Environment ──
  if (env === 'dome' && isStack) { base *= 1.15; ledger.push({ id: 'env', kind: 'environment', label: FB_ENVIRONMENTS.dome.label, detail: 'Passing +15% Base.' }); }
  if (env === 'snow') {
    if (isStack) { base *= 0.8; ledger.push({ id: 'env', kind: 'environment', label: FB_ENVIRONMENTS.snow.label, detail: 'Passing −20% Base.' }); }
    else if (runs.length > 0) { base *= 1.2; ledger.push({ id: 'env', kind: 'environment', label: FB_ENVIRONMENTS.snow.label, detail: 'Ground +20% Base.' }); }
  }
  if (env === 'primetime') { bigPlay *= 1.2; ledger.push({ id: 'env', kind: 'environment', label: FB_ENVIRONMENTS.primetime.label, detail: 'Big Play ×1.2.' }); }

  // ── Anti-spam (defense adjusts to repeated concepts this drive) ──
  const repeats = ctx.conceptCountsThisDrive[concept] ?? 0;
  if (repeats > 0 && concept !== 'busted_play') {
    const factor = Math.pow(0.85, repeats);
    bigPlay *= factor;
    ledger.push({ id: 'spam', kind: 'spam', label: 'Defense Adjusted', detail: `Repeated ${playName} ×${round2(factor)} (call something else).` });
  }

  base = r(base);
  execution = round2(execution);
  bigPlay = round2(bigPlay);
  const total = Math.max(0, Math.floor(base * (1 + execution) * bigPlay));
  ledger.push({ id: 'final', kind: 'final', label: 'Play Total', detail: `${base} × (1 + ${execution}) × ${bigPlay}.` });

  return { valid: concept !== 'busted_play', concept, playName, flavor, base, execution, bigPlay, total, cost, ledger };
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

export function randomEnvironment(): FbEnvironmentKey {
  return FB_ENVIRONMENT_KEYS[Math.floor(Math.random() * FB_ENVIRONMENT_KEYS.length)];
}

export function driveTargets(env: FbEnvironmentKey): number[] {
  const scale = env === 'primetime' ? 1.2 : 1;
  return DRIVE_TARGET.map((t) => Math.round(t * scale));
}

// ── Free-agent cards (for the reward shop) ──────────────────────────────────
export type FreeAgentKey = 'deep_wr' | 'bell_rb' | 'shutdown_dst' | 'value_slot' | 'gunslinger';

interface FreeAgentDef { name: string; team: string; position: FbPosition; action: FbActionType; value: number; cost: number; label: string; }

const FREE_AGENTS: Record<FreeAgentKey, FreeAgentDef> = {
  deep_wr: { name: 'D. Vaughn', team: 'IRN', position: 'WR', action: 'deep_catch', value: 88, cost: 3, label: 'Deep Catch' },
  bell_rb: { name: 'M. Stokes', team: 'IRN', position: 'RB', action: 'power_run', value: 64, cost: 2, label: 'Power Run' },
  shutdown_dst: { name: 'Ironhawks D', team: 'IRN', position: 'DST', action: 'interception', value: 80, cost: 3, label: 'Interception' },
  value_slot: { name: 'R. Pike', team: 'IRN', position: 'WR', action: 'short_catch', value: 40, cost: 1, label: 'Quick Catch' },
  gunslinger: { name: 'A. Royce', team: 'IRN', position: 'QB', action: 'deep_pass', value: 70, cost: 3, label: 'Deep Ball' },
};

export const FREE_AGENT_KEYS: FreeAgentKey[] = ['deep_wr', 'bell_rb', 'shutdown_dst', 'value_slot', 'gunslinger'];

export function createFreeAgentCard(key: FreeAgentKey): FbCard {
  const d = FREE_AGENTS[key];
  cardCounter += 1;
  return {
    id: `fa-${key}-${cardCounter}`,
    playerId: `fa_${key}`,
    playerName: d.name,
    team: d.team,
    position: d.position,
    action: d.action,
    label: d.label,
    side: sideOf(d.action),
    value: d.value,
    cost: d.cost,
  };
}

export const FB_CONCEPT_LABEL: Partial<Record<FbConceptKey, string>> = {
  double_stack_bomb: 'Double-Stack Bomb',
  shootout_stack: 'Shootout Stack',
  stack_td: 'Stack TD',
  ground_pound: 'Ground & Pound',
  checkdown: 'Checkdown',
  field_goal: 'Field Goal',
  pick_six: 'Pick Six',
  takeaway: 'Takeaway',
};
