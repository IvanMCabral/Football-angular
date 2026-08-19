import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { ChooseTeamComponent } from './choose-team.component';
import { TeamService } from './services/team.service';
import { AuthService } from '../../core/services/auth.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { Router } from '@angular/router';
import { ClientHttpDiagnosticsService } from '../../core/observability/client-http-diagnostics.service';

describe('ChooseTeamComponent', () => {
  let fixture: ComponentFixture<ChooseTeamComponent>;
  let component: ChooseTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let authService: jasmine.SpyObj<AuthService>;
  let diagnostics: ClientHttpDiagnosticsService;

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
    diagnostics = TestBed.inject(ClientHttpDiagnosticsService);
  });

  afterEach(() => localStorage.removeItem('accessToken'));

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

  it('ends loading when the current-user lookup fails', () => {
    authService.getUserInfo.and.returnValue(throwError(() => ({ status: 503 })));

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
    expect(teamService.getAllTeams).not.toHaveBeenCalled();
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

  it('clears loading when teams finish even if the auth source remains alive', () => {
    const authStream = new Subject<{ id: string; username: string; email: string }>();
    const realisticTeams = Array.from({ length: 70 }, (_, index) => ({
      id: `world-team-${index + 1}`,
      realTeamId: `real-team-${index + 1}`,
      realLeagueId: `league-${index < 20 ? 1 : index < 50 ? 2 : 3}`,
      name: `Catalog Team ${index + 1}`,
      country: index < 20 ? 'ES' : index < 50 ? 'AR' : 'BR',
      budget: 1000000 + index,
      formation: index % 2 === 0 ? '4-3-3' : '4-4-2'
    }));
    authService.getUserInfo.and.returnValue(authStream.asObservable());
    teamService.getAllTeams.and.returnValue(of(realisticTeams));

    component.ngOnInit();
    authStream.next({ id: 'user-1', username: 'manager', email: 'manager@example.test' });

    expect(component.teams).toHaveSize(70);
    expect(component.loading).toBeFalse();
  });

  it('loads 70 teams after delayed auth and delayed teams response', (done) => {
    const authStream = new Subject<{ id: string; username: string; email: string }>();
    const teamsStream = new Subject<any[]>();
    const realisticTeams = Array.from({ length: 70 }, (_, index) => ({
      id: `world-team-${index + 1}`,
      realTeamId: `real-team-${index + 1}`,
      realLeagueId: `league-${index < 20 ? 1 : index < 50 ? 2 : 3}`,
      name: `Catalog Team ${index + 1}`,
      country: index < 20 ? 'ES' : index < 50 ? 'AR' : 'BR',
      budget: 1000000 + index,
      formation: index % 2 === 0 ? '4-3-3' : '4-4-2'
    }));
    authService.getUserInfo.and.returnValue(authStream.asObservable());
    teamService.getAllTeams.and.returnValue(teamsStream.asObservable());

    component.ngOnInit();
    setTimeout(() => authStream.next({ id: 'user-1', username: 'manager', email: 'manager@example.test' }), 1);
    setTimeout(() => teamsStream.next(realisticTeams), 3);
    setTimeout(() => teamsStream.complete(), 4);
    setTimeout(() => {
      expect(component.teams).toHaveSize(70);
      expect(component.loading).toBeFalse();
      done();
    }, 10);
  });

  it('handles quick auth followed by delayed teams', (done) => {
    const teamsStream = new Subject<any[]>();
    authService.getUserInfo.and.returnValue(of({
      id: 'user-1', username: 'manager', email: 'manager@example.test'
    }));
    teamService.getAllTeams.and.returnValue(teamsStream.asObservable());

    component.ngOnInit();
    setTimeout(() => {
      teamsStream.next(realisticUiTeams());
      teamsStream.complete();
    }, 4);

    setTimeout(() => {
      expect(component.teams).toHaveSize(70);
      expect(component.loading).toBeFalse();
      done();
    }, 10);
  });

  it('handles delayed auth followed by quick teams', (done) => {
    const authStream = new Subject<{ id: string; username: string; email: string }>();
    authService.getUserInfo.and.returnValue(authStream.asObservable());
    teamService.getAllTeams.and.returnValue(of(realisticUiTeams()));

    component.ngOnInit();
    setTimeout(() => authStream.next({
      id: 'user-1', username: 'manager', email: 'manager@example.test'
    }), 4);

    setTimeout(() => {
      expect(component.teams).toHaveSize(70);
      expect(component.loading).toBeFalse();
      done();
    }, 10);
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

  it('records bounded component state events after their real writes and passive render observation', () => {
    teamService.getAllTeams.and.returnValue(of(realisticUiTeams()));
    diagnostics.startRequest();

    fixture.detectChanges();
    fixture.detectChanges();

    const events = diagnostics.snapshot().events.filter(event => event.event.startsWith('CHOOSE_TEAM_'));
    expect(events.map(event => event.event)).toEqual([
      'CHOOSE_TEAM_NEXT_ENTER',
      'CHOOSE_TEAM_TEAMS_ASSIGNED',
      'CHOOSE_TEAM_LOADING_FALSE',
      'CHOOSE_TEAM_AFTER_RENDER',
    ]);
    expect(events[0].incomingCount).toBe(70);
    expect(events[1].assignedCount).toBe(70);
    expect(events[2].loading).toBeFalse();
    expect(events[3].renderedCount).toBe(70);
    expect(events.every(event => event.instanceSeq === component.diagnosticInstanceSeq)).toBeTrue();
    expect(new Set(events.map(event => event.requestSeq)).size).toBe(1);

    fixture.destroy();
    expect(diagnostics.snapshot().events.filter(event => event.event === 'CHOOSE_TEAM_INSTANCE_DESTROYED'))
      .toHaveSize(1);
  });

  it('records zero-count success and controlled error without inventing a successful assignment', () => {
    teamService.getAllTeams.and.returnValue(of([]));
    diagnostics.startRequest();

    fixture.detectChanges();
    fixture.detectChanges();

    const emptyEvents = diagnostics.snapshot().events;
    expect(emptyEvents.find(event => event.event === 'CHOOSE_TEAM_NEXT_ENTER')?.incomingCount).toBe(0);
    expect(emptyEvents.find(event => event.event === 'CHOOSE_TEAM_TEAMS_ASSIGNED')?.assignedCount).toBe(0);
    expect(emptyEvents.find(event => event.event === 'CHOOSE_TEAM_AFTER_RENDER')?.renderedCount).toBe(0);

    fixture.destroy();
    fixture = TestBed.createComponent(ChooseTeamComponent);
    component = fixture.componentInstance;
    teamService.getAllTeams.and.returnValue(throwError(() => ({ status: 500 })));
    diagnostics.startRequest();

    fixture.detectChanges();

    const errorEvents = diagnostics.snapshot().events;
    expect(errorEvents.some(event => event.event === 'CHOOSE_TEAM_TEAMS_ASSIGNED')).toBeFalse();
    expect(errorEvents.find(event => event.event === 'CHOOSE_TEAM_LOADING_FALSE')?.loading).toBeFalse();
    expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
  });

  it('uses page-local instance sequences and keeps secret markers out of diagnostics and its panel', () => {
    authService.getUserInfo.and.returnValue(of({
      id: 'USER_ID_SECRET_MARKER',
      username: 'EMAIL_SECRET_MARKER',
      email: 'EMAIL_SECRET_MARKER'
    }));
    teamService.getAllTeams.and.returnValue(of([{
      id: 'TEAM_ID_SECRET_MARKER',
      realTeamId: null,
      realLeagueId: null,
      name: 'TEAM_NAME_SECRET_MARKER',
      country: 'RESPONSE_SECRET_MARKER',
      budget: 0,
      formation: '4-3-3',
      responseMarker: 'RESPONSE_SECRET_MARKER'
    } as any]));
    localStorage.setItem('accessToken', 'JWT_SECRET_MARKER');
    diagnostics.startRequest();
    const firstInstanceSeq = component.diagnosticInstanceSeq;

    fixture.detectChanges();
    fixture.destroy();

    fixture = TestBed.createComponent(ChooseTeamComponent);
    component = fixture.componentInstance;
    diagnostics.startRequest();
    fixture.detectChanges();

    const snapshot = JSON.stringify(diagnostics.snapshot());
    const panelText = (fixture.nativeElement.querySelector('[data-testid="client-http-diagnostics"]') as HTMLElement).textContent;
    for (const marker of [
      'EMAIL_SECRET_MARKER',
      'JWT_SECRET_MARKER',
      'USER_ID_SECRET_MARKER',
      'TEAM_ID_SECRET_MARKER',
      'TEAM_NAME_SECRET_MARKER',
      'RESPONSE_SECRET_MARKER',
    ]) {
      expect(snapshot).not.toContain(marker);
      expect(panelText).not.toContain(marker);
    }
    expect(component.diagnosticInstanceSeq).not.toBe(firstInstanceSeq);
  });
});

function realisticUiTeams(): any[] {
  return Array.from({ length: 70 }, (_, index) => ({
    id: `world-team-${index + 1}`,
    realTeamId: `real-team-${index + 1}`,
    realLeagueId: `league-${index < 20 ? 1 : index < 50 ? 2 : 3}`,
    name: `Catalog Team ${index + 1}`,
    country: index < 20 ? 'ES' : index < 50 ? 'AR' : 'BR',
    budget: 1000000 + index,
    formation: index % 2 === 0 ? '4-3-3' : '4-4-2'
  }));
}
