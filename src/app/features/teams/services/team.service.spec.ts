import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { TeamService } from './team.service';
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
    request.flush([]);

    expect(result).toEqual([]);
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
