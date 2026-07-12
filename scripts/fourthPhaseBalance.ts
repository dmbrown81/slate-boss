// Fourth Phase Lab — Monte Carlo balance harness.
//
// Run: `npm run balance:fourthphase -- 3000`

import { mulberry32, stringSeed, type RNG } from '../src/lib/rng';
import {
  BASE_METER,
  BASE_METER_CAP,
  FOURTH_PHASE_DECK_MAX_SIZE,
  FOURTH_PHASE_DISCOUNT_TOKEN_CAP,
  FOURTH_PHASE_HAND_SIZE,
  FOURTH_PHASE_JOKER_LIMIT,
  FOURTH_PHASE_MAX_PLAYS_PER_DRIVE,
  FOURTH_PHASE_STAKES,
  FOURTH_PHASE_TEAMS,
  FOURTH_PHASE_WAR_ROOM_BUY_LIMIT,
  FOURTH_PHASE_WAR_ROOM_REROLL_COST,
  activeBossForDrive,
  applyFourthPhaseDrawStart,
  buildFourthPhaseDrivePile,
  coachPickForWarRoom,
  createFourthPhaseRun,
  discountedOfferCost,
  drawFourthPhaseCards,
  fourthPhaseStake,
  generateFourthPhaseWarRoomOffers,
  halftimeCounterFor,
  jokerDefinition,
  meterTightness,
  scoreFourthPhasePlay,
  type ScoreLedgerEntry,
  type FourthPhaseCard,
  type FourthPhaseJokerId,
  type FourthPhaseJokerState,
  type FourthPhasePracticeBook,
  type FourthPhaseScoreResult,
  type FourthPhaseTeamKey,
  type FourthPhaseWarRoomOffer,
  type Phase,
  type SituationKey,
} from '../src/lib/fourthPhase';

// Pilot policies:
//   synergy — skilled player: reorders for cash-ins, drafts by fit.
//   random  — noise floor: random legal series, random shopping.
//   none    — skilled play, never drafts (measures War Room necessity).
//   greedy  — cold-player proxy: reads the preview and plays the highest
//             number every series, never reorders for cash-ins, and buys the
//             COACH PICK blindly. This is what a day-one human actually does.
//   mono    — degenerate-rhythm probe: a skilled pilot that only ever hunts
//             Crowd Surge -> Shot Play. If it wins near synergy, the other
//             eight situations are decoration.
type Policy = 'synergy' | 'random' | 'none' | 'greedy' | 'mono';

// A skilled pilot reorders a play so Crowd charges land before the Offense card cashes the meter.
// Crowd first, then Defense/Special Teams, then Offense last — this exercises the drag-order mechanic
// the UI exposes, so the harness measures the meter loop instead of ignoring it.
const PHASE_CASH_ORDER: Record<Phase, number> = { crowd: 0, defense: 1, specialTeams: 2, offense: 3 };

function orderForCash(cards: readonly FourthPhaseCard[]): FourthPhaseCard[] {
  return [...cards].sort((a, b) => PHASE_CASH_ORDER[a.phase] - PHASE_CASH_ORDER[b.phase]);
}

interface SimResult {
  won: boolean;
  score: number;
  failDrive: number;
  endingMoney: number;
  peakScore: number;
  peakMeter: number;
  tightPlays: number;
  plays: number;
  comboFires: number;
  comboPlays: number;
  comboClears: number;
  /** Number of coached-up reserve cards in the persistent game plan. */
  mutations: number;
  team: FourthPhaseTeamKey;
}

interface Candidate {
  ids: number[];
  result: FourthPhaseScoreResult;
  objective: number;
}

function comboEntries(result: FourthPhaseScoreResult): ScoreLedgerEntry[] {
  return result.ledger.filter((entry) => entry.channel === 'combo');
}

const sampleCount = Number(process.argv[2] ?? 300);
const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];

function percentile(values: readonly number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index];
}

function median(values: readonly number[]): number {
  return percentile(values, 0.5);
}

function combos(length: number, limit: number): number[][] {
  const out: number[][] = [];
  const visit = (start: number, current: number[]) => {
    if (current.length) out.push([...current]);
    if (current.length === limit) return;
    for (let index = start; index < length; index += 1) {
      current.push(index);
      visit(index + 1, current);
      current.pop();
    }
  };
  visit(0, []);
  return out;
}

function drawToHand(
  hand: FourthPhaseCard[],
  drawPile: FourthPhaseCard[],
  discardPile: FourthPhaseCard[],
  count: number,
  rng: RNG,
  handSize = FOURTH_PHASE_HAND_SIZE,
) {
  const draw = drawFourthPhaseCards(drawPile, discardPile, count, rng);
  return {
    hand: [...hand, ...draw.drawn].slice(0, handSize + 2),
    drawPile: draw.deck,
    discardPile: draw.discard,
  };
}

