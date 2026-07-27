import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Game } from '../../shared/models/game.model';

export interface TournamentStatusResponse {
  success?: boolean;
  currentRound?: number;
  totalRounds?: number;
  status?: string;
  careerPhase?: string;
  tournamentFinished?: boolean;
  [key: string]: unknown;
}

export interface GameStandingResponse {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GameChampionResponse {
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  goalDifference: number;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private apiUrl = `${environment.apiUrl}/games`;

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

  getTournamentStatus(gameId: string): Observable<TournamentStatusResponse> {
    return this.http.get<TournamentStatusResponse>(`${this.apiUrl}/${gameId}/tournament-status`);
  }

  getStandings(gameId: string): Observable<GameStandingResponse[]> {
    return this.http.get<GameStandingResponse[]>(`${this.apiUrl}/${gameId}/standings`);
  }

  getChampion(gameId: string): Observable<GameChampionResponse> {
    return this.http.get<GameChampionResponse>(`${this.apiUrl}/${gameId}/champion`);
  }
}
