/**
 * Posición de formación (response de GET /editor/formations).
 *
 * <p>Replicado de {@code com.footballmanager.adapters.in.web.career.lineup.dto.FormationPositionDTO}.
 *
 * <p>Coordenadas en % relativos al field. La {@code subdivisionId} apunta
 * a la subdivisión donde el jugador debe renderizarse.
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
 * Formación táctica completa con sus posiciones.
 *
 * <p>Replicado de {@code com.footballmanager.adapters.in.web.career.lineup.dto.FormationDTO}.
 * Las posiciones marcan los slots "recommended" del campo para esta formación
 * (lo que el modal resalta visualmente).
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