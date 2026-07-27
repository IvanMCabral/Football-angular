import { buildSquadEditorTacticalCoachReads, SquadEditorTacticalMatrixRow } from './squad-editor-modal-tactical-read.utils';

const balancedMatrix: SquadEditorTacticalMatrixRow[] = [
  { zone: 'ATT', left: 1, center: 1, right: 1 },
  { zone: 'MID', left: 1, center: 3, right: 1 },
  { zone: 'DEF', left: 1, center: 2, right: 1 },
];

describe('squad-editor-modal-tactical-read utils', () => {
  it('asks for a complete lineup before reading tactical shape', () => {
    const reads = buildSquadEditorTacticalCoachReads({
      outfieldPlayerCount: 8,
      matrix: balancedMatrix,
      summary: { width: 60, compactness: 60 },
      wideHigh: 1,
      wideCover: 1,
      offRoleCount: 0,
      severeOffRoleCount: 0,
    });

    expect(reads[0].title).toBe('Lineup incompleto');
    expect(reads[0].level).toBe('warn');
  });

  it('flags an exposed flank as dangerous', () => {
    const reads = buildSquadEditorTacticalCoachReads({
      outfieldPlayerCount: 10,
      matrix: [
        { zone: 'ATT', left: 0, center: 2, right: 1 },
        { zone: 'MID', left: 0, center: 3, right: 2 },
        { zone: 'DEF', left: 1, center: 1, right: 0 },
      ],
      summary: { width: 60, compactness: 60 },
      wideHigh: 1,
      wideCover: 1,
      offRoleCount: 0,
      severeOffRoleCount: 0,
    });

    expect(reads.some(read => read.title === 'Banda descubierta' && read.level === 'danger')).toBeTrue();
  });

  it('flags severe off-role players', () => {
    const reads = buildSquadEditorTacticalCoachReads({
      outfieldPlayerCount: 10,
      matrix: balancedMatrix,
      summary: { width: 60, compactness: 60 },
      wideHigh: 1,
      wideCover: 1,
      offRoleCount: 2,
      severeOffRoleCount: 1,
    });

    expect(reads.some(read => read.title === 'Roles forzados' && read.level === 'danger')).toBeTrue();
  });
});