function candidateObjective(result: FourthPhaseScoreResult, targetRemaining: number, policy: Policy): number {
  if (policy === 'random' || policy === 'greedy') return result.points;
  const willClear = result.points >= targetRemaining;
  const meterGain = Math.max(0, result.meterAfter - result.meterBefore);
  const fuelValue = result.fuel.draw * 16 + result.fuel.money * 6 + result.fuel.discount * 8;
  const cashValue = result.didCash ? result.points * 0.12 : 0;
  const chargeSetup = !willClear && !result.didCash ? meterGain * 22 : 0;
  const bustPenalty = result.bust ? 80 : 0;
  const overkillPenalty = willClear ? Math.max(0, result.points - targetRemaining) * 0.08 : 0;
  return result.points + fuelValue + cashValue + chargeSetup - bustPenalty - overkillPenalty;
}

function bestCandidate(
  hand: readonly FourthPhaseCard[],
  context: Parameters<typeof scoreFourthPhasePlay>[1],
  targetRemaining: number,
  policy: Policy,
  rng: RNG,
): Candidate | null {
  const options = combos(hand.length, 5).map((ids) => {
    const selected = ids.map((index) => hand[index]);
    // random taps in whatever order; greedy taps in hand order and never
    // discovers the reorder trick — that gap vs synergy IS the ordering skill.
    const played = policy === 'random' || policy === 'greedy' ? selected : orderForCash(selected);
    const result = scoreFourthPhasePlay(played, context);
    return { ids, result, objective: candidateObjective(result, targetRemaining, policy) };
  });
  if (!options.length) return null;
  if (policy === 'random') return options[Math.floor(rng() * options.length)];
  if (policy === 'mono') {
    const monoOptions = options.filter((option) => option.result.situation.key === 'houseCall' || option.result.situation.key === 'blackout');
    if (monoOptions.length) {
      monoOptions.sort((a, b) => b.objective - a.objective || b.result.points - a.result.points);
      return monoOptions[0];
    }
    // No Surge/Shot shape in hand: a spammer redraws hunting Crowd while they
    // can (signalled by returning null), then settles for the best fallback.
    if (context.discardsLeft > 0) return null;
  }
  options.sort((a, b) => b.objective - a.objective || b.result.points - a.result.points);
  return options[0];
}

const JOKER_BASE_VALUE: Record<FourthPhaseJokerId, number> = {
  twelfthMan: 42,
  homeCooking: 24,
  sustainedDrive: 45,
  silentCount: 30,
  pickSixSpecialist: 34,
  theGenius: 48,
  fieldGeneral: 40,
  twoMinuteDrill: 36,
  roadWarriors: 28,
  bandwagon: 30,
  decibelRecord: 44,
  hurryUp: 34,
  leadBlocker: 40,
  doubleMove: 44,
  hiddenYards: 38,
  studentSection: 35,
  filmStudy: 48,
  redZonePackage: 50,
  walkOnProgram: 34,
  checkdownMerchant: 22,
  bendDontBreak: 24,
  coordinatorTree: 50,
  closer: 60,
  pressBoxAngle: 48,
  returnAce: 36,
  homeRunThreat: 52,
  scriptedSeries: 42,
  blackoutCurtain: 40,
  phaseCollector: 54,
};

function jokerValue(joker: FourthPhaseJokerState, team: FourthPhaseTeamKey, bossDriveSoon: boolean): number {
  let value = JOKER_BASE_VALUE[joker.id];
  if (team === 'balanced' && (joker.id === 'coordinatorTree' || joker.id === 'phaseCollector')) value += 20;
  if (team === 'balanced' && joker.id === 'filmStudy') value += 14;
  if (team === 'loudHouse' && (joker.id === 'twelfthMan' || joker.id === 'decibelRecord')) value += 22;
  if (team === 'loudHouse' && (joker.id === 'studentSection' || joker.id === 'blackoutCurtain')) value += 18;
  if (team === 'loudHouse' && joker.id === 'homeRunThreat') value += 14;
  if (team === 'specialTeamsChaos' && (joker.id === 'fieldGeneral' || joker.id === 'returnAce')) value += 22;
  if (team === 'specialTeamsChaos' && joker.id === 'hiddenYards') value += 18;
  if (team === 'blackAndBlue' && (joker.id === 'pickSixSpecialist' || joker.id === 'silentCount')) value += 18;
  if (team === 'blackAndBlue' && (joker.id === 'pressBoxAngle' || joker.id === 'bendDontBreak')) value += 16;
  if (team === 'blackAndBlue' && joker.id === 'leadBlocker') value += 10;
  if (team === 'airRaid' && (joker.id === 'hurryUp' || joker.id === 'twoMinuteDrill')) value += 18;
  if (team === 'airRaid' && (joker.id === 'doubleMove' || joker.id === 'homeRunThreat')) value += 18;
  if (team === 'smashmouth' && (joker.id === 'silentCount' || joker.id === 'homeCooking')) value += 16;
  if (team === 'smashmouth' && joker.id === 'walkOnProgram') value += 20;
  if (team === 'smashmouth' && joker.id === 'leadBlocker') value += 16;
  if (team === 'smashmouth' && joker.id === 'checkdownMerchant') value += 12;
  if (bossDriveSoon && joker.id === 'roadWarriors') value += 30;
  if (bossDriveSoon && joker.id === 'closer') value += 24;
  if (bossDriveSoon && joker.id === 'pressBoxAngle') value += 16;
  if (bossDriveSoon && joker.id === 'redZonePackage') value += 10;
  if (bossDriveSoon && joker.id === 'scriptedSeries') value += 8;
  if (jokerDefinition(joker).rarity === 'legendary') value += 6;
  return value;
}

