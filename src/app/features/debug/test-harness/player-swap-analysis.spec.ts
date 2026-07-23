import {
  playerSwapHasLargeQualityDrop,
  playerSwapOverallDelta,
  playerSwapOverallDeltaText,
  playerSwapQualityWarning,
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
});
