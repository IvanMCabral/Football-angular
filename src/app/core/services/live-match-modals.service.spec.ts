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
      'changeFormation',
      'getMatchState'
    ]);
    engineServiceSpy.pauseRoundForMatch.and.returnValue(of({ success: true }));
    engineServiceSpy.resumeRoundForMatch.and.returnValue(of({ success: true }));
    engineServiceSpy.getMatchState.and.returnValue(of(RUNNING_STATE));

    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerPhase: 'LIVE',
      totalRounds: 38,
      currentRound: 12,
      userSessionTeamId: 'team-h',
      currentSeason: 1
    } as any));

    teamServiceSpy.getMyTeamSquad.and.returnValue(of([
      { sessionPlayerId: 'b1', name: 'Bench 1', position: 'DEF', attack: 60, defense: 76, technique: 62, speed: 65, stamina: 70, mentality: 68 },
      { sessionPlayerId: 'b2', name: 'Bench 2', position: 'ATT', attack: 82, defense: 45, technique: 76, speed: 80, stamina: 72, mentality: 70 }
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

  it('openSubstitutionModal — opens without re-pausing when match is already PAUSED', (done) => {
    const paused = { ...RUNNING_STATE, status: 'PAUSED' as const };
    engineServiceSpy.getMatchState.and.returnValue(of(paused));

    service.openSubstitutionModal('match-1', paused).subscribe(() => {
      expect(engineServiceSpy.pauseRoundForMatch).not.toHaveBeenCalled();
      expect(dialogSpy.open).toHaveBeenCalled();
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

  it('openSubstitutionModal applies backend relatedPlayer substitution to the next modal XI/bench', (done) => {
    teamServiceSpy.getMyTeamSquad.and.returnValue(of([
      { sessionPlayerId: 's2', name: 'Starter 2', position: 'DEF', attack: 60, defense: 75, technique: 62, speed: 65, stamina: 70, mentality: 68 },
      { sessionPlayerId: 'b1', name: 'Bench 1', position: 'DEF', attack: 60, defense: 76, technique: 62, speed: 65, stamina: 70, mentality: 68 },
      { sessionPlayerId: 'b2', name: 'Bench 2', position: 'ATT', attack: 82, defense: 45, technique: 76, speed: 80, stamina: 72, mentality: 70 }
    ] as any));
    const stateAfterSub: MatchState = {
      ...RUNNING_STATE,
      substitutionsRemaining: 4,
      events: [
        {
          eventType: 'SUBSTITUTION',
          minute: 23,
          playerId: 's2',
          playerName: 'Starter 2',
          relatedPlayerId: 'b1',
          relatedPlayerName: 'Bench 1',
          teamId: 'team-h',
          description: 'Starter 2 -> Bench 1'
        }
      ]
    };
    engineServiceSpy.getMatchState.and.returnValue(of(stateAfterSub));

    service.openSubstitutionModal('match-1', stateAfterSub).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.startingXi.map((p: any) => p.displayName)).toEqual([
        'Starter 1',
        'Bench 1',
        'Starter 3'
      ]);
      expect(dataArg.bench.map((p: any) => p.displayName)).not.toContain('Bench 1');
      expect(dataArg.bench.map((p: any) => p.displayName))
        .withContext('a player already substituted off cannot re-enter from the bench')
        .not.toContain('Starter 2');
      expect(dataArg.substitutionsRemaining).toBe(4);
      done();
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
    service.openFormationModal('match-1', RUNNING_STATE).subscribe({
      next: () => {
          expect(engineServiceSpy.resumeRoundForMatch).not.toHaveBeenCalled();
          setTimeout(() => {
            afterClosedSubject.next(undefined);
            afterClosedSubject.complete();
          }, 0);
      },
      complete: () => {
        expect(engineServiceSpy.resumeRoundForMatch).toHaveBeenCalledWith('career-abc', 'match-1');
        done();
      }
    });
  });

  it('openFormationModal — opens without re-pausing when match is already PAUSED', (done) => {
    const paused = { ...RUNNING_STATE, status: 'PAUSED' as const };
    engineServiceSpy.getMatchState.and.returnValue(of(paused));

    service.openFormationModal('match-1', paused).subscribe(() => {
      expect(engineServiceSpy.pauseRoundForMatch).not.toHaveBeenCalled();
      expect(dialogSpy.open).toHaveBeenCalled();
      done();
    });
  });

  it('openFormationModal applies previous live substitution to current slots', (done) => {
    const stateAfterSub: MatchState = {
      ...RUNNING_STATE,
      homeSlots: [
        { sessionPlayerId: 's1', position: 'GK', slotIndex: 0 },
        { sessionPlayerId: 's2', position: 'DEF', slotIndex: 1 },
        { sessionPlayerId: 's3', position: 'MID', slotIndex: 2 }
      ],
      events: [
        {
          eventType: 'SUBSTITUTION',
          minute: 23,
          playerId: 's2',
          playerName: 'Starter 2',
          relatedPlayerId: 'b1',
          relatedPlayerName: 'Bench 1',
          teamId: 'team-h',
          description: 'Starter 2 -> Bench 1'
        }
      ]
    };
    engineServiceSpy.getMatchState.and.returnValue(of(stateAfterSub));

    service.openFormationModal('match-1', stateAfterSub).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.currentSlots.map((slot: any) => slot.sessionPlayerId)).toEqual([
        's1',
        'b1',
        's3'
      ]);
      expect(Array.from(dataArg.startingIds)).toEqual(['s1', 'b1', 's3']);
      done();
    });
  });

  it('openFormationModal hydrates placeholder tactical ids by player name before opening', (done) => {
    teamServiceSpy.getMyTeamSquad.and.returnValue(of([
      { sessionPlayerId: 'gk-real', name: 'Starter 1', position: 'GK', attack: 20, defense: 80, technique: 70, speed: 50, stamina: 70, mentality: 80 },
      { sessionPlayerId: 'def-real', name: 'Starter 2', position: 'DEF', attack: 45, defense: 76, technique: 62, speed: 65, stamina: 70, mentality: 68 },
      { sessionPlayerId: 'mid-real', name: 'Starter 3', position: 'MID', attack: 70, defense: 65, technique: 78, speed: 72, stamina: 75, mentality: 74 }
    ] as any));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({
          players: [
            { playerId: 'GK', name: 'Starter 1', position: 'GK', overall: 80 },
            { playerId: 'CB', name: 'Starter 2', position: 'DEF', overall: 75 },
            { playerId: 'CM', name: 'Starter 3', position: 'MID', overall: 78 }
          ]
        });
      }
      return of([]);
    }) as any);

    service.openFormationModal('match-1', RUNNING_STATE).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.currentSlots.map((slot: any) => slot.sessionPlayerId)).toEqual([
        'gk-real',
        'def-real',
        'mid-real'
      ]);
      done();
    });
  });

  it('openPartidoModal does not hydrate two same-name slots to the same player id', (done) => {
    teamServiceSpy.getMyTeamSquad.and.returnValue(of([
      { sessionPlayerId: 'marvin-real', name: 'Marvin Park', position: 'MID', attack: 70, defense: 62, technique: 73, speed: 75, stamina: 78, mentality: 70 },
      { sessionPlayerId: 'alberto-real', name: 'Alberto Moleiro', position: 'MID', attack: 74, defense: 55, technique: 80, speed: 76, stamina: 74, mentality: 72 }
    ] as any));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({
          players: [
            { playerId: 'slot-lm', name: 'Marvin Park', position: 'LM', overall: 72 },
            { playerId: 'slot-cm', name: 'Marvin Park', position: 'CM', overall: 72 },
            { playerId: 'alberto-real', name: 'Alberto Moleiro', position: 'RM', overall: 76 }
          ]
        });
      }
      return of([]);
    }) as any);

    service.openPartidoModal('match-1', RUNNING_STATE).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      const ids = dataArg.currentSlots.map((slot: any) => slot.sessionPlayerId);
      expect(ids).toEqual(['marvin-real', 'slot-cm', 'alberto-real']);
      expect(new Set(ids).size).toBe(ids.length);
      done();
    });
  });

  it('openFormationModal includes live starters in modal squad when squad endpoint is empty', (done) => {
    teamServiceSpy.getMyTeamSquad.and.returnValue(of([] as any));

    service.openFormationModal('match-1', RUNNING_STATE).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.currentSlots.map((slot: any) => slot.sessionPlayerId)).toEqual(['s1', 's2', 's3']);
      expect(dataArg.squad.map((player: any) => player.sessionPlayerId)).toEqual(['s1', 's2', 's3']);
      expect(dataArg.squad.map((player: any) => player.name)).toEqual(['Starter 1', 'Starter 2', 'Starter 3']);
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

  it('openPartidoModal — does not resume after close while debug freeze is enabled', (done) => {
    localStorage.setItem('manager.debugFreezeLiveRound', '1');
    service.openPartidoModal('match-1', RUNNING_STATE).subscribe(() => {
      afterClosedSubject.next(undefined);
      expect(engineServiceSpy.resumeRoundForMatch).not.toHaveBeenCalled();
      localStorage.removeItem('manager.debugFreezeLiveRound');
      done();
    });
  });

  it('openPartidoModal — opens without re-pausing when match is already PAUSED', (done) => {
    const paused = { ...RUNNING_STATE, status: 'PAUSED' as const };
    engineServiceSpy.getMatchState.and.returnValue(of(paused));

    service.openPartidoModal('match-1', paused).subscribe(() => {
      expect(engineServiceSpy.pauseRoundForMatch).not.toHaveBeenCalled();
      expect(dialogSpy.open).toHaveBeenCalled();
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
    engineServiceSpy.getMatchState.and.returnValue(of(away433));
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
    engineServiceSpy.getMatchState.and.returnValue(of(noAway));
    service.openPartidoModal('match-1', noAway).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.rivalFormation).toBe('4-4-2');
      done();
    });
  });
  it('openPartidoModal - passes live tactical slots with custom pixels to the dialog', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `s${i + 1}`,
      name: `Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    const liveState = {
      ...RUNNING_STATE,
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i,
        customXPercent: player.playerId === 's7' ? 41 : null,
        customYPercent: player.playerId === 's7' ? 66.7 : null
      }))
    };
    engineServiceSpy.getMatchState.and.returnValue(of(liveState));

    service.openPartidoModal('match-1', liveState).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      const moved = dataArg.currentSlots.find((slot: any) => slot.sessionPlayerId === 's7');
      expect(dataArg.currentSlots.length).toBe(11);
      expect(moved.customXPercent).toBe(41);
      expect(moved.customYPercent).toBe(66.7);
      done();
    });
  });

  it('openPartidoModal remembers saved Partido pixels when the next live snapshot is stale', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `s${i + 1}`,
      name: `Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    const staleState = {
      ...RUNNING_STATE,
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i,
        customXPercent: player.playerId === 's7' ? 22 : null,
        customYPercent: player.playerId === 's7' ? 66.7 : null
      }))
    };
    engineServiceSpy.getMatchState.and.returnValue(of(staleState));

    (service as any).rememberPartidoSavedSlots('match-1', {
      success: true,
      result: {
        success: true,
        currentFormation: xi.map((player, i) => ({
          playerId: player.playerId,
          position: player.position,
          slotIndex: i,
          customXPercent: player.playerId === 's7' ? 23 : null,
          customYPercent: player.playerId === 's7' ? 65.7 : null
        }))
      }
    });

    service.openPartidoModal('match-1', staleState).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      const moved = dataArg.currentSlots.find((slot: any) => slot.sessionPlayerId === 's7');
      expect(moved.customXPercent).toBe(23);
      expect(moved.customYPercent).toBe(65.7);
      done();
    });
  });

  it('openPartidoModal trusts saved Partido slots when the next live snapshot has incomplete tactical slots', (done) => {
    const savedXi = Array.from({ length: 11 }, (_, i) => ({
      playerId: i === 1 ? 'alex' : `s${i}`,
      name: i === 1 ? 'Alex Suarez' : `Starter ${i}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: savedXi });
      }
      return of([]);
    }) as any);
    teamServiceSpy.getMyTeamSquad.and.returnValue(of(savedXi.map(player => ({
      sessionPlayerId: player.playerId,
      name: player.name,
      position: player.position,
      attack: 70,
      defense: 70,
      technique: 70,
      speed: 70,
      stamina: 70,
      mentality: 70
    })) as any));

    (service as any).rememberPartidoSavedSlots('match-1', {
      success: true,
      result: { success: true },
      savedSlots: savedXi.map((player, i) => ({
        sessionPlayerId: player.playerId,
        position: player.position,
        slotIndex: i
      }))
    });

    const staleLiveState = {
      ...RUNNING_STATE,
      homeSlots: savedXi
        .filter(player => player.playerId !== 'alex')
        .map((player, i) => ({
          playerId: player.playerId,
          position: player.position,
          slotIndex: i < 1 ? i : i + 1
        }))
    };
    engineServiceSpy.getMatchState.and.returnValue(of(staleLiveState as any));

    service.openPartidoModal('match-1', staleLiveState as any).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.currentSlots.length).toBe(11);
      expect(dataArg.currentSlots.find((slot: any) => slot.slotIndex === 1)?.sessionPlayerId).toBe('alex');
      expect(dataArg.currentSlots.some((slot: any) => !slot.sessionPlayerId)).toBeFalse();
      done();
    });
  });

  it('openPartidoModal includes live starters in modal squad so every slot can render a player card', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `live-${i + 1}`,
      name: `Live Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    teamServiceSpy.getMyTeamSquad.and.returnValue(of([] as any));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    const liveState = {
      ...RUNNING_STATE,
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i
      }))
    };
    engineServiceSpy.getMatchState.and.returnValue(of(liveState));

    service.openPartidoModal('match-1', liveState).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.currentSlots.length).toBe(11);
      expect(dataArg.squad.map((player: any) => player.sessionPlayerId)).toEqual(
        xi.map(player => player.playerId)
      );
      done();
    });
  });

  it('openPartidoModal discounts locally confirmed substitutions while SSE remaining is stale', (done) => {
    service.openSubstitutionModal('match-1', { ...RUNNING_STATE, substitutionsRemaining: 5 }).subscribe(() => {
      afterClosedSubject.next({
        success: true,
        substitutions: [
          { playerOffId: 's2', playerOnId: 'b1' },
          { playerOffId: 's3', playerOnId: 'b2' }
        ]
      });

      service.openPartidoModal('match-1', { ...RUNNING_STATE, substitutionsRemaining: 5 }).subscribe(() => {
        const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
        expect(dataArg.substitutionsRemaining)
          .withContext('Partido should show 3/5 after two locally confirmed substitutions even before SSE catches up')
          .toBe(3);
        done();
      });
    });
  });

  it('openPartidoModal keeps manager substitutions separate from opponent substitutions', (done) => {
    service.openSubstitutionModal('match-1', { ...RUNNING_STATE, substitutionsRemaining: 5 }).subscribe(() => {
      afterClosedSubject.next({
        success: true,
        substitutions: [
          { playerOffId: 's2', playerOnId: 'b1' }
        ]
      });

      const stateAfterOpponentSub = {
        ...RUNNING_STATE,
        substitutionsRemaining: 3,
        events: [
          {
            eventType: 'SUBSTITUTION',
            minute: 1,
            teamId: 'team-a',
            playerId: 'opp-off',
            relatedPlayerId: 'opp-on'
          } as any
        ]
      };

      service.openPartidoModal('match-1', stateAfterOpponentSub).subscribe(() => {
        const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
        expect(dataArg.substitutionsRemaining)
          .withContext('Opponent substitutions must not reduce the manager quota shown in Partido')
          .toBe(4);
        done();
      });
    });
  });

  it('openPartidoModal remembers savedSlots when backend does not return currentFormation', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `s${i + 1}`,
      name: `Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    const staleState = {
      ...RUNNING_STATE,
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i,
        customXPercent: player.playerId === 's7' ? 83.3 : null,
        customYPercent: player.playerId === 's7' ? 61 : null
      }))
    };
    engineServiceSpy.getMatchState.and.returnValue(of(staleState));

    (service as any).rememberPartidoSavedSlots('match-1', {
      success: true,
      result: { success: true },
      savedSlots: xi.map((player, i) => ({
        sessionPlayerId: player.playerId,
        position: player.position,
        slotIndex: i,
        customXPercent: player.playerId === 's7' ? 84.3 : null,
        customYPercent: player.playerId === 's7' ? 61 : null
      }))
    });

    service.openPartidoModal('match-1', staleState).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      const moved = dataArg.currentSlots.find((slot: any) => slot.sessionPlayerId === 's7');
      expect(moved.customXPercent).toBe(84.3);
      expect(moved.customYPercent).toBe(61);
      done();
    });
  });

  it('openPartidoModal remembers saved Partido formation while the paused live snapshot is stale', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `s${i + 1}`,
      name: `Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    const staleState = {
      ...RUNNING_STATE,
      homeFormation: '4-4-2',
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i
      }))
    };
    engineServiceSpy.getMatchState.and.returnValue(of(staleState));

    (service as any).rememberPartidoSavedSlots('match-1', {
      success: true,
      result: { success: true },
      formation: '4-3-3',
      savedSlots: xi.map((player, i) => ({
        sessionPlayerId: player.playerId,
        position: player.position,
        slotIndex: i
      }))
    });

    service.openPartidoModal('match-1', staleState).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.currentFormation).toBe('4-3-3');
      done();
    });
  });

  it('openPartidoModal overlays saved pixels for players still on pitch even if another slot changed', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `s${i + 1}`,
      name: `Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    const changedState = {
      ...RUNNING_STATE,
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i,
        customXPercent: player.playerId === 's7' ? 83.3 : null,
        customYPercent: player.playerId === 's7' ? 61 : null
      }))
    };
    changedState.homeSlots[5] = { playerId: 'new-mid', position: 'MID', slotIndex: 5 } as any;
    engineServiceSpy.getMatchState.and.returnValue(of(changedState));

    (service as any).rememberPartidoSavedSlots('match-1', {
      success: true,
      result: { success: true },
      savedSlots: xi.map((player, i) => ({
        sessionPlayerId: player.playerId,
        position: player.position,
        slotIndex: i,
        customXPercent: player.playerId === 's7' ? 84.3 : null,
        customYPercent: player.playerId === 's7' ? 61 : null
      }))
    });

    service.openPartidoModal('match-1', changedState).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      const moved = dataArg.currentSlots.find((slot: any) => slot.sessionPlayerId === 's7');
      expect(moved.customXPercent).toBe(84.3);
      expect(moved.customYPercent).toBe(61);
      done();
    });
  });

  it('openPartidoModal preserves local Debug Partido injury snapshot instead of overwriting it with backend state', (done) => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      playerId: `s${i + 1}`,
      name: `Starter ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75
    }));
    httpSpy.get.and.callFake(((url: string) => {
      if (url.includes('/career/lineup/current')) {
        return of({ players: xi });
      }
      return of([]);
    }) as any);
    teamServiceSpy.getMyTeamSquad.and.returnValue(of([
      ...xi.map(player => ({
        sessionPlayerId: player.playerId,
        name: player.name,
        position: player.position,
        attack: 70,
        defense: 70,
        technique: 70,
        speed: 70,
        stamina: 70,
        mentality: 70
      })),
      { sessionPlayerId: 'bench-att', name: 'Bench Att', position: 'ATT', attack: 78, defense: 40, technique: 72, speed: 76, stamina: 70, mentality: 70 }
    ] as any));
    const backendState = {
      ...RUNNING_STATE,
      homeSlots: xi.map((player, i) => ({
        playerId: player.playerId,
        position: player.position,
        slotIndex: i
      }))
    };
    const localDebugState = {
      ...backendState,
      homeSlots: backendState.homeSlots.filter((slot: any) => slot.playerId !== 's10'),
      events: [
        {
          eventType: 'INJURY',
          minute: 73,
          teamId: 'team-h',
          playerId: 's10',
          playerName: 'Starter 10',
          description: 'Debug Partido: lesion propia para s10'
        } as any
      ]
    };
    engineServiceSpy.getMatchState.and.returnValue(of(backendState as any));

    service.openPartidoModal('match-1', localDebugState as any).subscribe(() => {
      const dataArg = (dialogSpy.open.calls.mostRecent().args[1] as any)?.data;
      expect(dataArg.events[0].description).toContain('Debug Partido:');
      expect(dataArg.currentSlots.length)
        .withContext('The local debug snapshot must keep the empty tactical slot so Partido can AUTO-repair it')
        .toBe(10);
      expect(dataArg.currentSlots.map((slot: any) => slot.sessionPlayerId)).not.toContain('s10');
      done();
    });
  });

  it('ensureUniqueCurrentSlots replaces duplicate ids with an available squad player', () => {
    const slots = Array.from({ length: 11 }, (_, i) => ({
      sessionPlayerId: i === 6 ? 's6' : `s${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      slotIndex: i
    }));
    const squad = [
      ...Array.from({ length: 11 }, (_, i) => ({
        sessionPlayerId: `s${i + 1}`,
        name: `Starter ${i + 1}`,
        position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
        attack: 70,
        defense: 70,
        technique: 70,
        speed: 70,
        stamina: 70,
        mentality: 70
      })),
      { sessionPlayerId: 'bench-mid', name: 'Bench Mid', position: 'MID', attack: 70, defense: 70, technique: 70, speed: 70, stamina: 70, mentality: 70 }
    ];

    const result = (service as any).ensureUniqueCurrentSlots(slots, squad);
    const ids = result.map((slot: any) => slot.sessionPlayerId);
    expect(ids.length).toBe(11);
    expect(new Set(ids).size).toBe(11);
    expect(ids).toContain('s7');
  });
});
