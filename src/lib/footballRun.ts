// Gridiron — season run state + the post-game reward loop.
// A run is a season of games; clear them all to win the championship.

import {
  buildStarterDeck, driveTargets, createFreeAgentCard,
  FB_COORDINATORS, STARTER_COORDINATORS, MAX_COORDINATORS, FREE_AGENT_KEYS, FB_CONCEPT_LABEL,
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
  const champ = isChampionship(gameNumber) ? 1.12 : 1;
  const scale = (1 + 0.09 * (gameNumber - 1)) * champ;
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

const PLAYBOOK_OPTIONS: { concept: FbConceptKey; base: number; exec: number }[] = [
  { concept: 'stack_td', base: 0, exec: 0.2 },
  { concept: 'double_stack_bomb', base: 0, exec: 0.25 },
  { concept: 'ground_pound', base: 30, exec: 0 },
  { concept: 'checkdown', base: 28, exec: 0.15 },
  { concept: 'field_goal', base: 40, exec: 0 },
  { concept: 'pick_six', base: 0, exec: 0.3 },
];

function playbookReward(opt: { concept: FbConceptKey; base: number; exec: number }): Reward {
  const name = FB_CONCEPT_LABEL[opt.concept] ?? opt.concept;
  const bits = [opt.base ? `+${opt.base} Base` : '', opt.exec ? `+${opt.exec} Execution` : ''].filter(Boolean).join(' & ');
  return {
    id: `pb-${opt.concept}`, kind: 'playbook', emoji: '📘', title: `Install: ${name}`, detail: `${name} plays permanently gain ${bits}.`,
    apply: (run) => {
      const cur = run.playbook[opt.concept] ?? { base: 0, exec: 0 };
      return { ...run, playbook: { ...run.playbook, [opt.concept]: { base: cur.base + opt.base, exec: cur.exec + opt.exec } } };
    },
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

// Offer 3 varied rewards.
export function generateRewards(run: FbRunState): Reward[] {
  const pool: Reward[] = [];

  // a couple of free agents
  shuffle(FREE_AGENT_KEYS).slice(0, 2).forEach((k) => pool.push(cardReward(k)));

  // a coordinator if there's room
  if (run.coordinators.length < MAX_COORDINATORS) {
    const available = (Object.keys(FB_COORDINATORS) as FbCoordinatorKey[]).filter((k) => !run.coordinators.includes(k));
    if (available.length) pool.push(coordinatorReward(shuffle(available)[0]));
  }

  // a playbook install
  pool.push(playbookReward(shuffle(PLAYBOOK_OPTIONS)[0]));

  // utility
  if (run.deck.length > 22) pool.push(TRIM);
  pool.push(STRENGTH);

  // pick 3, preferring kind variety
  const picked: Reward[] = [];
  const kinds = new Set<RewardKind>();
  for (const r of shuffle(pool)) {
    if (picked.length >= 3) break;
    if (kinds.has(r.kind) && pool.length - picked.length > 3) continue;
    picked.push(r);
    kinds.add(r.kind);
  }
  while (picked.length < 3 && pool.length) {
    const r = shuffle(pool).find((x) => !picked.includes(x));
    if (!r) break;
    picked.push(r);
  }
  return picked.slice(0, 3);
}

export function deckValueSummary(deck: FbCard[]): { size: number; avgValue: number; avgCost: number } {
  const size = deck.length;
  const avgValue = size ? Math.round(deck.reduce((s, c) => s + c.value, 0) / size) : 0;
  const avgCost = size ? Math.round((deck.reduce((s, c) => s + c.cost, 0) / size) * 10) / 10 : 0;
  return { size, avgValue, avgCost };
}
