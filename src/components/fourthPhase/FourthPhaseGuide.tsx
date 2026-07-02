import { useState, type CSSProperties, type ReactNode } from 'react';
import { PHASE_COLOR } from '../../lib/fourthPhase';
import type { Phase, SituationKey } from '../../lib/fourthPhase';
import { FB, card, sectionLabel } from '../footballStyles';

// The "what am I doing" layer. None of this changes game logic — it surfaces the
// rules the engine already enforces (the four phase jobs and the situation
// ladder) so a new player can read the board instead of guessing.

interface PhaseJob {
  phase: Phase;
  short: string;
  job: string;
  detail: string;
}

const PHASE_JOBS: readonly PhaseJob[] = [
  { phase: 'offense', short: 'OFF', job: 'Yards', detail: 'The payload — moves the ball and supplies the base score.' },
  { phase: 'defense', short: 'DEF', job: 'Execution', detail: 'Reliability. Raises the multiplier floor, not fireworks.' },
  { phase: 'crowd', short: 'CRD', job: 'BigPlay', detail: 'Charges the Crowd Meter, then cashes it as your ceiling.' },
  { phase: 'specialTeams', short: 'ST', job: 'Fuel', detail: 'Off the equation: extra draws, money, and discounts.' },
];

interface SituationGuide {
  key: SituationKey;
  name: string;
  trigger: string;
  payoff: string;
  kind: 'apex' | 'score' | 'charge' | 'fuel' | 'bust';
}

// Ordered the way the recognizer checks them: best shape first.
const SITUATION_GUIDE: readonly SituationGuide[] = [
  { key: 'complementaryFootball', name: 'Complementary Football', trigger: 'All four phases present', payoff: 'Apex — boosts every term and cashes the meter', kind: 'apex' },
  { key: 'momentumShift', name: 'Momentum Shift', trigger: '2+ Offense and 2+ Defense', payoff: 'Solid score with a high floor', kind: 'score' },
  { key: 'houseCall', name: 'House Call', trigger: 'Offense + Crowd together', payoff: 'Cashes the Crowd Meter into a score', kind: 'score' },
  { key: 'pickSix', name: 'Pick Six', trigger: '2+ Defense and 1+ Offense (no Crowd)', payoff: 'Burst score and charges the meter', kind: 'score' },
  { key: 'blackout', name: 'The Blackout', trigger: '3+ Crowd', payoff: 'No score — charges the meter hard', kind: 'charge' },
  { key: 'fieldFlip', name: 'Field Flip', trigger: '2+ Special Teams', payoff: 'No score — draws, money, discounts', kind: 'fuel' },
  { key: 'stand', name: 'The Stand', trigger: '3+ Defense', payoff: 'Low score, very high Execution', kind: 'score' },
  { key: 'drive', name: 'The Drive', trigger: '3+ Offense', payoff: 'Score straight from Offense values', kind: 'score' },
  { key: 'checkdown', name: 'The Checkdown', trigger: '1–2 Offense only', payoff: 'Small safe score, saves the rest of your hand', kind: 'score' },
  { key: 'bustedPlay', name: 'Busted Play', trigger: 'No clean shape', payoff: 'Penalty — avoid this', kind: 'bust' },
];

const KIND_COLOR: Record<SituationGuide['kind'], string> = {
  apex: FB.gold,
  score: '#5fb4ff',
  charge: '#a987ff',
  fuel: '#f4c24f',
  bust: FB.red,
};

function Collapsible({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={{ ...card(8), padding: open ? 12 : '0', marginTop: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: open ? 0 : '12px',
        }}
      >
        <span style={{ ...sectionLabel, color: FB.gold }}>{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hint && <span style={{ fontSize: 10.5, color: FB.textFaint }}>{hint}</span>}
          <span style={{ fontSize: 12, color: FB.textDim, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}>▾</span>
        </span>
      </button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </section>
  );
}

// One glyph per phase so cards read as football jobs at a glance:
// Offense = ball, Defense = shield, Special Teams = goalpost, Crowd = noise bars.
// Shared by the legend here and every card face in FourthPhaseLab.
export function PhaseIcon({ phase, size = 12 }: { phase: Phase; size?: number }) {
  const common = {
    fill: 'none',
    stroke: PHASE_COLOR[phase],
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (phase === 'offense') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
        <ellipse cx="12" cy="12" rx="10" ry="6.2" {...common} />
        <path d="M8.5 12h7M10.5 10.3v3.4M13.5 10.3v3.4" {...common} strokeWidth={1.6} />
      </svg>
    );
  }
  if (phase === 'defense') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
        <path d="M12 3l7.5 3v5.2c0 4.6-3.1 7.6-7.5 9.3C7.6 18.8 4.5 15.8 4.5 11.2V6z" {...common} />
      </svg>
    );
  }
  if (phase === 'specialTeams') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
        <path d="M5 4v7M19 4v7M5 11h14M12 11v9M9.5 20h5" {...common} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" {...common} />
    </svg>
  );
}

