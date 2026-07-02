import { formatMeter } from './meter';
import { jokerDefinition } from './jokers';
import type {
  FourthPhaseBossKey,
  FourthPhaseCard,
  FourthPhaseScoreResult,
  FourthPhaseTeamKey,
  FourthPhaseWarRoomOffer,
  SituationKey,
} from './types';

const COACH_PHASE_ORDER: Record<FourthPhaseCard['phase'], number> = {
  crowd: 0,
  defense: 1,
  specialTeams: 2,
  offense: 3,
};

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
  return [...cards].sort((a, b) => COACH_PHASE_ORDER[a.phase] - COACH_PHASE_ORDER[b.phase]);
}

export function isTrueCrowdBeforeOffenseCash(cards: readonly FourthPhaseCard[], result: FourthPhaseScoreResult): boolean {
  if (!result.didCash || result.cashesAtCardIndex === null) return false;
  return cards.slice(0, result.cashesAtCardIndex).some((card) => card.phase === 'crowd');
}

export function tutorialCheckdownIsValid(cards: readonly FourthPhaseCard[], result: FourthPhaseScoreResult): boolean {
  return cards.length === 1 && cards[0]?.phase === 'offense' && result.situation.key === 'checkdown';
}

export function buildPlayExplanation(cards: readonly FourthPhaseCard[], result: FourthPhaseScoreResult): string {
  if (!cards.length) return 'Tap cards to build a play.';
  if (result.bust) return `Broken call -> ${result.points} Drive and the meter bleeds.`;

  if (result.didCash && result.cashesAtCardIndex !== null) {
    const cashCard = cards[result.cashesAtCardIndex];
    const crowdBefore = cards.slice(0, result.cashesAtCardIndex).filter((card) => card.phase === 'crowd');
    const opener = crowdBefore.length > 0
      ? `Crowd builds ${formatMeter(result.meterAfterCash)}`
      : `Offense cashes cold at ${formatMeter(result.meterAfterCash)}`;
    return `${opener} -> ${cashCard.roleName} cashes -> ${result.points} Drive`;
  }

  if (result.situation.key === 'fieldFlip') {
    const fuel = [`+${result.fuel.draw} draw`, result.fuel.money ? `+$${result.fuel.money}` : '', result.fuel.discount ? `+${result.fuel.discount} discount` : '']
      .filter(Boolean)
      .join(', ');
    return `Special Teams flips field -> ${fuel || 'tempo'} -> next snap`;
  }

  if (result.situation.key === 'blackout') {
    return `Crowd blackout charges to ${formatMeter(result.meterAfter)} -> cash it soon`;
  }

  if (result.fuel.draw || result.fuel.money || result.fuel.discount) {
    return `${result.situation.label} fuels the drive -> ${result.points} Drive`;
  }

  return `${result.situation.label} -> ${result.yards} Yards x Exec x BigPlay -> ${result.points} Drive`;
}

export function bossWarningForPlay({ boss, result, cards, repeatedSituations = {} }: BossWarningInput): string | null {
  if (boss === 'none') return null;
  const offenseCount = cards.filter((card) => card.phase === 'offense').length;
  const defenseCount = cards.filter((card) => card.phase === 'defense').length;
  const specialTeamsCount = cards.filter((card) => card.phase === 'specialTeams').length;

  if (boss === 'adaptiveDc' && (repeatedSituations[result.situation.key] ?? 0) > 0) {
    return 'Adaptive DC: repeat call will score 0.';
  }
  if (boss === 'roadGame' && (result.didCash || result.meterAfter > 1.25 || cards.some((card) => card.phase === 'crowd'))) {
    return 'Road Game: meter is capped at x2.0 and bleeds harder.';
  }
  if (boss === 'noFlyZone' && offenseCount > 2) {
    return 'No-Fly Zone: extra Offense loses Yards after two clean cards.';
  }
  if (boss === 'stackedBox' && offenseCount > 0) {
    return 'Stacked Box: Offense Yards are cut in half.';
  }
  if (boss === 'turnoverDrill' && defenseCount > 0) {
    return 'Turnover Drill: Defense lowers Execution on this play.';
  }
  if (boss === 'fieldPositionWar' && specialTeamsCount > 0) {
    return 'Field Position War: Special Teams fuel is suppressed.';
  }
  if (boss === 'preventDefense' && result.bigPlay >= 2.7) {
    return 'Prevent Defense: BigPlay is capped at x2.75.';
  }
  return null;
}

function offerRarityScore(offer: FourthPhaseWarRoomOffer): number {
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
      value += offerRarityScore(offer);
      value -= offer.cost;
      return value;
    };
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
  const best = ranked[0];
  return { id: best.id, reason: reasonForTags(best.tags) };
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
