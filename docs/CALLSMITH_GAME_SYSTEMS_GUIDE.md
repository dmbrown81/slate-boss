# Callsmith Game Systems Guide

Current as of June 29, 2026.

This document is a current-state breakdown of Callsmith as implemented in the repo. It covers the pieces, mechanics, scoring, team identities, between-game economy, deck development, boss systems, unlock-like upgrades, daily/replay features, and verification gates.

Callsmith is a fictional, local-first, single-player football card roguelike. The internal code still uses the older `gridiron` naming in many places, but the player-facing game is Callsmith.

## Core Pitch

Callsmith turns football play-calling into a deterministic card engine.

You draft and develop a fictional football roster, then call plays by selecting cards from your hand. Each selected set of cards is interpreted as a football concept: a QB stack, a double-stack bomb, a ground game call, a QB keeper, a defensive takeaway, a field goal, or a busted play.

The whole scoring model is built around one visible equation:

```text
drivePoints = Base x (1 + Execution) x BigPlay
```

- Base is raw card yardage and flat value.
- Execution is reliable concept quality.
- BigPlay is the multiplicative ceiling.

The main strategic arc is: survive early with Base and Execution, then build a compounding BigPlay engine before late-season targets outrun flat scoring.

## What The Player Does

A normal season is five games.

Each game has three drives. Each drive gives the player:

- an 8-card hand
- a drive target
- a Play Budget
- 3 Audibles by default
- a weather/environment
- a boss defense from Game 2 onward

On each play, the player selects up to 4 cards. The game previews the concept, cost, scoring equation, and ledger. If the player runs the play, the cards are spent, the Play Budget drops, the score is added to the drive, and the hand draws back up.

The drive is cleared if the drive score reaches the target. The season ends if the player stalls before clearing a drive. Win all five games to become champion. After winning the Championship, the player can enter Overtime, a separate score-chase mode.

## Main Game Flow

```text
Home
  -> Team Select
  -> Game 1 Match
  -> War Room
  -> Game 2 Match
  -> War Room
  -> Game 3 Match
  -> War Room
  -> Game 4 Match
  -> War Room
  -> Game 5 Championship
  -> Champion screen
  -> Optional Overtime
  -> Run Summary
```

The season state lives in `FbRunState`:

| Field | Meaning |
| --- | --- |
| `gameNumber` | Current game, 1 through 5. |
| `seed` | Deterministic season seed. |
| `team` | Starting team/class. |
| `stake` | Local difficulty level. |
| `deck` | Current card deck. |
| `coordinators` | Persistent staff-like scaling pieces. |
| `staffBoard` | Role slots for coordinators. |
| `playbook` | Leveled Game Plans by concept. |
| `bombGames` | Prior games where a Bomb landed. |
| `keeperGames` | Prior games where a QB Keeper landed. |
| `takeawayGames` | Prior games with 2+ takeaways. |
| `funds` | Between-game War Room currency. |
| `upgrades` | Front Office upgrades. |
| `status` | `playing`, `won`, or `lost`. |

## The Card Model

Each card is a football action by a fictional player. Cards are not generic suits; their action determines how they combine.

Card fields:

| Field | Meaning |
| --- | --- |
| `position` | QB, RB, WR, TE, K, or DST. |
| `side` | Pass, run, catch, kick, or defense. |
| `action` | Specific action such as Deep Ball, Power Run, Deep Catch, Interception. |
| `value` | Raw Base yardage. |
| `cost` | Play Budget cost. |
| `modifier` | Optional Player Trait. |
| `edition` | Optional premium card edition. |

Card action families:

| Family | Actions |
| --- | --- |
| Pass | Deep Ball, Quick Pass. |
| Run | Power Run, Breakaway. |
| Read | Scramble, QB Sneak. |
| Route | Deep Catch, Quick Catch, Checkdown. |
| Kick | Field Goal, Extra Point. |
| Rush/Cover | Sack, Interception, Return TD. |

Card cost is the in-drive salary-cap pressure. Better cards generally cost more, while traits, team perks, and Film Room tools can reduce costs.

## Match Resources

| Resource | Scope | Current Value / Rule |
| --- | --- | --- |
| Hand size | Per draw | 8 cards. |
| Max play cards | Per play | Up to 4 cards. |
| Drives | Per game | 3 drives. |
| Play Budget | Per drive | 24, 26, then 28 by default. |
| Audibles | Per drive | 3 by default. |
| Funds | Between games | Starts at 6 on Pro stake. |

