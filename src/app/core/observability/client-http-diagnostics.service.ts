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
  'CHOOSE_TEAM_NEXT_ENTER',
  'CHOOSE_TEAM_TEAMS_ASSIGNED',
  'CHOOSE_TEAM_LOADING_FALSE',
  'CHOOSE_TEAM_INSTANCE_DESTROYED',
  'CHOOSE_TEAM_AFTER_RENDER',
] as const;

export type ClientDiagnosticEventName = typeof CLIENT_DIAGNOSTIC_EVENT_NAMES[number];

export interface ClientDiagnosticEvent {
  event: ClientDiagnosticEventName;
  normalizedRoute: typeof TEAMS_ROUTE;
  requestSeq: number;
  correlationId: string;
  elapsedMs: number;
  instanceSeq?: number;
  incomingCount?: number;
  assignedCount?: number;
  renderedCount?: number;
  loading?: false;
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
  readonly requestSeq: number;
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
  private lastRequest: DiagnosticRequest | null = null;
  private nextRequestSeq = 1;

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
      requestSeq: this.nextRequestSeq++,
      startedAt: performance.now(),
      events: [],
      nativeAttached: false,
      finalized: false,
    };
    this.nextRequest = request;
    this.lastRequest = request;
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

  recordChooseTeamNextEnter(instanceSeq: number, incomingCount: number): number | undefined {
    return this.recordComponentState('CHOOSE_TEAM_NEXT_ENTER', instanceSeq, undefined, { incomingCount });
  }

  recordChooseTeamTeamsAssigned(instanceSeq: number, requestSeq: number | undefined, assignedCount: number): void {
    this.recordComponentState('CHOOSE_TEAM_TEAMS_ASSIGNED', instanceSeq, requestSeq, { assignedCount });
  }

  recordChooseTeamLoadingFalse(instanceSeq: number, requestSeq: number | undefined): void {
    this.recordComponentState('CHOOSE_TEAM_LOADING_FALSE', instanceSeq, requestSeq, { loading: false });
  }

  recordChooseTeamInstanceDestroyed(instanceSeq: number, requestSeq: number | undefined): void {
    this.recordComponentState('CHOOSE_TEAM_INSTANCE_DESTROYED', instanceSeq, requestSeq);
  }

  recordChooseTeamAfterRender(instanceSeq: number, requestSeq: number | undefined, renderedCount: number): void {
    this.recordComponentState('CHOOSE_TEAM_AFTER_RENDER', instanceSeq, requestSeq, { renderedCount });
  }

  currentRequestSeq(): number | undefined {
    return this.nextRequest?.requestSeq ?? this.lastRequest?.requestSeq;
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
    this.lastRequest = null;
    this.nextRequestSeq = 1;
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
        || event.event === 'CHOOSE_TEAM_NEXT'
        || event.event === 'CHOOSE_TEAM_NEXT_ENTER'
        || event.event === 'CHOOSE_TEAM_TEAMS_ASSIGNED'
        || event.event === 'CHOOSE_TEAM_LOADING_FALSE'
        || event.event === 'CHOOSE_TEAM_INSTANCE_DESTROYED'
        || event.event === 'CHOOSE_TEAM_AFTER_RENDER';
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
      requestSeq: request.requestSeq,
      elapsedMs: Math.max(0, Math.round(performance.now() - request.startedAt)),
      correlationId,
      ...(event.instanceSeq === undefined ? {} : { instanceSeq: event.instanceSeq }),
      ...(event.incomingCount === undefined ? {} : { incomingCount: event.incomingCount }),
      ...(event.assignedCount === undefined ? {} : { assignedCount: event.assignedCount }),
      ...(event.renderedCount === undefined ? {} : { renderedCount: event.renderedCount }),
      ...(event.loading === undefined ? {} : { loading: event.loading }),
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

  private recordComponentState(
    event: Extract<ClientDiagnosticEventName,
      'CHOOSE_TEAM_NEXT_ENTER'
      | 'CHOOSE_TEAM_TEAMS_ASSIGNED'
      | 'CHOOSE_TEAM_LOADING_FALSE'
      | 'CHOOSE_TEAM_INSTANCE_DESTROYED'
      | 'CHOOSE_TEAM_AFTER_RENDER'>,
    instanceSeq: number,
    requestSeq: number | undefined,
    fields: Omit<Partial<ClientDiagnosticEvent>,
      'event' | 'normalizedRoute' | 'requestSeq' | 'correlationId' | 'elapsedMs' | 'instanceSeq'> = {}
  ): number | undefined {
    const request = this.findRequest(requestSeq);
    if (!request) {
      return undefined;
    }

    this.record(request, { event, instanceSeq, ...fields });
    return request.requestSeq;
  }

  private findRequest(requestSeq: number | undefined): DiagnosticRequest | null {
    if (requestSeq === undefined) {
      return this.nextRequest ?? this.lastRequest;
    }
    if (this.nextRequest?.requestSeq === requestSeq) {
      return this.nextRequest;
    }
    return this.lastRequest?.requestSeq === requestSeq ? this.lastRequest : null;
  }

  private readCorrelationId(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim();
    return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(normalized) ? normalized : undefined;
  }
}
