import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, Subscription } from 'rxjs';
import { PlayerManagementComponent } from './player-management.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../environments/environment';

describe('PlayerManagementComponent shared owner reads', () => {
  let component: PlayerManagementComponent;
  let http: HttpTestingController;
  let subscriptions: Subscription;
  let auth: { getUserInfo: jasmine.Spy };
  const api = environment.apiUrl;

  beforeEach(() => {
    auth = { getUserInfo: jasmine.createSpy().and.returnValue(of({ id: 'owner' })) };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: ToastService, useValue: { success: jasmine.createSpy(), error: jasmine.createSpy() } }
    ] });
    component = TestBed.runInInjectionContext(() => new PlayerManagementComponent());
    http = TestBed.inject(HttpTestingController);
    subscriptions = new Subscription();
  });
  afterEach(() => { subscriptions.unsubscribe(); http.verify(); });

  it('shares teams across template subscribers and reloads once after a change', () => {
    let result: unknown;
    subscriptions.add(component.teams$.subscribe(value => result = value));
    subscriptions.add(component.teams$.subscribe());
    http.expectOne(`${api}/world/teams`).flush([{ worldTeamId: 'club', name: 'Club', country: 'AR' }]);
    expect(result).toEqual([{ sessionTeamId: 'club', name: 'Club', country: 'AR' }]);
    expect(auth.getUserInfo).not.toHaveBeenCalled();
    component.reloadTeams$.next();
    http.expectOne(`${api}/world/teams`).flush([]);
    expect(result).toEqual([]);
  });

  it('loads only free agents, independently of selected club, and shares assigned players', () => {
    subscriptions.add(component.availablePlayers$.subscribe());
    subscriptions.add(component.availablePlayers$.subscribe());
    http.expectOne(`${api}/world/free-players`).flush([]);
    subscriptions.add(component.assignedPlayers$.subscribe());
    subscriptions.add(component.assignedPlayers$.subscribe());
    component.teamId$.next('club');
    http.expectOne(`${api}/world/teams/club/players`).flush([]);
    http.expectNone(`${api}/world/free-players`);
    http.expectNone(`${api}/world/players`);
    expect(auth.getUserInfo).not.toHaveBeenCalled();
    component.reloadAvailablePlayers$.next();
    http.expectOne(`${api}/world/free-players`).flush([]);
  });

  it('keeps command owner identity and refreshes the affected shared lists', () => {
    subscriptions.add(component.availablePlayers$.subscribe());
    http.expectOne(`${api}/world/free-players`).flush([]);
    component.selectedTeamId = 'club';
    component.addPlayerToTeam({ sessionPlayerId: 'player', name: 'Player', position: 'MID', age: 22, overall: 70 });
    const command = http.expectOne(`${api}/world/assign-player`);
    expect(command.request.body).toEqual({ userId: 'owner', playerId: 'player', teamId: 'club' });
    command.flush({});
    http.expectOne(`${api}/world/free-players`).flush([]);
    expect(auth.getUserInfo).toHaveBeenCalledTimes(1);
  });
});
