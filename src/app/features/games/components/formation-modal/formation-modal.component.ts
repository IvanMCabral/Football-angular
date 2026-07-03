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
import { SessionPlayer } from '../../../../shared/models/player.model';

export interface FormationDialogData {
  matchId: string;
  currentFormation: string;          // e.g. "4-4-2"
  homeTeamId: string;
  currentSlots: Array<{             // for completeness, not used to render
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }>;
  /**
   * V25D81-BUG #4: full manager-team squad (starters + bench). Source: the
   * LiveMatchModalsService fetches it via /teams/me/squad at open time.
   * Used to render player names in the visual pitch dots (previously
   * only role labels like "CB" / "CM" were shown — manager couldn't
   * tell who was who) and to populate the bench list so the manager
   * can drag-drop bench players into starting slots.
   */
  squad: SessionPlayer[];
  /**
   * V25D81-BUG #4: set of sessionPlayerIds currently in the starting XI.
   * Computed from {@code currentSlots} (starters are slots with
   * slotIndex in the formation's line count, bench is the rest). The
   * modal uses this to split the squad into "on pitch" and "bench"
   * columns when the drag-drop is engaged.
   */
  startingIds: Set<string>;
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
 * <p>V25D81-BUG #4: the F5 comment "drag-and-drop deferred to a follow-up"
 * is now obsolete — the modal renders the manager's actual player names
 * in the visual pitch dots (not just role labels) and supports
 * drag-and-drop re-arrangement between slots + a bench column. See
 * {@link onSlotDrop} / {@link onSlotDragStart} / {@link onSlotDragOver}
 * for the HTML5 drag-drop wire.
 *
 * <p>State: {@code slotAssignments} is a mutable {@code Map<slotIndex,
 * sessionPlayerId>} initialized from {@code data.currentSlots}. On drop,
 * we swap the source and target assignments. On formation change, we
 * re-flow the existing assignments into the new line count (extra slots
 * get `null`; missing slots get trimmed — the formation dropdown
 * inherently changes the line count, so this re-flow is necessary).
 * On confirm, we POST the final slot list to the backend.
 *
 * <p>Trade-off: drag-and-drop is a UX improvement on top of the existing
 * F5 wire. The backend's `changeFormation` endpoint still takes a
 * slot list, so no contract change is required.
 *
 * <p>V25D54-C15 P3.2: cada dot muestra el role label específico
 * (LWB, RWB, CDM, CAM, ST, etc.) debajo del player name. Player name
 * is the primary identifier (BEFORE V25D81 only role label was shown,
 * which made it impossible to tell who was in which position).
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

