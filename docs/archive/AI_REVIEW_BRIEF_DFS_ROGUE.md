# Slate Boss / DFS Card Rogue Review Brief

Use this file as a one-stop context packet for another model, reviewer, designer, or engineer. The goal is to get high-signal critique on whether Slate Boss should evolve from a DFS lineup sim into a DFS-inspired card roguelike.

## TL;DR

Slate Boss is a fictional, no-real-money football lineup strategy game. The original app is a daily/career DFS-style lineup builder: generate a slate, build an 8-player salary-cap lineup, enter a contest, watch a simulated sweat, and review results.

The current experimental branch adds a first playable **DFS card-rogue prototype**. It keeps the existing lineup builder and contest simulation, then layers a new scoring model on top:

```text
Rogue Engine Score = Base Fantasy Points x Edge Multiplier
```

Base Fantasy Points come from the existing contest simulation. Edge comes from lineup patterns and starter coordinator effects: stacks, bring-backs, game stacks, cheap value, leverage, and other DFS strategy concepts.

The key review question:

> Does this direction feel like a sticky card-rogue engine builder, or is it still too close to a normal lineup optimizer with extra scoring copy?

## Repository State

Repository:
- `https://github.com/dmbrown81/slate-boss`

Important branches/refs:
- `main`: classic Slate Boss DFS lineup sim.
- `archive/classic-dfs-sim`: preserved classic baseline as of June 17, 2026.
- `classic-dfs-sim-2026-06-17`: tag for the same classic baseline.
- `codex/dfs-card-rogue`: active experimental branch for the card-rogue direction.

Local dev URL when running Vite:
- `http://127.0.0.1:5173/slate-boss/`

Useful commands:

```bash
npm install
npm run dev -- --host 127.0.0.1
npm run lint
npm run build
npm run balance
```

Current validation:
- `npm run lint` passes.
- `npm run build` passes.
- Browser smoke test completed the Rogue Prototype flow locally.

## Product Background

The classic Slate Boss loop:

1. Generate a fictional football slate.
2. Build an 8-player lineup under a $50,000 salary cap.
3. Pick or enter a contest.
4. Simulate player scores and opponent field results.
5. Watch a quarter-by-quarter sweat.
6. Review rank, payout, Build Quality, Game Luck, best/worst plays, and lessons.
7. Continue daily play or career mode.

The classic app already includes:
- Fictional teams and players.
- Positions: QB, RB, WR, TE, DST.
- Roster slots: QB, RB1, RB2, WR1, WR2, TE, FLEX, DST.
- Player projections, salary, floor, ceiling, volatility, ownership, form, recent games, and archetypes.
- Slate modifiers such as Windy Week, Shootout Slate, Grind-It-Out, Primetime Chaos, and Sloppy Conditions.
- Contest types: Safe 50/50, Starter Tournament, Big Tournament, Winner Take All.
- Opponent lineup archetypes: safe chalk, balanced, QB combo, contrarian, stars-and-scrubs, casual, sharp.
- Career mode with bankroll, tiers, boons, achievements, and run history.
- A balance harness for comparing lineup construction archetypes.

## Why Pivot Toward a Card Rogue?

The user likes the current game but feels it is not fun or sticky enough yet. The hypothesis is that DFS already has roguelike/card-game ingredients:

- Constrained roster construction.
- Salary cap pressure.
- Volatile outcomes.
- Correlation through stacking.
- Ownership/leverage tradeoffs.
- Slate-specific modifiers.
- Injury/news chaos.
- Opponent field dynamics.

The proposed pivot is not "Balatro with football names." It is:

> A single-player DFS-inspired card roguelike where the player builds lineup engines instead of merely picking optimal projections.

The desired emotional moment:

> "My cheap value RB unlocked salary, my QB double-stack triggered Air Raid, my bring-back activated the shootout bonus, and my low-owned WR turned the lineup into a leverage nuke."

## Core Card-Rogue Translation

| Card-Rogue Concept | Slate Boss Rogue Equivalent |
| --- | --- |
| Playing cards | Player cards |
| Suits/ranks | Team, position, archetype, salary tier, ownership band |
| Poker hands | Lineup patterns |
| Chips | Base fantasy points |
| Mult | Edge multiplier |
| Jokers | Coordinators, analysts, tools, front-office specialists |
| Tarot-style cards | Film, news, waiver, training, and leverage consumables |
| Planet-style cards | Playbook upgrades for specific lineup patterns |
| Spectral-style cards | High-upside chaos moves with permanent costs |
| Vouchers | Front-office upgrades |
| Blinds | Contest targets |
| Boss Blinds | Boss slates with special rules |
| Shop | Waiver wire, film room, front office |
| Tags/skips | Skip a contest for a future advantage |

