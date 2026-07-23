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
