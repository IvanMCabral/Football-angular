import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';

export type SquadEditorRoleFamily = 'GK' | 'DEF' | 'MID' | 'ATT' | null;

export const SQUAD_EDITOR_GOALKEEPER_SLOT_ID = 'GK-1';

export function isSquadEditorGoalkeeperSlot(slotId: string | null | undefined): boolean {
  return slotId === SQUAD_EDITOR_GOALKEEPER_SLOT_ID;
}

export function canSquadEditorPlayerUseSlot(
  roleFamily: SquadEditorRoleFamily,
  slotId: string | null | undefined
): boolean {
  if (!slotId) {
    return false;
  }

  return roleFamily === 'GK'
    ? isSquadEditorGoalkeeperSlot(slotId)
    : !isSquadEditorGoalkeeperSlot(slotId);
}

export function isInsideSquadEditorGoalkeeperProtectedArea(
  xPct: number,
  yPct: number,
  subdivisions: FieldSubdivisionDTO[]
): boolean {
  const goalkeeperSlot = subdivisions.find(slot => slot.subdivisionId === SQUAD_EDITOR_GOALKEEPER_SLOT_ID);
  if (!goalkeeperSlot) {
    return false;
  }

  return xPct >= goalkeeperSlot.left
    && xPct <= goalkeeperSlot.left + goalkeeperSlot.width
    && yPct >= goalkeeperSlot.top
    && yPct <= goalkeeperSlot.top + goalkeeperSlot.height;
}
