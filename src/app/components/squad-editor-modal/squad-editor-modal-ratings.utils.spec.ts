import { computeSquadEditorAvgAttribute } from './squad-editor-modal-ratings.utils';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';

describe('squad-editor-modal-ratings utils', () => {
  it('computes the rounded average for a numeric player attribute', () => {
    const players = [
      { speed: 70, overall: 60 },
      { speed: 81, overall: 90 },
    ] as PlayerOnFieldDto[];

    expect(computeSquadEditorAvgAttribute(players, 'speed')).toBe(76);
  });

  it('falls back to overall when the requested attribute is missing', () => {
    const players = [
      { overall: 68 },
      { overall: 72 },
    ] as PlayerOnFieldDto[];

    expect(computeSquadEditorAvgAttribute(players, 'technique')).toBe(70);
  });

  it('returns zero when there are no players', () => {
    expect(computeSquadEditorAvgAttribute([], 'mentality')).toBe(0);
  });
});