## Current Rogue Prototype

The current branch has a playable **Rogue Prototype** entry on the home screen.

Flow:

1. Click `Try Rogue Prototype`.
2. Build a legal lineup using the existing builder.
3. The builder shows starter coordinators and encourages stacks, bring-backs, leverage, and value.
4. Enter the contest.
5. Watch or skip the existing sweat screen.
6. See the new Rogue Results screen.

The Rogue Prototype does not update normal daily/career profile progression yet. It is a separate experiment.

## Current Rogue Scoring

Implemented in:
- `src/lib/rogueScoring.ts`

The engine detects lineup patterns and applies flat Edge, multiplicative Edge, and coordinator bonuses.

Current score model:

```text
Base Fantasy Points = result.userScore from the contest simulator
Adjusted Base Points = Base Fantasy Points + base-point bonuses
Edge Multiplier = (1 + Flat Edge) x X Edge
Final Engine Score = Adjusted Base Points x Edge Multiplier
```

The Rogue Results screen shows:
- Final engine score.
- Prototype boss target status.
- Base score.
- Flat Edge.
- Total Edge.
- Engine read.
- Pattern cards.
- Scoring ledger.
- Starter coordinator cards.
- Lineup scorecard.

The prototype boss target is currently fixed at `210`.

## Current Lineup Patterns

Implemented pattern keys:

- `single_stack`
- `double_stack`
- `bring_back`
- `game_stack`
- `chalk_core`
- `leverage_core`
- `stars_scrubs`
- `bellcow_build`
- `punt_value`
- `fragile_ceiling`

Pattern examples:

| Pattern | Current Recognition Idea |
| --- | --- |
| Single Stack | QB plus one same-team WR/TE |
| Double Stack | QB plus two or more same-team WR/TE |
| Bring-Back | Stack plus opponent skill player |
| Game Stack | Four or more players from one game |
| Chalk Core | High average ownership and projection |
| Leverage Core | Low ownership with enough ceiling |
| Stars and Scrubs | Multiple expensive players plus multiple cheap players |
| Bellcow Build | Multiple workhorse RBs |
| Punt Value | Cheap players above a value threshold |
| Fragile Ceiling | Multiple volatile high-ceiling plays |

## Current Starter Coordinators

Starter coordinator keys:

- `air_raid`
- `salary_wizard`
- `leverage_desk`

Current effects:

- **Air Raid Coordinator**: QB stacks add extra Edge. Double stacks get the full bonus.
- **Salary Wizard**: Cheap value plays add Base Points before Edge multiplies.
- **Leverage Desk**: Low-owned ceiling plays multiply Edge.

Additional coordinator definitions exist but are not yet part of the starter prototype:

- `bring_back_theory`
- `dome_model`
- `red_zone_sheet`
- `chalk_shield`
- `late_swap_pass`

## Important Files

Core app:
- `src/App.tsx`: app mode routing, including Rogue Prototype flow.
- `src/types/index.ts`: central types for players, slate, lineup, contests, career.
- `src/lib/slateGenerator.ts`: deterministic fictional slate generation.
- `src/lib/simulation.ts`: contest simulation, scoring, opponent fields.
- `src/lib/lineupValidation.ts`: roster slot and salary-cap logic.
- `src/lib/payout.ts`: contest definitions and payout logic.
- `src/lib/grading.ts`: classic Build Quality and Game Luck analysis.

Rogue-specific:
- `src/lib/rogueScoring.ts`: pattern detection, coordinator data, engine scoring, ledger generation.
- `src/components/RogueResultsScreen.tsx`: new rogue result presentation.
- `src/components/HomeScreen.tsx`: Rogue Prototype entry card.
- `src/components/LineupBuilder.tsx`: rogue builder copy and starter coordinator cards.

Project docs/logs:
- `PROJECT_LOG.md`: chronological project log.
- `AGENT_HANDOFF_LOG.md`: shared Codex / Claude Code handoff notes.
- `docs/DFS_CARD_ROGUE_DIRECTION.md`: deeper design direction and phased roadmap.
- `AI_MODEL_FEEDBACK_SYNTHESIS.md`: earlier outside-model feedback on the classic DFS app.
- `AI_AUDIT_BRIEF.md`: earlier review/audit context.

## Known Issues / Design Risks

1. Rogue scoring is probably too explosive.
   - A stack-heavy smoke test hit a `352.0` engine score against a `210` target.
   - This may feel exciting, but the current values likely need tuning and diminishing returns.

