import {
  buildScenarioDecisionCardsFromSummary,
  scenarioActionLabel,
  scenarioActionKey,
  scenarioAttackCandidateIsCoachWorthy,
  scenarioAttackPlanScore,
  inferScenarioBatteryCoachObjective,
  scenarioBatteryCardDetail,
  scenarioBatteryCardSummary,
  scenarioBatteryCoachAdvice,
  scenarioBatteryCoachContext,
  scenarioBatteryDecision,
  scenarioBatteryDecisionMinute,
  scenarioBatteryDecisionReview,
  scenarioBatteryCoachObjectiveLabel,
  scenarioBatteryContextPressure,
  scenarioBatteryExportRow,
  scenarioBatteryGoalDiff,
  scenarioBatteryGroupLabel,
  scenarioBatteryMatchStateText,
  scenarioBatteryMetricText,
  scenarioBatteryReviewHint,
  scenarioBatteryReviewItems,
  scenarioBatteryRiskCardDetail,
  scenarioBatteryRiskCardSummary,
  scenarioBatterySquadText,
  scenarioBatteryTeamCondition,
  scenarioBatteryTeamRating,
  scenarioBatteryTeamReputation,
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
import { ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixSummaryRow, TeamStyleOption, TestHarnessMatchRow } from '../models/test-harness.model';

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

function matchRow(partial: Partial<TestHarnessMatchRow> = {}): TestHarnessMatchRow {
  return {
    matchId: 'match-1',
    round: 1,
    homeTeamId: 'home',
    homeTeamName: 'Real Madrid',
    awayTeamId: 'away',
    awayTeamName: 'Las Palmas',
    status: 'COMPLETED',
    homeGoals: 1,
    awayGoals: 0,
    homeFormation: '4-4-2',
    awayFormation: '4-3-3',
    homeStrength: {
      squadOvr: 84,
      startingOvr: 86,
      squadSize: 24,
      starterCount: 11,
      avgEnergy: 90,
      avgForm: 70,
      avgStamina: 82,
    },
    awayStrength: {
      squadOvr: 74,
      startingOvr: 75,
      squadSize: 23,
      starterCount: 11,
      avgEnergy: 76,
      avgForm: 55,
      avgStamina: 74,
    },
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

  it('reads scenario battery coach context from match state and squad strength', () => {
    const match = matchRow();

    expect(scenarioBatteryMetricText(null, 'EN')).toBe('EN ?');
    expect(scenarioBatteryMetricText(86.6, 'EN')).toBe('EN 87');
    expect(scenarioBatteryTeamReputation('Atlético Madrid')).toBe(5);
    expect(scenarioBatteryTeamReputation('Real Sociedad')).toBe(4);
    expect(scenarioBatteryTeamReputation('Las Palmas')).toBe(3);
    expect(scenarioBatteryTeamReputation('Granada')).toBe(2);
    expect(scenarioBatteryTeamRating('Unknown FC', { startingOvr: 79 })).toEqual({ value: 79, source: 'strength' });
    expect(scenarioBatteryTeamRating('Barcelona', null)).toEqual({ value: 5, source: 'name' });
    expect(scenarioBatteryTeamCondition({ avgEnergy: 70, avgForm: 65, avgStamina: 80 })).toEqual({ label: 'cansado', tired: true, fresh: false });
    expect(scenarioBatteryTeamCondition({ avgEnergy: 90, avgForm: 70, avgStamina: 82 })).toEqual({ label: 'fresco', tired: false, fresh: true });
    expect(scenarioBatteryTeamCondition(null)).toEqual({ label: 'condicion?', tired: false, fresh: false });
    expect(scenarioBatterySquadText(match.homeStrength ?? null)).toBe('squadOvr 84, startingOvr 86, squad 24, XI 11');
    expect(scenarioBatteryGoalDiff(match, 'HOME')).toBe(1);
    expect(scenarioBatteryGoalDiff(match, 'AWAY')).toBe(-1);
    expect(scenarioBatteryDecisionMinute(match, 0)).toBe(75);
    expect(scenarioBatteryDecisionMinute(match, 62)).toBe(62);
    expect(scenarioBatteryMatchStateText(match, 'HOME', 62)).toEqual({
      summary: '1-0 min 62',
      detail: '1-0, min 62, ganando +1',
    });
    expect(scenarioBatteryContextPressure(match, 'HOME')).toEqual({
      label: 'local/favorito/ovr/fresco',
      reputationDelta: 11,
      away: false,
      strongThreshold: 4,
      tired: false,
      fresh: true,
    });
    expect(scenarioBatteryCoachContext(match, 'HOME', 62)).toEqual({
      summary: '1-0 min 62 · local/favorito/ovr/fresco · OVR 86-75 · EN 90',
      detail: 'Real Madrid vs Las Palmas · Partido: 1-0, min 62, ganando +1 · Contexto: local/favorito/ovr/fresco · Fuente: OVR real · OVR propio/rival: 86/75 · Condición propia: EN 90, FOR 70, STA 82 · Plantel propio: squadOvr 84, startingOvr 86, squad 24, XI 11 · Plantel rival: squadOvr 74, startingOvr 75, squad 23, XI 11',
    });
  });

  it('infers scenario battery coach objective from score, minute and pressure', () => {
    expect(inferScenarioBatteryCoachObjective(matchRow({ homeGoals: 0, awayGoals: 1 }), 'HOME', 55)).toBe('NEED_GOAL');
    expect(inferScenarioBatteryCoachObjective(matchRow({ homeGoals: 2, awayGoals: 0 }), 'AWAY', 45)).toBe('NEED_GOAL');
    expect(inferScenarioBatteryCoachObjective(matchRow({ homeGoals: 1, awayGoals: 0 }), 'HOME', 72)).toBe('PROTECT_RESULT');
    expect(inferScenarioBatteryCoachObjective(matchRow({ homeGoals: 1, awayGoals: 1 }), 'HOME', 66)).toBe('NEED_GOAL');
    expect(inferScenarioBatteryCoachObjective(matchRow({
      homeGoals: 1,
      awayGoals: 1,
      homeStrength: { avgEnergy: 70, startingOvr: 73 },
      awayStrength: { startingOvr: 78 },
    }), 'HOME', 72)).toBe('PROTECT_RESULT');
    expect(inferScenarioBatteryCoachObjective(matchRow({ homeGoals: null, awayGoals: null }), 'HOME', 80)).toBe('NEUTRAL');
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

  it('builds scenario decision cards from summary rows', () => {
    const baseRow = {
      scenario: 'base-noop',
      actionType: 'NOOP_REPLAY',
      actionDetail: 'baseline',
      avgUserXgDelta: 0,
      avgOpponentXgDelta: 0,
      avgUserShotsDelta: 0,
      avgOpponentShotsDelta: 0,
    } as ScenarioMatrixSummaryRow;
    const rows = [
      baseRow,
      { ...baseRow, scenario: 'm45-wide', actionType: 'POSITION', actionDetail: 'wide', avgUserXgDelta: 0.08, avgOpponentXgDelta: -0.05 },
      { ...baseRow, scenario: 'm45-central', actionType: 'FORMATION', actionDetail: '4-3-3', avgUserXgDelta: 0.10, avgOpponentXgDelta: 0.02 },
      { ...baseRow, scenario: 'm45-risk', actionType: 'STYLE', actionDetail: 'risky', avgUserXgDelta: 0.03, avgOpponentXgDelta: 0.12 },
      { ...baseRow, scenario: 'm45-opponent-wide', actionType: 'OPPONENT_STYLE', actionDetail: 'wide-rival', avgOpponentXgDelta: 0.06 },
    ] as ScenarioMatrixSummaryRow[];
    const fmt = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
    const cards = buildScenarioDecisionCardsFromSummary(rows, {
      actionKey: (row) => `${row.actionType}:${row.actionDetail || row.scenario}`,
      attackCandidateIsCoachWorthy: (row) => row.avgUserXgDelta >= 0.06,
      attackPlanScore: (row) => row.avgUserXgDelta,
      cardFromRow: (title, row, className, detail) => ({
        title,
        label: row.actionDetail || row.scenario,
        metrics: `${fmt(row.avgUserXgDelta)} / ${fmt(row.avgOpponentXgDelta)}`,
        detail,
        className,
      }),
      isOpponentRow: (row) => row.scenario.startsWith('m45-opponent-') || row.actionType === 'OPPONENT_STYLE',
      opponentMaxChannelXgDelta: (row) => row.avgOpponentXgDelta,
      opponentMinChannelXgDelta: (row) => row.avgOpponentXgDelta,
      opponentProtectionRead: (row) => `protege ${row.actionDetail}`,
      opponentRiskRead: (row) => `riesgo ${row.actionDetail}`,
      protectionCandidateIsCoachWorthy: () => false,
      summaryActionLabel: (row) => row.actionDetail || 'Baseline',
      summaryCoachRead: (row) => `coach ${row.actionDetail}`,
      userChannelRead: (row) => `canal ${row.actionDetail}`,
      twoWayScore: (row) => Math.max(0, row.avgUserXgDelta) + Math.max(0, -row.avgOpponentXgDelta),
      formatDeltaNumber: fmt,
    });

    expect(cards.map((card) => card.title)).toEqual(['Plan actual', 'Doble ganancia', 'Atacar', 'Riesgo ofensivo', 'Amenaza rival']);
    expect(cards[0]).toEqual({
      title: 'Plan actual',
      label: 'baseline',
      metrics: 'xG +0.00 / xGA +0.00',
      detail: 'coach baseline',
      className: 'decision-neutral',
    });
    expect(cards[1].detail).toBe('canal wide / protege wide');
    expect(cards[3].detail).toBe('canal risky / riesgo risky');
    expect(cards[4].detail).toBe('riesgo wide-rival');
  });

  it('chooses scenario battery decisions from cards and coach objective', () => {
    const card = (title: string, label = title): ScenarioDecisionCard => ({
      title,
      label,
      metrics: `${title} metrics`,
      detail: `${title} detail`,
      className: 'decision-test',
    });

    expect(scenarioBatteryDecision([card('Doble ganancia', 'Plan doble')], 'NEUTRAL')).toEqual({
      label: 'Aprovechar: Plan doble',
      detail: 'Plan doble da doble ganancia. Doble ganancia metrics. Doble ganancia detail',
    });
    expect(scenarioBatteryDecision([card('Doble ganancia', 'Plan doble'), card('Amenaza rival', 'Banda rival')], 'PROTECT_RESULT')).toEqual({
      label: 'Cerrar amenaza: Banda rival + Plan doble',
      detail: 'La amenaza rival sigue visible. Cierre: Doble ganancia metrics. Amenaza: Amenaza rival metrics. Doble ganancia detail',
    });
    expect(scenarioBatteryDecision([card('Cuidar', 'Bloque bajo')], 'PROTECT_RESULT')).toEqual({
      label: 'Cerrar partido: Bloque bajo',
      detail: 'Bloque bajo es la mejor protección para cuidar resultado. Cuidar metrics. Cuidar detail',
    });
    expect(scenarioBatteryDecision([card('Riesgo ofensivo', 'Ataque total')], 'NEED_GOAL')).toEqual({
      label: 'Riesgo asumible: Ataque total',
      detail: 'Ataque total mejora el ataque y puede valer la pena si necesitás gol. Ojo: abre espacios. Riesgo ofensivo metrics. Riesgo ofensivo detail',
    });
    expect(scenarioBatteryDecision([card('Evitar', 'Mal cambio')], 'NEED_GOAL')).toEqual({
      label: 'Sin vía clara: Mal cambio',
      detail: 'Necesitás gol, pero la batería no encontró una vía ofensiva clara; Mal cambio aparece como acción a evitar, no como solución. Evitar metrics. Evitar detail',
    });
    expect(scenarioBatteryDecision([], 'NEUTRAL')).toEqual({
      label: 'Mantener equipo',
      detail: 'No hay una señal suficientemente clara para recomendar un cambio de DT en esta batería.',
    });
  });

  it('reviews scenario battery decisions against coach objective', () => {
    const card = (title: string): ScenarioDecisionCard => ({
      title,
      label: title,
      metrics: `${title} metrics`,
      detail: `${title} detail`,
      className: 'decision-test',
    });

    expect(scenarioBatteryDecisionReview('NEED_GOAL', 'Sin vía clara: 4-3-3', [card('Evitar')], 'Necesito gol')).toEqual({
      label: 'OK: sin vía clara',
      detail: 'El objetivo es buscar gol y la batería confirmó que no hay Atacar, Riesgo ofensivo ni Doble ganancia; "Sin vía clara: 4-3-3" queda como diagnóstico, no como falso positivo.',
    });
    expect(scenarioBatteryDecisionReview('NEED_GOAL', 'Cerrar partido: Bloque bajo', [card('Cuidar')], 'Necesito gol').label).toBe('Revisar: poco gol');
    expect(scenarioBatteryDecisionReview('NEED_GOAL', 'Mantener equipo', [], 'Necesito gol').label).toBe('Revisar: poco gol');
    expect(scenarioBatteryDecisionReview('PROTECT_RESULT', 'Riesgo asumible: Ataque total', [card('Riesgo ofensivo')], 'Cuidar resultado').label).toBe('Revisar: mucho riesgo');
    expect(scenarioBatteryDecisionReview('PROTECT_RESULT', 'Mantener equipo', [], 'Cuidar resultado').label).toBe('Revisar: sin cierre');
    expect(scenarioBatteryDecisionReview('NEUTRAL', 'Riesgo alto: Ataque total', [card('Riesgo ofensivo')], 'Neutral').label).toBe('Revisar: riesgo neutral');
    expect(scenarioBatteryDecisionReview('NEUTRAL', 'Atacar con cuidado: A vs B', [card('Atacar'), card('Amenaza rival')], 'Neutral')).toEqual({
      label: 'OK: ataque contextual',
      detail: 'La decisión "Atacar con cuidado: A vs B" combina vía ofensiva con amenaza rival visible.',
    });
    expect(scenarioBatteryDecisionReview('NEUTRAL', 'Atacar: Banda izquierda', [card('Atacar')], 'Neutral')).toEqual({
      label: 'OK',
      detail: 'La decisión "Atacar: Banda izquierda" es consistente con el objetivo Neutral y las señales disponibles.',
    });
  });

  it('summarizes scenario battery cards and risk fallbacks', () => {
    const card = (title: string, label = title, metrics = `${title} metrics`, detail = `${title} detail`): ScenarioDecisionCard => ({
      title,
      label,
      metrics,
      detail,
      className: 'decision-test',
    });
    const battery = row({
      cards: [
        card('Atacar', 'Banda izquierda', 'xG +0.12', 'Ataca el lado débil.'),
        card('Evitar', 'Ataque total', 'xGA +0.20', 'Abre demasiado el partido.'),
      ],
    });

    expect(scenarioBatteryCardSummary(battery, 'Atacar')).toBe('Banda izquierda - xG +0.12');
    expect(scenarioBatteryCardDetail(battery, 'Atacar')).toBe('Ataca el lado débil.');
    expect(scenarioBatteryCardSummary(battery, 'Cuidar')).toBe('-');
    expect(scenarioBatteryCardDetail(battery, 'Cuidar')).toBe('Sin señal clara en esta batería.');
    expect(scenarioBatteryRiskCardSummary(battery)).toBe('Ataque total - xGA +0.20');
    expect(scenarioBatteryRiskCardDetail(battery)).toBe('Abre demasiado el partido.');
    expect(scenarioBatteryRiskCardSummary(row({ cards: [] }))).toBe('-');
    expect(scenarioBatteryRiskCardDetail(row({ cards: [] }))).toBe('Sin riesgo claro en esta batería.');
  });

  it('exports scenario battery rows with readable labels and card fields', () => {
    const exported = scenarioBatteryExportRow(row({
      scenarioGroup: 'DEFENSE',
      coachObjective: 'PROTECT_RESULT',
      cards: [
        {
          title: 'Plan actual',
          label: '4-4-2 base',
          metrics: 'xG 1.10 / xGA 0.90',
          detail: 'Plan estable.',
          className: 'decision-neutral',
        },
        {
          title: 'Cuidar',
          label: 'Bloque medio',
          metrics: 'xGA -0.12',
          detail: 'Cierra el centro.',
          className: 'decision-safe',
        },
        {
          title: 'Riesgo ofensivo',
          label: 'Ataque total',
          metrics: 'xGA +0.18',
          detail: 'Demasiado abierto.',
          className: 'decision-risk',
        },
      ],
    }));

    expect(exported['match']).toBe('A vs B');
    expect(exported['scenarioGroup']).toBe('Defensa');
    expect(exported['coachObjective']).toBe('Cuidar resultado');
    expect(exported['decision']).toBe('Atacar');
    expect(exported['plan']).toBe('4-4-2 base - xG 1.10 / xGA 0.90');
    expect(exported['protect']).toBe('Bloque medio - xGA -0.12');
    expect(exported['avoid']).toBe('Ataque total - xGA +0.18');
    expect(exported['planDetail']).toBe('Plan estable.');
    expect(exported['protectDetail']).toBe('Cierra el centro.');
    expect(exported['avoidDetail']).toBe('Demasiado abierto.');
    expect(exported['attack']).toBe('-');
    expect(exported['attackDetail']).toBe('Sin señal clara en esta batería.');
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
