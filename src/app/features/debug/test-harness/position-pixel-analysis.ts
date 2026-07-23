import {
  PositionPixelMatrixSummary,
  PositionPixelMatrixSummaryRow,
  PositionPixelReadLevel,
} from '../models/test-harness.model';

type PositionPixelSignalRead = Pick<
  PositionPixelMatrixSummaryRow,
  | 'fromXPercent'
  | 'fromYPercent'
  | 'targetXPercent'
  | 'targetYPercent'
  | 'deltaXgFor'
  | 'deltaXgAgainst'
  | 'deltaXgDiff'
  | 'deltaCentralXgFor'
  | 'deltaWideXgFor'
  | 'deltaLongXgFor'
  | 'deltaCentralXgAgainst'
  | 'deltaWideXgAgainst'
  | 'deltaLongXgAgainst'
  | 'deltaLeftWideXgFor'
  | 'deltaRightWideXgFor'
  | 'deltaLeftWideXgAgainst'
  | 'deltaRightWideXgAgainst'
  | 'deltaShotsFor'
  | 'deltaShotsAgainst'
  | 'deltaCentralShotsFor'
  | 'deltaWideShotsFor'
  | 'deltaLongShotsFor'
  | 'deltaCentralShotsAgainst'
  | 'deltaWideShotsAgainst'
  | 'deltaLongShotsAgainst'
  | 'deltaPossessionFor'
  | 'deltaPlayerEffectiveness'
  | 'deltaPlayerCollective'
>;

export interface PositionPixelChannelBreakdown {
  threat: number;
  connection: number;
  coverage: number;
}

export function positionPixelDistance(row: Pick<PositionPixelSignalRead, 'fromXPercent' | 'fromYPercent' | 'targetXPercent' | 'targetYPercent'>): number {
  return Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent);
}

export function positionPixelDecisionScore(row: PositionPixelMatrixSummary): number {
  const shotDiff = row.deltaShotsFor - row.deltaShotsAgainst;
  return row.deltaXgDiff
    + shotDiff * 0.015
    + row.deltaPossessionFor * 0.0015
    + positionPixelDefensiveGainScore(row) * 0.020
    - positionPixelDefensiveRiskScore(row) * 0.020;
}

export function positionPixelReadLevel(
  row: PositionPixelMatrixSummary,
  tacticalRead = '',
): PositionPixelReadLevel {
  const distance = positionPixelDistance(row);
  const xg = Math.max(Math.abs(row.deltaXgFor), Math.abs(row.deltaXgAgainst), Math.abs(row.deltaXgDiff));
  const shots = Math.max(Math.abs(row.deltaShotsFor), Math.abs(row.deltaShotsAgainst));
  const poss = Math.abs(row.deltaPossessionFor);
  const zoneShots = Math.max(
    Math.abs(row.deltaCentralShotsFor) + Math.abs(row.deltaWideShotsFor) + Math.abs(row.deltaLongShotsFor),
    Math.abs(row.deltaCentralShotsAgainst) + Math.abs(row.deltaWideShotsAgainst) + Math.abs(row.deltaLongShotsAgainst),
  );
  const sideXg = Math.max(
    Math.abs(row.deltaLeftWideXgFor),
    Math.abs(row.deltaRightWideXgFor),
    Math.abs(row.deltaLeftWideXgAgainst),
    Math.abs(row.deltaRightWideXgAgainst),
  );
  if (distance <= 1.25) {
    return row.signalScore >= 0.050 ? 'check' : 'stable';
  }
  if (distance <= 6.0) {
    if (tacticalRead.startsWith('Visible') && tacticalRead !== 'Visible small') return 'visible';
    if (xg > 0.22 || sideXg > 0.12 || shots > 4.0 || poss > 4.0 || zoneShots > 5.0) return 'check';
    if (xg > 0.06 || sideXg > 0.035 || shots > 1.0 || poss > 1.0 || zoneShots > 1.5) return 'visible';
    return 'stable';
  }
  if (xg > 0.22 || sideXg > 0.12 || shots > 4.0 || poss > 4.0 || zoneShots > 5.0) return 'strong';
  if (xg > 0.06 || sideXg > 0.035 || shots > 1.0 || poss > 1.0 || zoneShots > 1.5) return 'visible';
  return 'stable';
}

