import { FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { USER_FORMATION_LABEL } from '../../shared/constants/formations';
import {
  countSquadEditorFormationRoleFamilies,
  countSquadEditorRoleFamilies,
  detectSquadEditorFormationFromFamilies,
  isSquadEditorTacticalRoleMismatch,
  tacticalRoleFitsPlayerRole,
} from './squad-editor-modal-formation-detection.utils';

function positions(roles: string[]): FormationPositionDTO[] {
  return roles.map((role, index) => ({
    index,
    subdivisionId: `slot-${index}`,
    role,
    xPercent: 50,
    yPercent: 50,
    actionRangePercent: 8,
  }));
}

describe('squad-editor-modal-formation-detection utils', () => {
  it('counts role families from player families and canonical formation roles', () => {
    expect(countSquadEditorRoleFamilies([
      'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT',
    ])).toEqual({ gk: 1, def: 4, mid: 4, att: 2 });

    expect(countSquadEditorFormationRoleFamilies(positions([
      'GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LM', 'RM', 'ST', 'CF',
    ]))).toEqual({ gk: 1, def: 4, mid: 4, att: 2 });
  });

  it('detects the canonical formation by role-family shape', () => {
    const result = detectSquadEditorFormationFromFamilies(
      ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
      {
        '4-4-2': positions(['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']),
        '4-3-3': positions(['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW']),
      },
      ['4-4-2', '4-3-3'],
    );

    expect(result).toEqual({ label: '4-4-2', isCustomLineup: false });
  });

  it('marks incomplete or unknown shapes as custom', () => {
    expect(detectSquadEditorFormationFromFamilies(
      ['GK', 'DEF', 'DEF'],
      { '4-4-2': positions(['GK']) },
      ['4-4-2'],
    )).toEqual({ label: USER_FORMATION_LABEL, isCustomLineup: true });

    expect(detectSquadEditorFormationFromFamilies(
      ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
      { '4-4-2': positions(['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']) },
      ['4-4-2'],
    )).toEqual({ label: USER_FORMATION_LABEL, isCustomLineup: true });
  });

  it('keeps role fit permissive for natural adjacent roles', () => {
    expect(tacticalRoleFitsPlayerRole('LW', 'LM')).toBeTrue();
    expect(tacticalRoleFitsPlayerRole('CAM', 'CF')).toBeTrue();
    expect(tacticalRoleFitsPlayerRole('RB', 'RWB')).toBeTrue();
    expect(tacticalRoleFitsPlayerRole('ST', 'CB')).toBeFalse();
  });

  it('flags tactical mismatch only when role and actual zone stop making sense', () => {
    expect(isSquadEditorTacticalRoleMismatch('MID', 'ATT', 'ATT')).toBeTrue();
    expect(isSquadEditorTacticalRoleMismatch('ST', 'ATT', 'ATT')).toBeFalse();
    expect(isSquadEditorTacticalRoleMismatch('LM', 'LW', 'ATT')).toBeFalse();
    expect(isSquadEditorTacticalRoleMismatch('CB', 'CM', 'DEF')).toBeTrue();
  });
});
