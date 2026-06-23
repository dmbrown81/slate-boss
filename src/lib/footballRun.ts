// Gridiron — season run state + the post-game reward loop.
// A run is a season of games; clear them all to win the championship.

import {
  buildTeamDeck, driveTargets, createFreeAgentCard, TEAM_PROFILES, TEAM_ARCHETYPES,
  FB_COORDINATORS, MAX_COORDINATORS, AUDIBLES_PER_DRIVE, FB_CONCEPT_LABEL, FB_CARD_MODIFIERS,
  scoreFootballPlay, shuffle,
  FREE_AGENT_KEYS,
  type FbBossSchemeKey, type FbCard, type FbCardModifier, type FbCoordinatorKey, type FbPlaybook, type FbEnvironmentKey, type FbConceptKey, type FreeAgentKey, type TeamArchetype,
} from './footballRogue';
import { STARTING_FUNDS, INTEREST_CAP } from './gridironEconomy';
import { mulberry32, stringSeed, type RNG } from './rng';

export const SEASON_GAMES = 5;

export interface FbRunState {
  gameNumber: number;        // 1..SEASON_GAMES — the game you're about to play
  seed: number;              // deterministic season seed for weather / bosses / rewards
  team: TeamArchetype;       // which starting class this run was built from
  deck: FbCard[];
  coordinators: FbCoordinatorKey[];
  playbook: FbPlaybook;
  bombGames: number;         // games in which you landed a Bomb (Franchise QB)
  keeperGames: number;       // games in which you landed a QB Keeper (The Improviser)
  takeawayGames: number;     // games with 2+ takeaways (Takeaway Machine)
  funds: number;             // Front Office Funds — the between-game economy
  upgrades: FrontOfficeKey[]; // run-persistent rule upgrades (the Voucher analog)
  status: 'playing' | 'won' | 'lost';
}

export function createGridironSeed(label = 'season'): number {
  return stringSeed(`gridiron:${label}:${Date.now()}:${Math.random()}`);
}

export function runRng(run: Pick<FbRunState, 'seed' | 'team' | 'gameNumber'>, scope: string): RNG {
  return mulberry32(stringSeed(`gridiron:${run.seed}:${run.team}:g${run.gameNumber}:${scope}`));
}

export function createRun(team: TeamArchetype = 'balanced', seed = createGridironSeed(team)): FbRunState {
  const profile = TEAM_PROFILES[team];
  return {
    gameNumber: 1,
    seed,
    team,
    deck: buildTeamDeck(team).cards,
    coordinators: [...profile.startingCoordinators],
    playbook: {},
    bombGames: 0,
    keeperGames: 0,
    takeawayGames: 0,
    funds: STARTING_FUNDS,
    upgrades: [],
    status: 'playing',
  };
}

export function isChampionship(gameNumber: number): boolean {
  return gameNumber >= SEASON_GAMES;
}

// The Daily Scrimmage is a fixed assignment: the seed (a UTC-date hash) picks the
// team deterministically, so everyone playing today's daily gets the same team,
// weather, and bosses. This is what turns the daily from a replayable seed into a
// ritual ("today you're the Volts").
export function dailyTeamForSeed(seed: number): TeamArchetype {
  return TEAM_ARCHETYPES[seed % TEAM_ARCHETYPES.length];
}

// Targets escalate across the season; the championship gets an extra bump.
export function gameTargets(env: FbEnvironmentKey, gameNumber: number): number[] {
  const base = driveTargets(env);
  const champ = isChampionship(gameNumber) ? 1.32 : 1;
  // GEOMETRIC escalation (Balatro-style): targets compound ~24%/game, so flat
  // Base/Execution plateaus and a committed multiplicative engine is REQUIRED to
  // keep pace late. This is the early-flat → late-multiplicative power curve.
  const scale = Math.pow(1.24, gameNumber - 1) * champ;
  return base.map((t) => Math.round(t * scale));
}

// ── Rewards ─────────────────────────────────────────────────────────────────
export type RewardKind = 'card' | 'coordinator' | 'playbook' | 'trim' | 'upgrade' | 'training';

export interface Reward {
  id: string;
  kind: RewardKind;
  emoji: string;
  title: string;
  detail: string;
  cost: number;            // Front Office Funds to buy in the War Room
  apply: (run: FbRunState) => FbRunState;
}

// War Room price list (tune via the balance harness). Coordinators come in two
// tiers; the season-scaling Franchise QB is the premium keystone.
export const REWARD_COST: Record<RewardKind, number> = {
  card: 3, coordinator: 5, playbook: 5, trim: 4, upgrade: 3, training: 3,
};
// The season-long compounders are the premium keystones, priced like Franchise QB.
const RARE_COORDINATORS = new Set<FbCoordinatorKey>(['franchise_qb', 'improviser', 'takeaway_machine']);

const FA_TITLE: Record<FreeAgentKey, { emoji: string; title: string; detail: string }> = {
  deep_wr: { emoji: '🎯', title: 'Sign a Deep Threat', detail: 'Add a $3 WR Deep Catch (88) to your deck.' },
  bell_rb: { emoji: '🐂', title: 'Sign a Bell-Cow RB', detail: 'Add a $2 Power Run (64) to your deck.' },
  shutdown_dst: { emoji: '🛡️', title: 'Sign a Ball-Hawk', detail: 'Add a $3 Interception (80) to your deck.' },
  value_slot: { emoji: '💸', title: 'Sign a Value Slot', detail: 'Add a $1 Quick Catch (40) — cheap, flexible.' },
  gunslinger: { emoji: '🚀', title: 'Sign a Gunslinger', detail: 'Add a $3 QB Deep Ball (70) to your deck.' },
  scrambler: { emoji: '🏃', title: 'Sign a Dual-Threat QB', detail: 'Add a $2 QB Scramble (58) — fuels the keeper game.' },
};

