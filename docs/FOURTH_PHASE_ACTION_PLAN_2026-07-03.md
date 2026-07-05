# Fourth Phase Action Plan - July 3, 2026

Source feedback: `/Users/dominicbrown/Downloads/fourth phase review audit 7_3.md`

This plan synthesizes the outside-model feedback into an ordered execution path.
The reviews are blunt but highly aligned: Fourth Phase has a real core loop and
a passing deterministic/balance foundation, but it currently fails first-minute
comprehension. The next work should be an onboarding and legibility sprint, not a
systems expansion sprint.

## Executive Decision

Hold wider testing and public-alpha pushes until the first-run experience can
teach itself.

The next product bet:

```text
Make one cold player understand the job:
Score the drive target before plays run out.
Build Crowd.
Cash with Offense.
Use supporting cards to make that easier.
```

Do not add field position, deeper simulation, stakes, collection, more jokers,
more teams, more bosses, or extra deck-mutation systems until this sentence is
visible in play.

## Feedback Consensus

All reviews converge on these points:

- The core loop is worth saving.
- The deterministic engine and scoring contract should stay.
- The current failure is comprehension, not code correctness.
- The top of the screen does not plainly state the goal.
- Card order is central but not visible enough.
- The Crowd Meter is the signature mechanic but does not feel important enough.
- The detailed ledger is useful for trust but too prominent for first-run play.
- Situation names are too much too early.
- The first run should reduce cognitive load.
- Balanced should be the default/forced first-run team.
- War Room should feel like coaching, not generic stat shopping.
- Losses should explain what the player should try next.
- Field position should remain deferred.
- Wider testing now would mostly produce known "I do not get it" feedback.

## Main Disagreement: What To Do With Defense

The reviews disagree on severity, not on the problem:

- Soft option: keep the internal/player-facing phase name "Defense," but make
  "Execution" the visible resource word everywhere.
- Medium option: player-facing rename to "Protection," "Blocking," "Trenches,"
  or "Discipline" while preserving internal `defense` keys.
- Hard option: redesign Defense into a new mechanic such as "STOP/Takeaway gives
  extra plays."

Decision for the next sprint:

```text
Do not redesign Defense mechanics yet.
Do not change internal phase IDs yet.
Change the player-facing mental model first:
Defense cards contribute Execution.
```

Implementation stance:

- Keep `phase: 'defense'` internally for stability.
- In the UI, teach and display `Execution` as the red phase's job.
- Card faces should show a contribution label such as `EXEC +0.25` or
  `Execution`.
- Tutorial should include one plain line:
  `Defense creates takeaways and short fields. In this game, that means
  Execution: your play is cleaner and scores bigger.`
- If 3 out of 5 cold players still cannot explain red cards after one drive,
  escalate to a player-facing rename such as `Protection` or `Blocking`.

Rejected for now:

- Redesigning Defense to give extra plays. That may be elegant thematically, but
  it is a math/balance redesign and should wait until after the UI language test.

## Product Priorities

### Priority 1: First 60 Seconds

Make the goal and one winning loop obvious before the player can get lost.

Must teach:

- The drive is a target race.
- Plays are limited.
- Offense scores.
- Crowd charges the multiplier.
- Crowd before Offense cashes.
- Order resolves left to right.

### Priority 2: Phase Roles

The four phases should read as jobs, not just football nouns.

Recommended first-run language:

| Phase | Keep Name? | Visible Job | Player-Facing Meaning |
| --- | --- | --- | --- |
| Offense | Yes | Yards / Cash | Scores and spends the meter |
| Defense | Reframe first | Execution | Makes plays cleaner and bigger |
| Special Teams | Yes | Fuel | Draw, money, discounts, hidden yards |
| Crowd | Yes | Meter / Hype | Charges the cash-in multiplier |

### Priority 3: Preview And Feedback

The selected-play preview must become the teacher.

The preview should answer:

- How many points will this score?
- Does this charge the meter?
- Does this cash the meter?
- Is this safe, setup, fuel, cash-in, or bad?
- Would reordering improve it?
- How many points will remain after this play?

### Priority 4: Concept Diet

First-run UI should suppress or reduce:

- formal Situation-name prominence
- full ledger
- advanced team selection
- modifier/edition explanation
- deep joker text
- boss complexity until needed
- Practice Drill detail before first War Room

Do not remove the systems. Hide or sequence them.

## Minimum Path To Limited Playtest

Limited playtest requires these five fixes:

1. Persistent objective header.
2. Job-first tutorial rewrite.
3. Live equation/effect preview with order hints.
4. Defense-as-Execution player-facing reframe.
5. First-run concept diet: Balanced start, collapsed ledger, reduced jargon.

