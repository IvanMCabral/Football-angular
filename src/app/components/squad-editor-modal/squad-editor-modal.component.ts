import { Component, Inject, OnInit, ChangeDetectorRef, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
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
import { CdkDragDrop, CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
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
               cambio.

               V25D96-FRONT F3: the dropdown displays user-formation pseudo-state
               (the disabled 'Formación del User' option is selected after a
               cross-role drop). Two-way [(ngModel)] would overwrite the canonical
               selectedFormation whenever the dropdown value matches the disabled
               user-formation string, breaking the backend contract (POST
               /career/lineup/manual-select only accepts canonical formations).
               [ngModel] one-way + (ngModelChange) keeps the same Angular
               SelectControlValueAccessor wiring but does NOT re-sync to the DOM
               when the bound getter changes mid-lifecycle. To bridge that gap
               we use a property-template-ref + direct select.value write via
               a (DOMContentLoaded-style) approach: instead of [ngModel] we
               use the native [value] attribute which writes through to the
               select element's value after every CD cycle. Combined with the
               appended disabled 'Formación del User' option, the select
               reflects the user-formation state visually without losing the
               canonical model. -->
          <select [value]="dropdownFormationValue"
                  (change)="onFormationSelect($any($event.target).value)"
                  [disabled]="isFormationChanging"
                  [title]="(isCustomLineup() ? 'Tu lineup personalizado no coincide con una formación canónica' : '')">
            <option *ngFor="let f of formations" [value]="f">{{f}}</option>
            <option [value]="userFormationLabel" [disabled]="true">Formación del User</option>
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
          <!-- V25D98-FRONT: reset button visible only when at least one
               player has a custom (free) position. Snaps every marker
               back to its canonical slot center. -->
          <button mat-stroked-button
                  (click)="resetCustomPositions()"
                  class="reset-positions-btn"
                  *ngIf="hasCustomPositions()"
                  title="Volver a las posiciones canónicas de la formación">
            ↺ Reset posiciones
          </button>
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
        <!-- V25D99-FRONT: el campo YA NO es cdkDropList. Pre-V25D99 era cdkDropList
             (handleFieldDrop capturaba free drops) pero CDK reordenaba los
             markers visualmente durante el drag (lo que Iván no quería) y
             el evento cdkDropListDropped se suprimía en algunas condiciones
             (source===container con sorting-disabled), causando el bug
             'solo deja mover 1 vez'. Ahora el campo es un div plano; el
             marker captura SU PROPIO drag end via (cdkDragEnded) y decide
             internamente si el drop point cae sobre un slot (snap), sobre
             la banca (move to bench) o libre del field (free positioning).
             Los slots siguen siendo cdkDropList solo para que CDK renderice
             el drop preview visual durante el drag (highlight) — pero el
             handler real está en el marker, no en el slot. -->
        <div class="field" #fieldContainer>
          <!-- Etiquetas de zonas -->
          <div class="zone-label zone-attack-label">ATAQUE</div>
          <div class="zone-label zone-midfield-label">MEDIO</div>
          <div class="zone-label zone-defense-label">DEFENSA</div>

          <!-- V25D95-FRONT F2: reinforced soccer markings for TV-broadcast
               look. Pre-V25D95 era 16%×30% penalty area (chico); Ivan pidio
               "la cancha se vea profesional como TV". Spec: 60% w × 16% h
               penalty areas, 25% × 6% goal areas, 18% diameter center
               circle, 14% w penalty arcs, 0.6% w penalty spots + 4 corner
               arcs (NEW element). Ver CSS rules para proporciones exactas.
               Tambien F4: 2 goal posts (arcos pequenos en top/bottom del
               field, 8%×4% con net pattern). -->
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
          <!-- V25D95-FRONT F2 NEW: corner arcs (cuarto de circulo en cada
               esquina). Selective border-radius: 100% en una sola esquina
               para mostrar solo el quarter visible. 2.5% w × 2.5% h. -->
          <div class="corner-arc corner-tl"></div>
          <div class="corner-arc corner-tr"></div>
          <div class="corner-arc corner-bl"></div>
          <div class="corner-arc corner-br"></div>
          <!-- V25D95-FRONT F4 NEW: goal posts (mini-arcos en top y bottom
               del field, 8% w × 4% h, centro horizontalmente). Border 2px
               solido + bg transparente con net pattern sutil. -->
          <div class="goal-post goal-post-top"></div>
          <div class="goal-post goal-post-bottom"></div>

          <!-- SUBDIVISIONES COMO SLOTS (81 + 1 GK) — V25D47 (C11b) extended
               each slot as a cdkDropList connected to all other slots +
               the bench. The slot's player-chip becomes a cdkDrag so the
               user can drag players between slots. Click is preserved
               (for opening the assignment panel) — CDK suppresses click
               when a real drag occurs. -->
          <div class="field-slots">
            <ng-container *ngFor="let sub of subdivisions; let i = index">
              <!-- V25D95.1-FRONT F2: skip slots that are not in the active
                   formation AND have no player assigned. Pre-V25D95.1 the
                   .slot div rendered for ALL 82 subdivisions, which caused
                   "ghost slots" (dashed "Empty slot" rectangles + the 100%
                   effectiveness badge) to appear at positions inherited from
                   a previous formation (e.g., CAM from 4-2-3-1 persisted
                   after switching back to 4-4-2). Filter at the template
                   level for defense-in-depth — the loadSquadFromBackend
                   validation is the primary fix, this prevents ghost UI
                   even if backend returns stale slots. -->
              <ng-container *ngIf="shouldRenderSlot(sub)">
              <!-- Slot de arquero (sector 26) -->
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
                     [class.abandoned]="isSlotAbandonedByOverride(sub)"
                     [class.missing-player]="isMissingPlayer(sub)"
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
<ng-container *ngIf="getPlayerInSlot(sub) as player">
                  <div *ngIf="!hasOverridePosition(player)"
                       class="player-chip"
                       cdkDrag
                       [cdkDragData]="player"
                       [class.eff-good]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-good'"
                       [class.eff-warning]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-warning'"
                       [class.eff-bad]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-bad'">
                    <span class="player-chip-name">{{player.name | slice:0:10}}</span>
                  </div>
                </ng-container>
                  <!-- V25D98.2-FRONT: ya no mostramos .missing-indicator-overridden
                       (era el ámbar con role que Iván veía como 'el espacio
                       sigue claiming al player'). El slot ahora se ve
                       completamente vacío cuando el player está free-positioned:
                       sin chip, sin role label, sin missing indicator. Iván
                       lo lee como "este slot ya no es de nadie" y el marker
                       en la override position es el dueño real. -->
                  <div *ngIf="isMissingPlayer(sub) && !isSlotOverridden(sub)" class="missing-indicator">
                    {{getRecommendedRole(sub)}}
                  </div>
                </div>
              </ng-container>

              <!-- Slots normales (3 por sector) -->
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
                     [class.recommended]="isRecommendedSlot(sub) && !isSlotAbandonedByOverride(sub)"
                     [class.abandoned]="isSlotAbandonedByOverride(sub)"
                     [class.missing-player]="isMissingPlayer(sub)"
                     [class.attack]="sub.zone === 'ATTACK'"
                     [class.midfield]="sub.zone === 'MIDFIELD'"
                     [class.defense]="sub.zone === 'DEFENSE'"
                     (click)="onSlotClick(sub)">
                  <!-- V25D91-FRONT-F3: slot-id label removida (era debug-only). -->
                  <!-- V25D51 (Sprint C13): chip-level effectiveness feedback.
                       See the slot-gk block above for full details on the
                       eff-good/eff-warning/eff-bad classification and the
                       embedded eff-badge. -->
<ng-container *ngIf="getPlayerInSlot(sub) as player">
                    <div *ngIf="!hasOverridePosition(player)"
                         class="player-chip"
                         cdkDrag
                         [cdkDragData]="player"
                         [class.eff-good]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-good'"
                         [class.eff-warning]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-warning'"
                         [class.eff-bad]="getChipEffectivenessClass(sub.subdivisionId) === 'eff-bad'"
                         [attr.title]="player.name + ' (' + player.role + ') · OVR ' + player.overall + ' · eff. ' + (getEffectivenessColor(sub.subdivisionId) || 'unknown')">
                      <span class="player-chip-name">{{player.name | slice:0:10}}</span>
                    </div>
                  </ng-container>
                   <!-- V25D98.2-FRONT: ver bloque equivalente en slot-gk arriba -->
                   <div *ngIf="isMissingPlayer(sub) && !isSlotOverridden(sub)" class="missing-indicator">
                     {{getRecommendedRole(sub)}}
                   </div>
                 </div>
               </ng-container>
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
               palette as V25D90 PartidoModal).

               V25D95.1-FRONT F2: filter out markers whose slotId is not
               in the active formation. Pre-V25D95.1 a player persisted in
               a 3-5-2 lineup (e.g., CAM at the center MID slot) would
               still render a marker at that position after the user
               switched to 4-4-2 — overlapping with the 4-4-2 players at
               the surrounding MID slots and looking like a "ghost" or
               "stacked" marker. Now the marker only renders if the
               slotId is in the active formation (defense-in-depth: the
               primary fix is the loadSquadFromBackend validation that
               clears stale slotIds). -->
<ng-container *ngFor="let player of homePlayers; let i = index">
              <div *ngIf="player.slotId && isSlotInActiveFormation(player.slotId)"
                   class="player-marker"
                   cdkDrag
                   [cdkDragData]="player"
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
               <!-- V25D95.7-FRONT: chemistry feedback moved from .player-chip
                    (which had green bleed-out around the marker card in
                    V25D95.6) to .player-marker via drop-shadow filter.
                    The .player-marker.eff-green/-yellow/-red CSS rules
                    (below) apply a glowing border via drop-shadow that
                    hugs the marker card exactly — no bleed. The marker
                    also keeps its role-family color (yellow GK, blue DEF,
                    green MID, red ATT) as its base color; eff-* is an
                    additive glow overlay for high/low chemistry.
                    V25D95.5 removed these earlier but V25D95.7 restores
                    them now that the chemistry visual has a clean home. -->
               <!-- V25D95.5-FRONT: removed [class.eff-green/yellow/red] bindings
                    + V25D95.3 tactical-number badge. The marker now shows
                    ONLY role family color (yellow GK / blue DEF / green MID /
                    red ATT) and the dorsal. The effectiveness tint now lives
                   on the underlying .player-chip (subtle chip border), not
                   on the marker border ring. V25D95.5 also adds cdkDrag +
                   cdkDragData so the marker IS the drag handle — previously
                   only the hidden chip had cdkDrag, so users saw the marker
                   on top but couldn't grab it (clicking the marker did
                   nothing). Now drag-drop works directly on the marker card. -->
               <div class="player-number">{{i + 1}}</div>
               <div class="player-name-label">{{player.name}}</div>
               <div class="player-role-label">{{player.role}}</div>
               <!-- V25D96-FRONT F4: OFF badge visible only when the player's
                    role doesn't match the slot's recommended role in the
                    active canonical formation. The dashed orange border on
                    the parent .player-marker (set when 'off-role' class
                    applies) is the second visual hint — both reinforce that
                    the player is in an off-role slot so the manager sees
                    the chemistry penalty even when scanning the field at a
                    glance. -->
               <div *ngIf="isOffRole(player)" class="off-role-badge">OFF</div>
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
           [cdkDropListData]="'bench'">
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

    /* V25D98-FRONT: reset-positions button — visible only when at least one
       marker has a custom (free) position. Compact pill style so it
       fits in the header next to the chemistry preview stack. */
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
       (subtle background tint) + player markers (border ring).
       V25D95.2-FRONT: only show the tint when the slot is EMPTY
       (.missing-player) or being hovered. When OCCUPIED, the .player-marker
       already conveys the effectiveness via its own border ring — showing
       a second tinted tile behind the marker was perceived as a "ghost
       rectangle" by Ivan (V25D95.1 review). */
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
    /* V25D95.2-FRONT: occupied slots render with NO background tint AND
       NO border. The .player-marker on top is the only visible indication
       of who is in the slot. The slot itself stays as an invisible
       cdk-drop-list target so drag-drop still works. */
    .slot.occupied {
      background: transparent !important;
      border: none !important;
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
      /* V25D93.5-FRONT: padding 20px → 8px para dar mas espacio al field
         landscape. Vertical space es limited (modal h = 90vh - header/bench),
         asi que reducir padding vertical maximiza el field height. */
      padding: 8px;
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
      /* V25D94-FRONT: aspect ratio 1.4/1 → 1.15/1 (mas cuadrado, parecido a
         TV broadcast real). V25D93.5 estaba demasiado landscape (1.4:1);
         Ivan pidio "la cancha se vea como cancha no tan ancha". 1.15/1
         matches real TV broadcast aspect (16:9 cropped to ~1.15-1.2). */

      /* Height-driven: field usa el maximo height disponible del
         field-container, width se ajusta via aspect-ratio. */
      height: 100%;
      width: auto;
      max-width: 100%;
      aspect-ratio: 1.15 / 1;
      /* V25D95-FRONT F1: grass texture profesional. Pre-V25D95 el field
         era linear-gradient verde plano (#4a8c5c → #5a9c6c → #4a8c5c).
         Ivan: "la cancha se ve fea, parece un bloque verde sin textura".
         Spec: stripe pattern alternado cada 5% (repeating-linear-gradient
         overlay) + radial-gradient center-to-edge (centro #3a8159 mas
         brillante, bordes #235534 mas oscuros). background-blend-mode:
         overlay mezcla las 2 capas para un efecto realista. */
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
      /* V25D95-FRONT F2: outer border (frame del field) bumped from 3px
         solid #fff to 2.5px solid rgba(255,255,255,0.95) per spec TV-
         broadcast. Mismo thickness que la line del centro (consistencia). */
      border: 2.5px solid rgba(255, 255, 255, 0.95);
      border-radius: 4px;
      /* NOTA: NO agregamos overflow:hidden al .field porque romperia
         .player-chip .eff-badge (positioned absolute top:-8 right:-8
         desde el chip — sobresale del slot y podria extenderse fuera
         del field para slots en los extremos como S24-3 / GK). Los
         .corner-arc NO requieren clip: estan completamente dentro del
         field (2.5% × 2.5% anchored en cada esquina). */
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

    /* V25D95.1-FRONT F4: markings sit ABOVE the .field-slots layer (z:1)
       but BELOW the .player-markers (z:10) so the slot dashed borders
       and chips don't cover the field lines, and the markers always
       sit on top of both. Pre-V25D95.1 the markings had no explicit
       z-index, so the slot chip (z:1) occasionally drew over the
       halfway line — subtle but visible at the seam where the
       dashed slot border crossed a white line. */
    .field-line {
      position: absolute;
      border: 2px solid rgba(255, 255, 255, 0.85);
      z-index: 2;
    }

    /* V25D95-FRONT F2: halfway line — bumped to 2.5px height + alpha 0.95
       (vs old 0.7). Posicionado en yPercent 50% exacto via top:50% +
       translateY(-50%). Background-fill en vez de border (line horizontal
       full-width no necesita 4-border). */
    .center-line {
      top: 50%;
      height: 2.5px;
      width: 100%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.95);
      border: none;
    }

    /* V25D95-FRONT F2: center circle diameter 13% → 18% per spec. Border
       bumped a 2.5px alpha 0.95 (vs old 2px alpha 0.7). Igual AR:1 para
       garantizar circular perfecto a cualquier field width. */
    .center-circle {
      top: 50%;
      left: 50%;
      width: 18%;
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 2.5px solid rgba(255, 255, 255, 0.95);
    }

    /* V25D95-FRONT F2: Penalty areas per spec TV-broadcast. Bumped from
       16% × 30% a 60% w × 16% h. El "60% del field width" era lo que
       Ivan queria como "linea mas prominente" — V25D93 lo dejo chico
       (proporciones reales-pitch). V25D95 trade-off: no es 100%
       proporcional real pero se ve "profesional" como TV broadcast.
       Border 2px solid rgba(255,255,255,0.9) per spec. bottom:0 (own)
       o top:0 (opponent). */
    .left-penalty-area {
      bottom: 0;
      left: 50%;
      width: 60%;
      height: 16%;
      transform: translateX(-50%);
      border: 2px solid rgba(255, 255, 255, 0.9);
      /* Solo top + lados. El bottom coincide con la goal-line, asi el
         rectangulo se conecta con el field border sin doble linea. */
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

    /* V25D95-FRONT F2: Goal areas (chica, dentro de penalty area). Spec:
       25% w × 6% h (vs old 8% × 12%). Border 2px solid rgba(255,255,255,0.9).
       Posicion dentro del penalty area, en el extremo (junto a la goal-line). */
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

    /* V25D95-FRONT F2: Penalty spots per spec 0.6% w × 0.6% h (vs old
       0.8%). Position bumped from 11% a 12% del goal-line (mas cerca
       del centro segun FIFA regulations). Border-radius:50% mantiene
       circular. Background blanco alpha 0.95 (full opacity para que
       se vea como spot blanco solido). */
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

    /* V25D95-FRONT F2: Penalty arcs (D-shaped semicircle on top of penalty
       area, parcialmente visible). Bumped from 10% a 14% w (mas prominente).
       Border 2px solid rgba(255,255,255,0.85). El semicirculo visible se
       logra con 3 borders transparent + transform translate que mueve el
       circulo atras/abajo del penalty spot. */
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

    /* V25D95-FRONT F2 NEW: Corner arcs (4 esquinas del field). Cada uno es
       un cuarto de circulo visible en una esquina. Width 2.5% × height
       2.5% per spec — dimension pequena para no dominar visualmente. Border
       2px solid rgba(255,255,255,0.9). El "quarter visible only" trick:
       usamos border-radius:100% SOLO en la esquina que debe ser redonda;
       las otras 3 esquinas quedan en border-radius:0 (sharp). Tambien
       removemos los 2 borders que no se ven (los que apuntan hacia el
       centro del field) para evitar doble linea visual.
       Posicion: cada corner se ancla a su esquina del field via
       top/left/right/bottom:0. Overflow:hidden del .field (V25D95 F2 fix)
       clipa cualquier overflow accidental. */
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

    /* V25D95-FRONT F4 NEW: Goal posts (mini-arcos en los goal-lines).
       Width 8% del field × height 4% del field per spec. Border 2px
       rgba(255,255,255,0.85) + bg alpha 0.15 para look de "net" semi-
       transparent. Border-radius solo en los 2 corners que miran hacia
       el centro del field (donde estaria la red colgando):
         - top goal (en top del field): border-radius: 0 0 8% 8%
           (bottom corners redondeados, net "cuelga" hacia abajo)
         - bottom goal (en bottom del field): border-radius: 8% 8% 0 0
           (top corners redondeados, net "cuelga" hacia arriba)
       El z-index:3 los pone encima de las markings (default z) pero
       debajo de los slots (z:5) y markers (z:20). */
    .goal-post {
      position: absolute;
      left: 50%;
      width: 8%;
      height: 4%;
      transform: translateX(-50%);
      background:
        /* Net pattern sutil: lineas verticales cada 4% del field. */
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

    /* V25D95.1-FRONT F4: z-index hierarchy. .field-slots sits BELOW the
       markings so the dashed "Empty slot" rectangles don't draw over the
       field lines, and BELOW the player-markers so chips/markers appear
       on top. Pre-V25D95.1 the value was 5 which competed with the
       markings (also default 0) and made the dashed border occasionally
       clip the penalty-area line. */
    .field-slots {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    /* Individual Slot */
    .slot {
      position: absolute;
      /* V25D93-FRONT F1: hide debug slot grid. Pre-V25D93 cada uno de los 82
         slots se renderizaba como rectangulo con border rgba(255,255,255,0.3)
         + bg rgba(255,255,255,0.05) tinted por role family (red attack, green
         midfield, blue defense). Con soccer markings reales en V25D93 esa
         grilla es ruido — Ivan: "cruces rojas adentro, feo". Fix:
         border:none + background:transparent. .slot.missing-player mantiene
         su tinted bg para que el user sepa DONDE falta asignar (info util,
         no debug clutter). Slots siguen siendo cdkDropList/cdkDrag targets,
         solo cambia la presentacion visual. */
      border: none;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      /* V25D51 (Sprint C13): overflow:visible so the chip-level eff-badge
         (positioned at top:-8px, right:-8px against the chip) can extend
         above the slot's top edge without being clipped. The chip's own
         text ellipsis is preserved by wrapping the player name in a
         .player-chip-name span with its own overflow:hidden. */
      overflow: visible;
    }

    .slot:hover {
      /* V25D93-FRONT F1: hover feedback sutil para drag affordance. ANTES el
         hover ponia bg alpha 0.15 + border-color solid white — Ivan vio
         eso como "cruces rojas". Ahora: outline 2px white dashed solo en
         hover (feedback temporal para drop target). */
      outline: 2px dashed rgba(255, 255, 255, 0.6);
      outline-offset: -2px;
    }

    /* V25D93-FRONT F1: removidas .slot.attack/.midfield/.defense/.gk role-tinted
       backgrounds — eran debug-only que Ivan reporto como "cruces rojas". */

    .slot-gk {
      /* V25D93-FRONT F1: transparent. Mantengo la regla para no romper el
         selector del template (slot-gk class aplicada en cdkDropList). */
      background: transparent;
      border: none;
    }

    /* V25D98.6-FRONT: abandoned slot (player free-positioned elsewhere)
       is fully inert — no pointer-events (mouse passes through), no
       cursor change, no hover effect. Iván reported 'deja pasar el mouse
       por arriba' on the V25D98.5 fix. Combined with onSlotClick's
       early-return, the slot is now a pure visual ghost until the user
       drag-drops the marker back onto it (handleSlotDrop restores
       slotPlayerMap + removes .abandoned). */
    .slot.abandoned {
      pointer-events: none;
      cursor: default;
    }

    .slot.recommended {
      box-shadow: inset 0 0 10px rgba(255, 200, 0, 0.3);
    }

    /* V25D93-FRONT F1: removida .slot.occupied que ponia bg blanca alpha 0.2
       + border blanco. El marker del player es suficiente indication. */

    /* Slot recomendado sin jugador asignado */
    .slot.missing-player {
      /* V25D93-FRONT F1: MANTIENE el tinted bg — UNICA exception a la regla
         "slots invisibles" porque esto ES informacion util (no debug clutter).
         El user ve donde falta asignar. Border-style:dashed indica "vacio". */
      background: rgba(231, 76, 60, 0.18);
      border: 1px solid rgba(231, 76, 60, 0.5);
      border-style: dashed;
      border-radius: 4px;
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
    /* V25D98.2-FRONT: .missing-indicator-overridden eliminado. Iván
       reportó que ver el role del slot original después del free drop
       hacía sentir que el slot "seguía claiming al player". Ahora el
       slot se ve completamente vacío (ni chip ni role indicator)
       cuando el player está free-positioned. */

    .player-chip {
      font-size: 0.5rem;
      color: #fff;
      /* V25D95.6-FRONT: chip is now invisible (transparent bg). The visible
         card is the .player-marker on top. The chip stays as an invisible
         cdk-drop-list child so drag-drop logic still works (chip + marker
         both have cdkDrag, marker is the primary visual handle). The
         eff-good/warning/bad class still applies a colored border that
         leaks through the marker (subtle 1px ring around the marker card)
         as a chem-status indicator. */
      background: transparent;
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
        Mismo patron que V25D63-C23 en substitution-modal.component.css.
        V25D95.7-FRONT: border del chip removido. El chip es invisible
        (V25D95.6 transparent bg) y el border verde se "sangraba" hacia
        afuera del marker card (que es más chico), mostrando un recuadro
        verde fantasma alrededor de Courtois en el GK slot (que es 180px
        ancho vs 70px del marker). La chemistry eff-* ring ahora vive
        en .player-marker.eff-good/warning/bad abajo — el border rodea
        el marker card directamente, sin bleed. */
     .player-chip.eff-warning {
       /* border removed V25D95.7 */
       box-sizing: border-box;
     }
     .player-chip.eff-bad {
       /* border removed V25D95.7 */
       box-sizing: border-box;
     }
     .player-chip.eff-good {
       /* border removed V25D95.7 */
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
       /* V25D93-FRONT F3: width fijo 70px (suficiente para nombres largos en 2
          lineas). Height VARIA por role per Ivan spec — ver los selectores
          .color-gk/.color-def/.color-mid/.color-att abajo.

          V25D95.1-FRONT F4: z-index 20 → 10. El hierarchy final es
          .field-slots=1, .field-line=2, .player-marker=10, .tactical-number=11.
          El marker queda encima de slots + markings pero el dorsal flota
          externo en z:11. Antes z:20 era muy alto — el assignment panel
          (z:100) y los warnings (z:100) ya estaban muy por encima, asi que
          bajar a 10 no afecta ningun overlay del modal.

          V25D99-FRONT: pointer-events: auto (was: none). Pre-V25D99 the
          marker was purely visual — the slot's cdkDropList captured drag
          events. V25D99 moved drag capture to (cdkDragEnded) on the
          marker itself. pointer-events: none blocked ALL mouse events
          on the marker so cdkDrag never started — Ivan reported 'no
          deja hacer cambio de nada'. Re-enabling pointer events here
          makes the marker the drag handle as intended by the V25D99
          rewrite. The inner .player-chip-name text inherits pointer
          events normally; the slot is still clickable (pointer-events
          pass through to siblings, but the marker sits ON TOP of slots
          so clicks land on the marker, which uses cdkDrag to start a
          drag). The marker template also forwards click to onSlotClick
          via the (click) on the .field element — but since the marker
          has its own cdkDrag, plain clicks would be CDK-initiated
          drags; for click-to-assign UX see the assignment-panel flow. */
       width: 70px;
       height: 48px;
       transform: translate(-50%, -50%);
       z-index: 10;
       pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      /* V25D93-FRONT F3: border 2px solid white per parent spec (ANTES no
         habia border visible — solo drop-shadow). Ahora el marker se separa
         claramente del field green con borde blanco solido. */
      border: 2px solid #fff;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.55);
      /* V25D93-FRONT F3: drop-shadow per parent spec rgba(0,0,0,.35) 0 1px 3px
         (ANTES era 0,0,0,0.5 0 2px 3px). Mas sutil. */
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));
    }

    /* V25D93-FRONT F3: height por role per Ivan spec:
       GK 56px (portero grande — un solo player, special status)
       DEF 48px (4 defenders en formacion tipica)
       MID 44px (4-5 mids, mas pequenos pq son mas por fila)
       FW  48px (2-3 forwards)
       Overrides the default .player-marker { height: 48px }. */
    .player-marker.color-gk { height: 56px; }
    .player-marker.color-def { height: 48px; }
    .player-marker.color-mid { height: 44px; }
    .player-marker.color-att { height: 48px; }

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

    /* V25D95-FRONT F3: tactical number badge (cuadradito chico que flota
       en el corner top-right EXTERNO del marker card). 14×14px per spec,
       absolute top:-10 right:-8. Font 0.55rem semi-transparent (alpha
       0.55) — sutil, complementa al .player-number INTERNO (mas grande
       y opaco) sin distraer. Background alpha 0.4 (semi-transparent
       black) para legibilidad sobre cualquier field background. Border-
       radius:50% lo hace circular como dorsales en TV broadcast.

       V25D95.1-FRONT F4: z-index 21 → 11 (matches the new hierarchy
       where .player-marker is z:10 and the badges float one above). */
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
      /* V25D93-FRONT F4: bumped font-size 0.6rem → 0.65rem per parent spec.
         Mas legible desde lejos. Ademas padding ajustado para que role
         labels como "GK"/"CB"/"CM"/"ST" se vean claros dentro del marker
         con la nueva altura variable (44-56px). */
      font-size: 0.65rem;
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

    /* V25D96-FRONT F4: off-role marker styling. When a player is dragged to a
       slot whose recommended role in the active canonical formation doesn't
       match their 'role', we apply TWO visual hints:
         - dashed orange border 2px on the .player-marker (overrides the
           default 2px solid white), AND
         - a small orange 'OFF' badge anchored at the marker's top-left corner
           (analogous to the existing .tactical-number badge at top-right).

       Both reinforce the cross-role placement. The badge in particular is
       readable at distance — the manager can scan the field for orange 'OFF'
       labels to find the off-role players without inspecting every marker.
       The border uses border-style dashed (and the same amber-500 color
       as the chip-level eff-warning) so it visually matches the existing
       off-role feedback in the .player-chip element below.
       !important overrides the existing .player-marker border 2px solid white. */
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
        /* V25D94-FRONT: mobile max-width y aspect-ratio. Flip a 1.15/1
           square-ish (mismo aspect que desktop). En mobile viewport
           (<600px), el field-container h es chico (90vh - chrome).
           Sin el max-width cap que existia (V25D58 = 380px para portrait),
           el field en 375-414vw tendria h~200-220 y w~230-250. */
        max-width: 100%;
        aspect-ratio: 1.15 / 1;
        height: 100%;
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
        /* V25D94-FRONT: tablet max-width y aspect-ratio. Flip a 1.15/1
           square-ish (mismo aspect que desktop). */
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

      /* V25D93.5-FRONT: removed .field max-width: min(600px, 100%) override.
         El field ahora es height-driven landscape 1.4:1 (definido en
         regla base) y no necesita un cap horizontal — width se calcula
         por aspect-ratio a partir de height. El cap 600 era de la era
         portrait 0.71:1 (V25D58) y ahora no aplica. */
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
   *
   * <p>V25D96: the dropdown also needs to render the disabled
   * {@code 'Formación del User'} option (when the user has drag-dropped
   * players to non-canonical positions). The dropdown's effective options
   * for display are {@link ALL_FORMATIONS} + the {@link USER_FORMATION_LABEL}
   * (UI-only label, not selectable). Keep {@code formations} as the canonical
   * list; the template appends the user-formation pseudo-option separately
   * via a sibling option element.
   */
  formations: readonly string[] = ALL_FORMATIONS;

  /**
   * V25D96-FRONT: true when the current lineup does not match any canonical
   * formation (i.e. the user has rearranged players to non-canonical slots
   * via drag-drop). Drives {@code dropdownFormationValue} and
   * {@code isSlotInActiveFormation} (so non-canonical slots with players
   * still render their markers). Set automatically by
   * {@code detectFormation()} — never bind directly.
   */
  private _isCustomLineup = false;

  /**
   * V25D96-FRONT F3: value displayed in the formation `<select>`. Equals
   * {@code selectedFormation} when the lineup matches a canonical; equals
   * {@link USER_FORMATION_LABEL} when {@code _isCustomLineup} is true.
   *
   * <p>Why a getter (not a new property): both the canonical selected value
   * AND the user-formation pseudo-value flow through the same `<select>`.
   * A backing field would lose sync with the underlying lineup state on
   * every drag-drop / auto-select cycle. The getter derives the displayed
   * value lazily from the flag.
   */
  get dropdownFormationValue(): string {
    return this._isCustomLineup ? USER_FORMATION_LABEL : this.selectedFormation;
  }

  /**
   * V25D96-FRONT F3: true when the lineup is in user-formation mode. Used
   * by the template to render the user-formation pseudo-option (and any
   * helper text). Mirrors the internal {@code _isCustomLineup} flag.
   */
  isCustomLineup(): boolean {
    return this._isCustomLineup;
  }

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

        // V25D95.1-FRONT F2: defensive validation — clear any slotId that
        // is NOT in the active formation. Pre-V25D95.1 the persisted slots
        // were applied verbatim, so a player placed in a 3-5-2 CAM slot
        // would keep that slotId after switching back to 4-4-2 (which has
        // no CAM position). The .player-marker would render at the CAM
        // position (ghost marker), AND if 2 players happened to share
        // that stale subdivisionId they would stack on top of each other
        // (the "Mbappé / Rodrygo" overlap Ivan reported — actually a load-
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
          // stale slotId from a previous formation — free it
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

        // V25D95.1-FRONT F2: final dedup pass. Even after the role-match
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
            // Duplicate — clear the slotId, the player will go to bench.
            delete this.slotPlayerMap[player.slotId];
            player.slotId = '';
            continue;
          }
          seenSubdivisionIds.add(player.slotId);
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

  /**
   * V25D95.1-FRONT F2: returns true if the subdivisionId is one of the
   * active formation's positions. Used to:
   *   1. Filter the .player-marker loop so stale persisted slots (from
   *      a previous formation) don't render ghosts at positions not in
   *      the current 4-4-2 / 5-3-2 / etc.
   *   2. Filter the .slot loop via {@link shouldRenderSlot} so empty
   *      slots outside the active formation don't render dashed
   *      "Empty slot" rectangles.
   *
   * <p>If the active formation has no loaded positions yet (still loading
   * /editor/formations), returns false for safety — no slot gets rendered
   * until we know what the formation looks like.
   */
  isSlotInActiveFormation(subdivisionId: string | undefined): boolean {
    if (!subdivisionId) { return false; }
    // V25D96-FRONT F5: in user-formation mode (lineup doesn't match any
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

  /**
   * V25D95.1-FRONT F2: gate for the .slot div render. Returns true if
   * either:
   *   - the slot is in the active formation (so it should render with
   *     its empty/occupied styling), OR
   *   - the slot currently has a player assigned (even if it's a stale
   *     slot from a previous formation — we still need to render the
   *     draggable chip so the user can drag it back).
   *
   * <p>Returns false for slots that are neither in the active formation
   * NOR have a player — those are the "ghost" slots that V25D95.1 hides
   * to prevent the dashed "Empty slot" rectangles from appearing at
   * positions inherited from another formation (e.g., CAM from 4-2-3-1
   * persisting after switching to 4-4-2).
   */
  shouldRenderSlot(sub: FieldSubdivisionDTO): boolean {
    if (this.isRecommendedSlot(sub)) { return true; }
    if (this.isSlotOccupied(sub)) { return true; }
    return false;
  }

  /** Verifica si falta jugador en un slot recomendado */
  isMissingPlayer(sub: FieldSubdivisionDTO): boolean {
    // V25D98.4-FRONT: también ocultamos la role label cuando el slot fue
    // abandonado por un free-positioned player (slotPlayerMap vacío pero
    // algún player tiene slotId===sub.subdivisionId con override). Sin
    // este check el slot se vería como "missing CM" después del free
    // drop, sugiriendo que el slot todavía reclama al player.
    return this.isRecommendedSlot(sub)
      && !this.isSlotOccupied(sub)
      && !this.isSlotAbandonedByOverride(sub);
  }

  /**
   * V25D98.4-FRONT: true cuando el slot NO tiene player en slotPlayerMap
   * pero algún player en homePlayers$.value tiene ese slotId y un
   * override (xPercent/yPercent). Usado por isMissingPlayer para no
   * mostrar la role label "missing CM" en un slot abandonado por
   * free-positioning — el player no está missing, está en otro pixel.
   */
  isSlotAbandonedByOverride(sub: FieldSubdivisionDTO): boolean {
    if (this.slotPlayerMap[sub.subdivisionId]) { return false; }
    const abandoned = this.homePlayers$.value.find(p =>
      p.slotId === sub.subdivisionId && this.hasOverridePosition(p));
    return !!abandoned;
  }

  /**
   * V25D98.1-FRONT: true cuando el slot está lógicamente ocupado pero el
   * player fue free-positioned (xPercent/yPercent override). Usado por el
   * template para:
   * - ocultar el chip interno (que duplicaría el nombre en la posición
   *   vieja mientras el marker está en la override)
   * - mostrar el .missing-indicator con el role, así Iván ve qué slot
   *   sigue vinculado al player aunque el marker esté visualmente en
   *   otro pixel.
   */
  isSlotOverridden(sub: FieldSubdivisionDTO): boolean {
    const player = this.slotPlayerMap[sub.subdivisionId];
    return !!player && this.hasOverridePosition(player);
  }

  /**
   * V25D98.1-FRONT: true si el player tiene al menos una coordenada de
   * override (free positioning). El template del chip usa esto para
   * ocultarse cuando el player ya está free-positioned.
   */
  hasOverridePosition(player: PlayerOnFieldDto): boolean {
    return typeof player.xPercent === 'number' || typeof player.yPercent === 'number';
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
    // V25D98.5-FRONT: abandoned slots (player free-positioned elsewhere)
    // are inert on click. Iván no quiere popup — ni siquiera "Sin asignar"
    // — porque el player está fully relocated a su override position. El
    // slot queda como un rectángulo visual sin función hasta que el
    // user drag-dropee al player de vuelta (handleSlotDrop restaura el
    // slotPlayerMap y el slot vuelve a ser clickeable con player info).
    if (this.isSlotAbandonedByOverride(sub)) {
      return;
    }
    this.selectedSlot = sub;
    this.selectedPlayerToAssign = '';
    this.cdr.detectChanges();
  }

  /**
   * V25D99-FRONT: click handler on the marker itself. V25D99 made the
   * marker pointer-events: auto so it can capture cdkDragEnded — which
   * means clicks on the marker no longer fall through to the underlying
   * slot. To preserve the click-to-show-player-info UX (which previously
   * worked via slot's onSlotClick), we add a (click) handler on the
   * marker that opens the assignment panel for the player's slotId.
   * CDK drag-vs-tap distinguishes by movement threshold (~5px); tap
   * (no drag) fires this click handler, drag fires cdkDragEnded.
   */
  onMarkerClick(player: PlayerOnFieldDto): void {
    if (!player.slotId) { return; }
    const sub = this.subdivisions.find(s => s.subdivisionId === player.slotId);
    if (!sub) { return; }
    this.onSlotClick(sub);
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
    // V25D96-FRONT F2: re-detect formation after click-assign. Same flow as
    // handleSlotDrop — if the click-assign puts a player into an off-role
    // slot (e.g. assigning a CB to a MID slot via the assign panel), we want
    // the dropdown + marker visibility to flip into user-formation mode.
    this.updateFormationDetection();
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
    // V25D96-FRONT F2: re-detect after removing a player (lineup might become
    // incomplete < 11 → flips to user-formation mode automatically).
    this.updateFormationDetection();
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

  /**
   * V25D98-FRONT: ids used by both field-level and slot-level drop lists as
   * the connectedTo set. Includes every slot + bench + the field itself so
   * CDK lets any drag item be dropped on any drop target.
   */
  get allDropListIds(): string[] {
    return this.slotDropListIds.concat([this.BENCH_DROP_LIST_ID, this.FIELD_DROP_LIST_ID]);
  }

  /** Constant id for the bench drop list (separate from per-slot ids). */
  readonly BENCH_DROP_LIST_ID = 'bench-list';

  /** V25D98-FRONT: id for the field-level drop list (captures free drops
   *  outside any slot). */
  readonly FIELD_DROP_LIST_ID = 'field-drop-area';

  /** V25D99-FRONT: ref to the field container element. Used by
   *  handleMarkerDragEnd to convert clientX/Y drop coords into field-relative
   *  percentages (replaces the field-as-cdkDropList approach that caused
   *  reordering during drag and the '1 vez y nada mas' bug). */
  @ViewChild('fieldContainer', { static: false }) fieldContainer!: ElementRef<HTMLElement>;

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
    // V25D99-FRONT: thin wrapper that translates the cdkDropListDropped
    // event into the shared assignPlayerToSlot API. V25D99 removed
    // (cdkDropListDropped) bindings from slots — handleMarkerDragEnd is
    // the primary drop handler — but we keep this method for backward
    // compat with the unit-test suite (5 specs still call handleSlotDrop
    // directly with mock events). The runtime binding is gone but the
    // logic lives on in assignPlayerToSlot.
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player) { return; }

    const targetSubdivisionId = this.subdivisionIdFromDropListId(event.container.id);
    if (!targetSubdivisionId) { return; }

    const sourceDropListId = event.previousContainer.id;
    if (sourceDropListId === 'slot-' + targetSubdivisionId) {
      return; // same slot → no-op
    }

    const sourceSlotId = sourceDropListId === this.BENCH_DROP_LIST_ID
      ? null
      : this.subdivisionIdFromDropListId(sourceDropListId);

    const occupant = this.slotPlayerMap[targetSubdivisionId] ?? null;
    this.applySlotAssignment(player, sourceSlotId, targetSubdivisionId, occupant);
  }

  /**
   * V25D47 (Sprint C11b): handle a CDK drop onto the bench drop list.
   * Only valid source → target: slot → bench (move to bench).
   * Dragging bench → bench is a no-op; dragging slot → bench removes the
   * player from the field (equivalent to {@link removePlayerFromSlot}).
   */
  handleBenchDrop(event: CdkDragDrop<any>): void {
    // V25D99-FRONT: thin wrapper — same rationale as handleSlotDrop.
    // Runtime binding removed in V25D99 (handleMarkerDragEnd handles
    // bench drops via the bench area hit-test). Kept for unit-test
    // backward compat.
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player || !player.slotId) { return; }
    if (event.previousContainer.id === this.BENCH_DROP_LIST_ID) { return; }
    this.movePlayerToBench(player);
  }

  /** Helper: strip the {@code slot-} prefix from a CDK drop list id. */
  private subdivisionIdFromDropListId(dropListId: string): string | null {
    if (!dropListId || !dropListId.startsWith('slot-')) { return null; }
    return dropListId.substring('slot-'.length);
  }

  /**
   * V25D98-FRONT: handle a CDK drop onto the field-level drop list
   * (i.e., the player was dropped on the field but NOT inside any slot).
   *
   * <p>Computes the (xPercent, yPercent) of the drop point relative to the
   * field element and stores those values on the player. The marker
   * template will render at this position instead of the slot center.
   *
   * <p>The player's slotId is preserved (it's still in the canonical
   * formation, just visually offset). This keeps the chemistry / off-role
   * calculations valid while letting the user express their tactical tweak.
   *
   * <p>If the drag started from the bench and was dropped on the field,
   * we auto-promote the player to the closest subdivision slot to give
* them a sensible slotId (otherwise they'd render at the drop point but
    * not contribute to formation detection / chemistry preview).
    *
    * V25D99-FRONT: REPLACED handleFieldDrop with handleMarkerDragEnd.
    * Pre-V25D99 the field was a cdkDropList that captured free drops via
    * (cdkDropListDropped)="handleFieldDrop($event)". But this caused TWO
    * problems Iván reported repeatedly:
    *   1. cdkDropListSortingDisabled (added V25D98.2) suppressed dropped
    *      events when source===container — the 'solo deja mover 1 vez'
    *      bug remained even after removing it in V25D98.6.
    *   2. CDK's internal item tracking re-ordered the OTHER markers
    *      visually during drag ('no quiero que se muevan los otros').
    * Fix: the field is no longer a cdkDropList. Each marker captures its
    * own drag end via (cdkDragEnded)="handleMarkerDragEnd($event, player)"
    * and decides internally whether the drop point is on a slot (snap),
    * on the bench (move to bench) or free on the field (free positioning).
    * Slots remain cdkDropList only so CDK can render the drop-preview
    * highlight during drag — but no (cdkDropListDropped) handler fires
    * from slots; the marker's cdkDragEnded is the single source of truth.
    * This guarantees that EVERY drop fires exactly once and that
    * subsequent free drops always work (the '1 vez' bug is gone).
    */
  handleMarkerDragEnd(event: CdkDragEnd, player: PlayerOnFieldDto): void {
    if (!player) { return; }

    // 1. Compute drop position as % of the field bounding rect.
    const fieldEl = this.fieldContainer?.nativeElement;
    if (!fieldEl) { return; }
    const rect = fieldEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { return; }
    // CdkDragEnd.dropPoint is in client coordinates (clientX, clientY at
    // mouseup). Subtract the field's top-left to get field-relative coords.
    const dropX = event.dropPoint?.x ?? rect.left;
    const dropY = event.dropPoint?.y ?? rect.top;
    const xPct = Math.max(0, Math.min(100, ((dropX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((dropY - rect.top) / rect.height) * 100));

    // 2. Decide drop target by inspecting the drop point against each
    // candidate region. Order matters: bench first (since the bench
    // area is below the field), then slots, then free field.
    const benchEl = document.querySelector('.bench-container') as HTMLElement | null;
    if (benchEl) {
      const benchRect = benchEl.getBoundingClientRect();
      if (dropX >= benchRect.left && dropX <= benchRect.right
          && dropY >= benchRect.top && dropY <= benchRect.bottom) {
        this.movePlayerToBench(player);
        return;
      }
    }

const targetSlot = this.findSlotAtPosition(xPct, yPct);
    if (targetSlot) {
      // 3a. Snap to slot — call the shared slot-swap logic.
      if (player.slotId === targetSlot.subdivisionId) {
        // Dropped on the same slot the player came from — snap back to
        // canonical (clear any free-positioning override).
        this.applySlotAssignment(player, player.slotId, targetSlot.subdivisionId, /*swapOccupant=*/null);
      } else {
        const occupant = this.slotPlayerMap[targetSlot.subdivisionId] ?? null;
        this.applySlotAssignment(player, player.slotId, targetSlot.subdivisionId, occupant);
      }
      return;
    }

    // 3b. Free drop on the field (no slot under the cursor).
    // Promote bench players (no slotId) to closest subdivision so they
    // participate in chemistry / formation detection.
    if (!player.slotId || player.slotId === '') {
      const closest = this.findClosestSubdivision(xPct, yPct);
      if (closest) { player.slotId = closest.subdivisionId; }
    }

    player.xPercent = xPct;
    player.yPercent = yPct;
    // V25D98.4-FRONT: REMOVE the player from slotPlayerMap so the slot
    // is logically abandoned (click → inert, no popup showing player).
    if (player.slotId) {
      delete this.slotPlayerMap[player.slotId];
    }

    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  /**
   * V25D99-FRONT: find the subdivision whose bounding box contains the
   * given (xPercent, yPercent) field-relative coordinates. Returns null
   * if the point is in free space (outside any slot). Used by
   * handleMarkerDragEnd to decide between slot-snap and free positioning.
   */
  private findSlotAtPosition(xPct: number, yPct: number): FieldSubdivisionDTO | null {
    return this.subdivisions.find(s =>
      xPct >= s.left && xPct <= s.left + s.width
      && yPct >= s.top && yPct <= s.top + s.height
    ) ?? null;
  }

  /**
   * V25D99-FRONT: shared slot-swap logic. Called from handleMarkerDragEnd
   * (V25D99) and was the body of handleSlotDrop pre-V25D99. Centralizes
   * the "move player A into slot Y, possibly swapping with the current
   * occupant" flow so both drop paths use the same code.
   *
   * @param sourceSlotId null if the player came from the bench.
   * @param targetSlotId the slot to place the player into.
   * @param occupant the player currently in targetSlotId (or null if empty).
   */
  /**
   * V25D99-FRONT: shared slot-swap logic. Called from handleMarkerDragEnd
   * (V25D99) and from handleSlotDrop (legacy cdkDropListDropped wrapper).
   * Centralizes the "move player A into slot Y, possibly swapping with the
   * current occupant" flow so both drop paths use the same code.
   *
   * <p>Naming: there's already a click-handler `assignPlayerToSlot()` on the
   * component (assigns from the bench dropdown). This private helper is
   * the programmatic equivalent — same intent, different signature.
   *
   * @param sourceSlotId null if the player came from the bench.
   * @param targetSlotId the slot to place the player into.
   * @param occupant the player currently in targetSlotId (or null if empty).
   */
  private applySlotAssignment(
    player: PlayerOnFieldDto,
    sourceSlotId: string | null,
    targetSlotId: string,
    occupant: PlayerOnFieldDto | null
  ): void {
    // Step 1: free the source slot (if from a slot).
    if (sourceSlotId) {
      delete this.slotPlayerMap[sourceSlotId];
    }

    // Step 2: place player into target.
    player.slotId = targetSlotId;
    this.slotPlayerMap[targetSlotId] = player;
    // V25D98.2-FRONT: clear any free-positioning override so the marker
    // snaps to the new slot center. Without this, a player who was
    // free-dropped (xPercent/yPercent set) then dragged to a slot would
    // stay visually pinned at the OLD override position.
    delete player.xPercent;
    delete player.yPercent;

    // Step 3: handle the displaced occupant.
    if (occupant && occupant.playerId !== player.playerId) {
      if (sourceSlotId) {
        // SWAP: push the occupant back into the source slot.
        occupant.slotId = sourceSlotId;
        this.slotPlayerMap[sourceSlotId] = occupant;
        delete occupant.xPercent;
        delete occupant.yPercent;
      } else {
        // Source was bench → evict the occupant to the bench.
        occupant.slotId = '';
        delete occupant.xPercent;
        delete occupant.yPercent;
        this.benchPlayers$.next([...this.benchPlayers$.value, occupant]);
        this.homePlayers$.next(
          this.homePlayers$.value.filter(p => p.playerId !== occupant.playerId)
        );
      }
    }

    // Step 4: handle the source-side list updates (bench → field only).
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

  /**
   * V25D99-FRONT: move player to the bench. Extracted from handleBenchDrop
   * so handleMarkerDragEnd can call it without needing to synthesize a
   * fake CdkDragDrop event.
   */
  private movePlayerToBench(player: PlayerOnFieldDto): void {
    if (!player.slotId) { return; } // already on bench
    delete this.slotPlayerMap[player.slotId];
    player.slotId = '';
    // V25D98.2-FRONT: clear any free-positioning override too.
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

  /**
   * V25D98-FRONT: find the subdivision whose center is closest to the
   * given (xPercent, yPercent) drop point. Used when a bench player is
   * dropped onto the field and needs a sensible slotId to anchor the
   * chemistry/formation calculations.
   */
  private findClosestSubdivision(xPct: number, yPct: number): FieldSubdivisionDTO | null {
    let best: FieldSubdivisionDTO | null = null;
    let bestDist = Infinity;
    for (const sub of this.subdivisions) {
      const cx = sub.left + sub.width / 2;
      const cy = sub.top + sub.height / 2;
      const dx = cx - xPct;
      const dy = cy - yPct;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; best = sub; }
    }
    return best;
  }

  /**
   * V25D98-FRONT: marker X position with V25D98 free-positioning override.
   * Returns the player's stored xPercent if set (after a field drop),
   * otherwise the canonical slot center.
   */
  getMarkerX(player: PlayerOnFieldDto): number {
    if (typeof player.xPercent === 'number') { return player.xPercent; }
    if (!player.slotId) { return 50; }
    return this.getSlotCenterX(player.slotId);
  }

  /** V25D98-FRONT: marker Y position with override (see {@link getMarkerX}). */
  getMarkerY(player: PlayerOnFieldDto): number {
    if (typeof player.yPercent === 'number') { return player.yPercent; }
    if (!player.slotId) { return 50; }
    return this.getSlotCenterY(player.slotId);
  }

  /**
   * V25D98-FRONT: clear all customX/customY overrides on the current
   * lineup, snapping every marker back to its canonical slot center.
   * Does not touch the bench.
   */
  resetCustomPositions(): void {
    // V25D98.4-FRONT: when snapping back to canonical, also restore the
    // slotPlayerMap entry for each player (handleFieldDrop intentionally
    // removed it so the slot looked truly empty). Without this restore
    // the markers would snap to slot centers but the slots would remain
    // "unoccupied" in the slotPlayerMap → isSlotOccupied would return
    // false → chips would NOT reappear in slots. Reverse the V25D98.4
    // removal: re-add player to slotPlayerMap[player.slotId].
    for (const player of this.homePlayers$.value) {
      delete player.xPercent;
      delete player.yPercent;
      if (player.slotId) {
        this.slotPlayerMap[player.slotId] = player;
      }
    }
    this.homePlayers$.next([...this.homePlayers$.value]);
    this.saveLineup();
    this.triggerChemistryPreview();
    this.updateFormationDetection();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  /** V25D98-FRONT: true when any player on the field has a custom
   *  position override (used to enable/disable the Reset button). */
  hasCustomPositions(): boolean {
    return this.homePlayers$.value.some(p =>
      typeof p.xPercent === 'number' || typeof p.yPercent === 'number');
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
   * V25D96-FRONT F2: count role-family occurrences in the supplied list of
   * role strings. Used by {@link detectFormation} to compare the current
   * lineup's role distribution against each canonical formation's role
   * distribution (also derived from {@link FormationPositionDTO.role}
   * passed through {@link getRoleFamily}).
   *
   * <p>Why family-level (not exact role): a user's 4-4-2 lineup with all CBs
   * in the DEF slots and a couple of CMs in the MID slots is indistinguishable
   * from a user lineup with LB/CB in DEF slots — both families (4 DEF + 4 MID)
   * match. The family-level count keeps the comparison consistent across
   * formation variants (4-3-3 with 3 LW/CF/RW should still resolve to '4-3-3').
   */
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

  /**
   * V25D96-FRONT F2: detect which canonical formation (if any) the current
   * lineup matches. Counts players by role family on the field and compares
   * with each canonical formation's expected role counts.
   *
   * <p>Returns the canonical formation name (e.g. '4-4-2') when the lineup
   * matches one of {@link ALL_FORMATIONS} EXACTLY on family counts. Returns
   * {@link USER_FORMATION_LABEL} when:
   * <ul>
   *   <li>the lineup role counts don't match any canonical, OR</li>
   *   <li>the lineup is incomplete (< 11 players on field).</li>
   * </ul>
   *
   * <p>Side effect: updates {@code _isCustomLineup} so the template re-renders
   * the dropdown + marker visibility flags in the same CD pass.
   *
   * <p>Why a single combined check (incomplete OR non-canonical): an
   * incomplete lineup can never be a canonical match (canonical always
   * requires 11 players); shortcutting through that path avoids spurious
   * canonical matches when the lineup is e.g. 6 players matching a phantom
   * formation (defense-only mocks in some tests).
   */
  detectFormation(): string {
    const players = this.homePlayers.filter(p => !!p.slotId);
    const lineupCounts = this.countRoleFamily(players.map(p => p.role));

    if (players.length < 11) {
      this._isCustomLineup = true;
      return USER_FORMATION_LABEL;
    }

    for (const f of ALL_FORMATIONS) {
      const positions = this.formationPositions[f] || [];
      const canonicalCounts = this.countRoleFamily(positions.map(p => p.role));
      if (lineupCounts.gk === canonicalCounts.gk &&
          lineupCounts.def === canonicalCounts.def &&
          lineupCounts.mid === canonicalCounts.mid &&
          lineupCounts.att === canonicalCounts.att) {
        this._isCustomLineup = false;
        return f;
      }
    }

    this._isCustomLineup = true;
    return USER_FORMATION_LABEL;
  }

  /**
   * V25D96-FRONT helper: re-run {@link detectFormation} after a lineup
   * mutation (drop, assign, remove, bench-move) and trigger a re-render.
   * Doesn't return the formation name; only the side effect (updating
   * {@code _isCustomLineup} and refreshing the CD pipeline) is needed
   * at the call sites in {@code handleSlotDrop} / {@code assignPlayerToSlot}
   * / {@code removePlayerFromSlot}. The dropdown's {@code [ngModel]} binding
   * to {@code dropdownFormationValue} will pick up the new flag value on
   * the next CD pass; we explicitly markForCheck to make sure
   * OnPush-friendly consumers see the update.
   */
  updateFormationDetection(): void {
    this.detectFormation();
    this.cdr.markForCheck();
  }

  /**
   * V25D96-FRONT F4: returns true when the player's role doesn't match
   * the slot's recommended role in the active formation. Used to attach
   * the "off-role" badge + dashed orange border on the marker.
   *
   * <p>When the lineup is in canonical mode, the comparison is direct:
   * player.role vs the role attached to this subdivisionId in the active
   * canonical formation (the last formation the user picked from the
   * dropdown — same value used as the GET parameter for auto-select).
   *
   * <p>When the lineup is in custom mode ({@code _isCustomLineup}), the
   * "recommended" role for slots outside the canonical positions is empty,
   * so we still compare against the active canonical positions — even
   * though the marker is allowed to render at any slot. This keeps the
   * OFF badge consistent: a CB placed in a MID slot of 4-4-2 (where the
   * MID slot's recommended role is 'MID') shows OFF; a CB placed in a
   * slot that 4-4-2 doesn't even define has no role to compare → no badge.
   */
  isOffRole(player: PlayerOnFieldDto): boolean {
    if (!player.slotId) { return false; }
    const sub = this.subdivisions.find(s => s.subdivisionId === player.slotId);
    if (!sub) { return false; }
    const recommended = this.getRecommendedRole(sub);
    if (!recommended) { return false; }
    const playerFamily = this.getRoleFamily(player.role);
    const recommendedFamily = this.getRoleFamily(recommended);
    if (playerFamily === null || recommendedFamily === null) { return false; }
    return playerFamily !== recommendedFamily;
  }

  /**
   * V25D96-FRONT F3: the formation dropdown uses `[ngModel]` (one-way) +
   * `(ngModelChange)` rather than two-way `[(ngModel)]` because the display
   * value can be the {@link USER_FORMATION_LABEL} pseudo-value (when the
   * lineup doesn't match any canonical). Two-way binding would either:
   * (a) try to write USER_FORMATION_LABEL back into {@code selectedFormation}
   * breaking the canonical assumption, or
   * (b) overwrite the user's custom display value on every CD cycle.
   *
   * <p>This handler ignores USER_FORMATION_LABEL (defensive: it should never
   * fire since the option is `[disabled]="true"`, but if a future change
   * introduces a programmatic select that triggers this handler, we don't
   * want to crash). Everything else delegates to {@link onFormationChange}
   * which runs the auto-select HTTP and updates {@code selectedFormation}
   * + the underlying formation state. All the existing V25D91.5-FRONT F6
   * timeout + cd rules live inside {@code onFormationChange}.
   */
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

  /**
   * V25D96-FRONT: expose the {@link USER_FORMATION_LABEL} constant so the
   * template can reference it for the disabled `<option>` value. Template
   * binding doesn't see module-level imports directly.
   */
  get userFormationLabel(): string {
    return USER_FORMATION_LABEL;
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

    // V25D96-FRONT F2: auto-select always produces a canonical lineup (the
    // backend applies the formation-role matching), but we still re-run
    // detectFormation to (a) flip _isCustomLineup back to false after a
    // user-driven formation change and (b) be defensive against any future
    // backend anomaly that returns < 11 players or off-role slots.
    this.detectFormation();

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
        // V25D96-FRONT F2: an auto-select ALWAYS produces a canonical lineup
        // (the back ensures this), so this should always flip
        // _isCustomLineup back to false. We still call detectFormation
        // rather than blindly setting the flag to be defensive in case the
        // backend misbehaves (drops below 11 players, returns off-role slots).
        this.detectFormation();
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
    // V25D98-FRONT: incluye customXPercent/customYPercent si el player tiene
    // posición libre (free positioning por drag en field fuera de slots).
    // El back puede ignorar estos campos por backward compat.
    const playerIds: string[] = this.homePlayers.map(p => p.playerId);
    const slots: LineupSlotDTO[] = this.homePlayers
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
