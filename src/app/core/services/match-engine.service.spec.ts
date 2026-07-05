/**
 * LIVE-MATCH-F3-UI-LIVE FE1: unit tests for the SSE backoff + health plumbing
 * in {@link MatchEngineService}.
 *
 * <p>Karma + Jasmine setup is wired in {@link ../../../karma.conf.js} and the
 * test target in `angular.json`. This spec validates:
 * <ul>
 *   <li>Initial streamHealth$ is CLOSED.</li>
 *   <li>After the fetch resolves and the first message arrives, the health
 *       becomes HEALTHY.</li>
 *   <li>After a stream drop, the service schedules a backoff reconnect and
 *       transitions to RECONNECTING.</li>
 *   <li>After {@link RECONNECT_MAX_ATTEMPTS} failed attempts the health is
 *       CLOSED.</li>
 *   <li>No event in {@code DEGRADED_GAP_MS} → health becomes DEGRADED.</li>
 *   <li>A payload with {@code status=FINISHED} completes the stream.</li>
 * </ul>
 *
 * <p>V25D85-SSE-AUTH: the underlying transport switched from
 * {@code EventSource} (which does NOT support custom request headers) to
 * {@code fetch + ReadableStream}, so the Authorization header can flow to
 * the backend. Tests use a tiny fetch mock that captures the request
 * options (URL + headers + AbortController signal) and exposes a scriptable
 * reader so we can drive events deterministically.
 *
 * <p>Timer-based tests use `jasmine.clock()` to mock `setTimeout` instead of
 * `fakeAsync(tick(...))` — this avoids the ProxyZone bootstrapping pain and
 * keeps the spec independent of zone.js internals. Microtask flushing uses
 * a handful of `await Promise.resolve()` calls between the synchronous
 * trigger and the assertion.
 *
 * <p>LIVE-MATCH-F5.3.4: extends the spec with BUG-015 pause/resume plumbing
 * (helper roundId lookup + per-round pause/resume with 5-minute cache).
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MatchEngineService } from './match-engine.service';
import { AuthService } from './auth.service';
import { MatchState, StreamHealth } from './match-engine.model';

// ---------- fetch + ReadableStream mock (V25D85-SSE-AUTH) ----------

interface QueuedReader {
  resolve: (r: { done: boolean; value?: Uint8Array }) => void;
}

/**
 * Mock instance for one fetch() call. Captures URL + headers + signal so the
 * test can verify the Authorization header is wired through and the abort
 * signal is plumbed. Exposes `emit`, `endStream` and `respondError` to drive
 * the consumer's behavior.
 */
class MockFetchSse {
  static instances: MockFetchSse[] = [];
  static reset() { MockFetchSse.instances = []; }

  readonly url: string;
  readonly headers: Record<string, string>;
  /** AbortSignal from the request options — the SERVICE controls it via abort(). */
  readonly signal: AbortSignal;

  /** Resolved by the test once `respondOk`/`respondError` is called. */
  private resolveFetch!: (resp: unknown) => void;
  /** Rejected by the test if `respondReject` is called. */
  private rejectFetch!: (err: unknown) => void;
  /** Whether the fetch promise has been resolved already. */
  private fetchResolved = false;

  /**
   * Queued reader callbacks. The reader pulls chunks via pump(); chunks are
   * added to the queue by emit / endStream. The reader read() resolves as
   * soon as a chunk is queued.
   */
  private readerQueue: { done: boolean; value?: Uint8Array }[] = [];
  private readerWaiters: QueuedReader[] = [];

  /** Whether `endStream` was already called (so subsequent reads return done). */
  private streamEnded = false;

  constructor(url: string, options: RequestInit | undefined) {
    this.url = url;
    this.headers = MockFetchSse.toHeaderMap(options?.headers);
    // IMPORTANT: use the SIGNAL the SERVICE passed in (via options.signal).
    // When the service calls `controller.abort()` on its own AbortController,
    // the same signal will flip to `aborted = true` here — that's how the
    // test verifies cleanup.
    const optSignal = (options?.signal ?? null) as AbortSignal | null;
    if (optSignal) {
      this.signal = optSignal;
    } else {
      // No signal provided: emit a never-aborted stand-in so the property is
      // always defined. Tests can still poke at it.
      this.signal = new AbortController().signal;
    }
    MockFetchSse.instances.push(this);
  }

