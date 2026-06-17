import { useState, useEffect, useRef } from 'react';
import type { ContestResult, Lineup, Player } from '../types';
import { ROSTER_SLOTS } from '../types';
import { cashLineRank } from '../lib/payout';

interface Props {
  result: ContestResult;
  lineup: Lineup;
  onDone: () => void;
}

type Phase = 'q1' | 'q2' | 'q3' | 'final';
const PHASE_ORDER: Phase[] = ['q1', 'q2', 'q3', 'final'];
const PHASE_LABELS: Record<Phase, string> = {
  q1: 'End of Q1', q2: 'Halftime', q3: 'End of Q3', final: 'Final',
};
const PHASE_DELAY = 4400;
const LINE_INTERVAL = 650;

// Flavor lines for various score ranges per position, keyed by tone
const FLAVOR: Record<string, string[]> = {
  QB_boom: [
    '{name} finds the end zone on a 34-yard strike 🔥',
    '{name} scrambles 18 yards, keeps the drive alive 🔥',
    'Back-to-back TDs for {name} — the field is cooked',
    '{name} 52-yard bomb to the back of the end zone',
  ],
  QB_normal: [
    '{name} works a 12-play drive, caps with a TD',
    '{name} checks down efficiently — 9/11 this half',
    '{name} dumps off short, WR does the work',
    '{name} converts 3rd-and-long with a tight-window throw',
  ],
  QB_bust: [
    '{name} sacked twice on the opening drive',
    'Red-zone INT derails {name}\'s rhythm',
    '{name} benched after 3-and-out — DNP rest of game',
  ],
  RB_boom: [
    '{name} bursts through a gap, 28-yard TD run 🔥',
    '{name} catches a screen, turns it into 22 after contact',
    'Goal-line carry for {name} — punches it in',
    '{name} rips a 41-yarder off tackle, in stride',
  ],
  RB_normal: [
    '{name} grinds 13 carries in the first half',
    '{name} gets the 3rd-and-1 conversion, keeps it moving',
    '{name} checks out of the backfield for a 7-yard gain',
    '{name} absorbs contact, still picks up 6',
  ],
  RB_bust: [
    '{name} exits briefly — hamstring, listed as day-to-day',
    '{name} lost in the committee. Three carries, two touches',
    'Game script turns pass-heavy — {name}\'s role dries up',
  ],
  WR_boom: [
    '{name} beats press coverage, 44-yard TD 🔥',
    'Toe-tap on the sideline — {name} hauls it in',
    '{name} and the QB connect for the 3rd time today',
    '{name} runs a perfect post, nothing the corner could do',
  ],
  WR_normal: [
    '{name} on a quick slant — first down, clock running',
    '{name} draws a PI deep, ball moved to the 14',
    'Third catch of the game for {name} — methodical',
    '{name} runs underneath, 8 yards and out of bounds',
  ],
  WR_bust: [
    '{name} drops a catchable ball in the red zone',
    '{name} targeted once all half — game script is killing the volume',
    '{name} dinged on a crossing route, listed questionable',
  ],
  TE_boom: [
    '{name} in the slot, releases inside, TD 🔥',
    '{name} seam route — 19 yards and a toe drag',
    '{name} earns the goal-line look, delivers',
    'Mismatch punished: {name} over a linebacker for 15',
  ],
  TE_normal: [
    '{name} in the flat, safety has to come down — 9 yards',
    '{name} works the short middle, two catches',
    '{name} used as blocker but catches a check-down for 5',
  ],
  TE_bust: [
    '{name} ran 11 routes all game. Involvement limited.',
    '{name} targets go elsewhere — QB going vertical today',
  ],
  DST_boom: [
    'PICK SIX — defense scores 🔥',
    'Strip sack recovered — big momentum play',
    'Safety! Defense backs the QB into his own end zone',
    'Fumble recovery inside the 20 — set up a short field',
  ],
  DST_normal: [
    'Defense holds, forces a field goal attempt',
    'Pressure on 3rd down — QB throws it away',
    'Two-and-out: defense off the field in under 90 seconds',
  ],
  DST_bust: [
    'Offensive onslaught continues. Points allowed mounting.',
    '{name} unit giving up chunk plays all day',
  ],
  field: [
    '{name} (field stack) 🔥 {pts} pts',
    '{name} off the board — field entry cashing',
    'Chalk delivers: {name} hits projection',
  ],
};

