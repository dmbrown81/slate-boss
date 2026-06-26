import React from 'react';
import { renderToString } from 'react-dom/server';
import FootballHome from '../src/components/FootballHome';
import FootballTeamSelect from '../src/components/FootballTeamSelect';
import FootballMatch from '../src/components/FootballMatch';
import FootballReward from '../src/components/FootballReward';
import FootballRunSummary from '../src/components/FootballRunSummary';
import {
  randomBossScheme, randomEnvironment, scoreFootballPlay,
  type FbCard,
} from '../src/lib/footballRogue';
import { createRun, gameTargets, generateRewards, generateFilmRoom, isChampionship, runRng, overtimeTargets, overtimeGameNumber } from '../src/lib/footballRun';
import { formatRunCode } from '../src/lib/gridironTaxonomy';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const noop = () => undefined;
const run = createRun('balanced', 424242);
const env = randomEnvironment(runRng(run, 'smoke-environment'));
const boss = randomBossScheme(run.gameNumber, isChampionship(run.gameNumber), runRng(run, 'smoke-boss'));
const rewards = generateRewards(run, runRng(run, 'smoke-rewards'));

const home = renderToString(<FootballHome onPlay={noop} onClassic={noop} />);
assert(home.includes('GRIDIRON'), 'FootballHome should render the Gridiron brand.');

const teamSelect = renderToString(<FootballTeamSelect onStart={noop} onHome={noop} />);
assert(
  ['Ironhawks', 'Blazers', 'Stormers', 'Volts', 'Ghosts'].every((name) => teamSelect.includes(name)),
  'FootballTeamSelect should render all franchise choices.',
);

const reward = renderToString(
  <FootballReward
    run={run}
    rewards={rewards}
    filmRoom={generateFilmRoom(run, runRng(run, 'smoke-film'))}
    frontOfficeOffer={null}
    creditInfo={{ purse: 5, interest: 1, total: 6, gameCleared: 1 }}
    rerollCost={2}
    purchases={0}
    nextBossScheme={boss}
    nextEnvironment={env}
    onBuy={noop}
    onBuyFilm={noop}
    onBuyFrontOffice={noop}
    onReroll={noop}
    onProceed={noop}
  />,
);
assert(reward.includes('War Room'), 'FootballReward should render the War Room.');
assert(reward.includes('Next scout'), 'FootballReward should render the next-game scout.');
assert(reward.includes('FUNDS'), 'FootballReward should show Front Office Funds.');
assert(reward.includes('Film Room'), 'FootballReward should render the Film Room shelf.');

const match = renderToString(
  <FootballMatch
    team={run.team}
    deck={run.deck}
    coordinators={run.coordinators}
    playbook={run.playbook}
    bombGames={run.bombGames}
    targets={gameTargets(env, run.gameNumber)}
    environment={env}
    bossScheme={boss}
    gameNumber={run.gameNumber}
    totalGames={5}
    championship={false}
    seed={run.seed}
    onWon={noop}
    onLost={noop}
    onHome={noop}
  />,
);
assert(match.includes('DRIVE SCORE'), 'FootballMatch should render the scoreboard.');

// Boss intro reveal renders from Game 2 with a real scheme.
const bossIntroMatch = renderToString(
  <FootballMatch
    team={run.team}
    deck={run.deck}
    coordinators={run.coordinators}
    playbook={run.playbook}
    bombGames={run.bombGames}
    keeperGames={run.keeperGames}
    takeawayGames={run.takeawayGames}
    targets={gameTargets(env, 2)}
    environment={env}
    bossScheme="no_fly_zone"
    gameNumber={2}
    totalGames={5}
    championship={false}
    seed={run.seed}
    onWon={noop}
    onLost={noop}
    onHome={noop}
  />,
);
assert(bossIntroMatch.includes('SCOUTING REPORT'), 'FootballMatch should reveal the boss scouting report from Game 2.');
assert(bossIntroMatch.includes('DISGUISED'), 'FootballMatch should hide the boss-game pre-snap look before a read.');
assert(bossIntroMatch.includes('? shell'), 'FootballMatch should hide the shell before a read.');
assert(bossIntroMatch.includes('? box'), 'FootballMatch should hide the box before a read.');
assert(bossIntroMatch.includes('? rush'), 'FootballMatch should hide the pressure before a read.');
assert(bossIntroMatch.includes('Read · 1 aud'), 'FootballMatch should offer a one-audible defensive read.');

// Overtime round renders with Overtime chrome (separate score-chase mode).
const overtimeMatch = renderToString(
  <FootballMatch
    team={run.team}
    deck={run.deck}
    coordinators={run.coordinators}
    playbook={run.playbook}
    bombGames={run.bombGames}
    keeperGames={run.keeperGames}
    takeawayGames={run.takeawayGames}
    targets={overtimeTargets(env, 2)}
    environment={env}
    bossScheme={boss}
    gameNumber={overtimeGameNumber(2)}
    totalGames={5}
    championship={false}
    seed={run.seed}
    overtimeRound={2}
    onWon={noop}
    onLost={noop}
    onHome={noop}
  />,
);
assert(overtimeMatch.includes('OVERTIME'), 'FootballMatch should render Overtime chrome when in a score-chase round.');

const summary = renderToString(
  <FootballRunSummary
    won={false}
    gamesWon={2}
    run={{ ...run, status: 'lost' }}
    lostDrive={2}
    score={0}
    onNewSeason={noop}
    onHome={noop}
  />,
);
assert(summary.includes(formatRunCode('balanced', 424242)), 'FootballRunSummary should render the replayable run code.');

const pass = run.deck.find((c) => c.side === 'pass');
const catchCard = pass ? run.deck.find((c) => c.side === 'catch' && c.team === pass.team) : undefined;
assert(pass && catchCard, 'Starter deck should contain a stackable pass/catch pair.');
const result = scoreFootballPlay([pass, catchCard] as FbCard[], {
  coordinators: run.coordinators,
  environment: env,
  bossScheme: boss,
  stacksThisMatch: 0,
  groundBonusThisMatch: 0,
  conceptCountsThisDrive: {},
  playbook: run.playbook,
  bombGames: run.bombGames,
});
assert(result.valid, 'Stack smoke play should be valid.');
assert(result.ledger.every((entry) => entry.stage && entry.channel && entry.operation), 'Every ledger entry should carry stage/channel/operation metadata.');

console.log('Gridiron smoke passed: home, team select, match, reward, summary, and ledger metadata render cleanly.');
