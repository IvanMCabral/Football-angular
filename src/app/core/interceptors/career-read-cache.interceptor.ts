import { Injectable, inject } from '@angular/core';
import { HttpContextToken, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, defer, filter, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export const REFRESH_CAREER_READ = new HttpContextToken<boolean>(() => false);
interface Entry { expiresAt: number; metadata: boolean; response$: Observable<HttpEvent<unknown>>; }

/** Session-only read reuse. Commands and live streams always reach the server. */
@Injectable({ providedIn: 'root' })
export class CareerReadCache {
  revision = 0;
  private session: string | null = null;
  private careerVersion: string | null = null;
  private readonly entries = new Map<string, Entry>();
  private readonly maxEntries = 48;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('manager:logout', () => this.clear());
      window.addEventListener('focus', () => this.invalidate());
      window.addEventListener('storage', event => {
        if (event.key === 'accessToken' || event.key === null) this.clear();
      });
    }
  }

  clear(): void { this.revision++; this.entries.clear(); this.session = null; this.careerVersion = null; }
  invalidate(): void {
    this.revision++;
    for (const [key, entry] of this.entries) if (!entry.metadata) this.entries.delete(key);
  }
  observeCareer(status: { careerId?: string | null; season?: number; currentRound?: number; careerPhase?: string | null }): void {
    const version = JSON.stringify([status.careerId, status.season, status.currentRound, status.careerPhase]);
    if (this.careerVersion !== null && this.careerVersion !== version) this.invalidate();
    this.careerVersion = version;
  }
  primeStatus(body: unknown): void {
    const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');
    const session = token ? `Bearer ${token}` : null;
    this.scope(session);
    if (!session) return;
    this.store(`${environment.apiUrl}/career/status`, {
      metadata: false, expiresAt: Date.now() + 120_000,
      response$: of(new HttpResponse({ body: structuredClone(body) }))
    });
  }
  private scope(session: string | null): void {
    if (this.session !== session) { this.clear(); this.session = session; }
  }
  private store(key: string, entry: Entry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
  }
  read(key: string, session: string | null, metadata: boolean, refresh: boolean,
       load: () => Observable<HttpEvent<unknown>>): Observable<HttpEvent<unknown>> {
    this.scope(session);
    if (!session) return load();
    try {
      const payload = session.replace(/^Bearer /, '').split('.')[1];
      if (payload) {
        const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return load();
      }
    } catch { /* Opaque session identifiers are still isolated by their complete value. */ }
    const now = Date.now();
    for (const [url, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(url);
    let entry = refresh ? undefined : this.entries.get(key);
    if (!entry) {
      const created: Entry = {
        metadata, expiresAt: now + (metadata ? 1_800_000 : 120_000),
        response$: defer(load).pipe(
          filter(event => event instanceof HttpResponse),
          tap({ next: () => {
            if (this.entries.get(key) === created) created.expiresAt = Date.now() + (metadata ? 1_800_000 : 120_000);
          }, error: () => {
            if (this.entries.get(key) === created) this.entries.delete(key);
          }}),
          // Store a private copy; every subscriber receives its own independent body.
          map(event => (event as HttpResponse<unknown>).clone({ body: structuredClone((event as HttpResponse<unknown>).body) })),
          shareReplay({ bufferSize: 1, refCount: false })
        )
      };
      this.store(key, created); entry = created;
    }
    return entry.response$.pipe(map(event => event instanceof HttpResponse
      ? event.clone({ body: structuredClone(event.body) }) : event));
  }
}

export const careerReadCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const root = `${environment.apiUrl}/`;
  if (!req.url.startsWith(root)) return next(req);
  const path = req.url.slice(root.length).split('?')[0];
  const cache = inject(CareerReadCache);
  const preview = /^career\/lineup\/preview-(chemistry|ratings)$/.test(path);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !preview) {
    cache.invalidate();
    let returned = false;
    return next(req).pipe(
      tap({ next: event => {
        if (event instanceof HttpResponse) { returned = true; cache.invalidate(); }
      }, error: () => { returned = true; cache.invalidate(); } }),
      finalize(() => { if (!returned) cache.invalidate(); })
    );
  }
  const metadata = /^lineup-editor\/(formations|subdivisions)$/.test(path);
  const careerRead = /^(dashboard\/entry|career\/(status|players\/squad|lineup\/current|teams(?:\/[^/]+(?:\/squad)?)?|fixtures(?:\/(?:all|complete|league|round-with-bye|round\/\d+))?|standings(?:\/all)?|palmares|promotions))$/.test(path);
  if (req.method !== 'GET' || (!metadata && !careerRead)) return next(req);
  return cache.read(req.urlWithParams, req.headers.get('Authorization'), metadata,
    req.context.get(REFRESH_CAREER_READ), () => next(req));
};
