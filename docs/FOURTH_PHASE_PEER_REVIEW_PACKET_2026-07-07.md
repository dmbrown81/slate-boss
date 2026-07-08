# Fourth Phase — Peer Design Review Packet

Date: 2026-07-07
Build reviewed: `e1901ce` (main, deployed)
Public build: https://dmbrown81.github.io/slate-boss/
Prepared by: the project's chief designer, for peer designers (human or LLM)

This is a stress-test request, not a victory lap. The game just finished a
game-feel sprint and the core loop is balance-proven. The open question is
whether it is on track to become a product a game studio or publisher would
fight for — and if not, what exactly is in the way.

Everything a reviewer needs is in this one file. Repo access is a bonus, not a
requirement.

---

## 1. The Ask (what I want from you)

You are a peer panel: senior game designer, mobile UX lead, systems/balance
designer, game-feel/juice specialist, and a skeptical publisher scout.

Your job is not encouragement. Your job is to find what would stop this game
from being fun, legible, replayable, shareable, or pitchable — and to rank the
fixes by leverage. Assume I will act on your top items next sprint.

Deliver your review in this exact shape:

1. **Blunt verdict** — Is it fun? Understandable in 60 seconds on a phone? Football
   enough? Would you personally play a second run? Would a publisher scout ask
   for a meeting after 10 minutes with the public build?
2. **Scores 1-10** — first 60 seconds, core loop, strategic depth, football
   fantasy, mobile UX, game feel/juice, clarity of scoring, replay depth,
   share/clip potential, pitch readiness.
3. **Top 10 problems, ranked by severity.** For each: the failure mode, what the
   player feels, and the smallest practical fix.
4. **Top 10 highest-leverage improvements.** Split "before wider playtesting"
   from "before pitching studios" from "nice later."
5. **First-run walkthrough** — narrate what a cold player sees and where they
   hesitate or misread. The tutorial must teach "Crowd before Offense cashes
   momentum" without a manual. Does it?
6. **Systems critique** — momentum meter, situations, War Room, jokers, stakes,
   unlock spine, bosses, loss fairness. Name any dominant, boring, or illegible
   strategy. The balance harness numbers are in §10; challenge their
   interpretation, not their arithmetic.
7. **Game-feel critique** — the sound/haptic/animation layer just shipped (§8).
   What beat is still dead? What is the "clip moment" and does it land?
8. **Roadmap referee** — my planned order is: (a) cold-player 60-second test,
   (b) War Room drama sprint, (c) aesthetic production sprint (card backs, team
   art, premium states), (d) component extraction of the 2,900-line UI file,
   (e) Steam/landscape presentation. Re-rank it, cut items, or add ONE item,
   and defend the change.
9. **The pitch test** — write the one-sentence hook you would put on a store
   page, then say whether the current build delivers that sentence. If not,
   name the single biggest gap.
10. **Go/no-go** — wider playtest now, limited cold tests only, or hold. List
    the minimum changes to move up one tier.

Finish with this rubric:

```text
Go/no-go:
Top 3 reasons:
Top 3 fixes before playtesting:
Top 3 fixes before pitching:
One feature to cut:
One feature to double down on:
One thing that is secretly excellent:
One thing that is secretly dangerous:
```

### Hard constraints (do not spend words fighting these)

- Local-first, single-player, fictional. No backend, accounts, multiplayer,
  global leaderboards, analytics, payments, betting, prizes, DFS framing, or
  licensed league/team/player IP.
- Scoring stays deterministic: no hidden rolls. Variance comes from seeded
  draws and player decisions only.
- The scoring contract is fixed: `points = Yards × (1 + Leverage) × Explosive`.
- The preview must never lie: preview and execution score through the same code.
- Field position / downs simulation is deliberately deferred behind a
  documented gate. Recommend it only if you argue why it should override the
  gate.

Low-value feedback: "add multiplayer," "use real teams," "make it Madden,"
"needs polish" without saying where, "looks good."

