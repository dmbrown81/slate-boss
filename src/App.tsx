import { useState, useCallback, useEffect } from 'react';
import type { Achievement, Screen, Lineup, Player, ContestResult, ModifierKey, UserProfile, TournamentType, RunSummary, UnlockReward } from './types';
import { TIER_ENTRY_FEE } from './types';
import { generateSlate } from './lib/slateGenerator';
import { runContest } from './lib/simulation';
import { loadProfile, saveProfile, updateStreak, applyContestResult, todayDateStr } from './lib/storage';
import { DEFAULT_TOURNAMENT_TYPE, isTournamentType } from './lib/payout';
import HomeScreen from './components/HomeScreen';
import LineupBuilder from './components/LineupBuilder';
import SweatScreen from './components/SweatScreen';
import ResultsScreen from './components/ResultsScreen';
import CareerScreen from './components/CareerScreen';
import RunOverScreen from './components/RunOverScreen';

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
  const [screen, setScreen] = useState<Screen>('home');
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [contestResult, setContestResult] = useState<ContestResult | null>(null);
  const [lockedLineup, setLockedLineup] = useState<Lineup | null>(null);
  const [isCareerMode, setIsCareerMode] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentType>(() => loadDailyTournament());
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [recentUnlocks, setRecentUnlocks] = useState<UnlockReward[]>([]);

  const today = todayDateStr();
  const slate = isCareerMode && profile.run.isActive
    ? generateSlate(`career-${profile.run.runNumber}-week-${profile.run.currentWeek}`, { week: profile.run.currentWeek })
    : generateSlate(today);

  useEffect(() => { saveProfile(profile); }, [profile]);

  const handleTournamentChange = useCallback((t: TournamentType) => {
    setSelectedTournament(t);
    if (!isCareerMode) saveDailyTournament(t);
  }, [isCareerMode]);

  const handlePlayDaily = useCallback(() => {
    setIsCareerMode(false);
    setScreen('builder');
  }, []);

  const handleCareer = useCallback(() => {
    setScreen('career');
  }, []);

  const handleStartRun = useCallback((modifier: ModifierKey | null) => {
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
          isActive: true,
          lastTournamentType: DEFAULT_TOURNAMENT_TYPE,
          peakBankroll: 25,
          slateCashed: 0,
        },
      };
    });
    setIsCareerMode(true);
    setSelectedTournament(DEFAULT_TOURNAMENT_TYPE);
    setScreen('builder');
  }, []);

  const handleContinueRun = useCallback(() => {
    setIsCareerMode(true);
    setSelectedTournament(profile.run.lastTournamentType ?? DEFAULT_TOURNAMENT_TYPE);
    setScreen('builder');
  }, [profile.run.lastTournamentType]);

  const handleEnterContest = useCallback((lineup: Lineup, _players: Player[]) => {
    const entryFee = isCareerMode ? TIER_ENTRY_FEE[profile.run.tier] : 1;
    const modifier = isCareerMode ? profile.run.equippedModifier : null;
    // First daily contest is always Safe 50/50, regardless of the picker state.
    const firstSession = !isCareerMode && profile.totalContestsPlayed === 0;
    const tournamentForContest = firstSession ? DEFAULT_TOURNAMENT_TYPE : selectedTournament;
    const result = runContest(lineup, slate, entryFee, modifier, tournamentForContest, profile.totalContestsPlayed);
    setContestResult(result);
    setLockedLineup(lineup);
    setScreen('sweat');
  }, [slate, isCareerMode, profile, selectedTournament]);

  const handleSweatDone = useCallback(() => {
    setScreen('results');
    if (!contestResult) return;

    setProfile((prev) => {
      let profBeforeResult = isCareerMode ? prev : updateStreak(prev);
      if (!lockedLineup) return profBeforeResult;
      const { next, runJustEnded, newAchievements, newUnlocks } = applyContestResult(profBeforeResult, contestResult, isCareerMode, lockedLineup);
      if (runJustEnded) setRunSummary(runJustEnded);
      setRecentAchievements(newAchievements);
      setRecentUnlocks(newUnlocks);
      return next;
    });
  }, [contestResult, isCareerMode, lockedLineup]);

  const handleBackHome = useCallback(() => {
    setScreen('home');
    setContestResult(null);
    setLockedLineup(null);
    setRecentAchievements([]);
    setRecentUnlocks([]);
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
    setScreen('home');
  }, []);

  const entryFee = isCareerMode ? TIER_ENTRY_FEE[profile.run.tier] : 1;

  switch (screen) {
    case 'home':
      return <HomeScreen profile={profile} onPlayDaily={handlePlayDaily} onCareer={handleCareer} />;

    case 'builder':
      return (
        <LineupBuilder
          slate={slate}
          onEnterContest={handleEnterContest}
          onBack={() => setScreen(isCareerMode ? 'career' : 'home')}
          isCareer={isCareerMode}
          isFirstSession={!isCareerMode && profile.totalContestsPlayed === 0}
          entryFee={entryFee}
          selectedTournament={selectedTournament}
          onTournamentChange={handleTournamentChange}
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

    case 'career':
      return (
        <CareerScreen
          profile={profile}
          onStartRun={handleStartRun}
          onContinueRun={handleContinueRun}
          onHome={() => setScreen('home')}
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