  static toHeaderMap(raw: HeadersInit | undefined): Record<string, string> {
    if (!raw) return {};
    if (typeof Headers !== 'undefined' && raw instanceof Headers) {
      const out: Record<string, string> = {};
      raw.forEach((v, k) => { out[k] = v; });
      return out;
    }
    if (Array.isArray(raw)) {
      const out: Record<string, string> = {};
      for (const [k, v] of raw) { out[k] = v; }
      return out;
    }
    return { ...(raw as Record<string, string>) };
  }

  /** Called once when fetch() is invoked. Returns the fetch promise. */
  startFetch(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.resolveFetch = resolve;
      this.rejectFetch = reject;
    });
  }

  /** Resolve the fetch promise with a 200 OK + scriptable reader body. */
  respondOk(): void {
    if (this.fetchResolved) return;
    this.fetchResolved = true;
    const reader = this.makeReader();
    this.resolveFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      body: { getReader: () => reader }
    });
  }

  /** Resolve the fetch promise with a non-2xx response (used to trigger reconnect). */
  respondHttpError(status: number): void {
    if (this.fetchResolved) return;
    this.fetchResolved = true;
    this.resolveFetch({ ok: false, status, statusText: 'ERR', headers: new Headers(), body: null });
  }

  /** Reject the fetch promise with a network error. */
  respondReject(message: string): void {
    if (this.fetchResolved) return;
    this.fetchResolved = true;
    this.rejectFetch(new Error(message));
  }

  /**
   * V25D88-FRONT-F1: push one SSE data event into the open stream using the
   * REAL Spring `ServerSentEventHttpMessageWriter` wire format
   * {@code `data:${JSON.stringify(payload)}\n\n`} — NO trailing space after
   * {@code data:}. The pre-V25D88 mock used {@code `data: ${...}`} (WITH space),
   * which matched the front's stale regex but NOT what the backend actually
   * emits in production, so the parser bug slipped through unit tests.
   */
  emit(payload: unknown): void {
    const data = `data:${JSON.stringify(payload)}\n\n`;
    this.readerQueue.push({ done: false, value: new TextEncoder().encode(data) });
    this.drainReader();
  }

  /** Push a raw SSE chunk (already in wire format) into the open stream. */
  emitRaw(raw: string): void {
    this.readerQueue.push({ done: false, value: new TextEncoder().encode(raw) });
    this.drainReader();
  }

  /** Close the response stream cleanly (signal `done: true`). */
  endStream(): void {
    this.streamEnded = true;
    if (this.readerQueue.length === 0) {
      this.readerQueue.push({ done: true });
    }
    this.drainReader();
  }

  private makeReader(): {
    read: () => Promise<{ done: boolean; value?: Uint8Array }>;
  } {
    return {
      read: () => new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
        if (this.readerQueue.length > 0) {
          resolve(this.readerQueue.shift()!);
          return;
        }
        if (this.streamEnded) {
          resolve({ done: true });
          return;
        }
        this.readerWaiters.push({ resolve });
      })
    };
  }

  private drainReader(): void {
    while (this.readerWaiters.length > 0 && this.readerQueue.length > 0) {
      const next = this.readerQueue.shift()!;
      const waiter = this.readerWaiters.shift()!;
      waiter.resolve(next);
    }
  }
}

/**
 * Install a fake `globalThis.fetch`. Each call captures the options
 * (URL + headers + signal) in a `MockFetchSse` and exposes the response
 * once the test calls `respondOk` / `respondError` / `respondReject`.
 */
function installMockFetch(): () => void {
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = (url: string, options?: RequestInit) => {
    const mock = new MockFetchSse(url, options);
    return mock.startFetch();
  };
  return () => {
    (globalThis as any).fetch = originalFetch;
  };
}