After those are in place, run a 3-5 person cold test. Do not go wider until it
passes.

Pass conditions:

- Within 10 seconds, player can say the current goal.
- Within 60 seconds, player understands Crowd before Offense.
- After one drive, player can explain red cards as Execution/reliability, not
  "stopping the other team."
- Player can identify whether a selected play is cashing, charging, fueling, or
  scoring safely before hitting Run Play.
- On a loss, player can say one thing they would do differently next run.

## Implementation Plan

### Ticket 1: Persistent Objective Header

Goal:

Make the immediate win condition impossible to miss.

Recommended copy:

```text
Drive 1 of 3: Score {remaining} more in {playsLeft} plays.
Build Crowd -> cash with Offense.
```

Alternative compact copy for tight screens:

```text
Score {remaining} in {playsLeft} plays
Crowd -> Offense = cash-in
```

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/fourthPhaseStyles.ts`

Acceptance criteria:

- Objective is visible in play state at all times.
- It is the highest-priority text in the status area.
- It fits at 375px width.
- It updates after every play.
- It does not hide the playable game behind a modal.

Validation:

- Manual 375px mobile viewport check.
- Cold readback: player can state goal in 10 seconds.
- `npm run lint`
- `npm run build`

Do not touch:

- scoring engine
- run targets
- balance constants

### Ticket 2: Job-First Tutorial Rewrite

Goal:

Teach purpose before gestures.

Current problem:

The tutorial says what to tap but does not anchor why the tap matters.

Recommended tutorial beats:

1. `Your job: clear this drive before plays run out. Start simple: tap one blue
   Offense card. Offense scores safe points.`
2. After first play: `Now the trick that wins games. Purple Crowd charges the
   meter. Blue Offense cashes it. Put Crowd first, then Offense.`
3. After cash-in: `That was the loop: charge Crowd, cash with Offense, clear the
   target. Same cards in the wrong order score less.`
4. Add first Defense/Execution explanation only when a red card becomes relevant:
   `Red cards add Execution. They make a play cleaner and bigger.`

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/coach.ts`

Acceptance criteria:

- Step 1 mentions the drive target and play limit.
- Step 2 explicitly says left-to-right order matters.
- Step 3 connects cash-in to winning the drive.
- Tutorial copy avoids introducing formal Situation names as the primary lesson.
- Existing tutorial completion persistence still works.

Validation:

- Clear `localStorage` and replay first-run flow.
- Manual check that tutorial advances only after intended plays.
- `npm run matchup:fourthphase`

Do not touch:

- situation recognition priority
- engine math

### Ticket 3: Live Preview As Teacher

Goal:

Turn the preview into the central strategy explanation.

Recommended preview hierarchy:

```text
{effectVerb}: {points} points
{yards} Yards x {executionMultiplier} Exec x {bigPlay} BigPlay
{meter/fuel/order note}
After this: {remainingAfter} to clear, {playsAfter} plays left
```

Effect verbs:

- `CASHES`
- `SCORES`
- `CHARGES`
- `FUELS`
- `BAD CALL`

Reorder hint:

```text
Reorder to cash the meter: +{delta} points
```

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/coach.ts`
- optionally `src/lib/fourthPhase/situations.ts` for display metadata only

Acceptance criteria:

- Preview uses `scoreFourthPhasePlay(selectedCards, buildPlayContext(state))`.
- No duplicate scoring path is created.
- Preview shows the final score and the causal role: scoring, charging, cashing,
  fueling, or busting.
- If selected order misses a clear Crowd-before-Offense cash, a reordering hint
  appears.
- The Run Play button or nearby area includes projected points.

Validation:

- `npm run matchup:fourthphase`
- Manual check: Crowd before Offense and Offense before Crowd show different
  previews.
- Manual check: previewed points match executed points.

Do not touch:

- `engine.ts` scoring formula
- shared context builder semantics

### Ticket 4: Selected Card Order UI

Goal:

Make left-to-right resolution visible.

Recommended UI:

- Selected cards show slot numbers `1`, `2`, `3`, `4`, `5`.
- Arrows or chevrons appear between selected cards.
- The cashing Offense card gets a `CASHES` badge when applicable.
- Crowd cards before the cashing Offense show `CHARGE`.
- Reorder buttons remain visible and touch-friendly.

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/fourthPhaseStyles.ts`

Acceptance criteria:

- A new player can tell the selected cards resolve from left to right.
- Five-card selections do not overflow or obscure controls at 375px width.
- Accessibility is not color-only; slot numbers/icons carry meaning too.