Audibles let the player select unwanted cards and redraw without spending Play Budget. In boss games, the player can also spend 1 Audible to reveal the hidden pre-snap look.

## Scoring Concepts

The scoring engine recognizes football concepts from selected cards.

| Concept | Trigger | Main Scoring Identity |
| --- | --- | --- |
| Stack TD | QB pass + 1 same-team catch | +0.60 Execution. |
| Double-Stack Bomb | QB pass + 2+ same-team catches | +0.40 Execution, BigPlay x1.50. |
| Shootout Stack | Stack plus opposing catch | Bring-back BigPlay x1.40. |
| Checkdown | Pass plus checkdown support without stack | Safe short passing floor. |
| Ground & Pound | 2+ RB run cards | +0.40 Execution. 3+ carries add BigPlay x1.25. |
| Designed Run | 1 run card | Simple run floor. |
| QB Keeper | QB run card(s), no pass/catch | +0.45 Execution. 2+ QB runs add BigPlay x1.35. |
| Field Goal | Kicker field goal card(s) | Reliable special-teams points. |
| Extra Point | Kick-only non-field-goal card(s) | Low-ceiling filler. |
| Sack | Defensive sack card | Defensive floor. |
| Takeaway | Interception card | +0.30 Execution. |
| Pick Six | Return TD defensive card | BigPlay x1.65. |
| Busted Play | Cards do not combine | BigPlay x0.50 unless salvaged. |

## Concept Containment

Some higher concepts now count as simpler concepts for triggers, Game Plans, and anti-spam.

| Higher Concept | Also Counts As |
| --- | --- |
| Double-Stack Bomb | Stack TD. |
| Shootout Stack | Stack TD. If it also has 2 same-team catches, Double-Stack Bomb. |
| Ground & Pound | Designed Run. |

This matters because a Double-Stack Bomb can trigger stack-based coordinators and Stack TD Game Plans. Ground & Pound can satisfy run triggers. It makes the game feel less brittle: if a play is clearly a bigger version of a concept, the engine treats it that way.

## Scoring Pipeline

The score is built in stages. Each stage can write to the ledger shown in the UI.

1. Cards set initial Base from selected card values.
2. Concept recognition adds concept-specific Base, Execution, or BigPlay.
3. Card editions apply.
4. Staff Board roles can add small stage-based boosts.
5. Coordinators apply.
6. Game Plans apply.
7. Player Traits apply.
8. Busted Play adjustments apply.
9. Environment/weather applies.
10. Boss defense applies.
11. Pre-snap matchup edge applies if the hidden look helps the concept.
12. Anti-spam penalties apply for repeated concepts in the same drive.
13. Final score is calculated.

The final ledger always ends with:

```text
Base x (1 + Execution) x BigPlay
```

## Teams As Starting Classes

Teams are not skins. Each team is a starting class with a deck shape, cost perk, starting coordinators, strengths, and weaknesses.

| Team | Class | Difficulty | Starting Coordinators | Identity |
| --- | --- | --- | --- | --- |
| Ironhawks | Balanced | Easy | Air Raid Coordinator, Bell Cow | Flexible starter with no sharp weakness. |
| Blazers | Air Raid | Medium | Air Raid Coordinator, Franchise QB | Passing stacks, double stacks, shootouts. |
| Stormers | Ground Game | Easy | Bell Cow, Salary Wizard | Run volume, cheap carries, high floor. |
| Volts | Mobile QB | Hard | Read-Option Guru, Broken Play Artist | QB keepers, scrambles, broken-play rescue. |
| Ghosts | Defensive Pressure | Medium | Ball-Hawk DC, Salary Wizard | Sacks, interceptions, Pick Six scoring. |

Team perks:

| Team | Perk |
| --- | --- |
| Ironhawks | No special cost perk; complete balanced deck. |
| Blazers | Checkdown catches cost 1 less, minimum 1. |
| Stormers | Run cards cost 1 less, minimum 1. |
| Volts | QB run cards cost 1 less, minimum 1. |
| Ghosts | Defensive cards cost 1 less, minimum 1. |

## Coordinators

Coordinators are persistent run pieces that act like scaling engines. The baseline max is 5 coordinators, modified by Staff Expansion and Captain cards.

