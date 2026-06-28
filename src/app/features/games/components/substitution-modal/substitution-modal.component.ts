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
import { SubModalPlayer } from '../../../../core/services/match-engine.model';

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
}

/**
 * LIVE-MATCH-F3-UI-LIVE FE4: substitution modal.
 *
 * <p>3-column layout: Starting XI (left) | Bench (right) | Actions (footer).
 * The user clicks a player in the starting XI to mark them as {@code playerOffId}
 * and a player in the bench to mark them as {@code playerOnId}. The "Confirmar"
 * button is disabled until both selections are made.
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
    if (this.isOutOfSubs) { return; }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
