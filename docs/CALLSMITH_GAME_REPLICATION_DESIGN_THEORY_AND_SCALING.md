# **Architectural Analysis and Systems Design of Callsmith: Codebase, Mathematical Logic, and Game Theory**

## **Introduction to the Product and Systems Architecture**

Callsmith is the active product in this repository: a fictional, single-player football card roguelike built with Vite, React, TypeScript, and Capacitor. The internal engine, tests, scripts, and older review language still use the `gridiron` name, but the shipped player-facing product is Callsmith. The central design goal is not to place football terminology on top of a generic card game. The game attempts to make football decisions into the scoring grammar itself: roster construction, play concept selection, defensive looks, resource pressure, and compounding scheme identity all affect the result.

The design thesis is simple:

```text
Simple enough for a Balatro player to learn by playing, but authentic enough that a football obsessive recognizes why the play worked.
```

The product is local-first by design. There are no accounts, servers, real-money economies, licensed teams, real players, betting systems, global leaderboards, multiplayer services, or remote player-data collection. All current progression lives in local React state and versioned `localStorage`. The only permitted relationship to real sports data is calibration: historical football research can inform fictional tuning, but shipped game content remains fictional.

Architecturally, Callsmith is a deterministic engine-building game wrapped in a mobile-first React interface. The pure scoring and run systems live under `src/lib/*`; the components under `src/components/*` orchestrate selection, presentation, animation, saved runs, and the War Room. The core scoring contract is intentionally transparent and must remain stable:

```text
drivePoints = Base x (1 + Execution) x BigPlay
```

This equation is the foundation of the entire product. `Base` is the fuel, `Execution` is reliable concept quality, and `BigPlay` is the multiplicative ceiling. The game gets its strategic tension from forcing the player to move from early flat value into late compounding engines as season targets scale geometrically.

## **Engine Selection, Framework Wrapper, and Cross-Platform Scalability**

Unlike a custom engine or a heavyweight commercial game engine, Callsmith is currently a web application with a native shell path. The runtime stack is:

| Layer | Implementation | Architectural Role |
| :---- | :---- | :---- |
| App runtime | Vite + React + TypeScript | Fast local development, typed UI state, web deployment, deterministic browser execution. |
| Game engine | Pure TypeScript modules in `src/lib/*` | Cards, decks, scoring, bosses, rewards, economy, seeded randomness, persistence helpers. |
| UI shell | React components in `src/components/*` | Team select, match screen, War Room, help, season summary, theatre, coach identity. |
| Native packaging | Capacitor | iOS and Android wrapper around the built web app. |
| Persistence | `localStorage` | Save/resume, run history, daily record, player preferences. |
| Verification | TypeScript, ESLint, smoke, matchup, balance scripts | Regression gates for render safety, scoring logic, and balance distribution. |

The native packaging model matters. The app is not a native gameplay engine with platform-specific logic. It is a deterministic web game that can be hosted at `/slate-boss/` or synced into Capacitor using a relative native build path. The README makes this explicit: the normal hosted build uses the web base path, while native sync runs `npm run build:native` so the iOS and Android webviews receive relative assets.

This architecture gives Callsmith several practical advantages:

1. The same TypeScript scoring code runs in the browser, in server-side smoke rendering, and in the balance harness.
2. Native packaging does not require a separate gameplay implementation.
3. The deterministic harnesses can import the same modules the UI imports.
4. Save migration remains additive and local, because there is no remote persistence contract yet.

The main tradeoff is that Callsmith must remain careful about browser performance, mobile layout, and main-thread work. The codebase already reflects that constraint: heavy Monte Carlo balance work lives in scripts, not in the live app; the match screen uses small hand/deck arrays; and animations honor reduced-motion preferences.

### **The File and Directory Architecture**

The current codebase follows a clear separation between deterministic engine modules and React presentation modules.