function includesKey<T extends string>(keys: readonly T[], value: string): value is T {
  return (keys as readonly string[]).includes(value);
}

const HYDRATABLE_PLAYBOOK_CONCEPTS: readonly FbConceptKey[] = [
  'double_stack_bomb',
  'stack_td',
  'checkdown',
  'ground_pound',
  'qb_keeper',
  'field_goal',
  'pick_six',
  'takeaway',
];

function cardReward(key: FreeAgentKey): Reward {
  const t = FA_TITLE[key];
  return {
    id: `card-${key}`, kind: 'card', emoji: t.emoji, title: t.title, detail: t.detail, cost: REWARD_COST.card,
    apply: (run) => ({ ...run, deck: [...run.deck, createFreeAgentCard(key)] }),
  };
}

function coordinatorReward(key: FbCoordinatorKey): Reward {
  const c = FB_COORDINATORS[key];
  return {
    id: `coord-${key}`, kind: 'coordinator', emoji: '🧠', title: `Hire: ${c.name}`, detail: c.description,
    cost: RARE_COORDINATORS.has(key) ? 7 : REWARD_COST.coordinator,
    apply: (run) => ({ ...run, coordinators: [...run.coordinators, key] }),
  };
}

// A "Game Plan" reward levels a concept (+1). Levels compound: more Execution
// each level, plus a growing Big Play multiplier once it's your core play — so
// stacking levels on ONE concept is how you commit and snowball.
function playbookReward(concept: FbConceptKey, nextLevel: number): Reward {
  const name = FB_CONCEPT_LABEL[concept] ?? concept;
  const commit = nextLevel >= 2 ? ' (now compounding Big Play)' : '';
  return {
    id: `pb-${concept}`, kind: 'playbook', emoji: '📘',
    title: `Game Plan: ${name} → Lv ${nextLevel}`,
    detail: `Permanently level up ${name}: more scoring every time you call it${commit}. Stack it to ride one strategy all season.`,
    cost: REWARD_COST.playbook,
    apply: (run) => ({ ...run, playbook: { ...run.playbook, [concept]: (run.playbook[concept] ?? 0) + 1 } }),
  };
}

const TRIM: Reward = {
  id: 'trim', kind: 'trim', emoji: '✂️', title: 'Trim the Playbook', detail: 'Cut your 3 lowest-value cards so you draw your best ones more often.', cost: REWARD_COST.trim,
  apply: (run) => {
    const sorted = [...run.deck].sort((a, b) => a.value - b.value);
    const cutIds = new Set(sorted.slice(0, 3).map((c) => c.id));
    return { ...run, deck: run.deck.filter((c) => !cutIds.has(c.id)) };
  },
};

const STRENGTH: Reward = {
  id: 'upgrade', kind: 'upgrade', emoji: '💪', title: 'Strength & Conditioning', detail: '+14 Base to your 4 cheapest cards.', cost: REWARD_COST.upgrade,
  apply: (run) => {
    const cheapIds = new Set([...run.deck].sort((a, b) => a.cost - b.cost || a.value - b.value).slice(0, 4).map((c) => c.id));
    return { ...run, deck: run.deck.map((c) => (cheapIds.has(c.id) ? { ...c, value: c.value + 14 } : c)) };
  },
};

// ── Training rewards (apply a Player Trait to one card) ──────────────────────
// The buyer just commits to a trait; we pick the BEST-FIT untagged card
// deterministically (no card-picker UI needed yet), so the reward is honest and
// readable. Targeting heuristics live in `trainingTarget`.
const TRAINING_META: Record<FbCardModifier, { emoji: string; title: string }> = {
  explosive:  { emoji: '💥', title: 'Deep Threat Package' },
  reliable:   { emoji: '🧱', title: 'Training Camp' },
  discounted: { emoji: '📝', title: 'Contract Rework' },
  clutch:     { emoji: '⏱️', title: 'Clutch Reps' },
  protected:  { emoji: '🛡️', title: 'Boss Prep' },
  hot_route:  { emoji: '🔀', title: 'Route Tree Upgrade' },
};

function trainingTarget(deck: FbCard[], modifier: FbCardModifier): FbCard | undefined {
  const open = deck.filter((c) => !c.modifier);
  if (open.length === 0) return undefined;
  const byValue = (pred: (c: FbCard) => boolean) => [...open].filter(pred).sort((a, b) => b.value - a.value)[0];
  if (modifier === 'explosive') return byValue((c) => c.side === 'catch' || c.side === 'pass') ?? byValue(() => true);
  if (modifier === 'discounted') return [...open].sort((a, b) => b.cost - a.cost || b.value - a.value)[0];
  if (modifier === 'hot_route') return byValue((c) => c.side === 'catch') ?? byValue(() => true);
  if (modifier === 'protected') return byValue((c) => c.side === 'pass' || c.side === 'run') ?? byValue(() => true);
  // reliable / clutch: the card you most want to keep alive late — your best.
  return byValue(() => true);
}

