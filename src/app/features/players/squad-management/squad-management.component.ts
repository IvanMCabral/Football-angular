import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, forkJoin, of, switchMap, map, tap, catchError, shareReplay, BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FixtureService } from 'app/core/services/fixture.service';
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
import { LineupDTO, PlayerLineupDTO } from 'app/shared/models/lineup/lineup.dto';
import { LineupWarningDTO } from 'app/shared/models/lineup/lineup-warning.dto';
import { SquadEditorModalComponent } from 'app/components/squad-editor-modal/squad-editor-modal.component';

interface SessionPlayer {
  sessionPlayerId: string;
  name: string;
  age: number;
  position: string;
  attack: number;
  defense: number;
  technique: number;
  speed: number;
  stamina: number;
  mentality: number;
  marketValue: number;
  energy: number;
  form: number;
  origin: string;
  injured?: boolean;
  injuryType?: string | null;
  injuryRemainingMatches?: number;
  yellowCards?: number;
  redCards?: number;
  suspended?: boolean;
  suspensionRemainingMatches?: number;
}

interface Team {
  sessionTeamId: string;
  baseTeamId: string;
  name: string;
  country: string;
  city: string;
  budget: number;
  formation: string;
  morale: number;
  reputation: number;
  origin: string;
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
      private dialog: MatDialog
   ) {}

    async openFixtureModal(): Promise<void> {
      const careerStatus = await firstValueFrom(this.careerStatus$);
      if (!careerStatus?.careerId) {
        return;
      }

      this.dialog.open(FixtureModalComponent, {
        width: '85vw',
        maxWidth: '1200px',
        maxHeight: '90vh',
        panelClass: 'fixture-modal-panel',
        data: { careerId: careerStatus.careerId }
      });
    }

    async openStandingsModal(): Promise<void> {
      const careerStatus = await firstValueFrom(this.careerStatus$);
      if (!careerStatus?.careerId) {
        return;
      }

      this.dialog.open(StandingsModalComponent, {
        width: '85vw',
        maxWidth: '1100px',
        maxHeight: '90vh',
        panelClass: 'standings-modal-panel',
        data: { userTeamId: careerStatus.userSessionTeamId }
      });
    }

   careerStatus$!: Observable<CareerStatus | null>;
   team$!: Observable<Team | null>;
   squad$!: Observable<SessionPlayer[]>;
   loading$!: Observable<boolean>;
   error$!: Observable<string | null>;

   lineup$!: Observable<LineupDTO | null>;
   lineupLoading$ = new BehaviorSubject<boolean>(false);
   lineupError$ = new BehaviorSubject<string | null>(null);
   /** V24D6U3: server-issued warnings (LINEUP_SHORT_HANDED, LINEUP_NO_GOALKEEPER). */
   lineupWarning$ = new BehaviorSubject<LineupWarningDTO | null>(null);
   lineupSubject$ = new BehaviorSubject<LineupDTO | null>(null);
   confirmationWarning$ = new BehaviorSubject<string | null>(null);
   pendingRiskyConfirm$ = new BehaviorSubject<boolean>(false);

   selectedFormation$ = new BehaviorSubject<string>('4-4-2');
   availableFormations = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2'];

   /** Active tab: 'squad' | 'stats' */
   activeTab$ = new BehaviorSubject<'squad' | 'stats'>('squad');

   ngOnInit() {
     const careerStatusSource$ = this.http.get<CareerStatus>(`${environment.apiUrl}/career/status`).pipe(
       catchError(err => of(null))
     );

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

     this.squad$ = careerStatusSource$.pipe(
       switchMap(status => {
         if (status && status.careerId) {
           return this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
             catchError(err => of([]))
           );
         }
         return of([]);
       }),
       shareReplay(1)
     );

     this.loading$ = combineLatest([
       careerStatusSource$,
       this.team$,
       this.squad$
     ]).pipe(
       map(() => false),
       catchError(() => of(false))
     );

     this.error$ = of(null);

     this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`)
       .pipe(
         tap(lineup => {
           this.lineupSubject$.next(lineup);
           this.lineupWarning$.next(this.pickLineupWarning(lineup.warnings));
         }),
         catchError(err => {
           this.lineupSubject$.next(null);
           this.lineupWarning$.next(null);
           return of(null);
         })
       )
       .subscribe();

     this.lineup$ = this.lineupSubject$.asObservable();
   }

   private isSuspendedPlayer(p: { suspended?: boolean; suspensionRemainingMatches?: number }): boolean {
    return p.suspended === true || (p.suspensionRemainingMatches ?? 0) > 0;
  }

   private buildRiskyLineupMessage(players: PlayerLineupDTO[]): string | null {
     if (!players || players.length === 0) { return null; }
     const suspended = players.filter(p => this.isSuspendedPlayer(p));
     const injured = players.filter(p => !this.isSuspendedPlayer(p) && p.injured === true);
     const exhausted = players.filter(p => !this.isSuspendedPlayer(p) && (p.energy ?? 100) <= 19);
     const veryTired = players.filter(p => {
       const e = p.energy ?? 100;
       return !this.isSuspendedPlayer(p) && p.injured !== true && e >= 20 && e <= 39;
     });

     if (suspended.length === 0 && injured.length === 0 && exhausted.length === 0 && veryTired.length === 0) {
       return null;
     }

     const parts: string[] = [];
     if (suspended.length > 0) {
       parts.push(`${suspended.length} suspended player${suspended.length > 1 ? 's' : ''}`);
     }
     if (injured.length > 0) {
       parts.push(`${injured.length} injured player${injured.length > 1 ? 's' : ''}`);
     }
     if (exhausted.length > 0) {
       parts.push(`${exhausted.length} exhausted player${exhausted.length > 1 ? 's' : ''}`);
     }
     if (veryTired.length > 0) {
       parts.push(`${veryTired.length} very tired player${veryTired.length > 1 ? 's' : ''}`);
     }

     return `Warning: ${parts.join(', ')} ${parts.length > 1 ? 'are' : 'is'} in the lineup. This may affect performance. Click "Confirmar y Jugar" again to continue.`;
   }

   private resetLineupWarning(): void {
     this.confirmationWarning$.next(null);
     this.pendingRiskyConfirm$.next(false);
   }

   /**
    * V24D6U3: Reduce a list of backend warnings to a single banner payload.
    * Priority: ERROR > WARNING. Returns null when no banner should be shown.
    */
   private pickLineupWarning(warnings?: LineupWarningDTO[]): LineupWarningDTO | null {
     if (!warnings || warnings.length === 0) {
       return null;
     }
     const errors = warnings.filter(w => w.severity === 'ERROR');
     if (errors.length > 0) {
       return errors[0];
     }
     return warnings[0];
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
     this.selectedFormation$.next(formation);
   }

   setActiveTab(tab: 'squad' | 'stats'): void {
     this.activeTab$.next(tab);
   }

/**
 * V24D6T2 (bug #6): count of healthy + non-suspended players in the
 * current squad. Used by the Plantilla header to show "available / total".
 */
availableSquadCount(squad: SessionPlayer[] | null): number {
  if (!squad) return 0;
  return squad.filter(p =>
    p.injured !== true &&
    !(p.suspensionRemainingMatches != null && p.suspensionRemainingMatches > 0)
  ).length;
}

/**
 * MVP1-lineup-cancha-1: abre el {@link SquadEditorModalComponent} con
 * cancha visual y 82 slots. El modal persiste las asignaciones vía
 * {@code /career/lineup/manual-select} y al cerrar refresca el lineup
 * actual para que el squad-management muestre los cambios.
 */
openVisualEditor(): void {
  this.careerStatus$.subscribe(status => {
    if (!status || !status.careerId) {
      return;
    }
    const ref = this.dialog.open(SquadEditorModalComponent, {
      data: {
        careerId: status.careerId,
        matchId: null
      },
      width: '95vw',
      height: '90vh',
      disableClose: false,
      panelClass: 'squad-editor-panel'
    });
    ref.afterClosed().subscribe(() => {
      // Refresca el lineup para que la grid del squad-management muestre los cambios.
      this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`)
        .pipe(
          tap(lineup => {
            this.lineupSubject$.next(lineup);
            this.lineupWarning$.next(this.pickLineupWarning(lineup.warnings));
          }),
          catchError(() => {
            this.lineupSubject$.next(null);
            this.lineupWarning$.next(null);
            return of(null);
          })
        )
        .subscribe();
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
         this.lineupSubject$.next(lineup);
         this.lineupWarning$.next(this.pickLineupWarning(lineup.warnings));
         this.lineupLoading$.next(false);
       },
       error: (err) => {
         let userMsg = 'Error selecting lineup';
         if (err.error?.message) {
           userMsg = err.error.message;
         } else if (err.message) {
           userMsg = err.message;
         }
         this.lineupError$.next(userMsg);
         // Also surface 422 warnings (e.g. LINEUP_MINIMUM_PLAYERS_NOT_MET) in the warning banner
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
     const currentLineup = this.lineupSubject$.value;
     const playerCount = currentLineup?.players?.length ?? 0;

     // V24D6U3: Guard against confirming with <7 or >11. Block client-side
     // without sending the request — the backend would 422 anyway.
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

     firstValueFrom(this.careerStatus$).then(careerStatus => {
       if (!careerStatus || !careerStatus.careerId) {
         this.lineupLoading$.next(false);
         this.lineupError$.next('No career found');
         this.resetLineupWarning();
         return;
       }

       this.http.post(`${environment.apiUrl}/career/lineup/confirm`, {}).subscribe({
         next: () => {
           this.resetLineupWarning();
           if (careerStatus.careerPhase === 'WAITING_USER') {
             this.http.post<any>(`${environment.apiUrl}/career/${careerStatus.careerId}/next-round`, {}).subscribe({
               next: (response) => {
                 this.lineupLoading$.next(false);

                 if (response.success) {
                   if (response.tournamentFinished) {
                     alert('🏆 ¡Temporada completada!\n\nPosición final: ' + response.userPosition + '°');
                     this.refreshCareerStatus();
                   } else {
                     this.router.navigate([`/games/${careerStatus.careerId}/round/${response.currentRound}/live`]);
                   }
                 } else {
                   this.lineupError$.next(response.message || 'Error al avanzar');
                 }
               },
               error: (err) => {
                 console.error('[SQUAD] Error en next-round:', err);
                 this.lineupLoading$.next(false);
                 this.lineupError$.next(err.error?.message || 'Error al avanzar de fecha');
                 this.resetLineupWarning();
               }
             });
           } else if (careerStatus.careerPhase === 'FINISHED') {
             this.lineupLoading$.next(false);
             this.lineupError$.next('El torneo ha finalizado. Usa "Continuar Carrera" para iniciar una nueva temporada.');
           } else {
             this.lineupLoading$.next(false);
             this.router.navigate([`/games/${careerStatus.careerId}/round/${careerStatus.currentRound}/live`]);
           }
         },
         error: (err) => {
           console.error('[SQUAD] Error confirmando lineup:', err);
           this.lineupLoading$.next(false);
           this.lineupError$.next(err.error?.message || 'Error al confirmar lineup');
           this.resetLineupWarning();
         }
       });
     }).catch(err => {
       console.error('[SQUAD] Error obteniendo career status:', err);
       this.lineupLoading$.next(false);
       this.lineupError$.next('Error al obtener estado de carrera');
       this.resetLineupWarning();
     });
   }

    viewFinalStandings(): void {
      firstValueFrom(this.careerStatus$).then(status => {
        if (status?.careerId) {
          this.router.navigate([`/games/${status.careerId}/champion`]);
        }
      });
    }

    continueToNewSeason(): void {
      if (!confirm('¿Iniciar una nueva temporada con tu equipo actual?')) {
        return;
      }

      this.http.post<any>(`${environment.apiUrl}/career/continue`, {}).subscribe({
        next: (response) => {
          if (response.success) {
            this.refreshCareerStatus();
            alert('🏆 ¡Nueva temporada ' + response.season + ' iniciada!');
          } else {
            alert('Error: ' + response.message);
          }
        },
        error: (err) => {
          console.error('[SQUAD] Error iniciando nueva temporada:', err);
          alert(err.error?.message || 'Error al iniciar nueva temporada');
        }
      });
    }

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
          console.error('[PALMARES-FRONT] Error obteniendo datos:', err);
          alert('Error al obtener datos del palmarés');
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
          console.error('[SQUAD] Error obteniendo promociones:', err);
          alert('Error al obtener promociones');
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
    }

}