    /* V25D81-BUG #4: 2-column visual layout (pitch + bench) on tablet+
       viewports. Mobile collapses to a single column with the bench
       BELOW the pitch. The drag-drop UX requires the two columns
       to be visible side-by-side on desktop so the manager can
       drag from one to the other without scrolling. */
    .formation-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    @media (min-width: 601px) {
      .formation-grid {
        grid-template-columns: 2fr 1fr;
      }
    }
    .col-pitch h3,
    .col-bench h3 {
      margin: 0 0 0.4rem 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e3c72;
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
      /* V25D81-BUG #4: cursor + transition for drag-drop UX. The dot
         is now interactive (draggable + drop target), not just a
         static label. */
      cursor: grab;
      user-select: none;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .player-dot:active { cursor: grabbing; }
    /* V25D81-BUG #4: empty slot has a dashed border + a tinted
       background so the manager can see "this slot is unassigned"
       vs. "this slot is filled". The role label still shows in
       the dot, so the formation is always readable. */
    .player-dot.is-empty {
      background: #f5f7fa;
      border-style: dashed;
      color: #5a6473;
    }
    /* V25D81-BUG #4: source dot of an in-progress drag gets a
       subtle scale + red glow so the manager sees what they're
       moving. */
    .player-dot.is-drag-source {
      transform: scale(0.92);
      box-shadow: 0 0 0 3px #d32f2f, 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    /* V25D81-BUG #4: when a dot is filled, render the player name
       in addition to (or instead of) the role label. The name is
       truncated with ellipsis so a long name doesn't blow out the
       dot. */
    .dot-player-name {
      font-size: 0.55rem;
      font-weight: 600;
      line-height: 1;
      max-width: 26px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #1e3c72;
    }

    /* V25D81-BUG #4: bench column. Vertical list of draggable
       player cards. Each card is sized to the column width; the
       player name + position are stacked. Hover raises the card. */
    .bench-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 360px;
      overflow-y: auto;
      padding: 0.4rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .bench-player {
      display: flex;
      flex-direction: column;
      padding: 0.45rem 0.55rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      cursor: grab;
      transition: background 0.1s ease, transform 0.1s ease;
      user-select: none;
    }
    .bench-player:hover {
      background: #f5f7fa;
      transform: translateX(2px);
    }
    .bench-player:active { cursor: grabbing; }
    .bench-player-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1e3c72;
      line-height: 1.2;
    }
    .bench-player-pos {
      font-size: 0.65rem;
      font-weight: 500;
      color: #5a6473;
      margin-top: 0.15rem;
    }
    .bench-empty {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem;
      font-size: 0.78rem;
      color: #5a6473;
      font-style: italic;
    }
    .bench-empty mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
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

  /**
   * V25D81-BUG #4: mutable slot→playerId map. Initialized from
   * {@code data.currentSlots}. Updated by drag-and-drop handlers and
   * the formation-change re-flow. The visual pitch template binds to
   * this map to render the player name in each dot.
   *
   * <p>Stored as a Map (not a plain object) so we can do
   * {@code .get(idx) ?? null} and `null`-check for empty slots after
   * a formation change widens the pitch.
   */
  slotAssignments: Map<number, string | null> = new Map();

  /**
   * V25D81-BUG #4: id of the slot currently being dragged (or null
   * when no drag is active). Used by the {@code onSlotDragOver}
   * handler to highlight the drop target. {@code -1} when dragging
   * from the bench (a non-slot source).
   */
  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench: boolean = false;

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

  constructor() {
    // V25D81-BUG #4: initialize slotAssignments from the dialog data's
    // currentSlots. Slots with the same index share the assignment
    // (a slotIndex of 0 is always the GK, etc.). The slotAssignments
    // map is mutable; drag-and-drop mutates it in place and the
    // template re-renders on each CD cycle.
    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
    }
  }

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);
    // V25D81-BUG #4: re-flow the slotAssignments to match the new
    // formation's line count. New slots (when the new formation has
    // more dots than the current one) start as `null` so the dot
    // shows the role label with no player name. Existing slots
    // preserve their assignment when the index is still in range.
    const oldAssignments = new Map(this.slotAssignments);
    const newLineCount = (FORMATION_LINES_BY_FORMATION[newFormation] ?? []).reduce(
      (sum, line) => sum + line.length, 0
    );
    this.slotAssignments = new Map();
    for (let i = 0; i < newLineCount; i++) {
      this.slotAssignments.set(i, oldAssignments.get(i) ?? null);
    }
    this.errorMsg = '';
  }

  // ========== V25D81-BUG #4: HTML5 drag-and-drop handlers ==========

  /**
   * dragstart on a slot dot. Stores the source slot index in a local
   * field so {@link onSlotDrop} knows which slot the drag came from.
   * The browser sets {@code dataTransfer.setData()} so the drop
   * event has access to the same data — we set a structured payload
   * with both the slot index and a marker identifying whether the
   * source is the bench (slotIdx = -1) or a pitch slot.
   */
  onSlotDragStart(event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = slotIdx;
    this.dragSourceIsBench = false;
    event.dataTransfer.setData('text/plain', `slot:${slotIdx}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  /**
   * dragstart on a bench player. Source is the bench (slotIdx = -1)
   * and the playerId is carried in the dataTransfer payload.
   */
  onBenchDragStart(event: DragEvent, playerId: string): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = -1;
    this.dragSourceIsBench = true;
    event.dataTransfer.setData('text/plain', `bench:${playerId}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  /**
   * dragover on a slot dot. Must call {@code preventDefault()} to
   * signal the browser this is a valid drop target (default is
   * "no drop allowed"). We also set the dropEffect to 'move' so
   * the cursor matches the action.
   */
  onSlotDragOver(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  /**
   * drop on a slot dot. Swaps the dragged player with whatever is
   * currently in the target slot (or just inserts if the source is
   * the bench and the target slot is empty). The source slot
   * (when dragging slot→slot) is cleared, so the drag visually
   * moves the player.
   */
  onSlotDrop(event: DragEvent, targetSlotIdx: number): void {
    event.preventDefault();
    if (this.dragSourceSlotIdx === null) {
      return;
    }
    if (this.dragSourceIsBench) {
      // Bench → slot: read playerId from dataTransfer, take whatever
      // was in the slot, return it to the bench (it just becomes
      // unassigned in slotAssignments; the bench list is recomputed
      // from `data.squad` minus the new slotAssignments).
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const playerId = raw.startsWith('bench:') ? raw.substring(6) : null;
      if (!playerId) {
        return;
      }
      const displaced = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, playerId);
      // The displaced player is now bench (or stays bench if the
      // target slot was empty). We don't track bench explicitly —
      // the template's bench list is derived from `data.squad`
      // minus the assigned ids, so this is automatic.
      void displaced; // intentionally unused (see template bench list)
    } else {
      // Slot → slot: SWAP the source and target assignments. The
      // source slot is cleared if it equals the target (i.e. drop
      // on self = no-op).
      const sourceSlot = this.dragSourceSlotIdx;
      if (sourceSlot === targetSlotIdx) {
        return;
      }
      const sourcePlayer = this.slotAssignments.get(sourceSlot) ?? null;
      const targetPlayer = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, sourcePlayer);
      this.slotAssignments.set(sourceSlot, targetPlayer);
    }
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
    // Force a re-render since we mutated a Map in place (signals
    // don't track Map mutations). With OnPush + signal-based
    // selectedFormation, bumping a no-op signal is the cleanest
    // way to trigger CD.
    this.selectedFormation.set(this.selectedFormation());
  }

  /**
   * dragend cleanup. Clears the drag source tracking so the next
   * drag starts from a clean state (especially if the user
   * releases the mouse outside any drop target).
   */
  onSlotDragEnd(): void {
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
  }

  /**
   * V25D81-BUG #4: returns the SessionPlayer assigned to the given
   * slot, or `null` when the slot is empty. Used by the template
   * to render the player name in the dot (or fall back to the
   * role label when empty).
   */
  playerAtSlot(slotIdx: number): SessionPlayer | null {
    const pid = this.slotAssignments.get(slotIdx);
    if (!pid) {
      return null;
    }
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === pid) ?? null;
  }

  /**
   * V25D81-BUG #4: helper for the template — converts a (lineIdx,
   * dotIdx) pair into a flat slotIndex. The pitch renders lines
   * top-to-bottom and dots left-to-right within a line, so the
   * flat index is the cumulative offset.
   */
  getSlotIndex(lineIdx: number, dotIdx: number): number {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let idx = 0;
    for (let i = 0; i < lineIdx; i++) {
      idx += (lines[i]?.length ?? 0);
    }
    return idx + dotIdx;
  }

  /**
   * V25D81-BUG #4: public re-export of the private
   * {@link slotsDifferFromInitial} so the template can disable
   * the Confirm button when nothing changed.
   */
  slotsDifferFromInitialPublic(): boolean {
    return this.slotsDifferFromInitial();
  }

  /**
   * V25D81-BUG #4: returns the bench list — squad players not
   * currently in the starting XI. The bench list is reactive to
   * the slotAssignments map (recomputed on every CD cycle), so a
   * drag that puts a player in the starting XI immediately
   * removes them from the bench and vice versa.
   */
  get benchPlayers(): SessionPlayer[] {
    const assigned = new Set<string>();
    for (const pid of this.slotAssignments.values()) {
      if (pid) { assigned.add(pid); }
    }
    return (this.data.squad ?? []).filter(p => !assigned.has(p.sessionPlayerId));
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
    // V25D81-BUG #4: the no-change check is now broader than the
    // F5 "formation string didn't change" check. We also treat the
    // case where the formation changed but the slot assignments are
    // identical to the original as a no-op (the backend's auto-fill
    // would re-derive the same lineup).
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    const slotsChanged = this.slotsDifferFromInitial();
    if (!formationChanged && !slotsChanged) {
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';
    // V25D81-BUG #4: build the slot list from the current
    // slotAssignments (post-drag state), with the position derived
    // from FORMATION_LINES_BY_FORMATION for the selected formation.
    // Empty slots (null playerId) are sent with empty sessionPlayerId
    // — the backend treats those as "no assignment" and auto-fills
    // with the next best player (per the F5 contract).
    const slots = this.buildSlotListForBackend();
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

  /**
   * V25D81-BUG #4: returns the current slot assignments as the
   * backend-shaped list of `{ sessionPlayerId, position, slotIndex }`.
   * Position is derived from the formation's role label at the
   * matching line/dot. Empty slots (null playerId) are emitted with
   * empty sessionPlayerId so the backend can auto-fill.
   */
  private buildSlotListForBackend(): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }> {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    const slots: Array<{ sessionPlayerId: string; position: string; slotIndex: number }> = [];
    let slotIdx = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        slots.push({
          sessionPlayerId: this.slotAssignments.get(slotIdx) ?? '',
          position: line[dotIdx],
          slotIndex: slotIdx
        });
        slotIdx++;
      }
    }
    return slots;
  }

  /**
   * V25D81-BUG #4: returns true when the current slotAssignments
   * differ from the initial currentSlots (in any slot). Used by
   * {@link confirm} to short-circuit the no-op path when the manager
   * only opened the modal and dragged nothing.
   */
  private slotsDifferFromInitial(): boolean {
    const initial = new Map<number, string>();
    for (const s of this.data.currentSlots ?? []) {
      initial.set(s.slotIndex, s.sessionPlayerId || '');
    }
    if (this.slotAssignments.size !== initial.size) {
      return true;
    }
    for (const [idx, pid] of this.slotAssignments) {
      const initialPid = initial.get(idx) ?? '';
      if ((pid ?? '') !== initialPid) {
        return true;
      }
    }
    return false;
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
