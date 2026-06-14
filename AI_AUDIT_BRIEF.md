# Slate Boss AI Audit Brief

This document is a complete handoff for other AI models or reviewers to understand, critique, and suggest improvements for Slate Boss without needing to run or play it first.

## 2026-06-13 External Audit Synthesis

Follow-up feedback from ChatGPT, Gemini, and Claude was highly aligned. The shared recommendation was to stop expanding feature count for the next pass and instead make the core loop more understandable and trustworthy.

Priority direction:

- First-run clarity matters more than adding more modes.
- New players should default into a Safe 50/50 / Double-Up, not the larger tournament.
- Prototype payouts should have no rake so bankroll movement feels intuitive.
- Results must separate Build Quality from Game Luck so losses can teach instead of feeling random.
- Career mode should become a light roguelite loop with functional boons.
- Achievements should be surfaced as a few current goals, even if the full catalog remains larger.
- A Monte Carlo balance harness should be added before deep contest tuning.

Implementation started from the trust layer: no-rake payouts, Safe 50/50 default, $25 career starting bankroll, and a Build Quality / Outcome Luck result split.

## 1. One-Sentence Summary

Slate Boss is a fictional daily fantasy sports strategy game where players build salary-cap football lineups, enter simulated contests, sweat quarter-by-quarter results, earn XP/achievements/unlocks, and progress through short career runs.

## 2. Current Live Links

- Live playable app: https://dmbrown81.github.io/slate-boss/
- Public GitHub repo: https://github.com/dmbrown81/slate-boss

## 3. Product Intent

The goal is to make a DFS-style lineup game that feels strategic, replayable, and approachable for teenagers and casual players who may not understand DFS terminology yet.

It should feel like:

- A light strategy game, not a sportsbook.
- A sports lineup puzzle with variance and “sweat.”
- A collectible progression game with achievements and unlocks.
- A simplified fictional DFS simulator.
- Something a player can understand after one or two guided runs.

It should not feel like:

- Real gambling.
- A serious betting product.
- A spreadsheet-only optimizer.
- A game where outcomes feel impossible or fully random.
- A game where the user loses and has no idea why.

## 4. Target Audience

Primary initial testers:

- The creator’s sons and friends/family.
- Teenagers who understand football generally but may not know DFS terms.
- Casual users who need terms like FLEX, ownership, GPP, floor, ceiling, stack, bring-back explained.

Possible future audience:

- Fantasy football players.
- DFS-curious casual players.
- Strategy-game players who enjoy unlocks, completion, and controlled randomness.

## 5. Core Game Loop

1. User opens the app.
2. User sees a daily slate and optional career mode.
3. User enters the lineup builder.
4. User chooses a contest type.
5. User builds an 8-player lineup under a $50,000 salary cap:
   - QB
   - RB
   - RB
   - WR
   - WR
   - TE
   - FLEX
   - DST
6. User uses player projections, salary, floor, ceiling, ownership, boom chance, team/opponent, recent game logs, and stack suggestions.
7. User enters contest.
8. App simulates:
   - User player outcomes
   - Opponent field lineups
   - Player scoring variance
   - Game script effects
   - QB/pass-catcher correlation
9. User watches a quarter-by-quarter sweat screen.
10. User sees results:
   - Score
   - Rank
   - Payout
   - Best/worst/value/regret players
   - Grades
   - Near-miss explanation
   - Share card
   - New achievements/unlocks
11. Progress saves locally in browser localStorage.
12. Player returns for daily slate or career run progression.

## 6. Game Modes

### Daily Slate

Daily slate is a deterministic slate based on the current date. The same date generates the same slate structure for everyone on that date.

Daily slates:

- Use a date-based seed.
- Randomly pick a “week” for recent game logic.
- Generate fictional players, projections, ownership, salary variations, modifiers, game scripts, and news events.
- Persist daily result and streak data.

### Career Mode

