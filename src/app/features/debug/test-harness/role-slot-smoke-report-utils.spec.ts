import {
  allFormationsRoleSlotSmokeMarkdownReport,
  allFormationsRoleSlotSmokeVerdictCounter,
  roleSlotImpactSmokeMarkdownReport,
  roleSlotImpactSmokeVerdictCounter,
} from './role-slot-smoke-report-utils';

describe('role-slot-smoke-report-utils', () => {
  const pct = (value: number) => `${value.toFixed(1)}%`;

  it('counts role-slot impact verdicts and keeps empty verdicts visible', () => {
    expect(roleSlotImpactSmokeVerdictCounter([
      { verdict: 'Claro' },
      { verdict: 'Claro' },
      { verdict: '' },
    ] as any)).toEqual({
      Claro: 2,
      'Sin veredicto': 1,
    });
  });

  it('builds role-slot impact markdown report', () => {
    const report = roleSlotImpactSmokeMarkdownReport({
      match: 'Team A vs Team B',
      formation: '4-4-2',
      seedStart: 10,
      seedCount: 3,
      generatedAt: '2026-07-24T00:00:00.000Z',
      summary: { Claro: 1 },
      rows: [{
        slotId: 'S1',
        player: 'Jugador Uno',
        bestRole: 'DEF',
        bestEff: 1.12,
        worstRole: 'ATT',
        worstEff: 0.82,
        gap: 0.30,
        verdict: 'Claro',
        className: 'read-strong',
      }],
    }, pct);

    expect(report).toContain('# Role Slot Impact Smoke');
    expect(report).toContain('Match: Team A vs Team B');
    expect(report).toContain('Seeds: 10..12');
    expect(report).toContain('| S1 | Jugador Uno | DEF | 112.0% | ATT | 82.0% | 30.0% | Claro |');
  });

  it('counts all-formation role-slot verdicts', () => {
    expect(allFormationsRoleSlotSmokeVerdictCounter([
      { verdict: 'OK' },
      { verdict: 'OK' },
      { verdict: 'Revisar' },
    ] as any)).toEqual({
      OK: 2,
      Revisar: 1,
    });
  });

  it('builds all-formations role-slot markdown report', () => {
    const report = allFormationsRoleSlotSmokeMarkdownReport({
      match: 'Team A vs Team B',
      seedStart: 5,
      seedCount: 2,
      generatedAt: '2026-07-24T00:00:00.000Z',
      summary: { OK: 1 },
      rows: [{
        formation: '4-3-3',
        slots: 10,
        clear: 7,
        visible: 2,
        review: 1,
        minGap: 0.08,
        avgGap: 0.22,
        weakestSlot: 'S6',
        verdict: 'OK',
        className: 'read-strong',
      }],
    }, pct);

    expect(report).toContain('# All Formations Role Slot Smoke');
    expect(report).toContain('Seeds: 5..6');
    expect(report).toContain('| 4-3-3 | 10 | 7 | 2 | 1 | 8.0% | 22.0% | S6 | OK |');
  });

  it('uses fallback summary text when there are no rows', () => {
    const report = roleSlotImpactSmokeMarkdownReport({
      match: 'Unknown match',
      formation: null,
      seedStart: 1,
      seedCount: 1,
      generatedAt: '2026-07-24T00:00:00.000Z',
      summary: {},
      rows: [],
    }, pct);

    expect(report).toContain('Formation: n/a');
    expect(report).toContain('Summary: sin filas');
  });
});
