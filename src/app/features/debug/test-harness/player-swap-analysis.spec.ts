import {
  playerSwapBatteryBestWorstText,
  playerSwapBatteryCoachRead,
  playerSwapBatteryCounterText,
  playerSwapHasLargeQualityDrop,
  playerSwapCoachReadLevel,
  playerSwapCoachRead,
  playerSwapCoachReadClass,
  playerSwapCoachReadDetail,
  playerSwapDecisionScore,
  playerSwapIsActionableRecommendation,
  playerSwapOverallDelta,
  playerSwapOverallDeltaText,
  playerSwapObjectiveContrastText,
  playerSwapObjectiveText,
  playerSwapPrecisionStability,
  playerSwapPrecisionStabilityClass,
  playerSwapProtectSpecialistScore,
  playerSwapQualityWarning,
  playerSwapSignalClass,
  playerSwapSignalRead,
  playerSwapSignalScore,
  playerSwapTacticalBreakdown,
  playerSwapTacticalLabel,
} from './player-swap-analysis';
import { PlayerSwapMatrixSummary } from '../models/test-harness.model';

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
  const baseSummaryRow = {
    ...baseTacticalRow,
    testCase: 'swap test',
    slotId: 'S1',
    formation: '4-4-2',
    seedStart: 1,
    seedEnd: 1,
    seedCount: 1,
    baselinePlayer: 'Starter',
    swapPlayer: 'Bench',
    baselinePlayerPosition: 'MID',
    swapPlayerPosition: 'MID',
    deltaPlayerOverall: 1,
    baseline: {} as PlayerSwapMatrixSummary['baseline'],
    swapped: {} as PlayerSwapMatrixSummary['swapped'],
    deltaGoalsFor: 0,
    deltaGoalsAgainst: 0,
    deltaGoalDiff: 0,
    swapRead: 'Noise / neutral',
    swapReadDetail: '',
    swapReadClass: 'delta-neutral',
    swapFit: 'Same line',
    swapFitDetail: '',
    swapFitClass: 'read-stable',
    tacticalAttackRead: '',
    tacticalAttackClass: '',
    tacticalCentralControlRead: '',
    tacticalCentralControlClass: '',
    tacticalProtectionRead: '',
    tacticalProtectionClass: '',
    tacticalChannelsRead: '',
    tacticalChannelsClass: '',
    tacticalBreakdownDetail: '',
    signalScore: 0,
    signalRead: '',
    signalClass: '',
    signalDetail: '',
    timestamp: '',
  } satisfies PlayerSwapMatrixSummary;

  it('formats player swap battery counters', () => {
    expect(playerSwapBatteryCounterText({
      'Clear upgrade': 2,
      'Noise / neutral': 0,
      'Needs review': 1,
    })).toBe(`2 Clear upgrade ${String.fromCharCode(183)} 1 Needs review`);
    expect(playerSwapBatteryCounterText({})).toBe('sin datos');
  });

  it('explains empty player swap battery runs', () => {
    expect(playerSwapBatteryCoachRead({
      total: 0,
      reads: {},
      fits: {},
      mode: 'quick',
      precision: 'quick',
      confidence: 'low',
      best: null,
      worst: null,
      bestAttack: null,
      bestProtect: null,
    } as any)).toContain('No hay swaps medidos');
  });

  it('explains clear player swap battery upgrades and downgrades', () => {
    expect(playerSwapBatteryCoachRead({
      total: 2,
      reads: { 'Clear upgrade': 2 },
      fits: {},
      mode: 'balanced',
      precision: 'balanced',
      confidence: 'medium',
    } as any)).toContain('favorece cambios positivos claros');
    expect(playerSwapBatteryCoachRead({
      total: 2,
      reads: { 'Clear downgrade': 2 },
      fits: { 'Out of role': 1 },
      mode: 'reliable',
      precision: 'reliable',
      confidence: 'high',
    } as any)).toContain('fuera de rol');
  });

  it('explains mixed or neutral player swap battery reads', () => {
    expect(playerSwapBatteryCoachRead({
      total: 4,
      reads: { 'Clear upgrade': 1, 'Clear downgrade': 1, 'Needs review': 1, 'Noise / neutral': 1 },
      fits: {},
      mode: 'quick',
      precision: 'quick',
      confidence: 'low',
    } as any)).toContain('señales mixtas');
    expect(playerSwapBatteryCoachRead({
      total: 3,
      reads: { 'Noise / neutral': 3 },
      fits: {},
      mode: 'balanced',
      precision: 'balanced',
      confidence: 'medium',
    } as any)).toContain('ruido o impacto menor');
  });

  it('formats player swap best/worst recommendation text by coach objective', () => {
    const actionable = () => true;
    const notActionable = () => false;

    expect(playerSwapBatteryBestWorstText(baseSummaryRow, 'NEED_GOAL', formatDelta, actionable))
      .toContain('para buscar gol');
    expect(playerSwapBatteryBestWorstText(baseSummaryRow, 'PROTECT_RESULT', formatDelta, actionable))
      .toContain('para cerrar');
    expect(playerSwapBatteryBestWorstText({ ...baseSummaryRow, swapRead: 'Noise / neutral' }, 'NEUTRAL', formatDelta, notActionable))
      .toContain('sin cambio recomendado balance');
    expect(playerSwapBatteryBestWorstText(null, 'NEUTRAL', formatDelta, actionable)).toBe('sin datos');
  });

  it('formats player swap objective text for attack and protection', () => {
    const attacking = {
      ...baseSummaryRow,
      baselinePlayer: 'Starter',
      swapPlayer: 'Bench',
      deltaXgFor: 0.12,
      deltaShotsFor: 3,
      deltaXgAgainst: 0.08,
      deltaShotsAgainst: 2,
      swapRead: 'Clear upgrade',
    };

    expect(playerSwapObjectiveText(attacking, 'NEED_GOAL', formatDelta))
      .toContain('ataque +0.12 xG / +3 tiros');
    expect(playerSwapObjectiveText(attacking, 'PROTECT_RESULT', formatDelta))
      .toContain('riesgo -0.08 xGA / -2 tiros ag.');
    expect(playerSwapObjectiveText(null, 'NEED_GOAL', formatDelta)).toBe('sin datos');
  });

  it('explains player swap objective contrast', () => {
    const attack = {
      ...baseSummaryRow,
      baselinePlayer: 'Starter',
      swapPlayer: 'Attacker',
      deltaXgFor: 0.12,
      deltaShotsFor: 3,
      deltaXgAgainst: 0.02,
      deltaShotsAgainst: 1,
      swapRead: 'Clear upgrade',
    };
    const protect = {
      ...baseSummaryRow,
      baselinePlayer: 'Starter',
      swapPlayer: 'Defender',
      deltaXgFor: 0.01,
      deltaShotsFor: 0,
      deltaXgAgainst: -0.12,
      deltaShotsAgainst: -3,
      swapRead: 'Clear upgrade',
    };

    expect(playerSwapObjectiveContrastText({ bestAttack: null, bestProtect: null } as any))
      .toBe('sin datos suficientes');
    expect(playerSwapObjectiveContrastText({ bestAttack: attack, bestProtect: protect } as any))
      .toContain('contraste real');
    expect(playerSwapObjectiveContrastText({
      bestAttack: { ...attack, deltaXgAgainst: -0.02 },
      bestProtect: { ...attack, deltaXgAgainst: -0.02 },
    } as any))
      .toBe('mismo cambio sirve para ambos: mejora ataque y baja riesgo');
    expect(playerSwapObjectiveContrastText({
      bestAttack: { ...attack, deltaXgFor: 0.01, deltaShotsFor: 0, deltaXgAgainst: 0.01, deltaShotsAgainst: 0 },
      bestProtect: { ...attack, deltaXgFor: 0.01, deltaShotsFor: 0, deltaXgAgainst: 0.01, deltaShotsAgainst: 0 },
    } as any)).toContain('no hay señal fuerte');
  });

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

  it('scores player swap recommendations differently by coach objective', () => {
    const attackingSwap = {
      ...baseSummaryRow,
      deltaXgFor: 0.10,
      deltaShotsFor: 3,
      deltaWideShotsFor: 2,
      deltaXgAgainst: 0.06,
      deltaShotsAgainst: 2,
    };

    expect(playerSwapDecisionScore(attackingSwap, 'NEED_GOAL')).toBeGreaterThan(playerSwapDecisionScore(attackingSwap, 'PROTECT_RESULT'));
  });

  it('rewards protect specialists for reducing risk and keeping defensive profile', () => {
    const defensiveSwap = {
      ...baseSummaryRow,
      baselinePlayerPosition: 'DEF',
      swapPlayerPosition: 'DEF',
      deltaXgAgainst: -0.08,
      deltaShotsAgainst: -2,
      preAutoSubDeltaXgAgainst: -0.04,
      swapFit: 'Same profile',
    };
    const riskyAttacker = {
      ...baseSummaryRow,
      swapPlayerPosition: 'ATT',
      deltaXgAgainst: 0.03,
      deltaShotsAgainst: 1,
      swapFit: 'Out of role',
    };

    expect(playerSwapProtectSpecialistScore(defensiveSwap)).toBeGreaterThan(playerSwapProtectSpecialistScore(riskyAttacker));
  });

  it('accepts only clear upgrade rows as actionable recommendations', () => {
    expect(playerSwapIsActionableRecommendation({
      ...baseSummaryRow,
      swapRead: 'Trade-off',
      deltaXgDiff: 0.30,
    })).toBeFalse();
    expect(playerSwapIsActionableRecommendation({
      ...baseSummaryRow,
      swapRead: 'Clear upgrade',
      deltaXgDiff: 0.04,
    })).toBeTrue();
  });

  it('compares quick vs balanced swap precision reads', () => {
    expect(playerSwapPrecisionStability(
      { ...baseSummaryRow, swapRead: 'Clear upgrade' },
      { ...baseSummaryRow, swapRead: 'Clear upgrade' },
      'NEUTRAL',
    )).toBe('Stable read');

    expect(playerSwapPrecisionStability(
      { ...baseSummaryRow, swapRead: 'Clear upgrade', deltaXgDiff: 0.08 },
      { ...baseSummaryRow, swapRead: 'Trade-off', deltaXgDiff: -0.08 },
      'NEUTRAL',
    )).toBe('Changed read');

    expect(playerSwapPrecisionStability(
      { ...baseSummaryRow, swapRead: 'Clear upgrade', deltaXgDiff: 0.04 },
      { ...baseSummaryRow, swapRead: 'Trade-off', deltaXgDiff: 0.08 },
      'NEUTRAL',
    )).toBe('Needs more seeds');
  });

  it('maps swap precision stability to display classes', () => {
    expect(playerSwapPrecisionStabilityClass('Stable read')).toBe('delta-positive');
    expect(playerSwapPrecisionStabilityClass('Changed read')).toBe('delta-negative');
    expect(playerSwapPrecisionStabilityClass('Needs more seeds')).toBe('read-check');
  });

  it('blocks large quality drops unless the evidence is strong and stable', () => {
    const qualityDropUpgrade = {
      ...baseSummaryRow,
      swapRead: 'Clear upgrade',
      baselinePlayerOverall: 82,
      swapPlayerOverall: 75,
      deltaXgDiff: 0.13,
      preAutoSubDeltaXgDiff: 0.07,
      deltaXgAgainst: 0.07,
    };

    expect(playerSwapIsActionableRecommendation({ ...qualityDropUpgrade, seedCount: 10 })).toBeFalse();
    expect(playerSwapIsActionableRecommendation({ ...qualityDropUpgrade, seedCount: 30 })).toBeTrue();
    expect(playerSwapIsActionableRecommendation({ ...qualityDropUpgrade, seedCount: 30, deltaXgAgainst: 0.09 })).toBeFalse();
  });

  it('maps coach read levels to labels and classes', () => {
    expect(playerSwapCoachRead('upgrade')).toBe('Clear upgrade');
    expect(playerSwapCoachReadClass('upgrade')).toBe('delta-positive');
    expect(playerSwapCoachRead('downgrade')).toBe('Clear downgrade');
    expect(playerSwapCoachReadClass('downgrade')).toBe('delta-negative');
    expect(playerSwapCoachRead('tradeoff')).toBe('Trade-off');
    expect(playerSwapCoachReadClass('tradeoff')).toBe('read-strong');
    expect(playerSwapCoachRead('review')).toBe('Needs review');
    expect(playerSwapCoachReadClass('review')).toBe('read-check');
    expect(playerSwapCoachRead('neutral')).toBe('Noise / neutral');
    expect(playerSwapCoachReadClass('neutral')).toBe('delta-neutral');
  });

  it('explains a clear upgrade with xG and shot context', () => {
    const detail = playerSwapCoachReadDetail(
      {
        ...baseDecisionRow,
        deltaXgDiff: 0.11,
        preAutoSubDeltaXgDiff: 0.03,
        deltaXgFor: 0.12,
        deltaShotsFor: 2,
      },
      { attack: 0, control: 0, protection: 0 },
      formatDelta,
    );

    expect(detail).toContain('mejora el diferencial xG');
    expect(detail).toContain('pre-auto-sub +0.03');
    expect(detail).toContain('Shots +2');
  });

  it('explains review with quality warning when OVR drops hard', () => {
    const detail = playerSwapCoachReadDetail(
      {
        ...baseDecisionRow,
        baselinePlayerOverall: 80,
        swapPlayerOverall: 73,
        deltaXgDiff: 0.08,
        deltaXgFor: 0.05,
      },
      { attack: 0, control: 0, protection: 0 },
      formatDelta,
    );

    expect(detail).toContain('conviene repetir con más seeds');
    expect(detail).toContain('baja mucho la calidad individual');
  });

  it('keeps neutral explanations honest when role risk is present', () => {
    const detail = playerSwapCoachReadDetail(
      baseDecisionRow,
      {
        attack: 0,
        control: 0,
        protection: 0,
        detail: 'Alerta de rol: prueba',
      },
      formatDelta,
    );

    expect(detail).toContain('no hay señal suficiente');
    expect(detail).toContain('Alerta de rol: prueba');
  });
});
