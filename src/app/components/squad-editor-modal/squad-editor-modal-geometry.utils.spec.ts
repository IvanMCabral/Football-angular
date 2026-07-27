import {
  computeSquadEditorFieldDropPercent,
  isPointInsideInsetRect,
  isPointOverAnyInsetRect,
} from './squad-editor-modal-geometry.utils';

describe('squad-editor-modal-geometry utils', () => {
  it('detects points inside the useful inner area of a rectangle', () => {
    const rect = { left: 10, top: 20, right: 110, bottom: 220, width: 100, height: 200 };

    expect(isPointInsideInsetRect({ x: 50, y: 100 }, rect)).toBeTrue();
    expect(isPointInsideInsetRect({ x: 12, y: 100 }, rect)).toBeFalse();
    expect(isPointInsideInsetRect({ x: 50, y: 215 }, rect)).toBeFalse();
  });

  it('detects whether a point is over any bench card inner area', () => {
    const rects = [
      { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
      { left: 200, top: 0, right: 300, bottom: 100, width: 100, height: 100 },
    ];

    expect(isPointOverAnyInsetRect({ x: 50, y: 50 }, rects)).toBeTrue();
    expect(isPointOverAnyInsetRect({ x: 250, y: 50 }, rects)).toBeTrue();
    expect(isPointOverAnyInsetRect({ x: 150, y: 50 }, rects)).toBeFalse();
  });

  it('converts browser drop coordinates into clamped field percentages', () => {
    const result = computeSquadEditorFieldDropPercent({
      dropPoint: { x: 350, y: 250 },
      pickupOffset: { x: 35, y: 24 },
      fieldRect: { left: 100, top: 50, width: 500, height: 400 },
      markerHalfHeight: 24,
    });

    expect(result.xPct).toBe(50);
    expect(result.yPct).toBe(50);

    const clamped = computeSquadEditorFieldDropPercent({
      dropPoint: { x: -999, y: 9999 },
      pickupOffset: { x: 35, y: 24 },
      fieldRect: { left: 100, top: 50, width: 500, height: 400 },
      markerHalfHeight: 24,
    });

    expect(clamped.xPct).toBe(0);
    expect(clamped.yPct).toBe(100);
  });
});