function pickFlavor(key: string, player: Player, pts?: number, rng?: () => number): string {
  const pool = FLAVOR[key] ?? FLAVOR['RB_normal'];
  const idx = rng ? Math.floor(rng() * pool.length) : Math.floor(Math.random() * pool.length);
  return pool[idx]
    .replace('{name}', player.name)
    .replace('{pts}', pts?.toFixed(1) ?? '');
}

function buildQuarterTicker(
  phaseIdx: number,
  result: ContestResult,
  lineupPlayers: Player[],
): string[] {
  const lines: string[] = [];
  const phase = PHASE_ORDER[phaseIdx];

  // User lineup player lines
  lineupPlayers.forEach((p) => {
    const sc = result.userEntry.scores.find((s) => s.playerId === p.id);
    if (!sc) return;

    const qScore = phase === 'q1' ? sc.q1
      : phase === 'q2' ? sc.q2
      : phase === 'q3' ? sc.q3
      : sc.final - sc.q1 - sc.q2 - sc.q3;

    const isBoom = sc.boomHit && (phase === 'final' || qScore > p.displayedProjection * 0.35);
    const isBust = qScore < p.floor * 0.08;

    const pos = p.position;
    const key = isBoom ? `${pos}_boom` : isBust ? `${pos}_bust` : `${pos}_normal`;
    if (qScore > 0.5 || isBoom) {
      lines.push(pickFlavor(key, p, sc.final));
    }
  });

  // Sprinkle 1-2 field events
  result.field.slice(0, 5).forEach((entry) => {
    entry.scores.forEach((sc) => {
      if (sc.boomHit && Math.random() < 0.3) {
        const p = entry.lineupPlayers.find((pl) => pl.id === sc.playerId);
        if (p && !lineupPlayers.some((lp) => lp.id === p.id)) {
          lines.push(`${p.name} (field) 🔥 ${sc.final.toFixed(1)} pts`);
        }
      }
    });
  });

  // Shuffle so it's not always positional order
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }

  return lines.slice(0, 6);
}

