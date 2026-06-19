// Gridiron — shared visual design tokens.
// One source of truth so every football screen feels like the same product.

import type { CSSProperties } from 'react';
import type { FbSide } from '../lib/footballRogue';

export const FB = {
  // surfaces
  bg: '#090c11',
  panel: '#121a24',
  panelSoft: '#0e151d',
  inset: '#0a0f16',
  // lines
  border: '#1f2a37',
  borderSoft: '#19222e',
  // text
  text: '#e8edf4',
  textDim: '#8595aa',
  textFaint: '#56657a',
  // brand
  gold: '#f0b429',
  goldSoft: '#3a2f12',
  green: '#34c771',
  greenSoft: '#0e2a1b',
  blue: '#3b82f6',
  red: '#e26d83',
};

// side accents for cards / play channels
export const SIDE: Record<FbSide, { border: string; chip: string; text: string; grad: string }> = {
  pass: { border: '#3b82f6', chip: '#0c1a2e', text: '#79b0ff', grad: 'linear-gradient(160deg,#13203a,#0c1320)' },
  catch: { border: '#34c771', chip: '#0c2419', text: '#5fe0a0', grad: 'linear-gradient(160deg,#0f2a1d,#0b1612)' },
  run: { border: '#f5a623', chip: '#271a06', text: '#ffc457', grad: 'linear-gradient(160deg,#2a1d08,#171005)' },
  kick: { border: '#9aa6b5', chip: '#171c22', text: '#cdd6e1', grad: 'linear-gradient(160deg,#1b222b,#10151b)' },
  defense: { border: '#e26d83', chip: '#2a1118', text: '#ff97aa', grad: 'linear-gradient(160deg,#2a131a,#170d10)' },
};

export const card = (radius = 14): CSSProperties => ({
  background: FB.panel,
  border: `1px solid ${FB.border}`,
  borderRadius: radius,
});

export const btnPrimary: CSSProperties = {
  padding: '14px 0',
  border: 'none',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: 0.3,
  cursor: 'pointer',
  background: 'linear-gradient(180deg,#f7c544,#e6a519)',
  color: '#1a1206',
  boxShadow: '0 6px 18px -8px rgba(240,180,41,0.6)',
};

export const btnGhost: CSSProperties = {
  background: '#141b24',
  border: `1px solid ${FB.border}`,
  color: FB.textDim,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export const sectionLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  color: FB.textFaint,
  fontWeight: 800,
  textTransform: 'uppercase',
};
