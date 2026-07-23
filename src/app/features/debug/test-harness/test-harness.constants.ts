export const TIMELINE_DEBOUNCE_MS = 150;
export const TIMELINE_MAX_MINUTE = 90;
export const TIMELINE_STEP = 5;

/**
 * Default seed for the "Repetir con seed" button.
 *
 * Keep this aligned with the regression-test baseline so the same match can
 * be replayed from a known result with one click. The user can still override
 * it from the harness UI.
 */
export const DEFAULT_REPLAY_SEED = 12345;

export const CURRENT_LINEUP_MULTI_SEED_COUNT = 5;
export const CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS = 15000;
export const SINGLE_MATCH_REPLAY_TIMEOUT_MS = 60000;
