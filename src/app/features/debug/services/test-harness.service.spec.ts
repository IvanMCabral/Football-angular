// V24D24: Tests for TestHarnessService.
// Mirrors match-compare-api.service.spec.ts pattern — spy on HttpClient,
// verify request shape and return mapping.

import { HttpClient, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TestHarnessService } from './test-harness.service';
import {
  CustomFixture,
  MatchFixture,
  RoundStateResponse,
  TestHarnessMutationResponse,
} from '../models/test-harness.model';

describe('TestHarnessService', () => {
  let service: TestHarnessService;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['post']);
    TestBed.configureTestingModule({
      providers: [
        TestHarnessService,
        { provide: HttpClient, useValue: httpSpy },
      ],
    });
    service = TestBed.inject(TestHarnessService);
  });

  describe('setFormation', () => {
    it('POSTs to /set-formation with the formation body', (done) => {
      const response: TestHarnessMutationResponse = {
        success: true,
        message: 'Formation persisted',
        formation: '4-3-3',
      };
      httpSpy.post.and.returnValue(of(response));

      service.setFormation('4-3-3').subscribe((result) => {
        expect(result).toEqual(response);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/test-harness\/career\/set-formation$/),
          { formation: '4-3-3' }
        );
        done();
      });
    });

    it('propagates HTTP errors (404 = profile-gated off in prod)', (done) => {
      httpSpy.post.and.returnValue(
        throwError(() => new HttpResponse({ status: 404, body: null }))
      );

      service.setFormation('4-3-3').subscribe({
        next: () => fail('expected error'),
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('resetInjuries', () => {
    it('POSTs to /reset-injuries with empty body', (done) => {
      const response: TestHarnessMutationResponse = {
        success: true,
        message: 'Injury flags cleared',
      };
      httpSpy.post.and.returnValue(of(response));

      service.resetInjuries().subscribe((result) => {
        expect(result).toEqual(response);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/test-harness\/career\/reset-injuries$/),
          {}
        );
        done();
      });
    });
  });

  describe('replaceFixtures', () => {
    it('POSTs the fixtures array to /replace-fixtures', (done) => {
      const fixtures: CustomFixture[] = [
        {
          homeTeamId: 'home-1',
          awayTeamId: 'away-1',
          round: 1,
          matchId: 'match-1',
        },
        {
          homeTeamId: 'home-2',
          awayTeamId: 'away-2',
          round: 1,
        },
      ];
      const response: TestHarnessMutationResponse = {
        success: true,
        message: 'Fixtures replaced',
        fixtureCount: 2,
        maxRound: 1,
      };
      httpSpy.post.and.returnValue(of(response));

      service.replaceFixtures(fixtures).subscribe((result) => {
        expect(result).toEqual(response);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/test-harness\/career\/replace-fixtures$/),
          fixtures
        );
        done();
      });
    });

    it('handles empty fixture arrays', (done) => {
      httpSpy.post.and.returnValue(
        of({
          success: true,
          message: 'Fixtures replaced',
          fixtureCount: 0,
          maxRound: 0,
        } as TestHarnessMutationResponse)
      );

      service.replaceFixtures([]).subscribe((result) => {
        expect(result.fixtureCount).toBe(0);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/test-harness\/career\/replace-fixtures$/),
          []
        );
        done();
      });
    });
  });

  // ========== V24D24.2: replay-with-seed + simulate-round ==========

  describe('replayMatch', () => {
    it('POSTs to /match/{id}/replay with the seed body', (done) => {
      const response: MatchFixture = {
        matchId: 'match-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        status: 'COMPLETED',
        result: {
          homeGoals: 2,
          awayGoals: 1,
          homeShots: 10,
          awayShots: 4,
        },
      };
      httpSpy.post.and.returnValue(of(response));

      service.replayMatch('match-1', 12345).subscribe((result) => {
        expect(result).toEqual(response);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/test-harness\/career\/match\/match-1\/replay$/),
          { seed: 12345 }
        );
        done();
      });
    });

    it('sends seed: null for non-reproducible replay (cleared input)', (done) => {
      const response: MatchFixture = {
        matchId: 'match-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        status: 'COMPLETED',
        result: { homeGoals: 0, awayGoals: 0 },
      };
      httpSpy.post.and.returnValue(of(response));

      service.replayMatch('match-1', null).subscribe(() => {
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/test-harness\/career\/match\/match-1\/replay$/),
          { seed: null }
        );
        done();
      });
    });

    it('propagates HTTP errors (404 = profile-gated off in prod)', (done) => {
      httpSpy.post.and.returnValue(
        throwError(() => new HttpResponse({ status: 404, body: null }))
      );

      service.replayMatch('match-1', 12345).subscribe({
        next: () => fail('expected error'),
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('simulateRound', () => {
    it('POSTs to /match-engine/rounds/start with roundId + matches', (done) => {
      const matches = [
        { matchId: 'm1', homeTeamId: 'h1', awayTeamId: 'a1' },
        { matchId: 'm2', homeTeamId: 'h2', awayTeamId: 'a2' },
      ];
      const response: RoundStateResponse = {
        roundId: 'round-uuid-1',
        status: 'IN_PROGRESS',
        matchIds: ['m1', 'm2'],
      };
      httpSpy.post.and.returnValue(of(response));

      service.simulateRound('round-uuid-1', matches).subscribe((result) => {
        expect(result).toEqual(response);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/match-engine\/rounds\/start$/),
          { roundId: 'round-uuid-1', matches }
        );
        done();
      });
    });

    it('handles an empty matches array (backend treats as heartbeat)', (done) => {
      const response: RoundStateResponse = {
        roundId: 'round-uuid-1',
        status: 'IN_PROGRESS',
        matchIds: [],
      };
      httpSpy.post.and.returnValue(of(response));

      service.simulateRound('round-uuid-1', []).subscribe((result) => {
        expect(result.roundId).toBe('round-uuid-1');
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/match-engine\/rounds\/start$/),
          { roundId: 'round-uuid-1', matches: [] }
        );
        done();
      });
    });
  });
});