export function PhaseLegend() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {PHASE_JOBS.map((entry) => (
        <div
          key={entry.phase}
          title={entry.detail}
          style={{
            border: `1px solid ${PHASE_COLOR[entry.phase]}`,
            borderRadius: 8,
            padding: '7px 6px',
            background: '#0e151d',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <PhaseIcon phase={entry.phase} size={11} />
            <span style={{ fontSize: 11, fontWeight: 950, color: PHASE_COLOR[entry.phase], letterSpacing: 0.5 }}>{entry.short}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: FB.text, marginTop: 2 }}>{entry.job}</div>
        </div>
      ))}
    </div>
  );
}

export function HowToPlay({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Collapsible title="How to play" hint="tap to expand" defaultOpen={defaultOpen}>
      <div style={{ display: 'grid', gap: 10 }}>
        <Step n="1" head="The goal">
          A game is <b>3 drives</b>. Each drive has a point target — hit it before you run out of plays. Clear all three to win.
        </Step>
        <Step n="2" head="Run a play">
          Tap up to <b>5 cards</b> from your hand, then <b>Run Play</b>. The phases you combine form a <b>Situation</b> that decides the score.
        </Step>
        <Step n="3" head="The four phases">
          <div style={{ marginTop: 6 }}><PhaseLegend /></div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: FB.textDim, fontFamily: 'inherit' }}>
            Score = <b style={{ color: '#5fb4ff' }}>Yards</b> × (1 + <b style={{ color: '#ff7c93' }}>Execution</b>) × <b style={{ color: '#f4c24f' }}>BigPlay</b>
          </div>
        </Step>
        <Step n="4" head="The Crowd Meter">
          <b>Crowd</b> cards charge the meter instead of scoring. A scoring play <b>cashes</b> it into BigPlay — so build the meter first, then cash it. Order matters: <b>cards on the left resolve first</b>, so put Crowd before Offense.
        </Step>
      </div>
    </Collapsible>
  );
}

function Step({ n, head, children }: { n: string; head: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <div
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: 11,
          background: FB.goldSoft,
          color: FB.gold,
          fontSize: 12,
          fontWeight: 950,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.45 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: FB.text, marginBottom: 2 }}>{head}</div>
        {children}
      </div>
    </div>
  );
}

export function SituationsPanel({ activeKey, defaultOpen = false }: { activeKey?: SituationKey; defaultOpen?: boolean }) {
  return (
    <Collapsible title="Situations (the hands)" hint="what to build" defaultOpen={defaultOpen}>
      <div style={{ display: 'grid', gap: 5 }}>
        {SITUATION_GUIDE.map((entry) => {
          const active = entry.key === activeKey;
          return (
            <div
              key={entry.key}
              style={{
                ...situationRow,
                borderColor: active ? KIND_COLOR[entry.kind] : FB.border,
                background: active ? 'rgba(255,255,255,0.05)' : '#0e151d',
                boxShadow: active ? `0 0 0 1px ${KIND_COLOR[entry.kind]}` : 'none',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 950, color: KIND_COLOR[entry.kind] }}>{entry.name}</span>
              <span style={{ fontSize: 10.5, color: FB.textDim, textAlign: 'right' }}>{entry.trigger}</span>
              <span style={{ gridColumn: '1 / -1', fontSize: 10.5, color: FB.textFaint }}>{entry.payoff}</span>
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}

const situationRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '2px 8px',
  alignItems: 'baseline',
  border: '1px solid',
  borderRadius: 8,
  padding: '7px 9px',
};
