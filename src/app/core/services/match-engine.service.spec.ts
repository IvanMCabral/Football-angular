/**
 * LIVE-MATCH-F3-UI-LIVE FE1: unit tests for the SSE backoff + health plumbing
 * in {@link MatchEngineService}.
 *
 * <p>Karma + Jasmine setup is wired in {@link ../../../karma.conf.js} and the
 * test target in `angular.json`. This spec validates:
 * <ul>
 *   <li>Initial streamHealth$ is CLOSED.</li>
 *   <li>After onopen + first message the health becomes HEALTHY.</li>
 *   <li>After a closed-error, the service schedules a backoff reconnect and
 *       transitions to RECONNECTING.</li>
 *   <li>After {@link RECONNECT_MAX_ATTEMPTS} failed attempts the health is
 *       CLOSED.</li>
 *   <li>No event in {@code DEGRADED_GAP_MS} → health becomes DEGRADED.</li>
 *   <li>A payload with {@code status=FINISHED} completes the stream.</li>
 * </ul>
 *
 * <p>Timer-based tests use `jasmine.clock()` to mock `setTimeout` instead of
 * `fakeAsync(tick(...))` — this avoids the ProxyZone bootstrapping pain and
 * keeps the spec independent of zone.js internals.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { MatchEngineService } from './match-engine.service';
import { MatchState, StreamHealth } from './match-engine.model';

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

  afterEach(() => {
    // Drain any leftover timers from a fakeAsync test by clearing
    // jasmine.clock if it was installed. (jasmine 5+ removed the
    // .installed getter, so we just attempt uninstall unconditionally
    // and swallow the "not installed" error.)
    try { jasmine.clock().uninstall(); } catch (_e) { /* not installed */ }
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

  it('switches to RECONNECTING after a CLOSE error and schedules a backoff reconnect', () => {
    jasmine.clock().install();
    const received: MatchState[] = [];
    service.streamMatchState('m1').subscribe(s => received.push(s));

    const es1 = MockEventSource.instances[0];
    es1.fireOpen();
    es1.fireMessage(fakeState);
    expect(service.streamHealth$.value).toBe('HEALTHY');

    // Force a closed state (network dropped) — service schedules a backoff
    es1.fireErrorAndClose();
    expect(service.streamHealth$.value).toBe('RECONNECTING');

    // Advance just under the 1s backoff (with jitter), nothing happens
    jasmine.clock().tick(800);
    expect(MockEventSource.instances.length).toBe(1);

    // Advance past the backoff (give 500ms leeway for jitter)
    jasmine.clock().tick(500);
    expect(MockEventSource.instances.length).toBe(2);

    // Open the new connection → HEALTHY
    const es2 = MockEventSource.instances[1];
    es2.fireOpen();
    expect(service.streamHealth$.value).toBe('HEALTHY');
  });

  it('caps the backoff at RECONNECT_MAX_ATTEMPTS and transitions to CLOSED', () => {
    jasmine.clock().install();
    service.streamMatchState('m1').subscribe();

    // Open and immediately close to trigger 5 reconnect attempts.
    // The first ES instance is created in subscribe() above. Subsequent
    // attempts are created by the backoff timer.
    const initialCount = MockEventSource.instances.length;
    for (let i = 0; i < 5; i++) {
      const es = MockEventSource.instances[initialCount + i];
      if (!es) { break; }
      es.fireOpen();
      es.fireErrorAndClose();
      // Advance well past each backoff to allow reconnect attempt
      jasmine.clock().tick(35_000);
    }

    // After 5 attempts, next error should transition to CLOSED
    expect(service.streamHealth$.value).toBe('CLOSED');
  });

  it('emits DEGRADED when no event arrives within the gap window', () => {
    jasmine.clock().install();
    service.streamMatchState('m1').subscribe();
    const es = MockEventSource.instances[0];
    es.fireOpen();
    es.fireMessage(fakeState);
    expect(service.streamHealth$.value).toBe('HEALTHY');

    // Wait > DEGRADED_GAP_MS (5000) without firing another message
    jasmine.clock().tick(5_500);
    expect(service.streamHealth$.value).toBe('DEGRADED');
  });

  it('completes the stream when the payload is FINISHED', () => {
    let completed = false;
    service.streamMatchState('m1').subscribe({ complete: () => completed = true });
    const es = MockEventSource.instances[0];
    es.fireOpen();
    es.fireMessage({ ...fakeState, status: 'FINISHED' });
    expect(completed).toBe(true);
  });
});