export function positionPixelReadSeverity(row: PositionPixelMatrixSummary, tacticalRead = ''): number {
  switch (positionPixelReadLevel(row, tacticalRead)) {
    case 'check':
      return 4;
    case 'strong':
      return 3;
    case 'visible':
      return 2;
    default:
      return 1;
  }
}

export function positionPixelImpactScore(row: PositionPixelMatrixSummary): number {
  return (
    Math.abs(row.deltaXgFor) * 10 +
    Math.abs(row.deltaXgAgainst) * 10 +
    Math.abs(row.deltaXgDiff) * 8 +
    Math.abs(row.deltaShotsFor) +
    Math.abs(row.deltaShotsAgainst) +
    Math.abs(row.deltaPossessionFor) * 0.4 +
    (Math.abs(row.deltaCentralShotsFor) + Math.abs(row.deltaWideShotsFor) + Math.abs(row.deltaLongShotsFor)) * 0.5 +
    (Math.abs(row.deltaCentralShotsAgainst) + Math.abs(row.deltaWideShotsAgainst) + Math.abs(row.deltaLongShotsAgainst)) * 0.5 +
    (Math.abs(row.deltaLeftWideXgFor) + Math.abs(row.deltaRightWideXgFor)
      + Math.abs(row.deltaLeftWideXgAgainst) + Math.abs(row.deltaRightWideXgAgainst)) * 8
  );
}

export function positionPixelAttackGainScore(row: PositionPixelMatrixSummary): number {
  return Math.max(0, row.deltaXgFor) * 10
    + Math.max(0, row.deltaShotsFor) * 0.75
    + Math.max(0, row.deltaPossessionFor) * 0.25
    + Math.max(0, row.deltaCentralShotsFor + row.deltaWideShotsFor + row.deltaLongShotsFor) * 0.35
    + Math.max(0, row.deltaLeftWideXgFor + row.deltaRightWideXgFor) * 8;
}

export function positionPixelAttackLossScore(row: PositionPixelMatrixSummary): number {
  return Math.max(0, -row.deltaXgFor) * 10
    + Math.max(0, -row.deltaShotsFor) * 0.75
    + Math.max(0, -row.deltaPossessionFor) * 0.25
    + Math.max(0, -(row.deltaCentralShotsFor + row.deltaWideShotsFor + row.deltaLongShotsFor)) * 0.35
    + Math.max(0, -(row.deltaLeftWideXgFor + row.deltaRightWideXgFor)) * 8;
}

export function positionPixelDefensiveRiskScore(row: PositionPixelMatrixSummary): number {
  return Math.max(0, row.deltaXgAgainst) * 12
    + Math.max(0, row.deltaShotsAgainst) * 0.85
    + Math.max(0, row.deltaCentralShotsAgainst + row.deltaWideShotsAgainst + row.deltaLongShotsAgainst) * 0.45
    + Math.max(0, row.deltaCentralXgAgainst + row.deltaWideXgAgainst + row.deltaLongXgAgainst) * 8
    + Math.max(0, row.deltaLeftWideXgAgainst + row.deltaRightWideXgAgainst) * 8;
}

export function positionPixelDefensiveGainScore(row: PositionPixelMatrixSummary): number {
  return Math.max(0, -row.deltaXgAgainst) * 12
    + Math.max(0, -row.deltaShotsAgainst) * 0.85
    + Math.max(0, -(row.deltaCentralShotsAgainst + row.deltaWideShotsAgainst + row.deltaLongShotsAgainst)) * 0.45
    + Math.max(0, -(row.deltaLeftWideXgAgainst + row.deltaRightWideXgAgainst)) * 8;
}

