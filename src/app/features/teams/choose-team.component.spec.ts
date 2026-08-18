import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

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
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getUserInfo', 'assignTeamToUser']);
    authService.getUserInfo.and.returnValue(of({
      id: 'user-1', username: 'manager', email: 'manager@example.test'
    }));
    teamService.getAllTeams.and.returnValue(of([{
      id: 'world-team-1',
      realTeamId: 'real-team-1',
      realLeagueId: 'league-1',
      name: 'Team One',
      country: 'ES',
      budget: 100,
      formation: '4-3-3'
    }]));
    authService.assignTeamToUser.and.returnValue(of('assigned' as any));

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
    expect(component.teams[0].id).toBe('world-team-1');
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('');
  });

  it('ends loading and exposes a controlled error on a 4xx/5xx response', () => {
    teamService.getAllTeams.and.returnValue(throwError(() => ({ status: 500 })));

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
  });

  it('keeps loading true while the teams request is pending', () => {
    const pending = new Subject<any[]>();
    teamService.getAllTeams.and.returnValue(pending.asObservable());

    component.ngOnInit();

    expect(component.loading).toBeTrue();
    pending.next([]);
    pending.complete();
    expect(component.loading).toBeFalse();
  });

  it('distinguishes a successful empty catalog from a load error', () => {
    teamService.getAllTeams.and.returnValue(of([]));

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay equipos disponibles');
  });

  it('does not show the empty message while loading', () => {
    const pending = new Subject<any[]>();
    teamService.getAllTeams.and.returnValue(pending.asObservable());

    component.ngOnInit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('No hay equipos disponibles');
  });

  it('selects a real mapped team and sends its worldTeamId as teamId', () => {
    component.ngOnInit();
    const selected = component.teams[0];

    component.chooseTeam(selected);
    component.assignTeam();

    expect(component.selectedTeam).toBe(selected);
    expect(component.selectedTeam!.id).toBe('world-team-1');
    expect(component.saving).toBeFalse();
    expect(authService.assignTeamToUser).toHaveBeenCalledOnceWith('world-team-1');
  });

  it('clears saving and keeps the selection recoverable when assign fails', () => {
    authService.assignTeamToUser.and.returnValue(throwError(() => ({ status: 400 })));
    component.ngOnInit();
    component.chooseTeam(component.teams[0]);

    component.assignTeam();

    expect(component.saving).toBeFalse();
    expect(component.selectedTeam!.id).toBe('world-team-1');
    expect(component.errorMessage).toBe('No se pudo asignar el equipo.');
  });
});
