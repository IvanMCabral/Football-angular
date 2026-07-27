import { PartidoDialogData } from '../../features/games/components/partido-modal/partido-modal.component';
import { LiveFormationSlot } from './match-engine.model';

export interface RememberedPartidoSlots {
  formation?: string;
  slots?: PartidoDialogData['currentSlots'];
}

export function parseRememberedPartidoSlots(closeResult: unknown): RememberedPartidoSlots {
  const result = closeResult as {
    success?: boolean;
    formation?: string | null;
    savedSlots?: Array<{
      sessionPlayerId?: string | null;
      playerId?: string | null;
      position?: string | null;
      slotIndex?: number | null;
      customXPercent?: number | null;
      customYPercent?: number | null;
    }> | null;
    result?: {
      success?: boolean;
      currentFormation?: LiveFormationSlot[] | null;
    };
  } | null;
  if (!result?.success || result.result?.success === false) return {};

  const sourceSlots = Array.isArray(result.savedSlots) && result.savedSlots.length
    ? result.savedSlots
    : result.result?.currentFormation;
  const slots = Array.isArray(sourceSlots) ? normalizePartidoSlots(sourceSlots) : undefined;
  const formation = typeof result.formation === 'string' && result.formation.trim()
    ? result.formation.trim()
    : undefined;

  return { formation, slots: slots && slots.length >= 10 ? slots : undefined };
}

export function overlayRememberedPartidoSlots(
  remembered: PartidoDialogData['currentSlots'] | undefined,
  currentSlots: PartidoDialogData['currentSlots']
): PartidoDialogData['currentSlots'] {
  if (!remembered || remembered.length < 10 || !currentSlots?.length) return currentSlots;
  if (remembered.length >= 11 && !hasCompletePartidoSlotSnapshot(currentSlots)) return remembered;

  const currentIds = new Set(currentSlots.map(slot => slot.sessionPlayerId).filter(Boolean));
  if (remembered.every(slot => currentIds.has(slot.sessionPlayerId))) return remembered;

  const rememberedByPlayerId = new Map(
    remembered
      .filter(slot => !!slot.sessionPlayerId)
      .map(slot => [slot.sessionPlayerId, slot])
  );

  return currentSlots.map(slot => {
    const rememberedSlot = rememberedByPlayerId.get(slot.sessionPlayerId);
    return rememberedSlot
      ? {
          ...slot,
          position: rememberedSlot.position || slot.position,
          customXPercent: rememberedSlot.customXPercent ?? slot.customXPercent,
          customYPercent: rememberedSlot.customYPercent ?? slot.customYPercent
        }
      : slot;
  });
}

function normalizePartidoSlots(sourceSlots: Array<{
  sessionPlayerId?: string | null;
  playerId?: string | null;
  position?: string | null;
  slotIndex?: number | null;
  customXPercent?: number | null;
  customYPercent?: number | null;
}>): PartidoDialogData['currentSlots'] {
  return sourceSlots
    .map((slot, index) => {
      const sessionPlayerId = slot.sessionPlayerId || slot.playerId || '';
      if (!sessionPlayerId) return null;

      return {
        sessionPlayerId,
        position: slot.position || 'MID',
        slotIndex: typeof slot.slotIndex === 'number' ? slot.slotIndex : index,
        customXPercent: finiteNumberOrNull(slot.customXPercent),
        customYPercent: finiteNumberOrNull(slot.customYPercent)
      };
    })
    .filter((slot): slot is NonNullable<typeof slot> => !!slot)
    .sort((a, b) => a.slotIndex - b.slotIndex);
}

function hasCompletePartidoSlotSnapshot(currentSlots: PartidoDialogData['currentSlots']): boolean {
  const playerIds = new Set<string>();
  const slotIndexes = new Set<number>();

  for (const [fallbackIndex, slot] of (currentSlots ?? []).entries()) {
    if (!slot.sessionPlayerId) return false;

    playerIds.add(slot.sessionPlayerId);
    const slotIndex = typeof slot.slotIndex === 'number' ? slot.slotIndex : fallbackIndex;
    if (slotIndex < 0 || slotIndex > 10) return false;
    slotIndexes.add(slotIndex);
  }

  return playerIds.size === 11
    && slotIndexes.size === 11
    && Array.from({ length: 11 }, (_, index) => index).every(index => slotIndexes.has(index));
}

function finiteNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
