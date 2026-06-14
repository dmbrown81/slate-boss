import { useState } from 'react';
import type { UserProfile, ModifierKey } from '../types';
import { TIER_LABELS, TIER_ENTRY_FEE, TIER_PROMOTION_BANKROLL } from '../types';
import { currentTitle } from '../lib/progression';
import { APP_NAME } from '../config';

interface Props {
  profile: UserProfile;
  onStartRun: (modifier: ModifierKey | null) => void;
  onContinueRun: () => void;
  onHome: () => void;
}

const MODIFIER_INFO: Record<ModifierKey, { name: string; description: string }> = {
  scout: { name: 'Scout', description: 'Reveals 1 opponent lineup before lock.' },
  anchor_defense: { name: 'Anchor Defense', description: 'Reduces DST volatility — safer floor on defense.' },
  correlated: { name: 'Correlated', description: 'Same-team QB+WR/TE stacks gain a boom-trigger bonus.' },
};

export default function CareerScreen({ profile, onStartRun, onContinueRun, onHome }: Props) {
  const [selectedMod, setSelectedMod] = useState<ModifierKey | null>(null);
  const title = currentTitle(profile);
  const { run } = profile;
  const nextThreshold = TIER_PROMOTION_BANKROLL[run.tier];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{APP_NAME} · Career</div>
      </div>

      {/* Profile */}
      <div style={{
        background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 14, color: '#ccc', fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Level', value: profile.level },
            { label: 'XP', value: profile.xp },
            { label: 'Best Run', value: `$${run.bestRunScore.toFixed(0)}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: 10, color: '#555' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {run.isActive ? (
        /* Active run */
        <div>
          <div style={{
            background: '#111', border: '1px solid #2a6ef566', borderRadius: 10, padding: 14, marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>ACTIVE RUN · #{run.runNumber}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>${run.bankroll.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Bankroll</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{run.slatesRemaining}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Slates Left</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Week {run.currentWeek}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Season Week</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4fc3f7' }}>{TIER_LABELS[run.tier]}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Current Tier</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#888' }}>${TIER_ENTRY_FEE[run.tier]}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Entry Fee</div>
              </div>
            </div>
            <div style={{ marginTop: 10, color: '#888', fontSize: 11, lineHeight: 1.45 }}>
              Goal: survive all 10 weeks and grow your bankroll.
              {Number.isFinite(nextThreshold) && (
                <span> Next tier at <span style={{ color: '#f59e0b' }}>${nextThreshold}</span>.</span>
              )}
              {' '}This slate risks <span style={{ color: '#fff' }}>${TIER_ENTRY_FEE[run.tier]}</span>.
            </div>
          </div>
          <button
            onClick={onContinueRun}
            style={{
              width: '100%', padding: '13px 0', background: '#2a6ef5',
              border: 'none', color: '#fff', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Play Next Slate →
          </button>
        </div>
      ) : (
        /* Start new run */
        <div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>PICK A MODIFIER</div>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '9px 11px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>Run setup</div>
            <div style={{ fontSize: 11, color: '#666' }}>
              Start with $25, Week 1, and play 10 weekly slates. Your goal: survive the run and build your bankroll.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div
              onClick={() => setSelectedMod(null)}
              style={{
                background: selectedMod === null ? '#0d1a2a' : '#111',
                border: `1px solid ${selectedMod === null ? '#2a6ef5' : '#1e1e1e'}`,
                borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>No Modifier</div>
              <div style={{ fontSize: 11, color: '#555' }}>Standard rules. No edge, no crutch.</div>
            </div>
            {(profile.unlockedModifiers).map((key) => {
              const info = MODIFIER_INFO[key];
              return (
                <div
                  key={key}
                  onClick={() => setSelectedMod(key)}
                  style={{
                    background: selectedMod === key ? '#0d1a2a' : '#111',
                    border: `1px solid ${selectedMod === key ? '#2a6ef5' : '#1e1e1e'}`,
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{info.name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{info.description}</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onStartRun(selectedMod)}
            style={{
              width: '100%', padding: '13px 0', background: '#2a6ef5',
              border: 'none', color: '#fff', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Start Run →
          </button>

          {profile.careerRunHistory.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>RUN HISTORY</div>
              {profile.careerRunHistory.slice(-5).reverse().map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', borderBottom: '1px solid #1a1a1a', fontSize: 12,
                }}>
                  <span style={{ color: '#666' }}>Run #{r.runNumber}</span>
                  <span style={{ color: r.endReason === 'bust' ? '#e74c3c' : '#27ae60', fontSize: 10 }}>
                    {r.endReason === 'bust' ? '💀 BUST' : '✅ DONE'}
                  </span>
                  <span style={{ color: '#888' }}>{r.slatesPlayed} slates</span>
                  <span style={{ color: '#f59e0b' }}>${r.finalBankroll.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
