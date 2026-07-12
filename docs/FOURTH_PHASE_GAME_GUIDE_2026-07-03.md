# Fourth Phase Coach's Manual

Last updated: 2026-07-03

This guide documents the current Fourth Phase game after the football-language
cleanup pass. It is both an instructor manual and a developer spec. The game
math is unchanged unless stated otherwise; the player-facing vocabulary has been
rewritten so the game sounds like football instead of a spreadsheet theme.

## 1. The Football Thesis

Coaches talk about winning in all three phases: offense, defense, and special
teams. Fourth Phase adds the crowd as the fourth phase.

That is the premise. The player is not resolving one literal snap. A selected
hand is a short call-sheet series inside a drive: offense calls, defensive stops
and sudden-change leverage, special teams hidden yards, and crowd momentum all
stack into the next scoring chance.

The one-line player loop:

```text
Build momentum with the crowd.
Cash it with offense.
Use defense for leverage.
Use special teams for hidden yards.
Clear three Drive Targets before the calls run out.
```

## 2. Public Language Contract

These are the words the player should see.

| Internal Idea | Public Term | Football Meaning |
| --- | --- | --- |
| `points` | progress / score | Abstract progress toward the Drive Target. |
| `execution` | Leverage | Stops, pressure, takeaways, short fields, and clean looks. |
| `bigPlay` | Explosive | The explosive-play multiplier. |
| `meter` | Momentum | The crowd-fed multiplier bank. |
| `fuel` | setup / hidden-yards payout | Draw, money, and discount value from special teams. |
| play | series / call | The selected cards represent a short drive sequence, not one snap. |

Internal names may remain `execution`, `bigPlay`, `meter`, and `fuel` in code.
Do not expose those names casually in player-facing copy.

The scoring contract remains:

```text
score = Yards x (1 + Leverage) x Explosive
```

In code this is still:

```text
points = Yards x (1 + execution) x bigPlay
```

## 3. Player Objective

A run has 3 drives. Each drive has a Drive Target. The player must score enough
progress to clear the current target before running out of calls.

Current run structure:

| Rule | Value |
| --- | --- |
| Drives per run | 3 |
| Starting hand | 8 cards |
| Cards per series | Up to 5 |
| Redraws per drive | 2 |
| Max calls per drive | 8 |
| Starting money | $8 |
| Starting momentum | x1.0 |
| Base momentum cap | x6.0 |
| Absolute momentum cap | x12.0 |
| Starting jokers | 1 team signature joker |
| Joker slots | 5 |
| War Room buys | Up to 2 per War Room |
| War Room reroll | $2 |

The final drive has the boss active. Clear all three drives to win. Stall before
the current target is cleared and the run is over.

## 4. First-Run Teaching Script

Use this language when teaching a cold player.

### Step 1: The Target

"Hit the Drive Target before your calls run out. Start simple: tap one blue
Offense card and run the series. A Checkdown is small, safe progress."

Expected lesson:

- One Offense card makes The Checkdown.
- It scores small, safe progress.
- It saves the rest of the hand.

### Step 2: The Core Trick

"Purple Crowd builds momentum. Blue Offense cashes it. Cards resolve left to
right, so put Crowd before Offense."

Expected lesson:

- Crowd builds the multiplier.
- Offense spends it.
- Same cards in the wrong order score less.

### Step 3: The Whole Loop

"Build momentum, cash with Offense, clear the target. Defense creates leverage:
stops, pressure, and short fields. Special Teams creates hidden yards for later."

Expected lesson:

- Offense = Gain Yards
- Defense = Leverage
- Special Teams = Hidden Yards
- Crowd = Momentum

## 5. The Four Phases

| Phase | Color | Job | Player Translation |
| --- | --- | --- | --- |
| Offense | Blue | Gain Yards | Moves the drive and cashes momentum. |
| Defense | Red | Leverage | Stops, pressure, takeaways, and short fields make scoring easier. |
| Special Teams | Gold | Hidden Yards | Field flips, return units, and specialists create draw, money, and discounts. |
| Crowd | Purple | Momentum | The crowd is the fourth phase; it banks the multiplier Offense spends. |

### Offense

