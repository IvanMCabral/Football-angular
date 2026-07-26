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
   * True once at least one match has moved past NOT_STARTED.
   * Used to hide the "Iniciar Todos" action after the round begins.
   */
  anyStarted: boolean;
}
