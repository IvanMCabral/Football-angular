/**
 * V24D5E2: Match Detail Types
 * TypeScript interfaces for V24DetailedMatchData consumed from:
 * GET /api/careers/{careerId}/matches/{matchId}/detail
 *
 * These types reflect the V24DetailedMatchData DTO from the backend.
 * playerRatings may be empty; shotCoordinate may be null.
 * UI must handle both gracefully.
 */

/** All possible event types in a V24 match timeline */
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
 * Nullable — only present when V24D3C event attachment is implemented.
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
 * A single event in the V24 match timeline.
 * relatedPlayerId/relatedPlayerName are nullable (e.g., assists on goals).
 * xg is nullable (only for SHOT and GOAL events).
 * shotCoordinate is nullable (only for SHOT/GOAL events after V24D3C).
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

/**
 * V24 Detailed Match Data DTO.
 * Consumed from: GET /api/careers/{careerId}/matches/{matchId}/detail
 *
 * This is ADDITIVE enrichment — never required for career progress.
 * When detail is unavailable (404), UI must fall back to aggregate MatchFixture.MatchResultData.
 *
 * Current known limitations:
 * - playerRatings is currently an empty list (persistence deferred)
 * - shotCoordinate is nullable on all events (requires V24D3C)
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
  schemaVersion: string;
  engineVersion: string;
  createdAt: string;
}

/**
 * V24D24: Snapshot of V24 detailed match data filtered up to and including
 * a specific minute. Returned by
 * GET /api/v1/careers/{careerId}/matches/{matchId}/timeline?minute=N
 * for the test-harness UI timeline scrubber (Panel D, F3).
 *
 * Aggregation rules (see backend V24TimelineSnapshot):
 * - homeGoals / awayGoals: count of GOAL events per team
 * - homeShots / awayShots: count of SHOT events per team (SHOT_ON_TARGET
 *   is NOT a separate shot — it's the same attempt, just with on-target flag)
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
