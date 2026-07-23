import {
  PlayerSwapMatrixSummary,
  PlayerSwapMatrixSummaryRow,
  ScenarioBatteryCoachObjective,
} from '../models/test-harness.model';

type PlayerSwapOverallRead = Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>;
type PlayerSwapSignalRead = Pick<
  PlayerSwapMatrixSummaryRow,
  | 'deltaXgDiff'
  | 'preAutoSubDeltaXgDiff'
  | 'preAutoSubDeltaXgFor'
  | 'preAutoSubDeltaXgAgainst'
  | 'deltaXgFor'
  | 'deltaXgAgainst'
  | 'deltaShotsFor'
  | 'deltaShotsAgainst'
  | 'deltaPossessionFor'
>;
type PlayerSwapTacticalBreakdownRead = PlayerSwapSignalRead & Pick<
  PlayerSwapMatrixSummaryRow,
  | 'deltaCentralShotsFor'
  | 'deltaWideShotsFor'
  | 'deltaLongShotsFor'
  | 'deltaCentralShotsAgainst'
  | 'deltaWideShotsAgainst'
  | 'deltaLongShotsAgainst'
>;
type PlayerSwapTacticalBreakdown = Pick<
  PlayerSwapMatrixSummary,
  | 'tacticalAttackRead'
  | 'tacticalAttackClass'
  | 'tacticalCentralControlRead'
  | 'tacticalCentralControlClass'
  | 'tacticalProtectionRead'
  | 'tacticalProtectionClass'
  | 'tacticalChannelsRead'
  | 'tacticalChannelsClass'
  | 'tacticalBreakdownDetail'
>;

export type PlayerSwapCoachReadLevel = 'upgrade' | 'downgrade' | 'tradeoff' | 'neutral' | 'review';

export interface PlayerSwapRoleRiskRead {
  attack: number;
  control: number;
  protection: number;
  detail?: string;
}

export function playerSwapOverallDelta(row: PlayerSwapOverallRead): number | null {
  if (row.baselinePlayerOverall == null || row.swapPlayerOverall == null) return null;
  return row.swapPlayerOverall - row.baselinePlayerOverall;
}

export function playerSwapOverallDeltaText(
  row: PlayerSwapOverallRead,
  formatDeltaNumber: (value: number) => string,
): string {
  const delta = playerSwapOverallDelta(row);
  if (row.baselinePlayerOverall == null || row.swapPlayerOverall == null || delta == null) return 'OVR desconocido';
  return `${row.baselinePlayerOverall}${String.fromCharCode(8594)}${row.swapPlayerOverall} (${formatDeltaNumber(delta)})`;
}

export function playerSwapHasLargeQualityDrop(row: PlayerSwapOverallRead): boolean {
  const delta = playerSwapOverallDelta(row);
  return delta != null && delta <= -6;
}

export function playerSwapQualityWarning(
  row: PlayerSwapOverallRead,
  formatDeltaNumber: (value: number) => string,
): string {
  if (!playerSwapHasLargeQualityDrop(row)) return '';
  return ` y baja mucho la calidad individual (${playerSwapOverallDeltaText(row, formatDeltaNumber)})`;
}

export function playerSwapSignalScore(row: PlayerSwapSignalRead, roleRisk: PlayerSwapRoleRiskRead): number {
  return Math.max(
    Math.abs(row.deltaXgDiff),
    Math.abs(row.preAutoSubDeltaXgDiff || 0),
    Math.abs(row.deltaXgFor),
    Math.abs(row.deltaXgAgainst),
    Math.abs(row.deltaShotsFor) * 0.025,
    Math.abs(row.deltaShotsAgainst) * 0.025,
    Math.abs(roleRisk.attack),
    Math.abs(roleRisk.control),
    Math.abs(roleRisk.protection),
  );
}

export function playerSwapSignalRead(score: number): string {
  if (score >= 0.120) return `Alta ${score.toFixed(3)}`;
  if (score >= 0.050) return `Media ${score.toFixed(3)}`;
  if (score >= 0.020) return `Baja ${score.toFixed(3)}`;
  return `Micro ${score.toFixed(3)}`;
}

export function playerSwapSignalClass(score: number): string {
  if (score >= 0.120) return 'delta-negative';
  if (score >= 0.050) return 'read-check';
  if (score >= 0.020) return 'read-stable';
  return 'delta-neutral';
}

export function playerSwapCoachNetScore(row: PlayerSwapSignalRead): number {
  const shotDiff = row.deltaShotsFor - row.deltaShotsAgainst;
  return row.deltaXgDiff + (row.preAutoSubDeltaXgDiff || 0) * 0.60 + shotDiff * 0.015 + row.deltaPossessionFor * 0.0015;
}

export function playerSwapCoachAttackScore(row: PlayerSwapSignalRead): number {
  return Math.max(0, row.deltaXgFor) + Math.max(0, row.preAutoSubDeltaXgFor || 0) * 0.60 + Math.max(0, row.deltaShotsFor) * 0.015;
}

