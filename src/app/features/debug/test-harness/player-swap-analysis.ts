import { PlayerSwapMatrixSummaryRow } from '../models/test-harness.model';

type PlayerSwapOverallRead = Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>;

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
