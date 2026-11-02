import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { worldMetadataCacheInterceptor } from './world-metadata-cache.interceptor';
import { environment } from '../../environments/environment';

describe('World metadata navigation cache', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const api = environment.apiUrl;
  const options = { headers: { Authorization: 'Bearer session-a' } };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([worldMetadataCacheInterceptor])), provideHttpClientTesting()
    ] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('coalesces concurrent requests and reuses isolated metadata across screen visits', () => {
    const results: any[] = [];
    http.get(`${api}/world/teams`, options).subscribe(value => results.push(value));
    http.get(`${api}/world/teams`, options).subscribe(value => results.push(value));
    backend.expectOne(`${api}/world/teams`).flush([{ name: 'Club' }]);
    results[0][0].name = 'Caller mutation';
    http.get(`${api}/world/teams`, options).subscribe(value => results.push(value));
    backend.expectNone(`${api}/world/teams`);
    expect(results[1]).toEqual([{ name: 'Club' }]);
    expect(results[2]).toEqual([{ name: 'Club' }]);
  });

  it('expires metadata after 30 seconds', () => {
    const now = spyOn(Date, 'now').and.returnValue(1_000);
    http.get(`${api}/world/leagues`, options).subscribe();
    backend.expectOne(`${api}/world/leagues`).flush([]);
    now.and.returnValue(31_000);
    http.get(`${api}/world/leagues`, options).subscribe();
    backend.expectOne(`${api}/world/leagues`).flush([]);
  });

  it('never shares metadata between sessions or with anonymous requests', () => {
    http.get(`${api}/world/teams`, options).subscribe();
    backend.expectOne(`${api}/world/teams`).flush([{ name: 'A' }]);
    http.get(`${api}/world/teams`, { headers: { Authorization: 'Bearer session-b' } }).subscribe();
    backend.expectOne(`${api}/world/teams`).flush([{ name: 'B' }]);
    for (let i = 0; i < 2; i++) {
      http.get(`${api}/world/teams`).subscribe();
      backend.expectOne(`${api}/world/teams`).flush([]);
    }
  });

  it('does not cache failures', () => {
    http.get(`${api}/world/teams`, options).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/world/teams`).flush({}, { status: 503, statusText: 'Unavailable' });
    http.get(`${api}/world/teams`, options).subscribe();
    backend.expectOne(`${api}/world/teams`).flush([]);
  });

  it('invalidates before and after commands and prevents old pending reads from restoring stale data', () => {
    http.get(`${api}/world/teams`, options).subscribe();
    const oldRead = backend.expectOne(`${api}/world/teams`);
    http.post(`${api}/world/create-team`, {}, options).subscribe();
    const command = backend.expectOne(`${api}/world/create-team`);
    oldRead.flush([{ name: 'Old' }]);
    http.get(`${api}/world/teams`, options).subscribe();
    backend.expectOne(`${api}/world/teams`).flush([{ name: 'During command' }]);
    command.flush({});
    http.get(`${api}/world/teams`, options).subscribe(value => expect(value).toEqual([{ name: 'New' }]));
    backend.expectOne(`${api}/world/teams`).flush([{ name: 'New' }]);
  });

  it('also invalidates on a failed command', () => {
    http.get(`${api}/world/leagues`, options).subscribe();
    backend.expectOne(`${api}/world/leagues`).flush([]);
    http.delete(`${api}/career`, options).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/career`).flush({}, { status: 409, statusText: 'Conflict' });
    http.get(`${api}/world/leagues`, options).subscribe();
    backend.expectOne(`${api}/world/leagues`).flush([]);
  });

  it('never caches authorization, career state, players, or requests with an explicit owner parameter', () => {
    for (const path of ['/auth/me', '/career/status', '/world/free-players', '/world/teams?userId=other']) {
      for (let i = 0; i < 2; i++) {
        http.get(`${api}${path}`, options).subscribe();
        backend.expectOne(`${api}${path}`).flush([]);
      }
    }
  });
});
