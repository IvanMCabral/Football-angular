import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppLoggerService } from '../../../core/services/app-logger.service';
import { environment } from '../../../environments/environment';
import { readableErrorMessage } from '../../../shared/utils/error-message';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { switchMap, catchError, startWith, map, shareReplay } from 'rxjs/operators';

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

interface WorldTeam {
  worldTeamId: string;
  name: string;
  country: string;
}

interface WorldPlayer {
  worldPlayerId: string;
  worldTeamId?: string | null;
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
  private logger = inject(AppLoggerService);
  private apiUrl = environment.apiUrl;

  teamId$ = new BehaviorSubject<string | null>(null);
  reloadAvailablePlayers$ = new Subject<void>();
  reloadTeams$ = new Subject<void>();

  leagues$: Observable<League[]> = this.http.get<League[]>(`${this.apiUrl}/leagues`).pipe(
    catchError(() => of([]))
  );

  // Share one owner-authenticated request across all async template subscribers.
  teams$: Observable<Team[]> = this.reloadTeams$.pipe(
    startWith(undefined),
    switchMap(() => this.http.get<WorldTeam[]>(`${this.apiUrl}/world/teams`).pipe(
      map(teams => teams.map(team => ({
        sessionTeamId: team.worldTeamId, name: team.name, country: team.country
      }))),
      catchError(() => of([]))
    )),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  assignedPlayers$: Observable<Player[]> = this.teamId$.pipe(
    switchMap(teamId => !teamId ? of([]) :
      this.http.get<WorldPlayer[]>(`${this.apiUrl}/world/teams/${teamId}/players`).pipe(
        map(players => players.map(player => ({
          sessionPlayerId: player.worldPlayerId, name: player.name,
          position: player.position, age: player.age, overall: player.overall
        }))),
        catchError(() => of([]))
      )),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Changing the selected club does not change the free-agent pool. Commands
  // explicitly reload this list after assigning or removing a player.
  availablePlayers$: Observable<Player[]> = this.reloadAvailablePlayers$.pipe(
    startWith(undefined),
    switchMap(() => this.http.get<WorldPlayer[]>(`${this.apiUrl}/world/free-players`).pipe(
      map(players => players.map(player => ({
        sessionPlayerId: player.worldPlayerId, name: player.name,
        position: player.position, age: player.age, overall: player.overall
      }))),
      catchError(() => of([]))
    )),
    shareReplay({ bufferSize: 1, refCount: true })
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
      this.http.post(`${this.apiUrl}/world/assign-player`, payload).subscribe({
        next: () => {
          this.toastService.success('Jugador asignado al equipo.');
          // Trigger reload
          this.teamId$.next(this.selectedTeamId);
          this.reloadAvailablePlayers$.next();
          this.reloadTeams$.next();
        },
        error: (err: unknown) => {
          this.logger.error('Failed to assign player:', err);
          this.toastService.error(readableErrorMessage(err, 'No se pudo asignar el jugador.'));
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
      this.http.post(`${this.apiUrl}/world/remove-player`, payload).subscribe({
        next: () => {
          this.toastService.success('Jugador quitado del equipo.');
          // Trigger reload
          this.teamId$.next(this.selectedTeamId);
          this.reloadAvailablePlayers$.next();
          this.reloadTeams$.next();
        },
        error: (err: unknown) => {
          this.logger.error('Failed to remove player:', err);
          this.toastService.error(readableErrorMessage(err, 'No se pudo quitar el jugador.'));
        }
      });
    });
  }
}

