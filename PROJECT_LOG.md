# Slate Boss Project Log

## 2026-06-20

### Gridiron becomes the visible app surface

- Merged the complete-vehicle Gridiron branch into `main`.
- Archived the old Classic Slate Boss / DFS experience from normal navigation so testers land in Gridiron without mode confusion.
- Kept legacy DFS source files in the repository for reference, but removed the visible "Classic Slate Boss (DFS)" link and routes old home fallbacks back to the Gridiron title screen.

### Gridiron "complete vehicle" — Front Office economy + War Room + Player Traits

- Acted on the unanimous multi-model design package: gave the scoring engine a transmission.
- Added Front Office Funds (`gridironEconomy.ts`): starting funds, win purse, banked interest, reroll/skip economy.
- Replaced the single-pick reward screen with the War Room shop: priced rewards, buy up to two rewards, reroll, skip-for-funds, with the existing boss/weather scout.
- Added Player Traits (card modifiers): Reliable, Explosive, Discounted, Clutch, Protected, Hot Route — wired into the three-channel scoring pipeline with ledger lines and on-card badges, bought via Training rewards.
- Bumped Gridiron save format to v2 with a v1 migration so in-progress seasons survive.
- Expanded the balance harness to be economy-aware (every policy now spends Funds) and added a Front Office Economy section (smart-spend gap + spend-vs-bank check).
- Codex verification tightened War Room persistence, capped shop purchases at two, made Discounted costs consistent with Salary Wizard, and tuned the late-season target curve to 24% per game.
- Harness after verification: synergy 47.4%, random 8.3%, BUILD GAP 47.4, REWARD GAP 39.1, smart-spend 39.1, spend-vs-bank 3.3; all five teams viable with 11.6-point spread and 5.7% dead-draw.
- Validation: `npm run lint`, `npm run build`, `npm run smoke:gridiron`, `npm run balance:gridiron -- 3000` all pass.

### Gridiron productized-alpha foundation

- Moved Gridiron toward app readiness without freezing the game design.
- Added versioned Gridiron save/resume persistence under `gridiron_run_v1`.
- Added seeded season helpers for deterministic weather, boss, reward, and match draw paths.
- Added next-game boss/weather scouting to the Front Office reward screen.
- Structured score ledger entries with stage/channel/operation metadata for future scoring-pipeline animation and debugging.
- Added a lightweight Gridiron render smoke script: `npm run smoke:gridiron`.
- Updated app metadata, README, and reviewer handoff docs so Gridiron is the repo's first-class product surface.

## 2026-06-17

### DFS card-rogue branch kickoff

- Preserved the current playable DFS lineup sim as the classic baseline.
- Created and pushed `archive/classic-dfs-sim` so the old direction has an explicit GitHub branch.
- Created and pushed `classic-dfs-sim-2026-06-17` as a matching archive tag.
- Created `codex/dfs-card-rogue` as the experimental branch for the DFS card-roguelike pivot.
- Added `AGENT_HANDOFF_LOG.md` as the shared Codex / Claude Code update log.
- Added `docs/DFS_CARD_ROGUE_DIRECTION.md` with the Balatro-inspired DFS translation, MVP phases, scoring model, item taxonomy, and boss-slate ideas.

### Next intended build slice

- Add a rogue scoring module that detects DFS lineup patterns such as Single Stack, Double Stack, Bring-Back, Game Stack, Chalk Core, Leverage Core, Stars and Scrubs, and Punt Value.
- Return a transparent `Base Points x Edge` score ledger.
- Add a small coordinator/tool database and test the pattern engine before building new UI.
- Keep the existing daily/classic game path intact while the rogue mode proves itself.

### First playable Rogue Prototype

- Added `src/lib/rogueScoring.ts` as a standalone rogue scoring engine.
- Detects core lineup patterns: Single Stack, Double Stack, Bring-Back, Game Stack, Chalk Core, Leverage Core, Stars and Scrubs, Bellcow Build, Punt Value, and Fragile Ceiling.
- Added starter coordinators: Air Raid Coordinator, Salary Wizard, and Leverage Desk.
- Added a home-screen Rogue Prototype entry point without removing Daily Slate or Career Mode.
- Reused the existing lineup builder and sweat screen, then routes rogue entries to a new `RogueResultsScreen`.
- Rogue results now show engine score, boss target, Base Points, Flat Edge, Total Edge, pattern cards, coordinator cards, and a scoring ledger.
- Rogue Prototype does not update normal daily/career profile progression yet.
- Validation: `npm run lint` and `npm run build` pass, and an in-browser smoke test completed the full rogue path locally.

## 2026-06-13

### AI audit synthesis

External reviews from ChatGPT, Gemini, and Claude converged on the same product direction:

