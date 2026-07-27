import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';

export type SquadEditorAverageAttribute = 'attack' | 'defense' | 'technique' | 'speed' | 'mentality';

export function computeSquadEditorAvgAttribute(
  players: PlayerOnFieldDto[],
  attr: SquadEditorAverageAttribute
): number {
  if (players.length === 0) {
    return 0;
  }

  let sum = 0;
  let count = 0;

  for (const player of players) {
    const value = player[attr];
    const rating = typeof value === 'number' && Number.isFinite(value)
      ? value
      : (typeof player.overall === 'number' ? player.overall : 70);

    sum += rating;
    count++;
  }

  return count === 0 ? 0 : Math.round(sum / count);
}
