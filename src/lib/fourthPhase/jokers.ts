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
  cardIndex?: number;
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

function phaseVariety(cards: readonly FourthPhaseCard[]): number {
  return new Set(cards.map((card) => card.phase)).size;
}

function isFirstUseOfSituation(ctx: JokerHookContext): boolean {
  return (ctx.context.repeatedSituations[ctx.situation.key] ?? 0) === 0;
}

function isLowValueCard(card: FourthPhaseCard): boolean {
  return card.value <= 6;
}

function applyDirectMeterCharge(score: MutableFourthPhaseScore, charge: number, label: string, detail: string) {
  const before = score.meter;
  score.meter = applyMeterCharge(score.meter, charge, score.meterCap);
  score.meterCharged += Math.max(0, score.meter - before);
  addLedger(score, label, `+${charge.toFixed(2)} momentum`, detail);
}

export const FOURTH_PHASE_JOKERS: Record<FourthPhaseJokerId, FourthPhaseJokerDefinition> = {
  twelfthMan: {
    id: 'twelfthMan',
    name: 'Sold Out',
    rarity: 'core',
    effect: 'Crowd cards build momentum 50% harder.',
    hooks: {
      onMeterCharged: ({ charge, chargeSource, score }) => {
        if (chargeSource !== 'crowdCard' || !charge) return 0;
        const bonus = charge * 0.5;
        addLedger(score, 'Sold Out', `+${bonus.toFixed(2)} momentum`, 'Crowd charge boosted.');
        return bonus;
      },
    },
  },
  homeCooking: {
    id: 'homeCooking',
    name: 'Home Cooking',
    rarity: 'core',
    effect: "Momentum does not bleed on a drive's final call.",
    hooks: {
      onPlayFinal: ({ context, score }) => {
        const projected = score.yards * Math.max(0.1, 1 + score.execution) * score.bigPlay;
        if ((context.targetRemaining ?? Infinity) <= projected) {
          score.preventBleed = true;
          addLedger(score, 'Home Cooking', 'no bleed', 'Final-call bleed prevented.');
        }
      },
    },
  },
  sustainedDrive: {
    id: 'sustainedDrive',
    name: 'Stay on Schedule',
    rarity: 'rare',
    effect: 'Each non-bust series raises the momentum cap by 0.15, bounded.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (situation.bust) return;
        const before = score.meterCap;
        raiseMeterCap(score, Math.min(7.5, score.meterCap + 0.15));
        if (score.meterCap > before) addLedger(score, 'Stay on Schedule', `cap x${score.meterCap.toFixed(2)}`, 'Momentum ceiling rises.');
      },
    },
  },
  silentCount: {
    id: 'silentCount',
    name: 'Lunch Pail',
    rarity: 'core',
    effect: 'While momentum is cold, each Defense card adds 0.25 Leverage.',
    hooks: {
      onCardScored: ({ card, score }) => {
        if (card?.phase !== 'defense' || score.meter > 1.5) return;
        score.execution += 0.25;
        addLedger(score, 'Lunch Pail', '+0.25 Leverage', card.roleName);
      },
    },
  },
  pickSixSpecialist: {
    id: 'pickSixSpecialist',
    name: 'Takeaway Artist',
    rarity: 'rare',
    effect: 'Sudden Change charges momentum to its current cap.',
    hooks: {
      onSituationDetected: ({ score, situation }) => {
        if (situation.key !== 'pickSix') return;
        score.forceMeterToCap = true;
        addLedger(score, 'Takeaway Artist', 'momentum to cap', 'Turnover energy spikes the sideline.');
      },
    },
  },
  theGenius: {
    id: 'theGenius',
    name: 'The Genius',
    rarity: 'rare',
    effect: 'Complementary Football gains +0.08 Leverage and +1.00 Explosive.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (situation.key !== 'complementaryFootball') return;
        score.execution += 0.08;
        score.bigPlay += 1;
        addLedger(score, 'The Genius', '+0.08 Leverage, +1.00 Explosive', 'Complementary Football has the perfect call.');
      },
    },
  },
  fieldGeneral: {
    id: 'fieldGeneral',
    name: 'Special Teams Coordinator',
    rarity: 'core',
    effect: 'Each Special Teams card gives +1 next draw and +$2.',
    hooks: {
      onPhaseScored: ({ phase, score, card }) => {
        if (phase !== 'specialTeams') return;
        score.fuel.draw += 1;
        score.fuel.money += 2;
        addLedger(score, 'Special Teams Coordinator', '+1 draw, +$2', card?.roleName);
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
    effect: 'When a boss forces the momentum cap low, Offense cards gain +60 Yards.',
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
    effect: 'Momentum starts +0.3 for each drive already won.',
    hooks: {
      onDrawStart: ({ context, score }) => {
        if (context.wins <= 0) return;
        const charge = context.wins * 0.3;
        score.meter = applyMeterCharge(score.meter, charge, score.meterCap);
        score.meterCharged += charge;
        addLedger(score, 'Bandwagon', `+${charge.toFixed(1)} momentum`, `${context.wins} prior drive(s).`);
      },
    },
  },
  decibelRecord: {
    id: 'decibelRecord',
    name: 'Standing Room Only',
    rarity: 'legendary',
    effect: 'Momentum cap rises to x12, but bleeds 40% after every series.',
    hooks: {
      onDrawStart: ({ score }) => {
        raiseMeterCap(score, ABSOLUTE_METER_CAP);
        addLedger(score, 'Standing Room Only', `cap x${score.meterCap.toFixed(0)}`, 'The building is packed.');
      },
      onPlayFinal: ({ score }) => {
        raiseMeterCap(score, ABSOLUTE_METER_CAP);
        score.meterBleedRate = Math.max(score.meterBleedRate, 0.4);
        score.alwaysBleed = true;
        addLedger(score, 'Standing Room Only', '40% bleed armed', 'Bleeds after every series.');
      },
    },
  },
  hurryUp: {
    id: 'hurryUp',
    name: 'Hurry-Up',
    rarity: 'core',
    effect: 'If 5 cards are called, retrigger all Offense.',
    hooks: {
      retriggersFor: ({ cards, score }) => {
        if (cards.length !== 5) return [];
        const offense = cards.filter((card) => card.phase === 'offense');
        if (offense.length) addLedger(score, 'Hurry-Up', `+${offense.length} retrigger`, 'Full five-card series.');
        return offense;
      },
    },
  },
  leadBlocker: {
    id: 'leadBlocker',
    name: 'Short Field',
    rarity: 'core',
    effect: 'A Defense card immediately before an Offense card adds +8 Yards.',
    hooks: {
      onCardScored: ({ card, cardIndex, cards, score }) => {
        if (card?.phase !== 'defense' || cardIndex === undefined || cards[cardIndex + 1]?.phase !== 'offense') return;
        score.yards += 8;
        addLedger(score, 'Short Field', '+8 Yards', `${card.roleName} hands the offense a short field.`);
      },
    },
  },
  doubleMove: {
    id: 'doubleMove',
    name: 'Juice',
    rarity: 'core',
    effect: 'An Offense card immediately after a Crowd card gains +0.12 Explosive.',
    hooks: {
      onCardScored: ({ card, cardIndex, cards, score }) => {
        if (card?.phase !== 'offense' || !cardIndex || cards[cardIndex - 1]?.phase !== 'crowd') return;
        score.bigPlay += 0.12;
        addLedger(score, 'Juice', '+0.12 Explosive', `${card.roleName} rides the sideline energy.`);
      },
    },
  },
  hiddenYards: {
    id: 'hiddenYards',
    name: 'Coverage Units',
    rarity: 'core',
    effect: 'Special Teams cards inside scoring situations add +6 Yards.',
    hooks: {
      onPhaseScored: ({ phase, situation, score, card }) => {
        if (phase !== 'specialTeams' || situation.utility || situation.bust) return;
        score.yards += 6;
        addLedger(score, 'Coverage Units', '+6 Yards', card?.roleName);
      },
    },
  },
  studentSection: {
    id: 'studentSection',
    name: 'The Wave',
    rarity: 'core',
    effect: 'The sustained non-bust tick charges +0.10 extra momentum.',
    hooks: {
      onMeterCharged: ({ chargeSource, score }) => {
        if (chargeSource !== 'sustained') return 0;
        addLedger(score, 'The Wave', '+0.10 momentum', 'The building keeps rolling.');
        return 0.1;
      },
    },
  },
  filmStudy: {
    id: 'filmStudy',
    name: 'Film Study',
    rarity: 'core',
    effect: 'The first copy of each situation per drive gains +0.16 Leverage.',
    hooks: {
      onSituationDetected: (ctx) => {
        if (ctx.situation.bust || !isFirstUseOfSituation(ctx)) return;
        ctx.score.execution += 0.16;
        addLedger(ctx.score, 'Film Study', '+0.16 Leverage', `${ctx.situation.label} was prepared.`);
      },
    },
  },
  redZonePackage: {
    id: 'redZonePackage',
    name: 'Red Zone Package',
    rarity: 'core',
    effect: 'When the target is within 180, non-utility series gain +8 Yards, +0.10 Leverage, and +0.34 Explosive.',
    hooks: {
      onPlayFinal: ({ context, score, situation }) => {
        if (situation.bust || situation.utility || (context.targetRemaining ?? Infinity) > 180) return;
        score.yards += 8;
        score.execution += 0.1;
        score.bigPlay += 0.34;
        addLedger(score, 'Red Zone Package', '+8 Yards, +0.10 Leverage, +0.34 Explosive', 'The finishing menu is open.');
      },
    },
  },
  walkOnProgram: {
    id: 'walkOnProgram',
    name: 'Walk-On Program',
    rarity: 'core',
    effect: 'Cards valued 6 or lower add +4 Yards if Offense, otherwise +0.04 Leverage.',
    hooks: {
      onCardScored: ({ card, score }) => {
        if (!card || !isLowValueCard(card)) return;
        if (card.phase === 'offense') {
          score.yards += 4;
          addLedger(score, 'Walk-On Program', '+4 Yards', card.roleName);
          return;
        }
        score.execution += 0.04;
        addLedger(score, 'Walk-On Program', '+0.04 Leverage', card.roleName);
      },
    },
  },
  checkdownMerchant: {
    id: 'checkdownMerchant',
    name: 'Checkdown Merchant',
    rarity: 'core',
    effect: 'Checkdowns give +1 draw and +$1.',
    hooks: {
      onSituationDetected: ({ score, situation }) => {
        if (situation.key !== 'checkdown') return;
        score.fuel.draw += 1;
        score.fuel.money += 1;
        addLedger(score, 'Checkdown Merchant', '+1 draw, +$1', 'Safe yards keep the drive on schedule.');
      },
    },
  },
  bendDontBreak: {
    id: 'bendDontBreak',
    name: "Bend, Don't Break",
    rarity: 'core',
    effect: 'Busted series with Defense gain +0.10 Leverage and do not bleed momentum.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (!situation.bust || situation.counts.defense === 0) return;
        score.execution += 0.1;
        score.preventBleed = true;
        addLedger(score, "Bend, Don't Break", '+0.10 Leverage, no bleed', 'Defense limits the damage.');
      },
    },
  },
  coordinatorTree: {
    id: 'coordinatorTree',
    name: 'Coaching Tree',
    rarity: 'rare',
    effect: 'Series with 3+ phases gain Yards and a smaller Leverage lift; all four phases add Explosive.',
    hooks: {
      onPlayFinal: ({ cards, score, situation }) => {
        const variety = phaseVariety(cards);
        if (situation.bust || variety < 3) return;
        const yards = variety >= 4 ? 8 : 5;
        const execution = variety >= 4 ? 0.08 : 0.1;
        score.yards += yards;
        score.execution += execution;
        if (variety >= 4) score.bigPlay += 0.12;
        addLedger(score, 'Coaching Tree', `+${yards} Yards, +${execution.toFixed(2)} Leverage${variety >= 4 ? ', +0.12 Explosive' : ''}`, `${variety} phases linked.`);
      },
    },
  },
  closer: {
    id: 'closer',
    name: 'Finisher',
    rarity: 'rare',
    effect: 'On the boss drive, non-bust series gain +10 Yards, +0.10 Leverage, and +0.45 Explosive.',
    hooks: {
      onPlayFinal: ({ context, score, situation }) => {
        if (context.driveIndex < 2 || situation.bust) return;
        score.yards += 10;
        score.execution += 0.1;
        score.bigPlay += 0.45;
        addLedger(score, 'Finisher', '+10 Yards, +0.10 Leverage, +0.45 Explosive', 'Fourth quarter package.');
      },
    },
  },
  pressBoxAngle: {
    id: 'pressBoxAngle',
    name: 'Press Box Angle',
    rarity: 'rare',
    effect: 'Against a boss, the first copy of each situation gains +8 Yards and +0.12 Leverage.',
    hooks: {
      onSituationDetected: (ctx) => {
        if (ctx.context.boss === 'none' || ctx.situation.bust || !isFirstUseOfSituation(ctx)) return;
        ctx.score.yards += 8;
        ctx.score.execution += 0.12;
        addLedger(ctx.score, 'Press Box Angle', '+8 Yards, +0.12 Leverage', `${ctx.situation.label} had the right call.`);
      },
    },
  },
  returnAce: {
    id: 'returnAce',
    name: 'Return Ace',
    rarity: 'rare',
    effect: 'Field Flip gives +2 more draw, +$4, and +1 discount.',
    hooks: {
      onSituationDetected: ({ score, situation }) => {
        if (situation.key !== 'fieldFlip') return;
        score.fuel.draw += 2;
        score.fuel.money += 4;
        score.fuel.discount += 1;
        addLedger(score, 'Return Ace', '+2 draw, +$4, +1 discount', 'Hidden yards tilt the War Room.');
      },
    },
  },
  homeRunThreat: {
    id: 'homeRunThreat',
    name: 'Big-Play Threat',
    rarity: 'rare',
    effect: 'Shot Plays with momentum at x3 or higher gain +0.50 Explosive.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (situation.key !== 'houseCall' || score.meter < 3) return;
        score.bigPlay += 0.5;
        addLedger(score, 'Big-Play Threat', '+0.50 Explosive', 'The stadium sees the shot coming.');
      },
    },
  },
  scriptedSeries: {
    id: 'scriptedSeries',
    name: 'Body Blows',
    rarity: 'rare',
    effect: 'Non-bust series gain +6 Yards per prior call this drive, capped at +24.',
    hooks: {
      onPlayFinal: ({ context, score, situation }) => {
        if (situation.bust) return;
        const bonus = Math.min(24, context.cardsPlayedThisDrive * 6);
        if (bonus <= 0) return;
        score.yards += bonus;
        addLedger(score, 'Body Blows', `+${bonus} Yards`, `${context.cardsPlayedThisDrive} prior call(s).`);
      },
    },
  },
  blackoutCurtain: {
    id: 'blackoutCurtain',
    name: 'Lights Out',
    rarity: 'rare',
    effect: 'Crowd Surges raise the momentum cap by +0.50, capped at x8.5, and add +0.40 momentum.',
    hooks: {
      onPlayFinal: ({ score, situation }) => {
        if (situation.key !== 'blackout') return;
        const beforeCap = score.meterCap;
        raiseMeterCap(score, Math.min(8.5, score.meterCap + 0.5));
        if (score.meterCap > beforeCap) addLedger(score, 'Lights Out', `cap x${score.meterCap.toFixed(2)}`, 'The building gets louder.');
        applyDirectMeterCharge(score, 0.4, 'Lights Out', 'The surge lingers.');
      },
    },
  },
  phaseCollector: {
    id: 'phaseCollector',
    name: 'All Four Phases',
    rarity: 'legendary',
    effect: 'Five-card series with all four phases gain +0.35 Explosive and raise the momentum cap by +0.75, capped at x9.',
    hooks: {
      onPlayFinal: ({ cards, score, situation }) => {
        if (cards.length !== 5 || phaseVariety(cards) < 4 || situation.bust) return;
        const beforeCap = score.meterCap;
        score.bigPlay += 0.35;
        raiseMeterCap(score, Math.min(9, score.meterCap + 0.75));
        const capText = score.meterCap > beforeCap ? `, cap x${score.meterCap.toFixed(2)}` : '';
        addLedger(score, 'All Four Phases', `+0.35 Explosive${capText}`, 'Every unit touches the series.');
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
