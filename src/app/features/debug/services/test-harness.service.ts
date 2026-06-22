import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomFixture,
  SetFormationRequest,
  TestHarnessMutationResponse,
} from '../models/test-harness.model';

/**
 * V24D24: TestHarnessService — mutation wrapper for the test-harness UI.
 *
 * <p>Talks to {@code /api/v1/test-harness/career/*} on the backend
 * (TestHarnessController). The backend is profile-gated to
 * {@code dev | local | test} so the endpoints return 404 in production.
 *
 * <p>This service intentionally does NOT wrap the read endpoints
 * ({@code /snapshot}, {@code /matches}, etc.) — those go through their
 * own service so the test-harness page is just a thin orchestrator.
 *
 * <p>For GET /timeline?minute=N (the timeline scrubber data, used by
 * Panel D in F3), see {@code MatchDetailApiService.getMatchTimeline}.
 */
@Injectable({ providedIn: 'root' })
export class TestHarnessService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/test-harness/career`;

  /**
   * POST /api/v1/test-harness/career/set-formation
   *
   * <p>Persists the user team's formation to BOTH {@code SessionTeam.formation}
   * AND {@code teamStarting11Formation} (the V24 engine reads from the
   * latter — sprint 1.7 regression fix). Looser validation on the engine
   * side, but the UI should only pass known codes from
   * {@code FORMATION_CODES}.
   *
   * @param formation a formation code (e.g. "4-3-3")
   * @returns Observable<TestHarnessMutationResponse> with success flag and
   *   the formation that was persisted
   */
  setFormation(formation: string): Observable<TestHarnessMutationResponse> {
    const body: SetFormationRequest = { formation };
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/set-formation`,
      body
    );
  }

  /**
   * POST /api/v1/test-harness/career/reset-injuries
   *
   * <p>Clears injury/suspension/yellow/red flags across the entire squad
   * (not just the starting 11). Idempotent — safe to call on a healthy
   * squad.
   *
   * @returns Observable<TestHarnessMutationResponse> with success flag
   */
  resetInjuries(): Observable<TestHarnessMutationResponse> {
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/reset-injuries`,
      {}
    );
  }

  /**
   * POST /api/v1/test-harness/career/replace-fixtures
   *
   * <p>Overwrites the current tournament fixtures with a caller-provided
   * list. Resets {@code currentRound=1}, {@code finished=false},
   * {@code careerPhase=PRE_MATCH}, and rebuilds empty standings.
   *
   * @param fixtures array of CustomFixture to install
   * @returns Observable<TestHarnessMutationResponse> with fixtureCount and
   *   maxRound
   */
  replaceFixtures(
    fixtures: CustomFixture[]
  ): Observable<TestHarnessMutationResponse> {
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/replace-fixtures`,
      fixtures
    );
  }
}
