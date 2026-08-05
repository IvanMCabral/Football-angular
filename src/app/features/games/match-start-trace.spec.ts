import {
  beginMatchStartTrace,
  completeMatchStartTrace,
  markMatchStartPointerEvent,
  markMatchStartStage
} from './match-start-trace';

describe('match-start trace marker semantics', () => {
  afterEach(() => {
    delete window.managerMatchStartTrace;
  });

  it('keeps physical dispatch separate from the synchronous handler path', () => {
    markMatchStartPointerEvent();
    markMatchStartStage('CLICK_HANDLER_ENTER');
    markMatchStartStage('START_GUARD_COMPLETE');
    markMatchStartStage('PAYLOAD_BUILD_START');
    markMatchStartStage('PAYLOAD_BUILD_END');
    markMatchStartStage('HTTP_OBSERVABLE_CREATED');
    markMatchStartStage('HTTP_SUBSCRIBE_START');
    markMatchStartStage('FETCH_XHR_DISPATCH');

    const trace = window.managerMatchStartTrace;
    expect(trace).toBeDefined();
    expect(trace?.stages.POINTER_EVENT_RECEIVED).toBeDefined();
    expect(trace?.stages.CLICK_HANDLER_ENTER).toBeDefined();
    expect(trace?.stages.HTTP_SUBSCRIBE_START).toBeDefined();
    expect(trace?.stages.POINTER_EVENT_RECEIVED).toBeLessThanOrEqual(
      trace?.stages.CLICK_HANDLER_ENTER ?? Number.MAX_SAFE_INTEGER
    );
  });

  it('measures twenty controlled synchronous preparations below the local budget', () => {
    const samples: number[] = [];
    const consoleSpy = spyOn(console, 'info');

    for (let index = 0; index < 20; index += 1) {
      beginMatchStartTrace(true);
      markMatchStartStage('CLICK_HANDLER_ENTER');
      markMatchStartStage('START_GUARD_COMPLETE');
      markMatchStartStage('PAYLOAD_BUILD_START');
      const payload = { careerId: `career-${index}` };
      expect(payload.careerId).toBeTruthy();
      markMatchStartStage('PAYLOAD_BUILD_END');
      markMatchStartStage('HTTP_OBSERVABLE_CREATED');
      markMatchStartStage('HTTP_SUBSCRIBE_START');
      markMatchStartStage('FETCH_XHR_DISPATCH');
      completeMatchStartTrace(`round-${index}`);

      const json = consoleSpy.calls.mostRecent().args[1] as string;
      const trace = JSON.parse(json) as { handlerToPostSubscribeMs: number };
      samples.push(trace.handlerToPostSubscribeMs);
    }

    expect(samples.length).toBe(20);
    expect(Math.max(...samples)).toBeLessThanOrEqual(100);
  });
});
