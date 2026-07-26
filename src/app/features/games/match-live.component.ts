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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, pairwise, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { MatchState, MatchEvent, StreamHealth, TeamStyle } from '../../core/services/match-engine.model';
import { CareerService } from '../../core/services/career.service';
import { environment } from '../../environments/environment';
import { LiveTimelineComponent } from './components/live-timeline/live-timeline.component';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { ConfirmActionDialogComponent } from '../../shared/components/confirm-action-dialog/confirm-action-dialog.component';

/**
 * Live match view.
 *
 * Shows the scoreboard, possession, timeline, stream health, and manager
 * actions for an in-progress match.
 */
@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, MatDialogModule, LiveTimelineComponent],
  templateUrl: './match-live.component.html',
  styleUrls: ['./match-live.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchLiveComponent implements OnInit, OnDestroy {

  private engineService = inject(MatchEngineService);
  private careerService = inject(CareerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private modals = inject(LiveMatchModalsService);
  private dialog = inject(MatDialog);

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
    // Route parameters and round-level state are resolved separately so this
    // view can subscribe to the current round stream and extract its match.
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.gameId = params.get('gameId') || '';
        this.matchId = params.get('matchId') || '';

        if (!this.matchId || !this.gameId) {
          this.errorMsgSubject.next('ID de partido o juego inválido');
          return;
        }

        // Team-name lookup for the header and goal toasts.
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
            error: () => this.teamNameMapSubject.next({})
          });

        // Resolve the round this match belongs to and subscribe to the
        // round-level stream. Each emission carries all match states; this
        // view filters the one requested by the route.
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
            error: () => {
              this.errorMsgSubject.next(
                'No se puede cargar el partido. Es posible que ya haya finalizado o que aún no haya comenzado.'
              );
            }
          });

        // Goal detection runs on the filtered match state so the snackbar
        // only reacts to goals from this match.
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

  // Shows a snack-bar only for goals that were not present in the previous event list.
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
    const ref = this.dialog.open<ConfirmActionDialogComponent, any, boolean>(ConfirmActionDialogComponent, {
      data: {
        title: 'Cancelar partido',
        message: 'El partido se detendrá ahora. Usalo sólo si querés cortar esta simulación.',
        confirmLabel: 'Cancelar partido',
        cancelLabel: 'Seguir jugando',
        tone: 'warning'
      },
      maxWidth: '92vw',
      panelClass: 'confirm-action-dialog-pane'
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.engineService.stopEngine(this.matchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(s => this.matchStateSubject.next(s));
    });
  }

  /**
   * Change the manager team's tactical style mid-match.
   */
  changeStyle(style: TeamStyle): void {
    this.engineService.changeStyle(this.matchId, style)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            // The SSE tick will update s.homeStyle on the next emission;
            // we don't need to manually push to matchStateSubject.
          } else {
            this.snackBar.open(result.error || 'No se pudo cambiar la táctica', 'OK', { duration: 3000 });
          }
        },
        error: () => {
          this.snackBar.open('Error al cambiar la táctica', 'OK', { duration: 3000 });
        }
      });
  }

  // ========== F3.3 — substitution + formation modals (delegated to LiveMatchModalsService) ==========

  /**
   * Open the substitution modal through the shared live-match modal service.
   */
  openSubstitutionModal(state: MatchState): void {
    this.modals.openSubstitutionModal(this.matchId, state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => {
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
        error: () => {
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