| Coordinator | Lane | Scaling Type | Effect |
| --- | --- | --- | --- |
| Air Raid Coordinator | Pass | Within-game | +0.25 Execution on stack plays per prior stack this match. |
| Bell Cow | Ground | Within-game | +13 Base per run card, plus accumulated Ground & Pound Base. |
| Salary Wizard | Ground/Flex | Flat | Cheap cards costing 1 add +12 Base. |
| Franchise QB | Pass | Season | BigPlay +0.20 per prior Bomb game. |
| West Coast Guru | Pass | Flat | Checkdowns and quick passes gain +0.30 Execution. |
| Ball-Hawk DC | Defense | Flat | Defensive plays gain BigPlay x1.20. |
| Read-Option Guru | Mobile | Within-game | +0.20 Execution on QB Keeper / Designed Run per prior QB run. |
| The Improviser | Mobile | Season | BigPlay +0.18 per prior Keeper game. |
| Broken Play Artist | Mobile | Flat | Busted Play with QB run becomes Scramble, no penalty, +32 Base. |
| Pressure Chain | Defense | Within-game | +0.14 Execution on defensive plays per prior defensive play. |
| Takeaway Machine | Defense | Season | BigPlay +0.05 per prior game with 2+ takeaways. |
| Power Sweep Coordinator | Ground | Within-game | Ground & Pound gains BigPlay based on prior Ground & Pound calls. |
| Two-Minute Drill | Pass | Legendary | First stack each drive retriggers card yards if a stack Game Plan is leveled. |

Coordinator reward costs:

| Tier | Cost |
| --- | --- |
| Normal coordinator | 5 Funds. |
| Rare coordinator | 7 Funds. |
| Legendary coordinator | 8 Funds. |

Rare coordinators are Franchise QB, The Improviser, Takeaway Machine, and Power Sweep. Two-Minute Drill is Legendary.

## Staff Board

The Staff Board assigns hired coordinators into lightweight roles. Roles are automatic and appear on the build panel.

| Slot | Short | Effect |
| --- | --- | --- |
| Script | SCR | First clean call each drive gains +0.08 Execution. |
| Booth | BOX | A revealed pre-snap edge gains +0.05 extra Execution. |
| Adjustment | ADJ | Repeated-concept penalties are softened by 25%. |
| Closer | CLS | Final drives and Championship calls gain BigPlay x1.06. |

Staff Board is intentionally small. It adds texture and readable ledger beats without becoming a separate management screen.

## Game Plans

Game Plans are permanent concept levels. They are the main commitment system.

Leveling a Game Plan makes that concept score more every time it is called. At Level 2+, Game Plans also add a compounding BigPlay multiplier through the commit bonus.

Current Game Plan steps:

| Concept | Per-Level Base | Per-Level Execution | Per-Level BigPlay |
| --- | ---: | ---: | ---: |
| Double-Stack Bomb | 0 | +0.26 | 0 |
| Stack TD | 0 | +0.22 | 0 |
| Shootout Stack | 0 | +0.24 | 0 |
| Ground & Pound | +64 | +0.18 | +0.05 |
| QB Keeper | +60 | +0.15 | +0.09 |
| Checkdown | +30 | +0.12 | 0 |
| Field Goal | +58 | 0 | 0 |
| Pick Six | 0 | +0.30 | 0 |
| Takeaway | 0 | +0.22 | +0.05 |
| Sack | +24 | 0 | +0.05 |

The commit multiplier is +0.16 BigPlay per level beyond Level 1.

## Player Traits

Player Traits are card modifiers, usually applied by Training rewards or Film Room tools. A card can have at most one trait.

| Trait | Effect |
| --- | --- |
| Reliable | Waives the Busted Play penalty when included. |
| Explosive | Clean concepts gain +0.10 BigPlay per Explosive card. |
| Discounted | Card costs 1 less Play Budget, minimum 1. |
| Clutch | +20 Base on Drive 3 and in the Championship. |
| Protected | Halves opposing boss scheme penalty on plays including this card. |
| Hot Route | Catch stacks with any quarterback. |

## Card Editions

Editions are premium card tags added mostly through Film Room tools. A card can have one edition.

| Edition | Effect |
| --- | --- |
| All-Pro | +50 Base when the card is called. |
| In Rhythm | +0.30 Execution on clean concepts. |
| Home Run | Clean concepts gain BigPlay x1.35. |
| Captain | Adds +1 coordinator capacity while on the roster. Writes a ledger note when played. |

