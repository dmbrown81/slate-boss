import { useMemo, useState } from 'react';
import {
  buildStarterDeck, scoreFootballPlay, shuffle,
  HAND_SIZE, QUARTERS, AUDIBLES, MAX_PLAY_CARDS,
  FB_COORDINATORS, FB_ENVIRONMENTS, targetForEnvironment, randomEnvironment,
  type FbCard, type FbSide, type FbEnvironmentKey, type FbPlayResult, type FbLedgerEntry,
} from '../lib/footballRogue';

interface Props {
  onHome: () => void;
}

const STARTER_COORDINATORS = ['air_raid'] as const;

const SIDE_COLOR: Record<FbSide, { border: string; chip: string; text: string }> = {
  pass: { border: '#2a6ef5', chip: '#0d1a2a', text: '#6fb0ff' },
  catch: { border: '#27ae60', chip: '#0d2218', text: '#5fd99a' },
  run: { border: '#f59e0b', chip: '#241803', text: '#ffc457' },
  kick: { border: '#8a8a8a', chip: '#1a1a1a', text: '#cfcfcf' },
  defense: { border: '#b8556b', chip: '#241016', text: '#ff8fa6' },
};

interface MatchState {
  deck: FbCard[];
  hand: FbCard[];
  discard: FbCard[];
  quarter: number;
  audiblesLeft: number;
  score: number;
  target: number;
  environment: FbEnvironmentKey;
  status: 'playing' | 'won' | 'lost';
  lastPlay: { result: FbPlayResult; quarter: number } | null;
}

function deal(): MatchState {
  const env = randomEnvironment();
  const full = shuffle(buildStarterDeck().cards);
  const hand = full.slice(0, HAND_SIZE);
  const deck = full.slice(HAND_SIZE);
  return {
    deck, hand, discard: [],
    quarter: 1, audiblesLeft: AUDIBLES, score: 0,
    target: targetForEnvironment(env), environment: env,
    status: 'playing', lastPlay: null,
  };
}

function drawUp(deck: FbCard[], hand: FbCard[], discard: FbCard[]): { deck: FbCard[]; hand: FbCard[]; discard: FbCard[] } {
  let d = [...deck];
  let dp = [...discard];
  const h = [...hand];
  while (h.length < HAND_SIZE) {
    if (d.length === 0) {
      if (dp.length === 0) break;
      d = shuffle(dp);
      dp = [];
    }
    h.push(d.shift()!);
  }
  return { deck: d, hand: h, discard: dp };
}

