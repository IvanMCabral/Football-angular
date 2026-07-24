import {
  ScenarioBatteryCoachAdvice,
  ScenarioBatteryCoachObjective,
  ScenarioBatteryReviewItem,
  ScenarioBatteryRow,
  ScenarioMatrixSummaryRow,
  TeamStyleOption,
} from '../models/test-harness.model';

export function scenarioBatteryCoachObjectiveLabel(objective: ScenarioBatteryCoachObjective): string {
  switch (objective) {
    case 'NEED_GOAL':
      return 'Necesito gol';
    case 'PROTECT_RESULT':
      return 'Cuidar resultado';
    default:
      return 'Neutral';
  }
}

export function scenarioBatteryGroupLabel(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): string {
  switch (group) {
    case 'ALL':
      return 'Todo';
    case 'DEFENSE':
      return 'Defensa';
    case 'OPPONENT':
      return 'Rival';
    default:
      return 'Ataque';
  }
}

export function scenarioBatteryReviewCount(rows: ScenarioBatteryRow[]): number {
  return rows.filter((row) => row.review.startsWith('Revisar')).length;
}

export function scenarioBatteryReviewHint(rows: ScenarioBatteryRow[]): string {
  if (rows.length === 0) {
    return 'Revisión pendiente: corre Tablero batería.';
  }
  const reviewCount = scenarioBatteryReviewCount(rows);
  if (reviewCount === 0) {
    return `Revisión OK: ${rows.length}/${rows.length} lecturas coherentes.`;
  }
  const labels = Array.from(new Set(rows
    .filter((row) => row.review.startsWith('Revisar'))
    .map((row) => row.review)
  ));
  const sample = labels.slice(0, 2).join(' + ');
  const suffix = labels.length > 2 ? ` +${labels.length - 2}` : '';
  return `Revisión: ${reviewCount}/${rows.length} para mirar (${sample}${suffix}).`;
}

export function scenarioBatteryReviewItems(rows: ScenarioBatteryRow[]): ScenarioBatteryReviewItem[] {
  return rows
    .filter((row) => row.review.startsWith('Revisar'))
    .slice(0, 5)
    .map((row) => ({
      key: `${row.matchId}-${row.controlledSide}-${row.review}`,
      summary: `${row.review}: ${row.controlledTeam} vs ${row.matchLabel}`,
      detail: `${row.coachContext} · ${row.decision} · ${row.reviewDetail}`,
    }));
}

export function scenarioBatteryCoachAdvice(rows: ScenarioBatteryRow[]): ScenarioBatteryCoachAdvice | null {
  if (rows.length === 0) {
    return null;
  }
  const okRows = rows.filter((row) => !row.review.startsWith('Revisar'));
  const planRow = okRows[0] || rows[0];
  const riskCard = rows
    .flatMap((row) => row.cards || [])
    .find((card) => card.title.toLowerCase().includes('amenaza'));
  const nextCard = planRow.cards?.[0];
  return {
    plan: `${planRow.controlledTeam}: ${planRow.decision}`,
    risk: riskCard ? riskCard.label : 'Sin riesgo principal claro',
    why: `${okRows.length}/${rows.length} lecturas coherentes; confirmar con Multi-seed antes de tocar motor.`,
    next: `${nextCard?.label || planRow.decision}. Confirmar con Multi-seed.`,
  };
}

export interface ScenarioSummaryOutcomeSummaryItem {
  label: string;
  count: number;
  className: string;
  hint: string;
}

export function scenarioSummaryOutcomeSummaryFromOutcomes(
  outcomes: string[]
): ScenarioSummaryOutcomeSummaryItem[] {
  const countMatching = (matches: (outcome: string) => boolean): number => outcomes.filter(matches).length;
  return [
    {
      label: 'Upgrade',
      className: 'read-visible',
      hint: 'Mejora clara: sube ataque y/o baja amenaza rival sin coste fuerte.',
      count: countMatching((outcome) => outcome === 'Upgrade' || outcome === 'Lean up'),
    },
    {
      label: 'Tradeoff',
      className: 'read-strong',
      hint: 'Gana algo y paga algo: mejor ataque con más riesgo, o más protección con menos ataque.',
      count: countMatching((outcome) => outcome === 'Tradeoff'),
    },
    {
      label: 'Risk/Exposure',
      className: 'read-check',
      hint: 'Empeora el equipo, abre riesgo importante o el rival expone un carril/zona.',
      count: countMatching((outcome) => outcome === 'Risk' || outcome === 'Downgrade' || outcome === 'Exposure'),
    },
    {
      label: 'Contained',
      className: 'read-visible',
      hint: 'El rival prueba un carril/plan pero queda contenido.',
      count: countMatching((outcome) => outcome === 'Contained'),
    },
    {
      label: 'Neutral',
      className: 'read-stable',
      hint: 'Sin cambio futbolístico suficiente para tomar decisión.',
      count: countMatching((outcome) => outcome === 'Neutral'),
    },
  ];
}

