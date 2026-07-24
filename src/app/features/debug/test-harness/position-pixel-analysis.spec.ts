import {
  positionPixelAttackGainScore,
  positionPixelAttackLossScore,
  positionPixelChannelBreakdown,
  positionPixelChannelBreakdownClass,
  positionPixelChannelBreakdownDetail,
  positionPixelChannelBreakdownRead,
  positionPixelChannelSign,
  positionPixelCoachRead,
  positionPixelContextualCoverageNote,
  positionPixelCoverageChannelLabel,
  positionPixelDecisionScore,
  positionPixelDefensiveGainScore,
  positionPixelDefensiveRiskScore,
  positionPixelDistance,
  positionPixelImpactScore,
  positionPixelIsMicroVisualMismatch,
  positionPixelMovementConfidence,
  positionPixelMatchSmokeVerdict,
  positionPixelPlayerSmokeSeverity,
  positionPixelPlayerSmokeVerdict,
  positionPixelReadLevel,
  positionPixelReadSeverity,
  positionPixelSignalClass,
  positionPixelSignalDetail,
  positionPixelSignalRead,
  positionPixelSignalScore,
  positionPixelSmokeVerdictClass,
  positionPixelChannelLabel,
  positionPixelShapeDeltaText,
  positionPixelShapeMove,
  positionPixelShapeMoveDetail,
  positionPixelTacticalRead,
  positionPixelTacticalReadClass,
  positionPixelTacticalReadReason,
  positionPixelUsesContextualCoverage,
  positionPixelVisualExpectationClass,
  positionPixelVisualExpectationDetail,
  positionPixelVisualExpectationMismatches,
  positionPixelVisualExpectationRead,
  positionPixelVisualEngineTensionClass,
  positionPixelVisualEngineTensionDetail,
  positionPixelVisualEngineTensionRead,
  positionPixelVisualEngineTensions,
  positionPixelVisualChannel,
  positionPixelVisualLine,
  positionPixelWideChannelReason,
  strictPositionPixelLine,
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

  it('summarizes match-level position pixel smoke without UI state', () => {
    const counts = { stable: 0, visible: 0, strong: 0, check: 0 };

    expect(positionPixelMatchSmokeVerdict(counts, 0, 0, 0, 0, 6, 0, 0, 0, 0.01, 0.02, 0.16, 0.08)).toBe('Repeated 5px bias');
    expect(positionPixelMatchSmokeVerdict(counts, 0, 0, 0, 0, 3, 0, 0, 0, 0.01, 0.02, 0.12, 0.066)).toBe('5px visible pattern');
    expect(positionPixelMatchSmokeVerdict(counts, 0, 0, 0, 0, 0, 0, 2, 2, 0.01, 0.02)).toBe('Big tactical move');
    expect(positionPixelMatchSmokeVerdict({ ...counts, strong: 1 }, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02)).toBe('Strong review');
    expect(positionPixelMatchSmokeVerdict({ ...counts, check: 2 }, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02)).toBe('Needs seeds');
    expect(positionPixelMatchSmokeVerdict(counts, 0, 4, 0, 0, 0, 0, 0, 0, 0.01, 0.02)).toBe('Visible risk pattern');
    expect(positionPixelMatchSmokeVerdict(counts, 0, 0, 0, 0, 0, 4, 0, 0, 0.01, 0.02)).toBe('Visible cost pattern');
    expect(positionPixelMatchSmokeVerdict({ ...counts, visible: 1 }, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02)).toBe('Playable variation');
    expect(positionPixelMatchSmokeVerdict(counts, 0, 0, 0, 0, 0, 0, 1, 0, 0.01, 0.02)).toBe('Big neutral move');
    expect(positionPixelMatchSmokeVerdict(counts, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02)).toBe('Stable');
  });

  it('keeps smoke verdict classes and player severity stable', () => {
    expect(positionPixelSmokeVerdictClass('Repeated 5px bias')).toBe('read-strong');
    expect(positionPixelSmokeVerdictClass('5px visible pattern')).toBe('read-check');
    expect(positionPixelSmokeVerdictClass('Big tactical move')).toBe('read-visible');
    expect(positionPixelSmokeVerdictClass('Visible cost pattern')).toBe('read-visible');
    expect(positionPixelSmokeVerdictClass('Big neutral move')).toBe('delta-neutral');
    expect(positionPixelSmokeVerdictClass('Stable')).toBe('read-stable');

    expect(positionPixelPlayerSmokeVerdict(6, 0, 0, 0.08, 0.10)).toBe('Repeated 5px bias');
    expect(positionPixelPlayerSmokeVerdict(3, 0, 0, 0.066, 0.10)).toBe('5px visible pattern');
    expect(positionPixelPlayerSmokeVerdict(0, 1, 1, 0.01, 0.02)).toBe('Big tactical move');
    expect(positionPixelPlayerSmokeVerdict(0, 1, 0, 0.01, 0.02)).toBe('Big neutral move');
    expect(positionPixelPlayerSmokeVerdict(0, 0, 0, 0.01, 0.02)).toBe('Stable');

    expect(positionPixelPlayerSmokeSeverity('Repeated 5px bias')).toBe(5);
    expect(positionPixelPlayerSmokeSeverity('5px visible pattern')).toBe(4);
    expect(positionPixelPlayerSmokeSeverity('Strong review')).toBe(3);
    expect(positionPixelPlayerSmokeSeverity('Big tactical move')).toBe(2);
    expect(positionPixelPlayerSmokeSeverity('Stable')).toBe(1);
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

  it('calculates channel breakdown for threat, connection, and coverage', () => {
    const row = {
      ...baseRow,
      deltaXgFor: 0.10,
      deltaShotsFor: 1,
      deltaWideXgFor: 0.03,
      deltaPossessionFor: 4,
      deltaCentralXgFor: 0.04,
      deltaXgAgainst: -0.08,
      deltaShotsAgainst: -1,
    } as any;
    const breakdown = positionPixelChannelBreakdown(row);

    expect(breakdown.threat).toBeGreaterThan(0.35);
    expect(breakdown.connection).toBeGreaterThan(0.35);
    expect(breakdown.coverage).toBeGreaterThan(0.35);
    expect(positionPixelChannelBreakdownClass(breakdown)).toBe('read-visible');
    expect(positionPixelChannelSign(breakdown.threat)).toBe('+');
  });

  it('formats channel breakdown read and detail', () => {
    const row = {
      ...baseRow,
      deltaXgFor: 0.10,
      deltaShotsFor: 1,
      deltaWideXgFor: 0.03,
      deltaWideShotsFor: 1,
      deltaPossessionFor: 2,
      deltaCentralXgFor: 0.02,
      deltaCentralShotsFor: 1,
      deltaXgAgainst: -0.05,
      deltaShotsAgainst: -1,
      deltaWideXgAgainst: -0.02,
      deltaWideShotsAgainst: -1,
    } as any;
    const breakdown = positionPixelChannelBreakdown(row);
    const label = positionPixelCoverageChannelLabel(false, breakdown.coverage);
    const detail = positionPixelChannelBreakdownDetail(row, breakdown, formatMicro, formatDelta, null);

    expect(positionPixelChannelBreakdownRead(breakdown, label)).toContain('Amenaza');
    expect(positionPixelChannelBreakdownRead(breakdown, label)).toContain('Cobertura');
    expect(detail).toContain('amenaza');
    expect(detail).toContain('conexion');
    expect(detail).toContain('cobertura');
  });

  it('detects contextual coverage when an attacker drops into coverage', () => {
    const row = {
      ...baseRow,
      fromYPercent: 25,
      targetYPercent: 35,
      deltaXgAgainst: 0.10,
    } as any;

    expect(positionPixelUsesContextualCoverage(row, 'ATT', 0.40)).toBeTrue();
    expect(positionPixelCoverageChannelLabel(true, 0.40)).toBe('Cobertura ctx +');
    expect(positionPixelContextualCoverageNote(row, 'ATT', 0.40)).toContain('riesgo defensivo sube');
    expect(positionPixelUsesContextualCoverage(row, 'MID', 0.40)).toBeFalse();
  });

  it('flags visual expectation when an attacker moves up without threat', () => {
    const row = {
      ...baseRow,
      fromYPercent: 30,
      targetYPercent: 24,
    } as any;

    expect(positionPixelVisualExpectationMismatches(row, 'ATT')).toContain('ATT sube: se esperaba algo de amenaza/profundidad');
    expect(positionPixelVisualExpectationRead(row, 'ATT')).toBe('Visual micro');
    expect(positionPixelVisualExpectationClass('Visual micro')).toBe('read-stable');
    expect(positionPixelIsMicroVisualMismatch(row)).toBeTrue();
  });

  it('flags visual expectation when a defender drops without coverage', () => {
    const row = {
      ...baseRow,
      fromYPercent: 72,
      targetYPercent: 78,
    } as any;

    expect(positionPixelVisualExpectationMismatches(row, 'DEF')).toContain('DEF baja: se esperaba mas cobertura');
    expect(positionPixelVisualExpectationRead({ ...row, signalScore: 0.10 }, 'DEF')).toBe('Visual review');
    expect(positionPixelVisualExpectationClass('Visual review')).toBe('read-check');
  });

  it('flags visual expectation when opening wide has no wide signal', () => {
    const row = {
      ...baseRow,
      fromXPercent: 70,
      targetXPercent: 78,
      fromYPercent: 50,
      targetYPercent: 50,
    } as any;

    expect(positionPixelVisualExpectationMismatches(row, 'MID')).toContain('se abre: se esperaba alguna señal de banda');
  });

  it('keeps visual expectation detail coherent when there are no mismatches', () => {
    const row = {
      ...baseRow,
      targetXPercent: 58,
      deltaXgFor: 0.10,
      deltaShotsFor: 1,
    } as any;

    expect(positionPixelVisualExpectationMismatches(row, 'MID')).toEqual([]);
    expect(positionPixelVisualExpectationRead(row, 'MID')).toBe('Visual OK');
    expect(positionPixelVisualExpectationDetail(row, 'MID', 'MID C: mas derecho', 'Amenaza + · Conex. = · Cobertura ='))
      .toContain('coherente');
  });

  it('flags hard visual-engine contradiction when threat rises but engine loses attack', () => {
    const row = {
      ...baseRow,
      targetXPercent: 58,
      deltaXgFor: -0.06,
      deltaShotsFor: -1,
      deltaWideXgFor: 0.20,
    } as any;
    const tensions = positionPixelVisualEngineTensions(row, 'MID');

    expect(tensions.some((item) => item.level === 'hard')).toBeTrue();
    expect(positionPixelVisualEngineTensionRead(tensions)).toBe('Contradicción');
    expect(positionPixelVisualEngineTensionClass(tensions)).toBe('read-check');
    expect(positionPixelVisualEngineTensionDetail(tensions, 'breakdown', 'Attack loss')).toContain('amenaza visual sube');
  });

  it('downgrades hard contradiction to soft when the visual tradeoff is mixed', () => {
    const row = {
      ...baseRow,
      targetXPercent: 60,
      deltaXgFor: -0.06,
      deltaShotsFor: -1,
      deltaWideXgFor: 0.20,
      deltaXgAgainst: 0.10,
    } as any;
    const tensions = positionPixelVisualEngineTensions(row, 'MID');

    expect(tensions.length).toBeGreaterThan(0);
    expect(tensions.every((item) => item.level === 'soft')).toBeTrue();
    expect(positionPixelVisualEngineTensionRead(tensions)).toBe('Tradeoff');
  });

  it('keeps contextual coverage conflict as soft tension', () => {
    const row = {
      ...baseRow,
      fromYPercent: 24,
      targetYPercent: 34,
      deltaXgAgainst: 0.10,
      deltaWideXgAgainst: -0.30,
      deltaShotsAgainst: 1,
    } as any;
    const tensions = positionPixelVisualEngineTensions(row, 'ATT');

    expect(tensions.some((item) => item.level === 'soft')).toBeTrue();
    expect(positionPixelVisualEngineTensionRead(tensions)).toBe('Tradeoff');
  });

  it('reads coherent visual-engine tension when no tension exists', () => {
    const tensions = positionPixelVisualEngineTensions(baseRow as any, 'MID');

    expect(tensions).toEqual([]);
    expect(positionPixelVisualEngineTensionRead(tensions)).toBe('Coherente');
    expect(positionPixelVisualEngineTensionClass(tensions)).toBe('read-stable');
    expect(positionPixelVisualEngineTensionDetail(tensions, 'Amenaza = · Conex. = · Cobertura =', 'Neutral'))
      .toContain('visual y motor alineados');
  });

  it('reads visual line and channel bands', () => {
    expect(positionPixelVisualLine(20)).toBe('ATT');
    expect(positionPixelVisualLine(50)).toBe('MID');
    expect(positionPixelVisualLine(80)).toBe('DEF');
    expect(positionPixelVisualChannel(20)).toBe('L');
    expect(positionPixelVisualChannel(50)).toBe('C');
    expect(positionPixelVisualChannel(80)).toBe('R');
    expect(positionPixelChannelLabel('L')).toBe('banda izquierda');
  });

  it('describes same-cell shape movements', () => {
    expect(positionPixelShapeMove({ ...baseRow, fromXPercent: 50, targetXPercent: 55 } as any)).toBe('MID C: mas derecho');
    expect(positionPixelShapeMove({ ...baseRow, fromYPercent: 50, targetYPercent: 44 } as any)).toBe('MID C: mas alto');
    expect(positionPixelShapeMove({ ...baseRow, fromXPercent: 50, targetXPercent: 56, fromYPercent: 50, targetYPercent: 44 } as any))
      .toBe('MID C: diagonal abierto alto');
  });

  it('describes cross-cell shape movements and detail', () => {
    const row = {
      ...baseRow,
      fromXPercent: 20,
      targetXPercent: 50,
      fromYPercent: 50,
      targetYPercent: 20,
    } as any;

    expect(positionPixelShapeMove(row)).toBe('-L +C / MID->ATT');
    expect(positionPixelShapeMoveDetail(row)).toContain('perdiste presencia en banda izquierda');
    expect(positionPixelShapeMoveDetail(row)).toContain('subiste al jugador de MID a ATT');
    expect(positionPixelShapeDeltaText('MID', 'L', 'ATT', 'C')).toBe('shape MID L -1 / ATT C +1');
  });

  it('reads coach-level movement for micro stable pixels', () => {
    expect(positionPixelCoachRead({ ...baseRow, targetXPercent: 50.5 } as any))
      .toBe('Micro estable: el pixel no rompe la lectura del motor.');
  });

  it('reads coach-level movement for defender projection risk', () => {
    const row = {
      ...baseRow,
      playerPosition: 'DEF',
      fromYPercent: 76,
      targetYPercent: 60,
      deltaXgFor: 0.10,
      deltaShotsFor: 1,
      deltaXgAgainst: 0.10,
      deltaShotsAgainst: 1,
    } as any;

    expect(strictPositionPixelLine('DEF')).toBe('DEF');
    expect(positionPixelCoachRead(row)).toContain('Sube un defensor');
  });
});
