/**
 * Per-player live stats sent by the match engine for visual pitch cards.
 */
export interface V24LivePlayerRating {
  playerId: string;
  playerName: string;
  teamId: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  keyPasses: number;
  shots: number;
  yellowCards: number;
  redCards: number;
  injuries: number;
  fouls: number;
  substitutedIn: boolean;
  substitutedOut: boolean;
}

export interface LiveFormationSlot {
  playerId?: string;
  sessionPlayerId?: string;
  position: string;
  slotIndex?: number | null;
  customXPercent?: number | null;
  customYPercent?: number | null;
}

/** Live state for one match. */
export interface MatchState {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  currentMinute: number;
  status: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'HALF_TIME' | 'FINISHED' | 'CANCELLED';
  score: {
    home: number;
    away: number;
  };
  /** Live possession percentages per team, 0-100. */
  homePossession?: number;
  awayPossession?: number;
  /** Current tactical style per team. Defaults to BALANCED when missing. */
  homeStyle?: string;
  awayStyle?: string;
  /** Current formation code per team, for example "4-4-2". */
  homeFormation?: string;
  awayFormation?: string;
  homeSlots?: LiveFormationSlot[];
  awaySlots?: LiveFormationSlot[];
  /** Legacy tactic field kept for older live controls. */
  homeTactic?: string;
  awayTactic?: string;
  events: MatchEvent[];
  cards: unknown[];
  substitutions: unknown[];
  players: unknown[];
  /** Per-player live stats for the home team. */
  homePlayerRatings?: V24LivePlayerRating[];
  /** Per-player live stats for the away team. */
  awayPlayerRatings?: V24LivePlayerRating[];
  /** Remaining manager substitutions, computed by the backend. */
  substitutionsRemaining?: number;
}

/** Event emitted during a match. */
export interface MatchEvent {
  eventType: 'GOAL' | 'SHOT' | 'SHOT_ON_TARGET' | 'SAVE' | 'MISS' | 'BLOCK'
           | 'CHANCE_CREATED' | 'FOUL' | 'YELLOW_CARD' | 'RED_CARD'
           | 'INJURY' | 'CORNER' | 'OFFSIDE' | 'SUBSTITUTION' | 'CARD'
           | 'TACTICAL_CHANGE';
  minute: number;
  /** Primary player session id when the event can be attributed to a player. */
  playerId?: string;
  /** Primary player (e.g. the goal scorer, the player who got a card). */
  playerName: string;
  description: string;
  /** Team session id for events that can be attributed to a side. */
  teamId?: string;
  /** Player entering the pitch for substitution events. */
  playerOnName?: string;
  /** Secondary player id for events that involve two players. */
  relatedPlayerId?: string;
  relatedPlayerName?: string;
}

/** Command sent to the match engine while a match is running. */
export interface MatchCommand {
  type: 'CHANGE_TACTIC' | 'SUBSTITUTE' | 'CHANGE_MENTALITY';
  targetTeam?: 'HOME' | 'AWAY';
  tactic?: 'ATTACK' | 'DEFEND' | 'BALANCED';
  playerOut?: string;
  playerIn?: string;
}

/** Engine process status. */
export interface EngineStatus {
  activeEngines: number;
}

/** Live state for a full round. */
export interface RoundState {
  roundId: string;
  timestamp: string;
  matches: MatchState[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'COMPLETED';
}

/** Response returned after applying a substitution. */
export interface SubstitutionResult {
  success: boolean;
  minuteApplied: number;
  substitutionsRemaining: number;
  error?: string;
}

/** Live stream connection health exposed to the UI. */
export type StreamHealth = 'HEALTHY' | 'RECONNECTING' | 'DEGRADED' | 'CLOSED';

/** Response returned after applying a formation change. */
export interface FormationChangeResult {
  success: boolean;
  minuteApplied?: number;
  currentFormation?: LiveFormationSlot[];
  error?: string;
}

/** Tactical style used by the manager team during a live match. */
export type TeamStyle = 'BALANCED' | 'ATTACKING' | 'DEFENSIVE' | 'COUNTER' | 'POSSESSION';

/** Response returned after applying a tactical style change. */
export interface StyleChangeResult {
  success: boolean;
  /** Always present on success; reflects the style the engine is now using. */
  currentStyle: TeamStyle;
  /** Live minute at which the style was applied (drives the replay window). */
  minuteApplied: number;
  /** Human-readable error message when the change fails. */
  error?: string;
}

/** Player entry shown by the substitution modal. */
export interface SubModalPlayer {
  /** Backend sessionPlayerId (UUID as string). */
  sessionPlayerId: string;
  displayName: string;
  position: string;        // GK / DEF / MID / WINGER / ATT
  rating?: number;         // 0-100
  isStarter: boolean;      // true if part of the starting XI
}
