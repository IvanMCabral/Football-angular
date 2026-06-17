/**
 * LIVE-MATCH-F3-UI-LIVE FE1: unit tests for the SSE backoff + health plumbing
 * in {@link MatchEngineService}.
 *
 * <p>IMPORTANT: this project has NO Karma/Jasmine test infrastructure
 * configured (no `test` script in `package.json`, no `karma.conf.js`, no
 * jasmine deps in `devDependencies`). This spec is a faithful record of the
 * expected behavior — wire it up once Karma is added to the project.
 *
 * <p>To run: add to package.json:
 * <pre>
 *   "scripts": { "test": "ng test" }
 * </pre>
 * And to devDependencies:
 * <pre>
 *   "jasmine-core": "~5.x",
 *   "karma": "~6.x",
 *   "karma-chrome-launcher": "~3.x",
 *   "karma-jasmine": "~5.x",
 *   "karma-jasmine-html-reporter": "~2.x",
 *   "@types/jasmine": "~5.x"
 * </pre>
 * Plus a `tsconfig.spec.json` and a `test` target in `angular.json`.
 */

import { TestBed, fakeAsync, tick, flush, discardPeriodicTasks } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { MatchEngineService } from './match-engine.service';
import { MatchState, StreamHealth } from './match-engine.model';
import { environment } from '../../environments/environment';

// ---------- EventSource mock ----------

class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  url: string;
  readyState: number = MockEventSource.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  // Test helpers
  static instances: MockEventSource[] = [];
  static reset() { MockEventSource.instances = []; }

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Helpers used by the test code
  fireOpen()  { this.readyState = MockEventSource.OPEN; this.onopen?.(new Event('open')); }
  fireMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
  fireErrorAndClose() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

describe('MatchEngineService — LIVE-MATCH-F3-UI-LIVE FE1 (SSE backoff + health)', () => {
  let service: MatchEngineService;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  const fakeState: MatchState = {
    matchId: 'm1',
    homeTeamId: 'h',
    awayTeamId: 'a',
    currentMinute: 10,
    status: 'RUNNING',
    score: { home: 1, away: 0 },
    homePossession: 60,
    awayPossession: 40,
    homeStyle: 'BALANCED',
    awayStyle: 'BALANCED',
    homeFormation: '4-4-2',
    awayFormation: '4-4-2',
    homeTactic: 'BALANCED',
    awayTactic: 'BALANCED',
    events: [],
    cards: [],
    substitutions: [],
    players: []
  };

  beforeEach(() => {
    (globalThis as any).EventSource = MockEventSource;
    MockEventSource.reset();
    httpSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
    TestBed.configureTestingModule({
      providers: [
        MatchEngineService,
        { provide: HttpClient, useValue: httpSpy }
      ]
    });
    service = TestBed.inject(MatchEngineService);
  });

  it('initial health is CLOSED', () => {
    expect(service.streamHealth$.value).toBe('CLOSED');
  });

  it('emits HEALTHY after onopen and after each message', () => {
    const health: StreamHealth[] = [];
    const sub = service.streamHealth$.subscribe(h => health.push(h));
    const stream$ = service.streamMatchState('m1');
    const received: MatchState[] = [];
    stream$.subscribe(s => received.push(s));

    // open + first message
    const es = MockEventSource.instances[0];
    es.fireOpen();
    expect(service.streamHealth$.value).toBe('HEALTHY');
    es.fireMessage(fakeState);
    expect(received.length).toBe(1);
    sub.unsubscribe();
  });

  it('switches to RECONNECTING after a CLOSE error and schedules a backoff reconnect', fakeAsync(() => {
    const health: StreamHealth[] = [];
    service.streamHealth$.subscribe(h => health.push(h));
    const received: MatchState[] = [];
    service.streamMatchState('m1').subscribe(s => received.push(s));

    const es1 = MockEventSource.instances[0];
    es1.fireOpen();
    es1.fireMessage(fakeState);
    expect(service.streamHealth$.value).toBe('HEALTHY');

    // Force a closed state (network dropped)
    es1.fireErrorAndClose();
    expect(service.streamHealth$.value).toBe('RECONNECTING');

    // Advance just under the 1s backoff (with jitter), nothing happens
    tick(800);
    expect(MockEventSource.instances.length).toBe(1);

    // Advance past the backoff (give 500ms leeway for jitter)
    tick(500);
    expect(MockEventSource.instances.length).toBe(2);

    // Open the new connection → HEALTHY
    const es2 = MockEventSource.instances[1];
    es2.fireOpen();
    expect(service.streamHealth$.value).toBe('HEALTHY');

    flush();
    discardPeriodicTasks();
  }));

  it('caps the backoff at RECONNECT_MAX_ATTEMPTS and transitions to CLOSED', fakeAsync(() => {
    service.streamMatchState('m1').subscribe();

    // Open and immediately close to trigger 5 reconnect attempts
    for (let i = 0; i < 5; i++) {
      const es = MockEventSource.instances[i];
      es.fireOpen();
      es.fireErrorAndClose();
      // Advance well past each backoff to allow reconnect attempt
      tick(35_000);
    }

    // After 5 attempts, next error should transition to CLOSED
    expect(service.streamHealth$.value).toBe('CLOSED');

    flush();
    discardPeriodicTasks();
  }));

  it('emits DEGRADED when no event arrives within the gap window', fakeAsync(() => {
    const health: StreamHealth[] = [];
    service.streamHealth$.subscribe(h => health.push(h));
    service.streamMatchState('m1').subscribe();
    const es = MockEventSource.instances[0];
    es.fireOpen();
    es.fireMessage(fakeState);
    expect(service.streamHealth$.value).toBe('HEALTHY');

    // Wait > DEGRADED_GAP_MS (5000) without firing another message
    tick(5_500);
    expect(service.streamHealth$.value).toBe('DEGRADED');

    flush();
    discardPeriodicTasks();
  }));

  it('completes the stream when the payload is FINISHED', () => {
    let completed = false;
    service.streamMatchState('m1').subscribe({ complete: () => completed = true });
    const es = MockEventSource.instances[0];
    es.fireOpen();
    es.fireMessage({ ...fakeState, status: 'FINISHED' });
    expect(completed).toBe(true);
  });
});
