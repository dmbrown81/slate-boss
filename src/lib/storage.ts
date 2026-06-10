import type { UserProfile, RunState, ContestResult, ContestTier, RunSummary } from '../types';
import { TIER_PROMOTION_BANKROLL, TIER_ENTRY_FEE } from '../types';

const STORAGE_VERSION = 2;
const KEY = 'slateboss_v2';

const DEFAULT_RUN: RunState = {
  runNumber: 0,
  bankroll: 15,
  tier: 1,
  slatesRemaining: 10,
  currentWeek: 1,
  equippedModifier: null,
  isActive: false,
  bestRunScore: 0,
  lastTournamentType: 'mini_gpp',
  peakBankroll: 15,
  slateCashed: 0,
};

export const DEFAULT_PROFILE: UserProfile = {
  version: STORAGE_VERSION,
  xp: 0,
  level: 1,
  dailyStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  lastDailyResult: null,
  totalContestsPlayed: 0,
  totalCashed: 0,
  bestFinishRank: 999,
  totalWinnings: 0,
  unlockedModifiers: ['scout', 'anchor_defense', 'correlated'],
  run: DEFAULT_RUN,
  careerRunHistory: [],
};

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Try migrating from v1
      const old = localStorage.getItem('slateboss_v1');
      if (old) {
        const parsed = JSON.parse(old);
        return {
          ...DEFAULT_PROFILE,
          xp: parsed.xp ?? 0,
          level: parsed.level ?? 1,
          totalContestsPlayed: parsed.totalContestsPlayed ?? 0,
          totalCashed: parsed.totalCashed ?? 0,
          totalWinnings: parsed.totalWinnings ?? 0,
        };
      }
      return { ...DEFAULT_PROFILE };
    }
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION) return { ...DEFAULT_PROFILE };
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      run: { ...DEFAULT_RUN, ...(parsed.run ?? {}) },
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // storage full or unavailable
  }
}

export function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function hasPlayedToday(profile: UserProfile): boolean {
  return profile.lastPlayedDate === todayDateStr();
}

export function updateStreak(profile: UserProfile): UserProfile {
  const today = todayDateStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let streak = profile.dailyStreak;
  if (profile.lastPlayedDate === yesterday) streak += 1;
  else if (profile.lastPlayedDate !== today) streak = 1;
  return {
    ...profile,
    lastPlayedDate: today,
    dailyStreak: streak,
    bestStreak: Math.max(profile.bestStreak, streak),
  };
}

// Returns { next: UserProfile, runJustEnded: RunSummary | null }
export function applyContestResult(
  profile: UserProfile,
  result: ContestResult,
  isCareer: boolean
): { next: UserProfile; runJustEnded: RunSummary | null } {
  const { payout, xpGained, userRank } = result;
  const newXP = profile.xp + xpGained;
  const newLevel = Math.floor(newXP / 200) + 1;
  const cashed = payout > 0;

  let run = { ...profile.run };
  let runJustEnded: RunSummary | null = null;

  if (isCareer && run.isActive) {
    const newBankroll = run.bankroll - result.entryFee + payout;
    run = {
      ...run,
      bankroll: newBankroll,
      slatesRemaining: run.slatesRemaining - 1,
      currentWeek: run.currentWeek + 1,
      lastTournamentType: result.tournament.key,
      peakBankroll: Math.max(run.peakBankroll, newBankroll),
      slateCashed: run.slateCashed + (cashed ? 1 : 0),
    };

    if (run.bankroll >= TIER_PROMOTION_BANKROLL[run.tier] && run.tier < 4) {
      run.tier = (run.tier + 1) as ContestTier;
    }

    const slatesPlayed = 10 - run.slatesRemaining;
    const isBust = run.bankroll < TIER_ENTRY_FEE[run.tier];
    const isComplete = run.slatesRemaining <= 0;

    if (isBust || isComplete) {
      run.bestRunScore = Math.max(run.bestRunScore, run.bankroll);
      run.isActive = false;
      runJustEnded = {
        runNumber: profile.run.runNumber,
        finalBankroll: run.bankroll,
        slatesPlayed,
        peakBankroll: run.peakBankroll,
        totalCashed: run.slateCashed,
        bestRank: Math.min(profile.bestFinishRank, userRank),
        endReason: isBust ? 'bust' : 'completed',
      };
    }
  }

  const next: UserProfile = {
    ...profile,
    xp: newXP,
    level: newLevel,
    totalContestsPlayed: profile.totalContestsPlayed + 1,
    totalCashed: profile.totalCashed + (cashed ? 1 : 0),
    bestFinishRank: Math.min(profile.bestFinishRank, userRank),
    totalWinnings: profile.totalWinnings + payout,
    run,
    lastDailyResult: isCareer ? profile.lastDailyResult : result,
    careerRunHistory: runJustEnded
      ? [...profile.careerRunHistory, runJustEnded]
      : profile.careerRunHistory,
  };

  return { next, runJustEnded };
}
