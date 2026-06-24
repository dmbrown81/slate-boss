# Gridiron vs. Balatro - Scaling Research Brief

> Purpose: give another AI model, designer, or reviewer enough context to compare
> Gridiron against Balatro's system stack, then propose how Gridiron can scale
> toward that depth without becoming a poker clone or copying Balatro's trade
> dress. Use this file as a standalone prompt packet.

_Created: 2026-06-24. Branch observed: `gridiron-ux-sprint`. Current repo state:
clean. Latest checks passed: `npm run lint`, `npm run build`,
`npm run smoke:gridiron`, `npm run balance:gridiron -- 3000`._

---

## 1. One-sentence framing

Gridiron already has a playable football-native roguelike skeleton that maps
surprisingly well to Balatro's major systems, but it is still shallow in the
places where Balatro becomes endlessly replayable: rarity, content volume,
unlock pacing, specialized packs, stakes, collection discovery, and broken
build-around effects.

---

## 2. Current Gridiron Snapshot

Gridiron is a single-player, mobile-first, fictional football card roguelike in
a Vite + React + TypeScript app. It is the active product in the Slate Boss repo.

The pitch:

```text
Build the deck. Call the play. Beat the defense.
```

Current loop:

- A run is a 5-game season.
- Each game has 3 drives.
- Each drive has a rising point target.
- The player draws an 8-card hand from a football-action deck.
- The player selects up to 4 cards to call a play.
- Plays are scored deterministically:

```text
drivePoints = Base x (1 + Execution) x Big Play
```

- Variance lives in the draw, not hidden rolls.
- Each card has a Play Budget cost; each drive has finite budget.
- Audibles redraw selected cards.
- Winning a game sends the player to the War Room shop.
- Losing a drive ends the season.

Current major systems:

- Five team-as-deck starts: Ironhawks, Blazers, Stormers, Volts, Ghosts.
- Football concepts: Stack TD, Double-Stack Bomb, Ground & Pound, Shootout,
  Pick Six, QB Keeper, Field Goal, etc.
- Coordinators: passive/scaling build pieces similar to Jokers.
- Game Plans: play-concept levels similar to Planet cards.
- War Room: shop between games with Funds, interest, rerolls, skip-for-funds.
- Player Traits: card modifiers such as Reliable, Explosive, Discounted,
  Clutch, Protected, Hot Route.
- Film Tools: one-use deck/card mutation tools, similar to Tarot-style effects.
- Front Office Upgrades: run-persistent rule upgrades, similar to Vouchers.
- Boss defenses: No-Fly Zone, Stacked Box, Turnover Drill, Adaptive DC.
- Weather/environment: Clear, Dome, Wind, Snow, Primetime.
- Daily Scrimmage: local deterministic daily seed, streak, result record.
- Local run history and best-run recap.
- Quick results and haptics preferences.
- Loss diagnosis panel.

Recent balance harness result at 3000 seasons per cell:

| Policy | Champion | Per-game clear, G1 to G5 |
|---|---:|---|
| Synergy, commit to one Game Plan | 53.0% | 98 / 88 / 80 / 74 / 53 |
| Naive, grab coordinators without commitment | 30.9% | 97 / 89 / 78 / 66 / 31 |
| Random rewards | 10.7% | 97 / 79 / 53 / 35 / 11 |
| No rewards | 0.0% | 98 / 72 / 23 / 1 / 0 |

Other balance notes:

- Build gap, best minus no-rewards: 53.0 pts, good.
- Reward gap, synergy minus random: 42.3 pts, good.
- All five teams are viable; champion spread is 4.3 pts.
- Forced lane spread is 11.1 pts, slightly above the desired 10 pt target.
- Defense is the hottest forced lane, but every lane is viable.

---

## 3. Core Translation Layer

Use these terms when explaining the comparison to other models:

| Balatro language | Gridiron language | Current state |
|---|---|---|
| Poker hand | Football play concept | Present. Concepts are the heart of scoring. |
| Playing cards | Football action cards | Present. Cards have position/action/team/value/cost. |
| Chips | Base | Present. Raw yards/points fuel. |
| Mult | Execution and Big Play | Present. Split into additive execution and multiplicative big play. |
| Hands per round | Play Budget per drive | Present, but football-native. Budget gates how many plays fit. |
| Discards | Audibles | Present. Redraw selected cards. |
| Ante | Game number / season ramp | Present, but only 5 games. |
| Small/Big/Boss Blind | Drive 1/2/3 plus boss defense | Partial. Drives escalate; boss schemes start Game 2. |
| Boss Blind | Defensive scheme | Present, small library. |
| Shop | War Room | Present. Funds, rerolls, buy limit, skip. |
| Money | Front Office Funds | Present. Win purse, interest, reroll cost, skip bonus. |
| Jokers | Coordinators | Present. Strongest existing analog. Needs rarity/discovery/slot pressure. |
| Planet cards | Game Plan levels | Present. Strong analog: level a play concept. |
| Tarot cards | Film Tools / Training | Present. Film Tools mutate cards/deck immediately. |
| Spectral cards | High-risk football mutations | Mostly absent. Some Film Tools are mild versions. |
| Vouchers | Front Office Upgrades | Present. Run-persistent rule upgrades. |
| Booster packs | Specialized War Room packs | Mostly absent. War Room offers individual cards/rewards/tools. |
| Decks | Team starts | Present. Five team identities. |
| Stakes | League difficulty tiers | Absent. Team difficulty exists, not full progression stakes. |
| Unlocks | Local content unlocks / team mastery | Mostly absent. History/daily exist, content unlocks do not. |
| Collection | Playbook/Coordinator/Film archive | Absent. No compendium yet. |
| Editions/seals/enhancements | Traits, contracts, captaincy, chemistry tags | Partial. Traits exist; no broad variant taxonomy. |
| Tags/skipping blinds | Scout tags / optional risk-reward skips | Mostly absent. Skip exists only in War Room for Funds. |

Important design instruction:

Gridiron should learn from Balatro's system architecture, not copy its names,
visual language, card text, sound, store page positioning, or poker identity.
Keep the game fictional-football-only.

---

## 4. Side-by-Side Comparison

Status scale:

- 0 = absent
- 1 = early seed
- 2 = solid alpha version
- 3 = Balatro-grade depth or replayability

