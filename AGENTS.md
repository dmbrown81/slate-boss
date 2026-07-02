# Fourth Phase AI Development Guardrails

Use this file as the root context for AI-assisted work in this repo.

## Project Shape

- **Fourth Phase is the active product**: a fictional, single-player football card roguelike built with Vite, React, TypeScript, and Capacitor. `src/App.tsx` renders `src/components/fourthPhase/FourthPhaseLab.tsx`; game logic lives in `src/lib/fourthPhase/*`.
- The older Callsmith/Gridiron season game is unwired but retained; many files, scripts, and docs still use `gridiron`/`Callsmith` names. Treat those as legacy unless active Fourth Phase code calls them.
- The core game should stay local-first. Do not add backend services, accounts, multiplayer, global leaderboards, payments, betting, prizes, DFS contests, or licensed league/player/team IP unless the user explicitly changes the product direction.
- Keep real sports research in calibration/docs only. Shipped game content must remain fictional.
- Treat `docs/FOURTH_PHASE_REVIEW_BRIEF_2026-07-01.md` as the current reviewer packet, then cross-check `src/App.tsx` and `README.md` before broad changes. Field position is gated by `docs/FOURTH_PHASE_FIELD_POSITION_GATE.md`.

## Engineering Rules

- Keep engine logic in `src/lib/*` pure and deterministic where possible. UI orchestration belongs in `src/components/*`.
- Scoring must stay deterministic. Variance comes from draw order, seeded run state, and player decisions, not hidden rolls.
- Avoid `Math.random` in gameplay paths that need replayability. Pass an `RNG` or derive one with `mulberry32` and `stringSeed` from `src/lib/rng.ts`.
- Preserve the scoring contract: `points = Yards x (1 + Execution) x BigPlay`.
- Preview and execution must score through the same context builder so the previewed number never lies.
- For schema-like or persisted data changes (localStorage keys like `fourth_phase_history_v1`), use expand/migrate/contract thinking.
- Keep changes scoped. Do not large-refactor math, UI, and storage in the same pass unless the user asks for a dedicated refactor.

## Verification

Run the gates that match the change:

```bash
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
```

For Fourth Phase scoring, joker, situation, meter, target, economy, boss, or War Room changes, also run:

```bash
npm run balance:fourthphase -- 3000
```

Use a smaller balance sample only for early exploration; the hard gates are tuned for 3000 samples and smaller runs fail on noise alone. Run `npm run balance:gridiron -- 3000` only when touching the legacy Callsmith/Gridiron engine or shared harness code.

## Review Checklist

- Game math: add or update deterministic checks before trusting AI-generated scoring changes.
- Mobile feel: avoid main-thread-heavy loops, expensive per-render work, and unbounded animations. Honor `prefers-reduced-motion`.
- Accessibility: do not rely on color alone for phases, channels, or state. Maintain readable labels and contrast.
- Security and privacy: no secrets, no production keys, no remote player data collection without a deliberate privacy pass.
- Research hygiene: when outside reviews or market/game research influence the design, capture the decision in docs and convert it into a testable task, harness gate, or explicit product constraint.
