import { mulberry32, stringSeed, type RNG } from '../rng';
import {
  PHASES,
  RANKS,
  type CardTier,
  type FourthPhaseCard,
  type FourthPhaseTeamKey,
  type Phase,
  type Rank,
} from './types';

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 10,
  A: 11,
};

const RANK_TIER: Record<Rank, CardTier> = {
  '2': 'rotation',
  '3': 'rotation',
  '4': 'starter',
  '5': 'starter',
  '6': 'starter',
  '7': 'proBowl',
  '8': 'proBowl',
  '9': 'captain',
  '10': 'captain',
  J: 'scheme',
  Q: 'playmaker',
  K: 'playmaker',
  A: 'franchise',
};

const ROLE_NAMES: Record<Phase, Record<Rank, string>> = {
  offense: {
    '2': 'Boundary Blocker',
    '3': 'Slot Motion',
    '4': 'Quick Out',
    '5': 'RPO Keep',
    '6': 'Power Back',
    '7': 'Deep Over',
    '8': 'Tempo Quarterback',
    '9': 'Red-Zone Target',
    '10': 'Vertical Shot',
    J: 'Play-Action Ace',
    Q: 'Chain Mover',
    K: 'Feature Back',
    A: 'Franchise Quarterback',
  },
  defense: {
    '2': 'Nickel Fit',
    '3': 'Edge Set',
    '4': 'Rally Tackle',
    '5': 'Robber Drop',
    '6': 'A-Gap Mug',
    '7': 'Press Corner',
    '8': 'Heat Check',
    '9': 'Red-Zone Wall',
    '10': 'Turnover Punch',
    J: 'Coverage Captain',
    Q: 'Ball Hawk',
    K: 'Pocket Wrecker',
    A: 'Field General',
  },
  specialTeams: {
    '2': 'Coverage Wedge',
    '3': 'Pooch Angle',
    '4': 'Gun Team',
    '5': 'Punt Pin',
    '6': 'Return Lane',
    '7': 'Hands Unit',
    '8': 'Fake Threat',
    '9': 'Long Snap Clock',
    '10': 'Field Flip',
    J: 'Kicker Nerve',
    Q: 'Return Captain',
    K: 'Hidden Yards',
    A: 'Specialist Ace',
  },
  crowd: {
    '2': 'Student Section',
    '3': 'Third-Down Hum',
    '4': 'Band Cue',
    '5': 'Towel Wave',
    '6': 'Goal-Line Noise',
    '7': 'Night Kickoff',
    '8': 'Whiteout',
    '9': 'Sideline Surge',
    '10': 'Stadium Pulse',
    J: 'Decibel Spike',
    Q: 'Home Stand',
    K: 'Rivalry Roar',
    A: 'Twelfth Man',
  },
};

export const PHASE_LABEL: Record<Phase, string> = {
  offense: 'Offense',
  defense: 'Defense',
  specialTeams: 'Special Teams',
  crowd: 'Crowd',
};

export const PHASE_SHORT: Record<Phase, string> = {
  offense: 'OFF',
  defense: 'DEF',
  specialTeams: 'ST',
  crowd: 'CRD',
};

export const PHASE_COLOR: Record<Phase, string> = {
  offense: '#5fb4ff',
  defense: '#ff7c93',
  specialTeams: '#f4c24f',
  crowd: '#a987ff',
};

export function createFourthPhaseDeck(): FourthPhaseCard[] {
  const cards: FourthPhaseCard[] = [];
  for (const phase of PHASES) {
    for (const rank of RANKS) {
      cards.push({
        id: `${phase}-${rank}`,
        phase,
        rank,
        value: RANK_VALUE[rank],
        tier: RANK_TIER[rank],
        roleName: ROLE_NAMES[phase][rank],
        tags: [phase, RANK_TIER[rank]],
      });
    }
  }
  return cards;
}

export function cardDisplayName(card: FourthPhaseCard): string {
  return `${card.rank} ${card.roleName}`;
}

export function shuffleFourthPhase<T>(items: readonly T[], rng: RNG): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffledFourthPhaseDeck(seed: number | string): FourthPhaseCard[] {
  const numericSeed = typeof seed === 'number' ? seed : stringSeed(seed);
  return shuffleFourthPhase(createFourthPhaseDeck(), mulberry32(numericSeed));
}

function bump(card: FourthPhaseCard, amount: number, tag: string): FourthPhaseCard {
  return { ...card, value: card.value + amount, tags: [...card.tags, tag] };
}

export function prepareFourthPhaseTeamDeck(team: FourthPhaseTeamKey): FourthPhaseCard[] {
  return createFourthPhaseDeck().map((card) => {
    if (team === 'balanced') return card;
    if (team === 'airRaid' && (card.phase === 'offense' || card.phase === 'crowd') && ['9', '10', 'J', 'Q', 'K', 'A'].includes(card.rank)) {
      return bump({ ...card, edition: card.phase === 'crowd' ? 'crowdFavorite' : 'homeRun' }, 1, 'air-raid');
    }
    if (team === 'smashmouth' && (card.phase === 'offense' || card.phase === 'specialTeams') && ['2', '3', '4', '5', '6', '7', '8'].includes(card.rank)) {
      return bump({ ...card, modifier: card.phase === 'offense' ? 'reliable' : undefined }, 2, 'smashmouth');
    }
    if (team === 'blackAndBlue' && (card.phase === 'defense' || card.phase === 'specialTeams')) {
      return bump({ ...card, modifier: card.phase === 'defense' ? 'reliable' : undefined }, 1, 'black-and-blue');
    }
    if (team === 'loudHouse' && card.phase === 'crowd') {
      return bump({ ...card, edition: 'crowdFavorite' }, 1, 'loud-house');
    }
    if (team === 'specialTeamsChaos' && card.phase === 'specialTeams') {
      return bump({ ...card, modifier: 'explosive' }, 2, 'special-teams-chaos');
    }
    return card;
  });
}
