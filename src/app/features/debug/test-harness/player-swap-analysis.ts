import { PlayerSwapMatrixSummaryRow } from '../models/test-harness.model';

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

export type PlayerSwapCoachReadLevel = 'upgrade' | 'downgrade' | 'tradeoff' | 'neutral' | 'review';

export interface PlayerSwapRoleRiskRead {
  attack: number;
  control: number;
  protection: number;
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
