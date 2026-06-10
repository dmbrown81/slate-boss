import type { Team, Archetype } from '../types';

export const TEAMS: Team[] = [
  { id: 'IRN', name: 'Ironhawks', abbreviation: 'IRN', city: 'Ironhaven' },
  { id: 'BLZ', name: 'Blazers', abbreviation: 'BLZ', city: 'Blaze City' },
  { id: 'STO', name: 'Stormers', abbreviation: 'STO', city: 'Stormport' },
  { id: 'VLT', name: 'Volts', abbreviation: 'VLT', city: 'Volterra' },
  { id: 'RAV', name: 'Ravens', abbreviation: 'RAV', city: 'Ravenswood' },
  { id: 'CRU', name: 'Crushers', abbreviation: 'CRU', city: 'Crushton' },
  { id: 'GHO', name: 'Ghosts', abbreviation: 'GHO', city: 'Ghostvale' },
  { id: 'THU', name: 'Thunder', abbreviation: 'THU', city: 'Thundercliff' },
  { id: 'PIL', name: 'Pilots', abbreviation: 'PIL', city: 'Pilotsberg' },
  { id: 'VIP', name: 'Vipers', abbreviation: 'VIP', city: 'Viper City' },
  { id: 'ROC', name: 'Rockets', abbreviation: 'ROC', city: 'Rocketdale' },
  { id: 'NIG', name: 'Nighthawks', abbreviation: 'NIG', city: 'Nightfall' },
];

export interface PlayerTemplate {
  id: string;
  name: string;
  team: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'DST';
  archetype: Archetype;
  baseSalary: number;
  baseProjection: number;
  baseFloor: number;
  baseCeiling: number;
  baseVolatility: number;
  baseBoomChance: number;
  baseOwnership: number;
}

