import type { Achievement, ContestResult, Lineup, RunSummary, UnlockReward, UserProfile } from '../types';
import { remainingSalary } from './lineupValidation';

export const UNLOCKS: UnlockReward[] = [
  { id: 'u_lucky_refund', name: 'Lucky Refund', description: 'A future run boon: occasional entry-fee refund after a brutal bubble miss.', kind: 'boon' },
  { id: 'u_blue_felt', name: 'Blue Felt Theme', description: 'Cosmetic table skin for the lineup builder.', kind: 'cosmetic' },
  { id: 'u_cash_badge', name: 'Cash Game Badge', description: 'Profile badge for steady double-up grinders.', kind: 'cosmetic' },
  { id: 'u_gpp_badge', name: 'GPP Badge', description: 'Profile badge for tournament hunters.', kind: 'cosmetic' },
  { id: 'u_extra_scout', name: 'Extra Scout Peek', description: 'A future boon: reveal one more opponent tendency before lock.', kind: 'boon' },
  { id: 'u_salary_coupon', name: 'Salary Coupon', description: 'A future boon: one small career fee discount per run.', kind: 'boon' },
  { id: 'u_stack_meter', name: 'Stack Meter+', description: 'Enhanced stack feedback for bring-backs and double stacks.', kind: 'mode' },
  { id: 'u_hot_hand', name: 'Hot Hand Marker', description: 'Cosmetic highlight for players on form streaks.', kind: 'cosmetic' },
  { id: 'u_bankroll_shield', name: 'Bankroll Shield', description: 'A future boon: soften one early-career bust.', kind: 'boon' },
  { id: 'u_value_hunter_title', name: 'Title: Value Hunter', description: 'Show off efficient lineup builds.', kind: 'title' },
  { id: 'u_leverage_lord_title', name: 'Title: Leverage Scout', description: 'Show off contrarian tournament instincts.', kind: 'title' },
  { id: 'u_bubble_saver', name: 'Bubble Saver', description: 'A future boon: tiny XP bonus on near misses.', kind: 'boon' },
  { id: 'u_late_swap_badge', name: 'News Hound Badge', description: 'Cosmetic badge for reacting to slate news.', kind: 'cosmetic' },
  { id: 'u_deep_gpp', name: 'Deep GPP License', description: 'Cosmetic unlock for advanced tournament play.', kind: 'mode' },
  { id: 'u_double_up_plus', name: 'Double-Up Plus', description: 'A future boon: small career XP multiplier on cash-game wins.', kind: 'boon' },
  { id: 'u_showdown_gold', name: 'Gold Sweat Card', description: 'Cosmetic gold frame on winning result cards.', kind: 'cosmetic' },
  { id: 'u_punt_master', name: 'Punt Master Tag', description: 'Profile tag for making cheap plays work.', kind: 'title' },
  { id: 'u_ceiling_chaser', name: 'Ceiling Chaser Tag', description: 'Profile tag for big-boom builds.', kind: 'title' },
  { id: 'u_floor_general', name: 'Floor General Tag', description: 'Profile tag for safe, steady lineups.', kind: 'title' },
  { id: 'u_regret_report', name: 'Regret Report+', description: 'Future expanded result notes for the one that got away.', kind: 'mode' },
  { id: 'u_run_insurance', name: 'Run Insurance', description: 'A future boon: one tiny late-run bankroll cushion.', kind: 'boon' },
  { id: 'u_shark_table', name: 'Shark Table Skin', description: 'Cosmetic dark table skin for high-tier runs.', kind: 'cosmetic' },
  { id: 'u_completionist_badge', name: 'Completionist Badge', description: 'Profile badge for achievement collectors.', kind: 'cosmetic' },
  { id: 'u_slate_boss_title', name: 'Title: Slate Boss', description: 'The flex title. You earned it.', kind: 'title' },
  { id: 'u_mystery_booster', name: 'Mystery Booster', description: 'Reserved for a future goofy run modifier.', kind: 'boon' },
];

type AchievementRule = (ctx: AchievementContext) => boolean;
type AchievementDef = Achievement & { rule: AchievementRule };

interface AchievementContext {
  profileBefore: UserProfile;
  profileAfter: UserProfile;
  result: ContestResult;
  lineup: Lineup;
  isCareer: boolean;
  runJustEnded: RunSummary | null;
}

const rarityPoints = { bronze: 5, silver: 10, gold: 20, diamond: 40 } as const;

function make(id: string, name: string, description: string, category: Achievement['category'], rarity: Achievement['rarity'], rule: AchievementRule): AchievementDef {
  return { id, name, description, category, rarity, points: rarityPoints[rarity], rule };
}

function allPlayers(result: ContestResult) {
  return result.userEntry.lineupPlayers;
}

