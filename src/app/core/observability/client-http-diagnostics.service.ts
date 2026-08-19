import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const TEAMS_ROUTE = '/api/v1/world/teams';
export const CLIENT_DIAGNOSTIC_MAX_EVENTS = 24;

export const CLIENT_DIAGNOSTIC_EVENT_NAMES = [
  'CLIENT_REQUEST_START',
  'XHR_LOADSTART',
  'XHR_READY_STATE_2',
  'XHR_READY_STATE_3',
  'XHR_READY_STATE_4',
  'XHR_PROGRESS',
  'XHR_LOAD',
  'XHR_ERROR',
  'XHR_ABORT',
  'XHR_TIMEOUT',
  'XHR_LOADEND',
  'ANGULAR_HTTP_NEXT',
  'ANGULAR_HTTP_ERROR',
  'ANGULAR_HTTP_FINALIZE',
  'TEAM_SERVICE_MAPPED',
  'CHOOSE_TEAM_NEXT',
] as const;

export type ClientDiagnosticEventName = typeof CLIENT_DIAGNOSTIC_EVENT_NAMES[number];

export interface ClientDiagnosticEvent {
  event: ClientDiagnosticEventName;
  normalizedRoute: typeof TEAMS_ROUTE;
  correlationId: string;
  elapsedMs: number;
  readyState?: number;
  status?: number;
  loadedBytes?: number;
  totalBytes?: number;
  lengthComputable?: boolean;
}

export interface ClientDiagnosticRequestSnapshot {
  events: readonly ClientDiagnosticEvent[];
  inFlight: boolean;
}

interface DiagnosticRequest {
  readonly startedAt: number;
  readonly events: ClientDiagnosticEvent[];
  nativeAttached: boolean;
  finalized: boolean;
}

/**
 * In-memory, bounded and sanitized client lifecycle state for the teams route.
 * It intentionally has no console output, persistence, body access, or token access.
 */
@Injectable({ providedIn: 'root' })
export class ClientHttpDiagnosticsService {
  private readonly enabled = environment.enableClientHttpDiagnostics === true;
  private readonly requests = signal<readonly DiagnosticRequest[]>([]);
  private nextRequest: DiagnosticRequest | null = null;

  readonly snapshot = signal<ClientDiagnosticRequestSnapshot>({
    events: [],
    inFlight: false,
  });

  isEnabled(): boolean {
    return this.enabled;
  }

  startRequest(): void {
    if (!this.enabled) {
      return;
    }

    const request: DiagnosticRequest = {
      startedAt: performance.now(),
      events: [],
      nativeAttached: false,
      finalized: false,
    };
    this.nextRequest = request;
    this.requests.update((requests) => [...requests.slice(-1), request]);
    this.record(request, { event: 'CLIENT_REQUEST_START' });
  }

  /** Attaches the Angular-created XHR instance without changing it. */
  attachNativeTransport(): void {
    if (!this.enabled) {
      return;
    }

    const request = this.nextRequest;
    if (request) {
      request.nativeAttached = true;
    }
  }

  recordNative(
    event: Exclude<ClientDiagnosticEventName, 'CLIENT_REQUEST_START' | 'ANGULAR_HTTP_NEXT' | 'ANGULAR_HTTP_ERROR' | 'ANGULAR_HTTP_FINALIZE' | 'TEAM_SERVICE_MAPPED' | 'CHOOSE_TEAM_NEXT'>,
    fields: Omit<Partial<ClientDiagnosticEvent>, 'event' | 'normalizedRoute'> = {}
  ): void {
    this.record(this.nextRequest, { event, ...fields });
  }

  recordAngularNext(status?: number, correlationId?: string): void {
    this.record(this.nextRequest, { event: 'ANGULAR_HTTP_NEXT', status, correlationId });
  }