Captain is mostly a roster-capacity edition rather than a direct scoring edition.

## Boss Defenses

Boss defenses appear from Game 2 onward. Game 1 uses Base Defense. Non-Championship boss games draw from No-Fly Zone, Stacked Box, and Turnover Drill. Championship can also draw Adaptive DC.

| Boss | Punishes | Counter Hint |
| --- | --- | --- |
| Base Defense | Nothing special | Any clean concept can win. |
| No-Fly Zone | Deep double-stacks and shootouts | Use Stack TD, Checkdown, or the run game. |
| Stacked Box | Run game | Use QB stacks and passing concepts. |
| Turnover Drill | Defensive splash plays | Do not rely only on Pick Six luck. |
| Adaptive DC | Repeating one concept | Mix engine with a supporting play. |

Bosses are not hard invalidations. They should push the player toward a side plan, not make a build useless.

## Pre-Snap Looks And Reads

Bosses disguise the exact defensive look. The player knows the boss type, but not the exact shell/box/rush until they spend 1 Audible to Read.

Presentation axes:

| Axis | Values |
| --- | --- |
| Shell | Base, one-high, two-high, zero. |
| Box | Light, neutral, loaded. |
| Pressure | Four-man, blitz, simulated. |
| Leverage | Soft, press, inside, outside. |

The current favorable pre-snap edges:

| Concept | Favorable Look | Edge |
| --- | --- | --- |
| Ground & Pound | Light box | Base x1.08. |
| Designed Run | Light box | Base x1.06. |
| QB Keeper | Light box | +0.10 Execution. |
| Double-Stack Bomb | One-high shell | BigPlay x1.08. |
| Shootout Stack | One-high shell | BigPlay x1.06. |
| Checkdown | Blitz or simulated pressure | +0.10 Execution. |

The Read is a skill test: spend an Audible for better information, or keep the Audible for redraw flexibility.

## Environments

| Environment | Effect |
| --- | --- |
| Clear Skies | No modifier. |
| Dome | Passing plays score +15% Base. |
| Snow Game | Passing Base x0.80; run Base x1.20. |
| Wind Tunnel | Deep passing loses the Shot Play BigPlay bonus. |
| Primetime | Every play gains +0.20 BigPlay, but targets are higher. |

Environment weights:

| Environment | Weight |
| --- | ---: |
| Clear | 45 |
| Dome | 25 |
| Wind | 12 |
| Snow | 8 |
| Primetime | 10 |

## War Room Economy

Funds are the between-game currency. They are separate from Play Budget.

| Economy Rule | Value |
| --- | ---: |
| Starting Funds | 6 |
| Game 1 win purse | 5 |
| Game 2 win purse | 6 |
| Game 3 win purse | 7 |
| Game 4 win purse | 8 |
| Interest | +1 per 5 banked Funds |
| Interest cap | 3 by default |
| Skip reward | +2 Funds if no ordinary reward is bought |
| First reroll cost | 2 |
| Reroll cost increase | +1 per reroll |
| Ordinary reward purchase cap | 2 per War Room |

War Room rewards are generated around the deck's current lean:

- pass
- ground
- defense
- mobile

The board usually contains:

1. a keystone engine piece
2. a commitment lever, usually a Game Plan
3. a flex stabilizer such as training, trim, card, or upgrade
4. an optional 4th slot if Bigger Front Office is installed

The next boss also influences the reward shelf. For example, No-Fly Zone pushes Checkdown, Ground & Pound, West Coast, Bell Cow, Value Slot, and Bell-Cow RB style counters. Stacked Box pushes passing counters. Turnover Drill pushes clean offense. Adaptive DC pushes side plans, trim, extra cards, and general breadth.

## Reward Types

| Reward Type | Base Cost | Examples |
| --- | ---: | --- |
| Player Card | 3 | Deep Threat, Bell-Cow RB, Ball-Hawk, Value Slot, Gunslinger, Dual-Threat QB. |
| Coordinator | 5+ | Hire a persistent scaling piece. |
| Game Plan | 5 | Level one concept. |
| Trim | 4 | Cut 3 lowest-value cards. |
| Upgrade | 3 | Strength & Conditioning: +14 Base to 4 cheapest cards. |
| Training | 3 | Add a Player Trait to a fitting card. |

