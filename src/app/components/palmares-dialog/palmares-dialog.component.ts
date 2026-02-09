import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CareerService } from '../../core/services/career.service';
import { PalmaresEntry, TeamTitleCount, DivisionInfo } from '../../core/services/career.model';

@Component({
  selector: 'app-palmares-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatSelectModule, MatFormFieldModule, FormsModule],
  templateUrl: './palmares-dialog.component.html',
  styleUrls: ['./palmares-dialog.component.css']
})
export class PalmaresDialogComponent implements OnInit {
  activeTab: 'champions' | 'tops' = 'champions';
  divisions: DivisionInfo[] = [];
  selectedDivisionId: string | null = null;
  champions: PalmaresEntry[] = [];
  topTeams: TeamTitleCount[] = [];
  loadingChampions = false;
  loadingTops = false;

  private careerService = inject(CareerService);

  constructor(
    public dialogRef: MatDialogRef<PalmaresDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      userDivisionId: string | null;
      divisions: DivisionInfo[];
    }
  ) {
    this.divisions = data.divisions || [];
    this.selectedDivisionId = data.userDivisionId;
  }

  ngOnInit() {
    // If we already have divisions from data and a selected division, load data immediately
    if (this.divisions.length > 0 && this.selectedDivisionId) {
      this.loadData();
    }
    // Always refresh divisions from server
    this.loadDivisions();
  }

  private loadDivisions() {
    this.careerService.getDivisions().subscribe({
      next: (divisions) => {
        // Use server divisions, fallback to data.divisions if empty
        this.divisions = divisions.length > 0 ? divisions : this.divisions;
        if (this.divisions.length > 0 && !this.selectedDivisionId) {
          this.selectedDivisionId = this.divisions[0].divisionId;
        }
        if (this.selectedDivisionId) {
          this.loadData();
        }
      },
      error: (err) => {
        console.error('[PalmaresDialog] Error loading divisions:', err);
        // Fallback to data.divisions if available
        if (this.divisions.length > 0 && this.selectedDivisionId) {
          this.loadData();
        }
      }
    });
  }

  onDivisionChange() {
    this.loadData();
  }

  private loadData() {
    if (!this.selectedDivisionId) return;

    // Cargar campeones
    this.loadingChampions = true;
    this.careerService.getPalmaresByDivision(this.selectedDivisionId).subscribe({
      next: (champions) => {
        this.champions = champions.sort((a, b) => a.season - b.season);
        this.loadingChampions = false;
      },
      error: (err) => {
        console.error('[PalmaresDialog] Error loading champions:', err);
        this.loadingChampions = false;
      }
    });

    // Cargar TOPs históricos
    this.loadingTops = true;
    this.careerService.getTopTeamsByDivision(this.selectedDivisionId).subscribe({
      next: (tops) => {
        this.topTeams = tops;
        this.loadingTops = false;
      },
      error: (err) => {
        console.error('[PalmaresDialog] Error loading tops:', err);
        this.loadingTops = false;
      }
    });
  }
}
