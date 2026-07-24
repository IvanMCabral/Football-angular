/**
 * Slot persisted in POST /career/lineup/manual-select.
 * Free-positioning coordinates are optional for backward compatibility.
 */
export interface LineupSlotDTO {
  playerId: string;
  subdivisionId: string;
  /** Free-positioning X override, as a percentage of the field width. */
  customXPercent?: number;
  /** Free-positioning Y override, as a percentage of the field height. */
  customYPercent?: number;
}
