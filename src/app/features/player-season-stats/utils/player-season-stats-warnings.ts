import {
  PlayerSeasonStatsWarning,
  WarningDisplay,
  WarningType
} from '../models/player-season-stats.model';

/**
 * Backend warning code to user-friendly message mapping.
 */
const WARNING_MAP: Record<string, { message: string; type: WarningType }> = {
  LARGE_LIMIT_CLAMPED: {
    message: 'Showing maximum of 200 players per page',
    type: 'warning',
  },
  APPROXIMATE_APPEARANCES: {
    message: 'Appearance counts are approximate',
    type: 'info',
  },
  APPROXIMATE_MATCHES_MISSED: {
    message: 'Injury/suspension absences are estimates',
    type: 'info',
  },
  NO_DETAIL_DATA: {
    message: 'No detail data available',
    type: 'info',
  },
};

/**
 * Default message and type for unknown warning codes.
 */
const UNKNOWN_WARNING: { message: string; type: WarningType } = {
  message: 'Unknown warning',
  type: 'info' as WarningType,
};

/**
 * Translate a single backend warning to a user-friendly WarningDisplay.
 *
 * @param warning Raw warning from backend API
 * @returns Translated warning for UI display
 */
export function translateWarning(warning: PlayerSeasonStatsWarning): WarningDisplay {
  const mapped = WARNING_MAP[warning.code];

  if (mapped) {
    return {
      code: warning.code,
      message: mapped.message,
      type: mapped.type,
    };
  }

  // Fall back to backend message for unknown codes
  return {
    code: warning.code,
    message: warning.message || UNKNOWN_WARNING.message,
    type: UNKNOWN_WARNING.type,
  };
}

/**
 * Translate an array of backend warnings to WarningDisplay array.
 * Filters out warnings that should be handled by empty state instead.
 *
 * @param warnings Array of raw warnings from backend API
 * @returns Filtered and translated warnings for UI display
 */
export function translateWarnings(warnings: PlayerSeasonStatsWarning[]): WarningDisplay[] {
  return warnings
    .filter(warning => shouldDisplayWarning(warning))
    .map(translateWarning);
}

/**
 * Determine if a warning should be displayed in the UI.
 * Some warnings should instead trigger empty state handling.
 *
 * @param warning Raw warning from backend API
 * @returns true if the warning should be displayed, false if it should be handled elsewhere
 */
export function shouldDisplayWarning(warning: PlayerSeasonStatsWarning): boolean {
  // NO_DETAIL_DATA should trigger empty state, not a warning
  // The component should check for this and show "no data" state instead
  return warning.code !== 'NO_DETAIL_DATA';
}

/**
 * Check if a warning is a 'warning' severity (yellow, not info).
 *
 * @param warningDisplay Translated warning
 * @returns true if severity is 'warning'
 */
export function isWarningSeverity(warningDisplay: WarningDisplay): boolean {
  return warningDisplay.type === 'warning';
}

/**
 * Check if a warning is an 'info' severity (blue).
 *
 * @param warningDisplay Translated warning
 * @returns true if severity is 'info'
 */
export function isInfoSeverity(warningDisplay: WarningDisplay): boolean {
  return warningDisplay.type === 'info';
}

/**
 * Get all warnings of 'warning' severity from a list.
 *
 * @param warnings List of translated warnings
 * @returns Filtered list of only warning-severity items
 */
export function getWarningsByType(warnings: WarningDisplay[], type: WarningType): WarningDisplay[] {
  return warnings.filter(w => w.type === type);
}