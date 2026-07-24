import {
  scenarioActionLabel,
  scenarioActionKey,
  scenarioAttackCandidateIsCoachWorthy,
  scenarioAttackPlanScore,
  scenarioBatteryCoachAdvice,
  scenarioBatteryCoachObjectiveLabel,
  scenarioBatteryGroupLabel,
  scenarioBatteryReviewHint,
  scenarioBatteryReviewItems,
  scenarioDecisionMetrics,
  scenarioOpponentProtectionRead,
  scenarioOpponentRiskRead,
  scenarioProtectionCandidateIsCoachWorthy,
  scenarioShapeActionLabel,
  scenarioSummaryActionLabel,
  scenarioSummaryAttackGainScore,
  scenarioSummaryAttackLossScore,
  scenarioSummaryCoachRead,
  scenarioSummaryCoachReadDetail,
  scenarioSummaryCoachReadPrefix,
  scenarioSummaryCoherentSubstitutionSignal,
  scenarioDecisionConfidenceFromReadLevel,
  scenarioSummaryDefensiveGainScore,
  scenarioSummaryDefensiveRiskScore,
  scenarioSummaryFormationHint,
  scenarioSummaryFormationLabel,
  scenarioSummaryImpactScore,
  scenarioSummaryIsFormationNoop,
  scenarioSummaryIsOpponentRow,
  scenarioSummaryIsShapeAction,
  scenarioSummaryNeedsReview,
  scenarioSummaryOpponentChannelRead,
  scenarioSummaryOutcome,
  scenarioSummaryOutcomeClass,
  scenarioSummaryOutcomeReason,
  scenarioSummaryOutcomeSummaryFromOutcomes,
  scenarioSummaryRecommendationClass,
  scenarioSummaryRecommendationDetail,
  scenarioSummaryRecommendationFromOutcome,
  scenarioSummaryUserChannelRead,
  scenarioTwoWayScore,
} from './test-harness-scenario-battery-utils';
import { ScenarioBatteryRow, ScenarioMatrixSummaryRow, TeamStyleOption } from '../models/test-harness.model';

const styles: TeamStyleOption[] = [
  { value: 'BALANCED', label: 'Balanced', hint: 'balanced' },
  { value: 'WIDE_PLAY', label: 'Wing Play', hint: 'wide' },
];

function row(partial: Partial<ScenarioBatteryRow>): ScenarioBatteryRow {
  return {
    matchId: 'm1',
    matchLabel: 'A vs B',
    controlledSide: 'HOME',
    controlledTeam: 'A',
    scenarioGroup: 'OFFENSE',
    coachObjective: 'NEUTRAL',
    coachContext: 'ctx',
    coachContextDetail: 'ctx detail',
    scenarioCount: 1,
    decision: 'Atacar',
    decisionDetail: 'detail',
    review: 'OK',
    reviewDetail: 'ok',
    seedStart: 12345,
    seedCount: 5,
    cards: [],
    ...partial,
  };
}

