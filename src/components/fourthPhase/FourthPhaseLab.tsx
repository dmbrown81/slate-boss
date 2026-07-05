import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { mulberry32, stringSeed } from '../../lib/rng';
import { FP as FB, FP_RADIUS, btnGhost, btnPrimary, card, sectionLabel, statTile } from './fourthPhaseStyles';
import { HowToPlay, PhaseIcon, SituationsPanel } from './FourthPhaseGuide';
import {
  BASE_METER,
  BASE_METER_CAP,
  FOURTH_PHASE_BOSSES,
  FOURTH_PHASE_DISCOUNT_TOKEN_CAP,
  FOURTH_PHASE_DRIVES,
  FOURTH_PHASE_HAND_SIZE,
  FOURTH_PHASE_JOKER_LIMIT,
  FOURTH_PHASE_MAX_PLAYS_PER_DRIVE,
  FOURTH_PHASE_PLAY_LIMIT,
  FOURTH_PHASE_TEAMS,
  FOURTH_PHASE_WAR_ROOM_BUY_LIMIT,
  FOURTH_PHASE_WAR_ROOM_REROLL_COST,
  PHASE_COLOR,
  PHASE_SHORT,
  activeBossForDrive,
  applyFourthPhaseDrawStart,
  bossWarningForPlay,
  buildPlayExplanation,
  buildRunShareCardData,
  cardContributionLabel,
  cardDisplayName,
  coachOrderCards,
  coachPickForWarRoom,
  createFourthPhaseRun,
  discountedOfferCost,
  drawFourthPhaseCards,
  EMPTY_FOURTH_PHASE_PROGRESS,
  formatMeter,
  FOURTH_PHASE_STAKES,
  fourthPhaseMaxStake,
  fourthPhaseRunCode,
  fourthPhaseStake,
  fourthPhaseTeamUnlocks,
  generateFourthPhaseWarRoomOffers,
  isTrueCrowdBeforeOffenseCash,
  jokerDefinition,
  newlyUnlockedTeams,
  parseFourthPhaseRunCode,
  recordFourthPhaseResult,
  plainPlaySummary,
  playEffectVerb,
  randomFourthPhaseBoss,
  scoreFourthPhasePlay,
  shuffleFourthPhase,
  tutorialCheckdownIsValid,
  type CardEdition,
  type FourthPhaseBossKey,
  type FourthPhaseBossProfile,
  type FourthPhaseCard,
  type FourthPhaseJokerState,
  type FourthPhasePracticeBook,
  type FourthPhaseProgress,
  type FourthPhaseScoreContext,
  type FourthPhaseScoreResult,
  type FourthPhaseTeamKey,
  type FourthPhaseWarRoomOffer,
  type CoachPick,
  type PlayerTrait,
  type RunShareCardData,
  type SituationKey,
} from '../../lib/fourthPhase';

interface Props {
  onHome?: () => void;
}

type LabPhase = 'play' | 'warRoom' | 'won' | 'lost';

/** Top-level app flow: title -> team/stake select -> the run itself. */
type AppScreen = 'title' | 'teams' | 'game';

interface CashInSnapshot {
  points: number;
  situation: string;
  bigPlay: number;
  meter: number;
  reason: string;
}

interface FourthPhaseRunMeta {
  dailyLabel?: string;
  dailyPractice?: boolean;
}

interface FourthPhaseRunRecord {
  id: string;
  date: string;
  seed: number;
  team: FourthPhaseTeamKey;
  stake: number;
  score: number;
  won: boolean;
  bestPlay: number;
  runCode: string;
  dailyLabel?: string;
}

interface PlayResolution {
  key: number;
  explanation: string;
  stages: { label: string; value: string; color: string }[];
  impact: 'normal' | 'cash' | 'huge';
}

interface FourthPhaseDailyRecord {
  date: string;
  seed: number;
  team: FourthPhaseTeamKey;
  score: number;
  won: boolean;
  streak: number;
}

interface DragBind {
  draggable: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

interface LabState {
  seed: number;
  team: FourthPhaseTeamKey;
  /** Stake level (1-based) this run was started at. Drives targets, boss timing, redraws, cash. */
  stake: number;
  /** True between drives: the Drive Intro screen shows until the player kicks off. */
  awaitingKickoff: boolean;
  boss: FourthPhaseBossKey;
  targets: [number, number, number];
  drawPile: FourthPhaseCard[];
  discardPile: FourthPhaseCard[];
  hand: FourthPhaseCard[];
  selectedIds: string[];
  jokers: FourthPhaseJokerState[];
  practice: FourthPhasePracticeBook;
  draft: FourthPhaseWarRoomOffer[];
  money: number;
  /** Banked Special Teams discount tokens; each shaves $1 off a War Room offer. */
  discounts: number;
  driveIndex: number;
  driveScore: number;
  discardsLeft: number;
  playsThisDrive: number;
  meter: number;
  meterCap: number;
  repeatedSituations: Partial<Record<SituationKey, number>>;
  drawNonce: number;
  phase: LabPhase;
  runScore: number;
  bestPlay: number;
  buysThisWarRoom: number;
  rerollsThisWarRoom: number;
  pendingDraft?: FourthPhaseWarRoomOffer;
  lastPlay?: FourthPhaseScoreResult;
  cashIn?: CashInSnapshot;
  dailyLabel?: string;
  dailyPractice?: boolean;
  completion?: FourthPhaseRunRecord;
}

// Decide whether a series earns the cash-in celebration, and why. Replaces the old
// bare `points >= 120` magic number with reasons that scale to the drive and the run.
function evaluateCashIn(
  result: FourthPhaseScoreResult,
  target: number,
  prevBest: number,
): { show: boolean; reason: string } {
  if (result.situation.key === 'complementaryFootball') {
    return { show: true, reason: 'Complementary Football: all four phases' };
  }
  if (result.points >= target) {
    return { show: true, reason: 'Drive crusher: cleared the target in one series' };
  }
  if (result.points > prevBest && result.points >= 80) {
    return { show: true, reason: `New run best: ${result.points}` };
  }
  if (result.didCash && result.bigPlay >= 2.5) {
    return { show: true, reason: `Meter cash x${result.bigPlay.toFixed(2)}` };
  }
  if (result.points >= Math.max(60, Math.round(target * 0.3))) {
    return { show: true, reason: 'Explosive play' };
  }
  return { show: false, reason: '' };
}

const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];
const FP_HISTORY_KEY = 'fourth_phase_history_v1';
const FP_DAILY_KEY = 'fourth_phase_daily_v1';
const FP_PROGRESS_KEY = 'fourth_phase_progress_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function loadFourthPhaseHistory(): FourthPhaseRunRecord[] {
  const history = readJson<FourthPhaseRunRecord[]>(FP_HISTORY_KEY, []);
  return Array.isArray(history) ? history.slice(0, 10) : [];
}

function bestFourthPhaseRun(history = loadFourthPhaseHistory()): FourthPhaseRunRecord | null {
  return [...history].sort((a, b) => b.score - a.score || Number(b.won) - Number(a.won))[0] ?? null;
}

function loadFourthPhaseDaily(): FourthPhaseDailyRecord | null {
  return readJson<FourthPhaseDailyRecord | null>(FP_DAILY_KEY, null);
}

function utcDateLabel(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function previousUtcDateLabel(label: string): string {
  const date = new Date(`${label}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return utcDateLabel(date);
}

function fourthPhaseDailySeed(label = utcDateLabel()): { label: string; seed: number; team: FourthPhaseTeamKey } {
  const seed = stringSeed(`fourth-phase-daily:${label}`);
  return { label, seed, team: teamKeys[Math.abs(seed) % teamKeys.length] };
}

function saveFourthPhaseCompletion(record: FourthPhaseRunRecord, dailyPractice?: boolean) {
  const history = [record, ...loadFourthPhaseHistory().filter((entry) => entry.id !== record.id)].slice(0, 10);
  writeJson(FP_HISTORY_KEY, history);
  if (!record.dailyLabel || dailyPractice) return;
  const previous = loadFourthPhaseDaily();
  const streak = previous?.date === previousUtcDateLabel(record.dailyLabel) ? previous.streak + 1 : 1;
  writeJson<FourthPhaseDailyRecord>(FP_DAILY_KEY, {
    date: record.dailyLabel,
    seed: record.seed,
    team: record.team,
    score: record.score,
    won: record.won,
    streak,
  });
}

// Played first-run tutorial. Teaches the job first (clear the drive target before
// calls run out), then the one trick that wins games, by making the player do it
// instead of asking them to read a panel. Advances on real series (executePlay).
const TUTORIAL_STEPS = [
  {
    title: 'Your job: clear the drive',
    body: 'Hit the Drive Target at the top before your calls run out. Start simple: tap one blue Offense card below, then press Run Series. Offense gains safe yards.',
    cta: null,
  },
  {
    title: 'Now the trick that wins games',
    body: 'Purple Crowd builds momentum. Blue Offense cashes it into an explosive score. Cards resolve left to right, so tap a Crowd card first, then an Offense card.',
    cta: null,
  },
  {
    title: 'That is the loop',
    body: 'Build momentum, cash with Offense, clear the target. Same cards in the wrong order score less. Red Defense cards create leverage: stops, pressure, and short fields. Gold Special Teams cards create hidden yards for later.',
    cta: 'Got it. Call it',
  },
] as const;

function isTutorialDone(): boolean {
  try {
    return Boolean(localStorage.getItem('fp-tutorial-done'));
  } catch {
    return false;
  }
}

// The very first run a player ever sees should end against a boss whose effect
// reads in one clause. Re-rolling the seed (not overriding the boss) keeps run
// codes honest: the boss is still derived from the seed, so sharing/importing
// this run reproduces it exactly.
const GENTLE_FIRST_BOSSES: readonly FourthPhaseBossKey[] = ['stackedBox', 'preventDefense'];

function firstRunSeed(team: FourthPhaseTeamKey): number {
  let seed = stringSeed(`fourth-phase-lab:${team}:${Date.now()}`);
  for (let step = 0; step < 64 && !GENTLE_FIRST_BOSSES.includes(randomFourthPhaseBoss(seed, team)); step += 1) {
    seed += 1;
  }
  return seed;
}

function scriptedOpening(deck: FourthPhaseCard[]): FourthPhaseCard[] {
  const desired = [
    'offense-2',
    'crowd-7',
    'crowd-J',
    'offense-K',
    'specialTeams-4',
    'defense-4',
    'offense-3',
    'crowd-A',
  ];
  const byId = new Map(deck.map((card) => [card.id, card]));
  const opening = desired.map((id) => byId.get(id)).filter((card): card is FourthPhaseCard => Boolean(card));
  const used = new Set(opening.map((card) => card.id));
  return [...opening, ...deck.filter((card) => !used.has(card.id))];
}

function createInitialState(
  team: FourthPhaseTeamKey,
  seed = stringSeed(`fourth-phase-lab:${team}:${Date.now()}`),
  meta: FourthPhaseRunMeta = {},
  stakeLevel = 1,
): LabState {
  const run = createFourthPhaseRun(team, seed);
  const stake = fourthPhaseStake(stakeLevel);
  const orderedDeck = scriptedOpening(run.deck);
  const draw = drawFourthPhaseCards(orderedDeck, [], FOURTH_PHASE_HAND_SIZE, mulberry32(stringSeed(`${seed}:opening`)));
  return {
    seed,
    team,
    stake: stake.level,
    awaitingKickoff: true,
    boss: run.boss,
    targets: run.targets.map((target) => Math.round(target * stake.targetScale)) as [number, number, number],
    drawPile: draw.deck,
    discardPile: draw.discard,
    hand: draw.drawn,
    selectedIds: [],
    jokers: run.jokers,
    practice: run.practice,
    draft: [],
    money: stake.startMoney,
    discounts: 0,
    driveIndex: 0,
    driveScore: 0,
    discardsLeft: stake.discardsPerDrive,
    playsThisDrive: 0,
    meter: run.meter.meter,
    meterCap: run.meter.meterCap,
    repeatedSituations: {},
    drawNonce: 1,
    phase: 'play',
    runScore: 0,
    bestPlay: 0,
    buysThisWarRoom: 0,
    rerollsThisWarRoom: 0,
    dailyLabel: meta.dailyLabel,
    dailyPractice: meta.dailyPractice,
  };
}

function makeRunRecord(state: LabState, score: number, won: boolean, bestPlay: number): FourthPhaseRunRecord {
  const runCode = fourthPhaseRunCode(state.seed, state.team, state.stake);
  return {
    id: `${runCode}:${Date.now()}`,
    date: new Date().toISOString(),
    seed: state.seed,
    team: state.team,
    stake: state.stake,
    score,
    won,
    bestPlay,
    runCode,
    dailyLabel: state.dailyLabel,
  };
}

// A loss must teach the next attempt: one grounded reason, one thing to try.
function buildLossDiagnosis(state: LabState, targetRemaining: number): { reason: string; advice: string } {
  const last = state.lastPlay;
  const boss = activeBossForDrive(state, state.driveIndex);
  if (boss === 'adaptiveDc' && last && (state.repeatedSituations[last.situation.key] ?? 0) > 1) {
    return {
      reason: `Stalled after repeating ${last.situation.label} into Got Your Number.`,
      advice: 'Next run: vary your calls on the boss drive. Got Your Number zeroes any repeated situation.',
    };
  }
  if ((state.repeatedSituations.bustedPlay ?? 0) >= 2) {
    return {
      reason: 'Too many busted calls left the drive behind schedule.',
      advice: 'Look for one clear call each series: score, build momentum, set up the next call, or cash. Redraw when the hand has none.',
    };
  }
  if (last?.bust) {
    return {
      reason: `${last.situation.label} broke down on the final call.`,
      advice: 'A single Offense card is always a safe Checkdown when nothing else lines up.',
    };
  }
  if (last && state.meter > BASE_METER + 0.25 && !last.didCash) {
    return {
      reason: `You ran out of calls with momentum hot at ${formatMeter(state.meter)}.`,
      advice: 'Next run: cash Crowd with Offense sooner. Hot momentum bleeds while you sit on it.',
    };
  }
  if (boss !== 'none' && last?.ledger.some((entry) => entry.channel === 'boss')) {
    return {
      reason: `${FOURTH_PHASE_BOSSES[boss].name} squeezed the final drive.`,
      advice: `Next run: draft a War Room offer tagged as a boss answer before Drive 3.`,
    };
  }
  return {
    reason: `Drive Target stayed ${targetRemaining} short.`,
    advice: `Your best series was ${state.bestPlay}. Build Crowd before Offense to create a bigger cash-in.`,
  };
}

function buildResolution(result: FourthPhaseScoreResult, explanation: string, key: number): PlayResolution {
  const stages = [
    { label: 'Yards', value: `${result.yards}`, color: '#5fb4ff' },
    { label: 'Leverage', value: `+${result.execution.toFixed(2)}`, color: '#ff7c93' },
    { label: 'Explosive', value: `x${result.bigPlay.toFixed(2)}`, color: '#f4c24f' },
  ];
  if (result.didCash) {
    stages.push({ label: 'Cash', value: formatMeter(result.meterAfterCash), color: '#34c771' });
  } else if (result.meterCharged > 0) {
    stages.push({ label: 'Momentum', value: `+${result.meterCharged.toFixed(2)}`, color: '#a987ff' });
  }
  stages.push({ label: 'Drive', value: `${result.points}`, color: result.didCash ? FB.gold : FB.text });
  return {
    key,
    explanation,
    stages,
    impact: result.points >= 180 || result.bigPlay >= 4 ? 'huge' : result.didCash ? 'cash' : 'normal',
  };
}

function renderShareCard(data: RunShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'));

  ctx.fillStyle = '#090c11';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#102a1b';
  for (let x = 0; x < canvas.width; x += 96) {
    ctx.fillRect(x, 0, 48, canvas.height);
  }
  ctx.fillStyle = 'rgba(240,180,41,0.16)';
  ctx.fillRect(0, 0, canvas.width, 190);
  ctx.fillRect(0, 1160, canvas.width, 190);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4c24f';
  ctx.font = '900 44px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('FOURTH PHASE', 540, 96);

  ctx.fillStyle = data.outcome === 'W' ? '#34c771' : '#e26d83';
  ctx.font = '950 96px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(data.outcome === 'W' ? 'RUN WON' : 'RUN OVER', 540, 230);

  ctx.fillStyle = '#e8edf4';
  ctx.font = '950 170px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillText(String(data.score), 540, 430);
  ctx.fillStyle = '#aeb7c6';
  ctx.font = '800 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Drive Score', 540, 485);

  const rows = [
    ['Team', data.team],
    ['Boss', data.boss],
    ['Best Play', `${data.bestPlay}`],
    ['Run Code', data.runCode],
  ];
  ctx.textAlign = 'left';
  let y = 590;
  for (const [label, value] of rows) {
    ctx.fillStyle = '#7f8a99';
    ctx.font = '900 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(label.toUpperCase(), 130, y);
    ctx.fillStyle = '#e8edf4';
    ctx.font = '900 38px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(value, 340, y);
    y += 80;
  }

  ctx.fillStyle = '#f4c24f';
  ctx.font = '900 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(data.cashIn || 'No signature cash-in', 130, 940);
  ctx.fillStyle = '#e8edf4';
  ctx.font = '800 32px system-ui, -apple-system, Segoe UI, sans-serif';
  wrapCanvasText(ctx, data.story, 130, 1010, 820, 42);

  ctx.fillStyle = '#a987ff';
  ctx.font = '900 28px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Sideline: ${data.jokers.join(' / ') || 'none'}`, 130, 1210);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not render share card'));
    }, 'image/png');
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