Offense supplies the Yards payload. In a cashing situation, the first Offense
card in the left-to-right order spends the current Momentum value.

Important Offense rules:

- Offense values feed most Yards seeds.
- Offense is the only phase that cashes momentum.
- Offense before Crowd can waste a cash by spending cold x1.0 momentum.
- Offense is pressured by Stacked Box and No-Fly Zone.

### Defense

Defense is not "Execution" in the player's mind. Defense creates leverage.

It represents:

- getting off the field
- forcing bad throws
- creating short fields
- sudden-change chances
- making the next scoring call cleaner

Defense-heavy shapes:

- Defensive Stand: 3+ Defense
- Sudden Change: 2+ Defense and 1+ Offense, with no Crowd cash shape
- Momentum Shift: 2+ Offense and 2+ Defense
- Complementary Football: all four phases

### Special Teams

Special Teams is hidden yardage and field-flip value. It often does not score
immediately, but it helps the next call or the next War Room.

Special Teams can create:

- extra draw
- money
- discount tokens
- hidden-yard support inside scoring situations

Main shape:

```text
2+ Special Teams = Field Flip
```

### Crowd

Crowd cards build Momentum. Momentum starts at x1.0 and usually caps at x6.0.

Crowd charge by rank:

| Rank | Momentum |
| --- | --- |
| A | +1.0 |
| J, Q, K | +0.6 |
| 7, 8, 9, 10 | +0.4 |
| 2, 3, 4, 5, 6 | +0.2 |

Three or more Crowd cards create Crowd Surge: a setup call that scores 0 but
builds momentum hard.

## 6. Momentum

Momentum is the central ceiling mechanic.

Current constants:

| Constant | Value |
| --- | --- |
| Base momentum | x1.0 |
| Base cap | x6.0 |
| Absolute cap | x12.0 |
| Sustained non-bust tick | +0.10 momentum |
| Default bleed rate | 25% of charge above x1.0 |
| Road Game bleed rate | 50% of charge above x1.0 |
| Standing Room Only bleed | 40% after every series |
| Hold-hot-momentum bleed | 12% of charge above x1.0 |
| Low-score bleed threshold | 18 points |

Momentum can bleed when:

- a series busts
- a non-utility scoring series scores fewer than 18
- Standing Room Only forces bleed
- the player holds hot momentum without cashing or building it

Momentum can be protected by:

- Home Cooking on the final call of a drive
- Bend, Don't Break on busted series that include Defense

## 7. Situations

Situations are the recognized call shapes. The recognizer checks in priority
order; the first matching shape wins.

| Priority | Internal Key | Public Name | Trigger | Payoff |
| --- | --- | --- | --- | --- |
| 100 | `complementaryFootball` | Complementary Football | All four phases present | Apex scoring shape. Cashes momentum and pays setup. |
| 90 | `momentumShift` | Momentum Shift | 2+ Offense and 2+ Defense | Strong score with a high floor. |
| 86 | `houseCall` | Shot Play | Offense + Crowd | Main cash-in shape. |
| 85 | `pickSix` | Sudden Change | 2+ Defense and 1+ Offense, no Crowd cash shape | Defensive leverage turns into a fast score. |
| 70 | `blackout` | Crowd Surge | 3+ Crowd | Scores 0; builds momentum hard. |
| 60 | `fieldFlip` | Field Flip | 2+ Special Teams | Scores 0; pays draw, money, discounts. |
| 50 | `stand` | Defensive Stand | 3+ Defense | Small score, high Leverage. |
| 45 | `drive` | Sustained Drive | 3+ Offense | Straight Offense scoring. |
| 30 | `checkdown` | The Checkdown | 1-2 Offense only | Small safe score. |
| 1 | `bustedPlay` | Busted Play | No clean shape | Penalty score and momentum bleed. |

### Exact Seeds

In formulas below:

- `offense` is the sum of Offense card values.
- `defense` is the sum of Defense card values.
- `special` is the sum of Special Teams card values.
- `crowd` is total Crowd momentum charge.
- `defCount`, `stCount`, and `crowdCount` are phase card counts.

