import React, { useState, useMemo } from 'react';
import type { Player, Position } from '../types';

type SortKey = 'salary' | 'displayedProjection' | 'value' | 'floor' | 'ceiling' | 'ownership' | 'boomChance' | 'volatility';

interface Props {
  players: Player[];
  onAdd: (player: Player) => void;
  onRemove: (player: Player) => void;
  onSelectPlayer: (player: Player) => void;
  selectedIds: Set<string>;
  remainingSalary: number;
}

const POSITIONS: Array<Position | 'ALL'> = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DST'];

const formIcon = (f: Player['form']) => f === 'hot' ? '🔥' : f === 'cold' ? '🧊' : '';

export default function PlayerTable({ players, onAdd, onRemove, onSelectPlayer, selectedIds, remainingSalary }: Props) {
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('displayedProjection');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    let list = players;
    if (posFilter !== 'ALL') list = list.filter((p) => p.position === posFilter);
    if (search) {
      const term = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(term)
        || p.team.toLowerCase().includes(term)
        || p.opponent.toLowerCase().includes(term)
      );
    }

    list = [...list].sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case 'value': va = a.displayedProjection / (a.salary / 1000); vb = b.displayedProjection / (b.salary / 1000); break;
        default: va = a[sortKey] as number; vb = b[sortKey] as number;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return list;
  }, [players, posFilter, sortKey, sortDir, search]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortMark = (key: SortKey) => sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : '';

  const sortableHeader = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <th style={{ padding: '4px 6px', fontWeight: 400, textAlign: align }}>
      <button
        onClick={() => handleSort(key)}
        style={{
          background: 'transparent',
          border: 'none',
          color: sortKey === key ? '#4fc3f7' : '#777',
          fontSize: 11,
          cursor: 'pointer',
          padding: 0,
          fontWeight: sortKey === key ? 800 : 500,
          whiteSpace: 'nowrap',
        }}
      >
        {label} {sortMark(key)}
      </button>
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Search + position filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          style={{
            background: '#1a1a1a', border: '1px solid #333', color: '#fff',
            padding: '4px 8px', borderRadius: 6, fontSize: 13, width: 120,
          }}
        />
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            style={{
              background: posFilter === pos ? '#2a6ef5' : '#1e1e1e',
              border: '1px solid #333',
              color: posFilter === pos ? '#fff' : '#aaa',
              padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', fontSize: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 660 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666', textAlign: 'left' }}>
              <th style={{ padding: '4px 6px', fontWeight: 400 }}>Player</th>
              <th style={{ padding: '4px 6px', fontWeight: 400 }}>Pos</th>
              <th style={{ padding: '4px 6px', fontWeight: 400 }}>Team</th>
              <th style={{ padding: '4px 6px', fontWeight: 400 }}>Game</th>
              {sortableHeader('salary', 'Sal', 'right')}
              {sortableHeader('displayedProjection', 'Proj', 'right')}
              {sortableHeader('value', 'Val', 'right')}
              {sortableHeader('floor', 'Floor', 'right')}
              {sortableHeader('ceiling', 'Ceil', 'right')}
              {sortableHeader('ownership', 'Own%', 'right')}
              {sortableHeader('boomChance', 'Boom', 'right')}
              <th style={{ padding: '4px 6px', fontWeight: 400 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => {
              const isSelected = selectedIds.has(player.id);
              const canAfford = !isSelected && player.salary <= remainingSalary + (isSelected ? player.salary : 0);
              return (
                <tr
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  style={{
                    borderBottom: '1px solid #1e1e1e',
                    background: isSelected ? '#0d2240' : 'transparent',
                    opacity: !isSelected && !canAfford ? 0.45 : 1,
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '5px 6px', color: '#e0e0e0', fontWeight: 600 }}>
                    {formIcon(player.form)} {player.name}
                  </td>
                  <td style={{ padding: '5px 6px', color: '#888' }}>{player.position}</td>
                  <td style={{ padding: '5px 6px', color: '#aaa' }}>{player.team}</td>
                  <td style={{ padding: '5px 6px', color: '#666' }}>{player.team} vs {player.opponent}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#aaa' }}>
                    ${player.salary.toLocaleString()}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#4fc3f7', fontWeight: 600 }}>
                    {player.displayedProjection.toFixed(1)}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#888' }}>
                    {(player.displayedProjection / (player.salary / 1000)).toFixed(1)}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#888' }}>
                    {player.floor.toFixed(1)}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#888' }}>
                    {player.ceiling.toFixed(1)}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#aaa' }}>
                    {player.ownership.toFixed(1)}%
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: player.boomChance > 0.22 ? '#f59e0b' : '#888' }}>
                    {(player.boomChance * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '5px 6px' }}>
                    {isSelected ? (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(player);
                        }}
                        style={btnStyle('#c0392b')}
                      >
                        -
                      </button>
                    ) : (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onAdd(player);
                        }}
                        disabled={!canAfford}
                        style={btnStyle('#2a6ef5', !canAfford)}
                      >
                        +
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function btnStyle(bg: string, disabled?: boolean): React.CSSProperties {
  return {
    background: disabled ? '#222' : bg,
    color: disabled ? '#555' : '#fff',
    border: 'none',
    borderRadius: 4,
    width: 24,
    height: 24,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 700,
  };
}