Career mode is a short-run mode intended to create longer-term stakes.

Current career structure:

- Starts with $15 play-money bankroll.
- Starts at Week 1.
- Runs up to 10 weekly slates.
- Advances one week per completed career contest.
- Uses career tiers:
  - Tier 1: $1 Grinder
  - Tier 2: $5 Contender
  - Tier 3: $25 Challenger
  - Tier 4: $100 Shark
- Tier promotion is based on bankroll thresholds:
  - Tier 1 promotes at $20
  - Tier 2 promotes at $100
  - Tier 3 promotes at $500
- A run ends when:
  - The user busts below the next required entry fee.
  - The user finishes all 10 slates.
- Run summaries track final bankroll, peak bankroll, cash rate, best rank, and bust/completion status.

## 7. Contest Types

Contest types live in `src/lib/payout.ts`.

Current contest types:

### 50/50 Double-Up

- Key: `double_up`
- Entrants: 100
- Payout: top 50% get 1.8x entry.
- Intended feel: safer, beginner-friendly, lower variance.
- Strategy: high projection, higher floor, less need for extreme leverage.

### 100-Man GPP

- Key: `mini_gpp`
- Entrants: 100
- Default contest type.
- Payout:
  - Top 1%: 20% of pool
  - Top 2%: 10% of pool
  - Top 5%: 5% of pool
  - Top 10%: 3% of pool
  - Top 20%: 2x entry
- Intended feel: starter-friendly tournament with some upside.
- Strategy: projection plus some ceiling/correlation.

### 500-Man GPP

- Key: `large_gpp`
- Entrants: 500
- Payout:
  - 1st: 25% of pool
  - Top 1%: 8% of pool
  - Top 3%: 3.5% of pool
  - Top 8%: 1.2% of pool
  - Top 18%: 1.8x entry
- Intended feel: advanced/harder, larger payout, more frustrating.
- Strategy: high-ceiling, lower ownership, stacks.

### Winner Take All

- Key: `winner_take_all`
- Entrants: 25
- Payout: 1st gets full pool.
- Intended feel: high drama, very high variance.
- Strategy: top-heavy, aggressive, boom-heavy lineups.

## 8. Player Model

The player model is defined in `src/types/index.ts`.

Each player includes:

- `id`
- `name`
- `team`
- `opponent`
- `position`
- `archetype`
- `salary`
- `trueProjection`
- `displayedProjection`
- `floor`
- `ceiling`
- `volatility`
- `boomChance`
- `ownership`
- `form`
- `gameId`
- `recentGames`
- `seasonStats`

Positions:

- QB
- RB
- WR
- TE
- DST

Roster slots:

- QB
- RB1
- RB2
- WR1
- WR2
- TE
- FLEX
- DST

FLEX accepts RB, WR, or TE.

Archetypes:

- pocket QB
- rushing QB
- workhorse RB
- pass-catching RB
- alpha WR
- boom-bust WR
- possession WR
- slot WR
- red-zone TE
- punt TE
- strong DST
- risky DST

## 9. Fictional World

All teams and players are fictional.

Teams live in `src/lib/seedData.ts`.

Current teams:

- IRN: Ironhawks
- BLZ: Blazers
- STO: Stormers
- VLT: Volts
- RAV: Ravens
- CRU: Crushers
- GHO: Ghosts
- THU: Thunder
- PIL: Pilots
- VIP: Vipers
- ROC: Rockets
- NIG: Nighthawks

Current fixed game pairs:

- IRN vs BLZ
- STO vs VLT
- RAV vs CRU
- GHO vs THU
- PIL vs VIP
- ROC vs NIG

Important current limitation: game matchups are fixed pairs, not a real rotating schedule.

## 10. Slate Generation

Slate generation lives in `src/lib/slateGenerator.ts`.

The generation process:

1. Generate deterministic seed from date string or career-run string.
2. Determine slate number.
3. Determine week:
   - Daily slate: random seeded week 1-17.
   - Career slate: explicit week from career run.
