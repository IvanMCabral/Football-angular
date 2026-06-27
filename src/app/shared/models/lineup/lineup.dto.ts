import { LineupWarningDTO } from './lineup-warning.dto';
import { LineupSlotDTO } from './lineup-slot.dto';

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

/**
 * V25D43 (Sprint C8): one skill's contribution to a position group inside
 * the chemistry breakdown. Mirrors `ChemistryBreakdownDTO.SkillCoverageDTO`
 * on the backend.
 *
 * <p>A skill can appear in multiple position groups if it has non-zero
 * weight in those groups (e.g., AERIAL appears in both GK and DEF). Same
 * skill in different groups has the same {@link maxLevel} and
 * {@link contributorId}.
 */
export interface SkillCoverageDTO {
  /** {@link PlayerSkill} enum name, e.g., "WALL", "AERIAL". */
  skill: string;
  /** Max level of this skill across the lineup, {@code [0, 99]}. */
  maxLevel: number;
  /** {@code sessionPlayerId} of the player carrying the max level. */
  contributorId: string;
}

/**
 * V25D43 (Sprint C8): per-position-group chemistry breakdown returned
 * alongside {@link LineupDTO.chemistryScore}. Mirrors
 * `ChemistryBreakdownDTO` on the backend.
 *
 * <p>Group keys are the 4 {@code PositionGroup} values on the back:
 * {@code "GK" | "DEF" | "MID" | "ATT"}. The WINGER category from
 * {@code SessionPlayer.position} is folded into ATT — skills of
 * WINGER players (SPEEDSTER, DRIBBLER, SHOOTER) appear in the ATT row.
 *
 * <p>Each group is a list of {@link SkillCoverageDTO} for skills
 * <b>present</b> in the lineup (maxLevel &gt; 0). Empty groups mean
 * the lineup has no players with skills weighted to that group.
 */
export interface ChemistryBreakdownDTO {
  /**
   * Per-group chip list. Stable key order on the back: GK → DEF → MID → ATT
   * (matches {@code ChemistryDetail.PositionGroup.values()}).
   */
  positionGroups: Record<string, SkillCoverageDTO[]>;
  /**
   * Per-skill max level across the lineup. Always contains all 10
   * {@code PlayerSkill} keys (absent skills → 0), so the frontend can
   * index by skill name without null checks.
   */
  maxSkillByType: Record<string, number>;
  /**
   * {@code 0..100} — share of skills (out of 10) whose maxLevel is &ge; 80.
   * Same "elite" threshold as the V25D41 coverage bonus on the back.
   */
  coveragePercentage: number;
}

/**
 * V25D45 (Sprint C10): chemistry detail returned by
 * {@code POST /career/lineup/preview-chemistry}. Mirrors the back's
 * {@code ChemistryDetail} record (V25D43). Used by the SquadEditorModalComponent
 * to show the projected chemistry of an in-progress lineup (without persisting).
 *
 * <p>Shape:
 * <pre>
 *   {
 *     score: 82,
 *     breakdown: ChemistryBreakdownDTO,
 *     maxSkillByType: { WALL: 99, ... },
 *     coveragePercentage: 75
 *   }
 * </pre>
 *
 * <p>Same field set as the back record, deserialized 1:1 by Jackson.
 * The frontend uses this DTO to populate the live preview UI in the
 * SquadEditorModalComponent's header.
 */
export interface ChemistryDetailDTO {
  score: number;
  breakdown: ChemistryBreakdownDTO;
  maxSkillByType: Record<string, number>;
  coveragePercentage: number;
}

/**
 * V24D6U3 + MVP1-lineup-cancha-1 + V25D41 (C6) + V25D42 (C7) + V25D43 (C8):
 * Response shape of /career/lineup/{current, auto-select, manual-select}.
 *
 * <p>Backend returns:
 * <pre>
 *   { formation, players[], confirmed, warnings[], slots[],
 *     chemistryScore?, chemistryBreakdown? }
 * </pre>
 *
 * <p>{@code slots} (MVP1-lineup-cancha-1) lista las asignaciones
 * {@code playerId → subdivisionId} persistidas. Si está vacío o ausente,
 * el front debe inferir los slots del role del jugador (backward compat
 * con lineups previos al sprint).
 *
 * <p><b>V25D42 (Sprint C7):</b> {@code chemistryScore} (opcional, 0..99) es el
 * team chemistry score agregado del lineup (V25D41 back) — base = AVG de
 * overalls + skill_bonus (team-level MAX per skill) + coverage_bonus.
 * Opcional para backward compat con lineups creados antes de V25D41.
 *
 * <p><b>V25D43 (Sprint C8):</b> {@code chemistryBreakdown} (opcional) es el
 * desglose por position group de qué skills están presentes en el lineup
 * y a qué nivel. Cuando está presente, la UI renderiza una sección de
 * chips debajo del chemistry badge con WALL=99, AERIAL=99, etc. agrupados
 * por GK / DEF / MID / ATT. Nullable para backward compat con lineups
 * pre-V25D43.
 */
export interface LineupDTO {
  formation: string;
  players: PlayerLineupDTO[];
  confirmed: boolean;
  warnings?: LineupWarningDTO[];
  slots?: LineupSlotDTO[];
  /** V25D42: team chemistry score in [0, 99] (optional, nullable for backward compat). */
  chemistryScore?: number;
  /** V25D43: per-position-group chemistry breakdown (optional, nullable for backward compat). */
  chemistryBreakdown?: ChemistryBreakdownDTO;
}
