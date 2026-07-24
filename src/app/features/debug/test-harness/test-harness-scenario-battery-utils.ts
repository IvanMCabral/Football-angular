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
