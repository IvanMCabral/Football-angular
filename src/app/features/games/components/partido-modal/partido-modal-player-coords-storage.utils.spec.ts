import {
  partidoPlayerCoordsStorageKey,
  readPartidoPlayerCoords,
  sanitizePartidoPlayerCoords,
  writePartidoPlayerCoords
} from './partido-modal-player-coords-storage.utils';

describe('partido-modal-player-coords-storage utils', () => {
  it('builds a per-match storage key', () => {
    expect(partidoPlayerCoordsStorageKey('m1')).toBe('manager:partido-player-coords:m1');
  });

  it('sanitizes and clamps remembered coordinates', () => {
    expect(sanitizePartidoPlayerCoords({
      p1: { x: 120, y: -10 },
      p2: { x: 40, y: 60 },
      bad: { x: 'x', y: 20 }
    })).toEqual({
      p1: { x: 100, y: 0 },
      p2: { x: 40, y: 60 }
    });
  });

  it('reads and writes storage defensively', () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => map.set(key, value)
    };

    writePartidoPlayerCoords(storage, 'm1', { p1: { x: 10, y: 20 } });

    expect(readPartidoPlayerCoords(storage, 'm1')).toEqual({ p1: { x: 10, y: 20 } });
    expect(readPartidoPlayerCoords({ getItem: () => '{bad-json' }, 'm1')).toEqual({});
  });
});

