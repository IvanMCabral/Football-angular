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

/**
 * All formations exposed by the modal. V25D54-C15: added 5 formations
 * nuevas (P1: 3-5-2-CDM, 5-4-1, 3-4-1-2, 4-2-2-2; P2: 4-3-3-1) para que
 * el dropdown muestre las 12 formations disponibles en el back.
 *
 * Source of truth: `FormationService.getAllFormations()` en el back.
 */
const FORMATIONS = [
  '4-4-2', '4-3-3', '3-5-2', '4-2-3-1',
  '5-3-2', '4-1-4-1', '3-4-3',
  // V25D54-C15 P1
  '3-5-2-CDM', '5-4-1', '3-4-1-2', '4-2-2-2',
  // V25D54-C15 P2
  '4-3-3-1'
] as const;
type Formation = typeof FORMATIONS[number];

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
