# Gridiron — Reviewer / Audit Handoff

> A self-contained packet for an outside designer, engineer, or AI model to review the game, audit the code, and give feedback. You can hand someone *just this file* and they'll understand where the project is and what to critique.

_Last updated: 2026-06-22 · Branch: `gridiron-ux-sprint` (PR #5 → `main`) · Status: productized alpha with playable 5-game **season**, team-as-deck selection, save/resume, seeded run scaffolding, War Room economy, Player Traits, mobile/defense lane depth, boss preview, NFL/DFS-derived calibration notes, Coach Debrief, balance diagnostics, plus a UX sprint: play-resolution **theatre**, a **coach + team-palette identity** layer, a **War Room card draft**, a **Team Select grid**, and a local **retention layer** (run history + Daily Scrimmage seed)._

---

## 1. What this is

**Gridiron** is a single-player, football-native **card roguelike** — Balatro-style engine-building, but the scoring language is football instead of poker. It lives inside the **Slate Boss** repository and is now the active app product. The original Classic Slate Boss DFS simulator has been removed from the active source tree and remains recoverable from the archive branch/tag.

- **No real IP.** Fictional teams and players only. No NFL marks, no real names, no real money, no prizes. The architecture is intentionally "license-agnostic" (names are display-only data) so a licensed dataset could drop in later without a rewrite — but that is a far-future dream, not a near-term plan.
- **Design ethos:** clean, text-and-math-forward, mobile-first. The fun is *outsmarting a transparent system*, not graphics. Motion is now used deliberately for *celebration and weight* (a play-resolution theatre layer — see §3/§4h), but every animation is skippable on tap and fully disabled under `prefers-reduced-motion`. No bitmap art, no generative art; decoration is color + geometry + motion only.

**The pitch:** Build the deck. Call the play. Beat the defense.

---

## 2. How to run it

```bash
npm install
npm run dev -- --host 127.0.0.1     # http://127.0.0.1:5173/slate-boss/
npm run lint                         # eslint, must pass
npm run build                        # tsc + vite, must pass
npm run smoke:gridiron               # server-renders every screen; must pass
npm run balance:gridiron -- 3000     # Monte-Carlo balance harness (skill-gap report)
```

The app boots into the Gridiron title screen → **Kickoff** to play. **How to Play** opens the in-game help. The visible and compiled product path is Gridiron-only.

---

## 3. The core loop (what a player actually does)

A **season = 5 games**. Win all five (the last is the **Championship**) to win the run; lose any game and the run ends. After each win you visit the **War Room** and spend **Funds** on priced rewards to strengthen your team for the next, harder game — this is the "one more run" engine-building loop. Your deck, coordinators, playbook installs, Funds, and Player Traits **persist across games** within a run.

Each **game = 3 drives**. Each drive has a **points target that rises** drive to drive and game to game. Clear all three to win the game. The flow per drive:

1. Draw an 8-card hand from your deck. Each card is a **football action** (Deep Ball, Power Run, Deep Catch, Sack, Interception, Field Goal…), and its value is weighted by the source player's archetype.
2. The hand is grouped by role (**QB Pass / Catch / Run / Defense / Kick**) so the player can read the football grammar quickly.
3. Tap **up to 4 cards** to assemble a play. A live **preview** shows the play's name and full score *before* you commit — this is the hero UI.
4. **Run the play** → the drive score **counts up** to its new total; the cards are spent, then a single canonical **Scoring Sequence** recaps Base → Execution → Big Play → Final in the preview slot. Splash concepts (Double-Stack Bomb, Shootout, Pick Six, QB Keeper) fire a gold full-bleed **banner**; clearing a drive stamps **FIRST DOWN → DRIVE! → TOUCHDOWN!** by drive index. Or **Audible** (3/drive) to throw selected cards back and redraw, spending no budget.
5. Hit the target → bank the drive, advance (fresh hand/budget). Run out of **Play Budget** below the target → a **TURNOVER ON DOWNS** stamp over a dimmed field, then the run ends.

The first game includes a contextual **Coach's First Drive** panel that teaches the key grammar: QB Pass + same-team Catch = Stack TD. On Game 1 / Drive 1 the scoreboard also collapses secondary build/defense/coordinator detail so there's a single teaching voice; the detail returns after the first taught play.

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

### 4h. Theatre & team identity (presentation layer — no engine impact)
The match now *reacts* to a play instead of silently ticking: a requestAnimationFrame **count-up** on the drive score, a gold concept **banner** for splash plays, escalating drive-clear **stamps**, and a red **turnover** stamp on a stall. Each team also has a **face**: a fictional coach (name + signature quote), a two-colour palette, and a geometric single-colour **coach portrait** (`coachIdentity.tsx` / `teamIdentity.ts` — presentation-only; `TEAM_PROFILES` in the engine stays colour/coach-free). The portrait + palette surface as a scoreboard stripe, the War Room header (with boss-aware advice), the Run Summary opener, and the Team Select cards. All motion is tap-skippable and honors `prefers-reduced-motion`.

### 4i. Retention layer (local, no accounts)
A **Daily Scrimmage** entry on Home seeds a deterministic run from the UTC date. Completed runs are written to a local **run history** (`gridiron_history_v1`, last 10), and the **best run** surfaces on Home and the Run Summary. Run score is the **season cumulative** (sum of every match's points). No leaderboard, no accounts, no server — see §8 for whether this is enough.

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
- `src/lib/gridironStorage.ts` — versioned Gridiron save/resume under `gridiron_run_v1`, plus run history (`gridiron_history_v1`) and best-run selection.

**UI (React, inline styles + shared tokens):**
- `src/components/footballStyles.ts` — design tokens (the single source of visual truth).
- `src/components/teamIdentity.ts` — per-team palette, fictional coach name, quote, play-style tag (presentation data; engine stays colour/coach-free).
- `src/components/coachIdentity.tsx` — geometric single-colour `CoachPortrait` SVG (no real people, no licenses).
- `src/components/FootballHome.tsx` — title screen, resume/new, Daily Scrimmage, best-run recap.
- `src/components/FootballTeamSelect.tsx` — 2-up grid of 3:4 team cards (palette + coach portrait + play-style + difficulty) → detail → Start.
- `src/components/FootballSeason.tsx` — orchestrates the run (match → reward → summary); accumulates season score; threads the optional daily seed.
- `src/components/FootballMatch.tsx` — one game (scoreboard + coach stripe, grouped hand, live preview, canonical scoring sequence, count-up, banners/stamps).
- `src/components/FootballReward.tsx` — the War Room **card draft**: coach advice header, 3-up reward grid with lane-glow tier badges, two-tap buy via a detail sheet, dedicated bank/skip tile, reroll, next scout.
- `src/components/FootballRunSummary.tsx` — coach opener, season score, local-best comparison, share string, debrief.
- `src/components/FootballHelpModal.tsx` — in-game How to Play (quick-start + full reference toggle; reads engine data so it can't drift).
- `src/App.tsx` — minimal routing between the Gridiron title screen and season flow.
- `src/index.css` — global theme + keyframes (incl. banner/stamp/count-up motion and the `prefers-reduced-motion` block).

Classic Slate Boss source has been removed from the active app tree. Historical
DFS and AI review material lives in `docs/archive/`; the playable classic code is
recoverable from the `archive/classic-dfs-sim` branch and `classic-dfs-sim-2026-06-17` tag.

---

## 7. Roadmap

**Done:** core match loop, three-channel scoring, Play Budget, scaling coordinators (incl. season-long Franchise QB), the **5-game season shell**, a **permanent balance harness**, the **skill-decisive rebalance**, the **game-theory pass** (leveled Game Plan + geometric targets), the **clarity/boss pass** (guided first drive, grouped hand, current build identity, reward impact projections, boss defensive schemes), plus **five team-as-deck identities**, seeded run scaffolding, save/resume, next-game boss/weather scout, War Room/Funds economy, Player Traits, weighted environment calibration, mobile/defense lane depth, per-lane commitment diagnostics, Coach Debrief, and a Gridiron smoke test. **UX sprint (PR #5):** play-resolution **theatre** (count-up, concept banners, drive/turnover stamps; reduced-motion safe), a **coach + team-palette identity** layer, the **War Room card draft** with decision-lane tier badges and two-tap buy, the **Team Select grid ritual**, a quick-start Help split, and the **retention layer** (run history + best-run recap + Daily Scrimmage seed + season-cumulative score).

> **Presentation idea on the table (not yet built):** push Gridiron as a landscape/tablet-first app for more screen real estate (coordinators + Game Plans + hand side-by-side). The current layout is mobile-portrait single-column.

**Scaling sprint (Balatro-depth pass — implemented):** run **codes** (team + seed, copy/paste to replay a run); reward **taxonomy** (rarity-as-label Common→Legendary, category, lane, role) with chips in the War Room and recap; **boss intro** reveal cards from Game 2 (name, flavor, what it punishes, counter); auto-generated **build titles** ("Volts Keeper Engine") in recap/share; an opt-in **Overtime** score-chase after the Championship (separate escalating curve, tracks furthest round / best drive / OT score; campaign balance untouched); an **effect-kind taxonomy** (base / execution / bigplay_mult / scaler / retrigger) + harness **ceiling probes** (campaign p99/median drive ≈ 3.2×, Overtime ceiling ≈ 9.7×); richer **Copy Result / Copy Seed** share cards; and a first **content wave** — 2 coordinators (Rare Power Sweep ground scaler, Legendary Two-Minute Drill retrigger build-around), 4 Film Tools incl. 2 risky **Trick Plays**, a Film Room Expansion Front Office upgrade, and a minimal off-by-default **League Level** (Stakes) ladder. Balance held: synergy champion **53.0%**, all five teams viable, lane spread tightened **11.1 → 9.0**. Deferred: dedicated booster packs, full compendium/unlocks.

**Next, in order** (productized alpha, still design-flexible):
1. **Film Tools** — one-use consumables, one slot, buyable in the War Room.
2. **Boss intro card** — a short full-screen reveal (name, scheme, hint) before each match from Game 2.
3. **Coordinator ordering + containment** — resolve coordinators left-to-right, expose up/down controls, and make bigger concepts trigger contained concept effects where readable.
4. **War Room compare mode** — long-press to pin two rewards side-by-side (the card-draft sheet exists; this is the A-vs-B helper on top).
5. **More deck manipulation rewards** — copy/convert/cost-reduce/respec in small, readable doses.
6. **Sensory feedback** — optional sound + haptics on big plays/clears/stalls (currently the theatre is visual-only).

Deferred: bitmap/generative art, accounts/backend, multiplayer, real-money, large content catalogs.

---

## 8. Open questions / things to challenge

1. **Cold-start Game-1 difficulty (highest-value gap — nothing measures it):** the balance harness only reports *optimized synergy play across full seasons*. It says nothing about a brand-new player, starter deck, no upgrades, Game 1. With a high opening target and a budget that affords ~3 plays, you must hit near-optimal stacks immediately or stall. Is Game 1 survivable for someone who hasn't learned stacking yet — and where exactly does a cold player bounce?
2. **Number legibility / scoring scale:** targets in the high hundreds, multipliers like ×1.40, three channels updating at once. The theatre adds weight, but the raw magnitudes are unchanged. Does the *scale itself* read at a glance, or is it still "tax-software math"?
3. **Retention depth:** Daily Scrimmage is a deterministic seed with no locked challenge, no leaderboard, no "already played today"; run history is local last-10. Is this enough to reopen the app tomorrow, or is it retention theater?
4. **Mobile ergonomics & accessibility:** match-screen scroll length, thumb reach (hand vs. Run button), touch-target sizes, and **color-only encoding** — the three scoring channels *and* the War Room lanes are distinguished purely by color (a colorblind risk). Contrast and screen-reader support are unaudited. We ship `prefers-reduced-motion` and nothing else.
5. **Team identity feel:** five decks are viable in the harness and now have coaches/palettes. Do players *feel* those identities — especially Volts and Ghosts — in play, not just on the select screen?
6. **Three channels on a small screen:** clarifying, or too much math at once for a casual player?
7. **Cognitive load:** is "season → 5 games → 3 drives each" clear, or one nesting level too many?
8. **Onboarding:** first-drive coach + collapsed-clutter focus exist. Does it teach enough without slowing repeat runs? Should the brief's "3 captions / 3 taps" overlay replace the panel entirely on Game 1?
9. **Theatre dosage:** are the banners/stamps the right intensity and frequency, or will they annoy on the 200th run even with tap-to-skip?

---

## 9. Design pillars to grade against

- **Engaging** — many real decisions per match; the live ledger updates as you tap; instant comprehension (QB + his WR = "Stack TD," number jumps).
- **Strategic** — Play Budget trade-offs, three balanced channels, scaling coordinators, varied play-calling vs. anti-spam, weather.
- **Challenging** — rising targets, lose-on-stalled-drive, defense adapts to spam.
- **Rewarding** — coordinators that compound (number-go-up), a transparent ledger that explains *why* you won or lost.
- **Clean first** — text/number-forward, mobile-first, no art dependency.

Feedback most useful on: **is the core loop fun enough to justify building the season shell, and what should change before we do?**
