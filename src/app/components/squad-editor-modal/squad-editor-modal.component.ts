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

  @Output() formationChanged = new EventEmitter<{formation: string, players: any[]}>();

  private formationChangeCompleteSubject = new Subject<void>();

  @Output() formationChangeComplete = new EventEmitter<Subject<void>>();

  subdivisions$ = new BehaviorSubject<FieldSubdivisionDTO[]>([]);

  homePlayers$ = new BehaviorSubject<PlayerOnFieldDto[]>([]);

  benchPlayers$ = new BehaviorSubject<PlayerOnFieldDto[]>([]);

  lastCoachMoveRead: {
    title: string;
    body: string;
    baseBody?: string;
    level: 'good' | 'warn' | 'danger' | 'info';
  } | null = null;

  private pendingCoachMoveBaseline: {
    attack: number;
    midfield: number;
    defense: number;
    chemistry: number | null;
    channels: { left: number | null; center: number | null; right: number | null };
    visualChannels: Array<{
      label: 'L' | 'C' | 'R';
      threat: number;
      connection: number;
      coverage: number;
    }>;
  } | null = null;

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

  private computeAvgAttribute(players: PlayerOnFieldDto[], attr: 'attack' | 'defense' | 'technique' | 'speed' | 'mentality'): number {
    if (players.length === 0) { return 0; }
    let sum = 0;
    let count = 0;
    for (const p of players) {
      const v = (p as any)[attr];
      const rating = typeof v === 'number' && isFinite(v)
        ? v
        : (typeof p.overall === 'number' ? p.overall : 70);
      sum += rating;
      count++;
    }
    return count === 0 ? 0 : Math.round(sum / count);
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
    return this.computeAvgAttribute(this.homePlayers, 'speed');
  }
  get techniqueRating(): number {
    return this.computeAvgAttribute(this.homePlayers, 'technique');
  }
  get mentalityRating(): number {
    return this.computeAvgAttribute(this.homePlayers, 'mentality');
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
        message: `Impacto fuerte: ${rows.length} jugador(es) fuera de rol, ${totalPenalty}% acumulado. Cambia jugador o formacion si queres competir fino.`,
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
      return 'Aporta gol, pero pierde retorno y orden. Mejor como ST/CAM o con cobertura detras.';
    }
    if (naturalFamily === 'MID' && actualFamily === 'DEF') {
      return 'Ayuda a salir jugando, pero no reemplaza un defensor natural.';
    }
    if (actualFamily === 'ATT') {
      return 'Movimiento ofensivo agresivo: puede romper balance si no hay cobertura.';
    }
    return 'Revisa si la formacion pide otro perfil natural para ese sector.';
  }

  get tacticalShapeMatrix(): Array<{ zone: 'ATT' | 'MID' | 'DEF'; left: number; center: number; right: number }> {
    const rows: Array<{ zone: 'ATT' | 'MID' | 'DEF'; left: number; center: number; right: number }> = [
      { zone: 'ATT', left: 0, center: 0, right: 0 },
      { zone: 'MID', left: 0, center: 0, right: 0 },
      { zone: 'DEF', left: 0, center: 0, right: 0 },
    ];
    const byZone = new Map(rows.map(r => [r.zone, r]));
    for (const player of this.getUniqueValidHomePlayers()) {
      if (this.isGoalkeeperPlayer(player)) { continue; }
      const zone = this.getVisualLine(player);
      const channel = this.getVisualChannel(player);
      const row = byZone.get(zone);
      if (!row) { continue; }
      if (channel === 'L') { row.left += 1; }
      else if (channel === 'R') { row.right += 1; }
      else { row.center += 1; }
    }
    return rows;
  }

  get tacticalShapeSummary(): { width: number; compactness: number; blockHeight: number; defensiveDepth: number } {
    const players = this.getUniqueValidHomePlayers().filter(p => !this.isGoalkeeperPlayer(p));
    if (players.length === 0) {
      return { width: 0, compactness: 0, blockHeight: 0, defensiveDepth: 0 };
    }
    const xs = players.map(p => this.getMarkerX(p));
    const ys = players.map(p => this.getMarkerY(p));
    const widthSpan = Math.max(...xs) - Math.min(...xs);
    const heightSpan = Math.max(...ys) - Math.min(...ys);
    const avgY = ys.reduce((acc, y) => acc + y, 0) / ys.length;
    const defenders = players.filter(p => this.getVisualLine(p) === 'DEF');
    const defensiveDepth = defenders.length === 0
      ? 0
      : defenders.reduce((acc, p) => acc + this.getMarkerY(p), 0) / defenders.length;
    return {
      width: Math.round(widthSpan),
      compactness: Math.max(0, Math.min(100, Math.round(100 - heightSpan))),
      blockHeight: Math.max(0, Math.min(100, Math.round(100 - avgY))),
      defensiveDepth: Math.max(0, Math.min(100, Math.round(defensiveDepth))),
    };
  }

  get tacticalChannelBreakdown(): Array<{
    label: 'L' | 'C' | 'R';
    threat: number;
    connection: number;
    coverage: number;
  }> {
    const players = this.getUniqueValidHomePlayers().filter(p => !this.isGoalkeeperPlayer(p));
    return (['L', 'C', 'R'] as const).map((channel) => {
      const channelPlayers = players.filter(p => this.getVisualChannel(p) === channel);
      const att = channelPlayers.filter(p => this.getVisualLine(p) === 'ATT').length;
      const mid = channelPlayers.filter(p => this.getVisualLine(p) === 'MID').length;
      const def = channelPlayers.filter(p => this.getVisualLine(p) === 'DEF').length;
      const highWide = channelPlayers.filter(p => this.getMarkerY(p) < 55).length;
      const lowCover = channelPlayers.filter(p => this.getMarkerY(p) >= 58).length;
      const support = channelPlayers.length;

      const threat = this.clampPercent(att * 34 + highWide * 18 + Math.min(2, mid) * 10);
      const connection = this.clampPercent(
        Math.min(1, att) * 28
        + Math.min(2, mid) * 22
        + Math.min(1, def) * 18
        + Math.min(3, support) * 4
      );
      const coverage = this.clampPercent(def * 30 + lowCover * 14 + Math.min(2, mid) * 10);

      return { label: channel, threat, connection, coverage };
    });
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(99, Math.round(value)));
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
    if (players.length < 10) {
      return [{
        title: 'Lineup incompleto',
        body: 'Completa los 11 para leer ataque, cobertura y bandas con sentido.',
        level: 'warn',
      }];
    }

    const matrix = this.tacticalShapeMatrix;
    const summary = this.tacticalShapeSummary;
    const notes: Array<{ title: string; body: string; level: 'good' | 'warn' | 'danger' | 'info' }> = [];
    const attRow = matrix.find(row => row.zone === 'ATT');
    const defRow = matrix.find(row => row.zone === 'DEF');
    const totalLeft = matrix.reduce((acc, row) => acc + row.left, 0);
    const totalCenter = matrix.reduce((acc, row) => acc + row.center, 0);
    const totalRight = matrix.reduce((acc, row) => acc + row.right, 0);
    const attCount = (attRow?.left ?? 0) + (attRow?.center ?? 0) + (attRow?.right ?? 0);
    const defCount = (defRow?.left ?? 0) + (defRow?.center ?? 0) + (defRow?.right ?? 0);
    const wideHigh = players.filter(p => Math.abs(this.getMarkerX(p) - 50) >= 32 && this.getMarkerY(p) < 58).length;
    const wideCover = players.filter(p => Math.abs(this.getMarkerX(p) - 50) >= 32 && this.getMarkerY(p) >= 58).length;
    const offRoleCount = this.offRolePlayers.length;
    const severeOffRoleCount = this.offRolePlayers.filter(row => row.penaltyPct >= 20).length;

    if (summary.width < 45) {
      notes.push({
        title: 'Equipo cerrado',
        body: 'Concentras jugadores por dentro: podes combinar, pero te pueden entrar por fuera.',
        level: 'warn',
      });
    } else if (summary.width > 75) {
      notes.push({
        title: 'Equipo muy ancho',
        body: 'Das amplitud, pero si no hay medio suficiente el bloque puede partirse.',
        level: 'warn',
      });
    } else {
      notes.push({
        title: 'Ancho sano',
        body: 'La ocupacion lateral es razonable: hay bandas sin romper demasiado el centro.',
        level: 'good',
      });
    }

    if (totalLeft <= 1 || totalRight <= 1) {
      notes.push({
        title: 'Banda descubierta',
        body: `${totalLeft <= 1 ? 'Izquierda' : 'Derecha'} queda con poca ayuda. El rival puede atacar ese costado.`,
        level: 'danger',
      });
    } else if (Math.abs(totalLeft - totalRight) >= 3) {
      notes.push({
        title: 'Equipo inclinado',
        body: totalLeft > totalRight
          ? 'Cargas mas la izquierda: generas superioridad ahi, pero ojo el lado derecho.'
          : 'Cargas mas la derecha: generas superioridad ahi, pero ojo el lado izquierdo.',
        level: 'info',
      });
    }

    if (totalCenter <= 2) {
      notes.push({
        title: 'Centro liviano',
        body: 'Hay poca presencia interior: cuesta sostener posesion y defender segunda jugada.',
        level: 'warn',
      });
    } else if (totalCenter >= 5) {
      notes.push({
        title: 'Centro fuerte',
        body: 'Tenes buena presencia interior: mejora control, pero revisa que no falte amplitud.',
        level: 'good',
      });
    }

    if (wideHigh >= 2 && wideCover <= 1) {
      notes.push({
        title: 'Carrileros altos',
        body: 'Hay proyeccion por banda, pero poca cobertura detras. Plan ofensivo con riesgo.',
        level: 'warn',
      });
    } else if (wideCover >= 2 && wideHigh <= 1) {
      notes.push({
        title: 'Bandas protegidas',
        body: 'Los costados quedan cubiertos. Mejor para cuidar resultado, menos agresivo arriba.',
        level: 'good',
      });
    } else if (wideHigh >= 1 && wideCover >= 1) {
      notes.push({
        title: 'Banda compensada',
        body: 'Tenes salida por fuera y una ayuda cercana para no quedar tan largo.',
        level: 'good',
      });
    }

    if (summary.compactness < 45) {
      notes.push({
        title: 'Bloque largo',
        body: 'Las lineas estan separadas: puede aparecer espacio entre defensa y medio.',
        level: 'warn',
      });
    } else if (summary.compactness >= 68) {
      notes.push({
        title: 'Bloque compacto',
        body: 'Las lineas estan cerca: ayuda a presionar y recuperar, aunque puede faltar profundidad.',
        level: 'good',
      });
    }

    if (attCount >= 4 && defCount <= 3) {
      notes.push({
        title: 'Plan agresivo',
        body: 'Muchos jugadores arriba y pocos atras: puede generar ocasiones, pero concede transiciones.',
        level: 'warn',
      });
    } else if (defCount >= 5 && attCount <= 2) {
      notes.push({
        title: 'Plan conservador',
        body: 'Mucha cobertura defensiva. Sirve para proteger, pero puede aislar a los delanteros.',
        level: 'info',
      });
    }

    if (severeOffRoleCount > 0) {
      notes.push({
        title: 'Roles forzados',
        body: `${severeOffRoleCount} jugador(es) estan muy fuera de rol. El motor lo va a penalizar.`,
        level: 'danger',
      });
    } else if (offRoleCount > 0) {
      notes.push({
        title: 'Ajustes de rol',
        body: `${offRoleCount} jugador(es) fuera de zona natural. Es jugable, pero revisa si tiene sentido.`,
        level: 'warn',
      });
    }

    return notes.length > 0 ? notes.slice(0, 5) : [{
      title: 'Forma estable',
      body: 'No hay alertas claras: el dibujo se ve coherente para probar en partido.',
      level: 'good',
    }];
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

    this.pushCoachDelta(deltas, magnitudes, 'ATT', this.attackRating - baseline.attack);
    this.pushCoachDelta(deltas, magnitudes, 'MID', this.midfieldRating - baseline.midfield);
    this.pushCoachDelta(deltas, magnitudes, 'DEF', this.defenseRating - baseline.defense);
    if (baseline.chemistry !== null && currentChemistry !== null) {
      this.pushCoachDelta(deltas, magnitudes, 'Chem', currentChemistry - baseline.chemistry);
    }
    const baseBody = this.lastCoachMoveRead.baseBody
      ?? this.lastCoachMoveRead.body.split(' Cambios:')[0];
    const channelDeltas = this.buildCoachChannelDeltas(baseline.channels, magnitudes, baseBody);
    const visualDeltas = this.buildCoachVisualChannelDeltas(baseline.visualChannels, magnitudes);
    const visualEngineTension = this.buildVisualEngineTension(
      baseline.visualChannels,
      this.attackRating - baseline.attack,
      this.defenseRating - baseline.defense
    );
    const severity = this.describeCoachDeltaSeverity(magnitudes);
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
      level: severity.includes('Impacto extremo') || this.visualDeltaHasHardWarning(visualDeltas) || !!visualEngineTension
        ? 'danger'
        : this.lastCoachMoveRead.level,
    };
  }

  private pushCoachDelta(parts: string[], magnitudes: number[], label: string, delta: number): void {
    if (!isFinite(delta) || Math.abs(delta) < 1) { return; }
    const rounded = Math.round(delta);
    magnitudes.push(Math.abs(rounded));
    parts.push(`${label} ${rounded > 0 ? '+' : ''}${rounded}`);
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

  private buildCoachChannelDeltas(
    baseline: { left: number | null; center: number | null; right: number | null },
    magnitudes: number[],
    baseBody = ''
  ): string[] {
    const current = this.getTacticalChannelScoresSnapshot();
    const result: string[] = [];
    this.pushCoachChannelDelta(result, magnitudes, 'L', baseline.left, current.left, baseBody);
    this.pushCoachChannelDelta(result, magnitudes, 'C', baseline.center, current.center, baseBody);
    this.pushCoachChannelDelta(result, magnitudes, 'R', baseline.right, current.right, baseBody);
    return result;
  }

  private pushCoachChannelDelta(
    parts: string[],
    magnitudes: number[],
    label: 'L' | 'C' | 'R',
    before: number | null,
    after: number | null,
    baseBody = ''
  ): void {
    if (before === null || after === null) { return; }
    const delta = Math.round(after - before);
    if (Math.abs(delta) < 1) { return; }
    magnitudes.push(Math.abs(delta));
    const sign = delta > 0 ? '+' : '';
    const isWideProjection = baseBody.includes('gana profundidad')
      || baseBody.includes('Sube por banda')
      || baseBody.includes('amenaza por banda');
    const projectedWideTradeoff = delta < 0 && isWideProjection && label !== 'C';
    const detail = projectedWideTradeoff
      ? ' (mas profundidad, menos conexion/cobertura)'
      : '';
    parts.push(`${label} ${sign}${delta}${detail}`);
  }

  private buildCoachVisualChannelDeltas(
    baseline: Array<{ label: 'L' | 'C' | 'R'; threat: number; connection: number; coverage: number }>,
    magnitudes: number[]
  ): string[] {
    const current = this.tacticalChannelBreakdown;
    const result: string[] = [];
    for (const before of baseline) {
      const after = current.find(row => row.label === before.label);
      if (!after) { continue; }
      this.pushCoachVisualMetricDelta(result, magnitudes, before.label, 'Amenaza', before.threat, after.threat);
      this.pushCoachVisualMetricDelta(result, magnitudes, before.label, 'Conexion', before.connection, after.connection);
      this.pushCoachVisualMetricDelta(result, magnitudes, before.label, 'Cobertura', before.coverage, after.coverage);
    }
    return result.slice(0, 4);
  }

  private pushCoachVisualMetricDelta(
    parts: string[],
    magnitudes: number[],
    channel: 'L' | 'C' | 'R',
    label: 'Amenaza' | 'Conexion' | 'Cobertura',
    before: number,
    after: number
  ): void {
    const delta = Math.round(after - before);
    if (!isFinite(delta) || Math.abs(delta) < 6) { return; }
    magnitudes.push(Math.min(18, Math.ceil(Math.abs(delta) / 2)));
    const sign = delta > 0 ? '+' : '';
    parts.push(`${channel} ${label} ${sign}${delta}%`);
  }

  private visualDeltaHasHardWarning(visualDeltas: string[]): boolean {
    return visualDeltas.some(delta =>
      delta.includes('Cobertura -')
      || delta.includes('Amenaza -')
      || delta.includes('Conexion -'));
  }

  private buildVisualEngineTension(
    baseline: Array<{ label: 'L' | 'C' | 'R'; threat: number; connection: number; coverage: number }>,
    attackDelta: number,
    defenseDelta: number
  ): string {
    const current = this.tacticalChannelBreakdown;
    let threatDelta = 0;
    let coverageDelta = 0;
    let connectionDelta = 0;
    for (const before of baseline) {
      const after = current.find(row => row.label === before.label);
      if (!after) { continue; }
      threatDelta += after.threat - before.threat;
      coverageDelta += after.coverage - before.coverage;
      connectionDelta += after.connection - before.connection;
    }

    if (threatDelta >= 12 && attackDelta <= -4) {
      return 'sube la amenaza visual, pero baja ATT general. Probable penalizacion por rol/zona; conviene probarlo en harness.';
    }
    if (coverageDelta >= 12 && defenseDelta <= -4) {
      return 'sube la cobertura visual, pero baja DEF general. Revisar si el motor penaliza el cambio de rol mas que la posicion.';
    }
    if (connectionDelta >= 12 && attackDelta + defenseDelta <= -10) {
      return 'mejora la conexion visual, pero el balance general cae fuerte. Puede ser un tradeoff real o una frontera exagerada.';
    }
    return '';
  }

  private describeCoachDeltaSeverity(magnitudes: number[]): string {
    if (magnitudes.length === 0) { return ''; }
    const max = Math.max(...magnitudes);
    if (max >= 25) {
      return 'Impacto extremo: revisar si el movimiento representa un cambio táctico grande o si el motor está exagerando la frontera de zona.';
    }
    if (max >= 11) {
      return 'Impacto fuerte: debería sentirse claramente en el partido.';
    }
    if (max >= 4) {
      return 'Impacto medio: ajuste táctico perceptible, pero controlado.';
    }
    return 'Impacto leve: microajuste estable.';
  }

  private describeCoachMoveSpatialRead(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): string {
    const fromChannel = this.visualChannelFromCoords(fromX);
    const toChannel = this.visualChannelFromCoords(toX);
    const fromLine = this.visualLineFromCoords(fromY);
    const toLine = this.visualLineFromCoords(toY);
    const channelLabel = this.coachChannelLabel(toChannel);
    const notes: string[] = [channelLabel];

    if (fromChannel !== toChannel) {
      notes.push(`${this.coachChannelLabel(fromChannel)} -> ${channelLabel}`);
    }
    if (toLine === 'ATT' && Math.abs(toX - 50) >= 28) {
      notes.push('amenaza por banda');
    }
    if (toLine === 'DEF' && Math.abs(toX - 50) >= 28) {
      notes.push('cobertura lateral');
    }
    if (toLine === 'MID' && toChannel === 'C') {
      notes.push('control central');
    }
    if (toLine === 'ATT' && fromLine !== 'ATT') {
      notes.push('riesgo espalda');
    }
    if (toLine === 'DEF' && fromLine !== 'DEF') {
      notes.push('baja el bloque');
    }
    if (Math.abs(toX - 50) > Math.abs(fromX - 50) + 2.5) {
      notes.push('mas amplitud');
    }
    if (Math.abs(toX - 50) < Math.abs(fromX - 50) - 2.5) {
      notes.push('mas interior');
    }

    return ` Zona: ${notes.join(' · ')}.`;
  }

  private coachChannelLabel(channel: 'L' | 'C' | 'R'): string {
    if (channel === 'L') { return 'izquierda'; }
    if (channel === 'R') { return 'derecha'; }
    return 'centro';
  }

  private describeCoachMoveFineTrace(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): string {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);
    const horizontal = Math.abs(dx) < 0.2
      ? 'mismo carril'
      : dx < 0
      ? `${Math.abs(dx).toFixed(1)}% hacia izquierda`
      : `${Math.abs(dx).toFixed(1)}% hacia derecha`;
    const vertical = Math.abs(dy) < 0.2
      ? 'misma altura'
      : dy < 0
      ? `${Math.abs(dy).toFixed(1)}% mas alto`
      : `${Math.abs(dy).toFixed(1)}% mas bajo`;
    const scale = distance < 1
      ? 'micro'
      : distance < 4
      ? 'fino'
      : distance < 10
      ? 'medio'
      : 'grande';

    return ` Traza fina: ${scale}, ${distance.toFixed(1)} pts de cancha (${horizontal}, ${vertical}); coords ${fromX.toFixed(1)}/${fromY.toFixed(1)} -> ${toX.toFixed(1)}/${toY.toFixed(1)}.`;
  }

  private setLastCoachMoveReadForDrag(
    player: PlayerOnFieldDto,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    snappedToNative: boolean
  ): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);
    const fineTrace = this.describeCoachMoveFineTrace(fromX, fromY, toX, toY);
    if (snappedToNative) {
      this.lastCoachMoveRead = {
        title: `${player.name} vuelve a base`,
        body: `Volvio cerca de su punto natural: se limpia el ajuste manual y se recupera la referencia de la formacion.${fineTrace}`,
        level: 'info',
      };
      return;
    }
    if (distance < 1.0) {
      this.lastCoachMoveRead = {
        title: `${player.name} microajuste`,
        body: `Movimiento muy chico: deberia ser estable y no provocar saltos fuertes, pero queda registrado como ajuste manual.${fineTrace}`,
        level: 'info',
      };
      return;
    }

    const fromLine = this.visualLineFromCoords(fromY);
    const toLine = this.visualLineFromCoords(toY);
    const fromChannel = this.visualChannelFromCoords(fromX);
    const toChannel = this.visualChannelFromCoords(toX);
    const movedUp = dy <= -3.5;
    const movedDown = dy >= 3.5;
    const movedWide = Math.abs(toX - 50) > Math.abs(fromX - 50) + 2.5;
    const movedInside = Math.abs(toX - 50) < Math.abs(fromX - 50) - 2.5;
    const naturalFamily = this.getRoleFamily(player.role);
    const forcedRole = naturalFamily && naturalFamily !== toLine;
    const spatialRead = `${this.describeCoachMoveSpatialRead(fromX, fromY, toX, toY)}${fineTrace}`;
    const lateralTradeoff = movedWide
      ? ' Ademas se abre: gana amplitud, pero puede aislarse o abrir espalda en ese costado.'
      : movedInside
      ? ' Ademas se cierra: gana conexion interior, pero puede liberar la banda.'
      : '';

    if (fromLine !== toLine) {
      const attackerDrop = naturalFamily === 'ATT' && toLine !== 'ATT' && toY > fromY;
      const defenderStep = naturalFamily === 'DEF' && toLine !== 'DEF' && toY < fromY;
      this.lastCoachMoveRead = {
        title: `${player.name}: ${fromLine} → ${toLine}`,
        body: attackerDrop
          ? `Baja un delantero: cambia el dibujo y puede dar cobertura contextual, pero no asumir mejora defensiva real hasta probar riesgo en harness.${lateralTradeoff}${spatialRead}`
          : defenderStep
          ? `Sube un defensor: puede sumar salida, presion o amenaza, pero abre espalda y debe validarse como tradeoff de riesgo en harness.${lateralTradeoff}${spatialRead}`
          : forcedRole
          ? `Cambio fuerte de zona: ahora juega como ${toLine}, pero su rol natural es ${player.role}. El motor puede penalizarlo.${lateralTradeoff}${spatialRead}`
          : `Cambio fuerte de zona: modifica la estructura real de la formacion y deberia sentirse en el motor.${lateralTradeoff}${spatialRead}`,
        level: attackerDrop || defenderStep || forcedRole ? 'danger' : 'warn',
      };
      return;
    }

    if (movedWide && movedUp) {
      this.lastCoachMoveRead = {
        title: `${player.name} se proyecta abierto`,
        body: `Diagonal hacia banda y adelante: gana profundidad y amplitud, pero puede quedar aislado y dejar espalda si no hay cobertura. Tradeoff de amplitud/profundidad.${spatialRead}`,
        level: 'warn',
      };
      return;
    }
    if (movedWide && movedDown) {
      this.lastCoachMoveRead = {
        title: `${player.name} baja abierto`,
        body: `Diagonal hacia banda y atras: suma cobertura exterior, pero puede alejarse del circuito interior y bajar amenaza. Tradeoff cobertura/amplitud.${spatialRead}`,
        level: 'info',
      };
      return;
    }
    if (movedInside && movedUp) {
      this.lastCoachMoveRead = {
        title: `${player.name} ataca por dentro`,
        body: `Diagonal hacia dentro y adelante: suma presencia central/ofensiva, pero puede liberar la banda y partir ayudas. Tradeoff interior/profundidad.${spatialRead}`,
        level: 'warn',
      };
      return;
    }
    if (movedInside && movedDown) {
      this.lastCoachMoveRead = {
        title: `${player.name} cierra para cubrir`,
        body: `Diagonal hacia dentro y atras: puede compactar el bloque, pero reduce amplitud y puede dejar el costado sin salida. Tradeoff compactacion/amplitud.${spatialRead}`,
        level: 'info',
      };
      return;
    }

    if (movedUp && Math.abs(fromX - 50) >= 30) {
      this.lastCoachMoveRead = {
        title: `${player.name} se proyecta`,
        body: `Sube por banda: gana profundidad ofensiva, pero puede dejar espalda si no hay cobertura.${spatialRead}`,
        level: 'warn',
      };
      return;
    }
    if (movedDown && Math.abs(fromX - 50) >= 30) {
      this.lastCoachMoveRead = {
        title: `${player.name} baja a cubrir`,
        body: `Baja por banda: mejora la proteccion del costado, con menor agresividad arriba.${spatialRead}`,
        level: 'good',
      };
      return;
    }
    if (movedUp) {
      this.lastCoachMoveRead = {
        title: `${player.name} mas alto`,
        body: `Gana metros para presionar o atacar, pero revisa que no se rompa la distancia con su linea.${spatialRead}`,
        level: 'info',
      };
      return;
    }
    if (movedDown) {
      this.lastCoachMoveRead = {
        title: `${player.name} mas bajo`,
        body: naturalFamily === 'ATT'
          ? `Baja un delantero: puede sumar apoyo contextual, pero valida en harness si realmente protege o si solo pierde amenaza.${spatialRead}`
          : `Da mas cobertura y apoyo atras; puede perder llegada si queda demasiado retrasado.${spatialRead}`,
        level: naturalFamily === 'ATT' ? 'warn' : 'info',
      };
      return;
    }
    if (movedWide) {
      this.lastCoachMoveRead = {
        title: `${player.name} abre la cancha`,
        body: `Gana amplitud y amenaza por fuera, pero puede aislarse, separar ayudas y abrir espalda si el rival explota ese costado. Tradeoff de amplitud: validalo en harness/partido.${spatialRead}`,
        level: 'warn',
      };
      return;
    }
    if (movedInside) {
      this.lastCoachMoveRead = {
        title: `${player.name} se cierra`,
        body: `Mejora conexion interior y control central, pero puede liberar la banda y dejar al equipo sin amplitud. Tradeoff interior/exterior: validalo en harness/partido.${spatialRead}`,
        level: 'warn',
      };
      return;
    }

    this.lastCoachMoveRead = {
      title: `${player.name}: ajuste ${fromChannel} → ${toChannel}`,
      body: `Ajuste lateral leve: mira si mejora conexiones o deja una banda menos cubierta.${spatialRead}`,
      level: 'info',
    };
  }

  private visualChannelFromCoords(x: number): 'L' | 'C' | 'R' {
    if (x < 33) { return 'L'; }
    if (x > 67) { return 'R'; }
    return 'C';
  }

  private visualLineFromCoords(y: number): 'ATT' | 'MID' | 'DEF' {
    if (y < 34) { return 'ATT'; }
    if (y < 67) { return 'MID'; }
    return 'DEF';
  }

  private getVisualChannel(player: PlayerOnFieldDto): 'L' | 'C' | 'R' {
    const x = this.getMarkerX(player);
    if (x < 33) { return 'L'; }
    if (x > 67) { return 'R'; }
    return 'C';
  }

  private getVisualLine(player: PlayerOnFieldDto): 'ATT' | 'MID' | 'DEF' {
    const y = this.getMarkerY(player);
    if (y < 34) { return 'ATT'; }
    if (y < 67) { return 'MID'; }
    return 'DEF';
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
    this.http.get<any>(`${environment.apiUrl}/career/lineup/current`).subscribe({
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

        const squadSource: any[] = (this.data?.squad && this.data.squad.length > 0)
          ? this.data.squad.map((sp: SessionPlayer) => ({
              playerId: sp.sessionPlayerId,
              name: sp.name,
              position: sp.position,
              overall: sp.attack ?? 70,
              energy: sp.energy ?? 100,
              injured: sp.injured ?? false
            }))
          : playersList;

        const squadById = new Map<string, any>();
        squadSource.forEach((p: any) => squadById.set(p.playerId, p));

        const selectedPlayerIds = new Set((playersList || []).map((p: any) => p.playerId).filter(Boolean));
        const orderedSource = selectedPlayerIds.size > 0
          ? [
              ...(playersList || []).map((p: any) => ({
                ...(squadById.get(p.playerId) || {}),
                ...p
              })),
              ...squadSource.filter((p: any) => !selectedPlayerIds.has(p.playerId))
            ]
          : squadSource;

        const allPlayers: PlayerOnFieldDto[] = orderedSource.map((p: any) => ({
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
              player.xPercent = Math.max(0, Math.min(100, slot.customXPercent));
            }
            if (typeof slot.customYPercent === 'number' && isFinite(slot.customYPercent)) {
              player.yPercent = Math.max(0, Math.min(100, slot.customYPercent));
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
    return slotId === 'GK-1';
  }

  private canPlayerUseSlot(player: PlayerOnFieldDto, slotId: string | null | undefined): boolean {
    if (!slotId) { return false; }
    const gkPlayer = this.isGoalkeeperPlayer(player);
    const gkSlot = this.isGoalkeeperSlot(slotId);
    return gkPlayer === gkSlot;
  }

  private lockGoalkeeperToGoalArea(player: PlayerOnFieldDto): void {
    player.slotId = 'GK-1';
    delete player.xPercent;
    delete player.yPercent;
    this.slotPlayerMap['GK-1'] = player;
  }

  private isInsideGoalkeeperProtectedArea(xPct: number, yPct: number): boolean {
    const gkSlot = this.subdivisions.find(s => s.subdivisionId === 'GK-1');
    if (gkSlot) {
      return xPct >= gkSlot.left
        && xPct <= gkSlot.left + gkSlot.width
        && yPct >= gkSlot.top
        && yPct <= gkSlot.top + gkSlot.height;
    }
    return false;
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

  handleSlotDrop(event: CdkDragDrop<any>): void {
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

  handleBenchDrop(event: CdkDragDrop<any>): void {
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
    const dragRef = (event.source as any)?._dragRef;
    if (!dragRef) { return; }
    const data = (event.source as any)?.data as PlayerOnFieldDto | undefined;
    if (!data?.playerId) { return; }
    if (this.isGoalkeeperPlayer(data)) {
      event.source?.reset?.();
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
      event.source?.reset?.();
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

    const benchCards = document.querySelectorAll('.bench-container .bench-player');
    let overBenchCard = false;
    for (const card of Array.from(benchCards)) {
      const cr = (card as HTMLElement).getBoundingClientRect();
      const insetLeft = cr.left + cr.width * 0.25;
      const insetRight = cr.right - cr.width * 0.25;
      const insetTop = cr.top + cr.height * 0.25;
      const insetBottom = cr.bottom - cr.height * 0.25;
      if (dropX >= insetLeft && dropX <= insetRight
          && dropY >= insetTop && dropY <= insetBottom) {
        overBenchCard = true;
        break;
      }
    }
    if (overBenchCard) {
      this.movePlayerToBench(player);
      return;
    }

    const pickup = this.markerPickupOffset.get(player.playerId) ?? { x: 35, y: 24 };
    this.markerPickupOffset.delete(player.playerId);

    const sourceEl = ((event.source as any)?._dragRef?.element?.nativeElement as HTMLElement | undefined);
    const markerRect = sourceEl?.getBoundingClientRect();
    const halfHeight = (markerRect?.height ?? 48) / 2;

    const xPct = Math.max(0, Math.min(100, ((dropX - pickup.x + 35 - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((dropY - pickup.y + halfHeight - rect.top) / rect.height) * 100));

    if (this.isInsideGoalkeeperProtectedArea(xPct, yPct)) {
      this.pendingCoachMoveBaseline = null;
      if (player.slotId) {
        delete player.xPercent;
        delete player.yPercent;
        this.slotPlayerMap[player.slotId] = player;
      }
      event.source?.reset?.();
      this.saveLineup();
      this.triggerChemistryPreview();
      this.updateFormationDetection();
      this.homePlayers$.next([...this.homePlayers$.value]);
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      return;
    }

    if (!player.slotId || player.slotId === '') {
      const closest = this.findClosestSubdivision(xPct, yPct, player);
      if (closest) { player.slotId = closest.subdivisionId; }
    }

    const owningSlot = player.slotId
      ? this.subdivisions.find(s => s.subdivisionId === player.slotId)
      : null;
    const canonicalX = player.slotId ? this.getFormationPositionCoord(player.slotId, 'x') : null;
    const canonicalY = player.slotId ? this.getFormationPositionCoord(player.slotId, 'y') : null;
    const centerX = canonicalX ?? (owningSlot ? owningSlot.left + owningSlot.width / 2 : null);
    const centerY = canonicalY ?? (owningSlot ? owningSlot.top + owningSlot.height / 2 : null);
    const dropNearNativeCenter =
      centerX !== null && centerY !== null
      && Math.hypot(xPct - centerX, yPct - centerY) <= 1.5;

    if (dropNearNativeCenter) {
      delete player.xPercent;
      delete player.yPercent;
      if (player.slotId) {
        this.slotPlayerMap[player.slotId] = player;
      }
      this.setLastCoachMoveReadForDrag(player, previousX, previousY, centerX ?? xPct, centerY ?? yPct, true);
    } else {
      player.xPercent = xPct;
      player.yPercent = yPct;
      if (player.slotId) {
        delete this.slotPlayerMap[player.slotId];
      }
      this.setLastCoachMoveReadForDrag(player, previousX, previousY, xPct, yPct, false);
      this.persistLastModalMoveHarnessCase(player, previousX, previousY, xPct, yPct);
    }

    this.captureRatingsFromFormationEffectiveness();
    this.requestRatingsPreview();

    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    const dragRef = (event.source as any)?._dragRef;
    if (dragRef) {
      if (typeof event.source?.reset === 'function') {
        event.source.reset();
      }
      const rootEl = dragRef.rootElement;
      if (rootEl && rootEl.style) {
        rootEl.style.transform = '';
        rootEl.style.webkitTransform = '';
      }
    }
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
    const spatialRead = this.describeCoachMoveSpatialRead(
      fromX,
      fromY,
      targetX,
      targetY
    );
    this.lastCoachMoveRead = {
      title: `${player.name}: ${fromLine}${fromChannel} → ${toLine}${toChannel}`,
      body: fromLine !== toLine
        ? `Cambio de slot con impacto estructural: revisa ATT/MID/DEF y la penalizacion de rol.${spatialRead}`
        : `Reubicado en slot tactico: vuelve a una referencia limpia de formacion.${spatialRead}`,
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

    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
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
      body: 'Lo mandaste al banco: baja ocupacion del dibujo y puede dejar una zona sin cobertura hasta reemplazarlo.',
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
      return Math.max(0, Math.min(100, player.xPercent));
    }
    if (!player.slotId) { return 50; }
    const formationX = this.getFormationPositionCoord(player.slotId, 'x');
    if (formationX !== null) { return formationX; }
    const cx = this.getSlotCenterX(player.slotId);
    return isFinite(cx) ? cx : 50;
  }

  getMarkerY(player: PlayerOnFieldDto): number {
    if (typeof player.yPercent === 'number' && isFinite(player.yPercent)) {
      return Math.max(0, Math.min(100, player.yPercent));
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
    return Math.max(0, Math.min(100, value));
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
        const zone = (closest as any).zone ?? '';
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

    this.http.post<any>(`${environment.apiUrl}/career/lineup/auto-select`, {
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

  private applyLineupToSlots(formationName: string, playersList: any[], backendSlots: LineupSlotDTO[] = []): void {
    this.slotPlayerMap = {};

    const positions = this.formationPositions[formationName] || [];

    const squadSource: any[] = (this.data?.squad && this.data.squad.length > 0)
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

    const selectedPlayerIds = new Set((playersList || []).map((p: any) => p.playerId).filter(Boolean));
    const orderedSource = selectedPlayerIds.size > 0
      ? [
          ...squadSource.filter((p: any) => selectedPlayerIds.has(p.playerId)),
          ...squadSource.filter((p: any) => !selectedPlayerIds.has(p.playerId))
        ]
      : squadSource;

    const allPlayers: PlayerOnFieldDto[] = orderedSource.map((p: any) => ({
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
          player.xPercent = Math.max(0, Math.min(100, slot.customXPercent));
        }
        if (typeof slot.customYPercent === 'number' && isFinite(slot.customYPercent)) {
          player.yPercent = Math.max(0, Math.min(100, slot.customYPercent));
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
