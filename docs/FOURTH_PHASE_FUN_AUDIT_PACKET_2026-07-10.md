# Fourth Phase — Fun & Enjoyment Audit Packet

Date: 2026-07-10
Build reviewed: `36ee297` (main, pushed; deploys to the public build)
Public build: https://dmbrown81.github.io/slate-boss/
Prepared by: the project's chief designer, for peer reviewers (human or LLM)

**How to use this file:** paste the whole thing to a reviewer. It is
self-contained; repo access is a bonus, not a requirement.

The 2026-07-07 packet asked "is this pitchable?" Nine outside reviews answered
"limited cold tests only" and named the problems. Three sprints later, every
consensus fix has shipped (§3). This audit asks a different question:

**Is it FUN? Not correct, not legible, not balanced — fun.** Where does the
joy actually live, where does it die, and what is the highest-leverage way to
make someone who *understands* the game *love* the game?

---

## 1. The Ask (what I want from you)

You are a fun-focused panel: a roguelike designer who has shipped a hit, a
game-feel/juice specialist, a mobile retention designer, a comedy/personality
writer for games, and one ordinary player who does not care how clever the
math is.

Your job is not to re-litigate clarity or balance (that work is done and
measured — challenge interpretations, not arithmetic). Your job is to map the
emotional experience of a run and tell me where it flatlines.

Deliver your review in this exact shape:

1. **Blunt verdict** — Did you have fun? When exactly? Would you *choose* to
   play a third run over opening another game? Is this a game people respect
   or a game people love — and what is the one change that moves it from the
   first column to the second?
2. **The fun curve** — narrate a full run (title → team → 3 drives → War
   Rooms → verdict) as an emotion graph. Mark every peak, every flatline, and
   every moment of dread/anticipation. A roguelike lives on "one more run" —
   name the exact beat that triggers it here, or say it is missing.
3. **Scores 1-10** — moment-to-moment joy, decision tension, reward cadence,
   surprise/variety per run, personality/voice, comeback drama (losing runs),
   winning-moment payoff, daily/retention pull, "one more run" force,
   friction (10 = frictionless).
4. **Top 10 fun-killers, ranked.** For each: the beat where fun dies, what the
   player feels, and the smallest practical fix. Look hard at: mid-drive
   repetition (8 calls can feel like the same decision 8 times), the second
   drive (no boss, no novelty), losses that are diagnosed but not *felt*, and
   any place the game explains when it should celebrate.
5. **Delight backlog — top 10 additions ranked by joy-per-effort.** Not
   systems overhauls: the small, loud things (a coach with an actual
   personality? crowd chants tied to your playbook? trash talk from the boss
   defense? a "call of the game" replay line? streak fire on the title
   screen?). For each: what it costs, what it makes the player feel, and
   where it sits in the run.
6. **Variety audit** — with 29 jokers, 10 situations, 7 bosses, 6 playbooks,
   4 stakes, and a daily: how many runs before two runs feel identical? What
   is the cheapest source of run-to-run surprise this design is missing
   (events? rule-bending drives? weather? rivalry games?) that does not
   violate the constraints in §10?
7. **Personality pass** — the coach speaks in the War Room and diagnoses your
   losses; bosses have names and one-line effects; playbooks have identities.
   Does any of it have an actual voice? Where would 20 lines of sharp writing
   buy more fun than 20 hours of engineering?
8. **Retention honesty** — the daily now has a Wordle-style emoji grid share,
   streaks, and a countdown. Would anyone actually post the grid? Would *you*
   come back tomorrow? If not, what is the missing hook — and is it mechanical
   (daily modifiers?) or social (comparing exact runs via run codes?)?
9. **The losing question** — 25-47% of skilled runs at higher stakes end in
   RUN OVER. Balatro makes losing fun. Does Fourth Phase? What would make a
   player screenshot a *loss*?
10. **Go/next-sprint call** — name the single sprint (1-2 weeks) that buys the
    most fun, with a concrete scope. Then name the thing I am probably
    planning to do that I should *not* do yet.

Finish with this rubric:

