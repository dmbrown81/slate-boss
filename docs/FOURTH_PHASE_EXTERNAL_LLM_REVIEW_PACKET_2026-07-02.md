# Fourth Phase External LLM Review Packet

Last updated: 2026-07-02

Use this packet as a single-source handoff for asking outside LLMs or human reviewers
to stress test Fourth Phase before wider app deployment. The goal is not approval.
The goal is a blunt critique that makes the game better.

## Copy-Paste Reviewer Prompt

```text
You are reviewing Fourth Phase, a fictional single-player football card roguelike.
Act as a harsh but constructive panel: senior game designer, mobile UX lead,
systems/balance designer, growth/creator-economy critic, and app launch reviewer.

Your job is not to be encouraging. Your job is to identify what would prevent this
game from being fun, understandable, replayable, shareable, or ready for mobile
deployment. Assume the creator wants a reality check before investing more time.

Use the source packet below as product truth. If you can access the repo or public
build, also inspect/play:
- Public build: https://dmbrown81.github.io/slate-boss/?v=ff57aa2
- Active UI: src/components/fourthPhase/FourthPhaseLab.tsx
- Rules guide: src/components/fourthPhase/FourthPhaseGuide.tsx
- Engine: src/lib/fourthPhase/engine.ts
- Situations: src/lib/fourthPhase/situations.ts
- Deck/team setup: src/lib/fourthPhase/deck.ts and run.ts
- Jokers: src/lib/fourthPhase/jokers.ts
- Balance harness: scripts/fourthPhaseBalance.ts

Hard constraints:
- No backend, accounts, multiplayer, global leaderboard, analytics, payments,
  betting, prizes, DFS framing, licensed teams, real players, or real league IP.
- Keep it local-first and fictional.
- Keep scoring deterministic: no hidden random rolls in gameplay scoring.
- Preserve: points = Yards x (1 + Execution) x BigPlay.
- Do not recommend field position unless you explain why it should override the
  current gate. Field position is intentionally deferred.

Deliver the review in this exact shape:

1. Blunt verdict
   - Is this game fun right now?
   - Is it understandable within 60 seconds on a phone?
   - Is it football enough?
   - Would you tell someone else to try it?
   - Would players post clips/screenshots/videos about it? Why or why not?

2. Scores from 1-10
   - First 60 seconds
   - Core loop
   - Strategic depth
   - Football fantasy
   - Mobile UI/UX
   - Clarity of scoring
   - Replayability
   - Social/share/viral potential
   - App deployment readiness

3. Top 10 problems, ranked by severity
   For each: explain the failure mode, what a player would feel, and the smallest
   practical fix.

4. Top 10 high-leverage improvements
   Separate "must ship before app deployment" from "nice later." Prefer changes
   that make the game clearer, more fun, more football, or more shareable without
   adding backend services.

5. First-run stress test
   Walk through what a cold player sees, where they might hesitate, what they
   misunderstand, and whether the tutorial actually teaches Crowd-before-Offense.

6. Systems and balance critique
   Evaluate the meter, situations, War Room, jokers, teams, bosses, difficulty,
   deterministic scoring, and whether losses feel fair. Call out any dominant,
   boring, or confusing strategies.

7. UI/UX critique
   Review hierarchy, thumb reach, text density, visual football feel, card
   legibility, ordering controls, score preview, ledger, War Room, run summary,
   mobile install/PWA feel, and accessibility.

8. Virality and creator critique
   Be skeptical. What would make someone record this? What is the "holy crap"
   moment? Is a cash-in visually dramatic enough? Is the result shareable enough?
   What share artifact would make sense while staying local-first?

9. Product direction
   Should the game double down on abstract Balatro-like football math, add more
   football simulation texture, cut complexity, or change onboarding? Defend your
   recommendation.

10. Go/no-go for wider testing
   Give a clear recommendation: deploy wider now, limited playtest only, or hold.
   List the minimum changes required to move up one readiness tier.

Be direct. If something is weak, say it plainly. Do not rewrite the game from
scratch unless you argue that the current direction cannot work. Do not propose
real teams, real players, betting, prizes, multiplayer, accounts, or a backend.
```

