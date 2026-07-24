import { sideMirrorRealRead } from './side-mirror-read-utils';
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
});
