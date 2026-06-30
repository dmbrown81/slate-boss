import {
  BASE_METER,
  BASE_METER_CAP,
  HOLD_BLEED_RATE,
  LOW_SCORE_BLEED_THRESHOLD,
  SUSTAINED_TICK,
  applyMeterBleed,
  applyMeterCharge,
  clampMeter,
  crowdChargeForRank,
} from './meter';
import { baseMutableScore, jokerDefinition, type JokerHookContext, type MutableFourthPhaseScore } from './jokers';
import { recognizeFourthPhaseSituation } from './situations';
import type {
  FourthPhaseCard,
  FourthPhaseJokerState,
  FourthPhaseScoreContext,
  FourthPhaseScoreResult,
  MeterState,
  ScoreLedgerEntry,
  SituationResult,
} from './types';

const EMPTY_CONTEXT: FourthPhaseScoreContext = {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [],
  practice: {},
  discardsLeft: 2,
  cardsPlayedThisDrive: 0,
  driveIndex: 0,
  wins: 0,
  boss: 'none',
  repeatedSituations: {},
};

function jokerDefs(jokers: readonly FourthPhaseJokerState[]) {
  return jokers.map(jokerDefinition);
}

function hookContext(
  cards: readonly FourthPhaseCard[],
  situation: SituationResult,
  context: FourthPhaseScoreContext,
  score: MutableFourthPhaseScore,
  extra: Partial<JokerHookContext> = {},
): JokerHookContext {
  return { cards, situation, context, score, ...extra };
}

function ledger(score: MutableFourthPhaseScore, entry: ScoreLedgerEntry) {
  score.ledger.push(entry);
}

function cardValueForScore(card: FourthPhaseCard): number {
  let value = card.value;
  if (card.edition === 'allPro') value += 2;
  if (card.edition === 'inRhythm') value += 1;
  if (card.modifier === 'agingVet') value = Math.max(1, value - 1);
  return value;
}

function cardTraitScore(card: FourthPhaseCard, score: MutableFourthPhaseScore, context: FourthPhaseScoreContext) {
  if (card.phase === 'offense') {
    let yardDelta = 0;
    if (card.edition === 'allPro') yardDelta += 2;
    if (card.edition === 'inRhythm') yardDelta += 1;
    if (card.modifier === 'agingVet') yardDelta -= 1;
    if (yardDelta !== 0) {
      score.yards = Math.max(0, score.yards + yardDelta);
      ledger(score, {
        channel: 'yards',
        label: card.edition === 'allPro' ? 'All-Pro edition' : card.modifier === 'agingVet' ? 'Aging vet' : 'In Rhythm edition',
        value: `${yardDelta > 0 ? '+' : ''}${yardDelta} Yards`,
        detail: card.roleName,
      });
    }
  }
  if (card.edition === 'homeRun' && card.phase === 'offense') {
    score.bigPlay += 0.08;
    ledger(score, { channel: 'bigPlay', label: 'Home Run edition', value: '+0.08 BP', detail: card.roleName });
  }
  if (card.edition === 'inRhythm') {
    score.execution += 0.05;
    ledger(score, { channel: 'execution', label: 'In Rhythm edition', value: '+0.05 Exec', detail: card.roleName });
  }
  if (card.modifier === 'reliable') {
    score.execution += 0.04;
    ledger(score, { channel: 'execution', label: 'Reliable', value: '+0.04 Exec', detail: card.roleName });
  }
  if (card.modifier === 'explosive') {
    score.bigPlay += 0.05;
    ledger(score, { channel: 'bigPlay', label: 'Explosive', value: '+0.05 BP', detail: card.roleName });
  }
  if (card.modifier === 'clutch' && (context.targetRemaining ?? Infinity) <= 120) {
    score.execution += 0.08;
    ledger(score, { channel: 'execution', label: 'Clutch', value: '+0.08 Exec', detail: card.roleName });
  }
  if (card.modifier === 'hometownHero' && score.meter >= 3) {
    score.execution += 0.1;
    ledger(score, { channel: 'execution', label: 'Hometown Hero', value: '+0.10 Exec', detail: card.roleName });
  }
  if (card.modifier === 'lockerRoomCancer') {
    score.execution -= 0.05;
    ledger(score, { channel: 'execution', label: 'Locker-room drag', value: '-0.05 Exec', detail: card.roleName });
  }
  if (card.modifier === 'holdout') {
    score.fuel.money -= 1;
    ledger(score, { channel: 'fuel', label: 'Holdout upkeep', value: '-$1', detail: card.roleName });
  }
}

