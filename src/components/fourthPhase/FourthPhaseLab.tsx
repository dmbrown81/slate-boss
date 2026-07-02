import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import { mulberry32, stringSeed } from '../../lib/rng';
import { FB, btnGhost, btnPrimary, card, sectionLabel } from '../footballStyles';
import { HowToPlay, SituationsPanel } from './FourthPhaseGuide';
import {
  BASE_METER,
  BASE_METER_CAP,
  FOURTH_PHASE_BOSSES,
  FOURTH_PHASE_DISCARDS,
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
  PHASE_LABEL,
  PHASE_SHORT,
  activeBossForDrive,
  applyFourthPhaseDrawStart,
  cardDisplayName,
  createFourthPhaseRun,
  discountedOfferCost,
  drawFourthPhaseCards,
  formatMeter,
  fourthPhaseRunCode,
  generateFourthPhaseWarRoomOffers,
  jokerDefinition,
  parseFourthPhaseRunCode,
  scoreFourthPhasePlay,
  shuffleFourthPhase,
  type CardEdition,
  type FourthPhaseBossKey,
  type FourthPhaseBossProfile,
  type FourthPhaseCard,
  type FourthPhaseJokerState,
  type FourthPhasePracticeBook,
  type FourthPhaseScoreContext,
  type FourthPhaseScoreResult,
  type FourthPhaseTeamKey,
  type FourthPhaseWarRoomOffer,
  type PlayerTrait,
  type SituationKey,
} from '../../lib/fourthPhase';

interface Props {
  onHome?: () => void;
}

type LabPhase = 'play' | 'warRoom' | 'won' | 'lost';

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
  score: number;
  won: boolean;
  bestPlay: number;
  runCode: string;
  dailyLabel?: string;
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

// Decide whether a play earns the cash-in celebration, and why. Replaces the old
// bare `points >= 120` magic number with reasons that scale to the drive and the run.
function evaluateCashIn(
  result: FourthPhaseScoreResult,
  target: number,
  prevBest: number,
): { show: boolean; reason: string } {
  if (result.situation.key === 'complementaryFootball') {
    return { show: true, reason: 'Complementary Football — all four phases' };
  }
  if (result.points >= target) {
    return { show: true, reason: 'Drive crusher — cleared the target in one play' };
  }
  if (result.points > prevBest && result.points >= 80) {
    return { show: true, reason: `New run best — ${result.points}` };
  }
  if (result.didCash && result.bigPlay >= 2.5) {
    return { show: true, reason: `Meter cash x${result.bigPlay.toFixed(2)}` };
  }
  if (result.points >= Math.max(60, Math.round(target * 0.3))) {
    return { show: true, reason: 'Big play' };
  }
  return { show: false, reason: '' };
}

const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];
const FP_HISTORY_KEY = 'fourth_phase_history_v1';
const FP_DAILY_KEY = 'fourth_phase_daily_v1';

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

