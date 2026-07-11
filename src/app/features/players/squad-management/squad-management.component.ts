import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, forkJoin, of, switchMap, map, tap, catchError, shareReplay, BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { startWith, distinctUntilChanged } from 'rxjs/operators';
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
import { LineupDTO, PlayerLineupDTO, ChemistryBreakdownDTO } from 'app/shared/models/lineup/lineup.dto';
import { LineupWarningDTO } from 'app/shared/models/lineup/lineup-warning.dto';
import { ALL_FORMATIONS } from 'app/shared/constants/formations';
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
   /**
    * V25D83.1 sprint 2 ajuste (pre-push): post-lineup-confirm loading indicator.
    *
    * <p>{@code true} mientras el squad data está siendo (re-)cargado. Se
    * dispara en dos momentos:
    * <ol>
    *   <li>Initial mount del componente (el HTTP a /career/players/squad
    *       está en flight).</li>
    *   <li>Post-refetch disparado por {@code refetchSquadTrigger$} — por
    *       ejemplo después de un lineup-confirm exitoso, o cuando el modal
    *       squad-editor cierra y necesitamos refrescar el squad para que
    *       la grid muestre los cambios de energy/condition/etc.</li>
    * </ol>
    *
    * <p>El template renderiza un spinner overlay (full-screen) cuando este
    * observable emite {@code true}, evitando que el usuario vea la grid
    * vacía durante el refetch.
    */
   squadLoading$!: Observable<boolean>;
   error$!: Observable<string | null>;

   /**
    * V25D83.1 sprint 2 ajuste (pre-push): trigger BehaviorSubject que fuerza
    * un refetch del squad$. Se usa después de acciones que pueden haber
    * modificado el squad server-side (lineup-confirm, squad-editor close,
    * continue-to-new-season).
    *
    * <p>Patrón (documentado en {@code memory/angular-testing-patterns.md}
    * → "Refresh pattern via BehaviorSubject tick"): combina con
    * {@code careerStatusSource$} vía {@code combineLatest} para que el
    * switchMap interno re-dispare el HTTP.
    */
   private refetchSquadTrigger$ = new BehaviorSubject<void>(undefined);

   lineup$!: Observable<LineupDTO | null>;
   lineupLoading$ = new BehaviorSubject<boolean>(false);
   lineupError$ = new BehaviorSubject<string | null>(null);
   /** V24D6U3: server-issued warnings (LINEUP_SHORT_HANDED, LINEUP_NO_GOALKEEPER). */
   lineupWarning$ = new BehaviorSubject<LineupWarningDTO | null>(null);
   lineupSubject$ = new BehaviorSubject<LineupDTO | null>(null);
   confirmationWarning$ = new BehaviorSubject<string | null>(null);
   pendingRiskyConfirm$ = new BehaviorSubject<boolean>(false);

   /**
    * V25D44 (Sprint C9): the player currently shown in the chemistry breakdown
    * popover. {@code null} when no popover is visible. Source of truth for the
    * template (the popover section uses {@code *ngIf="selectedContributor$ | async"}),
    * and for {@link isSelectedContributor} which adds a visual highlight
    * (chip-selected class) to the chip whose contributor is currently open.
    */
   selectedContributor$ = new BehaviorSubject<PlayerLineupDTO | null>(null);

    /**
     * V25D43 (Sprint C8): order in which to render position groups in the
     * chemistry breakdown. Mirrors the backend {@code ChemistryDetail.PositionGroup.values()}
     * (GK → DEF → MID → ATT). WINGER skills are folded into ATT on the back.
     * Exposed as a class field so the template can iterate it deterministically
     * (the order of {@code Object.keys(bd.positionGroups)} is not guaranteed
     * by all browsers/runtimes).
     */
    positionGroupOrder: ReadonlyArray<keyof ChemistryBreakdownDTO['positionGroups']> =
        ['GK', 'DEF', 'MID', 'ATT'];

    /**
     * V25D59-C19 P1 (front): count of persisted subdivision slots for the
     * current lineup, used by the hero label "Lineup armado: X/11".
     *
     * <p>Previously the counter read {@code lineup.players.length}. That lied
     * when the auto-select back bug (C18b) persisted a short-handed lineup
     * (e.g. 7 players) — the label still showed "11/11" because some other
     * display path cached a stale count. After the back fix (C19 P0) auto-select
     * always returns 11 players AND 11 slots, but for manual-select / legacy
     * lineups (pre-MVP1-lineup-cancha-1) the {@code slots} field can be absent.
     *
     * <p>Resolution: prefer {@code lineup.slots.length} (the persisted subdivision
     * count, MVP1-lineup-cancha-1 contract) and fall back to
     * {@code lineup.players.length} for backward compat with careers that haven't
     * re-armed via auto-select yet.
     */
    get lineupSlotsCount(): number {
      const lineup = this.lineupSubject$.value;
      if (lineup == null) {
        return 0;
      }
      if (lineup.slots != null && lineup.slots.length > 0) {
        const uniquePlayerIds = new Set<string>();
        const uniqueSubdivisionIds = new Set<string>();
        for (const slot of lineup.slots) {
          if (!slot?.playerId || !slot?.subdivisionId) {
            continue;
          }
          if (uniquePlayerIds.has(slot.playerId) || uniqueSubdivisionIds.has(slot.subdivisionId)) {
            continue;
          }
          uniquePlayerIds.add(slot.playerId);
          uniqueSubdivisionIds.add(slot.subdivisionId);
        }
        return uniqueSubdivisionIds.size;
      }
      return lineup.players?.length ?? 0;
    }

