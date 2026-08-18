import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { TeamService } from './team.service';
import { WorldTeamResponse } from '../../../shared/models/team.model';
import { environment } from '../../../environments/environment';
import { SessionPlayer } from '../../../shared/models/player.model';

describe('TeamService', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TeamService]
    });

    service = TestBed.inject(TeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMyTeamSquad falls back to career players squad when teams/me/squad is empty', () => {
    const fallbackSquad = [
      { sessionPlayerId: 'bench-1', name: 'Bench One', position: 'MID' }
    ] as SessionPlayer[];

    let result: SessionPlayer[] | undefined;
    service.getMyTeamSquad().subscribe(players => result = players);

    httpMock.expectOne(`${environment.apiUrl}/career/teams/me/squad`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/career/players/squad`).flush(fallbackSquad);

    expect(result).toEqual(fallbackSquad);
  });

  it('getAllTeams requests the canonical world teams route with the authenticated user', () => {
    let result: unknown;
    service.getAllTeams('user/1').subscribe(value => result = value);

    const request = httpMock.expectOne(
      `${environment.apiUrl}/world/teams?userId=user%2F1`);
    expect(request.request.method).toBe('GET');
    request.flush([] as WorldTeamResponse[]);

    expect(result).toEqual([]);
  });

  it('maps the actual WorldTeam wire contract to the canonical Team model', () => {
    let result: any;
    service.getAllTeams('user-1').subscribe(value => result = value);

    const request = httpMock.expectOne(
      `${environment.apiUrl}/world/teams?userId=user-1`);
    request.flush([
      {
        worldTeamId: 'world-team-1',
        realTeamId: 'real-team-1',
        realLeagueId: 'league-1',
        name: 'Real Team One',
        country: 'ES',
        city: 'Madrid',
        baseBudget: 125000000,
        baseFormation: '4-3-3',
        origin: 'REAL',
        division: 'PRIMERA'
      },
      {
        worldTeamId: 'world-team-2',
        realTeamId: 'real-team-2',
        realLeagueId: 'league-2',
        name: 'Real Team Two',
        country: 'AR',
        city: 'Buenos Aires',
        baseBudget: 90000000,
        baseFormation: '4-4-2',
        origin: 'REAL',
        division: 'PRIMERA'
      }
    ] as WorldTeamResponse[]);

    expect(result).toEqual([
      {
        id: 'world-team-1',
        name: 'Real Team One',
        country: 'ES',
        budget: 125000000,
        formation: '4-3-3',
        realTeamId: 'real-team-1',
        realLeagueId: 'league-1'
      },
      {
        id: 'world-team-2',
        name: 'Real Team Two',
        country: 'AR',
        budget: 90000000,
        formation: '4-4-2',
        realTeamId: 'real-team-2',
        realLeagueId: 'league-2'
      }
    ]);
    expect(result.every((team: any) => team.id && team.name && team.budget !== undefined)).toBeTrue();
  });

  it('preserves a realistic three-league 70-team catalog without undefined ids', () => {
    let result: any[] | undefined;
    service.getAllTeams('user-1').subscribe(value => result = value);

    const request = httpMock.expectOne(
      `${environment.apiUrl}/world/teams?userId=user-1`);
    const fixture: WorldTeamResponse[] = Array.from({ length: 70 }, (_, index) => ({
      worldTeamId: `world-team-${index + 1}`,
      realTeamId: `real-team-${index + 1}`,
      realLeagueId: `league-${index < 20 ? 1 : index < 50 ? 2 : 3}`,
      name: `Catalog Team ${index + 1}`,
      country: index < 20 ? 'ES' : index < 50 ? 'AR' : 'BR',
      city: `City ${index + 1}`,
      baseBudget: 1000000 + index,
      baseFormation: index % 2 === 0 ? '4-3-3' : '4-4-2',
      origin: 'REAL',
      division: 'PRIMERA'
    }));
    request.flush(fixture);

    expect(result).toHaveSize(70);
    expect(new Set(result!.map(team => team.id)).size).toBe(70);
    expect(result!.every(team => team.id && team.name && team.realLeagueId)).toBeTrue();
    expect(result!.filter(team => team.realLeagueId === 'league-1')).toHaveSize(20);
    expect(result!.filter(team => team.realLeagueId === 'league-2')).toHaveSize(30);
    expect(result!.filter(team => team.realLeagueId === 'league-3')).toHaveSize(20);
  });

  it('fails the mapping rather than returning an undefined productive id', () => {
    let error: unknown;
    service.getAllTeams('user-1').subscribe({ error: value => error = value });

    const request = httpMock.expectOne(
      `${environment.apiUrl}/world/teams?userId=user-1`);
    request.flush([{ name: 'Broken Team' }]);

    expect(error).toBeTruthy();
  });

  it('getMyTeamSquad falls back to career players squad when teams/me/squad fails', () => {
    const fallbackSquad = [
      { sessionPlayerId: 'bench-2', name: 'Bench Two', position: 'DEF' }
    ] as SessionPlayer[];

    let result: SessionPlayer[] | undefined;
    service.getMyTeamSquad().subscribe(players => result = players);

    httpMock.expectOne(`${environment.apiUrl}/career/teams/me/squad`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${environment.apiUrl}/career/players/squad`).flush(fallbackSquad);

    expect(result).toEqual(fallbackSquad);
  });
});