## Product Truth

Fourth Phase is the active product inside the Slate Boss repo. It is a
fictional, single-player football card roguelike built with Vite, React,
TypeScript, and Capacitor packaging.

Current public build:

```text
https://dmbrown81.github.io/slate-boss/?v=ff57aa2
```

Current commit:

```text
ff57aa2 Make Fourth Phase feel more football
```

Active app entry:

```text
src/App.tsx -> src/components/fourthPhase/FourthPhaseLab.tsx
```

Active game logic:

```text
src/lib/fourthPhase/*
```

Legacy note: older Callsmith/Gridiron files remain in the repo, and CI still runs
some legacy checks. Treat those as retained legacy code unless the active Fourth
Phase files call them directly.

## Product Bet

Fourth Phase is not Madden. It is closer to a football-flavored poker/roguelike:

- Balatro-like inspiration: simple equation, hand recognition, explosive combo
  moments, jokers, run-based scaling, shop decisions.
- Football inspiration: the four phases of football, play calling, drive targets,
  crowd momentum, hidden yards, boss defenses, scouting, War Room, sideline.
- Core design bet: football can teach the math if each phase has a clear job.

The most important player lesson:

```text
Crowd charges the meter. Offense cashes it. Order matters.
```

The player should learn, without a manual, that putting Crowd cards before an
Offense card creates the big "cash-in" moment.

## Non-Negotiable Constraints

- Local-first only.
- No backend, accounts, multiplayer, global leaderboard, analytics, payments,
  betting, real-money language, prizes, DFS contest framing, licensed teams,
  real players, or real league IP.
- Shipped content must remain fictional.
- Scoring must be deterministic. Variance comes from seeded run state, draw
  order, draft choices, and player decisions, not hidden rolls.
- Avoid `Math.random` in gameplay paths. Use seeded RNG from `src/lib/rng.ts`.
- Preserve this scoring contract:

```text
points = Yards x (1 + Execution) x BigPlay
```

- Preview and execution must use the same scoring context.
- Field position is deferred behind `docs/FOURTH_PHASE_FIELD_POSITION_GATE.md`.
  The current product bet is to prove the abstract target loop first.

## Current Game Loop

A run has three drives.

1. Pick or receive a team identity.
2. Draw an 8-card hand from a 52-card four-phase deck.
3. Select up to 5 cards to form a play.
4. Card order resolves left to right.
5. The selected phase pattern becomes a Situation.
6. The engine calculates Yards, Execution, BigPlay, meter, fuel, boss effects,
   jokers, and a visible score ledger.
7. Hit the drive target before the play limit.
8. Between drives, enter the War Room: buy jokers or Practice Drills, reroll, or
   skip for money.
9. Drive 3 has the boss defense active.
10. Win by clearing all three drives; lose by stalling before the target.

Core run constants:

```text
Hand size: 8
Cards per play: up to 5
Drives per run: 3
Plays per drive: 8
Discards/redraws per drive: 2
Joker slots: 5
War Room buy limit: 2
War Room reroll cost: $2
Starting money: $8
Base Crowd Meter: x1.0
Base meter cap: x6.0
Absolute meter cap: x12.0
```

## The Four Phases

The 52-card deck has 4 phases x 13 ranks. Ranks are 2 through Ace. J, Q, K are
value 10; Ace is 11.

| Phase | Short | UI color | Job | Football fantasy |
| --- | --- | --- | --- | --- |
| Offense | OFF | Blue | Base Yards | The payload, playmakers, drives, cashing the meter |
| Defense | DEF | Red | Execution | Reliability, pressure, floor, turnovers |
| Special Teams | ST | Gold | Fuel | Hidden yards, draw, money, discounts |
| Crowd | CRD | Purple | Meter | Stadium energy, noise, cash-in ceiling |