const PRACTICE_BASE_VALUE: Record<SituationKey, number> = {
  checkdown: 18,
  drive: 48,
  stand: 34,
  fieldFlip: 52,
  blackout: 42,
  momentumShift: 50,
  houseCall: 58,
  pickSix: 44,
  complementaryFootball: 56,
  bustedPlay: 0,
};

function practiceValue(situation: SituationKey, practice: FourthPhasePracticeBook, team: FourthPhaseTeamKey, bossDriveSoon: boolean): number {
  let value = PRACTICE_BASE_VALUE[situation] - (practice[situation] ?? 0) * 8;
  if (team === 'loudHouse' && (situation === 'houseCall' || situation === 'blackout')) value += 22;
  if (team === 'specialTeamsChaos' && situation === 'fieldFlip') value += 26;
  if (team === 'blackAndBlue' && (situation === 'pickSix' || situation === 'stand')) value += 18;
  if (team === 'balanced' && (situation === 'complementaryFootball' || situation === 'momentumShift')) value += 18;
  if (team === 'airRaid' && situation === 'houseCall') value += 16;
  if (team === 'smashmouth' && (situation === 'drive' || situation === 'fieldFlip')) value += 14;
  if (bossDriveSoon && ['houseCall', 'drive', 'fieldFlip', 'complementaryFootball'].includes(situation)) value += 10;
  return value;
}

function offerValue(offer: FourthPhaseWarRoomOffer, team: FourthPhaseTeamKey, bossDriveSoon: boolean, practice: FourthPhasePracticeBook): number {
  if (offer.kind === 'card' && offer.card) return cardValue(offer.card, team);
  if (offer.kind === 'joker' && offer.joker) return jokerValue(offer.joker, team, bossDriveSoon);
  if (offer.kind === 'practice' && offer.situation) return practiceValue(offer.situation, practice, team, bossDriveSoon);
  return 0;
}

const TEAM_PHASE_VALUE: Record<FourthPhaseTeamKey, Partial<Record<Phase, number>>> = {
  balanced: { offense: 8, defense: 8, specialTeams: 8, crowd: 8 },
  airRaid: { offense: 18, crowd: 12 },
  smashmouth: { offense: 18, specialTeams: 10, defense: 8 },
  blackAndBlue: { defense: 20, offense: 8 },
  loudHouse: { crowd: 20, offense: 12 },
  specialTeamsChaos: { specialTeams: 22, crowd: 6 },
};

function cardValue(card: FourthPhaseCard, team: FourthPhaseTeamKey): number {
  let value = 22 + card.value * 2.5 + (TEAM_PHASE_VALUE[team][card.phase] ?? 0);
  if (card.installed) value += 40;
  if (card.tags.includes('kind:shot') || card.tags.includes('kind:takeaway')) value += 7;
  if (card.tags.includes('kind:playAction') || card.tags.includes('kind:fieldFlip')) value += 6;
  if (card.tags.includes('kind:run') || card.tags.includes('kind:quickGame')) value += team === 'smashmouth' || team === 'airRaid' ? 5 : 2;
  return value;
}

function addCard(deck: FourthPhaseCard[], picked: FourthPhaseCard, team: FourthPhaseTeamKey): FourthPhaseCard[] {
  if (deck.some((card) => card.id === picked.id)) return deck;
  if (deck.length < FOURTH_PHASE_DECK_MAX_SIZE) return [...deck, picked];
  const values = deck.map((card) => cardValue(card, team));
  const weakestValue = Math.min(...values);
  const weakestIndex = values.indexOf(weakestValue);
  if (cardValue(picked, team) <= weakestValue + 2) return deck;
  return deck.map((card, index) => (index === weakestIndex ? picked : card));
}