| Directory/File Name | Architectural Function and Responsibility |
| :---- | :---- |
| `src/App.tsx` | Top-level app router between home, season, and current experience. |
| `src/components/FootballHome.tsx` | Callsmith title screen, resume/new season, Daily Scrimmage entry, best-run recap. |
| `src/components/FootballTeamSelect.tsx` | Starting team/class selection across the five fictional team identities. |
| `src/components/FootballSeason.tsx` | Season state machine: select, match, reward, champion, summary, plus Overtime. |
| `src/components/FootballMatch.tsx` | In-match UI: hand, selection, preview, scoring ledger, audibles, defensive reads, theatre. |
| `src/components/FootballReward.tsx` | War Room shop: rewards, Film Room tools, Front Office upgrades, reroll/skip economy. |
| `src/components/FootballRunSummary.tsx` | End-of-run debrief, local-best comparison, run code, daily result. |
| `src/components/FootballHelpModal.tsx` | How-to-play reference that reads engine data. |
| `src/components/coachIdentity.tsx` | Fictional coach portrait SVG system, presentation only. |
| `src/components/teamIdentity.ts` | Team palettes, coach names, quotes, play-style tags. |
| `src/components/footballStyles.ts` | Shared visual tokens and UI helper styles. |
| `src/lib/footballRogue.ts` | Core card model, team decks, scoring engine, coordinators, bosses, environments, defensive looks. |
| `src/lib/footballRun.ts` | Season run state, rewards, Film Tools, Front Office, targets, Overtime, debrief logic. |
| `src/lib/gridironEconomy.ts` | Front Office Funds, win purse, interest, skip reward, reroll costs. |
| `src/lib/gridironStorage.ts` | Versioned local save/resume, run history, daily record, preferences. |
| `src/lib/gridironPlaybook.ts` | Concept dossiers, football vocabulary, matchup teaching layer. |
| `src/lib/gridironTaxonomy.ts` | Reward taxonomy, rarity labels, lanes, run code formatting/parsing. |
| `src/lib/gridironCalibration.ts` | Fictional tuning constants derived from real football research, not shipped IP. |
| `src/lib/rng.ts` | Seed hashing and deterministic Mulberry32 PRNG. |
| `scripts/gridironSmoke.tsx` | Render smoke test for home, team select, match, reward, summary, and ledger metadata. |
| `scripts/gridironMatchupCheck.ts` | Deterministic proof that boss looks and concept dossiers agree with scoring. |
| `scripts/gridironBalance.ts` | Monte Carlo harness for viability, skill gap, lane spread, and balance ceilings. |

### **State Management and Deterministic Boundaries**

The game does not use a global mutable engine singleton. Instead, the current run is represented by an `FbRunState` object in `src/lib/footballRun.ts`. React owns the live UI phase, but pure functions own rules and deterministic transformations wherever practical.

The run state contains:

| Field | Function |
| :---- | :---- |
| `gameNumber` | The current game, from 1 through the 5-game season. |
| `seed` | The deterministic root for weather, bosses, rewards, and draws. |
| `team` | The selected starting class: Ironhawks, Blazers, Stormers, Volts, or Ghosts. |
| `stake` | Local difficulty ladder, currently affecting starting Funds only. |
| `deck` | The current player deck of football action cards. |
| `coordinators` | Passive engine pieces analogous to scaling jokers. |
| `playbook` | Leveled Game Plans, concept to level. |
| `bombGames` | Season counter for games with a Bomb, feeding Franchise QB. |
| `keeperGames` | Season counter for games with a QB Keeper, feeding The Improviser. |
| `takeawayGames` | Season counter for games with 2+ takeaways, feeding Takeaway Machine. |
| `funds` | Between-game Front Office currency. |
| `upgrades` | Run-persistent Front Office rule upgrades. |
| `status` | `playing`, `won`, or `lost`. |

This state shape is important because it separates the live match from the metagame. A match consumes the run state and returns summary facts: whether a bomb landed, whether a keeper landed, whether takeaways happened, the game score, and the best drive. The season controller then updates run-level counters, credits Funds, generates the next shop, or ends the season.

## **Memory Management, Object Optimization, and Runtime Performance**

Callsmith does not need the low-level memory engineering of a custom Lua or C++ game because its runtime object counts are modest. Its performance profile is dominated by React render cost, small deck/hand array operations, and CSS animation rather than physics, particles, or massive entity simulation.

The codebase uses several practical performance boundaries:

1. **Small hand search in the live game.** The live player selects up to four cards from an eight-card hand. The UI previews one selected play, not every legal combination. The exhaustive combination search exists in the balance harness, not in player-facing runtime.
2. **Pure scoring modules.** `scoreFootballPlay` takes a card array and a score context, then returns a result and ledger. It does not mutate React state or depend on hidden UI globals.
3. **Script-only Monte Carlo.** `scripts/gridironBalance.ts` performs heavy simulated play and reward-policy comparisons outside the app runtime.
4. **Bounded persistence.** Run history is capped to 10 entries. Preferences and daily records are tiny.
5. **Reduced-motion support.** The match UI detects `prefers-reduced-motion` and shortens or disables theatrical count-up behavior.

The architectural rule is not "optimize everything." The rule is to keep the deterministic engine cheap enough that the UI can spend its budget on clarity and feel. If future features add more exhaustive previewing, AI assistance, or combinatorial suggestions in the live app, those features should be gated, memoized, or moved to deliberate player actions rather than running on every render.

### **Data-Driven Design vs. Class Hierarchies**

Callsmith is deliberately table-driven. Cards, coordinators, environments, bosses, team profiles, Game Plan steps, Film Tools, and Front Office upgrades are mostly plain objects and discriminated string unions. This makes the game easy to audit:

| System | Data Structure | Runtime Function |
| :---- | :---- | :---- |
| Card actions | `FbActionType` union | Determines side, label, family, route, and concept eligibility. |
| Player traits | `FB_CARD_MODIFIERS` | Adds small, readable hooks in scoring. |
| Coordinators | `FB_COORDINATORS` | Defines channel, scaling type, and player-facing description. |
| Game Plans | `GAME_PLAN_STEP` | Gives concepts per-level Base, Execution, and optional BigPlay scaling. |
| Environments | `FB_ENVIRONMENTS` | Applies match-level weather or event modifiers. |
| Bosses | `FB_BOSS_SCHEMES` | Defines the known defensive tendency and player hint. |
| Presentations | `PRESENTATION_BY_SCHEME` and `PRESENTATION_ALT_BY_SCHEME` | Defines hidden pre-snap looks. |
| Rewards | Reward factories in `footballRun.ts` | Applies deck, coordinator, training, or playbook changes. |
| Film Tools | `FILM_TOOLS` | Applies immediate deck/card mutations. |
| Front Office | `FRONT_OFFICE` | Adds run-persistent rule upgrades. |

The benefit is auditability. A future designer or agent can inspect one map and understand most of a content family. The downside is that scoring still centralizes many effects inside `scoreFootballPlay`. That is acceptable at the current product scale because the deterministic ledger makes every contribution visible and testable. If effect count grows dramatically, the likely next abstraction is not inheritance. It is a staged effect registry that preserves the current ledger contract.

## **The Core Loop and Event Transition Management**

The macro loop is a five-game season. Win all five games to win the campaign. Lose any game and the run ends. After winning the Championship, the player may enter Overtime, a separate score-chase mode that cannot turn a won campaign into a loss.

The season state machine in `FootballSeason` is:

| Phase | Meaning |
| :---- | :---- |
| `select` | Choose a starting team/class and stake. |
| `match` | Play a three-drive football card game. |
| `reward` | Spend Funds in the War Room between games. |
| `champion` | Post-Championship interstitial with option to bank win or enter Overtime. |
| `summary` | End-of-run debrief, local history, run code, and new season options. |

Within a game, the loop is:

1. Draw an 8-card hand.
2. Inspect the drive target, remaining Play Budget, boss, environment, and visible matchup context.
3. Select up to 4 cards to assemble a football concept.
4. Preview the deterministic score and ledger.
5. Commit the play, spending Play Budget and adding the result to the drive score.
6. Draw back up and continue until the drive target is cleared or budget collapses.
7. Repeat for 3 drives.
8. If all drives clear, the game is won and the season advances.

The two resource systems are intentionally separate:

| Resource | Scope | Function |
| :---- | :---- | :---- |
| Play Budget | Per drive | Limits how many and which cards can be played before the drive stalls. |
| Audibles | Per drive | Allows redraws, and in boss games can be spent to reveal the hidden defensive look. |
| Funds | Between games | Buys rewards, tools, upgrades, rerolls, and strategic development. |

This separation gives the game its two-layer puzzle. Inside a drive, the player is solving a tactical hand and budget problem. Between games, the player is solving a deckbuilding and economy problem.

### **War Room Transition and Between-Game Economy**

After a won non-Championship game, the War Room credits the player with:

```text
shopCredit = winPurse + interestOn(currentFunds)
```

The current constants are:

| Economy Constant | Value | Function |
| :---- | :---- | :---- |
| `STARTING_FUNDS` | 6 | Opening budget. |
| `WIN_PURSE` | 5, 6, 7, 8 for Games 1-4 | Between-game income after wins. |
| `INTEREST_PER` | 5 | Every 5 banked Funds creates 1 interest. |
| `INTEREST_CAP` | 3 | Prevents hoarding from dominating. |
| `SKIP_REWARD` | 2 | Bonus for leaving a reward shop without purchases. |
| `REROLL_BASE` | 2 | First reroll cost. |
| `REROLL_STEP` | 1 | Incremental reroll tax. |
| `MAX_WAR_ROOM_PURCHASES` | 2 | Limits ordinary reward purchases per War Room. |

The War Room has three shelves:

1. **Rewards:** cards, coordinators, Game Plans, trim, upgrades, and training.
2. **Film Tools:** immediate one-use deck/card mutations.
3. **Front Office:** run-persistent rule upgrades such as extra audibles, staff expansion, reroll discount, deeper interest cap, extra reward slot, or expanded Film Room.

This makes shop decisions more interesting than "take the highest number." The player can spend now, bank for interest, reroll for a keystone, buy a short-term stabilizer, develop one card, or change the run rules.

## **Mathematical Modeling, Game Theory, and the Evaluation Pipeline**

The computational backbone of Callsmith is `scoreFootballPlay(cards, ctx)`. It converts selected cards into a football concept, applies staged modifiers, writes a ledger, and returns a deterministic result.

The final equation is:

```text
total = floor(Base x (1 + Execution) x BigPlay)
```

