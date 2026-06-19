/**
 * LIVE-MATCH-F5.4-FIX-MATCH-LIVE-RENDER: unit tests for {@link MatchLiveComponent}.
 *
 * <p>Validates the BUG_F5.4_MATCH_LIVE_BLANK fix: the component must connect to
 * the RoundEngine V24 SSE (round-level) instead of the legacy per-match endpoints
 * that no longer exist on the backend.
 *
 * <p>Coverage:
 * <ol>
 *   <li>ngOnInit triggers {@code getRoundIdForMatch(matchId)}.</li>
 *   <li>ngOnInit does NOT call the removed {@code MatchService.getMatch}.</li>
 *   <li>ngOnInit does NOT call the removed {@code MatchEngineService.startEngine}.</li>
 *   <li>When the round SSE emits a {@code RoundState} containing our matchId, the
 *       component pushes the matching {@code MatchState} into {@code matchStateSubject}.</li>
 *   <li>When {@code getRoundIdForMatch} 404s, {@code errorMsgSubject} receives
 *       a clear, non-breaking message (decision B4).</li>
 * </ol>
 *
 * <p>What we deliberately do NOT test here (covered elsewhere or out of scope):
 * <ul>
 *   <li>{@code changeStyle}/{@code pauseMatch}/{@code resumeMatch}/{@code stopMatch}
 *       — unchanged from the F5.4 wire (commit {@code 6814b9c}) and covered by
 *       the smoke test in {@code C:\Users\ichu_\.mavis\agents\revisor-football\workspace\smoke-f5-4-no-go.md}.</li>
 *   <li>Goal-detection pairwise + snackbar — preserved verbatim from the deleted
 *       {@code startSseStream}; covered manually via the round SSE in smoke.</li>
 *   <li>{@code openSubstitutionModal}/{@code openFormationModal} — delegated to
 *       {@code LiveMatchModalsService}, tested at the modal spec level.</li>
 * </ul>
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { MatchLiveComponent } from './match-live.component';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { CareerService } from '../../core/services/career.service';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { MatchState, RoundState, StreamHealth } from '../../core/services/match-engine.model';
import { environment } from '../../environments/environment';

const SAMPLE_MATCH_ID = 'm-live-1';
const SAMPLE_GAME_ID = 'g-career-1';
const SAMPLE_ROUND_ID = 'r-1';
const SAMPLE_HOME_TEAM_ID = 'team-home-1';
const SAMPLE_AWAY_TEAM_ID = 'team-away-1';

function sampleMatchState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    matchId: SAMPLE_MATCH_ID,
    homeTeamId: SAMPLE_HOME_TEAM_ID,
    awayTeamId: SAMPLE_AWAY_TEAM_ID,
    currentMinute: 7,
    status: 'RUNNING',
    score: { home: 0, away: 0 },
    homePossession: 55,
    awayPossession: 45,
    homeStyle: 'BALANCED',
    awayStyle: 'BALANCED',
    homeFormation: '4-4-2',
    awayFormation: '4-3-3',
    events: [],
    cards: [],
    substitutions: [],
    players: [],
    ...overrides
  };
}

function sampleRoundState(matches: MatchState[]): RoundState {
  return {
    roundId: SAMPLE_ROUND_ID,
    timestamp: new Date().toISOString(),
    matches,
    status: 'IN_PROGRESS'
  };
}

describe('MatchLiveComponent — LIVE-MATCH-F5.4-FIX-MATCH-LIVE-RENDER', () => {
  let component: MatchLiveComponent;
  let fixture: ComponentFixture<MatchLiveComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let modalsSpy: jasmine.SpyObj<LiveMatchModalsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let matchStateSubjectInternal: BehaviorSubject<MatchState | null>;
  let streamHealthSubjectInternal: BehaviorSubject<StreamHealth>;

  /**
   * Builds a stub ActivatedRoute whose paramMap behaves like the real router:
   * it emits the resolved gameId/matchId and then completes (the component
   * takes one snapshot and uses it for the whole session).
   */
  function buildRouteStub(gameId: string, matchId: string) {
    return {
      paramMap: of({
        get: (key: string) => key === 'gameId' ? gameId : key === 'matchId' ? matchId : null
      } as any).pipe()
    };
  }

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', [
      'startEngine',
      'streamMatchState',
      'getMatchState',
      'pauseEngine',
      'resumeEngine',
      'stopEngine',
      'changeStyle',
      'getRoundIdForMatch',
      'streamRoundState'
    ]);
    careerServiceSpy = jasmine.createSpyObj('CareerService', ['getCareerTeams']);
    modalsSpy = jasmine.createSpyObj('LiveMatchModalsService', [
      'openSubstitutionModal',
      'openFormationModal'
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Default stubs: careers API resolves with empty teams (header shows fallback names),
    // round lookup resolves to a deterministic roundId, and the SSE subject is set up
    // per-test so we can drive emissions explicitly.
    careerServiceSpy.getCareerTeams.and.returnValue(of([] as any[]));
    engineServiceSpy.getRoundIdForMatch.and.returnValue(of(SAMPLE_ROUND_ID));
    // The modals service is delegated to for substitution/formation flows.
    // Each modal helper returns an Observable the component pipes+subscribes to,
    // so the spy defaults to `of(null)` to keep `.pipe(takeUntil(destroy$))` happy.
    modalsSpy.openSubstitutionModal.and.returnValue(of(null));
    modalsSpy.openFormationModal.and.returnValue(of(null));

    matchStateSubjectInternal = new BehaviorSubject<MatchState | null>(null);
    streamHealthSubjectInternal = new BehaviorSubject<StreamHealth>('HEALTHY');

    // streamRoundState returns a BehaviorSubject-shaped Observable that we drive
    // from the test by pushing to `roundStateSubject` (declared below; the
    // closure resolves it lazily at call time, so the early reference is safe).
    const roundStateSubject = new BehaviorSubject<RoundState>(sampleRoundState([]));
    engineServiceSpy.streamRoundState.and.callFake(() => roundStateSubject.asObservable());
    (engineServiceSpy as any).__roundStateSubject = roundStateSubject;
    // `streamHealth$` is declared `readonly` on the source class, so the typed
    // spy does not expose a setter. Cast through `any` for the test override;
    // the component reads the value once during construction.
    (engineServiceSpy as any).streamHealth$ = streamHealthSubjectInternal.asObservable();

    const routeStub = buildRouteStub(SAMPLE_GAME_ID, SAMPLE_MATCH_ID);

    await TestBed.configureTestingModule({
      imports: [MatchLiveComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: CareerService, useValue: careerServiceSpy },
        { provide: LiveMatchModalsService, useValue: modalsSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchLiveComponent);
    component = fixture.componentInstance;
    matchStateSubjectInternal = (component as any).matchStateSubject as BehaviorSubject<MatchState | null>;
  });

  it('should call getRoundIdForMatch on init', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(engineServiceSpy.getRoundIdForMatch).toHaveBeenCalledOnceWith(SAMPLE_MATCH_ID);
  });

  it('should subscribe to streamRoundState for the resolved roundId', () => {
    fixture.detectChanges();
    // The roundId came from getRoundIdForMatch (default stub above).
    expect(engineServiceSpy.streamRoundState).toHaveBeenCalledOnceWith(SAMPLE_ROUND_ID);
  });

  it('should push matchState when the SSE emits a RoundState containing our matchId', () => {
    fixture.detectChanges();

    const myMatch = sampleMatchState();
    const otherMatch = sampleMatchState({ matchId: 'm-other-1', currentMinute: 50 });
    const roundStateSubject = (engineServiceSpy as any).__roundStateSubject as BehaviorSubject<RoundState>;
    roundStateSubject.next(sampleRoundState([otherMatch, myMatch, sampleMatchState({ matchId: 'm-other-2' })]));

    expect(matchStateSubjectInternal.value).toBe(myMatch);
  });

  it('should NOT push matchState when the round SSE does not contain our matchId yet', () => {
    fixture.detectChanges();

    const roundStateSubject = (engineServiceSpy as any).__roundStateSubject as BehaviorSubject<RoundState>;
    roundStateSubject.next(sampleRoundState([
      sampleMatchState({ matchId: 'm-other-1' }),
      sampleMatchState({ matchId: 'm-other-2' })
    ]));

    // BehaviorSubject initial value is null — it stays null because the
    // filter found no match for us. The template's *ngIf then keeps the
    // "Cargando..." state visible until the next emission carries us.
    expect(matchStateSubjectInternal.value).toBeNull();
  });

  it('should set errorMsg when getRoundIdForMatch errors (e.g. 404 — match not in any active round)', () => {
    engineServiceSpy.getRoundIdForMatch.and.returnValue(throwError(() => new Error('404 Not Found')));
    fixture.detectChanges();

    const errorMsg = (component as any).errorMsgSubject.value as string;
    expect(errorMsg).toContain('No se puede cargar el partido');
    expect(errorMsg).toContain('haya finalizado');
    // Sanity: we don't crash, we don't redirect, we leave matchState null.
    expect(matchStateSubjectInternal.value).toBeNull();
  });

  it('should NOT call the removed MatchService.getMatch', () => {
    // Sanity check: the component constructor no longer injects MatchService,
    // so any attempt to invoke it would either throw or be a no-op. This test
    // documents the contract — if someone re-introduces the call, this test
    // fails to flag it via the spy on the (now absent) injection.
    fixture.detectChanges();
    expect((component as any).matchService).toBeUndefined();
  });

  it('should NOT call engineService.startEngine (legacy per-match endpoint no longer exists in back)', () => {
    fixture.detectChanges();
    expect(engineServiceSpy.startEngine).not.toHaveBeenCalled();
  });

  it('should NOT call engineService.streamMatchState (legacy per-match SSE no longer exists)', () => {
    fixture.detectChanges();
    expect(engineServiceSpy.streamMatchState).not.toHaveBeenCalled();
  });

  it('should NOT call engineService.getMatchState (legacy per-match polling no longer exists)', () => {
    fixture.detectChanges();
    expect(engineServiceSpy.getMatchState).not.toHaveBeenCalled();
  });

  it('should warn on console if environment.useSse is false (decision B5: force SSE round anyway)', () => {
    const originalUseSse = environment.useSse;
    (environment as any).useSse = false;
    spyOn(console, 'warn');
    try {
      fixture.detectChanges();
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/environment\.useSse is false/)
      );
    } finally {
      (environment as any).useSse = originalUseSse;
    }
  });

  it('should not warn on console when environment.useSse is true (default)', () => {
    spyOn(console, 'warn');
    fixture.detectChanges();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
