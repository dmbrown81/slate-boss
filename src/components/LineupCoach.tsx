import type { Lineup, TournamentType } from '../types';
import { averageSalaryLeftPerOpenSlot, getLineupPlayers, openSlotCount, remainingSalary } from '../lib/lineupValidation';

interface Props {
  lineup: Lineup;
  tournamentType: TournamentType;
}

export default function LineupCoach({ lineup, tournamentType }: Props) {
  const players = getLineupPlayers(lineup);
  const qb = lineup.QB;
  const dst = lineup.DST;
  const openSlots = openSlotCount(lineup);
  const avgLeft = averageSalaryLeftPerOpenSlot(lineup);
  const remaining = remainingSalary(lineup);

  const passCatchers = qb
    ? players.filter((p) => p.team === qb.team && (p.position === 'WR' || p.position === 'TE'))
    : [];
  const bringBacks = qb
    ? players.filter((p) => p.team === qb.opponent && p.position !== 'DST')
    : [];
  const dstConflict = dst
    ? players.find((p) => p.position !== 'DST' && p.team === dst.opponent)
    : null;

  const notes: Array<{ label: string; tone: 'good' | 'warn' | 'neutral' }> = [];

  if (players.length === 0) {
    // No notes until lineup has been started — avoids noise on empty state
    return null;
  }

  if (!qb) {
    notes.push({ label: 'Start with a QB. Then look for one of his WR or TE teammates.', tone: 'neutral' });
  } else if (passCatchers.length === 0) {
    notes.push({ label: 'Your QB has no teammate yet. A WR or TE teammate creates a QB Combo.', tone: 'warn' });
  } else if (passCatchers.length >= 2) {
    notes.push({ label: 'Double QB Combo online — strong upside for tournaments.', tone: 'good' });
  } else {
    notes.push({ label: 'QB Combo online. Nice way to add connected upside.', tone: 'good' });
  }

  if (qb && (tournamentType === 'mini_gpp' || tournamentType === 'large_gpp' || tournamentType === 'winner_take_all') && bringBacks.length === 0 && players.length >= 4) {
    notes.push({ label: 'No bring-back yet. One opposing skill player can add shootout upside.', tone: 'neutral' });
  }

  if (dstConflict) {
    notes.push({ label: `${dst?.team} D faces ${dstConflict.name}. That can cap your upside.`, tone: 'warn' });
  }

  // Salary squeeze — use $3,800 as the floor (cheapest viable DST/TE slots)
  if (openSlots > 0 && avgLeft < 3800) {
    notes.push({ label: `Salary squeeze: $${Math.max(0, avgLeft).toLocaleString(undefined, { maximumFractionDigits: 0 })} per open slot. Check punt options.`, tone: 'warn' });
  } else if (openSlots <= 2 && remaining > 2500) {
    notes.push({ label: `$${remaining.toLocaleString()} unused — check if there's an upgrade worth it.`, tone: 'neutral' });
  }

  if (tournamentType === 'double_up' && passCatchers.length >= 2) {
    notes.push({ label: '50/50: floor matters more than ceiling. Consider de-risking one boom-bust spot.', tone: 'neutral' });
  }

  if (!notes.length) return null;

  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
      {notes.slice(0, 3).map((note) => (
        <div
          key={note.label}
          style={{
            flex: '0 0 210px',
            background: note.tone === 'good' ? '#071d14' : note.tone === 'warn' ? '#1f1208' : '#111',
            border: `1px solid ${note.tone === 'good' ? '#1f6f47' : note.tone === 'warn' ? '#6f3a10' : '#242424'}`,
            borderRadius: 7,
            padding: '7px 9px',
            color: note.tone === 'good' ? '#8ee0b3' : note.tone === 'warn' ? '#f5a34c' : '#aaa',
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          {note.label}
        </div>
      ))}
    </div>
  );
}
