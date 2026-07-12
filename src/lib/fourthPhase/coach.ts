import { formatMeter } from './meter';
import { hasCardTag } from './deck';
import { jokerDefinition } from './jokers';
import type {
  FourthPhaseBossKey,
  FourthPhaseCard,
  FourthPhaseScoreResult,
  FourthPhaseTeamKey,
  FourthPhaseWarRoomOffer,
  ScoreLedgerEntry,
  SituationKey,
} from './types';

const COACH_PHASE_ORDER: Record<FourthPhaseCard['phase'], number> = {
  crowd: 0,
  defense: 1,
  specialTeams: 2,
  offense: 3,
};

function coachOrderWeight(card: FourthPhaseCard): number {
  const base = COACH_PHASE_ORDER[card.phase] * 20;
  if (card.phase === 'defense') {
    if (hasCardTag(card, 'kind:coverage') || hasCardTag(card, 'kind:disguise')) return base;
    if (hasCardTag(card, 'kind:pressure') || hasCardTag(card, 'kind:takeaway')) return base + 2;
  }
  if (card.phase === 'offense') {
    if (hasCardTag(card, 'kind:run') || hasCardTag(card, 'kind:rpo')) return base;
    if (hasCardTag(card, 'kind:playAction')) return base + 2;
    if (hasCardTag(card, 'kind:shot')) return base + 4;
  }
  return base + 8;
}

export interface BossWarningInput {
  boss: FourthPhaseBossKey;
  result: FourthPhaseScoreResult;
  cards: readonly FourthPhaseCard[];
  repeatedSituations?: Partial<Record<SituationKey, number>>;
}

export interface CoachPick {
  id: string;
  reason: string;
}

export interface RunShareCardData {
  outcome: 'W' | 'L';
  team: string;
  boss: string;
  score: number;
  bestPlay: number;
  runCode: string;
  cashIn?: string;
  jokers: string[];
  story: string;
}

export function coachOrderCards(cards: readonly FourthPhaseCard[]): FourthPhaseCard[] {
  return [...cards].sort((a, b) => coachOrderWeight(a) - coachOrderWeight(b));
}

/**
 * One verb that names what the selected series actually does. This is the preview's
 * headline: a cold player should know whether a call cashes, scores, charges,
 * sets up the next call, or busts before they know any situation names.
 */
export type PlayEffectVerb = 'CASHES' | 'SCORES' | 'BUILDS' | 'SETS UP' | 'BAD CALL';

export function playEffectVerb(result: FourthPhaseScoreResult): PlayEffectVerb {
  if (result.bust) return 'BAD CALL';
  if (result.didCash) return 'CASHES';
  if (result.situation.utility && result.meterCharged > 0.2 && result.points === 0) return 'BUILDS';
  if (result.situation.utility && (result.fuel.draw > 0 || result.fuel.money > 0 || result.fuel.discount > 0) && result.points === 0) return 'SETS UP';
  return 'SCORES';
}

export function comboLedgerEntries(result: FourthPhaseScoreResult): ScoreLedgerEntry[] {
  return result.ledger.filter((entry) => entry.channel === 'combo');
}

function comboLead(result: FourthPhaseScoreResult): string {
  const combos = comboLedgerEntries(result);
  if (!combos.length) return '';
  const [first] = combos;
  const extra = combos.length > 1 ? ` +${combos.length - 1} more` : '';
  return `${first.label}${extra}: ${first.value}`;
}

/**
 * One plain-English sentence for the collapsed ledger: what the last play did and
 * what to do about it. The full math stays one tap away.
 */
