import { clampFieldPercent } from '../../shared/utils/field-percent.utils';
import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';
import { FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';

export interface SquadEditorPoint {
  x: number;
  y: number;
}

export interface SquadEditorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SquadEditorFieldDropPercent {
  xPct: number;
  yPct: number;
}

export interface SquadEditorSlotCenterInput {
  canonicalX: number | null;
  canonicalY: number | null;
  slotRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
}

export interface SquadEditorSlotCenter {
  x: number | null;
  y: number | null;
}

export function isPointInsideInsetRect(
  point: SquadEditorPoint,
  rect: SquadEditorRect,
  insetRatio = 0.25
): boolean {
  const insetLeft = rect.left + rect.width * insetRatio;
  const insetRight = rect.right - rect.width * insetRatio;
  const insetTop = rect.top + rect.height * insetRatio;
  const insetBottom = rect.bottom - rect.height * insetRatio;

  return point.x >= insetLeft
    && point.x <= insetRight
    && point.y >= insetTop
    && point.y <= insetBottom;
}

export function isPointOverAnyInsetRect(
  point: SquadEditorPoint,
  rects: readonly SquadEditorRect[],
  insetRatio = 0.25
): boolean {
  return rects.some((rect) => isPointInsideInsetRect(point, rect, insetRatio));
}

export function computeSquadEditorFieldDropPercent(params: {
  dropPoint: SquadEditorPoint;
  pickupOffset: SquadEditorPoint;
  fieldRect: Pick<SquadEditorRect, 'left' | 'top' | 'width' | 'height'>;
  markerHalfHeight: number;
  markerCenterXOffset?: number;
}): SquadEditorFieldDropPercent {
  const markerCenterXOffset = params.markerCenterXOffset ?? 35;

  return {
    xPct: clampFieldPercent(
      ((params.dropPoint.x - params.pickupOffset.x + markerCenterXOffset - params.fieldRect.left)
        / params.fieldRect.width) * 100
    ),
    yPct: clampFieldPercent(
      ((params.dropPoint.y - params.pickupOffset.y + params.markerHalfHeight - params.fieldRect.top)
        / params.fieldRect.height) * 100
    ),
  };
}

export function computeSquadEditorSlotCenter(input: SquadEditorSlotCenterInput): SquadEditorSlotCenter {
  return {
    x: input.canonicalX ?? (input.slotRect ? input.slotRect.left + input.slotRect.width / 2 : null),
    y: input.canonicalY ?? (input.slotRect ? input.slotRect.top + input.slotRect.height / 2 : null),
  };
}

export function isSquadEditorDropNearSlotCenter(params: {
  drop: SquadEditorFieldDropPercent;
  center: SquadEditorSlotCenter;
  thresholdPct?: number;
}): boolean {
  const thresholdPct = params.thresholdPct ?? 1.5;
  if (params.center.x === null || params.center.y === null) {
    return false;
  }

  return Math.hypot(params.drop.xPct - params.center.x, params.drop.yPct - params.center.y) <= thresholdPct;
}

export function squadEditorSubdivisionIdFromDropListId(dropListId: string): string | null {
  if (!dropListId || !dropListId.startsWith('slot-')) { return null; }
  return dropListId.substring('slot-'.length);
}

export function findClosestSquadEditorSubdivision(params: {
  xPct: number;
  yPct: number;
  subdivisions: readonly FieldSubdivisionDTO[];
  canUseSubdivision?: (subdivision: FieldSubdivisionDTO) => boolean;
}): FieldSubdivisionDTO | null {
  let best: FieldSubdivisionDTO | null = null;
  let bestDist = Infinity;

  for (const sub of params.subdivisions) {
    if (params.canUseSubdivision && !params.canUseSubdivision(sub)) {
      continue;
    }

    const centerX = sub.left + sub.width / 2;
    const centerY = sub.top + sub.height / 2;
    const distance = Math.hypot(centerX - params.xPct, centerY - params.yPct);
    if (distance < bestDist) {
      bestDist = distance;
      best = sub;
    }
  }

  return best;
}

export function getSquadEditorFormationPositionCoord(params: {
  slotId: string;
  axis: 'x' | 'y';
  positions: readonly FormationPositionDTO[] | undefined;
}): number | null {
  const pos = params.positions?.find(p => p.subdivisionId === params.slotId);
  if (!pos) { return null; }

  const value = params.axis === 'x' ? pos.xPercent : pos.yPercent;
  if (typeof value !== 'number' || !isFinite(value)) { return null; }
  return clampFieldPercent(value);
}

export function getSquadEditorMarkerCoord(params: {
  player: PlayerOnFieldDto;
  axis: 'x' | 'y';
  positions: readonly FormationPositionDTO[] | undefined;
  subdivisions: readonly FieldSubdivisionDTO[];
  fallback?: number;
}): number {
  const override = params.axis === 'x'
    ? params.player.xPercent
    : params.player.yPercent;
  const fallback = params.fallback ?? 50;

  if (typeof override === 'number' && isFinite(override)) {
    return clampFieldPercent(override);
  }
  if (!params.player.slotId) { return fallback; }

  const formationCoord = getSquadEditorFormationPositionCoord({
    slotId: params.player.slotId,
    axis: params.axis,
    positions: params.positions,
  });
  if (formationCoord !== null) { return formationCoord; }

  const sub = params.subdivisions.find(s => s.subdivisionId === params.player.slotId);
  if (!sub) { return fallback; }

  const center = params.axis === 'x'
    ? sub.left + sub.width / 2
    : sub.top + sub.height / 2;
  return isFinite(center) ? center : fallback;
}
