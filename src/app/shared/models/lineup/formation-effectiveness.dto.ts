// Tactical-position effectiveness returned alongside a lineup.
export interface FormationEffectivenessDTO {
  inferredFormation: string;
  perPlayerEffectiveness: Record<string, number>;
  teamAverage: number;
  // Per-zone team ratings. 100 is roughly the balanced baseline.
  attackRating?: number;
  midfieldRating?: number;
  defenseRating?: number;
}

// Classifies an effectiveness value into the UI color band.
export function effectivenessColor(effectiveness: number): 'green' | 'yellow' | 'red' {
  if (effectiveness >= 0.85) { return 'green'; }
  if (effectiveness >= 0.5)  { return 'yellow'; }
  return 'red';
}
