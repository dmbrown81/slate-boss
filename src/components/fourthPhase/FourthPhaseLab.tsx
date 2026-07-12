import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { mulberry32, stringSeed } from '../../lib/rng';
import { loadFeelPrefs, playFeel, saveFeelPrefs, updateCrowdMurmur, type FourthPhaseFeelEvent } from './fpFeedback';
import { prefersReducedMotion } from '../../lib/feedback';
import PlayCinematic from './PlayCinematic';
import {
  EFFECT_VERB_COLOR,
  FP as FB,
  FP_FONT_HEAD,
  FP_RADIUS,
  btnGhost,
  btnPrimary,
  card,
  sectionLabel,
} from './fourthPhaseStyles';
import { HowToPlay, SituationsPanel } from './FourthPhaseGuide';
import { FootballGlyph, GameHeader, Metric, Shell, UnlockBanner } from './fpShared';
import { HandCard, MiniCard, type DragBind } from './FourthPhaseCards';
import { GameStatusPanel, type LabPhase } from './GameStatusPanel';
import {
  CashInCard,
  CoachDiagnosisCard,
  DriveBannerOverlay,
  ResolutionCard,
} from './FeedbackPanels';
import {
  buildResolution,
  dailyShareGrid,
  dailyShareText,
  diagnoseWeakSeries,
  evaluateCashIn,
  firstRunSeed,
  stagedExplanation,
  type CashInSnapshot,
  type DriveLogEntry,
  type PlayResolution,
} from './fpLabLogic';
import { ComboChips, SeriesPreviewPanel } from './SeriesPreviewPanel';
import { TutorialPanel } from './TutorialCoach';
import { WarRoom } from './WarRoom';
import { DriveIntroScreen, TeamSelectScreen, TitleScreen } from './FourthPhaseScreens';
import {
  FP_PROGRESS_KEY,
  bestFourthPhaseRun,
  dailyModifierFor,
  fourthPhaseDailySeed,
  isTutorialDone,
  loadFourthPhaseDaily,
  loadFourthPhaseGrudge,
  loadFourthPhaseHistory,
  markTutorialDone,
  previousUtcDateLabel,
  readJson,
  saveFourthPhaseCompletion,
  writeJson,
  type FourthPhaseDailyRecord,
  type FourthPhaseRunMeta,
  type FourthPhaseRunRecord,
} from './fpPersistence';
import { renderShareCard } from './fpShareCard';
import {
  BASE_METER,
  BASE_METER_CAP,
  FOURTH_PHASE_BOSSES,
  FOURTH_PHASE_DISCOUNT_TOKEN_CAP,
  FOURTH_PHASE_DECK_MAX_SIZE,
  FOURTH_PHASE_DRIVES,
  FOURTH_PHASE_JOKER_LIMIT,
  FOURTH_PHASE_MAX_PLAYS_PER_DRIVE,
  FOURTH_PHASE_PLAY_LIMIT,
  FOURTH_PHASE_TEAMS,
  FOURTH_PHASE_WAR_ROOM_BUY_LIMIT,
  FOURTH_PHASE_WAR_ROOM_REROLL_COST,
  activeBossForDrive,
  applyFourthPhaseDrawStart,
  bossVoice,
  bossWarningForPlay,
  buildFourthPhaseDrivePile,
  buildPlayExplanation,
  buildRunShareCardData,
  callOfTheGameLine,
  cardDisplayName,
  coachLossLine,
  coachOrderCards,
  driveClearStamp,
  coachPickForWarRoom,
  coachRoomLine,
  comboLedgerEntries,
  createFourthPhaseRun,
  discountedOfferCost,
  drawFourthPhaseCards,
  EMPTY_FOURTH_PHASE_PROGRESS,
  formatMeter,
  FOURTH_PHASE_STAKES,
  fourthPhaseMaxStake,
  fourthPhaseBuildIdentity,
  fourthPhaseRunCode,
  fourthPhaseStake,
  generateFourthPhaseWarRoomOffers,
  halftimeCounterFor,
  isTrueCrowdBeforeOffenseCash,
  jokerDefinition,
  newlyUnlockedTeams,
  parseFourthPhaseRunCode,
  recordFourthPhaseResult,
  plainPlaySummary,
  playEffectVerb,
  SITUATION_LABELS,
  scoreFourthPhasePlay,
  tutorialCheckdownIsValid,
  type BestSeriesRecord,
  type FourthPhaseBossKey,
  type FourthPhaseCard,
  type FourthPhaseJokerState,
  type FourthPhasePracticeBook,
  type FourthPhaseScoreContext,
  type FourthPhaseScoreResult,
  type FourthPhaseTeamKey,
  type FourthPhaseWarRoomOffer,
  type SituationKey,
} from '../../lib/fourthPhase';

interface Props {
  onHome?: () => void;
}

/** Top-level app flow: title -> team/stake select -> the run itself. */
type AppScreen = 'title' | 'teams' | 'game';

