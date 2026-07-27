import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { TeamService } from '../services/team.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppLoggerService } from '../../../core/services/app-logger.service';
import { SessionTeam } from '../../../shared/models/team.model';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.css']
})
export class TeamListComponent implements OnInit {
  private teamService = inject(TeamService);
  private toastService = inject(ToastService);
  private logger = inject(AppLoggerService);

  sessionTeams$: Observable<SessionTeam[]> = this.teamService.sessionTeams$;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadSessionTeams();
  }

  loadSessionTeams(): void {
    this.loading = true;
    this.errorMessage = '';

    this.teamService.getSessionTeams().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.logger.error('[TEAM LIST] Error loading session teams:', err);
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error loading teams';
      }
    });
  }

  deleteTeam(team: SessionTeam): void {
    this.teamService.deleteSessionTeam(team.sessionTeamId).subscribe({
      next: () => {
        this.toastService.success(`Equipo "${team.name}" eliminado`);
      },
      error: (err) => {
        this.logger.error('[TEAM LIST] Error deleting team:', err);
        this.toastService.error('Error al eliminar el equipo');
      }
    });
  }

  getOriginLabel(origin: string): string {
    switch (origin) {
      case 'CLONED': return 'Clonado';
      case 'CUSTOM': return 'Custom';
      case 'RANDOM': return 'Random';
      default: return origin;
    }
  }

  formatBudget(budget: number): string {
    if (budget >= 1000000000) {
      return `${(budget / 1000000000).toFixed(1)}B €`;
    }
    if (budget >= 1000000) {
      return `${(budget / 1000000).toFixed(1)}M €`;
    }
    if (budget >= 1000) {
      return `${(budget / 1000).toFixed(1)}K €`;
    }
    return `${budget} €`;
  }
}