function applyCharge(
  cards: readonly FourthPhaseCard[],
  situation: SituationResult,
  context: FourthPhaseScoreContext,
  score: MutableFourthPhaseScore,
  charge: number,
  source: JokerHookContext['chargeSource'],
  label: string,
) {
  if (charge <= 0) return;
  let total = charge;
  for (const joker of jokerDefs(context.jokers)) {
    const bonus = joker.hooks.onMeterCharged?.(hookContext(cards, situation, context, score, { charge, chargeSource: source })) ?? 0;
    total += bonus;
  }
  const before = score.meter;
  score.meter = applyMeterCharge(score.meter, total, score.meterCap);
  score.meterCharged += Math.max(0, score.meter - before);
  ledger(score, {
    channel: 'meter',
    label,
    value: `+${total.toFixed(2)} meter`,
    detail: `x${before.toFixed(2)} to x${score.meter.toFixed(2)}`,
  });
}

function applyBossBeforeScore(score: MutableFourthPhaseScore, context: FourthPhaseScoreContext) {
  if (context.boss !== 'roadGame') return;
  score.meterCapLimit = 2;
  score.meterCap = Math.min(score.meterCap, 2);
  score.meter = clampMeter(score.meter, score.meterCap);
  score.meterBleedRate = Math.max(score.meterBleedRate, 0.5);
  ledger(score, { channel: 'boss', label: 'Road Game', value: 'cap x2.0', detail: 'Meter ceiling forced low.' });
}

function applyPracticeBonus(score: MutableFourthPhaseScore, situation: SituationResult, context: FourthPhaseScoreContext) {
  const level = Math.min(3, context.practice[situation.key] ?? 0);
  if (level <= 0 || situation.bust) return;
  if (situation.utility) {
    score.fuel.draw += situation.key === 'fieldFlip' ? level : 0;
    score.fuel.money += situation.key === 'fieldFlip' ? level * 2 : 0;
    if (situation.key === 'blackout') {
      const before = score.meter;
      score.meter = applyMeterCharge(score.meter, level * 0.15, score.meterCap);
      score.meterCharged += Math.max(0, score.meter - before);
    }
    ledger(score, {
      channel: 'system',
      label: 'Practice Drill',
      value: `level ${level}`,
      detail: situation.key === 'fieldFlip' ? 'Special Teams fuel package.' : 'Crowd charge package.',
    });
    return;
  }

  const yardsBonus = level * 5;
  const executionBonus = level * 0.03;
  const bigPlayBonus = situation.cashesMeter ? level * 0.12 : level * 0.05;
  score.yards += yardsBonus;
  score.execution += executionBonus;
  score.bigPlay += bigPlayBonus;
  ledger(score, {
    channel: 'system',
    label: 'Practice Drill',
    value: `+${yardsBonus} Yards, +${executionBonus.toFixed(2)} Exec, +${bigPlayBonus.toFixed(2)} BP`,
    detail: `${situation.label} level ${level}.`,
  });
}

