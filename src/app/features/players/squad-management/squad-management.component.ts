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
import { FormationDTO } from 'app/shared/models/lineup/formation.dto';
import { LineupSlotDTO } from 'app/shared/models/lineup/lineup-slot.dto';
import { LineupWarningDTO } from 'app/shared/models/lineup/lineup-warning.dto';
import { ALL_FORMATIONS, FormationCode } from 'app/shared/constants/formations';
import { SquadEditorModalComponent } from 'app/components/squad-editor-modal/squad-editor-modal.component';

interface AdvanceRoundResponse {
  success: boolean;
  message?: string;
  currentRound?: number;
  careerPhase?: string | null;
  tournamentFinished?: boolean;
  userPosition?: number;
}

interface ContinueCareerResponse {
  success: boolean;
  message?: string;
}

function isFormationCode(value: string): value is FormationCode {
  return (ALL_FORMATIONS as readonly string[]).includes(value);
}

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
      private dialog: MatDialog,
      private logger: AppLoggerService
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
   /** True while the squad is loading or refreshing after lineup changes. */
   squadLoading$!: Observable<boolean>;
   error$!: Observable<string | null>;

   /** Emits whenever the squad list must be fetched again. */
   private refetchSquadTrigger$ = new BehaviorSubject<void>(undefined);

   lineup$!: Observable<LineupDTO | null>;
   lineupLoading$ = new BehaviorSubject<boolean>(false);
   lineupError$ = new BehaviorSubject<string | null>(null);
   /** Warning returned by the lineup service, if the current XI is risky. */
   lineupWarning$ = new BehaviorSubject<LineupWarningDTO | null>(null);
   lineupSubject$ = new BehaviorSubject<LineupDTO | null>(null);
   confirmationWarning$ = new BehaviorSubject<string | null>(null);
   pendingRiskyConfirm$ = new BehaviorSubject<boolean>(false);

   /** Player currently shown in the chemistry breakdown popover. */
   selectedContributor$ = new BehaviorSubject<PlayerLineupDTO | null>(null);

    /** Stable display order for chemistry position groups. */
    positionGroupOrder: ReadonlyArray<keyof ChemistryBreakdownDTO['positionGroups']> =
        ['GK', 'DEF', 'MID', 'ATT'];

    /** Number of unique occupied lineup slots shown in the squad header. */
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

  // Keep the visible formation selector in sync with the persisted lineup.
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
  /** Formations supported by lineup editing and match simulation. */
  availableFormations: readonly string[] = ALL_FORMATIONS;

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
       parts.push(`${suspended.length} ${suspended.length > 1 ? 'jugadores suspendidos' : 'jugador suspendido'}`);
     }
     if (injured.length > 0) {
       parts.push(`${injured.length} ${injured.length > 1 ? 'jugadores lesionados' : 'jugador lesionado'}`);
     }
     if (exhausted.length > 0) {
       parts.push(`${exhausted.length} ${exhausted.length > 1 ? 'jugadores agotados' : 'jugador agotado'}`);
     }
     if (veryTired.length > 0) {
       parts.push(`${veryTired.length} ${veryTired.length > 1 ? 'jugadores muy cansados' : 'jugador muy cansado'}`);
     }

     return `Atención: ${parts.join(', ')} en el once. Esto puede afectar el rendimiento. Tocá "Confirmar y jugar" otra vez para continuar.`;
   }

   private resetLineupWarning(): void {
     this.confirmationWarning$.next(null);
     this.pendingRiskyConfirm$.next(false);
   }

    /** Pick the most important lineup warning for the banner. */
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

    displayLineupWarningMessage(warning: LineupWarningDTO): string {
      const availableMatch = warning.message?.match(/Only\s+(\d+)\s+available players/i);
      if (availableMatch) {
        return `Solo hay ${availableMatch[1]} jugadores disponibles. El equipo jugará con uno menos.`;
      }
      const offPositionMatch = warning.message?.match(/(\d+)\s+([A-Z]+)\s+slot filled by off-position players/i);
      if (offPositionMatch) {
        return `${offPositionMatch[1]} slot ${offPositionMatch[2]} está cubierto por jugadores fuera de posición. Se aplica penalización de efectividad.`;
      }
      if (/short-handed/i.test(warning.message || '')) {
        return 'El equipo jugará con menos de 11 jugadores disponibles.';
      }
      if (warning.code === 'LINEUP_NO_GOALKEEPER') {
        return 'La alineación necesita un arquero.';
      }
      if (warning.code === 'LINEUP_MINIMUM_PLAYERS_NOT_MET') {
        return 'Necesitás al menos 7 jugadores para jugar.';
      }
      return warning.message;
    }

    // Chemistry breakdown interactivity.

    /** Toggle the chemistry contributor popover for a skill chip. */
    onSkillChipClick(contributorId: string): void {
      if (!contributorId) return;

      const current = this.selectedContributor$.value;
      if (current?.playerId === contributorId) {
        // Same chip → toggle off
        this.closeContributorPopover();
        return;
      }

      const lineup = this.lineupSubject$.value;
      if (!lineup?.players) return;
      const contributor = lineup.players.find(p => p.playerId === contributorId);
      if (!contributor) {
        // Ignore stale chemistry references gracefully.
        return;
      }
      this.selectedContributor$.next(contributor);
    }

    /** Close the contributor popover (X button or click-outside). */
    closeContributorPopover(): void {
      if (this.selectedContributor$.value !== null) {
        this.selectedContributor$.next(null);
      }
    }

    /** True when a chemistry chip belongs to the open contributor popover. */
    isSelectedContributor(contributorId: string): boolean {
      return this.selectedContributor$.value?.playerId === contributorId;
    }

    /** Close the contributor popover when the user clicks outside it. */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      if (!this.selectedContributor$.value) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Clicks on chips or inside the popover itself are handled by the
      // element-local handlers (chip toggle / popover X button). Don't
      // re-close from the document listener.
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

   /**
    * Persist a formation change without replacing the current XI.
    * Existing players are reflowed into the target shape when possible.
    */
   onFormationChange(formation: string): void {
     this.selectedFormation$.next(formation);

     const current = this.lineupSubject$.value;
     const playerIds: string[] = (current?.players ?? []).map(p => p.playerId);
     const currentSlots = current?.slots ?? [];
     const fallbackSlots = currentSlots.map(s => ({
       playerId: s.playerId,
       subdivisionId: s.subdivisionId,
       customXPercent: s.customXPercent,
       customYPercent: s.customYPercent,
     }));

     const slots$ = this.http.get<FormationDTO[]>(`${environment.apiUrl}/editor/formations`).pipe(
       map(formations => this.reflowCurrentPlayersIntoFormation(formation, current, formations) ?? fallbackSlots),
       catchError(() => of(fallbackSlots))
     );

     slots$.pipe(
       switchMap(slots => this.http.post<LineupDTO>(
         `${environment.apiUrl}/career/lineup/manual-select`,
         { formation, playerIds, slots }
       ))
     ).subscribe({
       next: () => {
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
       },
       error: (err) => {
         let userMsg = 'Error updating formation';
         if (err.error?.message) { userMsg = err.error.message; }
         else if (err.message) { userMsg = err.message; }
         this.lineupError$.next(userMsg);
       }
     });
   }

   private reflowCurrentPlayersIntoFormation(
     formation: string,
     current: LineupDTO | null,
     formations: FormationDTO[]
   ): LineupSlotDTO[] | null {
     const players = current?.players ?? [];
     if (players.length !== 11) {
       return null;
     }
     const target = formations.find(f => f.name === formation);
     const positions = [...(target?.positions ?? [])].sort((a, b) => a.index - b.index);
     if (positions.length !== 11) {
       return null;
     }
     return players.map((player, index) => ({
       playerId: player.playerId,
       subdivisionId: positions[index].subdivisionId,
     }));
   }

   setActiveTab(tab: 'squad' | 'stats'): void {
     this.activeTab$.next(tab);
   }

