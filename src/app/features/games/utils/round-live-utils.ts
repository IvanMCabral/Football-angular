import { MatchState } from '../../../core/services/match-engine.model';
import { RoundMatchVM } from '../models/round-live.model';

export type FixtureStatus = 'SCHEDULED' | 'SIMULATED' | 'CANCELLED';

export interface InjuryAutoModalCandidate {
  eventId: string;
  matchId: string;
  state: MatchState;
  preSelectedPlayerId: string;
  alreadyResolved: boolean;
}

export interface RivalCardModalCandidate {
  dedupKey: string;
  matchId: string;
  state: MatchState;
  playerName: string;
  minute: number;
}

export interface DebugTacticalSlot {
  sessionPlayerId?: string | null;
  playerId?: string | null;
  slotIndex?: number | null;
}

export interface PendingRoundStartMatch {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
}

export interface PersistedInjuryAutoModalRef {
  matchId: string;
  preSelectedPlayerId: string;
}

export const ROUND_LIVE_DEBUG_STORAGE_KEYS = {
  freeze: 'manager.deFreezeLiveRound',
  suppressAutoInjury: 'manager.debugSuppressAutoInjuryModals',
  controls: 'manager.showRoundLiveDeControls'
} as const;

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Por Iniciar',
  RUNNING: 'En Juego',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado'
};

const EVENT_ICONS: Record<string, string> = {
  GOAL: '⚽',
  CARD: '🟨',
  INJURY: '🚑',
  SUBSTITUTION: '🔄'
};

