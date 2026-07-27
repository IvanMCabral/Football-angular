import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';

export type SquadEditorSlotPlayerMap = Record<string, PlayerOnFieldDto>;

export interface SquadEditorLineupMutationState {
  homePlayers: readonly PlayerOnFieldDto[];
  benchPlayers: readonly PlayerOnFieldDto[];
  slotPlayerMap: SquadEditorSlotPlayerMap;
}

export interface SquadEditorLineupMutationResult {
  homePlayers: PlayerOnFieldDto[];
  benchPlayers: PlayerOnFieldDto[];
  slotPlayerMap: SquadEditorSlotPlayerMap;
}

export function clearSquadEditorPlayerPlacement(player: PlayerOnFieldDto): void {
  player.slotId = '';
  delete player.xPercent;
  delete player.yPercent;
}

export function placeSquadEditorPlayerInSlot(
  player: PlayerOnFieldDto,
  slotId: string,
  slotPlayerMap: SquadEditorSlotPlayerMap,
): void {
  player.slotId = slotId;
  delete player.xPercent;
  delete player.yPercent;
  slotPlayerMap[slotId] = player;
}

export function assignSquadEditorBenchPlayerToSlot(params: {
  player: PlayerOnFieldDto;
  targetSlotId: string;
  state: SquadEditorLineupMutationState;
}): SquadEditorLineupMutationResult {
  const slotPlayerMap = { ...params.state.slotPlayerMap };
  const player = params.player;

  if (player.slotId) {
    delete slotPlayerMap[player.slotId];
  }

  const occupant = slotPlayerMap[params.targetSlotId];
  const benchPlayers = [...params.state.benchPlayers];
  let homePlayers = [...params.state.homePlayers];

  if (occupant && occupant.playerId !== player.playerId) {
    clearSquadEditorPlayerPlacement(occupant);
    if (!benchPlayers.some(p => p.playerId === occupant.playerId)) {
      benchPlayers.push(occupant);
    }
    homePlayers = homePlayers.filter(p => p.playerId !== occupant.playerId);
  }

  player.slotId = params.targetSlotId;
  slotPlayerMap[params.targetSlotId] = player;

  return {
    slotPlayerMap,
    benchPlayers: benchPlayers.filter(p => p.playerId !== player.playerId),
    homePlayers: homePlayers.some(p => p.playerId === player.playerId)
      ? homePlayers
      : [...homePlayers, player],
  };
}

export function moveSquadEditorPlayerToBench(params: {
  player: PlayerOnFieldDto;
  state: SquadEditorLineupMutationState;
}): SquadEditorLineupMutationResult {
  const slotPlayerMap = { ...params.state.slotPlayerMap };
  const player = params.player;

  if (player.slotId) {
    delete slotPlayerMap[player.slotId];
  }
  clearSquadEditorPlayerPlacement(player);

  const homePlayers = params.state.homePlayers.filter(p => p.playerId !== player.playerId);
  const benchPlayers = params.state.benchPlayers.some(p => p.playerId === player.playerId)
    ? [...params.state.benchPlayers]
    : [...params.state.benchPlayers, player];

  return { homePlayers, benchPlayers, slotPlayerMap };
}

export function applySquadEditorSlotDropMutation(params: {
  player: PlayerOnFieldDto;
  sourceSlotId: string | null;
  targetSlotId: string;
  occupant: PlayerOnFieldDto | null;
  state: SquadEditorLineupMutationState;
}): SquadEditorLineupMutationResult {
  const slotPlayerMap = { ...params.state.slotPlayerMap };
  const player = params.player;

  if (params.sourceSlotId) {
    delete slotPlayerMap[params.sourceSlotId];
  }

  placeSquadEditorPlayerInSlot(player, params.targetSlotId, slotPlayerMap);

  let homePlayers = [...params.state.homePlayers];
  let benchPlayers = [...params.state.benchPlayers];

  const occupant = params.occupant;
  if (occupant && occupant.playerId !== player.playerId) {
    if (params.sourceSlotId) {
      placeSquadEditorPlayerInSlot(occupant, params.sourceSlotId, slotPlayerMap);
    } else {
      clearSquadEditorPlayerPlacement(occupant);
      if (!benchPlayers.some(p => p.playerId === occupant.playerId)) {
        benchPlayers = [...benchPlayers, occupant];
      }
      homePlayers = homePlayers.filter(p => p.playerId !== occupant.playerId);
    }
  }

  if (!params.sourceSlotId) {
    benchPlayers = benchPlayers.filter(p => p.playerId !== player.playerId);
    if (!homePlayers.some(p => p.playerId === player.playerId)) {
      homePlayers = [...homePlayers, player];
    }
  }

  return { homePlayers, benchPlayers, slotPlayerMap };
}
