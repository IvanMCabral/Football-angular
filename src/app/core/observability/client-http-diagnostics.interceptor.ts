import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { ClientHttpDiagnosticsService, TEAMS_ROUTE } from './client-http-diagnostics.service';

export const clientHttpDiagnosticsInterceptor: HttpInterceptorFn = (req, next) => {
  const diagnostics = inject(ClientHttpDiagnosticsService);
  if (!diagnostics.isEnabled() || normalizeRoute(req.urlWithParams) !== TEAMS_ROUTE) {
    return next(req);
  }

  diagnostics.startRequest();
  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        diagnostics.recordAngularNext(event.status, event.headers.get('X-Request-Id') ?? undefined);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      diagnostics.recordAngularError(error);
      return throwError(() => error);
    }),
    finalize(() => diagnostics.finalizeRequest())
  );
};

function normalizeRoute(url: string): string | null {
  try {
    const base = typeof location === 'undefined' ? 'http://localhost' : location.origin;
    return new URL(url, base).pathname === TEAMS_ROUTE ? TEAMS_ROUTE : null;
  } catch {
    return null;
  }
}
