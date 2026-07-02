# Fourth Phase Fable 5 One-Shot Prompt

Copy/paste the prompt below into Fable 5 from the repo root (`/Users/dominicbrown/Desktop/slate-boss`).

```text
You are working in /Users/dominicbrown/Desktop/slate-boss.

Goal: take Fourth Phase from playable alpha to final completion quality: clean phone-first UI, understandable first-run experience, challenging/fun deterministic game logic, polished game feel, stable public web build, and no drift back into old Callsmith/Gridiron product direction.

Important context:
- Fourth Phase is the active product and public front door.
- src/App.tsx renders src/components/fourthPhase/FourthPhaseLab.tsx.
- Active logic is in src/lib/fourthPhase/* and scripts/fourthPhase*.ts.
- Some repo docs/scripts still say Callsmith or Gridiron. Treat those as legacy names unless the active Fourth Phase code depends on them.
- Read docs/FOURTH_PHASE_REVIEW_BRIEF_2026-07-01.md first.
- Also read docs/FOURTH_PHASE_FIELD_POSITION_GATE.md before considering any field-position ideas.

Non-negotiables:
- Keep the game local-first. No backend, accounts, multiplayer, global leaderboard, analytics, payments, betting, real-money language, prizes, DFS framing, licensed teams, real players, or real league IP.
- Keep all shipped content fictional.
- Preserve deterministic gameplay. Do not add hidden rolls or Math.random to gameplay paths.
- Preserve the scoring contract: points = Yards x (1 + Execution) x BigPlay.
- Field position is deferred unless the gate doc is satisfied.
- Do not rebuild the game from scratch or switch frameworks.
- Do not bury the game behind a landing page. The first screen should remain playable.

First actions:
1. Run git status and identify unrelated dirty worktree changes. Do not revert or overwrite user/other-agent changes.
2. Read:
   - docs/FOURTH_PHASE_REVIEW_BRIEF_2026-07-01.md
   - docs/FOURTH_PHASE_FIELD_POSITION_GATE.md
   - src/App.tsx
   - src/components/fourthPhase/FourthPhaseLab.tsx
   - src/components/fourthPhase/FourthPhaseGuide.tsx
   - src/lib/fourthPhase/types.ts
   - src/lib/fourthPhase/deck.ts
   - src/lib/fourthPhase/situations.ts
   - src/lib/fourthPhase/engine.ts
   - src/lib/fourthPhase/jokers.ts
   - src/lib/fourthPhase/meter.ts
   - src/lib/fourthPhase/run.ts
   - scripts/fourthPhaseMatchup.ts
   - scripts/fourthPhaseBalance.ts
   - package.json
   - .github/workflows/deploy.yml
3. Run the app locally and inspect it at mobile and desktop sizes. Use screenshots/DOM inspection if available.

Your job is not just to review. Implement a focused completion pass.

Prioritize in this order:
1. Phone-first UX polish:
   - touch target size
   - text fit
   - scan hierarchy
   - no overlapping UI
   - no nested card clutter
   - clear play state, selected order, meter state, target progress, and available actions
   - strong but restrained cash-in moment
2. First-run teaching:
   - a cold player should hit a real Crowd -> Offense cash-in in under 60 seconds
   - tutorial should be playable, not reading homework
   - reference panels should support play, not block it
3. Game-feel and challenge:
   - make the meter hold/cash decision feel tense
   - make War Room choices readable and tempting
   - make bosses feel like meaningful constraints
   - make win/loss/run summary satisfying and useful
4. Rules clarity:
   - every big number should be explainable by preview and ledger
   - every War Room tag should map to a real build reason
   - avoid unexplained magic thresholds in UI copy
5. Balance:
   - after behavior changes, use quick samples while iterating, then final 3000-sample proof
   - keep synergy 75-85%, no-draft 55-65%, draft gap >= 15 win points, team spread <= 6 points, Loud House not bottom
6. Deploy/CI hygiene:
   - ensure public build remains Fourth Phase-branded
   - add Fourth Phase checks to CI/deploy if missing
   - preserve GitHub Pages base path /slate-boss/

Potential high-value tasks:
- Extract FourthPhaseLab into smaller components only where it reduces risk and improves polish.
- Improve War Room presentation and decision clarity.
- Improve final run summary/share/replay moment.
- Improve mobile hand/selected-play ergonomics.
- Add direct Fourth Phase CI checks.
- Clean up stale docs that incorrectly say Gridiron is the active app, but only after verifying the active app remains Fourth Phase.

Acceptance criteria:
- Public app still opens Fourth Phase directly.
- No regressions to deterministic scoring.
- No backend or prohibited content added.
- UI is visibly more polished on phone.
- First cash-in is easier to discover through play.
- Final verification passes:
  npm run lint
  npm run build
  npm run smoke:gridiron
  npm run matchup:gridiron
  npm run matchup:fourthphase
  npm run balance:fourthphase -- 3000
- If touching legacy Callsmith/Gridiron engine files or shared harnesses, also run:
  npm run balance:gridiron -- 3000

When finished, summarize:
- what changed
- why it improves final-player experience
- exact verification results
- any remaining risks or suggested next manual playtest
```