| System | Balatro role | Gridiron equivalent | Status | What is working | Main gap |
|---|---|---|---:|---|---|
| Core familiar strategy | Poker hands give instant grammar: pair, flush, straight, full house. | Football concepts: stacks, runs, keepers, defensive plays, field goals. | 2 | Football concepts feel native and score transparently. | Poker has universal familiarity; football concepts need stronger learning, surfacing, and containment. |
| Base card language | Rank/suit make every card readable and combinable. | Position/action/team/value/cost define cards. | 2 | Actions like Deep Ball, Power Run, Sack are readable. | No clean rank/suit equivalent. Needs a tighter visible taxonomy: role, lane, team, cost, trait, concept hooks. |
| Scoring clarity | Chips x Mult is simple and extensible. | Base x (1 + Execution) x Big Play. | 2 | Three-channel scoring avoids one dominant scalar. | More math on a small screen; must keep closure/quality labels ahead of formulas. |
| Deck building | Add, delete, copy, enhance, convert, seal, edition cards. | Add players, trim cards, traits, Film Tools, Game Plans. | 2 | Real deck shaping now exists through Film Tools and War Room rewards. | Needs more repeatable deck archetypes, card variant taxonomy, and clearer before/after preview. |
| Jokers | Passive build engine, rarity tiers, slot tension, wild synergies. | Coordinators: scaling buffs and build identity. | 2 | Coordinators are the strongest analog; they already compound. | No explicit common/uncommon/rare/legendary tiering; few outrageous build-arounds; no ordering UI yet. |
| Tarot | One-use deck manipulation and enhancement. | Film Tools: Film Cut, Clone the Tape, Bulk Up, Contract Restructure, Deep Threat Reps, etc. | 2 | Tarot-like layer exists and is football-native. | Tools apply immediately; no held consumable slot, pack choice ritual, or high-risk variants. |
| Planet cards | Level poker hand types to push commitment. | Game Plan levels for concepts like Stack TD, Ground & Pound, Pick Six. | 2 | Very strong analog; this is the current strategic spine. | Needs UI ceremony, concept XP/level history, and more concept variety if content grows. |
| Spectral cards | Risky, run-warping deck transformations. | No dedicated layer. | 0-1 | Some Film Tools could become mild Spectral analogs. | Missing dangerous "would you break your run for this?" moments. |
| Vouchers | Run-persistent rule/shop upgrades. | Front Office Upgrades: Staff Expansion, Headset Upgrade, Scouting Network, Deep Pockets, Bigger Front Office. | 2 | Clean run-persistent rule modifiers exist. | Needs rarity, unlocks, more long-term combos, clearer shelf identity. |
| Booster packs | Choose from cards/Jokers/Tarot/Planet/Spectral/etc. | War Room rewards plus separate Film Room shelf. | 1 | War Room has reward shelves and two-tap buy. | Missing pack-opening decision grammar and specialized pack types. |
| Starting decks | Different opening constraints and bonuses. | Five teams-as-decks with identities and difficulty. | 2 | Strong thematic mapping; teams feel like archetype starts. | Needs unlockable variants, advanced starts, challenge starts, and mastery goals. |
| Stakes | Repeat wins unlock harder global modifiers. | No true stake ladder. | 0-1 | Team difficulty hints at it; balance harness supports tuning. | Needs League Levels or Stakes that alter rules without requiring new content every time. |
| Antes/blinds | Escalating round targets and boss checks. | 5 games x 3 drives with geometric targets; boss defense from Game 2. | 2 | Ramping works mathematically; losses are decisive. | Season is much shorter; boss moments need more identity/ritual. |
| Bosses | Boss Blinds force adaptation and create stories. | Defensive schemes: No-Fly Zone, Stacked Box, Turnover Drill, Adaptive DC. | 1-2 | Existing bosses counter styles without deleting them. | Small boss library; need more memorable boss names, tells, and counterplay. |
| Unlocks | New Jokers/decks/vouchers/stakes enter the pool via achievements. | Local daily/history only; no content unlock library. | 0-1 | Local retention exists and avoids accounts. | No long-tail discovery. Needs content unlocks that do not become permanent power creep. |
| Progression | Collection completion, stake wins, challenge runs. | Best run, run history, daily streak. | 1 | Good start for local alpha. | Needs team mastery, compendium, seeded challenges, and cosmetic/status goals. |
| Economy | Money, interest, shops, rerolls, skip rewards. | Funds, interest, rerolls, skip-for-funds, buy caps. | 2 | Smart spending is meaningfully better than random. | Needs more shop texture, packs, sale/rarity rules, and late-run money sinks. |
| Rarity | Common/uncommon/rare/legendary drive excitement and balance. | Implied through reward types, rare coordinators, Front Office offer chance. | 1 | Some rarity-like weighting exists. | Rarity is not a player-facing emotional layer yet. |
| Collection UI | Shows discovered/undiscovered content. | None. | 0 | Not needed for proving the core loop. | Essential if content expands. |
| Daily/seeded play | Seeds matter to communities and challenge sharing. | Daily Scrimmage local seed/streak/share recap. | 1-2 | Local daily exists without server/accounts. | Needs official-attempt ritual, fixed challenge identity, and shareable comparison language. |

---

## 5. Current Gridiron Content Inventory

This section helps outside models avoid proposing "add the thing" when the thing
already exists in early form.

### Concepts / hand types

Current concept layer includes football-native play concepts such as:

- Stack TD
- Double-Stack Bomb
- Ground & Pound
- Shootout
- Pick Six
- QB Keeper
- Field Goal
- Busted Play / weak concept outcomes

The key design question is not "should Gridiron have hand types?" It already
does. The better question is whether these concepts are:

- clear enough to learn without football expertise,
- numerous enough for replayability,
- contained enough that bigger concepts can include smaller concepts,
- varied enough that teams feel different,
- and visible enough in the UI before the player commits.

### Coordinators / Joker analog

Coordinators are passive build engines. Examples:

- Air Raid Coordinator: stack plays gain Execution scaling with prior stacks.
- Bell Cow: run cards gain Base and Ground & Pound ramps within match.
- Franchise QB: Big Play scales with prior games where Bomb landed.
- Read-Option Guru: supports QB Keeper / mobile lane.
- The Improviser: mobile-QB scaling.
- Broken Play Artist: rescue/anti-volatility identity tool.
- Pressure Chain: defensive pressure ramp.
- Takeaway Machine: season-long takeaway scaling.
- West Coast Guru, Ball-Hawk DC, Salary Wizard, and others.

Current gap:

- no explicit rarity ladder,
- no legendary coordinator class,
- no discovered/unseen collection,
- no coordinator ordering UI,
- no strong slot-management drama beyond max coordinator count,
- not enough "I broke the game" stories yet.

