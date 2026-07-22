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

@Component({
  selector: 'app-squad-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatIconModule, DragDropModule],
  template: `
    <div class="squad-editor-container">

      <div class="squad-header">
        <div class="squad-header-left">
          <h2>Editor de Formación</h2>
          <div class="formation-selector">
          <label>Formación:</label>

          <select [value]="dropdownFormationValue"
                  (change)="onFormationSelect($any($event.target).value)"
                  [disabled]="isFormationChanging"
                  [title]="(isCustomLineup() ? 'Tu lineup personalizado no coincide con una formación canónica' : '')">
            <option *ngFor="let f of formations" [value]="f">{{f}}</option>
            <option [value]="userFormationLabel" [disabled]="true">Formacion manual</option>
          </select>
          <span *ngIf="isFormationChanging" class="formation-change-blocked">(espera...)</span>
        </div>
        </div>

        <div class="squad-header-right">
          <div class="header-preview-stack">
            <div class="chemistry-preview-row">
            <ng-container *ngIf="getDisplayedChemistryScore() as displayedScore; else previewEmpty">
              <span class="preview-label">Quimica proyectada:</span>
              <span class="preview-score"
                    [class.high]="displayedScore >= 80"
                    [class.mid]="displayedScore >= 60 && displayedScore < 80"
                    [class.low]="displayedScore < 60">
                {{ displayedScore }}/99
              </span>
              <span *ngIf="teamAverage !== null && teamAverage < 1.0"
                    class="preview-eff-weight"
                    [title]="'Ponderado por formación (eff. team ' + (teamAverage * 100).toFixed(0) + '%)'">
                ×{{ (teamAverage * 100).toFixed(0) }}%
              </span>
              <span class="preview-delta"
                    *ngIf="currentChemistryScore !== null"
                    [class.positive]="displayedScore > currentChemistryScore"
                    [class.negative]="displayedScore < currentChemistryScore"
                    [title]="'Δ vs chemistry guardado en backend (' + currentChemistryScore + '/99)'">
                ({{ displayedScore > currentChemistryScore ? '+' : '' }}{{ displayedScore - currentChemistryScore }})
              </span>
            </ng-container>
            <ng-template #previewEmpty>
              <span class="preview-label preview-pending"
                    *ngIf="!previewError; else previewFailed">
                Proyectando chemistry...
              </span>
              <ng-template #previewFailed>
                <span class="preview-label preview-error">⚠ Chemistry preview unavailable</span>
              </ng-template>
            </ng-template>
          </div>

          <div class="formation-effectiveness-row" *ngIf="formationEffectiveness$ | async as fe">
            <span class="fe-label">Formación inferida:</span>
            <span class="fe-formation">{{ fe.inferredFormation }}</span>
            <span class="fe-sep">·</span>
            <span class="fe-label">Eff. team:</span>
            <span class="fe-team-avg"
                  [class.high]="fe.teamAverage >= 0.85"
                  [class.mid]="fe.teamAverage >= 0.5 && fe.teamAverage < 0.85"
                  [class.low]="fe.teamAverage < 0.5">
              {{ (fe.teamAverage * 100).toFixed(0) }}%
            </span>
          </div>
          </div>

          <button mat-stroked-button
                  (click)="resetCustomPositions()"
                  class="reset-positions-btn"
                  data-testid="reset-custom-positions-button"
                  *ngIf="hasCustomPositions()"
                  title="Volver a las posiciones canónicas de la formación">
            ↺ Reset posiciones
          </button>
          <button mat-icon-button (click)="close()" class="close-btn" title="Cerrar">×</button>
        </div>
      </div>

      <div class="main-area">
        <aside class="team-stats-panel" aria-label="Team stats panel">

          <section class="tsp-section">
            <h3 class="tsp-title">📊 Match preview</h3>
            <div class="tsp-formation-row">
              <span class="tsp-formation-label">Formación:</span>
              <span class="tsp-formation-value"
                    [class.is-custom]="isCustomLineup()">
                {{ dropdownFormationValue }}
              </span>
              <span class="tsp-coverage">{{ occupiedSlots }}/11</span>
            </div>
            <div class="tsp-style-tags" *ngIf="styleTags.length">
              <span *ngFor="let tag of styleTags" class="tsp-tag">{{ tag }}</span>
            </div>
            <div class="tsp-style-tags" *ngIf="!styleTags.length">
              <span class="tsp-tag-empty">Lineup incompleto</span>
            </div>
          </section>

          <section class="tsp-section">
            <h3 class="tsp-title">⚗ Chemistry</h3>
            <div class="tsp-chem-row">
              <span class="tsp-chem-value"
                    [class.high]="(chemistryScore ?? 0) >= 80"
                    [class.mid]="(chemistryScore ?? 0) >= 60 && (chemistryScore ?? 0) < 80"
                    [class.low]="(chemistryScore ?? 0) < 60">
                {{ chemistryScore ?? '—' }}<span class="tsp-chem-max">/99</span>
              </span>
              <span *ngIf="teamAverage !== null && teamAverage < 1.0"
                    class="tsp-eff-weight"
                    [title]="'Eff. team: ' + (teamAverage * 100).toFixed(0) + '%'">
                ×{{ (teamAverage * 100).toFixed(0) }}%
              </span>
            </div>
            <div class="tsp-bar-bg">
              <div class="tsp-bar-fg"
                   [class.high]="(chemistryScore ?? 0) >= 80"
                   [class.mid]="(chemistryScore ?? 0) >= 60 && (chemistryScore ?? 0) < 80"
                   [class.low]="(chemistryScore ?? 0) < 60"
                   [style.width.%]="chemistryScore ?? 0"></div>
            </div>
            <div class="tsp-tactical-chem" *ngIf="tacticalChemistry as tc">
              <div class="tsp-stat">
                <span class="tsp-stat-label">Tactical links</span>
                <span class="tsp-stat-val"
                      [class.high]="tc.score >= 80"
                      [class.mid]="tc.score >= 60 && tc.score < 80"
                      [class.low]="tc.score < 60">{{ tc.score }}/99</span>
              </div>
              <div class="tsp-mini-grid">
                <span>DEF {{ tc.lineScores['DEF'] }}</span>
                <span>MID {{ tc.lineScores['MID'] }}</span>
                <span>ATT {{ tc.lineScores['ATT'] }}</span>
                <span>L {{ tc.channelScores['LEFT'] }}</span>
                <span>C {{ tc.channelScores['CENTER'] }}</span>
                <span>R {{ tc.channelScores['RIGHT'] }}</span>
              </div>
              <div class="tsp-warning-line" *ngIf="tc.warnings.length">
                {{ tc.warnings[0] }}
              </div>
            </div>
            <div class="tsp-stats-row">
              <div class="tsp-stat">
                <span class="tsp-stat-label">Stamina avg</span>
                <span class="tsp-stat-val"
                      [class.high]="avgStamina >= 70"
                      [class.low]="avgStamina < 30">{{ avgStamina }}%</span>
              </div>
              <div class="tsp-stat">
                <span class="tsp-stat-label">Eff. team</span>
                <span class="tsp-stat-val"
                      [class.high]="(teamAverage ?? 0) >= 0.85"
                      [class.mid]="(teamAverage ?? 0) >= 0.5 && (teamAverage ?? 0) < 0.85"
                      [class.low]="(teamAverage ?? 0) < 0.5">
                  {{ teamAverage !== null ? (teamAverage * 100).toFixed(0) + '%' : '—' }}
                </span>
              </div>
              <div class="tsp-stat">
                <span class="tsp-stat-label">Injured</span>
                <span class="tsp-stat-val"
                      [class.danger]="injuredCount > 0">{{ injuredCount }}</span>
              </div>
            </div>
          </section>

          <section class="tsp-section">
            <h3 class="tsp-title">⚔ Attack vs Defense</h3>
            <div class="tsp-rating-row">
              <div class="tsp-rating-col">
                <span class="tsp-rating-label">ATT</span>
                <span class="tsp-rating-val"
                      [class.high]="attackRating >= 100"
                      [class.mid]="attackRating >= 75 && attackRating < 100"
                      [class.low]="attackRating < 75">
                  {{ attackRating || '—' }}{{ attackRating ? '%' : '' }}
                </span>
                <div class="tsp-bar-bg">
                  <div class="tsp-bar-fg"
                       [class.high]="attackRating >= 100"
                       [class.mid]="attackRating >= 75 && attackRating < 100"
                       [class.low]="attackRating < 75"
                       [style.width.%]="attackRating ? this.Math.min(attackRating, 200) / 2 : 0"></div>
                </div>
              </div>
              <div class="tsp-rating-col">
                <span class="tsp-rating-label">MID</span>
                <span class="tsp-rating-val"
                      [class.high]="midfieldRating >= 100"
                      [class.mid]="midfieldRating >= 75 && midfieldRating < 100"
                      [class.low]="midfieldRating < 75">
                  {{ midfieldRating || '—' }}{{ midfieldRating ? '%' : '' }}
                </span>
                <div class="tsp-bar-bg">
                  <div class="tsp-bar-fg"
                       [class.high]="midfieldRating >= 100"
                       [class.mid]="midfieldRating >= 75 && midfieldRating < 100"
                       [class.low]="midfieldRating < 75"
                       [style.width.%]="midfieldRating ? this.Math.min(midfieldRating, 200) / 2 : 0"></div>
                </div>
              </div>
              <div class="tsp-rating-col">
                <span class="tsp-rating-label">DEF</span>
                <span class="tsp-rating-val"
                      [class.high]="defenseRating >= 100"
                      [class.mid]="defenseRating >= 75 && defenseRating < 100"
                      [class.low]="defenseRating < 75">
                  {{ defenseRating || '—' }}{{ defenseRating ? '%' : '' }}
                </span>
                <div class="tsp-bar-bg">
                  <div class="tsp-bar-fg"
                       [class.high]="defenseRating >= 100"
                       [class.mid]="defenseRating >= 75 && defenseRating < 100"
                       [class.low]="defenseRating < 75"
                       [style.width.%]="defenseRating ? this.Math.min(defenseRating, 200) / 2 : 0"></div>
                </div>
              </div>
            </div>
            <div class="tsp-net-row">
              <span class="tsp-net-label">Balance</span>
              <span class="tsp-net-val"
                    [class.attack-leaning]="attackRating > defenseRating + 5"
                    [class.defense-leaning]="defenseRating > attackRating + 5">
                <ng-container *ngIf="attackRating > defenseRating + 5">Ofensivo +{{ attackRating - defenseRating }}</ng-container>
                <ng-container *ngIf="defenseRating > attackRating + 5">Defensivo +{{ defenseRating - attackRating }}</ng-container>
                <ng-container *ngIf="attackRating <= defenseRating + 5 && defenseRating <= attackRating + 5">Equilibrado</ng-container>
              </span>
            </div>
          </section>

          <section class="tsp-section">
            <h3 class="tsp-title">🧭 Shape & canales</h3>
            <div class="tsp-shape-grid">
              <div class="tsp-shape-row" *ngFor="let row of tacticalShapeMatrix">
                <span class="tsp-shape-zone">{{ row.zone }}</span>
                <span class="tsp-shape-cell"
                      [class.empty]="row.left === 0"
                      [class.strong]="row.left >= 2">L {{ row.left }}</span>
                <span class="tsp-shape-cell"
                      [class.empty]="row.center === 0"
                      [class.strong]="row.center >= 2">C {{ row.center }}</span>
                <span class="tsp-shape-cell"
                      [class.empty]="row.right === 0"
                      [class.strong]="row.right >= 2">R {{ row.right }}</span>
              </div>
            </div>
            <div class="tsp-shape-chips">
              <span class="tsp-shape-chip">Ancho {{ tacticalShapeSummary.width }}%</span>
              <span class="tsp-shape-chip">Compact. {{ tacticalShapeSummary.compactness }}%</span>
              <span class="tsp-shape-chip">Bloque {{ tacticalShapeSummary.blockHeight }}%</span>
              <span class="tsp-shape-chip">Prof. DEF {{ tacticalShapeSummary.defensiveDepth }}%</span>
            </div>
            <div class="tsp-channel-breakdown" aria-label="Lectura de amenaza conexion y cobertura por canal">
              <div class="tsp-channel-breakdown-row tsp-channel-breakdown-head">
                <span>Canal</span>
                <span>Amenaza</span>
                <span>Conex.</span>
                <span>Cobertura</span>
              </div>
              <div class="tsp-channel-breakdown-row" *ngFor="let row of tacticalChannelBreakdown">
                <span class="tsp-shape-zone">{{ row.label }}</span>
                <span [class.strong]="row.threat >= 66">{{ row.threat }}%</span>
                <span [class.strong]="row.connection >= 66">{{ row.connection }}%</span>
                <span [class.strong]="row.coverage >= 66">{{ row.coverage }}%</span>
              </div>
            </div>
            <div class="tsp-warning-line" *ngIf="tacticalShapeWarnings.length">
              {{ tacticalShapeWarnings[0] }}
            </div>
          </section>

          <section class="tsp-section">
            <h3 class="tsp-title">🧠 Lectura DT</h3>
            <div *ngIf="lastCoachMoveRead as moveRead"
                 class="tsp-coach-last-move"
                 [class.good]="moveRead.level === 'good'"
                 [class.warn]="moveRead.level === 'warn'"
                 [class.danger]="moveRead.level === 'danger'"
                 [class.info]="moveRead.level === 'info'">
              <span class="tsp-coach-read-title">Último movimiento: {{ moveRead.title }}</span>
              <span class="tsp-coach-read-body">{{ moveRead.body }}</span>
            </div>
            <div class="tsp-coach-read-list">
              <div *ngFor="let note of tacticalCoachReads"
                   class="tsp-coach-read"
                   [class.good]="note.level === 'good'"
                   [class.warn]="note.level === 'warn'"
                   [class.danger]="note.level === 'danger'"
                   [class.info]="note.level === 'info'">
                <span class="tsp-coach-read-title">{{ note.title }}</span>
                <span class="tsp-coach-read-body">{{ note.body }}</span>
              </div>
            </div>
          </section>

          <section class="tsp-section" *ngIf="offRolePlayers.length">
            <h3 class="tsp-title">⚠  Penalizaciones ({{ offRolePlayers.length }})</h3>
            <div class="tsp-penalty-summary"
                 [class.severe]="tacticalPenaltySummary.level === 'severe'"
                 [class.warning]="tacticalPenaltySummary.level === 'warning'">
              {{ tacticalPenaltySummary.message }}
            </div>
            <div class="tsp-offrole-list">
              <div *ngFor="let o of offRolePlayers"
                   class="tsp-offrole-row"
                   [class.severe]="o.penaltyPct >= 25"
                   [class.warning]="o.penaltyPct >= 10 && o.penaltyPct < 25">
                <div class="tsp-offrole-name">{{ o.player.name }}</div>
                <div class="tsp-offrole-detail">
                  <span class="tsp-offrole-role">{{ o.naturalRole }}</span>
                  <span class="tsp-offrole-arrow">→</span>
                  <span class="tsp-offrole-zone">{{ o.actualZone }}</span>
                </div>
                <div class="tsp-offrole-penalty"
                     [class.severe]="o.penaltyPct >= 25"
                     [class.warning]="o.penaltyPct >= 10 && o.penaltyPct < 25">
                  -{{ o.penaltyPct }}%
                </div>
                <div class="tsp-offrole-advice">{{ o.advice }}</div>
              </div>
            </div>
          </section>

          <section class="tsp-section">
            <h3 class="tsp-title">🎯 Características</h3>
            <div class="tsp-attr-row">
              <span class="tsp-attr-label">⚡ Pace</span>
              <div class="tsp-bar-bg">
                <div class="tsp-bar-fg neutral" [style.width.%]="paceRating"></div>
              </div>
              <span class="tsp-attr-val">{{ paceRating }}</span>
            </div>
            <div class="tsp-attr-row">
              <span class="tsp-attr-label">🧠 Technique</span>
              <div class="tsp-bar-bg">
                <div class="tsp-bar-fg neutral" [style.width.%]="techniqueRating"></div>
              </div>
              <span class="tsp-attr-val">{{ techniqueRating }}</span>
            </div>
            <div class="tsp-attr-row">
              <span class="tsp-attr-label">🧱 Mentality</span>
              <div class="tsp-bar-bg">
                <div class="tsp-bar-fg neutral" [style.width.%]="mentalityRating"></div>
              </div>
              <span class="tsp-attr-val">{{ mentalityRating }}</span>
            </div>
          </section>

          <section class="tsp-section">
            <h3 class="tsp-title">📹 Zonas</h3>
            <table class="tsp-table">
              <thead>
                <tr>
                  <th class="tsp-th-zone">Zona</th>
                  <th class="tsp-th-num">N</th>
                  <th class="tsp-th-num">OVR</th>
                  <th class="tsp-th-num">Eff</th>
                  <th class="tsp-th-num">%</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of zoneBreakdown"
                    [class.empty-row]="row.count === 0">
                  <td class="tsp-zone-cell">{{ row.zone }}</td>
                  <td class="tsp-num-cell">{{ row.count }}</td>
                  <td class="tsp-num-cell">{{ row.count === 0 ? '—' : row.avgOverall }}</td>
                  <td class="tsp-num-cell"
                      [class.high]="row.avgEff >= 85"
                      [class.mid]="row.avgEff >= 50 && row.avgEff < 85"
                      [class.low]="row.avgEff < 50 && row.count > 0">
                    {{ row.count === 0 ? '—' : row.avgEff + '%' }}
                  </td>
                  <td class="tsp-num-cell">{{ row.contributionPct }}%</td>
                </tr>
              </tbody>
            </table>
          </section>
        </aside>

        <div class="field-and-bench">

      <div class="field-container">

        <div class="field" #fieldContainer>

          <div class="zone-label zone-attack-label">ATAQUE</div>
          <div class="zone-label zone-midfield-label">MEDIO</div>
          <div class="zone-label zone-defense-label">DEFENSA</div>

          <div class="field-line center-line"></div>
          <div class="field-line center-circle"></div>
          <div class="field-line left-penalty-area"></div>
          <div class="field-line right-penalty-area"></div>
          <div class="field-line left-goal-area"></div>
          <div class="field-line right-goal-area"></div>
          <div class="field-line left-penalty-spot"></div>
          <div class="field-line right-penalty-spot"></div>
          <div class="field-line left-penalty-arc"></div>
          <div class="field-line right-penalty-arc"></div>

          <div class="corner-arc corner-tl"></div>
          <div class="corner-arc corner-tr"></div>
          <div class="corner-arc corner-bl"></div>
          <div class="corner-arc corner-br"></div>

          <div class="goal-post goal-post-top"></div>
          <div class="goal-post goal-post-bottom"></div>

          <div class="field-slots">
            <ng-container *ngFor="let sub of subdivisions; let i = index">

<ng-container *ngIf="shouldRenderSlot(sub)">

              <ng-container *ngIf="sub.isGoalkeeper">
<div class="slot slot-gk"
                      cdkDropList
                      [id]="'slot-' + sub.subdivisionId"
[cdkDropListConnectedTo]="allDropListIds"
                       [cdkDropListData]="sub"
                       [style.left.%]="sub.left"
                       [style.top.%]="sub.top"
                       [style.width.%]="sub.width"
                       [style.height.%]="sub.height"
[class.occupied]="isSlotOccupied(sub)"
[class.recommended]="isRecommendedSlot(sub)"
                      (cdkDropListDropped)="handleSlotDrop($event)"
                      (click)="onSlotClick(sub)">
                </div>
              </ng-container>

              <ng-container *ngIf="!sub.isGoalkeeper">
                <div class="slot"
                     cdkDropList
                     [id]="'slot-' + sub.subdivisionId"
                     [cdkDropListConnectedTo]="allDropListIds"
                     [cdkDropListData]="sub"
                     [style.left.%]="sub.left"
                     [style.top.%]="sub.top"
                     [style.width.%]="sub.width"
                     [style.height.%]="sub.height"
                     [class.occupied]="isSlotOccupied(sub)"
                     [class.recommended]="isRecommendedSlot(sub)"
                     [class.attack]="sub.zone === 'ATTACK'"
                     [class.midfield]="sub.zone === 'MIDFIELD'"
                     [class.defense]="sub.zone === 'DEFENSE'"
                     (cdkDropListDropped)="handleSlotDrop($event)"
                     (click)="onSlotClick(sub)">
                 </div>
               </ng-container>
              </ng-container>
             </ng-container>
            </div>

<ng-container *ngFor="let player of homePlayers; trackBy: trackByPlayer; let i = index">

              <div *ngIf="player.slotId"
                   class="player-marker"
                   cdkDrag
                   [cdkDragDisabled]="isGoalkeeperPlayer(player)"
                   [cdkDragData]="player"
                   (cdkDragStarted)="onMarkerDragStarted($event)"
                   (cdkDragEnded)="handleMarkerDragEnd($event, player)"
                   (click)="onMarkerClick(player)"
                   [style.left.%]="getMarkerX(player)"
                   [style.top.%]="getMarkerY(player)"
                   [class.gk-player]="player.role === 'GK'"
                   [class.off-role]="isOffRole(player)"
                   [class.eff-green]="getChipEffectivenessClass(player.slotId) === 'eff-good'"
                   [class.eff-yellow]="getChipEffectivenessClass(player.slotId) === 'eff-warning'"
                   [class.eff-red]="getChipEffectivenessClass(player.slotId) === 'eff-bad'"
                   [ngClass]="getMarkerRoleClasses(player.role)">

               <div class="player-number">{{i + 1}}</div>
               <div class="player-name-label">{{player.name}}</div>
               <div class="player-role-label">{{getMarkerRoleLabel(player)}}</div>

               <div *ngIf="isOffRole(player)" class="off-role-badge">OFF</div>
             </div>
          </ng-container>

          <div *ngIf="loadingFormation" class="field-loading-overlay">
            <div class="field-spinner"></div>
          </div>
        </div>
      </div>

      <div class="bench-container"
           cdkDropList
           [id]="BENCH_DROP_LIST_ID"
           [cdkDropListConnectedTo]="slotDropListIds"
           [cdkDropListData]="'bench'"
           (cdkDropListDropped)="handleBenchDrop($event)">
        <span class="bench-label">
          Banca ({{ benchPlayers.length }})
        </span>
        <div class="bench-list">
          <div *ngFor="let bp of benchPlayers"
               class="bench-player"
               cdkDrag
               [cdkDragData]="bp">
            <span class="bench-player-name">{{ bp.name }}</span>
            <span class="bench-player-pos">({{ bp.position }})</span>
          </div>
          <span *ngIf="!benchPlayers || benchPlayers.length === 0"
                class="bench-empty">
            (vacía — todos en cancha)
          </span>
        </div>
      </div>
        </div>

      </div>

      <div class="squad-footer">
        <div class="team-info home">
          <strong>{{homeTeamName}}</strong>
          <span>{{homeFormation}}</span>
        </div>
        <div class="field-orientation">
          <span class="orientation-label">↑ ATAQUE</span>
        </div>
        <div class="bench-info">
          <span>Slots: {{occupiedSlots}}/11</span>
        </div>
      </div>

      <div *ngIf="selectedSlot" class="assignment-panel">
        <div class="assignment-header">
          <span>Slot: {{selectedSlot.subdivisionId}}</span>
          <button mat-icon-button (click)="selectedSlot = null" title="Cerrar">×</button>
        </div>
        <div class="assignment-content">
          <div *ngIf="getPlayerInSlot(selectedSlot) as player" class="assigned-player">
            <strong>{{player.name}}</strong>
            <span>{{player.position}}</span>
            <button mat-button color="warn" (click)="removePlayerFromSlot(player)">
              Quitar
            </button>
            <select [(ngModel)]="selectedPlayerToAssign" class="player-select">
              <option value="">Cambiar por...</option>
              <option *ngFor="let p of benchPlayers" [value]="p.playerId">
                {{p.name}} ({{p.position}})
              </option>
            </select>
            <button mat-raised-button color="primary"
                    [disabled]="!selectedPlayerToAssign"
                    (click)="assignPlayerToSlot()">
              Cambiar
            </button>
          </div>
          <div *ngIf="!getPlayerInSlot(selectedSlot)" class="unassigned-slot">
            <span>Sin asignar</span>
            <select [(ngModel)]="selectedPlayerToAssign" class="player-select">
              <option value="">Seleccionar jugador...</option>
              <option *ngFor="let p of benchPlayers" [value]="p.playerId">
                {{p.name}} ({{p.position}})
              </option>
            </select>
            <button mat-raised-button color="primary"
                    [disabled]="!selectedPlayerToAssign"
                    (click)="assignPlayerToSlot()">
              Asignar
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="errorMessage" class="error-message">
        <mat-icon>warning</mat-icon>
        <span>{{errorMessage}}</span>
      </div>

      <div *ngIf="lineupWarning$ | async as w"
           class="lineup-warning-banner"
           [class.warning-warning]="w.severity === 'WARNING'"
           [class.warning-error]="w.severity === 'ERROR'">
        <mat-icon>
          <ng-container [ngSwitch]="w.code">
            <ng-container *ngSwitchCase="'LINEUP_NO_GOALKEEPER'">sports_handball</ng-container>
            <ng-container *ngSwitchCase="'LINEUP_MINIMUM_PLAYERS_NOT_MET'">close</ng-container>
            <ng-container *ngSwitchDefault>warning</ng-container>
          </ng-container>
        </mat-icon>
        <span class="banner-text">{{w.message}}</span>
        <button class="banner-close" (click)="lineupWarning$.next(null)" title="Cerrar">×</button>
      </div>

      <div *ngIf="conditionWarning" class="condition-warning-message">
        <mat-icon>info</mat-icon>
        <span>{{conditionWarning}}</span>
      </div>
    </div>
  `,
  styles: [`

    .squad-editor-container {

      width: 98vw;
      max-width: 98vw;
      height: 90vh;
      background: linear-gradient(180deg, #1a472a 0%, #2d5a3d 100%);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .squad-header {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: rgba(0, 0, 0, 0.55);
      border-bottom: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px 12px 0 0;
    }

    .squad-header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      min-width: 0;
    }

    .squad-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .reset-positions-btn {
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #fff;
      background: rgba(245, 158, 11, 0.18);
      transition: background 0.15s ease;
    }
    .reset-positions-btn:hover {
      background: rgba(245, 158, 11, 0.32);
    }

    .squad-header h2 {
      margin: 0;
      color: #fff;
      font-size: 1.4rem;
    }

    .formation-selector {
      display: flex;
      align-items: center;
      gap: 10px;

      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .formation-selector .formation-change-blocked {
      color: #ff9800;
      font-size: 0.85rem;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .formation-selector label {
      color: #a0d4a8;
      font-size: 0.9rem;

      position: relative;
      z-index: 1;
      white-space: nowrap;
    }

    .formation-selector select {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #4a7c59;
      background: #1a472a;
      color: #fff;
      font-size: 1.1rem;
      font-weight: bold;
      cursor: pointer;

      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }

    .close-btn {
      color: #a0d4a8;
    }

    .header-preview-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-right: 0.5rem;

      flex-shrink: 0;
    }

    .chemistry-preview-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.6rem;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      font-size: 0.8rem;
      color: #fff;
      white-space: nowrap;
    }

    .preview-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
    }

    .preview-label.preview-pending {
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
    }

    .preview-label.preview-error {
      color: #fbb;
    }

    .preview-score {
      font-weight: 700;
      padding: 0.05rem 0.4rem;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
    }

    .preview-score.high {
      background: #48bb78;
      color: #1a472a;
    }

    .preview-score.mid {
      background: #eab308;
      color: #744210;
    }

    .preview-score.low {
      background: #c53030;
      color: #fff;
    }

    .preview-delta {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
    }

    .preview-delta.positive {
      background: #48bb78;
      color: #1a472a;
    }

    .preview-delta.negative {
      background: #fc8181;
      color: #742a2a;
    }

    .preview-delta:not(.positive):not(.negative) {
      background: rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.85);
    }

    .preview-eff-weight {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.05rem 0.35rem;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.85);
      font-style: italic;
    }

    .formation-effectiveness-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      font-size: 0.8rem;
      color: #fff;
      white-space: nowrap;
    }
    .formation-effectiveness-row .fe-label {
      color: rgba(255, 255, 255, 0.65);
      font-size: 0.75rem;
    }
    .formation-effectiveness-row .fe-formation {
      font-weight: 700;
      padding: 0.05rem 0.4rem;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .formation-effectiveness-row .fe-sep {
      color: rgba(255, 255, 255, 0.4);
    }
    .formation-effectiveness-row .fe-team-avg {
      font-weight: 700;
      padding: 0.05rem 0.4rem;
      border-radius: 3px;
    }
    .formation-effectiveness-row .fe-team-avg.high {
      background: #48bb78;
      color: #1a472a;
    }
    .formation-effectiveness-row .fe-team-avg.mid {
      background: #eab308;
      color: #744210;
    }
    .formation-effectiveness-row .fe-team-avg.low {
      background: #c53030;
      color: #fff;
    }

    .bench-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: rgba(0, 0, 0, 0.35);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      min-height: 56px;
    }
    .bench-container .bench-label {
      color: #a0d4a8;
      font-size: 0.85rem;
      font-weight: 600;
      flex-shrink: 0;
    }
.bench-container .bench-list {

      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.4rem;
      flex: 1;
      padding: 0.2rem 0;

      overflow-x: auto;
    }
    .bench-container .bench-empty {
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.8rem;
      font-style: italic;
    }
    .bench-player {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 0.7rem;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      cursor: grab;

      min-width: 110px;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .bench-player:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
    }
    .bench-player:active {
      cursor: grabbing;
    }
    .bench-player-name {

      font-size: 0.75rem;
      color: #fff;
      font-weight: 600;
      white-space: normal;
      line-height: 1.1;
      overflow: visible;
      text-overflow: clip;
      max-width: 100%;
      text-align: center;
      word-break: normal;
      overflow-wrap: anywhere;
    }
    .bench-player-pos {
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 1px;
    }

    .slot-eff-badge {
      position: absolute;
      top: 1px;
      right: 1px;
      font-size: 0.5rem;
      font-weight: 700;
      padding: 0px 3px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      pointer-events: none;
    }

    .slot.eff-green:not(.occupied) {
      background: rgba(72, 187, 120, 0.15);
      border-color: rgba(72, 187, 120, 0.5);
    }
    .slot.eff-yellow:not(.occupied) {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.5);
    }
    .slot.eff-red:not(.occupied) {
      background: rgba(197, 48, 48, 0.2);
      border-color: rgba(197, 48, 48, 0.6);
    }

    .slot.occupied {
      background: transparent !important;
      border: none !important;
    }

    .cdk-drop-list-receiving,
    .cdk-drop-list-dragging {
      transition: background 0.15s ease;
    }
    .cdk-drop-list-receiving.slot,
    .cdk-drop-list-dragging.slot {
      background: rgba(255, 255, 255, 0.25);
    }
    .cdk-drop-list-receiving.bench-container,
    .cdk-drop-list-dragging.bench-container {
      background: rgba(0, 0, 0, 0.6);
      border-top-color: rgba(255, 200, 0, 0.5);
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 8px;
      padding: 0 8px;
      min-height: 0;
    }
    .field-and-bench {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }
    .team-stats-panel {
      flex: 0 0 280px;
      width: 280px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      color: #fff;
      font-size: 0.78rem;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }
    .team-stats-panel::-webkit-scrollbar { width: 6px; }
    .team-stats-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .tsp-section {
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tsp-section:last-child { border-bottom: none; }
    .tsp-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 6px 0;
    }
    .tsp-formation-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 4px;
    }
    .tsp-formation-label {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.55);
    }
    .tsp-formation-value {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }
    .tsp-formation-value.is-custom {
      color: #f59e0b;
      font-style: italic;
    }
    .tsp-coverage {
      margin-left: auto;
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.55);
      font-weight: 600;
    }
    .tsp-style-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .tsp-tag {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(72, 187, 120, 0.18);
      border: 1px solid rgba(72, 187, 120, 0.5);
      border-radius: 999px;
      font-size: 0.65rem;
      color: #b4f0c2;
      font-weight: 600;
    }
    .tsp-tag-empty {
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }
    .tsp-chem-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 4px;
    }
    .tsp-chem-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .tsp-chem-max {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 400;
      margin-left: 2px;
    }
    .tsp-eff-weight {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.6);
      padding: 1px 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
    }
    .tsp-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin: 4px 0;
    }
    .tsp-bar-fg {
      height: 100%;
      background: #48bb78;
      border-radius: 3px;
      transition: width 0.18s ease, background 0.18s ease;
    }
    .tsp-bar-fg.neutral { background: rgba(255, 255, 255, 0.6); }
    .tsp-bar-fg.high { background: #48bb78; }
    .tsp-bar-fg.mid { background: #eab308; }
    .tsp-bar-fg.low { background: #c53030; }
    .tsp-stats-row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin-top: 6px;
    }
    .tsp-stat {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 4px 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .tsp-stat-label {
      font-size: 0.6rem;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tsp-stat-val {
      font-size: 0.85rem;
      font-weight: 700;
      color: #fff;
    }
    .tsp-stat-val.high { color: #48bb78; }
    .tsp-stat-val.mid { color: #eab308; }
    .tsp-stat-val.low { color: #c53030; }
    .tsp-stat-val.danger { color: #fc8181; }
    .tsp-tactical-chem {
      margin: 8px 0;
      padding: 8px;
      border-radius: 6px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .tsp-mini-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      margin-top: 6px;
      font-size: 10px;
      color: rgba(255,255,255,0.78);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .tsp-mini-grid span {
      padding: 3px 4px;
      border-radius: 4px;
      background: rgba(255,255,255,0.04);
      text-align: center;
    }
    .tsp-warning-line {
      margin-top: 6px;
      color: #f6ad55;
      font-size: 10px;
      font-weight: 700;
    }
    .tsp-shape-grid {
      display: grid;
      gap: 4px;
      margin-top: 6px;
    }
    .tsp-shape-row {
      display: grid;
      grid-template-columns: 34px repeat(3, 1fr);
      gap: 4px;
      align-items: center;
    }
    .tsp-shape-zone {
      font-size: 10px;
      font-weight: 800;
      color: rgba(255,255,255,0.7);
      letter-spacing: 0.04em;
    }
    .tsp-shape-cell {
      padding: 3px 4px;
      border-radius: 4px;
      text-align: center;
      font-size: 10px;
      font-weight: 800;
      color: #d7f7df;
      background: rgba(72,187,120,0.13);
      border: 1px solid rgba(72,187,120,0.18);
    }
    .tsp-shape-cell.empty {
      color: #f6ad55;
      background: rgba(246,173,85,0.10);
      border-color: rgba(246,173,85,0.16);
    }
    .tsp-shape-cell.strong {
      color: #ffffff;
      background: rgba(72,187,120,0.24);
      border-color: rgba(72,187,120,0.36);
    }
    .tsp-shape-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 7px;
    }
    .tsp-shape-chip {
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.82);
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .tsp-channel-breakdown {
      display: grid;
      gap: 3px;
      margin-top: 7px;
      font-size: 10px;
    }
    .tsp-channel-breakdown-row {
      display: grid;
      grid-template-columns: 0.65fr repeat(3, 1fr);
      gap: 4px;
      align-items: center;
    }
    .tsp-channel-breakdown-row span {
      padding: 2px 4px;
      border-radius: 4px;
      text-align: center;
      color: #d7f7df;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .tsp-channel-breakdown-head span {
      color: #9fc7aa;
      background: transparent;
      border-color: transparent;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.03em;
    }
    .tsp-channel-breakdown-row span.strong {
      color: #ffffff;
      background: rgba(72,187,120,0.20);
      border-color: rgba(72,187,120,0.32);
    }
    .tsp-coach-read-list {
      display: grid;
      gap: 5px;
      margin-top: 6px;
    }
    .tsp-coach-read {
      padding: 6px 7px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.045);
    }
    .tsp-coach-last-move {
      margin-top: 6px;
      margin-bottom: 6px;
      padding: 7px 8px;
      border-radius: 7px;
      border: 1px solid rgba(99, 179, 237, 0.42);
      background: rgba(99, 179, 237, 0.12);
      box-shadow: inset 3px 0 0 rgba(99, 179, 237, 0.72);
    }
    .tsp-coach-last-move.good {
      border-color: rgba(72, 187, 120, 0.42);
      background: rgba(72, 187, 120, 0.12);
      box-shadow: inset 3px 0 0 rgba(72, 187, 120, 0.72);
    }
    .tsp-coach-last-move.warn,
    .tsp-coach-last-move.info {
      border-color: rgba(246, 173, 85, 0.42);
      background: rgba(246, 173, 85, 0.11);
      box-shadow: inset 3px 0 0 rgba(246, 173, 85, 0.72);
    }
    .tsp-coach-last-move.danger {
      border-color: rgba(245, 101, 101, 0.46);
      background: rgba(245, 101, 101, 0.13);
      box-shadow: inset 3px 0 0 rgba(245, 101, 101, 0.78);
    }
    .tsp-coach-read.good {
      border-color: rgba(72, 187, 120, 0.34);
      background: rgba(72, 187, 120, 0.10);
    }
    .tsp-coach-read.warn,
    .tsp-coach-read.info {
      border-color: rgba(246, 173, 85, 0.32);
      background: rgba(246, 173, 85, 0.09);
    }
    .tsp-coach-read.danger {
      border-color: rgba(245, 101, 101, 0.38);
      background: rgba(245, 101, 101, 0.11);
    }
    .tsp-coach-read-title {
      display: block;
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 800;
      line-height: 1.15;
    }
    .tsp-coach-read-body {
      display: block;
      margin-top: 2px;
      color: rgba(255, 255, 255, 0.72);
      font-size: 0.64rem;
      font-weight: 600;
      line-height: 1.25;
    }
    .tsp-rating-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
    }
    .tsp-rating-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tsp-rating-label {
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.55);
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .tsp-rating-val {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }
    .tsp-rating-val.high { color: #48bb78; }
    .tsp-rating-val.mid { color: #eab308; }
    .tsp-rating-val.low { color: #c53030; }
    .tsp-net-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 4px;
      padding: 4px 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .tsp-net-label {
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.55);
      text-transform: uppercase;
    }
    .tsp-net-val {
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
    }
    .tsp-net-val.attack-leaning { color: #f59e0b; }
    .tsp-net-val.defense-leaning { color: #3b82f6; }
    .tsp-attr-row {
      display: grid;
      grid-template-columns: 70px 1fr 30px;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .tsp-attr-label {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.75);
      font-weight: 600;
    }
    .tsp-attr-val {
      font-size: 0.78rem;
      font-weight: 700;
      color: #fff;
      text-align: right;
    }
    .tsp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
    }
    .tsp-table th {
      text-align: right;
      padding: 2px 4px;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tsp-table th.tsp-th-zone { text-align: left; }
    .tsp-table td {
      padding: 3px 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #fff;
    }
    .tsp-zone-cell {
      font-weight: 700;
      color: #a0d4a8;
    }
    .tsp-num-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .tsp-num-cell.high { color: #48bb78; font-weight: 700; }
    .tsp-num-cell.mid { color: #eab308; }
    .tsp-num-cell.low { color: #c53030; }
    tr.empty-row td { color: rgba(255, 255, 255, 0.3); font-style: italic; }

    .tsp-offrole-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tsp-penalty-summary {
      margin-bottom: 6px;
      padding: 5px 7px;
      border-radius: 4px;
      font-size: 0.66rem;
      line-height: 1.25;
      color: #f8f2cf;
      background: rgba(234, 179, 8, 0.10);
      border: 1px solid rgba(234, 179, 8, 0.25);
    }
    .tsp-penalty-summary.severe {
      color: #fed7d7;
      background: rgba(197, 48, 48, 0.13);
      border-color: rgba(197, 48, 48, 0.35);
    }
    .tsp-offrole-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      background: rgba(234, 179, 8, 0.08);
      border-left: 2px solid #eab308;
      border-radius: 3px;
    }
    .tsp-offrole-row.severe {
      background: rgba(197, 48, 48, 0.12);
      border-left-color: #c53030;
    }
    .tsp-offrole-row.warning {
      background: rgba(234, 179, 8, 0.1);
      border-left-color: #eab308;
    }
    .tsp-offrole-name {
      font-size: 0.7rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tsp-offrole-detail {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.65rem;
    }
    .tsp-offrole-role {
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
    }
    .tsp-offrole-arrow { color: rgba(255, 255, 255, 0.4); }
    .tsp-offrole-zone {
      color: #a0d4a8;
      font-weight: 700;
    }
    .tsp-offrole-penalty {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      color: #eab308;
      background: rgba(234, 179, 8, 0.15);
      white-space: nowrap;
    }
    .tsp-offrole-penalty.severe {
      color: #fc8181;
      background: rgba(197, 48, 48, 0.25);
    }
    .tsp-offrole-penalty.warning {
      color: #eab308;
      background: rgba(234, 179, 8, 0.18);
    }
    .tsp-offrole-advice {
      grid-column: 1 / -1;
      font-size: 0.62rem;
      line-height: 1.2;
      color: rgba(255, 255, 255, 0.68);
    }

    .field-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;

      padding: 8px;
      overflow: hidden;

      min-height: 0;
    }

    .field {
      position: relative;

      height: 100%;
      width: auto;
      max-width: 100%;
      aspect-ratio: 1.15 / 1;

      background:
        repeating-linear-gradient(
          0deg,
          rgba(255, 255, 255, 0.015) 0px,
          rgba(255, 255, 255, 0.015) 5%,
          transparent 5%,
          transparent 10%
        ),
        radial-gradient(
          ellipse at center,
          #3a8159 0%,
          #2d6a3e 50%,
          #235534 100%
        );
      background-blend-mode: overlay;

      border: 2.5px solid rgba(255, 255, 255, 0.95);
      border-radius: 4px;

    }

    .zone-label {
      position: absolute;
      right: 8px;
      font-size: 0.7rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
      z-index: 100;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }

    .zone-attack-label { top: 2%; color: #ff9999; }
    .zone-midfield-label { top: 35%; color: #99ff99; }
    .zone-defense-label { top: 68%; color: #99bbff; }

    .field-line {
      position: absolute;
      border: 2px solid rgba(255, 255, 255, 0.85);
      z-index: 2;
    }

    .center-line {
      top: 50%;
      height: 2.5px;
      width: 100%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.95);
      border: none;
    }

    .center-circle {
      top: 50%;
      left: 50%;
      width: 18%;
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 2.5px solid rgba(255, 255, 255, 0.95);
    }

    .left-penalty-area {
      bottom: 0;
      left: 50%;
      width: 60%;
      height: 16%;
      transform: translateX(-50%);
      border: 2px solid rgba(255, 255, 255, 0.9);

      border-bottom: none;
    }

    .right-penalty-area {
      top: 0;
      left: 50%;
      width: 60%;
      height: 16%;
      transform: translateX(-50%);
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-top: none;
    }

    .left-goal-area {
      bottom: 0;
      left: 50%;
      width: 25%;
      height: 6%;
      transform: translateX(-50%);
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-bottom: none;
    }

    .right-goal-area {
      top: 0;
      left: 50%;
      width: 25%;
      height: 6%;
      transform: translateX(-50%);
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-top: none;
    }

    .left-penalty-spot {
      bottom: 12%;
      left: 50%;
      width: 0.6%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      transform: translateX(-50%);
      border: none;
    }

    .right-penalty-spot {
      top: 12%;
      left: 50%;
      width: 0.6%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      transform: translateX(-50%);
      border: none;
    }

    .left-penalty-arc {
      bottom: 12%;
      left: 50%;
      width: 14%;
      aspect-ratio: 1;
      border-radius: 50%;
      transform: translate(-50%, 35%);
      border: 2px solid rgba(255, 255, 255, 0.85);
      border-bottom-color: transparent;
      border-left-color: transparent;
      border-right-color: transparent;
    }

    .right-penalty-arc {
      top: 12%;
      left: 50%;
      width: 14%;
      aspect-ratio: 1;
      border-radius: 50%;
      transform: translate(-50%, -35%);
      border: 2px solid rgba(255, 255, 255, 0.85);
      border-top-color: transparent;
      border-left-color: transparent;
      border-right-color: transparent;
    }

    .corner-arc {
      position: absolute;
      width: 2.5%;
      height: 2.5%;
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-radius: 0;
    }

    .corner-tl {
      top: 0;
      left: 0;
      border-top-left-radius: 100%;
      border-bottom: none;
      border-right: none;
    }

    .corner-tr {
      top: 0;
      right: 0;
      border-top-right-radius: 100%;
      border-bottom: none;
      border-left: none;
    }

    .corner-bl {
      bottom: 0;
      left: 0;
      border-bottom-left-radius: 100%;
      border-top: none;
      border-right: none;
    }

    .corner-br {
      bottom: 0;
      right: 0;
      border-bottom-right-radius: 100%;
      border-top: none;
      border-left: none;
    }

    .goal-post {
      position: absolute;
      left: 50%;
      width: 8%;
      height: 4%;
      transform: translateX(-50%);
      background:

        repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.25) 0px,
          rgba(255, 255, 255, 0.25) 0.5px,
          transparent 0.5px,
          transparent 4%
        ),
        rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.85);
      z-index: 3;
    }

    .goal-post-top {
      top: 0;
      border-radius: 0 0 8% 8%;
    }

    .goal-post-bottom {
      bottom: 0;
      border-radius: 8% 8% 0 0;
    }

    .field-slots {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .slot {
      position: absolute;

      border: none;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      overflow: visible;
    }

    .slot:hover {

    }

    .slot-gk {

      background: transparent;
      border: none;
    }

    .slot.abandoned {

    }

    .slot.recommended {

    }

    .slot.missing-player {

      background: rgba(231, 76, 60, 0.18);
      border: 1px solid rgba(231, 76, 60, 0.5);
      border-style: dashed;
      border-radius: 4px;
    }

    .missing-indicator {
      font-size: 0.55rem;
      color: #e74c3c;
      font-weight: bold;
      background: rgba(0, 0, 0, 0.5);
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 1px;
      text-transform: uppercase;
    }

    .player-chip {
      font-size: 0.5rem;
      color: #fff;

      background: transparent;
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 1px;

      position: relative;
      overflow: visible;

      width: 100%;
      max-width: 100%;
      min-height: 20px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      cursor: grab;
    }

    .player-chip .player-chip-name {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

     .player-chip.eff-warning {

       box-sizing: border-box;
     }
     .player-chip.eff-bad {

       box-sizing: border-box;
     }
     .player-chip.eff-good {

       box-sizing: border-box;
     }

    .player-chip .eff-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 0.55rem;
      padding: 1px 4px;
      border-radius: 8px;
      pointer-events: none;
      z-index: 2;
    }
    .player-chip:active {
      cursor: grabbing;
    }

.player-marker {
        position: absolute;

        width: 70px;
        height: 48px;
        margin-left: -35px;
        margin-top: -24px;
        z-index: 10;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;

        border: 2px solid #fff;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.55);

        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));

        box-sizing: border-box;
      }

      .player-marker.color-gk { height: 38px; margin-top: -19px; }
      .player-marker.color-def { height: 48px; margin-top: -24px; }
      .player-marker.color-mid { height: 44px; margin-top: -22px; }
      .player-marker.color-att { height: 48px; margin-top: -24px; }

    .player-marker .player-number {
      min-width: 18px;
      height: 16px;
      padding: 0 5px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.4);
      line-height: 1;
    }

    .player-marker.gk-player .player-number {

      background: rgba(245, 158, 11, 0.9);
      border-color: rgba(245, 158, 11, 1);
    }

    .player-marker .tactical-number {
      position: absolute;
      top: -10px;
      right: -8px;
      width: 14px;
      height: 14px;
      font-size: 0.55rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.55);
      background: rgba(0, 0, 0, 0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      pointer-events: none;
      z-index: 11;
    }

    .player-marker .player-name-label {

      font-size: 0.6rem;
      font-weight: 700;
      color: #fff;
      background: rgba(0, 0, 0, 0.7);
      padding: 1px 4px;
      border-radius: 3px;
      max-width: 70px;
      overflow: visible;
      text-overflow: clip;
      white-space: normal;
      word-break: normal;
      overflow-wrap: anywhere;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      line-height: 1.2;
    }

    .player-marker .player-role-label {

      font-size: 0.65rem;
      font-weight: 700;
      color: #fff;
      padding: 1px 5px;
      border-radius: 3px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      line-height: 1.2;
    }

    .player-marker.color-gk .player-role-label {
      background: #f59e0b;

    }
    .player-marker.color-def .player-role-label {
      background: #3b82f6;

    }
    .player-marker.color-mid .player-role-label {
      background: #10b981;

    }
    .player-marker.color-att .player-role-label {
      background: #ef4444;

    }

    .player-marker.eff-green {
      filter: drop-shadow(0 0 4px #48bb78) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }
    .player-marker.eff-yellow {
      filter: drop-shadow(0 0 4px #eab308) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }
    .player-marker.eff-red {
      filter: drop-shadow(0 0 4px #c53030) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }

    .player-marker.off-role {
      border: 2px dashed #f59e0b !important;
      box-sizing: border-box;
    }
    .player-marker .off-role-badge {
      position: absolute;
      top: -10px;
      left: -8px;
      font-size: 0.55rem;
      font-weight: 700;
      color: #fff;
      background: rgba(245, 158, 11, 0.95);
      border-radius: 3px;
      padding: 1px 4px;
      pointer-events: none;
      z-index: 11;
      letter-spacing: 0.5px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
    }

    .player-marker {
      cursor: grab;
    }
    .player-marker:active,
    .player-marker.cdk-drag-preview {
      cursor: grabbing;
    }
    .player-marker.cdk-drag-preview {
      opacity: 0.92;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45),
                  0 2px 6px rgba(0, 0, 0, 0.35);
      transform: rotate(0.5deg);
    }
    .player-marker.cdk-drag-placeholder {
      opacity: 0.3;
      transition: opacity 0.15s ease;
    }

    .field-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      border-radius: 4px;
    }

    .field-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .assignment-panel {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      border-radius: 8px;
      padding: 12px;
      min-width: 250px;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }

    .assignment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      padding-bottom: 8px;
      margin-bottom: 8px;
      color: #fff;
    }

    .assignment-content {
      color: #fff;
    }

    .assigned-player {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .unassigned-slot {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .player-select {
      padding: 8px;
      border-radius: 4px;
      background: #333;
      color: #fff;
      border: 1px solid #555;
    }

    .squad-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.5);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .team-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 150px;
    }

    .team-info.home {
      align-items: flex-start;
    }

    .team-info strong {
      color: #fff;
      font-size: 1.1rem;
    }

    .team-info span {
      color: #a0d4a8;
      font-size: 0.9rem;
    }

    .field-orientation {
      flex: 1;
      text-align: center;
    }

    .orientation-label {
      display: inline-block;
      padding: 6px 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      color: #a0d4a8;
      font-weight: bold;
      font-size: 0.9rem;
      letter-spacing: 2px;
    }

    .bench-info {
      min-width: 150px;
      text-align: right;
      color: #a0d4a8;
      font-size: 0.9rem;
    }

    .error-message {
      position: absolute;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(211, 84, 0, 0.95);
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 100;
    }

    .condition-warning-message {
      position: absolute;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(49, 46, 129, 0.95);
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 100;
      max-width: 80%;
      text-align: center;
    }

    .lineup-warning-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0.5rem 1rem;
      padding: 0.6rem 0.9rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .lineup-warning-banner.warning-warning {
      background: rgba(254, 249, 195, 0.95);
      border: 1.5px solid #eab308;
      color: #854d0e;
    }
    .lineup-warning-banner.warning-error {
      background: rgba(254, 215, 215, 0.95);
      border: 1.5px solid #c53030;
      color: #742a2a;
    }
    .lineup-warning-banner .banner-text {
      flex: 1;
      line-height: 1.3;
    }
    .lineup-warning-banner .banner-close {
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0 0.25rem;
      line-height: 1;
    }

    @media (max-width: 600px) {
      .squad-editor-container {
        width: 98vw;
        height: 90vh;
        max-width: none;
      }

      .field-container {
        padding: 8px 4px;
        overflow: visible;
      }

      .field {

        max-width: 100%;
        aspect-ratio: 1.15 / 1;
        height: 100%;
      }

      .player-chip {
        font-size: 0.4rem;
        padding: 0 2px;
        line-height: 1;
      }

      .squad-header h2 {
        font-size: 1rem;
      }

      .bench-container {
        padding: 0.4rem 0.5rem;
        flex-wrap: nowrap;
      }

      .bench-container .bench-list {
        overflow-x: auto;
      }
    }

    @media (min-width: 601px) and (max-width: 1024px) {
      .squad-editor-container {
        width: 90vw;
        height: 85vh;
      }

      .field {

        aspect-ratio: 1.15 / 1;
        height: 100%;
        max-width: 100%;
      }

      .player-chip {
        font-size: 0.45rem;
      }

      .squad-header h2 {
        font-size: 1.2rem;
      }
    }

    @media (min-width: 1600px) {

      .squad-editor-container {
        max-width: 98vw;
      }

    }
  `]
})
export class SquadEditorModalComponent implements OnInit, OnDestroy {
  // can clamp their width to [0, 100] (engine values come in as
  // multiplier x 100, so e.g. a 165% ATT would overflow a 100% wide bar).
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
    // slot that has a free-positioning override, so the back can apply
    // the SubdivisionEffectivenessCalculator distance penalty to the
    // player's ACTUAL drop point instead of the canonical slot center.
    // payloads for free drops meant the backend returned identical
    // ratings (UI stayed stale after drag).
    //
    // The backend currently ignores these optional fields; this commit
    // thread them through coordsBySubdivision. Until that lands, the
    // behavior is unchanged for the user (the panel still updates on
    // every slot-to-slot drop via applySlotAssignment).
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
        // Silent fail: backend might be slow / unavailable / endpoint
        // not deployed yet on dev. The fallback getters keep the panel
        // showing the last known values (or "-" if never computed).
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

