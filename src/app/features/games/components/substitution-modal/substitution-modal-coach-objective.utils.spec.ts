import {
  inferSubstitutionCoachObjective,
  recommendedSubstitutionText,
  substitutionCoachObjectiveClass,
  substitutionCoachObjectiveLabel,
  substitutionCoachObjectiveText
} from './substitution-modal-coach-objective.utils';

describe('substitution modal coach objective utils', () => {
  it('infers attack, protect and neutral objectives from score context', () => {
    expect(inferSubstitutionCoachObjective({
      currentMinute: 60,
      score: { home: 0, away: 1 },
      managerSide: 'HOME'
    })).toBe('NEED_GOAL');
    expect(inferSubstitutionCoachObjective({
      currentMinute: 70,
      score: { home: 2, away: 1 },
      managerSide: 'HOME'
    })).toBe('PROTECT_RESULT');
    expect(inferSubstitutionCoachObjective({
      currentMinute: 20,
      score: { home: 0, away: 0 },
      managerSide: 'HOME'
    })).toBe('NEUTRAL');
  });

  it('maps objective label and css class', () => {
    expect(substitutionCoachObjectiveLabel('NEED_GOAL')).toBe('Necesito gol');
    expect(substitutionCoachObjectiveClass('PROTECT_RESULT')).toBe('objective-protect');
  });

  it('explains the current objective', () => {
    expect(substitutionCoachObjectiveText({
      objective: 'NEED_GOAL',
      currentMinute: 80,
      score: { home: 1, away: 1 },
      managerSide: 'HOME'
    })).toContain('Empate avanzado');
  });

  it('builds recommendation text with readable Spanish characters', () => {
    expect(recommendedSubstitutionText(null, 'PROTECT_RESULT')).toContain('recomendación clara');
  });
});
