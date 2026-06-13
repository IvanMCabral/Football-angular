import { LineupWarningDTO } from './lineup-warning.dto';

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
 * V24D6U3: Response shape of /career/lineup/{current, auto-select, manual-select}.
 *
 * <p>Backend always returns a 4-arg shape since U2:
 *   { formation, players[], confirmed, warnings[] }
 *
 * <p>The `warnings` field defaults to `[]` (or `undefined` on legacy
 * responses) — the UI must treat it as optional.
 */
export interface LineupDTO {
  formation: string;
  players: PlayerLineupDTO[];
  confirmed: boolean;
  warnings?: LineupWarningDTO[];
}
