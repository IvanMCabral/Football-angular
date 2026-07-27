import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import {
  applySquadEditorSlotDropMutation,
  assignSquadEditorBenchPlayerToSlot,
  clearSquadEditorPlayerPlacement,
  moveSquadEditorPlayerToBench,
  placeSquadEditorPlayerInSlot,
  SquadEditorSlotPlayerMap,
} from './squad-editor-modal-lineup-mutation.utils';

function player(playerId: string, slotId = ''): PlayerOnFieldDto {
  return {
    playerId,
    name: playerId,
    position: 'CM',
    role: 'CM',
    overall: 70,
    slotId,
    stamina: 100,
    active: true,
    isEmpty: false,
  };
}

describe('squad-editor-modal-lineup-mutation utils', () => {
  it('clears custom coordinates when a player leaves a placement', () => {
    const p = { ...player('p1', 'S1'), xPercent: 44, yPercent: 55 };

    clearSquadEditorPlayerPlacement(p);

    expect(p.slotId).toBe('');
    expect(p.xPercent).toBeUndefined();
    expect(p.yPercent).toBeUndefined();
  });

  it('places a player in a slot and removes stale custom coordinates', () => {
    const p = { ...player('p1'), xPercent: 44, yPercent: 55 };
    const slotPlayerMap: SquadEditorSlotPlayerMap = {};

    placeSquadEditorPlayerInSlot(p, 'S2', slotPlayerMap);

    expect(p.slotId).toBe('S2');
    expect(p.xPercent).toBeUndefined();
    expect(p.yPercent).toBeUndefined();
    expect(slotPlayerMap['S2']).toBe(p);
  });

  it('assigns a bench player to an empty slot', () => {
    const starter = player('starter', 'S1');
    const bench = player('bench');

    const result = assignSquadEditorBenchPlayerToSlot({
      player: bench,
      targetSlotId: 'S2',
      state: {
        homePlayers: [starter],
        benchPlayers: [bench],
        slotPlayerMap: { S1: starter },
      },
    });

    expect(bench.slotId).toBe('S2');
    expect(result.slotPlayerMap['S2']).toBe(bench);
    expect(result.homePlayers.map(p => p.playerId)).toEqual(['starter', 'bench']);
    expect(result.benchPlayers).toEqual([]);
  });

  it('moves a replaced slot occupant to the bench', () => {
    const oldStarter = player('old', 'S1');
    const newStarter = player('new');

    const result = assignSquadEditorBenchPlayerToSlot({
      player: newStarter,
      targetSlotId: 'S1',
      state: {
        homePlayers: [oldStarter],
        benchPlayers: [newStarter],
        slotPlayerMap: { S1: oldStarter },
      },
    });

    expect(oldStarter.slotId).toBe('');
    expect(newStarter.slotId).toBe('S1');
    expect(result.homePlayers.map(p => p.playerId)).toEqual(['new']);
    expect(result.benchPlayers.map(p => p.playerId)).toEqual(['old']);
  });

  it('swaps two occupied slots during a field slot drop', () => {
    const moved = player('moved', 'S1');
    const occupant = player('occupant', 'S2');

    const result = applySquadEditorSlotDropMutation({
      player: moved,
      sourceSlotId: 'S1',
      targetSlotId: 'S2',
      occupant,
      state: {
        homePlayers: [moved, occupant],
        benchPlayers: [],
        slotPlayerMap: { S1: moved, S2: occupant },
      },
    });

    expect(moved.slotId).toBe('S2');
    expect(occupant.slotId).toBe('S1');
    expect(result.slotPlayerMap['S2']).toBe(moved);
    expect(result.slotPlayerMap['S1']).toBe(occupant);
    expect(result.homePlayers.map(p => p.playerId)).toEqual(['moved', 'occupant']);
  });

  it('moves a player from the field to the bench once', () => {
    const starter = player('starter', 'S1');
    const existingBench = player('bench');

    const result = moveSquadEditorPlayerToBench({
      player: starter,
      state: {
        homePlayers: [starter],
        benchPlayers: [existingBench],
        slotPlayerMap: { S1: starter },
      },
    });

    expect(starter.slotId).toBe('');
    expect(result.slotPlayerMap['S1']).toBeUndefined();
    expect(result.homePlayers).toEqual([]);
    expect(result.benchPlayers.map(p => p.playerId)).toEqual(['bench', 'starter']);
  });
});
