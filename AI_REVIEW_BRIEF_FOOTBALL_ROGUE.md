# Slate Boss / Football Rogue Review Brief

Use this file as a self-contained context packet for another model, designer, reviewer, or engineer. It summarizes the current project state, the newest Football Rogue prototype, what changed from the earlier DFS-style rogue experiment, what to critique, and what should probably be built next.

## TL;DR

Slate Boss began as a fictional, no-real-money daily fantasy football lineup strategy game. The classic app still exists: generate a fictional slate, build an 8-player salary-cap lineup, enter a contest, watch a simulated sweat, and review results.

The current best direction is **Football Rogue**, a football-native card deckbuilder prototype. Instead of making DFS lineups and adding a post-hoc Edge multiplier, the new mode treats each card as a football action:

```text
Deep Ball
Quick Pass
Power Run
Deep Catch
Interception
Return TD
Field Goal
```

Each turn/quarter, the player selects up to 4 action cards from an 8-card hand to "call a play." The play scores deterministically:

```text
Play Score = Base x Mult
```

The strategic fun comes from assembling recognizable football concepts:

- QB + same-team receiver = QB Stack
- QB + multiple receivers = Double-Stack Bomb
- QB stack + opponent receiver = Shootout Stack / Bring-Back
- Multiple run cards = Ground & Pound
- Defensive cards = Takeaway / Pick Six
- Kicking cards = safe points

The biggest review question:

> Is "assemble a football play from cards and watch Base x Mult fire" a strong enough core loop to become a sticky roguelike?

## Live App

Playable public link:
- https://dmbrown81.github.io/slate-boss/

What to click:
- Home screen -> **Play Football Rogue**

Repository:
- https://github.com/dmbrown81/slate-boss

Current deployed commit:
- `e4ae43c` - `Add Football Rogue: football-native card deckbuilder prototype`

Important branches/refs:
- `main`: currently deployed, includes Football Rogue.
- `football-card-rogue`: branch where Claude Code added the Football Rogue prototype; currently same commit as `main`.
- `codex/dfs-card-rogue`: earlier DFS-lineup-plus-Edge prototype branch.
- `archive/classic-dfs-sim`: preserved classic DFS sim baseline.
- `classic-dfs-sim-2026-06-17`: tag for the classic baseline.

Useful commands:

```bash
npm install
npm run dev -- --host 127.0.0.1
npm run lint
npm run build
npm run balance
```

Latest validation:
- `npm run lint` passes.
- `npm run build` passes.
- GitHub Pages deployment completed successfully.
- Browser smoke test passed on the live Pages app.
- Local smoke test passed: opened Football Rogue, selected QB/receiver cards, previewed a Double-Stack Bomb, ran the play, advanced to Q2.
- Browser console showed no errors.
- Mobile-width overflow check passed at 390x844.

## Product Background

### Classic Slate Boss

The original app is a fictional DFS-style game:

1. Generate a football slate.
2. Build an 8-player lineup under a $50,000 salary cap.
3. Enter a contest.
4. Simulate player scores and opponent fields.
5. Watch a quarter-by-quarter sweat.
6. Review rank, payout, Build Quality, Game Luck, best/worst plays, and lessons.
7. Continue daily play or career mode.

Classic systems already in the repo:

- Fictional teams and players.
- Positions: QB, RB, WR, TE, DST.
- Roster slots: QB, RB1, RB2, WR1, WR2, TE, FLEX, DST.
- Player projections, salary, floor, ceiling, volatility, ownership, form, recent games, and archetypes.
- Slate modifiers such as Windy Week, Shootout Slate, Grind-It-Out, Primetime Chaos, and Sloppy Conditions.
- Contest types: Safe 50/50, Starter Tournament, Big Tournament, Winner Take All.
- Opponent lineup archetypes: safe chalk, balanced, QB combo, contrarian, stars-and-scrubs, casual, sharp.
- Career mode with bankroll, tiers, boons, achievements, and run history.
- A balance harness for comparing lineup archetypes.

### Earlier DFS Rogue Prototype

Before Football Rogue, the experimental branch added a DFS-card-rogue prototype:

```text
Rogue Engine Score = Base Fantasy Points x Edge Multiplier
```

