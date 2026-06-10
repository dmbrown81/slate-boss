import type { UserProfile, TitleKey } from '../types';
import { TITLES } from '../types';

export function currentTitle(profile: UserProfile): string {
  const keys = Object.keys(TITLES) as TitleKey[];
  let best: TitleKey = 'rookie_grinder';
  for (const key of keys) {
    if (profile.xp >= TITLES[key].xpRequired) best = key;
  }
  return TITLES[best].label;
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = Math.floor(xp / 200) + 1;
  return currentLevel * 200 - xp;
}
