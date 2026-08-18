import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ChooseTeamComponent } from './choose-team.component';
import { TeamService } from './services/team.service';
import { AuthService } from '../../core/services/auth.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { Router } from '@angular/router';

describe('ChooseTeamComponent', () => {
  let fixture: ComponentFixture<ChooseTeamComponent>;
  let component: ChooseTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getAllTeams']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getUserInfo']);
    authService.getUserInfo.and.returnValue(of({
      id: 'user-1', username: 'manager', email: 'manager@example.test'
    }));
    teamService.getAllTeams.and.returnValue(of([
      { id: 'team-1', name: 'Team One' }
    ] as any));

    TestBed.configureTestingModule({
      imports: [ChooseTeamComponent],
      providers: [
        { provide: TeamService, useValue: teamService },
        { provide: AuthService, useValue: authService },
        { provide: AppLoggerService, useValue: jasmine.createSpyObj('AppLoggerService', ['error']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    });
    fixture = TestBed.createComponent(ChooseTeamComponent);
    component = fixture.componentInstance;
  });

  it('requests canonical teams and ends loading on success', () => {
    component.ngOnInit();

    expect(teamService.getAllTeams).toHaveBeenCalledOnceWith('user-1');
    expect(component.teams.length).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('');
  });

  it('ends loading and exposes a controlled error on a 4xx/5xx response', () => {
    teamService.getAllTeams.and.returnValue(throwError(() => ({ status: 500 })));

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
  });
});
