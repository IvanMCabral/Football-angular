import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerSeasonStatsMetadata } from '../../models/player-season-stats.model';

@Component({
  selector: 'app-player-season-stats-info-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-season-stats-info-bar.component.html',
  styleUrls: ['./player-season-stats-info-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerSeasonStatsInfoBarComponent {
  /** Response metadata */
  @Input() metadata: PlayerSeasonStatsMetadata | null | undefined = null;
  /** Fallback player count when metadata is unavailable */
  @Input() fallbackPlayerCount: number = 0;

  get updatedRoundText(): string {
    if (!this.metadata) {
      return '';
    }
    if (this.metadata.lastUpdatedRound != null) {
      return `Stats updated through round ${this.metadata.lastUpdatedRound}`;
    }
    return 'Season stats loaded';
  }

  get showingText(): string {
    if (this.metadata) {
      return `Showing ${this.metadata.returnedPlayers} of ${this.metadata.totalPlayers} players`;
    }
    return `Showing ${this.fallbackPlayerCount} players`;
  }

  get completenessText(): string {
    if (!this.metadata) {
      return '';
    }
    switch (this.metadata.dataCompleteness) {
      case 'PARTIAL':
        return 'Incomplete data';
      case 'UNKNOWN':
        return 'Data completeness unknown';
      default:
        return '';
    }
  }

  get hasCompletenessIndicator(): boolean {
    return this.completenessText !== '';
  }

  get tooltipText(): string {
    if (!this.metadata?.generatedAt) {
      return '';
    }
    return `Generated: ${this.metadata.generatedAt}`;
  }
}