It reused the lineup builder and contest simulation, then added bonuses for DFS lineup patterns:

- Single Stack
- Double Stack
- Bring-Back
- Game Stack
- Chalk Core
- Leverage Core
- Stars and Scrubs
- Bellcow Build
- Punt Value
- Fragile Ceiling

That version proved that lineup patterns could trigger a readable scoring ledger, but it still felt close to "DFS optimizer plus bonus screen." Football Rogue is the stronger current bet because it turns the moment-to-moment action into a card game.

## Current Football Rogue Prototype

Implemented files:

- `src/lib/footballRogue.ts`
- `src/components/FootballRogueScreen.tsx`
- `src/App.tsx`
- `src/components/HomeScreen.tsx`
- `src/types/index.ts`

Mode entry:

- Home screen -> `Play Football Rogue`

Current match loop:

1. Start a match.
2. The game creates a starter deck.
3. Draw an 8-card hand.
4. A match environment is chosen: Clear, Dome, Snow, Wind, or Primetime.
5. The player selects up to 4 cards to call a play.
6. A live preview shows the play name, flavor, Base x Mult, and scoring tags.
7. The player can Run Play or Audible selected cards away.
8. Running a play scores points, discards selected cards, draws back up, and advances the quarter.
9. Win by clearing the target within 4 quarters.
10. Lose if the target is not cleared by the end of Q4.

Current constants:

```ts
HAND_SIZE = 8
QUARTERS = 4
AUDIBLES = 2
DEFAULT_TARGET = 700
MAX_PLAY_CARDS = 4
```

Primetime environment raises the target by 25%.

## Core Design Change

The important pivot:

```text
Old experiment:
DFS lineup -> contest sim -> Edge bonus ledger

New experiment:
Football action cards -> assemble play -> deterministic Base x Mult score
```

Why this seems better:

- It is easier for kids and casual players to understand.
- The player makes multiple tactical choices per match, not one lineup decision.
- Variance comes from the draw, which feels more card-game-like.
- Football concepts become immediate card combos.
- The scoring preview teaches the game before the player commits.
- It creates a natural path toward shops, decks, bosses, coordinators, and seasons.

## Card Model

Implemented in `src/lib/footballRogue.ts`.

A card is a football action generated from an existing fictional player template.

```ts
interface FbCard {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
  action: FbActionType;
  label: string;
  side: 'pass' | 'run' | 'catch' | 'kick' | 'defense';
  value: number;
}
```

Current action types:

- `deep_pass`
- `short_pass`
- `scramble`
- `qb_sneak`
- `power_run`
- `breakaway_run`
- `deep_catch`
- `short_catch`
- `checkdown_catch`
- `field_goal`
- `extra_point`
- `sack`
- `interception`
- `return_td`

Cards are weighted by player archetype. For example:

- Pocket QBs create more pass cards.
- Rushing QBs create scramble / sneak cards.
- Workhorse RBs create power run and breakaway cards.
- Alpha WRs create strong catch cards.
- Boom-bust WRs create high-value deep catch cards.
- Strong DSTs create sack and interception cards.
- Risky DSTs can create return TD cards.

## Starter Deck

Current starter deck:

- Ironhawks offense and defense.
- A few Blazers WR/TE cards for bring-back potential.
- Ironhawks kicker cards.

This is intentionally minimal. The next product question is whether teams become starting decks, and whether the player unlocks/builds around different team identities.

Possible future team/deck identities:

- Air Raid deck: more QB/WR pass combos.
- Ground Game deck: RB-heavy, safer scoring, fewer explosive combos.
- Chaos Defense deck: defensive spikes and turnovers.
- Balanced Pro deck: easier for beginners, less explosive ceiling.
- Underdog Shootout deck: more bring-back / opponent cards.

## Current Play Scoring

Implemented in:

- `scoreFootballPlay(cards, opts)`

A play begins with:

```text
base = sum(selected card values)
mult = 1
```

Then synergies modify the multiplier or base.

Current play types:

| Play Type | Recognition |
| --- | --- |
| Stack TD | QB pass card + one same-team catch card |
| Double-Stack Bomb | QB pass card + two or more same-team catch cards |
| Shootout Stack | QB stack + opponent catch card |
| Checkdown | Pass/checkdown-only short play |
| Ground & Pound | Two or more run cards |
| Designed Run | One run card |
| QB Keeper | QB run card without pass/catch cards |
| Field Goal / Extra Point | Only kicking cards |
| Sack / Takeaway / Pick Six | Defense cards |
| Busted Play | Mismatched cards |