Validation:

- 375px screenshot review.
- Manual touch test for reorder controls.
- `npm run build`

Do not touch:

- `dragReorder`
- card resolution order in `engine.ts`

### Ticket 5: Phase Role Labels On Cards

Goal:

Make each card teach its primary contribution.

Recommended card-face labels:

- Offense: `YARDS` or `CASH`
- Defense: `EXEC`
- Special Teams: `FUEL`
- Crowd: `METER`

For Crowd, show approximate charge:

```text
+0.6 meter
```

For Defense, show the contribution word even if exact value is situation-based:

```text
Execution
```

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/FourthPhaseGuide.tsx`
- `src/lib/fourthPhase/deck.ts` only if helper metadata is needed

Acceptance criteria:

- Cards are understandable without opening the guide.
- Red cards no longer rely only on the word Defense.
- Phase function is visible through text/icon, not just color.

Validation:

- Visual card grid review at 375px.
- Ask cold player what each color does after viewing hand.

Do not touch:

- card values
- team deck mutations

### Ticket 6: Defense-As-Execution Reframe

Goal:

Resolve the largest naming mismatch without destabilizing the data model.

Implementation:

- Keep internal `defense` phase key.
- Change player-facing phase help to `Defense -> Execution`.
- Add a short guide line:
  `Defense creates takeaways and short fields. In Fourth Phase, that becomes
  Execution: cleaner plays, bigger scores.`
- Update boss warnings that say "Defense lowers Execution" to be clearer:
  `Turnover Drill: red Execution cards are less reliable on this play.`
- Consider UI labels like `DEF / EXEC` only as a bridge.

Files likely touched:

- `src/components/fourthPhase/FourthPhaseGuide.tsx`
- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/coach.ts`
- maybe `src/lib/fourthPhase/deck.ts` display helpers

Acceptance criteria:

- No first-run text asks the player to infer Defense's role from football alone.
- Red cards are explained as Execution/reliability.
- Internal type names remain unchanged.

Validation:

- Cold-player question after one drive: `What do red cards do?`
- Pass answer: "make my play bigger/cleaner/more reliable" or similar.

Do not touch:

- internal `Phase = 'defense'`
- engine Execution math

Escalation rule:

If this fails cold tests, rename player-facing red phase to `Protection` or
`Blocking` while keeping internal `defense` as a compatibility key.

### Ticket 7: Collapse Ledger By Default

Goal:

Reduce spreadsheet overload while preserving mathematical trust.

Implementation:

- First-run default: ledger collapsed.
- Default visible summary: one plain-language reason.
- Expanded view: current detailed ledger remains available.

Recommended visible summary examples:

```text
Crowd charged the meter. Cash it with Offense soon.
Crowd cashed into BigPlay for +{points}.
No clean shape. The meter bled.
Special Teams added draw and money for the next snap.
```

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`

Acceptance criteria:

- Detailed ledger is one tap away.
- First-run UI leads with the action result, not ledger rows.
- Existing ledger entries still render in expanded state.

Validation:

- Manual check with ledger collapsed/expanded.
- `npm run build`

Do not touch:

- ledger generation in `engine.ts`

### Ticket 8: First-Run Concept Diet

Goal:

Make the first run a lesson, not the full game.

Implementation options:

- First-time run starts Balanced automatically.
- Team picker is de-emphasized or locked until tutorial completion or first
  completed run.
- Formal Situation names are visually secondary.
- Ledger starts collapsed.
- How-to/reference panels stay available but not central.
- Boss complexity can remain scouted, but the first run should use a gentle or
  heavily telegraphed boss.

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/run.ts`
- localStorage onboarding key, likely a new key such as
  `fp-first-run-cleared-v1`

Acceptance criteria:

- Fresh localStorage starts in a guided Balanced path.
- Existing players are not locked out of teams if they already have tutorial
  completion or history.
- Advanced systems are still present after onboarding.

Validation:

- Clear localStorage and test fresh path.
- Test existing localStorage path.
- `npm run lint`
- `npm run build`

Do not touch:

- team balance values
- existing history schema without migration thinking

### Ticket 9: Meter Bleed Telegraph And Rookie Mercy

Goal:

Stop meter bleed from feeling like an invisible punishment.

Implementation stance:

- First try: telegraph bleed before it happens.
- Add `CASH NOW` or `Hot meter will bleed if ignored` nudge.
- Show expected bleed in preview if selected play ignores a hot meter.
- Consider disabling or reducing bleed only for the first guided drive/run.

