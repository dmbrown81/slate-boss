import type { CSSProperties } from 'react';
import { FP as FB, FP_RADIUS, btnGhost, card, sectionLabel } from './fourthPhaseStyles';
import { Metric } from './fpShared';
import { formatMeter } from '../../lib/fourthPhase';
import type { CashInSnapshot, PlayResolution } from './fpLabLogic';

// ---------------------------------------------------------------------------
// The feedback layer: everything the game says back after Run Series — the
// staged score breakdown, the coach's diagnosis, the CASHED celebration card,
// and the drive-cleared banner. All pure presentation; the logic that decides
// what to show (buildResolution, evaluateCashIn, diagnoseWeakSeries) lives in
// fpLabLogic.
// ---------------------------------------------------------------------------

// The staged "Series Result" breakdown that lands right after Run Series.
export function ResolutionCard({ resolution }: { resolution: PlayResolution }) {
  return (
    <section key={resolution.key} className={resolution.impact === 'normal' ? 'fp-resolve' : 'fp-resolve fp-resolve-cash'} style={{ ...card(), padding: 12, marginTop: 10, borderColor: resolution.impact === 'normal' ? FB.border : FB.gold, background: resolution.impact === 'normal' ? FB.panelSoft : 'linear-gradient(135deg,#2e2410,#171c26)' }}>
      <div style={{ ...sectionLabel, color: resolution.impact === 'normal' ? FB.textFaint : FB.gold }}>Series Result</div>
      <div style={{ fontSize: 12, color: FB.text, fontWeight: 900, marginTop: 5 }}>{resolution.explanation}</div>
      {resolution.bossLine && (
        <div style={{ fontSize: 11.5, color: '#ff9aac', fontWeight: 850, fontStyle: 'italic', marginTop: 5 }}>
          {'“'}{resolution.bossLine}{'”'}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resolution.stages.length}, minmax(0, 1fr))`, gap: 6, marginTop: 10 }}>
        {resolution.stages.map((stage, index) => (
          <div key={`${stage.label}-${index}`} className="fp-stage" style={{ '--fp-stage-delay': `${index * 90}ms`, border: `1px solid ${FB.border}`, borderRadius: 8, padding: '7px 6px', background: FB.inset } as CSSProperties}>
            <div style={{ fontSize: 9.5, color: FB.textFaint, fontWeight: 900 }}>{stage.label}</div>
            <div className="fb-num" style={{ fontSize: 15, color: stage.color, fontWeight: 950 }}>{stage.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// The coach naming what went wrong in one sentence (diagnoseWeakSeries output).
export function CoachDiagnosisCard({ text }: { text: string }) {
  return (
    <section className="fp-resolve" style={{ ...card(), padding: '10px 12px', marginTop: 10, borderColor: 'rgba(242,189,61,0.5)', background: 'rgba(242,189,61,0.06)' }}>
      <div style={{ ...sectionLabel, color: FB.gold }}>Coach</div>
      <div style={{ fontSize: 12, color: FB.text, fontWeight: 850, lineHeight: 1.4, marginTop: 4 }}>{text}</div>
    </section>
  );
}

// The CASHED celebration card: the run's signature moment, share-ready.
export function CashInCard({
  cashIn,
  runCode,
  teamShort,
  jokerNames,
  copied,
  onCopy,
}: {
  cashIn: CashInSnapshot;
  runCode: string;
  teamShort: string;
  jokerNames: string[];
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section
      key={`${cashIn.points}:${cashIn.situation}:${cashIn.reason}`}
      style={{ ...card(), padding: 13, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(135deg,#33260e,#1b202b)', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
        <div>
          <div className="fp-cashed-stamp" style={{ display: 'inline-block', border: `2px solid ${FB.gold}`, borderRadius: 6, color: FB.gold, padding: '3px 9px', fontSize: 13, fontWeight: 950, letterSpacing: 1.5 }}>
            CASHED
          </div>
          <div style={{ fontSize: 12, color: FB.text, fontWeight: 900, marginTop: 6 }}>{cashIn.reason}</div>
        </div>
        <div style={{ border: `1px solid rgba(242,189,61,0.55)`, borderRadius: FP_RADIUS.pill, color: FB.gold, padding: '4px 8px', fontSize: 10, fontWeight: 950, whiteSpace: 'nowrap' }}>
          {formatMeter(cashIn.meter)} momentum -&gt; Explosive x{cashIn.bigPlay.toFixed(2)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 12, alignItems: 'end', marginTop: 8 }}>
        <div className="fb-num fp-points-land" style={{ fontSize: 58, color: FB.gold, fontWeight: 950, lineHeight: 0.88 }}>{cashIn.points}</div>
        <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: FB.text, fontWeight: 950, lineHeight: 1.15 }}>{cashIn.situation}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Metric label="Momentum" value={formatMeter(cashIn.meter)} color="#cbbdff" />
            <Metric label="Run" value={runCode} color={FB.text} small />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 8, lineHeight: 1.3 }}>
        {teamShort} | {jokerNames.join(' / ') || 'No jokers'}
      </div>
      <button onClick={onCopy} style={{ ...btnGhost, width: '100%', marginTop: 10, borderColor: 'rgba(242,189,61,0.55)', color: FB.gold }}>
        {copied ? 'Copied' : 'Copy cash card'}
      </button>
    </section>
  );
}

// Held beat when a mid-run drive clears (unless the cinematic owns the moment).
// The stamp names the drive's character: WALK-OFF, ESCAPED, STATEMENT DRIVE...
export function DriveBannerOverlay({ drive, score, stamp }: { drive: number; score: number; stamp?: string }) {
  return (
    <div className="fp-drive-banner" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', background: 'rgba(5,7,11,0.82)', pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center' }}>
        {stamp && (
          <div className="fp-head" style={{ fontSize: 15, color: FB.gold, fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>
            {stamp}
          </div>
        )}
        <div className="fp-head fp-verdict-stamp" style={{ fontSize: 30, color: FB.green, fontWeight: 900 }}>
          DRIVE {drive} CLEARED
        </div>
        <div className="fb-led" style={{ fontSize: 20, color: FB.text, fontWeight: 950, marginTop: 12 }}>
          {score} posted
        </div>
      </div>
    </div>
  );
}
