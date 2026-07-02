# Gridiron AI Review Brief - June 26, 2026

> A model-facing technical handoff for Gemini, Claude, Grok, Lovable, Z.ai, Codex, or any other reviewer. It explains the current product, code architecture, recent football-grammar changes, verification harnesses, balance state, and the exact kinds of critique requested.

## 0. Current Repo State

- Product: **Gridiron**, the active app inside the Slate Boss repo.
- Repo: `https://github.com/dmbrown81/slate-boss`
- Branch to review: `gridiron-ux-sprint`
- Latest pushed implementation commit at the time of this brief: `9daa539` - `Add defensive presentation reads to Gridiron`
- Stack: Vite + React + TypeScript.
- Current local app route when running Vite: `http://127.0.0.1:5173/slate-boss/` or next open Vite port.
- This file is an updated review packet. Older docs such as `docs/GRIDIRON_HANDOFF.md`, `docs/PROJECT_MAP.md`, and `docs/REVIEW_BUNDLE.md` are useful but partly stale around the new defensive presentation/read system.

## 1. How To Access And Verify

```bash
git clone https://github.com/dmbrown81/slate-boss.git
cd slate-boss
git checkout gridiron-ux-sprint
npm install

npm run dev -- --host 127.0.0.1
npm run build
npm run lint
npm run smoke:gridiron
npm run matchup:gridiron
npm run balance:gridiron
```

Expected verification state from the latest local pass:

- `npm run build`: passes.
- `npm run lint`: passes.
- `npm run smoke:gridiron`: passes, including boss-game hidden-look assertions.
- `npm run matchup:gridiron`: passes, including direct "same hand, different look, different score" proofs.
- `npm run balance:gridiron`: passes hard gates.
- Corrected balance headline: synergy champion rate **53.3%**.
- Known soft watch items:
  - Lane spread: **10.1 pts** (soft yellow, target about <=10).
  - Campaign cleared-drive p99/median: **3.16x** (soft yellow, target about <=3x).

## 2. Product Summary

Gridiron is a single-player football card roguelike inspired by Balatro-like transparent scoring and engine-building, but with football as the real scoring grammar rather than a surface theme.

The commercial/design thesis:

> Simple enough for a Balatro player to learn through play, but authentic enough that a football obsessive recognizes why the play worked.

The target audience is intentionally two-sided:

- Football/sim players who understand Madden, EA College Football, team-building modes, formations, matchups, and play concepts.
- Puzzle/roguelike players who like transparent systems, compounding builds, seeded runs, YouTube/Twitch/Reddit discussion, and "I learned the real concept by playing" depth.

The project is not meant to be a side hobby toy. The desired bar is a scalable, catchy product hook.

Hard constraints:

- Fictional football only.
- No real teams, players, NFL marks, betting, DFS contest framing, deposits, withdrawals, real money, prizes, or sportsbook language.
- Deterministic scoring. Variance comes from draw order and build decisions, not hidden rolls.
- React + Vite + TypeScript stays.
- Mobile-first, but should feel polished on desktop too.
- Existing engine balance is important; scoring changes must run `npm run balance:gridiron` and `npm run matchup:gridiron`.

## 3. Core Game Loop

A season has 5 games. Win all five to win the run. Lose any game and the run ends.

Each game has 3 drives:

1. Draw an 8-card hand.
2. Cards are football actions: pass, route/catch, run, read, defense, kick.
3. Select up to 4 cards to assemble a play.
4. Preview shows the play concept and deterministic score before committing.
5. Run the play to add points to the drive.
6. Clear the drive target before budget collapses.
7. Between games, enter the War Room to spend Funds on rewards, coordinators, cards, game plans, traits, tools, or front-office upgrades.

The score formula is:

```text
drivePoints = Base x (1 + Execution) x BigPlay
```

Channels:

- `Base`: raw yards and base-feeding effects.
- `Execution`: flat additive concept/coordinator quality.
- `BigPlay`: multiplicative leverage/explosive effects.

Resource model:

- Each card has a Play Budget cost.
- Each drive has finite budget.
- Audibles let the player redraw selected cards.
- In boss games, a defensive Read also spends one audible to reveal the hidden pre-snap look.

## 4. Current Product Features

Already built and should not be suggested as "new" unless critiquing execution:

