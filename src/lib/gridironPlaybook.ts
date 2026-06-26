// Gridiron — Concept Dossiers (the teaching layer).
//
// This is the "learn football by playing" hook: the same role the run-info /
// hand-reference plays in Balatro, where you absorb *why* a flush beats a pair
// without ever reading a rulebook. Each engine concept is given an AUTHENTIC
// football identity plus four teaching beats — what it is, what it beats, what
// stuffs it, and how to make it scale.
//
// CRITICAL INTEGRITY RULE — two layers of knowledge, kept honest separately:
//   (1) `strongVs` / `weakVs` = the BOSS-SCHEME tendency (the scoreFootballPlay
//       boss-scheme block). You always know WHICH boss you face, so this layer is
//       always shown. It must match the boss block's penalties/bonuses exactly.
//   (2) The PRE-SNAP EDGE (presentationEdge) depends on the defense's exact LOOK,
//       which is hidden until revealed (disguise). conceptMatchup layers it on ONLY
//       when the live presentation is passed in (i.e. revealed). It never appears
//       in strongVs/weakVs, because pre-reveal you don't know the look.
// The teaching can never say "even" where the engine gives points: layer (1) is
// verified by the consistency matrix in scripts/gridironMatchupCheck.ts against a
// neutral look, and layer (2) by the same script passing each live presentation.
// When you touch a boss modifier, re-audit strongVs/weakVs; when you touch a
// presentationEdge cell or a PRESENTATION_*_BY_SCHEME look, re-run the check.
//
// This layer is presentation/data ONLY. It reads FbConceptKey + FbBossSchemeKey
// and changes no scoring, price, or balance number.

import { FB_BOSS_SCHEMES, presentationEdge, type FbConceptKey, type FbBossSchemeKey, type FbCard, type FbActionType, type FbPosition, type FbDefensivePresentation } from './footballRogue';

export type ConceptFamily = 'Pass' | 'Run' | 'Option' | 'Defense' | 'Special' | 'Broken';

export interface ConceptDossier {
  realName: string;     // authentic football term the sim crowd recognizes
  family: ConceptFamily;
  whatItIs: string;     // plain teaching line — what's happening on the field
  beats: string;        // the coverages / fronts this concept attacks
  losesTo: string;      // what stuffs it
  scaleTip: string;     // the puzzle hook — how to turn it into a points engine
  strongVs: FbBossSchemeKey[]; // schemes the engine gives this concept a bonus vs
  weakVs: FbBossSchemeKey[];   // schemes the engine penalizes this concept vs
}

