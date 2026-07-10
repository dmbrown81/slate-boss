# Fourth Phase — Codex Handoff (2026-07-10)

Handoff from the Claude Code working sessions covering the **extraction → art →
share → fun-audit → two fun sprints** span. Written so Codex (or any engineer)
can pick up cold. Everything described is committed and pushed to `main`.

Current HEAD: `45031c2`. Public build: https://dmbrown81.github.io/slate-boss/

---

## 0. TL;DR — where the project stands

Fourth Phase is a fictional, local-first, single-player football card roguelike
(Balatro skeleton, trading-card locker-room skin). Vite + React + TS + Capacitor,
deployed as a PWA. It is the app's front door (`src/App.tsx` renders
`FourthPhaseLab`). The core loop is balance-proven and now has a full personality
/ run-identity layer on top.

**The last several sprints did four things:**
1. Broke the 3,143-line `FourthPhaseLab.tsx` monolith into 11 focused modules.
2. Shipped an art vertical slice (procedural SVG, zero raster assets).
3. Shipped the Wordle-style daily share loop.
4. Ran a fun/enjoyment audit (8 outside reviews) and shipped **both** slices of
   the resulting action plan: voice + loss drama (Sprint 1), and run identity —
   halftime adjustment, SCOUTED, REMATCH, daily modifiers (Sprint 2).

**The one gate that has never been cleared: a real 5-human cold-play test.** All
the balance evidence is from the Monte Carlo harness. The game is now much
livelier than when that gate was first named, but it is still unrun.

---

## 1. Commit-by-commit, most recent first

| Commit | Title | What landed |
| --- | --- | --- |
| `45031c2` | Fun sprint 2: halftime adjustment, SCOUTED, REMATCH, daily modifiers | §6 |
| `d8a7388` | Fun sprint 1: The Other Sideline — voice, loss drama, verdict celebration | §5 |
| `cf6963a` | Fun & enjoyment audit packet (2026-07-10) | §4 (the packet) |
| `36ee297` | Extraction, art slice, and the Wordle daily share loop | §2, §3 |
| `adf92f9` | War Room sprint (prior) | pre-handoff context |
| `b55f9cd` | The Play Unfolds cinematic (prior) | pre-handoff context |
| `268ac14` | First-minute onboarding pass (prior) | pre-handoff context |
| `7378cca` | Balance harness: stake ladder + greedy/mono pilots (prior) | pre-handoff context |

---

## 2. Component extraction (`36ee297`)

`FourthPhaseLab.tsx` went from **3,143 → 1,759 lines** and now holds only the
state machine + orchestration. Eleven modules were carved out under
`src/components/fourthPhase/`:

| Module | Responsibility |
| --- | --- |
| `fpPersistence.ts` | All localStorage: history, daily record, career progress, tutorial flag, grudge book, daily-modifier catalog. Storage keys + record types live here. |
| `fpLabLogic.ts` | Pure tutorial/feedback logic + share-grid helpers. `TUTORIAL_STEPS`, `firstRunSeed`, `stagedExplanation`, `diagnoseWeakSeries`, `buildResolution`, `evaluateCashIn`, `dailyShareGrid`/`dailyShareText`; types `CashInSnapshot`, `PlayResolution`, `DriveLogEntry`. |
| `fpShared.tsx` | Chrome shared across screens: `Shell`, `GameHeader`, `Metric`, `StakeBadge`, `SoundToggle`, `UnlockBanner`, `PatchEmblem`, `FootballGlyph`. |
| `FourthPhaseCards.tsx` | `HandCard`, `MiniCard`, `CardBand`, `CardChips`, `DragBind` type. |
| `TutorialCoach.tsx` | `TutorialPanel` (the coach step card). |
| `SeriesPreviewPanel.tsx` | The "This Series" preview card + `EffectVerbChip`, `ComboChips`. |
| `WarRoom.tsx` | The between-drives draft table. |
| `GameStatusPanel.tsx` | The scorebug: objective header, drive target, momentum, boss strip, field-progress. Owns the `LabPhase` type. |
| `FeedbackPanels.tsx` | `ResolutionCard`, `CoachDiagnosisCard`, `CashInCard`, `DriveBannerOverlay`. |
| `FourthPhaseScreens.tsx` | `TitleScreen`, `TeamSelectScreen`, `DriveIntroScreen`. |
| `fpShareCard.ts` | Canvas 1080×1350 PNG share-card renderer. |

