/**
 * Slot persistido en el body de POST /career/lineup/manual-select.
 *
 * <p>Nuevo en MVP1-lineup-cancha-1: el front envía slots opcionales junto
 * con playerIds para que el back persista la subdivisionId por jugador.
 *
 * <p>Si el array {@code slots} viene vacío o ausente, el back aplica
 * backward compat y NO escribe el subdivision map (los slots se inferirán
 * del role del jugador al reabrir el modal).
 */
export interface LineupSlotDTO {
  playerId: string;
  subdivisionId: string;
}