function addJoker(jokers: FourthPhaseJokerState[], picked: FourthPhaseJokerState, team: FourthPhaseTeamKey, bossDriveSoon: boolean): FourthPhaseJokerState[] {
  if (jokers.length < FOURTH_PHASE_JOKER_LIMIT) return [...jokers, picked];
  const values = jokers.map((joker) => jokerValue(joker, team, bossDriveSoon));
  const weakestValue = Math.min(...values);
  const weakestIndex = values.indexOf(weakestValue);
  if (jokerValue(picked, team, bossDriveSoon) <= weakestValue + 4) return jokers;
  return jokers.map((joker, index) => (index === weakestIndex ? picked : joker));
}

function applyOffer(
  offer: FourthPhaseWarRoomOffer,
  deck: FourthPhaseCard[],
  jokers: FourthPhaseJokerState[],
  practice: FourthPhasePracticeBook,
  team: FourthPhaseTeamKey,
  bossDriveSoon: boolean,
): { deck: FourthPhaseCard[]; jokers: FourthPhaseJokerState[]; practice: FourthPhasePracticeBook } {
  if (offer.kind === 'card' && offer.card) {
    return { deck: addCard(deck, offer.card, team), jokers, practice };
  }
  if (offer.kind === 'joker' && offer.joker) {
    return { deck, jokers: addJoker(jokers, offer.joker, team, bossDriveSoon), practice };
  }
  if (offer.kind === 'practice' && offer.situation) {
    return {
      deck,
      jokers,
      practice: { ...practice, [offer.situation]: Math.min(3, (practice[offer.situation] ?? 0) + 1) },
    };
  }
  return { deck, jokers, practice };
}

function runWarRoom(
  deck: FourthPhaseCard[],
  jokers: FourthPhaseJokerState[],
  practice: FourthPhasePracticeBook,
  money: number,
  discounts: number,
  seed: number,
  driveIndex: number,
  team: FourthPhaseTeamKey,
  boss: ReturnType<typeof activeBossForDrive>,
  policy: Policy,
  rng: RNG,
): { deck: FourthPhaseCard[]; jokers: FourthPhaseJokerState[]; practice: FourthPhasePracticeBook; money: number; discounts: number } {
  if (policy === 'none') return { deck, jokers, practice, money: money + 3, discounts };
  let nextDeck = deck;
  let nextJokers = jokers;
  let nextPractice = practice;
  let nextMoney = money;
  let nextDiscounts = discounts;
  let buys = 0;
  let rerolls = 0;
  const bossDriveSoon = driveIndex >= 1 || boss !== 'none';
  let offers = generateFourthPhaseWarRoomOffers(nextJokers, seed, driveIndex, team, boss, rerolls, nextPractice, boss, nextDeck);

  // Same token math the Lab UI uses (discountedOfferCost) — the harness must buy
  // at the prices a real player would see.
  const effectiveCost = (cost: number) => discountedOfferCost(cost, nextDiscounts).cost;

  // A cold player trusts the sticker: buy the COACH PICK if affordable, once,
  // and never reroll. No fit evaluation — that's the whole point of greedy.
  if (policy === 'greedy') {
    const pick = coachPickForWarRoom(offers, team, boss);
    const offer = pick ? offers.find((candidate) => candidate.id === pick.id) : undefined;
    if (offer && effectiveCost(offer.cost) <= nextMoney) {
      const applied = applyOffer(offer, nextDeck, nextJokers, nextPractice, team, bossDriveSoon);
      const priced = discountedOfferCost(offer.cost, nextDiscounts);
      return { deck: applied.deck, jokers: applied.jokers, practice: applied.practice, money: nextMoney - priced.cost, discounts: nextDiscounts - priced.used };
    }
    return { deck: nextDeck, jokers: nextJokers, practice: nextPractice, money: nextMoney + 3, discounts: nextDiscounts };
  }

  while (buys < FOURTH_PHASE_WAR_ROOM_BUY_LIMIT) {
    const affordable = offers.filter((offer) => effectiveCost(offer.cost) <= nextMoney);
    if (!affordable.length) break;

    if (policy === 'random') {
      if (rng() < (buys === 0 ? 0.28 : 0.48)) break;
      const offer = affordable[Math.floor(rng() * affordable.length)];
      const applied = applyOffer(offer, nextDeck, nextJokers, nextPractice, team, bossDriveSoon);
      const priced = discountedOfferCost(offer.cost, nextDiscounts);
      nextDeck = applied.deck;
      nextJokers = applied.jokers;
      nextPractice = applied.practice;
      nextMoney -= priced.cost;
      nextDiscounts -= priced.used;
      offers = offers.filter((candidate) => candidate.id !== offer.id);
      buys += 1;
      continue;
    }

    const ranked = [...affordable].sort((a, b) => offerValue(b, team, bossDriveSoon, nextPractice) - offerValue(a, team, bossDriveSoon, nextPractice));
    const best = ranked[0];
    const bestValue = offerValue(best, team, bossDriveSoon, nextPractice);
    if (bestValue < 42 && rerolls < 1 && nextMoney >= FOURTH_PHASE_WAR_ROOM_REROLL_COST + Math.min(...offers.map((offer) => effectiveCost(offer.cost)))) {
      nextMoney -= FOURTH_PHASE_WAR_ROOM_REROLL_COST;
      rerolls += 1;
      offers = generateFourthPhaseWarRoomOffers(nextJokers, seed, driveIndex, team, boss, rerolls, nextPractice, boss, nextDeck);
      continue;
    }
    if (bestValue < 30) break;
    const applied = applyOffer(best, nextDeck, nextJokers, nextPractice, team, bossDriveSoon);
    const priced = discountedOfferCost(best.cost, nextDiscounts);
    nextDeck = applied.deck;
    nextJokers = applied.jokers;
    nextPractice = applied.practice;
    nextMoney -= priced.cost;
    nextDiscounts -= priced.used;
    offers = offers.filter((candidate) => candidate.id !== best.id);
    buys += 1;
  }

  if (buys === 0) nextMoney += 3;
  return { deck: nextDeck, jokers: nextJokers, practice: nextPractice, money: nextMoney, discounts: nextDiscounts };
}

