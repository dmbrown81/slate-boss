export type Phase = 'offense' | 'defense' | 'specialTeams' | 'crowd';

export const PHASES: readonly Phase[] = ['offense', 'defense', 'specialTeams', 'crowd'];

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export const RANKS: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export type CardTier =
  | 'rotation'
  | 'starter'
  | 'proBowl'
  | 'captain'
  | 'scheme'
  | 'playmaker'
  | 'franchise';

export type PlayerTrait =
  | 'reliable'
  | 'explosive'
  | 'clutch'
  | 'hometownHero'
  | 'injuryProne'
  | 'lockerRoomCancer'
  | 'agingVet'
  | 'holdout';

export type CardEdition = 'allPro' | 'inRhythm' | 'homeRun' | 'crowdFavorite';

export interface FourthPhaseCard {
  id: string;
  phase: Phase;
  rank: Rank;
  value: number;
  tier: CardTier;
  roleName: string;
  tags: string[];
  modifier?: PlayerTrait;
  edition?: CardEdition;
}

export type SituationKey =
  | 'checkdown'
  | 'drive'
  | 'stand'
  | 'fieldFlip'
  | 'blackout'
  | 'momentumShift'
  | 'houseCall'
  | 'pickSix'
  | 'complementaryFootball'
  | 'bustedPlay';

export interface PhaseCounts {
  offense: number;
  defense: number;
  specialTeams: number;
  crowd: number;
}

export interface SituationFuel {
  draw: number;
  money: number;
  discount: number;
}

export interface SituationResult {
  key: SituationKey;
  label: string;
  priority: number;
  counts: PhaseCounts;
  yardsSeed: number;
  executionSeed: number;
  meterBonus: number;
  bigPlaySeed: number;
  cashesMeter: boolean;
  bust: boolean;
  utility: boolean;
  fuel: SituationFuel;
  notes: string[];
}

export type FourthPhaseJokerId =
  | 'twelfthMan'
  | 'homeCooking'
  | 'sustainedDrive'
  | 'silentCount'
  | 'pickSixSpecialist'
  | 'theGenius'
  | 'fieldGeneral'
  | 'twoMinuteDrill'
  | 'roadWarriors'
  | 'bandwagon'
  | 'decibelRecord'
  | 'hurryUp';

export interface FourthPhaseJokerState {
  id: FourthPhaseJokerId;
}

export type FourthPhaseTeamKey =
  | 'balanced'
  | 'airRaid'
  | 'smashmouth'
  | 'blackAndBlue'
  | 'loudHouse'
  | 'specialTeamsChaos';

export type FourthPhaseBossKey =
  | 'none'
  | 'stackedBox'
  | 'noFlyZone'
  | 'roadGame'
  | 'turnoverDrill'
  | 'fieldPositionWar'
  | 'adaptiveDc'
  | 'preventDefense';

export type ScoreChannel = 'yards' | 'execution' | 'bigPlay' | 'meter' | 'fuel' | 'boss' | 'joker' | 'system';

export interface ScoreLedgerEntry {
  channel: ScoreChannel;
  label: string;
  value: string;
  detail?: string;
}

export interface FourthPhaseScoreContext {
  meter: number;
  meterCap: number;
  jokers: FourthPhaseJokerState[];
  discardsLeft: number;
  cardsPlayedThisDrive: number;
  driveIndex: number;
  targetRemaining?: number;
  wins: number;
  boss: FourthPhaseBossKey;
  repeatedSituations: Partial<Record<SituationKey, number>>;
}

export interface FourthPhaseScoreResult {
  situation: SituationResult;
  points: number;
  yards: number;
  execution: number;
  bigPlay: number;
  meterBefore: number;
  meterAfterCash: number;
  meterAfter: number;
  meterCap: number;
  meterCharged: number;
  didCash: boolean;
  fuel: SituationFuel;
  bust: boolean;
  isFinalPlay: boolean;
  ledger: ScoreLedgerEntry[];
}

export interface MeterState {
  meter: number;
  meterCap: number;
}