Current notable multipliers:

- Single QB stack: `+0.6 mult`
- Double Stack: `+1.2 mult`
- Deep shot: `+0.3 mult`
- Bring-back: `+0.4 mult`
- Ground & Pound: `+0.4 mult`
- Pick Six: `+0.6 mult`
- Takeaway: `+0.25 mult`
- Air Raid Coordinator on pass stack: `+0.5 mult`
- Busted Play: forced to `0.5 mult`

This is all tunable.

## Environments

Environment is chosen per match:

| Environment | Current Effect |
| --- | --- |
| Clear | No effect |
| Dome | Passing plays score +15% base |
| Snow | Passing -20% base, run plays +20% base |
| Wind | Deep passing plays lose multiplier |
| Primetime | Every play +0.2 mult, but target is higher |

This is a promising system because it gives each match a strategic prompt before boss schemes exist.

## Coordinator System

Currently only one coordinator exists:

- **Air Raid Coordinator**: QB stack plays get an extra multiplier.

This should become the main persistent roguelike item system.

Potential coordinator directions:

- West Coast: short pass and checkdown plays gain mult.
- Ground Control: run plays gain base, pass plays lose ceiling.
- Blitz Lab: defensive cards retrigger or add mult.
- Special Teams Unit: field goals and returns become viable.
- Two-Minute Drill: Q4 plays gain mult if behind target.
- Play-Action: run card plus pass card creates a hybrid synergy.
- Red Zone Sheet: TE/RB plays gain mult after a field goal or long drive.

## UI / UX Notes

Current Football Rogue screen includes:

- Header with Home and New buttons.
- Scoreboard with current score, target, progress bar, quarter, audibles, deck count.
- Environment card.
- Live play preview.
- 8-card hand grid.
- Card colors by side: pass, catch, run, kick, defense.
- Run Play and Audible buttons.
- Last play summary.
- Win/loss panel.

What works well:

- The live preview is the strongest teaching tool.
- Cards are more tactile than the DFS table.
- Score/target is simpler than contest rank/payout.
- "Double-Stack Bomb" immediately communicates a fun football thing.

Likely UX gaps:

- New players may not know why a selected combo is good.
- The first screen still contains multiple modes; kids may need "Play Football Rogue" to be more prominent.
- The card grid is compact; more visual football-card styling may help.
- There is no tutorial or guided first play.
- There is no deck/discard view yet.

## Known Risks

1. Balance may be swingy.
   - Sanity check showed: Field Goal 55, Single Stack 319, Double-Stack Bomb 603, Shootout 618, Ground & Pound 134 against a 700 target.
   - A single Double-Stack Bomb can nearly win the match.
   - That may be fun once, but may make the target too easy if consistent.

2. Draw RNG may dominate too much.
   - Scoring is deterministic, which is good.
   - But if the player does not draw QB/catch cards together, they may feel stuck.
   - Audibles help, but deck composition needs tuning.

3. Busted Play rules may be unclear.
   - Random mixed cards become half value.
   - The UI should explain why a play is busted and what would fix it.

4. Defense/kicking may be underdeveloped.
   - Defensive plays are cool but isolated.
   - Kicking is safe but may be boring unless it ties into strategy.

5. No roguelike run shell yet.
   - There is only a single-match prototype.
   - No shop, no rewards, no deck upgrades, no boss schemes, no season structure.

6. Classic DFS mode and Football Rogue coexist.
   - That is useful for preserving old work, but the product identity may become muddy.
   - For kid testing, Football Rogue should probably be the main thing to test.

## What To Review

Ask another model or reviewer to focus on:

1. Is the Football Rogue core loop more promising than the DFS-lineup Edge prototype?
2. Does selecting up to 4 football-action cards feel like a good "play call" mechanic?
3. Is deterministic Base x Mult the right scoring model?
4. Are the current play synergies intuitive?
5. Which synergies should be cut, renamed, or expanded?
6. Is 4 quarters / 8-card hand / 2 audibles / 700 target a good first balance shape?
7. How should the game prevent one Double-Stack Bomb from trivializing a match?
8. Should the player be required to select exactly 1-4 cards, or should play types have stricter rules?
9. Should teams be starting decks?
10. What should the first shop/reward loop look like?
11. What boss defensive schemes would create interesting adaptation?
12. What should kids be asked after playtesting?