Current card examples:

- Offense 2: Boundary Blocker
- Offense A: Franchise Quarterback
- Defense A: Field General
- Special Teams A: Specialist Ace
- Crowd A: Twelfth Man

Team decks modify cards before shuffling:

| Team | Identity | Signature joker | Deck tendency |
| --- | --- | --- | --- |
| Ironwood Engineers / Balanced | All four phases live from snap one | The Genius | Baseline deck |
| Canyon Comets / Air Raid | Offense and Crowd explode, thinner floor | Hurry-Up | High-rank Offense/Crowd boosted |
| Foundry Maulers / Smashmouth | Low-rank Offense and ST grind safe value | Silent Count | Low Offense/ST boosted |
| Harbor Bruisers / Black & Blue | Defense and hidden yards build the floor | Pick-Six Specialist | Defense/ST boosted |
| Summit Noise / Loud House | Crowd charges fast, Base must be drafted | Twelfth Man | Crowd boosted |
| River City Sparks / ST Chaos | Fuel, draw, money create odd scoring windows | Field General | ST boosted |

## Situations

Situations are recognized by phase pattern in priority order. This is the game's
replacement for poker hands.

| Priority | Situation | Trigger | Payoff |
| --- | --- | --- | --- |
| 100 | Complementary Football | All four phases present | Apex play, cashes meter, gives draw/money/discount |
| 90 | Momentum Shift | 2+ Offense and 2+ Defense | Strong two-way score |
| 86 | House Call | Offense + Crowd | Main cash-in play |
| 85 | Pick Six | 2+ Defense and 1+ Offense, without Crowd outranking it | Burst score, charges meter |
| 70 | The Blackout | 3+ Crowd | Utility, no score, charges meter hard |
| 60 | Field Flip | 2+ Special Teams | Utility, no score, draw/money/discount fuel |
| 50 | The Stand | 3+ Defense | Low score, high Execution |
| 45 | The Drive | 3+ Offense | Straight score from Offense values |
| 30 | The Checkdown | 1-2 Offense only | Safe small score, saves hand |
| 1 | Busted Play | No clean shape | Weak score, meter bleed risk |

Important nuance: House Call outranks Pick Six if Crowd and Offense are present.
That keeps the main "Crowd before Offense cash-in" lesson front and center.

## Scoring Engine

Scoring happens in `src/lib/fourthPhase/engine.ts`.

The score is deterministic and ledger-backed:

```text
points = round(Yards x max(0.1, 1 + Execution) x BigPlay)
```

High-level scoring order:

1. Build scoring context from current run state.
2. Recognize the Situation from selected cards.
3. Seed Yards, Execution, BigPlay, meter/fuel from that Situation.
4. Apply Practice Drill bonuses.
5. Run joker hooks on situation detection.
6. Resolve cards left to right:
   - card traits/editions can modify score
   - Crowd cards charge meter
   - Crowd Favorite edition charges a little meter
   - jokers can react to cards/phases
   - if the Situation cashes meter, the first Offense card multiplies BigPlay by
     the current meter
7. Apply Situation meter bonus.
8. Apply retriggers from jokers.
9. Apply boss effects.
10. Run final joker hooks.
11. Calculate points.
12. Apply sustained tick, low-score/bust bleed, or hot-meter hold cost.
13. Return score, meter state, fuel, cash index, and ledger entries.

Preview and execution both call the same scoring function with the same context.
This is critical: the previewed number should not lie.

## Crowd Meter Rules

Meter starts at x1.0 and has a base cap of x6.0. Crowd cards charge it:

```text
Ace: +1.0
J/Q/K: +0.6
7/8/9/10: +0.4
2/3/4/5/6: +0.2
```

Non-bust plays also get a sustained tick of +0.1 meter.

Cash-in rule:

