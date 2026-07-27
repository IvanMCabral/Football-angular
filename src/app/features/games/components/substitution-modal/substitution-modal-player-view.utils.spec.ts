import {
  isSubstitutionGoalkeeper,
  substitutionEffectivenessBadge,
  substitutionEffectivenessClass
} from './substitution-modal-player-view.utils';
import { SubModalPlayer } from '../../../../core/services/match-engine.model';

const player = (position: string): SubModalPlayer => ({
  sessionPlayerId: 'p1',
  displayName: 'Player',
  position,
  isStarter: true
});

describe('substitution modal player view utils', () => {
  it('detects goalkeepers by position prefix', () => {
    expect(isSubstitutionGoalkeeper(player('GK'))).toBeTrue();
    expect(isSubstitutionGoalkeeper(player('MID'))).toBeFalse();
  });

  it('maps effectiveness to css class and badge', () => {
    const values = { p1: 0.86, p2: 0.95, p3: 0.5 };
    expect(substitutionEffectivenessClass(values, 'p1')).toBe('eff-warning');
    expect(substitutionEffectivenessClass(values, 'p2')).toBe('eff-good');
    expect(substitutionEffectivenessClass(values, 'p3')).toBe('eff-bad');
    expect(substitutionEffectivenessBadge(values, 'p1')).toBe('86%');
  });
});
