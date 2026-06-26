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
import { GRIDIRON_ENVIRONMENT_WEIGHTS, weightedKey } from './gridironCalibration';
import type { RNG } from './rng';

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

// Player Traits (card modifiers) — the "drivetrain": one trait per card makes a
// card YOURS and creates combinatorial depth. Bought via Training rewards in the
// War Room. Each trait is a small, readable hook in the scoring pipeline (below)
// and renders as a badge on the card face — no new screen.
export type FbCardModifier = 'reliable' | 'explosive' | 'discounted' | 'clutch' | 'protected' | 'hot_route';

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
  modifier?: FbCardModifier; // at most one Player Trait
}

export interface FbModifierMeta { key: FbCardModifier; label: string; tag: string; color: string; description: string; }

export const FB_CARD_MODIFIERS: Record<FbCardModifier, FbModifierMeta> = {
  reliable:   { key: 'reliable',   label: 'Reliable',   tag: 'REL',  color: '#9aa6b5', description: 'Waives the Busted Play penalty on any play that includes this card.' },
  explosive:  { key: 'explosive',  label: 'Explosive',  tag: 'EXP',  color: '#f0b429', description: '+0.10 Big Play for each Explosive card on any clean concept.' },
  discounted: { key: 'discounted', label: 'Discounted', tag: 'DISC', color: '#34c771', description: 'Costs 1 less Play Budget (min 1).' },
  clutch:     { key: 'clutch',     label: 'Clutch',     tag: 'CLU',  color: '#e26d83', description: '+20 Base on Drive 3 and in the Championship.' },
  protected:  { key: 'protected',  label: 'Protected',  tag: 'PRO',  color: '#3b82f6', description: 'Halves the opposing defense scheme penalty on plays that include it.' },
  hot_route:  { key: 'hot_route',  label: 'Hot Route',  tag: 'HOT',  color: '#5fe0a0', description: 'This catch stacks with ANY quarterback — it counts as the passer’s team.' },
};

// Effective Play-Budget cost after traits (Discounted). One source of truth so
// the match, the preview, and the balance harness all agree.
export function cardCost(c: FbCard): number {
  return c.modifier === 'discounted' ? Math.max(1, c.cost - 1) : c.cost;
}

export type FbConceptKey =
  | 'double_stack_bomb' | 'shootout_stack' | 'stack_td' | 'checkdown'
  | 'ground_pound' | 'designed_run' | 'qb_keeper'
  | 'field_goal' | 'extra_point'
  | 'pick_six' | 'takeaway' | 'sack' | 'busted_play';

// ── Coordinators (scaling "jokers") ─────────────────────────────────────────
export type FbCoordinatorKey =
  | 'air_raid' | 'bell_cow' | 'salary_wizard'
  | 'franchise_qb' | 'west_coast' | 'ball_hawk'
  // Mobile-QB lane (Volts): a within-game ramp, a season compounder, and the
  // anti-volatility identity tool — the same two-tier+identity shape passing has.
  | 'read_option' | 'improviser' | 'broken_play'
  // Defense lane (Ghosts): the within-game ramp + season compounder it was missing
  // (it previously had only the flat ball_hawk, while passing had air_raid + franchise_qb).
  | 'pressure_chain' | 'takeaway_machine'
  // Phase-6 content wave: a Rare ground Big-Play scaler (the ground lane lacked an
  // in-game multiplier) and a Legendary pass build-around using the RETRIGGER
  // primitive. Both are reward-only and validated by the balance harness.
  | 'power_sweep' | 'two_minute_drill';

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
    description: '+13 Base per run card, and +6 permanent Base each time you call Ground & Pound this match.',
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
  read_option: {
    key: 'read_option', name: 'Read-Option Guru', channel: 'execution', scaling: 'within_game',
    description: '+0.2 Execution on QB Keeper / Designed Run plays for every QB run you have already broken this match.',
  },
  improviser: {
    key: 'improviser', name: 'The Improviser', channel: 'big_play', scaling: 'season',
    description: '+0.18 Big Play on every play for each earlier game in which you landed a QB Keeper.',
  },
  broken_play: {
    key: 'broken_play', name: 'Broken Play Artist', channel: 'base', scaling: 'flat',
    description: 'A Busted Play that includes a QB run card is salvaged into a scramble: no penalty, +32 Base.',
  },
  pressure_chain: {
    key: 'pressure_chain', name: 'Pressure Chain', channel: 'execution', scaling: 'within_game',
    description: '+0.14 Execution on defensive plays for every defensive play you have already made this match.',
  },
  takeaway_machine: {
    key: 'takeaway_machine', name: 'Takeaway Machine', channel: 'big_play', scaling: 'season',
    description: '+0.05 Big Play on every play for each earlier game with 2+ takeaways (Sack / Takeaway / Pick Six).',
  },
  power_sweep: {
    key: 'power_sweep', name: 'Power Sweep Coordinator', channel: 'big_play', scaling: 'within_game',
    description: '+0.12 Big Play on Ground & Pound for every Ground & Pound you have already run this match.',
  },
  two_minute_drill: {
    key: 'two_minute_drill', name: 'Two-Minute Drill', channel: 'big_play', scaling: 'within_game',
    description: 'Legendary: once you have leveled a stack Game Plan, the FIRST stack play each drive retriggers — its card yards count twice.',
  },
};

export const STARTER_COORDINATORS: FbCoordinatorKey[] = ['air_raid', 'bell_cow'];
export const MAX_COORDINATORS = 5;

// Run-level "Game Plan": commit to a concept and level it (Planet-card analog).
// Each level adds flat Base/Execution; committing PAST level 1 adds a growing
// Big Play (X-mult) — so concentrating levels on one concept compounds, while
// spreading them stays flat. This is the early-flat → late-multiplicative pivot.
export type FbPlaybook = Partial<Record<FbConceptKey, number>>; // concept -> level

// Each Game Plan level adds flat base/exec. The optional `big` field adds a
// per-level Big Play ramp — reserved for the non-passing lanes (ground / mobile /
// defense), which are otherwise base+exec heavy and plateau against the geometric
// curve. Passing concepts get no `big` here: they already scale multiplicatively
// through Double-Stack / Shootout / Franchise QB, so they don't need the help.
export const GAME_PLAN_STEP: Partial<Record<FbConceptKey, { base: number; exec: number; big?: number }>> = {
  double_stack_bomb: { base: 0, exec: 0.26 },
  stack_td: { base: 0, exec: 0.22 },
  shootout_stack: { base: 0, exec: 0.24 },
  ground_pound: { base: 64, exec: 0.18, big: 0.05 },
  qb_keeper: { base: 60, exec: 0.15, big: 0.09 },
  checkdown: { base: 30, exec: 0.12 },
  field_goal: { base: 58, exec: 0 },
  pick_six: { base: 0, exec: 0.3 },
  takeaway: { base: 0, exec: 0.22, big: 0.05 },
  sack: { base: 24, exec: 0, big: 0.05 },
};
export const GAME_PLAN_COMMIT_XMULT = 0.16; // Big Play added per level beyond 1

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
export const FB_ENVIRONMENT_WEIGHTS = GRIDIRON_ENVIRONMENT_WEIGHTS;