## Suggested Kid Playtest Script

Give kids the live link:

- https://dmbrown81.github.io/slate-boss/

Ask them to click:

- **Play Football Rogue**

Then ask:

1. What did you think you were supposed to do?
2. Which card did you want to tap first?
3. Did the score preview make sense?
4. Did "Double-Stack Bomb" or other play names feel cool?
5. Did you understand why some plays scored more?
6. Did you feel like you lost because of your choices or because of the cards you drew?
7. Would you play another match?
8. What card or play would you want to add?
9. Was anything confusing or boring?

Watch for:

- Whether they discover QB + WR/TE stacks naturally.
- Whether they understand Run Play vs Audible.
- Whether they notice the environment modifier.
- Whether they care about the target and quarter limit.
- Whether they want another match immediately.

## Recommended Next Build Slices

### Slice 1: Balance Harness

Add a small script that simulates basic policies:

- Random legal-ish selection.
- Always take best preview.
- Prefer QB stack.
- Prefer run plays.
- Use audibles when no valid synergy exists.

Report:

- Win rate.
- Average score.
- Average number of busted plays.
- Average Q when match ends.
- Which synergies carry too much value.

Goal:

- A beginner who understands QB + catch should win sometimes.
- A player who uses preview well should win more often.
- One big play should feel great but not guarantee victory.

### Slice 2: Guided First Match

Add lightweight instruction inside Football Rogue:

- "Try QB + Catch."
- Highlight a possible stack if one exists.
- Explain "Base x Mult" after first selection.
- Explain Audible only when player has selected cards.

Avoid a long tutorial. Keep it contextual.

### Slice 3: Basic Reward Choice

After a win, offer one of three upgrades:

- Add a card.
- Upgrade a card.
- Remove a weak card.
- Add a coordinator.

This turns the mode from a match prototype into a roguelike seed.

### Slice 4: Boss Schemes

Add defensive scheme modifiers:

- No Fly Zone: deep pass/catch cards lose mult.
- Stacked Box: run cards lose base unless paired with play-action.
- Ball Hawk: pass plays need a QB and catch card or get penalized.
- Clock Drain: fewer quarters or higher target.
- Bend Don't Break: field goals score more, touchdowns score less.

### Slice 5: Teams As Decks

Let the player choose a starting team/deck:

- Ironhawks: balanced starter.
- Blazers: explosive passing.
- Stormers: possession and floor.
- Volts: rushing QB chaos.
- Ravens: TE / red-zone build.

This gives identity and replayability.

## What Not To Do Yet

- Do not add real NFL data.
- Do not add real-money mechanics.
- Do not add a huge catalog of cards before the play loop is tuned.
- Do not bury Football Rogue under the old DFS modes during playtesting.
- Do not build a complex map before the reward loop exists.
- Do not over-explain with paragraphs in the UI.
- Do not copy Balatro names, card text, art, UI, sound, or trade dress.

## Strongest Current Opinion

Football Rogue is probably the right direction. The earlier DFS Edge prototype was clever, but it still asked players to care about lineup theory before they felt the card game. Football Rogue makes the card action immediate:

```text
I have a QB.
I have his receiver.
I tap both.
The game says Stack TD.
The score jumps.
I get it.
```

That is much closer to the sticky, replayable core the project needs.

The next step should not be a large feature expansion. It should be:

1. Tune the current play scoring.
2. Add a tiny guided first match.
3. Add one post-win reward choice.

If those three things make kids ask to play again, then build the season/shop/boss shell.

## Best Prompt For Another Model

Use this prompt with the file:

```text
Review this Football Rogue prototype brief. Be critical. I want to know whether this is a stronger direction than the original DFS lineup sim, whether the core "select football action cards to call a play, score Base x Mult" loop can become sticky, and what the next 2-3 build slices should be. Focus on what to simplify, tune, or cut before suggesting lots of new features.
```