function trainingReward(modifier: FbCardModifier): Reward {
  const meta = TRAINING_META[modifier];
  const mod = FB_CARD_MODIFIERS[modifier];
  return {
    id: `train-${modifier}`, kind: 'training', emoji: meta.emoji,
    title: meta.title, detail: `Give a fitting card the ${mod.label} trait: ${mod.description}`, cost: REWARD_COST.training,
    apply: (run) => {
      const target = trainingTarget(run.deck, modifier);
      if (!target) return run;
      return { ...run, deck: run.deck.map((c) => (c.id === target.id ? { ...c, modifier } : c)) };
    },
  };
}

export function rewardFromId(id: string, run: FbRunState): Reward | null {
  if (id === TRIM.id) return TRIM;
  if (id === STRENGTH.id) return STRENGTH;

  if (id.startsWith('card-')) {
    const key = id.slice(5);
    return includesKey(FREE_AGENT_KEYS, key) ? cardReward(key) : null;
  }

  if (id.startsWith('coord-')) {
    const key = id.slice(6);
    const coordKeys = Object.keys(FB_COORDINATORS) as FbCoordinatorKey[];
    return includesKey(coordKeys, key) ? coordinatorReward(key) : null;
  }

  if (id.startsWith('pb-')) {
    const concept = id.slice(3);
    return includesKey(HYDRATABLE_PLAYBOOK_CONCEPTS, concept)
      ? playbookReward(concept, (run.playbook[concept] ?? 0) + 1)
      : null;
  }

  if (id.startsWith('train-')) {
    const modifier = id.slice(6);
    const modifierKeys = Object.keys(FB_CARD_MODIFIERS) as FbCardModifier[];
    return includesKey(modifierKeys, modifier) ? trainingReward(modifier) : null;
  }

  return null;
}

type Lean = 'pass' | 'run' | 'def' | 'mobile';
function deckLean(deck: FbCard[]): Lean {
  // Count the IDENTITY signal of each lane, not raw card volume. Catches are
  // shared support (every team carries a pile of them), so they don't vote — a
  // QB-pass card drives the stack game, a run card the ground game, etc. Counting
  // catches as "pass" made every deck read pass-lean (the ground/defense teams
  // included), which then starved their on-lane reward shelves.
  let p = 0, r = 0, d = 0, qb = 0;
  for (const c of deck) {
    if (c.action === 'scramble' || c.action === 'qb_sneak') qb++;
    else if (c.side === 'pass') p++;
    else if (c.side === 'run') r++;
    else if (c.side === 'defense') d++;
  }
  // A dual-threat deck (heavy on QB-run cards) is its OWN lane — it should be
  // pushed toward the keeper engine, not played as a worse passing deck. The
  // threshold is high (only the Volts build clears it at 6) so a pocket-QB deck
  // with an incidental scramble or two is NOT dragged onto the mobile lane.
  if (qb >= 5 && qb >= d) return 'mobile';
  return d > p && d > r ? 'def' : r > p ? 'run' : 'pass';
}

const LEAN_COORD: Record<Lean, FbCoordinatorKey[]> = {
  pass: ['franchise_qb', 'air_raid', 'west_coast'],
  run: ['bell_cow', 'salary_wizard'],
  def: ['takeaway_machine', 'pressure_chain', 'ball_hawk'],
  mobile: ['improviser', 'read_option', 'broken_play'],
};
const LEAN_PB: Record<Lean, FbConceptKey[]> = {
  pass: ['double_stack_bomb', 'stack_td', 'checkdown'],
  run: ['ground_pound', 'field_goal'],
  def: ['pick_six', 'takeaway'],
  mobile: ['qb_keeper', 'stack_td'],
};
const LEAN_CARD: Record<Lean, FreeAgentKey[]> = {
  pass: ['deep_wr', 'gunslinger', 'value_slot'],
  run: ['bell_rb'],
  def: ['shutdown_dst'],
  mobile: ['scrambler'],
};
const LEAN_TRAINING: Record<Lean, FbCardModifier> = {
  // Each lean gets a trait that scales ITS identity: pass → ceiling, run →
  // tempo, def → a Big-Play scaler for splash plays, mobile → late-game heroics.
  pass: 'explosive', run: 'discounted', def: 'explosive', mobile: 'clutch',
};

function firstAvailableCoord(lean: Lean, owned: FbCoordinatorKey[]): FbCoordinatorKey | null {
  const ordered = [...LEAN_COORD[lean], ...(Object.keys(FB_COORDINATORS) as FbCoordinatorKey[])];
  return ordered.find((k) => !owned.includes(k)) ?? null;
}

