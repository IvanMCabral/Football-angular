/**
 * Representación interna del modal SquadEditorModalComponent de un jugador
 * colocado en un slot del campo.
 *
 * <p>NO es un DTO que viaja al back; es la shape que el modal usa en su
 * estado interno. Cuando el usuario asigna un jugador a un slot, el modal
 * actualiza esta estructura; al guardar, mapea a {@link LineupSlotDTO} para
 * enviar al back vía POST /career/lineup/manual-select.
 */
export interface PlayerOnFieldDto {
  playerId: string;
  name: string;
  position: string;
  role: string;
  overall: number;
  /** subdivisionId del slot asignado, o '' si está en la banca. */
  slotId: string;
  stamina: number;
  active: boolean;
  isEmpty: boolean;
  injured?: boolean;
}