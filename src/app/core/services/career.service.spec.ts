import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CareerService } from './career.service';

describe('CareerService round fixture cache', () => {
  let service: CareerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CareerService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CareerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shares an in-flight round read between squad prefetch and live bootstrap', () => {
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');

    service.prefetchFixturesForRound(4).subscribe(first);
    service.getFixturesByRoundWithBye(4).subscribe(second);

    const request = http.expectOne('/api/v1/career/fixtures/round/4');
    expect(request.request.method).toBe('GET');
    request.flush({ round: 4, matches: [], byeTeam: null });

    expect(first).toHaveBeenCalledWith({ round: 4, matches: [], byeTeam: null });
    expect(second).toHaveBeenCalledWith({ round: 4, matches: [], byeTeam: null });
    http.expectNone('/api/v1/career/fixtures/round/4');
  });

  it('does not reuse a cached fixture response after the short TTL', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(1_000));
    service.getFixturesByRoundWithBye(5).subscribe();
    http.expectOne('/api/v1/career/fixtures/round/5').flush({ round: 5, matches: [], byeTeam: null });

    jasmine.clock().mockDate(new Date(31_002));
    service.getFixturesByRoundWithBye(5).subscribe();
    http.expectOne('/api/v1/career/fixtures/round/5').flush({ round: 5, matches: [], byeTeam: null });
    jasmine.clock().uninstall();
  });

  it('shares the short-lived career status snapshot across route transitions', () => {
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    const status = { careerId: 'career-1', currentRound: 1, totalRounds: 2, careerPhase: 'PRE_MATCH' } as any;

    service.getCareerStatus().subscribe(first);
    service.getCareerStatus().subscribe(second);

    const request = http.expectOne('/api/v1/career/status');
    request.flush(status);

    expect(first).toHaveBeenCalledWith(status);
    expect(second).toHaveBeenCalledWith(status);
    http.expectNone('/api/v1/career/status');
  });

  it('invalidates the status snapshot after advancing a round', () => {
    const status = { careerId: 'career-1', currentRound: 1, totalRounds: 2, careerPhase: 'PRE_MATCH' } as any;
    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush(status);

    service.advanceToNextRound('career-1').subscribe();
    http.expectOne('/api/v1/career/career-1/next-round').flush({ success: true, currentRound: 2 });

    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush({ ...status, currentRound: 2 });
  });
});
