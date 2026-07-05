/**
 * LIVE-MATCH-F5.3.4: unit tests for {@link LiveMatchModalsService}.
 *
 * <p>Validates the F5.3 BUG-015 pause/resume wiring:
 * <ul>
 *   <li>{@code openSubstitutionModal} calls
 *       {@code engineService.pauseRoundForMatch(careerId, matchId)} BEFORE
 *       {@code dialog.open(...)} so the round freezes while the manager
 *       prepares the sub.</li>
 *   <li>{@code dialog.afterClosed()} triggers
 *       {@code engineService.resumeRoundForMatch(careerId, matchId)} so the
 *       round resumes whether the manager confirms OR cancels.</li>
 *   <li>{@code openFormationModal} has the same pause/resume wiring
 *       (F5.3.3 scope decision: "modal de sustitución O de formación").</li>
 *   <li>{@code openPartidoModal} (V25D89-FRONT-A) has the same pause/resume
 *       wiring — the new dual-tab Partido modal (Mi Formación editable +
 *       Formación Rival read-only) freezes the round while open.</li>
 *   <li>If the URL doesn't match {@code /games/{careerId}/...} the service
 *       skips the pause call and logs a warning instead of crashing.</li>
 * </ul>
 *
 * <p>The rest of the F3-UI-LIVE FE6 service behavior (lineup/squad fetch
 * + dialog data shape) is exercised via {@link SubstitutionModalComponent}
 * and {@link FormationModalComponent} specs and is out of scope here.
 */

import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';

import { LiveMatchModalsService } from './live-match-modals.service';
import { CareerService } from './career.service';
import { TeamService } from '../../features/teams/services/team.service';
import { MatchEngineService } from './match-engine.service';
import { MatchState } from './match-engine.model';

const RUNNING_STATE: MatchState = {
  matchId: 'match-1',
  homeTeamId: 'team-h',
  awayTeamId: 'team-a',
  currentMinute: 73,
  status: 'RUNNING',
  score: { home: 1, away: 0 },
  homePossession: 55,
  awayPossession: 45,
  homeStyle: 'BALANCED',
  awayStyle: 'BALANCED',
  homeFormation: '4-4-2',
  awayFormation: '4-4-2',
  homeTactic: 'BALANCED',
  awayTactic: 'BALANCED',
  events: [],
  cards: [],
  substitutions: [],
  players: []
};

