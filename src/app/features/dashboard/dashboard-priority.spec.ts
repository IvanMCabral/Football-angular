import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
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
  let dialog: { open: jasmine.Spy };

  beforeEach(async () => {
    dialog = { open: jasmine.createSpy() };
    auth = { getUserInfo: jasmine.createSpy().and.callFake(() => TestBed.inject(HttpClient).get(`${api}/auth/me`)) };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
        { provide: MatDialog, useValue: dialog }]
    }).overrideComponent(DashboardComponent, { add: { providers: [{ provide: MatDialog, useValue: dialog }] } }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
  });
  afterEach(() => { fixture.destroy(); backend.verify({ ignoreCancelled: true }); });

  function resolveCareer(phase = 'PRE_MATCH', injured = 0): void {
    backend.expectOne(`${api}/dashboard/entry`).flush({ user: { id: 'owner', username: 'Manager' }, careerStatus: { ...status, careerPhase: phase }, userStats: { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 }, squadConditions: { suspended: 0, injured, exhausted: 0, veryTired: 0 } });
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

  it('renders accurate squad conditions from entry without downloading the roster', () => {
    fixture.detectChanges(); resolveCareer('WAITING_USER', 1); resolveSecondaryReads();
    backend.expectNone(`${api}/career/players/squad`);
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

  function confirmReset(): void {
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    fixture.componentInstance.onDeleteCareer();
    const reset = backend.expectOne(`${api}/career/reset`);
    expect(reset.request.method).toBe('DELETE');
    reset.flush(null, { status: 204, statusText: 'No Content' });
    backend.expectOne(`${api}/dashboard/entry`).flush({
      user: { id: 'owner', username: 'Manager' },
      careerStatus: { ...status, careerId: null, careerPhase: 'NO_CAREER' },
      userStats: { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 },
      squadConditions: { suspended: 0, injured: 0, exhausted: 0, veryTired: 0 }
    });
    fixture.detectChanges();
  }

  it('finishes reset with zero stats, no stale career snapshots and a world section that can finish loading', async () => {
    fixture.detectChanges(); resolveCareer('WAITING_USER');
    confirmReset();
    expect(fixture.nativeElement.textContent).toContain('CREAR CARRERA');
    expect(fixture.nativeElement.querySelectorAll('.stats-section .stat-value').length).toBe(4);
    expect(TestBed.inject(CareerService).getCareerStatusSnapshot()).toBeNull();
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.componentInstance.deletingCareer).toBeFalse();
    const blocks = await fixture.getDeferBlocks();
    await blocks[0].render(DeferBlockState.Complete);
    backend.expectOne(`${api}/dashboard/world-status`).flush({ clubs: 70, players: 1680, matches: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.world-stats .stat-value').textContent).toContain('70');
    expect(fixture.nativeElement.querySelector('.world-stats .skeleton-loader')).toBeNull();
  });

  it('ignores an advance response arriving after reset instead of navigating to the deleted career', () => {
    fixture.detectChanges(); resolveCareer('WAITING_USER');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.componentInstance.onPlayNextRound();
    const advance = backend.expectOne(`${api}/career/career/next-round`);
    confirmReset();
    advance.flush({ success: true, currentRound: 2, careerPhase: 'PRE_MATCH' });
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('CREAR CARRERA');
    backend.expectNone(`${api}/career/status`);
    expect(TestBed.inject(CareerService).getCareerStatusSnapshot()).toBeNull();
  });

  it('ignores a status response from before reset', () => {
    fixture.detectChanges(); resolveCareer('WAITING_USER');
    (fixture.componentInstance as any).loadCareerStatus();
    const oldStatus = backend.expectOne(`${api}/career/status`);
    confirmReset();
    oldStatus.flush(status);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CREAR CARRERA');
    expect(TestBed.inject(CareerService).getCareerStatusSnapshot()).toBeNull();
  });

  it('allows retry after reset fails instead of leaving actions disabled', () => {
    fixture.detectChanges(); resolveCareer();
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    fixture.componentInstance.onDeleteCareer();
    backend.expectOne(`${api}/career/reset`).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.componentInstance.deletingCareer).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Continuar carrera');
    expect(fixture.nativeElement.querySelector('.action-button.danger').disabled).toBeFalse();
    expect(TestBed.inject(CareerService).getCareerStatusSnapshot()?.value.careerId).toBe('career');
  });
});
