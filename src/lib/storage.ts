import type { Achievement, UnlockReward, UserProfile, RunState, ContestResult, ContestTier, RunSummary, Lineup } from '../types';
import { TIER_PROMOTION_BANKROLL, TIER_ENTRY_FEE } from '../types';
import { evaluateAchievements } from './achievements';
import { cashLineRank } from './payout';

const STORAGE_VERSION = 3;
const KEY = 'slateboss_v3';

const DEFAULT_RUN: RunState = {
  runNumber: 0,
  bankroll: 25,
  tier: 1,
  slatesRemaining: 10,
  currentWeek: 1,
  equippedModifier: null,
  equippedBoon: null,
  bubbleShieldUsed: false,
  isActive: false,
  bestRunScore: 0,
  lastTournamentType: 'double_up',
  peakBankroll: 25,
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
  achievementIds: [],
  unlockIds: [],
  achievementPoints: 0,
  run: DEFAULT_RUN,
  careerRunHistory: [],
};

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Try migrating from v1
      const old = localStorage.getItem('slateboss_v2') ?? localStorage.getItem('slateboss_v1');
      if (old) {
        const parsed = JSON.parse(old);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          version: STORAGE_VERSION,
          xp: parsed.xp ?? 0,
          level: parsed.level ?? 1,
          totalContestsPlayed: parsed.totalContestsPlayed ?? 0,
          totalCashed: parsed.totalCashed ?? 0,
          totalWinnings: parsed.totalWinnings ?? 0,
          achievementIds: parsed.achievementIds ?? [],
          unlockIds: parsed.unlockIds ?? [],
          achievementPoints: parsed.achievementPoints ?? 0,
          run: { ...DEFAULT_RUN, ...(parsed.run ?? {}) },
        };
      }
      return { ...DEFAULT_PROFILE };
    }
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION) return { ...DEFAULT_PROFILE };
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      achievementIds: parsed.achievementIds ?? [],
      unlockIds: parsed.unlockIds ?? [],
      achievementPoints: parsed.achievementPoints ?? 0,
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
  isCareer: boolean,
  lineup: Lineup
): { next: UserProfile; runJustEnded: RunSummary | null; newAchievements: Achievement[]; newUnlocks: UnlockReward[] } {
  const { payout, xpGained, userRank } = result;
  const newXP = profile.xp + xpGained;
  const newLevel = Math.floor(newXP / 200) + 1;
  const cashed = payout > 0;

  let run = { ...profile.run };
  let runJustEnded: RunSummary | null = null;

  if (isCareer && run.isActive) {
    let effectivePayout = payout;
    if (run.equippedBoon === 'bubble_shield' && !run.bubbleShieldUsed && payout === 0) {
      const allScores = [...result.field.map((entry) => entry.totalScore), result.userScore].sort((a, b) => b - a);
      const cashRank = cashLineRank(result.totalEntrants, result.tournament.key);
      const cashScore = allScores[cashRank - 1];
      const missBy = cashScore - result.userScore;
      if (missBy > 0 && missBy <= 2) {
        effectivePayout = result.entryFee;
        result.boonRefund = result.entryFee;
        result.boonMessage = `Bubble Shield refunded your $${result.entryFee.toFixed(2)} entry after a ${missBy.toFixed(1)} point near miss.`;
        run.bubbleShieldUsed = true;
      }
    }

    const newBankroll = run.bankroll - result.entryFee + effectivePayout;
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

  const profileAfterContest: UserProfile = {
    ...profile,
    xp: newXP,
    level: newLevel,
    totalContestsPlayed: profile.totalContestsPlayed + 1,
    totalCashed: profile.totalCashed + (cashed ? 1 : 0),
    bestFinishRank: Math.min(profile.bestFinishRank, userRank),
    totalWinnings: profile.totalWinnings + payout + (result.boonRefund ?? 0),
    run,
    lastDailyResult: isCareer ? profile.lastDailyResult : result,
    careerRunHistory: runJustEnded
      ? [...profile.careerRunHistory, runJustEnded]
      : profile.careerRunHistory,
  };

  const { newAchievements, newUnlocks } = evaluateAchievements({
    profileBefore: profile,
    profileAfter: profileAfterContest,
    result,
    lineup,
    isCareer,
    runJustEnded,
  });

  const newAchievementIds = newAchievements.map((achievement) => achievement.id);
  const newUnlockIds = newUnlocks.map((unlock) => unlock.id);
  const newAchievementPoints = newAchievements.reduce((sum, achievement) => sum + achievement.points, 0);

  const next: UserProfile = {
    ...profileAfterContest,
    achievementIds: [...new Set([...(profileAfterContest.achievementIds ?? []), ...newAchievementIds])],
    unlockIds: [...new Set([...(profileAfterContest.unlockIds ?? []), ...newUnlockIds])],
    achievementPoints: (profileAfterContest.achievementPoints ?? 0) + newAchievementPoints,
    xp: profileAfterContest.xp + newAchievementPoints,
    level: Math.floor((profileAfterContest.xp + newAchievementPoints) / 200) + 1,
  };

  // Backfill collection milestone achievements unlocked by the first achievement batch.
  const collectionBackfill = evaluateAchievements({
    profileBefore: profileAfterContest,
    profileAfter: next,
    result,
    lineup,
    isCareer,
    runJustEnded,
  });
  const backfillAchievements = collectionBackfill.newAchievements.filter((achievement) => !next.achievementIds.includes(achievement.id));
  const backfillUnlocks = collectionBackfill.newUnlocks.filter((unlock) => !next.unlockIds.includes(unlock.id));

  if (backfillAchievements.length || backfillUnlocks.length) {
    const backfillPoints = backfillAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
    next.achievementIds = [...new Set([...next.achievementIds, ...backfillAchievements.map((achievement) => achievement.id)])];
    next.unlockIds = [...new Set([...next.unlockIds, ...backfillUnlocks.map((unlock) => unlock.id)])];
    next.achievementPoints += backfillPoints;
    next.xp += backfillPoints;
    next.level = Math.floor(next.xp / 200) + 1;
    newAchievements.push(...backfillAchievements);
    newUnlocks.push(...backfillUnlocks);
  }

  return { next, runJustEnded, newAchievements, newUnlocks };
}
