import { useState, useCallback, useEffect } from 'react';
import type { Achievement, Screen, Lineup, ContestResult, ModifierKey, BoonKey, UserProfile, TournamentType, RunSummary, UnlockReward } from './types';
import { TIER_ENTRY_FEE } from './types';
import { generateSlate } from './lib/slateGenerator';
import { runContest } from './lib/simulation';
import { getLineupPlayers } from './lib/lineupValidation';
import { scoreRogueLineup, type RogueScoreResult } from './lib/rogueScoring';
import { loadProfile, saveProfile, updateStreak, applyContestResult, todayDateStr } from './lib/storage';
import { DEFAULT_TOURNAMENT_TYPE, isTournamentType } from './lib/payout';
import LineupBuilder from './components/LineupBuilder';
import SweatScreen from './components/SweatScreen';
import ResultsScreen from './components/ResultsScreen';
import CareerScreen from './components/CareerScreen';
import RunOverScreen from './components/RunOverScreen';
import RogueResultsScreen from './components/RogueResultsScreen';
import FootballSeason from './components/FootballSeason';
import FootballHome from './components/FootballHome';

const DAILY_TOURNAMENT_KEY = 'slateboss_daily_tournament';

function loadDailyTournament(): TournamentType {
  try {
    const saved = localStorage.getItem(DAILY_TOURNAMENT_KEY);
    return isTournamentType(saved) ? saved : DEFAULT_TOURNAMENT_TYPE;
  } catch {
    return DEFAULT_TOURNAMENT_TYPE;
  }
}

