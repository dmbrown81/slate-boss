import { PHASE_INK } from './fourthPhaseStyles';
import type { FourthPhaseCard, Phase } from '../../lib/fourthPhase';

// ---------------------------------------------------------------------------
// Procedural card art. Vintage trading-card ink illustrations, drawn as inline
// SVG in each phase's dark "ink" tone so they print correctly on light card
// stock. No image assets, no network: everything ships in the bundle and
// renders identically offline (Capacitor) and on the web.
//
// Every card face gets a watermark illustration; which variant a card gets is
// derived from its rank, so the same card always wears the same art (faces are
// collectible — they must be stable across draws, runs, and devices).
// ---------------------------------------------------------------------------

function rankVariant(card: FourthPhaseCard): 0 | 1 {
  return (card.rank.charCodeAt(0) % 2) as 0 | 1;
}

/** Chalkboard play diagram: O's, route arrows, the snap. */
function OffenseArt({ ink, variant }: { ink: string; variant: 0 | 1 }) {
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
      <g stroke={ink} fill="none" strokeWidth="2" strokeLinecap="round">
        {/* offensive line */}
        <circle cx="30" cy="52" r="4.5" />
        <circle cx="44" cy="52" r="4.5" />
        <circle cx="58" cy="52" r="4.5" />
        <circle cx="72" cy="52" r="4.5" />
        <circle cx="16" cy="52" r="4.5" />
        {/* QB + back */}
        <circle cx="44" cy="63" r="4" />
        {variant === 0 ? (
          <>
            {/* deep post route */}
            <path d="M16 46 L16 26 L34 10" strokeDasharray="0" />
            <path d="M30 8 L34 10 L32 15" />
            {/* drag route */}
            <path d="M72 46 L72 36 L48 30" />
            <path d="M52 26.5 L48 30 L52 33" />
          </>
        ) : (
          <>
            {/* play-action roll: back arcs out */}
            <path d="M44 58 C 58 58 66 48 70 38" />
            <path d="M66 38 L70 38 L69 43" />
            {/* go route */}
            <path d="M30 46 L30 12" />
            <path d="M26 17 L30 12 L34 17" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Front-seven pressure: X's crashing the line. */
function DefenseArt({ ink, variant }: { ink: string; variant: 0 | 1 }) {
  const x = (cx: number, cy: number, s = 4.2) => (
    <g key={`${cx}-${cy}`}>
      <path d={`M${cx - s} ${cy - s} L${cx + s} ${cy + s}`} />
      <path d={`M${cx + s} ${cy - s} L${cx - s} ${cy + s}`} />
    </g>
  );
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
      <g stroke={ink} fill="none" strokeWidth="2.2" strokeLinecap="round">
        {/* line of scrimmage */}
        <path d="M8 40 H88" strokeDasharray="5 4" strokeWidth="1.4" />
        {x(22, 30)}
        {x(40, 28)}
        {x(58, 28)}
        {x(76, 30)}
        {variant === 0 ? (
          <>
            {/* twist stunt arrows through the gaps */}
            <path d="M40 34 C 42 44 50 48 54 56" />
            <path d="M50 53 L54 56 L55 51" />
            {x(49, 14, 3.6)}
          </>
        ) : (
          <>
            {/* edge blitz arc */}
            <path d="M76 36 C 74 48 62 54 52 58" />
            <path d="M56 54 L52 58 L57 60" />
            {x(30, 14, 3.6)}
          </>
        )}
      </g>
    </svg>
  );
}

/** Special teams: the kick splitting the uprights. */
function SpecialTeamsArt({ ink, variant }: { ink: string; variant: 0 | 1 }) {
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
      <g stroke={ink} fill="none" strokeWidth="2.2" strokeLinecap="round">
        {/* uprights */}
        <path d="M62 64 V 40 M62 40 H 90 M66 40 V 8 M86 40 V 8" strokeWidth="2.6" />
        {/* ball flight */}
        {variant === 0 ? (
          <path d="M10 62 C 30 30 52 18 76 20" strokeDasharray="2.5 5" />
        ) : (
          <path d="M10 64 C 26 44 48 30 76 26" strokeDasharray="2.5 5" />
        )}
        {/* the ball */}
        <ellipse cx="76" cy={variant === 0 ? 20 : 26} rx="6" ry="3.8" transform={`rotate(24 76 ${variant === 0 ? 20 : 26})`} fill={ink} stroke="none" />
        {/* holder tee mark */}
        <path d="M10 64 l4 -3" />
      </g>
    </svg>
  );
}

/** The crowd: stadium bowl rising, arms up. */
function CrowdArt({ ink, variant }: { ink: string; variant: 0 | 1 }) {
  const fan = (cx: number, cy: number) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r="2.6" fill={ink} stroke="none" />
      <path d={`M${cx - 5} ${cy - 5} L${cx - 2.2} ${cy - 1.5} M${cx + 5} ${cy - 5} L${cx + 2.2} ${cy - 1.5}`} />
    </g>
  );
  const row = (y: number, offset: number) =>
    [0, 1, 2, 3, 4].map((i) => fan(14 + offset + i * 17, y));
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
      <g stroke={ink} fill="none" strokeWidth="1.8" strokeLinecap="round">
        {/* bowl tiers */}
        <path d="M4 30 Q 48 14 92 30" strokeWidth="1.2" />
        <path d="M2 48 Q 48 30 94 48" strokeWidth="1.2" />
        {row(26, variant === 0 ? 0 : 6)}
        {row(44, variant === 0 ? 8 : 2)}
        {/* sound waves */}
        <path d="M48 62 q -5 -4 0 -8 q 5 4 0 8" strokeWidth="1.4" opacity="0.8" />
      </g>
    </svg>
  );
}

