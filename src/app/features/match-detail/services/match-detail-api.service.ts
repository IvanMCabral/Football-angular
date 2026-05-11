import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MatchDetail } from '../models/match-detail.model';

/**
 * V24D5E2: Match Detail API Service
 *
 * Consumes V24 detailed match data from:
 * GET /api/careers/{careerId}/matches/{matchId}/detail
 *
 * Behavior:
 * - 200: returns MatchDetail
 * - 404: returns null (detail not available — NOT an error)
 * - 500 or other non-404 errors: propagate to caller
 *
 * The endpoint returns 404 when:
 * - app.simulation.v24.expose-detail-api=false (flag disabled)
 * - match was simulated before V24 detail persistence was enabled
 * - detail was not persisted for this match
 *
 * IMPORTANT: This service intentionally returns null for 404.
 * Future UI components should handle null gracefully — not as an error.
 */
@Injectable({ providedIn: 'root' })
export class MatchDetailApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/careers`;

  /**
   * Fetch V24 detailed match data for a given career and match.
   *
   * @param careerId The career ID
   * @param matchId  The match ID (matchId from MatchFixture)
   * @returns Observable<MatchDetail | null>
   *   - 200 → MatchDetail
   *   - 404 → null (detail unavailable)
   *   - 500+ → error (caller should handle)
   *
   * @example
   * service.getMatchDetail('career-001', 'match-r1-h1-a2').subscribe(detail => {
   *   if (detail) {
   *     // render detail page
   *   } else {
   *     // render "detail unavailable" state
   *   }
   * });
   */
  getMatchDetail(careerId: string, matchId: string): Observable<MatchDetail | null> {
    const url = `${this.apiUrl}/${encodeURIComponent(careerId)}/matches/${encodeURIComponent(matchId)}/detail`;
    return this.http.get<MatchDetail>(url, { observe: 'response' }).pipe(
      map((response: HttpResponse<MatchDetail>) => {
        if (response.status === 200) {
          return response.body;
        }
        // 404 is expected when detail is unavailable — return null
        return null;
      })
    );
  }
}
