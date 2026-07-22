import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchEvent } from '../../../../core/services/match-engine.model';

interface TimelineBucket {
  bucketStart: number;   // inclusive (0, 5, 10, ...)
  bucketEnd: number;     // inclusive (5, 10, 15, ...)
  events: MatchEvent[];
  isCurrent: boolean;    // true if currentMinute is in [bucketStart, bucketEnd]
}

const BUCKET_SIZE = 5;
const MAX_BUCKET_END = 90; // 18 buckets of 5 min: 0-5, 6-10, ..., 86-90

/**
 * LIVE-MATCH-F3-UI-LIVE FE3: vertical event timeline with 5-minute buckets
 * and a "AHORA" pulse marker on the bucket that contains the current match
 * minute. Renders a chip per event with color based on event type.
 *
 * <p>Inputs:
 * <ul>
 *   <li>{@code events} — list of {@link MatchEvent} from the live snapshot.</li>
 *   <li>{@code currentMinute} — integer 0-90 driving the "AHORA" marker and
 *       the auto-scroll target.</li>
 *   <li>{@code homeTeamId} / {@code awayTeamId} — used to color the chips
 *       on the appropriate side (home chip on the left rail, away chip on
 *       the right rail; central events like SUBSTITUTION span the rail).</li>
 *   <li>{@code teamNameMap} — id → display name lookup used for the "X' Team"
 *       event label.</li>
 * </ul>
 *
 * <p>A11y: the bucket container has {@code aria-live="polite"} so screen
 * readers announce new events.
 *
 * <p>Performance: with 90 minutes × 5-10 events per minute, the worst case
 * is ~900 DOM nodes. Per the F3 prompt, virtual scrolling is YAGNI — we
 * fall back to {@code cdk-virtual-scroll} only if Playwright shows visible
 * lag (R5).
 */
