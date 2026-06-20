# Agent Handoff Log

Shared working log for Codex, Claude Code, and future AI sessions on Slate Boss.

Add the newest entry near the top. Keep entries short, factual, and useful for the next agent. Do not remove historical context unless the user asks for a cleanup.

## Handoff Template

```text
## YYYY-MM-DD - Agent - Branch

Goal:
- ...

Changed:
- ...

Validation:
- ...

Decisions:
- ...

Next:
- ...

Blockers:
- ...
```

## 2026-06-20 - Claude Code - main (Gridiron: the Vehicle — Funds economy + War Room + Player Traits)

Goal:
- Act on the unanimous multi-model "complete vehicle" package (game design 4.md). The car had an engine but no transmission. All three reviews converged on the SAME sequence: economy first (the transmission — "nothing flows without it"), the shop it flows through, then card modifiers ("the biggest missing vein"). Built that integrated foundation — the jump from "pick 1 of 3 free" to "manage a season" — with full harness coverage. Deliberately deferred Film Tools, coordinator ordering, packs/vouchers, and meta-unlocks to the next slice (they need match-time UI surfaces; shipping a tested loop beats a half-wired pile).

Changed:
- NEW `src/lib/gridironEconomy.ts` — Front Office Funds. Start $6; win purse $5/$6/$7/$8 (games 1-4); interest +$1 per $5 banked, cap +$3 (the spend-now-vs-bank spine); reroll $2 +$1 each; skip banks +$2. `shopCredit()` / `interestOn()` / `rerollCost()` + `ShopCreditInfo`.
- `footballRun.ts`: `FbRunState.funds`. `Reward.cost` + `REWARD_COST` price list (rare coordinators = $7). NEW Training reward family (`train-<modifier>`) that applies a Player Trait to a deterministically best-fit untagged card (no card-picker UI needed yet — `trainingTarget()`). `generateRewards` flex slot can now offer a lean-keyed trait. `rewardFitLabel`/`rewardImpact` handle training.
- `footballRogue.ts`: NEW `FbCardModifier` (Player Traits) + `FB_CARD_MODIFIERS` meta + `cardCost()` (one source of truth for Discounted). Six traits wired into `scoreFootballPlay`: Reliable (waive busted penalty), Explosive (+0.10 BigPlay/card on clean concepts), Discounted (−1 cost), Clutch (+20 Base on drive 3 / championship — needs new `ctx.driveIndex`/`ctx.championship`), Protected (halves boss-scheme penalties), Hot Route (catch stacks with any QB). Each emits a ledger line; renders as a badge on the card face.
- War Room: rewrote `FootballReward.tsx` (was "Front Office" single-pick) into a shop — Funds header + credit breakdown, priced reward buttons (buy as many as affordable; each leaves the shelf), reroll, skip/next. `FootballSeason.tsx` reworked: credit Funds on win, `handleBuy`/`handleReroll`/`handleProceed`, reroll-scoped reward RNG (`rewards:<n>`). `FootballMatch.tsx`: feeds driveIndex/championship into scoring, uses `cardCost` for budget, renders trait badges + discounted cost in green.
- `gridironStorage.ts`: STORAGE_VERSION 2 (Funds + traits). Reads v1 saves and migrates (backfills funds) so an in-progress season survives the upgrade.
- `FootballHelpModal.tsx`: added War Room + Player Traits sections (reads engine data so it can't drift).
- `scripts/gridironBalance.ts`: now ECONOMY-AWARE — every policy credits the purse+interest and buys from a shrinking shelf (`runShop`). New `eco_greedy`/`eco_patient` policies + ③ FRONT OFFICE ECONOMY section. Training-reward synergy scoring. `cardCost` in the combo search; driveIndex/championship threaded.

Validation (`npm run balance:gridiron -- 3000`):
- ① BUILD GAP **61.0** ✅ (was 44.5), REWARD GAP **40.7** ✅ (was 29.9). The economy made building MUCH more decisive — spending well now compounds.
- ② PER-TEAM champion IRN 61 / BLZ 61.5 / STO 45.9 / VLT 53.3 / GHO 41.8. COMPETITIVE 5/5 ✅, DEAD-DRAW 6.1% ✅. SPREAD **19.6 🟡** (was 11.7) — the economy widened it: the passing teams have deeper purchasable upgrade trees to sink Funds into, so they convert the new currency to power better. Confirmed structural (changing the run/def training trait moved the aggregate 0.0 pts). Fix = run/def REWARD DEPTH (the planned ~24-coordinator catalog), NOT a deck nerf. All five teams still clearly viable (≥41%).
- ③ SMART-SPEND (synergy − random spend) **40.7** ✅; SPEND vs BANK |greedy − patient| **1.5** ✅ — neither dominates, so spend-now-vs-bank is a real decision. "✅ the economy is a real decision, not a formality."
- `npm run lint` ✅, `npm run build` ✅, `npm run smoke:gridiron` ✅ (smoke updated for War Room props + FUNDS).

Decisions:
- Included a GENTLE interest despite Phase-1's "no interest yet" (the systems bible calls it "the spine"). Harness confirms hoarding is viable-but-not-dominant, so it stays. Cap is $3; raise to $5 only if a War-Chest voucher ships.
- Training rewards auto-target the best-fit card (deterministic) instead of adding a card-picker — keeps the slice clean. A picker is a later refinement.
- Reliable's "once per game" limit and the Star/injury trait dropped for v1 (pure-scoring can't track per-game state cleanly yet).