```text
Fun verdict (loved it / liked it / respected it / endured it):
The best 5 seconds of the game:
The deadest 30 seconds of the game:
Top 3 fun-killers to fix now:
Top 3 delight adds (joy-per-effort):
One system to add variety with:
One thing to write, not build:
One thing that is secretly already fun (protect it):
One thing that pretends to be fun but is not (cut or fix):
```

### Hard constraints (do not spend words fighting these)

- Local-first, single-player, fictional. No backend, accounts, multiplayer,
  global leaderboards, analytics, payments, betting, prizes, DFS framing, or
  licensed league/team/player IP.
- Scoring stays deterministic: no hidden rolls. Variance comes from seeded
  draws and player decisions only.
- The scoring contract is fixed: `points = Yards × (1 + Leverage) × Explosive`.
- The preview must never lie: preview and execution score through the same code.
- Field position / downs simulation stays behind its documented gate.

Low-value feedback: "add multiplayer," "use real teams," "needs polish"
without a beat attached, and anything the 07-07 panel already said that §3
shows shipped.

---

## 2. What Fourth Phase Is (60-second version)

A fictional single-player football card roguelike — Balatro's skeleton in a
trading-card locker-room skin. Vite + React + TypeScript, Capacitor shells,
deployed as a PWA.

Four phases, one equation, no hidden rolls:

| Phase | Color | Job | Fantasy |
| --- | --- | --- | --- |
| Offense (OFF) | Blue | Base Yards; first OFF card cashes momentum | Playmakers |
| Defense (DEF) | Red | Leverage (execution multiplier) | Stops, pressure |
| Special Teams (ST) | Gold | Off-equation fuel: draws, money, discounts | Hidden yards |
| Crowd (CRD) | Purple | Charges the Momentum meter | Stadium noise |

The one lesson: **Crowd builds momentum. Offense cashes it. Order matters.**
Cards resolve left to right; the same cards in the wrong order score less.

Run shape: 3 drives, 8 calls per drive, up to 5 cards per call, drive target
per drive, War Room draft between drives, boss defense on the final drive
(earlier at higher stakes). Run codes (`FP-BAL-1YAJ1WY-S2`) reproduce any run
exactly. Daily challenge shares one UTC seed across all players.

---

## 3. What Shipped Since the 07-07 Review (evaluate whether it worked)

The nine-model consensus named five problems. All five were acted on:

1. **"No clip moment — the cash-in is a receipt."** → **The Play Unfolds**
   cinematic (Sprint 2): a signature cash-in (Explosive ≥ x3.5 or 150+ pts)
   interrupts full-screen — cards slam left to right with ticks, the equation
   builds term by term, a 280ms hit-stop, then the momentum bar drains into a
   counting-up score with a situation stamp and a pink-noise crowd roar. Once
   per drive, skippable, never during the tutorial, reduced-motion safe. The
   stadium murmur now follows the meter continuously — the meter IS the crowd.
2. **"First 60 seconds overload."** → Onboarding pass (Sprint 1): first run
   auto-locks to Rookie (the stake ladder appears only after a career win),
   the tutorial's first boss pool got gentler, run one speaks only two nouns
   (Yards, Momentum) with the full equation vocabulary arriving after the
   tutorial, and a diagnostic coach line names each classic mistake once per
   run ("You built momentum to x3.2 but didn't score with it...").
3. **"War Room is an optional stat shop."** → Sprint 3: stake retune makes
   drafting load-bearing (skipping the War Room costs the run from Pro up —
   noDraft 48.6% at Pro), rarity pricing ($4/$5/$6 + $3 drills), and a scene:
   the coach speaks first in his own voice naming the next drive's problem,
   offers read INSTALL/DRILL, coach's-call sticker, "Take the field."
4. **"Stakes unproven."** → The harness now validates the full ladder (§8):
   synergy 81.0 → 71.7 → 67.0 → 53.4 across Rookie→Legend, monotonic, Legend
   inside its 20-55% "hard game, still a game" band. Legend plays with hand
   size 7 — a rule change, not just bigger numbers.
5. **"Woodchipper fear" / "situations might be decorative."** → Measured, not
   argued: a greedy pilot (plays the highest preview, never reorders, blind
   coach-pick drafting — the cold-player proxy) wins **74.5%** at Rookie; a
   mono pilot spamming the one obvious combo wins **40.7%** vs synergy's 81%.
   The preview carries cold players; the other situations are load-bearing.