describe('LiveMatchModalsService — LIVE-MATCH-F5.3 BUG-015 (pause on modal open)', () => {
  let service: LiveMatchModalsService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<unknown>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let teamServiceSpy: jasmine.SpyObj<TeamService>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let routerStub: { url: string };

  // Subject so the test can drive dialog afterClosed() when it wants.
  let afterClosedSubject: Subject<unknown>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close', 'afterClosed']);
    afterClosedSubject = new Subject<unknown>();
    dialogRefSpy.afterClosed.and.returnValue(afterClosedSubject.asObservable());

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue(dialogRefSpy);

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    careerServiceSpy = jasmine.createSpyObj('CareerService', ['getCareerStatus']);
    teamServiceSpy = jasmine.createSpyObj('TeamService', ['getMyTeamSquad']);

    // The new F5.3.3 methods we want to assert on.
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', [
      'pauseRoundForMatch',
      'resumeRoundForMatch',
      'substitutePlayer',
      'changeFormation'
    ]);
    engineServiceSpy.pauseRoundForMatch.and.returnValue(of({ success: true }));
    engineServiceSpy.resumeRoundForMatch.and.returnValue(of({ success: true }));

    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerPhase: 'LIVE',
      totalRounds: 38,
      currentRound: 12,
      userSessionTeamId: 'team-h',
      currentSeason: 1
    } as any));

    teamServiceSpy.getMyTeamSquad.and.returnValue(of([
      { sessionPlayerId: 'b1', name: 'Bench 1', position: 'DEF' },
      { sessionPlayerId: 'b2', name: 'Bench 2', position: 'ATT' }
    ] as any));

    // Lineup endpoint returns the starting XI plus the 2 bench players above.
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({
          players: [
            { playerId: 's1', name: 'Starter 1', position: 'GK',  overall: 80 },
            { playerId: 's2', name: 'Starter 2', position: 'DEF', overall: 75 },
            { playerId: 's3', name: 'Starter 3', position: 'MID', overall: 78 }
          ]
        });
      }
      return of([]);
    }) as any);

    routerStub = { url: '/games/career-abc/round/12/live' };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        LiveMatchModalsService,
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: HttpClient, useValue: httpSpy },
        { provide: CareerService, useValue: careerServiceSpy },
        { provide: TeamService, useValue: teamServiceSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: Router, useValue: routerStub }
      ]
    }).compileComponents();

    service = TestBed.inject(LiveMatchModalsService);
  });

  // ========== openSubstitutionModal ==========

  it('openSubstitutionModal — calls engineService.pauseRoundForMatch BEFORE dialog.open', (done) => {
    const callOrder: string[] = [];
    engineServiceSpy.pauseRoundForMatch.and.callFake(() => {
      callOrder.push('pause');
      return of({ success: true });
    });
    dialogSpy.open.and.callFake(() => {
      callOrder.push('dialog.open');
      return dialogRefSpy;
    });

    service.openSubstitutionModal('match-1', RUNNING_STATE).subscribe(() => {
      // The pause call must happen BEFORE the dialog opens (so the
      // `currentMinute` the manager saw is still current when they confirm).
      expect(callOrder[0]).toBe('pause');
      expect(engineServiceSpy.pauseRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
      done();
    });
  });

  it('openSubstitutionModal — dialog.afterClosed() triggers engineService.resumeRoundForMatch', (done) => {
    service.openSubstitutionModal('match-1', RUNNING_STATE).subscribe(() => {
      // Resume hasn't fired yet — the manager is still in the modal.
      expect(engineServiceSpy.resumeRoundForMatch).not.toHaveBeenCalled();

      // Now the manager closes the dialog (e.g. confirmed).
      afterClosedSubject.next(undefined);

      expect(engineServiceSpy.resumeRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
      done();
    });
  });

  it('openSubstitutionModal — resume fires on cancel too (afterClosed emits regardless of result)', (done) => {
    service.openSubstitutionModal('match-1', RUNNING_STATE).subscribe(() => {
      afterClosedSubject.next(undefined); // simulate cancel
      expect(engineServiceSpy.resumeRoundForMatch).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('openSubstitutionModal — if URL has no careerId, skip pause (warn) and skip resume', (done) => {
    routerStub.url = '/squad';
    const warn = spyOn(console, 'warn');

    service.openSubstitutionModal('match-1', RUNNING_STATE).subscribe(() => {
      expect(engineServiceSpy.pauseRoundForMatch).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/could not resolve careerId/)
      );
      afterClosedSubject.next(undefined);
      // No resume either — we never paused.
      expect(engineServiceSpy.resumeRoundForMatch).not.toHaveBeenCalled();
      done();
    });
  });

  it('openSubstitutionModal — short-circuits (no pause) if match is FINISHED', (done) => {
    const finished = { ...RUNNING_STATE, status: 'FINISHED' as const };

    service.openSubstitutionModal('match-1', finished).subscribe({
      complete: () => {
        expect(engineServiceSpy.pauseRoundForMatch).not.toHaveBeenCalled();
        expect(snackBarSpy.open).toHaveBeenCalled();
        done();
      }
    });
  });

  // ========== openFormationModal ==========

  it('openFormationModal — calls engineService.pauseRoundForMatch BEFORE dialog.open', (done) => {
    const callOrder: string[] = [];
    engineServiceSpy.pauseRoundForMatch.and.callFake(() => {
      callOrder.push('pause');
      return of({ success: true });
    });
    dialogSpy.open.and.callFake(() => {
      callOrder.push('dialog.open');
      return dialogRefSpy;
    });

    service.openFormationModal('match-1', RUNNING_STATE).subscribe(() => {
      expect(callOrder[0]).toBe('pause');
      expect(engineServiceSpy.pauseRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
      done();
    });
  });

  it('openFormationModal — dialog.afterClosed() triggers engineService.resumeRoundForMatch', (done) => {
    service.openFormationModal('match-1', RUNNING_STATE).subscribe(() => {
      expect(engineServiceSpy.resumeRoundForMatch).not.toHaveBeenCalled();
      afterClosedSubject.next(undefined);
      expect(engineServiceSpy.resumeRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
      done();
    });
  });

  // ========== openPartidoModal (V25D89-FRONT-A) ==========

  it('openPartidoModal — calls engineService.pauseRoundForMatch BEFORE dialog.open', (done) => {
    const callOrder: string[] = [];
    engineServiceSpy.pauseRoundForMatch.and.callFake(() => {
      callOrder.push('pause');
      return of({ success: true });
    });
    dialogSpy.open.and.callFake(() => {
      callOrder.push('dialog.open');
      return dialogRefSpy;
    });

    service.openPartidoModal('match-1', RUNNING_STATE).subscribe(() => {
      expect(callOrder[0]).toBe('pause');
      expect(engineServiceSpy.pauseRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
      done();
    });
  });

  it('openPartidoModal — dialog.afterClosed() triggers engineService.resumeRoundForMatch', (done) => {
    service.openPartidoModal('match-1', RUNNING_STATE).subscribe(() => {
      expect(engineServiceSpy.resumeRoundForMatch).not.toHaveBeenCalled();
      afterClosedSubject.next(undefined);
      expect(engineServiceSpy.resumeRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
      done();
    });
  });

  it('openPartidoModal — short-circuits (no pause) if match is FINISHED', (done) => {
    const finished = { ...RUNNING_STATE, status: 'FINISHED' as const };

    service.openPartidoModal('match-1', finished).subscribe({
      complete: () => {
        expect(engineServiceSpy.pauseRoundForMatch).not.toHaveBeenCalled();
        expect(snackBarSpy.open).toHaveBeenCalled();
        done();
      }
    });
  });

  it('openPartidoModal — passes the rivalFormation from state.awayFormation to the dialog data', (done) => {
    const away433 = { ...RUNNING_STATE, awayFormation: '4-3-3' };
    service.openPartidoModal('match-1', away433).subscribe(() => {
      // dialog.open was called with the PartidoDialogData including rivalFormation
      expect(dialogSpy.open).toHaveBeenCalled();
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.rivalFormation).toBe('4-3-3');
      done();
    });
  });

  it('openPartidoModal — falls back to 4-4-2 when state.awayFormation is missing', (done) => {
    const noAway = { ...RUNNING_STATE, awayFormation: undefined as any };
    service.openPartidoModal('match-1', noAway).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.rivalFormation).toBe('4-4-2');
      done();
    });
  });
});