export interface AdvanceRoundResponse {
  success: boolean;
  message?: string;
  currentRound?: number;
  careerPhase?: string | null;
  tournamentFinished?: boolean;
  userPosition?: number;
}

export interface ContinueCareerResponse {
  success: boolean;
  message?: string;
}

export interface SessionPlayer {
  sessionPlayerId: string;
  name: string;
  age: number;
  position: string;
  attack: number;
  defense: number;
  technique: number;
  speed: number;
  stamina: number;
  mentality: number;
  marketValue: number;
  energy: number;
  form: number;
  origin: string;
  injured?: boolean;
  injuryType?: string | null;
  injuryRemainingMatches?: number;
  yellowCards?: number;
  redCards?: number;
  suspended?: boolean;
  suspensionRemainingMatches?: number;
}

export interface Team {
  sessionTeamId: string;
  baseTeamId: string;
  name: string;
  country: string;
  city: string;
  budget: number;
  formation: string;
  morale: number;
  reputation: number;
  origin: string;
}
