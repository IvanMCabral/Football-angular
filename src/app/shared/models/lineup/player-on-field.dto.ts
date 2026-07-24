/**
 * Internal shape used by SquadEditorModalComponent for a player placed on the
 * pitch. It is mapped to LineupSlotDTO when saving the manual lineup.
 */
export interface PlayerOnFieldDto {
  playerId: string;
  name: string;
  position: string;
  role: string;
  overall: number;
  /** Assigned subdivision id, or an empty string when the player is on the bench. */
  slotId: string;
  stamina: number;
  active: boolean;
  isEmpty: boolean;
  injured?: boolean;
  /**
   * Free-positioning X override, as a percentage of the field width.
   * When set, the marker renders here instead of snapping to the slot center.
   */
  xPercent?: number;
  /**
   * Free-positioning Y override, as a percentage of the field height.
   * When set, the marker renders here instead of snapping to the slot center.
   */
  yPercent?: number;
  /**
   * Optional player attributes used by the team stats panel. When absent, the
   * UI falls back to overall.
   */
  attack?: number;
  defense?: number;
  technique?: number;
  speed?: number;
  mentality?: number;
}