// Offer 3 rewards built around the player's deck lean:
//   1) a KEYSTONE engine piece (a scaling coordinator, or a Game-Plan level),
//   2) the COMMITMENT lever — level your core Game Plan (stack it to snowball),
//   3) a flex stabilizer.
// The skill is committing: stack one Game Plan + the coordinators that feed it.
export function generateRewards(run: FbRunState, rng: RNG = Math.random): Reward[] {
  const lean = deckLean(run.deck);
  const primary = LEAN_PB[lean][0];
  const secondary = LEAN_PB[lean][1] ?? primary;
  const lvl = (c: FbConceptKey) => run.playbook[c] ?? 0;
  const picks: Reward[] = [];

  // 1) Keystone
  const coord = run.coordinators.length < effectiveMaxCoordinators(run) ? firstAvailableCoord(lean, run.coordinators) : null;
  if (coord && rng() < 0.6) picks.push(coordinatorReward(coord));
  else picks.push(playbookReward(primary, lvl(primary) + 1));

  // 2) Commitment lever — level a Game Plan you can ride
  const slot2 = picks[0].id === `pb-${primary}` ? secondary : primary;
  picks.push(playbookReward(slot2, lvl(slot2) + 1));

  // 3) Flex stabilizer — value, consistency, a free agent, or a Player Trait.
  const flex: Reward[] = [STRENGTH, trainingReward(LEAN_TRAINING[lean])];
  if (run.deck.length > 26) flex.push(TRIM); else flex.push(cardReward(LEAN_CARD[lean][0]));
  picks.push(shuffle(flex, rng)[0]);

  // 4) Optional extra slot from the "Bigger Front Office" upgrade. Gated on the
  // upgrade so a fresh run (and the balance harness) sees exactly 3 — no drift.
  if (warRoomRewardSlots(run) > picks.length) {
    const used = new Set(picks.map((p) => p.id));
    const extras: Reward[] = [STRENGTH, TRIM, cardReward(LEAN_CARD[lean][0]), trainingReward(LEAN_TRAINING[lean])];
    const extra = extras.find((r) => !used.has(r.id));
    if (extra) picks.push(extra);
  }

  return shuffle(picks, rng);
}

export function deckValueSummary(deck: FbCard[]): { size: number; avgValue: number; avgCost: number } {
  const size = deck.length;
  const avgValue = size ? Math.round(deck.reduce((s, c) => s + c.value, 0) / size) : 0;
  const avgCost = size ? Math.round((deck.reduce((s, c) => s + c.cost, 0) / size) * 10) / 10 : 0;
  return { size, avgValue, avgCost };
}

export function topGamePlan(playbook: FbPlaybook): { concept: FbConceptKey; level: number; label: string } | null {
  const top = (Object.entries(playbook) as [FbConceptKey, number][])
    .filter(([, level]) => level > 0)
    .sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return { concept: top[0], level: top[1], label: FB_CONCEPT_LABEL[top[0]] ?? top[0] };
}

export function buildIdentity(run: Pick<FbRunState, 'deck' | 'playbook'>): { title: string; detail: string; concept: FbConceptKey | null; level: number; tag: string } {
  const top = topGamePlan(run.playbook);
  if (top) {
    const online = top.level >= 2 ? 'Big Play engine online' : 'flat scoring unlocked';
    return {
      title: `${top.label} Team`,
      detail: `Lv${top.level} Game Plan — ${online}. Keep drafting cards and coordinators that trigger it.`,
      concept: top.concept,
      level: top.level,
      tag: top.level >= 2 ? 'Engine online' : 'Commit next',
    };
  }
  const lean = deckLean(run.deck);
  if (lean === 'run') return { title: 'Ground Game Starter', detail: 'No Game Plan yet. Level Ground & Pound to turn carries into an engine.', concept: 'ground_pound', level: 0, tag: 'Pick a plan' };
  if (lean === 'def') return { title: 'Defensive Starter', detail: 'No Game Plan yet. Level Pick Six or Takeaway if defense becomes your identity.', concept: 'pick_six', level: 0, tag: 'Pick a plan' };
  if (lean === 'mobile') return { title: 'Dual-Threat Starter', detail: 'No Game Plan yet. Level QB Keeper and hire the Read-Option/Improviser staff to make scrambles scale.', concept: 'qb_keeper', level: 0, tag: 'Pick a plan' };
  return { title: 'Air Raid Starter', detail: 'No Game Plan yet. Level Stack TD or Double-Stack Bomb to make QB stacks scale.', concept: 'double_stack_bomb', level: 0, tag: 'Pick a plan' };
}

export interface CoachDebrief {
  title: string;
  takeaway: string;
  nextFocus: string;
  tags: { label: string; value: string }[];
}

export function buildCoachDebrief(run: FbRunState, won: boolean, gamesWon: number, lostDrive: number): CoachDebrief {
  const identity = buildIdentity(run);
  const deck = deckValueSummary(run.deck);
  const lean = deckLean(run.deck);
  const topPlan = topGamePlan(run.playbook);
  const scalingCoordinators = run.coordinators.filter((key) => FB_COORDINATORS[key].scaling !== 'flat').length;
  const coreOnline = identity.level >= 2;
  const concept = topPlan?.label ?? (identity.concept ? FB_CONCEPT_LABEL[identity.concept] ?? identity.concept : 'a core concept');

  const tags = [
    { label: 'Build', value: identity.tag },
    { label: 'Deck', value: `${deck.size} cards / $${deck.avgCost}` },
    { label: 'Scalers', value: `${scalingCoordinators}` },
  ];

  if (won) {
    return {
      title: 'Coach Debrief',
      takeaway: coreOnline
        ? `Your ${concept} engine came online and kept scaling into the Championship.`
        : `You won with flexible value, but the build never fully committed to one compounding concept.`,
      nextFocus: lean === 'pass'
        ? 'Next run, test how far the pass engine can go when you add a second support plan for No-Fly Zone.'
        : lean === 'run'
          ? 'Next run, pair the ground plan with one passing escape hatch so Stacked Box cannot freeze you.'
          : 'Next run, keep the defensive spike plan but draft a steadier offensive floor earlier.',
      tags,
    };
  }

  if (!coreOnline) {
    return {
      title: 'Coach Debrief',
      takeaway: `The season ended before a Lv2 Game Plan turned ${concept} into a true multiplier. Flat value fades late.`,
      nextFocus: 'Prioritize one Game Plan by the second War Room, then draft cards and coordinators that trigger it repeatedly.',
      tags: [...tags, { label: 'Stalled', value: `G${gamesWon + 1} D${lostDrive}` }],
    };
  }

  if (run.coordinators.length < 4) {
    return {
      title: 'Coach Debrief',
      takeaway: `The ${concept} plan was online, but the staff room was thin for late-season scaling.`,
      nextFocus: 'Buy one more on-lean coordinator before over-upgrading cards; staff multipliers carry better into Game 4 and 5.',
      tags: [...tags, { label: 'Stalled', value: `G${gamesWon + 1} D${lostDrive}` }],
    };
  }

  if (deck.avgCost >= 2.6) {
    return {
      title: 'Coach Debrief',
      takeaway: `The build had power, but the deck got expensive enough to squeeze the Play Budget.`,
      nextFocus: 'Look for Discounted traits, value-slot cards, or a trim so your best concept can be called more often per drive.',
      tags: [...tags, { label: 'Stalled', value: `G${gamesWon + 1} D${lostDrive}` }],
    };
  }

  return {
    title: 'Coach Debrief',
    takeaway: `The ${concept} engine existed, but the final deck needed a cleaner supporting plan into boss counters.`,
    nextFocus: lean === 'def'
      ? 'Add one safe offensive concept so Turnover Drill cannot shut off your entire scoring path.'
      : 'Add one backup concept that scores through the boss your main plan hates most.',
    tags: [...tags, { label: 'Stalled', value: `G${gamesWon + 1} D${lostDrive}` }],
  };
}

