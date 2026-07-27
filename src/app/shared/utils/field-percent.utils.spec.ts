import {
  clampFieldPercent,
  clampFieldPercentRounded,
  clampFieldPixelTweak,
} from './field-percent.utils';

describe('field-percent utils', () => {
  it('clamps field percentages to the pitch range', () => {
    expect(clampFieldPercent(-5)).toBe(0);
    expect(clampFieldPercent(42.5)).toBe(42.5);
    expect(clampFieldPercent(120)).toBe(100);
  });

  it('rounds clamped field percentages for persisted pixel tweaks', () => {
    expect(clampFieldPercentRounded(44.444)).toBe(44.44);
    expect(clampFieldPercentRounded(100.555)).toBe(100);
  });

  it('clamps live pixel tweaks to the draggable modal range', () => {
    expect(clampFieldPixelTweak(-100)).toBe(-80);
    expect(clampFieldPixelTweak(12)).toBe(12);
    expect(clampFieldPixelTweak(100)).toBe(80);
  });
});