| Situation | Yards Seed | Leverage Seed | Explosive Seed | Momentum Bonus | Cashes? | Setup |
| --- | --- | --- | --- | --- | --- | --- |
| Complementary Football | `offense + round(defense * 0.6) + round(special * 0.45) + 12` | `0.42 + defCount * 0.07` | `1.00` | `+0.35` | Yes | `+1 draw, +$2, +1 discount` |
| Momentum Shift | `offense + round(defense * 0.45) + 8` | `0.35 + defCount * 0.05` | `1.00` | `+0.15` | No | none |
| Shot Play | `offense + 6` | `0.12` | `1.00` | `+0.15` if `crowdCount >= 2` | Yes | none |
| Sudden Change | `round(offense * 0.75 + defense * 0.9) + 12` | `0.28 + defCount * 0.09` | `1.15` | `+0.35` | No | none |
| Crowd Surge | `0` | `0` | `1.00` | `0.50 + crowd * 0.25` | No | none |
| Field Flip | `0` | `0` | `1.00` | `0` | No | `1 + floor(stCount / 3)` draw, `max(2, round(special / 6))` money, `+1 discount` if `stCount >= 3` |
| Defensive Stand | `round(defense * 0.45) + 6` | `0.50 + defCount * 0.04` | `1.00` | `0` | No | none |
| Sustained Drive | `offense + 4` | `0.15` | `1.00` | `0` | No | none |
| The Checkdown | `max(8, round(offense * 0.85))` | `0.10` | `1.00` | `0` | No | none |
| Busted Play | `round(offense * 0.2 + defense * 0.15 + special * 0.1)` | `-0.18` | `0.65` | `0` | No | none |

## 8. Scoring Order

The scorer is deterministic. There are no hidden rolls in `scoreFourthPhasePlay`.

Scoring order:

1. Build the scoring context from current run state.
2. Recognize the situation from selected cards.
3. Apply pre-score boss effects, currently Road Game momentum cap and bleed.
4. Seed Yards, Leverage, Explosive, setup payout, and ledger.
5. Apply Practice Drill bonuses.
6. Run joker `onSituationDetected` hooks.
7. Resolve selected cards left to right.
8. Apply card trait or edition math.
9. Crowd cards build momentum by rank.
10. Non-Crowd Crowd Favorite cards build +0.20 momentum.
11. Run joker card and phase hooks.
12. If the situation cashes, the first Offense card multiplies Explosive by
    current Momentum.
13. Apply situation momentum bonus.
14. Apply forced momentum-to-cap effects.
15. Apply joker retriggers.
16. Apply post-card boss effects.
17. Run joker final-play hooks.
18. Calculate score.
19. Apply sustained tick if not busted.
20. Apply bleed or hold cost if needed.

Preview and execution use the same scoring path.

## 9. Worked Examples

These examples use the base deck, no jokers, no boss, Momentum x1.0, and cap
x6.0.

### Checkdown

Cards:

```text
Offense 2 QB Sneak
```

Result:

| Field | Value |
| --- | --- |
| Situation | The Checkdown |
| Score | 9 |
| Yards | 8 |
| Leverage | +0.10 |
| Explosive | x1.00 |
| Momentum after | x1.10 |

### Correct Shot Play Order

Cards:

```text
Crowd A Home Field -> Offense K Feature Back
```

Result:

| Field | Value |
| --- | --- |
| Situation | Shot Play |
| Score | 36 |
| Yards | 16 |
| Leverage | +0.12 |
| Explosive | x2.00 |
| Momentum after cash | x2.00 |
| Momentum after series | x2.10 |

Teaching point:

```text
Crowd built momentum first. Offense cashed it.
```

### Wrong Shot Play Order

Cards:

```text
Offense K Feature Back -> Crowd A Home Field
```

Result:

| Field | Value |
| --- | --- |
| Situation | Shot Play |
| Score | 18 |
| Yards | 16 |
| Leverage | +0.12 |
| Explosive | x1.00 |
| Momentum after cash | x1.00 |
| Momentum after series | x2.10 |

Teaching point:

```text
Offense cashed cold momentum before the Crowd card built it.
```

### Crowd Surge

Cards:

```text
Crowd 7 Under the Lights + Crowd J Hostile Environment + Crowd A Home Field
```

