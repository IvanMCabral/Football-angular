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
