import { SubModalPlayer, V24LivePlayerRating } from '../../../../core/services/match-engine.model';
import {
  SubstitutionPendingChange,
  SubstitutionPositionTweak,
} from './substitution-modal-live-slots.utils';

export interface SubstitutionDialogData {
  matchId: string;
  currentMinute: number;
  score?: {
    home: number;
    away: number;
  };
  startingXi: SubModalPlayer[];
  bench: SubModalPlayer[];
  substitutionsRemaining: number;
  effectivenessMap?: Record<string, number>;
  formation?: string;
  playerRatings?: V24LivePlayerRating[];
  managerSide?: 'HOME' | 'AWAY';
  preSelectedPlayerId?: string;
  reason?: 'INJURY_FORCED_SUBSTITUTION' | 'MANUAL';
}

export interface PendingSubstitution extends SubstitutionPendingChange {
  playerOffId: string;
  playerOnId: string;
  playerOffName: string;
  playerOnName: string;
}

export type PlayerPositionTweak = SubstitutionPositionTweak;
