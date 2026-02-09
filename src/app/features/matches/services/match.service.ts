import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Match, CreateMatchRequest } from '../../../shared/models/match.model';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/matches`;

  getMatchesByGameId(gameId: string): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.apiUrl}?gameId=${gameId}`);
  }

  getMatches(): Observable<Match[]> {
    console.log('[MATCH SERVICE] getMatches llamado');
    return this.http.get<Match[]>(this.apiUrl);
  }

  getMatch(id: string): Observable<Match> {
    return this.http.get<Match>(`${this.apiUrl}/${id}`);
  }

  createMatch(request: CreateMatchRequest): Observable<Match> {
    return this.http.post<Match>(this.apiUrl, request);
  }

  simulateMatch(id: string): Observable<Match> {
    return this.http.post<Match>(`${this.apiUrl}/${id}/simulate`, {});
  }

  // Crea un fixture de partidos entre todos los equipos
  createFixture(teams: { id: string }[], date: string): CreateMatchRequest[] {
    const matches: CreateMatchRequest[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i !== j) {
          matches.push({
            homeTeamId: teams[i].id,
            awayTeamId: teams[j].id,
            scheduledAt: date
          });
        }
      }
    }
    return matches;
  }
}
