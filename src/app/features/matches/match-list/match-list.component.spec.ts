/**
 * V25D77-C42 F1: regression test for the match-list change-detection fix.
 *
 * <p>The pre-fix {@code MatchListComponent} used default change detection
 * with direct field assignment in {@code subscribe(next)} callbacks. Under
 * some route-reuse / zone-event-ordering edge cases the DOM stayed on the
 * loading spinner even after the http response had populated
 * {@code matches} and {@code loading=false} (state was set, but the
 * {@code @if/@else if} tree never re-evaluated). The fix converts the
 * component to OnPush + a single view-state BehaviorSubject consumed via
 * {@code async} pipe in the template, so the async pipe drives CD directly
 * via {@code markForCheck} on every emission.
 *
 * <p>This spec locks in the new contract:
 * <ol>
 *   <li>ngOnInit flips the view-state to {@code loading=true} BEFORE the
 *       first http call (initial spinner shown).</li>
 *   <li>When the http call resolves with matches, the spinner goes away
 *       and the matches list is rendered (DOM reflects the new state).</li>
 *   <li>When the http call errors, the error message is rendered instead
 *       of the spinner.</li>
 *   <li>When the http call resolves with an empty list and the user has
 *       a career, the empty-state with the dashboard CTA is shown.</li>
 *   <li>When the http call resolves with an empty list and the user has
 *       NO career, the empty-state with the setup CTA is shown.</li>
 *   <li>Calling {@code loadMatches()} after a successful load clears the
 *       previous error and re-shows the spinner — locks in that the
 *       @if/{@code state.errorMessage} branch is re-evaluated, which was
 *       the broken behavior pre-fix.</li>
 * </ol>
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { MatchListComponent } from './match-list.component';
import { MatchService } from '../services/match.service';
import { CareerService } from '../../../core/services/career.service';
import { Match, MatchStatus } from '../../../shared/models/match.model';
import { CareerStatus } from '../../../core/services/career.model';

function makeMatch(id: string, status: MatchStatus = 'SCHEDULED'): Match {
  return {
    id,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    scheduledAt: '2026-06-29T15:00:00Z',
    status,
    result: null,
    createdAt: '2026-06-01T10:00:00Z',
    simulatedAt: null,
    round: 1
  };
}

function makeCareerStatus(overrides: Partial<CareerStatus> = {}): CareerStatus {
  return {
    careerId: 'career-1',
    season: 1,
    currentRound: 1,
    totalRounds: 38,
    userTeamId: 'team-1',
    userSessionTeamId: 'sess-1',
    userTeamName: 'Test FC',
    hasLastMatchPlayed: false,
    nextMatchId: null,
    engineStatus: 'IDLE',
    canAdvanceRound: false,
    careerPhase: 'PRE_MATCH',
    squadSize: 11,
    freePlayersCount: 0,
    ...overrides
  };
}

describe('MatchListComponent — V25D77-C42 F1 (CD fix)', () => {
  let fixture: ComponentFixture<MatchListComponent>;
  let component: MatchListComponent;
  let matchServiceSpy: jasmine.SpyObj<MatchService>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let matchesResponse$: Subject<Match[]>;
  let careerStatusResponse$: Subject<CareerStatus>;

  beforeEach(async () => {
    matchesResponse$ = new Subject<Match[]>();
    careerStatusResponse$ = new Subject<CareerStatus>();

    matchServiceSpy = jasmine.createSpyObj('MatchService', ['getMatches']);
    matchServiceSpy.getMatches.and.returnValue(matchesResponse$.asObservable());

    careerServiceSpy = jasmine.createSpyObj('CareerService', ['getCareerStatus']);
    // CareerService.getCareerStatus() returns Observable<CareerStatus> (not nullable);
    // the component's own catchError converts an error to null. To simulate the
    // "no career" path in the template we emit a CareerStatus with careerId=null.
    careerServiceSpy.getCareerStatus.and.returnValue(careerStatusResponse$.asObservable() as any);

    await TestBed.configureTestingModule({
      imports: [MatchListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatchService, useValue: matchServiceSpy },
        { provide: CareerService, useValue: careerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchListComponent);
    component = fixture.componentInstance;
  });

  function snapshot(): { loading: boolean; errorMessage: string; matchCount: number; hasEmpty: boolean; hasError: boolean } {
    const state = (component as any).viewStateSubject.value as {
      loading: boolean;
      errorMessage: string;
      matches: Match[];
    };
    const html = fixture.nativeElement.innerHTML;
    return {
      loading: state.loading,
      errorMessage: state.errorMessage,
      matchCount: state.matches.length,
      hasEmpty: html.includes('No tenés carrera activa') || html.includes('Los partidos se juegan desde el Dashboard'),
      hasError: html.includes('app-error-message')
    };
  }

  function render(): void {
    fixture.detectChanges();
  }

  it('flips to loading=true on init, then renders the list when the response lands', async () => {
    render(); // triggers ngOnInit → patchState({loading:true})

    // After ngOnInit: loading=true, no matches yet, spinner rendered
    expect(snapshot().loading).toBe(true);
    expect(snapshot().matchCount).toBe(0);
    expect(fixture.nativeElement.innerHTML).toContain('app-loading-spinner');

    // Http response lands
    matchesResponse$.next([makeMatch('m1'), makeMatch('m2', 'SIMULATED')]);
    matchesResponse$.complete();
    careerStatusResponse$.next(makeCareerStatus());
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().errorMessage).toBe('');
    expect(snapshot().matchCount).toBe(2);
    expect(fixture.nativeElement.innerHTML).toContain('m1');
    expect(fixture.nativeElement.innerHTML).toContain('m2');
  });

  it('renders the error message when the http call fails', async () => {
    render();

    matchesResponse$.error(new Error('boom'));
    careerStatusResponse$.next(makeCareerStatus({ careerId: null }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().errorMessage).toBe('boom');
    expect(snapshot().hasError).toBe(true);
  });

  it('renders the empty-state with dashboard CTA when the user has a career and no matches', async () => {
    render();

    matchesResponse$.next([]);
    matchesResponse$.complete();
    careerStatusResponse$.next(makeCareerStatus({ careerId: 'career-1' }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().matchCount).toBe(0);
    expect(fixture.nativeElement.innerHTML).toContain('Los partidos se juegan desde el Dashboard');
    expect(fixture.nativeElement.innerHTML).toContain('Ir al Dashboard');
  });

  it('renders the empty-state with setup CTA when the user has no career and no matches', async () => {
    render();

    matchesResponse$.next([]);
    matchesResponse$.complete();
    careerStatusResponse$.next(makeCareerStatus({ careerId: null }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().matchCount).toBe(0);
    expect(fixture.nativeElement.innerHTML).toContain('No tenés carrera activa');
    expect(fixture.nativeElement.innerHTML).toContain('Iniciar Carrera');
  });

  it('re-clears the error and re-shows the spinner on a second loadMatches() call (locks in CD re-evaluation)', async () => {
    render();

    // First call: errors
    matchesResponse$.error(new Error('first-err'));
    careerStatusResponse$.next(makeCareerStatus({ careerId: null }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();
    expect(snapshot().errorMessage).toBe('first-err');
    expect(snapshot().hasError).toBe(true);

    // Re-arm the spy for the second call
    matchesResponse$ = new Subject<Match[]>();
    matchServiceSpy.getMatches.and.returnValue(matchesResponse$.asObservable());

    // Second call: resets error and re-shows spinner (this was the broken pre-fix behavior)
    component.loadMatches();
    await fixture.whenStable();
    render();
    expect(snapshot().errorMessage).toBe('');
    expect(snapshot().loading).toBe(true);
    expect(fixture.nativeElement.innerHTML).toContain('app-loading-spinner');
    expect(snapshot().hasError).toBe(false);
  });
});
