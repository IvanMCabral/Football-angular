import { of, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { WorldCatalogService } from './world-catalog.service';
import { environment } from '../../environments/environment';

describe('WorldCatalogService', () => {
  const user = { id: 'user-1', username: 'manager', email: 'manager@example.test' } as any;
  let http: jasmine.SpyObj<HttpClient>;
  let auth: jasmine.SpyObj<AuthService>;
  let service: WorldCatalogService;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getUserInfo']);
    auth.getUserInfo.and.returnValue(of(user));
    service = new WorldCatalogService(http, auth);
  });

  it('shares the league request across subscribers', async () => {
    http.get.and.returnValue(of([{ realLeagueId: 'league-1', name: 'Liga', country: 'ES' }]));

    const request = service.leagues();
    await Promise.all([firstValueFrom(request), firstValueFrom(request)]);

    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('shares team metadata by league and invalidates it explicitly', async () => {
    http.get.and.returnValue(of([{ worldTeamId: 'team-1', name: 'Team', country: 'ES', formation: '4-4-2', ovr: 70, playerCount: 25 }]));

    await firstValueFrom(service.teamsForLeague('league-1'));
    await firstValueFrom(service.teamsForLeague('league-1'));
    expect(http.get).toHaveBeenCalledTimes(1);

    service.invalidate();
    await firstValueFrom(service.teamsForLeague('league-1'));
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('keeps local initialization on the development seed contract', async () => {
    http.post.and.returnValue(of({ status: 'ok' }));

    await firstValueFrom(service.initializeWorld());

    expect(http.post).toHaveBeenCalledWith(
      '/api/v1/world/seed-la-liga?userId=user-1',
      {}
    );
  });

  it('uses the authenticated production snapshot command instead of the disabled seed route', async () => {
    const originalProduction = environment.production;
    environment.production = true;
    http.post.and.returnValue(of({ status: 'ok' }));

    try {
      await firstValueFrom(service.initializeWorld());
      expect(auth.getUserInfo).not.toHaveBeenCalled();
      expect(http.post).toHaveBeenCalledWith('/api/v1/dashboard/reload-world', {});
    } finally {
      environment.production = originalProduction;
    }
  });
});
