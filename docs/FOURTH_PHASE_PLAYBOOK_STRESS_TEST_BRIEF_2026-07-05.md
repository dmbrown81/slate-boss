# Fourth Phase Playbook Stress-Test Brief - July 5, 2026

Use this file as a portable brief for other AI models, reviewers, or designers. The goal is to stress-test a major direction change for Fourth Phase: shifting the card/deck fantasy from abstract "football-flavored ranks" into familiar offensive and defensive playbooks, formations, calls, and results.

## One-Sentence Ask

Fourth Phase is already a playable local-first football card roguelike. The next big idea is to make the cards feel like actual play calls and the decks feel like real football playbooks, so players can explore familiar offensive and defensive identities, sequence calls, and discover football-like combinations.

## Current Game State

- Product: Fourth Phase, a fictional single-player football card roguelike.
- Repo: `/Users/dominicbrown/Desktop/slate-boss`
- Public URL: `https://dmbrown81.github.io/slate-boss/`
- Stack: Vite, React, TypeScript, Capacitor/PWA.
- Active entry: `src/App.tsx` renders `src/components/fourthPhase/FourthPhaseLab.tsx`.
- Core logic: `src/lib/fourthPhase/*`.
- Current `main` head at time of this brief: `95baef1 Derive career progress in render instead of setState-in-effect`.
- The old Callsmith/Gridiron game remains in the repo but is not wired into the active app.

Recent shipped flow:

- Title screen with Play, Daily Challenge, Continue Run, career stats, and How to Play.
- Team select screen that currently works like a deck-select screen.
- Six fictional team/deck identities:
  - Ironwood Engineers / Balanced
  - Canyon Comets / Air Raid
  - Foundry Maulers / Smashmouth
  - Harbor Bruisers / Black & Blue
  - Summit Stampede / Loud House
  - River City Sparks / Special Teams Chaos
- Per-team stake ladder:
  - Rookie
  - Pro
  - All-Pro
  - Legend
- Drive intro screen before each drive.
- Main play screen with hand, call sheet, preview math, last-series ledger, jokers, and guide panels.
- War Room between drives with up to 2 buys, rerolls, joker offers, and Practice Drill offers.
- Dedicated win/loss summary screen with unlock banners and run-code sharing.
- Local progress/unlocks via localStorage keys:
  - `fourth_phase_history_v1`
  - `fourth_phase_daily_v1`
  - `fourth_phase_progress_v1`
  - `fp-tutorial-done`

## Current Core Loop

- A run has 3 drives.
- Each drive has a target score and a max number of calls.
- Hand size is 8.
- Player selects up to 5 cards and orders them left-to-right.
- Order matters. The current central lesson is: Crowd builds Momentum, Offense cashes it.
- The preview and the executed play use the same scoring path.
- Boss pressure appears on the final drive at Rookie/Pro, and earlier on higher stakes.
- After each cleared drive, the War Room lets the player improve their build.

Current scoring contract must stay intact:

```text
points = Yards x (1 + Execution) x BigPlay
```

The game should remain deterministic:

- No hidden rolls in scoring.
- No `Math.random` in gameplay paths that need replayability.
- Variance comes from seeded run state, draw order, draft choices, and player decisions.
- Use seeded RNG helpers from `src/lib/rng.ts`.

## Current Card System

Current cards have four phases:

- Offense: base Yards / payload / cashes Momentum.
- Defense: Execution / leverage / short-field floor.
- Special Teams: draw, money, discounts, hidden-yard economy.
- Crowd: charges Momentum.

Current card examples from `src/lib/fourthPhase/deck.ts`:

- Offense: `QB Sneak`, `RPO Keep`, `Shot Play`, `Play Action`, `Feature Back`
- Defense: `Run Fit`, `Robber Drop`, `Zero Blitz`, `Strip Sack`, `Ball Hawk`
- Special Teams: `Pooch Kick`, `Coffin Corner`, `Fake Punt`, `Pin Deep`, `Hidden Yards`
- Crowd: `Student Section`, `Whiteout`, `Third-Down Roar`, `Hostile Environment`, `Home Field`

Problem: many names are football-flavored, but the names do not yet enforce football meaning. For example, `Play Action` does not care whether a run concept came before it. `Shot Play` does not care whether a takeaway created a short field. The cards are legible as game pieces, but not yet as satisfying football calls.

Current recognizer in `src/lib/fourthPhase/situations.ts` mostly reads phase counts:

- `checkdown`: 1-2 Offense only
- `drive`: 3+ Offense
- `stand`: 3+ Defense
- `fieldFlip`: 2+ Special Teams
- `blackout`: 3+ Crowd
- `houseCall`: Offense + Crowd
- `pickSix`: 2+ Defense + 1+ Offense
- `momentumShift`: 2+ Offense + 2+ Defense
- `complementaryFootball`: all four phases
- `bustedPlay`: no clean shape

This works mechanically, but it is still abstract. The proposed direction is to keep the readable math while making the cards and situations speak real football language.

## The New Direction To Stress-Test

The owner believes the game will become much more exciting if players can choose familiar football playbook identities and then call sequences of actual formations, plays, defensive calls, and results.

Working assumption for the stress test:

- Generic football vocabulary is design vocabulary.
- Football play calls, formations, and scheme concepts are functional game/system language rather than protected expressive content.
- The game should sound familiar and exciting to football players and sim fans.
- Do not use real team names, real player names, real coaches, licensed league IP, copied UI, copied descriptions, or copied proprietary presentation.
- Do use familiar terms like Spread, Air Raid, Flexbone, Pro Style, Multiple, RPO, Mesh, Four Verts, Inside Zone, Counter, Play Action, Cover 2, Cover 3, Quarters, 4-2-5, 3-3-5, Zone Blitz, Man Pressure, and Bend-Don't-Break.

Reference signal:

- Sites like `https://cfb.fan/playbooks/` show that players enjoy browsing playbooks by offensive/defensive identity, formation depth, and available plays.
- The important lesson is not to copy their content. The important product insight is that playbook choice is already a familiar metagame for football sim players.

## Product Bet

The current game feels like "Balatro with football paint" in some places. The playbook direction could make it feel like "a football play-calling roguelike with Balatro bones."

The fun should be:

- Pick an offensive playbook identity.
- Pick or unlock a defensive package identity.
- Draw a hand of football calls/results.
- Build a 3-5 card script.
- Discover sequencing bonuses that feel like football:
  - Run sets up Play Action.
  - Takeaway creates a Short Field shot.
  - Same formation builds a scripted series.
  - Spread stretches the defense before a draw/RPO.
  - Flexbone punishes with repeated option stress but struggles when behind.
  - Air Raid explodes with Mesh/Four Verts/Y-Cross but has a thinner floor.
  - Bend-Don't-Break defense creates safe leverage but fewer explosives.
  - Pressure defense creates sacks/takeaways but can bust against screens.

The desired player reaction:

```text
I know what this is. I want to try Spread with 3-3-5 pressure.
What if I draft more play-action and pair it with a power run book?
Can I build a Short Field bomber deck?
Can Flexbone survive Legend Stake?
```

## Candidate Offensive Playbooks

These should be fictional decks using familiar scheme language. Names below are placeholders and should be tuned for clarity and fun.

### Balanced / Pro Style

Fantasy: every answer is available, but no single lane is automatic.

Likely formations/concepts:

- I-Form
- Singleback
- Pistol
- Gun Doubles
- Inside Zone
- Duo
- Power
- Stick
- Mesh
- Flood
- Play Action Boot
- Deep Cross

Gameplay identity:

- Best tutorial/default playbook.
- Rewards all-phase variety and clean sequencing.
- Medium floor, medium ceiling.

### Spread

Fantasy: spacing, tempo, RPOs, and formation stress.

Likely formations/concepts:

- Gun Trips
- Gun Bunch
- Empty
- Slot Motion
- Inside Zone Read
- Bubble RPO
- Stick RPO
- Mesh
- Four Verts
- QB Draw
- Tempo

Gameplay identity:

- More Offense/Crowd synergy.
- More `space`, `tempo`, `rpo`, `shot`, and `quickGame` tags.
- Vulnerable to pressure/coverage disguises if repeated.

### Air Raid

Fantasy: throw to grass, stress zones, win with concepts.

Likely formations/concepts:

- Gun Trips
- Empty
- Mesh
- Y-Cross
- Shallow Cross
- Stick
- Sail
- Four Verts
- Tunnel Screen
- Choice Route

Gameplay identity:

- Big cash-in ceiling.
- Lots of pass/shot/space concepts.
- Thin run-game floor and weaker all-phase flexibility.

### Power / Smashmouth

Fantasy: body blows, run game, play action, high floor.

Likely formations/concepts:

- I-Form
- Ace
- Heavy
- Duo
- Power O
- Counter
- Toss Crack
- Inside Zone
- Play Action Shot
- Boot Flood

Gameplay identity:

- Reliable scoring and leverage.
- Run before Play Action becomes a primary combo.
- Lower raw explosive ceiling unless it drafts the right shot cards.

### Flexbone / Option

Fantasy: option math, constraint plays, unusual sequencing.