### Game Plans / Planet analog

Game Plans level a specific football concept. Levels add flat scoring and, at
Level 2+, a growing Big Play multiplier. This is one of Gridiron's best Balatro
mappings because it rewards commitment to a play style.

Current gap:

- Game Plan leveling is mechanically meaningful but not yet as emotionally
  legible as "my Flush is level 12."
- The UI should make the player's core concept feel like a named offensive
  identity, not just another reward row.

### Film Tools / Tarot analog

Current Film Tools:

| Film Tool | Effect |
|---|---|
| Film Cut | Cut your lowest-value card. |
| Clone the Tape | Duplicate any card. |
| Bulk Up | Add Base value to one card forever. |
| Contract Restructure | Reduce one card's cost by 1. |
| Deep Threat Reps | Convert Quick Catch into Deep Catch and add value. |
| Reliable Hands | Add Reliable trait. |
| Explosive Package | Add Explosive trait. |
| Clutch Reps | Add Clutch trait. |
| Boss Prep | Add Protected trait. |
| Hot Route Install | Add Hot Route trait to a catch card. |

Current gap:

- They apply immediately after purchase.
- There is no held consumable slot.
- There is no pack or draft ritual around them yet.
- They are mostly safe upgrades; Gridiron lacks risky, run-warping tool effects.

### Front Office Upgrades / Voucher analog

Current Front Office Upgrades:

| Upgrade | Effect |
|---|---|
| Staff Expansion | Hire up to 6 coordinators instead of 5. |
| Headset Upgrade | +1 Audible every drive. |
| Scouting Network | Rerolls cost $1 less. |
| Deep Pockets | Raise the interest cap. |
| Bigger Front Office | War Room shows a fourth reward slot. |

Current gap:

- This layer exists, but it is small.
- It appears about 45% of War Room visits, but there is no long-term unlock tree.
- It needs more drama and more combinations with shop/pack systems.

### Traits / card enhancement analog

Current Player Traits:

- Reliable
- Explosive
- Discounted
- Clutch
- Protected
- Hot Route

Current gap:

- Traits are useful but not yet a full card-variant ecosystem.
- Potential future layers: Captain, Rookie, Veteran, Chemistry, Weatherproof,
  Specialist, Red Zone, Film Star, Gadget, Captaincy, Contract tags.

### Teams / starting deck analog

Current teams:

- Ironhawks: balanced/easier start.
- Blazers: air-raid/pass identity.
- Stormers: ground-game identity.
- Volts: mobile-QB/QB keeper identity.
- Ghosts: defensive-pressure/takeaway identity.

Current gap:

- Five starts is enough for alpha, not for long-tail play.
- There are no unlockable advanced decks, challenge teams, alternate coaches, or
  stake-specific team badges.

---

## 6. What Gridiron Already Has vs. What It Lacks

### Strong foundations already present

- A football-native "hand" grammar.
- A transparent scoring equation.
- Real deck shaping, though young.
- Joker-like passive engines.
- Planet-like concept leveling.
- Tarot-like one-use deck mutations.
- Voucher-like run rule upgrades.
- Shop economy with interest/reroll/skip tension.
- Boss pressure.
- Starting deck identities.
- Local daily and history layer.
- Balance harness proving reward choice matters.

### The biggest missing Balatro-scale ingredients

1. Player-facing rarity and discovery.
2. A much larger content library.
3. A collection/compendium that makes content feel collectible.
4. Unlock criteria that slowly add content to the pool.
5. Stakes / difficulty ladder after a season win.
6. Specialized packs and pack-opening decisions.
7. Risky "Spectral" equivalents that can mutate a run.
8. Legendary coordinators / rare build-arounds.
9. More memorable boss identities and boss intro moments.
10. Better long-run emotional identity: "I am a Volts keeper coach" or "I am a
    Ghosts pressure sicko," not just "I made a big number."

---

## 7. Scaling Roadmap Toward Balatro-Level Depth

This is a suggested sequence for discussion, not a locked spec.

### Phase 1 - Name and expose the existing analogs

Goal: make the current systems readable before adding a hundred new items.

Possible tickets:

- Add visible rarity to rewards: Common, Uncommon, Rare, Legendary.
- Add category labels: Coordinator, Game Plan, Film Tool, Front Office,
  Player Card, Training.
