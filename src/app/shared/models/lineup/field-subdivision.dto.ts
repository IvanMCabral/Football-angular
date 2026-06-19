/**
 * DTO de subdivisión del campo de fútbol (response de GET /editor/subdivisions).
 *
 * <p>Replicado de {@code com.footballmanager.adapters.in.web.career.lineup.dto.FieldSubdivisionDTO}.
 * 81 subdivisiones normales (27 sectores × 3 sub-espacios) + 1 GK = 82 totales.
 *
 * <p>Coordenadas en % relativos al field (0-100). El campo está orientado
 * vertical: top% bajo = zona de ATAQUE; top% alto = zona DEFENSA.
 */
export interface FieldSubdivisionDTO {
  sector: number;
  subIndex: number;
  isGoalkeeper: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  subdivisionId: string;
  zone: 'ATTACK' | 'MIDFIELD' | 'DEFENSE' | 'GK' | string;
}