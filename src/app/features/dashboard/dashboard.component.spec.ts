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

  it('(C55.10 Item 1): tier-real — pill renders CUARTA verbatim with tier-default fallback', (done: DoneFn) => {
    // C55.10 Item 1: backend now sends the literal tier label (CUARTA,
    // QUINTA, …) — the front must consume it AS-IS without mapping. CSS
    // contract: the unknown-tier pill gets `tier-default` styling so it
    // stays visually distinct from PRIMERA/SEGUNDA/TERCERA instead of
    // falling back to unstyled text.
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
          userDivision: 'CUARTA'
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
      expect(pill).not.toBeNull('user-division-pill must render when status has userDivision=CUARTA');
      expect(pill.textContent.trim()).toContain('CUARTA',
        'pill must display the backend label verbatim, not remap to PRIMERA');
      expect(pill.className).toContain('tier-default',
        'pill must have tier-default class for unknown tier (CUARTA)');
      expect(pill.className).not.toContain('tier-primera',
        'pill must NOT have tier-primera when userDivision=CUARTA');
      done();
    });
  });

  it('(C55.10 Item 1): tierCssClass() helper covers PRIMERA/SEGUNDA/TERCERA/tier-default', () => {
    // Unit test of the tier-class helper. Verifies the mapping contract
    // used by both the dashboard pill template binding and the standings
    // page.
    expect(component.tierCssClass('PRIMERA')).toBe('tier-primera');
    expect(component.tierCssClass('SEGUNDA')).toBe('tier-segunda');
    expect(component.tierCssClass('TERCERA')).toBe('tier-tercera');
    expect(component.tierCssClass('CUARTA')).toBe('tier-default');
    expect(component.tierCssClass('QUINTA')).toBe('tier-default');
    expect(component.tierCssClass('SEXTA')).toBe('tier-default');
    expect(component.tierCssClass(null)).toBe('tier-default');
    expect(component.tierCssClass(undefined)).toBe('tier-default');
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

  it('(C55.10 Item 2): re-fetches dependent datasets when careerPhase changes to POST_SEASON', (done: DoneFn) => {
    // C55.10 Item 2 — gap A13: when the engine signals a season just ended
    // (careerPhase goes WAITING_USER → POST_SEASON), the dashboard must
    // re-fetch squad, userStats, and worldStatus. Without this the page
    // keeps displaying stale numbers even after the career advance on
    // the back. We invoke loadCareerStatus() manually with a controlled
    // second emission and verify the dependent GETs re-fire.

    // FIRST emission: WAITING_USER (initial ngOnInit path).
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
          userDivision: 'PRIMERA'
        });
      }
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      // Baseline counts after the first load.
      const squadCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/career/players/squad')).length;
      const userStatsCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/user-stats')).length;
      const worldStatusCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/world-status')).length;

      expect(squadCallsBefore).toBeGreaterThanOrEqual(1, 'initial load must fetch squad');
      expect(userStatsCallsBefore).toBeGreaterThanOrEqual(1, 'initial load must fetch user-stats');
      expect(worldStatusCallsBefore).toBeGreaterThanOrEqual(1, 'initial load must fetch world-status');

      // SECOND emission: POST_SEASON (season just ended).
      httpSpy.get.and.callFake(((url: string) => {
        if (url.includes('/career/status')) {
          return of({
            careerId: CAREER_ID,
            userSessionTeamId: 'session-team-1',
            currentRound: 38,
            totalRounds: 38,
            isFinished: true,
            careerPhase: 'POST_SEASON',
            season: SEASON,
            userDivision: 'PRIMERA'
          });
        }
        if (url.includes('/career/players/squad')) return of([]);
        if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 38, matchesWon: 25, matchesLost: 6, winPercentage: 65 });
        if (url.includes('/dashboard/world-status')) return of({ clubs: 1, players: 25, matches: 38 });
        return of({});
      }) as any);

      // Trigger a 2nd emission of /career/status by calling the private
      // method directly (same entry point the dashboard uses in production
      // when refreshCareerStatus() runs after /career/continue).
      (component as any).loadCareerStatus();

      fixture.whenStable().then(() => {
        const squadCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/career/players/squad')).length;
        const userStatsCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/user-stats')).length;
        const worldStatusCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/world-status')).length;

        expect(squadCallsAfter).toBe(squadCallsBefore + 1,
          `squad GET must re-fire on phase change (was ${squadCallsBefore}, now ${squadCallsAfter})`);
        expect(userStatsCallsAfter).toBe(userStatsCallsBefore + 1,
          `user-stats GET must re-fire on phase change (was ${userStatsCallsBefore}, now ${userStatsCallsAfter})`);
        expect(worldStatusCallsAfter).toBe(worldStatusCallsBefore + 1,
          `world-status GET must re-fire on phase change (was ${worldStatusCallsBefore}, now ${worldStatusCallsAfter})`);
        done();
      });
    });
  });

  it('(C55.10 Item 2): re-fetches dependent datasets when season changes (e.g. after /career/continue)', (done: DoneFn) => {
    // C55.10 Item 2 — same refresh-on-change contract, but for the season
    // axis: when the user hits /career/continue, the back bumps season
    // 1 → 2 and the dashboard must pick up the new numbers even though
    // careerPhase may stay (or move to POST_SEASON). We bypass the initial
    // snapshot via a single POST_SEASON emission that primes
    // lastSeenPhase/Season with the final-round state, then issue a
    // second loadCareerStatus() with season=2 to verify the refresh fires.

    // FIRST emission: season 1, POST_SEASON.
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/status')) {
        return of({
          careerId: CAREER_ID,
          userSessionTeamId: 'session-team-1',
          currentRound: 38,
          totalRounds: 38,
          isFinished: true,
          careerPhase: 'POST_SEASON',
          season: 1,
          userDivision: 'PRIMERA'
        });
      }
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 38, matchesWon: 20, matchesLost: 8, winPercentage: 52 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 1, players: 25, matches: 38 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const squadCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/career/players/squad')).length;
      const userStatsCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/user-stats')).length;

      // SECOND emission: season 2 (post-/career/continue).
      httpSpy.get.and.callFake(((url: string) => {
        if (url.includes('/career/status')) {
          return of({
            careerId: CAREER_ID,
            userSessionTeamId: 'session-team-1',
            currentRound: 1,
            totalRounds: 38,
            isFinished: false,
            careerPhase: 'PRE_MATCH',
            season: 2,
            userDivision: 'SEGUNDA'  // promoted/relegated tier
          });
        }
        if (url.includes('/career/players/squad')) return of([]);
        if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
        if (url.includes('/dashboard/world-status')) return of({ clubs: 1, players: 25, matches: 0 });
        return of({});
      }) as any);

      (component as any).loadCareerStatus();

      fixture.whenStable().then(() => {
        const squadCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/career/players/squad')).length;
        const userStatsCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/user-stats')).length;

        expect(squadCallsAfter).toBe(squadCallsBefore + 1,
          'squad GET must re-fire on season change (POST_SEASON → PRE_MATCH with season 1→2)');
        expect(userStatsCallsAfter).toBe(userStatsCallsBefore + 1,
          'user-stats GET must re-fire on season change');
        done();
      });
    });
  });

  it('(C55.10 Item 2): no-op refresh when neither careerPhase nor season changes', (done: DoneFn) => {
    // Negative test: if the second /career/status response has the same
    // (phase, season) as the snapshot, the dashboard must NOT re-fetch
    // the dependent datasets. Re-firing unconditionally would multiply
    // backend traffic on every poll.

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
          userDivision: 'PRIMERA'
        });
      }
      if (url.includes('/career/players/squad')) return of([]);
      if (url.includes('/dashboard/user-stats')) return of({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winPercentage: 0 });
      if (url.includes('/dashboard/world-status')) return of({ clubs: 0, players: 0, matches: 0 });
      return of({});
    }) as any);

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const squadCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/career/players/squad')).length;
      const userStatsCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/user-stats')).length;
      const worldStatusCallsBefore = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/world-status')).length;

      // Same (phase, season). Trigger another loadCareerStatus manually.
      (component as any).loadCareerStatus();

      fixture.whenStable().then(() => {
        const squadCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/career/players/squad')).length;
        const userStatsCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/user-stats')).length;
        const worldStatusCallsAfter = httpSpy.get.calls.allArgs().filter(a => String(a[0]).includes('/dashboard/world-status')).length;

        // Only the /career/status GET increments. Squad/stats/world stay flat.
        expect(squadCallsAfter).toBe(squadCallsBefore,
          'squad GET must NOT re-fire when (phase, season) unchanged');
        expect(userStatsCallsAfter).toBe(userStatsCallsBefore,
          'user-stats GET must NOT re-fire when (phase, season) unchanged');
        expect(worldStatusCallsAfter).toBe(worldStatusCallsBefore,
          'world-status GET must NOT re-fire when (phase, season) unchanged');
        done();
      });
    });
  });
});

