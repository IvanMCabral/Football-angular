import {
  attackIntent,
  balancedIntent,
  buildSubstitutionPitchLines,
  positionGroup,
  positionProfile,
  protectIntent
} from './substitution-modal-pitch.utils';
import { SubModalPlayer } from '../../../../core/services/match-engine.model';

function player(id: string, position: string): SubModalPlayer {
  return {
    sessionPlayerId: id,
    displayName: id,
    position,
    rating: 70,
    isStarter: true
  };
}

describe('substitution-modal-pitch utils', () => {
  it('groups players into visual pitch lines without empty rows', () => {
    const lines = buildSubstitutionPitchLines([
      player('gk', 'GK'),
      player('cb', 'CB'),
      player('cm', 'CM'),
      player('st', 'ST')
    ]);

    expect(lines.map(line => line.category)).toEqual(['GK', 'DEF', 'MID', 'ATT']);
    expect(lines.flatMap(line => line.players.map(p => p.sessionPlayerId))).toEqual(['gk', 'cb', 'cm', 'st']);
  });

  it('classifies common football positions consistently', () => {
    expect(positionGroup('RB')).toBe('DEF');
    expect(positionGroup('RW')).toBe('WINGER');
    expect(positionGroup('CAM')).toBe('MID');
    expect(positionGroup('CF')).toBe('ATT');
    expect(positionProfile('RWB')).toBe('FB');
    expect(positionProfile('LW')).toBe('WIDE');
  });

  it('keeps tactical intent aligned with the player line', () => {
    expect(attackIntent(player('st', 'ST'))).toBeGreaterThan(attackIntent(player('cb', 'CB')));
    expect(protectIntent(player('cb', 'CB'))).toBeGreaterThan(protectIntent(player('st', 'ST')));
    expect(balancedIntent(player('cm', 'CM'))).toBeGreaterThan(balancedIntent(player('rw', 'RW')));
  });
});
