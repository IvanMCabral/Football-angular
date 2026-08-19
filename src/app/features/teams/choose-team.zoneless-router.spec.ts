import { ApplicationConfig, ApplicationRef, getDebugNode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AppComponent } from '../../app.component';
import { appConfig } from '../../app.config';
import { environment } from '../../environments/environment';
import { ClientHttpDiagnosticsService } from '../../core/observability/client-http-diagnostics.service';
import { WorldTeamResponse } from '../../shared/models/team.model';
import { ChooseTeamComponent } from './choose-team.component';

describe('ChooseTeamComponent zoneless routed regression', () => {
  let appRef: ApplicationRef;
  let rootHost: HTMLElement;
  let router: Router;
  let http: HttpTestingController;
  let diagnostics: ClientHttpDiagnosticsService;

  beforeEach(async () => {
    localStorage.setItem('accessToken', 'test-session');
    localStorage.setItem('expiresAt', String(Date.now() + 60_000));
    localStorage.removeItem('refreshToken');
    rootHost = document.createElement('app-root');
    document.body.appendChild(rootHost);

    const realZonelessConfig: ApplicationConfig = {
      providers: [...appConfig.providers, provideHttpClientTesting()],
    };
    appRef = await bootstrapApplication(AppComponent, realZonelessConfig);
    router = appRef.injector.get(Router);
    http = appRef.injector.get(HttpTestingController);
    diagnostics = appRef.injector.get(ClientHttpDiagnosticsService);
    diagnostics.resetForTest();
  });

  afterEach(async () => {
    await appRef.destroy();
    rootHost.remove();
    http.verify({ ignoreCancelled: true });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('refreshToken');
  });

  it('renders 70 teams after one natural terminal scheduler notification for 20 consecutive routed loads', async () => {
    for (let run = 0; run < 20; run += 1) {
      const component = await navigateToChooseTeam();
      const notify = spyOn(componentChangeDetectorRef(component), 'markForCheck').and.callThrough();

      await flushChooseTeamLoad(realisticWorldTeams());
      await appRef.whenStable();

      expect(component.teams).toHaveSize(70);
      expect(component.loading).toBeFalse();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(teamRows()).toHaveSize(70);
      expect(spinnerText()).toBeNull();
      expect(emptyStateText()).toBeNull();
      expect(diagnostics.snapshot().events.find((event) => event.event === 'CHOOSE_TEAM_AFTER_RENDER')?.renderedCount).toBe(70);

      await router.navigateByUrl('/login');
      await appRef.whenStable();
    }
  });

  it('renders the empty state after one natural terminal scheduler notification', async () => {
    const component = await navigateToChooseTeam();
    const notify = spyOn(componentChangeDetectorRef(component), 'markForCheck').and.callThrough();

    await flushChooseTeamLoad([]);
    await appRef.whenStable();

    expect(component.teams).toHaveSize(0);
    expect(component.loading).toBeFalse();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(teamRows()).toHaveSize(0);
    expect(spinnerText()).toBeNull();
    expect(emptyStateText()).toContain('No hay equipos disponibles.');
  });

  it('renders the controlled error after one natural terminal scheduler notification', async () => {
    const component = await navigateToChooseTeam();
    const notify = spyOn(componentChangeDetectorRef(component), 'markForCheck').and.callThrough();

    const authRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    authRequest.flush(currentUser());
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=local-user`);
    await Promise.resolve();
    teamsRequest.flush({ message: 'controlled failure' }, { status: 500, statusText: 'Server Error' });
    await appRef.whenStable();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
    expect(notify).toHaveBeenCalledTimes(1);
    expect(teamRows()).toHaveSize(0);
    expect(spinnerText()).toBeNull();
    expect(errorText()).toContain('No se pudieron cargar los equipos.');
  });

  it('keeps the routed instance and enables confirmation after a normal template selection', async () => {
    const component = await navigateToChooseTeam();
    await flushChooseTeamLoad(realisticWorldTeams());
    await appRef.whenStable();

    const firstRow = teamRows()[0] as HTMLElement;
    firstRow.click();
    await appRef.whenStable();

    expect(currentChooseTeamComponent()).toBe(component);
    expect(component.selectedTeam?.id).toBe('world-team-1');
    expect(firstRow.classList.contains('selected')).toBeTrue();
    expect((chooseTeamElement().querySelector('button') as HTMLButtonElement).disabled).toBeFalse();
  });

  async function navigateToChooseTeam(): Promise<ChooseTeamComponent> {
    await router.navigateByUrl('/choose-team');
    await appRef.whenStable();
    return currentChooseTeamComponent();
  }

  async function flushChooseTeamLoad(teams: WorldTeamResponse[]): Promise<void> {
    const authRequest = http.expectOne(`${environment.apiUrl}/auth/me`);
    authRequest.flush(currentUser());
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=local-user`);
    expect(teamsRequest.request.method).toBe('GET');
    await Promise.resolve();
    teamsRequest.flush(teams);
  }

  function currentChooseTeamComponent(): ChooseTeamComponent {
    return getDebugNode(chooseTeamElement())!.componentInstance as ChooseTeamComponent;
  }

  function componentChangeDetectorRef(component: ChooseTeamComponent): { markForCheck(): void } {
    return (component as unknown as { changeDetectorRef: { markForCheck(): void } }).changeDetectorRef;
  }

  function chooseTeamElement(): HTMLElement {
    return rootHost.querySelector('app-choose-team') as HTMLElement;
  }

  function teamRows(): Element[] {
    return Array.from(chooseTeamElement().querySelectorAll('.choose-team-container > ul > li'));
  }

  function spinnerText(): string | null {
    return Array.from(chooseTeamElement().querySelectorAll('.choose-team-container > div'))
      .map((element) => element.textContent?.trim() ?? '')
      .find((text) => text === 'Cargando equipos...') ?? null;
  }

  function emptyStateText(): string | null {
    return Array.from(chooseTeamElement().querySelectorAll('.choose-team-container > div'))
      .map((element) => element.textContent?.trim() ?? '')
      .find((text) => text === 'No hay equipos disponibles.') ?? null;
  }

  function errorText(): string | null {
    return chooseTeamElement().querySelector('.error-message')?.textContent?.trim() ?? null;
  }
});

function currentUser(): { id: string; username: string; email: string } {
  return { id: 'local-user', username: 'local-manager', email: 'local@example.test' };
}

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
    division: 'PRIMERA',
  }));
}