Free-agent cards:

| Reward | Card Added |
| --- | --- |
| Sign a Deep Threat | WR Deep Catch, value 88, cost 3. |
| Sign a Bell-Cow RB | RB Power Run, value 64, cost 2. |
| Sign a Ball-Hawk | DST Interception, value 80, cost 3. |
| Sign a Value Slot | WR Quick Catch, value 40, cost 1. |
| Sign a Gunslinger | QB Deep Ball, value 70, cost 3. |
| Sign a Dual-Threat QB | QB Scramble, value 58, cost 2. |

## Film Room Tools

Film Tools are one-use deck/card mutations bought with Funds in the War Room. They do not count against the two ordinary reward purchases.

| Tool | Cost | Targeted | Effect |
| --- | ---: | --- | --- |
| Film Cut | 3 | No | Cut lowest-value card. |
| Clone the Tape | 5 | Yes | Duplicate any card. |
| Bulk Up | 3 | Yes | +34 Base value to one card. |
| Contract Restructure | 4 | Yes | Reduce one card cost by 1, minimum 1. |
| Deep Threat Reps | 4 | Yes | Quick Catch becomes Deep Catch and gains +30 value. |
| Route Tree | 4 | Yes | Rework catch route: Checkdown to Quick, Quick to Deep, Deep to Checkdown with cost cut. |
| Reliable Hands | 4 | Yes | Add Reliable trait. |
| Explosive Package | 5 | Yes | Add Explosive trait to a skill card. |
| Clutch Reps | 4 | Yes | Add Clutch trait. |
| Boss Prep | 4 | Yes | Add Protected trait. |
| Hot Route Install | 5 | Yes | Add Hot Route trait to a catch. |
| Rookie Contracts | 4 | No | Reduce cost of two priciest cards by 1. |
| All-Pro Tape | 5 | Yes | Add All-Pro edition. |
| Rhythm Install | 5 | Yes | Add In Rhythm edition. |
| Home Run Cut-Up | 6 | Yes | Add Home Run edition to a non-kick card. |
| Captain Patch | 6 | Yes | Add Captain edition. |
| Depth Chart | 3 | No | Add a cost-1 Quick Catch. |
| Film Grind | 4 | No | +16 Base to 3 cheapest cards. |
| Flea Flicker | 5 | No | Trick Play: clone highest-value card, copy costs +1. |
| Gadget Gamble | 4 | Yes | Trick Play: +70 Base, card costs +1. |
| Trick Shot | 5 | Yes | Trick Play: add Home Run to skill card, card costs +1. |

Film Room shows 2 tools by default, or 3 with Film Room Expansion.

## Front Office Upgrades

Front Office upgrades are run-persistent rule changes. They are offered rarely between games, about 45% of War Room visits when unowned upgrades remain.

| Upgrade | Cost | Effect |
| --- | ---: | --- |
| Staff Expansion | 6 | Coordinator cap becomes 6 instead of 5. |
| Headset Upgrade | 5 | +1 Audible every drive. |
| Scouting Network | 5 | War Room rerolls cost 1 less, minimum 1. |
| Deep Pockets | 6 | Interest cap rises by 2. |
| Bigger Front Office | 6 | War Room shows a 4th ordinary reward. |
| Film Room Expansion | 5 | Film Room shows a 3rd tool. |

Captain edition also adds +1 coordinator capacity while that card is on the roster.

## Stakes

Stakes are local difficulty levels. They only change starting Funds right now.

| Stake | Starting Funds Change |
| --- | ---: |
| Pro | 0 |
| All-Pro | -2 |
| Hall of Fame | -3 |

There is no permanent account progression or meta-currency. Stakes are per-run pressure, not long-term unlocks.

## Daily Scrimmage

Daily Scrimmage is a fixed daily assignment:

- seed is derived from the UTC date
- team is derived from that seed
- weather, bosses, rewards, and shelves are deterministic
- first official result is saved locally for that date
- replays are practice attempts
- streak is stored locally

There is no global leaderboard. Daily is a local ritual and share prompt.

## Run Codes

Run codes are shareable and replayable seeds.

Format:

```text
TEAM-SEED
```

Example:

```text
VLT-2K9F4P
```

The team prefix selects the starting class. The base-36 seed reproduces weather, bosses, reward shelves, and draws. Player decisions are still up to the player.

## Overtime

