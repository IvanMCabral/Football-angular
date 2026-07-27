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
  // Map to Team model for compatibility.
  // Can be sessionTeamId or worldTeamId depending on context.
  id?: string;
}

// Career session status returned by the backend.
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
  // User division tier, when a career is active.
  userDivision?: string | null;
  // True when end-of-season promotion results are ready to show.
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
  // Optional display names hydrated by newer fixture endpoints.
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  // Optional stable round id used by round-level match engine endpoints.
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

