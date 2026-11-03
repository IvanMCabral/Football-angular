import { ALL_FORMATIONS } from '../constants/formations';
import { TACTICAL_LAYOUTS } from '../constants/tactical-layouts';
import { SessionPlayer } from '../models/player.model';
import { reflowTacticalXi } from './tactical-lineup-reflow.utils';

describe('tactical XI reflow', () => {
  for (const from of ALL_FORMATIONS) {
    it('preserves players and keeper when changing ' + from + ' to any formation', () => {
      const squad = TACTICAL_LAYOUTS[from].map((slot, index) => ({sessionPlayerId: 'p' + index, position: slot.role} as SessionPlayer));
      const assignments = new Map(squad.map((p, i) => [i, p.sessionPlayerId]));
      for (const to of ALL_FORMATIONS) {
        const next = reflowTacticalXi(assignments, from, to, squad);
        expect(next.size).toBe(11);
        expect(new Set(next.values())).toEqual(new Set(assignments.values()));
        expect(next.get(0)).toBe('p0');
      }
    });
  }
  it('does not invent a twelfth player or duplicate one after a vacancy', () => {
    const assignments = new Map(Array.from({length: 10}, (_, i) => [i, 'p' + i]));
    const next = reflowTacticalXi(assignments, '4-4-2', '4-3-3', []);
    expect([...next.values()].filter(Boolean).length).toBe(10);
    expect(new Set([...next.values()].filter(Boolean)).size).toBe(10);
  });
});
