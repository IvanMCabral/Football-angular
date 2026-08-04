import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface CatalogLeague {
  realLeagueId: string;
  name: string;
  country: string;
}

export interface CatalogTeam {
  worldTeamId: string;
  name: string;
  country: string;
  formation: string;
  ovr: number;
  playerCount: number;
}

export interface CatalogDivisionPreview {
  divisionNumber: number;
  name: string;
  teams: CatalogTeam[];
}

/**
 * Session-scoped catalog cache. Catalog entries are user-world metadata only;
 * player traits, lineups and career snapshots deliberately stay out of it.
 */
@Injectable({ providedIn: 'root' })
export class WorldCatalogService {
  private leaguesCache?: Observable<CatalogLeague[]>;
  private readonly teamsCache = new Map<string, Observable<CatalogTeam[]>>();
  private readonly previewsCache = new Map<string, Observable<CatalogDivisionPreview[]>>();

  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {}

  leagues(): Observable<CatalogLeague[]> {
    if (!this.leaguesCache) {
      this.leaguesCache = this.authService.getUserInfo().pipe(
        switchMap(user => this.http.get<CatalogLeague[]>(
          `${environment.apiUrl}/world/leagues?userId=${user.id}`)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.leaguesCache;
  }

  teamsForLeague(leagueId: string, timeoutMs?: number): Observable<CatalogTeam[]> {
    const key = leagueId;
    let request = this.teamsCache.get(key);
    if (!request) {
      request = this.authService.getUserInfo().pipe(
        switchMap(user => timeoutMs === undefined
          ? this.http.get<CatalogTeam[]>(`${environment.apiUrl}/world/leagues/${leagueId}/teams-with-ovr?userId=${user.id}`)
          : this.http.get<CatalogTeam[]>(`${environment.apiUrl}/world/leagues/${leagueId}/teams-with-ovr?userId=${user.id}`, { timeout: timeoutMs })),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.teamsCache.set(key, request);
    }
    return request;
  }

  divisionPreview(leagueId: string, teamsPerDivision: number): Observable<CatalogDivisionPreview[]> {
    const key = `${leagueId}:${teamsPerDivision}`;
    let request = this.previewsCache.get(key);
    if (!request) {
      request = this.authService.getUserInfo().pipe(
        switchMap(user => this.http.get<CatalogDivisionPreview[]>(
          `${environment.apiUrl}/world/leagues/${leagueId}/division-preview?teamsPerDivision=${teamsPerDivision}&userId=${user.id}`)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.previewsCache.set(key, request);
    }
    return request;
  }

  /** Non-blocking warm-up used by the dashboard shell. */
  prefetch(): void {
    this.leagues().subscribe({ error: () => undefined });
  }

  invalidate(): void {
    this.leaguesCache = undefined;
    this.teamsCache.clear();
    this.previewsCache.clear();
  }
}
