import { mulberry32, stringSeed, type RNG } from '../rng';
import { crowdChargeForRank } from './meter';
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
    '2': 'QB Sneak',
    '3': 'Slot Motion',
    '4': 'Quick Out',
    '5': 'RPO Keep',
    '6': 'Power Back',
    '7': 'Deep Over',
    '8': 'No-Huddle',
    '9': 'Red-Zone Target',
    '10': 'Shot Play',
    J: 'Play Action',
    Q: 'Chain Mover',
    K: 'Feature Back',
    A: 'Franchise Quarterback',
  },
  defense: {
    '2': 'Run Fit',
    '3': 'Edge Set',
    '4': 'Rally Tackle',
    '5': 'Robber Drop',
    '6': 'A-Gap Mug',
    '7': 'Press Corner',
    '8': 'Zero Blitz',
    '9': 'Third-Down Stop',
    '10': 'Strip Sack',
    J: 'Coverage Disguise',
    Q: 'Ball Hawk',
    K: 'Sack Artist',
    A: 'Green Dot',
  },
  specialTeams: {
    '2': 'Coverage Lane',
    '3': 'Pooch Kick',
    '4': 'Gunner',
    '5': 'Coffin Corner',
    '6': 'Return Lane',
    '7': 'Hands Team',
    '8': 'Fake Punt',
    '9': 'Directional Punt',
    '10': 'Pin Deep',
    J: 'Automatic',
    Q: 'Return Captain',
    K: 'Hidden Yards',
    A: 'The Weapon',
  },
  crowd: {
    '2': 'Student Section',
    '3': 'Pregame Buzz',
    '4': 'Drumline',
    '5': 'Towel Wave',
    '6': 'On Their Feet',
    '7': 'Under the Lights',
    '8': 'Whiteout',
    '9': 'Deafening',
    '10': 'Third-Down Roar',
    J: 'Hostile Environment',
    Q: 'Homecoming',
    K: 'Rivalry Week',
    A: 'Home Field',
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

/**
 * The job each phase does, in the player's mental model. Card faces and legends
 * lead with these instead of the bare football noun — "Defense" alone reads as
 * "stops the other team", which is not what red cards do here.
 */
export const PHASE_JOB: Record<Phase, string> = {
  offense: 'Gain Yards',
  defense: 'Leverage',
  specialTeams: 'Hidden Yards',
  crowd: 'Momentum',
};

/**
 * What this specific card contributes when it resolves, phrased so a card face
 * teaches its own job. Offense states its yardage payload, Crowd states its exact
 * meter charge, Defense/ST state the resource they feed.
 */
export function cardContributionLabel(card: FourthPhaseCard): string {
  if (card.phase === 'offense') return `+${card.value} Yards`;
  if (card.phase === 'crowd') return `+${crowdChargeForRank(card.rank).toFixed(1)} momentum`;
  if (card.phase === 'defense') return 'Leverage';
  return 'Hidden Yards';
}

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