const PHASE_ART: Record<Phase, (props: { ink: string; variant: 0 | 1 }) => ReturnType<typeof OffenseArt>> = {
  offense: OffenseArt,
  defense: DefenseArt,
  specialTeams: SpecialTeamsArt,
  crowd: CrowdArt,
};

/** Low-opacity illustration layer behind a card face's text. Presentation only. */
export function CardWatermark({ card, opacity = 0.16 }: { card: FourthPhaseCard; opacity?: number }) {
  const Art = PHASE_ART[card.phase];
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'end center',
        padding: '0 2px 1px',
        opacity,
        pointerEvents: 'none',
      }}
    >
      <Art ink={PHASE_INK[card.phase]} variant={rankVariant(card)} />
    </div>
  );
}

/** Night-game stadium scene for the binder cover. Fictional venue, no marks. */
export function StadiumHero() {
  return (
    <svg viewBox="0 0 340 130" aria-hidden="true" style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="fp-hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1020" />
          <stop offset="100%" stopColor="#1a1f2e" />
        </linearGradient>
        <linearGradient id="fp-hero-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(242,205,120,0.34)" />
          <stop offset="100%" stopColor="rgba(242,205,120,0)" />
        </linearGradient>
        <linearGradient id="fp-hero-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14371f" />
          <stop offset="100%" stopColor="#0c2214" />
        </linearGradient>
      </defs>
      <rect width="340" height="130" fill="url(#fp-hero-sky)" rx="8" />
      {/* light pylons */}
      <g stroke="#3a4152" strokeWidth="2.4">
        <path d="M44 96 V 30 M296 96 V 30" />
      </g>
      <g fill="#e9ddb2">
        <rect x="32" y="22" width="24" height="7" rx="2" />
        <rect x="284" y="22" width="24" height="7" rx="2" />
      </g>
      {/* light beams crossing onto the field */}
      <path d="M44 30 L96 112 L10 112 Z" fill="url(#fp-hero-beam)" />
      <path d="M296 30 L330 112 L244 112 Z" fill="url(#fp-hero-beam)" />
      {/* stadium bowl silhouette */}
      <path d="M20 84 Q 170 48 320 84 L320 96 Q 170 66 20 96 Z" fill="#232a3a" />
      {/* crowd speckle */}
      <g fill="#8f97ad" opacity="0.6">
        {Array.from({ length: 34 }).map((_, i) => {
          const x = 28 + i * 8.6;
          const y = 82 - Math.sin((i / 33) * Math.PI) * 21 + (i % 3) * 2.4;
          return <circle key={i} cx={x} cy={y} r="1.15" />;
        })}
      </g>
      {/* field */}
      <rect x="0" y="96" width="340" height="34" fill="url(#fp-hero-field)" rx="4" />
      <g stroke="rgba(255,255,255,0.22)" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M${34 + i * 34} 96 L${28 + i * 34} 130`} />
        ))}
      </g>
      {/* midfield emblem glow */}
      <ellipse cx="170" cy="112" rx="30" ry="8" fill="rgba(217,164,65,0.20)" />
    </svg>
  );
}
