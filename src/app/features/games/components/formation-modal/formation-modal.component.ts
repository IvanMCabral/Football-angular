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
import { ALL_FORMATIONS, FormationCode } from '../../../../shared/constants/formations';

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

/**
 * All formations exposed by the modal. V25D54-C15: added 5 formations
 * nuevas (P1: 3-5-2-CDM, 5-4-1, 3-4-1-2, 4-2-2-2; P2: 4-3-3-1) para que
 * el dropdown muestre las 12 formations disponibles en el back.
 *
 * V25D55-C16 P0.1: source of truth moved to
 * {@code shared/constants/formations.ts}. The 4 dropdowns in this app
 * (formation-modal, squad-management, squad-editor-modal, test-harness)
 * now share the same array + the same derived {@link FormationCode} type.
 */
const FORMATIONS = ALL_FORMATIONS;

/**
 * V25D54-C15 P3.2: per-formation role labels por dot.
 *
 * Cada entrada es un array de líneas (GK al TOP del display, ATT al
 * BOTTOM). Cada línea es un array de role labels (en orden left-to-right)
 * matching las posiciones del slot en la formación correspondiente.
 *
 * Source of truth: `FormationService.buildFormations()` en el back.
 * Los role labels match los golden masters de
 * `FormationServiceTest.goldenRolesForOriginal7Formations` y
 * `goldenRolesForNew5Formations`.
 */
const FORMATION_LINES_BY_FORMATION: Record<string, string[][]> = {
  // ========== 7 formations originales (V25D36-F2) ==========
  '4-4-2': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['LM', 'CM', 'CM', 'RM'],
    ['ST', 'ST']
  ],
  '4-3-3': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['CM', 'CM', 'CM'],
    ['LW', 'ST', 'RW']
  ],
  '3-5-2': [
    // P0 fixed: pos #4 LM→LWB, pos #8 RM→RWB (wide mids son wing-backs).
    ['GK'],
    ['CB', 'CB', 'CB'],
    ['LWB', 'CM', 'CM', 'CM', 'RWB'],
    ['ST', 'ST']
  ],
  '4-2-3-1': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['CDM', 'CDM'],
    ['LW', 'CAM', 'RW'],
    ['ST']
  ],
  '5-3-2': [
    ['GK'],
    ['LB', 'CB', 'CB', 'CB', 'RB'],
    ['CM', 'CM', 'CM'],
    ['ST', 'ST']
  ],
  '4-1-4-1': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['CDM'],
    ['LM', 'CM', 'CM', 'RM'],
    ['ST']
  ],
  '3-4-3': [
    // P0 fixed: pos #4 LM→LWB, pos #7 RM→RWB.
    ['GK'],
    ['CB', 'CB', 'CB'],
    ['LWB', 'CM', 'CM', 'RWB'],
    ['LW', 'ST', 'RW']
  ],
  // ========== V25D54-C15 P1: 4 formations nuevas ==========
  '3-5-2-CDM': [
    ['GK'],
    ['CB', 'CB', 'CB'],
    ['CDM'],
    ['CM', 'CM'],
    ['LWB', 'RWB'],
    ['ST', 'ST']
  ],
  '5-4-1': [
    ['GK'],
    ['LB', 'CB', 'CB', 'CB', 'RB'],
    ['LM', 'CM', 'CM', 'RM'],
    ['ST']
  ],
  '3-4-1-2': [
    ['GK'],
    ['CB', 'CB', 'CB'],
    ['LWB', 'CM', 'CM', 'RWB'],
    ['CAM'],
    ['ST', 'ST']
  ],
  '4-2-2-2': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['CDM', 'CDM'],
    ['LM', 'RM'],
    ['ST', 'ST']
  ],
  // ========== V25D54-C15 P2: variante 4-3-3-1 ==========
  '4-3-3-1': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['CDM'],
    ['CM', 'CM'],
    ['LW', 'ST', 'RW']
  ]
};

