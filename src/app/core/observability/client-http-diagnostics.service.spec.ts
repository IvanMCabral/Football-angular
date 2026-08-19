import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClientHttpDiagnosticsService, TEAMS_ROUTE } from './client-http-diagnostics.service';
import { clientHttpDiagnosticsInterceptor } from './client-http-diagnostics.interceptor';
import { TeamsDiagnosticXhrFactory } from './teams-diagnostic-xhr.factory';

describe('client teams HTTP diagnostics', () => {
  let diagnostics: ClientHttpDiagnosticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClientHttpDiagnosticsService,
        provideHttpClient(withInterceptors([clientHttpDiagnosticsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    diagnostics = TestBed.inject(ClientHttpDiagnosticsService);
    diagnostics.resetForTest();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  it('records a bounded synthetic native lifecycle without body data', () => {
    diagnostics.startRequest();
    diagnostics.attachNativeTransport();
    diagnostics.recordNative('XHR_LOADSTART');
    diagnostics.recordNative('XHR_READY_STATE_2', { readyState: 2, status: 200, correlationId: 'corr-123' });
    diagnostics.recordNative('XHR_READY_STATE_3', { readyState: 3, status: 200, loadedBytes: 1, totalBytes: 70, lengthComputable: true });
    diagnostics.recordNative('XHR_PROGRESS', { loadedBytes: 1, totalBytes: 70, lengthComputable: true });
    diagnostics.recordNative('XHR_READY_STATE_4', { readyState: 4, status: 200, correlationId: 'corr-123' });
    diagnostics.recordNative('XHR_LOAD', { status: 200 });
    diagnostics.recordNative('XHR_LOADEND', { status: 200 });
    diagnostics.recordAngularNext(200);
    diagnostics.recordTeamServiceMapped();
    diagnostics.recordChooseTeamNext();
    diagnostics.finalizeRequest();

    const snapshot = diagnostics.snapshot();
    expect(snapshot.events.map((event) => event.event)).toEqual([
      'CLIENT_REQUEST_START',
      'XHR_LOADSTART',
      'XHR_READY_STATE_2',
      'XHR_READY_STATE_3',
      'XHR_PROGRESS',
      'XHR_READY_STATE_4',
      'XHR_LOAD',
      'XHR_LOADEND',
      'ANGULAR_HTTP_NEXT',
      'TEAM_SERVICE_MAPPED',
      'CHOOSE_TEAM_NEXT',
      'ANGULAR_HTTP_FINALIZE',
    ]);
    expect(snapshot.events.every((event) => event.normalizedRoute === TEAMS_ROUTE)).toBeTrue();
    expect(snapshot.events.some((event) => 'body' in event || 'url' in event || 'headers' in event)).toBeFalse();
    expect(JSON.stringify(snapshot)).not.toContain('SECRET_RESPONSE_MARKER');
    expect(snapshot.inFlight).toBeFalse();
  });

  it('keeps the route exact and caps progress observations', () => {
    diagnostics.startRequest();
    for (let loaded = 1; loaded <= 20; loaded += 1) {
      diagnostics.recordNative('XHR_PROGRESS', { loadedBytes: loaded * 64 * 1024, totalBytes: 20 * 64 * 1024, lengthComputable: true });
    }

    expect(diagnostics.snapshot().events.filter((event) => event.event === 'XHR_PROGRESS').length).toBeLessThanOrEqual(5);
    expect(diagnostics.snapshot().events.length).toBeLessThanOrEqual(24);
  });

  it('correlates component state observations across the interceptor finalization', () => {
    diagnostics.startRequest();
    const requestSeq = diagnostics.recordChooseTeamNextEnter(7, 70);
    diagnostics.finalizeRequest();
    diagnostics.recordChooseTeamTeamsAssigned(7, requestSeq, 70);
    diagnostics.recordChooseTeamLoadingFalse(7, requestSeq);
    diagnostics.recordChooseTeamAfterRender(7, requestSeq, 70);
    diagnostics.recordChooseTeamInstanceDestroyed(7, requestSeq);

    const componentEvents = diagnostics.snapshot().events.filter((event) => event.instanceSeq === 7);
    expect(componentEvents.map((event) => event.event)).toEqual([
      'CHOOSE_TEAM_NEXT_ENTER',
      'CHOOSE_TEAM_TEAMS_ASSIGNED',
      'CHOOSE_TEAM_LOADING_FALSE',
      'CHOOSE_TEAM_AFTER_RENDER',
      'CHOOSE_TEAM_INSTANCE_DESTROYED',
    ]);
    expect(componentEvents.every((event) => event.requestSeq === requestSeq)).toBeTrue();
    expect(componentEvents[0].incomingCount).toBe(70);
    expect(componentEvents[1].assignedCount).toBe(70);
    expect(componentEvents[2].loading).toBeFalse();
    expect(componentEvents[3].renderedCount).toBe(70);
  });

  it('records Angular next/finalize and Angular error/finalize separately', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get<unknown[]>(TEAMS_ROUTE).subscribe();
    controller.expectOne(TEAMS_ROUTE).flush([{ worldTeamId: 'team-1', name: 'safe' }]);
    expect(diagnostics.snapshot().events.map((event) => event.event)).toEqual([
      'CLIENT_REQUEST_START',
      'ANGULAR_HTTP_NEXT',
      'ANGULAR_HTTP_FINALIZE',
    ]);

    http.get<unknown[]>(TEAMS_ROUTE).subscribe({ error: () => undefined });
    controller.expectOne(TEAMS_ROUTE).flush({ message: 'failure' }, { status: 500, statusText: 'Server Error' });
    expect(diagnostics.snapshot().events.map((event) => event.event)).toEqual([
      'CLIENT_REQUEST_START',
      'ANGULAR_HTTP_ERROR',
      'ANGULAR_HTTP_FINALIZE',
    ]);
  });

  it('reads only X-Request-Id from Angular response headers and displays NOT_OBSERVED when absent', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get<unknown[]>(TEAMS_ROUTE).subscribe();
    controller.expectOne(TEAMS_ROUTE).flush([], {
      status: 200,
      statusText: 'OK',
      headers: new HttpHeaders({
        'X-Request-Id': 'corr-angular-1',
        Authorization: 'Bearer SHOULD_NOT_BE_RECORDED',
      }),
    });
    expect(diagnostics.snapshot().events.find((event) => event.event === 'ANGULAR_HTTP_NEXT')?.correlationId)
      .toBe('corr-angular-1');
    expect(JSON.stringify(diagnostics.snapshot())).not.toContain('SHOULD_NOT_BE_RECORDED');

    diagnostics.resetForTest();
    diagnostics.startRequest();
    diagnostics.recordAngularNext(200);
    expect(diagnostics.snapshot().events[1].correlationId).toBe('NOT_OBSERVED');
  });

  it('keeps a request visibly pending until unsubscribe/finalize', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const subscription = http.get<unknown[]>(TEAMS_ROUTE).subscribe();
    controller.expectOne(TEAMS_ROUTE);

    expect(diagnostics.snapshot().events.map((event) => event.event)).toEqual(['CLIENT_REQUEST_START']);
    expect(diagnostics.snapshot().inFlight).toBeTrue();

    subscription.unsubscribe();
    expect(diagnostics.snapshot().events.map((event) => event.event)).toEqual([
      'CLIENT_REQUEST_START',
      'ANGULAR_HTTP_FINALIZE',
    ]);
    expect(diagnostics.snapshot().inFlight).toBeFalse();
  });

  it('records native error, abort, and timeout as distinct terminal causes', () => {
    for (const event of ['XHR_ERROR', 'XHR_ABORT', 'XHR_TIMEOUT'] as const) {
      diagnostics.resetForTest();
      diagnostics.startRequest();
      diagnostics.recordNative(event, { status: 0 });
      diagnostics.recordNative('XHR_LOADEND', { status: 0 });
      expect(diagnostics.snapshot().events.map((item) => item.event)).toEqual([
        'CLIENT_REQUEST_START',
        event,
        'XHR_LOADEND',
      ]);
    }
  });
});

