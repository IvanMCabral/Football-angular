import { TACTICAL_LAYOUTS } from '../constants/tactical-layouts';
import { SessionPlayer } from '../models/player.model';
import { getRoleFamily } from './player-role-utils';

/** Reflow the existing players, never add a bench player or move the keeper outfield. */
export function reflowTacticalXi(assignments: Map<number, string | null>, from: string, to: string,
                                squad: readonly SessionPlayer[]): Map<number, string | null> {
  const target = TACTICAL_LAYOUTS[to] ?? [];
  const source = TACTICAL_LAYOUTS[from] ?? [];
  const players = Array.from(assignments).sort(([a], [b]) => a - b)
    .filter((entry): entry is [number, string] => !!entry[1])
    .filter((entry, i, all) => all.findIndex(other => other[1] === entry[1]) === i).slice(0, 11);
  type Fit = { count: number; score: number; choices: (number | null)[] };
  const memo = new Map<string, Fit>();
  const solve = (slotIndex: number, used: number): Fit => {
    if (slotIndex >= target.length) return { count: 0, score: 0, choices: [] };
    const key = slotIndex + ':' + used;
    const known = memo.get(key); if (known) return known;
    const empty = solve(slotIndex + 1, used);
    let best: Fit = { ...empty, choices: [null, ...empty.choices] };
    players.forEach(([previousIndex, id], playerIndex) => {
      if (used & (1 << playerIndex)) return;
      const keeper = previousIndex === 0;
      if (keeper !== (target[slotIndex].role === 'GK')) return;
      const natural = squad.find(p => p.sessionPlayerId === id)?.position;
      const previous = source[previousIndex];
      const desired = target[slotIndex];
      const score = (natural === desired.role ? 200 : 0) +
        (previous?.role === desired.role ? 100 : 0) +
        (getRoleFamily(natural) === getRoleFamily(desired.role) ? 50 : 0) +
        (previousIndex === slotIndex ? 5 : 0) - Math.abs((previous?.x ?? desired.x) - desired.x) / 100;
      const tail = solve(slotIndex + 1, used | (1 << playerIndex));
      const candidate = { count: tail.count + 1, score: tail.score + score, choices: [playerIndex, ...tail.choices] };
      if (candidate.count > best.count || (candidate.count === best.count && candidate.score > best.score)) best = candidate;
    });
    memo.set(key, best); return best;
  };
  return new Map(solve(0, 0).choices.map((choice, index) => [index, choice === null ? null : players[choice][1]]));
}