The three channels have distinct design jobs:

| Channel | Meaning | Strategic Role |
| :---- | :---- | :---- |
| `Base` | Raw yards and flat value | Early survival, floor, card quality, run-game fuel. |
| `Execution` | Additive concept quality | Reliable clean-play value, especially for stacks, ground, keepers, takeaways, short passing. |
| `BigPlay` | Multiplicative leverage | Late-game ceiling, compounding engines, explosive identity. |

Because `Execution` is additive inside `(1 + Execution)` and `BigPlay` is multiplicative, the player is pushed through a roguelike power curve. Early flat value is enough to survive. Late in the season, targets scale geometrically, so the player needs a concentrated concept, scaling coordinators, and multiplicative help.

### **Concept Recognition and Base Initialization**

Cards are football actions: passes, runs, catches, kicks, and defensive plays. A selected group of cards becomes a concept based on simple deterministic grammar.

| Concept | Trigger | Initial Scoring Identity |
| :---- | :---- | :---- |
| `double_stack_bomb` | QB pass plus at least two same-team catches | Execution +0.4, BigPlay x1.5, can gain Shot Play x1.2. |
| `stack_td` | QB pass plus one same-team catch | Execution +0.6, reliable passing core. |
| `shootout_stack` | Stack plus opposing catch | Bring-back BigPlay x1.4. |
| `checkdown` | Pass plus checkdown-only support without stack | Safe floor concept. |
| `ground_pound` | Two or more RB run cards | Execution +0.4, three carries gain BigPlay x1.25. |
| `designed_run` | One run card | Low-complexity run play. |
| `qb_keeper` | QB run card(s) without pass/catch | Execution +0.45, two QB runs gain BigPlay x1.35. |
| `field_goal` | All kick cards with a field goal | Reliable special-teams floor. |
| `extra_point` | All kick cards without a field goal | Low-ceiling special-teams filler. |
| `pick_six` | Defensive return touchdown | BigPlay x1.65. |
| `takeaway` | Interception without return TD | Execution +0.3. |
| `sack` | Defensive pressure card | Defensive floor concept. |
| `busted_play` | No valid grammar | BigPlay x0.5 unless salvaged. |

This grammar is the football equivalent of poker-hand recognition. The player is not merely matching colors or suits. They are assembling a recognizable play: quarterback plus receiver, multiple carries, option keeper, defensive splash, or kick.

### **The Sequential Scoring Pipeline**

The scoring pipeline is ordered. Changing the order changes the balance.

1. **Card Base:** Sum the selected cards' `value` fields into initial Base.
2. **Concept Recognition:** Determine whether the selection is a stack, run, keeper, kick, defense, or busted play.
3. **Concept Hooks:** Add concept-specific Execution or BigPlay, such as Double Stack, Shot Play, Gash, Option Pitch, Pick Six, or Takeaway.
4. **Coordinators:** Apply passive staff effects. These can add Base, add Execution, multiply BigPlay, or retrigger card yards.
5. **Game Plan:** Apply concept levels from the run playbook. Level 1 gives flat value; Level 2 and beyond start compounding BigPlay.
6. **Player Traits:** Apply card modifiers such as Clutch, Explosive, Reliable, Protected, Discounted, or Hot Route.
7. **Busted Play Adjustment:** Salvage with Broken Play Artist or Reliable, otherwise apply the busted penalty.
8. **Environment:** Apply match conditions such as Dome, Snow, Wind, or Primetime.
9. **Boss Scheme:** Apply known defensive tendency penalties and bonuses.
10. **Pre-Snap Matchup Edge:** Apply favorable hidden-look bonuses from the revealed or actual defensive presentation.
11. **Anti-Spam Adjustment:** Repeated concepts in the same drive lose BigPlay, harsher against Adaptive DC.
12. **Final Calculation:** Round Base, round Execution and BigPlay, then floor the final equation.
13. **Ledger Output:** Return the full staged ledger with stage, channel, operation, value, label, and detail.

The ledger is one of the most important engineering choices in the game. It makes scoring inspectable, teachable, and testable. Every hidden-looking number has a record. This is what lets the UI show transparent math and lets scripts assert that scoring still agrees with the teaching layer.

### **Coordinators as Scaling Engines**

Coordinators are the closest analog to passive build-around items. They are not all equal; they occupy different channels and scaling profiles.

