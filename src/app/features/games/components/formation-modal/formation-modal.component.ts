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
import { FormationDialogData } from './formation-modal.models';
import {
  buildFormationBackendSlots,
  defaultCoordForFormationSlot,
  formationCoordsDifferFromDefault,
  roleForFormationSlot
} from './formation-modal-slot-geometry.utils';

const FORMATIONS = ALL_FORMATIONS;
export const FORMATION_MODAL_RESPONSIVE_CSS = `
  @media (max-width: 600px) {
    .player-dot {
      min-width: 12px;
      max-width: 22px;
    }

    .dot-label {
      text-overflow: ellipsis;
    }
  }

  @media (min-width: 601px) and (max-width: 1024px) {
    .player-dot {
      width: 24px;
    }
  }

  @media (min-width: 1600px) {
    .player-dot {
      width: 36px;
    }
  }
`;
export const FORMATION_LINES_BY_FORMATION: Record<string, string[][]> = {

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

  styleUrl: './formation-modal.component.css',
  styles: [FORMATION_MODAL_RESPONSIVE_CSS],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormationModalComponent {

  readonly data: FormationDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FormationModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);
  readonly formations: readonly string[] = FORMATIONS;
  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  slotAssignments: Map<number, string | null> = new Map();

  selectedSlotIdx: number | null = null;

  private slotCoords: Map<number, { x: number; y: number }> = new Map();

  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench: boolean = false;

  readonly autoFilledSlots = new Map<number, string>();

  warningMsg = '';

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

    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
    }
    this.resetAllSlotCoords();
  }

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);

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
      const displaced = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, playerId);




      this.clearAutoFillMarker(targetSlotIdx);




      void displaced; // intentionally unused (see template bench list)
    } else {



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



      this.clearAutoFillMarker(targetSlotIdx);
      this.clearAutoFillMarker(sourceSlot);
    }
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
    this.selectedSlotIdx = targetSlotIdx;




    this.selectedFormation.set(this.selectedFormation());
  }
  onSlotDragEnd(): void {
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
  }


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
  isAutoFilledSlot(slotIdx: number): boolean {
    return this.autoFilledSlots.has(slotIdx);
  }
  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
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
      return [1, 4, 4, 2]; // fallback defensivo
    }
    return lines.map(line => line.length);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {






    if (!this.isSubmitting) {
      this.cancel();
    }
  }

  confirm(): void {
    if (this.isSubmitting) { return; }

    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    const slotsChanged = this.slotsDifferFromInitial();
    const coordsChanged = this.coordsDifferFromDefault();
    if (!formationChanged && !slotsChanged && !coordsChanged) {
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

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

  private buildSlotListForBackend(): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent: number | null;
    customYPercent: number | null;
  }> {
    return buildFormationBackendSlots({
      formationLinesByFormation: FORMATION_LINES_BY_FORMATION,
      formation: this.selectedFormation(),
      slotAssignments: this.slotAssignments,
      slotCoords: this.slotCoords
    });
  }

  private resetAllSlotCoords(): void {
    this.slotCoords = new Map();
    const count = this.formationLines.reduce((sum, lineCount) => sum + lineCount, 0);
    for (let slotIdx = 0; slotIdx < count; slotIdx++) {
      this.slotCoords.set(slotIdx, this.defaultCoordForSlot(slotIdx));
    }
  }

  private coordsDifferFromDefault(): boolean {
    return formationCoordsDifferFromDefault({
      formationLinesByFormation: FORMATION_LINES_BY_FORMATION,
      formation: this.selectedFormation(),
      slotCoords: this.slotCoords
    });
  }

  private defaultCoordForSlot(slotIdx: number): { x: number; y: number } {
    return defaultCoordForFormationSlot(FORMATION_LINES_BY_FORMATION, this.selectedFormation(), slotIdx);
  }

  private roleForSlot(slotIdx: number): string {
    return roleForFormationSlot(FORMATION_LINES_BY_FORMATION, this.selectedFormation(), slotIdx);
  }

  private clampPercent(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

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
