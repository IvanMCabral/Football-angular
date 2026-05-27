import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-season-stats-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-season-stats-pagination.component.html',
  styleUrls: ['./player-season-stats-pagination.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerSeasonStatsPaginationComponent {
  /** Current offset from metadata */
  @Input() offset: number = 0;
  /** Current limit from metadata */
  @Input() limit: number = 50;
  /** Whether there are more players after this page */
  @Input() hasMore: boolean = false;
  /** Total players count from metadata */
  @Input() totalPlayers: number = 0;
  /** Returned players in current response */
  @Input() returnedPlayers: number = 0;

  /** Emit when user clicks Previous */
  @Output() previous = new EventEmitter<void>();
  /** Emit when user clicks Next */
  @Output() next = new EventEmitter<void>();

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get totalPages(): number {
    if (this.totalPlayers === 0 || this.limit === 0) {
      return 1;
    }
    return Math.ceil(this.totalPlayers / this.limit);
  }

  get canGoPrevious(): boolean {
    return this.offset > 0;
  }

  get canGoNext(): boolean {
    return this.hasMore;
  }

  get showingText(): string {
    const start = this.offset + 1;
    const end = this.offset + this.returnedPlayers;
    return `Showing ${start}–${end} of ${this.totalPlayers}`;
  }

  onPrevious(): void {
    if (this.canGoPrevious) {
      this.previous.emit();
    }
  }

  onNext(): void {
    if (this.canGoNext) {
      this.next.emit();
    }
  }
}