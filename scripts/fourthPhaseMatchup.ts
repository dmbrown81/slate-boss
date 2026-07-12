// Fourth Phase Lab — deterministic recognizer/scoring/momentum proof.
//
// Run: `npm run matchup:fourthphase`

import {
  BASE_METER,
  BASE_METER_CAP,
  FOURTH_PHASE_STARTING_DECK_SIZE,
  FOURTH_PHASE_TEAMS,
  SITUATION_TEST_CASES,
  bossWarningForPlay,
  buildPlayExplanation,
  buildFourthPhaseDrivePile,
  coachPickForWarRoom,
  comboLedgerEntries,
  createFourthPhaseDeck,
  prepareFourthPhaseTeamDeck,
  generateFourthPhaseWarRoomOffers,
  fourthPhaseBuildIdentity,
  isTrueCrowdBeforeOffenseCash,
  plainPlaySummary,
  playEffectVerb,
  scoreFourthPhasePlay,
  tutorialCheckdownIsValid,
  type FourthPhaseCard,
  type FourthPhaseBossKey,
  type Phase,
  type FourthPhaseTeamKey,
} from '../src/lib/fourthPhase';

let failures = 0;

function assert(label: string, condition: boolean, detail: string) {
  const tag = condition ? 'OK' : 'FAIL';
  if (!condition) failures += 1;
  console.log(`  ${tag} ${label} -- ${detail}`);
}

const deck = createFourthPhaseDeck();

