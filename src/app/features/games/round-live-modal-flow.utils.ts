import { takeUntil } from 'rxjs/operators';
import { RoundMatchVM } from './models/round-live.model';
import { InjuryAutoModalPayload, RivalCardModalPayload } from './round-live-modal-flow.models';
import {
  findInjuryAutoModalCandidates,
  findRivalRedCardModalCandidate,
  shouldQueueInjuryAutoModal,
  shouldQueueRivalCardModal
} from './utils/round-live-utils';

export function roundLiveMaybeOpenInjuryAutoModal(ctx: any, matches: RoundMatchVM[]): void {
    if (ctx.debugSuppressAutoInjuryModals) {
      return;
    }
    const currentUserMatch = ctx.vmSubject.value.matches.find((m: RoundMatchVM) => m.isUserMatch && m.state);
    const userTeamId = currentUserMatch?.state
      ? ctx.resolveManagerTeamId(currentUserMatch, currentUserMatch.state)
      : (ctx.currentUserSessionTeamId ?? ctx.vmSubject.value.matches.find((m: RoundMatchVM) => m.isUserMatch)?.match.homeTeamId);
    const userTeamIdStr = userTeamId ? String(userTeamId) : null;
    if (!userTeamIdStr) {
      return;
    }

    const candidates = findInjuryAutoModalCandidates({
      matches,
      userTeamId: userTeamIdStr,
      shownEventIds: ctx.autoModalShownEventIds
    });

    for (const candidate of candidates) {
      ctx.autoModalShownEventIds.add(candidate.eventId);
      if (!candidate.alreadyResolved) {
        ctx.queueOrOpenAutoModal({
          matchId: candidate.matchId,
          state: candidate.state,
          preSelectedPlayerId: candidate.preSelectedPlayerId
        });
      }
    }
  
}

export function roundLiveMaybeOpenRivalCardInfoModal(ctx: any, matches: RoundMatchVM[]): void {
    const candidate = findRivalRedCardModalCandidate({
      matches,
      shownEventIds: ctx.rivalCardShownEventIds
    });
    if (!candidate) {
      return;
    }

    ctx.rivalCardShownEventIds.add(candidate.dedupKey);
    ctx.queueOrOpenRivalCardModal({
      matchId: candidate.matchId,
      state: candidate.state,
      playerName: candidate.playerName,
      minute: candidate.minute
    });
  
}

export function roundLiveQueueOrOpenRivalCardModal(ctx: any, payload: RivalCardModalPayload): void {
    if (shouldQueueRivalCardModal({
      status: payload.state.status,
      isRivalCardModalOpen: ctx.isRivalCardModalOpen,
      isCriticalLiveModalOpen: ctx.isCriticalLiveModalOpen
    })) {
      ctx.queuedRivalCardModal = payload;
      ctx.updatePendingLiveModalNotice();
      return;
    }
    ctx.openRivalCardInfoModal(payload);
  
}

export function roundLiveOpenRivalCardInfoModal(ctx: any, payload: RivalCardModalPayload): void {
    ctx.isRivalCardModalOpen = true;
    ctx.updatePendingLiveModalNotice();
    ctx.modals.openRivalCardInfoModal(
      payload.matchId,
      payload.state,
      { playerName: payload.playerName, minute: payload.minute, cardType: 'RED' }
    )
      .pipe(takeUntil(ctx.destroy$))
      .subscribe({
        next: () => {
          ctx.isRivalCardModalOpen = false;
          const queued = ctx.queuedRivalCardModal;
          ctx.queuedRivalCardModal = null;
          ctx.updatePendingLiveModalNotice();
          if (queued) {
            setTimeout(() => ctx.openRivalCardInfoModal(queued), 0);
          }
        },
        error: (err: unknown) => {
          ctx.logDevError('[ROUND-LIVE] rival card awareness modal error', err);
          ctx.isRivalCardModalOpen = false;
          ctx.queuedRivalCardModal = null;
          ctx.updatePendingLiveModalNotice();
        }
      });
  
}

export function roundLiveQueueOrOpenAutoModal(ctx: any, payload: InjuryAutoModalPayload): void {
    if (shouldQueueInjuryAutoModal({
      isAutoModalOpen: ctx.isAutoModalOpen,
      isCriticalLiveModalOpen: ctx.isCriticalLiveModalOpen
    })) {
      ctx.enqueueAutoModal(payload);
      ctx.updatePendingLiveModalNotice();
      return;
    }
    ctx.openInjuryAutoModal(payload);
  
}

export function roundLiveEnqueueAutoModal(ctx: any, payload: InjuryAutoModalPayload): void {
    if ((ctx.isAutoModalOpen || ctx.isCriticalLiveModalOpen) && !ctx.releaseQueuedAutoModalResumeHold) {
      ctx.releaseQueuedAutoModalResumeHold = ctx.modals.holdRoundResumeAfterModalClose();
    }
    const alreadyQueued = ctx.queuedAutoModals.some((queued: InjuryAutoModalPayload) =>
      queued.matchId === payload.matchId
      && queued.preSelectedPlayerId === payload.preSelectedPlayerId
    );
    if (!alreadyQueued) {
      ctx.queuedAutoModals = [...ctx.queuedAutoModals, payload];
      ctx.persistInjuryAutoModals();
    }
  
}

export function roundLiveOpenInjuryAutoModal(ctx: any, payload: InjuryAutoModalPayload): void {
    ctx.isAutoModalOpen = true;
    ctx.isCriticalLiveModalOpen = true;
    ctx.activeInjuryAutoModal = {
      matchId: payload.matchId,
      preSelectedPlayerId: payload.preSelectedPlayerId
    };
    ctx.persistInjuryAutoModals();
    ctx.updatePendingLiveModalNotice();
    const currentVm = ctx.vmSubject.value;
    ctx.modals.openPartidoModal(payload.matchId, payload.state, {
      home: ctx.getTeamName(payload.state.homeTeamId, currentVm.teamNameMap),
      away: ctx.getTeamName(payload.state.awayTeamId, currentVm.teamNameMap)
    }, {
      preSelectedPlayerId: payload.preSelectedPlayerId,
      reason: 'INJURY_FORCED_SUBSTITUTION'
    })
      .pipe(takeUntil(ctx.destroy$))
      .subscribe({
        complete: () => {
          ctx.isAutoModalOpen = false;
          ctx.activeInjuryAutoModal = null;
          ctx.persistInjuryAutoModals();
          ctx.releaseCriticalLiveModalGate();
        },
        error: (err: unknown) => {
          ctx.logDevError('[ROUND-LIVE] injury auto-modal error', err);
          ctx.isAutoModalOpen = false;
          ctx.isCriticalLiveModalOpen = false;
          ctx.activeInjuryAutoModal = null;
          ctx.queuedAutoModals = [];
          ctx.persistInjuryAutoModals();
          ctx.updatePendingLiveModalNotice();
        }
      });
  
}