- 5-game season structure.
- Team-as-deck selection.
- Five fictional team identities.
- Coach portraits and palettes.
- War Room economy with Funds.
- Reward drafting.
- Front Office upgrades.
- Game Plan concept leveling.
- Player Traits.
- Scaled targets.
- Anti-spam repeated-concept penalty.
- Weighted weather.
- Boss defenses from Game 2 onward.
- Play-resolution theatre: count-up, concept banners, drive stamps, turnover stamp.
- Daily Scrimmage seed.
- Local run history.
- Run codes.
- Overtime score-chase after Championship.
- Balance harness.
- Smoke harness.
- Matchup proof harness.
- Concept dossiers and card vocabulary.
- Defensive presentation reads and hidden/disguised boss looks.

## 5. Newest Major Change: Football Grammar Hook

The most recent work moved Gridiron from "football words on top of Balatro-ish scoring" toward "football decisions affect score."

### 5.1 Card Vocabulary

File: `src/lib/gridironPlaybook.ts`

Cards now expose a football assignment family and position-aware label:

- Families: `Route`, `Pass`, `Run`, `Read`, `Cover`, `Rush`, `Kick`.
- Examples:
  - WR deep catch: `Go / Post`
  - TE deep catch: `Seam`
  - RB deep catch: `Wheel`
  - RB breakaway run: `Outside zone`
  - RB power run: `Gap / Power`
  - DST interception: `Ball-hawk`

This is presentation-only. Scoring still keys on `card.action` and `card.side`.

### 5.2 Concept Dossiers

File: `src/lib/gridironPlaybook.ts`

Each `FbConceptKey` has:

- Authentic football name.
- Family.
- What it is.
- What it beats.
- What beats it.
- How to scale it.
- Boss-scheme strong/weak tendency.

Examples:

- `double_stack_bomb` -> `Four Verticals / Shot Play`
- `stack_td` -> `QB Stack (Stick / Slant-Flat)`
- `ground_pound` -> `Inside Zone / Power / Duo`
- `qb_keeper` -> `Read Option / QB Keeper`
- `checkdown` -> `Checkdown / Dump-Off`

Important integrity model:

- Layer 1: boss-scheme tendency is always known.
- Layer 2: exact pre-snap edge depends on revealed defensive presentation.
- The concept dossier verdict must never contradict engine scoring.
- The check lives in `scripts/gridironMatchupCheck.ts`.

### 5.3 Defensive Presentation Model

File: `src/lib/footballRogue.ts`

New types:

```ts
export type FbShell = 'base' | 'one-high' | 'two-high' | 'zero';
export type FbBox = 'light' | 'neutral' | 'loaded';
export type FbPressure = 'four-man' | 'blitz' | 'simulated';
export type FbLeverage = 'soft' | 'press' | 'inside' | 'outside';

export interface FbDefensivePresentation {
  shell: FbShell;
  box: FbBox;
  pressure: FbPressure;
  leverage: FbLeverage;
}
```

Primary scheme mapping:

```ts
balanced       -> base shell, neutral box, four-man, soft
no_fly_zone    -> two-high, light box, four-man, soft
stacked_box    -> one-high, loaded box, four-man, press
turnover_drill -> two-high, neutral box, simulated, inside
adaptive_dc    -> one-high, neutral box, blitz, press
```

Alt/disguised scheme mapping:

```ts
balanced       -> base shell, neutral box, four-man, soft
no_fly_zone    -> two-high, neutral box, four-man, soft
stacked_box    -> two-high, loaded box, four-man, press
turnover_drill -> two-high, neutral box, four-man, inside
adaptive_dc    -> two-high, neutral box, four-man, press
```

Design rule:

- The alt look should remove a possible edge axis relative to the primary look.
- It should not add raw power.
- This makes disguise an information test, not extra upside.

### 5.4 Matchup Edge Matrix

File: `src/lib/footballRogue.ts`

Function: `presentationEdge(concept, presentation)`

Current favorable-look bonuses:

```text
ground_pound      strong vs light box: Base x1.04
designed_run      strong vs light box: Base x1.03
qb_keeper         strong vs light box: Execution +0.05
double_stack_bomb strong vs one-high: BigPlay x1.04
shootout_stack    strong vs one-high: BigPlay x1.03
checkdown         strong vs blitz/simulated: Execution +0.05
```