Result:

| Field | Value |
| --- | --- |
| Situation | Crowd Surge |
| Score | 0 |
| Momentum after | x4.10 |

Teaching point:

```text
This is a setup call. It scores 0 now so a later Offense cash can explode.
```

### Field Flip

Cards:

```text
Special Teams 4 Gunner + Special Teams 5 Coffin Corner
```

Result:

| Field | Value |
| --- | --- |
| Situation | Field Flip |
| Score | 0 |
| Setup | +1 draw, +$2 |
| Momentum after | x1.10 |

### Complementary Football

Cards:

```text
Crowd A Home Field -> Offense Q Chain Mover -> Defense J Coverage Disguise -> Special Teams 10 Pin Deep
```

Result:

| Field | Value |
| --- | --- |
| Situation | Complementary Football |
| Score | 98 |
| Yards | 33 |
| Leverage | +0.49 |
| Explosive | x2.00 |
| Setup | +1 draw, +$2, +1 discount |
| Momentum after series | x2.45 |

## 10. Card Library And Active Deck

The collectible library has 52 inserts: 13 ranks in each of 4 phases. A run
does **not** shuffle all 52. Each playbook starts with a distinct 28-card game
plan, may grow to 30 through the War Room, and then requires cuts. See
`FOURTH_PHASE_PLAYBOOK_DECK_SYSTEM_2026-07-11.md` for the six exact lists,
drive-act rules, and current War Room mutation economy.

The tables below describe the full library, not any one starting deck.

Rank values:

| Rank | Value | Tier |
| --- | --- | --- |
| 2 | 2 | rotation |
| 3 | 3 | rotation |
| 4 | 4 | starter |
| 5 | 5 | starter |
| 6 | 6 | starter |
| 7 | 7 | proBowl |
| 8 | 8 | proBowl |
| 9 | 9 | captain |
| 10 | 10 | captain |
| J | 10 | scheme |
| Q | 10 | playmaker |
| K | 10 | playmaker |
| A | 11 | franchise |

### Offense

| Rank | Value | Role | Face Label |
| --- | --- | --- | --- |
| 2 | 2 | QB Keep | +2 Yards |
| 3 | 3 | Bubble Screen | +3 Yards |
| 4 | 4 | Stick Quick | +4 Yards |
| 5 | 5 | Zone Read RPO | +5 Yards |
| 6 | 6 | Inside Zone | +6 Yards |
| 7 | 7 | Mesh Crossers | +7 Yards |
| 8 | 8 | Tempo Drive | +8 Yards |
| 9 | 9 | Boundary Fade | +9 Yards |
| 10 | 10 | Four Verticals | +10 Yards |
| J | 10 | Play Action Boot | +10 Yards |
| Q | 10 | Y-Cross | +10 Yards |
| K | 10 | Duo | +10 Yards |
| A | 11 | Choice Route | +11 Yards |

### Defense

| Rank | Value | Role | Face Label |
| --- | --- | --- | --- |
| 2 | 2 | 4-3 Run Fit | Leverage |
| 3 | 3 | Edge Set | Leverage |
| 4 | 4 | Rally Tackle | Leverage |
| 5 | 5 | Robber Coverage | Leverage |
| 6 | 6 | A-Gap Mug | Leverage |
| 7 | 7 | Press Man | Leverage |
| 8 | 8 | Zero Blitz | Leverage |
| 9 | 9 | Sim Pressure | Leverage |
| 10 | 10 | Strip Pressure | Leverage |
| J | 10 | Coverage Disguise | Leverage |
| Q | 10 | Ball Hawk | Leverage |
| K | 10 | Edge Pressure | Leverage |
| A | 11 | Green Dot | Leverage |

### Special Teams

| Rank | Value | Role | Face Label |
| --- | --- | --- | --- |
| 2 | 2 | Coverage Lane | Hidden Yards |
| 3 | 3 | Pooch Kick | Hidden Yards |
| 4 | 4 | Gunner | Hidden Yards |
| 5 | 5 | Corner Punt | Hidden Yards |
| 6 | 6 | Return Lane | Hidden Yards |
| 7 | 7 | Hands Team | Hidden Yards |
| 8 | 8 | Fake Punt | Hidden Yards |
| 9 | 9 | Directional Punt | Hidden Yards |
| 10 | 10 | Pin Deep | Hidden Yards |
| J | 10 | Automatic Kicker | Hidden Yards |
| Q | 10 | Return Captain | Hidden Yards |
| K | 10 | Hidden Yards | Hidden Yards |
| A | 11 | The Weapon | Hidden Yards |

