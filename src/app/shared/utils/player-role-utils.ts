export type PlayerRoleFamily = 'GK' | 'DEF' | 'MID' | 'ATT';

const DEF_ROLES = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'];
const MID_ROLES = ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'];
const ATT_ROLES = ['ST', 'LW', 'RW', 'CF', 'ATT', 'WINGER'];

export function getRoleFamily(role: string | undefined | null): PlayerRoleFamily | null {
  const normalized = String(role ?? '').trim().toUpperCase();
  if (normalized === 'GK') { return 'GK'; }
  if (DEF_ROLES.includes(normalized)) { return 'DEF'; }
  if (MID_ROLES.includes(normalized)) { return 'MID'; }
  if (ATT_ROLES.includes(normalized)) { return 'ATT'; }
  return null;
}

export function rolesMatch(playerRole: string | undefined, formationRole: string | undefined): boolean {
  if (!playerRole || !formationRole) { return false; }
  if (playerRole === formationRole) { return true; }
  const playerFamily = getRoleFamily(playerRole);
  const formationFamily = getRoleFamily(formationRole);
  return playerFamily !== null && playerFamily === formationFamily;
}

export function getMarkerRoleClasses(role: string | undefined): { [klass: string]: boolean } {
  const normalized = String(role ?? '').trim().toUpperCase();
  if (!normalized) { return {}; }
  return {
    'color-gk': normalized === 'GK',
    'color-def': DEF_ROLES.includes(normalized),
    'color-mid': MID_ROLES.includes(normalized),
    'color-att': ATT_ROLES.includes(normalized)
  };
}

export function countRoleFamily(roles: string[]): { gk: number; def: number; mid: number; att: number } {
  let gk = 0;
  let def = 0;
  let mid = 0;
  let att = 0;
  for (const role of roles) {
    const family = getRoleFamily(role);
    if (family === 'GK') { gk++; }
    else if (family === 'DEF') { def++; }
    else if (family === 'MID') { mid++; }
    else if (family === 'ATT') { att++; }
  }
  return { gk, def, mid, att };
}
