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
