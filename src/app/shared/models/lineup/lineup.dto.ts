import { LineupWarningDTO } from './lineup-warning.dto';
import { LineupSlotDTO } from './lineup-slot.dto';

/**
 * Per-player card DTO returned by the backend lineup endpoints.
 * Mirrors `PlayerLineupDTO` on the backend.
 */
export interface PlayerLineupDTO {
  playerId: string;
  name: string;
  position: string;
  overall: number;
  energy: number;
  injured: boolean;
  age: number;
  yellowCards?: number;
  redCards?: number;
  suspended?: boolean;
  suspensionRemainingMatches?: number;
}

/**
 * V24D6U3 + MVP1-lineup-cancha-1:
 * Response shape of /career/lineup/{current, auto-select, manual-select}.
 *
 * <p>Backend returns:
 * <pre>
 *   { formation, players[], confirmed, warnings[], slots[], chemistryScore? }
 * </pre>
 *
 * <p>{@code slots} (MVP1-lineup-cancha-1) lista las asignaciones
 * {@code playerId → subdivisionId} persistidas. Si está vacío o ausente,
 * el front debe inferir los slots del role del jugador (backward compat
 * con lineups previos al sprint).
 *
 * <p><b>V25D42 (Sprint C7):</b> {@code chemistryScore} (opcional, 0..99) es el
 * team chemistry score agregado del lineup (V25D41 back) — base = AVG de
 * overalls + skill_bonus (team-level MAX per skill) + coverage_bonus.
 * Opcional para backward compat con lineups creados antes de V25D41.
 */
export interface LineupDTO {
  formation: string;
  players: PlayerLineupDTO[];
  confirmed: boolean;
  warnings?: LineupWarningDTO[];
  slots?: LineupSlotDTO[];
  /** V25D42: team chemistry score in [0, 99] (optional, nullable for backward compat). */
  chemistryScore?: number;
}