export function positionPixelTacticalRead(row: PositionPixelMatrixSummary): string {
  const attackGain = positionPixelAttackGainScore(row);
  const attackLoss = positionPixelAttackLossScore(row);
  const defensiveRisk = positionPixelDefensiveRiskScore(row);
  const defensiveGain = positionPixelDefensiveGainScore(row);
  const distance = positionPixelDistance(row);
  if (distance <= 1.25) {
    return row.signalScore >= 0.050 ? 'Micro review' : 'Micro stable';
  }
  if (distance <= 6.0) {
    if (attackLoss >= 1.0 && defensiveRisk >= 1.0) return 'Visible risk';
    if (attackGain >= 1.0 && defensiveRisk >= 1.0) return 'Visible trade-off';
    if (attackLoss >= 1.0 && defensiveGain >= 0.8) return 'Visible def+ / att-';
    if (attackGain >= 1.0 && defensiveGain >= 0.8) return 'Visible double gain';
    if (defensiveRisk >= 1.0) return 'Visible risk';
    if (attackLoss >= 1.0) return 'Visible attack loss';
    if (attackGain >= 1.0) return 'Visible attack gain';
    if (defensiveGain >= 1.0) return 'Visible def. gain';
    if (attackGain >= 0.6 || attackLoss >= 0.6 || defensiveRisk >= 0.6 || defensiveGain >= 0.6) return 'Visible small';
    return 'Neutral';
  }
  if (attackLoss >= 1.2 && defensiveGain >= 1.0) return 'Tradeoff: def+ / att-';
  if (attackGain >= 1.2 && defensiveRisk >= 1.0) return 'Tradeoff: att+ / risk+';
  if (attackLoss >= 1.0 && defensiveRisk >= 1.0) return 'Bad tradeoff';
  if (attackGain >= 1.0 && defensiveGain >= 1.0) return 'Double gain';
  if (defensiveRisk >= 1.6 && attackGain < 1.2) return 'Risk';
  if (attackGain >= 1.6 && defensiveRisk >= 1.2) return 'Trade-off';
  if (attackLoss >= 1.6 && defensiveGain < 1.0) return 'Attack loss';
  if (attackGain >= 1.4 && defensiveRisk < 0.8) return 'Attack gain';
  if (defensiveGain >= 1.4 && attackGain < 1.0) return 'Def. gain';
  if (defensiveRisk >= 1.0 && defensiveGain >= 0.8) return 'Compensated';
  if (attackGain >= 0.8 || attackLoss >= 0.8 || defensiveRisk >= 0.8 || defensiveGain >= 0.8) return 'Small signal';
  return 'Neutral';
}

export function positionPixelTacticalReadClass(read: string): string {
  if (read === 'Micro review') return 'read-check';
  if (read === 'Micro stable') return 'read-stable';
  if (read.startsWith('Visible risk') || read === 'Visible attack loss') return 'read-check';
  if (read.startsWith('Visible')) return 'read-visible';
  if (read === 'Risk') return 'read-check';
  if (read === 'Trade-off' || read === 'Tradeoff: att+ / risk+' || read === 'Bad tradeoff') return 'read-strong';
  if (read === 'Tradeoff: def+ / att-') return 'read-visible';
  if (read === 'Double gain') return 'read-visible';
  if (read === 'Attack loss') return 'read-check';
  if (read === 'Attack gain' || read === 'Def. gain') return 'read-visible';
  if (read === 'Compensated' || read === 'Small signal') return 'read-stable';
  return 'delta-neutral';
}

export function positionPixelWideChannelReason(
  row: PositionPixelMatrixSummary,
  formatDeltaMicro: (value: number) => string,
): string {
  const ownLeft = row.deltaLeftWideXgFor;
  const ownRight = row.deltaRightWideXgFor;
  const agLeft = row.deltaLeftWideXgAgainst;
  const agRight = row.deltaRightWideXgAgainst;
  const ownSide = Math.abs(ownLeft) >= Math.abs(ownRight)
    ? `own L ${formatDeltaMicro(ownLeft)}`
    : `own R ${formatDeltaMicro(ownRight)}`;
  const agSide = Math.abs(agLeft) >= Math.abs(agRight)
    ? `ag L ${formatDeltaMicro(agLeft)}`
    : `ag R ${formatDeltaMicro(agRight)}`;
  return `wide channel ${ownSide} / ${agSide}`;
}