function simulateGame(team: FourthPhaseTeamKey, seed: number, policy: Policy, stakeLevel = 1): SimResult {
  const run = createFourthPhaseRun(team, seed);
  const stake = fourthPhaseStake(stakeLevel);
  // Same scaling the Lab applies when a run starts at this stake.
  const targets = run.targets.map((target) => Math.round(target * stake.targetScale));
  // Stake 1 keeps the historical rng key so gate numbers stay reproducible.
  const rngKey = stakeLevel === 1 ? `fourth-phase-sim:${seed}:${team}:${policy}` : `fourth-phase-sim:${seed}:${team}:${policy}:s${stakeLevel}`;
  const rng = mulberry32(stringSeed(rngKey));
  let activeDeck = [...run.deck];
  let drawPile = buildFourthPhaseDrivePile(activeDeck, seed, 0);
  let discardPile: FourthPhaseCard[] = [];
  let handState = drawToHand([], drawPile, discardPile, stake.handSize, rng, stake.handSize);
  let hand = handState.hand;
  drawPile = handState.drawPile;
  discardPile = handState.discardPile;
  let jokers = [...run.jokers];
  let practice = { ...run.practice };
  let money = stake.startMoney;
  let discountTokens = 0;
  let meter = run.meter.meter;
  let meterCap = run.meter.meterCap;
  let totalScore = 0;
  let peakScore = 0;
  let peakMeter = meter;
  let tightPlays = 0;
  let plays = 0;
  let comboFires = 0;
  let comboPlays = 0;
  let comboClears = 0;

  // Mirrors the Lab's halftime adjustment: on a bossless drive 2 the defense
  // counters the situation the pilot leaned on in drive 1.
  let prevDriveRepeats: Partial<Record<SituationKey, number>> = {};
  for (let driveIndex = 0; driveIndex < targets.length; driveIndex += 1) {
    const boss = activeBossForDrive(run, driveIndex, stake.bossFromDrive);
    const halftimeCounter = driveIndex === 1 && boss === 'none' ? halftimeCounterFor(prevDriveRepeats) ?? undefined : undefined;
    if (driveIndex > 0) {
      drawPile = buildFourthPhaseDrivePile(activeDeck, seed, driveIndex);
      discardPile = [];
      handState = drawToHand([], drawPile, discardPile, stake.handSize, rng, stake.handSize);
      hand = handState.hand;
      drawPile = handState.drawPile;
      discardPile = handState.discardPile;
      const drawMeter = applyFourthPhaseDrawStart({ meter: BASE_METER, meterCap: Math.max(BASE_METER_CAP, meterCap) }, { jokers, practice, wins: driveIndex, boss });
      meter = drawMeter.meter;
      meterCap = drawMeter.meterCap;
    }

    let driveScore = 0;
    let discardsLeft = stake.discardsPerDrive;
    let cardsPlayedThisDrive = 0;
    const repeatedSituations: Partial<Record<SituationKey, number>> = {};
    let guard = 0;

    while (driveScore < targets[driveIndex] && cardsPlayedThisDrive < FOURTH_PHASE_MAX_PLAYS_PER_DRIVE && guard < 24) {
      guard += 1;
      const targetRemaining = targets[driveIndex] - driveScore;
      const context = {
        meter,
        meterCap,
        jokers,
        practice,
        discardsLeft,
        cardsPlayedThisDrive,
        driveIndex,
        targetRemaining,
        wins: driveIndex,
        boss,
        repeatedSituations,
        halftimeCounter,
      };
      const candidate = bestCandidate(hand, context, targetRemaining, policy, rng);
      const weakAttempt = candidate && candidate.result.points < 14 && !candidate.result.situation.utility;
      if ((!candidate || weakAttempt) && discardsLeft > 0) {
        const redraw = drawFourthPhaseCards(drawPile, [...discardPile, ...hand], stake.handSize, rng);
        hand = redraw.drawn;
        drawPile = redraw.deck;
        discardPile = redraw.discard;
        discardsLeft -= 1;
        continue;
      }
      if (!candidate) break;

      const picked = new Set(candidate.ids);
      const playedCards = candidate.ids.map((index) => hand[index]);
      hand = hand.filter((_, index) => !picked.has(index));
      discardPile = [...discardPile, ...playedCards];
      const refill = drawToHand(hand, drawPile, discardPile, Math.max(0, stake.handSize - hand.length) + candidate.result.fuel.draw, rng, stake.handSize);
      hand = refill.hand;
      drawPile = refill.drawPile;
      discardPile = refill.discardPile;

      driveScore += candidate.result.points;
      totalScore += candidate.result.points;
      peakScore = Math.max(peakScore, candidate.result.points);
      meter = candidate.result.meterAfter;
      meterCap = candidate.result.meterCap;
      peakMeter = Math.max(peakMeter, meter);
      money = Math.max(0, money + candidate.result.fuel.money);
      discountTokens = Math.min(FOURTH_PHASE_DISCOUNT_TOKEN_CAP, discountTokens + candidate.result.fuel.discount);
      repeatedSituations[candidate.result.situation.key] = (repeatedSituations[candidate.result.situation.key] ?? 0) + 1;
      cardsPlayedThisDrive += 1;
      plays += 1;
      const combos = comboEntries(candidate.result).length;
      comboFires += combos;
      if (combos > 0) {
        comboPlays += 1;
        if (candidate.result.points >= targetRemaining) comboClears += 1;
      }
      if (meterTightness(meter, meterCap) >= 0.9) tightPlays += 1;
    }

    if (driveScore < targets[driveIndex]) {
      return { won: false, score: totalScore, failDrive: driveIndex + 1, endingMoney: money, peakScore, peakMeter, tightPlays, plays, comboFires, comboPlays, comboClears, mutations: activeDeck.filter((card) => card.installed).length, team };
    }
    prevDriveRepeats = repeatedSituations;

    money += 5 + driveIndex * 2;
    if (driveIndex < targets.length - 1) {
      const drafted = runWarRoom(activeDeck, jokers, practice, money, discountTokens, seed, driveIndex, team, activeBossForDrive(run, driveIndex + 1, stake.bossFromDrive), policy, rng);
      activeDeck = drafted.deck;
      jokers = drafted.jokers;
      practice = drafted.practice;
      money = drafted.money;
      discountTokens = drafted.discounts;
    }
  }

  return { won: true, score: totalScore, failDrive: 0, endingMoney: money, peakScore, peakMeter, tightPlays, plays, comboFires, comboPlays, comboClears, mutations: activeDeck.filter((card) => card.installed).length, team };
}

