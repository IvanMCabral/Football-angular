import { clampFieldPercent } from '../../shared/utils/field-percent.utils';

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