// Played first-run tutorial. Teaches the one trick by making the player do it,
// instead of asking them to read a panel. Advances on real plays (executePlay).
const TUTORIAL_STEPS = [
  {
    title: 'Welcome — one trick wins games',
    body: 'Tap any blue OFF (Offense) card in your Hand below, then press Run Play in the bottom bar. That is a Checkdown: safe yards.',
    cta: null,
  },
  {
    title: 'Now the real trick',
    body: 'Tap a purple CRD (Crowd) card FIRST, then a blue OFF card — in that left-to-right order — and Run Play. Crowd charges the meter; Offense cashes it.',
    cta: null,
  },
  {
    title: 'That is the whole game',
    body: 'See the CASHES badge and the big BigPlay multiplier? The same two cards in the other order score about half. Charge, then cash, in the right order.',
    cta: 'Got it — play on',
  },
] as const;

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
): LabState {
  const run = createFourthPhaseRun(team, seed);
  const orderedDeck = scriptedOpening(run.deck);
  const draw = drawFourthPhaseCards(orderedDeck, [], FOURTH_PHASE_HAND_SIZE, mulberry32(stringSeed(`${seed}:opening`)));
  return {
    seed,
    team,
    boss: run.boss,
    targets: run.targets,
    drawPile: draw.deck,
    discardPile: draw.discard,
    hand: draw.drawn,
    selectedIds: [],
    jokers: run.jokers,
    practice: run.practice,
    draft: [],
    money: run.money,
    discounts: 0,
    driveIndex: 0,
    driveScore: 0,
    discardsLeft: FOURTH_PHASE_DISCARDS,
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
  const runCode = fourthPhaseRunCode(state.seed, state.team);
  return {
    id: `${runCode}:${Date.now()}`,
    date: new Date().toISOString(),
    seed: state.seed,
    team: state.team,
    score,
    won,
    bestPlay,
    runCode,
    dailyLabel: state.dailyLabel,
  };
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
// actually scores — the worst failure for a transparent-math game.
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
    boss: activeBossForDrive(state, state.driveIndex),
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
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragJoker, setDragJoker] = useState<string | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number>(() => {
    try {
      return localStorage.getItem('fp-tutorial-done') ? -1 : 0;
    } catch {
      return 0;
    }
  });

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
  }

  useEffect(() => {
    if (!state.completion) return;
    saveFourthPhaseCompletion(state.completion, state.dailyPractice);
  }, [state.completion, state.dailyPractice]);

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
  const activeBoss = activeBossForDrive(state, state.driveIndex);
  const target = state.targets[state.driveIndex];
  const targetRemaining = Math.max(0, target - state.driveScore);
  const handById = useMemo(() => new Map(state.hand.map((card) => [card.id, card])), [state.hand]);
  const selectedCards = useMemo(
    () => state.selectedIds.map((id) => handById.get(id)).filter((card): card is FourthPhaseCard => Boolean(card)),
    [handById, state.selectedIds],
  );
  const preview = selectedCards.length ? scoreFourthPhasePlay(selectedCards, buildPlayContext(state)) : null;
  const progress = Math.min(1, state.driveScore / target);
  const meterFill = Math.min(1, (state.meter - BASE_METER) / Math.max(0.1, state.meterCap - BASE_METER));
  const runCode = fourthPhaseRunCode(state.seed, state.team);
  const teamProfile = FOURTH_PHASE_TEAMS[state.team];
  const playsLeft = Math.max(0, FOURTH_PHASE_MAX_PLAYS_PER_DRIVE - state.playsThisDrive);
  const meterHot = state.meter > BASE_METER + 0.05;

  function restart(team: FourthPhaseTeamKey, seed?: number, meta?: FourthPhaseRunMeta) {
    setState(createInitialState(team, seed, meta));
    setImportError('');
    setShareCopied(false);
    setResultCopied(false);
    setLedgerExpanded(false);
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
    restart(parsed.team, parsed.seed);
    setImportCode('');
  }

  function cashCardText(): string {
    if (!state.cashIn) return '';
    return [
      'FOURTH PHASE CASH-IN',
      `${state.cashIn.points} on ${state.cashIn.situation}`,
      `${FOURTH_PHASE_TEAMS[state.team].shortName} · ${runCode}`,
      `Meter ${formatMeter(state.cashIn.meter)} · BigPlay x${state.cashIn.bigPlay.toFixed(2)}`,
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
    const daily = state.dailyLabel ? ` · Daily ${state.dailyLabel}${state.dailyPractice ? ' (practice)' : ''}` : '';
    return [
      `FOURTH PHASE · ${outcome}`,
      `${state.runScore} pts · best play ${state.bestPlay}`,
      `${teamProfile.shortName} vs ${FOURTH_PHASE_BOSSES[state.boss].name} · ${runCode}${daily}`,
    ].join('\n');
  }

  function copyResult() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(resultText()).then(() => setResultCopied(true)).catch(() => setResultCopied(false));
  }

  function toggleCard(card: FourthPhaseCard) {
    if (state.phase !== 'play') return;
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
    if (tutorialStep >= 0) advanceTutorial(preview.didCash);
    setShareCopied(false);
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
    const fullPile = shuffleFourthPhase(
      [...current.drawPile, ...current.hand, ...current.discardPile],
      mulberry32(stringSeed(`${current.seed}:drive:${nextDrive}`)),
    );
    const meter = applyFourthPhaseDrawStart(
      { meter: BASE_METER, meterCap: Math.max(BASE_METER_CAP, current.meterCap) },
      { jokers: nextJokers, practice: nextPractice, wins: nextDrive, boss: activeBossForDrive(current, nextDrive) },
    );
    const draw = drawFourthPhaseCards(fullPile, [], FOURTH_PHASE_HAND_SIZE, mulberry32(stringSeed(`${current.seed}:drive-hand:${nextDrive}`)));
    return {
      ...current,
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
      discardsLeft: FOURTH_PHASE_DISCARDS,
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
    ? `this play cashes it — BigPlay x${preview.bigPlay.toFixed(2)}`
    : meterHot
      ? `hot: Offense cashes ${formatMeter(state.meter)} · holding bleeds`
      : 'Crowd charges it · Offense cashes it';

  const nextBossKey = state.phase === 'warRoom' && state.driveIndex + 1 < FOURTH_PHASE_DRIVES
    ? activeBossForDrive(state, state.driveIndex + 1)
    : 'none';

  return (
    <div style={{ minHeight: '100svh', padding: '10px 12px 96px', background: '#090c11' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        {onHome ? (
          <button onClick={onHome} style={{ ...btnGhost, minWidth: 74 }}>Home</button>
        ) : (
          <div style={{ minWidth: 74 }} />
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900, letterSpacing: 1.5 }}>FOURTH PHASE</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>{runCode}</div>
        </div>
        <button onClick={() => restart(state.team)} style={{ ...btnGhost, minWidth: 74 }}>New run</button>
      </header>

      {tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length && (
        <section style={{ ...card(8), padding: 13, marginBottom: 10, borderColor: FB.gold, background: 'linear-gradient(135deg,#1d2a17,#0d1118)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ ...sectionLabel, color: FB.gold }}>Coach · step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</div>
            <button onClick={finishTutorial} style={{ background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              Skip tutorial
            </button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 950, color: FB.text, marginTop: 4 }}>{TUTORIAL_STEPS[tutorialStep].title}</div>
          <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.45, marginTop: 4 }}>{TUTORIAL_STEPS[tutorialStep].body}</div>
          {TUTORIAL_STEPS[tutorialStep].cta && (
            <button onClick={finishTutorial} style={{ ...btnPrimary, width: '100%', marginTop: 10 }}>{TUTORIAL_STEPS[tutorialStep].cta}</button>
          )}
        </section>
      )}

      <div style={{ fontSize: 11, color: FB.textDim, margin: '0 2px 10px', lineHeight: 1.4 }}>
        <span style={{ color: FB.text, fontWeight: 900 }}>{teamProfile.name}</span> · {teamProfile.identity}
      </div>

      <HowToPlay defaultOpen={false} />

      <section style={{ ...card(8), ...meterStyle(state.meter, state.meterCap), padding: 14, overflow: 'hidden', position: 'relative', background: 'linear-gradient(180deg,#101622,#080b11)' }}>
        <div className="fb-yard" style={{ position: 'absolute', inset: 0, opacity: 0.38 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ ...sectionLabel, color: '#cbbdff' }}>Crowd Meter</div>
            <div className="fb-num" style={{ fontSize: 34, color: '#efe9ff', fontWeight: 950, lineHeight: 1 }}>
              {formatMeter(state.meter)}
            </div>
          </div>
          <div style={{ height: 18, borderRadius: 8, background: '#111827', border: '1px solid #2a2441', overflow: 'hidden', marginTop: 10 }}>
            <div style={{ width: `${meterFill * 100}%`, height: '100%', background: 'linear-gradient(90deg,#4f9cff,#a987ff,#f4c24f)', transition: 'width 180ms ease-out' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 7, color: preview?.didCash ? FB.gold : meterHot ? '#cbbdff' : FB.textDim, fontSize: 11, fontWeight: 800 }}>
            <span style={{ color: FB.textDim }}>cap {formatMeter(state.meterCap)}</span>
            <span style={{ textAlign: 'right' }}>{meterHint}</span>
          </div>
        </div>
      </section>

      <section style={{ ...card(8), padding: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={sectionLabel}>Drive {state.driveIndex + 1} of {FOURTH_PHASE_DRIVES}</div>
            <div style={{ fontSize: 20, fontWeight: 950, color: FB.text, lineHeight: 1.1 }}>{state.driveScore} / {target}</div>
            <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 2 }}>{targetRemaining} to go · {playsLeft} plays left</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {activeBoss === 'none' ? (
              <>
                <div style={{ ...sectionLabel, color: '#d8a23a' }}>Scouting · Drive {FOURTH_PHASE_DRIVES}</div>
                <div style={{ fontSize: 12, color: '#e8c878', fontWeight: 900 }}>{FOURTH_PHASE_BOSSES[state.boss].name}</div>
                <div style={{ fontSize: 10.5, color: FB.textFaint, maxWidth: 210 }}>{FOURTH_PHASE_BOSSES[state.boss].effect}</div>
              </>
            ) : (
              <>
                <div style={{ ...sectionLabel, color: FB.red }}>{FOURTH_PHASE_BOSSES[activeBoss].name}</div>
                <div style={{ fontSize: 11, color: FB.red, maxWidth: 210 }}>{FOURTH_PHASE_BOSSES[activeBoss].effect}</div>
              </>
            )}
          </div>
        </div>
        <div style={{ height: 9, borderRadius: 6, background: FB.inset, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: 'linear-gradient(90deg,#34c771,#f0b429)' }} />
        </div>
      </section>

      {state.cashIn && (
        <section style={{ ...card(8), padding: 13, marginTop: 10, borderColor: '#f4c24f', background: 'linear-gradient(135deg,#2a1d08,#12151d)' }}>
          <div style={{ ...sectionLabel, color: FB.gold }}>{state.cashIn.reason}</div>
          <div className="fb-num" style={{ fontSize: 44, color: FB.gold, fontWeight: 950, lineHeight: 0.95, marginTop: 4 }}>{state.cashIn.points}</div>
          <div style={{ fontSize: 12, color: FB.text, fontWeight: 800, marginTop: 5 }}>
            {state.cashIn.situation} · BigPlay x{state.cashIn.bigPlay.toFixed(2)} · meter {formatMeter(state.cashIn.meter)}
          </div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 4 }}>
            {FOURTH_PHASE_TEAMS[state.team].shortName} · {runCode} · {state.jokers.map((joker) => jokerDefinition(joker).name).join(' / ')}
          </div>
          <button onClick={copyCashCard} style={{ ...btnGhost, width: '100%', marginTop: 10 }}>
            {shareCopied ? 'Copied' : 'Copy cash card'}
          </button>
        </section>
      )}

      {state.phase === 'warRoom' && (
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
        />
      )}

      {(state.phase === 'won' || state.phase === 'lost') && (
        <section style={{ ...card(8), padding: 16, marginTop: 10, textAlign: 'center', borderColor: state.phase === 'won' ? FB.gold : FB.red }}>
          <div style={{ fontSize: 13, color: state.phase === 'won' ? FB.gold : FB.red, fontWeight: 950, letterSpacing: 1.2 }}>
            {state.phase === 'won' ? 'RUN WON' : 'RUN OVER'}
          </div>
          <div style={{ fontSize: 12, color: FB.textDim, marginTop: 6 }}>
            {state.phase === 'won'
              ? `All ${FOURTH_PHASE_DRIVES} drives cleared against ${FOURTH_PHASE_BOSSES[state.boss].name}.`
              : `Stalled on Drive ${state.driveIndex + 1} — ${targetRemaining} short of the target.`}
          </div>
          <div className="fb-num" style={{ fontSize: 40, color: FB.gold, fontWeight: 950, marginTop: 8, lineHeight: 1 }}>{state.runScore}</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 2 }}>total points</div>
          {state.completion && localBest?.id === state.completion.id && (
            <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900, marginTop: 5 }}>New local best</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
            <Metric label="Best play" value={`${state.bestPlay}`} color={FB.gold} />
            <Metric label="Drives" value={`${state.phase === 'won' ? FOURTH_PHASE_DRIVES : state.driveIndex + 1}/${FOURTH_PHASE_DRIVES}`} color="#5fb4ff" />
            <Metric label="Boss" value={FOURTH_PHASE_BOSSES[state.boss].name} color={FB.red} small />
          </div>
          {state.dailyLabel && (
            <div style={{ fontSize: 11, color: '#cbbdff', fontWeight: 800, marginTop: 8 }}>
              Daily {state.dailyLabel}{state.dailyPractice ? ' · practice (streak unchanged)' : dailyRecord ? ` · streak ${dailyRecord.streak}` : ''}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 8 }}>{runCode} — import this code to replay the same run.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button onClick={() => restart(state.team)} style={btnPrimary}>Run it back</button>
            <button onClick={copyResult} style={{ ...btnGhost, minHeight: 48 }}>{resultCopied ? 'Copied' : 'Copy result'}</button>
          </div>
          <button onClick={() => restart(state.team, state.seed)} style={{ ...btnGhost, width: '100%', marginTop: 8 }}>
            Replay this seed
          </button>
        </section>
      )}

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Selected Play</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>{state.selectedIds.length}/{FOURTH_PHASE_PLAY_LIMIT} · left scores first</div>
        </div>
        <div style={{ display: 'flex', gap: 6, minHeight: 100, overflowX: 'auto', paddingBottom: 2 }}>
          {selectedCards.length === 0 ? (
            <div style={{ ...emptyWide }}>Select up to five cards</div>
          ) : selectedCards.map((card, index) => (
            <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ position: 'relative' }}>
                <span style={orderBadge}>{index + 1}</span>
                {preview?.cashesAtCardIndex === index && <span style={cashBadge}>CASHES</span>}
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
          ))}
        </div>
      </section>

      <section style={{ ...card(8), padding: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <div>
            <div style={sectionLabel}>Preview</div>
            <div style={{ fontSize: 17, color: FB.text, fontWeight: 950 }}>
              {preview
                ? preview.situation.label
                : state.lastPlay
                  ? `Last: ${state.lastPlay.situation.label} · ${state.lastPlay.points}`
                  : 'No play selected'}
            </div>
          </div>
          <div className="fb-num" style={{ fontSize: 30, color: preview?.didCash ? FB.gold : FB.text, fontWeight: 950 }}>
            {preview ? preview.points : 0}
          </div>
        </div>
        {preview && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
              <Metric label="Yards" value={`${preview.yards}`} color="#5fb4ff" />
              <Metric label="Exec" value={`+${preview.execution.toFixed(2)}`} color="#ff7c93" />
              <Metric label="BigPlay" value={`x${preview.bigPlay.toFixed(2)}`} color="#f4c24f" />
            </div>
            {preview.bust && (
              <div style={{ fontSize: 11, color: FB.red, fontWeight: 800, marginTop: 8 }}>
                Busted play — no clean shape. Penalty score and the meter bleeds.
              </div>
            )}
            {!preview.bust && preview.situation.notes[0] && (
              <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 8 }}>{preview.situation.notes[0]}</div>
            )}
          </>
        )}
      </section>

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Hand</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>War Room cash <span style={{ color: FB.gold, fontWeight: 900 }}>${state.money}</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {state.hand.map((card) => (
            <HandCard key={card.id} card={card} selected={state.selectedIds.includes(card.id)} onClick={() => toggleCard(card)} />
          ))}
        </div>
      </section>

      {state.lastPlay && (
        <section style={{ ...card(8), padding: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={sectionLabel}>Live Ledger</div>
            {state.lastPlay.ledger.length > 7 && (
              <button
                onClick={() => setLedgerExpanded((value) => !value)}
                style={{ ...btnGhost, minHeight: 0, padding: '4px 10px', fontSize: 10.5 }}
              >
                {ledgerExpanded ? 'Show less' : `Show full math (${state.lastPlay.ledger.length})`}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {(ledgerExpanded ? state.lastPlay.ledger : state.lastPlay.ledger.slice(0, 7)).map((entry, index) => (
              <div key={`${entry.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '92px 76px 1fr', gap: 6, fontSize: 11, color: FB.textDim }}>
                <span style={{ color: entry.channel === 'joker' ? '#cbbdff' : entry.channel === 'boss' ? FB.red : FB.textFaint, fontWeight: 900 }}>{entry.label}</span>
                <span className="fb-num" style={{ color: FB.text, fontWeight: 900 }}>{entry.value}</span>
                <span>{entry.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Jokers</div>
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
                    ...card(8),
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
      </section>

      <SituationsPanel activeKey={preview?.situation.key} defaultOpen={false} />

      <HowToPlay defaultOpen={false} />

      <section style={{ ...card(8), padding: 10, marginTop: 10, marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={sectionLabel}>Locker Room</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint }}>switching team starts a new run</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <button onClick={startDailyRun} style={{ ...btnPrimary, minHeight: 42 }}>
            {todayDailyDone
              ? `Daily practice · streak ${dailyRecord?.streak ?? 1}`
              : `Daily · ${daily.label}`}
          </button>
          <div style={{ border: `1px solid ${FB.border}`, borderRadius: 8, padding: '7px 8px', background: FB.inset }}>
            <div style={{ ...sectionLabel, fontSize: 9.5 }}>Local Best</div>
            <div className="fb-num" style={{ fontSize: 15, color: FB.gold, fontWeight: 950 }}>
              {localBest ? `${localBest.score}` : 'none'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
          {teamKeys.map((team) => (
            <button
              key={team}
              onClick={() => restart(team)}
              style={{
                minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${state.team === team ? FB.gold : FB.border}`,
                background: state.team === team ? '#2a230f' : '#101722',
                color: state.team === team ? FB.gold : FB.textDim,
                fontSize: 11,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {FOURTH_PHASE_TEAMS[team].shortName}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: FB.textDim, marginTop: 8, lineHeight: 1.4 }}>
          <span style={{ color: FB.text, fontWeight: 900 }}>{teamProfile.name}</span> · {teamProfile.identity}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginTop: 8 }}>
          <input
            value={importCode}
            onChange={(event) => {
              setImportCode(event.target.value);
              setImportError('');
            }}
            placeholder="FP-BAL-1A2B3"
            aria-label="Run code"
            style={{
              minHeight: 38,
              borderRadius: 8,
              border: `1px solid ${importError ? FB.red : FB.border}`,
              background: '#0e151d',
              color: FB.text,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: 800,
            }}
          />
          <button onClick={importRunCode} style={{ ...btnGhost, minHeight: 38, padding: '0 12px' }}>Import</button>
        </div>
        {importError && <div style={{ fontSize: 10.5, color: FB.red, marginTop: 5 }}>{importError}</div>}
      </section>

      </div>

      {state.phase === 'play' && (
        <div style={bottomBar}>
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: preview?.bust ? FB.red : FB.textFaint, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {preview ? preview.situation.label : 'Tap cards to build a play'}
              </div>
              <div className="fb-num" style={{ fontSize: 24, color: preview?.didCash ? FB.gold : FB.text, fontWeight: 950, lineHeight: 1.05 }}>
                {preview ? preview.points : 0}
                <span style={{ fontSize: 11, color: FB.textFaint, fontWeight: 800 }}> pts{preview?.didCash ? ' · cashes' : ''}</span>
              </div>
            </div>
            <button
              onClick={executePlay}
              disabled={!preview}
              style={{ ...btnPrimary, padding: '0 20px', minHeight: 48, opacity: preview ? 1 : 0.45 }}
            >
              Run Play
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
  borderRadius: 8,
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
  borderRadius: 9,
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
  borderRadius: 5,
  background: '#34c771',
  color: '#04130c',
  fontSize: 8.5,
  fontWeight: 950,
  letterSpacing: 0.5,
  padding: '2px 4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
};

const reorderBtn: CSSProperties = {
  flex: 1,
  minHeight: 30,
  borderRadius: 6,
  border: `1px solid ${FB.border}`,
  background: '#16202c',
  color: FB.textDim,
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  lineHeight: 1,
};

const emptyWide: CSSProperties = {
  minHeight: 72,
  minWidth: '100%',
  border: `1px dashed ${FB.border}`,
  borderRadius: 8,
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
  background: 'rgba(9,12,17,0.94)',
  borderTop: `1px solid ${FB.border}`,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

function Metric({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div style={{ background: FB.inset, border: `1px solid ${FB.border}`, borderRadius: 8, padding: '7px 8px' }}>
      <div style={{ fontSize: 10, color: FB.textFaint, fontWeight: 900 }}>{label}</div>
      <div className="fb-num" style={{ fontSize: small ? 12 : 16, color, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function HandCard({ card, selected, onClick }: { card: FourthPhaseCard; selected: boolean; onClick: () => void }) {
  const badge = cardBadge(card);
  return (
    <button
      onClick={onClick}
      title={cardDisplayName(card)}
      style={{
        minHeight: 104,
        borderRadius: 8,
        border: `1px solid ${selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        background: selected ? '#2a230f' : '#101722',
        color: FB.text,
        padding: 8,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 950, color: PHASE_COLOR[card.phase] }}>{card.rank}</span>
        <span style={{ fontSize: 9, color: FB.textFaint, fontWeight: 950 }}>{PHASE_SHORT[card.phase]}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: FB.text, fontWeight: 900, lineHeight: 1.05 }}>{card.roleName}</div>
        <div style={{ fontSize: 10, color: FB.textFaint, marginTop: 4 }}>{PHASE_LABEL[card.phase]}</div>
        {badge && (
          <div style={{ fontSize: 8, color: badge.color, fontWeight: 950, letterSpacing: 0.4, marginTop: 3 }}>{badge.label}</div>
        )}
      </div>
      <div className="fb-num" style={{ fontSize: 11, color: FB.gold, fontWeight: 900 }}>value {card.value}</div>
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
      style={{
        minWidth: 86,
        minHeight: 72,
        borderRadius: 8,
        border: `1px solid ${selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        background: '#101722',
        color: FB.text,
        padding: 7,
        textAlign: 'left',
        cursor: 'grab',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 950, color: PHASE_COLOR[card.phase] }}>{card.rank}</div>
      <div style={{ fontSize: 10, color: FB.text, fontWeight: 900, lineHeight: 1.05 }}>{card.roleName}</div>
      {badge && (
        <div style={{ fontSize: 7.5, color: badge.color, fontWeight: 950, letterSpacing: 0.4, marginTop: 2 }}>{badge.label}</div>
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
}) {
  if (pendingDraft) {
    const incoming = pendingDraft.joker ? jokerDefinition(pendingDraft.joker) : null;
    if (!incoming) return null;
    return (
      <section style={{ ...card(8), padding: 12, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(180deg,#15160d,#0d1118)' }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Sideline is full — release one for {incoming.name}</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>Order matters: the new joker takes the slot you pick.</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {jokers.map((joker, index) => {
            const def = jokerDefinition(joker);
            return (
              <button
                key={joker.id}
                onClick={() => onReplace(index)}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${FB.red}`,
                  background: '#101722',
                  color: FB.text,
                  padding: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 950 }}>Slot {index + 1} · {def.name}</span>
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
  return (
    <section style={{ ...card(8), padding: 12, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(180deg,#15160d,#0d1118)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Mini War Room</div>
        <div style={{ color: FB.text, fontSize: 12, fontWeight: 900 }}>
          ${money} · {buysThisWarRoom}/{FOURTH_PHASE_WAR_ROOM_BUY_LIMIT} buys
        </div>
      </div>
      <div style={{ fontSize: 11, color: FB.textDim, marginTop: 4 }}>
        Next: Drive {nextDriveNumber} · target {nextTarget}
        {nextBoss && <span style={{ color: FB.red, fontWeight: 900 }}> · {nextBoss.name} — {nextBoss.effect}</span>}
      </div>
      {discounts > 0 && (
        <div style={{ fontSize: 10.5, color: '#f4c24f', fontWeight: 800, marginTop: 4 }}>
          Special Teams discount: −$1 per token on an offer ({discounts} banked, max −$2 each)
        </div>
      )}
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {draft.map((offer) => {
          const def = offer.joker ? jokerDefinition(offer.joker) : null;
          const { cost: effectiveCost, used } = discountedOfferCost(offer.cost, discounts);
          const affordable = money >= effectiveCost;
          const borderColor = def?.rarity === 'legendary'
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
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: '#101722',
                color: affordable ? FB.text : FB.textFaint,
                padding: 10,
                textAlign: 'left',
                cursor: affordable ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 950 }}>{offer.label}</span>
                <span style={{ fontSize: 11, color: FB.gold, fontWeight: 950 }}>
                  {used > 0 && <s style={{ color: FB.textFaint, marginRight: 4 }}>${offer.cost}</s>}
                  ${effectiveCost}
                </span>
              </div>
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
          {buysThisWarRoom > 0 ? 'Start drive' : 'Skip · bank $3'}
        </button>
      </div>
    </section>
  );
}
