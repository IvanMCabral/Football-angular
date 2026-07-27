import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
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
import { from, of, Subject, takeUntil } from 'rxjs';
import { concatMap, finalize, switchMap, timeout, toArray } from 'rxjs/operators';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { ALL_FORMATIONS, FormationCode } from '../../../../shared/constants/formations';
import { SessionPlayer } from '../../../../shared/models/player.model';
import { MatchEvent } from '../../../../core/services/match-engine.model';
import {
  buildPartidoStatsRows,
  displayPartidoEventDescription,
  displayPartidoPosition,
  getPartidoEventIcon,
  PartidoStatRow,
  recentPartidoEvents
} from './partido-modal-match-view.utils';
import {
  clampPartidoPercent,
  isFinitePercent,
  readPartidoPlayerCoords,
  writePartidoPlayerCoords
} from './partido-modal-player-coords-storage.utils';

interface PendingPartidoSubstitution {
  playerOffId: string;
  playerOnId: string;
  slotIndex: number;
}

export interface PartidoDialogData {
  matchId: string;
  /** Current formation string (e.g. "4-4-2") for the manager team. */
  currentFormation: string;
  homeTeamId: string;
  /** Rival team id used to split match events into home/away stats. */
  awayTeamId?: string;
  /** Manager-side current slots (sessionPlayerId + position + slotIndex). */
  currentSlots: Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>;
  /** Manager squad (starters + bench combined). */
  squad: SessionPlayer[];
  /** sessionPlayerIds currently in the starting XI (subset of squad). */
  startingIds: Set<string>;
  /**
   * Optional live-injury focus. When a forced injury opens Partido, the
   * injured starter is highlighted so the manager can pick a replacement,
   * change formation and fine-tune pixels in one professional flow.
   */
  preSelectedPlayerId?: string;
  reason?: 'INJURY_FORCED_SUBSTITUTION' | string;
  /** Read-only rival formation shown in the rival tab. */
  rivalFormation: string;
  /** Live minute shown in the modal header and stats section. */
  currentMinute?: number;
  /** Current score from the live match snapshot. */
  score?: { home: number; away: number };
  /** Live possession percentages from the match snapshot. */
  homePossession?: number;
  awayPossession?: number;
  /** Human-readable team names; ids are used as fallback. */
  homeTeamName?: string;
  awayTeamName?: string;
  /** Full live event timeline used for stats and recent events. */
  events?: MatchEvent[];
  /** Remaining substitutions for the manager team. */
  substitutionsRemaining?: number;
}

/** Role labels rendered by each formation line in the live pitch. */
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
  '4-1-2-3':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM'], ['CM', 'CM'], ['LW', 'ST', 'RW']]
};

