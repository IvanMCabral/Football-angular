// V24D24: Tests for TestHarnessService.
// Mirrors match-compare-api.service.spec.ts pattern — spy on HttpClient,
// verify request shape and return mapping.

import { HttpClient, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TestHarnessService } from './test-harness.service';
import {
  CustomFixture,
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
});
