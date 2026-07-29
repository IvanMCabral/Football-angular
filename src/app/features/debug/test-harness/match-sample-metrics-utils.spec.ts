import {
  currentLineupSampleMetrics,
  isShotLikeEvent,
  summarizeShotZones,
} from './match-sample-metrics-utils';
import { MatchDetail, MatchEvent } from '../../match-detail/models/match-detail.model';
import { MatchFixture } from '../models/test-harness.model';

const event = (
  teamId: string,
  type: MatchEvent['type'],
  xg: number | null,
  location?: NonNullable<MatchEvent['shotCoordinate']>['location']
): MatchEvent => ({
  minute: 10,
  type,
  teamId,
  xg,
  description: '',
  playerId: 'p1',
  playerName: 'Player',
  shotCoordinate: location
    ? { x: 50, y: 50, location, distanceToGoal: 20, angleToGoal: 30, insideBox: location !== 'OUTSIDE_BOX' && location !== 'LONG_RANGE' }
    : undefined,
});

const detail = (timeline: MatchEvent[]): MatchDetail => ({
  matchId: 'm1',
  careerId: 'c1',
  seasonNumber: 1,
  round: 1,
  homeTeamId: 'home',
  awayTeamId: 'away',
  homeTeamName: 'Home',
  awayTeamName: 'Away',
  homeGoals: 0,
  awayGoals: 0,
  homeXg: 1.4,
  awayXg: 0.7,
  homeShots: 10,
  awayShots: 6,
  homePossession: 58,
  awayPossession: 42,
  timeline,
  playerRatings: [],
  schemaVersion: 'test',
  engineType: 'test',
  createdAt: '2026-07-27T00:00:00.000Z',
});

describe('match-sample-metrics-utils', () => {
  it('counts only shot-like events with positive xG', () => {
    expect(isShotLikeEvent(event('home', 'SHOT', 0.1))).toBeTrue();
    expect(isShotLikeEvent(event('home', 'GOAL', 0.3))).toBeTrue();
    expect(isShotLikeEvent(event('home', 'YELLOW_CARD', 0.1))).toBeFalse();
    expect(isShotLikeEvent(event('home', 'SHOT', 0))).toBeFalse();
    expect(isShotLikeEvent(event('home', 'SHOT', null))).toBeFalse();
  });

  it('summarizes central, wide and long shot zones by team', () => {
    const summary = summarizeShotZones(detail([
      event('home', 'SHOT', 0.2),
      event('home', 'MISS', 0.1, 'PENALTY_AREA_WIDE'),
      event('away', 'BLOCK', 0.1, 'LONG_RANGE'),
      event('away', 'SHOT', 0.1, 'OUTSIDE_BOX'),
    ]));

    expect(summary.home).toEqual({ central: 1, wide: 1, long: 0 });
    expect(summary.away).toEqual({ central: 0, wide: 0, long: 2 });
  });

  it('projects match metrics from the controlled team perspective', () => {
    const fixture: MatchFixture = {
      matchId: 'm1',
      homeTeamId: 'home',
      awayTeamId: 'away',
      round: 1,
      status: 'COMPLETED',
      result: {
        homeGoals: 2,
        awayGoals: 1,
        homePossession: 58,
        awayPossession: 42,
        homeShots: 10,
        awayShots: 6,
      },
    };
    const metrics = currentLineupSampleMetrics(fixture, detail([
      event('home', 'SHOT', 0.2),
      event('away', 'MISS', 0.1, 'PENALTY_AREA_WIDE'),
    ]), false);

    expect(metrics.goalsFor).toBe(1);
    expect(metrics.goalsAgainst).toBe(2);
    expect(metrics.possessionFor).toBe(42);
    expect(metrics.xgFor).toBe(0.7);
    expect(metrics.wideShotsFor).toBe(1);
    expect(metrics.centralShotsAgainst).toBe(1);
  });
});