### Crowd

| Rank | Value | Role | Face Label |
| --- | --- | --- | --- |
| 2 | 2 | Student Section | +0.2 momentum |
| 3 | 3 | Chant Leader | +0.2 momentum |
| 4 | 4 | Drumline | +0.2 momentum |
| 5 | 5 | Towel Wave | +0.2 momentum |
| 6 | 6 | On Their Feet | +0.2 momentum |
| 7 | 7 | Rising Noise | +0.4 momentum |
| 8 | 8 | Noise Wall | +0.4 momentum |
| 9 | 9 | Stadium Shake | +0.4 momentum |
| 10 | 10 | Pressure Roar | +0.4 momentum |
| J | 10 | Full-Throat Roar | +0.6 momentum |
| Q | 10 | Crowd Swell | +0.6 momentum |
| K | 10 | Fever Pitch | +0.6 momentum |
| A | 11 | House Eruption | +1.0 momentum |

## 11. Traits And Editions

| Edition | Math |
| --- | --- |
| All-Pro | Offense gets +2 Yards. |
| In Rhythm | Card value +1 where value is used; also +0.05 Leverage. |
| Home Run | Offense gets +0.08 Explosive. |
| Crowd Favorite | Non-Crowd cards build +0.20 momentum. Crowd cards use the normal Crowd charge path. |

| Trait | Math |
| --- | --- |
| Reliable | +0.04 Leverage. |
| Explosive | +0.05 Explosive. |
| Clutch | +0.08 Leverage if target remaining is 120 or less. |
| Hometown Hero | +0.10 Leverage if momentum is x3.0 or higher. |
| Injury Prone | Display badge exists; no current scoring hook. |
| Locker-Room Drag | -0.05 Leverage. |
| Aging Vet | Offense value -1, minimum 1. |
| Holdout | -$1 setup payout. |

## 12. Teams

| Key | Team | Short | Signature Joker | Identity |
| --- | --- | --- | --- | --- |
| `balanced` | The Complete Game | Pro Style | The Genius | Balanced run, quick game, play action, and all four phases. |
| `airRaid` | The Aerial Show | Air Raid | Hurry-Up | Pass-heavy spacing with Mesh, Y-Cross, and Four Verticals. |
| `smashmouth` | Ground & Pound | Power | Lunch Pail | Inside Zone, Duo, and Play Action form the backbone. |
| `blackAndBlue` | The Junkyard | Pressure | Takeaway Artist | Pressure and takeaways create short-field shots. |
| `loudHouse` | Home Field Advantage | Spread | Sold Out | Tempo spacing and Crowd momentum create explosive scripts. |
| `specialTeamsChaos` | The Hidden Game | Multiple | Special Teams Coordinator | Hidden yards and mixed scripts open odd windows. |

### Team Deck Mutations

| Team | Mutation |
| --- | --- |
| Pro Style | No library-wide card mutations. |
| Air Raid | High-rank Offense and Crowd, ranks 9-A, get +1 value. Offense gets Home Run. Crowd gets Crowd Favorite. |
| Power | Low-rank Offense and Special Teams, ranks 2-8, get +2 value. Offense gets Reliable. |
| Pressure | All Defense and Special Teams get +1 value. Defense gets Reliable. |
| Spread | All Crowd cards get +1 displayed value and Crowd Favorite. Base Crowd momentum still comes from rank. |
| Multiple | All Special Teams cards get +2 value and Explosive. |

### Targets

Targets include a deterministic `bump` from 0 to 9.

