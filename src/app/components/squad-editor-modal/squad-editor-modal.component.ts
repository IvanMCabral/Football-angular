import { Component, Inject, OnInit, ChangeDetectorRef, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subject, BehaviorSubject, of, takeUntil, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, DragDropModule } from '@angular/cdk/drag-drop';
import { LineupWarningDTO } from '../../shared/models/lineup/lineup-warning.dto';
import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';
import { FormationDTO, FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';
import { ChemistryDetailDTO } from '../../shared/models/lineup/lineup.dto';
import { FormationEffectivenessDTO, effectivenessColor } from '../../shared/models/lineup/formation-effectiveness.dto';
import { ALL_FORMATIONS, USER_FORMATION_LABEL } from '../../shared/constants/formations';
import { ChemistryPreviewService } from '../../core/services/chemistry-preview.service';
import { SessionPlayer } from '../../shared/models/player.model';
import {
  PlayerRoleFamily,
  countRoleFamily as countRolesByFamily,
  getMarkerRoleClasses as getRoleMarkerClasses,
  getRoleFamily as resolveRoleFamily,
  rolesMatch as roleFamiliesMatch
} from '../../shared/utils/player-role-utils';
import {
  TacticalChannel,
  TacticalLine,
  buildTacticalChannelBreakdown,
  buildTacticalShapeMatrix,
  buildTacticalShapeSummary,
  tacticalChannelFromX,
  tacticalLineFromY
} from '../../shared/utils/tactical-shape-utils';
import { clampFieldPercent } from '../../shared/utils/field-percent.utils';
import { computeSquadEditorAvgAttribute } from './squad-editor-modal-ratings.utils';
import {
  SQUAD_EDITOR_GOALKEEPER_SLOT_ID,
  canSquadEditorPlayerUseSlot,
  isInsideSquadEditorGoalkeeperProtectedArea,
  isSquadEditorGoalkeeperSlot,
} from './squad-editor-modal-goalkeeper.utils';
import {
  buildSquadEditorCoachChannelDeltas,
  buildSquadEditorVisualChannelDeltas,
  buildSquadEditorVisualEngineTension,
  describeSquadEditorCoachDeltaSeverity,
  pushSquadEditorCoachDelta,
  squadEditorVisualDeltaHasHardWarning,
} from './squad-editor-modal-move-impact.utils';
import {
  buildSquadEditorCoachMoveRead,
  describeSquadEditorCoachMoveSpatialRead,
} from './squad-editor-modal-move-read.utils';
import { buildSquadEditorTacticalCoachReads } from './squad-editor-modal-tactical-read.utils';
import {
  SquadEditorAutoSelectResponse,
  SquadEditorCoachBaseline,
  SquadEditorCoachMoveReadView,
  SquadEditorCurrentLineupResponse,
  SquadEditorFormationChange,
  SquadEditorLineupPlayer,
  SquadEditorMarkerMoveContext,
} from './squad-editor-modal.models';
import {
  clearSquadEditorDragTransform,
  getSquadEditorDragData,
  getSquadEditorDragRef,
  resetSquadEditorDragSource,
} from './squad-editor-modal-drag.utils';
import {
  SquadEditorRect,
  computeSquadEditorSlotCenter,
  computeSquadEditorFieldDropPercent,
  isPointOverAnyInsetRect,
  isSquadEditorDropNearSlotCenter,
} from './squad-editor-modal-geometry.utils';

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

  requestRatingsPreview(): void {
    if (this.ratingsPreviewTimer) {
      clearTimeout(this.ratingsPreviewTimer);
    }
    this.ratingsPreviewTimer = setTimeout(() => {
      this.ratingsPreviewTimer = null;
      this.fetchRatingsPreview();
    }, 150);
  }

  private fetchRatingsPreview(): void {
    const slots = this.homePlayers
      .filter(p => !!p.slotId)
      .map(p => {
        const dto: { playerId: string; subdivisionId: string;
                     customXPercent?: number; customYPercent?: number } = {
          playerId: p.playerId,
          subdivisionId: p.slotId,
        };
        if (typeof p.xPercent === 'number' && isFinite(p.xPercent)) {
          dto.customXPercent = p.xPercent;
        }
        if (typeof p.yPercent === 'number' && isFinite(p.yPercent)) {
          dto.customYPercent = p.yPercent;
        }
        return dto;
      });
    const body = { formation: this.selectedFormation, slots };
    this.http.post<{
      attackRating: number;
      midfieldRating: number;
      defenseRating: number;
      inferredFormation?: string;
      perPlayerEffectiveness?: Record<string, number>;
      teamAverage?: number;
    }>(
      `${environment.apiUrl}/career/lineup/preview-ratings`, body)
      .subscribe({
        next: (res) => {
          if (res && typeof res.attackRating === 'number'
              && typeof res.midfieldRating === 'number'
              && typeof res.defenseRating === 'number') {
            this.liveRatings = {
              attackRating: Math.round(res.attackRating),
              midfieldRating: Math.round(res.midfieldRating),
              defenseRating: Math.round(res.defenseRating),
            };
            if (typeof res.teamAverage === 'number') {
              this.formationEffectiveness$.next({
                inferredFormation: res.inferredFormation || this.selectedFormation,
                perPlayerEffectiveness: res.perPlayerEffectiveness || {},
                teamAverage: res.teamAverage,
                attackRating: res.attackRating,
                midfieldRating: res.midfieldRating,
                defenseRating: res.defenseRating,
              });
            }
            this.enrichLastCoachMoveReadWithLatestDelta();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }
        },
        error: () => {
        }
      });
  }

  captureRatingsFromFormationEffectiveness(): void {
    const fe = this.formationEffectiveness$.value;
    if (fe && typeof fe.attackRating === 'number'
        && typeof fe.midfieldRating === 'number'
        && typeof fe.defenseRating === 'number') {
      this.liveRatings = {
        attackRating: Math.round(fe.attackRating),
        midfieldRating: Math.round(fe.midfieldRating),
        defenseRating: Math.round(fe.defenseRating),
      };
    }
  }

  deriveStyleTags(formationLabel: string, players: PlayerOnFieldDto[]): string[] {
    const tags: string[] = [];
    const roleCounts: Record<string, number> = {};
    for (const p of players) {
      const role = (p.role || '').toUpperCase();
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    const has = (k: string) => (roleCounts[k] || 0) > 0;
    const count = (k: string) => roleCounts[k] || 0;

    switch (formationLabel) {
      case '4-3-3': tags.push('Possession + Wing Play', 'Creative mids'); break;
      case '4-4-2': tags.push('Balanced', 'Direct Attack'); break;
      case '3-5-2': tags.push('Midfield Dominance', 'Wing-Back Overlap'); break;
      case '5-3-2': tags.push('Defensive', 'Counter-Attack'); break;
      case '4-5-1': tags.push('Defensive Midfield', 'Counter-Attack'); break;
      case '5-4-1': tags.push('Ultra Defensive', 'Compact Midfield'); break;
      case '3-4-3': tags.push('Attacking Wing Play', 'High Press'); break;
      case '4-2-3-1': tags.push('Tactical + Creative', 'Holding Midfield'); break;
      case '4-1-4-1': tags.push('Compact Defensive', 'Counter-Attack'); break;
      case '3-5-1-1': tags.push('Midfield Dominance', 'False Nine'); break;
      default:
        if (players.length >= 11) { tags.push('Custom Formation'); }
    }

    if (has('CAM') && !tags.some(t => t.includes('Creative'))) { tags.push('Creative mid'); }
    if (has('CDM') && !tags.some(t => t.includes('Holding'))) { tags.push('Holding mid'); }
    if ((has('LW') || has('RW')) && !tags.some(t => t.includes('Wing'))) { tags.push('Wing Play'); }
    if (count('CB') >= 4 && !tags.some(t => t.includes('Defensive'))) { tags.push('Defensive Line'); }
    if (count('ST') >= 3 && !tags.some(t => t.includes('Direct'))) { tags.push('Direct Attack'); }
    if (players.length < 11) { tags.length = 0; tags.push('Lineup incompleto'); }

    return tags;
  }

  get styleTags(): string[] {
    return this.deriveStyleTags(this.dropdownFormationValue, this.homePlayers);
  }

  get zoneBreakdown(): Array<{
    zone: string;
    count: number;
    avgOverall: number;
    avgEff: number;
    contributionPct: number;
  }> {
    const zones: Array<'GK' | 'DEF' | 'MID' | 'ATT'> = ['GK', 'DEF', 'MID', 'ATT'];
    const fe = this.formationEffectiveness$.value;
    const effMap = (fe && fe.perPlayerEffectiveness) || {};
    const players = this.homePlayers;

    const rows = zones.map(zone => {
      const zonePlayers = players.filter(p => this.getPositionRoleFamily(p) === zone);
      const count = zonePlayers.length;
      const avgOverall = count === 0
        ? 0
        : Math.round(zonePlayers.reduce((acc, p) => acc + (p.overall || 70), 0) / count);
      const avgEff = count === 0
        ? 0
        : Math.round(
            (zonePlayers.reduce((acc, p) => {
              const e = (p.slotId && typeof effMap[p.slotId] === 'number') ? effMap[p.slotId] : 1;
              return acc + e;
            }, 0) / count) * 100
          );
      const contributionScore = count * avgOverall * (avgEff / 100);
      return { zone, count, avgOverall, avgEff, contributionScore };
    });

    const totalContribution = rows.reduce((acc, r) => acc + r.contributionScore, 0);
    return rows.map(r => ({
      zone: r.zone,
      count: r.count,
      avgOverall: r.avgOverall,
      avgEff: r.avgEff,
      contributionPct: totalContribution === 0
        ? 0
        : Math.round((r.contributionScore / totalContribution) * 100),
    }));
  }

  get offRolePlayers(): Array<{
    player: PlayerOnFieldDto;
    naturalRole: string;
    actualZone: string;
    penaltyPct: number;
    advice: string;
  }> {
    const fe = this.formationEffectiveness$.value;
    const effMap = (fe && fe.perPlayerEffectiveness) || {};
    const result: Array<{
      player: PlayerOnFieldDto;
      naturalRole: string;
      actualZone: string;
      penaltyPct: number;
      advice: string;
    }> = [];
    for (const p of this.homePlayers) {
      const natural = this.getRoleFamily(p.role);
      const actual = this.getPositionRoleFamily(p);
      const tacticalRole = p.slotId ? this.getRecommendedRoleBySlotId(p.slotId) : '';
      if (!natural || !actual) { continue; }
      if (!this.isTacticalRoleMismatch(p.role, tacticalRole, actual)) { continue; }
      const eff = (p.slotId && typeof effMap[p.slotId] === 'number') ? effMap[p.slotId] : 1.0;
      const penaltyPct = Math.max(0, Math.round((1 - eff) * 100));
      result.push({
        player: p,
        naturalRole: p.role,
        actualZone: tacticalRole || actual,
        penaltyPct,
        advice: this.getOffRoleAdvice(p.role, tacticalRole || actual, penaltyPct),
      });
    }
    result.sort((a, b) => b.penaltyPct - a.penaltyPct);
    return result;
  }

  get tacticalPenaltySummary(): { level: 'warning' | 'severe'; message: string } {
    const rows = this.offRolePlayers;
    const totalPenalty = rows.reduce((acc, row) => acc + row.penaltyPct, 0);
    const severeRows = rows.filter(row => row.penaltyPct >= 25).length;
    if (severeRows > 0 || totalPenalty >= 45) {
      return {
        level: 'severe',
        message: `Impacto fuerte: ${rows.length} jugador(es) fuera de rol, ${totalPenalty}% acumulado. Cambia jugador o formación si querés competir fino.`,
      };
    }
    return {
      level: 'warning',
      message: `Impacto moderado: ${rows.length} ajuste(s), ${totalPenalty}% acumulado. Es jugable, pero el motor lo penaliza.`,
    };
  }

  private getOffRoleAdvice(naturalRole: string, actualZone: string, penaltyPct: number): string {
    const naturalFamily = this.getRoleFamily(naturalRole);
    const actualFamily = this.getRoleFamily(actualZone) ?? actualZone;
    if (['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'].includes(actualZone) && naturalFamily === 'MID') {
      return penaltyPct >= 10
        ? 'Improvisa banda: puede ordenar, pero pierde desborde y cobertura natural del carril.'
        : 'Banda improvisada leve: sirve de emergencia, pero no es especialista.';
    }
    if (naturalFamily === 'DEF' && actualZone === 'MID') {
      return penaltyPct >= 20
        ? 'Sirve para cerrar el partido; para construir juego, busca un MID o winger natural.'
        : 'Rueda de auxilio defensiva: protege, pero baja fluidez en medio.';
    }
    if (naturalFamily === 'ATT' && actualFamily === 'MID') {
      return 'Aporta gol, pero pierde retorno y orden. Mejor como ST/CAM o con cobertura detrás.';
    }
    if (naturalFamily === 'MID' && actualFamily === 'DEF') {
      return 'Ayuda a salir jugando, pero no reemplaza un defensor natural.';
    }
    if (actualFamily === 'ATT') {
      return 'Movimiento ofensivo agresivo: puede romper balance si no hay cobertura.';
    }
    return 'Revisa si la formación pide otro perfil natural para ese sector.';
  }

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

  get tacticalShapeWarnings(): string[] {
    const matrix = this.tacticalShapeMatrix;
    const summary = this.tacticalShapeSummary;
    const warnings: string[] = [];
    const totalLeft = matrix.reduce((acc, r) => acc + r.left, 0);
    const totalCenter = matrix.reduce((acc, r) => acc + r.center, 0);
    const totalRight = matrix.reduce((acc, r) => acc + r.right, 0);
    if (totalLeft <= 1) { warnings.push('Banda izquierda muy expuesta'); }
    if (totalRight <= 1) { warnings.push('Banda derecha muy expuesta'); }
    if (totalCenter <= 2) { warnings.push('Centro con poca presencia'); }
    if (summary.width < 45) { warnings.push('Equipo muy cerrado: vulnerable por fuera'); }
    if (summary.width > 75) { warnings.push('Equipo muy ancho: puede partirse por dentro'); }
    if (summary.compactness < 45) { warnings.push('Bloque largo: líneas separadas'); }
    return warnings;
  }

  get tacticalCoachReads(): Array<{ title: string; body: string; level: 'good' | 'warn' | 'danger' | 'info' }> {
    const players = this.getUniqueValidHomePlayers().filter(p => !this.isGoalkeeperPlayer(p));
    const wideHigh = players.filter(p => Math.abs(this.getMarkerX(p) - 50) >= 32 && this.getMarkerY(p) < 58).length;
    const wideCover = players.filter(p => Math.abs(this.getMarkerX(p) - 50) >= 32 && this.getMarkerY(p) >= 58).length;

    return buildSquadEditorTacticalCoachReads({
      outfieldPlayerCount: players.length,
      matrix: this.tacticalShapeMatrix,
      summary: this.tacticalShapeSummary,
      wideHigh,
      wideCover,
      offRoleCount: this.offRolePlayers.length,
      severeOffRoleCount: this.offRolePlayers.filter(row => row.penaltyPct >= 20).length,
    });
  }

  private beginCoachMoveImpactTracking(): void {
    this.pendingCoachMoveBaseline = {
      attack: this.attackRating,
      midfield: this.midfieldRating,
      defense: this.defenseRating,
      chemistry: this.getDisplayedChemistryScore(),
      channels: this.getTacticalChannelScoresSnapshot(),
      visualChannels: this.tacticalChannelBreakdown,
    };
  }

  private enrichLastCoachMoveReadWithLatestDelta(): void {
    if (!this.pendingCoachMoveBaseline || !this.lastCoachMoveRead) { return; }
    const baseline = this.pendingCoachMoveBaseline;
    const currentChemistry = this.getDisplayedChemistryScore();
    const deltas: string[] = [];
    const magnitudes: number[] = [];

    pushSquadEditorCoachDelta(deltas, magnitudes, 'ATT', this.attackRating - baseline.attack);
    pushSquadEditorCoachDelta(deltas, magnitudes, 'MID', this.midfieldRating - baseline.midfield);
    pushSquadEditorCoachDelta(deltas, magnitudes, 'DEF', this.defenseRating - baseline.defense);
    if (baseline.chemistry !== null && currentChemistry !== null) {
      pushSquadEditorCoachDelta(deltas, magnitudes, 'Chem', currentChemistry - baseline.chemistry);
    }
    const baseBody = this.lastCoachMoveRead.baseBody
      ?? this.lastCoachMoveRead.body.split(' Cambios:')[0];
    const channelDeltas = buildSquadEditorCoachChannelDeltas(
      baseline.channels,
      this.getTacticalChannelScoresSnapshot(),
      magnitudes,
      baseBody
    );
    const visualDeltas = buildSquadEditorVisualChannelDeltas(
      baseline.visualChannels,
      this.tacticalChannelBreakdown,
      magnitudes
    );
    const visualEngineTension = buildSquadEditorVisualEngineTension(
      baseline.visualChannels,
      this.tacticalChannelBreakdown,
      this.attackRating - baseline.attack,
      this.defenseRating - baseline.defense
    );
    const severity = describeSquadEditorCoachDeltaSeverity(magnitudes);
    const channelImpact = channelDeltas.length > 0
      ? ` Canales: ${channelDeltas.join(' · ')}.`
      : '';
    const visualImpact = visualDeltas.length > 0
      ? ` Visual: ${visualDeltas.join(' · ')}.`
      : '';
    const tensionImpact = visualEngineTension
      ? ` Ojo: ${visualEngineTension}`
      : '';
    const mainImpact = deltas.length > 0
      ? `Cambios: ${deltas.join(' · ')}.`
      : '';
    const impact = deltas.length > 0 || channelDeltas.length > 0 || visualDeltas.length > 0
      ? ` ${mainImpact}${channelImpact}${visualImpact}${tensionImpact} ${severity}`
      : ' Cambios: sin variacion numerica relevante.';

    this.lastCoachMoveRead = {
      ...this.lastCoachMoveRead,
      baseBody,
      body: `${baseBody}${impact}`,
      level: severity.includes('Impacto extremo') || squadEditorVisualDeltaHasHardWarning(visualDeltas) || !!visualEngineTension
        ? 'danger'
        : this.lastCoachMoveRead.level,
    };
  }

  private getTacticalChannelScoresSnapshot(): { left: number | null; center: number | null; right: number | null } {
    const scores = this.previewedChemistry$.value?.breakdown?.tacticalChemistry?.channelScores;
    return {
      left: this.readCoachChannelScore(scores, 'LEFT'),
      center: this.readCoachChannelScore(scores, 'CENTER'),
      right: this.readCoachChannelScore(scores, 'RIGHT'),
    };
  }

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
  ): void {
    this.lastCoachMoveRead = buildSquadEditorCoachMoveRead({
      playerName: player.name,
      playerRole: player.role,
      naturalFamily: this.getRoleFamily(player.role),
      fromX,
      fromY,
      toX,
      toY,
      snappedToNative,
    });
  }

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

  private setupChemistryPreviewPipeline(): void {
    this.previewTrigger$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.signature === b.signature),
        switchMap(snapshot => {
          if (!snapshot.ids || snapshot.ids.length !== 11) {
            this.previewError = false;
            return of(null);
          }
          return this.chemistryPreview.previewChemistry(
            snapshot.ids,
            snapshot.formation,
            snapshot.slots
          ).pipe(
            catchError(() => {
              this.previewError = true;
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(detail => {
        if (detail) {
          this.previewError = false;
        }
        this.previewedChemistry$.next(detail);
        this.enrichLastCoachMoveReadWithLatestDelta();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      });
  }

  private triggerChemistryPreview(): void {
    const ids = this.homePlayers.map(p => p.playerId);
    const slots: LineupSlotDTO[] = this.homePlayers
      .filter(p => !!p.slotId)
      .map(p => {
        const dto: LineupSlotDTO = { playerId: p.playerId, subdivisionId: p.slotId };
        if (typeof p.xPercent === 'number' && isFinite(p.xPercent)) {
          dto.customXPercent = p.xPercent;
        }
        if (typeof p.yPercent === 'number' && isFinite(p.yPercent)) {
          dto.customYPercent = p.yPercent;
        }
        return dto;
      });
    const signature = JSON.stringify({
      formation: this.selectedFormation,
      slots: slots.map(s => ({
        p: s.playerId,
        s: s.subdivisionId,
        x: typeof s.customXPercent === 'number' ? Number(s.customXPercent.toFixed(2)) : null,
        y: typeof s.customYPercent === 'number' ? Number(s.customYPercent.toFixed(2)) : null,
      }))
    });
    this.previewTrigger$.next({
      ids,
      formation: this.selectedFormation,
      slots,
      signature
    });
  }

  private loadSubdivisions(): void {
    forkJoin({
      subs: this.http.get<FieldSubdivisionDTO[]>(`${environment.apiUrl}/editor/subdivisions`),
      formations: this.http.get<FormationDTO[]>(`${environment.apiUrl}/editor/formations`).pipe(
        catchError(() => of([] as FormationDTO[]))
      )
    }).subscribe({
      next: ({ subs, formations }) => {
        this.subdivisions$.next(subs);
        formations.forEach(f => {
          this.formationPositions[f.name] = f.positions;
        });
        this.loadSquadFromBackend();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage$.next('Error al cargar las subdivisiones del campo');
        this.cdr.detectChanges();
      }
    });
  }

  private loadSquadFromBackend(): void {
    this.http.get<SquadEditorCurrentLineupResponse>(`${environment.apiUrl}/career/lineup/current`).subscribe({
      next: (response) => {
        this.currentChemistryScore = (typeof response?.chemistryScore === 'number')
            ? response.chemistryScore
            : null;

        this.formationEffectiveness$.next(
          (response?.formationEffectiveness && typeof response.formationEffectiveness.teamAverage === 'number')
            ? response.formationEffectiveness
            : null
        );
        this.captureRatingsFromFormationEffectiveness();

        const formationName = response?.formation
          || this.data?.currentFormation
          || this.selectedFormation
          || '4-4-2';
        const positions = this.formationPositions[formationName] || [];

        this.homeFormation$.next(formationName);
        this.selectedFormation = formationName;

        this.slotPlayerMap = {};

        const playersList = response?.players || [];
        if (playersList.length === 0) {
          this.executeAutoSelect(formationName);
        }

        const squadSource: SquadEditorLineupPlayer[] = (this.data?.squad && this.data.squad.length > 0)
          ? this.data.squad.map((sp: SessionPlayer) => ({
              playerId: sp.sessionPlayerId,
              name: sp.name,
              position: sp.position,
              overall: sp.attack ?? 70,
              energy: sp.energy ?? 100,
              injured: sp.injured ?? false
            }))
          : playersList;

        const squadById = new Map<string, SquadEditorLineupPlayer>();
        squadSource.forEach((p) => squadById.set(p.playerId, p));

        const selectedPlayerIds = new Set((playersList || []).map((p) => p.playerId).filter(Boolean));
        const orderedSource = selectedPlayerIds.size > 0
          ? [
              ...(playersList || []).map((p) => ({
                ...(squadById.get(p.playerId) || {}),
                ...p
              })),
              ...squadSource.filter((p) => !selectedPlayerIds.has(p.playerId))
            ]
          : squadSource;

        const allPlayers: PlayerOnFieldDto[] = orderedSource.map((p) => ({
          playerId: p.playerId,
          name: p.name,
          position: p.position,
          role: p.position,
          overall: p.overall || 70,
          slotId: '',
          stamina: p.energy || 100,
          active: !p.injured,
          isEmpty: false,
          injured: p.injured || false
        }));

        const playerById = new Map<string, PlayerOnFieldDto>();
        for (const p of allPlayers) {
          playerById.set(p.playerId, p);
        }

        const persistedSlots: LineupSlotDTO[] = response?.slots ?? [];
        const usedSubdivisionIds = new Set<string>();
        if (persistedSlots.length > 0) {
          for (const slot of persistedSlots) {
            const player = playerById.get(slot.playerId);
            if (!player) continue;
            if (!slot.subdivisionId) continue;
            // Si dos slots apuntan al mismo subdivisionId, conservar solo el primero.
            if (usedSubdivisionIds.has(slot.subdivisionId)) continue;
            player.slotId = slot.subdivisionId;
            if (typeof slot.customXPercent === 'number' && isFinite(slot.customXPercent)) {
              player.xPercent = clampFieldPercent(slot.customXPercent);
            }
            if (typeof slot.customYPercent === 'number' && isFinite(slot.customYPercent)) {
              player.yPercent = clampFieldPercent(slot.customYPercent);
            }
            this.slotPlayerMap[slot.subdivisionId] = player;
            usedSubdivisionIds.add(slot.subdivisionId);
          }
        }

        const assignedPositions = new Set<number>();
        for (const player of allPlayers) {
          if (player.slotId) {
            for (let i = 0; i < positions.length; i++) {
              if (positions[i].subdivisionId === player.slotId) {
                assignedPositions.add(i);
                break;
              }
            }
            continue;
          }
          for (let i = 0; i < positions.length; i++) {
            if (assignedPositions.has(i)) continue;
            const posRole = positions[i].role;
            if (this.rolesMatch(player.position, posRole)) {
              const slotId = positions[i].subdivisionId;
              player.slotId = slotId;
              this.slotPlayerMap[slotId] = player;
              assignedPositions.add(i);
              break;
            }
          }
        }

        for (const player of allPlayers) {
          if (!player.slotId) { continue; }
          if (this.isSlotInActiveFormation(player.slotId)) { continue; }
          delete this.slotPlayerMap[player.slotId];
          player.slotId = '';
        }

        for (const player of allPlayers) {
          if (player.slotId) { continue; }
          for (let i = 0; i < positions.length; i++) {
            if (assignedPositions.has(i)) { continue; }
            const posRole = positions[i].role;
            if (this.rolesMatch(player.position, posRole)) {
              const slotId = positions[i].subdivisionId;
              player.slotId = slotId;
              this.slotPlayerMap[slotId] = player;
              assignedPositions.add(i);
              break;
            }
          }
        }

        const seenSubdivisionIds = new Set<string>();
        for (const player of allPlayers) {
          if (!player.slotId) { continue; }
          if (seenSubdivisionIds.has(player.slotId)) {
            delete this.slotPlayerMap[player.slotId];
            player.slotId = '';
            continue;
          }
          seenSubdivisionIds.add(player.slotId);
        }

        this.homePlayers$.next(allPlayers.filter(p => p.slotId));
        this.benchPlayers$.next(allPlayers.filter(p => !p.slotId));
        this.triggerChemistryPreview();

        this.isInitializing = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.homeFormation$.next(this.selectedFormation || '4-4-2');
        this.isInitializing = false;
        this.cdr.detectChanges();
      }
    });
  }

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

  isRecommendedSlot(sub: FieldSubdivisionDTO): boolean {
    const positions = this.formationPositions[this.selectedFormation];
    if (!positions) return false;

    return positions.some(pos => pos.subdivisionId === sub.subdivisionId);
  }

  isSlotInActiveFormation(subdivisionId: string | undefined): boolean {
    if (!subdivisionId) { return false; }
    if (this._isCustomLineup && this.slotPlayerMap[subdivisionId]) {
      return true;
    }
    const positions = this.formationPositions[this.selectedFormation];
    if (!positions || positions.length === 0) { return false; }
    return positions.some(pos => pos.subdivisionId === subdivisionId);
  }

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

  isSlotAbandonedByOverride(sub: FieldSubdivisionDTO): boolean {
    if (this.slotPlayerMap[sub.subdivisionId]) { return false; }
    const abandoned = this.homePlayers$.value.find(p =>
      p.slotId === sub.subdivisionId && this.hasOverridePosition(p));
    return !!abandoned;
  }

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

  private isGoalkeeperSlot(slotId: string | null | undefined): boolean {
    return isSquadEditorGoalkeeperSlot(slotId);
  }

  private canPlayerUseSlot(player: PlayerOnFieldDto, slotId: string | null | undefined): boolean {
    return canSquadEditorPlayerUseSlot(this.getRoleFamily(player?.role ?? ''), slotId);
  }

  private lockGoalkeeperToGoalArea(player: PlayerOnFieldDto): void {
    player.slotId = SQUAD_EDITOR_GOALKEEPER_SLOT_ID;
    delete player.xPercent;
    delete player.yPercent;
    this.slotPlayerMap[SQUAD_EDITOR_GOALKEEPER_SLOT_ID] = player;
  }

  private isInsideGoalkeeperProtectedArea(xPct: number, yPct: number): boolean {
    return isInsideSquadEditorGoalkeeperProtectedArea(xPct, yPct, this.subdivisions);
  }

  getMarkerRoleLabel(player: PlayerOnFieldDto): string {
    if (!player?.slotId) { return player?.role ?? ''; }
    const tacticalRole = this.getRecommendedRoleBySlotId(player.slotId);
    return tacticalRole || player.role;
  }

  getRecommendedRole(sub: FieldSubdivisionDTO): string {
    return this.getRecommendedRoleBySlotId(sub.subdivisionId);
  }

  private getRecommendedRoleBySlotId(slotId: string): string {
    const positions = this.formationPositions[this.selectedFormation];
    if (!positions) return '';
    const pos = positions.find(p => p.subdivisionId === slotId);
    return pos?.role || '';
  }

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

  onSlotClick(sub: FieldSubdivisionDTO): void {
    if (this.isSlotAbandonedByOverride(sub)) {
      return;
    }
    this.selectedSlot = null;
    this.selectedPlayerToAssign = '';
  }

  onMarkerClick(player: PlayerOnFieldDto): void {
    this.selectedSlot = player?.slotId
      ? this.subdivisions.find(s => s.subdivisionId === player.slotId) ?? null
      : null;
    this.selectedPlayerToAssign = '';
  }

  assignPlayerToSlot(): void {
    if (!this.selectedSlot || !this.selectedPlayerToAssign) return;

    const player = this.benchPlayers.find(p => p.playerId === this.selectedPlayerToAssign);
    if (!player) return;
    if (!this.canPlayerUseSlot(player, this.selectedSlot.subdivisionId)) {
      return;
    }

    this.showConditionWarning(player);

    if (player.slotId) {
      delete this.slotPlayerMap[player.slotId];
    }

    const occupant = this.slotPlayerMap[this.selectedSlot.subdivisionId];
    if (occupant && occupant.playerId !== player.playerId) {
      occupant.slotId = '';
      delete occupant.xPercent;
      delete occupant.yPercent;
      if (!this.benchPlayers$.value.some(p => p.playerId === occupant.playerId)) {
        this.benchPlayers$.next([...this.benchPlayers$.value, occupant]);
      }
      this.homePlayers$.next(
        this.homePlayers$.value.filter(p => p.playerId !== occupant.playerId)
      );
    }

    const slotId = this.selectedSlot.subdivisionId;
    player.slotId = slotId;
    this.slotPlayerMap[slotId] = player;

    const newBench = this.benchPlayers$.value.filter(p => p.playerId !== player.playerId);
    this.benchPlayers$.next(newBench);
    this.homePlayers$.next([...this.homePlayers$.value, player]);

    this.selectedSlot = null;
    this.selectedPlayerToAssign = '';
    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.cdr.detectChanges();
  }

  removePlayerFromSlot(player: PlayerOnFieldDto): void {
    if (!player.slotId) return;

    delete this.slotPlayerMap[player.slotId];
    player.slotId = '';

    const newHome = this.homePlayers$.value.filter(p => p.playerId !== player.playerId);
    this.homePlayers$.next(newHome);
    this.benchPlayers$.next([...this.benchPlayers$.value, player]);

    this.selectedSlot = null;
    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.cdr.detectChanges();
  }

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

  handleSlotDrop(event: CdkDragDrop<FieldSubdivisionDTO>): void {
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player) { return; }

    const targetSubdivisionId = this.subdivisionIdFromDropListId(event.container.id);
    if (!targetSubdivisionId) { return; }

    const sourceDropListId = event.previousContainer.id;
    if (sourceDropListId === 'slot-' + targetSubdivisionId) {
      return;
    }

    const sourceSlotId = sourceDropListId === this.BENCH_DROP_LIST_ID
      ? null
      : this.subdivisionIdFromDropListId(sourceDropListId);

    const occupant = this.slotPlayerMap[targetSubdivisionId] ?? null;
    this.applySlotAssignment(player, sourceSlotId, targetSubdivisionId, occupant);
  }

  handleBenchDrop(event: CdkDragDrop<string>): void {
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player || !player.slotId) { return; }
    if (event.previousContainer.id === this.BENCH_DROP_LIST_ID) { return; }
    this.movePlayerToBench(player);
  }

  private subdivisionIdFromDropListId(dropListId: string): string | null {
    if (!dropListId || !dropListId.startsWith('slot-')) { return null; }
    return dropListId.substring('slot-'.length);
  }

  private markerPickupOffset = new Map<string, { x: number; y: number }>();

  onMarkerDragStarted(event: CdkDragStart): void {
    const dragRef = getSquadEditorDragRef(event.source);
    if (!dragRef) { return; }
    const data = getSquadEditorDragData<PlayerOnFieldDto>(event.source);
    if (!data?.playerId) { return; }
    if (this.isGoalkeeperPlayer(data)) {
      resetSquadEditorDragSource(event.source);
      return;
    }
    this.markerPickupOffset.set(data.playerId, {
      x: dragRef._pickupPositionInElement?.x ?? 35,
      y: dragRef._pickupPositionInElement?.y ?? 24,
    });
  }

  handleMarkerDragEnd(event: CdkDragEnd, player: PlayerOnFieldDto): void {
    if (!player) { return; }
    if (this.isGoalkeeperPlayer(player)) {
      this.lockGoalkeeperToGoalArea(player);
      resetSquadEditorDragSource(event.source);
      this.homePlayers$.next([...this.homePlayers$.value]);
      this.cdr.markForCheck();
      return;
    }
    const previousX = this.getMarkerX(player);
    const previousY = this.getMarkerY(player);
    this.beginCoachMoveImpactTracking();

    const fieldEl = this.fieldContainer?.nativeElement;
    if (!fieldEl) { return; }
    const rect = fieldEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { return; }
    const dropX = event.dropPoint?.x ?? rect.left;
    const dropY = event.dropPoint?.y ?? rect.top;

    if (this.isDropOverBenchCard(dropX, dropY)) {
      this.movePlayerToBench(player);
      return;
    }

    const pickup = this.markerPickupOffset.get(player.playerId) ?? { x: 35, y: 24 };
    this.markerPickupOffset.delete(player.playerId);

    const sourceEl = getSquadEditorDragRef(event.source)?.element?.nativeElement;
    const markerRect = sourceEl?.getBoundingClientRect();
    const halfHeight = (markerRect?.height ?? 48) / 2;

    const { xPct, yPct } = computeSquadEditorFieldDropPercent({
      dropPoint: { x: dropX, y: dropY },
      pickupOffset: pickup,
      fieldRect: rect,
      markerHalfHeight: halfHeight,
    });

    if (this.isInsideGoalkeeperProtectedArea(xPct, yPct)) {
      this.pendingCoachMoveBaseline = null;
      if (player.slotId) {
        delete player.xPercent;
        delete player.yPercent;
        this.slotPlayerMap[player.slotId] = player;
      }
      resetSquadEditorDragSource(event.source);
      this.refreshAfterLineupMutation();
      return;
    }

    this.applyMarkerFieldDrop(player, { previousX, previousY, xPct, yPct });

    this.captureRatingsFromFormationEffectiveness();
    this.requestRatingsPreview();

    this.refreshAfterLineupMutation();

    const dragRef = getSquadEditorDragRef(event.source);
    if (dragRef) {
      resetSquadEditorDragSource(event.source);
      clearSquadEditorDragTransform(dragRef);
    }
  }

  private isDropOverBenchCard(dropX: number, dropY: number): boolean {
    const benchRects: SquadEditorRect[] = Array
      .from(document.querySelectorAll('.bench-container .bench-player'))
      .map((card) => (card as HTMLElement).getBoundingClientRect());

    return isPointOverAnyInsetRect({ x: dropX, y: dropY }, benchRects);
  }

  private applyMarkerFieldDrop(player: PlayerOnFieldDto, move: SquadEditorMarkerMoveContext): void {
    if (!player.slotId || player.slotId === '') {
      const closest = this.findClosestSubdivision(move.xPct, move.yPct, player);
      if (closest) { player.slotId = closest.subdivisionId; }
    }

    const owningSlot = player.slotId
      ? this.subdivisions.find(s => s.subdivisionId === player.slotId) ?? null
      : null;
    const canonicalX = player.slotId ? this.getFormationPositionCoord(player.slotId, 'x') : null;
    const canonicalY = player.slotId ? this.getFormationPositionCoord(player.slotId, 'y') : null;
    const nativeCenter = computeSquadEditorSlotCenter({
      canonicalX,
      canonicalY,
      slotRect: owningSlot,
    });
    const dropNearNativeCenter = isSquadEditorDropNearSlotCenter({
      drop: { xPct: move.xPct, yPct: move.yPct },
      center: nativeCenter,
    });

    if (dropNearNativeCenter) {
      this.snapPlayerBackToSlotCenter(player, move, nativeCenter);
      return;
    }

    this.keepPlayerAtFreeDropPosition(player, move);
  }

  private snapPlayerBackToSlotCenter(
    player: PlayerOnFieldDto,
    move: SquadEditorMarkerMoveContext,
    nativeCenter: { x: number | null; y: number | null }
  ): void {
    delete player.xPercent;
    delete player.yPercent;
    if (player.slotId) {
      this.slotPlayerMap[player.slotId] = player;
    }
    this.setLastCoachMoveReadForDrag(
      player,
      move.previousX,
      move.previousY,
      nativeCenter.x ?? move.xPct,
      nativeCenter.y ?? move.yPct,
      true
    );
  }

  private keepPlayerAtFreeDropPosition(
    player: PlayerOnFieldDto,
    move: SquadEditorMarkerMoveContext
  ): void {
    player.xPercent = move.xPct;
    player.yPercent = move.yPct;
    if (player.slotId) {
      delete this.slotPlayerMap[player.slotId];
    }
    this.setLastCoachMoveReadForDrag(player, move.previousX, move.previousY, move.xPct, move.yPct, false);
    this.persistLastModalMoveHarnessCase(player, move.previousX, move.previousY, move.xPct, move.yPct);
  }

  private applySlotAssignment(
    player: PlayerOnFieldDto,
    sourceSlotId: string | null,
    targetSlotId: string,
    occupant: PlayerOnFieldDto | null
  ): void {
    if (!this.canPlayerUseSlot(player, targetSlotId)) {
      return;
    }
    this.beginCoachMoveImpactTracking();
    if (sourceSlotId) {
      delete this.slotPlayerMap[sourceSlotId];
    }

    const fromX = this.getMarkerX(player);
    const fromY = this.getMarkerY(player);
    const fromLine = this.visualLineFromCoords(fromY);
    const fromChannel = this.visualChannelFromCoords(fromX);
    player.slotId = targetSlotId;
    this.slotPlayerMap[targetSlotId] = player;
    // snaps to the new slot center. Without this, a player who was
    // free-dropped (xPercent/yPercent set) then dragged to a slot would
    // stay visually pinned at the OLD override position.
    delete player.xPercent;
    delete player.yPercent;
    const targetX = this.getFormationPositionCoord(targetSlotId, 'x') ?? this.getMarkerX(player);
    const targetY = this.getFormationPositionCoord(targetSlotId, 'y') ?? this.getMarkerY(player);
    const toLine = this.visualLineFromCoords(targetY);
    const toChannel = this.visualChannelFromCoords(targetX);
    const spatialRead = describeSquadEditorCoachMoveSpatialRead(
      fromX,
      fromY,
      targetX,
      targetY
    );
    this.lastCoachMoveRead = {
      title: `${player.name}: ${fromLine}${fromChannel} → ${toLine}${toChannel}`,
      body: fromLine !== toLine
        ? `Cambio de slot con impacto estructural: revisa ATT/MID/DEF y la penalización de rol.${spatialRead}`
        : `Reubicado en slot táctico: vuelve a una referencia limpia de formación.${spatialRead}`,
      level: fromLine !== toLine ? 'warn' : 'info',
    };

    if (occupant && occupant.playerId !== player.playerId) {
      if (sourceSlotId) {
        // SWAP: push the occupant back into the source slot.
        occupant.slotId = sourceSlotId;
        this.slotPlayerMap[sourceSlotId] = occupant;
        delete occupant.xPercent;
        delete occupant.yPercent;
      } else {
        // Source was bench -> evict the occupant to the bench.
        occupant.slotId = '';
        delete occupant.xPercent;
        delete occupant.yPercent;
        this.benchPlayers$.next([...this.benchPlayers$.value, occupant]);
        this.homePlayers$.next(
          this.homePlayers$.value.filter(p => p.playerId !== occupant.playerId)
        );
      }
    }

    if (!sourceSlotId) {
      this.benchPlayers$.next(
        this.benchPlayers$.value.filter(p => p.playerId !== player.playerId)
      );
      if (!this.homePlayers$.value.some(p => p.playerId === player.playerId)) {
        this.homePlayers$.next([...this.homePlayers$.value, player]);
      }
    }

    this.refreshAfterLineupMutation();
  }

  private movePlayerToBench(player: PlayerOnFieldDto): void {
    if (this.isGoalkeeperPlayer(player)) {
      this.lockGoalkeeperToGoalArea(player);
      this.homePlayers$.next([...this.homePlayers$.value]);
      this.cdr.markForCheck();
      return;
    }
    if (!player.slotId) { return; } // already on bench
    this.beginCoachMoveImpactTracking();
    this.lastCoachMoveRead = {
      title: `${player.name} sale del XI`,
      body: 'Lo mandaste al banco: baja ocupación del dibujo y puede dejar una zona sin cobertura hasta reemplazarlo.',
      level: 'warn',
    };
    delete this.slotPlayerMap[player.slotId];
    player.slotId = '';
    delete player.xPercent;
    delete player.yPercent;

    this.homePlayers$.next(
      this.homePlayers$.value.filter(p => p.playerId !== player.playerId)
    );
    if (!this.benchPlayers$.value.some(p => p.playerId === player.playerId)) {
      this.benchPlayers$.next([...this.benchPlayers$.value, player]);
    }

    this.refreshAfterLineupMutation();
  }

  private refreshAfterLineupMutation(): void {
    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private findClosestSubdivision(
    xPct: number,
    yPct: number,
    player?: PlayerOnFieldDto
  ): FieldSubdivisionDTO | null {
    let best: FieldSubdivisionDTO | null = null;
    let bestDist = Infinity;
    for (const sub of this.subdivisions) {
      if (player && !this.canPlayerUseSlot(player, sub.subdivisionId)) {
        continue;
      }
      const cx = sub.left + sub.width / 2;
      const cy = sub.top + sub.height / 2;
      const dx = cx - xPct;
      const dy = cy - yPct;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; best = sub; }
    }
    return best;
  }

  private persistLastModalMoveHarnessCase(
    player: PlayerOnFieldDto,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number
  ): void {
    if (!player?.playerId || this.isGoalkeeperPlayer(player)) { return; }
    const distance = Math.hypot(targetX - fromX, targetY - fromY);
    if (!isFinite(distance) || distance < 1) { return; }
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: 'squad-editor-modal',
      formation: this.dropdownFormationValue,
      playerId: player.playerId,
      playerName: player.name,
      playerPosition: player.position ?? player.role ?? null,
      playerRole: player.role ?? null,
      slotId: player.slotId ?? null,
      fromXPercent: Number(fromX.toFixed(3)),
      fromYPercent: Number(fromY.toFixed(3)),
      targetXPercent: Number(targetX.toFixed(3)),
      targetYPercent: Number(targetY.toFixed(3)),
      deltaXPercent: Number((targetX - fromX).toFixed(3)),
      deltaYPercent: Number((targetY - fromY).toFixed(3)),
      coachReadTitle: this.lastCoachMoveRead?.title ?? null,
      coachReadBody: this.lastCoachMoveRead?.body ?? null,
    };
    try {
      window.localStorage.setItem('manager:last-modal-position-move', JSON.stringify(payload));
    } catch {
    }
  }

  getMarkerX(player: PlayerOnFieldDto): number {
    if (typeof player.xPercent === 'number' && isFinite(player.xPercent)) {
      return clampFieldPercent(player.xPercent);
    }
    if (!player.slotId) { return 50; }
    const formationX = this.getFormationPositionCoord(player.slotId, 'x');
    if (formationX !== null) { return formationX; }
    const cx = this.getSlotCenterX(player.slotId);
    return isFinite(cx) ? cx : 50;
  }

  getMarkerY(player: PlayerOnFieldDto): number {
    if (typeof player.yPercent === 'number' && isFinite(player.yPercent)) {
      return clampFieldPercent(player.yPercent);
    }
    if (!player.slotId) { return 50; }
    const formationY = this.getFormationPositionCoord(player.slotId, 'y');
    if (formationY !== null) { return formationY; }
    const cy = this.getSlotCenterY(player.slotId);
    return isFinite(cy) ? cy : 50;
  }

  private getFormationPositionCoord(slotId: string, axis: 'x' | 'y'): number | null {
    const positions = this.formationPositions[this.selectedFormation];
    if (!positions || positions.length === 0) { return null; }
    const pos = positions.find(p => p.subdivisionId === slotId);
    if (!pos) { return null; }
    const value = axis === 'x' ? pos.xPercent : pos.yPercent;
    if (typeof value !== 'number' || !isFinite(value)) { return null; }
    return clampFieldPercent(value);
  }

  resetCustomPositions(): void {
    // slotPlayerMap entry for each player (handleFieldDrop intentionally
    // removed it so the slot looked truly empty). Without this restore
    // the markers would snap to slot centers but the slots would remain
    // "unoccupied" in the slotPlayerMap -> isSlotOccupied would return
    // removal: re-add player to slotPlayerMap[player.slotId].
    for (const player of this.homePlayers$.value) {
      delete player.xPercent;
      delete player.yPercent;
      if (player.slotId) {
        this.slotPlayerMap[player.slotId] = player;
      }
    }
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.lastCoachMoveRead = null;
    this.pendingCoachMoveBaseline = null;
    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  hasCustomPositions(): boolean {
    return this.homePlayers$.value.some(p =>
      typeof p.xPercent === 'number' || typeof p.yPercent === 'number');
  }

  getEffectivenessForSlot(subdivisionId: string | undefined): number | null {
    if (!subdivisionId) { return null; }
    const fe = this.formationEffectiveness$.value;
    if (!fe) { return null; }
    const v = fe.perPlayerEffectiveness?.[subdivisionId];
    return typeof v === 'number' ? v : null;
  }

  getEffectivenessColor(subdivisionId: string | undefined): 'green' | 'yellow' | 'red' | null {
    const v = this.getEffectivenessForSlot(subdivisionId);
    if (v === null) { return null; }
    return effectivenessColor(v);
  }

  getChipEffectivenessClass(subdivisionId: string | undefined): 'eff-good' | 'eff-warning' | 'eff-bad' | null {
    const v = this.getEffectivenessForSlot(subdivisionId);
    if (v === null) { return null; }
    if (v >= 0.9) { return 'eff-good'; }
    if (v >= 0.7) { return 'eff-warning'; }
    return 'eff-bad';
  }

  getMarkerRoleClasses(role: string | undefined): { [klass: string]: boolean } {
    return getRoleMarkerClasses(role);
  }

  rolesMatch(playerRole: string | undefined, formationRole: string | undefined): boolean {
    return roleFamiliesMatch(playerRole, formationRole);
  }

  private getRoleFamily(role: string): PlayerRoleFamily | null {
    return resolveRoleFamily(role);
  }

  private getPositionRoleFamily(player: PlayerOnFieldDto): PlayerRoleFamily | null {
    if (typeof player.xPercent === 'number' && isFinite(player.xPercent) &&
        typeof player.yPercent === 'number' && isFinite(player.yPercent) &&
        this.subdivisions && this.subdivisions.length > 0) {
      const closest = this.findClosestSubdivision(player.xPercent, player.yPercent, player);
      if (closest) {
        const zone = closest.zone ?? '';
        if (zone === 'GK') return 'GK';
        if (zone === 'DEFENSE') return 'DEF';
        if (zone === 'MIDFIELD') return 'MID';
        if (zone === 'ATTACK') return 'ATT';
      }
    }
    // No position info -> fall back to the player's underlying role.
    return this.getRoleFamily(player.role);
  }

  private countRoleFamily(roles: string[]): { gk: number; def: number; mid: number; att: number } {
    return countRolesByFamily(roles);
  }

  detectFormation(): string {
    const players = this.homePlayers.filter(p => !!p.slotId);

    if (players.length < 11) {
      this._isCustomLineup = true;
      return USER_FORMATION_LABEL;
    }

    // position, not their underlying role. This makes the formation
    // label reflect drag-drop changes (see getPositionRoleFamily).
    const positions: ('GK' | 'DEF' | 'MID' | 'ATT' | null)[] = players.map(p => this.getPositionRoleFamily(p));
    const lineupCounts = { gk: 0, def: 0, mid: 0, att: 0 };
    for (const fam of positions) {
      if (fam === 'GK') lineupCounts.gk++;
      else if (fam === 'DEF') lineupCounts.def++;
      else if (fam === 'MID') lineupCounts.mid++;
      else if (fam === 'ATT') lineupCounts.att++;
    }

    for (const f of ALL_FORMATIONS) {
      const canonicalRoles = (this.formationPositions[f] || []).map(p => p.role);
      const canonicalCounts = { gk: 0, def: 0, mid: 0, att: 0 };
      for (const role of canonicalRoles) {
        const fam = this.getRoleFamily(role);
        if (fam === 'GK') canonicalCounts.gk++;
        else if (fam === 'DEF') canonicalCounts.def++;
        else if (fam === 'MID') canonicalCounts.mid++;
        else if (fam === 'ATT') canonicalCounts.att++;
      }
      if (lineupCounts.gk === canonicalCounts.gk &&
          lineupCounts.def === canonicalCounts.def &&
          lineupCounts.mid === canonicalCounts.mid &&
          lineupCounts.att === canonicalCounts.att) {
        this._isCustomLineup = false;
        //
        // The manager-selected formation is tactical intent. A manual drag
        // can make the current shape *look* like another canonical by count
        // for one frame (e.g. a 4-4-2 MID crosses into ATT and count-based
        // detection says 4-3-3). If we mutate selectedFormation here, the
        // preview-ratings request switches formation base instantly and ATT /
        // DEF jump radically for a one-pixel move. Keep the dropdown anchored
        // to the user's explicit choice; changing formation should happen via
        // the select/autoselect flow, not as a side effect of free positioning.
        return f;
      }
    }

    this._isCustomLineup = true;
    return USER_FORMATION_LABEL;
  }

  updateFormationDetection(): void {
    this.detectFormation();
    this.cdr.markForCheck();
    // ratings reflect the new lineup within ~150ms (no save needed).
    this.requestRatingsPreview();
  }

  isOffRole(player: PlayerOnFieldDto): boolean {
    if (!player.slotId) { return false; }
    const sub = this.subdivisions.find(s => s.subdivisionId === player.slotId);
    if (!sub) { return false; }
    const recommended = this.getRecommendedRole(sub);
    if (!recommended) { return false; }
    const actual = this.getPositionRoleFamily(player);
    return this.isTacticalRoleMismatch(player.role, recommended, actual);
  }

  private isTacticalRoleMismatch(
    playerRole: string | undefined,
    tacticalRole: string | undefined,
    actualZone?: 'GK' | 'DEF' | 'MID' | 'ATT' | null
  ): boolean {
    if (!playerRole || !tacticalRole) { return false; }
    if (this.tacticalRoleFitsPlayerRole(playerRole, tacticalRole)) { return false; }
    const playerFamily = this.getRoleFamily(playerRole);
    const recommendedFamily = this.getRoleFamily(tacticalRole);
    if (playerFamily === null || recommendedFamily === null) { return false; }
    if (actualZone && playerFamily !== actualZone) { return true; }
    return playerFamily !== recommendedFamily;
  }

  private tacticalRoleFitsPlayerRole(playerRole: string | undefined, tacticalRole: string | undefined): boolean {
    const player = String(playerRole ?? '').trim().toUpperCase();
    const role = String(tacticalRole ?? '').trim().toUpperCase();
    if (!player || !role) { return false; }
    if (player === role) { return true; }
    const fitGroups: Record<string, string[]> = {
      GK: ['GK'],
      CB: ['CB', 'DEF'],
      LB: ['LB', 'LWB', 'DEF'],
      RB: ['RB', 'RWB', 'DEF'],
      LWB: ['LWB', 'LB', 'LM', 'LW', 'WINGER'],
      RWB: ['RWB', 'RB', 'RM', 'RW', 'WINGER'],
      CDM: ['CDM', 'DM', 'CM', 'MID'],
      CM: ['CM', 'CDM', 'DM', 'CAM', 'MID'],
      CAM: ['CAM', 'AM', 'CM', 'CF', 'MID'],
      LM: ['LM', 'LW', 'LWB', 'WINGER', 'MID'],
      RM: ['RM', 'RW', 'RWB', 'WINGER', 'MID'],
      LW: ['LW', 'LM', 'WINGER'],
      RW: ['RW', 'RM', 'WINGER'],
      CF: ['CF', 'ST', 'CAM', 'ATT'],
      ST: ['ST', 'CF', 'ATT'],
    };
    if (fitGroups[role]) {
      return fitGroups[role].includes(player);
    }
    const playerFamily = this.getRoleFamily(player);
    const roleFamily = this.getRoleFamily(role);
    return playerFamily !== null && playerFamily === roleFamily;
  }

  onFormationSelect(newValue: string): void {
    if (newValue === USER_FORMATION_LABEL || !newValue) {
      // Disabled pseudo-option click. Force-restore the displayed value via
      // CD so the select visually re-syncs (some browsers briefly swap the
      // label into the select before re-rendering).
      this.cdr.detectChanges();
      return;
    }
    // Delegate to the canonical formation-change handler. Formation changes
    // keep the same XI, remap it into the new shape and persist it manually.
    this.onFormationChange(newValue);
  }

  get userFormationLabel(): string {
    return USER_FORMATION_LABEL;
  }

  getDisplayedChemistryScore(): number | null {
    const raw = this.previewedChemistry$.value;
    if (!raw) { return null; }
    const fe = this.formationEffectiveness$.value;
    if (!fe || typeof fe.teamAverage !== 'number') {
      return raw.score;
    }
    return Math.round(raw.score * fe.teamAverage);
  }

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

  getDisplayedFormationLabel(fe: { inferredFormation?: string } | null | undefined): string {
    if (!this.isCustomLineup() && this.selectedFormation !== this.userFormationLabel) {
      return this.selectedFormation;
    }
    return fe?.inferredFormation || this.selectedFormation;
  }

  onFormationChange(newFormation?: string): void {
    // Bloquear si hay un cambio en progreso
    if (this.isFormationChanging) {
      return;
    }

// Ignorar cambios durante inicialización (evita NG0100)
    if (this.isInitializing) {
      return;
    }

    // siempre actualizado) sobre this.selectedFormation (puede no estarlo si se
    // llama el handler programáticamente antes de que Angular sincronice el DOM).
    const targetFormation = newFormation ?? this.selectedFormation;
    if (!targetFormation) {
      return;
    }

    if (this.selectedFormation !== targetFormation) {
      this.selectedFormation = targetFormation;
    }

    if (targetFormation === this.homeFormation$.value) {
      return;
    }

    this.isFormationChanging = true;
    this.cdr.markForCheck();

    this.formationChangeCompleteSubject = new Subject<void>();

    this.homeFormation$.next(targetFormation);

    this.executeFormationChange(targetFormation);
  }

  private executeAutoSelect(formation: string): void {
    this.loadingFormation$.next(true);

    this.http.post<SquadEditorAutoSelectResponse>(`${environment.apiUrl}/career/lineup/auto-select`, {
      formation: formation
    }).subscribe({
      next: (response) => {
        this.loadingFormation$.next(false);
        this.applyLineupToSlots(formation, response?.players || [], response?.slots || []);
        this.isInitializing = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingFormation$.next(false);
        this.isInitializing = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyLineupToSlots(
    formationName: string,
    playersList: SquadEditorLineupPlayer[],
    backendSlots: LineupSlotDTO[] = []
  ): void {
    this.slotPlayerMap = {};

    const positions = this.formationPositions[formationName] || [];

    const squadSource: SquadEditorLineupPlayer[] = (this.data?.squad && this.data.squad.length > 0)
      ? this.data.squad.map((sp: SessionPlayer) => ({
          playerId: sp.sessionPlayerId,
          name: sp.name,
          position: sp.position,
          overall: sp.attack ?? 70,
          energy: sp.energy ?? 100,
          injured: sp.injured ?? false,
          attack: sp.attack ?? 70,
          defense: sp.defense ?? 70,
          technique: sp.technique ?? 70,
          speed: sp.speed ?? 70,
          mentality: sp.mentality ?? 70
        }))
      : playersList;

    const selectedPlayerIds = new Set((playersList || []).map((p) => p.playerId).filter(Boolean));
    const orderedSource = selectedPlayerIds.size > 0
      ? [
          ...squadSource.filter((p) => selectedPlayerIds.has(p.playerId)),
          ...squadSource.filter((p) => !selectedPlayerIds.has(p.playerId))
        ]
      : squadSource;

    const allPlayers: PlayerOnFieldDto[] = orderedSource.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      role: p.position,
      overall: p.overall || 70,
      slotId: '',
      stamina: p.energy || 100,
      active: !p.injured,
      isEmpty: false,
      attack: typeof p.attack === 'number' ? p.attack : undefined,
      defense: typeof p.defense === 'number' ? p.defense : undefined,
      technique: typeof p.technique === 'number' ? p.technique : undefined,
      speed: typeof p.speed === 'number' ? p.speed : undefined,
      mentality: typeof p.mentality === 'number' ? p.mentality : undefined
    }));

    const playerById = new Map<string, PlayerOnFieldDto>();
    allPlayers.forEach((player) => playerById.set(player.playerId, player));

    const usedSubdivisionIds = new Set<string>();
    const usedPlayerIds = new Set<string>();
    if (backendSlots?.length > 0) {
      backendSlots.forEach((slot) => {
        const player = playerById.get(slot.playerId);
        if (!player
          || !slot.subdivisionId
          || usedSubdivisionIds.has(slot.subdivisionId)
          || usedPlayerIds.has(slot.playerId)
          || !this.canPlayerUseSlot(player, slot.subdivisionId)) {
          return;
        }
        player.slotId = slot.subdivisionId;
        if (typeof slot.customXPercent === 'number' && isFinite(slot.customXPercent)) {
          player.xPercent = clampFieldPercent(slot.customXPercent);
        }
        if (typeof slot.customYPercent === 'number' && isFinite(slot.customYPercent)) {
          player.yPercent = clampFieldPercent(slot.customYPercent);
        }
        this.slotPlayerMap[slot.subdivisionId] = player;
        usedSubdivisionIds.add(slot.subdivisionId);
        usedPlayerIds.add(slot.playerId);
      });
    }

    if (!this.slotPlayerMap['GK-1']) {
      const goalkeeper = allPlayers.find(player =>
        this.isGoalkeeperPlayer(player) && !usedPlayerIds.has(player.playerId));
      if (goalkeeper) {
        this.lockGoalkeeperToGoalArea(goalkeeper);
        usedSubdivisionIds.add('GK-1');
        usedPlayerIds.add(goalkeeper.playerId);
      }
    }

    const assignedPositions = new Set<number>();

    allPlayers.forEach((player) => {
      if (backendSlots?.length > 0 || player.slotId) return;
      for (let i = 0; i < positions.length; i++) {
        if (assignedPositions.has(i)) continue;

        const posRole = positions[i].role;
        if (this.rolesMatch(player.position, posRole)) {
          const slotId = positions[i].subdivisionId;
          player.slotId = slotId;
          this.slotPlayerMap[slotId] = player;
          assignedPositions.add(i);
          break;
        }
      }
    });

    this.homePlayers$.next(allPlayers.filter(p => p.slotId));
    this.benchPlayers$.next(allPlayers.filter(p => !p.slotId));
    this.triggerChemistryPreview();

    this.selectedFormation = formationName;
    this.homeFormation$.next(formationName);
    this._isCustomLineup = false;

    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private applyCurrentXiToFormation(formationName: string): void {
    const positions = this.formationPositions[formationName] || [];
    if (positions.length === 0) { return; }

    const currentXi = this.getUniqueValidHomePlayers().slice(0, 11);
    this.slotPlayerMap = {};

    const usedPositionIndexes = new Set<number>();
    const indexedPositions = positions.map((position, index) => ({ position, index }));

    const assignPlayer = (player: PlayerOnFieldDto, candidates: Array<{ position: FormationPositionDTO; index: number }>): boolean => {
      const candidate = candidates.find(entry =>
        !usedPositionIndexes.has(entry.index)
        && this.canPlayerUseSlot(player, entry.position.subdivisionId)
      );
      if (!candidate) { return false; }
      player.slotId = candidate.position.subdivisionId;
      delete player.xPercent;
      delete player.yPercent;
      this.slotPlayerMap[candidate.position.subdivisionId] = player;
      usedPositionIndexes.add(candidate.index);
      return true;
    };

    for (const player of currentXi) {
      if (this.isGoalkeeperPlayer(player)) {
        assignPlayer(player, indexedPositions.filter(entry => entry.position.subdivisionId === 'GK-1'));
      }
    }

    for (const player of currentXi) {
      if (this.isGoalkeeperPlayer(player) || player.slotId === 'GK-1') { continue; }
      const playerFamily = this.getRoleFamily(player.role ?? player.position);
      assignPlayer(player, indexedPositions.filter(entry => this.getRoleFamily(entry.position.role) === playerFamily));
    }

    for (const player of currentXi) {
      if (player.slotId && this.slotPlayerMap[player.slotId] === player) { continue; }
      assignPlayer(player, indexedPositions);
    }

    const starters = currentXi.filter(player => player.slotId && this.slotPlayerMap[player.slotId] === player);
    const starterIds = new Set(starters.map(player => player.playerId));
    const benchById = new Map<string, PlayerOnFieldDto>();
    for (const player of [...this.benchPlayers$.value, ...this.homePlayers$.value]) {
      if (starterIds.has(player.playerId)) { continue; }
      player.slotId = '';
      delete player.xPercent;
      delete player.yPercent;
      benchById.set(player.playerId, player);
    }

    this.homePlayers$.next(starters);
    this.benchPlayers$.next(Array.from(benchById.values()));
    this.selectedFormation = formationName;
    this.homeFormation$.next(formationName);
    this._isCustomLineup = false;
  }

  private executeFormationChange(newFormation: string): void {
    this.loadingFormation$.next(true);
    this.cdr.markForCheck();

    const finishFormationChange = () => {
      this.loadingFormation$.next(false);
      this.isFormationChanging = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    };

    this.applyCurrentXiToFormation(newFormation);
    this.saveLineup(finishFormationChange);
    this.captureRatingsFromFormationEffectiveness();
    this.requestRatingsPreview();
    this.formationChanged.emit({
      formation: newFormation,
      players: this.homePlayers$.value.slice(0, 11)
    });
    this.formationChangeComplete.emit(this.formationChangeCompleteSubject);
  }

  private saveLineup(onDone?: () => void): void {
    const validHomePlayers = this.getUniqueValidHomePlayers();
    const playerCount = validHomePlayers.length;
    if (playerCount < 7) {
      this.errorMessage$.next('Mínimo 7 jugadores para guardar (puedes tener más)');
      this.lineupWarning$.next(null);
      onDone?.();
      return;
    }
    if (playerCount > 11) {
      this.errorMessage$.next('Máximo 11 jugadores');
      this.lineupWarning$.next(null);
      onDone?.();
      return;
    }
    this.errorMessage$.next('');

    const playerIds: string[] = validHomePlayers.map(p => p.playerId);
    const slots: LineupSlotDTO[] = validHomePlayers
      .filter(p => !!p.slotId)
      .map(p => {
        const dto: LineupSlotDTO = { playerId: p.playerId, subdivisionId: p.slotId };
        if (typeof p.xPercent === 'number') { dto.customXPercent = p.xPercent; }
        if (typeof p.yPercent === 'number') { dto.customYPercent = p.yPercent; }
        return dto;
      });

    this.http.post<{warnings?: LineupWarningDTO[]}>(
      `${environment.apiUrl}/career/lineup/manual-select`,
      {
        formation: this.selectedFormation,
        playerIds,
        slots
      }
    ).subscribe({
      next: () => {
        this.http.post<{warnings?: LineupWarningDTO[]}>(
          `${environment.apiUrl}/career/lineup/confirm`,
          {}
        ).subscribe({
          next: (response) => {
            const warnings = response?.warnings ?? [];
            this.lineupWarning$.next(warnings.length > 0 ? warnings[0] : null);
            onDone?.();
          },
          error: (err) => {
            if (err.error?.code) {
              this.errorMessage$.next(err.error.message || 'Error al guardar');
            }
            onDone?.();
          }
        });
      },
      error: (err) => {
        if (err.error?.code) {
          this.errorMessage$.next(err.error.message || 'Error al guardar');
        }
        onDone?.();
      }
    });
  }

  private getUniqueValidHomePlayers(): PlayerOnFieldDto[] {
    const seenPlayers = new Set<string>();
    const seenSlots = new Set<string>();
    const result: PlayerOnFieldDto[] = [];
    for (const player of this.homePlayers) {
      if (!player?.playerId || !player.slotId) {
        continue;
      }
      if (seenPlayers.has(player.playerId) || seenSlots.has(player.slotId)) {
        continue;
      }
      if (!this.canPlayerUseSlot(player, player.slotId)) {
        continue;
      }
      seenPlayers.add(player.playerId);
      seenSlots.add(player.slotId);
      result.push(player);
    }
    return result;
  }

  close(): void {
    this.dialogRef.close();
  }

  showConditionWarning(player: PlayerOnFieldDto): void {
    if (player.injured) {
      this.conditionWarning$.next('Jugador lesionado seleccionado. Conviene reemplazarlo antes de confirmar.');
    } else if ((player.stamina ?? 100) <= 19) {
      this.conditionWarning$.next('Jugador agotado seleccionado. Ponerlo puede afectar su rendimiento.');
    } else if ((player.stamina ?? 100) <= 39) {
      this.conditionWarning$.next('Jugador muy cansado seleccionado. Conviene darle descanso.');
    } else if ((player.stamina ?? 100) <= 59) {
      this.conditionWarning$.next('Jugador cansado seleccionado. Puede rendir por debajo de su nivel.');
    } else {
      this.conditionWarning$.next('');
    }
  }

  clearConditionWarning(): void {
    this.conditionWarning$.next('');
  }
}
