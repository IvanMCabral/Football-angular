import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';
import { TeamService } from '../teams/services/team.service';
import { MatchService } from '../matches/services/match.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../environments/environment';
import { SessionPlayer } from '../../shared/models/player.model';
import { PromotionsDialogComponent } from '../../components/promotions-dialog/promotions-dialog.component';
import { PromotionResult } from '../../core/services/career.model';
import { UserInfo } from '../../shared/models/auth.model';
import { ConfirmActionDialogComponent } from '../../shared/components/confirm-action-dialog/confirm-action-dialog.component';
import { readableErrorMessage } from '../../shared/utils/error-message';
import { WorldCatalogService } from '../../core/services/world-catalog.service';
import { CareerService } from '../../core/services/career.service';
import { beginMatchStartTrace, markMatchStartPointerEvent, markMatchStartStage, setMatchStartTraceMetadata } from '../games/match-start-trace';
import { buildRoundStartNavigationState } from '../games/round-start-navigation-state';

interface UserStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winPercentage: number;
}

interface WorldStatus {
  clubs: number;
  players: number;
  matches: number;
}

interface CareerStatus {
  careerId: string | null;
  userSessionTeamId: string | null;
  currentRound: number;
  totalRounds: number;
  isFinished: boolean;
  careerPhase: string | null;
  season: number;
  userDivision?: string | null;
  promotionsAvailable?: boolean;
}

interface AdvanceRoundResponse {
  success: boolean;
  message?: string;
  currentRound?: number;
  careerPhase?: string | null;
  tournamentFinished?: boolean;
}

type ConfirmDialogData = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'danger' | 'warning';
};

interface RecentActivity {
  message: string;
  timestamp: Date;
  type: 'player' | 'team' | 'match' | 'squad';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDialogModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private teamService = inject(TeamService);
  private matchService = inject(MatchService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);
  private catalogService = inject(WorldCatalogService);
  private careerService = inject(CareerService);

  private careerStatusSubject = new BehaviorSubject<CareerStatus | null | undefined>(undefined);
  careerStatus$ = this.careerStatusSubject.asObservable();

  private lastSeenPhase: string | null = null;
  private lastSeenSeason: number | null = null;

  private squadSubject = new BehaviorSubject<SessionPlayer[]>([]);
  squad$ = this.squadSubject.asObservable();

  user$?: Observable<UserInfo | null>;

  displayNameOf(info: { displayName?: string | null; email?: string; username?: string } | null | undefined): string {
    if (!info) return 'manager';
    const dn = (info.displayName ?? '').trim();
    if (dn) return dn;
    if (info.email) return info.email;
    return info.username ?? 'manager';
  }
  userStats$?: Observable<UserStats>;
  worldStatus$?: Observable<WorldStatus>;
  recentActivities: RecentActivity[] = [];

  loading = false;
  generatingPlayers = false;

  playNextRoundLabel(status: CareerStatus | null | undefined): string {
    if (!status) return 'Jugar Próxima Fecha';
    // currentRound is the canonical pending round. The backend advances it
    // exactly once after a finished match-day, so adding one here displayed
    // Fecha 4 immediately after Fecha 2 had completed.
    const currentRound = status.currentRound ?? 1;
    const totalRounds = status.totalRounds ?? 0;
    const seasonComplete = currentRound > totalRounds
      || (currentRound === totalRounds
        && (!status.careerPhase || status.careerPhase === 'WAITING_USER'));
    if (seasonComplete) {
      const nextSeason = (status.season ?? 1) + 1;
      return `Continuar Temporada ${nextSeason}`;
    }
    if (status.careerPhase === 'LIVE' || status.careerPhase === 'IN_MATCH') {
      return `Continuar Fecha ${currentRound}`;
    }
    return `Jugar Fecha ${currentRound}`;
  }