function scoreFor(result: ContestResult, playerId: string): number {
  return result.userEntry.scores.find((s) => s.playerId === playerId)?.final ?? 0;
}

function positionHighScore(ctx: AchievementContext, pos: string, threshold: number) {
  return allPlayers(ctx.result).some((p) => p.position === pos && scoreFor(ctx.result, p.id) >= threshold);
}

function sameTeamPassCatchers(result: ContestResult) {
  const qb = result.userEntry.lineupPlayers.find((p) => p.position === 'QB');
  if (!qb) return 0;
  return result.userEntry.lineupPlayers.filter((p) => p.team === qb.team && (p.position === 'WR' || p.position === 'TE')).length;
}

function bringBacks(result: ContestResult) {
  const qb = result.userEntry.lineupPlayers.find((p) => p.position === 'QB');
  if (!qb) return 0;
  return result.userEntry.lineupPlayers.filter((p) => p.team === qb.opponent && p.position !== 'DST').length;
}

function avgOwnership(result: ContestResult) {
  const players = result.userEntry.lineupPlayers;
  return players.reduce((sum, p) => sum + p.ownership, 0) / players.length;
}

const achievements: AchievementDef[] = [
  make('first_entry', 'Lock Button Found', 'Enter your first contest.', 'starter', 'bronze', (c) => c.profileAfter.totalContestsPlayed >= 1),
  make('first_cash', 'First Green Screen', 'Cash in any contest.', 'starter', 'bronze', (c) => c.profileAfter.totalCashed >= 1),
  make('first_win', 'Ship It', 'Finish 1st in any contest.', 'contest', 'diamond', (c) => c.result.userRank === 1),
  make('first_career', 'New Season', 'Start and play a career contest.', 'career', 'bronze', (c) => c.isCareer),
  make('first_gpp_cash', 'Tournament Ticket', 'Cash in a 100-Man GPP.', 'contest', 'bronze', (c) => c.result.tournament.key === 'mini_gpp' && c.result.payout > 0),
  make('first_double_cash', 'Half The Field Behind You', 'Cash in a Double-Up.', 'contest', 'bronze', (c) => c.result.tournament.key === 'double_up' && c.result.payout > 0),
];

[
  [3, 'bronze'], [5, 'bronze'], [10, 'silver'], [25, 'silver'], [50, 'gold'], [100, 'gold'], [250, 'diamond'],
].forEach(([count, rarity]) => {
  achievements.push(make(`play_${count}`, `${count} Contests`, `Play ${count} total contests.`, 'starter', rarity as Achievement['rarity'], (c) => c.profileAfter.totalContestsPlayed >= Number(count)));
});

[
  [3, 'bronze'], [5, 'silver'], [10, 'silver'], [25, 'gold'], [50, 'gold'], [100, 'diamond'],
].forEach(([count, rarity]) => {
  achievements.push(make(`cash_${count}`, `${count} Cashes`, `Cash ${count} total times.`, 'contest', rarity as Achievement['rarity'], (c) => c.profileAfter.totalCashed >= Number(count)));
});

[
  [50, 'Top Half'], [25, 'Top Quarter'], [10, 'Top Ten'], [5, 'Final Table'], [3, 'Podium'], [1, 'Champion'],
].forEach(([rank, label]) => {
  achievements.push(make(`rank_${rank}`, String(label), `Finish rank ${rank} or better.`, 'contest', Number(rank) <= 3 ? 'gold' : 'silver', (c) => c.result.userRank <= Number(rank)));
});

[
  [100, 'bronze'], [120, 'bronze'], [140, 'silver'], [160, 'silver'], [180, 'gold'], [200, 'diamond'],
].forEach(([score, rarity]) => {
  achievements.push(make(`score_${score}`, `${score}+ Points`, `Score at least ${score} fantasy points.`, 'sweat', rarity as Achievement['rarity'], (c) => c.result.userScore >= Number(score)));
});

[
  [2, 'bronze'], [5, 'bronze'], [10, 'silver'], [20, 'silver'], [50, 'gold'], [100, 'diamond'],
].forEach(([payout, rarity]) => {
  achievements.push(make(`payout_${payout}`, `$${payout}+ Payout`, `Win at least $${payout} in one contest.`, 'contest', rarity as Achievement['rarity'], (c) => c.result.payout >= Number(payout)));
});

[
  ['mini_gpp', '100-Man GPP'], ['large_gpp', '500-Man GPP'], ['double_up', 'Double-Up'], ['winner_take_all', 'Winner Take All'],
].forEach(([key, label]) => {
  achievements.push(make(`play_${key}`, `${label} Entry`, `Play a ${label}.`, 'contest', 'bronze', (c) => c.result.tournament.key === key));
  achievements.push(make(`cash_${key}`, `${label} Cash`, `Cash in a ${label}.`, 'contest', 'silver', (c) => c.result.tournament.key === key && c.result.payout > 0));
  achievements.push(make(`win_${key}`, `${label} Winner`, `Win a ${label}.`, 'contest', 'diamond', (c) => c.result.tournament.key === key && c.result.userRank === 1));
});