Weak-side penalties still mostly live in the old boss-scheme block:

- Loaded box hurts run concepts.
- No-Fly Zone hurts deep stacks.
- Turnover Drill hurts defensive splash.
- Adaptive DC punishes repeated concepts harder.

### 5.5 Hidden Until Revealed

File: `src/components/FootballMatch.tsx`

Implementation:

- Actual live look is chosen once per game:

```ts
livePresentation(
  bossScheme,
  mulberry32(stringSeed(`gridiron-look:${seed}:g${gameNumber}:${bossScheme}`))
)
```

- The live presentation is passed into `scoreFootballPlay` whether revealed or not.
- The player does not see it in boss games until spending one audible.
- Pre-reveal UI shows:

```text
DISGUISED | ? shell | ? box | ? rush | Read · 1 aud
```

- Revealed UI shows:

```text
PRE-SNAP LOOK | Single-high / Two-high / etc. | Light/Even/Loaded box | Blitz/etc.
```

- Revealing only changes information. It does not change the underlying score.
- `balanced` does not disguise; Game 1 remains an honest teaching look.

### 5.6 Scoring Ledger

File: `src/lib/footballRogue.ts`

New ledger kind:

```ts
type FbLedgerKind = ... | 'matchup' | ...
```

Pre-Snap Edge ledger entries show as green chips with glyph `▲` in `FootballMatch.tsx`.

## 6. Direct Proof That The Hook Works

Command:

```bash
npm run matchup:gridiron
```

Current expected output includes:

```text
Ground & Pound:
loaded=202, even=246, light=257
lower vs loaded box
higher vs light box

Deep stack:
two-high=199, even=257, one-high=289
lower vs two-high
higher vs single-high
```

This proves the same hand scores differently because of the defensive look.

The same script also verifies:

- Pre-reveal dossier verdict agrees with boss-block-only scoring.
- Revealed presentation verdict agrees with actual presentation scoring.
- Representative concepts across all schemes do not drift from the engine.

## 7. Current Balance Snapshot

Command:

```bash
npm run balance:gridiron
```

Latest corrected 1500-season/cell run:

```text
policy   champion  avgGamesWon
synergy   53.3%       3.93
naive     40.2%       3.76
random    13.0%       2.83
none       0.0%       1.98
```

Key diagnostics:

```text
Build gap: 53.3 pts - green
Reward gap: 40.3 pts - green
Team champion spread: 6.2 pts - green
Competitive teams: 5/5 - green
Dead-draw losses: 6.7% - green
Smart spend gap: 40.3 pts - green
Spend vs bank gap: 2.5 pts - green
Lane spread: 10.1 pts - soft yellow
Campaign p99/median: 3.16x - soft yellow
Overtime ceiling vs campaign median drive: 9.5x - green
```

Current caution:

- Do not add more raw upside to defense or ground until lane spread is watched/tuned.
- Prefer readability, UI feel, and information architecture over new power.
- Any new matrix cell must run `npm run matchup:gridiron` and `npm run balance:gridiron`.

## 8. Important Files To Review

### Highest-priority orientation

- `docs/GRIDIRON_AI_REVIEW_BRIEF_2026-06-26.md` - this file.
- `docs/GRIDIRON_HANDOFF.md` - older broad handoff, useful but stale around defensive reads.
- `docs/PROJECT_MAP.md` - older source map, useful but missing `gridironPlaybook.ts` and matchup check.
- `README.md` - app-level overview.

### Core engine and scoring

- `src/lib/footballRogue.ts`
  - Cards, actions, traits.
  - Scoring model.
  - Coordinators.
  - Boss schemes.
  - Defensive presentation.
  - Hidden look mapping.
  - Presentation edge matrix.
  - Score ledger.
- `src/lib/footballRun.ts`
  - Season state.
  - Targets.
  - Rewards.
  - Game Plans.
  - War Room generation.
  - Front-office upgrades.
  - Reward impact estimates.
- `src/lib/gridironPlaybook.ts`
  - Concept dossiers.
  - Card vocabulary.
  - Boss/presentation matchup verdicts.
- `src/lib/gridironEconomy.ts`
  - Funds, rerolls, interest, skip logic.
