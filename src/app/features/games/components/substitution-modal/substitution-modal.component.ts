import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { SubModalPlayer, V24LivePlayerRating } from '../../../../core/services/match-engine.model';

export interface SubstitutionDialogData {
  matchId: string;
  currentMinute: number;
  startingXi: SubModalPlayer[];
  bench: SubModalPlayer[];
  substitutionsRemaining: number;
  /**
   * V25D63-C23 P0: map sessionPlayerId → effectiveness (0-1).
   * Construido por live-match-modals.service desde
   * formationEffectiveness.perPlayerEffectiveness (keyed subdivisionId)
   * invertido via lineup.slots. Null cuando formationEffectiveness es
   * null/undefined (legacy pre-V25D47 lineup) — el modal renderiza sin
   * feedback de effectiveness en ese caso.
   */
  effectivenessMap?: Record<string, number>;
  /**
   * V25D79: live formation of the manager team (e.g. "4-4-2"). Sourced
   * from {@code state.homeFormation} (when manager team is home) or
   * {@code state.awayFormation} (when away). The visual pitch uses
   * this to determine the line counts (GK + DEF + MID + ATT lines).
   * Optional — when missing, the pitch falls back to a flat
   * positional grouping (1 GK row, DEF row, MID row, WINGER row, ATT row).
   */
  formation?: string;
  /**
   * V25D79: per-player live stats for the manager team. Sourced from
   * {@code state.homePlayerRatings} or {@code state.awayPlayerRatings}
   * depending on {@link managerSide}. Each dot in the visual pitch
   * renders its chips (goals / keyPasses / yellowCards / fouls /
   * injuries) sourced from this. Optional — empty / missing falls
   * back to no chips on the dot (still renders the dot with position
   * + name + rating).
   */
  playerRatings?: V24LivePlayerRating[];
  /**
   * V25D79: which side of the match the manager team is playing on.
   * Used by the modal to pick homePlayerRatings or awayPlayerRatings.
   * Defaults to 'HOME' when not provided.
   */
  managerSide?: 'HOME' | 'AWAY';
}

/**
 * V25D79 visual pitch helper: one entry per dot-row in the substitution
 * modal's starting XI section. The `players` array is in SLOT ORDER (left
 * to right within the row) — the visual pitch renders them horizontally.
 *
 * <p>Layout rule: GK row always 1, then DEF / MID / WINGER / ATT rows by
 * position category. This is simpler than re-doing the formation-line parser
 * from {@code formation-modal.component.ts} and the visual is correct for
 * the manager's understanding (he sees his own XI grouped by role).
 */
interface PitchLine {
  category: 'GK' | 'DEF' | 'MID' | 'WINGER' | 'ATT';
  players: SubModalPlayer[];
}

/**
 * LIVE-MATCH-F3-UI-LIVE FE4: substitution modal — V25D79 refactor.
 *
 * <p>2-column visual layout: Visual pitch of the starting XI (left,
 * click-only, per-player stats chips sourced from the live SSE feed) and
 * a simple bench list (right) for the swap-in candidates. The "Confirmar"
 * button is disabled until both selections are made and the manager team
 * still has substitutions remaining. The "Cancelar" button closes the
 * dialog with success=false.
 *
 * <p>Validation (D-sub-validation): the modal refuses to enable "Confirmar"
 * until the off is in the starting XI and the on is in the bench — both
 * client-side checks before the round-trip. The backend re-validates
 * (F2 invariant) and returns a structured {@code success=false} result if
 * the in-memory state has changed.
 *
 * <p>Error UX: the backend's FLAG 1 {@code success=false} body is surfaced
 * in an inline {@code <mat-error>} block; the modal stays open so the user
 * can correct the selection.
 *
 * <p>V25D79 changes:
 * <ul>
 *   <li>Replaced the 3-column "starter list / bench / actions" with a
 *       2-column visual pitch + bench list. The visual pitch reuses the
 *       dot pattern from {@code FormationModalComponent} (green pitch
 *       + colored dots per role) but binds (click) on each dot so the
 *       manager can click to select the player off (D4: click-only).</li>
 *   <li>Each dot shows: position label, name (truncated), overall rating,
 *       stats chips (goals / keyPasses / yellowCards / fouls /
 *       injuries, only when {@link SubstitutionDialogData#playerRatings}
 *       is non-empty for that player).</li>
 *   <li>Bench stays as a simple list (no canvas, no chips — chips would
 *       clutter the swap-in column).</li>
 * </ul>
 */
