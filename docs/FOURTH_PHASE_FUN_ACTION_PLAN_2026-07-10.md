# Fourth Phase — Fun Audit Synthesis & Action Plan

Date: 2026-07-10
Source: 8 outside-model reviews of `docs/FOURTH_PHASE_FUN_AUDIT_PACKET_2026-07-10.md`
(raw reviews: ~/Downloads/"fourth phase review audit 7_9.md"; review 3 echoed the
packet back and contributed nothing — 7 substantive reviews synthesized)
Build reviewed: `36ee297`

## The verdict, unanimously

**"Respected it."** Every reviewer. One "liked it, leaning respected." The fun
is real but arrives in bursts: the reorder moment (+112 from swapping two
cards) and the cinematic hit-stop are the game. Between the bursts: "a very
well-lit gym," "a math test with a confetti cannon," "homework with a really
nice cover."

The consensus one-line diagnosis (review 4 said it best): **the game has no
memory and no antagonist.** It understands what the player did but builds no
mythology around it. "The game's voice is currently 'helpful kiosk.' Football
is the most talkative sport in America and the game has him on mute."

Overall fun score where given: ~6.4/10. Best 5 seconds (unanimous): reorder →
preview spike → cinematic hit-stop. Deadest 30 seconds (unanimous): mid-drive
calls of Drive 2 at Rookie.

## Fact-check against the actual build (read before acting)

- **"Garbage time after the target is secured" is partially a phantom.** Most
  reviewers audited from the packet, not hands-on. The drive already ends the
  instant the target clears — there are no post-clear calls. What survives of
  the complaint: (a) low tension in calls where the player is comfortably
  ahead of pace, and (b) "dead man walking" resignation when a run is doomed.
  Do NOT build "Take a Knee" (nothing to skip); DO consider the press-your-
  luck / two-minute-drill shape later if mid-drive tension stays flat.
- **"Guarantee a redraw mechanic" (review 8)** already exists (2 redraws per
  drive). Ignore.
- Everything else checks out against the shipped build.

## Consensus fun-killers (frequency-ranked across 7 reviews)

1. **Drive 2 identity vacuum** (7/7) — same loop, no boss, no novelty. "This
   is where 'one more run' goes to die."
2. **Losses are graded, not grieved** (7/7) — diagnosis arrives before the
   player feels the collapse. "A lecture from a kind teacher." Emotional
   order should be: feel it → understand it → imagine revenge → restart.
3. **No voice anywhere** (7/7) — coach is telemetry, bosses are mute
   modifiers, playbooks are strategy summaries. Seven of ten delight items
   across all reviews are *writing*.
4. **Mid-drive tension sag** (7/7) — the preview is so good the outcome is
   known before Run Series; when ahead of pace the dramatic question dies.
5. **War Room can betray the coach's own scouting report** (6/7) — coach
   names the boss problem, then the shop offers nothing for it. "The game
   broke a promise."
6. **Verdict screen explains when it should celebrate** (6/7) — "a
   spreadsheet wearing a trophy." No call of the game, no headline, no
   personal-best recognition.
7. **Cinematic will die of familiarity** (6/7) — once per drive = scheduled.
   Tie to personal firsts and context, vary presentation, keep scarcity.
8. **No memory between runs** (5/7) — run 40 is greeted exactly like run 1.
   REMATCH/revenge framing is "the single cheapest one-more-run trigger."
9. **Daily grid encodes outcomes, not drama** (5/7) — nothing in 🟩🟩🟨 says
   "I survived something." Needs closeness encoding, a boss emoji, and
   ideally a named daily modifier to give the share a proper noun.
10. **The exact +delta on the reorder button sells the answer** (review 4's
    catch, echoed by 7) — discovery is the reward; at Pro+ show only "Coach
    sees a better order."

## Consensus delight backlog (joy-per-effort, merged)

1. Boss trash talk (~4-5 lines × 7 bosses: intro / punish / beaten / exit)
2. Loss drama staging: stranded-momentum shot, "SHORT BY N" margin line,
   boss exit line, revenge framing on the replay button
3. Call of the Game line on the verdict (generated from run data)
4. Coach personality bible (~30 lines: philosophy per playbook, big-play and
   loss reactions with blood in them, draft-skip grumbles)
5. Drive-clear stamp variety (WALK-OFF / ESCAPED / STATEMENT / CASHED OUT)
6. REMATCH tag — persist the boss that killed you; next meeting is labeled
7. Personal-best flares on verdict tiles (gold corner + ding)
8. SCOUTED tag — pre-boss draft guarantees one boss-relevant offer
9. Newspaper-style verdict headline family
10. Streak fire on title; crowd chants tied to playbook (later, audio)

## Consensus DO-NOT-DO-YET (explicit, near-unanimous)

- Full events system ("events into a game with no personality yields more
  math, and math is the one resource this game has in surplus")
- Run-history screen ("would catalog stories the game is not yet producing")
- More jokers, raster art, music — all later
- Field position / downs (still gated; review 5's dissent noted and declined)

## The sprint: "The Other Sideline" (adopted)

One theme — **make the game react to the player** — two slices:

### Slice 1 (pure presentation + writing; no scoring-path changes)

1. **Boss voice**: per-boss lines — drive-intro taunt, punish line when the
   boss eats a play, exit line on win/loss. Lives in coach.ts data.
2. **Loss staging** on RUN OVER: margin line ("SHORT BY 38 — one Shot Play"),
   stranded-momentum callout when the meter died hot, boss exit line, and the
   seed-replay button reframed as **Revenge Game** after a loss.
3. **Call of the Game** on every verdict: best series with drive, situation,
   points, cash context — generated from tracked run data.
4. **Drive-clear stamps**: the clear banner names the drive's character
   (WALK-OFF for one-series clears, ESCAPED for final-call clears, etc.).
5. **Coach voice pass**: loss lines that take blame, playbook philosophy on
   the select screen, sharper War Room delivery.
6. **Reorder hint hides the exact delta at Pro+** (keeps it at Rookie).
7. **Personal-best flare** on the verdict best-series tile.

### Slice 2 (engine-adjacent; each item re-runs the 3000-sample harness)

8. **Halftime Adjustment** — Drive 2's identity: a declared, deterministic,
   seed-derived complication announced at the Drive 2 intro; first catalog
   built around countering the player's drive-1 tendency ("They've seen your
   Shot Play...") per review 4's version, since it makes drive 2 a *response
   to the player* — which is a story.
9. **SCOUTED guarantee** — pre-boss War Rooms always contain one offer tagged
   as a response lane to the named boss.
10. **REMATCH persistence** — remember the boss that ended the last run; when
    it reappears, tag it and let the coach mention it.
11. **Named daily modifier** — one deterministic twist per UTC day with a
    headline name; the share grid carries the name (gives the grid a proper
    noun and the daily a puzzle identity).

Acceptance (from review 7, adopted): Drive 2 must never feel structurally
identical to Drive 1; a player must be able to describe a run without citing
score or joker list; the verdict must name what made the run distinctive; a
loss must create a revenge impulse before giving advice.

## Protect list (do not regress)

- The exact-math preview ("the game's purest expression of mastery")
- The reorder moment (and stop underpricing it — see fun-killer 10)
- Playbook select unlock-progress bars ("strongest retention object")
- Preview honesty, determinism, local-first constraints
