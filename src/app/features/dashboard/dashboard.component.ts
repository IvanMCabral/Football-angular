
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of, firstValueFrom, BehaviorSubject } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';
import { TeamService } from '../teams/services/team.service';
import { MatchService } from '../matches/services/match.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../environments/environment';
import { SessionPlayer } from '../../shared/models/player.model';

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
}

interface RecentActivity {
  message: string;
  timestamp: Date;
  type: 'player' | 'team' | 'match' | 'squad';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

  // BehaviorSubject para career status reactivo
  private careerStatusSubject = new BehaviorSubject<CareerStatus | null>(null);
  careerStatus$ = this.careerStatusSubject.asObservable();

  // Squad data for condition warnings
  private squadSubject = new BehaviorSubject<SessionPlayer[]>([]);
  squad$ = this.squadSubject.asObservable();

  username$?: Observable<string>;
  userStats$?: Observable<UserStats>;
  worldStatus$?: Observable<WorldStatus>;
  recentActivities: RecentActivity[] = [];

  loading = false;
  generatingPlayers = false;


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
            season: status.season || 1
          } as CareerStatus;
        }
        return null;
      }),
      catchError(err => {
        return of(null);
      })
    ).subscribe(status => {
      this.careerStatusSubject.next(status);
    });
  }

  /**
   * Refresca el career status (usado después de delete)
   */
  private refreshCareerStatus(): void {
    this.loadCareerStatus();
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

    this.userStats$ = this.http.get<UserStats>(`${environment.apiUrl}/dashboard/user-stats`).pipe(
      shareReplay(1),
      catchError(err => {
        return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      })
    );


    // Inicializar Observables (async pipe se encarga del subscribe)
    this.worldStatus$ = this.http.get<WorldStatus>('http://localhost:8080/api/v1/dashboard/world-status').pipe(
      shareReplay(1),
      catchError(err => {
        return of({ clubs: 0, players: 0, matches: 0 });
      })
    );

    this.userStats$ = this.http.get<UserStats>(`${environment.apiUrl}/dashboard/user-stats`).pipe(
      shareReplay(1),
      catchError(err => {
        return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
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
