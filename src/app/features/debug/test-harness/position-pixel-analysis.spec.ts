import {
  positionPixelDistance,
  positionPixelMovementConfidence,
  positionPixelSignalClass,
  positionPixelSignalDetail,
  positionPixelSignalRead,
  positionPixelSignalScore,
} from './position-pixel-analysis';

describe('position-pixel-analysis', () => {
  const baseRow = {
    fromXPercent: 50,
    fromYPercent: 50,
    targetXPercent: 50,
    targetYPercent: 50,
    deltaXgFor: 0,
    deltaXgAgainst: 0,
    deltaXgDiff: 0,
    deltaCentralXgFor: 0,
    deltaWideXgFor: 0,
    deltaLongXgFor: 0,
    deltaCentralXgAgainst: 0,
    deltaWideXgAgainst: 0,
    deltaLongXgAgainst: 0,
    deltaLeftWideXgFor: 0,
    deltaRightWideXgFor: 0,
    deltaLeftWideXgAgainst: 0,
    deltaRightWideXgAgainst: 0,
    deltaShotsFor: 0,
    deltaShotsAgainst: 0,
    deltaCentralShotsFor: 0,
    deltaWideShotsFor: 0,
    deltaLongShotsFor: 0,
    deltaCentralShotsAgainst: 0,
    deltaWideShotsAgainst: 0,
    deltaLongShotsAgainst: 0,
    deltaPossessionFor: 0,
    deltaPlayerEffectiveness: 0,
    deltaPlayerCollective: 0,
  };

  const formatDelta = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);
  const formatMicro = (value: number): string => (value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3));

  it('calculates movement distance and confidence bands', () => {
    expect(positionPixelDistance({ ...baseRow, targetXPercent: 53, targetYPercent: 54 })).toBe(5);
    expect(positionPixelMovementConfidence(1)).toBe(0.35);
    expect(positionPixelMovementConfidence(5)).toBe(0.70);
    expect(positionPixelMovementConfidence(7)).toBe(1);
  });

  it('dampens micro movement signal to avoid one-pixel cliffs', () => {
    const score = positionPixelSignalScore({
      ...baseRow,
      targetXPercent: 51,
      deltaXgFor: 0.20,
    });

    expect(score).toBeCloseTo(0.07, 6);
    expect(positionPixelSignalRead(score, 1)).toBe('Micro-check 0.070');
    expect(positionPixelSignalClass(score, 1)).toBe('read-check');
  });

  it('reads larger tactical signals without micro dampening', () => {
    const row = {
      ...baseRow,
      targetXPercent: 60,
      deltaShotsAgainst: 6,
      deltaPossessionFor: -4,
    };
    const score = positionPixelSignalScore(row);

    expect(score).toBeCloseTo(0.15, 6);
    expect(positionPixelSignalRead(score, positionPixelDistance(row))).toBe('Alta 0.150');
    expect(positionPixelSignalClass(score, positionPixelDistance(row))).toBe('delta-negative');
  });

  it('explains the signal with readable match context', () => {
    const detail = positionPixelSignalDetail(
      {
        ...baseRow,
        targetXPercent: 56,
        deltaXgFor: 0.04,
        deltaXgAgainst: 0.02,
        deltaXgDiff: 0.02,
        deltaShotsFor: 1,
        deltaShotsAgainst: 2,
        deltaPossessionFor: 3,
        deltaPlayerEffectiveness: -0.05,
        deltaPlayerCollective: 2,
      },
      formatMicro,
      formatDelta,
    );

    expect(detail).toContain('señal');
    expect(detail).toContain('xG for/ag/diff +0.040/+0.020/+0.020');
    expect(detail).toContain('shots for/ag +1/+2');
    expect(detail).toContain('dist 6.00px');
  });
});