4. Pick one slate modifier.
5. Generate game script factor for each game, from -1 to +1.
6. Build opponent map.
7. Generate each player from templates:
   - Random form: hot/cold/normal.
   - True projection based on base projection and form.
   - Displayed projection adds hidden noise.
   - Salary gets micro-variation.
   - Ownership gets noise.
   - Modifier applies.
   - Recent games and season stats are generated.
8. Generate two news events.

### Current Slate Modifiers

#### Windy Week

- Deep-threat WRs lose ceiling and boom chance.
- Workhorse RBs get boosted.

#### Shootout Slate

- QB projections and ceiling increase.
- Other players gain volatility/boom chance.

#### Grind-It-Out

- Workhorse RBs gain floor/projection.
- Pass catchers are suppressed.

#### Primetime Chaos

- Boom chances increase.
- Volatility increases.

#### Sloppy Conditions

- DST boom chance doubles.
- QB ceiling falls.

### News Events

Two per slate. They trigger during lineup building at roughly the 1-minute and 2-minute marks.

News can:

- Raise/lower displayed projection.
- Raise/lower true projection.
- Change ownership.
- Change ceiling.

Current news templates include:

- Limited practice.
- Questionable.
- Full participant.
- Backup QB starting.
- Revenge game spot.

Potential critique area: news timing may be too slow for casual testers if they build quickly.

## 11. Recent Game Logic

Recent games are generated as fictional historical context.

Daily slate:

- Week is seeded randomly.
- If generated week is later in the season, players have prior-game logs.

Career mode:

- Week 1 has no prior games.
- Week 2 has Week 1 history.
- Week 3 has Weeks 2 and 1, etc.
- Maximum displayed recent games is 5.

Recent games include:

- Week
- Opponent
- Points
- Usage percentage
- Short note

Known limitation:

- Recent games are synthetic and generated from the current player/opponent setup.
- They are not persistent per player across career weeks.
- A stronger future system would maintain actual simulated prior-week scores per career save.

## 12. Lineup Builder UX

Main file: `src/components/LineupBuilder.tsx`.

The builder includes:

- Header with slate, week, career info.
- Help/glossary button.
- Slate modifier banner.
- Tournament selector.
- Contest risk guidance:
  - Starter-friendly message for Double-Up / 100-Man GPP.
  - Advanced warning for 500-Man GPP / Winner Take All.
- Stats bar:
  - Projection
  - Average ownership
  - Average salary left per open slot
  - Cap left
- “Your job” onboarding card.
- Stack builder.
- Lineup coach strip.
- Player table.
- Sticky lineup tray.
- News toasts.
- Player details modal.

## 13. Player Table

Main file: `src/components/PlayerTable.tsx`.

Features:

- Search by name/team/opponent.
- Position filters:
  - ALL
  - QB
  - RB
  - WR
  - TE
  - DST
- Clickable sortable headers:
  - Salary
  - Projection
  - Value
  - Floor
  - Ceiling
  - Ownership
  - Boom
- Columns:
  - Player
  - Position
  - Team
  - Game
  - Salary
  - Projection
  - Value
  - Floor
  - Ceiling
  - Ownership
  - Boom
  - Add/remove button
- Clicking a row opens player detail modal.
- Clicking + adds player.
- Clicking - removes player.

Potential critique area:

- Table is horizontally scrollable on mobile and may still be dense for young/casual users.
- It may need better visual hierarchy or “recommended” labels.

## 14. Player Detail Modal

Main file: `src/components/PlayerDetailModal.tsx`.

Displays:

- Player name.
- Position.
- Team vs opponent.
- Archetype.
- Projection.
- Season average.
- High score.
- Ownership.
- Usage.
- Consistency.
- Boom chance.
- Recent games.

Week 1 career behavior:

- Shows a no-history message because no games have been played yet.

## 15. Stack Builder

