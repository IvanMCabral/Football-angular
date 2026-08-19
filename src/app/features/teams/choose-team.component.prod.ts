import { AfterViewChecked, Component, DestroyRef, OnDestroy, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { TeamService } from './services/team.service';
import { Team } from '../../shared/models/team.model';
import { catchError, EMPTY, finalize, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientHttpDiagnosticsService } from '../../core/observability/client-http-diagnostics.service';

type ChooseTeamOption = Team;

@Component({
  selector: 'app-choose-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choose-team.component.prod.html',
  styleUrls: ['./choose-team.component.css']
})
export class ChooseTeamComponent implements AfterViewChecked, OnDestroy, OnInit {
  private static nextInstanceSeq = 1;
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private logger = inject(AppLoggerService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private clientDiagnostics = inject(ClientHttpDiagnosticsService);
  @ViewChildren('teamRow') private teamRows!: QueryList<unknown>;

  teams: ChooseTeamOption[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  selectedTeam: ChooseTeamOption | null = null;
  saving = false;
  readonly diagnosticInstanceSeq = ChooseTeamComponent.nextInstanceSeq++;
  private diagnosticRequestSeq: number | undefined;
  private diagnosticLoadingFalseRecorded = false;
  private diagnosticAfterRenderPending = false;

  ngOnInit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.getUserInfo().pipe(
      take(1),
      switchMap(userInfo => this.teamService.getAllTeams(userInfo.id).pipe(
        finalize(() => this.setLoadingFalse())
      )),
      catchError(err => {
        this.logger.error('[CHOOSE TEAM] Error al cargar equipos:', err);
        this.errorMessage = 'No se pudieron cargar los equipos.';
        this.setLoadingFalse();
        return EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.setLoadingFalse())
    ).subscribe({
      next: (teams: ChooseTeamOption[]) => {
        this.diagnosticRequestSeq = this.clientDiagnostics.recordChooseTeamNextEnter(
          this.diagnosticInstanceSeq,
          teams.length
        );
        this.teams = teams;
        this.clientDiagnostics.recordChooseTeamTeamsAssigned(
          this.diagnosticInstanceSeq,
          this.diagnosticRequestSeq,
          this.teams.length
        );
        this.diagnosticAfterRenderPending = true;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (!this.diagnosticAfterRenderPending) {
      return;
    }

    this.diagnosticAfterRenderPending = false;
    this.clientDiagnostics.recordChooseTeamAfterRender(
      this.diagnosticInstanceSeq,
      this.diagnosticRequestSeq,
      this.teamRows.length
    );
  }

  ngOnDestroy(): void {
    this.clientDiagnostics.recordChooseTeamInstanceDestroyed(
      this.diagnosticInstanceSeq,
      this.diagnosticRequestSeq ?? this.clientDiagnostics.currentRequestSeq()
    );
  }

  private setLoadingFalse(): void {
    this.loading = false;
    if (this.diagnosticLoadingFalseRecorded) {
      return;
    }

    this.diagnosticLoadingFalseRecorded = true;
    this.clientDiagnostics.recordChooseTeamLoadingFalse(
      this.diagnosticInstanceSeq,
      this.diagnosticRequestSeq ?? this.clientDiagnostics.currentRequestSeq()
    );
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