export default function SweatScreen({ result, lineup, onDone }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [displayedTicker, setDisplayedTicker] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const lineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickLineRef = useRef(0);

  const currentPhase = PHASE_ORDER[phaseIdx];
  const lineupPlayers = ROSTER_SLOTS.map((s) => lineup[s]).filter(Boolean) as Player[];

  useEffect(() => {
    if (done) return;

    const lines = buildQuarterTicker(phaseIdx, result, lineupPlayers);
    tickLineRef.current = 0;

    const addLine = () => {
      if (tickLineRef.current < lines.length) {
        const line = lines[tickLineRef.current++];
        setDisplayedTicker((prev) => [...prev.slice(-5), line]);
        lineTimerRef.current = setTimeout(addLine, LINE_INTERVAL);
      }
    };
    lineTimerRef.current = setTimeout(() => {
      setDisplayedTicker([]);
      addLine();
    }, 0);

    phaseTimerRef.current = setTimeout(() => {
      if (phaseIdx < PHASE_ORDER.length - 1) {
        setPhaseIdx((x) => x + 1);
      } else {
        setDone(true);
      }
    }, PHASE_DELAY);

    return () => {
      if (lineTimerRef.current) clearTimeout(lineTimerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIdx, done]);

  const getScore = (playerId: string, phase: Phase): number => {
    const sc = result.userEntry.scores.find((s) => s.playerId === playerId);
    if (!sc) return 0;
    if (phase === 'q1') return sc.q1;
    if (phase === 'q2') return sc.q1 + sc.q2;
    if (phase === 'q3') return sc.q1 + sc.q2 + sc.q3;
    return sc.final;
  };

  const userTotal = lineupPlayers.reduce((sum, p) => sum + getScore(p.id, done ? 'final' : currentPhase), 0);
  const rank = result.quarterRanks[done ? 3 : Math.min(phaseIdx, 3)];
  // Cash line depends on contest format — a Double-Up pays the top half,
  // a Winner Take All pays only 1st.
  const tKey = result.tournament.key;
  const cashLine = cashLineRank(result.totalEntrants, tKey);
  const cashLabel = tKey === 'winner_take_all' ? '1st wins it all' : `Cash line: top ${cashLine}`;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4, letterSpacing: 1 }}>
          {done ? '🏁 FINAL' : `⏱ ${PHASE_LABELS[currentPhase]}`}
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>
          {userTotal.toFixed(1)}
          <span style={{ fontSize: 15, color: '#555', marginLeft: 4 }}>pts</span>
        </div>

        {/* Rank + cash line context */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
          <div style={{
            fontSize: 20, fontWeight: 700,
            color: rank <= cashLine ? '#27ae60' : rank <= cashLine * 2 ? '#f59e0b' : '#888',
          }}>
            #{rank} <span style={{ fontSize: 13, color: '#555' }}>/ {result.totalEntrants}</span>
          </div>
          <div style={{
            fontSize: 11,
            color: rank <= cashLine ? '#27ae60' : '#555',
            border: `1px solid ${rank <= cashLine ? '#27ae6044' : '#2a2a2a'}`,
            borderRadius: 4, padding: '2px 6px',
          }}>
            {rank <= cashLine ? '💰 Cashing' : cashLabel}
          </div>
        </div>

        {/* Rank progress bar */}
        <div style={{ margin: '8px auto', maxWidth: 300, position: 'relative' }}>
          <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: rank <= cashLine ? '#27ae60' : '#2a6ef5',
              width: `${Math.max(2, 100 - (rank / result.totalEntrants) * 100)}%`,
              transition: 'width 0.8s ease',
            }} />
          </div>
          {/* Cash line marker — position matches this contest's payout structure */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(1 - cashLine / result.totalEntrants) * 100}%`,
            width: 1, background: '#27ae6066',
          }} />
        </div>
      </div>

      {/* Ticker */}
      <div style={{
        padding: '4px 16px', minHeight: 72, borderTop: '1px solid #141414', borderBottom: '1px solid #141414',
        background: '#080808',
      }}>
        {displayedTicker.length === 0 ? (
          <div style={{ color: '#333', fontSize: 12, padding: '4px 0' }}>Waiting for plays…</div>
        ) : (
          displayedTicker.map((line, i) => (
            <div key={i} style={{
              fontSize: 12,
              color: line.includes('🔥') ? '#f59e0b' : line.includes('field') ? '#4fc3f7' : '#666',
              padding: '3px 0',
              opacity: i === displayedTicker.length - 1 ? 1 : 0.5 + (i / displayedTicker.length) * 0.5,
            }}>
              {line}
            </div>
          ))
        )}
      </div>

      {/* Player score rows */}
      <div style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
        {ROSTER_SLOTS.map((slot) => {
          const p = lineup[slot];
          if (!p) return null;
          const phase = done ? 'final' : currentPhase;
          const score = getScore(p.id, phase);
          const sc = result.userEntry.scores.find((s) => s.playerId === p.id);
          const isAbove = score >= p.displayedProjection;
          return (
            <div key={slot} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 10px', margin: '3px 0',
              background: '#0e0e0e',
              borderRadius: 8,
              border: `1px solid ${sc?.boomHit ? '#f59e0b33' : isAbove ? '#1d3a1d' : '#141414'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 9, color: '#444', background: '#1a1a1a',
                  borderRadius: 3, padding: '1px 4px', letterSpacing: 0.5,
                }}>
                  {slot}
                </span>
                <span style={{ color: '#ccc', fontSize: 13 }}>{p.name}</span>
                <span style={{ color: '#444', fontSize: 10 }}>{p.team}</span>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                color: sc?.boomHit ? '#f59e0b' : isAbove ? '#4fc3f7' : '#666',
              }}>
                {score.toFixed(1)}
                {sc?.boomHit && <span>🔥</span>}
                {!sc?.boomHit && isAbove && <span style={{ fontSize: 10, color: '#4fc3f766' }}>↑</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 16px 4px' }}>
        {PHASE_ORDER.map((ph, i) => (
          <div key={ph} style={{
            width: i <= phaseIdx ? 20 : 8, height: 8, borderRadius: 4,
            background: i < phaseIdx ? '#27ae60' : i === phaseIdx ? '#2a6ef5' : '#1e1e1e',
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 16px 28px', display: 'flex', gap: 8 }}>
        {!done ? (
          <button
            onClick={() => { setPhaseIdx(PHASE_ORDER.length - 1); setDone(true); }}
            style={{
              flex: 1, padding: '10px 0', background: 'transparent',
              border: '1px solid #1e1e1e', color: '#444', borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Skip to Results
          </button>
        ) : (
          <button
            onClick={onDone}
            style={{
              flex: 1, padding: '13px 0', background: '#2a6ef5',
              border: 'none', color: '#fff', borderRadius: 8,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            See Results →
          </button>
        )}
      </div>
    </div>
  );
}
