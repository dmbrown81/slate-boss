import type { Lineup, ContestEntry, Slate, LineupGrades, TournamentType, BuildQualityAnalysis, OutcomeLuckAnalysis } from '../types';
import { getLineupPlayers, totalSalary } from './lineupValidation';
import { SALARY_CAP } from '../types';

function letter(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function qbComboCount(players: ReturnType<typeof getLineupPlayers>): number {
  const qb = players.find((p) => p.position === 'QB');
  if (!qb) return 0;
  return players.filter((p) => p.team === qb.team && (p.position === 'WR' || p.position === 'TE')).length;
}

function buildQuality(lineup: Lineup, tournamentType: TournamentType): BuildQualityAnalysis {
  const players = getLineupPlayers(lineup);
  const salary = totalSalary(lineup);
  const projected = players.reduce((sum, p) => sum + p.displayedProjection, 0);
  const avgOwnership = players.reduce((sum, p) => sum + p.ownership, 0) / players.length;
  const avgVolatility = players.reduce((sum, p) => sum + p.volatility, 0) / players.length;
  const avgBoom = players.reduce((sum, p) => sum + p.boomChance, 0) / players.length;
  const ceilingSum = players.reduce((sum, p) => sum + p.ceiling, 0);
  const comboCount = qbComboCount(players);
  const salaryLeft = SALARY_CAP - salary;

  const projectionScore = clamp(((projected - 108) / 34) * 100, 0, 100);
  const salaryScore = clamp(100 - Math.max(0, salaryLeft - 400) / 18, 0, 100);
  const stackScore = comboCount >= 2 ? 100 : comboCount === 1 ? 78 : tournamentType === 'double_up' ? 62 : 38;

  const isSafeContest = tournamentType === 'double_up';
  const isBigSwingContest = tournamentType === 'large_gpp' || tournamentType === 'winner_take_all';
  const riskTarget = isSafeContest ? 0.28 : isBigSwingContest ? 0.48 : 0.38;
  const riskScore = clamp(100 - Math.abs(avgVolatility - riskTarget) * 180, 0, 100);
  const leverageScore = isSafeContest
    ? clamp(100 - Math.max(0, 18 - avgOwnership) * 3, 0, 100)
    : clamp(52 + (22 - avgOwnership) * 2 + avgBoom * 45 + (ceilingSum - 175) * 0.55, 0, 100);

  const score = Math.round(
    projectionScore * (isSafeContest ? 0.38 : 0.28)
    + salaryScore * 0.18
    + stackScore * (isSafeContest ? 0.10 : 0.22)
    + riskScore * 0.16
    + leverageScore * (isSafeContest ? 0.18 : 0.16)
  );
  const grade = letter(score);

  const contestFit = isSafeContest
    ? (avgVolatility < 0.36 ? 'Good for a Safe 50/50' : 'A little risky for a Safe 50/50')
    : (comboCount > 0 ? 'Good tournament shape' : 'Needs more QB Combo upside');
  const salaryUse = salaryLeft <= 800 ? 'Strong salary use' : salaryLeft <= 2500 ? 'Playable salary use' : 'Too much salary left';
  const stackQuality = comboCount >= 2 ? 'Strong QB Combo' : comboCount === 1 ? 'Playable QB Combo' : 'No QB Combo';
  const riskProfile = isSafeContest
    ? (avgVolatility < 0.34 ? 'Steady' : 'Risky')
    : (avgBoom > 0.2 ? 'Has upside' : 'Needs more upside');

  const weakest = [
    { key: 'projection', score: projectionScore },
    { key: 'salary', score: salaryScore },
    { key: 'stack', score: stackScore },
    { key: 'risk', score: riskScore },
    { key: 'contest', score: leverageScore },
  ].sort((a, b) => a.score - b.score)[0].key;

  const lessonMap: Record<string, string> = {
    projection: 'Next time, start with a stronger projected core before chasing upside.',
    salary: 'Next time, try to spend more of the cap unless the cheap players are clearly better values.',
    stack: isSafeContest
      ? 'Next time, a simple QB Combo can add upside, but safety still matters most here.'
      : 'Next time, pair your QB with at least one WR or TE for a better tournament path.',
    risk: isSafeContest
      ? 'Next time, swap one boom-or-bust player for a steadier projection in Safe 50/50s.'
      : 'Next time, add one more ceiling play if you are trying to beat a big field.',
    contest: isSafeContest
      ? 'Next time, do not worry about being different in a Safe 50/50. Solid popular players are fine.'
      : 'Next time, mix in one lower-popularity player so your tournament lineup has a way to pass the crowd.',
  };

  const label = score >= 80 ? 'Strong build' : score >= 65 ? 'Playable build' : score >= 50 ? 'Thin build' : 'Needs work';
  const sentence = isSafeContest
    ? `${label}. This lineup was judged on projection, safety, salary use, and whether it fit a beat-half-the-field contest.`
    : `${label}. This lineup was judged on upside, QB Combo strength, salary use, and whether it had a path to pass tournament lineups.`;

  return {
    score,
    grade,
    label,
    sentence,
    contestFit,
    salaryUse,
    stackQuality,
    riskProfile,
    lesson: lessonMap[weakest],
  };
}

function outcomeLuck(players: ReturnType<typeof getLineupPlayers>, result: ContestEntry): OutcomeLuckAnalysis {
  const rows = players.map((player) => {
    const score = result.scores.find((s) => s.playerId === player.id)?.final ?? 0;
    return {
      player,
      score,
      diff: score - player.displayedProjection,
      range: Math.max(1, player.ceiling - player.floor),
    };
  });
  const totalDiff = rows.reduce((sum, row) => sum + row.diff, 0);
  const normalized = rows.reduce((sum, row) => sum + row.diff / row.range, 0) / rows.length;
  const score = Math.round(clamp(50 + normalized * 42 + totalDiff * 0.75, 0, 100));
  const label: OutcomeLuckAnalysis['label'] = score >= 66 ? 'Hot' : score <= 42 ? 'Cold' : 'Normal';
  const playersAboveProjection = rows.filter((row) => row.diff > 0).length;
  const playersBelowFloor = rows.filter((row) => row.score < row.player.floor).length;
  const biggestSwing = [...rows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
  const grade = letter(score);
  const sentence = label === 'Hot'
    ? `${playersAboveProjection} players beat projection. The results broke your way.`
    : label === 'Cold'
    ? `${playersBelowFloor} players fell below their safe range. That is bad luck, not automatically bad strategy.`
    : 'Your players landed near their expected range. This was a pretty normal sim outcome.';

  return {
    score,
    grade,
    label,
    sentence,
    playersAboveProjection,
    playersBelowFloor,
    biggestSwingPlayerId: biggestSwing?.player.id ?? null,
  };
}

export function gradeLineup(lineup: Lineup, result: ContestEntry, _slate: Slate, tournamentType: TournamentType): LineupGrades {
  const players = getLineupPlayers(lineup);
  const salary = totalSalary(lineup);
  const salaryPct = salary / SALARY_CAP;

  // Value: pts per $1k
  const totalScore = result.totalScore;
  const valueScore = (totalScore / (salary / 1000));
  const valueNorm = Math.min(100, (valueScore / 3.0) * 100);
  const valueLetter = letter(valueNorm);
  const valueSentence = valueNorm >= 80
    ? 'Squeezed every dollar out of this cap — textbook GPP construction.'
    : valueNorm >= 60
    ? 'Solid value overall, a few spots left on the table.'
    : 'Overpaid for production. Chase correlation, not brand names.';

  // Ceiling: sum of player ceilings vs a high-ceiling baseline
  const ceilingSum = players.reduce((s, p) => s + p.ceiling, 0);
  const ceilingNorm = Math.min(100, (ceilingSum / 220) * 100);
  const ceilingSentence = ceilingNorm >= 80
    ? 'Stacked ceiling — this lineup could win any given slate.'
    : ceilingNorm >= 60
    ? 'Decent upside but left some boom potential on the table.'
    : 'Too safe. In a GPP, floor matters less than ceiling.';

  // Leverage: low avg ownership + adequate ceiling
  const avgOwn = players.reduce((s, p) => s + p.ownership, 0) / players.length;
  const leverageRaw = Math.max(0, (25 - avgOwn) * 3);
  const leverageNorm = Math.min(100, leverageRaw + (ceilingNorm > 70 ? 20 : 0));
  const leverageSentence = leverageNorm >= 80
    ? 'Contrarian with upside — the recipe for a GPP score.'
    : leverageNorm >= 60
    ? 'Some ownership differentiation but still chalk-heavy.'
    : 'Too much chalk for a tournament. You need to be right AND different.';

  // Risk: volatility-weighted
  const riskScore = players.reduce((s, p) => s + p.volatility * p.boomChance, 0) / players.length;
  const riskNorm = Math.min(100, riskScore * 400);
  const riskSentence = riskNorm >= 80
    ? 'High-variance lineup — exactly what a GPP calls for.'
    : riskNorm >= 60
    ? 'Moderate risk tolerance. Balanced for cash or mid-field GPP.'
    : 'Conservative build. Better for cash games than GPPs.';

  // Salary efficiency: penalize wasted cap
  const wastedCap = SALARY_CAP - salary;
  const salaryNorm = Math.max(0, 100 - (wastedCap / 500) * 10);
  const salaryPct100 = salaryPct * 100;
  const salaryEfficiencySentence = salaryPct100 >= 98
    ? 'Nearly perfect cap usage — every dollar allocated.'
    : salaryPct100 >= 94
    ? `$${wastedCap} left on the table — close but watch for savings on punts.`
    : `$${wastedCap} unused. That's projections left untouched.`;

  return {
    buildQuality: buildQuality(lineup, tournamentType),
    outcomeLuck: outcomeLuck(players, result),
    value: valueLetter,
    valueSentence,
    ceiling: letter(ceilingNorm),
    ceilingSentence,
    leverage: letter(leverageNorm),
    leverageSentence,
    risk: letter(riskNorm),
    riskSentence,
    salaryEfficiency: letter(salaryNorm),
    salaryEfficiencySentence,
  };
}