// ── Opposing defensive schemes (Boss Blind analog) ──────────────────────────
export type FbBossSchemeKey =
  | 'balanced'
  | 'no_fly_zone'
  | 'stacked_box'
  | 'turnover_drill'
  | 'adaptive_dc';

export interface FbBossScheme {
  key: FbBossSchemeKey;
  label: string;
  shortLabel: string;
  description: string;
  hint: string;
  // Presentation-only story fields (never read by scoring): a one-line
  // personality for the boss-intro reveal, and a plain "what it punishes" tag.
  flavor: string;
  punishes: string;
}

export const FB_BOSS_SCHEMES: Record<FbBossSchemeKey, FbBossScheme> = {
  balanced: {
    key: 'balanced',
    label: 'Base Defense',
    shortLabel: 'Base D',
    description: 'No special counters. Learn your playbook and build a plan.',
    hint: 'Any clean concept can win.',
    flavor: 'A vanilla front. No tricks — just execute your plan.',
    punishes: 'Nothing special',
  },
  no_fly_zone: {
    key: 'no_fly_zone',
    label: 'No-Fly Zone',
    shortLabel: 'No-Fly',
    description: 'Deep stacks lose Big Play, but short passing stays efficient.',
    hint: 'Lean on Stack TD, Checkdown, or the run game.',
    flavor: 'Two high safeties, everything in front of them. Take the underneath.',
    punishes: 'Deep double-stacks & shootouts',
  },
  stacked_box: {
    key: 'stacked_box',
    label: 'Stacked Box',
    shortLabel: 'Box',
    description: 'Runs lose Base, but play-action stacks get a small Execution bump.',
    hint: 'Beat it with QB stacks and passing concepts.',
    flavor: 'Eight in the box, daring you to throw. So throw it.',
    punishes: 'The run game',
  },
  turnover_drill: {
    key: 'turnover_drill',
    label: 'Turnover Drill',
    shortLabel: 'Secure',
    description: 'Defensive splash plays lose Big Play; clean offense gains Execution.',
    hint: 'Do not rely only on Pick Six luck.',
    flavor: 'They coached ball security all week. Splash plays get smothered.',
    punishes: 'Defensive splash plays',
  },
  adaptive_dc: {
    key: 'adaptive_dc',
    label: 'Adaptive DC',
    shortLabel: 'Adaptive',
    description: 'Repeating a concept gets punished harder than usual.',
    hint: 'Mix your engine with one supporting play.',
    flavor: 'A film-room genius. Run the same call twice and they jump it.',
    punishes: 'Repeating one concept',
  },
};

export const FB_BOSS_SCHEME_KEYS: FbBossSchemeKey[] = ['no_fly_zone', 'stacked_box', 'turnover_drill', 'adaptive_dc'];

export function randomBossScheme(gameNumber: number, championship = false, rng: RNG = Math.random): FbBossSchemeKey {
  if (gameNumber <= 1) return 'balanced';
  if (championship) return FB_BOSS_SCHEME_KEYS[Math.floor(rng() * FB_BOSS_SCHEME_KEYS.length)];
  const pool = FB_BOSS_SCHEME_KEYS.filter((k) => k !== 'adaptive_dc');
  return pool[Math.floor(rng() * pool.length)];
}

// ── Defensive presentation (the pre-snap look you read) ──────────────────────
// The first slice of "reading football changes the score". Each boss scheme maps
// to concrete pre-snap LOOKS across four axes; the matchup edge (in
// scoreFootballPlay) keys on these axes, not on the scheme name — so the player
// is reacting to the alignment, the way a real quarterback does.
//
//   shell     deep-safety structure: how the ball over the top is defended
//   box       defenders in the run fit: who wins the numbers game up front
//   pressure  rush intent: four-man rush, an extra blitzer, or a disguise
//   leverage  how corners play the receivers (presentation-only for now)
export type FbShell = 'base' | 'one-high' | 'two-high' | 'zero';
export type FbBox = 'light' | 'neutral' | 'loaded';
export type FbPressure = 'four-man' | 'blitz' | 'simulated';
export type FbLeverage = 'soft' | 'press' | 'inside' | 'outside';

export interface FbDefensivePresentation {
  shell: FbShell;
  box: FbBox;
  pressure: FbPressure;
  leverage: FbLeverage;
}

export const SHELL_LABEL: Record<FbShell, string> = {
  base: 'Balanced shell', 'one-high': 'Single-high', 'two-high': 'Two-high', zero: 'Cover 0',
};
export const BOX_LABEL: Record<FbBox, string> = {
  light: 'Light box', neutral: 'Even box', loaded: 'Loaded box',
};
export const PRESSURE_LABEL: Record<FbPressure, string> = {
  'four-man': 'Four-man rush', blitz: 'Blitz', simulated: 'Simulated pressure',
};

// Boss scheme → pre-snap look. `balanced` sits on the neutral bucket of every
// axis the matchup edge reads (base shell / even box / four-man), so a base
// defense applies NO matchup edge — Game 1 stays exactly as tuned.
export const PRESENTATION_BY_SCHEME: Record<FbBossSchemeKey, FbDefensivePresentation> = {
  balanced:       { shell: 'base',     box: 'neutral', pressure: 'four-man',  leverage: 'soft' },
  no_fly_zone:    { shell: 'two-high', box: 'light',   pressure: 'four-man',  leverage: 'soft' },
  stacked_box:    { shell: 'one-high', box: 'loaded',  pressure: 'four-man',  leverage: 'press' },
  turnover_drill: { shell: 'two-high', box: 'neutral', pressure: 'simulated', leverage: 'inside' },
  adaptive_dc:    { shell: 'one-high', box: 'neutral', pressure: 'blitz',     leverage: 'press' },
};

export function presentationForScheme(scheme: FbBossSchemeKey): FbDefensivePresentation {
  return PRESENTATION_BY_SCHEME[scheme] ?? PRESENTATION_BY_SCHEME.balanced;
}

// ── Disguise: two possible looks per boss, hidden until revealed ──────────────
// Each boss can show one of two pre-snap looks, chosen by seed per game. The ALT
// look always REMOVES a favorable matchup edge relative to the primary look (it
// shifts off the axis presentationEdge rewards) — it NEVER adds one. So hiding the
// look can only cost the player an edge they hoped for; disguise adds a read, not
// raw power (and tends to OFFSET the matchup-edge lift rather than compound it).
// `balanced` does not disguise — the base defense is an honest teaching look.
export const PRESENTATION_ALT_BY_SCHEME: Record<FbBossSchemeKey, FbDefensivePresentation> = {
  balanced:       { shell: 'base',     box: 'neutral', pressure: 'four-man', leverage: 'soft' },
  no_fly_zone:    { shell: 'two-high', box: 'neutral', pressure: 'four-man', leverage: 'soft' },   // box not light → no run edge
  stacked_box:    { shell: 'two-high', box: 'loaded',  pressure: 'four-man', leverage: 'press' },  // two-high → no deep-stack edge
  turnover_drill: { shell: 'two-high', box: 'neutral', pressure: 'four-man', leverage: 'inside' }, // four-man → no checkdown edge
  adaptive_dc:    { shell: 'two-high', box: 'neutral', pressure: 'four-man', leverage: 'press' },  // two-high + four-man → no edge
};

