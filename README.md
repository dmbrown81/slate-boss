# Gridiron / Slate Boss

Gridiron is a single-player football card roguelike inside the Slate Boss repo.
The current headline mode is Gridiron: build a team deck, call football concepts,
clear three drives per game, and survive a five-game season.

Classic Slate Boss, the original fictional DFS lineup simulator, has been removed
from the active app tree. It remains recoverable from the `archive/classic-dfs-sim`
branch and `classic-dfs-sim-2026-06-17` tag.

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
npm run build:native
npm run smoke:gridiron
npm run balance:gridiron -- 3000
```

The Gridiron balance harness is the source of truth for tuning. It checks whether
smart build choices beat random choices, whether all five team decks are viable,
and whether losses are caused by weak builds instead of dead draws.

## App Packaging

Gridiron is now wired for installable web, iOS, and Android packaging:

```bash
npm run icons
npm run cap:sync
```

The normal `npm run build` keeps the hosted `/slate-boss/` base path. The native
sync path uses `npm run build:native` so Capacitor gets relative asset URLs for
the iOS and Android webviews. See `docs/APP_LAUNCH_CHECKLIST.md` for store
account, testing, and listing guardrails.

## Product State

Gridiron is moving into productized alpha. The foundation now includes:

- five team-as-deck starting identities
- seeded season state for weather, bosses, rewards, and match draws
- a **Front Office Funds economy** (win purse + banked interest) — the between-game transmission
- the **War Room** shop: priced rewards, buy up to two, reroll, and skip-for-funds
- **Player Traits** (card modifiers: Reliable, Explosive, Discounted, Clutch, Protected, Hot Route), bought via Training rewards and wired into the scoring ledger
- an NFL/DFS research calibration layer that keeps real stats out of the shipped game while using them to tune fictional archetypes, weather frequency, traits, and boss logic
- mobile-QB and defensive-pressure identity lanes with their own scaling coordinators, Game Plans, and per-lane balance gauge
- a run-summary **Coach Debrief** that explains the final build and suggests the next strategic focus
- versioned localStorage save/resume under `gridiron_run_v1` (save format v3, migrates v1/v2)
- boss preview during War Room reward selection
- staged scoring ledger with stage/channel/operation metadata
- a lightweight screen render smoke test

Near-term work should stay focused on app hardening and strategic depth, in order:
Film Tools (one-use consumables) + War Room decision clarity; then coordinator
ordering plus concept containment; then Coach Debrief 2.0 / run history and seeded
daily challenges. Avoid backend, accounts, multiplayer, real-money features, or
licensed IP until the alpha loop is steadier; treat native packaging as a shell
around the web app for now.

## Useful Files

- `src/lib/footballRogue.ts` - Gridiron card model, Player Traits, deck factories, scoring, bosses, and tunables.
- `src/lib/footballRun.ts` - season state, seeded run helpers, priced rewards, training, and build identity.
- `src/lib/gridironCalibration.ts` - read-only NFL/DFS-derived calibration constants for fictional tuning.
- `src/lib/gridironEconomy.ts` - Front Office Funds: purse, interest, reroll/skip economy.
- `src/lib/gridironStorage.ts` - Gridiron save/resume persistence (v3 with v1/v2 migration).
- `src/components/FootballSeason.tsx` - season orchestration.
- `scripts/gridironBalance.ts` - Monte Carlo balance harness.
- `scripts/gridironSmoke.tsx` - lightweight render smoke test.
- `docs/PROJECT_MAP.md` - current layer diagram and folder map.
- `docs/NFL_DFS_GRIDIRON_CALIBRATION.md` - what was found in `/Users/dominicbrown/Desktop/nfl_dfs` and how it should inform Gridiron without shipping real NFL content.
- `docs/archive/` - historical DFS and AI review briefs preserved outside the active app path.
