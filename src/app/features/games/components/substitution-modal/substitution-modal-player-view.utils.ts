import { SubModalPlayer } from '../../../../core/services/match-engine.model';

export type SubstitutionEffectivenessClass = 'eff-good' | 'eff-warning' | 'eff-bad' | null;

export function isSubstitutionGoalkeeper(player: SubModalPlayer): boolean {
  return (player.position || '').toUpperCase().startsWith('GK');
}

export function substitutionEffectivenessClass(
  effectivenessMap: Record<string, number> | undefined,
  sessionPlayerId: string
): SubstitutionEffectivenessClass {
  const value = effectivenessMap?.[sessionPlayerId];
  if (value == null) {
    return null;
  }
  if (value >= 0.9) {
    return 'eff-good';
  }
  if (value >= 0.7) {
    return 'eff-warning';
  }
  return 'eff-bad';
}

export function substitutionEffectivenessBadge(
  effectivenessMap: Record<string, number> | undefined,
  sessionPlayerId: string
): string | null {
  const value = effectivenessMap?.[sessionPlayerId];
  return value == null ? null : `${Math.round(value * 100)}%`;
}
