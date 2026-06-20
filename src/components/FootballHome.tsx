import { useState } from 'react';
import { FB, btnPrimary, card } from './footballStyles';
import FootballHelpModal from './FootballHelpModal';
import { clearGridironRun, loadGridironRun } from '../lib/gridironStorage';
import { TEAM_PROFILES } from '../lib/footballRogue';
import { SEASON_GAMES } from '../lib/footballRun';

interface Props {
  onPlay: () => void;
  onClassic: () => void;
}

export default function FootballHome({ onPlay, onClassic }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [activeRun, setActiveRun] = useState(() => loadGridironRun());
  const activeTeam = activeRun ? TEAM_PROFILES[activeRun.run.team] : null;

  function startFresh() {
    clearGridironRun();
    setActiveRun(null);
    onPlay();
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '0 16px 24px' }}>
      {/* Hero */}
      <div
        className="fb-yard"
        style={{
          marginTop: 8,
          borderRadius: 18,
          padding: '40px 20px 34px',
          textAlign: 'center',
          background: 'radial-gradient(120% 90% at 50% 0%, #16324a 0%, rgba(22,50,74,0) 60%), linear-gradient(180deg,#0e1923,#0a0f16)',
          border: `1px solid ${FB.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, color: FB.gold, fontWeight: 800 }}>SLATE BOSS PRESENTS</div>
        <div className="fb-pop" style={{ fontSize: 54, fontWeight: 900, color: FB.text, lineHeight: 0.95, marginTop: 8, letterSpacing: -1.5, textShadow: '0 2px 24px rgba(240,180,41,0.18)' }}>
          GRIDIRON
        </div>
        <div style={{ fontSize: 13, color: FB.textDim, marginTop: 10, fontWeight: 600 }}>A football card roguelike</div>
        <div style={{ fontSize: 12.5, color: FB.gold, marginTop: 18, fontWeight: 700, letterSpacing: 0.3 }}>
          Build the deck. Call the play. Beat the defense.
        </div>
      </div>

      {/* What it is */}
      <div style={{ ...card(), padding: '14px 14px', marginTop: 14 }}>
        <div style={{ fontSize: 13, color: FB.textDim, lineHeight: 1.55 }}>
          Your cards are football plays. Each drive, assemble the best play you can afford — stack your QB with
          his receivers, pound the rock, or take it away on defense — and watch it score
          {' '}<span style={{ color: FB.green, fontWeight: 700 }}>Base</span> ×
          {' '}<span style={{ color: FB.blue, fontWeight: 700 }}>Execution</span> ×
          {' '}<span style={{ color: FB.gold, fontWeight: 700 }}>Big Play</span>. Clear three rising targets to win.
        </div>
      </div>

      {/* Feature chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <Feature icon="🧠" label="Strategic" sub="A salary cap on every play" />
        <Feature icon="⚡" label="Fast" sub="A full match in minutes" />
        <Feature icon="🎲" label="Roguelike" sub="Skill beats luck" />
        <Feature icon="📈" label="Engine builder" sub="Coordinators that scale" />
      </div>

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {activeRun && activeTeam && (
          <div style={{ ...card(12), padding: '12px 14px', borderColor: '#5a4112', background: 'linear-gradient(160deg,#17170d,#0e151d)' }}>
            <div style={{ fontSize: 10, color: FB.gold, letterSpacing: 1.3, fontWeight: 900 }}>ACTIVE SEASON</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginTop: 4 }}>
              <div style={{ fontSize: 15, color: FB.text, fontWeight: 900 }}>{activeTeam.displayName}</div>
              <div className="fb-num" style={{ fontSize: 12, color: FB.textDim, fontWeight: 800 }}>Game {activeRun.run.gameNumber}/{SEASON_GAMES}</div>
            </div>
            <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 4 }}>
              {activeRun.phase === 'reward' ? 'Front Office reward waiting.' : 'Current game ready to continue.'}
            </div>
          </div>
        )}

        <button onClick={onPlay} style={{ ...btnPrimary, width: '100%', fontSize: 17, padding: '16px 0' }}>
          {activeRun ? `🏈 Resume Season (Game ${activeRun.run.gameNumber}/${SEASON_GAMES})` : '🏈 Kickoff'}
        </button>
        {activeRun && (
          <button
            onClick={startFresh}
            style={{ width: '100%', padding: '13px 0', background: '#21131a', border: `1px solid #4a2530`, color: FB.red, borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            Abandon & New Season
          </button>
        )}
        <button
          onClick={() => setShowHelp(true)}
          style={{ width: '100%', padding: '13px 0', background: '#141b24', border: `1px solid ${FB.border}`, color: FB.text, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          How to Play
        </button>
      </div>

      <button
        onClick={onClassic}
        style={{ background: 'none', border: 'none', color: FB.textFaint, fontSize: 11.5, marginTop: 16, cursor: 'pointer', textDecoration: 'underline', alignSelf: 'center' }}
      >
        Classic Slate Boss (DFS) →
      </button>

      <div style={{ fontSize: 10, color: '#2c3645', textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>
        Fictional football strategy game. No real teams or players. No real money. No prizes.
      </div>

      {showHelp && <FootballHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function Feature({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{ ...card(12), padding: '11px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 19 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: FB.text }}>{label}</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint }}>{sub}</div>
      </div>
    </div>
  );
}