export function playerSwapCoachRiskScore(row: PlayerSwapSignalRead): number {
  return Math.max(0, row.deltaXgAgainst) + Math.max(0, row.preAutoSubDeltaXgAgainst || 0) * 0.60 + Math.max(0, row.deltaShotsAgainst) * 0.015;
}

export function playerSwapRoleTradeoff(row: PlayerSwapSignalRead, roleRisk: PlayerSwapRoleRiskRead): boolean {
  const defensiveGain =
    Math.max(0, -row.deltaXgAgainst)
    + Math.max(0, -(row.preAutoSubDeltaXgAgainst || 0)) * 0.60
    + Math.max(0, -row.deltaShotsAgainst) * 0.015
    + Math.max(0, roleRisk.protection);
  const attackCost =
    Math.max(0, -row.deltaXgFor)
    + Math.max(0, -(row.preAutoSubDeltaXgFor || 0)) * 0.60
    + Math.max(0, -row.deltaShotsFor) * 0.015
    + Math.max(0, -roleRisk.attack);
  const protectionCost = Math.max(0, -roleRisk.protection);
  const attackGain = playerSwapCoachAttackScore(row) + Math.max(0, roleRisk.attack);
  if (attackCost >= 0.050 && defensiveGain >= 0.060) return true;
  if (protectionCost >= 0.050 && attackGain >= 0.050) return true;
  return false;
}

export function playerSwapCoachReadLevel(
  row: PlayerSwapSignalRead & PlayerSwapOverallRead,
  roleRisk: PlayerSwapRoleRiskRead,
): PlayerSwapCoachReadLevel {
  const net = playerSwapCoachNetScore(row);
  const attack = playerSwapCoachAttackScore(row);
  const risk = playerSwapCoachRiskScore(row);
  const roleSignal = Math.max(Math.abs(roleRisk.attack), Math.abs(roleRisk.control), Math.abs(roleRisk.protection));
  const signal = playerSwapSignalScore(row, roleRisk);
  if (playerSwapHasLargeQualityDrop(row)) {
    const preNet = row.preAutoSubDeltaXgDiff || 0;
    const stableStrongGain = net >= 0.18 && row.deltaXgDiff >= 0.12 && preNet >= 0.06 && risk <= 0.10;
    if (!stableStrongGain) {
      if (net <= -0.03 || preNet <= -0.03 || row.deltaXgFor <= -0.03) return 'downgrade';
      return 'review';
    }
  }
  if (signal < 0.035) return 'neutral';
  if (roleSignal >= 0.050 && risk < 0.08 && Math.abs(net) < 0.05) return 'review';
  if (playerSwapRoleTradeoff(row, roleRisk)) return 'tradeoff';
  if (net >= 0.08 && risk <= 0.16) {
    return playerSwapHasLargeQualityDrop(row) ? 'review' : 'upgrade';
  }
  if (net <= -0.08 && (risk >= 0.10 || row.deltaXgFor <= 0)) return 'downgrade';
  if (attack >= 0.12 && risk >= 0.12) return 'tradeoff';
  if (signal >= 0.18 || Math.abs(net) >= 0.06) return 'review';
  return 'neutral';
}

export function playerSwapTacticalLabel(score: number, dimension: string): { label: string; cssClass: string } {
  if (score >= 0.10) return { label: `${dimension} ++`, cssClass: 'delta-positive' };
  if (score >= 0.035) return { label: `${dimension} +`, cssClass: 'delta-positive' };
  if (score <= -0.10) return { label: `${dimension} --`, cssClass: 'delta-negative' };
  if (score <= -0.035) return { label: `${dimension} -`, cssClass: 'delta-negative' };
  return { label: `${dimension} =`, cssClass: 'delta-neutral' };
}