| Coordinator | Channel | Scaling Type | Strategic Function |
| :---- | :---- | :---- | :---- |
| Air Raid Coordinator | Execution | Within-game | Stack plays gain Execution from prior stacks. |
| Bell Cow | Base | Within-game | Run cards add Base and Ground & Pound builds a match-long Base bank. |
| Salary Wizard | Base | Flat | Cheap cards add Base. |
| Franchise QB | BigPlay | Season | Every prior Bomb game increases BigPlay. |
| West Coast Guru | Execution | Flat | Short passing and checkdowns gain Execution. |
| Ball-Hawk DC | BigPlay | Flat | Defensive plays gain BigPlay. |
| Read-Option Guru | Execution | Within-game | QB run concepts scale with prior QB runs. |
| The Improviser | BigPlay | Season | Prior QB Keeper games increase BigPlay. |
| Broken Play Artist | Base | Flat | Stranded QB-run busted plays become positive scrambles. |
| Pressure Chain | Execution | Within-game | Defensive plays scale with prior defensive plays. |
| Takeaway Machine | BigPlay | Season | Prior takeaway games increase BigPlay. |
| Power Sweep Coordinator | BigPlay | Within-game | Ground & Pound gains a missing multiplicative path. |
| Two-Minute Drill | Base retrigger | Within-game | Opening stack of a drive counts card yards twice when a stack plan is committed. |

This table reveals the balance philosophy: every identity lane should have a flat stabilizer, a within-game ramp, and a season-long or rare build-around path. If a lane lacks multiplicative growth, it can feel strong early but collapse in Games 4 and 5.

### **Game Plans as Concept-Level Scaling**

Game Plans are the Planet-card analog. A reward can permanently level a concept. Level 1 is mostly flat improvement. Level 2 and beyond apply a commitment multiplier through `GAME_PLAN_COMMIT_XMULT`.

Current Game Plan tuning includes:

| Concept | Per-Level Base | Per-Level Execution | Per-Level BigPlay |
| :---- | :---- | :---- | :---- |
| Double-Stack Bomb | 0 | +0.26 | None from step. |
| Stack TD | 0 | +0.22 | None from step. |
| Shootout Stack | 0 | +0.24 | None from step. |
| Ground & Pound | +64 | +0.18 | +0.05 per level. |
| QB Keeper | +60 | +0.15 | +0.09 per level. |
| Checkdown | +30 | +0.12 | None from step. |
| Field Goal | +58 | 0 | None from step. |
| Pick Six | 0 | +0.30 | None from step. |
| Takeaway | 0 | +0.22 | +0.05 per level. |
| Sack | +24 | 0 | +0.05 per level. |

Passing does not receive per-level BigPlay in this table because passing already has multiple multiplicative paths: Double-Stack, Shot Play, Shootout, Franchise QB, Explosive traits, and Two-Minute Drill. Ground, mobile, and defense receive more direct BigPlay help because they otherwise plateau.

### **Player Traits as Card-Level Identity**

Player Traits are single-card modifiers that make individual cards feel owned and developed.

| Trait | Mechanical Effect |
| :---- | :---- |
| Reliable | Waives the busted-play penalty on any play including the card. |
| Explosive | Adds +0.10 BigPlay per Explosive card on clean concepts. |
| Discounted | Reduces Play Budget cost by 1, minimum 1. |
| Clutch | Adds +20 Base on Drive 3 and in the Championship. |
| Protected | Halves opposing scheme penalties on plays including the card. |
| Hot Route | Lets a catch count as the passer's team for stack detection. |

These traits are intentionally small and legible. They do not create new screens or subsystems. They are hooks inside the existing scoring pipeline and badges on the card face.

## **Defensive Presentations, Hidden Information, and Football Reading**

The newest major product hook is the defensive presentation model. Bosses are no longer only named modifiers. They map to pre-snap looks across four axes:

| Axis | Values | Football Meaning |
| :---- | :---- | :---- |
| Shell | `base`, `one-high`, `two-high`, `zero` | Deep safety structure. |
| Box | `light`, `neutral`, `loaded` | Run-fit numbers. |
| Pressure | `four-man`, `blitz`, `simulated` | Rush intent. |
| Leverage | `soft`, `press`, `inside`, `outside` | Corner alignment, mostly presentation for now. |

The primary boss mappings are:

| Boss Scheme | Primary Look |
| :---- | :---- |
| Base Defense | Base shell, neutral box, four-man rush, soft leverage. |
| No-Fly Zone | Two-high shell, light box, four-man rush, soft leverage. |
| Stacked Box | One-high shell, loaded box, four-man rush, press leverage. |
| Turnover Drill | Two-high shell, neutral box, simulated pressure, inside leverage. |
| Adaptive DC | One-high shell, neutral box, blitz, press leverage. |

Each non-balanced boss can also show an alternate disguised look. The important design rule is that the alternate look removes a possible favorable edge. It does not add raw power. This makes disguise an information test, not a hidden difficulty spike.

The favorable pre-snap matchup matrix is:

| Concept | Favorable Look | Scoring Edge |
| :---- | :---- | :---- |
| Ground & Pound | Light box | Base x1.08. |
| Designed Run | Light box | Base x1.06. |
| QB Keeper | Light box | Execution +0.10. |
| Double-Stack Bomb | One-high shell | BigPlay x1.08. |
| Shootout Stack | One-high shell | BigPlay x1.06. |
| Checkdown | Blitz or simulated pressure | Execution +0.10. |

