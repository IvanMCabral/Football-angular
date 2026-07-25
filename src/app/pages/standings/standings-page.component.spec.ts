import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter, RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StandingsPageComponent } from './standings-page.component';
import { CareerService } from '../../core/services/career.service';
import { AllStandingsResponse, CareerStatus } from '../../core/services/career.model';

@Component({
  selector: 'app-stub',
  standalone: true,
  template: ''
})
class StubComponent {}

describe('StandingsPageComponent', () => {
  let component: StandingsPageComponent;
  let fixture: ComponentFixture<StandingsPageComponent>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  const USER_TEAM_ID = 'user-team-id-1';

  const PRIMERA_STANDINGS = [
    { teamId: USER_TEAM_ID, teamName: 'Real Madrid', division: 'PRIMERA', played: 5, won: 5, drawn: 0, lost: 0, goalsFor: 12, goalsAgainst: 2, goalDifference: 10, points: 15 },
    { teamId: 'team-barcelona', teamName: 'Barcelona', division: 'PRIMERA', played: 5, won: 4, drawn: 0, lost: 1, goalsFor: 10, goalsAgainst: 3, goalDifference: 7, points: 12 },
    { teamId: 'team-atletico', teamName: 'Atlético', division: 'PRIMERA', played: 5, won: 3, drawn: 0, lost: 2, goalsFor: 6, goalsAgainst: 5, goalDifference: 1, points: 9 },
    { teamId: 'team-last', teamName: 'Last Team PRIMERA', division: 'PRIMERA', played: 5, won: 0, drawn: 0, lost: 5, goalsFor: 1, goalsAgainst: 10, goalDifference: -9, points: 0 }
  ];

  const SEGUNDA_STANDINGS = [
    { teamId: 'seg-top', teamName: 'Top SEGUNDA', division: 'SEGUNDA', played: 5, won: 4, drawn: 1, lost: 0, goalsFor: 8, goalsAgainst: 2, goalDifference: 6, points: 13 },
    { teamId: 'seg-mid', teamName: 'Mid SEGUNDA', division: 'SEGUNDA', played: 5, won: 2, drawn: 1, lost: 2, goalsFor: 5, goalsAgainst: 5, goalDifference: 0, points: 7 },
    { teamId: 'seg-bot', teamName: 'Bot SEGUNDA', division: 'SEGUNDA', played: 5, won: 0, drawn: 0, lost: 5, goalsFor: 0, goalsAgainst: 12, goalDifference: -12, points: 0 }
  ];

  const TERCERA_STANDINGS = [
    { teamId: 'ter-1', teamName: 'Tercera 1', division: 'TERCERA', played: 5, won: 3, drawn: 0, lost: 2, goalsFor: 6, goalsAgainst: 5, goalDifference: 1, points: 9 }
  ];

  const ALL_STANDINGS: AllStandingsResponse = {
    divisions: [
      { divisionId: 'div-1', divisionName: 'PRIMERA', isUserDivision: true,  standings: PRIMERA_STANDINGS },
      { divisionId: 'div-2', divisionName: 'SEGUNDA', isUserDivision: false, standings: SEGUNDA_STANDINGS },
      { divisionId: 'div-3', divisionName: 'TERCERA', isUserDivision: false, standings: TERCERA_STANDINGS }
    ]
  };

  beforeEach(async () => {
    careerServiceSpy = jasmine.createSpyObj('CareerService', ['getAllStandings', 'getCareerStatus']);
    httpSpy = jasmine.createSpyObj('HttpClient', ['get']);

    careerServiceSpy.getAllStandings.and.returnValue(of(ALL_STANDINGS));
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: 'career-1',
      season: 2,
      currentRound: 5,
      totalRounds: 38,
      userTeamId: USER_TEAM_ID,
      userSessionTeamId: USER_TEAM_ID,
      userTeamName: 'Real Madrid',
      hasLastMatchPlayed: false,
      nextMatchId: null,
      engineStatus: 'IDLE',
      canAdvanceRound: true,
      careerPhase: 'WAITING_USER',
      squadSize: 11,
      freePlayersCount: 0,
      userDivision: 'PRIMERA',
      promotionsAvailable: false
    } as CareerStatus));

    await TestBed.configureTestingModule({
      imports: [StandingsPageComponent, StubComponent],
      providers: [
        { provide: CareerService, useValue: careerServiceSpy },
        { provide: HttpClient, useValue: httpSpy },
        provideRouter([])
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StandingsPageComponent);
    component = fixture.componentInstance;
  });

  it('renders the page header with title and back link', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const h1 = fixture.nativeElement.querySelector('.page-header h1');
      expect(h1).not.toBeNull('header h1 must render');
      expect(h1.textContent).toContain('Tabla de posiciones');
      const back = fixture.nativeElement.querySelector('a.back-link');
      expect(back).not.toBeNull('back link must render');
      done();
    });
  });

  it('renders the user-division pill from careerStatus.userDivision', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const pill = fixture.nativeElement.querySelector('.user-division-pill');
      expect(pill).not.toBeNull('user-division-pill must render when status has userDivision');
      expect(pill.textContent).toContain('PRIMERA');
      expect(pill.className).toContain('tier-primera');
      done();
    });
  });

  it('hides the user-division pill when careerStatus omits userDivision (legacy)', (done: DoneFn) => {
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: 'career-1',
      season: 1,
      currentRound: 1,
      totalRounds: 38,
      userTeamId: USER_TEAM_ID,
      userSessionTeamId: USER_TEAM_ID,
      userTeamName: 'Real Madrid',
      hasLastMatchPlayed: false,
      nextMatchId: null,
      engineStatus: 'IDLE',
      canAdvanceRound: true,
      careerPhase: 'WAITING_USER',
      squadSize: 11,
      freePlayersCount: 0
    } as any));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const pill = fixture.nativeElement.querySelector('.user-division-pill');
      expect(pill).toBeNull('user-division-pill must NOT render when status lacks userDivision');
      done();
    });
  });

  it('renders lower-division labels verbatim with tier-default fallback', (done: DoneFn) => {
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: 'career-1',
      season: 3,
      currentRound: 1,
      totalRounds: 38,
      userTeamId: USER_TEAM_ID,
      userSessionTeamId: USER_TEAM_ID,
      userTeamName: 'Real Madrid',
      hasLastMatchPlayed: false,
      nextMatchId: null,
      engineStatus: 'IDLE',
      canAdvanceRound: true,
      careerPhase: 'WAITING_USER',
      squadSize: 11,
      freePlayersCount: 0,
      userDivision: 'CUARTA',
      promotionsAvailable: false
    } as CareerStatus));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const pill = fixture.nativeElement.querySelector('.user-division-pill');
      expect(pill).not.toBeNull('user-division-pill must render when userDivision=CUARTA');
      expect(pill.textContent).toContain('CUARTA',
        'pill must display the backend label verbatim, not remap to PRIMERA');
      expect(pill.className).toContain('tier-default',
        'pill must have tier-default class for unknown tier (CUARTA)');
      expect(pill.className).not.toContain('tier-primera',
        'pill must NOT have tier-primera when userDivision=CUARTA');
      done();
    });
  });

  it('maps known division labels to tier CSS classes', () => {
    expect(component.tierCssClass('PRIMERA')).toBe('tier-primera');
    expect(component.tierCssClass('SEGUNDA')).toBe('tier-segunda');
    expect(component.tierCssClass('TERCERA')).toBe('tier-tercera');
    expect(component.tierCssClass('CUARTA')).toBe('tier-default');
    expect(component.tierCssClass('QUINTA')).toBe('tier-default');
    expect(component.tierCssClass(null)).toBe('tier-default');
    expect(component.tierCssClass(undefined)).toBe('tier-default');
  });

  it('renders the promotion and relegation zone legend', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const legend = fixture.nativeElement.querySelector('.zone-legend');
      expect(legend).not.toBeNull('zone-legend must render');
      const promo = legend.querySelector('.zone-promotion');
      const releg = legend.querySelector('.zone-relegation');
      expect(promo).not.toBeNull('promotion legend item must render');
      expect(releg).not.toBeNull('relegation legend item must render');
      done();
    });
  });

  it('loads standings and exposes them on divisions$', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      let divisions: any[] | undefined;
      component.divisions$.subscribe(d => { divisions = d; });
      component.loadStandings();
      fixture.whenStable().then(() => {
        expect(divisions).toBeDefined('divisions$ must emit');
        expect(divisions!.length).toBe(3, `expected 3 divisions, got ${divisions!.length}`);
        expect(divisions![0].divisionName).toBe('PRIMERA');
        expect(divisions![0].isUserDivision).toBe(true);
        done();
      });
    });
  });

  it('populates error$ when getAllStandings fails', (done: DoneFn) => {
    careerServiceSpy.getAllStandings.and.returnValue(throwError(() => ({ message: 'backend down' })));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      let emittedError: string | null = null;
      component.error$.subscribe(e => { emittedError = e; });
      component.loadStandings();
      fixture.whenStable().then(() => {
        expect(emittedError).not.toBeNull();
        expect(emittedError).toContain('backend down');
        done();
      });
    });
  });

  it('exposes TEAMS_PROMOTED_OR_RELEGATED = 3 constant', () => {
    expect(component.TEAMS_PROMOTED_OR_RELEGATED).toBe(3,
      'TEAMS_PROMOTED_OR_RELEGATED must mirror PromotionRelegationService.TEAMS_PROMOTED_OR_RELEGATED');
  });

  it('reads userTeamId from careerStatus (used for row highlight)', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.userTeamId).toBe(USER_TEAM_ID);
      done();
    });
  });

  it('marks the user team row with highlight class and star marker', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const highlightedRows = fixture.nativeElement.querySelectorAll('tr.highlight');
      expect(highlightedRows.length).toBeGreaterThan(0, 'at least one tr.highlight must render');

      expect(highlightedRows.length).toBe(1,
        `expected exactly 1 highlighted row, got ${highlightedRows.length}`);

      const userRow = highlightedRows[0];
      expect(userRow.textContent).toContain('Real Madrid',
        'highlighted row should contain the user team name');

      const marker = userRow.querySelector('.user-team-marker');
      expect(marker).not.toBeNull('highlighted row should contain the .user-team-marker');
      expect(marker.textContent.trim()).toBe('⭐');
      done();
    });
  });

  it('keeps user-team highlight when the row is also in a promotion zone', (done: DoneFn) => {
    // (top-3) the highlighted row must still be visible. The new CSS
    const PRIMERA_PROMO_USER = [
      { teamId: 'bottom-1', teamName: 'Bottom PRIMERA', division: 'PRIMERA', played: 5, won: 0, drawn: 0, lost: 5, goalsFor: 1, goalsAgainst: 10, goalDifference: -9, points: 0 },
      { teamId: 'bot-2', teamName: 'Bot2 PRIMERA', division: 'PRIMERA', played: 5, won: 0, drawn: 0, lost: 5, goalsFor: 1, goalsAgainst: 10, goalDifference: -9, points: 0 },
      { teamId: USER_TEAM_ID, teamName: 'Real Madrid (us)', division: 'PRIMERA', played: 5, won: 5, drawn: 0, lost: 0, goalsFor: 12, goalsAgainst: 2, goalDifference: 10, points: 15 }
    ];
    careerServiceSpy.getAllStandings.and.returnValue(of({
      divisions: [
        { divisionId: 'div-1', divisionName: 'PRIMERA', isUserDivision: true,  standings: PRIMERA_PROMO_USER }
      ]
    } as AllStandingsResponse));

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const rows = fixture.nativeElement.querySelectorAll('tr');
      const userRow = Array.from(rows).find((r: any) =>
        r.textContent.includes('Real Madrid (us)')
      ) as HTMLElement | undefined;
      expect(userRow).toBeDefined('user row must render');
      expect(userRow!.classList.contains('highlight')).toBeTrue();
      expect(userRow!.classList.contains('zone-promotion')).toBeTrue();
      done();
    });
  });
});
