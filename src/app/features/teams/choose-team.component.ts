import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { TeamService } from './services/team.service';
import { Team } from '../../shared/models/team.model';
import { finalize, switchMap } from 'rxjs';

type ChooseTeamOption = Team;

@Component({
  selector: 'app-choose-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choose-team.component.html',
  styleUrls: ['./choose-team.component.css']
})
export class ChooseTeamComponent implements OnInit {
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private logger = inject(AppLoggerService);
  private router = inject(Router);

  teams: ChooseTeamOption[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  selectedTeam: ChooseTeamOption | null = null;
  saving = false;

  ngOnInit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.getUserInfo().pipe(
      switchMap(userInfo => this.teamService.getAllTeams(userInfo.id)),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (teams: ChooseTeamOption[]) => {
        this.teams = teams;
      },
      error: (err) => {
        this.logger.error('[CHOOSE TEAM] Error al cargar equipos:', err);
        this.errorMessage = 'No se pudieron cargar los equipos.';
      }
    });
  }

  chooseTeam(team: ChooseTeamOption): void {
    this.selectedTeam = team;
  }

  assignTeam(): void {
    if (!this.selectedTeam) return;
    this.saving = true;
    this.authService.assignTeamToUser(this.selectedTeam.id).subscribe({
      next: () => {
        this.successMessage = '¡Equipo asignado correctamente!';
        this.saving = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = 'No se pudo asignar el equipo.';
        this.saving = false;
        this.logger.error('[CHOOSE TEAM] Error en asignación:', err);
      }
    });
  }
}
