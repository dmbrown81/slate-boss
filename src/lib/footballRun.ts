// Gridiron — season run state + the post-game reward loop.
// A run is a season of games; clear them all to win the championship.

import {
  buildTeamDeck, driveTargets, createFreeAgentCard, TEAM_PROFILES,
  FB_COORDINATORS, MAX_COORDINATORS, FB_CONCEPT_LABEL, FB_CARD_MODIFIERS,
  scoreFootballPlay, shuffle,
  type FbBossSchemeKey, type FbCard, type FbCardModifier, type FbCoordinatorKey, type FbPlaybook, type FbEnvironmentKey, type FbConceptKey, type FreeAgentKey, type TeamArchetype,
} from './footballRogue';
import { STARTING_FUNDS } from './gridironEconomy';
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
  funds: number;             // Front Office Funds — the between-game economy
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
    funds: STARTING_FUNDS,
    status: 'playing',
  };
}

export function isChampionship(gameNumber: number): boolean {
  return gameNumber >= SEASON_GAMES;
}

// Targets escalate across the season; the championship gets an extra bump.
export function gameTargets(env: FbEnvironmentKey, gameNumber: number): number[] {
  const base = driveTargets(env);
  const champ = isChampionship(gameNumber) ? 1.32 : 1;
  // GEOMETRIC escalation (Balatro-style): targets compound ~20%/game, so flat
  // Base/Execution plateaus and a committed multiplicative engine is REQUIRED to
  // keep pace late. This is the early-flat → late-multiplicative power curve.
  const scale = Math.pow(1.2, gameNumber - 1) * champ;
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
const RARE_COORDINATORS = new Set<FbCoordinatorKey>(['franchise_qb']);

const FA_TITLE: Record<FreeAgentKey, { emoji: string; title: string; detail: string }> = {
  deep_wr: { emoji: '🎯', title: 'Sign a Deep Threat', detail: 'Add a $3 WR Deep Catch (88) to your deck.' },
  bell_rb: { emoji: '🐂', title: 'Sign a Bell-Cow RB', detail: 'Add a $2 Power Run (64) to your deck.' },
  shutdown_dst: { emoji: '🛡️', title: 'Sign a Ball-Hawk', detail: 'Add a $3 Interception (80) to your deck.' },
  value_slot: { emoji: '💸', title: 'Sign a Value Slot', detail: 'Add a $1 Quick Catch (40) — cheap, flexible.' },
  gunslinger: { emoji: '🚀', title: 'Sign a Gunslinger', detail: 'Add a $3 QB Deep Ball (70) to your deck.' },
};

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

type Lean = 'pass' | 'run' | 'def';
function deckLean(deck: FbCard[]): Lean {
  let p = 0, r = 0, d = 0;
  for (const c of deck) { if (c.side === 'pass' || c.side === 'catch') p++; else if (c.side === 'run') r++; else if (c.side === 'defense') d++; }
  return d > p && d > r ? 'def' : r > p ? 'run' : 'pass';
}

const LEAN_COORD: Record<Lean, FbCoordinatorKey[]> = {
  pass: ['franchise_qb', 'air_raid', 'west_coast'],
  run: ['bell_cow', 'salary_wizard'],
  def: ['ball_hawk', 'franchise_qb'],
};
const LEAN_PB: Record<Lean, FbConceptKey[]> = {
  pass: ['double_stack_bomb', 'stack_td', 'checkdown'],
  run: ['ground_pound', 'field_goal'],
  def: ['pick_six'],
};
const LEAN_CARD: Record<Lean, FreeAgentKey[]> = {
  pass: ['deep_wr', 'gunslinger', 'value_slot'],
  run: ['bell_rb'],
  def: ['shutdown_dst'],
};
const LEAN_TRAINING: Record<Lean, FbCardModifier> = {
  // Each lean gets a trait that scales ITS identity: pass → ceiling, run →
  // tempo (an extra carry per drive), def → a Big-Play scaler for splash plays.
  pass: 'explosive', run: 'discounted', def: 'explosive',
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
  const coord = run.coordinators.length < MAX_COORDINATORS ? firstAvailableCoord(lean, run.coordinators) : null;
  if (coord && rng() < 0.6) picks.push(coordinatorReward(coord));
  else picks.push(playbookReward(primary, lvl(primary) + 1));

  // 2) Commitment lever — level a Game Plan you can ride
  const slot2 = picks[0].id === `pb-${primary}` ? secondary : primary;
  picks.push(playbookReward(slot2, lvl(slot2) + 1));

  // 3) Flex stabilizer — value, consistency, a free agent, or a Player Trait.
  const flex: Reward[] = [STRENGTH, trainingReward(LEAN_TRAINING[lean])];
  if (run.deck.length > 26) flex.push(TRIM); else flex.push(cardReward(LEAN_CARD[lean][0]));
  picks.push(shuffle(flex, rng)[0]);

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
  return { title: 'Air Raid Starter', detail: 'No Game Plan yet. Level Stack TD or Double-Stack Bomb to make QB stacks scale.', concept: 'double_stack_bomb', level: 0, tag: 'Pick a plan' };
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
    conceptCountsThisDrive: {},
    playbook: run.playbook,
    bombGames: run.bombGames,
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
    if ((identity.concept === 'pick_six' || identity.concept === 'takeaway') && reward.id === 'coord-ball_hawk') return 'Feeds current plan';
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