  playNextRoundSubtitle(status: CareerStatus | null | undefined): string {
    if (!status) return 'Confirmar para iniciar';
    const currentRound = status.currentRound ?? 1;
    const totalRounds = status.totalRounds ?? 0;
    const seasonComplete = currentRound > totalRounds
      || (currentRound === totalRounds
        && (!status.careerPhase || status.careerPhase === 'WAITING_USER'));
    if (seasonComplete) {
      return 'Temporada finalizada, ver resultados';
    }
    if (status.careerPhase === 'LIVE' || status.careerPhase === 'IN_MATCH') {
      return 'Partido en curso';
    }
    return 'Confirmar para iniciar';
  }


  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadCareerStatus(forceRefresh = true): void {
    if (forceRefresh) {
      this.careerService.invalidateCareerStatus();
    }
    this.careerService.getCareerStatus().pipe(
      map(status => {
        if (status && status.careerId) {
          return {
            careerId: status.careerId,
            userSessionTeamId: status.userSessionTeamId || null,
            currentRound: status.currentRound || 1,
            totalRounds: status.totalRounds || 38,
            isFinished: status.careerPhase === 'FINISHED',
            careerPhase: status.careerPhase || 'PRE_MATCH',
            season: status.season || 1,
            userDivision: status.userDivision ?? null,
            promotionsAvailable: status.promotionsAvailable === true
          } as CareerStatus;
        }
        return null;
      }),
      catchError(err => {
        return of(null);
      })
    ).subscribe(status => {
    this.careerStatusSubject.next(status);

      if (status?.currentRound) {
        // Warm the exact pending-round snapshot while the manager is reading
        // the dashboard. The live route reuses this keyed request if it is
        // still within its short TTL.
        this.careerService.prefetchFixturesForRound(status.currentRound).subscribe({ error: () => undefined });
      }

      const phase = status?.careerPhase ?? null;
      const season = status?.season ?? 0;
      if (this.lastSeenPhase !== null) {
        const phaseChanged = phase !== this.lastSeenPhase;
        const seasonChanged = season !== this.lastSeenSeason;
        if (phaseChanged || seasonChanged) {
          this.loadSquadData();
          this.refreshUserStats();
          this.refreshWorldStatus();
        }
      }
      this.lastSeenPhase = phase;
      this.lastSeenSeason = season;

      if (status && status.promotionsAvailable && status.careerId) {
        this.maybeShowPromotionsDialog(status.careerId);
      }
    });
  }

  private maybeShowPromotionsDialog(careerId: string): void {
    const lastViewedSeasonKey = `c55.phase4.viewedSeason.${careerId}`;
    const lastViewedSeason = Number(localStorage.getItem(lastViewedSeasonKey) || '0');
    const currentSeasonRaw = this.careerStatusSubject.value?.season ?? 0;
    const currentSeason = typeof currentSeasonRaw === 'number' ? currentSeasonRaw : 0;

    if (lastViewedSeason >= currentSeason && currentSeason > 0) {
      return; // already shown for this season
    }

    this.http.get<PromotionResult[]>(`${environment.apiUrl}/career/promotions`).subscribe({
      next: (promotions) => {
        if (!promotions || promotions.length === 0) {
          return;
        }
        this.dialog.open(PromotionsDialogComponent, {
          data: { promotions },
          width: '450px',
          maxWidth: '90vw'
        }).afterClosed().subscribe(() => {
          localStorage.setItem(lastViewedSeasonKey, String(currentSeason));
        });
      },
      error: () => {
        // Silent: if /promotions fails we don't want to spam the user.
        // The next dashboard load will retry.
      }
    });
  }

  private refreshCareerStatus(): void {
    this.loadCareerStatus(false);
  }

  tierCssClass(userDivision: string | null | undefined): string {
    if (userDivision === 'PRIMERA') return 'tier-primera';
    if (userDivision === 'SEGUNDA') return 'tier-segunda';
    if (userDivision === 'TERCERA') return 'tier-tercera';
    return 'tier-default';
  }

