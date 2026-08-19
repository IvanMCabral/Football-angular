import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppLoggerService } from '../../../core/services/app-logger.service';
import { ClientHttpDiagnosticsService } from '../../../core/observability/client-http-diagnostics.service';
import { Team, WorldTeamResponse, CreateTeamRequest, SessionTeam, CreateSessionTeamRequest, RandomTeamsRequest, RandomTeamsResponse } from '../../../shared/models/team.model';
import { Player, SessionPlayer } from '../../../shared/models/player.model';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private http = inject(HttpClient);
  private logger = inject(AppLoggerService);
  private clientDiagnostics = inject(ClientHttpDiagnosticsService);
  private apiUrl = `${environment.apiUrl}/teams`;
  private careerApiUrl = `${environment.apiUrl}/career`;
  private worldApiUrl = `${environment.apiUrl}/world`;

  private sessionTeamsSubject = new BehaviorSubject<SessionTeam[]>([]);
  sessionTeams$ = this.sessionTeamsSubject.asObservable();

  getAllTeams(userId: string): Observable<Team[]> {
    return this.http.get<WorldTeamResponse[]>(`${this.worldApiUrl}/teams?userId=${encodeURIComponent(userId)}`).pipe(
      map(worldTeams => worldTeams.map(mapWorldTeamResponseToTeam)),
      tap(() => this.clientDiagnostics.recordTeamServiceMapped())
    );
  }

  getTeam(id: string): Observable<Team> {
    return this.http.get<Team>(`${this.apiUrl}/${id}`);
  }

  createTeam(request: CreateTeamRequest): Observable<Team> {
    return this.http.post<Team>(this.apiUrl, request);
  }

  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getSquad(teamId: string): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/${teamId}/squad`);
  }

  addPlayerToTeam(teamId: string, playerId: string): Observable<Team> {
    return this.http.post<Team>(`${this.apiUrl}/${teamId}/players/${playerId}`, {});
  }

  removePlayerFromTeam(teamId: string, playerId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${teamId}/players/${playerId}`);
  }

  createSessionTeam(request: CreateSessionTeamRequest): Observable<SessionTeam> {
    return this.http.post<SessionTeam>(`${this.worldApiUrl}/create-custom-team`, request);
  }

  createRandomSessionTeam(userId: string): Observable<SessionTeam> {
    return this.http.post<SessionTeam>(`${this.worldApiUrl}/random-team?userId=${userId}`, {});
  }

  createRandomSessionTeams(userId: string, count: number): Observable<RandomTeamsResponse> {
    return this.http.post<RandomTeamsResponse>(`${this.worldApiUrl}/random-teams`, { userId, count });
  }

  cloneTeamToSession(realTeamId: string): Observable<SessionTeam> {
    return this.http.post<SessionTeam>(`${this.careerApiUrl}/clone-team/${realTeamId}`, {});
  }

  getSessionTeams(): Observable<SessionTeam[]> {
    return this.http.get<SessionTeam[]>(`${this.careerApiUrl}/session-teams`).pipe(
      tap(teams => this.sessionTeamsSubject.next(teams))
    );
  }

  refreshSessionTeams(): void {
    this.http.get<SessionTeam[]>(`${this.careerApiUrl}/session-teams`).subscribe({
      next: (teams) => this.sessionTeamsSubject.next(teams),
      error: (err) => this.logger.error('[TEAM] Error refreshing teams:', err)
    });
  }

  deleteSessionTeam(sessionTeamId: string): Observable<void> {
    return this.http.delete<void>(`${this.careerApiUrl}/session-teams/${sessionTeamId}`).pipe(
      tap(() => {
        const currentTeams = this.sessionTeamsSubject.value.filter(
          t => t.sessionTeamId !== sessionTeamId
        );
        this.sessionTeamsSubject.next(currentTeams);
      })
    );
  }

  assignPlayerToSessionTeam(sessionPlayerId: string, sessionTeamId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.careerApiUrl}/assign-player-to-team`, {
      sessionPlayerId,
      sessionTeamId
    });
  }

  /**
   * Loads the manager's current career squad.
   *
   * The primary endpoint returns the team-owned squad. If it is empty or
   * unavailable, the career player-squad endpoint is used as a safe fallback
   * so live-match modals do not lose the bench.
   */
  getMyTeamSquad(): Observable<SessionPlayer[]> {
    const fallback$ = () => this.http.get<SessionPlayer[]>(`${this.careerApiUrl}/players/squad`);
    return this.http.get<SessionPlayer[]>(`${this.careerApiUrl}/teams/me/squad`).pipe(
      switchMap(players => players?.length ? of(players) : fallback$()),
      catchError(() => fallback$())
    );
  }
}

/**
 * Single transport-to-UI boundary for the canonical WorldTeam catalog.
 * `Team.id` is deliberately the productive worldTeamId used by assign-team.
 */
export function mapWorldTeamResponseToTeam(worldTeam: WorldTeamResponse): Team {
  if (!worldTeam || !worldTeam.worldTeamId || !worldTeam.name) {
    throw new Error('Invalid WorldTeam response: worldTeamId and name are required');
  }

  return {
    id: worldTeam.worldTeamId,
    name: worldTeam.name,
    country: worldTeam.country ?? '',
    budget: worldTeam.baseBudget ?? 0,
    formation: worldTeam.baseFormation ?? '4-3-3',
    realTeamId: worldTeam.realTeamId,
    realLeagueId: worldTeam.realLeagueId
  };
}