- Do not add more broad features until the first run and result loop are clearer.
- Default new players into a safe Double-Up / 50/50 style contest.
- Remove payout rake during prototype testing so skill is easier to feel.
- Split results into pre-lock decision quality and post-sim outcome luck.
- Add a Monte Carlo balance harness before deep simulation tuning.
- Turn career mode into a light roguelite loop with real boons.
- Surface only a few achievements at a time instead of overwhelming players with the full catalog.

### Implementation pass

- Changed default contest to Safe 50/50.
- Removed prototype rake: Safe 50/50 now pays 2x, and tournament payout bands return the full prize pool.
- Renamed starter contest labels toward player-friendly language.
- Raised career starting bankroll from $15 to $25.
- Added a deterministic Build Quality analysis separate from Outcome Luck.
- Updated results to lead with Build Quality, Game Luck, one read, and one next-time lesson.

### Next intended build slice

- Add Coach's First Slate / guided first run.
- Add Beginner and Pro table modes.
- Build a dev-only balance harness for cash/win/ROI targets.
- Start converting unlocks into active career boons.

### Comprehension pass

- Added a first-session home treatment that points new players directly to Start First Slate.
- Added Beginner and Advanced views to the player list. Safe 50/50 defaults to beginner cards.
- Beginner cards hide DFS-heavy columns and show projection, salary, safety, upside, and a short reason.
- Hid the advanced result grades behind a Show Advanced Breakdown button.
- Softened near-miss language from blame to biggest swing.
- Fixed career copy to match the $25 starting bankroll and added survive-10-weeks goal/risk copy.
- Reworded lineup coach stack language around QB Combo.
- Reworded the stack helper as QB Combo Builder and hid average ownership language in Safe 50/50.

### AI feedback consolidation

- Added `AI_MODEL_FEEDBACK_SYNTHESIS.md` as the concise working synthesis of outside-model feedback for Claude Code, Codex, and future reviewers.
- The synthesis separates what shipped from what remains: balance harness, beginner variance tuning, guided first slate, functional career boons, and mobile app readiness.

### Balance + first-run pass (Claude review)

- Added a dev-only Monte Carlo balance harness (`scripts/balance.ts`, `npm run balance`). Reports cash / top-10 / win / ROI per archetype (random, projection, value, safe, contrarian, strong) across all four contest types. First run confirms strong Safe 50/50 builds cash ~95–98% vs ~25% for random — build quality now predicts cashing. It also shows the contrarian archetype is punished everywhere, flagging the weak opponent field as the next tuning target.
- Implemented contest-level variance compression in the simulation. `skewedDraw` takes a `varianceScale`; `runContest` applies a per-contest multiplier (Safe 50/50 0.8, Starter 1.0, Big 1.15, WTA 1.3) to the whole field, plus extra beginner smoothing for the user's first three contests (0.8 / 0.9 / 0.95). This is what makes the Build Quality vs Game Luck split mechanically true rather than just copy.
- Forced the first daily contest to Safe 50/50 at the contest-resolution layer (`App.handleEnterContest`), independent of the picker.
- Decluttered the first session in `LineupBuilder`: locked contest chip instead of the dropdown, hid the modifier banner, suppressed in-build news toasts, and hid the advanced StackingTool. LineupCoach (beginner guidance) is kept.

### Still open after this pass

- Opponent field archetypes (the harness shows the field is too weak / contrarian is over-punished).
- Guided step-by-step first slate (pick QB → add a combo → finish).
- Functional career boons (Bubble Shield, Value Finder, Stack Meter+).
- Mobile/PWA readiness: 100vh→100dvh, safe-area insets, larger tap targets, manifest/icons, run the sim off the main thread.

### Opponent archetypes + first-slate coaching

- Replaced the old chalk/contrarian opponent split with contest-aware field archetypes: safe chalk, balanced, QB combo, contrarian, stars-and-scrubs, casual, and sharp.
- Field mix now changes by contest type. Safe 50/50 fields are more stable/chalky; tournaments include more combos, contrarian builds, and sharp lineups.
- Added a lightweight first-slate coach panel in the builder: pick a QB, add a QB Combo, then fill remaining slots safely.
- Beginner cards can now show a Coach pick tag for the current first-slate step.
- Balance harness sample after archetypes shows Safe 50/50 builds now separate more cleanly from random lineups while tournaments are less automatic.

### Functional career boons

- Added the first real career boon picker to new runs: Bubble Shield, Value Finder, and Stack Meter+.
- Bubble Shield now has gameplay effect: once per run, it refunds the entry fee if a career lineup misses the cash line by 2 points or fewer. It does not count as a cash.
- Value Finder highlights one strong salary-efficiency player in the builder during career runs.
- Stack Meter+ upgrades the QB Combo Builder with a plain-English read on whether the lineup has no combo, a playable stack, or a stronger shootout stack.
- Results now show career boon refunds separately and calculate net result using payout plus any boon refund.