Next (the documented sequence, now on a real economy):
- Slice: Film Tools (one-use consumables, 1 slot, ~6 tools, buyable in War Room) + coordinator ordering (reorder slots, resolve left-to-right, +ordering-sensitivity harness policy). Both need match-time UI; spec is in `game design 4.md` §3 / Phases 4-5.
- Compress team SPREAD via run/def reward depth: expand the coordinator catalog toward ~24 with economy/enabler/keystone archetypes for ground & defense so those leans have as much to BUY as the passing leans.
- Then: concept containment, run-summary coach debrief, daily challenge, meta-unlock grid (Phases 6-10).

Blockers:
- None. Visual check of the War Room pending — verify via `npm run dev` (preview MCP still mis-resolves the `slate-boss && cd slate-boss` cwd). SSR smoke confirms it renders.

## 2026-06-20 - Codex - main (Gridiron: productized-alpha foundation)

Goal:
- Begin moving Gridiron from prototype toward app/product alpha while preserving design flexibility.

Changed:
- Added seeded Gridiron infrastructure: `FbRunState.seed`, `createGridironSeed()`, `runRng()`, seedable `shuffle()`, `randomEnvironment()`, `randomBossScheme()`, deterministic reward generation, and seeded match draws.
- Added `src/lib/gridironStorage.ts` with versioned localStorage persistence under `gridiron_run_v1`; Football Home now shows Resume Season / Abandon & New Season when an active season exists.
- Football Season now restores active runs at the current match/reward point and regenerates weather, boss, and rewards from the run seed.
- Added next-game boss/weather scout to Front Office reward selection.
- Structured scoring ledger entries with stage/channel/operation/value metadata for future score pipeline animation/debugging.
- Added summary share seed string and `npm run smoke:gridiron` (`scripts/gridironSmoke.tsx`) for lightweight screen-render and ledger smoke coverage.
- Updated app metadata, README, and `docs/GRIDIRON_HANDOFF.md` to reflect Gridiron-first productized alpha.