export function plainPlaySummary(result: FourthPhaseScoreResult): string {
  const combo = comboLead(result);
  if (result.bust) {
    return `No clean shape. The series broke down and momentum bled to ${formatMeter(result.meterAfter)}.`;
  }
  if (combo) {
    return `${combo}. ${result.situation.label} scored ${result.points}.`;
  }
  if (result.didCash) {
    return `Momentum cashed into Explosive x${result.bigPlay.toFixed(2)} for ${result.points}. That is the loop.`;
  }
  if (result.situation.key === 'blackout') {
    return `Crowd built momentum to ${formatMeter(result.meterAfter)}. Cash it with Offense soon.`;
  }
  if (result.situation.key === 'fieldFlip') {
    const parts = [
      result.fuel.draw ? `+${result.fuel.draw} draw` : '',
      result.fuel.money ? `+$${result.fuel.money}` : '',
      result.fuel.discount ? `+${result.fuel.discount} discount` : '',
    ].filter(Boolean).join(', ');
    return `Special Teams flipped field position: ${parts || 'setup'} for the next call.`;
  }
  if (result.meterAfter < result.meterBefore - 0.05) {
    return `${result.situation.label} scored ${result.points}, but hot momentum bled to ${formatMeter(result.meterAfter)}. Cash it with Offense.`;
  }
  return `${result.situation.label} scored ${result.points} safe points.`;
}

export function isTrueCrowdBeforeOffenseCash(cards: readonly FourthPhaseCard[], result: FourthPhaseScoreResult): boolean {
  if (!result.didCash || result.cashesAtCardIndex === null) return false;
  return cards.slice(0, result.cashesAtCardIndex).some((card) => card.phase === 'crowd');
}

export function tutorialCheckdownIsValid(cards: readonly FourthPhaseCard[], result: FourthPhaseScoreResult): boolean {
  return cards.length === 1 && cards[0]?.phase === 'offense' && result.situation.key === 'checkdown';
}

export function buildPlayExplanation(cards: readonly FourthPhaseCard[], result: FourthPhaseScoreResult): string {
  if (!cards.length) return 'Tap cards to build a series.';
  if (result.bust) return `Broken call -> ${result.points} progress and momentum bleeds.`;

  const combo = comboLead(result);
  if (combo) {
    return `${combo} -> ${result.points} progress`;
  }

  if (result.didCash && result.cashesAtCardIndex !== null) {
    const cashCard = cards[result.cashesAtCardIndex];
    const crowdBefore = cards.slice(0, result.cashesAtCardIndex).filter((card) => card.phase === 'crowd');
    const opener = crowdBefore.length > 0
      ? `Crowd builds ${formatMeter(result.meterAfterCash)} momentum`
      : `Offense cashes cold at ${formatMeter(result.meterAfterCash)}`;
    return `${opener} -> ${cashCard.roleName} cashes -> ${result.points} progress`;
  }

  if (result.situation.key === 'fieldFlip') {
    const fuel = [`+${result.fuel.draw} draw`, result.fuel.money ? `+$${result.fuel.money}` : '', result.fuel.discount ? `+${result.fuel.discount} discount` : '']
      .filter(Boolean)
      .join(', ');
    return `Special Teams flips the field -> ${fuel || 'setup'} -> next call`;
  }

  if (result.situation.key === 'blackout') {
    return `Crowd surge builds to ${formatMeter(result.meterAfter)} -> cash it soon`;
  }

  if (result.fuel.draw || result.fuel.money || result.fuel.discount) {
    return `${result.situation.label} sets up the drive -> ${result.points} progress`;
  }

  return `${result.situation.label} -> ${result.yards} Yards x Leverage x Explosive -> ${result.points} progress`;
}

