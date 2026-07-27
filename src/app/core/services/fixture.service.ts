import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CareerFixtureListResponse {
  rounds?: unknown[];
  matches?: unknown[];
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class FixtureService {
  private apiUrl = `${environment.apiUrl}/fixtures`;
  private careerApiUrl = `${environment.apiUrl}/career`;

  constructor(private http: HttpClient) {}

  generateFixture(gameId: string, teamIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/generate`, { gameId, teamIds });
  }

  /**
   * Devuelve todos los fixtures de la carrera organizados por ronda
   */
  getAllFixtures(): Observable<CareerFixtureListResponse> {
    return this.http.get<CareerFixtureListResponse>(`${this.careerApiUrl}/fixtures/all`);
  }
}
