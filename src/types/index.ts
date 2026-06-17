export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'DST';
export type RosterSlot = 'QB' | 'RB1' | 'RB2' | 'WR1' | 'WR2' | 'TE' | 'FLEX' | 'DST';
export type Archetype =
  | 'pocket_qb' | 'rushing_qb'
  | 'workhorse_rb' | 'pass_catching_rb'
  | 'alpha_wr' | 'boom_bust_wr' | 'possession_wr' | 'slot_wr'
  | 'redzone_te' | 'punt_te'
  | 'strong_dst' | 'risky_dst';

export interface Player {
  id: string;
  name: string;
  team: string;
  opponent: string;
  position: Position;
  archetype: Archetype;
  salary: number;
  trueProjection: number;
  displayedProjection: number;
  floor: number;
  ceiling: number;
  volatility: number;
  boomChance: number;
  ownership: number;
  form: 'hot' | 'cold' | 'normal';
  gameId: string;
  recentGames: RecentGame[];
  seasonStats: SeasonStats;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
}

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  gameScriptFactor: number; // -1 low, 0 neutral, +1 shootout
}

export interface RecentGame {
  week: number;
  opponent: string;
  points: number;
  usage: number;
  note: string;
}

export interface SeasonStats {
  games: number;
  avgPoints: number;
  avgUsage: number;
  highScore: number;
  consistency: number;
}

export type SlateModifierKey =
  | 'windy' | 'shootout' | 'grind' | 'primetime' | 'sloppy';

export interface SlateModifier {
  key: SlateModifierKey;
  label: string;
  description: string;
  apply: (player: Player) => Partial<Player>;
}

export interface NewsEvent {
  id: string;
  playerId: string;
  headline: string;
  detail: string;
  projectionDelta: number;
  ownershipDelta: number;
  ceilingDelta: number;
  triggerAtMinute: number; // 1 or 2 (minutes into builder session)
}

export interface Slate {
  slateNumber: number;
  date: string;
  seed: number;
  week: number;
  modifier: SlateModifier;
  players: Player[];
  games: Game[];
  newsEvents: NewsEvent[];
}

export type TournamentType = 'mini_gpp' | 'large_gpp' | 'double_up' | 'winner_take_all';

export interface TournamentConfig {
  key: TournamentType;
  name: string;
  description: string;
  entrants: number;
  prizeSummary: string;
  difficulty: string;
}

export interface Lineup {
  QB: Player | null;
  RB1: Player | null;
  RB2: Player | null;
  WR1: Player | null;
  WR2: Player | null;
  TE: Player | null;
  FLEX: Player | null;
  DST: Player | null;
}

export const ROSTER_SLOTS: RosterSlot[] = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'DST'];
export const SALARY_CAP = 50000;

export interface PlayerScore {
  playerId: string;
  q1: number;
  q2: number;
  q3: number;
  final: number;
  boomHit: boolean;
  events: string[];
}

export interface ContestEntry {
  lineupPlayers: Player[];
  scores: PlayerScore[];
  totalScore: number;
  isUser: boolean;
}

export interface ContestResult {
  userEntry: ContestEntry;
  field: ContestEntry[];
  userRank: number;
  userScore: number;
  totalEntrants: number;
  payout: number;
  entryFee: number;
  tournament: TournamentConfig;
  xpGained: number;
  bestPlayer: Player;
  worstPlayer: Player;
  bestValue: Player;
  biggestRegret: Player | null;
  grades: LineupGrades;
  shareCard: string;
  quarterRanks: [number, number, number, number];
  boonRefund?: number;
  boonMessage?: string;
}

export type AchievementCategory = 'starter' | 'contest' | 'lineup' | 'sweat' | 'career' | 'collection';
export type AchievementRarity = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  unlockId?: string;
}

export interface UnlockReward {
  id: string;
  name: string;
  description: string;
  kind: 'boon' | 'cosmetic' | 'mode' | 'title';
}

export interface LineupGrades {
  buildQuality: BuildQualityAnalysis;
  outcomeLuck: OutcomeLuckAnalysis;
  value: string;
  valueSentence: string;
  ceiling: string;
  ceilingSentence: string;
  leverage: string;
  leverageSentence: string;
  risk: string;
  riskSentence: string;
  salaryEfficiency: string;
  salaryEfficiencySentence: string;
}

export interface BuildQualityAnalysis {
  score: number;
  grade: string;
  label: string;
  sentence: string;
  contestFit: string;
  salaryUse: string;
  stackQuality: string;
  riskProfile: string;
  lesson: string;
}

export interface OutcomeLuckAnalysis {
  score: number;
  grade: string;
  label: 'Hot' | 'Normal' | 'Cold';
  sentence: string;
  playersAboveProjection: number;
  playersBelowFloor: number;
  biggestSwingPlayerId: string | null;
}

// Career / persistence
export type ContestTier = 1 | 2 | 3 | 4;
export const TIER_LABELS: Record<ContestTier, string> = {
  1: '$1 Grinder',
  2: '$5 Contender',
  3: '$25 Challenger',
  4: '$100 Shark',
};
export const TIER_ENTRY_FEE: Record<ContestTier, number> = { 1: 1, 2: 5, 3: 25, 4: 100 };
export const TIER_PROMOTION_BANKROLL: Record<ContestTier, number> = { 1: 50, 2: 150, 3: 500, 4: Infinity };

export type ModifierKey = 'scout' | 'anchor_defense' | 'correlated';
export type BoonKey = 'bubble_shield' | 'value_finder' | 'stack_meter_plus';
export interface Modifier {
  key: ModifierKey;
  name: string;
  description: string;
  xpCost: number;
}

export type TitleKey = 'rookie_grinder' | 'value_hunter' | 'leverage_scout' | 'slate_boss';
export const TITLES: Record<TitleKey, { label: string; xpRequired: number }> = {
  rookie_grinder: { label: 'Rookie Grinder', xpRequired: 0 },
  value_hunter: { label: 'Value Hunter', xpRequired: 500 },
  leverage_scout: { label: 'Leverage Scout', xpRequired: 1500 },
  slate_boss: { label: 'Slate Boss', xpRequired: 4000 },
};

export interface RunState {
  runNumber: number;
  bankroll: number;
  tier: ContestTier;
  slatesRemaining: number;
  currentWeek: number;
  equippedModifier: ModifierKey | null;
  equippedBoon: BoonKey | null;
  bubbleShieldUsed: boolean;
  isActive: boolean;
  bestRunScore: number;
  lastTournamentType: TournamentType;
  peakBankroll: number;
  slateCashed: number;
}

export interface UserProfile {
  version: number;
  xp: number;
  level: number;
  dailyStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
  lastDailyResult: ContestResult | null;
  totalContestsPlayed: number;
  totalCashed: number;
  bestFinishRank: number;
  totalWinnings: number;
  unlockedModifiers: ModifierKey[];
  achievementIds: string[];
  unlockIds: string[];
  achievementPoints: number;
  run: RunState;
  careerRunHistory: RunSummary[];
}

export type Screen = 'home' | 'builder' | 'sweat' | 'results' | 'career' | 'run_over' | 'football';

export interface RunSummary {
  runNumber: number;
  finalBankroll: number;
  slatesPlayed: number;
  peakBankroll: number;
  totalCashed: number;
  bestRank: number;
  endReason: 'bust' | 'completed';
}