2. Current prototype uses the full slate pool.
   - This is accessible and fast, but may not feel enough like a card roguelike.
   - A future version may need a draw pile, bench, limited hand, pack draft, or shop-based roster pool.

3. There is no real rogue run shell yet.
   - No antes/weeks map.
   - No boss slate sequence.
   - No shop after contests.
   - No persistent coordinator slots or playbook upgrades.
   - No consumables.

4. The new scoring is layered after the classic contest sim.
   - This made the prototype easy to build.
   - It may create conceptual mismatch: did the player win the contest, or did they beat the engine target?

5. The current lineup builder is still DFS-table-heavy.
   - It is functional, but a true card rogue may need more tactile cards, pack choices, rerolls, and animated trigger reveals.

6. Some concepts may be too DFS-native for casual players.
   - Ownership, leverage, bring-backs, and salary punts need careful UI language.

7. The classic game and rogue mode now coexist.
   - This is intentional, but the product may eventually need a clearer identity: Classic / Rogue, or one primary mode.

## Suggested Review Questions

Please review the project with these questions in mind:

1. Is `Base Fantasy Points x Edge` the right core scoring model?
2. Are lineup patterns a strong enough replacement for poker hands?
3. Which patterns are intuitive, and which are too DFS-insider?
4. Does the prototype create a "build engine" feeling, or just a post-hoc bonus screen?
5. Should Base Points come from full simulation, displayed projections, or a more deterministic card score?
6. Should rogue mode use the full slate pool, or should it move toward a limited draw/bench/deck system?
7. How should boss slates work mechanically?
8. What should the first shop/reward loop contain?
9. Which coordinator effects are most promising?
10. How should the scoring values be tuned to preserve excitement without making every good stack absurd?
11. What should be cut or simplified before adding more systems?
12. Is the current UI readable enough for a first playable prototype?

## Recommended Next Build Slices

### Slice 1: Tune Rogue Scoring

Add a lightweight harness for rogue scoring:

- Generate representative lineups.
- Score them through `scoreRogueLineup`.
- Report engine score distribution.
- Check max/min/median scores.
- Test common patterns separately.

Target:
- Thin/no-synergy lineups should usually miss the boss target.
- One good pattern should feel playable.
- Two or three synergistic patterns should feel strong.
- Extreme stacks should be exciting but not automatic unless the player paid meaningful costs.

### Slice 2: Add Rogue Run State

Add a separate `RogueRunState` rather than overloading classic `RunState`.

Possible fields:

```ts
interface RogueRunState {
  isActive: boolean;
  runNumber: number;
  week: number;
  ante: number;
  bankroll: number;
  shopCurrency: number;
  bossTarget: number;
  coordinatorSlots: number;
  coordinators: RogueCoordinatorKey[];
  playbookLevels: Record<RoguePatternKey, number>;
  consumables: string[];
  completedContests: number;
}
```

### Slice 3: Add Shop / Rewards

After a rogue contest:

- Offer 3 coordinator choices, pick 1.
- Offer one playbook upgrade.
- Let player reroll for a cost.
- Add a simple shop currency.

This would make the experience actually roguelike rather than just a single slate with bonuses.

### Slice 4: Add Boss Slates

Start with 5 boss rules:

- Chalk Trap: high-owned players contribute less Edge.
- Salary Crunch: cap reduced.
- No Bring-Backs: bring-back pattern disabled.
- Wind Tunnel: boom-bust WR ceiling suppressed.
- Optimizer Boss: projection/floor rewarded, volatility punished.

### Slice 5: Improve Presentation

The Rogue Results ledger is useful, but the game needs more "trigger joy":

- Trigger sequencing.
- Stronger visual differentiation for flat Edge vs X Edge.
- Coordinator slots that feel like build-defining objects.
- More card-like player presentation in rogue mode.

## What Not To Do Yet

- Do not add 100 coordinators.
- Do not add real NFL data.
- Do not add real-money mechanics.
- Do not remove the classic app until the rogue mode proves itself.
- Do not copy Balatro names, art, UI, exact card text, or trade dress.
- Do not build a huge shop/deck system before tuning the scoring loop.

## Current Best Feedback Request

If another model only has time for one pass, ask it:

> Review the current DFS card-rogue concept and first prototype. Focus on whether the core loop can become sticky, whether `Base Points x Edge` is the right scoring foundation, how to tune or replace the current lineup pattern system, and what the next 2-3 implementation slices should be. Be critical about what to cut, not just what to add.

