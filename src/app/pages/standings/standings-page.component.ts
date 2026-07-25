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
 * Standalone standings page for inspecting all divisions at once.
 * It shares the same standings data contract as the modal version.
 */
@Component({
  selector: 'app-standings-page',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './standings-page.component.html',
  styleUrls: ['./standings-page.component.css']
})
export class StandingsPageComponent implements OnInit {
  /** Top and bottom rows marked as promotion/relegation zones. */
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

  tierCssClass(userDivision: string | null | undefined): string {
    if (userDivision === 'PRIMERA') return 'tier-primera';
    if (userDivision === 'SEGUNDA') return 'tier-segunda';
    if (userDivision === 'TERCERA') return 'tier-tercera';
    return 'tier-default';
  }
}
