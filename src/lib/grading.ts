import type { Lineup, ContestEntry, Slate, LineupGrades } from '../types';
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

export function gradeLineup(lineup: Lineup, result: ContestEntry, _slate: Slate): LineupGrades {
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
