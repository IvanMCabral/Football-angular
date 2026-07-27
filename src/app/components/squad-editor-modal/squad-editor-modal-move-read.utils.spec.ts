import {
  buildSquadEditorCoachMoveRead,
  describeSquadEditorCoachMoveFineTrace,
  describeSquadEditorCoachMoveSpatialRead,
} from './squad-editor-modal-move-read.utils';

describe('squad-editor-modal-move-read utils', () => {
  it('keeps tiny pixel moves stable but registered', () => {
    const read = buildSquadEditorCoachMoveRead({
      playerName: 'Oliver',
      playerRole: 'ATT',
      naturalFamily: 'ATT',
      fromX: 50,
      fromY: 22,
      toX: 50.4,
      toY: 22.2,
      snappedToNative: false,
    });

    expect(read.title).toBe('Oliver microajuste');
    expect(read.level).toBe('info');
    expect(read.body).toContain('Movimiento muy chico');
    expect(read.body).toContain('Traza fina: micro');
  });

  it('marks a defender stepping into midfield as a risky structural change', () => {
    const read = buildSquadEditorCoachMoveRead({
      playerName: 'Central',
      playerRole: 'DEF',
      naturalFamily: 'DEF',
      fromX: 48,
      fromY: 82,
      toX: 48,
      toY: 48,
      snappedToNative: false,
    });

    expect(read.title).toBe('Central: DEF → MID');
    expect(read.level).toBe('danger');
    expect(read.body).toContain('Sube un defensor');
  });

  it('explains diagonal wing projection as width plus depth tradeoff', () => {
    const read = buildSquadEditorCoachMoveRead({
      playerName: 'Extremo',
      playerRole: 'MID',
      naturalFamily: 'MID',
      fromX: 66,
      fromY: 52,
      toX: 86,
      toY: 42,
      snappedToNative: false,
    });

    expect(read.title).toBe('Extremo se proyecta abierto');
    expect(read.level).toBe('warn');
    expect(read.body).toContain('gana profundidad y amplitud');
    expect(read.body).toContain('más amplitud');
  });

  it('summarizes spatial channel and line notes', () => {
    const spatial = describeSquadEditorCoachMoveSpatialRead(50, 65, 84, 28);

    expect(spatial).toContain('derecha');
    expect(spatial).toContain('centro -> derecha');
    expect(spatial).toContain('amenaza por banda');
    expect(spatial).toContain('riesgo espalda');
  });

  it('formats fine trace with distance and direction', () => {
    const trace = describeSquadEditorCoachMoveFineTrace(40, 60, 44, 55);

    expect(trace).toContain('Traza fina: medio');
    expect(trace).toContain('4.0% hacia derecha');
    expect(trace).toContain('5.0% más alto');
  });
});