// ── Loss attribution (presentation-only; derived from run state) ─────────────
// Balatro losses land because they read as "I built wrong," not "the game
// cheated." This turns the final run state into a ranked set of CONCRETE reasons
// the season ended — every bullet cites a real number, no generic "play better."
// Two builds that lose differently produce different bullets. No engine math.
export interface LossReason { label: string; detail: string; severity: number; }

export function buildLossReasons(run: FbRunState, gamesWon: number, lostDrive: number): LossReason[] {
  const deck = deckValueSummary(run.deck);
  const top = topGamePlan(run.playbook);
  const scalers = run.coordinators.filter((key) => FB_COORDINATORS[key].scaling !== 'flat').length;
  const traits = run.deck.filter((c) => c.modifier).length;
  const candidates: LossReason[] = [];

  // Commitment — the strategic spine. The single biggest predictor of a loss.
  if (!top) {
    candidates.push({ severity: 100, label: 'No Game Plan committed', detail: 'You never leveled a concept. Targets compound about 24% per game, so flat value alone plateaus — usually by Game 3.' });
  } else if (top.level < 2) {
    candidates.push({ severity: 90, label: `${top.label} stalled at Lv${top.level}`, detail: 'A Game Plan only becomes a multiplier at Lv2+. Yours never switched on its compounding Big Play.' });
  }

  // Scaling staff — flat coordinators don't grow into the late curve.
  if (scalers < 2) {
    candidates.push({ severity: 78, label: `Only ${scalers} scaling coordinator${scalers === 1 ? '' : 's'}`, detail: 'Flat staff stay flat. Late games need within-game or season ramps (Air Raid, Franchise QB, Pressure Chain…) to keep pace.' });
  }

  // Budget pressure — an expensive deck means fewer calls per drive.
  if (deck.avgCost >= 2.6) {
    candidates.push({ severity: 64, label: `Deck averaged $${deck.avgCost} / card`, detail: 'Pricey cards squeezed your Play Budget — you could not fit enough calls per drive to reach the target.' });
  }

  // Draw dilution — a bloated deck buries the cards your plan needs.
  if (deck.size >= 28) {
    candidates.push({ severity: 52, label: `${deck.size}-card deck`, detail: 'A big deck draws your best concept less often. A Trim raises draw quality and consistency.' });
  }

  // Thin staff overall — leaves engine slots on the table.
  if (run.coordinators.length < 4) {
    candidates.push({ severity: 44, label: `${run.coordinators.length}-coordinator staff`, detail: 'You can run up to 5. A thin staff caps how high the engine can scale into Games 4 and 5.' });
  }

  // Stranded economy — unspent Funds are unbuilt power.
  if (run.funds >= 6) {
    candidates.push({ severity: 40, label: `$${run.funds} left unspent`, detail: 'Funds sitting in the Front Office are power you never built. Bank toward a keystone, but do not strand it.' });
  }

  // No developed players — traits are free ceiling + consistency.
  if (traits === 0) {
    candidates.push({ severity: 30, label: 'No developed players', detail: 'You never took a Training reward. Traits add ceiling (Explosive) and a safety net (Reliable).' });
  }

  // Always-present floor reason so the panel never shows fewer than a few bullets,
  // and a near-perfect build that still lost gets an honest "cold draw" read.
  candidates.push({ severity: 5, label: `Stalled on Drive ${lostDrive}, Game ${gamesWon + 1}`, detail: 'The drive ran out of Play Budget before the target. A cold hand happens — but a deeper engine survives one.' });

  return candidates.sort((a, b) => b.severity - a.severity).slice(0, 3);
}

function bestCard(deck: FbCard[], pred: (c: FbCard) => boolean, exclude = new Set<string>()): FbCard | undefined {
  return [...deck]
    .filter((c) => pred(c) && !exclude.has(c.id))
    .sort((a, b) => b.value - a.value || a.cost - b.cost)[0];
}