[
  ['value', 'Value A+', 'Earn an A+ value grade.'],
  ['ceiling', 'Ceiling A+', 'Earn an A+ ceiling grade.'],
  ['leverage', 'Leverage A+', 'Earn an A+ leverage grade.'],
  ['risk', 'Risk A+', 'Earn an A+ risk grade.'],
  ['salaryEfficiency', 'Cap Wizard', 'Earn an A+ salary efficiency grade.'],
].forEach(([key, name, desc]) => {
  achievements.push(make(`grade_${key}`, name, desc, 'lineup', 'gold', (c) => c.result.grades[key as keyof typeof c.result.grades] === 'A+'));
});

achievements.push(
  make('single_stack', 'Single Stack', 'Use a QB with one same-team WR/TE.', 'lineup', 'bronze', (c) => sameTeamPassCatchers(c.result) >= 1),
  make('double_stack', 'Double Stack', 'Use a QB with two same-team WR/TE players.', 'lineup', 'silver', (c) => sameTeamPassCatchers(c.result) >= 2),
  make('bring_back', 'Bring It Back', 'Use an opponent skill player with your QB stack.', 'lineup', 'silver', (c) => bringBacks(c.result) >= 1),
  make('game_stack', 'Game Stack', 'Roster a QB stack plus a bring-back.', 'lineup', 'gold', (c) => sameTeamPassCatchers(c.result) >= 1 && bringBacks(c.result) >= 1),
  make('skinny_stack_win', 'Skinny Stack Smash', 'Cash with exactly one QB stack partner.', 'lineup', 'silver', (c) => c.result.payout > 0 && sameTeamPassCatchers(c.result) === 1),
  make('double_stack_cash', 'Double Stack Cash', 'Cash with a double stack.', 'lineup', 'gold', (c) => c.result.payout > 0 && sameTeamPassCatchers(c.result) >= 2),
  make('chalky_cash', 'Chalk Eater', 'Cash with average ownership of 25% or higher.', 'lineup', 'silver', (c) => c.result.payout > 0 && avgOwnership(c.result) >= 25),
  make('contrarian_cash', 'Leverage Hit', 'Cash with average ownership under 15%.', 'lineup', 'gold', (c) => c.result.payout > 0 && avgOwnership(c.result) < 15),
  make('mega_contrarian', 'Nobody Had That', 'Score 130+ with average ownership under 12%.', 'lineup', 'diamond', (c) => c.result.userScore >= 130 && avgOwnership(c.result) < 12),
  make('cap_exactish', 'Spent It All', 'Leave $500 or less in salary.', 'lineup', 'bronze', (c) => remainingSalary(c.lineup) <= 500),
  make('cap_zero', 'No Crumbs', 'Use the entire salary cap.', 'lineup', 'gold', (c) => remainingSalary(c.lineup) === 0),
  make('left_money_cash', 'Leave It And Win', 'Cash while leaving $2,000 or more unused.', 'lineup', 'gold', (c) => c.result.payout > 0 && remainingSalary(c.lineup) >= 2000),
  make('all_players_ten', 'No Duds', 'Every player scores at least 10 points.', 'sweat', 'gold', (c) => c.result.userEntry.scores.every((s) => s.final >= 10)),
  make('three_booms', 'Three Fire Slate', 'Hit three boom games in one lineup.', 'sweat', 'gold', (c) => c.result.userEntry.scores.filter((s) => s.boomHit).length >= 3),
  make('five_booms', 'Slate Detonator', 'Hit five boom games in one lineup.', 'sweat', 'diamond', (c) => c.result.userEntry.scores.filter((s) => s.boomHit).length >= 5),
);

[
  ['QB', 28, 'QB Spike'], ['QB', 35, 'QB Nuke'],
  ['RB', 22, 'Bellcow Hit'], ['RB', 30, 'RB Slate Breaker'],
  ['WR', 25, 'Wideout Hit'], ['WR', 35, 'WR Nuclear'],
  ['TE', 18, 'Tight End Tax Paid'], ['TE', 25, 'TE Breaker'],
  ['DST', 15, 'Defense Did It'], ['DST', 22, 'DST Ceiling Game'],
].forEach(([pos, score, name]) => {
  achievements.push(make(`pos_${pos}_${score}`, String(name), `Get ${score}+ points from a ${pos}.`, 'sweat', Number(score) >= 30 ? 'gold' : 'silver', (c) => positionHighScore(c, String(pos), Number(score))));
});

