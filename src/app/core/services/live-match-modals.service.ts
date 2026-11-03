import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, Observable, TimeoutError, defer, forkJoin, merge, of, switchMap, throwError } from 'rxjs';
import { catchError, ignoreElements, map, retry, tap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MatchEngineService } from './match-engine.service';
import { AppLoggerService } from './app-logger.service';
import { CareerService } from './career.service';
import { TeamService } from '../../features/teams/services/team.service';
import { LiveFormationSlot, SubModalPlayer } from './match-engine.model';
import { LineupDTO, PlayerLineupDTO } from '../../shared/models/lineup/lineup.dto';
import { SessionPlayer } from '../../shared/models/player.model';
import { SubstitutionModalComponent } from '../../features/games/components/substitution-modal/substitution-modal.component';
import { SubstitutionDialogData } from '../../features/games/components/substitution-modal/substitution-modal.models';
import { FormationModalComponent } from '../../features/games/components/formation-modal/formation-modal.component';
import { FormationDialogData } from '../../features/games/components/formation-modal/formation-modal.models';
import { PartidoModalComponent, PartidoDialogData } from '../../features/games/components/partido-modal/partido-modal.component';
import { RivalCardInfoComponent, RivalCardInfoDialogData } from '../../features/games/components/rival-card-info/rival-card-info.component';
import { MatchState } from './match-engine.model';
import {
  buildPartidoCurrentSlots,
  ensureUniqueCurrentSlots,
  isLocalDebugPartidoState,
  isPlaceholderLivePlayerName,
  mergeSquadWithLivePlayers,
  normalizeLivePlayerName,
  sessionPlayerOverall,
  toSubModalPlayer,
  toSubModalPlayerFromSession
} from './live-match-modal-player-slots.utils';
import {
  applyLiveSubstitutionsToLineup,
  effectiveSubstitutionsRemaining,
  liveSubstitutionPairs,
  unavailableBenchPlayerIds
} from './live-match-substitution-state.utils';
import { overlayRememberedPartidoSlots, parseRememberedPartidoSlots } from './live-match-partido-slot-memory.utils';

interface LiveSubstitutionCloseResult {
  success?: boolean;
  result?: { roundResumed?: boolean };
  playerOffId?: string;
  playerOnId?: string;
  substitutions?: Array<{
    playerOffId?: string;
    playerOnId?: string;
  }>;
}

/**
 * Coordinates the live-match tactical modals.
 *
 * Centralizes lineup/squad loading, round pause/resume and dialog opening so
 * the live screens can share the same substitution, formation and partido flows.
 */
@Injectable({
  providedIn: 'root'
})
export class LiveMatchModalsService {

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private http = inject(HttpClient);
  private careerService = inject(CareerService);
  private teamService = inject(TeamService);
  private engineService = inject(MatchEngineService);
  private logger = inject(AppLoggerService);
  // Pause/resume endpoints are career-scoped; modal callers only pass matchId.
  // Read the active career from the route to keep the public modal API small.
  private router = inject(Router);

  private readonly confirmedSubstitutionMemory = new Map<string, Array<{
    playerOffId: string;
    playerOnId: string;
  }>>();
  private readonly partidoSavedSlotsMemory = new Map<string, PartidoDialogData['currentSlots']>();
  private readonly partidoSavedFormationMemory = new Map<string, string>();
  private readonly partidoSavedAtMinute = new Map<string, number>();
  private readonly partidoLastModalMinute = new Map<string, number>();
  private roundResumeHoldCount = 0;

  prefetchSubstitutionData(): Observable<unknown> {
    return forkJoin({
      lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
      squad: this.teamService.getMyTeamSquad()
    }).pipe(catchError(() => EMPTY));
  }

  // Optional context for event-driven substitution modals.
  openSubstitutionOptions?: {
    // Starter to pre-select as the outgoing player.
    preSelectedPlayerId?: string;
    // Lets the modal explain why it opened.
    reason?: 'INJURY_FORCED_SUBSTITUTION' | 'MANUAL';
  };

