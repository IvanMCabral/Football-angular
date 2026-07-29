import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateReason = 'feature-disabled' | 'no-data' | 'player-not-found' | 'api-error';

@Component({
  selector: 'app-player-season-stats-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-season-stats-empty-state.component.html',
  styleUrls: ['./player-season-stats-empty-state.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerSeasonStatsEmptyStateComponent {
  /** Reason for empty state */
  @Input() reason: EmptyStateReason = 'no-data';

  get title(): string {
    switch (this.reason) {
      case 'feature-disabled':
        return 'Season stats are not available yet';
      case 'no-data':
        return 'No season stats available yet';
      case 'player-not-found':
        return 'Player stats not found';
      case 'api-error':
        return 'Unable to load season stats';
    }
  }

  get message(): string {
    switch (this.reason) {
      case 'feature-disabled':
        return 'Play matches with detalle de partido habilitado to start collecting data.';
      case 'no-data':
        return 'Play matches with guardado de detalle de partido habilitado to generate stats.';
      case 'player-not-found':
        return 'This player has no recorded stats for this season.';
      case 'api-error':
        return 'Something went wrong. Please try again.';
    }
  }

  get showRetry(): boolean {
    return this.reason === 'api-error';
  }

  get icon(): string {
    switch (this.reason) {
      case 'feature-disabled':
        return '⚠';
      case 'no-data':
        return '📊';
      case 'player-not-found':
        return '❓';
      case 'api-error':
        return '⚠';
    }
  }
}