function representativeCards(deck: FbCard[], concept: FbConceptKey): FbCard[] | null {
  const used = new Set<string>();
  const take = (pred: (c: FbCard) => boolean) => {
    const card = bestCard(deck, pred, used);
    if (card) used.add(card.id);
    return card;
  };

  if (concept === 'double_stack_bomb' || concept === 'stack_td' || concept === 'shootout_stack') {
    const pass = take((c) => c.side === 'pass');
    if (!pass) return null;
    const catch1 = take((c) => c.side === 'catch' && c.team === pass.team);
    if (!catch1) return null;
    const cards = [pass, catch1];
    if (concept === 'double_stack_bomb' || concept === 'shootout_stack') {
      const catch2 = take((c) => c.side === 'catch' && c.team === pass.team);
      if (catch2) cards.push(catch2);
    }
    if (concept === 'shootout_stack') {
      const bringBack = take((c) => c.side === 'catch' && c.team !== pass.team);
      if (bringBack) cards.push(bringBack);
    }
    return cards;
  }

  if (concept === 'checkdown') {
    const pass = take((c) => c.side === 'pass');
    const check = take((c) => c.action === 'checkdown_catch');
    return pass && check ? [pass, check] : null;
  }

  if (concept === 'ground_pound') {
    const run1 = take((c) => c.action === 'power_run' || c.action === 'breakaway_run');
    const run2 = take((c) => c.action === 'power_run' || c.action === 'breakaway_run');
    return run1 && run2 ? [run1, run2] : null;
  }

  if (concept === 'qb_keeper') {
    const keep1 = take((c) => c.action === 'scramble' || c.action === 'qb_sneak');
    if (!keep1) return null;
    const keep2 = take((c) => c.action === 'scramble' || c.action === 'qb_sneak');
    return keep2 ? [keep1, keep2] : [keep1];
  }

  if (concept === 'field_goal') {
    const kick = take((c) => c.action === 'field_goal');
    return kick ? [kick] : null;
  }

  if (concept === 'pick_six') {
    const pick = take((c) => c.action === 'return_td');
    return pick ? [pick] : null;
  }

  if (concept === 'takeaway') {
    const takeaway = take((c) => c.action === 'interception');
    return takeaway ? [takeaway] : null;
  }

  return null;
}

export function estimateConceptScore(run: FbRunState, concept: FbConceptKey, bossScheme: FbBossSchemeKey = 'balanced'): number | null {
  const cards = representativeCards(run.deck, concept);
  if (!cards) return null;
  const result = scoreFootballPlay(cards, {
    coordinators: run.coordinators,
    environment: 'clear',
    bossScheme,
    stacksThisMatch: 1,
    groundBonusThisMatch: concept === 'ground_pound' ? 6 : 0,
    qbRunsThisMatch: concept === 'qb_keeper' ? 1 : 0,
    defPlaysThisMatch: concept === 'pick_six' || concept === 'takeaway' || concept === 'sack' ? 1 : 0,
    conceptCountsThisDrive: {},
    playbook: run.playbook,
    bombGames: run.bombGames,
    keeperGames: run.keeperGames,
    takeawayGames: run.takeawayGames,
  });
  return result.valid ? result.total : null;
}

export function rewardFitLabel(run: FbRunState, reward: Reward): string {
  const identity = buildIdentity(run);
  if (reward.kind === 'playbook' && reward.id === `pb-${identity.concept}`) return 'Feeds current plan';
  if (reward.kind === 'playbook') return identity.level ? 'Starts side plan' : 'Choose identity';
  if (reward.kind === 'coordinator') {
    if (identity.concept?.includes('stack') && ['coord-franchise_qb', 'coord-air_raid', 'coord-west_coast'].includes(reward.id)) return 'Feeds current plan';
    if (identity.concept === 'ground_pound' && ['coord-bell_cow', 'coord-salary_wizard'].includes(reward.id)) return 'Feeds current plan';
    if ((identity.concept === 'pick_six' || identity.concept === 'takeaway') && ['coord-ball_hawk', 'coord-pressure_chain', 'coord-takeaway_machine'].includes(reward.id)) return 'Feeds current plan';
    if (identity.concept === 'qb_keeper' && ['coord-read_option', 'coord-improviser', 'coord-broken_play'].includes(reward.id)) return 'Feeds current plan';
    return 'Engine piece';
  }
  if (reward.kind === 'trim') return 'Consistency';
  if (reward.kind === 'upgrade') return 'Flat value';
  if (reward.kind === 'training') return 'Develops a player';
  return 'Adds cards';
}

