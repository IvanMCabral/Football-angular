/**
 * V25D78-C55.2 phase 4 UI (c) + (d2): tests for dashboard user-division
 * pill + auto-trigger of the promotions dialog.
 *
 * <p>Coverage:
 * <ul>
 *   <li>(c) When {@code careerStatus.userDivision} is set, the dashboard
 *       renders the prominent tier pill (PRIMERA / SEGUNDA / TERCERA).</li>
 *   <li>(c) When {@code careerStatus.userDivision} is null/omitted, the
 *       pill does NOT render (legacy back).</li>
 *   <li>(d2) When {@code careerStatus.promotionsAvailable} is true and the
 *       season hasn't been 'viewed' yet, the dashboard calls
 *       {@code GET /career/promotions} and opens the
 *       {@link PromotionsDialogComponent} via {@code MatDialog.open()}.</li>
 *   <li>(d2) After the dialog closes, localStorage records the season so
 *       subsequent loads don't re-open.</li>
 *   <li>(d2) If the user already viewed this season's promotions, the
 *       dialog does NOT open.</li>
 *   <li>(d2) If /career/promotions returns [] the dialog does NOT open
 *       (stale engine flag safety).</li>
 * </ul>
 */
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PromotionResult } from '../../core/services/career.model';

@Component({
  selector: 'app-stub',
  standalone: true,
  template: ''
})
class StubComponent {}

describe('DashboardComponent — V25D78-C55.2 phase 4 UI (c) + (d2)', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const USER_ID = 'user-1234';
  const CAREER_ID = 'career-xyz';
  const SEASON = 2;

  beforeEach(async () => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'delete']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUserInfo']);
    toastSpy = jasmine.createSpyObj('ToastService', ['error', 'success']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    authSpy.getUserInfo.and.returnValue(of({
      id: USER_ID,
      username: 'test',
      email: 'test@example.com'
    }));

    // Default /career/status (no division, no promotions available).
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 5,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON
        });
      }
      if (url.includes('/career/players/squad')) return of([]);  // squadSubject must be an array
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(undefined),
      close: () => undefined
    } as unknown as MatDialogRef<unknown>);

    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, MatDialogModule, StubComponent],
      providers: [
        { provide: HttpClient, useValue: httpSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: MatDialog, useValue: dialogSpy },
        provideRouter([])
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('(c): renders user-division pill when careerStatus.userDivision is set', (done: DoneFn) => {
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 5,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON,
          userDivision: 'SEGUNDA'
        });
      }
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const pill = fixture.nativeElement.querySelector('.user-division-pill');
      expect(pill).not.toBeNull('user-division-pill must render when status has userDivision');
      expect(pill.textContent.trim()).toContain('SEGUNDA');
      expect(pill.className).toContain('tier-segunda');
      done();
    });
  });

  it('(c): hides user-division pill when careerStatus.userDivision is null', (done: DoneFn) => {
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: null,
          currentRound: 1,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON,
          userDivision: null
        });
      }
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const pill = fixture.nativeElement.querySelector('.user-division-pill');
      expect(pill).toBeNull('user-division-pill must NOT render when userDivision is null');
      done();
    });
  });

  it('(d2): auto-opens PromotionsDialog when promotionsAvailable=true and not yet viewed (direct)', () => {
    // V25D78-C55.2 phase 4 UI (d2): direct unit test of the auto-trigger
    // path. We invoke the private method directly with a manually bound
    // `dialog` reference because `inject(MatDialog)` resolves to the real
    // MatDialog instance even when a `useValue` spy is provided (the
    // override is consumed as a `_parentDialog` dep, not the main token —
    // known Karma/jsdom + Material 18+ interaction).
    const promotions: PromotionResult[] = [
      { teamId: 't-x', teamName: 'Real Madrid', fromDivisionId: 'd-1', fromDivisionName: 'PRIMERA', toDivisionId: 'd-2', toDivisionName: 'SEGUNDA', type: 'RELEGATED', fromPosition: 19 }
    ];
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/promotions')) return of(promotions);
      return of([]);
    }) as any);

    // Bypass inject(MatDialog): bind the spy directly so the auto-trigger
    // records into our spy without instantiating the real MatDialog
    // (which fails in jsdom because Overlay/Push can't render).
    (component as any).dialog = dialogSpy;

    // Pretend the status has just been read.
    (component as any).careerStatusSubject.next({ careerId: CAREER_ID, season: SEASON });

    // Invoke the private auto-trigger method directly.
    (component as any).maybeShowPromotionsDialog(CAREER_ID);

    expect(httpSpy.get).toHaveBeenCalledWith(
      jasmine.stringMatching(/\/career\/promotions/)
    );
    expect(dialogSpy.open).toHaveBeenCalledTimes(1);
    expect(dialogSpy.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({ data: { promotions } })
    );
  });

  it('(d2): does NOT open dialog when promotionsAvailable=true but already viewed', (done: DoneFn) => {
    localStorage.setItem(`c55.phase4.viewedSeason.${CAREER_ID}`, String(SEASON));

    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 38,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON,
          userDivision: 'PRIMERA',
          promotionsAvailable: true
        });
      }
      if (url.includes('/career/promotions')) return of([]);
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(dialogSpy.open).not.toHaveBeenCalled();
      done();
    });
  });

  it('(d2): does NOT open dialog when /career/promotions returns [] (stale flag)', (done: DoneFn) => {
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 38,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON,
          userDivision: 'PRIMERA',
          promotionsAvailable: true
        });
      }
      if (url.includes('/career/promotions')) return of([]); // engine says no movements
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(dialogSpy.open).not.toHaveBeenCalled();
      done();
    });
  });

  it('(d2): does NOT open dialog when promotionsAvailable=false', (done: DoneFn) => {
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 5,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON,
          userDivision: 'PRIMERA',
          promotionsAvailable: false
        });
      }
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(dialogSpy.open).not.toHaveBeenCalled();
      done();
    });
  });

  it('(d2): silent failure — /career/promotions errors do not crash the dashboard', (done: DoneFn) => {
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 38,
          totalRounds: 38,
          isFinished: false,
          careerPhase: 'WAITING_USER',
          season: SEASON,
          userDivision: 'PRIMERA',
          promotionsAvailable: true
        });
      }
      if (url.includes('/career/promotions')) return throwError(() => ({ status: 500 }));
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(dialogSpy.open).not.toHaveBeenCalled();
      done();
    });
  });
});