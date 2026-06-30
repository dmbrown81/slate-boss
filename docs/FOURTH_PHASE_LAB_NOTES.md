# Fourth Phase Lab Notes

Fourth Phase is implemented as an isolated prototype next to Callsmith. It uses
new source under `src/lib/fourthPhase/` and `src/components/fourthPhase/`; the
only Callsmith touchpoints are the `App.tsx` screen branch and the
`FootballHome` lab entry.

## Current Shape

- Skeleton decision: abstract-target mode first. Each lab game has three drives
  with rising point targets; the third drive activates a soft boss pivot. The
  field-position/downs model is intentionally not active yet.
- Progression decision: the light local unlock spine is not active. Starting
  classes, jokers, and bosses are available inside the lab without persistence
  or power gates.
- Scoring contract: `Drive Points = Yards x (1 + Execution) x BigPlay`.
- Crowd Meter: visible hero gauge, starts at `x1.0`, base cap `x6.0`, bounded
  absolute cap `x12.0` for Decibel Record.
- Reorder matters: selected cards and the joker lineup can be reordered with
  on-card `◀ ▶` controls (touch- and keyboard-accessible) or by mouse drag on
  desktop. Crowd cards before Offense charge the meter before House Call or
  Complementary Football cashes it.
- Scoring contract is exact: the three displayed terms always reconcile to the
  shown points (`Yards x (1 + Execution) x BigPlay`). The Genius applies its
  bonus inside BigPlay rather than as a hidden fourth multiplier.

## Readability

Better than Callsmith for the central multiplier. The meter is no longer a
background stat; it dominates the lab screen and the ledger explicitly shows
when a Crowd card charges and when Offense cashes. The phase/rank card model is
also easier to parse at a glance than Callsmith's richer football card grammar.

The current weak point is that the rest of the football story is thinner. Fourth
Phase teaches the math cleanly, but it does not yet teach real down-distance,
coverage, or play-call texture the way Callsmith does.

## Fun Signal

The build-and-cash loop works. A `crowd -> offense` House Call scoring higher
than `offense -> crowd` is immediately legible, and Complementary Football plus
The Genius produces the right "I broke the game" spike.

The War Room is still skeletal. Joker drafting creates a measurable gap, but it
is not yet a rich build meta. The next tuning pass should make draft choices
produce more divergent lines rather than mostly raising already-strong pilots.

## Harness Snapshot

The harnesses are prototype gates, not proof of final balance. The gates are
calibrated so they can actually fail: the synergy win rate is a band (45-88%),
not a floor, so targets that are too soft now fail rather than pass at ~97%.

- `npm run matchup:fourthphase` checks recognizer priority, exact Checkdown
  scoring, Crowd cash order, the points/term reconciliation, meter hooks, joker
  hooks, boss pivots, edition-to-base-Yards, and the Road Game cap holding even
  under Decibel Record.
- `npm run balance:fourthphase -- 3000` reports median, p90, p99, fail rate,
  build gap, team viability, and meter ceiling tightness, plus an advisory
  reward-win-gap line. The synergy pilot reorders plays (Crowd before Offense)
  so the harness now exercises the meter cash-order mechanic instead of ignoring
  it.
- Callsmith must still be verified separately with its own gates; Fourth Phase
  does not inherit Callsmith's balance.

Latest full sample (`npm run balance:fourthphase -- 3000`, targets retuned for
real failure pressure):

- Synergy pilot: 80.3% clear rate, median score 1556, p90 1897, p99 2343.
- Random pilot: 5.2% clear rate, median score 651.
- No-draft pilot: 78.9% clear rate, median score 1532.
- Build gap: +75.1 win-rate points versus random (hard gate, passes).
- Per-team viability: all six teams cleared at least 73.4% (Smashmouth lowest).
- Meter ceiling tightness: 15.7% of synergy plays ended near cap; p99 peak
  meter was `x7.60`.
- Reward WIN gap (advisory, not a gate): only +1.4 win points versus no-draft
  (+24 median score). Flagged `🟡` because the joker catalog is still thin, so
  drafting mostly raises an already-strong pilot rather than flipping losses to
  wins. This is the next content/tuning pass, not a scoring bug.

Latest Callsmith preservation sample (`npm run balance:gridiron -- 3000`):

- Existing balance gate exited cleanly.
- The campaign cleared-drive p99/median ceiling was `3.09x`, a soft yellow
  consistent with the known ceiling watch item.

## Audit Fixes (2026-06-29)

A review pass addressed the following, all verified by lint, build, both matchup
proofs, and the 3000-sample balance harness:

- Reorder is now touch- and keyboard-accessible (`◀ ▶` controls), not desktop
  drag only. This was the signature mechanic and it was previously dead on the
  mobile target.
- The harness no longer overstates confidence: gates can fail (synergy win is a
  45-88% band), the pilot reorders for cash, targets were raised for real
  failure pressure, and the reward-win-gap is an honest advisory line.
- The scoring contract is exact again. The Genius folds into BigPlay (no hidden
  fourth multiplier), so the preview's three terms always reconcile to points.
- Card editions that raise value (All-Pro, In Rhythm) now affect base Offense
  Yards, not only retriggers.
- Road Game's meter-cap suppression is no longer overridden by Decibel Record.
- Minor: stale cash-in panel cleared per drive; dead late-cash branch removed;
  Home Cooking de-duplicated; UI/harness share one per-drive play cap.

Known deferred item (low): the on-screen run code (`FP-...`) is a deterministic
fingerprint of the run, but the lab has no seed-import field, so it cannot be
re-entered to replay a run. A code-import flow is a feature for the migration
phase, not an audit fix.

## Migration Verdict

Do not migrate yet. Fourth Phase is more readable around the scoring equation
and has a stronger screenshot/cash-in spine, but Callsmith still has the deeper
football grammar. The next empirical checkpoint should be a field-position flag
or a stronger joker-content pass, then compare whether Fourth Phase can keep its
clarity while adding football texture.
