# Fourth Phase Field Position Gate

Last updated: 2026-06-30

Fourth Phase should not add field position yet. The current product bet is still:

```text
Make one run teach itself, make the War Room matter, and make every big score explainable.
```

Field position is allowed only after the existing abstract-target loop proves it has enough retention and decision density.

## Must Be True First

- `npm run balance:fourthphase -- 3000` passes the hard target gates:
  - synergy pilot win rate: 75-85%
  - no-draft pilot win rate: 55-65%
  - draft gap: at least +15 win points versus no-draft
  - per-team win spread: at most 6 points
  - Loud House is not the bottom team
- The first-run tutorial gets a cold player to a meter cash-in without opening the reference panels.
- Daily play is visible locally through `fourth_phase_daily_v1`, with the player able to replay/import a run code and compare against local best.
- The scoring ledger explains the largest cash-in without hidden rolls or UI-side recomputation.

## Retention Signal

Because the product remains local-first, the only acceptable early signal is local and privacy-safe:

- a completed Daily run record exists for today
- streak can increase across consecutive UTC dates
- the player has at least one completed Fourth Phase history entry in `fourth_phase_history_v1`

If those signals are not improving in playtests, field position is deferred. More football texture should not be used to hide a weak loop.

## If The Gate Opens

Build field position behind a feature flag and preserve abstract mode until the new system passes the same deterministic and balance gates. Field position must not introduce hidden randomness, backend state, real teams, betting language, prizes, accounts, or licensed IP.
