import { useState, useEffect, useRef } from 'react';
import type { Slate, Lineup, Player, NewsEvent, TournamentType } from '../types';
import { addPlayer, removePlayer, emptyLineup, getLineupPlayers, remainingSalary, lineupProjectedPoints, lineupAvgOwnership, averageSalaryLeftPerOpenSlot, openSlotCount } from '../lib/lineupValidation';
import { applyNewsToPlayers } from '../lib/slateGenerator';
import PlayerTable from './PlayerTable';
import LineupTray from './LineupTray';
import NewsToast from './NewsToast';
import PlayerDetailModal from './PlayerDetailModal';
import StackingTool from './StackingTool';
import LineupCoach from './LineupCoach';
import { APP_NAME } from '../config';
import { TOURNAMENTS } from '../lib/payout';

interface Props {
  slate: Slate;
  onEnterContest: (lineup: Lineup, players: Player[]) => void;
  onBack: () => void;
  isCareer?: boolean;
  entryFee?: number;
  selectedTournament: TournamentType;
  onTournamentChange: (type: TournamentType) => void;
}

export default function LineupBuilder({
  slate,
  onEnterContest,
  onBack,
  isCareer,
  entryFee = 1,
  selectedTournament,
  onTournamentChange,
}: Props) {
  const [lineup, setLineup] = useState<Lineup>(emptyLineup());
  const [players, setPlayers] = useState<Player[]>(slate.players);
  const [pendingNews, setPendingNews] = useState<NewsEvent[]>([]);
  const [shownNews, setShownNews] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const startTime = useRef(Date.now());

  // News event timing
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 60000; // minutes
      const toShow = slate.newsEvents.filter(
        (e) => elapsed >= e.triggerAtMinute && !shownNews.has(e.id)
      );
      if (toShow.length) {
        // Apply to players
        setPlayers((prev) => applyNewsToPlayers(prev, toShow));
        setPendingNews((prev) => [...prev, ...toShow]);
        setShownNews((prev) => {
          const next = new Set(prev);
          toShow.forEach((e) => next.add(e.id));
          return next;
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [slate.newsEvents, shownNews]);

  const dismissNews = (id: string) => setPendingNews((prev) => prev.filter((e) => e.id !== id));

  const handleAdd = (player: Player) => {
    const updated = addPlayer(lineup, player);
    if (updated) setLineup(updated);
  };

  const handleRemove = (player: Player) => {
    setLineup(removePlayer(lineup, player));
  };

  const selectedIds = new Set(getLineupPlayers(lineup).map((p) => p.id));
  const tournament = TOURNAMENTS[selectedTournament];
  const avgLeft = averageSalaryLeftPerOpenSlot(lineup);
  const slotsOpen = openSlotCount(lineup);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#0a0a0a', borderBottom: '1px solid #1e1e1e',
        padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>←</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {APP_NAME} · Slate #{slate.slateNumber}
              <span style={{ fontSize: 11, color: '#777', marginLeft: 8 }}>Week {slate.week}</span>
              {isCareer && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 8 }}>CAREER · ${entryFee} entry</span>}
            </div>
          </div>
        </div>

        {/* Modifier banner */}
        <div style={{
          background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '6px 10px', fontSize: 12, color: '#ccc',
        }}>
          <span style={{ color: '#f59e0b', marginRight: 6 }}>{slate.modifier.label}</span>
          <span style={{ color: '#666' }}>{slate.modifier.description}</span>
        </div>

        {/* Tournament picker — single line with dropdown */}
        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={selectedTournament}
            onChange={(e) => onTournamentChange(e.target.value as typeof selectedTournament)}
            style={{
              flex: 1,
              background: '#111', border: '1px solid #2a2a2a', color: '#ccc',
              borderRadius: 7, padding: '6px 8px', fontSize: 12, cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
            }}
          >
            {Object.values(TOURNAMENTS).map((t) => (
              <option key={t.key} value={t.key}>{t.name} · {t.difficulty}</option>
            ))}
          </select>
          <div style={{
            fontSize: 11, color: '#555', whiteSpace: 'nowrap',
            background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 6,
            padding: '5px 8px',
          }}>
            ${entryFee} <span style={{ color: '#4fc3f7' }}>· {tournament.prizeSummary.split('·')[0].trim()}</span>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 6,
          fontSize: 11, color: '#666', padding: '0 2px',
        }}>
          <span>Proj: <span style={{ color: '#f59e0b' }}>{lineupProjectedPoints(lineup).toFixed(1)}</span></span>
          <span>Avg Own: <span style={{ color: '#888' }}>{lineupAvgOwnership(lineup).toFixed(1)}%</span></span>
          <span>Avg/Slot: <span style={{ color: avgLeft < 3800 && slotsOpen > 0 ? '#e74c3c' : '#888' }}>
            ${Math.max(0, avgLeft).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span></span>
          <span>Cap Left: <span style={{ color: remainingSalary(lineup) < 0 ? '#e74c3c' : '#4fc3f7' }}>
            ${remainingSalary(lineup).toLocaleString()}
          </span></span>
        </div>
      </div>

      {/* Player table — scrollable area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
        <StackingTool
          lineup={lineup}
          players={players}
          selectedIds={selectedIds}
          onAdd={handleAdd}
          onSelectPlayer={setSelectedPlayer}
        />
        <LineupCoach lineup={lineup} tournamentType={selectedTournament} />
        <PlayerTable
          players={players}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onSelectPlayer={setSelectedPlayer}
          selectedIds={selectedIds}
          remainingSalary={remainingSalary(lineup)}
        />
      </div>

      {/* Sticky bottom tray */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 50 }}>
        <LineupTray
          lineup={lineup}
          onRemove={handleRemove}
          onEnterContest={() => onEnterContest(lineup, players)}
        />
      </div>

      {/* News toasts */}
      {pendingNews.slice(0, 1).map((event) => (
        <NewsToast key={event.id} event={event} onDismiss={() => dismissNews(event.id)} />
      ))}

      <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}
