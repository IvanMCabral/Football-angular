import {
  applyPendingSubstitutionsToStartingXi,
  basePercentForSubstitutionVisualSlot,
  buildSubstitutionLiveFormationSlots
} from './substitution-modal-live-slots.utils';
import { SubModalPlayer } from '../../../../core/services/match-engine.model';

const player = (
  id: string,
  position: string,
  displayName = id,
  isStarter = true
): SubModalPlayer => ({
  sessionPlayerId: id,
  displayName,
  position,
  rating: 70,
  isStarter
});

describe('substitution modal live slots utils', () => {
  it('replaces outgoing starters with incoming bench players', () => {
    const result = applyPendingSubstitutionsToStartingXi(
      [player('gk', 'GK'), player('st', 'ATT')],
      [player('bench-st', 'ATT', 'Bench ST', false)],
      [{ playerOffId: 'st', playerOnId: 'bench-st' }]
    );

    expect(result.map(p => p.sessionPlayerId)).toEqual(['gk', 'bench-st']);
    expect(result[1].isStarter).toBeTrue();
  });

  it('calculates stable visual base percentages by line and player index', () => {
    expect(basePercentForSubstitutionVisualSlot(1, 1, 3, 4)).toEqual({ x: 50, y: 40 });
  });

  it('builds backend slots with pixel tweaks carried to incoming player', () => {
    const slots = buildSubstitutionLiveFormationSlots({
      startingXi: [player('gk', 'GK'), player('def', 'DEF'), player('mid', 'MID'), player('att', 'ATT')],
      bench: [player('bench-att', 'ATT', 'Bench ATT', false)],
      changes: [{ playerOffId: 'att', playerOnId: 'bench-att' }],
      positionTweaks: new Map([['att', { x: 10, y: -5 }]])
    });

    const incomingSlot = slots.find(s => s.sessionPlayerId === 'bench-att');
    expect(incomingSlot).toBeTruthy();
    expect(incomingSlot?.customXPercent).not.toBeNull();
    expect(incomingSlot?.customYPercent).not.toBeNull();
  });
});