Overtime starts only after the Championship has already been won. It cannot turn a won run into a lost run.

Overtime rules:

- no shop between rounds
- targets continue scaling beyond Championship
- weather and bosses continue from deterministic synthetic game numbers
- the run ends when a drive stalls
- summary records furthest round, Overtime score, and best Overtime drive

Overtime is the intentional score-ceiling mode. Campaign balance stays tighter; Overtime is where explosive builds get room to go off.

## Local Save, History, And Preferences

Callsmith is local-first.

Stored locally:

| Storage | Contents |
| --- | --- |
| Active run | Match/reward phase, run state, War Room shelf ids, rerolls, purchases. |
| Run history | Last 10 completed runs. |
| Daily record | Date, seed, team, result, score, streak. |
| Preferences | Quick Results, haptics, audio cues, show math. |

Current save format version is 4.

Migration history:

| Version | Added |
| --- | --- |
| v2 | Funds and Player Traits. |
| v3 | Keeper and takeaway season counters. |
| v4 | Staff Board role assignment. |

Preferences:

| Preference | Default | Meaning |
| --- | --- | --- |
| Quick Results | Off | Speeds ordinary scoring theatre. |
| Haptics | Device-dependent | Vibration on supported touch devices. |
| Audio Cues | Off | Optional WebAudio scoring chimes. |
| Show Math | Off after Game 1 | Expands score equation in preview. |

Reduced-motion preference is honored. Optional audio cues are also suppressed when reduced motion is active.

## Run Summary And Debrief

The summary screen records:

- win/loss
- games won
- score
- best drive
- final build title
- coordinator and Game Plan chips
- Staff Board slots
- card editions
- local-best comparison
- recent runs
- replay code
- Overtime stats if played
- Coach Debrief
- top loss reasons if the season ended early

Loss reasons currently check for:

- no committed Game Plan
- Game Plan below Level 2
- too few scaling coordinators
- expensive deck
- bloated deck
- thin coordinator staff
- stranded Funds
- no developed players
- exact game/drive where the season stalled

## What Is Not In The Game

Current guardrails:

- no backend
- no accounts
- no multiplayer
- no global leaderboards
- no real-money mechanics
- no betting
- no prizes
- no DFS contests
- no licensed teams, players, or league IP
- no remote player data collection

Real football data can be used for calibration docs and tuning only. Shipped game content stays fictional.

## Current Verification Snapshot

Latest full verification after the current systems pass:

```text
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run balance:gridiron -- 3000
```

The 3000-season balance run cleared the main gates:

| Gate | Result |
| --- | --- |
| Build gap | Green: smart builds strongly beat no-reward runs. |
| Reward gap | Green: synergy rewards strongly beat random rewards. |
| Defensive Read value | Positive but modest, useful without being mandatory. |
| Per-team viability | Green: all five teams viable. |
| Economy | Green: smart spending beats random; spend-now and bank are both viable. |
| Lane commitment | Green: 8.6 point spread after Ball-Hawk trim. |
| Campaign ceiling | Advisory yellow: p99/median about 3.09x, slightly above ideal tightness. |
| Overtime ceiling | Green: Overtime opens a meaningful score ceiling. |

## Primary Source Files

| File | Role |
| --- | --- |
| `src/lib/footballRogue.ts` | Cards, concepts, scoring, coordinators, staff board, teams, bosses, environments. |
| `src/lib/footballRun.ts` | Run state, targets, rewards, Film Room, Front Office, Overtime, debrief logic. |
| `src/lib/gridironEconomy.ts` | Funds, purses, interest, rerolls, skip reward. |
| `src/lib/gridironStorage.ts` | Save/resume, history, daily, preferences, migrations. |
| `src/lib/gridironPlaybook.ts` | Concept dossiers and matchup teaching layer. |
| `src/lib/gridironTaxonomy.ts` | Rarity labels, lanes, run codes. |
| `src/components/FootballMatch.tsx` | Match UI, hand selection, reads, scoring theatre. |
| `src/components/FootballReward.tsx` | War Room UI. |
| `src/components/FootballRunSummary.tsx` | Final recap, share/replay/daily/overtime presentation. |
| `scripts/gridironBalance.ts` | Monte Carlo balance harness. |
| `scripts/gridironMatchupCheck.ts` | Deterministic matchup and containment proof. |
| `scripts/gridironSmoke.tsx` | Render smoke test. |

