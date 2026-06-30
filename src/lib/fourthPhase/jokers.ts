import { ABSOLUTE_METER_CAP, BASE_METER_CAP, applyMeterCharge } from './meter';
import type {
  FourthPhaseCard,
  FourthPhaseJokerId,
  FourthPhaseJokerState,
  FourthPhaseScoreContext,
  Phase,
  ScoreLedgerEntry,
  SituationResult,
} from './types';

export type JokerRarity = 'core' | 'rare' | 'legendary';

export interface MutableFourthPhaseScore {
  yards: number;
  execution: number;
  bigPlay: number;
  meter: number;
  meterCap: number;
  /** Hard ceiling a boss can impose on meterCap; jokers must not raise the cap past it. */
  meterCapLimit: number;
  meterCharged: number;
  meterBleedRate: number;
  alwaysBleed: boolean;
  forceMeterToCap: boolean;
  preventBleed: boolean;
  fuel: { draw: number; money: number; discount: number };
  ledger: ScoreLedgerEntry[];
}

/** Raise meterCap toward `desired` without ever exceeding an active boss cap limit. */
export function raiseMeterCap(score: MutableFourthPhaseScore, desired: number): void {
  score.meterCap = Math.min(score.meterCapLimit, Math.max(score.meterCap, desired));
}

export interface JokerHookContext {
  cards: readonly FourthPhaseCard[];
  card?: FourthPhaseCard;
  phase?: Phase;
  charge?: number;
  chargeSource?: 'crowdCard' | 'situation' | 'sustained';
  context: FourthPhaseScoreContext;
  score: MutableFourthPhaseScore;
  situation: SituationResult;
}

export interface FourthPhaseJokerDefinition {
  id: FourthPhaseJokerId;
  name: string;
  rarity: JokerRarity;
  effect: string;
  hooks: {
    onDrawStart?: (ctx: JokerHookContext) => void;
    onSituationDetected?: (ctx: JokerHookContext) => void;
    onCardScored?: (ctx: JokerHookContext) => void;
    onPhaseScored?: (ctx: JokerHookContext) => void;
    onMeterCharged?: (ctx: JokerHookContext) => number;
    onPlayFinal?: (ctx: JokerHookContext) => void;
    retriggersFor?: (ctx: JokerHookContext) => FourthPhaseCard[];
  };
}

function addLedger(score: MutableFourthPhaseScore, label: string, value: string, detail?: string) {
  score.ledger.push({ channel: 'joker', label, value, detail });
}