@Component({
  selector: 'app-live-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-timeline.component.html',
  styleUrls: ['./live-timeline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveTimelineComponent {

  /** All events seen so far in the live match. */
  private _events = signal<MatchEvent[]>([]);
  @Input({ required: true })
  set events(value: MatchEvent[]) {
    this._events.set(value ?? []);
  }

  /** Current match minute (0-90) — drives the "AHORA" marker. */
  private _currentMinute = signal<number>(0);
  @Input()
  set currentMinute(value: number) {
    this._currentMinute.set(value ?? 0);
  }

  @Input() homeTeamId: string = '';
  @Input() awayTeamId: string = '';
  @Input() teamNameMap: { [id: string]: string } = {};

  /**
   * Computed signal: 18 buckets of 5 minutes, each carrying its events and
   * the isCurrent flag. Re-computed when events or currentMinute change;
   * OnPush + computed signal keeps the DOM diff minimal.
   */
  readonly buckets = computed<TimelineBucket[]>(() => {
    const events = this._events();
    const cur = Math.max(0, Math.min(MAX_BUCKET_END, this._currentMinute()));
    const curBucketStart = Math.floor(cur / BUCKET_SIZE) * BUCKET_SIZE;

    const result: TimelineBucket[] = [];
    for (let start = 0; start <= MAX_BUCKET_END; start += BUCKET_SIZE) {
      const end = Math.min(start + BUCKET_SIZE - 1, MAX_BUCKET_END);
      const bucketEvents = events.filter(e => {
        const m = Math.max(0, e.minute ?? 0);
        return m >= start && m <= end;
      });
      result.push({
        bucketStart: start,
        bucketEnd: end,
        events: bucketEvents,
        isCurrent: cur >= start && cur <= end
      });
    }
    return result;
  });

  /** Bucket label e.g. "Min 0-5" or "Min 86-90" (last bucket). */
  bucketLabel(b: TimelineBucket): string {
    if (b.bucketStart === 0) {
      return `Min 0-${b.bucketEnd}`;
    }
    if (b.bucketEnd === MAX_BUCKET_END) {
      return `Min ${b.bucketStart}-${MAX_BUCKET_END}`;
    }
    return `Min ${b.bucketStart}-${b.bucketEnd}`;
  }

  /** Returns the CSS class for the chip color based on event type. */
  eventChipClass(e: MatchEvent): string {
    const t = (e.eventType || '').toUpperCase();
    if (t === 'GOAL') return 'chip chip-goal';
    if (t === 'YELLOW_CARD' || t === 'RED_CARD' || t === 'CARD') {
      return t === 'RED_CARD' ? 'chip chip-card-red' : 'chip chip-card-yellow';
    }
    if (t === 'INJURY') return 'chip chip-injury';
    if (t === 'SUBSTITUTION') return 'chip chip-substitution';
    if (t === 'TACTICAL_CHANGE') return 'chip chip-tactical';
    return 'chip chip-default';
  }

  /** Returns 'home' | 'away' | 'center' for the chip's rail side. */
  eventSide(e: MatchEvent): 'home' | 'away' | 'center' {
    // For events with a teamId, push to the right rail (away side).
    if (e.eventType === 'SUBSTITUTION' || e.eventType === 'TACTICAL_CHANGE') {
      return 'center';
    }
    if (e.teamId && this.awayTeamId && e.teamId === this.awayTeamId) {
      return 'away';
    }
    return 'home';
  }

  /** Tooltip text for an event chip. */
  eventTooltip(e: MatchEvent): string {
    const t = (e.eventType || '').toUpperCase();
    const m = `${e.minute}'`;
    if (t === 'SUBSTITUTION' && e.playerOnName) {
      return `${m} ? sali? ${e.playerName || '?'}, entr? ${e.playerOnName}`;
    }
    if (t === 'SUBSTITUTION') {
      return `${m} ? sustituci?n: ${e.playerName || '?'} ? ${e.playerOnName || '?'}`;
    }
    return `${m} ${e.playerName || ''} ? ${this.displayEventDescription(e)}`;
  }

  eventLabel(e: MatchEvent): string {
    return e.playerName || this.displayEventDescription(e);
  }

  private displayEventDescription(e: MatchEvent): string {
    const description = e.description || '';
    const playerName = e.playerName || 'Jugador';

    if (e.eventType === 'SUBSTITUTION') {
      const match = description.match(/^Substitution:\s+(.+?)\s+on for\s+(.+)$/i);
      if (match) return `Cambio: entra ${match[1]}, sale ${match[2]}`;
      return 'Cambio realizado';
    }

    if (e.eventType === 'INJURY') return `${playerName} se lesion?`;
    if (description === 'Shot saved') return 'Remate atajado';
    if (description === 'Shot missed') return 'Remate desviado';
    if (description === 'Goal') return 'Gol';

    const formationMatch = description.match(/^Formation changed from (.+?) to (.+?)(?: \| pixels: (.*))?$/i);
    if (formationMatch) return `Cambio t?ctico: ${formationMatch[1]} ? ${formationMatch[2]}`;

    return description || e.eventType || 'Evento';
  }

  /** Returns the icon glyph for an event type. */
  eventIcon(type: string | undefined): string {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'GOAL':           return '?';
      case 'YELLOW_CARD':
      case 'CARD':           return '??';
      case 'RED_CARD':       return '??';
      case 'INJURY':         return '??';
      case 'SUBSTITUTION':   return '??';
      case 'TACTICAL_CHANGE':return '??';
      case 'CORNER':         return '??';
      case 'OFFSIDE':        return '??';
      default:               return '?';
    }
  }

  /** trackBy for the *ngFor on buckets — by bucket start. */
  trackByBucket = (_idx: number, b: TimelineBucket) => b.bucketStart;

  /** trackBy for the *ngFor on events — by minute + type + name. */
  trackByEventMinute = (_idx: number, e: MatchEvent) =>
    `${e.minute}|${e.eventType}|${e.playerName}|${e.playerOnName || ''}`;
}
