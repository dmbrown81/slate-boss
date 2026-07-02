# Fourth Phase Review Brief - July 1, 2026

This is the current model-facing handoff for taking Fourth Phase from playable alpha to a product-complete web game.

## Current Product Truth

- Product: **Fourth Phase**, a fictional single-player football card roguelike.
- Public URL: `https://dmbrown81.github.io/slate-boss/`
- Stack: Vite, React, TypeScript, Capacitor packaging.
- Active app entry: `src/App.tsx` renders `src/components/fourthPhase/FourthPhaseLab.tsx`.
- Active game logic lives in `src/lib/fourthPhase/*`.
- The old Callsmith/Gridiron season game is not wired into the app. Some filenames, docs, scripts, and comments still say `gridiron`; treat that as legacy naming unless the active Fourth Phase files call it directly.
- Do not use stale top-level docs as sole truth. Cross-check this brief, `src/App.tsx`, `src/components/fourthPhase/*`, `src/lib/fourthPhase/*`, and `scripts/fourthPhase*.ts`.

## Non-Negotiable Constraints

- Keep the game local-first. No backend, accounts, multiplayer, global leaderboard, analytics, payments, betting, real-money language, prizes, DFS contest framing, licensed teams, real players, or real league IP.
- Keep shipped content fictional.
- Keep scoring deterministic. Variance should come from seeded run state, draw order, draft choices, and player decisions, not hidden rolls.
- Avoid `Math.random` in gameplay paths. Use seeded RNG helpers from `src/lib/rng.ts`.
- Preserve the core scoring contract:

```text
points = Yards x (1 + Execution) x BigPlay
```

- Do not add field position yet. Read `docs/FOURTH_PHASE_FIELD_POSITION_GATE.md`; field position is gated behind retention and balance proof.

## Current Loop

- One run has 3 drives.
- Each drive has an abstract target and a play limit.
- Hand size is 8; the player selects up to 5 cards.
- Cards belong to one of four phases:
  - Offense: yards/base payload.
  - Defense: execution/reliability.
  - Special Teams: draw, money, discounts, hidden-yard economy.
  - Crowd: charges and cashes the Crowd Meter.
- Left-to-right card order matters. Crowd before Offense is the central cash-in lesson.
- Boss pressure appears on the final drive, with scouting shown earlier.
- The War Room appears between drives with up to 2 buys, reroll, joker offers, and Practice Drill offers.
- Local retention includes daily seed, local best/history, run-code import, and copyable cash-in card.

## Key Active Files

- `src/App.tsx` - app front door; should stay Fourth Phase-first.
- `src/components/fourthPhase/FourthPhaseLab.tsx` - current full game UI/orchestration. Large file; refactor carefully if needed.
- `src/components/fourthPhase/FourthPhaseGuide.tsx` - reference panels.
- `src/lib/fourthPhase/types.ts` - core data contracts.
- `src/lib/fourthPhase/deck.ts` - deck/card identities.
- `src/lib/fourthPhase/situations.ts` - situation recognizer and priority ladder.
- `src/lib/fourthPhase/engine.ts` - deterministic scoring engine.
- `src/lib/fourthPhase/jokers.ts` - joker definitions and scoring hooks.
- `src/lib/fourthPhase/meter.ts` - Crowd Meter constants and helpers.
- `src/lib/fourthPhase/run.ts` - teams, bosses, targets, run code, War Room offers.
- `scripts/fourthPhaseMatchup.ts` - deterministic proof harness.
- `scripts/fourthPhaseBalance.ts` - Monte Carlo balance harness and hard Fourth Phase target gates.
- `.github/workflows/deploy.yml` - GitHub Pages deploy. It may still run legacy `gridiron` checks; consider adding Fourth Phase checks.

## Latest Known Balance Target

The latest passing full Fourth Phase balance run was:

```text
npm run balance:fourthphase -- 3000

synergy   win=80.6%
random    win=2.2%
noDraft   win=62.1%
draft gap +18.6 win pts
per-team spread 5.8 pts
Loud House 81.6%, above floor 77.0%
meter tightness 19.9%, p99 peak x8.75
```

Hard target gates:

- Synergy pilot win rate: 75-85%.
- No-draft pilot win rate: 55-65%.
- Draft gap: at least +15 win points versus no-draft.
- Per-team win spread: at most 6 points.
- Loud House must not be the bottom team.
- Meter ceiling tightness: at most 35%.

Do not trust small balance samples as final proof. Use `300` or `1000` only while exploring; use `3000` before claiming tuning is final.

## Current Strengths

- The central order puzzle is real: Crowd charges, Offense cashes.
- Preview and execution share one score context, so visible math is less likely to lie.
- The ledger exposes scoring reasons.
- War Room now has real decision density through reroll, two buys, tags, joker replacement, and Practice Drills.
- Daily seed and run-code import create a local-only replay hook.

## Known Weak Spots To Review

- `FourthPhaseLab.tsx` is doing too much. Component extraction may improve polish, but avoid refactoring away deterministic behavior.
- The UI is functional but may not yet feel final on mobile. Test actual phone-sized viewports, thumb reach, text fit, scrolling, and first-run comprehension.
- Legacy naming still leaks through docs/scripts/workflows (`gridiron`, `Callsmith`). Clean this up only if it does not destabilize deploys or old checks.
- The deploy workflow should probably include `matchup:fourthphase` and a small `balance:fourthphase` CI sample.
- The tutorial is played, but a cold kid/player test should decide whether it truly teaches cash-in within 60 seconds.
- The game has only 29 jokers. Do not add more just for volume; first make existing jokers readable, distinct, and fun.
- The current visual treatment needs a final product pass: hierarchy, animation restraint, touch ergonomics, cash-in juice, War Room clarity, and end-of-run replay/share moments.

## What Final Completion Should Mean

Fourth Phase is "final enough" when:

- A new player can open the public URL on a phone, understand the first cash-in without reading a manual, and finish or lose a run with clear feedback.
- The game is challenging but fair: losses feel caused by poor choices, not confusing UI or hidden randomness.
- The War Room creates meaningful build choices every run.
- Each big score is explainable from the preview and ledger.
- Mobile UI feels like a polished game, not a debug harness.
- The public GitHub Pages build is stable and installable as a PWA.
- All relevant gates pass:

```bash
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000
```

Run `npm run balance:gridiron -- 3000` only if touching legacy Callsmith/Gridiron engine, shared deploy checks, or repo-wide scripts that could affect those harnesses.

## Suggested Review Priorities

1. **Phone-first UX pass**: layout, spacing, scroll flow, touch targets, text fit, contrast, first-run tutorial, run state clarity.
2. **Game-feel pass**: cash-in moment, meter tension, War Room choice clarity, boss-drive drama, win/loss summary.
3. **Rules clarity pass**: make every visible number and tag explain itself without paragraphs.
4. **Balance pass**: only after UX/game-feel changes, rerun the hard Fourth Phase gates.
5. **Deploy/CI pass**: make sure the public URL serves Fourth Phase and CI checks Fourth Phase directly.

## Explicit Non-Goals For The Next Model

- Do not rebuild the game from scratch.
- Do not switch frameworks.
- Do not add a backend.
- Do not add field position unless `docs/FOURTH_PHASE_FIELD_POSITION_GATE.md` is satisfied.
- Do not add real football teams, real players, betting, or prize language.
- Do not bury the playable game behind a landing page.
- Do not make decorative UI changes that reduce scanability or mobile playability.