- Add a small "Playbook" or "Binder" screen listing discovered concepts,
  coordinators, Film Tools, traits, teams, and bosses.
- Add boss intro card before Game 2+ with name, scheme, hint, and counter lane.
- Add War Room compare mode for two pinned rewards.
- Add coordinator ordering only if the UI can explain why order matters.

Acceptance idea:

- A cold player can explain what category a reward belongs to and why it matters.
- A returning player can name their run's core plan within 10 seconds.
- No balance math changes are required.

### Phase 2 - Build the rarity/content taxonomy

Goal: give the game a content library that can scale cleanly.

Coordinator rarity proposal:

- Common: simple lane support, small flat or linear scaling.
- Uncommon: cross-lane enablers, consistency tools, boss counters.
- Rare: build-defining engines, season-long scalers, economy converters.
- Legendary: weird, high-impact rule breakers with strong identity and limits.

Example football-native Legendary coordinator directions:

- Fourth Quarter Wizard: Drive 3 plays gain massive upside, but Drives 1-2 are
  less efficient.
- No-Huddle Savant: every distinct concept in a drive raises the next play's
  Execution.
- Tape Room Oracle: first play each drive previews an extra draw/audible outcome.
- Goal-Line Tyrant: short-field/low-cost plays become finishers.
- Chaos Punt Unit: Field Goals and defense cards become a bizarre scoring lane.

Do not overfit these examples. Other models should propose better ones.

### Phase 3 - Add pack grammar to the War Room

Goal: create Balatro-style "which pack do I open?" decisions without copying
pack names.

Possible football-native pack types:

- Coordinator Clinic: choose 1 of 2-3 coordinators.
- Film Room Pack: choose 1 of 2-3 Film Tools.
- Playbook Install: choose a Game Plan level or concept pivot.
- Roster Tryout: choose a player card/free agent.
- Training Table: choose a Player Trait.
- Front Office Packet: chance at voucher-like upgrades.
- Boss Prep File: targeted counters for the next defensive scheme.

Key design question:

Should War Room sell individual rewards, packs, or a mix? Balatro's shop works
because individual Jokers, consumables, packs, vouchers, rerolls, and money all
compete for the same dollars. Gridiron should aim for that same tension in
football language.

### Phase 4 - Add stakes / league levels

Goal: give players a reason to win again with the same team.

Possible naming:

- League Level
- Schedule Grade
- Coach Tier
- Playoff Tier
- Film Difficulty
- Conference Level

Example modifiers:

- Reduced starting Funds.
- Higher reroll cost.
- One fewer starting Audible.
- Tougher Game 5 Championship target.
- Boss appears in Game 1.
- Weather penalties are stronger.
- Repeated-concept penalty is harsher.
- War Room shows fewer rewards unless upgraded.
- Injured/Protected trait interactions matter more.

Design warning:

Stakes should create new constraints, not just bigger numbers. If every stake is
"target +15%," the game becomes a spreadsheet treadmill.

### Phase 5 - Add local unlocks and collection progression

Goal: long-tail progression without backend, accounts, or permanent power creep.

Unlock types that fit the current constraints:

- Content unlocks: new coordinators, Film Tools, Front Office upgrades, teams,
  bosses, and stakes enter the pool.
- Cosmetic/status unlocks: team plaques, coach titles, daily badges.
- Challenge unlocks: win with Volts, clear a season using defense as core, win
  with no rerolls, beat a Snow Championship, win a Daily Scrimmage.
- Compendium unlocks: discovered item art/name/lore text.

Avoid:

- Permanent stat boosts.
- Account levels that make future runs easier.
- Anything requiring a server.
- Licensed NFL language or real-money framing.

### Phase 6 - Add risky "Spectral" equivalents

Goal: create wild run-warping choices that players talk about.

Football-native naming directions:

- Trick Play
- Black Box Tape
- Emergency Package
- Weather Report
- Locker Room Bet
- Chaos Install
- Broken Headset
- Midnight Film

Example effect shapes:

- Convert all catch cards to one team, but increase their costs.
- Delete your highest-value card; duplicate two lowest-cost cards.
- Set one concept to Level 3, but make its repeated-concept penalty harsher.
- Add a legendary coordinator but lose one coordinator slot.
- Turn every Field Goal into a fake-punt lane for the rest of the run.
- Make Snow guaranteed next game, but ground concepts get a huge bonus.

These should be rare, legible, and risky. They should not be mandatory.

