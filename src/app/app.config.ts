import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { XhrFactory } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { clientHttpDiagnosticsInterceptor } from './core/observability/client-http-diagnostics.interceptor';
import { TeamsDiagnosticXhrFactory } from './core/observability/teams-diagnostic-xhr.factory';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor, clientHttpDiagnosticsInterceptor])
    ),
    { provide: XhrFactory, useClass: TeamsDiagnosticXhrFactory },
    provideAnimations()
  ]
};
