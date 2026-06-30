# Fourth Phase AI Review Brief - June 30, 2026

> A self-contained packet for another AI model, designer, senior engineer, product reviewer, or game-system critic.
> It explains the current Fourth Phase build, the intended product goals, the mechanics, the UI/UX surface, the verification harnesses, the known gaps, and the exact kind of directional feedback that would be useful.

## How To Use This Packet

- **In a hurry / pasting into a chat LLM:** skip to the ready-to-paste prompt in §22 — it is the whole review request in one block. Then read §3 (thesis), §11b (a worked example you can verify by hand), and §17/§17b (risks + suspected rough edges).
- **Reviewer WITH repo / agent access:** check out the branch named in "Where to read the code" below, then work through §4's file list. The live build is at `https://dmbrown81.github.io/slate-boss/`.
- **Reviewer WITHOUT repo access** (a plain chat model given only this file): you can still do a full product/design/UX critique from §1-§22 — every constant, situation, joker, and balance number is inlined here. You cannot do a line-level engineering audit (§11, §21 tickets) without the source, so flag those as "needs code."

**Where to read the code:** Fourth Phase is merged into `main` and deployed. The newest layer — the in-app teaching UI (`FourthPhaseGuide.tsx`, the "How to play" panel, and the live situation-highlight) described in §4/§14 — plus this brief live on branch **`fourth-phase-teach-it`** pending merge. Read that branch (or its PR) to see the code exactly as this brief describes it; `main` has everything except that newest teaching layer.

## 0. One-Sentence Summary

Fourth Phase is a fictional, single-player football card roguelike that tries to make the core scoring equation feel physical and dramatic: build a Crowd Meter, arrange cards in the right order, cash it into a huge play, survive boss pivots, and draft enough joker-like X-Factors to make each run feel different.

## 1. Current Repo And Product State

- Repo: `dmbrown81/slate-boss`
- Stack: Vite, React 19, TypeScript.
- Current public app: `https://dmbrown81.github.io/slate-boss/`
- Current game: **Fourth Phase**.
- Former game: Callsmith/Gridiron, a football card roguelike retained on disk and in git history. It is no longer wired into the app front door.
- Current deployment state as of June 30, 2026:
  - PR #6 was merged into `main`.
  - `main` renders `FourthPhaseLab` directly from `src/App.tsx`.
  - GitHub Pages deploy is green.
  - Browser shell title and PWA manifest now say Fourth Phase.

Important context:

- Fourth Phase began as an isolated lab next to Callsmith, then became the app's front door.
- The current build is playable and balance-tested, but it is still a lab/prototype in game shape: one abstract-target game with three drives, not yet a full season, field-position sim, local unlock spine, or polished retention wrapper.
- The central feature is clear and working: Crowd Meter charge/cash order is visible, score math reconciles, and card/joker order matters.

## 2. Intended Product Goals

The intended bar is not "a football skin over Balatro." The product should become a sticky, replayable, legible, scalable football roguelike with real depth.

Core goals:

- **Sticky**: fast restarts, clear run identity, visible build direction, memorable blow-up moments, and reasons to try "one more run."
- **Fun**: the player should repeatedly feel "I made that happen" when meter setup, order, and drafted jokers combine.
- **Challenging**: good pilots should win meaningfully more than random pilots, but the game should not become automatic. Targets should punish sloppy drafting and bad sequencing.
- **Deep**: decisions should compound across hand selection, card order, joker order, team identity, boss pressure, War Room picks, and eventually field position/down-distance.
- **Scalable**: the engine should accept lots of future content without brittle special cases. New jokers should be data-style hook definitions, not hardcoded engine branches.
- **Readable**: the player should understand why a play scored what it scored. The equation must stay visible and exact.
- **Mobile-first**: reorder, selection, reading, and run flow must work on touch. Drag-only mechanics are not acceptable.
- **Fictional and local-first**: no real teams, players, licensed league IP, betting, DFS contest framing, real money, prizes, accounts, backend, multiplayer, or leaderboards unless the product direction changes deliberately.

The emotional target:

- A player should learn the football-math grammar in under a minute.
- A good run should create screenshot-worthy "cash-in" spikes.
- A deep run should feel like the player built a strange but coherent football machine.
- The game should create discussion: "What joker lineup did you have?", "What run code?", "How did you beat Road Game?", "Did you cash the meter too early?"

## 3. Product Thesis

The whole design is built around one scoring contract:

```text
Drive Points = Yards x (1 + Execution) x BigPlay
```

Each football phase has one honest mathematical job:

| Phase | Engine term | Design role | Player intuition |
| --- | --- | --- | --- |
| Offense | Yards | Base payload | Moves the ball, creates raw score |
| Defense | Execution | Reliability floor | Stabilizes and raises the multiplier floor |
| Crowd | BigPlay | Ceiling | Charges and cashes the big-play multiplier |
| Special Teams | Fuel | Off-equation support | Draws, money, discounts, hidden yards |

The strongest concept is "complete team football":

- One-phase spam should feel narrow.
- Combining phases should feel smarter.
- All-four-phase plays should feel like the apex.
- Crowd should be the visible hero, not a hidden stat.
- Special Teams should matter without becoming just another scoring color.

## 4. Files To Inspect

Current Fourth Phase source:

- `src/App.tsx`
  - Renders `<FourthPhaseLab />` directly.
- `src/components/fourthPhase/FourthPhaseLab.tsx`
  - Main playable UI.
  - Team select strip, meter hero, drive target, boss display, joker row, selected play reorder, preview, ledger, hand, War Room, win/loss.
