import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CareerService } from '../../../core/services/career.service';
import { CareerStatus, Fixture } from '../../../core/services/career.model';
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
  rounds: MatchListRound[];
  careerStatus: CareerStatus | null;
}

interface MatchListRound {
  round: number;
  matches: MatchListFixture[];
  byeTeam: string | null;
}

interface MatchListFixture {
  matchId: string;
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

const EMPTY_STATE: MatchListViewState = {
  loading: false,
  errorMessage: '',
  rounds: [],
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

    this.careerService.getAllFixturesWithBye().subscribe({
      next: (response) => this.patchState({
        rounds: this.toMatchListRounds(response?.rounds ?? []),
        loading: false
      }),
      error: (error) => this.patchState({
        errorMessage: error.message || 'No se pudieron cargar los partidos de la carrera',
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

  hasFixtures(state: MatchListViewState): boolean {
    return state.rounds.some(round => round.matches.length > 0);
  }

  matchDetailLink(match: MatchListFixture, state: MatchListViewState): unknown[] {
    const careerId = state.careerStatus?.careerId;
    return careerId
      ? ['/careers', careerId, 'matches', match.matchId, 'detail']
      : ['/matches', match.matchId];
  }

  formatStatus(status: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'COMPLETED' || normalized === 'SIMULATED') return 'Completado';
    if (normalized === 'PENDING' || normalized === 'SCHEDULED') return 'Pendiente';
    if (normalized === 'SIMULATING') return 'En juego';
    if (normalized === 'CANCELLED') return 'Cancelado';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  statusCss(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'completed') return 'simulated';
    if (normalized === 'pending') return 'scheduled';
    return normalized;
  }

  isCompleted(match: MatchListFixture): boolean {
    return ['COMPLETED', 'SIMULATED'].includes(match.status.toUpperCase());
  }

  hasResult(match: MatchListFixture): boolean {
    return match.homeGoals !== null && match.awayGoals !== null;
  }

  private toMatchListRounds(rounds: Array<{ round: number; matches: Fixture[]; byeTeam: string | null }>): MatchListRound[] {
    return rounds
      .map(round => ({
        round: Number(round.round),
        byeTeam: round.byeTeam ?? null,
        matches: (round.matches ?? [])
          .map(match => this.toMatchListFixture(match, Number(round.round)))
          .filter((match): match is MatchListFixture => !!match)
      }))
      .filter(round => Number.isFinite(round.round))
      .sort((a, b) => a.round - b.round);
  }

  private toMatchListFixture(match: Fixture, fallbackRound: number): MatchListFixture | null {
    if (!match?.matchId) return null;

    return {
      matchId: String(match.matchId),
      round: Number(match.round ?? fallbackRound),
      homeTeamName: match.homeTeamName || match.homeTeamId || 'Local',
      awayTeamName: match.awayTeamName || match.awayTeamId || 'Visitante',
      status: match.status || 'PENDING',
      homeGoals: match.homeGoals ?? null,
      awayGoals: match.awayGoals ?? null
    };
  }

  private patchState(partial: Partial<MatchListViewState>): void {
    this.viewStateSubject.next({ ...this.viewStateSubject.value, ...partial });
  }
}