describe('MatchEngineService — LIVE-MATCH-F3-UI-LIVE FE1 + V25D85-SSE-AUTH', () => {
  let service: MatchEngineService;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let authServiceStub: { getToken: () => string | null };
  let restoreFetch: () => void;

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

  /** Flush a few microtasks so the awaited fetch() chain settles. */
  async function flushMicrotasks(n = 10): Promise<void> {
    for (let i = 0; i < n; i++) {
      await Promise.resolve();
    }
  }

  beforeEach(() => {
    MockFetchSse.reset();
    authServiceStub = { getToken: () => 'test-jwt-token' };
    httpSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
    TestBed.configureTestingModule({
      providers: [
        MatchEngineService,
        { provide: HttpClient, useValue: httpSpy },
        { provide: AuthService, useValue: authServiceStub }
      ]
    });
    service = TestBed.inject(MatchEngineService);
    restoreFetch = installMockFetch();
  });

  afterEach(() => {
    try { jasmine.clock().uninstall(); } catch (_e) { /* not installed */ }
    restoreFetch();
  });

  it('initial health is CLOSED', () => {
    expect(service.streamHealth$.value).toBe('CLOSED');
  });

  it('emits HEALTHY after the fetch resolves and after each message', async () => {
    const health: StreamHealth[] = [];
    const sub = service.streamHealth$.subscribe(h => health.push(h));
    const received: MatchState[] = [];
    service.streamMatchState('m1').subscribe(s => received.push(s));

    await flushMicrotasks();
    expect(MockFetchSse.instances.length).toBe(1);

    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    MockFetchSse.instances[0].emit(fakeState);
    await flushMicrotasks();

    expect(service.streamHealth$.value).toBe('HEALTHY');
    expect(received.length).toBe(1);
    sub.unsubscribe();
  });

  it('switches to RECONNECTING after a stream drop and schedules a backoff reconnect', async () => {
    jasmine.clock().install();
    const received: MatchState[] = [];
    service.streamMatchState('m1').subscribe(s => received.push(s));

    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    MockFetchSse.instances[0].emit(fakeState);
    await flushMicrotasks();
    expect(service.streamHealth$.value).toBe('HEALTHY');

    // Drop the stream — service should reconnect.
    MockFetchSse.instances[0].endStream();
    await flushMicrotasks();
    expect(service.streamHealth$.value).toBe('RECONNECTING');

    // Advance just under the 1s backoff, nothing happens.
    jasmine.clock().tick(800);
    expect(MockFetchSse.instances.length).toBe(1);

    // Advance past the backoff.
    jasmine.clock().tick(500);
    expect(MockFetchSse.instances.length).toBe(2);

    // Open the new connection → HEALTHY.
    await flushMicrotasks();
    MockFetchSse.instances[1].respondOk();
    await flushMicrotasks();
    MockFetchSse.instances[1].emit(fakeState);
    await flushMicrotasks();
    expect(service.streamHealth$.value).toBe('HEALTHY');
  });

  it('caps the backoff at RECONNECT_MAX_ATTEMPTS and transitions to CLOSED', async () => {
    jasmine.clock().install();
    service.streamMatchState('m1').subscribe();

    for (let i = 0; i < 5; i++) {
      await flushMicrotasks();
      const inst = MockFetchSse.instances[i];
      if (!inst) { break; }
      inst.endStream();
      await flushMicrotasks();
      jasmine.clock().tick(35_000);
    }

    await flushMicrotasks();
    expect(service.streamHealth$.value).toBe('CLOSED');
  });

  it('emits DEGRADED when no event arrives within the gap window', async () => {
    jasmine.clock().install();
    service.streamMatchState('m1').subscribe();
    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    MockFetchSse.instances[0].emit(fakeState);
    await flushMicrotasks();
    expect(service.streamHealth$.value).toBe('HEALTHY');

    jasmine.clock().tick(5_500);
    expect(service.streamHealth$.value).toBe('DEGRADED');
  });

  it('completes the stream when the payload is FINISHED', async () => {
    let completed = false;
    service.streamMatchState('m1').subscribe({ complete: () => completed = true });
    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    MockFetchSse.instances[0].emit({ ...fakeState, status: 'FINISHED' });
    await flushMicrotasks();
    expect(completed).toBe(true);
  });

  // ========== V25D85-SSE-AUTH: new tests for the fetch-based transport ==========

  it('V25D85-SSE-AUTH: streamRoundState sends Authorization Bearer header on fetch', async () => {
    service.streamRoundState('r1').subscribe();
    await flushMicrotasks();
    expect(MockFetchSse.instances.length).toBe(1);
    const inst = MockFetchSse.instances[0];
    expect(inst.url).toContain('/rounds/r1/stream');
    expect(inst.headers['Authorization']).toBe('Bearer test-jwt-token');
    expect(inst.headers['Accept']).toBe('text/event-stream');
    // Simulate completion so the backoff timer doesn't leak.
    inst.respondHttpError(500);
    await flushMicrotasks();
  });

  it('V25D85-SSE-AUTH: does NOT attach Authorization header when no token is present', async () => {
    authServiceStub.getToken = () => null;
    service.streamRoundState('r2').subscribe();
    await flushMicrotasks();
    const inst = MockFetchSse.instances[0];
    expect(inst.headers['Authorization']).toBeUndefined();
    expect(inst.headers['Accept']).toBe('text/event-stream');
    inst.respondHttpError(500);
    await flushMicrotasks();
  });

  it('V25D85-SSE-AUTH: parses SSE data events into JSON payloads', async () => {
    const received: unknown[] = [];
    service.streamRoundState('r3').subscribe(p => received.push(p));
    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    MockFetchSse.instances[0].emit({ matchId: 'a', currentMinute: 5 });
    MockFetchSse.instances[0].emit({ matchId: 'b', currentMinute: 6 });
    await flushMicrotasks();
    expect(received.length).toBe(2);
    expect((received[0] as { matchId: string }).matchId).toBe('a');
    expect((received[1] as { currentMinute: number }).currentMinute).toBe(6);
  });

  it('V25D85-SSE-AUTH: handles partial SSE chunks split across reads', async () => {
    const received: unknown[] = [];
    service.streamRoundState('r4').subscribe(p => received.push(p));
    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    // V25D88-FRONT-F1: use the real Spring wire format `data:${json}` (NO
    // trailing space) instead of the legacy `data: ${json}` (WITH space).
    // The split-across-reads behavior is the same; only the wire format
    // changes to reflect what the backend actually sends in production.
    const combined = `data:${JSON.stringify({ matchId: 'x', currentMinute: 1 })}\n\ndata:${JSON.stringify({ matchId: 'y', currentMinute: 2 })}\n\n`;
    MockFetchSse.instances[0].emitRaw(combined);
    await flushMicrotasks();
    expect(received.length).toBe(2);
    expect((received[0] as { matchId: string }).matchId).toBe('x');
    expect((received[1] as { matchId: string }).matchId).toBe('y');
  });

  // ========== V25D88-FRONT-F1: tolerance for both wire formats ==========

  /**
   * V25D88-FRONT-F1: defense-in-depth regression test. The parser now matches
   * any line that starts with {@code 'data:'} (without requiring the trailing
   * space the previous regex needed). This test verifies both conventions are
   * accepted in the same stream so a future change to the backend encoder —
   * or an intermediary proxy that re-wraps the chunks — won't silently break
   * the round-live UI again.
   */
  it('V25D88-FRONT-F1: tolerates both "data:" (no space) and "data: " (with space) SSE formats', async () => {
    const received: unknown[] = [];
    service.streamRoundState('r-v25d88').subscribe(p => received.push(p));
    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    // Spring wire format (no space), legacy format (with space), and one chunk
    // that mixes both — the parser must surface all four JSON payloads.
    const wire =
      `data:${JSON.stringify({ matchId: 'no-space-1', currentMinute: 1 })}\n\n` +
      `data: ${JSON.stringify({ matchId: 'with-space-2', currentMinute: 2 })}\n\n` +
      `data:${JSON.stringify({ matchId: 'no-space-3', currentMinute: 3 })}\n\n` +
      `data: ${JSON.stringify({ matchId: 'with-space-4', currentMinute: 4 })}\n\n`;
    MockFetchSse.instances[0].emitRaw(wire);
    await flushMicrotasks();
    expect(received.length).toBe(4);
    expect((received[0] as { matchId: string }).matchId).toBe('no-space-1');
    expect((received[1] as { matchId: string }).matchId).toBe('with-space-2');
    expect((received[2] as { matchId: string }).matchId).toBe('no-space-3');
    expect((received[3] as { matchId: string }).matchId).toBe('with-space-4');
    // Sanity: all currentMinutes must round-trip the JSON -> trim -> parse path.
    expect(received.map(p => (p as { currentMinute: number }).currentMinute)).toEqual([1, 2, 3, 4]);
  });

  it('V25D85-SSE-AUTH: signals abort on the request signal when unsubscribed', async () => {
    const sub = service.streamRoundState('r5').subscribe();
    await flushMicrotasks();
    MockFetchSse.instances[0].respondOk();
    await flushMicrotasks();
    const inst = MockFetchSse.instances[0];
    // The service creates its own AbortController; the mock holds the SAME
    // signal in `inst.signal` (passed via fetch options). Verify the signal
    // is aborted after the consumer unsubscribes.
    expect(inst.signal.aborted).toBe(false);
    sub.unsubscribe();
    expect(inst.signal.aborted).toBe(true);
  });

  it('V25D85-SSE-AUTH: triggers RECONNECTING when fetch returns non-2xx (e.g. 401)', async () => {
    jasmine.clock().install();
    service.streamRoundState('r6').subscribe();
    await flushMicrotasks();
    MockFetchSse.instances[0].respondHttpError(401);
    await flushMicrotasks();
    expect(service.streamHealth$.value).toBe('RECONNECTING');
  });
});

