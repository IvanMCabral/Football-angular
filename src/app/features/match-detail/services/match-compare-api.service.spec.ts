// Tests for the match comparison API service.

import { HttpClient, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatchCompareApiService } from './match-compare-api.service';
import { MatchComparison } from '../models/match-compare.model';
import { DETAILED_MATCH_ENGINE_TYPE } from '../models/detailed-match-discriminators.model';

describe('MatchCompareApiService', () => {
  let service: MatchCompareApiService;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['get']);
    TestBed.configureTestingModule({
      providers: [
        MatchCompareApiService,
        { provide: HttpClient, useValue: httpSpy },
      ],
    });
    service = TestBed.inject(MatchCompareApiService);
  });

  it('returns the comparison body on 200', (done) => {
    const comparison: MatchComparison = {
      baseline: makeMatchDetail('match-1', 1, 0),
      live: makeMatchDetail('match-1', 2, 1),
      diff: {
        scoreDeltaHome: 1, scoreDeltaAway: 1,
        xgDeltaHome: 0.5, xgDeltaAway: 0.2,
        shotsDeltaHome: 3, shotsDeltaAway: 2,
        possessionDeltaHome: 5,
        timelineDiff: [],
      },
    };
    httpSpy.get.and.returnValue(of(new HttpResponse({ body: comparison, status: 200 })));

    service.getMatchCompare('career-1', 'match-1').subscribe((result) => {
      expect(result).toEqual(comparison);
      expect(httpSpy.get).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/api\/v1\/careers\/career-1\/matches\/match-1\/compare$/),
        jasmine.any(Object)
      );
      done();
    });
  });

  it('returns null on 404 (no comparison available)', (done) => {
    httpSpy.get.and.returnValue(of(new HttpResponse({ body: null, status: 404 })));

    service.getMatchCompare('career-1', 'match-1').subscribe((result) => {
      expect(result).toBeNull();
      done();
    });
  });
});

function makeMatchDetail(matchId: string, homeGoals: number, awayGoals: number) {
  return {
    matchId, careerId: 'career-1', seasonNumber: 1, round: 5,
    homeTeamId: 'home', awayTeamId: 'away',
    homeTeamName: 'Home', awayTeamName: 'Away',
    homeGoals, awayGoals,
    homeXg: 1.0, awayXg: 0.5,
    homeShots: 10, awayShots: 6,
    homePossession: 55, awayPossession: 45,
    timeline: [], playerRatings: [],
    schemaVersion: '1', engineType: DETAILED_MATCH_ENGINE_TYPE,
    createdAt: new Date().toISOString(),
  };
}
