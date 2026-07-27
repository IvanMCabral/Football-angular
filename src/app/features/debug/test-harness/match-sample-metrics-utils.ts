import { MatchDetail, MatchEvent } from '../../match-detail/models/match-detail.model';
import { MatchFixture } from '../models/test-harness.model';

export interface ShotZoneBucket {
  central: number;
  wide: number;
  long: number;
}

export interface ShotZoneSummary {
  home: ShotZoneBucket;
  away: ShotZoneBucket;
}

export interface CurrentLineupSampleMetrics {
  goalsFor: number;
  goalsAgainst: number;
  possessionFor: number;
  shotsFor: number;
  shotsAgainst: number;
  xgFor: number;
  xgAgainst: number;
  centralShotsFor: number;
  wideShotsFor: number;
  longShotsFor: number;
  centralShotsAgainst: number;
  wideShotsAgainst: number;
  longShotsAgainst: number;
}

export function currentLineupSampleMetrics(
  fixture: MatchFixture,
  detail: MatchDetail | null,
  userIsHome: boolean
): CurrentLineupSampleMetrics {
  const zoneSummary = summarizeShotZones(detail);
  const zonesFor = userIsHome ? zoneSummary.home : zoneSummary.away;
  const zonesAgainst = userIsHome ? zoneSummary.away : zoneSummary.home;
  return {
    goalsFor: userIsHome ? fixture?.result?.homeGoals ?? 0 : fixture?.result?.awayGoals ?? 0,
    goalsAgainst: userIsHome ? fixture?.result?.awayGoals ?? 0 : fixture?.result?.homeGoals ?? 0,
    possessionFor: userIsHome ? fixture?.result?.homePossession ?? 0 : fixture?.result?.awayPossession ?? 0,
    shotsFor: userIsHome ? fixture?.result?.homeShots ?? 0 : fixture?.result?.awayShots ?? 0,
    shotsAgainst: userIsHome ? fixture?.result?.awayShots ?? 0 : fixture?.result?.homeShots ?? 0,
    xgFor: userIsHome ? detail?.homeXg ?? 0 : detail?.awayXg ?? 0,
    xgAgainst: userIsHome ? detail?.awayXg ?? 0 : detail?.homeXg ?? 0,
    centralShotsFor: zonesFor.central,
    wideShotsFor: zonesFor.wide,
    longShotsFor: zonesFor.long,
    centralShotsAgainst: zonesAgainst.central,
    wideShotsAgainst: zonesAgainst.wide,
    longShotsAgainst: zonesAgainst.long,
  };
}

export function summarizeShotZones(detail: MatchDetail | null): ShotZoneSummary {
  const summary = {
    home: { central: 0, wide: 0, long: 0 },
    away: { central: 0, wide: 0, long: 0 },
  };
  if (!detail) return summary;
  for (const event of detail.timeline ?? []) {
    if (!isShotLikeEvent(event)) continue;
    const bucket = event.teamId === detail.homeTeamId ? summary.home : summary.away;
    const location = event.shotCoordinate?.location;
    if (location === 'PENALTY_AREA_WIDE') {
      bucket.wide++;
    } else if (location === 'OUTSIDE_BOX' || location === 'LONG_RANGE') {
      bucket.long++;
    } else {
      bucket.central++;
    }
  }
  return summary;
}

export function isShotLikeEvent(event: MatchEvent): boolean {
  return (
      event.type === 'SHOT'
      || event.type === 'SHOT_ON_TARGET'
      || event.type === 'MISS'
      || event.type === 'BLOCK'
      || event.type === 'GOAL'
    )
    && event.xg !== null
    && event.xg !== undefined
    && event.xg > 0;
}

