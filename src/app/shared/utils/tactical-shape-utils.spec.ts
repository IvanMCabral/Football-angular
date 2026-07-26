import {
  buildTacticalChannelBreakdown,
  buildTacticalShapeMatrix,
  buildTacticalShapeSummary,
  clampTacticalPercent,
  tacticalChannelFromX,
  tacticalLineFromY
} from './tactical-shape-utils';

describe('tactical-shape-utils', () => {
  it('maps field coordinates to tactical channels and lines', () => {
    expect(tacticalChannelFromX(10)).toBe('L');
    expect(tacticalChannelFromX(50)).toBe('C');
    expect(tacticalChannelFromX(80)).toBe('R');

    expect(tacticalLineFromY(20)).toBe('ATT');
    expect(tacticalLineFromY(50)).toBe('MID');
    expect(tacticalLineFromY(80)).toBe('DEF');
  });

  it('builds an ATT/MID/DEF matrix by left-center-right occupation', () => {
    expect(buildTacticalShapeMatrix([
      { x: 20, y: 20 },
      { x: 50, y: 50 },
      { x: 80, y: 80 },
      { x: 25, y: 80 },
    ])).toEqual([
      { zone: 'ATT', left: 1, center: 0, right: 0 },
      { zone: 'MID', left: 0, center: 1, right: 0 },
      { zone: 'DEF', left: 1, center: 0, right: 1 },
    ]);
  });

  it('summarizes team width, compactness, block height and defensive depth', () => {
    expect(buildTacticalShapeSummary([
      { x: 20, y: 20 },
      { x: 50, y: 50 },
      { x: 80, y: 80 },
    ])).toEqual({
      width: 60,
      compactness: 40,
      blockHeight: 50,
      defensiveDepth: 80,
    });
  });

  it('builds channel reads for threat, connection and coverage', () => {
    const reads = buildTacticalChannelBreakdown([
      { x: 20, y: 20 },
      { x: 25, y: 50 },
      { x: 22, y: 80 },
      { x: 80, y: 20 },
    ]);

    const left = reads.find(row => row.label === 'L')!;
    const right = reads.find(row => row.label === 'R')!;

    expect(left.threat).toBeGreaterThan(0);
    expect(left.connection).toBeGreaterThan(0);
    expect(left.coverage).toBeGreaterThan(0);
    expect(right.threat).toBeGreaterThan(0);
    expect(right.coverage).toBeLessThan(left.coverage);
  });

  it('clamps tactical percentages for UI bars', () => {
    expect(clampTacticalPercent(-10)).toBe(0);
    expect(clampTacticalPercent(50.4)).toBe(50);
    expect(clampTacticalPercent(120)).toBe(99);
  });
});
