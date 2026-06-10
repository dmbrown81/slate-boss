import type { Player } from '../types';

interface Props {
  player: Player | null;
  onClose: () => void;
}

const archetypeLabel = (value: string) => value
  .split('_')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join(' ');

export default function PlayerDetailModal({ player, onClose }: Props) {
  if (!player) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '86vh',
          overflow: 'auto',
          background: '#101010',
          border: '1px solid #2a2a2a',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          padding: 14,
          boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>{player.name}</div>
            <div style={{ color: '#777', fontSize: 12 }}>
              {player.position} · {player.team} vs {player.opponent} · {archetypeLabel(player.archetype)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #333',
              background: '#181818',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 18,
            }}
            aria-label="Close player details"
          >
            x
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
          <Stat label="Proj" value={player.displayedProjection.toFixed(1)} accent="#4fc3f7" />
          <Stat label="Avg" value={player.seasonStats.games ? player.seasonStats.avgPoints.toFixed(1) : 'New'} />
          <Stat label="High" value={player.seasonStats.highScore.toFixed(1)} />
          <Stat label="Own" value={`${player.ownership.toFixed(1)}%`} accent="#f59e0b" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
          <Stat label="Usage" value={`${player.seasonStats.avgUsage}%`} />
          <Stat label="Consistent" value={`${player.seasonStats.consistency}%`} />
          <Stat label="Boom" value={`${Math.round(player.boomChance * 100)}%`} />
        </div>

        <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>
          Recent games {player.seasonStats.games > 0 ? `· ${player.seasonStats.games} played` : ''}
        </div>
        {player.recentGames.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {player.recentGames.map((game) => (
            <div
              key={game.week}
              style={{
                display: 'grid',
                gridTemplateColumns: '42px 48px 48px 1fr',
                gap: 8,
                alignItems: 'center',
                background: '#171717',
                border: '1px solid #242424',
                borderRadius: 6,
                padding: '7px 8px',
                fontSize: 12,
              }}
            >
              <span style={{ color: '#666' }}>W{game.week}</span>
              <span style={{ color: '#888' }}>vs {game.opponent}</span>
              <span style={{ color: '#4fc3f7', fontWeight: 700 }}>{game.points.toFixed(1)}</span>
              <span style={{ color: '#aaa' }}>{game.usage}% · {game.note}</span>
            </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#171717', border: '1px solid #242424', borderRadius: 6, padding: 10, color: '#777', fontSize: 12 }}>
            No recent game sample yet. This is Week 1, so you only have projection, role, and salary to work from.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = '#ddd' }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: '#171717', border: '1px solid #242424', borderRadius: 6, padding: '7px 6px' }}>
      <div style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ color: accent, fontSize: 14, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