function applyBossAfterCards(score: MutableFourthPhaseScore, situation: SituationResult, cards: readonly FourthPhaseCard[], context: FourthPhaseScoreContext) {
  if (context.boss === 'stackedBox' && situation.counts.offense > 0) {
    score.yards *= 0.5;
    ledger(score, { channel: 'boss', label: 'Stacked Box', value: 'Yards x0.5', detail: 'Offense has to win ugly.' });
  }
  if (context.boss === 'noFlyZone' && situation.counts.offense > 2) {
    const extraOffense = cards.filter((card) => card.phase === 'offense').slice(2);
    const penalty = extraOffense.reduce((sum, card) => sum + cardValueForScore(card), 0);
    score.yards = Math.max(0, score.yards - penalty);
    ledger(score, { channel: 'boss', label: 'No-Fly Zone', value: `-${penalty} Yards`, detail: 'Only two Offense cards are clean.' });
  }
  if (context.boss === 'turnoverDrill' && situation.counts.defense > 0) {
    const penalty = situation.counts.defense * 0.12;
    score.execution -= penalty;
    ledger(score, { channel: 'boss', label: 'Turnover Drill', value: `-${penalty.toFixed(2)} Exec`, detail: 'Defensive scoring is less reliable.' });
  }
  if (context.boss === 'fieldPositionWar' && situation.counts.specialTeams > 0) {
    score.fuel = { draw: 0, money: 0, discount: 0 };
    ledger(score, { channel: 'boss', label: 'Field Position War', value: 'no ST fuel', detail: 'Special Teams payout is suppressed.' });
  }
  if (context.boss === 'adaptiveDc' && (context.repeatedSituations[situation.key] ?? 0) > 0) {
    score.yards = 0;
    score.execution = 0;
    score.bigPlay = 0;
    ledger(score, { channel: 'boss', label: 'Adaptive DC', value: 'repeat to 0', detail: `${situation.label} was already shown this drive.` });
  }
  if (context.boss === 'preventDefense' && score.bigPlay > 2.75) {
    score.bigPlay = 2.75;
    ledger(score, { channel: 'boss', label: 'Prevent Defense', value: 'BP cap x2.75', detail: 'Explosives are kept in front.' });
  }
}

function pointsFrom(score: MutableFourthPhaseScore): number {
  const yards = Math.max(0, score.yards);
  const execution = Math.max(0.1, 1 + score.execution);
  const bigPlay = Math.max(0, score.bigPlay);
  return Math.round(yards * execution * bigPlay);
}

export function applyFourthPhaseDrawStart(state: MeterState, context: Partial<FourthPhaseScoreContext> = {}): MeterState & { ledger: ScoreLedgerEntry[] } {
  const fullContext: FourthPhaseScoreContext = { ...EMPTY_CONTEXT, ...context, meter: state.meter, meterCap: state.meterCap };
  const situation = recognizeFourthPhaseSituation([]);
  const score = baseMutableScore(state.meter, state.meterCap);
  applyBossBeforeScore(score, fullContext);
  for (const joker of jokerDefs(fullContext.jokers)) {
    joker.hooks.onDrawStart?.(hookContext([], situation, fullContext, score));
  }
  return { meter: clampMeter(score.meter, score.meterCap), meterCap: score.meterCap, ledger: score.ledger };
}