Likely formations/concepts:

- Flexbone
- Wingbone
- Veer
- Triple Option
- Midline
- Rocket Toss
- QB Follow
- Counter Option
- Play Action Switch
- Wheel Route

Gameplay identity:

- Very distinct.
- Rewards repeated formation/same-family pressure more than other decks.
- Could have great low-card efficiency but struggle with obvious passing situations or No-Fly/Prevent-style bosses.

### Multiple

Fantasy: formation variety and answer cards.

Likely formations/concepts:

- Pistol
- Gun Bunch
- Ace
- Wildcat-style direct snap without using licensed names
- Motion
- Counter
- RPO
- Flood
- Screen
- Shot

Gameplay identity:

- Best at adapting to bosses.
- More complex to pilot.
- Rewards tags like `motion`, `formationChange`, `constraint`, and `answer`.

## Candidate Defensive Packages

Eventually, the player could choose an offensive playbook plus a defensive package. For first-run simplicity, defense package selection may be locked or defaulted until after the first win.

### 4-2-5 Pressure

- More blitz/pressure/takeaway cards.
- Higher explosive defense results.
- Higher bust risk or vulnerability to screens/RPO.

### 3-3-5 Stack

- More disguise, simulated pressure, and chaos.
- Better against Spread/Air Raid-style bosses.
- Can create strong `confusion` or `coverageShell` tags.

### 4-3 Multiple

- Balanced defensive floor.
- Good run fits, coverage, and moderate pressure.
- Best default defense package.

### 3-4 Zone Pressure

- Edge pressure and flexible coverage.
- Rewards sequencing pressure before a shot or field-flip.

### Quarters Shell

- Prevents explosives and raises floor.
- Less immediate takeaway upside.
- Strong boss answer against big-play pressure.

### Bend-Don't-Break

- Lower ceiling, high consistency.
- Reduces bust/bleed and protects late drives.

## Crowd / Venue Direction

Crowd can stay mostly as-is for now, but a later version could make Crowd feel like a venue package:

- Dome
- Cold Weather
- Rain Game
- Altitude
- Small Loud Stadium
- Huge Rivalry Crowd
- Neutral Site

This should not be first. Offensive and defensive playbooks are the bigger identity unlock.

## Proposed Data Model Direction

Current `FourthPhaseCard` already has `tags: string[]`. That is the bridge.

Possible future shape:

```ts
interface FourthPhaseCard {
  id: string;
  phase: Phase;
  rank: Rank;
  value: number;
  tier: CardTier;
  roleName: string;
  tags: string[];
  modifier?: PlayerTrait;
  edition?: CardEdition;

  // Optional future fields, if string tags become too loose.
  playbook?: OffensivePlaybookKey | DefensivePackageKey;
  formation?: string;
  concept?: string;
  playKind?: 'run' | 'pass' | 'rpo' | 'playAction' | 'screen' | 'shot' | 'option' | 'pressure' | 'coverage' | 'takeaway';
}
```

The first implementation can avoid new TypeScript unions and use structured tags:

- `formation:trips`
- `formation:pistol`
- `formation:flexbone`
- `concept:mesh`
- `concept:insideZone`
- `kind:run`
- `kind:shot`
- `kind:playAction`
- `kind:rpo`
- `kind:option`
- `kind:takeaway`
- `kind:pressure`
- `kind:coverage`
- `defense:zone`
- `defense:man`
- `defense:blitz`
- `setup:shortField`
- `setup:tempo`

If this becomes hard to reason about, promote the tags into typed fields later.

## Starter Combo Rules

These are examples of football logic that could be layered into the current scoring engine while preserving the scoring contract.

### Play Action

Trigger:

- A `kind:playAction` Offense card appears after a `kind:run` or `kind:option` card in the same selected series.

Payoff:

- Add Yards and Execution.
- If the play-action card is also `kind:shot`, add a smaller BigPlay bump.

Why it feels right:

- Run game sets up play action.

### Short Field Shot

Trigger:

- A `kind:shot` Offense card appears after a Defense card tagged `kind:takeaway`, `kind:stripSack`, or `setup:shortField`.

Payoff:

- Add Yards or BigPlay.
- Maybe reduce the amount of Momentum required for a strong cash-in.

Why it feels right:

- Sudden change creates a shot opportunity.

### Scripted Series

Trigger:

- Three cards in a series share the same formation tag, or the player runs related concepts from the same family.

Payoff:

- Add Execution and a small Yards bump.

Why it feels right:

- Opening scripts and formation constraint football.

### Constraint Play

Trigger:

- A screen, draw, option, or RPO follows pressure/coverage stress.

Payoff:

- Adds Execution or prevents a bust.

Why it feels right:

- Offense has answers to defensive aggression.

### Tempo

Trigger:

- Multiple quick-game/spread cards in a clean series.

Payoff:

- Add draw/fuel or slightly reduce future discard pressure.

Why it feels right:

- Tempo creates rhythm and volume.

### Coverage Disguise

Trigger:

- A coverage/disguise Defense card before a takeaway/pressure card.

Payoff:

- Add Execution, maybe charge Momentum.

Why it feels right:

- Defensive sequencing creates bad offensive decisions.

## Suggested Build Phases

### Phase 1 - Retheme And Tag Current Cards

Goal: make cards feel like formations/plays/results without changing the whole run structure.

Work:

- Rename Offense/Defense cards in `deck.ts` to familiar play-call language.
- Add football tags to the existing cards.
- Add 3-4 tag-based combo bonuses in `engine.ts`.
- Update guide copy and preview explanations so players can see why a combo fired.
- Add matchup tests for each combo.
- Run the full Fourth Phase balance harness.

Why first:

- It changes feel immediately.
- It limits balance blast radius.
- It proves whether the core idea lands before building a full playbook selector.

### Phase 2 - Convert Team Select Into Offensive Playbook Select

Goal: make the deck choice honest.

Work:

- Keep existing internal `FourthPhaseTeamKey` values at first for storage/run-code compatibility.
- Change player-facing language from team identity to playbook identity.
- Make `prepareFourthPhaseTeamDeck()` become a true playbook deck builder.
- Give each playbook distinct card distribution and signature joker.
- Re-run balance across all six playbooks.

Possible mapping:

- `balanced` -> Balanced / Pro Style
- `airRaid` -> Air Raid
- `smashmouth` -> Power / Smashmouth
- `blackAndBlue` -> Defense-first / Multiple
- `loudHouse` -> Spread / Tempo
- `specialTeamsChaos` -> Multiple / Chaos

Question for reviewers: should these stay as fictional teams with playbooks, or should the screen become explicitly "Choose Offensive Playbook"?

### Phase 3 - Add Defensive Package Choice

Goal: create combinatorial identity.

Work:

- Add a second pre-run choice: defensive package.
- Start with 3 packages, not 6.
- Default the first run to a balanced defense package.
- Encode defense package in run codes and local progress.
- Use expand/migrate/contract thinking for storage.

Suggested first 3:

- 4-3 Multiple
- 4-2-5 Pressure
- Quarters Shell

Question for reviewers: is defense package selection too much for first-run players? Should it unlock after one win?

### Phase 4 - Venue/Crowd Packages

Goal: make Crowd more football-specific after offense/defense is working.

Work:

- Treat Crowd as venue/weather/crowd environment.
- Keep it lightweight.
- Do not add field position yet.

### Phase 5 - Full Playbook Ecosystem

Goal: let playbooks, defensive packages, jokers, practice drills, bosses, and stakes all speak the same football language.

Work:

- Practice Drills become concept drills: Mesh Drill, Option Pitch Drill, Pressure Pickup, Red Zone Fade, etc.
- Bosses become defensive problems: Stacked Box, No-Fly Zone, Sim Pressure, Match Quarters, Rain Game.
- War Room offers explicitly solve playbook weaknesses.
- Balance harness tracks win rate per offense/defense combination.

## UI Questions

The current UI is phone-first and functional. The playbook direction may require new information hierarchy.

Stress-test these:

- Can each card show phase, formation, concept, and result without becoming unreadable on mobile?
- Should cards show "Trips - Mesh" or "Mesh" with a small `Trips` chip?
- Should the selected call sheet read like a script?
  - Example: `Inside Zone -> Play Action Deep Cross -> Field Goal Unit`
- Should combo badges appear directly on the call sheet?
  - `RUN SETUP`
  - `PLAY ACTION LIVE`
  - `SHORT FIELD`
  - `SCRIPTED`
- Should the preview line explain football logic before math?
  - Example: `Run sets up Play Action -> +10 Yards, +0.08 Leverage`
- How much football vocabulary is exciting versus intimidating for a cold player?
- What is the minimum first-run tutorial that teaches play sequencing without a glossary?

## Balance And Harness Requirements

Any scoring, joker, situation, target, economy, boss, War Room, or playbook change must pass:

```bash
npm run lint
npm run build
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000
```

Repo-wide gates also include:

```bash
npm run smoke:gridiron
npm run matchup:gridiron
```

The Fourth Phase hard gates currently documented in `README.md`:

