import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppLoggerService } from '../../../core/services/app-logger.service';
import { environment } from '../../../environments/environment';
import { readableErrorMessage } from '../../../shared/utils/error-message';
import { Observable, of, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { switchMap, catchError, startWith, map, shareReplay } from 'rxjs/operators';

interface League {
  realLeagueId: string;
  name: string;
  country: string;
  tier?: number;
}

interface Team {
  id: string;
  name: string;
  country: string;
  city?: string;
  leagueId?: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  overallRating: number;
}

interface CurrentUser {
  id: string;
}

interface WorldTeam {
  worldTeamId: string;
  name: string;
  country: string;
  city?: string;
  realLeagueId?: string | number | null;
}

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './team-management.component.html',
  styleUrls: ['./team-management.component.css']
})
export class TeamManagementComponent {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private logger = inject(AppLoggerService);
  private apiUrl = environment.apiUrl;

  // Reactive state
  selectedLeagueId$ = new BehaviorSubject<string | null>(null);
  reloadTeams$ = new Subject<void>();
  selectedTeamForRoster$ = new BehaviorSubject<Team | null>(null);

  // The server resolves the owner from the verified JWT; no profile waterfall.
  leagues$: Observable<League[]> = this.http.get<League[]>(`${this.apiUrl}/world/leagues`).pipe(
    catchError(err => {
      this.logger.error('Failed to load leagues:', err);
      this.toastService.error(readableErrorMessage(err, 'No se pudieron cargar las ligas.'));
      return of([]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Selected league name
  selectedLeagueName$: Observable<string> = combineLatest([
    this.selectedLeagueId$,
    this.leagues$
  ]).pipe(
    map(([leagueId, leagues]) => {
      if (!leagueId) return '';
      const league = leagues.find(l => l.realLeagueId && l.realLeagueId.toLowerCase() === leagueId.toLowerCase());
      return league?.name || '';
    })
  );

  allTeams$: Observable<Team[]> = this.reloadTeams$.pipe(
    startWith(undefined),
    switchMap(() => this.http.get<WorldTeam[]>(`${this.apiUrl}/world/teams`).pipe(
      map(teams => teams.map(team => ({
        id: team.worldTeamId, name: team.name, country: team.country,
        city: team.city || 'N/A', leagueId: team.realLeagueId?.toString()
      }))),
      catchError(err => {
        this.logger.error('Failed to load teams:', err);
        return of([]);
      })
    )),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Teams in selected league
  teamsInLeague$: Observable<Team[]> = combineLatest([
    this.selectedLeagueId$,
    this.allTeams$
  ]).pipe(
    map(([leagueId, teams]) => {
      if (!leagueId) return [];
      return teams.filter(t => t.leagueId && t.leagueId.toLowerCase() === leagueId.toLowerCase());
    })
  );

  // Available teams (not in selected league)
  availableTeams$: Observable<Team[]> = combineLatest([
    this.selectedLeagueId$,
    this.allTeams$
  ]).pipe(
    map(([leagueId, teams]) => {
      if (!leagueId) return [];
      return teams.filter(t => !t.leagueId || t.leagueId.toLowerCase() !== leagueId.toLowerCase());
    })
  );

  // Roster players for selected team
  rosterPlayers$: Observable<Player[]> = this.selectedTeamForRoster$.pipe(
    switchMap(team => {
      if (!team) return of([]);
      return this.http.get<Player[]>(`${this.apiUrl}/teams/${team.id}/roster`).pipe(
        catchError(err => {
          this.logger.error('Failed to load roster:', err);
          this.toastService.error(readableErrorMessage(err, 'No se pudo cargar el plantel.'));
          return of([]);
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // For ngModel binding
  selectedLeagueId: string | null = null;

  onLeagueChange(): void {
    this.selectedLeagueId$.next(this.selectedLeagueId);
  }

  addTeam(team: Team): void {
    const leagueId = this.selectedLeagueId$.value;
    if (!leagueId) return;

    this.authService.getUserInfo().pipe(
      switchMap((userInfo: CurrentUser) =>
        this.http.post(`${this.apiUrl}/world/leagues/${leagueId}/add-team`, {
          userId: userInfo.id,
          teamId: team.id
        })
      )
    ).subscribe({
      next: () => {
        this.toastService.success('Equipo agregado a la liga.');
        this.reloadTeams$.next();
      },
      error: (err) => {
        this.logger.error('Failed to add team:', err);
        this.toastService.error(readableErrorMessage(err, 'No se pudo agregar el equipo.'));
      }
    });
  }

  removeTeam(team: Team): void {
    const leagueId = this.selectedLeagueId$.value;
    if (!leagueId) return;

    this.authService.getUserInfo().pipe(
      switchMap((userInfo: CurrentUser) => 
        this.http.delete(`${this.apiUrl}/world/leagues/${leagueId}/remove-team/${team.id}?userId=${userInfo.id}`)
      )
    ).subscribe({
      next: () => {
        this.toastService.success('Equipo quitado de la liga.');
        this.reloadTeams$.next();
      },
      error: (err) => {
        this.logger.error('Failed to remove team:', err);
        this.toastService.error(readableErrorMessage(err, 'No se pudo quitar el equipo.'));
      }
    });
  }

  viewRoster(team: Team): void {
    this.selectedTeamForRoster$.next(team);
  }

  closeRoster(): void {
    this.selectedTeamForRoster$.next(null);
  }

  removePlayerFromRoster(player: Player): void {
    const team = this.selectedTeamForRoster$.value;
    if (!team) return;

    this.http.delete(`${this.apiUrl}/teams/${team.id}/remove-player/${player.id}`).subscribe({
      next: () => {
        this.toastService.success(`${player.name} fue quitado del plantel.`);
        // Reload roster by re-emitting the same team
        this.selectedTeamForRoster$.next(team);
      },
      error: (err) => {
        this.logger.error('Failed to remove player:', err);
        this.toastService.error(readableErrorMessage(err, 'No se pudo quitar el jugador del plantel.'));
      }
    });
  }
}
