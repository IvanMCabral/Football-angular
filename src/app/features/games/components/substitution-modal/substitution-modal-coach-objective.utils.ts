import { CoachObjective, RecommendedSubstitution } from './substitution-modal-recommendation.utils';

export function inferSubstitutionCoachObjective(params: {
  currentMinute: number;
  score?: { home: number; away: number };
  managerSide?: 'HOME' | 'AWAY';
}): CoachObjective {
  const minute = params.currentMinute ?? 0;
  const home = params.score?.home ?? 0;
  const away = params.score?.away ?? 0;
  const managerGoals = params.managerSide === 'AWAY' ? away : home;
  const rivalGoals = params.managerSide === 'AWAY' ? home : away;
  const delta = managerGoals - rivalGoals;

  if (delta < 0 && minute >= 55) {
    return 'NEED_GOAL';
  }
  if (delta > 0 && minute >= 65) {
    return 'PROTECT_RESULT';
  }
  if (delta === 0 && minute >= 75) {
    return 'NEED_GOAL';
  }
  return 'NEUTRAL';
}

export function substitutionCoachObjectiveLabel(objective: CoachObjective): string {
  switch (objective) {
    case 'NEED_GOAL': return 'Necesito gol';
    case 'PROTECT_RESULT': return 'Cuidar resultado';
    default: return 'Neutral';
  }
}

export function substitutionCoachObjectiveClass(objective: CoachObjective): string {
  switch (objective) {
    case 'NEED_GOAL': return 'objective-attack';
    case 'PROTECT_RESULT': return 'objective-protect';
    default: return 'objective-neutral';
  }
}

export function substitutionCoachObjectiveText(params: {
  objective: CoachObjective;
  currentMinute: number;
  score?: { home: number; away: number };
  managerSide?: 'HOME' | 'AWAY';
}): string {
  const minute = params.currentMinute ?? 0;
  const home = params.score?.home ?? 0;
  const away = params.score?.away ?? 0;
  const managerGoals = params.managerSide === 'AWAY' ? away : home;
  const rivalGoals = params.managerSide === 'AWAY' ? home : away;
  const delta = managerGoals - rivalGoals;

  if (params.objective === 'NEED_GOAL') {
    return delta < 0
      ? `Vas ${Math.abs(delta)} abajo al ${minute}'. Prioridad: sumar amenaza, tiros y llegada.`
      : `Empate avanzado al ${minute}'. Prioridad: encontrar un cambio que aumente peligro sin romper el equipo.`;
  }
  if (params.objective === 'PROTECT_RESULT') {
    return `Vas ${delta} arriba al ${minute}'. Prioridad: bajar riesgo rival y sostener estructura.`;
  }
  return `Partido equilibrado al ${minute}'. Prioridad: mantener coherencia y mejorar sin forzar.`;
}

export function recommendedSubstitutionText(
  recommendation: RecommendedSubstitution | null,
  objective: CoachObjective
): string {
  if (!recommendation) {
    if (objective === 'PROTECT_RESULT') {
      return 'Sin recomendación clara para cerrar: no hay un cambio automático suficientemente seguro. Mantené estructura o elegí manualmente.';
    }
    return 'Sin recomendación clara: faltan suplentes válidos o no quedan cambios.';
  }
  return `${recommendation.playerOff.displayName} → ${recommendation.playerOn.displayName}. ${recommendation.reason}`;
}
