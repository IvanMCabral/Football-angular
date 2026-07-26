export type TacticalChannel = 'L' | 'C' | 'R';
export type TacticalLine = 'ATT' | 'MID' | 'DEF';

export interface TacticalPoint {
  x: number;
  y: number;
}

export interface TacticalShapeRow {
  zone: TacticalLine;
  left: number;
  center: number;
  right: number;
}

export interface TacticalShapeSummary {
  width: number;
  compactness: number;
  blockHeight: number;
  defensiveDepth: number;
}

export interface TacticalChannelRead {
  label: TacticalChannel;
  threat: number;
  connection: number;
  coverage: number;
}

export function tacticalChannelFromX(x: number): TacticalChannel {
  if (x < 33) { return 'L'; }
  if (x > 67) { return 'R'; }
  return 'C';
}

export function tacticalLineFromY(y: number): TacticalLine {
  if (y < 34) { return 'ATT'; }
  if (y < 67) { return 'MID'; }
  return 'DEF';
}

export function clampTacticalPercent(value: number): number {
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function buildTacticalShapeMatrix(points: TacticalPoint[]): TacticalShapeRow[] {
  const rows: TacticalShapeRow[] = [
    { zone: 'ATT', left: 0, center: 0, right: 0 },
    { zone: 'MID', left: 0, center: 0, right: 0 },
    { zone: 'DEF', left: 0, center: 0, right: 0 },
  ];
  const byZone = new Map(rows.map(row => [row.zone, row]));

  for (const point of points) {
    const row = byZone.get(tacticalLineFromY(point.y));
    if (!row) { continue; }
    const channel = tacticalChannelFromX(point.x);
    if (channel === 'L') { row.left += 1; }
    else if (channel === 'R') { row.right += 1; }
    else { row.center += 1; }
  }

  return rows;
}

export function buildTacticalShapeSummary(points: TacticalPoint[]): TacticalShapeSummary {
  if (points.length === 0) {
    return { width: 0, compactness: 0, blockHeight: 0, defensiveDepth: 0 };
  }

  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const widthSpan = Math.max(...xs) - Math.min(...xs);
  const heightSpan = Math.max(...ys) - Math.min(...ys);
  const avgY = ys.reduce((acc, y) => acc + y, 0) / ys.length;
  const defenders = points.filter(point => tacticalLineFromY(point.y) === 'DEF');
  const defensiveDepth = defenders.length === 0
    ? 0
    : defenders.reduce((acc, point) => acc + point.y, 0) / defenders.length;

  return {
    width: Math.round(widthSpan),
    compactness: Math.max(0, Math.min(100, Math.round(100 - heightSpan))),
    blockHeight: Math.max(0, Math.min(100, Math.round(100 - avgY))),
    defensiveDepth: Math.max(0, Math.min(100, Math.round(defensiveDepth))),
  };
}

export function buildTacticalChannelBreakdown(points: TacticalPoint[]): TacticalChannelRead[] {
  return (['L', 'C', 'R'] as const).map((channel) => {
    const channelPoints = points.filter(point => tacticalChannelFromX(point.x) === channel);
    const att = channelPoints.filter(point => tacticalLineFromY(point.y) === 'ATT').length;
    const mid = channelPoints.filter(point => tacticalLineFromY(point.y) === 'MID').length;
    const def = channelPoints.filter(point => tacticalLineFromY(point.y) === 'DEF').length;
    const highWide = channelPoints.filter(point => point.y < 55).length;
    const lowCover = channelPoints.filter(point => point.y >= 58).length;
    const support = channelPoints.length;

    const threat = clampTacticalPercent(att * 34 + highWide * 18 + Math.min(2, mid) * 10);
    const connection = clampTacticalPercent(
      Math.min(1, att) * 28
      + Math.min(2, mid) * 22
      + Math.min(1, def) * 18
      + Math.min(3, support) * 4
    );
    const coverage = clampTacticalPercent(def * 30 + lowCover * 14 + Math.min(2, mid) * 10);

    return { label: channel, threat, connection, coverage };
  });
}