Do not globally change normal-run bleed until after onboarding validation.

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/coach.ts`
- possibly `src/lib/fourthPhase/engine.ts` only if preview needs a cleaner flag

Acceptance criteria:

- Player sees meter risk before losing charge.
- Bleed appears in the preview/result summary in plain English.
- Standard-run balance remains inside gates unless a deliberate rookie-only flag
  is added.

Validation:

- Manual hot-meter ignored-play test.
- `npm run matchup:fourthphase`
- If any math changes: `npm run balance:fourthphase -- 3000`

Do not touch:

- normal `DEFAULT_BLEED_RATE` unless creating a gated rookie path

### Ticket 10: Cash-In Moment Upgrade

Goal:

Make the central combo feel like the game, not just a bigger number.

Implementation:

- Bigger `CASHED` result state.
- Animate meter into BigPlay/score.
- Hold the final points for a beat.
- Use reduced-motion-safe variant.
- Align share-card copy with the cash-in moment.

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/components/fourthPhase/fourthPhaseStyles.ts`
- possibly share-card rendering in `FourthPhaseLab.tsx` or extracted helper

Acceptance criteria:

- Cash-in is visually distinct from a normal score.
- Motion respects `prefers-reduced-motion`.
- No text overlaps at 375px.
- It is clear what multiplied what.

Validation:

- Manual cash-in at low meter and high meter.
- Mobile viewport check.
- `npm run build`

Do not touch:

- meter math
- scoring formula

### Ticket 11: War Room Coaching Frame

Goal:

Make the between-drive shop feel like a coaching decision.

Recommended first War Room copy:

```text
Drive cleared. Draft help for the next drive.
Buy up to 2 upgrades, or skip to bank $3.
Coach Pick: {offer} because {reason}.
```

Offer copy should answer:

