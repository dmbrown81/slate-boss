import { useMemo, useState } from 'react';
import { randomBossScheme, randomEnvironment, type FbBossSchemeKey, type FbEnvironmentKey, type TeamArchetype } from '../lib/footballRogue';
import {
  createRun, gameTargets, generateRewards, isChampionship, SEASON_GAMES,
  type FbRunState, type Reward,
} from '../lib/footballRun';
import FootballMatch from './FootballMatch';
import FootballReward from './FootballReward';
import FootballRunSummary from './FootballRunSummary';
import FootballTeamSelect from './FootballTeamSelect';

type Phase = 'select' | 'match' | 'reward' | 'summary';

export default function FootballSeason({ onHome }: { onHome: () => void }) {
  const [run, setRun] = useState<FbRunState>(() => createRun());
  const [phase, setPhase] = useState<Phase>('select');
  const [env, setEnv] = useState<FbEnvironmentKey>(() => randomEnvironment());
  const [scheme, setScheme] = useState<FbBossSchemeKey>(() => randomBossScheme(1));
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [matchInstance, setMatchInstance] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [lostDrive, setLostDrive] = useState(0);

  const targets = useMemo(() => gameTargets(env, run.gameNumber), [env, run.gameNumber]);

  function startSeason(team: TeamArchetype) {
    setRun(createRun(team));
    setEnv(randomEnvironment());
    setScheme(randomBossScheme(1));
    setRewards([]);
    setGamesWon(0);
    setLostDrive(0);
    setMatchInstance((n) => n + 1);
    setPhase('match');
  }

  function handleWon(summary: { bombLanded: boolean; score: number }) {
    const withBomb: FbRunState = { ...run, bombGames: run.bombGames + (summary.bombLanded ? 1 : 0) };
    if (isChampionship(run.gameNumber)) {
      setRun({ ...withBomb, status: 'won' });
      setGamesWon(SEASON_GAMES);
      setPhase('summary');
    } else {
      setRun(withBomb);
      setRewards(generateRewards(withBomb));
      setPhase('reward');
    }
  }

  function handlePick(reward: Reward) {
    const applied = reward.apply(run);
    const nextGame = applied.gameNumber + 1;
    setRun({ ...applied, gameNumber: nextGame });
    setEnv(randomEnvironment());
    setScheme(randomBossScheme(nextGame, isChampionship(nextGame)));
    setMatchInstance((n) => n + 1);
    setPhase('match');
  }

  function handleLost(info: { drive: number }) {
    setGamesWon(run.gameNumber - 1);
    setLostDrive(info.drive);
    setRun({ ...run, status: 'lost' });
    setPhase('summary');
  }

  function newSeason() {
    setPhase('select');
  }

  if (phase === 'select') {
    return <FootballTeamSelect onStart={startSeason} onHome={onHome} />;
  }
  if (phase === 'summary') {
    return <FootballRunSummary won={run.status === 'won'} gamesWon={gamesWon} run={run} lostDrive={lostDrive} onNewSeason={newSeason} onHome={onHome} />;
  }
  if (phase === 'reward') {
    return <FootballReward run={run} rewards={rewards} onPick={handlePick} />;
  }
  return (
    <FootballMatch
      key={matchInstance}
      deck={run.deck}
      coordinators={run.coordinators}
      playbook={run.playbook}
      bombGames={run.bombGames}
      targets={targets}
      environment={env}
      bossScheme={scheme}
      gameNumber={run.gameNumber}
      totalGames={SEASON_GAMES}
      championship={isChampionship(run.gameNumber)}
      onWon={handleWon}
      onLost={handleLost}
      onHome={onHome}
    />
  );
}
