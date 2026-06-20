# Gridiron — Reviewer / Audit Handoff

> A self-contained packet for an outside designer, engineer, or AI model to review the game, audit the code, and give feedback. You can hand someone *just this file* and they'll understand where the project is and what to critique.

_Last updated: 2026-06-20 · Branch: `main` · Status: productized alpha with playable 5-game **season**, team-as-deck selection, save/resume, seeded run scaffolding, War Room economy, Player Traits, mobile/defense lane depth, boss preview, NFL/DFS-derived calibration notes, Coach Debrief, and balance diagnostics._

---

## 1. What this is

**Gridiron** is a single-player, football-native **card roguelike** — Balatro-style engine-building, but the scoring language is football instead of poker. It lives inside the **Slate Boss** repository, which also contains the original **Classic Slate Boss** (a fictional DFS lineup simulator). Gridiron is now the app product; Classic is preserved only as archived legacy code and is no longer exposed in normal navigation.

- **No real IP.** Fictional teams and players only. No NFL marks, no real names, no real money, no prizes. The architecture is intentionally "license-agnostic" (names are display-only data) so a licensed dataset could drop in later without a rewrite — but that is a far-future dream, not a near-term plan.
- **Design ethos:** clean, text-and-math-forward, mobile-first. The fun is *outsmarting a transparent system*, not graphics. No animation budget beyond small touches.

**The pitch:** Build the deck. Call the play. Beat the defense.

---

## 2. How to run it

```bash
npm install
npm run dev -- --host 127.0.0.1     # http://127.0.0.1:5173/slate-boss/
npm run lint                         # eslint, must pass
npm run build                        # tsc + vite, must pass
npm run balance:gridiron             # Monte-Carlo balance harness (skill-gap report)
```

The app boots into the Gridiron title screen → **Kickoff** to play. **How to Play** opens the in-game help. Legacy DFS screens remain in the repository for reference, but the visible product path stays in Gridiron.

---

## 3. The core loop (what a player actually does)

A **season = 5 games**. Win all five (the last is the **Championship**) to win the run; lose any game and the run ends. After each win you visit the **War Room** and spend **Funds** on priced rewards to strengthen your team for the next, harder game — this is the "one more run" engine-building loop. Your deck, coordinators, playbook installs, Funds, and Player Traits **persist across games** within a run.

Each **game = 3 drives**. Each drive has a **points target that rises** drive to drive and game to game. Clear all three to win the game. The flow per drive:

1. Draw an 8-card hand from your deck. Each card is a **football action** (Deep Ball, Power Run, Deep Catch, Sack, Interception, Field Goal…), and its value is weighted by the source player's archetype.
2. The hand is grouped by role (**QB Pass / Catch / Run / Defense / Kick**) so the player can read the football grammar quickly.
3. Tap **up to 4 cards** to assemble a play. A live **preview** shows the play's name and full score *before* you commit — this is the hero UI.
4. **Run the play** → its points add to the drive score; the cards are spent, then a staged **Scoring Sequence** recaps Base → Execution → Big Play → Final. Or **Audible** (3/drive) to throw selected cards back and redraw, spending no budget.
5. Hit the target → bank the drive, advance (fresh hand/budget). Run out of **Play Budget** below the target → the drive stalls and the run ends.

The first game includes a contextual **Coach's First Drive** panel that teaches the key grammar: QB Pass + same-team Catch = Stack TD. It disappears after the first taught play.

**Scoring is deterministic.** Variance lives entirely in the **draw**, never in a hidden roll — so the ledger is always teachable and every win/loss is on the player.

---

## 4. The three systems that make it an engine, not a calculator

### 4a. Three-channel scoring (fixes the "one big play wins" problem)
```
drivePoints = Base × (1 + Execution) × BigPlay
```
- **Base** (green) — raw yards from the cards. The fuel.
- **Execution** (blue) — flat additive bonus from clean concepts (Stack TD +0.6, Ground & Pound +0.4…). Reliable.
- **Big Play** (gold) — multiplier from elite synergies (Double Stack ×1.5, Shootout ×1.4, Pick Six ×1.6…). Explosive.