In the live app, the exact look is chosen once per game from an independent seed stream:

```text
gridiron-look:{seed}:g{gameNumber}:{bossScheme}
```

That independence is critical. It lets the hidden look vary without perturbing card draw order, rewards, or the replayability of run codes. A player can spend a defensive read, costing one audible, to reveal the look. Before the read, preview uses a neutral presentation; after the read, the preview can reflect the live pre-snap edge.

The corresponding verification lives in `scripts/gridironMatchupCheck.ts`. It proves two things:

1. The same hand scores differently against different looks when it should.
2. The concept dossier's teaching verdict agrees with actual engine scoring, both pre-reveal and after each revealed look.

## **PRNG Mechanics, Replayability, and Deterministic Seeds**

Callsmith uses a simple deterministic random architecture:

| Function | File | Role |
| :---- | :---- | :---- |
| `stringSeed(input)` | `src/lib/rng.ts` | FNV-like string hash to unsigned integer seed. |
| `mulberry32(seed)` | `src/lib/rng.ts` | Deterministic PRNG returning 0 to 1. |
| `runRng(run, scope)` | `src/lib/footballRun.ts` | Derives scoped run streams from season seed, team, game, and scope. |
| `shuffle(arr, rng)` | `src/lib/footballRogue.ts` | Deterministic Fisher-Yates shuffle when passed a seeded RNG. |

The only non-deterministic moment is creating a fresh casual season seed, which currently uses time and `Math.random` in `createGridironSeed`. Once the seed exists, the run can be replayed through deterministic streams. Daily Scrimmage avoids that initial entropy by hashing the UTC date and assigning a deterministic team.

Run codes live in `gridironTaxonomy.ts` and encode:

```text
TEAMSHORT-BASE36SEED
```

For example, a Volts run might serialize as a short team code plus a base-36 seed. The code reproduces team, seed, weather, bosses, rewards, and draws. Player decisions remain the variable, which is exactly the right model for a single-player roguelike seed.

The main caution is that default parameters in some helper functions still allow `Math.random` for convenience. Gameplay paths that need replayability should pass an explicit RNG or derive one with `runRng`, `mulberry32`, and `stringSeed`.

## **Target Scaling and Auto-Battler Style Power Curves**

The season has 5 games and each game has 3 drive targets. Game 1 starts from:

```text
DRIVE_TARGET = [700, 880, 1120]
```

Targets then scale geometrically:

```text
seasonScale = 1.24 ^ (gameNumber - 1)
championshipScale = 1.32 on Game 5
primetimeScale = 1.2 on Primetime environments
```

Overtime continues after a won campaign:

```text
overtimeScale = (1.24 ^ 4) x 1.32 x (1.18 ^ round)
```

This mathematical curve creates the core strategic arc. Flat Base upgrades and Execution bonuses are highly valuable early, but they cannot carry the player alone into the Championship. A winning build usually needs:

1. One concept committed through Game Plan levels.
2. Cards that reliably assemble that concept.
3. Coordinators that feed the chosen channel.
4. At least one multiplicative or season-scaling source.
5. A backup answer to the boss that counters the main plan.

This resembles auto-battler strategy more than traditional football simulation. The player drafts an identity, stabilizes the early game, then pivots into compounding synergies before the curve outruns flat value.

## **Team-as-Deck Classes and Strategic Lanes**

Starting teams are not skins. They are classes with different deck composition, starting coordinators, difficulty, cost identity, and strategic lane.

| Team | Archetype | Starting Coordinators | Strategic Identity |
| :---- | :---- | :---- | :---- |
| Ironhawks | Balanced | Air Raid, Bell Cow | Flexible first-run deck with no sharp weakness. |
| Blazers | Air Raid | Air Raid, Franchise QB | Passing stacks, Double-Stack Bomb, Shootout ceiling. |
| Stormers | Ground Game | Bell Cow, Salary Wizard | High-floor run engine, weather-proof, needs late BigPlay help. |
| Volts | Mobile QB | Read-Option Guru, Broken Play Artist | QB Keeper, scramble volatility, busted-play rescue. |
| Ghosts | Defensive Pressure | Ball-Hawk DC, Salary Wizard | Defensive splash, Pick Six, Takeaway, cheap pressure cards. |

The balance harness treats lanes as first-class. It does not only ask whether the average run can win. It asks whether pass, ground, defense, and mobile can each work as intended lanes. This is the correct test for a roguelike deckbuilder: variety is not real unless different starting identities can produce viable optimal lines.

## **Reward Generation and Commitment Pressure**

Rewards are generated around the deck's current lean. The shop tries to offer:

