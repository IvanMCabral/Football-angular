/**
 * Formation position returned by the lineup editor API.
 *
 * Coordinates are relative to the pitch. The subdivisionId points to the zone
 * where the player should be rendered.
 */
export interface FormationPositionDTO {
  index: number;
  role: string;
  xPercent: number;
  yPercent: number;
  actionRangePercent: number;
  subdivisionId: string;
}

/**
 * Tactical formation with its recommended pitch slots.
 */
export interface FormationDTO {
  name: string;
  description: string;
  defenders: number;
  midfielders: number;
  attackers: number;
  outfieldPlayers: number;
  positions: FormationPositionDTO[];
}
