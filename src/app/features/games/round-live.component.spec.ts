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
import { BehaviorSubject, of, Subject, Observable } from 'rxjs';
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
      'openFormationModal',
      // V25D81.1 BUG #3: rival RED_CARD awareness modal.
      'openRivalCardInfoModal'
    ]);
    modalsSpy.openRivalCardInfoModal.and.returnValue(of({ dismissed: true }));

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
      byeTeam: null,
      anyStarted: false // V25D82 sprint 2 UX fix: false by default in test fixtures
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

  // ========== V25D81.1 BUG #3 rival RED_CARD awareness tests ==========

  /**
   * Helper: set up a match with a home-team user + away rival. Returns the
   * isUserMatch=true VM. The away team is the "rival" from the perspective
   * of the awareness modal.
   */
  function setVmWithUserAndRival(userHome: boolean = true): RoundMatchVM[] {
    const matches: RoundMatchVM[] = [];
    if (userHome) {
      matches.push({
        match: { ...makeMatch('SCHEDULED'), homeTeamId: SAMPLE_HOME_TEAM_ID },
        isUserMatch: true
      });
    } else {
      matches.push({
        match: { ...makeMatch('SCHEDULED'), homeTeamId: SAMPLE_HOME_TEAM_ID, awayTeamId: SAMPLE_AWAY_TEAM_ID },
        isUserMatch: true
      });
    }
    setVm(matches);
    return matches;
  }

  it('BUG #3 (1/5): RED_CARD on rival opens awareness modal', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // RED_CARD for the AWAY team (the rival) — must trigger openRivalCardInfoModal.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'RUNNING',
      currentMinute: 47,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 47,
          playerName: 'Gerard Piqué',
          playerId: 'p-rival-1',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);
      const [matchIdArg, stateArg, infoArg] = modalsSpy.openRivalCardInfoModal.calls.mostRecent().args;
      expect(matchIdArg).toBe(SAMPLE_MATCH_ID);
      expect(stateArg.matchId).toBe(SAMPLE_MATCH_ID);
      expect(infoArg.playerName).toBe('Gerard Piqué');
      expect(infoArg.minute).toBe(47);
      expect(infoArg.cardType).toBe('RED');
      done();
    });
  });

  it('BUG #3 (2/5): RED_CARD on manager team does NOT trigger awareness modal', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // RED_CARD for the HOME team (the manager team). Awareness modal must
    // NOT fire — manager cards are already shown in their own timeline.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'RUNNING',
      currentMinute: 32,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 32,
          playerName: 'Sergio Ramos',
          playerId: 'p-user-1',
          teamId: SAMPLE_HOME_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).not.toHaveBeenCalled();
      done();
    });
  });

  it('BUG #3 (3/5): RED_CARD on FINISHED match does NOT trigger awareness modal', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // RED_CARD on FINISHED match — late tick from a stale replay. Must not fire.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'FINISHED',
      currentMinute: 90,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 88,
          playerName: 'Diego Godín',
          playerId: 'p-rival-2',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).not.toHaveBeenCalled();
      done();
    });
  });

  it('BUG #3 (4/5): repeated rival RED_CARD for same eventId does NOT re-trigger', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    const rivalCard = {
      eventType: 'RED_CARD' as const,
      minute: 60,
      playerName: 'Pepe',
      playerId: 'p-rival-pepe',
      teamId: SAMPLE_AWAY_TEAM_ID,
      description: 'InJURED_V23_LEGACY'
    };

    // First SSE: red card arrives → modal opens.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'RUNNING',
      currentMinute: 60,
      events: [rivalCard]
    })]));
    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);

      // Second SSE: same event already in events list (SSE replay after
      // reconnect). Dedup must suppress the second open.
      roundStateSubject.next(makeRoundState([makeMatchState({
        status: 'RUNNING',
        currentMinute: 70,
        events: [rivalCard]
      })]));
      return fixture.whenStable();
    }).then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('BUG #3 (5/5): rival RED_CARD queues when previous awareness modal still open', (done) => {
    // Make the first openRivalCardInfoModal call return an Observable that
    // doesn't complete until we resolve it (simulates "still open").
    let resolveFirst: () => void = () => {};
    const firstClosed = new Promise<void>((res) => { resolveFirst = res; });
    let firstCall = true;
    modalsSpy.openRivalCardInfoModal.and.callFake(() => {
      if (firstCall) {
        firstCall = false;
        return new Observable(sub => {
          // never emit + never complete until resolveFirst() runs
          firstClosed.then(() => sub.next({ dismissed: true }));
          firstClosed.then(() => sub.complete());
        });
      }
      return of({ dismissed: true });
    });

    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // First rival red card — opens awareness modal (still "open").
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'RUNNING',
      currentMinute: 30,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 30,
          playerName: 'Diego Godín',
          playerId: 'p-rival-3',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    // Second rival red card while the first is still "open" — must be queued.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'RUNNING',
      currentMinute: 75,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 30,
          playerName: 'Diego Godín',
          playerId: 'p-rival-3',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        },
        {
          eventType: 'RED_CARD',
          minute: 75,
          playerName: 'Pepe',
          playerId: 'p-rival-pepe2',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    fixture.whenStable().then(() => {
      // After 2 SSE updates but only one modal open: exactly 1 call so far.
      // The second red card's modal call is queued, not yet emitted.
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);

      // Close the first modal — should fire the queued modal.
      resolveFirst();
      // Wait for the macrotask setTimeout in openRivalCardInfoModal.
      return new Promise<void>(r => setTimeout(r, 10));
    }).then(() => fixture.whenStable()).then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(2);
      const queuedCall = modalsSpy.openRivalCardInfoModal.calls.mostRecent();
      expect(queuedCall.args[2].playerName).toBe('Pepe');
      expect(queuedCall.args[2].minute).toBe(75);
      done();
    });
  });

  // ========== V25D82 sprint 2 UX fix: "Iniciar Todos" button + anyStarted flag ==========

  /**
   * V25D82 sprint 2: explicit "Iniciar Todos" trigger for the round-live
   * header. This is the manager's fallback when the auto-start in
   * {@code startRoundEngine} did not visibly transition the matches to
   * RUNNING. The button calls
   * {@code engineService.startRound(roundId, matches)} with the list of
   * NOT_STARTED (or no-state) matches from the current VM.
   *
   * <p>Tests cover:
   * <ol>
   *   <li>{@code iniciarTodos} calls {@code startRound} with the filtered
   *       NOT_STARTED matches, using the {@code gameId} as the roundId.</li>
   *   <li>{@code iniciarTodos} is a no-op when all matches already started
   *       (no spurious backend call).</li>
   *   <li>{@code iniciarTodos} handles the empty-matches case gracefully
   *       (no crash, no backend call).</li>
   *   <li>The {@code anyStarted} flag is computed correctly in the SSE
   *       handler: true when any match is IN_PROGRESS/PAUSED/FINISHED/
   *       CANCELLED, false when all are NOT_STARTED.</li>
   * </ol>
   */
  describe('V25D82 sprint 2 UX fix: iniciarTodos + anyStarted flag', () => {
    it('V25D82 #1: iniciarTodos calls engineService.startRound with NOT_STARTED matches (roundId = gameId)', () => {
      // Reset spy call count so we can assert the call was made by iniciarTodos
      // (not by the constructor's auto-startRoundEngine).
      engineServiceSpy.startRound.calls.reset();

      // Build a VM with TWO matches: one NOT_STARTED, one without state yet
      // (the "no state" branch is also covered by the filter).
      const notStartedMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      };
      const noStateMatch: RoundMatchVM = {
        match: { ...makeMatch('SCHEDULED'), id: 'match-no-state' },
        // state intentionally omitted
        isUserMatch: false
      };
      setVm([notStartedMatch, noStateMatch]);

      // Invoke the method.
      component.iniciarTodos();

      // The backend POST must have been made with both matches.
      expect(engineServiceSpy.startRound).toHaveBeenCalledTimes(1);

      const [roundIdArg, matchesArg] = engineServiceSpy.startRound.calls.mostRecent().args;
      // roundId must reuse gameId (the existing startRoundEngine convention).
      expect(roundIdArg).toBe(SAMPLE_GAME_ID);
      // Both NOT_STARTED + no-state matches must be in the payload, in order.
      expect(matchesArg.length).toBe(2);
      expect(matchesArg[0].matchId).toBe(SAMPLE_MATCH_ID);
      expect(matchesArg[0].homeTeamId).toBe(SAMPLE_HOME_TEAM_ID);
      expect(matchesArg[0].awayTeamId).toBe(SAMPLE_AWAY_TEAM_ID);
      expect(matchesArg[1].matchId).toBe('match-no-state');
    });

    it('V25D82 #2: iniciarTodos is a no-op when all matches already started (no backend call)', () => {
      engineServiceSpy.startRound.calls.reset();

      // All matches are RUNNING — nothing left to start.
      const runningMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'RUNNING', currentMinute: 30 }),
        isUserMatch: true
      };
      setVm([runningMatch]);

      component.iniciarTodos();

      // No backend POST should have fired.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D82 #3: iniciarTodos handles empty matches list gracefully (no crash, no backend call)', () => {
      engineServiceSpy.startRound.calls.reset();

      // No matches in the VM at all.
      setVm([]);

      // Must not throw.
      expect(() => component.iniciarTodos()).not.toThrow();

      // No backend POST.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D82 #4: anyStarted flag is true when any match is RUNNING/HALF_TIME/PAUSED/FINISHED/CANCELLED (SSE-driven)', () => {
      // Build a VM with one NOT_STARTED match, then push an SSE update that
      // flips it to RUNNING. anyStarted MUST become true. Note: MatchState
      // uses 'RUNNING' (the live status), not 'IN_PROGRESS' (which is the
      // RoundState.status value).
      const match: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      };
      setVm([match]);

      // Sanity: initially false (matches NOT_STARTED).
      expect((component as any).vmSubject.value.anyStarted).toBeFalse();

      // Trigger the SSE update path.
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
      roundStateSubject.next(makeRoundState([makeMatchState({ status: 'RUNNING', currentMinute: 5 })]));

      // anyStarted MUST flip to true.
      expect((component as any).vmSubject.value.anyStarted).toBeTrue();

      // Also true for HALF_TIME (the match has started even though the
      // players are resting — the round is no longer NOT_STARTED).
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      }]);
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
      roundStateSubject.next(makeRoundState([makeMatchState({ status: 'HALF_TIME', currentMinute: 45 })]));
      expect((component as any).vmSubject.value.anyStarted).toBeTrue();

      // Also true for FINISHED.
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'FINISHED' }),
        isUserMatch: true
      }]);
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
      roundStateSubject.next(makeRoundState([makeMatchState({ status: 'FINISHED' })]));
      expect((component as any).vmSubject.value.anyStarted).toBeTrue();

      // And true for PAUSED.
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'PAUSED' }),
        isUserMatch: true
      }]);
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
      roundStateSubject.next(makeRoundState([makeMatchState({ status: 'PAUSED' })]));
      expect((component as any).vmSubject.value.anyStarted).toBeTrue();

      // And true for CANCELLED.
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'CANCELLED' }),
        isUserMatch: true
      }]);
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
      roundStateSubject.next(makeRoundState([makeMatchState({ status: 'CANCELLED' })], 'COMPLETED'));
      expect((component as any).vmSubject.value.anyStarted).toBeTrue();

      // And FALSE for NOT_STARTED (regression — must NOT mark started).
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      }]);
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
      roundStateSubject.next(makeRoundState([makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 })]));
      expect((component as any).vmSubject.value.anyStarted).toBeFalse();
    });
  });
});