export function scenarioSummaryOutcomeClass(outcome: string): string {
  if (outcome === 'Baseline/no-op') return 'read-noise';
  if (outcome === 'Upgrade' || outcome === 'Lean up') return 'read-visible';
  if (outcome === 'Contained') return 'read-visible';
  if (outcome === 'Channel shift') return 'read-visible';
  if (outcome === 'Tradeoff') return 'read-strong';
  if (outcome === 'Downgrade' || outcome === 'Risk' || outcome === 'Exposure') return 'read-check';
  return 'read-stable';
}

export function scenarioSummaryRecommendationFromOutcome(
  isFormationNoop: boolean,
  level: string,
  outcome: string,
  prefix: string
): string {
  if (isFormationNoop) return 'Control/no-op';
  if (level === 'noise') return 'No decidir con esto';
  if (level === 'review') return 'Revisar con mas seeds';
  if (outcome === 'Upgrade') return prefix === 'rival' ? 'Plan rival peligroso' : 'Usar como plan A';
  if (outcome === 'Lean up') return prefix === 'rival' ? 'Vigilar ese canal' : 'Usar si necesitas empujar';
  if (outcome === 'Contained') return 'Usar para proteger';
  if (outcome === 'Channel shift') return 'Usar para cambiar foco';
  if (outcome === 'Tradeoff') return 'Usar solo por contexto';
  if (outcome === 'Downgrade') return 'Evitar salvo urgencia';
  if (outcome === 'Risk' || outcome === 'Exposure') return 'Evitar si defendes';
  return 'Señal leve: confirmar';
}

export function scenarioSummaryRecommendationClass(recommendation: string): string {
  if (recommendation === 'Control/no-op') return 'read-noise';
  if (recommendation.startsWith('Usar como plan A') || recommendation.startsWith('Usar para proteger')) return 'read-visible';
  if (recommendation.startsWith('Usar si') || recommendation.startsWith('Usar para cambiar') || recommendation.startsWith('Plan rival')) return 'read-visible';
  if (recommendation.startsWith('Usar solo') || recommendation.startsWith('Revisar') || recommendation.startsWith('Vigilar')) return 'read-check';
  if (recommendation.startsWith('Evitar')) return 'read-strong';
  return 'read-stable';
}

export function scenarioShapeActionLabel(actionDetail: string): string | null {
  const normalized = actionDetail.trim().toLowerCase();
  if (normalized.startsWith('right-overload')) return 'Sobrecarga derecha';
  if (normalized.startsWith('left-overload')) return 'Sobrecarga izquierda';
  if (normalized.startsWith('wide-overload')) return 'Amplitud ofensiva';
  if (normalized.startsWith('compact-center')) return 'Cerrar el centro';
  if (normalized.startsWith('attacking-high')) return 'Ataque alto';
  if (normalized.startsWith('attacking-step')) return 'Paso ofensivo';
  if (normalized.startsWith('defensive-step')) return 'Paso defensivo';
  if (normalized.startsWith('defensive-low')) return 'Bloque bajo';
  if (normalized.startsWith('central-compact')) return 'Bloque compacto';
  return null;
}

export function styleLabelFromActionDetail(
  actionDetail: string | null | undefined,
  teamStyleOptions: readonly TeamStyleOption[]
): string | null {
  if (!actionDetail) {
    return null;
  }
  const normalized = actionDetail.trim().toUpperCase();
  const option = teamStyleOptions.find((o) => o.value === normalized);
  return option?.label ?? null;
}

