/**
 * SessionTeam - Team entity from CareerSave
 */
export interface SessionTeam {
  sessionTeamId: string;
  worldTeamId?: string;
  name: string;
  country: string;
  budget: number;
  formation?: string;
  // Map to Team model for compatibility
  id?: any; // Can be sessionTeamId or worldTeamId depending on context
}

/**
 * CareerStatus - Career session status from backend GetCareerStatusUseCase
 *
 * <p><b>V25D78-C55.2 phase 4 UI</b> added two fields to the back contract:
 * <ul>
 *   <li><b>{@link userDivision}</b> — 'PRIMERA' | 'SEGUNDA' | 'TERCERA' | null.
 *       Tells the dashboard what tier the user's team is currently in so it
 *       can render the badge prominent without a 2nd round-trip to
 *       /career/divisions. null when the career is legacy (pre-C55.2) or
 *       absent.</li>
 *   <li><b>{@link promotionsAvailable}</b> — true when the engine just
 *       finished a season and computed promotion/relegation movements. The
 *       frontend uses this flag (plus localStorage) to auto-open the
 *       {@link PromotionsDialogComponent} instead of waiting for the user
 *       to click the manual button.</li>
 * </ul>
 */
export interface CareerStatus {
  careerId: string | null;
  season: number;
  currentRound: number;
  totalRounds: number;
  userTeamId: string | null;
  userSessionTeamId: string | null;
  userTeamName: string | null;
  hasLastMatchPlayed: boolean;
  nextMatchId: string | null;
  engineStatus: string;
  canAdvanceRound: boolean;
  careerPhase: string | null;
  squadSize: number;
  freePlayersCount: number;
  /**
   * V25D78-C55.2 phase 4 UI (c): user's division tier.
   * PRIMERA / SEGUNDA / TERCERA / null (legacy or no career).
   */
  userDivision?: string | null;
  /**
   * V25D78-C55.2 phase 4 UI (d2): true when a season just ended and
   * promotions are queued for display. Front uses localStorage to mark
   * 'viewed' so the dialog doesn't re-pop on every reload.
   */
  promotionsAvailable?: boolean;
}

/**
 * PalmaresEntry - Entry in the tournament hall of fame
 */
export interface PalmaresEntry {
  season: number;
  championTeamId: string;
  championTeamName: string;
  championCoachName?: string;
  divisionId?: string;
  divisionName?: string;
}

/**
 * TeamTitleCount - Team with title count for TOPs historical
 */
export interface TeamTitleCount {
  teamId: string;
  teamName: string;
  coachName?: string;
  titles: number;
}

/**
 * Fixture - Match fixture from CareerSave (Redis)
 * This is NOT the same as Match entity from PostgreSQL.
 * Fixtures live in CareerSave.tournament.fixtures.
 */
export interface Fixture {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | 'CANCELLED';
  homeGoals?: number | null;
  awayGoals?: number | null;
  homeStrength?: TeamStrengthInfo | null;
  awayStrength?: TeamStrengthInfo | null;
  /**
   * V24D24.2-F2.5 — team display names hydrated by the backend on
   * GET /api/v1/career/fixtures/round-with-bye (the
   * FixtureQueryDtos.MatchInfo record carries homeTeamName /
   * awayTeamName). Optional: absent on endpoints that do not hydrate
   * them (legacy GET /career/fixtures?round=N). Consumers should fall
   * back to the corresponding teamId when these fields are missing.
   */
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  /**
   * V24D24.2 — deterministic UUID for this (careerId, round) pair,
   * hydrated by the backend on GET /api/v1/career/fixtures/round-with-bye.
   * Used by the test-harness UI to POST /match-engine/rounds/start without
   * having to look up the roundId via the live engine registry first.
   * Optional: absent for careers created before the F1 hydration roll-out,
   * or for fixtures served by endpoints that don't hydrate it.
   */
  roundId?: string | null;
}

export interface TeamStrengthInfo {
  squadOvr?: number | null;
  startingOvr?: number | null;
  avgEnergy?: number | null;
  avgForm?: number | null;
  avgStamina?: number | null;
  squadSize?: number | null;
  starterCount?: number | null;
}

/**
 * Standing - Team standing from CareerSave (Redis)
 * This is stored in CareerSave.tournament.standings and is already
 * correctly accumulated with all match results.
 */
export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/**
 * Champion - Tournament champion from CareerSave (Redis)
 * This is stored in CareerSave.tournament.championTeamId when the
 * tournament is finished.
 */
export interface Champion {
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  goalDifference: number;
}

/**
 * DivisionStandings - Standings for a single division
 */
export interface DivisionStandings {
  divisionId: string;
  divisionName: string;
  isUserDivision: boolean;
  standings: Standing[];
}

/**
 * AllStandingsResponse - Response from /standings/all endpoint
 */
export interface AllStandingsResponse {
  divisions: DivisionStandings[];
}

/**
 * PromotionResult - Team promotion or relegation between divisions
 */
export interface PromotionResult {
  teamId: string;
  teamName: string;
  fromDivisionId: string;
  fromDivisionName: string;
  toDivisionId: string;
  toDivisionName: string;
  type: 'PROMOTED' | 'RELEGATED';
  fromPosition: number;
}

/**
 * DivisionInfo - Information about a division
 */
export interface DivisionInfo {
  divisionId: string;
  displayName: string;
  divisionNumber: number;
  teamCount: number;
}
