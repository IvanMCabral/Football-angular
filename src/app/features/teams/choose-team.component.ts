import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { TeamService } from './services/team.service';
import { Team } from '../../shared/models/team.model';
import { catchError, EMPTY, finalize, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientHttpDiagnosticsPanelComponent } from '../../core/observability/client-http-diagnostics-panel.component';
import { ClientHttpDiagnosticsService } from '../../core/observability/client-http-diagnostics.service';
import { environment } from '../../environments/environment';

type ChooseTeamOption = Team;

@Component({
  selector: 'app-choose-team',
  standalone: true,
  imports: [CommonModule, ClientHttpDiagnosticsPanelComponent],
  templateUrl: './choose-team.component.html',
  styleUrls: ['./choose-team.component.css']
})
export class ChooseTeamComponent implements OnInit {
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private logger = inject(AppLoggerService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private clientDiagnostics = inject(ClientHttpDiagnosticsService);

  teams: ChooseTeamOption[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  selectedTeam: ChooseTeamOption | null = null;
  saving = false;
  readonly showClientHttpDiagnostics = environment.enableClientHttpDiagnostics === true;

  ngOnInit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.getUserInfo().pipe(
      // The current user is a one-shot prerequisite, even if its provider is
      // backed by a long-lived auth stream.
      take(1),
      switchMap(userInfo => this.teamService.getAllTeams(userInfo.id).pipe(
        // Scope loading to the actual teams request, not to the auth source.
        finalize(() => this.loading = false)
      )),
      catchError(err => {
        this.logger.error('[CHOOSE TEAM] Error al cargar equipos:', err);
        this.errorMessage = 'No se pudieron cargar los equipos.';
        this.loading = false;
        return EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (teams: ChooseTeamOption[]) => {
        this.clientDiagnostics.recordChooseTeamNext();
        this.teams = teams;
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
