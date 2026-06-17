/**
 * MatchState - Estado del partido en tiempo real
 */
export interface MatchState {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  currentMinute: number;
  status: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'CANCELLED';
  score: {
    home: number;
    away: number;
  };
  homeTactic: string;
  awayTactic: string;
  events: MatchEvent[];
  cards: any[];
  substitutions: any[];
  players: any[];
}

/**
 * MatchEvent - Evento ocurrido durante el partido
 */
export interface MatchEvent {
  eventType: 'GOAL' | 'CARD' | 'INJURY' | 'SUBSTITUTION';
  minute: number;
  playerName: string;
  description: string;
}

/**
 * MatchCommand - Comando para enviar al motor durante el partido
 */
export interface MatchCommand {
  type: 'CHANGE_TACTIC' | 'SUBSTITUTE' | 'CHANGE_MENTALITY';
  targetTeam?: 'HOME' | 'AWAY';
  tactic?: 'ATTACK' | 'DEFEND' | 'BALANCED';
  playerOut?: string;
  playerIn?: string;
}

/**
 * EngineStatus - Estado del sistema de motores
 */
export interface EngineStatus {
  activeEngines: number;
}

/**
 * RoundState - Estado de una jornada completa con todos sus partidos
 */
export interface RoundState {
  roundId: string;
  timestamp: string;
  matches: MatchState[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'COMPLETED';
}

/**
 * LIVE-MATCH-F1-POC: response shape for POST /api/v1/match-engine/matches/{id}/substitutions.
 *
 * <p>Phase 1 POC (D1=B): manual substitutions are UI-only. The backend appends the
 * SUBSTITUTION event to the live session's timeline (so the UI/animation can render it),
 * mutates player state (substituteOn/substituteOff) for downstream consumers, but does
 * NOT recompute goals/xG. The proper engine refactor is deferred to Phase 2.
 *
 * <p>Returned alongside a 200 OK status. On 4xx/5xx the backend returns
 * {@code SubstitutionResultDTO} with {@code success=false} + error message.
 */
export interface SubstitutionResult {
  success: boolean;
  minuteApplied: number;
  substitutionsRemaining: number;
  error?: string;
}
