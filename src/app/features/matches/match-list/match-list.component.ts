import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { CareerService } from '../../../core/services/career.service';
import { CareerStatus } from '../../../core/services/career.model';
import { Match } from '../../../shared/models/match.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';

/**
 * V25D77-C42 F1: list of matches for the current user.
 *
 * <p>V25D77-C42 change: switched to OnPush + a single view-state
 * {@link BehaviorSubject} consumed via the {@code async} pipe. The previous
 * default-CD + direct-subscribe pattern would, in some route-reuse /
 * zone-event-ordering edge cases, leave the {@code @if/@else if} branches
 * stuck on the initial {@code loading=true} spinner even after the http
 * response had populated {@code matches} and {@code loading=false}. With
 * OnPush the async pipe drives change detection directly (it calls
 * {@code markForCheck} on every emission), so the DOM always reflects the
 * latest state on every navigation. This brings the component in line with
 * the rest of the codebase (see {@code MatchLiveComponent}, which has been
 * OnPush + async pipe since LIVE-MATCH-F3-UI-LIVE FE2).
 */
interface MatchListViewState {
  loading: boolean;
  errorMessage: string;
  matches: Match[];
  careerStatus: CareerStatus | null;
}

const EMPTY_STATE: MatchListViewState = {
  loading: false,
  errorMessage: '',
  matches: [],
  careerStatus: null
};

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, LoadingSpinnerComponent, ErrorMessageComponent],
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css'],
  // V25D77-C42 F1: OnPush forces the async pipe to be the single source of CD
  // triggers. See class doc.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchListComponent implements OnInit {
  private matchService = inject(MatchService);
  private careerService = inject(CareerService);

  // V25D77-C42 F1: single BehaviorSubject holds the entire view state. A
  // single async pipe in the template drives the whole @if/@else tree.
  private readonly viewStateSubject = new BehaviorSubject<MatchListViewState>(EMPTY_STATE);
  readonly viewState$ = this.viewStateSubject.asObservable();

  ngOnInit(): void {
    this.loadCareerStatus();
    this.loadMatches();
  }

  private loadCareerStatus(): void {
    this.careerService.getCareerStatus().pipe(
      catchError(() => of(null))
    ).subscribe(status => this.patchState({ careerStatus: status }));
  }

  loadMatches(): void {
    this.patchState({ loading: true, errorMessage: '' });

    this.matchService.getMatches().subscribe({
      next: (matches) => this.patchState({ matches, loading: false }),
      error: (error) => this.patchState({
        errorMessage: error.message || 'Failed to load matches',
        loading: false
      })
    });
  }

  /**
   * V25D77-C42 F1: pure helper kept on the component for the template.
   * Reads the latest careerStatus out of the view state.
   */
  hasCareer(state: MatchListViewState): boolean {
    return !!(state.careerStatus && state.careerStatus.careerId);
  }

  formatStatus(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private patchState(partial: Partial<MatchListViewState>): void {
    this.viewStateSubject.next({ ...this.viewStateSubject.value, ...partial });
  }
}