/**
 * LIVE-MATCH-F3-UI-LIVE FE5: formation-change modal.
 *
 * <p>D-formation-ui: dropdown with formation options (4-4-2, 4-3-3, 3-5-2,
 * 4-2-3-1, 5-3-2, 4-1-4-1, 3-4-3 + 5 nuevas V25D54-C15) + a visual pitch
 * that re-renders the layout based on the selection.
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
 *
 * <p>V25D54-C15 P3.2: ahora cada dot muestra el role label específico
 * (LWB, RWB, CDM, CAM, ST, etc.) en lugar de labels genéricos (DF, MD, AT).
 * Esto alinea el visual con los role labels que {@code FormationService}
 * expone en el back (golden-tested en
 * {@code FormationServiceTest.goldenRolesFor*Formations}).
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
  // V25D56 (Sprint C17): inlined styles so ɵcmp.styles exposes the source
  // to unit tests (external CSS would not be reachable). Keep the file in
  // sync — the .css companion has been left in place for IDE hints only.
  styles: [`
    .formation-modal-root {
      min-width: 460px;
      max-width: 600px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .title-icon { margin-right: 0.4rem; }

    .current-tag {
      display: inline-block;
      margin-left: 0.6rem;
      padding: 0.15rem 0.5rem;
      background: #e0e0e0;
      color: #1e3c72;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      vertical-align: middle;
    }

    .formation-modal-content { padding-top: 0.5rem; }

    .banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.8rem;
      border-radius: 6px;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }

    .banner mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    .banner-error {
      background: #ffebee;
      color: #b71c1c;
      border: 1px solid #ffcdd2;
    }

    .formation-row {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .formation-select {
      width: 100%;
      max-width: 240px;
    }

    .pitch {
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

    .pitch-line {
      display: flex;
      justify-content: space-around;
      align-items: center;
      min-height: 36px;
    }

    .player-dot {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #1e3c72;
      font-size: 0.7rem;
      font-weight: 700;
      color: #1e3c72;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .player-dot.is-gk  { background: #ffc107; border-color: #ff6f00; }
    .player-dot.is-def { background: #bbdefb; }
    .player-dot.is-mid,
    .player-dot.is-mid2 { background: #c8e6c9; }
    .player-dot.is-att { background: #ffcdd2; border-color: #b71c1c; color: #b71c1c; }

    .dot-label { user-select: none; }

    .hint {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      color: #5a6473;
      margin: 0;
      padding: 0.4rem 0.5rem;
      background: #f5f7fa;
      border-radius: 4px;
    }

    .hint mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .submit-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.85);
      z-index: 10;
      font-size: 0.9rem;
      color: #1e3c72;
      border-radius: 6px;
    }

    .formation-modal-actions { padding: 0.5rem 1rem; }

    :host ::ng-deep .success-toast {
      --mdc-snackbar-container-color: #2e7d32;
      --mdc-snackbar-supporting-text-color: #ffffff;
      --mat-snack-bar-button-color: #c8e6c9;
      font-weight: 600;
    }

    /* Responsive — V25D56 (Sprint C17): progressive breakpoints for mobile
       (<=600px), tablet (601-1024px), desktop default (>=1025px), and
       large-desktop (>=1600px). Pitch dots and lines previously had a
       single fixed size which overflowed horizontally on narrow phones.
       Dots now scale via min/max-width so they stay bounded at every
       viewport. Role labels (LWB, CDM, CAM, ...) shrink with ellipsis
       truncation so 1-line labels never wrap. */
    @media (max-width: 600px) {
      .formation-modal-root {
        min-width: 0;
        max-width: 100vw;
        padding: 0 0.25rem;
      }

      .pitch {
        padding: 0.4rem 0.25rem;
        gap: 0.25rem;
        min-height: 220px;
      }

      .pitch-line {
        gap: 4px;
        min-height: 28px;
      }

      .pitch-line { flex: 1; }

      .player-dot {
        width: 18px;
        height: 18px;
        min-width: 12px;
        max-width: 22px;
        font-size: 0.6rem;
      }

      .dot-label {
        font-size: 0.6rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .formation-select {
        max-width: 100%;
      }

      .formation-row {
        margin-bottom: 0.5rem;
      }
    }

    @media (min-width: 601px) and (max-width: 1024px) {
      .formation-modal-root {
        min-width: 360px;
        max-width: 480px;
      }

      .pitch {
        padding: 0.5rem 0.35rem;
        gap: 0.35rem;
      }

      .pitch-line {
        gap: 8px;
      }

      .player-dot {
        width: 24px;
        height: 24px;
        min-width: 18px;
        max-width: 28px;
        font-size: 0.7rem;
      }

      .dot-label {
        font-size: 0.7rem;
      }
    }

    @media (min-width: 1600px) {
      .formation-modal-root {
        max-width: 720px;
      }

      .player-dot {
        width: 36px;
        height: 36px;
        font-size: 0.8rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormationModalComponent {

  readonly data: FormationDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FormationModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);

  readonly formations: readonly string[] = FORMATIONS;

  /** Currently selected formation (signal-based for OnPush compatibility). */
  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  private normalizeFormation(input: string): FormationCode {
    const normalized = (input || '').replace(/\s/g, '');
    if ((ALL_FORMATIONS as readonly string[]).includes(normalized)) {
      return normalized as FormationCode;
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
   *
   * <p>V25D54-C15 P3.2: derived from {@link FORMATION_LINES_BY_FORMATION}
   * para que el conteo siempre matchee los role labels. Si la formation
   * no está en el map (no debería pasar, pero defensivo), cae al default
   * 4-4-2.
   */
  get formationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2]; // fallback defensivo
    }
    return lines.map(line => line.length);
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

  /**
   * Returns the role label shown on each player dot.
   *
   * <p>V25D54-C15 P3.2: lee de {@link FORMATION_LINES_BY_FORMATION} para
   * devolver labels específicos por formation (LWB, RWB, CDM, CAM, etc.)
   * en lugar de los genéricos anteriores (DF, MD, AT).
   *
   * <p>Los parámetros {@code count} e {@code isLast} se mantienen por
   * compat con el template HTML pero ya no se usan para calcular el
   * label (la info está en el map).
   *
   * @param lineIdx índice de la línea en la formación (0 = GK al top,
   *                última línea = ATT al bottom).
   * @param n índice del dot dentro de la línea (left-to-right).
   */
  getDotLabel(lineIdx: number, n: number, _count: number, _isLast: boolean): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][n] ?? '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
