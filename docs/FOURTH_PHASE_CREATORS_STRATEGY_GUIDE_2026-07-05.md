# Fourth Phase Creators Strategy Guide

Date: 2026-07-05  
Current build reviewed: `8e3c76a`  
Primary sources: `src/lib/fourthPhase/*`, `scripts/fourthPhaseBalance.ts`, `scripts/fourthPhaseMatchup.ts`

## Short Answer

Fourth Phase is not "all random" right now.

The draw is variable, but scoring is deterministic. If the same cards are played in the same order with the same momentum, boss, practice levels, and jokers, the score is the same every time. The player skill is in recognizing which scoring shape the hand can make, whether to spend the hand now, whether to discard, and whether to sequence the calls correctly.

The best current strategy is:

1. Build momentum with Crowd Surge, Field Flip, or strong non-cashing plays.
2. Cash that momentum with Crowd before Offense, especially Shot Play or Complementary Football.
3. Use defense to create Sudden Change and short-field shots.
4. Layer the new football-call combos on top of the bigger phase combos.
5. Draft War Room rewards that reinforce the playbook instead of chasing random upside.

The latest full balance run confirms the skill gap:

| Pilot | Win Rate | Median Score | Combo Plays | Combo Clears |
| --- | ---: | ---: | ---: | ---: |
| Synergy pilot | 81.0% | 1907 | 10.1% | 2.2% |
| Random pilot | 2.4% | 629 | 3.6% | 0.4% |
| No-draft synergy pilot | 64.4% | 1790 | 10.0% | 1.7% |

So the game is already a strategy game, not a random card flipper. The open creator question is how loudly the UI and content should teach the player that.

## How Scoring Works

Every scoring play still follows the core contract:

```text
points = Yards x (1 + Leverage) x Explosive
```

The three terms mean:

| Term | What it means in football language | Usually created by |
| --- | --- | --- |
| Yards | The payload of the play | Offense, Sudden Change, Complementary Football |
| Leverage | How clean the look is | Defense, all-phase football, combos, practice, jokers |
| Explosive | The multiplier | Crowd cash-ins, shot plays, jokers, hot momentum |

Momentum is the biggest swing system. Crowd cards charge it, and some situations cash it. The key rule: cashing happens when an Offense card is scored inside a cashing situation, so order matters. Crowd before Offense can be dramatically better than Offense before Crowd.

Example at base momentum:

| Call Order | Situation | Points | Why |
| --- | --- | ---: | --- |
| Home Field + Four Verts | Shot Play | 36 | Crowd charges first, then Offense cashes x2.00 |
| Four Verts + Home Field | Shot Play | 18 | Offense cashes before Crowd charge is available |

That is the current heart of the game.

## What Is Random

Randomness currently lives in availability, not hidden scoring.

Random or seed-driven:

- Deck shuffle and hand draw.
- Which boss appears on the final drive.
- War Room offer selection.
- Whether a specific combo is available in the current hand.
- The run code/seed that defines the run.

Deterministic:

- Situation recognition.
- Points from a given play.
- Momentum gained, cashed, or bled.
- Combo triggers.
- Boss penalties.
- Joker hooks.
- Practice bonuses.

That distinction is important. A player cannot force a perfect hand, but they can absolutely learn the best shape of a hand when it appears.

## Current Power Rankings

### 1. Complementary Football

Trigger: at least one Offense, Defense, Special Teams, and Crowd card.

This is the apex situation. It scores, cashes momentum, gives fuel, and rewards all-four-phase thinking. It is the best expression of the product fantasy: football as a connected system, not isolated cards.

Example:

| Cards | Points | Fuel | Notes |
| --- | ---: | --- | --- |
| Home Field + Y-Cross + Coverage Disguise + Pin Deep | 98 | +1 draw, +$2, +1 discount | Base momentum |
| Same call at x3 momentum | 197 | +1 draw, +$2, +1 discount | Hot meter turns it into a drive winner |

Creator note: this should remain one of the best things a player can do. It teaches the thesis of the game.

### 2. Crowd Before Offense Cash

Trigger: any Offense plus Crowd creates Shot Play.

The best simple pattern is still "charge then cash." The order is the strategy. If the player has Crowd and Offense in the same scoring play, Crowd should usually be first unless a boss or joker changes the incentive.

Example:

| Cards | Starting Momentum | Points | Result |
| --- | ---: | ---: | --- |
| Home Field + Four Verts | x1.00 | 36 | Clean cash |
| Home Field + Duo | x3.00 | 72 | Hot-meter cash |

Creator note: this is the easiest exciting rule to teach. It feels like calling the stadium into the play.

### 3. Crowd Surge Into a Future Cash

Trigger: 3 or more Crowd cards.

Crowd Surge scores 0, but it can build huge momentum. In the current build:

| Cards | Points | Momentum After |
| --- | ---: | ---: |
| Under the Lights + Hostile Environment + Home Field | 0 | x4.10 |

This is a setup play. It is strongest when the player can cash soon after, especially through Shot Play or Complementary Football.

Creator note: this is a great place to make players feel clever, but it must remain risky. A hot meter that is never cashed should feel like leaving points on the field.

