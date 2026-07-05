import type { CSSProperties } from 'react';
import type { Phase } from '../../lib/fourthPhase';

// ---------------------------------------------------------------------------
// "Trading Card Locker Room" design tokens.
// Dark locker-room navy/charcoal surfaces, brass hardware, and off-white
// card stock for the collectible card faces. Presentation only — nothing in
// here touches game logic.
// ---------------------------------------------------------------------------

export const FP_RADIUS = {
  card: 10,
  control: 8,
  badge: 5,
  pill: 999,
} as const;

/** Condensed sports/card-title stack. System fonts only — no new dependency. */
export const FP_FONT_HEAD =
  "'Avenir Next Condensed','Roboto Condensed','Arial Narrow','Helvetica Neue',system-ui,sans-serif";

export const FP = {
  bg: '#131720',
  panel: '#1b202b',
  panelRaised: '#242a37',
  panelSoft: '#171c26',
  inset: '#0e1119',
  border: '#3b3526',
  borderSoft: '#2a2820',
  text: '#f1ece0',
  textDim: '#b8b0a0',
  textFaint: '#8b8476',
  gold: '#d9a441',
  goldSoft: '#332a12',
  green: '#49d17e',
  greenSoft: '#0d2819',
  blue: '#62b7ff',
  red: '#f0758a',
  purple: '#ad91ff',
};

/** Off-white card stock: the face of every play card. */
export const FP_STOCK = {
  face: '#f2ecdc',
  faceDeep: '#e7deca',
  line: '#cdc3ab',
  ink: '#26262b',
  inkSoft: '#5f5a4d',
};

/** Warm locker-room wood/leather surfaces (title binder, war-room table). */
export const FP_WOOD = {
  table: 'linear-gradient(180deg,#332413,#221709)',
  leather: 'linear-gradient(180deg,#2b1d10,#191108)',
  edge: '#54401f',
  stitch: 'rgba(226,191,120,0.38)',
};

/** Dark "ink" variants of the phase colors, readable on light card stock. */
export const PHASE_INK: Record<Phase, string> = {
  offense: '#1f4d7d',
  defense: '#84303f',
  specialTeams: '#7d5d1e',
  crowd: '#54408c',
};

/** Solid header-band color for each phase's trading-card top bar. */
export const PHASE_BAND: Record<Phase, string> = {
  offense: 'linear-gradient(180deg,#31659c,#254e7c)',
  defense: 'linear-gradient(180deg,#94394b,#752c3b)',
  specialTeams: 'linear-gradient(180deg,#97722b,#7a5b20)',
  crowd: 'linear-gradient(180deg,#64509e,#4e3d80)',
};

/** Fictional collector-serial series numeral per phase (e.g. "SERIES II"). */
export const PHASE_SERIES: Record<Phase, string> = {
  offense: 'I',
  defense: 'II',
  specialTeams: 'III',
  crowd: 'IV',
};

export const card = (radius: number = FP_RADIUS.card): CSSProperties => ({
  background: FP.panel,
  border: `1px solid ${FP.border}`,
  borderRadius: radius,
});

/** A light card-stock face (subtle foil edge comes from callers when earned). */
export const stockFace = (radius: number = FP_RADIUS.card): CSSProperties => ({
  background: FP_STOCK.face,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: FP_STOCK.line,
  borderRadius: radius,
  color: FP_STOCK.ink,
});

/** Holo-foil border treatment for rare/edition cards. Subtle, not disco. */
export const foilFace = (radius: number = FP_RADIUS.card): CSSProperties => ({
  borderWidth: 2,
  borderStyle: 'solid',
  borderColor: 'transparent',
  borderRadius: radius,
  background: `linear-gradient(${FP_STOCK.face},${FP_STOCK.face}) padding-box, linear-gradient(130deg,#e2bf6a 0%,#9ecfe8 34%,#cfa6e8 62%,#e2bf6a 100%) border-box`,
  color: FP_STOCK.ink,
});

export const btnPrimary: CSSProperties = {
  padding: '14px 0',
  border: '1px solid #8a6a26',
  borderRadius: FP_RADIUS.control,
  fontSize: 15,
  fontWeight: 900,
  fontFamily: FP_FONT_HEAD,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  cursor: 'pointer',
  background: 'linear-gradient(180deg,#eec86c 0%,#d9a441 52%,#b7852d 100%)',
  color: '#241705',
  boxShadow: 'inset 0 1px 0 rgba(255,242,206,0.75), 0 8px 18px -10px rgba(217,164,65,0.72)',
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
  letterSpacing: 1.2,
  color: FP.textFaint,
  fontWeight: 900,
  fontFamily: FP_FONT_HEAD,
  textTransform: 'uppercase',
};

export const statTile: CSSProperties = {
  background: FP.inset,
  border: `1px solid ${FP.borderSoft}`,
  borderRadius: FP_RADIUS.card,
  padding: '7px 8px',
};

/** Equipment-room tape label: run codes, daily tags, small identifiers. */
export const tapeLabel: CSSProperties = {
  display: 'inline-block',
  background: 'rgba(233,226,204,0.92)',
  color: '#33302a',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.4,
  padding: '2px 8px',
  borderRadius: 2,
  transform: 'rotate(-1deg)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.45)',
};
