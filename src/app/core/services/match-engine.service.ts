import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MatchState,
  MatchCommand,
  EngineStatus,
  RoundState,
  SubstitutionResult,
  StreamHealth,
  FormationChangeResult
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
    players: Array<{ sessionPlayerId: string; position: string; slotIndex: number }>
  ): Observable<FormationChangeResult> {
    return this.http.post<FormationChangeResult>(
      `${this.apiUrl}/matches/${matchId}/formation`,
      { players }
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
   */
  private createSseStream<T>(
    url: string,
    label: string,
    isComplete: (payload: T) => boolean
  ): Observable<T> {
    return new Observable<T>(observer => {
      let es: EventSource | null = null;
      let attempt = 0;
      let backoffTimer: ReturnType<typeof setTimeout> | null = null;
      let lastEventAt = 0;
      let degradedTimer: ReturnType<typeof setTimeout> | null = null;
      let closed = false;

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
          if (es && es.readyState === EventSource.OPEN) {
            console.warn(`[SSE-${label}] [LIVE-MATCH-F3] DEGRADED — no event in ${DEGRADED_GAP_MS}ms`);
            setHealth('DEGRADED');
          }
        }, DEGRADED_GAP_MS);
      };

      const open = () => {
        if (closed) {
          return;
        }
        try {
          es = new EventSource(url);
        } catch (err) {
          console.error(`[SSE-${label}] [LIVE-MATCH-F3] EventSource ctor failed:`, err);
          scheduleReconnect();
          return;
        }

        es.onopen = () => {
          console.log(`[SSE-${label}] ✅ Connection opened (${url})`);
          attempt = 0;
          setHealth('HEALTHY');
          armDegradedTimer();
        };

        es.onmessage = (event) => {
          lastEventAt = Date.now();
          // Any new message means we are no longer DEGRADED (until the next gap).
          if (this.streamHealthByUrl.get(url) === 'DEGRADED') {
            setHealth('HEALTHY');
          }
          armDegradedTimer();
          try {
            const payload = JSON.parse(event.data) as T;
            this.ngZone.run(() => {
              observer.next(payload);
              if (isComplete(payload)) {
                console.log(`[SSE-${label}] 🏁 Complete payload received, closing`);
                closed = true;
                clearDegradedTimer();
                setHealth('CLOSED');
                es?.close();
                observer.complete();
              }
            });
          } catch (error) {
            console.error(`[SSE-${label}] ❌ Error parsing SSE data:`, error);
          }
        };

        es.onerror = (event) => {
          const readyState = es?.readyState;
          console.warn(`[SSE-${label}] [LIVE-MATCH-F3] SSE error, readyState=${readyState}`);
          if (readyState === EventSource.CLOSED) {
            // EventSource has given up (network gone). Schedule a manual reconnect.
            es?.close();
            es = null;
            scheduleReconnect();
          } else {
            // CONNECTING — EventSource is retrying itself; do nothing but log.
            setHealth('RECONNECTING');
          }
        };
      };

      const scheduleReconnect = () => {
        if (closed) {
          return;
        }
        if (attempt >= RECONNECT_MAX_ATTEMPTS) {
          console.error(`[SSE-${label}] [LIVE-MATCH-F3] CLOSED — gave up after ${attempt} attempts`);
          setHealth('CLOSED');
          return;
        }
        const baseDelay = RECONNECT_BACKOFF_MS[attempt];
        const jitter = baseDelay * RECONNECT_JITTER * (Math.random() * 2 - 1);
        const delay = Math.max(250, Math.round(baseDelay + jitter));
        attempt++;
        console.log(`[SSE-${label}] [LIVE-MATCH-F3] RECONNECTING in ${delay}ms (attempt ${attempt}/${RECONNECT_MAX_ATTEMPTS})`);
        setHealth('RECONNECTING');
        backoffTimer = setTimeout(() => {
          backoffTimer = null;
          open();
        }, delay);
      };

      open();

      return () => {
        closed = true;
        clearDegradedTimer();
        if (backoffTimer != null) {
          clearTimeout(backoffTimer);
        }
        if (es) {
          es.close();
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
}