// ========== LIVE-MATCH-F5.3.4 BUG-015: pause/resume plumbing ==========

describe('MatchEngineService — LIVE-MATCH-F5.3 BUG-015 (pause/resume per round)', () => {
  let service: MatchEngineService;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let authServiceStub: { getToken: () => string | null };

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
    authServiceStub = { getToken: () => 'test-jwt-token' };
    TestBed.configureTestingModule({
      providers: [
        MatchEngineService,
        { provide: HttpClient, useValue: httpSpy },
        { provide: AuthService, useValue: authServiceStub }
      ]
    });
    service = TestBed.inject(MatchEngineService);
  });

  it('getRoundIdForMatch — calls GET /matches/{matchId}/roundId and caches the result', (done) => {
    const matchId = 'match-1';
    const roundId = 'round-1';
    httpSpy.get.and.returnValue(of({ matchId, roundId }));

    service.getRoundIdForMatch(matchId).subscribe(emitted => {
      expect(emitted).toBe(roundId);
      expect(httpSpy.get).toHaveBeenCalledTimes(1);
      expect(httpSpy.get).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/api\/v1\/match-engine\/matches\/match-1\/roundId$/)
      );
      done();
    });
  });

  it('getRoundIdForMatch — second call within TTL hits the cache (no second HTTP)', (done) => {
    const matchId = 'match-2';
    const roundId = 'round-2';
    httpSpy.get.and.returnValue(of({ matchId, roundId }));

    service.getRoundIdForMatch(matchId).subscribe();
    service.getRoundIdForMatch(matchId).subscribe(emitted => {
      expect(emitted).toBe(roundId);
      // Only ONE HTTP call — second call was served from cache
      expect(httpSpy.get).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('pauseRoundForMatch — resolves roundId via helper then POSTs to the round pause endpoint', (done) => {
    const careerId = 'career-1';
    const matchId = 'match-3';
    const roundId = 'round-3';
    httpSpy.get.and.returnValue(of({ matchId, roundId }));
    httpSpy.post.and.returnValue(of({ success: true }));

    service.pauseRoundForMatch(careerId, matchId).subscribe(result => {
      expect(result).toEqual({ success: true } as any);
      // GET helper + POST pause
      expect(httpSpy.get).toHaveBeenCalledTimes(1);
      expect(httpSpy.post).toHaveBeenCalledTimes(1);
      expect(httpSpy.post).toHaveBeenCalledWith(
        `/api/v1/career/${careerId}/round/${roundId}/pause`,
        {}
      );
      done();
    });
  });

  it('resumeRoundForMatch — resolves roundId via helper then POSTs to the round resume endpoint', (done) => {
    const careerId = 'career-2';
    const matchId = 'match-4';
    const roundId = 'round-4';
    httpSpy.get.and.returnValue(of({ matchId, roundId }));
    httpSpy.post.and.returnValue(of({ success: true, wasPaused: true }));

    service.resumeRoundForMatch(careerId, matchId).subscribe(result => {
      expect(result).toEqual({ success: true, wasPaused: true } as any);
      expect(httpSpy.post).toHaveBeenCalledWith(
        `/api/v1/career/${careerId}/round/${roundId}/resume`,
        {}
      );
      done();
    });
  });

  it('pauseRoundForMatch — second call within TTL reuses the cached roundId (only 1 GET across 2 pauses)', (done) => {
    const careerId = 'career-3';
    const matchId = 'match-5';
    const roundId = 'round-5';
    httpSpy.get.and.returnValue(of({ matchId, roundId }));
    httpSpy.post.and.returnValue(of({ success: true }));

    service.pauseRoundForMatch(careerId, matchId).subscribe(() => {
      service.pauseRoundForMatch(careerId, matchId).subscribe(() => {
        // Only ONE GET (cache hit on second call), TWO POSTs (idempotent pause)
        expect(httpSpy.get).toHaveBeenCalledTimes(1);
        expect(httpSpy.post).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });
});
