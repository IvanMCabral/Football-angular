import { clampPartidoPercent } from './partido-modal-player-coords-storage.utils';
import { tacticalSlotCoords } from '../../../../shared/constants/tactical-layouts';

export interface PartidoSlotCoords {
  x: number;
  y: number;
}

export interface PartidoBackendSlot {
  sessionPlayerId: string;
  position: string;
  slotIndex: number;
  customXPercent?: number | null;
  customYPercent?: number | null;
}

export function roleLabelForPartidoSlot(
  formationLines: Record<string, string[][]>,
  formation: string,
  slotIdx: number
): string | null {
  let current = 0;
  for (const line of formationLines[formation] ?? []) {
    for (const role of line) {
      if (current === slotIdx) return role;
      current++;
    }
  }
  return null;
}

export function basePartidoSlotCoords(
  formationLines: Record<string, string[][]>,
  formation: string,
  slotIdx: number
): PartidoSlotCoords {
  return tacticalSlotCoords(formation, slotIdx);
}

export function partidoSlotsDifferFromInitial(
  currentAssignments: Map<number, string | null>,
  initialAssignments: Map<number, string | null>,
  currentCoords: Map<number, PartidoSlotCoords>,
  initialCoords: Map<number, PartidoSlotCoords>
): boolean {
  if (currentAssignments.size !== initialAssignments.size) return true;
  for (const [idx, pid] of currentAssignments) {
    if ((pid ?? '') !== (initialAssignments.get(idx) ?? '')) return true;
  }

  if (currentCoords.size !== initialCoords.size) return true;
  for (const [idx, coords] of currentCoords) {
    const initial = initialCoords.get(idx);
    if (!initial) return true;
    if (Math.abs(coords.x - initial.x) > 0.001 || Math.abs(coords.y - initial.y) > 0.001) return true;
  }

  return false;
}

export function capturePartidoSlotCoordsSnapshot(
  coords: Map<number, PartidoSlotCoords>
): Map<number, PartidoSlotCoords> {
  return new Map(
    Array.from(coords.entries()).map(([slotIdx, value]) => [
      slotIdx,
      { x: clampPartidoPercent(value.x), y: clampPartidoPercent(value.y) }
    ])
  );
}

export function buildPartidoSlotListForBackend(
  formationLines: Record<string, string[][]>,
  formation: string,
  slotAssignments: Map<number, string | null>,
  freeSlotCoords: Map<number, PartidoSlotCoords>
): PartidoBackendSlot[] {
  const slots: PartidoBackendSlot[] = [];
  let slotIdx = 0;

  for (const line of formationLines[formation] ?? []) {
    for (const role of line) {
      const coords = freeSlotCoords.get(slotIdx);
      slots.push({
        sessionPlayerId: slotAssignments.get(slotIdx) ?? '',
        position: role,
        slotIndex: slotIdx,
        customXPercent: coords?.x ?? null,
        customYPercent: coords?.y ?? null
      });
      slotIdx++;
    }
  }

  return slots;
}

export function swapPartidoFreeSlotCoords(
  coords: Map<number, PartidoSlotCoords>,
  a: number,
  b: number
): Map<number, PartidoSlotCoords> {
  const next = new Map(coords);
  const aCoords = next.get(a);
  const bCoords = next.get(b);

  if (bCoords) next.set(a, bCoords); else next.delete(a);
  if (aCoords) next.set(b, aCoords); else next.delete(b);

  return next;
}