Main file: `src/components/StackingTool.tsx`.

Purpose:

- Teach correlation without requiring DFS knowledge.

Behavior:

- If no QB selected: explains QB stack concept.
- If QB selected:
  - Shows same-team pass catchers already selected.
  - Shows bring-backs already selected.
  - Suggests QB-stack WRs.
  - Suggests QB-stack TEs separately.
  - Suggests opponent bring-backs.

Stack labels:

- Pick a QB to unlock stack ideas.
- Add correlation.
- Playable stack.
- Strong game stack.

Potential critique area:

- Does not yet adapt suggestions by contest type enough.
- Does not yet explain why a suggested player is a good stack piece beyond projection/boom.

## 16. Lineup Coach

Main file: `src/components/LineupCoach.tsx`.

Short nudge system that flags:

- Naked QB.
- Single stack.
- Double stack.
- Missing bring-back in GPP-style contests.
- DST vs one of your offensive players.
- Salary squeeze.
- Too much unused salary late.

Purpose:

- Make losses feel more teachable.
- Give beginners a readable “what should I consider?” signal.

Potential critique area:

- Could become repetitive.
- Could be more personalized after results.

## 17. Lineup Tray

Main file: `src/components/LineupTray.tsx`.

Sticky bottom tray showing:

- Salary spent.
- Projection.
- Average salary left per open slot.
- Remaining salary.
- All roster slots.
- Remove buttons.
- Enter Contest button.

Validation:

- Lineup must be complete.
- Salary must be <= $50,000.
- Players must be unique.

## 18. Simulation Model

Main file: `src/lib/simulation.ts`.

Simulation is deterministic per slate seed and contest once lineups are known.

Key parts:

### User Scoring

Each player score uses:

- Floor.
- True projection.
- Ceiling.
- Volatility.
- Boom chance.
- Game script bonus.
- QB/pass-catcher correlation.
- Career modifiers.

The scoring draw uses `skewedDraw` from `src/lib/rng.ts`.

Boom condition:

- Raw score >= 90% of player ceiling.

Quarter splits:

- Q1 roughly 18-26% of final score.
- Q2 roughly 28-36%.
- Q3 roughly 18-26%.
- Q4 inferred as remaining.

### Correlation

QB is scored first.

If QB booms:

- Same-team WR/TE boom chance increases by 0.25.

If career modifier `correlated` is equipped:

- Same-team QB stack pass catchers get extra boom chance.

### DST Modifier

Career modifier `anchor_defense` boosts DST boom chance / reduces volatility intent.

### Opponent Field

Opponent lineups are generated with salary and roster constraints.

Field construction:

- Most opponents are ownership-weighted/chalky.
- A smaller tail is contrarian.
- Large GPP/Winner Take All have slightly more contrarian field behavior.

Known limitation:

- Opponent field does not use sophisticated lineup optimization.
- Opponent field does not currently explicitly stack enough like real DFS fields.
- Field lineups may not feel “human” enough.

### Ranking

User score is ranked among generated field scores.

Quarter ranks are calculated for sweat screen.

### Result Analysis

The simulation returns:

- User entry.
- Field entries.
- Rank.
- Score.
- Total entrants.
- Payout.
- Entry fee.
- Tournament config.
- XP gained.
- Best player.
- Worst player.
- Best value.
- Biggest regret.
- Grades.
- Share card.
- Quarter ranks.

## 19. Sweat Screen

Main file: `src/components/SweatScreen.tsx`.

Purpose:

- Turn simulation into a reveal.
- Create a sports ticker feel.
- Make results feel less instantaneous.

Phases:

- Q1
- Halftime
- Q3
- Final

Features:

- Phase delay around 4.4 seconds.
- Ticker lines drip in around every 650ms.
- Position-specific flavor text.
- Field event flavor.
- Rank and cash line.
- Skip/continue behavior.

Potential critique area:

