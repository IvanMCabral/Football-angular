import { Component, Inject, OnInit, ChangeDetectorRef, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Subject, BehaviorSubject } from 'rxjs';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, DragDropModule } from '@angular/cdk/drag-drop';
import { LineupWarningDTO } from '../../shared/models/lineup/lineup-warning.dto';
import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';
import { FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';
import { ChemistryDetailDTO } from '../../shared/models/lineup/lineup.dto';
import { FormationEffectivenessDTO, effectivenessColor } from '../../shared/models/lineup/formation-effectiveness.dto';
import { ALL_FORMATIONS, USER_FORMATION_LABEL } from '../../shared/constants/formations';
import { ChemistryPreviewService } from '../../core/services/chemistry-preview.service';
import { SessionPlayer } from '../../shared/models/player.model';
import { PlayerRoleFamily, getMarkerRoleClasses as getRoleMarkerClasses, getRoleFamily as resolveRoleFamily, rolesMatch as roleFamiliesMatch } from '../../shared/utils/player-role-utils';
import { TacticalChannel, TacticalLine, buildTacticalChannelBreakdown, buildTacticalShapeMatrix, buildTacticalShapeSummary, tacticalChannelFromX, tacticalLineFromY } from '../../shared/utils/tactical-shape-utils';
import { computeSquadEditorAvgAttribute } from './squad-editor-modal-ratings.utils';
import { SQUAD_EDITOR_GOALKEEPER_SLOT_ID, canSquadEditorPlayerUseSlot, isInsideSquadEditorGoalkeeperProtectedArea, isSquadEditorGoalkeeperSlot } from './squad-editor-modal-goalkeeper.utils';
import { SquadEditorRect, squadEditorSubdivisionIdFromDropListId } from './squad-editor-modal-geometry.utils';
import { SquadEditorCoachBaseline, SquadEditorCoachMoveReadView, SquadEditorFormationChange, SquadEditorLineupPlayer, SquadEditorMarkerMoveContext } from './squad-editor-modal.models';
import {
  readSquadEditorOffRolePlayers,
  readSquadEditorTacticalCoachReads,
  readSquadEditorTacticalPenaltySummary,
  readSquadEditorTacticalShapeWarnings,
  readSquadEditorZoneBreakdown,
  runSquadEditorApplyCurrentXiToFormation,
  runSquadEditorApplyLineupToSlots,
  runSquadEditorApplyMarkerFieldDrop,
  runSquadEditorApplySlotAssignment,
  runSquadEditorAssignPlayerToSlot,
  runSquadEditorBeginCoachMoveImpactTracking,
  runSquadEditorCaptureRatingsFromFormationEffectiveness,
  runSquadEditorDeriveStyleTags,
  runSquadEditorDetectFormation,
  runSquadEditorEnrichLastCoachMoveReadWithLatestDelta,
  runSquadEditorExecuteAutoSelect,
  runSquadEditorExecuteFormationChange,
  runSquadEditorFetchRatingsPreview,
  runSquadEditorFindClosestSubdivision,
  runSquadEditorGetChipEffectivenessClass,
  runSquadEditorGetDisplayedChemistryScore,
  runSquadEditorGetDisplayedFormationLabel,
  runSquadEditorGetEffectivenessForSlot,
  runSquadEditorGetFormationPositionCoord,
  runSquadEditorGetMarkerX,
  runSquadEditorGetMarkerY,
  runSquadEditorGetOffRoleAdvice,
  runSquadEditorGetPositionRoleFamily,
  runSquadEditorGetRecommendedRoleBySlotId,
  runSquadEditorGetTacticalChannelScoresSnapshot,
  runSquadEditorGetUniqueValidHomePlayers,
  runSquadEditorHandleBenchDrop,
  runSquadEditorHandleMarkerDragEnd,
  runSquadEditorHandleSlotDrop,
  runSquadEditorIsDropOverBenchCard,
  runSquadEditorIsOffRole,
  runSquadEditorIsRecommendedSlot,
  runSquadEditorIsSlotAbandonedByOverride,
  runSquadEditorIsSlotInActiveFormation,
  runSquadEditorIsTacticalRoleMismatch,
  runSquadEditorKeepPlayerAtFreeDropPosition,
  runSquadEditorLoadSquadFromBackend,
  runSquadEditorLoadSubdivisions,
  runSquadEditorLockGoalkeeperToGoalArea,
  runSquadEditorMovePlayerToBench,
  runSquadEditorOnFormationChange,
  runSquadEditorOnFormationSelect,
  runSquadEditorOnMarkerClick,
  runSquadEditorOnMarkerDragStarted,
  runSquadEditorOnSlotClick,
  runSquadEditorPersistLastModalMoveHarnessCase,
  runSquadEditorRefreshAfterLineupMutation,
  runSquadEditorRemovePlayerFromSlot,
  runSquadEditorRequestRatingsPreview,
  runSquadEditorResetCustomPositions,
  runSquadEditorSaveLineup,
  runSquadEditorSetLastCoachMoveReadForDrag,
  runSquadEditorSetupChemistryPreviewPipeline,
  runSquadEditorShowConditionWarning,
  runSquadEditorSnapPlayerBackToSlotCenter,
  runSquadEditorTriggerChemistryPreview,
  runSquadEditorUpdateFormationDetection
} from './squad-editor-modal-flow.utils';
@Component({
  selector: 'app-squad-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatIconModule, DragDropModule],
  templateUrl: './squad-editor-modal.component.html',
  styleUrl: './squad-editor-modal.component.css'
})
export class SquadEditorModalComponent implements OnInit, OnDestroy {
  // Exposed to the template for clamping visual meter widths.
  readonly Math = Math;
  private destroy$ = new Subject<void>();
  @Output() formationChanged = new EventEmitter<SquadEditorFormationChange>();
  private formationChangeCompleteSubject = new Subject<void>();
  @Output() formationChangeComplete = new EventEmitter<Subject<void>>();
  subdivisions$ = new BehaviorSubject<FieldSubdivisionDTO[]>([]);
  homePlayers$ = new BehaviorSubject<PlayerOnFieldDto[]>([]);
  benchPlayers$ = new BehaviorSubject<PlayerOnFieldDto[]>([]);
  lastCoachMoveRead: SquadEditorCoachMoveReadView | null = null;
  private pendingCoachMoveBaseline: SquadEditorCoachBaseline | null = null;
  selectedSlot: FieldSubdivisionDTO | null = null;
  selectedPlayerToAssign: string = '';
  errorMessage$ = new BehaviorSubject<string>('');
  conditionWarning$ = new BehaviorSubject<string>('');
  lineupWarning$ = new BehaviorSubject<LineupWarningDTO | null>(null);
  homeTeamName = 'Mi Equipo';
  homeFormation$ = new BehaviorSubject<string>('4-4-2');
  selectedFormation = '4-4-2';
  formations: readonly string[] = ALL_FORMATIONS;
  private _isCustomLineup = false;
  get dropdownFormationValue(): string {
    return this._isCustomLineup ? USER_FORMATION_LABEL : this.selectedFormation;
  }
  isCustomLineup(): boolean {
    return this._isCustomLineup;
  }
  get chemistryScore(): number | null {
    return this.getDisplayedChemistryScore();
  }
  get avgStamina(): number {
    const ps = this.homePlayers;
    if (ps.length === 0) { return 100; }
    const sum = ps.reduce((acc, p) => acc + (typeof p.stamina === 'number' ? p.stamina : 100), 0);
    return Math.round(sum / ps.length);
  }
  get injuredCount(): number {
    return this.homePlayers.filter(p => !!p.injured).length;
  }
  get attackRating(): number {
    return this.liveRatings?.attackRating
      ?? this.formationEffectiveness$.value?.attackRating
      ?? 0;
  }
  get midfieldRating(): number {
    return this.liveRatings?.midfieldRating
      ?? this.formationEffectiveness$.value?.midfieldRating
      ?? 0;
  }
  get defenseRating(): number {
    return this.liveRatings?.defenseRating
      ?? this.formationEffectiveness$.value?.defenseRating
      ?? 0;
  }
  get paceRating(): number {
    return computeSquadEditorAvgAttribute(this.homePlayers, 'speed');
  }
  get techniqueRating(): number {
    return computeSquadEditorAvgAttribute(this.homePlayers, 'technique');
  }
  get mentalityRating(): number {
    return computeSquadEditorAvgAttribute(this.homePlayers, 'mentality');
  }
  private liveRatings: { attackRating: number; midfieldRating: number; defenseRating: number } | null = null;
  private ratingsPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  requestRatingsPreview(): void { runSquadEditorRequestRatingsPreview(this); }
  private fetchRatingsPreview(): void { runSquadEditorFetchRatingsPreview(this); }
  captureRatingsFromFormationEffectiveness(): void { runSquadEditorCaptureRatingsFromFormationEffectiveness(this); }
  deriveStyleTags(formationLabel: string, players: PlayerOnFieldDto[]): string[] { return runSquadEditorDeriveStyleTags(this, formationLabel, players); }
  get styleTags(): string[] {
    return this.deriveStyleTags(this.dropdownFormationValue, this.homePlayers);
  }
  get zoneBreakdown() { return readSquadEditorZoneBreakdown(this); }
  get offRolePlayers() { return readSquadEditorOffRolePlayers(this); }
  get tacticalPenaltySummary() { return readSquadEditorTacticalPenaltySummary(this); }
  private getOffRoleAdvice(naturalRole: string, actualZone: string, penaltyPct: number): string { return runSquadEditorGetOffRoleAdvice(this, naturalRole, actualZone, penaltyPct); }
  get tacticalShapeMatrix(): Array<{ zone: 'ATT' | 'MID' | 'DEF'; left: number; center: number; right: number }> {
    return buildTacticalShapeMatrix(this.tacticalOutfieldPoints);
  }
  private get tacticalOutfieldPoints(): Array<{ x: number; y: number }> {
    return this.getUniqueValidHomePlayers()
      .filter(player => !this.isGoalkeeperPlayer(player))
      .map(player => ({
        x: this.getMarkerX(player),
        y: this.getMarkerY(player),
      }));
  }
  get tacticalShapeSummary(): { width: number; compactness: number; blockHeight: number; defensiveDepth: number } {
    return buildTacticalShapeSummary(this.tacticalOutfieldPoints);
  }
  get tacticalChannelBreakdown(): Array<{
    label: 'L' | 'C' | 'R';
    threat: number;
    connection: number;
    coverage: number;
  }> {
    return buildTacticalChannelBreakdown(this.tacticalOutfieldPoints);
  }
  get tacticalShapeWarnings(): string[] { return readSquadEditorTacticalShapeWarnings(this); }
  get tacticalCoachReads() { return readSquadEditorTacticalCoachReads(this); }
  private beginCoachMoveImpactTracking(): void { runSquadEditorBeginCoachMoveImpactTracking(this); }
  private enrichLastCoachMoveReadWithLatestDelta(): void { runSquadEditorEnrichLastCoachMoveReadWithLatestDelta(this); }
  private getTacticalChannelScoresSnapshot(): {
    left: number | null;
    center: number | null;
    right: number | null;
  } { return runSquadEditorGetTacticalChannelScoresSnapshot(this); }
  private readCoachChannelScore(scores: Record<string, number> | undefined, key: 'LEFT' | 'CENTER' | 'RIGHT'): number | null {
    const value = scores?.[key];
    return typeof value === 'number' && isFinite(value) ? value : null;
  }
  private setLastCoachMoveReadForDrag(
    player: PlayerOnFieldDto,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    snappedToNative: boolean
  ): void { runSquadEditorSetLastCoachMoveReadForDrag(this, player, fromX, fromY, toX, toY, snappedToNative); }
  private visualChannelFromCoords(x: number): TacticalChannel {
    return tacticalChannelFromX(x);
  }
  private visualLineFromCoords(y: number): TacticalLine {
    return tacticalLineFromY(y);
  }
  private getVisualChannel(player: PlayerOnFieldDto): TacticalChannel {
    return tacticalChannelFromX(this.getMarkerX(player));
  }
  private getVisualLine(player: PlayerOnFieldDto): TacticalLine {
    return tacticalLineFromY(this.getMarkerY(player));
  }
  private formationPositions: { [key: string]: FormationPositionDTO[] } = {};
  private slotPlayerMap: { [slotId: string]: PlayerOnFieldDto } = {};
  loadingFormation$ = new BehaviorSubject<boolean>(false);
  private isInitializing = true;
  isFormationChanging = false;
  private previewTrigger$ = new Subject<{
    ids: string[];
    formation: string;
    slots: LineupSlotDTO[];
    signature: string;
  }>();
  previewedChemistry$ = new BehaviorSubject<ChemistryDetailDTO | null>(null);
  currentChemistryScore: number | null = null;
  previewError = false;
  formationEffectiveness$ = new BehaviorSubject<FormationEffectivenessDTO | null>(null);
  get subdivisions() { return this.subdivisions$.value; }
  get homePlayers() { return this.homePlayers$.value; }
  get benchPlayers() { return this.benchPlayers$.value; }
  get errorMessage() { return this.errorMessage$.value; }
  get conditionWarning() { return this.conditionWarning$.value; }
  get homeFormation() { return this.homeFormation$.value; }
  get loadingFormation() { return this.loadingFormation$.value; }
  constructor(
    private http: HttpClient,
    private dialogRef: MatDialogRef<SquadEditorModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { careerId?: string; matchId: string | null; squad?: SessionPlayer[]; currentFormation?: string },
    private cdr: ChangeDetectorRef,
    private chemistryPreview: ChemistryPreviewService
  ) {
    this.setupChemistryPreviewPipeline();
  }
  ngOnInit() {
    this.loadSubdivisions();
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.previewTrigger$.complete();
  }
  private setupChemistryPreviewPipeline(): void { runSquadEditorSetupChemistryPreviewPipeline(this); }
  private triggerChemistryPreview(): void { runSquadEditorTriggerChemistryPreview(this); }
  private loadSubdivisions(): void { runSquadEditorLoadSubdivisions(this); }
  private loadSquadFromBackend(): void { runSquadEditorLoadSquadFromBackend(this); }
  get occupiedSlots(): number {
    return this.getUniqueValidHomePlayers().length;
  }
  isSlotOccupied(sub: FieldSubdivisionDTO): boolean {
    return !!this.slotPlayerMap[sub.subdivisionId];
  }
  trackByPlayer(index: number, player: PlayerOnFieldDto): string {
    return player.playerId;
  }
  getPlayerInSlot(sub: FieldSubdivisionDTO): PlayerOnFieldDto | undefined {
    return this.slotPlayerMap[sub.subdivisionId];
  }
  isRecommendedSlot(sub: FieldSubdivisionDTO): boolean { return runSquadEditorIsRecommendedSlot(this, sub); }
  isSlotInActiveFormation(subdivisionId: string | undefined): boolean { return runSquadEditorIsSlotInActiveFormation(this, subdivisionId); }
  shouldRenderSlot(sub: FieldSubdivisionDTO): boolean {
    if (this.isRecommendedSlot(sub)) { return true; }
    if (this.isSlotOccupied(sub)) { return true; }
    return false;
  }
  isMissingPlayer(sub: FieldSubdivisionDTO): boolean {
    return this.isRecommendedSlot(sub)
      && !this.isSlotOccupied(sub)
      && !this.isSlotAbandonedByOverride(sub);
  }
  isSlotAbandonedByOverride(sub: FieldSubdivisionDTO): boolean { return runSquadEditorIsSlotAbandonedByOverride(this, sub); }
  isSlotOverridden(sub: FieldSubdivisionDTO): boolean {
    const player = this.slotPlayerMap[sub.subdivisionId];
    return !!player && this.hasOverridePosition(player);
  }
  hasOverridePosition(player: PlayerOnFieldDto): boolean {
    return typeof player.xPercent === 'number' || typeof player.yPercent === 'number';
  }
  isGoalkeeperPlayer(player: PlayerOnFieldDto | null | undefined): boolean {
    return this.getRoleFamily(player?.role ?? '') === 'GK';
  }
  private isGoalkeeperSlot(slotId: string | null | undefined): boolean { return isSquadEditorGoalkeeperSlot(slotId); }
  private canPlayerUseSlot(player: PlayerOnFieldDto, slotId: string | null | undefined): boolean { return canSquadEditorPlayerUseSlot(this.getRoleFamily(player?.role ?? ''), slotId); }
  private lockGoalkeeperToGoalArea(player: PlayerOnFieldDto): void { runSquadEditorLockGoalkeeperToGoalArea(this, player); }
  private isInsideGoalkeeperProtectedArea(xPct: number, yPct: number): boolean { return isInsideSquadEditorGoalkeeperProtectedArea(xPct, yPct, this.subdivisions); }
  getMarkerRoleLabel(player: PlayerOnFieldDto): string {
    if (!player?.slotId) { return player?.role ?? ''; }
    const tacticalRole = this.getRecommendedRoleBySlotId(player.slotId);
    return tacticalRole || player.role;
  }
  getRecommendedRole(sub: FieldSubdivisionDTO): string {
    return this.getRecommendedRoleBySlotId(sub.subdivisionId);
  }
  private getRecommendedRoleBySlotId(slotId: string): string { return runSquadEditorGetRecommendedRoleBySlotId(this, slotId); }
  getSlotCenterX(slotId: string): number {
    const sub = this.subdivisions.find(s => s.subdivisionId === slotId);
    if (!sub) return 50;
    return sub.left + (sub.width / 2);
  }
  getSlotCenterY(slotId: string): number {
    const sub = this.subdivisions.find(s => s.subdivisionId === slotId);
    if (!sub) return 50;
    return sub.top + (sub.height / 2);
  }
  onSlotClick(sub: FieldSubdivisionDTO): void { runSquadEditorOnSlotClick(this, sub); }
  onMarkerClick(player: PlayerOnFieldDto): void { runSquadEditorOnMarkerClick(this, player); }
  assignPlayerToSlot(): void { runSquadEditorAssignPlayerToSlot(this); }
  removePlayerFromSlot(player: PlayerOnFieldDto): void { runSquadEditorRemovePlayerFromSlot(this, player); }
  get slotDropListIds(): string[] {
    return (this.subdivisions || []).map(s => 'slot-' + s.subdivisionId);
  }
  get allDropListIds(): string[] {
    return this.slotDropListIds.concat([this.BENCH_DROP_LIST_ID, this.FIELD_DROP_LIST_ID]);
  }
  readonly BENCH_DROP_LIST_ID = 'bench-list';
  readonly FIELD_DROP_LIST_ID = 'field-drop-area';
  @ViewChild('fieldContainer', { static: false }) fieldContainer!: ElementRef<HTMLElement>;
  get playerInTargetSlot(): { [subdivisionId: string]: PlayerOnFieldDto } {
    return this.slotPlayerMap;
  }
  handleSlotDrop(event: CdkDragDrop<FieldSubdivisionDTO>): void { runSquadEditorHandleSlotDrop(this, event); }
  handleBenchDrop(event: CdkDragDrop<string>): void { runSquadEditorHandleBenchDrop(this, event); }
  private subdivisionIdFromDropListId(dropListId: string): string | null { return squadEditorSubdivisionIdFromDropListId(dropListId); }
  private markerPickupOffset = new Map<string, { x: number; y: number }>();
  onMarkerDragStarted(event: CdkDragStart): void { runSquadEditorOnMarkerDragStarted(this, event); }
  handleMarkerDragEnd(event: CdkDragEnd, player: PlayerOnFieldDto): void { runSquadEditorHandleMarkerDragEnd(this, event, player); }
  private isDropOverBenchCard(dropX: number, dropY: number): boolean { return runSquadEditorIsDropOverBenchCard(this, dropX, dropY); }
  private applyMarkerFieldDrop(player: PlayerOnFieldDto, move: SquadEditorMarkerMoveContext): void { runSquadEditorApplyMarkerFieldDrop(this, player, move); }
  private snapPlayerBackToSlotCenter(
    player: PlayerOnFieldDto,
    move: SquadEditorMarkerMoveContext,
    nativeCenter: {
      xPercent: number;
      yPercent: number;
    }
  ): void { return runSquadEditorSnapPlayerBackToSlotCenter(this, player, move, nativeCenter); }
  private keepPlayerAtFreeDropPosition(
    player: PlayerOnFieldDto,
    move: SquadEditorMarkerMoveContext
  ): void { runSquadEditorKeepPlayerAtFreeDropPosition(this, player, move); }
  private applySlotAssignment(
    player: PlayerOnFieldDto,
    sourceSlotId: string | null,
    targetSlotId: string,
    occupant: PlayerOnFieldDto | null
  ): void { runSquadEditorApplySlotAssignment(this, player, sourceSlotId, targetSlotId, occupant); }
  private movePlayerToBench(player: PlayerOnFieldDto): void { runSquadEditorMovePlayerToBench(this, player); }
  private refreshAfterLineupMutation(): void { runSquadEditorRefreshAfterLineupMutation(this); }
  private findClosestSubdivision(
    xPct: number,
    yPct: number,
    player?: PlayerOnFieldDto
  ): FieldSubdivisionDTO | null { return runSquadEditorFindClosestSubdivision(this, xPct, yPct, player); }
  private persistLastModalMoveHarnessCase(
    player: PlayerOnFieldDto,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number
  ): void { runSquadEditorPersistLastModalMoveHarnessCase(this, player, fromX, fromY, targetX, targetY); }
  getMarkerX(player: PlayerOnFieldDto): number { return runSquadEditorGetMarkerX(this, player); }
  getMarkerY(player: PlayerOnFieldDto): number { return runSquadEditorGetMarkerY(this, player); }
  private getFormationPositionCoord(slotId: string, axis: 'x' | 'y'): number | null { return runSquadEditorGetFormationPositionCoord(this, slotId, axis); }
  resetCustomPositions(): void { runSquadEditorResetCustomPositions(this); }
  hasCustomPositions(): boolean {
    return this.homePlayers$.value.some(p =>
      typeof p.xPercent === 'number' || typeof p.yPercent === 'number');
  }
  getEffectivenessForSlot(subdivisionId: string | undefined): number | null { return runSquadEditorGetEffectivenessForSlot(this, subdivisionId); }
  getEffectivenessColor(subdivisionId: string | undefined): 'green' | 'yellow' | 'red' | null {
    const v = this.getEffectivenessForSlot(subdivisionId);
    if (v === null) { return null; }
    return effectivenessColor(v);
  }
  getChipEffectivenessClass(subdivisionId: string | undefined): 'eff-good' | 'eff-warning' | 'eff-bad' | null { return runSquadEditorGetChipEffectivenessClass(this, subdivisionId); }
  getMarkerRoleClasses(role: string | undefined): { [klass: string]: boolean } {
    return getRoleMarkerClasses(role);
  }
  rolesMatch(playerRole: string | undefined, formationRole: string | undefined): boolean {
    return roleFamiliesMatch(playerRole, formationRole);
  }
  private getRoleFamily(role: string): PlayerRoleFamily | null {
    return resolveRoleFamily(role);
  }
  private getPositionRoleFamily(player: PlayerOnFieldDto): PlayerRoleFamily | null { return runSquadEditorGetPositionRoleFamily(this, player); }
  detectFormation(): string { return runSquadEditorDetectFormation(this); }
  updateFormationDetection(): void { runSquadEditorUpdateFormationDetection(this); }
  isOffRole(player: PlayerOnFieldDto): boolean { return runSquadEditorIsOffRole(this, player); }
  private isTacticalRoleMismatch(
    playerRole: string | undefined,
    tacticalRole: string | undefined,
    actualZone?: 'GK' | 'DEF' | 'MID' | 'ATT' | null
  ): boolean { return runSquadEditorIsTacticalRoleMismatch(this, playerRole, tacticalRole, actualZone); }
  onFormationSelect(newValue: string): void { runSquadEditorOnFormationSelect(this, newValue); }
  onFormationSelectChange(event: Event): void {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    this.onFormationSelect(select?.value ?? '');
  }
  get userFormationLabel(): string {
    return USER_FORMATION_LABEL;
  }
  getDisplayedChemistryScore(): number | null { return runSquadEditorGetDisplayedChemistryScore(this); }
  get teamAverage(): number | null {
    const fe = this.formationEffectiveness$.value;
    return fe && typeof fe.teamAverage === 'number' ? fe.teamAverage : null;
  }
  get tacticalChemistry() {
    return this.previewedChemistry$.value?.breakdown?.tacticalChemistry ?? null;
  }
  get inferredFormation(): string | null {
    const fe = this.formationEffectiveness$.value;
    return fe?.inferredFormation ?? null;
  }
  getDisplayedFormationLabel(fe: Partial<FormationEffectivenessDTO> | null): string { return runSquadEditorGetDisplayedFormationLabel(this, fe); }
  onFormationChange(newFormation?: string): void { runSquadEditorOnFormationChange(this, newFormation); }
  private executeAutoSelect(formation: string): void { runSquadEditorExecuteAutoSelect(this, formation); }
  private applyLineupToSlots(
    formationName: string,
    playersList: SquadEditorLineupPlayer[],
    backendSlots: LineupSlotDTO[] = []
  ): void { runSquadEditorApplyLineupToSlots(this, formationName, playersList, backendSlots); }
  private applyCurrentXiToFormation(formationName: string): void { runSquadEditorApplyCurrentXiToFormation(this, formationName); }
  private executeFormationChange(newFormation: string): void { runSquadEditorExecuteFormationChange(this, newFormation); }
  private saveLineup(onDone?: () => void): void { runSquadEditorSaveLineup(this, onDone); }
  private getUniqueValidHomePlayers(): PlayerOnFieldDto[] { return runSquadEditorGetUniqueValidHomePlayers(this); }
  close(): void {
    this.dialogRef.close();
  }
  showConditionWarning(player: PlayerOnFieldDto): void { runSquadEditorShowConditionWarning(this, player); }
  clearConditionWarning(): void {
    this.conditionWarning$.next('');
  }
}
