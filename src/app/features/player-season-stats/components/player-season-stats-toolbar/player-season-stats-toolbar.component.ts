import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LimitOption, LIMIT_OPTIONS } from '../../models/player-season-stats.model';

@Component({
  selector: 'app-player-season-stats-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-season-stats-toolbar.component.html',
  styleUrls: ['./player-season-stats-toolbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerSeasonStatsToolbarComponent {
  /** Current limit value */
  @Input() limit: LimitOption = 50;
  /** Current sort field */
  @Input() sortBy: string = 'goals';
  /** Current sort order */
  @Input() order: string = 'desc';

  /** Emit when limit changes */
  @Output() limitChange = new EventEmitter<LimitOption>();

  limitOptions: readonly (LimitOption)[] = LIMIT_OPTIONS;

  onLimitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newLimit = Number(select.value) as LimitOption;
    this.limitChange.emit(newLimit);
  }
}