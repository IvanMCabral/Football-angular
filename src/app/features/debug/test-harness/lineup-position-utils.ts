import { FormationDTO } from '../../../shared/models/lineup/formation.dto';
import { LineupDTO } from '../../../shared/models/lineup/lineup.dto';
import { LineupSlotDTO } from '../../../shared/models/lineup/lineup-slot.dto';
import {
  clampFieldPercent,
  parseFieldSubdivision,
  subdivisionXPercent,
  subdivisionYPercent,
} from './position-pixel-analysis';

export type PositionPixelLine = 'DEF' | 'MID' | 'ATT';

export function fallbackYForPosition(position: string | null | undefined): number {
  const p = String(position ?? '').toUpperCase();
  if (p === 'GK') return 94;
  if (p === 'DEF') return 78;
  if (p === 'ATT' || p === 'WINGER' || p === 'ST' || p === 'CF' || p === 'LW' || p === 'RW') return 18;
  return 52;
}

export function canonicalXPercent(
  slot: LineupSlotDTO | null | undefined,
  formationPosition: FormationDTO['positions'][number] | null
): number | null {
  if (formationPosition && Number.isFinite(formationPosition.xPercent)) {
    return clampFieldPercent(formationPosition.xPercent);
  }
  const parsed = parseFieldSubdivision(slot?.subdivisionId);
  if (!parsed) return null;
  const [sector, subIndex] = parsed;
  const sectorCol = (sector - 1) % 3;
  const left = (sectorCol * 3 + (subIndex - 1)) * 11.11;
  return clampFieldPercent(left + 11.11 / 2);
}

export function canonicalYPercent(
  slot: LineupSlotDTO | null | undefined,
  formationPosition: FormationDTO['positions'][number] | null
): number | null {
  if (formationPosition && Number.isFinite(formationPosition.yPercent)) {
    return clampFieldPercent(formationPosition.yPercent);
  }
  if (slot?.subdivisionId === 'GK-1') return 93;
  const parsed = parseFieldSubdivision(slot?.subdivisionId);
  if (!parsed) return null;
  const [sector] = parsed;
  const sectorRow = Math.floor((sector - 1) / 3);
  const top = sectorRow * 11.11;
  return clampFieldPercent(top + 11.11 / 2);
}

export function matchContextXPercent(slot: LineupSlotDTO | null | undefined): number | null {
  if (typeof slot?.customXPercent === 'number' && Number.isFinite(slot.customXPercent)) {
    return clampFieldPercent(slot.customXPercent);
  }
  return subdivisionXPercent(slot?.subdivisionId);
}

export function matchContextYPercent(slot: LineupSlotDTO | null | undefined): number | null {
  if (typeof slot?.customYPercent === 'number' && Number.isFinite(slot.customYPercent)) {
    return clampFieldPercent(slot.customYPercent);
  }
  return subdivisionYPercent(slot?.subdivisionId);
}

export function buildLineupSlots(lineup: LineupDTO): LineupSlotDTO[] {
  const slotsByPlayer = new Map((lineup.slots ?? []).map((slot) => [slot.playerId, slot]));
  return (lineup.players ?? [])
    .map((player) => slotsByPlayer.get(player.playerId))
    .filter((slot): slot is LineupSlotDTO => !!slot?.playerId && !!slot?.subdivisionId);
}

export function countCustomMovableSlots(lineup: LineupDTO): number {
  const playerPositionById = new Map((lineup.players ?? []).map((player) => [
    player.playerId,
    String(player.position ?? '').toUpperCase(),
  ]));
  return (lineup.slots ?? []).filter((slot) => {
    const isCustom = Number.isFinite(slot.customXPercent) || Number.isFinite(slot.customYPercent);
    return isCustom && playerPositionById.get(slot.playerId) !== 'GK';
  }).length;
}

export function swapLineupSlot(slots: LineupSlotDTO[], starterPlayerId: string, benchPlayerId: string): LineupSlotDTO[] {
  return slots.map((slot) =>
    slot.playerId === starterPlayerId
      ? { ...slot, playerId: benchPlayerId }
      : { ...slot }
  );
}

export function lineupPlayerIdsFromSlots(slots: LineupSlotDTO[]): string[] {
  return slots.map((slot) => slot.playerId);
}

export function isAttackingPosition(position: string | null | undefined): boolean {
  return ['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM', 'WINGER', 'ATT'].includes(String(position ?? '').toUpperCase());
}

export function positionPixelLine(position: string | null | undefined): PositionPixelLine | null {
  const p = String(position ?? '').toUpperCase();
  if (p === 'GK') return null;
  if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
  if (['MID', 'CM', 'CDM', 'DM', 'CAM', 'AM', 'LM', 'RM'].includes(p)) return 'MID';
  if (isAttackingPosition(p)) return 'ATT';
  return 'MID';
}

export function strictPositionPixelLine(position: string | null | undefined): PositionPixelLine | null {
  const p = String(position ?? '').trim().toUpperCase();
  if (!p || p === 'UNKNOWN' || p === 'NONE') return null;
  if (p === 'GK') return null;
  if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
  if (['MID', 'CM', 'CDM', 'DM', 'CAM', 'AM', 'LM', 'RM'].includes(p)) return 'MID';
  if (isAttackingPosition(p)) return 'ATT';
  return null;
}