selectedFormation$ = new BehaviorSubject<string>('4-4-2');
  /**
   * V25D38-F1: extendido a las 7 formations que el engine soporta.
   * V25D55-C16 P0.1: extendido a las 12 formations que el back-end
   * reconoce (7 originales + 5 nuevas from V25D54-C15). Source of truth
   * movido a `shared/constants/formations.ts` para mantener en sync con
   * formation-modal, squad-editor-modal y test-harness.
   */
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

      /**
       * V25D83.1 sprint 2 ajuste (pre-push): squad loading indicator.
       *
       * <p>Patrón derivado de {@code loading$} (más abajo): empieza en
       * {@code true} vía {@code startWith(true)}, flips a {@code false}
       * cuando squad$ emite (initial mount o post-refetch). El
       * {@code distinctUntilChanged} colapsa emisiones redundantes.
       *
       * <p>{@code combineLatest([refetchSquadTrigger$, squad$])} garantiza
       * que cada {@code refetchSquadTrigger$.next()} re-emite (porque el
       * combineLatest re-evalúa) y el squad$ subsecuente emite el nuevo
       * payload, dando el patrón true→false→true→false esperado.
       */
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
        /**
         * V25D83.1 sprint 2 ajuste (pre-push): fix broken loading$.
         *
         * <p>Pre-fix: el pipe terminaba en {@code map(() => false)} — el
         * spinner de página nunca se mostraba porque cada emission del
         * combineLatest se mapeaba a false. Era un dead code que
         * silenciosamente bloqueaba el UX gap.
         *
         * <p>Post-fix: patrón {@code startWith(true) → map(() => false) →
         * distinctUntilChanged} idéntico al usado en {@code career-setup}
         * (V25D83.1 #1/#2). El spinner aparece mientras careerStatus/team/
         * squad están awaiting su primer payload.
         */
        map(() => false),
        startWith(true),
        distinctUntilChanged(),
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

    // ========== V25D44 (Sprint C9): chemistry breakdown interactivity ==========

    /**
     * V25D44 (Sprint C9): toggle/switch the contributor popover when the user
     * clicks a skill chip. Behavior:
     * <ul>
     *   <li>Same contributor already open → close the popover (toggle off).</li>
     *   <li>Different contributor → switch the popover to the new one.</li>
     *   <li>{@code contributorId} not found in the current lineup → no-op
     *       (backyard compat: don't open a popover with stale data; don't crash).</li>
     * </ul>
     * Lookup uses {@code lineup.players} (the 11 SessionPlayer cards already
     * fetched by {@code /career/lineup/current}); no extra HTTP call needed.
     */
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
        // Backyard compat: chip references a playerId not in this lineup
        // (shouldn't happen, but defensive — don't open a stale popover).
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

    /**
     * V25D44 (Sprint C9): true when the chip's contributorId matches the
     * currently-open popover. Template uses this to add the {@code chip-selected}
     * class (visual highlight on the active chip).
     */
    isSelectedContributor(contributorId: string): boolean {
      return this.selectedContributor$.value?.playerId === contributorId;
    }

    /**
     * V25D44 (Sprint C9): click-outside handler — close the popover when
     * the user clicks anywhere outside {@code .skill-chip} and outside the
     * popover itself. Clicks on chips / popover content are ignored here
     * because they have their own handlers (chip: toggle/switch; popover X:
     * close). Uses {@link HostListener} so it's wired to {@code document}
     * automatically (Angular runs it on every click anywhere).
     */
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
    * V25D99.20-FRONT BUG-4b: handle formation dropdown change.
    *
    * <p>Pre-fix behavior (only): update the local {@code selectedFormation$}
    * BehaviorSubject so the visual editor dialog receives the new formation
    * label via {@code currentFormation}. The header chem badge and chemistry
    * score remained stale until the next lineup fetch (which only happens on
    * modal close, auto-select success, or career-status refresh). Ivan saw
    * "header says 4-4-2, editor opens with 3-5-2" and read it as the lineup
    * being random.
    *
    * <p>Post-fix behavior: persist the formation to the back via the existing
    * {@code /career/lineup/manual-select} endpoint with the current lineup's
    * 11 playerIds + their slots (carrying customX/Y if any), then refetch
    * {@code /career/lineup/current} so {@code lineupSubject$} reflects the
    * back's new formation label + recomputed chem. The header chem badge
    * stays in sync because {@code lineupSubject$} drives the header via the
    * {@code lineup$ | async} pipe.
    *
    * <p>Why /manual-select rather than /auto-select: auto-select rewrites
    * the 11 player assignments (would lose Ivan's manual lineup changes).
    * /manual-select with the current playerIds and slots is a label-only
    * formation change that triggers chem recompute without disturbing the
    * players.
    */
   onFormationChange(formation: string): void {
     this.selectedFormation$.next(formation);

     const current = this.lineupSubject$.value;
     const playerIds: string[] = (current?.players ?? []).map(p => p.playerId);
     const slots = (current?.slots ?? []).map(s => ({
       playerId: s.playerId,
       subdivisionId: s.subdivisionId,
       customXPercent: s.customXPercent,
       customYPercent: s.customYPercent,
     }));

     this.http.post<LineupDTO>(
       `${environment.apiUrl}/career/lineup/manual-select`,
       { formation, playerIds, slots }
     ).subscribe({
       next: () => {
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
       },
       error: (err) => {
         let userMsg = 'Error updating formation';
         if (err.error?.message) { userMsg = err.error.message; }
         else if (err.message) { userMsg = err.message; }
         this.lineupError$.next(userMsg);
       }
     });
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
    // V25D66-C26 (Sprint C26): pasar el squad completo via dialog data para
    // que el modal pueda mostrar la banca con los jugadores del squad no
    // seleccionados (no solo los del response /career/lineup/current, que
    // son los 11 del lineup). El modal hace fallback a playersList si el
    // squad está vacío o ausente (backward compat con callers legacy).
    this.squad$.pipe(take(1)).subscribe(squad => {
      const ref = this.dialog.open(SquadEditorModalComponent, {
        data: {
          careerId: status.careerId,
          matchId: null,
          squad: squad ?? [],
          // V25D75-C40 B4: pass the parent's current formation so the
          // dialog opens with the SAME state the parent shows (was
          // defaulting to '4-4-2' when response.formation was missing,
          // causing the parent/dialog desync — parent 5-4-1, dialog 4-4-2).
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
        /**
         * V25D83.1 sprint 2 ajuste (pre-push): también refrescar el squad
         * post-modal-close. El squad-editor-modal puede haber actualizado
         * condition/energy/etc de los players, y queremos que la grid del
         * squad-management muestre los datos frescos. El squadLoading$
         * spinner overlay se renderiza durante el HTTP.
         */
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
            /**
             * V25D83.1 sprint 2 ajuste (pre-push): trigger squad refetch
             * post-lineup-confirm. El lineup-confirm puede modificar el squad
             * server-side (energy drain, condition updates) y queremos que
             * el squadLoading$ spinner overlay se muestre brevemente
             * mientras el HTTP re-fetchea. La navegación a /games/.../live
             * puede cancelar el observer, pero el patrón queda en sync si
             * el usuario regresa a /squad después.
             */
            this.refreshSquad();
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
            // V25D75-C40 B2: backend ContinueSeasonUseCase.ContinueResult
            // serializes the season as `newSeason` (NOT `season`). Reading
            // response.season produced the literal "undefined" in the alert.
            const newSeason = response.newSeason ?? response.season ?? '?';
            alert('🏆 ¡Nueva temporada ' + newSeason + ' iniciada!');
            // V25D78-C55.13 BUG-1 (BUG_V25D78_CONTINUE_CAREER_SQUAD_BUTTON_NOOP):
            // Backend successfully creates T3 (careerPhase=PRE_MATCH) but the
            // squad-management component keeps showing the stale T2 FINISHED
            // state because the ngOnInit observables (careerStatus$, team$,
            // squad$, lineup$) were bound once at mount and the alert blocks
            // the user from perceiving the change. The /dashboard button
            // works because it uses router.navigate(['/squad']) which forces
            // re-instantiation. We mirror that behavior here with a full page
            // reload — simplest and most robust fix for a 2-button component.
            this.reloadPage();
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

    /**
     * V25D78-C55.13 BUG-1: thin wrapper around {@code window.location.reload()}.
     * Indirected so spec tests can spyOn it via {@code spyOn(component, 'reloadPage')}
     * without hitting jsdom's non-writable {@code window.location.reload} property
     * (which throws "reload is not declared writable or has no setter" on
     * {@code spyOn(window.location, 'reload')}).
     */
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
      /**
       * V25D83.1 sprint 2 ajuste (pre-push): cuando el career-status cambia
       * (continueToNewSeason, round-end transitions), re-fetchear el squad
       * para que la grid muestre los datos frescos. El squadLoading$
       * spinner overlay se renderiza durante el HTTP.
       */
      this.refetchSquadTrigger$.next();
    }

    /**
     * V25D83.1 sprint 2 ajuste (pre-push): trigger manual del squad refetch.
     *
     * <p>Usado por {@link onConfirmLineup} después de un lineup-confirm
     * exitoso (pre-navigation a /games/.../live) y por callers externos que
     * necesiten refrescar el squad sin tocar career-status.
     */
    refreshSquad(): void {
      this.refetchSquadTrigger$.next();
    }

}