export function presentationsForScheme(scheme: FbBossSchemeKey): [FbDefensivePresentation, FbDefensivePresentation] {
  return [PRESENTATION_BY_SCHEME[scheme] ?? PRESENTATION_BY_SCHEME.balanced, PRESENTATION_ALT_BY_SCHEME[scheme] ?? PRESENTATION_BY_SCHEME.balanced];
}

// The actual look in play this game (deterministic from whatever rng you feed it).
export function livePresentation(scheme: FbBossSchemeKey, rng: RNG = Math.random): FbDefensivePresentation {
  const [primary, alt] = presentationsForScheme(scheme);
  return rng() < 0.5 ? primary : alt;
}

// The matchup matrix — FAVORABLE-look bonuses only. When the defense's pre-snap
// look is wrong for the concept you called, the same hand scores better. The
// "weak vs" side (a hand scoring worse vs a counter look) already lives in the
// boss-scheme block below and stays untouched, so this addition is purely
// additive to the validated engine. Numbers are deliberately conservative and
// tuned against the balance harness. Returns null when there is no edge.
export interface FbMatchupEdge { base: number; exec: number; big: number; note: string; }

export function presentationEdge(concept: FbConceptKey, p: FbDefensivePresentation): FbMatchupEdge | null {
  switch (concept) {
    case 'ground_pound':
      if (p.box === 'light') return { base: 1.04, exec: 0, big: 1, note: 'Light box — the rock gashes' };
      break;
    case 'designed_run':
      if (p.box === 'light') return { base: 1.03, exec: 0, big: 1, note: 'Light box — clean run lane' };
      break;
    case 'qb_keeper':
      if (p.box === 'light') return { base: 1, exec: 0.05, big: 1, note: 'Light box — keeper pulls clean' };
      break;
    case 'double_stack_bomb':
      if (p.shell === 'one-high') return { base: 1, exec: 0, big: 1.04, note: 'Single-high — shot over the top' };
      break;
    case 'shootout_stack':
      if (p.shell === 'one-high') return { base: 1, exec: 0, big: 1.03, note: 'Single-high — shot over the top' };
      break;
    case 'checkdown':
      if (p.pressure === 'blitz' || p.pressure === 'simulated') return { base: 1, exec: 0.05, big: 1, note: 'Pressure — hot throw underneath' };
      break;
  }
  return null;
}

// ── Scoring context + result ────────────────────────────────────────────────
export interface FbScoreContext {
  coordinators: FbCoordinatorKey[];
  environment: FbEnvironmentKey;
  bossScheme?: FbBossSchemeKey;
  presentation?: FbDefensivePresentation;        // pre-snap look (defaults to the scheme's mapping)
  stacksThisMatch: number;                       // for Air Raid scaling
  groundBonusThisMatch: number;                  // accumulated Bell Cow base
  qbRunsThisMatch?: number;                       // QB runs already broken (Read-Option ramp)
  defPlaysThisMatch?: number;                     // defensive plays already made (Pressure Chain ramp)
  conceptCountsThisDrive: Partial<Record<FbConceptKey, number>>; // anti-spam
  playbook?: FbPlaybook;                          // run-level concept upgrades
  bombGames?: number;                            // earlier games with a Bomb (Franchise QB)
  keeperGames?: number;                          // earlier games with a QB Keeper (Improviser)
  takeawayGames?: number;                        // earlier games with 2+ takeaways (Takeaway Machine)
  driveIndex?: number;                           // 0-based drive; 2 = final drive (Clutch trait)
  championship?: boolean;                        // championship game (Clutch trait)
}

export type FbLedgerKind = 'base' | 'execution' | 'big_play' | 'coordinator' | 'environment' | 'boss' | 'matchup' | 'spam' | 'final';
export type FbScoreStage = 'cards' | 'concept' | 'coordinator' | 'playbook' | 'environment' | 'boss' | 'adjustment' | 'final';
export type FbScoreChannel = 'base' | 'execution' | 'big_play' | 'cost' | 'budget' | 'draw';
export type FbScoreOperation = 'add' | 'multiply' | 'discount' | 'penalty' | 'set';

export interface FbLedgerEntry {
  id: string;
  kind: FbLedgerKind;
  stage: FbScoreStage;
  channel: FbScoreChannel;
  operation: FbScoreOperation;
  value: number;
  label: string;
  detail: string;
}

// ── Effect-kind taxonomy (analysis layer) ───────────────────────────────────
// A coarse classification of WHAT a scoring contribution does, used by the
// balance harness ceiling probes and by tooling. It does not change scoring — it
// is derived from the ledger that scoreFootballPlay already produces.
//
//   base        flat Base yards added before multipliers
//   execution   additive (1 + Execution) bonus
//   bigplay_mult one-shot Big Play multiplier from a concept/environment/boss
//   scaler      a Big Play multiplier that GROWS with run/match state (the
//               compounding coordinators: Franchise QB, Improviser, …)
//   retrigger   replays a card/effect for extra value (reserved; see Phase-6
//               legendary content — engine support lives in scoreFootballPlay)
//
// IMPORTANT (Big Play aggregation audit): every Big Play source multiplies into a
// single running `bigPlay` (it starts at 1 and each effect does `bigPlay *= x`).
// So multiple Big Play multipliers ALREADY compound multiplicatively today — no
// refactor was needed for sources to stack. The ceiling work is therefore about
// (a) measuring the resulting distribution and (b) adding new multiplier SOURCES
// carefully, not about changing how they combine.
export type FbEffectKind = 'base' | 'execution' | 'bigplay_mult' | 'scaler' | 'retrigger';

