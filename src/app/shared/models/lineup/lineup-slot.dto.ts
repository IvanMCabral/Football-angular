/**
 * Slot persistido en el body de POST /career/lineup/manual-select.
 *
 * <p>Nuevo en MVP1-lineup-cancha-1: el front envía slots opcionales junto
 * con playerIds para que el back persista la subdivisionId por jugador.
 *
 * <p>Si el array {@code slots} viene vacío o ausente, el back aplica
 * backward compat y NO escribe el subdivision map (los slots se inferirán
 * del role del jugador al reabrir el modal).
 *
 * <p>V25D98-FRONT: agregó {@link customXPercent} / {@link customYPercent}
 * opcionales para persistir la posición libre (free positioning) cuando el
 * user dropea un player fuera de un slot. El back puede ignorar estos campos
 * (backward compat) o persistirlos si quiere. Mientras tanto, el front los
 * mantiene en memoria para la sesión actual.
 */
export interface LineupSlotDTO {
  playerId: string;
  subdivisionId: string;
  /** V25D98-FRONT: posición libre X (%). Ausente = snap a subdivisionId. */
  customXPercent?: number;
  /** V25D98-FRONT: posición libre Y (%). Ausente = snap a subdivisionId. */
  customYPercent?: number;
}