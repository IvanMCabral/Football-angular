import { Component, inject, isDevMode, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { CareerService } from '../../core/services/career.service';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { Match } from '../../shared/models/match.model';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { filter, map, switchMap, tap, take, takeUntil, catchError, shareReplay } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';
import { MatchState, RoundState } from '../../core/services/match-engine.model';
import {
  buildPersistedInjuryAutoModalPayload,
  buildPendingRoundStartMatches,
  buildPendingLiveModalNotice,
  findInjuryAutoModalCandidates,
  findRestorableInjuryAutoModals,
  findRivalRedCardModalCandidate,
  findRoundControlAnchorMatch,
  getLastRoundEvents,
  getRoundEventIcon,
  getRoundStatusText,
  isTerminalRoundState,
  isLocalDebugHost,
  mapRoundFixtureStatus,
  normalizeTacticalSlotSnapshotForDebug,
  normalizeTerminalLiveState,
  parsePersistedInjuryAutoModalRefs,
  readStorageFlag,
  ROUND_LIVE_DEBUG_STORAGE_KEYS,
  shouldQueueInjuryAutoModal,
  shouldQueueRivalCardModal,
  writeStorageFlag
} from './utils/round-live-utils';

declare global {
  interface Window {
    managerDebugRoundLive?: {
      triggerUserInjuries: (playerIds?: string[]) => { queued: string[]; reason?: string };
      triggerUserPartidoInjury: (playerId?: string) => { injuredPlayerId?: string; reason?: string };
    };
  }
}

interface PersistedInjuryAutoModal {
  matchId: string;
  preSelectedPlayerId: string;
}

interface InjuryAutoModalPayload {
  matchId: string;
  state: MatchState;
  preSelectedPlayerId: string;
}

interface RivalCardModalPayload {
  matchId: string;
  state: MatchState;
  playerName: string;
  minute: number;
}

@Component({
  selector: 'app-round-live',
  standalone: true,
  imports: [CommonModule, RouterLink, MatchCardComponent],
  templateUrl: './round-live.component.html',
  styleUrls: ['./round-live.component.css']
})
export class RoundLiveComponent implements OnInit, OnDestroy {
  private engineService = inject(MatchEngineService);
  private careerService = inject(CareerService);
  private modals = inject(LiveMatchModalsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  private logDevWarn(message: string, ...args: unknown[]): void {
    if (isDevMode()) {
      console.warn(message, ...args);
    }
  }

  private logDevError(message: string, ...args: unknown[]): void {
    if (isDevMode()) {
      console.error(message, ...args);
    }
  }

  /**
   * Tracks injury events that already opened an automatic modal.
   * the substitution modal. Keyed by `matchId|minute|playerId` so the
   * same injury fired twice across SSE reconnects doesn't re-trigger
   * the modal. Cleared on round restart (the user navigates away and
   * back, so the component is recreated).
   */
  private readonly autoModalShownEventIds = new Set<string>();

  /**
   * Guards against overlapping automatic modals. When an injury
   * fires while the previous INJURY modal is still open, the second
   * event is queued (so the manager sees it next) instead of stacking
   * multiple dialogs on top of each other.
   */
  private isAutoModalOpen = false;
  private queuedAutoModals: InjuryAutoModalPayload[] = [];
  private activeInjuryAutoModal: PersistedInjuryAutoModal | null = null;
  private restoredPersistedInjuryAutoModals = false;
  private releaseQueuedAutoModalResumeHold: (() => void) | null = null;

  /**
   * Single gate for critical live-manager modals.
   * Substitution, Formation and Partido all pause/resume the live round,
   * so only one of them can be open at a time. Injury auto-modals queue
   * behind this gate instead of stacking over a manual modal.
   */
  private isCriticalLiveModalOpen = false;

  private readonly injuryAutoModalStoragePrefix = 'manager.pendingInjuryAutoModals.v1';
  readonly isLocalDebugHost = typeof window !== 'undefined'
    && isLocalDebugHost(window.location.hostname);
  readonly showDebugControls = this.readDebugControlsFlag();
  debugFreezeEnabled = this.showDebugControls && this.readDebugFreezeFlag();
  debugSuppressAutoInjuryModals = this.showDebugControls && this.readDebugSuppressAutoInjuryFlag();
  private currentUserSessionTeamId: string | null = null;
  private debugFreezePauseInFlight = false;
  private debugFreezePausedRoundKeys = new Set<string>();
  private debugRoundLiveHook?: Window['managerDebugRoundLive'];

  // Rival red-card notices do not pause the round, so they have their own lifecycle.
  private readonly rivalCardShownEventIds = new Set<string>();

  // Kept separate from injury modals; both flows can happen on the same tick.
  private isRivalCardModalOpen = false;
  private queuedRivalCardModal: RivalCardModalPayload | null = null;

  pendingLiveModalNotice: string | null = null;

  // Avoid duplicated start requests while the round stream is being wired.
  private autoStartTriggered = false;

  // Backend may resolve a canonical round id; the stream must use that id.
  private resolvedRoundId$ = new BehaviorSubject<string | null>(null);

  private vmSubject = new BehaviorSubject<RoundLiveViewModel>({
    gameId: '',
    roundNumber: 1,
    matches: [],
    teamNameMap: {},
    allFinished: false,
    errorMsg: '',
    isRoundPaused: false,
    byeTeam: null, // UX-6: BYE indicator
    anyStarted: false // UX fix: drives "Iniciar Todos" button visibility
  });

  vm$: Observable<RoundLiveViewModel>;

  // Keeps the page from rendering an empty shell while the round loads.
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {
    this.vm$ = this.vmSubject.asObservable();
    this.registerDebugRoundLiveHook();
    setTimeout(() => this.registerDebugRoundLiveHook(), 0);

    // Register before the first real VM emission so the round can auto-start once.
    this.vm$.pipe(
      takeUntil(this.destroy$),
      filter(vm => vm.matches.length > 0 || !!vm.errorMsg),
      take(1)
    ).subscribe(vm => this.tryAutoStartRound(vm));

    const routeParams$ = this.route.paramMap.pipe(
      map(params => ({
        gameId: params.get('gameId') || '',
        roundNumber: params.get('round') ? parseInt(params.get('round')!) : 1
      })),
      shareReplay(1)
    );

    const teams$ = routeParams$.pipe(
      switchMap(params => this.careerService.getCareerTeams(params.gameId)),
      map(teams => {
        const teamMap: { [id: string]: string } = {};
        teams.forEach(team => {
          const teamId = team.sessionTeamId || String(team.id);
          teamMap[teamId] = team.name;
        });
        return teamMap;
      }),
      shareReplay(1)
    );

    const careerStatus$ = routeParams$.pipe(
      switchMap(params => this.careerService.getCareerStatus())
    );

    const fixtures$ = routeParams$.pipe(
      switchMap(params => this.careerService.getFixturesByRoundWithBye(params.roundNumber))
    );

    combineLatest([routeParams$, teams$, careerStatus$, fixtures$]).pipe(
      takeUntil(this.destroy$),
      tap(([params, teamMap, careerStatus, fixturesData]) => {
        // Clear the initial-load spinner on the first
        // emission (success path). Done before the early-return redirects
        // so the manager doesn't see the spinner stick if we navigate
        // them to the champion screen.
        this.loadingSubject.next(false);

        if (careerStatus.careerPhase === 'FINISHED') {
          this.router.navigate([`/games/${params.gameId}/champion`]);
          return;
        }

        if (params.roundNumber > careerStatus.totalRounds) {
          this.router.navigate([`/games/${params.gameId}/champion`]);
          return;
        }

        const userSessionTeamId = careerStatus.userSessionTeamId || '';
        this.currentUserSessionTeamId = userSessionTeamId || null;
        const fixtures = fixturesData.matches;
        const byeTeam: string | null = fixturesData.byeTeam ?? null;
        const hydratedTeamMap = { ...teamMap };
        for (const fixture of fixtures) {
          if (fixture.homeTeamId && fixture.homeTeamName) {
            hydratedTeamMap[String(fixture.homeTeamId)] = fixture.homeTeamName;
          }
          if (fixture.awayTeamId && fixture.awayTeamName) {
            hydratedTeamMap[String(fixture.awayTeamId)] = fixture.awayTeamName;
          }
        }

        if (fixtures.length === 0) {
          this.updateVm({
            gameId: params.gameId,
            roundNumber: params.roundNumber,
            matches: [],
            teamNameMap: hydratedTeamMap,
            allFinished: false,
            errorMsg: `No hay partidos para la fecha ${params.roundNumber}`,
            isRoundPaused: false,
            byeTeam,
            anyStarted: false
          });
          return;
        }

        const matches: RoundMatchVM[] = fixtures.map(fixture => {
          const match: Match = {
            id: fixture.matchId,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            round: fixture.round,
            scheduledAt: new Date().toISOString(),
            status: this.mapFixtureStatus(fixture.status),
            result: null,
            createdAt: new Date().toISOString(),
            simulatedAt: null
          };

          const homeId = String(match.homeTeamId);
          const awayId = String(match.awayTeamId);

          return {
            match,
            isUserMatch: homeId === userSessionTeamId || awayId === userSessionTeamId,
            userTeamId: homeId === userSessionTeamId || awayId === userSessionTeamId
              ? userSessionTeamId
              : undefined
          };
        });

        this.updateVm({
          gameId: params.gameId,
          roundNumber: params.roundNumber,
          matches,
          teamNameMap: hydratedTeamMap,
          allFinished: false,
          errorMsg: '',
          isRoundPaused: false,
          byeTeam,
          anyStarted: false
        });

        this.startRoundEngine(params.gameId, matches);
      }),
      catchError(err => {
        this.logDevError('[ROUND] Error:', err);
        // Clear the spinner even on error so the empty/error
        // state becomes visible instead of a stuck spinner. The existing
        // vm.errorMsg / router.navigate fallbacks render the actual error
        // path.
        this.loadingSubject.next(false);
        return of(null);
      })
    ).subscribe();
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined' && window.managerDebugRoundLive === this.debugRoundLiveHook) {
      delete window.managerDebugRoundLive;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVm(vm: RoundLiveViewModel) {
    this.vmSubject.next(vm);
  }

  private registerDebugRoundLiveHook(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return;
    }
    const hook = {
      triggerUserInjuries: (playerIds?: string[]) => this.debugTriggerUserInjuryModals(playerIds),
      triggerUserPartidoInjury: (playerId?: string) => this.debugTriggerUserPartidoInjury(playerId)
    };
    this.debugRoundLiveHook = hook;
    window.managerDebugRoundLive = hook;
  }

  debugTriggerUserPartidoInjury(playerId?: string): { injuredPlayerId?: string; reason?: string } {
    const currentVm = this.vmSubject.value;
    const userMatch = currentVm.matches.find(match => match.isUserMatch && match.state);
    const state = userMatch?.state;
    if (!userMatch || !state) {
      return { reason: 'No hay partido de usuario vivo para simular lesión propia en Partido.' };
    }

    const userTeamId = this.resolveManagerTeamId(userMatch, state);
    const managerIsAway = userTeamId === String(state.awayTeamId);
    const sourceSlots = managerIsAway ? (state.awaySlots ?? []) : (state.homeSlots ?? []);
    const normalizedSourceSlots = normalizeTacticalSlotSnapshotForDebug(sourceSlots);
    const activeDebugPartidoEvents = (state.events ?? []).filter(event =>
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
      .filter(slot => (slot.position || '').toUpperCase() !== 'GK')
      .find(slot => !playerId || String(slot.sessionPlayerId ?? slot.playerId ?? '') === playerId);
    const injuredPlayerId = String(selectedSlot?.sessionPlayerId ?? selectedSlot?.playerId ?? '');
    if (!selectedSlot || !injuredPlayerId) {
      return { reason: 'No hay jugador de campo del usuario para simular lesión propia en Partido.' };
    }

    const slotIndex = typeof selectedSlot.slotIndex === 'number'
      ? selectedSlot.slotIndex
      : normalizedSourceSlots.indexOf(selectedSlot);
    const nextSlots = normalizedSourceSlots.filter((slot, index) => {
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
        : (state.homePlayerRatings ?? []).map(rating => rating.playerId === injuredPlayerId
            ? { ...rating, injuries: Math.max(1, rating.injuries ?? 0) }
            : rating),
      awayPlayerRatings: managerIsAway
        ? (state.awayPlayerRatings ?? []).map(rating => rating.playerId === injuredPlayerId
            ? { ...rating, injuries: Math.max(1, rating.injuries ?? 0) }
            : rating)
        : state.awayPlayerRatings
    };
    const nextMatches = currentVm.matches.map(match =>
      match === userMatch
        ? { ...match, state: nextState }
        : match
    );
    this.updateVm({ ...currentVm, matches: nextMatches });
    return { injuredPlayerId };
  }

  private debugTriggerUserInjuryModals(playerIds?: string[]): { queued: string[]; reason?: string } {
    const userMatch = this.vmSubject.value.matches.find(match => match.isUserMatch && match.state);
    const state = userMatch?.state;
    if (!userMatch || !state) {
      return { queued: [], reason: 'No hay partido de usuario vivo para simular lesiones.' };
    }

    const userTeamId = this.resolveManagerTeamId(userMatch, state);
    const slots = userTeamId === String(state.awayTeamId)
      ? (state.awaySlots ?? [])
      : (state.homeSlots ?? []);
    const autoIds = slots
      .filter(slot => (slot.position || '').toUpperCase() !== 'GK')
      .map(slot => String(slot.sessionPlayerId ?? slot.playerId ?? ''))
      .filter(id => !!id)
      .slice(0, 2);
    const ids = (playerIds?.length ? playerIds : autoIds).filter(id => !!id);
    if (ids.length === 0) {
      return { queued: [], reason: 'No hay jugadores de campo disponibles para simular lesiones.' };
    }

    ids.forEach(playerId => {
      this.queueOrOpenAutoModal({
        matchId: String(state.matchId),
        state,
        preSelectedPlayerId: playerId
      });
    });

    return { queued: ids };
  }

  onDebugDoubleInjury(): void {
    const result = this.debugTriggerUserInjuryModals();
    if (result.reason) {
      this.logDevWarn('[ROUND-LIVE] double injury skipped:', result.reason);
    }
  }

  onDebugPartidoInjury(): void {
    const result = this.debugTriggerUserPartidoInjury();
    if (result.reason) {
      this.logDevWarn('[ROUND-LIVE] Partido injury skipped:', result.reason);
      this.pendingLiveModalNotice = result.reason;
      return;
    }
    this.pendingLiveModalNotice = 'Lesión de prueba creada. Abrí Partido para validar AUTO + cambio manual.';
  }

  private startRoundEngine(gameId: string, matches: RoundMatchVM[]) {
    // Round id is not a local alias for game id.
    // The backend registers the RoundEngine under whatever
    // `state.roundId` it returns from the POST response  -  frontend
    // cannot assume gameId is a parseable UUID or that the backend
    // uses it 1:1. We keep gameId as the POST body parameter (so the
    // idempotency key matches what the upstream auto-start sent) and
    // capture the server-resolved roundId into resolvedRoundId$ for
    // the SSE stream to consume.
    const requestRoundId = gameId;
    const matchData = matches.map(rm => ({
      matchId: String(rm.match.id),
      homeTeamId: String(rm.match.homeTeamId),
      awayTeamId: String(rm.match.awayTeamId)
    }));

    // If auto-start already ran, skip the duplicate POST and wait for its round id.
    const startRound$: Observable<RoundState | null> = this.autoStartTriggered
      ? of(null)
      : this.engineService.startRound(requestRoundId, matchData).pipe(
          tap(state => {
            if (state && state.roundId) {
              this.resolvedRoundId$.next(state.roundId);
            }
          })
        );

    // Stream with the backend-resolved round id, which may differ from the request id.
    const sseStream$ = this.resolvedRoundId$.pipe(
      filter((id): id is string => !!id),
      take(1),
      switchMap(id => this.engineService.streamRoundState(id))
    );

    startRound$.pipe(
      switchMap(() => sseStream$),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (roundState) => {
        const currentVm = this.vmSubject.value;
        const updatedMatches = currentVm.matches.map(rm => {
          const matchState = roundState.matches.find(ms =>
            String(ms.matchId) === String(rm.match.id)
          );
          const normalizedMatchState = matchState
            ? this.normalizeTerminalLiveState(matchState)
            : undefined;
          // propagate the live state status into the
          // embedded Match.status so post-FINISHED snapshots don't show stale
          // "En Juego"  -  mapFixtureStatus now handles both fixture statuses
          // (PENDING/SIMULATING/COMPLETED/CANCELLED) and live state statuses
          // (NOT_STARTED/RUNNING/PAUSED/FINISHED/CANCELLED).
          const match = normalizedMatchState
            ? { ...rm.match, status: this.mapFixtureStatus(normalizedMatchState.status) }
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
          allFinished: updatedMatches.every(m =>
            m.state?.status === 'FINISHED' ||
            m.state?.status === 'CANCELLED' ||
            roundState.status === 'COMPLETED'
          ),
          isRoundPaused: updatedMatches.some(m => m.state?.status === 'PAUSED'),
          // UX fix: true if at least one match has
          // transitioned past NOT_STARTED. Drives the "Iniciar Todos"
          // button visibility (button hides once the round has started
          // ticking). Note: MatchState.status uses 'RUNNING' (not
          // 'IN_PROGRESS'  -  that's the RoundState.status value).
          anyStarted: updatedMatches.some(m =>
            m.state?.status === 'RUNNING' ||
            m.state?.status === 'HALF_TIME' ||
            m.state?.status === 'PAUSED' ||
            m.state?.status === 'FINISHED' ||
            m.state?.status === 'CANCELLED'
          )
        };

        this.updateVm(newVm);
        this.applyDeFreezeIfNeeded(newVm);
        this.restorePersistedInjuryAutoModals(updatedMatches);

        // Scan for new injury events on the manager team
        // and auto-open the substitution modal. Runs AFTER the VM is
        // updated so the modal receives the latest matchState (with
        // currentMinute + playerRatings already populated by the SSE
        // tick).
        this.maybeOpenInjuryAutoModal(updatedMatches);
        // scan ALL matches (user + rival) for RED_CARD
        // events on a non-user team and auto-open the awareness modal.
        // Same pattern as the injury flow but the modal is informational
        // only  -  no pre-select, no round pause.
        this.maybeOpenRivalCardInfoModal(updatedMatches);
      },
      error: (err) => {
        this.logDevError('[ROUND] Error in SSE stream:', err);
      },
      complete: () => {
      }
    });
  }

  // Opens or queues the automatic substitution modal for new manager-team injuries.
  private maybeOpenInjuryAutoModal(matches: RoundMatchVM[]): void {
    if (this.debugSuppressAutoInjuryModals) {
      return;
    }
    const currentUserMatch = this.vmSubject.value.matches.find(m => m.isUserMatch && m.state);
    const userTeamId = currentUserMatch?.state
      ? this.resolveManagerTeamId(currentUserMatch, currentUserMatch.state)
      : (this.currentUserSessionTeamId ?? this.vmSubject.value.matches.find(m => m.isUserMatch)?.match.homeTeamId);
    const userTeamIdStr = userTeamId ? String(userTeamId) : null;
    if (!userTeamIdStr) {
      return;
    }

    const candidates = findInjuryAutoModalCandidates({
      matches,
      userTeamId: userTeamIdStr,
      shownEventIds: this.autoModalShownEventIds
    });

    for (const candidate of candidates) {
      this.autoModalShownEventIds.add(candidate.eventId);
      if (!candidate.alreadyResolved) {
        this.queueOrOpenAutoModal({
          matchId: candidate.matchId,
          state: candidate.state,
          preSelectedPlayerId: candidate.preSelectedPlayerId
        });
      }
    }
  }

  // Shows an awareness modal when the rival receives a red card in the user match.
  private maybeOpenRivalCardInfoModal(matches: RoundMatchVM[]): void {
    const candidate = findRivalRedCardModalCandidate({
      matches,
      shownEventIds: this.rivalCardShownEventIds
    });
    if (!candidate) {
      return;
    }

    this.rivalCardShownEventIds.add(candidate.dedupKey);
    this.queueOrOpenRivalCardModal({
      matchId: candidate.matchId,
      state: candidate.state,
      playerName: candidate.playerName,
      minute: candidate.minute
    });
  }

  /**
   * open the rival card awareness modal now, or queue
   * it if the previous awareness modal is still on screen. Replaces any
   * older queued entry.
   */
  private queueOrOpenRivalCardModal(payload: RivalCardModalPayload): void {
    if (shouldQueueRivalCardModal({
      status: payload.state.status,
      isRivalCardModalOpen: this.isRivalCardModalOpen,
      isCriticalLiveModalOpen: this.isCriticalLiveModalOpen
    })) {
      this.queuedRivalCardModal = payload;
      this.updatePendingLiveModalNotice();
      return;
    }
    this.openRivalCardInfoModal(payload);
  }

  // Informational only: red-card notices do not pause or resume the round.
  private openRivalCardInfoModal(payload: RivalCardModalPayload): void {
    this.isRivalCardModalOpen = true;
    this.updatePendingLiveModalNotice();
    this.modals.openRivalCardInfoModal(
      payload.matchId,
      payload.state,
      { playerName: payload.playerName, minute: payload.minute, cardType: 'RED' }
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isRivalCardModalOpen = false;
          const queued = this.queuedRivalCardModal;
          this.queuedRivalCardModal = null;
          this.updatePendingLiveModalNotice();
          if (queued) {
            // Defer to the next macrotask so the dialog close animation
            // finishes before a new dialog opens.
            setTimeout(() => this.openRivalCardInfoModal(queued), 0);
          }
        },
        error: (err) => {
          this.logDevError('[ROUND-LIVE] rival card awareness modal error', err);
          this.isRivalCardModalOpen = false;
          this.queuedRivalCardModal = null;
          this.updatePendingLiveModalNotice();
        }
      });
  }

  /**
   * Opens the automatic modal now, or queues it if a previous
   * one is still on screen. Replaces any older queued entry (the
   * most recent injury is the most important).
   */
  private queueOrOpenAutoModal(payload: InjuryAutoModalPayload): void {
    if (shouldQueueInjuryAutoModal({
      isAutoModalOpen: this.isAutoModalOpen,
      isCriticalLiveModalOpen: this.isCriticalLiveModalOpen
    })) {
      this.enqueueAutoModal(payload);
      this.updatePendingLiveModalNotice();
      return;
    }
    this.openInjuryAutoModal(payload);
  }

  private enqueueAutoModal(payload: InjuryAutoModalPayload): void {
    if ((this.isAutoModalOpen || this.isCriticalLiveModalOpen) && !this.releaseQueuedAutoModalResumeHold) {
      this.releaseQueuedAutoModalResumeHold = this.modals.holdRoundResumeAfterModalClose();
    }
    const alreadyQueued = this.queuedAutoModals.some(queued =>
      queued.matchId === payload.matchId
      && queued.preSelectedPlayerId === payload.preSelectedPlayerId
    );
    if (!alreadyQueued) {
      this.queuedAutoModals = [...this.queuedAutoModals, payload];
      this.persistInjuryAutoModals();
    }
  }

  /**
   * Opens the Partido modal with the
   * INJURY pre-select. The old substitution-only modal still exists as
   * a manual shortcut, but forced injuries now open the full DT surface
   * so the manager can replace the player, change formation and tune
   * pixels in one decision.
   */
  private openInjuryAutoModal(payload: InjuryAutoModalPayload): void {
    this.isAutoModalOpen = true;
    this.isCriticalLiveModalOpen = true;
    this.activeInjuryAutoModal = {
      matchId: payload.matchId,
      preSelectedPlayerId: payload.preSelectedPlayerId
    };
    this.persistInjuryAutoModals();
    this.updatePendingLiveModalNotice();
    const currentVm = this.vmSubject.value;
    this.modals.openPartidoModal(payload.matchId, payload.state, {
      home: this.getTeamName(payload.state.homeTeamId, currentVm.teamNameMap),
      away: this.getTeamName(payload.state.awayTeamId, currentVm.teamNameMap)
    }, {
      preSelectedPlayerId: payload.preSelectedPlayerId,
      reason: 'INJURY_FORCED_SUBSTITUTION'
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => {
          // Modal closed (confirmed or cancelled). Reset flag + drain
          // the queue.
          this.isAutoModalOpen = false;
          this.activeInjuryAutoModal = null;
          this.persistInjuryAutoModals();
          this.releaseCriticalLiveModalGate();
        },
        error: (err) => {
          this.logDevError('[ROUND-LIVE] injury auto-modal error', err);
          this.isAutoModalOpen = false;
          this.isCriticalLiveModalOpen = false;
          this.activeInjuryAutoModal = null;
          this.queuedAutoModals = [];
          this.persistInjuryAutoModals();
          this.updatePendingLiveModalNotice();
        }
      });
  }

  pauseAll() {
    const vm = this.vmSubject.value;
    const anchorMatch = this.findRoundControlAnchorMatch(vm);
    if (!anchorMatch) {
      return;
    }

    this.engineService.pauseRoundForMatch(vm.gameId, String(anchorMatch.match.id)).subscribe({
      next: () => {
        this.updateVm({ ...this.vmSubject.value, isRoundPaused: true });
        this.drainQueuedLiveModals();
      },
      error: (err) => this.logDevError('[ROUND-LIVE] pauseAll failed', err)
    });
  }

  toggleDebugFreeze(): void {
    this.debugFreezeEnabled = !this.debugFreezeEnabled;
    writeStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.freeze, this.debugFreezeEnabled);

    if (this.debugFreezeEnabled) {
      const vm = this.vmSubject.value;
      this.debugFreezePausedRoundKeys.delete(`${vm.gameId}|${vm.roundNumber}`);
      this.applyDeFreezeIfNeeded(vm);
    }
  }

  private resolveManagerTeamId(userMatch: RoundMatchVM, state: MatchState): string {
    const explicit = userMatch.userTeamId ?? this.currentUserSessionTeamId;
    if (explicit && [String(state.homeTeamId), String(state.awayTeamId)].includes(String(explicit))) {
      return String(explicit);
    }
    return String(userMatch.match.homeTeamId ?? state.homeTeamId);
  }

  toggleDebugSuppressAutoInjuryModals(): void {
    this.debugSuppressAutoInjuryModals = !this.debugSuppressAutoInjuryModals;
    writeStorageFlag(
      this.localStorageRef(),
      ROUND_LIVE_DEBUG_STORAGE_KEYS.suppressAutoInjury,
      this.debugSuppressAutoInjuryModals
    );

    if (this.debugSuppressAutoInjuryModals) {
      this.queuedAutoModals = [];
      this.updatePendingLiveModalNotice();
    }
  }

  private readDebugFreezeFlag(): boolean {
    return readStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.freeze);
  }

  private readDebugSuppressAutoInjuryFlag(): boolean {
    return readStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.suppressAutoInjury);
  }

  private readDebugControlsFlag(): boolean {
    return this.isLocalDebugHost &&
      readStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.controls);
  }

  private localStorageRef(): Storage | undefined {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  }

  private applyDeFreezeIfNeeded(vm: RoundLiveViewModel, force = false): void {
    if (!this.debugFreezeEnabled || vm.allFinished || (!force && vm.isRoundPaused) || this.debugFreezePauseInFlight) {
      return;
    }

    const anchorMatch = this.findRoundControlAnchorMatch(vm);
    if (!anchorMatch || !anchorMatch.state || isTerminalRoundState(anchorMatch.state.status)) {
      return;
    }

    const roundKey = `${vm.gameId}|${vm.roundNumber}`;
    if (!force && this.debugFreezePausedRoundKeys.has(roundKey)) {
      return;
    }

    this.debugFreezePauseInFlight = true;
    this.engineService.pauseRoundForMatch(vm.gameId, String(anchorMatch.match.id)).subscribe({
      next: () => {
        this.debugFreezePausedRoundKeys.add(roundKey);
        this.updateVm({ ...this.vmSubject.value, isRoundPaused: true });
      },
      error: (err) => this.logDevError('[ROUND-LIVE] debug freeze pause failed', err),
      complete: () => {
        this.debugFreezePauseInFlight = false;
      }
    });
  }

  resumeAll() {
    const vm = this.vmSubject.value;
    if (!vm.isRoundPaused) {
      return;
    }

    const anchorMatch = this.findRoundControlAnchorMatch(vm);
    if (!anchorMatch) {
      return;
    }

    this.engineService.resumeRoundForMatch(vm.gameId, String(anchorMatch.match.id)).subscribe({
      next: () => this.updateVm({ ...this.vmSubject.value, isRoundPaused: false }),
      error: (err) => this.logDevError('[ROUND-LIVE] resumeAll failed', err)
    });
  }

  /**
   * Header pause/resume controls operate on the whole RoundEngine, not on
   * individual MatchEngines. The backend helper only needs one matchId from
   * the active round to resolve the real roundId, so prefer the user's match
   * and fall back to any non-terminal match.
   */
  private findRoundControlAnchorMatch(vm: RoundLiveViewModel): RoundMatchVM | null {
    return findRoundControlAnchorMatch(vm);
  }

  /**
   * Defensive UI guard for live streams that reach 90' but keep reporting
   * RUNNING for one or more ticks. The backend should ideally emit FINISHED;
   * this keeps the manager flow from getting visually stuck on "En Juego".
   */
  private normalizeTerminalLiveState(state: MatchState): MatchState {
    return normalizeTerminalLiveState(state);
  }

  // Manual fallback for rounds that did not visibly auto-start.
  iniciarTodos(): void {
    const vm = this.vmSubject.value;
    const pending = buildPendingRoundStartMatches(vm.matches);

    if (pending.length === 0) {
      // No NOT_STARTED matches left  -  button should already be hidden via
      // the *ngIf="!vm.anyStarted" guard, but guard defensively here.
      return;
    }

    const roundId = vm.gameId;
    this.engineService.startRound(roundId, pending).subscribe({
      next: (state) => {
        // Capture the backend-resolved round id so any
        // subsequent SSE subscription (including a fresh mount via
        // tryAutoStartRound) uses the same registry key the backend
        // registered. Without this, a "Iniciar Todos" retry after a
        // failed auto-start can return a different roundId than the
        // one already resolved (e.g. when the backend re-issued a
        // new round under a new UUID).
        if (state && state.roundId) {
          this.resolvedRoundId$.next(state.roundId);
        }
      },
      error: (err) => {
        this.logDevError('[ROUND-LIVE] Iniciar Todos failed', err);
      }
    });
  }

  // Primary auto-start path; "Iniciar Todos" remains as a manual fallback.
  private tryAutoStartRound(vm: RoundLiveViewModel): void {
    if (this.autoStartTriggered) {
      // Defensive: take(1) should already guarantee single-fire, but
      // explicit guard so future refactors (e.g. lifting the take(1))
      // don't accidentally POST twice.
      return;
    }
    this.autoStartTriggered = true;

    if (vm.errorMsg || vm.matches.length === 0) {
      // Nothing to start  -  round can't be played (error or empty).
      return;
    }

    const pending = buildPendingRoundStartMatches(vm.matches);

    if (pending.length === 0) {
      // All matches already started (e.g. user refreshed an in-flight
      // round). Nothing to POST  -  the SSE stream from
      // startRoundEngine will catch up via polling/SSE reconnect.
      return;
    }

    this.engineService.startRound(vm.gameId, pending).subscribe({
      next: (state) => {
        // Capture the backend-resolved round id so the
        // SSE subscription started later by startRoundEngine (which
        // sees autoStartTriggered=true and short-circuits its own POST)
        // uses the SAME roundId as the registry key. Before this fix
        // the SSE chain did `streamRoundState(vm.gameId)`, but the
        // backend roundEngineRegistry.get(vm.gameId) returned null
        // and MatchEngineController returned Flux.empty()  -  silent
        // idle SSE.
        if (state && state.roundId) {
          this.resolvedRoundId$.next(state.roundId);
        }
      },
      error: (err) => {
        // A failed auto-start leaves the round stuck on
        // NOT_STARTED. The "Iniciar Todos" button stays visible (no
        // anyStarted flip) and the manager can re-trigger manually.
        this.logDevError('[ROUND-LIVE] Auto-start failed; user can retry with Iniciar Todos', err);
      }
    });
  }

  changeTactic(match: Match, team: 'HOME' | 'AWAY', tactic: 'ATTACK' | 'DEFEND' | 'BALANCED') {
    const matchId = String(match.id);
    const matches = this.vmSubject.value.matches;
    const rm = matches.find(r => String(r.match.id) === matchId);
    if (rm?.state?.status !== 'RUNNING') {
      return;
    }
    this.engineService.sendCommand(matchId, {
      type: 'CHANGE_TACTIC',
      targetTeam: team,
      tactic: tactic
    }).subscribe();
  }

  onTacticChange(match: Match, event: { team: 'HOME' | 'AWAY'; tactic: 'ATTACK' | 'DEFEND' | 'BALANCED' }) {
    this.changeTactic(match, event.team, event.tactic);
  }

  // User match card actions

  /**
   * Opens the substitution modal for the user match. Called from the
   * match-card's (substitutionOpen) output. The actual lineup/squad fetch
   * + dialog opening is delegated to {@link LiveMatchModalsService}.
   */
  onSubstitutionOpen(match: Match, state: MatchState | undefined): void {
    if (!state) {
      return;
    }
    if (this.isCriticalLiveModalOpen) {
      return;
    }
    this.isCriticalLiveModalOpen = true;
    this.modals.openSubstitutionModal(String(match.id), state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => this.releaseCriticalLiveModalGate(),
        error: (err) => {
          this.releaseCriticalLiveModalGate();
          this.logDevError('[ROUND-LIVE] openSubstitutionModal error', err);
        }
      });
  }

  /**
   * Opens the formation modal for the user match. Called from the
   * match-card's (formationOpen) output.
   */
  onFormationOpen(match: Match, state: MatchState | undefined): void {
    if (!state) {
      return;
    }
    if (this.isCriticalLiveModalOpen) {
      return;
    }
    this.isCriticalLiveModalOpen = true;
    this.modals.openFormationModal(String(match.id), state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          if (result?.success && result.formation) {
            this.patchVisibleFormation(String(match.id), state, String(result.formation));
          }
        },
        complete: () => this.releaseCriticalLiveModalGate(),
        error: (err) => {
          this.releaseCriticalLiveModalGate();
          this.logDevError('[ROUND-LIVE] openFormationModal error', err);
        }
      });
  }

  private releaseCriticalLiveModalGate(): void {
    this.isCriticalLiveModalOpen = false;
    if (this.debugFreezeEnabled) {
      setTimeout(() => this.applyDeFreezeIfNeeded(this.vmSubject.value, true), 0);
    }
    setTimeout(() => this.drainQueuedLiveModals(), 0);
  }

  /**
   * Debug injury modals can exist only in component memory
   * (e.g. `Test doble lesion` queues two forced-substitution dialogs without
   * creating backend INJURY events). If the page reloads while one is open or
   * queued, that obligation must not disappear. Persist only ids, then rebuild
   * against the latest live MatchState after the SSE stream reconnects.
   */
  private persistInjuryAutoModals(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const payload = buildPersistedInjuryAutoModalPayload({
      active: this.activeInjuryAutoModal,
      queued: this.queuedAutoModals.map(item => ({
        matchId: item.matchId,
        preSelectedPlayerId: item.preSelectedPlayerId
      }))
    });
    const key = this.injuryAutoModalStorageKey();
    if (!payload) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(payload));
  }

  private restorePersistedInjuryAutoModals(matches: RoundMatchVM[]): void {
    if (this.restoredPersistedInjuryAutoModals || typeof sessionStorage === 'undefined') {
      return;
    }
    this.restoredPersistedInjuryAutoModals = true;
    const key = this.injuryAutoModalStorageKey();
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return;
    }

    const refs = parsePersistedInjuryAutoModalRefs(raw);
    if (!refs) {
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.removeItem(key);
    if (refs.length === 0) {
      return;
    }

    for (const item of findRestorableInjuryAutoModals({ refs, matches })) {
      this.queueOrOpenAutoModal({
        matchId: item.matchId,
        state: item.state,
        preSelectedPlayerId: item.preSelectedPlayerId
      });
    }
    this.persistInjuryAutoModals();
  }

  private injuryAutoModalStorageKey(): string {
    const vm = this.vmSubject.value;
    return `${this.injuryAutoModalStoragePrefix}:${vm.gameId}:${vm.roundNumber}`;
  }

  /**
   * Single drain point for automatic modals waiting behind a
   * manager-controlled modal. Priority is:
   * 1) forced injury substitution, because it affects playability;
   * 2) rival red-card awareness, because it is informational.
   */
  private drainQueuedLiveModals(): void {
    const queued = this.queuedAutoModals.shift();
    this.updatePendingLiveModalNotice();
    if (queued) {
      setTimeout(() => this.openQueuedInjuryAutoModalIfStillNeeded(queued), 0);
      return;
    }
    const queuedRival = this.queuedRivalCardModal;
    this.queuedRivalCardModal = null;
    this.updatePendingLiveModalNotice();
    if (queuedRival) {
      setTimeout(() => this.openRivalCardInfoModal(queuedRival), 0);
    }
  }

  private updatePendingLiveModalNotice(): void {
    this.pendingLiveModalNotice = buildPendingLiveModalNotice({
      queuedInjuryCount: this.queuedAutoModals.length,
      hasQueuedRivalCard: !!this.queuedRivalCardModal,
      isCriticalLiveModalOpen: this.isCriticalLiveModalOpen
    });
  }

  /**
   * Queued injury modals are revalidated just before
   * opening. Example: two injuries arrive, the second waits in queue, but
   * the manager already substituted that second injured player from the
   * first/manual modal. In that case the queued modal would be noise, so we
   * silently drop it. If the player still needs attention, the modal opens.
   */
  private openQueuedInjuryAutoModalIfStillNeeded(payload: InjuryAutoModalPayload): void {
    this.releaseQueuedAutoModalResumeHold?.();
    this.releaseQueuedAutoModalResumeHold = null;
    if (this.modals.wasPlayerConfirmedSubstitutedOff(payload.matchId, payload.preSelectedPlayerId)) {
      setTimeout(() => this.drainQueuedLiveModals(), 0);
      return;
    }
    if (this.queuedAutoModals.length > 0) {
      this.releaseQueuedAutoModalResumeHold = this.modals.holdRoundResumeAfterModalClose();
    }
    this.queueOrOpenAutoModal(payload);
  }

  /**
   * After the live formation modal confirms, update the
   * visible card immediately. The backend/SSE remains the source of truth;
   * this is the local UX bridge so the manager sees their decision at once.
   */
  private patchVisibleFormation(matchId: string, state: MatchState, formation: string): void {
    const currentVm = this.vmSubject.value;
    const patchedMatches = currentVm.matches.map(rm => {
      if (String(rm.match.id) !== matchId || !rm.state) {
        return rm;
      }
      const managerTeamId = rm.userTeamId ?? state.homeTeamId;
      const patchedState: MatchState = managerTeamId === rm.state.homeTeamId
        ? { ...rm.state, homeFormation: formation }
        : { ...rm.state, awayFormation: formation };
      return { ...rm, state: patchedState };
    });
    this.vmSubject.next({ ...currentVm, matches: patchedMatches });
  }

  // Opens the live match detail modal with readable team names when available.
  onPartidoOpen(match: Match, state: MatchState | undefined): void {
    if (!state) {
      return;
    }
    if (this.isCriticalLiveModalOpen) {
      return;
    }
    this.isCriticalLiveModalOpen = true;
    this.updatePendingLiveModalNotice();
    const currentVm = this.vmSubject.value;
    this.modals.openPartidoModal(String(match.id), state, {
      home: this.getTeamName(state.homeTeamId, currentVm.teamNameMap),
      away: this.getTeamName(state.awayTeamId, currentVm.teamNameMap)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => this.releaseCriticalLiveModalGate(),
        error: (err) => {
          this.releaseCriticalLiveModalGate();
          this.logDevError('[ROUND-LIVE] openPartidoModal error', err);
        }
      });
  }

  getTeamName(teamId: any, teamNameMap: { [id: string]: string } | null): string {
    const id = String(teamId);
    return teamNameMap?.[id] || id.substring(0, 8);
  }

  getStatusText(status: string): string {
    return getRoundStatusText(status);
  }

  getEventIcon(eventType: string): string {
    return getRoundEventIcon(eventType);
  }

  getLastEvents(events: any[], count: number): any[] {
    return getLastRoundEvents(events, count);
  }

  // UX-5: separar el partido del user del resto en la grilla
  get userMatch(): RoundMatchVM | null {
    return this.vmSubject.value.matches.find(m => m.isUserMatch) || null;
  }

  get otherMatches(): RoundMatchVM[] {
    return this.vmSubject.value.matches.filter(m => !m.isUserMatch);
  }

  private mapFixtureStatus(fixtureStatus: string): 'SCHEDULED' | 'SIMULATED' | 'CANCELLED' {
    return mapRoundFixtureStatus(fixtureStatus);
  }

  goToRoundSummary() {
    const vm = this.vmSubject.value;
    this.router.navigate([`/games/${vm.gameId}/round/${vm.roundNumber}/summary`]);
  }
}
