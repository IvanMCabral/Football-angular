import {
  manualShapeVsPresetPresets,
  positionMicroMovementPresets,
  positionMovementPresets,
  wingbackMovementPresets,
  wingbackSlotSide,
} from './position-movement-presets';
import { PositionPixelCandidate } from '../models/test-harness.model';

const candidate = (slotId: string): PositionPixelCandidate => ({
  starterId: 'player-1',
  starterName: 'Player',
  starterPosition: 'MID',
  slotId,
});

describe('position-movement-presets', () => {
  it('keeps one-pixel movement presets available for pixel sensitivity smoke tests', () => {
    const presets = positionMicroMovementPresets(40, 50);

    expect(presets.map((preset) => preset.label)).toEqual([
      '1px forward',
      '1px deeper',
      '1px wide',
      '1px center',
    ]);
    expect(presets[0]).toEqual({ label: '1px forward', x: 40, y: 49, dx: 0, dy: -1 });
  });

  it('builds broad movement presets without moving outside the field', () => {
    const presets = positionMovementPresets(2, 99);

    expect(presets.every((preset) => preset.x >= 0 && preset.x <= 100)).toBeTrue();
    expect(presets.every((preset) => preset.y >= 0 && preset.y <= 100)).toBeTrue();
    expect(presets.some((preset) => preset.label === 'big zone cross')).toBeTrue();
  });

  it('detects wingback side from tactical slot id', () => {
    expect(wingbackSlotSide('S4-1')).toBe('left');
    expect(wingbackSlotSide('S4-3')).toBe('right');
    expect(wingbackSlotSide('S4-2')).toBeNull();
  });

  it('moves wingbacks toward the expected touchline and inside lane', () => {
    const presets = wingbackMovementPresets(30, 60, candidate('S4-1'));

    expect(presets.find((preset) => preset.label === 'WB hug touchline')?.dx).toBe(-4);
    expect(presets.find((preset) => preset.label === 'WB tuck inside')?.dx).toBe(4);
  });

  it('keeps manual shape presets tied to the visual tactical line', () => {
    expect(manualShapeVsPresetPresets(40, 80, 'DEF').some((preset) => preset.label === 'manual DEF line break')).toBeTrue();
    expect(manualShapeVsPresetPresets(40, 18, 'ATT').some((preset) => preset.label === 'manual ATT drop to 4-2-3-1')).toBeTrue();
    expect(manualShapeVsPresetPresets(40, 50, 'MID').some((preset) => preset.label === 'manual MID wide to 4-3-3')).toBeTrue();
  });
});
