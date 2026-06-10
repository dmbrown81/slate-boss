import type { PlayerScore, Player } from '../types';
import { APP_NAME } from '../config';

function slotEmoji(score: number, projection: number): string {
  const ratio = score / projection;
  if (ratio >= 1.3) return '🟩';
  if (ratio >= 1.0) return '🟨';
  if (ratio >= 0.7) return '🟧';
  return '🟥';
}

export function generateShare(
  rank: number,
  total: number,
  score: number,
  slateNum: number,
  scores: PlayerScore[],
  players: Player[],
  streak: number = 0
): string {
  const emojis = players
    .map((p) => {
      const sc = scores.find((s) => s.playerId === p.id);
      if (!sc) return '⬜';
      return slotEmoji(sc.final, p.displayedProjection);
    })
    .join('');

  const streakLine = streak > 1 ? `\n🔥 Streak: ${streak}` : '';

  return [
    `${APP_NAME} #${slateNum} 🏈`,
    emojis,
    `Rank ${rank}/${total} · ${score.toFixed(1)} pts${streakLine}`,
    'No money. Just lineups.',
  ].join('\n');
}
