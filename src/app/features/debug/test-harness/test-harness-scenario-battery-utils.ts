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

export function scenarioDecisionMetrics(
  title: string,
  row: ScenarioMatrixSummaryRow,
  isOpponentRow: boolean,
  opponentMaxChannelXgDelta: number,
  confidence: string,
  formatDeltaNumber: (value: number) => string
): string {
  if (title === 'Amenaza rival' || isOpponentRow) {
    return `xGA ${formatDeltaNumber(row.avgOpponentXgDelta)} / canal ${formatDeltaNumber(opponentMaxChannelXgDelta)} / ${confidence}`;
  }
  return `xG ${formatDeltaNumber(row.avgUserXgDelta)} / xGA ${formatDeltaNumber(row.avgOpponentXgDelta)} / ${confidence}`;
}

export function scenarioAttackCandidateIsCoachWorthy(row: ScenarioMatrixSummaryRow): boolean {
  const directAttackScenario = ['m45-central', 'm45-wide', 'm45-left', 'm45-right'].includes(row.scenario);
  const tacticalAttackAction = row.actionType === 'FORMATION'
    || row.actionType === 'SUBSTITUTION'
    || (row.actionType === 'POSITION' && row.scenario.startsWith('m45-shape-'));
  if (!directAttackScenario && !tacticalAttackAction) {
    return false;
  }
  const minUpside = row.actionType === 'SUBSTITUTION' ? 0.045 : 0.06;
  const maxRisk = row.actionType === 'SUBSTITUTION' ? 0.18 : 0.16;
  return row.avgUserXgDelta >= minUpside
    && row.avgOpponentXgDelta <= maxRisk
    && row.avgUserShotsDelta >= -0.6;
}

export function scenarioAttackPlanScore(row: ScenarioMatrixSummaryRow): number {
  const risk = Math.max(0, row.avgOpponentXgDelta);
  const shots = Math.max(0, row.avgUserShotsDelta) * 0.01;
  const substitutionBonus = row.actionType === 'SUBSTITUTION' ? 0.015 : 0;
  return row.avgUserXgDelta + shots + substitutionBonus - (risk * 0.45);
}

export function scenarioProtectionCandidateIsCoachWorthy(
  row: ScenarioMatrixSummaryRow,
  actionLabel: string
): boolean {
  const looksLikeSubstitution = row.actionType === 'SUBSTITUTION'
    || (row.actionDetail ?? '').includes('->')
    || actionLabel.includes('->');
  if (!looksLikeSubstitution) {
    return true;
  }
  const defensiveImpact = Math.max(0, -row.avgOpponentXgDelta);
  const shotImpact = Math.max(0, -row.avgOpponentShotsDelta);
  return defensiveImpact >= 0.045 && (shotImpact >= 0.25 || defensiveImpact >= 0.065);
}

export function scenarioSummaryImpactScore(row: ScenarioMatrixSummaryRow): number {
  const userXg = Math.abs(row.avgUserXgDelta) / 0.12;
  const opponentXg = Math.abs(row.avgOpponentXgDelta) / 0.10;
  const userShots = Math.abs(row.avgUserShotsDelta) / 2.0;
  const opponentShots = Math.abs(row.avgOpponentShotsDelta) / 2.0;
  const possession = Math.abs(row.avgUserPossessionDelta) / 2.0;
  const zoneShift = (
    Math.abs(row.avgUserCentralDelta)
    + Math.abs(row.avgUserWideDelta)
    + Math.abs(row.avgOpponentCentralDelta)
    + Math.abs(row.avgOpponentWideDelta)
  ) / 5.0;
  const channelXg = (
    Math.abs(row.avgOpponentCentralXgDelta)
    + Math.abs(row.avgOpponentWideXgDelta)
    + Math.abs(row.avgOpponentLeftWideXgDelta)
    + Math.abs(row.avgOpponentRightWideXgDelta)
  ) / 0.16;
  return Math.max(userXg, opponentXg, userShots, opponentShots, possession, zoneShift, channelXg);
}

export function scenarioSummaryAttackGainScore(row: ScenarioMatrixSummaryRow): number {
  return Math.max(0, row.avgUserXgDelta) / 0.08
    + Math.max(0, row.avgUserShotsDelta) / 1.5
    + Math.max(0, row.avgUserPossessionDelta) / 3.0
    + Math.max(0, row.avgUserCentralDelta + row.avgUserWideDelta) / 3.0;
}

export function scenarioSummaryAttackLossScore(row: ScenarioMatrixSummaryRow): number {
  return Math.max(0, -row.avgUserXgDelta) / 0.08
    + Math.max(0, -row.avgUserShotsDelta) / 1.5
    + Math.max(0, -row.avgUserPossessionDelta) / 3.0
    + Math.max(0, -(row.avgUserCentralDelta + row.avgUserWideDelta)) / 3.0;
}

export function scenarioSummaryDefensiveGainScore(row: ScenarioMatrixSummaryRow): number {
  return Math.max(0, -row.avgOpponentXgDelta) / 0.08
    + Math.max(0, -row.avgOpponentShotsDelta) / 1.5
    + Math.max(0, -(row.avgOpponentCentralDelta + row.avgOpponentWideDelta)) / 3.0
    + Math.max(0, -(row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta)) / 0.12;
}

