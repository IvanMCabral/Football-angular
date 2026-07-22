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
 *   <li>SSE update with {@code state.status='FINISHED'} â†’ {@code match.status}
 *       flips to {@code 'SIMULATED'} (the canonical post-match MatchStatus).</li>
 *   <li>SSE update with {@code state.status='RUNNING'} â†’ {@code match.status}
 *       stays on {@code 'SCHEDULED'} (in-play is not yet terminal).</li>
 *   <li>SSE update with {@code state.status='CANCELLED'} â†’ {@code match.status}
 *       flips to {@code 'CANCELLED'}.</li>
 *   <li>SSE update without a matching matchState â†’ {@code match.status} is
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
import { BehaviorSubject, NEVER, of, Subject, Observable, throwError } from 'rxjs';
import { RoundLiveComponent } from './round-live.component';
import { CareerService } from '../../core/services/career.service';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { Match, MatchStatus } from '../../shared/models/match.model';
import { MatchState, RoundState } from '../../core/services/match-engine.model';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';

const SAMPLE_GAME_ID = 'game-abc';
// V25D86 sprint: the roundId returned by the backend's
// POST /api/v1/match-engine/rounds/start response is NOT
// necessarily equal to the frontend's gameId. Tests use this
// value to drive the SSE stream with the registry key the
// backend actually registered.
const SAMPLE_BACKEND_ROUND_ID = 'round-uuid-1234-abcd-5678-efgh';
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