export function scenarioActionLabel(
  actionDetail: string | null | undefined,
  teamStyleOptions: readonly TeamStyleOption[]
): string | null {
  if (!actionDetail) {
    return null;
  }
  const detail = actionDetail.trim();
  const normalized = detail.toUpperCase();
  if (normalized.startsWith('OPPONENT ')) {
    const opponentStyle = normalized.replace(/^OPPONENT\s+/, '');
    const label = styleLabelFromActionDetail(opponentStyle, teamStyleOptions);
    return label ? `Rival: ${label.toLowerCase()}` : `Rival: ${detail.replace(/^Opponent\s+/i, '')}`;
  }
  const ownStyle = styleLabelFromActionDetail(detail, teamStyleOptions);
  if (ownStyle) {
    return ownStyle;
  }
  const shapeLabel = scenarioShapeActionLabel(detail);
  if (shapeLabel) {
    return shapeLabel;
  }
  return detail;
}

export function scenarioSummaryActionLabel(
  row: ScenarioMatrixSummaryRow,
  teamStyleOptions: readonly TeamStyleOption[]
): string {
  if (row.actionType === 'NONE') {
    return 'Base';
  }
  if (row.actionType === 'STYLE') {
    return scenarioActionLabel(row.actionDetail, teamStyleOptions) ?? 'Estilo';
  }
  return scenarioActionLabel(row.actionDetail, teamStyleOptions) ?? (row.actionDetail || row.actionType);
}

export function scenarioSummaryIsFormationNoop(row: ScenarioMatrixSummaryRow): boolean {
  return row.actionType === 'FORMATION' && !!row.sameFormationAsBaseline;
}

export function scenarioSummaryIsShapeAction(actionDetail: string | null | undefined): boolean {
  return !!actionDetail && !!scenarioShapeActionLabel(actionDetail);
}

export function scenarioSummaryIsOpponentRow(row: ScenarioMatrixSummaryRow): boolean {
  return row.scenario.startsWith('m45-opponent-') || row.actionType === 'OPPONENT_STYLE';
}

export function scenarioSummaryCoachReadPrefix(row: ScenarioMatrixSummaryRow): string {
  if (row.actionType === 'FORMATION') return 'formacion';
  if (row.actionType === 'STYLE') return 'estilo';
  if (row.actionType === 'SUBSTITUTION') return 'cambio';
  if (row.actionType === 'POSITION') {
    return scenarioSummaryIsShapeAction(row.actionDetail) ? 'forma' : 'posicion';
  }
  if (scenarioSummaryIsOpponentRow(row)) return 'rival';
  if (row.actionType === 'NOOP_REPLAY' || row.actionType === 'NONE') return 'base';
  return 'escenario';
}

export function scenarioActionKey(row: ScenarioMatrixSummaryRow): string {
  return `${row.actionType}:${row.actionDetail || row.scenario}`;
}

export function scenarioTwoWayScore(row: ScenarioMatrixSummaryRow): number {
  return Math.max(0, row.avgUserXgDelta) + Math.max(0, -row.avgOpponentXgDelta);
}

export function scenarioDecisionConfidenceFromReadLevel(level: string): string {
  if (level === 'strong' || level === 'review') return 'fuerte';
  if (level === 'visible') return 'media';
  if (level === 'small') return 'leve';
  return 'marginal';
}

export function scenarioSummaryFormationLabel(row: ScenarioMatrixSummaryRow): string {
  const base = row.baselineFormation || '';
  const changed = row.changedFormation || (row.actionType === 'FORMATION' ? row.actionDetail : '');
  if (row.actionType !== 'FORMATION') return base || '-';
  if (scenarioSummaryIsFormationNoop(row)) return `${base} = ${changed || base}`;
  return `${base || 'base'} -> ${changed || row.actionDetail || 'sin dato'}`;
}

export function scenarioSummaryFormationHint(row: ScenarioMatrixSummaryRow): string {
  if (scenarioSummaryIsFormationNoop(row)) {
    return 'La formación del escenario coincide con la formación base; se interpreta como control/no-op, no como fallo del motor.';
  }
  if (row.actionType === 'FORMATION') {
    return `Cambio de formación: ${row.baselineFormation || 'base'} -> ${row.changedFormation || row.actionDetail || 'sin dato'}`;
  }
  return row.baselineFormation
    ? `Formación base: ${row.baselineFormation}`
    : 'Sin cambio de formación en este escenario.';
}

