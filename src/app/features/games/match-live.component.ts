import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, pairwise, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { MatchState, MatchEvent, StreamHealth, TeamStyle } from '../../core/services/match-engine.model';
import { CareerService } from '../../core/services/career.service';
import { environment } from '../../environments/environment';
import { LiveTimelineComponent } from './components/live-timeline/live-timeline.component';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';

/**
 * LIVE-MATCH-F3-UI-LIVE FE2 (partial): live match view.
 *
 * <p>FE2 changes (this PR):
 * <ul>
 *   <li>OnPush + async pipe everywhere — the previous default-CD assignment
 *       (`this.matchState = state` 60×/min) was a saturation risk.</li>
 *   <li>Barra de posesión con dos flex divs (home/away) + label numérico.</li>
 *   <li>Score grande animado con {@code @keyframes scoreFlash} via Angular
 *       Animations (FE2 uses CSS keyframes for the flash effect).</li>
 *   <li>Indicador de salud SSE (punto verde/amarillo/rojo) vía
 *       {@code engineService.streamHealth$}.</li>
 *   <li>Toast de goal con {@code MatSnackBar} disparado en {@code pairwise()}.</li>
 *   <li>Reemplazo del {@code .event-list} plano por el componente nuevo
 *       {@code <app-live-timeline>} (FE3).</li>
 * </ul>
 *
 * <p>FE3 backlog (covered in F3.3, NOT this PR):
 * <ul>
 *   <li>Botón "Sustituir" que abre {@code <app-substitution-modal>}.</li>
 *   <li>Botón "Cambiar Formación" que abre {@code <app-formation-modal>}.</li>
 * </ul>
 */