- `src/components/fourthPhase/FourthPhaseGuide.tsx`
  - In-app "How to play" and situation reference panels.
- `src/lib/fourthPhase/types.ts`
  - Phase, rank, card, joker, boss, score, context, and ledger types.
- `src/lib/fourthPhase/deck.ts`
  - 52-card deck, rank values, role names, phase labels/colors, team deck preparation, seeded shuffle.
- `src/lib/fourthPhase/meter.ts`
  - Crowd Meter constants and helpers.
- `src/lib/fourthPhase/situations.ts`
  - Situation recognizer and priority ladder.
- `src/lib/fourthPhase/jokers.ts`
  - 29 joker definitions as pure event-listeners.
- `src/lib/fourthPhase/engine.ts`
  - `scoreFourthPhasePlay`, hook evaluation, boss effects, meter charge/cash/bleed, ledger.
- `src/lib/fourthPhase/run.ts`
  - Run constants, teams, bosses, targets, draw, draft.
- `scripts/fourthPhaseMatchup.ts`
  - Deterministic proof harness.
- `scripts/fourthPhaseBalance.ts`
  - Monte Carlo prototype balance harness.
- `docs/FOURTH_PHASE_LAB_NOTES.md`
  - Current notes, latest balance snapshot, migration verdict, next work.

Historical/supporting context:

- `docs/FOURTH_PHASE_BUILD_PROMPT.md`
  - Original design dream and staged forks.
- `docs/GRIDIRON_AI_REVIEW_BRIEF_2026-06-26.md`
  - Historical Callsmith/Gridiron review packet. Useful for product aspirations and old depth, but not the current wired app.
- `docs/PROJECT_MAP.md` and `README.md`
  - May still contain stale Callsmith/Gridiron framing in local branches or older commits; cross-check against Fourth Phase files.

## 5. Current Game Loop

Current implemented loop:

1. Choose a team class from six buttons.
2. Start a seeded lab run.
3. Draw an 8-card hand.
4. Select up to 5 cards.
5. Reorder selected cards. Cards resolve left to right.
6. Preview shows:
   - Situation name.
   - Points.
   - Yards.
   - Execution.
   - BigPlay.
7. Run the play.
8. The engine:
   - Recognizes a situation.
   - Seeds Yards/Execution/BigPlay/fuel.
   - Applies joker hooks left-to-right by joker order.
   - Resolves cards left-to-right.
   - Charges/cashes meter.
   - Applies boss effects.
   - Applies final hooks.
   - Applies sustained tick and bleed.
   - Emits a ledger.
9. Refill hand.
10. Repeat until the drive target is cleared or play/card pressure ends the run.
11. Between drives, enter Mini War Room:
   - Draft 1 of 3 jokers for `$4`, or skip for `$3`.
   - Joker limit is 5. When full, the new drafted joker replaces the last slot behavior used by the UI/harness path.
12. Clear three drives to win.

Current macro:

- One lab game = 3 drives.
- Drive 3 activates a boss.
- Abstract point targets, not field position/down-distance.
- No persistent unlocks yet.
- No consumables yet.
- No season/championship/overtime wrapper yet.

## 6. Deck And Card Model

Deck:

- 52 cards.
- 4 phases x 13 ranks.
- Ranks: `2 3 4 5 6 7 8 9 10 J Q K A`.
- Base rank values:
  - `2-10` = face value.
  - `J/Q/K` = 10.
  - `A` = 11.

Each card has:

- `id`
- `phase`
- `rank`
- `value`
- `tier`
- `roleName`
- `tags`
- optional `modifier`
- optional `edition`

Examples of role names:

| Phase | Low/mid examples | High examples |
| --- | --- | --- |
| Offense | Boundary Blocker, Quick Out, Power Back | Play-Action Ace, Chain Mover, Feature Back, Franchise Quarterback |
| Defense | Nickel Fit, Rally Tackle, A-Gap Mug | Coverage Captain, Ball Hawk, Pocket Wrecker, Field General |
| Special Teams | Coverage Wedge, Punt Pin, Return Lane | Kicker Nerve, Return Captain, Hidden Yards, Specialist Ace |
| Crowd | Student Section, Band Cue, Whiteout | Decibel Spike, Home Stand, Rivalry Roar, Twelfth Man |

Team deck prep modifies cards with bumps, editions, or traits:

- Air Raid: high Offense/Crowd boosted; crowd gets `crowdFavorite`, offense gets `homeRun`.
- Smashmouth: low/mid Offense/Special Teams boosted; offense gets `reliable`.
- Black & Blue: Defense/Special Teams boosted; defense gets `reliable`.
- Loud House: Crowd boosted; crowd gets `crowdFavorite`.
- Special Teams Chaos: Special Teams boosted; gets `explosive`.
- Balanced: no deck mutation.

## 7. Teams

| Team key | Name | Short name | Signature joker | Identity |
| --- | --- | --- | --- | --- |
| `balanced` | Ironwood Engineers | Balanced | The Genius | All four phases are live from snap one. |
| `airRaid` | Canyon Comets | Air Raid | Hurry-Up | Offense and Crowd can explode, but the floor is thinner. |
| `smashmouth` | Foundry Maulers | Smashmouth | Silent Count | Low-rank Offense and Special Teams grind out safe value. |
| `blackAndBlue` | Harbor Bruisers | Black & Blue | Pick-Six Specialist | Defense and hidden yards build the floor off-meter. |
| `loudHouse` | Summit Noise | Loud House | Twelfth Man | Crowd charges fast, but Base must be drafted carefully. |
| `specialTeamsChaos` | River City Sparks | ST Chaos | Field General | Fuel, draw, and money create odd scoring windows. |

