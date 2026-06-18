// F6 Sprint 2 (LIVE-MATCH-F6-MATCH-COMPARE): HTTP service for the
// /compare endpoint. Mirrors MatchDetailApiService pattern: 200 with
// MatchComparison, 404 → null (no comparison available).

import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MatchComparison } from '../models/match-compare.model';

@Injectable({ providedIn: 'root' })
export class MatchCompareApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/careers`;   // = '/api/v1/careers'

  /**
   * Fetch the comparison (baseline vs live) for a finished match.
   *
   * @param careerId  the career the match belongs to
   * @param matchId   the match id
   * @returns Observable emitting:
   *   - `MatchComparison` on 200 OK
   *   - `null` on 404 (no baseline, no live detail, or feature disabled)
   *   - errors propagate for any other status (handled by the global
   *     error interceptor)
   *
   * <p>V24D15-CLEANUP (BUG_COMPARE_UX): the 404 → null contract was
   * documented but never enforced — the {@code http.get} threw on 404
   * and the caller's {@code error} branch fired ("Error al cargar la
   * comparación") instead of the user-friendly "Comparación no
   * disponible" message. Adding the {@code catchError} closes the loop.
   */
  getMatchCompare(careerId: string, matchId: string): Observable<MatchComparison | null> {
    const url = `${this.apiUrl}/${encodeURIComponent(careerId)}/matches/${encodeURIComponent(matchId)}/compare`;
    return this.http.get<MatchComparison>(url, { observe: 'response' }).pipe(
      map((response: HttpResponse<MatchComparison>) => {
        if (response.status === 200 && response.body) {
          return response.body;
        }
        return null;
      }),
      catchError((err) => {
        if (err && err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }
}