---

## 8. Key Design Questions For Other Models

Ask other models to answer these directly:

1. Which Balatro system is most responsible for replayability: Jokers, packs,
   stakes, unlocks, or collection discovery?
2. Which of those systems should Gridiron copy structurally first, and which
   should it avoid or defer?
3. Is "Coordinators = Jokers" strong enough, or does football need a different
   build-engine metaphor?
4. Are "Game Plans = Planets" clear enough, or should concept leveling be shown
   more like a coach's playbook?
5. Should Film Tools be immediate purchases, held consumables, or pack choices?
6. What should Gridiron's Spectral/high-risk equivalent be called and do?
7. How should rarity work without making every reward screen feel like a lootbox?
8. What is the smallest meaningful stakes ladder after the first championship?
9. What unlocks add long-term motivation without permanent power creep?
10. How many coordinators / Film Tools / bosses / teams are needed before the
    game has real replay depth?
11. What should Gridiron refuse to borrow from Balatro?
12. What is the next one-day implementation slice with the highest leverage?

---

## 9. Hard Constraints For Recommendations

Other models should respect these constraints:

- Fictional football only.
- No NFL teams, players, logos, marks, schedules, or real-world league data in
  the shipped game.
- No betting, sportsbook, DFS contest, deposit, withdrawal, prize, or real-money
  language.
- No server, accounts, multiplayer, or global leaderboard.
- No direct copying of Balatro names, UI, art direction, card text, sound, store
  page framing, or trade dress.
- Keep React + Vite + TypeScript.
- Mobile-first.
- Do not recommend a framework swap.
- Preserve the deterministic scoring principle unless explicitly arguing why it
  should change.
- Any proposal that changes scoring, rewards, targets, economy, or deck math must
  include how to validate it through `npm run balance:gridiron -- 3000`.
- Keep the balance goals:
  - smart build choices should beat random choices,
  - all starting teams should remain viable,
  - no-reward runs should fall off late,
  - losses should be diagnosable, not mostly dead draws.

---

## 10. Files Worth Reading In The Repo

Core docs:

- `README.md`
- `docs/GRIDIRON_HANDOFF.md`
- `docs/PROJECT_MAP.md`
- `docs/REVIEW_BRIEF_3_QUESTIONS.md`
- `docs/REVIEW_3_CODEX_HANDOFF.md`

Engine:

- `src/lib/footballRogue.ts` - card model, concepts, scoring, bosses,
  coordinators, traits.
- `src/lib/footballRun.ts` - run state, rewards, Game Plans, Film Tools, Front
  Office Upgrades, loss diagnosis.
- `src/lib/gridironEconomy.ts` - Funds, interest, rerolls, skip economy.
- `src/lib/gridironStorage.ts` - save/resume, history, daily, preferences.
- `src/lib/feedback.ts` - haptics.

UI:

- `src/components/FootballHome.tsx`
- `src/components/FootballTeamSelect.tsx`
- `src/components/FootballSeason.tsx`
- `src/components/FootballMatch.tsx`
- `src/components/FootballReward.tsx`
- `src/components/FootballRunSummary.tsx`
- `src/components/FootballHelpModal.tsx`
- `src/components/teamIdentity.ts`
- `src/components/coachIdentity.tsx`
- `src/components/footballStyles.ts`
- `src/index.css`

Verification:

- `scripts/gridironSmoke.tsx`
- `scripts/gridironBalance.ts`

Note: `docs/GRIDIRON_HANDOFF.md` and `README.md` may contain stale roadmap lines
saying Film Tools or haptics are future work. The current source already includes
Film Tools, Front Office Upgrades, Quick Results, and haptics.

---

## 11. Copy-Paste Prompt For Other Models

Use this prompt with another model after attaching this file and, ideally, the
repo files listed above.

