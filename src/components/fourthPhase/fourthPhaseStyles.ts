import type { CSSProperties } from 'react';

export const FP_RADIUS = {
  card: 8,
  control: 8,
  badge: 5,
  pill: 999,
} as const;

export const FP = {
  bg: '#080b10',
  panel: '#111820',
  panelRaised: '#151f2a',
  panelSoft: '#0d131b',
  inset: '#070b10',
  border: '#263140',
  borderSoft: '#1a2430',
  text: '#edf2f8',
  textDim: '#a7b3c2',
  textFaint: '#7e8b9d',
  gold: '#f2bd3d',
  goldSoft: '#33280f',
  green: '#49d17e',
  greenSoft: '#0d2819',
  blue: '#62b7ff',
  red: '#f0758a',
  purple: '#ad91ff',
};

export const card = (radius = FP_RADIUS.card): CSSProperties => ({
  background: FP.panel,
  border: `1px solid ${FP.border}`,
  borderRadius: radius,
});

export const btnPrimary: CSSProperties = {
  padding: '14px 0',
  border: 'none',
  borderRadius: FP_RADIUS.control,
  fontSize: 15,
  fontWeight: 900,
  letterSpacing: 0,
  cursor: 'pointer',
  background: 'linear-gradient(180deg,#f8cd55,#e6aa22)',
  color: '#171006',
  boxShadow: '0 8px 18px -10px rgba(242,189,61,0.72)',
};

export const btnGhost: CSSProperties = {
  background: FP.panelRaised,
  border: `1px solid ${FP.border}`,
  color: FP.textDim,
  borderRadius: FP_RADIUS.control,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 800,
  minHeight: 44,
  cursor: 'pointer',
};

export const sectionLabel: CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0,
  color: FP.textFaint,
  fontWeight: 900,
  textTransform: 'uppercase',
};

export const statTile: CSSProperties = {
  background: FP.inset,
  border: `1px solid ${FP.borderSoft}`,
  borderRadius: FP_RADIUS.card,
  padding: '7px 8px',
};