export function bossWarningForPlay({ boss, result, cards, repeatedSituations = {} }: BossWarningInput): string | null {
  if (boss === 'none') return null;
  const offenseCount = cards.filter((card) => card.phase === 'offense').length;
  const defenseCount = cards.filter((card) => card.phase === 'defense').length;
  const specialTeamsCount = cards.filter((card) => card.phase === 'specialTeams').length;

  if (boss === 'adaptiveDc' && (repeatedSituations[result.situation.key] ?? 0) > 0) {
    return 'Got Your Number: repeat call will score 0.';
  }
  if (boss === 'roadGame' && (result.didCash || result.meterAfter > 1.25 || cards.some((card) => card.phase === 'crowd'))) {
    return 'Road Game: momentum is capped at x2.0 and bleeds harder.';
  }
  if (boss === 'noFlyZone' && offenseCount > 2) {
    return 'No-Fly Zone: extra Offense loses Yards after two clean cards.';
  }
  if (boss === 'stackedBox' && offenseCount > 0) {
    return 'Stacked Box: Offense Yards are cut in half.';
  }
  if (boss === 'turnoverDrill' && defenseCount > 0) {
    return 'Ball Security: red Defense cards create less leverage on this series.';
  }
  if (boss === 'fieldPositionWar' && specialTeamsCount > 0) {
    return 'Touchback Machine: Special Teams hidden-yards payout is suppressed.';
  }
  if (boss === 'preventDefense' && result.bigPlay >= 2.7) {
    return 'Prevent Defense: Explosive is capped at x2.75.';
  }
  return null;
}

function offerRarityScore(offer: FourthPhaseWarRoomOffer): number {
  if (offer.card) return 28 + offer.card.value * 2;
  if (!offer.joker) return 0;
  const rarity = jokerDefinition(offer.joker).rarity;
  if (rarity === 'legendary') return 18;
  if (rarity === 'rare') return 10;
  return 4;
}

function reasonForTags(tags: readonly string[]): string {
  if (tags.includes('team identity')) return 'Team identity';
  if (tags.some((tag) => tag.includes('Road Game') || tag.includes('answers') || tag.includes('boss'))) return 'Boss answer';
  if (tags.includes('feeds Crowd cash-in')) return 'Feeds Crowd cash-in';
  if (tags.includes('feeds ST economy')) return 'Fixes ST economy';
  if (tags.includes('phase glue')) return 'Phase glue';
  if (tags.includes('defensive floor')) return 'Defensive floor';
  if (tags.includes('order puzzle')) return 'Order puzzle';
  if (tags.includes('opening script')) return 'Opening script';
  if (tags.includes('closing answer')) return 'Closing answer';
  return 'Best value now';
}

