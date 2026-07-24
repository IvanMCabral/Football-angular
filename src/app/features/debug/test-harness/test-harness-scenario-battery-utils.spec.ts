import {
  scenarioActionLabel,
  scenarioBatteryCoachAdvice,
  scenarioBatteryCoachObjectiveLabel,
  scenarioBatteryGroupLabel,
  scenarioBatteryReviewHint,
  scenarioBatteryReviewItems,
  scenarioOpponentProtectionRead,
  scenarioOpponentRiskRead,
  scenarioShapeActionLabel,
  scenarioSummaryActionLabel,
  scenarioSummaryFormationHint,
  scenarioSummaryFormationLabel,
  scenarioSummaryIsFormationNoop,
  scenarioSummaryOpponentChannelRead,
  scenarioSummaryUserChannelRead,
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