- Synergy pilot win rate: 75-85%.
- No-draft pilot win rate: 55-65%.
- Draft gap: at least +15 win points versus no-draft.
- Per-team spread: at most 6 points.
- Loud House must not be the bottom team.
- Meter ceiling tightness: at most 35%.

If playbooks become real, the harness likely needs new reporting:

- Win rate by offensive playbook.
- Win rate by defensive package.
- Win rate by offense/defense combination.
- Frequency and value of each combo rule.
- Bust rate by playbook.
- Average preview delta from ordering.
- Share of clears that rely on one degenerate combo.

## Constraints Reviewers Must Respect

- Local-first only.
- No backend.
- No accounts.
- No multiplayer.
- No global leaderboards.
- No analytics or remote player data collection without a deliberate privacy pass.
- No payments, betting, prizes, DFS contest framing, or real-money language.
- No real teams, real players, real coaches, real leagues, or licensed IP in shipped content.
- Shipped content should stay fictional, even while using familiar generic football scheme vocabulary.
- Do not add field position yet. It is gated by `docs/FOURTH_PHASE_FIELD_POSITION_GATE.md`.
- Keep preview and execution scoring through the same context builder.
- Preserve `points = Yards x (1 + Execution) x BigPlay`.

## What To Ask Other Models

Paste this brief into another model and ask:

1. Does the playbook direction make Fourth Phase stronger, or does it risk burying the clean card puzzle under football jargon?
2. What is the best minimum viable implementation that would make the game feel like play-calling within one focused build pass?
3. What offensive playbook archetypes should be first, and what should each deck contain?
4. What defensive packages should be first, and should they be chosen before the run or drafted during the run?
5. What tags and combo rules should be first-class?
6. Which combo rules are most likely to be fun, readable, and balanceable?
7. Which combo rules are likely to create degenerate strategies?
8. How should the card faces change so a mobile player understands formation, play, and payoff quickly?
9. How should the first-run tutorial change?
10. How should the War Room change if decks are playbooks?
11. How would you update the balance harness?
12. What would you build in Phase 1, Phase 2, and Phase 3?
13. What should be explicitly avoided?

## Reviewer Prompt

Use this exact prompt if helpful:

```text
You are reviewing a playable single-player football card roguelike called Fourth Phase. It is built in Vite/React/TypeScript. The current game has a strong deterministic card-scoring core, a title screen, team/deck select, stakes, drive intros, War Room drafting, and a run summary. The weak spot is that the cards have football-flavored names but do not yet behave like actual football play calls.

Stress-test this proposed direction: make the decks into familiar offensive playbooks and defensive packages, and make cards represent formations, plays, calls, and results. The goal is to make the game feel familiar and exciting to football sim players while keeping the deterministic roguelike scoring contract:

points = Yards x (1 + Execution) x BigPlay

Assume generic football vocabulary is allowed. Do not use real team/player/coach names or licensed IP. Do not add backend, multiplayer, betting, prizes, or field position. Keep the game local-first and deterministic.

Please give:

1. Your strongest argument for this direction.
2. Your strongest argument against this direction.
3. The minimum viable first implementation.
4. A proposed playbook lineup.
5. A proposed defensive package lineup.
6. A tag schema for cards.
7. Five combo rules that feel like football and are balanceable.
8. UI changes needed for mobile card readability.
9. Balance harness changes needed.
10. A step-by-step implementation plan that fits the existing architecture.
```

## Decision Criteria

This direction is worth pursuing if reviewers converge on:

- The playbook fantasy is materially stronger than the current team/deck fantasy.
- A Phase 1 implementation can be small enough to ship and test.
- The first 3-5 combo rules are legible from card faces and preview text.
- The scoring contract can remain intact.
- The balance harness can measure combo/playbook health.
- The first-run player can still understand what to do within about 60 seconds.

This direction should be slowed down if reviewers find:

- Too many concepts must be taught before the first fun decision.
- The card faces cannot carry the information on mobile.
- The best strategies collapse into one obvious combo.
- Defensive package selection creates too much pre-run friction.
- The existing scoring model fights the playbook fantasy.

## Recommended Next Action

Do not rebuild the whole game at once.

Recommended next implementation:

1. Rename/tag the existing Offense and Defense cards into familiar play-call/result language.
2. Add the first combo rules:
   - Run -> Play Action
   - Takeaway -> Shot
   - Same Formation -> Scripted Series
   - Pressure/Disguise -> Turnover or Leverage
3. Surface combo triggers in the preview and ledger.
4. Add deterministic matchup tests.
5. Run `npm run balance:fourthphase -- 3000`.
6. Only after that, split the decks into true offensive playbooks.

The north star is not "more football words." The north star is a hand that feels like a coach building a play script.
