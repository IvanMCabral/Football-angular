import { V24LivePlayerRating } from '../../../../core/services/match-engine.model';

export function findSubstitutionPlayerRating(
  ratings: V24LivePlayerRating[] | undefined,
  playerId: string
): V24LivePlayerRating | null {
  if (!ratings) {
    return null;
  }
  return ratings.find(rating => rating.playerId === playerId) ?? null;
}

export function hasSubstitutionRatingChip(rating: V24LivePlayerRating | null): boolean {
  if (!rating) {
    return false;
  }
  return rating.goals > 0
    || rating.keyPasses > 0
    || rating.yellowCards > 0
    || rating.fouls > 0
    || rating.injuries > 0;
}

export function isInjuredFromSubstitutionRatings(
  ratings: V24LivePlayerRating[] | undefined,
  playerId: string
): boolean {
  return (findSubstitutionPlayerRating(ratings, playerId)?.injuries ?? 0) > 0;
}
