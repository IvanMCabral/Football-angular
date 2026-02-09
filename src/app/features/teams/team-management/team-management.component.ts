import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Observable, of, BehaviorSubject, Subject, merge, combineLatest } from 'rxjs';
import { switchMap, catchError, startWith, map, shareReplay, tap } from 'rxjs/operators';

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

  // Reactive state
  selectedLeagueId$ = new BehaviorSubject<string | null>(null);
  reloadTeams$ = new Subject<void>();
  selectedTeamForRoster$ = new BehaviorSubject<Team | null>(null);

  // Leagues observable - usa world endpoint que tiene WorldLeague
  leagues$: Observable<League[]> = this.authService.getUserInfo().pipe(
    switchMap((userInfo: any) =>
      this.http.get<League[]>(`http://localhost:8080/api/v1/world/leagues?userId=${userInfo.id}`).pipe(
        tap(leagues => console.log('Leagues loaded:', leagues)),
        catchError(err => {
          console.error('Failed to load leagues:', err);
          this.toastService.error('Failed to load leagues');
          return of([]);
        })
      )
    ),
    shareReplay(1)
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

  // All teams observable with reload trigger - usa WorldTeams como player-management
  allTeams$: Observable<Team[]> = merge(
    this.reloadTeams$
  ).pipe(
    startWith(null),
    switchMap(_ => 
      this.authService.getUserInfo().pipe(
        switchMap((userInfo: any) => 
          this.http.get<any[]>(`http://localhost:8080/api/v1/world/teams?userId=${userInfo.id}`).pipe(
            map(worldTeams => worldTeams.map((wt: any) => ({
              id: wt.worldTeamId,
              name: wt.name,
              country: wt.country,
              city: wt.city || 'N/A',
              leagueId: wt.realLeagueId?.toString() // El campo correcto es realLeagueId
            }))),
            tap(teams => console.log('Teams loaded:', teams)),
            catchError(err => {
              console.error('Failed to load teams:', err);
              return of([]);
            })
          )
        ),
        catchError(err => {
          console.error('Failed to get user info:', err);
          return of([]);
        })
      )
    ),
    shareReplay(1)
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
      return this.http.get<Player[]>(`http://localhost:8080/api/v1/teams/${team.id}/roster`).pipe(
        catchError(err => {
          console.error('Failed to load roster:', err);
          this.toastService.error('Failed to load roster');
          return of([]);
        })
      );
    })
  );

  // For ngModel binding
  selectedLeagueId: string | null = null;

  onLeagueChange(): void {
    this.selectedLeagueId$.next(this.selectedLeagueId);
  }

  addTeam(team: Team): void {
    const leagueId = this.selectedLeagueId$.value;
    if (!leagueId) return;

    console.log('Adding team', team.id, 'to league', leagueId);

    this.authService.getUserInfo().pipe(
      switchMap((userInfo: any) => 
        this.http.post(`http://localhost:8080/api/v1/world/leagues/${leagueId}/add-team`, { 
          userId: userInfo.id,
          teamId: team.id 
        })
      )
    ).subscribe({
      next: () => {
        this.toastService.success('Team added to league');
        this.reloadTeams$.next();
      },
      error: (err) => {
        console.error('Failed to add team:', err);
        this.toastService.error('Failed to add team');
      }
    });
  }

  removeTeam(team: Team): void {
    const leagueId = this.selectedLeagueId$.value;
    if (!leagueId) return;

    console.log('Removing team', team.id, 'from league', leagueId);

    this.authService.getUserInfo().pipe(
      switchMap((userInfo: any) => 
        this.http.delete(`http://localhost:8080/api/v1/world/leagues/${leagueId}/remove-team/${team.id}?userId=${userInfo.id}`)
      )
    ).subscribe({
      next: () => {
        this.toastService.success('Team removed from league');
        this.reloadTeams$.next();
      },
      error: (err) => {
        console.error('Failed to remove team:', err);
        this.toastService.error('Failed to remove team');
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

    this.http.delete(`http://localhost:8080/api/v1/teams/${team.id}/remove-player/${player.id}`).subscribe({
      next: () => {
        this.toastService.success(`${player.name} removed from roster!`);
        // Reload roster by re-emitting the same team
        this.selectedTeamForRoster$.next(team);
      },
      error: (err) => {
        console.error('Failed to remove player:', err);
        this.toastService.error('Failed to remove player from roster');
      }
    });
  }
}