### 4. Sudden Change

Trigger: 2 or more Defense cards plus at least 1 Offense card, with no Crowd.

Sudden Change is the defense-to-offense payoff. It does not cash Crowd momentum like Shot Play, but it has a strong base floor and builds momentum.

Example:

| Cards | Points | Momentum Charged |
| --- | ---: | ---: |
| Strip Sack + Ball Hawk + Four Verts | 68 | +0.45 |

Creator note: this is the defensive player's favorite path. It should keep feeling different from offense/crowd fireworks: steadier, meaner, more field-position driven.

### 5. Field Flip

Trigger: 2 or more Special Teams cards.

Field Flip usually scores 0, but it gives draw, money, and sometimes discount tokens. It is not the highlight play; it is the play that makes the next highlight possible.

Example:

| Cards | Points | Fuel |
| --- | ---: | --- |
| Gunner + Coffin Corner | 0 | +1 draw, +$2 |

Creator note: this is the economy valve. It is strategically important, but it needs satisfying feedback so players do not mistake it for a wasted turn.

## Football-Call Combo Guide

The new playbook system adds call sequencing on top of the existing phase situations. These are currently tactical bonuses, not the biggest source of points. That is good. They make the player feel smart without breaking the larger phase economy.

### Run Sets Up Play Action

Trigger: a Run or option-style card immediately before a Play Action card.

Current setup cards:

- QB Sneak
- Zone Read RPO
- Inside Zone
- Duo

Current payoff card:

- Play Action Boot

Example:

| Order | Points | Combo |
| --- | ---: | --- |
| Inside Zone + Play Action Boot | 18 | Yes |
| Play Action Boot + Inside Zone | 15 | No |

Creator note: this is familiar football logic and should be one of the first combos players learn.

### Short Field Shot

Trigger: a short-field or takeaway setup immediately before an Offense shot.

Current setup cards:

- Strip Sack
- Ball Hawk
- Green Dot
- Pin Deep

Current shot cards:

- Red-Zone Fade
- Four Verts
- Play Action Boot
- Y-Cross
- Deep Choice

Example:

| Order | Points | Combo |
| --- | ---: | --- |
| Strip Sack + Ball Hawk + Four Verts | 68 | Yes |
| Four Verts + Strip Sack + Ball Hawk | 64 | No |

Creator note: the difference is currently modest, but the fantasy is strong. This can become a signature discovery lane if more cards, jokers, and playbook identities reference "short field."

### Scripted Series

Trigger: 3 selected cards share the same `formation:*` tag.

Best current formation clusters:

| Formation | Current Cards | Notes |
| --- | --- | --- |
| Trips | Bubble Motion, Stick Quick, Tempo Drive, Four Verts, Y-Cross | Best offensive cluster right now |
| 4-2-5 | Robber Coverage, A-Gap Mug, Press Man, Zero Blitz, Sim Pressure, Strip Sack | Best defensive cluster |
| 4-3 | 4-3 Run Fit, Edge Set, Rally Tackle | Low-rank defensive floor cluster |
| Quarters | Coverage Disguise, Ball Hawk, Green Dot | Defensive shell plus takeaway cluster |
| Ace | Inside Zone, Duo | Needs a third card to become a complete creator-facing cluster |
| Singleback | Red-Zone Fade, Play Action Boot | Needs a third card to become a complete creator-facing cluster |

Example:

| Cards | Situation | Points | Combo |
| --- | --- | ---: | --- |
| Bubble Motion + Stick Quick + Tempo Drive | Sustained Drive | 23 | Scripted Series |

Creator note: this is the cleanest path toward "choose your own offense/defense." Formation families can become archetypes without using real team IP.

## Phase Situation Cheat Sheet

| Situation | Trigger | Role |
| --- | --- | --- |
| The Checkdown | 1-2 Offense only | Safe small score |
| Sustained Drive | 3+ Offense | Offense payload |
| Defensive Stand | 3+ Defense | High-floor defense score |
| Field Flip | 2+ Special Teams | Draw, money, discounts |
| Crowd Surge | 3+ Crowd | Momentum builder |
| Momentum Shift | 2+ Offense and 2+ Defense | Two-way floor |
| Shot Play | Offense + Crowd | Momentum cash |
| Sudden Change | 2+ Defense + Offense, no Crowd | Defense creates offense |
| Complementary Football | All four phases | Apex payoff |
| Busted Play | No clean shape | Penalty state |

## Team Playbook Identities

The teams are now fictional playbook profiles. They are balanced close enough that the choice is about style, not pure power.

Latest synergy-pilot team results:

| Playbook | Fictional Team | Win Rate | Median | What It Wants |
| --- | --- | ---: | ---: | --- |
| Pro Style | Ironwood Engineers | 83.4% | 2128 | Balanced all-phase scripts |
| Air Raid | Canyon Comets | 78.0% | 2184 | Pass spacing, shots, Y-Cross, Four Verts |
| Power | Foundry Maulers | 80.4% | 1812 | Inside Zone, Duo, Play Action |
| Pressure | Harbor Bruisers | 79.2% | 2049 | Defense, takeaways, Sudden Change |
| Spread | Summit Stampede | 82.0% | 1644 | Quick game, tempo, crowd momentum |
| Multiple | River City Sparks | 83.2% | 1670 | Special Teams, field position, economy |

