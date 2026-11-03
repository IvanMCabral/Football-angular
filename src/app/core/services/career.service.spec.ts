import { careerReadCacheInterceptor } from '../interceptors/career-read-cache.interceptor';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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

  it('keeps the last completed status synchronously available after subscribers change', () => {
    const status = { careerId: 'career-1', currentRound: 1, totalRounds: 2, careerPhase: 'PRE_MATCH' } as any;
    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush(status);

    expect(service.getCareerStatusSnapshot()?.value).toEqual(status);
    service.invalidateCareerStatus();
    expect(service.getCareerStatusSnapshot()?.value).toEqual(status);
    http.expectNone('/api/v1/career/status');
  });

  it('does not let an older pending read replace status returned by entry', () => {
    const current = { careerId: 'career-1', currentRound: 2, totalRounds: 34, careerPhase: 'PRE_MATCH' } as any;
    service.getCareerStatus().subscribe();
    const pending = http.expectOne('/api/v1/career/status');
    service.seedCareerStatus(current);
    pending.flush({ ...current, currentRound: 1 });
    expect(service.getCareerStatusSnapshot()?.value).toEqual(current);
    service.getCareerStatus().subscribe(value => expect(value).toEqual(current));
    http.expectNone('/api/v1/career/status');
  });

  it('exposes a completed fixture snapshot without starting another request', () => {
    const fixtures = { round: 4, matches: [], byeTeam: null };
    service.getFixturesByRoundWithBye(4).subscribe();
    http.expectOne('/api/v1/career/fixtures/round/4').flush(fixtures);

    expect(service.getFixtureSnapshot(4)?.value).toEqual(fixtures);
    http.expectNone('/api/v1/career/fixtures/round/4');
  });

  it('clears the status snapshot on the shared logout signal', () => {
    const status = { careerId: 'career-1', currentRound: 1, totalRounds: 2, careerPhase: 'PRE_MATCH' } as any;
    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush(status);
    expect(service.getCareerStatusSnapshot()).not.toBeNull();

    window.dispatchEvent(new CustomEvent('manager:logout'));

    expect(service.getCareerStatusSnapshot()).toBeNull();
  });

  it('keeps status snapshots isolated by career id', () => {
    const first = { careerId: 'career-a', currentRound: 1, totalRounds: 2, careerPhase: 'PRE_MATCH' } as any;
    const second = { careerId: 'career-b', currentRound: 3, totalRounds: 4, careerPhase: 'WAITING_USER' } as any;

    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush(first);
    service.invalidateCareerStatus();
    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush(second);

    expect(service.getCareerStatusSnapshot('career-a')?.value).toEqual(first);
    expect(service.getCareerStatusSnapshot('career-b')?.value).toEqual(second);
    expect(service.getCareerStatusSnapshot('career-missing')).toBeNull();
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

  it('replaces round-one fixtures and all status snapshots after a successful new season', () => {
    service.seedCareerStatus({ careerId: 'career', season: 1, currentRound: 6, careerPhase: 'FINISHED' } as any);
    service.getFixturesByRoundWithBye(1).subscribe();
    http.expectOne('/api/v1/career/fixtures/round/1').flush({ round: 1, matches: [{ matchId: 'old-season' }], byeTeam: null });
    service.continueToNewSeason().subscribe();
    http.expectOne('/api/v1/career/continue').flush({ success: true, newSeason: 2 });
    expect(service.getFixtureSnapshot(1)).toBeNull();
    expect(service.getCareerStatusSnapshot()).toBeNull();
    service.getFixturesByRoundWithBye(1).subscribe(value => expect(value.matches[0].matchId).toBe('new-season'));
    http.expectOne('/api/v1/career/fixtures/round/1').flush({ round: 1, matches: [{ matchId: 'new-season' }], byeTeam: null });
    service.getCareerStatus().subscribe();
    http.expectOne('/api/v1/career/status').flush({ careerId: 'career', season: 2 });
  });

  it('coalesces duplicate season commands but allows retry after rejection or transport error', () => {
    const first = jasmine.createSpy(); const second = jasmine.createSpy();
    service.continueToNewSeason().subscribe(first);
    service.continueToNewSeason().subscribe(second);
    http.expectOne('/api/v1/career/continue').flush({ success: false, message: 'Season is active' });
    expect(first).toHaveBeenCalled(); expect(second).toHaveBeenCalled();
    service.continueToNewSeason().subscribe({ error: () => undefined });
    http.expectOne('/api/v1/career/continue').flush({}, { status: 503, statusText: 'Unavailable' });
    service.continueToNewSeason().subscribe();
    http.expectOne('/api/v1/career/continue').flush({ success: true });
  });

  it('does not share an old account command or let it clear a replacement account snapshot', () => {
    service.continueToNewSeason().subscribe();
    const previous = http.expectOne('/api/v1/career/continue');
    window.dispatchEvent(new CustomEvent('manager:logout'));
    const replacement = { careerId: 'new-owner-career', season: 1 } as any;
    service.seedCareerStatus(replacement);
    service.continueToNewSeason().subscribe();
    const current = http.expectOne('/api/v1/career/continue');
    previous.flush({ success: true });
    expect(service.getCareerStatusSnapshot()?.value).toEqual(replacement);
    current.flush({ success: false });
  });
});


describe('Career status freshness during continuous navigation', () => {
  it('does not extend the server response TTL when a cached status is revisited', () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([
        (req, next) => next(req.clone({ setHeaders: { Authorization: 'Bearer synthetic-owner' } })),
        careerReadCacheInterceptor
      ])), provideHttpClientTesting()
    ] });
    const service = TestBed.inject(CareerService);
    const backend = TestBed.inject(HttpTestingController);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(1000));
    try {
      const status = { careerId: 'synthetic-career', currentRound: 1, careerPhase: 'PRE_MATCH' };
      service.getCareerStatus().subscribe();
      backend.expectOne('/api/v1/career/status').flush(status);
      for (const elapsed of [6000, 60000, 119000]) {
        jasmine.clock().mockDate(new Date(1000 + elapsed));
        service.getCareerStatus().subscribe(value => expect(value.currentRound).toBe(1));
        backend.expectNone('/api/v1/career/status');
      }
      jasmine.clock().mockDate(new Date(126001));
      service.getCareerStatus().subscribe(value => expect(value.currentRound).toBe(2));
      backend.expectOne('/api/v1/career/status').flush({ ...status, currentRound: 2 });
      backend.verify();
    } finally { jasmine.clock().uninstall(); }
  });
});