// Exactly 1 QB + 2 RBs + 4 WRs + 1 TE + 1 DST per team = 108 players
export const PLAYER_TEMPLATES: PlayerTemplate[] = [

  // ── IRONHAWKS (IRN) ─────────────────────────────────────────────────────
  { id: 'irn_qb', name: 'C. Vale',   team: 'IRN', position: 'QB', archetype: 'pocket_qb',      baseSalary: 8200, baseProjection: 24.5, baseFloor: 16, baseCeiling: 38, baseVolatility: 0.35, baseBoomChance: 0.18, baseOwnership: 28 },
  { id: 'irn_rb1', name: 'J. Stone', team: 'IRN', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 7800, baseProjection: 18.5, baseFloor: 12, baseCeiling: 30, baseVolatility: 0.28, baseBoomChance: 0.14, baseOwnership: 32 },
  { id: 'irn_rb2', name: 'H. Lane',  team: 'IRN', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4400, baseProjection: 8.5, baseFloor: 2, baseCeiling: 19, baseVolatility: 0.60, baseBoomChance: 0.18, baseOwnership: 5 },
  { id: 'irn_wr1', name: 'R. Bell',  team: 'IRN', position: 'WR', archetype: 'alpha_wr',        baseSalary: 8000, baseProjection: 17.5, baseFloor: 8, baseCeiling: 38, baseVolatility: 0.50, baseBoomChance: 0.24, baseOwnership: 30 },
  { id: 'irn_wr2', name: 'Z. Owen',  team: 'IRN', position: 'WR', archetype: 'boom_bust_wr',    baseSalary: 4400, baseProjection: 9.0,  baseFloor: 1, baseCeiling: 36, baseVolatility: 0.80, baseBoomChance: 0.24, baseOwnership: 6 },
  { id: 'irn_wr3', name: 'M. Dunn',  team: 'IRN', position: 'WR', archetype: 'possession_wr',  baseSalary: 5200, baseProjection: 11.5, baseFloor: 7, baseCeiling: 20, baseVolatility: 0.28, baseBoomChance: 0.09, baseOwnership: 13 },
  { id: 'irn_wr4', name: 'T. Carr',  team: 'IRN', position: 'WR', archetype: 'slot_wr',         baseSalary: 4800, baseProjection: 10.0, baseFloor: 5, baseCeiling: 22, baseVolatility: 0.38, baseBoomChance: 0.14, baseOwnership: 10 },
  { id: 'irn_te',  name: 'S. Vance', team: 'IRN', position: 'TE', archetype: 'redzone_te',      baseSalary: 5800, baseProjection: 11.0, baseFloor: 4, baseCeiling: 26, baseVolatility: 0.52, baseBoomChance: 0.20, baseOwnership: 15 },
  { id: 'irn_dst', name: 'Ironhawks D', team: 'IRN', position: 'DST', archetype: 'strong_dst', baseSalary: 4200, baseProjection: 10.0, baseFloor: 2, baseCeiling: 22, baseVolatility: 0.60, baseBoomChance: 0.20, baseOwnership: 20 },

  // ── BLAZERS (BLZ) ───────────────────────────────────────────────────────
  { id: 'blz_qb',  name: 'D. Marsh', team: 'BLZ', position: 'QB', archetype: 'rushing_qb',     baseSalary: 7600, baseProjection: 22.0, baseFloor: 14, baseCeiling: 42, baseVolatility: 0.50, baseBoomChance: 0.24, baseOwnership: 22 },
  { id: 'blz_rb1', name: 'K. Vega',  team: 'BLZ', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 6200, baseProjection: 15.0, baseFloor: 8, baseCeiling: 28, baseVolatility: 0.45, baseBoomChance: 0.20, baseOwnership: 18 },
  { id: 'blz_rb2', name: 'I. Moore', team: 'BLZ', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 4200, baseProjection: 8.0,  baseFloor: 2, baseCeiling: 17, baseVolatility: 0.45, baseBoomChance: 0.12, baseOwnership: 4 },
  { id: 'blz_wr1', name: 'O. Shaw',  team: 'BLZ', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 6600, baseProjection: 13.5, baseFloor: 3, baseCeiling: 42, baseVolatility: 0.72, baseBoomChance: 0.28, baseOwnership: 16 },
  { id: 'blz_wr2', name: 'A. Page',  team: 'BLZ', position: 'WR', archetype: 'possession_wr',  baseSalary: 4200, baseProjection: 8.5,  baseFloor: 5, baseCeiling: 17, baseVolatility: 0.28, baseBoomChance: 0.08, baseOwnership: 5 },
  { id: 'blz_wr3', name: 'F. Noel',  team: 'BLZ', position: 'WR', archetype: 'alpha_wr',       baseSalary: 7200, baseProjection: 16.0, baseFloor: 7, baseCeiling: 34, baseVolatility: 0.50, baseBoomChance: 0.21, baseOwnership: 24 },
  { id: 'blz_wr4', name: 'L. Cobb',  team: 'BLZ', position: 'WR', archetype: 'slot_wr',        baseSalary: 4600, baseProjection: 9.5,  baseFloor: 5, baseCeiling: 20, baseVolatility: 0.40, baseBoomChance: 0.13, baseOwnership: 8 },
  { id: 'blz_te',  name: 'W. Soto',  team: 'BLZ', position: 'TE', archetype: 'punt_te',        baseSalary: 3800, baseProjection: 7.0,  baseFloor: 3, baseCeiling: 14, baseVolatility: 0.30, baseBoomChance: 0.07, baseOwnership: 6 },
  { id: 'blz_dst', name: 'Blazers D', team: 'BLZ', position: 'DST', archetype: 'risky_dst',    baseSalary: 3600, baseProjection: 8.0,  baseFloor: 0, baseCeiling: 26, baseVolatility: 0.80, baseBoomChance: 0.25, baseOwnership: 10 },

  // ── STORMERS (STO) ──────────────────────────────────────────────────────
  { id: 'sto_qb',  name: 'L. Finch', team: 'STO', position: 'QB', archetype: 'pocket_qb',      baseSalary: 7000, baseProjection: 20.5, baseFloor: 13, baseCeiling: 34, baseVolatility: 0.30, baseBoomChance: 0.15, baseOwnership: 18 },
  { id: 'sto_rb1', name: 'S. Diaz',  team: 'STO', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 7400, baseProjection: 17.5, baseFloor: 11, baseCeiling: 28, baseVolatility: 0.30, baseBoomChance: 0.13, baseOwnership: 26 },
  { id: 'sto_rb2', name: 'P. Ames',  team: 'STO', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4800, baseProjection: 10.0, baseFloor: 4, baseCeiling: 21, baseVolatility: 0.52, baseBoomChance: 0.18, baseOwnership: 8 },
  { id: 'sto_wr1', name: 'P. Drake', team: 'STO', position: 'WR', archetype: 'possession_wr',  baseSalary: 5800, baseProjection: 14.0, baseFloor: 9, baseCeiling: 24, baseVolatility: 0.28, baseBoomChance: 0.10, baseOwnership: 22 },
  { id: 'sto_wr2', name: 'B. Reed',  team: 'STO', position: 'WR', archetype: 'slot_wr',        baseSalary: 4000, baseProjection: 8.0,  baseFloor: 4, baseCeiling: 18, baseVolatility: 0.40, baseBoomChance: 0.14, baseOwnership: 4 },
  { id: 'sto_wr3', name: 'E. Tate',  team: 'STO', position: 'WR', archetype: 'alpha_wr',       baseSalary: 7000, baseProjection: 15.5, baseFloor: 6, baseCeiling: 32, baseVolatility: 0.48, baseBoomChance: 0.20, baseOwnership: 22 },
  { id: 'sto_wr4', name: 'G. Byrd',  team: 'STO', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4600, baseProjection: 9.5,  baseFloor: 1, baseCeiling: 34, baseVolatility: 0.74, baseBoomChance: 0.23, baseOwnership: 7 },
  { id: 'sto_te',  name: 'N. Hess',  team: 'STO', position: 'TE', archetype: 'redzone_te',     baseSalary: 5400, baseProjection: 10.5, baseFloor: 4, baseCeiling: 24, baseVolatility: 0.54, baseBoomChance: 0.19, baseOwnership: 13 },
  { id: 'sto_dst', name: 'Stormers D', team: 'STO', position: 'DST', archetype: 'strong_dst',  baseSalary: 4000, baseProjection: 9.5,  baseFloor: 2, baseCeiling: 21, baseVolatility: 0.58, baseBoomChance: 0.19, baseOwnership: 16 },

  // ── VOLTS (VLT) ─────────────────────────────────────────────────────────
  { id: 'vlt_qb',  name: 'M. Cross', team: 'VLT', position: 'QB', archetype: 'rushing_qb',     baseSalary: 6400, baseProjection: 19.0, baseFloor: 11, baseCeiling: 40, baseVolatility: 0.55, baseBoomChance: 0.22, baseOwnership: 14 },
  { id: 'vlt_rb1', name: 'T. Burns', team: 'VLT', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 5800, baseProjection: 13.5, baseFloor: 6, baseCeiling: 26, baseVolatility: 0.50, baseBoomChance: 0.22, baseOwnership: 14 },
  { id: 'vlt_rb2', name: 'Q. Sims',  team: 'VLT', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 6600, baseProjection: 15.0, baseFloor: 9, baseCeiling: 24, baseVolatility: 0.32, baseBoomChance: 0.12, baseOwnership: 19 },
  { id: 'vlt_wr1', name: 'Q. Ellis', team: 'VLT', position: 'WR', archetype: 'slot_wr',        baseSalary: 5400, baseProjection: 13.0, baseFloor: 7, baseCeiling: 25, baseVolatility: 0.38, baseBoomChance: 0.16, baseOwnership: 18 },
  { id: 'vlt_wr2', name: 'C. Scott', team: 'VLT', position: 'WR', archetype: 'alpha_wr',       baseSalary: 7200, baseProjection: 16.0, baseFloor: 6, baseCeiling: 34, baseVolatility: 0.54, baseBoomChance: 0.21, baseOwnership: 24 },
  { id: 'vlt_wr3', name: 'J. Kern',  team: 'VLT', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 5000, baseProjection: 10.5, baseFloor: 1, baseCeiling: 36, baseVolatility: 0.76, baseBoomChance: 0.25, baseOwnership: 9 },
  { id: 'vlt_wr4', name: 'B. Rowe',  team: 'VLT', position: 'WR', archetype: 'possession_wr',  baseSalary: 4200, baseProjection: 8.0,  baseFloor: 4, baseCeiling: 16, baseVolatility: 0.30, baseBoomChance: 0.08, baseOwnership: 5 },
  { id: 'vlt_te',  name: 'A. Pena',  team: 'VLT', position: 'TE', archetype: 'punt_te',        baseSalary: 4000, baseProjection: 7.5,  baseFloor: 3, baseCeiling: 15, baseVolatility: 0.32, baseBoomChance: 0.08, baseOwnership: 7 },
  { id: 'vlt_dst', name: 'Volts D',  team: 'VLT', position: 'DST', archetype: 'risky_dst',     baseSalary: 3400, baseProjection: 7.5,  baseFloor: 0, baseCeiling: 24, baseVolatility: 0.82, baseBoomChance: 0.23, baseOwnership: 8 },

  // ── RAVENS (RAV) ────────────────────────────────────────────────────────
  { id: 'rav_qb',  name: 'T. Holt',  team: 'RAV', position: 'QB', archetype: 'pocket_qb',      baseSalary: 7800, baseProjection: 23.0, baseFloor: 15, baseCeiling: 36, baseVolatility: 0.33, baseBoomChance: 0.17, baseOwnership: 25 },
  { id: 'rav_rb1', name: 'L. Price', team: 'RAV', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 6600, baseProjection: 16.0, baseFloor: 10, baseCeiling: 26, baseVolatility: 0.32, baseBoomChance: 0.12, baseOwnership: 20 },
  { id: 'rav_rb2', name: 'O. Frey',  team: 'RAV', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 5200, baseProjection: 11.0, baseFloor: 5, baseCeiling: 23, baseVolatility: 0.48, baseBoomChance: 0.17, baseOwnership: 10 },
  { id: 'rav_wr1', name: 'R. Fox',   team: 'RAV', position: 'WR', archetype: 'alpha_wr',       baseSalary: 7400, baseProjection: 16.5, baseFloor: 7, baseCeiling: 36, baseVolatility: 0.52, baseBoomChance: 0.22, baseOwnership: 26 },
  { id: 'rav_wr2', name: 'N. Pryce', team: 'RAV', position: 'WR', archetype: 'slot_wr',        baseSalary: 5600, baseProjection: 12.5, baseFloor: 7, baseCeiling: 24, baseVolatility: 0.36, baseBoomChance: 0.15, baseOwnership: 16 },
  { id: 'rav_wr3', name: 'K. Olin',  team: 'RAV', position: 'WR', archetype: 'possession_wr',  baseSalary: 4800, baseProjection: 10.5, baseFloor: 6, baseCeiling: 19, baseVolatility: 0.28, baseBoomChance: 0.09, baseOwnership: 11 },
  { id: 'rav_wr4', name: 'C. Bane',  team: 'RAV', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4200, baseProjection: 8.5,  baseFloor: 1, baseCeiling: 34, baseVolatility: 0.78, baseBoomChance: 0.24, baseOwnership: 6 },
  { id: 'rav_te',  name: 'D. Tyler', team: 'RAV', position: 'TE', archetype: 'redzone_te',     baseSalary: 7000, baseProjection: 14.5, baseFloor: 6, baseCeiling: 32, baseVolatility: 0.55, baseBoomChance: 0.22, baseOwnership: 26 },
  { id: 'rav_dst', name: 'Ravens D', team: 'RAV', position: 'DST', archetype: 'strong_dst',    baseSalary: 4400, baseProjection: 10.5, baseFloor: 3, baseCeiling: 22, baseVolatility: 0.58, baseBoomChance: 0.20, baseOwnership: 22 },

  // ── CRUSHERS (CRU) ──────────────────────────────────────────────────────
  { id: 'cru_qb',  name: 'P. Steele', team: 'CRU', position: 'QB', archetype: 'pocket_qb',     baseSalary: 5400, baseProjection: 15.5, baseFloor: 7, baseCeiling: 28, baseVolatility: 0.45, baseBoomChance: 0.13, baseOwnership: 6 },
  { id: 'cru_rb1', name: 'M. Rowe',  team: 'CRU', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 5200, baseProjection: 12.0, baseFloor: 5, baseCeiling: 24, baseVolatility: 0.55, baseBoomChance: 0.19, baseOwnership: 10 },
  { id: 'cru_rb2', name: 'V. Hart',  team: 'CRU', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 6000, baseProjection: 13.5, baseFloor: 8, baseCeiling: 22, baseVolatility: 0.33, baseBoomChance: 0.11, baseOwnership: 14 },
  { id: 'cru_wr1', name: 'S. Grant', team: 'CRU', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 5000, baseProjection: 11.0, baseFloor: 2, baseCeiling: 40, baseVolatility: 0.78, baseBoomChance: 0.25, baseOwnership: 10 },
  { id: 'cru_wr2', name: 'A. Lowe',  team: 'CRU', position: 'WR', archetype: 'possession_wr',  baseSalary: 4400, baseProjection: 9.5,  baseFloor: 5, baseCeiling: 18, baseVolatility: 0.28, baseBoomChance: 0.09, baseOwnership: 7 },
  { id: 'cru_wr3', name: 'D. Pugh',  team: 'CRU', position: 'WR', archetype: 'slot_wr',        baseSalary: 4800, baseProjection: 10.0, baseFloor: 5, baseCeiling: 21, baseVolatility: 0.38, baseBoomChance: 0.13, baseOwnership: 9 },
  { id: 'cru_wr4', name: 'E. Mack',  team: 'CRU', position: 'WR', archetype: 'alpha_wr',       baseSalary: 6400, baseProjection: 14.0, baseFloor: 5, baseCeiling: 30, baseVolatility: 0.52, baseBoomChance: 0.19, baseOwnership: 18 },
  { id: 'cru_te',  name: 'E. Urban', team: 'CRU', position: 'TE', archetype: 'punt_te',        baseSalary: 3800, baseProjection: 7.0,  baseFloor: 3, baseCeiling: 14, baseVolatility: 0.30, baseBoomChance: 0.07, baseOwnership: 6 },
  { id: 'cru_dst', name: 'Crushers D', team: 'CRU', position: 'DST', archetype: 'risky_dst',   baseSalary: 3200, baseProjection: 7.0,  baseFloor: 0, baseCeiling: 25, baseVolatility: 0.85, baseBoomChance: 0.24, baseOwnership: 6 },

  // ── GHOSTS (GHO) ────────────────────────────────────────────────────────
  { id: 'gho_qb',  name: 'R. Knox',  team: 'GHO', position: 'QB', archetype: 'rushing_qb',     baseSalary: 5200, baseProjection: 14.0, baseFloor: 6, baseCeiling: 35, baseVolatility: 0.60, baseBoomChance: 0.20, baseOwnership: 5 },
  { id: 'gho_rb1', name: 'D. Cole',  team: 'GHO', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 4800, baseProjection: 10.5, baseFloor: 4, baseCeiling: 20, baseVolatility: 0.40, baseBoomChance: 0.14, baseOwnership: 7 },
  { id: 'gho_rb2', name: 'U. Garza', team: 'GHO', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4200, baseProjection: 8.0, baseFloor: 2, baseCeiling: 18, baseVolatility: 0.56, baseBoomChance: 0.16, baseOwnership: 5 },
  { id: 'gho_wr1', name: 'T. Hart',  team: 'GHO', position: 'WR', archetype: 'possession_wr',  baseSalary: 4800, baseProjection: 10.5, baseFloor: 6, baseCeiling: 20, baseVolatility: 0.30, baseBoomChance: 0.09, baseOwnership: 8 },
  { id: 'gho_wr2', name: 'X. Lund',  team: 'GHO', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4000, baseProjection: 8.0,  baseFloor: 0, baseCeiling: 34, baseVolatility: 0.82, baseBoomChance: 0.23, baseOwnership: 5 },
  { id: 'gho_wr3', name: 'B. Slim',  team: 'GHO', position: 'WR', archetype: 'slot_wr',        baseSalary: 4400, baseProjection: 9.0,  baseFloor: 4, baseCeiling: 19, baseVolatility: 0.40, baseBoomChance: 0.13, baseOwnership: 7 },
  { id: 'gho_wr4', name: 'C. Wren',  team: 'GHO', position: 'WR', archetype: 'alpha_wr',       baseSalary: 5800, baseProjection: 12.5, baseFloor: 5, baseCeiling: 26, baseVolatility: 0.50, baseBoomChance: 0.18, baseOwnership: 12 },
  { id: 'gho_te',  name: 'F. Voss',  team: 'GHO', position: 'TE', archetype: 'redzone_te',     baseSalary: 6200, baseProjection: 12.5, baseFloor: 5, baseCeiling: 28, baseVolatility: 0.52, baseBoomChance: 0.20, baseOwnership: 18 },
  { id: 'gho_dst', name: 'Ghosts D', team: 'GHO', position: 'DST', archetype: 'strong_dst',    baseSalary: 3800, baseProjection: 9.0,  baseFloor: 2, baseCeiling: 20, baseVolatility: 0.62, baseBoomChance: 0.18, baseOwnership: 14 },

  // ── THUNDER (THU) ───────────────────────────────────────────────────────
  { id: 'thu_qb',  name: 'A. Quinn', team: 'THU', position: 'QB', archetype: 'pocket_qb',      baseSalary: 6800, baseProjection: 21.0, baseFloor: 14, baseCeiling: 33, baseVolatility: 0.32, baseBoomChance: 0.16, baseOwnership: 16 },
  { id: 'thu_rb1', name: 'C. Ford',  team: 'THU', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 7000, baseProjection: 17.0, baseFloor: 11, baseCeiling: 27, baseVolatility: 0.30, baseBoomChance: 0.13, baseOwnership: 24 },
  { id: 'thu_rb2', name: 'R. Keen',  team: 'THU', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4600, baseProjection: 9.5, baseFloor: 3, baseCeiling: 21, baseVolatility: 0.54, baseBoomChance: 0.17, baseOwnership: 7 },
  { id: 'thu_wr1', name: 'U. James', team: 'THU', position: 'WR', archetype: 'slot_wr',        baseSalary: 6200, baseProjection: 14.5, baseFloor: 8, baseCeiling: 28, baseVolatility: 0.40, baseBoomChance: 0.18, baseOwnership: 21 },
  { id: 'thu_wr2', name: 'P. Daws',  team: 'THU', position: 'WR', archetype: 'alpha_wr',       baseSalary: 7000, baseProjection: 15.5, baseFloor: 6, baseCeiling: 32, baseVolatility: 0.50, baseBoomChance: 0.20, baseOwnership: 22 },
  { id: 'thu_wr3', name: 'O. Finch', team: 'THU', position: 'WR', archetype: 'possession_wr',  baseSalary: 4600, baseProjection: 9.5,  baseFloor: 5, baseCeiling: 18, baseVolatility: 0.28, baseBoomChance: 0.09, baseOwnership: 9 },
  { id: 'thu_wr4', name: 'S. Bray',  team: 'THU', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4400, baseProjection: 8.5,  baseFloor: 0, baseCeiling: 32, baseVolatility: 0.78, baseBoomChance: 0.24, baseOwnership: 6 },
  { id: 'thu_te',  name: 'G. Wade',  team: 'THU', position: 'TE', archetype: 'punt_te',        baseSalary: 4200, baseProjection: 8.0,  baseFloor: 3, baseCeiling: 16, baseVolatility: 0.32, baseBoomChance: 0.09, baseOwnership: 8 },
  { id: 'thu_dst', name: 'Thunder D', team: 'THU', position: 'DST', archetype: 'risky_dst',    baseSalary: 3000, baseProjection: 6.5,  baseFloor: 0, baseCeiling: 22, baseVolatility: 0.88, baseBoomChance: 0.22, baseOwnership: 5 },

  // ── PILOTS (PIL) ────────────────────────────────────────────────────────
  { id: 'pil_qb',  name: 'B. Crane', team: 'PIL', position: 'QB', archetype: 'pocket_qb',      baseSalary: 7400, baseProjection: 22.5, baseFloor: 15, baseCeiling: 36, baseVolatility: 0.34, baseBoomChance: 0.17, baseOwnership: 23 },
  { id: 'pil_rb1', name: 'N. West',  team: 'PIL', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 5600, baseProjection: 13.0, baseFloor: 6, baseCeiling: 25, baseVolatility: 0.48, baseBoomChance: 0.20, baseOwnership: 12 },
  { id: 'pil_rb2', name: 'J. Rudd',  team: 'PIL', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 6800, baseProjection: 16.5, baseFloor: 10, baseCeiling: 26, baseVolatility: 0.30, baseBoomChance: 0.12, baseOwnership: 21 },
  { id: 'pil_wr1', name: 'V. King',  team: 'PIL', position: 'WR', archetype: 'alpha_wr',       baseSalary: 7600, baseProjection: 17.0, baseFloor: 7, baseCeiling: 36, baseVolatility: 0.52, baseBoomChance: 0.22, baseOwnership: 28 },
  { id: 'pil_wr2', name: 'G. Mays',  team: 'PIL', position: 'WR', archetype: 'slot_wr',        baseSalary: 5400, baseProjection: 12.0, baseFloor: 7, baseCeiling: 23, baseVolatility: 0.36, baseBoomChance: 0.14, baseOwnership: 15 },
  { id: 'pil_wr3', name: 'I. Thorn', team: 'PIL', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 5200, baseProjection: 10.5, baseFloor: 1, baseCeiling: 38, baseVolatility: 0.74, baseBoomChance: 0.26, baseOwnership: 9 },
  { id: 'pil_wr4', name: 'L. Cane',  team: 'PIL', position: 'WR', archetype: 'possession_wr',  baseSalary: 4400, baseProjection: 9.0,  baseFloor: 5, baseCeiling: 17, baseVolatility: 0.28, baseBoomChance: 0.09, baseOwnership: 6 },
  { id: 'pil_te',  name: 'H. Xan',   team: 'PIL', position: 'TE', archetype: 'redzone_te',     baseSalary: 5600, baseProjection: 11.5, baseFloor: 4, baseCeiling: 26, baseVolatility: 0.55, baseBoomChance: 0.19, baseOwnership: 15 },
  { id: 'pil_dst', name: 'Pilots D', team: 'PIL', position: 'DST', archetype: 'strong_dst',    baseSalary: 4600, baseProjection: 11.0, baseFloor: 3, baseCeiling: 23, baseVolatility: 0.55, baseBoomChance: 0.20, baseOwnership: 24 },

  // ── VIPERS (VIP) ────────────────────────────────────────────────────────
  { id: 'vip_qb',  name: 'S. Dray',  team: 'VIP', position: 'QB', archetype: 'rushing_qb',     baseSalary: 6200, baseProjection: 18.5, baseFloor: 10, baseCeiling: 38, baseVolatility: 0.54, baseBoomChance: 0.21, baseOwnership: 12 },
  { id: 'vip_rb1', name: 'A. Parks', team: 'VIP', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 6400, baseProjection: 15.5, baseFloor: 9, baseCeiling: 25, baseVolatility: 0.35, baseBoomChance: 0.12, baseOwnership: 18 },
  { id: 'vip_rb2', name: 'T. Osei',  team: 'VIP', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4800, baseProjection: 10.0, baseFloor: 4, baseCeiling: 22, baseVolatility: 0.50, baseBoomChance: 0.17, baseOwnership: 8 },
  { id: 'vip_wr1', name: 'W. Long',  team: 'VIP', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4600, baseProjection: 10.0, baseFloor: 1, baseCeiling: 38, baseVolatility: 0.80, baseBoomChance: 0.26, baseOwnership: 8 },
  { id: 'vip_wr2', name: 'K. Vail',  team: 'VIP', position: 'WR', archetype: 'alpha_wr',       baseSalary: 6800, baseProjection: 15.0, baseFloor: 6, baseCeiling: 30, baseVolatility: 0.50, baseBoomChance: 0.19, baseOwnership: 20 },
  { id: 'vip_wr3', name: 'D. Ness',  team: 'VIP', position: 'WR', archetype: 'slot_wr',        baseSalary: 5000, baseProjection: 11.0, baseFloor: 6, baseCeiling: 22, baseVolatility: 0.38, baseBoomChance: 0.14, baseOwnership: 12 },
  { id: 'vip_wr4', name: 'F. Bale',  team: 'VIP', position: 'WR', archetype: 'possession_wr',  baseSalary: 4000, baseProjection: 7.5,  baseFloor: 4, baseCeiling: 15, baseVolatility: 0.28, baseBoomChance: 0.08, baseOwnership: 5 },
  { id: 'vip_te',  name: 'I. York',  team: 'VIP', position: 'TE', archetype: 'punt_te',        baseSalary: 4600, baseProjection: 8.5,  baseFloor: 3, baseCeiling: 17, baseVolatility: 0.33, baseBoomChance: 0.09, baseOwnership: 10 },
  { id: 'vip_dst', name: 'Vipers D', team: 'VIP', position: 'DST', archetype: 'risky_dst',     baseSalary: 3400, baseProjection: 7.5,  baseFloor: 0, baseCeiling: 24, baseVolatility: 0.80, baseBoomChance: 0.23, baseOwnership: 9 },

  // ── ROCKETS (ROC) ───────────────────────────────────────────────────────
  { id: 'roc_qb',  name: 'F. Dent',  team: 'ROC', position: 'QB', archetype: 'pocket_qb',      baseSalary: 5800, baseProjection: 16.5, baseFloor: 9, baseCeiling: 28, baseVolatility: 0.42, baseBoomChance: 0.14, baseOwnership: 8 },
  { id: 'roc_rb1', name: 'E. Cruz',  team: 'ROC', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4600, baseProjection: 10.0, baseFloor: 3, baseCeiling: 22, baseVolatility: 0.58, baseBoomChance: 0.21, baseOwnership: 6 },
  { id: 'roc_rb2', name: 'M. Slade', team: 'ROC', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 5600, baseProjection: 13.0, baseFloor: 7, baseCeiling: 21, baseVolatility: 0.35, baseBoomChance: 0.11, baseOwnership: 13 },
  { id: 'roc_wr1', name: 'X. Miles', team: 'ROC', position: 'WR', archetype: 'possession_wr',  baseSalary: 5200, baseProjection: 12.5, baseFloor: 7, baseCeiling: 22, baseVolatility: 0.30, baseBoomChance: 0.10, baseOwnership: 13 },
  { id: 'roc_wr2', name: 'A. Duval', team: 'ROC', position: 'WR', archetype: 'slot_wr',        baseSalary: 4800, baseProjection: 10.0, baseFloor: 5, baseCeiling: 20, baseVolatility: 0.38, baseBoomChance: 0.13, baseOwnership: 9 },
  { id: 'roc_wr3', name: 'P. Renn',  team: 'ROC', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4200, baseProjection: 8.5,  baseFloor: 0, baseCeiling: 32, baseVolatility: 0.78, baseBoomChance: 0.23, baseOwnership: 6 },
  { id: 'roc_wr4', name: 'C. Lark',  team: 'ROC', position: 'WR', archetype: 'alpha_wr',       baseSalary: 6200, baseProjection: 13.5, baseFloor: 5, baseCeiling: 28, baseVolatility: 0.50, baseBoomChance: 0.18, baseOwnership: 16 },
  { id: 'roc_te',  name: 'J. Zane',  team: 'ROC', position: 'TE', archetype: 'redzone_te',     baseSalary: 5000, baseProjection: 10.5, baseFloor: 3, baseCeiling: 24, baseVolatility: 0.58, baseBoomChance: 0.20, baseOwnership: 13 },
  { id: 'roc_dst', name: 'Rockets D', team: 'ROC', position: 'DST', archetype: 'strong_dst',   baseSalary: 3600, baseProjection: 8.5,  baseFloor: 2, baseCeiling: 20, baseVolatility: 0.60, baseBoomChance: 0.18, baseOwnership: 12 },

  // ── NIGHTHAWKS (NIG) ────────────────────────────────────────────────────
  { id: 'nig_qb',  name: 'E. Brant', team: 'NIG', position: 'QB', archetype: 'rushing_qb',     baseSalary: 5600, baseProjection: 15.5, baseFloor: 7, baseCeiling: 34, baseVolatility: 0.58, baseBoomChance: 0.20, baseOwnership: 7 },
  { id: 'nig_rb1', name: 'G. Hunt',  team: 'NIG', position: 'RB', archetype: 'workhorse_rb',   baseSalary: 5400, baseProjection: 12.5, baseFloor: 6, baseCeiling: 22, baseVolatility: 0.38, baseBoomChance: 0.13, baseOwnership: 9 },
  { id: 'nig_rb2', name: 'R. Alves', team: 'NIG', position: 'RB', archetype: 'pass_catching_rb', baseSalary: 4400, baseProjection: 9.0, baseFloor: 3, baseCeiling: 20, baseVolatility: 0.52, baseBoomChance: 0.16, baseOwnership: 6 },
  { id: 'nig_wr1', name: 'Y. Nash',  team: 'NIG', position: 'WR', archetype: 'slot_wr',        baseSalary: 5600, baseProjection: 13.0, baseFloor: 7, baseCeiling: 26, baseVolatility: 0.38, baseBoomChance: 0.16, baseOwnership: 16 },
  { id: 'nig_wr2', name: 'C. Brand', team: 'NIG', position: 'WR', archetype: 'alpha_wr',       baseSalary: 6600, baseProjection: 14.5, baseFloor: 5, baseCeiling: 30, baseVolatility: 0.50, baseBoomChance: 0.19, baseOwnership: 19 },
  { id: 'nig_wr3', name: 'D. Royce', team: 'NIG', position: 'WR', archetype: 'boom_bust_wr',   baseSalary: 4400, baseProjection: 8.5,  baseFloor: 0, baseCeiling: 34, baseVolatility: 0.78, baseBoomChance: 0.23, baseOwnership: 6 },
  { id: 'nig_wr4', name: 'M. Stern', team: 'NIG', position: 'WR', archetype: 'possession_wr',  baseSalary: 4000, baseProjection: 7.5,  baseFloor: 4, baseCeiling: 15, baseVolatility: 0.28, baseBoomChance: 0.08, baseOwnership: 5 },
  { id: 'nig_te',  name: 'K. Ash',   team: 'NIG', position: 'TE', archetype: 'punt_te',        baseSalary: 3600, baseProjection: 6.5,  baseFloor: 2, baseCeiling: 13, baseVolatility: 0.32, baseBoomChance: 0.07, baseOwnership: 5 },
  { id: 'nig_dst', name: 'Nighthawks D', team: 'NIG', position: 'DST', archetype: 'risky_dst', baseSalary: 3200, baseProjection: 7.0,  baseFloor: 0, baseCeiling: 23, baseVolatility: 0.82, baseBoomChance: 0.22, baseOwnership: 7 },
];

// Fixed game matchups
export const GAME_PAIRS = [
  ['IRN', 'BLZ'],
  ['STO', 'VLT'],
  ['RAV', 'CRU'],
  ['GHO', 'THU'],
  ['PIL', 'VIP'],
  ['ROC', 'NIG'],
] as const;
