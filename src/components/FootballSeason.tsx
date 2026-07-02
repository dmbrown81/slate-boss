import { useEffect, useMemo, useState } from 'react';
import { randomBossScheme, randomEnvironment, type FbBossSchemeKey, type FbEnvironmentKey, type TeamArchetype } from '../lib/footballRogue';
import {
  createRun, dailyTeamForSeed, gameTargets, generateRewards, isChampionship, rewardFromId, runRng, SEASON_GAMES,
  audiblesPerDrive, effectiveInterestCap, rerollDiscount,
  generateFilmRoom, generateFrontOfficeOffer, applyFrontOffice,
  overtimeTargets, overtimeGameNumber,
  type FbRunState, type Reward, type FilmTool, type FrontOfficeUpgrade,
} from '../lib/footballRun';
import { FB, btnPrimary, btnGhost, card } from './footballStyles';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';
import { MAX_WAR_ROOM_PURCHASES, rerollCost, shopCredit, SKIP_REWARD, type ShopCreditInfo } from '../lib/gridironEconomy';
import { clearGridironRun, loadGridironDaily, loadGridironRun, saveGridironRun } from '../lib/gridironStorage';
import { stringSeed } from '../lib/rng';
import FootballMatch from './FootballMatch';
import FootballReward from './FootballReward';
import FootballRunSummary from './FootballRunSummary';
import FootballTeamSelect from './FootballTeamSelect';

type Phase = 'select' | 'match' | 'reward' | 'champion' | 'summary';
interface DailyRunInfo { date: string; seed: number; practice: boolean }

function gameSetup(run: FbRunState): { env: FbEnvironmentKey; scheme: FbBossSchemeKey } {
  return {
    env: randomEnvironment(runRng(run, 'environment')),
    scheme: randomBossScheme(run.gameNumber, isChampionship(run.gameNumber), runRng(run, 'boss')),
  };
}

function rewardsFor(run: FbRunState, rerolls = 0): Reward[] {
  const next = gameSetup({ ...run, gameNumber: run.gameNumber + 1 });
  return generateRewards(run, runRng(run, `rewards:${rerolls}`), next.scheme);
}

function hydrateRewards(run: FbRunState, rewardIds: string[] | undefined, rerolls: number): Reward[] {
  if (!rewardIds) return rewardsFor(run, rerolls);
  return rewardIds
    .map((id) => rewardFromId(id, run))
    .filter((reward): reward is Reward => Boolean(reward));
}

function filmRoomFor(run: FbRunState, rerolls = 0): FilmTool[] {
  return generateFilmRoom(run, runRng(run, `filmroom:${rerolls}`));
}
function frontOfficeFor(run: FbRunState, rerolls = 0): FrontOfficeUpgrade | null {
  return generateFrontOfficeOffer(run, runRng(run, `fooffer:${rerolls}`));
}

