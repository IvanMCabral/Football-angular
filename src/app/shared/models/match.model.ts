export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  status: MatchStatus;
  result: MatchResult | null;
  createdAt: string;
  simulatedAt: string | null;
  round?: number;
  // Campos adicionales que vienen directamente del backend
  homeGoals?: number;
  awayGoals?: number;
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
}

export interface CreateMatchRequest {
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  events: MatchEvent[];
  summary: string;
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'CARD' | 'INJURY' | 'SUBSTITUTION';
  playerName: string;
  description: string;
}

export type MatchStatus = 'SCHEDULED' | 'SIMULATED' | 'CANCELLED';