```text
If a Situation cashes the meter, the first Offense card in the played sequence
multiplies BigPlay by the current meter.
```

Therefore order matters. Crowd before Offense is much stronger than Offense
before Crowd.

Meter pressure:

- Busted plays bleed meter.
- Low scoring attempts bleed meter.
- Holding a hot meter without cashing or building it creates a hold cost.
- Some bosses cap or bleed the meter.
- Some jokers raise meter cap or exploit high meter.

## Bosses

Boss pressure is scouted early and becomes active on drive 3.

| Boss | Effect |
| --- | --- |
| Stacked Box | Offense Yards are cut in half |
| No-Fly Zone | Only two Offense cards are clean; extra Offense loses Yards |
| Road Game | Meter cap forced to x2.0 with heavier bleed |
| Turnover Drill | Defense subtracts Execution |
| Field Position War | Special Teams gives no fuel |
| Adaptive DC | Repeated Situations score 0 |
| Prevent Defense | BigPlay is capped |

Reviewer question: do these bosses feel like football challenges, or just hidden
math penalties with football names?

## Jokers / Sideline

The current game has 29 jokers. The UI calls this area "Sideline (Jokers)."
Jokers are the main run-scaling/build identity system.

| Joker | Rarity | Effect |
| --- | --- | --- |
| Twelfth Man | Core | Crowd cards charge the meter 50% harder |
| Home Cooking | Core | Meter does not bleed on a drive's final play |
| Sustained Drive | Rare | Each non-bust play raises meter cap by 0.15, bounded |
| Silent Count | Core | While meter is cold, each Defense card adds +0.25 Execution |
| Pick-Six Specialist | Rare | A Pick Six charges the meter to its current cap |
| The Genius | Rare | Complementary Football gains +0.08 Execution and +1.00 BigPlay |
| Field General | Core | Each Special Teams card gives +1 next draw and +$2 |
| Two-Minute Drill | Rare | With 0 discards, retrigger all Offense |
| Road Warriors | Rare | When a boss forces meter cap low, Offense cards gain +60 Yards |
| Bandwagon | Core | Meter starts +0.3 for each prior drive/game won in context |
| Decibel Record | Legendary | Meter cap rises to x12, but bleeds 40% after every play |
| Hurry-Up | Core | If 5 cards are played, retrigger all Offense |
| Lead Blocker | Core | Defense immediately before Offense adds +8 Yards |
| Double Move | Core | Offense immediately after Crowd gains +0.12 BigPlay |
| Hidden Yards | Core | Special Teams cards inside scoring Situations add +6 Yards |
| Student Section | Core | Sustained non-bust tick charges +0.10 extra meter |
| Film Study | Core | First copy of each Situation per drive gains +0.16 Execution |
| Red Zone Package | Core | Within 180 target points, non-utility plays gain +8 Yards, +0.10 Execution, +0.34 BigPlay |
| Walk-On Program | Core | Cards valued 6 or lower add +4 Yards if Offense, otherwise +0.04 Execution |
| Checkdown Merchant | Core | Checkdowns give +1 draw and +$1 |
| Bend, Don't Break | Core | Busted plays with Defense gain +0.10 Execution and prevent bleed |
| Coordinator Tree | Rare | Plays with 3+ phases gain Yards/Execution; all four phases add BigPlay |
| Closer | Rare | On boss drive, non-bust plays gain +10 Yards, +0.10 Execution, +0.45 BigPlay |
| Press Box Angle | Rare | Against boss, first copy of each Situation gains +8 Yards and +0.12 Execution |
| Return Ace | Rare | Field Flip gives +2 draw, +$4, and +1 discount |
| Home Run Threat | Rare | House Calls with meter at x3+ gain +0.50 BigPlay |
| Scripted Series | Rare | Non-bust plays gain +6 Yards per prior play this drive, capped at +24 |
| Blackout Curtain | Rare | Blackouts raise meter cap by +0.50, capped at x8.5, and add +0.40 meter |
| Phase Collector | Legendary | Five-card all-four-phase plays gain +0.35 BigPlay and raise cap by +0.75, capped at x9 |