export const CONCEPT_DOSSIERS: Record<FbConceptKey, ConceptDossier> = {
  double_stack_bomb: {
    realName: 'Four Verticals / Shot Play',
    family: 'Pass',
    whatItIs: 'The QB hits two-plus receivers downfield on the same drop — a vertical concept that stresses every deep defender at once.',
    beats: 'Single-high shells (Cover 1/3) — one safety can’t carry every seam.',
    losesTo: 'Two-high coverage and wind, which cap the deep ball.',
    scaleTip: 'Get a deep card involved for the Shot Play bonus, then stack Explosive traits and Franchise QB to compound the multiplier.',
    strongVs: ['stacked_box', 'turnover_drill'],
    weakVs: ['no_fly_zone'],
  },
  shootout_stack: {
    realName: 'Bring-Back / Shootout',
    family: 'Pass',
    whatItIs: 'You pair your QB with an opposing pass-catcher — when both offenses trade scores, the correlation pays off on the same play.',
    beats: 'Track-meet game scripts where the defense can’t get off the field.',
    losesTo: 'Two-high zones that take away the deep stack.',
    scaleTip: 'Layer it on a Double-Stack so the bring-back multiplier rides on top of the bomb.',
    strongVs: ['stacked_box', 'turnover_drill'],
    weakVs: ['no_fly_zone'],
  },
  stack_td: {
    realName: 'QB Stack (Stick / Slant-Flat)',
    family: 'Pass',
    whatItIs: 'The quarterback and one pass-catcher on the same play — the foundation every passing concept is built on. A rhythm throw.',
    beats: 'Man coverage and soft underneath zones.',
    losesTo: 'Little punishes it — its only weakness is a low ceiling on its own.',
    scaleTip: 'Repeat stacks to ramp Air Raid, then graduate to a Double-Stack for the big play.',
    strongVs: ['no_fly_zone', 'stacked_box', 'turnover_drill'],
    weakVs: [],
  },
  checkdown: {
    realName: 'Checkdown / Dump-Off',
    family: 'Pass',
    whatItIs: 'The safe answer underneath to a back or tight end. The hand you can’t lose with — and, like High Card in poker, the one that turns absurd if you build around it.',
    beats: 'Deep zones and pressure — the ball is out before the rush arrives.',
    losesTo: 'Nothing hits it hard; the catch is the floor of your offense.',
    scaleTip: 'West Coast Guru and Salary Wizard turn cheap checkdowns into a stacking points engine — your High-Card win.',
    strongVs: ['no_fly_zone', 'turnover_drill'],
    weakVs: [],
  },
  ground_pound: {
    realName: 'Inside Zone / Power / Duo',
    family: 'Run',
    whatItIs: 'Multiple carries pounding downhill behind the line. The chains-mover with the highest floor in the game.',
    beats: 'Light boxes and two-high shells that trade a run defender for coverage.',
    losesTo: 'A loaded box (Stacked Box) with more hats than you can block.',
    scaleTip: 'Stack three carries for the Gash big play, bank Bell Cow’s accruing base, and add Power Sweep to turn volume into a multiplier.',
    strongVs: ['turnover_drill'],
    weakVs: ['stacked_box'],
  },
  designed_run: {
    realName: 'Single-Back Run / Draw',
    family: 'Run',
    whatItIs: 'One carry, one read — a quick gap run to stay on schedule.',
    beats: 'Light boxes and aggressive pass-rush looks (the draw).',
    losesTo: 'Stacked boxes keyed on the run.',
    scaleTip: 'Pair carries to upgrade into Ground & Pound, where the real scaling lives.',
    strongVs: ['turnover_drill'],
    weakVs: ['stacked_box'],
  },
  qb_keeper: {
    realName: 'Read Option / QB Keeper',
    family: 'Option',
    whatItIs: 'The quarterback reads the edge defender and pulls it himself — putting one defender in a no-win conflict.',
    beats: 'Empty-box man coverage and slow-flowing edge defenders.',
    losesTo: 'A spy or mug front (Stacked Box), and takeaway-hunting defenses.',
    scaleTip: 'Add a second QB-run card for the Option Pitch big play; Read-Option Guru ramps it, and Broken Play Artist rescues a stranded keeper hand.',
    strongVs: ['turnover_drill'],
    weakVs: ['stacked_box'],
  },
  field_goal: {
    realName: 'Field Goal',
    family: 'Special',
    whatItIs: 'Reliable points when a drive stalls inside range.',
    beats: 'Any defense — it doesn’t ask permission.',
    losesTo: 'Its own low ceiling — a safety net, never the engine.',
    scaleTip: 'Level the Field Goal Game Plan so the chip-shot still contributes when the big plays don’t land.',
    strongVs: [],
    weakVs: [],
  },
  extra_point: {
    realName: 'Extra Point',
    family: 'Special',
    whatItIs: 'The automatic point after a score.',
    beats: '—',
    losesTo: '—',
    scaleTip: 'Filler — spend your budget on a real concept.',
    strongVs: [],
    weakVs: [],
  },
  pick_six: {
    realName: 'Pick Six',
    family: 'Defense',
    whatItIs: 'The defense intercepts and takes it the distance — the biggest splash a non-offensive build can make.',
    beats: 'Aggressive, mistake-prone quarterbacks.',
    losesTo: 'Ball-security offenses (Turnover Drill) that protect the rock.',
    scaleTip: 'Ball-Hawk DC multiplies it now; Takeaway Machine compounds it across the season.',
    strongVs: [],
    weakVs: ['turnover_drill'],
  },
  takeaway: {
    realName: 'Takeaway / Interception',
    family: 'Defense',
    whatItIs: 'A turnover that flips the field and feeds your defensive engine.',
    beats: 'Quarterbacks forced off their spot by pressure.',
    losesTo: 'Disciplined, ball-secure offenses (Turnover Drill).',
    scaleTip: 'Pressure Chain ramps every defensive snap; chain takeaways to power Takeaway Machine.',
    strongVs: [],
    weakVs: ['turnover_drill'],
  },
  sack: {
    realName: 'Sack / Pressure',
    family: 'Defense',
    whatItIs: 'Get home and drop the QB — the down-and-distance setup for the takeaway.',
    beats: 'Slow-developing dropback passing.',
    losesTo: 'Quick game and screens that beat the rush.',
    scaleTip: 'Stack defensive snaps for Pressure Chain; a sack sets up the next-play interception.',
    strongVs: [],
    weakVs: ['turnover_drill'],
  },
  busted_play: {
    realName: 'Busted Play',
    family: 'Broken',
    whatItIs: 'These cards don’t combine into a concept — no QB to throw, no stack, no run fit. The play breaks down.',
    beats: 'Nothing — this is the hand to avoid.',
    losesTo: 'Itself.',
    scaleTip: 'Add a Reliable card or the Broken Play Artist to salvage a broken hand into a positive gain.',
    strongVs: [],
    weakVs: [],
  },
};

