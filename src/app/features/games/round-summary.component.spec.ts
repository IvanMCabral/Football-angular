/**
 * V24D14-LIVE-FIX-1.7 Bug #1: unit tests for {@link RoundSummaryComponent}'s
 * "play next round" navigation.
 *
 * <p>Validates the fix for the routing-stale bug: when the user opens the
 * summary for round N (e.g. {@code /games/G/round/2/summary}) but the career
 * has already advanced to round M (e.g. M=5 because the user played rounds 2-4
 * via another session or via a "play all rounds" action), clicking
 * "Siguiente Fecha" must navigate to {@code /games/G/round/M+1/live} —
 * NOT to {@code /games/G/round/N+1/live}.
 *
 * <p>The fix prefers {@code tournamentStatus.currentRound} (server-side
 * canonical source of truth) and falls back to {@code roundNumber + 1} only
 * when {@code tournamentStatus} is unavailable.
 *
 * <p>We avoid the constructor's async ngOnInit flow and inject the VM
 * directly via the private {@code vmSubject} (test-only access). This keeps
 * the test synchronous and isolated from the unrelated getCareerTeams /
 * getCareerStatus / getFixturesByRoundWithBye plumbing.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { RoundSummaryComponent } from './round-summary.component';
import { CareerService } from '../../core/services/career.service';
import { RoundSummaryViewModel } from './models/round-summary.model';

const SAMPLE_GAME_ID = 'game-abc';

describe('RoundSummaryComponent - V24D14-LIVE-FIX-1.7 Bug #1', () => {
  let fixture: ComponentFixture<RoundSummaryComponent>;
  let component: RoundSummaryComponent;
  let router: Router;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;

  beforeEach(async () => {
    careerServiceSpy = jasmine.createSpyObj<CareerService>('CareerService', [
      'getCareerTeams',
      'getCareerStatus',
      'getFixturesByRoundWithBye'
    ]);

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

  it('playNextRound navigates to tournamentStatus.currentRound + 1 when set', () => {
    // URL round=2 but careerStatus.currentRound=5 → must navigate to round 6.
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