export function positionPixelTacticalReadReason(
  row: PositionPixelMatrixSummary,
  coachRead: string,
  formatDeltaMicro: (value: number) => string,
): string {
  return [
    coachRead,
    `attack gain ${positionPixelAttackGainScore(row).toFixed(2)}`,
    `attack loss ${positionPixelAttackLossScore(row).toFixed(2)}`,
    `defensive risk ${positionPixelDefensiveRiskScore(row).toFixed(2)}`,
    `defensive gain ${positionPixelDefensiveGainScore(row).toFixed(2)}`,
    positionPixelWideChannelReason(row, formatDeltaMicro)
  ].join(' ? ');
}

export function positionPixelChannelBreakdown(row: PositionPixelMatrixSummary): PositionPixelChannelBreakdown {
  const threat = (row.deltaXgFor * 8)
    + (row.deltaShotsFor * 0.35)
    + (row.deltaWideXgFor * 10)
    + (row.deltaWideShotsFor * 0.20)
    + (Math.max(row.deltaLeftWideXgFor, row.deltaRightWideXgFor, 0) * 8);
  const connection = (row.deltaPossessionFor * 0.12)
    + (row.deltaCentralXgFor * 10)
    + (row.deltaCentralShotsFor * 0.25)
    - (Math.max(0, row.deltaLongShotsFor) * 0.08)
    - (Math.max(0, row.deltaLongXgFor) * 3);
  const coverage = (-row.deltaXgAgainst * 8)
    + (-row.deltaShotsAgainst * 0.30)
    + (-row.deltaWideXgAgainst * 9)
    + (-row.deltaWideShotsAgainst * 0.18)
    + (-row.deltaCentralXgAgainst * 7)
    + (-row.deltaCentralShotsAgainst * 0.18);
  return {
    threat: positionPixelClampBreakdownScore(threat),
    connection: positionPixelClampBreakdownScore(connection),
    coverage: positionPixelClampBreakdownScore(coverage),
  };
}

export function positionPixelChannelSign(value: number): '+' | '-' | '=' {
  if (value >= 0.35) return '+';
  if (value <= -0.35) return '-';
  return '=';
}

export function positionPixelChannelBreakdownClass(breakdown: PositionPixelChannelBreakdown): string {
  const positive = [breakdown.threat, breakdown.connection, breakdown.coverage].filter((value) => value >= 0.35).length;
  const negative = [breakdown.threat, breakdown.connection, breakdown.coverage].filter((value) => value <= -0.35).length;
  if (positive > 0 && negative > 0) return 'read-strong';
  if (positive >= 2 && negative === 0) return 'read-visible';
  if (negative >= 2) return 'read-check';
  if (positive > 0 || negative > 0) return 'read-stable';
  return 'delta-neutral';
}

export function positionPixelCoverageChannelLabel(isContextualCoverage: boolean, coverage: number): string {
  const sign = positionPixelChannelSign(coverage);
  return isContextualCoverage ? `Cobertura ctx ${sign}` : `Cobertura ${sign}`;
}

export function positionPixelChannelBreakdownRead(
  breakdown: PositionPixelChannelBreakdown,
  coverageLabel: string,
): string {
  return `Amenaza ${positionPixelChannelSign(breakdown.threat)} · Conex. ${positionPixelChannelSign(breakdown.connection)} · ${coverageLabel}`;
}

