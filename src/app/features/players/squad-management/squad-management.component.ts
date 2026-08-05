import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, forkJoin, of, switchMap, map, tap, catchError, shareReplay, BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { startWith, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FixtureService } from 'app/core/services/fixture.service';
import { AppLoggerService } from 'app/core/services/app-logger.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FixtureModalComponent } from 'app/components/fixture-modal/fixture-modal.component';
import { StandingsModalComponent } from 'app/components/standings-modal/standings-modal.component';
import { PalmaresDialogComponent } from 'app/components/palmares-dialog/palmares-dialog.component';
import { PromotionsDialogComponent } from 'app/components/promotions-dialog/promotions-dialog.component';
import { PromotionResult, CareerStatus, DivisionInfo } from 'app/core/services/career.model';
import { CareerStatusBarComponent } from 'app/shared/components/career-status-bar/career-status-bar.component';
import { PlayerCardComponent } from 'app/shared/components/player-card/player-card.component';
import { LineupPlayerCardComponent } from 'app/shared/components/lineup-player-card/lineup-player-card.component';
import { SeasonStatsTabComponent } from '../../player-season-stats/components/season-stats-tab/season-stats-tab.component';
import { LineupDTO, PlayerLineupDTO, ChemistryBreakdownDTO } from 'app/shared/models/lineup/lineup.dto';
import { LineupWarningDTO } from 'app/shared/models/lineup/lineup-warning.dto';
import { ALL_FORMATIONS, FormationCode } from 'app/shared/constants/formations';
import { SquadEditorModalComponent } from 'app/components/squad-editor-modal/squad-editor-modal.component';
import { readableErrorMessage } from 'app/shared/utils/error-message';
import {
  buildRiskyLineupMessage as buildRiskyLineupWarningMessage,
  displayLineupWarningMessage as formatLineupWarningMessage,
  isSuspendedLineupPlayer,
  pickLineupWarning as pickMainLineupWarning
} from './squad-management-warnings.utils';
import { AdvanceRoundResponse, ContinueCareerResponse, SessionPlayer, Team } from './squad-management.models';
import { CareerService } from '../../../core/services/career.service';
import { beginMatchStartTrace, markMatchStartStage } from '../../games/match-start-trace';
import { buildRoundStartNavigationState } from '../../games/round-start-navigation-state';

function isFormationCode(value: string): value is FormationCode {
  return (ALL_FORMATIONS as readonly string[]).includes(value);
}



@Component({
  selector: 'app-squad-management',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, MatDialogModule,
    CareerStatusBarComponent, PlayerCardComponent, LineupPlayerCardComponent,
    SeasonStatsTabComponent
  ],
  templateUrl: './squad-management.component.html',
  styleUrls: ['./squad-management.component.css']
})
export class SquadManagementComponent implements OnInit {
  constructor(
      private http: HttpClient,
      private router: Router,
      private fixtureService: FixtureService,
      private careerService: CareerService,
      private dialog: MatDialog,
      private logger: AppLoggerService
  ) {}

  async openFixtureModal(): Promise<void> {
    const careerStatus = await firstValueFrom(this.careerStatus$);
    if (!careerStatus?.careerId) return;

    this.dialog.open(FixtureModalComponent, {
      width: '85vw', maxWidth: '1200px', maxHeight: '90vh', panelClass: 'fixture-modal-panel',
      data: { careerId: careerStatus.careerId }
    });
  }
  async openStandingsModal(): Promise<void> {
    const careerStatus = await firstValueFrom(this.careerStatus$);
    if (!careerStatus?.careerId) return;

    this.dialog.open(StandingsModalComponent, {
      width: '85vw', maxWidth: '1100px', maxHeight: '90vh', panelClass: 'standings-modal-panel',
      data: { userTeamId: careerStatus.userSessionTeamId }
    });
  }