describe('test-harness-scenario-battery-utils', () => {
  it('labels battery objective and groups', () => {
    expect(scenarioBatteryCoachObjectiveLabel('NEED_GOAL')).toBe('Necesito gol');
    expect(scenarioBatteryCoachObjectiveLabel('PROTECT_RESULT')).toBe('Cuidar resultado');
    expect(scenarioBatteryCoachObjectiveLabel('NEUTRAL')).toBe('Neutral');
    expect(scenarioBatteryGroupLabel('ALL')).toBe('Todo');
    expect(scenarioBatteryGroupLabel('OPPONENT')).toBe('Rival');
  });

  it('summarizes scenario outcomes for visual counters', () => {
    const summary = scenarioSummaryOutcomeSummaryFromOutcomes([
      'Upgrade',
      'Lean up',
      'Tradeoff',
      'Risk',
      'Downgrade',
      'Exposure',
      'Contained',
      'Neutral',
      'Baseline/no-op',
      'Channel shift',
    ]);

    expect(summary.map((item) => item.label)).toEqual([
      'Upgrade',
      'Tradeoff',
      'Risk/Exposure',
      'Contained',
      'Neutral',
    ]);
    expect(summary.find((item) => item.label === 'Upgrade')?.count).toBe(2);
    expect(summary.find((item) => item.label === 'Tradeoff')?.count).toBe(1);
    expect(summary.find((item) => item.label === 'Risk/Exposure')?.count).toBe(3);
    expect(summary.find((item) => item.label === 'Contained')?.count).toBe(1);
    expect(summary.find((item) => item.label === 'Neutral')?.count).toBe(1);
  });

  it('maps scenario outcome classes', () => {
    expect(scenarioSummaryOutcomeClass('Baseline/no-op')).toBe('read-noise');
    expect(scenarioSummaryOutcomeClass('Upgrade')).toBe('read-visible');
    expect(scenarioSummaryOutcomeClass('Lean up')).toBe('read-visible');
    expect(scenarioSummaryOutcomeClass('Contained')).toBe('read-visible');
    expect(scenarioSummaryOutcomeClass('Channel shift')).toBe('read-visible');
    expect(scenarioSummaryOutcomeClass('Tradeoff')).toBe('read-strong');
    expect(scenarioSummaryOutcomeClass('Downgrade')).toBe('read-check');
    expect(scenarioSummaryOutcomeClass('Risk')).toBe('read-check');
    expect(scenarioSummaryOutcomeClass('Exposure')).toBe('read-check');
    expect(scenarioSummaryOutcomeClass('Neutral')).toBe('read-stable');
  });

  it('maps scenario summary outcomes for own tactical changes', () => {
    const base = {
      scenario: 'm45-wide',
      actionType: 'POSITION',
      avgUserXgDelta: 0,
      avgUserShotsDelta: 0,
      avgUserPossessionDelta: 0,
      avgUserCentralDelta: 0,
      avgUserWideDelta: 0,
      avgOpponentXgDelta: 0,
      avgOpponentShotsDelta: 0,
      avgOpponentCentralDelta: 0,
      avgOpponentWideDelta: 0,
      avgOpponentCentralXgDelta: 0,
      avgOpponentWideXgDelta: 0,
      avgOpponentLeftWideXgDelta: 0,
      avgOpponentRightWideXgDelta: 0,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryOutcome(base, true, 'strong')).toBe('Baseline/no-op');
    expect(scenarioSummaryOutcome(base, false, 'noise')).toBe('Neutral');
    expect(scenarioSummaryOutcome({ ...base, avgUserXgDelta: 0.092, avgOpponentXgDelta: -0.068 }, false, 'visible')).toBe('Upgrade');
    expect(scenarioSummaryOutcome({ ...base, avgUserXgDelta: -0.092, avgOpponentXgDelta: 0.068 }, false, 'visible')).toBe('Downgrade');
    expect(scenarioSummaryOutcome({ ...base, avgUserXgDelta: 0.08, avgOpponentXgDelta: 0.064 }, false, 'visible')).toBe('Tradeoff');
    expect(scenarioSummaryOutcome({ ...base, avgUserXgDelta: 0.092 }, false, 'visible')).toBe('Lean up');
    expect(scenarioSummaryOutcome({ ...base, avgOpponentXgDelta: 0.092 }, false, 'visible')).toBe('Risk');
  });

  it('maps scenario summary outcomes for opponent channel scenarios', () => {
    const base = {
      scenario: 'm45-opponent-wide',
      actionType: 'OPPONENT_STYLE',
      avgOpponentXgDelta: 0,
      avgOpponentShotsDelta: 0,
      avgOpponentCentralDelta: 0,
      avgOpponentWideDelta: 0,
      avgOpponentCentralXgDelta: 0,
      avgOpponentWideXgDelta: 0,
      avgOpponentLeftWideXgDelta: 0,
      avgOpponentRightWideXgDelta: 0,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryOutcome({ ...base, avgOpponentXgDelta: 0.04, avgOpponentRightWideXgDelta: 0.10 }, false, 'visible')).toBe('Exposure');
    expect(scenarioSummaryOutcome({ ...base, avgOpponentRightWideXgDelta: 0.08 }, false, 'visible')).toBe('Channel shift');
    expect(scenarioSummaryOutcome({ ...base, avgOpponentCentralXgDelta: -0.08 }, false, 'visible')).toBe('Contained');
    expect(scenarioSummaryOutcome({ ...base, avgOpponentXgDelta: -0.092 }, false, 'visible')).toBe('Contained');
    expect(scenarioSummaryOutcome(base, false, 'visible')).toBe('Neutral');
  });

  it('builds scenario summary coach reads for own tactical changes', () => {
    const base = {
      scenario: 'm45-wide',
      actionType: 'POSITION',
      actionDetail: 'right-overload',
      baselineFormation: '4-4-2',
      changedFormation: '4-4-2',
      avgUserXgDelta: 0,
      avgUserShotsDelta: 0,
      avgUserPossessionDelta: 0,
      avgUserCentralDelta: 0,
      avgUserWideDelta: 0,
      avgOpponentXgDelta: 0,
      avgOpponentShotsDelta: 0,
      avgOpponentCentralDelta: 0,
      avgOpponentWideDelta: 0,
      avgOpponentCentralXgDelta: 0,
      avgOpponentWideXgDelta: 0,
      avgOpponentLeftWideXgDelta: 0,
      avgOpponentRightWideXgDelta: 0,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryCoachRead(base, true, 'strong', 'sin canal claro', 'sin riesgo claro', 'forma')).toBe('formacion: misma que la base (4-4-2)');
    expect(scenarioSummaryCoachRead(base, false, 'noise', 'sin canal claro', 'sin riesgo claro', 'forma')).toBe('forma: sin señal fuerte');
    expect(scenarioSummaryCoachRead(base, false, 'noise', 'más peligro por centro', 'sin riesgo claro', 'forma')).toBe('forma: leve más peligro por centro');
    expect(scenarioSummaryCoachRead({ ...base, avgUserXgDelta: 0.092 }, false, 'visible', 'más peligro por centro', 'sin riesgo claro', 'forma')).toBe('forma: gana ataque más peligro por centro');
    expect(scenarioSummaryCoachRead({ ...base, avgUserXgDelta: 0.092, avgOpponentXgDelta: 0.072, avgOpponentShotsDelta: 0.45 }, false, 'visible', 'más peligro por centro', 'rival entra más por centro', 'forma')).toBe('forma: mas ataque, mas riesgo (más peligro por centro)');
    expect(scenarioSummaryCoachRead({ ...base, avgOpponentXgDelta: -0.092, avgUserXgDelta: -0.08 }, false, 'visible', 'menos peligro por centro', 'rival contenido por centro', 'forma')).toBe('forma: mas seguro, menos ataque (rival contenido por centro)');
  });

  it('builds scenario summary coach reads for opponent scenarios', () => {
    const base = {
      scenario: 'm45-opponent-wide',
      actionType: 'OPPONENT_STYLE',
      avgOpponentXgDelta: 0,
      avgOpponentShotsDelta: 0,
      avgOpponentCentralDelta: 0,
      avgOpponentWideDelta: 0,
      avgOpponentCentralXgDelta: 0,
      avgOpponentWideXgDelta: 0,
      avgOpponentLeftWideXgDelta: 0,
      avgOpponentRightWideXgDelta: 0,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryCoachRead({ ...base, avgOpponentXgDelta: 0.041, avgOpponentShotsDelta: 0.45 }, false, 'visible', 'sin canal claro', 'rival entra más por bandas', 'rival')).toBe('rival: rival amenaza rival entra más por bandas');
    expect(scenarioSummaryCoachRead({ ...base, avgOpponentRightWideXgDelta: 0.08 }, false, 'visible', 'sin canal claro', 'rival entra más por banda derecha', 'rival')).toBe('rival: rival cambia canal rival entra más por banda derecha');
    expect(scenarioSummaryCoachRead({ ...base, avgOpponentXgDelta: -0.05 }, false, 'visible', 'sin canal claro', 'rival contenido por bandas', 'rival')).toBe('rival: rival contenido rival contenido por bandas');
    expect(scenarioSummaryCoachRead(base, false, 'visible', 'sin canal claro', 'sin riesgo claro', 'rival')).toBe('rival: sin riesgo claro');
  });

  it('builds scenario summary detail tooltips', () => {
    const base = {
      scenario: 'm45-wide',
      baselineFormation: '4-4-2',
      changedFormation: '4-4-2',
      actionDetail: '4-4-2',
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryOutcomeReason(base, true, 1.2, 0.4, 0.8, 0.3)).toBe('Misma formación que la base: 4-4-2 = 4-4-2');
    expect(scenarioSummaryOutcomeReason(base, false, 1.234, 0.456, 0.789, 1.111)).toBe('attack gain 1.23 ? attack loss 0.46 ? defensive gain 0.79 ? defensive risk 1.11');
    expect(
      scenarioSummaryCoachReadDetail(
        'forma: gana ataque más peligro por centro',
        'más peligro por centro',
        'rival entra más por bandas',
        '+0.09',
        '+0.04',
        '+1.20',
        '+0.50',
        '+0.02',
        '+0.03'
      )
    ).toBe('forma: gana ataque más peligro por centro ? usuario: más peligro por centro ? rival: rival entra más por bandas ? xG +0.09 / xGA +0.04 ? shots +1.20 / ag +0.50 ? wide L/R rival xG +0.02 / +0.03');
    expect(
      scenarioSummaryRecommendationDetail(
        'Usar como plan A',
        'Strong',
        'Upgrade',
        'forma: gana ataque más peligro por centro'
      )
    ).toBe('Usar como plan A ? lectura: Strong ? resultado: Upgrade ? forma: gana ataque más peligro por centro');
  });

  it('maps scenario summary recommendations from outcome context', () => {
    expect(scenarioSummaryRecommendationFromOutcome(true, 'strong', 'Upgrade', 'formacion')).toBe('Control/no-op');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'noise', 'Upgrade', 'formacion')).toBe('No decidir con esto');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'review', 'Upgrade', 'formacion')).toBe('Revisar con mas seeds');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Upgrade', 'formacion')).toBe('Usar como plan A');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Upgrade', 'rival')).toBe('Plan rival peligroso');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Lean up', 'formacion')).toBe('Usar si necesitas empujar');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Lean up', 'rival')).toBe('Vigilar ese canal');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Contained', 'rival')).toBe('Usar para proteger');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Channel shift', 'rival')).toBe('Usar para cambiar foco');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Tradeoff', 'formacion')).toBe('Usar solo por contexto');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Downgrade', 'formacion')).toBe('Evitar salvo urgencia');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Risk', 'formacion')).toBe('Evitar si defendes');
    expect(scenarioSummaryRecommendationFromOutcome(false, 'strong', 'Neutral', 'formacion')).toBe('Señal leve: confirmar');
  });

  it('maps scenario summary recommendation classes', () => {
    expect(scenarioSummaryRecommendationClass('Control/no-op')).toBe('read-noise');
    expect(scenarioSummaryRecommendationClass('Usar como plan A')).toBe('read-visible');
    expect(scenarioSummaryRecommendationClass('Usar para proteger')).toBe('read-visible');
    expect(scenarioSummaryRecommendationClass('Usar si necesitas empujar')).toBe('read-visible');
    expect(scenarioSummaryRecommendationClass('Usar para cambiar foco')).toBe('read-visible');
    expect(scenarioSummaryRecommendationClass('Plan rival peligroso')).toBe('read-visible');
    expect(scenarioSummaryRecommendationClass('Usar solo por contexto')).toBe('read-check');
    expect(scenarioSummaryRecommendationClass('Revisar con mas seeds')).toBe('read-check');
    expect(scenarioSummaryRecommendationClass('Vigilar ese canal')).toBe('read-check');
    expect(scenarioSummaryRecommendationClass('Evitar si defendes')).toBe('read-strong');
    expect(scenarioSummaryRecommendationClass('Señal leve: confirmar')).toBe('read-stable');
  });

  it('summarizes battery reviews', () => {
    expect(scenarioBatteryReviewHint([])).toContain('pendiente');
    expect(scenarioBatteryReviewHint([row({}), row({ matchId: 'm2' })])).toContain('Revisión OK: 2/2');
    expect(scenarioBatteryReviewHint([row({ review: 'Revisar: poco gol' }), row({ matchId: 'm2' })])).toContain('1/2 para mirar');
  });

  it('builds review items and coach advice', () => {
    const rows = [
      row({ review: 'Revisar: poco gol', cards: [{ title: 'Amenaza rival', label: 'Centro', metrics: 'xGA +0.10', detail: 'riesgo', className: 'read-risk' }] }),
      row({ matchId: 'm2', controlledTeam: 'B', decision: 'Cerrar partido', cards: [{ title: 'Cuidar', label: 'Bloque bajo', metrics: 'xGA -0.10', detail: 'safe', className: 'read-safe' }] }),
    ];

    expect(scenarioBatteryReviewItems(rows)[0].detail).toContain('ctx · Atacar · ok');
    expect(scenarioBatteryCoachAdvice(rows)).toEqual({
      plan: 'B: Cerrar partido',
      risk: 'Centro',
      why: '1/2 lecturas coherentes; confirmar con Multi-seed antes de tocar motor.',
      next: 'Bloque bajo. Confirmar con Multi-seed.',
    });
  });

  it('labels style and shape actions', () => {
    expect(scenarioShapeActionLabel('right-overload')).toBe('Sobrecarga derecha');
    expect(scenarioActionLabel('BALANCED', styles)).toBe('Balanced');
    expect(scenarioActionLabel('OPPONENT WIDE_PLAY', styles)).toBe('Rival: wing play');
    expect(scenarioActionLabel('central-compact', styles)).toBe('Bloque compacto');
  });

  it('labels scenario summary actions and formation changes', () => {
    const base: ScenarioMatrixSummaryRow = {
      actionType: 'FORMATION',
      actionDetail: '4-3-3',
      baselineFormation: '4-4-2',
      changedFormation: '4-3-3',
      sameFormationAsBaseline: false,
    } as ScenarioMatrixSummaryRow;
    const noop = { ...base, changedFormation: '4-4-2', sameFormationAsBaseline: true } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryActionLabel({ actionType: 'STYLE', actionDetail: 'BALANCED' } as ScenarioMatrixSummaryRow, styles)).toBe('Balanced');
    expect(scenarioSummaryFormationLabel(base)).toBe('4-4-2 -> 4-3-3');
    expect(scenarioSummaryFormationHint(base)).toContain('Cambio de formación');
    expect(scenarioSummaryIsFormationNoop(noop)).toBeTrue();
    expect(scenarioSummaryFormationLabel(noop)).toBe('4-4-2 = 4-4-2');
  });

  it('detects scenario summary shape and opponent rows', () => {
    expect(scenarioSummaryIsShapeAction('right-overload')).toBeTrue();
    expect(scenarioSummaryIsShapeAction('S1 -> S2')).toBeFalse();
    expect(scenarioSummaryIsShapeAction(null)).toBeFalse();

    expect(scenarioSummaryIsOpponentRow({ scenario: 'm45-opponent-wide', actionType: 'STYLE' } as ScenarioMatrixSummaryRow)).toBeTrue();
    expect(scenarioSummaryIsOpponentRow({ scenario: 'custom', actionType: 'OPPONENT_STYLE' } as ScenarioMatrixSummaryRow)).toBeTrue();
    expect(scenarioSummaryIsOpponentRow({ scenario: 'm45-wide', actionType: 'STYLE' } as ScenarioMatrixSummaryRow)).toBeFalse();
  });

  it('builds coach read prefixes from summary row type', () => {
    const base = { scenario: 'scenario', actionDetail: null } as unknown as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'FORMATION' })).toBe('formacion');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'STYLE' })).toBe('estilo');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'SUBSTITUTION' })).toBe('cambio');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'POSITION', actionDetail: 'right-overload' })).toBe('forma');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'POSITION', actionDetail: 'S1 -> S2' })).toBe('posicion');
    expect(scenarioSummaryCoachReadPrefix({ ...base, scenario: 'm45-opponent-wide', actionType: 'STYLE' })).toBe('estilo');
    expect(scenarioSummaryCoachReadPrefix({ ...base, scenario: 'custom', actionType: 'OPPONENT_STYLE' })).toBe('rival');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'NOOP_REPLAY' })).toBe('base');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'NONE' })).toBe('base');
    expect(scenarioSummaryCoachReadPrefix({ ...base, actionType: 'MATCHUP' })).toBe('escenario');
  });

  it('builds stable action keys and two-way scores for decision cards', () => {
    const base = {
      scenario: 'm45-wide',
      actionType: 'POSITION',
      actionDetail: 'right-overload',
      avgUserXgDelta: 0.12,
      avgOpponentXgDelta: -0.04,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioActionKey(base)).toBe('POSITION:right-overload');
    expect(scenarioActionKey({ ...base, actionDetail: '', scenario: 'm45-central' })).toBe('POSITION:m45-central');
    expect(scenarioTwoWayScore(base)).toBeCloseTo(0.16, 5);
    expect(scenarioTwoWayScore({ ...base, avgUserXgDelta: -0.03, avgOpponentXgDelta: 0.05 })).toBe(0);
  });

  it('maps scenario read levels into visible confidence labels', () => {
    expect(scenarioDecisionConfidenceFromReadLevel('strong')).toBe('fuerte');
    expect(scenarioDecisionConfidenceFromReadLevel('review')).toBe('fuerte');
    expect(scenarioDecisionConfidenceFromReadLevel('visible')).toBe('media');
    expect(scenarioDecisionConfidenceFromReadLevel('small')).toBe('leve');
    expect(scenarioDecisionConfidenceFromReadLevel('noise')).toBe('marginal');
  });

  it('builds scenario decision metrics and coach-worthy filters', () => {
    const row = {
      scenario: 'm45-wide',
      actionType: 'FORMATION',
      actionDetail: '4-3-3',
      avgUserXgDelta: 0.08,
      avgOpponentXgDelta: 0.04,
      avgUserShotsDelta: 0.5,
      avgOpponentShotsDelta: -0.3,
    } as ScenarioMatrixSummaryRow;
    const fmt = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;

    expect(scenarioDecisionMetrics('Atacar', row, false, 0.06, 'media', fmt)).toBe('xG +0.08 / xGA +0.04 / media');
    expect(scenarioDecisionMetrics('Amenaza rival', row, false, 0.06, 'fuerte', fmt)).toBe('xGA +0.04 / canal +0.06 / fuerte');
    expect(scenarioDecisionMetrics('Cualquier titulo', row, true, 0.05, 'leve', fmt)).toBe('xGA +0.04 / canal +0.05 / leve');
    expect(scenarioAttackCandidateIsCoachWorthy(row)).toBeTrue();
    expect(scenarioAttackCandidateIsCoachWorthy({ ...row, scenario: 'm45-other', actionType: 'STYLE' })).toBeFalse();
    expect(scenarioAttackCandidateIsCoachWorthy({ ...row, avgUserXgDelta: 0.04 })).toBeFalse();
    expect(scenarioAttackPlanScore(row)).toBeCloseTo(0.067, 5);
    expect(scenarioAttackPlanScore({ ...row, actionType: 'SUBSTITUTION' })).toBeCloseTo(0.082, 5);
    expect(scenarioProtectionCandidateIsCoachWorthy(row, '4-3-3')).toBeTrue();
    expect(scenarioProtectionCandidateIsCoachWorthy({ ...row, actionType: 'SUBSTITUTION', avgOpponentXgDelta: -0.05, avgOpponentShotsDelta: -0.3 }, 'A -> B')).toBeTrue();
    expect(scenarioProtectionCandidateIsCoachWorthy({ ...row, actionType: 'SUBSTITUTION', avgOpponentXgDelta: -0.04, avgOpponentShotsDelta: -0.2 }, 'A -> B')).toBeFalse();
  });

  it('scores scenario summary impact from the largest normalized signal', () => {
    const row = {
      avgUserXgDelta: 0.06,
      avgOpponentXgDelta: -0.03,
      avgUserShotsDelta: 0.4,
      avgOpponentShotsDelta: -0.2,
      avgUserPossessionDelta: 0.8,
      avgUserCentralDelta: 0.5,
      avgUserWideDelta: -0.4,
      avgOpponentCentralDelta: 0.3,
      avgOpponentWideDelta: -0.2,
      avgOpponentCentralXgDelta: 0.04,
      avgOpponentWideXgDelta: -0.02,
      avgOpponentLeftWideXgDelta: 0.03,
      avgOpponentRightWideXgDelta: -0.01,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryImpactScore(row)).toBeCloseTo(0.625, 5);
  });

  it('scores scenario summary attack and defense directions', () => {
    const row = {
      avgUserXgDelta: 0.08,
      avgUserShotsDelta: 1.5,
      avgUserPossessionDelta: 3,
      avgUserCentralDelta: 1,
      avgUserWideDelta: 2,
      avgOpponentXgDelta: -0.08,
      avgOpponentShotsDelta: -1.5,
      avgOpponentCentralDelta: -1,
      avgOpponentWideDelta: -2,
      avgOpponentCentralXgDelta: -0.06,
      avgOpponentWideXgDelta: -0.06,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryAttackGainScore(row)).toBeCloseTo(4, 5);
    expect(scenarioSummaryAttackLossScore(row)).toBe(0);
    expect(scenarioSummaryDefensiveGainScore(row)).toBeCloseTo(4, 5);
    expect(scenarioSummaryDefensiveRiskScore(row)).toBe(0);
  });

  it('scores scenario summary losses and risks independently', () => {
    const row = {
      avgUserXgDelta: -0.08,
      avgUserShotsDelta: -1.5,
      avgUserPossessionDelta: -3,
      avgUserCentralDelta: -1,
      avgUserWideDelta: -2,
      avgOpponentXgDelta: 0.08,
      avgOpponentShotsDelta: 1.5,
      avgOpponentCentralDelta: 1,
      avgOpponentWideDelta: 2,
      avgOpponentCentralXgDelta: 0.06,
      avgOpponentWideXgDelta: 0.06,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryAttackGainScore(row)).toBe(0);
    expect(scenarioSummaryAttackLossScore(row)).toBeCloseTo(4, 5);
    expect(scenarioSummaryDefensiveGainScore(row)).toBe(0);
    expect(scenarioSummaryDefensiveRiskScore(row)).toBeCloseTo(4, 5);
  });

  it('flags substitution rows for review when the label and result disagree', () => {
    const base = {
      scenario: 'm45-substitution',
      actionType: 'SUBSTITUTION',
      actionDetail: 'Downgrade [-4]',
      avgUserXgDelta: 0.09,
      avgOpponentXgDelta: 0.01,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryNeedsReview(base)).toBeTrue();
    expect(scenarioSummaryNeedsReview({
      ...base,
      actionDetail: 'Upgrade [+4]',
      avgUserXgDelta: -0.09,
      avgOpponentXgDelta: -0.01,
    })).toBeTrue();
    expect(scenarioSummaryNeedsReview({ ...base, actionType: 'FORMATION' })).toBeFalse();
    expect(scenarioSummaryNeedsReview({ ...base, avgUserXgDelta: 0.04 })).toBeFalse();
  });

  it('detects coherent defensive substitution signals', () => {
    const downgrade = {
      scenario: 'm45-substitution defensive',
      actionType: 'SUBSTITUTION',
      actionDetail: 'Downgrade defensive [-3]',
      avgOpponentXgDelta: 0.04,
      avgOpponentShotsDelta: 0.45,
      avgOpponentCentralDelta: 0,
      avgOpponentWideDelta: 0,
      avgOpponentCentralXgDelta: 0,
      avgOpponentWideXgDelta: 0,
      avgOpponentLeftWideXgDelta: 0,
      avgOpponentRightWideXgDelta: 0,
    } as ScenarioMatrixSummaryRow;
    const upgrade = {
      ...downgrade,
      actionDetail: 'Upgrade defensive [+3]',
      avgOpponentXgDelta: -0.04,
      avgOpponentShotsDelta: -0.45,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryCoherentSubstitutionSignal(downgrade)).toBeTrue();
    expect(scenarioSummaryCoherentSubstitutionSignal(upgrade)).toBeTrue();
    expect(scenarioSummaryCoherentSubstitutionSignal({ ...downgrade, avgOpponentShotsDelta: 0.1 })).toBeFalse();
  });

  it('detects coherent offensive substitution signals', () => {
    const upgrade = {
      scenario: 'm45-substitution offensive',
      actionType: 'SUBSTITUTION',
      actionDetail: 'Upgrade offensive [+3]',
      avgUserXgDelta: 0.04,
      avgUserShotsDelta: 0.35,
    } as ScenarioMatrixSummaryRow;
    const downgrade = {
      ...upgrade,
      actionDetail: 'Downgrade offensive [-3]',
      avgUserXgDelta: -0.04,
      avgUserShotsDelta: -0.35,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryCoherentSubstitutionSignal(upgrade)).toBeTrue();
    expect(scenarioSummaryCoherentSubstitutionSignal(downgrade)).toBeTrue();
    expect(scenarioSummaryCoherentSubstitutionSignal({ ...upgrade, actionType: 'FORMATION' })).toBeFalse();
    expect(scenarioSummaryCoherentSubstitutionSignal({ ...upgrade, avgUserShotsDelta: 0.1 })).toBeFalse();
  });

  it('reads user attacking channels from xG and shot volume', () => {
    const base = {
      avgUserCentralXgDelta: 0,
      avgUserWideXgDelta: 0,
      avgUserLeftWideXgDelta: 0,
      avgUserRightWideXgDelta: 0,
      avgUserCentralDelta: 0,
      avgUserWideDelta: 0,
    } as ScenarioMatrixSummaryRow;

    expect(scenarioSummaryUserChannelRead({ ...base, avgUserCentralXgDelta: 0.03 })).toBe('más peligro por centro');
    expect(scenarioSummaryUserChannelRead({ ...base, avgUserCentralXgDelta: -0.03 })).toBe('menos peligro por centro');
    expect(scenarioSummaryUserChannelRead({ ...base, avgUserWideXgDelta: 0.03, avgUserLeftWideXgDelta: 0.02 })).toBe('más peligro por banda izquierda');
    expect(scenarioSummaryUserChannelRead({ ...base, avgUserWideXgDelta: -0.03, avgUserRightWideXgDelta: -0.02 })).toBe('menos peligro por banda derecha');
    expect(scenarioSummaryUserChannelRead({ ...base, avgUserCentralDelta: 0.6 })).toBe('más volumen por centro');
    expect(scenarioSummaryUserChannelRead({ ...base, avgUserWideDelta: -0.6 })).toBe('menos volumen por bandas');
    expect(scenarioSummaryUserChannelRead(base)).toBe('sin canal claro');
  });

  it('reads opponent channels, risk and protection', () => {
    const base = {
      avgOpponentCentralXgDelta: 0,
      avgOpponentWideXgDelta: 0,
      avgOpponentLeftWideXgDelta: 0,
      avgOpponentRightWideXgDelta: 0,
      avgOpponentCentralDelta: 0,
      avgOpponentWideDelta: 0,
    } as ScenarioMatrixSummaryRow;
    const formatDelta = (value: number) => value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);

    expect(scenarioSummaryOpponentChannelRead({ ...base, avgOpponentCentralXgDelta: 0.03 })).toBe('rival entra más por centro');
    expect(scenarioSummaryOpponentChannelRead({ ...base, avgOpponentWideXgDelta: 0.03, avgOpponentRightWideXgDelta: 0.02 })).toBe('rival entra más por banda derecha');
    expect(scenarioSummaryOpponentChannelRead({ ...base, avgOpponentCentralDelta: -0.6 })).toBe('rival tira menos por centro');
    expect(scenarioSummaryOpponentChannelRead(base)).toBe('sin riesgo claro');
    expect(scenarioOpponentRiskRead({ ...base, avgOpponentLeftWideXgDelta: 0.04 }, formatDelta)).toBe('rival amenaza por banda izquierda (+0.04 xG canal)');
    expect(scenarioOpponentProtectionRead({ ...base, avgOpponentRightWideXgDelta: -0.04 }, formatDelta)).toBe('rival contenido por banda derecha (-0.04 xG canal)');
  });
});