Since then (this build): the 3,100-line UI monolith was extracted into 11
focused modules; an **art vertical slice** shipped (every card face now
carries a duotone ink illustration per phase — chalk routes, X-front stunts,
uprights, stadium bowl — plus a night-game stadium hero on the title binder
and an animated holo sheen on foil editions); and the **daily got its Wordle
loop** — per-drive emoji grid (🟩 setup calls, 🟨 the clearing call, 🟥 a
drive that died), one-tap copy on the run-end screen, re-share from the title,
next-daily countdown, streak line:

```text
Fourth Phase Daily 2026-07-10
W · 3/3 drives · 512 pts · 🔥4
🟩🟩🟩🟨
🟩🟨
🟩🟩🟩🟩🟩🟨
FP-BAL-1A2B3
```

**Still true and on the record:** the human cold-player test has never been
run. Sound is functional cues, not music. There are zero raster art assets —
everything is CSS/SVG. There is no run-history screen, no events/modifiers
system, and drive 2 has no unique identity.

---

## 4. The Run, Beat by Beat (audit this as an emotion graph)

1. **Title** — leather binder, stadium hero scene, Play / Continue / Daily
   (+ streak, grid re-share, next-daily countdown), career tiles.
2. **Playbook select** — 6 insert cards with identity lines and signature
   jokers; locked ones show live unlock progress. Stake ladder after first win.
3. **Drive intro** — full-screen beat: DRIVE N/3, target, scouting report or
   boss-on-field card, resources, Kickoff button.
4. **The drive** — 8 calls. Per call: read hand → build the Call Script
   (order badges, CHARGE/CASHES tags) → preview shows situation, verb chip,
   exact equation, warnings (boss, momentum bleed, better-order coach button
   with exact +delta) → Run Series → staged Series Result breakdown, floating
   +N, field-strip football advances, coach diagnosis if you fumbled the
   concept. Signature cash-ins trigger the cinematic (once per drive).
5. **Drive cleared** — full-screen DRIVE N CLEARED stamp (or the cinematic
   already owns the moment), then the **War Room**: coach quote naming the
   next problem, 3 joker offers + 1 drill, coach's pick, reroll, skip-banks-$3.
6. **Final drive** — boss active (Stacked Box halves Offense yards, Got Your
   Number zeroes repeats, Road Game caps the meter...), boss warnings in the
   preview.
7. **Verdict** — RUN WON / RUN OVER ink stamp, loss diagnosis (one grounded
   reason + one actionable tip), best-series/drives/boss tiles, unlock
   banners, daily grid + share, run code, Run it back / next stake / replay
   seed / PNG share card.

Core constants: 3 drives; 8 calls; hand 8 (7 at Legend); 5 cards per series;
2 redraws; 5 joker slots; momentum x1.0 base, x6.0 base cap, x12 absolute;
52-card deck, 4 phases × 13 ranks.

---

## 5. The Feel Inventory (what exists today)

- **Sound**: WebAudio-generated cues only — card tick, series click, cash
  arpeggio, huge-series arpeggio, drive chime, kickoff thump, win fanfare,
  loss groan, register ding, continuous crowd murmur that tracks the meter,
  pink-noise roar in the cinematic. No music. Sound on by default; persisted.
- **Haptics**: paired pulses on mobile for tap/cash/signature/win/loss.
- **Animation**: press-squash cards, floating +N, popping LED digits, screen
  flash/shake tiers, CASHED stamp, verdict stamp, drive-clear banner, the
  cinematic, breakaway streak on 100+ point series, foil sheen on editions.
  All reduced-motion safe.
- **Art**: procedural. Phase-inked card illustrations (2 variants per phase,
  stable per rank), stadium hero title scene, patch emblems, field-strip
  progress bar, wood/leather/card-stock surfaces. No image files.

Open feel questions: does the cinematic earn its interruption on the 30th
viewing? Is once-per-drive the right rarity? Which beat between series is
dead air, and which needs *more* air?

## 6. Systems Snapshot (for reference, not re-review)