Validation:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:gridiron` ✅
- `npm run balance:gridiron -- 3000` ✅
  - Synergy 44.4%, random 14.1%, none 0.0%; reward gap 30.3 pts ✅.
  - Per-team champion: Ironhawks 44.4 / Blazers 39.2 / Stormers 35.8 / Volts 35.9 / Ghosts 31.3.
  - Spread 13.1 pts ✅, competitive 5/5 ✅, dead-draw 6.1% ✅.

Decisions:
- Persistence intentionally resumes at active game/reward level, not exact mid-drive state yet. This keeps v1 save format simple while still making the season feel real.
- Boss preview was added to the existing Front Office surface rather than introducing a new screen.

Next:
- Coordinator ordering + containment, counter-aware harness policy, daily challenge entry point, and small deck manipulation rewards.

Blockers:
- None known.

## 2026-06-20 - Claude Code - main (Gridiron: teams-as-decks + per-team diagnostic harness)

Goal:
- Act on the latest multi-model design package (Balatro paper + "Depth & Complexity v3"). Two competing packages in the doc; took v3's discipline — "skill is decisive but may be a single solved line; add skill axes + viable archetypes, not content" — and CUT the other package's regressions (per-quarter 10-Cap reset that would replace the working Play Budget; build-DELETING bosses). The convergent #1 slice (everyone agrees) = teams-as-decks, and v3's non-negotiable §2 (per-archetype win rate) is meaningless until different decks exist — so built BOTH in one slice: the content gives the diagnostic something real to measure.

Changed:
- `footballRogue.ts`: NEW team-as-decks system. `TeamArchetype` (balanced/air_raid/ground_game/mobile_qb/defensive_pressure), `TeamDeckProfile`, `TEAM_PROFILES` (5 teams built from the real `seedData.ts` rosters — IRN/BLZ/STO/VLT/GHO), `buildTeamDeck()` with archetype skew (clones on-scheme cards; Ghosts borrow a risky DST for the Pick Six line) + a cost-IDENTITY perk (−1 cap on matching cards, min 1). `buildStarterDeck()` now delegates to the balanced profile (back-compat, byte-identical Ironhawks deck). Rebalance: ground_pound Game Plan 48/0.05→64/0.18 + a 3-carry "Gash" ×1.25 (gives the ground line a ceiling); Bell Cow +8→+13/run; Takeaway +0.25→+0.30, Pick Six ×1.6→1.65 (defense viable but not dominant).
- `footballRun.ts`: `FbRunState` gains `team`; `createRun(team='balanced')` pulls deck + starting coordinators from the profile. `buildIdentity` param narrowed to `Pick<…'deck'|'playbook'>`.
- `scripts/gridironBalance.ts`: TWO new diagnostics (the v3 gate). ② PER-TEAM VIABILITY — each team piloted by the synergy policy; prints champion%/avgGW + loss-cause, then SPREAD / COMPETITIVE / DEAD-DRAW verdicts. Loss-cause attribution (`dead_draw` = hand never assembled a scoring play, executed===0; vs `underpowered`).
- NEW `FootballTeamSelect.tsx` + wired as the opening phase of `FootballSeason` (select → match; New Season returns to select). Shows difficulty, strengths/weaknesses, cost perk, best concepts, coordinators, "START HERE" on Ironhawks.

Validation (`npm run balance:gridiron -- 3000`):
- ① DECISIVENESS (balanced baseline): BUILD GAP 44.5 ✅, REWARD GAP 29.9 ✅ (was 🟡 ~16-25 — rebalance pushed it green). "meta-layer is decisive."
- ② PER-TEAM: champion IRN 45 / BLZ 38 / STO 35 / VLT 37 / GHO 33. SPREAD 11.7 ✅ (≤15), COMPETITIVE 5/5 ✅, DEAD-DRAW 5.3% ✅. "meta is multi-path, not solved." (First harness run exposed the trap immediately: Blazers 84% / Volts 62% runaway, Stormers 28%/Ghosts 22% — took 5 tuning rounds to compress.)
- `npm run lint` ✅, `npm run build` ✅.

Decisions:
- Cost identity is baked at deck-build time (flat −1 on on-scheme cards), not a per-drive runtime perk — simpler, deterministic, no match-state plumbing. The "first card each drive costs −1" variant is a future refinement.
- Kept Package A's good ideas (team-identity-via-cost-discount folded in here; Franchise Tag / Hall of Fame deferred as later meta flourishes).

Next (the v3 sequence, now unblocked on a balanced multi-team base):
- Slice A — coordinator ordering (drag/up-down, resolve left-to-right) + play-concept containment + staged reveal in coordinator order. v3 says cheapest big depth win; harness should report ordering-sensitivity ≥~20%.
- Slice B — boss PREVIEW on the scout card → counter-drafting (add a `counter_aware` harness policy).
- localStorage run persistence (now that runs carry a team).
- Mobile QB still leans on stacks more than its own keeper line; a qb_keeper Game Plan step would deepen that identity if Volts ever feels samey.

Blockers:
- None. Visual check of FootballTeamSelect pending — verify via `npm run dev` (preview MCP still mis-resolves the `slate-boss && cd slate-boss` cwd).

## 2026-06-19 - Codex - main (Gridiron: onboarding + boss/readability pass)

Goal:
- Build recommendations 1-6 from the design review: guided first drive, obvious build identity, readable hand grouping, projected reward impact, boss defensive schemes, and more scoring feedback/juice.

Changed:
- `footballRogue.ts`: added Boss Defense schemes (`Base D`, `No-Fly Zone`, `Stacked Box`, `Turnover Drill`, `Adaptive DC`) and wired them into `scoreFootballPlay` with ledger tags. Bosses counter specific styles instead of deleting builds.
- `footballRun.ts`: added build identity helpers plus reward fit/impact projections. Front Office can now say what build you are becoming and show sample before/after scores.
- `FootballMatch.tsx`: added first-drive coach, hand grouping by QB Pass/Catch/Run/Defense/Kick, current build + defense scout cards, boss-aware previews, and staged scoring sequence recap.
- `FootballReward.tsx` / `FootballRunSummary.tsx`: surfaced current/final build identity, reward fit labels, and impact text.
- `FootballHelpModal.tsx`: documented first-drive grammar, Game Plans, and boss defenses.
- `scripts/gridironBalance.ts`: harness now simulates random weather + boss schemes.

Validation:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run balance:gridiron -- 3000`: synergy ~40.4%, naive ~16.4%, random ~12.9%, none 0%; build gap ~40.4 pts, reward gap ~27.5 pts.
- Browser smoke test: first-drive coach appears; hand groups render; Stack TD / Double-Stack / Shootout previews work; scoring sequence appears; Front Office shows current build + reward projections; taking Double-Stack Bomb updates Game 2 to `Double-Stack Bomb Team` and shows a boss defense.