export const FOURTH_PHASE_JOKERS: Record<FourthPhaseJokerId, FourthPhaseJokerDefinition> = {
  twelfthMan: {
    id: 'twelfthMan',
    name: 'Twelfth Man',
    rarity: 'core',
    effect: 'Crowd cards charge the meter 50% harder.',
    hooks: {
      onMeterCharged: ({ charge, chargeSource, score }) => {
        if (chargeSource !== 'crowdCard' || !charge) return 0;
        const bonus = charge * 0.5;
        addLedger(score, 'Twelfth Man', `+${bonus.toFixed(2)} meter`, 'Crowd charge boosted.');
        return bonus;
      },
    },
  },
  homeCooking: {
    id: 'homeCooking',
    name: 'Home Cooking',
    rarity: 'core',
    effect: "The meter does not bleed on a drive's final play.",
    hooks: {
      onPlayFinal: ({ context, score }) => {
        const projected = score.yards * Math.max(0.1, 1 + score.execution) * score.bigPlay;
        if ((context.targetRemaining ?? Infinity) <= projected) {
          score.preventBleed = true;
          addLedger(score, 'Home Cooking', 'no bleed', 'Final-play bleed prevented.');
        }
      },
    },
  },
  sustainedDrive: {
    id: 'sustainedDrive',
    name: 'Sustained Drive',
    rarity: 'rare',
    effect: 'Each non-bust play raises the meter cap by 0.15, bounded.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (situation.bust) return;
        const before = score.meterCap;
        raiseMeterCap(score, Math.min(7.5, score.meterCap + 0.15));
        if (score.meterCap > before) addLedger(score, 'Sustained Drive', `cap x${score.meterCap.toFixed(2)}`, 'Meter ceiling rises.');
      },
    },
  },
  silentCount: {
    id: 'silentCount',
    name: 'Silent Count',
    rarity: 'core',
    effect: 'While the meter is cold, each Defense card adds 0.25 Execution.',
    hooks: {
      onCardScored: ({ card, score }) => {
        if (card?.phase !== 'defense' || score.meter > 1.5) return;
        score.execution += 0.25;
        addLedger(score, 'Silent Count', '+0.25 Exec', card.roleName);
      },
    },
  },
  pickSixSpecialist: {
    id: 'pickSixSpecialist',
    name: 'Pick-Six Specialist',
    rarity: 'rare',
    effect: 'A Pick Six charges the meter to its current cap.',
    hooks: {
      onSituationDetected: ({ score, situation }) => {
        if (situation.key !== 'pickSix') return;
        score.forceMeterToCap = true;
        addLedger(score, 'Pick-Six Specialist', 'meter to cap', 'Turnover energy spikes the stadium.');
      },
    },
  },
  theGenius: {
    id: 'theGenius',
    name: 'The Genius',
    rarity: 'rare',
    effect: 'All-four-phase plays score x2.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (situation.key !== 'complementaryFootball') return;
        score.bigPlay *= 2;
        addLedger(score, 'The Genius', 'x2 BigPlay', 'Complementary Football doubled.');
      },
    },
  },
  fieldGeneral: {
    id: 'fieldGeneral',
    name: 'Field General',
    rarity: 'core',
    effect: 'Each Special Teams card gives +1 next draw and +$2.',
    hooks: {
      onPhaseScored: ({ phase, score, card }) => {
        if (phase !== 'specialTeams') return;
        score.fuel.draw += 1;
        score.fuel.money += 2;
        addLedger(score, 'Field General', '+1 draw, +$2', card?.roleName);
      },
    },
  },
  twoMinuteDrill: {
    id: 'twoMinuteDrill',
    name: 'Two-Minute Drill',
    rarity: 'rare',
    effect: 'With 0 discards, retrigger all Offense.',
    hooks: {
      retriggersFor: ({ cards, context, score }) => {
        if (context.discardsLeft !== 0) return [];
        const offense = cards.filter((card) => card.phase === 'offense');
        if (offense.length) addLedger(score, 'Two-Minute Drill', `+${offense.length} retrigger`, 'No discards left.');
        return offense;
      },
    },
  },
  roadWarriors: {
    id: 'roadWarriors',
    name: 'Road Warriors',
    rarity: 'rare',
    effect: 'When a boss forces the meter cap low, Offense cards gain +60 Yards.',
    hooks: {
      onCardScored: ({ card, context, score }) => {
        if (card?.phase !== 'offense' || context.boss !== 'roadGame') return;
        score.yards += 60;
        addLedger(score, 'Road Warriors', '+60 Yards', card.roleName);
      },
    },
  },
  bandwagon: {
    id: 'bandwagon',
    name: 'Bandwagon',
    rarity: 'core',
    effect: 'The meter starts +0.3 for each game already won.',
    hooks: {
      onDrawStart: ({ context, score }) => {
        if (context.wins <= 0) return;
        const charge = context.wins * 0.3;
        score.meter = applyMeterCharge(score.meter, charge, score.meterCap);
        score.meterCharged += charge;
        addLedger(score, 'Bandwagon', `+${charge.toFixed(1)} meter`, `${context.wins} prior wins.`);
      },
    },
  },
  decibelRecord: {
    id: 'decibelRecord',
    name: 'Decibel Record',
    rarity: 'legendary',
    effect: 'Meter cap rises to x12, but bleeds 40% after every play.',
    hooks: {
      onDrawStart: ({ score }) => {
        raiseMeterCap(score, ABSOLUTE_METER_CAP);
        addLedger(score, 'Decibel Record', `cap x${score.meterCap.toFixed(0)}`, 'The stadium ceiling is unsafe.');
      },
      onPlayFinal: ({ score }) => {
        raiseMeterCap(score, ABSOLUTE_METER_CAP);
        score.meterBleedRate = Math.max(score.meterBleedRate, 0.4);
        score.alwaysBleed = true;
        addLedger(score, 'Decibel Record', '40% bleed armed', 'Bleeds after every play.');
      },
    },
  },
  hurryUp: {
    id: 'hurryUp',
    name: 'Hurry-Up',
    rarity: 'core',
    effect: 'If 5 cards are played, retrigger all Offense.',
    hooks: {
      retriggersFor: ({ cards, score }) => {
        if (cards.length !== 5) return [];
        const offense = cards.filter((card) => card.phase === 'offense');
        if (offense.length) addLedger(score, 'Hurry-Up', `+${offense.length} retrigger`, 'Full five-card play.');
        return offense;
      },
    },
  },
};

export const FOURTH_PHASE_JOKER_POOL = Object.values(FOURTH_PHASE_JOKERS);

export function jokerDefinition(state: FourthPhaseJokerState): FourthPhaseJokerDefinition {
  return FOURTH_PHASE_JOKERS[state.id];
}

export function baseMutableScore(meter: number, meterCap = BASE_METER_CAP): MutableFourthPhaseScore {
  return {
    yards: 0,
    execution: 0,
    bigPlay: 1,
    meter,
    meterCap,
    meterCapLimit: Infinity,
    meterCharged: 0,
    meterBleedRate: 0.25,
    alwaysBleed: false,
    forceMeterToCap: false,
    preventBleed: false,
    fuel: { draw: 0, money: 0, discount: 0 },
    ledger: [],
  };
}