**Gotcha that shaped the split:** eslint `react-refresh/only-export-components`
forbids a component file from exporting non-components. So style-adjacent helpers
(`TEAM_ACCENT`, `EFFECT_VERB_COLOR`, `cardBadge`, `cardFaceFrame`) live in
`fourthPhaseStyles.ts`, and pure logic lives in `fpLabLogic.ts`. Keep that
discipline — if you add a helper to a `.tsx`, lint will fail.

No engine or scoring code was touched by the extraction, so the balance harness
stayed valid across it.

## 3. Art vertical slice + Wordle share (`36ee297`)

**Art (`fpCardArt.tsx`, all procedural SVG, no image files):**
- `CardWatermark` — a duotone ink illustration behind every card face, in the
  phase's ink color: Offense = chalk route diagram, Defense = X-front stunt,
  Special Teams = kick through the uprights, Crowd = stadium bowl + fans. Two
  variants per phase, chosen by `card.rank`, so a given card always wears the
  same art (faces are collectible → must be stable across draws/devices).
- `StadiumHero` — a night-game scene on the title binder cover (floodlights,
  bowl, crowd speckle, field), patch emblem overlaid like a foil stamp.
- `.fp-foil-live` CSS (`index.css`) — an animated holo sheen sweep on edition
  (foil) cards. Disabled under `prefers-reduced-motion`.

**Daily share loop:**
- `LabState.driveLog: DriveLogEntry[]` — one `{calls, cleared}` per finished
  drive, appended in `executePlay` on clear or loss.
- `dailyShareGrid` — Wordle-style emoji rows: 🟩 setup calls, 🟨 the clearing
  call, 🟥 a drive that died. Row length = the efficiency brag.
- `dailyShareText` — title / `W-L · drives · pts · 🔥streak` / grid / run code.
- Grid persisted on `FourthPhaseDailyRecord.grid` (optional field, back-compat).
- Run-end screen shows the grid + one-tap copy; title screen re-shares today's
  stored record and shows a next-daily countdown.

## 4. The fun audit (`cf6963a` = the packet; reviews are local, not committed)

The packet `docs/FOURTH_PHASE_FUN_AUDIT_PACKET_2026-07-10.md` asked outside
models one question: *not whether it's correct/balanced, but whether it's FUN.*
Eight reviews came back (raw file: `~/Downloads/"fourth phase review audit 7_9.md"`,
not in the repo). Synthesis + ranked plan is committed at
**`docs/FOURTH_PHASE_FUN_ACTION_PLAN_2026-07-10.md`** — read that first.

**Unanimous verdict: "respected it, not loved it."** Core diagnosis: the game
"has no memory and no antagonist." Best 5 seconds (unanimous): the reorder →
preview-spike → cinematic hit-stop. Deadest 30 seconds (unanimous): mid-drive
calls of Drive 2 at Rookie.

**Key fact-check baked into the plan:** reviewers' most-cited fun-killer,
"garbage time after the target is secured," is a *phantom* — the drive already
ends the instant the target clears. Most reviewers audited from the packet, not
hands-on. Don't build "Take a Knee." What survives is (a) mid-drive tension sag
when comfortably ahead, and (b) doomed-run resignation.

## 5. Fun Sprint 1 — "The Other Sideline" (`d8a7388`)

Presentation + writing only. **No scoring-path changes.** Matchup harness green.

All new voice copy lives in `src/lib/fourthPhase/coach.ts`:
- `BOSS_VOICE` (`bossVoice(boss)`) — per boss: `intro` taunt, `punish` line,
  `playerWin`/`playerLoss` exit lines, `lossHeadline`.
- `coachLossLine(seed)`, `coachPhilosophy(team)`.
- `callOfTheGameLine(BestSeriesRecord)` and `driveClearStamp(...)`.

Wired into the UI:
- Boss taunt on the drive intro (`DriveIntroScreen.bossTaunt`).
- Boss punish line in the Series Result — fired only when a boss ledger entry is
  present (`PlayResolution.bossLine`, threaded through `buildResolution`).
