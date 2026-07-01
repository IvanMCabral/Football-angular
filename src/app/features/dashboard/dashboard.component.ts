
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
  careerPhase: string | null; // PRE_MATCH, IN_MATCH, POST_MATCH, WAITING_USER, FINISHED
  season: number;
  /**
   * V25D78-C55.2 phase 4 UI (c): user's division tier from
   * GET /api/v1/career/status. PRIMERA / SEGUNDA / TERCERA / null (legacy).
   */
  userDivision?: string | null;
  /**
   * V25D78-C55.2 phase 4 UI (d2): true when a season just ended and the
   * engine computed promotion/relegation movements. Front uses localStorage
   * to mark 'viewed' so the dialog doesn't re-pop on every reload.
   */
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

  // BehaviorSubject para career status reactivo
  private careerStatusSubject = new BehaviorSubject<CareerStatus | null>(null);
  careerStatus$ = this.careerStatusSubject.asObservable();

  /**
   * C55.10 Item 2 — dashboard refresh on (careerPhase, season) change.
   *
   * <p>Latched on the first successful {@code /career/status} emission.
   * Subsequent emissions are compared against this snapshot; if either
   * field differs (e.g. user finished a season → phase went from
   * {@code 'WAITING_USER'} → {@code 'POST_SEASON'} → season bumped, OR
   * the user just hit {@code /career/continue} → season went from
   * {@code 1} → {@code 2}), the dashboard re-fetches the dependent
   * datasets (squad, user-stats, world-status). Without this the page
   * retains stale numbers even after the career advance on the back.
   */
  private lastSeenPhase: string | null = null;
  private lastSeenSeason: number | null = null;

  // Squad data for condition warnings
  private squadSubject = new BehaviorSubject<SessionPlayer[]>([]);
  squad$ = this.squadSubject.asObservable();

  username$?: Observable<string>;
  userStats$?: Observable<UserStats>;
  worldStatus$?: Observable<WorldStatus>;
  recentActivities: RecentActivity[] = [];

  loading = false;
  generatingPlayers = false;

  /**
   * V25D78-C55.7.7 BUG-M3: label for the "Jugar Próxima Fecha" button when
   * career is in WAITING_USER phase.
   *
   * <p>Pre-fix: {@code `Jugar Fecha ${currentRound + 1}`} always added 1 to
   * {@code currentRound}, which overshoots {@code totalRounds} at season end
   * (T1 R10 finished → button said "Jugar Fecha 11", which doesn't exist).
   *
   * <p>Post-fix: when {@code currentRound >= totalRounds} (season just
   * finished and the engine is waiting for the user to advance), show a
   * "Continuar T{N+1}" label instead of an impossible round number.
   */
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

  /**
   * V25D78-C55.7.7 BUG-M3: subtitle for the play-next button. Mirrors
   * the season-end logic in {@link playNextRoundLabel} — when the season
   * is finished we hint "Ver resultados finales" instead of "Confirmar
   * para iniciar".
   */
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

  /**
   * Carga el career status y lo emite al BehaviorSubject
   */
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
            // V25D78-C55.2 phase 4 UI (c) consume: tier the user is in.
            // Backend may emit null for legacy careers; we surface it as-is.
            userDivision: status.userDivision ?? null,
            // V25D78-C55.2 phase 4 UI (d2) auto-trigger: when true, the
            // engine just finished a season and the promotion/relegation
            // movements are queued. We'll auto-open the dialog below
            // (gated by localStorage so it doesn't pop on every reload).
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

      // C55.10 Item 2 — detect (careerPhase, season) change and re-fetch
      // the dependent datasets that were captured once at
      // {@link loadDashboardData}. The first emission seeds the snapshot
      // without triggering the refresh — that initial fetch already
      // runs in ngOnInit. Subsequent emissions that change phase OR
      // season force a refresh so the UI doesn't display stale numbers
      // after the user finishes a season + advances to the next one.
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

      // V25D78-C55.2 phase 4 UI (d2): auto-trigger promotions dialog.
      // localStorage key is per-career so when a brand-new career finishes
      // its first season, the dialog opens exactly once. After the user
      // closes it, we mark the season as 'viewed' so subsequent loads
      // don't re-pop.
      if (status && status.promotionsAvailable && status.careerId) {
        this.maybeShowPromotionsDialog(status.careerId);
      }
    });
  }

  /**
   * V25D78-C55.2 phase 4 UI (d2): if the engine flagged promotions as
   * available for this career and we haven't shown them yet this season,
   * fetch the promotions list and pop the existing {@link PromotionsDialogComponent}.
   * Marks the season as 'viewed' in localStorage so the dialog is one-shot.
   */
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
          return; // engine flag was stale or no movements → don't pop
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

  /**
   * Refresca el career status (usado después de delete)
   */
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
      parts.push(`${suspended} suspended player${suspended > 1 ? 's' : ''}`);
    }
    if (injured > 0) {
      parts.push(`${injured} injured player${injured > 1 ? 's' : ''}`);
    }
    if (exhausted > 0) {
      parts.push(`${exhausted} exhausted player${exhausted > 1 ? 's' : ''}`);
    }
    if (veryTired > 0) {
      parts.push(`${veryTired} very tired player${veryTired > 1 ? 's' : ''}`);
    }

    return parts.join(' · ');
  }

  loadDashboardData(): void {
    // Username como observable, para template async
    this.username$ = this.authService.getUserInfo().pipe(
      map(info => info.username),
      catchError(err => {
        return of('');
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



  // Obsoleto: ya no se usa subscribe manual
  // loadCareerStatus(): void {}




  onPlayNow(): void {
    // Este botón solo aparece cuando !careerStatus, así que siempre ir a setup
    this.router.navigate(['/career/setup']);
  }

  onContinueCareer(): void {
    this.router.navigate(['/squad']);
  }

  /**
   * NUEVO: Jugar Próxima Fecha
   * Llama al endpoint POST /api/v1/career/{careerId}/next-round
   * que avanza la fase de WAITING_USER a PRE_MATCH
   */
  onPlayNextRound(): void {
    if (!confirm('¿Comenzar la siguiente fecha? Podrás ajustar táctica y formación antes de que_startMatch los partidos.')) {
      return;
    }

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

            // LIVE-MATCH-F3-UI-LIVE F5.1 BUG-002: AdvanceRoundResponse
            // does not include `careerId`, so reading `response.careerId`
            // produced the literal string "undefined" in the round-live URL.
            // Use the `careerId` we just posted (already validated above).
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

  /**
   * Verifica si el usuario puede jugar la próxima fecha
   */
  canPlayNextRound(status: CareerStatus | null): boolean {
    return status !== null && 
           status.careerPhase === 'WAITING_USER' && 
           !status.isFinished;
  }

  onDeleteCareer(): void {
    if (!confirm('Are you sure you want to delete your career? This action cannot be undone.')) {
      return;
    }
    this.http.delete(`${environment.apiUrl}/career/reset`).subscribe({
      next: () => {
        // Refrescar el observable para que el UI reaccione inmediatamente
        this.refreshCareerStatus();
      },
      error: (err) => {
        alert('Error deleting career. Please try again.');
      }
    });
  }

  onGenerateRandomPlayers(): void {
    if (this.generatingPlayers) return;

    this.generatingPlayers = true;
    const count = 10;

    // Call backend to generate random players
    this.http.post('/api/v1/career/random-players', { count }).subscribe({
      next: () => {
        this.generatingPlayers = false;
        this.toastService.success(`✨ ${count} random players generated successfully!`);
        // Reinicializar Observable para refrescar stats
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