function card(id: string): FourthPhaseCard {
  const found = deck.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Fourth Phase card ${id}`);
  return found;
}

function cardsFor(phases: readonly Phase[]): FourthPhaseCard[] {
  const used = new Set<string>();
  return phases.map((phase) => {
    const found = deck.find((candidate) => candidate.phase === phase && !used.has(candidate.id));
    if (!found) throw new Error(`Missing phase ${phase}`);
    used.add(found.id);
    return found;
  });
}

console.log('Fourth Phase matchup proof\n');

console.log('Playbook deck and game-flow contracts:');
const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];
const startingDecks = teamKeys.map((team) => ({ team, deck: prepareFourthPhaseTeamDeck(team) }));
for (const { team, deck: teamDeck } of startingDecks) {
  assert(`${team} starts with a compact game plan`, teamDeck.length === FOURTH_PHASE_STARTING_DECK_SIZE, `${teamDeck.length} cards`);
  assert(`${team} deck has unique inserts`, new Set(teamDeck.map((item) => item.id)).size === teamDeck.length, `${new Set(teamDeck.map((item) => item.id)).size}/${teamDeck.length} unique`);
}
assert(
  'all six playbooks start from distinct card lists',
  new Set(startingDecks.map(({ deck: teamDeck }) => teamDeck.map((item) => item.id).sort().join('|'))).size === teamKeys.length,
  `${teamKeys.length} distinct lists`,
);
const balancedDeck = prepareFourthPhaseTeamDeck('balanced');
const openingPileA = buildFourthPhaseDrivePile(balancedDeck, 20260711, 0);
const openingPileB = buildFourthPhaseDrivePile(balancedDeck, 20260711, 0);
const counterPile = buildFourthPhaseDrivePile(balancedDeck, 20260711, 1);
const closingPile = buildFourthPhaseDrivePile(balancedDeck, 20260711, 2);
assert('drive-aware pile is deterministic', openingPileA.map((item) => item.id).join('|') === openingPileB.map((item) => item.id).join('|'), 'same seed, same order');
assert('Opening Script cards lead Drive 1', openingPileA.slice(0, 3).every((item) => item.driveAct === 'opening'), openingPileA.slice(0, 3).map((item) => item.roleName).join(', '));
assert('Counterpunch cards lead Drive 2', counterPile.slice(0, 3).every((item) => item.driveAct === 'counterpunch'), counterPile.slice(0, 3).map((item) => item.roleName).join(', '));
assert('closing inserts cannot appear in Drives 1–2', [...openingPileA, ...counterPile].every((item) => item.driveAct !== 'closing'), `${openingPileA.length}/${counterPile.length} eligible cards`);
assert('Closing Drive inserts unlock for Drive 3', closingPile.some((item) => item.driveAct === 'closing') && closingPile.slice(0, 3).every((item) => item.driveAct === 'closing'), closingPile.slice(0, 3).map((item) => item.roleName).join(', '));

console.log('Situation recognizer priority ladder:');
for (const test of SITUATION_TEST_CASES) {
  const result = scoreFourthPhasePlay(cardsFor(test.phases), { meter: BASE_METER, meterCap: BASE_METER_CAP });
  assert(test.label, result.situation.key === test.expected, `got ${result.situation.key}, expected ${test.expected}`);
}

console.log('\nKnown scoring equation:');
const checkdown = scoreFourthPhasePlay([card('offense-2')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('checkdown exact score', checkdown.points === 9, `${checkdown.yards} x (1 + ${checkdown.execution}) x ${checkdown.bigPlay} = ${checkdown.points}`);
assert('checkdown does not cash momentum', !checkdown.didCash, `didCash=${checkdown.didCash}`);

const chargeBeforeCash = scoreFourthPhasePlay([card('crowd-A'), card('offense-K')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
const cashBeforeCharge = scoreFourthPhasePlay([card('offense-K'), card('crowd-A')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('Crowd before Offense changes score', chargeBeforeCash.points > cashBeforeCharge.points, `${chargeBeforeCash.points} > ${cashBeforeCharge.points}`);
assert('Shot Play cashes the built momentum', chargeBeforeCash.didCash && chargeBeforeCash.bigPlay >= 2, `Explosive x${chargeBeforeCash.bigPlay}`);

console.log('\nFootball call sequencing combos:');
const runToPlayAction = scoreFourthPhasePlay([card('offense-6'), card('offense-J')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
const playActionCold = scoreFourthPhasePlay([card('offense-J'), card('offense-6')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
assert('Run sets up Play Action when ordered', runToPlayAction.points > playActionCold.points, `${runToPlayAction.points} > ${playActionCold.points}`);
assert('Run -> Play Action writes a combo ledger entry', comboLedgerEntries(runToPlayAction).some((entry) => entry.label === 'Run Sets Up Play Action'), comboLedgerEntries(runToPlayAction).map((entry) => entry.label).join(', '));

const shortFieldShot = scoreFourthPhasePlay([card('defense-10'), card('defense-Q'), card('offense-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
const shotBeforeTakeaway = scoreFourthPhasePlay([card('offense-10'), card('defense-10'), card('defense-Q')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
assert('Takeaway creates a Short Field Shot when ordered', shortFieldShot.points > shotBeforeTakeaway.points, `${shortFieldShot.points} > ${shotBeforeTakeaway.points}`);
assert('Short Field Shot writes a combo ledger entry', comboLedgerEntries(shortFieldShot).some((entry) => entry.label === 'Short Field Shot'), comboLedgerEntries(shortFieldShot).map((entry) => entry.label).join(', '));

const scriptedTrips = scoreFourthPhasePlay([card('offense-3'), card('offense-4'), card('offense-8')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
const unscriptedDrive = scoreFourthPhasePlay([
  card('offense-3'),
  card('offense-4'),
  { ...card('offense-8'), tags: card('offense-8').tags.filter((tag) => tag !== 'formation:trips') },
], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
assert('Same-formation calls create a Scripted Series', scriptedTrips.points > unscriptedDrive.points, `${scriptedTrips.points} > ${unscriptedDrive.points}`);
assert('Scripted Series writes a combo ledger entry', comboLedgerEntries(scriptedTrips).some((entry) => entry.label === 'Scripted Series'), comboLedgerEntries(scriptedTrips).map((entry) => entry.label).join(', '));

console.log('\nMeter and joker hooks:');
const plainBlackout = scoreFourthPhasePlay([card('crowd-7'), card('crowd-J'), card('crowd-A')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
const boostedBlackout = scoreFourthPhasePlay([card('crowd-7'), card('crowd-J'), card('crowd-A')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'twelfthMan' }],
});
assert('Sold Out boosts Crowd momentum', boostedBlackout.meterAfter > plainBlackout.meterAfter, `${boostedBlackout.meterAfter.toFixed(2)} > ${plainBlackout.meterAfter.toFixed(2)}`);

const pickSix = scoreFourthPhasePlay([card('defense-Q'), card('defense-K'), card('offense-6')], {
  meter: 1.4,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'pickSixSpecialist' }],
});
assert('Takeaway Artist reaches cap', pickSix.meterAfter >= BASE_METER_CAP - 0.01, `momentum x${pickSix.meterAfter.toFixed(2)}`);

const complementaryPlain = scoreFourthPhasePlay([card('crowd-A'), card('offense-Q'), card('defense-J'), card('specialTeams-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
const complementaryGenius = scoreFourthPhasePlay([card('crowd-A'), card('offense-Q'), card('defense-J'), card('specialTeams-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'theGenius' }],
});
assert('The Genius lifts all-four-phase score', complementaryGenius.points >= complementaryPlain.points * 1.45, `${complementaryGenius.points} vs ${complementaryPlain.points}`);

const leadBlockerOrdered = scoreFourthPhasePlay([card('defense-J'), card('defense-Q'), card('offense-K')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'leadBlocker' }],
});
const leadBlockerReversed = scoreFourthPhasePlay([card('offense-K'), card('defense-J'), card('defense-Q')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'leadBlocker' }],
});
assert('Lead Blocker rewards card order', leadBlockerOrdered.points > leadBlockerReversed.points, `${leadBlockerOrdered.points} > ${leadBlockerReversed.points}`);

const doubleMove = scoreFourthPhasePlay([card('crowd-A'), card('offense-K')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'doubleMove' }],
});
assert('Double Move boosts Crowd-before-Offense cash', doubleMove.points > chargeBeforeCash.points, `${doubleMove.points} > ${chargeBeforeCash.points}`);

const closerPlain = scoreFourthPhasePlay([card('crowd-A'), card('offense-K')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  driveIndex: 2,
  boss: 'turnoverDrill',
});
const closerBoosted = scoreFourthPhasePlay([card('crowd-A'), card('offense-K')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  driveIndex: 2,
  boss: 'turnoverDrill',
  jokers: [{ id: 'closer' }],
});
assert('Closer lifts boss-drive scoring', closerBoosted.points > closerPlain.points, `${closerBoosted.points} > ${closerPlain.points}`);

// Contract: the three displayed terms must reconcile to displayed points (tolerance covers term rounding).
const reconciled = Math.round(complementaryGenius.yards * (1 + complementaryGenius.execution) * complementaryGenius.bigPlay);
assert(
  'points reconcile to Yards x (1 + Leverage) x Explosive',
  Math.abs(complementaryGenius.points - reconciled) <= 2,
  `points=${complementaryGenius.points}, Yards ${complementaryGenius.yards} x (1 + ${complementaryGenius.execution}) x ${complementaryGenius.bigPlay} = ${reconciled}`,
);

console.log('\nBoss pivots:');
const firstDrive = scoreFourthPhasePlay([card('offense-8'), card('offense-9'), card('offense-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  boss: 'adaptiveDc',
  repeatedSituations: {},
});
const repeatedDrive = scoreFourthPhasePlay([card('offense-8'), card('offense-9'), card('offense-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  boss: 'adaptiveDc',
  repeatedSituations: { drive: 1 },
});
assert('Got Your Number zeros repeated situation', firstDrive.points > 0 && repeatedDrive.points === 0, `${firstDrive.points} then ${repeatedDrive.points}`);

console.log('\nEdition and boss-cap fixes:');
const plainCheck = scoreFourthPhasePlay([card('offense-5')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
const allProCheck = scoreFourthPhasePlay([{ ...card('offense-5'), edition: 'allPro' }], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('All-Pro edition raises base Yards', allProCheck.yards > plainCheck.yards, `${allProCheck.yards} > ${plainCheck.yards}`);

const roadDecibel = scoreFourthPhasePlay([card('crowd-A'), card('crowd-K'), card('offense-9')], {
  meter: 1.8,
  meterCap: BASE_METER_CAP,
  boss: 'roadGame',
  jokers: [{ id: 'decibelRecord' }],
});
assert('Road Game cap holds even with Standing Room Only', roadDecibel.meterAfter <= 2.0001, `momentum x${roadDecibel.meterAfter.toFixed(2)}`);

const roadCollector = scoreFourthPhasePlay([card('crowd-A'), card('offense-Q'), card('defense-J'), card('specialTeams-10'), card('offense-K')], {
  meter: 1.8,
  meterCap: BASE_METER_CAP,
  boss: 'roadGame',
  jokers: [{ id: 'phaseCollector' }],
});
assert('Road Game cap holds with Phase Collector', roadCollector.meterCap <= 2.0001, `cap x${roadCollector.meterCap.toFixed(2)}`);

console.log('\nDeterminism and cash-index (Phase 0 parity gate):');
// Preview and execution call scoreFourthPhasePlay through one shared context builder
// in the UI; this guards the other half: identical inputs must yield identical output.
const parityCards = [card('crowd-A'), card('offense-K')];
const parityCtx = { meter: BASE_METER, meterCap: BASE_METER_CAP, jokers: [{ id: 'twelfthMan' as const }], boss: 'none' as const };
const runA = scoreFourthPhasePlay(parityCards, parityCtx);
const runB = scoreFourthPhasePlay(parityCards, parityCtx);
assert('scoring is deterministic for identical input', JSON.stringify(runA) === JSON.stringify(runB), 'two runs match byte-for-byte');

const cashIndexShotPlay = scoreFourthPhasePlay([card('crowd-A'), card('offense-K')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('cashesAtCardIndex marks the cashing Offense card', cashIndexShotPlay.cashesAtCardIndex === 1, `index ${cashIndexShotPlay.cashesAtCardIndex}`);
const cashIndexNone = scoreFourthPhasePlay([card('offense-2')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('cashesAtCardIndex is null when no cash', cashIndexNone.cashesAtCardIndex === null, `index ${cashIndexNone.cashesAtCardIndex}`);

console.log('\nCoach-mode helpers:');
assert('tutorial Checkdown accepts one clean Offense card', tutorialCheckdownIsValid([card('offense-2')], checkdown), `situation ${checkdown.situation.key}`);
assert('tutorial Checkdown rejects extra cards', !tutorialCheckdownIsValid([card('offense-2'), card('offense-3')], scoreFourthPhasePlay([card('offense-2'), card('offense-3')], { meter: BASE_METER, meterCap: BASE_METER_CAP })), 'extra card blocked');
assert('tutorial cash-in rejects Offense before Crowd', cashBeforeCharge.didCash && !isTrueCrowdBeforeOffenseCash([card('offense-K'), card('crowd-A')], cashBeforeCharge), `didCash=${cashBeforeCharge.didCash}, index=${cashBeforeCharge.cashesAtCardIndex}`);
assert('tutorial cash-in accepts Crowd before Offense', isTrueCrowdBeforeOffenseCash([card('crowd-A'), card('offense-K')], chargeBeforeCash), `index=${chargeBeforeCash.cashesAtCardIndex}`);

const explanation = buildPlayExplanation(parityCards, runA);
assert('series explanation cites preview score', explanation.includes(`${runA.points} progress`), explanation);
assert('series explanation names cashing card', explanation.includes(card('offense-K').roleName), explanation);

console.log('\nEffect verbs and plain summaries (preview-as-teacher layer):');
const fieldFlip = scoreFourthPhasePlay([card('specialTeams-4'), card('specialTeams-5')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
const bustedMix = scoreFourthPhasePlay(cardsFor(['defense', 'crowd']), { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('cashing series verb is CASHES', playEffectVerb(chargeBeforeCash) === 'CASHES', playEffectVerb(chargeBeforeCash));
assert('checkdown verb is SCORES', playEffectVerb(checkdown) === 'SCORES', playEffectVerb(checkdown));
assert('crowd surge verb is BUILDS', playEffectVerb(plainBlackout) === 'BUILDS', playEffectVerb(plainBlackout));
assert('field flip verb is SETS UP', playEffectVerb(fieldFlip) === 'SETS UP', playEffectVerb(fieldFlip));
assert('unshaped mix verb is BAD CALL', playEffectVerb(bustedMix) === 'BAD CALL', playEffectVerb(bustedMix));
assert('cash summary names the loop', plainPlaySummary(chargeBeforeCash).includes('cashed'), plainPlaySummary(chargeBeforeCash));
assert('blackout summary tells player to cash soon', plainPlaySummary(plainBlackout).includes('Cash it'), plainPlaySummary(plainBlackout));
assert('bust summary names the bleed', plainPlaySummary(bustedMix).includes('bled'), plainPlaySummary(bustedMix));

console.log('\nBoss warning preview helpers:');
const bossCases: Array<{ boss: FourthPhaseBossKey; cards: FourthPhaseCard[]; repeated?: Record<string, number>; meter?: number; expected: string }> = [
  { boss: 'stackedBox', cards: [card('offense-8')], expected: 'Stacked Box' },
  { boss: 'noFlyZone', cards: [card('offense-8'), card('offense-9'), card('offense-10')], expected: 'No-Fly Zone' },
  { boss: 'roadGame', cards: [card('crowd-A'), card('offense-K')], expected: 'Road Game' },
  { boss: 'turnoverDrill', cards: [card('defense-Q'), card('offense-6')], expected: 'Ball Security' },
  { boss: 'fieldPositionWar', cards: [card('specialTeams-4')], expected: 'Touchback Machine' },
  { boss: 'adaptiveDc', cards: [card('offense-8'), card('offense-9'), card('offense-10')], repeated: { drive: 1 }, expected: 'Got Your Number' },
  { boss: 'preventDefense', cards: [card('crowd-A'), card('offense-K')], meter: BASE_METER_CAP, expected: 'Prevent Defense' },
];
for (const test of bossCases) {
  const result = scoreFourthPhasePlay(test.cards, {
    meter: test.meter ?? BASE_METER,
    meterCap: BASE_METER_CAP,
    boss: test.boss,
    repeatedSituations: test.repeated ?? {},
  });
  const warning = bossWarningForPlay({
    boss: test.boss,
    result,
    cards: test.cards,
    repeatedSituations: test.repeated ?? {},
  });
  assert(`${test.boss} warning appears when applicable`, Boolean(warning?.includes(test.expected)), warning ?? 'no warning');
}

console.log('\nWar Room coach pick:');
const coachOffers = generateFourthPhaseWarRoomOffers([{ id: 'twelfthMan' }], 20260701, 1, 'loudHouse', 'roadGame', 0, {});
const loudDeckIds = new Set(prepareFourthPhaseTeamDeck('loudHouse').map((item) => item.id));
assert('War Room deals two reserve cards', coachOffers.filter((offer) => offer.kind === 'card').length === 2, coachOffers.map((offer) => offer.kind).join(', '));
assert('War Room card offers are outside the active deck', coachOffers.filter((offer) => offer.card).every((offer) => !loudDeckIds.has(offer.card!.id)), coachOffers.filter((offer) => offer.card).map((offer) => offer.card!.roleName).join(', '));
assert('War Room keeps one joker and one game-plan drill', coachOffers.filter((offer) => offer.kind === 'joker').length === 1 && coachOffers.filter((offer) => offer.kind === 'practice').length === 1, coachOffers.map((offer) => offer.kind).join(', '));
const coachedCard = coachOffers.find((offer) => offer.card)?.card;
assert('one reserve offer matches the next Closing Drive act', coachOffers.some((offer) => offer.card?.driveAct === 'closing'), coachOffers.filter((offer) => offer.card).map((offer) => `${offer.card!.roleName}:${offer.card!.driveAct}`).join(', '));
const installedOpening = coachedCard ? buildFourthPhaseDrivePile([...prepareFourthPhaseTeamDeck('loudHouse'), coachedCard], 20260711, 2) : [];
assert('coached-up insert reaches the next eligible opening hand', Boolean(coachedCard && installedOpening.slice(0, 3).some((item) => item.id === coachedCard.id)), installedOpening.slice(0, 3).map((item) => item.roleName).join(', '));
const coachedOffense = coachOffers.find((offer) => offer.card?.phase === 'offense')?.card;
if (coachedOffense) {
  const uninstalledOffense = { ...coachedOffense, value: coachedOffense.value - 7, installed: undefined };
  const installedScore = scoreFourthPhasePlay([coachedOffense], { meter: BASE_METER, meterCap: BASE_METER_CAP });
  const baseScore = scoreFourthPhasePlay([uninstalledOffense], { meter: BASE_METER, meterCap: BASE_METER_CAP });
  assert('coached-up mutation improves the same call', installedScore.points > baseScore.points, `${installedScore.points} > ${baseScore.points}`);
}
const buildReceipt = fourthPhaseBuildIdentity(coachedCard ? [...prepareFourthPhaseTeamDeck('loudHouse'), coachedCard] : prepareFourthPhaseTeamDeck('loudHouse'), 'loudHouse');
assert('build receipt names installed mutations', Boolean(coachedCard && buildReceipt.installedCount === 1 && buildReceipt.detail.includes(coachedCard.roleName)), buildReceipt.detail);
const coachPickA = coachPickForWarRoom(coachOffers, 'loudHouse', 'roadGame');
const coachPickB = coachPickForWarRoom(coachOffers, 'loudHouse', 'roadGame');
assert('coach pick is deterministic for identical offers', JSON.stringify(coachPickA) === JSON.stringify(coachPickB), `${JSON.stringify(coachPickA)} vs ${JSON.stringify(coachPickB)}`);
assert('coach pick points at one visible offer', Boolean(coachPickA && coachOffers.some((offer) => offer.id === coachPickA.id)), coachPickA?.id ?? 'none');
assert('coach pick carries a why-now reason', Boolean(coachPickA?.reason), coachPickA?.reason ?? 'none');

console.log('');
if (failures > 0) {
  console.error(`Fourth Phase matchup FAILED: ${failures} assertion(s) broken.`);
  process.exit(1);
}

console.log('Fourth Phase matchup passed: situations, equation, momentum order, expanded jokers, and boss pivots hold.');
