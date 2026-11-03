import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CareerReadCache, REFRESH_CAREER_READ, careerReadCacheInterceptor } from './career-read-cache.interceptor';
import { environment } from '../../environments/environment';

describe('Career read reuse', () => {
  let http: HttpClient, backend: HttpTestingController;
  const url = `${environment.apiUrl}/career/players/squad`;
  const options = { headers: { Authorization: 'Bearer synthetic-owner-a' } };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([careerReadCacheInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient); backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('renders a revisited read synchronously and isolates mutable component copies', () => {
    const first: any[] = [], second: any[] = [];
    http.get(url, options).subscribe(value => first.push(value));
    backend.expectOne(url).flush([{ name: 'Original' }]);
    first[0][0].name = 'Draft';
    http.get(url, options).subscribe(value => second.push(value));
    expect(second[0][0].name).toBe('Original'); backend.expectNone(url);
  });
  it('shares an in-flight read across screens', () => {
    const results: unknown[] = [];
    http.get(url, options).subscribe(value => results.push(value));
    http.get(url, options).subscribe(value => results.push(value));
    backend.expectOne(url).flush([]); expect(results.length).toBe(2);
  });
  it('never reuses reads between account tokens or after logout', () => {
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
    http.get(url, { headers: { Authorization: 'Bearer synthetic-owner-b' } }).subscribe(); backend.expectOne(url).flush([]);
    window.dispatchEvent(new Event('manager:logout'));
    http.get(url, { headers: { Authorization: 'Bearer synthetic-owner-b' } }).subscribe(); backend.expectOne(url).flush([]);
  });
  it('does not store anonymous requests, failures, or live match state', () => {
    for (let i = 0; i < 2; i++) { http.get(url).subscribe(); backend.expectOne(url).flush([]); }
    for (let i = 0; i < 2; i++) { http.get(url, options).subscribe({ error: () => undefined }); backend.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' }); }
    const state = `${environment.apiUrl}/match-engine/match/state`;
    for (let i = 0; i < 2; i++) { http.get(state, options).subscribe(); backend.expectOne(state).flush({ minute: i }); }
  });
  it('invalidates before and after writes without allowing an old in-flight read to repopulate', () => {
    http.get(url, options).subscribe(); const old = backend.expectOne(url);
    const command = `${environment.apiUrl}/career/lineup/manual-select`;
    http.post(command, {}, options).subscribe(); const write = backend.expectOne(command);
    old.flush([{ name: 'Old' }]);
    http.get(url, options).subscribe(); backend.expectOne(url).flush([{ name: 'During' }]);
    write.flush({ success: true });
    http.get(url, options).subscribe(); backend.expectOne(url).flush([{ name: 'Saved' }]);
    const latest: any[] = []; http.get(url, options).subscribe(value => latest.push(value));
    expect(latest[0][0].name).toBe('Saved'); backend.expectNone(url);
  });
  it('keeps substitution inputs across round controls and refreshes them after a substitution', () => {
    const lineup = `${environment.apiUrl}/career/lineup/current`;
    const squad = `${environment.apiUrl}/career/teams/me/squad`;
    const reads = [lineup, squad];
    for (const path of reads) {
      http.get(path, options).subscribe();
      backend.expectOne(path).flush({ version: 1 });
    }
    for (const action of ['pause', 'resume']) {
      const command = `${environment.apiUrl}/career/career-id/round/round-id/${action}`;
      http.post(command, {}, options).subscribe();
      backend.expectOne(command).flush({ success: true });
    }
    for (const path of reads) {
      http.get(path, options).subscribe(value => expect(value).toEqual({ version: 1 }));
      backend.expectNone(path);
    }
    const substitution = `${environment.apiUrl}/match-engine/matches/match-id/substitutions`;
    http.post(substitution, {}, options).subscribe();
    backend.expectOne(substitution).flush({ success: true });
    for (const path of reads) {
      http.get(path, options).subscribe(value => expect(value).toEqual({ version: 2 }));
      backend.expectOne(path).flush({ version: 2 });
    }
  });

  it('also invalidates on rejected commands', () => {
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
    const command = `${environment.apiUrl}/career/reset`;
    http.delete(command, options).subscribe({ error: () => undefined });
    backend.expectOne(command).flush({}, { status: 409, statusText: 'Conflict' });
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
  });
  it('keeps the immutable pitch catalog through writes and does not invalidate on read-only previews', () => {
    const catalog = `${environment.apiUrl}/lineup-editor/formations`;
    http.get(catalog, options).subscribe(); backend.expectOne(catalog).flush([]);
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
    for (const path of ['preview-chemistry', 'preview-ratings']) {
      const preview = `${environment.apiUrl}/career/lineup/${path}`;
      http.post(preview, {}, options).subscribe(); backend.expectOne(preview).flush({});
    }
    http.get(url, options).subscribe(); backend.expectNone(url);
    const command = `${environment.apiUrl}/career/lineup/confirm`;
    http.post(command, {}, options).subscribe(); backend.expectOne(command).flush({});
    http.get(catalog, options).subscribe(); backend.expectNone(catalog);
  });
  it('honors explicit refresh even with a populated cache', () => {
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
    http.get(url, { ...options, context: new HttpContext().set(REFRESH_CAREER_READ, true) }).subscribe(); backend.expectOne(url).flush([]);
  });
  it('expires dynamic reads while retaining the pitch metadata', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(1000));
      http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
      const catalog = `${environment.apiUrl}/lineup-editor/formations`;
      http.get(catalog, options).subscribe(); backend.expectOne(catalog).flush([]);
      jasmine.clock().mockDate(new Date(121001));
      http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
      http.get(catalog, options).subscribe(); backend.expectNone(catalog);
    } finally { jasmine.clock().uninstall(); }
  });
  it('drops career data on a round/season change or window focus', () => {
    const cache = TestBed.inject(CareerReadCache);
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
    cache.observeCareer({ careerId: 'career', season: 1, currentRound: 1 });
    cache.observeCareer({ careerId: 'career', season: 1, currentRound: 2 });
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
    window.dispatchEvent(new Event('focus'));
    http.get(url, options).subscribe(); backend.expectOne(url).flush([]);
  });
  it('keeps query variants separate and sends expired sessions through authentication', () => {
    for (const round of [1, 2]) {
      const query = `${environment.apiUrl}/career/standings?round=${round}`;
      http.get(query, options).subscribe(); backend.expectOne(query).flush([]);
      http.get(query, options).subscribe(); backend.expectNone(query);
    }
    const expired = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
    const received: unknown[] = [];
    for (let i = 0; i < 2; i++) {
      http.get(url, { headers: { Authorization: `Bearer ${expired}` } }).subscribe(value => received.push(value));
      backend.expectOne(url).flush({ uncached: i });
    }
    expect(received).toEqual([{ uncached: 0 }, { uncached: 1 }]);
  });
  it('bounds storage instead of accumulating every visited club forever', () => {
    for (let i = 0; i < 50; i++) { const team = `${environment.apiUrl}/career/teams/${i}`; http.get(team, options).subscribe(); backend.expectOne(team).flush({}); }
    const oldest = `${environment.apiUrl}/career/teams/0`;
    http.get(oldest, options).subscribe(); backend.expectOne(oldest).flush({});
  });
});
