import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';

describe('Lobby and careers separation', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { isAuthenticated: () => true, authStatus$: of('authenticated') } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('opens a lobby from the default route without fetching any career or world data', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Lobby');
    expect(harness.routeNativeElement?.querySelector('a[href="/careers"]')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Próximamente');
    expect(harness.routeNativeElement?.querySelector('input,textarea,button')).toBeNull();
    http.expectNone(() => true);
  });

  it('loads the owner career only after entering Careers', async () => {
    const harness = await RouterTestingHarness.create('/lobby');
    http.expectNone(() => true);
    await harness.navigateByUrl('/careers');
    const entry = http.expectOne(`${environment.apiUrl}/dashboard/entry`);
    entry.flush({ user: { id: 'owner', username: 'Manager' },
      careerStatus: { careerId: null }, userStats: { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 },
      squadConditions: { suspended: 0, injured: 0, exhausted: 0, veryTired: 0 }, careerOverview: null });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Carreras');
    expect(harness.routeNativeElement?.textContent).toContain('CREAR CARRERA');
    expect(harness.routeNativeElement?.querySelector('a[href="/dashboard"]')).not.toBeNull();
    http.expectNone(() => true);
  });
});