export function playerSwapTacticalBreakdown(
  row: PlayerSwapTacticalBreakdownRead,
  roleRisk: PlayerSwapRoleRiskRead,
  formatDeltaNumber: (value: number) => string,
): PlayerSwapTacticalBreakdown {
  const attackScore =
    row.deltaXgFor
    + (row.preAutoSubDeltaXgFor || 0) * 0.55
    + row.deltaShotsFor * 0.020
    + roleRisk.attack;
  const centralControlScore =
    row.deltaPossessionFor * 0.010
    + row.deltaCentralShotsFor * 0.030
    - row.deltaCentralShotsAgainst * 0.035
    + roleRisk.control;
  const protectionScore =
    -row.deltaXgAgainst
    - (row.preAutoSubDeltaXgAgainst || 0) * 0.55
    - row.deltaShotsAgainst * 0.018
    + roleRisk.protection;
  const channelScore =
    (row.deltaWideShotsFor - row.deltaWideShotsAgainst) * 0.028
    + (row.deltaLongShotsFor - row.deltaLongShotsAgainst) * 0.010;
  const attack = playerSwapTacticalLabel(attackScore, 'Ataque');
  const control = playerSwapTacticalLabel(centralControlScore, 'Control');
  const protection = playerSwapTacticalLabel(protectionScore, 'Protección');
  const channels = playerSwapTacticalLabel(channelScore, 'Canales');
  return {
    tacticalAttackRead: attack.label,
    tacticalAttackClass: attack.cssClass,
    tacticalCentralControlRead: control.label,
    tacticalCentralControlClass: control.cssClass,
    tacticalProtectionRead: protection.label,
    tacticalProtectionClass: protection.cssClass,
    tacticalChannelsRead: channels.label,
    tacticalChannelsClass: channels.cssClass,
    tacticalBreakdownDetail:
      `Ataque ${formatDeltaNumber(attackScore)} · Control ${formatDeltaNumber(centralControlScore)} · `
      + `Protección ${formatDeltaNumber(protectionScore)} · Canales ${formatDeltaNumber(channelScore)}. `
      + (roleRisk.detail ? `${roleRisk.detail}. ` : '')
      + `Zonas for C/W/L ${formatDeltaNumber(row.deltaCentralShotsFor)}/${formatDeltaNumber(row.deltaWideShotsFor)}/${formatDeltaNumber(row.deltaLongShotsFor)}; `
      + `against C/W/L ${formatDeltaNumber(row.deltaCentralShotsAgainst)}/${formatDeltaNumber(row.deltaWideShotsAgainst)}/${formatDeltaNumber(row.deltaLongShotsAgainst)}.`,
  };
}

export function playerSwapDecisionScore(
  row: PlayerSwapMatrixSummary,
  objective: ScenarioBatteryCoachObjective,
): number {
  const shotDiff = row.deltaShotsFor - row.deltaShotsAgainst;
  const base = row.deltaXgDiff
    + (row.preAutoSubDeltaXgDiff || 0) * 0.60
    + shotDiff * 0.015
    + row.deltaPossessionFor * 0.0015
    + Math.min(0, playerSwapOverallDelta(row) ?? 0) * 0.025;
  if (objective === 'NEED_GOAL') {
    return base * 0.35
      + row.deltaXgFor * 1.45
      + row.deltaShotsFor * 0.035
      + Math.max(0, row.deltaWideShotsFor + row.deltaCentralShotsFor) * 0.010
      - Math.max(0, -row.deltaXgFor) * 0.85
      - Math.max(0, -row.deltaShotsFor) * 0.020
      - (row.swapFit === 'Out of role' && row.deltaXgFor <= 0 ? 0.08 : 0);
  }
  if (objective === 'PROTECT_RESULT') {
    return base * 0.40
      - row.deltaXgAgainst * 1.35
      - row.deltaShotsAgainst * 0.030
      - Math.max(0, row.deltaWideShotsAgainst + row.deltaCentralShotsAgainst) * 0.010
      + Math.max(0, row.deltaXgDiff) * 0.35
      - (row.swapFit === 'Out of role' && row.deltaXgAgainst > 0 ? 0.12 : 0);
  }
  return base;
}

export function playerSwapProtectSpecialistScore(row: PlayerSwapMatrixSummary): number {
  const benchPosition = row.swapPlayerPosition;
  const starterPosition = row.baselinePlayerPosition;
  const defensiveLineBonus = benchPosition === 'DEF'
    ? 0.22
    : benchPosition === 'MID'
      ? 0.10
      : benchPosition === 'WINGER'
        ? -0.04
        : benchPosition === 'ATT'
          ? -0.16
          : 0;
  const preservesDefensiveRole = starterPosition === benchPosition && ['DEF', 'MID'].includes(benchPosition) ? 0.08 : 0;
  const riskReduction = Math.max(0, -row.deltaXgAgainst) * 2.20
    + Math.max(0, -row.deltaShotsAgainst) * 0.050
    + Math.max(0, -(row.preAutoSubDeltaXgAgainst ?? row.deltaXgAgainst)) * 1.10;
  const riskIncreasePenalty = Math.max(0, row.deltaXgAgainst) * 1.40
    + Math.max(0, row.deltaShotsAgainst) * 0.025;
  const attackInsurance = Math.max(0, row.deltaXgDiff) * 0.18;
  return riskReduction
    - riskIncreasePenalty
    + defensiveLineBonus
    + preservesDefensiveRole
    + attackInsurance
    - (row.swapFit === 'Out of role' ? 0.14 : 0);
}

export function playerSwapIsActionableRecommendation(row: PlayerSwapMatrixSummary): boolean {
  if (row.swapRead !== 'Clear upgrade') return false;
  if (!playerSwapHasLargeQualityDrop(row)) return true;
  return row.deltaXgDiff >= 0.12
    && (row.preAutoSubDeltaXgDiff || 0) >= 0.06
    && row.deltaXgAgainst <= 0.08
    && row.seedCount >= 30;
}
