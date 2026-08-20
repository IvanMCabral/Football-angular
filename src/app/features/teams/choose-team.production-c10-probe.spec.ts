import { ApplicationConfig, ApplicationRef, getDebugNode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AppComponent } from '../../app.component';
import { appConfig } from '../../app.config';
import { routes } from '../../app.routes';
import { environment } from '../../environments/environment';
import { ProductionC10ProbeService } from '../../core/observability/production-c10-probe.service';
import { WorldTeamResponse } from '../../shared/models/team.model';
import { ChooseTeamComponent as ProductionChooseTeamComponent } from './choose-team.component.prod';

describe('production choose-team C10 probe', () => {
  let appRef: ApplicationRef;
  let rootHost: HTMLElement;
  let router: Router;
  let http: HttpTestingController;
  let probe: ProductionC10ProbeService;
  let originalUrl: string;

  afterEach(async () => {
    if (appRef) {
      await appRef.destroy();
    }
    rootHost?.remove();
    http?.verify({ ignoreCancelled: true });
    history.replaceState({}, '', originalUrl);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('refreshToken');
  });

  it('is off by default without altering the production routed load', async () => {
    await boot(false);
    const component = await navigateToProductionChooseTeam();

    await flushChooseTeamLoad(realisticWorldTeams());
    await appRef.whenStable();

    expect(component.teams).toHaveSize(70);
    expect(component.loading).toBeFalse();
    expect(teamRows()).toHaveSize(70);
    expect(probe.enabled).toBeFalse();
    expect(probe.snapshot()).toHaveSize(0);
    expect(probeSurface()).toBeNull();
  });

  it('exposes only bounded C10 counts after an opt-in 70-team success', async () => {
    await boot(true);
    const component = await navigateToProductionChooseTeam();

    await flushChooseTeamLoad(realisticWorldTeams());
    await appRef.whenStable();

    expect(component.teams).toHaveSize(70);
    expect(component.loading).toBeFalse();
    expect(teamRows()).toHaveSize(70);
    expect(probe.snapshot().map((event) => event.event)).toEqual([
      'PROD_C10_NEXT_ENTER',
      'PROD_C10_TEAMS_ASSIGNED',
      'PROD_C10_LOADING_FALSE',
      'PROD_C10_AFTER_RENDER',
    ]);
    expect(probe.snapshot().find((event) => event.event === 'PROD_C10_NEXT_ENTER')?.incomingCount).toBe(70);
    expect(probe.snapshot().find((event) => event.event === 'PROD_C10_TEAMS_ASSIGNED')?.assignedCount).toBe(70);
    expect(probe.snapshot().find((event) => event.event === 'PROD_C10_AFTER_RENDER')?.renderedCount).toBe(70);
    expect(probeSurface()).toContain('C10 probe');
    expect(probeSurface()).toContain('next: 70');
    expect(probeSurface()).toContain('assigned: 70');
    expect(probeSurface()).toContain('loadingFalse: yes');
    expect(probeSurface()).toContain('afterRender: yes');
    expect(probeSurface()).toContain('rendered: 70');
  });

  it('records an empty success without changing the empty UI', async () => {
    await boot(true);
    const component = await navigateToProductionChooseTeam();

    await flushChooseTeamLoad([]);
    await appRef.whenStable();

    expect(component.loading).toBeFalse();
    expect(teamRows()).toHaveSize(0);
    expect(chooseTeamElement().textContent).toContain('No hay equipos disponibles.');
    expect(probe.snapshot().find((event) => event.event === 'PROD_C10_NEXT_ENTER')?.incomingCount).toBe(0);
    expect(probe.snapshot().find((event) => event.event === 'PROD_C10_TEAMS_ASSIGNED')?.assignedCount).toBe(0);
    expect(probe.snapshot().find((event) => event.event === 'PROD_C10_AFTER_RENDER')?.renderedCount).toBe(0);
  });

  it('records loading completion on error without a success assignment event', async () => {
    await boot(true);
    const component = await navigateToProductionChooseTeam();
    http.expectOne(`${environment.apiUrl}/auth/me`).flush(currentUser());
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=local-user`);
    await Promise.resolve();
    teamsRequest.flush({ message: 'controlled failure' }, { status: 500, statusText: 'Server Error' });
    await appRef.whenStable();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('No se pudieron cargar los equipos.');
    expect(probe.snapshot().map((event) => event.event)).toEqual(['PROD_C10_LOADING_FALSE']);
    expect(probeSurface()).toContain('loadingFalse: yes');
    expect(probeSurface()).toContain('assigned: not-observed');
  });

  it('records genuine destruction once while the teams request is pending', async () => {
    await boot(true);
    await navigateToProductionChooseTeam();
    http.expectOne(`${environment.apiUrl}/auth/me`).flush(currentUser());
    http.expectOne(`${environment.apiUrl}/world/teams?userId=local-user`);

    await router.navigateByUrl('/login');
    await appRef.whenStable();

    expect(probe.snapshot().filter((event) => event.event === 'PROD_C10_INSTANCE_DESTROYED')).toHaveSize(1);
  });

  it('keeps protected response markers out of the probe state and surface', async () => {
    await boot(true);
    await navigateToProductionChooseTeam();
    http.expectOne(`${environment.apiUrl}/auth/me`).flush({
      id: 'USER_ID_SECRET_MARKER',
      username: 'EMAIL_SECRET_MARKER',
      email: 'EMAIL_SECRET_MARKER',
    });
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=USER_ID_SECRET_MARKER`);
    await Promise.resolve();
    teamsRequest.flush(realisticWorldTeams({
      worldTeamId: 'TEAM_ID_SECRET_MARKER',
      name: 'TEAM_NAME_SECRET_MARKER',
      realLeagueId: 'RESPONSE_BODY_SECRET_MARKER',
    }));
    await appRef.whenStable();

    const probeOutput = `${JSON.stringify(probe.snapshot())}\n${probeSurface()}`;
    for (const marker of [
      'EMAIL_SECRET_MARKER',
      'PASSWORD_SECRET_MARKER',
      'JWT_SECRET_MARKER',
      'USER_ID_SECRET_MARKER',
      'TEAM_ID_SECRET_MARKER',
      'TEAM_NAME_SECRET_MARKER',
      'RESPONSE_BODY_SECRET_MARKER',
    ]) {
      expect(probeOutput).not.toContain(marker);
    }
  });

  async function boot(probeEnabled: boolean): Promise<void> {
    originalUrl = window.location.href;
    history.replaceState({}, '', probeEnabled ? '?c10probe=1' : '?c10probe=0');
    localStorage.setItem('accessToken', 'test-session');
    localStorage.setItem('expiresAt', String(Date.now() + 60_000));
    localStorage.removeItem('refreshToken');
    rootHost = document.createElement('app-root');
    document.body.appendChild(rootHost);
    const realAppConfig: ApplicationConfig = { providers: [...appConfig.providers, provideHttpClientTesting()] };
    appRef = await bootstrapApplication(AppComponent, realAppConfig);
    router = appRef.injector.get(Router);
    router.resetConfig(routes.map((route) => route.path === 'choose-team'
      ? { ...route, loadComponent: () => Promise.resolve(ProductionChooseTeamComponent) }
      : route));
    http = appRef.injector.get(HttpTestingController);
    probe = appRef.injector.get(ProductionC10ProbeService);
  }

  async function navigateToProductionChooseTeam(): Promise<ProductionChooseTeamComponent> {
    await router.navigateByUrl('/choose-team');
    await appRef.whenStable();
    return getDebugNode(chooseTeamElement())!.componentInstance as ProductionChooseTeamComponent;
  }

  async function flushChooseTeamLoad(teams: WorldTeamResponse[]): Promise<void> {
    http.expectOne(`${environment.apiUrl}/auth/me`).flush(currentUser());
    const teamsRequest = http.expectOne(`${environment.apiUrl}/world/teams?userId=local-user`);
    expect(teamsRequest.request.method).toBe('GET');
    expect(teamsRequest.request.urlWithParams).not.toContain('c10probe');
    await Promise.resolve();
    teamsRequest.flush(teams);
  }

  function chooseTeamElement(): HTMLElement {
    return rootHost.querySelector('app-choose-team') as HTMLElement;
  }

  function teamRows(): Element[] {
    return Array.from(chooseTeamElement().querySelectorAll('.choose-team-container > ul > li'));
  }

  function probeSurface(): string | null {
    return rootHost.querySelector('[data-testid="production-c10-probe"]')?.textContent ?? null;
  }
});

function currentUser(): { id: string; username: string; email: string } {
  return { id: 'local-user', username: 'local-manager', email: 'local@example.test' };
}

function realisticWorldTeams(overrides: Partial<WorldTeamResponse> = {}): WorldTeamResponse[] {
  return Array.from({ length: 70 }, (_, index) => ({
    worldTeamId: `world-team-${index + 1}`,
    realTeamId: `real-team-${index + 1}`,
    realLeagueId: 'league-1',
    name: `Catalog Team ${index + 1}`,
    country: 'AR',
    city: `City ${index + 1}`,
    baseBudget: 1000000 + index,
    baseFormation: '4-3-3',
    origin: 'REAL',
    division: 'PRIMERA',
    ...overrides,
  }));
}
