import { Component, Inject, OnInit, ChangeDetectorRef, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subject, BehaviorSubject, takeUntil } from 'rxjs';
import { LineupWarningDTO } from '../../shared/models/lineup/lineup-warning.dto';
import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';
import { FormationDTO, FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';

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
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatIconModule],
  template: `
    <div class="squad-editor-container">
      <!-- Header -->
      <div class="squad-header">
        <h2>Editor de Formación</h2>
        <div class="formation-selector">
          <label>Formación:</label>
          <select [(ngModel)]="selectedFormation" (change)="onFormationChange()" [disabled]="isFormationChanging">
            <option *ngFor="let f of formations" [value]="f">{{f}}</option>
          </select>
          <span *ngIf="isFormationChanging" class="formation-change-blocked">(espera...)</span>
        </div>
        <button mat-icon-button (click)="close()" class="close-btn" title="Cerrar">✕</button>
      </div>

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

          <!-- SUBDIVISIONES COMO SLOTS (81 + 1 GK) -->
          <div class="field-slots">
            <ng-container *ngFor="let sub of subdivisions; let i = index">
              <!-- Slot de arquero (sector 26) -->
              <ng-container *ngIf="sub.isGoalkeeper">
                <div class="slot slot-gk"
                     [style.left.%]="sub.left"
                     [style.top.%]="sub.top"
                     [style.width.%]="sub.width"
                     [style.height.%]="sub.height"
                     [class.occupied]="isSlotOccupied(sub)"
                     [class.missing-player]="isMissingPlayer(sub)"
                     (click)="onSlotClick(sub)">
                  <span class="slot-id">{{sub.subdivisionId}}</span>
                  <div *ngIf="getPlayerInSlot(sub) as player" class="player-chip">
                    {{player.name | slice:0:10}}
                  </div>
                  <div *ngIf="isMissingPlayer(sub)" class="missing-indicator">
                    {{getRecommendedRole(sub)}}
                  </div>
                </div>
              </ng-container>

              <!-- Slots normales (3 por sector) -->
              <ng-container *ngIf="!sub.isGoalkeeper">
                <div class="slot"
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
                     (click)="onSlotClick(sub)">
                  <span class="slot-id">{{sub.subdivisionId}}</span>
                  <div *ngIf="getPlayerInSlot(sub) as player" class="player-chip">
                    {{player.name | slice:0:10}}
                  </div>
                  <div *ngIf="isMissingPlayer(sub)" class="missing-indicator">
                    {{getRecommendedRole(sub)}}
                  </div>
                </div>
              </ng-container>
            </ng-container>
          </div>

          <!-- Marcadores de jugadores activos -->
          <ng-container *ngFor="let player of homePlayers; let i = index">
            <div *ngIf="player.slotId"
                 class="player-marker"
                 [style.left.%]="getSlotCenterX(player.slotId)"
                 [style.top.%]="getSlotCenterY(player.slotId)"
                 [class.gk-player]="player.role === 'GK'">
              <div class="player-number">{{i + 1}}</div>
            </div>
          </ng-container>

          <!-- Spinner de carga -->
          <div *ngIf="loadingFormation" class="field-loading-overlay">
            <div class="field-spinner"></div>
          </div>
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
      width: 95vw;
      max-width: 900px;
      height: 90vh;
      background: linear-gradient(180deg, #1a472a 0%, #2d5a3d 100%);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .squad-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.4);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
    }

    .close-btn {
      color: #a0d4a8;
    }

    /* Field Container */
    .field-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      overflow: hidden;
    }

    /* Field */
    .field {
      position: relative;
      width: 100%;
      max-width: 500px;
      height: 100%;
      max-height: 700px;
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
      overflow: hidden;
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

    .slot-id {
      font-size: 0.55rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: bold;
    }

    .player-chip {
      font-size: 0.5rem;
      color: #fff;
      background: rgba(0, 0, 0, 0.5);
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90%;
    }

    /* Player Marker (número sobre el campo) */
    .player-marker {
      position: absolute;
      width: 32px;
      height: 32px;
      transform: translate(-50%, -50%);
      z-index: 20;
      pointer-events: none;
    }

    .player-number {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
      border: 2px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.85rem;
      color: #fff;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }

    .player-marker.gk-player .player-number {
      background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%);
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

    /* Responsive */
    @media (max-width: 768px) {
      .squad-editor-container {
        width: 98vw;
        height: 80vh;
      }

      .field {
        max-height: 300px;
      }

      .slot-id {
        font-size: 0.4rem;
      }

      .player-chip {
        display: none;
      }

      .squad-header h2 {
        font-size: 1.1rem;
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

  /** Formaciones disponibles */
  formations = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1'];

  /** Cache de posiciones de formación */
  private formationPositions: { [key: string]: FormationPositionDTO[] } = {};

  /** Mapping slotId -> player */
  private slotPlayerMap: { [slotId: string]: PlayerOnFieldDto } = {};

  /** Loading state for formation changes */
  loadingFormation$ = new BehaviorSubject<boolean>(false);

  /** Flag para evitar que onFormationChange se dispare durante carga inicial */
  private isInitializing = true;
  isFormationChanging = false;

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
    @Inject(MAT_DIALOG_DATA) public data: { matchId: string },
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Formation changes are now immediate (backend is fast)
    this.loadSubdivisions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
        // Usar la formación seleccionada si no viene del backend
        const formationName = response?.formation || this.selectedFormation || '4-4-2';
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

        // Convertir jugadores del response
        const allPlayers: PlayerOnFieldDto[] = playersList.map((p: any) => ({
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
            if (player.position === posRole) {
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
    this.cdr.detectChanges();
  }

  /** Cambia la formación - espera a que termine el ciclo completo incluyendo predicción */
  onFormationChange(): void {
    // Bloquear si hay un cambio en progreso
    if (this.isFormationChanging) {
      console.log('[SQUAD-EDITOR] Formation change blocked - waiting for previous change to complete');
      return;
    }

    // Ignorar cambios durante inicialización (evita NG0100)
    if (this.isInitializing) {
      return;
    }

    // Bloquear nuevos cambios mientras carga
    this.isFormationChanging = true;

    // Resetear el subject para esperar nueva confirmación
    this.formationChangeCompleteSubject = new Subject<void>();

    const newFormation = this.selectedFormation;
    this.homeFormation$.next(newFormation);

    // Ejecutar cambio y esperar a que termine (save en Redis completo)
    this.executeFormationChange(newFormation).then(() => {
      // Emitir el subject para que el padre pueda completar cuando la predicción esté lista
      this.formationChangeComplete.emit(this.formationChangeCompleteSubject);

      // Solo DESBLOQUEAR cuando el subject complete (cuando predicción termine)
      this.formationChangeCompleteSubject.subscribe({
        next: () => {
          this.isFormationChanging = false;
          this.cdr.detectChanges();
        },
        error: () => {
          // También desbloquear en caso de error
          this.isFormationChanging = false;
          this.cdr.detectChanges();
        }
      });

      this.cdr.detectChanges();
    }).catch(() => {
      // También desbloquear en caso de error
      this.isFormationChanging = false;
      this.formationChangeCompleteSubject.complete();
    });
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

    // Convertir jugadores del response
    const allPlayers: PlayerOnFieldDto[] = playersList.map((p: any) => ({
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
        if (player.position === posRole) {
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

    this.cdr.detectChanges();
  }

  /** Ejecuta el cambio de formación - retorna Promise para esperar completado */
  private executeFormationChange(newFormation: string): Promise<void> {
    const startTime = performance.now();
    this.loadingFormation$.next(true);

    // Retornar Promise que se resuelve cuando termine el HTTP call
    return new Promise((resolve, reject) => {
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
          resolve(); // Resolver Promise
        },
        error: (err) => {
          this.loadingFormation$.next(false);
          const elapsed = (performance.now() - startTime).toFixed(0);
          console.error(`[SQUAD-EDITOR] Auto-select ERROR after ${elapsed}ms:`, err);
          this.errorMessage$.next('Error al auto-seleccionar jugadores');
          this.cdr.detectChanges();
          resolve(); // También resolver en caso de error para no bloquear
        }
      });
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
      this.errorMessage$.next('Mínimo 7 jugadores para guardar');
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