1. A keystone engine piece, often a coordinator or primary Game Plan.
2. A commitment lever, usually another Game Plan level.
3. A flex stabilizer, such as Strength & Conditioning, Training, Trim, or a free-agent card.
4. An optional fourth reward if the player owns Bigger Front Office.

The deck lean logic intentionally counts identity signals, not raw card count. Catches are shared support, so they do not automatically make every deck "pass." QB-run volume can define the mobile lane. Defensive cards can define the defense lane. This makes reward shelves better at feeding the actual build.

The reward categories are:

| Reward Kind | Function |
| :---- | :---- |
| Card | Adds a free agent card. |
| Coordinator | Adds a passive scoring engine, up to the coordinator limit. |
| Playbook | Levels a Game Plan concept. |
| Trim | Cuts low-value cards to improve draw quality. |
| Upgrade | Adds flat value to cheap cards. |
| Training | Applies a Player Trait to a fitting untraited card. |

The key design idea is "commitment beats collection." A player who grabs random powerful pieces should be less consistent than a player who levels one concept, drafts matching cards, and hires matching staff.

## **Persistence, Migration, and Local-First Product Boundaries**

Persistence is contained in `src/lib/gridironStorage.ts`. The current storage keys are:

| Key | Data |
| :---- | :---- |
| `gridiron_run_v1` | In-progress run and War Room state. |
| `gridiron_history_v1` | Local run history, capped to 10 entries. |
| `gridiron_daily_v1` | Daily Scrimmage record and streak. |
| `gridiron_prefs_v1` | Quick results, haptics, and show-math preferences. |

The save format is versioned. Current storage version is 3:

| Version | Additions |
| :---- | :---- |
| v1 | Original local run shape. |
| v2 | Front Office Funds and card Player Traits. |
| v3 | Season-long lane counters for mobile and defense compounders. |

Migration is additive. Older saves are read if their version is in the readable set, then missing fields are backfilled. This is exactly the right discipline for local alpha persistence: do not strand an in-progress season because the run shape gained a field.

The code also treats storage failure as non-fatal. If localStorage is unavailable, blocked, malformed, or full, the game should still play. Persistence is convenience, not a runtime dependency.

## **Teaching Layer, Concept Dossiers, and Research Hygiene**

The teaching layer lives in `src/lib/gridironPlaybook.ts`. It translates engine concepts into football language:

| Engine Concept | Football Identity |
| :---- | :---- |
| `double_stack_bomb` | Four Verticals / Shot Play |
| `shootout_stack` | Bring-Back / Shootout |
| `stack_td` | QB Stack (Stick / Slant-Flat) |
| `checkdown` | Checkdown / Dump-Off |
| `ground_pound` | Inside Zone / Power / Duo |
| `qb_keeper` | Read Option / QB Keeper |
| `pick_six` | Pick Six |
| `takeaway` | Takeaway / Interception |
| `sack` | Sack / Pressure |

Each dossier explains what the concept is, what it beats, what beats it, and how to scale it. The integrity rule is strict: the teaching layer cannot claim a matchup is favorable or unfavorable unless the scoring engine agrees. The matchup script verifies this relationship.

This is also where Callsmith's research hygiene matters. The calibration file can encode lessons from real football data, such as environment weights and fictional outcome bands, but the shipped game must remain fictional. That means no real teams, real players, licensed marks, sportsbook language, DFS contest framing, deposits, withdrawals, prizes, or real-money pressure.

## **Sensory Design, Feedback, and Player Psychology**

Callsmith's engagement depends on making deterministic math feel physical and readable. The match UI includes:

1. A live score preview.
2. A staged scoring ledger.
3. Count-up theatre after a play.
4. Concept banners for signature plays.
5. Drive stamps and turnover stamps.
6. Coach callouts and first-game teaching.
7. Hidden/revealed defensive look labels.
8. Optional quick results and reduced-motion support.

This feedback stack serves the same purpose as "juice" in other successful deckbuilders: it lets the player feel the value chain. A good play should not merely output a number. It should teach the player why the number happened:

```text
Base Yards -> concept bonus -> coordinator ramp -> Game Plan level -> trait -> weather -> boss -> pre-snap edge -> anti-spam -> final total
```

The current visual system is intentionally fictional and product-safe. Team and coach identities are generated from local presentation data, not licensed IP. The UI uses football flavor while keeping the game world its own.

## **Verification Harnesses and Balance Governance**

Callsmith's most important engineering advantage is that its design claims are backed by scripts.

| Command | Purpose |
| :---- | :---- |
| `npm run lint` | Static code/style gate. |
| `npm run build` | TypeScript and Vite production build. |
| `npm run smoke:gridiron` | Server-render core screens and assert basic content/ledger metadata. |
| `npm run matchup:gridiron` | Prove defensive looks affect scoring and dossiers match engine truth. |
| `npm run balance:gridiron -- 3000` | Monte Carlo balance proof for scoring, rewards, targets, lanes, and skill gap. |

