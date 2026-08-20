import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { TeamService } from './services/team.service';
import { Team } from '../../shared/models/team.model';
import { catchError, EMPTY, finalize, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientHttpDiagnosticsService } from '../../core/observability/client-http-diagnostics.service';
import { ProductionC10ProbeService } from '../../core/observability/production-c10-probe.service';

type ChooseTeamOption = Team;

@Component({
  selector: 'app-choose-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choose-team.component.prod.html',
  styleUrls: ['./choose-team.component.css']
})
export class ChooseTeamComponent implements AfterViewChecked, AfterViewInit, OnDestroy, OnInit {
  private static nextInstanceSeq = 1;
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private logger = inject(AppLoggerService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private clientDiagnostics = inject(ClientHttpDiagnosticsService);
  private productionC10Probe = inject(ProductionC10ProbeService);
  @ViewChildren('teamRow') private teamRows!: QueryList<unknown>;
  @ViewChild('productionC10ProbeSurface') private productionC10ProbeSurface?: ElementRef<HTMLElement>;

  teams: ChooseTeamOption[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  selectedTeam: ChooseTeamOption | null = null;
  saving = false;
  readonly showProductionC10Probe = this.productionC10Probe.enabled;
  readonly diagnosticInstanceSeq = ChooseTeamComponent.nextInstanceSeq++;
  private diagnosticRequestSeq: number | undefined;
  private diagnosticLoadingFalseRecorded = false;
  private diagnosticAfterRenderPending = false;
  private productionC10AfterRenderPending = false;
  private terminalNotificationSent = false;

  ngAfterViewInit(): void {
    if (this.productionC10ProbeSurface) {
      this.productionC10Probe.attachSurface(this.productionC10ProbeSurface.nativeElement);
    }
  }

  ngOnInit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.terminalNotificationSent = false;
    this.diagnosticLoadingFalseRecorded = false;
    this.authService.getUserInfo().pipe(
      take(1),
      switchMap(userInfo => this.teamService.getAllTeams(userInfo.id)),
      catchError(err => {
        this.logger.error('[CHOOSE TEAM] Error al cargar equipos:', err);
        this.errorMessage = 'No se pudieron cargar los equipos.';
        return EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.setLoadingFalse())
    ).subscribe({
      next: (teams: ChooseTeamOption[]) => {
        this.productionC10Probe.recordNextEnter(this.diagnosticInstanceSeq, teams.length);
        this.diagnosticRequestSeq = this.clientDiagnostics.recordChooseTeamNextEnter(
          this.diagnosticInstanceSeq,
          teams.length
        );
        this.teams = teams;
        this.productionC10Probe.recordTeamsAssigned(this.diagnosticInstanceSeq, this.teams.length);
        this.clientDiagnostics.recordChooseTeamTeamsAssigned(
          this.diagnosticInstanceSeq,
          this.diagnosticRequestSeq,
          this.teams.length
        );
        this.diagnosticAfterRenderPending = true;
        this.productionC10AfterRenderPending = true;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.diagnosticAfterRenderPending) {
      this.diagnosticAfterRenderPending = false;
      this.clientDiagnostics.recordChooseTeamAfterRender(
        this.diagnosticInstanceSeq,
        this.diagnosticRequestSeq,
        this.teamRows.length
      );
    }

    if (this.productionC10AfterRenderPending) {
      this.productionC10AfterRenderPending = false;
      this.productionC10Probe.recordAfterRender(this.diagnosticInstanceSeq, this.teamRows.length);
    }
  }

  ngOnDestroy(): void {
    this.productionC10Probe.recordInstanceDestroyed(this.diagnosticInstanceSeq);
    this.clientDiagnostics.recordChooseTeamInstanceDestroyed(
      this.diagnosticInstanceSeq,
      this.diagnosticRequestSeq ?? this.clientDiagnostics.currentRequestSeq()
    );
  }

  private setLoadingFalse(): void {
    if (this.terminalNotificationSent) {
      return;
    }

    this.terminalNotificationSent = true;
    this.loading = false;
    this.productionC10Probe.recordLoadingFalse(this.diagnosticInstanceSeq);
    if (!this.diagnosticLoadingFalseRecorded) {
      this.diagnosticLoadingFalseRecorded = true;
      this.clientDiagnostics.recordChooseTeamLoadingFalse(
        this.diagnosticInstanceSeq,
        this.diagnosticRequestSeq ?? this.clientDiagnostics.currentRequestSeq()
      );
    }
    this.changeDetectorRef.markForCheck();
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
