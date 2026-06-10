/**
 * V24D6O: Shot map geometry and projection helpers.
 *
 * Coordinate system: the backend stores shotCoordinate.{x,y} as
 * normalized 0..100 values where:
 *   - x=0   is the LEFT goal line
 *   - x=100 is the RIGHT goal line
 *   - y=0   is the TOP touchline
 *   - y=100 is the BOTTOM touchline
 *
 * The V24 generator normalizes every shot as "attacking goal at x=100",
 * so the away team must be mirrored horizontally when rendered on the
 * same pitch.
 *
 * The pitch is drawn in a 100x100 logical space; CSS positions the
 * elements as percentages. Geometry constants below define the official
 * V24 spec (see V24D3 plan): penalty box depth 18, vertical span 21..79,
 * six-yard depth 6, vertical span 36..64, goal vertical span 44..56.
 */

export const PITCH_GEOMETRY = {
  penaltyBox: { depthStart: 0, depthEnd: 18, yStart: 21, yEnd: 79 },
  sixYardBox: { depthStart: 0, depthEnd: 6, yStart: 36, yEnd: 64 },
  goal: { depthStart: 0, depthEnd: 2, yStart: 44, yEnd: 56 },
  penaltySpotOffset: 12,
  centerCircleRadius: 9.15,
} as const;

export type ShotSide = 'home' | 'away' | 'unknown';

export interface ProjectedShot {
  side: ShotSide;
  isGoal: boolean;
  x: number; // 0..100, visual position on the rendered pitch
  y: number; // 0..100
  key: string; // stable key for *ngFor trackBy
  minute: number;
  type: string;
  playerName: string;
  xg: number | null;
  description: string;
  location: string | null;
  rawTeamId: string;
}

export interface ShotInput {
  teamId: string;
  type: string;
  minute: number;
  playerName: string;
  xg?: number | null;
  description: string;
  shotCoordinate?: { x: number; y: number; location?: string } | null;
}

export interface ShotProjectionContext {
  homeTeamId: string | null | undefined;
  awayTeamId: string | null | undefined;
}

export function projectShotX(
  shot: ShotInput,
  ctx: ShotProjectionContext
): number {
  if (!shot.shotCoordinate) return 50;
  const raw = clamp(shot.shotCoordinate.x, 0, 100);
  if (shot.teamId && ctx.homeTeamId && shot.teamId === ctx.homeTeamId) {
    return raw;
  }
  if (shot.teamId && ctx.awayTeamId && shot.teamId === ctx.awayTeamId) {
    return 100 - raw;
  }
  // Unknown teamId: render as-is (no mirror). This should not happen in
  // fresh persisted data; it is only defensive for old records.
  return raw;
}

export function projectShotY(shot: ShotInput): number {
  if (!shot.shotCoordinate) return 50;
  return clamp(shot.shotCoordinate.y, 0, 100);
}

export function classifyShotSide(
  shot: ShotInput,
  ctx: ShotProjectionContext
): ShotSide {
  if (!shot.teamId) return 'unknown';
  if (ctx.homeTeamId && shot.teamId === ctx.homeTeamId) return 'home';
  if (ctx.awayTeamId && shot.teamId === ctx.awayTeamId) return 'away';
  return 'unknown';
}

export function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