**Situations** (poker hands, priority order): Complementary Football (all 4
phases, apex), Momentum Shift, Shot Play (OFF+CRD, the main cash-in), Sudden
Change, Crowd Surge, Field Flip, Defensive Stand, Sustained Drive, The
Checkdown, Busted Play. Football-call combos fire from card adjacencies as
sticker badges with exact values.

**Bosses**: Stacked Box (OFF yards halved), No-Fly Zone (only two OFF cards
clean), Road Game (meter capped x2.0), Ball Security (DEF leverage cut),
Touchback Machine (ST fuel suppressed), Got Your Number (repeats score 0),
Prevent Defense (Explosive capped).

**Jokers**: 29 in catalog, 5 slots, drag-to-reorder matters (event listeners),
rarities core/rare/legendary, one signature per playbook, football names
(Twelfth Man, Hurry-Up, Decibel Record...).

**Stakes**: Rookie (baseline) → Pro (targets +20%) → All-Pro (+26%, boss from
Drive 2) → Legend (+42%, boss from Drive 2, hand size 7).

## 7. Balance Evidence (3000-sample harness, this exact build)

```text
synergy  win=81.0%  median=1918   random  win=2.4%   noDraft  win=64.4%
greedy (cold-player proxy: highest preview, no reorder)  win=74.5% at Rookie
mono (one-combo spam)  win=40.7%  — vs synergy 81.0%
Playbook viability spread: 78.0–83.4% (5.4 pts)   Draft impact: +16.7 win pts

Stake ladder          synergy   greedy   noDraft
  Rookie               81.0%    74.5%    64.4%
  Pro                  71.7%    62.5%    48.6%
  All-Pro              67.0%    55.8%    45.9%
  Legend               53.4%    35.1%    31.4%

All 7 hard gates + all stake-ladder advisories pass.
```

Interpretation to challenge: the game is now *provably* fair, learnable, and
deep — and none of those numbers measure whether it is a good time. That is
your job.

## 8. Chief Designer's Own Fun Hypotheses (attack these)

Where I currently believe the fun lives and dies — disagree with evidence
from your own read of the build:

- **Lives:** the reorder moment (watching +112 appear because you swapped two
  cards); the cinematic's hit-stop; the first Legend hand when you realize
  hand-7 changes everything; the daily grid when all three rows are short.
- **Dies:** calls 3-6 of a drive you are already winning (no tension, same
  decision); drive 2 at Rookie (no boss, no novelty — pure execution); the
  War Room when no offer answers the boss (feels like shopping in the wrong
  store); losses (diagnosed cleanly, felt barely).
- **Suspected missing layer:** run-to-run *events* — something between the
  seeded deck and the boss that makes THIS run's story different from the
  last one without adding hidden randomness.
- **Suspected cheapest win:** writing. The coach has one voice line per boss;
  the game has no idle chatter, no rivalry, no memory of your last run.

## 9. If You Have Repo Access

```text
Engine:      src/lib/fourthPhase/engine.ts      (scoring, ledger)
Situations:  src/lib/fourthPhase/situations.ts
Deck/teams:  src/lib/fourthPhase/deck.ts, run.ts
Jokers:      src/lib/fourthPhase/jokers.ts
Stakes:      src/lib/fourthPhase/stakes.ts
Meter:       src/lib/fourthPhase/meter.ts
Coach copy:  src/lib/fourthPhase/coach.ts
UI:          src/components/fourthPhase/  (Lab = orchestrator; extracted
             modules: GameStatusPanel, SeriesPreviewPanel, WarRoom,
             FeedbackPanels, TutorialCoach, FourthPhaseCards,
             FourthPhaseScreens, fpCardArt, fpLabLogic, fpPersistence)
Harness:     scripts/fourthPhaseBalance.ts, fourthPhaseMatchup.ts
Gates doc:   AGENTS.md
```

Verification: `npm run lint`, `npm run build`, `npm run matchup:fourthphase`,
`npm run balance:fourthphase -- 3000`.

---

*Be direct. Anchor every claim to a beat in the run ("at call 5 of drive 2, I
felt..."). If the game is fun, prove it by naming the moment. If it is not,
name the moment it should have been.*