@Component({
  selector: 'app-substitution-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './substitution-modal.component.html',
  styleUrls: ['./substitution-modal.component.css'],
  // V25D79: visual-pitch + chip styles inlined so `ɵcmp.styles` exposes the
  // source to unit tests (external CSS via styleUrls is not reachable in
  // @angular-devkit/build-angular per the angular-testing-patterns memory).
  // The .css companion is kept for IDE hints; it only carries the legacy
  // 3-column grid + dialog actions styling (untouched by V25D79).
  styles: [`
    .v25d79-pitch {
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%);
      border-radius: 8px;
      padding: 0.6rem 0.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      border: 2px solid #fff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
      min-height: 280px;
      justify-content: space-around;
      margin-bottom: 0.75rem;
    }
    .v25d79-pitch-line {
      display: flex;
      justify-content: space-around;
      align-items: center;
      min-height: 36px;
      gap: 6px;
    }
    .v25d79-pitch-dot {
      position: relative;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid #1e3c72;
      font-size: 0.65rem;
      font-weight: 700;
      color: #1e3c72;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      padding: 2px;
      box-sizing: border-box;
      transition: transform 0.1s ease;
      user-select: none;
    }
    .v25d79-pitch-dot:hover { transform: scale(1.06); }
    .v25d79-pitch-dot.is-gk  { background: #ffc107; border-color: #ff6f00; }
    .v25d79-pitch-dot.is-def { background: #bbdefb; }
    .v25d79-pitch-dot.is-mid,
    .v25d79-pitch-dot.is-winger { background: #c8e6c9; }
    .v25d79-pitch-dot.is-att { background: #ffcdd2; border-color: #b71c1c; color: #b71c1c; }
    .v25d79-pitch-dot.selected {
      box-shadow: 0 0 0 3px #d32f2f, 0 1px 3px rgba(0, 0, 0, 0.3);
      transform: scale(1.08);
    }
    .v25d79-pitch-dot.eff-good   { border-color: #10b981; }
    .v25d79-pitch-dot.eff-warning { border-color: #f59e0b; }
    .v25d79-pitch-dot.eff-bad    { border-color: #ef4444; }
    .v25d79-pitch-dot.is-disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .v25d79-pitch-dot.is-disabled:hover { transform: none; }
    .v25d79-dot-pos {
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1;
    }
    .v25d79-dot-name {
      font-size: 0.55rem;
      font-weight: 500;
      line-height: 1;
      max-width: 50px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #374151;
    }
    .v25d79-dot-rating {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e3c72;
      line-height: 1;
    }
    .v25d79-dot-chips {
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
      max-width: 70px;
      justify-content: center;
    }
    .v25d79-chip {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 999px;
      font-size: 0.55rem;
      font-weight: 700;
      background: #1e3c72;
      color: #fff;
      line-height: 1;
      min-width: 12px;
      text-align: center;
    }
    .v25d79-chip-goals      { background: #16a34a; }
    .v25d79-chip-key-passes  { background: #0891b2; }
    .v25d79-chip-yellows     { background: #f59e0b; }
    .v25d79-chip-fouls       { background: #6b7280; }
    .v25d79-chip-injuries    { background: #dc2626; }
    .v25d79-actions-summary {
      margin-top: 0.5rem;
      padding: 0.5rem 0.6rem;
      background: #f5f7fa;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .v25d79-actions-summary .label {
      font-size: 0.78rem;
      color: #5a6473;
      font-weight: 600;
    }
    .v25d79-actions-summary .name {
      font-size: 0.85rem;
      color: #1e3c72;
      font-weight: 700;
    }
    .v25d79-actions-summary .arrow {
      font-size: 1.1rem;
      color: #2e7d32;
      font-weight: 700;
    }
    .v25d79-remaining {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      background: #e0e0e0;
      color: #1e3c72;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .v25d79-remaining.is-zero {
      background: #ffebee;
      color: #b71c1c;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubstitutionModalComponent {

  readonly data: SubstitutionDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SubstitutionModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);

  playerOffId: string | null = null;
  playerOnId: string | null = null;
  errorMsg: string = '';
  isSubmitting = false;
  private destroy$ = new Subject<void>();

  get playerOff(): SubModalPlayer | null {
    return this.data.startingXi.find(p => p.sessionPlayerId === this.playerOffId) ?? null;
  }

  get playerOn(): SubModalPlayer | null {
    return this.data.bench.find(p => p.sessionPlayerId === this.playerOnId) ?? null;
  }

  get canConfirm(): boolean {
    return !!(this.playerOffId && this.playerOnId
        && this.playerOffId !== this.playerOnId
        && this.data.substitutionsRemaining > 0
        && !this.isSubmitting);
  }

  get isOutOfSubs(): boolean {
    return this.data.substitutionsRemaining <= 0;
  }

  selectOff(p: SubModalPlayer): void {
    if (this.isOutOfSubs) { return; }
    this.playerOffId = p.sessionPlayerId;
    this.errorMsg = '';
  }

  selectOn(p: SubModalPlayer): void {
    this.playerOnId = p.sessionPlayerId;
    this.errorMsg = '';
  }

  clearOff(event: Event): void {
    event.stopPropagation();
    this.playerOffId = null;
  }

  clearOn(event: Event): void {
    event.stopPropagation();
    this.playerOnId = null;
  }

  confirm(): void {
    if (!this.canConfirm || !this.playerOffId || !this.playerOnId) {
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';
    this.engineService.substitutePlayer(
      this.data.matchId,
      this.playerOffId,
      this.playerOnId,
      this.data.currentMinute
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting = false;
          if (result.success) {
            this.snackBar.open(
              `Sustitución realizada (minuto ${result.minuteApplied})`,
              'OK',
              { duration: 3000, panelClass: 'success-toast' }
            );
            this.dialogRef.close({ success: true, result });
          } else {
            this.errorMsg = result.error || 'Sustitución rechazada por el servidor';
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMsg = 'Error de red al intentar la sustitución';
          console.error('[SUB-MODAL] error', err);
        }
      });
  }

  cancel(): void {
    this.dialogRef.close({ success: false, reason: 'cancelled' });
  }

  /** trackBy for *ngFor on player lists. */
  trackByPlayer = (_idx: number, p: SubModalPlayer) => p.sessionPlayerId;

  /**
   * V25D63-C23 P0: effectiveness classification para chips SALE/ENTRA.
   * Mismo threshold que squad-editor-modal (eff >= 0.9 good,
   * 0.7-0.9 warning, <0.7 bad). Retorna null si el jugador no está en
   * el effectivenessMap (bench sin data pre-match, o lineup legacy
   * pre-V25D47 sin formationEffectiveness).
   */
  getEffClass(sessionPlayerId: string): 'eff-good' | 'eff-warning' | 'eff-bad' | null {
    const v = this.data.effectivenessMap?.[sessionPlayerId];
    if (v == null) { return null; }
    if (v >= 0.9) { return 'eff-good'; }
    if (v >= 0.7) { return 'eff-warning'; }
    return 'eff-bad';
  }

  /**
   * V25D63-C23 P0: retorna el porcentaje rounded (e.g. '95%') o null
   * si no hay data para ese sessionPlayerId.
   */
  getEffBadge(sessionPlayerId: string): string | null {
    const v = this.data.effectivenessMap?.[sessionPlayerId];
    if (v == null) { return null; }
    return `${Math.round(v * 100)}%`;
  }

  /**
   * V25D79: visual pitch layout — group starting Xi by position category.
   * GK first row (always 1), then DEF, MID, WINGER, ATT. Each line has
   * the players in slot order. Players with an unknown position fall
   * into the MID bucket as a defensive default.
   *
   * <p>This forms a 4-5 row pitch where each row is one click-only lane.
   * The categorization is positional (not formation-driven) which keeps
   * the helper formation-independent and matches the F4 UI's position
   * vocabulary (GK / DEF / MID / WINGER / ATT).
   */
  get pitchLines(): PitchLine[] {
    const lines: PitchLine[] = [
      { category: 'GK',      players: [] },
      { category: 'DEF',     players: [] },
      { category: 'MID',     players: [] },
      { category: 'WINGER',  players: [] },
      { category: 'ATT',     players: [] }
    ];
    const idx: Record<string, number> = { GK: 0, DEF: 1, MID: 2, WINGER: 3, ATT: 4 };
    for (const p of this.data.startingXi) {
      const bucket = idx[(p.position || 'MID').toUpperCase()] ?? 2;
      lines[bucket].players.push(p);
    }
    // Drop empty trailing lines so 4-3-3 doesn't render an empty WINGER row.
    return lines.filter(line => line.players.length > 0);
  }

  /**
   * V25D79: dot's category-class binding. Maps the pitch-line category
   * (GK / DEF / MID / WINGER / ATT) to the CSS class used by the inline
   * styles (is-gk / is-def / is-mid / is-winger / is-att).
   */
  dotClass(lineCategory: PitchLine['category']): string {
    return `is-${lineCategory.toLowerCase()}`;
  }

  /**
   * V25D79: lookup helper — read the per-player stats entry by playerId.
   * Returns null when {@code data.playerRatings} is missing (no chips on
   * the dot) or when the player has no rating entry. The chips rendering
   * in the template uses this to decide whether to show the chip strip.
   */
  getRating(playerId: string): V24LivePlayerRating | null {
    if (!this.data.playerRatings) { return null; }
    for (const r of this.data.playerRatings) {
      if (r.playerId === playerId) { return r; }
    }
    return null;
  }

  /**
   * V25D79: count of non-zero chips for a player — used by the template
   * to decide if any chip strip is worth rendering. Empty rating or
   * zero across all stats → no strip.
   */
  hasAnyChip(playerId: string): boolean {
    const r = this.getRating(playerId);
    if (!r) { return false; }
    return r.goals > 0 || r.keyPasses > 0 || r.yellowCards > 0
        || r.fouls > 0 || r.injuries > 0;
  }

  /**
   * V25D79: trackBy for the dot *ngFor so DOM nodes are reused across
   * re-renders triggered by the SSE consumer (playerRatings change every
   * tick).
   */
  trackByDot = (_idx: number, p: SubModalPlayer) => p.sessionPlayerId;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