export function scoreFourthPhasePlay(cards: readonly FourthPhaseCard[], partialContext: Partial<FourthPhaseScoreContext> = {}): FourthPhaseScoreResult {
  const context: FourthPhaseScoreContext = { ...EMPTY_CONTEXT, ...partialContext };
  const situation = recognizeFourthPhaseSituation(cards);
  const score = baseMutableScore(context.meter, context.meterCap);
  applyBossBeforeScore(score, context);

  score.yards = situation.yardsSeed;
  score.execution = situation.executionSeed;
  score.bigPlay = situation.bigPlaySeed;
  score.fuel = { ...situation.fuel };
  ledger(score, { channel: 'system', label: situation.label, value: 'detected', detail: situation.notes.join(' ') });
  ledger(score, { channel: 'yards', label: 'Yards seed', value: `${score.yards}`, detail: 'Base payload.' });
  ledger(score, { channel: 'execution', label: 'Execution seed', value: `+${score.execution.toFixed(2)}`, detail: 'Reliability floor.' });
  applyPracticeBonus(score, situation, context);

  for (const joker of jokerDefs(context.jokers)) {
    joker.hooks.onSituationDetected?.(hookContext(cards, situation, context, score));
  }

  let didCash = false;
  let cashesAtCardIndex: number | null = null;
  let meterAfterCash = score.meter;
  for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
    const card = cards[cardIndex];
    cardTraitScore(card, score, context);
    if (card.phase === 'crowd') {
      applyCharge(cards, situation, context, score, crowdChargeForRank(card.rank), 'crowdCard', card.roleName);
    } else if (card.edition === 'crowdFavorite') {
      applyCharge(cards, situation, context, score, 0.2, 'situation', `${card.roleName} crowd favorite`);
    }

    for (const joker of jokerDefs(context.jokers)) {
      joker.hooks.onCardScored?.(hookContext(cards, situation, context, score, { card, phase: card.phase, cardIndex }));
    }
    for (const joker of jokerDefs(context.jokers)) {
      joker.hooks.onPhaseScored?.(hookContext(cards, situation, context, score, { card, phase: card.phase, cardIndex }));
    }

    if (!didCash && situation.cashesMeter && card.phase === 'offense') {
      score.bigPlay *= score.meter;
      didCash = true;
      cashesAtCardIndex = cardIndex;
      meterAfterCash = score.meter;
      ledger(score, { channel: 'bigPlay', label: 'Crowd cash-in', value: `x${score.meter.toFixed(2)}`, detail: `${card.roleName} breaks it open.` });
    }
  }

  if (situation.meterBonus > 0) {
    applyCharge(cards, situation, context, score, situation.meterBonus, 'situation', `${situation.label} bonus`);
  }
  if (score.forceMeterToCap) {
    score.meter = score.meterCap;
    ledger(score, { channel: 'meter', label: 'Meter forced to cap', value: `x${score.meterCap.toFixed(2)}` });
  }

  for (const joker of jokerDefs(context.jokers)) {
    const retriggers = joker.hooks.retriggersFor?.(hookContext(cards, situation, context, score)) ?? [];
    for (const card of retriggers) {
      if (card.phase !== 'offense') continue;
      const yards = cardValueForScore(card);
      score.yards += yards;
      ledger(score, { channel: 'joker', label: `${joker.name} retrigger`, value: `+${yards} Yards`, detail: card.roleName });
    }
  }

  applyBossAfterCards(score, situation, cards, context);

  for (const joker of jokerDefs(context.jokers)) {
    joker.hooks.onPlayFinal?.(hookContext(cards, situation, context, score));
  }

  const points = pointsFrom(score);
  const isFinalPlay = (context.targetRemaining ?? Infinity) <= points;

  // Meter the play actually built, before the passive sustained tick. Used to tell a
  // "charging" play apart from one that walked in hot and ignored the meter.
  const meterBuilt = score.meter;
  if (!situation.bust) {
    applyCharge(cards, situation, context, score, SUSTAINED_TICK, 'sustained', 'Sustained tick');
  }
  const lowScoringAttempt = !situation.utility && points < LOW_SCORE_BLEED_THRESHOLD;
  const shouldBleed = score.alwaysBleed || situation.bust || lowScoringAttempt;
  const heldHotMeter =
    !didCash &&
    !situation.utility &&
    context.meter > BASE_METER + 0.01 &&
    meterBuilt <= context.meter + 0.001;
  if (shouldBleed && !score.preventBleed) {
    const before = score.meter;
    score.meter = applyMeterBleed(score.meter, score.meterBleedRate);
    ledger(score, {
      channel: 'meter',
      label: situation.bust ? 'Bust bleed' : score.alwaysBleed ? 'Forced bleed' : 'Low-score bleed',
      value: `x${before.toFixed(2)} to x${score.meter.toFixed(2)}`,
    });
  } else if (heldHotMeter && !score.preventBleed) {
    // Walked in with a charged meter and scored a play that neither cashed nor built
    // it — holding costs a little. Charging plays and cashing plays are exempt, so
    // this only bites when you ignore a hot meter.
    const before = score.meter;
    score.meter = applyMeterBleed(score.meter, HOLD_BLEED_RATE);
    ledger(score, {
      channel: 'meter',
      label: 'Hold cost',
      value: `x${before.toFixed(2)} to x${score.meter.toFixed(2)}`,
      detail: 'Hot meter left uncashed.',
    });
  }

  return {
    situation,
    points,
    yards: Math.round(score.yards),
    execution: Number(score.execution.toFixed(3)),
    bigPlay: Number(score.bigPlay.toFixed(3)),
    meterBefore: context.meter,
    meterAfterCash,
    meterAfter: clampMeter(score.meter, score.meterCap),
    meterCap: score.meterCap,
    meterCharged: Number(score.meterCharged.toFixed(3)),
    didCash,
    cashesAtCardIndex,
    fuel: score.fuel,
    bust: situation.bust,
    isFinalPlay,
    ledger: score.ledger,
  };
}
