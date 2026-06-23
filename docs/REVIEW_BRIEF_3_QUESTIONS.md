# Gridiron - post-update product questions review brief

> Use this as the prompt for another model or outside reviewer. It is written for the current working tree after the Claude/Codex round-2 UX updates. The companion bundle inlines every file needed to review without repo access.

## Role

You are a senior product designer and game-design critic with shipped experience in mobile-first card roguelikes and strategy games. Be concrete, skeptical, and ranked-by-impact. You are not being asked to praise the work. You are being asked to identify the next questions that determine whether Gridiron becomes understandable, replayable, and emotionally sticky.

## Product

**Gridiron** is a single-player, mobile-first fictional football card roguelike in a Vite + React + TypeScript app. Build a deck, call plays, clear three drive targets per game, win a 5-game season, and spend Funds in the War Room between games.

Read `docs/GRIDIRON_HANDOFF.md` and `docs/PROJECT_MAP.md` first for product and architecture context. Then read the "Current post-update state" section below before reviewing source.

Public repo, read-only if needed: `https://github.com/dmbrown81/slate-boss`

## Hard constraints

- **Fictional football only.** Do not propose real teams, real players, real IP, betting, DFS/contest framing, deposits, withdrawals, prizes, or real money.
- **Engine math is off-limits.** Do not propose changes to `src/lib/footballRogue.ts`, `src/lib/footballRun.ts`, targets, budgets, starter decks, scoring formula, or balance harness logic. You may critique presentation of engine output.
- Keep React + Vite + TypeScript. No framework swap, no new state-machine library, no 3D, no native rewrite, no multiplayer.
- Mobile-first, polished on desktop too.
- No server, accounts, or global leaderboard. Local-only retention is allowed.
- Any proposed implementation must keep `npm run lint`, `npm run build`, `npm run smoke:gridiron`, and `npm run balance:gridiron -- 3000` green if it touches scoring presentation.

## Current post-update state

The current working tree includes round-2 UX changes that are not necessarily reflected in older handoff prose:

- Game 1 coach guidance now persists beyond the first play and is team-aware via `TEAM_PROFILES[team].bestConcepts[0]`.
- The match preview has a sticky bottom action tray on mobile with Run/Audible controls.
- `PlayPreview` now leads with percent-of-remaining need, a Game 1 `Weak` / `Playable` / `Strong` quality label, and an inline equation such as `133 x (1 + 0.60) x 1.20 = 255`.
- Budget now shows an approximate calls-left readout.
- Build/scout detail is collapsible, with Game 1 open by default and later games collapsed.
- Non-color cues were added for channels and War Room lanes: `B Base`, `+EXE`, `xBP`, lane glyph/text badges, locked cost labels, and explicit "Best fit" / "Counters next defense" callouts.
- `FB.textFaint` was lifted to AA contrast on panels, and component text floors were raised to 11px.
- Card, Run, and Audible controls now have ARIA labels; score changes use an `aria-live` region; focus-visible outlines exist.
- Daily Scrimmage now records a local daily result and UTC-day streak in `gridiron_daily_v1`; same-day replays are labeled practice.
- Match identity now includes a win-condition stripe and signature coordinator prominence.

Verification already run after these changes:

- `npm run lint` passed
- `npm run build` passed
- `npm run smoke:gridiron` passed
- `npm run balance:gridiron -- 3000` passed with the existing lane-spread yellow note unchanged
- A 390 x 844 mobile browser pass confirmed the sticky preview/action tray and post-play coach guidance render cleanly

## Already shipped - do not pitch as net-new

- Play-resolution theatre: count-up, splash banners, drive-clear stamps, turnover stamp, reduced-motion handling.
- Fictional coach + team-palette identity: coach name, quote, two-color palette, geometric portrait.
- War Room as a card draft: 3-up reward grid, decision lanes, two-tap buy sheet, bank/skip tile.
- Team Select grid ritual: 2-up cards, palette, portrait, play-style, difficulty.
- Local retention: save/resume, run history, best run, Daily Scrimmage seed, daily result/streak.
- Help modal: quick start plus full reference.
- Round-2 Codex updates listed in "Current post-update state."

If any shipped item is executed poorly, critique the execution. Do not recommend it as a new feature.

## The questions I want answered now

