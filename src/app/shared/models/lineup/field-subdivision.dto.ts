/**
 * Football field subdivision returned by the lineup editor API.
 *
 * The field uses relative coordinates from 0 to 100. Lower top values are the
 * attacking zone; higher top values are the defensive zone.
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