| Team | Drive 1 | Drive 2 | Drive 3 |
| --- | --- | --- | --- |
| Pro Style | `279 + bump` | `547 + bump` | `929 + bump` |
| Air Raid | `335 + bump` | `653 + bump` | `1109 + bump` |
| Power | `194 + bump` | `380 + bump` | `648 + bump` |
| Pressure | `256 + bump` | `500 + bump` | `850 + bump` |
| Spread | `186 + bump` | `364 + bump` | `618 + bump` |
| Multiple | `191 + bump` | `374 + bump` | `637 + bump` |

## 13. Bosses

The boss is derived from the run seed and becomes active only on Drive 3.

| Key | Name | Exact Effect | Player Advice |
| --- | --- | --- | --- |
| `none` | Open Field | No boss pressure. | Normal rules. |
| `stackedBox` | Stacked Box | If the situation has Offense, Yards are multiplied by 0.5. | Use leverage, hidden yards, and multi-phase shapes. |
| `noFlyZone` | No-Fly Zone | If the situation has more than 2 Offense cards, extra Offense value is subtracted from Yards. | Use 1-2 clean Offense cards. |
| `roadGame` | Road Game | Momentum cap forced to x2.0 and bleed rate is at least 50%. | Cash sooner. Do not rely on huge stored momentum. |
| `turnoverDrill` | Ball Security | Each Defense card subtracts 0.12 Leverage. | Takeaway leverage is harder to create. |
| `fieldPositionWar` | Touchback Machine | Any Special Teams presence suppresses all setup payout. | Do not rely on Field Flip economy on Drive 3. |
| `adaptiveDc` | Got Your Number | A repeated situation on the same drive scores 0. | Vary calls. Do not repeat the same shape. |
| `preventDefense` | Prevent Defense | Explosive is capped at x2.75. | Build Yards and Leverage instead of over-stacking momentum. |

Fresh first-run seeds are rerolled until the final boss is Stacked Box or
Prevent Defense. The boss is still seed-derived and reproducible.

## 14. Jokers

| Joker | Rarity | Effect |
| --- | --- | --- |
| Sold Out | core | Crowd cards build momentum 50% harder. |
| Home Cooking | core | Momentum does not bleed on a drive's final call. |
| Stay on Schedule | rare | Each non-bust series raises momentum cap by 0.15, capped at x7.5. |
| Lunch Pail | core | While momentum is cold, each Defense card adds +0.25 Leverage. |
| Takeaway Artist | rare | Sudden Change charges momentum to its current cap. |
| The Genius | rare | Complementary Football gains +0.08 Leverage and +1.00 Explosive. |
| Special Teams Coordinator | core | Each Special Teams card gives +1 next draw and +$2. |
| Two-Minute Drill | rare | With 0 redraws left, retrigger all Offense. |
| Road Warriors | rare | When a boss forces the momentum cap low, Offense cards gain +60 Yards. |
| Bandwagon | core | Momentum starts +0.3 for each drive already won. |
| Standing Room Only | legendary | Momentum cap rises to x12, but bleeds 40% after every series. |
| Hurry-Up | core | If 5 cards are called, retrigger all Offense. |
| Short Field | core | A Defense card immediately before an Offense card adds +8 Yards. |
| Juice | core | An Offense card immediately after a Crowd card gains +0.12 Explosive. |
| Coverage Units | core | Special Teams cards inside scoring situations add +6 Yards. |
| The Wave | core | Sustained non-bust tick charges +0.10 extra momentum. |
| Film Study | core | First copy of each situation per drive gains +0.16 Leverage. |
| Red Zone Package | core | Target within 180: non-utility series gain +8 Yards, +0.10 Leverage, +0.34 Explosive. |
| Walk-On Program | core | Cards valued 6 or lower add +4 Yards if Offense, otherwise +0.04 Leverage. |
| Checkdown Merchant | core | Checkdowns give +1 draw and +$1. |
| Bend, Don't Break | core | Busted series with Defense gain +0.10 Leverage and do not bleed momentum. |
| Coaching Tree | rare | Series with 3+ phases gain Yards and Leverage; all four phases add Explosive. |
| Finisher | rare | Boss drive non-bust series gain +10 Yards, +0.10 Leverage, +0.45 Explosive. |
| Press Box Angle | rare | Against a boss, first copy of each situation gains +8 Yards and +0.12 Leverage. |
| Return Ace | rare | Field Flip gives +2 more draw, +$4, and +1 discount. |
| Big-Play Threat | rare | Shot Plays with momentum at x3 or higher gain +0.50 Explosive. |
| Body Blows | rare | Non-bust series gain +6 Yards per prior call this drive, capped at +24. |
| Lights Out | rare | Crowd Surges raise momentum cap +0.50, capped at x8.5, and add +0.40 momentum. |
| All Four Phases | legendary | Five-card series with all four phases gain +0.35 Explosive and raise cap +0.75, capped at x9. |

