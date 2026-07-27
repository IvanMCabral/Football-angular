import { clampFieldPercent } from '../../../../shared/utils/field-percent.utils';

export interface PartidoPlayerCoords {
  x: number;
  y: number;
}

export type PartidoPlayerCoordsById = Record<string, PartidoPlayerCoords>;

export function partidoPlayerCoordsStorageKey(matchId: string): string {
  return `manager:partido-player-coords:${matchId}`;
}

export function readPartidoPlayerCoords(
  storage: Pick<Storage, 'getItem'>,
  matchId: string
): PartidoPlayerCoordsById {
  try {
    const raw = storage.getItem(partidoPlayerCoordsStorageKey(matchId));
    if (!raw) {
      return {};
    }
    return sanitizePartidoPlayerCoords(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writePartidoPlayerCoords(
  storage: Pick<Storage, 'setItem'>,
  matchId: string,
  coordsByPlayerId: PartidoPlayerCoordsById
): void {
  storage.setItem(partidoPlayerCoordsStorageKey(matchId), JSON.stringify(coordsByPlayerId));
}

export function sanitizePartidoPlayerCoords(input: unknown): PartidoPlayerCoordsById {
  const clean: PartidoPlayerCoordsById = {};
  if (!input || typeof input !== 'object') {
    return clean;
  }

  for (const [playerId, coords] of Object.entries(input as Record<string, Partial<PartidoPlayerCoords>>)) {
    if (isFinitePercent(coords?.x) && isFinitePercent(coords?.y)) {
      clean[playerId] = {
        x: clampPartidoPercent(coords.x),
        y: clampPartidoPercent(coords.y)
      };
    }
  }

  return clean;
}

export function clampPartidoPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return clampFieldPercent(value);
}

export function isFinitePercent(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