/** Live match dialog for formation edits, substitutions, rival view and stats. */
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
  styleUrl: './partido-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartidoModalComponent {

  readonly data: PartidoDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PartidoModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  /** Available formations (12 codes from the shared constants). */
  readonly formations: readonly string[] = ALL_FORMATIONS;

  // ========== Tab state ==========

  /** Currently visible tab. Default = 'mine' (manager formation first). */
  readonly activeTab = signal<'mine' | 'rival'>('mine');

  // ========== Live match stats ==========

  // Snapshot events used by stats and timeline sections.
  private readonly eventList = (): MatchEvent[] => this.data.events ?? [];

  // Derived match stats shown in both manager and rival tabs.
  statsRows(): PartidoStatRow[] {
    return buildPartidoStatsRows({
      events: this.eventList(),
      homeTeamId: this.data.homeTeamId,
      awayTeamId: this.data.awayTeamId ?? '',
      score: this.data.score,
      homePossession: this.data.homePossession,
      awayPossession: this.data.awayPossession
    });
  }

  /**
   * : last 6 events, most recent first. Drives the timeline section
   * below the stats. Capped at 6 so the section stays within ~140px (the
   * modal's available height after the pitch + bench + stats + footer).
   * No pagination  -  the timeline is a glance, not a full event log; the
   * match-card already has a fuller feed on the round-live page.
   */
  recentEvents(): MatchEvent[] {
    return recentPartidoEvents(this.eventList());
  }

  /**
   * : true when the modal has received at least one event. Drives
   * the "stats disponibles cuando arranque el partido" empty state.
   */
  hasEvents(): boolean {
    return this.eventList().length > 0;
  }

  /**
   * : current minute accessor used by the template header tag.
   * Falls back to 0 when the modal opens while the round hasn't ticked
   * yet (NOT_STARTED  ->  minute 0).
   */
  currentMinute(): number {
    return this.data.currentMinute ?? 0;
  }

  // Home score accessor used by the title chip and stats header.
  homeScore(): number {
    return this.data.score?.home ?? 0;
  }

  /** Away score accessor. */
  awayScore(): number {
    return this.data.score?.away ?? 0;
  }

  /** Remaining manager substitutions. */
  substitutionsRemaining(): number {
    return this.data.substitutionsRemaining ?? 5;
  }

  /** Human-readable event icon for the timeline. */
  getEventIcon(eventType: string): string {
    return getPartidoEventIcon(eventType);
  }

  displayPosition(position: string | null | undefined): string {
    return displayPartidoPosition(position);
  }

  displayEventDescription(event: MatchEvent | null | undefined): string {
    return displayPartidoEventDescription(event);
  }

  // ========== Manager-tab formation state ==========

  /** Currently selected formation (signal-based for OnPush). */
  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  // Mutable slot-to-player map used by the visual pitch and drag/drop flow.
  slotAssignments: Map<number, string | null> = new Map();

  /**
   * : free-position overrides for the live Partido pitch.
   * Keyed by slot index; values are percentages relative to the pitch.
   */
  freeSlotCoords: Map<number, { x: number; y: number }> = new Map();
  private readonly freePositionRevision = signal(0);

  pendingSubstitutions: PendingPartidoSubstitution[] = [];
  private readonly pendingSubstitutionRevision = signal(0);
  selectedBenchPlayerId: string | null = null;
  selectedNudgeSlotIdx: number | null = null;
  private activeSaveToken: symbol | null = null;
  private initialSlotAssignments: Map<number, string | null> = new Map();
  private initialFreeSlotCoords: Map<number, { x: number; y: number }> = new Map();

  /** id of the slot currently being dragged (or null when idle). */
  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench = false;
  activePointerDragSlotIdx: number | null = null;
  private pointerDragStartCoords: { x: number; y: number } | null = null;
  private pointerDragMoved = false;
  private suppressNextSlotClick = false;

  /** Slots that were filled by the auto-fill pass  -  render a lock icon. */
  readonly autoFilledSlots = new Map<number, string>();
  readonly autoFillSourcePlayerBySlot = new Map<number, string>();

  /** Warning surfaced when at least one slot could not be auto-filled. */
  warningMsg = '';

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  /** Position groups used to fill compatible bench players. */
  private static readonly POSITION_GROUPS: Record<string, string[]> = {
    GK:  ['GK'],
    DEF: ['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
    ATT: ['ATT', 'ST', 'CF', 'LW', 'RW']
  };

  /** True when formation, slot positions or pending substitutions changed. */
  readonly hasPendingChanges = computed(() => {
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    this.freePositionRevision();
    this.pendingSubstitutionRevision();
    const slotsChanged = this.slotsDifferFromInitial();
    return formationChanged || slotsChanged || this.pendingSubstitutions.length > 0;
  });

  // ========== Rival-tab formation ==========

  // Read-only rival formation, normalized for safe rendering.
  readonly rivalFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.rivalFormation)
  );

  constructor() {
    // : initialize slotAssignments from the dialog data.
    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
      if (this.isFinitePercent(s.customXPercent) && this.isFinitePercent(s.customYPercent)) {
        this.freeSlotCoords.set(s.slotIndex, {
          x: this.clampPercent(s.customXPercent),
          y: this.clampPercent(s.customYPercent)
        });
      }
    }
    this.sanitizeDuplicateSlotAssignments();
    this.hydrateRememberedPlayerCoords();
    this.captureInitialSlotSnapshot();
    this.autoFillEmptySlots();
    if (this.autoFilledSlots.size === 0) {
      this.captureInitialSlotSnapshot();
    }
    this.focusPreSelectedPlayerIfPresent();
  }

  private focusPreSelectedPlayerIfPresent(): void {
    const playerId = this.data.preSelectedPlayerId;
    if (!playerId) {
      return;
    }
    const slotIdx = this.slotIndexByPlayerId(playerId);
    if (slotIdx === null) {
      return;
    }
    this.selectedNudgeSlotIdx = slotIdx;
    if (this.data.reason === 'INJURY_FORCED_SUBSTITUTION') {
      this.errorMsg = `${this.playerNameById(playerId)} está lesionado: elegí un suplente y tocá su ficha para preparar el cambio. También podés ajustar formación y píxeles antes de guardar.`;
    }
  }

  private slotIndexByPlayerId(playerId: string): number | null {
    for (const [slotIdx, assignedPlayerId] of this.slotAssignments.entries()) {
      if (assignedPlayerId === playerId) {
        return slotIdx;
      }
    }
    return null;
  }

  private normalizeFormation(input: string): FormationCode {
    const normalized = (input || '').replace(/\s/g, '');
    if ((ALL_FORMATIONS as readonly string[]).includes(normalized)) {
      return normalized as FormationCode;
    }
    return '4-4-2';
  }

  // ========== Manager-tab event handlers ==========

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);
    const currentXi = Array.from(this.slotAssignments.values()).filter((playerId): playerId is string => !!playerId);
    const autoFilledPlayerIds = new Set(Array.from(this.autoFilledSlots.values()).filter(Boolean));
    const autoFillSourceByPlayerId = new Map<string, string>();
    for (const [slotIdx, playerId] of this.autoFilledSlots) {
      const sourcePlayerId = this.autoFillSourcePlayerBySlot.get(slotIdx);
      if (playerId && sourcePlayerId) {
        autoFillSourceByPlayerId.set(playerId, sourcePlayerId);
      }
    }
    const coordsByPlayerId = new Map<string, { x: number; y: number }>();
    for (const [slotIdx, playerId] of this.slotAssignments) {
      if (!playerId) {
        continue;
      }
      const coords = this.freeSlotCoords.get(slotIdx);
      if (coords) {
        coordsByPlayerId.set(playerId, coords);
      }
    }
    const newLineCount = (FORMATION_LINES_BY_FORMATION[newFormation] ?? []).reduce(
      (sum, line) => sum + line.length, 0
    );
    this.slotAssignments = new Map();
    this.freeSlotCoords.clear();
    this.autoFilledSlots.clear();
    this.autoFillSourcePlayerBySlot.clear();
    this.bumpFreePositionRevision();
    for (let i = 0; i < newLineCount; i++) {
      const playerId = currentXi[i] ?? null;
      this.slotAssignments.set(i, playerId);
      if (playerId) {
        const coords = coordsByPlayerId.get(playerId);
        if (coords) {
          this.freeSlotCoords.set(i, coords);
        }
        if (autoFilledPlayerIds.has(playerId)) {
          this.autoFilledSlots.set(i, playerId);
          const sourcePlayerId = autoFillSourceByPlayerId.get(playerId);
          if (sourcePlayerId) {
            this.autoFillSourcePlayerBySlot.set(i, sourcePlayerId);
          }
        }
      }
    }
    this.errorMsg = '';
    this.selectedNudgeSlotIdx = null;
  }

  /** Tab change handler  -  drives the "Mi Formacion" / "Formacion Rival" UI. */
  onTabChange(idx: number): void {
    this.activeTab.set(idx === 0 ? 'mine' : 'rival');
  }

  // ========== Drag-and-drop handlers ==========

  onSlotDragStart(event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    if (this.isGoalkeeperSlot(slotIdx)) {
      event.preventDefault();
      this.onSlotDragEnd();
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
    if (this.isGoalkeeperSlot(targetSlotIdx) || this.isGoalkeeperSlot(this.dragSourceSlotIdx)) {
      this.onSlotDragEnd();
      return;
    }
    if (this.dragSourceIsBench) {
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const playerId = raw.startsWith('bench:') ? raw.substring(6) : null;
      if (!playerId) {
        return;
      }
      const playerOffId = this.playerOffIdForBenchPlacement(targetSlotIdx, playerId);
      if (this.isAutoFilledSlot(targetSlotIdx) && !playerOffId && !this.isConfirmingSameAutoPlayer(targetSlotIdx, playerId)) {
        this.errorMsg = 'No se puede confirmar AUTO porque falta identificar quién sale. Usá un cambio manual o reabrí el modal.';
        this.onSlotDragEnd();
        return;
      }
      if (playerOffId && playerOffId !== playerId) {
        if (!this.registerPendingSubstitution(playerOffId, playerId, targetSlotIdx)) {
          this.onSlotDragEnd();
          return;
        }
      }
      this.slotAssignments.set(targetSlotIdx, playerId);
      this.clearAutoFillMarker(targetSlotIdx);
      this.freeSlotCoords.delete(targetSlotIdx);
      this.bumpFreePositionRevision();
    } else {
      const sourceSlot = this.dragSourceSlotIdx;
      if (sourceSlot === targetSlotIdx) {
        return;
      }
      const sourcePlayer = this.slotAssignments.get(sourceSlot) ?? null;
      const targetPlayer = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, sourcePlayer);
      this.slotAssignments.set(sourceSlot, targetPlayer);
      this.swapFreeSlotCoords(sourceSlot, targetSlotIdx);
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

  onPitchDragOver(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  onPitchDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.dragSourceSlotIdx === null || this.dragSourceIsBench || this.dragSourceSlotIdx < 0) {
      this.onSlotDragEnd();
      return;
    }
    if (this.isGoalkeeperSlot(this.dragSourceSlotIdx)) {
      this.onSlotDragEnd();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || !rect.height) {
      this.onSlotDragEnd();
      return;
    }
    const x = this.clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = this.clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    this.freeSlotCoords.set(this.dragSourceSlotIdx, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    });
    this.bumpFreePositionRevision();
    this.clearAutoFillMarker(this.dragSourceSlotIdx);
    this.onSlotDragEnd();
    this.selectedFormation.set(this.selectedFormation());
  }

  onPitchSlotPointerDown(event: PointerEvent, slotIdx: number): void {
    if (event.button !== 0 || this.isGoalkeeperSlot(slotIdx) || !this.playerAtSlot(slotIdx)) {
      return;
    }
    this.activePointerDragSlotIdx = slotIdx;
    this.selectedNudgeSlotIdx = slotIdx;
    this.pointerDragStartCoords = this.freeSlotCoords.get(slotIdx) ?? this.baseSlotCoords(slotIdx);
    this.pointerDragMoved = false;
    this.suppressNextSlotClick = false;
    this.errorMsg = '';
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  onPitchPointerMove(event: PointerEvent): void {
    if (this.activePointerDragSlotIdx === null) {
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const next = this.coordsFromPointerEvent(event, target);
    if (!next) {
      return;
    }
    const slotIdx = this.activePointerDragSlotIdx;
    const current = this.freeSlotCoords.get(slotIdx) ?? this.baseSlotCoords(slotIdx);
    const moved = Math.abs(current.x - next.x) >= 0.05 || Math.abs(current.y - next.y) >= 0.05;
    if (!moved) {
      return;
    }
    this.pointerDragMoved = true;
    this.freeSlotCoords.set(slotIdx, next);
    this.clearAutoFillMarker(slotIdx);
    this.bumpFreePositionRevision();
    this.selectedFormation.set(this.selectedFormation());
    this.cdr.markForCheck();
    event.preventDefault();
  }

  onPitchPointerUp(event: PointerEvent): void {
    if (this.activePointerDragSlotIdx === null) {
      return;
    }
    const slotIdx = this.activePointerDragSlotIdx;
    const start = this.pointerDragStartCoords ?? this.baseSlotCoords(slotIdx);
    const target = event.currentTarget as HTMLElement;
    const next = this.coordsFromPointerEvent(event, target) ?? this.freeSlotCoords.get(slotIdx) ?? start;
    if (this.pointerDragMoved) {
      this.freeSlotCoords.set(slotIdx, next);
      this.clearAutoFillMarker(slotIdx);
      this.bumpFreePositionRevision();
      this.persistLastNudgeHarnessCase(slotIdx, start, next);
      this.rememberCurrentPlayerCoord(slotIdx, next);
      this.suppressNextSlotClick = true;
    }
    this.activePointerDragSlotIdx = null;
    this.pointerDragStartCoords = null;
    this.pointerDragMoved = false;
    this.selectedFormation.set(this.selectedFormation());
    this.cdr.markForCheck();
    event.preventDefault();
  }

  onPitchPointerCancel(event: PointerEvent): void {
    if (this.activePointerDragSlotIdx === null) {
      return;
    }
    this.activePointerDragSlotIdx = null;
    this.pointerDragStartCoords = null;
    this.pointerDragMoved = false;
    this.cdr.markForCheck();
    event.preventDefault();
  }

  private coordsFromPointerEvent(event: PointerEvent, pitchEl: HTMLElement): { x: number; y: number } | null {
    const rect = pitchEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    const x = this.clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = this.clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  }

  onPitchSlotClick(slotIdx: number): void {
    if (this.suppressNextSlotClick) {
      this.suppressNextSlotClick = false;
      return;
    }
    if (!this.selectedBenchPlayerId) {
      this.selectNudgeSlot(slotIdx);
      return;
    }
    if (this.isGoalkeeperSlot(slotIdx)) {
      this.errorMsg = 'El arquero no se puede reemplazar desde este flujo.';
      return;
    }
    const playerOnId = this.selectedBenchPlayerId;
    const playerOffId = this.playerOffIdForBenchPlacement(slotIdx, playerOnId);
    if (this.isAutoFilledSlot(slotIdx) && !playerOffId && !this.isConfirmingSameAutoPlayer(slotIdx, playerOnId)) {
      this.errorMsg = 'No se puede confirmar AUTO porque falta identificar quién sale. Usá un cambio manual o reabrí el modal.';
      return;
    }
    if (playerOffId && playerOffId !== playerOnId) {
      if (!this.registerPendingSubstitution(playerOffId, playerOnId, slotIdx)) {
        return;
      }
    }
    this.slotAssignments.set(slotIdx, playerOnId);
    this.clearAutoFillMarker(slotIdx);
    this.selectedBenchPlayerId = null;
    this.errorMsg = '';
    this.selectedFormation.set(this.selectedFormation());
  }

  selectNudgeSlot(slotIdx: number): void {
    if (this.isGoalkeeperSlot(slotIdx)) {
      this.selectedNudgeSlotIdx = null;
      this.errorMsg = 'El arquero queda fijo en el área chica y no se puede mover manualmente.';
      return;
    }
    if (!this.playerAtSlot(slotIdx)) {
      this.selectedNudgeSlotIdx = null;
      return;
    }
    this.selectedNudgeSlotIdx = slotIdx;
    this.errorMsg = '';
  }

  selectedNudgePlayerName(): string {
    if (this.selectedNudgeSlotIdx === null) {
      return 'Ningún jugador seleccionado';
    }
    return this.playerAtSlot(this.selectedNudgeSlotIdx)?.name ?? 'Slot vacío';
  }

  selectedNudgeCoordsLabel(): string {
    if (this.selectedNudgeSlotIdx === null) {
      return 'Seleccioná una ficha del XI para ajustar píxeles.';
    }
    const coords = this.freeSlotCoords.get(this.selectedNudgeSlotIdx);
    if (!coords) {
      return 'En posición base de la formación.';
    }
    return `X ${coords.x.toFixed(1)}% · Y ${coords.y.toFixed(1)}%`;
  }

  canNudgeSelectedSlot(): boolean {
    return this.selectedNudgeSlotIdx !== null
      && !this.isGoalkeeperSlot(this.selectedNudgeSlotIdx)
      && !!this.playerAtSlot(this.selectedNudgeSlotIdx);
  }

  nudgeSelectedSlot(dx: number, dy: number): void {
    if (!this.canNudgeSelectedSlot() || this.selectedNudgeSlotIdx === null) {
      return;
    }
    const slotIdx = this.selectedNudgeSlotIdx;
    const base = this.baseSlotCoords(slotIdx);
    const current = this.freeSlotCoords.get(slotIdx) ?? base;
    const next = {
      x: Number(this.clampPercent(current.x + dx).toFixed(2)),
      y: Number(this.clampPercent(current.y + dy).toFixed(2)),
    };
    this.freeSlotCoords.set(slotIdx, {
      x: next.x,
      y: next.y,
    });
    this.persistLastNudgeHarnessCase(slotIdx, current, next);
    this.clearAutoFillMarker(slotIdx);
    this.bumpFreePositionRevision();
    this.selectedFormation.set(this.selectedFormation());
  }

  resetSelectedSlotPosition(): void {
    if (this.selectedNudgeSlotIdx === null) {
      return;
    }
    this.freeSlotCoords.delete(this.selectedNudgeSlotIdx);
    const playerId = this.slotAssignments.get(this.selectedNudgeSlotIdx) ?? null;
    if (playerId) {
      this.forgetRememberedPlayerCoord(playerId);
    }
    this.bumpFreePositionRevision();
    this.selectedFormation.set(this.selectedFormation());
  }

  onBenchPlayerClick(playerId: string): void {
    this.selectedBenchPlayerId = this.selectedBenchPlayerId === playerId ? null : playerId;
    this.errorMsg = '';
  }

  // ========== Auto-fill empty slots ==========

  autoFillEmptySlots(): void {
    this.autoFilledSlots.clear();
    this.autoFillSourcePlayerBySlot.clear();
    this.warningMsg = '';
    this.sanitizeDuplicateSlotAssignments();
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
      this.warningMsg = this.hasLocalDebugPartidoEvent()
        ? `${unfilled} posición(es) quedaron sin AUTO porque no tienen una lesión propia asociada. Revisá el estado de la fecha o usá un cambio manual.`
        : `${unfilled} posición(es) no se pudieron completar; no hay suficientes jugadores en el banquillo con posición compatible.`;
    }
    this.selectedFormation.set(this.selectedFormation());
  }

  private tryFillSlot(slotIdx: number, roleLabel: string): boolean {
    const compatibleGroups = this.compatibleGroupForRole(roleLabel);
    const bench = this.benchPlayers.filter(p => this.isPlayerAvailableForAutoFill(p));
    const pick = bench.find(p => compatibleGroups.includes((p.position || '').toUpperCase()));
    if (!pick) {
      return false;
    }
    const sourcePlayerId = this.resolveAutoFillSourcePlayerId(roleLabel);
    if (this.hasLocalDebugPartidoEvent() && !sourcePlayerId) {
      return false;
    }
    this.slotAssignments.set(slotIdx, pick.sessionPlayerId);
    this.autoFilledSlots.set(slotIdx, pick.sessionPlayerId);
    if (sourcePlayerId) {
      this.autoFillSourcePlayerBySlot.set(slotIdx, sourcePlayerId);
    }
    return true;
  }

  private playerOffIdForBenchPlacement(slotIdx: number, playerOnId: string): string | null {
    const autoSourcePlayerId = this.autoFillSourcePlayerBySlot.get(slotIdx) ?? null;
    if (this.isAutoFilledSlot(slotIdx)) {
      return autoSourcePlayerId;
    }
    const currentSlotPlayerId = this.slotAssignments.get(slotIdx) ?? null;
    return currentSlotPlayerId && currentSlotPlayerId !== playerOnId ? currentSlotPlayerId : null;
  }

  private isConfirmingSameAutoPlayer(slotIdx: number, playerOnId: string): boolean {
    return this.isAutoFilledSlot(slotIdx)
      && !this.autoFillSourcePlayerBySlot.has(slotIdx)
      && (this.slotAssignments.get(slotIdx) ?? null) === playerOnId;
  }

  private resolveAutoFillSourcePlayerId(roleLabel: string): string | null {
    const assigned = new Set(Array.from(this.slotAssignments.values()).filter((id): id is string => !!id));
    const alreadyLinkedSources = new Set(this.autoFillSourcePlayerBySlot.values());
    const compatibleGroups = this.compatibleGroupForRole(roleLabel);
    const squadIds = new Set((this.data.squad ?? []).map(player => player.sessionPlayerId).filter(Boolean));
    const candidates = [...(this.data.events ?? [])]
      .filter(event => event.eventType === 'INJURY' && !!event.playerId)
      .filter(event => !event.teamId || event.teamId === this.data.homeTeamId || squadIds.has(event.playerId ?? ''))
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
      .map(event => event.playerId as string)
      .find(playerId => {
        if (assigned.has(playerId) || alreadyLinkedSources.has(playerId)) {
          return false;
        }
        return true;
      });
    if (!candidates) {
      return null;
    }
    const compatibleCandidate = [...(this.data.events ?? [])]
      .filter(event => event.eventType === 'INJURY' && !!event.playerId)
      .filter(event => !event.teamId || event.teamId === this.data.homeTeamId || squadIds.has(event.playerId ?? ''))
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
      .map(event => event.playerId as string)
      .find(playerId => {
        if (assigned.has(playerId) || alreadyLinkedSources.has(playerId)) {
          return false;
        }
        const player = (this.data.squad ?? []).find(p => p.sessionPlayerId === playerId);
        if (!player) {
          return false;
        }
        const position = (player.position || '').toUpperCase();
        return compatibleGroups.includes(position);
      });
    return compatibleCandidate ?? candidates;
  }

  private hasLocalDebugPartidoEvent(): boolean {
    return (this.data.events ?? []).some(event =>
      event.eventType === 'INJURY'
      && typeof event.description === 'string'
      && /Debug\s*Partido:/i.test(event.description)
    );
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

  private isPlayerAvailableForAutoFill(player: SessionPlayer): boolean {
    return !player.injured && !player.suspended;
  }

  /**
   * Defensive integrity pass for live/Partido state races.
   *
   * During a live match the modal can be opened while SSE, local saved slots and
   * just-confirmed substitutions are converging. If two slots carry the same
   * sessionPlayerId, the UI may look like a 12-player/10-player XI depending on
   * which surface reads it. Keep the first tactical occurrence, clear later
   * duplicates, and let auto-fill repair the empty slot from the bench.
   */
  private sanitizeDuplicateSlotAssignments(): void {
    const seen = new Set<string>();
    let changed = false;
    for (const [slotIdx, playerId] of Array.from(this.slotAssignments.entries()).sort((a, b) => a[0] - b[0])) {
      if (!playerId) {
        continue;
      }
      if (seen.has(playerId)) {
        this.slotAssignments.set(slotIdx, null);
        this.freeSlotCoords.delete(slotIdx);
        this.clearAutoFillMarker(slotIdx);
        changed = true;
        continue;
      }
      seen.add(playerId);
    }
    if (changed) {
      this.bumpFreePositionRevision();
      if (!this.warningMsg) {
        this.warningMsg = 'Se corrigió un XI duplicado antes de guardar.';
      }
    }
  }

  isFreePositionedSlot(slotIdx: number): boolean {
    return this.freeSlotCoords.has(slotIdx);
  }

  isGoalkeeperSlot(slotIdx: number): boolean {
    if (slotIdx < 0) {
      return false;
    }
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let current = 0;
    for (const line of lines) {
      for (const role of line) {
        if (current === slotIdx) {
          return (role || '').toUpperCase() === 'GK';
        }
        current++;
      }
    }
    const player = this.playerAtSlot(slotIdx);
    return (player?.position || '').toUpperCase() === 'GK';
  }

  freePositionLeftPercent(slotIdx: number): number | null {
    const coords = this.freeSlotCoords.get(slotIdx);
    if (!coords) {
      return null;
    }
    return coords.x;
  }

  freePositionTopPercent(slotIdx: number): number | null {
    const coords = this.freeSlotCoords.get(slotIdx);
    if (!coords) {
      return null;
    }
    return coords.y;
  }

  private baseSlotCoords(slotIdx: number): { x: number; y: number } {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let current = 0;
    const lineGap = lines.length <= 1 ? 50 : 100 / (lines.length - 1);
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        if (current === slotIdx) {
          const x = line.length <= 1
            ? 50
            : ((dotIdx + 1) / (line.length + 1)) * 100;
          const y = lines.length <= 1 ? 50 : lineIdx * lineGap;
          return {
            x: Number(this.clampPercent(x).toFixed(2)),
            y: Number(this.clampPercent(y).toFixed(2)),
          };
        }
        current++;
      }
    }
    return { x: 50, y: 50 };
  }

  private roleLabelForSlot(slotIdx: number): string | null {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let current = 0;
    for (const line of lines) {
      for (const role of line) {
        if (current === slotIdx) {
          return role;
        }
        current++;
      }
    }
    return null;
  }

  private persistLastNudgeHarnessCase(
    slotIdx: number,
    from: { x: number; y: number },
    target: { x: number; y: number }
  ): void {
    const player = this.playerAtSlot(slotIdx);
    if (!player || this.isGoalkeeperSlot(slotIdx)) {
      return;
    }
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    if (!Number.isFinite(distance) || distance < 0.5) {
      return;
    }
    const role = this.roleLabelForSlot(slotIdx);
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: 'partido-modal-nudge',
      formation: this.selectedFormation(),
      playerId: player.sessionPlayerId,
      playerName: player.name,
      playerPosition: player.position ?? role,
      playerRole: role,
      slotId: null,
      fromXPercent: Number(from.x.toFixed(3)),
      fromYPercent: Number(from.y.toFixed(3)),
      targetXPercent: Number(target.x.toFixed(3)),
      targetYPercent: Number(target.y.toFixed(3)),
      deltaXPercent: Number((target.x - from.x).toFixed(3)),
      deltaYPercent: Number((target.y - from.y).toFixed(3)),
      coachReadTitle: 'Partido modal nudge',
      coachReadBody: `${player.name}: ${from.x.toFixed(1)},${from.y.toFixed(1)} -> ${target.x.toFixed(1)},${target.y.toFixed(1)}`,
    };
    try {
      window.localStorage.setItem('manager:last-modal-position-move', JSON.stringify(payload));
    } catch {
      // Local QA metadata is best-effort; the user-facing save flow must continue.
    }
  }

  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
    this.autoFillSourcePlayerBySlot.delete(slotIdx);
  }

  // ========== Pitch helpers ==========

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
    for (const [slotIdx, pid] of this.slotAssignments) {
      if (pid && !this.autoFilledSlots.has(slotIdx)) {
        assigned.add(pid);
      }
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

  // ========== : rival-tab helpers ==========

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

  /** Role label for a rival dot  -  no player name (rival XI not exposed). */
  getRivalDotLabel(lineIdx: number, dotIdx: number): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][dotIdx] ?? '';
  }

  // ========== : diff + save ==========

  private slotsDifferFromInitial(): boolean {
    if (this.slotAssignments.size !== this.initialSlotAssignments.size) {
      return true;
    }
    for (const [idx, pid] of this.slotAssignments) {
      const initialPid = this.initialSlotAssignments.get(idx) ?? '';
      if ((pid ?? '') !== initialPid) {
        return true;
      }
    }
    if (this.freeSlotCoords.size !== this.initialFreeSlotCoords.size) {
      return true;
    }
    for (const [idx, coords] of this.freeSlotCoords) {
      const initialSlotCoords = this.initialFreeSlotCoords.get(idx);
      if (!initialSlotCoords) {
        return true;
      }
      if (Math.abs(coords.x - initialSlotCoords.x) > 0.001
          || Math.abs(coords.y - initialSlotCoords.y) > 0.001) {
        return true;
      }
    }
    return false;
  }

  private captureInitialSlotSnapshot(): void {
    this.initialSlotAssignments = new Map(this.slotAssignments);
    this.initialFreeSlotCoords = new Map(
      Array.from(this.freeSlotCoords.entries()).map(([slotIdx, coords]) => [
        slotIdx,
        { x: this.clampPercent(coords.x), y: this.clampPercent(coords.y) }
      ])
    );
    this.bumpFreePositionRevision();
  }

  private buildSlotListForBackend(): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }> {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    const slots: Array<{
      sessionPlayerId: string;
      position: string;
      slotIndex: number;
      customXPercent?: number | null;
      customYPercent?: number | null;
    }> = [];
    let slotIdx = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        const coords = this.freeSlotCoords.get(slotIdx);
        slots.push({
          sessionPlayerId: this.slotAssignments.get(slotIdx) ?? '',
          position: line[dotIdx],
          slotIndex: slotIdx,
          customXPercent: coords?.x ?? null,
          customYPercent: coords?.y ?? null
        });
        slotIdx++;
      }
    }
    return slots;
  }

  private swapFreeSlotCoords(a: number, b: number): void {
    const aCoords = this.freeSlotCoords.get(a);
    const bCoords = this.freeSlotCoords.get(b);
    if (bCoords) {
      this.freeSlotCoords.set(a, bCoords);
    } else {
      this.freeSlotCoords.delete(a);
    }
    if (aCoords) {
      this.freeSlotCoords.set(b, aCoords);
    } else {
      this.freeSlotCoords.delete(b);
    }
    this.bumpFreePositionRevision();
  }

  private clampPercent(value: number): number {
    return clampPartidoPercent(value);
  }

  private isFinitePercent(value: number | null | undefined): value is number {
    return isFinitePercent(value);
  }

  private readRememberedPlayerCoords(): Record<string, { x: number; y: number }> {
    return readPartidoPlayerCoords(window.localStorage, this.data.matchId);
  }

  private writeRememberedPlayerCoords(coordsByPlayerId: Record<string, { x: number; y: number }>): void {
    try {
      writePartidoPlayerCoords(window.localStorage, this.data.matchId, coordsByPlayerId);
    } catch {
      // Non-fatal: service memory/backend save still carry the tactical change.
    }
  }

  private bumpFreePositionRevision(): void {
    this.freePositionRevision.update(value => value + 1);
  }

  private hydrateRememberedPlayerCoords(): void {
    const remembered = this.readRememberedPlayerCoords();
    let changed = false;
    for (const [slotIdx, playerId] of this.slotAssignments) {
      if (!playerId) {
        continue;
      }
      const coords = remembered[playerId];
      if (!coords) {
        continue;
      }
      this.freeSlotCoords.set(slotIdx, {
        x: this.clampPercent(coords.x),
        y: this.clampPercent(coords.y)
      });
      changed = true;
    }
    if (changed) {
      this.bumpFreePositionRevision();
    }
  }

  private rememberPlayerCoordsForSavedSlots(slots: Array<{
    sessionPlayerId: string;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>): void {
    const remembered = this.readRememberedPlayerCoords();
    for (const slot of slots) {
      if (!slot.sessionPlayerId) {
        continue;
      }
      if (this.isFinitePercent(slot.customXPercent) && this.isFinitePercent(slot.customYPercent)) {
        remembered[slot.sessionPlayerId] = {
          x: this.clampPercent(slot.customXPercent),
          y: this.clampPercent(slot.customYPercent)
        };
      } else {
        delete remembered[slot.sessionPlayerId];
      }
    }
    this.writeRememberedPlayerCoords(remembered);
  }

  private rememberCurrentPlayerCoord(slotIdx: number, coords: { x: number; y: number }): void {
    const playerId = this.slotAssignments.get(slotIdx);
    if (!playerId) {
      return;
    }
    const remembered = this.readRememberedPlayerCoords();
    remembered[playerId] = {
      x: this.clampPercent(coords.x),
      y: this.clampPercent(coords.y)
    };
    this.writeRememberedPlayerCoords(remembered);
  }

  private forgetRememberedPlayerCoord(playerId: string): void {
    const remembered = this.readRememberedPlayerCoords();
    if (!(playerId in remembered)) {
      return;
    }
    delete remembered[playerId];
    this.writeRememberedPlayerCoords(remembered);
  }

  private registerPendingSubstitution(playerOffId: string, playerOnId: string, slotIndex: number): boolean {
    const nextSubstitutions = this.pendingSubstitutions
      .filter(sub => sub.playerOffId !== playerOffId && sub.playerOnId !== playerOnId);

    if (nextSubstitutions.length >= this.substitutionsRemaining()) {
      this.errorMsg = 'No quedan sustituciones disponibles para preparar otro cambio.';
      return false;
    }
    this.pendingSubstitutions = [
      ...nextSubstitutions,
      { playerOffId, playerOnId, slotIndex }
    ];
    this.pendingSubstitutionRevision.update(value => value + 1);
    return true;
  }

  pendingSubstitutionRows(): Array<{
    playerOffName: string;
    playerOnName: string;
    slotIndex: number;
  }> {
    this.pendingSubstitutionRevision();
    return this.pendingSubstitutions.map(sub => ({
      playerOffName: this.playerNameById(sub.playerOffId),
      playerOnName: this.playerNameById(sub.playerOnId),
      slotIndex: sub.slotIndex
    }));
  }

  removePendingSubstitution(index: number): void {
    const sub = this.pendingSubstitutions[index];
    if (!sub) {
      return;
    }
    const currentSlotPlayerId = this.slotAssignments.get(sub.slotIndex) ?? null;
    if (!currentSlotPlayerId || currentSlotPlayerId === sub.playerOnId) {
      this.slotAssignments.set(sub.slotIndex, sub.playerOffId);
      this.freeSlotCoords.delete(sub.slotIndex);
      this.clearAutoFillMarker(sub.slotIndex);
      this.bumpFreePositionRevision();
    }
    this.pendingSubstitutions = this.pendingSubstitutions.filter((_item, idx) => idx !== index);
    this.pendingSubstitutionRevision.update(value => value + 1);
    this.selectedBenchPlayerId = null;
    this.errorMsg = '';
    this.selectedFormation.set(this.selectedFormation());
  }

  private playerNameById(playerId: string): string {
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === playerId)?.name ?? playerId;
  }

  // ========== Footer actions ==========

  /** Persist formation, position and substitution changes. */
  save(): void {
    if (this.isSubmitting) {
      return;
    }
    if (this.autoFilledSlots.size > 0) {
      this.errorMsg = 'No se puede guardar con jugadores AUTO: elegí manualmente el reemplazo para que cuente como sustitución real.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.hasPendingChanges()) {
      // No changes  -  close immediately without API call.
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    this.isSubmitting = true;
    const saveToken = Symbol('partido-save');
    this.activeSaveToken = saveToken;
    window.setTimeout(() => {
      if (this.activeSaveToken === saveToken && this.isSubmitting) {
        this.isSubmitting = false;
        this.errorMsg = 'No hubo respuesta al guardar el cambio del partido. Probá de nuevo o reiniciá el live desde el harness.';
        this.cdr.markForCheck();
      }
    }, 15000);
    this.errorMsg = '';
    this.sanitizeDuplicateSlotAssignments();
    if (this.autoFilledSlots.size > 0) {
      this.isSubmitting = false;
      this.activeSaveToken = null;
      this.errorMsg = 'No se puede guardar con jugadores AUTO: elegí manualmente el reemplazo para que cuente como sustitución real.';
      this.cdr.markForCheck();
      return;
    }
    const slots = this.buildSlotListForBackend();
    this.rememberPlayerCoordsForSavedSlots(slots);
    if (slots.some(slot => !slot.sessionPlayerId)) {
      this.isSubmitting = false;
      this.errorMsg = 'No se puede confirmar: todos los slots visibles deben tener un jugador real. Cerrá y reabrí el modal si ves sólo roles.';
      return;
    }
    const substitutionFlow$ = this.pendingSubstitutions.length > 0
      ? from(this.pendingSubstitutions).pipe(
          concatMap(sub => this.engineService.substitutePlayer(
            this.data.matchId,
            sub.playerOffId,
            sub.playerOnId
          )),
          toArray()
        )
      : of([]);

    substitutionFlow$.pipe(
      switchMap((substitutionResults) => {
        const failedSubstitution = substitutionResults.find(result => !result.success && !this.isAlreadyAppliedSubstitutionResult(result));
        if (failedSubstitution) {
          return of({
            formationResult: null,
            substitutionResults,
            failedSubstitution
          });
        }
        return this.engineService.changeFormation(this.data.matchId, slots, this.selectedFormation()).pipe(
          switchMap(formationResult => of({
            formationResult,
            substitutionResults,
            failedSubstitution: null
          }))
        );
      }),
      timeout(15000),
      finalize(() => {
        this.isSubmitting = false;
        if (this.activeSaveToken === saveToken) {
          this.activeSaveToken = null;
        }
        this.cdr.markForCheck();
      }),
      takeUntil(this.destroy$)
    )
      .subscribe({
        next: ({ formationResult, substitutionResults, failedSubstitution }) => {
          if (failedSubstitution) {
            this.errorMsg = failedSubstitution.error || 'Cambio de jugador rechazado por el servidor';
            this.cdr.markForCheck();
            return;
          }
          if (formationResult?.success) {
            const appliedSubstitutions = this.pendingSubstitutions.length;
            this.snackBar.open(
              appliedSubstitutions > 0
                ? `Cambios aplicados (${appliedSubstitutions}) y formación ${this.selectedFormation()} guardada`
                : `Formación cambiada a ${this.selectedFormation()}`,
              'OK',
              { duration: 3000, panelClass: 'success-toast' }
            );
            this.dialogRef.close({
              success: true,
              result: formationResult,
              substitutionResults,
              formation: this.selectedFormation(),
              savedSlots: slots,
              substitutionsApplied: appliedSubstitutions,
              substitutions: this.pendingSubstitutions.map(sub => ({
                playerOffId: sub.playerOffId,
                playerOnId: sub.playerOnId
              }))
            });
          } else {
            this.errorMsg = formationResult?.error || 'Cambio de formación rechazado por el servidor';
          }
        },
        error: (err) => {
          this.errorMsg = this.describeSaveError(err);
          this.cdr.markForCheck();
        }
      });
  }

  private isAlreadyAppliedSubstitutionResult(result: { success: boolean; error?: string | null }): boolean {
    if (result.success) {
      return false;
    }
    const error = (result.error || '').toLowerCase();
    return error.includes('already been substituted off')
      || error.includes('already been substituted on')
      || error.includes('is on the pitch already');
  }

  private describeSaveError(err: unknown): string {
    const candidate = err as {
      status?: number;
      statusText?: string;
      error?: unknown;
      message?: string;
    };
    const backendError = candidate?.error;
    if (backendError && typeof backendError === 'object') {
      const shaped = backendError as { error?: string; message?: string; detail?: string; code?: string };
      const message = shaped.error ?? shaped.message ?? shaped.detail;
      if (message) {
        return `${candidate.status ?? 'Error'} ${shaped.code ? shaped.code + ': ' : ''}${message}`;
      }
    }
    if (typeof backendError === 'string' && backendError.trim()) {
      return `${candidate.status ?? 'Error'} ${backendError}`;
    }
    if (candidate?.message) {
      if (!candidate.status) {
        return `Error de red al intentar aplicar cambios del partido: ${candidate.message}`;
      }
      return `${candidate.status ?? 'Error'} ${candidate.message}`;
    }
    return 'Error de red al intentar aplicar cambios del partido';
  }

  /**
   * Footer "Descartar" handler. Closes the dialog without saving, so the live
   * match keeps the original formation until the manager applies a new change.
   */
  discard(): void {
    this.dialogRef.close({ success: false, reason: 'discarded' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