/** Count healthy, non-suspended players in the current squad. */
availableSquadCount(squad: SessionPlayer[] | null): number {
  if (!squad) return 0;
  return squad.filter(p =>
    p.injured !== true &&
    !(p.suspensionRemainingMatches != null && p.suspensionRemainingMatches > 0)
  ).length;
}

/** Open the visual lineup editor and refresh squad/lineup state on close. */
openVisualEditor(): void {
  this.careerStatus$.subscribe(status => {
    if (!status || !status.careerId) {
      return;
    }
    // Pass the full squad so the editor can render both XI and bench.
    this.squad$.pipe(take(1)).subscribe(squad => {
      const ref = this.dialog.open(SquadEditorModalComponent, {
        data: {
          careerId: status.careerId,
          matchId: null,
          squad: squad ?? [],
          // Keep the editor in sync with the formation shown on this page.
          currentFormation: this.selectedFormation$.value
        },
        width: '98vw',
        height: '90vh',
        disableClose: false,
        panelClass: 'squad-editor-panel'
      });
      ref.afterClosed().subscribe(() => {
        // Refresca el lineup para que la grid del squad-management muestre los cambios.
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
         let userMsg = 'Error selecting lineup';
         if (err.error?.message) {
           userMsg = err.error.message;
         } else if (err.message) {
           userMsg = err.message;
         }
         this.lineupError$.next(userMsg);
         // Surface lineup validation errors in the warning banner.
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
     const playerCount = this.lineupSlotsCount;

     // Block impossible team sizes before sending the request.
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
            this.refreshSquad();
            if (careerStatus.careerPhase === 'WAITING_USER') {
             this.http.post<AdvanceRoundResponse>(`${environment.apiUrl}/career/${careerStatus.careerId}/next-round`, {}).subscribe({
               next: (response) => {
                 this.lineupLoading$.next(false);

                 if (response.success) {
                   if (response.tournamentFinished) {
                     this.lineupError$.next('Temporada completada. Posición final: ' + response.userPosition + '°');
                     this.refreshCareerStatus();
                   } else {
                     this.router.navigate([`/games/${careerStatus.careerId}/round/${response.currentRound}/live`]);
                   }
                 } else {
                   this.lineupError$.next(response.message || 'Error al avanzar');
                 }
               },
               error: (err) => {
                 this.logDevError('[SQUAD] Error en next-round:', err);
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
           this.logDevError('[SQUAD] Error confirmando lineup:', err);
           this.lineupLoading$.next(false);
           this.lineupError$.next(err.error?.message || 'Error al confirmar lineup');
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
        if (status?.careerId) {
          this.router.navigate([`/games/${status.careerId}/champion`]);
        }
      });
    }

    continueToNewSeason(): void {
      this.http.post<ContinueCareerResponse>(`${environment.apiUrl}/career/continue`, {}).subscribe({
        next: (response) => {
          if (response.success) {
            this.refreshCareerStatus();
            // Reload to rebuild the route-bound career streams for the new season.
            this.reloadPage();
          } else {
            this.lineupError$.next(response.message || 'Error al iniciar nueva temporada');
          }
        },
        error: (err) => {
          this.logDevError('[SQUAD] Error iniciando nueva temporada:', err);
          this.lineupError$.next(err.error?.message || 'Error al iniciar nueva temporada');
        }
      });
    }

    /** Wrapper kept small so tests can spy on page reloads safely. */
    protected reloadPage(): void {
      window.location.reload();
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

    /** Refresh the squad without rebuilding the career status stream. */
    refreshSquad(): void {
      this.refetchSquadTrigger$.next();
    }

    private logDevError(message: string, error: unknown): void {
      this.logger.error(message, error);
    }

}
