import { MatchEvent, MatchState } from '../../core/services/match-engine.model';
import { RoundMatchVM } from './models/round-live.model';
import { normalizeTacticalSlotSnapshotForDebug } from './utils/round-live-utils';

export function roundLiveDebugTriggerUserPartidoInjury(ctx: any, playerId?: string): { injuredPlayerId?: string; reason?: string } {
    const currentVm = ctx.vmSubject.value;
    const userMatch = currentVm.matches.find((match: RoundMatchVM) => match.isUserMatch && match.state);
    const state = userMatch?.state;
    if (!userMatch || !state) {
      return { reason: 'No hay partido de usuario vivo para simular lesión propia en Partido.' };
    }

    const userTeamId = ctx.resolveManagerTeamId(userMatch, state);
    const managerIsAway = userTeamId === String(state.awayTeamId);
    const sourceSlots = managerIsAway ? (state.awaySlots ?? []) : (state.homeSlots ?? []);
    const normalizedSourceSlots = normalizeTacticalSlotSnapshotForDebug(sourceSlots);
    const activeDebugPartidoEvents = (state.events ?? []).filter((event: MatchEvent) =>
      event.eventType === 'INJURY'
      && typeof event.description === 'string'
      && /Debug\s*Partido:/i.test(event.description)
    );
    if (activeDebugPartidoEvents.length > 0) {
      return {
        reason: 'Ya hay una lesión Debug Partido activa. Cerrá/reabrí o avanzá a un estado limpio antes de crear otra.'
      };
    }
    if (!normalizedSourceSlots) {
      return {
        reason: 'El XI del usuario ya está incompleto; no se simula otra lesión Partido para no crear huecos falsos.'
      };
    }

    const selectedSlot = normalizedSourceSlots
      .filter(slot => ((slot as any).position || '').toUpperCase() !== 'GK')
      .find(slot => !playerId || String(slot.sessionPlayerId ?? slot.playerId ?? '') === playerId);
    const injuredPlayerId = String(selectedSlot?.sessionPlayerId ?? selectedSlot?.playerId ?? '');
    if (!selectedSlot || !injuredPlayerId) {
      return { reason: 'No hay jugador de campo del usuario para simular lesión propia en Partido.' };
    }

    const slotIndex = typeof selectedSlot.slotIndex === 'number'
      ? selectedSlot.slotIndex
      : normalizedSourceSlots.indexOf(selectedSlot);
    const nextSlots = normalizedSourceSlots.filter((slot, index: number) => {
      const slotPlayerId = String(slot.sessionPlayerId ?? slot.playerId ?? '');
      const currentSlotIndex = typeof slot.slotIndex === 'number' ? slot.slotIndex : index;
      return slotPlayerId !== injuredPlayerId || currentSlotIndex !== slotIndex;
    });
    const nextEvent = {
      eventType: 'INJURY' as const,
      minute: state.currentMinute ?? 0,
      playerId: injuredPlayerId,
      playerName: `Jugador propio ${injuredPlayerId}`,
      description: `DebugPartido: lesión propia para ${injuredPlayerId}`,
      teamId: userTeamId
    };
    const nextState: MatchState = {
      ...state,
      status: state.status === 'NOT_STARTED' ? 'PAUSED' : state.status,
      events: [...(state.events ?? []), nextEvent],
      homeSlots: managerIsAway ? state.homeSlots : nextSlots,
      awaySlots: managerIsAway ? nextSlots : state.awaySlots,
      homePlayerRatings: managerIsAway
        ? state.homePlayerRatings
        : (state.homePlayerRatings ?? []).map((rating: any) => rating.playerId === injuredPlayerId
            ? { ...rating, injuries: Math.max(1, rating.injuries ?? 0) }
            : rating),
      awayPlayerRatings: managerIsAway
        ? (state.awayPlayerRatings ?? []).map((rating: any) => rating.playerId === injuredPlayerId
            ? { ...rating, injuries: Math.max(1, rating.injuries ?? 0) }
            : rating)
        : state.awayPlayerRatings
    };
    const nextMatches = currentVm.matches.map((match: RoundMatchVM) =>
      match === userMatch
        ? { ...match, state: nextState }
        : match
    );
    ctx.updateVm({ ...currentVm, matches: nextMatches });
    return { injuredPlayerId };
  
}

export function roundLiveDebugTriggerUserInjuryModals(ctx: any, playerIds?: string[]): { queued: string[]; reason?: string } {
    const userMatch = ctx.vmSubject.value.matches.find((match: RoundMatchVM) => match.isUserMatch && match.state);
    const state = userMatch?.state;
    if (!userMatch || !state) {
      return { queued: [], reason: 'No hay partido de usuario vivo para simular lesiones.' };
    }

    const userTeamId = ctx.resolveManagerTeamId(userMatch, state);
    const slots = userTeamId === String(state.awayTeamId)
      ? (state.awaySlots ?? [])
      : (state.homeSlots ?? []);
    const autoIds = slots
      .filter((slot: any) => (slot.position || '').toUpperCase() !== 'GK')
      .map((slot: any) => String(slot.sessionPlayerId ?? slot.playerId ?? ''))
      .filter((id: string) => !!id)
      .slice(0, 2);
    const ids = (playerIds?.length ? playerIds : autoIds).filter((id: string) => !!id);
    if (ids.length === 0) {
      return { queued: [], reason: 'No hay jugadores de campo disponibles para simular lesiones.' };
    }

    ids.forEach((playerId: string) => {
      ctx.queueOrOpenAutoModal({
        matchId: String(state.matchId),
        state,
        preSelectedPlayerId: playerId
      });
    });

    return { queued: ids };
  
}
