import type { Lineup, Player } from '../types';
import { getLineupPlayers } from '../lib/lineupValidation';

interface Props {
  lineup: Lineup;
  players: Player[];
  selectedIds: Set<string>;
  onAdd: (player: Player) => void;
  onSelectPlayer: (player: Player) => void;
}

export default function StackingTool({ lineup, players, selectedIds, onAdd, onSelectPlayer }: Props) {
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
    ? 'Pick a QB to unlock stack ideas'
    : stackScore >= 3
      ? 'Strong game stack'
      : stackScore >= 2
        ? 'Playable stack'
        : 'Add correlation';

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
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Stack Builder</div>
          <div style={{ color: '#666', fontSize: 11 }}>
            {qb ? `${qb.team} vs ${qb.opponent} · QB ${qb.name}` : 'QB plus teammate, optional opponent bring-back'}
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
            <MiniMetric label="Same-team" value={`${passCatchers.length}`} />
            <MiniMetric label="Bring-backs" value={`${bringBacks.length}`} />
          </div>

          <SuggestionRow title="QB stack: WR" players={sameTeamWrTargets} onAdd={onAdd} onSelectPlayer={onSelectPlayer} />
          <SuggestionRow title="QB stack: TE" players={sameTeamTeTargets} onAdd={onAdd} onSelectPlayer={onSelectPlayer} />
          <SuggestionRow title="Bring it back" players={bringBackTargets} onAdd={onAdd} onSelectPlayer={onSelectPlayer} />
        </>
      ) : (
        <div style={{ color: '#777', fontSize: 12 }}>
          Start with a QB. Then stack one of his WR/TE teammates and consider one opposing skill player for shootout leverage.
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
              {player.team} · {player.displayedProjection.toFixed(1)} proj · {Math.round(player.boomChance * 100)}% boom
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