Review questions:

- Do these team identities feel distinct after one or two runs?
- Does each starting joker teach a real archetype?
- Does any team create a false promise that the current game does not support?
- Should team choice be shown as a big identity card rather than a small button strip?

## 8. Drive Targets And Resources

Constants:

- Hand size: 8.
- Play limit: 5 selected cards.
- Joker limit: 5.
- Drives per game: 3.
- Discards/redraws per drive: 2.
- Max plays per drive: 8.
- Starting money: `$8`.
- War Room joker cost: `$4`.
- War Room skip payout: `$3`.

Targets:

- Balanced, Air Raid, Smashmouth, Black & Blue:
  - Drive targets are roughly `[198, 394, 666]` plus a deterministic `0-9` bump.
- Loud House:
  - `[186, 366, 614]` plus bump.
- Special Teams Chaos:
  - `[180, 356, 600]` plus bump.

Review questions:

- Are three drives enough to feel like a run, or does it feel like a demo?
- Does the target curve create tension early enough?
- Should Drive 1 be more tutorial-like and Drive 3 more boss-like?
- Does 8 plays per drive feel generous, invisible, or punitive?
- Does money matter enough with one purchase opportunity between drives?

## 9. Crowd Meter

Current constants:

- Starts at `x1.0`.
- Base cap `x6.0`.
- Absolute cap `x12.0`.
- Sustained non-bust tick: `+0.10`.
- Default bleed rate: `25%` of meter above `x1.0`.
- Low-score bleed threshold: 18 points.

Crowd card charge by rank:

- `A`: `+1.0`.
- `J/Q/K`: `+0.6`.
- `7/8/9/10`: `+0.4`.
- `2/3/4/5/6`: `+0.2`.

Core behavior:

- Crowd cards charge meter instead of directly adding score.
- Some situations add meter bonus.
- A scoring situation that `cashesMeter` multiplies BigPlay by the current meter when the first Offense card resolves.
- Because cards resolve left-to-right, `Crowd -> Offense` can score far more than `Offense -> Crowd`.
- Busts and low-scoring attempts can bleed meter.
- Drive completion resets meter to base for next drive, but cap can persist upward through some joker paths.
- Road Game boss can hard-limit meter cap to `x2.0`; jokers must not raise past that active boss limit.

What is working:

- The meter is visually prominent.
- The player can see charge/cash in the ledger.
- The deterministic harness proves Crowd-before-Offense scores higher than Offense-before-Crowd.

Review questions:

- Is the meter emotionally big enough?
- Does the player understand that Crowd cards are setup, not scoring?
- Is the bleed rule understandable or too hidden?
- Should the meter have stronger audio/haptics/animation?
- Is "cash now or wait" interesting enough yet?
- Does resetting meter on drive clear feel satisfying or deflating?

## 10. Situations

Situations are the "hands." The recognizer is a priority ladder. Higher-priority shapes are checked first.

| Priority | Situation | Trigger | Current payoff |
| --- | --- | --- | --- |
| 100 | Complementary Football | All four phases present | Apex. Yards from multiple phases, high Execution, meter bonus, cashes meter, +draw/money/discount |
| 90 | Momentum Shift | 2+ Offense and 2+ Defense | Mid score, strong floor, small meter bonus |
| 85 | Pick Six | 2+ Defense and 1+ Offense | Burst score, Execution, meter bonus, `x1.15` BigPlay |
| 80 | House Call | Offense + Crowd | Offense Yards, cashes meter, extra meter bonus with 2+ Crowd |
| 70 | The Blackout | 3+ Crowd | Utility, no score, charges meter hard |
| 60 | Field Flip | 2+ Special Teams | Utility, no score, draw/money/discount fuel |
| 50 | The Stand | 3+ Defense | Low Yards, very high Execution |
| 45 | The Drive | 3+ Offense | Straight Offense payload, small Execution |
| 30 | The Checkdown | 1-2 Offense only | Safe low score, utility, saves cards |
| 1 | Busted Play | No clean shape | Weak score, negative Execution, `x0.65` BigPlay, bust bleed |

Design intent:

- All four phases should be best when available.
- Defense should be a floor, not fireworks.
- Special Teams should create future opportunity.
- Crowd should create delayed gratification and explosive payoff.
- Busted plays should be survivable with certain builds but generally bad.

Review questions:

- Are the situation names football-clear?
- Does the priority ladder produce intuitive results?
- Does `Pick Six` feel odd when created by defense plus offense?
- Is `The Stand` too low-scoring to feel useful?
- Is `Field Flip` satisfying despite scoring zero?
- Should "utility" plays have bigger screen feedback so they do not feel like wasted turns?

## 11. Scoring Order And Hook Architecture

Scoring is deterministic. No RNG belongs inside `scoreFourthPhasePlay`.

Engine order:

