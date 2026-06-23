import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomFixture,
  MatchFixture,
  ReplayMatchRequest,
  ResetRoundRequest,
  RoundStateResponse,
  SetFormationRequest,
  SimulateRoundRequest,
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
  private matchEngineUrl = `${environment.apiUrl}/match-engine`;

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

  /**
   * V24D24.2: POST /api/v1/test-harness/career/match/{matchId}/replay
   *
   * <p>Re-simulates a single match with the given seed. The match must
   * exist in the current tournament fixtures; the fixture is reset to
   * PENDING, re-simulated via the V24 engine, and the new result is
   * persisted (along with cache invalidation).
   *
   * <p>Determinism contract: same match + same {@code seed} + same formation
   * = byte-exact same result. Pass {@code null} for a non-reproducible
   * replay (backend falls back to {@code System.currentTimeMillis()}).
   *
   * <p>UI flow: Panel C click → user types seed in Panel B (default 12345)
   * → click "Replay with seed" → this method → refresh Panel A + D.
   *
   * @param matchId UUID of the match to replay (from the selected TestHarnessMatchRow)
   * @param seed explicit numeric seed (e.g. 12345), or null for non-reproducible
   * @returns Observable<MatchFixture> with the updated fixture (status,
   *   result.homeGoals/awayGoals/etc.)
   */
  replayMatch(matchId: string, seed: number | null): Observable<MatchFixture> {
    const body: ReplayMatchRequest = { seed };
    return this.http.post<MatchFixture>(
      `${this.apiUrl}/match/${matchId}/replay`,
      body
    );
  }

  /**
   * V24D24.2: POST /api/v1/match-engine/rounds/start
   *
   * <p>Starts a round (a batch of matches) via the V24 RoundEngine. The
   * backend derives {@code userId} from the JWT, so we don't send it.
   *
   * <p>UI flow: Panel B dropdown picks a round → user clicks "Simulate round N"
   * → component extracts matches for that round from {@code rounds()}
   * → this method POSTs {@code {roundId, matches}} → backend registers the
   * RoundEngine and starts the simulation asynchronously.
   *
   * <p>Note: the backend is fire-and-forget — the round runs in the background
   * and the response is the initial {@link RoundStateResponse}. Iván sees the
   * score updates by refreshing the match list (Panel C reloads via the
   * {@code refreshDetailAfterMutation} pattern).
   *
   * @param roundId deterministic UUID for this (careerId, round) — hydrated
   *   by the backend in {@code /api/v1/career/fixtures/round-with-bye} and
   *   carried in {@code TestHarnessMatchRow.roundId}.
   * @param matches the matches of this round (the backend starts one
   *   MatchEngine per match). All matches of a round share the same roundId
   *   so the component can pick them from any round group in Panel C.
   * @returns Observable<RoundStateResponse> with the initial round snapshot
   */
  simulateRound(
    roundId: string,
    matches: Array<{ matchId: string; homeTeamId: string; awayTeamId: string }>
  ): Observable<RoundStateResponse> {
    const body: SimulateRoundRequest = { roundId, matches };
    return this.http.post<RoundStateResponse>(
      `${this.matchEngineUrl}/rounds/start`,
      body
    );
  }

  /**
   * V24D24.3-HOTFIX: POST /api/v1/test-harness/career/reset-round
   *
   * <p>Resets every fixture of the given round back to PENDING, evicts
   * the cached MatchSession for each match from MatchEngineRegistry, and
   * clears the V24 detail entries from Redis. After this call, the next
   * {@code /match-engine/rounds/start} POST with the same {@code roundId}
   * will run a fresh V24 simulation (instead of returning the cached
   * completed result from the previous run).
   *
   * <p>The component calls this RIGHT BEFORE
   * {@link #simulateRound} so the "Simulate round" button is idempotent.
   *
   * <p>Failure mode: if the backend can't find the round, it returns
   * 422 with a clear message ("roundId X does not match any round of
   * career Y") — the component surfaces that via the standard
   * {@code fmtError} path.
   *
   * @param roundId deterministic round UUID hydrated from
   *   {@code /career/fixtures/round-with-bye} (carried in
   *   {@code TestHarnessMatchRow.roundId}).
   * @returns Observable<TestHarnessMutationResponse> with success flag
   *   and a human-readable message.
   */
  resetRound(roundId: string): Observable<TestHarnessMutationResponse> {
    const body: ResetRoundRequest = { roundId };
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/reset-round`,
      body
    );
  }
}