  /**
   * Opens the substitution modal for the given match/state. Returns the
   * subscription so the caller can `takeUntil(destroy$)` if needed.
   *
   * Optional {@link openSubstitutionOptions} can pre-select a player when
   * the modal is opened by an in-match event such as an injury.
   */
  openSubstitutionModal(
    matchId: string,
    state: MatchState,
    options?: LiveMatchModalsService['openSubstitutionOptions']
  ): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya termin?, no se puede sustituir', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    const statusSnapshot = careerId ? this.careerService.getCareerStatusSnapshot?.(careerId) : null;
    let pausedByDialog = false;
    return forkJoin({
      pauseResponse: this.pauseBeforeModal(careerId, matchId, 'substitution', state.status === 'PAUSED').pipe(
        tap(response => { pausedByDialog = response != null && state.status !== 'PAUSED'; })
      ),
      data: forkJoin({
        status: statusSnapshot?.value.userSessionTeamId
          ? of(statusSnapshot.value)
          : this.careerService.getCareerStatus(),
        lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
        squad: this.teamService.getMyTeamSquad()
      }).pipe(map(value => ({ value })), catchError(error => of({ error })))
    }).pipe(
      switchMap(({ pauseResponse, data }) => {
        if ('error' in data) {
          return throwError(() => data.error);
        }
        const { status, lineup, squad } = data.value;
        const pausedState = this.matchStateFromPause(pauseResponse, matchId);
        const liveState$ = pausedState ?? this.engineService.getMatchState(matchId).pipe(
          timeout(1500),
          catchError(() => of(state))
        );
        return liveState$.pipe(map(liveState => ({ status, lineup, squad, liveState })));
      }),
      switchMap(({ status, lineup, squad, liveState }) => {
        const userTeamId = status.userSessionTeamId;
        if (!userTeamId) {
          this.snackBar.open('No se encontró el equipo del manager', 'OK', { duration: 3000 });
          return EMPTY;
        }
        // Protect the modal from duplicated live rows: each starter and
        // bench player should appear once.
        const stateForModal = liveState ?? state;
        if (this.isTerminalLiveState(stateForModal)) {
          this.showTerminalModalNotice('sustituir');
          return EMPTY;
        }
        const livePlayers = applyLiveSubstitutionsToLineup(lineup, squad, stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []);
        const seenStarters = new Set<string>();
        const startingXi: SubModalPlayer[] = livePlayers
          .filter(p => {
            if (!p.playerId || seenStarters.has(p.playerId)) { return false; }
            seenStarters.add(p.playerId);
            return true;
          })
          .map(p => toSubModalPlayer(p, true));
        const startingIds = seenStarters;
        const unavailableBenchIds = unavailableBenchPlayerIds(liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []));
        const seenBench = new Set<string>();
        const bench: SubModalPlayer[] = squad
          .filter(sp => !startingIds.has(sp.sessionPlayerId))
          .filter(sp => !unavailableBenchIds.has(sp.sessionPlayerId))
          .filter(sp => {
            if (!sp.sessionPlayerId || seenBench.has(sp.sessionPlayerId)) { return false; }
            seenBench.add(sp.sessionPlayerId);
            return true;
          })
          .map(sp => toSubModalPlayerFromSession(sp, false));

        // Build the slot effectiveness map used by the SALE/ENTRA chips.
        // When the backend has no effectiveness data, the modal simply
        // renders without that feedback.
        const slotToEff: Record<string, number> =
          lineup?.formationEffectiveness?.perPlayerEffectiveness ?? {};
        const slotToPlayerId: Record<string, string> = {};
        (lineup?.slots ?? []).forEach(s => {
          slotToPlayerId[s.subdivisionId] = s.playerId;
        });
        const effectivenessMap: Record<string, number> = {};
        Object.entries(slotToEff).forEach(([subdivisionId, eff]) => {
          const playerId = slotToPlayerId[subdivisionId];
          if (playerId) {
            effectivenessMap[playerId] = eff;
          }
        });

        const data: SubstitutionDialogData = {
          matchId,
          canResumeOnSave: () => !!careerId && this.shouldResumeRoundAfterModalClose(),
          currentMinute: stateForModal.currentMinute ?? 0,
          score: stateForModal.score,
          startingXi,
          bench,
          // The backend computes remaining substitutions from live events.
          // If no live snapshot has arrived yet, keep the modal permissive
          // and let the backend validate the final save.
          substitutionsRemaining: effectiveSubstitutionsRemaining(this.confirmedSubstitutionMemory.get(matchId) ?? [], stateForModal, userTeamId),
          // Position-effectiveness feedback for the SALE/ENTRA chips.
          effectivenessMap,
          // Give the modal the live formation, ratings and manager side so
          // its pitch and chips reflect the current match state.
          formation: (userTeamId === stateForModal.homeTeamId)
              ? (stateForModal.homeFormation ?? '4-4-2')
              : (stateForModal.awayFormation ?? '4-4-2'),
          playerRatings: (userTeamId === stateForModal.homeTeamId)
              ? (stateForModal.homePlayerRatings ?? [])
              : (stateForModal.awayPlayerRatings ?? []),
          managerSide: (userTeamId === stateForModal.homeTeamId) ? 'HOME' : 'AWAY',
          // Optional pre-selection used by injury-driven modal opens.
          preSelectedPlayerId: options?.preSelectedPlayerId,
          reason: options?.reason
        };

        // The round is paused before opening so the minute the manager saw
        // remains valid when the substitution is confirmed.
        const dialogRef = this.dialog.open(SubstitutionModalComponent, {
          data,
          width: '920px',
          maxWidth: '95vw',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });

        // Resume the round when the modal closes, confirmed or cancelled.
        return merge(dialogRef.afterClosed().pipe(
          map(closeResult => closeResult as LiveSubstitutionCloseResult | undefined),
          tap((closeResult) => {
            if (closeResult?.success && Array.isArray(closeResult.substitutions)) {
              for (const substitution of closeResult.substitutions) {
                if (substitution.playerOffId && substitution.playerOnId) {
                  this.rememberConfirmedSubstitution(matchId, substitution.playerOffId, substitution.playerOnId);
                }
              }
            } else if (closeResult?.success && closeResult.playerOffId && closeResult.playerOnId) {
              this.rememberConfirmedSubstitution(matchId, closeResult.playerOffId, closeResult.playerOnId);
            }
            if (closeResult?.result?.roundResumed) {
              this.prefetchSubstitutionData().subscribe();
            } else if (careerId && this.shouldResumeRoundAfterModalClose()) {
              this.engineService.resumeRoundForMatch(careerId, matchId).pipe(
                switchMap(() => closeResult?.success ? this.prefetchSubstitutionData() : EMPTY)
              ).subscribe({
                error: (err) => this.logger.warn('Could not resume the round after closing the substitution modal:', err)
              });
            }
          }),
          ignoreElements()
        ), of(data));
      }),
      catchError(error => {
        this.logger.warn('Could not open the substitution modal:', error);
        this.snackBar.open('No se pudieron cargar los cambios', 'OK', { duration: 3500 });
        if (!pausedByDialog || !careerId || !this.shouldResumeRoundAfterModalClose()) {
          return EMPTY;
        }
        return this.engineService.resumeRoundForMatch(careerId, matchId).pipe(
          ignoreElements(),
          catchError(resumeError => {
            this.logger.warn('Could not recover the round after loading substitutions:', resumeError);
            return EMPTY;
          })
        );
      })
    );
  }

  // Informational dialog when the rival gets a red card. It does not pause the round.
  openRivalCardInfoModal(
    matchId: string,
    state: MatchState,
    info: { playerName: string; minute: number; cardType: 'RED' }
  ): Observable<unknown> {
    const data: RivalCardInfoDialogData = {
      playerName: info.playerName,
      minute: info.minute,
      cardType: info.cardType
    };
    const dialogRef = this.dialog.open(RivalCardInfoComponent, {
      data,
      width: '420px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: 'first-tabbable'
    });
    return dialogRef.afterClosed();
  }

  /** Opens the formation-change modal for the given match/state. */
  openFormationModal(matchId: string, state: MatchState): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya termino, no se puede cambiar la formacion', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    return this.pauseBeforeModal(careerId, matchId, 'formation', state.status === 'PAUSED').pipe(
      switchMap(() => forkJoin({
        lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
        squad: this.teamService.getMyTeamSquad(),
        status: this.careerService.getCareerStatus(),
        liveState: this.engineService.getMatchState(matchId).pipe(
          timeout(1500),
          catchError(() => of(state))
        )
      })),
      switchMap(({ lineup, squad, status, liveState }) => {
        const userTeamId = status.userSessionTeamId;
        const stateForModal = liveState ?? state;
        this.refreshPartidoMemoryForSnapshot(matchId, stateForModal);
        if (this.isTerminalLiveState(stateForModal)) {
          this.showTerminalModalNotice('cambiar la formacion');
          return EMPTY;
        }
        const managerIsHome = userTeamId === stateForModal.homeTeamId;
        const currentFormation = managerIsHome
          ? (stateForModal.homeFormation || lineup?.formation || '4-4-2')
          : (stateForModal.awayFormation || lineup?.formation || '4-4-2');
        const livePlayers = applyLiveSubstitutionsToLineup(lineup, squad, stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []);
        const unavailableBenchIds = unavailableBenchPlayerIds(liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []));
        const squadForModal = mergeSquadWithLivePlayers(squad ?? [], livePlayers)
          .filter(player => !player.sessionPlayerId || (!unavailableBenchIds.has(player.sessionPlayerId) &&
            !(stateForModal.events ?? []).some(e => e.eventType === 'RED_CARD' && e.teamId === userTeamId && e.playerId === player.sessionPlayerId)));
        const liveSlots = managerIsHome ? stateForModal.homeSlots : stateForModal.awaySlots;
        const hasDismissal = (stateForModal.events ?? []).some(e => e.eventType === 'RED_CARD' && e.teamId === userTeamId);
        const currentSlots = ensureUniqueCurrentSlots(
          overlayRememberedPartidoSlots(
            hasDismissal ? undefined : this.partidoSavedSlotsMemory.get(matchId),
            buildPartidoCurrentSlots(
              livePlayers,
              liveSlots,
              liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []),
              hasDismissal
            )
          ),
          squadForModal
        );
        // Used by the modal to split players on the pitch from the bench.
        const startingIds = new Set<string>(
          currentSlots.map(s => s.sessionPlayerId).filter(id => !!id)
        );
        const data: FormationDialogData = {
          matchId,
          currentFormation,
          homeTeamId: userTeamId ?? state.homeTeamId,
          currentSlots,
          vacantSlotIndexes: hasDismissal ? Array.from({length: 11}, (_, i) => i).filter(i => !currentSlots.some(s => s.slotIndex === i)) : [],
          squad: squadForModal,
          startingIds
        };

        const dialogRef = this.dialog.open(FormationModalComponent, {
          data,
          width: '720px',
          maxWidth: '95vw',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });

        // Emit initial data for callers, then the actual close result.
        return merge(dialogRef.afterClosed().pipe(
          tap((result) => {
            this.rememberPartidoSavedSlots(matchId, result);
            if (careerId && this.shouldResumeRoundAfterModalClose()) {
              this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
                error: (err) => this.logger.warn('Could not resume the round after closing the formation modal:', err)
              });
            }
          }),
          ignoreElements()
        ), of(data));
      })
    );
  }

  // Opens the full DT match modal: editable manager formation plus rival view.
  openPartidoModal(
    matchId: string,
    state: MatchState,
    // Optional display names; ids still drive event attribution.
    teamNames?: { home: string; away: string },
    options?: {
      preSelectedPlayerId?: string;
      reason?: 'INJURY_FORCED_SUBSTITUTION' | string;
    }
  ): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya termino, no se puede editar la formacion', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    return this.pauseBeforeModal(careerId, matchId, 'partido', state.status === 'PAUSED').pipe(
      switchMap(() => forkJoin({
        lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
        squad: this.teamService.getMyTeamSquad(),
        status: this.careerService.getCareerStatus(),
        liveState: this.engineService.getMatchState(matchId).pipe(
          timeout(1500),
          catchError(() => of(state))
        )
      })),
      switchMap(({ lineup, squad, status, liveState }) => {
        const userTeamId = status.userSessionTeamId;
        const useLocalDebugPartidoState = isLocalDebugPartidoState(state);
        const stateForModal = useLocalDebugPartidoState ? state : (liveState ?? state);
        this.refreshPartidoMemoryForSnapshot(matchId, stateForModal);
        if (this.isTerminalLiveState(stateForModal)) {
          this.showTerminalModalNotice('editar la formacion');
          return EMPTY;
        }
        const managerIsHome = userTeamId === stateForModal.homeTeamId;
        const livePlayers = applyLiveSubstitutionsToLineup(lineup, squad, stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []);
        const unavailableBenchIds = unavailableBenchPlayerIds(liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []));
        const squadForModal = mergeSquadWithLivePlayers(squad ?? [], livePlayers)
          .filter(player => !player.sessionPlayerId || (!unavailableBenchIds.has(player.sessionPlayerId) &&
            !(stateForModal.events ?? []).some(e => e.eventType === 'RED_CARD' && e.teamId === userTeamId && e.playerId === player.sessionPlayerId)));
        const liveSlots = managerIsHome ? stateForModal.homeSlots : stateForModal.awaySlots;
        const hasDismissal = (stateForModal.events ?? []).some(e => e.eventType === 'RED_CARD' && e.teamId === userTeamId);
        const currentSlots = ensureUniqueCurrentSlots(
          overlayRememberedPartidoSlots(
            hasDismissal ? undefined : this.partidoSavedSlotsMemory.get(matchId),
            buildPartidoCurrentSlots(
              livePlayers,
              liveSlots,
              liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []),
              useLocalDebugPartidoState || hasDismissal
            )
          ),
          squadForModal
        );
        const startingIds = new Set<string>(
          currentSlots.map(s => s.sessionPlayerId).filter(id => !!id)
        );
        const stateCurrentFormation = managerIsHome
          ? (stateForModal.homeFormation || lineup?.formation || '4-4-2')
          : (stateForModal.awayFormation || lineup?.formation || '4-4-2');
        const currentFormation = this.partidoSavedFormationMemory.get(matchId) || stateCurrentFormation;
        const data: PartidoDialogData = {
          matchId,
          currentFormation,
          homeTeamId: userTeamId ?? stateForModal.homeTeamId,
          awayTeamId: stateForModal.awayTeamId,
          currentSlots,
          vacantSlotIndexes: hasDismissal ? Array.from({length: 11}, (_, i) => i).filter(i => !currentSlots.some(s => s.slotIndex === i)) : [],
          scoreHomeTeamId: stateForModal.homeTeamId,
          squad: squadForModal,
          startingIds,
          preSelectedPlayerId: options?.preSelectedPlayerId,
          reason: options?.reason,
          rivalFormation: (managerIsHome ? stateForModal.awayFormation : stateForModal.homeFormation) || '4-4-2',
          currentMinute: stateForModal.currentMinute ?? 0,
          score: stateForModal.score ?? { home: 0, away: 0 },
          homePossession: stateForModal.homePossession ?? 50,
          awayPossession: stateForModal.awayPossession ?? 50,
          homeTeamName: teamNames?.home ?? String(stateForModal.homeTeamId ?? ''),
          awayTeamName: teamNames?.away ?? String(stateForModal.awayTeamId ?? ''),
          events: stateForModal.events ?? [],
          substitutionsRemaining: effectiveSubstitutionsRemaining(this.confirmedSubstitutionMemory.get(matchId) ?? [], stateForModal, userTeamId)
        };

        const dialogRef = this.dialog.open(PartidoModalComponent, {
          data,
          width: '95vw',
          maxWidth: '95vw',
          // Keeps nested Material overlays clickable above the modal backdrop.
          panelClass: 'partido-modal-pane',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });

        // Keep a service-owned close listener active immediately.
        const close$ = dialogRef.afterClosed();
        close$.pipe(tap((closeResult) => {
            this.rememberClosedModalSubstitutions(matchId, closeResult);
            this.rememberPartidoSavedSlots(matchId, closeResult);
            if (careerId && this.shouldResumeRoundAfterModalClose()) {
              this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
                error: (err) => this.logger.warn('Could not resume the round after closing the match modal:', err)
              });
            }
        })).subscribe();
        return merge(close$.pipe(ignoreElements()), of(data));
      })
    );
  }

  // The route carries the career id used by round-level pause/resume endpoints.
  private getCurrentCareerId(): string | null {
    const url = this.router.url || '';
    const match = url.match(/\/games\/([^/]+)/);
    return match ? match[1] : null;
  }

  // Freeze the round before loading modal data so the decision uses one tactical moment.
  private pauseBeforeModal(
    careerId: string | null,
    matchId: string,
    modalName: 'substitution' | 'formation' | 'partido',
    alreadyPaused = false
  ): Observable<unknown> {
    if (alreadyPaused) {
      return of(null);
    }
    if (!careerId) {
      this.logger.warn('could not resolve careerId from the current URL; the round will not be paused before opening the modal');
      return of(null);
    }
    return defer(() => this.engineService.pauseRoundForMatch(careerId, matchId)).pipe(
      timeout(modalName === 'substitution' ? 6_000 : 2_000),
      // The server may have paused the round before the first response timed out.
      retry({ count: 1, delay: error => error instanceof TimeoutError ? of(null) : throwError(() => error) }),
      switchMap(response => {
        // A race between the injury event and the pause request can finish the
        // round before the modal is hydrated. Never open an editable dialog
        // over a terminal match snapshot.
        if (this.pauseResponseIsTerminal(response)) {
          this.showTerminalModalNotice('editar el partido');
          return EMPTY;
        }
        return of(response);
      }),
      catchError(err => {
        this.logger.warn(`Could not pause the round before opening the ${modalName} modal:`, err);
        // Fail closed: without a confirmed pause the manager must not edit a
        // moving match. The live stream remains authoritative and can finish
        // or retry the modal on a later event.
        this.snackBar.open('No se pudo pausar el partido; la decision no se abrio', 'OK', { duration: 3500 });
        return EMPTY;
      })
    );
  }

  private pauseResponseIsTerminal(response: unknown): boolean {
    return !!response && typeof response === 'object'
      && (response as { alreadyFinished?: boolean }).alreadyFinished === true;
  }

  private matchStateFromPause(response: unknown, matchId: string): Observable<MatchState> | null {
    const matches = (response as { matches?: MatchState[] } | null)?.matches;
    const match = Array.isArray(matches) ? matches.find(state => state.matchId === matchId) : undefined;
    return match ? of(match) : null;
  }

  private isTerminalLiveState(state: MatchState | null | undefined): boolean {
    return state?.status === 'FINISHED' || state?.status === 'CANCELLED';
  }

  private showTerminalModalNotice(action: string): void {
    this.snackBar.open(`El partido ya termino, no se puede ${action}`, 'OK', { duration: 3000 });
  }

  private rememberConfirmedSubstitution(matchId: string, playerOffId: string, playerOnId: string): void {
    const existing = this.confirmedSubstitutionMemory.get(matchId) ?? [];
    if (!existing.some(s => s.playerOffId === playerOffId && s.playerOnId === playerOnId)) {
      this.confirmedSubstitutionMemory.set(matchId, [...existing, { playerOffId, playerOnId }]);
    }
  }

  // Queued injury modals re-check this before opening.
  wasPlayerConfirmedSubstitutedOff(matchId: string, playerOffId: string): boolean {
    return (this.confirmedSubstitutionMemory.get(matchId) ?? [])
      .some(s => s.playerOffId === playerOffId);
  }

  holdRoundResumeAfterModalClose(): () => void {
    this.roundResumeHoldCount += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.roundResumeHoldCount = Math.max(0, this.roundResumeHoldCount - 1);
    };
  }

  private shouldResumeRoundAfterModalClose(): boolean {
    if (this.roundResumeHoldCount > 0) {
      return false;
    }
    try {
      return localStorage.getItem('manager.debugFreezeLiveRound') !== '1';
    } catch {
      return true;
    }
  }

  private ensureUniqueCurrentSlots(
    currentSlots: PartidoDialogData['currentSlots'],
    squad: SessionPlayer[]
  ): PartidoDialogData['currentSlots'] {
    return ensureUniqueCurrentSlots(currentSlots, squad);
  }

  private rememberPartidoSavedSlots(matchId: string, closeResult: unknown): void {
    const remembered = parseRememberedPartidoSlots(closeResult);
    if (remembered.formation) this.partidoSavedFormationMemory.set(matchId, remembered.formation);
    if (remembered.slots) this.partidoSavedSlotsMemory.set(matchId, remembered.slots);
    if (remembered.formation || remembered.slots) {
      const result = closeResult as {result?: {minuteApplied?: number}};
      const minute = result.result?.minuteApplied ?? this.partidoLastModalMinute.get(matchId);
      if (minute !== undefined) this.partidoSavedAtMinute.set(matchId, minute);
    }
  }

  private refreshPartidoMemoryForSnapshot(matchId: string, state: MatchState): void {
    const minute = state.currentMinute ?? 0;
    const savedAt = this.partidoSavedAtMinute.get(matchId);
    if (savedAt !== undefined && minute > savedAt) {
      this.partidoSavedSlotsMemory.delete(matchId);
      this.partidoSavedFormationMemory.delete(matchId);
      this.partidoSavedAtMinute.delete(matchId);
    } else if (savedAt === undefined && (this.partidoSavedSlotsMemory.has(matchId) || this.partidoSavedFormationMemory.has(matchId))) {
      // Legacy responses have no application minute. Anchor their one-tick
      // bridge to the first snapshot instead of keeping it forever.
      this.partidoSavedAtMinute.set(matchId, minute);
    }
    this.partidoLastModalMinute.set(matchId, minute);
  }

  private rememberClosedModalSubstitutions(matchId: string, closeResult: unknown): void {
    const result = closeResult as {
      success?: boolean;
      substitutions?: Array<{
        playerOffId?: string | null;
        playerOnId?: string | null;
      }>;
      playerOffId?: string | null;
      playerOnId?: string | null;
    } | null;
    if (!result?.success) {
      return;
    }
    if (Array.isArray(result.substitutions)) {
      for (const substitution of result.substitutions) {
        if (substitution.playerOffId && substitution.playerOnId) {
          this.rememberConfirmedSubstitution(matchId, substitution.playerOffId, substitution.playerOnId);
        }
      }
      return;
    }
    if (result.playerOffId && result.playerOnId) {
      this.rememberConfirmedSubstitution(matchId, result.playerOffId, result.playerOnId);
    }
  }
}
