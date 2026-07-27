import { PlayerSwapMatrixSummary } from '../models/test-harness.model';

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLines(header: string[], rows: readonly object[]): string[] {
  return [
    header.join(','),
    ...rows.map((row) => {
      const cells = row as Record<string, unknown>;
      return header.map((key) => csvCell(cells[key])).join(',');
    }),
  ];
}

export function downloadTextFile(
  text: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function playerSwapMatrixExportRow(row: PlayerSwapMatrixSummary): Record<string, unknown> {
  return {
    testCase: row.testCase,
    swapRead: row.swapRead,
    swapReadDetail: row.swapReadDetail,
    swapFit: row.swapFit,
    swapFitDetail: row.swapFitDetail,
    signalScore: row.signalScore,
    signalRead: row.signalRead,
    signalDetail: row.signalDetail,
    tacticalAttackRead: row.tacticalAttackRead,
    tacticalCentralControlRead: row.tacticalCentralControlRead,
    tacticalProtectionRead: row.tacticalProtectionRead,
    tacticalChannelsRead: row.tacticalChannelsRead,
    tacticalBreakdownDetail: row.tacticalBreakdownDetail,
    formation: row.formation,
    slotId: row.slotId,
    baselinePlayer: row.baselinePlayer,
    swapPlayer: row.swapPlayer,
    baselinePlayerOverall: row.baselinePlayerOverall,
    swapPlayerOverall: row.swapPlayerOverall,
    deltaPlayerOverall: row.deltaPlayerOverall,
    seedStart: row.seedStart,
    seedEnd: row.seedEnd,
    seedCount: row.seedCount,
    deltaGoalsFor: row.deltaGoalsFor,
    deltaGoalsAgainst: row.deltaGoalsAgainst,
    deltaGoalDiff: row.deltaGoalDiff,
    deltaShotsFor: row.deltaShotsFor,
    deltaShotsAgainst: row.deltaShotsAgainst,
    deltaPossessionFor: row.deltaPossessionFor,
    deltaXgFor: row.deltaXgFor,
    deltaXgAgainst: row.deltaXgAgainst,
    deltaXgDiff: row.deltaXgDiff,
    preAutoSubDeltaShotsFor: row.preAutoSubDeltaShotsFor,
    preAutoSubDeltaShotsAgainst: row.preAutoSubDeltaShotsAgainst,
    preAutoSubDeltaXgFor: row.preAutoSubDeltaXgFor,
    preAutoSubDeltaXgAgainst: row.preAutoSubDeltaXgAgainst,
    preAutoSubDeltaXgDiff: row.preAutoSubDeltaXgDiff,
    deltaCentralShotsFor: row.deltaCentralShotsFor,
    deltaWideShotsFor: row.deltaWideShotsFor,
    deltaLongShotsFor: row.deltaLongShotsFor,
    deltaCentralShotsAgainst: row.deltaCentralShotsAgainst,
    deltaWideShotsAgainst: row.deltaWideShotsAgainst,
    deltaLongShotsAgainst: row.deltaLongShotsAgainst,
    baselineAvgXgFor: row.baseline.avgXgFor,
    baselineAvgXgAgainst: row.baseline.avgXgAgainst,
    baselineAvgXgDiff: row.baseline.avgXgDiff,
    swappedAvgXgFor: row.swapped.avgXgFor,
    swappedAvgXgAgainst: row.swapped.avgXgAgainst,
    swappedAvgXgDiff: row.swapped.avgXgDiff,
    timestamp: row.timestamp,
  };
}
