import { FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import { remapSquadEditorCurrentXiToFormation } from './squad-editor-modal-lineup-remap.utils';

function player(playerId: string, role: string, slotId = ''): PlayerOnFieldDto {
  return {
    playerId,
    name: playerId,
    position: role,
    role,
    overall: 70,
    slotId,
    stamina: 100,
    active: true,
    isEmpty: false,
  };
}

function position(index: number, role: string, subdivisionId: string): FormationPositionDTO {
  return {
    index,
    role,
    subdivisionId,
    xPercent: 50,
    yPercent: 50,
    actionRangePercent: 8,
  };
}

function family(role: string | undefined): string | null {
  if (!role) { return null; }
  if (role === 'GK') { return 'GK'; }
  if (['CB', 'LB', 'RB', 'DEF'].includes(role)) { return 'DEF'; }
  if (['CM', 'MID'].includes(role)) { return 'MID'; }
  if (['ST', 'LW', 'RW', 'ATT'].includes(role)) { return 'ATT'; }
  return null;
}

describe('squad-editor-modal-lineup-remap utils', () => {
  it('remaps the current XI into the new formation without promoting bench players', () => {
    const gk = player('gk', 'GK', 'OLD-GK');
    const cb = player('cb', 'CB', 'OLD-CB');
    const cm = player('cm', 'CM', 'OLD-CM');
    const st = player('st', 'ST', 'OLD-ST');
    const betterBench = player('bench-star', 'ST');
    const positions = [
      position(0, 'GK', 'GK-1'),
      position(1, 'CB', 'D1'),
      position(2, 'CM', 'M1'),
      position(3, 'ST', 'A1'),
    ];

    const result = remapSquadEditorCurrentXiToFormation({
      positions,
      currentXi: [gk, cb, cm, st],
      currentHomePlayers: [gk, cb, cm, st],
      currentBenchPlayers: [betterBench],
      isGoalkeeper: p => p.role === 'GK',
      canPlayerUseSlot: () => true,
      roleFamily: family,
    });

    expect(result.homePlayers.map(p => p.playerId)).toEqual(['gk', 'cb', 'cm', 'st']);
    expect(result.benchPlayers.map(p => p.playerId)).toEqual(['bench-star']);
    expect(result.slotPlayerMap['GK-1']).toBe(gk);
    expect(result.slotPlayerMap['D1']).toBe(cb);
    expect(result.slotPlayerMap['M1']).toBe(cm);
    expect(result.slotPlayerMap['A1']).toBe(st);
  });

  it('clears stale manual coordinates when assigning players to canonical slots', () => {
    const cm = { ...player('cm', 'CM', 'OLD'), xPercent: 12, yPercent: 34 };

    const result = remapSquadEditorCurrentXiToFormation({
      positions: [position(0, 'CM', 'M1')],
      currentXi: [cm],
      currentHomePlayers: [cm],
      currentBenchPlayers: [],
      isGoalkeeper: () => false,
      canPlayerUseSlot: () => true,
      roleFamily: family,
    });

    expect(result.homePlayers).toEqual([cm]);
    expect(cm.slotId).toBe('M1');
    expect(cm.xPercent).toBeUndefined();
    expect(cm.yPercent).toBeUndefined();
  });

  it('falls back to any legal slot when a role-family slot is unavailable', () => {
    const cb = player('cb', 'CB', 'OLD');
    const positions = [
      position(0, 'ST', 'A1'),
      position(1, 'CM', 'M1'),
    ];

    const result = remapSquadEditorCurrentXiToFormation({
      positions,
      currentXi: [cb],
      currentHomePlayers: [cb],
      currentBenchPlayers: [],
      isGoalkeeper: () => false,
      canPlayerUseSlot: (_player, slotId) => slotId !== 'A1',
      roleFamily: family,
    });

    expect(cb.slotId).toBe('M1');
    expect(result.slotPlayerMap['M1']).toBe(cb);
  });

  it('moves previous non-starters to bench and clears their placement', () => {
    const starter = player('starter', 'CM', 'OLD');
    const dropped = { ...player('dropped', 'ST', 'OLD2'), xPercent: 70, yPercent: 20 };

    const result = remapSquadEditorCurrentXiToFormation({
      positions: [position(0, 'CM', 'M1')],
      currentXi: [starter],
      currentHomePlayers: [starter, dropped],
      currentBenchPlayers: [],
      isGoalkeeper: () => false,
      canPlayerUseSlot: () => true,
      roleFamily: family,
    });

    expect(result.homePlayers).toEqual([starter]);
    expect(result.benchPlayers).toEqual([dropped]);
    expect(dropped.slotId).toBe('');
    expect(dropped.xPercent).toBeUndefined();
    expect(dropped.yPercent).toBeUndefined();
  });

  it('uses global role scoring so an eligible midfielder gets CM before a striker', () => {
    const gk = player('gk', 'GK', 'OLD-GK');
    const striker = player('striker', 'ST', 'OLD-ST');
    const midfielder = player('midfielder', 'CM', 'OLD-CM');
    const result = remapSquadEditorCurrentXiToFormation({
      positions: [position(0, 'GK', 'GK-1'), position(1, 'CM', 'M1'), position(2, 'ST', 'A1')],
      currentXi: [gk, striker, midfielder],
      currentHomePlayers: [gk, striker, midfielder],
      currentBenchPlayers: [],
      isGoalkeeper: p => p.role === 'GK',
      canPlayerUseSlot: (p, slotId) => slotId === 'GK-1' ? p.role === 'GK' : p.role !== 'GK',
      roleFamily: family,
    });

    expect(result.slotPlayerMap['GK-1']?.playerId).toBe('gk');
    expect(result.slotPlayerMap['M1']?.playerId).toBe('midfielder');
    expect(result.slotPlayerMap['A1']?.playerId).toBe('striker');
    expect(new Set(result.homePlayers.map(p => p.playerId)).size).toBe(3);
  });

  it('keeps the goalkeeper in the only goalkeeper slot even when the input order changes', () => {
    const gk = player('gk', 'GK', 'OLD-GK');
    const defender = player('defender', 'CB', 'OLD-DEF');
    const result = remapSquadEditorCurrentXiToFormation({
      positions: [position(0, 'CB', 'D1'), position(1, 'GK', 'GK-1')],
      currentXi: [defender, gk],
      currentHomePlayers: [defender, gk],
      currentBenchPlayers: [],
      isGoalkeeper: p => p.role === 'GK',
      canPlayerUseSlot: (p, slotId) => slotId === 'GK-1' ? p.role === 'GK' : p.role !== 'GK',
      roleFamily: family,
    });

    expect(result.slotPlayerMap['GK-1']?.playerId).toBe('gk');
    expect(result.slotPlayerMap['D1']?.playerId).toBe('defender');
  });
});
