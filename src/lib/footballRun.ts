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
  const champ = isChampionship(gameNumber) ? 1.4 : 1;
  // back-half ramps harder so an un-built deck falls short while a compounded
  // engine clears — this is what makes reward/build choices decisive.
  const scale = (1 + 0.18 * (gameNumber - 1)) * champ;
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
  { concept: 'stack_td', base: 0, exec: 0.35 },
  { concept: 'double_stack_bomb', base: 0, exec: 0.45 },
  { concept: 'ground_pound', base: 55, exec: 0 },
  { concept: 'checkdown', base: 34, exec: 0.2 },
  { concept: 'field_goal', base: 60, exec: 0 },
  { concept: 'pick_six', base: 0, exec: 0.45 },
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
function leanPlaybook(lean: Lean, exclude: Set<FbConceptKey>) {
  const want = LEAN_PB[lean].find((c) => !exclude.has(c));
  const opt = PLAYBOOK_OPTIONS.find((o) => o.concept === want) ?? PLAYBOOK_OPTIONS.find((o) => !exclude.has(o.concept))!;
  return opt;
}

// Offer 3 rewards built around the player's deck lean. Every shop contains a
// build-defining KEYSTONE (a scaling coordinator, or a strong on-scheme install
// when slots are full) plus an on-scheme playbook and a flex pick — so choosing
// the keystone for your build is the decision that matters.
export function generateRewards(run: FbRunState): Reward[] {
  const lean = deckLean(run.deck);
  const used = new Set<FbConceptKey>();
  const picks: Reward[] = [];

  // 1) Keystone — the build-defining engine piece (a scaling coordinator, or a
  //    strong on-scheme install once coordinator slots are full). This is the
  //    pick that compounds; recognizing it for your build is the skill.
  const coord = run.coordinators.length < MAX_COORDINATORS ? firstAvailableCoord(lean, run.coordinators) : null;
  if (coord && Math.random() < 0.7) {
    picks.push(coordinatorReward(coord));
  } else {
    const pb = leanPlaybook(lean, used); used.add(pb.concept);
    picks.push(playbookReward(pb));
  }

  // 2) On-scheme card — a solid stabilizer, but not an engine multiplier.
  picks.push(cardReward(LEAN_CARD[lean][0]));

  // 3) Flex — consistency / value option.
  const flex: Reward[] = [STRENGTH];
  if (run.deck.length > 26) flex.push(TRIM);
  else flex.push(cardReward(LEAN_CARD[lean][LEAN_CARD[lean].length - 1]));
  picks.push(shuffle(flex)[0]);

  return shuffle(picks);
}

export function deckValueSummary(deck: FbCard[]): { size: number; avgValue: number; avgCost: number } {
  const size = deck.length;
  const avgValue = size ? Math.round(deck.reduce((s, c) => s + c.value, 0) / size) : 0;
  const avgCost = size ? Math.round((deck.reduce((s, c) => s + c.cost, 0) / size) * 10) / 10 : 0;
  return { size, avgValue, avgCost };
}