function makeRoundState(matches: MatchState[], status: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS', roundId: string = SAMPLE_BACKEND_ROUND_ID): RoundState {
  return {
    roundId,
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
  let consoleLogSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(async () => {
    roundStateSubject = new Subject<RoundState>();
    consoleLogSpy = spyOn(console, 'log').and.stub();
    consoleErrorSpy = spyOn(console, 'error').and.stub();

    engineServiceSpy = jasmine.createSpyObj<MatchEngineService>('MatchEngineService', [
      'startRound',
      'streamRoundState',
      'pauseRoundForMatch',
      'resumeRoundForMatch'
    ]);
    // V25D86 sprint: the default mock now returns a RoundState with the
    // backend-resolved roundId (NOT equal to SAMPLE_GAME_ID). This lets
    // startRoundEngine's `switchMap(() => resolvedRoundId$...)` chain
    // find a non-null roundId and open the SSE stream. Per-test overrides
    // can pin this to other fixtures (e.g. a state without a roundId to
    // exercise the defensive null path).
    engineServiceSpy.startRound.and.returnValue(of(makeRoundState([])));
    engineServiceSpy.streamRoundState.and.returnValue(roundStateSubject.asObservable());
    engineServiceSpy.pauseRoundForMatch.and.returnValue(of({}));
    engineServiceSpy.resumeRoundForMatch.and.returnValue(of({}));

    careerServiceSpy = jasmine.createSpyObj<CareerService>('CareerService', [
      'getCareerTeams',
      'getCareerStatus',
      'getFixturesByRoundWithBye'
    ]);
    // Keep constructor-owned streams valid but silent by default.
    // Most tests inject the VM directly via setVm(); returning NEVER avoids
    // the old "undefined stream" console error without letting constructor
    // emissions overwrite hand-built test state or consume the auto-start
    // take(1) guard before each assertion.
    careerServiceSpy.getCareerTeams.and.returnValue(NEVER);
    careerServiceSpy.getCareerStatus.and.returnValue(NEVER);
    careerServiceSpy.getFixturesByRoundWithBye.and.returnValue(NEVER);

    modalsSpy = jasmine.createSpyObj<LiveMatchModalsService>('LiveMatchModalsService', [
      'openSubstitutionModal',
      'openFormationModal',
      'openPartidoModal',
      // V25D81.1 BUG #3: rival RED_CARD awareness modal.
      'openRivalCardInfoModal',
      'wasPlayerConfirmedSubstitutedOff',
      'holdRoundResumeAfterModalClose'
    ]);
    modalsSpy.openSubstitutionModal.and.returnValue(of({}));
    modalsSpy.openFormationModal.and.returnValue(of({}));
    modalsSpy.openPartidoModal.and.returnValue(of({}));
    modalsSpy.openRivalCardInfoModal.and.returnValue(of({ dismissed: true }));
    modalsSpy.wasPlayerConfirmedSubstitutedOff.and.returnValue(false);
    modalsSpy.holdRoundResumeAfterModalClose.and.returnValue(() => {});

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

  it('pauseAll pauses the whole round through the round helper anchored on the user match', () => {
    setVm([{
      match: makeMatch('SCHEDULED'),
      state: makeMatchState({ status: 'RUNNING', currentMinute: 54 }),
      isUserMatch: true
    }]);

    component.pauseAll();

    expect(engineServiceSpy.pauseRoundForMatch).toHaveBeenCalledOnceWith(SAMPLE_GAME_ID, SAMPLE_MATCH_ID);
    expect((component as any).vmSubject.value.isRoundPaused).toBeTrue();
  });

  it('resumeAll resumes the whole round through the round helper anchored on the user match', () => {
    setVm([{
      match: makeMatch('SCHEDULED'),
      state: makeMatchState({ status: 'PAUSED', currentMinute: 54 }),
      isUserMatch: true
    }]);
    (component as any).vmSubject.next({ ...(component as any).vmSubject.value, isRoundPaused: true });

    component.resumeAll();

    expect(engineServiceSpy.resumeRoundForMatch).toHaveBeenCalledOnceWith(SAMPLE_GAME_ID, SAMPLE_MATCH_ID);
    expect((component as any).vmSubject.value.isRoundPaused).toBeFalse();
  });

  it('normalizes RUNNING snapshots at 90 minutes to FINISHED so the live UI can close', () => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([
      makeMatchState({ status: 'RUNNING', currentMinute: 90 })
    ], 'IN_PROGRESS'));

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    expect(vm.matches[0].state?.status).toBe('FINISHED');
    expect(vm.matches[0].match.status).toBe('SIMULATED');
    expect(vm.allFinished).toBeTrue();
  });

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

    // Emit SSE update for a DIFFERENT matchId â€” our match's state should not be touched.
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

  it('BUG #3 (1/5): RED_CARD on rival while RUNNING queues awareness without interrupting', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // RED_CARD for the AWAY team (the rival) â€” must trigger openRivalCardInfoModal.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'RUNNING',
      currentMinute: 47,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 47,
          playerName: 'Gerard PiquÃ©',
          playerId: 'p-rival-1',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).not.toHaveBeenCalled();
      expect(component.pendingLiveModalNotice).toContain('roja rival');
      done();
    });
  });

  it('BUG #3 (2/5): RED_CARD on manager team does NOT trigger awareness modal', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // RED_CARD for the HOME team (the manager team). Awareness modal must
    // NOT fire â€” manager cards are already shown in their own timeline.
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

  it('BUG #3 (1b/5): RED_CARD on rival while PAUSED opens awareness modal', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'PAUSED',
      currentMinute: 47,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 47,
          playerName: 'Gerard Piqué',
          playerId: 'p-rival-1-paused',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'Rival red card'
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

  it('BUG #3 (3/5): RED_CARD on FINISHED match does NOT trigger awareness modal', (done) => {
    setVm([{ match: makeMatch('SCHEDULED'), isUserMatch: true }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    // RED_CARD on FINISHED match â€” late tick from a stale replay. Must not fire.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'FINISHED',
      currentMinute: 90,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 88,
          playerName: 'Diego GodÃ­n',
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

    // First SSE: red card arrives â†’ modal opens.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'PAUSED',
      currentMinute: 60,
      events: [rivalCard]
    })]));
    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);

      // Second SSE: same event already in events list (SSE replay after
      // reconnect). Dedup must suppress the second open.
      roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'PAUSED',
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

    // First rival red card â€” opens awareness modal (still "open").
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'PAUSED',
      currentMinute: 30,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 30,
          playerName: 'Diego GodÃ­n',
          playerId: 'p-rival-3',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'InJURED_V23_LEGACY'
        }
      ]
    })]));

    // Second rival red card while the first is still "open" â€” must be queued.
    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'PAUSED',
      currentMinute: 75,
      events: [
        {
          eventType: 'RED_CARD',
          minute: 30,
          playerName: 'Diego GodÃ­n',
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

      // Close the first modal â€” should fire the queued modal.
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

  it('V25D99.20.3.36: skips a queued injury modal when that injured player was already substituted', (done) => {
    const firstModalClosed$ = new Subject<unknown>();
    modalsSpy.openPartidoModal.and.returnValue(firstModalClosed$.asObservable());

    const state = makeMatchState({ status: 'RUNNING', currentMinute: 62 });

    (component as any).openInjuryAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-a'
    });
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-b'
    });

    expect(modalsSpy.openPartidoModal).toHaveBeenCalledTimes(1);

    modalsSpy.wasPlayerConfirmedSubstitutedOff.and.callFake((_matchId: string, playerId: string) => {
      return playerId === 'injured-b';
    });
    firstModalClosed$.complete();

    setTimeout(() => {
      expect(modalsSpy.wasPlayerConfirmedSubstitutedOff)
        .toHaveBeenCalledWith(SAMPLE_MATCH_ID, 'injured-b');
      expect(modalsSpy.openPartidoModal)
        .withContext('the stale queued modal must not open after its player was already changed')
        .toHaveBeenCalledTimes(1);
      done();
    }, 10);
  });

  it('V25D99.20.3.36: opens a queued injury modal when that player still needs attention', (done) => {
    const firstModalClosed$ = new Subject<unknown>();
    modalsSpy.openPartidoModal.and.callFake(() => {
      if (modalsSpy.openPartidoModal.calls.count() === 1) {
        return firstModalClosed$.asObservable();
      }
      return of({});
    });
    modalsSpy.wasPlayerConfirmedSubstitutedOff.and.returnValue(false);

    const state = makeMatchState({ status: 'RUNNING', currentMinute: 64 });

    (component as any).openInjuryAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-a'
    });
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-b'
    });

    firstModalClosed$.complete();

    setTimeout(() => {
      expect(modalsSpy.openPartidoModal)
        .withContext('the queued modal should still open when the player was not already changed')
        .toHaveBeenCalledTimes(2);
      const queuedCall = modalsSpy.openPartidoModal.calls.mostRecent();
      expect(queuedCall.args[3]?.preSelectedPlayerId).toBe('injured-b');
      done();
    }, 10);
  });

  it('V25D99.24: does not reopen an injury modal when that injured player already left the pitch', () => {
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 31,
      events: [
        {
          eventType: 'INJURY',
          minute: 31,
          playerId: 'injured-a',
          teamId: SAMPLE_HOME_TEAM_ID,
          playerName: 'Injured A',
          description: 'Injured A lesionado'
        } as any,
        {
          eventType: 'SUBSTITUTION',
          minute: 31,
          playerId: 'injured-a',
          relatedPlayerId: 'bench-a',
          teamId: SAMPLE_HOME_TEAM_ID,
          playerName: 'Injured A',
          playerOnName: 'Bench A',
          description: 'Bench A entra por Injured A'
        } as any
      ]
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    (component as any).maybeOpenInjuryAutoModal([(component as any).vmSubject.value.matches[0]]);

    expect(modalsSpy.openPartidoModal)
      .withContext('historical treated injury must not create a ghost/empty auto-modal')
      .not.toHaveBeenCalled();
  });

  it('V25D99.22: drains multiple queued injury modals in FIFO order', (done) => {
    const firstModalClosed$ = new Subject<unknown>();
    const secondModalClosed$ = new Subject<unknown>();
    const firstResumeHoldRelease = jasmine.createSpy('firstResumeHoldRelease');
    const secondResumeHoldRelease = jasmine.createSpy('secondResumeHoldRelease');
    modalsSpy.holdRoundResumeAfterModalClose.and.returnValues(
      firstResumeHoldRelease,
      secondResumeHoldRelease
    );
    modalsSpy.openPartidoModal.and.callFake(() => {
      const count = modalsSpy.openPartidoModal.calls.count();
      if (count === 1) {
        return firstModalClosed$.asObservable();
      }
      if (count === 2) {
        return secondModalClosed$.asObservable();
      }
      return of({});
    });
    modalsSpy.wasPlayerConfirmedSubstitutedOff.and.returnValue(false);

    const state = makeMatchState({ status: 'RUNNING', currentMinute: 66 });

    (component as any).openInjuryAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-a'
    });
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-b'
    });
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-c'
    });

    expect(component.pendingLiveModalNotice).toContain('(2)');
    expect(modalsSpy.holdRoundResumeAfterModalClose)
      .withContext('queued injury chain must keep the round frozen between modal 1 and modal 2')
      .toHaveBeenCalledTimes(1);

    firstModalClosed$.complete();

    setTimeout(() => {
      expect(firstResumeHoldRelease).toHaveBeenCalled();
      expect(modalsSpy.openPartidoModal.calls.count()).toBe(2);
      expect(modalsSpy.openPartidoModal.calls.mostRecent().args[3]?.preSelectedPlayerId)
        .toBe('injured-b');
      expect(modalsSpy.holdRoundResumeAfterModalClose)
        .withContext('remaining queued injury must keep the round frozen between modal 2 and modal 3')
        .toHaveBeenCalledTimes(2);

      secondModalClosed$.complete();

      setTimeout(() => {
        expect(secondResumeHoldRelease).toHaveBeenCalled();
        expect(modalsSpy.openPartidoModal.calls.count()).toBe(3);
        expect(modalsSpy.openPartidoModal.calls.mostRecent().args[3]?.preSelectedPlayerId)
          .toBe('injured-c');
        done();
      }, 10);
    }, 10);
  });

  it('V25D99.22: skips a queued injury modal if that player was already substituted from the first modal', (done) => {
    const firstModalClosed$ = new Subject<unknown>();
    modalsSpy.openPartidoModal.and.callFake(() => {
      if (modalsSpy.openPartidoModal.calls.count() === 1) {
        return firstModalClosed$.asObservable();
      }
      return of({});
    });
    modalsSpy.wasPlayerConfirmedSubstitutedOff.and.callFake((_matchId: string, playerId: string) =>
      playerId === 'injured-b'
    );

    const state = makeMatchState({ status: 'RUNNING', currentMinute: 67 });

    (component as any).openInjuryAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-a'
    });
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-b'
    });
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-c'
    });

    firstModalClosed$.complete();

    setTimeout(() => {
      expect(modalsSpy.openPartidoModal.calls.count()).toBe(2);
      expect(modalsSpy.openPartidoModal.calls.mostRecent().args[3]?.preSelectedPlayerId)
        .toBe('injured-c');
      done();
    }, 20);
  });

  it('V25D99.21.1: queues an injury modal behind an open Partido modal', (done) => {
    const partidoClosed$ = new Subject<unknown>();
    modalsSpy.openPartidoModal.and.returnValue(partidoClosed$.asObservable());
    modalsSpy.openSubstitutionModal.calls.reset();
    modalsSpy.wasPlayerConfirmedSubstitutedOff.and.returnValue(false);

    const state = makeMatchState({ status: 'RUNNING', currentMinute: 50 });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    component.onPartidoOpen(makeMatch('SCHEDULED'), state);
    (component as any).queueOrOpenAutoModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      preSelectedPlayerId: 'injured-behind-partido'
    });

    expect(modalsSpy.openPartidoModal).toHaveBeenCalledTimes(1);
    expect(modalsSpy.openSubstitutionModal)
      .withContext('injury modal must wait while Partido is open')
      .not.toHaveBeenCalled();
    expect(component.pendingLiveModalNotice).toContain('propia');

    partidoClosed$.complete();

    setTimeout(() => {
      expect(modalsSpy.openPartidoModal).toHaveBeenCalledTimes(2);
      expect(modalsSpy.openPartidoModal.calls.mostRecent().args[3]?.preSelectedPlayerId)
        .toBe('injured-behind-partido');
      expect(component.pendingLiveModalNotice).toBeNull();
      done();
    }, 10);
  });

  it('V25D99.21.11: local debug can suppress automatic injury modals for clean Partido QA', () => {
    modalsSpy.openSubstitutionModal.calls.reset();
    component.debugSuppressAutoInjuryModals = true;
    const state = makeMatchState({
      status: 'RUNNING',
      currentMinute: 45,
      events: [{
        minute: 45,
        eventType: 'INJURY',
        teamId: SAMPLE_HOME_TEAM_ID,
        playerId: 'injured-player-1'
      } as any]
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    (component as any).maybeOpenInjuryAutoModal([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    expect(modalsSpy.openSubstitutionModal).not.toHaveBeenCalled();
    expect(component.pendingLiveModalNotice).toBeNull();
  });

  it('V25D99.21.12: local debug can create a manager-side Partido injury state without opening substitution modal', () => {
    modalsSpy.openSubstitutionModal.calls.reset();
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 45,
      homeSlots: Array.from({ length: 11 }, (_, index) => ({
        sessionPlayerId: index === 0 ? 'gk-1' : index === 1 ? 'mid-1' : `home-${index}`,
        position: index === 0 ? 'GK' : index === 2 ? 'CB' : 'CM',
        slotIndex: index
      })),
      awaySlots: [
        { sessionPlayerId: 'rival-1', position: 'CM', slotIndex: 1 }
      ],
      events: []
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    const result = component.debugTriggerUserPartidoInjury('mid-1');

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    const nextState = vm.matches[0].state!;
    expect(result).toEqual({ injuredPlayerId: 'mid-1' });
    expect(nextState.homeSlots?.some(slot => slot.sessionPlayerId === 'mid-1')).toBeFalse();
    expect(nextState.awaySlots?.some(slot => slot.sessionPlayerId === 'rival-1')).toBeTrue();
    expect(nextState.events.at(-1)).toEqual(jasmine.objectContaining({
      eventType: 'INJURY',
      playerId: 'mid-1',
      teamId: SAMPLE_HOME_TEAM_ID,
      minute: 45
    }));
    expect(modalsSpy.openSubstitutionModal).not.toHaveBeenCalled();
  });

  it('V25D99.21.12: local Partido injury debug uses career manager team when user match vm lacks userTeamId', () => {
    (component as any).currentUserSessionTeamId = SAMPLE_AWAY_TEAM_ID;
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 45,
      homeSlots: [
        { sessionPlayerId: 'home-mid-1', position: 'CM', slotIndex: 1 }
      ],
      awaySlots: Array.from({ length: 11 }, (_, index) => ({
        sessionPlayerId: index === 0 ? 'away-gk-1' : index === 10 ? 'away-st-1' : `away-${index}`,
        position: index === 0 ? 'GK' : index === 10 ? 'ST' : 'CM',
        slotIndex: index
      })),
      events: []
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true
    }]);

    const result = component.debugTriggerUserPartidoInjury('away-st-1');

    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    const nextState = vm.matches[0].state!;
    expect(result).toEqual({ injuredPlayerId: 'away-st-1' });
    expect(nextState.awaySlots?.some(slot => slot.sessionPlayerId === 'away-st-1')).toBeFalse();
    expect(nextState.homeSlots?.some(slot => slot.sessionPlayerId === 'home-mid-1')).toBeTrue();
    expect(nextState.events.at(-1)).toEqual(jasmine.objectContaining({
      eventType: 'INJURY',
      playerId: 'away-st-1',
      teamId: SAMPLE_AWAY_TEAM_ID
    }));
  });

  it('V25D99.21.13: local Partido injury debug does not stack over an active debug injury', () => {
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 45,
      homeSlots: Array.from({ length: 11 }, (_, index) => ({
        sessionPlayerId: index === 0 ? 'gk-1' : `home-${index}`,
        position: index === 0 ? 'GK' : 'CM',
        slotIndex: index
      })),
      events: [{
        eventType: 'INJURY',
        minute: 44,
        playerId: 'home-4',
        playerName: 'Home 4',
        description: 'Debug Partido: lesion propia para home-4',
        teamId: SAMPLE_HOME_TEAM_ID
      }]
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    const result = component.debugTriggerUserPartidoInjury('home-5');
    const vm = (component as any).vmSubject.value as RoundLiveViewModel;

    expect(result.reason).toContain('Ya hay una lesion Debug Partido activa');
    expect(vm.matches[0].state?.homeSlots?.length).toBe(11);
    expect(vm.matches[0].state?.events?.length).toBe(1);
  });

  it('V25D99.21.13: local Partido injury debug refuses incomplete XI to avoid fake AUTO slots', () => {
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 45,
      homeSlots: Array.from({ length: 10 }, (_, index) => ({
        sessionPlayerId: index === 0 ? 'gk-1' : `home-${index}`,
        position: index === 0 ? 'GK' : 'CM',
        slotIndex: index
      })),
      events: []
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    const result = component.debugTriggerUserPartidoInjury('home-5');
    const vm = (component as any).vmSubject.value as RoundLiveViewModel;

    expect(result.reason).toContain('XI del usuario ya esta incompleto');
    expect(vm.matches[0].state?.homeSlots?.length).toBe(10);
    expect(vm.matches[0].state?.events?.length).toBe(0);
  });

  it('V25D99.21.13: local Partido injury debug normalizes 11 players mapped to incomplete tactical slots', () => {
    const dirtySlots = Array.from({ length: 11 }, (_, index) => ({
      sessionPlayerId: index === 0 ? 'gk-1' : `home-${index}`,
      position: index === 0 ? 'GK' : 'CM',
      slotIndex: index < 8 ? index : index + 1
    }));
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 45,
      homeSlots: dirtySlots,
      events: []
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    const result = component.debugTriggerUserPartidoInjury('home-5');
    const vm = (component as any).vmSubject.value as RoundLiveViewModel;
    const nextSlots = vm.matches[0].state?.homeSlots ?? [];

    expect(result).toEqual({ injuredPlayerId: 'home-5' });
    expect(nextSlots.length).toBe(10);
    expect(nextSlots.some(slot => slot.sessionPlayerId === 'home-5')).toBeFalse();
    expect(new Set(nextSlots.map(slot => slot.slotIndex)).size).toBe(10);
    expect(vm.matches[0].state?.events?.length).toBe(1);
  });

  it('V25D99.21.13: local Partido injury debug surfaces skipped reason in the live page notice', () => {
    spyOn(console, 'warn');
    const state = makeMatchState({
      status: 'PAUSED',
      currentMinute: 45,
      homeSlots: Array.from({ length: 10 }, (_, index) => ({
        sessionPlayerId: index === 0 ? 'gk-1' : `home-${index}`,
        position: index === 0 ? 'GK' : 'CM',
        slotIndex: index
      })),
      events: []
    });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    component.onDebugPartidoInjury();

    expect(component.pendingLiveModalNotice).toContain('XI del usuario ya esta incompleto');
  });

  it('V25D99.21.1: queues rival red-card awareness behind an open Partido modal', (done) => {
    const partidoClosed$ = new Subject<unknown>();
    modalsSpy.openPartidoModal.and.returnValue(partidoClosed$.asObservable());
    modalsSpy.openRivalCardInfoModal.calls.reset();

    const state = makeMatchState({ status: 'RUNNING', currentMinute: 51 });
    setVm([{
      match: makeMatch('SCHEDULED'),
      state,
      isUserMatch: true,
      userTeamId: SAMPLE_HOME_TEAM_ID
    }]);

    component.onPartidoOpen(makeMatch('SCHEDULED'), state);
    (component as any).queueOrOpenRivalCardModal({
      matchId: SAMPLE_MATCH_ID,
      state,
      playerName: 'Rival CB',
      minute: 51
    });

    expect(modalsSpy.openPartidoModal).toHaveBeenCalledTimes(1);
    expect(modalsSpy.openRivalCardInfoModal)
      .withContext('rival awareness modal must wait while Partido is open')
      .not.toHaveBeenCalled();
    expect(component.pendingLiveModalNotice).toContain('roja rival');

    partidoClosed$.complete();

    setTimeout(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);
      expect(modalsSpy.openRivalCardInfoModal.calls.mostRecent().args[2].playerName).toBe('Rival CB');
      expect(component.pendingLiveModalNotice).toBeNull();
      done();
    }, 10);
  });

  it('BUG #3 (6/7): RED_CARD in a non-user match does NOT interrupt the manager', (done) => {
    const otherMatchId = 'match-other-red';
    setVm([
      { match: makeMatch('SCHEDULED'), isUserMatch: true, userTeamId: SAMPLE_HOME_TEAM_ID },
      {
        match: {
          ...makeMatch('SCHEDULED'),
          id: otherMatchId,
          homeTeamId: 'other-home',
          awayTeamId: 'other-away'
        },
        isUserMatch: false
      }
    ]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([
      makeMatchState({ matchId: SAMPLE_MATCH_ID, status: 'RUNNING', currentMinute: 40 }),
      makeMatchState({
        matchId: otherMatchId,
        homeTeamId: 'other-home',
        awayTeamId: 'other-away',
        status: 'RUNNING',
        currentMinute: 40,
        events: [{
          eventType: 'RED_CARD',
          minute: 40,
          playerName: 'Other Match CB',
          playerId: 'other-red-player',
          teamId: 'other-away',
          description: 'Red card in another match'
        }]
      })
    ]));

    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).not.toHaveBeenCalled();
      done();
    });
  });

  it('BUG #3 (7/7): when the manager is away, HOME red card is rival and AWAY red card is own team', (done) => {
    setVm([{
      match: makeMatch('SCHEDULED'),
      isUserMatch: true,
      userTeamId: SAMPLE_AWAY_TEAM_ID
    }]);
    (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

    roundStateSubject.next(makeRoundState([makeMatchState({
      status: 'PAUSED',
      currentMinute: 20,
      events: [{
        eventType: 'RED_CARD',
        minute: 20,
        playerName: 'Home Rival CB',
        playerId: 'home-rival-red',
        teamId: SAMPLE_HOME_TEAM_ID,
        description: 'Home rival red card'
      }]
    })]));

    fixture.whenStable().then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);
      expect(modalsSpy.openRivalCardInfoModal.calls.mostRecent().args[2].playerName).toBe('Home Rival CB');

      roundStateSubject.next(makeRoundState([makeMatchState({
        status: 'RUNNING',
        currentMinute: 30,
        events: [{
          eventType: 'RED_CARD',
          minute: 30,
          playerName: 'Away Own CB',
          playerId: 'away-own-red',
          teamId: SAMPLE_AWAY_TEAM_ID,
          description: 'Own team red card'
        }]
      })]));
      return fixture.whenStable();
    }).then(() => {
      expect(modalsSpy.openRivalCardInfoModal).toHaveBeenCalledTimes(1);
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

      // V25D84 sprint: setVm() above triggers the auto-start
      // subscription (vm$.pipe(take(1))), which calls
      // engineService.startRound as part of the round auto-init. Reset
      // the spy here so the assertion below counts ONLY the
      // iniciarTodos() call (mirrors what the test already did for
      // the constructor's startRoundEngine call).
      engineServiceSpy.startRound.calls.reset();

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

      // All matches are RUNNING â€” nothing left to start.
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
      // players are resting â€” the round is no longer NOT_STARTED).
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

      // And FALSE for NOT_STARTED (regression â€” must NOT mark started).
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

  // ========== V25D83 sprint: initial-load spinner (loading$) ==========

  /**
   * V25D83 sprint: the constructor's combineLatest (routeParams + teams +
   * careerStatus + fixtures) used to render an empty round-live-container
   * immediately because the vmSubject initial value was empty. The user
   * saw a blank page until all four HTTP fetches resolved. We added a
   * {@code loading$} BehaviorSubject that flips to false on the first
   * combineLatest emission (success or error) so the template can render
   * a centered spinner while loading.
   *
   * <p>Tests cover:
   * <ol>
   *   <li>{@code loading$} starts at {@code true} on subscription (initial
   *       BehaviorSubject value), then flips to {@code false} when the
   *       constructor's combineLatest chain emits.</li>
   *   <li>{@code loading$} flips to {@code false} on the error path too
   *       (the catchError in the constructor chain clears it so the
   *       empty/error state becomes visible).</li>
   * </ol>
   *
   * <p>Implementation note: we use {@code Subject} (not {@code BehaviorSubject})
   * for the service spies so the combineLatest chain does NOT emit during
   * the constructor â€” we control the emissions from the test body and
   * can observe the {@code loading$} transitions in order.
   */
  describe('V25D83 sprint: loading$ (initial-load spinner)', () => {
    it('V25D83 #1: loading$ starts true and flips to false after combineLatest emits', (done: DoneFn) => {
      // Cold subjects so combineLatest blocks until we push.
      const teamsSub = new Subject<any[]>();
      const statusSub = new Subject<any>();
      const fixturesSub = new Subject<any>();
      careerServiceSpy.getCareerTeams.and.returnValue(teamsSub);
      careerServiceSpy.getCareerStatus.and.returnValue(statusSub);
      careerServiceSpy.getFixturesByRoundWithBye.and.returnValue(fixturesSub);

      // Recreate the fixture so the constructor re-runs with the new spies.
      fixture = TestBed.createComponent(RoundLiveComponent);
      component = fixture.componentInstance;

      // The chain has not emitted yet (Subjects are cold), so loading$
      // must still be at its initial value: true.
      const emissions: boolean[] = [];
      const sub = component.loading$.subscribe(v => emissions.push(v));
      expect(emissions[0]).toBeTrue();

      // Now release the chain â€” all three sources emit and combineLatest fires.
      teamsSub.next([]);
      statusSub.next({
        careerPhase: 'IN_PROGRESS',
        totalRounds: 38,
        userSessionTeamId: SAMPLE_HOME_TEAM_ID
      });
      fixturesSub.next({ matches: [], byeTeam: null });

      fixture.whenStable().then(() => {
        expect(emissions[emissions.length - 1]).toBeFalse();
        sub.unsubscribe();
        done();
      });
    });

    it('V25D83 #2: loading$ flips to false on the error path (catchError)', (done: DoneFn) => {
      // Use cold Subjects so the constructor's combineLatest chain does
      // not emit during construction (loading$ stays at its initial value
      // `true`). We then manually fire an error on the status subject to
      // verify catchError clears loading$ on the error path.
      const teamsSub = new Subject<any[]>();
      const statusSub = new Subject<any>();
      const fixturesSub = new Subject<any>();
      careerServiceSpy.getCareerTeams.and.returnValue(teamsSub);
      careerServiceSpy.getCareerStatus.and.returnValue(statusSub);
      careerServiceSpy.getFixturesByRoundWithBye.and.returnValue(fixturesSub);

      fixture = TestBed.createComponent(RoundLiveComponent);
      component = fixture.componentInstance;

      const emissions: boolean[] = [];
      const sub = component.loading$.subscribe(v => emissions.push(v));
      // Initial state: combineLatest has not emitted (cold Subjects),
      // so loading$ is still `true`.
      expect(emissions[0]).toBeTrue();

      // Trigger the error path. Subject.error propagates through
      // combineLatest into the catchError, which clears loading$.
      statusSub.error(new Error('boom'));

      fixture.whenStable().then(() => {
        expect(emissions[emissions.length - 1]).toBeFalse();
        sub.unsubscribe();
        done();
      });
    });
  });

  // ========== V25D84 sprint: auto-start round on first vm$ emission ==========

  /**
   * V25D84 sprint: round-live should auto-start the round as soon as
   * the first vm$ emission shows NOT_STARTED matches, so the manager
   * doesn't have to click the "Iniciar Todos" button every time. The
   * button remains as a manual fallback for refresh / failed-auto-start
   * cases.
   *
   * <p>The auto-start is implemented as a
   * {@code vm$.pipe(take(1)).subscribe(...)} in the constructor, with
   * an {@code autoStartTriggered} flag to prevent a duplicate POST when
   * {@link startRoundEngine} also runs (it must, to wire the SSE
   * stream).
   *
   * <p>Tests cover:
   * <ol>
   *   <li>Auto-start fires on first vm$ emission with NOT_STARTED
   *       matches (calls {@code engineService.startRound} with the
   *       pending list).</li>
   *   <li>Auto-start is a no-op when the VM is empty ({@code matches.length === 0}).</li>
   *   <li>Auto-start is a no-op when the VM has {@code errorMsg} set
   *       (round can't be played).</li>
   *   <li>Auto-start is a no-op when all matches already started
   *       (refresh case â€” backend round is RUNNING).</li>
   *   <li>{@code startRoundEngine} skips its own POST when
   *       {@code autoStartTriggered} is true (no duplicate POST).</li>
   *   <li>The take(1) subscription fires only once even when multiple
   *       vm$ emissions arrive (SSE updates don't re-trigger
   *       auto-start).</li>
   *   <li>The "Iniciar Todos" button fallback still works after the
   *       auto-start fired â€” the manager can re-trigger if needed.</li>
   * </ol>
   */
  describe('V25D84 sprint: round auto-start on first vm$ emission', () => {
    it('V25D84 #1: auto-start fires when first vm$ has NOT_STARTED matches (calls engineService.startRound)', () => {
      // Spy on engineService.startRound calls. Note: the constructor's
      // startRoundEngine call would normally happen too, but in this
      // test the cold Subject spies for career service prevent
      // combineLatest from emitting â€” so startRoundEngine never runs.
      // We just need to verify the auto-start subscription (which fires
      // when we manually push vmSubject.next via setVm) calls startRound.
      engineServiceSpy.startRound.calls.reset();

      // Build VM with one NOT_STARTED match + one without state.
      const notStartedMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      };
      const noStateMatch: RoundMatchVM = {
        match: { ...makeMatch('SCHEDULED'), id: 'match-no-state-2' },
        // state intentionally omitted â€” also a candidate for auto-start
        isUserMatch: false
      };
      setVm([notStartedMatch, noStateMatch]);

      // Auto-start must have called engineService.startRound with
      // roundId = gameId and matches = both NOT_STARTED + no-state.
      expect(engineServiceSpy.startRound).toHaveBeenCalledTimes(1);

      const [roundIdArg, matchesArg] = engineServiceSpy.startRound.calls.mostRecent().args;
      expect(roundIdArg).toBe(SAMPLE_GAME_ID);
      expect(matchesArg.length).toBe(2);
      expect(matchesArg[0].matchId).toBe(SAMPLE_MATCH_ID);
      expect(matchesArg[1].matchId).toBe('match-no-state-2');
    });

    it('V25D84 #2: auto-start no-ops on empty matches VM (no backend POST)', () => {
      engineServiceSpy.startRound.calls.reset();

      // VM has no matches at all â€” round can't be started.
      setVm([]);

      // No POST should have fired.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D84 #3: auto-start no-ops when VM has errorMsg set (e.g. "No hay partidos para la fecha N")', () => {
      engineServiceSpy.startRound.calls.reset();

      // Build VM with an error message AND matches (covers the
      // errorMsg short-circuit regardless of matches content).
      const vm: RoundLiveViewModel = {
        gameId: SAMPLE_GAME_ID,
        roundNumber: 3,
        matches: [{ match: makeMatch('SCHEDULED'), isUserMatch: true }],
        teamNameMap: {},
        allFinished: false,
        errorMsg: 'No hay partidos para la fecha 3',
        isRoundPaused: false,
        byeTeam: null,
        anyStarted: false
      };
      (component as any).vmSubject.next(vm);

      // No POST should have fired â€” errorMsg short-circuits the
      // auto-start.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D84 #4: auto-start no-ops when all matches already started (refresh case)', () => {
      engineServiceSpy.startRound.calls.reset();

      // All matches RUNNING â€” backend round is already ticking. This
      // simulates a refresh where the manager re-mounted round-live
      // after the round started.
      const runningMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'RUNNING', currentMinute: 15 }),
        isUserMatch: true
      };
      setVm([runningMatch]);

      // No POST should have fired â€” pending list is empty.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D84 #5: startRoundEngine skips duplicate POST when autoStartTriggered=true', () => {
      // First: fire the auto-start via setVm.
      const notStartedMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      };
      setVm([notStartedMatch]);

      // After setVm, auto-start fired once. Reset and call
      // startRoundEngine directly (simulating the combineLatest tap
      // path).
      engineServiceSpy.startRound.calls.reset();

      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);

      // startRoundEngine must NOT have re-POSTed â€” autoStartTriggered
      // was already true. The SSE stream still opens via switchMap.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D84 #6: auto-start fires only once per component instance (take(1) guard)', () => {
      engineServiceSpy.startRound.calls.reset();

      // First emission: NOT_STARTED matches â€” should fire auto-start.
      const notStartedMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      };
      setVm([notStartedMatch]);
      expect(engineServiceSpy.startRound).toHaveBeenCalledTimes(1);

      // Second emission: simulate an SSE update that flips the match
      // to RUNNING. The take(1) subscription must NOT re-fire â€” once
      // is enough.
      engineServiceSpy.startRound.calls.reset();
      (component as any).vmSubject.next({
        gameId: SAMPLE_GAME_ID,
        roundNumber: 3,
        matches: [{
          match: makeMatch('SCHEDULED'),
          state: makeMatchState({ status: 'RUNNING', currentMinute: 5 }),
          isUserMatch: true
        }],
        teamNameMap: {},
        allFinished: false,
        errorMsg: '',
        isRoundPaused: false,
        byeTeam: null,
        anyStarted: true
      });

      // No additional POST â€” take(1) fired on the first emission only.
      expect(engineServiceSpy.startRound).not.toHaveBeenCalled();
    });

    it('V25D84 #7: Iniciar Todos button still works as fallback after auto-start fires', () => {
      // Fire the auto-start via setVm.
      const notStartedMatch: RoundMatchVM = {
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      };
      setVm([notStartedMatch]);

      // Reset so the assertion counts only the iniciarTodos call.
      engineServiceSpy.startRound.calls.reset();

      // Click "Iniciar Todos" â€” even though auto-start already fired,
      // the button can still re-trigger (e.g. backend rejected the
      // auto-start and manager wants to retry).
      component.iniciarTodos();

      // The button must still call startRound (no-op guard from the
      // autoStartTriggered flag does NOT block iniciarTodos).
      expect(engineServiceSpy.startRound).toHaveBeenCalledTimes(1);
      const [roundIdArg, matchesArg] = engineServiceSpy.startRound.calls.mostRecent().args;
      expect(roundIdArg).toBe(SAMPLE_GAME_ID);
      expect(matchesArg.length).toBe(1);
      expect(matchesArg[0].matchId).toBe(SAMPLE_MATCH_ID);
    });
  });

  // ========== V25D86 sprint: SSE roundId resolution ==========

  /**
   * V25D86 sprint: the frontend was passing {@code gameId} (careerId) as
   * the SSE {@code roundId}. The backend registers the RoundEngine
   * under the value the POST response's {@code state.roundId} returns,
   * which can differ from the request body (e.g. careerId may not be a
   * UUID string parseable by {@code UUID.fromString} on the server). When
   * the frontend subscribed to {@code streamRoundState(gameId)}, the
   * SSE controller's {@code roundEngineRegistry.get(gameId)} returned
   * {@code null} and the endpoint returned {@code Flux.empty()} â€” the
   * SSE went silently idle (state never updated in the UI).
   *
   * <p>Fix: capture {@code state.roundId} from the
   * {@code engineService.startRound} POST response into a
   * {@code BehaviorSubject<String> resolvedRoundId$} and subscribe the
   * SSE chain to that subject (filtered to non-null, take(1)). The
   * POST body itself still carries {@code gameId} so backend idempotency
   * on re-init is preserved, but the SSE URL uses the registry key.
   *
   * <p>Tests cover:
   * <ol>
   *   <li>{@code startRoundEngine} subscribes to
   *       {@code streamRoundState} with the roundId from the POST
   *       response, NOT the gameId passed to the constructor.</li>
   *   <li>The auto-start ({@code tryAutoStartRound}) pipeline captures
   *       the roundId into the same subject so the SSE chain â€” which
   *       has short-circuited its own POST â€” picks up the resolved
   *       roundId without re-POSTing.</li>
   *   <li>{@code iniciarTodos} (manual fallback) also pushes the
   *       roundId so any SSE subscription that follows uses the
   *       registry key.</li>
   *   <li>Defensive: when the POST response lacks a {@code roundId}
   *       (e.g. the body shape is unknown), the SSE does NOT crash â€”
   *       the existing {@code Flux.empty()} behavior is preserved
   *       (no streamRoundState call with an empty id).</li>
   * </ol>
   */
  describe('V25D86 sprint: streamRoundState uses POST roundId, not gameId', () => {
    /**
     * Helper: trigger the auto-start + startRoundEngine the same way the
     * production flow does, without going through the constructor's
     * combineLatest (which depends on careerService spies that aren't
     * configured to return values here). Returns nothing; tests assert
     * against the engineServiceSpy call history. Does NOT reset call
     * counters so the assertions see both the auto-start POST AND the
     * SSE call.
     */
    function runAutoStartAndOpenStream() {
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      }]);
      // Explicitly call startRoundEngine after the auto-start so the
      // SSE chain subscribes (autoStartTriggered=true short-circuits
      // the POST and reads resolvedRoundId$ from the auto-start's
      // captured response).
      (component as any).startRoundEngine(SAMPLE_GAME_ID, (component as any).vmSubject.value.matches);
    }

    it('V25D86 #1: streamRoundState receives roundId from POST response, NOT gameId', () => {
      // Configure startRound to return a RoundState whose roundId is
      // explicitly DIFFERENT from SAMPLE_GAME_ID â€” this is the bug
      // scenario: frontend posts gameId, backend resolves to a real UUID,
      // frontend must use the UUID for SSE.
      const realRoundId = 'real-round-uuid-9876-fedc-3210';
      engineServiceSpy.startRound.and.returnValue(of(makeRoundState([], 'IN_PROGRESS', realRoundId)));

      runAutoStartAndOpenStream();

      // startRound was called once with SAMPLE_GAME_ID (the POST body
      // roundId, used for idempotency)...
      expect(engineServiceSpy.startRound).toHaveBeenCalledTimes(1);
      expect(engineServiceSpy.startRound.calls.mostRecent().args[0]).toBe(SAMPLE_GAME_ID);

      // ...and the roundId captured from the POST response was pushed
      // into resolvedRoundId$ (the side effect that the SSE chain
      // consumes)...
      expect((component as any).resolvedRoundId$.value).toBe(realRoundId,
          'V25D86: tryAutoStartRound must capture state.roundId into resolvedRoundId$');

      // ...and the SSE URL was opened with that backend-resolved roundId,
      // NOT gameId. Before V25D86 this assertion would fail: args[0]
      // was SAMPLE_GAME_ID and the SSE went idle because the registry
      // had no entry for the careerId.
      expect(engineServiceSpy.streamRoundState).toHaveBeenCalledTimes(1);
      expect(engineServiceSpy.streamRoundState.calls.mostRecent().args[0]).toBe(realRoundId,
          'V25D86: streamRoundState must receive the roundId from the POST response, not the frontend gameId');
      expect(engineServiceSpy.streamRoundState.calls.mostRecent().args[0]).not.toBe(SAMPLE_GAME_ID);
    });

    it('V25D86 #2: iniciarTodos pushes its POST roundId into resolvedRoundId$ (so an SSE retry sees the new key)', () => {
      const realRoundId = 'iniciar-todos-round-uuid-cccc-dddd';
      engineServiceSpy.startRound.and.returnValue(of(makeRoundState([], 'IN_PROGRESS', realRoundId)));
      engineServiceSpy.startRound.calls.reset();
      engineServiceSpy.streamRoundState.calls.reset();

      // Manually fire iniciarTodos (the manager clicked the button).
      // Build a VM with at least one NOT_STARTED match so iniciarTodos
      // doesn't no-op.
      setVm([{
        match: makeMatch('SCHEDULED'),
        state: makeMatchState({ status: 'NOT_STARTED', currentMinute: 0 }),
        isUserMatch: true
      }]);
      // Reset the spies to isolate the iniciarTodos effect.
      engineServiceSpy.startRound.calls.reset();
      engineServiceSpy.streamRoundState.calls.reset();

      component.iniciarTodos();

      // iniciarTodos POST uses gameId; the next-handler captures
      // state.roundId into resolvedRoundId$. Confirm the side effect
      // by reading the private BehaviorSubject.
      expect(engineServiceSpy.startRound).toHaveBeenCalledTimes(1);
      expect((component as any).resolvedRoundId$.value).toBe(realRoundId,
          'V25D86: iniciarTodos must publish its POST response roundId so the SSE rendezvous sees it');
    });

    it('V25D86 #3: defensive â€” when POST returns a state with no roundId, streamRoundState is NOT called', () => {
      // Backend response without roundId (e.g. malformed body, future
      // API drift). The SSE filter `id !== null` must block the empty
      // id and prevent a `streamRoundState('')` call that would 404.
      engineServiceSpy.startRound.and.returnValue(of({
        // Build a "state-like" object missing roundId (roundId: undefined).
        timestamp: new Date().toISOString(),
        matches: [],
        status: 'IN_PROGRESS'
      } as any));
      engineServiceSpy.streamRoundState.calls.reset();

      runAutoStartAndOpenStream();

      // streamRoundState must NOT be called: the filter `id !== null`
      // blocks because resolvedRoundId$ stays null (startRound's
      // response had no roundId to capture). The `takeUntil(this.destroy$)`
      // subscription closes naturally without ever invoking streamRoundState.
      expect(engineServiceSpy.streamRoundState).not.toHaveBeenCalled();
    });
  });
});