export function conceptDossier(concept: FbConceptKey): ConceptDossier {
  return CONCEPT_DOSSIERS[concept] ?? CONCEPT_DOSSIERS.busted_play;
}

export type MatchupTone = 'good' | 'bad' | 'neutral';

export interface MatchupVerdict { tone: MatchupTone; label: string; }

// The live teaching moment: how the concept you're assembling grades against the
// defense you're actually facing this week. Derived from the same strongVs/weakVs
// that mirror the engine, so the verdict can never disagree with the score.
// Layer (1) is the boss-scheme tendency (always known). Layer (2) is the pre-snap
// edge from the exact LOOK — pass `presentation` only once it's revealed, and the
// verdict upgrades to reflect it. Pre-reveal (no presentation) the verdict shows
// only what the scheme tells you, which is the whole point of the disguise.
export function conceptMatchup(concept: FbConceptKey, scheme: FbBossSchemeKey | undefined, presentation?: FbDefensivePresentation): MatchupVerdict {
  if (!scheme) return { tone: 'neutral', label: 'Base look — no scheme edge' };
  const d = CONCEPT_DOSSIERS[concept];
  const short = FB_BOSS_SCHEMES[scheme].shortLabel;
  if (!d || concept === 'busted_play') return { tone: 'neutral', label: scheme === 'balanced' ? 'Base look — no scheme edge' : `vs ${short}` };
  // Layer (1): the boss block penalizes this concept — known from the scheme alone.
  if (d.weakVs.includes(scheme)) return { tone: 'bad', label: `${short} counters this` };
  // Layer (2): a revealed look that hands this concept a Pre-Snap Edge.
  const hasEdge = presentation ? presentationEdge(concept, presentation) !== null : false;
  if (hasEdge) return { tone: 'good', label: `Edge vs ${short}` };
  if (d.strongVs.includes(scheme)) return { tone: 'good', label: `Strong vs ${short}` };
  if (scheme === 'balanced') return { tone: 'neutral', label: 'Base look — no scheme edge' };
  return { tone: 'neutral', label: `Even vs ${short}` };
}

// ── Card vocabulary (step 2: make the CARDS speak football) ──────────────────
// Each card is an action by a player; this gives it an authentic assignment
// identity so a hand reads like a real depth chart instead of generic verbs.
//
//   family  the "suit" — the assignment family every card belongs to. This is
//           the football analog of Balatro's four suits (the doc's Block / Route /
//           Read / Ball taxonomy), the grouping a player learns to read first.
//   route   the specific route or scheme, position-aware (a WR deep ball is a
//           Go/Post; a TE deep ball is a Seam) — the texture the sim crowd loves.
//
// Presentation/data ONLY: scoring keys off card.action/side exactly as before.
export type AssignmentFamily = 'Route' | 'Pass' | 'Run' | 'Read' | 'Cover' | 'Rush' | 'Kick';

export function cardFamily(action: FbActionType): AssignmentFamily {
  switch (action) {
    case 'deep_pass':
    case 'short_pass': return 'Pass';
    case 'scramble':
    case 'qb_sneak': return 'Read';
    case 'power_run':
    case 'breakaway_run': return 'Run';
    case 'deep_catch':
    case 'short_catch':
    case 'checkdown_catch': return 'Route';
    case 'field_goal':
    case 'extra_point': return 'Kick';
    case 'sack': return 'Rush';
    case 'interception':
    case 'return_td': return 'Cover';
  }
}

export function cardRoute(action: FbActionType, position: FbPosition): string {
  switch (action) {
    case 'deep_pass': return 'Deep shot';
    case 'short_pass': return 'Quick game';
    case 'scramble': return 'Scramble';
    case 'qb_sneak': return 'QB sneak';
    case 'power_run': return 'Gap / Power';
    case 'breakaway_run': return 'Outside zone';
    case 'deep_catch':
      return position === 'TE' ? 'Seam' : position === 'RB' ? 'Wheel' : 'Go / Post';
    case 'short_catch':
      return position === 'TE' ? 'Stick' : position === 'RB' ? 'Angle' : 'Slant / Hitch';
    case 'checkdown_catch': return 'Checkdown / Flat';
    case 'field_goal': return 'Field goal';
    case 'extra_point': return 'Extra point';
    case 'sack': return 'Pass rush';
    case 'interception': return 'Ball-hawk';
    case 'return_td': return 'Take it back';
  }
}

export interface CardConcept { family: AssignmentFamily; route: string; }

export function cardConcept(card: FbCard): CardConcept {
  return { family: cardFamily(card.action), route: cardRoute(card.action, card.position) };
}
