import type { RunSummary } from '../types';
import { APP_NAME } from '../config';

interface Props {
  summary: RunSummary;
  bestRunScore: number;
  onNewRun: () => void;
  onHome: () => void;
}

const BUST_MESSAGES = [
  'The bankroll is gone. That\'s the game.',
  'Busted out. Every pro has a story like this.',
  'Ran out of bullets. Time to reload.',
  'The field ate you alive. It happens.',
];

const COMPLETE_MESSAGES = [
  'Ten slates in the books. Run finished.',
  'Full season complete. Let\'s see the damage.',
  'Made it through all 10. Not everyone does.',
  'Run over. Here\'s where you stand.',
];

function pick(arr: string[], seed: number): string {
  return arr[seed % arr.length];
}

export default function RunOverScreen({ summary, bestRunScore, onNewRun, onHome }: Props) {
  const isBust = summary.endReason === 'bust';
  const isNewBest = summary.finalBankroll >= bestRunScore;
  const roi = ((summary.finalBankroll - 15) / 15) * 100;
  const cashRate = summary.slatesPlayed > 0
    ? Math.round((summary.totalCashed / summary.slatesPlayed) * 100)
    : 0;

  const headline = isBust
    ? pick(BUST_MESSAGES, summary.runNumber)
    : pick(COMPLETE_MESSAGES, summary.runNumber);

  const shareText = [
    `${APP_NAME} Career Run #${summary.runNumber}`,
    `${isBust ? '💀 Bust' : '✅ Completed'} · ${summary.slatesPlayed} slates`,
    `$15 → $${summary.finalBankroll.toFixed(2)} (${roi >= 0 ? '+' : ''}${roi.toFixed(0)}%)`,
    `${cashRate}% cash rate · Peak $${summary.peakBankroll.toFixed(2)}`,
    `No money. Just lineups.`,
  ].join('\n');

  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', padding: '28px 16px', gap: 16 }}>
      {/* Banner */}
      <div style={{
        textAlign: 'center',
        padding: '24px 16px',
        background: isBust ? '#1a0808' : '#071d14',
        border: `1px solid ${isBust ? '#4a1a1a' : '#1f6f47'}`,
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{isBust ? '💀' : '🏁'}</div>
        <div style={{ fontSize: 14, color: isBust ? '#e74c3c' : '#27ae60', fontWeight: 700, marginBottom: 6 }}>
          {isBust ? 'BUST' : 'RUN COMPLETE'}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{headline}</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
          ${summary.finalBankroll.toFixed(2)}
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
          Started at $15.00
          <span style={{ color: roi >= 0 ? '#27ae60' : '#e74c3c', marginLeft: 8, fontWeight: 700 }}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(0)}% ROI
          </span>
        </div>
        {isNewBest && (
          <div style={{ marginTop: 10, color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>
            🏆 New personal best!
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Slates Played', value: `${summary.slatesPlayed} / 10` },
          { label: 'Cash Rate', value: `${cashRate}%` },
          { label: 'Peak Bankroll', value: `$${summary.peakBankroll.toFixed(2)}` },
          { label: 'Best Finish', value: `#${summary.bestRank}` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: '#111', border: '1px solid #1e1e1e',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Share */}
      <div style={{
        background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
        padding: 12, fontFamily: 'monospace', fontSize: 12,
        color: '#888', whiteSpace: 'pre-line', lineHeight: 1.6,
      }}>
        {shareText}
      </div>
      <button onClick={copy} style={{
        width: '100%', padding: '10px 0',
        background: '#1a1a1a', border: '1px solid #2a6ef5', color: '#4fc3f7',
        borderRadius: 8, fontSize: 14, cursor: 'pointer',
      }}>
        {copied ? '✓ Copied!' : '📋 Copy Run Summary'}
      </button>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
        <button onClick={onNewRun} style={{
          padding: '13px 0', background: '#2a6ef5', border: 'none',
          color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          New Run →
        </button>
        <button onClick={onHome} style={{
          padding: '13px 0', background: '#1a1a1a', border: '1px solid #2a2a2a',
          color: '#666', borderRadius: 8, fontSize: 14, cursor: 'pointer',
        }}>
          🏠 Home
        </button>
      </div>
    </div>
  );
}

// useState import needed for copy button
import { useState } from 'react';
