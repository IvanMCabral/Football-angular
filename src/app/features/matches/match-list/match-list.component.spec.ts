import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { MatchListComponent } from './match-list.component';
import { CareerService } from '../../../core/services/career.service';
import { CareerStatus, Fixture } from '../../../core/services/career.model';

type FixtureRoundResponse = {
  rounds: { round: number; matches: Fixture[]; byeTeam: string | null }[];
};

function makeFixture(matchId: string, status: Fixture['status'] = 'PENDING'): Fixture {
  return {
    matchId,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    homeTeamName: 'Real Madrid',
    awayTeamName: 'Mallorca',
    round: 1,
    status,
    homeGoals: status === 'COMPLETED' ? 2 : null,
    awayGoals: status === 'COMPLETED' ? 1 : null
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

describe('MatchListComponent — career fixture list', () => {
  let fixture: ComponentFixture<MatchListComponent>;
  let component: MatchListComponent;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let fixturesResponse$: Subject<FixtureRoundResponse>;
  let careerStatusResponse$: Subject<CareerStatus>;

  beforeEach(async () => {
    fixturesResponse$ = new Subject<FixtureRoundResponse>();
    careerStatusResponse$ = new Subject<CareerStatus>();

    careerServiceSpy = jasmine.createSpyObj('CareerService', ['getCareerStatus', 'getAllFixturesWithBye']);
    careerServiceSpy.getCareerStatus.and.returnValue(careerStatusResponse$.asObservable() as any);
    careerServiceSpy.getAllFixturesWithBye.and.returnValue(fixturesResponse$.asObservable());

    await TestBed.configureTestingModule({
      imports: [MatchListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CareerService, useValue: careerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchListComponent);
    component = fixture.componentInstance;
  });

  function render(): void {
    fixture.detectChanges();
  }

  function html(): string {
    return fixture.nativeElement.innerHTML;
  }

  function snapshot(): { loading: boolean; errorMessage: string; matchCount: number; hasError: boolean } {
    const state = (component as any).viewStateSubject.value as {
      loading: boolean;
      errorMessage: string;
      rounds: Array<{ matches: unknown[] }>;
    };

    return {
      loading: state.loading,
      errorMessage: state.errorMessage,
      matchCount: state.rounds.reduce((sum, round) => sum + round.matches.length, 0),
      hasError: html().includes('app-error-message')
    };
  }

  it('flips to loading=true on init, then renders real career fixture names', async () => {
    render();

    expect(snapshot().loading).toBe(true);
    expect(snapshot().matchCount).toBe(0);
    expect(html()).toContain('app-loading-spinner');

    fixturesResponse$.next({
      rounds: [{ round: 1, matches: [makeFixture('m1'), makeFixture('m2', 'COMPLETED')], byeTeam: 'Libre FC' }]
    });
    fixturesResponse$.complete();
    careerStatusResponse$.next(makeCareerStatus());
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().errorMessage).toBe('');
    expect(snapshot().matchCount).toBe(2);
    expect(html()).toContain('Fecha 1');
    expect(html()).toContain('Libre FC');
    expect(html()).toContain('Real Madrid');
    expect(html()).toContain('Mallorca');
    expect(html()).toContain('Sin jugar');
    expect(html()).toContain('2 - 1');
    expect(html()).not.toContain('Team</span>');
  });

  it('renders the error message when the fixture call fails', async () => {
    render();

    fixturesResponse$.error(new Error('boom'));
    careerStatusResponse$.next(makeCareerStatus({ careerId: null }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().errorMessage).toBe('boom');
    expect(snapshot().hasError).toBe(true);
  });

  it('renders the dashboard empty-state when the user has a career and no fixture is visible', async () => {
    render();

    fixturesResponse$.next({ rounds: [] });
    fixturesResponse$.complete();
    careerStatusResponse$.next(makeCareerStatus({ careerId: 'career-1' }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().matchCount).toBe(0);
    expect(html()).toContain('Los partidos se juegan desde el Dashboard');
    expect(html()).toContain('Ir al Dashboard');
  });

  it('renders the setup empty-state when the user has no career and no fixture is visible', async () => {
    render();

    fixturesResponse$.next({ rounds: [] });
    fixturesResponse$.complete();
    careerStatusResponse$.next(makeCareerStatus({ careerId: null }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();

    expect(snapshot().loading).toBe(false);
    expect(snapshot().matchCount).toBe(0);
    expect(html()).toContain('No tenés carrera activa');
    expect(html()).toContain('Iniciar Carrera');
  });

  it('re-clears the error and re-shows the spinner on a second loadMatches() call', async () => {
    render();

    fixturesResponse$.error(new Error('first-err'));
    careerStatusResponse$.next(makeCareerStatus({ careerId: null }));
    careerStatusResponse$.complete();
    await fixture.whenStable();
    render();
    expect(snapshot().errorMessage).toBe('first-err');
    expect(snapshot().hasError).toBe(true);

    fixturesResponse$ = new Subject<FixtureRoundResponse>();
    careerServiceSpy.getAllFixturesWithBye.and.returnValue(fixturesResponse$.asObservable());

    component.loadMatches();
    await fixture.whenStable();
    render();
    expect(snapshot().errorMessage).toBe('');
    expect(snapshot().loading).toBe(true);
    expect(html()).toContain('app-loading-spinner');
    expect(snapshot().hasError).toBe(false);
  });
});