export function scenarioSummaryUserChannelRead(row: ScenarioMatrixSummaryRow): string {
  const central = row.avgUserCentralXgDelta;
  const wide = row.avgUserWideXgDelta;
  const left = row.avgUserLeftWideXgDelta;
  const right = row.avgUserRightWideXgDelta;
  const bestWideSide = Math.abs(left) >= Math.abs(right) ? 'izquierda' : 'derecha';
  const bestWideValue = Math.abs(left) >= Math.abs(right) ? left : right;
  if (Math.abs(central) >= Math.abs(wide) && Math.abs(central) >= 0.025) {
    return central > 0 ? 'más peligro por centro' : 'menos peligro por centro';
  }
  if (Math.abs(wide) >= 0.025) {
    if (Math.abs(bestWideValue) >= 0.018) {
      return bestWideValue > 0 ? `más peligro por banda ${bestWideSide}` : `menos peligro por banda ${bestWideSide}`;
    }
    return wide > 0 ? 'más peligro por bandas' : 'menos peligro por bandas';
  }
  if (Math.abs(row.avgUserCentralDelta) > Math.abs(row.avgUserWideDelta) && Math.abs(row.avgUserCentralDelta) >= 0.5) {
    return row.avgUserCentralDelta > 0 ? 'más volumen por centro' : 'menos volumen por centro';
  }
  if (Math.abs(row.avgUserWideDelta) >= 0.5) {
    return row.avgUserWideDelta > 0 ? 'más volumen por bandas' : 'menos volumen por bandas';
  }
  return 'sin canal claro';
}

export function scenarioSummaryOpponentChannelRead(row: ScenarioMatrixSummaryRow): string {
  const central = row.avgOpponentCentralXgDelta;
  const wide = row.avgOpponentWideXgDelta;
  const left = row.avgOpponentLeftWideXgDelta;
  const right = row.avgOpponentRightWideXgDelta;
  const exposedSide = Math.abs(left) >= Math.abs(right) ? 'izquierda' : 'derecha';
  const exposedValue = Math.abs(left) >= Math.abs(right) ? left : right;
  if (Math.abs(central) >= Math.abs(wide) && Math.abs(central) >= 0.025) {
    return central > 0 ? 'rival entra más por centro' : 'rival contenido por centro';
  }
  if (Math.abs(wide) >= 0.025) {
    if (Math.abs(exposedValue) >= 0.018) {
      return exposedValue > 0 ? `rival entra más por banda ${exposedSide}` : `rival contenido por banda ${exposedSide}`;
    }
    return wide > 0 ? 'rival entra más por bandas' : 'rival contenido por bandas';
  }
  if (Math.abs(row.avgOpponentCentralDelta) > Math.abs(row.avgOpponentWideDelta) && Math.abs(row.avgOpponentCentralDelta) >= 0.5) {
    return row.avgOpponentCentralDelta > 0 ? 'rival tira más por centro' : 'rival tira menos por centro';
  }
  if (Math.abs(row.avgOpponentWideDelta) >= 0.5) {
    return row.avgOpponentWideDelta > 0 ? 'rival tira más por bandas' : 'rival tira menos por bandas';
  }
  return 'sin riesgo claro';
}

export function scenarioOpponentRiskRead(
  row: ScenarioMatrixSummaryRow,
  formatDeltaNumber: (value: number) => string,
): string {
  const channels = [
    { label: 'centro', value: row.avgOpponentCentralXgDelta },
    { label: 'banda izquierda', value: row.avgOpponentLeftWideXgDelta },
    { label: 'banda derecha', value: row.avgOpponentRightWideXgDelta },
  ].sort((a, b) => b.value - a.value);
  const top = channels[0];
  if (top.value >= 0.025) {
    return `rival amenaza por ${top.label} (${formatDeltaNumber(top.value)} xG canal)`;
  }
  return scenarioSummaryOpponentChannelRead(row);
}

export function scenarioOpponentProtectionRead(
  row: ScenarioMatrixSummaryRow,
  formatDeltaNumber: (value: number) => string,
): string {
  const channels = [
    { label: 'centro', value: row.avgOpponentCentralXgDelta },
    { label: 'banda izquierda', value: row.avgOpponentLeftWideXgDelta },
    { label: 'banda derecha', value: row.avgOpponentRightWideXgDelta },
  ].sort((a, b) => a.value - b.value);
  const best = channels[0];
  if (best.value <= -0.025) {
    return `rival contenido por ${best.label} (${formatDeltaNumber(best.value)} xG canal)`;
  }
  return scenarioSummaryOpponentChannelRead(row);
}
