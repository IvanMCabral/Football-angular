/**
 * V24D6U3: Warning DTO surfaced by the backend on auto-select / manual-select.
 *
 * <p>Warnings are non-fatal: the match is still playable but degraded. The
 * UI renders them as inline banners (yellow). Fatal errors (too few
 * players, etc.) come back as 4xx and are handled separately via
 * {@code lineupError$}.
 */
export type LineupWarningSeverity = 'WARNING' | 'ERROR';

export type LineupWarningCode =
  | 'LINEUP_SHORT_HANDED'
  | 'LINEUP_NO_GOALKEEPER'
  | 'LINEUP_MINIMUM_PLAYERS_NOT_MET';

export interface LineupWarningDTO {
  /** Backend warning code. `string` fallback for forward-compat. */
  code: LineupWarningCode | string;
  /** Severity. WARNING for soft warnings, ERROR for 4xx payloads. */
  severity: LineupWarningSeverity;
  /** Human-readable message. Spanish (es-neutro). */
  message: string;
}
