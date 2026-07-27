import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { AppLoggerService } from './app-logger.service';
import {
  MatchState,
  MatchCommand,
  EngineStatus,
  RoundState,
  SubstitutionResult,
  StreamHealth,
  FormationChangeResult,
  StyleChangeResult,
  TeamStyle
} from './match-engine.model';

/**
 * Configurable backoff schedule for live stream reconnection.
 * The delay grows up to the cap and applies jitter to avoid synchronized reconnects.
 */
const RECONNECT_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const RECONNECT_MAX_ATTEMPTS = RECONNECT_BACKOFF_MS.length;
const DEGRADED_GAP_MS = 5_000;
const RECONNECT_JITTER = 0.2;

/**
 * Service used by the UI to control and observe the match simulation engine.
 *
 * Live streams expose per-stream health and reconnect with exponential backoff.
 * When SSE is disabled by environment config, callers keep using polling.
 */
@Injectable({
  providedIn: 'root'
})
export class MatchEngineService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private authService = inject(AuthService);
  private logger = inject(AppLoggerService);
  private apiUrl = `${environment.apiUrl}/match-engine`;

  // Starts the engine for one match.
  startEngine(matchId: string, homeTeamId: string, awayTeamId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/start`, {
      homeTeamId,
      awayTeamId
    });
  }

  /**
   * Starts every match in a round with one backend request.
   * The round engine owns all match engines and exposes a single live stream.
   */
  startRound(roundId: string, matches: Array<{matchId: string, homeTeamId: string, awayTeamId: string}>): Observable<RoundState> {
    return this.http.post<RoundState>(`${this.apiUrl}/rounds/start`, {
      roundId,
      matches
    });
  }

  // Pauses one match engine.
  pauseEngine(matchId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/pause`, {});
  }

  // Resumes one paused match engine.
  resumeEngine(matchId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/resume`, {});
  }

  // Stops one match engine.
  stopEngine(matchId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/stop`, {});
  }

  // Sends a manual substitution. The backend owns the authoritative live minute.
  substitutePlayer(
    matchId: string,
    playerOffId: string,
    playerOnId: string,
    minute?: number
  ): Observable<SubstitutionResult> {
    return this.http.post<SubstitutionResult>(
      `${this.apiUrl}/matches/${matchId}/substitutions`,
      { playerOffId, playerOnId, minute: minute ?? null }
    );
  }

  // Sends the current tactical shape to the backend.
  changeFormation(
    matchId: string,
    players: Array<{
      sessionPlayerId: string;
      position: string;
      slotIndex: number;
      customXPercent?: number | null;
      customYPercent?: number | null;
    }>,
    formationCode?: string
  ): Observable<FormationChangeResult> {
    const payloadPlayers = players.map(player => ({
      playerId: player.sessionPlayerId,
      position: this.normalizeFormationPosition(player.position),
      slotIndex: player.slotIndex,
      customXPercent: player.customXPercent ?? null,
      customYPercent: player.customYPercent ?? null
    }));

    return this.http.post<FormationChangeResult>(
      `${this.apiUrl}/matches/${matchId}/formation`,
      { players: payloadPlayers, formationCode: formationCode ?? null }
    );
  }

  private normalizeFormationPosition(position: string): string {
    const normalized = (position || '').toUpperCase();
    if (normalized === 'GK') { return 'GK'; }
    if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(normalized)) { return 'DEF'; }
    if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'].includes(normalized)) { return 'MID'; }
    if (['WINGER', 'LW', 'RW'].includes(normalized)) { return 'WINGER'; }
    if (['ATT', 'ST', 'CF'].includes(normalized)) { return 'ATT'; }
    return normalized;
  }

  // Sends a tactical style change. The backend replays the remaining match deterministically.
  changeStyle(matchId: string, style: TeamStyle): Observable<StyleChangeResult> {
    return this.http.post<StyleChangeResult>(
      `${this.apiUrl}/matches/${matchId}/style`,
      { newStyle: style }
    );
  }

  // Sends a generic live command while the match is running.
  sendCommand(matchId: string, command: MatchCommand): Observable<string> {
    return this.http.post(`${this.apiUrl}/${matchId}/commands`, command, {
      responseType: 'text'
    });
  }

  // Reads the current match state for polling fallback.
  getMatchState(matchId: string): Observable<MatchState> {
    return this.http.get<MatchState>(`${this.apiUrl}/${matchId}/state`);
  }

  // Streams one match through SSE. Polling remains available as fallback.
  streamMatchState(matchId: string): Observable<MatchState> {
    return this.createSseStream<MatchState>(
      `${this.apiUrl}/${matchId}/stream`,
      'MATCH',
      (state) => state.status === 'FINISHED' || state.status === 'CANCELLED'
    );
  }

  // Reads match engine service status.
  getEngineStatus(): Observable<EngineStatus> {
    return this.http.get<EngineStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Streams every match in a round through a single SSE connection.
   *
   * @param roundId round UUID
   * @returns Observable that emits the round state as the engine advances.
   */
  streamRoundState(roundId: string): Observable<RoundState> {
    return this.createSseStream<RoundState>(
      `${this.apiUrl}/rounds/${roundId}/stream`,
      'ROUND',
      (round) => round.status === 'FINISHED' || round.status === 'COMPLETED'
    );
  }

  // SSE backoff and stream health plumbing.
  // Uses fetch instead of EventSource because authenticated streams need headers.
  private createSseStream<T>(
    url: string,
    label: string,
    isComplete: (payload: T) => boolean
  ): Observable<T> {
    return new Observable<T>(observer => {
      let attempt = 0;
      let backoffTimer: ReturnType<typeof setTimeout> | null = null;
      let lastEventAt = 0;
      let degradedTimer: ReturnType<typeof setTimeout> | null = null;
      let closed = false;
      let controller: AbortController | null = null;
      let connected = false;

      const setHealth = (h: StreamHealth) => {
        this.streamHealthByUrl.set(url, h);
        this.streamHealth$.next(h);
      };

      const clearDegradedTimer = () => {
        if (degradedTimer != null) {
          clearTimeout(degradedTimer);
          degradedTimer = null;
        }
      };

      const armDegradedTimer = () => {
        clearDegradedTimer();
        degradedTimer = setTimeout(() => {
          // Only flag DEGRADED if the connection is supposed to be open.
          if (connected && !closed) {
            this.logger.warn(`[SSE-${label}] DEGRADED - no event in ${DEGRADED_GAP_MS}ms`);
            setHealth('DEGRADED');
          }
        }, DEGRADED_GAP_MS);
      };

      const open = async () => {
        if (closed) {
          return;
        }

        // Attach the bearer token when available; anonymous streams still work without it.
        // (re)connect so token refresh / logout are picked up.
        const token = this.authService.getToken();
        const headers: Record<string, string> = {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        controller = new AbortController();

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal
          });

          if (!response.ok || !response.body) {
            throw new Error(`SSE HTTP ${response.status}`);
          }

          // Connection opened successfully.
          connected = true;
          attempt = 0;
          setHealth('HEALTHY');
          armDegradedTimer();

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // Drain SSE chunks: events are separated by a blank line ("\n\n");
          // each line inside an event begins with a field name (we only care
          // about "data:"). Partial trailing fragments stay in the buffer.
          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) {
                if (!closed) {
                  // Server closed the stream without us completing it.
                  // treat as a transient drop and reconnect.
                  this.logger.warn(`[SSE-${label}] Stream ended by server, reconnecting`);
                  connected = false;
                  scheduleReconnect();
                }
                return;
              }

              lastEventAt = Date.now();
              if (this.streamHealthByUrl.get(url) === 'DEGRADED') {
                setHealth('HEALTHY');
              }
              armDegradedTimer();

              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split('\n\n');
              buffer = events.pop() ?? '';

              for (const event of events) {
                // Tolerate both Spring wire formats: 'data:{json}' and 'data: {json}'.
                // (WITH space). Spring's default ServerSentEventHttpMessageWriter
                // emits without the space, so a strict `'data: '` prefix missed
                // every event. The regex now anchors on `'data:'` only and the
                // payload substring is trimmed defensively.
                const dataLine = event.split('\n').find(line => line.startsWith('data:'));
                if (!dataLine) continue;
                try {
                  const payload = JSON.parse(dataLine.substring('data:'.length).trim()) as T;
                  this.ngZone.run(() => {
                    observer.next(payload);
                    if (isComplete(payload)) {
                      closed = true;
                      connected = false;
                      clearDegradedTimer();
                      setHealth('CLOSED');
                      try { controller?.abort(); } catch { /* already aborted */ }
                      observer.complete();
                    }
                  });
                } catch (error) {
                  this.logger.error(`[SSE-${label}] Error parsing SSE data:`, error);
                }
              }

              return pump();
            });

          await pump();
        } catch (err: unknown) {
          // Unsubscribe-driven abort: stay quiet, do not reschedule.
          const isAbortError = err instanceof DOMException && err.name === 'AbortError';
          if (isAbortError || closed) {
            connected = false;
            return;
          }
          this.logger.warn(`[SSE-${label}] fetch error:`, err);
          connected = false;
          scheduleReconnect();
        }
      };

      const scheduleReconnect = () => {
        if (closed) {
          return;
        }
        if (attempt >= RECONNECT_MAX_ATTEMPTS) {
          this.logger.error(`[SSE-${label}] CLOSED - gave up after ${attempt} attempts`);
          setHealth('CLOSED');
          return;
        }
        const baseDelay = RECONNECT_BACKOFF_MS[attempt];
        const jitter = baseDelay * RECONNECT_JITTER * (Math.random() * 2 - 1);
        const delay = Math.max(250, Math.round(baseDelay + jitter));
        attempt++;
        setHealth('RECONNECTING');
        backoffTimer = setTimeout(() => {
          backoffTimer = null;
          open();
        }, delay);
      };

      // Kick off the connection outside of Angular zone: the SSE pump already
      // re-enters the zone per message via ngZone.run, so we don't need the
      // fetch promise itself to be in-zone.
      this.ngZone.runOutsideAngular(() => {
        open();
      });

      return () => {
        closed = true;
        connected = false;
        clearDegradedTimer();
        if (backoffTimer != null) {
          clearTimeout(backoffTimer);
        }
        if (controller != null) {
          try { controller.abort(); } catch { /* already aborted */ }
        }
        // Reset health to CLOSED only if WE owned it; if another stream
        // superseded us, keep the latest health.
        if (this.streamHealthByUrl.get(url) !== undefined) {
          this.streamHealthByUrl.delete(url);
        }
        if (this.streamHealthByUrl.size === 0) {
          this.streamHealth$.next('CLOSED');
        }
      };
    });
  }

  // Most recent stream health across active SSE connections.
  readonly streamHealth$ = new BehaviorSubject<StreamHealth>('CLOSED');

  // Last known health per SSE URL.
  readonly streamHealthByUrl = new Map<string, StreamHealth>();

  // Pause/resume round helpers scoped by match id

  // Short-lived cache for resolving a match to its round.
  private static readonly ROUND_ID_CACHE_TTL_MS = 5 * 60 * 1_000;
  private readonly roundIdCache = new Map<string, { roundId: string; cachedAt: number }>();

  // Resolves the round that owns a match, with a small in-memory cache.
  getRoundIdForMatch(matchId: string): Observable<string> {
    const cached = this.roundIdCache.get(matchId);
    if (cached && Date.now() - cached.cachedAt < MatchEngineService.ROUND_ID_CACHE_TTL_MS) {
      // Return cached as observable (cold -> emit -> complete).
      return new Observable<string>(sub => {
        sub.next(cached.roundId);
        sub.complete();
      });
    }
    return this.http.get<{ matchId: string; roundId: string }>(
      `${this.apiUrl}/matches/${matchId}/roundId`
    ).pipe(
      map(resp => {
        this.roundIdCache.set(matchId, { roundId: resp.roundId, cachedAt: Date.now() });
        return resp.roundId;
      })
    );
  }

  // Pauses the whole round before the manager opens a live decision modal.
  pauseRoundForMatch(careerId: string, matchId: string): Observable<unknown> {
    return this.getRoundIdForMatch(matchId).pipe(
      switchMap(roundId =>
        this.http.post(`${environment.apiUrl}/career/${careerId}/round/${roundId}/pause`, {})
      )
    );
  }

  // Resumes the round after the live decision modal closes.
  resumeRoundForMatch(careerId: string, matchId: string): Observable<unknown> {
    return this.getRoundIdForMatch(matchId).pipe(
      switchMap(roundId =>
        this.http.post(`${environment.apiUrl}/career/${careerId}/round/${roundId}/resume`, {})
      )
    );
  }
}

