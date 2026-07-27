import {
  playerSwapFitClass,
  playerSwapFitDetail,
  playerSwapFitLevel,
  playerSwapFitText,
  playerSwapProfile,
  playerSwapRoleRisk,
} from './player-swap-fit-utils';
import { PlayerSwapCandidate } from '../models/test-harness.model';

const lineFromPosition = (position: string | null | undefined): 'ATT' | 'MID' | 'DEF' | null => {
  const value = String(position ?? '').toUpperCase();
  if (['ATT', 'ST', 'CF', 'LW', 'RW', 'WINGER'].includes(value)) return 'ATT';
  if (['MID', 'CM', 'CAM', 'CDM', 'LM', 'RM'].includes(value)) return 'MID';
  if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(value)) return 'DEF';
  return null;
};

const candidate = (starterPosition: string, benchPosition: string): PlayerSwapCandidate => ({
  starterId: 'starter-1',
  starterName: 'Starter',
  starterPosition,
  benchId: 'bench-1',
  benchName: 'Bench',
  benchPosition,
  slotId: 'S1',
});

describe('player-swap-fit-utils', () => {
  it('classifies same-profile substitutions before same-line substitutions', () => {
    const fitLevel = playerSwapFitLevel(candidate('ST', 'CF'), lineFromPosition);

    expect(fitLevel).toBe('profile');
    expect(playerSwapFitText(fitLevel)).toBe('Same profile');
    expect(playerSwapFitClass(fitLevel)).toBe('delta-positive');
  });

  it('classifies same-line substitutions when profiles differ but tactical line is stable', () => {
    const fitLevel = playerSwapFitLevel(candidate('CM', 'CAM'), lineFromPosition);

    expect(fitLevel).toBe('line');
    expect(playerSwapFitText(fitLevel)).toBe('Same line');
    expect(playerSwapFitClass(fitLevel)).toBe('read-stable');
  });

  it('adds role-risk context when a midfielder is replaced by an attacker', () => {
    const risk = playerSwapRoleRisk(candidate('MID', 'ATT'), lineFromPosition);

    expect(risk.attack).toBeGreaterThan(0);
    expect(risk.control).toBeLessThan(0);
    expect(risk.protection).toBeLessThan(0);
    expect(risk.detail).toContain('mediocampista');
  });

  it('keeps neutral role risk when the replacement is profile-compatible', () => {
    const risk = playerSwapRoleRisk(candidate('LB', 'RB'), lineFromPosition);

    expect(risk).toEqual({ attack: 0, control: 0, protection: 0, detail: '' });
  });

  it('explains the tactical fit using profile and line reads', () => {
    expect(playerSwapProfile('WINGER', lineFromPosition)).toBe('WIDE');
    expect(playerSwapFitDetail(candidate('MID', 'ATT'), lineFromPosition))
      .toBe('Out of role: MID/CM/MID -> ATT/ST/ATT.');
  });
});
