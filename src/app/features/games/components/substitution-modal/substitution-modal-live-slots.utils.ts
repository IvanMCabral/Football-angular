import { SubModalPlayer } from '../../../../core/services/match-engine.model';
import { clampFieldPercentRounded } from '../../../../shared/utils/field-percent.utils';
import { buildSubstitutionPitchLines } from './substitution-modal-pitch.utils';

export interface SubstitutionPendingChange {
  playerOffId: string;
  playerOnId: string;
  playerOffName?: string;
  playerOnName?: string;
}

export interface SubstitutionPositionTweak {
  x: number;
  y: number;
}

export interface SubstitutionLiveFormationSlot {
  sessionPlayerId: string;
  position: string;
  slotIndex: number;
  customXPercent?: number | null;
  customYPercent?: number | null;
}

export function applyPendingSubstitutionsToStartingXi(
  startingXi: SubModalPlayer[],
  bench: SubModalPlayer[],
  changes: SubstitutionPendingChange[]
): SubModalPlayer[] {
  if (changes.length === 0) {
    return startingXi;
  }

  return startingXi.map(starter => {
    const change = changes.find(c => c.playerOffId === starter.sessionPlayerId);
    const benchPlayer = change ? bench.find(p => p.sessionPlayerId === change.playerOnId) : null;
    return benchPlayer ? { ...benchPlayer, isStarter: true } : starter;
  });
}

export function buildSubstitutionLiveFormationSlots(params: {
  startingXi: SubModalPlayer[];
  bench: SubModalPlayer[];
  changes: SubstitutionPendingChange[];
  positionTweaks: ReadonlyMap<string, SubstitutionPositionTweak>;
}): SubstitutionLiveFormationSlot[] {
  const finalXi = applyPendingSubstitutionsToStartingXi(params.startingXi, params.bench, params.changes);
  const visibleLines = buildSubstitutionPitchLines(finalXi);
  const slots: SubstitutionLiveFormationSlot[] = [];
  let slotIndex = 0;

  visibleLines.forEach((line, lineIndex) => {
    line.players.forEach((player, playerIndex) => {
      const base = basePercentForSubstitutionVisualSlot(
        lineIndex,
        playerIndex,
        line.players.length,
        visibleLines.length
      );
      const incomingChange = params.changes.find(change => change.playerOnId === player.sessionPlayerId);
      const tweak = params.positionTweaks.get(player.sessionPlayerId)
        ?? (incomingChange ? params.positionTweaks.get(incomingChange.playerOffId) : undefined);

      slots.push({
        sessionPlayerId: player.sessionPlayerId,
        position: player.position || line.category,
        slotIndex,
        customXPercent: tweak ? applyPixelTweakToPercent(base.x, tweak.x) : null,
        customYPercent: tweak ? applyPixelTweakToPercent(base.y, tweak.y) : null
      });
      slotIndex++;
    });
  });

  return slots;
}

export function basePercentForSubstitutionVisualSlot(
  lineIndex: number,
  playerIndex: number,
  playersInLine: number,
  linesCount: number
): { x: number; y: number } {
  const x = ((playerIndex + 1) / (playersInLine + 1)) * 100;
  const y = ((lineIndex + 1) / (linesCount + 1)) * 100;
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
}

function applyPixelTweakToPercent(base: number, pixels: number): number {
  const percentPerPixel = 0.12;
  const value = Number.isFinite(base + pixels * percentPerPixel)
    ? base + pixels * percentPerPixel
    : 50;
  return clampFieldPercentRounded(value);
}
