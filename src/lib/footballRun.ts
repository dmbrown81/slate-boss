// Gridiron — season run state + the post-game reward loop.
// A run is a season of games; clear them all to win the championship.

import {
  buildStarterDeck, driveTargets, createFreeAgentCard,
  FB_COORDINATORS, STARTER_COORDINATORS, MAX_COORDINATORS, FB_CONCEPT_LABEL,
  shuffle,
  type FbCard, type FbCoordinatorKey, type FbPlaybook, type FbEnvironmentKey, type FbConceptKey, type FreeAgentKey,
} from './footballRogue';

export const SEASON_GAMES = 5;

export interface FbRunState {
  gameNumber: number;        // 1..SEASON_GAMES — the game you're about to play
  deck: FbCard[];
  coordinators: FbCoordinatorKey[];
  playbook: FbPlaybook;
  bombGames: number;         // games in which you landed a Bomb (Franchise QB)
  status: 'playing' | 'won' | 'lost';
}

export function createRun(): FbRunState {
  return {
    gameNumber: 1,
    deck: buildStarterDeck().cards,
    coordinators: [...STARTER_COORDINATORS],
    playbook: {},
    bombGames: 0,
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
export type RewardKind = 'card' | 'coordinator' | 'playbook' | 'trim' | 'upgrade';

export interface Reward {
  id: string;
  kind: RewardKind;
  emoji: string;
  title: string;
  detail: string;
  apply: (run: FbRunState) => FbRunState;
}

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
    id: `card-${key}`, kind: 'card', emoji: t.emoji, title: t.title, detail: t.detail,
    apply: (run) => ({ ...run, deck: [...run.deck, createFreeAgentCard(key)] }),
  };
}

function coordinatorReward(key: FbCoordinatorKey): Reward {
  const c = FB_COORDINATORS[key];
  return {
    id: `coord-${key}`, kind: 'coordinator', emoji: '🧠', title: `Hire: ${c.name}`, detail: c.description,
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
    apply: (run) => ({ ...run, playbook: { ...run.playbook, [concept]: (run.playbook[concept] ?? 0) + 1 } }),
  };
}

const TRIM: Reward = {
  id: 'trim', kind: 'trim', emoji: '✂️', title: 'Trim the Playbook', detail: 'Cut your 3 lowest-value cards so you draw your best ones more often.',
  apply: (run) => {
    const sorted = [...run.deck].sort((a, b) => a.value - b.value);
    const cutIds = new Set(sorted.slice(0, 3).map((c) => c.id));
    return { ...run, deck: run.deck.filter((c) => !cutIds.has(c.id)) };
  },
};

const STRENGTH: Reward = {
  id: 'upgrade', kind: 'upgrade', emoji: '💪', title: 'Strength & Conditioning', detail: '+14 Base to your 4 cheapest cards.',
  apply: (run) => {
    const cheapIds = new Set([...run.deck].sort((a, b) => a.cost - b.cost || a.value - b.value).slice(0, 4).map((c) => c.id));
    return { ...run, deck: run.deck.map((c) => (cheapIds.has(c.id) ? { ...c, value: c.value + 14 } : c)) };
  },
};

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

function firstAvailableCoord(lean: Lean, owned: FbCoordinatorKey[]): FbCoordinatorKey | null {
  const ordered = [...LEAN_COORD[lean], ...(Object.keys(FB_COORDINATORS) as FbCoordinatorKey[])];
  return ordered.find((k) => !owned.includes(k)) ?? null;
}

// Offer 3 rewards built around the player's deck lean:
//   1) a KEYSTONE engine piece (a scaling coordinator, or a Game-Plan level),
//   2) the COMMITMENT lever — level your core Game Plan (stack it to snowball),
//   3) a flex stabilizer.
// The skill is committing: stack one Game Plan + the coordinators that feed it.
export function generateRewards(run: FbRunState): Reward[] {
  const lean = deckLean(run.deck);
  const primary = LEAN_PB[lean][0];
  const secondary = LEAN_PB[lean][1] ?? primary;
  const lvl = (c: FbConceptKey) => run.playbook[c] ?? 0;
  const picks: Reward[] = [];

  // 1) Keystone
  const coord = run.coordinators.length < MAX_COORDINATORS ? firstAvailableCoord(lean, run.coordinators) : null;
  if (coord && Math.random() < 0.6) picks.push(coordinatorReward(coord));
  else picks.push(playbookReward(primary, lvl(primary) + 1));

  // 2) Commitment lever — level a Game Plan you can ride
  const slot2 = picks[0].id === `pb-${primary}` ? secondary : primary;
  picks.push(playbookReward(slot2, lvl(slot2) + 1));

  // 3) Flex stabilizer
  const flex: Reward[] = [STRENGTH];
  if (run.deck.length > 26) flex.push(TRIM); else flex.push(cardReward(LEAN_CARD[lean][0]));
  picks.push(shuffle(flex)[0]);

  return shuffle(picks);
}

export function deckValueSummary(deck: FbCard[]): { size: number; avgValue: number; avgCost: number } {
  const size = deck.length;
  const avgValue = size ? Math.round(deck.reduce((s, c) => s + c.value, 0) / size) : 0;
  const avgCost = size ? Math.round((deck.reduce((s, c) => s + c.cost, 0) / size) * 10) / 10 : 0;
  return { size, avgValue, avgCost };
}
