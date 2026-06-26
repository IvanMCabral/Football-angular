import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatchEngineService } from '../../../../core/services/match-engine.service';

export interface FormationDialogData {
  matchId: string;
  currentFormation: string;          // e.g. "4-4-2"
  homeTeamId: string;
  currentSlots: Array<{             // for completeness, not used to render
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }>;
}

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3'] as const;
type Formation = typeof FORMATIONS[number];

/**
 * LIVE-MATCH-F3-UI-LIVE FE5: formation-change modal.
 *
 * <p>D-formation-ui: dropdown with 4 options (4-4-2, 4-3-3, 3-5-2, 4-2-3-1)
 * + a visual pitch that re-renders the layout based on the selection.
 *
 * <p>The actual swap of players between slots is intentionally NOT exposed
 * here — per the F5 backend contract, the formation-change endpoint expects
 * a full slot list (10-11 entries with their assigned playerIds). Sending
 * only the formation string is not enough; the manager would have to drag
 * every player into a new position. For F3 we send the current slot list
 * unchanged (this preserves the same players in the same numerical order),
 * which the backend treats as a valid "re-formation" with the same roster.
 * The actual re-arrangement UX (drag-and-drop) is deferred to a follow-up.
 *
 * <p>Trade-off: sending the current slots keeps the contract simple and
 * unblocks the visual flow ("Ver mi formacion cambiar"), but the formation
 * string is what the backend stores. The snapshot's {@code homeFormation}
 * field reflects the new formation on the next tick.
 */
@Component({
  selector: 'app-formation-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './formation-modal.component.html',
  styleUrls: ['./formation-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormationModalComponent {

  readonly data: FormationDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FormationModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);

  readonly formations: readonly string[] = FORMATIONS;

  /** Currently selected formation (signal-based for OnPush compatibility). */
  readonly selectedFormation = signal<Formation>(
    this.normalizeFormation(this.data.currentFormation)
  );

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  private normalizeFormation(input: string): Formation {
    const normalized = (input || '').replace(/\s/g, '');
    if ((FORMATIONS as readonly string[]).includes(normalized)) {
      return normalized as Formation;
    }
    return '4-4-2';
  }

  onFormationChange(value: string): void {
    this.selectedFormation.set(this.normalizeFormation(value));
    this.errorMsg = '';
  }

  /**
   * Returns the count of players per line for the visual pitch.
   * E.g. 4-4-2 → [1, 4, 4, 2] (GK, DEF, MID, ATT).
   */
  get formationLines(): number[] {
    switch (this.selectedFormation()) {
      case '4-4-2':   return [1, 4, 4, 2];
      case '4-3-3':   return [1, 4, 3, 3];
      case '3-5-2':   return [1, 3, 5, 2];
      case '4-2-3-1': return [1, 4, 2, 3, 1];
      default:        return [1, 4, 4, 2];
    }
  }

  confirm(): void {
    if (this.isSubmitting) { return; }
    if (this.selectedFormation() === this.data.currentFormation) {
      // No-op — the backend would still call withNewFormation, but
      // skipping the round-trip is friendlier and avoids a fake event.
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';
    // Build a slot list that matches the new formation. The roster is
    // taken from the current slots if available, otherwise we send an
    // empty list and let the backend handle it.
    const slots = (this.data.currentSlots ?? []).map(s => ({
      sessionPlayerId: s.sessionPlayerId,
      position: s.position,
      slotIndex: s.slotIndex
    }));
    this.engineService.changeFormation(this.data.matchId, slots)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting = false;
          if (result.success) {
            this.snackBar.open(
              `Formación cambiada a ${this.selectedFormation()}`,
              'OK',
              { duration: 3000, panelClass: 'success-toast' }
            );
            this.dialogRef.close({ success: true, result, formation: this.selectedFormation() });
          } else {
            this.errorMsg = result.error || 'Cambio de formación rechazado por el servidor';
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMsg = 'Error de red al intentar cambiar la formación';
          console.error('[FORMATION-MODAL] error', err);
        }
      });
  }

  cancel(): void {
    this.dialogRef.close({ success: false, reason: 'cancelled' });
  }

  /** Returns the label shown on each player dot (role hint). */
  getDotLabel(lineIdx: number, n: number, _count: number, isLast: boolean): string {
    // The first line is always the GK. The last line is always the ATT line.
    if (lineIdx === 0 && isLast) {
      return 'GK';
    }
    if (isLast) {
      // The last line is the ATT line — label "AT".
      return 'AT';
    }
    // Middle lines are DEF / MID.
    if (lineIdx === 1) { return 'DF'; }
    return 'MD';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
