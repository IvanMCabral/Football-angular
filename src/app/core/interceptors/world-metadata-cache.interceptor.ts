import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, catchError, filter, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

interface Entry {
  expiresAt: number;
  response: Observable<HttpEvent<unknown>>;
}

/** Two small metadata responses, in memory for at most 30 seconds in one session. */
@Injectable({ providedIn: 'root' })
export class WorldMetadataCache {
  private session?: string;
  private readonly entries = new Map<string, Entry>();

  invalidate(): void { this.entries.clear(); }

  read(key: string, session: string | null, load: () => Observable<HttpEvent<unknown>>): Observable<HttpEvent<unknown>> {
    if (session !== this.session) {
      this.invalidate();
      this.session = session ?? undefined;
    }
    if (!session) return load();
    let entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      const created: Entry = {
        expiresAt: Date.now() + 30_000,
        response: load().pipe(
          filter(event => event instanceof HttpResponse),
          catchError(error => {
            if (this.entries.get(key) === created) this.entries.delete(key);
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        )
      };
      this.entries.set(key, created);
      entry = created;
    }
    // A caller cannot mutate the copy returned to another screen.
    return entry.response.pipe(map(event => event instanceof HttpResponse
      ? event.clone({ body: structuredClone(event.body) }) : event));
  }
}

export const worldMetadataCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const api = environment.apiUrl;
  if (!req.url.startsWith(`${api}/`)) return next(req);
  const cache = inject(WorldMetadataCache);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Invalidate before and after every API command, including failures. A read
    // already in flight is detached and cannot repopulate the new cache.
    cache.invalidate();
    return next(req).pipe(finalize(() => cache.invalidate()));
  }
  if (req.method === 'GET' && [ `${api}/world/teams`, `${api}/world/leagues` ].includes(req.urlWithParams)) {
    return cache.read(req.urlWithParams, req.headers.get('Authorization'), () => next(req));
  }
  return next(req);
};
