/** Minimal state carried from the already-loaded squad/dashboard screen. */
export interface RoundStartCareerStatus {
  careerId: string | null;
  currentRound: number;
  totalRounds: number;
  userSessionTeamId: string | null;
  careerPhase: string | null;
  season?: number;
  userDivision?: string | null;
}

export interface RoundStartNavigationState {
  managerRoundStart?: {
    careerId: string;
    round: number;
    careerStatus: RoundStartCareerStatus;
  };
}

export function buildRoundStartNavigationState(
  careerStatus: RoundStartCareerStatus,
  round: number,
  careerId: string
): RoundStartNavigationState {
  return {
    managerRoundStart: {
      careerId,
      round,
      careerStatus: { ...careerStatus, careerId, currentRound: round }
    }
  };
}

export function readRoundStartNavigationState(
  gameId: string,
  round: number
): RoundStartCareerStatus | null {
  if (typeof window === 'undefined' || typeof window.history === 'undefined') {
    return null;
  }
  const state = window.history.state as RoundStartNavigationState | null | undefined;
  const start = state?.managerRoundStart;
  if (!start || start.careerId !== gameId || start.round !== round) {
    return null;
  }
  return start.careerStatus;
}