export function getRoundStatusText(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getRoundEventIcon(eventType: string): string {
  return EVENT_ICONS[eventType] || '📋';
}

export function getLastRoundEvents<T>(events: T[], count: number): T[] {
  return events.slice(-count).reverse();
}

export function getRoundTeamName(teamId: unknown, teamNameMap: Record<string, string> | null): string {
  const id = String(teamId);
  return teamNameMap?.[id] || id.substring(0, 8);
}

export function mapRoundFixtureStatus(fixtureStatus: string): FixtureStatus {
  switch (fixtureStatus) {
    case 'PENDING':
    case 'SIMULATING':
    case 'NOT_STARTED':
    case 'RUNNING':
    case 'PAUSED':
      return 'SCHEDULED';
    case 'COMPLETED':
    case 'FINISHED':
      return 'SIMULATED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'SCHEDULED';
  }
}

export function isTerminalRoundState(status: string | undefined): boolean {
  return status === 'FINISHED' || status === 'CANCELLED';
}

export function findRoundControlAnchorMatch(vm: { matches: RoundMatchVM[] }): RoundMatchVM | null {
  return vm.matches.find(match => match.isUserMatch && !isTerminalRoundState(match.state?.status))
    ?? vm.matches.find(match => !isTerminalRoundState(match.state?.status))
    ?? null;
}

export function buildPendingRoundStartMatches(matches: RoundMatchVM[]): PendingRoundStartMatch[] {
  return matches
    .filter(roundMatch => !roundMatch.state || roundMatch.state.status === 'NOT_STARTED')
    .map(roundMatch => ({
      matchId: String(roundMatch.match.id),
      homeTeamId: String(roundMatch.match.homeTeamId),
      awayTeamId: String(roundMatch.match.awayTeamId)
    }));
}

export function resolveRoundManagerTeamId(input: {
  userMatch: RoundMatchVM;
  state: MatchState;
  currentUserSessionTeamId: string | null;
}): string {
  const explicit = input.userMatch.userTeamId ?? input.currentUserSessionTeamId;
  const teamIds = [String(input.state.homeTeamId), String(input.state.awayTeamId)];

  if (explicit && teamIds.includes(String(explicit))) {
    return String(explicit);
  }

  return String(input.userMatch.match.homeTeamId ?? input.state.homeTeamId);
}

export function normalizeTerminalLiveState(state: MatchState): MatchState {
  if (
    state.currentMinute >= 90 &&
    state.status !== 'FINISHED' &&
    state.status !== 'CANCELLED' &&
    state.status !== 'PAUSED'
  ) {
    return { ...state, status: 'FINISHED' };
  }

  return state;
}

export function wasPlayerSubstitutedOffInState(state: MatchState, playerId: string): boolean {
  return (state.events ?? []).some(event =>
    event.eventType === 'SUBSTITUTION' &&
    String(event.playerId ?? '') === playerId
  );
}

export function buildPendingLiveModalNotice(input: {
  queuedInjuryCount: number;
  hasQueuedRivalCard: boolean;
  isCriticalLiveModalOpen: boolean;
}): string | null {
  if (input.queuedInjuryCount > 0) {
    const suffix = input.queuedInjuryCount > 1 ? ` (${input.queuedInjuryCount})` : '';
    return `Evento pendiente: lesión propia${suffix}. Al cerrar el modal actual se abrirá Sustitución.`;
  }

  if (input.hasQueuedRivalCard) {
    return input.isCriticalLiveModalOpen
      ? 'Evento pendiente: roja rival. Al cerrar el modal actual verás el aviso táctico.'
      : 'Evento pendiente: roja rival. Pausá el partido o abrí Partido para revisarlo sin cortar el juego.';
  }

  return null;
}

export function shouldQueueRivalCardModal(input: {
  status: string | undefined;
  isRivalCardModalOpen: boolean;
  isCriticalLiveModalOpen: boolean;
}): boolean {
  return input.status === 'RUNNING' || input.isRivalCardModalOpen || input.isCriticalLiveModalOpen;
}

export function shouldQueueInjuryAutoModal(input: {
  isAutoModalOpen: boolean;
  isCriticalLiveModalOpen: boolean;
}): boolean {
  return input.isAutoModalOpen || input.isCriticalLiveModalOpen;
}

export function buildPersistedInjuryAutoModalPayload(input: {
  active: PersistedInjuryAutoModalRef | null;
  queued: PersistedInjuryAutoModalRef[];
}): { active: PersistedInjuryAutoModalRef[]; queued: PersistedInjuryAutoModalRef[] } | null {
  const active = input.active ? [input.active] : [];
  const queued = input.queued.map(item => ({
    matchId: item.matchId,
    preSelectedPlayerId: item.preSelectedPlayerId
  }));

  if (active.length === 0 && queued.length === 0) {
    return null;
  }

  return { active, queued };
}

export function parsePersistedInjuryAutoModalRefs(raw: string): PersistedInjuryAutoModalRef[] | null {
  let parsed: {
    active?: PersistedInjuryAutoModalRef[];
    queued?: PersistedInjuryAutoModalRef[];
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return [
    ...(parsed.active ?? []),
    ...(parsed.queued ?? [])
  ].filter(item => !!item?.matchId && !!item?.preSelectedPlayerId);
}

export function findRestorableInjuryAutoModals(input: {
  refs: PersistedInjuryAutoModalRef[];
  matches: RoundMatchVM[];
}): Array<PersistedInjuryAutoModalRef & { state: MatchState }> {
  const restorable: Array<PersistedInjuryAutoModalRef & { state: MatchState }> = [];

  for (const ref of input.refs) {
    const match = input.matches.find(candidate => String(candidate.state?.matchId ?? candidate.match.id) === ref.matchId);
    const state = match?.state;
    if (!state || isTerminalRoundState(state.status)) {
      continue;
    }
    if (wasPlayerSubstitutedOffInState(state, ref.preSelectedPlayerId)) {
      continue;
    }
    restorable.push({ ...ref, state });
  }

  return restorable;
}

export function patchRoundMatchFormation(input: {
  matches: RoundMatchVM[];
  matchId: string;
  state: MatchState;
  formation: string;
}): RoundMatchVM[] {
  return input.matches.map(roundMatch => {
    if (String(roundMatch.match.id) !== input.matchId || !roundMatch.state) {
      return roundMatch;
    }

    const managerTeamId = roundMatch.userTeamId ?? input.state.homeTeamId;
    const patchedState: MatchState = managerTeamId === roundMatch.state.homeTeamId
      ? { ...roundMatch.state, homeFormation: input.formation }
      : { ...roundMatch.state, awayFormation: input.formation };

    return { ...roundMatch, state: patchedState };
  });
}

export function findInjuryAutoModalCandidates(input: {
  matches: RoundMatchVM[];
  userTeamId: string | null;
  shownEventIds: ReadonlySet<string>;
}): InjuryAutoModalCandidate[] {
  if (!input.userTeamId) {
    return [];
  }

  const candidates: InjuryAutoModalCandidate[] = [];
  for (const match of input.matches) {
    const state = match.state;
    if (!state?.events || isTerminalRoundState(state.status)) {
      continue;
    }

    const matchHomeId = String(state.homeTeamId ?? '');
    const matchAwayId = String(state.awayTeamId ?? '');
    const isUserMatch = matchHomeId === input.userTeamId || matchAwayId === input.userTeamId;
    if (!isUserMatch) {
      continue;
    }

    for (const event of state.events) {
      if (!event || event.eventType !== 'INJURY' || !event.playerId) {
        continue;
      }

      const eventTeamId = event.teamId ? String(event.teamId) : null;
      if (eventTeamId !== input.userTeamId) {
        continue;
      }

      const eventId = `${state.matchId}|${event.minute}|${event.playerId}`;
      if (input.shownEventIds.has(eventId)) {
        continue;
      }

      candidates.push({
        eventId,
        matchId: String(state.matchId),
        state,
        preSelectedPlayerId: String(event.playerId),
        alreadyResolved: wasPlayerSubstitutedOffInState(state, String(event.playerId))
      });
    }
  }

  return candidates;
}

export function findRivalRedCardModalCandidate(input: {
  matches: RoundMatchVM[];
  shownEventIds: ReadonlySet<string>;
}): RivalCardModalCandidate | null {
  const userMatch = input.matches.find(match => match.isUserMatch);
  const userTeamId = userMatch?.userTeamId ?? userMatch?.match.homeTeamId;
  const userTeamIdStr = userTeamId ? String(userTeamId) : null;
  const state = userMatch?.state;
  if (!userTeamIdStr || !state?.events || isTerminalRoundState(state.status)) {
    return null;
  }

  for (const event of state.events) {
    if (!event || event.eventType !== 'RED_CARD') {
      continue;
    }

    const eventTeamId = event.teamId ? String(event.teamId) : null;
    if (!eventTeamId || eventTeamId === userTeamIdStr) {
      continue;
    }

    const dedupKey = event.playerId
      ? `${state.matchId}|${event.minute}|${event.playerId}`
      : `${state.matchId}|${event.minute}|${eventTeamId}`;
    if (input.shownEventIds.has(dedupKey)) {
      continue;
    }

    return {
      dedupKey,
      matchId: String(state.matchId),
      state,
      playerName: event.playerName || 'Jugador rival',
      minute: event.minute
    };
  }

  return null;
}

export function isLocalDebugHost(hostname: string | undefined): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function readStorageFlag(storage: Storage | undefined, key: string): boolean {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeStorageFlag(storage: Storage | undefined, key: string, enabled: boolean): void {
  try {
    storage?.setItem(key, enabled ? '1' : '0');
  } catch {
    // Non-fatal: callers keep their in-memory state.
  }
}

export function hasCompleteTacticalSlotSnapshot(slots: DebugTacticalSlot[]): boolean {
  const playerIds = new Set<string>();
  const slotIndexes = new Set<number>();

  for (const [fallbackIndex, slot] of (slots ?? []).entries()) {
    const playerId = String(slot.sessionPlayerId ?? slot.playerId ?? '');
    if (!playerId) {
      return false;
    }
    playerIds.add(playerId);

    const slotIndex = typeof slot.slotIndex === 'number' ? slot.slotIndex : fallbackIndex;
    if (slotIndex < 0 || slotIndex > 10) {
      return false;
    }
    slotIndexes.add(slotIndex);
  }

  return playerIds.size === 11 &&
    slotIndexes.size === 11 &&
    Array.from({ length: 11 }, (_, index) => index).every(index => slotIndexes.has(index));
}

export function normalizeTacticalSlotSnapshotForDebug<T extends DebugTacticalSlot>(
  slots: T[]
): T[] | null {
  const uniqueByPlayer = new Map<string, T>();
  for (const slot of slots ?? []) {
    const playerId = String(slot.sessionPlayerId ?? slot.playerId ?? '');
    if (!playerId || uniqueByPlayer.has(playerId)) {
      return null;
    }
    uniqueByPlayer.set(playerId, slot);
  }
  if (uniqueByPlayer.size !== 11) {
    return null;
  }

  if (hasCompleteTacticalSlotSnapshot(slots)) {
    return [...slots].sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
  }

  const usedIndexes = new Set<number>();
  const normalized: T[] = [];
  const deferred: T[] = [];

  for (const slot of uniqueByPlayer.values()) {
    const slotIndex = typeof slot.slotIndex === 'number' ? slot.slotIndex : null;
    if (slotIndex !== null && slotIndex >= 0 && slotIndex <= 10 && !usedIndexes.has(slotIndex)) {
      usedIndexes.add(slotIndex);
      normalized.push(slot);
    } else {
      deferred.push(slot);
    }
  }

  const missingIndexes = Array.from({ length: 11 }, (_, index) => index)
    .filter(index => !usedIndexes.has(index));
  if (missingIndexes.length !== deferred.length) {
    return null;
  }

  deferred.forEach((slot, index) => {
    normalized.push({
      ...slot,
      slotIndex: missingIndexes[index]
    });
  });

  return normalized.sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
}
