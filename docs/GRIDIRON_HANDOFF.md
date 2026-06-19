# Gridiron — Reviewer / Audit Handoff

> A self-contained packet for an outside designer, engineer, or AI model to review the game, audit the code, and give feedback. You can hand someone *just this file* and they'll understand where the project is and what to critique.

_Last updated: 2026-06-19 · Branch: `main` · Status: playable 5-game **season** with a reward loop, scaling coordinators, and a polished UI._

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

A **season = 5 games**. Win all five (the last is the **Championship**) to win the run; lose any game and the run ends. After each win you visit the **Front Office** and pick **1 of 3 rewards** to strengthen your team for the next, harder game — this is the "one more run" engine-building loop. Your deck, coordinators, and playbook installs **persist across games** within a run.

Each **game = 3 drives**. Each drive has a **points target that rises** drive to drive and game to game. Clear all three to win the game. The flow per drive:

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
Coordinators are persistent buffs that **grow as you play** — the difference between a calculator and an engine. You start with 2 and can hire up to 5 via rewards. Examples:
- **Air Raid Coordinator** — +0.2 Execution on stack plays for every stack you've *already* completed this match (within-game ramp).
- **Bell Cow** — +8 Base per run card, and +6 *permanent* Base each Ground & Pound this match (within-game ramp).
- **Franchise QB** — +0.15 Big Play on every play for each *earlier game* in which you landed a Bomb (**season-long ramp** — the compounding hook).
- Plus West Coast Guru, Ball-Hawk DC, Salary Wizard in the reward pool.

You can watch their values tick up on the scoreboard.

### 4d. Rewards & playbook (run progression)
After each win, choose 1 of 3: **sign a free-agent card**, **hire a coordinator**, **install a playbook upgrade** (a play concept permanently gains Base/Execution), **trim** your 3 weakest cards (deck thinning → draw your best cards more often), or **Strength & Conditioning** (+Base to your cheapest cards). This is how your engine out-paces the rising targets.

**Anti-spam:** repeating the same concept in a drive applies ×0.85 Big Play ("Defense Adjusted") to push varied play-calling.

**Weather:** each match rolls a condition (Dome / Snow / Wind / Primetime / Clear) that shifts the math — e.g. Snow punishes passing and rewards the ground game.

---

## 5. Balance snapshot

Measured with throwaway harnesses (starter Ironhawks deck, ~600–800 sims):

**Single game** — optimal value-per-credit play wins ~85% of game 1; random wins ~0%.

**Full season (win all 5):**

| Reward policy | Champion | Avg games won | Per-game clear (G1→G5) |
|---|---|---|---|
| Optimal | ~42% | 3.5 / 5 | 94% · 84% · 73% · 59% · 42% |
| Random | ~40% | 3.5 / 5 | 95% · 85% · 74% · 61% · 40% |

So: a skilled run wins the championship ~40% of the time, the difficulty curve declines gently game-to-game, and luck alone never wins. **Caveat:** smart vs. random *reward* choice scores nearly the same right now — reward selection isn't yet strategically decisive (see §8). Tunables live at the top of `src/lib/footballRogue.ts` (`DRIVE_TARGET`, `DRIVE_BUDGET`) and `src/lib/footballRun.ts` (`SEASON_GAMES`, `gameTargets` escalation).

---

## 6. Code map (what to audit)

**Engine / run logic (pure, no React, no `Math.random` in scoring):**
- `src/lib/footballRogue.ts` — card model, deck factory (from `seedData.ts` fictional players), three-channel `scoreFootballPlay`, coordinators, environments, free-agent cards, tunables.
- `src/lib/footballRun.ts` — season run state (`FbRunState`), `gameTargets` escalation, the reward catalog + `generateRewards`.

**UI (React, inline styles + shared tokens):**
- `src/components/footballStyles.ts` — design tokens (the single source of visual truth).
- `src/components/FootballHome.tsx` — title screen.
- `src/components/FootballSeason.tsx` — orchestrates the run (match → reward → summary).
- `src/components/FootballMatch.tsx` — one game (scoreboard, hand, live preview/ledger).
- `src/components/FootballReward.tsx` — the Front Office 3-choice reward screen.
- `src/components/FootballRunSummary.tsx` — end-of-season summary.
- `src/components/FootballHelpModal.tsx` — in-game How to Play (reads engine data so it can't drift).
- `src/App.tsx` — routing; boots to `football_home`. `src/index.css` — global theme + keyframes.

**Untouched / legacy (do not need review for Gridiron):** `simulation.ts`, `LineupBuilder.tsx`, `rogueScoring.ts` and the rest of Classic Slate Boss.

---

## 7. Roadmap

**Done:** core match loop, three-channel scoring, Play Budget, scaling coordinators (incl. season-long Franchise QB), the **5-game season shell**, and the **3-choice reward loop** (cards / coordinators / playbook installs / trim / upgrade).

**Next, in order:**
1. **Teams as decks** — 5 fictional team identities (Air Raid, Ground Control, Mobile-QB, Defense, Balanced), each a distinct starter deck + signature coordinator + cost discounts. Names stay display-only data (license-agnostic). This is what makes runs feel different.
2. **Boss schemes** — opposing defenses shown before the Championship (and maybe mid-season) that counter specific builds (No-Fly Zone, Stacked Box, …). These also make *reward choice* matter more (see §8).
3. **Persistence** — save the run to `localStorage` so a plane session survives a closed tab.
4. **Onboarding** — a contextual guided first drive; daily seeded challenge + share string.
5. Reorderable coordinator slots; a between-game cap-budget economy.

Deferred: art/animation, accounts/backend, multiplayer, real-money, large content catalogs.

---

## 8. Open questions / things to challenge

1. **Reward choice barely matters yet.** In simulation, picking rewards smartly (~42% champion) scores about the same as picking randomly (~40%). The rewards all keep pace with the target curve, but none is clearly *better* given the deck — so there's little strategic agency in the Front Office yet. Bosses (which punish specific builds) and teams (which bias your deck) should fix this, but it's the #1 thing to pressure-test. Should rewards be more differentiated / situational now?
2. **Pacing:** ~42% optimal championship rate, gentle curve. Too easy, about right, or should the championship bite harder?
3. **Play Budget vs. a separate currency:** we folded the cap into the play resource rather than adding a 4th scarce resource. Right call, or does a distinct wallet add depth?
4. **Three channels on a small screen:** clarifying, or too much math at once for a casual player?
5. **Cognitive load:** is "season → 5 games → 3 drives each" clear, or one nesting level too many?
6. **Onboarding:** help modal exists but no guided first drive. Where's the line between teaching and a tutorial wall?
7. **Deck identity:** one starter deck means runs feel samey until teams-as-decks lands. Does the loop hold up in the meantime?

---

## 9. Design pillars to grade against

- **Engaging** — many real decisions per match; the live ledger updates as you tap; instant comprehension (QB + his WR = "Stack TD," number jumps).
- **Strategic** — Play Budget trade-offs, three balanced channels, scaling coordinators, varied play-calling vs. anti-spam, weather.
- **Challenging** — rising targets, lose-on-stalled-drive, defense adapts to spam.
- **Rewarding** — coordinators that compound (number-go-up), a transparent ledger that explains *why* you won or lost.
- **Clean first** — text/number-forward, mobile-first, no art dependency.

Feedback most useful on: **is the core loop fun enough to justify building the season shell, and what should change before we do?**