Current read:

- Pro Style is the best teaching playbook.
- Air Raid has the highest median in the sample but the lowest win rate because its targets are harder.
- Power is the most natural home for Run into Play Action.
- Pressure is the best home for Takeaway into Shot.
- Spread is the best home for Crowd before Offense.
- Multiple is the best home for Field Flip and War Room economy.

## Boss Counterplay

| Boss | What It Punishes | Best Response |
| --- | --- | --- |
| Stacked Box | Offense yards are cut | Lean defense, Crowd cash, all-phase bonuses |
| No-Fly Zone | More than 2 Offense cards | Avoid bloated Offense hands; use Shot Play and Complementary Football |
| Road Game | Momentum cap forced to x2.0 | Stop over-investing in Crowd Surge; take reliable scoring |
| Ball Security | Defense leverage reduced | Do not rely only on Sudden Change |
| Touchback Machine | Special Teams fuel suppressed | Spend ST only when needed for all-phase shape |
| Got Your Number | Repeated situations score 0 | Rotate situations deliberately |
| Prevent Defense | Explosive capped | Shift from huge cashes to yards/leverage/fuel |

Creator note: bosses are already good at forcing variety. If the playbook system expands, each boss should ideally counter a style without deleting it.

## War Room Priorities

The balance harness shows drafting matters a lot:

- Synergy with drafting: 81.0% win rate.
- Synergy without drafting: 64.4% win rate.
- Draft gap: +16.7 win points and +117 median score.

That means the War Room is not flavor. It is a major strategy layer.

General draft rules:

1. Take rewards that reinforce your team identity.
2. Take economy when your deck needs time to assemble.
3. Take all-phase or momentum rewards if you are already seeing Crowd and Special Teams.
4. Take defensive rewards if your best hands are Sudden Change or short-field scripts.
5. Avoid drafting a reward that asks you to play a shape your deck rarely makes.

High-value examples:

| Reward Direction | Best Fit |
| --- | --- |
| Complementary Football boosts | Pro Style, Multiple |
| Shot Play/momentum cash boosts | Spread, Air Raid |
| Sudden Change/takeaway boosts | Pressure |
| Field Flip fuel boosts | Multiple |
| Run/play-action boosts | Power |

## Best Current Combos To Design Around

These are the combinations that currently feel most important:

1. Crowd before Offense.
   - This is the biggest simple order lesson.
   - It should be visible, previewed, and celebrated.

2. All four phases.
   - This is the best full-system payoff.
   - It should remain a marquee moment.

3. Defense into Offense.
   - Sudden Change gives defensive decks a real identity.
   - Takeaway into Shot is the football-call version of this.

4. Crowd Surge into Shot Play.
   - This is the clearest "setup turn, cash turn" loop.
   - It creates the biggest emotional swing.

5. Field Flip into War Room scaling.
   - This is how economy players win.
   - It needs clear feedback because it scores 0.

6. Trips Scripted Series.
   - This is currently the strongest formation-family clue.
   - It is the best proof that "choose your offense" can work.

## Creator Design Rules

If the playbook direction expands, protect these rules:

1. Keep scoring deterministic.
   - Players should lose because they missed a better line, not because the engine rolled against them.

2. Keep phase situations bigger than micro-combos.
   - Run into Play Action should feel smart.
   - It should not matter more than Complementary Football.

3. Make familiar football logic discoverable.
   - Run before Play Action.
   - Takeaway before Shot.
   - Crowd before Offense.
   - Same formation creates a script.

4. Let playbooks specialize without becoming solved.
   - Power should love Play Action.
   - Air Raid should love spacing and shots.
   - Pressure should love short fields.
   - Spread should love tempo and crowd cash.
   - Multiple should love hidden yards and odd sequencing.

5. Do not copy real team brands.
   - The calls can sound football-familiar.
   - The teams, names, and presentation should stay fictional.

6. Teach through previews.
   - The preview should show when a combo fires.
   - The play summary should explain why the order worked.
   - Players should be able to learn by experimenting.

## Is There A Solved Best Deck?

Not yet.

There are best patterns, but there is no single solved deck because the run depends on:

- Team deck composition.
- Draw order.
- Boss pressure.
- War Room offers.
- Momentum state.
- Practice upgrades.
- Joker interactions.
- Drive targets.

The current best-known strategy is not "always play X." It is "identify which scoring family the hand is offering, then sequence it correctly."

That is exactly where the game should be at this stage.

## Practical Creator Takeaway

The playbook direction is working because it gives players something to argue about:

- Is Power better if you force Play Action?
- Is Pressure better if you chase short-field shots?
- Is Spread secretly the best because it cashes Crowd better?
- Is Multiple the creator's deck because it turns boring field position into War Room power?
- Is Air Raid worth the harder targets because its ceiling is huge?

That conversation is the game popping. The next content pass should make those arguments louder, clearer, and more fun without breaking the deterministic backbone.
