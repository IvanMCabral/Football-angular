import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerSeasonStatsWarning } from '../../models/player-season-stats.model';
import { translateWarnings, WarningDisplay } from '../../utils/player-season-stats-warnings';

@Component({
  selector: 'app-player-season-stats-warnings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-season-stats-warnings.component.html',
  styleUrls: ['./player-season-stats-warnings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerSeasonStatsWarningsComponent {
  /** Raw warnings from backend API response */
  @Input() warnings: PlayerSeasonStatsWarning[] | null | undefined = undefined;

  get displayWarnings(): WarningDisplay[] {
    if (!this.warnings || this.warnings.length === 0) {
      return [];
    }
    return translateWarnings(this.warnings);
  }

  get hasWarnings(): boolean {
    return this.displayWarnings.length > 0;
  }

  getWarningsByType(type: 'warning' | 'info'): WarningDisplay[] {
    return this.displayWarnings.filter(w => w.type === type);
  }

  get hasWarningSeverity(): boolean {
    return this.getWarningsByType('warning').length > 0;
  }

  get hasInfoSeverity(): boolean {
    return this.getWarningsByType('info').length > 0;
  }
}