export default function FootballRogueScreen({ onHome }: Props) {
  const [match, setMatch] = useState<MatchState>(() => deal());
  const [selected, setSelected] = useState<string[]>([]);

  const selectedCards = useMemo(
    () => selected.map((id) => match.hand.find((c) => c.id === id)).filter(Boolean) as FbCard[],
    [selected, match.hand],
  );

  const preview = useMemo(
    () => scoreFootballPlay(selectedCards, { coordinators: [...STARTER_COORDINATORS], environment: match.environment }),
    [selectedCards, match.environment],
  );

  const env = FB_ENVIRONMENTS[match.environment];
  const remaining = Math.max(0, match.target - match.score);
  const pct = Math.min(100, (match.score / match.target) * 100);

  function toggle(id: string) {
    if (match.status !== 'playing') return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PLAY_CARDS) return prev;
      return [...prev, id];
    });
  }

  function runPlay() {
    if (match.status !== 'playing' || selectedCards.length === 0) return;
    const result = scoreFootballPlay(selectedCards, { coordinators: [...STARTER_COORDINATORS], environment: match.environment });
    setMatch((m) => {
      const newScore = m.score + result.total;
      const playedIds = new Set(selected);
      const handAfter = m.hand.filter((c) => !playedIds.has(c.id));
      const discardAfter = [...m.discard, ...m.hand.filter((c) => playedIds.has(c.id))];
      const drawn = drawUp(m.deck, handAfter, discardAfter);
      const usedQuarter = m.quarter;
      const won = newScore >= m.target;
      const outOfQuarters = usedQuarter >= QUARTERS;
      const status: MatchState['status'] = won ? 'won' : outOfQuarters ? 'lost' : 'playing';
      return {
        ...m,
        ...drawn,
        score: newScore,
        quarter: won || outOfQuarters ? usedQuarter : usedQuarter + 1,
        status,
        lastPlay: { result, quarter: usedQuarter },
      };
    });
    setSelected([]);
  }

  function audible() {
    if (match.status !== 'playing' || selectedCards.length === 0 || match.audiblesLeft <= 0) return;
    setMatch((m) => {
      const ids = new Set(selected);
      const handAfter = m.hand.filter((c) => !ids.has(c.id));
      const discardAfter = [...m.discard, ...m.hand.filter((c) => ids.has(c.id))];
      const drawn = drawUp(m.deck, handAfter, discardAfter);
      return { ...m, ...drawn, audiblesLeft: m.audiblesLeft - 1 };
    });
    setSelected([]);
  }

  function newGame() {
    setMatch(deal());
    setSelected([]);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '16px 14px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onHome} style={ghostBtn}>← Home</button>
        <div style={{ fontSize: 11, color: '#777', letterSpacing: 1, fontWeight: 800 }}>FOOTBALL ROGUE · PROTOTYPE</div>
        <button onClick={newGame} style={ghostBtn}>↻ New</button>
      </div>

      {/* Scoreboard */}
      <div style={{ background: '#101826', border: '1px solid #1f3350', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b86b8', letterSpacing: 1 }}>SCORE</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{match.score}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#6b86b8', letterSpacing: 1 }}>TARGET</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{match.target}</div>
            <div style={{ fontSize: 10, color: '#6b86b8' }}>{remaining > 0 ? `${remaining} to go` : 'cleared!'}</div>
          </div>
        </div>
        <div style={{ height: 8, background: '#0a0f18', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#27ae60' : '#2a6ef5', transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
          <Pill label="Quarter" value={`${Math.min(match.quarter, QUARTERS)}/${QUARTERS}`} />
          <Pill label="Audibles" value={`${match.audiblesLeft}`} />
          <Pill label="Deck" value={`${match.deck.length}`} />
        </div>
        <div style={{ marginTop: 10, background: '#0a0f18', border: '1px solid #1f3350', borderRadius: 8, padding: '7px 10px' }}>
          <div style={{ fontSize: 12, color: '#cfe0ff', fontWeight: 700 }}>{env.label}</div>
          <div style={{ fontSize: 11, color: '#6b86b8' }}>{env.description}</div>
        </div>
      </div>

      {match.status === 'playing' && (
        <>
          {/* Live play preview */}
          <PlayPreview result={preview} count={selectedCards.length} />

          {/* Hand */}
          <div>
            <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, margin: '2px 2px 6px' }}>
              YOUR HAND · tap up to {MAX_PLAY_CARDS} cards to call a play
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {match.hand.map((card) => (
                <CardView key={card.id} card={card} active={selected.includes(card.id)} onClick={() => toggle(card.id)} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              onClick={audible}
              disabled={selectedCards.length === 0 || match.audiblesLeft <= 0}
              style={{ ...actionBtn, background: '#1a1a1a', border: '1px solid #333', color: match.audiblesLeft > 0 ? '#ccc' : '#555', flex: 1, opacity: selectedCards.length === 0 || match.audiblesLeft <= 0 ? 0.5 : 1 }}
            >
              Audible ({match.audiblesLeft})
            </button>
            <button
              onClick={runPlay}
              disabled={selectedCards.length === 0}
              style={{ ...actionBtn, background: selectedCards.length === 0 ? '#1a2436' : '#2a6ef5', color: '#fff', flex: 2, opacity: selectedCards.length === 0 ? 0.6 : 1 }}
            >
              {preview.valid ? `Run Play  ·  +${preview.total}` : selectedCards.length ? `Run Play  ·  +${preview.total}` : 'Run Play'}
            </button>
          </div>

          {match.lastPlay && (
            <div style={{ fontSize: 11, color: '#6b86b8', textAlign: 'center', marginTop: 2 }}>
              Last play (Q{match.lastPlay.quarter}): {match.lastPlay.result.playName} for {match.lastPlay.result.total}
            </div>
          )}
        </>
      )}

      {match.status !== 'playing' && (
        <EndPanel won={match.status === 'won'} score={match.score} target={match.target} onReplay={newGame} onHome={onHome} />
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: '#0a0f18', border: '1px solid #1f3350', borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#6b86b8', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function CardView({ card, active, onClick }: { card: FbCard; active: boolean; onClick: () => void }) {
  const c = SIDE_COLOR[card.side];
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? c.chip : '#111',
        border: `1.5px solid ${active ? c.border : '#242424'}`,
        borderRadius: 9,
        padding: '7px 5px 6px',
        cursor: 'pointer',
        textAlign: 'left',
        transform: active ? 'translateY(-4px)' : 'none',
        transition: 'transform .12s, border-color .12s',
        position: 'relative',
        minHeight: 78,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontWeight: 900, color: c.text, background: c.chip, border: `1px solid ${c.border}55`, borderRadius: 4, padding: '1px 4px' }}>{card.position}</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{card.value}</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: c.text, marginTop: 4, lineHeight: 1.1 }}>{card.label}</div>
      </div>
      <div style={{ fontSize: 8.5, color: '#777', lineHeight: 1.1 }}>{card.playerName} · {card.team}</div>
    </button>
  );
}

