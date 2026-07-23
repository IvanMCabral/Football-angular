import {
  playerSwapHasLargeQualityDrop,
  playerSwapCoachReadLevel,
  playerSwapOverallDelta,
  playerSwapOverallDeltaText,
  playerSwapQualityWarning,
  playerSwapSignalClass,
  playerSwapSignalRead,
  playerSwapSignalScore,
  playerSwapTacticalBreakdown,
  playerSwapTacticalLabel,
} from './player-swap-analysis';

describe('player-swap-analysis', () => {
  const formatDelta = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);
  const baseDecisionRow = {
    baselinePlayerOverall: 75,
    swapPlayerOverall: 76,
    deltaXgDiff: 0,
    preAutoSubDeltaXgDiff: 0,
    preAutoSubDeltaXgFor: 0,
    preAutoSubDeltaXgAgainst: 0,
    deltaXgFor: 0,
    deltaXgAgainst: 0,
    deltaShotsFor: 0,
    deltaShotsAgainst: 0,
    deltaPossessionFor: 0,
  };
  const baseTacticalRow = {
    ...baseDecisionRow,
    deltaCentralShotsFor: 0,
    deltaWideShotsFor: 0,
    deltaLongShotsFor: 0,
    deltaCentralShotsAgainst: 0,
    deltaWideShotsAgainst: 0,
    deltaLongShotsAgainst: 0,
  };

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
        deltaPossessionFor: 0,
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

  it('reads a stable attacking improvement as a clear upgrade', () => {
    expect(playerSwapCoachReadLevel(
      {
        ...baseDecisionRow,
        deltaXgDiff: 0.11,
        preAutoSubDeltaXgDiff: 0.03,
        deltaXgFor: 0.12,
        deltaShotsFor: 2,
      },
      { attack: 0, control: 0, protection: 0 },
    )).toBe('upgrade');
  });

  it('reads a risky negative swap as a clear downgrade', () => {
    expect(playerSwapCoachReadLevel(
      {
        ...baseDecisionRow,
        deltaXgDiff: -0.09,
        deltaXgFor: -0.01,
        deltaXgAgainst: 0.11,
        deltaShotsAgainst: 1,
      },
      { attack: 0, control: 0, protection: 0 },
    )).toBe('downgrade');
  });

  it('reads attack gain with defensive exposure as a trade-off', () => {
    expect(playerSwapCoachReadLevel(
      {
        ...baseDecisionRow,
        deltaXgDiff: 0.01,
        deltaXgFor: 0.13,
        deltaXgAgainst: 0.13,
      },
      { attack: 0, control: 0, protection: 0 },
    )).toBe('tradeoff');
  });

  it('forces review when quality drops hard without a stable strong gain', () => {
    expect(playerSwapCoachReadLevel(
      {
        ...baseDecisionRow,
        baselinePlayerOverall: 80,
        swapPlayerOverall: 73,
        deltaXgDiff: 0.08,
        deltaXgFor: 0.05,
      },
      { attack: 0, control: 0, protection: 0 },
    )).toBe('review');
  });

  it('keeps tiny mixed deltas neutral', () => {
    expect(playerSwapCoachReadLevel(
      {
        ...baseDecisionRow,
        deltaXgDiff: 0.01,
        deltaXgFor: 0.01,
        deltaXgAgainst: 0.01,
      },
      { attack: 0, control: 0, protection: 0 },
    )).toBe('neutral');
  });

  it('labels tactical scores with stable thresholds', () => {
    expect(playerSwapTacticalLabel(0.11, 'Ataque')).toEqual({ label: 'Ataque ++', cssClass: 'delta-positive' });
    expect(playerSwapTacticalLabel(0.04, 'Ataque')).toEqual({ label: 'Ataque +', cssClass: 'delta-positive' });
    expect(playerSwapTacticalLabel(-0.11, 'Ataque')).toEqual({ label: 'Ataque --', cssClass: 'delta-negative' });
    expect(playerSwapTacticalLabel(-0.04, 'Ataque')).toEqual({ label: 'Ataque -', cssClass: 'delta-negative' });
    expect(playerSwapTacticalLabel(0.01, 'Ataque')).toEqual({ label: 'Ataque =', cssClass: 'delta-neutral' });
  });

  it('builds a tactical breakdown that can praise attack while warning protection', () => {
    const breakdown = playerSwapTacticalBreakdown(
      {
        ...baseTacticalRow,
        deltaXgFor: 0.08,
        preAutoSubDeltaXgFor: 0.04,
        deltaShotsFor: 2,
        deltaXgAgainst: 0.09,
        preAutoSubDeltaXgAgainst: 0.03,
        deltaShotsAgainst: 2,
        deltaWideShotsFor: 3,
        deltaWideShotsAgainst: 1,
      },
      {
        attack: 0.015,
        control: -0.010,
        protection: -0.020,
        detail: 'Alerta de rol: prueba',
      },
      (value) => (value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3)),
    );

    expect(breakdown.tacticalAttackRead).toBe('Ataque ++');
    expect(breakdown.tacticalAttackClass).toBe('delta-positive');
    expect(breakdown.tacticalProtectionRead).toBe('Protección --');
    expect(breakdown.tacticalProtectionClass).toBe('delta-negative');
    expect(breakdown.tacticalChannelsRead).toBe('Canales +');
    expect(breakdown.tacticalBreakdownDetail).toContain('Alerta de rol: prueba');
  });
});
