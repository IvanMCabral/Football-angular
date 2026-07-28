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
import { Subject } from 'rxjs';
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
import {
  basePartidoSlotCoords,
  buildPartidoSlotListForBackend,
  capturePartidoSlotCoordsSnapshot,
  partidoSlotsDifferFromInitial,
  roleLabelForPartidoSlot,
  swapPartidoFreeSlotCoords
} from './partido-modal-slot-state.utils';
import {
  describePartidoSaveError,
  isAlreadyAppliedPartidoSubstitutionResult,
  savePartidoModal
} from './partido-modal-save-flow.utils';
import {
  partidoAutoFillEmptySlots,
  partidoCompatibleGroupForRole,
  partidoCoordsFromPointerEvent,
  partidoFocusPreSelectedPlayerIfPresent,
  partidoHydrateRememberedPlayerCoords,
  partidoIsGoalkeeperSlot,
  partidoNudgeSelectedSlot,
  partidoOnFormationChange,
  partidoOnPitchDrop,
  partidoOnPitchPointerMove,
  partidoOnPitchPointerUp,
  partidoOnPitchSlotClick,
  partidoOnPitchSlotPointerDown,
  partidoOnSlotDragStart,
  partidoOnSlotDrop,
  partidoPendingSubstitutionRows,
  partidoPersistLastNudgeHarnessCase,
  partidoRegisterPendingSubstitution,
  partidoRememberCurrentPlayerCoord,
  partidoRememberPlayerCoordsForSavedSlots,
  partidoRemovePendingSubstitution,
  partidoResetSelectedSlotPosition,
  partidoResolveAutoFillSourcePlayerId,
  partidoSanitizeDuplicateSlotAssignments,
  partidoSelectNudgeSlot,
  partidoTryFillSlot
} from './partido-modal-interactions.utils';

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
export const FORMATION_LINES_BY_FORMATION: Record<string, string[][]> = {
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

  readonly formations: readonly string[] = ALL_FORMATIONS;

  readonly activeTab = signal<'mine' | 'rival'>('mine');

  private readonly eventList = (): MatchEvent[] => this.data.events ?? [];

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

  recentEvents(): MatchEvent[] {
    return recentPartidoEvents(this.eventList());
  }

  hasEvents(): boolean {
    return this.eventList().length > 0;
  }

  currentMinute(): number {
    return this.data.currentMinute ?? 0;
  }

  homeScore(): number {
    return this.data.score?.home ?? 0;
  }

  awayScore(): number {
    return this.data.score?.away ?? 0;
  }

  substitutionsRemaining(): number {
    return this.data.substitutionsRemaining ?? 5;
  }

  getEventIcon(eventType: string): string {
    return getPartidoEventIcon(eventType);
  }

  displayPosition(position: string | null | undefined): string {
    return displayPartidoPosition(position);
  }

  displayEventDescription(event: MatchEvent | null | undefined): string {
    return displayPartidoEventDescription(event);
  }

  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  slotAssignments: Map<number, string | null> = new Map();

  freeSlotCoords: Map<number, { x: number; y: number }> = new Map();
  private readonly freePositionRevision = signal(0);

  pendingSubstitutions: PendingPartidoSubstitution[] = [];
  private readonly pendingSubstitutionRevision = signal(0);
  selectedBenchPlayerId: string | null = null;
  selectedNudgeSlotIdx: number | null = null;
  private activeSaveToken: symbol | null = null;
  private initialSlotAssignments: Map<number, string | null> = new Map();
  private initialFreeSlotCoords: Map<number, { x: number; y: number }> = new Map();

  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench = false;
  activePointerDragSlotIdx: number | null = null;
  private pointerDragStartCoords: { x: number; y: number } | null = null;
  private pointerDragMoved = false;
  private suppressNextSlotClick = false;

  readonly autoFilledSlots = new Map<number, string>();
  readonly autoFillSourcePlayerBySlot = new Map<number, string>();

  warningMsg = '';

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  private static readonly POSITION_GROUPS: Record<string, string[]> = {
    GK:  ['GK'],
    DEF: ['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
    ATT: ['ATT', 'ST', 'CF', 'LW', 'RW']
  };

  readonly hasPendingChanges = computed(() => {
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    this.freePositionRevision();
    this.pendingSubstitutionRevision();
    const slotsChanged = this.slotsDifferFromInitial();
    return formationChanged || slotsChanged || this.pendingSubstitutions.length > 0;
  });

  readonly rivalFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.rivalFormation)
  );

  constructor() {
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

  private focusPreSelectedPlayerIfPresent(): void { partidoFocusPreSelectedPlayerIfPresent(this); }

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

  onFormationChange(value: string): void { partidoOnFormationChange(this, value); }

  onTabChange(idx: number): void {
    this.activeTab.set(idx === 0 ? 'mine' : 'rival');
  }

  onSlotDragStart(event: DragEvent, slotIdx: number): void { partidoOnSlotDragStart(this, event, slotIdx); }

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

  onSlotDrop(event: DragEvent, targetSlotIdx: number): void { partidoOnSlotDrop(this, event, targetSlotIdx); }

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

  onPitchDrop(event: DragEvent): void { partidoOnPitchDrop(this, event); }

  onPitchSlotPointerDown(event: PointerEvent, slotIdx: number): void { partidoOnPitchSlotPointerDown(this, event, slotIdx); }

  onPitchPointerMove(event: PointerEvent): void { partidoOnPitchPointerMove(this, event); }

  onPitchPointerUp(event: PointerEvent): void { partidoOnPitchPointerUp(this, event); }

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

  private coordsFromPointerEvent(event: PointerEvent, pitchEl: HTMLElement): { x: number; y: number } | null { return partidoCoordsFromPointerEvent(this, event, pitchEl); }

  onPitchSlotClick(slotIdx: number): void { partidoOnPitchSlotClick(this, slotIdx); }

  selectNudgeSlot(slotIdx: number): void { partidoSelectNudgeSlot(this, slotIdx); }

  selectedNudgePlayerName(): string {
    if (this.selectedNudgeSlotIdx === null) {
      return 'NingÃºn jugador seleccionado';
    }
    return this.playerAtSlot(this.selectedNudgeSlotIdx)?.name ?? 'Slot vacÃ­o';
  }

  selectedNudgeCoordsLabel(): string {
    if (this.selectedNudgeSlotIdx === null) {
      return 'SeleccionÃ¡ una ficha del XI para ajustar pÃ­xeles.';
    }
    const coords = this.freeSlotCoords.get(this.selectedNudgeSlotIdx);
    if (!coords) {
      return 'En posición base de la formación.';
    }
    return `X ${coords.x.toFixed(1)}% Â· Y ${coords.y.toFixed(1)}%`;
  }

  canNudgeSelectedSlot(): boolean {
    return this.selectedNudgeSlotIdx !== null
      && !this.isGoalkeeperSlot(this.selectedNudgeSlotIdx)
      && !!this.playerAtSlot(this.selectedNudgeSlotIdx);
  }

  nudgeSelectedSlot(dx: number, dy: number): void { partidoNudgeSelectedSlot(this, dx, dy); }

  resetSelectedSlotPosition(): void { partidoResetSelectedSlotPosition(this); }

  onBenchPlayerClick(playerId: string): void {
    this.selectedBenchPlayerId = this.selectedBenchPlayerId === playerId ? null : playerId;
    this.errorMsg = '';
  }

  autoFillEmptySlots(): void { partidoAutoFillEmptySlots(this); }

  private tryFillSlot(slotIdx: number, roleLabel: string): boolean { return partidoTryFillSlot(this, slotIdx, roleLabel); }

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

  private resolveAutoFillSourcePlayerId(roleLabel: string): string | null { return partidoResolveAutoFillSourcePlayerId(this, roleLabel); }

  private hasLocalDebugPartidoEvent(): boolean {
    return (this.data.events ?? []).some(event =>
      event.eventType === 'INJURY'
      && typeof event.description === 'string'
      && /Debug\s*Partido:/i.test(event.description)
    );
  }

  private compatibleGroupForRole(roleLabel: string): string[] { return partidoCompatibleGroupForRole(this, roleLabel); }

  isAutoFilledSlot(slotIdx: number): boolean {
    return this.autoFilledSlots.has(slotIdx);
  }

  private isPlayerAvailableForAutoFill(player: SessionPlayer): boolean {
    return !player.injured && !player.suspended;
  }

  private sanitizeDuplicateSlotAssignments(): void { partidoSanitizeDuplicateSlotAssignments(this); }

  isFreePositionedSlot(slotIdx: number): boolean {
    return this.freeSlotCoords.has(slotIdx);
  }

  isGoalkeeperSlot(slotIdx: number): boolean { return partidoIsGoalkeeperSlot(this, slotIdx); }

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
    return basePartidoSlotCoords(FORMATION_LINES_BY_FORMATION, this.selectedFormation(), slotIdx);
  }

  private roleLabelForSlot(slotIdx: number): string | null {
    return roleLabelForPartidoSlot(FORMATION_LINES_BY_FORMATION, this.selectedFormation(), slotIdx);
  }

  private persistLastNudgeHarnessCase(slotIdx: number, from: { x: number; y: number }, target: { x: number; y: number }): void { partidoPersistLastNudgeHarnessCase(this, slotIdx, from, target); }

  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
    this.autoFillSourcePlayerBySlot.delete(slotIdx);
  }

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

  get rivalFormationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2];
    }
    return lines.map(line => line.length);
  }

  getRivalDotLabel(lineIdx: number, dotIdx: number): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][dotIdx] ?? '';
  }

  private slotsDifferFromInitial(): boolean {
    return partidoSlotsDifferFromInitial(
      this.slotAssignments,
      this.initialSlotAssignments,
      this.freeSlotCoords,
      this.initialFreeSlotCoords
    );
  }

  private captureInitialSlotSnapshot(): void {
    this.initialSlotAssignments = new Map(this.slotAssignments);
    this.initialFreeSlotCoords = capturePartidoSlotCoordsSnapshot(this.freeSlotCoords);
    this.bumpFreePositionRevision();
  }

  private buildSlotListForBackend() {
    return buildPartidoSlotListForBackend(
      FORMATION_LINES_BY_FORMATION,
      this.selectedFormation(),
      this.slotAssignments,
      this.freeSlotCoords
    );
  }

  private swapFreeSlotCoords(a: number, b: number): void {
    this.freeSlotCoords = swapPartidoFreeSlotCoords(this.freeSlotCoords, a, b);
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
    }
  }

  private bumpFreePositionRevision(): void {
    this.freePositionRevision.update(value => value + 1);
  }

  private hydrateRememberedPlayerCoords(): void { partidoHydrateRememberedPlayerCoords(this); }

  private rememberPlayerCoordsForSavedSlots(slots: Array<{
    sessionPlayerId: string;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>): void { partidoRememberPlayerCoordsForSavedSlots(this, slots); }

  private rememberCurrentPlayerCoord(slotIdx: number, coords: { x: number; y: number }): void { partidoRememberCurrentPlayerCoord(this, slotIdx, coords); }

  private forgetRememberedPlayerCoord(playerId: string): void {
    const remembered = this.readRememberedPlayerCoords();
    if (!(playerId in remembered)) {
      return;
    }
    delete remembered[playerId];
    this.writeRememberedPlayerCoords(remembered);
  }

  private registerPendingSubstitution(playerOffId: string, playerOnId: string, slotIndex: number): boolean { return partidoRegisterPendingSubstitution(this, playerOffId, playerOnId, slotIndex); }

  pendingSubstitutionRows(): Array<{
    playerOffName: string;
    playerOnName: string;
    slotIndex: number;
  }> { return partidoPendingSubstitutionRows(this); }

  removePendingSubstitution(index: number): void { partidoRemovePendingSubstitution(this, index); }

  private playerNameById(playerId: string): string {
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === playerId)?.name ?? playerId;
  }

  save(): void {
    savePartidoModal(this);
  }

  private isAlreadyAppliedSubstitutionResult(result: { success: boolean; error?: string | null }): boolean {
    return isAlreadyAppliedPartidoSubstitutionResult(result);
  }

  private describeSaveError(err: unknown): string {
    return describePartidoSaveError(err);
  }

  discard(): void {
    this.dialogRef.close({ success: false, reason: 'discarded' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