export default function FootballSeason({ onHome, initialSeed, initialTeam }: { onHome: () => void; initialSeed?: number; initialTeam?: TeamArchetype }) {
  const [initial] = useState(() => {
    const saved = loadGridironRun();
    // A run code (team + seed) starts that exact run directly — skip Team Select.
    if (!saved && typeof initialSeed === 'number' && initialTeam && !dailyRunInfo(initialSeed)) {
      const codeRun = createRun(initialTeam, initialSeed);
      const codeSetup = gameSetup(codeRun);
      return {
        phase: 'match' as Phase,
        run: codeRun,
        env: codeSetup.env,
        scheme: codeSetup.scheme,
        rewards: [] as Reward[],
        filmRoom: [] as FilmTool[],
        foOffer: null as FrontOfficeUpgrade | null,
        rerolls: 0,
        purchases: 0,
        creditInfo: null as ShopCreditInfo | null,
      };
    }
    // A fresh Daily skips Team Select: the assignment fixes the team for the day.
    if (!saved) {
      const daily = dailyRunInfo(initialSeed);
      if (daily) {
        const dailyRunState = createRun(dailyTeamForSeed(daily.seed), daily.seed);
        const dailySetup = gameSetup(dailyRunState);
        return {
          phase: 'match' as Phase,
          run: dailyRunState,
          env: dailySetup.env,
          scheme: dailySetup.scheme,
          rewards: [] as Reward[],
          filmRoom: [] as FilmTool[],
          foOffer: null as FrontOfficeUpgrade | null,
          rerolls: 0,
          purchases: 0,
          creditInfo: null as ShopCreditInfo | null,
        };
      }
    }
    const run = saved?.run ?? createRun();
    const setup = gameSetup(run);
    const rerolls = saved?.warRoom?.rerolls ?? 0;
    return {
      phase: (saved?.phase ?? 'select') as Phase,
      run,
      env: setup.env,
      scheme: setup.scheme,
      rewards: saved?.phase === 'reward' ? hydrateRewards(run, saved.warRoom?.rewardIds, rerolls) : [],
      filmRoom: saved?.phase === 'reward' ? filmRoomFor(run, rerolls) : [],
      foOffer: saved?.phase === 'reward' ? frontOfficeFor(run, rerolls) : null,
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
  const [filmRoom, setFilmRoom] = useState<FilmTool[]>(initial.filmRoom);
  const [foOffer, setFoOffer] = useState<FrontOfficeUpgrade | null>(initial.foOffer);
  const [rerolls, setRerolls] = useState(initial.rerolls);
  const [purchases, setPurchases] = useState(initial.purchases);
  const [creditInfo, setCreditInfo] = useState<ShopCreditInfo | null>(initial.creditInfo);
  const [matchInstance, setMatchInstance] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [lostDrive, setLostDrive] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [bestDrive, setBestDrive] = useState(0); // best single campaign drive
  // Overtime score-chase state (0 = not in / not yet entered Overtime).
  const [overtimeRound, setOvertimeRound] = useState(0);
  const [overtimeScore, setOvertimeScore] = useState(0);
  const [overtimeBestDrive, setOvertimeBestDrive] = useState(0);
  const [pendingSeed, setPendingSeed] = useState<number | undefined>(() => initialSeed);
  const [dailyRun] = useState<DailyRunInfo | null>(() => dailyRunInfo(initialSeed));

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
    // Once the campaign is won (champion screen / Overtime / summary) the run is
    // no longer resumable — clear the save so Home doesn't offer to "resume" it.
    if (phase === 'champion' || phase === 'summary') clearGridironRun();
  }, [phase, run, rewards, rerolls, purchases, creditInfo]);

  function startSeason(team: TeamArchetype, stake = 1) {
    const nextRun = createRun(team, pendingSeed, stake);
    const setup = gameSetup(nextRun);
    setRun(nextRun);
    setEnv(setup.env);
    setScheme(setup.scheme);
    setRewards([]);
    setFilmRoom([]);
    setFoOffer(null);
    setRerolls(0);
    setPurchases(0);
    setCreditInfo(null);
    setGamesWon(0);
    setLostDrive(0);
    setRunScore(0);
    setBestDrive(0);
    setOvertimeRound(0);
    setOvertimeScore(0);
    setOvertimeBestDrive(0);
    setPendingSeed(undefined);
    setMatchInstance((n) => n + 1);
    setPhase('match');
  }

  function handleWon(summary: { bombLanded: boolean; keeperLanded: boolean; takeawayGame: boolean; score: number; bestDrive: number }) {
    // Overtime round cleared: bank the chase stats and climb to the next round.
    if (overtimeRound > 0) {
      const banked = overtimeScore + summary.score;
      const best = Math.max(overtimeBestDrive, summary.bestDrive);
      const nextRound = overtimeRound + 1;
      setOvertimeScore(banked);
      setOvertimeBestDrive(best);
      setOvertimeRound(nextRound);
      const otRun = { ...run, gameNumber: overtimeGameNumber(nextRound) };
      const setup = gameSetup(otRun);
      setEnv(setup.env);
      setScheme(setup.scheme);
      setMatchInstance((n) => n + 1);
      setPhase('match');
      return;
    }
    const withBomb: FbRunState = {
      ...run,
      bombGames: run.bombGames + (summary.bombLanded ? 1 : 0),
      keeperGames: run.keeperGames + (summary.keeperLanded ? 1 : 0),
      takeawayGames: run.takeawayGames + (summary.takeawayGame ? 1 : 0),
    };
    setRunScore((prev) => prev + summary.score);
    setBestDrive((b) => Math.max(b, summary.bestDrive));
    if (isChampionship(run.gameNumber)) {
      setRun({ ...withBomb, status: 'won' });
      setGamesWon(SEASON_GAMES);
      setPhase('champion');
    } else {
      // Credit the War Room: win purse + interest on the balance you banked.
      const credit = shopCredit(withBomb.funds, run.gameNumber, effectiveInterestCap(withBomb));
      const credited: FbRunState = { ...withBomb, funds: withBomb.funds + credit.total };
      setRun(credited);
      setCreditInfo({ ...credit, gameCleared: run.gameNumber });
      setRerolls(0);
      setPurchases(0);
      setRewards(rewardsFor(credited, 0));
      setFilmRoom(filmRoomFor(credited, 0));
      setFoOffer(frontOfficeFor(credited, 0));
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

  // Film Tools + Front Office sit on their OWN budget (not the 2-reward cap) —
  // they're a separate "spend Funds on the deck/run rules" decision.
  function handleBuyFilm(tool: FilmTool, targetId?: string) {
    if (run.funds < tool.cost) return;
    const applied = tool.apply({ ...run, funds: run.funds - tool.cost }, targetId);
    setRun(applied);
    setFilmRoom((shelf) => shelf.filter((t) => t.key !== tool.key));
  }

  function handleBuyFrontOffice(up: FrontOfficeUpgrade) {
    if (run.funds < up.cost) return;
    setRun(applyFrontOffice({ ...run, funds: run.funds - up.cost }, up.key));
    setFoOffer(null);
  }

  function handleReroll() {
    const cost = Math.max(1, rerollCost(rerolls) - rerollDiscount(run));
    if (run.funds < cost) return;
    const next: FbRunState = { ...run, funds: run.funds - cost };
    const n = rerolls + 1;
    setRun(next);
    setRerolls(n);
    setRewards(rewardsFor(next, n));
    setFilmRoom(filmRoomFor(next, n));
    setFoOffer(frontOfficeFor(next, n));
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

  function handleLost(info: { drive: number; score: number; bestDrive: number }) {
    // Losing an Overtime round ends the chase but the season is already WON —
    // record the chase stats and show the (won) summary, not a loss.
    if (overtimeRound > 0) {
      setOvertimeScore((prev) => prev + info.score);
      setOvertimeBestDrive((prev) => Math.max(prev, info.bestDrive));
      setPhase('summary');
      return;
    }
    setGamesWon(run.gameNumber - 1);
    setLostDrive(info.drive);
    setRunScore((prev) => prev + info.score);
    setBestDrive((b) => Math.max(b, info.bestDrive));
    setRun({ ...run, status: 'lost' });
    setPhase('summary');
  }

  function enterOvertime() {
    const firstRound = 1;
    setOvertimeRound(firstRound);
    setOvertimeScore(0);
    setOvertimeBestDrive(0);
    const otRun = { ...run, gameNumber: overtimeGameNumber(firstRound) };
    const setup = gameSetup(otRun);
    setEnv(setup.env);
    setScheme(setup.scheme);
    setMatchInstance((n) => n + 1);
    setPhase('match');
  }

  function newSeason() {
    clearGridironRun();
    setPendingSeed(undefined);
    setPhase('select');
  }

  if (phase === 'select') {
    return <FootballTeamSelect onStart={startSeason} onHome={onHome} />;
  }
  if (phase === 'champion') {
    return <ChampionInterstitial run={run} score={runScore} onOvertime={enterOvertime} onEnd={() => setPhase('summary')} />;
  }
  if (phase === 'summary') {
    return (
      <FootballRunSummary
        won={run.status === 'won'}
        gamesWon={gamesWon}
        run={run}
        lostDrive={lostDrive}
        score={runScore}
        bestDrive={bestDrive}
        overtimeRound={overtimeRound}
        overtimeScore={overtimeScore}
        overtimeBestDrive={overtimeBestDrive}
        dailyRun={dailyRun ?? undefined}
        onNewSeason={newSeason}
        onHome={onHome}
      />
    );
  }
  if (phase === 'reward') {
    return (
      <FootballReward
        run={run}
        rewards={rewards}
        filmRoom={filmRoom}
        frontOfficeOffer={foOffer}
        creditInfo={creditInfo}
        rerollCost={Math.max(1, rerollCost(rerolls) - rerollDiscount(run))}
        purchases={purchases}
        nextBossScheme={rewardScout.scheme}
        nextEnvironment={rewardScout.env}
        onBuy={handleBuy}
        onBuyFilm={handleBuyFilm}
        onBuyFrontOffice={handleBuyFrontOffice}
        onReroll={handleReroll}
        onProceed={handleProceed}
      />
    );
  }
  const inOvertime = overtimeRound > 0;
  const matchTargets = inOvertime ? overtimeTargets(env, overtimeRound) : targets;
  const matchGameNumber = inOvertime ? overtimeGameNumber(overtimeRound) : run.gameNumber;
  return (
    <FootballMatch
      key={matchInstance}
      team={run.team}
      deck={run.deck}
      coordinators={run.coordinators}
      staffBoard={run.staffBoard}
      playbook={run.playbook}
      bombGames={run.bombGames}
      keeperGames={run.keeperGames}
      takeawayGames={run.takeawayGames}
      targets={matchTargets}
      environment={env}
      bossScheme={scheme}
      gameNumber={matchGameNumber}
      totalGames={SEASON_GAMES}
      championship={!inOvertime && isChampionship(run.gameNumber)}
      seed={run.seed}
      audiblesPerDrive={audiblesPerDrive(run)}
      overtimeRound={inOvertime ? overtimeRound : undefined}
      onWon={handleWon}
      onLost={handleLost}
      onHome={onHome}
    />
  );
}

// Post-Championship interstitial: bank the win or push into the Overtime
// score-chase. Overtime can't hurt the run (it's already won) — it only adds a
// ceiling to chase, so this is a pure "how far can you go?" offer.
function ChampionInterstitial({ run, score, onOvertime, onEnd }: {
  run: FbRunState; score: number; onOvertime: () => void; onEnd: () => void;
}) {
  const coachId = TEAM_IDENTITY[run.team];
  return (
    <div style={{ minHeight: '100svh', padding: '28px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="fb-rise" style={{ textAlign: 'center', borderRadius: 18, padding: '34px 18px', background: 'linear-gradient(180deg,#2a2410,#0a1610)', border: `1px solid ${FB.gold}` }}>
        <div style={{ fontSize: 58 }}>🏆</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: FB.text, marginTop: 6 }}>Champions!</div>
        <div style={{ fontSize: 13, color: FB.textDim, marginTop: 6 }}>You ran the table. Season score <span className="fb-num" style={{ color: FB.gold, fontWeight: 900 }}>{score}</span>.</div>
      </div>
      <div style={{ ...card(14), padding: '14px', marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', borderLeft: `4px solid ${coachId.primary}` }}>
        <CoachPortrait team={run.team} size={46} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: FB.text }}>{coachId.coachName}</div>
          <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.4, marginTop: 3, fontStyle: 'italic' }}>“The trophy's ours. Want to see how far this team can really go?”</div>
        </div>
      </div>
      <div style={{ ...card(14), padding: '14px', marginTop: 12, borderColor: '#5a4112', background: 'linear-gradient(160deg,#17170d,#0e151d)' }}>
        <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.2, fontWeight: 900 }}>OVERTIME · SCORE CHASE</div>
        <div style={{ fontSize: 12.5, color: FB.textDim, lineHeight: 1.45, marginTop: 4 }}>
          Endless rounds with no shop and a target that climbs every round. Your record can't be lost now — push your engine until it finally stalls. How deep can you go?
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
        <button onClick={onOvertime} style={{ ...btnPrimary, width: '100%', fontSize: 16, padding: '16px 0' }}>🔥 Play Overtime →</button>
        <button onClick={onEnd} style={{ ...btnGhost, width: '100%', padding: '14px 0', fontSize: 14, borderRadius: 12 }}>End Season &amp; See Results</button>
      </div>
    </div>
  );
}

function dailyRunInfo(seed: number | undefined): DailyRunInfo | null {
  if (typeof seed !== 'number') return null;
  const date = new Date().toISOString().slice(0, 10);
  const dailySeed = stringSeed(`gridiron-daily:${date}`);
  if (seed !== dailySeed) return null;
  const existing = loadGridironDaily();
  return { date, seed, practice: existing?.date === date };
}