export function effectKindOf(entry: FbLedgerEntry): FbEffectKind {
  if (entry.id === 'retrigger' || entry.kind === 'retrigger' as FbLedgerKind) return 'retrigger';
  if (entry.channel === 'base') return 'base';
  if (entry.channel === 'execution') return 'execution';
  if (entry.channel === 'big_play') {
    // A scaling coordinator's Big Play contribution grows with state → scaler.
    return entry.kind === 'coordinator' ? 'scaler' : 'bigplay_mult';
  }
  return 'base';
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
        makeCard(t, 'short_pass', proj * 1.9), makeCard(t, 'short_pass', proj * 1.7),
        makeCard(t, 'scramble', ceil * 1.1), makeCard(t, 'scramble', ceil * 0.95), makeCard(t, 'qb_sneak', 46),
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

// ── Teams as Decks ──────────────────────────────────────────────────────────
// A team is NOT a skin — it is a starting CLASS: a distinct deck composition, a
// signature pair of starting coordinators, and a cost-identity perk that makes
// the team's on-scheme plays cheaper (so an Air Raid can afford a Double-Stack a
// Ground deck can't). Names are display-only data drawn from the seed roster, so
// the whole system is license-agnostic. The five archetypes are deliberately
// committable to DIFFERENT scoring lines — that is the variety the balance
// harness now measures per-team (see scripts/gridironBalance.ts).
export type TeamArchetype = 'balanced' | 'air_raid' | 'ground_game' | 'mobile_qb' | 'defensive_pressure';

export interface TeamDeckProfile {
  id: TeamArchetype;
  teamId: string;            // seed roster to build the deck from
  rivalId: string;           // bring-back source (Shootout correlation)
  displayName: string;
  shortName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tagline: string;           // "Try this team if…"
  description: string;
  strengths: string[];
  weaknesses: string[];
  bestConcepts: FbConceptKey[];
  startingCoordinators: FbCoordinatorKey[];
  perkLabel: string;         // human text for the cost identity
  firstRunRecommended?: boolean;
  bringBackCount: number;
  // archetype skew: extra cards appended to express identity (clones of the
  // deck's best on-scheme cards, or a borrowed unit for a missing concept).
  extra: (deck: FbCard[]) => FbCard[];
  // cost identity: matching cards get −1 cap cost (min 1).
  discount: ((c: FbCard) => boolean) | null;
}

const isPass = (c: FbCard) => c.side === 'pass';
const isPowerRun = (c: FbCard) => c.action === 'power_run' || c.action === 'breakaway_run';
const isQbRun = (c: FbCard) => c.action === 'scramble' || c.action === 'qb_sneak';
const isDefense = (c: FbCard) => c.side === 'defense';

function cloneCard(c: FbCard): FbCard {
  cardCounter += 1;
  return { ...c, id: `${c.id}-dup${cardCounter}` };
}
// Clone the top-n highest-value cards matching a predicate (archetype skew).
function cloneTop(deck: FbCard[], pred: (c: FbCard) => boolean, n: number): FbCard[] {
  return [...deck].filter(pred).sort((a, b) => b.value - a.value).slice(0, n).map(cloneCard);
}
// Borrow a defensive unit (for teams whose own roster lacks a Pick Six threat).
function dstCardsFor(teamId: string): FbCard[] {
  const t = PLAYER_TEMPLATES.find((p) => p.team === teamId && p.position === 'DST');
  return t ? cardsForPlayer(t) : [];
}

export const TEAM_PROFILES: Record<TeamArchetype, TeamDeckProfile> = {
  balanced: {
    id: 'balanced', teamId: 'IRN', rivalId: 'BLZ',
    displayName: 'Ironhawks', shortName: 'IRN', difficulty: 'Easy',
    tagline: 'Try Ironhawks if you want a flexible deck with no sharp weakness.',
    description: 'A complete pro roster — can pass, run, and defend. Lower ceiling, but it bends to whatever the run hands you and whatever boss you draw.',
    strengths: ['Flexible', 'No dead matchups', 'Beginner-friendly'],
    weaknesses: ['Lower ceiling — needs rewards to spike', 'Master of none'],
    bestConcepts: ['stack_td', 'ground_pound', 'double_stack_bomb'],
    startingCoordinators: ['air_raid', 'bell_cow'],
    perkLabel: 'No cost perk — a balanced, complete deck.',
    firstRunRecommended: true,
    bringBackCount: 2,
    extra: () => [],
    discount: null,
  },
  air_raid: {
    id: 'air_raid', teamId: 'BLZ', rivalId: 'STO',
    displayName: 'Blazers', shortName: 'BLZ', difficulty: 'Medium',
    tagline: 'Try Blazers if you want huge passing combos and do not mind weather risk.',
    description: 'Air Raid — QB stacks and explosive shootouts. Biggest ceiling in the game, but No-Fly Zone and Snow punish you and the premium catchers are pricey.',
    strengths: ['Stack TD / Double-Stack Bomb', 'Shootout correlation', 'Dome / Primetime spikes'],
    weaknesses: ['No-Fly Zone', 'Snow / Wind', 'Thin run game'],
    bestConcepts: ['double_stack_bomb', 'shootout_stack', 'stack_td'],
    startingCoordinators: ['air_raid', 'franchise_qb'],
    perkLabel: 'Air Raid: checkdown catches cost 1 less (min 1) — keeps the underneath cheap.',
    bringBackCount: 1,
    extra: (deck) => cloneTop(deck, isPass, 2),
    discount: (c) => c.action === 'checkdown_catch',
  },
  ground_game: {
    id: 'ground_game', teamId: 'STO', rivalId: 'RAV',
    displayName: 'Stormers', shortName: 'STO', difficulty: 'Easy',
    tagline: 'Try Stormers if you like a steady engine that ignores the weather.',
    description: 'Ground Game — pound the rock with a cheap, high-floor base. Weather-proof and consistent, but the Big Play ceiling is low until you find multiplicative help.',
    strengths: ['Ground & Pound', 'High floor', 'Snow-proof'],
    weaknesses: ['Low Big Play ceiling', 'Stacked Box without play-action'],
    bestConcepts: ['ground_pound', 'field_goal', 'checkdown'],
    startingCoordinators: ['bell_cow', 'salary_wizard'],
    perkLabel: 'Ground Game: every run card costs 1 less (min 1).',
    bringBackCount: 1,
    // Enough carries to run the ground game for three drives, plus a spare kicker
    // so it can vary off the rock (anti-spam) without leaving the lane.
    extra: (deck) => [...cloneTop(deck, isPowerRun, 4), ...kickerCards('STO').slice(0, 1)],
    discount: (c) => c.side === 'run',
  },
  mobile_qb: {
    id: 'mobile_qb', teamId: 'VLT', rivalId: 'GHO',
    displayName: 'Volts', shortName: 'VLT', difficulty: 'Hard',
    tagline: 'Try Volts if you want a swingy, improvisational deck for expert play.',
    description: 'Mobile QB Chaos — scrambles, keepers, and busted-play rescue. Big upside off the read, but volatile draws and Turnover Drill can leave you stranded.',
    strengths: ['QB Keeper / Scramble', 'Improvises off bad hands', 'High variance upside'],
    weaknesses: ['Volatile draws', 'Awkward hands', 'Punished by takeaway bosses'],
    bestConcepts: ['qb_keeper', 'stack_td', 'designed_run'],
    // Start with the tools that make the deck's actual fantasy work: read the
    // option, then rescue stranded QB-run hands instead of treating Volts like a
    // worse passing deck.
    startingCoordinators: ['read_option', 'broken_play'],
    // Only one bring-back: the Volts deck already runs thin on QB-pass cards, so a
    // second opp catch (usable only in a rare Shootout) was mostly dead weight
    // that bloated hands into dead draws.
    perkLabel: 'Dual-Threat: QB run cards (scramble / sneak) cost 1 less (min 1).',
    bringBackCount: 1,
    // Enough QB-run cards that the keeper line shows up every drive (and pairs up
    // for the Option Pitch), rather than being a rare off-hand wrinkle.
    extra: (deck) => cloneTop(deck, isQbRun, 4),
    discount: (c) => isQbRun(c),
  },
  defensive_pressure: {
    id: 'defensive_pressure', teamId: 'GHO', rivalId: 'VLT',
    displayName: 'Ghosts', shortName: 'GHO', difficulty: 'Medium',
    tagline: 'Try Ghosts if you want to win on takeaways instead of offense.',
    description: 'Defensive Pressure — sacks, takeaways, and Pick Six spikes off cheap defensive cards. A non-offensive archetype; the offense can stall, and Turnover Drill hurts.',
    strengths: ['Takeaway / Pick Six', 'Cheap defensive engine', 'Field-position scoring'],
    weaknesses: ['Offense can stall', 'Turnover Drill', 'Needs a stabilizer plan'],
    bestConcepts: ['pick_six', 'takeaway', 'sack'],
    startingCoordinators: ['ball_hawk', 'salary_wizard'],
    perkLabel: 'Lockdown: every defensive card costs 1 less (min 1).',
    bringBackCount: 1,
    // Ghosts' own DST can't take it to the house — borrow a risky unit so the
    // Pick Six line exists, then deepen the bench enough to field defense every
    // drive (a takeaway engine needs the cards to actually keep making splashes).
    extra: (deck) => [...dstCardsFor('VLT'), ...cloneTop(deck, isDefense, 2)],
    discount: (c) => isDefense(c),
  },
};

export const TEAM_ARCHETYPES: TeamArchetype[] = ['balanced', 'air_raid', 'ground_game', 'mobile_qb', 'defensive_pressure'];

export function buildTeamDeck(archetype: TeamArchetype): FbDeckInfo {
  const p = TEAM_PROFILES[archetype];
  const home = PLAYER_TEMPLATES.filter((t) => t.team === p.teamId);
  // A few rival pass-catchers enable the occasional bring-back (Shootout Stack) —
  // one card each, so they don't flood the deck with catches that can't stack.
  const bringBack = PLAYER_TEMPLATES.filter((t) => t.team === p.rivalId && (t.position === 'WR' || t.position === 'TE')).slice(0, p.bringBackCount);
  let cards: FbCard[] = [];
  home.forEach((t) => cards.push(...cardsForPlayer(t)));
  bringBack.forEach((t) => cards.push(...cardsForPlayer(t).slice(0, 1)));
  cards.push(...kickerCards(p.teamId));
  cards.push(...p.extra(cards));
  if (p.discount) cards = cards.map((c) => (p.discount!(c) ? { ...c, cost: Math.max(1, c.cost - 1) } : c));
  return { teamId: p.teamId, teamName: p.displayName, opponentId: p.rivalId, cards };
}

// Back-compat: the original single starter deck is the balanced (Ironhawks) team.
export function buildStarterDeck(): FbDeckInfo {
  return buildTeamDeck('balanced');
}

// ── Play scoring (three channels) ───────────────────────────────────────────
function blank(): FbPlayResult {
  return { valid: false, concept: 'busted_play', playName: '—', flavor: 'Select cards to call a play.', base: 0, execution: 0, bigPlay: 1, total: 0, cost: 0, ledger: [] };
}

export function scoreFootballPlay(cards: FbCard[], ctx: FbScoreContext): FbPlayResult {
  if (cards.length === 0) return blank();

  const co = new Set(ctx.coordinators);
  const env = ctx.environment;
  const scheme = ctx.bossScheme ?? 'balanced';
  const cost = cards.reduce((s, c) => s + cardCost(c), 0);
  // Protected trait: halve any opposing-scheme penalty on this play.
  const protectedInPlay = cards.some((c) => c.modifier === 'protected');
  const soften = (f: number) => (protectedInPlay ? round2(f + (1 - f) * 0.5) : f);

  const passCards = cards.filter((c) => c.side === 'pass');
  const catches = cards.filter((c) => c.side === 'catch');
  const runs = cards.filter((c) => c.action === 'power_run' || c.action === 'breakaway_run');
  const qbRuns = cards.filter((c) => c.action === 'scramble' || c.action === 'qb_sneak');
  const kicks = cards.filter((c) => c.side === 'kick');
  const defense = cards.filter((c) => c.side === 'defense');

  let base = cards.reduce((s, c) => s + c.value, 0);
  let execution = 0;
  let bigPlay = 1;
  const ledger: FbLedgerEntry[] = [{
    id: 'base',
    kind: 'base',
    stage: 'cards',
    channel: 'base',
    operation: 'set',
    value: base,
    label: 'Base Yards',
    detail: `${cards.length} card${cards.length === 1 ? '' : 's'} on the play.`,
  }];

  let concept: FbConceptKey = 'busted_play';
  let playName = 'Busted Play';
  let flavor = 'No real concept — these cards do not combine.';
  let isStack = false;

  const qbTeam = passCards[0]?.team;
  // Hot Route catches count as the passer's team for stack detection.
  const sameTeamCatches = qbTeam ? catches.filter((c) => c.team === qbTeam || c.modifier === 'hot_route') : [];
  const oppCatches = qbTeam ? catches.filter((c) => c.team !== qbTeam && c.modifier !== 'hot_route') : [];

  if (defense.length > 0) {
    if (defense.some((c) => c.action === 'return_td')) {
      concept = 'pick_six'; playName = 'Pick Six'; flavor = 'Defense takes it to the house.';
      bigPlay *= 1.65; ledger.push({ id: 'bp', kind: 'big_play', stage: 'concept', channel: 'big_play', operation: 'multiply', value: 1.65, label: 'Pick Six', detail: 'Return touchdown — Big Play ×1.65.' });
    } else if (defense.some((c) => c.action === 'interception')) {
      concept = 'takeaway'; playName = 'Takeaway'; flavor = 'A turnover flips the field.';
      execution += 0.3; ledger.push({ id: 'ex', kind: 'execution', stage: 'concept', channel: 'execution', operation: 'add', value: 0.3, label: 'Takeaway', detail: 'Interception — Execution +0.30.' });
    } else {
      concept = 'sack'; playName = 'Sack'; flavor = 'Get to the quarterback.';
    }
  } else if (passCards.length > 0 && sameTeamCatches.length > 0) {
    isStack = true;
    const deepInvolved = passCards.some((c) => c.action === 'deep_pass') || sameTeamCatches.some((c) => c.action === 'deep_catch');
    if (sameTeamCatches.length >= 2) {
      concept = 'double_stack_bomb'; playName = 'Double-Stack Bomb'; flavor = `${passCards[0].playerName} hits ${sameTeamCatches.length} targets.`;
      execution += 0.4; bigPlay *= 1.5;
      ledger.push({ id: 'ex', kind: 'execution', stage: 'concept', channel: 'execution', operation: 'add', value: 0.4, label: 'Double Stack', detail: 'Execution +0.4.' });
      ledger.push({ id: 'bp', kind: 'big_play', stage: 'concept', channel: 'big_play', operation: 'multiply', value: 1.5, label: 'Double Stack', detail: 'Big Play ×1.5.' });
    } else {
      concept = 'stack_td'; playName = 'Stack TD'; flavor = `${passCards[0].playerName} → ${sameTeamCatches[0].playerName}.`;
      execution += 0.6; ledger.push({ id: 'ex', kind: 'execution', stage: 'concept', channel: 'execution', operation: 'add', value: 0.6, label: 'QB Stack', detail: 'Execution +0.6.' });
    }
    if (deepInvolved && !(env === 'wind')) { bigPlay *= 1.2; ledger.push({ id: 'shot', kind: 'big_play', stage: 'concept', channel: 'big_play', operation: 'multiply', value: 1.2, label: 'Shot Play', detail: 'Deep shot — Big Play ×1.2.' }); }
    if (oppCatches.length > 0) {
      concept = 'shootout_stack'; playName = 'Shootout Stack'; flavor = 'Bring-back correlation — both sides scoring.';
      bigPlay *= 1.4; ledger.push({ id: 'bb', kind: 'big_play', stage: 'concept', channel: 'big_play', operation: 'multiply', value: 1.4, label: 'Bring-Back', detail: 'Shootout — Big Play ×1.4.' });
    }
  } else if (passCards.length > 0 && cards.every((c) => c.side === 'pass' || c.action === 'checkdown_catch')) {
    concept = 'checkdown'; playName = 'Checkdown'; flavor = 'Safe, short, keeps the chains moving.';
  } else if (runs.length >= 2) {
    concept = 'ground_pound'; playName = 'Ground & Pound'; flavor = 'Pound the rock — high floor.';
    execution += 0.4; ledger.push({ id: 'ex', kind: 'execution', stage: 'concept', channel: 'execution', operation: 'add', value: 0.4, label: 'Ground & Pound', detail: 'Execution +0.4.' });
    // The ground game's one path to a Big Play: stack three carries and one breaks.
    if (runs.length >= 3) { bigPlay *= 1.25; ledger.push({ id: 'gash', kind: 'big_play', stage: 'concept', channel: 'big_play', operation: 'multiply', value: 1.25, label: 'Gash', detail: '3+ carries — one breaks for Big Play ×1.25.' }); }
  } else if (runs.length === 1) {
    concept = 'designed_run'; playName = 'Designed Run'; flavor = 'One carry, one read.';
  } else if (qbRuns.length > 0 && passCards.length === 0 && catches.length === 0) {
    concept = 'qb_keeper'; playName = 'QB Keeper'; flavor = 'The quarterback tucks and runs.';
    execution += 0.45; ledger.push({ id: 'ex', kind: 'execution', stage: 'concept', channel: 'execution', operation: 'add', value: 0.45, label: 'QB Keeper', detail: 'Execution +0.45.' });
    // Read off the option: a second QB run card breaks contain for a Big Play.
    if (qbRuns.length >= 2) { bigPlay *= 1.35; ledger.push({ id: 'option', kind: 'big_play', stage: 'concept', channel: 'big_play', operation: 'multiply', value: 1.35, label: 'Option Pitch', detail: '2+ QB runs — Big Play ×1.35.' }); }
  } else if (kicks.length > 0 && cards.every((c) => c.side === 'kick')) {
    const fg = kicks.some((c) => c.action === 'field_goal');
    concept = fg ? 'field_goal' : 'extra_point'; playName = fg ? 'Field Goal' : 'Extra Point'; flavor = 'Reliable points on the board.';
  }

  // ── Coordinators ──
  if (co.has('bell_cow')) {
    if (runs.length > 0) { const add = runs.length * 13; base += add; ledger.push({ id: 'bc-run', kind: 'coordinator', stage: 'coordinator', channel: 'base', operation: 'add', value: add, label: 'Bell Cow', detail: `+${add} Base from run cards.` }); }
    if (ctx.groundBonusThisMatch > 0) { base += ctx.groundBonusThisMatch; ledger.push({ id: 'bc-acc', kind: 'coordinator', stage: 'coordinator', channel: 'base', operation: 'add', value: ctx.groundBonusThisMatch, label: 'Bell Cow (built up)', detail: `+${ctx.groundBonusThisMatch} accumulated ground Base.` }); }
  }
  if (co.has('salary_wizard')) {
    const cheap = cards.filter((c) => cardCost(c) === 1).length;
    if (cheap > 0) { const add = cheap * 12; base += add; ledger.push({ id: 'sw', kind: 'coordinator', stage: 'coordinator', channel: 'base', operation: 'add', value: add, label: 'Salary Wizard', detail: `+${add} Base from ${cheap} value card${cheap === 1 ? '' : 's'}.` }); }
  }
  if (co.has('air_raid') && isStack && ctx.stacksThisMatch > 0) {
    const add = round2(0.25 * ctx.stacksThisMatch);
    execution += add;
    ledger.push({ id: 'ar', kind: 'coordinator', stage: 'coordinator', channel: 'execution', operation: 'add', value: add, label: 'Air Raid Coordinator', detail: `+${add} Execution (scales with ${ctx.stacksThisMatch} prior stack${ctx.stacksThisMatch === 1 ? '' : 's'}).` });
  }
  if (co.has('west_coast') && (concept === 'checkdown' || (passCards.length > 0 && !isStack))) {
    execution += 0.3;
    ledger.push({ id: 'wc', kind: 'coordinator', stage: 'coordinator', channel: 'execution', operation: 'add', value: 0.3, label: 'West Coast Guru', detail: '+0.3 Execution on short passing.' });
  }
  if (co.has('ball_hawk') && defense.length > 0) {
    bigPlay *= 1.3;
    ledger.push({ id: 'bh', kind: 'coordinator', stage: 'coordinator', channel: 'big_play', operation: 'multiply', value: 1.3, label: 'Ball-Hawk DC', detail: 'Defensive play — Big Play ×1.3.' });
  }
  const bombGames = ctx.bombGames ?? 0;
  if (co.has('franchise_qb') && bombGames > 0) {
    const mult = 1 + 0.2 * bombGames;
    bigPlay *= mult;
    ledger.push({ id: 'fqb', kind: 'coordinator', stage: 'coordinator', channel: 'big_play', operation: 'multiply', value: mult, label: 'Franchise QB', detail: `Big Play ×${round2(mult)} (${bombGames} prior Bomb game${bombGames === 1 ? '' : 's'}).` });
  }
  // Read-Option Guru: within-game Execution ramp on the QB run game (Air Raid analog).
  if (co.has('read_option') && (concept === 'qb_keeper' || concept === 'designed_run') && (ctx.qbRunsThisMatch ?? 0) > 0) {
    const add = round2(0.2 * (ctx.qbRunsThisMatch ?? 0));
    execution += add;
    ledger.push({ id: 'ro', kind: 'coordinator', stage: 'coordinator', channel: 'execution', operation: 'add', value: add, label: 'Read-Option Guru', detail: `+${add} Execution (scales with ${ctx.qbRunsThisMatch} prior QB run${(ctx.qbRunsThisMatch ?? 0) === 1 ? '' : 's'}).` });
  }
  // The Improviser: season-long Big Play compounder for the mobile QB (Franchise QB analog).
  const keeperGames = ctx.keeperGames ?? 0;
  if (co.has('improviser') && keeperGames > 0) {
    const mult = 1 + 0.18 * keeperGames;
    bigPlay *= mult;
    ledger.push({ id: 'imp', kind: 'coordinator', stage: 'coordinator', channel: 'big_play', operation: 'multiply', value: mult, label: 'The Improviser', detail: `Big Play ×${round2(mult)} (${keeperGames} prior Keeper game${keeperGames === 1 ? '' : 's'}).` });
  }
  // Pressure Chain: within-game Execution ramp on defense (Air Raid analog).
  if (co.has('pressure_chain') && defense.length > 0 && (ctx.defPlaysThisMatch ?? 0) > 0) {
    const add = round2(0.14 * (ctx.defPlaysThisMatch ?? 0));
    execution += add;
    ledger.push({ id: 'pc', kind: 'coordinator', stage: 'coordinator', channel: 'execution', operation: 'add', value: add, label: 'Pressure Chain', detail: `+${add} Execution (scales with ${ctx.defPlaysThisMatch} prior defensive play${(ctx.defPlaysThisMatch ?? 0) === 1 ? '' : 's'}).` });
  }
  // Takeaway Machine: season-long Big Play compounder for defense (Franchise QB analog).
  const takeawayGames = ctx.takeawayGames ?? 0;
  if (co.has('takeaway_machine') && takeawayGames > 0) {
    const mult = 1 + 0.05 * takeawayGames;
    bigPlay *= mult;
    ledger.push({ id: 'tm', kind: 'coordinator', stage: 'coordinator', channel: 'big_play', operation: 'multiply', value: mult, label: 'Takeaway Machine', detail: `Big Play ×${round2(mult)} (${takeawayGames} prior takeaway game${takeawayGames === 1 ? '' : 's'}).` });
  }
  // Power Sweep Coordinator: ground gets an in-game Big Play scaler (its missing
  // multiplicative path). groundBonusThisMatch accrues +6 per Ground & Pound, so
  // ÷6 is the count of prior ground plays this match.
  if (co.has('power_sweep') && concept === 'ground_pound') {
    const priorGround = Math.round(ctx.groundBonusThisMatch / 6);
    if (priorGround > 0) {
      const mult = round2(1 + 0.12 * priorGround);
      bigPlay *= mult;
      ledger.push({ id: 'ps', kind: 'coordinator', stage: 'coordinator', channel: 'big_play', operation: 'multiply', value: mult, label: 'Power Sweep Coordinator', detail: `Big Play ×${mult} (${priorGround} prior Ground & Pound${priorGround === 1 ? '' : 's'}).` });
    }
  }
  // Two-Minute Drill (Legendary): the FIRST stack play each drive RETRIGGERS — its
  // raw card yards are added a second time. "First this drive" = no concept has
  // been logged in conceptCountsThisDrive yet. This is the engine's retrigger
  // primitive (effectKindOf reads id === 'retrigger'). It is a COMMITMENT payoff:
  // it only fires once you've leveled a stack Game Plan, so it rewards committing
  // (not merely grabbing the coordinator) — keeping the "commit > grab" spine.
  const stackCommitted = (ctx.playbook?.stack_td ?? 0) > 0 || (ctx.playbook?.double_stack_bomb ?? 0) > 0;
  if (co.has('two_minute_drill') && isStack && stackCommitted) {
    const playsThisDrive = Object.values(ctx.conceptCountsThisDrive).reduce((s, n) => s + (n ?? 0), 0);
    if (playsThisDrive === 0) {
      const cardYards = cards.reduce((s, c) => s + c.value, 0);
      base += cardYards;
      ledger.push({ id: 'retrigger', kind: 'coordinator', stage: 'coordinator', channel: 'base', operation: 'add', value: cardYards, label: 'Two-Minute Drill', detail: `Retrigger — opening stack's ${cardYards} yards count twice.` });
    }
  }

  // ── Game Plan (leveled concept commitment) ──
  const lvl = ctx.playbook?.[concept] ?? 0;
  const step = GAME_PLAN_STEP[concept];
  if (lvl > 0 && step && concept !== 'busted_play') {
    if (step.base) base += lvl * step.base;
    if (step.exec) execution += lvl * step.exec;
    // Lane Big Play ramp (non-passing lanes): a multiplicative path so a committed
    // ground / mobile / defense plan keeps pace with the late-season curve.
    if (step.big) { const lm = round2(1 + lvl * step.big); bigPlay *= lm; }
    let detail = `${playName} Lv${lvl}`;
    if (lvl >= 2) {
      const xm = round2(1 + GAME_PLAN_COMMIT_XMULT * (lvl - 1));
      bigPlay *= xm;
      detail += ` — commit ×${xm} Big Play`;
    } else if (step.big) {
      detail += ` — ×${round2(1 + lvl * step.big)} Big Play`;
    }
    ledger.push({ id: 'pb', kind: 'coordinator', stage: 'playbook', channel: lvl >= 2 || step.big ? 'big_play' : step.base ? 'base' : 'execution', operation: lvl >= 2 || step.big ? 'multiply' : 'add', value: lvl, label: `Game Plan Lv${lvl}`, detail });
  }

  // ── Player Traits (card modifiers) ──
  // Clutch: late-game Base spike (final drive or championship).
  if (ctx.driveIndex === 2 || ctx.championship === true) {
    const clutch = cards.filter((c) => c.modifier === 'clutch').length;
    if (clutch > 0) { const add = clutch * 20; base += add; ledger.push({ id: 'clutch', kind: 'base', stage: 'cards', channel: 'base', operation: 'add', value: add, label: 'Clutch', detail: `+${add} Base — late-game heroics.` }); }
  }
  // Explosive: extra Big Play on a clean concept, one stack per Explosive card.
  if (concept !== 'busted_play') {
    const explosive = cards.filter((c) => c.modifier === 'explosive').length;
    if (explosive > 0) { const m = round2(1 + 0.1 * explosive); bigPlay *= m; ledger.push({ id: 'explosive', kind: 'big_play', stage: 'cards', channel: 'big_play', operation: 'multiply', value: m, label: 'Explosive', detail: `Big Play ×${m} (${explosive} Explosive card${explosive === 1 ? '' : 's'}).` }); }
  }

  // ── Busted play penalty (salvaged by Broken Play Artist or a Reliable card) ──
  if (concept === 'busted_play') {
    if (co.has('broken_play') && qbRuns.length > 0) {
      // Broken Play Artist: turn a stranded QB-run draw into a positive scramble.
      concept = 'designed_run'; playName = 'Scramble'; flavor = 'Broken play — the QB improvises a positive gain.';
      base += 32;
      ledger.push({ id: 'broken', kind: 'coordinator', stage: 'adjustment', channel: 'base', operation: 'add', value: 32, label: 'Broken Play Artist', detail: 'Salvaged into a scramble — no penalty, +32 Base.' });
    } else if (cards.some((c) => c.modifier === 'reliable')) {
      ledger.push({ id: 'reliable', kind: 'coordinator', stage: 'adjustment', channel: 'big_play', operation: 'set', value: 1, label: 'Reliable', detail: 'A reliable player salvaged the play — no busted penalty.' });
    } else {
      bigPlay *= 0.5; ledger.push({ id: 'busted', kind: 'big_play', stage: 'adjustment', channel: 'big_play', operation: 'penalty', value: 0.5, label: 'No Concept', detail: 'Mismatched cards — Big Play ×0.5.' });
    }
  }

  // ── Environment ──
  if (env === 'dome' && isStack) { base *= 1.15; ledger.push({ id: 'env', kind: 'environment', stage: 'environment', channel: 'base', operation: 'multiply', value: 1.15, label: FB_ENVIRONMENTS.dome.label, detail: 'Passing +15% Base.' }); }
  if (env === 'snow') {
    if (isStack) { base *= 0.8; ledger.push({ id: 'env', kind: 'environment', stage: 'environment', channel: 'base', operation: 'penalty', value: 0.8, label: FB_ENVIRONMENTS.snow.label, detail: 'Passing -20% Base.' }); }
    else if (runs.length > 0) { base *= 1.2; ledger.push({ id: 'env', kind: 'environment', stage: 'environment', channel: 'base', operation: 'multiply', value: 1.2, label: FB_ENVIRONMENTS.snow.label, detail: 'Ground +20% Base.' }); }
  }
  if (env === 'primetime') { bigPlay *= 1.2; ledger.push({ id: 'env', kind: 'environment', stage: 'environment', channel: 'big_play', operation: 'multiply', value: 1.2, label: FB_ENVIRONMENTS.primetime.label, detail: 'Big Play ×1.2.' }); }

  // ── Opposing defensive scheme (Boss Blind analog) ──
  if (scheme === 'no_fly_zone') {
    if (concept === 'double_stack_bomb' || concept === 'shootout_stack') {
      const f = soften(0.78); bigPlay *= f;
      ledger.push({ id: 'boss', kind: 'boss', stage: 'boss', channel: 'big_play', operation: 'penalty', value: f, label: FB_BOSS_SCHEMES.no_fly_zone.label, detail: `Deep stack counter — Big Play ×${f}${protectedInPlay ? ' (Protected).' : '.'}` });
    } else if (concept === 'stack_td' || concept === 'checkdown') {
      execution += 0.15;
      ledger.push({ id: 'boss', kind: 'boss', stage: 'boss', channel: 'execution', operation: 'add', value: 0.15, label: FB_BOSS_SCHEMES.no_fly_zone.label, detail: 'Short passing window — Execution +0.15.' });
    }
  }
  if (scheme === 'stacked_box') {
    if (concept === 'ground_pound' || concept === 'designed_run' || concept === 'qb_keeper') {
      const f = soften(0.82); base *= f;
      ledger.push({ id: 'boss', kind: 'boss', stage: 'boss', channel: 'base', operation: 'penalty', value: f, label: FB_BOSS_SCHEMES.stacked_box.label, detail: `Run fit is loaded — Base ×${f}${protectedInPlay ? ' (Protected).' : '.'}` });
    } else if (isStack) {
      execution += 0.12;
      ledger.push({ id: 'boss', kind: 'boss', stage: 'boss', channel: 'execution', operation: 'add', value: 0.12, label: FB_BOSS_SCHEMES.stacked_box.label, detail: 'Play-action window — Execution +0.12.' });
    }
  }
  if (scheme === 'turnover_drill') {
    if (defense.length > 0) {
      const f = soften(0.75); bigPlay *= f;
      ledger.push({ id: 'boss', kind: 'boss', stage: 'boss', channel: 'big_play', operation: 'penalty', value: f, label: FB_BOSS_SCHEMES.turnover_drill.label, detail: `Ball security emphasis — defensive Big Play ×${f}${protectedInPlay ? ' (Protected).' : '.'}` });
    } else if (concept !== 'busted_play' && kicks.length === 0) {
      execution += 0.1;
      ledger.push({ id: 'boss', kind: 'boss', stage: 'boss', channel: 'execution', operation: 'add', value: 0.1, label: FB_BOSS_SCHEMES.turnover_drill.label, detail: 'Clean offense — Execution +0.10.' });
    }
  }

  // ── Matchup edge (favorable pre-snap look) ──
  // The new gameplay hook: the same hand scores BETTER when the defense's look is
  // wrong for it. Reads the presentation (defaults to the scheme's mapping). The
  // "weak vs" side is the boss block above; this is the additive "strong vs" side.
  if (concept !== 'busted_play') {
    const pres = ctx.presentation ?? presentationForScheme(scheme);
    const edge = presentationEdge(concept, pres);
    if (edge) {
      if (edge.base !== 1) { base *= edge.base; ledger.push({ id: 'matchup', kind: 'matchup', stage: 'boss', channel: 'base', operation: 'multiply', value: edge.base, label: 'Pre-Snap Edge', detail: `${edge.note} — Base ×${edge.base}.` }); }
      if (edge.exec) { execution += edge.exec; ledger.push({ id: 'matchup', kind: 'matchup', stage: 'boss', channel: 'execution', operation: 'add', value: edge.exec, label: 'Pre-Snap Edge', detail: `${edge.note} — Execution +${edge.exec}.` }); }
      if (edge.big !== 1) { bigPlay *= edge.big; ledger.push({ id: 'matchup', kind: 'matchup', stage: 'boss', channel: 'big_play', operation: 'multiply', value: edge.big, label: 'Pre-Snap Edge', detail: `${edge.note} — Big Play ×${edge.big}.` }); }
    }
  }

  // ── Anti-spam (defense adjusts to repeated concepts this drive) ──
  const repeats = ctx.conceptCountsThisDrive[concept] ?? 0;
  if (repeats > 0 && concept !== 'busted_play') {
    const factor = Math.pow(scheme === 'adaptive_dc' ? 0.72 : 0.85, repeats);
    bigPlay *= factor;
    ledger.push({ id: 'spam', kind: 'spam', stage: 'adjustment', channel: 'big_play', operation: 'penalty', value: factor, label: scheme === 'adaptive_dc' ? FB_BOSS_SCHEMES.adaptive_dc.label : 'Defense Adjusted', detail: `Repeated ${playName} ×${round2(factor)} (call something else).` });
  }

  base = r(base);
  execution = round2(execution);
  bigPlay = round2(bigPlay);
  const total = Math.max(0, Math.floor(base * (1 + execution) * bigPlay));
  ledger.push({ id: 'final', kind: 'final', stage: 'final', channel: 'base', operation: 'set', value: total, label: 'Play Total', detail: `${base} × (1 + ${execution}) × ${bigPlay}.` });

  return { valid: concept !== 'busted_play', concept, playName, flavor, base, execution, bigPlay, total, cost, ledger };
}

// ── Deck helpers ────────────────────────────────────────────────────────────
export function shuffle<T>(arr: T[], rng: RNG = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomEnvironment(rng: RNG = Math.random): FbEnvironmentKey {
  return weightedKey(FB_ENVIRONMENT_WEIGHTS, rng);
}

export function driveTargets(env: FbEnvironmentKey): number[] {
  const scale = env === 'primetime' ? 1.2 : 1;
  return DRIVE_TARGET.map((t) => Math.round(t * scale));
}

// ── Free-agent cards (for the reward shop) ──────────────────────────────────
export type FreeAgentKey = 'deep_wr' | 'bell_rb' | 'shutdown_dst' | 'value_slot' | 'gunslinger' | 'scrambler';

interface FreeAgentDef { name: string; team: string; position: FbPosition; action: FbActionType; value: number; cost: number; label: string; }

const FREE_AGENTS: Record<FreeAgentKey, FreeAgentDef> = {
  deep_wr: { name: 'D. Vaughn', team: 'IRN', position: 'WR', action: 'deep_catch', value: 88, cost: 3, label: 'Deep Catch' },
  bell_rb: { name: 'M. Stokes', team: 'IRN', position: 'RB', action: 'power_run', value: 64, cost: 2, label: 'Power Run' },
  shutdown_dst: { name: 'Ironhawks D', team: 'IRN', position: 'DST', action: 'interception', value: 80, cost: 3, label: 'Interception' },
  value_slot: { name: 'R. Pike', team: 'IRN', position: 'WR', action: 'short_catch', value: 40, cost: 1, label: 'Quick Catch' },
  gunslinger: { name: 'A. Royce', team: 'IRN', position: 'QB', action: 'deep_pass', value: 70, cost: 3, label: 'Deep Ball' },
  scrambler: { name: 'J. Knox', team: 'IRN', position: 'QB', action: 'scramble', value: 58, cost: 2, label: 'Scramble' },
};

export const FREE_AGENT_KEYS: FreeAgentKey[] = ['deep_wr', 'bell_rb', 'shutdown_dst', 'value_slot', 'gunslinger', 'scrambler'];

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
  qb_keeper: 'QB Keeper',
  designed_run: 'Designed Run',
  checkdown: 'Checkdown',
  field_goal: 'Field Goal',
  pick_six: 'Pick Six',
  takeaway: 'Takeaway',
  sack: 'Sack',
};