- Some randomness in ticker flavor uses `Math.random`, not seeded RNG.
- Ticker can be noisy.
- The link between ticker events and actual scoring may not always be perfectly transparent.

## 20. Results Screen

Main file: `src/components/ResultsScreen.tsx`.

Displays:

- Contest type.
- Score.
- Rank.
- Payout.
- Win banner if rank 1.
- Near-miss information.
- Net result.
- Best/worst/value/regret players.
- Report card.
- Share card.
- New achievements/unlocks.

Near-miss logic:

- Calculates cash line score.
- If user misses cash narrowly, explains point gap.
- May identify worst player underperformance as the difference.
- If user barely cashes, notes that it was a sweat.

Report card grades:

- Value
- Ceiling
- Leverage
- Risk
- Salary efficiency

Potential critique area:

- Report card copy is DFS-flavored and may still be too advanced.
- Results could better explain “what to do differently next time.”

## 21. Grading System

Main file: `src/lib/grading.ts`.

Grades are letter-based:

- A+
- A
- B
- C
- D
- F

Current grade dimensions:

### Value

Based on actual points per $1k salary.

### Ceiling

Based on sum of player ceilings versus a high-ceiling baseline.

### Leverage

Based on low average ownership plus adequate ceiling.

### Risk

Based on volatility and boom chance.

### Salary Efficiency

Penalizes unused salary.

Known limitation:

- Some grades are based on final simulated outcome while others are lineup-construction attributes.
- Could be confusing: “Was my build good or did my players just score well?”

## 22. Achievements and Unlocks

Main file: `src/lib/achievements.ts`.

The system currently includes:

- 100 achievements.
- 25 unlock rewards.
- Achievement points.
- XP integration.
- Result-screen reward popups.
- Home-screen collection modal.

Achievement categories:

- Starter
- Contest
- Lineup
- Sweat
- Career
- Collection

Rarities:

- Bronze: 5 points
- Silver: 10 points
- Gold: 20 points
- Diamond: 40 points

Examples:

- Enter first contest.
- Cash first contest.
- Finish 1st.
- Cash in each tournament type.
- Win each tournament type.
- Score thresholds.
- Payout thresholds.
- A+ grade categories.
- Single stack.
- Double stack.
- Bring-back.
- Contrarian cash.
- Cap usage challenges.
- Position spike games.
- Career completion.
- Career bust.
- Profitable run.
- Achievement collection milestones.

Unlock types:

- Boon
- Cosmetic
- Mode
- Title

Important design note:

Most unlocks are currently collection rewards or future hooks. Many say “future boon.” They do not yet meaningfully alter gameplay. This was intentional to avoid breaking contest fairness before balance is tuned.

Potential critique area:

- Achievements may be numerous but not all equally meaningful.
- Unlocks should likely become equippable or active in career mode.
- Some unlock names and rewards may need more personality.
- Completion pacing is not tuned yet.

## 23. Progression and Persistence

Main file: `src/lib/storage.ts`.

Storage:

- Browser localStorage only.
- Current key: `slateboss_v3`.
- Migrates from older `slateboss_v1` and `slateboss_v2` where possible.

Profile stores:

- XP.
- Level.
- Daily streak.
- Best streak.
- Last played date.
- Last daily result.
- Total contests played.
- Total cashed.
- Best finish rank.
- Total winnings.
- Unlocked modifiers.
- Achievement IDs.
- Unlock IDs.
- Achievement points.
- Current career run.
- Career run history.

Known limitation:

- Progress is device/browser-specific.
- Clearing browser data wipes progress.
- No accounts, cloud sync, or backend.

## 24. Career Modifiers

Existing modifier keys:

- `scout`
- `anchor_defense`
- `correlated`

Modifier descriptions:

- Scout: reveals 1 opponent lineup before lock. Current implementation appears mostly conceptual; confirm actual effect.
- Anchor Defense: reduces/adjusts DST volatility or boom profile.
- Correlated: boosts same-team QB+WR/TE stack boom.

