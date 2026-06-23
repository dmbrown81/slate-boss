# Gridiron — Round-2 Review Implementation Handoff (for Codex)

You are picking up an in-progress UX sprint on a deterministic football card-roguelike
("Gridiron"). Five independent reviewers each wrote a round-2 review; their raw notes are in
`/Users/dominicbrown/Downloads/game design 7.md`. This file is the **deduplicated, decided**
version — implement *this*, not five overlapping ticket lists. The reviews are advisory; where
they contradicted each other I have already made the call (see "Resolved contradictions").

Branch: `gridiron-ux-sprint`. Work on this branch; do not open a PR or push unless asked.

---

## 0. Read first / orient

- `docs/GRIDIRON_HANDOFF.md` and `docs/PROJECT_MAP.md` — current architecture.
- `docs/REVIEW_BRIEF_2.md` — the brief the reviewers were answering (defines what's off-limits).
- Key source files (all confirmed to exist):
  - `src/components/FootballMatch.tsx` — the match screen. Contains `firstDriveCoach`,
    `firstDriveFocus`, `PlayPreview`, `Channel`, `ScoreBeats`, `useCountUp`, `PlayStamp`,
    `SPLASH_CONCEPTS`, `TEAM_PROFILES`, `TEAM_IDENTITY` usage. This is the biggest file and the
    target of most tickets — read it fully before editing.
  - `src/components/footballStyles.ts` — design tokens (`FB.*` colors incl. `FB.textFaint`,
    type sizes). One-file leverage point for contrast/legibility.
  - `src/components/FootballReward.tsx` — War Room cards, decision lanes (`rewardDecisionLane`),
    lane styling.
  - `src/components/FootballHome.tsx` — Home, `dailyChallengeSeed`, `startDaily`.
  - `src/components/FootballSeason.tsx`, `src/components/FootballRunSummary.tsx` — run end / recap.
  - `src/components/FootballHelpModal.tsx` — Help modal (home for new toggles).
  - `src/components/teamIdentity.ts`, `src/components/coachIdentity.tsx` — team palettes / coaches.
  - `src/lib/gridironStorage.ts` — persistence. Exports `loadGridironHistory`,
    `saveGridironHistoryEntry`, `bestGridironHistoryRun`, `GridironRunHistoryEntry`,
    keys `gridiron_run_v1`, `gridiron_history_v1`.
  - `src/index.css` — global CSS, `prefers-reduced-motion` block, keyframes.
  - `src/lib/footballRogue.ts`, `src/lib/footballRun.ts` — **ENGINE. DO NOT EDIT** (see constraints).

---

## 1. Hard constraints (apply to every ticket)

- **Do NOT touch scoring/engine math or balance:** no edits to `footballRogue.ts`,
  `footballRun.ts`, scoring formula, `DRIVE_TARGET`/`DRIVE_BUDGET`/targets, starter decks, or
  Monte-Carlo harness. The cold-start problem is **comprehension, not survivability** — the
  harness clears Game 1 ~97–98% under every policy including `none`. So every onboarding fix is
  UI/teaching/framing only.
- **No server, accounts, or leaderboards.** All five reviewers refuse these. Retention is
  local-only (localStorage).
- **No new asset pipeline:** no 3D, no sprites, no music, no sound packs. (Synthesized one-shot
  WebAudio tones are allowed but optional — haptics come first; see T8.)
- **Keep the fictional-football boundary:** no real teams/players, no real-money/DFS/contest framing.
- **Gates must stay green.** Before declaring any ticket done, run:
  - `npm run lint`
  - `npm run build`
  - `npm run smoke:gridiron`
  - `npm run balance:gridiron -- 3000` **only if** you changed anything touching scoring
    presentation (you shouldn't be changing scoring, but run it if a number's source changed).
- **Mobile-first.** Target viewport for "fits without scrolling" claims: **390×844**.
- Match the surrounding code style (inline style objects via `FB.*` tokens, existing component
  patterns). No new state-management lib, no router, no CSS framework.

---

## 2. Resolved contradictions (the reviewers disagreed — here are the decisions)

1. **Onboarding philosophy → persisting coach + play-quality labels. Do NOT hard-lock cards.**
   Two reviewers wanted to dim/disable all non-highlighted cards and disable the Run button on a
   busted first play; one reviewer explicitly refused a forced/modal tutorial. Decision: guide,
   don't restrict. Keep all cards tappable; teach via a coach that survives all of Game 1 and via
   Weak/Playable/Strong preview labels (T1). If you find the soft approach insufficient after
   building it, leave a note — do not unilaterally add the hard lock.

2. **Number scaling → keep real numbers. Do NOT divide displayed scores/targets by 10.**
   Only one reviewer proposed 700→70; it's invasive and unendorsed by the other four. Skip it.

3. **Channel number formatting → consistent, self-labeling, two decimals where it's a factor.**
   Show Execution as an additive operator and Big Play as a multiplier, formatted consistently
   everywhere (live `PlayPreview`, `ScoreBeats`, Help formula, ledger). Use `+0.60` / `×1.50`
   form (operator-prefixed) rather than `+60%`. The point is consistency + operator clarity, not
   the exact glyph — just make every surface match.

---

## 3. Tickets — implement in this order

Each ticket is independently shippable. Commit per ticket with a clear message.

### T1 — Persisting, team-aware Coach (highest value)
**Files:** `src/components/FootballMatch.tsx` (`firstDriveCoach`, `firstDriveFocus` gating).
**Problem:** `firstDriveCoach` returns `null` the moment `match.lastPlay` is set and is gated to
Game 1 / Drive 0, AND it hard-codes Stack TD (a passing play) regardless of team. A Stormers
(ground) or Ghosts (defense) starter is taught a play their deck under-represents, and any player
who clears one play is then alone for the rest of Game 1.
**Do:**
- Keep `CoachCall` guidance available through **all of Game 1**, ending on *competence* (e.g.
  after the player has run ≥2 valid concepts), not after the first play.
- After the first play, switch coach copy to **remaining-target guidance** ("Need 455 more —
  look for another stack or use Audible to dig").
- Seed the taught concept from `TEAM_PROFILES[team].bestConcepts[0]` instead of hard-coded Stack
  TD, so a ground team is taught Ground & Pound, a defense team a takeaway, etc.
- Add **play-quality labels** in `PlayPreview` for Game 1: classify the current selection as
  `Weak` / `Playable` / `Strong` from projected points vs. remaining target and cost efficiency
  (UI-only thresholds; no engine call). Example copy: "Strong opener: 245 pts for $7" /
  "Playable, but you may need 3 more calls" / "Weak: spends budget without closing the gap".
**AC:** G1 D2/D3 still surface guidance; a Ghosts/Stormers start is taught its own concept; play
quality is labeled on G1 selections; Game 2+ behavior unchanged; gates green.

### T2 — Legibility tokens (one-file, high impact)
**Files:** `src/components/footballStyles.ts` (+ minor touch-ups where sizes are inlined).
**Problem:** `FB.textFaint` `#56657a` fails WCAG AA on `FB.panel`/`FB.inset`; lots of
informational text renders at 8–10px (`sectionLabel`, `ChipRow` label, `Stat`/`Channel`/`Mini`
labels, `CardView` position).
**Do:** Lift `FB.textFaint` to ≥4.5:1 on `panel`/`inset`; set an **11px floor** for any text that
conveys information and apply it to the listed labels.
**AC:** no informational text < 11px; `textFaint` passes AA (verify the ratio); aesthetic intact;
gates green.

### T3 — Equation-legible preview + evict Budget from the channel row
**Files:** `src/components/FootballMatch.tsx` (`PlayPreview`, `Channel`).
**Problem:** `PlayPreview` shows Base / Execution / Big Play / **Budget** as four equal sibling
tiles — conflating a *cost* (Budget) with *score factors*, and never showing them *combine*.
**Do:**
- Render the inline combine expression live: `120 × (1 + 0.60) × 1.50 = 288` (use real preview
  values). The post-play `ScoreBeats` already proves the pieces exist — bring the arithmetic into
  the live preview.
- Add a dominant **closure** read alongside the raw total: e.g. "clears 35% of what you need" as
  the lead, "+288 pts" secondary. Keep both; rank closure first.
- **Remove the Budget tile** from the Base/Execution/BigPlay group; show cost next to the Run
  button (it already appears in the button label).
- Prefix operators on the tiles so they're self-describing (`+EXE`, `×BP`).
**AC:** preview shows the combine expression + running total, readable at 390px; Budget no longer
sits among scoring factors; gates green.

### T4 — Daily lock + local streak
**Files:** `src/lib/gridironStorage.ts` (new `gridiron_daily_v1` record), `src/components/FootballHome.tsx`
(`dailyChallengeSeed`/`startDaily`), `src/components/FootballSeason.tsx` (write on seeded-daily end).
**Problem:** `startDaily()` derives a UTC-date seed but records nothing — the daily is infinitely
replayable with no "already played", no streak. That's retention theater.
**Do:** Add a `gridiron_daily_v1` record `{ date, seed, team, score, gamesWon, won, streak }`.
On a seeded-daily run end, write it. On Home, after completion show "Today: <team> · <gamesWon>/5
· <score> · streak K 🔥" and relabel the CTA to "Daily done — Replay (practice)". UTC-day streak.
No server.
**AC:** completing a daily changes the Home daily card and shows a UTC-day streak; replay flagged
as practice; normal new season unaffected; gates green.

### T5 — Non-color encoding (colorblind safety)
**Files:** `src/components/FootballMatch.tsx`, `src/components/FootballReward.tsx`, `src/components/footballStyles.ts`.
**Problem:** Several states are hue-only: channels (green/blue/gold), War Room lane badges,
progress bar gold→green at 100%, discounted vs. normal cost pills, unaffordable cards.
**Do:** Add a redundant non-color cue to each — operator/glyph on the three channels (consistent
with T3); a text/glyph badge on each decision lane; a non-color cue on the 100% progress bar (the
`✓ cleared` pill helps but the bar itself doesn't); a lock/strike glyph on the unaffordable cost
pill. Card affordability already uses `opacity 0.42` — keep that.
**AC:** every hue-only state has a redundant text/glyph/shape cue, verified by viewing in
grayscale; gates green.

### T6 — Scoreboard collapse / thumb zone (sticky action bar)
**Files:** `src/components/FootballMatch.tsx`, `src/index.css`.
**Problem:** On 390×844 the hero loop (preview → select → Run) doesn't fit one screen; the
Run/Audible row sits below the hand, forcing vertical ping-pong. This is the most-cited mobile fix.
**Do:**
- Move the **Run + Audible** controls into a **sticky bottom action bar** with
  `padding-bottom: env(safe-area-inset-bottom)` and a solid/gradient backing so content doesn't
  bleed through. Add a spacer so nothing hides behind it. Keep `PlayPreview` just above it if
  height allows.
- Make the scoreboard build detail (the `Scout` row + `BuildChipRows`) a collapsible `Build ▸`
  expander, **default collapsed in Game 2+**, so hand + preview + Run sit together.
**AC:** default match view fits hand + preview + Run/Audible without scrolling at 390×844; build
detail is one tap away; no content hidden behind the bar; gates green.

### T7 — In-play team identity
**Files:** `src/components/FootballMatch.tsx`, `src/components/FootballReward.tsx` (`coachAdvice`),
`src/components/teamIdentity.ts` as needed.
**Problem:** Mid-match, identity is just a colored `borderLeft` + coach portrait; Volts/Ghosts
play identically to everyone in moment-to-moment feedback.
**Do:**
- Add a **win-condition stripe** in the scoreboard derived from `bestConcepts` (e.g. "Volts win
  on QB keepers — chase the keeper ramp").
- Sort the team's **signature coordinator first** in `BuildChipRows` and give its
  `coordinatorRamp` chip more prominence.
- Add **lane-specific inline callouts** when a signature play scores: Volts after a keeper
  ("Keeper chain started — next QB run scales"), Ghosts after a sack/takeaway ("Pressure chain
  live — defense is your offense"). Presentation-only, using existing coordinator state.
- Optionally tint the drive-score count-up / hand-group headers with `TEAM_IDENTITY[team].primary`.
**AC:** match stripe shows a team win-condition line; signature coordinator chip is first;
Volts/Ghosts produce distinct in-play callouts; no scoring changes; gates green.

### T8 — Sound + haptics (opt-in, gated)
**Files:** new `src/lib/feedback.ts`, `src/components/FootballMatch.tsx`, mute/haptics toggle in
`src/components/FootballHelpModal.tsx` (+ surfaced on `FootballHome.tsx`).
**Problem:** Theatre is visual-only; the silent slam feels hollow on mobile.
**Do:** A tiny `feedback.ts` with (a) `navigator.vibrate` guard and (b) an *optional* WebAudio
one-shot created only after the first user gesture (iOS requirement). Haptics first: light pulse
on TOUCHDOWN/drive-clear, longer on TURNOVER. Audio (if you add it) = short distinct tones for
drive-clear vs. turnover. Persist prefs in a new `gridiron_prefs_v1` (`soundEnabled`,
`hapticsEnabled`). **Gate:** default haptics off under `prefers-reduced-motion`; no audio before a
gesture; degrade silently where unsupported.
**AC:** vibrate on TOUCHDOWN/TURNOVER (Android); persisted mute/haptics toggle; no audio before a
gesture; no vibration under reduced-motion; gates green.

### T9 — Theatre dosage toggle
**Files:** `src/components/FootballMatch.tsx` (`PlayStamp`, `SPLASH_CONCEPTS`, `useCountUp`),
`src/index.css`.
**Problem:** A `PlayStamp` fires on every drive clear (15/season). Veterans tap-skip constantly.
**Do:** Reserve the full-bleed banner strictly for `SPLASH_CONCEPTS`; shorten the ordinary
drive-clear stamp. Add a persisted **"Quick results"** toggle (separate from
`prefers-reduced-motion`) that snaps non-splash theatre to ~400ms (and halves `useCountUp`
duration). After Game 1, collapse normal drive clears to an inline scoreboard stamp unless the
clearing play is a splash or `bigPlay >= 1.5`.
**AC:** toggle shortens/skips non-splash stamps; splashes + turnover still celebrated; default
behavior unchanged; reduced-motion still respected; gates green.

### T10 — Screen-reader scaffolding
**Files:** `src/components/FootballMatch.tsx`, `src/components/FootballReward.tsx`, plus close/back
buttons across `FootballHome.tsx`/`FootballTeamSelect.tsx`/`FootballHelpModal.tsx`.
**Problem:** No `aria-label`s, no live region; count-up score, stamps, channels are mute to AT.
Tap targets on back `←` / help `?` (`btnGhost`, 8–12px padding) are under 44px.
**Do:** Card `aria-label`s (position, name, value, cost, selected/affordable); an
`aria-live="polite"` region announcing the new drive score + "drive cleared"/"turnover"; a
descriptive Run/Audible label that speaks the previewed play + total. Add `:focus-visible` outline
(2px, `FB.gold`) in `index.css`. Raise back/help/close tap targets to ≥44px.
**AC:** VoiceOver reads card state and announces score changes; visible keyboard focus; tap
targets ≥44px; no mobile visual regression; gates green.

---

## 4. Things to REFUSE (do not build, even if it seems helpful)

- Global leaderboard / accounts / any server component — local streak (T4) is the right-sized win.
- Any "presentation" change that is actually a balance change (lowering targets/budget, altering
  decks, dividing scores by 10). Cold-start fix is teaching (T1), not numbers.
- A full settings/options framework or theme engine — two persisted toggles (mute/haptics,
  quick-results) are enough for alpha.
- Sound packs / music / sprite or 3D art — synthesized one-shots only (T8), and only if cheap.
- Hard-locking the first play / disabling Run on busted plays (rejected — see Resolved
  contradictions #1).
- Native wrapper / PWA push for retention — deferred.

---

## 5. Working agreement

- One commit per ticket. Commit message body should name the ticket (e.g. "T6 — sticky action
  bar + collapsible scoreboard"). End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` is **not** required for you (Codex) —
  use your own attribution convention.
- Do not push or open a PR unless the user asks.
- If a ticket turns out to require an engine edit to satisfy its AC, **stop and flag it** rather
  than editing the engine — that means the ticket was mis-scoped.
- After each ticket, verify on a 390×844 viewport where the AC mentions layout.
- If you run low on context, the safe stopping points are between tickets (each is independent).

Suggested order is T1 → T10 as numbered (impact-per-hour). If time-boxed, T1, T2, T3, T5, T6 are
the unanimous high-confidence core; T4, T7, T8, T9, T10 are the depth layer.
