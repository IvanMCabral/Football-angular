import { Match } from '../../../shared/models/match.model';
import { MatchState } from '../../../core/services/match-engine.model';

/**
 * ViewModel para el partido individual dentro de la jornada
 */
export interface RoundMatchVM {
  match: Match;
  state?: MatchState;
  isUserMatch: boolean;
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
}