function summarize(label: string, results: readonly SimResult[]) {
  const wins = results.filter((result) => result.won).length;
  const scores = results.map((result) => result.score);
  const endingMoney = results.map((result) => result.endingMoney);
  const tightPlays = results.reduce((sum, result) => sum + result.tightPlays, 0);
  const plays = results.reduce((sum, result) => sum + result.plays, 0);
  const comboFires = results.reduce((sum, result) => sum + result.comboFires, 0);
  const comboPlays = results.reduce((sum, result) => sum + result.comboPlays, 0);
  const comboClears = results.reduce((sum, result) => sum + result.comboClears, 0);
  console.log(`${label.padEnd(9)} win=${((wins / results.length) * 100).toFixed(1)}% fail=${(((results.length - wins) / results.length) * 100).toFixed(1)}% median=${median(scores).toFixed(0)} p90=${percentile(scores, 0.9).toFixed(0)} p99=${percentile(scores, 0.99).toFixed(0)} peak=${percentile(results.map((result) => result.peakScore), 0.99).toFixed(0)} money_med=${median(endingMoney).toFixed(0)} installs_med=${median(results.map((result) => result.mutations)).toFixed(0)} tight=${plays ? ((tightPlays / plays) * 100).toFixed(1) : '0.0'}% combo_plays=${plays ? ((comboPlays / plays) * 100).toFixed(1) : '0.0'}% combo_clears=${plays ? ((comboClears / plays) * 100).toFixed(1) : '0.0'}% combo_fires=${comboFires}`);
}

console.log(`Fourth Phase balance harness -- ${sampleCount} simulated lab games per policy`);
console.log('Abstract-target skeleton: three drives, boss on drive 3, local deterministic RNG.\n');

