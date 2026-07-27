/**
 * Single source of truth for the formations exposed by the backend.
 * Keep this order stable because dropdowns and smoke tests rely on it.
 */
export const ALL_FORMATIONS = [
  '4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3',
  '3-5-2-CDM', '5-4-1', '3-4-1-2', '4-2-2-2', '4-1-2-3'
] as const;

/** Union type derived from {@link ALL_FORMATIONS}. */
export type FormationCode = typeof ALL_FORMATIONS[number];

/**
 * UI-only label for a manually adjusted shape that no longer matches a
 * canonical formation. It is never sent to the backend.
 */
export const USER_FORMATION_LABEL = 'Formación manual';
