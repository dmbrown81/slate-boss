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
import HelpModal from './HelpModal';
import { APP_NAME } from '../config';
import { isStarterTournament, TOURNAMENT_ORDER, TOURNAMENTS } from '../lib/payout';

interface Props {
  slate: Slate;
  onEnterContest: (lineup: Lineup, players: Player[]) => void;
  onBack: () => void;
  isCareer?: boolean;
  isFirstSession?: boolean;
  entryFee?: number;
  selectedTournament: TournamentType;
  onTournamentChange: (type: TournamentType) => void;
}

export default function LineupBuilder({
  slate,
  onEnterContest,
  onBack,
  isCareer,
  isFirstSession = false,
  entryFee = 1,
  selectedTournament,
  onTournamentChange,
}: Props) {
  // The first daily contest is always a Safe 50/50, with advanced tooling hidden.
  const effectiveTournament: TournamentType = isFirstSession ? 'double_up' : selectedTournament;
  const [lineup, setLineup] = useState<Lineup>(emptyLineup());
  const [players, setPlayers] = useState<Player[]>(slate.players);
  const [pendingNews, setPendingNews] = useState<NewsEvent[]>([]);
  const [shownNews, setShownNews] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const startTime = useRef(Date.now());

  // News event timing — suppressed on the first session so the first build is calm.
  useEffect(() => {
    if (isFirstSession) return;
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
  }, [slate.newsEvents, shownNews, isFirstSession]);

  const dismissNews = (id: string) => setPendingNews((prev) => prev.filter((e) => e.id !== id));

  const handleAdd = (player: Player) => {
    const updated = addPlayer(lineup, player);
    if (updated) setLineup(updated);
  };

  const handleRemove = (player: Player) => {
    setLineup(removePlayer(lineup, player));
  };

  const selectedIds = new Set(getLineupPlayers(lineup).map((p) => p.id));
  const lineupPlayers = getLineupPlayers(lineup);
  const qb = lineup.QB;
  const hasQbCombo = Boolean(qb && lineupPlayers.some((p) => p.team === qb.team && (p.position === 'WR' || p.position === 'TE')));
  const tournament = TOURNAMENTS[effectiveTournament];
  const isStarterContest = isStarterTournament(effectiveTournament);
  const avgLeft = averageSalaryLeftPerOpenSlot(lineup);
  const slotsOpen = openSlotCount(lineup);
  const firstSlateStep = !qb
    ? {
        title: 'Step 1: Pick a QB',
        body: 'Quarterbacks usually carry the lineup. Start with a steady projected QB.',
        tone: '#2a6ef5',
      }
    : !hasQbCombo
    ? {
        title: 'Step 2: Add a QB Combo',
        body: `Add a ${qb.team} WR or TE. If ${qb.name} has a good game, that teammate can rise with him.`,
        tone: '#f59e0b',
      }
    : slotsOpen > 0
    ? {
        title: `Step 3: Fill ${slotsOpen} more slot${slotsOpen === 1 ? '' : 's'}`,
        body: 'For Safe 50/50, lean on Steady and Playable cards. You only need to beat half the room.',
        tone: '#8ee0b3',
      }
    : {
        title: 'Ready to enter',
        body: 'Your lineup is full. Check cap left, then enter the Safe 50/50.',
        tone: '#8ee0b3',
      };
  const guidePosition = isFirstSession && !qb ? 'QB' : isFirstSession && qb && !hasQbCombo ? 'COMBO' : null;

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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {APP_NAME} · Slate #{slate.slateNumber}
              <span style={{ fontSize: 11, color: '#777', marginLeft: 8 }}>Week {slate.week}</span>
              {isCareer && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 8 }}>CAREER · ${entryFee} entry</span>}
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '1px solid #333',
              background: '#111',
              color: '#aaa',
              cursor: 'pointer',
              fontWeight: 800,
            }}
            aria-label="Open glossary"
          >
            ?
          </button>
        </div>

        {/* Modifier banner — hidden on the first session to match the simplified home screen */}
        {!isFirstSession && <div style={{
          background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '6px 10px', fontSize: 12, color: '#ccc',
        }}>
          <span style={{ color: '#f59e0b', marginRight: 6 }}>{slate.modifier.label}</span>
          <span style={{ color: '#666' }}>{slate.modifier.description}</span>
        </div>}

        {/* Tournament picker — single line with dropdown. First session is locked to Safe 50/50. */}
        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          {isFirstSession ? (
            <div style={{
              flex: 1,
              background: '#111', border: '1px solid #2a2a2a', color: '#ccc',
              borderRadius: 7, padding: '6px 8px', fontSize: 12, fontWeight: 700,
            }}>
              Safe 50/50 <span style={{ color: '#8ee0b3', fontWeight: 400 }}>· First slate</span>
            </div>
          ) : (
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
              {TOURNAMENT_ORDER.map((key) => {
                const t = TOURNAMENTS[key];
                const label = isStarterTournament(key) ? 'Starter friendly' : 'Advanced';
                return (
                  <option key={t.key} value={t.key}>{t.name} · {label}</option>
                );
              })}
            </select>
          )}
          <div style={{
            fontSize: 11, color: '#555', whiteSpace: 'nowrap',
            background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 6,
            padding: '5px 8px',
          }}>
            ${entryFee} <span style={{ color: '#4fc3f7' }}>· {tournament.prizeSummary.split('·')[0].trim()}</span>
          </div>
        </div>
        <div style={{
          marginTop: 5,
          color: isStarterContest ? '#8ee0b3' : '#f5a34c',
          fontSize: 11,
          background: isStarterContest ? '#071d14' : '#1f1208',
          border: `1px solid ${isStarterContest ? '#1f6f47' : '#6f3a10'}`,
          borderRadius: 6,
          padding: '5px 7px',
        }}>
          {isStarterContest
            ? 'Good starter contest: you can learn the game without needing a perfect first-place lineup.'
            : 'Advanced contest: higher ceiling, more frustration risk. Use when you want a big-swing sweat.'}
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 6,
          fontSize: 11, color: '#666', padding: '0 2px',
        }}>
          <span>Proj: <span style={{ color: '#f59e0b' }}>{lineupProjectedPoints(lineup).toFixed(1)}</span></span>
          {effectiveTournament === 'double_up' ? (
            <span>Mode: <span style={{ color: '#8ee0b3' }}>Safe</span></span>
          ) : (
            <span>Popularity: <span style={{ color: '#888' }}>{lineupAvgOwnership(lineup).toFixed(1)}%</span></span>
          )}
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
        {isFirstSession && (
          <div style={{
            background: '#0d1a2a',
            border: `1px solid ${firstSlateStep.tone}`,
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 10,
            color: '#cfe0ff',
            fontSize: 12,
            lineHeight: 1.45,
          }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 13, marginBottom: 3 }}>{firstSlateStep.title}</div>
            {firstSlateStep.body}
          </div>
        )}
        <div style={{
          background: '#111',
          border: '1px solid #242424',
          borderRadius: 8,
          padding: '9px 10px',
          marginBottom: 10,
          color: '#aaa',
          fontSize: 12,
          lineHeight: 1.4,
        }}>
          <span style={{ color: '#fff', fontWeight: 800 }}>Your job:</span> fill QB, 2 RB, 2 WR, TE, FLEX, and DST under $50k.
          Tap a player for details, use <span style={{ color: '#4fc3f7' }}>+</span> to add, and watch Avg/Slot so you do not run out of salary.
        </div>
        {!isFirstSession && <StackingTool
          lineup={lineup}
          players={players}
          selectedIds={selectedIds}
          onAdd={handleAdd}
          onSelectPlayer={setSelectedPlayer}
        />}
        <LineupCoach lineup={lineup} tournamentType={effectiveTournament} />
        <PlayerTable
          players={players}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onSelectPlayer={setSelectedPlayer}
          selectedIds={selectedIds}
          remainingSalary={remainingSalary(lineup)}
          tournamentType={effectiveTournament}
          guideTeam={qb?.team ?? null}
          guidePosition={guidePosition}
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
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
