import { useCallback, useState } from 'react';
import FootballSeason from './components/FootballSeason';
import FootballHome from './components/FootballHome';

type AppScreen = 'home' | 'season';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [startSeed, setStartSeed] = useState<number | undefined>();

  const handlePlay = useCallback((seed?: number) => {
    setStartSeed(seed);
    setScreen('season');
  }, []);

  const handleHome = useCallback(() => {
    setStartSeed(undefined);
    setScreen('home');
  }, []);

  return screen === 'season'
    ? <FootballSeason onHome={handleHome} initialSeed={startSeed} />
    : <FootballHome onPlay={handlePlay} />;
}
