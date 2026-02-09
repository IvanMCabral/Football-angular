import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FixtureResponse } from '../../models/fixture.model';

@Injectable({ providedIn: 'root' })
export class FixtureService {
  private apiUrl = '/api/v1/fixtures';

  constructor(private http: HttpClient) {}

  generateFixture(gameId: string, teamIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/generate`, { gameId, teamIds });
  }

  /**
   * Devuelve todos los fixtures de la carrera organizados por ronda
   */
  getAllFixtures(): Observable<any> {
    return this.http.get<any>(`/api/v1/career/fixtures/all`);
  }
}
