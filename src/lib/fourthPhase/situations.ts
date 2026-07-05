import { crowdChargeForRank } from './meter';
import type { FourthPhaseCard, PhaseCounts, SituationFuel, SituationKey, SituationResult } from './types';

const ZERO_FUEL: SituationFuel = { draw: 0, money: 0, discount: 0 };

export const SITUATION_LABELS: Record<SituationKey, string> = {
  checkdown: 'The Checkdown',
  drive: 'Sustained Drive',
  stand: 'Defensive Stand',
  fieldFlip: 'Field Flip',
  blackout: 'Crowd Surge',
  momentumShift: 'Momentum Shift',
  houseCall: 'Shot Play',
  pickSix: 'Sudden Change',
  complementaryFootball: 'Complementary Football',
  bustedPlay: 'Busted Play',
};

export interface SituationTestCase {
  label: string;
  phases: FourthPhaseCard['phase'][];
  expected: SituationKey;
}

export const SITUATION_TEST_CASES: readonly SituationTestCase[] = [
  { label: 'single offense is a checkdown', phases: ['offense'], expected: 'checkdown' },
  { label: 'three offense cards make a drive', phases: ['offense', 'offense', 'offense'], expected: 'drive' },
  { label: 'three defense cards make a defensive stand', phases: ['defense', 'defense', 'defense'], expected: 'stand' },
  { label: 'two special teams cards flip the field', phases: ['specialTeams', 'specialTeams'], expected: 'fieldFlip' },
  { label: 'three crowd cards create a surge', phases: ['crowd', 'crowd', 'crowd'], expected: 'blackout' },
  { label: 'two offense and two defense cards shift momentum', phases: ['offense', 'defense', 'offense', 'defense'], expected: 'momentumShift' },
  { label: 'offense plus crowd calls a shot play', phases: ['crowd', 'offense'], expected: 'houseCall' },
  { label: 'defense plus offense creates sudden-change pressure', phases: ['defense', 'defense', 'offense'], expected: 'pickSix' },
  { label: 'all phases is apex football', phases: ['offense', 'defense', 'specialTeams', 'crowd'], expected: 'complementaryFootball' },
  { label: 'unshaped mixed hand busts', phases: ['defense', 'crowd'], expected: 'bustedPlay' },
];

export function countPhases(cards: readonly FourthPhaseCard[]): PhaseCounts {
  const counts: PhaseCounts = { offense: 0, defense: 0, specialTeams: 0, crowd: 0 };
  for (const card of cards) counts[card.phase] += 1;
  return counts;
}

function sumPhase(cards: readonly FourthPhaseCard[], phase: FourthPhaseCard['phase']): number {
  return cards.reduce((sum, card) => sum + (card.phase === phase ? card.value : 0), 0);
}

function crowdCharge(cards: readonly FourthPhaseCard[]): number {
  return cards.reduce((sum, card) => sum + (card.phase === 'crowd' ? crowdChargeForRank(card.rank) : 0), 0);
}

function result(
  key: SituationKey,
  priority: number,
  counts: PhaseCounts,
  values: {
    yardsSeed: number;
    executionSeed: number;
    meterBonus?: number;
    bigPlaySeed?: number;
    cashesMeter?: boolean;
    bust?: boolean;
    utility?: boolean;
    fuel?: SituationFuel;
    notes?: string[];
  },
): SituationResult {
  return {
    key,
    label: SITUATION_LABELS[key],
    priority,
    counts,
    yardsSeed: Math.max(0, Math.round(values.yardsSeed)),
    executionSeed: Number(values.executionSeed.toFixed(3)),
    meterBonus: values.meterBonus ?? 0,
    bigPlaySeed: values.bigPlaySeed ?? 1,
    cashesMeter: values.cashesMeter ?? false,
    bust: values.bust ?? false,
    utility: values.utility ?? false,
    fuel: values.fuel ?? ZERO_FUEL,
    notes: values.notes ?? [],
  };
}