interface LabState {
  seed: number;
  team: FourthPhaseTeamKey;
  /** Stake level (1-based) this run was started at. Drives targets, boss timing, redraws, cash. */
  stake: number;
  /** True between drives: the Drive Intro screen shows until the player kicks off. */
  awaitingKickoff: boolean;
  boss: FourthPhaseBossKey;
  targets: [number, number, number];
  /** The persistent 28–30 card game plan. Drive piles are eligible views of this deck. */
  activeDeck: FourthPhaseCard[];
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
  /** Drive 2's halftime adjustment: the situation the defense countered after Drive 1. */
  halftimeCounter?: SituationKey;
  /** One entry per finished drive (cleared or died): feeds the daily share grid. */
  driveLog: DriveLogEntry[];
  drawNonce: number;
  phase: LabPhase;
  runScore: number;
  bestPlay: number;
  /** The run's best series with its story context — feeds Call of the Game. */
  bestSeries?: BestSeriesRecord;
  buysThisWarRoom: number;
  rerollsThisWarRoom: number;
  pendingDraft?: FourthPhaseWarRoomOffer;
  lastPlay?: FourthPhaseScoreResult;
  cashIn?: CashInSnapshot;
  dailyLabel?: string;
  dailyPractice?: boolean;
  completion?: FourthPhaseRunRecord;
}

