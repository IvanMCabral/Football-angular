/**
 * Non-fatal lineup warning returned by the backend.
 *
 * Warnings mean the match is still playable but degraded. Fatal lineup errors
 * are returned separately as failed requests.
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
  /** Human-readable message. Spanish neutral. */
  message: string;
}