function dragReorder<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...items];
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

// Single source of truth for the scoring context. Preview and execution MUST build
// the context the same way, or the previewed score can diverge from what a play
// actually scores. That would be the worst failure for a transparent-math game.
function buildPlayContext(state: LabState): FourthPhaseScoreContext {
  const target = state.targets[state.driveIndex];
  return {
    meter: state.meter,
    meterCap: state.meterCap,
    jokers: state.jokers,
    practice: state.practice,
    discardsLeft: state.discardsLeft,
    cardsPlayedThisDrive: state.playsThisDrive,
    driveIndex: state.driveIndex,
    targetRemaining: Math.max(0, target - state.driveScore),
    wins: state.driveIndex,
    boss: activeBossForDrive(state, state.driveIndex, fourthPhaseStake(state.stake).bossFromDrive),
    repeatedSituations: state.repeatedSituations,
  };
}

function meterStyle(meter: number, cap: number): CSSProperties {
  const tightness = cap <= BASE_METER ? 0 : (meter - BASE_METER) / (cap - BASE_METER);
  const glow = 0.16 + Math.max(0, Math.min(1, tightness)) * 0.58;
  return {
    boxShadow: `0 0 ${18 + tightness * 36}px rgba(169,135,255,${glow})`,
    borderColor: `rgba(169,135,255,${0.45 + glow * 0.45})`,
  };
}

// Editions and traits change the math (deck.ts / engine.ts); the card face must
// say so or big numbers look like hidden rolls.
const EDITION_BADGE: Record<CardEdition, { label: string; color: string }> = {
  allPro: { label: 'ALL-PRO', color: '#f4c24f' },
  inRhythm: { label: 'RHYTHM', color: '#5fb4ff' },
  homeRun: { label: 'HOME RUN', color: '#f4c24f' },
  crowdFavorite: { label: 'CROWD FAV', color: '#a987ff' },
};

const TRAIT_BADGE: Record<PlayerTrait, { label: string; color: string }> = {
  reliable: { label: 'RELIABLE', color: '#34c771' },
  explosive: { label: 'EXPLOSIVE', color: '#f4c24f' },
  clutch: { label: 'CLUTCH', color: '#34c771' },
  hometownHero: { label: 'HOMETOWN', color: '#a987ff' },
  injuryProne: { label: 'FRAGILE', color: '#e26d83' },
  lockerRoomCancer: { label: 'DRAMA', color: '#e26d83' },
  agingVet: { label: 'AGING VET', color: '#e26d83' },
  holdout: { label: 'HOLDOUT', color: '#e26d83' },
};

function cardBadge(card: FourthPhaseCard): { label: string; color: string } | null {
  if (card.edition) return EDITION_BADGE[card.edition];
  if (card.modifier) return TRAIT_BADGE[card.modifier];
  return null;
}

