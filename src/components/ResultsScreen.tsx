import { useState } from 'react';
import type { ContestResult } from '../types';
import { APP_NAME } from '../config';

interface Props {
  result: ContestResult;
  streak: number;
  onHome: () => void;
  onCareer: () => void;
}

const GRADE_COLOR: Record<string, string> = {
  'A+': '#27ae60', A: '#27ae60', B: '#4fc3f7', C: '#f59e0b', D: '#e67e22', F: '#e74c3c',
};

function GradeCard({ grade, label, sentence }: { grade: string; label: string; sentence: string }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
      padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 800, color: GRADE_COLOR[grade] ?? '#888',
        minWidth: 36, textAlign: 'center',
      }}>{grade}</div>
      <div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#ccc' }}>{sentence}</div>
      </div>
    </div>
  );
}

export default function ResultsScreen({ result, streak, onHome, onCareer }: Props) {
  const [copied, setCopied] = useState(false);
  const cashed = result.payout > 0;
  const won = result.userRank === 1;
  const net = result.payout - result.entryFee;

  const copy = () => {
    navigator.clipboard.writeText(result.shareCard).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: won ? '#241a02' : cashed ? '#0d2a1a' : '#1a0a0a',
        borderBottom: `2px solid ${won ? '#f59e0b' : cashed ? '#27ae60' : '#1e1e1e'}`,
        padding: '20px 16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{APP_NAME} · {result.tournament.name}</div>
        {won && (
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>
            🏆 YOU WON THE WHOLE THING
          </div>
        )}
        <div style={{ fontSize: 42, fontWeight: 800, color: '#fff' }}>
          {result.userScore.toFixed(1)}
          <span style={{ fontSize: 16, color: '#555', marginLeft: 4 }}>pts</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: cashed ? '#27ae60' : '#888', marginTop: 4 }}>
          {ordinal(result.userRank)} of {result.totalEntrants}
        </div>
        {cashed ? (
          <div style={{ fontSize: 16, color: '#27ae60', marginTop: 6, fontWeight: 700 }}>
            💰 +${result.payout.toFixed(2)} <span style={{ fontSize: 11, color: '#27ae6099', fontWeight: 400 }}>play money</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Outside the cash line — run it back.
          </div>
        )}
        {streak > 1 && (
          <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 4 }}>🔥 Streak: {streak}</div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
            <span style={{ color: '#ccc', fontSize: 13, fontWeight: 700 }}>{result.tournament.name}</span>
            <span style={{ color: net >= 0 ? '#27ae60' : '#e74c3c', fontSize: 13, fontWeight: 800 }}>
              {net >= 0 ? '+' : '-'}${Math.abs(net).toFixed(2)}
            </span>
          </div>
          <div style={{ color: '#666', fontSize: 11 }}>
            Entry ${result.entryFee.toFixed(2)} · Payout ${result.payout.toFixed(2)} · {result.tournament.prizeSummary}
          </div>
        </div>

        {/* Key players */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: '⭐ Best Play', player: result.bestPlayer },
            { label: '👎 Worst Play', player: result.worstPlayer },
            { label: '💎 Best Value', player: result.bestValue },
            ...(result.biggestRegret ? [{ label: '😬 Biggest Regret', player: result.biggestRegret }] : []),
          ].map(({ label, player }) => (
            <div key={label} style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{player.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{player.position} · ${player.salary.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Report card */}
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>REPORT CARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <GradeCard grade={result.grades.value} label="Value" sentence={result.grades.valueSentence} />
          <GradeCard grade={result.grades.ceiling} label="Ceiling" sentence={result.grades.ceilingSentence} />
          <GradeCard grade={result.grades.leverage} label="Leverage" sentence={result.grades.leverageSentence} />
          <GradeCard grade={result.grades.risk} label="Risk" sentence={result.grades.riskSentence} />
          <GradeCard grade={result.grades.salaryEfficiency} label="Salary Efficiency" sentence={result.grades.salaryEfficiencySentence} />
        </div>

        {/* Share card preview */}
        <div style={{
          background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: 12, marginBottom: 16, fontFamily: 'monospace', fontSize: 13,
          color: '#ccc', whiteSpace: 'pre-line', lineHeight: 1.6,
        }}>
          {result.shareCard}
        </div>

        <button onClick={copy} style={{
          width: '100%', padding: '11px 0', background: '#1a1a1a',
          border: '1px solid #2a6ef5', color: '#4fc3f7', borderRadius: 8,
          fontSize: 14, cursor: 'pointer', marginBottom: 8,
        }}>
          {copied ? '✓ Copied!' : '📋 Copy Share Card'}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onCareer} style={actionBtn('#2a6ef5')}>Career Run →</button>
          <button onClick={onHome} style={actionBtn('#1a1a1a', '#555')}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}

function actionBtn(bg: string, color = '#fff'): React.CSSProperties {
  return {
    padding: '12px 0', background: bg, border: `1px solid ${bg === '#1a1a1a' ? '#2a2a2a' : bg}`,
    color, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };
}
