# BUILD PROMPT — Fourth Phase

> Handoff prompt for a fresh agent. Self-contained — assumes no prior conversation context.
> Captures the full "Fourth Phase" design dream. Two open decisions are flagged with recommended defaults.

> **Status update (2026-06-29):** Fourth Phase is no longer an isolated lab — it is now the app's
> front door. The Callsmith/Gridiron season game has been unwired from `App.tsx` (its code is retained
> in git history and keeps its own `smoke:/matchup:/balance:gridiron` scripts). The "isolated prototype
> mode beside Callsmith" framing throughout the brief below was the original constraint; treat it as
> historical. New work should build directly on the Fourth Phase engine as the primary game.

## Role & context
You are working in an existing, shipping React + TypeScript + Vite football card roguelike. The player-facing game is **Callsmith** (internal code uses `gridiron`/`football` naming). It is balanced and verified — a 3000-season Monte Carlo harness passes green gates. Your job is **not** to rewrite it. Build **Fourth Phase** as an isolated, parallel prototype mode that can be played and balance-tested next to Callsmith, so we can decide empirically whether to migrate.

Key repo facts:
- Navigation is **state-based**, not routed: `src/App.tsx` switches a `screen` state (`'home' | 'season'`). Add a third mode (e.g. `'fourthPhase'`) reachable from `FootballHome`, behind a clearly-labeled "Fourth Phase (Lab)" entry. Do not add react-router.
- Core engine: `src/lib/footballRogue.ts`. Run/economy/rewards: `src/lib/footballRun.ts`, `src/lib/gridironEconomy.ts`. Harnesses: `scripts/gridironBalance.ts`, `scripts/gridironMatchupCheck.ts`, `scripts/gridironSmoke.tsx`. NPM scripts: `lint`, `build`, `smoke:gridiron`, `matchup:gridiron`, `balance:gridiron`.
- Put all new code under `src/lib/fourthPhase/` and `src/components/fourthPhase/`. Do not edit Callsmith logic except the single `App.tsx`/`FootballHome` entry point.

## Hard constraints
1. Callsmith stays fully intact and playable. All existing tests stay green (`lint`, `build`, `smoke:gridiron`, `matchup:gridiron`, `balance:gridiron`).
2. Fourth Phase is additive and isolated — its own modules, its own harness.
3. Local-first. No backend, accounts, multiplayer, real money, betting, or licensed IP. All teams/players/content are fictional. Real football data only for calibration docs.

## The core design

**The thesis:** four football phases each do one *honest* mathematical job, and they are the four inputs to the scoring equation. The theme teaches the math.

```
Drive points = Yards × (1 + Execution) × BigPlay
```

| Phase | Engine term | Role |
| --- | --- | --- |
| Offense | Yards (Base) | the payload — moves the ball |
| Defense | Execution (floor) | reliability, not fireworks |
| Crowd | BigPlay (ceiling) | amplifies via the Crowd Meter |
| Special Teams | off-equation fuel | draws, discounts, money, field position |

