/**
 * V24D14-LIVE-FIX-1.7 Bug #2: unit tests for {@link RoundLiveComponent}'s SSE
 * snapshot propagation.
 *
 * <p>Validates the fix for the snapshot-stale bug: after a match transitions
 * to {@code FINISHED} via the round SSE, the embedded {@code Match.status}
 * on each {@code RoundMatchVM} must also flip to {@code 'SIMULATED'} (the
 * post-match terminal status). Before the fix, the SSE handler only updated
 * {@code rm.state} and left {@code rm.match.status} stuck on the initial
 * {@code 'SCHEDULED'} value, so the UI displayed "En Juego" indefinitely
 * until a manual page refresh.
 *
 * <p>Coverage:
 * <ol>
 *   <li>SSE update with {@code state.status='FINISHED'} → {@code match.status}
 *       flips to {@code 'SIMULATED'} (the canonical post-match MatchStatus).</li>
 *   <li>SSE update with {@code state.status='RUNNING'} → {@code match.status}
 *       stays on {@code 'SCHEDULED'} (in-play is not yet terminal).</li>
 *   <li>SSE update with {@code state.status='CANCELLED'} → {@code match.status}
 *       flips to {@code 'CANCELLED'}.</li>
 *   <li>SSE update without a matching matchState → {@code match.status} is
 *       unchanged.</li>
 * </ol>
 *
 * <p>We avoid the constructor's async setup by injecting the initial VM
 * directly via the private {@code vmSubject} (test-only access) and then
 * trigger the SSE update path by calling {@code startRoundEngine} after
 * stubbing {@code engineService.streamRoundState} to emit a Subject we control.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { RoundLiveComponent } from './round-live.component';
import { CareerService } from '../../core/services/career.service';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { Match, MatchStatus } from '../../shared/models/match.model';
import { MatchState, RoundState } from '../../core/services/match-engine.model';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';

const SAMPLE_GAME_ID = 'game-abc';
const SAMPLE_MATCH_ID = 'match-xyz';
const SAMPLE_HOME_TEAM_ID = 'team-home-1';
const SAMPLE_AWAY_TEAM_ID = 'team-away-1';

function makeMatchState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    matchId: SAMPLE_MATCH_ID,
    homeTeamId: SAMPLE_HOME_TEAM_ID,
    awayTeamId: SAMPLE_AWAY_TEAM_ID,
    currentMinute: 90,
    status: 'FINISHED',
    score: { home: 2, away: 1 },
    homePossession: 55,
    awayPossession: 45,
    homeStyle: 'BALANCED',
    awayStyle: 'BALANCED',
    homeFormation: '4-3-3',
    awayFormation: '4-3-3',
    events: [],
    cards: [],
    substitutions: [],
    players: [],
    ...overrides
  };
}

function makeMatch(status: MatchStatus = 'SCHEDULED'): Match {
  return {
    id: SAMPLE_MATCH_ID,
    homeTeamId: SAMPLE_HOME_TEAM_ID,
    awayTeamId: SAMPLE_AWAY_TEAM_ID,
    scheduledAt: new Date().toISOString(),
    status,
    result: null,
    createdAt: new Date().toISOString(),
    simulatedAt: null,
    round: 3
  };
}

function makeRoundState(matches: MatchState[], status: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS'): RoundState {
  return {
    roundId: SAMPLE_GAME_ID,
    timestamp: new Date().toISOString(),
    matches,
    status
  };
}

describe('RoundLiveComponent - V24D14-LIVE-FIX-1.7 Bug #2', () => {
  let fixture: ComponentFixture<RoundLiveComponent>;
  let component: RoundLiveComponent;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let modalsSpy: jasmine.SpyObj<LiveMatchModalsService>;
  let roundStateSubject: Subject<RoundState>;

  beforeEach(async () => {
    roundStateSubject = new Subject<RoundState>();

    engineServiceSpy = jasmine.createSpyObj<MatchEngineService>('MatchEngineService', [
      'startRound',
      'streamRoundState'
    ]);
    engineServiceSpy.startRound.and.returnValue(of({} as any));
    engineServiceSpy.streamRoundState.and.returnValue(roundStateSubject.asObservable());

    careerServiceSpy = jasmine.createSpyObj<CareerService>('CareerService', [
      'getCareerTeams',
      'getCareerStatus',
      'getFixturesByRoundWithBye'
    ]);

    modalsSpy = jasmine.createSpyObj<LiveMatchModalsService>('LiveMatchModalsService', [
      'openSubstitutionModal',
      'openFormationModal'
    ]);

    await TestBed.configureTestingModule({
      imports: [RoundLiveComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(new Map([
          ['gameId', SAMPLE_GAME_ID],
          ['round', '3']
        ])) } },
        { provide: CareerService, useValue: careerServiceSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: LiveMatchModalsService, useValue: modalsSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoundLiveComponent);
    component = fixture.componentInstance;
  });

  function setVm(matches: RoundMatchVM[]) {
    const vm: RoundLiveViewModel = {
      gameId: SAMPLE_GAME_ID,
      roundNumber: 3,
      matches,
      teamNameMap: { [SAMPLE_HOME_TEAM_ID]: 'Home FC', [SAMPLE_AWAY_TEAM_ID]: 'Away FC' },
      allFinished: false,
      errorMsg: '',
      isRoundPaused: false,
      byeTeam: null
    };
    (component as any).vmSubject.next(vm);
  }

  it('SSE update with status=FINISHED flips match.status to SIMULATED', () => {
    // Initial state: one match with status='SCHEDULED'.
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    // Trigger SSE update by calling the private handler.
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([makeMatchState({ status: 'FINISHED' })]));

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    expect(vm.matches[0].match.status).toBe('SIMULATED',
        'Bug #2: match.status must flip to SIMULATED when SSE state.status=FINISHED');
    expect(vm.matches[0].state!.status).toBe('FINISHED');
  });

  it('SSE update with status=RUNNING keeps match.status=SCHEDULED', () => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([makeMatchState({ status: 'RUNNING', currentMinute: 30 })]));

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    expect(vm.matches[0].match.status).toBe('SCHEDULED',
        'Bug #2: match.status must stay SCHEDULED when SSE state.status=RUNNING');
  });

  it('SSE update with status=CANCELLED flips match.status to CANCELLED', () => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([makeMatchState({ status: 'CANCELLED' })], 'COMPLETED'));

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    expect(vm.matches[0].match.status).toBe('CANCELLED');
  });

  it('SSE update without matching matchState leaves match.status unchanged', () => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // Emit SSE update for a DIFFERENT matchId — our match's state should not be touched.
    roundStateSubject.next(makeRoundState([makeMatchState({ matchId: 'match-other', status: 'FINISHED' })]));

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    expect(vm.matches[0].match.status).toBe('SCHEDULED');
  });
});