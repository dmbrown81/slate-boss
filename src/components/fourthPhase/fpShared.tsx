import type { ReactNode } from 'react';
import {
  FP as FB,
  FP_FONT_HEAD,
  FP_RADIUS,
  btnGhost,
  statTile,
  tapeLabel,
} from './fourthPhaseStyles';
import { fourthPhaseStake } from '../../lib/fourthPhase';

export function Shell({ impactClass, children }: { impactClass?: string; children: ReactNode }) {
  return (
    <div className={impactClass ? `fp-shell ${impactClass}` : 'fp-shell'} style={{ minHeight: '100svh', padding: '10px 12px 96px' }}>
      <div className="fp-screen-in fp-table-col" style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

// Fictional team-patch emblem: a stitched shield with a monogram. Pure
// decoration for playbook inserts and the binder cover — no real-team marks.
export function PatchEmblem({ accent, initials, size = 44 }: { accent: string; initials: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M24 3l17 5v14c0 11-7.2 18.6-17 23C14.2 40.6 7 33 7 22V8z" fill="#1d2129" stroke={accent} strokeWidth="2" />
      <path d="M24 7.4l13.4 4V22c0 8.9-5.7 15.2-13.4 19C16.3 37.2 10.6 30.9 10.6 22V11.4z" fill="none" stroke={accent} strokeWidth="1" opacity="0.55" strokeDasharray="2.5 2" />
      <text x="24" y="28" textAnchor="middle" fontSize="13" fontWeight="900" fill={accent} fontFamily={FP_FONT_HEAD}>{initials}</text>
    </svg>
  );
}

export function FootballGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.62)} viewBox="0 0 24 15" aria-hidden="true" style={{ display: 'block' }}>
      <ellipse cx="12" cy="7.5" rx="11" ry="6.8" fill="#7a4a20" stroke="#3d2510" strokeWidth="1" />
      <path d="M7.5 7.5h9" stroke="#f2ede4" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.3 5.8v3.4M11.2 5.5v4M13 5.5v4M14.8 5.8v3.4" stroke="#f2ede4" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Metric({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div style={{ ...statTile }}>
      <div style={{ fontSize: 10, color: FB.textFaint, fontWeight: 900 }}>{label}</div>
      <div className="fb-num" style={{ fontSize: small ? 12 : 16, color, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

export function StakeBadge({ level }: { level: number }) {
  const stake = fourthPhaseStake(level);
  return (
    <span style={{ fontSize: 9, fontWeight: 950, color: stake.color, border: `1px solid ${stake.color}`, borderRadius: FP_RADIUS.pill, padding: '1px 7px', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>
      {stake.shortName.toUpperCase()}
    </span>
  );
}

export function SoundToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      aria-pressed={on}
      title={on ? 'Sound on' : 'Sound off'}
      style={{ ...btnGhost, minWidth: 40, padding: '0 8px', fontSize: 14, color: on ? FB.gold : FB.textFaint }}
    >
      {on ? '\u{1F50A}' : '\u{1F507}'}
    </button>
  );
}

export function GameHeader({ runCode, stakeLevel, soundOn, onToggleSound, onTitle, onNewRun }: { runCode: string; stakeLevel: number; soundOn: boolean; onToggleSound: () => void; onTitle: () => void; onNewRun: () => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
      <button onClick={onTitle} style={{ ...btnGhost, minWidth: 64 }}>Home</button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <FootballGlyph size={14} />
          <span className="fp-head" style={{ fontSize: 12, color: FB.gold, fontWeight: 900, letterSpacing: 2 }}>Fourth Phase</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ ...tapeLabel, fontSize: 9 }}>{runCode}</span>
          <StakeBadge level={stakeLevel} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <SoundToggle on={soundOn} onToggle={onToggleSound} />
        <button onClick={onNewRun} style={{ ...btnGhost }}>New run</button>
      </div>
    </header>
  );
}

export function UnlockBanner({ title, detail, color }: { title: string; detail: string; color: string }) {
  return (
    <div className="fp-resolve" style={{ border: `1px solid ${color}`, borderRadius: FP_RADIUS.card, background: 'rgba(242,189,61,0.07)', padding: '9px 10px', marginTop: 10, textAlign: 'left' }}>
      <div style={{ fontSize: 11.5, color, fontWeight: 950 }}>{title}</div>
      <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3, lineHeight: 1.35 }}>{detail}</div>
    </div>
  );
}