  private loadSquadData(): void {
    this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
      catchError(err => {
        return of([]);
      })
    ).subscribe(players => {
      this.squadSubject.next(players);
    });
  }

  private getSquadPlayers(): SessionPlayer[] {
    return this.squadSubject.value;
  }

  private isSuspended(p: SessionPlayer): boolean {
    return p.suspended === true || (p.suspensionRemainingMatches ?? 0) > 0;
  }

  suspendedCount(): number {
    return this.getSquadPlayers().filter(p => this.isSuspended(p)).length;
  }

  injuredCount(): number {
    return this.getSquadPlayers().filter(p => p.injured === true && !this.isSuspended(p)).length;
  }

  exhaustedCount(): number {
    return this.getSquadPlayers().filter(p =>
      !this.isSuspended(p) && p.injured !== true && (p.energy ?? 100) <= 19
    ).length;
  }

  veryTiredCount(): number {
    return this.getSquadPlayers().filter(p => {
      const e = p.energy ?? 100;
      return !this.isSuspended(p) && p.injured !== true && e >= 20 && e <= 39;
    }).length;
  }

  hasSquadConditionWarning(): boolean {
    return this.suspendedCount() > 0 || this.injuredCount() > 0 || this.exhaustedCount() > 0 || this.veryTiredCount() > 0;
  }

  squadConditionWarningText(): string {
    const parts: string[] = [];
    const suspended = this.suspendedCount();
    const injured = this.injuredCount();
    const exhausted = this.exhaustedCount();
    const veryTired = this.veryTiredCount();

    if (suspended > 0) {
      parts.push(`${suspended} ${suspended > 1 ? 'jugadores suspendidos' : 'jugador suspendido'}`);
    }
    if (injured > 0) {
      parts.push(`${injured} ${injured > 1 ? 'jugadores lesionados' : 'jugador lesionado'}`);
    }
    if (exhausted > 0) {
      parts.push(`${exhausted} ${exhausted > 1 ? 'jugadores agotados' : 'jugador agotado'}`);
    }
    if (veryTired > 0) {
      parts.push(`${veryTired} ${veryTired > 1 ? 'jugadores muy cansados' : 'jugador muy cansado'}`);
    }

    return parts.join(' · ');
  }

  loadDashboardData(): void {
    // Warm only reusable league metadata; dashboard rendering remains
    // independent and usable if the catalog endpoint is unavailable.
    this.catalogService.prefetch();
    this.user$ = this.authService.getUserInfo().pipe(
      catchError(err => {
        return of(null);
      }),
      shareReplay(1)
    );

    this.loadCareerStatus();

    this.loadSquadData();

    this.refreshUserStats();

    this.refreshWorldStatus();
  }

  private refreshUserStats(): void {
    this.userStats$ = this.http.get<UserStats>(`${environment.apiUrl}/dashboard/user-stats`).pipe(
      shareReplay(1),
      catchError(err => {
        return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      })
    );
  }

  private refreshWorldStatus(): void {
    this.worldStatus$ = this.http.get<WorldStatus>(`${environment.apiUrl}/dashboard/world-status`).pipe(
      shareReplay(1),
      catchError(err => {
        return of({ clubs: 0, players: 0, matches: 0 });
      })
    );
  }
  onPlayNow(): void {
    this.router.navigate(['/career/setup']);
  }

  onMatchStartPointerEvent(): void {
    markMatchStartPointerEvent();
  }

  onContinueCareer(): void {
    this.router.navigate(['/squad']);
  }

  onPlayNextRound(): void {
    beginMatchStartTrace();
    markMatchStartStage('CLICK_HANDLER_ENTER');
    markMatchStartStage('T1_HANDLER_STARTED');
    this.loading = true;
    markMatchStartStage('START_GUARD_COMPLETE');
    markMatchStartStage('PAYLOAD_BUILD_START');

    const snapshot = this.careerService.getCareerStatusSnapshot();
    const currentStatus = snapshot
      ? ({ ...snapshot.value, isFinished: snapshot.value.careerPhase === 'FINISHED' } as CareerStatus)
      : this.careerStatusSubject.value ?? null;
    setMatchStartTraceMetadata({
      statusSnapshotAvailableAtClick: !!snapshot,
      statusSnapshotAgeMs: snapshot ? Math.max(0, Date.now() - snapshot.receivedAt) : null,
      statusHttpTriggeredByClick: false,
      fixtureSnapshotAvailableAtClick: !!currentStatus?.currentRound
        && !!this.careerService.getFixtureSnapshot?.(currentStatus.currentRound),
      startPayloadReadyMs: 0
    });
    markMatchStartStage('PAYLOAD_BUILD_END');
    markMatchStartStage('T2_LOCAL_VALIDATION_DONE');

    if (!currentStatus?.careerId) {
      this.loading = false;
      setMatchStartTraceMetadata({
        statusHttpTriggeredByClick: true,
        statusInvalidationReason: 'cache-miss-fallback'
      });
      this.careerService.getCareerStatus().subscribe({
        next: refreshed => {
          this.careerStatusSubject.next({
            ...refreshed,
            isFinished: refreshed.careerPhase === 'FINISHED'
          } as CareerStatus);
          this.toastService.error('Career state refreshed. Try starting the date again.');
        },
        error: () => this.toastService.error('Career state is unavailable.')
      });
      return;
    }

    const advance$ = this.careerService.advanceToNextRound(currentStatus.careerId);
    markMatchStartStage('HTTP_OBSERVABLE_CREATED');
    markMatchStartStage('HTTP_SUBSCRIBE_START');
    markMatchStartStage('FETCH_XHR_DISPATCH');
    advance$.subscribe({
      next: response => {
        markMatchStartStage('POST_RESPONSE');
        this.loading = false;
        if (response.success) {
          const careerId = currentStatus.careerId!;
          if (response.currentRound && response.careerPhase === 'PRE_MATCH') {
            const navigationStatus = {
              careerId,
              currentRound: response.currentRound,
              totalRounds: currentStatus.totalRounds,
              userSessionTeamId: currentStatus.userSessionTeamId,
              careerPhase: response.careerPhase,
              season: currentStatus.season,
              userDivision: currentStatus.userDivision
            };
            markMatchStartStage('T11_NAVIGATION_REQUESTED');
            this.router.navigate(
              [`/games/${careerId}/round/${response.currentRound}/live`],
              { state: buildRoundStartNavigationState(navigationStatus, response.currentRound, careerId) }
            );
          } else if (response.tournamentFinished) {
            this.router.navigate([`/games/${careerId}/champion`]);
          } else {
            this.router.navigate(['/squad']);
          }
          this.refreshCareerStatus();
          return;
        }

        setMatchStartTraceMetadata({ statusInvalidationReason: 'start-command-rejected' });
        this.toastService.error('Error: ' + response.message);
        this.refreshCareerStatus();
      },
      error: err => {
        this.loading = false;
        setMatchStartTraceMetadata({
          statusInvalidationReason: 'start-command-error',
          backendValidationFailureCode: err?.error?.code ?? err?.status ?? null
        });
        this.toastService.error('Could not advance: ' + readableErrorMessage(err));
        this.refreshCareerStatus();
      }
    });
  }

  canPlayNextRound(status: CareerStatus | null): boolean {
    return status !== null &&
           status.careerPhase === 'WAITING_USER' &&
           !status.isFinished;
  }

  onDeleteCareer(): void {
    const ref = this.dialog.open<ConfirmActionDialogComponent, ConfirmDialogData, boolean>(ConfirmActionDialogComponent, {
      data: {
        title: 'Borrar carrera',
        message: 'Esta acción borra tu carrera actual y no se puede deshacer.',
        confirmLabel: 'Borrar carrera',
        cancelLabel: 'Volver',
        tone: 'danger'
      },
      maxWidth: '92vw',
      panelClass: 'confirm-action-dialog-pane'
    });

    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.http.delete(`${environment.apiUrl}/career/reset`).subscribe({
        next: () => {
          this.refreshCareerStatus();
        },
        error: () => {
          this.toastService.error('No se pudo borrar la carrera. Probá de nuevo.');
        }
      });
    });
  }

  onGenerateRandomPlayers(): void {
    if (this.generatingPlayers) return;

    this.generatingPlayers = true;
    const count = 10;

    this.http.post(`${environment.apiUrl}/career/random-players`, { count }).subscribe({
      next: () => {
        this.generatingPlayers = false;
        this.toastService.success(`✨ ${count} jugadores generados correctamente`);
        this.worldStatus$ = this.http.get<WorldStatus>(`${environment.apiUrl}/dashboard/world-status`).pipe(
          shareReplay(1),
          catchError(err => of({ clubs: 0, players: 0, matches: 0 }))
        );
      },
      error: (err) => {
        this.generatingPlayers = false;
      this.toastService.error('No se pudieron generar jugadores: ' + readableErrorMessage(err));
      }
    });
  }
}
