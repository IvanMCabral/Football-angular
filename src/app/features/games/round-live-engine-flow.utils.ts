import { filter, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';
import { MatchState, RoundState } from '../../core/services/match-engine.model';
import {
  areRoundMatchesFinished,
  buildPendingRoundStartMatches,
  hasRoundMatchStarted,
  isTerminalRoundState,
  normalizeTerminalLiveState
} from './utils/round-live-utils';

export function roundLiveStartRoundEngine(ctx: any, gameId: string, matches: RoundMatchVM[]): any {
    // The career id identifies the owner, not the live round. Reusing it as
    // the RoundEngine registry key makes every later fixture collide with the
    // completed first engine. Keep one stable UUID per career/round so a
    // reload reconnects to the same engine while each new round gets a fresh
    // registry identity.
    const requestRoundId = getOrCreateRoundEngineId(gameId, ctx.vmSubject.value.roundNumber);
    const matchData = matches.map(rm => ({
      matchId: String(rm.match.id),
      homeTeamId: String(rm.match.homeTeamId),
      awayTeamId: String(rm.match.awayTeamId)
    }));

    const startRound$: Observable<RoundState | null> = ctx.autoStartTriggered
      ? of(null)
      : (ctx.startingRound = true, ctx.startPhase = 'Iniciando partido', ctx.engineService.startRound(requestRoundId, matchData).pipe(
          tap((state: RoundState) => {
            ctx.startingRound = false;
            if (state && state.roundId) {
              ctx.resolvedRoundId$.next(state.roundId);
            }
          }),
          tap({ error: () => { ctx.startingRound = false; } })
        ));

    const sseStream$: Observable<RoundState> = ctx.resolvedRoundId$.pipe(
      filter((id): id is string => !!id),
      take(1),
      switchMap((id: string) => ctx.engineService.streamRoundState(id))
    );

    startRound$.pipe(
      switchMap(() => sseStream$),
      takeUntil(ctx.destroy$)
    ).subscribe({
      next: (roundState: RoundState) => {
        const currentVm = ctx.vmSubject.value;
        const updatedMatches = currentVm.matches.map((rm: RoundMatchVM) => {
          const matchState = roundState.matches.find((ms: MatchState) =>
            String(ms.matchId) === String(rm.match.id)
          );
          const normalizedMatchState = matchState
            ? ctx.normalizeTerminalLiveState(matchState)
            : undefined;
          const match = normalizedMatchState
            ? { ...rm.match, status: ctx.mapFixtureStatus(normalizedMatchState.status) }
            : rm.match;
          return {
            ...rm,
            match,
            state: normalizedMatchState
          };
        });

        const newVm = {
          ...currentVm,
          matches: updatedMatches,
          allFinished: areRoundMatchesFinished({ matches: updatedMatches, roundStatus: roundState.status }),
          isRoundPaused: updatedMatches.some((m: RoundMatchVM) => m.state?.status === 'PAUSED'),
          anyStarted: updatedMatches.some((m: RoundMatchVM) => hasRoundMatchStarted(m.state?.status))
        };

        if (newVm.allFinished) {
          clearRoundEngineId(gameId, currentVm.roundNumber);
        }

        ctx.updateVm(newVm);
        ctx.applyDeFreezeIfNeeded(newVm);
        ctx.restorePersistedInjuryAutoModals(updatedMatches);

        ctx.maybeOpenInjuryAutoModal(updatedMatches);
        ctx.maybeOpenRivalCardInfoModal(updatedMatches);
      },
      error: (err: unknown) => {
        ctx.logDevError('[ROUND] Error in SSE stream:', err);
      },
      complete: () => {
      }
    });
  
}

export function roundLiveApplyDeFreezeIfNeeded(ctx: any, vm: RoundLiveViewModel, force = false): void {
    if (!ctx.debugFreezeEnabled || vm.allFinished || (!force && vm.isRoundPaused) || ctx.debugFreezePauseInFlight) {
      return;
    }

    const anchorMatch = ctx.findRoundControlAnchorMatch(vm);
    if (!anchorMatch || !anchorMatch.state || isTerminalRoundState(anchorMatch.state.status)) {
      return;
    }

    const roundKey = `${vm.gameId}|${vm.roundNumber}`;
    if (!force && ctx.debugFreezePausedRoundKeys.has(roundKey)) {
      return;
    }

    ctx.debugFreezePauseInFlight = true;
    ctx.engineService.pauseRoundForMatch(vm.gameId, String(anchorMatch.match.id)).subscribe({
      next: () => {
        ctx.debugFreezePausedRoundKeys.add(roundKey);
        ctx.updateVm({ ...ctx.vmSubject.value, isRoundPaused: true });
      },
      error: (err: unknown) => ctx.logDevError('[ROUND-LIVE] debug freeze pause failed', err),
      complete: () => {
        ctx.debugFreezePauseInFlight = false;
      }
    });
  
}

export function roundLiveResumeAll(ctx: any): any {
    const vm = ctx.vmSubject.value;
    if (!vm.isRoundPaused) {
      return;
    }

    const anchorMatch = ctx.findRoundControlAnchorMatch(vm);
    if (!anchorMatch) {
      return;
    }

    ctx.engineService.resumeRoundForMatch(vm.gameId, String(anchorMatch.match.id)).subscribe({
      next: () => ctx.updateVm({ ...ctx.vmSubject.value, isRoundPaused: false }),
      error: (err: unknown) => ctx.logDevError('[ROUND-LIVE] resumeAll failed', err)
    });
  
}

export function roundLiveIniciarTodos(ctx: any): void {
    if (ctx.startingRound) {
      return;
    }
    const vm = ctx.vmSubject.value;
    const pending = buildPendingRoundStartMatches(vm.matches);

    if (pending.length === 0) {
      return;
    }

    const roundId = getOrCreateRoundEngineId(vm.gameId, vm.roundNumber);
    ctx.startingRound = true;
    ctx.startPhase = 'Iniciando partido';
    ctx.engineService.markMatchStartClick?.();
    ctx.engineService.startRound(roundId, pending).subscribe({
      next: (state: RoundState) => {
        ctx.startingRound = false;
        if (state && state.roundId) {
          ctx.resolvedRoundId$.next(state.roundId);
        }
      },
      error: (err: unknown) => {
        ctx.startingRound = false;
        ctx.logDevError('[ROUND-LIVE] Iniciar Todos failed', err);
      }
    });
  
}

export function roundLiveTryAutoStartRound(ctx: any, vm: RoundLiveViewModel): void {
    if (ctx.autoStartTriggered || ctx.startingRound) {
      return;
    }
    ctx.autoStartTriggered = true;

    if (vm.errorMsg || vm.matches.length === 0) {
      return;
    }

    const pending = buildPendingRoundStartMatches(vm.matches);

    if (pending.length === 0) {
      return;
    }

    ctx.startingRound = true;
    ctx.startPhase = 'Iniciando partido';
    ctx.engineService.markMatchStartClick?.();
    ctx.engineService.startRound(getOrCreateRoundEngineId(vm.gameId, vm.roundNumber), pending).subscribe({
      next: (state: RoundState) => {
        ctx.startingRound = false;
        if (state && state.roundId) {
          ctx.resolvedRoundId$.next(state.roundId);
        }
      },
      error: (err: unknown) => {
        ctx.startingRound = false;
        ctx.logDevError('[ROUND-LIVE] Auto-start failed; user can retry with Iniciar Todos', err);
      }
    });
  
}

function roundEngineStorageKey(gameId: string, roundNumber: number): string {
  return `manager.round-engine-id:${gameId}:${roundNumber}`;
}

function getOrCreateRoundEngineId(gameId: string, roundNumber: number): string {
  const key = roundEngineStorageKey(gameId, roundNumber);
  try {
    const existing = localStorage.getItem(key);
    if (existing) {
      return existing;
    }
    const generated = globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
    localStorage.setItem(key, generated);
    return generated;
  } catch {
    return fallbackUuid();
  }
}

function clearRoundEngineId(gameId: string, roundNumber: number): void {
  try {
    localStorage.removeItem(roundEngineStorageKey(gameId, roundNumber));
  } catch {
    // Storage is an optimization for reload recovery; the backend response
    // remains authoritative when browser storage is unavailable.
  }
}

function fallbackUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