[
  ['scout', 'Scout Cash'], ['anchor_defense', 'Anchor Cash'], ['correlated', 'Correlation Cash'],
].forEach(([mod, name]) => {
  achievements.push(make(`modifier_${mod}`, String(name), `Cash in career with ${name.replace(' Cash', '')}.`, 'career', 'silver', (c) => c.isCareer && c.profileBefore.run.equippedModifier === mod && c.result.payout > 0));
});

achievements.push(
  make('career_complete', 'Finish A Run', 'Complete all 10 slates in a career run.', 'career', 'gold', (c) => c.runJustEnded?.endReason === 'completed'),
  make('career_bust', 'Tuition Paid', 'Bust a career run. It happens.', 'career', 'bronze', (c) => c.runJustEnded?.endReason === 'bust'),
  make('career_profit', 'Profitable Run', 'End a career run above the $15 starting bankroll.', 'career', 'gold', (c) => Boolean(c.runJustEnded && c.runJustEnded.finalBankroll > 15)),
  make('career_double', 'Double The Roll', 'Reach a $30 career bankroll.', 'career', 'gold', (c) => c.profileAfter.run.peakBankroll >= 30 || Boolean(c.runJustEnded && c.runJustEnded.peakBankroll >= 30)),
  make('career_tier2', 'Move Up Stakes', 'Reach the $5 tier in career mode.', 'career', 'gold', (c) => c.profileAfter.run.tier >= 2 || c.profileBefore.run.tier >= 2),
  make('career_cash_5', 'Run Heater', 'Cash five times in a single run.', 'career', 'gold', (c) => c.profileAfter.run.slateCashed >= 5 || Boolean(c.runJustEnded && c.runJustEnded.totalCashed >= 5)),
  make('career_perfect_cash', 'Green Season', 'Cash every slate in a completed run.', 'career', 'diamond', (c) => Boolean(c.runJustEnded && c.runJustEnded.slatesPlayed >= 10 && c.runJustEnded.totalCashed >= 10)),
);

[
  [10, 'Achievement Curious'], [25, 'Achievement Hunter'], [50, 'Checklist Grinder'], [75, 'Completionist Mode'], [100, 'Slate Boss Collector'],
].forEach(([count, name]) => {
  achievements.push(make(`collect_${count}`, String(name), `Unlock ${count} achievements.`, 'collection', Number(count) >= 75 ? 'diamond' : 'gold', (c) => c.profileAfter.achievementIds.length >= Number(count)));
});

// Pad to exactly 100 with score/finish chase goals that are still meaningful.
[
  [110, 'Warm Score'], [115, 'Solid Score'], [125, 'Real Sweat'], [135, 'Live Lineup'], [145, 'Top-End Build'],
  [150, 'Hammer Build'], [155, 'Closing Speed'], [165, 'Huge Number'], [170, 'Monster Slate'], [190, 'Almost Mythic'],
].forEach(([score, name]) => {
  achievements.push(make(`score_extra_${score}`, String(name), `Score ${score}+ points.`, 'sweat', Number(score) >= 165 ? 'gold' : 'silver', (c) => c.result.userScore >= Number(score)));
});

export const ACHIEVEMENTS: Achievement[] = achievements.slice(0, 100).map(({ rule: _rule, ...achievement }, index) => ({
  ...achievement,
  unlockId: index % 4 === 3 ? UNLOCKS[Math.floor(index / 4)]?.id : achievement.unlockId,
}));

const achievementDefs: AchievementDef[] = achievements.slice(0, 100).map((achievement, index) => ({
  ...achievement,
  unlockId: index % 4 === 3 ? UNLOCKS[Math.floor(index / 4)]?.id : achievement.unlockId,
}));

export function getUnlock(id: string): UnlockReward | undefined {
  return UNLOCKS.find((unlock) => unlock.id === id);
}

export function evaluateAchievements(ctx: AchievementContext): { newAchievements: Achievement[]; newUnlocks: UnlockReward[] } {
  const owned = new Set(ctx.profileBefore.achievementIds ?? []);
  const newAchievements = achievementDefs
    .filter((achievement) => !owned.has(achievement.id) && achievement.rule(ctx))
    .map(({ rule: _rule, ...achievement }) => achievement);

  const unlockIdsBefore = new Set(ctx.profileBefore.unlockIds ?? []);
  const newUnlocks = newAchievements
    .map((achievement) => achievement.unlockId ? getUnlock(achievement.unlockId) : undefined)
    .filter((unlock): unlock is UnlockReward => Boolean(unlock && !unlockIdsBefore.has(unlock.id)));

  return { newAchievements, newUnlocks };
}