export function rewardImpact(run: FbRunState, reward: Reward, bossScheme: FbBossSchemeKey = 'balanced'): string {
  const after = reward.apply(run);
  if (reward.kind === 'playbook') {
    const concept = reward.id.slice(3) as FbConceptKey;
    const label = FB_CONCEPT_LABEL[concept] ?? concept;
    const beforeScore = estimateConceptScore(run, concept, bossScheme);
    const afterScore = estimateConceptScore(after, concept, bossScheme);
    if (beforeScore !== null && afterScore !== null) return `Sample ${label}: ${beforeScore} → ${afterScore}`;
    return `Levels ${label}; draft the matching cards to cash it in.`;
  }

  const identity = buildIdentity(run);
  if (identity.concept) {
    const beforeScore = estimateConceptScore(run, identity.concept, bossScheme);
    const afterScore = estimateConceptScore(after, identity.concept, bossScheme);
    if (beforeScore !== null && afterScore !== null && beforeScore !== afterScore) {
      return `Current plan sample: ${beforeScore} → ${afterScore}`;
    }
  }

  if (reward.kind === 'training') {
    const modifier = reward.id.slice(6) as FbCardModifier;
    const target = trainingTarget(run.deck, modifier);
    const mod = FB_CARD_MODIFIERS[modifier];
    return target ? `${target.label} (${target.playerName}) becomes ${mod.label}.` : 'No untrained card to develop.';
  }

  const beforeDeck = deckValueSummary(run.deck);
  const afterDeck = deckValueSummary(after.deck);
  if (reward.kind === 'card') return `Deck ${beforeDeck.size} → ${afterDeck.size}; avg yards ${beforeDeck.avgValue} → ${afterDeck.avgValue}.`;
  if (reward.kind === 'trim') return `Deck ${beforeDeck.size} → ${afterDeck.size}; draw your best cards more often.`;
  if (reward.kind === 'upgrade') return `Avg yards ${beforeDeck.avgValue} → ${afterDeck.avgValue}; helps early flat scoring.`;
  return 'Adds a scaling piece for the rest of the season.';
}

// ════════════════════════════════════════════════════════════════════════════
// DEPTH LAYER — Film Tools (Tarot analog) + Front Office Upgrades (Voucher analog)
//
// These add Balatro-style decision depth WITHOUT touching the scoring engine:
//   • Film Tools  = one-use deck/card mutations (cut, clone, develop, restructure).
//   • Front Office = run-persistent RULE upgrades (more staff, audibles, economy).
// They live in a SEPARATE War Room shelf, so the balance harness (which only
// pilots the 3 base reward slots) stays byte-identical and its numbers hold.
// Film Tools apply immediately on purchase (v1 — no in-match consumable tray yet).
// ════════════════════════════════════════════════════════════════════════════

// ── Film Tools ───────────────────────────────────────────────────────────────
export type FilmToolKey =
  | 'film_cut' | 'clone_tape' | 'bulk_up' | 'contract_restructure' | 'deep_threat'
  | 'reliable_hands' | 'explosive_pkg' | 'clutch_reps' | 'boss_prep' | 'hot_route_install';

export interface FilmTool {
  key: FilmToolKey;
  emoji: string;
  name: string;
  detail: string;
  cost: number;
  targeted: boolean;                     // does it need the player to pick a card?
  eligible: (c: FbCard) => boolean;      // valid targets (ignored when !targeted)
  apply: (run: FbRunState, targetId?: string) => FbRunState;
}

let filmCounter = 0;
function cloneFilmCard(c: FbCard): FbCard {
  filmCounter += 1;
  return { ...c, id: `${c.id}-film${filmCounter}` };
}
function mutateCard(run: FbRunState, targetId: string | undefined, fn: (c: FbCard) => FbCard): FbRunState {
  if (!targetId) return run;
  return { ...run, deck: run.deck.map((c) => (c.id === targetId ? fn(c) : c)) };
}
const untraited = (c: FbCard) => !c.modifier;

export const FILM_TOOLS: Record<FilmToolKey, FilmTool> = {
  film_cut: {
    key: 'film_cut', emoji: '✂️', name: 'Film Cut', cost: 3, targeted: false, eligible: () => true,
    detail: 'Cut your lowest-value card so your best plays come up more often.',
    apply: (run) => {
      const lowest = [...run.deck].sort((a, b) => a.value - b.value || a.cost - b.cost)[0];
      return lowest ? { ...run, deck: run.deck.filter((c) => c.id !== lowest.id) } : run;
    },
  },
  clone_tape: {
    key: 'clone_tape', emoji: '🎬', name: 'Clone the Tape', cost: 5, targeted: true, eligible: () => true,
    detail: 'Duplicate any card — draw your signature play more often.',
    apply: (run, id) => {
      const target = run.deck.find((c) => c.id === id);
      return target ? { ...run, deck: [...run.deck, cloneFilmCard(target)] } : run;
    },
  },
  bulk_up: {
    key: 'bulk_up', emoji: '🏋️', name: 'Bulk Up', cost: 3, targeted: true, eligible: () => true,
    detail: '+34 Base yards to one card, forever.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, value: c.value + 34 })),
  },
  contract_restructure: {
    key: 'contract_restructure', emoji: '📝', name: 'Contract Restructure', cost: 4, targeted: true,
    eligible: (c) => c.cost > 1,
    detail: 'Cut one card’s cap cost by 1 (min 1) — fit it into more plays per drive.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, cost: Math.max(1, c.cost - 1) })),
  },
  deep_threat: {
    key: 'deep_threat', emoji: '🚀', name: 'Deep Threat Reps', cost: 4, targeted: true,
    eligible: (c) => c.action === 'short_catch',
    detail: 'Turn a Quick Catch into a Deep Catch (+30 yards) — unlocks the shot-play bonus.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, action: 'deep_catch', label: 'Deep Catch', value: c.value + 30 })),
  },
  reliable_hands: {
    key: 'reliable_hands', emoji: '🧱', name: 'Reliable Hands', cost: 4, targeted: true, eligible: untraited,
    detail: 'Give a card the Reliable trait — it waives the Busted Play penalty.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, modifier: 'reliable' })),
  },
  explosive_pkg: {
    key: 'explosive_pkg', emoji: '💥', name: 'Explosive Package', cost: 5, targeted: true,
    eligible: (c) => untraited(c) && (c.side === 'pass' || c.side === 'catch' || c.side === 'run'),
    detail: 'Give a skill card the Explosive trait — +0.10 Big Play on clean concepts.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, modifier: 'explosive' })),
  },
  clutch_reps: {
    key: 'clutch_reps', emoji: '⏱️', name: 'Clutch Reps', cost: 4, targeted: true, eligible: untraited,
    detail: 'Give a card the Clutch trait — +20 Base on Drive 3 and in the Championship.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, modifier: 'clutch' })),
  },
  boss_prep: {
    key: 'boss_prep', emoji: '🛡️', name: 'Boss Prep', cost: 4, targeted: true, eligible: untraited,
    detail: 'Give a card the Protected trait — halves the opposing scheme penalty.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, modifier: 'protected' })),
  },
  hot_route_install: {
    key: 'hot_route_install', emoji: '🔀', name: 'Hot Route Install', cost: 5, targeted: true,
    eligible: (c) => untraited(c) && c.side === 'catch',
    detail: 'Give a catch the Hot Route trait — it stacks with ANY quarterback.',
    apply: (run, id) => mutateCard(run, id, (c) => ({ ...c, modifier: 'hot_route' })),
  },
};