The balance harness is especially important. It evaluates whether a synergy-aware reward policy outperforms weaker policies, whether lanes remain viable, whether losses are caused by underpowered builds rather than dead draws, and whether ceilings stay within acceptable bands. The current reviewer packet reports a passing balance state, a synergy champion rate of 53.3%, and two soft watch items: lane spread at 10.1 points and campaign cleared-drive p99/median at 3.16x.

For future development, the rule should remain:

```text
If a change touches scoring, rewards, targets, economy, draw, boss logic, or lanes,
run the full balance harness before calling the tuning final.
```

## **Scaling Constraints and Product Guardrails**

Callsmith has a strong alpha foundation, but several constraints should remain explicit:

1. **Do not add backend services by accident.** Local-first is part of the current product direction.
2. **Do not add real sports IP.** All teams, players, coaches, and content should stay fictional.
3. **Do not hide randomness inside scoring.** Variance should come from seeded draw order, run state, and decisions.
4. **Do not break the scoring contract.** The three-channel equation is the game.
5. **Do not refactor math, UI, storage, and economy in one casual pass.** These systems are coupled through balance.
6. **Do not let teaching drift from engine truth.** Dossiers and matchup labels must stay verified.
7. **Do not let the War Room become pure shopping.** It should remain a commitment and economy puzzle.
8. **Do not let one lane dominate.** Pass, ground, mobile, and defense need distinct viable identities.

### **Replication Roadmap for a Similar Product**

A developer attempting to reproduce Callsmith's structure should build in this order:

1. **Pure card model:** Define cards as sports actions with value, cost, side, and identity.
2. **Concept recognizer:** Convert selected cards into a small set of meaningful concepts.
3. **Three-channel scorer:** Implement `Base x (1 + Execution) x BigPlay` with a ledger.
4. **Deterministic deck loop:** Add seeded shuffle, hand draw, selection cap, budget, and targets.
5. **Run state:** Add season games, counters, team classes, and deterministic scoped RNG.
6. **Reward loop:** Add between-game currency, concept levels, passive coordinators, cards, trim, and training.
7. **Bosses and environments:** Add known matchup pressure first, then hidden presentation reads.
8. **Persistence:** Add local save/resume with versioned migration.
9. **Harnesses:** Add smoke, matchup, and Monte Carlo balance checks before expanding content.
10. **Juice and teaching:** Add staged feedback, concept dossiers, and player-facing explanation after the math is stable.

The crucial implementation lesson is that the transparent ledger should exist early. Without it, every later system becomes harder to tune, teach, and verify.

## **Conclusion**

Callsmith is best understood as a deterministic football concept engine inside a roguelike deckbuilder shell. Its strongest current ideas are the three-channel scoring contract, team-as-deck classes, concept-level Game Plans, coordinator scaling lanes, local-first seeded replayability, and the defensive read system that turns football knowledge into score.

The product is not yet a content-maximized or service-backed game, and it should not try to become one too early. Its current leverage is clarity: every scoring event can be explained, every run can be reproduced, every balance claim can be simulated, and every football lesson can be checked against the engine. The right next work is not to make the system larger for its own sake. It is to keep sharpening the relationship between decision, concept, counter, and payoff until a player can say, "I won because I built the right offense for that defense," and the code can prove that statement true.

## **Local Sources Reviewed**

| Source | Relevance |
| :---- | :---- |
| `README.md` | Current Callsmith product state, run commands, quality gates, local-first boundaries. |
| `docs/GRIDIRON_AI_REVIEW_BRIEF_2026-06-26.md` | Current reviewer packet, product thesis, newest defensive presentation model, balance state. |
| `docs/PROJECT_MAP.md` | Current app/component/engine map. |
| `AGENTS.md` | Repo guardrails for fictional content, deterministic scoring, storage migration, and verification. |
| `src/lib/footballRogue.ts` | Core card model, scoring formula, coordinators, bosses, environments, team decks, defensive looks. |
| `src/lib/footballRun.ts` | Season state, reward generation, Film Tools, Front Office, targets, Overtime, debrief logic. |
| `src/lib/gridironEconomy.ts` | Funds economy, interest, reroll, skip, and purchase constants. |
| `src/lib/gridironStorage.ts` | Versioned local persistence and migration. |
| `src/lib/gridironPlaybook.ts` | Concept dossiers and football teaching layer. |
| `src/lib/gridironTaxonomy.ts` | Reward taxonomy, lanes, rarity labels, run codes. |
| `src/lib/rng.ts` | Deterministic seed helpers. |
| `scripts/gridironSmoke.tsx` | Render and ledger smoke coverage. |
| `scripts/gridironMatchupCheck.ts` | Hidden-look and dossier-engine consistency proof. |
| `scripts/gridironBalance.ts` | Monte Carlo balance and lane viability harness. |
