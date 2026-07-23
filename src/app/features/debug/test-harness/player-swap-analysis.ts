import { PlayerSwapMatrixSummaryRow } from '../models/test-harness.model';

type PlayerSwapOverallRead = Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>;
type PlayerSwapSignalRead = Pick<
  PlayerSwapMatrixSummaryRow,
  | 'deltaXgDiff'
  | 'preAutoSubDeltaXgDiff'
  | 'deltaXgFor'
  | 'deltaXgAgainst'
  | 'deltaShotsFor'
  | 'deltaShotsAgainst'
>;

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
