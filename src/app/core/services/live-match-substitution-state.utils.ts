import { LineupDTO, PlayerLineupDTO } from '../../shared/models/lineup/lineup.dto';
import { SessionPlayer } from '../../shared/models/player.model';
import { MatchState } from './match-engine.model';
import {
  isPlaceholderLivePlayerName,
  normalizeLivePlayerName,
  sessionPlayerOverall
} from './live-match-modal-player-slots.utils';

export interface LiveSubstitutionPair {
  playerOffId: string;
  playerOnId: string;
}

export function applyLiveSubstitutionsToLineup(
  lineup: LineupDTO,
  squad: SessionPlayer[] | null | undefined,
  state: MatchState,
  userTeamId: string | null | undefined,
  rememberedSubstitutions: LiveSubstitutionPair[] = []
): PlayerLineupDTO[] {
  const squadById = new Map((squad ?? []).filter(p => !!p.sessionPlayerId).map(p => [p.sessionPlayerId, p]));
  const squadByName = new Map((squad ?? []).filter(p => !!p.name).map(p => [normalizeLivePlayerName(p.name), p]));
  const usedHydratedIds = new Set<string>();
  const livePlayers = (lineup?.players ?? []).map(player => {
    const fromSquad = squadById.get(player.playerId) ?? squadByName.get(normalizeLivePlayerName(player.name));
    if (!fromSquad) {
      if (player.playerId) usedHydratedIds.add(player.playerId);
      return player;
    }

    const hydratedId = fromSquad.sessionPlayerId ?? player.playerId;
    if (hydratedId && usedHydratedIds.has(hydratedId) && player.playerId !== hydratedId) {
      if (player.playerId) usedHydratedIds.add(player.playerId);
      return player;
    }
    if (hydratedId) usedHydratedIds.add(hydratedId);

    return {
      ...player,
      playerId: hydratedId,
      name: isPlaceholderLivePlayerName(player.name, player.position) ? (fromSquad.name ?? player.name) : player.name,
      position: player.position || fromSquad.position || 'MID',
      overall: player.overall || sessionPlayerOverall(fromSquad) || player.overall
    };
  });

  if (userTeamId && livePlayers.length) {
    applySubstitutionEvents(livePlayers, squadById, squadByName, state, userTeamId);
  }
  for (const remembered of rememberedSubstitutions) {
    applySubstitutionByIds(livePlayers, squadById, remembered.playerOffId, remembered.playerOnId);
  }

  return livePlayers;
}

export function effectiveSubstitutionsRemaining(
  remembered: LiveSubstitutionPair[],
  state: MatchState | null | undefined,
  userTeamId: string | null | undefined
): number {
  const rememberedOffIds = new Set(remembered.map(sub => sub.playerOffId).filter(Boolean));
  const userEventOffIds = new Set((state?.events ?? [])
    .filter(event => event.eventType === 'SUBSTITUTION')
    .filter(event => !userTeamId || !event.teamId || event.teamId === userTeamId)
    .map(event => event.playerId)
    .filter((playerId): playerId is string => !!playerId));
  const usedByUserTeam = new Set([...rememberedOffIds, ...userEventOffIds]).size;
  const stateRemaining = state?.substitutionsRemaining;

  if (usedByUserTeam === 0 && typeof stateRemaining === 'number' && Number.isFinite(stateRemaining)) {
    return Math.max(0, Math.min(5, stateRemaining));
  }
  return Math.max(0, 5 - usedByUserTeam);
}

export function liveSubstitutionPairs(
  state: MatchState,
  userTeamId: string | null | undefined,
  remembered: LiveSubstitutionPair[] = []
): LiveSubstitutionPair[] {
  const fromEvents = (state.events ?? [])
    .filter(e => e.eventType === 'SUBSTITUTION')
    .filter(e => !userTeamId || !e.teamId || e.teamId === userTeamId)
    .map(event => ({
      playerOffId: event.playerId ?? '',
      playerOnId: event.relatedPlayerId ?? ''
    }))
    .filter(pair => !!pair.playerOffId && !!pair.playerOnId);
  const seen = new Set<string>();
  const pairs: LiveSubstitutionPair[] = [];

  for (const pair of [...fromEvents, ...remembered]) {
    const key = `${pair.playerOffId}->${pair.playerOnId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(pair);
  }

  return pairs;
}

export function unavailableBenchPlayerIds(pairs: LiveSubstitutionPair[]): Set<string> {
  return new Set(pairs.map(pair => pair.playerOffId).filter(Boolean));
}

function applySubstitutionEvents(
  livePlayers: PlayerLineupDTO[],
  squadById: Map<string, SessionPlayer>,
  squadByName: Map<string, SessionPlayer>,
  state: MatchState,
  userTeamId: string
): void {
  (state.events ?? [])
    .filter(e => e.eventType === 'SUBSTITUTION')
    .filter(e => !e.teamId || e.teamId === userTeamId)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
    .forEach(event => {
      const offName = normalizeLivePlayerName(event.playerName);
      const onName = normalizeLivePlayerName(event.playerOnName ?? event.relatedPlayerName ?? '');
      const onId = event.relatedPlayerId;
      if (!offName || (!onName && !onId)) return;

      const offIndex = livePlayers.findIndex(p =>
        normalizeLivePlayerName(p.name) === offName || p.playerId === event.playerId
      );
      const onPlayer = (onId ? squadById.get(onId) : undefined) ?? (onName ? squadByName.get(onName) : undefined);
      if (offIndex < 0 || !onPlayer?.sessionPlayerId) return;

      applySubstitutionPlayer(livePlayers, offIndex, onPlayer, event.playerOnName ?? event.relatedPlayerName);
    });
}

function applySubstitutionByIds(
  livePlayers: PlayerLineupDTO[],
  squadById: Map<string, SessionPlayer>,
  playerOffId: string,
  playerOnId: string
): void {
  const offIndex = livePlayers.findIndex(p => p.playerId === playerOffId);
  const onPlayer = squadById.get(playerOnId);
  if (offIndex < 0 || !onPlayer?.sessionPlayerId) return;

  applySubstitutionPlayer(livePlayers, offIndex, onPlayer);
}

function applySubstitutionPlayer(
  livePlayers: PlayerLineupDTO[],
  offIndex: number,
  onPlayer: SessionPlayer,
  fallbackName?: string | null
): void {
  livePlayers[offIndex] = {
    ...livePlayers[offIndex],
    playerId: onPlayer.sessionPlayerId,
    name: onPlayer.name ?? fallbackName ?? livePlayers[offIndex].name,
    position: onPlayer.position ?? livePlayers[offIndex].position,
    overall: sessionPlayerOverall(onPlayer) ?? livePlayers[offIndex].overall
  };
}
