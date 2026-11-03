/**
 * Unit tests for RoundSummaryComponent navigation from the round summary.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { RoundSummaryComponent } from './round-summary.component';
import { CareerService } from '../../core/services/career.service';
import { RoundSummaryViewModel } from './models/round-summary.model';

const SAMPLE_GAME_ID = 'game-abc';

describe('RoundSummaryComponent navigation', () => {
  let fixture: ComponentFixture<RoundSummaryComponent>;
  let component: RoundSummaryComponent;
  let router: Router;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;

  beforeEach(async () => {
    careerServiceSpy = jasmine.createSpyObj<CareerService>('CareerService', [
      'getCareerTeams',
      'getCareerStatus',
      'getFixturesByRoundWithBye',
      'getStandings',
      'invalidateCareerStatus'
    ]);
    careerServiceSpy.getCareerTeams.and.returnValue(of([]));
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: SAMPLE_GAME_ID,
      userSessionTeamId: '',
      currentRound: 2,
      totalRounds: 38,
      canAdvanceRound: true,
      careerPhase: 'WAITING_USER',
      season: 1
    } as any));
    careerServiceSpy.getFixturesByRoundWithBye.and.returnValue(of({ matches: [], byeTeam: null } as any));
    careerServiceSpy.getStandings.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RoundSummaryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(new Map([
          ['gameId', SAMPLE_GAME_ID],
          ['round', '2']
        ])) } },
        { provide: CareerService, useValue: careerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoundSummaryComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  it('shows loading instead of claiming the team is absent until standings arrive', () => {
    const standings = new Subject<any[]>();
    careerServiceSpy.getStandings.and.returnValue(standings);
    fixture.destroy();
    fixture = TestBed.createComponent(RoundSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando clasificación');
    expect(fixture.nativeElement.textContent).not.toContain('Tu equipo no está');
    standings.next([]);
    standings.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Cargando clasificación');
    expect(fixture.nativeElement.textContent).toContain('Tu equipo no está');
  });

  it('shows a standings error without fabricating a table from one round', () => {
    const standings = new Subject<any[]>();
    careerServiceSpy.getStandings.and.returnValue(standings);
    fixture.destroy();
    fixture = TestBed.createComponent(RoundSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    standings.error(new Error('synthetic failure'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar la clasificación');
    expect(fixture.nativeElement.textContent).not.toContain('Tu equipo no está');
    expect(fixture.nativeElement.querySelector('.standings-table')).toBeNull();
  });

  it('starts fixtures and standings while the teams request is still pending', () => {
    const teams = new Subject<any[]>();
    careerServiceSpy.getCareerTeams.and.returnValue(teams);
    careerServiceSpy.getFixturesByRoundWithBye.calls.reset();
    careerServiceSpy.getStandings.calls.reset();
    fixture.destroy();
    fixture = TestBed.createComponent(RoundSummaryComponent);
    expect(careerServiceSpy.getFixturesByRoundWithBye).toHaveBeenCalledTimes(1);
    expect(careerServiceSpy.getStandings).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(teams.observed).toBeFalse();
  });

  function setVm(vm: Partial<RoundSummaryViewModel>) {
    (component as any).vmSubject.next({
      gameId: SAMPLE_GAME_ID,
      roundNumber: 2,
      careerId: SAMPLE_GAME_ID,
      matches: [],
      standings: [],
      teamNameMap: {},
      userTeamId: '',
      userTeamName: '',
      userPosition: 0,
      careerPhase: 'WAITING_USER',
      tournamentStatus: null,
      errorMsg: '',
      byeTeam: null,
      ...vm
    });
  }

  function withStatusClock(round: number, assertions: () => void) {
    fixture.destroy();
    jasmine.clock().install();
    try {
      (TestBed.inject(ActivatedRoute).paramMap as BehaviorSubject<any>).next(new Map([
        ['gameId', SAMPLE_GAME_ID], ['round', String(round)]
      ]));
      fixture = TestBed.createComponent(RoundSummaryComponent);
      component = fixture.componentInstance;
      setVm({ roundNumber: round,
        matches: [{ matchId: 'completed', homeTeamId: 'a', awayTeamId: 'b',
          homeGoals: 1, awayGoals: 0, status: 'COMPLETED', isUserMatch: true }],
        tournamentStatus: { currentRound: round, totalRounds: 38, hasNextRound: round < 38,
          isFinished: false, canPlayCurrentRound: false, season: 1 } });
      careerServiceSpy.getCareerStatus.calls.reset();
      assertions();
    } finally {
      fixture.destroy();
      jasmine.clock().uninstall();
    }
  }

  const statusAt = (round: number, phase = 'WAITING_USER', season = 1) => ({
    careerId: SAMPLE_GAME_ID, currentRound: round, totalRounds: 38,
    careerPhase: phase, canAdvanceRound: phase === 'WAITING_USER', season
  } as any);

  it('does not fetch status again when a completed summary already has the advanced date', () => {
    careerServiceSpy.getCareerStatus.and.returnValue(of(statusAt(22)));
    careerServiceSpy.getFixturesByRoundWithBye.and.returnValue(of({ byeTeam: null, matches: [
      { matchId: 'done', homeTeamId: 'a', awayTeamId: 'b', status: 'COMPLETED', homeGoals: 1, awayGoals: 0 }
    ] } as any));
    withStatusClock(21, () => {
      jasmine.clock().tick(3000);
      expect(careerServiceSpy.getCareerStatus).not.toHaveBeenCalled();
      expect(careerServiceSpy.invalidateCareerStatus).not.toHaveBeenCalled();
    });
  });

  it('refreshes completed dates before round 21 until canonical status advances', () => {
    withStatusClock(20, () => {
      careerServiceSpy.getCareerStatus.and.returnValues(of(statusAt(20)), of(statusAt(21)));
      component.reloadCareerStatus();
      jasmine.clock().tick(0);
      jasmine.clock().tick(500);
      jasmine.clock().tick(3000);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(2);
      expect(careerServiceSpy.invalidateCareerStatus).toHaveBeenCalledTimes(2);
      expect((component as any).vmSubject.value.tournamentStatus.currentRound).toBe(21);
    });
  });

  it('does not retry an unplayed round 21 just because of its number', () => {
    withStatusClock(21, () => {
      setVm({ roundNumber: 21, matches: [], tournamentStatus: {
        currentRound: 21, totalRounds: 38, hasNextRound: true, isFinished: false,
        canPlayCurrentRound: true, season: 1 } });
      careerServiceSpy.getCareerStatus.and.returnValue(of(statusAt(21, 'PRE_MATCH')));
      component.reloadCareerStatus();
      jasmine.clock().tick(3000);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('waits for FINISHED at date 38 instead of declaring an early champion', () => {
    withStatusClock(38, () => {
      careerServiceSpy.getCareerStatus.and.returnValues(of(statusAt(38, 'POST_MATCH')), of(statusAt(38, 'FINISHED')));
      component.reloadCareerStatus();
      jasmine.clock().tick(0);
      expect((component as any).vmSubject.value.tournamentStatus.isFinished).toBeFalse();
      jasmine.clock().tick(500);
      expect((component as any).vmSubject.value.tournamentStatus.isFinished).toBeTrue();
      jasmine.clock().tick(3000);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(2);
    });
  });

  it('does not cancel or overlap a slow status request on each retry tick', () => {
    withStatusClock(21, () => {
      const pending = new Subject<any>();
      careerServiceSpy.getCareerStatus.and.returnValue(pending);
      component.reloadCareerStatus();
      jasmine.clock().tick(1500);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(1);
      expect(pending.observed).toBeTrue();
      pending.next(statusAt(22));
      pending.complete();
      jasmine.clock().tick(1000);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('cancels pending status reads when the summary is destroyed', () => {
    withStatusClock(38, () => {
      const pending = new Subject<any>();
      careerServiceSpy.getCareerStatus.and.returnValue(pending);
      component.reloadCareerStatus();
      jasmine.clock().tick(0);
      fixture.destroy();
      expect(pending.observed).toBeFalse();
      jasmine.clock().tick(3000);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('does not replace a previous-season summary with a new-season response', () => {
    withStatusClock(38, () => {
      careerServiceSpy.getCareerStatus.and.returnValue(of(statusAt(1, 'PRE_MATCH', 2)));
      component.reloadCareerStatus();
      jasmine.clock().tick(3000);
      expect((component as any).vmSubject.value.tournamentStatus.season).toBe(1);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('bounds retries after repeated network errors', () => {
    withStatusClock(21, () => {
      careerServiceSpy.getCareerStatus.and.returnValue(throwError(() => new Error('offline')));
      component.reloadCareerStatus();
      jasmine.clock().tick(10000);
      expect(careerServiceSpy.getCareerStatus).toHaveBeenCalledTimes(6);
    });
  });

  it('distinguishes an unplayed fixture from an actual goalless draw', () => {
    const match = { matchId: 'pending', homeTeamId: 'a', awayTeamId: 'b',
      homeGoals: 0, awayGoals: 0, status: 'PENDING', isUserMatch: true };
    setVm({ matches: [match, { ...match, matchId: 'played', status: 'COMPLETED' }] });
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.match-result');
    expect(rows[0].querySelector('.team-score').textContent.trim()).toBe('—');
    expect(rows[0].textContent).toContain('Sin resultado final');
    expect(rows[0].querySelector('.btn-detail')).toBeNull();
    expect(rows[1].querySelector('.team-score').textContent.trim()).toBe('0');
    expect(rows[1].querySelector('.btn-detail')).not.toBeNull();
  });

  it('playNextRound navigates to tournamentStatus.currentRound + 1 when set', () => {
    // URL round=2 but careerStatus.currentRound=5 -> must navigate to round 6.
    setVm({
      roundNumber: 2,
      tournamentStatus: {
        currentRound: 5,
        totalRounds: 38,
        hasNextRound: true,
        isFinished: false,
        canPlayCurrentRound: true
      }
    });

    component.playNextRound();

    expect(router.navigate).toHaveBeenCalledWith([`/games/${SAMPLE_GAME_ID}/round/6/live`]);
  });

  it('playNextRound falls back to roundNumber + 1 when tournamentStatus is null', () => {
    setVm({
      roundNumber: 2,
      tournamentStatus: null
    });

    component.playNextRound();

    expect(router.navigate).toHaveBeenCalledWith([`/games/${SAMPLE_GAME_ID}/round/3/live`]);
  });

  it('playNextRound navigates to /champion when tournament is finished', () => {
    setVm({
      roundNumber: 38,
      tournamentStatus: {
        currentRound: 38,
        totalRounds: 38,
        hasNextRound: false,
        isFinished: true,
        canPlayCurrentRound: false
      }
    });

    component.playNextRound();

    expect(router.navigate).toHaveBeenCalledWith([`/games/${SAMPLE_GAME_ID}/champion`]);
  });
});
