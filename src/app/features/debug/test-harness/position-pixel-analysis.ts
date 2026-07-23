import { PositionPixelMatrixSummaryRow } from '../models/test-harness.model';

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

export function positionPixelDistance(row: Pick<PositionPixelSignalRead, 'fromXPercent' | 'fromYPercent' | 'targetXPercent' | 'targetYPercent'>): number {
  return Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent);
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
