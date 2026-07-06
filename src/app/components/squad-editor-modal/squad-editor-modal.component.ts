import { Component, Inject, OnInit, ChangeDetectorRef, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subject, BehaviorSubject, of, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { LineupWarningDTO } from '../../shared/models/lineup/lineup-warning.dto';
import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';
import { FormationDTO, FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';
import { ChemistryDetailDTO } from '../../shared/models/lineup/lineup.dto';
import { FormationEffectivenessDTO, effectivenessColor } from '../../shared/models/lineup/formation-effectiveness.dto';
import { ALL_FORMATIONS } from '../../shared/constants/formations';
import { ChemistryPreviewService } from '../../core/services/chemistry-preview.service';
import { SessionPlayer } from '../../shared/models/player.model';

/**
 * Modal del Editor de Formación - MODO PRE-PARTIDO
 *
 * Usa las 81 subdivisiones del campo como slots interactivos.
 * Cada jugador se coloca en una subdivisión específica.
 *
 * Estructura del campo:
 * - 27 sectores (1-27), cada uno dividido en 3 sub-espacios
 * - Sector 26 es el arquero (1 solo slot)
 * - Total: 81 + 1 = 82 slots posibles
 */
@Component({
  selector: 'app-squad-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatIconModule, DragDropModule],
  template: `
    <div class="squad-editor-container">
      <!-- Header -->
      <div class="squad-header">
        <div class="squad-header-left">
          <h2>Editor de Formación</h2>
          <div class="formation-selector">
          <label>Formación:</label>
          <!-- V25D91.5-FRONT F6 fix: use (ngModelChange) en lugar de (change).
               Razon: con [(ngModel)] + (change), el orden de los listeners es
               incierto — Angular puede disparar el handler ANTES de que
               NgModel haya actualizado el modelo, por lo que onFormationChange()
               leía el valor VIEJO de selectedFormation. El HTTP call iba con
               la formacion anterior → no-op. El markers/header no se actualizaban.

               Con (ngModelChange) Angular garantiza que el handler corre
               DESPUES de actualizar el modelo, asi que el argumento (o
               this.selectedFormation) ya refleja la nueva eleccion del usuario.

               Tambien reseteamos isFormationChanging directamente en el callback
               HTTP (ver onFormationChange) en vez de depender del padre
               escuchando a (formationChangeComplete). El padre squad-management
               (squad-management.component.ts) no subscribe a ese Output, asi que
               antes el select quedaba permanentemente disabled tras el primer
               cambio. -->
          <select [(ngModel)]="selectedFormation"
                  (ngModelChange)="onFormationChange($event)"
                  [disabled]="isFormationChanging">
            <option *ngFor="let f of formations" [value]="f">{{f}}</option>
          </select>
          <span *ngIf="isFormationChanging" class="formation-change-blocked">(espera...)</span>
        </div>
        </div>

        <!-- V25D45 (Sprint C10): chemistry preview row. Shows the projected
             chemistry of the in-progress lineup (debounced 300ms after the
             last assignment change). Δ vs the current persisted score.
             Hidden when no preview yet (lineup not complete) or after preview
             call failed.

             V25D47 (Sprint C11b): the displayed score is weighted by the
             formationEffectiveness.teamAverage (rawScore * teamAverage,
             rounded). When formationEffectiveness is missing the raw score
             is shown unchanged (backward compat with pre-V25D47 lineups). -->
        <div class="squad-header-right">
          <div class="header-preview-stack">
            <div class="chemistry-preview-row">
            <ng-container *ngIf="getDisplayedChemistryScore() as displayedScore; else previewEmpty">
              <span class="preview-label">Chemistry proyectado:</span>
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
                    [class.positive]="displayedScore > (currentChemistryScore ?? 0)"
                    [class.negative]="displayedScore < (currentChemistryScore ?? 0)"
                    [title]="'Δ vs chemistry guardado en backend (' + (currentChemistryScore ?? 0) + '/99)'">
                ({{ displayedScore > (currentChemistryScore ?? 0) ? '+' : '' }}{{ displayedScore - (currentChemistryScore ?? 0) }})
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

          <!-- V25D47 (Sprint C11b): formation effectiveness row. Hidden when
               formationEffectiveness is null (legacy pre-V25D47 lineups).
               Shows the back-inferred formation + team average effectiveness
               color-coded (green/yellow/red per the same thresholds as
               per-player markers). -->
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
          <button mat-icon-button (click)="close()" class="close-btn" title="Cerrar">✕</button>
        </div>
      </div>
      <!-- ^^^ V25D92.6-FRONT F1: restructured header. .squad-header-left (h2 +
           .formation-selector) is column 1 of the new 2-column grid, and
           .squad-header-right (.header-preview-stack + close-btn) is column 2.
           Keeps the chemistry preview stack and close-btn visually anchored
           to the right of the header, no big empty middle as pre-V25D92.6. -->

      <!-- Field Canvas - Vertical Orientation -->
      <div class="field-container">
        <div class="field">
          <!-- Etiquetas de zonas -->
          <div class="zone-label zone-attack-label">ATAQUE</div>
          <div class="zone-label zone-midfield-label">MEDIO</div>
          <div class="zone-label zone-defense-label">DEFENSA</div>

          <!-- Marcaciones del campo -->
          <div class="field-line center-line"></div>
          <div class="field-line center-circle"></div>
          <div class="field-line left-penalty-area"></div>
          <div class="field-line right-penalty-area"></div>
          <div class="field-line left-goal-area"></div>
          <div class="field-line right-goal-area"></div>

          <!-- SUBDIVISIONES COMO SLOTS (81 + 1 GK) — V25D47 (C11b) extended
               each slot as a cdkDropList connected to all other slots +
               the bench. The slot's player-chip becomes a cdkDrag so the
               user can drag players between slots. Click is preserved
               (for opening the assignment panel) — CDK suppresses click
               when a real drag occurs. -->
          <div class="field-slots">
            <ng-container *ngFor="let sub of subdivisions; let i = index">
              <!-- Slot de arquero (sector 26) -->
              <ng-container *ngIf="sub.isGoalkeeper">
                <div class="slot slot-gk"
                     cdkDropList
                     [id]="'slot-' + sub.subdivisionId"
                     [cdkDropListConnectedTo]="slotDropListIds.concat([BENCH_DROP_LIST_ID])"
                     [cdkDropListData]="sub"
                     (cdkDropListDropped)="handleSlotDrop($event)"
                     [style.left.%]="sub.left"
                     [style.top.%]="sub.top"
                     [style.width.%]="sub.width"
                     [style.height.%]="sub.height"
                     [class.occupied]="isSlotOccupied(sub)"
                     [class.missing-player]="isMissingPlayer(sub)"
                     [class.eff-green]="getEffectivenessColor(sub.subdivisionId) === 'green'"
                     [class.eff-yellow]="getEffectivenessColor(sub.subdivisionId) === 'yellow'"
                     [class.eff-red]="getEffectivenessColor(sub.subdivisionId) === 'red'"
                     (click)="onSlotClick(sub)">
                  <!-- V25D91-FRONT-F3: slot-id label removida (era debug-only
                       desde V25D47 C11b). Ahora el slot es clickeable sin
                       saturar visualmente el campo con 82 labels SBX-Y. -->
                  <!-- V25D51 (Sprint C13): chip-level effectiveness feedback.
                       eff-good (>=0.9) keeps the default chip style; eff-warning
                       (0.7-0.9) draws an orange border; eff-bad (<0.7) draws a red
                       border. The corner badge (eff-badge) always shows the
                       percentage when formationEffectiveness has data. The
                       pre-existing slot-eff-badge was removed from this slot since
                       the chip-level badge replaces its visual function. -->
                  <div *ngIf="getPlayerInSlot(sub) as player"
                       class="player-chip"
                       cdkDrag
                       [cdkDragData]="player"
                       [class.eff-good]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-good'"
                       [class.eff-warning]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-warning'"
                       [class.eff-bad]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-bad'">
                    <span class="player-chip-name">{{player.name | slice:0:10}}</span>
                    <span *ngIf="getEffectivenessForSlot(sub.subdivisionId) as eff"
                          class="eff-badge"
                          [title]="'Effectiveness: ' + (eff * 100).toFixed(0) + '%'">
                      {{ (eff * 100).toFixed(0) }}%
                    </span>
                  </div>
                  <div *ngIf="isMissingPlayer(sub)" class="missing-indicator">
                    {{getRecommendedRole(sub)}}
                  </div>
                </div>
              </ng-container>

              <!-- Slots normales (3 por sector) -->
              <ng-container *ngIf="!sub.isGoalkeeper">
                <div class="slot"
                     cdkDropList
                     [id]="'slot-' + sub.subdivisionId"
                     [cdkDropListConnectedTo]="slotDropListIds.concat([BENCH_DROP_LIST_ID])"
                     [cdkDropListData]="sub"
                     (cdkDropListDropped)="handleSlotDrop($event)"
                     [style.left.%]="sub.left"
                     [style.top.%]="sub.top"
                     [style.width.%]="sub.width"
                     [style.height.%]="sub.height"
                     [class.occupied]="isSlotOccupied(sub)"
                     [class.recommended]="isRecommendedSlot(sub)"
                     [class.missing-player]="isMissingPlayer(sub)"
                     [class.attack]="sub.zone === 'ATTACK'"
                     [class.midfield]="sub.zone === 'MIDFIELD'"
                     [class.defense]="sub.zone === 'DEFENSE'"
                     [class.eff-green]="getEffectivenessColor(sub.subdivisionId) === 'green'"
                     [class.eff-yellow]="getEffectivenessColor(sub.subdivisionId) === 'yellow'"
                     [class.eff-red]="getEffectivenessColor(sub.subdivisionId) === 'red'"
                     (click)="onSlotClick(sub)">
                  <!-- V25D91-FRONT-F3: slot-id label removida (era debug-only). -->
                  <!-- V25D51 (Sprint C13): chip-level effectiveness feedback.
                       See the slot-gk block above for full details on the
                       eff-good/eff-warning/eff-bad classification and the
                       embedded eff-badge. -->
                  <div *ngIf="getPlayerInSlot(sub) as player"
                       class="player-chip"
                       cdkDrag
                       [cdkDragData]="player"
                       [class.eff-good]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-good'"
                       [class.eff-warning]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-warning'"
                       [class.eff-bad]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-bad'">
                    <span class="player-chip-name">{{player.name | slice:0:10}}</span>
                    <span *ngIf="getEffectivenessForSlot(sub.subdivisionId) as eff"
                          class="eff-badge"
                          [title]="'Effectiveness: ' + (eff * 100).toFixed(0) + '%'">
                      {{ (eff * 100).toFixed(0) }}%
                    </span>
                  </div>
                  <div *ngIf="isMissingPlayer(sub)" class="missing-indicator">
                    {{getRecommendedRole(sub)}}
                  </div>
                </div>
              </ng-container>
            </ng-container>
          </div>

          <!-- Marcadores de jugadores activos — V25D47 (C11b) extended
               with effectiveness color band. The marker is a visual-only
               overlay (the slot's player-chip is the draggable handle).
               V25D91-FRONT-F1: marker now renders as a card showing the
               squad number (1-22) on top, the player name truncated to
               ~10 chars in the middle, and a role badge color-coded by
               family (yellow GK / blue DEF / green MID / red ATT — same
               palette as V25D90 PartidoModal). -->
          <ng-container *ngFor="let player of homePlayers; let i = index">
            <div *ngIf="player.slotId"
                 class="player-marker"
                 [style.left.%]="getSlotCenterX(player.slotId)"
                 [style.top.%]="getSlotCenterY(player.slotId)"
                 [class.gk-player]="player.role === 'GK'"
                 [ngClass]="getMarkerRoleClasses(player.role)"
                 [class.eff-green]="getEffectivenessColor(player.slotId) === 'green'"
                 [class.eff-yellow]="getEffectivenessColor(player.slotId) === 'yellow'"
                 [class.eff-red]="getEffectivenessColor(player.slotId) === 'red'">
              <div class="player-number">{{i + 1}}</div>
              <div class="player-name-label">{{player.name}}</div>
              <div class="player-role-label">{{player.role}}</div>
            </div>
          </ng-container>

          <!-- Spinner de carga -->
          <div *ngIf="loadingFormation" class="field-loading-overlay">
            <div class="field-spinner"></div>
          </div>
        </div>
      </div>

      <!-- V25D47 (Sprint C11b): bench drop list. Drag a bench player onto
           a slot to assign; drag a slot player onto the bench to remove
           from the field. Connected to all slot drop lists via
           [cdkDropListConnectedTo]. Empty state shown when no bench
           players (whole squad is on the field). -->
      <div class="bench-container"
           cdkDropList
           [id]="BENCH_DROP_LIST_ID"
           [cdkDropListConnectedTo]="slotDropListIds"
           [cdkDropListData]="'bench'"
           (cdkDropListDropped)="handleBenchDrop($event)">
        <span class="bench-label">
          Banca ({{ benchPlayers?.length || 0 }})
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

      <!-- Info Footer -->
      <div class="squad-footer">
        <div class="team-info home">
          <strong>{{homeTeamName}}</strong>
          <span>{{homeFormation}}</span>
        </div>
        <div class="field-orientation">
          <span class="orientation-label">↓ ATAQUE</span>
        </div>
        <div class="bench-info">
          <span>Slots: {{occupiedSlots}}/11</span>
        </div>
      </div>

      <!-- Panel de asignación (cuando se hace click en un slot) -->
      <div *ngIf="selectedSlot" class="assignment-panel">
        <div class="assignment-header">
          <span>Slot: {{selectedSlot.subdivisionId}}</span>
          <button mat-icon-button (click)="selectedSlot = null" title="Cerrar">✕</button>
        </div>
        <div class="assignment-content">
          <div *ngIf="getPlayerInSlot(selectedSlot) as player" class="assigned-player">
            <strong>{{player.name}}</strong>
            <span>{{player.position}}</span>
            <button mat-button color="warn" (click)="removePlayerFromSlot(player)">
              Quitar
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

      <!-- Mensaje de error/warning -->
      <div *ngIf="errorMessage" class="error-message">
        <mat-icon>warning</mat-icon>
        <span>{{errorMessage}}</span>
      </div>

      <!-- V24D6U3: server-issued warning (LINEUP_SHORT_HANDED, LINEUP_NO_GOALKEEPER) -->
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

      <!-- Warning por condición del jugador -->
      <div *ngIf="conditionWarning" class="condition-warning-message">
        <mat-icon>info</mat-icon>
        <span>{{conditionWarning}}</span>
      </div>
    </div>
  `,
  styles: [`
    /* Container */
    .squad-editor-container {
      /* V25D92-FRONT-F1: full-width modal. Pre-V25D92 the max-width: 900px cap
         forced the container to 900px even on viewport >= 1280px where the
         cdk-overlay-pane is 1216px (95vw) — leaving 316px of empty space
         to the right of the dark green gradient background. Replaced the
         900px cap with max-width: 95vw so the container matches the pane
         width (consistent with the V25D89.4 PartidoModal full-width fix
         + the dialog.open(width: 95vw) config in squad-management).

         V25D92.6-FRONT F1: bumped 95vw → 98vw to eliminate las "franjas
         blancas" a los lados del modal @ 1600vw viewport. Pre-V25D92.6, el
         modal era 1520px (95% de 1600vw) con 40px de gap a cada lado. Esos
         40px mostraban el body bg del squad-management page (#f5f5f5 light
         gray) a traves del cdk-overlay-pane — Ivan: "no parte blanca a la
         derecha, feo". 98vw = 1568px, gap lateral de 16px cada lado, mucho
         menos visible. Si en pantallas mas anchas (1920, 2560) el gap sigue
         siendo perceptible, se puede bumpear a 100vw sin margin. */
      width: 98vw;
      max-width: 98vw;
      height: 90vh;
      background: linear-gradient(180deg, #1a472a 0%, #2d5a3d 100%);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    /* V25D92.6-FRONT F1: header re-balanceado. Pre-V25D92.6, .squad-header
       era display:flex + justify-content:space-between con 3 items
       (h2, .formation-selector, .header-preview-stack). A 1600vw esto
       producia un VACIO enorme en el medio del header (h2+selector
       compactos a la izquierda, chemistry a la derecha, ~600px de bg
       sin contenido en el medio = "white band" visual).

       V25D92.6 wrap h2 + .formation-selector en un sub-group .squad-header-left
       con flex display (left side cluster), y cambia .squad-header a grid
       2-columnas: 1fr | auto. Asi:
         - columna 1: h2 + selector + chemistry preview (left, fill available)
         - columna 2: X close button (right, intrinsic width)

       Ademas .squad-header-left es flex display con align-items: center +
       gap para que h2 y selector se mantengan juntos lado-a-lado, llenando
       la columna izquierda sin vacio interior.

       V25D92.5-FRONT: header padding 1rem 1.5rem + border-bottom mas visible
       (alpha 0.1 -> 0.25) para divider claro entre header verde oscuro y
       body verde claro. border-radius 12px 12px 0 0 mantiene top corners
       redondeados que conectan con el container border-radius. */
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

    .squad-header h2 {
      margin: 0;
      color: #fff;
      font-size: 1.4rem;
    }

    .formation-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      /* V25D91-FRONT-F4: flex-shrink:0 prevents the chemistry preview row
         (right side, margin-left:auto) from compressing this group. The
         pre-F4 default flex-shrink:1 let the selector squeeze, which caused
         the label "Formacion:" to overlap with the <select> value at certain
         viewport widths where the preview row grew large. */
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
      /* V25D91-FRONT-F4: position:relative + z-index:1 keeps the label
         above the field background. Without it, the label could render
         underneath the field if the layout compressed to near-overlap. */
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
      /* V25D91-FRONT-F4: explicit z-index:2 so the select (and its dropdown
         options when expanded) overlay the header preview row instead of
         the other way around. The 2-stack hierarchy is:
           .formation-selector label/select  → z-index:1
           .formation-selector select        → z-index:2 (above label)
       */
      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }

    .close-btn {
      color: #a0d4a8;
    }

    /* V25D47 (Sprint C11b): wrapper for chemistry-preview-row +
       formation-effectiveness-row. Pushes both to the right of the header
       via margin-left: auto and stacks them vertically with a small gap.

       V25D92.6-FRONT F1: removed margin-left:auto because the parent
       .squad-header now uses CSS grid (1fr | auto) — .header-preview-stack
       sits naturally in the 2nd column (.squad-header-right) without
       needing the auto-margin trick. Keeping margin-right:0.5rem for
       visual breathing room from the close button. */
    .header-preview-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-right: 0.5rem;
      /* V25D91-FRONT-F4: flex-shrink:0 prevents the preview stack from
         compressing itself when the header viewport is narrow. Without it,
         the formation selector (left of it) could be squeezed to the point
         where its label overlapped the <select>. */
      flex-shrink: 0;
    }

    /* V25D45 (Sprint C10): chemistry preview row — projected chemistry of
       in-progress lineup. Sits between the formation selector and the
       close button in the header. */
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

    /* V25D47 (Sprint C11b): chemistry preview weight indicator
       (×85% chip next to the score when formationEffectiveness is
       applied). Subtle, neutral colors — not the high/mid/low bands. */
    .preview-eff-weight {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.05rem 0.35rem;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.85);
      font-style: italic;
    }

    /* V25D47 (Sprint C11b): formation-effectiveness row in the header.
       Shows the back-inferred formation + the teamAverage effectiveness
       with the same high/mid/low color bands as the per-player markers. */
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

    /* V25D47 (Sprint C11b): bench drop list. Horizontal scrollable strip
       of bench players below the field. Empty state shows "(vacía)". */
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
      /* V25D92.5-FRONT: CSS grid auto-fit para 11+ bench players wrapped en
         2-3 filas en vez de una sola linea horizontal con scroll.

         V25D92.6-FRONT F3: bumped minmax(150px → 110px, 1fr). Pre-V25D92.6
         the 150px minimum + max-width:240px cap on .bench-player produced
         "irregular 8+2 o 5+4+2" layouts at 1280-1600vw — Ivan: visual
         inconsistente entre squad sizes. Con minmax(110px, 1fr):
           - 4 bench players @ 1280vw bench-list (1118px): 4 columns × ~280px each
           - 4 bench players @ 1600vw bench-list (1422px): 4 columns × ~355px each
           - 11 bench players wrap a 2 filas cuando no entran en 1 row
         Cada fila tiene cards uniformes, no mas gaps grotescos de 117px
         como antes (4 players × 240px cap + gaps enormes).
         Removi tmb el max-width:240px cap del .bench-player para que 1fr
         pueede estirar libremente el track. */
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.4rem;
      flex: 1;
      padding: 0.2rem 0;
      /* V25D92.6-FRONT F3 fallback: con 11+ bench players y viewport chico,
         auto-fit colapsa tracks vacias, pero los cards pueden stretch
         mas alla del minmax(110px,1fr) si el row solo tiene 1-2 cards.
         El overflow-x permite scroll horizontal en esos edge cases. */
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
      /* V25D92.5-FRONT: bumped min-width 80 -> 130px + max-width 200 -> 240px.
         V25D92.5 introduces bench-list como CSS grid auto-fit, pero
         auto-fit con 1fr haria cards absorber todo el espacio vacio.
         max-width:240px las CAP para que 4 bench cards no se estiren
         grotescamente en viewports wide. Padding 0.35rem 0.6rem ->
         0.5rem 0.7rem da mas espacio lateral para que nombres como
         "Lucas Vazquez" / "Kepa Arrizabalaga" no se corten en la
         ultima letra (problema edge del viewport).

         V25D92.6-FRONT F3: removed max-width:240px cap. Con
         grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) el
         card usa el full track width cuando solo hay 1-4 cards, evitando
         los gaps de 117px entre cards que veia Ivan pre-V25D92.6.
         min-width se mantiene en 110px (matches grid minmax min) para
         que nombres largos no se corten. */
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
      /* V25D91-FRONT-F2 + V25D92-FRONT-F2: allow multi-line wrap with
         tight line-height so full names render without truncation.
         text-align:center for centered wrap.

         V25D92 changed word-break: break-word to
         word-break: normal; overflow-wrap: anywhere:
         - word-break: normal => NO mid-word break by default (preserves
           "Kepa Arrizabalaga" as a unit)
         - overflow-wrap: anywhere => only break a word IF the entire line
           would otherwise overflow the container (graceful fallback for
           extreme names like super-long surnames)

         Mantiene overflow:visible + text-overflow:clip (no ellipsis). */
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

    /* V25D47 (Sprint C11b): per-slot effectiveness badge (small % overlay).
       Only rendered when formationEffectiveness has a per-player entry
       for this subdivisionId. */
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

    /* V25D47 (Sprint C11b): effectiveness color bands applied to slots
       (subtle background tint) + player markers (border ring). */
    .slot.eff-green {
      background: rgba(72, 187, 120, 0.15);
      border-color: rgba(72, 187, 120, 0.5);
    }
    .slot.eff-yellow {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.5);
    }
    .slot.eff-red {
      background: rgba(197, 48, 48, 0.2);
      border-color: rgba(197, 48, 48, 0.6);
    }

    /* CDK drag-drop polish: highlight drop targets on hover/active. */
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

    /* Field Container */
    .field-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      overflow: hidden;
      /* V25D58 (Sprint C18): min-height:0 allows the flex child (.field) to
         honor its aspect-ratio without being constrained by the container's
         intrinsic min-content size. Without this, flex children default
         to min-height:auto and aspect-ratio can be silently overridden in
         tight viewports. */
      min-height: 0;
    }

    /* Field */
    .field {
      position: relative;
      width: 100%;
      /* V25D58 (Sprint C18): cap progresivo via min(cap, 100%). En desktop
         mantiene los 500px del default anterior; en viewports chicos
         permite shrink porque el cap nunca excede el ancho disponible.
         Era max-width: 500px (fijo) lo que dejaba gap visual en modales
         menores a 500px de field-container. */
      max-width: min(500px, 100%);
      /* V25D57 (Sprint C17b): aspect-ratio del campo de futbol.
         Antes height: 100% aplastaba el field a horizontal slab en
         viewports desktop/tablet. height: auto + aspect-ratio 1/1.4
         garantiza que height = 1.4 * width (campo vertical). */
      height: auto;
      /* V25D58 (Sprint C18): max-height: 100% en lugar del cap fijo de 700px
         para que el field NUNCA exceda el alto del field-container (que
         es 90vh del squad-editor-container menos header/footer/bench). */
      max-height: 100%;
      aspect-ratio: 1 / 1.4;
      background: linear-gradient(180deg, #4a8c5c 0%, #5a9c6c 50%, #4a8c5c 100%);
      border: 3px solid #fff;
      border-radius: 4px;
    }

    /* Etiquetas de zonas */
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

    /* Field Markings */
    .field-line {
      position: absolute;
      border: 2px solid rgba(255, 255, 255, 0.7);
    }

    .center-line {
      top: 50%;
      height: 2px;
      width: 100%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.7);
    }

    .center-circle {
      top: 50%;
      left: 50%;
      width: 80px;
      height: 80px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
    }

    .left-penalty-area {
      bottom: 0;
      left: 50%;
      width: 120px;
      height: 60px;
      transform: translateX(-50%);
    }

    .right-penalty-area {
      top: 0;
      left: 50%;
      width: 120px;
      height: 60px;
      transform: translateX(-50%);
    }

    .left-goal-area {
      bottom: 0;
      left: 50%;
      width: 40px;
      height: 20px;
      transform: translateX(-50%);
    }

    .right-goal-area {
      top: 0;
      left: 50%;
      width: 40px;
      height: 20px;
      transform: translateX(-50%);
    }

    /* Slots Layer */
    .field-slots {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 5;
    }

    /* Individual Slot */
    .slot {
      position: absolute;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.2s ease;
      /* V25D51 (Sprint C13): overflow:visible so the chip-level eff-badge
         (positioned at top:-8px, right:-8px against the chip) can extend
         above the slot's top edge without being clipped. The chip's own
         text ellipsis is preserved by wrapping the player name in a
         .player-chip-name span with its own overflow:hidden. */
      overflow: visible;
    }

    .slot:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.6);
      transform: scale(1.02);
      z-index: 10;
    }

    .slot.attack {
      background: rgba(231, 76, 60, 0.1);
      border-color: rgba(231, 76, 60, 0.4);
    }

    .slot.midfield {
      background: rgba(46, 204, 113, 0.1);
      border-color: rgba(46, 204, 113, 0.4);
    }

    .slot.defense {
      background: rgba(52, 152, 219, 0.1);
      border-color: rgba(52, 152, 219, 0.4);
    }

    .slot-gk {
      background: rgba(255, 215, 0, 0.15);
      border-color: rgba(255, 215, 0, 0.6);
      border-width: 2px;
    }

    .slot.recommended {
      box-shadow: inset 0 0 10px rgba(255, 200, 0, 0.3);
    }

    .slot.occupied {
      background: rgba(255, 255, 255, 0.2);
      border-color: #fff;
    }

    /* Slot recomendado sin jugador asignado */
    .slot.missing-player {
      background: rgba(231, 76, 60, 0.25);
      border-color: #e74c3c;
      border-style: dashed;
      border-width: 2px;
    }

    /* Indicador de rol faltante */
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
      background: rgba(0, 0, 0, 0.5);
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 1px;
      /* V25D51 (Sprint C13): position:relative so the corner eff-badge
         (top:-8px, right:-8px) anchors against the chip rather than the
         slot. overflow:visible so the badge can extend above the chip
         without being clipped (the slot's overflow:visible is also required
         for the badge to escape the slot's top edge — see .slot comment).
         The text-overflow:ellipsis behavior moved to .player-chip-name
         (a child span wrapping the player name) so long names still truncate
         with "…" via the child's own overflow:hidden. */
      position: relative;
      overflow: visible;
      /* V25D50-FRONT-F4-DRAG-FIX (Sprint C12): enlarge the cdkDrag handle so
         the bounding box is large enough to be a reliable drop target for
         both mouse and Playwright programmatic drag. Previously max-width
         90 percent plus small font plus thin padding produced ~47x15px chips
         on 11.11%-wide slots - Playwright dragTo failed on edge slots like
         S24-3 (rightmost defense slot at left 88.88 percent, right 100 percent)
         where the chip right edge sits very close to the field right border.
         Filling the slot width plus min-height 20px gives a stable drag area
         for all slots, future-proofing any new edge positions. */
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
    /* V25D51 (Sprint C13): inner span wrapping the player name so the
       text-overflow:ellipsis handling (moved off the chip itself) still
       truncates long names with "…". The chip's overflow:visible would
       otherwise let long names spill outside the chip box. */
    .player-chip .player-chip-name {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    /* V25D51 (Sprint C13): chip-level effectiveness feedback. The class is
       bound from getChipEffectivenessClass() which returns eff-good (default
       look, no border), eff-warning (0.7 <= eff < 0.9, orange border) or
       eff-bad (eff < 0.7, red border). The border uses box-sizing:border-box
       semantics from the chip itself (the chip's padding stays put). */
     /* V25D64 (Sprint C24): eff-good border verde distintivo + alignment de
        eff-warning y eff-bad a 2px para simetría visual con eff-good y con
        substitution-modal (que ya usaba 2px en C23). Pre-C24 warning/bad
        estaban en 1px — ahora las 3 clases son 2px simétricas.
        Mismo patron que V25D63-C23 en substitution-modal.component.css. */
     .player-chip.eff-warning {
       border: 2px solid #f59e0b !important; /* amber-500 */
       box-sizing: border-box;
     }
     .player-chip.eff-bad {
       border: 2px solid #dc2626 !important; /* red-600 */
       box-sizing: border-box;
     }
     .player-chip.eff-good {
       border: 2px solid #10b981 !important; /* emerald-500 */
       box-sizing: border-box;
     }
    /* V25D51 (Sprint C13): corner badge anchored to the chip's top-right.
       Positioned absolute against the chip (which is position:relative),
       extending 8px above and 8px left of the chip's top-right corner.
       Renders only when formationEffectiveness has a value for the slot —
       pre-V25D51 lineups (effectiveness=null) skip the badge entirely. */
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

    /* Player Marker (number + name + role badge sobre el campo).
       V25D91-FRONT-F1: el marker pasó de círculo 32x32 a card 70x56
       que muestra squad-number (1-22) arriba, nombre truncado en el
       medio, y role badge color-codeado por familia. Mismo scheme que
       V25D90 PartidoModal (yellow GK / blue DEF / green MID / red ATT). */
    .player-marker {
      position: absolute;
      width: 70px;
      height: 56px;
      transform: translate(-50%, -50%);
      z-index: 20;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }

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
      /* GK gets an amber tint to complement the role label below. */
      background: rgba(245, 158, 11, 0.9);
      border-color: rgba(245, 158, 11, 1);
    }

    .player-marker .player-name-label {
      /* V25D92-FRONT-F2: allow wrap mid-line so nombres completos no se corten.
         Cambio white-space:nowrap → normal, overflow:hidden → visible,
         text-overflow:ellipsis → clip. Mantiene max-width:70px (mismo que
         marker card) y font-size:0.6rem.

         word-break:normal + overflow-wrap:anywhere:
         - normal → no mid-word break por default (preserva el nombre completo)
         - anywhere → solo rompe si la palabra no entra en el container
           (caso nombres muy largos como "Arrizabalaga" en un marker de 70px)

         Como el marker es de 70x56px y el name-label tiene max-width:70px,
         generalmente caben nombres de hasta ~12-14 chars en una linea; los
         mas largos hacen wrap a 2 lineas sin romper mid-word. */
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
      font-size: 0.6rem;
      font-weight: 700;
      color: #fff;
      padding: 1px 5px;
      border-radius: 3px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      line-height: 1.2;
    }

    /* V25D91-FRONT-F1: role color scheme — yellow GK, blue DEF,
       green MID, red ATT. Same palette as V25D90 PartidoModal. */
    .player-marker.color-gk .player-role-label {
      background: #f59e0b;  /* amber-500 */
    }
    .player-marker.color-def .player-role-label {
      background: #3b82f6;  /* blue-500 */
    }
    .player-marker.color-mid .player-role-label {
      background: #10b981;  /* emerald-500 */
    }
    .player-marker.color-att .player-role-label {
      background: #ef4444;  /* red-500 */
    }

    /* V25D91-FRONT-F1: effectiveness glow now wraps the entire marker
       (not just the inner number circle as in pre-V25D91). drop-shadow
       follows the bounding box of all visible children so the ring
       hugs the card more naturally. The default drop-shadow from
       .player-marker is preserved as the second filter. */
    .player-marker.eff-green {
      filter: drop-shadow(0 0 4px #48bb78) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }
    .player-marker.eff-yellow {
      filter: drop-shadow(0 0 4px #eab308) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }
    .player-marker.eff-red {
      filter: drop-shadow(0 0 4px #c53030) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    }

    /* Loading overlay for field */
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

    /* Assignment Panel */
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

    /* Footer */
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

    /* Error/Warning Message */
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

    /* Condition Warning Message */
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

    /* V24D6U3: server-issued warning banner (LINEUP_SHORT_HANDED, etc.) */
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

    /* Responsive — V25D56 (Sprint C17)
       Progressive breakpoints: mobile (<=600px), tablet (601-1024px),
       desktop (default >=1025px). The previous single breakpoint at
       768px hid the .player-chip via display:none on mobile, which
       Iván flagged as a visual regression ("falta alguien en ese
       espacio"). The chip now stays visible at all viewports, with
       font-size/padding scaled to fit narrow slots. */
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
        /* V25D58 (Sprint C18): cap 380px para mobile. min(380,100%) shrinkea
           a 360px en viewports de 375-414px donde el modal mide 98vw. */
        max-width: min(380px, 100%);
        /* V25D57 (Sprint C17b): aspect-ratio del campo en mobile. Antes
           max-height:50vh sobreescribia el aspect-ratio y dejaba el field
           aplastado. Ahora max-height hereda del default (100% del
           field-container). */
        aspect-ratio: 1 / 1.4;
        height: auto;
      }

      /* Mobile chips keep visible — shrink font-size + padding so they
         fit narrow slots without overflowing. */
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
        /* V25D57 (Sprint C17b): aspect-ratio del campo en tablet.
           Antes no tenia aspect-ratio y quedaba horizontal slab. */
        aspect-ratio: 1 / 1.4;
        height: auto;
        /* V25D58 (Sprint C18): cap 450px para tablet. min(450,100%) shrinkea
           a 360px en viewports de 600-700px donde el modal mide 90vw. */
        max-width: min(450px, 100%);
      }

      .player-chip {
        font-size: 0.45rem;
      }

      .squad-header h2 {
        font-size: 1.2rem;
      }
    }

    @media (min-width: 1600px) {
      /* V25D92.5-FRONT F1 v2: removed max-width: 1200px cap on
         .squad-editor-container. Pre-V25D92.5 the cap limited container
         to 1200px even though the CDK overlay pane was 1520px (95vw of
         1600vw viewport) — leaving 320px of empty dark green background
         (the .squad-editor-container extends to its background-image
         gradient) so the field looked floated to the left of a wider
         pane. With the cap removed, container = 98vw = 1568px = pane,
         eliminating the visual gap (gap reduced from 80px to 32px total
         at 1600vw). */
      .squad-editor-container {
        max-width: 98vw;
      }

      .field {
        /* V25D58 (Sprint C18): cap 600px para large desktop. min(600,100%)
           mantiene 600px en viewports de 1600-1900px y shrinkea a 500px
           en viewports borderline 1440-1599px si el modal mide 1200px. */
        max-width: min(600px, 100%);
      }
    }
  `]
})
export class SquadEditorModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /** Emite cuando cambia la formación - con los players para actualizar el padre directamente */
  @Output() formationChanged = new EventEmitter<{formation: string, players: any[]}>();

  /** Subject para esperar confirmación de que la predicción se refresh */
  private formationChangeCompleteSubject = new Subject<void>();

  /** Output que expone el subject para que el padre pueda completar */
  @Output() formationChangeComplete = new EventEmitter<Subject<void>>();

  /** Slots del campo (observable) */
  subdivisions$ = new BehaviorSubject<FieldSubdivisionDTO[]>([]);

  /** Jugadores en el campo (observable) */
  homePlayers$ = new BehaviorSubject<PlayerOnFieldDto[]>([]);

  /** Jugadores en la banca (observable) */
  benchPlayers$ = new BehaviorSubject<PlayerOnFieldDto[]>([]);

  /** Slot seleccionado para asignar */
  selectedSlot: FieldSubdivisionDTO | null = null;

  /** Jugador seleccionado para asignar al slot */
  selectedPlayerToAssign: string = '';

  /** Mensaje de error (observable) */
  errorMessage$ = new BehaviorSubject<string>('');

  /** Mensaje de warning por condición del jugador */
  conditionWarning$ = new BehaviorSubject<string>('');

  /** V24D6U3: server-issued warning (LINEUP_SHORT_HANDED, LINEUP_NO_GOALKEEPER) */
  lineupWarning$ = new BehaviorSubject<LineupWarningDTO | null>(null);

  /** Nombre del equipo */
  homeTeamName = 'Mi Equipo';

  /** Formación actual (observable) */
  homeFormation$ = new BehaviorSubject<string>('4-4-2');

  /** Formación seleccionada */
  selectedFormation = '4-4-2';

  /**
   * V25D55-C16 P0.1: source of truth movido a
   * {@code shared/constants/formations.ts}. Antes eran solo las 7 originales
   * — faltaban las 5 nuevas de V25D54-C15 (3-5-2-CDM, 5-4-1, 3-4-1-2,
   * 4-2-2-2, 4-3-3-1). Ahora el dropdown muestra las 12 formations que el
   * back-end reconoce.
   */
  formations: readonly string[] = ALL_FORMATIONS;

  /** Cache de posiciones de formación */
  private formationPositions: { [key: string]: FormationPositionDTO[] } = {};

  /** Mapping slotId -> player */
  private slotPlayerMap: { [slotId: string]: PlayerOnFieldDto } = {};

  /** Loading state for formation changes */
  loadingFormation$ = new BehaviorSubject<boolean>(false);

  /** Flag para evitar que onFormationChange se dispare durante carga inicial */
  private isInitializing = true;
  isFormationChanging = false;

  /**
   * V25D45 (Sprint C10): chemistry preview state.
   *
   * <p>{@code previewTrigger$} emits the current home-playerIds whenever
   * the user assigns/removes a player. The pipeline (debounceTime 300ms +
   * distinctUntilChanged) collapses rapid edits into one backend call and
   * avoids duplicate calls if the lineup didn't actually change.
   *
   * <p>{@code previewedChemistry$} holds the last successful preview response,
   * or {@code null} while waiting / after a failure. The template binds via
   * async pipe and shows the score + Δ vs {@code currentChemistryScore}.
   *
   * <p>{@code currentChemistryScore} is the chemistry score of the LAST
   * PERSISTED lineup (from the initial {@code /career/lineup/current}
   * response). It's the baseline against which the preview's delta is
   * computed. {@code null} means "no baseline yet" (cold start / first
   * preview before any /current response landed).
   *
   * <p>{@code previewError} flips to true when the last preview call failed.
   * The template uses this to swap the "Proyectando chemistry..." placeholder
   * for a "Chemistry preview unavailable" warning. Resets on the next
   * successful call.
   */
  private previewTrigger$ = new Subject<string[]>();
  previewedChemistry$ = new BehaviorSubject<ChemistryDetailDTO | null>(null);
  currentChemistryScore: number | null = null;
  previewError = false;

  /**
   * V25D47 (Sprint C11b): formation effectiveness snapshot from the most
   * recent {@code /career/lineup/current} response. Nullable for backward
   * compat with lineups created before V25D47 — when null, the formation
   * effectiveness row in the header and the per-player color codes are
   * suppressed (the modal still works in click-only mode).
   *
   * <p>Updated ONLY on /current load — NOT on every drag-drop. Drag-drop
   * calls saveLineup() which persists the new slots and (asynchronously)
   * the back recomputes formationEffectiveness. To avoid an extra round
   * trip per drop, we let the user re-open the modal (or the parent's
   * /current refresh) to pick up the latest snapshot. The chemistry preview
   * already gives instant feedback; per-drag formationEffectiveness update
   * is a future optimization (C12).
   */
  formationEffectiveness$ = new BehaviorSubject<FormationEffectivenessDTO | null>(null);

  /** Getters para compatibilidad con template (sin async pipe) */
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

  /**
   * V25D45 (Sprint C10): wire the chemistry preview pipeline.
   *
   * <p>Pipeline:
   * <pre>
   *   previewTrigger$  (Subject&lt;string[]&gt;)
   *     | debounceTime(300)            // collapse rapid edits
   *     | distinctUntilChanged(...)     // skip if lineup didn't change
   *     | switchMap(ids =&gt; previewChemistry(ids))
   *     | catchError(err =&gt; of(null))  // backend failure → null
   *     | subscribe(detail =&gt; previewedChemistry$.next(detail))
   * </pre>
   *
   * <p>Triggered from {@code assignPlayerToSlot} and {@code removePlayerFromSlot}
   * after the local lineup state is updated. {@code previewedChemistry$} feeds
   * the header preview row in the template.
   *
   * <p>Why 300ms debounce: typical user drag-and-drop emits 5-10 events
   * per second; without debounce, each event would trigger a backend
   * roundtrip. 300ms is the sweet spot — fast enough that the preview
   * feels live, slow enough to coalesce a drag gesture into 1 call.
   *
   * <p>Why distinctUntilChanged on the joined string: avoids duplicate
   * calls when the trigger fires but the lineup ids are identical
   * (e.g., on slot click that doesn't actually change anything).
   */
  private setupChemistryPreviewPipeline(): void {
    this.previewTrigger$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
        switchMap(ids => {
          // Need exactly 11 to preview — earlier/later states emit null
          // (template shows "Proyectando chemistry..." placeholder).
          if (!ids || ids.length !== 11) {
            this.previewError = false;
            return of(null);
          }
          return this.chemistryPreview.previewChemistry(ids).pipe(
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
        this.previewError = false;
        this.previewedChemistry$.next(detail);
      });
  }

  /**
   * V25D45 (Sprint C10): trigger a chemistry preview for the current home lineup.
   * Called from {@code assignPlayerToSlot} and {@code removePlayerFromSlot}
   * after the local state mutation.
   *
   * <p>The pipeline (see {@link setupChemistryPreviewPipeline}) coalesces
   * rapid calls and deduplicates against the last lineup snapshot. This
   * method is fire-and-forget — it doesn't await the backend response.
   */
  private triggerChemistryPreview(): void {
    const ids = this.homePlayers.map(p => p.playerId);
    this.previewTrigger$.next(ids);
  }

  /** Carga todas las subdivisiones desde el backend */
  private loadSubdivisions(): void {
    this.http.get<FieldSubdivisionDTO[]>(`${environment.apiUrl}/editor/subdivisions`).subscribe({
      next: (subs) => {
        // Usar setTimeout para deferir el cambio y evitar NG0100
        setTimeout(() => {
          this.subdivisions$.next(subs);
          this.cdr.detectChanges();
          this.loadFormationPositions().then(() => {
            this.loadSquadFromBackend();
          });
        }, 0);
      },
      error: (err) => {
        console.error('[SQUAD-EDITOR] Error loading subdivisions:', err);
        this.errorMessage$.next('Error al cargar las subdivisiones del campo');
        this.cdr.detectChanges();
      }
    });
  }

  /** Carga las posiciones de las formaciones */
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

  /**
 * Carga la alineación desde el backend.
 *
 * <p>MVP1-lineup-cancha-1: si el response trae {@code slots[]} persistidos,
 * se usan para restaurar las asignaciones exactas (playerId → subdivisionId).
 * Si {@code slots} viene vacío o ausente, se aplica el fallback de role-match
 * (backward compat con lineups previos al sprint).
   */
  private loadSquadFromBackend(): void {
    this.http.get<any>(`${environment.apiUrl}/career/lineup/current`).subscribe({
      next: (response) => {
        // V25D45 (Sprint C10): capture the persisted chemistry score as the
        // baseline for the preview's delta computation. The preview shows
        // (previewScore - currentChemistryScore) so the manager sees the
        // impact of their edits vs the saved lineup.
        this.currentChemistryScore = (typeof response?.chemistryScore === 'number')
            ? response.chemistryScore
            : null;

        // V25D47 (Sprint C11b): capture formationEffectiveness from the
        // back. Nullable for legacy lineups (pre-V25D47) — when null the
        // modal hides the effectiveness row and the chemistry preview is
        // shown unweighted (no teamAverage multiplier).
        this.formationEffectiveness$.next(
          (response?.formationEffectiveness && typeof response.formationEffectiveness.teamAverage === 'number')
            ? response.formationEffectiveness
            : null
        );

        // V25D75-C40 B4: use the parent's currentFormation first (passed
        // via MAT_DIALOG_DATA) so the dialog opens with the SAME state the
        // parent shows. Was: response.formation || this.selectedFormation
        // || '4-4-2' — fell back to 4-4-2 when response.formation was null
        // and parent had e.g. 5-4-1, causing the dialog/parent desync.
        const formationName = response?.formation
          || this.data?.currentFormation
          || this.selectedFormation
          || '4-4-2';
        const positions = this.formationPositions[formationName] || [];

        // MVP1-lineup-cancha-1.5 FIX (F3): setear selectedFormation ANTES del
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

        // V25D66-C26 (Sprint C26): si el caller (squad-management) pasó el
        // squad completo vía dialog data, lo usamos como source de bench en
        // lugar de response.players (que solo trae los 11 del LINEUP). Si
        // data.squad está vacío o ausente, fallback al comportamiento legacy
        // (bench = filter !slotId sobre lineup, que da 0 cuando lineup = 11).
        const squadSource: any[] = (this.data?.squad && this.data.squad.length > 0)
          ? this.data.squad.map((sp: SessionPlayer) => ({
              // SessionPlayer.sessionPlayerId → lineup player playerId.
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

        // Convertir jugadores del response
        const allPlayers: PlayerOnFieldDto[] = squadSource.map((p: any) => ({
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

        // MVP1-lineup-cancha-1: si el back trae slots persistidos, restaurar asignaciones exactas.
        const persistedSlots: Array<{ playerId: string; subdivisionId: string }> = response?.slots ?? [];
        const usedSubdivisionIds = new Set<string>();
        if (persistedSlots.length > 0) {
          for (const slot of persistedSlots) {
            const player = playerById.get(slot.playerId);
            if (!player) continue;
            if (!slot.subdivisionId) continue;
            // Si dos slots apuntan al mismo subdivisionId, conservar solo el primero.
            if (usedSubdivisionIds.has(slot.subdivisionId)) continue;
            player.slotId = slot.subdivisionId;
            this.slotPlayerMap[slot.subdivisionId] = player;
            usedSubdivisionIds.add(slot.subdivisionId);
          }
        }

        // Para jugadores sin slot asignado (o si el back no devolvió slots),
        // aplicar el fallback de role-match contra la formación activa.
        const assignedPositions = new Set<number>();
        for (const player of allPlayers) {
          if (player.slotId) {
            // Ya tiene slot del path MVP1 — marcar la posición de formación como usada.
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

        this.homePlayers$.next(allPlayers.filter(p => p.slotId));
        this.benchPlayers$.next(allPlayers.filter(p => !p.slotId));

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

  /** Slots ocupados */
  get occupiedSlots(): number {
    return this.homePlayers.length;
  }

  /** Verifica si un slot está ocupado */
  isSlotOccupied(sub: FieldSubdivisionDTO): boolean {
    return !!this.slotPlayerMap[sub.subdivisionId];
  }

  /** Obtiene el jugador en un slot */
  getPlayerInSlot(sub: FieldSubdivisionDTO): PlayerOnFieldDto | undefined {
    return this.slotPlayerMap[sub.subdivisionId];
  }

  /** Verifica si un slot es recomendado para la formación actual */
  isRecommendedSlot(sub: FieldSubdivisionDTO): boolean {
    const positions = this.formationPositions[this.selectedFormation];
    if (!positions) return false;

    return positions.some(pos => pos.subdivisionId === sub.subdivisionId);
  }

  /** Verifica si falta jugador en un slot recomendado */
  isMissingPlayer(sub: FieldSubdivisionDTO): boolean {
    return this.isRecommendedSlot(sub) && !this.isSlotOccupied(sub);
  }

  /** Obtiene el rol del jugador recomendado para un slot */
  getRecommendedRole(sub: FieldSubdivisionDTO): string {
    const positions = this.formationPositions[this.selectedFormation];
    if (!positions) return '';
    const pos = positions.find(p => p.subdivisionId === sub.subdivisionId);
    return pos?.role || '';
  }

  /** Obtiene el centro X de un slot por su ID */
  getSlotCenterX(slotId: string): number {
    const sub = this.subdivisions.find(s => s.subdivisionId === slotId);
    if (!sub) return 50;
    // Centro = left + width/2
    return sub.left + (sub.width / 2);
  }

  /** Obtiene el centro Y de un slot por su ID */
  getSlotCenterY(slotId: string): number {
    const sub = this.subdivisions.find(s => s.subdivisionId === slotId);
    if (!sub) return 50;
    // Centro = top + height/2
    return sub.top + (sub.height / 2);
  }

  /** Click en un slot */
  onSlotClick(sub: FieldSubdivisionDTO): void {
    this.selectedSlot = sub;
    this.selectedPlayerToAssign = '';
    this.cdr.detectChanges();
  }

  /** Asigna un jugador al slot seleccionado */
  assignPlayerToSlot(): void {
    if (!this.selectedSlot || !this.selectedPlayerToAssign) return;

    const player = this.benchPlayers.find(p => p.playerId === this.selectedPlayerToAssign);
    if (!player) return;

    // Mostrar warning si el jugador tiene condición de riesgo
    this.showConditionWarning(player);

    // Quitar jugador de su slot anterior si tenía uno
    if (player.slotId) {
      delete this.slotPlayerMap[player.slotId];
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
    // V25D45 (Sprint C10): trigger chemistry preview (debounced in pipeline).
    this.triggerChemistryPreview();
    this.cdr.detectChanges();
  }

  /** Quita un jugador de su slot */
  removePlayerFromSlot(player: PlayerOnFieldDto): void {
    if (!player.slotId) return;

    delete this.slotPlayerMap[player.slotId];
    player.slotId = '';

    const newHome = this.homePlayers$.value.filter(p => p.playerId !== player.playerId);
    this.homePlayers$.next(newHome);
    this.benchPlayers$.next([...this.benchPlayers$.value, player]);

    this.selectedSlot = null;
    this.saveLineup();
    // V25D45 (Sprint C10): trigger chemistry preview (debounced in pipeline).
    this.triggerChemistryPreview();
    this.cdr.detectChanges();
  }

  // ============================================================================
  // V25D47 (Sprint C11b): CDK drag-drop handlers + formationEffectiveness helpers
  // ============================================================================

  /**
   * List of subdivisionIds currently rendered as {@code cdkDropList}s.
   * Passed to {@code [cdkDropListConnectedTo]} on every slot + the bench so
   * CDK knows the full graph of drop targets. Recomputed when subdivisions
   * load (the list is static once the field is rendered).
   */
  get slotDropListIds(): string[] {
    return (this.subdivisions || []).map(s => 'slot-' + s.subdivisionId);
  }

  /** Constant id for the bench drop list (separate from per-slot ids). */
  readonly BENCH_DROP_LIST_ID = 'bench-list';

  /** Slot id (without 'slot-' prefix) → player currently in that slot. */
  get playerInTargetSlot(): { [subdivisionId: string]: PlayerOnFieldDto } {
    return this.slotPlayerMap;
  }

  /**
   * V25D47 (Sprint C11b): handle a CDK drop on a slot drop list.
   *
   * <p>Source can be either another slot ({@code slot-XYZ}) or the bench
   * ({@code bench-list}). Target is the slot whose id is encoded in
   * {@code event.container.id}.
   *
   * <p>Behavior matrix:
   * <ul>
   *   <li>Same slot → no-op (avoid feedback loops on cdkDragEnd).</li>
   *   <li>Source=slot-X, target=slot-Y, target empty → move X→Y.</li>
   *   <li>Source=slot-X, target=slot-Y, target occupied → SWAP X↔Y.</li>
   *   <li>Source=slot-X, target=bench → move X→bench (remove from field).</li>
   *   <li>Source=bench, target=slot-Y, target empty → move bench→Y.</li>
   *   <li>Source=bench, target=slot-Y, target occupied → move bench→Y AND
   *       evict the previous occupant to the bench.</li>
   * </ul>
   *
   * <p>After any successful drop, persists via {@link saveLineup} and
   * triggers a chemistry preview (debounced 300ms via the C10 pipeline).
   * Per the C11b task spec we deliberately do NOT call the back for a fresh
   * formationEffectiveness on every drop — that would double the backend
   * load. The user re-opens the modal (or parent refreshes /current) to see
   * the latest snapshot.
   */
  handleSlotDrop(event: CdkDragDrop<any>): void {
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player) { return; }

    const targetSubdivisionId = this.subdivisionIdFromDropListId(event.container.id);
    const sourceDropListId = event.previousContainer.id;
    if (!targetSubdivisionId) { return; }

    // No-op: source == target (e.g., cdkDragEnd fired on the same list).
    if (sourceDropListId === 'slot-' + targetSubdivisionId) {
      return;
    }

    const sourceSubdivisionId =
      sourceDropListId === this.BENCH_DROP_LIST_ID
        ? null
        : this.subdivisionIdFromDropListId(sourceDropListId);

    const occupant = this.slotPlayerMap[targetSubdivisionId];

    // Step 1: free the source slot (if from a slot).
    if (sourceSubdivisionId) {
      delete this.slotPlayerMap[sourceSubdivisionId];
    }

    // Step 2: place player into target.
    player.slotId = targetSubdivisionId;
    this.slotPlayerMap[targetSubdivisionId] = player;

    // Step 3: handle the displaced occupant.
    if (occupant && occupant.playerId !== player.playerId) {
      if (sourceSubdivisionId) {
        // SWAP: push the occupant back into the source slot.
        occupant.slotId = sourceSubdivisionId;
        this.slotPlayerMap[sourceSubdivisionId] = occupant;
      } else {
        // Source was bench → evict the occupant to the bench.
        occupant.slotId = '';
        this.benchPlayers$.next([...this.benchPlayers$.value, occupant]);
        this.homePlayers$.next(
          this.homePlayers$.value.filter(p => p.playerId !== occupant.playerId)
        );
      }
    }

    // Step 4: handle the source-side list updates.
    if (!sourceSubdivisionId) {
      // Came from bench → remove from bench, add to home (if not already).
      this.benchPlayers$.next(
        this.benchPlayers$.value.filter(p => p.playerId !== player.playerId)
      );
      if (!this.homePlayers$.value.some(p => p.playerId === player.playerId)) {
        this.homePlayers$.next([...this.homePlayers$.value, player]);
      }
    }

    // Step 5: persist + preview. saveLineup() will POST manual-select with
    // the updated slot map; triggerChemistryPreview() fires the debounced
    // POST /preview-chemistry for the new lineup.
    this.saveLineup();
    this.triggerChemistryPreview();
    this.cdr.detectChanges();
  }

  /**
   * V25D47 (Sprint C11b): handle a CDK drop onto the bench drop list.
   * Only valid source → target: slot → bench (move to bench).
   * Dragging bench → bench is a no-op; dragging slot → bench removes the
   * player from the field (equivalent to {@link removePlayerFromSlot}).
   */
  handleBenchDrop(event: CdkDragDrop<any>): void {
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player || !player.slotId) { return; }
    if (event.previousContainer.id === this.BENCH_DROP_LIST_ID) { return; }

    delete this.slotPlayerMap[player.slotId];
    player.slotId = '';

    this.homePlayers$.next(
      this.homePlayers$.value.filter(p => p.playerId !== player.playerId)
    );
    if (!this.benchPlayers$.value.some(p => p.playerId === player.playerId)) {
      this.benchPlayers$.next([...this.benchPlayers$.value, player]);
    }

    this.saveLineup();
    this.triggerChemistryPreview();
    this.cdr.detectChanges();
  }

  /** Helper: strip the {@code slot-} prefix from a CDK drop list id. */
  private subdivisionIdFromDropListId(dropListId: string): string | null {
    if (!dropListId || !dropListId.startsWith('slot-')) { return null; }
    return dropListId.substring('slot-'.length);
  }

  /**
   * V25D47 (Sprint C11b): look up the effectiveness for a given subdivisionId.
   * Returns {@code null} when formationEffectiveness is missing (legacy
   * pre-V25D47 response) or the slot is not in the perPlayerEffectiveness map
   * (shouldn't happen for valid slots, but defensive).
   */
  getEffectivenessForSlot(subdivisionId: string | undefined): number | null {
    if (!subdivisionId) { return null; }
    const fe = this.formationEffectiveness$.value;
    if (!fe) { return null; }
    const v = fe.perPlayerEffectiveness?.[subdivisionId];
    return typeof v === 'number' ? v : null;
  }

  /**
   * V25D47 (Sprint C11b): classify the effectiveness for a slot into a UI
   * color band (green/yellow/red). Returns null when the slot has no
   * effectiveness data (used to skip the class binding).
   */
  getEffectivenessColor(subdivisionId: string | undefined): 'green' | 'yellow' | 'red' | null {
    const v = this.getEffectivenessForSlot(subdivisionId);
    if (v === null) { return null; }
    return effectivenessColor(v);
  }

  /**
   * V25D51 (Sprint C13): classify the effectiveness for a slot into a
   * chip-level feedback class (eff-good / eff-warning / eff-bad).
   *
   * <p>Thresholds differ from {@link getEffectivenessColor} (which uses
   * {@code 0.85 / 0.5} for the slot's green/yellow/red bands) because the
   * chip is the user's per-player feedback surface, where the action
   * thresholds feel different: a 0.85 effectivity is good (slot tier),
   * but we want to start warning at 0.9 (chip tier) and flag bad at 0.7
   * so the user notices off-position placement before it costs them.
   *
   * <ul>
   *   <li>{@code eff >= 0.9}              → {@code eff-good} (default, no border)</li>
   *   <li>{@code 0.7 <= eff < 0.9}       → {@code eff-warning} (orange border)</li>
   *   <li>{@code eff < 0.7}              → {@code eff-bad} (red border)</li>
   * </ul>
   *
   * <p>Returns {@code null} when the slot has no effectiveness data
   * (legacy pre-V25D47 response) so the class binding is skipped.
   */
  getChipEffectivenessClass(subdivisionId: string | undefined): 'eff-good' | 'eff-warning' | 'eff-bad' | null {
    const v = this.getEffectivenessForSlot(subdivisionId);
    if (v === null) { return null; }
    if (v >= 0.9) { return 'eff-good'; }
    if (v >= 0.7) { return 'eff-warning'; }
    return 'eff-bad';
  }

  /**
   * V25D91-FRONT-F1: classify a player's role into a color family for the
   * marker's role badge. Returns an {@code ngClass} map with one of
   * {@code color-gk} / {@code color-def} / {@code color-mid} / {@code color-att}
   * set to {@code true}. The map keys drive the CSS background-color of the
   * role-label badge in the player-marker.
   *
   * <p>Palette (mirrors V25D90 PartidoModal):
   * <ul>
   *   <li>GK → color-gk (yellow)</li>
   *   <li>CB / LB / RB / DEF → color-def (blue)</li>
   *   <li>CM / CDM / CAM / LM / RM / MID → color-mid (green)</li>
   *   <li>ST / LW / RW / CF / ATT → color-att (red)</li>
   * </ul>
   *
   * <p>Returns an empty object for unknown roles so the role badge falls
   * back to the default (no background) — same defensive pattern as the
   * other classifiers (effectivenessColor etc.).
   */
  getMarkerRoleClasses(role: string | undefined): { [klass: string]: boolean } {
    if (!role) { return {}; }
    return {
      'color-gk':  role === 'GK',
      'color-def': ['CB', 'LB', 'RB', 'DEF'].includes(role),
      'color-mid': ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'].includes(role),
      'color-att': ['ST', 'LW', 'RW', 'CF', 'ATT'].includes(role)
    };
  }

  /**
   * V25D91.6-FRONT F6 P0: role-match entre jugador y slot de formacion.
   *
   * <p>Antes: comparacion exacta `player.position === posRole`. Esto fallaba
   * porque el back devuelve posiciones con roles GENERICOS (GK/DEF/MID/ATT/
   * WINGER — formato SessionPlayer desde /career/players/squad), pero las
   * formations desde /editor/formations tienen roles ESPECIFICOS
   * (GK/CB/LB/RB/CM/CDM/CAM/LM/RM/ST/LW/RW/CF/WINGER). El unico match era GK.
   *
   * <p>Resultado: solo 1 marker (el GK) se renderizaba tras cambiar formacion.
   * El header SÍ cambiaba (mi fix V25D91.5 ngModelChange funciona), pero
   * los markers quedaban atascados en el slot GK.
   *
   * <p>Fix: comparar por FAMILIA. GK solo matchea GK. Cualquier rol de la
   * familia DEF matchea cualquier slot DEF (y vice versa). Misma logica
   * para MID y ATT. WINGER entra en ATT porque es un atacante lateral.
   *
   * <p>Si ambos roles son desconocidos, fallback a comparacion exacta (no
   * matchea) — comportamiento legacy preservado para roles exoticos.
   */
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

  /**
   * V25D91.6-FRONT F6 P0: clasifica un rol a su familia. Devuelve null si
   * el rol no pertenece a ninguna familia conocida (backward compat con
   * roles exoticos legacy que no matchean contra formations).
   *
   * <p>Familias:
   * <ul>
   *   <li>GK: GK</li>
   *   <li>DEF: CB, LB, RB, LWB, RWB, DEF</li>
   *   <li>MID: CM, CDM, CAM, LM, RM, MID</li>
   *   <li>ATT: ST, LW, RW, CF, ATT, WINGER</li>
   * </ul>
   */
  private getRoleFamily(role: string): 'GK' | 'DEF' | 'MID' | 'ATT' | null {
    if (role === 'GK') return 'GK';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(role)) return 'DEF';
    if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'].includes(role)) return 'MID';
    if (['ST', 'LW', 'RW', 'CF', 'ATT', 'WINGER'].includes(role)) return 'ATT';
    return null;
  }

  /**
   * V25D47 (Sprint C11b): compute the displayed chemistry score by weighting
   * the preview's raw score with the formationEffectiveness teamAverage.
   *
   * <p>{@code displayed = rawScore * teamAverage} (rounded to int).
   * When formationEffectiveness is missing (legacy pre-V25D47), the raw
   * score is returned unchanged. When the preview hasn't fired yet
   * (previewedChemistry$ === null), returns null so the template can
   * keep the existing "Proyectando chemistry..." placeholder.
   *
   * <p>Why weight this way: a 91 chemistry in a poorly-aligned formation
   * (teamAverage=0.85) effectively behaves as a 91*0.85 = 77 chemistry in
   * the V24 engine (per C11a's per-player effectiveness weighting). The
   * preview shows this composed number so the manager sees the real
   * projected impact of the tactical arrangement, not just the chemistry
   * score alone.
   */
  getDisplayedChemistryScore(): number | null {
    const raw = this.previewedChemistry$.value;
    if (!raw) { return null; }
    const fe = this.formationEffectiveness$.value;
    if (!fe || typeof fe.teamAverage !== 'number') {
      return raw.score;
    }
    return Math.round(raw.score * fe.teamAverage);
  }

  /** Convenience: get the teamAverage for template (or null). */
  get teamAverage(): number | null {
    const fe = this.formationEffectiveness$.value;
    return fe && typeof fe.teamAverage === 'number' ? fe.teamAverage : null;
  }

  /** Convenience: get the inferredFormation for template (or null). */
  get inferredFormation(): string | null {
    const fe = this.formationEffectiveness$.value;
    return fe?.inferredFormation ?? null;
  }

  /**
   * Cambia la formación cuando el usuario selecciona una opción del `<select>`.
   *
   * <p>V25D91.5-FRONT F6 fix: este handler se invoca desde `(ngModelChange)` (no
   * `(change)`), lo que garantiza que Angular ya actualizó {@code this.selectedFormation}
   * cuando el handler corre. Antes con `(change)` el orden era incierto y a veces
   * leía el valor VIEJO, mandando un HTTP call con la formación anterior → no-op
   * visual.
   *
   * <p>El parámetro {@code newFormation} viene del `(ngModelChange)`; si por
   * alguna razón llega undefined (e.g. una llamada programática sin arg), fallback
   * a {@code this.selectedFormation}.
   *
   * <p>Antes el flag {@code isFormationChanging} solo se reseteaba cuando
   * {@code formationChangeCompleteSubject.next()} se llamaba desde el padre
   * (vía `(formationChangeComplete)` Output). Pero el padre
   * {@code squad-management.component.ts} nunca escucha ese Output, así que
   * el select quedaba permanentemente disabled después del primer cambio. Ahora
   * reseteamos el flag directamente en el callback HTTP de
   * {@link executeFormationChange}, independiente del padre.
   */
  onFormationChange(newFormation?: string): void {
    // Bloquear si hay un cambio en progreso
    if (this.isFormationChanging) {
      console.log('[SQUAD-EDITOR] Formation change blocked - waiting for previous change to complete');
      return;
    }

// Ignorar cambios durante inicialización (evita NG0100)
    if (this.isInitializing) {
      return;
    }

    // V25D91.5-FRONT F6: priorizar el argumento explícito (viene de ngModelChange,
    // siempre actualizado) sobre this.selectedFormation (puede no estarlo si se
    // llama el handler programáticamente antes de que Angular sincronice el DOM).
    const targetFormation = newFormation ?? this.selectedFormation;
    if (!targetFormation) {
      return;
    }

    // V25D91.5-FRONT F6: sincronizar this.selectedFormation con la nueva
    // formación. En producción vía (ngModelChange) NgModel ya lo escribió,
    // pero en llamadas programáticas (tests, debugging) necesitamos hacerlo
    // nosotros para que el getter y el template queden consistentes.
    if (this.selectedFormation !== targetFormation) {
      this.selectedFormation = targetFormation;
    }

    // V25D91.5-FRONT F6: sincronizar this.selectedFormation con la nueva
    // formación. En producción vía (ngModelChange) NgModel ya lo escribió,
    // pero en llamadas programáticas (tests, debugging) necesitamos hacerlo
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

    // Resetear el subject para esperar nueva confirmación (legacy contract
    // con el padre — squad-management no escucha, pero lo emitimos por si
    // otro caller en el futuro lo hace).
    this.formationChangeCompleteSubject = new Subject<void>();

    this.homeFormation$.next(targetFormation);

    // Ejecutar cambio. El reset de isFormationChanging ahora vive adentro
    // de executeFormationChange (next + error callbacks), sin depender del
    // padre escuchando formationChangeComplete.
    this.executeFormationChange(targetFormation);
  }

  /** Ejecuta auto-select sin limpiar el mapa primero (para carga inicial) */
  private executeAutoSelect(formation: string): void {
    this.loadingFormation$.next(true);

    this.http.post<any>(`${environment.apiUrl}/career/lineup/auto-select`, {
      formation: formation
    }).subscribe({
      next: (response) => {
        this.loadingFormation$.next(false);
        this.applyLineupToSlots(formation, response?.players || []);
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

  /** Aplica la lineup a los slots del campo */
  private applyLineupToSlots(formationName: string, playersList: any[]): void {
    // Limpiar mapeos antes de aplicar nueva lineup
    this.slotPlayerMap = {};

    const positions = this.formationPositions[formationName] || [];

    // V25D66-C26 (Sprint C26): si el caller pasó squad via dialog data,
    // usarlo como pool completo para que la banca muestre los jugadores
    // no seleccionados del squad (no solo del response de auto-select).
    // Fallback al playersList legacy cuando squad está ausente.
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

    // Convertir jugadores del response
    const allPlayers: PlayerOnFieldDto[] = squadSource.map((p: any) => ({
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      role: p.position,
      overall: p.overall || 70,
      slotId: '',
      stamina: p.energy || 100,
      active: !p.injured,
      isEmpty: false
    }));

    // Asignar slots según posición EXACTA del jugador
    const assignedPositions = new Set<number>();

    allPlayers.forEach((player) => {
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

    // V25D91.5-FRONT F6 fix: markForCheck + detectChanges. El template
    // itera sobre homePlayers (getter sobre BehaviorSubject) sin async
    // pipe, así que necesita change detection explícita para repintar
    // los markers en sus nuevas posiciones. Antes solo había detectChanges
    // que funcionaba pero era frágil ante schedules async.
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  /**
   * Ejecuta el cambio de formación vía POST /career/lineup/auto-select y aplica
   * los players retornados a los slots del campo.
   *
   * <p>V25D91.5-FRONT F6 fix: antes este método retornaba una Promise que solo
   * resolvía después del HTTP. El reset de {@code isFormationChanging} vivía
   * en {@code onFormationChange.then()} y dependía de que el padre
   * escuchara {@code formationChangeCompleteSubject}. Como el padre no lo hace,
   * el flag quedaba en true para siempre y el select quedaba disabled.
   *
   * <p>Ahora el reset del flag vive directamente en los callbacks next/error
   * de este método, sin depender del padre. También agregamos
   * {@code cdr.markForCheck()} + {@code cdr.detectChanges()} para forzar change
   * detection en el squad-header (donde está el select y la chemistry preview).
   */
  private executeFormationChange(newFormation: string): void {
    const startTime = performance.now();
    this.loadingFormation$.next(true);
    this.cdr.markForCheck();

    // Llamar al endpoint auto-select para obtener los mejores jugadores
    this.http.post<any>(`${environment.apiUrl}/career/lineup/auto-select`, {
      formation: newFormation
    }).subscribe({
      next: (response) => {
        this.loadingFormation$.next(false);
        this.applyLineupToSlots(newFormation, response?.players || []);
        // MVP1-lineup-cancha-1.5 FIX (F4, defensivo): persistir los slots
        // después del auto-select. Si F1 (back) está bien implementado,
        // el back ya persistió el subdivision map; este saveLineup es
        // redundante pero defensivo. Si F1 tiene un bug, este saveLineup
        // asegura persistencia. El guard interno bloquea si lineup < 7.
        this.saveLineup();
        // EMITIR EVENTO AL PADRE con los players directamente (sin esperar backend)
        this.formationChanged.emit({
          formation: newFormation,
          players: response?.players || []
        });
        // Legacy: emit formationChangeComplete con el subject (no-op si nadie escucha).
        this.formationChangeComplete.emit(this.formationChangeCompleteSubject);

        // V25D91.5-FRONT F6 fix: reset del flag + cd explicit. Antes dependía del
        // padre escuchando formationChangeComplete, lo que nunca pasaba.
        this.isFormationChanging = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingFormation$.next(false);
        const elapsed = (performance.now() - startTime).toFixed(0);
        console.error(`[SQUAD-EDITOR] Auto-select ERROR after ${elapsed}ms:`, err);
        this.errorMessage$.next('Error al auto-seleccionar jugadores');
        // V25D91.5-FRONT F6 fix: reset también en error path.
        this.isFormationChanging = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  /** Guarda la alineación en el backend.
   *
   * <p>MVP1-lineup-cancha-1: envía primero los slots a
   * {@code /career/lineup/manual-select} (para persistir la subdivisionId por
   * jugador), luego {@code /career/lineup/confirm} para confirmar la alineación.
   *
   * <p>Si el back rechaza con 422 (LINEUP_VALIDATION_ERROR, etc.), se surface
   * el mensaje inline sin llamar a /confirm.
   */
  private saveLineup(): void {
    // V24D6U3: client-side guard before sending the save. The backend
    // would 422 anyway; we surface the error inline without sending a doomed request.
    const playerCount = this.homePlayers.length;
    if (playerCount < 7) {
      // V25D78-C55.7.7.1 BUG_L4 (continuation from C55.7.7 squad-management.component.html
      // commit 31822e3): clarify that 7 is a floor, NOT a ceiling — the user can save with
      // any valid lineup between 7 and 11. The actual guard logic (< 7 → block) is unchanged.
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
    const playerIds: string[] = this.homePlayers.map(p => p.playerId);
    const slots: LineupSlotDTO[] = this.homePlayers
      .filter(p => !!p.slotId)
      .map(p => ({ playerId: p.playerId, subdivisionId: p.slotId }));

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
            // V24D6U3: surface server warnings (LINEUP_SHORT_HANDED, etc.)
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
        // 422 with code (e.g. LINEUP_MINIMUM_PLAYERS_NOT_MET) — surface inline
        if (err.error?.code) {
          this.errorMessage$.next(err.error.message || 'Error al guardar');
        }
      }
    });
  }

  /** Cierra el modal */
  close(): void {
    this.dialogRef.close();
  }

  /** Muestra warning si el jugador seleccionado tiene condición de riesgo */
  showConditionWarning(player: PlayerOnFieldDto): void {
    if (player.injured) {
      this.conditionWarning$.next('⚠️ Injured player selected. Consider replacing them before confirming.');
    } else if ((player.stamina ?? 100) <= 19) {
      this.conditionWarning$.next('⚡ Exhausted player selected. Starting them may affect performance.');
    } else if ((player.stamina ?? 100) <= 39) {
      this.conditionWarning$.next('⚡ Very tired player selected. Consider resting them.');
    } else if ((player.stamina ?? 100) <= 59) {
      this.conditionWarning$.next('⚡ Tired player selected. They may not perform at full capacity.');
    } else {
      this.conditionWarning$.next('');
    }
  }

  /** Limpia el warning de condición */
  clearConditionWarning(): void {
    this.conditionWarning$.next('');
  }
}
