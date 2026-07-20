import { Match } from '../../../shared/models/match.model';
import { MatchState } from '../../../core/services/match-engine.model';

/**
 * ViewModel para el partido individual dentro de la jornada
 */
export interface RoundMatchVM {
  match: Match;
  state?: MatchState;
  isUserMatch: boolean;
  /** Session team id for the manager's team in this match, when known. */
  userTeamId?: string;
}

/**
 * ViewModel completo para la vista de jornada en vivo
 */
export interface RoundLiveViewModel {
  gameId: string;
  roundNumber: number;
  matches: RoundMatchVM[];
  teamNameMap: { [id: string]: string };
  allFinished: boolean;
  errorMsg: string;
  isRoundPaused: boolean;
  byeTeam: string | null; // UX-6: BYE indicator
  /**
   * V25D82 sprint 2 UX fix: true if at least one match has transitioned
*   past NOT_STARTED (status is RUNNING, HALF_TIME, PAUSED, FINISHED, or
   *   CANCELLED — note: MatchState uses 'RUNNING', not 'IN_PROGRESS',
   *   which is the RoundState.status value). Drives the visibility of
   *   the "Iniciar Todos" button — the button only makes sense when NO
   *   match has started yet AND the round is not paused AND not all
   *   finished. Mirrors the same field in the .ts component and is
   *   exposed via the template binding {@code vm.anyStarted}.
   */
  anyStarted: boolean;
}
