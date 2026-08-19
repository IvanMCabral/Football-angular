import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChooseTeamComponent } from './choose-team.component';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from './services/team.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { environment } from '../../environments/environment';
import { WorldTeamResponse } from '../../shared/models/team.model';

describe('ChooseTeamComponent HTTP lifecycle', () => {
  let fixture: ComponentFixture<ChooseTeamComponent>;
  let component: ChooseTeamComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');

    TestBed.configureTestingModule({
      imports: [ChooseTeamComponent],
      providers: [
        AuthService,
        TeamService,
        AppLoggerService,
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    fixture = TestBed.createComponent(ChooseTeamComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
    http.verify({ ignoreCancelled: true });
  });

  it('completes the real auth -> teams HTTP chain with a delayed 70-team response', (done) => {
    fixture.detectChanges();

    const authRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    expect(authRequest.request.method).toBe('GET');

    setTimeout(() => {
      authRequest.flush({
        id: 'user-1',
        username: 'manager',
        email: 'manager@example.test'
      });

      const teamsRequest = http.expectOne(
        `${environment.apiUrl}/world/teams?userId=user-1`);
      expect(teamsRequest.request.method).toBe('GET');

      setTimeout(() => {
        teamsRequest.flush(realisticWorldTeams());
      }, 3);
    }, 2);

    setTimeout(() => {
      expect(component.teams).toHaveSize(70);
      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toBe('');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('li')).toHaveSize(70);
      done();
    }, 15);
  });

  [400, 401, 403, 500].forEach(status => {
    it(`ends loading on HTTP ${status} through the real interceptor chain`, (done) => {
      fixture.detectChanges();
      const authRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
      authRequest.flush({ id: 'user-1', username: 'manager', email: 'manager@example.test' });
      const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=user-1`);

      setTimeout(() => {
        teamsRequest.flush({ message: `failure-${status}` }, {
          status,
          statusText: `HTTP ${status}`
        });
      }, 1);

      setTimeout(() => {
        expect(component.loading).toBeFalse();
        expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
        done();
      }, 8);
    });
  });

  it('ends loading on a network error through the real interceptor chain', (done) => {
    fixture.detectChanges();
    const authRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    authRequest.flush({ id: 'user-1', username: 'manager', email: 'manager@example.test' });
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=user-1`);

    setTimeout(() => {
      teamsRequest.error(new ProgressEvent('error'));
    }, 1);

    setTimeout(() => {
      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
      done();
    }, 8);
  });

  it('cancels the active HTTP request when the component is destroyed', () => {
    fixture.detectChanges();
    const authRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    authRequest.flush({ id: 'user-1', username: 'manager', email: 'manager@example.test' });
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=user-1`);

    fixture.destroy();

    expect(teamsRequest.cancelled).toBeTrue();
  });

  it('recreated component completes its own request without inheriting stale loading state', (done) => {
    fixture.detectChanges();
    const firstAuthRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    firstAuthRequest.flush({ id: 'user-1', username: 'manager', email: 'manager@example.test' });
    const firstTeamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=user-1`);
    fixture.destroy();

    fixture = TestBed.createComponent(ChooseTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const secondAuthRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    secondAuthRequest.flush({ id: 'user-1', username: 'manager', email: 'manager@example.test' });
    const secondTeamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=user-1`);
    secondTeamsRequest.flush(realisticWorldTeams());

    setTimeout(() => {
      expect(firstTeamsRequest.cancelled).toBeTrue();
      expect(component.teams).toHaveSize(70);
      expect(component.loading).toBeFalse();
      done();
    }, 5);
  });
});

function realisticWorldTeams(): WorldTeamResponse[] {
  return Array.from({ length: 70 }, (_, index) => ({
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
}
