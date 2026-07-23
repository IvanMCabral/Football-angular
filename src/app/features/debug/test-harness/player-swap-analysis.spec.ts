import {
  playerSwapHasLargeQualityDrop,
  playerSwapOverallDelta,
  playerSwapOverallDeltaText,
  playerSwapQualityWarning,
  playerSwapSignalClass,
  playerSwapSignalRead,
  playerSwapSignalScore,
} from './player-swap-analysis';

describe('player-swap-analysis', () => {
  const formatDelta = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

  it('calculates the individual quality delta for a player swap', () => {
    expect(playerSwapOverallDelta({ baselinePlayerOverall: 72, swapPlayerOverall: 78 })).toBe(6);
    expect(playerSwapOverallDelta({ baselinePlayerOverall: 78, swapPlayerOverall: 72 })).toBe(-6);
  });

  it('keeps unknown overall reads explicit', () => {
    const row = { baselinePlayerOverall: null, swapPlayerOverall: 74 };

    expect(playerSwapOverallDelta(row)).toBeNull();
    expect(playerSwapOverallDeltaText(row, formatDelta)).toBe('OVR desconocido');
    expect(playerSwapQualityWarning(row, formatDelta)).toBe('');
  });

  it('warns only when the swap drops individual quality by six or more', () => {
    const smallDrop = { baselinePlayerOverall: 78, swapPlayerOverall: 73 };
    const largeDrop = { baselinePlayerOverall: 78, swapPlayerOverall: 72 };

    expect(playerSwapHasLargeQualityDrop(smallDrop)).toBeFalse();
    expect(playerSwapQualityWarning(smallDrop, formatDelta)).toBe('');
    expect(playerSwapHasLargeQualityDrop(largeDrop)).toBeTrue();
    expect(playerSwapQualityWarning(largeDrop, formatDelta)).toContain('baja mucho la calidad individual');
    expect(playerSwapQualityWarning(largeDrop, formatDelta)).toContain('78→72 (-6)');
  });

  it('scores player swap signal from match deltas and tactical role risk', () => {
    const score = playerSwapSignalScore(
      {
        deltaXgDiff: 0.03,
        preAutoSubDeltaXgDiff: 0.04,
        deltaXgFor: 0.02,
        deltaXgAgainst: 0.01,
        deltaShotsFor: 1,
        deltaShotsAgainst: 8,
      },
      { attack: 0.02, control: 0.03, protection: 0.04 },
    );

    expect(score).toBeCloseTo(0.2, 6);
  });

  it('labels player swap signal strength by stable thresholds', () => {
    expect(playerSwapSignalRead(0.13)).toBe('Alta 0.130');
    expect(playerSwapSignalClass(0.13)).toBe('delta-negative');
    expect(playerSwapSignalRead(0.05)).toBe('Media 0.050');
    expect(playerSwapSignalClass(0.05)).toBe('read-check');
    expect(playerSwapSignalRead(0.02)).toBe('Baja 0.020');
    expect(playerSwapSignalClass(0.02)).toBe('read-stable');
    expect(playerSwapSignalRead(0.019)).toBe('Micro 0.019');
    expect(playerSwapSignalClass(0.019)).toBe('delta-neutral');
  });
});
