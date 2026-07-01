import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { CareerService } from 'app/core/services/career.service';
import { CareerStatus, DivisionStandings } from 'app/core/services/career.model';

/**
 * V25D78-C55.2 phase 4 UI (b2): standalone {@code /standings} page.
 *
 * <p>Renders the same 3-tab PRIMERA/SEGUNDA/TERCERA standings view as
 * {@link StandingsModalComponent} but as a full page reachable from the
 * dashboard / navigation. The existing modal stays available for the
 * in-squad entry point (kept for compat); this page is the canonical
 * place to land when a user wants to inspect all 3 divisions at once.
 *
 * <p>Reuses {@link CareerService.getAllStandings()} (already in place for the
 * modal) and the same {@link DivisionStandings} / {@link CareerStatus} types.
 *
 * <p>(c2) green/red promotion/relegation zone indicator: top-3 rows of each
 * division are tinted green (ascend), bottom-3 rows tinted red (descend).
 * Constant mirrored from the modal so behavior stays consistent.
 */
@Component({
  selector: 'app-standings-page',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './standings-page.component.html',
  styleUrls: ['./standings-page.component.css']
})
export class StandingsPageComponent implements OnInit {
  /** V25D78-C55.2 phase 4 UI (c2): top-3 ascend / bottom-3 descend. */
  readonly TEAMS_PROMOTED_OR_RELEGATED = 3;

  loading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);
  divisions$!: Observable<DivisionStandings[]>;
  selectedTabIndex$ = new BehaviorSubject<number>(0);
  userDivision: string | null = null;
  userTeamId: string | null = null;

  constructor(private careerService: CareerService) {}

  ngOnInit(): void {
    // Read the user's division + teamId from /career/status so the page header
    // can render a prominent badge and the row highlighter can locate the user's
    // team even before the standings data lands.
    this.careerService.getCareerStatus().subscribe({
      next: (status: CareerStatus | null) => {
        if (status) {
          this.userTeamId = status.userTeamId;
          if (status.userDivision) {
            this.userDivision = status.userDivision;
          }
        }
      },
      error: () => { /* legacy backend may not expose userDivision; safe to ignore */ }
    });
    this.loadStandings();
  }

  loadStandings(): void {
    this.loading$.next(true);
    this.error$.next(null);

    this.careerService.getAllStandings().subscribe({
      next: (response) => {
        const divisions = response.divisions || [];
        const userDivIndex = divisions.findIndex(
          (d: DivisionStandings) => d.isUserDivision
        );
        this.selectedTabIndex$.next(userDivIndex >= 0 ? userDivIndex : 0);
        this.loading$.next(false);
        this.divisions$ = new BehaviorSubject(divisions).asObservable();
      },
      error: (err: any) => {
        this.error$.next('Error al cargar tablas de posiciones: ' + (err?.message ?? err));
        this.loading$.next(false);
        this.divisions$ = new BehaviorSubject<DivisionStandings[]>([]).asObservable();
      }
    });
  }

  /**
   * C55.10 Item 1 — tier-real badge: same contract as the dashboard pill.
   * Maps {@code careerStatus.userDivision} (literal label from the backend)
   * to one of the existing tier-* CSS classes, with {@code 'tier-default'}
   * as the fallback for tiers the codebase didn't previously style
   * (CUARTA, QUINTA, SEXTA, …).
   */
  tierCssClass(userDivision: string | null | undefined): string {
    if (userDivision === 'PRIMERA') return 'tier-primera';
    if (userDivision === 'SEGUNDA') return 'tier-segunda';
    if (userDivision === 'TERCERA') return 'tier-tercera';
    return 'tier-default';
  }
}