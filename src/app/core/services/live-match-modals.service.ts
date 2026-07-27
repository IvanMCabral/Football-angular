import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, forkJoin, merge, of, switchMap } from 'rxjs';
import { catchError, ignoreElements, map, tap, timeout } from 'rxjs/operators';
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
  private roundResumeHoldCount = 0;

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
      this.snackBar.open('El partido ya terminÃ³, no se puede sustituir', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    return this.pauseBeforeModal(careerId, matchId, 'substitution', state.status === 'PAUSED').pipe(
      switchMap(() => this.careerService.getCareerStatus()),
      switchMap(status => {
        const userTeamId = status.userSessionTeamId;
        if (!userTeamId) {
          this.snackBar.open('No se encontrÃ³ el equipo del manager', 'OK', { duration: 3000 });
          return [];
        }
        return forkJoin({
          lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
          // Ask the API for the manager's current squad; the backend resolves
          // the active team from the authenticated career/session.
          squad: this.teamService.getMyTeamSquad(),
          liveState: this.engineService.getMatchState(matchId).pipe(
            timeout(1500),
            catchError(() => of(state))
          )
        }).pipe(
          switchMap(({ lineup, squad, liveState }) => {
            // Protect the modal from duplicated live rows: each starter and
            // bench player should appear once.
            const stateForModal = liveState ?? state;
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
                if (careerId && this.shouldResumeRoundAfterModalClose()) {
                  this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
                    error: (err) => this.logger.warn('Could not resume the round after closing the substitution modal:', err)
                  });
                }
              }),
              ignoreElements()
            ), of(data));
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
      switchMap(() => this.careerService.getCareerStatus()),
      switchMap(status => forkJoin({
        lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
        squad: this.teamService.getMyTeamSquad(),
        status: of(status),
        liveState: this.engineService.getMatchState(matchId).pipe(
          timeout(1500),
          catchError(() => of(state))
        )
      })),
      switchMap(({ lineup, squad, status, liveState }) => {
        const userTeamId = status.userSessionTeamId;
        const stateForModal = liveState ?? state;
        const managerIsHome = userTeamId === stateForModal.homeTeamId;
        const currentFormation = managerIsHome
          ? (stateForModal.homeFormation || lineup?.formation || '4-4-2')
          : (stateForModal.awayFormation || lineup?.formation || '4-4-2');
        const livePlayers = applyLiveSubstitutionsToLineup(lineup, squad, stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []);
        const unavailableBenchIds = unavailableBenchPlayerIds(liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []));
        const squadForModal = mergeSquadWithLivePlayers(squad ?? [], livePlayers)
          .filter(player => !player.sessionPlayerId || !unavailableBenchIds.has(player.sessionPlayerId));
        const liveSlots = managerIsHome ? stateForModal.homeSlots : stateForModal.awaySlots;
        const currentSlots = ensureUniqueCurrentSlots(
          overlayRememberedPartidoSlots(
            this.partidoSavedSlotsMemory.get(matchId),
            buildPartidoCurrentSlots(
              livePlayers,
              liveSlots,
              liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? [])
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
          tap(() => {
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
      switchMap(() => this.careerService.getCareerStatus()),
      switchMap(status => forkJoin({
        lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
        squad: this.teamService.getMyTeamSquad(),
        status: of(status),
        liveState: this.engineService.getMatchState(matchId).pipe(
          timeout(1500),
          catchError(() => of(state))
        )
      })),
      switchMap(({ lineup, squad, status, liveState }) => {
        const userTeamId = status.userSessionTeamId;
        const useLocalDebugPartidoState = isLocalDebugPartidoState(state);
        const stateForModal = useLocalDebugPartidoState ? state : (liveState ?? state);
        const managerIsHome = userTeamId === stateForModal.homeTeamId;
        const livePlayers = applyLiveSubstitutionsToLineup(lineup, squad, stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []);
        const unavailableBenchIds = unavailableBenchPlayerIds(liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []));
        const squadForModal = mergeSquadWithLivePlayers(squad ?? [], livePlayers)
          .filter(player => !player.sessionPlayerId || !unavailableBenchIds.has(player.sessionPlayerId));
        const liveSlots = managerIsHome ? stateForModal.homeSlots : stateForModal.awaySlots;
        const currentSlots = ensureUniqueCurrentSlots(
          overlayRememberedPartidoSlots(
            this.partidoSavedSlotsMemory.get(matchId),
            buildPartidoCurrentSlots(
              livePlayers,
              liveSlots,
              liveSubstitutionPairs(stateForModal, userTeamId, this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []),
              useLocalDebugPartidoState
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
          squad: squadForModal,
          startingIds,
          preSelectedPlayerId: options?.preSelectedPlayerId,
          reason: options?.reason,
          rivalFormation: stateForModal.awayFormation || '4-4-2',
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
    return this.engineService.pauseRoundForMatch(careerId, matchId).pipe(
      catchError(err => {
        this.logger.warn(`Could not pause the round before opening the ${modalName} modal:`, err);
        return of(null);
      })
    );
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
