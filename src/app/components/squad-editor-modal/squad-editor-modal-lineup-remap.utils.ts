import { FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import {
  SquadEditorLineupMutationResult,
  SquadEditorSlotPlayerMap,
  clearSquadEditorPlayerPlacement,
  placeSquadEditorPlayerInSlot,
} from './squad-editor-modal-lineup-mutation.utils';

export interface SquadEditorFormationRemapInput {
  positions: readonly FormationPositionDTO[];
  currentXi: readonly PlayerOnFieldDto[];
  currentHomePlayers: readonly PlayerOnFieldDto[];
  currentBenchPlayers: readonly PlayerOnFieldDto[];
  isGoalkeeper: (player: PlayerOnFieldDto) => boolean;
  canPlayerUseSlot: (player: PlayerOnFieldDto, slotId: string) => boolean;
  roleFamily: (role: string | undefined) => string | null;
  goalkeeperSlotId?: string;
}

export function remapSquadEditorCurrentXiToFormation(
  input: SquadEditorFormationRemapInput,
): SquadEditorLineupMutationResult {
  if (input.positions.length === 0) {
    return {
      homePlayers: [...input.currentHomePlayers],
      benchPlayers: [...input.currentBenchPlayers],
      slotPlayerMap: {},
    };
  }

  const slotPlayerMap: SquadEditorSlotPlayerMap = {};
  const currentXi = input.currentXi.slice(0, 11);
  const goalkeeperSlotId = input.goalkeeperSlotId ?? 'GK-1';
  const indexedPositions = input.positions
    .map((position, index) => ({ position, index }))
    .sort((a, b) => a.index - b.index);

  // This is a small maximum-weight matching (11 players x 11 slots), rather
  // than an array-index zip.  The objective is lexicographic: keep as many
  // players as possible, then maximize role/line compatibility, then preserve
  // the existing slot.  The stable player and position order is the final tie
  // breaker, so the same squad always produces the same reflow.
  const lineOf = (family: string | null): 'GK' | 'DEF' | 'MID' | 'ATT' | null => {
    if (family === 'GK') return 'GK';
    if (family === 'CB' || family === 'LB' || family === 'RB' || family === 'LWB' || family === 'RWB') return 'DEF';
    if (family === 'CDM' || family === 'CM' || family === 'CAM' || family === 'LM' || family === 'RM') return 'MID';
    if (family === 'ST' || family === 'LW' || family === 'RW') return 'ATT';
    return null;
  };
  const score = (player: PlayerOnFieldDto, slot: FormationPositionDTO): number => {
    const playerFamily = input.roleFamily(player.role ?? player.position);
    const slotFamily = input.roleFamily(slot.role);
    const playerLine = lineOf(playerFamily);
    const slotLine = lineOf(slotFamily);
    if (playerLine === 'GK' || slotLine === 'GK') {
      return playerLine === 'GK' && slot.subdivisionId === goalkeeperSlotId ? 5000 : -100000;
    }
    const compatible = input.canPlayerUseSlot(player, slot.subdivisionId);
    let value = compatible ? 1000 : -700;
    if (playerFamily && slotFamily && playerFamily === slotFamily) value += 500;
    if (playerLine && slotLine && playerLine === slotLine) value += 250;
    if (player.slotId === slot.subdivisionId) value += 200;
    return value;
  };

  type Match = { count: number; score: number; assignments: Array<number | null> };
  const memo = new Map<string, Match>();
  const better = (left: Match, right: Match): Match => {
    if (left.count !== right.count) return left.count > right.count ? left : right;
    if (left.score !== right.score) return left.score > right.score ? left : right;
    const leftKey = left.assignments.map(v => v === null ? 999 : v).join(',');
    const rightKey = right.assignments.map(v => v === null ? 999 : v).join(',');
    return leftKey <= rightKey ? left : right;
  };
  const solve = (playerIndex: number, mask: number): Match => {
    const key = `${playerIndex}:${mask}`;
    const cached = memo.get(key);
    if (cached) return cached;
    if (playerIndex >= currentXi.length) {
      const terminal: Match = { count: 0, score: 0, assignments: [] };
      memo.set(key, terminal);
      return terminal;
    }
    let best = solve(playerIndex + 1, mask);
    best = { count: best.count, score: best.score, assignments: [null, ...best.assignments] };
    indexedPositions.forEach((entry, positionIndex) => {
      if ((mask & (1 << positionIndex)) !== 0) return;
      const tail = solve(playerIndex + 1, mask | (1 << positionIndex));
      const candidate: Match = {
        count: tail.count + (score(currentXi[playerIndex], entry.position) > -100000 ? 1 : 0),
        score: tail.score + score(currentXi[playerIndex], entry.position),
        assignments: [positionIndex, ...tail.assignments],
      };
      best = better(candidate, best);
    });
    memo.set(key, best);
    return best;
  };
  const matching = solve(0, 0);
  matching.assignments.forEach((positionIndex, playerIndex) => {
    if (positionIndex === null) return;
    const player = currentXi[playerIndex];
    const position = indexedPositions[positionIndex]?.position;
    if (!position || score(player, position) <= -100000) return;
    placeSquadEditorPlayerInSlot(player, position.subdivisionId, slotPlayerMap);
  });

  const homePlayers = currentXi.filter(player => player.slotId && slotPlayerMap[player.slotId] === player);
  const starterIds = new Set(homePlayers.map(player => player.playerId));
  const benchById = new Map<string, PlayerOnFieldDto>();

  for (const player of [...input.currentBenchPlayers, ...input.currentHomePlayers]) {
    if (starterIds.has(player.playerId)) { continue; }
    clearSquadEditorPlayerPlacement(player);
    benchById.set(player.playerId, player);
  }

  return {
    homePlayers,
    benchPlayers: Array.from(benchById.values()),
    slotPlayerMap,
  };
}
