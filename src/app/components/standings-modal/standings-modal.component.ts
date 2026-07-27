import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, Observable } from 'rxjs';
import { CareerService } from 'app/core/services/career.service';
import { DivisionStandings } from 'app/core/services/career.model';

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const nested = (error as { error?: { message?: string } }).error;
    if (nested?.message) { return nested.message; }
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return error instanceof Error ? error.message : String(error);
}

@Component({
  selector: 'app-standings-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTabsModule, MatTableModule],
  templateUrl: './standings-modal.component.html',
  styleUrls: ['./standings-modal.component.css']
})
export class StandingsModalComponent implements OnInit {
  /**
   * Number of teams highlighted in the promotion/relegation zones.
   * Keep this aligned with the backend promotion/relegation rules.
   */
  readonly TEAMS_PROMOTED_OR_RELEGATED = 3;

  loading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);
  divisions$!: Observable<DivisionStandings[]>;
  selectedTabIndex$ = new BehaviorSubject<number>(0);

  userTeamId: string = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { userTeamId?: string },
    private dialogRef: MatDialogRef<StandingsModalComponent>,
    private careerService: CareerService
  ) {
    if (data.userTeamId) {
      this.userTeamId = data.userTeamId;
    }
  }

  ngOnInit(): void {
    this.loadStandings();
  }

  loadStandings(): void {
    this.loading$.next(true);
    this.error$.next(null);

    this.careerService.getAllStandings().subscribe({
      next: (response) => {
        // Extract divisions from response object
        const divisions = response.divisions || [];
        // Find user's division index to select it by default
        const userDivIndex = divisions.findIndex((d: DivisionStandings) => d.isUserDivision);
        this.selectedTabIndex$.next(userDivIndex >= 0 ? userDivIndex : 0);

        this.loading$.next(false);
        this.divisions$ = new BehaviorSubject(divisions).asObservable();
      },
      error: (err: unknown) => {
        this.error$.next('Error al cargar tablas de posiciones: ' + errorMessage(err));
        this.loading$.next(false);
        this.divisions$ = new BehaviorSubject<DivisionStandings[]>([]).asObservable();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
