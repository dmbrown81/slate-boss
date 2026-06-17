# Agent Handoff Log

Shared working log for Codex, Claude Code, and future AI sessions on Slate Boss.

Add the newest entry near the top. Keep entries short, factual, and useful for the next agent. Do not remove historical context unless the user asks for a cleanup.

## Handoff Template

```text
## YYYY-MM-DD - Agent - Branch

Goal:
- ...

Changed:
- ...

Validation:
- ...

Decisions:
- ...

Next:
- ...

Blockers:
- ...
```

## 2026-06-17 - Claude Code - football-card-rogue

Goal:
- Pivot the card-rogue direction from "DFS lineup + bolt-on Edge multiplier" to a football-native deckbuilder where a card is a football ACTION and you assemble scoring plays. Ship the smallest playable slice that tests the core fun question: does assembling a play and watching Base x Mult feel good?

Changed:
- Added `src/lib/footballRogue.ts`: action-card model (cards are Deep Ball, Power Run, Deep Catch, Interception, etc., value weighted by player archetype), deterministic `scoreFootballPlay` (Base x Mult) with a synergy/coordinator/environment ledger, starter deck built from Ironhawks + a few Blazers (bring-back) + kicker cards, and `Air Raid` coordinator.
- Added `src/components/FootballRogueScreen.tsx`: a full single-match loop — scoreboard + target, 8-card hand, tap up to 4 cards, LIVE play preview (the key "watch the engine" moment), Run Play / Audible, 4 quarters, win/lose. Per-match environment modifier (Dome/Snow/Wind/Primetime/Clear).
- Added `Screen = 'football'` and routed it in `App.tsx`; added a "Football Rogue" entry card to `HomeScreen.tsx`.

Decisions (defaults, all tunable):
- Scoring is DETERMINISTIC. Variance lives in the draw (do you hold the cards to complete the stack?), not in a sweat sim. No contest sim involved in this mode.
- One card = one football action. A play = 1-4 cards. Hand size 8, 4 quarters, 2 audibles, target 700 (Primetime ×1.25).
- Single starter team (Ironhawks), one coordinator (Air Raid), one environment per match. Teams-as-decks, shops, bosses, season shell all deferred until the core play loop proves fun.

Validation:
- `npm run lint` and `npm run build` pass.
- Engine sanity check (scripts/fbcheck, since removed): Field Goal 55, Single Stack 319, Double-Stack Bomb 603, Shootout 618, Ground & Pound 134 vs 700 target.

Next:
- Playtest the core loop. Tune target / mults if a single stack trivializes the match.
- If fun: add a season shell (rounds → playoffs → championship), a shop/reward loop, more coordinators, multiple teams-as-decks, and boss defensive schemes (the "stingy vs pass" idea).

Blockers:
- Need the user's feel: is "assemble a drive, watch it score" the fun moment? That decides whether we invest in the run shell.

## 2026-06-17 - Codex - codex/dfs-card-rogue

Goal:
- Build the first playable DFS card-rogue prototype path and provide a local test link.

Changed:
- Added `src/lib/rogueScoring.ts` with lineup pattern detection, starter coordinator data, and `Base Fantasy Points x Edge` scoring.
- Added a Rogue Prototype card to the home screen.
- Reused the existing lineup builder and sweat screen for rogue mode while keeping daily/career paths intact.
- Added starter coordinator context in the builder: Air Raid Coordinator, Salary Wizard, and Leverage Desk.
- Added `src/components/RogueResultsScreen.tsx` with engine score, boss target, lineup patterns, coordinator cards, score ledger, and lineup scorecard.
- Wired `App.tsx` so Rogue Prototype does not update daily/career profile progression.

Validation:
- `npm run lint` passes.
- `npm run build` passes.
- Dev server runs at `http://127.0.0.1:5173/slate-boss/`.
- Browser smoke test completed: opened Rogue Prototype, built a stack-heavy lineup, entered contest, skipped sweat, and verified the rogue results ledger rendered.
- Mobile-width home overflow check at 390x844 found no horizontal document overflow.
- Final browser reload verified `Try Rogue Prototype` is present at the local URL.

Decisions:
- First prototype uses the existing full slate player pool instead of a limited draw/bench system.
- First prototype keeps the existing contest simulation as Base Points, then applies the rogue engine on top.
- Starter rogue contest uses `mini_gpp` internally.
- Prototype boss target is a fixed 210 engine score.

Next:
- Tune scoring values; the first stack-heavy test hit a very large 352.0 engine score.
- Add a real rogue run shell with weeks/antes, boss slates, shop, and rewards.
- Add playbook upgrades and shop-purchasable coordinators.
- Consider a limited bench/draft layer once the scoring loop feels good.

Blockers:
- Need user/design feedback on whether the engine feels exciting or too explosive.

## 2026-06-17 - Codex - codex/dfs-card-rogue

Goal:
- Preserve the current playable DFS sim and branch into a DFS card-roguelike direction.

Changed:
- Created and pushed `archive/classic-dfs-sim` from the current `main` baseline.
- Created and pushed tag `classic-dfs-sim-2026-06-17` from the same baseline.
- Created branch `codex/dfs-card-rogue` for experimental rogue-mode work.
- Added `docs/DFS_CARD_ROGUE_DIRECTION.md` as the north-star design brief and phased implementation guide.
- Updated `PROJECT_LOG.md` with the branch/archive decision.

Validation:
- Verified `main` was clean and synced with `origin/main` before creating archive refs.
- No gameplay code changed in this setup pass.

Decisions:
- Keep classic Slate Boss on `main`.
- Build the card-rogue experience as a branch-first experiment, not a destructive rewrite.
- Use `Base Points x Edge` as the initial DFS translation of card-rogue scoring.
- Use coordinators/tools/playbooks/film-room language instead of copying Balatro terms.

Next:
- Implement `src/lib/rogueScoring.ts` with lineup pattern detection and a visible score ledger.
- Add a small coordinator database and hook-style scoring effects.
- Add tests or a balance harness for rogue pattern detection before UI work.
- Then add a Rogue Run entry path while keeping daily classic mode intact.

Blockers:
- Need a product decision later on whether rogue mode uses the full slate pool or a limited draw/bench system.
