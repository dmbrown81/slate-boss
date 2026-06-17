# DFS Card Rogue Direction

## Repository Strategy

The current playable DFS lineup sim is preserved as the classic baseline.

- `main` / `origin/main`: Slate Boss Classic, the existing daily/career DFS lineup sim.
- `archive/classic-dfs-sim`: GitHub archive branch pointing at the classic baseline as of June 17, 2026.
- `classic-dfs-sim-2026-06-17`: GitHub tag pointing at the same baseline commit.
- `codex/dfs-card-rogue`: experimental branch for the card-roguelike pivot.

Do not rewrite or remove the classic loop while building the rogue mode. Treat it as a playable foundation and a source of useful systems: slate generation, player cards, salary cap, contest simulation, opponent archetypes, grades, and career persistence.

## North Star

Build a single-player DFS-inspired card roguelike where the player is not just picking a lineup. They are building a repeatable lineup engine.

The target feeling:

> "My cheap backup RB opened salary, my QB double-stack triggered the Air Raid coordinator, my bring-back activated the shootout bonus, and my low-owned TE became the leverage spike that beat the boss slate."

This should feel inspired by card-roguelike engine builders, but the content, terminology, UI, and tuning should be original to Slate Boss.

## Core Translation

| Card Rogue Concept | DFS Rogue Equivalent |
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

## Core Loop

1. Start a rogue run with a front-office identity.
2. Enter a week/ante with two optional contests and one boss slate.
3. Build a lineup under salary cap from available player cards.
4. Resolve score with a transparent `Base Points x Edge` ledger.
5. Earn bankroll, hype, XP, packs, or shop currency.
6. Visit the waiver wire / film room shop.
7. Buy coordinators, consumables, playbook upgrades, player packs, cuts, copies, or upgrades.
8. Repeat until the championship boss slate is cleared or the run busts.

The current career mode can become the entry point for this loop. The daily slate can remain the simpler classic mode.

## Scoring Model

Use a visible two-part scoring model:

```text
final_score = base_fantasy_points x edge_multiplier
```

Base fantasy points should come from existing projections/simulation. Edge should come from deliberate lineup construction and rogue items.

Example score ledger:

```text
Base fantasy points: 126.8
Single Stack: +0.20 Edge
Bring-Back: +0.15 Edge
Low-Owned Ceiling WR: x1.35 Edge
Air Raid Coordinator: stack bonus triggers again
Final: 126.8 x 1.82 = 230.8
```

Important design rule: the scoring reveal should teach the player what happened. The player should be able to tell why a lineup popped off or failed.

## Lineup Patterns

These are the DFS equivalent of poker hands. Start with a small set and make them obvious.

| Pattern | Recognition Rule | Strategic Meaning |
| --- | --- | --- |
| Single Stack | QB plus one same-team WR/TE | Basic correlation |
| Double Stack | QB plus two same-team WR/TE | Higher ceiling, more commitment |
| Bring-Back | Stack plus opponent RB/WR/TE | Shootout correlation |
| Game Stack | Four players from one game | Massive ceiling, fragile |
| Chalk Core | High average ownership and projection | Safe floor, lower tournament edge |
| Leverage Core | Low ownership with enough ceiling | Tournament passing power |
| Stars and Scrubs | Two or more expensive studs plus cheap punts | Salary-risk engine |
| Bellcow Build | Multiple high-usage RBs | Floor and touchdown equity |
| Punt Value | Cheap player beating value threshold | Salary unlock |
| Fragile Ceiling | High volatility and high ceiling | Big score path, low floor |

Playbook upgrades can level these patterns. Coordinators can reward or mutate them.

## Item Types

### Player Cards

Player cards already exist in the app. Rogue mode should add run-facing metadata rather than replacing the current model:

- tags: `chalk`, `leverage`, `value`, `punt`, `bellcow`, `deep_threat`, `slot`, `red_zone`, `fragile`, `safe`
- salary tier: punt, value, mid, premium
- ownership band: low, mid, chalk
- card modifiers: hot, cold, boosted, risky, protected, duplicated

### Coordinators

Persistent build-defining items. These are the closest equivalent to Jokers, but should use Slate Boss language.

Examples:

