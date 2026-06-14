# Slate Boss Project Log

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
