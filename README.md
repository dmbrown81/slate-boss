# Gridiron / Slate Boss

Gridiron is a single-player football card roguelike inside the Slate Boss repo.
The current headline mode is Gridiron: build a team deck, call football concepts,
clear three drives per game, and survive a five-game season.

Classic Slate Boss, the original fictional DFS lineup simulator, is still kept in
the repository as archived legacy code, but it is no longer exposed in the app
navigation.

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
npm run balance:gridiron -- 3000
```

The Gridiron balance harness is the source of truth for tuning. It checks whether
smart build choices beat random choices, whether all five team decks are viable,
and whether losses are caused by weak builds instead of dead draws.

## Product State

Gridiron is moving into productized alpha. The foundation now includes:

- five team-as-deck starting identities
- seeded season state for weather, bosses, rewards, and match draws
- a **Front Office Funds economy** (win purse + banked interest) — the between-game transmission
- the **War Room** shop: priced rewards, buy up to two, reroll, and skip-for-funds
- **Player Traits** (card modifiers: Reliable, Explosive, Discounted, Clutch, Protected, Hot Route), bought via Training rewards and wired into the scoring ledger
- an NFL/DFS research calibration layer that keeps real stats out of the shipped game while using them to tune fictional archetypes, weather frequency, traits, and boss logic
- a run-summary **Coach Debrief** that explains the final build and suggests the next strategic focus
- versioned localStorage save/resume under `gridiron_run_v1` (save format v2, migrates v1)
- boss preview during War Room reward selection
- staged scoring ledger with stage/channel/operation metadata
- a lightweight screen render smoke test

Near-term work should stay focused on app hardening and strategic depth, in order:
Film Tools (one-use consumables) + coordinator ordering; then expanding the
coordinator catalog so run/defense leans have as much to buy as passing (compresses
team spread); then concept containment and seeded daily challenges. Avoid backend, accounts, multiplayer, real-money features,
licensed IP, or a mobile wrapper until the alpha loop is steadier.

## Useful Files

- `src/lib/footballRogue.ts` - Gridiron card model, Player Traits, deck factories, scoring, bosses, and tunables.
- `src/lib/footballRun.ts` - season state, seeded run helpers, priced rewards, training, and build identity.
- `src/lib/gridironCalibration.ts` - read-only NFL/DFS-derived calibration constants for fictional tuning.
- `src/lib/gridironEconomy.ts` - Front Office Funds: purse, interest, reroll/skip economy.
- `src/lib/gridironStorage.ts` - Gridiron save/resume persistence (v2 with v1 migration).
- `src/components/FootballSeason.tsx` - season orchestration.
- `scripts/gridironBalance.ts` - Monte Carlo balance harness.
- `scripts/gridironSmoke.tsx` - lightweight render smoke test.
- `docs/NFL_DFS_GRIDIRON_CALIBRATION.md` - what was found in `/Users/dominicbrown/Desktop/nfl_dfs` and how it should inform Gridiron without shipping real NFL content.
- `AGENT_HANDOFF_LOG.md` - shared project log for Codex / Claude Code handoffs.
