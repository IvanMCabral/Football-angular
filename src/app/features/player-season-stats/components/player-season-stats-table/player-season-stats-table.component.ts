import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerSeasonStatsDto, SortField, SortOrder } from '../../models/player-season-stats.model';

interface ColumnDef {
  key: keyof PlayerSeasonStatsDto | 'playerName';
  label: string;
  sortable: boolean;
  align: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-player-season-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-season-stats-table.component.html',
  styleUrls: ['./player-season-stats-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerSeasonStatsTableComponent {
  /** Current list of players */
  @Input() players: PlayerSeasonStatsDto[] = [];
  /** Current sort field */
  @Input() sortBy: SortField = 'goals';
  /** Current sort order */
  @Input() order: SortOrder = 'desc';

  /** Emit when user clicks a column header to sort */
  @Output() sortChange = new EventEmitter<{ sortBy: SortField; order: SortOrder }>();

  columns: ColumnDef[] = [
    { key: 'playerName', label: 'Player', sortable: true, align: 'left' },
    { key: 'position', label: 'Pos', sortable: false, align: 'center' },
    { key: 'appearances', label: 'Apps', sortable: true, align: 'right' },
    { key: 'starts', label: 'Starts', sortable: true, align: 'right' },
    { key: 'goals', label: 'Goals', sortable: true, align: 'right' },
    { key: 'assists', label: 'Assists', sortable: true, align: 'right' },
    { key: 'averageRating', label: 'Avg Rtg', sortable: true, align: 'right' },
    { key: 'shots', label: 'Shots', sortable: true, align: 'right' },
    { key: 'keyPasses', label: 'KP', sortable: true, align: 'right' },
    { key: 'yellowCards', label: 'YC', sortable: true, align: 'right' },
    { key: 'redCards', label: 'RC', sortable: true, align: 'right' },
    { key: 'injuries', label: 'Inj', sortable: true, align: 'right' },
    { key: 'fouls', label: 'Fouls', sortable: true, align: 'right' },
  ];

  getValue(player: PlayerSeasonStatsDto, key: string): string | number {
    if (key === 'playerName') {
      return player.playerName;
    }
    const value = player[key as keyof PlayerSeasonStatsDto];
    if (typeof value === 'number' && key === 'averageRating') {
      return value.toFixed(1);
    }
    return value;
  }

  getSortIcon(column: ColumnDef): string {
    if (!column.sortable) {
      return '';
    }
    if (this.sortBy === column.key) {
      return this.order === 'asc' ? '▲' : '▼';
    }
    return '';
  }

  getSortClass(column: ColumnDef): string {
    if (!column.sortable) {
      return '';
    }
    if (this.sortBy === column.key) {
      return 'sort-active';
    }
    return 'sort-available';
  }

  onHeaderClick(column: ColumnDef): void {
    if (!column.sortable) {
      return;
    }

    const field = column.key as SortField;
    if (this.sortBy === field) {
      // Toggle order on same field
      const newOrder: SortOrder = this.order === 'asc' ? 'desc' : 'asc';
      this.sortChange.emit({ sortBy: field, order: newOrder });
    } else {
      // New field defaults to desc (except playerName defaults to asc)
      const newOrder: SortOrder = field === 'playerName' ? 'asc' : 'desc';
      this.sortChange.emit({ sortBy: field, order: newOrder });
    }
  }
}