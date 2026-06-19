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
 *   { formation, players[], confirmed, warnings[], slots[] }
 * </pre>
 *
 * <p>{@code slots} (MVP1-lineup-cancha-1) lista las asignaciones
 * {@code playerId → subdivisionId} persistidas. Si está vacío o ausente,
 * el front debe inferir los slots del role del jugador (backward compat
 * con lineups previos al sprint).
 */
export interface LineupDTO {
  formation: string;
  players: PlayerLineupDTO[];
  confirmed: boolean;
  warnings?: LineupWarningDTO[];
  slots?: LineupSlotDTO[];
}
