import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface League {
  id: string;
  name: string;
  country?: string;
  level?: number;
}

@Injectable({ providedIn: 'root' })
export class LeagueService {
  private apiUrl = `${environment.apiUrl}/leagues`;

  constructor(private http: HttpClient) {}

  getAllLeagues(): Observable<League[]> {
    return this.http.get<League[]>(this.apiUrl);
  }

  getLeagueById(id: string): Observable<League> {
    return this.http.get<League>(`${this.apiUrl}/${id}`);
  }
}
