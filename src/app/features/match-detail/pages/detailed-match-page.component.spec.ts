// Tests for the input-driven path used when this page is embedded in the harness.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { DetailedMatchPageComponent } from './detailed-match-page.component';
import { MatchDetailApiService } from '../services/match-detail-api.service';
import { MatchDetail } from '../models/match-detail.model';
import { DETAILED_MATCH_ENGINE_TYPE } from '../models/detailed-match-discriminators.model';

describe('DetailedMatchPageComponent input path', () => {
  let component: DetailedMatchPageComponent;
  let fixture: ComponentFixture<DetailedMatchPageComponent>;
  let api: MatchDetailApiService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const routeStub = {
      snapshot: { paramMap: { get: (_: string) => null } },
    };

    await TestBed.configureTestingModule({
      imports: [DetailedMatchPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MatchDetailApiService,
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailedMatchPageComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(MatchDetailApiService);
  });

  it('fetches detail from inputs when provided (no route context)', async () => {
    const detail = makeDetail('match-1', 'career-1', 2, 1);
    spyOn(api, 'getMatchDetail').and.returnValue(of(detail));

    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-1';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getMatchDetail).toHaveBeenCalledWith('career-1', 'match-1');
    expect(component.detail).toEqual(detail);
    expect(component.careerId).toBe('career-1');
    expect(component.matchId).toBe('match-1');
    expect(component.loading).toBeFalse();
    expect(component.error).toBe('');
  });

  it('refetches when inputMatchId changes (after initial load)', async () => {
    const detailA = makeDetail('match-A', 'career-1', 1, 0);
    const detailB = makeDetail('match-B', 'career-1', 2, 1);
    spyOn(api, 'getMatchDetail').and.returnValues(of(detailA), of(detailB));

    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-A';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.detail?.matchId).toBe('match-A');

    // Change matchId — should trigger a refetch via ngOnChanges
    component.inputMatchId = 'match-B';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getMatchDetail).toHaveBeenCalledTimes(2);
    expect(api.getMatchDetail).toHaveBeenCalledWith('career-1', 'match-B');
    expect(component.detail?.matchId).toBe('match-B');
  });

  it('falls back to route params when inputs are NOT provided', async () => {
    const detail = makeDetail('match-r', 'career-r', 3, 0);
    spyOn(api, 'getMatchDetail').and.returnValue(of(detail));

    // Reconfigure TestBed with a route stub that returns career-r/match-r
    const routeStubWithParams = {
      snapshot: {
        paramMap: {
          get: (key: string) =>
            key === 'careerId' ? 'career-r' : key === 'matchId' ? 'match-r' : null,
        },
      },
    };
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DetailedMatchPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MatchDetailApiService,
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: routeStubWithParams },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailedMatchPageComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(MatchDetailApiService);
    spyOn(api, 'getMatchDetail').and.returnValue(of(detail));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getMatchDetail).toHaveBeenCalledWith('career-r', 'match-r');
    expect(component.detail?.matchId).toBe('match-r');
  });

  it('surfaces HTTP errors when using input path', async () => {
    spyOn(api, 'getMatchDetail').and.returnValue(throwError(() => new Error('boom')));

    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-1';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error).toContain('No se pudo cargar');
    expect(component.loading).toBeFalse();
    expect(component.detail).toBeNull();
  });

  it('treats null body (404) as detail-unavailable, not error', async () => {
    spyOn(api, 'getMatchDetail').and.returnValue(of(null));

    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-1';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error).toBe('');
    expect(component.loading).toBeFalse();
    expect(component.detail).toBeNull();
  });

  it('retry() refetches when input path is used', async () => {
    const detail1 = makeDetail('match-1', 'career-1', 1, 0);
    const detail2 = makeDetail('match-1', 'career-1', 2, 0);
    spyOn(api, 'getMatchDetail').and.returnValues(of(detail1), of(detail2));

    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-1';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.detail?.homeGoals).toBe(1);

    component.retry();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getMatchDetail).toHaveBeenCalledTimes(2);
    expect(component.detail?.homeGoals).toBe(2);
  });

  it('shows an error when no input and route is also empty', async () => {
    // Both inputs null, route stub returns null
    const routeStubEmpty = {
      snapshot: { paramMap: { get: (_: string) => null } },
    };
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DetailedMatchPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MatchDetailApiService,
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: routeStubEmpty },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailedMatchPageComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(MatchDetailApiService);
    spyOn(api, 'getMatchDetail');

    component.inputCareerId = null;
    component.inputMatchId = null;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error).toContain('Missing');
    expect(api.getMatchDetail).not.toHaveBeenCalled();
  });

  it('blocks substitution modal when match detail has no real bench players', () => {
    component.detail = makeDetail('match-1', 'career-1', 0, 0);

    component.openSubstitutionDialog();

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/Sustituciones reales bloqueadas/),
      'Cerrar',
      jasmine.objectContaining({ panelClass: 'snack-warning' })
    );
  });

  it('renders the responsive narrative in the required information order', async () => {
    const detail = makeDetail('match-1', 'career-1', 2, 1);
    spyOn(api, 'getMatchDetail').and.returnValue(of(detail));
    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-1';

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const selectors = ['.match-header', '.summary-cards', '#match-events', '#match-stats', '#match-lineups', '#match-players', '#match-shots'];
    const allElements = Array.from(root.querySelectorAll('*'));
    const positions = selectors.map(selector => allElements.indexOf(root.querySelector(selector)!));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(root.querySelector('h1')?.textContent).toContain('Home 2–1 Away');
    expect(root.querySelector('nav[aria-label="Secciones del detalle del partido"]')).not.toBeNull();
  });

  it('separates important events from the complete supporting narrative', () => {
    const detail = makeDetail('match-1', 'career-1', 1, 0);
    detail.timeline = [
      makeEvent('SHOT', 'Shot missed'),
      makeEvent('GOAL', 'Alex scored'),
      makeEvent('CORNER', 'Corner'),
      makeEvent('YELLOW_CARD', 'Alex received a yellow card'),
    ];
    component.detail = detail;

    expect(component.importantEvents().map(event => event.type)).toEqual(['GOAL', 'YELLOW_CARD']);
    expect(component.supportingEvents().map(event => event.type)).toEqual(['SHOT', 'CORNER']);
  });

  it('uses correct Spanish accents for event labels and descriptions', () => {
    expect(component.eventTypeLabel('INJURY')).toBe('Lesión');
    expect(component.eventTypeLabel('CORNER')).toBe('Córner');
    expect(component.eventDescriptionLabel('Alex committed a foul')).toBe('Alex cometió una falta');
    expect(component.eventDescriptionLabel('Alex received a yellow card')).toBe('Alex recibió amarilla');
    expect(component.eventDescriptionLabel('Alex was injured')).toBe('Alex se lesionó');
  });

  it('resets collapsed mobile sections when match A changes to match B', async () => {
    const detailA = makeDetail('match-A', 'career-1', 1, 0);
    const detailB = makeDetail('match-B', 'career-1', 0, 2);
    spyOn(api, 'getMatchDetail').and.returnValues(of(detailA), of(detailB));
    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-A';
    fixture.detectChanges();
    component.disclosures.players = true;
    component.disclosures.lineups = true;

    component.inputMatchId = 'match-B';
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.detail?.matchId).toBe('match-B');
    expect(component.disclosures.players).toBeFalse();
    expect(component.disclosures.lineups).toBeFalse();
    expect(api.getMatchDetail).toHaveBeenCalledTimes(2);
  });

  it('exposes both teams lineups without changing backend data', () => {
    const detail = makeDetail('match-1', 'career-1', 0, 0);
    detail.homeStartingPlayers = [makeLineupPlayer('home-1', 'Local Uno')];
    detail.awayBenchPlayers = [makeLineupPlayer('away-1', 'Visitante Uno')];
    component.detail = detail;

    expect(component.hasLineups()).toBeTrue();
    expect(component.lineupTeams().map(team => team.name)).toEqual(['Home', 'Away']);
    expect(component.lineupTeams()[0].starters[0].name).toBe('Local Uno');
    expect(component.lineupTeams()[1].bench[0].name).toBe('Visitante Uno');
  });

  it('uses named native disclosures and route-safe section fragments', async () => {
    const detail = makeDetail('match-1', 'career-1', 0, 0);
    detail.timeline = [makeEvent('SHOT', 'Shot missed'), makeEvent('GOAL', 'Alex scored')];
    spyOn(api, 'getMatchDetail').and.returnValue(of(detail));
    component.inputCareerId = 'career-1';
    component.inputMatchId = 'match-1';

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const fragments = Array.from(root.querySelectorAll<HTMLAnchorElement>('.section-nav a'))
      .map(link => link.getAttribute('href'));
    expect(fragments.map((href, index) => href?.endsWith([
      '#match-events', '#match-stats', '#match-lineups', '#match-players', '#match-shots'
    ][index]))).toEqual([true, true, true, true, true]);
    const eventsSection = root.querySelector<HTMLElement>('#match-events')!;
    const scrollSpy = spyOn(eventsSection, 'scrollIntoView');
    root.querySelector<HTMLAnchorElement>('.section-nav a')!.click();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    const summaries = Array.from(root.querySelectorAll<HTMLElement>('details > summary'));
    expect(summaries.length).toBe(4);
    expect(summaries.every(summary => summary.textContent?.trim().length)).toBeTrue();
  });

  it('builds substitution modal data with real lineup players from match detail', () => {
    const detail = makeDetail('match-1', 'career-1', 0, 0);
    detail.homeStartingPlayers = Array.from({ length: 11 }, (_, i) => ({
      sessionPlayerId: `starter-${i}`,
      name: `Starter ${i}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 75,
      attack: 75,
      defense: 75,
      energy: 100,
      form: 50,
      injured: false,
    }));
    detail.homeBenchPlayers = [{
      sessionPlayerId: 'bench-1',
      name: 'Real Bench Player',
      position: 'ATT',
      overall: 74,
      attack: 74,
      defense: 60,
      energy: 100,
      form: 50,
      injured: false,
    }];
    component.detail = detail;

    const data = (component as any).buildRealSubstitutionDialogData();

    expect(data.startingPlayers.length).toBe(11);
    expect(data.benchPlayers[0].name).toBe('Real Bench Player');
  });

  it('explains why completed harness matches cannot confirm live substitutions', () => {
    const message = (component as any).substitutionErrorMessage({
      status: 422,
      message: 'Http failure response',
      error: {
        message: 'No active match session for userId=user matchId=match-1',
      },
    });

    expect(message).toContain('sesión viva activa');
    expect(message).toContain('modo live');
  });
});

function makeEvent(type: MatchDetail['timeline'][number]['type'], description: string): MatchDetail['timeline'][number] {
  return {
    minute: 12,
    type,
    teamId: 'home',
    playerId: 'player-1',
    playerName: 'Alex',
    description,
  };
}

function makeLineupPlayer(sessionPlayerId: string, name: string): NonNullable<MatchDetail['homeStartingPlayers']>[number] {
  return {
    sessionPlayerId,
    name,
    position: 'MID',
    overall: 75,
    attack: 75,
    defense: 70,
    energy: 100,
    form: 50,
    injured: false,
  };
}

function makeDetail(matchId: string, careerId: string, homeGoals: number, awayGoals: number): MatchDetail {
  return {
    matchId,
    careerId,
    seasonNumber: 1,
    round: 5,
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeTeamName: 'Home',
    awayTeamName: 'Away',
    homeGoals,
    awayGoals,
    homeXg: 1.5,
    awayXg: 0.8,
    homeShots: 10,
    awayShots: 6,
    homePossession: 55,
    awayPossession: 45,
    timeline: [],
    playerRatings: [],
    homeStartingPlayers: [],
    homeBenchPlayers: [],
    awayStartingPlayers: [],
    awayBenchPlayers: [],
    schemaVersion: '1',
    engineType: DETAILED_MATCH_ENGINE_TYPE,
    createdAt: new Date().toISOString(),
  };
}
