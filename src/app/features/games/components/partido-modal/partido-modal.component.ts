import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { ALL_FORMATIONS, FormationCode } from '../../../../shared/constants/formations';
import { SessionPlayer } from '../../../../shared/models/player.model';

export interface PartidoDialogData {
  matchId: string;
  /** Current formation string (e.g. "4-4-2") for the manager team. */
  currentFormation: string;
  homeTeamId: string;
  /** Manager-side current slots (sessionPlayerId + position + slotIndex). */
  currentSlots: Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }>;
  /** Manager squad (starters + bench combined). */
  squad: SessionPlayer[];
  /** sessionPlayerIds currently in the starting XI (subset of squad). */
  startingIds: Set<string>;
  /**
   * V25D89-FRONT-A: rival formation string (e.g. "4-3-3") sourced from
   * {@code state.awayFormation}. Read-only — the AI controls the rival.
   * The rival tab renders this formation's pitch layout (role labels only,
   * no player names because the rival XI is not exposed by the SSE feed —
   * see report section 1.3 / known-limitation V25D89.1).
   */
  rivalFormation: string;
}

/**
 * V25D89-FRONT-A: per-formation role labels por dot. Mirrors the same map
 * in {@code formation-modal.component.ts} (F5) so the manager-side and
 * rival-side pitches use the same role vocabulary. Kept in sync by hand —
 * any formation added to {@link FORMATION_LINES_BY_FORMATION} in the F5
 * modal must be added here too (or vice-versa). The 12 formations match
 * {@link ALL_FORMATIONS}.
 */
