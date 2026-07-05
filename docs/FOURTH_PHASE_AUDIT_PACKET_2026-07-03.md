# Fourth Phase Audit Packet - July 3, 2026

> Purpose: give another AI model, designer, or reviewer enough context to audit
> Fourth Phase as a game, not just as a codebase. This is intended as a
> standalone prompt packet for directional feedback on mechanics, onboarding,
> UI, balance, replayability, football fantasy, and implementation risk.

Created: 2026-07-03. Repo observed: `/Users/dominicbrown/Desktop/slate-boss`.
Branch observed: `main`. Current commit observed: `239d486 Polish Fourth Phase
phone UI with a shared style kit`. Local tree was clean when this packet was
started. Latest known public build: `https://dmbrown81.github.io/slate-boss/`.

Latest known full gate result:

```text
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000
```

All passed on the current Fourth Phase UI/code state. The latest 3000-sample
Fourth Phase balance run:

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
Build gap: +78.5 win points versus random
Per-team spread: 5.8 points
Loud House not bottom
Meter ceiling tightness: 19.9%, p99 peak x8.75
```

Important recent creator-playtest signal:

```text
The creator opened the latest public game on a phone and did not understand
what was happening, what the goal was, what to accomplish, or why Defense cards
exist. This is not a minor copy issue. It is a core first-60-seconds clarity
problem to audit aggressively.
```

---

## 1. One-Sentence Framing

Fourth Phase is a fictional single-player football card roguelike where the
player clears three drive targets by selecting and ordering football-phase cards
so that Crowd charges a meter and Offense cashes it into a big deterministic
score.

The intended player sentence should be:

```text
Score enough points to clear each drive before plays run out. Build Crowd first,
then play Offense to cash the meter. Draft upgrades between drives.
```

If this is not obvious in the live game, the game is failing its main usability
test.

---

## 2. Product Truth

Fourth Phase is the active product inside the Slate Boss repo.

Stack:

- Vite
- React
- TypeScript
- Capacitor packaging
- GitHub Pages public web deploy
- Local-first PWA/service-worker shell

Active app entry:

```text
src/App.tsx -> src/components/fourthPhase/FourthPhaseLab.tsx
```

Active game logic:

```text
src/lib/fourthPhase/*
```

Legacy note:

- Older Callsmith/Gridiron season-game code remains in the repo.
- Many older files, docs, and scripts still say `gridiron` or `Callsmith`.
- The old game is not the active app front door.
- Some legacy checks still run to avoid accidental breakage.
- Treat legacy code as retained history unless active Fourth Phase files call it.

Core design lineage:

- Balatro-like structure: clear scoring equation, hand recognition, run-based
  shop, jokers, build-arounds, deterministic seeds, explosive score moments.
- Football language: drives, phases, crowd momentum, hidden yards, boss
  defenses, scouting, War Room, play calling.
- Current product bet: prove the abstract-target loop before adding actual
  field position, downs, clock, or deeper football simulation.

---

## 3. Non-Negotiable Constraints

Do not recommend or add:

- backend services
- accounts
- multiplayer
- global leaderboards
- analytics
- payments
- betting
- real-money or prize language
- DFS contest framing
- licensed leagues
- real teams
- real players
- real college/pro IP

Keep:

- fictional content
- local-first retention
- deterministic gameplay
- seeded run state
- no hidden random rolls in scoring
- no `Math.random` in gameplay paths that need replayability

Preserve the scoring contract:

```text
points = Yards x (1 + Execution) x BigPlay
```

Preview and execution must score through the same context builder. A previewed
number that does not match execution is a critical bug.

Field position is intentionally deferred. Read
`docs/FOURTH_PHASE_FIELD_POSITION_GATE.md` before recommending it. The current
gate says field position should wait until the abstract loop teaches itself,
daily/local history works, balance passes, and the ledger explains big cash-ins.

---

## 4. What The Player Is Supposed To Do

The player is trying to win a run.

A run has 3 drives. Each drive has:

- a point target
- a finite play limit
- an 8-card hand
- up to 5 selected cards per play
- a visible score preview
- a Crowd Meter
- eventual boss pressure on drive 3

The player wins by clearing all three drive targets. The player loses when a
drive target is not cleared before plays run out.

The intended repeated decision:

```text
Should I score safe points now, build the Crowd Meter, cash the meter, or use
Special Teams for future fuel?
```

The main trick:

```text
Crowd charges the meter. Offense cashes it. Card order resolves left to right.
Crowd before Offense is much better than Offense before Crowd.
```

The first-run tutorial currently attempts to teach this:

1. Tap one blue Offense card and run a Checkdown.
2. Tap a purple Crowd card first, then a blue Offense card.
3. Observe the Cash/BigPlay result, then continue.

Known problem to stress test:

```text
The tutorial may execute mechanically but still fail to explain the player's
overall job, why points matter, what a drive is, what Defense is for, or how to
judge a good move.
```

---

## 5. Current Game Loop

Full run loop:

1. Start a run with a team/deck identity.
2. Draw an opening hand of 8 cards.
3. Select up to 5 cards from the hand.
4. Optionally reorder selected cards.
5. Preview the recognized Situation and score.
6. Run the play.
7. Engine resolves selected cards left to right.
8. Drive score increases by play points.
9. Crowd Meter may charge, cash, or bleed.
10. Special Teams may add draw, money, or discount fuel.
11. Hand refills.
12. If target is met, go to War Room unless all drives are cleared.
13. In War Room, buy up to 2 offers, reroll, or skip.
14. Drive 3 activates the boss defense.
15. Win after drive 3 target is cleared; lose if a drive stalls.

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
Skip War Room with no buys: +$3
Base Crowd Meter: x1.0
Base meter cap: x6.0
Absolute meter cap: x12.0
Discount token cap: 3
Discount tokens per offer: max 2
```

---

## 6. Four Phase System

The deck has 52 cards:

```text
4 phases x 13 ranks
Ranks: 2,3,4,5,6,7,8,9,10,J,Q,K,A
Rank values: 2-10 face value, J/Q/K = 10, A = 11
```

| Phase | Short | Current UI Color | Mechanical Job | Current Fantasy |
| --- | --- | --- | --- | --- |
| Offense | OFF | Blue | Yards/base payload and cashing | Scoring drive, playmakers, finishing |
| Defense | DEF | Red | Execution/reliability and defensive situations | Pressure, discipline, floor, turnovers |
| Special Teams | ST | Gold | Fuel: draw, money, discounts | Hidden yards, field flip, economy |
| Crowd | CRD | Purple | Meter charge and BigPlay ceiling | Stadium noise, momentum, cash-in |

Major clarity problem:

```text
Defense cards do not behave like normal football defense stopping an opponent.
They behave more like Execution, Protection, Discipline, or Reliability cards.
The name "Defense" may be thematically valuable but is currently confusing.
Reviewers should decide whether to rename, relabel, tutorialize, or visually
reframe this phase.
```

Plain-language current meaning:

- Offense gives the base score.
- Defense makes a score more reliable/bigger through Execution.
- Crowd creates the big multiplier.
- Special Teams creates resources and future hand quality.

---

## 7. Card Taxonomy

Each card has:

- `id`
- `phase`
- `rank`
- `value`
- `tier`
- `roleName`
- `tags`
- optional `modifier`
- optional `edition`

Card tiers by rank:

| Ranks | Tier |
| --- | --- |
| 2-3 | rotation |
| 4-6 | starter |
| 7-8 | proBowl |
| 9-10 | captain |
| J | scheme |
| Q-K | playmaker |
| A | franchise |

Examples by phase:

| Rank | Offense | Defense | Special Teams | Crowd |
| --- | --- | --- | --- | --- |
| 2 | Boundary Blocker | Nickel Fit | Coverage Wedge | Student Section |
| 5 | RPO Keep | Robber Drop | Punt Pin | Towel Wave |
| 8 | Tempo Quarterback | Heat Check | Fake Threat | Whiteout |
| 10 | Vertical Shot | Turnover Punch | Field Flip | Stadium Pulse |
| J | Play-Action Ace | Coverage Captain | Kicker Nerve | Decibel Spike |
| Q | Chain Mover | Ball Hawk | Return Captain | Home Stand |
| K | Feature Back | Pocket Wrecker | Hidden Yards | Rivalry Roar |
| A | Franchise Quarterback | Field General | Specialist Ace | Twelfth Man |

Modifiers currently defined:

- reliable
- explosive
- clutch
- hometownHero
- injuryProne
- lockerRoomCancer
- agingVet
- holdout

Editions currently defined:

- allPro
- inRhythm
- homeRun
- crowdFavorite

Not all modifiers are necessarily broadly surfaced in current deck generation.
Team preparation currently uses some editions/modifiers to make team starts feel
different.

---

## 8. Situations

Situations are the hand-recognition layer. They replace Balatro's poker hands
with football phase shapes.

Recognition priority order:

| Priority | Situation | Trigger | Main Payoff |
| ---: | --- | --- | --- |
| 100 | Complementary Football | All four phases present | Apex play, cashes meter, gives fuel |
| 90 | Momentum Shift | 2+ Offense and 2+ Defense | Strong score with high floor |
| 86 | House Call | Offense + Crowd | Main Crowd Meter cash-in |
| 85 | Pick Six | 2+ Defense and 1+ Offense, no Crowd outranking it | Burst score and meter charge |
| 70 | The Blackout | 3+ Crowd | Utility, no score, charges meter hard |
| 60 | Field Flip | 2+ Special Teams | Utility, no score, draw/money/discount |
| 50 | The Stand | 3+ Defense | Low score, high Execution |
| 45 | The Drive | 3+ Offense | Straight Offense score |
| 30 | The Checkdown | 1-2 Offense only | Safe small score, saves hand |
| 1 | Busted Play | No clean shape | Weak score, bleed risk |

Important design nuance:

- House Call intentionally outranks Pick Six if Offense and Crowd are both
  present.
- This keeps the main "Crowd before Offense cashes the meter" lesson central.
- The phase pattern can be correct while the card order still matters.

Reviewer questions:

- Are these situations football-legible?
- Are there too many names before the player understands the goal?
- Should early UI say "scores", "charges", "fuel", or "bad call" before naming
  the formal Situation?
- Is Defense's role better explained by Situation names or by a renamed phase?

---

## 9. Scoring Engine

Engine file:

```text
src/lib/fourthPhase/engine.ts
```

Core equation:

```text
points = round(Yards x max(0.1, 1 + Execution) x BigPlay)
```

High-level pipeline:

1. Build scoring context from current run state.
2. Recognize the Situation from selected cards.
3. Seed Yards, Execution, BigPlay, meter/fuel from the Situation.
4. Apply Practice Drill bonuses.
5. Run joker hooks on Situation detection.
6. Resolve cards left to right.
7. Apply card traits and editions.
8. Crowd cards charge the meter.
9. Joker hooks can fire on card/phase scoring.
10. If the Situation cashes meter, first Offense card multiplies BigPlay by the
    current meter.
11. Situation bonus meter may charge.
12. Some jokers can force meter to cap.
13. Retrigger jokers can add more Offense value.
14. Boss effects apply.
15. Final joker hooks apply.
16. Points are calculated.
17. Sustained non-bust tick charges meter.
18. Busts, low scoring plays, and ignored hot meters can bleed meter.
19. Ledger entries explain what happened.

Preview/execution guarantee:

```text
FourthPhaseLab.tsx uses buildPlayContext(state) for both preview and execution.
This is essential. Do not split preview math from execution math.
```

Score channels in the ledger:

- yards
- execution
- bigPlay
- meter
- fuel
- boss
- joker
- system

Known product risk:

```text
The ledger is accurate but may feel like a spreadsheet. The UI needs to teach
what matters before asking a player to parse the math.
```

---

## 10. Crowd Meter

Meter file:

```text
src/lib/fourthPhase/meter.ts
```

Constants:

```text
BASE_METER = 1
BASE_METER_CAP = 6
ABSOLUTE_METER_CAP = 12
SUSTAINED_TICK = 0.1
DEFAULT_BLEED_RATE = 0.25
LOW_SCORE_BLEED_THRESHOLD = 18
HOLD_BLEED_RATE = 0.12
```

Crowd card charge by rank:

| Rank | Charge |
| --- | ---: |
| A | +1.0 |
| J/Q/K | +0.6 |
| 7/8/9/10 | +0.4 |
| 2/3/4/5/6 | +0.2 |

Meter behavior:

- Crowd cards charge meter as they resolve.
- Non-bust plays get a small sustained tick.
- Cashing Situations multiply BigPlay by the meter when the first Offense card
  resolves.
- Low-score attempts and busts can bleed meter.
- A scoring play that ignores an already hot meter can trigger a hold cost.
- Bosses/jokers can cap or expand meter.

Main player lesson:

```text
Charge, then cash. Do not sit on a hot meter forever.
```

Open critique target:

```text
Is the meter psychologically visible enough to become the game's "holy crap"
moment, or does it currently read like just another number?
```

---

## 11. Teams

Teams are starting decks/archetypes.

| Team Key | Team Name | Short Name | Signature Joker | Identity | Deck Tendency |
| --- | --- | --- | --- | --- | --- |
| balanced | Ironwood Engineers | Balanced | The Genius | All four phases live from snap one | Baseline deck |
| airRaid | Canyon Comets | Air Raid | Hurry-Up | Offense and Crowd can explode, thinner floor | High-rank Offense/Crowd boosted |
| smashmouth | Foundry Maulers | Smashmouth | Silent Count | Low-rank Offense and ST grind safe value | Low Offense/ST boosted |
| blackAndBlue | Harbor Bruisers | Black & Blue | Pick-Six Specialist | Defense and hidden yards build the floor | Defense/ST boosted |
| loudHouse | Summit Noise | Loud House | Twelfth Man | Crowd charges fast, Base must be drafted | Crowd boosted |
| specialTeamsChaos | River City Sparks | ST Chaos | Field General | Fuel/draw/money create odd windows | Special Teams boosted |

Reviewer questions:

- Are these starts meaningfully different to a new player?
- Should the first game lock the player into Balanced until the core trick is
  learned?
- Are team names adding flavor or cognitive load?
- Is "Black & Blue" making Defense confusion better or worse?

---

## 12. Bosses

Bosses are final-drive defensive modifiers.

| Boss Key | Name | Effect |
| --- | --- | --- |
| stackedBox | Stacked Box | Offense Yards are cut in half |
| noFlyZone | No-Fly Zone | Only two Offense cards are clean |
| roadGame | Road Game | Meter cap forced to x2.0 with heavier bleed |
| turnoverDrill | Turnover Drill | Defense subtracts Execution |
| fieldPositionWar | Field Position War | Special Teams gives no fuel |
| adaptiveDc | Adaptive DC | Repeated situations score 0 |
| preventDefense | Prevent Defense | BigPlay is capped |

Current boss UX:

- Boss is scouted before the final drive.
- Boss is active only on drive 3.
- Preview can show boss warnings.
- War Room tags can indicate boss answers.

Reviewer questions:

- Are bosses understandable before they punish the player?
- Do bosses create drama or just more text?
- Does the player know how to draft/play around them?
- Are boss effects too abstract without a visual opponent?

---

## 13. War Room

War Room file:

```text
src/lib/fourthPhase/run.ts
src/components/fourthPhase/FourthPhaseLab.tsx
```

War Room appears between drives. Current features:

- buy limit: 2
- reroll cost: $2
- skip with no buys: +$3
- joker offers cost $4 before discounts
- Practice Drill offer costs $3 before discounts
- Special Teams can generate discount tokens
- discount tokens reduce offer cost by $1 per token, max 2 per offer, never
  below $1
- if joker slots are full, player must release one to take the new joker
- Coach Pick highlights one suggested offer with a reason

Offer types:

1. Joker: passive build-around or scoring/economy modifier.
2. Practice Drill: permanent level for a Situation, up to level 3.

Practice Drill effects:

- Scoring Situations: add Yards, Execution, and BigPlay.
- Cashing Situations get larger BigPlay lift.
- Field Flip gains more draw and money.
- Blackout gains extra meter charge.

Current product risk:

```text
The War Room may read like stat shopping instead of a dramatic coaching room.
It may need a clearer "buy this because next drive needs X" frame.
```

---

## 14. Jokers

Joker file:

```text
src/lib/fourthPhase/jokers.ts
```

Jokers are the main passive build system, analogous to Balatro Jokers but in
football language. Current rarity values are `core`, `rare`, and `legendary`.

Current joker inventory:

| Joker | Rarity | Effect |
| --- | --- | --- |
| Twelfth Man | core | Crowd cards charge the meter 50% harder |
| Home Cooking | core | Meter does not bleed on a drive's final play |
| Sustained Drive | rare | Each non-bust play raises meter cap by 0.15, bounded |
| Silent Count | core | While meter is cold, each Defense card adds 0.25 Execution |
| Pick-Six Specialist | rare | A Pick Six charges meter to current cap |
| The Genius | rare | Complementary Football gains Execution and BigPlay |
| Field General | core | Each Special Teams card gives +1 next draw and +$2 |
| Two-Minute Drill | rare | With 0 discards, retrigger all Offense |
| Road Warriors | rare | Against Road Game, Offense cards gain +60 Yards |
| Bandwagon | core | Meter starts higher for each prior win/drive |
| Decibel Record | legendary | Meter cap rises to x12, but bleeds after every play |
| Hurry-Up | core | If 5 cards are played, retrigger all Offense |
| Lead Blocker | core | Defense immediately before Offense adds +8 Yards |
| Double Move | core | Offense immediately after Crowd gains +0.12 BigPlay |
| Hidden Yards | core | Special Teams inside scoring situations add +6 Yards |
| Student Section | core | Sustained non-bust tick charges +0.10 extra meter |
| Film Study | core | First copy of each situation per drive gains Execution |
| Red Zone Package | rare | Near target, non-utility plays gain Yards/Execution/BigPlay |
| Walk-On Program | core | Low-value cards add Yards or Execution |
| Checkdown Merchant | core | Checkdowns give +1 draw and +$1 |
| Bend Don't Break | core | Busted plays with Defense gain Execution and prevent meter bleed |
| Coordinator Tree | rare | 3+ phase plays gain Yards/Execution; all four adds BigPlay |
| Closer | rare | Boss-drive non-bust plays gain Yards/Execution/BigPlay |
| Press Box Angle | rare | Against boss, first copy of each situation gains Yards/Execution |
| Return Ace | rare | Field Flip gives more draw, money, and discount |
| Home Run Threat | rare | House Calls with meter at x3+ gain BigPlay |
| Scripted Series | core | Non-bust plays gain Yards per prior play this drive |
| Blackout Curtain | rare | Blackouts raise meter cap and add meter |
| Phase Collector | legendary | Five-card all-four-phase plays gain BigPlay and raise cap |

Joker hook architecture:

- `onDrawStart`
- `onSituationDetected`
- `onCardScored`
- `onPhaseScored`
- `onMeterCharged`
- `onPlayFinal`
- `retriggersFor`

Open critique target:

```text
Jokers may be mechanically varied but too hard to read at speed. Review whether
names, effects, tags, and preview math make them emotionally understandable.
```

---

## 15. UI Inventory

Primary UI file:

```text
src/components/fourthPhase/FourthPhaseLab.tsx
```

Guide/reference file:

```text
src/components/fourthPhase/FourthPhaseGuide.tsx
```

Shared style kit:

```text
src/components/fourthPhase/fourthPhaseStyles.ts
```

Recent UI pass:

- Added Fourth Phase-specific style constants.
- Increased root max width to 560px.
- Built a tighter phone-first status panel.
- Combined team, drive goal, Crowd Meter, plays left, and boss/scouting.
- Added phase-tinted card faces.
- Added card badges for editions/traits.
- Improved cash-in card presentation.
- Reworked War Room into clearer tile layout.
- Added touch-accessible reorder buttons, not just HTML drag/drop.

Major on-screen concepts:

- top header with Fourth Phase and run code
- tutorial/Coach panel
- GameStatusPanel:
  - team name and identity
  - drive number
  - drive score / target
  - field progress visual
  - Crowd Meter and cap
  - plays left
  - boss/scouting/coach pressure
- play resolution panel
- cash-in card
- War Room
- result/win/loss card
- selected play strip with reorder controls
- score preview
- hand grid
- live ledger
- team picker
- daily/import/history controls
- sticky bottom action bar:
  - Run Play
  - Redraw

Known UI risk:

```text
The UI may be more polished than understandable. The player may see many useful
numbers without knowing which one answers "what should I do next?"
```

Reviewer should stress test:

- first 10 seconds
- first selected card
- first play result
- first Crowd/Offense cash-in
- first War Room
- first boss warning
- first loss
- text density on 375px mobile
- thumb reach
- whether selected card ordering is obvious
- whether Defense's purpose is legible

---

## 16. Retention, Sharing, and Local-First Systems

Persistence keys:

```text
fourth_phase_history_v1
fourth_phase_daily_v1
fp-tutorial-done
```

Retention features:

- local run history, capped at 10 records
- local best run
- deterministic daily run
- daily streak stored locally
- daily practice mode if already completed
- importable run code
- copyable cash-in text card
- result text copy
- shareable/downloadable run-card image via canvas
- PWA manifest and service worker

Run code format:

```text
FP-{TEAMCODE}-{SEED_BASE36}
```

Example shape:

```text
FP-BAL-ABC123
```

No server is involved. No global leaderboard is involved. Social comparison must
come from shareable local artifacts, run codes, and human-posted screenshots.

Open critique target:

```text
The share loop exists technically, but the cash-in moment may not be visually or
emotionally strong enough to make someone post it.
```

---

## 17. Behind-The-Scenes Architecture

Important files:

```text
src/App.tsx
src/components/fourthPhase/FourthPhaseLab.tsx
src/components/fourthPhase/FourthPhaseGuide.tsx
src/components/fourthPhase/fourthPhaseStyles.ts
src/lib/fourthPhase/types.ts
src/lib/fourthPhase/deck.ts
src/lib/fourthPhase/situations.ts
src/lib/fourthPhase/engine.ts
src/lib/fourthPhase/jokers.ts
src/lib/fourthPhase/meter.ts
src/lib/fourthPhase/run.ts
src/lib/fourthPhase/coach.ts
src/lib/fourthPhase/shareCard.ts
src/lib/rng.ts
scripts/fourthPhaseMatchup.ts
scripts/fourthPhaseBalance.ts
docs/FOURTH_PHASE_FIELD_POSITION_GATE.md
```

Separation of concerns:

- `types.ts`: contracts for cards, phases, situations, jokers, context, ledger.
- `deck.ts`: deck creation, card names, ranks, shuffle, team deck mutation.
- `situations.ts`: pure hand/phase recognizer.
- `meter.ts`: meter constants and helpers.
- `engine.ts`: deterministic score pipeline.
- `jokers.ts`: passive build definitions and hook callbacks.
- `run.ts`: teams, bosses, targets, run code, War Room offers.
- `coach.ts`: tutorial/order helpers, explanations, boss warnings, coach picks.
- `shareCard.ts`: share-card payload types.
- `FourthPhaseLab.tsx`: UI orchestration, state transitions, local persistence.
- `FourthPhaseGuide.tsx`: collapsible guide/reference panels.
- `scripts/fourthPhaseMatchup.ts`: deterministic proof harness.
- `scripts/fourthPhaseBalance.ts`: Monte Carlo balance harness and hard gates.

Implementation principles:

- Engine logic should remain pure and deterministic.
- UI should orchestrate state and display results, not reinvent scoring.
- Use seeded RNG helpers from `src/lib/rng.ts`.
- Avoid hidden rolls in scoring.
- Expand/migrate/contract for persisted localStorage changes.
- Avoid broad refactors while tuning math/UI simultaneously.

Current technical debt:

```text
FourthPhaseLab.tsx is over 2000 lines and mixes state machine, persistence,
tutorial flow, UI rendering, share card creation, and War Room UI. Extraction
would help maintainability, but it should not change scoring behavior.
```

---

## 18. Balatro Translation Layer

Use this only as structural language. Do not copy Balatro trade dress, names,
card text, audio, or exact UI.

| Balatro Language | Fourth Phase Equivalent | Current State |
| --- | --- | --- |
| Poker hand | Situation | Present: phase pattern recognition |
| Playing cards | Four-phase football cards | Present: 52-card deck |
| Chips | Yards | Present |
| Mult / X Mult | Execution and BigPlay | Present, split into two channels |
| Hands per blind | Plays per drive | Present: 8 plays |
| Discards | Redraws | Present: 2 per drive |
| Blind target | Drive target | Present |
| Boss Blind | Final-drive boss defense | Present |
| Jokers | Jokers/sideline build pieces | Present: 29 |
| Planet cards | Practice Drills | Present, simpler |
| Tarot cards | Deck/card mutation tools | Mostly absent in Fourth Phase |
| Spectral cards | Risky run-warping tools | Absent |
| Vouchers | Run-persistent structural upgrades | Mostly absent |
| Shop | War Room | Present |
| Money | Dollars / War Room cash | Present |
| Starting decks | Teams | Present: 6 |
| Stakes | Difficulty ladder | Absent |
| Collection | Discovered content compendium | Absent |
| Seed sharing | Run code / daily | Present locally |

Core difference:

```text
Balatro starts with universally understood poker grammar. Fourth Phase starts
with a custom grammar. Therefore Fourth Phase must teach player intent and card
meaning much more aggressively.
```

---

## 19. Current Strengths

- Deterministic scoring is implemented and tested.
- Preview and execution share scoring context.
- The scoring ledger explains the math.
- The Crowd before Offense order puzzle is real.
- War Room has actual decisions.
- Teams have different starts.
- Bosses create final-drive pressure.
- Balance harness has hard gates and currently passes.
- Local daily/run-code/history exists without a backend.
- Public GitHub Pages deployment is live.
- PWA basics exist.
- Recent phone UI pass improved card faces and status density.

---

## 20. Current Weak Spots

Treat these as high-value audit targets:

1. Creator did not understand the goal while playing.
2. Defense cards are confusing thematically and mechanically.
3. The first 60 seconds may not explain "score X before Y plays run out."
4. The tutorial may teach two gestures without teaching the full objective.
5. The UI has many numbers and named systems before player intent is stable.
6. The random/novice simulated policy wins only 2.2%, implying a harsh learning
   cliff.
7. Cash-in may not yet feel like a clip-worthy moment.
8. War Room may read as stat shopping rather than coaching drama.
9. Joker effects may be too text-heavy at speed.
10. The game has no true stakes/unlock/collection layer yet.
11. Field position is tempting but gated and likely premature.
12. `FourthPhaseLab.tsx` remains very large.
13. Native packaging and some repo naming still carry historical Callsmith
    baggage.

---

## 21. What Feedback Is Needed

The creator wants directional feedback, not polite validation.

High-value feedback:

- identifies what blocks comprehension in the first minute
- explains what the player thinks they are doing versus what the system expects
- proposes smaller fixes before major redesigns
- says whether the four phases are the right language
- says whether Defense should be renamed/reframed
- says whether the abstract target loop is worth preserving
- separates must-fix onboarding from nice-to-have content expansion
- maps suggestions to specific files and tests
- respects local-first and fictional constraints

Low-value feedback:

- "add multiplayer"
- "use NFL teams"
- "add betting"
- "add field position" without passing the gate
- "needs polish" without concrete failure mode
- "looks good"
- "make it more like Balatro" without saying which system and why

---

## 22. Suggested Review Questions

Ask reviewers to answer these directly:

1. In plain English, what does the player think the goal is after 10 seconds?
2. What does the player think each phase does?
3. Does "Defense" make sense as a phase, or should it be renamed/reframed?
4. Is the phrase "Execution" visible enough to explain Defense?
5. Does the first tutorial explain the goal or only the combo?
6. What should the top of the screen say at all times?
7. What is the smallest UI change that would make a player know what to do next?
8. Does the preview make good and bad choices obvious before running a play?
9. Does the cash-in moment feel emotionally bigger than a normal play?
10. Does the War Room present a strategic question or just a list of modifiers?
11. Are there too many named systems for a cold player?
12. Is the abstract target loop viable without field position?
13. Should field position remain deferred?
14. What is the next one-day implementation slice?
15. What is the next one-week implementation slice?

---

## 23. Copy-Paste Prompt For Other Models

Use this prompt after attaching this audit packet.

```text
You are reviewing Fourth Phase, a fictional single-player football card
roguelike built with Vite, React, TypeScript, and Capacitor. Treat this attached
packet as product truth.

Act as a harsh but constructive panel:
- senior roguelike deckbuilder designer
- mobile UX/onboarding lead
- systems and balance designer
- frontend implementation reviewer
- growth/shareability critic

The creator just played the latest phone build and did not understand what was
happening, what the goal was, what to accomplish, or why Defense cards exist.
Assume this is the most important signal. Your job is to decide whether the game
is unclear because of wording, UI hierarchy, concept design, phase naming,
tutorial design, or deeper mechanics.

Hard constraints:
- fictional football only
- no NFL, NCAA, real teams, real players, licensed IP
- no betting, DFS, prizes, real-money language, or payments
- no backend, accounts, analytics, multiplayer, or global leaderboard
- local-first only
- deterministic scoring only
- preserve points = Yards x (1 + Execution) x BigPlay unless you make an
  extremely strong case
- do not recommend field position unless you explain why it should override the
  current gate
- do not copy Balatro art, names, card text, sound, or trade dress

Give your review in this exact shape:

1. Blunt verdict
   - Is the current game understandable within 60 seconds?
   - Is the core loop worth saving?
   - Is the four-phase concept working?
   - Is Defense a naming/problem-space issue?
   - Should this go to wider testers now?

2. First-60-seconds diagnosis
   Walk through what a cold player likely sees, what they think the goal is,
   where they hesitate, what they misunderstand, and what should be changed.

3. Player intent rewrite
   Write the exact top-of-screen objective text, selected-play preview text,
   tutorial text, and War Room framing you would ship.

4. Phase-language audit
   For Offense, Defense, Special Teams, and Crowd:
   - current job
   - what a new player probably assumes
   - confusion risk
   - recommended label/copy/icon/UX fix
   - whether to keep, rename, or reframe

5. Mechanics audit
   Evaluate Situations, the scoring equation, Crowd Meter, meter bleed, card
   order, War Room, Practice Drills, jokers, teams, bosses, run length, and
   difficulty. Call out dominant, boring, confusing, or under-explained parts.

6. UI/UX audit
   Review hierarchy, phone layout, touch controls, text density, card legibility,
   selected-card ordering, score preview, ledger, status panel, cash-in card,
   War Room, result/share card, accessibility, and reduced-motion needs.

7. Systems/content roadmap
   Compare Fourth Phase to Balatro structurally:
   - what maps well
   - what should be reinterpreted
   - what should be deferred
   - what should be refused
   Include stakes/unlocks/collection/consumables only if they support the current
   clarity problem rather than adding noise.

8. Implementation tickets
   Give the next 10 concrete tickets ranked by impact. Each ticket must include:
   - goal
   - likely files touched
   - acceptance criteria
   - risk
   - test/verification command
   - what not to touch

9. Go/no-go
   Recommend one:
   - hold and fix onboarding
   - limited playtest only
   - wider test
   - ship as public alpha
   Give the minimum changes required to move up one tier.

Be specific, skeptical, and practical. Do not give vague advice like "make it
clearer" or "add more variety." Say exactly what to change, why, and how to
validate it.
```

---

## 24. Suggested First Answer Shape For Other Models

If a model needs even stricter output:

```text
Start with the single biggest reason the creator felt lost.

Then provide:

1. One-paragraph diagnosis.
2. "Keep / Change / Cut / Defer" table.
3. First-screen rewrite.
4. Phase naming recommendation.
5. Top 5 must-fix before playtest.
6. Top 5 later systems.
7. Ten implementation tickets.
8. Validation plan:
   - creator replay check
   - cold-player 60-second test
   - mobile viewport check
   - matchup harness
   - balance harness
```

---

## 25. My Current Read

Fourth Phase has a functioning deterministic engine and a playable run loop, but
its central problem is now product legibility. The code is not the scary part.
The scary part is that a player can see polished cards, targets, meter, boss
labels, War Room offers, and ledger math, yet still not know the simple job:

```text
Clear the drive target. Charge Crowd. Cash with Offense. Draft help. Beat the
boss drive.
```

That should be the next design pass. More systems can wait. Field position can
wait. Bigger content can wait. The highest-leverage work is making the player's
goal and the four phase jobs unmistakable before the game asks them to optimize.
