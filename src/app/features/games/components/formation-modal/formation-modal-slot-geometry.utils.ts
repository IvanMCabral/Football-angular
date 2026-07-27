export interface FormationSlotCoords {
  x: number;
  y: number;
}

export interface FormationBackendSlot {
  sessionPlayerId: string;
  position: string;
  slotIndex: number;
  customXPercent: number | null;
  customYPercent: number | null;
}

export function formationLinesFor(
  formationLinesByFormation: Record<string, string[][]>,
  formation: string
): string[][] {
  return formationLinesByFormation[formation] ?? [];
}

export function defaultCoordForFormationSlot(
  formationLinesByFormation: Record<string, string[][]>,
  formation: string,
  slotIdx: number
): FormationSlotCoords {
  const lines = formationLinesFor(formationLinesByFormation, formation);
  let cursor = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
      if (cursor === slotIdx) {
        return {
          x: ((dotIdx + 1) / (line.length + 1)) * 100,
          y: ((lineIdx + 1) / (lines.length + 1)) * 100,
        };
      }
      cursor++;
    }
  }
  return { x: 50, y: 50 };
}

export function roleForFormationSlot(
  formationLinesByFormation: Record<string, string[][]>,
  formation: string,
  slotIdx: number
): string {
  const lines = formationLinesFor(formationLinesByFormation, formation);
  let cursor = 0;
  for (const line of lines) {
    for (const role of line) {
      if (cursor === slotIdx) {
        return role;
      }
      cursor++;
    }
  }
  return '?';
}

export function buildFormationBackendSlots(input: {
  formationLinesByFormation: Record<string, string[][]>;
  formation: string;
  slotAssignments: Map<number, string | null>;
  slotCoords: Map<number, FormationSlotCoords>;
}): FormationBackendSlot[] {
  const lines = formationLinesFor(input.formationLinesByFormation, input.formation);
  const slots: FormationBackendSlot[] = [];
  let slotIdx = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
      const coord = input.slotCoords.get(slotIdx)
        ?? defaultCoordForFormationSlot(input.formationLinesByFormation, input.formation, slotIdx);
      slots.push({
        sessionPlayerId: input.slotAssignments.get(slotIdx) ?? '',
        position: line[dotIdx],
        slotIndex: slotIdx,
        customXPercent: coord.x,
        customYPercent: coord.y
      });
      slotIdx++;
    }
  }
  return slots;
}

export function formationCoordsDifferFromDefault(input: {
  formationLinesByFormation: Record<string, string[][]>;
  formation: string;
  slotCoords: Map<number, FormationSlotCoords>;
}): boolean {
  for (const [slotIdx, coord] of input.slotCoords) {
    const base = defaultCoordForFormationSlot(input.formationLinesByFormation, input.formation, slotIdx);
    if (Math.abs(coord.x - base.x) >= 0.5 || Math.abs(coord.y - base.y) >= 0.5) {
      return true;
    }
  }
  return false;
}

