import {
  positionPixelAttackGainScore,
  positionPixelAttackLossScore,
  positionPixelDecisionScore,
  positionPixelDefensiveGainScore,
  positionPixelDefensiveRiskScore,
  positionPixelDistance,
  positionPixelImpactScore,
  positionPixelMovementConfidence,
  positionPixelReadLevel,
  positionPixelReadSeverity,
  positionPixelSignalClass,
  positionPixelSignalDetail,
  positionPixelSignalRead,
  positionPixelSignalScore,
  positionPixelTacticalRead,
  positionPixelTacticalReadClass,
  positionPixelTacticalReadReason,
  positionPixelWideChannelReason,
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
    signalScore: 0,
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

  it('separates attacking gains from attacking losses', () => {
    const attackingMove = {
      ...baseRow,
      deltaXgFor: 0.14,
      deltaShotsFor: 2,
      deltaPossessionFor: 3,
      deltaCentralShotsFor: 1,
      deltaWideShotsFor: 1,
      deltaLeftWideXgFor: 0.03,
    } as any;
    const attackLoss = {
      ...attackingMove,
      deltaXgFor: -0.14,
      deltaShotsFor: -2,
      deltaPossessionFor: -3,
      deltaCentralShotsFor: -1,
      deltaWideShotsFor: -1,
      deltaLeftWideXgFor: -0.03,
    } as any;

    expect(positionPixelAttackGainScore(attackingMove)).toBeGreaterThan(0);
    expect(positionPixelAttackLossScore(attackingMove)).toBe(0);
    expect(positionPixelAttackGainScore(attackLoss)).toBe(0);
    expect(positionPixelAttackLossScore(attackLoss)).toBeGreaterThan(0);
  });

  it('separates defensive risk from defensive gain', () => {
    const riskyMove = {
      ...baseRow,
      deltaXgAgainst: 0.12,
      deltaShotsAgainst: 2,
      deltaCentralShotsAgainst: 1,
      deltaWideShotsAgainst: 1,
      deltaCentralXgAgainst: 0.04,
      deltaWideXgAgainst: 0.03,
      deltaLeftWideXgAgainst: 0.02,
    } as any;
    const defensiveMove = {
      ...riskyMove,
      deltaXgAgainst: -0.12,
      deltaShotsAgainst: -2,
      deltaCentralShotsAgainst: -1,
      deltaWideShotsAgainst: -1,
      deltaCentralXgAgainst: -0.04,
      deltaWideXgAgainst: -0.03,
      deltaLeftWideXgAgainst: -0.02,
    } as any;

    expect(positionPixelDefensiveRiskScore(riskyMove)).toBeGreaterThan(0);
    expect(positionPixelDefensiveGainScore(riskyMove)).toBe(0);
    expect(positionPixelDefensiveRiskScore(defensiveMove)).toBe(0);
    expect(positionPixelDefensiveGainScore(defensiveMove)).toBeGreaterThan(0);
  });

  it('keeps read level thresholds consistent with movement size', () => {
    expect(positionPixelReadLevel({ ...baseRow, targetXPercent: 51, signalScore: 0.06 } as any)).toBe('check');
    expect(positionPixelReadSeverity({ ...baseRow, targetXPercent: 51, signalScore: 0.06 } as any)).toBe(4);
    expect(positionPixelReadLevel({ ...baseRow, targetXPercent: 56, deltaShotsFor: 2 } as any)).toBe('visible');
    expect(positionPixelReadLevel({ ...baseRow, targetXPercent: 60, deltaXgAgainst: 0.30 } as any)).toBe('strong');
  });

  it('scores overall impact and decision direction from the same row', () => {
    const goodMove = {
      ...baseRow,
      targetXPercent: 58,
      deltaXgFor: 0.10,
      deltaXgAgainst: -0.05,
      deltaXgDiff: 0.15,
      deltaShotsFor: 2,
      deltaShotsAgainst: -1,
      deltaPossessionFor: 3,
    } as any;
    const badMove = {
      ...goodMove,
      deltaXgFor: -0.10,
      deltaXgAgainst: 0.05,
      deltaXgDiff: -0.15,
      deltaShotsFor: -2,
      deltaShotsAgainst: 1,
      deltaPossessionFor: -3,
    } as any;

    expect(positionPixelImpactScore(goodMove)).toBeGreaterThan(0);
    expect(positionPixelDecisionScore(goodMove)).toBeGreaterThan(0);
    expect(positionPixelDecisionScore(badMove)).toBeLessThan(0);
  });

  it('reads tactical impact for micro, visible, and larger moves', () => {
    expect(positionPixelTacticalRead({ ...baseRow, targetXPercent: 51, signalScore: 0.06 } as any)).toBe('Micro review');
    expect(positionPixelTacticalRead({ ...baseRow, targetXPercent: 55, deltaXgAgainst: 0.12 } as any)).toBe('Visible risk');
    expect(positionPixelTacticalRead({ ...baseRow, targetXPercent: 60, deltaXgFor: 0.20 } as any)).toBe('Attack gain');
  });

  it('maps tactical reads to stable UI classes', () => {
    expect(positionPixelTacticalReadClass('Micro review')).toBe('read-check');
    expect(positionPixelTacticalReadClass('Visible attack gain')).toBe('read-visible');
    expect(positionPixelTacticalReadClass('Bad tradeoff')).toBe('read-strong');
    expect(positionPixelTacticalReadClass('Neutral')).toBe('delta-neutral');
  });

  it('explains tactical read with score and wide-channel context', () => {
    const row = {
      ...baseRow,
      deltaXgFor: 0.10,
      deltaShotsFor: 1,
      deltaLeftWideXgFor: 0.04,
      deltaRightWideXgAgainst: 0.03,
    } as any;
    const formatMicro = (value: number): string => (value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3));

    expect(positionPixelWideChannelReason(row, formatMicro)).toContain('own L +0.040');
    expect(positionPixelTacticalReadReason(row, 'coach note', formatMicro)).toContain('coach note');
    expect(positionPixelTacticalReadReason(row, 'coach note', formatMicro)).toContain('attack gain');
    expect(positionPixelTacticalReadReason(row, 'coach note', formatMicro)).toContain('wide channel');
  });
});
