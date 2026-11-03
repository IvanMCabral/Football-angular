import { SessionPlayer } from '../../../../shared/models/player.model';

export interface FormationDialogData {
  matchId: string;
  currentFormation: string;
  homeTeamId: string;
  vacantSlotIndexes?: number[];
  currentSlots: Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>;
  squad: SessionPlayer[];
  startingIds: Set<string>;
}
