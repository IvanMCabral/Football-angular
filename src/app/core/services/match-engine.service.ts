import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MatchState,
  MatchCommand,
  EngineStatus,
  RoundState
} from './match-engine.model';

/**
 * Servicio para controlar el motor de simulación de partidos.
 * El motor avanza automáticamente con tiempo virtual (1s real = 1 min virtual).
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
   * @returns Observable que emite MatchState cada vez que el motor avanza
   */
  streamMatchState(matchId: string): Observable<MatchState> {
    return new Observable<MatchState>(observer => {
      const eventSource = new EventSource(`${this.apiUrl}/${matchId}/stream`);
      
      eventSource.onmessage = (event) => {
        try {
          const state: MatchState = JSON.parse(event.data);
          observer.next(state);
          
          // Si el partido terminó, cerrar conexión
          if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
            eventSource.close();
            observer.complete();
          }
        } catch (error) {
          console.error('[MATCH ENGINE SERVICE] Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('[MATCH ENGINE SERVICE] SSE error:', error);
        observer.error(error);
        eventSource.close();
      };
      
      // Cleanup cuando el Observable se desuscribe
      return () => {
        console.log('[MATCH ENGINE SERVICE] Cerrando SSE stream para partido', matchId);
        eventSource.close();
      };
    });
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
    return new Observable<RoundState>(observer => {
      const url = `${this.apiUrl}/rounds/${roundId}/stream`;
      
      const eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        console.log('[SSE] ✅ Connection opened for round:', roundId);
      };
       
      eventSource.onmessage = (event) => {
        try {
          const roundState: RoundState = JSON.parse(event.data);
          console.log('[SSE] 📩 Received - status:', roundState.status, 'matches:', roundState.matches?.length);
          
          // Run inside Angular zone to trigger change detection
          this.ngZone.run(() => {
            observer.next(roundState);
             
            // Si todos los partidos terminaron, cerrar conexión
            if (roundState.status === 'FINISHED') {
              console.log('[SSE] 🏁 Round finished, closing SSE');
              eventSource.close();
              observer.complete();
            }
          });
        } catch (error) {
          console.error('[SSE] ❌ Error parsing:', error);
        }
      };
       
      eventSource.onerror = (error) => {
        console.error('[SSE] ❌ Connection error, readyState:', eventSource.readyState);
      };
       
      // Cleanup
      return () => {
        console.log('[SSE] 🔌 Cleanup: closing SSE');
        eventSource.close();
      };
    });
  }
}