---

## 2. What Fourth Phase Is

A fictional single-player football card roguelike — Balatro's skeleton wearing
a trading-card locker-room skin. Vite + React + TypeScript, packaged with
Capacitor for iOS/Android, deployed as a PWA.

The product bet: **football can teach the math if each phase has one honest
job.** Four phases, one equation, no hidden rolls:

| Phase | Color | Job in the equation | Fantasy |
| --- | --- | --- | --- |
| Offense (OFF) | Blue | Base Yards; first Offense card cashes momentum | Playmakers, the payload |
| Defense (DEF) | Red | Leverage (execution multiplier) | Stops, pressure, short fields |
| Special Teams (ST) | Gold | Off-equation fuel: draw, money, discounts | Hidden yards |
| Crowd (CRD) | Purple | Charges the Momentum meter | Stadium noise |

The one lesson a cold player must learn in the first minute:

```text
Crowd builds momentum. Offense cashes it. Order matters.
```

Cards resolve left to right. The same cards in the wrong order score less. That
asymmetry is the entire skill floor, and everything in the UI exists to teach it.

### Player-facing vocabulary (renamed for clarity; engine names in parens)

- **Momentum** (meter) — the multiplier Crowd builds, x1.0 base, x6.0 base cap
- **Leverage** (execution) — Defense's multiplier contribution
- **Explosive** (bigPlay) — the final multiplier, where momentum cashes in
- **Series / calls** (plays) — you get 8 calls per drive, up to 5 cards each
- **Call Script** — the ordered card sequence for this series

---

## 3. Current Game Flow (all shipped, all live in the public build)

1. **Title screen** — leather binder cover; Play / Continue run / Daily
   Challenge (UTC-seeded, streak-tracked, practice mode after completion);
   career tiles (wins, local best, streak); sound + haptics toggles.
2. **Playbook select** — 6 playbooks as trading-card inserts; locked ones show
   the requirement with live progress (e.g. "Clear 8 career drives — 3/8").
3. **Stake ladder** — 4 stakes per playbook (Rookie → Pro → All-Pro → Legend);
   win a stake to unlock the next for that playbook.
4. **Drive intro** — full-screen beat before each drive: DRIVE N/3, target,
   scouting report or boss-on-field card, calls/redraws/cash tiles, Kickoff.
5. **Play screen** — the core loop (§4).
6. **War Room** — between drives: draft jokers/practice drills, reroll, or skip.
7. **Run summary** — verdict stamp (RUN WON / RUN OVER), loss diagnosis with
   one grounded reason + one actionable tip, best-series/drives/boss tiles,
   unlock banners, run code, Run it back / next-stake shortcut / replay seed,
   copy-result text, and a rendered 1080×1350 PNG share card (native share
   sheet where available, download elsewhere).

Run codes (`FP-BAL-1YAJ1WY-S2`) reproduce any run exactly — team, boss, stake —
and can be imported from the playbook-select screen.

### Core constants

```text
Drives per run: 3          Hand size: 8
Calls per drive: 8         Cards per series: up to 5
Redraws per drive: 2       Joker (Sideline) slots: 5
War Room buys: up to 2     Reroll: $2   Skip with no buys: bank $3
Momentum: x1.0 base, x6.0 base cap, x12.0 absolute cap
Deck: 52 cards, 4 phases × 13 ranks (J/Q/K = 10, Ace = 11)
```

### Stakes

| Stake | Modifiers |
| --- | --- |
| Rookie | Boss defense on the final drive (baseline; harness-proven) |
| Pro | Targets +12% |
| All-Pro | Targets +12%, boss from Drive 2 |
| Legend | Targets +25%, boss from Drive 2, one redraw, start $6 |

**Honesty note:** only Rookie is validated by the balance harness. Stakes 2-4
are hand-designed and unproven. Attack this if you think it matters now.

### Playbook unlock spine