Next:
- Teams-as-decks remains the biggest content/replayability slice.
- Add localStorage persistence so a season survives a closed tab.
- Consider seeded daily challenge/share strings after persistence.

Blockers:
- None.

## 2026-06-19 - Claude Code - main (Gridiron: starter-deck ratio fix + rebalance)

Goal:
- User playtest bug: hands were almost all catch cards, rarely a QB pass, so plays couldn't form and game 1 felt unwinnable.

Root cause: the starter deck was catch-flooded — one QB giving ~3 pass cards vs ~18 catch cards (incl. ~6 non-stacking bring-back catches). A catch needs a QB pass card to score, so catch-heavy hands were dead.

Changed (`footballRogue.ts`):
- Boosted QB pass output (pocket_qb 4→6 cards = 5 pass + scramble; rushing_qb +1 short_pass) and trimmed WR catch counts (alpha/boom/possession/slot down 1 each).
- Cut bring-back flood: 2 opponent catchers, ONE card each (was 3 players × full sets).
- New ratio: 28-card deck = 5 pass / 12 catch (10 stackable) / 6 run / 3 kick / 2 def. ~79% of 8-card hands now hold a QB pass (was ~53%).
- `FootballMatch.tsx`: hint when a hand has no pass/run — "Audible to dig for one."
- Re-steepened curve (`gameTargets` 0.14→0.18/game, champ 1.30→1.40) because reliable stacks made built decks too strong.

Harness after fix (`npm run balance:gridiron`): synergy ~56%, naive ~55%, random ~28%, none ~0%.
- BUILD GAP ~56 pts ✅, REWARD GAP ~28 pts ✅ (was 16). Reliable stacks made building pay → sharper strategy AND a better-feeling deck.

Validation: lint + build pass.

## 2026-06-19 - Claude Code - main (Gridiron: make skill decisive + permanent harness)

Goal:
- Act on the 2nd round of multi-model reviews. Unanimous Priority 0: reward/build choice wasn't strategically decisive (smart ≈ random, ~1-pt gap) — the roguelike meta-layer was noise. Fix the EV structure and make the harness permanent BEFORE adding teams/bosses. (Deliberately did NOT build teams/bosses/persistence/onboarding this slice — sequencing per the review.)

Changed:
- `scripts/gridironBalance.ts` (NEW, PERMANENT) + `npm run balance:gridiron`. Simulates full seasons under 4 reward policies (synergy / naive / random / none) and prints two headline gaps: BUILD GAP (best − none) and REWARD GAP (synergy − random). Reviewer asked to stop deleting the harness — this one is committed.
- Reward restructure (`footballRun.ts`): `generateRewards` is now lean-aware and KEYSTONE-guaranteed — every shop offers a build-defining engine piece (scaling coordinator, or strong on-scheme install when slots full) + an on-scheme stabilizer card + a flex/consistency pick. Bigger playbook installs.
- Buffed scaling engine (`footballRogue.ts`): Air Raid +0.2→+0.25/stack, Franchise QB +0.15→+0.2/bomb-game.
- Steepened the back-half curve (`gameTargets`: scale 0.09→0.14/game, championship ×1.12→1.30) so an un-built deck falls short while a compounded engine clears.