export function positionPixelChannelBreakdownDetail(
  row: PositionPixelMatrixSummary,
  breakdown: PositionPixelChannelBreakdown,
  formatDeltaMicro: (value: number) => string,
  formatDeltaNumber: (value: number) => string,
  contextualCoverageNote: string | null,
): string {
  const parts = [
    `amenaza ${breakdown.threat.toFixed(2)}: xG ${formatDeltaMicro(row.deltaXgFor)}, shots ${formatDeltaNumber(row.deltaShotsFor)}, banda ${formatDeltaMicro(row.deltaWideXgFor)}/${formatDeltaNumber(row.deltaWideShotsFor)}`,
    `conexion ${breakdown.connection.toFixed(2)}: posesion ${formatDeltaNumber(row.deltaPossessionFor)}%, centro ${formatDeltaMicro(row.deltaCentralXgFor)}/${formatDeltaNumber(row.deltaCentralShotsFor)}`,
    `cobertura ${breakdown.coverage.toFixed(2)}: xGA ${formatDeltaMicro(-row.deltaXgAgainst)}, shots ag ${formatDeltaNumber(-row.deltaShotsAgainst)}, banda ag ${formatDeltaMicro(-row.deltaWideXgAgainst)}/${formatDeltaNumber(-row.deltaWideShotsAgainst)}`
  ];
  if (contextualCoverageNote) {
    parts.push(contextualCoverageNote);
  }
  return parts.join(' ? ');
}

export function positionPixelUsesContextualCoverage(
  row: PositionPixelMatrixSummary,
  line: 'ATT' | 'MID' | 'DEF',
  coverage: number,
): boolean {
  const movedDown = row.targetYPercent >= row.fromYPercent + 3.5;
  return line === 'ATT' && movedDown && coverage >= 0.35;
}

export function positionPixelContextualCoverageNote(
  row: PositionPixelMatrixSummary,
  line: 'ATT' | 'MID' | 'DEF',
  coverage: number,
): string | null {
  if (!positionPixelUsesContextualCoverage(row, line, coverage)) {
    return null;
  }
  const defensiveRisk = positionPixelDefensiveRiskScore(row);
  if (defensiveRisk >= 0.8) {
    return `cobertura contextual: ATT baj? pero el riesgo defensivo sube (${defensiveRisk.toFixed(2)}); tratar como alerta, no como mejora limpia`;
  }
  return 'cobertura contextual: ATT baj?; validar si realmente protege o solo cambia el dibujo';
}

export function positionPixelClampBreakdownScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-9.99, Math.min(9.99, value));
}

export function positionPixelVisualExpectationRead(
  row: PositionPixelMatrixSummary,
  sourceLine: 'ATT' | 'MID' | 'DEF',
): string {
  if (positionPixelVisualExpectationMismatches(row, sourceLine).length === 0) return 'Visual OK';
  return positionPixelIsMicroVisualMismatch(row) ? 'Visual micro' : 'Visual review';
}

export function positionPixelVisualExpectationClass(read: string): string {
  if (read === 'Visual review') return 'read-check';
  if (read === 'Visual micro') return 'read-stable';
  return 'read-stable';
}

export function positionPixelVisualExpectationDetail(
  row: PositionPixelMatrixSummary,
  sourceLine: 'ATT' | 'MID' | 'DEF',
  shapeMove: string,
  channelBreakdownRead: string,
): string {
  const mismatches = positionPixelVisualExpectationMismatches(row, sourceLine);
  if (mismatches.length > 0) {
    return mismatches.join(' · ');
  }
  return `coherente: ${shapeMove} ? ${channelBreakdownRead}`;
}

export function positionPixelIsMicroVisualMismatch(row: PositionPixelMatrixSummary): boolean {
  return positionPixelReadLevel(row, positionPixelTacticalRead(row)) === 'stable' && row.signalScore < 0.05;
}