- Air Raid: QB stacks add flat Edge.
- Leverage Desk: low-owned ceiling players multiply Edge.
- Salary Wizard: punt values add Base Points.
- Beat Reporter: reveals one hidden injury/news risk before lock.
- Bring-Back Theory: bring-back bonuses are stronger.
- Dome Model: shootout-game players gain Edge.
- Red Zone Sheet: TE/RB touchdown archetypes add flat Edge.
- Late Swap Pass: once per run, replace a scratched player.

Default slot target: five coordinators/tools.

### Playbook Upgrades

Permanent upgrades to specific lineup patterns during a run.

Examples:

- Single Stack Level +1: more flat Edge.
- Double Stack Level +1: more Base Points and Edge.
- Bring-Back Level +1: higher ceiling multiplier.
- Punt Value Level +1: cheap players add more Base Points.

### Film / News Consumables

One-time effects.

Examples:

- Film Room: upgrade one player card's floor.
- Waiver Claim: add a random value player card.
- Injury Report: reveal and remove one risky player from the pool.
- Ownership Pivot: convert one chalk player into a lower-owned leverage play with more volatility.
- Salary Rework: reduce one card's salary for the next slate.
- Chalk Fade: gain money if no lineup player exceeds a high ownership threshold.

### Chaos Cards

High-upside effects with meaningful costs.

Examples:

- Smash Button: create a rare coordinator; lose all current bankroll above the entry minimum.
- All-In News: upgrade one player to massive ceiling; mark them fragile.
- Duplicate Stud: copy a premium player card; reduce hand/bench size.
- Strip the Board: remove several low-projection players; lose one shop slot next week.

### Front-Office Upgrades

Permanent run upgrades.

Examples:

- Extra Shop Slot
- Cheaper Rerolls
- More Coordinator Slot
- Bigger Bench
- More Film Consumable Slots
- More Player Pack Choices
- Boss Reroll

## Boss Slate Ideas

Boss slates should attack narrow builds and force adaptation.

| Boss Slate | Effect |
| --- | --- |
| Chalk Trap | High-owned players lose Edge value. |
| Salary Crunch | Salary cap is reduced. |
| Wind Tunnel | Deep-threat WR ceiling is reduced. |
| Late News Chaos | One questionable player may be scratched after lineup construction. |
| Field Copies You | The most common pattern in your lineup is weakened. |
| Primetime Fog | Projections are partially hidden. |
| No Bring-Backs | Opponent bring-back bonuses are disabled. |
| Injured Line | Same-team stacks carry extra volatility. |
| Defensive Slugfest | Game stacks need extra Base Points to pay off. |
| Optimizer Boss | Median projection is rewarded; fragile plays are punished. |

## MVP Scope

Build the smallest version that can produce a "this build is nasty" moment.

Phase 1: Rogue scoring foundation

- Add a `rogueScoring` module that detects lineup patterns.
- Return a score ledger with Base Points, additive Edge, multiplicative Edge, and triggered effects.
- Add a small coordinator database with 12-20 items.
- Add tests or a harness for pattern detection and scoring.

Phase 2: Rogue run shell

- Add a Rogue Run entry path separate from classic daily play.
- Store rogue run state without breaking current `UserProfile`.
- Add coordinator slots, shop currency, week/ante progress, and boss slate metadata.

Phase 3: Shop and rewards

- Add waiver/film room shop after contests.
- Add rerolls, purchases, and one-time consumables.
- Add playbook upgrades for a few core lineup patterns.

Phase 4: Boss slates

- Add 5 boss slate rules.
- Show the boss rule before lineup lock.
- Pipe boss effects through scoring and/or player modifiers.

Phase 5: Presentation pass

- Add a scoring reveal that shows `Base Points x Edge`.
- Make coordinator triggers animate or display in a clear ledger.
- Keep the UI focused on playing the run, not explaining the run in walls of text.

## Non-Goals

- Do not use real NFL players or real-money mechanics.
- Do not copy Balatro names, art direction, card text, UI, audio, or trade dress.
- Do not remove the classic DFS game from `main`.
- Do not start with 100+ items. Prove the loop with a small, tunable item set.
- Do not hide the scoring math. The fun comes from seeing the engine work.

## Open Design Questions

- Should each slate offer the full generated player pool, or should rogue mode use a limited draw/bench system?
- Should the first rogue prototype score deterministically from projections, or keep the current simulation sweat?
- Should bankroll remain the fail state, or should boss target scores become the main fail state?
- Should coordinators be reorderable so flat Edge can resolve before multiplicative Edge?
- Does the brand stay `Slate Boss`, or does rogue mode need a subtitle?

