import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CareerService } from '../../core/services/career.service';
import { environment } from '../../environments/environment';

describe('Dashboard entry request priority', () => {
  const api = environment.apiUrl;
  const status = { careerId: 'career', userSessionTeamId: 'team', currentRound: 1,
    totalRounds: 34, season: 1, careerPhase: 'PRE_MATCH', userDivision: 'PRIMERA' };
  let fixture: ComponentFixture<DashboardComponent>;
  let backend: HttpTestingController;
  let auth: { getUserInfo: jasmine.Spy };

  beforeEach(async () => {
    auth = { getUserInfo: jasmine.createSpy().and.callFake(() => TestBed.inject(HttpClient).get(`${api}/auth/me`)) };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
        { provide: MatDialog, useValue: { open: jasmine.createSpy() } }]
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
  });
  afterEach(() => { fixture.destroy(); backend.verify({ ignoreCancelled: true }); });

  function resolveCareer(phase = 'PRE_MATCH'): void {
    backend.expectOne(`${api}/dashboard/entry`).flush({ user: { id: 'owner', username: 'Manager' }, careerStatus: { ...status, careerPhase: phase }, userStats: { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 } });
    fixture.detectChanges();
  }
  function resolveSecondaryReads(): void {
    backend.expectNone(`${api}/auth/me`);
    backend.expectNone(`${api}/dashboard/user-stats`);
    fixture.detectChanges();
  }

  it('requests only career state before enabling continue, without a fixture or squad prefetch', () => {
    fixture.detectChanges();
    expect(auth.getUserInfo).not.toHaveBeenCalled();
    backend.expectNone(req => !req.url.endsWith('/dashboard/entry'));
    resolveCareer();
    expect(fixture.nativeElement.textContent).toContain('Continuar carrera');
    expect(fixture.nativeElement.textContent).toContain('Fecha 1/34');
    resolveSecondaryReads();
    backend.expectNone(req => req.url.includes('/fixtures') || req.url.includes('/players/squad') || req.url.includes('/world-status'));
  });

  it('requests the world summary only when its deferred section is displayed', async () => {
    fixture.detectChanges(); resolveCareer(); resolveSecondaryReads();
    backend.expectNone(`${api}/dashboard/world-status`);
    const blocks = await fixture.getDeferBlocks();
    await blocks[0].render(DeferBlockState.Complete);
    backend.expectOne(`${api}/dashboard/world-status`).flush({ clubs: 70, players: 1680, matches: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1680');
  });

  it('still loads squad conditions before a pending round without prefetching fixtures', () => {
    fixture.detectChanges(); resolveCareer('WAITING_USER'); resolveSecondaryReads();
    backend.expectOne(`${api}/career/players/squad`).flush([{ sessionPlayerId: 'player', injured: true }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('jugador lesionado');
    backend.expectNone(req => req.url.includes('/fixtures'));
  });

  it('cancels entry transport when leaving the dashboard', () => {
    fixture.detectChanges();
    const entry = backend.expectOne(`${api}/dashboard/entry`);
    fixture.destroy();
    expect(entry.cancelled).toBeTrue();
  });

  it('shares the returned career status with the next route without another request', () => {
    fixture.detectChanges(); resolveCareer(); resolveSecondaryReads();
    TestBed.inject(CareerService).getCareerStatus().subscribe(value => expect(value.careerId).toBe('career'));
    backend.expectNone(`${api}/career/status`);
  });
});