```text
You are a senior roguelike deckbuilder designer and systems critic. I am building
Gridiron, a fictional-football card roguelike inspired structurally by Balatro's
depth, not by its poker theme, art, text, or trade dress.

Balatro reference language I care about:
- poker strategy and recognizable hand concepts,
- real deck building and deck shaping,
- Jokers with common/uncommon/rare/legendary build-around effects,
- Tarot cards,
- Planet cards,
- Spectral/high-risk cards,
- different starting decks,
- stakes / difficulty ladder,
- vouchers,
- booster/game packs,
- poker hand leveling,
- bosses,
- unlocks,
- progression and collection discovery.

Gridiron's current translation:
- football play concepts are the "poker hands,"
- football action cards are the playing cards,
- Base x (1 + Execution) x Big Play is the scoring model,
- Play Budget replaces hands-per-round as the main resource,
- Audibles are redraw/discard pressure,
- Coordinators are the Joker analog,
- Game Plans are the Planet analog,
- Film Tools are the Tarot analog,
- Front Office Upgrades are the Voucher analog,
- War Room is the shop,
- Funds are money,
- Boss defenses are Boss Blind analogs,
- teams are starting decks,
- Daily Scrimmage/local history are the first retention layer.

Current state:
- playable 5-game season,
- 3 drives per game,
- five team starts,
- deterministic scoring,
- War Room economy,
- Player Traits,
- Film Tools,
- Front Office Upgrades,
- boss defenses/weather,
- daily seed/streak/history,
- quick results/haptics,
- loss diagnosis,
- balance harness green at 3000 seasons:
  synergy champion 53.0%, random 10.7%, no rewards 0.0%;
  all five teams viable; forced lane spread 11.1 pts, slightly high because
  defense is the strongest lane.

Hard constraints:
- fictional football only,
- no NFL or real players,
- no betting/DFS/real-money/prize language,
- no server/accounts/global leaderboard,
- no copying Balatro names/art/UI/sound/card text/trade dress,
- mobile-first React/Vite/TypeScript,
- preserve deterministic scoring unless you explicitly justify a change,
- any math/economy/scoring proposal must say how to validate it with the balance
  harness.

Task:
1. Give me an honest read on how close Gridiron is to Balatro-level systemic
   depth, using the comparison in the attached brief.
2. Identify the biggest missing layers and rank them by impact-per-hour.
3. For each Balatro system, say whether Gridiron should:
   - directly map it,
   - reinterpret it in football language,
   - defer it,
   - or refuse it.
4. Propose a football-native rarity/content taxonomy for:
   - Coordinators/Joker analogs,
   - Film Tools/Tarot analogs,
   - Game Plans/Planet analogs,
   - Front Office/Voucher analogs,
   - Boss defenses,
   - Starting teams/decks,
   - Stakes/league levels,
   - Unlocks/collection progression.
5. Give me the next 10 implementation tickets, ranked. Each ticket should include:
   - goal,
   - files likely touched,
   - acceptance criteria,
   - risk,
   - what not to touch.
6. Design a minimal stakes/unlocks system that can ship locally without accounts
   and without permanent stat power.
7. Design 5 examples each of:
   - common coordinators,
   - uncommon coordinators,
   - rare coordinators,
   - legendary coordinators,
   - Film Tools,
   - risky Spectral-style football tools,
   - Front Office upgrades,
   - boss defenses,
   - starting deck/team variants.
8. Tell me what to refuse, even if it seems tempting.

Be concrete, skeptical, and product-minded. Do not give vague advice like "add
more variety." Tell me exactly what variety, why, where it fits in the current
system, and how it would affect player understanding and balance.
```

---

## 12. Suggested First Answer Shape For Other Models

Ask for this structure if the model needs stricter formatting:

```text
Open with the single biggest missing system.

Then provide:

1. Overall diagnosis in one paragraph.
2. Balatro system parity table with scores from 0 to 3.
3. Top 5 build-first priorities.
4. Top 5 defer/refuse items.
5. A 3-phase roadmap:
   - one-day slice,
   - one-week slice,
   - one-month slice.
6. Concrete content proposals with football-native names.
7. Validation plan:
   - cold-user UX checks,
   - balance harness checks,
   - mobile layout checks.
```

---

## 13. My Current Read

If Gridiron wants to scale toward Balatro, the next step is not simply "add more
stuff." The next step is to make the existing analogs legible as a content
ecosystem:

```text
Coordinators have rarity.
Game Plans have levels and identity.
Film Tools are a recognizable consumable category.
Front Office Upgrades feel special.
Bosses are memorable opponents.
Teams unlock mastery goals.
The player can see what they have discovered.
```

After that, Gridiron can safely add volume: more coordinators, more tools, more
bosses, more team variants, more stakes, and more unlocks. Without that taxonomy,
more content will feel like a pile. With it, the game can begin to develop the
Balatro feeling: "I know the rules, but this run is asking me to break them in a
new way."
