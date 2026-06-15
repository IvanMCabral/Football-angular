import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { CareerService } from '../../../core/services/career.service';
import { CareerStatus } from '../../../core/services/career.model';
import { Match } from '../../../shared/models/match.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent, ErrorMessageComponent],
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit {
  private matchService = inject(MatchService);
  private careerService = inject(CareerService);

  matches: Match[] = [];
  careerStatus: CareerStatus | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadCareerStatus();
    this.loadMatches();
  }

  loadCareerStatus(): void {
    this.careerService.getCareerStatus().pipe(
      catchError(() => of(null))
    ).subscribe(status => {
      this.careerStatus = status;
    });
  }

  loadMatches(): void {
    this.loading = true;
    this.errorMessage = '';

    this.matchService.getMatches().subscribe({
      next: (matches) => {
        this.matches = matches;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load matches';
        this.loading = false;
      }
    });
  }

  hasCareer(): boolean {
    return !!(this.careerStatus && this.careerStatus.careerId);
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
}