- `src/lib/gridironStorage.ts`
  - Save/resume, local history, prefs.
- `src/lib/gridironTaxonomy.ts`
  - Reward taxonomy and run codes.
- `src/lib/gridironCalibration.ts`
  - Fictional tuning constants.

### UI

- `src/components/FootballMatch.tsx`
  - Main game screen.
  - Pre-snap look strip.
  - Reveal/read button.
  - Play preview.
  - Scoring ledger.
  - Card rendering with vocabulary chips.
  - Coach guidance.
  - Action bar.
- `src/components/FootballHelpModal.tsx`
  - Help copy, now mentions defensive Read.
- `src/components/FootballReward.tsx`
  - War Room.
- `src/components/FootballTeamSelect.tsx`
  - Team selection.
- `src/components/FootballHome.tsx`
  - Home, daily, resume.
- `src/components/FootballRunSummary.tsx`
  - End state.
- `src/components/footballStyles.ts`
  - Shared visual tokens.
- `src/components/teamIdentity.ts`
  - Team palettes and coach identity.
- `src/components/coachIdentity.tsx`
  - Geometric coach portrait.

### Verification

- `scripts/gridironSmoke.tsx`
  - Server-render smoke check.
  - Includes Game 2 hidden-look assertions:
    - `DISGUISED`
    - `? shell`
    - `? box`
    - `? rush`
    - `Read · 1 aud`
- `scripts/gridironMatchupCheck.ts`
  - Same-hand matchup proof.
  - Dossier/engine consistency.
- `scripts/gridironBalance.ts`
  - Monte Carlo season balance.
  - Uses independent hidden-look seed matching the app.
- `package.json`
  - Scripts:
    - `build`
    - `lint`
    - `smoke:gridiron`
    - `matchup:gridiron`
    - `balance:gridiron`

## 9. Implementation Details And Invariants

### Scoring invariants

- `scoreFootballPlay` must remain deterministic.
- No `Math.random` in scoring.
- Context carries all state.
- Presentation edge must be visible in ledger if applied.
- Boss-scheme tendencies and pre-snap presentation edges are separate layers.
- A hidden look affects score even before reveal; reveal only exposes information.
- `presentationEdge` should stay conservative unless balance supports otherwise.

### UI invariants

- Game 1 / balanced defense is not disguised.
- Boss games are disguised pre-read.
- Defensive Read costs exactly one audible.
- If no audibles remain, Read button is disabled.
- Dossier can show boss-scheme tendency before reveal.
- Dossier only shows exact pre-snap edge when the look is revealed.
- Card face vocabulary should not change scoring.

### Test invariants

- If a scoring matrix cell changes, run:

```bash
npm run matchup:gridiron
npm run balance:gridiron
```

- If `FootballMatch` changes, run:

```bash
npm run smoke:gridiron
```

- If UI copy or layout changes, still run:

```bash
npm run build
npm run lint
```

## 10. Known Gaps / High-Value Review Areas

These are the most useful places for another model to critique.

### 10.1 Hook Clarity

The hook is now technically real: reading the defense can change score. But does a player understand that?

Questions:

- Is `DISGUISED / ? shell / ? box / ? rush / Read · 1 aud` self-explanatory?
- Does the player understand Read spends an audible, not budget?
- Does the player understand the score is already using the hidden look?
- Should the first boss game force or strongly recommend one defensive Read?
- Should the concept dossier open automatically after the first reveal?
- Is "Pre-Snap Edge" too technical or exactly right?

### 10.2 First Boss Game UX

The first boss game now introduces:

- Boss scouting report.
- Hidden pre-snap look.
- Read cost.
- Existing hand selection.
- Existing score preview.
- Existing War Room build context.

Questions:

- Is this too much at once?
- Should the first boss game have a one-time micro-sequence:
  1. "Defense is disguised."
  2. "Spend 1 audible to read shell/box/rush."
  3. "Now pick a concept that attacks the look."
- Should the Read button be visually promoted on Game 2 Drive 1?

### 10.3 Match UI Ergonomics

Prior work fixed the action bar covering bottom hand cards, but mobile layout remains dense.

Questions:

- Is the fixed action bar still too tall after dossier/preview grows?
- Can lower cards be tapped comfortably?
- Should the pre-snap strip live inside the fixed action area instead of above the hand?
- Does the hand need a stronger selected-card tray?
- Should concept dossier be collapsed by default forever, or auto-open for first boss read?

### 10.4 Balance / Power Curve

Current balance is good, but lane spread is a soft watch item.

Questions:

- Is defense lane too high in forced-commit mode?
- Is pass lane too low in forced-commit mode?
- Does hiding edges make the optimal pilot too blind in the harness compared with a human who can spend Read?
- Should the balance harness simulate a reveal policy?
- Should Read cost one audible or should some build/tool reduce that cost?

### 10.5 Football Authenticity

Current football grammar is intentionally small.

Questions:

- Are the current mappings authentic enough?
- Is `no_fly_zone -> two-high + light box` a good simplification?
- Is `stacked_box -> one-high + loaded box` intuitive?
- Is `turnover_drill -> simulated pressure` a stretch?
- Should `leverage` become scoring-relevant or remain presentation-only?
- What is the next safest matrix cell?

Do not recommend adding 50 concepts immediately. A better recommendation is a small set of high-impact, low-balance-risk cells.

### 10.6 Teaching Layer Integrity

`gridironPlaybook.ts` is a teaching/data layer, but it imports `presentationEdge` from the engine. That creates a useful integrity link but may be architecturally debatable.

Questions:

- Should concept dossiers live in `gridironPlaybook.ts` or be split into `gridironDossiers.ts` and `gridironCardVocabulary.ts`?
- Is importing engine helpers into a presentation data file acceptable?
- Would a data-driven matrix owned by one module be cleaner?
- Is the smoke/matchup check enough to prevent drift?

### 10.7 Retention And Content

Current retention is local and lightweight.

Questions:

- Is Daily Scrimmage enough without leaderboard/accounts?
- Should run codes and daily seeds be more prominent?
- Should there be a "play today's boss look" share card?
- Should Overtime be surfaced earlier or remain post-Championship?

### 10.8 Accessibility

Known weak area.

Questions:

- Color-only channels: `Base`, `Execution`, `BigPlay`, War Room lanes, matchup edge.
- Screen reader labels on card and play buttons.
- Reduced motion exists, but no audio/haptics policy beyond limited haptic calls.
- Is `Read · 1 aud` clear to screen readers?
- Does the UI require color to understand good/bad matchup?

## 11. Current Suggested Next Tickets

These are not instructions to implement blindly. They are high-signal candidates for review.

### Ticket 1 - First Boss Read Micro-Onboarding

Files:

- `src/components/FootballMatch.tsx`
- possibly `src/components/FootballHelpModal.tsx`
- `scripts/gridironSmoke.tsx`

Goal:

- On Game 2 Drive 1 before first play, add a small one-time callout near the pre-snap strip:
  - "Boss defenses disguise the look."
  - "Spend 1 audible to Read shell, box and rush."
  - "Run blind or buy the information."

Acceptance:

- Does not block play.
- No new state persisted unless needed.
- Smoke test checks copy appears on Game 2 and not Game 1.
- Build/lint/smoke pass.

### Ticket 2 - Reveal Policy In Balance Harness

Files:

- `scripts/gridironBalance.ts`

Goal:

- Add an optional policy that simulates spending one audible to reveal in boss games when there are audibles available.
- Compare blind vs reveal pilot.

Acceptance:

- Report includes blind synergy and reveal synergy, or a separate diagnostic section.
- No app code changes.
- Balance remains readable.

### Ticket 3 - Dossier Auto-Open After First Reveal

Files:

- `src/components/FootballMatch.tsx`

Goal:

- When the player reveals the look for the first time in a game, auto-open or pulse the concept dossier once a valid concept is selected.

Acceptance:

- No persistent tutorial overlay.
- Does not annoy repeat runs.
- Smoke still passes.

### Ticket 4 - Data-Driven Matchup Matrix

Files:

- `src/lib/footballRogue.ts`
- `src/lib/gridironPlaybook.ts`
- `scripts/gridironMatchupCheck.ts`

Goal:

- Replace the switch-based `presentationEdge` with a typed data table so future matrix additions are easier to audit.

Acceptance:

- Same current outputs.
- `npm run matchup:gridiron` proves no scoring drift.
- `npm run balance:gridiron` stays around current headline.

