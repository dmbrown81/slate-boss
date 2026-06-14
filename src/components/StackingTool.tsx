import type { Lineup, Player } from '../types';
import { getLineupPlayers } from '../lib/lineupValidation';

interface Props {
  lineup: Lineup;
  players: Player[];
  selectedIds: Set<string>;
  onAdd: (player: Player) => void;
  onSelectPlayer: (player: Player) => void;
  stackMeterPlus?: boolean;
}

export default function StackingTool({ lineup, players, selectedIds, onAdd, onSelectPlayer, stackMeterPlus = false }: Props) {
  const selected = getLineupPlayers(lineup);
  const qb = lineup.QB;
  const passCatchers = qb
    ? selected.filter((p) => p.team === qb.team && (p.position === 'WR' || p.position === 'TE'))
    : [];
  const bringBacks = qb
    ? selected.filter((p) => p.team === qb.opponent && p.position !== 'DST')
    : [];

  const stackScore = qb ? passCatchers.length + Math.min(1, bringBacks.length) : 0;
  const stackLabel = !qb
    ? 'Pick a QB to see combos'
    : stackScore >= 3
      ? 'Strong game combo'
      : stackScore >= 2
        ? 'Playable QB Combo'
        : 'Add a teammate';
  const meterRead = !qb
    ? {
        label: 'No QB yet',
        detail: 'Pick a quarterback first, then pair him with a WR or TE from his team.',
        tone: '#666',
      }
    : passCatchers.length >= 2 && bringBacks.length >= 1
      ? {
          label: 'Premium shootout stack',
          detail: `${qb.name} has multiple teammates plus an opponent bring-back. This is the highest-upside shape, but it can be more fragile.`,
          tone: '#8ee0b3',
        }
      : passCatchers.length >= 1 && bringBacks.length >= 1
        ? {
            label: 'Strong connected stack',
            detail: `You have a ${qb.team} pass-catcher and an opponent bring-back. If this game shoots out, several picks can rise together.`,
            tone: '#4fc3f7',
          }
        : passCatchers.length >= 1
          ? {
              label: 'Playable QB combo',
              detail: `You paired ${qb.name} with a teammate. Add an opponent pick if you want a bigger game-story bet.`,
              tone: '#f59e0b',
            }
          : {
              label: 'Missing QB combo',
              detail: `Add a ${qb.team} WR or TE so your QB points can connect with another lineup slot.`,
              tone: '#f5a34c',
            };

  const sameTeamWrTargets = qb
    ? players
        .filter((p) => !selectedIds.has(p.id) && p.team === qb.team && p.position === 'WR')
        .sort((a, b) => b.displayedProjection - a.displayedProjection)
        .slice(0, 2)
    : [];

  const sameTeamTeTargets = qb
    ? players
        .filter((p) => !selectedIds.has(p.id) && p.team === qb.team && p.position === 'TE')
        .sort((a, b) => b.displayedProjection - a.displayedProjection)
        .slice(0, 2)
    : [];

  const bringBackTargets = qb
    ? players
        .filter((p) => !selectedIds.has(p.id) && p.team === qb.opponent && p.position !== 'QB' && p.position !== 'DST')
        .sort((a, b) => b.ceiling - a.ceiling)
        .slice(0, 3)
    : [];

  return (
    <div style={{ background: '#101010', border: '1px solid #242424', borderRadius: 8, padding: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>QB Combo Builder</div>
          <div style={{ color: '#666', fontSize: 11 }}>
            {qb ? `${qb.team} vs ${qb.opponent} · QB ${qb.name}` : 'Pair your QB with a teammate'}
          </div>
        </div>
        <div style={{
          border: '1px solid #333',
          borderRadius: 999,
          padding: '3px 8px',
          color: stackScore >= 2 ? '#4fc3f7' : '#f59e0b',
          fontSize: 11,
          whiteSpace: 'nowrap',
        }}>
          {stackLabel}
        </div>
      </div>

      {qb ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <MiniMetric label="Teammates" value={`${passCatchers.length}`} />
            <MiniMetric label="Opponent picks" value={`${bringBacks.length}`} />
          </div>
          {stackMeterPlus && (
            <div style={{
              background: '#0d1a2a',
              border: `1px solid ${meterRead.tone}`,
              borderRadius: 7,
              padding: '8px 9px',
              marginBottom: 8,
              color: '#cfe0ff',
              fontSize: 11,
              lineHeight: 1.4,
            }}>
              <div style={{ color: '#fff', fontWeight: 900, marginBottom: 2 }}>Stack Meter+: {meterRead.label}</div>
              {meterRead.detail}
            </div>
          )}

          <SuggestionRow title="QB Combo: WR teammate" players={sameTeamWrTargets} onAdd={onAdd} onSelectPlayer={onSelectPlayer} />
          <SuggestionRow title="QB Combo: TE teammate" players={sameTeamTeTargets} onAdd={onAdd} onSelectPlayer={onSelectPlayer} />
          <SuggestionRow title="Opponent pick for shootouts" players={bringBackTargets} onAdd={onAdd} onSelectPlayer={onSelectPlayer} />
        </>
      ) : (
        <div style={{ color: '#777', fontSize: 12 }}>
          Start with a QB. Then add one of his WR or TE teammates if you want connected upside.
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#171717', border: '1px solid #252525', borderRadius: 6, padding: '6px 8px' }}>
      <div style={{ color: '#666', fontSize: 10 }}>{label}</div>
      <div style={{ color: '#ddd', fontWeight: 800, fontSize: 14 }}>{value}</div>
    </div>
  );
}

function SuggestionRow({
  title,
  players,
  onAdd,
  onSelectPlayer,
}: {
  title: string;
  players: Player[];
  onAdd: (player: Player) => void;
  onSelectPlayer: (player: Player) => void;
}) {
  if (!players.length) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelectPlayer(player)}
            style={{
              flex: '0 0 138px',
              background: '#171717',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              padding: 7,
              color: '#ddd',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
              <span style={{ color: '#666', fontSize: 10 }}>{player.position}</span>
            </div>
            <div style={{ color: '#777', fontSize: 10, marginBottom: 6 }}>
              {player.team} · {player.displayedProjection.toFixed(1)} projected
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAdd(player);
              }}
              style={{
                background: '#2a6ef5',
                border: 'none',
                color: '#fff',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
