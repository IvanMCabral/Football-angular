import { buildRoundStartNavigationState, readRoundStartNavigationState } from './round-start-navigation-state';

describe('round start navigation state', () => {
  const status = {
    careerId: 'career-1',
    currentRound: 2,
    totalRounds: 10,
    userSessionTeamId: 'team-1',
    careerPhase: 'PRE_MATCH',
    season: 1
  };

  it('carries the already validated status for the matching live route', () => {
    const original = window.history.state;
    window.history.replaceState(buildRoundStartNavigationState(status, 3, 'career-1'), '', window.location.href);

    expect(readRoundStartNavigationState('career-1', 3)).toEqual({ ...status, currentRound: 3 });
    expect(readRoundStartNavigationState('career-1', 4)).toBeNull();

    window.history.replaceState(original, '', window.location.href);
  });
});
