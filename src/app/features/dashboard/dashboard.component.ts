
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, of, firstValueFrom, BehaviorSubject } from 'rxjs';
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
    const nextRound = (status.currentRound ?? 0) + 1;
    const totalRounds = status.totalRounds ?? 0;
    if (nextRound > totalRounds) {
      const nextSeason = (status.season ?? 1) + 1;
      return `Continuar Temporada ${nextSeason}`;
    }
    return `Jugar Fecha ${nextRound}`;
  }

  playNextRoundSubtitle(status: CareerStatus | null | undefined): string {
    if (!status) return 'Confirmar para iniciar';
    const nextRound = (status.currentRound ?? 0) + 1;
    const totalRounds = status.totalRounds ?? 0;
    if (nextRound > totalRounds) {
      return 'Temporada finalizada, ver resultados';
    }
    return 'Confirmar para iniciar';
  }


  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadCareerStatus(): void {
    this.http.get<any>(`${environment.apiUrl}/career/status`).pipe(
      map(status => {
        if (status && status.careerId) {
          return {
            careerId: status.careerId,
            userSessionTeamId: status.userSessionTeamId || null,
            currentRound: status.currentRound || 1,
            totalRounds: status.totalRounds || 38,
            isFinished: status.isFinished || false,
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
    this.loadCareerStatus();
  }

  /**
   * C55.10 Item 1 — tier-real badge: map the {@code careerStatus.userDivision}
   * label (whatever the backend sends) to a CSS class that styles the pill.
   *
   * <p>The backend now sends the literal display label
   * (PRIMERA, SEGUNDA, TERCERA, CUARTA, QUINTA, SEXTA, …) instead of an enum
   * ID. The front CONSUMES that label directly (no remapping) but needs a
   * visual style for every possible tier. {@link tierCssClass} returns:
   * <ul>
   *   <li>{@code 'tier-primera'} for {@code 'PRIMERA'}</li>
   *   <li>{@code 'tier-segunda'} for {@code 'SEGUNDA'}</li>
   *   <li>{@code 'tier-tercera'} for {@code 'TERCERA'}</li>
   *   <li>{@code 'tier-default'} for any other tier (CUARTA, QUINTA, …) or
   *       null/undefined — neutral gray-indigo gradient so the pill is still
   *       legible.</li>
   * </ul>
   * Used by the dashboard {@code .user-division-pill} for parity with the
   * standings page (same component pattern, same CSS contract).
   */
  tierCssClass(userDivision: string | null | undefined): string {
    if (userDivision === 'PRIMERA') return 'tier-primera';
    if (userDivision === 'SEGUNDA') return 'tier-segunda';
    if (userDivision === 'TERCERA') return 'tier-tercera';
    return 'tier-default';
  }

  /**
   * Load squad data for condition warnings (V24D6G5A)
   */
  private loadSquadData(): void {
    this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
      catchError(err => {
        return of([]);
      })
    ).subscribe(players => {
      this.squadSubject.next(players);
    });
  }

  // V24D6G5A — Squad condition warning helpers
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
    // Exclude suspended players (suspended takes priority over injured)
    return this.getSquadPlayers().filter(p => p.injured === true && !this.isSuspended(p)).length;
  }

  exhaustedCount(): number {
    // Exclude suspended and injured players (injury takes priority)
    return this.getSquadPlayers().filter(p =>
      !this.isSuspended(p) && p.injured !== true && (p.energy ?? 100) <= 19
    ).length;
  }

  veryTiredCount(): number {
    // Exclude suspended and injured from very tired count
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
    // V25D78-C55.7.7 BUG-L1: emit the full user info so the welcome banner
    // can pick displayName → email → username via displayNameOf().
    this.user$ = this.authService.getUserInfo().pipe(
      catchError(err => {
        return of(null);
      }),
      shareReplay(1)
    );

    // Cargar career status y emitir al BehaviorSubject
    this.loadCareerStatus();

    // Load squad data for condition warnings
    this.loadSquadData();

    this.refreshUserStats();

    // Inicializar Observables (async pipe se encarga del subscribe)
    this.refreshWorldStatus();
  }

  /**
   * C55.10 Item 2 — re-issue {@code /dashboard/user-stats}. Reassigns the
   * {@link userStats$} field so any {@code (userStats$ | async)} consumer
   * re-subscribes to the new (still cold) Observable. Safe to call
   * multiple times; used by the (careerPhase, season) change handler in
   * {@link loadCareerStatus}.
   */
  private refreshUserStats(): void {
    this.userStats$ = this.http.get<UserStats>(`${environment.apiUrl}/dashboard/user-stats`).pipe(
      shareReplay(1),
      catchError(err => {
        return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      })
    );
  }

  /**
   * C55.10 Item 2 — re-issue {@code /dashboard/world-status}. Mirrors
   * {@link refreshUserStats}: same pattern, independent HTTP call so a
   * transient failure on one doesn't block the other.
   */
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

  onContinueCareer(): void {
    this.router.navigate(['/squad']);
  }

  onPlayNextRound(): void {
    this.loading = true;

    firstValueFrom(this.careerStatus$).then(status => {
      if (!status?.careerId) {
        this.loading = false;
        this.toastService.error('No se encontró la carrera');
        return;
      }

      this.http.post<any>(`${environment.apiUrl}/career/${status.careerId}/next-round`, {}).subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success) {
            this.toastService.success('📅 ' + response.message);

            const careerId = status.careerId!;

            if (response.currentRound && response.careerPhase === 'PRE_MATCH') {
              this.router.navigate([`/games/${careerId}/round/${response.currentRound}/live`]);
            } else if (response.tournamentFinished) {
              this.router.navigate([`/games/${careerId}/champion`]);
            } else {
              this.router.navigate(['/squad']);
            }

            this.refreshCareerStatus();
          } else {
            this.toastService.error('Error: ' + response.message);
          }
        },
        error: (err) => {
          this.loading = false;
          const errorMsg = err.error?.message || err.message || 'Error desconocido';
          this.toastService.error('No se pudo avanzar: ' + errorMsg);
        }
      });
    }).catch(err => {
      this.loading = false;
      this.toastService.error('Error al obtener estado de carrera');
    });
  }

  canPlayNextRound(status: CareerStatus | null): boolean {
    return status !== null &&
           status.careerPhase === 'WAITING_USER' &&
           !status.isFinished;
  }

  onDeleteCareer(): void {
    const ref = this.dialog.open<ConfirmActionDialogComponent, any, boolean>(ConfirmActionDialogComponent, {
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

    this.http.post('/api/v1/career/random-players', { count }).subscribe({
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
        this.toastService.error('Failed to generate players: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }
}
