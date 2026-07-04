import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { CareerService } from '../../core/services/career.service';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { Match } from '../../shared/models/match.model';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, takeUntil, catchError, shareReplay } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';
import { MatchState } from '../../core/services/match-engine.model';

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
   * V25D81-BUG #3: track INJURY events that have already auto-opened
   * the substitution modal. Keyed by `matchId|minute|playerId` so the
   * same injury fired twice across SSE reconnects doesn't re-trigger
   * the modal. Cleared on round restart (the user navigates away and
   * back, so the component is recreated).
   */
  private readonly autoModalShownEventIds = new Set<string>();

  /**
   * V25D81-BUG #3: guard against overlapping auto-modals. When an INJURY
   * fires while the previous INJURY modal is still open, the second
   * event is queued (so the manager sees it next) instead of stacking
   * multiple dialogs on top of each other.
   */
  private isAutoModalOpen = false;
  private queuedAutoModal: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  } | null = null;

  /**
   * V25D81.1 BUG #3: dedup set for rival RED_CARD awareness modals. Keyed
   * by `matchId|minute|playerId` so SSE reconnects don't re-trigger. Lives
   * independently of {@code autoModalShownEventIds} because the awareness
   * modal does not pause the round (different lifecycle).
   */
  private readonly rivalCardShownEventIds = new Set<string>();

  /**
   * V25D81.1 BUG #3: separate guard for the rival card awareness modal.
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

  private vmSubject = new BehaviorSubject<RoundLiveViewModel>({
    gameId: '',
    roundNumber: 1,
    matches: [],
    teamNameMap: {},
    allFinished: false,
    errorMsg: '',
    isRoundPaused: false,
    byeTeam: null, // UX-6: BYE indicator
    anyStarted: false // V25D82 sprint 2 UX fix: drives "Iniciar Todos" button visibility
  });

  vm$: Observable<RoundLiveViewModel>;

  /**
   * V25D83 sprint: initial-round-load indicator. True while the
   * {@code combineLatest([routeParams$, teams$, careerStatus$, fixtures$])}
   * chain in the constructor is still resolving (i.e. the manager hit
   * /games/:gameId/round/:round and the round has not yet rendered).
   *
   * <p>Before this fix the round-live page rendered an empty
   * {@code .round-live-container} immediately because the
   * {@code vmSubject} initialized with an empty matches array — the user
   * saw a blank screen with no feedback while the four HTTP fetches
   * raced in. We now expose this flag (driven by a BehaviorSubject that
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
        // V25D83 sprint: clear the initial-load spinner on the first
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
        const fixtures = fixturesData.matches;
        const byeTeam: string | null = fixturesData.byeTeam ?? null;

        if (fixtures.length === 0) {
          this.updateVm({
            gameId: params.gameId,
            roundNumber: params.roundNumber,
            matches: [],
            teamNameMap: teamMap,
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
            isUserMatch: homeId === userSessionTeamId || awayId === userSessionTeamId
          };
        });

        this.updateVm({
          gameId: params.gameId,
          roundNumber: params.roundNumber,
          matches,
          teamNameMap: teamMap,
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
        // V25D83 sprint: clear the spinner even on error so the empty/error
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVm(vm: RoundLiveViewModel) {
    this.vmSubject.next(vm);
  }

  private startRoundEngine(gameId: string, matches: RoundMatchVM[]) {
    const roundId = gameId;
    const matchData = matches.map(rm => ({
      matchId: String(rm.match.id),
      homeTeamId: String(rm.match.homeTeamId),
      awayTeamId: String(rm.match.awayTeamId)
    }));

    this.engineService.startRound(roundId, matchData).pipe(
      switchMap(() => this.engineService.streamRoundState(roundId)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (roundState) => {
        const currentVm = this.vmSubject.value;
        const updatedMatches = currentVm.matches.map(rm => {
          const matchState = roundState.matches.find(ms =>
            String(ms.matchId) === String(rm.match.id)
          );
          // V24D14-LIVE-FIX-1.7 Bug #2: propagate the live state status into the
          // embedded Match.status so post-FINISHED snapshots don't show stale
          // "En Juego" — mapFixtureStatus now handles both fixture statuses
          // (PENDING/SIMULATING/COMPLETED/CANCELLED) and live state statuses
          // (NOT_STARTED/RUNNING/PAUSED/FINISHED/CANCELLED).
          const match = matchState
            ? { ...rm.match, status: this.mapFixtureStatus(matchState.status) }
            : rm.match;
          return {
            ...rm,
            match,
            state: matchState
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
          // V25D82 sprint 2 UX fix: true if at least one match has
          // transitioned past NOT_STARTED. Drives the "Iniciar Todos"
          // button visibility (button hides once the round has started
          // ticking). Note: MatchState.status uses 'RUNNING' (not
          // 'IN_PROGRESS' — that's the RoundState.status value).
          anyStarted: updatedMatches.some(m =>
            m.state?.status === 'RUNNING' ||
            m.state?.status === 'HALF_TIME' ||
            m.state?.status === 'PAUSED' ||
            m.state?.status === 'FINISHED' ||
            m.state?.status === 'CANCELLED'
          )
        };

        this.updateVm(newVm);

        // V25D81-BUG #3: scan for new INJURY events on the manager team
        // and auto-open the substitution modal. Runs AFTER the VM is
        // updated so the modal receives the latest matchState (with
        // currentMinute + playerRatings already populated by the SSE
        // tick).
        this.maybeOpenInjuryAutoModal(updatedMatches);
        // V25D81.1 BUG #3: scan ALL matches (user + rival) for RED_CARD
        // events on a non-user team and auto-open the awareness modal.
        // Same pattern as the injury flow but the modal is informational
        // only — no pre-select, no round pause.
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
   * V25D81-BUG #3: walk the latest per-match state, find INJURY events
   * that arrived since the last tick on the manager team, and open
   * the substitution modal pre-populated with the injured player.
   *
   * <p>Trigger rules:
   * <ul>
   *   <li>Event type === 'INJURY' (the chip-injury timeline event).</li>
   *   <li>Event has a {@code playerId} (legacy V23 events without
   *       playerId are skipped — no clean way to pre-select the
   *       visual pitch dot).</li>
   *   <li>Event team is the manager team (the modal would auto-suggest
   *       a swap on the wrong team, which is a no-op anyway).</li>
   *   <li>Match status is RUNNING or PAUSED (no auto-modal for finished
   *       / cancelled matches — too late).</li>
   *   <li>Event hasn't been shown before (tracked via
   *       {@code autoModalShownEventIds} so SSE reconnects don't
   *       re-trigger).</li>
   * </ul>
   *
   * <p>Concurrency: if a previous auto-modal is still open, the next
   * matching INJURY is queued (replaces any older queued entry — the
   * manager only sees the most recent injury when they finish the
   * current sub). When the active modal closes, the queued one fires
   * (if any).
   */
  private maybeOpenInjuryAutoModal(matches: RoundMatchVM[]): void {
    const userTeamId = this.vmSubject.value.matches.find(m => m.isUserMatch)?.match.homeTeamId;
    const userTeamIdStr = userTeamId ? String(userTeamId) : null;
    if (!userTeamIdStr) {
      return;
    }

    for (const rm of matches) {
      if (!rm.state || !rm.state.events) {
        continue;
      }
      // Only the user match drives the auto-modal — injuries on the
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
          // No id → can't pre-select the visual pitch dot. Skip.
          continue;
        }
        const eventTeamId = ev.teamId ? String(ev.teamId) : null;
        if (eventTeamId !== userTeamIdStr) {
          // Injury on the rival — not actionable for the manager.
          continue;
        }
        const eventId = `${rm.state.matchId}|${ev.minute}|${ev.playerId}`;
        if (this.autoModalShownEventIds.has(eventId)) {
          continue;
        }
        // First-time-seen INJURY on the manager team.
        this.autoModalShownEventIds.add(eventId);
        this.queueOrOpenAutoModal({
          matchId: String(rm.state.matchId),
          state: rm.state,
          preSelectedPlayerId: ev.playerId
        });
        // Only the FIRST new injury on this tick opens a modal — we
        // don't want to stack 3 dialogs if 3 players got hurt on the
        // same action. Subsequent injuries are still recorded in
        // autoModalShownEventIds, so the manager can manually open
        // the modal via the "Sustituir" button on the next tick if
        // they need to handle a second injury.
        return;
      }
    }
  }

  /**
   * V25D81.1 BUG #3: walk the latest per-match state, find RED_CARD
   * events whose {@code teamId} is NOT the manager team (i.e. the rival
   * or any team in a non-user match), and auto-open the awareness modal.
   *
   * <p>Trigger rules:
   * <ul>
   *   <li>Event type === 'RED_CARD' (yellow cards are intentionally
   *       skipped — not impactful enough to interrupt the manager).</li>
   *   <li>Event has a {@code teamId} AND that teamId is NOT the user
   *       team. A red card on the manager team is irrelevant for the
   *       awareness flow (the manager already sees their own match's
   *       timeline; auto-sub flow is owned by maybeOpenInjuryAutoModal).</li>
   *   <li>Match status is RUNNING or PAUSED (no awareness for finished
   *       / cancelled matches).</li>
   *   <li>Event hasn't been shown before (tracked via
   *       {@code rivalCardShownEventIds} so SSE reconnects don't
   *       re-trigger).</li>
   * </ul>
   *
   * <p>Concurrency: shared pattern with maybeOpenInjuryAutoModal — if the
   * previous rival card modal is still open, the next matching RED_CARD
   * is queued (replaces any older queued entry). When the active modal
   * closes the queued one fires (if any).
   */
  private maybeOpenRivalCardInfoModal(matches: RoundMatchVM[]): void {
    const userTeamId = this.vmSubject.value.matches.find(m => m.isUserMatch)?.match.homeTeamId;
    const userTeamIdStr = userTeamId ? String(userTeamId) : null;
    if (!userTeamIdStr) {
      return;
    }

    for (const rm of matches) {
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
   * V25D81.1 BUG #3: open the rival card awareness modal now, or queue
   * it if the previous awareness modal is still on screen. Replaces any
   * older queued entry.
   */
  private queueOrOpenRivalCardModal(payload: {
    matchId: string;
    state: MatchState;
    playerName: string;
    minute: number;
  }): void {
    if (this.isRivalCardModalOpen) {
      this.queuedRivalCardModal = payload;
      return;
    }
    this.openRivalCardInfoModal(payload);
  }

  /**
   * V25D81.1 BUG #3: actually open the rival card awareness dialog with
   * the player name + minute. Resets {@code isRivalCardModalOpen} when
   * the dialog closes (whether dismissed or auto-closed) and drains the
   * queue. Does NOT pause/resume the round — the modal is informational.
   */
  private openRivalCardInfoModal(payload: {
    matchId: string;
    state: MatchState;
    playerName: string;
    minute: number;
  }): void {
    this.isRivalCardModalOpen = true;
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
        }
      });
  }

  /**
   * V25D81-BUG #3: open the auto-modal now, or queue it if a previous
   * one is still on screen. Replaces any older queued entry (the
   * most recent injury is the most important).
   */
  private queueOrOpenAutoModal(payload: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }): void {
    if (this.isAutoModalOpen) {
      this.queuedAutoModal = payload;
      return;
    }
    this.openInjuryAutoModal(payload);
  }

  /**
   * V25D81-BUG #3: actually open the substitution modal with the
   * INJURY pre-select. Resets {@code isAutoModalOpen} when the modal
   * closes (whether confirmed or cancelled) and drains the queue.
   */
  private openInjuryAutoModal(payload: {
    matchId: string;
    state: MatchState;
    preSelectedPlayerId: string;
  }): void {
    this.isAutoModalOpen = true;
    this.modals.openSubstitutionModal(payload.matchId, payload.state, {
      preSelectedPlayerId: payload.preSelectedPlayerId,
      reason: 'INJURY_FORCED_SUBSTITUTION'
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Modal closed (confirmed or cancelled). Reset flag + drain
          // the queue.
          this.isAutoModalOpen = false;
          const queued = this.queuedAutoModal;
          this.queuedAutoModal = null;
          if (queued) {
            // Defer to the next macrotask so the dialog close
            // animation finishes before a new dialog opens (avoids
            // a visual stutter on the backdrop).
            setTimeout(() => this.openInjuryAutoModal(queued), 0);
          }
        },
        error: (err) => {
          console.error('[ROUND-LIVE] injury auto-modal error', err);
          this.isAutoModalOpen = false;
          this.queuedAutoModal = null;
        }
      });
  }

  pauseAll() {
    const matches = this.vmSubject.value.matches;
    matches.forEach(rm => {
      const matchId = String(rm.match.id);
      if (rm.state?.status === 'RUNNING') {
        this.engineService.pauseEngine(matchId).subscribe();
      }
    });
    this.updateVm({ ...this.vmSubject.value, isRoundPaused: true });
  }

  resumeAll() {
    const vm = this.vmSubject.value;
    if (!vm.isRoundPaused) {
      return;
    }
    const matches = vm.matches;
    matches.forEach(rm => {
      const matchId = String(rm.match.id);
      if (rm.state?.status !== 'FINISHED' && rm.state?.status !== 'CANCELLED') {
        this.engineService.resumeEngine(matchId).subscribe();
      }
    });
    this.updateVm({ ...vm, isRoundPaused: false });
  }

  /**
   * V25D82 sprint 2 UX fix: explicit "Iniciar Todos" trigger for the
   * round-live header. Used as a fallback when the auto-start in
   * {@code startRoundEngine} did not visibly transition the matches
   * (e.g. backend POST succeeded but the SSE is silent, or the
   * auto-start was never wired for the current navigation path).
   *
   * <p>Behavior:
   * <ul>
   *   <li>Filters VM matches to those without state OR with state.status
   *       {@code NOT_STARTED}. Matches already RUNNING / FINISHED / etc.
   *       are skipped — re-sending them would be wasteful (and could
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
      // No NOT_STARTED matches left — button should already be hidden via
      // the *ngIf="!vm.anyStarted" guard, but guard defensively here.
      return;
    }

    const roundId = vm.gameId;
    this.engineService.startRound(roundId, pending).subscribe({
      next: (state) => {
        console.log('[ROUND-LIVE] all matches started via Iniciar Todos', state);
      },
      error: (err) => {
        console.error('[ROUND-LIVE] Iniciar Todos failed', err);
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

  // ========== LIVE-MATCH-F3-UI-LIVE FE6: sub/formation shortcuts on user match card ==========

  /**
   * FE6: open the substitution modal for the user match. Called from the
   * match-card's (substitutionOpen) output. The actual lineup/squad fetch
   * + dialog opening is delegated to {@link LiveMatchModalsService}.
   */
  onSubstitutionOpen(match: Match, state: MatchState | undefined): void {
    if (!state) {
      return;
    }
    this.modals.openSubstitutionModal(String(match.id), state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('[ROUND-LIVE] openSubstitutionModal error', err)
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
    this.modals.openFormationModal(String(match.id), state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('[ROUND-LIVE] openFormationModal error', err)
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

  // V24D11 UX-5: separar el partido del user del resto en la grilla
  get userMatch(): RoundMatchVM | null {
    return this.vmSubject.value.matches.find(m => m.isUserMatch) || null;
  }

  get otherMatches(): RoundMatchVM[] {
    return this.vmSubject.value.matches.filter(m => !m.isUserMatch);
  }

  private mapFixtureStatus(fixtureStatus: string): 'SCHEDULED' | 'SIMULATED' | 'CANCELLED' {
    // V24D14-LIVE-FIX-1.7 Bug #2: also accept live state statuses (NOT_STARTED /
    // RUNNING / PAUSED / FINISHED) so SSE-driven updates of rm.match.status
    // correctly flip SCHEDULED → SIMULATED when the match ends.
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
