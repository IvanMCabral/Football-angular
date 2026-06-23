/**
 * V24D24: Test-Harness UI models.
 *
 * The test-harness UI is a debug page at /debug/test-harness that lets
 * Iván play with formation / seed / injuries / fixtures and see the impact
 * on match results. All endpoints are profile-gated to dev/local/test on
 * the backend (see TestHarnessController).
 *
 * No mutation here — these are wire types only.
 */

import { MatchDetail } from '../../match-detail/models/match-detail.model';

/** Formation codes accepted by the V24 engine. */
export type FormationCode = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';

/** Allowed formation codes for the UI select. */
export const FORMATION_CODES: readonly FormationCode[] = [
  '4-3-3',
  '4-4-2',
  '3-5-2',
  '4-2-3-1',
] as const;

/** Body for POST /api/v1/test-harness/career/set-formation. */
export interface SetFormationRequest {
  formation: string;
}

/** Body item for POST /api/v1/test-harness/career/replace-fixtures. */
export interface CustomFixture {
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  matchId?: string | null;
}

/** Response shape for /create-custom, /reset-injuries, /set-formation. */
export interface TestHarnessMutationResponse {
  success: boolean;
  message: string;
  // Present on /create-custom
  careerId?: string;
  userSessionTeamId?: string;
  totalRounds?: number;
  currentRound?: number;
  teamsPerDivision?: number;
  // Present on /set-formation
  formation?: string;
  // Present on /replace-fixtures
  fixtureCount?: number;
  maxRound?: number;
}

/**
 * Match summary row used by the test-harness Panel C match list.
 * Derived from CareerService.getAllFixturesWithBye() — each round has
 * multiple matches; we flatten into a list of (round, home, away, status)
 * for the test-harness UI.
 */
export interface TestHarnessMatchRow {
  matchId: string;
  round: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeFormation: string | null;
  awayFormation: string | null;
  /**
   * V24D24.2 — deterministic UUID for this (careerId, round) pair, hydrated
   * by the backend. All matches in the same round share the same roundId.
   * The "Simulate round N" button POSTs this roundId to
   * `/api/v1/match-engine/rounds/start`.
   */
  roundId?: string | null;
}

/**
 * V24D24.2 — wire type for the body of
 * {@code POST /api/v1/test-harness/career/match/{matchId}/replay}.
 *
 * <p>{@code seed} is the random seed for the V24 engine replay. Pass an
 * explicit number for a reproducible replay (same match + same seed = same
 * result byte-exact). Pass {@code null} (or omit the body) for a non-
 * reproducible replay that uses {@code System.currentTimeMillis()} as the
 * seed.
 */
export interface ReplayMatchRequest {
  seed: number | null;
}

/**
 * V24D24.2 — wire type for the body of
 * {@code POST /api/v1/match-engine/rounds/start} (the simulate-round endpoint).
 *
 * <p>The backend derives {@code userId} from the JWT (auth) — it is NOT sent
 * here. The caller picks a {@code roundId} from the roundId-hydrated fixtures
 * and includes all matches of that round (the backend starts one MatchEngine
 * per match).
 */
export interface SimulateRoundRequest {
  roundId: string;
  matches: Array<{
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
  }>;
}

/**
 * V24D24.2 — match fixture as returned by
 * {@code POST /api/v1/test-harness/career/match/{matchId}/replay}.
 *
 * <p>Mirrors the backend {@code com.footballmanager.domain.model.valueobject.MatchFixture}
 * shape (only the fields the UI cares about).
 */
export interface MatchFixture {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | 'CANCELLED' | string;
  result?: MatchResultData | null;
}

/** Subset of {@code MatchFixture.MatchResultData} that the UI reads. */
export interface MatchResultData {
  homeGoals: number;
  awayGoals: number;
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
}

/**
 * V24D24.2 — response shape for {@code POST /match-engine/rounds/start}.
 *
 * <p>The backend returns a snapshot of all matches that were just started.
 * The UI doesn't currently consume the full shape — it only needs to know
 * the round started — so we model just enough fields to type the observable.
 */
export interface RoundStateResponse {
  roundId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | string;
  startedAt?: string;
  matchIds?: string[];
}

/**
 * Re-export of MatchDetail for consumers that import test-harness models
 * first. Keeps the test-harness public surface self-contained.
 */
export type { MatchDetail };
