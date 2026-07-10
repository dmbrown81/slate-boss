import type { DragEvent } from 'react';
import {
  FP_FONT_HEAD,
  FP_RADIUS,
  FP_STOCK,
  PHASE_BAND,
  PHASE_INK,
  PHASE_SERIES,
  cardBadge,
  cardFaceFrame,
} from './fourthPhaseStyles';
import { PhaseIcon } from './FourthPhaseGuide';
import { CardWatermark } from './fpCardArt';
import {
  PHASE_SHORT,
  cardContributionLabel,
  cardDisplayName,
  cardPlayChips,
  type FourthPhaseCard,
} from '../../lib/fourthPhase';

export interface DragBind {
  draggable: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

const CARD_BAND_TEXT = '#f6f2e8';

// The colored header band that makes "blue Offense card" readable at a glance.
export function CardBand({ card, rankSize = 16 }: { card: FourthPhaseCard; rankSize?: number }) {
  return (
    <div style={{ background: PHASE_BAND[card.phase], display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, padding: '3px 7px' }}>
      <span className="fb-num" style={{ fontSize: rankSize, fontWeight: 950, color: CARD_BAND_TEXT, lineHeight: 1 }}>{card.rank}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, color: CARD_BAND_TEXT, fontWeight: 950, letterSpacing: 0.6 }}>
        <PhaseIcon phase={card.phase} size={10} color={CARD_BAND_TEXT} />
        {PHASE_SHORT[card.phase]}
      </span>
    </div>
  );
}

export function CardChips({ card, size = 7.5 }: { card: FourthPhaseCard; size?: number }) {
  const chips = cardPlayChips(card);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
      {chips.map((chip) => (
        <span key={chip} style={{ border: `1px solid ${PHASE_INK[card.phase]}`, borderRadius: FP_RADIUS.badge, color: PHASE_INK[card.phase], fontSize: size, fontWeight: 950, padding: '1px 4px', background: 'rgba(255,255,255,0.4)' }}>
          {chip}
        </span>
      ))}
    </div>
  );
}

export function HandCard({ card, selected, tone, onClick }: { card: FourthPhaseCard; selected: boolean; tone?: 'highlight' | 'dim'; onClick: () => void }) {
  const badge = cardBadge(card);
  const coachHighlight = tone === 'highlight';
  const coachDim = tone === 'dim' && !selected;
  return (
    <button
      onClick={onClick}
      title={cardDisplayName(card)}
      aria-pressed={selected}
      className={card.edition ? 'fp-pressable fp-foil-live' : 'fp-pressable'}
      style={{
        ...cardFaceFrame(card, selected, selected || coachHighlight),
        minHeight: 118,
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        opacity: coachDim ? 0.42 : 1,
        transition: 'opacity 120ms ease-out, box-shadow 120ms ease-out, transform 120ms ease-out',
        overflow: 'hidden',
      }}
    >
      <CardBand card={card} />
      <div className="fp-grain" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '6px 7px 4px' }}>
        <CardWatermark card={card} opacity={0.17} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: FP_FONT_HEAD, fontSize: 12, fontWeight: 900, color: FP_STOCK.ink, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: 0.3, wordBreak: 'break-word' }}>
            {card.roleName}
          </div>
          <CardChips card={card} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 5 }}>
            <span style={{ fontSize: 9, color: PHASE_INK[card.phase], fontWeight: 900, minWidth: 0 }}>{cardContributionLabel(card)}</span>
            <span className="fb-num" style={{ fontSize: 11.5, color: FP_STOCK.ink, fontWeight: 950, flexShrink: 0 }}>{card.value}</span>
          </div>
          {badge && (
            <div style={{ display: 'inline-flex', border: `1px solid ${badge.color}`, borderRadius: FP_RADIUS.badge, color: badge.color, fontSize: 7.5, fontWeight: 950, marginTop: 3, padding: '1px 4px', background: 'rgba(255,255,255,0.45)' }}>{badge.label}</div>
          )}
          <div style={{ borderTop: `1px solid ${FP_STOCK.line}`, marginTop: 4, paddingTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 6.8, color: FP_STOCK.inkSoft, fontWeight: 800, letterSpacing: 0.6 }}>
            <span>FP-{card.rank}</span>
            <span>SERIES {PHASE_SERIES[card.phase]}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function MiniCard({
  card,
  selected,
  dragProps,
  onClick,
}: {
  card: FourthPhaseCard;
  selected: boolean;
  dragProps: DragBind;
  onClick: () => void;
}) {
  const badge = cardBadge(card);
  return (
    <button
      {...dragProps}
      onClick={onClick}
      title={cardDisplayName(card)}
      aria-pressed={selected}
      className={card.edition ? 'fp-pressable fp-foil-live' : 'fp-pressable'}
      style={{
        ...cardFaceFrame(card, selected, selected),
        minWidth: 86,
        minHeight: 76,
        padding: 0,
        textAlign: 'left',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CardBand card={card} rankSize={13} />
      <div className="fp-grain" style={{ flex: 1, position: 'relative', padding: '4px 6px 4px' }}>
        <CardWatermark card={card} opacity={0.13} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: FP_FONT_HEAD, fontSize: 10.5, fontWeight: 900, color: FP_STOCK.ink, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: 0.2, wordBreak: 'break-word' }}>
            {card.roleName}
          </div>
          <CardChips card={card} size={7} />
          <div style={{ fontSize: 8.5, color: PHASE_INK[card.phase], fontWeight: 900, marginTop: 3 }}>{cardContributionLabel(card)}</div>
          {badge && (
            <div style={{ fontSize: 7.5, color: badge.color, fontWeight: 950, marginTop: 2 }}>{badge.label}</div>
          )}
        </div>
      </div>
    </button>
  );
}