- **Loss staging on RUN OVER**, in feel-it-then-learn order: `lossHeadline` →
  `SHORT BY N` (LED) → stranded-momentum chip (when the meter died hot) → boss
  exit quote → diagnosis → coach loss line. Seed-replay button becomes
  **"Revenge Game — rematch <boss>"**.
- **Call of the Game** on every verdict, from new `LabState.bestSeries`
  (`BestSeriesRecord`), plus a career-best-series flare.
- Drive-clear banner names the drive's character (WALK-OFF / ESCAPED /
  STATEMENT DRIVE / CASHED OUT / ANSWERED).
- Coach philosophy per playbook on the select screen.
- **Reorder hint hides the exact +delta at stake ≥ 2** (Pro+): discovery is the
  reward. Rookie still shows the number. (`SeriesPreviewPanel.hideReorderDelta`.)

## 6. Fun Sprint 2 — run identity (`45031c2`)

Engine-adjacent. Each item is mirrored in the balance harness so pilots play by
the same rules. **All 7 hard gates + all ladder advisories pass** (numbers in §7).

1. **Halftime Adjustment** — on a bossless Drive 2, the defense counters the
   situation the player leaned on most in Drive 1: `situation.key` match →
   `yards *= 0.8`. Checkdown and Busted Play are exempt.
   - Logic: `halftimeCounterFor(repeated)` in `run.ts`. Applied in
     `applyBossAfterCards` in `engine.ts` via `context.halftimeCounter` (new
     optional field on `FourthPhaseScoreContext`).
   - Set in `buildNextDriveState` (Lab) when `nextDrive === 1 && nextBoss === 'none'`.
   - Declared on the drive intro (`DriveIntroScreen.halftimeNote`), telegraphed
     in the preview via the boss-warning slot (they never co-occur).
2. **SCOUTED** — pre-boss War Rooms guarantee a response lane to the named boss.
   - **IMPORTANT balance lesson:** the first implementation guaranteed the
     premium boss-answer *jokers* and blew the gates (synergy 86.2%, Legend
     64.1%). The shipped version routes the guarantee through the **practice
     drill** (`scoutedPracticeKeyFor` → `BOSS_PREFERRED_PRACTICE`) — a plan, not
     a power spike. Jokers that naturally answer the boss still get the SCOUTED
     tag. Do not "upgrade" this back to guaranteed jokers without re-running the
     3000-sample harness.
   - `generateFourthPhaseWarRoomOffers` gained a trailing `nextBoss` param. Both
     Lab call sites and both harness call sites pass it.
   - Red SCOUTED chip rendered in `WarRoom.tsx`.
3. **REMATCH** — `fourth_phase_grudge_v1` localStorage. A loss writes the losing
   boss; the next meeting stamps REMATCH on the boss card + scouting report; a
   win vs that boss clears it. `FourthPhaseRunRecord` gained optional `boss`.
   Helpers `loadFourthPhaseGrudge()` in `fpPersistence.ts`; grudge write/clear in
   `saveFourthPhaseCompletion`.
4. **Named daily modifiers** — `dailyModifierFor(label)` in `fpPersistence.ts`.
   Catalog: PRIME TIME (targets +10%), SHORT WEEK (−1 redraw), HOMECOMING (+$4),
   SILENT COUNT (meter cap x4), SUNDAY CLASSIC (none). **Run-parameter changes
   only** (money / redraws / targets / meter cap) — the scoring engine is
   untouched, so the preview stays exact by construction. Applied in
   `createInitialState` and re-applied per drive in `buildNextDriveState`
   (redraws + cap reset each drive). Declared on title + intro; the name is
   carried in `dailyShareText` as the share's proper noun.

## 7. Balance evidence (3000-sample harness, current HEAD `45031c2`)

```text
synergy  win=80.2%   noDraft  win=64.7%   random  win=2.4%
greedy (cold-player proxy)  win=74.4% at Rookie
mono (one-combo spam)  win=38.2%  (was 40.7% pre-halftime — the adjustment
                                   punishing rhythm spam, as designed)
Playbook spread: 4.2 pts   Draft impact: +15.6 win pts

Stake ladder          synergy   greedy   noDraft
  Rookie               80.2%    74.4%    64.7%
  Pro                  69.7%    62.6%    49.5%
  All-Pro              63.8%    52.3%    45.9%
  Legend               49.5%    32.3%    31.4%
```
All 7 hard gates + all stake-ladder advisories pass.

