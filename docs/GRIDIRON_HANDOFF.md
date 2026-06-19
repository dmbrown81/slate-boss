# Gridiron — Reviewer / Audit Handoff

> A self-contained packet for an outside designer, engineer, or AI model to review the game, audit the code, and give feedback. You can hand someone *just this file* and they'll understand where the project is and what to critique.

_Last updated: 2026-06-18 · Branch: `main` · Status: playable single-match prototype with a polished UI._

---

## 1. What this is

**Gridiron** is a single-player, football-native **card roguelike** — Balatro-style engine-building, but the scoring language is football instead of poker. It lives inside the **Slate Boss** repository, which also contains the original **Classic Slate Boss** (a fictional DFS lineup simulator). Gridiron is now the **headline mode**; Classic is preserved but demoted to a secondary "legacy" area.

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
```

The app boots into the Gridiron title screen → **Kickoff** to play. **How to Play** opens the in-game help. A small "Classic Slate Boss (DFS)" link at the bottom reaches the legacy mode.

---

## 3. The core loop (what a player actually does)

A **match = 3 drives**. Each drive has a **points target that rises** drive to drive. Clear all three to win the match. The flow per drive:

1. Draw an 8-card hand from your deck. Each card is a **football action** (Deep Ball, Power Run, Deep Catch, Sack, Interception, Field Goal…), and its value is weighted by the source player's archetype.
2. Tap **up to 4 cards** to assemble a play. A live **preview** shows the play's name and full score *before* you commit — this is the hero UI.
3. **Run the play** → its points add to the drive score; the cards are spent. Or **Audible** (3/drive) to throw selected cards back and redraw, spending no budget.
4. Hit the target → bank the drive, advance (fresh hand/budget). Run out of **Play Budget** below the target → the drive stalls and the run ends.

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
Coordinators are persistent buffs that **grow as you play** — the difference between a calculator and an engine. Starters:
- **Air Raid Coordinator** — +0.2 Execution on stack plays for every stack you've *already* completed this match (within-game ramp).
- **Bell Cow** — +8 Base per run card, and +6 *permanent* Base each Ground & Pound this match.

You can watch their values tick up on the scoreboard. (Season-long scaling coordinators come with the season shell — see §7.)

**Anti-spam:** repeating the same concept in a drive applies ×0.85 Big Play ("Defense Adjusted") to push varied play-calling.

**Weather:** each match rolls a condition (Dome / Snow / Wind / Primetime / Clear) that shifts the math — e.g. Snow punishes passing and rewards the ground game.

---

## 5. Balance snapshot

Measured with a throwaway harness simulating policies over 500 matches (starter Ironhawks deck):

| Policy | Win rate | Notes |
|---|---|---|
| Optimal (value-per-credit) | ~71% | Skilled play is rewarded |
| Random | ~0% | Luck alone never wins |

A player's *first* big play is now ~69% of the drive-1 target (was 118% before the refactor — i.e. it used to clear a drive by itself). Drives take ~2 plays each. All balance constants are tunables at the top of `src/lib/footballRogue.ts` (`DRIVE_BUDGET`, `DRIVE_TARGET`, `HAND_SIZE`, etc.).

---

## 6. Code map (what to audit)

**Engine (pure, no React, no `Math.random` in scoring):**
- `src/lib/footballRogue.ts` — card model, deck factory (from `seedData.ts` fictional players), three-channel `scoreFootballPlay`, coordinators, environments, tunables.

**UI (React, inline styles + shared tokens):**
- `src/components/footballStyles.ts` — design tokens (the single source of visual truth).
- `src/components/FootballHome.tsx` — title screen.
- `src/components/FootballRogueScreen.tsx` — the match (scoreboard, hand, live preview/ledger, end panel).
- `src/components/FootballHelpModal.tsx` — in-game How to Play (reads engine data so it can't drift).
- `src/App.tsx` — routing; boots to `football_home`. `src/index.css` — global theme + keyframes.

**Untouched / legacy (do not need review for Gridiron):** `simulation.ts`, `LineupBuilder.tsx`, `rogueScoring.ts` and the rest of Classic Slate Boss.

---

## 7. Roadmap — the next slice (the season shell)

The current build is **one match deep**. The genre's stickiness comes from a run *above* the match. Planned, in order:

1. **Season shell** — wrap matches in a ~5-game run (`RogueRunState`), escalating across games, lose-on-failed-drive, win the championship.
2. **Reward loop** — after each win, choose 1 of 3: add a card / upgrade a card / cut a card / hire a coordinator. (A simple choice, not a big shop yet.)
3. **Teams as decks** — 5 fictional team identities (Air Raid, Ground Control, etc.), each a distinct starter deck + signature coordinator. Names stay display-only data.
4. **Boss schemes** — 5 opposing defenses shown before the boss drive (No-Fly Zone, Stacked Box, …) that counter specific builds.
5. **Season-scaling coordinators** + reorderable coordinator slots; a between-game economy (cap rollover).

Deferred: art/animation, accounts/backend, multiplayer, real-money, large content catalogs.

---

## 8. Open questions / things to challenge

1. **Pacing:** ~71% optimal win rate — too easy, about right, or should the target curve be steeper so the season's later games *demand* a compounding engine?
2. **Play Budget vs. a separate currency:** we folded the cap into the play resource rather than adding a 4th scarce resource. Is that the right call, or does a distinct per-quarter wallet add meaningful depth?
3. **Three channels on a small screen:** clarifying, or too much math surfaced at once for a casual player?
4. **Cognitive load of "drives":** is 3-drives-per-match intuitive, or should it just be "beat one rising target"?
5. **Onboarding:** there's a help modal but no guided first match. Where's the line between teaching and a tutorial wall?
6. **Deck identity:** with one starter deck, runs feel samey. Does the value proposition hold until teams-as-decks lands?

---

## 9. Design pillars to grade against

- **Engaging** — many real decisions per match; the live ledger updates as you tap; instant comprehension (QB + his WR = "Stack TD," number jumps).
- **Strategic** — Play Budget trade-offs, three balanced channels, scaling coordinators, varied play-calling vs. anti-spam, weather.
- **Challenging** — rising targets, lose-on-stalled-drive, defense adapts to spam.
- **Rewarding** — coordinators that compound (number-go-up), a transparent ledger that explains *why* you won or lost.
- **Clean first** — text/number-forward, mobile-first, no art dependency.

Feedback most useful on: **is the core loop fun enough to justify building the season shell, and what should change before we do?**
