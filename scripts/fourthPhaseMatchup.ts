// Fourth Phase Lab — deterministic recognizer/scoring/meter proof.
//
// Run: `npm run matchup:fourthphase`

import {
  BASE_METER,
  BASE_METER_CAP,
  SITUATION_TEST_CASES,
  createFourthPhaseDeck,
  scoreFourthPhasePlay,
  type FourthPhaseCard,
  type Phase,
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

console.log('Situation recognizer priority ladder:');
for (const test of SITUATION_TEST_CASES) {
  const result = scoreFourthPhasePlay(cardsFor(test.phases), { meter: BASE_METER, meterCap: BASE_METER_CAP });
  assert(test.label, result.situation.key === test.expected, `got ${result.situation.key}, expected ${test.expected}`);
}

console.log('\nKnown scoring equation:');
const checkdown = scoreFourthPhasePlay([card('offense-2')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('checkdown exact score', checkdown.points === 9, `${checkdown.yards} x (1 + ${checkdown.execution}) x ${checkdown.bigPlay} = ${checkdown.points}`);
assert('checkdown does not cash meter', !checkdown.didCash, `didCash=${checkdown.didCash}`);

const chargeBeforeCash = scoreFourthPhasePlay([card('crowd-A'), card('offense-K')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
const cashBeforeCharge = scoreFourthPhasePlay([card('offense-K'), card('crowd-A')], { meter: BASE_METER, meterCap: BASE_METER_CAP });
assert('Crowd before Offense changes score', chargeBeforeCash.points > cashBeforeCharge.points, `${chargeBeforeCash.points} > ${cashBeforeCharge.points}`);
assert('House Call cashes the built meter', chargeBeforeCash.didCash && chargeBeforeCash.bigPlay >= 2, `BigPlay x${chargeBeforeCash.bigPlay}`);

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
assert('Twelfth Man boosts Crowd charge', boostedBlackout.meterAfter > plainBlackout.meterAfter, `${boostedBlackout.meterAfter.toFixed(2)} > ${plainBlackout.meterAfter.toFixed(2)}`);

const pickSix = scoreFourthPhasePlay([card('defense-Q'), card('defense-K'), card('offense-6')], {
  meter: 1.4,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'pickSixSpecialist' }],
});
assert('Pick-Six Specialist reaches cap', pickSix.meterAfter >= BASE_METER_CAP - 0.01, `meter x${pickSix.meterAfter.toFixed(2)}`);

const complementaryPlain = scoreFourthPhasePlay([card('crowd-A'), card('offense-Q'), card('defense-J'), card('specialTeams-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
});
const complementaryGenius = scoreFourthPhasePlay([card('crowd-A'), card('offense-Q'), card('defense-J'), card('specialTeams-10')], {
  meter: BASE_METER,
  meterCap: BASE_METER_CAP,
  jokers: [{ id: 'theGenius' }],
});
assert('The Genius doubles all-four-phase score', complementaryGenius.points >= complementaryPlain.points * 1.9, `${complementaryGenius.points} vs ${complementaryPlain.points}`);

// Contract: the three displayed terms must reconcile to displayed points (tolerance covers term rounding).
const reconciled = Math.round(complementaryGenius.yards * (1 + complementaryGenius.execution) * complementaryGenius.bigPlay);
assert(
  'points reconcile to Yards x (1 + Exec) x BigPlay',
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
assert('Adaptive DC zeros repeated situation', firstDrive.points > 0 && repeatedDrive.points === 0, `${firstDrive.points} then ${repeatedDrive.points}`);

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
assert('Road Game cap holds even with Decibel Record', roadDecibel.meterAfter <= 2.0001, `meter x${roadDecibel.meterAfter.toFixed(2)}`);

console.log('');
if (failures > 0) {
  console.error(`Fourth Phase matchup FAILED: ${failures} assertion(s) broken.`);
  process.exit(1);
}

console.log('Fourth Phase matchup passed: situations, equation, meter order, jokers, and boss pivots hold.');
