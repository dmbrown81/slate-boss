# Fourth Phase Playbook Deck System — 2026-07-11

## Product decision

The 52-card set is the collectible library, not the run deck. A run begins with
a 28-card game plan selected by the chosen playbook. The War Room may grow it
to 30 cards; after that, installing a reserve card requires cutting one.

Cards are binder-style **playbook inserts**, not literal poker cards with random
football words. They represent:

- Offense: an offensive call or concept.
- Defense: a defensive call, coverage, pressure, or takeaway plan.
- Special Teams: a kick, return, coverage, or field-position call.
- Crowd: a playable crowd prompt that builds the game's fourth-phase resource.

PRIME TIME, SHORT WEEK, HOMECOMING, SILENT COUNT, and SUNDAY CLASSIC are
**game-day conditions**. They change declared run parameters and are never
shuffled into a hand.

## Six starting game plans

Every list has 28 unique inserts. The counts are intentionally asymmetrical so
the playbook changes what the player can reliably assemble.

### Pro Style — 8 OFF / 7 DEF / 6 ST / 7 CRD

- Offense: Bubble Screen, Stick Quick, Zone Read RPO, Inside Zone, Mesh
  Crossers, Four Verticals, Play Action Boot, Duo.
- Defense: 4-3 Run Fit, Rally Tackle, Robber Coverage, A-Gap Mug, Sim Pressure,
  Coverage Disguise, Ball Hawk.
- Special Teams: Coverage Lane, Pooch Kick, Gunner, Return Lane, Directional
  Punt, Hidden Yards.
- Crowd: Student Section, Chant Leader, Drumline, Towel Wave, On Their Feet,
  Rising Noise, Pressure Roar.

### Air Raid — 10 OFF / 5 DEF / 4 ST / 9 CRD

- Offense: Bubble Screen, Stick Quick, Zone Read RPO, Mesh Crossers, Tempo
  Drive, Boundary Fade, Four Verticals, Play Action Boot, Y-Cross, Choice Route.
- Defense: Rally Tackle, Robber Coverage, Press Man, Sim Pressure, Coverage
  Disguise.
- Special Teams: Pooch Kick, Gunner, Return Lane, Return Captain.
- Crowd: Student Section, Chant Leader, Drumline, Towel Wave, On Their Feet,
  Rising Noise, Noise Wall, Stadium Shake, Pressure Roar.

### Power — 9 OFF / 7 DEF / 7 ST / 5 CRD

- Offense: QB Keep, Bubble Screen, Stick Quick, Zone Read RPO, Inside Zone,
  Mesh Crossers, Boundary Fade, Play Action Boot, Duo.
- Defense: 4-3 Run Fit, Edge Set, Rally Tackle, Robber Coverage, A-Gap Mug, Sim
  Pressure, Edge Pressure.
- Special Teams: Coverage Lane, Pooch Kick, Gunner, Corner Punt, Return Lane,
  Directional Punt, Hidden Yards.
- Crowd: Student Section, Chant Leader, Drumline, Towel Wave, On Their Feet.

### Pressure — 6 OFF / 11 DEF / 6 ST / 5 CRD

- Offense: Bubble Screen, Stick Quick, Mesh Crossers, Boundary Fade, Four
  Verticals, Y-Cross.
- Defense: 4-3 Run Fit, Edge Set, Rally Tackle, Robber Coverage, A-Gap Mug,
  Press Man, Zero Blitz, Sim Pressure, Strip Pressure, Coverage Disguise, Ball
  Hawk.
- Special Teams: Coverage Lane, Gunner, Corner Punt, Directional Punt, Pin
  Deep, Hidden Yards.
- Crowd: Student Section, Drumline, On Their Feet, Rising Noise, Pressure Roar.

### Spread — 8 OFF / 4 DEF / 5 ST / 11 CRD

- Offense: Bubble Screen, Stick Quick, Zone Read RPO, Mesh Crossers, Tempo
  Drive, Four Verticals, Y-Cross, Choice Route.
- Defense: Rally Tackle, Robber Coverage, Sim Pressure, Coverage Disguise.
- Special Teams: Pooch Kick, Gunner, Return Lane, Directional Punt, Return
  Captain.