export function coachPickForWarRoom(offers: readonly FourthPhaseWarRoomOffer[], team: FourthPhaseTeamKey, boss: FourthPhaseBossKey): CoachPick | null {
  if (!offers.length) return null;
  const ranked = [...offers].sort((a, b) => {
    const score = (offer: FourthPhaseWarRoomOffer) => {
      let value = 0;
      if (offer.tags.includes('team identity')) value += 500;
      if (offer.tags.some((tag) => tag.includes('Road Game') || tag.includes('answers') || tag.includes('boss'))) value += 360;
      if (offer.tags.includes('feeds Crowd cash-in')) value += team === 'loudHouse' ? 260 : 170;
      if (offer.tags.includes('feeds ST economy')) value += team === 'specialTeamsChaos' ? 260 : 150;
      if (offer.tags.includes('phase glue')) value += team === 'balanced' ? 220 : 120;
      if (offer.tags.includes('defensive floor')) value += team === 'blackAndBlue' ? 220 : 110;
      if (boss !== 'none' && offer.tags.length) value += 40;
      if (offer.kind === 'practice') value += 28;
      if (offer.kind === 'card') value += 42;
      value += offerRarityScore(offer);
      value -= offer.cost;
      return value;
    };
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
  const best = ranked[0];
  return { id: best.id, reason: reasonForTags(best.tags) };
}

// The War Room's opening line: the coach names the next drive's actual
// problem before the offers appear, so drafting reads as an adjustment to a
// threat instead of shopping from a list. Deterministic copy from run data.
const BOSS_ROOM_PROBLEM: Record<FourthPhaseBossKey, string> = {
  none: '',
  stackedBox: "They're stacking the box next drive — our base yards get cut in half. I want cheap ways to score that don't lean on Offense values.",
  noFlyZone: 'No-Fly Zone next drive: only two Offense cards run clean routes. Make every cash count or find yards somewhere else.',
  roadGame: "Road Game next drive: they take our crowd away and momentum caps at x2. Cash early, or draft something that doesn't need the meter.",
  turnoverDrill: 'Ball Security next drive: our Defense creates less leverage. The floor gets thin — find another multiplier.',
  fieldPositionWar: 'Touchback Machine next drive: hidden yards dry up. The Special Teams economy stalls unless we plan around it.',
  adaptiveDc: "Got Your Number next drive: repeat a call and they blank it. We need enough variety to never run the same look twice.",
  preventDefense: 'Prevent Defense next drive: they cap the explosive ceiling. Big cash-ins shrink — steady scoring wins this one.',
};

export function coachRoomLine(
  nextBoss: FourthPhaseBossKey,
  nextTarget: number,
  scoutedBossName?: string,
  scoutedArrivesDrive?: number,
): string {
  const problem = BOSS_ROOM_PROBLEM[nextBoss];
  if (problem) return problem;
  // Open field next drive, but the scouting report still hangs over the room:
  // buys made now are how you answer the boss before it takes the field.
  if (scoutedBossName && scoutedArrivesDrive) {
    return `Next drive asks for ${nextTarget} — open field. But ${scoutedBossName} takes the field on Drive ${scoutedArrivesDrive}. Spend ahead of it, or save the cap.`;
  }
  return `Next drive asks for ${nextTarget}. Open field, no boss pressure — spend where it compounds, or save the cap.`;
}

// ---------------------------------------------------------------------------
// Voice. The 2026-07-10 fun audit was unanimous: the game reads like a helpful
// kiosk. Bosses get mouths, the coach gets a spine, playbooks get a philosophy.
// All copy is deterministic — chosen by run state, never by a roll.
// ---------------------------------------------------------------------------

export interface BossVoice {
  /** Drive-intro taunt, spoken before the mechanical effect is explained. */
  intro: string;
  /** Fired when the boss visibly eats a play (a boss entry hits the ledger). */
  punish: string;
  /** Exit line when the player clears the boss drive. */
  playerWin: string;
  /** Exit line when the boss ends the run. */
  playerLoss: string;
  /** Newspaper-style verdict headline for a loss to this boss. */
  lossHeadline: string;
}

const BOSS_VOICE: Record<Exclude<FourthPhaseBossKey, 'none'>, BossVoice> = {
  stackedBox: {
    intro: 'Nine in the box. Run your cute little routes — nothing gets through the middle.',
    punish: 'Stuffed at the line. Told you.',
    playerWin: 'Who taught you to score without daylight? Fine. Take it.',
    playerLoss: 'The box never broke. It never does.',
    lossHeadline: 'THE BOX NEVER BROKE',
  },
  noFlyZone: {
    intro: 'Two clean routes tonight. That is all you get. Choose like it matters.',
    punish: 'Third receiver is blanketed. Where exactly was he going?',
    playerWin: 'You found the seams. Enjoy them — they close next week.',
    playerLoss: 'Nothing flew tonight. Nothing was ever going to.',
    lossHeadline: 'GROUNDED IN PRIME TIME',
  },
  roadGame: {
    intro: 'Hear that? That is OUR building. Your crowd stayed home.',
    punish: 'Momentum dies in here. Always has.',
    playerWin: 'Quietest flight home of the year. You earned it.',
    playerLoss: 'Listen to that silence. Beautiful, is it not?',
    lossHeadline: 'SILENCED ON THE ROAD',
  },
  turnoverDrill: {
    intro: 'We strip everything that moves. Hold it tight or hand it over.',
    punish: 'That leverage you love so much? We just took it.',
    playerWin: 'Clean all night. I hate a careful team.',
    playerLoss: 'They never did learn to take care of the ball.',
    lossHeadline: 'COUGHED IT UP',
  },
  fieldPositionWar: {
    intro: 'Go ahead. Kick it. See what happens.',
    punish: 'Touchback. No hidden yards today, friend.',
    playerWin: 'You out-kicked the machine. Savor that sentence.',
    playerLoss: 'Field position was ours from the anthem on.',
    lossHeadline: 'PINNED ALL NIGHT',
  },
  adaptiveDc: {
    intro: 'I have watched every snap you have ever called. Run something twice. Please.',
    punish: 'Saw that one in film study.',
    playerWin: 'New material. I will be adding it to the notebook.',
    playerLoss: 'I had your number from the coin toss.',
    lossHeadline: 'READ LIKE A BOOK',
  },
  preventDefense: {
    intro: 'Nothing over the top tonight. Take your checkdowns and die slow.',
    punish: 'Ceiling is capped. That bomb of yours was a firecracker.',
    playerWin: 'Dinked and dunked us to death. Hats off, I suppose.',
    playerLoss: 'Slow death, exactly like we drew it up.',
    lossHeadline: 'NOTHING OVER THE TOP',
  },
};

export function bossVoice(boss: FourthPhaseBossKey): BossVoice | null {
  return boss === 'none' ? null : BOSS_VOICE[boss];
}

/** The coach after a loss: takes the blame, keeps the door open. Deterministic pick. */
const COACH_LOSS_LINES = [
  'That one is on me. We had the pieces and I let the order beat us.',
  'They did not beat us — the clock did. Get some sleep. We go again.',
  'We left points on the field tonight. I will wear this one.',
  'One call. One lousy call. That is the whole distance.',
] as const;

export function coachLossLine(seed: number): string {
  return COACH_LOSS_LINES[Math.abs(seed) % COACH_LOSS_LINES.length];
}

/** One-line philosophy per playbook — the select screen sells an attitude, not a stat lean. */
const COACH_PHILOSOPHY: Record<FourthPhaseTeamKey, string> = {
  balanced: 'We beat you with whatever you forgot to defend.',
  airRaid: 'We do not punt on hope. We throw on it.',
  smashmouth: 'Four yards and a bad attitude, forty times in a row.',
  blackAndBlue: 'Points are rented. Leverage is owned.',
  loudHouse: 'The crowd is the twelfth man. We start eleven of them.',
  specialTeamsChaos: 'The third phase wins games. The fourth one steals them.',
};

export function coachPhilosophy(team: FourthPhaseTeamKey): string {
  return COACH_PHILOSOPHY[team];
}

/** Everything Call of the Game needs about the run's best series. */
export interface BestSeriesRecord {
  points: number;
  situation: string;
  driveNumber: number;
  didCash: boolean;
  bigPlay: number;
  bossName?: string;
}

// The verdict's highlight reel in one sentence, generated from run data the
// game already tracks — a memory, not a statistic.
export function callOfTheGameLine(best: BestSeriesRecord): string {
  const cash = best.didCash ? ` cashed x${best.bigPlay.toFixed(1)}` : '';
  const boss = best.bossName ? ` through ${best.bossName}` : '';
  return `Call of the Game: Drive ${best.driveNumber} — ${best.situation}${cash} for ${best.points}${boss}.`;
}

// Each drive clear gets a character, not just a stamp: how the drive ended is
// the story the banner should tell.
export function driveClearStamp(input: {
  clearingPoints: number;
  target: number;
  callsUsed: number;
  maxCalls: number;
  didCash: boolean;
}): string {
  if (input.clearingPoints >= input.target) return 'WALK-OFF';
  if (input.callsUsed >= input.maxCalls) return 'ESCAPED';
  if (input.callsUsed <= 3) return 'STATEMENT DRIVE';
  if (input.didCash) return 'CASHED OUT';
  return 'ANSWERED';
}

export function buildRunShareCardData(input: {
  outcome: 'W' | 'L';
  team: string;
  boss: string;
  score: number;
  bestPlay: number;
  runCode: string;
  cashIn?: string;
  jokers: readonly string[];
  story: string;
}): RunShareCardData {
  return {
    ...input,
    jokers: input.jokers.slice(0, 5),
  };
}
