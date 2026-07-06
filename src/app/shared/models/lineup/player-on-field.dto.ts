/**
 * Representación interna del modal SquadEditorModalComponent de un jugador
 * colocado en un slot del campo.
 *
 * <p>NO es un DTO que viaja al back; es la shape que el modal usa en su
 * estado interno. Cuando el usuario asigna un jugador a un slot, el modal
 * actualiza esta estructura; al guardar, mapea a {@link LineupSlotDTO} para
 * enviar al back vía POST /career/lineup/manual-select.
 *
 * <p>V25D98-FRONT: agregó {@link xPercent} / {@link yPercent} opcionales
 * para soporte de free positioning. Cuando el usuario suelta a un jugador
 * FUERA de cualquier slot (sobre el espacio libre del campo), el modal
 * guarda la posición exacta del drop como porcentaje del field. El marker
 * luego rendere ahí en lugar del slot center. La slotId sigue siendo la
 * última subdivisión canónica asignada (para chemistry / off-role), pero
 * la posición visual es independiente.
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
  /**
   * V25D98-FRONT: override de posición X (en % del field width, [0..100]).
   * Si está definido, el marker rendere aquí en lugar del slot center.
   * Se setea cuando el user dropea al player fuera de cualquier slot.
   */
  xPercent?: number;
  /** V25D98-FRONT: override de posición Y (en % del field height, [0..100]). */
  yPercent?: number;
}