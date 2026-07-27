import { SubModalPlayer } from '../../../../core/services/match-engine.model';
import {
  attackIntent,
  balancedIntent,
  positionGroup,
  positionProfile,
  protectIntent
} from './substitution-modal-pitch.utils';

export type CoachObjective = 'NEED_GOAL' | 'PROTECT_RESULT' | 'NEUTRAL';

export interface RecommendedSubstitution {
  playerOff: SubModalPlayer;
  playerOn: SubModalPlayer;
  reason: string;
  score: number;
  kind?: 'medical' | 'tactical';
}

export interface ScoreRecommendedSubstitutionInput {
  playerOff: SubModalPlayer;
  playerOn: SubModalPlayer;
  kind?: 'medical' | 'tactical';
  coachObjective: CoachObjective;
  preSelectedPlayerId?: string;
  isActiveInjuredStarter: (playerId: string) => boolean;
}

export function scoreRecommendedSubstitution(input: ScoreRecommendedSubstitutionInput): RecommendedSubstitution {
  const {
    playerOff,
    playerOn,
    coachObjective,
    preSelectedPlayerId,
    isActiveInjuredStarter,
    kind = 'tactical'
  } = input;
  const offRating = playerOff.rating ?? 70;
  const onRating = playerOn.rating ?? 70;
  const ratingDelta = onRating - offRating;
  const sameLine = positionGroup(playerOff.position) === positionGroup(playerOn.position);
  const injuryBonus = kind === 'medical' || isActiveInjuredStarter(playerOff.sessionPlayerId) ? 18 : 0;

  if (kind === 'medical') {
    const sameProfile = positionProfile(playerOff.position) === positionProfile(playerOn.position);
    const offLine = positionGroup(playerOff.position);
    const onLine = positionGroup(playerOn.position);
    const sameMedicalLine = offLine === onLine;
    const adjacentAttackingCover = offLine === 'ATT' && onLine === 'WINGER' ? 3 : 0;
    const centralMidCoverPenalty = offLine === 'ATT' && onLine === 'MID' ? -1 : 0;
    const profileBonus = sameProfile ? 8 : sameMedicalLine ? 4 : -7;
    const ratingSafety = Math.max(-3, ratingDelta * 0.35);
    return {
      playerOff,
      playerOn,
      reason: `Prioridad médica: ${playerOff.displayName} está lesionado. Si lo dejás en cancha, el equipo sigue jugando con penalización.`,
      score: 100
        + profileBonus
        + adjacentAttackingCover
        + centralMidCoverPenalty
        + ratingSafety
        + balancedIntent(playerOn),
      kind
    };
  }

  if (coachObjective === 'NEED_GOAL') {
    const sameProfile = positionProfile(playerOff.position) === positionProfile(playerOn.position);
    const profileBonus = sameProfile ? 4 : sameLine ? 2 : -5;
    const defensiveBreakPenalty = positionGroup(playerOff.position) === 'DEF' && positionGroup(playerOn.position) === 'ATT'
      ? -8
      : 0;
    return {
      playerOff,
      playerOn,
      reason: preSelectedPlayerId === playerOff.sessionPlayerId
        ? 'Prioriza un reemplazo que no apague el ataque.'
        : 'Prioriza amenaza ofensiva y llegada.',
      score: attackIntent(playerOn) * 4
        + Math.max(0, ratingDelta) * 0.55
        + profileBonus
        + defensiveBreakPenalty
        + injuryBonus,
      kind
    };
  }

  if (coachObjective === 'PROTECT_RESULT') {
    const sameProfile = positionProfile(playerOff.position) === positionProfile(playerOn.position);
    const onLine = positionGroup(playerOn.position);
    const profileBonus = onLine === 'ATT'
      ? -4
      : onLine === 'WINGER'
        ? -1
        : sameProfile
          ? 4
          : sameLine
            ? 1
            : -5;
    const protectionGain = protectIntent(playerOn) - protectIntent(playerOff);
    const defensiveStarterPenalty = positionGroup(playerOff.position) === 'DEF' && !sameProfile ? -4 : 0;
    const attackingBenchPenalty = onLine === 'ATT' ? -4 : onLine === 'WINGER' ? -1.5 : 0;
    return {
      playerOff,
      playerOn,
      reason: preSelectedPlayerId === playerOff.sessionPlayerId
        ? 'Prioriza sostener estructura y bajar riesgo.'
        : 'Prioriza estructura, marca y control del riesgo.',
      score: protectionGain * 3
        + protectIntent(playerOn) * 1.2
        + Math.max(0, ratingDelta) * 0.45
        + profileBonus
        + defensiveStarterPenalty
        + attackingBenchPenalty
        + injuryBonus,
      kind
    };
  }

  return {
    playerOff,
    playerOn,
    reason: sameLine
      ? 'Cambio natural para mejorar sin romper la estructura.'
      : 'Mejora posible, pero cambia la estructura del equipo.',
    score: ratingDelta
      + (sameLine ? 3 : -1.5)
      + balancedIntent(playerOn) * 1.5
      + injuryBonus,
    kind
  };
}

