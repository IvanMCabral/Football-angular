import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MatchMinuteState {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  status: string;
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'CARD' | 'INJURY' | 'SUBSTITUTION';
  playerName: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchMinuteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/matches`;

  getMinuteByMinute(matchId: string): Observable<MatchMinuteState[]> {
    return this.http.get<MatchMinuteState[]>(`${this.apiUrl}/${matchId}/minute-by-minute`);
  }
}
