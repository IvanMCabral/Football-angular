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
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { map, pairwise, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { MatchState, MatchEvent, StreamHealth, TeamStyle } from '../../core/services/match-engine.model';
import { CareerService } from '../../core/services/career.service';
import { MatchService } from '../matches/services/match.service';
import { Match } from '../../shared/models/match.model';
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
  private matchService = inject(MatchService);
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
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.gameId = params.get('gameId') || '';
        this.matchId = params.get('matchId') || '';

        if (!this.matchId || !this.gameId) {
          this.errorMsgSubject.next('ID de partido o juego inválido');
          return;
        }

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

        this.matchService.getMatch(this.matchId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (match: Match) => this.startEngine(match),
            error: (err) => {
              this.errorMsgSubject.next('No se pudo cargar el partido');
              console.error('[MATCH-LIVE] Error loading match:', err);
            }
          });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startEngine(match: Match) {
    const homeTeamId = typeof match.homeTeamId === 'object' && 'value' in match.homeTeamId
      ? (match.homeTeamId as any).value
      : String(match.homeTeamId);
    const awayTeamId = typeof match.awayTeamId === 'object' && 'value' in match.awayTeamId
      ? (match.awayTeamId as any).value
      : String(match.awayTeamId);

    this.engineService.startEngine(this.matchId, homeTeamId, awayTeamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.startPolling(),
        error: (err) => {
          this.errorMsgSubject.next('No se pudo iniciar el motor del partido');
          console.error('[MATCH-LIVE] Error starting engine:', err);
        }
      });
  }

  private startPolling() {
    if (environment.useSse) {
      this.startSseStream();
    } else {
      this.startPollingInterval();
    }
  }

  private startSseStream() {
    this.engineService.streamMatchState(this.matchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state: MatchState) => {
          this.matchStateSubject.next(state);
          if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
            // Cleanup happens via destroy$ when the component leaves.
          }
        },
        error: (err) => {
          console.error('[MATCH-LIVE] SSE stream error (will be retried by service):', err);
          // FE1: do NOT set errorMsg here. The service handles reconnect
          // via streamHealth$; the UI shows the red dot, not an error
          // banner that nukes the whole view.
        }
      });

    // FE2: subscribe to events + pairwise to detect new goals and trigger
    // a snackbar.
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

  private startPollingInterval() {
    interval(1000)
      .pipe(
        switchMap(() => {
          const state = this.matchStateSubject.value;
          if (state?.status === 'RUNNING') {
            return this.engineService.getMatchState(this.matchId);
          }
          return [];
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (state: MatchState) => {
          if (state) {
            this.matchStateSubject.next(state);
            if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
              // stop handled by state checks in switchMap
            }
          }
        },
        error: (err) => console.error('[MATCH-LIVE] Error polling state:', err)
      });
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
