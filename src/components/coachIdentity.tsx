// Gridiron — coach portrait (presentation only).
// A geometric single-colour silhouette (no real people, no licenses), coloured
// from the team palette in teamIdentity.ts. Safe to change without touching
// scoring or the balance harness.

import type { TeamArchetype } from '../lib/footballRogue';
import { TEAM_IDENTITY } from './teamIdentity';

// Per-team emblem motif drawn beside the headset — keeps the five coaches
// visually distinct while staying abstract geometry.
function Emblem({ team, color }: { team: TeamArchetype; color: string }) {
  switch (team) {
    case 'air_raid': // upward dart — the deep ball
      return <path d="M44 20 L52 12 L50 22 Z" fill={color} />;
    case 'ground_game': // grounded bar
      return <rect x={42} y={17} width={11} height={4} rx={1} fill={color} />;
    case 'mobile_qb': // lightning notch
      return <path d="M48 11 L43 19 L47 19 L44 25 L52 16 L48 16 Z" fill={color} />;
    case 'defensive_pressure': // shield wedge
      return <path d="M47 12 L53 15 L50 23 L44 19 Z" fill={color} />;
    default: // balanced — steady diamond
      return <path d="M48 13 L52 18 L48 23 L44 18 Z" fill={color} />;
  }
}

// Geometric coach silhouette: rounded badge, shoulders + head, a headset, and
// a team emblem. Single fill colour from the team palette.
export function CoachPortrait({ team, size = 48 }: { team: TeamArchetype; size?: number }) {
  const id = TEAM_IDENTITY[team];
  const gradId = `coach-bg-${team}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={id.coachName} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={id.secondary} stopOpacity={0.18} />
          <stop offset="100%" stopColor="#0a0f16" stopOpacity={0.9} />
        </linearGradient>
      </defs>
      <rect x={1.5} y={1.5} width={61} height={61} rx={14} fill={`url(#${gradId})`} stroke={id.primary} strokeWidth={2} />
      {/* shoulders */}
      <path d="M14 60 C14 46 24 42 32 42 C40 42 50 46 50 60 Z" fill={id.primary} />
      {/* head */}
      <circle cx={32} cy={27} r={11} fill={id.primary} />
      {/* headset band + mic */}
      <path d="M21 25 A11 11 0 0 1 43 25" fill="none" stroke="#0a0f16" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={21} cy={27} r={3} fill="#0a0f16" />
      <circle cx={43} cy={27} r={3} fill="#0a0f16" />
      <path d="M21 30 C21 36 26 35 28 33" fill="none" stroke="#0a0f16" strokeWidth={2.2} strokeLinecap="round" />
      <Emblem team={team} color={id.secondary} />
    </svg>
  );
}
