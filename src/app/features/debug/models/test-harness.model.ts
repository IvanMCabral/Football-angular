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
}

/**
 * Re-export of MatchDetail for consumers that import test-harness models
 * first. Keeps the test-harness public surface self-contained.
 */
export type { MatchDetail };
