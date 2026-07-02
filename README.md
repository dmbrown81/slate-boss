# Fourth Phase / Slate Boss

Fourth Phase is the active product in this repo: a fictional single-player
football card roguelike. Build plays from Offense, Defense, Special Teams, and
Crowd cards; Crowd charges the Crowd Meter, a scoring play cashes it; clear
three drive targets with a boss on the final drive. Everything is local-first,
deterministic, and fictional — no real teams, players, money, or prizes.

- App entry: `src/App.tsx` renders `src/components/fourthPhase/FourthPhaseLab.tsx`.
- Game logic: `src/lib/fourthPhase/*` (deck, situations, engine, jokers, meter, run).
- Scoring contract: `points = Yards x (1 + Execution) x BigPlay`.
- Current model-facing handoff: `docs/FOURTH_PHASE_REVIEW_BRIEF_2026-07-01.md`.

Two earlier games remain in the repo but are not wired into the app:

- **Callsmith / Gridiron** (season football roguelike): code under
  `src/components/Football*` and `src/lib/footballRogue.ts` etc., still covered
  by its own verification scripts (`smoke:gridiron`, `matchup:gridiron`,
  `balance:gridiron`). Docs that describe it as the headline app are historical.
- **Classic Slate Boss** (fictional DFS lineup simulator): recoverable from the
  `archive/classic-dfs-sim` branch and `classic-dfs-sim-2026-06-17` tag.

## Run Locally

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/slate-boss/`.

## Quality Gates

```bash
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000
```

The Fourth Phase balance harness is the source of truth for tuning. Its hard
gates: synergy pilot win 75-85%, no-draft 55-65%, draft gap >= +15 win points,
per-team spread <= 6 points, Loud House not bottom, meter tightness <= 35%.
Use `300`/`1000` samples only while exploring; the gates are tuned for 3000
samples and smaller runs fail on noise alone.

Run `npm run balance:gridiron -- 3000` only when touching the legacy
Callsmith/Gridiron engine or shared harness code.

GitHub Actions (`.github/workflows/deploy.yml`) runs lint, build, both matchup
proofs, the legacy smoke test, and the full Fourth Phase balance gates before
deploying to GitHub Pages at the `/slate-boss/` base path.

## App Packaging

The web build is an installable PWA (manifest + service worker). For native
shells:

```bash
npm run icons
npm run cap:sync
```

The normal `npm run build` keeps the hosted `/slate-boss/` base path. The native
sync path uses `npm run build:native` so Capacitor gets relative asset URLs for
the iOS and Android webviews. See `docs/APP_LAUNCH_CHECKLIST.md` for store
account, testing, and listing guardrails (written for Callsmith; the guardrails
still apply).

## Guardrails

- Local-first only: no backend, accounts, multiplayer, analytics, payments,
  betting or real-money language, prizes, DFS framing, or licensed IP.
- Deterministic gameplay: seeded RNG from `src/lib/rng.ts` only; no
  `Math.random` in gameplay paths.
- Field position is deferred behind `docs/FOURTH_PHASE_FIELD_POSITION_GATE.md`.
- The first screen stays playable — no landing page in front of the game.

## Useful Files

- `src/lib/fourthPhase/engine.ts` - deterministic scoring engine and ledger.
- `src/lib/fourthPhase/situations.ts` - situation recognizer and priority ladder.
- `src/lib/fourthPhase/jokers.ts` - joker definitions and scoring hooks.
- `src/lib/fourthPhase/run.ts` - teams, bosses, targets, run codes, War Room offers.
- `scripts/fourthPhaseMatchup.ts` - deterministic proof harness.
- `scripts/fourthPhaseBalance.ts` - Monte Carlo balance harness with hard gates.
- `AGENTS.md` - repo-level AI development guardrails.
- `docs/PROJECT_MAP.md` - layer diagram and folder map (legacy-era; cross-check).
- `docs/archive/` - historical DFS and AI review briefs outside the active app path.
