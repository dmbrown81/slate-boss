import { EFFECT_VERB_COLOR, FP as FB, FP_RADIUS, btnGhost, card, sectionLabel } from './fourthPhaseStyles';
import {
  comboLedgerEntries,
  formatMeter,
  type FourthPhaseScoreResult,
  type PlayEffectVerb,
} from '../../lib/fourthPhase';

// A cold player learns "this call CASHES / BUILDS / SETS UP" before they learn
// any formal Situation names.
export function EffectVerbChip({ verb }: { verb: PlayEffectVerb }) {
  const color = EFFECT_VERB_COLOR[verb];
  return (
    <span
      style={{
        border: `1px solid ${color}`,
        borderRadius: FP_RADIUS.badge,
        color,
        background: 'rgba(7,11,16,0.56)',
        fontSize: 10,
        fontWeight: 950,
        letterSpacing: 0.4,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {verb}
    </span>
  );
}

// Combo badges styled as stickers slapped on the binder page.
export function ComboChips({ entries }: { entries: ReturnType<typeof comboLedgerEntries> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '-2px 0 8px' }}>
      {entries.map((entry, index) => (
        <span
          key={`${entry.label}-${index}`}
          className="fp-sticker"
          title={entry.detail}
          style={{ fontSize: 9, letterSpacing: 0.5, whiteSpace: 'nowrap', transform: `rotate(${index % 2 === 0 ? -1 : 0.8}deg)` }}
        >
          {entry.label}
        </span>
      ))}
    </div>
  );
}

// "After this: 120 to clear, 5 calls left" — the preview answers the objective,
// not just the score.
function AfterThisLine({ points, targetRemaining, playsLeft }: { points: number; targetRemaining: number; playsLeft: number }) {
  const clears = points >= targetRemaining;
  const remainingAfter = Math.max(0, targetRemaining - points);
  const playsAfter = Math.max(0, playsLeft - 1);
  return (
    <div style={{ fontSize: 11, color: clears ? FB.gold : FB.textFaint, fontWeight: clears ? 950 : 800, marginTop: 8 }}>
      {clears
        ? 'This series clears the drive.'
        : `After this: ${remainingAfter} to clear, ${playsAfter} ${playsAfter === 1 ? 'call' : 'calls'} left.`}
    </div>
  );
}

// The "This series" card: live score preview, transparent math line, and every
// warning that must land BEFORE the player commits (bust, boss, meter bleed,
// better ordering). Preview and execution score through the same context, so
// everything shown here is exact, not an estimate.
export function SeriesPreviewPanel({
  preview,
  previewVerb,
  lastPlay,
  coachMode,
  bossWarning,
  previewBleeds,
  reorderHint,
  hideReorderDelta,
  onCoachOrder,
  targetRemaining,
  playsLeft,
}: {
  preview: FourthPhaseScoreResult | null;
  previewVerb: PlayEffectVerb | null;
  lastPlay?: FourthPhaseScoreResult;
  coachMode: boolean;
  bossWarning: string | null;
  previewBleeds: boolean;
  reorderHint: { delta: number; unlocksCash: boolean } | null;
  /** Pro and above: the coach points at a better order but stops selling the
   *  exact answer — discovery is the reward (2026-07-10 fun audit). */
  hideReorderDelta?: boolean;
  onCoachOrder: () => void;
  targetRemaining: number;
  playsLeft: number;
}) {
  return (
    <section style={{ ...card(), padding: 12, marginTop: 10, borderColor: preview?.didCash ? FB.gold : preview?.bust ? 'rgba(240,117,138,0.55)' : FB.border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
        <div style={sectionLabel}>This series</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, flexWrap: 'wrap' }}>
            {previewVerb && <EffectVerbChip verb={previewVerb} />}
            <div style={{ fontSize: 15, color: FB.text, fontWeight: 950 }}>
              {preview
                ? preview.situation.label
                : lastPlay
                  ? `Last: ${lastPlay.situation.label} | ${lastPlay.points}`
                  : 'No series selected'}
            </div>
          </div>
        </div>
        <div className="fb-num" style={{ fontSize: 30, color: preview?.didCash ? FB.gold : FB.text, fontWeight: 950 }}>
          {preview ? preview.points : 0}
        </div>
      </div>
      {preview && (
        <>
          {/* Run one stays in two nouns (Yards, Momentum); the full equation
              with Leverage/Explosive appears once the tutorial is done. */}
          {!coachMode && <div style={{ fontSize: 11.5, color: FB.textDim, fontWeight: 850, marginTop: 8 }}>
            <span className="fb-num" style={{ color: '#5fb4ff' }}>{preview.yards} Yards</span>
            {' × '}
            <span className="fb-num" style={{ color: '#ff7c93' }}>{Math.max(0.1, 1 + preview.execution).toFixed(2)} Leverage</span>
            {' × '}
            <span className="fb-num" style={{ color: '#f4c24f' }}>{preview.bigPlay.toFixed(2)} Explosive</span>
            {' = '}
            <span className="fb-num" style={{ color: FB.text }}>{preview.points}</span>
          </div>}
          {preview.bust && (
            <div style={{ fontSize: 11, color: FB.red, fontWeight: 800, marginTop: 8 }}>
              Bad call: these phases make no clean series. Penalty score and momentum bleeds.
            </div>
          )}
          {bossWarning && (
            <div style={{ fontSize: 11, color: FB.red, fontWeight: 900, marginTop: 8 }}>
              {bossWarning}
            </div>
          )}
          {previewBleeds && (
            <div style={{ border: `1px solid rgba(169,135,255,0.5)`, borderRadius: 8, color: '#cbbdff', background: 'rgba(169,135,255,0.08)', padding: '7px 9px', fontSize: 11, fontWeight: 850, marginTop: 8 }}>
              Hot momentum ignored: it bleeds to {formatMeter(preview.meterAfter)} if you run this. Add Offense to cash it instead.
            </div>
          )}
          {reorderHint && (
            <button
              onClick={onCoachOrder}
              style={{ ...btnGhost, width: '100%', marginTop: 8, borderColor: FB.gold, color: FB.gold }}
            >
              {hideReorderDelta
                ? (reorderHint.unlocksCash ? 'Coach sees a cash in this hand' : 'Coach sees a better order')
                : `${reorderHint.unlocksCash ? 'Reorder to cash momentum' : 'Better order available'}: +${reorderHint.delta} points`}
            </button>
          )}
          <AfterThisLine points={preview.points} targetRemaining={targetRemaining} playsLeft={playsLeft} />
        </>
      )}
    </section>
  );
}
