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
  const usedPositionIndexes = new Set<number>();
  const indexedPositions = input.positions.map((position, index) => ({ position, index }));
  const goalkeeperSlotId = input.goalkeeperSlotId ?? 'GK-1';

  const assignPlayer = (
    player: PlayerOnFieldDto,
    candidates: Array<{ position: FormationPositionDTO; index: number }>,
  ): boolean => {
    const candidate = candidates.find(entry =>
      !usedPositionIndexes.has(entry.index)
      && input.canPlayerUseSlot(player, entry.position.subdivisionId)
    );
    if (!candidate) { return false; }

    placeSquadEditorPlayerInSlot(player, candidate.position.subdivisionId, slotPlayerMap);
    usedPositionIndexes.add(candidate.index);
    return true;
  };

  for (const player of currentXi) {
    if (input.isGoalkeeper(player)) {
      assignPlayer(
        player,
        indexedPositions.filter(entry => entry.position.subdivisionId === goalkeeperSlotId),
      );
    }
  }

  for (const player of currentXi) {
    if (input.isGoalkeeper(player) || player.slotId === goalkeeperSlotId) { continue; }
    const playerFamily = input.roleFamily(player.role ?? player.position);
    assignPlayer(
      player,
      indexedPositions.filter(entry => input.roleFamily(entry.position.role) === playerFamily),
    );
  }

  for (const player of currentXi) {
    if (player.slotId && slotPlayerMap[player.slotId] === player) { continue; }
    assignPlayer(player, indexedPositions);
  }

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