A build needs all three; pumping one channel stalls. Keeping them separate and visible is what stops a single Double-Stack Bomb from trivializing a target.

### 4b. Play Budget (the DFS salary cap, folded into the play resource)
Every card has a **cap cost** (1–4, by the source player's salary tier; kick/defense overridden). Each drive grants a budget (24 / 26 / 28); you call as many plays as you can afford. Cheap value cards buy *more* plays; expensive studs hit harder but drain the cap. This is the DFS soul, re-expressed — and it is **one** resource, not a fourth one bolted on top of a play counter (a deliberate design call; see §8).

### 4c. Scaling coordinators (the compounding engine)
Coordinators are persistent buffs that **grow as you play** — the difference between a calculator and an engine. You start with 2 and can hire up to 5 via rewards. Examples:
- **Air Raid Coordinator** — +0.25 Execution on stack plays for every stack you've *already* completed this match (within-game ramp).
- **Bell Cow** — +13 Base per run card, and +6 *permanent* Base each Ground & Pound this match (within-game ramp).
- **Franchise QB** — +0.20 Big Play on every play for each *earlier game* in which you landed a Bomb (**season-long ramp**).
- **Read-Option Guru / The Improviser / Broken Play Artist** — the Volts mobile-QB lane: within-game QB-run ramp, season-long keeper scaling, and busted-play rescue.
- **Pressure Chain / Takeaway Machine** — the Ghosts defensive lane: within-game defensive pressure ramp and season-long takeaway scaling.
- Plus West Coast Guru, Ball-Hawk DC, Salary Wizard in the reward pool.

You can watch their values tick up on the scoreboard.

### 4d. War Room, Funds & the Game Plan (run progression + commitment)
After each win, you enter the **War Room** with **Funds**. Wins pay a purse, banked Funds earn light interest, rerolls cost Funds, and skipping the shop banks a small bonus. You can buy up to two rewards per visit. The keystone is the **Game Plan**: level up a play concept (Stack TD, Ground & Pound, Pick Six…). Each level adds flat scoring *and*, once it's your core play (Lv 2+), a **growing Big Play (X-mult)**. Other buys include coordinators, player cards, trims, upgrades, and Training rewards that add Player Traits.

### 4e. Player Traits (card modifiers)
Some Training rewards permanently tag one card with a football-native trait:
Reliable, Explosive, Discounted, Clutch, Protected, or Hot Route. Traits show as card badges and emit scoring ledger lines when triggered. They make individual cards feel developed without adding a new screen.

### 4f. Geometric targets — the early-flat → late-multiplicative pivot
Targets escalate **~24% per game (geometric)** plus a Championship bump. Flat Base/Execution plateaus against that curve (adding +40 base to a 3000-point target is noise), so a committed **multiplicative engine** (leveled Game Plan × scaling coordinators × Player Traits) becomes *required* to win the late season. This is the power curve the design was missing: early games reward flat value; late games demand the compounding engine.

**Anti-spam:** repeating the same concept in a drive applies ×0.85 Big Play ("Defense Adjusted") to push varied play-calling.

**Weather:** each match rolls a weighted condition (Clear 45 / Dome 25 / Wind 12 / Snow 8 / Primetime 10) from the NFL/DFS calibration pass. Conditions shift the math — e.g. Snow punishes passing and rewards the ground game — but normal games are now much more common than bad-weather chaos.

### 4g. Boss defenses (adaptation pressure)
From Game 2 onward, each match shows an opposing defensive scheme on the scoreboard. These are the Boss Blind analogs: they counter a style without deleting it, forcing a supporting plan.

- **No-Fly Zone** — deep stacks lose Big Play; short passing stays efficient.
- **Stacked Box** — run concepts lose Base; stacks get a play-action window.
- **Turnover Drill** — defensive splash plays lose Big Play; clean offense gains Execution.
- **Adaptive DC** — repeated concepts are punished harder.

---

## 5. Balance snapshot

Measured with the **permanent** harness — `npm run balance:gridiron` (`scripts/gridironBalance.ts`), ~2000–3000 seasons per policy. It plays full seasons under four reward policies and prints two gaps:

| Reward policy | Champion | Per-game clear (G1→G5) |
|---|---|---|
| **Synergy** — commit to one Game Plan + feed it | **53.0%** | 98 · 88 · 80 · 74 · 53 |
| Naive — grab coordinators, don't commit | 30.9% | 97 · 89 · 78 · 66 · 31 |
| Random — any reward | 10.7% | 97 · 79 · 53 · 35 · 11 |
| None — skip all rewards | 0.0% | 98 · 72 · 23 · 1 · 0 |

- **Build gap (best − none): 53.0 pts ✅** — building is decisive.
- **Reward gap (synergy − random): 42.3 pts ✅** — picking well clearly beats random.
- **Commitment gap (synergy − naive): 22.1 pts** — *committing* to one Game Plan and stacking it beats grabbing pieces without a plan. This is the strategic spine.
- **Per-team viability:** Ironhawks 53.0%, Blazers 53.3%, Stormers 52.7%, Volts 51.5%, Ghosts 55.8%; spread 4.3 pts ✅, competitive teams 5/5 ✅, dead-draw losses 6.5% ✅.
- **Per-lane commitment:** pass 48.3%, ground 47.7%, defense 58.8%, mobile 51.3%; spread 11.1 pts 🟡, all four lanes viable.
- **Economy:** smart-spend gap 42.3 pts ✅; greedy vs patient gap 2.7 pts ✅, so spend-now vs bank is a real decision.

History: the build started with smart ≈ random (~1-pt gap — meta-layer was noise). It was fixed in stages: lean-aware keystone rewards + a starter-deck ratio fix (catch-flood → reliable stacks), then the **game-theory pass** that added leveled **Game Plan** commitment and a **geometric** target curve. The latest pass added boss defenses, first-drive onboarding, build identity surfacing, reward impact projections, grouped hands, and staged scoring feedback. Tunables: `DRIVE_TARGET`/`DRIVE_BUDGET`, `GAME_PLAN_STEP`/`GAME_PLAN_COMMIT_XMULT`, `FB_BOSS_SCHEMES`, `cardsForPlayer`/`buildStarterDeck` (`footballRogue.ts`); `gameTargets` geometric scale + reward catalog/build helpers (`footballRun.ts`). **Keep the harness committed and re-run it on every balance change.**

---

## 6. Code map (what to audit)

**Engine / run logic (pure, no React, no `Math.random` in scoring):**
- `src/lib/footballRogue.ts` — card model, Player Traits, team deck factories (from `seedData.ts` fictional players), three-channel `scoreFootballPlay`, structured ledger metadata, coordinators, mobile/defense lane hooks, weighted environments, boss defenses, free-agent cards, tunables.
- `src/lib/footballRun.ts` — season run state (`FbRunState`), seeded run helpers, `gameTargets` escalation, reward catalog + `generateRewards`, lane-aware reward shelves, War Room reward hydration, build identity helpers, reward impact projections, Coach Debrief.
- `src/lib/gridironCalibration.ts` — read-only calibration constants derived from the local `nfl_dfs` research folder; use them to tune fictional archetypes and match conditions, not to ship NFL content.
- `src/lib/gridironEconomy.ts` — Front Office Funds, win purse, interest, reroll/skip economy, War Room purchase cap.
- `src/lib/gridironStorage.ts` — versioned Gridiron save/resume state under `gridiron_run_v1`.

**UI (React, inline styles + shared tokens):**
- `src/components/footballStyles.ts` — design tokens (the single source of visual truth).
- `src/components/FootballHome.tsx` — title screen.
- `src/components/FootballSeason.tsx` — orchestrates the run (match → reward → summary).
- `src/components/FootballMatch.tsx` — one game (scoreboard, hand, live preview/ledger).
- `src/components/FootballReward.tsx` — the War Room shop: Funds, priced rewards, reroll, skip/bank, next scout.
- `src/components/FootballRunSummary.tsx` — end-of-season summary.
- `src/components/FootballHelpModal.tsx` — in-game How to Play (reads engine data so it can't drift).
- `src/App.tsx` — routing; boots to `football_home`. `src/index.css` — global theme + keyframes.

**Untouched / legacy (do not need review for Gridiron):** `simulation.ts`, `LineupBuilder.tsx`, `rogueScoring.ts` and the rest of Classic Slate Boss.

---

## 7. Roadmap

**Done:** core match loop, three-channel scoring, Play Budget, scaling coordinators (incl. season-long Franchise QB), the **5-game season shell**, a **permanent balance harness**, the **skill-decisive rebalance**, the **game-theory pass** (leveled Game Plan + geometric targets), the **clarity/boss pass** — guided first drive, grouped hand, current build identity, reward impact projections, boss defensive schemes, and staged scoring feedback (§3–5) — plus **five team-as-deck identities**, seeded run scaffolding, save/resume, next-game boss/weather scout, War Room/Funds economy, Player Traits, weighted environment calibration, mobile/defense lane depth, per-lane commitment diagnostics, Coach Debrief, and a lightweight Gridiron smoke test.

> **Presentation idea on the table (not yet built):** push Gridiron as a landscape/tablet-first app for more screen real estate (coordinators + Game Plans + hand side-by-side). Worth prototyping once content (teams/bosses) lands; the current layout is mobile-portrait single-column.

**Next, in order** (productized alpha, still design-flexible):
1. **Film Tools** — one-use consumables, one slot, buyable in the War Room.
2. **War Room clarity** — label reward cards by decision lane: Engine, Counter, Consistency, Value, Risk.
3. **Coordinator ordering + containment** — resolve coordinators left-to-right, expose up/down controls, and make bigger concepts trigger contained concept effects where readable.
4. **Daily challenge + stronger share strings** — the seed path exists; next step is a daily seed entry point and replayable summary.
5. **More deck manipulation rewards** — copy/convert/cost-reduce/respec in small, readable doses.

Deferred: art/animation, accounts/backend, multiplayer, real-money, large content catalogs.

---

## 8. Open questions / things to challenge

1. **Pacing:** skilled play wins ~53% of seasons after boss schemes (random ~11%, un-built ~0%). Is this too punishing for kids/testers, or a good roguelike baseline?
2. **Team identity feel:** five team decks are viable in the harness. Do players *feel* those identities strongly enough, especially Volts and Ghosts?
3. **Play Budget vs. a separate currency:** we folded the cap into the play resource rather than adding a 4th scarce resource. Right call, or does a distinct wallet add depth?
4. **Three channels on a small screen:** clarifying, or too much math at once for a casual player?
5. **Cognitive load:** is "season → 5 games → 3 drives each" clear, or one nesting level too many?
6. **Onboarding:** first-drive coach exists now. Does it teach enough without slowing repeat runs?
7. **Save granularity:** current persistence resumes the current season at the game/reward level. Is that enough for alpha, or do testers expect exact mid-drive restore?

---

## 9. Design pillars to grade against

- **Engaging** — many real decisions per match; the live ledger updates as you tap; instant comprehension (QB + his WR = "Stack TD," number jumps).
- **Strategic** — Play Budget trade-offs, three balanced channels, scaling coordinators, varied play-calling vs. anti-spam, weather.
- **Challenging** — rising targets, lose-on-stalled-drive, defense adapts to spam.
- **Rewarding** — coordinators that compound (number-go-up), a transparent ledger that explains *why* you won or lost.
- **Clean first** — text/number-forward, mobile-first, no art dependency.

Feedback most useful on: **is the core loop fun enough to justify building the season shell, and what should change before we do?**