Reviewer question: which jokers sound fun before you know the math, and which
feel like spreadsheet modifiers?

## War Room

The War Room appears between drives.

Current behavior:

- Offers 3 joker offers plus 1 Practice Drill.
- Joker offers cost $4.
- Practice Drills cost $3.
- Up to 2 buys.
- Reroll costs $2.
- Skip with no buys banks $3.
- If the Sideline is full, buying a joker asks the player to release one.
- Special Teams discount tokens can reduce offer cost by up to $2, never below $1.
- Offers are tagged with hints such as "feeds Crowd cash-in", "defensive floor",
  "boss-drive plan", or "team identity."
- War Room previews next drive target and boss.

Practice Drill levels:

- Max level 3 per Situation.
- Non-utility Situations gain +5 Yards, +0.03 Execution, and either +0.12 BP if
  cashing or +0.05 BP otherwise per level.
- Field Flip practice adds draw and money.
- Blackout practice adds meter charge.

Reviewer question: does the War Room feel like a compelling draft/shop, or just
a list of small stat modifiers?

## UI / UX State

Current active UI is `FourthPhaseLab.tsx`, intentionally phone-first with a max
width around 560px.

Current screen flow:

1. Header with run code and New run.
2. Played first-run tutorial card.
3. Team identity line.
4. Collapsible How to play.
5. Crowd Meter with segmented stadium-noise bar.
6. Drive panel:
   - LED-style score
   - field strip with yard lines and a football moving toward GOAL
   - plays-left pips
   - boss scouting or active boss pressure
7. Cash-in celebration card, when triggered.
8. War Room or run summary, if relevant.
9. Selected Play row with order badges and CASHES badge.
10. Preview card with score and Yards/Execution/BigPlay terms.
11. Hand grid.
12. Live Ledger.
13. Sideline (Jokers).
14. Situations reference panel.
15. Second How to play panel.
16. Locker Room:
    - Daily run
    - Local best
    - Team picker
    - Run-code import
17. Fixed bottom action bar:
    - current Situation/points
    - Run Play
    - Redraw

Current football-feel pass added:

- Field-style drive progress with turf bands, yard lines, hash marks, goal zone,
  and a moving football.
- Stadium/noise treatment for the Crowd Meter.
- LED-style score digits.
- Plays-left pips.
- Phase glyphs on cards and in the guide:
  - football for Offense
  - shield for Defense
  - goalpost for Special Teams
  - noise bars for Crowd
- Jersey-stripe top edge on cards.
- Football glyph in header and Run Play button.
- "Sideline (Jokers)" naming.

Reviewer question: is this now "football enough," or does it still feel like a
generic math/card prototype with football labels?

## First-Run Tutorial

The tutorial is played, not just read:

1. "Tap any blue OFF card ... Run Play."
2. "Tap a purple CRD card FIRST, then a blue OFF card ... Run Play."
3. "See the CASHES badge and the big BigPlay multiplier?"

The opening deck is scripted to give the player cards that support the lesson.

Reviewer questions:

- Does this teach the one essential trick within 60 seconds?
- Is "left scores first" visible enough?
- Does a cold player understand why the second play is better?
- Is the player likely to read the bottom bar and selected-play order badges?

## Retention And Sharing

Current local-only retention:

- Local run history in `fourth_phase_history_v1`.
- Daily seed in `fourth_phase_daily_v1`.
- Daily streak, with practice mode if already completed today.
- Local best.
- Run code import/replay.
- Copyable cash-in text.
- Copyable run result text.

Current limitations:

- No backend leaderboard.
- No online accounts.
- No analytics.
- No direct video/share-card renderer yet.
- Copy result is text-only.
- The biggest social moment is the cash-in card, not a generated image or clip.