@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, LiveTimelineComponent],
  templateUrl: './match-live.component.html',
  styleUrls: ['./match-live.component.css'],
  // LIVE-MATCH-F3-UI-LIVE FE2: OnPush + async pipe
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchLiveComponent implements OnInit, OnDestroy {

  private engineService = inject(MatchEngineService);
  private careerService = inject(CareerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private modals = inject(LiveMatchModalsService);

  matchId: string = '';
  gameId: string = '';

  /** BehaviorSubject-driven state — async-pipe consumers re-render only on emit. */
  private matchStateSubject = new BehaviorSubject<MatchState | null>(null);
  readonly matchState$ = this.matchStateSubject.asObservable();

  private errorMsgSubject = new BehaviorSubject<string>('');
  readonly errorMsg$ = this.errorMsgSubject.asObservable();

  private teamNameMapSubject = new BehaviorSubject<{ [id: string]: string }>({});
  readonly teamNameMap$ = this.teamNameMapSubject.asObservable();

  /** Last seen goal count by team — used by the goal-toast `pairwise()` detector. */
  private lastGoalCountByTeam = new Map<string, number>();

  /** Health of the SSE stream (FE1). */
  readonly streamHealth$ = this.engineService.streamHealth$;

  /** Whether to use SSE (mirrors the environment flag — used by the template). */
  readonly useSse = environment.useSse;

  /** Destroy signal — all subscriptions `takeUntil(destroy$)`. */
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // BUG_F5.4_MATCH_LIVE_BLANK fix: route param resolution + per-match state
    // stream are decoupled. MatchLiveComponent now connects to the RoundEngine
    // V24 SSE (already running in back since V24D6M11) instead of three legacy
    // per-match endpoints (`GET /matches/{matchId}`, `POST /matches/{matchId}/start`,
    // `GET /matches/{matchId}/stream`) which no longer exist on the backend.
    // Reference: round-level endpoints are documented in
    // `MatchEngineController.java:42` (stream) and `:156` (roundId lookup).
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.gameId = params.get('gameId') || '';
        this.matchId = params.get('matchId') || '';

        if (!this.matchId || !this.gameId) {
          this.errorMsgSubject.next('ID de partido o juego inválido');
          return;
        }

        // (1) Team-name lookup — unchanged from prior F5.4 wire. Pure HTTP GET,
        // feeds the `teamNameMap` consumed by the template header + goal toasts.
        this.careerService.getCareerTeams(this.gameId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (teams) => {
              const map: { [id: string]: string } = {};
              teams.forEach(team => {
                const teamId = team.sessionTeamId
                  || (typeof team.id === 'object' && 'value' in team.id
                      ? (team.id as any).value
                      : String(team.id));
                map[teamId] = team.name;
              });
              this.teamNameMapSubject.next(map);
            },
            error: (err) => console.error('[MATCH-LIVE] teams error', err)
          });

        // (2) State stream — resolve the round this match belongs to (cached
        // helper, TTL 5min via `getRoundIdForMatch`) and subscribe to the
        // round-level SSE. Each emission carries the full `RoundState` with
        // `matches: MatchState[]`; we filter for OUR matchId and push the
        // resulting `MatchState` into `matchStateSubject`. The template's
        // `*ngIf="matchState$ | async as state"` then renders the scoreboard,
        // possession bar, timeline and 5 F5.4 buttons.
        //
        // Decision B5: the engine only exposes round-level SSE, so the legacy
        // `useSse` polling branch is no longer reachable. We force SSE round
        // here and log a one-shot warning if the env flag is off, but never
        // route to a non-existent per-match polling path.
        if (!environment.useSse) {
          console.warn('[MATCH-LIVE] environment.useSse is false; forcing round-level SSE — per-match polling endpoint was removed in V24D6M11.');
        }

        this.engineService.getRoundIdForMatch(this.matchId)
          .pipe(
            switchMap(roundId => this.engineService.streamRoundState(roundId)),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (roundState) => {
              const myMatch = roundState.matches.find(m => m.matchId === this.matchId);
              if (myMatch) {
                this.matchStateSubject.next(myMatch);
              }
              // If the round is still warming up and our match hasn't emitted
              // yet, `*ngIf` stays in its "Cargando..." state until the next
              // tick carries our matchId — this is the desired UX.
            },
            error: (err) => {
              // Decision B4: clear, non-breaking error message. We do NOT
              // redirect or tear down the layout — the template renders the
              // banner next to the scoreboard area instead of replacing it.
              this.errorMsgSubject.next(
                'No se puede cargar el partido. Es posible que ya haya finalizado o que aún no haya comenzado.'
              );
              console.error('[MATCH-LIVE] Error loading match state:', err);
            }
          });

        // (3) Goal-detection pipe — preserved verbatim from the deleted
        // `startSseStream` private method so the goal snackbar still fires
        // when a GOAL event appears in the round SSE for our match. Runs on
        // `matchState$` so it sees exactly the post-filter MatchState we
        // pushed above.
        this.matchState$
          .pipe(
            map(s => s?.events ?? []),
            startWith<MatchEvent[]>([]),
            pairwise(),
            takeUntil(this.destroy$)
          )
          .subscribe(([prev, next]) => {
            this.detectNewGoals(prev, next);
          });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Compares the new event list with the previous one and triggers a
   * {@code MatSnackBar} for every goal that wasn't present before.
   */
  private detectNewGoals(prev: MatchEvent[], next: MatchEvent[]) {
    const nextGoals = next.filter(e => (e.eventType || '').toUpperCase() === 'GOAL');
    if (nextGoals.length === 0) {
      return;
    }
    // Build a set of (minute, scorer) seen before.
    const prevKeys = new Set(prev
      .filter(e => (e.eventType || '').toUpperCase() === 'GOAL')
      .map(e => `${e.minute}|${e.playerName || e.description || ''}`));
    for (const g of nextGoals) {
      const key = `${g.minute}|${g.playerName || g.description || ''}`;
      if (prevKeys.has(key)) {
        continue;
      }
      const teamName = (g.teamId && this.teamNameMapSubject.value[g.teamId]) || '';
      this.snackBar.open(
        `⚽ ¡GOL${teamName ? ' de ' + teamName : ''}! ${g.playerName || ''}`.trim(),
        'Ver',
        { duration: 5000, panelClass: 'goal-toast' }
      );
    }
  }

  pauseMatch() {
    this.engineService.pauseEngine(this.matchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => this.matchStateSubject.next(s));
  }

  resumeMatch() {
    this.engineService.resumeEngine(this.matchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => this.matchStateSubject.next(s));
  }

  stopMatch() {
    if (confirm('¿Estás seguro de que quieres cancelar el partido?')) {
      this.engineService.stopEngine(this.matchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(s => this.matchStateSubject.next(s));
    }
  }

  /**
   * LIVE-MATCH-F5.4: change the manager's home team tactical style mid-match.
   * Wires to {@code POST /api/v1/match-engine/matches/{matchId}/style} via
   * {@link MatchEngineService.changeStyle}.
   *
   * <p>Only the home team is editable. The rival (away) block was removed
   * from the template because the back does not support rival changes in F5.
   * The new style is reflected on the next SSE tick via {@code s.homeStyle}.
   *
   * <p>Replaces the legacy {@code changeTactic('HOME'|'AWAY', 'ATTACK'|'DEFEND'|'BALANCED')}
   * method which called the pre-V24 {@code sendCommand('CHANGE_TACTIC', ...)}
   * path and did NOT trigger the new {@code TeamStyle}-aware engine effects.
   */
  changeStyle(style: TeamStyle): void {
    this.engineService.changeStyle(this.matchId, style)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            // The SSE tick will update s.homeStyle on the next emission;
            // we don't need to manually push to matchStateSubject.
            console.log(`[MATCH-LIVE] [F5.4] Style changed to ${result.currentStyle} at minute ${result.minuteApplied}`);
          } else {
            this.snackBar.open(result.error || 'No se pudo cambiar la táctica', 'OK', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('[MATCH-LIVE] [F5.4] changeStyle error', err);
          this.snackBar.open('Error al cambiar la táctica', 'OK', { duration: 3000 });
        }
      });
  }

  // ========== F3.3 — substitution + formation modals (delegated to LiveMatchModalsService) ==========

  /**
   * FE4: open the substitution modal. The actual lineup/squad fetch + dialog
   * opening is centralized in {@link LiveMatchModalsService} so the same
   * flow is reusable from the round-live view (FE6).
   */
  openSubstitutionModal(state: MatchState): void {
    this.modals.openSubstitutionModal(this.matchId, state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => {
          console.error('[MATCH-LIVE] openSubstitutionModal error', err);
          this.snackBar.open('No se pudo abrir la sustitución', 'OK', { duration: 3000 });
        }
      });
  }

  /**
   * FE5: open the formation-change modal. Delegates to
   * {@link LiveMatchModalsService}.
   */
  openFormationModal(state: MatchState): void {
    this.modals.openFormationModal(this.matchId, state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => {
          console.error('[MATCH-LIVE] openFormationModal error', err);
          this.snackBar.open('No se pudo abrir el cambio de formación', 'OK', { duration: 3000 });
        }
      });
  }

  // ===== Template helpers (pure functions) =====

  getStatusText(status: string): string {
    const map: { [k: string]: string } = {
      'NOT_STARTED': 'No Iniciado',
      'RUNNING':     'En Progreso',
      'PAUSED':      'Pausado',
      'HALF_TIME':   'Descanso',
      'FINISHED':    'Finalizado',
      'CANCELLED':   'Cancelado'
    };
    return map[status] || status;
  }

  /** Returns a textual hint for the SSE health (used as a tooltip). */
  healthTooltip(h: StreamHealth): string {
    switch (h) {
      case 'HEALTHY':      return 'Conexión en vivo OK';
      case 'RECONNECTING': return 'Reconectando…';
      case 'DEGRADED':     return 'Conexión con lag';
      case 'CLOSED':       return 'Conexión cerrada — reintentar';
    }
  }

  /** Returns the home possession flex percentage (CSS-friendly). */
  homePossessionPct(s: MatchState): number {
    return s.homePossession ?? 50;
  }

  /** Returns the away possession flex percentage (CSS-friendly). */
  awayPossessionPct(s: MatchState): number {
    return s.awayPossession ?? 50;
  }
}
