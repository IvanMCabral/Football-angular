import {
  scenarioActionLabel,
  scenarioBatteryCoachAdvice,
  scenarioBatteryCoachObjectiveLabel,
  scenarioBatteryGroupLabel,
  scenarioBatteryReviewHint,
  scenarioBatteryReviewItems,
  scenarioShapeActionLabel,
  scenarioSummaryActionLabel,
  scenarioSummaryFormationHint,
  scenarioSummaryFormationLabel,
  scenarioSummaryIsFormationNoop,
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
});
