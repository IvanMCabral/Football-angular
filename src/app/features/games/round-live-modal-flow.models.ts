import { MatchState } from '../../core/services/match-engine.model';

export interface InjuryAutoModalPayload {
  matchId: string;
  state: MatchState;
  preSelectedPlayerId: string;
}

export interface RivalCardModalPayload {
  matchId: string;
  state: MatchState;
  playerName: string;
  minute: number;
}