Harness result (was: smart 42% ≈ random 40%, ~1-pt gap):
- BUILD GAP best−none ≈ **40 pts ✅** (synergy ~42% vs none ~2%).
- REWARD GAP synergy−random ≈ **16 pts 🟡** (synergy ~42% vs random ~26%).
- Verdict line: "✅ the roguelike meta-layer is decisive." Un-built floor ~2%; building is now the game.

Validation: lint + build pass; `npm run balance:gridiron` green.

Next (now on a decisive base): teams-as-decks → boss schemes → localStorage persistence → onboarding. Re-run the harness on every balance change and record the gaps here.

## 2026-06-19 - Claude Code - main (Gridiron: season shell + reward loop)

Goal:
- Build the season shell (the "one more run" hook) on top of the polished single-match prototype.

Changed:
- `src/lib/footballRun.ts` (NEW): `FbRunState` (deck, coordinators, playbook, bombGames persist across games), `SEASON_GAMES=5`, `gameTargets` escalation (×(1+0.09·(g-1)), championship ×1.12), reward catalog + `generateRewards` (3 varied picks: free-agent card / hire coordinator / playbook install / trim / strength).
- `src/lib/footballRogue.ts`: added 3 coordinators incl. season-scaling **Franchise QB** (+0.15 Big Play per earlier Bomb game), plus West Coast Guru, Ball-Hawk DC; `FbScoreContext` now takes `playbook` + `bombGames`; `MAX_COORDINATORS=5`; `createFreeAgentCard`, `FB_CONCEPT_LABEL`. Retuned `DRIVE_TARGET` to [700,880,1120] (game-1 base).
- Components: `FootballSeason.tsx` (orchestrates match→reward→summary), `FootballMatch.tsx` (refactor of old screen, now props-driven), `FootballReward.tsx` (Front Office 3-choice), `FootballRunSummary.tsx`. Deleted `FootballRogueScreen.tsx`. App `football` route → FootballSeason.