  recordAngularError(error: unknown): void {
    this.record(this.nextRequest, {
      event: 'ANGULAR_HTTP_ERROR',
      status: error instanceof HttpErrorResponse ? error.status : undefined,
      correlationId: error instanceof HttpErrorResponse
        ? error.headers.get('X-Request-Id') ?? undefined
        : undefined,
    });
  }

  recordTeamServiceMapped(): void {
    this.record(this.nextRequest, { event: 'TEAM_SERVICE_MAPPED' });
  }

  recordChooseTeamNext(): void {
    this.record(this.nextRequest, { event: 'CHOOSE_TEAM_NEXT' });
  }

  finalizeRequest(): void {
    if (!this.enabled || !this.nextRequest) {
      return;
    }

    this.nextRequest.finalized = true;
    this.record(this.nextRequest, { event: 'ANGULAR_HTTP_FINALIZE' });
    this.nextRequest = null;
  }

  resetForTest(): void {
    this.nextRequest = null;
    this.requests.set([]);
    this.snapshot.set({ events: [], inFlight: false });
  }

  private record(
    request: DiagnosticRequest | null,
    event: { event: ClientDiagnosticEventName } & Omit<Partial<ClientDiagnosticEvent>, 'event' | 'normalizedRoute'>
  ): void {
    if (!this.enabled || !request) {
      return;
    }

    if (event.event === 'XHR_PROGRESS' && !this.shouldKeepProgress(request, event.loadedBytes)) {
      return;
    }

    if (request.events.length >= CLIENT_DIAGNOSTIC_MAX_EVENTS) {
      const isTerminal = event.event === 'XHR_LOAD'
        || event.event === 'XHR_ERROR'
        || event.event === 'XHR_ABORT'
        || event.event === 'XHR_TIMEOUT'
        || event.event === 'XHR_LOADEND'
        || event.event === 'ANGULAR_HTTP_NEXT'
        || event.event === 'ANGULAR_HTTP_ERROR'
        || event.event === 'ANGULAR_HTTP_FINALIZE'
        || event.event === 'TEAM_SERVICE_MAPPED'
        || event.event === 'CHOOSE_TEAM_NEXT';
      if (!isTerminal) {
        return;
      }

      const removableIndex = request.events.findIndex((item) =>
        item.event === 'XHR_PROGRESS' || item.event === 'XHR_READY_STATE_3');
      if (removableIndex < 0) {
        return;
      }
      request.events.splice(removableIndex, 1);
    }

    const correlationId = this.readCorrelationId(event.correlationId) ?? 'NOT_OBSERVED';
    const diagnosticEvent: ClientDiagnosticEvent = {
      event: event.event,
      normalizedRoute: TEAMS_ROUTE,
      elapsedMs: Math.max(0, Math.round(performance.now() - request.startedAt)),
      correlationId,
      ...(event.readyState === undefined ? {} : { readyState: event.readyState }),
      ...(event.status === undefined ? {} : { status: event.status }),
      ...(event.loadedBytes === undefined ? {} : { loadedBytes: event.loadedBytes }),
      ...(event.totalBytes === undefined ? {} : { totalBytes: event.totalBytes }),
      ...(event.lengthComputable === undefined ? {} : { lengthComputable: event.lengthComputable }),
    };
    request.events.push(diagnosticEvent);
    this.publish(request);
  }

  private shouldKeepProgress(request: DiagnosticRequest, loadedBytes: number | undefined): boolean {
    const progressEvents = request.events.filter((event) => event.event === 'XHR_PROGRESS');
    if (progressEvents.length === 0 || loadedBytes === undefined) {
      return true;
    }

    const first = progressEvents[0].loadedBytes ?? 0;
    const last = progressEvents[progressEvents.length - 1].loadedBytes ?? first;
    return progressEvents.length < 5 && loadedBytes > last && loadedBytes >= first + 64 * 1024;
  }

  private publish(request: DiagnosticRequest): void {
    this.snapshot.set({
      events: [...request.events],
      inFlight: !request.finalized,
    });
  }

  private readCorrelationId(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim();
    return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(normalized) ? normalized : undefined;
  }
}
