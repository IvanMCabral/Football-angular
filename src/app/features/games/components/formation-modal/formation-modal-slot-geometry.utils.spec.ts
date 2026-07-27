import {
  buildFormationBackendSlots,
  defaultCoordForFormationSlot,
  formationCoordsDifferFromDefault,
  roleForFormationSlot
} from './formation-modal-slot-geometry.utils';

const lines = {
  '4-4-2': [['GK'], ['LB', 'CB', 'CB', 'RB'], ['LM', 'CM', 'CM', 'RM'], ['ST', 'ST']]
};

describe('formation-modal-slot-geometry utils', () => {
  it('returns default slot coordinates from formation lines', () => {
    expect(defaultCoordForFormationSlot(lines, '4-4-2', 0)).toEqual({ x: 50, y: 20 });
    expect(defaultCoordForFormationSlot(lines, '4-4-2', 1)).toEqual({ x: 20, y: 40 });
  });

  it('finds role labels by slot index', () => {
    expect(roleForFormationSlot(lines, '4-4-2', 0)).toBe('GK');
    expect(roleForFormationSlot(lines, '4-4-2', 10)).toBe('ST');
    expect(roleForFormationSlot(lines, 'missing', 0)).toBe('?');
  });

  it('builds backend slots with custom or default coordinates', () => {
    const result = buildFormationBackendSlots({
      formationLinesByFormation: lines,
      formation: '4-4-2',
      slotAssignments: new Map([[0, 'gk']]),
      slotCoords: new Map([[0, { x: 51, y: 19 }]])
    });

    expect(result[0]).toEqual({
      sessionPlayerId: 'gk',
      position: 'GK',
      slotIndex: 0,
      customXPercent: 51,
      customYPercent: 19
    });
    expect(result.length).toBe(11);
  });

  it('detects custom coordinates against defaults', () => {
    expect(formationCoordsDifferFromDefault({
      formationLinesByFormation: lines,
      formation: '4-4-2',
      slotCoords: new Map([[0, { x: 50.2, y: 20.2 }]])
    })).toBeFalse();
    expect(formationCoordsDifferFromDefault({
      formationLinesByFormation: lines,
      formation: '4-4-2',
      slotCoords: new Map([[0, { x: 51, y: 20 }]])
    })).toBeTrue();
  });
});