These are the main product questions for the next review. Rank them by impact and say where you would spend the next implementation day.

1. **Does Game 1 now teach independence, or just obedience?**  
   The coach persists and gives quality labels, but can a cold player make a good second/third drive call without simply following highlighted cards?

2. **Is the scoring preview clear enough, or still tax-software math?**  
   The preview now shows closure, quality, and equation. Does that actually let players understand why a play is strong, or does it add more cognitive load?

3. **Do losses feel fair and diagnosable?**  
   When the season ends, can the player tell whether they lost from bad budget use, weak concepts, repeated concepts, War Room mistakes, boss/weather mismatch, or draw variance?

4. **Do Volts and Ghosts feel distinct in moment-to-moment play?**  
   The win-condition stripe helps, but do mobile-QB and defense lanes need stronger in-play feedback when their signature engine starts?

5. **Is the sticky bottom preview/action tray the right mobile tradeoff?**  
   It improves thumb reach, but it consumes vertical space. Is the next fix a collapsed preview state, horizontal hand lanes, or something else?

6. **Is War Room decision-making readable enough?**  
   Lane badges now have text/glyph cues. Does the player still need an A/B compare mode, clearer "why this helps next game" copy, or better current-plan projection?

7. **Is Daily Scrimmage a real return hook now?**  
   It has local completion and streak. Should daily have a fixed team, boss/weather identity, one official attempt ritual, or a shareable recap, while staying local-only?

8. **What is the minimum tasteful sensory layer?**  
   Theatre is still visual-only. Should the next step be haptics only, optional synthesized audio, or nothing until more core UX is proven?

9. **When does theatre become annoying?**  
   Does the current banner/stamp/count-up cadence need a persisted "Quick results" toggle, shorter non-splash clears, or more context-sensitive celebration?

10. **Does the game need long-term progression outside runs?**  
    Permanent power is dangerous. Are local team mastery badges, cosmetic plaques, or best-run goals worthwhile without weakening roguelike purity?

11. **What should players remember emotionally?**  
    Is the current fantasy "I made a big number," or can the game make players identify as an Ironhawks flex coach, Volts keeper sicko, Ghosts defense sicko, etc.?

12. **What is the smallest valid cold-user test?**  
    Define exactly what to watch in a 3-player, no-explanation test. What behaviors would prove the current UX works or fails?

## Output format

Open with one sentence naming the single biggest unanswered question for Gridiron as it sits now.

Then provide:

1. An honest one-paragraph read: strongest thing, weakest thing, and what most threatens stranger love.
2. A ranked section answering the 12 questions above. For each, say whether it is solved, partially solved, or still open.
3. A prioritized ticket list, 8-12 items, ranked by impact-per-hour. Each ticket must include:
   - exact files to touch
   - implementation intent
   - acceptance criteria
   - what not to touch
4. A short "refuse to build" list.
5. A proposed cold-user test script for 3 players, including the prompts to give them, what to observe, and what result would change your recommendation.

Be specific. Quote identifiers such as `firstDriveCoach`, `PlayPreview`, `BuildChipRows`, `gridiron_daily_v1`, and `rewardDecisionLane` when relevant. Avoid vague advice like "make it clearer"; say exactly what to change.

## Files included in the bundle

**Orientation:** `README.md`, `docs/GRIDIRON_HANDOFF.md`, `docs/PROJECT_MAP.md`, `docs/REVIEW_3_CODEX_HANDOFF.md`

**Current screens and UI:** `src/components/FootballHome.tsx`, `FootballTeamSelect.tsx`, `FootballMatch.tsx`, `FootballReward.tsx`, `FootballRunSummary.tsx`, `FootballHelpModal.tsx`, `FootballSeason.tsx`, `coachIdentity.tsx`, `teamIdentity.ts`, `footballStyles.ts`

**Motion/theme/persistence:** `src/index.css`, `src/lib/gridironStorage.ts`, `src/lib/gridironEconomy.ts`

**Engine context only:** `src/lib/footballRogue.ts`, `src/lib/footballRun.ts`, `src/lib/gridironCalibration.ts`

**Verification:** `scripts/gridironBalance.ts`, `scripts/gridironSmoke.tsx`

Skip `seedData.ts`, native shells, PWA packaging, and archived DFS material unless you are specifically critiquing app-store/native presentation.
