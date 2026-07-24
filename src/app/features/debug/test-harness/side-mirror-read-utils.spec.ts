import {
  buildSideMirrorSmokeRowsFromMatrix,
  formationPositionLane,
  formationWidthReadFromPositions,
  formationWingbackReadFromPositions,
  mapSyntheticSideMirrorRows,
  sideMirrorRealRead,
} from './side-mirror-read-utils';
import { FormationWidthRead, FormationWingbackRead } from '../models/test-harness.model';

describe('side-mirror-read-utils', () => {
  const wide: FormationWidthRead = {
    verdict: 'OK',
    read: 'OK: I5/C0/D5 · ancho 100%',
    className: 'read-strong',
  };
  const narrow: FormationWidthRead = {
    verdict: 'Estrecha',
    read: 'Estrecha: I1/C8/D1 · ancho 20%',
    className: 'read-visible',
  };
  const noWingbacks: FormationWingbackRead = {
    verdict: 'Sin carrileros',
    read: 'Sin LWB/RWB',
    className: 'read-check',
  };
  const lowWingbacks: FormationWingbackRead = {
    verdict: 'OK',
    read: 'OK: bajos · sim 100%',
    className: 'read-visible',
  };

  it('classifies formation lanes by role first and x position as fallback', () => {
    expect(formationPositionLane({ role: 'LB', xPercent: 50, yPercent: 70 } as any)).toBe('LEFT');
    expect(formationPositionLane({ role: 'RW', xPercent: 50, yPercent: 30 } as any)).toBe('RIGHT');
    expect(formationPositionLane({ role: 'CM', xPercent: 30, yPercent: 50 } as any)).toBe('LEFT');
    expect(formationPositionLane({ role: 'CM', xPercent: 70, yPercent: 50 } as any)).toBe('RIGHT');
    expect(formationPositionLane({ role: 'CM', xPercent: 50, yPercent: 50 } as any)).toBe('CENTER');
  });

  it('reads formation width balance from outfield positions', () => {
    const balancedWide = [
      { role: 'GK' },
      { role: 'LB' },
      { role: 'RB' },
      { role: 'LM' },
      { role: 'RM' },
      { role: 'CM' },
      { role: 'ST' },
    ] as any[];
    const narrow = [
      { role: 'GK' },
      { role: 'CB', xPercent: 45 },
      { role: 'CM', xPercent: 50 },
      { role: 'ST', xPercent: 52 },
    ] as any[];
    const unbalanced = [
      { role: 'GK' },
      { role: 'LB' },
      { role: 'LM' },
      { role: 'LW' },
      { role: 'CM' },
    ] as any[];

    expect(formationWidthReadFromPositions(balancedWide).verdict).toBe('OK');
    expect(formationWidthReadFromPositions(narrow).verdict).toBe('Revisar ancho');
    expect(formationWidthReadFromPositions(unbalanced).verdict).toBe('Revisar lado');
  });

  it('reads wingback symmetry and height from LWB/RWB positions', () => {
    expect(formationWingbackReadFromPositions([{ role: 'LB' }, { role: 'RB' }] as any[]).verdict).toBe('Sin carrileros');
    expect(formationWingbackReadFromPositions([{ role: 'LWB', xPercent: 20, yPercent: 55 }] as any[]).read).toBe('Solo LWB');
    expect(formationWingbackReadFromPositions([
      { role: 'LWB', xPercent: 18, yPercent: 55 },
      { role: 'RWB', xPercent: 82, yPercent: 56 },
    ] as any[]).verdict).toBe('OK');
    expect(formationWingbackReadFromPositions([
      { role: 'LWB', xPercent: 18, yPercent: 35 },
      { role: 'RWB', xPercent: 82, yPercent: 35 },
    ] as any[]).verdict).toBe('Revisar altura');
    expect(formationWingbackReadFromPositions([
      { role: 'LWB', xPercent: 28, yPercent: 55 },
      { role: 'RWB', xPercent: 82, yPercent: 70 },
    ] as any[]).verdict).toBe('Revisar lado');
  });

  it('explains successful and partial side mirror reads', () => {
    expect(sideMirrorRealRead('OK', '4-4-2', 0.03, 0.03, wide, noWingbacks))
      .toBe('El espejo lateral responde en ambos sentidos.');
    expect(sideMirrorRealRead('Parcial', '4-4-2', 0.03, 0, wide, noWingbacks))
      .toContain('Un lado responde');
  });

  it('explains near-zero real rows without calling them direct motor failures', () => {
    expect(sideMirrorRealRead('Revisar', '4-4-2', 0, 0, wide, noWingbacks))
      .toContain('sin carrileros');
    expect(sideMirrorRealRead('Revisar', '5-4-1', 0, 0, wide, lowWingbacks))
      .toContain('carrileros bajos');
    expect(sideMirrorRealRead('Revisar', '4-3-3', 0, 0, wide, { ...noWingbacks, read: 'OK: altos · sim 100%' }))
      .toContain('ancho pero plano');
    expect(sideMirrorRealRead('Revisar', '4-3-1-2', 0, 0, narrow, { ...noWingbacks, read: 'OK: altos · sim 100%' }))
      .toContain('plantel, roles y estilo');
  });

  it('keeps non-near-zero review rows as insufficient lateral signal', () => {
    expect(sideMirrorRealRead('Revisar', '4-3-3', 0.03, -0.02, wide, noWingbacks))
      .toContain('control sintético');
  });

  it('builds real side mirror rows by pairing weak-left and weak-right matrix rows', () => {
    const positionsByFormation = {
      '4-4-2': [
        { role: 'GK' },
        { role: 'LB' },
        { role: 'RB' },
        { role: 'LM' },
        { role: 'RM' },
        { role: 'CM' },
      ],
      '4-3-3': [
        { role: 'GK' },
        { role: 'LB' },
        { role: 'LW' },
        { role: 'CM' },
      ],
    } as any;
    const rows = buildSideMirrorSmokeRowsFromMatrix([
      {
        formation: '4-4-2',
        seedStart: 1,
        seedEnd: 3,
        seedCount: 3,
        avgLeftWideXgFor: 0.01,
        avgRightWideXgFor: 0.04,
        avgLeftWideShotsFor: 1,
        avgRightWideShotsFor: 4,
      },
      {
        formation: '4-3-3',
        seedStart: 1,
        seedEnd: 3,
        seedCount: 3,
        avgLeftWideXgFor: 0.02,
        avgRightWideXgFor: 0.02,
      },
      {
        formation: 'missing-right',
        seedStart: 1,
        seedEnd: 3,
        seedCount: 3,
      },
    ] as any[], [
      {
        formation: '4-4-2',
        seedStart: 1,
        seedEnd: 3,
        seedCount: 3,
        avgLeftWideXgFor: 0.05,
        avgRightWideXgFor: 0.02,
        avgLeftWideShotsFor: 5,
        avgRightWideShotsFor: 2,
      },
      {
        formation: '4-3-3',
        seedStart: 1,
        seedEnd: 3,
        seedCount: 3,
        avgLeftWideXgFor: 0.02,
        avgRightWideXgFor: 0.02,
      },
    ] as any[], positionsByFormation);

    expect(rows.map((row) => row.formation)).toEqual(['4-4-2', '4-3-3']);
    expect(rows[0].verdict).toBe('OK');
    expect(rows[0].weakLeftRightEdge).toBe(0.03);
    expect(rows[0].weakRightLeftEdge).toBe(0.03);
    expect(rows[0].read).toContain('responde');
    expect(rows[1].verdict).toBe('Revisar');
  });

  it('maps synthetic side mirror rows with formation width and wingback reads', () => {
    const rows = mapSyntheticSideMirrorRows([
      {
        formation: '4-4-2',
        seedStart: 1,
        seedEnd: 2,
        seedCount: 2,
        weakLeftWideXgL: 0.01,
        weakLeftWideXgR: 0.03,
        weakRightWideXgL: 0.04,
        weakRightWideXgR: 0.02,
        weakLeftWideShotsL: 1,
        weakLeftWideShotsR: 3,
        weakRightWideShotsL: 4,
        weakRightWideShotsR: 2,
        weakLeftRightEdge: 0.02,
        weakRightLeftEdge: 0.02,
        mirrorGap: 0,
        verdict: 'OK',
        read: 'synthetic ok',
      },
    ], {
      '4-4-2': [
        { role: 'GK' },
        { role: 'LB' },
        { role: 'RB' },
        { role: 'LM' },
        { role: 'RM' },
        { role: 'CM' },
      ],
    } as any);

    expect(rows).toHaveSize(1);
    expect(rows[0].read).toBe('synthetic ok');
    expect(rows[0].widthRead).toContain('OK');
    expect(rows[0].wingbackRead).toBe('Sin LWB/RWB');
  });
});