**The hard gates (in `AGENTS.md` / `scripts/fourthPhaseBalance.ts`):** synergy
win 75–85%, noDraft 55–65%, draft gap ≥15, build gap ≥8, per-team spread ≤6,
Loud House not bottom, meter tightness ≤35%. **These fail CI on push.** The stake
ladder + greedy/mono lines are advisories (never fail). If you touch scoring,
jokers, situations, meter, targets, economy, bosses, War Room, the halftime
adjustment, or the SCOUTED lane, re-run `npm run balance:fourthphase -- 3000`
and keep all 7 green.

## 8. Verify before you commit anything

```bash
npm run lint
npm run build
npm run matchup:fourthphase          # asserts situations/equation/order/jokers/bosses
npm run balance:fourthphase -- 3000  # only if you touched a gameplay-math path
```
Gridiron legacy still passes its own `smoke:/matchup:/balance:gridiron` — leave
it alone; it's unwired from the app but retained.

**Dev-verify gotchas (learned the hard way):**
- `preview_eval` `textContent` is NOT css-uppercased — match `/^play$/i`, not `'PLAY'`.
- Plain `el.click()` sometimes doesn't trigger React handlers mid-session;
  the reliable path is finding the button by text and calling `.click()`, or
  dispatching a full pointer event sequence.
- The cinematic / drive banner payoffs are ~1.4s and a screenshot misses them —
  trace via DOM text / sessionStorage instead.

## 9. What to do next (ranked, from the fun action plan)

**Not yet done from the plan:**
- **Mid-drive tension** (fun-killer #4) — the one item deferred pending design.
  The idea on the table: a press-your-luck / two-minute-drill shape for calls
  where the player is comfortably ahead of pace. Needs a design decision before
  code; do not just add effects.
- **Cinematic personal-firsts retrigger** (fun-killer #7) — currently once per
  drive by numeric threshold; reviewers want it tied to context (first time
  beating a boss, new best, comeback) with varied presentation, to fight the
  "scheduled animation" reflex.

**Explicit DO-NOT-YET (near-unanimous across reviewers):**
- Full events system ("events into a game with no personality yields more math").
- Run-history screen ("would catalog stories the game isn't producing yet").
- More jokers, raster art, music — all real, all later.
- Field position / downs — still behind its documented gate.

**Protect list (do not regress):**
- The exact-math preview ("the game's purest expression of mastery").
- The reorder moment — and keep the +delta hidden at Pro+.
- Playbook-select unlock-progress bars ("strongest retention object").
- Preview honesty (preview and execution score through the same context),
  determinism, local-first.

**The actual gate:** a 5-human cold-play test. Everything above is polish on a
game that no human stranger has been observed learning cold.

## 10. Doc map (for deeper context)

```text
docs/FOURTH_PHASE_FUN_ACTION_PLAN_2026-07-10.md   ← the synthesis; read first
docs/FOURTH_PHASE_FUN_AUDIT_PACKET_2026-07-10.md  ← the packet sent to reviewers
docs/FOURTH_PHASE_PEER_REVIEW_PACKET_2026-07-07.md← prior "is it pitchable?" round
AGENTS.md                                          ← engineering rules + gates
~/Downloads/"fourth phase review audit 7_9.md"     ← raw reviews (NOT in repo)
```

Code map:
```text
Engine:      src/lib/fourthPhase/engine.ts      (scoring, ledger, boss + halftime)
Situations:  src/lib/fourthPhase/situations.ts
Deck/teams:  src/lib/fourthPhase/deck.ts, run.ts (offers, halftimeCounterFor, SCOUTED)
Jokers:      src/lib/fourthPhase/jokers.ts
Stakes:      src/lib/fourthPhase/stakes.ts
Meter:       src/lib/fourthPhase/meter.ts
Coach/voice: src/lib/fourthPhase/coach.ts        (BOSS_VOICE, philosophies, CotG)
UI:          src/components/fourthPhase/          (Lab = orchestrator + 11 modules)
Harness:     scripts/fourthPhaseBalance.ts, fourthPhaseMatchup.ts
```
