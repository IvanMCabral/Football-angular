import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game } from '../../shared/models/game.model';

@Injectable({ providedIn: 'root' })
export class GameService {
  private apiUrl = '/api/v1/games';

  constructor(private http: HttpClient) {}

  getGamesByUserId(userId: string): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.apiUrl}/user/${userId}`);
  }

  createGame(name: string, teamId?: string, leagueId?: string): Observable<Game> {
    return this.http.post<Game>(this.apiUrl, { name, teamId, leagueId });
  }

  getAllGames(): Observable<Game[]> {
    return this.http.get<Game[]>(this.apiUrl);
  }

  getGameById(id: string): Observable<Game> {
    return this.http.get<Game>(`${this.apiUrl}/${id}`);
  }

  getTournamentStatus(gameId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${gameId}/tournament-status`);
  }

  getStandings(gameId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${gameId}/standings`);
  }

  getChampion(gameId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${gameId}/champion`);
  }
}