1. Merge supplied context with defaults.
2. Recognize situation.
3. Start mutable score from current meter and cap.
4. Apply boss pre-score effects, currently Road Game cap.
5. Seed Yards, Execution, BigPlay, fuel from situation.
6. Emit system/Yards/Execution ledger entries.
7. Run `onSituationDetected` hooks for jokers, left-to-right by joker order.
8. Resolve each card left-to-right:
   - Apply card trait/edition score effects.
   - If Crowd, charge meter by rank.
   - If `crowdFavorite`, add small meter charge.
   - Run `onCardScored` joker hooks.
   - Run `onPhaseScored` joker hooks.
   - If situation cashes meter and card is the first cashing Offense card, multiply BigPlay by current meter.
9. Apply situation meter bonus.
10. Apply forced-to-cap if set by a joker.
11. Run `retriggersFor` joker hooks.
12. Apply boss after-card effects.
13. Run `onPlayFinal` joker hooks.
14. Calculate points exactly:

```text
round(max(0, Yards) x max(0.1, 1 + Execution) x max(0, BigPlay))
```

15. Apply sustained non-bust tick.
16. Apply bleed if bust, forced bleed, or low-scoring attempt.
17. Return result and ledger.

Joker hooks:

- `onDrawStart`
- `onSituationDetected`
- `onCardScored`
- `onPhaseScored`
- `onMeterCharged`
- `onPlayFinal`
- `retriggersFor`

Architecture rule:

- New jokers should live in `jokers.ts` as hook definitions.
- Do not add joker-by-id branches to `engine.ts`.
- Multiplicative power should be rare and conditional.
- Additive power should be common.
- Scalers should be capped or carry an obvious cost.

Review questions:

- Is hook order intuitive enough for players?
- Is joker order currently meaningful enough?
- Does the engine need a more formal event pipeline for future scale?
- Should ledger entries be richer, grouped, or fully visible rather than sliced to 7 entries?
- Are there edge cases where preview and execution could diverge?

## 11b. Worked Example (Real Engine Output)

This is actual output from `scoreFourthPhasePlay`, not a hand-built illustration. It is the single clearest demonstration of the signature order mechanic: the **same two cards** score double when the Crowd card resolves first. Cards are labeled `phase-rank`; the ledger prints each card's role name.

**Play A — Crowd first (charge, then cash):** select `crowd-A` then `offense-K`.

```text
situation = House Call
yards = 16   execution = +0.12   bigPlay = x2.00   points = 36
ledger:
  [system]  House Call detected — Offense cashes whatever the stadium has built.
  [yards]   Yards seed: 16
  [execution] Execution seed: +0.12
  [meter]   crowd-A charges +1.00 meter (x1.00 -> x2.00)
  [bigPlay] Crowd cash-in: x2.00 — Offense breaks open the built meter
  [meter]   Sustained tick: +0.10 (x2.00 -> x2.10)
```

`16 × (1 + 0.12) × 2.00 = 35.84 → 36`

**Play B — Offense first (cash a cold meter):** select `offense-K` then `crowd-A`.

```text
situation = House Call
yards = 16   execution = +0.12   bigPlay = x1.00   points = 18
ledger:
  [bigPlay] Crowd cash-in: x1.00   <- meter was still cold when Offense resolved
  [meter]   crowd-A charges +1.00 meter (too late to be cashed this play)
```

`16 × (1 + 0.12) × 1.00 = 17.92 → 18`