export default function FourthPhaseLab({ onHome }: Props) {
  const [state, setState] = useState<LabState>(() => createInitialState('balanced'));
  const [screen, setScreen] = useState<AppScreen>('title');
  const [runStarted, setRunStarted] = useState(false);
  const [pickTeam, setPickTeam] = useState<FourthPhaseTeamKey>('balanced');
  const [pickStake, setPickStake] = useState(1);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const [shareCardStatus, setShareCardStatus] = useState('');
  const [coachNudge, setCoachNudge] = useState('');
  const [resolution, setResolution] = useState<PlayResolution | null>(null);
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragJoker, setDragJoker] = useState<string | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number>(-1);

  // Advance the tutorial as the player actually performs each step. Driven by the
  // play handler (executePlay) rather than an effect.
  function advanceTutorial(playWillCash: boolean) {
    if (tutorialStep === 0) setTutorialStep(1);
    else if (tutorialStep === 1 && playWillCash) setTutorialStep(2);
  }

  function finishTutorial() {
    try {
      localStorage.setItem('fp-tutorial-done', '1');
    } catch {
      /* ignore */
    }
    setTutorialStep(-1);
    setCoachNudge('');
  }

  // The career record (team unlocks, stake ladders) is derived during render:
  // stored progress plus the current completion, if any. recordFourthPhaseResult
  // is idempotent per run id, so it does not matter whether the stored record
  // already includes this completion. Diffing before/after yields the fresh
  // unlocks the summary screen announces.
  const { career, justUnlocked } = useMemo(() => {
    const stored = readJson(FP_PROGRESS_KEY, EMPTY_FOURTH_PHASE_PROGRESS);
    if (!state.completion) return { career: stored, justUnlocked: [] as FourthPhaseTeamKey[] };
    const after = recordFourthPhaseResult(stored, {
      id: state.completion.id,
      team: state.completion.team,
      stake: state.completion.stake ?? 1,
      won: state.completion.won,
      drivesCleared: state.completion.won ? FOURTH_PHASE_DRIVES : state.driveIndex,
      bestSeries: state.completion.bestPlay,
    });
    return { career: after, justUnlocked: newlyUnlockedTeams(stored, after) };
  }, [state.completion, state.driveIndex]);

  // A finished run persists to external storage only: run history, the daily
  // streak, and the derived career record above.
  useEffect(() => {
    if (!state.completion) return;
    saveFourthPhaseCompletion(state.completion, state.dailyPractice);
    writeJson(FP_PROGRESS_KEY, career);
  }, [state.completion, state.dailyPractice, career]);

  const daily = fourthPhaseDailySeed();
  const storedDailyRecord = loadFourthPhaseDaily();
  const dailyRecord = state.completion?.dailyLabel === daily.label && !state.dailyPractice
    ? {
      date: daily.label,
      seed: state.completion.seed,
      team: state.completion.team,
      score: state.completion.score,
      won: state.completion.won,
      streak: storedDailyRecord?.date === previousUtcDateLabel(daily.label) ? storedDailyRecord.streak + 1 : storedDailyRecord?.date === daily.label ? storedDailyRecord.streak : 1,
    }
    : storedDailyRecord;
  const localBest = useMemo(() => bestFourthPhaseRun(state.completion ? [state.completion, ...loadFourthPhaseHistory()] : undefined), [state.completion]);
  const todayDailyDone = dailyRecord?.date === daily.label;
  const stakeProfile = fourthPhaseStake(state.stake);
  const activeBoss = activeBossForDrive(state, state.driveIndex, stakeProfile.bossFromDrive);
  const target = state.targets[state.driveIndex];
  const targetRemaining = Math.max(0, target - state.driveScore);
  const handById = useMemo(() => new Map(state.hand.map((card) => [card.id, card])), [state.hand]);
  const selectedCards = useMemo(
    () => state.selectedIds.map((id) => handById.get(id)).filter((card): card is FourthPhaseCard => Boolean(card)),
    [handById, state.selectedIds],
  );
  const preview = selectedCards.length ? scoreFourthPhasePlay(selectedCards, buildPlayContext(state)) : null;
  const playExplanation = preview ? buildPlayExplanation(selectedCards, preview) : 'Tap cards to build a series.';
  const previewVerb = preview ? playEffectVerb(preview) : null;
  // Would the coach's order (Crowd -> Defense -> ST -> Offense) score more than the
  // player's current order? Same scoring path as preview/execution, so the promised
  // delta is exact.
  const reorderHint = (() => {
    if (!preview || selectedCards.length < 2 || state.phase !== 'play') return null;
    const ordered = coachOrderCards(selectedCards);
    if (ordered.every((card, index) => card.id === selectedCards[index]?.id)) return null;
    const alt = scoreFourthPhasePlay(ordered, buildPlayContext(state));
    const delta = alt.points - preview.points;
    return delta > 0 ? { delta, unlocksCash: alt.didCash && !preview.didCash } : null;
  })();
  // Telegraph meter bleed before it happens: this play walks a hot meter down
  // without cashing it. Bust plays surface their own warning.
  const previewBleeds = Boolean(preview && !preview.bust && !preview.didCash && preview.meterAfter < state.meter - 0.05);
  const bossWarning = preview ? bossWarningForPlay({
    boss: activeBoss,
    result: preview,
    cards: selectedCards,
    repeatedSituations: state.repeatedSituations,
  }) : null;
  const progress = Math.min(1, state.driveScore / target);
  const meterFill = Math.min(1, (state.meter - BASE_METER) / Math.max(0.1, state.meterCap - BASE_METER));
  const runCode = fourthPhaseRunCode(state.seed, state.team, state.stake);
  const teamProfile = FOURTH_PHASE_TEAMS[state.team];
  const playsLeft = Math.max(0, FOURTH_PHASE_MAX_PLAYS_PER_DRIVE - state.playsThisDrive);
  const meterHot = state.meter > BASE_METER + 0.05;
  const coachMode = tutorialStep >= 0 && state.phase === 'play';
  const canCoachOrder = coachMode && selectedCards.some((card) => card.phase === 'crowd') && selectedCards.some((card) => card.phase === 'offense');
  const selectedNeedsCoachOrder = Boolean(preview && canCoachOrder && !isTrueCrowdBeforeOffenseCash(selectedCards, preview));
  const lossDiagnosis = state.phase === 'lost' ? buildLossDiagnosis(state, targetRemaining) : null;
  const lossReason = lossDiagnosis?.reason ?? '';

  // Every run enters through here: fresh runs, dailies, replays, imports.
  // The tutorial only arms on a player's first-ever standard run so shared
  // codes and dailies never fight the coach script.
  function restart(team: FourthPhaseTeamKey, seed?: number, meta: FourthPhaseRunMeta = {}, stakeLevel = 1) {
    const tutorial = !isTutorialDone() && !meta.dailyLabel && stakeLevel === 1;
    setState(createInitialState(team, seed ?? (tutorial ? firstRunSeed(team) : undefined), meta, stakeLevel));
    setTutorialStep(tutorial ? 0 : -1);
    setRunStarted(true);
    setScreen('game');
    setImportError('');
    setShareCopied(false);
    setResultCopied(false);
    setShareCardStatus('');
    setCoachNudge('');
    setResolution(null);
    setLedgerExpanded(false);
  }

  function kickoffDrive() {
    setState((current) => ({ ...current, awaitingKickoff: false }));
  }

  function startDailyRun() {
    const practice = loadFourthPhaseDaily()?.date === daily.label;
    restart(daily.team, daily.seed, { dailyLabel: daily.label, dailyPractice: practice });
  }

  function importRunCode() {
    const parsed = parseFourthPhaseRunCode(importCode);
    if (!parsed) {
      setImportError('Invalid run code');
      return;
    }
    // Imported codes reproduce the exact run, stake included, even if the
    // team or stake is not unlocked yet — same spirit as Balatro seeds.
    restart(parsed.team, parsed.seed, {}, Math.min(parsed.stake, FOURTH_PHASE_STAKES.length));
    setImportCode('');
  }

  function cashCardText(): string {
    if (!state.cashIn) return '';
    return [
      'FOURTH PHASE CASH-IN',
      `${state.cashIn.points} on ${state.cashIn.situation}`,
      `${FOURTH_PHASE_TEAMS[state.team].shortName} | ${runCode}`,
      `Momentum ${formatMeter(state.cashIn.meter)} | Explosive x${state.cashIn.bigPlay.toFixed(2)}`,
      `Jokers: ${state.jokers.map((joker) => jokerDefinition(joker).name).join(' / ')}`,
    ].join('\n');
  }

  function copyCashCard() {
    const text = cashCardText();
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => setShareCopied(true)).catch(() => setShareCopied(false));
  }

  function resultText(): string {
    const outcome = state.phase === 'won' ? 'W' : 'L';
    const daily = state.dailyLabel ? ` | Daily ${state.dailyLabel}${state.dailyPractice ? ' (practice)' : ''}` : '';
    return [
      `FOURTH PHASE | ${outcome}`,
      `${state.runScore} progress | best series ${state.bestPlay}`,
      `${teamProfile.shortName} vs ${FOURTH_PHASE_BOSSES[state.boss].name} | ${runCode}${daily}`,
    ].join('\n');
  }

  function copyResult() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(resultText()).then(() => setResultCopied(true)).catch(() => setResultCopied(false));
  }

  async function shareRunCard() {
    if (state.phase !== 'won' && state.phase !== 'lost') return;
    setShareCardStatus('Building card...');
    const payload = buildRunShareCardData({
      outcome: state.phase === 'won' ? 'W' : 'L',
      team: teamProfile.shortName,
      boss: FOURTH_PHASE_BOSSES[state.boss].name,
      score: state.runScore,
      bestPlay: state.bestPlay,
      runCode,
      cashIn: state.cashIn ? `${state.cashIn.points} ${state.cashIn.situation}` : undefined,
      jokers: state.jokers.map((joker) => jokerDefinition(joker).name),
      story: state.phase === 'won'
        ? `Cleared all ${FOURTH_PHASE_DRIVES} Drive Targets. ${state.cashIn?.reason ?? 'Won with clean calls and sideline help.'}`
        : lossReason,
    });
    try {
      const blob = await renderShareCard(payload);
      const fileName = `fourth-phase-${runCode.toLowerCase()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Fourth Phase run card', text: resultText() });
        setShareCardStatus('Shared');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setShareCardStatus('Saved image');
    } catch {
      setShareCardStatus('Share image failed');
    }
  }

  function toggleCard(card: FourthPhaseCard) {
    if (state.phase !== 'play') return;
    setCoachNudge('');
    setResolution(null);
    setState((current) => {
      const exists = current.selectedIds.includes(card.id);
      if (exists) return { ...current, selectedIds: current.selectedIds.filter((id) => id !== card.id) };
      if (current.selectedIds.length >= FOURTH_PHASE_PLAY_LIMIT) return current;
      return { ...current, selectedIds: [...current.selectedIds, card.id] };
    });
  }

  function reorderSelected(targetId: string) {
    if (!dragCard || dragCard === targetId) return;
    setState((current) => {
      const from = current.selectedIds.indexOf(dragCard);
      const to = current.selectedIds.indexOf(targetId);
      return { ...current, selectedIds: dragReorder(current.selectedIds, from, to) };
    });
    setDragCard(null);
  }

  function reorderJokers(targetId: string) {
    if (!dragJoker || dragJoker === targetId) return;
    setState((current) => {
      const from = current.jokers.findIndex((joker) => joker.id === dragJoker);
      const to = current.jokers.findIndex((joker) => joker.id === targetId);
      return { ...current, jokers: dragReorder(current.jokers, from, to) };
    });
    setDragJoker(null);
  }

  // Touch- and keyboard-accessible reorder (HTML5 drag does not fire on touch devices).
  function moveSelected(id: string, dir: -1 | 1) {
    if (state.phase !== 'play') return;
    setResolution(null);
    setCoachNudge('');
    setState((current) => {
      const from = current.selectedIds.indexOf(id);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= current.selectedIds.length) return current;
      return { ...current, selectedIds: dragReorder(current.selectedIds, from, to) };
    });
  }

  function moveJoker(id: string, dir: -1 | 1) {
    setState((current) => {
      const from = current.jokers.findIndex((joker) => joker.id === id);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= current.jokers.length) return current;
      return { ...current, jokers: dragReorder(current.jokers, from, to) };
    });
  }

  function coachOrderSelected() {
    if (!selectedCards.length) return;
    setResolution(null);
    setState((current) => {
      const byId = new Map(current.hand.map((card) => [card.id, card]));
      const selected = current.selectedIds.map((id) => byId.get(id)).filter((card): card is FourthPhaseCard => Boolean(card));
      return { ...current, selectedIds: coachOrderCards(selected).map((card) => card.id) };
    });
    setCoachNudge('Coach ordered the series: Crowd first, Offense cashes.');
  }

  function refillHand(current: LabState, hand: FourthPhaseCard[], discardPile: FourthPhaseCard[], drawExtra: number) {
    const count = Math.max(0, FOURTH_PHASE_HAND_SIZE - hand.length) + Math.max(0, drawExtra);
    const draw = drawFourthPhaseCards(
      current.drawPile,
      discardPile,
      count,
      mulberry32(stringSeed(`${current.seed}:draw:${current.drawNonce}`)),
    );
    return {
      hand: [...hand, ...draw.drawn].slice(0, FOURTH_PHASE_HAND_SIZE + 2),
      drawPile: draw.deck,
      discardPile: draw.discard,
      drawNonce: current.drawNonce + 1,
    };
  }

  function executePlay() {
    if (!preview || selectedCards.length === 0 || state.phase !== 'play') return;
    if (tutorialStep === 0 && !tutorialCheckdownIsValid(selectedCards, preview)) {
      setCoachNudge('Coach wants exactly one blue Offense card first. Save the combo for the next snap.');
      return;
    }
    if (tutorialStep === 1 && !isTrueCrowdBeforeOffenseCash(selectedCards, preview)) {
      setCoachNudge('Coach stopped it: put a purple Crowd card left of the blue Offense card. Left resolves first, so momentum builds before the cash.');
      return;
    }
    if (tutorialStep >= 0) advanceTutorial(preview.didCash);
    setCoachNudge('');
    setShareCopied(false);
    setShareCardStatus('');
    setResolution((current) => buildResolution(preview, playExplanation, (current?.key ?? 0) + 1));
    setState((current) => {
      const ids = new Set(current.selectedIds);
      const selected = current.selectedIds
        .map((id) => current.hand.find((card) => card.id === id))
        .filter((card): card is FourthPhaseCard => Boolean(card));
      const result = scoreFourthPhasePlay(selected, buildPlayContext(current));
      const hand = current.hand.filter((card) => !ids.has(card.id));
      const discardPile = [...current.discardPile, ...selected];
      const refill = refillHand(current, hand, discardPile, result.fuel.draw);
      const driveScore = current.driveScore + result.points;
      const runScore = current.runScore + result.points;
      const repeatedSituations = {
        ...current.repeatedSituations,
        [result.situation.key]: (current.repeatedSituations[result.situation.key] ?? 0) + 1,
      };
      const cashEval = evaluateCashIn(result, current.targets[current.driveIndex], current.bestPlay);
      const cashIn = cashEval.show
        ? {
          points: result.points,
          situation: result.situation.label,
          bigPlay: result.bigPlay,
          meter: result.meterAfterCash,
          reason: cashEval.reason,
        }
        : current.cashIn;
      const baseUpdate: LabState = {
        ...current,
        ...refill,
        selectedIds: [],
        driveScore,
        runScore,
        playsThisDrive: current.playsThisDrive + 1,
        meter: result.meterAfter,
        meterCap: result.meterCap,
        money: Math.max(0, current.money + result.fuel.money),
        discounts: Math.min(FOURTH_PHASE_DISCOUNT_TOKEN_CAP, current.discounts + result.fuel.discount),
        repeatedSituations,
        bestPlay: Math.max(current.bestPlay, result.points),
        lastPlay: result,
        cashIn,
      };
      if (driveScore >= current.targets[current.driveIndex]) {
        if (current.driveIndex >= FOURTH_PHASE_DRIVES - 1) {
          const bestPlay = Math.max(current.bestPlay, result.points);
          return {
            ...baseUpdate,
            phase: 'won',
            meter: BASE_METER,
            completion: makeRunRecord(current, runScore, true, bestPlay),
          };
        }
        const warRoomMoney = baseUpdate.money + 5 + current.driveIndex * 2;
        return {
          ...baseUpdate,
          phase: 'warRoom',
          draft: generateFourthPhaseWarRoomOffers(
            baseUpdate.jokers,
            current.seed,
            current.driveIndex,
            current.team,
            current.boss,
            0,
            current.practice,
          ),
          money: warRoomMoney,
          meter: BASE_METER,
          buysThisWarRoom: 0,
          rerollsThisWarRoom: 0,
          pendingDraft: undefined,
        };
      }
      const outOfPlayableCards =
        refill.hand.length === 0 ||
        (baseUpdate.playsThisDrive >= FOURTH_PHASE_MAX_PLAYS_PER_DRIVE && driveScore < current.targets[current.driveIndex]);
      if (outOfPlayableCards) {
        const bestPlay = Math.max(current.bestPlay, result.points);
        return { ...baseUpdate, phase: 'lost', meter: BASE_METER, completion: makeRunRecord(current, runScore, false, bestPlay) };
      }
      return baseUpdate;
    });
  }

  function redrawHand() {
    if (state.phase !== 'play' || state.discardsLeft <= 0) return;
    setResolution(null);
    setCoachNudge('');
    setState((current) => {
      const draw = drawFourthPhaseCards(
        current.drawPile,
        [...current.discardPile, ...current.hand],
        FOURTH_PHASE_HAND_SIZE,
        mulberry32(stringSeed(`${current.seed}:redraw:${current.drawNonce}`)),
      );
      return {
        ...current,
        hand: draw.drawn,
        drawPile: draw.deck,
        discardPile: draw.discard,
        selectedIds: [],
        discardsLeft: current.discardsLeft - 1,
        drawNonce: current.drawNonce + 1,
      };
    });
  }

  function buildNextDriveState(current: LabState, nextJokers: FourthPhaseJokerState[], nextPractice: FourthPhasePracticeBook, money: number): LabState {
    const nextDrive = current.driveIndex + 1;
    const stake = fourthPhaseStake(current.stake);
    const fullPile = shuffleFourthPhase(
      [...current.drawPile, ...current.hand, ...current.discardPile],
      mulberry32(stringSeed(`${current.seed}:drive:${nextDrive}`)),
    );
    const meter = applyFourthPhaseDrawStart(
      { meter: BASE_METER, meterCap: Math.max(BASE_METER_CAP, current.meterCap) },
      { jokers: nextJokers, practice: nextPractice, wins: nextDrive, boss: activeBossForDrive(current, nextDrive, stake.bossFromDrive) },
    );
    const draw = drawFourthPhaseCards(fullPile, [], FOURTH_PHASE_HAND_SIZE, mulberry32(stringSeed(`${current.seed}:drive-hand:${nextDrive}`)));
    return {
      ...current,
      awaitingKickoff: true,
      driveIndex: nextDrive,
      drawPile: draw.deck,
      discardPile: draw.discard,
      hand: draw.drawn,
      selectedIds: [],
      jokers: nextJokers,
      practice: nextPractice,
      draft: [],
      money,
      driveScore: 0,
      discardsLeft: stake.discardsPerDrive,
      playsThisDrive: 0,
      meter: meter.meter,
      meterCap: meter.meterCap,
      repeatedSituations: {},
      drawNonce: current.drawNonce + 1,
      phase: 'play',
      buysThisWarRoom: 0,
      rerollsThisWarRoom: 0,
      pendingDraft: undefined,
      lastPlay: undefined,
      cashIn: undefined,
    };
  }

  function startNextDrive(nextJokers: FourthPhaseJokerState[], nextPractice: FourthPhasePracticeBook, money: number) {
    setState((current) => buildNextDriveState(current, nextJokers, nextPractice, money));
  }

  function finishPurchase(
    current: LabState,
    offer: FourthPhaseWarRoomOffer,
    jokers: FourthPhaseJokerState[],
    practice: FourthPhasePracticeBook,
    money: number,
    discounts: number,
  ): LabState {
    const buysThisWarRoom = current.buysThisWarRoom + 1;
    const next = {
      ...current,
      jokers,
      practice,
      money,
      discounts,
      buysThisWarRoom,
      draft: current.draft.filter((candidate) => candidate.id !== offer.id),
      pendingDraft: undefined,
    };
    if (buysThisWarRoom >= FOURTH_PHASE_WAR_ROOM_BUY_LIMIT) {
      return buildNextDriveState(next, jokers, practice, money);
    }
    return next;
  }

  function buyOffer(offer: FourthPhaseWarRoomOffer) {
    if (state.phase !== 'warRoom' || state.money < discountedOfferCost(offer.cost, state.discounts).cost) return;
    if (offer.kind === 'joker' && offer.joker && state.jokers.length >= FOURTH_PHASE_JOKER_LIMIT) {
      setState((current) => ({ ...current, pendingDraft: offer }));
      return;
    }
    setState((current) => {
      const { cost, used } = discountedOfferCost(offer.cost, current.discounts);
      if (current.phase !== 'warRoom' || current.money < cost) return current;
      if (offer.kind === 'joker' && offer.joker) {
        return finishPurchase(current, offer, [...current.jokers, offer.joker], current.practice, current.money - cost, current.discounts - used);
      }
      if (offer.kind === 'practice' && offer.situation) {
        const practice = { ...current.practice, [offer.situation]: Math.min(3, (current.practice[offer.situation] ?? 0) + 1) };
        return finishPurchase(current, offer, current.jokers, practice, current.money - cost, current.discounts - used);
      }
      return current;
    });
  }

  function confirmReplaceJoker(index: number) {
    if (state.phase !== 'warRoom' || !state.pendingDraft?.joker) return;
    setState((current) => {
      const pending = current.pendingDraft;
      if (!pending?.joker || current.phase !== 'warRoom') return current;
      const { cost, used } = discountedOfferCost(pending.cost, current.discounts);
      if (current.money < cost) return current;
      const nextJokers = current.jokers.map((joker, i) => (i === index ? pending.joker! : joker));
      return finishPurchase(current, pending, nextJokers, current.practice, current.money - cost, current.discounts - used);
    });
  }

  function cancelReplaceJoker() {
    setState((current) => ({ ...current, pendingDraft: undefined }));
  }

  function skipWarRoom() {
    if (state.phase !== 'warRoom') return;
    startNextDrive(state.jokers, state.practice, state.money + (state.buysThisWarRoom > 0 ? 0 : 3));
  }

  function rerollWarRoom() {
    if (state.phase !== 'warRoom' || state.money < FOURTH_PHASE_WAR_ROOM_REROLL_COST) return;
    setState((current) => {
      if (current.phase !== 'warRoom' || current.money < FOURTH_PHASE_WAR_ROOM_REROLL_COST) return current;
      const rerollsThisWarRoom = current.rerollsThisWarRoom + 1;
      return {
        ...current,
        money: current.money - FOURTH_PHASE_WAR_ROOM_REROLL_COST,
        rerollsThisWarRoom,
        pendingDraft: undefined,
        draft: generateFourthPhaseWarRoomOffers(
          current.jokers,
          current.seed,
          current.driveIndex,
          current.team,
          current.boss,
          rerollsThisWarRoom,
          current.practice,
        ),
      };
    });
  }

  function dragProps(id: string, setter: (id: string | null) => void, onDropId: (id: string) => void) {
    return {
      draggable: true,
      onDragStart: (event: DragEvent) => {
        event.dataTransfer.setData('text/plain', id);
        setter(id);
      },
      onDragOver: (event: DragEvent) => event.preventDefault(),
      onDrop: () => onDropId(id),
      onDragEnd: () => setter(null),
    };
  }

  const meterHint = preview?.didCash
    ? `this series cashes it: Explosive x${preview.bigPlay.toFixed(2)}`
    : meterHot
      ? `momentum hot: Offense cashes ${formatMeter(state.meter)}. Holding bleeds.`
      : 'Crowd builds it. Offense cashes it.';

  const nextBossKey = state.phase === 'warRoom' && state.driveIndex + 1 < FOURTH_PHASE_DRIVES
    ? activeBossForDrive(state, state.driveIndex + 1, stakeProfile.bossFromDrive)
    : 'none';
  const warRoomCoachPick = state.phase === 'warRoom'
    ? coachPickForWarRoom(state.draft, state.team, nextBossKey)
    : null;

  function coachCardTone(card: FourthPhaseCard): 'highlight' | 'dim' | undefined {
    if (!coachMode) return undefined;
    if (tutorialStep === 0) return card.phase === 'offense' ? 'highlight' : 'dim';
    if (tutorialStep === 1) return card.phase === 'crowd' || card.phase === 'offense' ? 'highlight' : 'dim';
    return undefined;
  }

  const shellImpact = resolution?.impact === 'huge' ? 'fp-impact-huge' : resolution?.impact === 'cash' ? 'fp-impact-cash' : undefined;
  const runInProgress = runStarted && (state.phase === 'play' || state.phase === 'warRoom');

  if (screen === 'title') {
    return (
      <Shell>
        <TitleScreen
          canContinue={runInProgress}
          onContinue={() => setScreen('game')}
          onPlay={() => setScreen('teams')}
          onDaily={startDailyRun}
          dailyLabel={daily.label}
          todayDailyDone={todayDailyDone}
          dailyStreak={dailyRecord?.streak ?? 0}
          localBest={localBest?.score ?? null}
          wins={career.wins}
          onExit={onHome}
        />
      </Shell>
    );
  }

  if (screen === 'teams') {
    return (
      <Shell>
        <TeamSelectScreen
          progress={career}
          pickTeam={pickTeam}
          pickStake={pickStake}
          onPickTeam={(team) => {
            setPickTeam(team);
            setPickStake((level) => Math.min(level, fourthPhaseMaxStake(career, team)));
          }}
          onPickStake={setPickStake}
          onStart={() => restart(pickTeam, undefined, undefined, pickStake)}
          onBack={() => setScreen('title')}
          importCode={importCode}
          importError={importError}
          onImportCode={(value) => {
            setImportCode(value);
            setImportError('');
          }}
          onImport={importRunCode}
        />
      </Shell>
    );
  }

  if (state.phase === 'play' && state.awaitingKickoff) {
    return (
      <Shell>
        <GameHeader runCode={runCode} stakeLevel={state.stake} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />
        <DriveIntroScreen
          driveNumber={state.driveIndex + 1}
          drives={FOURTH_PHASE_DRIVES}
          target={target}
          teamName={teamProfile.name}
          teamIdentity={teamProfile.identity}
          stakeLevel={state.stake}
          boss={activeBoss !== 'none' ? FOURTH_PHASE_BOSSES[activeBoss] : null}
          upcomingBoss={activeBoss === 'none' ? FOURTH_PHASE_BOSSES[state.boss] : null}
          bossArrivesDrive={stakeProfile.bossFromDrive + 1}
          plays={FOURTH_PHASE_MAX_PLAYS_PER_DRIVE}
          redraws={state.discardsLeft}
          money={state.money}
          jokers={state.jokers.map((joker) => jokerDefinition(joker).name)}
          dailyLabel={state.dailyLabel}
          onKickoff={kickoffDrive}
        />
      </Shell>
    );
  }

  if (state.phase === 'warRoom') {
    return (
      <Shell impactClass={shellImpact}>
        <GameHeader runCode={runCode} stakeLevel={state.stake} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Metric label="Run progress" value={`${state.runScore}`} color={FB.gold} />
          <Metric label="Best series" value={`${state.bestPlay}`} color="#5fb4ff" />
        </div>
        <WarRoom
          money={state.money}
          discounts={state.discounts}
          draft={state.draft}
          jokers={state.jokers}
          pendingDraft={state.pendingDraft}
          buysThisWarRoom={state.buysThisWarRoom}
          nextDriveNumber={state.driveIndex + 2}
          nextTarget={state.targets[state.driveIndex + 1]}
          nextBoss={nextBossKey === 'none' ? null : FOURTH_PHASE_BOSSES[nextBossKey]}
          onDraft={buyOffer}
          onReplace={confirmReplaceJoker}
          onCancelReplace={cancelReplaceJoker}
          onReroll={rerollWarRoom}
          onSkip={skipWarRoom}
          coachPick={warRoomCoachPick}
        />
        <section style={{ ...card(), padding: 10, marginTop: 10 }}>
          <div style={sectionLabel}>Sideline ({state.jokers.length}/{FOURTH_PHASE_JOKER_LIMIT})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
            {state.jokers.length === 0 && <span style={{ fontSize: 11, color: FB.textFaint }}>No jokers yet</span>}
            {state.jokers.map((joker) => {
              const def = jokerDefinition(joker);
              return (
                <span key={joker.id} title={def.effect} style={{ border: `1px solid ${def.rarity === 'legendary' ? FB.gold : def.rarity === 'rare' ? '#a987ff' : FB.border}`, borderRadius: FP_RADIUS.badge, color: FB.textDim, fontSize: 10.5, fontWeight: 850, padding: '3px 7px' }}>
                  {def.name}
                </span>
              );
            })}
          </div>
        </section>
      </Shell>
    );
  }

  if (state.phase === 'won' || state.phase === 'lost') {
    const won = state.phase === 'won';
    const nextStakeUnlocked = won && state.stake < FOURTH_PHASE_STAKES.length && fourthPhaseMaxStake(career, state.team) === state.stake + 1;
    return (
      <Shell impactClass={shellImpact}>
        <GameHeader runCode={runCode} stakeLevel={state.stake} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />
        <section style={{ ...card(), padding: 16, marginTop: 10, textAlign: 'center', borderColor: won ? FB.gold : FB.red }}>
          <div style={{ fontSize: 13, color: won ? FB.gold : FB.red, fontWeight: 950, letterSpacing: 0 }}>
            {won ? 'RUN WON' : 'RUN OVER'}
          </div>
          <div style={{ fontSize: 11, color: fourthPhaseStake(state.stake).color, fontWeight: 900, marginTop: 4 }}>
            {teamProfile.name} | {fourthPhaseStake(state.stake).name}
          </div>
          <div style={{ fontSize: 12, color: FB.textDim, marginTop: 6 }}>
            {won
              ? `All ${FOURTH_PHASE_DRIVES} drives cleared against ${FOURTH_PHASE_BOSSES[state.boss].name}.`
              : lossReason}
          </div>
          {lossDiagnosis && (
            <div style={{ border: `1px solid rgba(242,189,61,0.42)`, borderRadius: 8, color: FB.gold, background: 'rgba(242,189,61,0.07)', padding: '8px 10px', fontSize: 11.5, fontWeight: 850, marginTop: 8, lineHeight: 1.4, textAlign: 'left' }}>
              {lossDiagnosis.advice}
            </div>
          )}
          <div className="fb-num" style={{ fontSize: 40, color: FB.gold, fontWeight: 950, marginTop: 8, lineHeight: 1 }}>{state.runScore}</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 2 }}>total progress</div>
          {state.completion && localBest?.id === state.completion.id && (
            <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900, marginTop: 5 }}>New local best</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
            <Metric label="Best series" value={`${state.bestPlay}`} color={FB.gold} />
            <Metric label="Drives" value={`${won ? FOURTH_PHASE_DRIVES : state.driveIndex + 1}/${FOURTH_PHASE_DRIVES}`} color="#5fb4ff" />
            <Metric label="Boss" value={FOURTH_PHASE_BOSSES[state.boss].name} color={FB.red} small />
          </div>
          {nextStakeUnlocked && (
            <UnlockBanner
              title={`${fourthPhaseStake(state.stake + 1).name} unlocked`}
              detail={`${teamProfile.name} can now play at ${fourthPhaseStake(state.stake + 1).name}: ${fourthPhaseStake(state.stake + 1).modifiers.join(', ')}.`}
              color={fourthPhaseStake(state.stake + 1).color}
            />
          )}
          {justUnlocked.map((team) => (
            <UnlockBanner
              key={team}
              title={`New team unlocked: ${FOURTH_PHASE_TEAMS[team].name}`}
              detail={FOURTH_PHASE_TEAMS[team].identity}
              color={FB.gold}
            />
          ))}
          {state.dailyLabel && (
            <div style={{ fontSize: 11, color: '#cbbdff', fontWeight: 800, marginTop: 8 }}>
              Daily {state.dailyLabel}{state.dailyPractice ? ' | practice (streak unchanged)' : dailyRecord ? ` | streak ${dailyRecord.streak}` : ''}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 8 }}>{runCode}. Import this code to replay the same run.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button onClick={() => restart(state.team, undefined, undefined, state.stake)} style={btnPrimary}>Run it back</button>
            <button onClick={() => setScreen('teams')} style={{ ...btnGhost, minHeight: 48 }}>Locker room</button>
          </div>
          {won && nextStakeUnlocked && (
            <button
              onClick={() => restart(state.team, undefined, undefined, state.stake + 1)}
              style={{ ...btnGhost, width: '100%', marginTop: 8, borderColor: fourthPhaseStake(state.stake + 1).color, color: fourthPhaseStake(state.stake + 1).color }}
            >
              Go again at {fourthPhaseStake(state.stake + 1).name}
            </button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button onClick={copyResult} style={btnGhost}>{resultCopied ? 'Copied' : 'Copy result'}</button>
            <button onClick={shareRunCard} style={{ ...btnGhost, borderColor: FB.gold, color: FB.gold }}>
              {shareCardStatus || 'Save share card'}
            </button>
          </div>
          <button onClick={() => restart(state.team, state.seed, undefined, state.stake)} style={{ ...btnGhost, width: '100%', marginTop: 8 }}>
            Replay this seed
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <div
      className={shellImpact}
      style={{ minHeight: '100svh', padding: '10px 12px 96px', background: FB.bg }}
    >
      <div className="fp-screen-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      <GameHeader runCode={runCode} stakeLevel={state.stake} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />

      {tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length && (
        <section style={{ ...card(), padding: 13, marginBottom: 10, borderColor: FB.gold, background: 'linear-gradient(135deg,#1d2a17,#0d1118)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ ...sectionLabel, color: FB.gold }}>Coach step {tutorialStep + 1}/{TUTORIAL_STEPS.length}</div>
            <button onClick={finishTutorial} style={{ background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              Skip tutorial
            </button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 950, color: FB.text, marginTop: 4 }}>{TUTORIAL_STEPS[tutorialStep].title}</div>
          <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.45, marginTop: 4 }}>{TUTORIAL_STEPS[tutorialStep].body}</div>
          {coachNudge && (
            <div style={{ border: `1px solid ${FB.gold}`, borderRadius: 8, color: FB.gold, background: 'rgba(240,180,41,0.08)', padding: '8px 9px', marginTop: 9, fontSize: 11.5, fontWeight: 850 }}>
              {coachNudge}
            </div>
          )}
          {canCoachOrder && (
            <button
              onClick={coachOrderSelected}
              style={{ ...btnGhost, width: '100%', marginTop: 9, borderColor: selectedNeedsCoachOrder ? FB.gold : FB.border, color: selectedNeedsCoachOrder ? FB.gold : FB.textDim }}
            >
              Coach Order: Crowd first
            </button>
          )}
          {TUTORIAL_STEPS[tutorialStep].cta && (
            <button onClick={finishTutorial} style={{ ...btnPrimary, width: '100%', marginTop: 10 }}>{TUTORIAL_STEPS[tutorialStep].cta}</button>
          )}
        </section>
      )}

      <GameStatusPanel
        labPhase={state.phase}
        teamName={teamProfile.name}
        teamIdentity={teamProfile.identity}
        driveIndex={state.driveIndex}
        drives={FOURTH_PHASE_DRIVES}
        driveScore={state.driveScore}
        target={target}
        targetRemaining={targetRemaining}
        progress={progress}
        meter={state.meter}
        meterCap={state.meterCap}
        meterFill={meterFill}
        meterHint={meterHint}
        meterHot={meterHot}
        meterWillCash={Boolean(preview?.didCash)}
        playsLeft={playsLeft}
        maxPlays={FOURTH_PHASE_MAX_PLAYS_PER_DRIVE}
        coachMode={coachMode}
        activeBoss={activeBoss === 'none' ? null : FOURTH_PHASE_BOSSES[activeBoss]}
        scoutingBoss={!coachMode && activeBoss === 'none' ? FOURTH_PHASE_BOSSES[state.boss] : null}
        bossArrivesDrive={stakeProfile.bossFromDrive + 1}
      />

      {resolution && (
        <section key={resolution.key} className={resolution.impact === 'normal' ? 'fp-resolve' : 'fp-resolve fp-resolve-cash'} style={{ ...card(), padding: 12, marginTop: 10, borderColor: resolution.impact === 'normal' ? FB.border : FB.gold, background: resolution.impact === 'normal' ? '#101722' : 'linear-gradient(135deg,#2a1d08,#101722)' }}>
          <div style={{ ...sectionLabel, color: resolution.impact === 'normal' ? FB.textFaint : FB.gold }}>Series Result</div>
          <div style={{ fontSize: 12, color: FB.text, fontWeight: 900, marginTop: 5 }}>{resolution.explanation}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resolution.stages.length}, minmax(0, 1fr))`, gap: 6, marginTop: 10 }}>
            {resolution.stages.map((stage, index) => (
              <div key={`${stage.label}-${index}`} className="fp-stage" style={{ '--fp-stage-delay': `${index * 90}ms`, border: `1px solid ${FB.border}`, borderRadius: 8, padding: '7px 6px', background: FB.inset } as CSSProperties}>
                <div style={{ fontSize: 9.5, color: FB.textFaint, fontWeight: 900 }}>{stage.label}</div>
                <div className="fb-num" style={{ fontSize: 15, color: stage.color, fontWeight: 950 }}>{stage.value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {state.cashIn && (
        <section
          key={`${state.cashIn.points}:${state.cashIn.situation}:${state.cashIn.reason}`}
          style={{ ...card(), padding: 13, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(135deg,#2b2109,#111820)', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
            <div>
              <div className="fp-cashed-stamp" style={{ display: 'inline-block', border: `2px solid ${FB.gold}`, borderRadius: 6, color: FB.gold, padding: '3px 9px', fontSize: 13, fontWeight: 950, letterSpacing: 1.5 }}>
                CASHED
              </div>
              <div style={{ fontSize: 12, color: FB.text, fontWeight: 900, marginTop: 6 }}>{state.cashIn.reason}</div>
            </div>
            <div style={{ border: `1px solid rgba(242,189,61,0.55)`, borderRadius: FP_RADIUS.pill, color: FB.gold, padding: '4px 8px', fontSize: 10, fontWeight: 950, whiteSpace: 'nowrap' }}>
              {formatMeter(state.cashIn.meter)} momentum -&gt; Explosive x{state.cashIn.bigPlay.toFixed(2)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 12, alignItems: 'end', marginTop: 8 }}>
            <div className="fb-num fp-points-land" style={{ fontSize: 58, color: FB.gold, fontWeight: 950, lineHeight: 0.88 }}>{state.cashIn.points}</div>
            <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: FB.text, fontWeight: 950, lineHeight: 1.15 }}>{state.cashIn.situation}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Metric label="Momentum" value={formatMeter(state.cashIn.meter)} color="#cbbdff" />
                <Metric label="Run" value={runCode} color={FB.text} small />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 8, lineHeight: 1.3 }}>
            {FOURTH_PHASE_TEAMS[state.team].shortName} | {state.jokers.map((joker) => jokerDefinition(joker).name).join(' / ') || 'No jokers'}
          </div>
          <button onClick={copyCashCard} style={{ ...btnGhost, width: '100%', marginTop: 10, borderColor: 'rgba(242,189,61,0.55)', color: FB.gold }}>
            {shareCopied ? 'Copied' : 'Copy cash card'}
          </button>
        </section>
      )}

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Call Sheet</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>{state.selectedIds.length}/{FOURTH_PHASE_PLAY_LIMIT}. Left scores first.</div>
        </div>
        <div style={{ border: `1px solid ${preview?.didCash ? FB.gold : FB.border}`, borderRadius: 8, background: '#101722', color: preview?.didCash ? FB.gold : FB.textDim, padding: '8px 9px', fontSize: 11.5, fontWeight: 850, marginBottom: 8 }}>
          {playExplanation}
        </div>
        <div style={{ display: 'flex', gap: 6, minHeight: 100, overflowX: 'auto', paddingBottom: 2 }}>
          {selectedCards.length === 0 ? (
            <div style={{ ...emptyWide }}>Select up to five cards</div>
          ) : selectedCards.map((card, index) => (
            <div key={card.id} style={{ display: 'flex', gap: 6 }}>
              {index > 0 && (
                <div aria-hidden="true" style={{ alignSelf: 'center', color: FB.textFaint, fontSize: 13, fontWeight: 900, marginTop: -20 }}>→</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ position: 'relative' }}>
                <span style={orderBadge}>{index + 1}</span>
                {preview?.cashesAtCardIndex === index && <span style={cashBadge}>CASHES</span>}
                {preview?.cashesAtCardIndex != null && index < preview.cashesAtCardIndex && card.phase === 'crowd' && (
                  <span style={chargeBadge}>CHARGE</span>
                )}
                <MiniCard
                  card={card}
                  selected
                  dragProps={dragProps(card.id, setDragCard, reorderSelected)}
                  onClick={() => toggleCard(card)}
                />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  aria-label={`Move ${cardDisplayName(card)} earlier`}
                  disabled={index === 0}
                  onClick={() => moveSelected(card.id, -1)}
                  style={{ ...reorderBtn, opacity: index === 0 ? 0.35 : 1 }}
                >
                  ◀
                </button>
                <button
                  aria-label={`Move ${cardDisplayName(card)} later`}
                  disabled={index === selectedCards.length - 1}
                  onClick={() => moveSelected(card.id, 1)}
                  style={{ ...reorderBtn, opacity: index === selectedCards.length - 1 ? 0.35 : 1 }}
                >
                  ▶
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...card(), padding: 12, marginTop: 10, borderColor: preview?.didCash ? FB.gold : preview?.bust ? 'rgba(240,117,138,0.55)' : FB.border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
          <div style={sectionLabel}>This series</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, flexWrap: 'wrap' }}>
              {previewVerb && <EffectVerbChip verb={previewVerb} />}
              <div style={{ fontSize: 15, color: FB.text, fontWeight: 950 }}>
                {preview
                  ? preview.situation.label
                  : state.lastPlay
                    ? `Last: ${state.lastPlay.situation.label} | ${state.lastPlay.points}`
                    : 'No series selected'}
              </div>
            </div>
          </div>
          <div className="fb-num" style={{ fontSize: 30, color: preview?.didCash ? FB.gold : FB.text, fontWeight: 950 }}>
            {preview ? preview.points : 0}
          </div>
        </div>
        {preview && (
          <>
            <div style={{ fontSize: 11.5, color: FB.textDim, fontWeight: 850, marginTop: 8 }}>
              <span className="fb-num" style={{ color: '#5fb4ff' }}>{preview.yards} Yards</span>
              {' × '}
              <span className="fb-num" style={{ color: '#ff7c93' }}>{Math.max(0.1, 1 + preview.execution).toFixed(2)} Leverage</span>
              {' × '}
              <span className="fb-num" style={{ color: '#f4c24f' }}>{preview.bigPlay.toFixed(2)} Explosive</span>
              {' = '}
              <span className="fb-num" style={{ color: FB.text }}>{preview.points}</span>
            </div>
            {preview.bust && (
              <div style={{ fontSize: 11, color: FB.red, fontWeight: 800, marginTop: 8 }}>
                Bad call: these phases make no clean series. Penalty score and momentum bleeds.
              </div>
            )}
            {bossWarning && (
              <div style={{ fontSize: 11, color: FB.red, fontWeight: 900, marginTop: 8 }}>
                {bossWarning}
              </div>
            )}
            {previewBleeds && (
              <div style={{ border: `1px solid rgba(169,135,255,0.5)`, borderRadius: 8, color: '#cbbdff', background: 'rgba(169,135,255,0.08)', padding: '7px 9px', fontSize: 11, fontWeight: 850, marginTop: 8 }}>
                Hot momentum ignored: it bleeds to {formatMeter(preview.meterAfter)} if you run this. Add Offense to cash it instead.
              </div>
            )}
            {reorderHint && (
              <button
                onClick={coachOrderSelected}
                style={{ ...btnGhost, width: '100%', marginTop: 8, borderColor: FB.gold, color: FB.gold }}
              >
                {reorderHint.unlocksCash ? 'Reorder to cash momentum' : 'Better order available'}: +{reorderHint.delta} points
              </button>
            )}
            <AfterThisLine points={preview.points} targetRemaining={targetRemaining} playsLeft={playsLeft} />
          </>
        )}
      </section>

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Hand</div>
          {!coachMode && <div style={{ fontSize: 11, color: FB.textFaint }}>War Room cash <span style={{ color: FB.gold, fontWeight: 900 }}>${state.money}</span></div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {state.hand.map((card) => (
            <HandCard key={card.id} card={card} selected={state.selectedIds.includes(card.id)} tone={coachCardTone(card)} onClick={() => toggleCard(card)} />
          ))}
        </div>
      </section>

      {!coachMode && state.lastPlay && (
        <section style={{ ...card(), padding: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={sectionLabel}>Last series</div>
            <button
              onClick={() => setLedgerExpanded((value) => !value)}
              style={{ ...btnGhost, minHeight: 0, padding: '4px 10px', fontSize: 10.5 }}
            >
              {ledgerExpanded ? 'Hide the math' : `Show the math (${state.lastPlay.ledger.length})`}
            </button>
          </div>
          <div style={{ fontSize: 12, color: FB.text, fontWeight: 850, lineHeight: 1.4, marginTop: 6 }}>
            {plainPlaySummary(state.lastPlay)}
          </div>
          {ledgerExpanded && (
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {state.lastPlay.ledger.map((entry, index) => (
                <div key={`${entry.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '92px 76px 1fr', gap: 6, fontSize: 11, color: FB.textDim }}>
                  <span style={{ color: entry.channel === 'joker' ? '#cbbdff' : entry.channel === 'boss' ? FB.red : FB.textFaint, fontWeight: 900 }}>{entry.label}</span>
                  <span className="fb-num" style={{ color: FB.text, fontWeight: 900 }}>{entry.value}</span>
                  <span>{entry.detail}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!coachMode && <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Sideline (Jokers)</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>◀ ▶ or drag to reorder</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
          {Array.from({ length: FOURTH_PHASE_JOKER_LIMIT }).map((_, index) => {
            const joker = state.jokers[index];
            if (!joker) return <div key={index} style={{ ...emptySlot }}>Slot {index + 1}</div>;
            const def = jokerDefinition(joker);
            return (
              <div key={joker.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  {...dragProps(joker.id, setDragJoker, reorderJokers)}
                  title={def.effect}
                  style={{
                    ...card(),
                    minHeight: 58,
                    padding: '7px 6px',
                    borderColor: def.rarity === 'legendary' ? '#f4c24f' : def.rarity === 'rare' ? '#a987ff' : FB.border,
                    color: FB.text,
                    cursor: 'grab',
                  }}
                >
                  <div style={{ fontSize: 10, color: def.rarity === 'legendary' ? FB.gold : '#aeb7c6', fontWeight: 950, lineHeight: 1.05 }}>{def.name}</div>
                  <div style={{ fontSize: 9, color: FB.textFaint, marginTop: 3 }}>{def.rarity}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    aria-label={`Move ${def.name} earlier`}
                    disabled={index === 0}
                    onClick={() => moveJoker(joker.id, -1)}
                    style={{ ...reorderBtn, opacity: index === 0 ? 0.35 : 1 }}
                  >
                    ◀
                  </button>
                  <button
                    aria-label={`Move ${def.name} later`}
                    disabled={index === state.jokers.length - 1}
                    onClick={() => moveJoker(joker.id, 1)}
                    style={{ ...reorderBtn, opacity: index === state.jokers.length - 1 ? 0.35 : 1 }}
                  >
                    ▶
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>}

      {!coachMode && <SituationsPanel activeKey={preview?.situation.key} defaultOpen={false} />}

      {!coachMode && <HowToPlay defaultOpen={false} />}

      </div>

      {state.phase === 'play' && (
        <div style={bottomBar}>
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: previewVerb ? EFFECT_VERB_COLOR[previewVerb] : FB.textFaint, fontWeight: 900, letterSpacing: 0, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {preview && previewVerb ? `${previewVerb} · ${preview.situation.label}` : 'Tap cards to build a series'}
              </div>
              <div className="fb-num" style={{ fontSize: 24, color: preview?.didCash ? FB.gold : FB.text, fontWeight: 950, lineHeight: 1.05 }}>
                {preview ? preview.points : 0}
                <span style={{ fontSize: 11, color: FB.textFaint, fontWeight: 800 }}> progress{preview?.didCash ? ' | cashes' : ''}</span>
              </div>
              {preview && (
                <div style={{ fontSize: 10.5, color: preview.didCash ? FB.gold : FB.textFaint, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {playExplanation}
                </div>
              )}
            </div>
            <button
              onClick={executePlay}
              disabled={!preview}
              style={{ ...btnPrimary, padding: '0 18px', minHeight: 48, opacity: preview ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
            >
              <FootballGlyph size={15} />
              Run Series
            </button>
            <button
              onClick={redrawHand}
              disabled={state.discardsLeft <= 0}
              style={{ ...btnGhost, minHeight: 48, padding: '0 12px', opacity: state.discardsLeft > 0 ? 1 : 0.45 }}
            >
              Redraw ({state.discardsLeft})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const emptySlot: CSSProperties = {
  minHeight: 58,
  border: `1px dashed ${FB.border}`,
  borderRadius: FP_RADIUS.card,
  display: 'grid',
  placeItems: 'center',
  color: FB.textFaint,
  fontSize: 10,
  fontWeight: 800,
};

const orderBadge: CSSProperties = {
  position: 'absolute',
  top: -6,
  left: -6,
  zIndex: 2,
  minWidth: 18,
  height: 18,
  borderRadius: FP_RADIUS.pill,
  background: FB.gold,
  color: '#1a1206',
  fontSize: 11,
  fontWeight: 950,
  display: 'grid',
  placeItems: 'center',
  padding: '0 4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
};

const cashBadge: CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -4,
  zIndex: 2,
  borderRadius: FP_RADIUS.badge,
  background: '#34c771',
  color: '#04130c',
  fontSize: 8.5,
  fontWeight: 950,
  letterSpacing: 0,
  padding: '2px 4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
};

const chargeBadge: CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -4,
  zIndex: 2,
  borderRadius: FP_RADIUS.badge,
  background: '#a987ff',
  color: '#140b26',
  fontSize: 8.5,
  fontWeight: 950,
  letterSpacing: 0,
  padding: '2px 4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
};

const reorderBtn: CSSProperties = {
  flex: 1,
  minHeight: 36,
  borderRadius: FP_RADIUS.control,
  border: `1px solid ${FB.border}`,
  background: FB.panelRaised,
  color: FB.textDim,
  fontSize: 15,
  fontWeight: 900,
  cursor: 'pointer',
  lineHeight: 1,
};

const emptyWide: CSSProperties = {
  minHeight: 72,
  minWidth: '100%',
  border: `1px dashed ${FB.border}`,
  borderRadius: FP_RADIUS.card,
  display: 'grid',
  placeItems: 'center',
  color: FB.textFaint,
  fontSize: 12,
};

const bottomBar: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 40,
  padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
  background: 'rgba(8,11,16,0.94)',
  borderTop: `1px solid ${FB.border}`,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

function FootballGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.62)} viewBox="0 0 24 15" aria-hidden="true" style={{ display: 'block' }}>
      <ellipse cx="12" cy="7.5" rx="11" ry="6.8" fill="#7a4a20" stroke="#3d2510" strokeWidth="1" />
      <path d="M7.5 7.5h9" stroke="#f2ede4" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.3 5.8v3.4M11.2 5.5v4M13 5.5v4M14.8 5.8v3.4" stroke="#f2ede4" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// The one sentence a cold player must never lose: what to score, in how many
// calls, and the loop that gets them there. Lives at the top of the status panel
// and restates itself for the War Room and end states.
function ObjectiveHeader({
  labPhase,
  driveIndex,
  drives,
  targetRemaining,
  playsLeft,
  meterHot,
  meterWillCash,
}: {
  labPhase: LabPhase;
  driveIndex: number;
  drives: number;
  targetRemaining: number;
  playsLeft: number;
  meterHot: boolean;
  meterWillCash: boolean;
}) {
  let headline: ReactNode;
  let hint: ReactNode = null;
  if (labPhase === 'warRoom') {
    headline = <>Drive {driveIndex + 1} cleared. Draft help for Drive {driveIndex + 2}.</>;
  } else if (labPhase === 'won') {
    headline = <>All {drives} drives cleared. Run won.</>;
  } else if (labPhase === 'lost') {
    headline = <>Run over: the drive stalled {targetRemaining} short.</>;
  } else {
    headline = (
      <>
        Drive {driveIndex + 1} of {drives}: score{' '}
        <span className="fb-num" style={{ color: FB.gold }}>{targetRemaining}</span> more in{' '}
        <span className="fb-num" style={{ color: playsLeft <= 2 ? FB.red : FB.green }}>{playsLeft}</span>{' '}
        {playsLeft === 1 ? 'call' : 'calls'}
      </>
    );
    hint = meterWillCash ? (
      <>This call <b style={{ color: FB.gold }}>cashes momentum</b>. Run it.</>
    ) : meterHot ? (
      <>Momentum is hot: <b style={{ color: '#5fb4ff' }}>Offense</b> cashes it now.</>
    ) : (
      <>Build <b style={{ color: '#a987ff' }}>Crowd</b> {'→'} cash with <b style={{ color: '#5fb4ff' }}>Offense</b>.</>
    );
  }
  return (
    <div style={{ borderBottom: `1px solid ${FB.borderSoft}`, paddingBottom: 8 }}>
      <div style={{ fontSize: 14.5, color: FB.text, fontWeight: 950, lineHeight: 1.25 }}>{headline}</div>
      {hint && <div style={{ fontSize: 11.5, color: FB.textDim, fontWeight: 850, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function GameStatusPanel({
  labPhase,
  teamName,
  teamIdentity,
  driveIndex,
  drives,
  driveScore,
  target,
  targetRemaining,
  progress,
  meter,
  meterCap,
  meterFill,
  meterHint,
  meterHot,
  meterWillCash,
  playsLeft,
  maxPlays,
  coachMode,
  activeBoss,
  scoutingBoss,
  bossArrivesDrive,
}: {
  labPhase: LabPhase;
  teamName: string;
  teamIdentity: string;
  driveIndex: number;
  drives: number;
  driveScore: number;
  target: number;
  targetRemaining: number;
  progress: number;
  meter: number;
  meterCap: number;
  meterFill: number;
  meterHint: string;
  meterHot: boolean;
  meterWillCash: boolean;
  playsLeft: number;
  maxPlays: number;
  coachMode: boolean;
  activeBoss: FourthPhaseBossProfile | null;
  scoutingBoss: FourthPhaseBossProfile | null;
  bossArrivesDrive: number;
}) {
  const pressureLabel = coachMode ? 'Coach Mode' : activeBoss ? 'Boss Active' : 'Scouting';
  const pressureColor = coachMode ? FB.green : activeBoss ? FB.red : FB.gold;
  const pressureBody = coachMode
    ? 'Learn the call sheet first.'
    : activeBoss
      ? `${activeBoss.name}: ${activeBoss.effect}`
      : scoutingBoss
        ? `Drive ${bossArrivesDrive}: ${scoutingBoss.name}. ${scoutingBoss.effect}`
        : 'Open field. No boss pressure.';

  return (
    <section style={{ ...card(), ...meterStyle(meter, meterCap), padding: 12, overflow: 'hidden', position: 'relative', background: 'linear-gradient(180deg,#101722,#080b11)', marginTop: 2 }}>
      <div className="fb-yard" style={{ position: 'absolute', inset: 0, opacity: 0.32 }} />
      <div style={{ position: 'relative', display: 'grid', gap: 10 }}>
        <ObjectiveHeader
          labPhase={labPhase}
          driveIndex={driveIndex}
          drives={drives}
          targetRemaining={targetRemaining}
          playsLeft={playsLeft}
          meterHot={meterHot}
          meterWillCash={meterWillCash}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: FB.text, fontWeight: 950, lineHeight: 1.1 }}>{teamName}</div>
            <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 2, lineHeight: 1.25 }}>{teamIdentity}</div>
          </div>
          <div style={{ ...statTile, padding: '6px 8px', textAlign: 'right' }}>
            <div style={{ ...sectionLabel, fontSize: 9.5 }}>Drive</div>
            <div className="fb-num" style={{ fontSize: 17, color: FB.gold, fontWeight: 950, lineHeight: 1 }}>{driveIndex + 1}/{drives}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(132px, .95fr)', gap: 8, alignItems: 'stretch' }}>
          <div style={{ ...statTile, background: 'rgba(7,11,16,0.74)' }}>
            <div style={{ ...sectionLabel, color: FB.textDim }}>Drive Target</div>
            <div className="fb-led" style={{ fontSize: 31, color: FB.text, fontWeight: 950, lineHeight: 0.95, marginTop: 3 }}>
              {driveScore}<span style={{ fontSize: 14, color: FB.textFaint }}> / {target}</span>
            </div>
            <FieldProgress progress={progress} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 7 }}>
              <span style={{ fontSize: 10.5, color: FB.textFaint }}>{targetRemaining} left</span>
              <span style={{ fontSize: 10.5, color: FB.textDim, fontWeight: 850 }}>{playsLeft} calls</span>
            </div>
          </div>

          <div style={{ ...statTile, background: meterWillCash ? 'linear-gradient(180deg,#282009,#0a0f16)' : 'rgba(7,11,16,0.74)', borderColor: meterWillCash ? FB.gold : meterHot ? '#4e426f' : FB.borderSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <PhaseIcon phase="crowd" size={12} />
                <div style={{ ...sectionLabel, color: meterWillCash ? FB.gold : '#cbbdff' }}>Momentum</div>
              </div>
              <div className="fb-led" style={{ fontSize: 27, color: meterWillCash ? FB.gold : '#efe9ff', fontWeight: 950, lineHeight: 1 }}>
                {formatMeter(meter)}
              </div>
            </div>
            <div style={{ position: 'relative', height: 15, borderRadius: FP_RADIUS.card, background: '#111827', border: '1px solid #2a2441', overflow: 'hidden', marginTop: 9 }}>
              <div style={{ width: `${meterFill * 100}%`, height: '100%', background: 'linear-gradient(90deg,#4f9cff,#ad91ff,#f2bd3d)', transition: 'width 180ms ease-out' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent calc(6.25% - 2px), #0a0d13 calc(6.25% - 2px), #0a0d13 6.25%)' }} />
            </div>
            <div style={{ display: 'grid', gap: 3, marginTop: 7 }}>
              <span style={{ color: FB.textFaint, fontSize: 10 }}>cap {formatMeter(meterCap)}</span>
              <span style={{ color: meterWillCash ? FB.gold : meterHot ? '#cbbdff' : FB.textDim, fontSize: 10.5, fontWeight: 850, lineHeight: 1.25 }}>{meterHint}</span>
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${activeBoss ? 'rgba(240,117,138,0.55)' : coachMode ? 'rgba(73,209,126,0.45)' : 'rgba(242,189,61,0.42)'}`, borderRadius: FP_RADIUS.card, background: activeBoss ? 'rgba(240,117,138,0.08)' : 'rgba(242,189,61,0.07)', padding: '8px 9px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 9, alignItems: 'baseline' }}>
          <span style={{ ...sectionLabel, color: pressureColor, whiteSpace: 'nowrap' }}>{pressureLabel}</span>
          <span style={{ color: activeBoss ? '#ff9aac' : FB.textDim, fontSize: 11, fontWeight: 850, lineHeight: 1.3 }}>{pressureBody}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
          {Array.from({ length: maxPlays }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                width: 13,
                height: 5,
                borderRadius: 2,
                background: i < playsLeft ? FB.green : '#1c232e',
                border: `1px solid ${i < playsLeft ? '#1f6b44' : '#232c38'}`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Drive progress drawn as a field: turf bands, yard lines, hash marks, a striped
// end zone, and the ball marching toward the goal line as driveScore climbs.
// Pure presentation. Progress is the same driveScore/target ratio as before.
function FieldProgress({ progress }: { progress: number }) {
  const pos = Math.min(1, Math.max(0, progress));
  return (
    <div
      style={{
        position: 'relative',
        height: 46,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1d3527',
        marginTop: 10,
        background: 'repeating-linear-gradient(90deg, #0c1f14 0px, #0c1f14 22px, #102a1b 22px, #102a1b 44px)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.13) 0px, rgba(255,255,255,0.13) 1px, transparent 1px, transparent 8.8%)' }} />
      <div style={{ position: 'absolute', top: '32%', bottom: '32%', left: 0, right: '12%', backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, transparent 1px, transparent 11px)', opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(pos * 88).toFixed(2)}%`, background: 'linear-gradient(90deg, rgba(52,199,113,0.10), rgba(240,180,41,0.22))', transition: 'width 400ms ease-out' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '12%', background: 'repeating-linear-gradient(45deg, #251f07 0px, #251f07 5px, #2e2609 5px, #2e2609 10px)', borderLeft: '2px solid rgba(240,180,41,0.85)', display: 'grid', placeItems: 'center' }}>
        <span style={{ fontSize: 8.5, fontWeight: 950, color: FB.gold, letterSpacing: 0, writingMode: 'vertical-rl' }}>GOAL</span>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: `${(2 + pos * 86).toFixed(2)}%`, transform: 'translate(-50%, -50%)', transition: 'left 400ms cubic-bezier(.2,.9,.3,1.15)', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))' }}>
        <FootballGlyph size={20} />
      </div>
    </div>
  );
}

// Verb-first series labels. A cold player learns "this call CASHES / BUILDS /
// SETS UP" before they learn any formal Situation names.
const EFFECT_VERB_COLOR: Record<ReturnType<typeof playEffectVerb>, string> = {
  CASHES: '#f4c24f',
  SCORES: '#5fb4ff',
  BUILDS: '#a987ff',
  'SETS UP': '#34c771',
  'BAD CALL': '#f0758a',
};

function EffectVerbChip({ verb }: { verb: ReturnType<typeof playEffectVerb> }) {
  const color = EFFECT_VERB_COLOR[verb];
  return (
    <span
      style={{
        border: `1px solid ${color}`,
        borderRadius: FP_RADIUS.badge,
        color,
        background: 'rgba(7,11,16,0.56)',
        fontSize: 10,
        fontWeight: 950,
        letterSpacing: 0.4,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {verb}
    </span>
  );
}

// "After this: 120 to clear, 5 calls left" — the preview answers the objective,
// not just the score.
function AfterThisLine({ points, targetRemaining, playsLeft }: { points: number; targetRemaining: number; playsLeft: number }) {
  const clears = points >= targetRemaining;
  const remainingAfter = Math.max(0, targetRemaining - points);
  const playsAfter = Math.max(0, playsLeft - 1);
  return (
    <div style={{ fontSize: 11, color: clears ? FB.gold : FB.textFaint, fontWeight: clears ? 950 : 800, marginTop: 8 }}>
      {clears
        ? 'This series clears the drive.'
        : `After this: ${remainingAfter} to clear, ${playsAfter} ${playsAfter === 1 ? 'call' : 'calls'} left.`}
    </div>
  );
}

function Metric({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div style={{ ...statTile }}>
      <div style={{ fontSize: 10, color: FB.textFaint, fontWeight: 900 }}>{label}</div>
      <div className="fb-num" style={{ fontSize: small ? 12 : 16, color, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

const CARD_SURFACE: Record<FourthPhaseCard['phase'], string> = {
  offense: 'linear-gradient(180deg,#122033,#0d141f)',
  defense: 'linear-gradient(180deg,#281620,#0d141f)',
  specialTeams: 'linear-gradient(180deg,#281f0d,#0d141f)',
  crowd: 'linear-gradient(180deg,#1d1832,#0d141f)',
};

function HandCard({ card, selected, tone, onClick }: { card: FourthPhaseCard; selected: boolean; tone?: 'highlight' | 'dim'; onClick: () => void }) {
  const badge = cardBadge(card);
  const coachHighlight = tone === 'highlight';
  const coachDim = tone === 'dim' && !selected;
  return (
    <button
      onClick={onClick}
      title={cardDisplayName(card)}
      aria-pressed={selected}
      style={{
        minHeight: 112,
        borderRadius: FP_RADIUS.card,
        border: `1px solid ${coachHighlight ? FB.gold : selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        boxShadow: coachHighlight
          ? `inset 0 3px 0 ${PHASE_COLOR[card.phase]}, 0 0 0 2px rgba(242,189,61,0.34), 0 10px 22px -18px rgba(242,189,61,0.55)`
          : selected
            ? `inset 0 3px 0 ${FB.gold}, 0 8px 18px -16px rgba(242,189,61,0.55)`
            : `inset 0 3px 0 ${PHASE_COLOR[card.phase]}`,
        background: selected ? 'linear-gradient(180deg,#2b230e,#111820)' : CARD_SURFACE[card.phase],
        color: FB.text,
        padding: 8,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: coachDim ? 0.42 : 1,
        transform: coachHighlight || selected ? 'translateY(-1px)' : undefined,
        transition: 'opacity 120ms ease-out, border-color 120ms ease-out, box-shadow 120ms ease-out, transform 120ms ease-out',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, alignItems: 'center' }}>
        <span className="fb-num" style={{ fontSize: 20, fontWeight: 950, color: PHASE_COLOR[card.phase], lineHeight: 1 }}>{card.rank}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, color: FB.textDim, fontWeight: 950, border: `1px solid ${PHASE_COLOR[card.phase]}`, borderRadius: FP_RADIUS.badge, padding: '2px 4px', background: 'rgba(7,11,16,0.56)' }}>
          <PhaseIcon phase={card.phase} size={11} />
          {PHASE_SHORT[card.phase]}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: FB.text, fontWeight: 950, lineHeight: 1.08 }}>{card.roleName}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 5 }}>
          <span style={{ fontSize: 9.5, color: PHASE_COLOR[card.phase], fontWeight: 900 }}>{cardContributionLabel(card)}</span>
          <span className="fb-num" style={{ fontSize: 12, color: FB.gold, fontWeight: 950 }}>{card.value}</span>
        </div>
        {badge && (
          <div style={{ display: 'inline-flex', border: `1px solid ${badge.color}`, borderRadius: FP_RADIUS.badge, color: badge.color, fontSize: 7.5, fontWeight: 950, letterSpacing: 0, marginTop: 4, padding: '1px 4px', background: 'rgba(7,11,16,0.42)' }}>{badge.label}</div>
        )}
      </div>
    </button>
  );
}

function MiniCard({
  card,
  selected,
  dragProps,
  onClick,
}: {
  card: FourthPhaseCard;
  selected: boolean;
  dragProps: DragBind;
  onClick: () => void;
}) {
  const badge = cardBadge(card);
  return (
    <button
      {...dragProps}
      onClick={onClick}
      title={cardDisplayName(card)}
      aria-pressed={selected}
      style={{
        minWidth: 86,
        minHeight: 72,
        borderRadius: FP_RADIUS.card,
        border: `1px solid ${selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        boxShadow: `inset 0 2px 0 ${selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        background: selected ? 'linear-gradient(180deg,#2b230e,#111820)' : CARD_SURFACE[card.phase],
        color: FB.text,
        padding: 7,
        textAlign: 'left',
        cursor: 'grab',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 950, color: PHASE_COLOR[card.phase] }}>{card.rank}</span>
        <PhaseIcon phase={card.phase} size={11} />
      </div>
      <div style={{ fontSize: 10, color: FB.text, fontWeight: 900, lineHeight: 1.05 }}>{card.roleName}</div>
      <div style={{ fontSize: 8.5, color: PHASE_COLOR[card.phase], fontWeight: 900, marginTop: 2 }}>{cardContributionLabel(card)}</div>
      {badge && (
        <div style={{ fontSize: 7.5, color: badge.color, fontWeight: 950, letterSpacing: 0, marginTop: 2 }}>{badge.label}</div>
      )}
    </button>
  );
}

function WarRoom({
  money,
  discounts,
  draft,
  jokers,
  pendingDraft,
  buysThisWarRoom,
  nextDriveNumber,
  nextTarget,
  nextBoss,
  onDraft,
  onReplace,
  onCancelReplace,
  onReroll,
  onSkip,
  coachPick,
}: {
  money: number;
  discounts: number;
  draft: FourthPhaseWarRoomOffer[];
  jokers: FourthPhaseJokerState[];
  pendingDraft?: FourthPhaseWarRoomOffer;
  buysThisWarRoom: number;
  nextDriveNumber: number;
  nextTarget: number;
  nextBoss: FourthPhaseBossProfile | null;
  onDraft: (offer: FourthPhaseWarRoomOffer) => void;
  onReplace: (index: number) => void;
  onCancelReplace: () => void;
  onReroll: () => void;
  onSkip: () => void;
  coachPick: CoachPick | null;
}) {
  if (pendingDraft) {
    const incoming = pendingDraft.joker ? jokerDefinition(pendingDraft.joker) : null;
    if (!incoming) return null;
    return (
      <section style={{ ...card(), padding: 12, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(180deg,#1b170b,#0d1118)' }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Sideline full</div>
        <div style={{ fontSize: 15, color: FB.text, fontWeight: 950, marginTop: 3 }}>Release one for {incoming.name}</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>The new joker takes the slot you pick.</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {jokers.map((joker, index) => {
            const def = jokerDefinition(joker);
            return (
              <button
                key={joker.id}
                onClick={() => onReplace(index)}
                style={{
                  borderRadius: FP_RADIUS.card,
                  border: `1px solid ${FB.red}`,
                  background: CARD_SURFACE.defense,
                  color: FB.text,
                  padding: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 950 }}>Slot {index + 1}: {def.name}</span>
                  <span style={{ fontSize: 11, color: FB.red, fontWeight: 950 }}>release</span>
                </div>
                <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3 }}>{def.effect}</div>
              </button>
            );
          })}
        </div>
        <button onClick={onCancelReplace} style={{ ...btnGhost, width: '100%', marginTop: 10 }}>Keep my lineup (cancel)</button>
      </section>
    );
  }
  const orderedDraft = coachPick
    ? [...draft].sort((a, b) => Number(b.id === coachPick.id) - Number(a.id === coachPick.id))
    : draft;
  return (
    <section style={{ ...card(), padding: 12, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(180deg,#1b170b,#0d1118)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
        <div>
          <div style={{ ...sectionLabel, color: FB.gold }}>War Room</div>
          <div style={{ fontSize: 14, color: FB.text, fontWeight: 950, marginTop: 2 }}>
            Drive {nextDriveNumber - 1} cleared. Draft help for Drive {nextDriveNumber}.
          </div>
          <div style={{ fontSize: 11, color: FB.textDim, fontWeight: 800, marginTop: 3 }}>
            Buy up to {FOURTH_PHASE_WAR_ROOM_BUY_LIMIT} upgrades, or skip to bank $3.
          </div>
        </div>
        <div style={{ ...statTile, textAlign: 'right', minWidth: 84 }}>
          <div style={{ ...sectionLabel, fontSize: 9.5 }}>Cash</div>
          <div className="fb-led" style={{ color: FB.gold, fontSize: 22, fontWeight: 950, lineHeight: 1 }}>${money}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
        <Metric label="Next goal" value={`${nextTarget}`} color={FB.text} />
        <Metric label="Buys" value={`${buysThisWarRoom}/${FOURTH_PHASE_WAR_ROOM_BUY_LIMIT}`} color={FB.gold} />
      </div>
      {nextBoss && (
        <div style={{ border: `1px solid rgba(240,117,138,0.55)`, borderRadius: FP_RADIUS.card, background: 'rgba(240,117,138,0.08)', padding: '8px 9px', marginTop: 8 }}>
          <div style={{ ...sectionLabel, color: FB.red }}>Next boss</div>
          <div style={{ color: '#ff9aac', fontSize: 11.5, fontWeight: 900, marginTop: 2 }}>{nextBoss.name}: {nextBoss.effect}</div>
        </div>
      )}
      {discounts > 0 && (
        <div style={{ border: `1px solid rgba(242,189,61,0.42)`, borderRadius: FP_RADIUS.card, color: FB.gold, background: 'rgba(242,189,61,0.07)', padding: '7px 9px', fontSize: 10.5, fontWeight: 850, marginTop: 8 }}>
          Special Teams discount: -$1 per token on an offer ({discounts} banked, max -$2 each)
        </div>
      )}
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {orderedDraft.map((offer) => {
          const def = offer.joker ? jokerDefinition(offer.joker) : null;
          const { cost: effectiveCost, used } = discountedOfferCost(offer.cost, discounts);
          const affordable = money >= effectiveCost;
          const isCoachPick = coachPick?.id === offer.id;
          const borderColor = isCoachPick
            ? FB.gold
            : def?.rarity === 'legendary'
            ? FB.gold
            : offer.kind === 'practice'
              ? '#34c771'
              : '#36445a';
          return (
            <button
              key={offer.id}
              onClick={() => onDraft(offer)}
              disabled={!affordable}
              style={{
                borderRadius: FP_RADIUS.card,
                border: `1px solid ${borderColor}`,
                background: isCoachPick ? 'linear-gradient(135deg,#2b230e,#111820)' : offer.kind === 'practice' ? 'linear-gradient(180deg,#0f2418,#0d141f)' : '#101722',
                color: affordable ? FB.text : FB.textFaint,
                padding: 10,
                textAlign: 'left',
                cursor: affordable ? 'pointer' : 'not-allowed',
                opacity: affordable ? 1 : 0.58,
                boxShadow: isCoachPick ? '0 0 0 1px rgba(242,189,61,0.18)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 950 }}>{offer.label}</span>
                <span style={{ fontSize: 11, color: FB.gold, fontWeight: 950 }}>
                  {used > 0 && <s style={{ color: FB.textFaint, marginRight: 4 }}>${offer.cost}</s>}
                  ${effectiveCost}
                </span>
              </div>
              {isCoachPick && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid rgba(240,180,41,0.55)`, borderRadius: 999, color: FB.gold, background: 'rgba(240,180,41,0.08)', padding: '3px 7px', marginTop: 7, fontSize: 10, fontWeight: 950 }}>
                  Coach Pick: {coachPick.reason}
                </div>
              )}
              <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3 }}>{offer.detail}</div>
              {offer.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                  {offer.tags.map((tag) => (
                    <span key={tag} style={{ border: `1px solid ${FB.border}`, borderRadius: 5, color: '#cbbdff', fontSize: 9.5, fontWeight: 900, padding: '2px 5px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <button
          onClick={onReroll}
          disabled={money < FOURTH_PHASE_WAR_ROOM_REROLL_COST}
          style={{ ...btnGhost, opacity: money >= FOURTH_PHASE_WAR_ROOM_REROLL_COST ? 1 : 0.45 }}
        >
          Reroll ${FOURTH_PHASE_WAR_ROOM_REROLL_COST}
        </button>
        <button onClick={onSkip} style={btnGhost}>
          {buysThisWarRoom > 0 ? 'Start drive' : 'Skip, bank $3'}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// App-flow screens. The game state machine (LabState.phase) is untouched by
// these: they only stage what the player sees, Balatro-style — title, then
// team/stake select, then a drive intro beat before every kickoff.
// ---------------------------------------------------------------------------

function Shell({ impactClass, children }: { impactClass?: string; children: ReactNode }) {
  return (
    <div className={impactClass} style={{ minHeight: '100svh', padding: '10px 12px 96px', background: FB.bg }}>
      <div className="fp-screen-in" style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

function StakeBadge({ level }: { level: number }) {
  const stake = fourthPhaseStake(level);
  return (
    <span style={{ fontSize: 9, fontWeight: 950, color: stake.color, border: `1px solid ${stake.color}`, borderRadius: FP_RADIUS.pill, padding: '1px 7px', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>
      {stake.shortName.toUpperCase()}
    </span>
  );
}

function GameHeader({ runCode, stakeLevel, onTitle, onNewRun }: { runCode: string; stakeLevel: number; onTitle: () => void; onNewRun: () => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
      <button onClick={onTitle} style={{ ...btnGhost, minWidth: 74 }}>Home</button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <FootballGlyph size={14} />
          <span style={{ fontSize: 11, color: FB.gold, fontWeight: 900, letterSpacing: 0 }}>FOURTH PHASE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: FB.textFaint }}>{runCode}</span>
          <StakeBadge level={stakeLevel} />
        </div>
      </div>
      <button onClick={onNewRun} style={{ ...btnGhost, minWidth: 74 }}>New run</button>
    </header>
  );
}

function UnlockBanner({ title, detail, color }: { title: string; detail: string; color: string }) {
  return (
    <div className="fp-resolve" style={{ border: `1px solid ${color}`, borderRadius: FP_RADIUS.card, background: 'rgba(242,189,61,0.07)', padding: '9px 10px', marginTop: 10, textAlign: 'left' }}>
      <div style={{ fontSize: 11.5, color, fontWeight: 950 }}>{title}</div>
      <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3, lineHeight: 1.35 }}>{detail}</div>
    </div>
  );
}

function TitleScreen({
  canContinue,
  onContinue,
  onPlay,
  onDaily,
  dailyLabel,
  todayDailyDone,
  dailyStreak,
  localBest,
  wins,
  onExit,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onPlay: () => void;
  onDaily: () => void;
  dailyLabel: string;
  todayDailyDone: boolean;
  dailyStreak: number;
  localBest: number | null;
  wins: number;
  onExit?: () => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10, minHeight: 'calc(100svh - 140px)', alignContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <FootballGlyph size={52} />
        </div>
        <div style={{ fontSize: 36, fontWeight: 950, color: FB.gold, letterSpacing: 2, marginTop: 12, lineHeight: 1 }}>FOURTH PHASE</div>
        <div style={{ fontSize: 12.5, color: FB.textDim, fontWeight: 800, marginTop: 8 }}>
          <span style={{ color: '#5fb4ff' }}>Offense</span> · <span style={{ color: '#ff7c93' }}>Defense</span> · <span style={{ color: FB.gold }}>Special Teams</span> · <span style={{ color: '#a987ff' }}>Crowd</span>
        </div>
        <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 3 }}>A football roguelike. Clear three drives. Beat the boss defense.</div>
      </div>
      {canContinue && (
        <button onClick={onContinue} style={{ ...btnPrimary, minHeight: 52 }}>Continue run</button>
      )}
      <button onClick={onPlay} style={canContinue ? { ...btnGhost, minHeight: 52, fontSize: 14, color: FB.text } : { ...btnPrimary, minHeight: 52 }}>
        {canContinue ? 'New run' : 'Play'}
      </button>
      <button onClick={onDaily} style={{ ...btnGhost, minHeight: 48, borderColor: '#4e426f', color: '#cbbdff', fontSize: 13 }}>
        {todayDailyDone ? `Daily ${dailyLabel} | practice (streak ${dailyStreak})` : `Daily Challenge | ${dailyLabel}`}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
        <Metric label="Career wins" value={`${wins}`} color={FB.green} />
        <Metric label="Local best" value={localBest != null ? `${localBest}` : '—'} color={FB.gold} />
        <Metric label="Daily streak" value={`${dailyStreak}`} color="#cbbdff" />
      </div>
      <HowToPlay defaultOpen={false} />
      {onExit && (
        <button onClick={onExit} style={{ background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 11, fontWeight: 800, cursor: 'pointer', marginTop: 2 }}>
          Exit
        </button>
      )}
    </div>
  );
}

function TeamSelectScreen({
  progress,
  pickTeam,
  pickStake,
  onPickTeam,
  onPickStake,
  onStart,
  onBack,
  importCode,
  importError,
  onImportCode,
  onImport,
}: {
  progress: FourthPhaseProgress;
  pickTeam: FourthPhaseTeamKey;
  pickStake: number;
  onPickTeam: (team: FourthPhaseTeamKey) => void;
  onPickStake: (level: number) => void;
  onStart: () => void;
  onBack: () => void;
  importCode: string;
  importError: string;
  onImportCode: (value: string) => void;
  onImport: () => void;
}) {
  const unlocks = fourthPhaseTeamUnlocks(progress);
  const maxStake = fourthPhaseMaxStake(progress, pickTeam);
  const stake = fourthPhaseStake(pickStake);
  const team = FOURTH_PHASE_TEAMS[pickTeam];
  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <button onClick={onBack} style={{ ...btnGhost, minWidth: 74 }}>Back</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900 }}>CHOOSE YOUR TEAM</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint }}>then pick a stake</div>
        </div>
        <div style={{ minWidth: 74 }} />
      </header>

      <div style={{ display: 'grid', gap: 8 }}>
        {teamKeys.map((key) => {
          const profile = FOURTH_PHASE_TEAMS[key];
          const unlock = unlocks[key];
          const selected = key === pickTeam;
          const bestStake = progress.stakeWins[key] ?? 0;
          const signature = jokerDefinition({ id: profile.signatureJoker });
          if (!unlock.unlocked) {
            return (
              <div key={key} style={{ ...card(), padding: 11, opacity: 0.62, borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: FB.textDim, fontWeight: 950 }}>{profile.name}</span>
                  <span style={{ fontSize: 10, color: FB.textFaint, fontWeight: 950, letterSpacing: 0.6 }}>LOCKED</span>
                </div>
                <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 4, lineHeight: 1.35 }}>
                  {unlock.requirement}
                  {unlock.progressLabel ? <span style={{ color: FB.textDim, fontWeight: 850 }}> ({unlock.progressLabel})</span> : null}
                </div>
              </div>
            );
          }
          return (
            <button
              key={key}
              onClick={() => onPickTeam(key)}
              style={{
                ...card(),
                padding: 11,
                textAlign: 'left',
                cursor: 'pointer',
                color: FB.text,
                borderColor: selected ? FB.gold : FB.border,
                background: selected ? 'linear-gradient(135deg,#241d0b,#101722)' : FB.panel,
                boxShadow: selected ? '0 0 0 1px rgba(242,189,61,0.25)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 950, color: selected ? FB.gold : FB.text }}>{profile.name}</span>
                <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                  {bestStake > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 950, color: fourthPhaseStake(bestStake).color }}>
                      ✓ {fourthPhaseStake(bestStake).shortName.toUpperCase()}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: FB.textFaint, fontWeight: 900 }}>{profile.shortName}</span>
                </span>
              </div>
              <div style={{ fontSize: 11, color: FB.textDim, marginTop: 4, lineHeight: 1.35 }}>{profile.identity}</div>
              <div style={{ fontSize: 10, color: '#cbbdff', fontWeight: 850, marginTop: 5 }}>
                Signature joker: {signature.name} — {signature.effect}
              </div>
            </button>
          );
        })}
      </div>

      <section style={{ ...card(), padding: 11, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={sectionLabel}>Stake</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint }}>win a stake to unlock the next</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FOURTH_PHASE_STAKES.length}, 1fr)`, gap: 6, marginTop: 8 }}>
          {FOURTH_PHASE_STAKES.map((option) => {
            const locked = option.level > maxStake;
            const selected = option.level === pickStake;
            return (
              <button
                key={option.level}
                onClick={() => !locked && onPickStake(option.level)}
                disabled={locked}
                style={{
                  minHeight: 44,
                  borderRadius: FP_RADIUS.control,
                  border: `1px solid ${selected ? option.color : FB.border}`,
                  background: selected ? 'rgba(242,189,61,0.08)' : FB.panelRaised,
                  color: locked ? FB.textFaint : option.color,
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.45 : 1,
                }}
              >
                {locked ? '🔒 ' : ''}{option.shortName}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: stake.color, fontWeight: 900, marginTop: 9 }}>{stake.name} — {stake.tagline}</div>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 2 }}>
          {stake.modifiers.map((modifier) => (
            <li key={modifier} style={{ fontSize: 11, color: FB.textDim, lineHeight: 1.35 }}>{modifier}</li>
          ))}
        </ul>
      </section>

      <button onClick={onStart} style={{ ...btnPrimary, width: '100%', minHeight: 52, marginTop: 12 }}>
        Kickoff — {team.shortName} · {stake.shortName} Stake
      </button>

      <section style={{ ...card(), padding: 10, marginTop: 12 }}>
        <div style={sectionLabel}>Import a run code</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>Replays any shared run exactly — team, boss, and stake included.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginTop: 8 }}>
          <input
            value={importCode}
            onChange={(event) => onImportCode(event.target.value)}
            placeholder="FP-BAL-1A2B3-S2"
            aria-label="Run code"
            style={{
              minHeight: 38,
              borderRadius: FP_RADIUS.control,
              border: `1px solid ${importError ? FB.red : FB.border}`,
              background: '#0e151d',
              color: FB.text,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: 800,
            }}
          />
          <button onClick={onImport} style={{ ...btnGhost, minHeight: 38, padding: '0 12px' }}>Import</button>
        </div>
        {importError && <div style={{ fontSize: 10.5, color: FB.red, marginTop: 5 }}>{importError}</div>}
      </section>
    </div>
  );
}

function DriveIntroScreen({
  driveNumber,
  drives,
  target,
  teamName,
  teamIdentity,
  stakeLevel,
  boss,
  upcomingBoss,
  bossArrivesDrive,
  plays,
  redraws,
  money,
  jokers,
  dailyLabel,
  onKickoff,
}: {
  driveNumber: number;
  drives: number;
  target: number;
  teamName: string;
  teamIdentity: string;
  stakeLevel: number;
  boss: FourthPhaseBossProfile | null;
  upcomingBoss: FourthPhaseBossProfile | null;
  bossArrivesDrive: number;
  plays: number;
  redraws: number;
  money: number;
  jokers: string[];
  dailyLabel?: string;
  onKickoff: () => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10, minHeight: 'calc(100svh - 190px)', alignContent: 'center' }}>
      <section style={{ ...card(), padding: 16, textAlign: 'center', borderColor: boss ? FB.red : FB.gold, background: 'linear-gradient(180deg,#101722,#080b11)' }}>
        {dailyLabel && (
          <div style={{ fontSize: 10.5, color: '#cbbdff', fontWeight: 950, letterSpacing: 0.8, marginBottom: 6 }}>DAILY CHALLENGE {dailyLabel}</div>
        )}
        <div style={{ ...sectionLabel, color: FB.textFaint }}>Drive</div>
        <div className="fb-num" style={{ fontSize: 56, color: FB.text, fontWeight: 950, lineHeight: 0.95 }}>
          {driveNumber}<span style={{ fontSize: 22, color: FB.textFaint }}> / {drives}</span>
        </div>
        <div style={{ fontSize: 12, color: FB.textDim, fontWeight: 850, marginTop: 10 }}>
          Score <span className="fb-num" style={{ color: FB.gold, fontSize: 15 }}>{target}</span> in {plays} calls
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: FB.text, fontWeight: 950 }}>{teamName}</span>
          <StakeBadge level={stakeLevel} />
        </div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3, lineHeight: 1.3 }}>{teamIdentity}</div>

        {boss ? (
          <div style={{ border: `1px solid rgba(240,117,138,0.6)`, borderRadius: FP_RADIUS.card, background: 'rgba(240,117,138,0.09)', padding: '10px 11px', marginTop: 12 }}>
            <div style={{ ...sectionLabel, color: FB.red }}>Boss defense on the field</div>
            <div style={{ fontSize: 13, color: '#ff9aac', fontWeight: 950, marginTop: 3 }}>{boss.name}</div>
            <div style={{ fontSize: 11, color: FB.textDim, marginTop: 2, lineHeight: 1.35 }}>{boss.effect}</div>
          </div>
        ) : upcomingBoss ? (
          <div style={{ border: `1px solid rgba(242,189,61,0.42)`, borderRadius: FP_RADIUS.card, background: 'rgba(242,189,61,0.06)', padding: '9px 11px', marginTop: 12 }}>
            <div style={{ ...sectionLabel, color: FB.gold }}>Scouting report</div>
            <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3, lineHeight: 1.35 }}>
              <span style={{ color: FB.gold, fontWeight: 950 }}>{upcomingBoss.name}</span> takes the field on Drive {bossArrivesDrive}. {upcomingBoss.effect}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
          <Metric label="Calls" value={`${plays}`} color={FB.green} />
          <Metric label="Redraws" value={`${redraws}`} color="#5fb4ff" />
          <Metric label="Cash" value={`$${money}`} color={FB.gold} />
        </div>
        {jokers.length > 0 && (
          <div style={{ fontSize: 10.5, color: '#cbbdff', fontWeight: 850, marginTop: 10, lineHeight: 1.35 }}>
            Sideline: {jokers.join(' / ')}
          </div>
        )}
        <button onClick={onKickoff} style={{ ...btnPrimary, width: '100%', minHeight: 52, marginTop: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FootballGlyph size={16} />
          {driveNumber === 1 ? 'Kickoff' : `Start Drive ${driveNumber}`}
        </button>
      </section>
    </div>
  );
}
