// Gridiron — team identity data (presentation only).
// The engine (footballRogue.ts / TEAM_PROFILES) has no colour or coach data on
// purpose: it stays license-agnostic and math-first. This is the visual face
// layer — fictional coaches and team palettes. Safe to change without touching
// scoring or the balance harness. Rendered by <CoachPortrait> in coachIdentity.tsx.

import type { TeamArchetype } from '../lib/footballRogue';

export interface TeamIdentity {
  primary: string;   // team accent — stripes, rings, headers
  secondary: string; // lighter wash for fills/gradients
  coachName: string;
  quote: string;     // one line that fits the identity, surfaced at key moments
  playStyle: string; // two-or-three-word style tag for the team-select grid
}

export const TEAM_IDENTITY: Record<TeamArchetype, TeamIdentity> = {
  balanced: {
    primary: '#5b8fd1', secondary: '#c9d6e8',
    coachName: 'Coach Hollis Reed',
    quote: 'We take what the defense gives us.',
    playStyle: 'Flexible all-rounder',
  },
  air_raid: {
    primary: '#f5733a', secondary: '#ffc457',
    coachName: 'Coach Marv Castillo',
    quote: 'Let it fly — we win the game in the air.',
    playStyle: 'Aerial big-play',
  },
  ground_game: {
    primary: '#2bb6a3', secondary: '#9fe8dd',
    coachName: 'Coach Dell Yeager',
    quote: 'Pound the rock. Wear them down.',
    playStyle: 'Grind it out',
  },
  mobile_qb: {
    primary: '#9b6cf0', secondary: '#d7c2ff',
    coachName: 'Coach Rome Vasquez',
    quote: 'Keep the pocket moving and improvise.',
    playStyle: 'QB-run chaos',
  },
  defensive_pressure: {
    primary: '#8c97ad', secondary: '#d6deea',
    coachName: 'Coach Sable Knox',
    quote: 'Defense scores too. Make them pay.',
    playStyle: 'Takeaway defense',
  },
};