export function scenarioSummaryDefensiveRiskScore(row: ScenarioMatrixSummaryRow): number {
  return Math.max(0, row.avgOpponentXgDelta) / 0.08
    + Math.max(0, row.avgOpponentShotsDelta) / 1.5
    + Math.max(0, row.avgOpponentCentralDelta + row.avgOpponentWideDelta) / 3.0
    + Math.max(0, row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta) / 0.12;
}

export function scenarioSummaryNeedsReview(row: ScenarioMatrixSummaryRow): boolean {
  if (row.actionType !== 'SUBSTITUTION') return false;
  const detail = `${row.scenario} ${row.actionDetail}`.toLowerCase();
  const isDowngrade = detail.includes('downgrade') || /\[-\d+/.test(detail);
  const isUpgrade = detail.includes('upgrade') || /\[\+\d+/.test(detail);
  if (isDowngrade && row.avgUserXgDelta > 0.08 && row.avgOpponentXgDelta <= 0.02) {
    return true;
  }
  if (isUpgrade && row.avgUserXgDelta < -0.08 && row.avgOpponentXgDelta >= -0.02) {
    return true;
  }
  return false;
}

export function scenarioSummaryCoherentSubstitutionSignal(row: ScenarioMatrixSummaryRow): boolean {
  if (row.actionType !== 'SUBSTITUTION') return false;
  const detail = `${row.scenario} ${row.actionDetail}`.toLowerCase();
  const isDowngrade = detail.includes('downgrade') || /\[-\d+/.test(detail);
  const isUpgrade = detail.includes('upgrade') || /\[\+\d+/.test(detail);
  const isDefensive = detail.includes('defensive') || detail.includes('(def)');
  const isOffensive = detail.includes('offensive') || detail.includes('(att)');
  if (isDowngrade && isDefensive) {
    const xgaWorse = row.avgOpponentXgDelta >= 0.04;
    const shotsWorse = row.avgOpponentShotsDelta >= 0.45;
    const territoryWorse = (row.avgOpponentCentralDelta + row.avgOpponentWideDelta) >= 0.35;
    const channelWorse = (row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta
      + Math.max(row.avgOpponentLeftWideXgDelta, 0)
      + Math.max(row.avgOpponentRightWideXgDelta, 0)) >= 0.035;
    return (xgaWorse && shotsWorse) || (xgaWorse && territoryWorse) || (shotsWorse && channelWorse);
  }
  if (isUpgrade && isDefensive) {
    const xgaBetter = row.avgOpponentXgDelta <= -0.04;
    const shotsBetter = row.avgOpponentShotsDelta <= -0.45;
    const territoryBetter = (row.avgOpponentCentralDelta + row.avgOpponentWideDelta) <= -0.35;
    const channelBetter = (row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta
      + Math.min(row.avgOpponentLeftWideXgDelta, 0)
      + Math.min(row.avgOpponentRightWideXgDelta, 0)) <= -0.035;
    return (xgaBetter && shotsBetter) || (xgaBetter && territoryBetter) || (shotsBetter && channelBetter);
  }
  if (isUpgrade && isOffensive) {
    return row.avgUserXgDelta >= 0.04 && row.avgUserShotsDelta >= 0.35;
  }
  if (isDowngrade && isOffensive) {
    return row.avgUserXgDelta <= -0.04 && row.avgUserShotsDelta <= -0.35;
  }
  return false;
}

export function scenarioSummaryOutcome(
  row: ScenarioMatrixSummaryRow,
  isFormationNoop: boolean,
  readLevel: string
): string {
  if (isFormationNoop) return 'Baseline/no-op';
  if (readLevel === 'noise') return 'Neutral';
  if (row.scenario.startsWith('m45-opponent-')) {
    const defensiveGain = scenarioSummaryDefensiveGainScore(row);
    const defensiveRisk = scenarioSummaryDefensiveRiskScore(row);
    const wideChannelExposure = Math.max(row.avgOpponentLeftWideXgDelta, row.avgOpponentRightWideXgDelta);
    const centralExposure = row.avgOpponentCentralXgDelta;
    const wideContained = Math.min(row.avgOpponentLeftWideXgDelta, row.avgOpponentRightWideXgDelta);
    const channelExposure = Math.max(wideChannelExposure, centralExposure);
    if (channelExposure >= 0.10 && row.avgOpponentXgDelta >= 0.04) return 'Exposure';
    if (channelExposure >= 0.08) return 'Channel shift';
    if (wideContained <= -0.08 || centralExposure <= -0.08) return 'Contained';
    if (defensiveRisk >= 1.15 && row.avgOpponentXgDelta >= 0.04) return 'Exposure';
    if (defensiveGain >= 1.15) return 'Contained';
    return 'Neutral';
  }
  const attackGain = scenarioSummaryAttackGainScore(row);
  const attackLoss = scenarioSummaryAttackLossScore(row);
  const defensiveGain = scenarioSummaryDefensiveGainScore(row);
  const defensiveRisk = scenarioSummaryDefensiveRiskScore(row);
  if (attackGain >= 1.15 && defensiveGain >= 0.85) return 'Upgrade';
  if (attackLoss >= 1.15 && defensiveRisk >= 0.85) return 'Downgrade';
  if (attackGain >= 1.0 && defensiveRisk >= 0.8) return 'Tradeoff';
  if (defensiveGain >= 1.0 && attackLoss >= 0.8) return 'Tradeoff';
  if (attackGain >= 1.15 || defensiveGain >= 1.15) return 'Lean up';
  if (attackLoss >= 1.15 || defensiveRisk >= 1.15) return 'Risk';
  return 'Neutral';
}

export function scenarioSummaryCoachRead(
  row: ScenarioMatrixSummaryRow,
  isFormationNoop: boolean,
  readLevel: string,
  userChannel: string,
  opponentChannel: string,
  prefix: string
): string {
  if (isFormationNoop) {
    return `formacion: misma que la base (${row.baselineFormation || row.changedFormation || row.actionDetail || '?'})`;
  }
  const attackGain = scenarioSummaryAttackGainScore(row);
  const attackLoss = scenarioSummaryAttackLossScore(row);
  const defensiveGain = scenarioSummaryDefensiveGainScore(row);
  const defensiveRisk = scenarioSummaryDefensiveRiskScore(row);
  if (row.scenario.startsWith('m45-opponent-')) {
    const strongestOpponentChannel = Math.max(
      row.avgOpponentCentralXgDelta,
      row.avgOpponentLeftWideXgDelta,
      row.avgOpponentRightWideXgDelta
    );
    if ((defensiveRisk >= 0.85 || row.avgOpponentXgDelta > 0.04) && row.avgOpponentXgDelta >= 0.04) {
      return `${prefix}: rival amenaza ${opponentChannel}`;
    }
    if (strongestOpponentChannel >= 0.08) return `${prefix}: rival cambia canal ${opponentChannel}`;
    if (defensiveGain >= 0.85 || row.avgOpponentXgDelta < -0.04) return `${prefix}: rival contenido ${opponentChannel}`;
    return `${prefix}: ${opponentChannel}`;
  }
  if (readLevel === 'noise') {
    return userChannel !== 'sin canal claro' ? `${prefix}: leve ${userChannel}` : `${prefix}: sin señal fuerte`;
  }
  if (attackGain >= 1.15 && defensiveRisk >= 0.9) return `${prefix}: mas ataque, mas riesgo (${userChannel})`;
  if (defensiveGain >= 1.15 && attackLoss >= 0.9) return `${prefix}: mas seguro, menos ataque (${opponentChannel})`;
  if (attackGain >= 1.15) return `${prefix}: gana ataque ${userChannel}`;
  if (attackLoss >= 1.15) return `${prefix}: pierde ataque ${userChannel}`;
  if (defensiveRisk >= 1.15) return `${prefix}: abre riesgo ${opponentChannel}`;
  if (defensiveGain >= 1.15) return `${prefix}: protege mejor ${opponentChannel}`;
  return `${prefix}: ${userChannel} / ${opponentChannel}`;
}

export function scenarioSummaryOutcomeReason(
  row: ScenarioMatrixSummaryRow,
  isFormationNoop: boolean,
  attackGainScore: number,
  attackLossScore: number,
  defensiveGainScore: number,
  defensiveRiskScore: number
): string {
  if (isFormationNoop) {
    return `Misma formación que la base: ${row.baselineFormation || '?'} = ${row.changedFormation || row.actionDetail || '?'}`;
  }
  return [
    `attack gain ${attackGainScore.toFixed(2)}`,
    `attack loss ${attackLossScore.toFixed(2)}`,
    `defensive gain ${defensiveGainScore.toFixed(2)}`,
    `defensive risk ${defensiveRiskScore.toFixed(2)}`,
  ].join(' ? ');
}

export function scenarioSummaryCoachReadDetail(
  coachRead: string,
  userChannelRead: string,
  opponentChannelRead: string,
  userXgDelta: string,
  opponentXgDelta: string,
  userShotsDelta: string,
  opponentShotsDelta: string,
  opponentLeftWideXgDelta: string,
  opponentRightWideXgDelta: string
): string {
  return [
    coachRead,
    `usuario: ${userChannelRead}`,
    `rival: ${opponentChannelRead}`,
    `xG ${userXgDelta} / xGA ${opponentXgDelta}`,
    `shots ${userShotsDelta} / ag ${opponentShotsDelta}`,
    `wide L/R rival xG ${opponentLeftWideXgDelta} / ${opponentRightWideXgDelta}`,
  ].join(' ? ');
}

export function scenarioSummaryRecommendationDetail(
  recommendation: string,
  read: string,
  outcome: string,
  coachReadDetail: string
): string {
  return [
    recommendation,
    `lectura: ${read}`,
    `resultado: ${outcome}`,
    coachReadDetail,
  ].join(' ? ');
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
