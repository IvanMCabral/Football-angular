import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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

  /**
   * #3: track INJURY events that have already auto-opened
   * the substitution modal. Keyed by `matchId|minute|playerId` so the
   * same injury fired twice across SSE reconnects doesn't re-trigger
   * the modal. Cleared on round restart (the user navigates away and
   * back, so the component is recreated).
   */
  private readonly autoModalShownEventIds = new Set<string>();

  /**
   * #3: guard against overlapping auto-modals. When an INJURY
   * fires while the previous INJURY modal is still open, the second
   * event is queued (so the manager sees it next) instead of stacking
   * multiple dialogs on top of each other.
   */
  private isAutoModalOpen = false;
  private queuedAutoModals: Array<{
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }> = [];
  private activeInjuryAutoModal: PersistedInjuryAutoModal | null = null;
  private restoredPersistedInjuryAutoModals = false;
  private releaseQueuedAutoModalResumeHold: (() => void) | null = null;

  /**
   * : single gate for critical live-manager modals.
   * Substitution, Formation and Partido all pause/resume the live round,
   * so only one of them can be open at a time. Injury auto-modals queue
   * behind this gate instead of stacking over a manual modal.
   */
  private isCriticalLiveModalOpen = false;

  private readonly debugFreezeStorageKey = 'manager.deFreezeLiveRound';
  private readonly debugSuppressAutoInjuryStorageKey = 'manager.debugSuppressAutoInjuryModals';
  private readonly debugControlsStorageKey = 'manager.showRoundLiveDeControls';
  private readonly injuryAutoModalStoragePrefix = 'manager.pendingInjuryAutoModals.v1';
  readonly isLocalDebugHost = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  readonly showDebugControls = this.readDebugControlsFlag();
  debugFreezeEnabled = this.showDebugControls && this.readDebugFreezeFlag();
  debugSuppressAutoInjuryModals = this.showDebugControls && this.readDebugSuppressAutoInjuryFlag();
  private currentUserSessionTeamId: string | null = null;
  private debugFreezePauseInFlight = false;
  private debugFreezePausedRoundKeys = new Set<string>();
  private debugRoundLiveHook?: Window['managerDebugRoundLive'];

  /**
   * dedup set for rival RED_CARD awareness modals. Keyed
   * by `matchId|minute|playerId` so SSE reconnects don't re-trigger. Lives
   * independently of {@code autoModalShownEventIds} because the awareness
   * modal does not pause the round (different lifecycle).
   */
  private readonly rivalCardShownEventIds = new Set<string>();

  /**
   * separate guard for the rival card awareness modal.
   * Coexists with {@code isAutoModalOpen} because the two flows can fire
   * on the same tick (e.g. manager gets injury, rival gets sent off).
   */
  private isRivalCardModalOpen = false;
  private queuedRivalCardModal: {
    matchId: string;
    state: MatchState;
    playerName: string;
    minute: number;
  } | null = null;

  pendingLiveModalNotice: string | null = null;

  /**
   * : guard for the auto-start subscription so the
   * backend POST to {@code POST /api/v1/match-engine/rounds/start}
   * fires exactly once per component instance. Set to {@code true}
   * the moment the take(1) subscription observes the first vm$
   * emission that has NOT_STARTED matches  -  subsequent calls to
   * {@link tryAutoStartRound} short-circuit.
   *
   * <p>Why a flag (instead of just {@code take(1)}): the existing
   * {@link startRoundEngine} still calls {@code engineService.startRound}
   * (it has to, to wire the SSE stream post-POST). The flag prevents
   * the auto-start subscription AND {@code startRoundEngine} from
   * racing on a duplicate POST. {@code startRoundEngine} reads the
   * flag and skips its own POST when the auto-start already covered
   * the same round.
   */
  private autoStartTriggered = false;

  /**
   * : resolved roundId from the latest successful
   * {@code engineService.startRound(...)} POST response. The
   * backend registers the {@code RoundEngine} under THIS roundId  - 
   * not necessarily whatever string the request body sent (the
   * server may canonicalize to a real UUID, or the player's
   * careerId may not be a parseable UUID at the SSE endpoint).
   * Frontend code MUST subscribe to {@code streamRoundState(...)}
   * with the value carried here, NEVER with {@code gameId}.
   *
   * <ul>
   *   <li>Initialized to {@code null}; any of the three POST call
   *       sites ({@link tryAutoStartRound}, {@link startRoundEngine},
   *       {@link iniciarTodos}) push the response's
   *       {@code state.roundId} here as soon as the backend answers.</li>
   *   <li>The SSE subscription in {@link startRoundEngine} waits on
   *       this subject ({@code filter(id !== null), take(1)}) before
   *       opening the stream, so we never send a wrong roundId to
   *       {@code GET /api/v1/match-engine/rounds/{roundId}/stream}.</li>
   *   <li>Without this, {@code MatchEngineController:48} returns
   *       {@code Flux.empty()} because the registry has no entry for
   *       the frontend's {@code gameId}  -  silently idle SSE.</li>
   * </ul>
   */
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

  /**
   * : initial-round-load indicator. True while the
   * {@code combineLatest([routeParams$, teams$, careerStatus$, fixtures$])}
   * chain in the constructor is still resolving (i.e. the manager hit
   * /games/:gameId/round/:round and the round has not yet rendered).
   *
   * <p>Before this fix the round-live page rendered an empty
   * {@code .round-live-container} immediately because the
   * {@code vmSubject} initialized with an empty matches array  -  the user
   * saw a blank screen with no feedback while the four HTTP fetches
   * raced in. We now expose this flag (drel usuario by a BehaviorSubject that
   * the constructor flips to {@code false} on the first combineLatest
   * emission, success or error) and the template renders a centered
   * spinner until it clears.
   *
   * <p>Distinct from {@code vm.errorMsg}: errorMsg is set when the chain
   * emitted with a non-recoverable state (e.g. "No hay partidos para la
   * fecha N"). {@code loading$} tracks the network fetch itself, not the
   * result. After loading$ clears, the existing
   * {@code <div *ngIf="vm.errorMsg">} guard takes over.
   */
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {
    this.vm$ = this.vmSubject.asObservable();
    this.registerDeRoundLiveHook();
    setTimeout(() => this.registerDeRoundLiveHook(), 0);

    // : auto-start the round as soon as the first vm$
    // emission shows NOT_STARTED matches. This replaces the previous
    // UX where the manager had to click the "Iniciar Todos" button on
    // every round-live mount  -  under normal flow (no refresh, no SSE
    // gap) the round starts itself and the button stays hidden as a
    // fallback for refresh / failed-auto-start recovery.
    //
    // <p>Implementation:
    // <ul>
    //   <li>{@code take(1)} so the subscription fires exactly once per
    //       component instance  -  we only want the FIRST emission, the
    //       rest is drel usuario by SSE via {@link startRoundEngine}.</li>
    //   <li>{@code filter} skips the BehaviorSubject's initial empty-VM
    //       replay (which fires synchronously to new subscribers and
    //       would otherwise burn the take(1) before the real VM from
    //       combineLatest arrives).</li>
    //   <li>Filter accepts VMs that have matches OR an error message  - 
    //       both are real states worth observing (the errorMsg branch
    //       is the no-op path inside tryAutoStartRound).</li>
    //   <li>Delegate the actual startRound call to {@link tryAutoStartRound}
    //       so the flag logic is testable in isolation.</li>
    // </ul>
    //
    // <p>Order matters: this subscription must be set up BEFORE the
    // {@code combineLatest} tap below  -  the tap eventually calls
    // {@code vmSubject.next(...)} which fires synchronously to all
    // subscribers, and we want this listener registered first.
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
        // : clear the initial-load spinner on the first
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
        console.error('[ROUND] Error:', err);
        // : clear the spinner even on error so the empty/error
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

  private registerDeRoundLiveHook(): void {
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
      return { reason: 'No hay partido de usuario vivo para simular lesion propia en Partido.' };
    }

    const userTeamId = this.resolveManagerTeamId(userMatch, state);
    const managerIsAway = userTeamId === String(state.awayTeamId);
    const sourceSlots = managerIsAway ? (state.awaySlots ?? []) : (state.homeSlots ?? []);
    const normalizedSourceSlots = this.normalizeTacticalSlotSnapshotForDe(sourceSlots);
    const activeDebugPartidoEvents = (state.events ?? []).filter(event =>
      event.eventType === 'INJURY'
      && typeof event.description === 'string'
      && event.description.includes('DebugPartido:')
    );
    if (activeDebugPartidoEvents.length > 0) {
      return {
        reason: 'Ya hay una lesion debug de partido activa. Cerra/reabri o avanza a un estado limpio antes de crear otra.'
      };
    }
    if (!normalizedSourceSlots) {
      return {
        reason: 'El XI del usuario ya esta incompleto; no se simula otra lesion Partido para no crear huecos falsos.'
      };
    }

    const selectedSlot = normalizedSourceSlots
      .filter(slot => (slot.position || '').toUpperCase() !== 'GK')
      .find(slot => !playerId || String(slot.sessionPlayerId ?? slot.playerId ?? '') === playerId);
    const injuredPlayerId = String(selectedSlot?.sessionPlayerId ?? selectedSlot?.playerId ?? '');
    if (!selectedSlot || !injuredPlayerId) {
      return { reason: 'No hay jugador de campo del usuario para simular lesion propia en Partido.' };
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
      description: `DebugPartido: lesion propia para ${injuredPlayerId}`,
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

  private normalizeTacticalSlotSnapshotForDe<T extends { sessionPlayerId?: string | null; playerId?: string | null; slotIndex?: number | null }>(
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

    if (this.hasCompleteTacticalSlotSnapshot(slots)) {
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

  private hasCompleteTacticalSlotSnapshot(
    slots: Array<{ sessionPlayerId?: string | null; playerId?: string | null; slotIndex?: number | null }>
  ): boolean {
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

    return playerIds.size === 11
      && slotIndexes.size === 11
      && Array.from({ length: 11 }, (_, index) => index).every(index => slotIndexes.has(index));
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

  onDeDoubleInjury(): void {
    const result = this.debugTriggerUserInjuryModals();
    if (result.reason) {
      console.warn('[ROUND-LIVE] dedouble injury skipped:', result.reason);
    }
  }

  onDebugPartidoInjury(): void {
    const result = this.debugTriggerUserPartidoInjury();
    if (result.reason) {
      console.warn('[ROUND-LIVE] debugPartido injury skipped:', result.reason);
      this.pendingLiveModalNotice = result.reason;
      return;
    }
    this.pendingLiveModalNotice = 'Lesion debug de partido creada. Abrí Partido para validar AUTO + cambio manual.';
  }

  private startRoundEngine(gameId: string, matches: RoundMatchVM[]) {
    // : roundId is NOT a local alias for gameId anymore.
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

    // : the auto-start subscription above already calls
    // engineService.startRound once vm$ first emits with NOT_STARTED
    // matches. To avoid a duplicate POST to /match-engine/rounds/start
    // (which the backend may treat as a re-init, depending on the
    // RoundEngine implementation), we short-circuit here when the
    // auto-start already covered this round and skip directly to
    // opening the SSE stream.
    //
    // <p>If the auto-start did NOT fire (e.g. the VM emitted with all
    // matches already FINISHED, or with an error message), fall back
    // to the original startRound POST so the SSE still has a round to
    // subscribe to.
    //
    // <p>The union type is annotated explicitly because {@code of(null)}
    // and {@code engineService.startRound(...)} (which returns
    // {@code Observable<RoundState>}) produce incompatible types at the
    // TS level  -  TS infers {@code Observable<null> | Observable<RoundState>}
    // which has no common subscribe signature without the explicit
    // {@code Observable<RoundState | null>} annotation.
    //
    // <p>: the {@code tap} on the POST response captures
    // {@code state.roundId} into {@code resolvedRoundId$} so the SSE
    // subscription below uses the backend-resolved key, NOT
    // {@code requestRoundId}. When {@code autoStartTriggered} short-
    // circuits to {@code of(null)}, we rely on the matching tap in
    // {@link tryAutoStartRound} (which fires the POST that wins the
    // race) to populate {@code resolvedRoundId$}  -  the two paths
    // rendezvous on the same BehaviorSubject.
    const startRound$: Observable<RoundState | null> = this.autoStartTriggered
      ? of(null)
      : this.engineService.startRound(requestRoundId, matchData).pipe(
          tap(state => {
            if (state && state.roundId) {
              this.resolvedRoundId$.next(state.roundId);
            }
          })
        );

    // : the SSE stream subscribes with the
    // backend-resolved roundId from resolvedRoundId$, NOT with
    // requestRoundId. The filter wait is the why: tryAutoStartRound
    // runs the POST synchronously, but the POST response is async,
    // so {@code resolvedRoundId$} may not be populated yet at the
    // moment of(startRound$). We block on the first non-null emit
    // before opening the SSE stream.
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

        // #3: scan for new INJURY events on the manager team
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
        console.error('[ROUND] Error in SSE stream:', err);
      },
      complete: () => {
      }
    });
  }

  /**
   * #3: walk the latest per-match state, find INJURY events
   * that arrived since the last tick on the manager team, and open
   * the substitution modal pre-populated with the injured player.
   *
   * <p>Trigger rules:
   * <ul>
   *   <li>Event type === 'INJURY' (the chip-injury timeline event).</li>
   *   <li>Event has a {@code playerId} (legacy V23 events without
   *       playerId are skipped  -  no clean way to pre-select the
   *       visual pitch dot).</li>
   *   <li>Event team is the manager team (the modal would auto-suggest
   *       a swap on the wrong team, which is a no-op anyway).</li>
   *   <li>Match status is RUNNING or PAUSED (no auto-modal for finished
   *       / cancelled matches  -  too late).</li>
   *   <li>Event hasn't been shown before (tracked via
   *       {@code autoModalShownEventIds} so SSE reconnects don't
   *       re-trigger).</li>
   * </ul>
   *
   * <p>Concurrency: if a previous auto-modal is still open, the next
   * matching INJURY is queued (replaces any older queued entry  -  the
   * manager only sees the most recent injury when they finish the
   * current sub). When the active modal closes, the queued one fires
   * (if any).
   */
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

    for (const rm of matches) {
      if (!rm.state || !rm.state.events) {
        continue;
      }
      // Only the user match drives the auto-modal  -  injuries on the
      // rival are not actionable.
      const matchHomeId = String(rm.state.homeTeamId ?? '');
      const matchAwayId = String(rm.state.awayTeamId ?? '');
      const isUserMatch = (matchHomeId === userTeamIdStr) || (matchAwayId === userTeamIdStr);
      if (!isUserMatch) {
        continue;
      }
      // Skip if the match is finished / cancelled (replays of past
      // matches shouldn't auto-pop the modal).
      if (rm.state.status === 'FINISHED' || rm.state.status === 'CANCELLED') {
        continue;
      }

      for (const ev of rm.state.events) {
        if (!ev || ev.eventType !== 'INJURY') {
          continue;
        }
        if (!ev.playerId) {
          // No id  ->  can't pre-select the visual pitch dot. Skip.
          continue;
        }
        const eventTeamId = ev.teamId ? String(ev.teamId) : null;
        if (eventTeamId !== userTeamIdStr) {
          // Injury on the rival  -  not actionable for the manager.
          continue;
        }
        const eventId = `${rm.state.matchId}|${ev.minute}|${ev.playerId}`;
        if (this.autoModalShownEventIds.has(eventId)) {
          continue;
        }
        if (this.wasPlayerSubstitutedOffInState(rm.state, String(ev.playerId))) {
          // Reload/SSE snapshots keep historical INJURY events. If the
          // injured player already left the pitch, reopening the forced modal
          // creates an empty/ghost dialog instead of a useful decision.
          this.autoModalShownEventIds.add(eventId);
          continue;
        }
        // First-time-seen INJURY on the manager team.
        this.autoModalShownEventIds.add(eventId);
        this.queueOrOpenAutoModal({
          matchId: String(rm.state.matchId),
          state: rm.state,
          preSelectedPlayerId: ev.playerId
        });
      }
    }
  }

  /**
   * walk the latest state for the manager's own match,
   * find RED_CARD events whose {@code teamId} is the rival team, and
   * auto-open the awareness modal.
   *
   * <p>Trigger rules:
   * <ul>
   *   <li>Event type === 'RED_CARD' (yellow cards are intentionally
   *       skipped  -  not impactful enough to interrupt the manager).</li>
   *   <li>Only the user match is scanned. Red cards in other matches of
   *       the round must not interrupt the manager.</li>
   *   <li>Event has a {@code teamId} AND that teamId is NOT the user's
   *       team in this match. A red card on the manager team is already
   *       visible in their own timeline.</li>
   *   <li>Match status is RUNNING or PAUSED (no awareness for finished
   *       / cancelled matches).</li>
   *   <li>Event hasn't been shown before (tracked via
   *       {@code rivalCardShownEventIds} so SSE reconnects don't
   *       re-trigger).</li>
   * </ul>
   *
   * <p>Concurrency: shared pattern with maybeOpenInjuryAutoModal  -  if the
   * previous rival card modal is still open, the next matching RED_CARD
   * is queued (replaces any older queued entry). When the active modal
   * closes the queued one fires (if any).
   */
  private maybeOpenRivalCardInfoModal(matches: RoundMatchVM[]): void {
    const userMatch = matches.find(m => m.isUserMatch);
    const userTeamId = userMatch?.userTeamId ?? userMatch?.match.homeTeamId;
    const userTeamIdStr = userTeamId ? String(userTeamId) : null;
    if (!userTeamIdStr) {
      return;
    }

    for (const rm of userMatch ? [userMatch] : []) {
      if (!rm.state || !rm.state.events) {
        continue;
      }
      if (rm.state.status === 'FINISHED' || rm.state.status === 'CANCELLED') {
        continue;
      }
      for (const ev of rm.state.events) {
        if (!ev || ev.eventType !== 'RED_CARD') {
          continue;
        }
        const eventTeamId = ev.teamId ? String(ev.teamId) : null;
        // Skip when the event has no team attribution (can't tell if
        // it's the rival) or when the team IS the manager team (those
        // red cards aren't "rival" events).
        if (!eventTeamId || eventTeamId === userTeamIdStr) {
          continue;
        }
        const dedupKey = ev.playerId
          ? `${rm.state.matchId}|${ev.minute}|${ev.playerId}`
          : `${rm.state.matchId}|${ev.minute}|${eventTeamId}`;
        if (this.rivalCardShownEventIds.has(dedupKey)) {
          continue;
        }
        this.rivalCardShownEventIds.add(dedupKey);
        this.queueOrOpenRivalCardModal({
          matchId: String(rm.state.matchId),
          state: rm.state,
          playerName: ev.playerName || 'Jugador rival',
          minute: ev.minute
        });
        // Only the FIRST new rival red card per tick opens the modal,
        // same dedup pattern as maybeOpenInjuryAutoModal. Subsequent
        // rival red cards on the same tick are recorded but the
        // manager can dismiss or wait for the next tick.
        return;
      }
    }
  }

  /**
   * open the rival card awareness modal now, or queue
   * it if the previous awareness modal is still on screen. Replaces any
   * older queued entry.
   */
  private queueOrOpenRivalCardModal(payload: {
    matchId: string;
    state: MatchState;
    playerName: string;
    minute: number;
  }): void {
    if (payload.state.status === 'RUNNING') {
      this.queuedRivalCardModal = payload;
      this.updatePendingLiveModalNotice();
      return;
    }
    if (this.isRivalCardModalOpen || this.isCriticalLiveModalOpen) {
      this.queuedRivalCardModal = payload;
      this.updatePendingLiveModalNotice();
      return;
    }
    this.openRivalCardInfoModal(payload);
  }

  /**
   * actually open the rival card awareness dialog with
   * the player name + minute. Resets {@code isRivalCardModalOpen} when
   * the dialog closes (whether dismissed or auto-closed) and drains the
   * queue. Does NOT pause/resume the round  -  the modal is informational.
   */
  private openRivalCardInfoModal(payload: {
    matchId: string;
    state: MatchState;
    playerName: string;
    minute: number;
  }): void {
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
          console.error('[ROUND-LIVE] rival card awareness modal error', err);
          this.isRivalCardModalOpen = false;
          this.queuedRivalCardModal = null;
          this.updatePendingLiveModalNotice();
        }
      });
  }

  /**
   * #3: open the auto-modal now, or queue it if a previous
   * one is still on screen. Replaces any older queued entry (the
   * most recent injury is the most important).
   */
  private queueOrOpenAutoModal(payload: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }): void {
    if (this.isAutoModalOpen || this.isCriticalLiveModalOpen) {
      this.enqueueAutoModal(payload);
      this.updatePendingLiveModalNotice();
      return;
    }
    this.openInjuryAutoModal(payload);
  }

  private enqueueAutoModal(payload: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }): void {
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
   * : actually open the professional Partido modal with the
   * INJURY pre-select. The old substitution-only modal still exists as
   * a manual shortcut, but forced injuries now open the full DT surface
   * so the manager can replace the player, change formation and tune
   * pixels in one decision.
   */
  private openInjuryAutoModal(payload: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }): void {
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
          console.error('[ROUND-LIVE] injury auto-modal error', err);
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
      error: (err) => console.error('[ROUND-LIVE] pauseAll failed', err)
    });
  }

  toggleDeFreeze(): void {
    this.debugFreezeEnabled = !this.debugFreezeEnabled;
    try {
      localStorage.setItem(this.debugFreezeStorageKey, this.debugFreezeEnabled ? '1' : '0');
    } catch {
      // Non-fatal: the in-memory flag still works for this session.
    }

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

  toggleDeSuppressAutoInjuryModals(): void {
    this.debugSuppressAutoInjuryModals = !this.debugSuppressAutoInjuryModals;
    try {
      localStorage.setItem(
        this.debugSuppressAutoInjuryStorageKey,
        this.debugSuppressAutoInjuryModals ? '1' : '0'
      );
    } catch {
      // Non-fatal: the in-memory flag still works for this session.
    }

    if (this.debugSuppressAutoInjuryModals) {
      this.queuedAutoModals = [];
      this.updatePendingLiveModalNotice();
    }
  }

  private readDebugFreezeFlag(): boolean {
    try {
      return localStorage.getItem(this.debugFreezeStorageKey) === '1';
    } catch {
      return false;
    }
  }

  private readDebugSuppressAutoInjuryFlag(): boolean {
    try {
      return localStorage.getItem(this.debugSuppressAutoInjuryStorageKey) === '1';
    } catch {
      return false;
    }
  }

  private readDebugControlsFlag(): boolean {
    try {
      return this.isLocalDebugHost && localStorage.getItem(this.debugControlsStorageKey) === '1';
    } catch {
      return false;
    }
  }

  private applyDeFreezeIfNeeded(vm: RoundLiveViewModel, force = false): void {
    if (!this.debugFreezeEnabled || vm.allFinished || (!force && vm.isRoundPaused) || this.debugFreezePauseInFlight) {
      return;
    }

    const anchorMatch = this.findRoundControlAnchorMatch(vm);
    if (!anchorMatch || !anchorMatch.state || this.isTerminalState(anchorMatch.state.status)) {
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
      error: (err) => console.error('[ROUND-LIVE] debug freeze pause failed', err),
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
      error: (err) => console.error('[ROUND-LIVE] resumeAll failed', err)
    });
  }

  /**
   * Header pause/resume controls operate on the whole RoundEngine, not on
   * individual MatchEngines. The backend helper only needs one matchId from
   * the active round to resolve the real roundId, so prefer the user's match
   * and fall back to any non-terminal match.
   */
  private findRoundControlAnchorMatch(vm: RoundLiveViewModel): RoundMatchVM | null {
    return vm.matches.find(rm => rm.isUserMatch && !this.isTerminalState(rm.state?.status))
      ?? vm.matches.find(rm => !this.isTerminalState(rm.state?.status))
      ?? null;
  }

  private isTerminalState(status: string | undefined): boolean {
    return status === 'FINISHED' || status === 'CANCELLED';
  }

  /**
   * Defensive UI guard for live streams that reach 90' but keep reporting
   * RUNNING for one or more ticks. The backend should ideally emit FINISHED;
   * this keeps the manager flow from getting visually stuck on "En Juego".
   */
  private normalizeTerminalLiveState(state: MatchState): MatchState {
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

  /**
   * UX fix: explicit "Iniciar Todos" trigger for the
   * round-live header. Used as a fallback when the auto-start in
   * {@code startRoundEngine} did not visibly transition the matches
   * (e.g. backend POST succeeded but the SSE is silent, or the
   * auto-start was never wired for the current navigation path).
   *
   * <p>Behavior:
   * <ul>
   *   <li>Filters VM matches to those without state OR with state.status
   *       {@code NOT_STARTED}. Matches already RUNNING / FINISHED / etc.
   *       are skipped  -  re-sending them would be wasteful (and could
   *       trip backend idempotency checks depending on the route).</li>
   *   <li>If the filtered list is empty (every match already started),
   *       the method is a no-op and does not hit the backend.</li>
   *   <li>Otherwise, calls {@code engineService.startRound(roundId,
   *       matches)} with the filtered list. The roundId reuses the
   *       existing {@code gameId} convention from {@code startRoundEngine}
   *       (career-scoped identifier for this round in the backend).</li>
   * </ul>
   *
   * <p>Logs the response on success and the error on failure. The SSE
   * stream (already open from {@code startRoundEngine}) will pick up
   * the resulting match state transitions and the {@code anyStarted}
   * flag will flip to {@code true}, hiding this button automatically.
   */
  iniciarTodos(): void {
    const vm = this.vmSubject.value;
    const pending = vm.matches
      .filter(rm => !rm.state || rm.state?.status === 'NOT_STARTED')
      .map(rm => ({
        matchId: String(rm.match.id),
        homeTeamId: String(rm.match.homeTeamId),
        awayTeamId: String(rm.match.awayTeamId)
      }));

    if (pending.length === 0) {
      // No NOT_STARTED matches left  -  button should already be hidden via
      // the *ngIf="!vm.anyStarted" guard, but guard defensively here.
      return;
    }

    const roundId = vm.gameId;
    this.engineService.startRound(roundId, pending).subscribe({
      next: (state) => {
        // : capture the backend-resolved roundId so any
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
        console.error('[ROUND-LIVE] Iniciar Todos failed', err);
      }
    });
  }

  /**
   * : auto-start the round once the first vm$ emission
   * has NOT_STARTED matches. Triggered by the take(1) subscription
   * in the constructor  -  the explicit "Iniciar Todos" button in the
   * header remains as a manual fallback for refresh / recovery cases
   * where the auto-start POST was rejected by the backend.
   *
   * <p>Behavior:
   * <ul>
   *   <li>Sets {@code autoStartTriggered} to {@code true} immediately
   *       so duplicate calls (e.g. from {@link startRoundEngine}) can
   *       short-circuit and skip their own POST.</li>
   *   <li>No-ops on error/empty VMs (the round can't be started
   *       without matches).</li>
   *   <li>No-ops when no match has status {@code NOT_STARTED}  -  the
   *       round already started ticking (covers the refresh case
   *       where the backend round is RUNNING but the frontend VM was
   *       rebuilt from scratch).</li>
   *   <li>Otherwise POSTs to {@code /match-engine/rounds/start} with
   *       the pending matches. The SSE stream (opened by
   *       {@link startRoundEngine} after this method runs) will pick
   *       up the resulting state transitions and flip
   *       {@code vm.anyStarted} to {@code true}, hiding the fallback
   *       button automatically.</li>
   * </ul>
   *
   * <p>This is the primary auto-start path in The
   * {@link iniciarTodos} method is its manual twin.
   */
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

    const pending = vm.matches
      .filter(rm => !rm.state || rm.state?.status === 'NOT_STARTED')
      .map(rm => ({
        matchId: String(rm.match.id),
        homeTeamId: String(rm.match.homeTeamId),
        awayTeamId: String(rm.match.awayTeamId)
      }));

    if (pending.length === 0) {
      // All matches already started (e.g. user refreshed an in-flight
      // round). Nothing to POST  -  the SSE stream from
      // startRoundEngine will catch up via polling/SSE reconnect.
      return;
    }

    this.engineService.startRound(vm.gameId, pending).subscribe({
      next: (state) => {
        // : capture the backend-resolved roundId so the
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
        // : a failed auto-start leaves the round stuck on
        // NOT_STARTED. The "Iniciar Todos" button stays visible (no
        // anyStarted flip) and the manager can re-trigger manually.
        console.error('[ROUND-LIVE] Auto-start failed; user can retry with Iniciar Todos', err);
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

  // ========== FE6: sub/formation shortcuts on user match card ==========

  /**
   * FE6: open the substitution modal for the user match. Called from the
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
          console.error('[ROUND-LIVE] openSubstitutionModal error', err);
        }
      });
  }

  /**
   * FE6: open the formation modal for the user match. Called from the
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
          console.error('[ROUND-LIVE] openFormationModal error', err);
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
   * : de/QA injury modals can exist only in component memory
   * (e.g. `Test doble lesion` queues two forced-substitution dialogs without
   * creating backend INJURY events). If the page reloads while one is open or
   * queued, that obligation must not disappear. Persist only ids, then rebuild
   * against the latest live MatchState after the SSE stream reconnects.
   */
  private persistInjuryAutoModals(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const active = this.activeInjuryAutoModal ? [this.activeInjuryAutoModal] : [];
    const queued = this.queuedAutoModals.map(payload => ({
      matchId: payload.matchId,
      preSelectedPlayerId: payload.preSelectedPlayerId
    }));
    const payload = {
      active,
      queued
    };
    const key = this.injuryAutoModalStorageKey();
    if (active.length === 0 && queued.length === 0) {
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

    let parsed: {
      active?: PersistedInjuryAutoModal[];
      queued?: PersistedInjuryAutoModal[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(key);
      return;
    }

    const items = [
      ...(parsed.active ?? []),
      ...(parsed.queued ?? [])
    ].filter(item => !!item?.matchId && !!item?.preSelectedPlayerId);

    sessionStorage.removeItem(key);
    if (items.length === 0) {
      return;
    }

    for (const item of items) {
      const match = matches.find(candidate => String(candidate.state?.matchId ?? candidate.match.id) === item.matchId);
      const state = match?.state;
      if (!state || state.status === 'FINISHED' || state.status === 'CANCELLED') {
        continue;
      }
      if (this.wasPlayerSubstitutedOffInState(state, item.preSelectedPlayerId)) {
        continue;
      }
      this.queueOrOpenAutoModal({
        matchId: item.matchId,
        state,
        preSelectedPlayerId: item.preSelectedPlayerId
      });
    }
    this.persistInjuryAutoModals();
  }

  private injuryAutoModalStorageKey(): string {
    const vm = this.vmSubject.value;
    return `${this.injuryAutoModalStoragePrefix}:${vm.gameId}:${vm.roundNumber}`;
  }

  private wasPlayerSubstitutedOffInState(state: MatchState, playerId: string): boolean {
    return (state.events ?? []).some(event =>
      event.eventType === 'SUBSTITUTION'
      && String(event.playerId ?? '') === playerId
    );
  }

  /**
   * : one drain point for auto-modals waiting behind a
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
    if (this.queuedAutoModals.length > 0) {
      const suffix = this.queuedAutoModals.length > 1 ? ` (${this.queuedAutoModals.length})` : '';
      this.pendingLiveModalNotice = `Evento pendiente: lesión propia${suffix}. Al cerrar el modal actual se abrirá Sustitución.`;
      return;
    }
    if (this.queuedRivalCardModal) {
      this.pendingLiveModalNotice = this.isCriticalLiveModalOpen
        ? 'Evento pendiente: roja rival. Al cerrar el modal actual verás el aviso táctico.'
        : 'Evento pendiente: roja rival. Pausá el partido o abrí Partido para revisarlo sin cortar el juego.';
      return;
    }
    this.pendingLiveModalNotice = null;
  }

  /**
   * : queued injury modals are revalidated just before
   * opening. Example: two injuries arrive, the second waits in queue, but
   * the manager already substituted that second injured player from the
   * first/manual modal. In that case the queued modal would be noise, so we
   * silently drop it. If the player still needs attention, the modal opens.
   */
  private openQueuedInjuryAutoModalIfStillNeeded(payload: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }): void {
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
   * : after the live formation modal confirms, update the
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

  /**
   * : open the Partido modal (dual-tab: Mi Formacion editable +
   * Formacion Rival read-only) for the user match. Called from the
   * match-card's (partidoOpen) output. Delegates to
   * {@link LiveMatchModalsService.openPartidoModal} which handles
   * pause/resume round + dialog opening.
   *
   * <p>: passes the {@code teamNameMap} (sourced from
   * {@code CareerService.getCareerTeams} in the constructor) to the
   * modal as the 3rd parameter, so the stats section shows readable
   * team names ("REAL MADRID 55% | 45% BARCELONA") instead of raw
   * sessionTeamIds. The modal's stats derivation falls back to the
   * teamIds if these are missing  -  passing them is cosmetic, not
   * required for correctness.
   */
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
          console.error('[ROUND-LIVE] openPartidoModal error', err);
        }
      });
  }

  getTeamName(teamId: any, teamNameMap: { [id: string]: string } | null): string {
    const id = String(teamId);
    return teamNameMap?.[id] || id.substring(0, 8);
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'NOT_STARTED': 'Por Iniciar',
      'RUNNING': 'En Juego',
      'PAUSED': 'Pausado',
      'FINISHED': 'Finalizado',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  getEventIcon(eventType: string): string {
    const iconMap: { [key: string]: string } = {
      'GOAL': '⚽', 'CARD': '🟨', 'INJURY': '🚑', 'SUBSTITUTION': '🔄'
    };
    return iconMap[eventType] || '📋';
  }

  getLastEvents(events: any[], count: number): any[] {
    return events.slice(-count).reverse();
  }

  // UX-5: separar el partido del user del resto en la grilla
  get userMatch(): RoundMatchVM | null {
    return this.vmSubject.value.matches.find(m => m.isUserMatch) || null;
  }

  get otherMatches(): RoundMatchVM[] {
    return this.vmSubject.value.matches.filter(m => !m.isUserMatch);
  }

  private mapFixtureStatus(fixtureStatus: string): 'SCHEDULED' | 'SIMULATED' | 'CANCELLED' {
    // also accept live state statuses (NOT_STARTED /
    // RUNNING / PAUSED / FINISHED) so SSE-drel usuario updates of rm.match.status
    // correctly flip SCHEDULED  ->  SIMULATED when the match ends.
    switch (fixtureStatus) {
      case 'PENDING': case 'SIMULATING':
      case 'NOT_STARTED': case 'RUNNING': case 'PAUSED':
        return 'SCHEDULED';
      case 'COMPLETED': case 'FINISHED':
        return 'SIMULATED';
      case 'CANCELLED':
        return 'CANCELLED';
      default: return 'SCHEDULED';
    }
  }

  goToRoundSummary() {
    const vm = this.vmSubject.value;
    this.router.navigate([`/games/${vm.gameId}/round/${vm.roundNumber}/summary`]);
  }
}
