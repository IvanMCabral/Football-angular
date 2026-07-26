import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, forkJoin, merge, of, switchMap } from 'rxjs';
import { catchError, ignoreElements, map, tap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MatchEngineService } from './match-engine.service';
import { CareerService } from './career.service';
import { TeamService } from '../../features/teams/services/team.service';
import { LiveFormationSlot, SubModalPlayer } from './match-engine.model';
import { LineupDTO, PlayerLineupDTO } from '../../shared/models/lineup/lineup.dto';
import { SessionPlayer } from '../../shared/models/player.model';
import { SubstitutionModalComponent, SubstitutionDialogData } from '../../features/games/components/substitution-modal/substitution-modal.component';
import { FormationModalComponent, FormationDialogData } from '../../features/games/components/formation-modal/formation-modal.component';
import { PartidoModalComponent, PartidoDialogData } from '../../features/games/components/partido-modal/partido-modal.component';
import { RivalCardInfoComponent, RivalCardInfoDialogData } from '../../features/games/components/rival-card-info/rival-card-info.component';
import { MatchState } from './match-engine.model';

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
      this.snackBar.open('El partido ya terminó, no se puede sustituir', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    return this.pauseBeforeModal(careerId, matchId, 'substitution', state.status === 'PAUSED').pipe(
      switchMap(() => this.careerService.getCareerStatus()),
      switchMap(status => {
        const userTeamId = status.userSessionTeamId;
        if (!userTeamId) {
          this.snackBar.open('No se encontró el equipo del manager', 'OK', { duration: 3000 });
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
            const livePlayers = this.applyLiveSubstitutionsToLineup(
              lineup,
              squad,
              stateForModal,
              userTeamId,
              matchId
            );
            const seenStarters = new Set<string>();
            const startingXi: SubModalPlayer[] = livePlayers
              .filter(p => {
                if (!p.playerId || seenStarters.has(p.playerId)) { return false; }
                seenStarters.add(p.playerId);
                return true;
              })
              .map(p => this.toSubModalPlayer(p, true));
            const startingIds = seenStarters;
            const unavailableBenchIds = this.unavailableBenchPlayerIds(stateForModal, userTeamId, matchId);
            const seenBench = new Set<string>();
            const bench: SubModalPlayer[] = squad
              .filter(sp => !startingIds.has(sp.sessionPlayerId))
              .filter(sp => !unavailableBenchIds.has(sp.sessionPlayerId))
              .filter(sp => {
                if (!sp.sessionPlayerId || seenBench.has(sp.sessionPlayerId)) { return false; }
                seenBench.add(sp.sessionPlayerId);
                return true;
              })
              .map(sp => this.toSubModalPlayerFromSession(sp, false));

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
              substitutionsRemaining: this.effectiveSubstitutionsRemaining(matchId, stateForModal, userTeamId),
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
              tap((closeResult: any) => {
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
                    error: (err) => console.warn('Could not resume the round after closing the substitution modal:', err)
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
        const livePlayers = this.applyLiveSubstitutionsToLineup(
          lineup,
          squad,
          stateForModal,
          userTeamId,
          matchId
        );
        const unavailableBenchIds = this.unavailableBenchPlayerIds(stateForModal, userTeamId, matchId);
        const squadForModal = this.mergeSquadWithLivePlayers(squad ?? [], livePlayers)
          .filter(player => !player.sessionPlayerId || !unavailableBenchIds.has(player.sessionPlayerId));
        const liveSlots = managerIsHome ? stateForModal.homeSlots : stateForModal.awaySlots;
        const currentSlots = this.ensureUniqueCurrentSlots(
          this.overlayRememberedPartidoSlots(
            matchId,
            this.buildPartidoCurrentSlots(
            livePlayers,
            liveSlots,
            this.liveSubstitutionPairs(stateForModal, userTeamId, matchId)
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
                error: (err) => console.warn('Could not resume the round after closing the formation modal:', err)
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
        const useLocalDebugPartidoState = this.isLocalDebugPartidoState(state);
        const stateForModal = useLocalDebugPartidoState ? state : (liveState ?? state);
        const managerIsHome = userTeamId === stateForModal.homeTeamId;
        const livePlayers = this.applyLiveSubstitutionsToLineup(
          lineup,
          squad,
          stateForModal,
          userTeamId,
          matchId
        );
        const unavailableBenchIds = this.unavailableBenchPlayerIds(stateForModal, userTeamId, matchId);
        const squadForModal = this.mergeSquadWithLivePlayers(squad ?? [], livePlayers)
          .filter(player => !player.sessionPlayerId || !unavailableBenchIds.has(player.sessionPlayerId));
        const liveSlots = managerIsHome ? stateForModal.homeSlots : stateForModal.awaySlots;
        const currentSlots = this.ensureUniqueCurrentSlots(
          this.overlayRememberedPartidoSlots(
            matchId,
            this.buildPartidoCurrentSlots(
              livePlayers,
              liveSlots,
              this.liveSubstitutionPairs(stateForModal, userTeamId, matchId),
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
          substitutionsRemaining: this.effectiveSubstitutionsRemaining(matchId, stateForModal, userTeamId)
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
                error: (err) => console.warn('Could not resume the round after closing the match modal:', err)
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
      console.warn('could not resolve careerId from the current URL; the round will not be paused before opening the modal');
      return of(null);
    }
    return this.engineService.pauseRoundForMatch(careerId, matchId).pipe(
      catchError(err => {
        console.warn(`Could not pause the round before opening the ${modalName} modal:`, err);
        return of(null);
      })
    );
  }

  // Apply live substitutions over the saved pre-match lineup before opening DT modals.
  private applyLiveSubstitutionsToLineup(
    lineup: LineupDTO,
    squad: SessionPlayer[] | null | undefined,
    state: MatchState,
    userTeamId: string | null | undefined,
    matchId?: string
  ): PlayerLineupDTO[] {
    const squadById = new Map((squad ?? [])
      .filter(p => !!p.sessionPlayerId)
      .map(p => [p.sessionPlayerId, p]));
    const squadByName = new Map((squad ?? [])
      .filter(p => !!p.name)
      .map(p => [this.normalizePlayerName(p.name), p]));
    const usedHydratedIds = new Set<string>();
    const livePlayers = (lineup?.players ?? []).map(player => {
      const fromSquad = squadById.get(player.playerId) ?? squadByName.get(this.normalizePlayerName(player.name));
      if (!fromSquad) {
        if (player.playerId) {
          usedHydratedIds.add(player.playerId);
        }
        return player;
      }
      const hydratedId = fromSquad.sessionPlayerId ?? player.playerId;
      if (hydratedId && usedHydratedIds.has(hydratedId) && player.playerId !== hydratedId) {
        if (player.playerId) {
          usedHydratedIds.add(player.playerId);
        }
        return player;
      }
      if (hydratedId) {
        usedHydratedIds.add(hydratedId);
      }
      return {
        ...player,
        playerId: hydratedId,
        name: this.isPlaceholderPlayerName(player.name, player.position)
          ? (fromSquad.name ?? player.name)
          : player.name,
        position: player.position || fromSquad.position || 'MID',
        overall: player.overall || this.sessionPlayerOverall(fromSquad) || player.overall
      };
    });
    if (!userTeamId || !livePlayers.length) {
      return livePlayers;
    }


    (state.events ?? [])
      .filter(e => e.eventType === 'SUBSTITUTION')
      .filter(e => !e.teamId || e.teamId === userTeamId)
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
      .forEach(event => {
        const offName = this.normalizePlayerName(event.playerName);
        const onName = this.normalizePlayerName(event.playerOnName ?? event.relatedPlayerName ?? '');
        const onId = event.relatedPlayerId;
        if (!offName || (!onName && !onId)) {
          return;
        }

        const offIndex = livePlayers.findIndex(p =>
          this.normalizePlayerName(p.name) === offName || p.playerId === event.playerId
        );
        const onPlayer = (onId ? squadById.get(onId) : undefined)
          ?? (onName ? squadByName.get(onName) : undefined);
        if (offIndex < 0 || !onPlayer?.sessionPlayerId) {
          return;
        }

        livePlayers[offIndex] = {
          ...livePlayers[offIndex],
          playerId: onPlayer.sessionPlayerId,
          name: onPlayer.name ?? event.playerOnName ?? event.relatedPlayerName ?? livePlayers[offIndex].name,
          position: onPlayer.position ?? livePlayers[offIndex].position,
          overall: this.sessionPlayerOverall(onPlayer) ?? livePlayers[offIndex].overall
        };
      });

    for (const remembered of this.confirmedSubstitutionMemory.get(matchId ?? '') ?? []) {
      this.applySubstitutionByIds(livePlayers, squadById, remembered.playerOffId, remembered.playerOnId);
    }

    return livePlayers;
  }

  private rememberConfirmedSubstitution(matchId: string, playerOffId: string, playerOnId: string): void {
    const existing = this.confirmedSubstitutionMemory.get(matchId) ?? [];
    if (!existing.some(s => s.playerOffId === playerOffId && s.playerOnId === playerOnId)) {
      this.confirmedSubstitutionMemory.set(matchId, [...existing, { playerOffId, playerOnId }]);
    }
  }

  private effectiveSubstitutionsRemaining(
    matchId: string,
    state: MatchState | null | undefined,
    userTeamId: string | null | undefined
  ): number {
    const remembered = this.confirmedSubstitutionMemory.get(matchId) ?? [];
    const rememberedOffIds = new Set(remembered.map(sub => sub.playerOffId).filter(Boolean));
    const userEventOffIds = new Set((state?.events ?? [])
      .filter(event => event.eventType === 'SUBSTITUTION')
      .filter(event => !userTeamId || !event.teamId || event.teamId === userTeamId)
      .map(event => event.playerId)
      .filter((playerId): playerId is string => !!playerId));
    const usedByUserTeam = new Set([...rememberedOffIds, ...userEventOffIds]).size;
    const remainingFromUserEvents = Math.max(0, 5 - usedByUserTeam);
    const stateRemaining = state?.substitutionsRemaining;
    if (usedByUserTeam === 0 && typeof stateRemaining === 'number' && Number.isFinite(stateRemaining)) {
      return Math.max(0, Math.min(5, stateRemaining));
    }
    return remainingFromUserEvents;
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

  private applySubstitutionByIds(
    livePlayers: PlayerLineupDTO[],
    squadById: Map<string, SessionPlayer>,
    playerOffId: string,
    playerOnId: string
  ): void {
    const offIndex = livePlayers.findIndex(p => p.playerId === playerOffId);
    const onPlayer = squadById.get(playerOnId);
    if (offIndex < 0 || !onPlayer?.sessionPlayerId) {
      return;
    }

    livePlayers[offIndex] = {
      ...livePlayers[offIndex],
      playerId: onPlayer.sessionPlayerId,
      name: onPlayer.name ?? livePlayers[offIndex].name,
      position: onPlayer.position ?? livePlayers[offIndex].position,
      overall: this.sessionPlayerOverall(onPlayer) ?? livePlayers[offIndex].overall
    };
  }

  private liveSubstitutionPairs(
    state: MatchState,
    userTeamId: string | null | undefined,
    matchId?: string
  ): Array<{ playerOffId: string; playerOnId: string }> {
    const fromEvents = (state.events ?? [])
      .filter(e => e.eventType === 'SUBSTITUTION')
      .filter(e => !userTeamId || !e.teamId || e.teamId === userTeamId)
      .map(event => ({
        playerOffId: event.playerId ?? '',
        playerOnId: event.relatedPlayerId ?? ''
      }))
      .filter(pair => !!pair.playerOffId && !!pair.playerOnId);
    const fromMemory = this.confirmedSubstitutionMemory.get(matchId ?? '') ?? [];
    const seen = new Set<string>();
    const pairs: Array<{ playerOffId: string; playerOnId: string }> = [];
    for (const pair of [...fromEvents, ...fromMemory]) {
      const key = `${pair.playerOffId}->${pair.playerOnId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairs.push(pair);
    }
    return pairs;
  }

  private unavailableBenchPlayerIds(
    state: MatchState,
    userTeamId: string | null | undefined,
    matchId?: string
  ): Set<string> {
    return new Set(
      this.liveSubstitutionPairs(state, userTeamId, matchId)
        .map(pair => pair.playerOffId)
        .filter(Boolean)
    );
  }

  private normalizePlayerName(name: string | null | undefined): string {
    return (name ?? '').trim().toLocaleLowerCase();
  }

  private isPlaceholderPlayerName(name: string | null | undefined, position: string | null | undefined): boolean {
    const value = (name ?? '').trim();
    if (!value) { return true; }
    const pos = (position ?? '').trim();
    if (pos && value.toLocaleLowerCase() === pos.toLocaleLowerCase()) { return true; }
    return /^(GK|DEF|MID|ATT|WINGER|CB|LB|RB|LWB|RWB|CM|CDM|CAM|LM|RM|ST|CF|LW|RW)$/i.test(value);
  }

  private buildPartidoCurrentSlots(
    livePlayers: PlayerLineupDTO[],
    liveSlots: LiveFormationSlot[] | null | undefined,
    substitutions: Array<{ playerOffId: string; playerOnId: string }> = [],
    preservePartialLiveSlots = false
  ): PartidoDialogData['currentSlots'] {
    const playersById = new Map((livePlayers ?? []).map(player => [player.playerId, player]));
    const substitutionByOffId = new Map(
      substitutions
        .filter(s => !!s.playerOffId && !!s.playerOnId)
        .map(s => [s.playerOffId, s.playerOnId])
    );
    const validLiveSlots = (liveSlots ?? [])
      .map((slot, index) => {
        const rawSessionPlayerId = slot.sessionPlayerId || slot.playerId || '';
        if (!rawSessionPlayerId) {
          return null;
        }
        const substitutedSessionPlayerId = substitutionByOffId.get(rawSessionPlayerId) ?? rawSessionPlayerId;
        const slotStillInLiveXi = playersById.has(substitutedSessionPlayerId);
        const sessionPlayerId = slotStillInLiveXi
          ? substitutedSessionPlayerId
          : (livePlayers[index]?.playerId ?? substitutedSessionPlayerId);
        const fallback = playersById.get(sessionPlayerId);
        return {
          sessionPlayerId,
          position: slot.position || fallback?.position || 'MID',
          slotIndex: typeof slot.slotIndex === 'number' ? slot.slotIndex : index,
          customXPercent: typeof slot.customXPercent === 'number' && Number.isFinite(slot.customXPercent)
            ? slot.customXPercent
            : null,
          customYPercent: typeof slot.customYPercent === 'number' && Number.isFinite(slot.customYPercent)
            ? slot.customYPercent
            : null
        };
      })
      .filter((slot): slot is NonNullable<typeof slot> => !!slot);

    if (validLiveSlots.length >= 11 || (preservePartialLiveSlots && validLiveSlots.length > 0)) {
      return validLiveSlots.sort((a, b) => a.slotIndex - b.slotIndex);
    }

    return (livePlayers ?? []).map((p, i) => ({
      sessionPlayerId: p.playerId,
      position: p.position,
      slotIndex: i
    }));
  }

  /**
   * Local QA path only: the round-live debug button creates an in-memory
   * manager-side Partido injury by removing one slot and appending a
   * "Debug Partido" INJURY event. If openPartidoModal immediately refetches
   * backend state, that synthetic hole disappears before the modal can prove
   * AUTO repair. Normal production snapshots still prefer the fresh backend
   * state.
   */
  private isLocalDebugPartidoState(state: MatchState | null | undefined): boolean {
    return (state?.events ?? []).some(event =>
      event.eventType === 'INJURY'
      && typeof event.description === 'string'
      && event.description.includes('Debug Partido:')
    );
  }

  private ensureUniqueCurrentSlots(
    currentSlots: PartidoDialogData['currentSlots'],
    squad: SessionPlayer[]
  ): PartidoDialogData['currentSlots'] {
    const used = new Set<string>();
    const squadByRole = new Map<string, SessionPlayer[]>();
    const squadFallback: SessionPlayer[] = [];
    for (const player of squad ?? []) {
      if (!player.sessionPlayerId) {
        continue;
      }
      const role = this.zoneRole(player.position);
      const list = squadByRole.get(role) ?? [];
      list.push(player);
      squadByRole.set(role, list);
      squadFallback.push(player);
    }

    return (currentSlots ?? []).map(slot => {
      const id = slot.sessionPlayerId;
      if (id && !used.has(id)) {
        used.add(id);
        return slot;
      }

      const wantedRole = this.zoneRole(slot.position);
      const replacement = [
        ...(squadByRole.get(wantedRole) ?? []),
        ...squadFallback
      ].find(player => !!player.sessionPlayerId && !used.has(player.sessionPlayerId));

      if (!replacement?.sessionPlayerId) {
        return slot;
      }

      used.add(replacement.sessionPlayerId);
      return {
        ...slot,
        sessionPlayerId: replacement.sessionPlayerId,
        position: slot.position || replacement.position || 'MID'
      };
    });
  }

  private zoneRole(position: string | null | undefined): string {
    const pos = (position ?? '').toUpperCase();
    if (pos === 'GK') { return 'GK'; }
    if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(pos)) { return 'DEF'; }
    if (['ST', 'CF', 'LW', 'RW', 'ATT', 'WINGER'].includes(pos)) { return 'ATT'; }
    return 'MID';
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

  private rememberPartidoSavedSlots(matchId: string, closeResult: unknown): void {
    const result = closeResult as {
      success?: boolean;
      formation?: string | null;
      savedSlots?: Array<{
        sessionPlayerId?: string | null;
        playerId?: string | null;
        position?: string | null;
        slotIndex?: number | null;
        customXPercent?: number | null;
        customYPercent?: number | null;
      }> | null;
      result?: {
        success?: boolean;
        currentFormation?: LiveFormationSlot[] | null;
      };
    } | null;
    if (!result?.success || result.result?.success === false) {
      return;
    }
    if (typeof result.formation === 'string' && result.formation.trim()) {
      this.partidoSavedFormationMemory.set(matchId, result.formation.trim());
    }
    const sourceSlots = Array.isArray(result.savedSlots) && result.savedSlots.length
      ? result.savedSlots
      : result.result?.currentFormation;
    if (!Array.isArray(sourceSlots)) {
      return;
    }
    const slots: PartidoDialogData['currentSlots'] = [];
    sourceSlots
      .forEach((slot, index) => {
        const sessionPlayerId = slot.sessionPlayerId || slot.playerId || '';
        if (!sessionPlayerId) {
          return;
        }
        slots.push({
          sessionPlayerId,
          position: slot.position || 'MID',
          slotIndex: typeof slot.slotIndex === 'number' ? slot.slotIndex : index,
          customXPercent: typeof slot.customXPercent === 'number' && Number.isFinite(slot.customXPercent)
            ? slot.customXPercent
            : null,
          customYPercent: typeof slot.customYPercent === 'number' && Number.isFinite(slot.customYPercent)
            ? slot.customYPercent
            : null
        });
      });
    slots.sort((a, b) => a.slotIndex - b.slotIndex);
    if (slots.length >= 10) {
      this.partidoSavedSlotsMemory.set(matchId, slots);
    }
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

  private overlayRememberedPartidoSlots(
    matchId: string,
    currentSlots: PartidoDialogData['currentSlots']
  ): PartidoDialogData['currentSlots'] {
    const remembered = this.partidoSavedSlotsMemory.get(matchId);
    if (!remembered || remembered.length < 10 || !currentSlots?.length) {
      return currentSlots;
    }
    if (remembered.length >= 11 && !this.hasCompletePartidoSlotSnapshot(currentSlots)) {
      return remembered;
    }
    const currentIds = new Set(currentSlots.map(slot => slot.sessionPlayerId).filter(Boolean));
    const rememberedStillCurrent = remembered.every(slot => currentIds.has(slot.sessionPlayerId));
    if (rememberedStillCurrent) {
      return remembered;
    }

    const rememberedByPlayerId = new Map(
      remembered
        .filter(slot => !!slot.sessionPlayerId)
        .map(slot => [slot.sessionPlayerId, slot])
    );
    return currentSlots.map(slot => {
      const rememberedSlot = rememberedByPlayerId.get(slot.sessionPlayerId);
      if (!rememberedSlot) {
        return slot;
      }
      return {
        ...slot,
        position: rememberedSlot.position || slot.position,
        customXPercent: rememberedSlot.customXPercent ?? slot.customXPercent,
        customYPercent: rememberedSlot.customYPercent ?? slot.customYPercent
      };
    });
  }

  private hasCompletePartidoSlotSnapshot(currentSlots: PartidoDialogData['currentSlots']): boolean {
    const playerIds = new Set<string>();
    const slotIndexes = new Set<number>();

    for (const [fallbackIndex, slot] of (currentSlots ?? []).entries()) {
      if (!slot.sessionPlayerId) {
        return false;
      }
      playerIds.add(slot.sessionPlayerId);

      const slotIndex = typeof slot.slotIndex === 'number' ? slot.slotIndex : fallbackIndex;
      if (slotIndex < 0 || slotIndex > 10) {
        return false;
      }
      slotIndexes.add(slotIndex);
    }

    return playerIds.size === 11
      && slotIndexes.size === 11
      && Array.from({ length: 11 }, (_, index) => index).every(index => slotIndexes.has(index));
  }

  private mergeSquadWithLivePlayers(squad: SessionPlayer[], livePlayers: PlayerLineupDTO[]): SessionPlayer[] {
    const merged = [...(squad ?? [])];
    const existing = new Set(merged.map(player => player.sessionPlayerId).filter(Boolean));
    for (const player of livePlayers ?? []) {
      if (!player.playerId || existing.has(player.playerId)) {
        continue;
      }
      merged.push({
        sessionPlayerId: player.playerId,
        basePlayerId: null,
        name: player.name,
        age: player.age ?? 0,
        position: player.position,
        attack: player.overall ?? 0,
        defense: player.overall ?? 0,
        technique: player.overall ?? 0,
        speed: player.overall ?? 0,
        stamina: player.energy ?? 100,
        mentality: player.overall ?? 0,
        marketValue: 0,
        energy: player.energy ?? 100,
        form: 100,
        injured: player.injured ?? false,
        injuryType: null,
        injuryRemainingMatches: 0,
        origin: 'CUSTOM'
      });
      existing.add(player.playerId);
    }
    return merged;
  }

  private sessionPlayerOverall(sp: SessionPlayer): number | undefined {
    const values = [sp.attack, sp.defense, sp.technique, sp.speed, sp.stamina, sp.mentality]
      .filter((value): value is number => typeof value === 'number');
    if (!values.length) {
      return undefined;
    }
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private toSubModalPlayer(p: PlayerLineupDTO, isStarter: boolean): SubModalPlayer {
    return {
      sessionPlayerId: p.playerId,
      displayName: p.name,
      position: p.position,
      rating: p.overall,
      isStarter
    };
  }

  private toSubModalPlayerFromSession(sp: SessionPlayer, isStarter: boolean): SubModalPlayer {
    const overall = Math.round(
      ((sp.attack ?? 50) +
       (sp.defense ?? 50) +
       (sp.technique ?? 50) +
       (sp.speed ?? 50) +
       (sp.stamina ?? 50) +
       (sp.mentality ?? 50)) / 6
    );
    return {
      sessionPlayerId: sp.sessionPlayerId,
      displayName: sp.name || 'Unknown',
      position: sp.position || 'MID',
      rating: overall,
      isStarter
    };
  }
}