**Card model:**
```ts
type Phase = "offense" | "defense" | "specialTeams" | "crowd";
type Rank = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A";
type FourthPhaseCard = {
  id: string; phase: Phase; rank: Rank; value: number;
  tier: "rotation"|"starter"|"proBowl"|"captain"|"scheme"|"playmaker"|"franchise";
  roleName: string; tags: string[]; modifier?: PlayerTrait; edition?: CardEdition;
};
```
Deck = 52 cards (4 phases × 13 ranks). Rank = roster tier (the football fantasy lives in `roleName`; `phase`+`rank` give one-second legibility). Base values seed `2–10 = face value, J/Q/K = 10, A = 11`; let editions/upgrades create the high-end spread (don't bake a steep curve into base values — tune via harness). **No per-card Play Budget** — the 8-card hand and 5-card play limit are the only hand constraints; resource pressure lives entirely in Special Teams + shop economy.

## The Crowd Meter (the signature mechanic — build this carefully)
A **per-drive** multiplier that builds across plays and is cashed into BigPlay.
- Starts cold at **×1.0**, caps at **×6.0** (cap raisable by jokers/upgrades — always bounded).
- **Crowd cards charge it** instead of scoring (they add ~0 Yards). Seed charge by rank: `2–6: +0.2`, `7–10: +0.4`, `J/Q/K: +0.6`, `A: +1.0`.
- **Sustained tick:** each consecutive non-bust play adds `+0.1`.
- **BigPlay on a cashed scoring play = current meter × (joker BigPlay mults).**
- **Bleed:** on a bust or a play scoring under a low threshold, `meter -= 0.25 × (meter − 1.0)`. On turnover/drive-end, reset to ×1.0.
- **UI requirement (non-negotiable):** the meter is the single most prominent on-screen element — a glowing stadium gauge. A persistent hidden stat is exactly what hurt Callsmith's clarity; make the hidden thing the hero. Volume/visual intensity scales with the meter.

## Situations (the "hands") — payouts scale with phase completeness
Recognize from phase/rank composition. Seed values (tune in harness):

| Situation | Trigger | Seed identity |
| --- | --- | --- |
| The Checkdown | 1–2 Offense only | Base ~8, safe, saves cards |
| The Drive | 3+ Offense | Base from card values, +0.15 Exec |
| The Stand | 3+ Defense | low Base, +0.50 Exec |
| Field Flip | 2+ Special Teams | ~0 score, draw/$ payout |
| The Blackout | 3+ Crowd | ~0 score, large meter charge |
| Momentum Shift | 2 Offense + 2 Defense | mid Base, +0.35 Exec |
| House Call | Offense + Crowd | Base cashed vs. meter |
| Pick Six | Defense + 1 Offense | Base burst + Exec→burst, charges meter |
| Complementary Football | all four phases present | **apex** — bonus to all three axes + meter |
| Busted Play | no recognized situation | BigPlay penalty unless salvaged |

Design intent: being a **complete team** is the dominant strategy; one-color spam should feel hollow. Use a priority ladder (check Complementary/apex before simpler shapes). Write **unit tests** for situation recognition.

## Jokers (X-Factors) — architecture first
Jokers are **pure event-listeners** on scoring hooks, so content is a data-only change:
`onSituationDetected`, `onCardScored(card, index)`, `onPhaseScored(phase)`, `onMeterCharged`, `onPlayFinal`, `onDrawStart`, `retriggersFor(...)`. Evaluate **strictly left-to-right** (cards and jokers). Balance discipline: additive is common, ×mult is rare and conditional, scaling jokers carry a cap or a cost.

First wave (~12, spanning distinct build archetypes):

| Joker | Effect | Hook |
| --- | --- | --- |
| Twelfth Man | Crowd cards charge meter +50% | onMeterCharged |
| Home Cooking | meter doesn't bleed on a drive's final play | onPlayFinal |
| Sustained Drive | each non-bust play raises meter cap +0.15 (capped) | onPlayFinal |
| Silent Count | while meter cold, Defense cards +0.25 Exec each | onCardScored |
| Pick-Six Specialist | a Pick Six charges meter to cap | onSituationDetected |
| The Genius | all-four-phase play scores ×2 | onPlayFinal |
| Field General | each ST card → +1 next draw, +$2 | onPhaseScored |
| Two-Minute Drill | with 0 discards, retrigger all Offense | retriggersFor |
| Road Warriors | when meter cap forced low (boss), +60 Base/Offense | onCardScored |
| Bandwagon | meter starts +0.3 per game already won | onDrawStart |
| Decibel Record (legendary) | meter uncaps, but bleeds 40%/play | onPlayFinal |
| Hurry-Up | retrigger all Offense if 5 cards played | retriggersFor |

## Supporting systems (stage as noted in the sequence below)
- **Drag-to-reorder:** player reorders the 5 played cards and 5 jokers; order changes the math (charge before cash; retrigger before multiply). This is the skill layer — build it early, it's the proof-of-fun.
- **Teams as starting classes** (keep Callsmith's philosophy): Balanced, Air Raid (Off/Crowd, weak floor), Smashmouth (low-rank Off+ST, high floor), Black & Blue (Def/ST off-meter), Loud House (Crowd upgraded, faster meter, weak Base), Special Teams Chaos. Each = a phase-lean + one signature joker.
- **Bosses as soft pivots** (never hard-invalidate): Stacked Box (Off Yards −50%), No-Fly Zone (max 2 Off/play), Road Game (meter caps ×2, 2× bleed), Turnover Drill (Defense subtracts Exec), Field Position War (ST gives no fuel), Adaptive DC (repeat situation → 0), Prevent Defense (BigPlay capped).
- **Consumables:** Practice Drills (level a situation's base — the commitment lever) and ~22 Audibles (single-use deck mutations: Transfer Portal=change phase, Redshirt=clone, Roster Cut=destroy, Hype Train=upgrade Crowd charge, Film Study=level a Drill, Combine=bump rank).
- **Editions/traits/risk:** Editions All-Pro/In Rhythm/Home Run/**Crowd Favorite** (non-Crowd card charges meter). Traits Reliable/Explosive/Clutch/Hometown Hero. Risk cards Injury-Prone (boom, chance to be lost), Locker-Room Cancer (debuffs neighbors), Aging Vet (declines per game), Holdout (upkeep cost).
- **Macro structure:** game = ante; its 3 drives = small/big/boss blinds; Drive 1 skippable ("rest starters") for a reward; escalate to Championship → Overtime (meter uncaps, infinite targets, Decibel Record is king).
- **Juice:** crowd audio volume = meter; per-phase SFX (Off "ooh", Def hit, Crowd roar, ST drumline); cash-in screen shake + score count-up with rising pitch; Friday-night-lights CRT aesthetic. Honor reduced-motion (suppress audio + shake).
- **Onboarding:** first run = scripted "preseason" with a rigged hand that forces a Checkdown then a Crowd-charge → House Call cash, so the player *hears and sees the meter pay off in 60 seconds*. Equation fully visible, show-math on.
- **Virality:** design the cash-in screen to be screenshotted (giant number, frozen white-hot meter, 5-joker lineup, run code). Reuse run codes + Daily streak.

## TWO DECISIONS — flagged with recommended defaults (flippable)
1. **Skeleton.** *Abstract-target* (hit a number with N plays — simple, proves the engine) vs. *field-position/downs* model (ball moves down a field; gaining past the first-down line refreshes 4 downs; reach end zone = TD that cashes the meter; ST = literal field position; richer + more football, bigger balance problem). **Default: build abstract-target first (Phase 1–3), then add the field/downs model as Phase 5 behind a flag once the core feel is proven.**
2. **Progression.** *Pure-skill* (no meta, Callsmith's purity) vs. *light local unlock spine* (unlock teams/jokers/stakes via milestones like "cash a ×6 meter", "100k drive", "win on Hall of Fame"; local-first, additive, never a power gate). **Default: include the light unlock spine as Phase 6, gated behind a flag, off by default until tuned.**

## Build sequence (each phase independently verifiable)
1. **Engine core:** deck generator, card model, situation recognizer (+unit tests), the `Yards × (1+Exec) × BigPlay` ledger. Abstract target. Prove a known play scores a known number.
2. **The Crowd Meter** + the charge/cash/bleed loop, as the visible hero gauge.
3. **Jokers as event-listeners** (the 12) + **drag-to-reorder** for cards and jokers. This is the fun-proof milestone — stop and confirm the build-and-cash loop feels good before adding content.
4. **Full drive loop:** 8-card hand, play up to 5, discards, situations, bosses (soft pivots), a mini War Room to draft jokers onto 5 sideline slots, win/loss.
5. **(Fork 1)** Field-position/downs model behind a flag.
6. **(Fork 2)** Teams, consumables, editions/traits/risk, macro blind structure, light unlocks, Overtime — content scaling on the proven engine.
7. **Juice & onboarding** pass.

## Deliverables
1. `src/lib/fourthPhase/` engine: deck, card model, situation recognizer (with tests), scoring ledger, meter, event-hook joker system + the 12 jokers.
2. `src/components/fourthPhase/` UI: stadium-night cards (suit-colored), the hero meter gauge, live ledger, drag-reorder, drive loop, mini War Room, cash-in screen. Entry from `FootballHome`.
3. `scripts/fourthPhaseMatchup.ts` — deterministic situation/scoring/meter proof. NPM script `matchup:fourthphase`.
4. `scripts/fourthPhaseBalance.ts` — Monte Carlo harness reporting **median, p90, p99, fail rate, build gap, reward gap, per-team viability, economy, and a meter-ceiling-tightness gate**. NPM script `balance:fourthphase`. Compare output against Callsmith.
5. A short `docs/FOURTH_PHASE_LAB_NOTES.md`: is it more readable, more fun, and does it produce better "I broke the game" moments than Callsmith? Honest verdict on whether to migrate.

## Verification gate (run before declaring done)
```
npm run lint
npm run build
npm run smoke:gridiron
npm run matchup:gridiron
npm run balance:gridiron -- 3000     # Callsmith stays green
npm run matchup:fourthphase
npm run balance:fourthphase -- 3000   # new engine's own gates
```
Do not claim the engine is "balanced" by analogy to Callsmith — it's a new engine and must re-earn its green gates. Report the numbers honestly, including any advisory-yellow ceiling.