Potential critique area:

- Modifier system is underdeveloped.
- Some modifiers are more descriptive than functional.
- Could be merged with unlock system into a cleaner “boon” system.

## 25. Onboarding and Help

Main file: `src/components/HelpModal.tsx`.

Help explains:

- Goal.
- QB.
- RB.
- WR.
- TE.
- FLEX.
- DST.
- Projection.
- Floor/ceiling.
- Ownership.
- Boom.
- Stack.
- Bring-back.
- GPP.
- Double-Up.

Home screen includes:

- “What am I trying to do?” card.
- Help button.

Builder includes:

- “Your job” card.
- Help/glossary button.
- Contest difficulty guidance.

User feedback that motivated this:

- Teen testers liked the look but did not understand what they were supposed to do.
- One asked what FLEX was.
- The table initially sorted via buttons, but header-click sorting was more intuitive.

## 26. UI/Visual Design

Current visual style:

- Dark, compact, mobile-first.
- Max-width root around phone size.
- Card-based layout but relatively dense.
- Accent colors:
  - Blue for action/primary.
  - Gold/orange for payout/achievement/sweat.
  - Green for cash/win.
  - Red for bust/loss/warnings.
- Uses inline styles heavily.

Important UX constraints:

- First screen should be playable app, not marketing.
- Needs to work well on phones.
- Needs to explain DFS terms without slowing down experienced users.
- Needs to make losing feel instructive.

Known design limitations:

- Inline styles make global theming harder.
- No design system abstraction yet.
- Some screens may be too text-dense.
- No animations for achievement unlocks beyond result cards.
- Accessibility has not been deeply audited.

## 27. File Architecture

### Root

- `package.json`: Vite/React/TypeScript scripts and dependencies.
- `vite.config.ts`: Vite config with `base: '/slate-boss/'` for GitHub Pages.
- `.github/workflows/deploy.yml`: GitHub Pages deployment.
- `README.md`: Still largely Vite template; should be replaced.

### Core App

- `src/App.tsx`: Top-level screen routing, profile state, contest flow.
- `src/main.tsx`: React entry.
- `src/config.ts`: App constants.
- `src/index.css`: Global styles.

### Components

- `HomeScreen.tsx`: Home/dashboard.
- `LineupBuilder.tsx`: Contest selection and lineup-building screen.
- `PlayerTable.tsx`: Search/filter/sort/add player table.
- `LineupTray.tsx`: Sticky roster/cap tray.
- `StackingTool.tsx`: QB stack and bring-back suggestions.
- `LineupCoach.tsx`: Contextual lineup advice.
- `PlayerDetailModal.tsx`: Player stats/recent games modal.
- `HelpModal.tsx`: Glossary/onboarding.
- `NewsToast.tsx`: News event UI.
- `SweatScreen.tsx`: Quarter reveal/ticker.
- `ResultsScreen.tsx`: Contest result.
- `CareerScreen.tsx`: Career run management.
- `RunOverScreen.tsx`: Career end summary.
- `AchievementsModal.tsx`: Achievement/unlock collection UI.

### Logic

- `rng.ts`: seeded RNG and skewed draw.
- `seedData.ts`: fictional teams and player templates.
- `slateGenerator.ts`: slate generation, modifiers, news, recent games.
- `lineupValidation.ts`: salary/roster validation and lineup helpers.
- `simulation.ts`: contest simulation.
- `payout.ts`: tournament configs and payout curves.
- `grading.ts`: report card grades.
- `shareCard.ts`: share text.
- `storage.ts`: profile persistence and result application.
- `progression.ts`: titles/level helper.
- `achievements.ts`: achievement and unlock catalog/rules.

### Types

- `src/types/index.ts`: Shared TypeScript domain types.

## 28. Deployment

The app is deployed as a static site through GitHub Pages.

Pipeline:

1. Push to `main`.
2. GitHub Actions builds the Vite app.
3. `dist` is deployed to GitHub Pages.
4. Live link stays the same.

Live URL:

https://dmbrown81.github.io/slate-boss/

The repo is public.

## 29. Current Technical Stack

- Vite
- React
- TypeScript
- LocalStorage
- GitHub Pages
- No backend
- No database
- No auth
- No real money
- No real users/multiplayer

Dependencies:

- React
- React DOM
- Vite
- TypeScript
- ESLint

Current package has `"private": true`, meaning npm package publishing is disabled; this does not affect GitHub repo visibility.

## 30. Product Strengths

Likely strengths:

- Clear fictional/no-money lane.
- Quick daily loop.
- DFS flavor without real gambling.
- Salary-cap puzzle is understandable with guidance.
- Multiple contest types create different player goals.
- Career mode gives medium-term stakes.
- Achievements/unlocks add metagame progression.
- Stack builder and coach reduce confusion.
- Results screen gives emotional feedback.
- Deterministic slate generation helps debugging and shared daily experience.

## 31. Product Weaknesses / Known Risks

Likely weaknesses:

- The simulation may feel too random or too opaque.
- Achievement unlocks are not yet deeply tied to gameplay.
- Recent game history is synthetic rather than persistent.
- Opponent field may not feel human enough.
- Casual users may still not understand which players are “good.”
- DFS terms may still overwhelm users.
- Career modifiers are underpowered/unclear.
- No backend means progress is fragile.
- No analytics means tester confusion is hard to observe.
- No actual tutorial run.
- No clear “recommended lineup construction” path for first-time users.

## 32. Balance Questions for Reviewers

Please evaluate:

1. Is first place too hard, too easy, or appropriately rare?
2. Does a good lineup meaningfully outperform random lineups?
3. Does Double-Up feel encouraging enough for beginners?
4. Does 100-Man GPP feel like the right default?
5. Are 500-Man GPP and Winner Take All too frustrating?
6. Are payout curves fun and understandable?
7. Does ownership/leverage matter enough?
8. Does stacking matter enough?
9. Does salary efficiency matter too much?
10. Are score distributions plausible and satisfying?
11. Does the field construction produce believable opponents?
12. Are career bankroll thresholds too punishing?
13. Should early runs have hidden training wheels?
14. Should achievements reward skill, exploration, or persistence more?
15. Should unlocks become active boons, cosmetics, or both?

## 33. UX Questions for Reviewers

Please evaluate:

1. Does a new user know what to do on the first screen?
2. Does a new user understand FLEX?
3. Does the builder explain enough without becoming a tutorial wall?
4. Is the player table too dense?
5. Are the most important numbers obvious?
6. Is “Val” understandable?
7. Is average salary per slot helpful?
8. Is the stack builder useful or confusing?
9. Does the lineup coach feel like advice or noise?
10. Are achievements easy to discover?
11. Does the reward moment after a contest feel satisfying?
12. Is the glossary comprehensive enough?
13. Does the app feel too DFS-insider?
14. What should be simplified for teens/casuals?
15. What should be deeper for strategy players?

## 34. Code/Architecture Questions for Reviewers

Please evaluate:

1. Should inline styles be refactored into CSS modules or a component system?
2. Should game simulation be separated from UI more aggressively?
3. Should achievements be generated/cataloged in a cleaner data file?
4. Are TypeScript types expressive enough?
5. Is localStorage migration robust?
6. Are result/profile updates too coupled?
7. Is the screen routing in `App.tsx` getting too large?
8. Should a reducer/state machine manage game flow?
9. Is deterministic RNG used consistently enough?
10. Should ticker flavor use seeded RNG instead of `Math.random`?
11. Should recent games persist in career mode?
12. Should opponent lineups be cached with contest results?
13. Should progression be decoupled from contest results?
14. Are payout calculations clear and testable?
15. What tests are most important to add first?

## 35. Suggested Next Improvements