Balance (harness): single game ~85% optimal/g1; full season champion ~42% optimal vs ~40% random, gentle curve 94/84/73/59/42% per game. NOTE: smart vs random reward choice ≈ equal — reward selection not yet strategically decisive (logged as open question #1 in GRIDIRON_HANDOFF.md; bosses/teams should fix).

Validation: lint + build pass. Updated `docs/GRIDIRON_HANDOFF.md` (now describes the season).

Next: teams-as-decks (5 identities) → boss schemes → localStorage persistence → onboarding.

## 2026-06-18 - Claude Code - main (Gridiron: make primary + UI polish)

Goal:
- User is committing to the football rogue ("Gridiron") and tabling Classic DFS / Slate Boss for now. Make Gridiron the headline mode, give it a real visual identity, add a help menu, and leave a reviewer handoff doc.

Changed:
- App now boots into `football_home` (new Gridiron title screen). Classic Slate Boss demoted to a secondary "legacy" link reachable from the title screen; its home now shows a "NOW PLAYING · Gridiron" banner back to the headline game. Nothing deleted — Classic code is intact.
- New visual design system: `src/components/footballStyles.ts` (tokens: charcoal/gold/field palette, side-color card accents, shared button styles). Global polish in `src/index.css` (stadium-light radial bg, yard-line utility, pop/rise/glow keyframes, tabular-num scoreboard).
- New `src/components/FootballHome.tsx` (title hero, tagline, Kickoff/How-to-Play, feature chips) and `src/components/FootballHelpModal.tsx` (goal, Base×Exec×BigPlay, budget, concepts table, weather, coordinators — reads engine data so it can't drift).
- Rewrote `src/components/FootballRogueScreen.tsx` with the new design: LED-style scoreboard with drive pips + score pop, three-channel preview tiles, card faces with side gradients/cost pills, in-match help (?) button.
- Added `docs/GRIDIRON_HANDOFF.md` — self-contained packet for outside reviewers/auditors (what it is, how to run, the loop, the 3 engine systems, balance, code map, roadmap, open questions). Hand this to anyone for feedback.
- Added `.claude/launch.json` for dev-server previews.

Validation: `npm run lint` and `npm run build` pass (exit 0). Game logic/balance unchanged from the refactor slice. Couldn't auto-screenshot (preview MCP mis-resolved the harness cwd); verify visually via `npm run dev`.

Next: unchanged — the season shell (see GRIDIRON_HANDOFF.md §7).

## 2026-06-17 - Claude Code - football-card-rogue (refactor slice)

Goal:
- Act on the multi-model design reviews (Gemini / ChatGPT / "Gridiron Run" spec). Consensus + my read: fix the "one Double-Stack Bomb wins the match" pacing, give coordinators that actually SCALE, and bring the DFS salary cap back as the play resource. Refactor the core in place; season shell/shop/bosses deferred to next slice. User chose: core-refactor-first (then playtest) + Play Budget resource model.

Changed (footballRogue.ts + FootballRogueScreen.tsx):
- Match is now 3 escalating DRIVES (not one 700 target). Clear each drive's target or the run stalls.
- THREE-CHANNEL deterministic scoring: total = base × (1 + execution) × bigPlay. Ledger renders Base / Execution / Big Play separately. Kills the one-bomb-wins problem.
- PLAY BUDGET resource model (salary cap folded into the play resource, per the reviewer pushback I agreed with): every card has a cap `cost` (1–4 by source-player salary tier; kick/defense overridden). You call as many plays per drive as the budget affords. Audibles (3/drive) stay as the simple second resource.
- SCALING coordinators: Air Raid = +0.2 Execution per stack already completed this match (within-game ramp); Bell Cow = +8 Base/run card and +6 permanent Base per Ground & Pound this match. (salary_wizard also defined.)
- Anti-spam: repeating a concept in a drive applies ×0.85 Big Play ("Defense Adjusted").
- Environments retained (Dome/Snow/Wind/Primetime/Clear).

Balance (harness, since removed): budget [24,26,28], targets [900,1150,1450]. Optimal value-per-credit play wins ~71%, random 0%, ~5.7 plays/match (~2/drive), first bomb ≈69% of drive-1 target (was 118%). Tunables at top of footballRogue.ts.

Validation: `npm run lint` and `npm run build` pass.

Next (the season shell, per the reviews):
- Wrap matches in a ~5-game season (RogueRunState, escalating across games), lose-on-failed-drive, simple 3-choice reward loop after each win (add/upgrade/cut card, hire coordinator), then teams-as-decks (5 identities, license-agnostic display-only names), then 5 boss schemes. Cap first coordinator catalog ~16–20.
- Add a season-SCALING coordinator (e.g. Franchise QB: +0.15 Big Play each game you land a Bomb) once the season exists.

Blockers:
- Need user's playtest feel on the 3-drive + budget loop before building the season shell.

## 2026-06-17 - Claude Code - football-card-rogue

Goal:
- Pivot the card-rogue direction from "DFS lineup + bolt-on Edge multiplier" to a football-native deckbuilder where a card is a football ACTION and you assemble scoring plays. Ship the smallest playable slice that tests the core fun question: does assembling a play and watching Base x Mult feel good?

Changed:
- Added `src/lib/footballRogue.ts`: action-card model (cards are Deep Ball, Power Run, Deep Catch, Interception, etc., value weighted by player archetype), deterministic `scoreFootballPlay` (Base x Mult) with a synergy/coordinator/environment ledger, starter deck built from Ironhawks + a few Blazers (bring-back) + kicker cards, and `Air Raid` coordinator.
- Added `src/components/FootballRogueScreen.tsx`: a full single-match loop — scoreboard + target, 8-card hand, tap up to 4 cards, LIVE play preview (the key "watch the engine" moment), Run Play / Audible, 4 quarters, win/lose. Per-match environment modifier (Dome/Snow/Wind/Primetime/Clear).
- Added `Screen = 'football'` and routed it in `App.tsx`; added a "Football Rogue" entry card to `HomeScreen.tsx`.

Decisions (defaults, all tunable):
- Scoring is DETERMINISTIC. Variance lives in the draw (do you hold the cards to complete the stack?), not in a sweat sim. No contest sim involved in this mode.
- One card = one football action. A play = 1-4 cards. Hand size 8, 4 quarters, 2 audibles, target 700 (Primetime ×1.25).
- Single starter team (Ironhawks), one coordinator (Air Raid), one environment per match. Teams-as-decks, shops, bosses, season shell all deferred until the core play loop proves fun.

Validation:
- `npm run lint` and `npm run build` pass.
- Engine sanity check (scripts/fbcheck, since removed): Field Goal 55, Single Stack 319, Double-Stack Bomb 603, Shootout 618, Ground & Pound 134 vs 700 target.

Next:
- Playtest the core loop. Tune target / mults if a single stack trivializes the match.
- If fun: add a season shell (rounds → playoffs → championship), a shop/reward loop, more coordinators, multiple teams-as-decks, and boss defensive schemes (the "stingy vs pass" idea).

Blockers:
- Need the user's feel: is "assemble a drive, watch it score" the fun moment? That decides whether we invest in the run shell.

## 2026-06-17 - Codex - codex/dfs-card-rogue

Goal:
- Build the first playable DFS card-rogue prototype path and provide a local test link.

Changed:
- Added `src/lib/rogueScoring.ts` with lineup pattern detection, starter coordinator data, and `Base Fantasy Points x Edge` scoring.
- Added a Rogue Prototype card to the home screen.
- Reused the existing lineup builder and sweat screen for rogue mode while keeping daily/career paths intact.
- Added starter coordinator context in the builder: Air Raid Coordinator, Salary Wizard, and Leverage Desk.
- Added `src/components/RogueResultsScreen.tsx` with engine score, boss target, lineup patterns, coordinator cards, score ledger, and lineup scorecard.
- Wired `App.tsx` so Rogue Prototype does not update daily/career profile progression.

Validation:
- `npm run lint` passes.
- `npm run build` passes.
- Dev server runs at `http://127.0.0.1:5173/slate-boss/`.
- Browser smoke test completed: opened Rogue Prototype, built a stack-heavy lineup, entered contest, skipped sweat, and verified the rogue results ledger rendered.
- Mobile-width home overflow check at 390x844 found no horizontal document overflow.
- Final browser reload verified `Try Rogue Prototype` is present at the local URL.

Decisions:
- First prototype uses the existing full slate player pool instead of a limited draw/bench system.
- First prototype keeps the existing contest simulation as Base Points, then applies the rogue engine on top.
- Starter rogue contest uses `mini_gpp` internally.
- Prototype boss target is a fixed 210 engine score.

Next:
- Tune scoring values; the first stack-heavy test hit a very large 352.0 engine score.
- Add a real rogue run shell with weeks/antes, boss slates, shop, and rewards.
- Add playbook upgrades and shop-purchasable coordinators.
- Consider a limited bench/draft layer once the scoring loop feels good.

Blockers:
- Need user/design feedback on whether the engine feels exciting or too explosive.

## 2026-06-17 - Codex - codex/dfs-card-rogue

Goal:
- Preserve the current playable DFS sim and branch into a DFS card-roguelike direction.

Changed:
- Created and pushed `archive/classic-dfs-sim` from the current `main` baseline.
- Created and pushed tag `classic-dfs-sim-2026-06-17` from the same baseline.
- Created branch `codex/dfs-card-rogue` for experimental rogue-mode work.
- Added `docs/DFS_CARD_ROGUE_DIRECTION.md` as the north-star design brief and phased implementation guide.
- Updated `PROJECT_LOG.md` with the branch/archive decision.

Validation:
- Verified `main` was clean and synced with `origin/main` before creating archive refs.
- No gameplay code changed in this setup pass.

Decisions:
- Keep classic Slate Boss on `main`.
- Build the card-rogue experience as a branch-first experiment, not a destructive rewrite.
- Use `Base Points x Edge` as the initial DFS translation of card-rogue scoring.
- Use coordinators/tools/playbooks/film-room language instead of copying Balatro terms.

Next:
- Implement `src/lib/rogueScoring.ts` with lineup pattern detection and a visible score ledger.
- Add a small coordinator database and hook-style scoring effects.
- Add tests or a balance harness for rogue pattern detection before UI work.
- Then add a Rogue Run entry path while keeping daily classic mode intact.

Blockers:
- Need a product decision later on whether rogue mode uses the full slate pool or a limited draw/bench system.
