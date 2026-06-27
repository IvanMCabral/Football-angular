/**
 * V25D47 (Sprint C11a): tactical-position effectiveness returned by the
 * backend alongside {@link LineupDTO}. Mirrors the back's
 * {@code FormationEffectiveness} record + {@code FormationEffectivenessDTO}
 * mapper.
 *
 * <p>Shape:
 * <pre>
 *   {
 *     inferredFormation: "4-4-2",
 *     perPlayerEffectiveness: { "GK-1": 1.0, "S01-1": 0.85, ... },
 *     teamAverage: 0.94
 *   }
 * </pre>
 *
 * <p>{@code perPlayerEffectiveness} is keyed by subdivisionId (the same id
 * the {@link LineupSlotDTO} uses), so the frontend can correlate a player's
 * tactical slot with their effectiveness score without a join. Values are
 * in {@code [0, 1]}; 1.0 means the player is in their natural position,
 * lower means a positional mismatch penalty (CB in MID → 0.8, etc.).
 *
 * <p>{@code teamAverage} is the simple mean of {@code perPlayerEffectiveness}
 * values. Used by the chemistry preview to weight the projected score.
 *
 * <p><b>Backward compat:</b> the field is optional on {@link LineupDTO} for
 * legacy responses (pre-V25D47). When {@code formationEffectiveness} is
 * null/absent, the UI hides the formation-effectiveness row and falls back
 * to the unweighted chemistry preview.
 */
export interface FormationEffectivenessDTO {
  inferredFormation: string;
  perPlayerEffectiveness: Record<string, number>;
  teamAverage: number;
}

/**
 * Helper: classify an effectiveness value into a UI color band.
 * Used by the per-player marker and the team-average badge.
 *
 * @param effectiveness Value in [0, 1].
 * @returns 'green' | 'yellow' | 'red'
 *
 * <p>Thresholds (per C11b task spec):
 * <ul>
 *   <li>green  — {@code effectiveness >= 0.85}</li>
 *   <li>yellow — {@code 0.5 <= effectiveness < 0.85}</li>
 *   <li>red    — {@code effectiveness < 0.5}</li>
 * </ul>
 */
export function effectivenessColor(effectiveness: number): 'green' | 'yellow' | 'red' {
  if (effectiveness >= 0.85) { return 'green'; }
  if (effectiveness >= 0.5)  { return 'yellow'; }
  return 'red';
}