| Playbook | Identity | Unlock |
| --- | --- | --- |
| The Complete Game (Pro Style) | All four phases live | free |
| The Aerial Show (Air Raid) | Offense/Crowd explode, thin floor | win any run |
| Ground & Pound (Power) | Low-rank grind, safe value | clear 8 career drives |
| The Junkyard (Pressure) | Defense/ST floor | win with 2 different playbooks |
| Home Field Advantage (Spread) | Crowd charges fast | score 120+ in one series |
| The Hidden Game (Multiple) | ST fuel chaos | win a Pro Stake run |

---

## 4. The Play Screen (phone-first, 375px)

Top to bottom as of this build:

1. **Objective header** — "Drive 1 of 3: score 276 more in 8 calls" plus a
   state-aware hint line ("Build Crowd → cash with Offense" / "Momentum is hot:
   Offense cashes it now" / "This call cashes momentum. Run it.").
2. **Drive Target tile** — LED score, field-strip progress bar (turf bands,
   yard lines, football marching to a striped GOAL zone), floating "+N" gain
   that rises off the tile after every series (gold when it cashed).
3. **Momentum tile** — LED multiplier, segmented stadium-noise bar, cap, and a
   context hint. Glows harder as it heats.
4. **Boss strip** — scouting report before the boss drive, active-boss warning
   during it.
5. **Call Script** — ordered slots (CALL 1-5) with order badges, CHARGE badges
   on pre-cash Crowd cards, a CASHES badge on the cashing Offense card, arrows
   between cards, drag or ◀▶ to reorder.
6. **Hand** — 8 trading cards, 4-wide grid, directly under the Call Script
   (moved above the math preview this sprint so cards sit above the fold).
7. **This Series preview** — situation name, verb chip (CASHES / SCORES /
   BUILDS / SETS UP / BAD CALL), the full equation with real numbers
   (`16 Yards × 1.12 Leverage × 2.10 Explosive = 38`), boss warnings, a
   momentum-bleed telegraph, an "After this: X to clear, Y calls left" line,
   and — when a better order exists — a one-tap "Reorder to cash momentum:
   +N points" coach button whose promised delta is computed through the real
   scoring path.
8. **Last series** — plain-English one-liner with "Show the math (N)" expanding
   the full ledger.
9. **Sideline (jokers)**, situations reference, how-to-play (collapsed).
10. **Pinned bottom bar** — live preview points + verb, Run Series, Redraw.

First-run tutorial: three played (not read) coach steps — checkdown first, then
a forced Crowd-before-Offense cash, then "that is the loop." Steps gate the Run
Series button until performed correctly; a scripted opening hand guarantees the
cards to do it. First-ever runs re-roll the seed until a gentle boss (Stacked
Box / Prevent Defense) — seed-derived, so run codes stay honest.

---

## 5. Game Feel (shipped this week — critique hard)

- **Sound**: tiny WebAudio sine cues, no assets. Card tap tick, series click,
  cash-in arpeggio, bigger huge-series arpeggio (≥180 pts or ≥x4 Explosive),
  drive-clear chime, kickoff thump, four-note win fanfare, turnover groan on
  loss, register ding on War Room buys. Persisted mute; toggle in header and
  title screen.
- **Haptics**: paired pulses on mobile (tap/cash/signature/win/loss patterns);
  off by default on desktop, persisted pref.
- **Animation**: cards squash under the thumb; "+N" floats off the Drive
  Target; drive score and momentum pop on change; screen flash on cash /
  shake on huge series; CASHED stamp slams in on signature cash-ins; RUN WON /
  RUN OVER slams in as a rotated ink stamp. All honor `prefers-reduced-motion`.
- **Desktop ≥760px**: brass stadium-light wash, faint yard lines, and the game
  column framed as a card table. It is presentation only — the layout is still
  the phone column. Steam-quality landscape is future work; say if it should
  move up the roadmap.

Open feel questions: is the cash-in now clip-worthy or still just "nice"? Which
beat is deadest? Is silent-by-default wrong for a store build?

---

## 6. Situations (the "poker hands")

Recognized by phase pattern, priority order:

| Priority | Situation | Trigger | Payoff |
| --- | --- | --- | --- |
| 100 | Complementary Football | all four phases | apex: scores, cashes, fuels |
| 90 | Momentum Shift | 2+ OFF and 2+ DEF | strong two-way score |
| 86 | Shot Play | OFF + CRD | the main cash-in |
| 85 | Sudden Change | 2+ DEF + OFF, no Crowd outrank | burst score, charges meter |
| 70 | Crowd Surge | 3+ CRD | no score, charges hard |
| 60 | Field Flip | 2+ ST | no score, fuel |
| 50 | Defensive Stand | 3+ DEF | low score, high Leverage |
| 45 | Sustained Drive | 3+ OFF | straight Offense score |
| 30 | The Checkdown | 1-2 OFF only | safe small score |
| 1 | Busted Play | no clean shape | weak score, momentum bleeds |

Shot Play outranking Sudden Change when Crowd is present is deliberate: it
keeps the core lesson (Crowd + Offense = cash) in front.

On top of situations, **football-call combos** fire from specific card
adjacencies (e.g. play-action shapes), shown as sticker badges with exact
values in the preview and ledger.

## 7. Momentum, Bosses, War Room, Jokers

**Momentum**: Crowd charges by rank (Ace +1.0, face +0.6, 7-10 +0.4, low +0.2);
non-bust series tick +0.1; cashing multiplies Explosive by the meter via the
first Offense card, then resets toward base. Busts and low scores bleed it;
holding a hot meter costs; some bosses cap it; some jokers raise the cap.

**Bosses** (scouted from Drive 1, active on the final drive at Rookie):

| Boss | Effect |
| --- | --- |
| Stacked Box | Offense Yards halved |
| No-Fly Zone | only two Offense cards are clean |
| Road Game | momentum cap forced to x2.0, heavier bleed |
| Ball Security | Defense creates less Leverage |
| Touchback Machine | ST hidden-yards fuel suppressed |
| Got Your Number | repeated situations score 0 |
| Prevent Defense | Explosive capped |

**War Room**: 3 joker offers ($4) + 1 practice drill ($3), 2 buys max, $2
reroll, skip banks $3. ST discount tokens shave up to $2 off an offer (never
below $1). Offers carry tags ("boss answer," "feeds Crowd cash-in," "team
identity") and a deterministic COACH PICK sticker with a why-now reason. The
panel previews the next drive's target and boss. Full Sideline forces a
release-one choice. Known worry: it may still read as stat shopping rather
than a dramatic coaching room — that is roadmap item (b).

**Jokers**: 29 in catalog, 5 slots, drag/◀▶ reorder as a skill layer (jokers
are event listeners; order can matter). Rarities core/rare/legendary; each
playbook has a signature joker seeded into its identity. Named like football
(Twelfth Man, Hurry-Up, Lead Blocker, Red Zone Package, Decibel Record...).
Question to attack: which are fun before you read the math, and which are
spreadsheet rows with a football hat?

---

## 8. Retention and Sharing (local-first)

- Daily Challenge: UTC seed, shared by all players, streak tracked, practice
  replays allowed without touching the streak.
- Run history (last 10), local best, per-playbook stake ladders, six team
  unlocks — all in localStorage.
- Run codes for exact replay/sharing of any run.
- Copy-result text block; copy cash-card text block.
- Rendered PNG share card (1080×1350: verdict, score, team, boss, best play,
  run code, signature cash-in, story line) via native share sheet or download.

Is any of this strong enough to make someone actually post? If not, what is
the local-first artifact that would be?

---

## 9. Aesthetic Direction

"Trading-card locker room": dark navy/charcoal surfaces, brass hardware,
off-white card stock. Cards are collectible trading cards — phase-colored
header band with rank + phase icon, condensed sports type, formation/kind
chips, payoff line, fictional serial ("FP-K · SERIES I"), foil borders on
editions, ink-stamp trait badges (ALL-PRO, FRAGILE, CLUTCH...). War Room is a
wood table with cream insert cards and a tilted sticky-note practice drill.
Title is a stitched leather binder. Run codes are equipment-tape labels.
System fonts only; zero image assets so far — everything is CSS/SVG.

The roadmap's aesthetic production sprint would add: real card backs, phase
icons pass, per-playbook art identity, premium foil states. Challenge whether
that is the right next visual investment.

---

## 10. Balance Evidence (3000-sample harness, this build)

Three pilots simulate full runs at Rookie: `synergy` (orders cards for
cash-ins, drafts intelligently), `random`, `noDraft` (skilled play, no
drafting).

```text
synergy  win=81.0%  median=1918  p90=2378  p99=2748
random   win= 2.4%  median= 629  p90=1296  p99=1887
noDraft  win=64.4%  median=1790  p90=2220  p99=2520

Playbook viability (synergy): 78.0% – 83.4%, spread 5.4 pts
Draft impact: +16.7 win pts vs noDraft
Meter ceiling tightness: 19.7%, p99 peak x8.85
All 7 hard gates pass (targets: synergy 75-85, noDraft 55-65,
draft gap ≥15, build gap ≥8, spread ≤6, Loud House not bottom,
tightness ≤35%).
```

Interpretation to challenge: skill and drafting dominate luck (81 vs 2.4), and
teams are style picks, not power picks. But the 2.4% random rate means a
player who never learns the loop loses almost always — the tutorial and
preview carry all the weight. Fair difficulty or new-player woodchipper?

## 11. Chief Designer's Own Readiness Read (disagree freely)

| Axis | /100 | Note |
| --- | --- | --- |
| Mechanics | 75 | proven, deterministic, legible |
| Balance foundation | 80 | Rookie proven; stakes 2-4 unproven |
| First-time comprehension | 60 | improved; cold test still unrun |
| Mobile UI/UX | 65 | cards above the fold now; still dense |
| Game feel | 55 | first full pass shipped this week |
| Visual identity | 65 | strong direction, zero real art assets |
| Sound | 40 | functional cues, no soundtrack/ambience |
| Replay/content depth | 55 | 29 jokers, 4 stakes, 6 playbooks, daily |
| Steam/desktop | 35 | dressed stage, still a phone column |
| Pitch readiness | 45 | needs cold-test proof + one loud clip moment |

Known debt, on the record: `FourthPhaseLab.tsx` is ~2,900 lines (UI
orchestration monolith; extraction planned before the art pass). Cold-player
60-second test has never been run. Stakes 2-4 unvalidated. War Room reads
transactional. No run-history screen. Native shells still carry legacy naming
in spots.

## 12. If You Have Repo Access

```text
Engine:      src/lib/fourthPhase/engine.ts      (scoring, ledger)
Situations:  src/lib/fourthPhase/situations.ts
Deck/teams:  src/lib/fourthPhase/deck.ts, run.ts
Jokers:      src/lib/fourthPhase/jokers.ts
Stakes:      src/lib/fourthPhase/stakes.ts
Meter:       src/lib/fourthPhase/meter.ts
UI:          src/components/fourthPhase/FourthPhaseLab.tsx (+ Guide, styles, fpFeedback)
Harness:     scripts/fourthPhaseBalance.ts, fourthPhaseMatchup.ts
Gates doc:   AGENTS.md
```

Verification commands: `npm run lint`, `npm run build`,
`npm run matchup:fourthphase`, `npm run balance:fourthphase -- 3000`.

---

*Be direct. If something is weak, say it plainly and say what to do about it.
If the current direction cannot work, argue that too — but you have to argue
it, not assert it.*