const byPolicy: Record<Policy, SimResult[]> = { synergy: [], random: [], none: [], greedy: [], mono: [] };
for (let index = 0; index < sampleCount; index += 1) {
  const team = teamKeys[index % teamKeys.length];
  const seed = stringSeed(`fourth-phase-balance:${index}:${team}`);
  byPolicy.synergy.push(simulateGame(team, seed, 'synergy'));
  byPolicy.random.push(simulateGame(team, seed, 'random'));
  byPolicy.none.push(simulateGame(team, seed, 'none'));
  byPolicy.greedy.push(simulateGame(team, seed, 'greedy'));
  byPolicy.mono.push(simulateGame(team, seed, 'mono'));
}

summarize('synergy', byPolicy.synergy);
summarize('random', byPolicy.random);
summarize('noDraft', byPolicy.none);
summarize('greedy', byPolicy.greedy);
summarize('mono', byPolicy.mono);

const synergyWin = byPolicy.synergy.filter((result) => result.won).length / byPolicy.synergy.length;
const randomWin = byPolicy.random.filter((result) => result.won).length / byPolicy.random.length;
const noneWin = byPolicy.none.filter((result) => result.won).length / byPolicy.none.length;
const buildGap = synergyWin - randomWin;
const rewardWinGap = synergyWin - noneWin;
const rewardScoreGap = median(byPolicy.synergy.map((result) => result.score)) - median(byPolicy.none.map((result) => result.score));
const totalTight = byPolicy.synergy.reduce((sum, result) => sum + result.tightPlays, 0);
const totalPlays = byPolicy.synergy.reduce((sum, result) => sum + result.plays, 0);
const tightRate = totalPlays ? totalTight / totalPlays : 0;
const peakMeterP99 = percentile(byPolicy.synergy.map((result) => result.peakMeter), 0.99);

console.log('\nTeam viability (synergy pilot):');
let minTeamWin = 1;
let maxTeamWin = 0;
const teamWinRates: Partial<Record<FourthPhaseTeamKey, number>> = {};
for (const team of teamKeys) {
  const teamResults = byPolicy.synergy.filter((result) => result.team === team);
  const winRate = teamResults.filter((result) => result.won).length / teamResults.length;
  teamWinRates[team] = winRate;
  minTeamWin = Math.min(minTeamWin, winRate);
  maxTeamWin = Math.max(maxTeamWin, winRate);
  console.log(`  ${FOURTH_PHASE_TEAMS[team].shortName.padEnd(12)} win=${(winRate * 100).toFixed(1)}% median=${median(teamResults.map((result) => result.score)).toFixed(0)} money=${median(teamResults.map((result) => result.endingMoney)).toFixed(0)}`);
}
const teamSpread = maxTeamWin - minTeamWin;
const loudHouseWin = teamWinRates.loudHouse ?? 0;

console.log('\nDraft impact:');
console.log(`  reward WIN gap -- +${(rewardWinGap * 100).toFixed(1)} win pts (+${rewardScoreGap.toFixed(0)} median score) vs no-draft`);

console.log('\nGates:');
const gates = [
  { label: 'synergy win in 75-85%', pass: synergyWin >= 0.75 && synergyWin <= 0.85, detail: `${(synergyWin * 100).toFixed(1)}%` },
  { label: 'no-draft win in 55-65%', pass: noneWin >= 0.55 && noneWin <= 0.65, detail: `${(noneWin * 100).toFixed(1)}%` },
  { label: 'draft gap >= 15 pts', pass: rewardWinGap >= 0.15, detail: `+${(rewardWinGap * 100).toFixed(1)} pts vs no-draft` },
  { label: 'card mutations are core (median >= 2)', pass: median(byPolicy.synergy.map((result) => result.mutations)) >= 2, detail: `${median(byPolicy.synergy.map((result) => result.mutations)).toFixed(0)} median coached-up installs` },
  { label: 'build gap >= 8 pts', pass: buildGap >= 0.08, detail: `${(buildGap * 100).toFixed(1)} pts vs random` },
  { label: 'per-team spread <= 6 pts', pass: teamSpread <= 0.06, detail: `${(teamSpread * 100).toFixed(1)} pts` },
  { label: 'Loud House not bottom team', pass: loudHouseWin > minTeamWin, detail: `Loud House ${(loudHouseWin * 100).toFixed(1)}%, floor ${(minTeamWin * 100).toFixed(1)}%` },
  { label: 'meter ceiling tightness <= 35%', pass: tightRate <= 0.35, detail: `${(tightRate * 100).toFixed(1)}%, p99 peak x${peakMeterP99.toFixed(2)}` },
];

let failures = 0;
for (const gate of gates) {
  if (!gate.pass) failures += 1;
  console.log(`  ${gate.pass ? 'OK' : 'FAIL'} ${gate.label} -- ${gate.detail}`);
}

// ---------------------------------------------------------------------------
// Advisory sections. These measure the open review questions — cold-player
// fairness, degenerate-rhythm dominance, and the unproven stake ladder — and
// print 🟡 warnings instead of failing, so CI keeps gating on the proven
// stake-1 contract while the data accumulates.
// ---------------------------------------------------------------------------

