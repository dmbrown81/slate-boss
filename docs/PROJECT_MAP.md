# Gridiron Project Map

Gridiron is now the active app. The old Classic Slate Boss DFS simulator is
preserved through Git history, not compiled into the current product.

```mermaid
flowchart TD
  A["Vite / React / TypeScript"] --> B["src/App.tsx"]
  B --> C["FootballHome"]
  B --> D["FootballSeason"]

  D --> E["FootballTeamSelect (grid)"]
  D --> F["FootballMatch (theatre)"]
  D --> G["FootballReward (card draft)"]
  D --> H["FootballRunSummary"]

  E --> ID["coachIdentity + teamIdentity"]
  F --> ID
  G --> ID
  H --> ID

  F --> I["Gridiron engine"]
  G --> I
  H --> I

  I --> I1["footballRogue.ts: cards, scoring, bosses, traits"]
  I --> I2["footballRun.ts: season state, rewards, targets"]
  I --> I3["gridironEconomy.ts: funds, shop, rerolls"]
  I --> I4["gridironStorage.ts: save/resume"]
  I --> I5["gridironCalibration.ts: fictional tuning constants"]
  I --> I6["seedData.ts: fictional player/team templates"]

  J["Quality harness"] --> J1["scripts/gridironSmoke.tsx"]
  J --> J2["scripts/gridironBalance.ts"]

  K["Packaging"] --> K1["PWA files in public/"]
  K --> K2["Capacitor config"]
  K --> K3["ios/ and android/"]

  L["Historical context"] --> L1["docs/archive/"]
  L --> L2["archive/classic-dfs-sim branch"]
```

## Active Source

- `src/components/FootballHome.tsx` - title screen, help entry, resume/new season, Daily Scrimmage, best-run recap.
- `src/components/FootballTeamSelect.tsx` - 2-up grid of 3:4 team cards (palette + coach portrait + play-style + difficulty), detail panel, Start.
- `src/components/FootballSeason.tsx` - top-level season state machine; accumulates season score, threads the optional daily seed.
- `src/components/FootballMatch.tsx` - game UI, hand selection, scoring preview/ledger, plus the theatre layer (count-up, concept banners, drive/turnover stamps) and coach stripe.
- `src/components/FootballReward.tsx` - War Room card draft: lane tier badges, two-tap buy via detail sheet, bank/skip tile.
- `src/components/FootballRunSummary.tsx` - end-of-run debrief, coach opener, season score, local-best compare, share string.
- `src/components/FootballHelpModal.tsx` - in-game How to Play (quick-start + full-reference toggle; reads engine data).
- `src/components/coachIdentity.tsx` - geometric single-colour CoachPortrait SVG (presentation only).
- `src/components/teamIdentity.ts` - per-team palette, coach name, quote, play-style tag (presentation only).
- `src/components/footballStyles.ts` - shared visual tokens and button/card helpers.
- `src/lib/footballRogue.ts` - core card/scoring model.
- `src/lib/footballRun.ts` - run progression and reward catalog.
- `src/lib/gridironEconomy.ts` - Front Office Funds economy.
- `src/lib/gridironStorage.ts` - local save/resume + run history (`gridiron_history_v1`, now incl. Overtime stats).
- `src/lib/gridironTaxonomy.ts` - presentation/data layer: rarity-as-label, category, lane, role for rewards/coordinators/tools, plus shareable/replayable run codes (team + seed). No scoring impact.
- `src/lib/gridironCalibration.ts` - read-only fictional tuning constants.
- `src/lib/rng.ts` - deterministic random helpers.
- `src/lib/seedData.ts` - fictional football data used by the Gridiron card model.

## Maintenance Notes

- Run `npm run lint`, `npm run build`, and `npm run smoke:gridiron` after code changes.
- Run `npm run balance:gridiron -- 3000` after scoring, reward, target, or economy changes.
- Keep real teams, players, betting, sportsbook, deposits, withdrawals, and prize language out of shipped app copy.
- Keep archived DFS material in `docs/archive/` unless intentionally restoring it from the archive branch.
