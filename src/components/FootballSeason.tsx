import { useEffect, useMemo, useState } from 'react';
import { randomBossScheme, randomEnvironment, type FbBossSchemeKey, type FbEnvironmentKey, type TeamArchetype } from '../lib/footballRogue';
import {
  createRun, gameTargets, generateRewards, isChampionship, runRng, SEASON_GAMES,
  type FbRunState, type Reward,
} from '../lib/footballRun';
import { rerollCost, shopCredit, SKIP_REWARD, type ShopCreditInfo } from '../lib/gridironEconomy';
import { clearGridironRun, loadGridironRun, saveGridironRun } from '../lib/gridironStorage';
import FootballMatch from './FootballMatch';
import FootballReward from './FootballReward';
import FootballRunSummary from './FootballRunSummary';
import FootballTeamSelect from './FootballTeamSelect';

type Phase = 'select' | 'match' | 'reward' | 'summary';

function gameSetup(run: FbRunState): { env: FbEnvironmentKey; scheme: FbBossSchemeKey } {
  return {
    env: randomEnvironment(runRng(run, 'environment')),
    scheme: randomBossScheme(run.gameNumber, isChampionship(run.gameNumber), runRng(run, 'boss')),
  };
}

function rewardsFor(run: FbRunState, rerolls = 0): Reward[] {
  return generateRewards(run, runRng(run, `rewards:${rerolls}`));
}

export default function FootballSeason({ onHome }: { onHome: () => void }) {
  const [initial] = useState(() => {
    const saved = loadGridironRun();
    const run = saved?.run ?? createRun();
    const setup = gameSetup(run);
    return {
      phase: (saved?.phase ?? 'select') as Phase,
      run,
      env: setup.env,
      scheme: setup.scheme,
      rewards: saved?.phase === 'reward' ? rewardsFor(run, 0) : [],
    };
  });
  const [run, setRun] = useState<FbRunState>(initial.run);
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [env, setEnv] = useState<FbEnvironmentKey>(initial.env);
  const [scheme, setScheme] = useState<FbBossSchemeKey>(initial.scheme);
  const [rewards, setRewards] = useState<Reward[]>(initial.rewards);
  const [rerolls, setRerolls] = useState(0);
  const [purchases, setPurchases] = useState(0);
  const [creditInfo, setCreditInfo] = useState<ShopCreditInfo | null>(null);
  const [matchInstance, setMatchInstance] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [lostDrive, setLostDrive] = useState(0);

  const targets = useMemo(() => gameTargets(env, run.gameNumber), [env, run.gameNumber]);
  const rewardScout = useMemo(() => gameSetup({ ...run, gameNumber: run.gameNumber + 1 }), [run]);

  useEffect(() => {
    if (phase === 'match' || phase === 'reward') saveGridironRun(phase, run);
    if (phase === 'summary') clearGridironRun();
  }, [phase, run]);

  function startSeason(team: TeamArchetype) {
    const nextRun = createRun(team);
    const setup = gameSetup(nextRun);
    setRun(nextRun);
    setEnv(setup.env);
    setScheme(setup.scheme);
    setRewards([]);
    setRerolls(0);
    setPurchases(0);
    setCreditInfo(null);
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
      // Credit the War Room: win purse + interest on the balance you banked.
      const credit = shopCredit(withBomb.funds, run.gameNumber);
      const credited: FbRunState = { ...withBomb, funds: withBomb.funds + credit.total };
      setRun(credited);
      setCreditInfo({ ...credit, gameCleared: run.gameNumber });
      setRerolls(0);
      setPurchases(0);
      setRewards(rewardsFor(credited, 0));
      setPhase('reward');
    }
  }

  // War Room: buy as many affordable rewards as you like; each leaves the shelf.
  function handleBuy(reward: Reward) {
    if (run.funds < reward.cost) return;
    const applied = reward.apply({ ...run, funds: run.funds - reward.cost });
    setRun(applied);
    setPurchases((n) => n + 1);
    setRewards((shelf) => shelf.filter((r) => r.id !== reward.id));
  }

  function handleReroll() {
    const cost = rerollCost(rerolls);
    if (run.funds < cost) return;
    const next: FbRunState = { ...run, funds: run.funds - cost };
    const n = rerolls + 1;
    setRun(next);
    setRerolls(n);
    setRewards(rewardsFor(next, n));
  }

  function handleProceed() {
    // Taking nothing all shop banks a small "skip" purse.
    const credited = purchases === 0 ? { ...run, funds: run.funds + SKIP_REWARD } : run;
    const nextRun = { ...credited, gameNumber: credited.gameNumber + 1 };
    const setup = gameSetup(nextRun);
    setRun(nextRun);
    setEnv(setup.env);
    setScheme(setup.scheme);
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
    clearGridironRun();
    setPhase('select');
  }

  if (phase === 'select') {
    return <FootballTeamSelect onStart={startSeason} onHome={onHome} />;
  }
  if (phase === 'summary') {
    return <FootballRunSummary won={run.status === 'won'} gamesWon={gamesWon} run={run} lostDrive={lostDrive} onNewSeason={newSeason} onHome={onHome} />;
  }
  if (phase === 'reward') {
    return (
      <FootballReward
        run={run}
        rewards={rewards}
        creditInfo={creditInfo}
        rerollCost={rerollCost(rerolls)}
        purchases={purchases}
        nextBossScheme={rewardScout.scheme}
        nextEnvironment={rewardScout.env}
        onBuy={handleBuy}
        onReroll={handleReroll}
        onProceed={handleProceed}
      />
    );
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
      seed={run.seed}
      onWon={handleWon}
      onLost={handleLost}
      onHome={onHome}
    />
  );
}