## 15. Practice Drills

Practice Drills are War Room offers that permanently improve one situation for
the rest of the run. Max level is 3.

| Drill Type | Effect |
| --- | --- |
| Field Flip | Also pays `+level` draw and `+$level * 2`. |
| Crowd Surge | Also builds `+level * 0.15` momentum. |
| Shot Play or Complementary Football | `+level * 5` Yards, `+level * 0.03` Leverage, `+level * 0.12` Explosive. |
| Other scoring situations | `+level * 5` Yards, `+level * 0.03` Leverage, `+level * 0.05` Explosive. |

Practice bonuses do not apply to busted series.

## 16. War Room

The War Room appears after Drive 1 and Drive 2 when the target is cleared.

Entry bonus:

| After Drive | Money Bonus |
| --- | --- |
| 1 | +$5 |
| 2 | +$7 |

Offers:

- 3 Joker offers at $4 each
- 1 Practice Drill at $3

Rules:

- Buy up to 2 upgrades.
- Buying the second upgrade automatically starts the next drive.
- Reroll costs $2.
- Skip with 0 buys to bank +$3.
- Skip after at least 1 buy gives no skip bonus.
- If the Sideline is full, buying a Joker asks the player to release one.

Discount tokens:

| Rule | Value |
| --- | --- |
| Token cap | 3 |
| Discount per token | -$1 |
| Max tokens used per offer | 2 |
| Minimum offer price | $1 |

## 17. UI Blueprint

The phone UI should answer these questions before anything else:

```text
How much target is left?
How many calls do I have?
Is momentum hot?
Does this series cash?
What does the boss punish?
```

Main surfaces:

| Surface | Job |
| --- | --- |
| Status panel | Drive Target, calls left, Momentum, team identity, boss pressure. |
| Call Sheet | Selected cards in left-to-right order. |
| This series | Verb, situation, score, formula, warnings, after-this line. |
| Hand | 4-column card grid with phase job labels. |
| Last series | Plain summary first; full ledger one tap away. |
| Sideline | Joker slots and reorder controls. |
| Situations | Collapsible shape reference. |
| How to play | Collapsible teaching panel. |
| Locker Room | Daily, local best, teams, import code. |
| War Room | Offers, Coach Pick, discounts, reroll, skip. |
| Win/Loss | Total score, best series, loss advice, run code, share card. |

Preview verbs:

| Verb | Meaning |
| --- | --- |
| CASHES | This series cashes momentum with Offense. |
| SCORES | This series scores without cashing. |
| BUILDS | This setup call builds momentum. |
| SETS UP | This setup call gives draw, money, or discounts. |
| BAD CALL | This is a busted series. |

## 18. Persistence And Sharing

Fourth Phase is local-first.

LocalStorage keys:

| Key | Purpose |
| --- | --- |
| `fourth_phase_history_v1` | Last 10 completed runs. |
| `fourth_phase_daily_v1` | Latest completed daily record and streak. |
| `fp-tutorial-done` | Tutorial completion. |

Run codes:

```text
FP-{TEAMCODE}-{SEED_BASE36}
```

Current team codes:

| Team | Code |
| --- | --- |
| Balanced | BAL |
| Air Raid | AIR |
| Smashmouth | SMA |
| Black & Blue | BLA |
| Stampede | STA |
| ST Chaos | STC |

Legacy `FP-LOU-*` codes still import as Stampede.

## 19. Determinism

Do not add hidden randomness to gameplay scoring.

Deterministic systems:

- run creation
- deck shuffle
- opening draw
- redraws
- drive reshuffles
- War Room offers
- Practice Drill choice
- boss
- targets
- daily seed

