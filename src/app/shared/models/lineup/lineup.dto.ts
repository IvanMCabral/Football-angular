import { LineupWarningDTO } from './lineup-warning.dto';
import { LineupSlotDTO } from './lineup-slot.dto';
import { FormationEffectivenessDTO } from './formation-effectiveness.dto';

/**
 * Per-player card DTO returned by the backend lineup endpoints.
 * Mirrors `PlayerLineupDTO` on the backend.
 */
export interface PlayerLineupDTO {
  playerId: string;
  name: string;
  position: string;
  overall: number;
  energy: number;
  injured: boolean;
  age: number;
  yellowCards?: number;
  redCards?: number;
  suspended?: boolean;
  suspensionRemainingMatches?: number;
}

// One skill contribution inside a chemistry position group.
export interface SkillCoverageDTO {
  /** {@link PlayerSkill} enum name, e.g., "WALL", "AERIAL". */
  skill: string;
  /** Max level of this skill across the lineup, [0, 99]. */
  maxLevel: number;
  /** sessionPlayerId of the player carrying the max level. */
  contributorId: string;
}

// Per-position-group chemistry breakdown returned with the lineup.
export interface ChemistryBreakdownDTO {
  // Per-group chip list keyed by GK, DEF, MID and ATT.
  positionGroups: Record<string, SkillCoverageDTO[]>;
  // Per-skill max level across the lineup.
  maxSkillByType: Record<string, number>;
  // Share of elite skills, expressed from 0 to 100.
  coveragePercentage: number;
  // Optional spatial and player-link chemistry.
  tacticalChemistry?: TacticalChemistryDTO | null;
}

export interface TacticalChemistryDTO {
  score: number;
  lineScores: Record<string, number>;
  channelScores: Record<string, number>;
  links: TacticalChemistryLinkDTO[];
  warnings: string[];
}

export interface TacticalChemistryLinkDTO {
  fromPlayerId: string;
  toPlayerId: string;
  type: string;
  score: number;
  distance: number;
  note: string;
}

// Chemistry preview details for the current lineup draft.
export interface ChemistryDetailDTO {
  score: number;
  breakdown: ChemistryBreakdownDTO;
  maxSkillByType: Record<string, number>;
  coveragePercentage: number;
}

// Response shape for current, auto-selected and manually selected lineups.
export interface LineupDTO {
  formation: string;
  players: PlayerLineupDTO[];
  confirmed: boolean;
  warnings?: LineupWarningDTO[];
  slots?: LineupSlotDTO[];
  // Team chemistry score in [0, 99].
  chemistryScore?: number;
  // Optional per-position-group chemistry breakdown.
  chemistryBreakdown?: ChemistryBreakdownDTO;
  // Optional tactical position effectiveness.
  formationEffectiveness?: FormationEffectivenessDTO;
}