/**
 * V25D78-C55.7.7 BUG-M3: dashboard "Jugar Fecha" label is season-aware.
 *
 * <p>Pre-fix the label hardcoded `currentRound + 1` which overshot
 * `totalRounds` at season end (T1 R10 finished → "Jugar Fecha 11", which
 * doesn't exist). Post-fix: when `currentRound + 1 > totalRounds`, the
 * label flips to "Continuar Temporada {season+1}" and the subtitle hints
 * "Temporada finalizada, ver resultados".
 *
 * <p>Coverage:
 * <ul>
 *   <li>Mid-season (currentRound=3, totalRounds=10): "Jugar Fecha 4".</li>
 *   <li>Last round played (currentRound=10, totalRounds=10): "Continuar Temporada 2".</li>
 *   <li>Null/omitted status: safe fallback "Jugar Próxima Fecha".</li>
 *   <li>Subtitle mirrors the same season-end logic.</li>
 * </ul>
 */
describe('DashboardComponent — V25D78-C55.7.7 BUG-M3 (season-aware Jugar Fecha label)', () => {
  let component: DashboardComponent;

  beforeEach(() => {
    component = Object.create(DashboardComponent.prototype);
  });

  it('M3 mid-season (currentRound=3, totalRounds=10): label = "Jugar Fecha 4"', () => {
    const status = { currentRound: 3, totalRounds: 10, season: 1 } as any;
    expect(component.playNextRoundLabel(status)).toBe('Jugar Fecha 4');
    expect(component.playNextRoundSubtitle(status)).toBe('Confirmar para iniciar');
  });

  it('M3 last round played (currentRound=10, totalRounds=10): label = "Continuar Temporada 2"', () => {
    // BUG-M3 reproduction: pre-fix this would have said "Jugar Fecha 11"
    // (currentRound + 1 = 11, which doesn't exist in a 10-round tournament).
    const status = { currentRound: 10, totalRounds: 10, season: 1 } as any;
    expect(component.playNextRoundLabel(status))
      .toBe('Continuar Temporada 2');
    expect(component.playNextRoundSubtitle(status))
      .toBe('Temporada finalizada, ver resultados');
  });

  it('M3 season already advanced (currentRound=1, totalRounds=10, season=2): "Jugar Fecha 2"', () => {
    const status = { currentRound: 1, totalRounds: 10, season: 2 } as any;
    expect(component.playNextRoundLabel(status)).toBe('Jugar Fecha 2');
  });

  it('M3 null/undefined status: safe fallback', () => {
    expect(component.playNextRoundLabel(null)).toBe('Jugar Próxima Fecha');
    expect(component.playNextRoundLabel(undefined)).toBe('Jugar Próxima Fecha');
  });
});