describe('TeamsDiagnosticXhrFactory', () => {
  let diagnostics: ClientHttpDiagnosticsService;
  let originalXhr: typeof XMLHttpRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ClientHttpDiagnosticsService, TeamsDiagnosticXhrFactory] });
    diagnostics = TestBed.inject(ClientHttpDiagnosticsService);
    diagnostics.resetForTest();
    originalXhr = window.XMLHttpRequest;
  });

  afterEach(() => {
    window.XMLHttpRequest = originalXhr;
  });

  it('captures synthetic XHR lifecycle events without reading responseText', () => {
    window.XMLHttpRequest = FakeXmlHttpRequest as unknown as typeof XMLHttpRequest;
    diagnostics.startRequest();
    const factory = TestBed.inject(TeamsDiagnosticXhrFactory);
    const xhr = factory.build() as unknown as FakeXmlHttpRequest;

    xhr.open('GET', '/api/v1/world/teams?userId=user-123&teamId=secret-team');
    xhr.readyState = 2;
    xhr.status = 200;
    xhr.responseHeaders['X-Request-Id'] = 'corr-456';
    xhr.dispatch('loadstart');
    xhr.dispatch('readystatechange');
    xhr.readyState = 3;
    xhr.dispatch('readystatechange');
    xhr.dispatch('progress', new ProgressEvent('progress', { loaded: 10, total: 70, lengthComputable: true }));
    xhr.readyState = 4;
    xhr.dispatch('readystatechange');
    xhr.dispatch('load');
    xhr.dispatch('loadend');

    const snapshot = diagnostics.snapshot();
    expect(snapshot.events.map((event) => event.event)).toEqual([
      'CLIENT_REQUEST_START',
      'XHR_LOADSTART',
      'XHR_READY_STATE_2',
      'XHR_READY_STATE_3',
      'XHR_PROGRESS',
      'XHR_READY_STATE_4',
      'XHR_LOAD',
      'XHR_LOADEND',
    ]);
    expect(snapshot.events.find((event) => event.event === 'XHR_READY_STATE_2')?.correlationId).toBe('corr-456');
    expect(JSON.stringify(snapshot)).not.toContain('SECRET_RESPONSE_MARKER');
    expect(JSON.stringify(snapshot)).not.toContain('user-123');
    expect(JSON.stringify(snapshot)).not.toContain('secret-team');
  });
});

class FakeXmlHttpRequest {
  readyState = 0;
  status = 0;
  responseText = 'SECRET_RESPONSE_MARKER';
  responseHeaders: Record<string, string> = {};
  private listeners: Record<string, Array<(event: Event) => void>> = {};

  open(..._args: unknown[]): void {
    this.readyState = 1;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;
    const callback = typeof listener === 'function'
      ? listener
      : (event: Event) => listener.handleEvent(event);
    this.listeners[type] = [...(this.listeners[type] ?? []), callback];
  }

  dispatch(type: string, event: Event = new Event(type)): void {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] ?? null;
  }
}