function PlayPreview({ result, count }: { result: FbPlayResult; count: number }) {
  const live = count > 0;
  return (
    <div style={{
      background: live ? (result.valid ? '#0d1f14' : '#1f1410') : '#0d0d0d',
      border: `1px solid ${live ? (result.valid ? '#27ae6066' : '#b8556b66') : '#1e1e1e'}`,
      borderRadius: 12, padding: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: live ? 8 : 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{result.playName}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{result.flavor}</div>
        </div>
        {live && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: result.valid ? '#5fd99a' : '#ff8fa6', lineHeight: 1 }}>{result.total}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{result.base} × {result.mult}</div>
          </div>
        )}
      </div>
      {live && result.ledger.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {result.ledger.filter((e) => e.kind === 'synergy' || e.kind === 'coordinator' || e.kind === 'environment').map((e: FbLedgerEntry) => (
            <span key={e.id} style={{
              fontSize: 10, fontWeight: 700,
              color: e.kind === 'coordinator' ? '#b7a7ff' : e.kind === 'environment' ? '#cfe0ff' : '#9bf0c0',
              background: '#0a0a0a', border: '1px solid #242424', borderRadius: 6, padding: '3px 7px',
            }}>
              {e.label}{e.multAdd ? ` ${e.multAdd > 0 ? '+' : ''}${e.multAdd}×` : e.baseFactor ? ` ×${e.baseFactor}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EndPanel({ won, score, target, onReplay, onHome }: { won: boolean; score: number; target: number; onReplay: () => void; onHome: () => void }) {
  return (
    <div style={{
      background: won ? '#0d2216' : '#1f0d10',
      border: `1px solid ${won ? '#27ae60' : '#b8556b'}`,
      borderRadius: 14, padding: 20, textAlign: 'center', marginTop: 8,
    }}>
      <div style={{ fontSize: 40 }}>{won ? '🏆' : '😖'}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>{won ? 'Match Won!' : 'Came Up Short'}</div>
      <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
        You scored <b style={{ color: won ? '#5fd99a' : '#ff8fa6' }}>{score}</b> against a target of {target}.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={onHome} style={{ ...actionBtn, background: '#1a1a1a', border: '1px solid #333', color: '#ccc', flex: 1 }}>Home</button>
        <button onClick={onReplay} style={{ ...actionBtn, background: won ? '#27ae60' : '#2a6ef5', color: '#fff', flex: 2 }}>Play Again</button>
      </div>
      <div style={{ fontSize: 10, color: '#555', marginTop: 14, lineHeight: 1.5 }}>
        {FB_COORDINATORS.air_raid.name} active · {FB_COORDINATORS.air_raid.description}
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  background: '#141414', border: '1px solid #2a2a2a', color: '#aaa',
  borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
};

const actionBtn: React.CSSProperties = {
  padding: '13px 0', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer',
};