export function positionPixelVisualExpectationMismatches(
  row: PositionPixelMatrixSummary,
  sourceLine: 'ATT' | 'MID' | 'DEF',
): string[] {
  const breakdown = positionPixelChannelBreakdown(row);
  const movedUp = row.targetYPercent <= row.fromYPercent - 3.5;
  const movedDown = row.targetYPercent >= row.fromYPercent + 3.5;
  const movedInside = Math.abs(row.targetXPercent - 50) < Math.abs(row.fromXPercent - 50) - 2.5;
  const movedWide = Math.abs(row.targetXPercent - 50) > Math.abs(row.fromXPercent - 50) + 2.5;
  const targetCentralish = Math.abs(row.targetXPercent - 50) <= 18;
  const fromWideish = Math.abs(row.fromXPercent - 50) >= 18;
  const targetWideish = Math.abs(row.targetXPercent - 50) >= 18;
  const mismatches: string[] = [];
  const attackGainScore = positionPixelAttackGainScore(row);
  const attackLossScore = positionPixelAttackLossScore(row);
  const defensiveGainScore = positionPixelDefensiveGainScore(row);
  const defensiveRiskScore = positionPixelDefensiveRiskScore(row);
  const distance = positionPixelDistance(row);
  const isBigTacticalMove = distance >= 6;
  const visualBenefit = breakdown.threat > 0.20 || breakdown.connection > 0.20 || breakdown.coverage > 0.20;
  const visualCost = breakdown.threat < -0.20 || breakdown.connection < -0.20 || breakdown.coverage < -0.20;
  const engineBenefit = attackGainScore >= 0.55 || defensiveGainScore >= 0.55;
  const engineCost = attackLossScore >= 0.55 || defensiveRiskScore >= 0.55;
  if (isBigTacticalMove && !movedWide && visualCost && engineCost) return mismatches;
  if (isBigTacticalMove && !movedWide && visualBenefit && visualCost && (engineBenefit || engineCost)) return mismatches;
  const ownThreatSignal = Math.max(
    row.deltaXgFor,
    row.deltaCentralXgFor,
    row.deltaWideXgFor,
    row.deltaLeftWideXgFor,
    row.deltaRightWideXgFor,
    row.deltaShotsFor * 0.025
  );
  const centralThreatSignal = Math.max(
    row.deltaCentralXgFor,
    row.deltaXgFor,
    row.deltaCentralShotsFor * 0.025
  );
  const coverageSignal = Math.max(
    -row.deltaXgAgainst,
    -row.deltaCentralXgAgainst,
    -row.deltaWideXgAgainst,
    -row.deltaShotsAgainst * 0.020
  );
  if (sourceLine === 'ATT' && movedUp && breakdown.threat < 0.20 && ownThreatSignal < 0.010) {
    mismatches.push('ATT sube: se esperaba algo de amenaza/profundidad');
  }
  if (sourceLine === 'DEF' && movedDown && !movedWide && breakdown.coverage < 0.20 && coverageSignal < 0.010) {
    mismatches.push('DEF baja: se esperaba mas cobertura');
  }
  if (sourceLine === 'DEF'
      && movedUp
      && breakdown.threat < 0.20
      && breakdown.connection < 0.20
      && breakdown.coverage < 0.35
      && defensiveRiskScore < 0.6
      && attackLossScore < 0.6) {
    mismatches.push('DEF sube: se esperaba aporte ofensivo o conexión');
  }
  if (movedInside
      && targetCentralish
      && breakdown.connection < -0.20
      && breakdown.threat < 0.20
      && centralThreatSignal < (distance <= 6.0 ? 0.006 : 0.018)
      && attackGainScore < 0.75) {
    mismatches.push('se cierra: se esperaba más conexión o amenaza central');
  }
  const wideXgSignal = Math.max(Math.abs(row.deltaWideXgFor), Math.abs(row.deltaWideXgAgainst));
  const wideShotSignal = Math.max(Math.abs(row.deltaWideShotsFor), Math.abs(row.deltaWideShotsAgainst));
  const requiredWideXgSignal = distance <= 6.0 ? 0.005 : 0.010;
  const requiredWideShotSignal = distance <= 6.0 ? 0.10 : 0.25;
  if (movedWide
      && (fromWideish || targetWideish)
      && wideXgSignal < requiredWideXgSignal
      && wideShotSignal < requiredWideShotSignal
      && breakdown.threat < 0.35
      && breakdown.connection < 0.35
      && attackGainScore < 0.75) {
    mismatches.push('se abre: se esperaba alguna señal de banda');
  }
  return mismatches;
}

