/**
 * Request-level match-start trace shared by eager and lazy Angular chunks.
 * It stores only monotonic timings and counters and is enabled only when the
 * caller explicitly starts a trace (the public app never logs payloads).
 */
export type MatchStartTraceStage =
  | 'T0_CLICK_RECEIVED'
  | 'T1_HANDLER_STARTED'
  | 'T2_LOCAL_VALIDATION_DONE'
  | 'T3_STATUS_REQUESTED'
  | 'T4_STATUS_COMPLETED'
  | 'T5_FIXTURES_REQUESTED'
  | 'T6_FIXTURES_COMPLETED'
  | 'T7_LINEUP_REQUESTED'
  | 'T8_LINEUP_COMPLETED'
  | 'T9_START_POST_SENT'
  | 'T10_START_POST_RECEIVED'
  | 'T11_NAVIGATION_REQUESTED'
  | 'T12_ROUTE_ACTIVATION'
  | 'T13_LIVE_COMPONENT_CREATED'
  | 'T14_FIRST_RENDER'
  | 'T15_STREAM_CREATED'
  | 'T16_FIRST_SSE';

interface TraceState {
  startedAt: number;
  stages: Partial<Record<MatchStartTraceStage, number>>;
  metadata: MatchStartTraceMetadata;
}

export interface MatchStartTraceMetadata {
  statusSnapshotAvailableAtClick?: boolean;
  statusSnapshotAgeMs?: number | null;
  statusHttpTriggeredByClick?: boolean;
  statusInvalidationReason?: string | null;
  fixtureSnapshotAvailableAtClick?: boolean;
  startPayloadReadyMs?: number | null;
  startPostSentMs?: number | null;
  backendValidationFailureCode?: string | null;
}

declare global {
  interface Window {
    managerMatchStartTrace?: TraceState;
  }
}

const now = (): number => typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now();

function markPerformance(stage: MatchStartTraceStage): void {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(`manager.match-start.${stage}`);
  }
}

export function beginMatchStartTrace(reset = false): void {
  if (typeof window !== 'undefined' && window.managerMatchStartTrace && !reset) {
    return;
  }
  const trace: TraceState = { startedAt: now(), stages: {}, metadata: {} };
  trace.stages.T0_CLICK_RECEIVED = trace.startedAt;
  if (typeof window !== 'undefined') {
    window.managerMatchStartTrace = trace;
  }
  markPerformance('T0_CLICK_RECEIVED');
}

export function setMatchStartTraceMetadata(patch: MatchStartTraceMetadata): void {
  if (typeof window === 'undefined' || !window.managerMatchStartTrace) {
    return;
  }
  window.managerMatchStartTrace.metadata = {
    ...window.managerMatchStartTrace.metadata,
    ...patch
  };
}

/** Clears an abandoned trace when the user starts a fresh attempt. */
export function resetMatchStartTrace(): void {
  if (typeof window !== 'undefined') {
    delete window.managerMatchStartTrace;
  }
}

export function markMatchStartStage(stage: MatchStartTraceStage): void {
  if (typeof window === 'undefined' || !window.managerMatchStartTrace) {
    return;
  }
  const timestamp = now();
  window.managerMatchStartTrace.stages[stage] = timestamp;
  if (stage === 'T9_START_POST_SENT') {
    const elapsed = Math.max(0, Math.round(timestamp - window.managerMatchStartTrace.startedAt));
    window.managerMatchStartTrace.metadata.startPostSentMs = elapsed;
    if (window.managerMatchStartTrace.metadata.startPayloadReadyMs == null) {
      window.managerMatchStartTrace.metadata.startPayloadReadyMs = elapsed;
    }
  }
  markPerformance(stage);
}

export function completeMatchStartTrace(roundId: string): void {
  if (typeof window === 'undefined' || !window.managerMatchStartTrace) {
    return;
  }
  const trace = window.managerMatchStartTrace;
  const stage = (name: MatchStartTraceStage): number | null => trace.stages[name] ?? null;
  const duration = (from: MatchStartTraceStage, to: MatchStartTraceStage): number | null => {
    const start = stage(from);
    const end = stage(to);
    return start === null || end === null ? null : Math.max(0, Math.round(end - start));
  };
  console.info('[MATCH-START-FULL-TRACE]', JSON.stringify({
    roundId,
    clickHandlerMs: duration('T0_CLICK_RECEIVED', 'T1_HANDLER_STARTED'),
    validationMs: duration('T1_HANDLER_STARTED', 'T2_LOCAL_VALIDATION_DONE'),
    statusWaitMs: duration('T3_STATUS_REQUESTED', 'T4_STATUS_COMPLETED'),
    fixturesWaitMs: duration('T5_FIXTURES_REQUESTED', 'T6_FIXTURES_COMPLETED'),
    lineupWaitMs: duration('T7_LINEUP_REQUESTED', 'T8_LINEUP_COMPLETED'),
    preStartTotalMs: duration('T0_CLICK_RECEIVED', 'T9_START_POST_SENT'),
    postResponseNavigationMs: duration('T10_START_POST_RECEIVED', 'T13_LIVE_COMPONENT_CREATED'),
    liveComponentInitMs: duration('T13_LIVE_COMPONENT_CREATED', 'T14_FIRST_RENDER'),
    firstRenderMs: duration('T13_LIVE_COMPONENT_CREATED', 'T14_FIRST_RENDER'),
    streamConnectMs: duration('T15_STREAM_CREATED', 'T16_FIRST_SSE'),
    ...trace.metadata,
    stages: Object.fromEntries(Object.entries(trace.stages).map(([key, value]) => [key, Math.round(value - trace.startedAt)]))
  }));
  delete window.managerMatchStartTrace;
}
