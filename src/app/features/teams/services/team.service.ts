import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Team, CreateTeamRequest, SessionTeam, CreateSessionTeamRequest, RandomTeamsRequest, RandomTeamsResponse } from '../../../shared/models/team.model';
import { Player, SessionPlayer } from '../../../shared/models/player.model';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/teams`;
  private careerApiUrl = `${environment.apiUrl}/career`;
  private worldApiUrl = `${environment.apiUrl}/world`;

  private sessionTeamsSubject = new BehaviorSubject<SessionTeam[]>([]);
  sessionTeams$ = this.sessionTeamsSubject.asObservable();

  getAllTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.apiUrl}`);
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
      error: (err) => console.error('[TEAM] Error refreshing teams:', err)
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
   * LIVE-MATCH-F3-UI-LIVE F5.1 BUG-001: the legacy URL
   * `/api/v1/career/session-teams/{id}/squad` returns 404 because the
   * controller exposes the squad under `/api/v1/career/teams/{id}/squad`
   * and `/api/v1/career/teams/me/squad`. The modal only needs the manager's
   * own squad, so we use the `me/squad` shortcut and drop the unused
   * sessionTeamId parameter (server resolves it from the JWT).
   *
   * V25D99.23: live match modals must never lose the bench because one
   * squad read path returns an empty list. `/career/players/squad` is the
   * canonical "my current career squad" endpoint already used by /squad and
   * the harness, so it is a safe fallback when `teams/me/squad` is empty or
   * unavailable.
   */
  getMyTeamSquad(): Observable<SessionPlayer[]> {
    const fallback$ = () => this.http.get<SessionPlayer[]>(`${this.careerApiUrl}/players/squad`);
    return this.http.get<SessionPlayer[]>(`${this.careerApiUrl}/teams/me/squad`).pipe(
      switchMap(players => players?.length ? of(players) : fallback$()),
      catchError(() => fallback$())
    );
  }
}