Reviewer question: given the constraints, what local-first share artifact would
actually make someone post? A text result may be too weak.

## Balance And Verification

Main gates:

```bash
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000
```

The full balance harness simulates three policies:

- `synergy`: skilled pilot that reorders cards for cash-in, evaluates fuel and
  War Room value, and drafts intelligently.
- `random`: random-ish pilot.
- `none`: no-draft baseline.

Latest passing 3000-sample result:

```text
synergy   win=80.6% fail=19.4% median=1910 p90=2371 p99=2737 peak=735 money_med=40 tight=19.9%
random    win=2.2%  fail=97.8% median=626  p90=1291 p99=1882 peak=456 money_med=25 tight=11.3%
noDraft   win=62.1% fail=37.9% median=1793 p90=2256 p99=2619 peak=563 money_med=57 tight=32.2%

Team viability:
Balanced     win=82.8%
Air Raid     win=77.0%
Smashmouth   win=80.2%
Black & Blue win=80.0%
Loud House   win=81.6%
ST Chaos     win=82.2%

Draft gap: +18.6 win points
Per-team spread: 5.8 points
Loud House not bottom
Meter ceiling tightness: 19.9%, p99 peak x8.75
```

Hard target gates:

- Synergy win: 75-85%.
- No-draft win: 55-65%.
- Draft gap: >= +15 win points.
- Build gap: >= +8 win points versus random.
- Per-team spread: <= 6 points.
- Loud House must not be bottom.
- Meter tightness: <= 35%.

Important interpretation: random win rate is very low. That may be fine if the
tutorial and previews teach quickly, but it may also mean many cold players will
lose before the game becomes fun.

## Known Weak Spots To Attack

These are not bugs; they are areas where harsh review is wanted.

1. First-run comprehension may still be fragile.
2. The game uses abstract point targets, not actual downs/field position.
3. It may still not feel football enough despite the recent visual pass.
4. The UI has a lot of dense text and numbers on mobile.
5. The preview/ledger are powerful but may feel like a spreadsheet.
6. The War Room may read as stat shopping rather than a dramatic coaching room.
7. The cash-in moment may not yet have enough animation, sound, haptics, or share
   juice to become a clip-worthy moment.
8. Joker names are flavorful, but many effects may not be legible at speed.
9. Social loop is local-first but currently underpowered.
10. Random/novice win rate may be punishing.
11. `FourthPhaseLab.tsx` is large and mixes orchestration and UI.
12. Native packaging still has historical Callsmith naming in some places.

## Field Position Gate

Field position is deliberately deferred. It can make the game feel more like
football, but it can also bury the clean core loop under simulation texture.

Allowed only after:

- Full Fourth Phase balance gates pass.
- Cold player can reach a meter cash-in without opening references.
- Daily/local history signals are working.
- Ledger explains large cash-ins without hidden rolls.

If field position is recommended, reviewers should explain why it is worth the
complexity and how to feature-flag it without damaging the abstract mode.

## What Excellent Feedback Should Look Like

High-value feedback should:

- Be specific enough to become a task.
- Separate fatal issues from polish issues.
- Focus on the first 60 seconds, the first cash-in, and the first War Room.
- Identify where football theme clarifies math and where it is just decoration.
- Name what would make a player say "I need to try one more run."
- Name what would make a viewer understand a clip without context.
- Respect the constraints while still challenging bad assumptions.

Low-value feedback:

- "Add multiplayer."
- "Use real NFL teams."
- "Add betting/prizes."
- "Make it like Madden."
- "Add a backend leaderboard."
- "Looks good."
- "Needs polish" without saying exactly where and why.

## Suggested Output Rubric For Reviewers

Ask reviewers to finish with:

```text
Go/no-go:
Top 3 reasons:
Top 3 fixes before app deployment:
Top 3 fixes for virality/shareability:
One feature to cut:
One feature to double down on:
One thing that is secretly excellent:
One thing that is secretly dangerous:
```