**Takeaway for reviewers:** identical cards, identical situation, **2x the score from card order alone**, and the ledger names exactly why. Judge whether (a) this is legible to a new player from the on-screen ledger, (b) the payoff gap is dramatic enough to be the core skill expression, and (c) the preview shown before "Run Play" matches this execution exactly (the team's stated invariant — see open questions in §17b).

## 12. Bosses

Boss only activates on Drive 3.

| Boss key | Name | Effect |
| --- | --- | --- |
| `stackedBox` | Stacked Box | Offense Yards are cut in half |
| `noFlyZone` | No-Fly Zone | Only two Offense cards are clean |
| `roadGame` | Road Game | Meter cap forced to `x2.0` with heavier bleed |
| `turnoverDrill` | Turnover Drill | Defense subtracts Execution |
| `fieldPositionWar` | Field Position War | Special Teams gives no fuel |
| `adaptiveDc` | Adaptive DC | Repeated situations score 0 |
| `preventDefense` | Prevent Defense | BigPlay capped at `x2.75` |

Design intent:

- Bosses should be soft pivots, not hard invalidations.
- They should encourage different drafting/ordering without making a build impossible.
- They should create "how do I solve this?" moments.

Current limitations:

- Boss preview is minimal.
- Boss only affects the third drive.
- The player has limited time to adapt because there are only two War Rooms before the boss.
- Some boss effects are abstract and may need stronger football presentation.

Review questions:

- Which bosses are fun constraints vs. just score debuffs?
- Does Road Game feel unique enough?
- Does Adaptive DC create interesting variety or just punish the player for playing well?
- Should the boss be known from run start, War Room, or only Drive 3?
- Should boss identity influence draft offers more directly?

## 13. Joker Catalog

Current catalog size: 29 jokers.

| Joker | Rarity | Effect |
| --- | --- | --- |
| Twelfth Man | core | Crowd cards charge the meter 50% harder |
| Home Cooking | core | Meter does not bleed on a drive's final play |
| Sustained Drive | rare | Each non-bust play raises meter cap by 0.15, bounded |
| Silent Count | core | While meter is cold, each Defense card adds +0.25 Execution |
| Pick-Six Specialist | rare | Pick Six charges meter to current cap |
| The Genius | rare | All-four-phase plays score x2 via BigPlay |
| Field General | core | Each Special Teams card gives +1 next draw and +$2 |
| Two-Minute Drill | rare | With 0 discards, retrigger all Offense |
| Road Warriors | rare | Against Road Game, Offense cards gain +60 Yards |
| Bandwagon | core | Meter starts +0.3 for each prior game/drive won |
| Decibel Record | legendary | Meter cap rises to x12, but bleeds 40% every play |
| Hurry-Up | core | If 5 cards are played, retrigger all Offense |
| Lead Blocker | core | Defense immediately before Offense adds +8 Yards |
| Double Move | core | Offense immediately after Crowd gains +0.12 BigPlay |
| Hidden Yards | core | Special Teams inside scoring situations add +6 Yards |
| Student Section | core | Sustained non-bust tick charges +0.10 extra meter |
| Film Study | core | First copy of each situation per drive gains +0.16 Execution |
| Red Zone Package | core | Target within 180: non-utility plays gain +0.18 Execution and +0.22 BigPlay |
| Walk-On Program | core | Cards valued 6 or lower add +4 Yards if Offense, else +0.04 Execution |
| Checkdown Merchant | core | Checkdowns give +1 draw and +$1 |
| Bend, Don't Break | core | Busted plays with Defense gain +0.10 Execution and no meter bleed |
| Coordinator Tree | rare | Plays with 3+ phases gain +0.18 Execution; all four phases gain +0.23 |
| Closer | rare | Boss drive non-bust plays gain +0.30 Execution and +0.32 BigPlay |
| Press Box Angle | rare | Against boss, first copy of each situation gains +0.22 Execution |
| Return Ace | rare | Field Flip gives +2 more draw, +$4, +1 discount |
| Home Run Threat | rare | House Calls at meter x3+ gain +0.50 BigPlay |
| Scripted Series | rare | Non-bust plays gain +6 Yards per prior play this drive, capped at +24 |
| Blackout Curtain | rare | Blackouts raise meter cap by +0.50, capped x8.5, and add +0.40 meter |
| Phase Collector | legendary | Five-card all-four-phase plays gain +0.35 BigPlay and raise cap by +0.75, capped x9 |

Current balance result after joker-depth pass:

- Drafting now clears the reward-WIN-gap advisory.
- Synergy pilot is stronger but still below the too-easy ceiling.
- The catalog still needs playtest review for fun, readability, and UI clarity.

Review questions:

- Which jokers are exciting?
- Which are mathy but not emotionally readable?
- Which effects overlap too much?
- Which archetypes are missing?
- Does the player understand order-sensitive jokers from the current UI?
- Are legendary effects weird enough?
- Are boss-counter jokers too narrow for a three-drive run?
- Should jokers have art/iconography/lanes/categories to improve drafting?

## 14. Current UI/UX Surface

**Visual reference:** the most honest way to review the UI is to play it — `https://dmbrown81.github.io/slate-boss/` (reflects `main`; the newest teaching layer is on the `fourth-phase-teach-it` branch, run `npm run dev` to see it). The screen is one vertical mobile-first scroll. From top to bottom the key states a reviewer should look at are: (1) **first load** — team strip, team identity line, and an auto-opened "How to play" panel with a color-coded phase legend and the live equation; (2) **mid-play** — selecting a Crowd + Offense card lights up "House Call" in the Situations reference list while the Preview shows the live Yards/Exec/BigPlay breakdown (this is the §11b worked example as the player sees it); (3) **cash-in** — the gold points panel after a big play. If reviewing from screenshots, ask for those three states specifically.

The current screen is a playable lab, not a polished full product shell.

Top-level screen:

- Dark stadium-like background.
- Header:
  - Home button if supplied.
  - `FOURTH PHASE LAB`.
  - Run code.
  - Reset button.
- Team selector:
  - Six compact buttons in a 3-column grid.
- Team identity one-line copy.
- First-visit guide:
  - Stored in `localStorage` key `fp-seen-guide`.
  - Shows how to play and phase jobs.

Main play UI:

- Crowd Meter hero gauge:
  - Large numeric meter.
  - Fill bar.
  - Cap display.
  - Glow scales with tightness.
- Drive target panel:
  - Drive number.
  - Current score / target.
  - Target remaining.
  - Plays left.
  - Active boss name/effect.
  - Progress bar.
- Jokers:
  - 5 slots.
  - Tooltip effect on title.
  - Rarity colors.
  - Drag reorder on desktop.
  - `left/right` button reorder for touch/keyboard accessibility.
- Cash-In panel:
  - Appears after cash or 120+ point play.
  - Shows points, situation, BigPlay, meter, joker lineup.
- War Room:
  - Shows 3 joker draft offers.
  - `$4` cost.
  - Skip for `$3`.
- Win/loss panel:
  - `LAB CLEAR` or `DRIVE FAILED`.
  - Run it back button.
- Situations panel:
  - Collapsible reference list.
  - Highlights current preview situation.
- Selected play tray:
  - Up to 5 selected cards.
  - Horizontal scroll.
  - Drag reorder.
  - Touch/keyboard `left/right` reorder.
  - Copy says "left scores first."
- Preview:
  - Situation label.
  - Points.
  - Yards/Execution/BigPlay terms.
  - Run Play and Redraw buttons.
- Live ledger:
  - Shows first 7 ledger entries.
  - Highlights joker/boss labels.
- Hand:
  - 4-column card grid.
  - Rank, phase short, role name, phase label, value.

Accessibility already addressed:

- Reorder is not drag-only.
- Buttons have aria labels for moving cards/jokers earlier/later.
- Phase labels and short labels exist, not purely color.

Accessibility gaps:

- No full screen-reader audit.
- Ledger is visually dense and truncated.
- Some color-coded states may need text/glyph redundancy.
- Touch targets should be tested on real phones.
- Reduced-motion/audio policy is not fully implemented for future juice.

UX review questions:

- Is the first run understandable without reading the guide?
- Is the vertical order of panels right on mobile?
- Is the hand too far below the preview?
- Does the player understand that card order matters before making a mistake?
- Should selected cards and jokers use stronger order numbers?
- Is the ledger readable or too small?
- Does the War Room feel like a real decision or a speed bump?
- Is the cash-in panel dramatic enough to be shareable?
- Does the UI feel like a game, or like a debug harness?

## 15. Verification And Balance

Commands:

```bash
npm run lint
npm run build
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000

# Callsmith/Gridiron is unwired but still maintained:
npm run smoke:gridiron
npm run matchup:gridiron
npm run balance:gridiron -- 3000
```

Latest Fourth Phase full sample after the joker-depth pass:

```text
synergy   win=84.2% fail=15.8% median=1570 p90=1893 p99=2252 peak=738 money_med=40 tight=22.6%
random    win=5.1% fail=94.9% median=657 p90=1285 p99=1726 peak=532 money_med=29 tight=13.9%
noDraft   win=78.9% fail=21.1% median=1532 p90=1856 p99=2127 peak=588 money_med=55 tight=31.1%

Team viability:
Balanced     win=88.0% median=1745 money=37
Air Raid     win=89.4% median=1653 money=39
Smashmouth   win=78.6% median=1532 money=42
Black & Blue win=90.0% median=1650 money=37
Loud House   win=79.4% median=1480 money=40
ST Chaos     win=80.0% median=1407 money=75

Reward WIN gap: +5.3 win points vs no-draft
Meter ceiling tightness: 22.6%, p99 peak x8.35
```

Current gates:

- Synergy win must be inside 45-88%.
  - This is a band, not a floor. Above 88% means targets are too easy.
- Build gap vs random must be at least 8 points.
- Per-team viability must be at least 30%.
- Meter ceiling tightness must be at most 35%.
- Reward-WIN-gap is advisory, now OK after joker-depth pass.

Harness caveats:

- The synergy pilot is a heuristic, not a perfect human.
- The random pilot is intentionally poor.
- No-draft is strong because starting teams/signature jokers and target tuning currently allow strong play without extra draft depth.
- Balance is prototype evidence, not final proof.
- Once field position, consumables, unlocks, or a longer run are added, balance must be recalibrated.

## 16. What Is Already Good

- The central equation is clean and exact.
- The Crowd Meter is visible and legible.
- Card order matters in a way that is easy to demonstrate.
- The left-to-right scoring preview creates a learnable skill layer.
- The situation ladder is small enough to teach.
- The hook-based joker system is scalable.
- The 29-joker catalog now creates measurable draft leverage.
- Bosses are implemented as soft pivots, not instant invalidations.
- The harnesses can fail and protect against too-easy tuning.
- The mobile reorder fix solved a major signature-mechanic risk.

## 17. Biggest Current Product Risks

1. **The game is still more abstract math toy than football roguelike.**
   - It has football labels and phase jobs, but no field position, downs, first downs, red zone, clock, or defensive reads.

2. **The UI still reads like a lab.**
   - It is playable and efficient, but not yet richly game-like, dramatic, or strongly branded.

3. **Retention wrapper is thin.**
   - No daily, unlocks, milestones, run history, seed import, challenge ladder, or long-term goals in Fourth Phase yet.

4. **War Room is underbuilt.**
   - Drafting now matters in the harness, but there is no reroll, pricing variation, card upgrades, consumables, or strong build-path presentation.

5. **Football authenticity may lag the commercial promise.**
   - Callsmith had more football texture. Fourth Phase has cleaner math but needs field/down texture to satisfy football players.

6. **Current balance may be too dependent on the abstract-target skeleton.**
   - Field position/down-distance could change the whole value of Special Teams, Checkdowns, and Drive situations.

## 17b. Suspected Rough Edges / Open Code Questions

These are the team's own low-confidence suspicions — places we'd point a reviewer first rather than make them hunt cold. Confirm, dismiss, or sharpen each.

1. **Joker-limit overwrite is opaque.** At the 5-joker cap, drafting a new joker replaces the *last* slot (`[...jokers.slice(0, LIMIT-1), newJoker]`) with no in-UI indication of which joker is lost or any reorder-before-replace step. Since joker order is mechanically meaningful, silently dropping the last slot may quietly wreck a build. Is this the right rule, and is it legible?

2. **Preview vs. execution parity.** Preview and execution call the same `scoreFourthPhasePlay`, but with separately assembled contexts (e.g. `targetRemaining`, `cardsPlayedThisDrive`, `repeatedSituations`). Any drift between the two call sites would show the player one number and score another — the worst possible failure for a "transparent math" game. Worth a focused check that the two contexts can never diverge.

3. **Cash-in trigger is a magic threshold.** The cash-in panel shows on `didCash || points >= 120`. The `120` is a bare constant; confirm it still lines up with current target/score scaling and isn't either spamming or hiding the celebration.

4. **Meter cap persistence across drives.** Cap can ratchet upward through some joker paths and persists between drives while the meter itself resets to `x1.0`. Confirm this is intended and that no boss (esp. Road Game's forced `x2.0` cap) can be bypassed by a previously-raised cap.

5. **`FourthPhaseLab.tsx` is monolithic** (~800 lines holding state machine, scoring glue, and all sub-components). Not a bug, but the field-position fork (§18.1) will land here; reviewers should weigh whether to split it first.

6. **Ledger truncation to 7 entries.** Complex joker stacks can emit more than 7 ledger lines; the UI slices to 7, so the displayed math may be incomplete on exactly the busiest, most "I broke the game" plays. See Ticket D.

## 18. Next Work In Recommended Order

### 1. Field Position / Downs Model

Add behind a feature flag.

Goal:

- Make football texture real without breaking the abstract engine.

Possible model:

- Ball starts at a yard line.
- Gain yards from score terms or a transformed `yards` output.
- First-down line refreshes downs.
- Touchdown/cash event clears drive or scores.
- Special Teams affects starting field position, pinning, returns, and hidden yards.
- Crowd cash could represent explosive play chance or touchdown conversion.

Review questions:

- Should score remain point targets, or should points become yards/TDs?
- Can the current equation survive field position?
- Does the meter cash on first down, touchdown, or explosive play?
- How do utility plays matter when they score zero?

### 2. Richer War Room And Consumables

Add:

- Reroll offers.
- Variable pricing.
- Practice Drills to level situations.
- Audibles as one-use tactical items.
- Deck mutation:
  - Change phase.
  - Clone card.
  - Destroy card.
  - Upgrade rank.
  - Add edition/trait.

Goal:

- Make build planning, not just in-drive sequencing, the long-run engine.

### 3. Local Unlock Spine

Local-first, no backend.

Possible unlocks:

- Teams.
- Jokers.
- Stakes/difficulty.
- Cosmetic titles.
- Challenge modifiers.

Rules:

- Avoid power gating early fun.
- Unlocks should expand options, not require grinding to make the base game good.

### 4. First-Run Onboarding

Current opening hand is scripted, but the teaching flow is still mostly a guide panel.

Need:

- Forced or suggested first Checkdown.
- Then Crowd charge.
- Then House Call cash.
- Then show how order changes score.

Goal:

- Player hears/sees the meter payoff in 60 seconds.

### 5. Juice And Shareability

Need:

- Stronger cash-in screen.
- Count-up.
- Meter flash.
- Stadium lighting.
- Optional haptics/audio.
- Reduced-motion-safe alternatives.
- Share card with:
  - Points.
  - Situation.
  - Meter.
  - Joker lineup.
  - Run code.

### 6. Run Codes / Replay

Current run code is displayed but not importable.

Need:

- Seed import.
- Shareable daily/challenge seed.
- Replay a run code.

## 19. Do Not Recommend Yet

Avoid recommendations that violate the product constraints or skip too far ahead.

Do not recommend:

- Real NFL teams, players, league marks, or licensed IP.
- Betting, DFS contests, prizes, deposits, withdrawals, wagers, or real-money framing.
- Backend accounts or global leaderboards as the next step.
- Multiplayer as the next step.
- A full football simulation engine.
- Huge numbers of play concepts before the core loop is more readable.
- Hiding the score math.
- Random rolls inside scoring.
- Drag-only reorder.
- A marketing landing page instead of improving the game itself.
- Cosmetic-only polish while the War Room and field-position depth remain thin.

## 20. Specific Review Questions For Another Model

Ask the reviewer to be direct and critical.

Product:

- What is the single biggest reason a player would bounce after one run?
- What is the single strongest hook?
- Is "Fourth Phase" a clear enough identity?
- Does the game sound sticky from the mechanics alone?
- What would make a player share a run?

Game design:

- Is the phase-to-equation mapping elegant or too abstract?
- Is the Crowd Meter enough of a signature mechanic?
- Is the current run length too short?
- Which mechanics create real decisions vs. obvious choices?
- Are utility plays satisfying?
- Does Special Teams have enough identity?
- Does Defense feel like a floor or just a weaker scoring color?

Balance:

- Does synergy 84.2% feel too easy even though it is inside the current gate?
- Is no-draft 78.9% too high for a game that wants drafting to matter?
- Should gates become stricter after field position is added?
- Which team looks overtuned or undertuned from the current snapshot?
- Are boss counters too powerful or too narrow?

UX:

- Can a new player understand what to do in 30 seconds?
- Is the guide useful or too much reading?
- Is the screen hierarchy right?
- Is the meter visually dominant enough?
- Does the selected-play reorder UI feel good on touch?
- Should card order be numbered?
- Should joker order be more obviously relevant?
- Is the ledger useful to normal players?

Engineering:

- Is the hook architecture sufficient for scaling to 75+ jokers?
- Should joker effects become data objects plus composable primitives?
- Is `FourthPhaseLab.tsx` too monolithic?
- Where should field-position state live?
- What tests are missing before bigger systems land?

Retention:

- What should the first local unlocks be?
- What daily/challenge format would fit without backend?
- What should a share card include?
- How can the game create "I almost had it" losses?

## 21. Agent-Ready Tickets To Propose Or Critique

The reviewer should rank these by impact-per-hour and may add better ones.

### Ticket A - First-Run Sequenced Tutorial

Files:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/FourthPhaseGuide.tsx`
- maybe `scripts/fourthPhaseMatchup.ts`

Idea:

- Turn the scripted opening hand into an actual two- or three-step tutorial:
  - Checkdown.
  - Crowd charge.
  - House Call cash.
  - Then show order swap.

Acceptance:

- New player sees meter payoff in under 60 seconds.
- Can skip or reset.
- Does not affect later runs.
- Build/lint/matchup pass.

### Ticket B - Field Position Prototype Flag

Files:

- `src/lib/fourthPhase/run.ts`
- `src/lib/fourthPhase/engine.ts`
- `src/components/fourthPhase/FourthPhaseLab.tsx`
- new field model module if needed.

Idea:

- Add optional field/down state behind a constant or flag.
- Preserve abstract-target mode as baseline.

Acceptance:

- Existing harness still passes in abstract mode.
- New deterministic proof covers first down, punt/field flip, touchdown/cash.

### Ticket C - War Room 2.0

Files:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/run.ts`
- `scripts/fourthPhaseBalance.ts`

Idea:

- Add reroll, price variation, and one non-joker offer type.

Acceptance:

- Drafting decisions become visibly different.
- Balance reports spend/reroll diagnostics.

### Ticket D - Full Ledger Expand

Files:

- `src/components/fourthPhase/FourthPhaseLab.tsx`

Idea:

- Show first 7 ledger entries by default with an expand control for full math.

Acceptance:

- Normal view stays readable.
- Deep players can inspect every event.

### Ticket E - Shareable Cash-In Card

Files:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- maybe new component.

Idea:

- Make cash-in state a designed share panel.

Acceptance:

- Shows points, situation, meter, five jokers, team, run code.
- Fits mobile screenshot.

### Ticket F - Seed Import

Files:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/run.ts`

Idea:

- Add input to paste `FP-...` run code and replay same seed/team.

Acceptance:

- Generated code can be imported.
- Same initial run state is reproduced.

### Ticket G - Accessibility Pass

Files:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/FourthPhaseGuide.tsx`
- `src/components/footballStyles.ts`

Idea:

- Review labels, focus order, contrast, non-color signals, touch target sizing.

Acceptance:

- Reorder controls are keyboard usable.
- Meter and preview are screen-reader understandable.
- Important states do not rely on color alone.

## 22. Ready-To-Paste Prompt For Another LLM

```text
You are reviewing Fourth Phase, a fictional single-player football card roguelike in a React 19 + TypeScript + Vite repo.

Read `docs/FOURTH_PHASE_AI_REVIEW_BRIEF_2026-06-30.md` first. Then inspect:

- `src/App.tsx`
- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/FourthPhaseGuide.tsx`
- `src/lib/fourthPhase/types.ts`
- `src/lib/fourthPhase/deck.ts`
- `src/lib/fourthPhase/meter.ts`
- `src/lib/fourthPhase/situations.ts`
- `src/lib/fourthPhase/jokers.ts`
- `src/lib/fourthPhase/engine.ts`
- `src/lib/fourthPhase/run.ts`
- `scripts/fourthPhaseMatchup.ts`
- `scripts/fourthPhaseBalance.ts`
- `docs/FOURTH_PHASE_LAB_NOTES.md`

Context:

Fourth Phase is now the app front door. It is a Balatro-style football roguelike built around:

Drive Points = Yards x (1 + Execution) x BigPlay

Offense supplies Yards, Defense supplies Execution, Crowd charges/cashes the BigPlay meter, and Special Teams supplies off-equation fuel. The signature mechanic is left-to-right card order: Crowd before Offense charges the meter before the cash. Jokers are hook-based event listeners and can be reordered too.

The user's intended goals are: sticky, fun, challenging, deep, scalable, mobile-first, fictional-only, transparent, and capable of producing shareable "I broke the game" moments.

Hard constraints:

- No real teams, players, league IP, betting, DFS contests, prizes, real money, backend accounts, multiplayer, or global leaderboards.
- Scoring must stay deterministic.
- No hidden scoring multiplier outside the displayed equation.
- Do not make reorder drag-only.
- Do not propose a landing page instead of improving the game.

Please produce a direct senior-level critique with:

1. The single biggest product risk.
2. The strongest hook and weakest current area.
3. Whether the game is understandable in the first minute.
4. Whether the Crowd Meter is strong enough as the signature mechanic.
5. Whether the phase-to-equation mapping is elegant or too abstract.
6. A game-design review of teams, situations, meter, bosses, jokers, War Room, and current balance.
7. A UI/UX review of the current screen hierarchy, onboarding, reorder controls, ledger, hand, War Room, and cash-in panel.
8. An engineering review of the hook architecture, deterministic scoring, test harnesses, and likely scaling risks.
9. A retention review: what should make players come back without backend/accounts?
10. 8-12 ranked, agent-ready tickets. Each ticket should include files touched, implementation idea, acceptance criteria, and verification commands.
11. A "do not build yet" section for tempting but premature ideas.

Be direct. Do not flatter. Do not suggest real NFL/IP, betting, multiplayer, accounts, global leaderboards, a full simulation engine, or hiding the math.
```

## 23. Review Output Format Requested

Ask the reviewer to return:

1. **Executive read** - one paragraph.
2. **Top risk** - one sentence.
3. **What is working** - short bullets.
4. **What is not working yet** - short bullets.
5. **Design critique** - mechanics and balance.
6. **UX critique** - screen flow and onboarding.
7. **Engineering critique** - architecture and tests.
8. **Retention critique** - stickiness and replay.
9. **Ranked next tickets** - 8 to 12.
10. **Do not build yet** - premature ideas to avoid.

The best feedback will be specific, file-aware, and willing to say "this is not fun enough yet" if that is the honest read.