### Ticket 5 - Accessibility Pass For Matchup Signals

Files:

- `src/components/FootballMatch.tsx`
- `src/components/footballStyles.ts`

Goal:

- Ensure good/bad/even matchup and Pre-Snap Edge do not rely on color alone.

Acceptance:

- Visible text or glyph distinguishes edge/counter/even.
- ARIA labels mention hidden/revealed state and audible cost.
- Smoke checks relevant labels if feasible.

### Ticket 6 - Lane Spread Watch

Files:

- `scripts/gridironBalance.ts`
- maybe no app code.

Goal:

- Add a short note or diagnostic in balance output showing which lane is highest/lowest and whether spread exceeds 10.

Acceptance:

- No scoring changes.
- Easier to notice defense/ground overpowering.

## 12. Things To Avoid Recommending

Avoid generic advice that ignores the product constraints.

Do not recommend:

- Real NFL teams/players.
- Betting, DFS contests, prizes, real-money hooks.
- Multiplayer as the next step.
- A full physics sim.
- 50 new concepts before the current matrix is proven readable.
- A landing page instead of improving the actual game.
- Generic "make it more polished" without file-level tickets.
- Adding raw scoring upside before checking lane spread.
- Removing deterministic scoring.
- Hiding score math entirely. The transparent ledger is core to the design.

## 13. Ready-To-Paste Prompt For Another Model

Use this prompt with the files listed in Section 8.

```text
You are reviewing Gridiron, a football card roguelike in a Vite + React + TypeScript repo.

Read `docs/GRIDIRON_AI_REVIEW_BRIEF_2026-06-26.md` first, then inspect the source files it names. Give a comprehensive senior-level product, game-design, UX, and technical review.

Context:
- Gridiron is not a generic football skin. The product thesis is that football concepts should generate the puzzle.
- Recent work added concept dossiers, card vocabulary, defensive presentation, hidden/disguised boss looks, a one-audible Read action, and a small matchup matrix where the same hand scores differently against different pre-snap looks.
- Current balance is green: synergy 53.3%, random 13.0%, all teams viable. Soft watch items: lane spread 10.1 pts and campaign p99/median 3.16x.
- Hard constraints: fictional football only; no real money/betting/DFS contest framing; deterministic scoring; React/Vite/TypeScript; mobile-first; do not add huge systems before proving the hook.

Your output should:
1. Name the single biggest product risk in one sentence.
2. Give an honest product read: strongest thing, weakest thing, and whether the new defense-read hook is understandable.
3. Review the defensive presentation/read system specifically:
   - score integrity
   - UI clarity
   - football authenticity
   - balance impact
   - onboarding
   - accessibility
4. Review the broader game loop and retention.
5. Identify any code architecture risks around `footballRogue.ts`, `gridironPlaybook.ts`, `FootballMatch.tsx`, and the harness scripts.
6. Produce 8-12 agent-ready tickets, ranked by impact-per-hour. Each ticket must include files touched, implementation idea, acceptance criteria, and which verification commands to run.
7. Include a "do not build yet" section for tempting but premature ideas.

Be direct. Do not flatter. Do not suggest real NFL/IP, betting, multiplayer, a full physics sim, or 50 new football concepts as the next move.
```

## 14. Quick Glossary

- `FbCard`: a football action card.
- `FbActionType`: action taxonomy such as `deep_pass`, `power_run`, `interception`.
- `FbConceptKey`: recognized scoring concept such as `ground_pound`, `stack_td`, `qb_keeper`.
- `FbDefensivePresentation`: exact pre-snap look: shell, box, pressure, leverage.
- `presentationEdge`: small favorable-look scoring matrix.
- `conceptDossier`: teaching data for a concept.
- `conceptMatchup`: UI verdict function that layers boss tendency and revealed pre-snap edge.
- `PreSnapLook`: UI strip in `FootballMatch.tsx`.
- `Read`: player action that spends one audible to reveal the hidden pre-snap look.
- `War Room`: between-game reward shop.
- `Game Plan`: concept leveling system.
- `Coordinator`: persistent scaling modifier.
- `Player Trait`: permanent card modifier.
- `matchup:gridiron`: deterministic proof that reading the defense changes score.
- `balance:gridiron`: Monte Carlo season balance harness.

