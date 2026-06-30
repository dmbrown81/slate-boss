import { useCallback, useState } from 'react';
import FootballSeason from './components/FootballSeason';
import FootballHome from './components/FootballHome';
import FourthPhaseLab from './components/fourthPhase/FourthPhaseLab';
import type { TeamArchetype } from './lib/footballRogue';

type AppScreen = 'home' | 'season' | 'fourthPhase';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [startSeed, setStartSeed] = useState<number | undefined>();
  // A run code (team + seed) starts that exact run directly, skipping Team Select.
  const [startTeam, setStartTeam] = useState<TeamArchetype | undefined>();

  const handlePlay = useCallback((seed?: number, team?: TeamArchetype) => {
    setStartSeed(seed);
    setStartTeam(team);
    setScreen('season');
  }, []);

  const handleHome = useCallback(() => {
    setStartSeed(undefined);
    setStartTeam(undefined);
    setScreen('home');
  }, []);

  const handleFourthPhase = useCallback(() => {
    setStartSeed(undefined);
    setStartTeam(undefined);
    setScreen('fourthPhase');
  }, []);

  if (screen === 'season') {
    return <FootballSeason onHome={handleHome} initialSeed={startSeed} initialTeam={startTeam} />;
  }
  if (screen === 'fourthPhase') {
    return <FourthPhaseLab onHome={handleHome} />;
  }
  return <FootballHome onPlay={handlePlay} onFourthPhase={handleFourthPhase} />;
}
