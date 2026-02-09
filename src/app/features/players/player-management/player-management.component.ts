import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Observable, of, BehaviorSubject, Subject, merge } from 'rxjs';
import { switchMap, catchError, startWith, map } from 'rxjs/operators';

interface League {
  id: string;
  name: string;
  country: string;
}

interface Team {
  sessionTeamId: string;
  name: string;
  country: string;
}

interface Player {
  sessionPlayerId: string;
  name: string;
  position: string;
  age: number;
  overall: number;
}

@Component({
  selector: 'app-player-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-management.component.html',
  styleUrls: ['./player-management.component.css']
})
export class PlayerManagementComponent {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  teamId$ = new BehaviorSubject<string | null>(null);
  reloadAvailablePlayers$ = new Subject<void>();
  reloadTeams$ = new Subject<void>();

  leagues$: Observable<League[]> = this.http.get<League[]>('http://localhost:8080/api/v1/leagues').pipe(
    catchError(() => of([]))
  );

  // WorldTeams = TODOS los equipos disponibles (catálogo completo: reales + custom)
  teams$: Observable<Team[]> = merge(
    this.reloadTeams$
  ).pipe(
    startWith(null),
    switchMap(_ => 
      this.authService.getUserInfo().pipe(
        switchMap(userInfo => 
          this.http.get<any[]>(`http://localhost:8080/api/v1/world/teams?userId=${userInfo.id}`).pipe(
            map(worldTeams => worldTeams.map(wt => ({
              sessionTeamId: wt.worldTeamId, // Usamos worldTeamId como sessionTeamId
              name: wt.name,
              country: wt.country
            }))),
            catchError(() => of([]))
          )
        ),
        catchError(() => of([]))
      )
    )
  );

  // Squad actual del equipo desde WorldSnapshot (jugadores reales + custom)
  assignedPlayers$: Observable<Player[]> = this.teamId$.pipe(
    switchMap(worldTeamId => {
      if (!worldTeamId) return of([]);
      
      // Obtener jugadores del WorldTeam en WorldSnapshot
      return this.authService.getUserInfo().pipe(
        switchMap(userInfo => 
          this.http.get<any[]>(`http://localhost:8080/api/v1/world/teams/${worldTeamId}/players?userId=${userInfo.id}`).pipe(
            map(worldPlayers => worldPlayers.map(wp => ({
              sessionPlayerId: wp.worldPlayerId, // Usar worldPlayerId como ID
              name: wp.name,
              position: wp.position,
              age: wp.age,
              overall: wp.overall
            }))),
            catchError(() => of([]))
          )
        ),
        catchError(() => of([]))
      );
    })
  );

  // SOLO jugadores sin equipo (worldTeamId === null) = Free Agents
  availablePlayers$: Observable<Player[]> = merge(
    this.teamId$,
    this.reloadAvailablePlayers$
  ).pipe(
    startWith(null),
    switchMap(_ =>
      this.authService.getUserInfo().pipe(
        switchMap(userInfo => 
          this.http.get<any[]>(`http://localhost:8080/api/v1/world/players?userId=${userInfo.id}`).pipe(
            map(worldPlayers => worldPlayers
              .filter(wp => !wp.worldTeamId) // Filtrar solo free agents (sin equipo)
              .map(wp => ({
                sessionPlayerId: wp.worldPlayerId, // Usar worldPlayerId como ID
                name: wp.name,
                position: wp.position,
                age: wp.age,
                overall: wp.overall
              }))
            ),
            catchError(() => of([]))
          )
        ),
        catchError(() => of([]))
      )
    )
  );

  selectedTeamId: string | null = null;

  onTeamChange(): void {
    this.teamId$.next(this.selectedTeamId);
  }

  addPlayerToTeam(player: Player): void {
    if (!this.selectedTeamId) return;

    this.authService.getUserInfo().subscribe(userInfo => {
      const payload = {
        userId: userInfo.id,
        playerId: player.sessionPlayerId, // worldPlayerId
        teamId: this.selectedTeamId // worldTeamId
      };
      this.http.post(`http://localhost:8080/api/v1/world/assign-player`, payload).subscribe({
        next: () => {
          this.toastService.success('Player assigned to team in WorldSnapshot');
          // Trigger reload
          this.teamId$.next(this.selectedTeamId);
          this.reloadAvailablePlayers$.next();
          this.reloadTeams$.next();
        },
        error: (err: any) => {
          console.error('Failed to assign player:', err);
          this.toastService.error(`Failed to assign player: ${err.error?.message || err.message || 'Unknown error'}`);
        }
      });
    });
  }

  removePlayerFromTeam(player: Player): void {
    if (!this.selectedTeamId) return;

    this.authService.getUserInfo().subscribe(userInfo => {
      const payload = {
        userId: userInfo.id,
        playerId: player.sessionPlayerId // worldPlayerId
      };
      this.http.post(`http://localhost:8080/api/v1/world/remove-player`, payload).subscribe({
        next: () => {
          this.toastService.success('Player removed from team in WorldSnapshot');
          // Trigger reload
          this.teamId$.next(this.selectedTeamId);
          this.reloadAvailablePlayers$.next();
          this.reloadTeams$.next();
        },
        error: (err: any) => {
          console.error('Failed to remove player:', err);
          this.toastService.error(`Failed to remove player: ${err.error?.message || err.message || 'Unknown error'}`);
        }
      });
    });
  }
}

