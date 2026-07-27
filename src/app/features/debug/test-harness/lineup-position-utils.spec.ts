import {
  buildLineupSlots,
  canonicalXPercent,
  canonicalYPercent,
  countCustomMovableSlots,
  fallbackYForPosition,
  lineupPlayerIdsFromSlots,
  matchContextXPercent,
  matchContextYPercent,
  positionPixelLine,
  strictPositionPixelLine,
  swapLineupSlot,
} from './lineup-position-utils';
import { LineupDTO, PlayerLineupDTO } from '../../../shared/models/lineup/lineup.dto';
import { LineupSlotDTO } from '../../../shared/models/lineup/lineup-slot.dto';

const slot = (playerId: string, subdivisionId: string, customXPercent?: number, customYPercent?: number): LineupSlotDTO => ({
  playerId,
  subdivisionId,
  customXPercent,
  customYPercent,
});

const player = (playerId: string, name: string, position: string): PlayerLineupDTO => ({
  playerId,
  name,
  position,
  overall: 75,
  energy: 100,
  injured: false,
  age: 25,
});

describe('lineup-position-utils', () => {
  it('classifies tactical lines while keeping goalkeepers out of movable lines', () => {
    expect(positionPixelLine('GK')).toBeNull();
    expect(positionPixelLine('CB')).toBe('DEF');
    expect(positionPixelLine('CM')).toBe('MID');
    expect(positionPixelLine('ST')).toBe('ATT');
    expect(positionPixelLine('unknown-role')).toBe('MID');
    expect(strictPositionPixelLine('unknown-role')).toBeNull();
  });

  it('calculates fallback Y by natural role', () => {
    expect(fallbackYForPosition('GK')).toBe(94);
    expect(fallbackYForPosition('DEF')).toBe(78);
    expect(fallbackYForPosition('WINGER')).toBe(18);
    expect(fallbackYForPosition('CM')).toBe(52);
  });

  it('prefers custom match coordinates before subdivision coordinates', () => {
    expect(matchContextXPercent(slot('p1', 'S1-1', 42, 77))).toBe(42);
    expect(matchContextYPercent(slot('p1', 'S1-1', 42, 77))).toBe(77);
  });

  it('uses canonical formation coordinates before subdivision fallback', () => {
    const formationPosition = {
      subdivisionId: 'S1-1',
      xPercent: 12,
      yPercent: 34,
      position: 'MID',
      index: 1,
      role: 'MID',
      actionRangePercent: 10,
    };

    expect(canonicalXPercent(slot('p1', 'S1-1'), formationPosition)).toBe(12);
    expect(canonicalYPercent(slot('p1', 'S1-1'), formationPosition)).toBe(34);
    expect(canonicalYPercent(slot('gk', 'GK-1'), null)).toBe(93);
  });

  it('builds lineup slots in player order and ignores incomplete slots', () => {
    const lineup: LineupDTO = {
      formation: '4-4-2',
      confirmed: false,
      players: [
        player('p2', 'B', 'MID'),
        player('p1', 'A', 'DEF'),
      ],
      slots: [
        slot('p1', 'S1-1'),
        slot('p2', 'S2-2'),
        { playerId: 'p3' } as LineupSlotDTO,
      ],
    };

    expect(lineupPlayerIdsFromSlots(buildLineupSlots(lineup))).toEqual(['p2', 'p1']);
  });

  it('counts custom movable slots excluding goalkeepers', () => {
    const lineup: LineupDTO = {
      formation: '4-4-2',
      confirmed: false,
      players: [
        player('gk', 'GK', 'GK'),
        player('mid', 'MID', 'MID'),
      ],
      slots: [
        slot('gk', 'GK-1', 50, 94),
        slot('mid', 'S2-2', 52, undefined),
      ],
    };

    expect(countCustomMovableSlots(lineup)).toBe(1);
  });

  it('swaps a starter id without mutating unrelated slots', () => {
    const slots = [slot('starter', 'S1-1'), slot('other', 'S1-2')];

    expect(swapLineupSlot(slots, 'starter', 'bench')).toEqual([
      slot('bench', 'S1-1'),
      slot('other', 'S1-2'),
    ]);
    expect(slots[0].playerId).toBe('starter');
  });
});
