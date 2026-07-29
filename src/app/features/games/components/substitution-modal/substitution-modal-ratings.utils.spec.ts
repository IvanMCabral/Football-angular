import {
  findSubstitutionPlayerRating,
  hasSubstitutionRatingChip,
  isInjuredFromSubstitutionRatings
} from './substitution-modal-ratings.utils';
import { LivePlayerRating } from '../../../../core/services/match-engine.model';

const rating = (playerId: string, overrides: Partial<LivePlayerRating> = {}): LivePlayerRating => ({
  playerId,
  playerName: playerId,
  teamId: 'team',
  position: 'MID',
  goals: 0,
  assists: 0,
  shots: 0,
  keyPasses: 0,
  yellowCards: 0,
  redCards: 0,
  fouls: 0,
  injuries: 0,
  rating: 6,
  substitutedIn: false,
  substitutedOut: false,
  ...overrides
});

describe('substitution modal ratings utils', () => {
  it('finds the rating for a player', () => {
    expect(findSubstitutionPlayerRating([rating('a'), rating('b')], 'b')?.playerId).toBe('b');
  });

  it('detects visible event chips', () => {
    expect(hasSubstitutionRatingChip(rating('a'))).toBeFalse();
    expect(hasSubstitutionRatingChip(rating('a', { injuries: 1 }))).toBeTrue();
  });

  it('detects injured players from live ratings', () => {
    expect(isInjuredFromSubstitutionRatings([rating('a', { injuries: 1 })], 'a')).toBeTrue();
    expect(isInjuredFromSubstitutionRatings([rating('a')], 'a')).toBeFalse();
  });
});
