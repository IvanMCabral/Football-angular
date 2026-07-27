import { FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import {
  PlayerRoleFamily,
  getRoleFamily,
} from '../../shared/utils/player-role-utils';
import { ALL_FORMATIONS, USER_FORMATION_LABEL } from '../../shared/constants/formations';

export interface SquadEditorRoleFamilyCounts {
  gk: number;
  def: number;
  mid: number;
  att: number;
}

export interface SquadEditorFormationDetectionResult {
  label: string;
  isCustomLineup: boolean;
}

export function tacticalRoleFitsPlayerRole(
  playerRole: string | undefined,
  tacticalRole: string | undefined,
): boolean {
  const player = String(playerRole ?? '').trim().toUpperCase();
  const role = String(tacticalRole ?? '').trim().toUpperCase();
  if (!player || !role) { return false; }
  if (player === role) { return true; }

  const fitGroups: Record<string, string[]> = {
    GK: ['GK'],
    CB: ['CB', 'DEF'],
    LB: ['LB', 'LWB', 'DEF'],
    RB: ['RB', 'RWB', 'DEF'],
    LWB: ['LWB', 'LB', 'LM', 'LW', 'WINGER'],
    RWB: ['RWB', 'RB', 'RM', 'RW', 'WINGER'],
    CDM: ['CDM', 'DM', 'CM', 'MID'],
    CM: ['CM', 'CDM', 'DM', 'CAM', 'MID'],
    CAM: ['CAM', 'AM', 'CM', 'CF', 'MID'],
    LM: ['LM', 'LW', 'LWB', 'WINGER', 'MID'],
    RM: ['RM', 'RW', 'RWB', 'WINGER', 'MID'],
    LW: ['LW', 'LM', 'WINGER'],
    RW: ['RW', 'RM', 'WINGER'],
    CF: ['CF', 'ST', 'CAM', 'ATT'],
    ST: ['ST', 'CF', 'ATT'],
  };

  if (fitGroups[role]) {
    return fitGroups[role].includes(player);
  }

  const playerFamily = getRoleFamily(player);
  const roleFamily = getRoleFamily(role);
  return playerFamily !== null && playerFamily === roleFamily;
}

export function isSquadEditorTacticalRoleMismatch(
  playerRole: string | undefined,
  tacticalRole: string | undefined,
  actualZone?: PlayerRoleFamily | null,
): boolean {
  if (!playerRole || !tacticalRole) { return false; }
  if (tacticalRoleFitsPlayerRole(playerRole, tacticalRole)) { return false; }

  const playerFamily = getRoleFamily(playerRole);
  const recommendedFamily = getRoleFamily(tacticalRole);
  if (playerFamily === null || recommendedFamily === null) { return false; }
  if (actualZone && playerFamily !== actualZone) { return true; }
  return playerFamily !== recommendedFamily;
}

export function countSquadEditorRoleFamilies(
  families: readonly (PlayerRoleFamily | null)[],
): SquadEditorRoleFamilyCounts {
  return families.reduce<SquadEditorRoleFamilyCounts>((counts, family) => {
    if (family === 'GK') { counts.gk++; }
    if (family === 'DEF') { counts.def++; }
    if (family === 'MID') { counts.mid++; }
    if (family === 'ATT') { counts.att++; }
    return counts;
  }, { gk: 0, def: 0, mid: 0, att: 0 });
}

export function countSquadEditorFormationRoleFamilies(
  positions: readonly FormationPositionDTO[],
): SquadEditorRoleFamilyCounts {
  return countSquadEditorRoleFamilies(positions.map(pos => getRoleFamily(pos.role)));
}

export function detectSquadEditorFormationFromFamilies(
  lineupFamilies: readonly (PlayerRoleFamily | null)[],
  formationPositions: Record<string, readonly FormationPositionDTO[]>,
  formations: readonly string[] = ALL_FORMATIONS,
): SquadEditorFormationDetectionResult {
  if (lineupFamilies.length < 11) {
    return { label: USER_FORMATION_LABEL, isCustomLineup: true };
  }

  const lineupCounts = countSquadEditorRoleFamilies(lineupFamilies);

  for (const formation of formations) {
    const canonicalPositions = formationPositions[formation] ?? [];
    const canonicalCounts = countSquadEditorFormationRoleFamilies(canonicalPositions);

    if (sameSquadEditorRoleFamilyCounts(lineupCounts, canonicalCounts)) {
      return { label: formation, isCustomLineup: false };
    }
  }

  return { label: USER_FORMATION_LABEL, isCustomLineup: true };
}

function sameSquadEditorRoleFamilyCounts(
  a: SquadEditorRoleFamilyCounts,
  b: SquadEditorRoleFamilyCounts,
): boolean {
  return a.gk === b.gk && a.def === b.def && a.mid === b.mid && a.att === b.att;
}
