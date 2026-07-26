import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
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
  // Full manager squad, used for pitch names and bench drag/drop.
  squad: SessionPlayer[];
  // Session player ids currently assigned to the starting XI.
  startingIds: Set<string>;
}

// Shared source of truth for all formation dropdowns.
const FORMATIONS = ALL_FORMATIONS;

/**
 * Tactical slot labels used by the in-match formation editor.
 *
 * Each entry is rendered from goalkeeper to attack, left to right inside
 * every tactical line, and must stay aligned with the backend formation
 * definitions.
 */
const FORMATION_LINES_BY_FORMATION: Record<string, string[][]> = {
  // Standard formations
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
    ['GK'],
    ['CB', 'CB', 'CB'],
    ['LWB', 'CM', 'CM', 'RWB'],
    ['LW', 'ST', 'RW']
  ],
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
  '4-1-2-3': [
    ['GK'],
    ['LB', 'CB', 'CB', 'RB'],
    ['CDM'],
    ['CM', 'CM'],
    ['LW', 'ST', 'RW']
  ]
};

// Formation-change modal used during live matches.
// It lets the manager change shape, swap players, and keep the final slot list explicit.
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
  // Inline styles are kept here because component specs inspect the compiled styles.
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

    /* warning banner (orange) for the auto-fill
       "could not resolve slot" case. Lighter than .banner-error so
       the manager can still proceed. */
    .banner-warning {
      background: #fff8e1;
      color: #8a5300;
      border: 1px solid #ffe0a0;
    }

    /* visual cue that a slot was filled by
       autoFillEmptySlots. A thin yellow ring + a small badge inside
       the dot so the manager sees "system picked this player".
       Manual drag overrides clear the marker and the cue disappears. */
    .player-dot.is-auto-filled {
      box-shadow: 0 0 0 2px #f57c00, 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .player-dot.is-selected {
      box-shadow: 0 0 0 3px #00acc1, 0 1px 4px rgba(0, 0, 0, 0.35);
      transform: scale(1.08);
    }
    .player-dot.is-pixel-moved {
      border-color: #7b1fa2;
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

    /* Two-column pitch and bench layout on tablet and desktop. */
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
      /* Interactive drag/drop affordance. */
      cursor: grab;
      user-select: none;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .player-dot:active { cursor: grabbing; }
    /* Empty slots stay readable while looking available. */
    .player-dot.is-empty {
      background: #f5f7fa;
      border-style: dashed;
      color: #5a6473;
    }
    /* Highlight the source dot while dragging. */
    .player-dot.is-drag-source {
      transform: scale(0.92);
      box-shadow: 0 0 0 3px #d32f2f, 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    /* Keep long player names compact inside the dot. */
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

    /* Scrollable bench column with draggable player cards. */
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

    .pixel-controls {
      margin-top: 0.65rem;
      padding: 0.65rem;
      border: 1px solid #d8eafd;
      border-radius: 8px;
      background: #f7fbff;
    }

    .pixel-controls-header {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      font-size: 0.82rem;
      color: #1e3c72;
    }

    .pixel-pad {
      display: grid;
      grid-template-columns: repeat(5, minmax(44px, 1fr));
      gap: 0.35rem;
    }

    .pixel-pad button {
      min-width: 0;
      padding: 0 0.45rem;
    }

    .pixel-hint {
      margin-top: 0.5rem;
      margin-bottom: 0;
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

    :host :ng-deep .success-toast {
      --mdc-snackbar-container-color: #2e7d32;
      --mdc-snackbar-supporting-text-color: #ffffff;
      --mat-snack-bar-button-color: #c8e6c9;
      font-weight: 600;
    }

    /* Responsive — : progressive breakpoints for mobile
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

  // Mutable slot-to-player map used by the visual pitch and drag/drop flow.
  slotAssignments: Map<number, string | null> = new Map();

  selectedSlotIdx: number | null = null;

  private slotCoords: Map<number, { x: number; y: number }> = new Map();

  // Current drag source. Null means no active drag; bench drags are tracked separately.
  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench: boolean = false;

  // Tracks auto-filled slots so manual changes can clear the badge.
  readonly autoFilledSlots = new Map<number, string>();

  // Warning shown when an empty slot cannot be filled automatically.
  warningMsg = '';

  // Position compatibility groups used when auto-filling empty slots.
  private static readonly POSITION_GROUPS: Record<string, string[]> = {
    GK: ['GK'],
    DEF: ['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
    ATT: ['ATT', 'ST', 'CF', 'LW', 'RW']
  };

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
    // Initialize current pitch assignments from the dialog data.
    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
    }
    this.resetAllSlotCoords();
  }

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);
    // Keep the current XI order when changing formation shape.
    const currentXi = Array.from(this.slotAssignments.values()).filter((playerId): playerId is string => !!playerId);
    const newLineCount = (FORMATION_LINES_BY_FORMATION[newFormation] ?? []).reduce(
      (sum, line) => sum + line.length, 0
    );
    this.slotAssignments = new Map();
    for (let i = 0; i < newLineCount; i++) {
      this.slotAssignments.set(i, currentXi[i] ?? null);
    }
    this.selectedSlotIdx = null;
    this.resetAllSlotCoords();
    this.errorMsg = '';
  }

  // ========== HTML5 drag-and-drop handlers ==========

  // Start dragging a player already on the pitch.
  onSlotDragStart(event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = slotIdx;
    this.selectedSlotIdx = slotIdx;
    this.dragSourceIsBench = false;
    event.dataTransfer.setData('text/plain', `slot:${slotIdx}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  // Start dragging a bench player into the pitch.
  onBenchDragStart(event: DragEvent, playerId: string): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = -1;
    this.dragSourceIsBench = true;
    event.dataTransfer.setData('text/plain', `bench:${playerId}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  // Allow dropping onto a pitch slot.
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
      // when the manager drags a bench player INTO
      // an auto-filled slot, the manual assignment supersedes the
      // auto-fill marker. Drop the slot from autoFilledSlots so the
      // lock badge disappears.
      this.clearAutoFillMarker(targetSlotIdx);
      // The displaced player is now bench (or stays bench if the
      // target slot was empty). We don't track bench explicitly —
      // the bench list is recomputed from `data.squad` minus the
      // new slotAssignments.
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
      const sourceCoords = this.slotCoords.get(sourceSlot) ?? this.defaultCoordForSlot(sourceSlot);
      const targetCoords = this.slotCoords.get(targetSlotIdx) ?? this.defaultCoordForSlot(targetSlotIdx);
      this.slotCoords.set(targetSlotIdx, sourceCoords);
      this.slotCoords.set(sourceSlot, targetCoords);
      // clear auto-fill markers on BOTH slots after
      // a swap so the lock badge only remains for still-auto-filled
      // slots (a manually-modified slot is no longer "auto").
      this.clearAutoFillMarker(targetSlotIdx);
      this.clearAutoFillMarker(sourceSlot);
    }
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
    this.selectedSlotIdx = targetSlotIdx;
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

  // ========== auto-fill empty slots on confirm ==========

  // Fill empty formation slots with the first compatible bench player.
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
    // Trigger CD since we mutated slotAssignments + autoFilledSlots.
    this.selectedFormation.set(this.selectedFormation());
  }

  /**
   * Picks the first bench player compatible with the slot's role
   * label and assigns them. Updates both slotAssignments and
   * autoFilledSlots. Returns true on success, false when no
   * compatible bench exists. There is NO last-resort fallback: a
   * slot without a compatible bench stays empty and triggers the
   * warning banner (the backend's auto-fill on confirm takes over
   * if the manager accepts the gap).
   */
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

  /**
   * Returns the list of position strings compatible with a slot's
   * role label. Forwards the role label to its group, defaulting to
   * "any position" when the role is unknown.
   */
  private compatibleGroupForRole(roleLabel: string): string[] {
    const upper = (roleLabel || '').toUpperCase();
    for (const group of Object.keys(FormationModalComponent.POSITION_GROUPS)) {
      if (FormationModalComponent.POSITION_GROUPS[group].includes(upper)) {
        return FormationModalComponent.POSITION_GROUPS[group];
      }
    }
    const groups = FormationModalComponent.POSITION_GROUPS;
    return [
      ...groups['GK'],
      ...groups['DEF'],
      ...groups['MID'],
      ...groups['ATT']
    ];
  }

  /**
   * Test/UI hook: returns true if the given slot index was filled
   * by the auto-fill pass and the manager has not subsequently
   * dragged a different player into the slot.
   */
  isAutoFilledSlot(slotIdx: number): boolean {
    return this.autoFilledSlots.has(slotIdx);
  }

  /**
   * drag-drop override. When the manager drags a
   * different player into an auto-filled slot, we drop the slot from
   * {@link autoFilledSlots} so the lock icon disappears (manual
   * assignment takes priority over the auto-fill marker).
   */
  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
  }

  // Player assigned to a pitch slot, or null when the slot is empty.
  playerAtSlot(slotIdx: number): SessionPlayer | null {
    const pid = this.slotAssignments.get(slotIdx);
    if (!pid) {
      return null;
    }
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === pid) ?? null;
  }

  // Convert a line/dot pair into the flat slot index.
  getSlotIndex(lineIdx: number, dotIdx: number): number {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let idx = 0;
    for (let i = 0; i < lineIdx; i++) {
      idx += (lines[i]?.length ?? 0);
    }
    return idx + dotIdx;
  }

  // Template-facing no-op guard for the Confirm button.
  slotsDifferFromInitialPublic(): boolean {
    return this.slotsDifferFromInitial();
  }

  hasAnyChange(): boolean {
    return this.slotsDifferFromInitial() || this.coordsDifferFromDefault();
  }

  selectSlot(slotIdx: number): void {
    this.selectedSlotIdx = slotIdx;
    if (!this.slotCoords.has(slotIdx)) {
      this.slotCoords.set(slotIdx, this.defaultCoordForSlot(slotIdx));
    }
  }

  selectedSlotLabel(): string {
    if (this.selectedSlotIdx === null) {
      return 'Sin jugador seleccionado';
    }
    const player = this.playerAtSlot(this.selectedSlotIdx);
    const role = this.roleForSlot(this.selectedSlotIdx);
    return `${player?.name ?? role} · ${role} · ${this.slotCoordLabel(this.selectedSlotIdx)}`;
  }

  isSelectedSlotLocked(): boolean {
    return this.selectedSlotIdx === null || this.selectedSlotIdx === 0;
  }

  nudgeSelectedSlot(deltaX: number, deltaY: number): void {
    if (this.selectedSlotIdx === null || this.selectedSlotIdx === 0) {
      return;
    }
    const current = this.slotCoords.get(this.selectedSlotIdx) ?? this.defaultCoordForSlot(this.selectedSlotIdx);
    this.slotCoords.set(this.selectedSlotIdx, {
      x: this.clampPercent(current.x + deltaX, 4, 96),
      y: this.clampPercent(current.y + deltaY, 8, 92),
    });
    this.selectedFormation.set(this.selectedFormation());
  }

  resetSelectedSlotCoords(): void {
    if (this.selectedSlotIdx === null || this.selectedSlotIdx === 0) {
      return;
    }
    this.slotCoords.set(this.selectedSlotIdx, this.defaultCoordForSlot(this.selectedSlotIdx));
    this.selectedFormation.set(this.selectedFormation());
  }

  isPixelMoved(slotIdx: number): boolean {
    const current = this.slotCoords.get(slotIdx) ?? this.defaultCoordForSlot(slotIdx);
    const base = this.defaultCoordForSlot(slotIdx);
    return Math.abs(current.x - base.x) >= 0.5 || Math.abs(current.y - base.y) >= 0.5;
  }

  slotCoordLabel(slotIdx: number): string {
    const coord = this.slotCoords.get(slotIdx) ?? this.defaultCoordForSlot(slotIdx);
    return `${coord.x.toFixed(0)} / ${coord.y.toFixed(0)}`;
  }

  // Bench players are the squad members not currently assigned to pitch slots.
  get benchPlayers(): SessionPlayer[] {
    const assigned = new Set<string>();
    for (const pid of this.slotAssignments.values()) {
      if (pid) { assigned.add(pid); }
    }
    return (this.data.squad ?? []).filter(p => !assigned.has(p.sessionPlayerId));
  }

  // Count of players per tactical line for the visual pitch.
  get formationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2]; // fallback defensivo
    }
    return lines.map(line => line.length);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // MatDialog's default Escape close calls
    // dialogRef.close(undefined) which is fine for parent subscribers
    // but doesn't surface the "cancelled" reason through our normal
    // cancel() method. Hook the Escape key to route through the same
    // cancel() handler that the "Cancelar" button uses so the close
    // reason is consistent across both close paths.
    if (!this.isSubmitting) {
      this.cancel();
    }
  }

  confirm(): void {
    if (this.isSubmitting) { return; }
    // Close as no-op when formation, players and pixel coordinates are unchanged.
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    const slotsChanged = this.slotsDifferFromInitial();
    const coordsChanged = this.coordsDifferFromDefault();
    if (!formationChanged && !slotsChanged && !coordsChanged) {
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    // Auto-fill empty slots before sending the final shape.
    this.isSubmitting = true;
    this.errorMsg = '';
    // Build the backend payload from the current visual slot state.
    const slots = this.buildSlotListForBackend();
    const openedWithFullXi = (this.data.currentSlots?.length ?? 0) >= 10;
    if (openedWithFullXi && slots.some(slot => !slot.sessionPlayerId)) {
      this.isSubmitting = false;
      this.errorMsg = 'No se puede confirmar: todos los slots visibles deben tener un jugador real. Cerrá y reabrí el modal si ves sólo roles.';
      return;
    }
    this.engineService.changeFormation(this.data.matchId, slots, this.selectedFormation())
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
        error: () => {
          this.isSubmitting = false;
          this.errorMsg = 'Error de red al intentar cambiar la formación';
        }
      });
  }

  // Current slot assignments in the shape expected by the backend.
  private buildSlotListForBackend(): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent: number | null;
    customYPercent: number | null;
  }> {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    const slots: Array<{
      sessionPlayerId: string;
      position: string;
      slotIndex: number;
      customXPercent: number | null;
      customYPercent: number | null;
    }> = [];
    let slotIdx = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        const coord = this.slotCoords.get(slotIdx) ?? this.defaultCoordForSlot(slotIdx);
        slots.push({
          sessionPlayerId: this.slotAssignments.get(slotIdx) ?? '',
          position: line[dotIdx],
          slotIndex: slotIdx,
          customXPercent: coord.x,
          customYPercent: coord.y
        });
        slotIdx++;
      }
    }
    return slots;
  }

  private resetAllSlotCoords(): void {
    this.slotCoords = new Map();
    const count = this.formationLines.reduce((sum, lineCount) => sum + lineCount, 0);
    for (let slotIdx = 0; slotIdx < count; slotIdx++) {
      this.slotCoords.set(slotIdx, this.defaultCoordForSlot(slotIdx));
    }
  }

  private coordsDifferFromDefault(): boolean {
    for (const [slotIdx, coord] of this.slotCoords) {
      const base = this.defaultCoordForSlot(slotIdx);
      if (Math.abs(coord.x - base.x) >= 0.5 || Math.abs(coord.y - base.y) >= 0.5) {
        return true;
      }
    }
    return false;
  }

  private defaultCoordForSlot(slotIdx: number): { x: number; y: number } {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let cursor = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        if (cursor === slotIdx) {
          return {
            x: ((dotIdx + 1) / (line.length + 1)) * 100,
            y: ((lineIdx + 1) / (lines.length + 1)) * 100,
          };
        }
        cursor++;
      }
    }
    return { x: 50, y: 50 };
  }

  private roleForSlot(slotIdx: number): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let cursor = 0;
    for (const line of lines) {
      for (const role of line) {
        if (cursor === slotIdx) {
          return role;
        }
        cursor++;
      }
    }
    return '?';
  }

  private clampPercent(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // True when current assignments differ from the original dialog state.
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

  // Role label shown on each player dot.
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
