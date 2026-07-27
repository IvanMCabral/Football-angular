import { PositionPixelCandidate } from '../models/test-harness.model';
import { clampFieldPercent, parseFieldSubdivision } from './position-pixel-analysis';

export interface PositionMovementPreset {
  label: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export type TacticalLine = 'DEF' | 'MID' | 'ATT';

export function positionMovementPresets(fromX: number, fromY: number): PositionMovementPreset[] {
  const wideDelta = fromX <= 50 ? -5 : 5;
  const centerDelta = fromX <= 50 ? 5 : -5;
  const crossDelta = fromY <= 50 ? 18 : -18;
  return [
    { label: '1px forward', x: clampFieldPercent(fromX), y: clampFieldPercent(fromY - 1), dx: 0, dy: -1 },
    { label: '5px forward', x: clampFieldPercent(fromX), y: clampFieldPercent(fromY - 5), dx: 0, dy: -5 },
    { label: '5px deeper', x: clampFieldPercent(fromX), y: clampFieldPercent(fromY + 5), dx: 0, dy: 5 },
    { label: '5px wide', x: clampFieldPercent(fromX + wideDelta), y: clampFieldPercent(fromY), dx: wideDelta, dy: 0 },
    { label: '5px center', x: clampFieldPercent(fromX + centerDelta), y: clampFieldPercent(fromY), dx: centerDelta, dy: 0 },
    { label: '5px wide forward', x: clampFieldPercent(fromX + wideDelta), y: clampFieldPercent(fromY - 5), dx: wideDelta, dy: -5 },
    { label: '5px wide deeper', x: clampFieldPercent(fromX + wideDelta), y: clampFieldPercent(fromY + 5), dx: wideDelta, dy: 5 },
    { label: '5px center forward', x: clampFieldPercent(fromX + centerDelta), y: clampFieldPercent(fromY - 5), dx: centerDelta, dy: -5 },
    { label: '5px center deeper', x: clampFieldPercent(fromX + centerDelta), y: clampFieldPercent(fromY + 5), dx: centerDelta, dy: 5 },
    {
      label: 'big zone cross',
      x: clampFieldPercent(50),
      y: clampFieldPercent(fromY + crossDelta),
      dx: clampFieldPercent(50) - clampFieldPercent(fromX),
      dy: crossDelta,
    },
  ];
}

export function manualShapeVsPresetPresets(
  fromX: number,
  fromY: number,
  visualLine: TacticalLine
): PositionMovementPreset[] {
  const toCenter = clampFieldPercent(50) - clampFieldPercent(fromX);
  const smallCenterStep = Math.max(-5, Math.min(5, toCenter));
  if (visualLine === 'DEF') {
    return [
      preset('manual 4-4-2 same spot', fromX, fromY, 0, 0),
      preset('manual DEF 5px step', fromX, fromY - 5, 0, -5),
      preset('manual DEF 10px step', fromX, fromY - 10, 0, -10),
      preset('manual DEF tuck center', fromX + smallCenterStep, fromY, smallCenterStep, 0),
      preset('manual DEF line break', fromX + smallCenterStep, 58, smallCenterStep, clampFieldPercent(58) - clampFieldPercent(fromY)),
    ];
  }
  if (visualLine === 'ATT') {
    return [
      preset('manual 4-4-2 same spot', fromX, fromY, 0, 0),
      preset('manual ATT 5px higher', fromX, fromY - 5, 0, -5),
      preset('manual ATT 10px higher', fromX, fromY - 10, 0, -10),
      preset('manual ATT half-space', fromX + smallCenterStep, fromY + 2, smallCenterStep, 2),
      preset('manual ATT drop to 4-2-3-1', fromX + smallCenterStep, 38, smallCenterStep, clampFieldPercent(38) - clampFieldPercent(fromY)),
    ];
  }
  const wideDelta = fromX <= 50 ? -6 : 6;
  return [
    preset('manual 4-4-2 same spot', fromX, fromY, 0, 0),
    preset('manual MID 5px higher', fromX, fromY - 5, 0, -5),
    preset('manual MID 10px higher', fromX, fromY - 10, 0, -10),
    preset('manual MID tuck center', fromX + smallCenterStep, fromY, smallCenterStep, 0),
    preset('manual MID wide to 4-3-3', fromX + wideDelta, 25, wideDelta, clampFieldPercent(25) - clampFieldPercent(fromY)),
  ];
}

export function wingbackMovementPresets(fromX: number, fromY: number, candidate: PositionPixelCandidate): PositionMovementPreset[] {
  const slotSide = wingbackSlotSide(candidate.slotId);
  const wideDelta = slotSide === 'left' ? -4 : slotSide === 'right' ? 4 : fromX <= 50 ? -4 : 4;
  const centerDelta = -wideDelta;
  return [
    preset('WB 5px forward', fromX, fromY - 5, 0, -5),
    preset('WB 5px deeper', fromX, fromY + 5, 0, 5),
    preset('WB hug touchline', fromX + wideDelta, fromY, wideDelta, 0),
    preset('WB tuck inside', fromX + centerDelta, fromY, centerDelta, 0),
  ];
}

export function wingbackSlotSide(slotId: string | null | undefined): 'left' | 'right' | null {
  const parsed = parseFieldSubdivision(slotId);
  if (!parsed) return null;
  const [, subIndex] = parsed;
  if (subIndex === 1) return 'left';
  if (subIndex === 3) return 'right';
  return null;
}

export function manualExtremeMovementPresets(
  fromX: number,
  fromY: number,
  candidate: PositionPixelCandidate,
  lineForCandidate: TacticalLine
): PositionMovementPreset[] {
  const sideX = fromX <= 50 ? 18 : 82;
  const halfSpaceX = fromX <= 50 ? 38 : 62;
  const overlapX = fromX <= 50 ? 12 : 88;
  const presets = lineForCandidate === 'ATT'
    ? [
        { label: 'ATT wide channel', x: sideX, y: 18 },
        { label: 'ATT half-space', x: halfSpaceX, y: 24 },
        { label: 'ATT drop link', x: 50, y: 42 },
      ]
    : lineForCandidate === 'MID'
      ? [
          { label: 'MID late run', x: clampFieldPercent(fromX), y: 26 },
          { label: 'MID wide overload', x: sideX, y: 38 },
          { label: 'MID anchor drop', x: 50, y: 70 },
        ]
      : [
          { label: 'DEF step midfield', x: clampFieldPercent(fromX), y: 58 },
          { label: 'DEF overlap lane', x: overlapX, y: 48 },
          { label: 'DEF cover depth', x: clampFieldPercent(fromX), y: 90 },
        ];
  return presets
    .map((item) => preset(item.label, item.x, item.y, clampFieldPercent(item.x) - clampFieldPercent(fromX), clampFieldPercent(item.y) - clampFieldPercent(fromY)))
    .filter((item) => Math.abs(item.dx) + Math.abs(item.dy) >= 6);
}

export function positionMicroMovementPresets(fromX: number, fromY: number): PositionMovementPreset[] {
  const wideDelta = fromX <= 50 ? -1 : 1;
  const centerDelta = fromX <= 50 ? 1 : -1;
  return [
    preset('1px forward', fromX, fromY - 1, 0, -1),
    preset('1px deeper', fromX, fromY + 1, 0, 1),
    preset('1px wide', fromX + wideDelta, fromY, wideDelta, 0),
    preset('1px center', fromX + centerDelta, fromY, centerDelta, 0),
  ];
}

function preset(label: string, x: number, y: number, dx: number, dy: number): PositionMovementPreset {
  return {
    label,
    x: clampFieldPercent(x),
    y: clampFieldPercent(y),
    dx,
    dy,
  };
}

