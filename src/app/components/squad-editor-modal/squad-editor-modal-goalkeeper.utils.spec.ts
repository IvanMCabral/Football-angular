import {
  SQUAD_EDITOR_GOALKEEPER_SLOT_ID,
  canSquadEditorPlayerUseSlot,
  isInsideSquadEditorGoalkeeperProtectedArea,
  isSquadEditorGoalkeeperSlot,
} from './squad-editor-modal-goalkeeper.utils';

describe('squad-editor-modal-goalkeeper utils', () => {
  it('recognizes the dedicated goalkeeper slot', () => {
    expect(isSquadEditorGoalkeeperSlot(SQUAD_EDITOR_GOALKEEPER_SLOT_ID)).toBeTrue();
    expect(isSquadEditorGoalkeeperSlot('DEF-1')).toBeFalse();
    expect(isSquadEditorGoalkeeperSlot(null)).toBeFalse();
  });

  it('only allows goalkeepers in the goalkeeper slot and outfielders outside it', () => {
    expect(canSquadEditorPlayerUseSlot('GK', 'GK-1')).toBeTrue();
    expect(canSquadEditorPlayerUseSlot('GK', 'DEF-1')).toBeFalse();
    expect(canSquadEditorPlayerUseSlot('DEF', 'GK-1')).toBeFalse();
    expect(canSquadEditorPlayerUseSlot('MID', 'MID-1')).toBeTrue();
    expect(canSquadEditorPlayerUseSlot(null, 'ATT-1')).toBeTrue();
    expect(canSquadEditorPlayerUseSlot('ATT', null)).toBeFalse();
  });

  it('detects the protected goalkeeper area from the GK slot rectangle', () => {
    const subdivisions = [
      { subdivisionId: 'DEF-1', left: 30, top: 70, width: 10, height: 10 },
      { subdivisionId: 'GK-1', left: 45, top: 88, width: 10, height: 8 },
    ] as any;

    expect(isInsideSquadEditorGoalkeeperProtectedArea(50, 92, subdivisions)).toBeTrue();
    expect(isInsideSquadEditorGoalkeeperProtectedArea(44.9, 92, subdivisions)).toBeFalse();
    expect(isInsideSquadEditorGoalkeeperProtectedArea(50, 96.1, subdivisions)).toBeFalse();
  });

  it('keeps the field open when the goalkeeper slot is missing', () => {
    expect(isInsideSquadEditorGoalkeeperProtectedArea(50, 92, [])).toBeFalse();
  });
});
