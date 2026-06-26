// Gridiron — matchup edge proof.
//
// A tiny, deterministic assertion that "reading the defense changes the score":
// the SAME hand scores differently depending on the pre-snap look the defense
// shows. This locks in the step-3/4 hook so a future refactor can't silently
// flatten it. Run: `npm run matchup:gridiron`.

import {
  scoreFootballPlay, buildTeamDeck, presentationForScheme, presentationsForScheme,
  FB_BOSS_SCHEMES,
  type FbScoreContext, type FbBossSchemeKey, type FbCard, type FbDefensivePresentation,
} from '../src/lib/footballRogue';
import { conceptMatchup } from '../src/lib/gridironPlaybook';

let failures = 0;
function assert(label: string, cond: boolean, detail: string) {
  const tag = cond ? '✅' : '❌';
  if (!cond) failures += 1;
  console.log(`  ${tag} ${label} — ${detail}`);
}

// Score a fixed hand against a scheme's pre-snap look (presentation defaults to
// the scheme mapping, exactly as the live match does).
function scoreVs(cards: Parameters<typeof scoreFootballPlay>[0], scheme: FbBossSchemeKey) {
  const ctx: FbScoreContext = {
    coordinators: [], environment: 'clear', bossScheme: scheme,
    presentation: presentationForScheme(scheme),
    stacksThisMatch: 0, groundBonusThisMatch: 0, conceptCountsThisDrive: {},
  };
  return scoreFootballPlay(cards, ctx);
}

console.log('Gridiron matchup edge — same hand, different look\n');

// ── Ground & Pound: loaded box stuffs it, light box lets it gash ─────────────
const ground = buildTeamDeck('ground_game');
const carries = ground.cards
  .filter((c) => c.action === 'power_run' || c.action === 'breakaway_run')
  .slice(0, 3);
const gLoaded = scoreVs(carries, 'stacked_box'); // one-high + LOADED box
const gEven = scoreVs(carries, 'balanced');      // base + even box (neutral)
const gLight = scoreVs(carries, 'no_fly_zone');  // two-high + LIGHT box
console.log(`Ground & Pound (${carries.length} carries, concept=${gEven.concept}):`);
console.log(`   loaded=${gLoaded.total}  even=${gEven.total}  light=${gLight.total}`);
assert('lower vs loaded box', gLoaded.total < gEven.total, `${gLoaded.total} < ${gEven.total}`);
assert('neutral vs even box', gEven.concept === 'ground_pound', `concept is ${gEven.concept}`);
assert('higher vs light box', gLight.total > gEven.total, `${gLight.total} > ${gEven.total}`);

// ── Deep stack: two-high caps it, single-high opens the shot ─────────────────
const air = buildTeamDeck('air_raid');
const qbPass = air.cards.find((c) => c.action === 'deep_pass')!;
const sameTeamCatches = air.cards.filter((c) => c.side === 'catch' && c.team === qbPass.team).slice(0, 2);
const stack = [qbPass, ...sameTeamCatches];
const sTwoHigh = scoreVs(stack, 'no_fly_zone');  // TWO-HIGH shell
const sEven = scoreVs(stack, 'balanced');         // base shell (neutral)
const sOneHigh = scoreVs(stack, 'stacked_box');   // ONE-HIGH shell
console.log(`\nDeep stack (concept=${sEven.concept}):`);
console.log(`   two-high=${sTwoHigh.total}  even=${sEven.total}  one-high=${sOneHigh.total}`);
assert('is a deep stack', sEven.concept === 'double_stack_bomb', `concept is ${sEven.concept}`);
assert('lower vs two-high', sTwoHigh.total < sEven.total, `${sTwoHigh.total} < ${sEven.total}`);
assert('higher vs single-high', sOneHigh.total > sEven.total, `${sOneHigh.total} > ${sEven.total}`);

// ── Dossier ↔ engine consistency (the integrity lock) ────────────────────────
// For every representative concept against every scheme, the dossier's verdict
// (conceptMatchup → good / bad / neutral) must agree with the SIGN of the actual
// scoring delta vs the neutral base look. This is what stops the teaching layer
// from ever saying "even" where the engine quietly grants (or docks) points.
const mobile = buildTeamDeck('mobile_qb');
const ghosts = buildTeamDeck('defensive_pressure');
const checkdownCatch = air.cards.find((c) => c.action === 'checkdown_catch' && c.team === qbPass.team)!;
const shortPass = air.cards.find((c) => c.action === 'short_pass')!;
// A same-team catch reads as a stack, so to exercise the CHECKDOWN concept the
// catch must not stack with the passer (a non-same-team checkdown).
const checkdownOnly: FbCard = { ...checkdownCatch, team: 'OPP', id: `${checkdownCatch.id}-opp` };
const qbRun = mobile.cards.find((c) => c.action === 'scramble' || c.action === 'qb_sneak')!;
const defCard = ghosts.cards.find((c) => c.side === 'defense')!;

