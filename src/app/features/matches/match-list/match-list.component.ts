import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchService } from '../services/match.service';
import { TeamService } from '../../teams/services/team.service';
import { Match } from '../../../shared/models/match.model';
import { Team } from '../../../shared/models/team.model';
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
  private teamService = inject(TeamService);

  matches: Match[] = [];
  teams: Map<string, string> = new Map();
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadMatches();
  }

  loadMatches(): void {
    this.loading = true;
    this.errorMessage = '';

    this.matchService.getMatches().subscribe({
      next: (matches) => {
        this.matches = matches;
        this.loadTeamNames();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load matches';
        this.loading = false;
      }
    });
  }

  loadTeamNames(): void {
    this.teamService.getAllTeams().subscribe({
      next: (teams: Team[]) => {
        teams.forEach((team: Team) => {
          this.teams.set(team.id, team.name);
        });
      },
      error: () => {}
    });
  }

  getTeamName(teamId: string): string {
    return this.teams.get(teamId) || 'Team';
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
