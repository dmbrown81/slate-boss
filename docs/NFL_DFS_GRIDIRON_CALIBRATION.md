# NFL DFS Calibration Notes

Last checked: 2026-06-20

This pass looked at the local research folder at `/Users/dominicbrown/Desktop/nfl_dfs`
and converted the useful pieces into Gridiron-safe calibration. The game should
stay fictional: no NFL player names, teams, marks, salaries, slate labels, or live
projection outputs should ship in the app. Real football data is useful as a
ruler, not as content.

## What Was There

The folder has a complete Python research pipeline plus processed parquet outputs
for the 2023-2025 seasons. The most useful processed files were:

| File | Rows | Columns | Use |
| --- | ---: | ---: | --- |
| `player_week_features_asof_reg.parquet` | 20,963 | 146 | Player usage and rolling form by week |
| `team_week_features_asof_reg.parquet` | 1,632 | 76 | Team-level pace, pass/run shape, and tendencies |
| `game_week_features_asof_reg.parquet` | 816 | 50 | Game totals, implied totals, weather, roof context |
| `defense_vs_position_features_asof_reg.parquet` | 6,523 | 64 | Position matchup difficulty bands |
| `outcome_labels_reg.parquet` | 20,963 | 37 | Actual fantasy-point outcome bands |
| `draftkings_scoring.parquet` | 21,947 | 13 | DraftKings-style scoring labels |

One caveat: `snap_offense_pct` looked suspicious in this snapshot and should not
drive tuning until the upstream aggregation is reviewed.

## Active Game Changes

The first active change is environment frequency. Gridiron previously rolled
weather uniformly, so Snow and Wind appeared as often as Clear. The calibration
now weights match conditions like this:

| Condition | Weight | Design meaning |
| --- | ---: | --- |
| Clear | 45 | Normal games are the baseline |
| Dome | 25 | Passing-friendly games are common enough to matter |
| Wind | 12 | Deep-pass punishment is occasional pressure |
| Snow | 8 | Bad-weather run-game reward stays special |
| Primetime | 10 | Chaos is a special event, not a default state |

This makes weather feel more like a scouting wrinkle than a coin flip. Pass-heavy
teams should face fewer random bad-weather seasons, while ground-game teams still
get clear moments where their identity shines.

The second active change is the run-summary Coach Debrief. It does not use real
NFL content directly; it uses the same calibration lesson: tell the player what
kind of build they actually made. The debrief now calls out whether the run had a
Lv2+ compounding Game Plan, enough scaling coordinators, manageable card costs,
and a useful support plan into boss defenses.

## Saved Calibration Bands

`src/lib/gridironCalibration.ts` stores the research bands so future tuning can be
done from one source instead of scattering constants through the engine.

Outcome bands from actual fantasy results:

| Position | Median | Strong | Ceiling | Smash |
| --- | ---: | ---: | ---: | ---: |
| QB | 14.5 | 21.4 | 27.1 | 30.9 |
| RB | 5.3 | 12.0 | 19.7 | 25.5 |
| WR | 4.8 | 10.9 | 18.9 | 24.0 |
| TE | 3.5 | 8.2 | 13.9 | 17.8 |
| DST | 5.0 | 9.0 | 13.9 | 16.0 |
| K | 8.0 | 11.0 | 15.0 | 17.0 |

Usage and matchup bands are also captured for future archetype work:

- QB attempts, QB rushing, and pressure-rate bands can inform pocket QB,
  rushing QB, and Protected-style tuning.
- RB carries, RB targets, and red-zone carries can inform Workhorse,
  Pass-Catching RB, Bell Cow, and Clutch tuning.
- WR/TE target share, air-yard share, WOPR, and red-zone targets can inform
  Reliable, Explosive, Slot, Deep Threat, and Red-Zone archetypes.
- Defense-vs-position bands can make boss defenses and future matchup scouts more
  football-smart without copying real teams.

## How It Should Change Gridiron

Use this data to calibrate ranges, not to simulate the NFL. The safest mapping is:

| Real stat idea | Gridiron-safe mapping |
| --- | --- |
| Air yards / WOPR | Explosive receiver traits and deep-catch value bands |
| Target share | Reliable, Hot Route, and slot-possession archetypes |
| Red-zone usage | Clutch and red-zone TE/RB reward targeting |
| RB carry share | Ground & Pound card density and Bell Cow strength |
| QB rushing | Volts/mobile-QB deck identity and QB Keeper support |
| Pressure rate | Protected trait and No-Fly/Stacked Box counterplay |
| Implied team total / game total | Future scout flavor and reward fit labels |
| Defense-vs-position | Boss weakness hints and matchup bands |

Near-term, the data should help tune:

1. Weather frequency and target pressure.
2. Team identity balance, especially run and defense reward depth.
3. Trait targeting and free-agent values.
4. Boss-defense scout hints.
5. Coach Debrief wording and next-run recommendations.

Avoid using it for:

- Real player cards or real team content.
- Live projections or betting/salary feeds in the shipped game.
- A hidden simulation layer that makes scoring opaque.
- Any tuning based on the suspicious `snap_offense_pct` field until reviewed.
