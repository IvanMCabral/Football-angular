import {
  computeSquadEditorSlotCenter,
  computeSquadEditorFieldDropPercent,
  findClosestSquadEditorSubdivision,
  getSquadEditorFormationPositionCoord,
  getSquadEditorMarkerCoord,
  isPointInsideInsetRect,
  isPointOverAnyInsetRect,
  isSquadEditorDropNearSlotCenter,
  squadEditorSubdivisionIdFromDropListId,
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

  it('prefers canonical formation coordinates for slot centers', () => {
    const center = computeSquadEditorSlotCenter({
      canonicalX: 44,
      canonicalY: 66,
      slotRect: { left: 0, top: 0, width: 100, height: 100 },
    });

    expect(center).toEqual({ x: 44, y: 66 });
  });

  it('falls back to the visual subdivision center when canonical coordinates are missing', () => {
    const center = computeSquadEditorSlotCenter({
      canonicalX: null,
      canonicalY: null,
      slotRect: { left: 10, top: 20, width: 30, height: 40 },
    });

    expect(center).toEqual({ x: 25, y: 40 });
  });

  it('uses an explicit threshold to decide whether a free drop should snap back to slot center', () => {
    expect(isSquadEditorDropNearSlotCenter({
      drop: { xPct: 51, yPct: 50 },
      center: { x: 50, y: 50 },
    })).toBeTrue();

    expect(isSquadEditorDropNearSlotCenter({
      drop: { xPct: 52, yPct: 50 },
      center: { x: 50, y: 50 },
    })).toBeFalse();
  });

  it('parses subdivision ids from drag-drop list ids', () => {
    expect(squadEditorSubdivisionIdFromDropListId('slot-S13-2')).toBe('S13-2');
    expect(squadEditorSubdivisionIdFromDropListId('bench-list')).toBeNull();
    expect(squadEditorSubdivisionIdFromDropListId('')).toBeNull();
  });

  it('finds the closest usable subdivision', () => {
    const subdivisions: any[] = [
      { subdivisionId: 'far', left: 0, top: 0, width: 10, height: 10 },
      { subdivisionId: 'blocked', left: 40, top: 40, width: 10, height: 10 },
      { subdivisionId: 'near', left: 50, top: 50, width: 10, height: 10 },
    ];

    expect(findClosestSquadEditorSubdivision({
      xPct: 51,
      yPct: 51,
      subdivisions,
      canUseSubdivision: (sub) => sub.subdivisionId !== 'blocked',
    })?.subdivisionId).toBe('near');
  });

  it('reads canonical formation coordinates with clamping', () => {
    const positions: any[] = [
      { subdivisionId: 'A', xPercent: 120, yPercent: -10 },
    ];

    expect(getSquadEditorFormationPositionCoord({ slotId: 'A', axis: 'x', positions })).toBe(100);
    expect(getSquadEditorFormationPositionCoord({ slotId: 'A', axis: 'y', positions })).toBe(0);
    expect(getSquadEditorFormationPositionCoord({ slotId: 'B', axis: 'x', positions })).toBeNull();
  });

  it('resolves marker coordinates from override, canonical slot, visual slot, then fallback', () => {
    const positions: any[] = [{ subdivisionId: 'S1', xPercent: 42, yPercent: 33 }];
    const subdivisions: any[] = [{ subdivisionId: 'S2', left: 10, top: 20, width: 20, height: 30 }];

    expect(getSquadEditorMarkerCoord({
      player: { playerId: 'p1', slotId: 'S1', xPercent: 77 } as any,
      axis: 'x',
      positions,
      subdivisions,
    })).toBe(77);

    expect(getSquadEditorMarkerCoord({
      player: { playerId: 'p2', slotId: 'S1' } as any,
      axis: 'x',
      positions,
      subdivisions,
    })).toBe(42);

    expect(getSquadEditorMarkerCoord({
      player: { playerId: 'p3', slotId: 'S2' } as any,
      axis: 'y',
      positions,
      subdivisions,
    })).toBe(35);

    expect(getSquadEditorMarkerCoord({
      player: { playerId: 'p4' } as any,
      axis: 'x',
      positions,
      subdivisions,
    })).toBe(50);
  });
});