export const FILM_TOOL_KEYS = Object.keys(FILM_TOOLS) as FilmToolKey[];

// Two Film Tools per War Room visit, weighted to what the deck can actually use
// (e.g. don't offer Deep Threat Reps with no Quick Catch to convert).
export function generateFilmRoom(run: FbRunState, rng: RNG = Math.random): FilmTool[] {
  const usable = FILM_TOOL_KEYS.filter((k) => {
    const t = FILM_TOOLS[k];
    return !t.targeted || run.deck.some((c) => t.eligible(c));
  });
  return shuffle(usable, rng).slice(0, 2).map((k) => FILM_TOOLS[k]);
}

export function filmToolTargets(run: FbRunState, tool: FilmTool): FbCard[] {
  if (!tool.targeted) return [];
  return run.deck.filter((c) => tool.eligible(c)).sort((a, b) => b.value - a.value || a.cost - b.cost);
}

// ── Front Office Upgrades (run-persistent rule modifiers) ────────────────────
export type FrontOfficeKey =
  | 'staff_expansion' | 'extra_audible' | 'reroll_discount' | 'deep_pockets' | 'extra_reward';

export interface FrontOfficeUpgrade {
  key: FrontOfficeKey;
  emoji: string;
  name: string;
  detail: string;
  cost: number;
}

export const FRONT_OFFICE: Record<FrontOfficeKey, FrontOfficeUpgrade> = {
  staff_expansion: { key: 'staff_expansion', emoji: '🏟️', name: 'Staff Expansion', cost: 6, detail: 'Hire up to 6 coordinators instead of 5 — one more multiplier slot for the season.' },
  extra_audible: { key: 'extra_audible', emoji: '📻', name: 'Headset Upgrade', cost: 5, detail: '+1 Audible every drive for the rest of the run — dig for your concept more often.' },
  reroll_discount: { key: 'reroll_discount', emoji: '🔁', name: 'Scouting Network', cost: 5, detail: 'Every War Room reroll costs $1 less (min $1) for the rest of the run.' },
  deep_pockets: { key: 'deep_pockets', emoji: '🏦', name: 'Deep Pockets', cost: 6, detail: 'Raise the interest cap by $2 — banking Funds pays off harder.' },
  extra_reward: { key: 'extra_reward', emoji: '📋', name: 'Bigger Front Office', cost: 6, detail: 'The War Room shows a 4th reward every visit for the rest of the run.' },
};

export const FRONT_OFFICE_KEYS = Object.keys(FRONT_OFFICE) as FrontOfficeKey[];

// Offer one unowned upgrade per visit, ~45% of the time, so they feel special.
export function generateFrontOfficeOffer(run: FbRunState, rng: RNG = Math.random): FrontOfficeUpgrade | null {
  const owned = new Set(run.upgrades ?? []);
  const available = FRONT_OFFICE_KEYS.filter((k) => !owned.has(k));
  if (available.length === 0) return null;
  if (rng() >= 0.45) return null;
  return FRONT_OFFICE[shuffle(available, rng)[0]];
}

export function applyFrontOffice(run: FbRunState, key: FrontOfficeKey): FbRunState {
  if (run.upgrades?.includes(key)) return run;
  return { ...run, upgrades: [...(run.upgrades ?? []), key] };
}

// ── Effective rule helpers (honor Front Office upgrades) ─────────────────────
export function effectiveMaxCoordinators(run: Pick<FbRunState, 'upgrades'>): number {
  return MAX_COORDINATORS + (run.upgrades?.includes('staff_expansion') ? 1 : 0);
}
export function audiblesPerDrive(run: Pick<FbRunState, 'upgrades'>): number {
  return AUDIBLES_PER_DRIVE + (run.upgrades?.includes('extra_audible') ? 1 : 0);
}
export function effectiveInterestCap(run: Pick<FbRunState, 'upgrades'>): number {
  return INTEREST_CAP + (run.upgrades?.includes('deep_pockets') ? 2 : 0);
}
export function rerollDiscount(run: Pick<FbRunState, 'upgrades'>): number {
  return run.upgrades?.includes('reroll_discount') ? 1 : 0;
}
export function warRoomRewardSlots(run: Pick<FbRunState, 'upgrades'>): number {
  return 3 + (run.upgrades?.includes('extra_reward') ? 1 : 0);
}