const reps: { hand: FbCard[] }[] = [
  { hand: carries },                         // ground_pound
  { hand: [carries[0]] },                    // designed_run
  { hand: [qbRun] },                         // qb_keeper
  { hand: stack },                           // double_stack_bomb
  { hand: [qbPass, sameTeamCatches[0]] },    // stack_td
  { hand: [shortPass, checkdownOnly] },      // checkdown
  { hand: [defCard] },                       // sack / takeaway / pick_six
];
const schemes: FbBossSchemeKey[] = ['no_fly_zone', 'stacked_box', 'turnover_drill', 'adaptive_dc'];
const NEUTRAL: FbDefensivePresentation = { shell: 'base', box: 'neutral', pressure: 'four-man', leverage: 'soft' };

// Score a fixed hand against a scheme using an EXPLICIT look (overriding the
// default mapping), so we can isolate boss-block-only vs each disguised look.
function scoreWith(cards: FbCard[], scheme: FbBossSchemeKey, pres: FbDefensivePresentation) {
  const ctx: FbScoreContext = {
    coordinators: [], environment: 'clear', bossScheme: scheme, presentation: pres,
    stacksThisMatch: 0, groundBonusThisMatch: 0, conceptCountsThisDrive: {},
  };
  return scoreFootballPlay(cards, ctx);
}
const sign = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : 'neutral');
const pct = (n: number, denom: number) => `${n >= 0 ? '+' : ''}${((100 * n) / Math.max(1, denom)).toFixed(1)}%`;

console.log('\nIsolated hidden-look proof (boss scheme held constant):');
console.log('concept           | scheme   | boss Δ vs base | primary look-only | alt look-only | hidden swing');
console.log('------------------|----------|----------------|-------------------|---------------|-------------');
let lookOnlyProofs = 0;
for (const { hand } of reps) {
  const base = scoreWith(hand, 'balanced', NEUTRAL);
  const concept = base.concept;
  for (const scheme of schemes) {
    const schemeOnly = scoreWith(hand, scheme, NEUTRAL);
    const [primary, alt] = presentationsForScheme(scheme);
    const primaryScore = scoreWith(hand, scheme, primary);
    const altScore = scoreWith(hand, scheme, alt);
    const bossDelta = schemeOnly.total - base.total;
    const primaryLookDelta = primaryScore.total - schemeOnly.total;
    const altLookDelta = altScore.total - schemeOnly.total;
    const swing = primaryScore.total - altScore.total;
    if (primaryLookDelta !== 0 || altLookDelta !== 0 || swing !== 0) {
      lookOnlyProofs += 1;
      console.log(`${concept.padEnd(17)} | ${FB_BOSS_SCHEMES[scheme].shortLabel.padEnd(8)} | ${`${bossDelta >= 0 ? '+' : ''}${bossDelta} (${pct(bossDelta, base.total)})`.padEnd(14)} | ${`${primaryLookDelta >= 0 ? '+' : ''}${primaryLookDelta} (${pct(primaryLookDelta, schemeOnly.total)})`.padEnd(17)} | ${`${altLookDelta >= 0 ? '+' : ''}${altLookDelta} (${pct(altLookDelta, schemeOnly.total)})`.padEnd(13)} | ${swing >= 0 ? '+' : ''}${swing} (${pct(swing, altScore.total)})`);
    }
  }
}
assert('look-only deltas are isolated from boss deltas', lookOnlyProofs > 0, `${lookOnlyProofs} non-zero look-only rows printed`);

console.log('\nDossier ↔ engine consistency (pre-reveal tendency + each revealed look):');
for (const { hand } of reps) {
  const concept = scoreWith(hand, 'balanced', NEUTRAL).concept;
  const baseTotal = scoreWith(hand, 'balanced', NEUTRAL).total;
  const mismatches: string[] = [];
  for (const scheme of schemes) {
    // Layer 1: pre-reveal verdict (no look) must match boss-block-only scoring.
    const bossOnly = scoreWith(hand, scheme, NEUTRAL).total - baseTotal;
    if (conceptMatchup(concept, scheme).tone !== sign(bossOnly)) {
      mismatches.push(`${FB_BOSS_SCHEMES[scheme].shortLabel} pre-reveal: says ${conceptMatchup(concept, scheme).tone}, scores ${sign(bossOnly)} (${bossOnly > 0 ? '+' : ''}${bossOnly})`);
    }
    // Layer 2: each revealed look's verdict must match that look's scoring.
    for (const look of presentationsForScheme(scheme)) {
      const delta = scoreWith(hand, scheme, look).total - baseTotal;
      if (conceptMatchup(concept, scheme, look).tone !== sign(delta)) {
        mismatches.push(`${FB_BOSS_SCHEMES[scheme].shortLabel} revealed: says ${conceptMatchup(concept, scheme, look).tone}, scores ${sign(delta)} (${delta > 0 ? '+' : ''}${delta})`);
      }
    }
  }
  assert(`${concept} verdicts match engine`, mismatches.length === 0, mismatches.length ? mismatches.join('; ') : 'pre-reveal + both looks agree across all schemes');
}

console.log('');
if (failures > 0) {
  console.error(`Matchup check FAILED: ${failures} assertion(s) broken.`);
  process.exit(1);
}
console.log('Matchup check passed: the same hand is better or worse based on the look.');