Rules:

- Avoid `Math.random` in replayable gameplay paths.
- Use `mulberry32` and `stringSeed`.
- Same cards plus same context must produce the same score result.
- Preview and execution must use the same context builder.

## 20. Code Map

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Renders the active Fourth Phase lab. |
| `src/components/fourthPhase/FourthPhaseLab.tsx` | Main UI, run state, tutorial, preview, execution, War Room, history, daily, share card. |
| `src/components/fourthPhase/FourthPhaseGuide.tsx` | How-to panel and situation reference. |
| `src/components/fourthPhase/fourthPhaseStyles.ts` | Shared Fourth Phase style kit. |
| `src/lib/fourthPhase/types.ts` | Core types. |
| `src/lib/fourthPhase/deck.ts` | Deck, card names, phase jobs, team deck mutations. |
| `src/lib/fourthPhase/situations.ts` | Situation labels, recognizer, priority ladder. |
| `src/lib/fourthPhase/meter.ts` | Momentum constants, charge, bleed, formatting. |
| `src/lib/fourthPhase/engine.ts` | Deterministic scorer and ledger. |
| `src/lib/fourthPhase/jokers.ts` | Joker definitions and hooks. |
| `src/lib/fourthPhase/run.ts` | Teams, bosses, targets, run codes, War Room generation. |
| `src/lib/fourthPhase/coach.ts` | Coach order, preview verbs, plain summaries, boss warnings, Coach Pick. |
| `scripts/fourthPhaseMatchup.ts` | Deterministic proof harness. |
| `scripts/fourthPhaseBalance.ts` | Monte Carlo balance harness. |

## 21. Verification

Baseline gates:

```bash
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run matchup:fourthphase
```

For scoring, joker, situation, momentum, target, economy, boss, War Room, or
balance-sensitive changes:

```bash
npm run balance:fourthphase -- 3000
```

Balance gates:

| Gate | Target |
| --- | --- |
| Synergy pilot win rate | 75-85% |
| No-draft win rate | 55-65% |
| Draft gap | At least +15 win points vs no-draft |
| Build gap | At least +8 win points vs random |
| Per-team spread | 6 win points or less |
| Stampede | Not bottom team |
| Momentum ceiling tightness | 35% or less |

## 22. Manual QA Checklist

Fresh player:

- Clear localStorage.
- Tutorial appears.
- Step 1 only accepts one Offense Checkdown.
- Step 2 only accepts Crowd before Offense.
- First-run boss is Stacked Box or Prevent Defense.

Preview:

- Preview score equals executed score.
- Formula reconciles to displayed score.
- Verb matches series type.
- Boss warning appears when relevant.
- Hot momentum warning appears when ignored.
- Reorder hint increases score exactly as promised.

Run flow:

- Redraw decrements redraw count and does not count as a call.
- Drive 1 clear enters War Room.
- War Room grants correct money.
- Buying 2 offers starts next drive.
- Skipping with 0 buys banks $3.
- Discount tokens reduce cost, max -$2, never below $1.
- Boss is active only on Drive 3.
- Win and loss save completion history.

Language check:

- No public "Defense = Execution" explanation.
- No public "Fuel" as a phase job.
- No "Crowd Meter" label; use Momentum.
- No "Pick Six" for the Defense + Offense shape; use Sudden Change.
- No "House Call" for the cash-in shape; use Shot Play.
- No trademarked "Twelfth Man" label.

## 23. Guardrails

Do not add these without explicit product direction:

- backend services
- accounts
- multiplayer
- global leaderboards
- payments
- betting
- prizes
- DFS contests
- licensed teams, leagues, or real players
- remote player data collection

Field position is still deferred behind
`docs/FOURTH_PHASE_FIELD_POSITION_GATE.md`.

## 24. The Short Version

```text
Fourth Phase = offense, defense, special teams, and the crowd.

Offense gains yards.
Defense creates leverage.
Special Teams creates hidden yards.
Crowd builds momentum.

Momentum before Offense cashes.
Defense gives short fields.
Special Teams sets up the next call.
The boss attacks Drive 3.

Score = Yards x (1 + Leverage) x Explosive.
No hidden rolls.
```
