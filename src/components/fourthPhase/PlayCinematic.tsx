import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FP as FB, FP_FONT_HEAD, FP_RADIUS, FP_STOCK, PHASE_BAND } from './fourthPhaseStyles';
import { PHASE_SHORT, formatMeter, type FourthPhaseCard, type FourthPhaseScoreResult } from '../../lib/fourthPhase';
import { playFeel, playRoar, type FourthPhaseFeelPrefs } from './fpFeedback';

// ---------------------------------------------------------------------------
// "The Play Unfolds" — the signature cash-in, staged as a moment instead of a
// state update. Pure presentation: the result is already scored and applied
// underneath; this overlay just narrates it. Cards slam in left to right, the
// equation builds term by term, a beat of hit-stop, then the meter drains into
// a counting score while the crowd roars. Tap anywhere to skip. The Lab only
// mounts this for signature cash-ins (once per drive, never in the tutorial,
// never under prefers-reduced-motion).
// ---------------------------------------------------------------------------

interface Props {
  cards: readonly FourthPhaseCard[];
  result: FourthPhaseScoreResult;
  prefs: FourthPhaseFeelPrefs;
  onDone: () => void;
}

const CARD_STEP_MS = 150;
const EQ_STEP_MS = 190;
const HIT_STOP_MS = 280;
const COUNT_MS = 480;
const HOLD_MS = 950;

export default function PlayCinematic({ cards, result, prefs, onDone }: Props) {
  const eqStartMs = cards.length * CARD_STEP_MS + 160;
  const payoffAtMs = eqStartMs + EQ_STEP_MS * 3 + HIT_STOP_MS;
  const [payoff, setPayoff] = useState(false);
  const [shownPoints, setShownPoints] = useState(0);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef(0);
  const doneRef = useRef(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    cancelAnimationFrame(rafRef.current);
    onDone();
  }

  useEffect(() => {
    const timers = timersRef.current;
    cards.forEach((_, index) => {
      timers.push(window.setTimeout(() => playFeel('card_tap', prefs), index * CARD_STEP_MS));
    });
    timers.push(window.setTimeout(() => {
      setPayoff(true);
      playFeel('big_cash', prefs);
      playRoar(prefs);
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / COUNT_MS);
        setShownPoints(Math.round(result.points * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }, payoffAtMs));
    timers.push(window.setTimeout(finish, payoffAtMs + COUNT_MS + HOLD_MS));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeline runs exactly once per mount
  }, []);

  const terms = [
    { text: `${result.yards} Yards`, color: '#5fb4ff' },
    { text: `× ${Math.max(0.1, 1 + result.execution).toFixed(2)} Leverage`, color: '#ff7c93' },
    { text: `× ${result.bigPlay.toFixed(2)} Explosive`, color: '#f4c24f' },
  ];

  return (
    <div
      onPointerDown={finish}
      role="dialog"
      aria-label={`${result.situation.label} for ${result.points}`}
      style={overlay}
      className="fp-cin-overlay"
    >
      <div style={{ width: 'min(92vw, 430px)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, flexWrap: 'wrap' }}>
          {cards.map((card, index) => {
            const cashes = result.cashesAtCardIndex === index;
            return (
              <div
                key={card.id}
                className="fp-cin-card"
                style={{
                  ...cinCard,
                  animationDelay: `${index * CARD_STEP_MS}ms`,
                  boxShadow: cashes && payoff
                    ? '0 0 0 2px rgba(242,189,61,0.9), 0 0 26px rgba(242,189,61,0.55)'
                    : '0 8px 18px -8px rgba(0,0,0,0.8)',
                }}
              >
                <div style={{ background: PHASE_BAND[card.phase], display: 'flex', justifyContent: 'space-between', padding: '2px 6px' }}>
                  <span className="fb-num" style={{ fontSize: 13, fontWeight: 950, color: '#f6f2e8' }}>{card.rank}</span>
                  <span style={{ fontSize: 8, fontWeight: 950, color: '#f6f2e8', letterSpacing: 0.5, alignSelf: 'center' }}>{PHASE_SHORT[card.phase]}</span>
                </div>
                <div style={{ padding: '5px 6px 6px' }}>
                  <div style={{ fontFamily: FP_FONT_HEAD, fontSize: 9, fontWeight: 900, color: FP_STOCK.ink, lineHeight: 1.05, textTransform: 'uppercase' }}>
                    {card.roleName}
                  </div>
                  {cashes && (
                    <div style={{ fontSize: 7.5, fontWeight: 950, color: '#8a6a1e', marginTop: 3, letterSpacing: 0.8 }}>CASH</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, minHeight: 22 }}>
          {terms.map((term, index) => (
            <span
              key={term.text}
              className="fp-cin-term"
              style={{ animationDelay: `${eqStartMs + index * EQ_STEP_MS}ms`, color: term.color, fontSize: 15, fontWeight: 950, margin: '0 4px' }}
            >
              <span className="fb-num">{term.text}</span>
            </span>
          ))}
        </div>

        {/* The momentum bar drains into the score: the multiplier the Crowd
            built is visibly spent on this snap. */}
        <div style={{ position: 'relative', height: 12, borderRadius: 6, background: '#181420', border: '1px solid #322b48', overflow: 'hidden', marginTop: 16 }}>
          <div
            className={payoff ? 'fp-cin-drain' : undefined}
            style={{ position: 'absolute', inset: 0, width: '100%', background: 'linear-gradient(90deg,#4f9cff,#ad91ff,#f2bd3d)' }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#cbbdff', fontWeight: 850, marginTop: 5 }}>
          {formatMeter(result.meterAfterCash)} momentum {'→'} cashed on the snap
        </div>

        <div style={{ marginTop: 14, minHeight: 118 }}>
          {payoff && (
            <>
              <div className="fb-led fp-cin-score" style={{ fontSize: 64, color: FB.gold, fontWeight: 950, lineHeight: 0.95, textShadow: '0 0 34px rgba(242,189,61,0.45)' }}>
                +{shownPoints}
              </div>
              <div className="fp-head fp-verdict-stamp" style={{ fontSize: 21, color: FB.gold, fontWeight: 900, marginTop: 12 }}>
                {result.situation.label.toUpperCase()}
              </div>
            </>
          )}
        </div>

        <div style={{ fontSize: 9.5, color: FB.textFaint, fontWeight: 800, letterSpacing: 1, marginTop: 10 }}>TAP TO SKIP</div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 90,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(5,7,11,0.9)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  cursor: 'pointer',
};

const cinCard: CSSProperties = {
  width: 66,
  borderRadius: FP_RADIUS.card,
  background: FP_STOCK.face,
  border: `1px solid ${FP_STOCK.line}`,
  overflow: 'hidden',
  textAlign: 'left',
};
