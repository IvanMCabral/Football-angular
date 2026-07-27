import { SessionPlayer } from '../../../../shared/models/player.model';

export interface FormationDialogData {
  matchId: string;
  currentFormation: string;
  homeTeamId: string;
  currentSlots: Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }>;
  squad: SessionPlayer[];
  startingIds: Set<string>;
}