function scriptedOpening(deck: FourthPhaseCard[]): FourthPhaseCard[] {
  const desired = [
    'offense-3',
    'crowd-2',
    'crowd-4',
    'offense-K',
    'specialTeams-4',
    'defense-4',
    'offense-4',
    'crowd-7',
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
  const openingPool = buildFourthPhaseDrivePile(run.deck, seed, 0);
  const orderedDeck = meta.tutorialOpening ? scriptedOpening(openingPool) : openingPool;
  const draw = drawFourthPhaseCards(orderedDeck, [], stake.handSize, mulberry32(stringSeed(`${seed}:opening`)));
  // The daily's named twist is a run-parameter change (money/redraws/targets/
  // meter cap) — never a scoring change, so the preview stays exact. Practice
  // replays get the same twist: the practice must be the real puzzle.
  const modifier = meta.dailyLabel ? dailyModifierFor(meta.dailyLabel) : null;
  return {
    seed,
    team,
    stake: stake.level,
    awaitingKickoff: true,
    boss: run.boss,
    targets: run.targets.map((target) => Math.round(target * stake.targetScale * (modifier?.targetScale ?? 1))) as [number, number, number],
    activeDeck: run.deck,
    drawPile: draw.deck,
    discardPile: draw.discard,
    hand: draw.drawn,
    selectedIds: [],
    jokers: run.jokers,
    practice: run.practice,
    draft: [],
    money: Math.max(0, stake.startMoney + (modifier?.startMoneyDelta ?? 0)),
    discounts: 0,
    driveIndex: 0,
    driveScore: 0,
    discardsLeft: Math.max(1, stake.discardsPerDrive + (modifier?.redrawsDelta ?? 0)),
    playsThisDrive: 0,
    meter: run.meter.meter,
    meterCap: modifier?.meterCapMax ? Math.min(run.meter.meterCap, modifier.meterCapMax) : run.meter.meterCap,
    repeatedSituations: {},
    driveLog: [],
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
    boss: state.boss,
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
    halftimeCounter: state.halftimeCounter,
  };
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
  const [dailyCopied, setDailyCopied] = useState(false);
  const [shareCardStatus, setShareCardStatus] = useState('');
  const [coachNudge, setCoachNudge] = useState('');
  const [resolution, setResolution] = useState<PlayResolution | null>(null);
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragJoker, setDragJoker] = useState<string | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number>(-1);
  const [coachDiagnosis, setCoachDiagnosis] = useState('');
  const shownLessonsRef = useRef<Set<string>>(new Set());
  const [feel, setFeel] = useState(loadFeelPrefs);
  // Signature cash-in cinematic: at most one interruption per drive, and the
  // peak must stay rare or it stops being a peak.
  const [cinematic, setCinematic] = useState<{ cards: FourthPhaseCard[]; result: FourthPhaseScoreResult; key: number } | null>(null);
  const cinematicDriveRef = useRef(-1);
  const cinematicKeyRef = useRef(0);
  const [driveBanner, setDriveBanner] = useState<{ drive: number; score: number; stamp: string } | null>(null);
  const driveBannerTimerRef = useRef(0);

  function feelEvent(event: FourthPhaseFeelEvent) {
    playFeel(event, feel);
  }

  function toggleSound() {
    setFeel((current) => {
      const next = { ...current, sound: !current.sound };
      saveFeelPrefs(next);
      if (next.sound) playFeel('card_tap', next);
      return next;
    });
  }

  function toggleHaptics() {
    setFeel((current) => {
      const next = { ...current, haptics: !current.haptics };
      saveFeelPrefs(next);
      if (next.haptics) playFeel('run_series', { sound: false, haptics: true });
      return next;
    });
  }

  // Drive clears, wins, and losses all resolve inside executePlay's state
  // update, so the ceremony cue keys off the observed phase transition —
  // one place, every path (plays, war-room skips, imports) covered.
  const prevPhaseRef = useRef<LabPhase>(state.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;
    if (prev === state.phase) return;
    if (state.phase === 'warRoom') playFeel('drive_clear', feel);
    else if (state.phase === 'won') playFeel('win', feel);
    else if (state.phase === 'lost') playFeel('loss', feel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cue fires only on phase edges, not pref edits
  }, [state.phase]);

  // Stadium murmur follows the momentum meter while a drive is live. The
  // meter IS the crowd: the room gets louder and brighter as it charges.
  const murmurLevel = screen === 'game' && state.phase === 'play' && !state.awaitingKickoff
    ? Math.min(1, (state.meter - BASE_METER) / Math.max(0.1, state.meterCap - BASE_METER))
    : 0;
  useEffect(() => {
    updateCrowdMurmur(murmurLevel, feel);
  }, [murmurLevel, feel]);
  useEffect(() => () => updateCrowdMurmur(0, { sound: false, haptics: false }), []);

  // Advance the tutorial as the player actually performs each step. Driven by the
  // play handler (executePlay) rather than an effect.
  function advanceTutorial(playWillCash: boolean) {
    if (tutorialStep === 0) setTutorialStep(1);
    else if (tutorialStep === 1 && playWillCash) setTutorialStep(2);
  }

  function finishTutorial() {
    markTutorialDone();
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
    saveFourthPhaseCompletion(state.completion, state.dailyPractice, dailyShareGrid(state.driveLog));
    writeJson(FP_PROGRESS_KEY, career);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- driveLog is set in the same update as completion
  }, [state.completion, state.dailyPractice, career]);

  const daily = fourthPhaseDailySeed();
  const storedDailyRecord = loadFourthPhaseDaily();
  const dailyRecord: FourthPhaseDailyRecord | null = state.completion?.dailyLabel === daily.label && !state.dailyPractice
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
  const shownExplanation = tutorialStep >= 0 && preview ? stagedExplanation(preview) : playExplanation;
  const previewVerb = preview ? playEffectVerb(preview) : null;
  const previewCombos = preview ? comboLedgerEntries(preview) : [];
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
  // The halftime adjustment telegraphs exactly like a boss: the warning names
  // the countered call before the player commits. Never co-occurs with a boss
  // (the adjustment only exists on bossless drive 2), so it shares the slot.
  const halftimeWarning = preview && state.halftimeCounter && preview.situation.key === state.halftimeCounter
    ? `Halftime adjustment: they've seen your ${SITUATION_LABELS[state.halftimeCounter]} — it scores x0.8 Yards this drive.`
    : null;
  const grudge = loadFourthPhaseGrudge();
  const dailyModifier = state.dailyLabel ? dailyModifierFor(state.dailyLabel) : null;
  const todayModifier = dailyModifierFor(daily.label);
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
    setState(createInitialState(
      team,
      seed ?? (tutorial ? firstRunSeed(team) : undefined),
      { ...meta, tutorialOpening: tutorial },
      stakeLevel,
    ));
    setTutorialStep(tutorial ? 0 : -1);
    setRunStarted(true);
    setScreen('game');
    setImportError('');
    setShareCopied(false);
    setResultCopied(false);
    setDailyCopied(false);
    setShareCardStatus('');
    setCoachNudge('');
    setResolution(null);
    setLedgerExpanded(false);
    setCoachDiagnosis('');
    shownLessonsRef.current = new Set();
    setCinematic(null);
    cinematicDriveRef.current = -1;
    setDriveBanner(null);
  }

  function kickoffDrive() {
    feelEvent('kickoff');
    setCoachDiagnosis('');
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

  // The Wordle loop: one spoiler-light text block anyone can paste anywhere.
  // Fresh completions share from live state; the title screen re-shares today's
  // stored record (grid included) after the run is gone.
  function buildDailyResultText(): string | null {
    if (state.completion?.dailyLabel && !state.dailyPractice) {
      return dailyShareText({
        label: state.completion.dailyLabel,
        won: state.completion.won,
        score: state.completion.score,
        streak: dailyRecord?.streak ?? 1,
        drives: FOURTH_PHASE_DRIVES,
        drivesCleared: state.driveLog.filter((drive) => drive.cleared).length,
        grid: dailyShareGrid(state.driveLog),
        runCode: state.completion.runCode,
        modifierName: dailyModifierFor(state.completion.dailyLabel).name,
      });
    }
    if (storedDailyRecord?.date === daily.label && storedDailyRecord.grid) {
      return dailyShareText({
        label: storedDailyRecord.date,
        won: storedDailyRecord.won,
        score: storedDailyRecord.score,
        streak: storedDailyRecord.streak,
        drives: FOURTH_PHASE_DRIVES,
        drivesCleared: storedDailyRecord.grid.split('\n').filter((row) => row.includes('🟨')).length,
        grid: storedDailyRecord.grid,
        runCode: fourthPhaseRunCode(storedDailyRecord.seed, storedDailyRecord.team, 1),
        modifierName: dailyModifierFor(storedDailyRecord.date).name,
      });
    }
    return null;
  }

  const dailyShareReady = Boolean(buildDailyResultText());

  function shareDailyResult() {
    const text = buildDailyResultText();
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => setDailyCopied(true)).catch(() => setDailyCopied(false));
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
    feelEvent('card_tap');
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
    setCoachNudge('Coach ordered the script: setup first, then the call that cashes it.');
  }

  function refillHand(current: LabState, hand: FourthPhaseCard[], discardPile: FourthPhaseCard[], drawExtra: number) {
    const handSize = fourthPhaseStake(current.stake).handSize;
    const count = Math.max(0, handSize - hand.length) + Math.max(0, drawExtra);
    const draw = drawFourthPhaseCards(
      current.drawPile,
      discardPile,
      count,
      mulberry32(stringSeed(`${current.seed}:draw:${current.drawNonce}`)),
    );
    return {
      hand: [...hand, ...draw.drawn].slice(0, handSize + 2),
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
    // Signature cash-ins get the full "Play Unfolds" cinematic (which owns the
    // payoff sound); everything else gets the instant cue. One interruption
    // per drive, never during the tutorial, never under reduced motion.
    const signatureCash = preview.didCash && (preview.bigPlay >= 3.5 || preview.points >= 150);
    const showCinematic = signatureCash && tutorialStep < 0 && !prefersReducedMotion() && cinematicDriveRef.current !== state.driveIndex;
    if (showCinematic) {
      cinematicDriveRef.current = state.driveIndex;
      cinematicKeyRef.current += 1;
      setCinematic({ cards: selectedCards, result: preview, key: cinematicKeyRef.current });
    } else {
      // Same impact tiers as buildResolution: huge > cash > normal series.
      feelEvent(preview.points >= 180 || preview.bigPlay >= 4 ? 'big_cash' : preview.didCash ? 'cash' : 'run_series');
    }
    // Clearing a mid-run drive earns a held beat before the War Room — unless
    // the cinematic is already celebrating this exact play.
    const clearsDrive = state.driveScore + preview.points >= target;
    if (clearsDrive && state.driveIndex < FOURTH_PHASE_DRIVES - 1 && !showCinematic) {
      setDriveBanner({
        drive: state.driveIndex + 1,
        score: state.driveScore + preview.points,
        stamp: driveClearStamp({
          clearingPoints: preview.points,
          target,
          callsUsed: state.playsThisDrive + 1,
          maxCalls: FOURTH_PHASE_MAX_PLAYS_PER_DRIVE,
          didCash: preview.didCash,
        }),
      });
      window.clearTimeout(driveBannerTimerRef.current);
      driveBannerTimerRef.current = window.setTimeout(() => setDriveBanner(null), 1450);
    }
    // The boss speaks when it visibly eats a play — the ledger says whether it did.
    const bossPunish = preview.ledger.some((entry) => entry.channel === 'boss') ? bossVoice(activeBoss)?.punish : undefined;
    setResolution((current) => buildResolution(preview, shownExplanation, (current?.key ?? 0) + 1, tutorialStep >= 0, bossPunish));
    // Preview and execution score through the same context, so `preview` IS the
    // resolved series — the diagnosis reads exact numbers, not estimates.
    if (tutorialStep < 0) {
      const diagnosis = diagnoseWeakSeries(preview, state.meter);
      if (diagnosis && !shownLessonsRef.current.has(diagnosis.lesson)) {
        shownLessonsRef.current.add(diagnosis.lesson);
        setCoachDiagnosis(diagnosis.text);
      } else {
        setCoachDiagnosis('');
      }
    }
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
      const bossNow = activeBossForDrive(current, current.driveIndex, fourthPhaseStake(current.stake).bossFromDrive);
      const bestSeries: BestSeriesRecord | undefined = result.points > current.bestPlay
        ? {
          points: result.points,
          situation: result.situation.label,
          driveNumber: current.driveIndex + 1,
          didCash: result.didCash,
          bigPlay: result.bigPlay,
          bossName: bossNow === 'none' ? undefined : FOURTH_PHASE_BOSSES[bossNow].name,
        }
        : current.bestSeries;
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
        bestSeries,
        lastPlay: result,
        cashIn,
      };
      if (driveScore >= current.targets[current.driveIndex]) {
        const driveLog: DriveLogEntry[] = [...current.driveLog, { calls: current.playsThisDrive + 1, cleared: true }];
        if (current.driveIndex >= FOURTH_PHASE_DRIVES - 1) {
          const bestPlay = Math.max(current.bestPlay, result.points);
          return {
            ...baseUpdate,
            driveLog,
            phase: 'won',
            meter: BASE_METER,
            completion: makeRunRecord(current, runScore, true, bestPlay),
          };
        }
        const warRoomMoney = baseUpdate.money + 5 + current.driveIndex * 2;
        return {
          ...baseUpdate,
          driveLog,
          phase: 'warRoom',
          draft: generateFourthPhaseWarRoomOffers(
            baseUpdate.jokers,
            current.seed,
            current.driveIndex,
            current.team,
            current.boss,
            0,
            current.practice,
            activeBossForDrive(current, current.driveIndex + 1, fourthPhaseStake(current.stake).bossFromDrive),
            baseUpdate.activeDeck,
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
        return {
          ...baseUpdate,
          driveLog: [...current.driveLog, { calls: current.playsThisDrive + 1, cleared: false }],
          phase: 'lost',
          meter: BASE_METER,
          completion: makeRunRecord(current, runScore, false, bestPlay),
        };
      }
      return baseUpdate;
    });
  }

  function redrawHand() {
    if (state.phase !== 'play' || state.discardsLeft <= 0) return;
    feelEvent('card_tap');
    setResolution(null);
    setCoachNudge('');
    setState((current) => {
      const draw = drawFourthPhaseCards(
        current.drawPile,
        [...current.discardPile, ...current.hand],
        fourthPhaseStake(current.stake).handSize,
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
    const nextBoss = activeBossForDrive(current, nextDrive, stake.bossFromDrive);
    // Daily modifiers re-apply at every drive boundary (redraws and the meter
    // cap reset per drive, so the twist must too).
    const modifier = current.dailyLabel ? dailyModifierFor(current.dailyLabel) : null;
    const fullPile = buildFourthPhaseDrivePile(
      current.activeDeck,
      current.seed,
      nextDrive,
    );
    const baseCap = Math.max(BASE_METER_CAP, current.meterCap);
    const meter = applyFourthPhaseDrawStart(
      { meter: BASE_METER, meterCap: modifier?.meterCapMax ? Math.min(baseCap, modifier.meterCapMax) : baseCap },
      { jokers: nextJokers, practice: nextPractice, wins: nextDrive, boss: nextBoss },
    );
    const draw = drawFourthPhaseCards(fullPile, [], stake.handSize, mulberry32(stringSeed(`${current.seed}:drive-hand:${nextDrive}`)));
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
      discardsLeft: Math.max(1, stake.discardsPerDrive + (modifier?.redrawsDelta ?? 0)),
      playsThisDrive: 0,
      meter: meter.meter,
      meterCap: meter.meterCap,
      repeatedSituations: {},
      // Drive 2's identity on bossless drives: the defense counters the
      // situation the player leaned on in Drive 1. Declared at the intro.
      halftimeCounter: nextDrive === 1 && nextBoss === 'none' ? halftimeCounterFor(current.repeatedSituations) ?? undefined : undefined,
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
      feelEvent('card_tap');
      setState((current) => ({ ...current, pendingDraft: offer }));
      return;
    }
    if (offer.kind === 'card' && offer.card && state.activeDeck.length >= FOURTH_PHASE_DECK_MAX_SIZE) {
      feelEvent('card_tap');
      setState((current) => ({ ...current, pendingDraft: offer }));
      return;
    }
    feelEvent('buy');
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
      if (offer.kind === 'card' && offer.card) {
        const withCard = { ...current, activeDeck: [...current.activeDeck, offer.card] };
        return finishPurchase(withCard, offer, current.jokers, current.practice, current.money - cost, current.discounts - used);
      }
      return current;
    });
  }

  function confirmReplaceJoker(index: number) {
    if (state.phase !== 'warRoom' || !state.pendingDraft?.joker) return;
    feelEvent('buy');
    setState((current) => {
      const pending = current.pendingDraft;
      if (!pending?.joker || current.phase !== 'warRoom') return current;
      const { cost, used } = discountedOfferCost(pending.cost, current.discounts);
      if (current.money < cost) return current;
      const nextJokers = current.jokers.map((joker, i) => (i === index ? pending.joker! : joker));
      return finishPurchase(current, pending, nextJokers, current.practice, current.money - cost, current.discounts - used);
    });
  }

  function confirmReplaceCard(cardId: string) {
    if (state.phase !== 'warRoom' || !state.pendingDraft?.card) return;
    feelEvent('buy');
    setState((current) => {
      const pending = current.pendingDraft;
      if (!pending?.card || current.phase !== 'warRoom') return current;
      const { cost, used } = discountedOfferCost(pending.cost, current.discounts);
      if (current.money < cost) return current;
      const next = {
        ...current,
        activeDeck: [...current.activeDeck.filter((card) => card.id !== cardId), pending.card],
      };
      return finishPurchase(next, pending, current.jokers, current.practice, current.money - cost, current.discounts - used);
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
    feelEvent('card_tap');
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
          activeBossForDrive(current, current.driveIndex + 1, fourthPhaseStake(current.stake).bossFromDrive),
          current.activeDeck,
        ),
      };
    });
  }

  function dragProps(id: string, setter: (id: string | null) => void, onDropId: (id: string) => void): DragBind {
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
  // The cinematic can outlive the play that triggered it (drive clears, run
  // ends), so it renders on every in-game screen, above everything.
  const cinematicOverlay = cinematic ? (
    <PlayCinematic
      key={cinematic.key}
      cards={cinematic.cards}
      result={cinematic.result}
      prefs={feel}
      onDone={() => setCinematic(null)}
    />
  ) : null;
  const driveBannerOverlay = driveBanner ? (
    <DriveBannerOverlay drive={driveBanner.drive} score={driveBanner.score} stamp={driveBanner.stamp} />
  ) : null;

  if (screen === 'title') {
    return (
      <Shell>
        <TitleScreen
          canContinue={runInProgress}
          onContinue={() => setScreen('game')}
          onPlay={() => setScreen('teams')}
          onDaily={startDailyRun}
          dailyLabel={daily.label}
          dailyModifier={todayModifier}
          todayDailyDone={todayDailyDone}
          dailyStreak={dailyRecord?.streak ?? 0}
          localBest={localBest?.score ?? null}
          wins={career.wins}
          onShareDaily={dailyShareReady ? shareDailyResult : undefined}
          dailyShareCopied={dailyCopied}
          soundOn={feel.sound}
          hapticsOn={feel.haptics}
          onToggleSound={toggleSound}
          onToggleHaptics={toggleHaptics}
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
        <GameHeader runCode={runCode} stakeLevel={state.stake} soundOn={feel.sound} onToggleSound={toggleSound} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />
        <DriveIntroScreen
          driveNumber={state.driveIndex + 1}
          drives={FOURTH_PHASE_DRIVES}
          target={target}
          teamName={teamProfile.name}
          teamIdentity={teamProfile.identity}
          stakeLevel={state.stake}
          boss={activeBoss !== 'none' ? FOURTH_PHASE_BOSSES[activeBoss] : null}
          bossTaunt={bossVoice(activeBoss)?.intro}
          rematch={grudge !== null && grudge.boss === (activeBoss !== 'none' ? activeBoss : state.boss)}
          halftimeNote={state.halftimeCounter
            ? `They've seen your ${SITUATION_LABELS[state.halftimeCounter]}. It scores x0.8 Yards this drive — show them something new.`
            : undefined}
          upcomingBoss={activeBoss === 'none' ? FOURTH_PHASE_BOSSES[state.boss] : null}
          bossArrivesDrive={stakeProfile.bossFromDrive + 1}
          plays={FOURTH_PHASE_MAX_PLAYS_PER_DRIVE}
          redraws={state.discardsLeft}
          money={state.money}
          jokers={state.jokers.map((joker) => jokerDefinition(joker).name)}
          dailyLabel={state.dailyLabel}
          dailyModifier={dailyModifier ?? undefined}
          onKickoff={kickoffDrive}
        />
      </Shell>
    );
  }

  if (state.phase === 'warRoom') {
    return (
      <Shell impactClass={shellImpact}>
        {cinematicOverlay}
        {driveBannerOverlay}
        <GameHeader runCode={runCode} stakeLevel={state.stake} soundOn={feel.sound} onToggleSound={toggleSound} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Metric label="Run progress" value={`${state.runScore}`} color={FB.gold} />
          <Metric label="Best series" value={`${state.bestPlay}`} color="#5fb4ff" />
        </div>
        <WarRoom
          money={state.money}
          discounts={state.discounts}
          draft={state.draft}
          jokers={state.jokers}
          deck={state.activeDeck}
          pendingDraft={state.pendingDraft}
          buysThisWarRoom={state.buysThisWarRoom}
          nextDriveNumber={state.driveIndex + 2}
          nextTarget={state.targets[state.driveIndex + 1]}
          nextBoss={nextBossKey === 'none' ? null : FOURTH_PHASE_BOSSES[nextBossKey]}
          coachLine={coachRoomLine(
            nextBossKey,
            state.targets[state.driveIndex + 1] ?? 0,
            nextBossKey === 'none' ? FOURTH_PHASE_BOSSES[state.boss].name : undefined,
            nextBossKey === 'none' ? stakeProfile.bossFromDrive + 1 : undefined,
          )}
          onDraft={buyOffer}
          onReplace={confirmReplaceJoker}
          onReplaceCard={confirmReplaceCard}
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
    // Loss drama, staged before the diagnosis: the margin, the fuel that died
    // in the tank, and the boss getting the last word — feel it, then learn.
    const verdictBossVoice = activeBoss !== 'none' ? bossVoice(activeBoss) : null;
    const verdictBossName = activeBoss !== 'none' ? FOURTH_PHASE_BOSSES[activeBoss].name : '';
    const strandedMeter = !won && state.lastPlay && state.lastPlay.meterAfter > BASE_METER + 0.5 ? state.lastPlay.meterAfter : null;
    const priorRuns = loadFourthPhaseHistory().filter((entry) => entry.id !== state.completion?.id);
    const careerBestSeries = priorRuns.length > 0 && state.bestPlay > Math.max(...priorRuns.map((entry) => entry.bestPlay));
    const buildIdentity = fourthPhaseBuildIdentity(state.activeDeck, state.team);
    return (
      <Shell impactClass={shellImpact}>
        {cinematicOverlay}
        <GameHeader runCode={runCode} stakeLevel={state.stake} soundOn={feel.sound} onToggleSound={toggleSound} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />
        <section style={{ ...card(), padding: 16, marginTop: 10, textAlign: 'center', borderColor: won ? FB.gold : FB.red }}>
          <div className="fp-head fp-verdict-stamp" style={{ fontSize: 26, color: won ? FB.gold : FB.red, fontWeight: 900 }}>
            {won ? 'RUN WON' : 'RUN OVER'}
          </div>
          <div style={{ fontSize: 11, color: fourthPhaseStake(state.stake).color, fontWeight: 900, marginTop: 4 }}>
            {teamProfile.name} | {fourthPhaseStake(state.stake).name}
          </div>
          {!won && verdictBossVoice && (
            <div className="fp-head" style={{ fontSize: 13, color: FB.red, fontWeight: 900, letterSpacing: 2.5, marginTop: 8 }}>
              {verdictBossVoice.lossHeadline}
            </div>
          )}
          {!won && (
            <div className="fb-led" style={{ fontSize: 26, color: FB.red, fontWeight: 950, marginTop: 6, lineHeight: 1 }}>
              SHORT BY {targetRemaining}
            </div>
          )}
          {strandedMeter && (
            <div style={{ display: 'inline-block', border: '1px solid rgba(169,135,255,0.55)', borderRadius: FP_RADIUS.pill, color: '#cbbdff', padding: '3px 10px', fontSize: 11, fontWeight: 900, marginTop: 8 }}>
              {formatMeter(strandedMeter)} momentum stranded
            </div>
          )}
          {verdictBossVoice && (
            <div style={{ fontSize: 11.5, color: won ? FB.textDim : '#ff9aac', fontWeight: 850, fontStyle: 'italic', marginTop: 8, lineHeight: 1.4 }}>
              {'“'}{won ? verdictBossVoice.playerWin : verdictBossVoice.playerLoss}{'”'} — {verdictBossName}
            </div>
          )}
          <div style={{ fontSize: 12, color: FB.textDim, marginTop: 6 }}>
            {won
              ? `All ${FOURTH_PHASE_DRIVES} drives cleared against ${FOURTH_PHASE_BOSSES[state.boss].name}.`
              : lossReason}
          </div>
          {lossDiagnosis && (
            <div style={{ border: `1px solid rgba(242,189,61,0.42)`, borderRadius: 8, color: FB.gold, background: 'rgba(242,189,61,0.07)', padding: '8px 10px', fontSize: 11.5, fontWeight: 850, marginTop: 8, lineHeight: 1.4, textAlign: 'left' }}>
              {lossDiagnosis.advice}
              <div style={{ color: FB.textDim, fontStyle: 'italic', fontWeight: 800, marginTop: 6 }}>
                {'“'}{coachLossLine(state.seed)}{'”'} — Coach
              </div>
            </div>
          )}
          <div className="fb-num" style={{ fontSize: 40, color: FB.gold, fontWeight: 950, marginTop: 8, lineHeight: 1 }}>{state.runScore}</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 2 }}>total progress</div>
          {state.completion && localBest?.id === state.completion.id && (
            <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900, marginTop: 5 }}>New local best</div>
          )}
          {state.bestSeries && (
            <div style={{ fontSize: 11.5, color: FB.gold, fontWeight: 900, marginTop: 10, lineHeight: 1.4 }}>
              {callOfTheGameLine(state.bestSeries)}
            </div>
          )}
          {careerBestSeries && (
            <div style={{ fontSize: 10.5, color: FB.gold, fontWeight: 900, marginTop: 3 }}>★ Career-best series</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
            <Metric label="Best series" value={`${state.bestPlay}`} color={FB.gold} />
            <Metric label="Drives" value={`${won ? FOURTH_PHASE_DRIVES : state.driveIndex + 1}/${FOURTH_PHASE_DRIVES}`} color="#5fb4ff" />
            <Metric label="Boss" value={FOURTH_PHASE_BOSSES[state.boss].name} color={FB.red} small />
          </div>
          <div style={{ border: `1px solid ${FB.border}`, borderRadius: FP_RADIUS.card, background: FB.panelRaised, padding: '9px 10px', marginTop: 10, textAlign: 'left' }}>
            <div style={{ ...sectionLabel, color: '#5fb4ff' }}>Your build</div>
            <div style={{ color: FB.text, fontSize: 12, fontWeight: 950, marginTop: 3 }}>{buildIdentity.label}</div>
            <div style={{ color: FB.textFaint, fontSize: 10.5, lineHeight: 1.35, marginTop: 3 }}>{buildIdentity.detail}</div>
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
              title={`New playbook unlocked: ${FOURTH_PHASE_TEAMS[team].shortName}`}
              detail={FOURTH_PHASE_TEAMS[team].identity}
              color={FB.gold}
            />
          ))}
          {state.dailyLabel && (
            <div style={{ fontSize: 11, color: '#cbbdff', fontWeight: 800, marginTop: 8 }}>
              Daily {state.dailyLabel}{state.dailyPractice ? ' | practice (streak unchanged)' : dailyRecord ? ` | streak ${dailyRecord.streak}` : ''}
            </div>
          )}
          {state.dailyLabel && !state.dailyPractice && state.driveLog.length > 0 && (
            <>
              {/* The share grid, shown before sharing so the emoji rows read as
                  the run's fingerprint: one row per drive, one square per call. */}
              <div aria-label="Daily result grid" style={{ fontSize: 17, lineHeight: 1.3, letterSpacing: 2, marginTop: 8 }}>
                {dailyShareGrid(state.driveLog).split('\n').map((row, index) => (
                  <div key={index}>{row}</div>
                ))}
              </div>
              <button
                onClick={shareDailyResult}
                style={{ ...btnGhost, width: '100%', marginTop: 10, borderColor: '#5b4a86', color: '#cbbdff' }}
              >
                {dailyCopied ? 'Copied — paste it anywhere' : 'Share Daily Result'}
              </button>
            </>
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
          <button onClick={() => restart(state.team, state.seed, undefined, state.stake)} style={{ ...btnGhost, width: '100%', marginTop: 8, ...(won ? null : { borderColor: FB.red, color: '#ff9aac' }) }}>
            {won ? 'Replay this seed' : verdictBossName ? `Revenge Game — rematch ${verdictBossName}` : 'Revenge Game — same seed'}
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <div
      className={shellImpact ? `fp-shell ${shellImpact}` : 'fp-shell'}
      style={{ minHeight: '100svh', padding: '10px 12px 96px' }}
    >
      {cinematicOverlay}
      <div className="fp-screen-in fp-table-col" style={{ maxWidth: 560, margin: '0 auto' }}>
      <GameHeader runCode={runCode} stakeLevel={state.stake} soundOn={feel.sound} onToggleSound={toggleSound} onTitle={() => setScreen('title')} onNewRun={() => setScreen('teams')} />

      <TutorialPanel
        step={tutorialStep}
        coachNudge={coachNudge}
        canCoachOrder={canCoachOrder}
        highlightCoachOrder={selectedNeedsCoachOrder}
        onCoachOrder={coachOrderSelected}
        onFinish={finishTutorial}
      />

      <GameStatusPanel
        labPhase={state.phase}
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
        hideMeter={tutorialStep === 0}
        activeBoss={activeBoss === 'none' ? null : FOURTH_PHASE_BOSSES[activeBoss]}
        scoutingBoss={!coachMode && activeBoss === 'none' ? FOURTH_PHASE_BOSSES[state.boss] : null}
        bossArrivesDrive={stakeProfile.bossFromDrive + 1}
        gain={resolution && state.lastPlay ? { points: state.lastPlay.points, cashed: state.lastPlay.didCash, key: resolution.key } : null}
      />

      {resolution && <ResolutionCard resolution={resolution} />}

      {coachDiagnosis && !coachMode && state.phase === 'play' && <CoachDiagnosisCard text={coachDiagnosis} />}

      {state.cashIn && (
        <CashInCard
          cashIn={state.cashIn}
          runCode={runCode}
          teamShort={FOURTH_PHASE_TEAMS[state.team].shortName}
          jokerNames={state.jokers.map((joker) => jokerDefinition(joker).name)}
          copied={shareCopied}
          onCopy={copyCashCard}
        />
      )}

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Call Script</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>{state.selectedIds.length}/{FOURTH_PHASE_PLAY_LIMIT}. Left scores first.</div>
        </div>
        <div style={{ border: `1px solid ${preview?.didCash ? FB.gold : FB.border}`, borderRadius: 8, background: FB.panelSoft, color: preview?.didCash ? FB.gold : FB.textDim, padding: '8px 9px', fontSize: 11.5, fontWeight: 850, marginBottom: 8 }}>
          {shownExplanation}
        </div>
        {previewCombos.length > 0 && <ComboChips entries={previewCombos} />}
        <div style={{ display: 'flex', gap: 6, minHeight: 100, overflowX: 'auto', padding: '8px 0 2px' }}>
          {selectedCards.map((card, index) => (
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
          {Array.from({ length: Math.max(0, FOURTH_PHASE_PLAY_LIMIT - selectedCards.length) }).map((_, index) => (
            <div
              key={`sleeve-${index}`}
              className="fp-sleeve"
              style={{ minWidth: 86, alignSelf: 'stretch', minHeight: 100, marginLeft: selectedCards.length + index > 0 ? 19 : 0 }}
            >
              <span style={{ fontFamily: FP_FONT_HEAD, fontSize: 9.5, fontWeight: 900, letterSpacing: 1.4 }}>
                CALL {selectedCards.length + index + 1}
              </span>
            </div>
          ))}
        </div>
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

      <SeriesPreviewPanel
        preview={preview}
        previewVerb={previewVerb}
        lastPlay={state.lastPlay}
        coachMode={coachMode}
        bossWarning={bossWarning ?? halftimeWarning}
        previewBleeds={previewBleeds}
        reorderHint={reorderHint}
        hideReorderDelta={state.stake >= 2}
        onCoachOrder={coachOrderSelected}
        targetRemaining={targetRemaining}
        playsLeft={playsLeft}
      />

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
                  <span style={{ color: entry.channel === 'combo' ? FB.gold : entry.channel === 'joker' ? '#cbbdff' : entry.channel === 'boss' ? FB.red : FB.textFaint, fontWeight: 900 }}>{entry.label}</span>
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
                  {shownExplanation}
                </div>
              )}
            </div>
            <button
              onClick={executePlay}
              disabled={!preview}
              className="fp-pressable"
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

const bottomBar: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 40,
  padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
  background: 'rgba(19,23,32,0.95)',
  borderTop: `1px solid ${FB.border}`,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
