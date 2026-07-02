/**
 * V25D79: per-player live stats used by the F4 substitution modal.
 *
 * <p>Mirrors {@code com.footballmanager.application.service.simulation.v24.V24PlayerMatchRatingDto}
 * field-for-field. Serialized as part of the SSE payload — the modal uses
 * this to render the chips (goals, keyPasses, yellowCards, fouls, injuries)
 * for each player on the visual pitch.
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

/**
 * MatchState - Estado del partido en tiempo real
 */
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
  /**
   * LIVE-MATCH-F3-UI-LIVE BE1: live possession percentages (0-100) per team.
   * Source: V24LiveSnapshot.homePossession/awayPossession, propagated through
   * MatchStateSnapshot. Defaults to 50 when the V24 path is not active.
   */
  homePossession?: number;
  awayPossession?: number;
  /**
   * LIVE-MATCH-F3-UI-LIVE BE1: live style (BALANCED/ATTACKING/DEFENSIVE/COUNTER/POSSESSION)
   * per team. Source: V24LiveSnapshot.homeStyle/awayStyle, propagated through
   * MatchStateSnapshot. Defaults to "BALANCED" when missing.
   */
  homeStyle?: string;
  awayStyle?: string;
  /**
   * LIVE-MATCH-F3-UI-LIVE BE1: live formation (e.g. "4-4-2") per team.
   * Source: V24LiveSnapshot.homeFormation/awayFormation, propagated through
   * MatchStateSnapshot. Defaults to "4-4-2" when missing.
   */
  homeFormation?: string;
  awayFormation?: string;
  /** Legacy tactics field (ATTACK/DEFEND/BALANCED) — pre-F3 UI used it for buttons. */
  homeTactic?: string;
  awayTactic?: string;
  events: MatchEvent[];
  cards: any[];
  substitutions: any[];
  players: any[];
  /**
   * V25D79: per-player live stats for the home team. One entry per player
   * (starter + bench combined). Computed by the backend on every SSE tick
   * via {@code V24PlayerMatchStatsModel.computeRatings()} applied to the
   * LIVE partial timeline (events up to currentMinute). The modal reads
   * this when the manager team is the home side.
   */
  homePlayerRatings?: V24LivePlayerRating[];
  /**
   * V25D79: per-player live stats for the away team. Mirrors
   * {@code homePlayerRatings} for the away side. The modal reads this when
   * the manager team is the away side.
   */
  awayPlayerRatings?: V24LivePlayerRating[];
  /**
   * V25D79 (D5): subs the manager team can still make. Source of truth
   * (the backend computes it from the SUBSTITUTION event count and the
   * 5-per-match cap, floors at 0). Defaults to 5 when the SSE feed is
   * not yet established or running on the legacy path.
   */
  substitutionsRemaining?: number;
}

/**
 * MatchEvent - Evento ocurrido durante el partido
 */
export interface MatchEvent {
  eventType: 'GOAL' | 'SHOT' | 'SHOT_ON_TARGET' | 'SAVE' | 'MISS' | 'BLOCK'
           | 'CHANCE_CREATED' | 'FOUL' | 'YELLOW_CARD' | 'RED_CARD'
           | 'INJURY' | 'CORNER' | 'OFFSIDE' | 'SUBSTITUTION' | 'CARD'
           | 'TACTICAL_CHANGE';
  minute: number;
  /** Primary player (e.g. the goal scorer, the player who got a card). */
  playerName: string;
  description: string;
  /**
   * Team sessionTeamId (e.g. for the home team of a goal event). The F3
   * timeline uses this to push the chip to the home or away rail.
   * Optional — undefined for events without a team attribution.
   */
  teamId?: string;
  /**
   * LIVE-MATCH-F3-UI-LIVE BE2: ON player name for SUBSTITUTION events.
   * Undefined for non-SUBSTITUTION events.
   */
  playerOnName?: string;
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

/**
 * LIVE-MATCH-F3-UI-LIVE FE1: SSE connection health.
 *
 * <p>The match engine service emits the current health through a per-stream
 * {@code BehaviorSubject<StreamHealth>} that components can subscribe to. The
 * UI renders a small dot (green/yellow/red) and a tooltip so the manager
 * knows whether the scoreboard is real-time or stale.
 *
 * <ul>
 *   <li>{@code HEALTHY} — the SSE connection is OPEN and emitting events.</li>
 *   <li>{@code RECONNECTING} — the connection dropped; a backoff timer is
 *       armed and a manual reconnect attempt is in flight.</li>
 *   <li>{@code DEGRADED} — the connection is open but the gap between two
 *       consecutive events exceeded the degraded threshold (5s). The UI
 *       still shows the latest state but warns the user.</li>
 *   <li>{@code CLOSED} — the connection is permanently closed (5+ failed
 *       reconnect attempts) and the user must retry manually.</li>
 * </ul>
 */
export type StreamHealth = 'HEALTHY' | 'RECONNECTING' | 'DEGRADED' | 'CLOSED';

/**
 * LIVE-MATCH-F3-UI-LIVE FE5: response shape for POST /api/v1/match-engine/matches/{id}/formation.
 *
 * <p>Mirrors the F5 {@code FormationChangeResultDTO} on the backend.
 */
export interface FormationChangeResult {
  success: boolean;
  minuteApplied?: number;
  error?: string;
}

/**
 * LIVE-MATCH-F5.4: tactical style for the manager's team. Mirrors the
 * {@code TeamStyle} enum on the backend (5 values). Used to populate the
 * body of {@code POST /api/v1/match-engine/matches/{matchId}/style}.
 *
 * <p>Mapping with the legacy front enum ({@code 'ATTACK' | 'DEFEND' | 'BALANCED'}):
 * <ul>
 *   <li>BALANCED   — no modifier (default)</li>
 *   <li>ATTACKING  — slightly higher totalLambda, slight share boost</li>
 *   <li>DEFENSIVE  — slightly lower totalLambda, slight defensive share effect</li>
 *   <li>COUNTER    — lower totalLambda, better chance share when weaker than opponent</li>
 *   <li>POSSESSION — slightly lower totalLambda, slight possession share boost</li>
 * </ul>
 */
export type TeamStyle = 'BALANCED' | 'ATTACKING' | 'DEFENSIVE' | 'COUNTER' | 'POSSESSION';

/**
 * LIVE-MATCH-F5.4: response shape for POST /api/v1/match-engine/matches/{matchId}/style.
 *
 * <p>Mirrors the F5 {@code StyleChangeResultDTO} on the backend. The current
 * style is echoed back as a {@link TeamStyle} string (the enum is serialized
 * as {@code .name()} by Jackson).
 */
export interface StyleChangeResult {
  success: boolean;
  /** Always present on success; reflects the style the engine is now using. */
  currentStyle: TeamStyle;
  /** Live minute at which the style was applied (drives the replay window). */
  minuteApplied: number;
  /** Human-readable error message — present only when {@code success=false}. */
  error?: string;
}

/**
 * LIVE-MATCH-F3-UI-LIVE FE4: shape of a player entry sent to the substitution
 * modal. Resolved from the match squad at modal open time.
 */
export interface SubModalPlayer {
  /** Backend sessionPlayerId (UUID as string). */
  sessionPlayerId: string;
  displayName: string;
  position: string;        // GK / DEF / MID / WINGER / ATT
  rating?: number;         // 0-100
  isStarter: boolean;      // true if part of the starting XI
}
