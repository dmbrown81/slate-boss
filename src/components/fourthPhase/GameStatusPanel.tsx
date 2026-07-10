import type { CSSProperties, ReactNode } from 'react';
import {
  FP as FB,
  FP_RADIUS,
  card,
  sectionLabel,
  statTile,
} from './fourthPhaseStyles';
import { PhaseIcon } from './FourthPhaseGuide';
import { FootballGlyph } from './fpShared';
import { BASE_METER, formatMeter, type FourthPhaseBossProfile } from '../../lib/fourthPhase';

/** In-run phases of the Lab state machine. Owned here because every consumer
 *  of the status panel needs it; the Lab re-exports for its own state type. */
export type LabPhase = 'play' | 'warRoom' | 'won' | 'lost';

function meterStyle(meter: number, cap: number): CSSProperties {
  const tightness = cap <= BASE_METER ? 0 : (meter - BASE_METER) / (cap - BASE_METER);
  const glow = 0.16 + Math.max(0, Math.min(1, tightness)) * 0.58;
  return {
    boxShadow: `0 0 ${18 + tightness * 36}px rgba(169,135,255,${glow})`,
    borderColor: `rgba(169,135,255,${0.45 + glow * 0.45})`,
  };
}

// The one sentence a cold player must never lose: what to score, in how many
// calls, and the loop that gets them there. Lives at the top of the status panel
// and restates itself for the War Room and end states.
function ObjectiveHeader({
  labPhase,
  driveIndex,
  drives,
  targetRemaining,
  playsLeft,
  meterHot,
  meterWillCash,
}: {
  labPhase: LabPhase;
  driveIndex: number;
  drives: number;
  targetRemaining: number;
  playsLeft: number;
  meterHot: boolean;
  meterWillCash: boolean;
}) {
  let headline: ReactNode;
  let hint: ReactNode = null;
  if (labPhase === 'warRoom') {
    headline = <>Drive {driveIndex + 1} cleared. Draft help for Drive {driveIndex + 2}.</>;
  } else if (labPhase === 'won') {
    headline = <>All {drives} drives cleared. Run won.</>;
  } else if (labPhase === 'lost') {
    headline = <>Run over: the drive stalled {targetRemaining} short.</>;
  } else {
    headline = (
      <>
        Drive {driveIndex + 1} of {drives}: score{' '}
        <span className="fb-num" style={{ color: FB.gold }}>{targetRemaining}</span> more in{' '}
        <span className="fb-num" style={{ color: playsLeft <= 2 ? FB.red : FB.green }}>{playsLeft}</span>{' '}
        {playsLeft === 1 ? 'call' : 'calls'}
      </>
    );
    hint = meterWillCash ? (
      <>This call <b style={{ color: FB.gold }}>cashes momentum</b>. Run it.</>
    ) : meterHot ? (
      <>Momentum is hot: <b style={{ color: '#5fb4ff' }}>Offense</b> cashes it now.</>
    ) : (
      <>Build <b style={{ color: '#a987ff' }}>Crowd</b> {'→'} cash with <b style={{ color: '#5fb4ff' }}>Offense</b>.</>
    );
  }
  return (
    <div style={{ borderBottom: `1px solid ${FB.borderSoft}`, paddingBottom: 8 }}>
      <div style={{ fontSize: 14.5, color: FB.text, fontWeight: 950, lineHeight: 1.25 }}>{headline}</div>
      {hint && <div style={{ fontSize: 11.5, color: FB.textDim, fontWeight: 850, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

// Drive progress drawn as a field: turf bands, yard lines, hash marks, a striped
// end zone, and the ball marching toward the goal line as driveScore climbs.
// Pure presentation. Progress is the same driveScore/target ratio as before.
// `surgeKey` fires the breakaway streak when a single series rips 100+ points.
function FieldProgress({ progress, surgeKey }: { progress: number; surgeKey: number | null }) {
  const pos = Math.min(1, Math.max(0, progress));
  return (
    <div
      style={{
        position: 'relative',
        height: 46,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1d3527',
        marginTop: 10,
        background: 'repeating-linear-gradient(90deg, #0c1f14 0px, #0c1f14 22px, #102a1b 22px, #102a1b 44px)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.13) 0px, rgba(255,255,255,0.13) 1px, transparent 1px, transparent 8.8%)' }} />
      <div style={{ position: 'absolute', top: '32%', bottom: '32%', left: 0, right: '12%', backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, transparent 1px, transparent 11px)', opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(pos * 88).toFixed(2)}%`, background: 'linear-gradient(90deg, rgba(52,199,113,0.10), rgba(240,180,41,0.22))', transition: 'width 400ms ease-out' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '12%', background: 'repeating-linear-gradient(45deg, #251f07 0px, #251f07 5px, #2e2609 5px, #2e2609 10px)', borderLeft: '2px solid rgba(240,180,41,0.85)', display: 'grid', placeItems: 'center' }}>
        <span style={{ fontSize: 8.5, fontWeight: 950, color: FB.gold, letterSpacing: 0, writingMode: 'vertical-rl' }}>GOAL</span>
      </div>
      {surgeKey != null && <div key={surgeKey} className="fp-breakaway-streak" aria-hidden="true" />}
      <div style={{ position: 'absolute', top: '50%', left: `${(2 + pos * 86).toFixed(2)}%`, transform: 'translate(-50%, -50%)', transition: 'left 400ms cubic-bezier(.2,.9,.3,1.15)', filter: surgeKey != null ? 'drop-shadow(0 0 8px rgba(242,189,61,0.9))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))' }}>
        <FootballGlyph size={20} />
      </div>
    </div>
  );
}

export function GameStatusPanel({
  labPhase,
  driveIndex,
  drives,
  driveScore,
  target,
  targetRemaining,
  progress,
  meter,
  meterCap,
  meterFill,
  meterHint,
  meterHot,
  meterWillCash,
  playsLeft,
  maxPlays,
  coachMode,
  hideMeter,
  activeBoss,
  scoutingBoss,
  bossArrivesDrive,
  gain,
}: {
  labPhase: LabPhase;
  driveIndex: number;
  drives: number;
  driveScore: number;
  target: number;
  targetRemaining: number;
  progress: number;
  meter: number;
  meterCap: number;
  meterFill: number;
  meterHint: string;
  meterHot: boolean;
  meterWillCash: boolean;
  playsLeft: number;
  maxPlays: number;
  coachMode: boolean;
  /** Tutorial step 0: momentum hasn't been introduced yet, so the tile hides. */
  hideMeter?: boolean;
  activeBoss: FourthPhaseBossProfile | null;
  scoutingBoss: FourthPhaseBossProfile | null;
  bossArrivesDrive: number;
  /** Last series' points, floated over the drive target right after Run Series. */
  gain: { points: number; cashed: boolean; key: number } | null;
}) {
  const pressureLabel = coachMode ? 'Coach Mode' : activeBoss ? 'Boss Active' : 'Scouting';
  const pressureColor = coachMode ? FB.green : activeBoss ? FB.red : FB.gold;
  const pressureBody = coachMode
    ? 'Learn the call sheet first.'
    : activeBoss
      ? `${activeBoss.name}: ${activeBoss.effect}`
      : scoutingBoss
        ? `Drive ${bossArrivesDrive}: ${scoutingBoss.name}. ${scoutingBoss.effect}`
        : 'Open field. No boss pressure.';

  return (
    <section style={{ ...card(), ...meterStyle(meter, meterCap), padding: 12, overflow: 'hidden', position: 'relative', background: 'linear-gradient(180deg,#1a1f2a,#10141c)', marginTop: 2 }}>
      <div className="fb-yard" style={{ position: 'absolute', inset: 0, opacity: 0.32 }} />
      <div style={{ position: 'relative', display: 'grid', gap: 10 }}>
        <ObjectiveHeader
          labPhase={labPhase}
          driveIndex={driveIndex}
          drives={drives}
          targetRemaining={targetRemaining}
          playsLeft={playsLeft}
          meterHot={meterHot}
          meterWillCash={meterWillCash}
        />
        <div style={{ display: 'grid', gridTemplateColumns: hideMeter ? 'minmax(0, 1fr)' : 'minmax(0, 1.05fr) minmax(132px, .95fr)', gap: 8, alignItems: 'stretch' }}>
          <div style={{ ...statTile, background: 'rgba(7,11,16,0.74)', position: 'relative' }}>
            <div style={{ ...sectionLabel, color: FB.textDim }}>Drive Target</div>
            {gain && gain.points > 0 && (
              <span
                key={gain.key}
                className="fb-num fp-float-gain"
                aria-hidden="true"
                style={{ fontSize: 19, fontWeight: 950, color: gain.cashed ? FB.gold : FB.green, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
              >
                +{gain.points}
              </span>
            )}
            <div key={driveScore} className="fb-led fb-pop" style={{ fontSize: 31, color: FB.text, fontWeight: 950, lineHeight: 0.95, marginTop: 3 }}>
              {driveScore}<span style={{ fontSize: 14, color: FB.textFaint }}> / {target}</span>
            </div>
            <FieldProgress progress={progress} surgeKey={gain && gain.points >= 100 ? gain.key : null} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 7 }}>
              <span style={{ fontSize: 10.5, color: FB.textFaint }}>{targetRemaining} left</span>
              <span style={{ fontSize: 10.5, color: FB.textDim, fontWeight: 850 }}>{playsLeft} calls</span>
            </div>
          </div>

          {!hideMeter && <div style={{ ...statTile, background: meterWillCash ? 'linear-gradient(180deg,#282009,#0a0f16)' : 'rgba(7,11,16,0.74)', borderColor: meterWillCash ? FB.gold : meterHot ? '#4e426f' : FB.borderSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <PhaseIcon phase="crowd" size={12} />
                <div style={{ ...sectionLabel, color: meterWillCash ? FB.gold : '#cbbdff' }}>Momentum</div>
              </div>
              <div key={formatMeter(meter)} className="fb-led fb-pop" style={{ fontSize: 22, color: meterWillCash ? FB.gold : '#efe9ff', fontWeight: 950, lineHeight: 1 }}>
                {formatMeter(meter)}
              </div>
            </div>
            <div style={{ position: 'relative', height: 15, borderRadius: FP_RADIUS.card, background: '#181420', border: '1px solid #322b48', overflow: 'hidden', marginTop: 9 }}>
              <div style={{ width: `${meterFill * 100}%`, height: '100%', background: 'linear-gradient(90deg,#4f9cff,#ad91ff,#f2bd3d)', transition: 'width 180ms ease-out' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent calc(6.25% - 2px), #0a0d13 calc(6.25% - 2px), #0a0d13 6.25%)' }} />
            </div>
            <div style={{ display: 'grid', gap: 3, marginTop: 7 }}>
              <span style={{ color: FB.textFaint, fontSize: 10 }}>cap {formatMeter(meterCap)}</span>
              <span style={{ color: meterWillCash ? FB.gold : meterHot ? '#cbbdff' : FB.textDim, fontSize: 10.5, fontWeight: 850, lineHeight: 1.25 }}>{meterHint}</span>
            </div>
          </div>}
        </div>

        <div style={{ border: `1px solid ${activeBoss ? 'rgba(240,117,138,0.55)' : coachMode ? 'rgba(73,209,126,0.45)' : 'rgba(242,189,61,0.42)'}`, borderRadius: FP_RADIUS.card, background: activeBoss ? 'rgba(240,117,138,0.08)' : 'rgba(242,189,61,0.07)', padding: '8px 9px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 9, alignItems: 'baseline' }}>
          <span style={{ ...sectionLabel, color: pressureColor, whiteSpace: 'nowrap' }}>{pressureLabel}</span>
          <span style={{ color: activeBoss ? '#ff9aac' : FB.textDim, fontSize: 11, fontWeight: 850, lineHeight: 1.3 }}>{pressureBody}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
          {Array.from({ length: maxPlays }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                width: 13,
                height: 5,
                borderRadius: 2,
                background: i < playsLeft ? FB.green : '#1c232e',
                border: `1px solid ${i < playsLeft ? '#1f6b44' : '#232c38'}`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
