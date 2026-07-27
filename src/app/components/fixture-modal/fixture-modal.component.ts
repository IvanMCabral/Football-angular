import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { readableErrorMessage } from 'app/shared/utils/error-message';

interface CompleteFixture {
  careerId: string;
  currentRound: number;
  totalRounds: number;
  divisions: DivisionFixture[];
  freeTeams: FreeTeamInfo[];
}

interface FreeTeamInfo {
  id: string;
  name: string;
}

interface DivisionFixture {
  divisionId: string;
  divisionName: string;
  isUserDivision: boolean;
  rounds: RoundFixture[];
}

interface RoundFixture {
  round: number;
  hasBye: boolean;
  byeTeam?: string | null;
  matches: MatchFixture[];
}

interface MatchFixture {
  matchId: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  status: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

@Component({
  selector: 'app-fixture-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTabsModule],
  templateUrl: './fixture-modal.component.html',
  styleUrls: ['./fixture-modal.component.css']
})
export class FixtureModalComponent implements OnInit {
  loading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);
  divisions$!: Observable<DivisionFixture[]>;
  selectedTabIndex$ = new BehaviorSubject<number>(0);
  freeTeams: FreeTeamInfo[] = [];

  totalRounds: number = 0;
  currentRound: number = 1;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { careerId?: string },
    private dialogRef: MatDialogRef<FixtureModalComponent>,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAllFixtures();
  }

  loadAllFixtures(): void {
    this.loading$.next(true);
    this.error$.next(null);

    const url = `${environment.apiUrl}/career/fixtures/complete`;

    this.http.get<CompleteFixture>(url).subscribe({
      next: (data: CompleteFixture) => {
        this.totalRounds = data.totalRounds || 0;
        this.currentRound = data.currentRound || 1;
        this.freeTeams = data.freeTeams || [];

        const userDivIndex = data.divisions.findIndex((d: DivisionFixture) => d.isUserDivision);
        this.selectedTabIndex$.next(userDivIndex >= 0 ? userDivIndex : 0);

        this.loading$.next(false);
        this.divisions$ = of(data.divisions);
      },
      error: (err: unknown) => {
        this.error$.next('Error al cargar fixtures: ' + readableErrorMessage(err));
        this.loading$.next(false);
        this.divisions$ = of([]);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'status-COMPLETED';
      case 'IN_PROGRESS': return 'status-IN_PROGRESS';
      case 'PENDING': return 'status-PENDING';
      default: return 'status-PENDING';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'Finalizado';
      case 'IN_PROGRESS': return 'En Vivo';
      case 'PENDING': return 'Por Jugar';
      default: return status;
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