    // Formation-shape tags first.
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
        // Custom / unrecognized.
        if (players.length >= 11) { tags.push('Custom Formation'); }
    }

    // Role-based overlay tags (additive on top of formation-shape).
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

  private getColumn(player: PlayerOnFieldDto): 'L' | 'C' | 'R' {
    // when the panel switched to engine-derived ratings. Keeping the
    // method around (private, no callers) would be dead code; removed.
    return 'C';
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
    // Formation changes are now immediate (backend is fast)
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
          // Need exactly 11 to preview; earlier/later states emit null
          // (template shows "Proyectando chemistry..." placeholder).
          if (!snapshot.ids || snapshot.ids.length !== 11) {
            this.previewError = false;
            return of(null);
          }
          return this.chemistryPreview.previewChemistry(
            snapshot.ids,
            snapshot.formation,
            snapshot.slots
          ).pipe(
            catchError(err => {
              console.warn('[SQUAD-EDITOR] Chemistry preview failed:', err);
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
      error: (err) => {
        console.error('[SQUAD-EDITOR] Error loading subdivisions:', err);
        this.errorMessage$.next('Error al cargar las subdivisiones del campo');
        this.cdr.detectChanges();
      }
    });
  }

  private loadFormationPositions(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<FormationDTO[]>(`${environment.apiUrl}/editor/formations`).subscribe({
        next: (formations) => {
          formations.forEach(f => {
            this.formationPositions[f.name] = f.positions;
          });
          resolve();
        },
        error: () => {
          resolve(); // Continuar sin coordenadas de formación
        }
      });
    });
  }

  private loadSquadFromBackend(): void {
    this.http.get<any>(`${environment.apiUrl}/career/lineup/current`).subscribe({
      next: (response) => {
        // baseline for the preview's delta computation. The preview shows
        // (previewScore - currentChemistryScore) so the manager sees the
        // impact of their edits vs the saved lineup.
        this.currentChemistryScore = (typeof response?.chemistryScore === 'number')
            ? response.chemistryScore
            : null;

        // modal hides the effectiveness row and the chemistry preview is
        // shown unweighted (no teamAverage multiplier).
        this.formationEffectiveness$.next(
          (response?.formationEffectiveness && typeof response.formationEffectiveness.teamAverage === 'number')
            ? response.formationEffectiveness
            : null
        );
        // lineup response so the panel has values to render immediately
        // (instead of waiting for the first drag-triggered preview).
        this.captureRatingsFromFormationEffectiveness();

        // via MAT_DIALOG_DATA) so the dialog opens with the SAME state the
        // parent shows. Was: response.formation || this.selectedFormation
        // Avoid falling back to 4-4-2 when response.formation is null.
        // and parent had e.g. 5-4-1, causing the dialog/parent desync.
        const formationName = response?.formation
          || this.data?.currentFormation
          || this.selectedFormation
          || '4-4-2';
        const positions = this.formationPositions[formationName] || [];

        // role-match fallback para que isRecommendedSlot/getRecommendedRole
        // (que usan this.selectedFormation) vean la formación correcta, no la
        // vieja. Antes este seteo estaba al final del callback y los métodos
        // que dependen de selectedFormation usaban el valor previo.
        this.homeFormation$.next(formationName);
        this.selectedFormation = formationName;

        // Limpiar mapeos anteriores
        this.slotPlayerMap = {};

        // Si no hay jugadores, hacer auto-select automáticamente
        const playersList = response?.players || [];
        if (playersList.length === 0) {
          this.executeAutoSelect(formationName);
          // Noreturn aquí - necesitamos terminar la inicialización después del auto-select
        }

        // squad completo vía dialog data, lo usamos como source de bench en
        // lugar de response.players (que solo trae los 11 del LINEUP). Si
        // (bench = filter !slotId sobre lineup, que da 0 cuando lineup = 11).
        const squadSource: any[] = (this.data?.squad && this.data.squad.length > 0)
          ? this.data.squad.map((sp: SessionPlayer) => ({
              // SessionPlayer.sessionPlayerId -> lineup player playerId.
              // El back usa sessionPlayerId como playerId en /career/lineup/current,
              // entonces mapear mantiene la consistencia con persistedSlots y
              // slotPlayerMap que matchean por playerId.
              playerId: sp.sessionPlayerId,
              name: sp.name,
              position: sp.position,
              overall: sp.attack ?? 70,  // squad no expone overall; fallback suave
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

        // Convertir jugadores del response
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

        // Indexar jugadores por playerId para lookup O(1) al restaurar slots.
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

        // Para jugadores sin slot asignado (o si el back no devolvió slots),
        // aplicar el fallback de role-match contra la formación activa.
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

        // were applied verbatim, so a player placed in a 3-5-2 CAM slot
        // would keep that slotId after switching back to 4-4-2 (which has
        // no CAM position). The .player-marker would render at the CAM
        // position (ghost marker), AND if 2 players happened to share
        // that stale subdivisionId they would stack on top of each other
        // time bug where 2 GKs from the same squad shared the GK slotId
        // when the persisted lineup came from a 3-5-2 session with 2
        // GKs at the same coord).
        //
        // Strategy: for any player whose slotId is not in the active
        // formation, clear the slotId AND try to re-assign them via
        // role-match. If no role-match slot is available, the player
        // goes to the bench. The slotPlayerMap is kept consistent
        // (no stale references to players that no longer "live" in
        // that slot).
        for (const player of allPlayers) {
          if (!player.slotId) { continue; }
          if (this.isSlotInActiveFormation(player.slotId)) { continue; }
          // stale slotId from a previous formation; free it
          delete this.slotPlayerMap[player.slotId];
          player.slotId = '';
        }
        // Re-run role-match for the displaced players (those whose
        // slotId was just cleared). They take any still-available
        // formation position that matches their role.
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

        // rerun, two players could end up with the same slotId if the
        // backend's persisted slots use different subdivisionIds that
        // map to the same visual position (e.g., 2 GKs sharing the GK
        // coord in a 3-5-2 lineup that was migrated to 4-4-2). For each
        // duplicated slotId, the second player (and beyond) is sent to
        // the bench. The first one keeps the slot. This is what the
        // user sees: 1 marker per slot, never stacked duplicates.
        const seenSubdivisionIds = new Set<string>();
        for (const player of allPlayers) {
          if (!player.slotId) { continue; }
          if (seenSubdivisionIds.has(player.slotId)) {
            // Duplicate; clear the slotId, the player will go to bench.
            delete this.slotPlayerMap[player.slotId];
            player.slotId = '';
            continue;
          }
          seenSubdivisionIds.add(player.slotId);
        }

        this.homePlayers$.next(allPlayers.filter(p => p.slotId));
        this.benchPlayers$.next(allPlayers.filter(p => !p.slotId));
        this.triggerChemistryPreview();

        // Finalizar inicialización
        this.isInitializing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[SQUAD-EDITOR] Error loading lineup:', err);
        // Si hay error, aún mostrar la formación seleccionada
        this.homeFormation$.next(this.selectedFormation || '4-4-2');
        // Finalizar inicialización también en error
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
    // canonical), the user can drag-drop to slots outside the canonical
    // positions. The marker MUST render at whatever slot the player is in,
    // otherwise the drag-drop appears to "vanish". The canonical-mode
    // behavior below is preserved as the default.
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
    // abandonado por un free-positioned player (slotPlayerMap vacío pero
    // algún player tiene slotId===sub.subdivisionId con override). Sin
    // este check el slot se vería como "missing CM" después del free
    // drop, sugiriendo que el slot todavía reclama al player.
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
    // Only the explicit GK-1 box is protected. Defenders may enter any other
    // defensive space, including the penalty area around it.
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
    // Centro = left + width/2
    return sub.left + (sub.width / 2);
  }

  getSlotCenterY(slotId: string): number {
    const sub = this.subdivisions.find(s => s.subdivisionId === slotId);
    if (!sub) return 50;
    // Centro = top + height/2
    return sub.top + (sub.height / 2);
  }

  onSlotClick(sub: FieldSubdivisionDTO): void {
    // Free-position players are inert on slot click: their card already represents a manual field position.
    // Slot popups are reserved for tactical slots that can still be assigned directly.
    // slot queda como un rectángulo visual sin función hasta que el
    // user drag-dropee al player de vuelta (handleSlotDrop restaura el
    // slotPlayerMap y el slot vuelve a ser clickeable con player info).
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

    // Mostrar warning si el jugador tiene condición de riesgo
    this.showConditionWarning(player);

    // Quitar jugador de su slot anterior si tenía uno
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

    // Asignar al nuevo slot
    const slotId = this.selectedSlot.subdivisionId;
    player.slotId = slotId;
    this.slotPlayerMap[slotId] = player;

    // Actualizar listas
    const newBench = this.benchPlayers$.value.filter(p => p.playerId !== player.playerId);
    this.benchPlayers$.next(newBench);
    this.homePlayers$.next([...this.homePlayers$.value, player]);

    this.selectedSlot = null;
    this.selectedPlayerToAssign = '';
    this.saveLineup();
    this.triggerChemistryPreview();
    // handleSlotDrop: if click-assign puts a player into an off-role
    // slot (e.g. assigning a CB to a MID slot via the assign panel), we want
    // the dropdown + marker visibility to flip into user-formation mode.
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
    // incomplete < 11 -> flips to user-formation mode automatically).
    this.updateFormationDetection();
    this.cdr.detectChanges();
  }

  // ============================================================================
  // ============================================================================

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
    // CDK slot drops are not the primary path; handleMarkerDragEnd owns field positioning.
    // Keep this method only for backward-compatible drag/drop integrations.
    // compat with the unit-test suite (5 specs still call handleSlotDrop
    // directly with mock events). The runtime binding is gone but the
    // logic lives on in assignPlayerToSlot.
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player) { return; }

    const targetSubdivisionId = this.subdivisionIdFromDropListId(event.container.id);
    if (!targetSubdivisionId) { return; }

    const sourceDropListId = event.previousContainer.id;
    if (sourceDropListId === 'slot-' + targetSubdivisionId) {
      return; // same slot -> no-op
    }

    const sourceSlotId = sourceDropListId === this.BENCH_DROP_LIST_ID
      ? null
      : this.subdivisionIdFromDropListId(sourceDropListId);

    const occupant = this.slotPlayerMap[targetSubdivisionId] ?? null;
    this.applySlotAssignment(player, sourceSlotId, targetSubdivisionId, occupant);
  }

  handleBenchDrop(event: CdkDragDrop<any>): void {
    // bench drops via the bench area hit-test). Kept for unit-test
    // backward compat.
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
    // Save the NATURAL pickup offset that CDK computed from the click.
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

    // 1. Compute drop position as % of the field bounding rect.
    const fieldEl = this.fieldContainer?.nativeElement;
    if (!fieldEl) { return; }
    const rect = fieldEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { return; }
    const dropX = event.dropPoint?.x ?? rect.left;
    const dropY = event.dropPoint?.y ?? rect.top;

    // si apreto el lugar punteado es como si estuviera ahi, pero la imagen
    // quedo en otro lado'.
    //
    // handler caused the marker to teleport to slot center when the user
    // dropped NEAR a slot (but not at the slot center). The user thought
    // they were dropping in free space but the snap kicked in. Plus, CDK
    // might leave an inline `transform: translate3d(dragX, dragY, 0)` on
    // the element after drag end, which adds the drag-delta on top of
    // the marker's CSS transform `translate(-50%, -50%)`, offsetting the
    // marker visually.
    //
    // inside the field goes to FREE POSITIONING (xPercent/yPercent set).
    // If the user wants the marker at a slot, they drop it AT that
    // slot's pixel location; no more jumping to another slot.
    // Plus: explicit transform clear at the end of the handler so CDK's
    // leftover drag transform doesn't offset the marker visually.
    //
    // Bench still works (move-to-bench via cursor over a bench card).
    //
    // a) cursor over a bench-player card  -> movePlayerToBench
    // b) cursor anywhere else in field    -> FREE POSITIONING (xPct/yPct set,
    //                                          original slot becomes empty)
    // c) cursor outside field             -> clamp xPct/yPct to [0, 100] and
    //                                          treat as free position

    // 2a. Bench hit-test (strict: only over a SPECIFIC bench-player card).
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

    //
    // rect.left) / rect.width * 100`); visually correct ONLY when the
    // user clicked the marker's exact center. If user clicked anywhere
    // else, the marker snapped to "centered on cursor" at release,
    // creating a small but visible jump relative to where it had been
    // during drag.
    //
    // follows the cursor. To do that, we read the pickup offset CDK
    // computed when the drag started (saved in onMarkerDragStarted, NOT
    // overridden) and shift the placement math so the source element's
    // CSS position (with margin, no transform) lands exactly where the
    // cdk-drag-preview was at the moment of release.
    //
    // Derivation:
    //   CDK drag-end preview visual = source.cssLeft + transform = source's
    //     click point on cursor = dropX - pickup.x on X axis
    //     (and dropY - pickup.y on Y).
    //   After CDK clears the transform, source visual = source.cssLeft
    //     (with margin).
    //   We want: source.cssLeft_with_margin = dropX - pickup.x
    //           => style.left.% / 100 * rect.width + rect.left - 35
    //              = dropX - pickup.x
    //           => style.left.% = (dropX - pickup.x + 35 - rect.left)
    //              / rect.width * 100
    //   Same on Y with the marker's actual half-height (which differs by
    //   role: GK 28, MID 22, DEF/ATT 24).
    const pickup = this.markerPickupOffset.get(player.playerId) ?? { x: 35, y: 24 };
    this.markerPickupOffset.delete(player.playerId);

    // GK marker is 56px (half 28), MID is 44px (half 22), DEF/ATT is 48px
    // (half 24). Reading rect.height gives us the rendered height
    // regardless of which class is applied.
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

    // For bench players (no slotId): promote them to the closest subdivision
    // so they participate in chemistry preview.
    if (!player.slotId || player.slotId === '') {
      const closest = this.findClosestSubdivision(xPct, yPct, player);
      if (closest) { player.slotId = closest.subdivisionId; }
    }

    // anywhere inside the owning slot rectangle. The previous rectangle
    // check made tiny manual moves feel broken: if the user moved a marker
    // a few pixels but still dropped inside the same slot box, we cleared
    // xPercent/yPercent and the card jumped back to the original center.
    //
    // Keep the useful "drop exactly back on the native point => clear
    // override / baseline chemistry" semantic, but only inside a very small
    // center tolerance. Any visible micro-move now persists and feeds the
    // preview ratings.
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
      // Snap back: clear any existing free-position override and
      // RESTORE slot occupancy (free positioning may have emptied the
      // slotPlayerMap entry earlier). Re-claiming the slot ensures the
      // player's marker renders at canonical coords AND the slot is
      // treated as occupied downstream.
      delete player.xPercent;
      delete player.yPercent;
      if (player.slotId) {
        this.slotPlayerMap[player.slotId] = player;
      }
      this.setLastCoachMoveReadForDrag(player, previousX, previousY, centerX ?? xPct, centerY ?? yPct, true);
    } else {
      player.xPercent = xPct;
      player.yPercent = yPct;
      // Clear the slot — the player has left it for the free position.
      if (player.slotId) {
        delete this.slotPlayerMap[player.slotId];
      }
      this.setLastCoachMoveReadForDrag(player, previousX, previousY, xPct, yPct, false);
      this.persistLastModalMoveHarnessCase(player, previousX, previousY, xPct, yPct);
    }

    // save round-trip so the user sees the engine numbers reflect the new
    // (xPercent, yPercent) override immediately instead of waiting for
    // values when the player was free-positioned with a small offset
    // instead of +8), because saveLineup’s POST chain runs hundreds of
    // ms and updateFormationDetection’s debounced preview coalesced
    // forward+back drags into a no-op.
    this.captureRatingsFromFormationEffectiveness();
    this.requestRatingsPreview();

    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // normally clears the inline `transform: translate3d(dragX, dragY, 0)`
    // on the root element in its `_endDragSequence()`. But in some
    // edge cases (browser-specific timing, ngZone re-entry) the
    // transform might persist. Explicitly clear it so the marker
    // visually lands at the new style.left/top WITHOUT being offset by
    // a leftover drag-delta transform.
    const dragRef = (event.source as any)?._dragRef;
    if (dragRef) {
      // DragRef.reset() removes preview/placeholder and clears internal
      // state. Public CdkDrag.reset() also clears the root element
      // transform. Use CdkDrag.reset() (the public API on CdkDrag).
      if (typeof event.source?.reset === 'function') {
        event.source.reset();
      }
      // Belt-and-suspenders: explicitly clear the root element's inline
      // transform (in case CdkDrag.reset() didn't catch it).
      const rootEl = dragRef.rootElement;
      if (rootEl && rootEl.style) {
        rootEl.style.transform = '';
        rootEl.style.webkitTransform = '';
      }
    }
  }

  private findSlotAtPosition(xPct: number, yPct: number): FieldSubdivisionDTO | null {
    // dentro de alguna de las coordenadas que hay en la cancha'. Players
    // must land at exact slot coordinates; no free positioning, no
    // snap-to-nearest heuristic. Drops that don't land exactly on a slot
    // are cancelled (marker snaps back); see handleMarkerDragEnd.
    return this.subdivisions.find(s =>
      xPct >= s.left && xPct <= s.left + s.width
      && yPct >= s.top && yPct <= s.top + s.height
    ) ?? null;
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
    } catch (err) {
      console.warn('[SQUAD-EDITOR] Could not persist last modal move for harness:', err);
    }
  }

  getMarkerX(player: PlayerOnFieldDto): number {
    // is driven by xPercent when set (after a free drop), otherwise the
    // solo dentro del campo, y que eso afecte a que porcentaje de cada
    // lugar esta precisamente.' Defensive NaN/Infinity guard + clamp
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
    if (!role) { return {}; }
    return {
      'color-gk':  role === 'GK',
      'color-def': ['CB', 'LB', 'RB', 'DEF'].includes(role),
      'color-mid': ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'].includes(role),
      'color-att': ['ST', 'LW', 'RW', 'CF', 'ATT'].includes(role)
    };
  }

  rolesMatch(playerRole: string | undefined, formationRole: string | undefined): boolean {
    if (!playerRole || !formationRole) { return false; }
    if (playerRole === formationRole) { return true; }
    const playerFamily = this.getRoleFamily(playerRole);
    const formationFamily = this.getRoleFamily(formationRole);
    if (playerFamily !== null && playerFamily === formationFamily) {
      return true;
    }
    return false;
  }

  private getRoleFamily(role: string): 'GK' | 'DEF' | 'MID' | 'ATT' | null {
    if (role === 'GK') return 'GK';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(role)) return 'DEF';
    if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'].includes(role)) return 'MID';
    if (['ST', 'LW', 'RW', 'CF', 'ATT', 'WINGER'].includes(role)) return 'ATT';
    return null;
  }

  private getPositionRoleFamily(player: PlayerOnFieldDto): 'GK' | 'DEF' | 'MID' | 'ATT' | null {
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
    let gk = 0, def = 0, mid = 0, att = 0;
    for (const role of roles) {
      const family = this.getRoleFamily(role);
      if (family === 'GK') gk++;
      else if (family === 'DEF') def++;
      else if (family === 'MID') mid++;
      else if (family === 'ATT') att++;
    }
    return { gk, def, mid, att };
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
    // Delegate to the canonical formation-change handler which performs the
    // POST /career/lineup/auto-select + applyLineupToSlots + clears isFormationChanging.
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

    // formación. En producción vía (ngModelChange) NgModel ya lo escribió,
    // Programmatic calls used by tests and QA flows still need the same completion signal.
    // nosotros para que el getter y el template queden consistentes.
    if (this.selectedFormation !== targetFormation) {
      this.selectedFormation = targetFormation;
    }

    // formación. En producción vía (ngModelChange) NgModel ya lo escribió,
    // Programmatic calls used by tests and QA flows still need the same completion signal.
    // nosotros para que el getter y el template queden consistentes.
    if (this.selectedFormation !== targetFormation) {
      this.selectedFormation = targetFormation;
    }

    // No-op si la formación no cambió realmente
    if (targetFormation === this.homeFormation$.value) {
      return;
    }

    // Bloquear nuevos cambios mientras carga
    this.isFormationChanging = true;
    this.cdr.markForCheck();

    // Emit the update for parent components that may listen to squad changes.
    // otro caller en el futuro lo hace).
    this.formationChangeCompleteSubject = new Subject<void>();

    this.homeFormation$.next(targetFormation);

    // Ejecutar cambio. El reset de isFormationChanging ahora vive adentro
    // de executeFormationChange (next + error callbacks), sin depender del
    // padre escuchando formationChangeComplete.
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
        // Finalizar inicialización después de auto-select
        this.isInitializing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingFormation$.next(false);
        console.error('[SQUAD-EDITOR] Auto-select error:', err);
        // Finalizar inicialización también en error
        this.isInitializing = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyLineupToSlots(formationName: string, playersList: any[], backendSlots: LineupSlotDTO[] = []): void {
    // Limpiar mapeos antes de aplicar nueva lineup
    this.slotPlayerMap = {};

    const positions = this.formationPositions[formationName] || [];

    // usarlo como pool completo para que la banca muestre los jugadores
    // no seleccionados del squad (no solo del response de auto-select).
    const squadSource: any[] = (this.data?.squad && this.data.squad.length > 0)
      ? this.data.squad.map((sp: SessionPlayer) => ({
          playerId: sp.sessionPlayerId,
          name: sp.name,
          position: sp.position,
          overall: sp.attack ?? 70,
          energy: sp.energy ?? 100,
          injured: sp.injured ?? false,
          // SessionPlayer into the modal-internal DTO so the Team Stats
          // panel can compute ATT/DEF/MID ratings and pace/technique/
          // mentality without an extra round trip. Falls back to
          // 'overall' (or 70) when the SessionPlayer record is missing
          // an attribute (defensive players historically don't carry
          // 'attack', etc.).
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

    // Convertir jugadores del response
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

    // Asignar slots según posición EXACTA del jugador
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

    // Actualizar listas de jugadores
    this.homePlayers$.next(allPlayers.filter(p => p.slotId));
    this.benchPlayers$.next(allPlayers.filter(p => !p.slotId));
    this.triggerChemistryPreview();

    // preserve the exact formation requested by the user. Do NOT call
    // detectFormation() here: it only counts role families and collapses
    // variants with the same counts (e.g. 4-2-3-1 -> 4-1-4-1,
    // 5-3-2 -> 3-5-2, 4-2-2-2 -> 4-4-2, 4-1-2-3 -> 4-3-3).
    this.selectedFormation = formationName;
    this.homeFormation$.next(formationName);
    this._isCustomLineup = false;

    // itera sobre homePlayers (getter sobre BehaviorSubject) sin async
    // pipe, así que necesita change detection explícita para repintar
    // los markers en sus nuevas posiciones. Antes solo había detectChanges
    // que funcionaba pero era frágil ante schedules async.
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

    this.applyCurrentXiToFormation(newFormation);
    this.saveLineup();
    this.captureRatingsFromFormationEffectiveness();
    this.requestRatingsPreview();
    this.formationChanged.emit({
      formation: newFormation,
      players: this.homePlayers$.value.slice(0, 11)
    });
    this.formationChangeComplete.emit(this.formationChangeCompleteSubject);

    this.loadingFormation$.next(false);
    this.isFormationChanging = false;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private saveLineup(): void {
    // would 422 anyway; we surface the error inline without sending a doomed request.
    const validHomePlayers = this.getUniqueValidHomePlayers();
    const playerCount = validHomePlayers.length;
    if (playerCount < 7) {
      // commit 31822e3): clarify that 7 is a floor, NOT a ceiling; the user can save with
      // any valid lineup between 7 and 11. The actual guard logic (< 7 means block) is unchanged.
      this.errorMessage$.next('Mínimo 7 jugadores para guardar (puedes tener más)');
      this.lineupWarning$.next(null);
      return;
    }
    if (playerCount > 11) {
      this.errorMessage$.next('Máximo 11 jugadores');
      this.lineupWarning$.next(null);
      return;
    }
    this.errorMessage$.next('');

    // Construir body para /manual-select con los slots actuales (playerId + subdivisionId).
    // posición libre (free positioning por drag en field fuera de slots).
    // El back puede ignorar estos campos por backward compat.
    const playerIds: string[] = validHomePlayers.map(p => p.playerId);
    const slots: LineupSlotDTO[] = validHomePlayers
      .filter(p => !!p.slotId)
      .map(p => {
        const dto: LineupSlotDTO = { playerId: p.playerId, subdivisionId: p.slotId };
        if (typeof p.xPercent === 'number') { dto.customXPercent = p.xPercent; }
        if (typeof p.yPercent === 'number') { dto.customYPercent = p.yPercent; }
        return dto;
      });

    // Paso 1: persistir la subdivision map vía /manual-select.
    this.http.post<{warnings?: LineupWarningDTO[]}>(
      `${environment.apiUrl}/career/lineup/manual-select`,
      {
        formation: this.selectedFormation,
        playerIds,
        slots
      }
    ).subscribe({
      next: () => {
        // Paso 2: confirmar la alineación (genera lineup "armed" para el match).
        this.http.post<{warnings?: LineupWarningDTO[]}>(
          `${environment.apiUrl}/career/lineup/confirm`,
          {}
        ).subscribe({
          next: (response) => {
            const warnings = response?.warnings ?? [];
            this.lineupWarning$.next(warnings.length > 0 ? warnings[0] : null);
          },
          error: (err) => {
            console.error('[SQUAD-EDITOR] Error confirming lineup:', err);
            if (err.error?.code) {
              this.errorMessage$.next(err.error.message || 'Error al guardar');
            }
          }
        });
      },
      error: (err) => {
        console.error('[SQUAD-EDITOR] Error saving manual-select:', err);
        // 422 with code (e.g. LINEUP_MINIMUM_PLAYERS_NOT_MET); surface inline
        if (err.error?.code) {
          this.errorMessage$.next(err.error.message || 'Error al guardar');
        }
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
