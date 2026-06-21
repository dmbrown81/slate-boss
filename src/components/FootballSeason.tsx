import { useEffect, useMemo, useState } from 'react';
import { randomBossScheme, randomEnvironment, type FbBossSchemeKey, type FbEnvironmentKey, type TeamArchetype } from '../lib/footballRogue';
import {
  createRun, gameTargets, generateRewards, isChampionship, rewardFromId, runRng, SEASON_GAMES,
  type FbRunState, type Reward,
} from '../lib/footballRun';
import { MAX_WAR_ROOM_PURCHASES, rerollCost, shopCredit, SKIP_REWARD, type ShopCreditInfo } from '../lib/gridironEconomy';
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

function hydrateRewards(run: FbRunState, rewardIds: string[] | undefined, rerolls: number): Reward[] {
  if (!rewardIds) return rewardsFor(run, rerolls);
  return rewardIds
    .map((id) => rewardFromId(id, run))
    .filter((reward): reward is Reward => Boolean(reward));
}

export default function FootballSeason({ onHome, initialSeed }: { onHome: () => void; initialSeed?: number }) {
  const [initial] = useState(() => {
    const saved = loadGridironRun();
    const run = saved?.run ?? createRun();
    const setup = gameSetup(run);
    const rerolls = saved?.warRoom?.rerolls ?? 0;
    return {
      phase: (saved?.phase ?? 'select') as Phase,
      run,
      env: setup.env,
      scheme: setup.scheme,
      rewards: saved?.phase === 'reward' ? hydrateRewards(run, saved.warRoom?.rewardIds, rerolls) : [],
      rerolls,
      purchases: saved?.warRoom?.purchases ?? 0,
      creditInfo: saved?.warRoom?.creditInfo ?? null,
    };
  });
  const [run, setRun] = useState<FbRunState>(initial.run);
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [env, setEnv] = useState<FbEnvironmentKey>(initial.env);
  const [scheme, setScheme] = useState<FbBossSchemeKey>(initial.scheme);
  const [rewards, setRewards] = useState<Reward[]>(initial.rewards);
  const [rerolls, setRerolls] = useState(initial.rerolls);
  const [purchases, setPurchases] = useState(initial.purchases);
  const [creditInfo, setCreditInfo] = useState<ShopCreditInfo | null>(initial.creditInfo);
  const [matchInstance, setMatchInstance] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [lostDrive, setLostDrive] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [pendingSeed, setPendingSeed] = useState<number | undefined>(() => initialSeed);

  const targets = useMemo(() => gameTargets(env, run.gameNumber), [env, run.gameNumber]);
  const rewardScout = useMemo(() => gameSetup({ ...run, gameNumber: run.gameNumber + 1 }), [run]);

  useEffect(() => {
    if (phase === 'match') saveGridironRun(phase, run);
    if (phase === 'reward') {
      saveGridironRun(phase, run, {
        rewardIds: rewards.map((reward) => reward.id),
        rerolls,
        purchases,
        creditInfo,
      });
    }
    if (phase === 'summary') clearGridironRun();
  }, [phase, run, rewards, rerolls, purchases, creditInfo]);

  function startSeason(team: TeamArchetype) {
    const nextRun = createRun(team, pendingSeed);
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
    setRunScore(0);
    setPendingSeed(undefined);
    setMatchInstance((n) => n + 1);
    setPhase('match');
  }

  function handleWon(summary: { bombLanded: boolean; keeperLanded: boolean; takeawayGame: boolean; score: number }) {
    const withBomb: FbRunState = {
      ...run,
      bombGames: run.bombGames + (summary.bombLanded ? 1 : 0),
      keeperGames: run.keeperGames + (summary.keeperLanded ? 1 : 0),
      takeawayGames: run.takeawayGames + (summary.takeawayGame ? 1 : 0),
    };
    setRunScore((prev) => prev + summary.score);
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

  // War Room: buy one reward, optionally a second; each leaves the shelf.
  function handleBuy(reward: Reward) {
    if (purchases >= MAX_WAR_ROOM_PURCHASES) return;
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

  function handleLost(info: { drive: number; score: number }) {
    setGamesWon(run.gameNumber - 1);
    setLostDrive(info.drive);
    setRunScore((prev) => prev + info.score);
    setRun({ ...run, status: 'lost' });
    setPhase('summary');
  }

  function newSeason() {
    clearGridironRun();
    setPendingSeed(undefined);
    setPhase('select');
  }

  if (phase === 'select') {
    return <FootballTeamSelect onStart={startSeason} onHome={onHome} />;
  }
  if (phase === 'summary') {
    return <FootballRunSummary won={run.status === 'won'} gamesWon={gamesWon} run={run} lostDrive={lostDrive} score={runScore} onNewSeason={newSeason} onHome={onHome} />;
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
      keeperGames={run.keeperGames}
      takeawayGames={run.takeawayGames}
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
