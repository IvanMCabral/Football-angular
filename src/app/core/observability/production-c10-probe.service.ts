import { Injectable } from '@angular/core';

export const PRODUCTION_C10_PROBE_QUERY_PARAM = 'c10probe';
export const PRODUCTION_C10_PROBE_QUERY_VALUE = '1';

export const PRODUCTION_C10_EVENT_NAMES = [
  'PROD_C10_NEXT_ENTER',
  'PROD_C10_TEAMS_ASSIGNED',
  'PROD_C10_LOADING_FALSE',
  'PROD_C10_INSTANCE_DESTROYED',
  'PROD_C10_AFTER_RENDER',
] as const;

export type ProductionC10EventName = typeof PRODUCTION_C10_EVENT_NAMES[number];

export interface ProductionC10Event {
  event: ProductionC10EventName;
  instanceSeq: number;
  elapsedMs: number;
  incomingCount?: number;
  assignedCount?: number;
  renderedCount?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductionC10ProbeService {
  private readonly startedAt = performance.now();
  private readonly enabledAtStartup = this.hasExactActivation();
  private readonly events: ProductionC10Event[] = [];
  private readonly emitted = new Set<ProductionC10EventName>();
  private activeInstanceSeq: number | undefined;
  private surface: HTMLElement | null = null;

  get enabled(): boolean {
    return this.enabledAtStartup;
  }

  attachSurface(surface: HTMLElement): void {
    if (!this.enabled) {
      return;
    }

    this.surface = surface;
    this.renderSurface();
  }

  recordNextEnter(instanceSeq: number, incomingCount: number): void {
    this.record('PROD_C10_NEXT_ENTER', instanceSeq, { incomingCount });
  }

  recordTeamsAssigned(instanceSeq: number, assignedCount: number): void {
    this.record('PROD_C10_TEAMS_ASSIGNED', instanceSeq, { assignedCount });
  }

  recordLoadingFalse(instanceSeq: number): void {
    this.record('PROD_C10_LOADING_FALSE', instanceSeq);
  }

  recordInstanceDestroyed(instanceSeq: number): void {
    this.record('PROD_C10_INSTANCE_DESTROYED', instanceSeq);
  }

  recordAfterRender(instanceSeq: number, renderedCount: number): void {
    this.record('PROD_C10_AFTER_RENDER', instanceSeq, { renderedCount });
  }

  snapshot(): readonly ProductionC10Event[] {
    return this.events;
  }

  private record(
    event: ProductionC10EventName,
    instanceSeq: number,
    fields: Omit<Partial<ProductionC10Event>, 'event' | 'instanceSeq' | 'elapsedMs'> = {}
  ): void {
    if (!this.enabled) {
      return;
    }

    if (event === 'PROD_C10_NEXT_ENTER' && this.activeInstanceSeq !== instanceSeq) {
      this.activeInstanceSeq = instanceSeq;
      this.events.splice(0);
      this.emitted.clear();
    }

    if (this.activeInstanceSeq === undefined) {
      this.activeInstanceSeq = instanceSeq;
    }
    if (this.activeInstanceSeq !== instanceSeq) {
      return;
    }
    if (this.emitted.has(event)) {
      return;
    }

    this.emitted.add(event);
    this.events.push({
      event,
      instanceSeq,
      elapsedMs: Math.max(0, Math.round(performance.now() - this.startedAt)),
      ...fields,
    });
    this.renderSurface();
  }

  private renderSurface(): void {
    if (!this.surface) {
      return;
    }

    const next = this.find('PROD_C10_NEXT_ENTER');
    const assigned = this.find('PROD_C10_TEAMS_ASSIGNED');
    const loadingFalse = this.find('PROD_C10_LOADING_FALSE');
    const destroyed = this.find('PROD_C10_INSTANCE_DESTROYED');
    const afterRender = this.find('PROD_C10_AFTER_RENDER');
    const instanceSeq = next?.instanceSeq ?? assigned?.instanceSeq ?? loadingFalse?.instanceSeq ?? destroyed?.instanceSeq ?? afterRender?.instanceSeq;

    this.surface.textContent = [
      'C10 probe',
      `instance: ${instanceSeq ?? 'not-observed'}`,
      `next: ${next?.incomingCount ?? 'not-observed'}`,
      `assigned: ${assigned?.assignedCount ?? 'not-observed'}`,
      `loadingFalse: ${loadingFalse ? 'yes' : 'no'}`,
      `destroyed: ${destroyed ? 'yes' : 'no'}`,
      `afterRender: ${afterRender ? 'yes' : 'no'}`,
      `rendered: ${afterRender?.renderedCount ?? 'not-observed'}`,
    ].join('\n');
  }

  private find(event: ProductionC10EventName): ProductionC10Event | undefined {
    return this.events.find((item) => item.event === event);
  }

  private hasExactActivation(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return new URLSearchParams(window.location.search).get(PRODUCTION_C10_PROBE_QUERY_PARAM) === PRODUCTION_C10_PROBE_QUERY_VALUE;
  }
}
