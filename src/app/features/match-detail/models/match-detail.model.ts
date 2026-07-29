/**
 * Match detail types consumed from the career match-detail endpoint.
 *
 * Some enriched fields are optional because older or lightweight match
 * simulations may not persist every detail.
 */

/** All possible event types in a match timeline. */
export type MatchEventType =
  | 'GOAL'
  | 'SHOT'
  | 'SHOT_ON_TARGET'
  | 'SAVE'
  | 'MISS'
  | 'BLOCK'
  | 'CHANCE_CREATED'
  | 'FOUL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'INJURY'
  | 'SUBSTITUTION'
  | 'OFFSIDE'
  | 'CORNER'
  | 'TACTICAL_CHANGE';

/** Shot location categories based on distance from goal */
export type ShotLocation =
  | 'SIX_YEAR_BOX'
  | 'PENALTY_AREA_CENTER'
  | 'PENALTY_AREA_WIDE'
  | 'OUTSIDE_BOX'
  | 'LONG_RANGE';

/**
 * Shot coordinate for a shot event.
 * Nullable because not every historical event has stored coordinates.
 */
export interface ShotCoordinate {
  x: number;
  y: number;
  location: ShotLocation;
  distanceToGoal: number;
  angleToGoal: number;
  insideBox: boolean;
}

/**
 * A single event in the match timeline.
 * relatedPlayerId/relatedPlayerName are nullable (e.g., assists on goals).
 * xg is nullable (only for SHOT and GOAL events).
 * shotCoordinate is nullable and only meaningful for shot-like events.
 */
export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerId: string;
  playerName: string;
  relatedPlayerId?: string | null;
  relatedPlayerName?: string | null;
  xg?: number | null;
  description: string;
  shotCoordinate?: ShotCoordinate | null;
}

/**
 * Per-player performance rating and stats.
 * Currently playerRatings list may be empty (per-player rating persistence deferred).
 */
export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  teamId: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  keyPasses: number;
  shots: number;
  cards: number;
  injuries: number;
  substitutions: number;
}

export interface MatchLineupPlayer {
  sessionPlayerId: string;
  name: string;
  position: string;
  overall: number;
  attack: number;
  defense: number;
  energy: number;
  form: number;
  injured: boolean;
}

/**
 * Detailed match data returned by the API.
 *
 * This is additive enrichment and is never required for career progress.
 * When detail is unavailable (404), UI must fall back to aggregate MatchFixture.MatchResultData.
 *
 * Current known limitations:
 * - playerRatings is currently an empty list (persistence deferred)
 * - shotCoordinate can be null on any event
 */
export interface MatchDetail {
  matchId: string;
  careerId: string;
  seasonNumber: number;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  awayPossession: number;
  timeline: MatchEvent[];
  playerRatings: PlayerMatchRating[];
  homeStartingPlayers?: MatchLineupPlayer[];
  homeBenchPlayers?: MatchLineupPlayer[];
  awayStartingPlayers?: MatchLineupPlayer[];
  awayBenchPlayers?: MatchLineupPlayer[];
  schemaVersion: string;
  engineVersion: string;
  createdAt: string;
}

/**
 * Match detail snapshot filtered up to and including a specific minute.
 *
 * Aggregation rules mirror the backend detailed timeline snapshot:
 * - homeGoals / awayGoals: count of GOAL events per team
 * - homeShots / awayShots: count of SHOT events per team (SHOT_ON_TARGET
 *   is NOT a separate shot; it is the same attempt with an on-target flag)
 * - homeXg / awayXg: sum of xG for SHOT/SHOT_ON_TARGET/GOAL events per team
 * - events: filtered to event.minute <= minute
 */
export interface TimelineSnapshot {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  events: MatchEvent[];
}
