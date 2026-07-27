import {
  buildSquadEditorCoachChannelDeltas,
  buildSquadEditorVisualChannelDeltas,
  buildSquadEditorVisualEngineTension,
  describeSquadEditorCoachDeltaSeverity,
  pushSquadEditorCoachDelta,
  squadEditorVisualDeltaHasHardWarning,
} from './squad-editor-modal-move-impact.utils';

describe('squad-editor-modal-move-impact utils', () => {
  it('formats main rating deltas and ignores sub-point noise', () => {
    const parts: string[] = [];
    const magnitudes: number[] = [];

    pushSquadEditorCoachDelta(parts, magnitudes, 'ATT', 2.4);
    pushSquadEditorCoachDelta(parts, magnitudes, 'DEF', -0.4);
    pushSquadEditorCoachDelta(parts, magnitudes, 'MID', -3.5);

    expect(parts).toEqual(['ATT +2', 'MID -3']);
    expect(magnitudes).toEqual([2, 3]);
  });

  it('explains wide channel tradeoffs when a player is projected forward on the wing', () => {
    const magnitudes: number[] = [];

    const deltas = buildSquadEditorCoachChannelDeltas(
      { left: 80, center: 77, right: 78 },
      { left: 75, center: 79, right: 78 },
      magnitudes,
      'Sube por banda y gana profundidad'
    );

    expect(deltas).toEqual([
      'L -5 (mas profundidad, menos conexion/cobertura)',
      'C +2',
    ]);
    expect(magnitudes).toEqual([5, 2]);
  });

  it('summarizes visual channel deltas and marks negative tactical warnings', () => {
    const magnitudes: number[] = [];

    const deltas = buildSquadEditorVisualChannelDeltas(
      [{ label: 'L', threat: 30, connection: 40, coverage: 55 }],
      [{ label: 'L', threat: 39, connection: 33, coverage: 43 }],
      magnitudes
    );

    expect(deltas).toEqual(['L Amenaza +9%', 'L Conexion -7%', 'L Cobertura -12%']);
    expect(magnitudes).toEqual([5, 4, 6]);
    expect(squadEditorVisualDeltaHasHardWarning(deltas)).toBeTrue();
  });

  it('detects tension when the visual field improves but the engine rating falls', () => {
    const tension = buildSquadEditorVisualEngineTension(
      [{ label: 'C', threat: 20, connection: 30, coverage: 40 }],
      [{ label: 'C', threat: 36, connection: 30, coverage: 40 }],
      -4,
      0
    );

    expect(tension).toContain('sube la amenaza visual, pero baja ATT general');
  });

  it('classifies movement impact severity', () => {
    expect(describeSquadEditorCoachDeltaSeverity([])).toBe('');
    expect(describeSquadEditorCoachDeltaSeverity([1])).toContain('Impacto leve');
    expect(describeSquadEditorCoachDeltaSeverity([5])).toContain('Impacto medio');
    expect(describeSquadEditorCoachDeltaSeverity([11])).toContain('Impacto fuerte');
    expect(describeSquadEditorCoachDeltaSeverity([25])).toContain('Impacto extremo');
  });
});
