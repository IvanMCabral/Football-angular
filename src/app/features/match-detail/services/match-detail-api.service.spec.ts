// Tests for MatchDetailApiService detail and timeline endpoints.

import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatchDetailApiService } from './match-detail-api.service';
import { MatchDetail, TimelineSnapshot } from '../models/match-detail.model';
import { DETAILED_MATCH_ENGINE_TYPE } from '../models/detailed-match-discriminators.model';

describe('MatchDetailApiService', () => {
  let service: MatchDetailApiService;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['get']);
    TestBed.configureTestingModule({
      providers: [
        MatchDetailApiService,
        { provide: HttpClient, useValue: httpSpy },
      ],
    });
    service = TestBed.inject(MatchDetailApiService);
  });

  describe('getMatchDetail', () => {
    it('returns the detail body on 200', (done) => {
      const detail = makeMatchDetail('match-1');
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: detail, status: 200 })));

      service.getMatchDetail('career-1', 'match-1').subscribe((result) => {
        expect(result).toEqual(detail);
        expect(httpSpy.get).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/careers\/career-1\/matches\/match-1\/detail$/),
          jasmine.any(Object)
        );
        done();
      });
    });

    it('returns null on 404 (detail unavailable)', (done) => {
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: null, status: 404 })));

      service.getMatchDetail('career-1', 'match-1').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('returns null when Angular emits HttpErrorResponse 404', (done) => {
      httpSpy.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

      service.getMatchDetail('career-1', 'match-1').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('getMatchTimeline', () => {
    it('returns the snapshot body on 200 and forwards the minute param', (done) => {
      const snap: TimelineSnapshot = {
        minute: 45,
        homeGoals: 1,
        awayGoals: 0,
        homeXg: 0.5,
        awayXg: 0.2,
        homeShots: 4,
        awayShots: 2,
        events: [],
      };
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: snap, status: 200 })));

      service.getMatchTimeline('career-1', 'match-1', 45).subscribe((result) => {
        expect(result).toEqual(snap);
        const url = httpSpy.get.calls.mostRecent().args[0];
        const options = httpSpy.get.calls.mostRecent().args[1] as { params: HttpParams };
        expect(url).toMatch(/\/api\/v1\/careers\/career-1\/matches\/match-1\/timeline$/);
        expect(options.params.get('minute')).toBe('45');
        done();
      });
    });

    it('accepts minute=0 (empty snapshot boundary)', (done) => {
      const snap: TimelineSnapshot = {
        minute: 0,
        homeGoals: 0,
        awayGoals: 0,
        homeXg: 0,
        awayXg: 0,
        homeShots: 0,
        awayShots: 0,
        events: [],
      };
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: snap, status: 200 })));

      service.getMatchTimeline('career-1', 'match-1', 0).subscribe((result) => {
        expect(result?.minute).toBe(0);
        const options = httpSpy.get.calls.mostRecent().args[1] as { params: HttpParams };
        expect(options.params.get('minute')).toBe('0');
        done();
      });
    });

    it('accepts minute=130 (full snapshot boundary)', (done) => {
      const snap: TimelineSnapshot = {
        minute: 130,
        homeGoals: 2,
        awayGoals: 1,
        homeXg: 1.8,
        awayXg: 0.9,
        homeShots: 12,
        awayShots: 8,
        events: [],
      };
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: snap, status: 200 })));

      service.getMatchTimeline('career-1', 'match-1', 130).subscribe((result) => {
        expect(result?.minute).toBe(130);
        done();
      });
    });

    it('returns null on 404 (feature off or no detail)', (done) => {
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: null, status: 404 })));

      service.getMatchTimeline('career-1', 'match-1', 45).subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('returns null when Angular emits HttpErrorResponse 404 for timeline', (done) => {
      httpSpy.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

      service.getMatchTimeline('career-1', 'match-1', 45).subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('encodes special characters in path params', (done) => {
      httpSpy.get.and.returnValue(of(new HttpResponse({ body: null, status: 404 })));

      service.getMatchTimeline('career/with/slash', 'match id with spaces', 45).subscribe(() => {
        const url = httpSpy.get.calls.mostRecent().args[0] as string;
        // Angular's encodeURIComponent replaces / with %2F and spaces with %20
        expect(url).toContain('career%2Fwith%2Fslash');
        expect(url).toContain('match%20id%20with%20spaces');
        done();
      });
    });
  });
});

function makeMatchDetail(matchId: string): MatchDetail {
  return {
    matchId,
    careerId: 'career-1',
    seasonNumber: 1,
    round: 5,
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeTeamName: 'Home',
    awayTeamName: 'Away',
    homeGoals: 2,
    awayGoals: 1,
    homeXg: 1.8,
    awayXg: 0.9,
    homeShots: 10,
    awayShots: 6,
    homePossession: 55,
    awayPossession: 45,
    timeline: [],
    playerRatings: [],
    schemaVersion: '1',
    engineType: DETAILED_MATCH_ENGINE_TYPE,
    createdAt: new Date().toISOString(),
  };
}