- Crowd: Student Section, Chant Leader, Drumline, Towel Wave, On Their Feet,
  Rising Noise, Noise Wall, Stadium Shake, Pressure Roar, Full-Throat Roar,
  Crowd Swell.

### Multiple — 6 OFF / 5 DEF / 12 ST / 5 CRD

- Offense: Bubble Screen, Stick Quick, Zone Read RPO, Mesh Crossers, Boundary
  Fade, Four Verticals.
- Defense: 4-3 Run Fit, Rally Tackle, A-Gap Mug, Sim Pressure, Ball Hawk.
- Special Teams: Coverage Lane, Pooch Kick, Gunner, Corner Punt, Return Lane,
  Hands Team, Fake Punt, Directional Punt, Pin Deep, Automatic Kicker, Return
  Captain, Hidden Yards.
- Crowd: Student Section, Drumline, On Their Feet, Rising Noise, Pressure Roar.

## Drive-aware draw contract

Each card has a visible role: Opening Script, Counterpunch, or Closing Drive.

- Drive 1 spotlights Opening Script cards.
- Drive 2 spotlights Counterpunch cards.
- Closing Drive cards are in the active game plan but dormant in Drives 1–2.
- Drive 3 unlocks and spotlights Closing Drive cards.
- Coached-up cards are promoted into the next eligible opening hand.
- Ordering is derived from the run seed, drive index, and active deck. There are
  no hidden scoring rolls and preview/execution still share the same scorer.

This is a pacing rule, not a second invisible deck. The War Room and verdict
always show the full persistent game plan, including dormant closing calls.

## War Room economy

Each room deals four adjustments:

- Two reserve cards not already in the active deck. At least one matches the
  next drive's act.
- One joker.
- One Practice Drill, with the SCOUTED boss-answer guarantee preserved.

A reserve card arrives **Coached Up**: +7 call strength, +0.14 Leverage, and, on
Crowd cards, +0.8 Momentum charge. This mutation is visible on the card and in
the score ledger. The first two installs may grow 28 to 30 cards. Further
installs require a cut, making removal and replacement part of the run economy.

## Source and IP boundary

`docs/reference/cfb27-formation-plays-source.json` and the accompanying workbook
are research/calibration inputs. The extracted corpus contained 13,943 play
rows across 561 formations. It informed the generic concept vocabulary and
package frequency: Inside Zone, Read Option, Bubble Screen, Stick, Mesh, Four
Verticals, Play Action Boot, Duo, and Y-Cross.

The source catalog, URLs, game title, formation inventory, and images must not
be bundled into the app. Runtime content stays generic and fictional. The
generator writes to `docs/reference/`, never `public/`.

The supplied fantasy-football glossary is a terminology check, not a card
catalog. Box-score and DFS metrics such as targets, aDOT, and fantasy points do
not belong in the shipped play-call deck unless a later design explicitly adds
a separate, fictional stat layer.

## Cold-play gate (five humans)

This code change cannot honestly claim the human gate. Run five phone-first
sessions with players who have not seen the rules. Do not coach after kickoff.

After one run, ask in this order:

1. “What was your build?” Do not show the verdict receipt until they answer.
2. “Which two cards or concepts were most important?”
3. “What changed when you installed a card in the War Room?”
4. “Did any card feel like it appeared at the wrong point in the game?”
5. “Would you start another run? If yes, which playbook would you try and why?”

Pass criteria:

- 4/5 describe a coherent phase or concept lean without reading UI copy.
- 4/5 can name at least one War Room install or cut and its intended effect.
- 0/5 report a Closing Drive card in Drives 1–2; deterministic tests enforce
  this mechanically as well.
- 3/5 voluntarily choose or name a different playbook for the next run.
- 4/5 understand that game-day conditions are run rules, not playable cards.

Record quotes and observed behavior, not only yes/no answers. If this gate
fails, change deck composition, offer quality, or presentation before adding
more cards, events, or progression systems.

## Automated evidence

`npm run matchup:fourthphase` asserts deck size, list uniqueness, draw timing,
War Room reserve composition, mutation receipts, determinism, and scoring
parity. `npm run balance:fourthphase -- 3000` remains the required quantitative
gate; it also requires a skilled-pilot median of at least two coached-up card
installs. Small samples are exploratory only.
