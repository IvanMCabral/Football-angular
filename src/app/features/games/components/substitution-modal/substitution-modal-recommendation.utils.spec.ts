import { SubModalPlayer } from '../../../../core/services/match-engine.model';
import { scoreRecommendedSubstitution } from './substitution-modal-recommendation.utils';

function player(id: string, position: string, rating = 70): SubModalPlayer {
  return {
    sessionPlayerId: id,
    displayName: id,
    position,
    rating,
    isStarter: true
  };
}

describe('substitution-modal-recommendation utils', () => {
  it('prioritizes medical replacements above normal tactical scoring', () => {
    const rec = scoreRecommendedSubstitution({
      playerOff: player('injured-striker', 'ST', 80),
      playerOn: player('bench-winger', 'RW', 72),
      kind: 'medical',
      coachObjective: 'NEUTRAL',
      isActiveInjuredStarter: () => true
    });

    expect(rec.kind).toBe('medical');
    expect(rec.score).toBeGreaterThan(90);
    expect(rec.reason).toContain('Prioridad médica');
  });

  it('values attacking substitutes when the team needs a goal', () => {
    const striker = scoreRecommendedSubstitution({
      playerOff: player('mid', 'CM', 70),
      playerOn: player('striker', 'ST', 70),
      coachObjective: 'NEED_GOAL',
      isActiveInjuredStarter: () => false
    });
    const defender = scoreRecommendedSubstitution({
      playerOff: player('mid', 'CM', 70),
      playerOn: player('def', 'CB', 70),
      coachObjective: 'NEED_GOAL',
      isActiveInjuredStarter: () => false
    });

    expect(striker.score).toBeGreaterThan(defender.score);
  });

  it('values defensive substitutes when protecting a result', () => {
    const defender = scoreRecommendedSubstitution({
      playerOff: player('wing', 'RW', 70),
      playerOn: player('def', 'CB', 70),
      coachObjective: 'PROTECT_RESULT',
      isActiveInjuredStarter: () => false
    });
    const striker = scoreRecommendedSubstitution({
      playerOff: player('wing', 'RW', 70),
      playerOn: player('st', 'ST', 70),
      coachObjective: 'PROTECT_RESULT',
      isActiveInjuredStarter: () => false
    });

    expect(defender.score).toBeGreaterThan(striker.score);
  });
});

