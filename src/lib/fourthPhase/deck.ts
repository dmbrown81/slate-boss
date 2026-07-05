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
    '3': 'Bubble Motion',
    '4': 'Stick Quick',
    '5': 'Zone Read RPO',
    '6': 'Inside Zone',
    '7': 'Mesh Crossers',
    '8': 'Tempo Drive',
    '9': 'Red-Zone Fade',
    '10': 'Four Verts',
    J: 'Play Action Boot',
    Q: 'Y-Cross',
    K: 'Duo',
    A: 'Deep Choice',
  },
  defense: {
    '2': '4-3 Run Fit',
    '3': 'Edge Set',
    '4': 'Rally Tackle',
    '5': 'Robber Coverage',
    '6': 'A-Gap Mug',
    '7': 'Press Man',
    '8': 'Zero Blitz',
    '9': 'Sim Pressure',
    '10': 'Strip Sack',
    J: 'Coverage Disguise',
    Q: 'Ball Hawk',
    K: 'Edge Pressure',
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

const PLAY_TAGS: Record<Phase, Record<Rank, string[]>> = {
  offense: {
    '2': ['formation:iForm', 'concept:qbSneak', 'kind:run'],
    '3': ['formation:trips', 'concept:bubble', 'kind:pass', 'kind:quickGame', 'setup:space', 'setup:motion'],
    '4': ['formation:trips', 'concept:stick', 'kind:pass', 'kind:quickGame', 'setup:space'],
    '5': ['formation:pistol', 'concept:zoneRead', 'kind:run', 'kind:rpo', 'setup:optionStress'],
    '6': ['formation:ace', 'concept:insideZone', 'kind:run', 'family:zoneRun'],
    '7': ['formation:bunch', 'concept:mesh', 'kind:pass', 'kind:quickGame', 'setup:space'],
    '8': ['formation:trips', 'concept:tempo', 'kind:pass', 'kind:quickGame', 'setup:tempo'],
    '9': ['formation:singleback', 'concept:fade', 'kind:pass', 'kind:shot', 'result:explosive'],
    '10': ['formation:trips', 'concept:fourVerts', 'kind:pass', 'kind:shot', 'result:explosive'],
    J: ['formation:singleback', 'concept:boot', 'kind:pass', 'kind:playAction', 'kind:shot'],
    Q: ['formation:trips', 'concept:yCross', 'kind:pass', 'kind:shot', 'setup:space'],
    K: ['formation:ace', 'concept:duo', 'kind:run', 'family:gapRun'],
    A: ['formation:empty', 'concept:choice', 'kind:pass', 'kind:shot', 'result:explosive'],
  },
  defense: {
    '2': ['formation:4-3', 'concept:runFit', 'kind:coverage', 'defense:runFit'],
    '3': ['formation:4-3', 'concept:edgeSet', 'kind:coverage', 'defense:runFit'],
    '4': ['formation:4-3', 'concept:rally', 'kind:coverage', 'defense:zone'],
    '5': ['formation:4-2-5', 'concept:robber', 'kind:coverage', 'kind:disguise', 'defense:zone'],
    '6': ['formation:4-2-5', 'concept:aGapMug', 'kind:pressure', 'defense:blitz'],
    '7': ['formation:4-2-5', 'concept:pressMan', 'kind:coverage', 'defense:man'],
    '8': ['formation:4-2-5', 'concept:zeroBlitz', 'kind:pressure', 'defense:blitz'],
    '9': ['formation:4-2-5', 'concept:simPressure', 'kind:pressure', 'kind:disguise', 'defense:zone'],
    '10': ['formation:4-2-5', 'concept:stripSack', 'kind:pressure', 'kind:takeaway', 'setup:shortField'],
    J: ['formation:quarters', 'concept:disguise', 'kind:coverage', 'kind:disguise', 'defense:shell'],
    Q: ['formation:quarters', 'concept:ballHawk', 'kind:coverage', 'kind:takeaway', 'setup:shortField'],
    K: ['formation:3-4', 'concept:edgePressure', 'kind:pressure', 'defense:blitz'],
    A: ['formation:quarters', 'concept:greenDot', 'kind:coverage', 'kind:takeaway', 'defense:shell'],
  },
  specialTeams: {
    '2': ['unit:coverage'],
    '3': ['unit:kickoff', 'setup:fieldFlip'],
    '4': ['unit:coverage'],
    '5': ['unit:punt', 'setup:pinDeep'],
    '6': ['unit:return'],
    '7': ['unit:hands'],
    '8': ['unit:fake', 'setup:conversion'],
    '9': ['unit:punt', 'setup:fieldFlip'],
    '10': ['unit:punt', 'setup:shortField'],
    J: ['unit:kicker'],
    Q: ['unit:return'],
    K: ['unit:fieldPosition', 'setup:fieldFlip'],
    A: ['unit:weapon'],
  },
  crowd: {
    '2': ['venue:studentSection'],
    '3': ['venue:pregame'],
    '4': ['venue:drumline'],
    '5': ['venue:towelWave'],
    '6': ['venue:noise'],
    '7': ['venue:lights'],
    '8': ['venue:whiteout'],
    '9': ['venue:noise'],
    '10': ['venue:thirdDown'],
    J: ['venue:hostile'],
    Q: ['venue:homecoming'],
    K: ['venue:rivalry'],
    A: ['venue:homeField'],
  },
};

const TAG_CHIP_LABELS: Record<string, string> = {
  'formation:iForm': 'I-FORM',
  'formation:singleback': 'SINGLE',
  'formation:pistol': 'PISTOL',
  'formation:trips': 'TRIPS',
  'formation:bunch': 'BUNCH',
  'formation:empty': 'EMPTY',
  'formation:ace': 'ACE',
  'formation:4-3': '4-3',
  'formation:4-2-5': '4-2-5',
  'formation:3-4': '3-4',
  'formation:quarters': 'QUARTERS',
  'kind:run': 'RUN',
  'kind:pass': 'PASS',
  'kind:rpo': 'RPO',
  'kind:playAction': 'PLAY ACTION',
  'kind:quickGame': 'QUICK',
  'kind:shot': 'SHOT',
  'kind:pressure': 'PRESSURE',
  'kind:coverage': 'COVERAGE',
  'kind:takeaway': 'TAKEAWAY',
  'kind:disguise': 'DISGUISE',
  'setup:tempo': 'TEMPO',
  'setup:shortField': 'SHORT FIELD',
  'setup:space': 'SPACE',
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

export function hasCardTag(card: FourthPhaseCard, tag: string): boolean {
  return card.tags.includes(tag);
}

export function cardTagsWithPrefix(card: FourthPhaseCard, prefix: string): string[] {
  return card.tags.filter((tag) => tag.startsWith(prefix));
}

export function tagChipLabel(tag: string): string {
  return TAG_CHIP_LABELS[tag] ?? tag.split(':').at(-1)?.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase() ?? tag.toUpperCase();
}

export function cardPlayChips(card: FourthPhaseCard): string[] {
  const priority = card.tags.filter((tag) => (
    tag.startsWith('formation:')
    || tag === 'kind:playAction'
    || tag === 'kind:rpo'
    || tag === 'kind:shot'
    || tag === 'kind:takeaway'
    || tag === 'kind:pressure'
    || tag === 'kind:run'
    || tag === 'kind:quickGame'
    || tag === 'kind:coverage'
    || tag === 'setup:tempo'
    || tag === 'setup:shortField'
  ));
  return priority.slice(0, 2).map(tagChipLabel);
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
        tags: [phase, RANK_TIER[rank], ...PLAY_TAGS[phase][rank]],
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
