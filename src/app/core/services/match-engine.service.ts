import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
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
 * LIVE-MATCH-F3-UI-LIVE FE1: configurable backoff schedule for SSE reconnection.
 * The schedule doubles the delay up to the cap; a jitter of ±20% is applied to
 * avoid thundering-herd reconnects. The schedule is reset to {@code next = 0}
 * on every successful onopen.
 */
const RECONNECT_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const RECONNECT_MAX_ATTEMPTS = RECONNECT_BACKOFF_MS.length;
const DEGRADED_GAP_MS = 5_000;
const RECONNECT_JITTER = 0.2;

/**
 * Servicio para controlar el motor de simulación de partidos.
 * El motor avanza automáticamente con tiempo virtual (1s real = 1 min virtual).
 *
 * <p>LIVE-MATCH-F3-UI-LIVE FE1: SSE consumers ({@link streamMatchState},
 * {@link streamRoundState}) now expose a per-stream {@code streamHealth$}
 * observable and use exponential backoff with jitter instead of aborting on
 * the first error. The {@code useSse} environment flag still gates between
 * SSE and polling — the polling path is unchanged.
 */
@Injectable({
  providedIn: 'root'
})
export class MatchEngineService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/match-engine`;

  /**
   * Inicia el motor de un partido.
   * El partido avanzará automáticamente cada segundo.
   */
  startEngine(matchId: string, homeTeamId: string, awayTeamId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/start`, {
      homeTeamId,
      awayTeamId
    });
  }

  /**
   * 🚀 NUEVO: Inicia TODOS los partidos de una jornada con UN SOLO request.
   *
   * ANTES (MAL):
   * - 6 requests POST para iniciar 6 motores
   * - 6 MatchEngine individuales
   * - 6 SSE streams
   *
   * AHORA (CORRECTO):
   * - 1 request POST para iniciar 1 RoundEngine con 6 MatchEngine
   * - 1 SSE stream
   */
  startRound(roundId: string, matches: Array<{matchId: string, homeTeamId: string, awayTeamId: string}>): Observable<RoundState> {
    return this.http.post<RoundState>(`${this.apiUrl}/rounds/start`, {
      roundId,
      matches
    });
  }

  /**
   * Pausa el motor. El partido deja de avanzar.
   */
  pauseEngine(matchId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/pause`, {});
  }

  /**
   * Reanuda el motor desde donde quedó.
   */
  resumeEngine(matchId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/resume`, {});
  }

  /**
   * Detiene completamente el motor (cancelar partido).
   */
  stopEngine(matchId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.apiUrl}/${matchId}/stop`, {});
  }

  /**
   * LIVE-MATCH-F1-POC: Send a manual substitution to the backend.
   *
   * <p>Returns the substitution result with substitutions remaining.
   * The backend appends the SUBSTITUTION event to the live session's
   * timeline and mutates player state, but does NOT alter the match result
   * (D1=B). The proper engine refactor that lets user actions affect goals
   * is deferred to Phase 2.
   *
   * @param matchId the match UUID
   * @param playerOffId sessionPlayerId of the player being substituted off
   * @param playerOnId sessionPlayerId of the bench player coming on
   * @param minute optional override; the backend always uses the live session
   *              clock as the authoritative minute, so this is mostly cosmetic
   */
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

  /**
   * LIVE-MATCH-F3-UI-LIVE FE5: Send a formation change to the backend.
   *
   * <p>Endpoint: {@code POST /api/v1/match-engine/matches/{matchId}/formation}.
   * The body is a list of {@code FormationSlotDTO} (10-11 player slots);
   * see {@code FormationChangeRequestDTO} on the backend.
   *
   * @param matchId  the match UUID
   * @param players  full list of formation slots (10-11) for the team
   */
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

  /**
   * LIVE-MATCH-F5.4: Send a tactical style change to the backend.
   *
   * <p>Endpoint: {@code POST /api/v1/match-engine/matches/{matchId}/style}.
   * <p>Body: {@code { newStyle: TeamStyle }}.
   * <p>Response: {@link StyleChangeResult} with {@code success}, {@code currentStyle},
   * {@code minuteApplied}, and an optional {@code error}.
   *
   * <p>Triggers {@code V24LiveSession.mutateContext → withNewStyle(homeTeamId, newStyle)
   * → replayFromMinute(currentMinute)} on the backend. The style change is
   * destructive for the prefix from {@code currentMinute} onward (deterministic
   * replay, same contract as formation change).
   *
   * <p>Only the manager's home team can be changed. The rival (away) is out of
   * scope for F5.4 — the back rejects away changes. The component is
   * responsible for filtering the UI to show only the home team's buttons.
   *
   * @param matchId  the match UUID
   * @param style    one of the 5 {@link TeamStyle} values
   */
  changeStyle(matchId: string, style: TeamStyle): Observable<StyleChangeResult> {
    return this.http.post<StyleChangeResult>(
      `${this.apiUrl}/matches/${matchId}/style`,
      { newStyle: style }
    );
  }

  /**
   * Envía un comando al motor mientras el partido corre.
   * Ej: cambiar táctica, hacer sustitución, etc.
   */
  sendCommand(matchId: string, command: MatchCommand): Observable<string> {
    return this.http.post(`${this.apiUrl}/${matchId}/commands`, command, {
      responseType: 'text'
    });
  }

  /**
   * Obtiene el estado actual del partido (polling).
   * Usar para polling cada 1 segundo.
   */
  getMatchState(matchId: string): Observable<MatchState> {
    return this.http.get<MatchState>(`${this.apiUrl}/${matchId}/state`);
  }

  /**
   * Streaming de estados en tiempo real con Server-Sent Events (SSE).
   * El cliente se suscribe una vez y recibe actualizaciones automáticamente.
   *
   * VENTAJAS sobre polling:
   * - Latencia ~0ms (push inmediato)
   * - 0 requests (conexión persistente)
   * - Multiplayer nativo (N clientes, 1 motor)
   *
   * @param matchId UUID del partido
   * @returns Observable que emite MatchState cada vez que el motor avanza.
   *          Includes a `streamHealth$` accessor (via the returned object) so
   *          the component can render a real-time connection indicator.
   */
  streamMatchState(matchId: string): Observable<MatchState> {
    return this.createSseStream<MatchState>(
      `${this.apiUrl}/${matchId}/stream`,
      'MATCH',
      (state) => state.status === 'FINISHED' || state.status === 'CANCELLED'
    );
  }

  /**
   * Obtiene el estado del sistema (cuántos motores activos hay).
   */
  getEngineStatus(): Observable<EngineStatus> {
    return this.http.get<EngineStatus>(`${this.apiUrl}/status`);
  }

  /**
   * 🚀 NUEVO: Streaming de TODOS los partidos de una jornada con UN SOLO SSE.
   *
   * ARQUITECTURA CORRECTA:
   * - 1 Round → 1 SSE → Array con N estados de partidos
   * - NO más 6 SSE (1 por partido) ❌
   * - Ahora 1 SSE con array de 6 estados ✅
   *
   * VENTAJAS:
   * - NO satura el event loop del navegador
   * - HTTP POST (pause/tactic) se ejecutan inmediatamente
   * - Escalable: funciona igual con 6, 20, o 100 partidos
   *
   * @param roundId UUID de la jornada
   * @returns Observable que emite RoundState (array de MatchState) cada segundo
   */
  streamRoundState(roundId: string): Observable<RoundState> {
    return this.createSseStream<RoundState>(
      `${this.apiUrl}/rounds/${roundId}/stream`,
      'ROUND',
      (round) => round.status === 'FINISHED' || round.status === 'COMPLETED'
    );
  }

  // ========== LIVE-MATCH-F3-UI-LIVE FE1: SSE backoff + health plumbing ==========

  /**
   * FE1: build an SSE stream with exponential-backoff reconnect and a
   * per-stream health subject. The output observable emits the parsed
   * payload, the caller is expected to attach a separate subscriber to
   * {@code streamHealth$} via the returned {@link SseStreamHandle} (returned
   * through the public helpers {@link streamMatchState} / {@link streamRoundState}
   * which wrap this factory and expose the health subject via the result type).
   *
   * <p>FE1 design choice: to keep the public API backward-compatible with
   * existing call sites (which subscribe to the bare Observable<MatchState>),
   * the health subject is exposed via the dedicated {@link streamHealth$}
   * BehaviorSubject field on the service instance. Per-stream health is
   * maintained in a private Map keyed by URL — when a stream opens, the
   * matching entry is set to {@code HEALTHY}; when it disconnects, the entry
   * is set to {@code RECONNECTING} (and the backoff timer is armed); after
   * {@link RECONNECT_MAX_ATTEMPTS} failed attempts the entry becomes
   * {@code CLOSED}.
   *
   * <p>V25D85-SSE-AUTH: switched the transport from {@code EventSource} to
   * {@code fetch + ReadableStream} so the {@code Authorization} header (and
   * any other custom header the auth pipeline wants) can be attached. The
   * {@code EventSource} browser API does NOT support custom request
   * headers, which broke the SSE link end-to-end once the backend hardened
   * the stream endpoint behind JWT. Behavior is otherwise unchanged: same
   * exponential backoff with jitter, same {@code DEGRADED} timer, same
   * health map, same completion predicate.
   */
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
            console.warn(`[SSE-${label}] [V25D85-SSE] DEGRADED — no event in ${DEGRADED_GAP_MS}ms`);
            setHealth('DEGRADED');
          }
        }, DEGRADED_GAP_MS);
      };

      const open = async () => {
        if (closed) {
          return;
        }

        // V25D85-SSE-AUTH: build headers including the Bearer token so the
        // backend can authenticate the stream. Token is read fresh on every
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
          console.log(`[SSE-${label}] [V25D85-SSE] Connection opened (${url})`);
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
                  // Server closed the stream without us completing it —
                  // treat as a transient drop and reconnect.
                  console.warn(`[SSE-${label}] [V25D85-SSE] Stream ended by server, reconnecting`);
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
                // V25D88-FRONT-F1: tolerate both Spring's wire format
                // `data:{json}` (NO trailing space) and the legacy `data: {json}`
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
                      console.log(`[SSE-${label}] 🏁 Complete payload received, closing`);
                      closed = true;
                      connected = false;
                      clearDegradedTimer();
                      setHealth('CLOSED');
                      try { controller?.abort(); } catch { /* already aborted */ }
                      observer.complete();
                    }
                  });
                } catch (error) {
                  console.error(`[SSE-${label}] ❌ Error parsing SSE data:`, error);
                }
              }

              return pump();
            });

          await pump();
        } catch (err: any) {
          // Unsubscribe-driven abort: stay quiet, do not reschedule.
          if (err?.name === 'AbortError' || closed) {
            connected = false;
            return;
          }
          console.warn(`[SSE-${label}] [V25D85-SSE] fetch error:`, err);
          connected = false;
          scheduleReconnect();
        }
      };

      const scheduleReconnect = () => {
        if (closed) {
          return;
        }
        if (attempt >= RECONNECT_MAX_ATTEMPTS) {
          console.error(`[SSE-${label}] [V25D85-SSE] CLOSED — gave up after ${attempt} attempts`);
          setHealth('CLOSED');
          return;
        }
        const baseDelay = RECONNECT_BACKOFF_MS[attempt];
        const jitter = baseDelay * RECONNECT_JITTER * (Math.random() * 2 - 1);
        const delay = Math.max(250, Math.round(baseDelay + jitter));
        attempt++;
        console.log(`[SSE-${label}] [V25D85-SSE] RECONNECTING in ${delay}ms (attempt ${attempt}/${RECONNECT_MAX_ATTEMPTS})`);
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

  /**
   * FE1: shared health subject — the most recent streamHealth across all
   * SSE connections. Components that have only one live stream (the typical
   * case) can subscribe here directly. For multi-stream scenarios (rare),
   * check the per-stream `streamHealthByUrl` map.
   */
  readonly streamHealth$ = new BehaviorSubject<StreamHealth>('CLOSED');

  /**
   * FE1: per-URL health map. Key = the SSE URL, value = last known health.
   * Useful for tests and for the round-live component which might want to
   * show the health of multiple round streams.
   */
  readonly streamHealthByUrl = new Map<string, StreamHealth>();

  // ========== LIVE-MATCH-F5.3.3 BUG-015: pause/resume round via matchId ==========

  /**
   * LIVE-MATCH-F5.3.3 BUG-015: in-memory cache for the
   * {@code matchId -> roundId} lookup so the modal doesn't hit the helper
   * endpoint on every open. TTL of 5 minutes — the round is much shorter
   * than that, but a stale cache would also surface as a 404 on the next
   * pause/resume call which is self-healing.
   */
  private static readonly ROUND_ID_CACHE_TTL_MS = 5 * 60 * 1_000;
  private readonly roundIdCache = new Map<string, { roundId: string; cachedAt: number }>();

  /**
   * Resolves the roundId for a given matchId via
   * {@code GET /api/v1/match-engine/matches/{matchId}/roundId}. The result
   * is cached in-memory for {@link ROUND_ID_CACHE_TTL_MS} to avoid hammering
   * the helper endpoint when the manager opens a sub/formation modal repeatedly.
   *
   * <p>If the cached entry is stale, the cache is refreshed on the next call.
   * On error (e.g. the round was unregistered, 404), the cache entry is
   * evicted so the next attempt goes back to the server.
   */
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

  /**
   * LIVE-MATCH-F5.3.3 BUG-015: pauses ALL matches of the round that the
   * given {@code matchId} belongs to. Resolves roundId via
   * {@link getRoundIdForMatch} (cached) and then POSTs to the round-level
   * pause endpoint.
   *
   * <p>The round-level pause propagates to every {@code MatchEngine} in
   * the round via {@code RoundEngine.pauseAll()} — including the manager's
   * own match and the other 5 matches running concurrently. That prevents
   * the {@code MINUTE_IN_PAST} error Iván hit when the server kept ticking
   * the {@code currentMinute} while he prepared the substitution.
   *
   * <p>The endpoint is idempotent on the backend ({@code RoundEngine.pauseAll}
   * early-returns if already paused), so calling this twice in a row is
   * safe (e.g. user double-clicks "Sustituir").
   */
  pauseRoundForMatch(careerId: string, matchId: string): Observable<unknown> {
    return this.getRoundIdForMatch(matchId).pipe(
      switchMap(roundId =>
        this.http.post(`${environment.apiUrl}/career/${careerId}/round/${roundId}/pause`, {})
      )
    );
  }

  /**
   * LIVE-MATCH-F5.3.3 BUG-015: mirror of {@link pauseRoundForMatch} for
   * the resume side. Called from the modal's {@code afterClosed()} so the
   * round re-runs whether the manager confirmed OR cancelled the
   * substitution/formation. Idempotent on the backend.
   */
  resumeRoundForMatch(careerId: string, matchId: string): Observable<unknown> {
    return this.getRoundIdForMatch(matchId).pipe(
      switchMap(roundId =>
        this.http.post(`${environment.apiUrl}/career/${careerId}/round/${roundId}/resume`, {})
      )
    );
  }
}
