import type { Lineup, Player, RosterSlot } from '../types';
import { ROSTER_SLOTS, SALARY_CAP } from '../types';
import { totalSalary, isValid, averageSalaryLeftPerOpenSlot, openSlotCount } from '../lib/lineupValidation';

interface Props {
  lineup: Lineup;
  onRemove: (player: Player) => void;
  onEnterContest: () => void;
}

const SLOT_LABELS: Record<RosterSlot, string> = {
  QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', TE: 'TE', FLEX: 'FLEX', DST: 'DST',
};

export default function LineupTray({ lineup, onRemove, onEnterContest }: Props) {
  const salary = totalSalary(lineup);
  const remaining = SALARY_CAP - salary;
  const valid = isValid(lineup);
  const projected = ROSTER_SLOTS.reduce((s, slot) => s + (lineup[slot]?.displayedProjection ?? 0), 0);
  const openSlots = openSlotCount(lineup);
  const avgLeft = averageSalaryLeftPerOpenSlot(lineup);

  return (
    <div style={{ background: '#111', borderTop: '1px solid #2a2a2a', padding: '8px 12px' }}>
      {/* Cap bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: '#888' }}>
          Cap: <span style={{ color: remaining < 0 ? '#e74c3c' : '#4fc3f7' }}>${salary.toLocaleString()}</span>
          <span style={{ color: '#555' }}> / $50,000</span>
        </span>
        <span style={{ color: '#888' }}>
          Proj: <span style={{ color: '#f59e0b' }}>{projected.toFixed(1)}</span>
        </span>
        <span style={{ color: avgLeft < 4500 && openSlots > 0 ? '#e74c3c' : '#888' }}>
          Avg/slot: ${Math.max(0, avgLeft).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span style={{ color: remaining < 0 ? '#e74c3c' : '#666' }}>
          ${remaining.toLocaleString()} left
        </span>
      </div>

      {/* Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
        {ROSTER_SLOTS.map((slot) => {
          const player = lineup[slot];
          return (
            <div
              key={slot}
              style={{
                background: player ? '#0d2240' : '#1a1a1a',
                border: `1px solid ${player ? '#2a6ef5' : '#2a2a2a'}`,
                borderRadius: 6,
                padding: '4px 6px',
                fontSize: 11,
                minHeight: 38,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ color: '#555', fontSize: 10 }}>{SLOT_LABELS[slot]}</div>
              {player ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#ccc', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 60 }}>
                    {player.name}
                  </span>
                  <button
                    onClick={() => onRemove(player)}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={{ color: '#333', fontSize: 10 }}>Empty</div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onEnterContest}
        disabled={!valid}
        style={{
          width: '100%',
          padding: '10px 0',
          background: valid ? '#2a6ef5' : '#1a1a1a',
          color: valid ? '#fff' : '#444',
          border: `1px solid ${valid ? '#2a6ef5' : '#2a2a2a'}`,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: valid ? 'pointer' : 'not-allowed',
          letterSpacing: 0.5,
        }}
      >
        {valid ? 'Enter Contest →' : 'Fill Your Lineup'}
      </button>
    </div>
  );
}
