export type Archetype =
  | 'pocket_qb'
  | 'rushing_qb'
  | 'workhorse_rb'
  | 'pass_catching_rb'
  | 'alpha_wr'
  | 'boom_bust_wr'
  | 'possession_wr'
  | 'slot_wr'
  | 'redzone_te'
  | 'punt_te'
  | 'strong_dst'
  | 'risky_dst';

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
}
