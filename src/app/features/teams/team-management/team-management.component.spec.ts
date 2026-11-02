import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subscription } from 'rxjs';
import { TeamManagementComponent } from './team-management.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../environments/environment';

describe('TeamManagementComponent shared owner reads', () => {
  let component: TeamManagementComponent;
  let http: HttpTestingController;
  let subscriptions: Subscription;
  let auth: { getUserInfo: jasmine.Spy };
  const api = environment.apiUrl;
  beforeEach(() => {
    auth = { getUserInfo: jasmine.createSpy() };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: ToastService, useValue: { error: jasmine.createSpy() } }
    ] });
    component = TestBed.runInInjectionContext(() => new TeamManagementComponent());
    http = TestBed.inject(HttpTestingController);
    subscriptions = new Subscription();
  });
  afterEach(() => { subscriptions.unsubscribe(); http.verify(); });

  it('shares league metadata and the team catalog across filters without a profile waterfall', () => {
    let leagueName: string | undefined;
    let teams: unknown;
    subscriptions.add(component.leagues$.subscribe());
    subscriptions.add(component.selectedLeagueName$.subscribe(value => leagueName = value));
    http.expectOne(`${api}/world/leagues`).flush([{ realLeagueId: 'league', name: 'League', country: 'AR' }]);
    subscriptions.add(component.teamsInLeague$.subscribe(value => teams = value));
    subscriptions.add(component.availableTeams$.subscribe());
    http.expectOne(`${api}/world/teams`).flush([{ worldTeamId: 'club', name: 'Club', country: 'AR', realLeagueId: 'league' }]);
    component.selectedLeagueId$.next('league');
    expect(leagueName).toBe('League');
    expect(teams).toEqual([{ id: 'club', name: 'Club', country: 'AR', city: 'N/A', leagueId: 'league' }]);
    component.reloadTeams$.next();
    http.expectOne(`${api}/world/teams`).flush([]);
    expect(teams).toEqual([]);
    expect(auth.getUserInfo).not.toHaveBeenCalled();
  });
});