- What problem does this solve?
- Is it for scoring, meter, fuel, boss answer, or team identity?
- Why might I want it now?

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/run.ts`
- `src/lib/fourthPhase/coach.ts`

Acceptance criteria:

- Each offer has a short reason or tag.
- Coach Pick is visually prominent.
- War Room does not introduce more jargon than needed.
- Economy values are unchanged.

Validation:

- Manual first War Room check.
- Ask player which offer they would take and why.

Do not touch:

- buy limits
- reroll costs
- offer cost balance

### Ticket 12: Diagnostic Loss And Drive Summary

Goal:

Make losses and near-misses teach the next attempt.

Possible result text:

```text
You ran out of plays with the meter hot. Next time, cash Crowd with Offense
sooner.
```

```text
Your biggest play was {bestPlay}. Build Crowd before Offense to create a bigger
cash-in.
```

```text
Too many broken calls. Look for one clear shape: score, charge, fuel, or cash.
```

Files likely touched:

- `src/components/fourthPhase/FourthPhaseLab.tsx`
- `src/lib/fourthPhase/coach.ts`

Acceptance criteria:

- Loss screen names one primary reason.
- Reason is grounded in state/last play/ledger.
- Copy says what to try next.

Validation:

- Force known loss cases.
- Verify reason matches actual play history.

Do not touch:

- loss rules

## Later Work: Do Not Start Yet

These are valuable but not next:

- Field position or downs.
- Stakes/difficulty ladder.
- Collection/compendium.
- Unlock trees beyond first-run progressive disclosure.
- New teams.
- More jokers.
- More bosses.
- Tarot/Spectral-style consumables.
- Major component refactor of `FourthPhaseLab.tsx`.
- Full balance retune.

Exception:

Small copy/name changes such as player-facing `Jokers` -> `Coaches` may be
bundled into War Room clarity if cheap, but avoid a broad terminology migration
until the first-run loop is fixed.

## Keep / Change / Cut / Defer

| Area | Decision | Rationale |
| --- | --- | --- |
| Scoring equation | Keep | Strongest stable foundation |
| Deterministic scoring | Keep | Trust and replayability |
| Crowd -> Offense loop | Keep and elevate | Central game identity |
| Left-to-right order | Keep and surface | Core puzzle |
| Abstract drive targets | Keep | Field position remains gated |
| Four phases | Keep but relabel jobs | Structure is useful, names alone are not |
| Defense as hidden role | Change | Must become visibly Execution/reliability |
| Special Teams as hidden economy | Change | Label as Fuel |
| Formal Situation names early | Defer | Show verbs first |
| Full ledger by default | Defer | Keep behind details |
| Team selection first run | Defer | Start Balanced |
| Practice Drill detail first minute | Defer | Too much too early |
| War Room economy | Keep | Do not change values yet |
| Meter bleed | Telegraph, maybe rookie-gate | Good expert tension, bad hidden punishment |
| Cash-in visual | Change | Needs emotional signature |
| New systems/content | Defer | Clarity first |
| Field position | Defer | Gate not satisfied |
| Backend/real IP/betting | Refuse | Product constraint |

## Validation Plan

### Automated Gates

For UI/copy-only changes:

```bash
npm run lint
npm run build
npm run matchup:fourthphase
```

For any scoring, meter, target, team, boss, joker, War Room, or first-run math
change:

```bash
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000
```

Run legacy Gridiron balance only if shared harness or legacy engine code changes:

```bash
npm run balance:gridiron -- 3000
```

### Manual QA

Required viewports:

- 375px phone width
- 430px large phone width
- 560px max-width desktop-ish app shell

Checks:

- no text overlap
- touch targets remain comfortable
- selected-card strip supports five cards
- reorder controls are visible
- sticky Run Play area fits
- tutorial text fits
- cash-in animation does not obscure required next action
- reduced-motion mode remains readable

### Cold-Player Test

Use 3-5 cold players only after tickets 1-8 are in.

Script:

1. Hand them the phone on a fresh run.
2. Say nothing except: `Play until you either clear a drive or feel stuck.`
3. Observe, do not coach.
4. Stop after 60 seconds for comprehension questions.

Pass questions:

- What are you trying to do right now?
- What happens if you run out of plays?
- What do purple cards do?
- What does blue Offense do?
- Why does order matter?
- What do red cards do?
- What would you buy in the War Room and why?

Pass threshold:

- 3 out of 5 can state the objective.
- 3 out of 5 understand Crowd -> Offense.
- 3 out of 5 explain red cards as Execution/reliability/support.
- 3 out of 5 can choose a War Room offer with a reason.

## Release Readiness Ladder

### Current State: Hold

Reason:

- Creator did not understand the game cold.
- The reviews agree wider testing would waste fresh eyes.

### Next Target: Limited Playtest

Requirements:

- Objective header.
- Tutorial rewrite.
- Preview teaches score/action.
- Order UI visible.
- Defense-as-Execution reframe.
- Ledger collapsed.
- Balanced first-run path.
- Cash-in visibly distinct.

Audience:

- 3-5 cold players first.
- Then 10-20 limited testers if the cold test passes.

### Later Target: Public Alpha

Requirements:

- Limited test confirms comprehension.
- Balance gates still pass.
- Mobile QA passes.
- Daily/run-code/share loops are understandable.
- Loss screen teaches next run.

## Recommended Sprint Order

### Sprint A: First Minute Clarity

Implement:

1. Persistent objective header.
2. Job-first tutorial rewrite.
3. Preview effect verbs and equation line.
4. Selected-card order numbers/arrows.
5. Defense-as-Execution labels.
6. Ledger collapsed.

Expected result:

Player can answer: `What am I doing?`

### Sprint B: Rookie Path And Feedback

Implement:

1. Balanced first-run path.
2. First-run concept diet.
3. Meter bleed telegraph or rookie mercy.
4. Cash-in visual upgrade.
5. Diagnostic loss screen.

Expected result:

Player can answer: `Why did that work or fail?`

### Sprint C: Between-Drive Strategy

Implement:

1. War Room coaching frame.
2. Coach Pick prominence.
3. Offer "why this helps" copy.
4. Optional player-facing `Jokers` -> `Coaches` terminology pass.
5. Boss warning clarity.

Expected result:

Player can answer: `What should I draft and why?`

### Sprint D: Validate, Then Decide

Do:

1. Full automated gates.
2. Manual mobile QA.
3. Cold-player test.
4. Document outcomes.
5. Decide whether to proceed to limited playtest or rename Defense harder.

Expected result:

Either move to limited playtest or run one more clarity pass.

## Explicit Non-Actions

Do not do these next:

- Do not add field position.
- Do not add more content.
- Do not add a collection system.
- Do not add a stakes ladder.
- Do not retune standard difficulty until onboarding is readable.
- Do not refactor `FourthPhaseLab.tsx` heavily during the clarity sprint.
- Do not change scoring formula.
- Do not add backend/social systems.
- Do not use real teams/players/leagues.

## Summary

The next step is not making Fourth Phase deeper. It is making Fourth Phase
obvious.

The engine says the game works when the player understands it. The product now
has to teach that understanding on the screen:

```text
Score the target.
Crowd charges.
Offense cashes.
Execution supports.
Fuel helps later.
Order matters.
```

Everything else waits.