function saveDailyTournament(t: TournamentType) {
  try { localStorage.setItem(DAILY_TOURNAMENT_KEY, t); } catch { /* noop */ }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('football_home');
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [contestResult, setContestResult] = useState<ContestResult | null>(null);
  const [lockedLineup, setLockedLineup] = useState<Lineup | null>(null);
  const [isCareerMode, setIsCareerMode] = useState(false);
  const [isRogueMode, setIsRogueMode] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentType>(() => loadDailyTournament());
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [recentUnlocks, setRecentUnlocks] = useState<UnlockReward[]>([]);
  const [rogueScore, setRogueScore] = useState<RogueScoreResult | null>(null);

  const today = todayDateStr();
  const slate = isRogueMode
    ? generateSlate(`rogue-prototype-${today}`)
    : isCareerMode && profile.run.isActive
    ? generateSlate(`career-${profile.run.runNumber}-week-${profile.run.currentWeek}`, { week: profile.run.currentWeek })
    : generateSlate(today);

  useEffect(() => { saveProfile(profile); }, [profile]);

  const handleTournamentChange = useCallback((t: TournamentType) => {
    setSelectedTournament(t);
    if (!isCareerMode) saveDailyTournament(t);
  }, [isCareerMode]);

  const handleFootballHome = useCallback(() => {
    setIsCareerMode(false);
    setIsRogueMode(false);
    setRogueScore(null);
    setScreen('football_home');
  }, []);

  const handleFootballPlay = useCallback(() => {
    setScreen('football');
  }, []);

  const handleStartRun = useCallback((modifier: ModifierKey | null, boon: BoonKey | null) => {
    setProfile((prev) => {
      const runNumber = prev.run.runNumber + 1;
      return {
        ...prev,
        run: {
          ...prev.run,
          runNumber,
          bankroll: 25,
          tier: 1,
          slatesRemaining: 10,
          currentWeek: 1,
          equippedModifier: modifier,
          equippedBoon: boon,
          bubbleShieldUsed: false,
          isActive: true,
          lastTournamentType: DEFAULT_TOURNAMENT_TYPE,
          peakBankroll: 25,
          slateCashed: 0,
        },
      };
    });
    setIsCareerMode(true);
    setIsRogueMode(false);
    setRogueScore(null);
    setSelectedTournament(DEFAULT_TOURNAMENT_TYPE);
    setScreen('builder');
  }, []);

  const handleContinueRun = useCallback(() => {
    setIsCareerMode(true);
    setIsRogueMode(false);
    setRogueScore(null);
    setSelectedTournament(profile.run.lastTournamentType ?? DEFAULT_TOURNAMENT_TYPE);
    setScreen('builder');
  }, [profile.run.lastTournamentType]);

  const handleEnterContest = useCallback((lineup: Lineup) => {
    const entryFee = isCareerMode ? TIER_ENTRY_FEE[profile.run.tier] : 1;
    const modifier = isCareerMode ? profile.run.equippedModifier : null;
    // First daily contest is always Safe 50/50, regardless of the picker state.
    const firstSession = !isCareerMode && !isRogueMode && profile.totalContestsPlayed === 0;
    const tournamentForContest = isRogueMode ? 'mini_gpp' : firstSession ? DEFAULT_TOURNAMENT_TYPE : selectedTournament;
    const result = runContest(lineup, slate, entryFee, modifier, tournamentForContest, profile.totalContestsPlayed);
    if (isRogueMode) {
      setRogueScore(scoreRogueLineup({
        players: getLineupPlayers(lineup),
        basePoints: result.userScore,
        slate,
      }));
    } else {
      setRogueScore(null);
    }
    setContestResult(result);
    setLockedLineup(lineup);
    setScreen('sweat');
  }, [slate, isCareerMode, isRogueMode, profile, selectedTournament]);

  const handleSweatDone = useCallback(() => {
    setScreen('results');
    if (!contestResult) return;
    if (isRogueMode) return;

    setProfile((prev) => {
      const profBeforeResult = isCareerMode ? prev : updateStreak(prev);
      if (!lockedLineup) return profBeforeResult;
      const { next, runJustEnded, newAchievements, newUnlocks } = applyContestResult(profBeforeResult, contestResult, isCareerMode, lockedLineup);
      if (runJustEnded) setRunSummary(runJustEnded);
      setRecentAchievements(newAchievements);
      setRecentUnlocks(newUnlocks);
      setContestResult({ ...contestResult });
      return next;
    });
  }, [contestResult, isCareerMode, isRogueMode, lockedLineup]);

  const handleBackHome = useCallback(() => {
    setScreen('football_home');
    setContestResult(null);
    setLockedLineup(null);
    setRogueScore(null);
    setIsRogueMode(false);
    setRecentAchievements([]);
    setRecentUnlocks([]);
  }, []);

  const handleBuilderBack = useCallback(() => {
    if (isRogueMode) {
      handleBackHome();
      return;
    }
    setScreen(isCareerMode ? 'career' : 'football_home');
  }, [handleBackHome, isCareerMode, isRogueMode]);

  const handleRogueReplay = useCallback(() => {
    setIsCareerMode(false);
    setIsRogueMode(true);
    setContestResult(null);
    setLockedLineup(null);
    setRogueScore(null);
    setScreen('builder');
  }, []);

  const handleGoCareerFromResults = useCallback(() => {
    if (runSummary) {
      setScreen('run_over');
    } else {
      setScreen('career');
    }
    setContestResult(null);
    setLockedLineup(null);
    setRecentAchievements([]);
    setRecentUnlocks([]);
  }, [runSummary]);

  const handleRunOverNewRun = useCallback(() => {
    setRunSummary(null);
    setScreen('career');
  }, []);

  const handleRunOverHome = useCallback(() => {
    setRunSummary(null);
    setScreen('football_home');
  }, []);

  const entryFee = isCareerMode ? TIER_ENTRY_FEE[profile.run.tier] : 1;

  switch (screen) {
    case 'home':
      return <FootballHome onPlay={handleFootballPlay} />;

    case 'football_home':
      return <FootballHome onPlay={handleFootballPlay} />;

    case 'builder':
      return (
        <LineupBuilder
          slate={slate}
          onEnterContest={handleEnterContest}
          onBack={handleBuilderBack}
          isCareer={isCareerMode}
          isFirstSession={!isCareerMode && !isRogueMode && profile.totalContestsPlayed === 0}
          entryFee={entryFee}
          selectedTournament={isRogueMode ? 'mini_gpp' : selectedTournament}
          onTournamentChange={handleTournamentChange}
          activeBoon={isCareerMode ? profile.run.equippedBoon : null}
          isRogue={isRogueMode}
        />
      );

    case 'sweat':
      if (!contestResult || !lockedLineup) return null;
      return (
        <SweatScreen
          result={contestResult}
          lineup={lockedLineup}
          onDone={handleSweatDone}
        />
      );

    case 'results':
      if (!contestResult) return null;
      if (isRogueMode) {
        if (!lockedLineup || !rogueScore) return null;
        return (
          <RogueResultsScreen
            result={contestResult}
            lineup={lockedLineup}
            rogueScore={rogueScore}
            onHome={handleBackHome}
            onReplay={handleRogueReplay}
          />
        );
      }
      return (
        <ResultsScreen
          result={contestResult}
          streak={profile.dailyStreak}
          onHome={handleBackHome}
          onCareer={handleGoCareerFromResults}
          newAchievements={recentAchievements}
          newUnlocks={recentUnlocks}
        />
      );

    case 'football':
      return <FootballSeason onHome={handleFootballHome} />;

    case 'career':
      return (
        <CareerScreen
          profile={profile}
          onStartRun={handleStartRun}
          onContinueRun={handleContinueRun}
          onHome={handleFootballHome}
        />
      );

    case 'run_over':
      if (!runSummary) { setScreen('career'); return null; }
      return (
        <RunOverScreen
          summary={runSummary}
          bestRunScore={profile.run.bestRunScore}
          onNewRun={handleRunOverNewRun}
          onHome={handleRunOverHome}
        />
      );

    default:
      return null;
  }
}