Highest-impact next work:

1. Replace README template with real project README.
2. Add first-run tutorial or “Coach’s First Lineup” mode.
3. Make 5-8 unlocks actually equippable or active in career mode.
4. Add achievement toast animation rather than only result cards.
5. Add persistent career stat history per player.
6. Improve opponent lineup generation to include stacks and realistic construction.
7. Add clearer “recommended for beginners” default flow.
8. Add “why this lineup lost/won” result summary.
9. Add tests for payout, lineup validation, achievements, storage migration, and simulation reproducibility.
10. Add analytics or feedback capture before wider testing.

## 36. Potential Unlock System Direction

Current unlocks are mostly future hooks. A stronger system could use “boons” that are unlocked and then equipped in career mode.

Possible active boons:

- One entry-fee refund after a near bubble miss.
- One small bankroll shield per run.
- One extra scout peek.
- One contest fee discount.
- Slight XP multiplier for Double-Up cashes.
- One “late swap alert” that reveals news sooner.
- One enhanced stack meter.
- One regret report upgrade.
- One insurance token if bankroll falls below $2.

Important balance recommendation:

Avoid direct payout multipliers early. They may make results feel less earned. Prefer:

- Refunds.
- XP boosts.
- Information advantages.
- Cosmetic progression.
- Career-only safety nets.

## 37. Possible Achievement Design Improvements

Current achievement list is broad. It may need pruning or better grouping.

Suggested categories:

- First Steps
- Cash Game Grinder
- Tournament Hunter
- Stack Artist
- Value Hunter
- Sweat Moments
- Career Runs
- Collection
- Weird Builds
- Legendary Outcomes

Suggested improvements:

- Add hidden achievements.
- Add achievement filters.
- Add progress bars for count-based achievements.
- Add “almost achieved” hints.
- Add daily/weekly challenge achievement.
- Add title/cosmetic selection.

## 38. Simulation Tuning Philosophy

The design goal is controlled luck.

Player should feel:

- Better choices improve odds.
- Bad lineups usually fail.
- Good lineups can still lose.
- Risky lineups can spike.
- First place is rare but not impossible.
- Losses explain something.
- A near miss motivates another run.

Avoid:

- Pure randomness.
- Guaranteed wins.
- Impossible first place.
- Punishing beginner modes.
- Hidden manipulation that feels unfair.

## 39. Important Current Caveats

- This is a prototype.
- No real money.
- No real contests.
- No prizes.
- No deposits/withdrawals.
- All teams, players, news, and events are fictional.
- Static frontend only.
- No server validation.
- No account system.
- No cloud saves.
- Not legally/commercially reviewed.

## 40. Best Way For Another AI To Audit

Recommended prompt for another model:

> You are auditing Slate Boss, a fictional DFS-style strategy game for casual/teen players. Read the attached brief and critique the product, game design, progression, onboarding, simulation fairness, achievement/unlock system, and code architecture. Prioritize changes that would make the game more understandable, more fun over repeated runs, and less frustrating without making it too easy. Give specific recommendations, balance concerns, UX changes, and implementation ideas.

Recommended focus areas:

- First five minutes of user experience.
- Whether a teenager understands what to do.
- Whether losing feels fair.
- Whether achievements/unlocks create meaningful motivation.
- Whether contest types are balanced.
- Whether the simulation rewards skill enough.
- Whether the UI should simplify or deepen.

## 41. Current Repo State At Time Of This Brief

This brief was written after the achievement/unlock system was added and deployed.

Current major systems:

- Daily slate.
- Career mode.
- Tournament types.
- Player detail modal.
- Stack builder.
- Lineup coach.
- Glossary/help modal.
- Sortable player table.
- Sweat screen.
- Results screen.
- Run over screen.
- 100 achievements.
- 25 unlocks.
- GitHub Pages deployment.

The live app may change after this document. If auditing code, use the latest repo state as source of truth.