const greedyWin = byPolicy.greedy.filter((result) => result.won).length / byPolicy.greedy.length;
const monoWin = byPolicy.mono.filter((result) => result.won).length / byPolicy.mono.length;

function advisory(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK' : '\u{1F7E1} ADVISORY'} ${label} -- ${detail}`);
}

console.log('\nAdvisories (informational, never fail the run):');
advisory(
  'cold-player proxy (greedy) win >= 20% at Rookie',
  greedyWin >= 0.2,
  `${(greedyWin * 100).toFixed(1)}% — below 20% means first runs are a woodchipper regardless of tutorial quality`,
);
advisory(
  'mono rhythm (Surge->Shot spam) trails synergy by >= 5 win pts',
  synergyWin - monoWin >= 0.05,
  `mono ${(monoWin * 100).toFixed(1)}% vs synergy ${(synergyWin * 100).toFixed(1)}% — inside 5 pts the other eight situations are decorative`,
);

// Stake ladder: smaller samples per stake — this is a shape check (is the
// ladder ordered and is Legend a game at all), not a tuning gate yet.
const ladderSamples = Math.max(300, Math.floor(sampleCount / 3));
console.log(`\nStake ladder (${ladderSamples} samples per stake per pilot):`);
console.log('  stake      synergy   greedy    noDraft   synergy_median');
const ladderSynergyWins: number[] = [synergyWin];
let legendSynergyWin = 0;
let proNoDraftWin = noneWin;
for (const stakeProfile of FOURTH_PHASE_STAKES) {
  if (stakeProfile.level === 1) {
    console.log(`  ${stakeProfile.shortName.padEnd(9)} ${(synergyWin * 100).toFixed(1).padStart(6)}%  ${(greedyWin * 100).toFixed(1).padStart(6)}%  ${(noneWin * 100).toFixed(1).padStart(6)}%  ${median(byPolicy.synergy.map((result) => result.score)).toFixed(0).padStart(8)}  (full-sample gates above)`);
    continue;
  }
  const stakeResults: Record<'synergy' | 'greedy' | 'none', SimResult[]> = { synergy: [], greedy: [], none: [] };
  for (let index = 0; index < ladderSamples; index += 1) {
    const team = teamKeys[index % teamKeys.length];
    const seed = stringSeed(`fourth-phase-balance:${index}:${team}`);
    stakeResults.synergy.push(simulateGame(team, seed, 'synergy', stakeProfile.level));
    stakeResults.greedy.push(simulateGame(team, seed, 'greedy', stakeProfile.level));
    stakeResults.none.push(simulateGame(team, seed, 'none', stakeProfile.level));
  }
  const win = (results: SimResult[]) => results.filter((result) => result.won).length / results.length;
  const stakeSynergyWin = win(stakeResults.synergy);
  ladderSynergyWins.push(stakeSynergyWin);
  if (stakeProfile.level === FOURTH_PHASE_STAKES.length) legendSynergyWin = stakeSynergyWin;
  if (stakeProfile.level === 2) proNoDraftWin = win(stakeResults.none);
  console.log(`  ${stakeProfile.shortName.padEnd(9)} ${(stakeSynergyWin * 100).toFixed(1).padStart(6)}%  ${(win(stakeResults.greedy) * 100).toFixed(1).padStart(6)}%  ${(win(stakeResults.none) * 100).toFixed(1).padStart(6)}%  ${median(stakeResults.synergy.map((result) => result.score)).toFixed(0).padStart(8)}`);
}

console.log('\nStake ladder advisories:');
const monotonic = ladderSynergyWins.every((value, index) => index === 0 || value <= ladderSynergyWins[index - 1] + 0.02);
advisory(
  'synergy win non-increasing up the ladder (2 pt noise tolerance)',
  monotonic,
  ladderSynergyWins.map((value, index) => `S${index + 1} ${(value * 100).toFixed(1)}%`).join(' -> '),
);
advisory(
  'Legend synergy win in 20-55% (a hard game, still a game)',
  legendSynergyWin >= 0.2 && legendSynergyWin <= 0.55,
  `${(legendSynergyWin * 100).toFixed(1)}%`,
);
advisory(
  'drafting load-bearing by Pro: noDraft win <= 50%',
  proNoDraftWin <= 0.5,
  `${(proNoDraftWin * 100).toFixed(1)}% — Rookie is training camp; from Pro up, skipping the War Room should cost the run`,
);

console.log('\nLegacy Gridiron comparison: run `npm run balance:gridiron -- 3000` separately; this harness does not claim inherited balance.');

if (failures > 0) {
  console.error(`Fourth Phase balance FAILED: ${failures} gate(s) missed.`);
  process.exit(1);
}

console.log('Fourth Phase balance passed its target gates.');
