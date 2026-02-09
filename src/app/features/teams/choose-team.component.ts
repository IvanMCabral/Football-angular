import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from './services/team.service';

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
  private router = inject(Router);
  teams: any[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  selectedTeam: any = null;
  saving = false;

  ngOnInit(): void {
    this.teamService.getAllTeams().subscribe({
      next: (teams: any[]) => {
        if (Array.isArray(teams)) {
          this.teams = teams;
        } else {
          this.teams = [];
        }
        this.loading = false;
        if (!teams || teams.length === 0) {
          this.errorMessage = 'No hay equipos disponibles.';
        }
      },
      error: (err) => {
        console.error('[CHOOSE TEAM] Error al cargar equipos:', err);
        this.errorMessage = 'No se pudieron cargar los equipos.';
        this.loading = false;
      }
    });
  }

  chooseTeam(team: any) {
    this.selectedTeam = team;
  }

  assignTeam() {
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
        console.error('[CHOOSE TEAM] Error en asignación:', err);
      }
    });
  }
}
