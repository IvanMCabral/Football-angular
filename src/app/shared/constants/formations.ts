/**
 * V25D55 (Sprint C16) P0.1: shared formation codes constant.
 *
 * <p>Single source of truth for the 12 formations exposed by the back-end
 * (7 originales + 5 nuevas from V25D54-C15). The back-end
 * {@code FormationService.getAllFormations()} is the canonical authority;
 * this constant mirrors it so all front-end dropdowns stay in sync.
 *
 * <p>Before this refactor, four places hardcoded their own formation list:
 * <ul>
 *   <li>{@code formation-modal.component.ts} (12 entries — correct post-C15)</li>
 *   <li>{@code squad-management.component.ts} (7 entries — stale, missing
 *       the 5 nuevas from C15)</li>
 *   <li>{@code squad-editor-modal.component.ts} (7 entries — stale)</li>
 *   <li>{@code test-harness.model.ts} (7 entries — stale, plus a
 *       {@code FormationCode} union type that did not include the 5 nuevas)</li>
 * </ul>
 *
 * <p>All four now import {@link ALL_FORMATIONS} from here, and the
 * {@link FormationCode} union type is derived from the array (no risk of
 * the type and the array drifting out of sync).
 *
 * <h2>Order</h2>
 * <p>The order is stable across the four dropdowns — 7 originales first in
 * their historical order, then 4 P1 nuevas, then the 1 P2 nueva. UI tests
 * that assert on the dropdown order should index this array directly.
 */

/**
 * All formation codes recognized by the V24 + V25 engine. Order:
 * <ol>
 *   <li>7 originales (V25D36-F2)</li>
 *   <li>4 P1 nuevas (V25D54-C15): 3-5-2-CDM, 5-4-1, 3-4-1-2, 4-2-2-2</li>
 *   <li>1 P2 nueva (V25D54-C15): 4-1-2-3</li>
 * </ol>
 */
export const ALL_FORMATIONS = [
  '4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3',
  '3-5-2-CDM', '5-4-1', '3-4-1-2', '4-2-2-2', '4-1-2-3'
] as const;

/**
 * Union type derived from {@link ALL_FORMATIONS}. Use this instead of
 * hand-written union types — TypeScript will fail to compile if a formation
 * is added to the array but not consumed anywhere.
 */
export type FormationCode = typeof ALL_FORMATIONS[number];

/**
 * V25D96 (Sprint V25D96): label used for the "user-custom formation"
 * pseudo-option in the formation dropdown. When the user drag-drops players
 * to non-canonical positions, {@code SquadEditorModalComponent.detectFormation}
 * does not find a match against the 12 canonical formations and the dropdown
 * shows this label as selected.
 *
 * <p>This value is NEVER sent to the backend (POST /career/lineup/manual-select
 * still uses the last canonical {@code selectedFormation}) — the backend would
 * reject it (not in {@link ALL_FORMATIONS}). The persisted lineup is whatever
 * canonical formation the user started from (e.g. 4-4-2) plus the player→slot
 * slotMap; the "user" label is a UI-only artifact.
 *
 * <p>Why a constant here instead of inline in the component: it's displayed in
 * tests (the dropdown selected option text) and referenced by
 * {@code onFormationSelect} as a guard against accidental selection.
 */
export const USER_FORMATION_LABEL = 'Formación del User';