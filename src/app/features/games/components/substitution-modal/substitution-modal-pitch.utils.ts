import { SubModalPlayer } from '../../../../core/services/match-engine.model';

export type SubstitutionPitchCategory = 'GK' | 'DEF' | 'MID' | 'WINGER' | 'ATT';

export interface SubstitutionPitchLine {
  category: SubstitutionPitchCategory;
  players: SubModalPlayer[];
}

export function buildSubstitutionPitchLines(players: SubModalPlayer[]): SubstitutionPitchLine[] {
  const linesByCategory: Record<SubstitutionPitchCategory, SubstitutionPitchLine> = {
    GK: { category: 'GK', players: [] },
    DEF: { category: 'DEF', players: [] },
    MID: { category: 'MID', players: [] },
    WINGER: { category: 'WINGER', players: [] },
    ATT: { category: 'ATT', players: [] }
  };

  for (const player of players) {
    linesByCategory[positionGroup(player.position)].players.push(player);
  }

  return (['GK', 'DEF', 'MID', 'WINGER', 'ATT'] as const)
    .map(category => linesByCategory[category])
    .filter(line => line.players.length > 0);
}

export function positionGroup(position: string): SubstitutionPitchCategory {
  const normalized = (position || 'MID').toUpperCase();
  if (normalized === 'GK' || normalized.startsWith('GK')) return 'GK';
  if (['DEF', 'D', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(normalized)) return 'DEF';
  if (['WINGER', 'W', 'LW', 'RW', 'LWF', 'RWF'].includes(normalized)) return 'WINGER';
  if (['ATT', 'A', 'ST', 'CF', 'FW', 'LF', 'RF'].includes(normalized)) return 'ATT';
  return 'MID';
}

export function positionProfile(position: string): string {
  const normalized = (position || 'MID').toUpperCase();
  if (normalized === 'GK' || normalized.startsWith('GK')) return 'GK';
  if (normalized === 'CB' || normalized === 'DEF') return 'CB';
  if (['LB', 'RB', 'LWB', 'RWB'].includes(normalized)) return 'FB';
  if (['LW', 'RW', 'WINGER', 'LWF', 'RWF'].includes(normalized)) return 'WIDE';
  if (['ST', 'CF', 'FW', 'ATT'].includes(normalized)) return 'ST';
  if (normalized === 'CAM' || normalized === 'AM') return 'AM';
  if (normalized === 'CDM' || normalized === 'DM') return 'DM';
  return 'CM';
}

export function attackIntent(player: SubModalPlayer): number {
  switch (positionGroup(player.position)) {
    case 'ATT': return 3;
    case 'WINGER': return 2.6;
    case 'MID': return 1.5;
    case 'DEF': return 0.4;
    default: return 0;
  }
}

export function protectIntent(player: SubModalPlayer): number {
  switch (positionGroup(player.position)) {
    case 'DEF': return 3;
    case 'MID': return 2.2;
    case 'WINGER': return 1.1;
    case 'ATT': return 0.3;
    default: return 0;
  }
}

export function balancedIntent(player: SubModalPlayer): number {
  const group = positionGroup(player.position);
  return group === 'MID' ? 2 : group === 'DEF' || group === 'ATT' ? 1.4 : 1.2;
}