  careerStatus$!: Observable<CareerStatus | null>;
    team$!: Observable<Team | null>;
    squad$!: Observable<SessionPlayer[]>;
    loading$!: Observable<boolean>;
    squadLoading$!: Observable<boolean>;
    error$!: Observable<string | null>;
    private refetchSquadTrigger$ = new BehaviorSubject<void>(undefined);
    lineup$!: Observable<LineupDTO | null>;
    lineupLoading$ = new BehaviorSubject<boolean>(false);
    lineupError$ = new BehaviorSubject<string | null>(null);
    lineupWarning$ = new BehaviorSubject<LineupWarningDTO | null>(null);
    lineupSubject$ = new BehaviorSubject<LineupDTO | null>(null);
    confirmationWarning$ = new BehaviorSubject<string | null>(null);
    pendingRiskyConfirm$ = new BehaviorSubject<boolean>(false);
    selectedContributor$ = new BehaviorSubject<PlayerLineupDTO | null>(null);
    positionGroupOrder: ReadonlyArray<keyof ChemistryBreakdownDTO['positionGroups']> =
        ['GK', 'DEF', 'MID', 'ATT'];
    get lineupSlotsCount(): number {
      const lineup = this.lineupSubject$.value;
      if (lineup == null) {
        return 0;
      }
      if (lineup.slots != null && lineup.slots.length > 0) {
        const uniqueSubdivisionIds = new Set<string>();
        for (const slot of lineup.slots) {
          if (!slot?.subdivisionId) {
            continue;
          }
          if (uniqueSubdivisionIds.has(slot.subdivisionId)) {
            continue;
          }
          uniqueSubdivisionIds.add(slot.subdivisionId);
        }
        return uniqueSubdivisionIds.size;
      }
      return lineup.players?.length ?? 0;
    }
selectedFormation$ = new BehaviorSubject<string>('4-4-2');
private applyLineup(lineup: LineupDTO | null): void {
  lineup = this.normalizeLineupForDisplay(lineup);
  this.lineupSubject$.next(lineup);
  this.lineupWarning$.next(this.pickLineupWarning(lineup?.warnings));

  if (lineup?.formation && isFormationCode(lineup.formation)) {
    this.selectedFormation$.next(lineup.formation);
  }
}
private normalizeLineupForDisplay(lineup: LineupDTO | null): LineupDTO | null {
  if (!lineup) {
    return null;
  }
  const slots = (lineup.slots ?? [])
    .filter(slot => !!slot?.playerId && !!slot?.subdivisionId)
    .filter((slot, index, arr) =>
      arr.findIndex(other => other.playerId === slot.playerId || other.subdivisionId === slot.subdivisionId) === index
    )
    .slice(0, 11);
  const slotPlayerIds = new Set(slots.map(slot => slot.playerId));
  const players = (lineup.players ?? [])
    .filter((player, index, arr) => !!player?.playerId && arr.findIndex(other => other.playerId === player.playerId) === index)
    .filter(player => slotPlayerIds.size === 0 || slotPlayerIds.has(player.playerId))
    .slice(0, 11);
  return {
    ...lineup,
    players,
    slots,
  };
}
  availableFormations: readonly string[] = ALL_FORMATIONS;
    activeTab$ = new BehaviorSubject<'squad' | 'stats'>('squad');
    ngOnInit() {
      const careerStatusSource$ = this.http.get<CareerStatus>(`${environment.apiUrl}/career/status`).pipe(
        tap(status => {
          if (status?.currentRound) {
            this.careerService.prefetchFixturesForRound(status.currentRound).subscribe({ error: () => undefined });
          }
        }),
        catchError(err => of(null)),
        // Keep the completed status snapshot alive while the formation modal
        // temporarily removes its async-pipe subscribers. This avoids a
        // second status round-trip on the critical Confirmar y jugar click.
        shareReplay({ bufferSize: 1, refCount: false })
      );
      // Start the single status read as soon as the screen is created. The
      // async pipes and the formation modal can then consume the same replay
      // without making the first click pay the network latency.
      careerStatusSource$.subscribe({ error: () => undefined });
      this.careerStatus$ = careerStatusSource$.pipe(
        tap(status => {
          if (!status || !status.careerId) {
            this.router.navigate(['/career/setup']);
          }
        })
      );
      this.team$ = careerStatusSource$.pipe(
        switchMap(status => {
          if (status && status.userSessionTeamId) {
            return this.http.get<Team>(`${environment.apiUrl}/career/teams/${status.userSessionTeamId}`).pipe(
              catchError(err => of(null))
            );
          }
          return of(null);
        }),
        shareReplay(1)
      );
this.squad$ = combineLatest([
        careerStatusSource$,
        this.refetchSquadTrigger$
      ]).pipe(
        switchMap(([status]) => {
          if (status && status.careerId) {
            return this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
              catchError(err => of([]))
            );
          }
          return of([]);
        }),
        shareReplay(1)
      );
      this.squadLoading$ = combineLatest([
        this.refetchSquadTrigger$,
        this.squad$
      ]).pipe(
        map(() => false),
        startWith(true),
        distinctUntilChanged(),
        catchError(() => of(false))
      );
      this.loading$ = combineLatest([
        careerStatusSource$,
        this.team$,
        this.squad$
      ]).pipe(
        map(() => false),
        startWith(true),
        distinctUntilChanged(),
        catchError(() => of(false))
      );
      this.error$ = of(null);
      this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`)
        .pipe(
          tap(lineup => {
            this.applyLineup(lineup);
          }),
          catchError(err => {
            this.applyLineup(null);
            return of(null);
          })
        )
        .subscribe();
      this.lineup$ = this.lineupSubject$.asObservable();
    }
    private isSuspendedPlayer(p: { suspended?: boolean; suspensionRemainingMatches?: number }): boolean { return isSuspendedLineupPlayer(p); }
    private buildRiskyLineupMessage(players: PlayerLineupDTO[]): string | null { return buildRiskyLineupWarningMessage(players); }
    private resetLineupWarning(): void {
      this.confirmationWarning$.next(null);
      this.pendingRiskyConfirm$.next(false);
    }
    private pickLineupWarning(warnings?: LineupWarningDTO[]): LineupWarningDTO | null { return pickMainLineupWarning(warnings); }
    displayLineupWarningMessage(warning: LineupWarningDTO): string { return formatLineupWarningMessage(warning); }

    onSkillChipClick(contributorId: string): void {
      if (!contributorId) return;
      const current = this.selectedContributor$.value;
      if (current?.playerId === contributorId) {

        this.closeContributorPopover();
        return;
      }
      const lineup = this.lineupSubject$.value;
      if (!lineup?.players) return;
      const contributor = lineup.players.find(p => p.playerId === contributorId);
      if (!contributor) {

        return;
      }
      this.selectedContributor$.next(contributor);
    }
    closeContributorPopover(): void {
      if (this.selectedContributor$.value !== null) {
        this.selectedContributor$.next(null);
      }
    }
    isSelectedContributor(contributorId: string): boolean {
      return this.selectedContributor$.value?.playerId === contributorId;
    }
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      if (!this.selectedContributor$.value) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;



      if (target.closest('.skill-chip')) return;
      if (target.closest('.contributor-popover')) return;
      this.closeContributorPopover();
    }
    formatMoney(value: number): string {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    onFormationChange(formation: string): void {
      /*
       * The page-level selector is not a persistence surface. Keep it anchored
       * to the confirmed lineup; formation drafts are edited and confirmed in
       * the visual editor, where role-aware reflow is available.
       */
      const confirmedFormation = this.lineupSubject$.value?.formation
        ?? this.selectedFormation$.value;
      this.selectedFormation$.next(confirmedFormation);
      this.lineupError$.next(null);
    }
    setActiveTab(tab: 'squad' | 'stats'): void {
      this.activeTab$.next(tab);
    }
availableSquadCount(squad: SessionPlayer[] | null): number {
  if (!squad) return 0;
  return squad.filter(p =>
    p.injured !== true &&
    !(p.suspensionRemainingMatches != null && p.suspensionRemainingMatches > 0)
  ).length;
}
openVisualEditor(): void {
  this.careerStatus$.subscribe(status => {
    if (!status || !status.careerId) {
      return;
    }

    this.squad$.pipe(take(1)).subscribe(squad => {
      const ref = this.dialog.open(SquadEditorModalComponent, {
        data: {
          careerId: status.careerId,
          matchId: null,
          squad: squad ?? [],

          currentFormation: this.selectedFormation$.value
        },
        width: '98vw',
        height: '90vh',
        disableClose: false,
        panelClass: 'squad-editor-panel'
      });
      ref.afterClosed().subscribe((result: { saved?: boolean } | undefined) => {
        if (!result?.saved) {
          return;
        }

        this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`)
          .pipe(
            tap(lineup => {
              this.applyLineup(lineup);
            }),
            catchError(() => {
              this.applyLineup(null);
              return of(null);
            })
          )
          .subscribe();
        this.refreshSquad();
      });
    });
  });
}
    onAutoSelect(): void {
      const formation = this.selectedFormation$.value;
      this.lineupLoading$.next(true);
      this.lineupError$.next(null);
      this.lineupWarning$.next(null);
      this.resetLineupWarning();
      this.http.post<LineupDTO>(
        `${environment.apiUrl}/career/lineup/auto-select`,
        { formation }
      )
      .subscribe({
        next: (lineup) => {
          this.applyLineup(lineup);
          this.lineupLoading$.next(false);
        },
        error: (err) => {
          const userMsg = readableErrorMessage(err, 'Error seleccionando alineación');
          this.lineupError$.next(userMsg);

          if (err.error?.code) {
            this.lineupWarning$.next({
              code: err.error.code,
              severity: 'ERROR',
              message: userMsg
            });
          }
          this.lineupLoading$.next(false);
        }
      });
    }
    onConfirmLineup(): void {
      beginMatchStartTrace(true);
      markMatchStartStage('T1_HANDLER_STARTED');
      const currentLineup = this.lineupSubject$.value;
      const playerCount = this.lineupSlotsCount;

      if (playerCount < 7 || playerCount > 11) {
        this.lineupError$.next(
          playerCount < 7
            ? 'Mínimo 7 jugadores para confirmar'
            : 'Máximo 11 jugadores'
        );
        return;
      }
      const riskyMsg = this.buildRiskyLineupMessage(currentLineup?.players ?? []);
      if (riskyMsg && !this.pendingRiskyConfirm$.value) {
        this.confirmationWarning$.next(riskyMsg);
        this.pendingRiskyConfirm$.next(true);
        this.lineupLoading$.next(false);
        return;
      }
      this.lineupLoading$.next(true);
      this.lineupError$.next(null);
      this.lineupWarning$.next(null);
      markMatchStartStage('T2_LOCAL_VALIDATION_DONE');
      markMatchStartStage('T7_LINEUP_REQUESTED');
      firstValueFrom(this.careerStatus$).then(careerStatus => {
        markMatchStartStage('T3_STATUS_REQUESTED');
        markMatchStartStage('T4_STATUS_COMPLETED');
        if (!careerStatus || !careerStatus.careerId) {
          this.lineupLoading$.next(false);
          this.lineupError$.next('No career found');
          this.resetLineupWarning();
          return;
        }
        this.http.post(`${environment.apiUrl}/career/lineup/confirm`, {}).subscribe({
          next: () => {
            markMatchStartStage('T8_LINEUP_COMPLETED');
            this.resetLineupWarning();
            this.refreshSquad();
            if (careerStatus.careerPhase === 'WAITING_USER') {
              this.http.post<AdvanceRoundResponse>(`${environment.apiUrl}/career/${careerStatus.careerId}/next-round`, {}).subscribe({
                next: (response) => {
                  this.lineupLoading$.next(false);
                  if (response.success) {
                    if (response.tournamentFinished) {
                      this.lineupError$.next('Temporada completada. Posición final: ' + response.userPosition + '?');
                      this.refreshCareerStatus();
                    } else {
                      const nextRound = response.currentRound ?? careerStatus.currentRound;
                      const navigationStatus = {
                        careerId: careerStatus.careerId,
                        currentRound: nextRound,
                        totalRounds: careerStatus.totalRounds,
                        userSessionTeamId: careerStatus.userSessionTeamId,
                        careerPhase: response.careerPhase ?? 'PRE_MATCH',
                        season: careerStatus.season,
                        userDivision: careerStatus.userDivision
                      };
                      markMatchStartStage('T11_NAVIGATION_REQUESTED');
                      this.router.navigate(
                        [`/games/${careerStatus.careerId}/round/${nextRound}/live`],
                        { state: buildRoundStartNavigationState(navigationStatus, nextRound, careerStatus.careerId!) }
                      );
                    }
                  } else {
                    this.lineupError$.next(response.message || 'Error al avanzar');
                  }
                },
                error: (err) => {
                  this.logDevError('[SQUAD] Error en next-round:', err);
                  this.lineupLoading$.next(false);
                  this.lineupError$.next(readableErrorMessage(err, 'Error al avanzar de fecha'));
                  this.resetLineupWarning();
                }
              });
            } else if (careerStatus.careerPhase === 'FINISHED') {
              this.lineupLoading$.next(false);
              this.lineupError$.next('El torneo ha finalizado. Usa "Continuar Carrera" para iniciar una nueva temporada.');
            } else {
              this.lineupLoading$.next(false);
              markMatchStartStage('T11_NAVIGATION_REQUESTED');
              this.router.navigate(
                [`/games/${careerStatus.careerId}/round/${careerStatus.currentRound}/live`],
                { state: buildRoundStartNavigationState(careerStatus, careerStatus.currentRound, careerStatus.careerId!) }
              );
            }
          },
          error: (err) => {
            this.logDevError('[SQUAD] Error confirmando lineup:', err);
            this.lineupLoading$.next(false);
            this.lineupError$.next(readableErrorMessage(err, 'Error al confirmar alineación'));
            this.resetLineupWarning();
          }
        });
      }).catch(err => {
        this.logDevError('[SQUAD] Error obteniendo career status:', err);
        this.lineupLoading$.next(false);
        this.lineupError$.next('Error al obtener estado de carrera');
        this.resetLineupWarning();
      });
    }
    viewFinalStandings(): void {
      firstValueFrom(this.careerStatus$).then(status => {
        if (status?.careerId) this.router.navigate([`/games/${status.careerId}/champion`]);
      });
    }
    continueToNewSeason(): void {
      this.http.post<ContinueCareerResponse>(`${environment.apiUrl}/career/continue`, {}).subscribe({
        next: (response) => {
          if (response.success) {
            this.refreshCareerStatus();

            this.reloadPage();
          } else {
            this.lineupError$.next(response.message || 'Error al iniciar nueva temporada');
          }
        },
        error: (err) => {
          this.logDevError('[SQUAD] Error iniciando nueva temporada:', err);
          this.lineupError$.next(readableErrorMessage(err, 'Error al iniciar nueva temporada'));
        }
      });
    }
    protected reloadPage(): void { window.location.reload(); }
    viewPalmares(): void {
      forkJoin({
        divisions: this.http.get<DivisionInfo[]>(`${environment.apiUrl}/career/divisions`),
        status: this.http.get<CareerStatus>(`${environment.apiUrl}/career/status`)
      }).subscribe({
        next: ({ divisions }) => {
          this.dialog.open(PalmaresDialogComponent, {
            data: {
              userDivisionId: null,
              divisions: divisions || []
            },
            width: '600px',
            maxWidth: '90vw'
          });
        },
        error: (err) => {
          this.logDevError('[PALMARES-FRONT] Error obteniendo datos:', err);
          this.lineupError$.next('Error al obtener datos del palmarés');
        }
      });
    }
    viewPromotions(): void {
      this.http.get<PromotionResult[]>(`${environment.apiUrl}/career/promotions`).subscribe({
        next: (promotions) => {
          this.dialog.open(PromotionsDialogComponent, {
            data: { promotions: promotions || [] },
            width: '450px',
            maxWidth: '90vw'
          });
        },
        error: (err) => {
          this.logDevError('[SQUAD] Error obteniendo promociones:', err);
          this.lineupError$.next('Error al obtener promociones');
        }
      });
    }
    private refreshCareerStatus(): void {
      this.careerStatus$ = this.http.get<CareerStatus>(`${environment.apiUrl}/career/status`).pipe(
        tap(status => {
          if (!status || !status.careerId) {
            this.router.navigate(['/career/setup']);
          }
        }),
        catchError(_err => of(null))
      );
      this.refetchSquadTrigger$.next();
    }
    refreshSquad(): void {
      this.refetchSquadTrigger$.next();
    }
    private logDevError(message: string, error: unknown): void {
      this.logger.error(message, error);
    }
}