export function recognizeFourthPhaseSituation(cards: readonly FourthPhaseCard[]): SituationResult {
  const counts = countPhases(cards);
  const offense = sumPhase(cards, 'offense');
  const defense = sumPhase(cards, 'defense');
  const special = sumPhase(cards, 'specialTeams');
  const crowd = crowdCharge(cards);

  if (cards.length === 0) {
    return result('bustedPlay', 0, counts, {
      yardsSeed: 0,
      executionSeed: -0.2,
      bigPlaySeed: 0.6,
      bust: true,
      notes: ['No cards selected.'],
    });
  }

  if (counts.offense > 0 && counts.defense > 0 && counts.specialTeams > 0 && counts.crowd > 0) {
    return result('complementaryFootball', 100, counts, {
      yardsSeed: offense + Math.round(defense * 0.6) + Math.round(special * 0.45) + 12,
      executionSeed: 0.42 + counts.defense * 0.07,
      meterBonus: 0.35,
      cashesMeter: true,
      fuel: { draw: 1, money: 2, discount: 1 },
      notes: ['All four phases are present.'],
    });
  }

  if (counts.offense >= 2 && counts.defense >= 2) {
    return result('momentumShift', 90, counts, {
      yardsSeed: offense + Math.round(defense * 0.45) + 8,
      executionSeed: 0.35 + counts.defense * 0.05,
      meterBonus: 0.15,
      notes: ['Two-way play raises the floor.'],
    });
  }

  // Shot Play is a cashing situation and must outrank Sudden Change: a hand that brought
  // a Crowd card alongside Offense is here to cash momentum, even if it also has
  // 2+ Defense. (A defense-heavy hand with no Crowd still falls through to Sudden Change.)
  if (counts.offense >= 1 && counts.crowd >= 1) {
    return result('houseCall', 86, counts, {
      yardsSeed: offense + 6,
      executionSeed: 0.12,
      meterBonus: counts.crowd >= 2 ? 0.15 : 0,
      cashesMeter: true,
      notes: ['Offense cashes whatever the stadium has built.'],
    });
  }

  if (counts.defense >= 2 && counts.offense >= 1) {
    return result('pickSix', 85, counts, {
      yardsSeed: Math.round(offense * 0.75 + defense * 0.9) + 12,
      executionSeed: 0.28 + counts.defense * 0.09,
      meterBonus: 0.35,
      bigPlaySeed: 1.15,
      notes: ['Defensive pressure turns into instant field position.'],
    });
  }

  if (counts.crowd >= 3) {
    return result('blackout', 70, counts, {
      yardsSeed: 0,
      executionSeed: 0,
      meterBonus: 0.5 + crowd * 0.25,
      utility: true,
      notes: ['The stadium charges without scoring.'],
    });
  }

  if (counts.specialTeams >= 2) {
    return result('fieldFlip', 60, counts, {
      yardsSeed: 0,
      executionSeed: 0,
      utility: true,
      fuel: {
        draw: 1 + Math.floor(counts.specialTeams / 3),
        money: Math.max(2, Math.round(special / 6)),
        discount: counts.specialTeams >= 3 ? 1 : 0,
      },
      notes: ['Hidden yards become economy and draw fuel.'],
    });
  }

  if (counts.defense >= 3) {
    return result('stand', 50, counts, {
      yardsSeed: Math.round(defense * 0.45) + 6,
      executionSeed: 0.5 + counts.defense * 0.04,
      notes: ['Defense is a floor, not a fireworks show.'],
    });
  }

  if (counts.offense >= 3) {
    return result('drive', 45, counts, {
      yardsSeed: offense + 4,
      executionSeed: 0.15,
      notes: ['Offense supplies the payload.'],
    });
  }

  if (counts.offense >= 1 && counts.offense <= 2 && counts.defense === 0 && counts.specialTeams === 0 && counts.crowd === 0) {
    return result('checkdown', 30, counts, {
      yardsSeed: Math.max(8, Math.round(offense * 0.85)),
      executionSeed: 0.1,
      utility: true,
      notes: ['Safe yards without spending the whole hand.'],
    });
  }

  return result('bustedPlay', 1, counts, {
    yardsSeed: Math.round(offense * 0.2 + defense * 0.15 + special * 0.1),
    executionSeed: -0.18,
    bigPlaySeed: 0.65,
    bust: true,
    notes: ['The phases do not form a clean situation.'],
  });
}
