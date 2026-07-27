import { FormationEffectivenessDTO } from '../../shared/models/lineup/formation-effectiveness.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';

export interface SquadEditorFormationChange {
  formation: string;
  players: unknown[];
}

export interface SquadEditorCoachMoveReadView {
  title: string;
  body: string;
  baseBody?: string;
  level: 'good' | 'warn' | 'danger' | 'info';
}

export interface SquadEditorCoachBaseline {
  attack: number;
  midfield: number;
  defense: number;
  chemistry: number | null;
  channels: {
    left: number | null;
    center: number | null;
    right: number | null;
  };
  visualChannels: SquadEditorVisualChannel[];
}

export interface SquadEditorVisualChannel {
  label: 'L' | 'C' | 'R';
  threat: number;
  connection: number;
  coverage: number;
}

export interface SquadEditorLineupPlayer {
  playerId: string;
  name: string;
  position: string;
  overall?: number;
  energy?: number;
  injured?: boolean;
  attack?: number;
  defense?: number;
  technique?: number;
  speed?: number;
  mentality?: number;
}

export interface SquadEditorCurrentLineupResponse {
  formation?: string;
  players?: SquadEditorLineupPlayer[];
  slots?: LineupSlotDTO[];
  chemistryScore?: number;
  formationEffectiveness?: FormationEffectivenessDTO;
}

export interface SquadEditorAutoSelectResponse {
  players?: SquadEditorLineupPlayer[];
  slots?: LineupSlotDTO[];
}