export function positionPixelMovementConfidence(distance: number): number {
  if (!Number.isFinite(distance)) return 1;
  if (distance <= 1.25) return 0.35;
  if (distance <= 6.0) return 0.70;
  return 1;
}

export function positionPixelSignalScore(row: PositionPixelSignalRead): number {
  const distance = positionPixelDistance(row);
  const xgSignal = Math.max(
    Math.abs(row.deltaXgFor),
    Math.abs(row.deltaXgAgainst),
    Math.abs(row.deltaXgDiff),
    Math.abs(row.deltaCentralXgFor),
    Math.abs(row.deltaWideXgFor),
    Math.abs(row.deltaLongXgFor),
    Math.abs(row.deltaCentralXgAgainst),
    Math.abs(row.deltaWideXgAgainst),
    Math.abs(row.deltaLongXgAgainst),
    Math.abs(row.deltaLeftWideXgFor ?? 0),
    Math.abs(row.deltaRightWideXgFor ?? 0),
    Math.abs(row.deltaLeftWideXgAgainst ?? 0),
    Math.abs(row.deltaRightWideXgAgainst ?? 0),
  );
  const shotSignal = Math.max(
    Math.abs(row.deltaShotsFor),
    Math.abs(row.deltaShotsAgainst),
    Math.abs(row.deltaCentralShotsFor) + Math.abs(row.deltaWideShotsFor) + Math.abs(row.deltaLongShotsFor),
    Math.abs(row.deltaCentralShotsAgainst) + Math.abs(row.deltaWideShotsAgainst) + Math.abs(row.deltaLongShotsAgainst),
  ) * 0.025;
  const possSignal = Math.abs(row.deltaPossessionFor) * 0.010;
  const distanceSignal = Math.min(0.090, distance * (distance <= 1.25 ? 0.008 : 0.012));
  const playerTacticalSignal = Math.max(
    Math.abs(row.deltaPlayerEffectiveness ?? 0) * 0.50,
    Math.abs(row.deltaPlayerCollective ?? 0) * 0.015,
  );
  const rawSignal = Math.max(xgSignal, shotSignal, possSignal, distanceSignal, playerTacticalSignal);
  return rawSignal * positionPixelMovementConfidence(distance);
}

export function positionPixelSignalRead(score: number, distance: number): string {
  if (distance <= 1.25 && score >= 0.050) return `Micro-check ${score.toFixed(3)}`;
  if (score >= 0.120) return `Alta ${score.toFixed(3)}`;
  if (score >= 0.050) return `Media ${score.toFixed(3)}`;
  if (score >= 0.020) return `Baja ${score.toFixed(3)}`;
  return `Micro ${score.toFixed(3)}`;
}

export function positionPixelSignalClass(score: number, distance: number): string {
  if (distance <= 1.25 && score >= 0.050) return 'read-check';
  if (score >= 0.120) return 'delta-negative';
  if (score >= 0.050) return 'read-check';
  if (score >= 0.020) return 'read-stable';
  return 'delta-neutral';
}

export function positionPixelSignalDetail(
  row: PositionPixelSignalRead,
  formatDeltaMicro: (value: number) => string,
  formatDeltaNumber: (value: number) => string,
): string {
  return [
    `señal ${positionPixelSignalScore(row).toFixed(3)}`,
    `xG for/ag/diff ${formatDeltaMicro(row.deltaXgFor)}/${formatDeltaMicro(row.deltaXgAgainst)}/${formatDeltaMicro(row.deltaXgDiff)}`,
    `shots for/ag ${formatDeltaNumber(row.deltaShotsFor)}/${formatDeltaNumber(row.deltaShotsAgainst)}`,
    `poss ${formatDeltaNumber(row.deltaPossessionFor)}%`,
    `eff ${formatDeltaMicro(row.deltaPlayerEffectiveness ?? 0)}`,
    `collective ${formatDeltaNumber(row.deltaPlayerCollective ?? 0)}`,
    `dist ${positionPixelDistance(row).toFixed(2)}px`,
  ].join(' · ');
}