const FORMATION_LINES_BY_FORMATION: Record<string, string[][]> = {
  '4-4-2':       [['GK'], ['LB', 'CB', 'CB', 'RB'], ['LM', 'CM', 'CM', 'RM'], ['ST', 'ST']],
  '4-3-3':       [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CM', 'CM', 'CM'], ['LW', 'ST', 'RW']],
  '3-5-2':       [['GK'], ['CB', 'CB', 'CB'], ['LWB', 'CM', 'CM', 'CM', 'RWB'], ['ST', 'ST']],
  '4-2-3-1':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM', 'CDM'], ['LW', 'CAM', 'RW'], ['ST']],
  '5-3-2':       [['GK'], ['LB', 'CB', 'CB', 'CB', 'RB'], ['CM', 'CM', 'CM'], ['ST', 'ST']],
  '4-1-4-1':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM'], ['LM', 'CM', 'CM', 'RM'], ['ST']],
  '3-4-3':       [['GK'], ['CB', 'CB', 'CB'], ['LWB', 'CM', 'CM', 'RWB'], ['LW', 'ST', 'RW']],
  '3-5-2-CDM':   [['GK'], ['CB', 'CB', 'CB'], ['CDM'], ['CM', 'CM'], ['LWB', 'RWB'], ['ST', 'ST']],
  '5-4-1':       [['GK'], ['LB', 'CB', 'CB', 'CB', 'RB'], ['LM', 'CM', 'CM', 'RM'], ['ST']],
  '3-4-1-2':     [['GK'], ['CB', 'CB', 'CB'], ['LWB', 'CM', 'CM', 'RWB'], ['CAM'], ['ST', 'ST']],
  '4-2-2-2':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM', 'CDM'], ['LM', 'RM'], ['ST', 'ST']],
  '4-3-3-1':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM'], ['CM', 'CM'], ['LW', 'ST', 'RW']]
};

/**
 * V25D89-FRONT-A: Partido modal — unified "Partido" entry point that
 * shows BOTH the manager's formation (editable) AND the rival's formation
 * (read-only) in a single modal.
 *
 * <p>Two tabs via {@code mat-tab-group}:
 * <ul>
 *   <li><b>"Mi Formación"</b> — editable pitch with drag-and-drop,
 *       formation dropdown, auto-fill bench. Reuses the SAME slot→player
 *       data flow as the existing F5
 *       {@code FormationModalComponent}. Why not embed the F5 component
 *       directly? Because {@code FormationModalComponent} injects
 *       {@code MAT_DIALOG_DATA} + {@code MatDialogRef} (a MatDialog leaf
 *       component), and providing stub tokens to it inside another
 *       MatDialog is brittle — every F5 close() call would need a
 *       re-emit bridge to the parent. Reimplementing the pitch+drag
 *       logic here is bounded duplication (~150 lines) and keeps F5
 *       untouched. The F5 spec continues to test the formation flow
 *       independently, and this spec tests the partido flow.</li>
 *   <li><b>"Formación Rival"</b> — read-only pitch with the rival's
 *       formation string. Dots are grayed out + show only role labels
 *       (no player names because the rival XI is not exposed by the
 *       SSE feed — known-limitation V25D89.1 follow-up). Banner at the
 *       top: "🤖 Lo maneja la IA — no editable durante el partido".</li>
 * </ul>
 *
 * <p>Footer: <b>"Descartar"</b> closes the modal without saving;
 * <b>"Guardar"</b> POSTs the formation change to the backend via
 * {@code MatchEngineService.changeFormation} and then closes.
 *
 * <p>Save semantics: matches the F5 modal. {@code autoFillEmptySlots}
 * fills every empty slot from the bench before POSTing (with a lock
 * badge for auto-filled slots, same as F5). On success, snackbar
 * shows "Formación cambiada a {formation}" and dialog closes with
 * {@code success: true}. On error, the inline error banner surfaces
 * the backend's error message and the modal stays open so the manager
 * can correct.
 *
 * <p>V25D89-FRONT-A: NO backend changes — the formation endpoint
 * {@code POST /api/v1/match-engine/matches/{matchId}/formation} already
 * exists (see {@code FormationChangeController.java}) and is the same
 * one F5 calls.
 *
 * <p>V25D56-style inlined styles: {@code styles: [...]} instead of
 * {@code styleUrls: [...]} so {@code ɵcmp.styles} exposes the CSS
 * source to unit tests (per angular-testing-patterns memory — the
 * .css companion file is kept for IDE hints only).
 */
@Component({
  selector: 'app-partido-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './partido-modal.component.html',
  // V25D56 (Sprint C17) + V25D79 (Sprint C18) convention: NO `styleUrls`
  // because the Karma/test webpack config does not have a CSS loader
  // (only `styles: [...]` inline arrays work). The .css companion file
  // is kept on disk for IDE hints only — see partido-modal.component.css.
  styles: [`
    .partido-modal-root {
      min-width: 460px;
      max-width: 720px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .title-icon { margin-right: 0.4rem; }

    .minute-tag {
      display: inline-block;
      margin-left: 0.6rem;
      padding: 0.15rem 0.5rem;
      background: #e0e0e0;
      color: #1e3c72;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      vertical-align: middle;
    }

    .partido-modal-content { padding-top: 0.5rem; }

    /* V25D89-FRONT-A: banner styling mirrors the F5 modal's banner so
       the look-and-feel is consistent across both modal entry points. */
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
    .banner-warning {
      background: #fff8e1;
      color: #8a5300;
      border: 1px solid #ffe0a0;
    }
    /* V25D89-FRONT-A: AI-managed banner for the rival tab. Blue tone to
       distinguish from red error / yellow warning. */
    .banner-info-ai {
      background: #e3f2fd;
      color: #0d47a1;
      border: 1px solid #bbdefb;
    }

    /* ========== Visual pitch (shared between manager + rival tabs) ========== */

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
      cursor: grab;
      user-select: none;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .player-dot:active { cursor: grabbing; }

    .player-dot.is-gk  { background: #ffc107; border-color: #ff6f00; }
    .player-dot.is-def { background: #bbdefb; }
    .player-dot.is-mid,
    .player-dot.is-mid2 { background: #c8e6c9; }
    .player-dot.is-att { background: #ffcdd2; border-color: #b71c1c; color: #b71c1c; }

    .player-dot.is-empty {
      background: #f5f7fa;
      border-style: dashed;
      color: #5a6473;
    }

    .player-dot.is-drag-source {
      transform: scale(0.92);
      box-shadow: 0 0 0 3px #d32f2f, 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* V25D89-FRONT-A: auto-fill lock badge (same as F5 modal). */
    .player-dot.is-auto-filled {
      box-shadow: 0 0 0 2px #f57c00, 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .auto-fill-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #f57c00;
      font-size: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 2;
    }

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

    .dot-label { user-select: none; }

    /* ========== V25D89-FRONT-A: rival tab — read-only ========== */

    .rival-pitch-wrapper {
      padding: 0.5rem 0;
    }

    /* V25D89-FRONT-A: rival dots are visually de-emphasized (grayed
       out) and interaction-disabled (no pointer events, no cursor).
       No drag handlers are bound. */
    .rival-pitch .player-dot {
      cursor: default;
      opacity: 0.55;
      pointer-events: none;
    }
    .rival-pitch .player-dot:hover {
      transform: none;
    }

    /* V25D89-FRONT-A: the rival formation header is a non-interactive
       read-only display of the awayFormation string (no mat-select). */
    .rival-formation-readonly {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: #e3f2fd;
      color: #0d47a1;
      border: 1px solid #90caf9;
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    /* ========== Manager-tab: bench + grid (F5 mirror) ========== */

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

    /* ========== V25D89-FRONT-A: tab styling (mat-tab overrides) ========== */

    .partido-tabs ::ng-deep .mat-mdc-tab-header {
      background: #f5f7fa;
      border-radius: 6px 6px 0 0;
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

    .partido-modal-actions { padding: 0.5rem 1rem; }

    /* V25D89-FRONT-A: success toast styling (snackbar) — same as F5. */
    :host ::ng-deep .success-toast {
      --mdc-snackbar-container-color: #2e7d32;
      --mdc-snackbar-supporting-text-color: #ffffff;
      --mat-snack-bar-button-color: #c8e6c9;
      font-weight: 600;
    }

    /* ========== Responsive — V25D56 mirror ========== */

    @media (max-width: 600px) {
      .partido-modal-root {
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
      .formation-row { margin-bottom: 0.5rem; }
    }

    @media (min-width: 601px) and (max-width: 1024px) {
      .partido-modal-root {
        min-width: 360px;
        max-width: 480px;
      }
      .pitch { padding: 0.5rem 0.35rem; gap: 0.35rem; }
      .pitch-line { gap: 8px; }
      .player-dot {
        width: 24px;
        height: 24px;
        min-width: 18px;
        max-width: 28px;
        font-size: 0.7rem;
      }
      .dot-label { font-size: 0.7rem; }
    }

    @media (min-width: 1600px) {
      .partido-modal-root { max-width: 800px; }
      .player-dot {
        width: 36px;
        height: 36px;
        font-size: 0.8rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartidoModalComponent {

  readonly data: PartidoDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PartidoModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);

  /** Available formations (12 codes from the shared constants). */
  readonly formations: readonly string[] = ALL_FORMATIONS;

  // ========== V25D89-FRONT-A: tab state ==========

  /** Currently visible tab. Default = 'mine' (manager formation first). */
  readonly activeTab = signal<'mine' | 'rival'>('mine');

  // ========== V25D89-FRONT-A: manager-tab formation state (F5 mirror) ==========

  /** Currently selected formation (signal-based for OnPush). */
  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  /**
   * Mutable slot→playerId map. Initialized from {@code data.currentSlots}
   * and updated by drag-and-drop handlers + formation-change re-flow. The
   * visual pitch template binds to this map to render the player name
   * in each dot.
   */
  slotAssignments: Map<number, string | null> = new Map();

  /** id of the slot currently being dragged (or null when idle). */
  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench = false;

  /** Slots that were filled by the auto-fill pass — render a lock icon. */
  readonly autoFilledSlots = new Map<number, string>();

  /** Warning surfaced when at least one slot could not be auto-filled. */
  warningMsg = '';

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  /**
   * Position group mapping for the bench fill — mirrors the F5 modal's
   * POSITION_GROUPS so the auto-fill behavior is consistent across both
   * modal entry points.
   */
  private static readonly POSITION_GROUPS: Record<string, string[]> = {
    GK:  ['GK'],
    DEF: ['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
    ATT: ['ATT', 'ST', 'CF', 'LW', 'RW']
  };

  /**
   * V25D89-FRONT-A: footer signal — true when the manager has unsaved
   * changes (formation string OR slot assignments differ from initial).
   * Drives the "Guardar" button enable/disable. Recomputed reactively
   * whenever selectedFormation changes or slotAssignments mutates (via
   * the no-op {@code selectedFormation.set} bump trick from F5).
   */
  readonly hasPendingChanges = computed(() => {
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    const slotsChanged = this.slotsDifferFromInitial();
    return formationChanged || slotsChanged;
  });

  // ========== V25D89-FRONT-A: rival-tab formation ==========

  /**
   * Rival formation (read-only). Sourced from
   * {@code data.rivalFormation} (which is {@code state.awayFormation}).
   * Normalized via {@link normalizeFormation} so the rival tab falls
   * back to 4-4-2 if the SSE feed carries a stale or unknown string.
   */
  readonly rivalFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.rivalFormation)
  );

  constructor() {
    // V25D89-FRONT-A: initialize slotAssignments from the dialog data.
    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
    }
  }

  private normalizeFormation(input: string): FormationCode {
    const normalized = (input || '').replace(/\s/g, '');
    if ((ALL_FORMATIONS as readonly string[]).includes(normalized)) {
      return normalized as FormationCode;
    }
    return '4-4-2';
  }

  // ========== V25D89-FRONT-A: manager-tab event handlers (F5 mirror) ==========

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);
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

  /** Tab change handler — drives the "Mi Formación" / "Formación Rival" UI. */
  onTabChange(idx: number): void {
    this.activeTab.set(idx === 0 ? 'mine' : 'rival');
  }

  // ========== Drag-and-drop handlers (HTML5, F5 mirror) ==========

  onSlotDragStart(event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = slotIdx;
    this.dragSourceIsBench = false;
    event.dataTransfer.setData('text/plain', `slot:${slotIdx}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  onBenchDragStart(event: DragEvent, playerId: string): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = -1;
    this.dragSourceIsBench = true;
    event.dataTransfer.setData('text/plain', `bench:${playerId}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  onSlotDragOver(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  onSlotDrop(event: DragEvent, targetSlotIdx: number): void {
    event.preventDefault();
    if (this.dragSourceSlotIdx === null) {
      return;
    }
    if (this.dragSourceIsBench) {
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const playerId = raw.startsWith('bench:') ? raw.substring(6) : null;
      if (!playerId) {
        return;
      }
      this.slotAssignments.set(targetSlotIdx, playerId);
      this.clearAutoFillMarker(targetSlotIdx);
    } else {
      const sourceSlot = this.dragSourceSlotIdx;
      if (sourceSlot === targetSlotIdx) {
        return;
      }
      const sourcePlayer = this.slotAssignments.get(sourceSlot) ?? null;
      const targetPlayer = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, sourcePlayer);
      this.slotAssignments.set(sourceSlot, targetPlayer);
      this.clearAutoFillMarker(targetSlotIdx);
      this.clearAutoFillMarker(sourceSlot);
    }
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
    // Force CD by bumping the formation signal (signals don't track Map
    // mutations, so we need a tick to re-render the dots + the
    // hasPendingChanges computed).
    this.selectedFormation.set(this.selectedFormation());
  }

  onSlotDragEnd(): void {
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
  }

  // ========== Auto-fill empty slots (F5 mirror) ==========

  autoFillEmptySlots(): void {
    this.autoFilledSlots.clear();
    this.warningMsg = '';
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let slotIdx = 0;
    let unfilled = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        const current = this.slotAssignments.get(slotIdx);
        if (current) {
          slotIdx++;
          continue;
        }
        const roleLabel = line[dotIdx];
        const filled = this.tryFillSlot(slotIdx, roleLabel);
        if (!filled) {
          unfilled++;
        }
        slotIdx++;
      }
    }
    if (unfilled > 0) {
      this.warningMsg = `${unfilled} posición(es) no se pudieron completar — no hay suficientes jugadores en el banquillo con posición compatible.`;
    }
    this.selectedFormation.set(this.selectedFormation());
  }

  private tryFillSlot(slotIdx: number, roleLabel: string): boolean {
    const compatibleGroups = this.compatibleGroupForRole(roleLabel);
    const bench = this.benchPlayers;
    const pick = bench.find(p => compatibleGroups.includes((p.position || '').toUpperCase()));
    if (!pick) {
      return false;
    }
    this.slotAssignments.set(slotIdx, pick.sessionPlayerId);
    this.autoFilledSlots.set(slotIdx, pick.sessionPlayerId);
    return true;
  }

  private compatibleGroupForRole(roleLabel: string): string[] {
    const upper = (roleLabel || '').toUpperCase();
    for (const group of Object.keys(PartidoModalComponent.POSITION_GROUPS)) {
      if (PartidoModalComponent.POSITION_GROUPS[group].includes(upper)) {
        return PartidoModalComponent.POSITION_GROUPS[group];
      }
    }
    const groups = PartidoModalComponent.POSITION_GROUPS;
    return [
      ...groups['GK'],
      ...groups['DEF'],
      ...groups['MID'],
      ...groups['ATT']
    ];
  }

  isAutoFilledSlot(slotIdx: number): boolean {
    return this.autoFilledSlots.has(slotIdx);
  }

  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
  }

  // ========== V25D89-FRONT-A: pitch helpers (F5 mirror) ==========

  playerAtSlot(slotIdx: number): SessionPlayer | null {
    const pid = this.slotAssignments.get(slotIdx);
    if (!pid) {
      return null;
    }
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === pid) ?? null;
  }

  getSlotIndex(lineIdx: number, dotIdx: number): number {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let idx = 0;
    for (let i = 0; i < lineIdx; i++) {
      idx += (lines[i]?.length ?? 0);
    }
    return idx + dotIdx;
  }

  get benchPlayers(): SessionPlayer[] {
    const assigned = new Set<string>();
    for (const pid of this.slotAssignments.values()) {
      if (pid) { assigned.add(pid); }
    }
    return (this.data.squad ?? []).filter(p => !assigned.has(p.sessionPlayerId));
  }

  get formationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2];
    }
    return lines.map(line => line.length);
  }

  getDotLabel(lineIdx: number, n: number, _count: number, _isLast: boolean): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][n] ?? '';
  }

  // ========== V25D89-FRONT-A: rival-tab helpers ==========

  /**
   * Pitch lines for the rival formation. Mirrors the manager tab's
   * {@link formationLines} but uses {@link rivalFormation} (read-only).
   */
  get rivalFormationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2];
    }
    return lines.map(line => line.length);
  }

  /** Role label for a rival dot — no player name (rival XI not exposed). */
  getRivalDotLabel(lineIdx: number, dotIdx: number): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][dotIdx] ?? '';
  }

  // ========== V25D89-FRONT-A: diff + save ==========

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

  // ========== V25D89-FRONT-A: footer actions ==========

  /**
   * V25D89-FRONT-A: footer "Guardar" handler. Mirrors F5's
   * {@code FormationModalComponent.confirm} but exposed as
   * {@link save} to match the task spec's label ("Guardar" instead of
   * "Confirmar"). POSTs the formation change via
   * {@code MatchEngineService.changeFormation} and closes the dialog
   * on success.
   */
  save(): void {
    if (this.isSubmitting) {
      return;
    }
    if (!this.hasPendingChanges()) {
      // No changes — close immediately without API call.
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    this.autoFillEmptySlots();
    this.isSubmitting = true;
    this.errorMsg = '';
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
            this.dialogRef.close({
              success: true,
              result,
              formation: this.selectedFormation()
            });
          } else {
            this.errorMsg = result.error || 'Cambio de formación rechazado por el servidor';
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMsg = 'Error de red al intentar cambiar la formación';
          console.error('[PARTIDO-MODAL] error', err);
        }
      });
  }

  /**
   * V25D89-FRONT-A: footer "Descartar" handler. Closes the dialog
   * without saving — the dialog opens again with the original
   * formation (SSE-driven vm$ is untouched).
   */
  discard(): void {
    this.dialogRef.close({ success: false, reason: 'discarded' });
  }

  /** @deprecated alias kept for symmetry with F5 modal — calls discard. */
  cancel(): void {
    this.discard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}