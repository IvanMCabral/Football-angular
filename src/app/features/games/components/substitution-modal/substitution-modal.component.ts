import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, from, of, takeUntil } from 'rxjs';
import { concatMap, finalize, switchMap, timeout, toArray } from 'rxjs/operators';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { SubModalPlayer, SubstitutionResult, V24LivePlayerRating } from '../../../../core/services/match-engine.model';

export interface SubstitutionDialogData {
  matchId: string;
  currentMinute: number;
  score?: {
    home: number;
    away: number;
  };
  startingXi: SubModalPlayer[];
  bench: SubModalPlayer[];
  substitutionsRemaining: number;
    /** Position effectiveness by player id, from 0 to 1. */
  effectivenessMap?: Record<string, number>;
    /** Live formation of the manager team, for example "4-4-2". */
  formation?: string;
    /** Per-player live stats shown as chips on the visual pitch. */
  playerRatings?: V24LivePlayerRating[];
    /** Side of the match controlled by the manager. */
  managerSide?: 'HOME' | 'AWAY';
    /** Optional starter id to preselect as the player leaving the pitch. */
  preSelectedPlayerId?: string;
    /** Reason shown in the modal header when it was opened automatically. */
  reason?: 'INJURY_FORCED_SUBSTITUTION' | 'MANUAL';
}

type CoachObjective = 'NEED_GOAL' | 'PROTECT_RESULT' | 'NEUTRAL';

/** Row rendered on the visual pitch inside the substitution modal. */
interface PitchLine {
  category: 'GK' | 'DEF' | 'MID' | 'WINGER' | 'ATT';
  players: SubModalPlayer[];
}

interface PendingSubstitution {
  playerOffId: string;
  playerOnId: string;
  playerOffName: string;
  playerOnName: string;
}

interface PlayerPositionTweak {
  x: number;
  y: number;
}

interface RecommendedSubstitution {
  playerOff: SubModalPlayer;
  playerOn: SubModalPlayer;
  reason: string;
  score: number;
  kind?: 'medical' | 'tactical';
}

/**
 * Substitution modal used during live matches.
 *
 * Shows the current XI on a visual pitch, lets the manager select the player
 * leaving the pitch, and lists available bench players as swap-in candidates.
 */
@Component({
  selector: 'app-substitution-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './substitution-modal.component.html',
  styleUrls: ['./substitution-modal.component.css'],
  // Pitch and chip styles stay inline because visual tests inspect component styles.
  styles: [`
    .v25d79-pitch {
      position: relative;
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%);
      border-radius: 8px;
      padding: 0.6rem 0.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      border: 2px solid #fff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
      min-height: 280px;
      justify-content: space-around;
      margin-bottom: 0.75rem;
      overflow: hidden;
    }
    .v25d79-pitch::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 2px;
      background: rgba(255, 255, 255, 0.68);
      transform: translateY(-50%);
      pointer-events: none;
    }
    .v25d79-pitch::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 64px;
      height: 64px;
      border: 2px solid rgba(255, 255, 255, 0.72);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .v25d79-pitch-line {
      display: flex;
      justify-content: space-around;
      align-items: center;
      min-height: 36px;
      gap: 6px;
      position: relative;
      z-index: 1;
    }
    .v25d79-pitch-dot {
      position: relative;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid #1e3c72;
      font-size: 0.65rem;
      font-weight: 700;
      color: #1e3c72;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      padding: 2px;
      box-sizing: border-box;
      --nudge-x: 0px;
      --nudge-y: 0px;
      --dot-scale: 1;
      transform: translate(var(--nudge-x), var(--nudge-y)) scale(var(--dot-scale));
      transition: transform 0.1s ease;
      user-select: none;
    }
    .v25d79-pitch-dot:hover { --dot-scale: 1.06; }
    .v25d79-pitch-dot.is-gk  { background: #ffc107; border-color: #ff6f00; }
    .v25d79-pitch-dot.is-def { background: #bbdefb; }
    .v25d79-pitch-dot.is-mid,
    .v25d79-pitch-dot.is-winger { background: #c8e6c9; }
    .v25d79-pitch-dot.is-att { background: #ffcdd2; border-color: #b71c1c; color: #b71c1c; }
    .v25d79-pitch-dot.selected {
      box-shadow: 0 0 0 3px #d32f2f, 0 1px 3px rgba(0, 0, 0, 0.3);
      --dot-scale: 1.08;
    }
    .v25d79-pitch-dot.is-injury-target {
      box-shadow: 0 0 0 3px #dc2626, 0 0 16px rgba(220, 38, 38, 0.55), 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .v25d79-pitch-dot.is-injury-target::after {
      content: 'LES';
      position: absolute;
      right: -8px;
      bottom: -8px;
      padding: 2px 5px;
      border-radius: 999px;
      background: #dc2626;
      color: #fff;
      font-size: 0.5rem;
      font-weight: 900;
      letter-spacing: 0.04em;
    }
    .v25d79-pitch-dot.eff-good   { border-color: #10b981; }
    .v25d79-pitch-dot.eff-warning { border-color: #f59e0b; }
    .v25d79-pitch-dot.eff-bad    { border-color: #ef4444; }
    .v25d79-pitch-dot.is-disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .v25d79-pitch-dot.is-disabled:hover { --dot-scale: 1; }
    .v25d79-dot-pos {
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1;
    }
    .v25d79-dot-name {
      font-size: 0.55rem;
      font-weight: 500;
      line-height: 1;
      max-width: 50px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #374151;
    }
    .v25d79-dot-rating {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e3c72;
      line-height: 1;
    }
    .v25d79-dot-chips {
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
      max-width: 70px;
      justify-content: center;
    }
    .v25d79-chip {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 999px;
      font-size: 0.55rem;
      font-weight: 700;
      background: #1e3c72;
      color: #fff;
      line-height: 1;
      min-width: 12px;
      text-align: center;
    }
    .v25d79-chip-goals      { background: #16a34a; }
    .v25d79-chip-key-passes  { background: #0891b2; }
    .v25d79-chip-yellows     { background: #f59e0b; }
    .v25d79-chip-fouls       { background: #6b7280; }
    .v25d79-chip-injuries    { background: #dc2626; }
    .v25d79-actions-summary {
      margin-top: 0.5rem;
      padding: 0.5rem 0.6rem;
      background: #f5f7fa;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .v25d79-actions-summary .label {
      font-size: 0.78rem;
      color: #5a6473;
      font-weight: 600;
    }
    .v25d79-actions-summary .name {
      font-size: 0.85rem;
      color: #1e3c72;
      font-weight: 700;
    }
    .v25d79-actions-summary .arrow {
      font-size: 1.1rem;
      color: #2e7d32;
      font-weight: 700;
    }
    .v25d79-remaining {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      background: #e0e0e0;
      color: #1e3c72;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .v25d79-remaining.is-zero {
      background: #ffebee;
      color: #b71c1c;
    }
    /* Reason badge shown when the modal opens from an injury prompt. */
    .reason-badge {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.15rem 0.6rem;
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      vertical-align: middle;
    }
    .sub-flow-guide {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.65rem;
      padding: 0.45rem 0.55rem;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #eff6ff;
      color: #1e3a8a;
      flex-wrap: wrap;
    }
    .flow-step {
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      background: #dbeafe;
      font-size: 0.74rem;
      font-weight: 700;
    }
    .flow-step.active {
      background: #1d4ed8;
      color: #fff;
    }
    .flow-step.done {
      background: #dcfce7;
      color: #166534;
    }
    .flow-arrow {
      color: #64748b;
      font-weight: 800;
    }
    .banner-injury-context {
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
      margin-bottom: 0.65rem;
    }
    .injury-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background: #dc2626;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 900;
      letter-spacing: 0.04em;
    }
    .queue-change-btn {
      margin-top: 0.5rem;
      width: 100%;
    }
    .fine-tune-panel {
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 10px;
      padding: 0.65rem;
      background: rgba(15, 23, 42, 0.04);
      margin-top: 0.65rem;
    }
    .fine-tune-title {
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.35rem;
    }
    .fine-tune-text {
      font-size: 0.82rem;
      color: #475569;
      margin-bottom: 0.45rem;
    }
    .fine-tune-controls {
      display: grid;
      grid-template-columns: repeat(3, 36px);
      grid-template-rows: repeat(3, 32px);
      gap: 4px;
      justify-content: center;
      align-items: center;
    }
    .fine-tune-controls button {
      min-width: 0;
      padding: 0;
      line-height: 1;
    }
    .fine-tune-controls .up { grid-column: 2; grid-row: 1; }
    .fine-tune-controls .left { grid-column: 1; grid-row: 2; }
    .fine-tune-controls .reset { grid-column: 2; grid-row: 2; font-size: 0.68rem; }
    .fine-tune-controls .right { grid-column: 3; grid-row: 2; }
    .fine-tune-controls .down { grid-column: 2; grid-row: 3; }
    .fine-tune-coords {
      text-align: center;
      margin-top: 0.35rem;
      color: #0f766e;
      font-weight: 800;
      font-size: 0.76rem;
    }
    .pending-sub-list {
      margin-top: 0.75rem;
      padding: 0.65rem;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      background: #f0fdf4;
    }
    .pending-sub-list h3 {
      margin: 0 0 0.45rem;
      color: #14532d;
      font-size: 0.9rem;
      font-weight: 800;
    }
    .pending-sub-row {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr auto;
      gap: 0.4rem;
      align-items: center;
      padding: 0.35rem 0.45rem;
      border-radius: 6px;
      background: #fff;
      border: 1px solid #dcfce7;
      margin-bottom: 0.35rem;
    }
    .pending-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      background: #16a34a;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 900;
    }
    .pending-name {
      font-weight: 700;
      color: #1e3a8a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pending-name.off {
      color: #991b1b;
    }
    .pending-name.on {
      color: #166534;
    }
    .pending-arrow {
      color: #15803d;
      font-weight: 900;
    }
    .pending-remove {
      min-width: auto;
      padding: 0 0.35rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubstitutionModalComponent {

  readonly data: SubstitutionDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SubstitutionModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  playerOffId: string | null = null;
  playerOnId: string | null = null;
  pendingChanges: PendingSubstitution[] = [];
  selectedFineTunePlayerId: string | null = null;
  positionTweaks: Map<string, PlayerPositionTweak> = new Map();
  errorMsg: string = '';
  isSubmitting = false;
  private destroy$ = new Subject<void>();

  // Pre-select the outgoing player when the modal opens from an injury prompt.
  ngOnInit(): void {
    if (this.data.preSelectedPlayerId) {
      const target = this.data.startingXi.find(
        p => p.sessionPlayerId === this.data.preSelectedPlayerId
      );
    if (target) {
        this.playerOffId = target.sessionPlayerId;
        this.selectedFineTunePlayerId = target.sessionPlayerId;
      }
    }
  }

  get playerOff(): SubModalPlayer | null {
    return this.data.startingXi.find(p => p.sessionPlayerId === this.playerOffId) ?? null;
  }

  get playerOn(): SubModalPlayer | null {
    return this.data.bench.find(p => p.sessionPlayerId === this.playerOnId) ?? null;
  }

  get availableBench(): SubModalPlayer[] {
    const pendingOnIds = new Set(this.pendingChanges.map(change => change.playerOnId));
    return this.data.bench.filter(p =>
      !pendingOnIds.has(p.sessionPlayerId) || p.sessionPlayerId === this.playerOnId
    );
  }

  get canConfirm(): boolean {
    return !this.isSubmitting
      && this.data.substitutionsRemaining > 0
      && (this.pendingChanges.length > 0 || this.canAddPendingChange);
  }

  get canAddPendingChange(): boolean {
    return !!(this.playerOffId && this.playerOnId
      && this.playerOffId !== this.playerOnId
      && this.pendingChanges.length < this.data.substitutionsRemaining
      && !this.pendingChanges.some(change =>
        change.playerOffId === this.playerOffId || change.playerOnId === this.playerOnId
      ));
  }

  get isOutOfSubs(): boolean {
    return this.data.substitutionsRemaining <= 0;
  }

  get coachObjective(): CoachObjective {
    const minute = this.data.currentMinute ?? 0;
    const home = this.data.score?.home ?? 0;
    const away = this.data.score?.away ?? 0;
    const managerGoals = this.data.managerSide === 'AWAY' ? away : home;
    const rivalGoals = this.data.managerSide === 'AWAY' ? home : away;
    const delta = managerGoals - rivalGoals;
    if (delta < 0) {
      return 'NEED_GOAL';
    }
    if (delta > 0 && minute >= 60) {
      return 'PROTECT_RESULT';
    }
    if (delta === 0 && minute >= 75) {
      return 'NEED_GOAL';
    }
    return 'NEUTRAL';
  }

  get coachObjectiveLabel(): string {
    switch (this.coachObjective) {
      case 'NEED_GOAL': return 'Necesito gol';
      case 'PROTECT_RESULT': return 'Cuidar resultado';
      default: return 'Neutral';
    }
  }

  get coachObjectiveClass(): string {
    switch (this.coachObjective) {
      case 'NEED_GOAL': return 'objective-attack';
      case 'PROTECT_RESULT': return 'objective-protect';
      default: return 'objective-neutral';
    }
  }

  get coachObjectiveText(): string {
    const minute = this.data.currentMinute ?? 0;
    const home = this.data.score?.home ?? 0;
    const away = this.data.score?.away ?? 0;
    const managerGoals = this.data.managerSide === 'AWAY' ? away : home;
    const rivalGoals = this.data.managerSide === 'AWAY' ? home : away;
    const delta = managerGoals - rivalGoals;
    if (this.coachObjective === 'NEED_GOAL') {
      return delta < 0
        ? `Vas ${Math.abs(delta)} abajo al ${minute}'. Prioridad: sumar amenaza, tiros y llegada.`
        : `Empate avanzado al ${minute}'. Prioridad: encontrar un cambio que aumente peligro sin romper el equipo.`;
    }
    if (this.coachObjective === 'PROTECT_RESULT') {
      return `Vas ${delta} arriba al ${minute}'. Prioridad: bajar riesgo rival y sostener estructura.`;
    }
    return `Partido equilibrado al ${minute}'. Prioridad: mantener coherencia y mejorar sin forzar.`;
  }

  get recommendedSubstitution(): RecommendedSubstitution | null {
    return this.medicalRecommendedSubstitution ?? this.tacticalRecommendedSubstitution;
  }

  get tacticalAlternativeSubstitution(): RecommendedSubstitution | null {
    const medical = this.medicalRecommendedSubstitution;
    if (!medical) {
      return null;
    }
    return this.buildTacticalRecommendedSubstitution(new Set([medical.playerOff.sessionPlayerId]));
  }

  private get medicalRecommendedSubstitution(): RecommendedSubstitution | null {
    const starting = this.data.startingXi.filter(p => !this.isGoalkeeper(p));
    const bench = this.availableBench.filter(p => !this.isGoalkeeper(p));
    if (starting.length === 0 || bench.length === 0 || this.isOutOfSubs) {
      return null;
    }

    const injured = this.activeInjuredStarter();
    if (!injured) {
      return null;
    }

    const pairs = bench
      .filter(on => on.sessionPlayerId !== injured.sessionPlayerId)
      .map(on => this.scoreRecommendedSubstitution(injured, on, 'medical'));

    return pairs.sort((a, b) => b.score - a.score)[0] ?? null;
  }

  private get tacticalRecommendedSubstitution(): RecommendedSubstitution | null {
    return this.buildTacticalRecommendedSubstitution();
  }

  private buildTacticalRecommendedSubstitution(excludedOffIds: Set<string> = new Set()): RecommendedSubstitution | null {
    const starting = this.data.startingXi.filter(p => !this.isGoalkeeper(p));
    const bench = this.availableBench.filter(p => !this.isGoalkeeper(p));
    if (starting.length === 0 || bench.length === 0 || this.isOutOfSubs) {
      return null;
    }

    const forcedOff = this.data.preSelectedPlayerId
      ? starting.find(p => p.sessionPlayerId === this.data.preSelectedPlayerId) ?? null
      : null;
    const pairs: RecommendedSubstitution[] = [];
    const offCandidates = (forcedOff ? [forcedOff] : starting)
      .filter(off => !excludedOffIds.has(off.sessionPlayerId));
    for (const off of offCandidates) {
      for (const on of bench) {
        if (off.sessionPlayerId === on.sessionPlayerId) {
          continue;
        }
        pairs.push(this.scoreRecommendedSubstitution(off, on, 'tactical'));
      }
    }
    const best = pairs.sort((a, b) => b.score - a.score)[0] ?? null;
    if (best && this.coachObjective === 'PROTECT_RESULT' && best.score < 8) {
      return null;
    }
    return best;
  }

  get recommendedSubstitutionText(): string {
    const rec = this.recommendedSubstitution;
    if (!rec) {
      if (this.coachObjective === 'PROTECT_RESULT') {
        return 'Sin recomendación clara para cerrar: no hay un cambio automático suficientemente seguro. Mantené estructura o elegí manualmente.';
      }
      return 'Sin recomendación clara: faltan suplentes válidos o no quedan cambios.';
    }
    return `${rec.playerOff.displayName} → ${rec.playerOn.displayName}. ${rec.reason}`;
  }

  applyRecommendedSubstitution(): void {
    const rec = this.recommendedSubstitution;
    if (!rec) {
      return;
    }
    this.selectOff(rec.playerOff);
    this.selectOn(rec.playerOn);
  }

  selectOff(p: SubModalPlayer): void {
    if (this.isOutOfSubs) { return; }
    if (this.pendingChanges.some(change => change.playerOffId === p.sessionPlayerId)) {
      this.errorMsg = 'Ese jugador ya está preparado para salir en otro cambio.';
      return;
    }
    this.playerOffId = p.sessionPlayerId;
    this.selectedFineTunePlayerId = p.sessionPlayerId;
    this.errorMsg = '';
  }

  selectOn(p: SubModalPlayer): void {
    if (this.pendingChanges.some(change => change.playerOnId === p.sessionPlayerId)) {
      this.errorMsg = 'Ese suplente ya está preparado para entrar en otro cambio.';
      return;
    }
    this.playerOnId = p.sessionPlayerId;
    if (!this.isGoalkeeper(p)) {
      this.selectedFineTunePlayerId = p.sessionPlayerId;
    }
    this.errorMsg = '';
  }

  handlePitchPlayerClick(p: SubModalPlayer): void {
    const isIncomingPreview = this.playerOnId === p.sessionPlayerId
      || this.pendingChanges.some(change => change.playerOnId === p.sessionPlayerId);
    if (isIncomingPreview) {
      this.selectFineTunePlayer(p);
      return;
    }
    this.selectOff(p);
  }

  isInjuryTarget(sessionPlayerId: string): boolean {
    return this.data.reason === 'INJURY_FORCED_SUBSTITUTION'
      && this.data.preSelectedPlayerId === sessionPlayerId;
  }

  clearOff(event: Event): void {
    event.stopPropagation();
    this.playerOffId = null;
  }

  clearOn(event: Event): void {
    event.stopPropagation();
    this.playerOnId = null;
  }

  addPendingChange(): void {
    if (!this.canAddPendingChange || !this.playerOff || !this.playerOn || !this.playerOffId || !this.playerOnId) {
      return;
    }
    this.pendingChanges = [
      ...this.pendingChanges,
      {
        playerOffId: this.playerOffId,
        playerOnId: this.playerOnId,
        playerOffName: this.playerOff.displayName,
        playerOnName: this.playerOn.displayName
      }
    ];
    this.playerOffId = null;
    this.playerOnId = null;
    this.errorMsg = '';
  }

  removePendingChange(index: number): void {
    this.pendingChanges = this.pendingChanges.filter((_change, idx) => idx !== index);
  }

  selectFineTunePlayer(p: SubModalPlayer, event?: Event): void {
    event?.stopPropagation();
    if (this.isOutOfSubs || this.isGoalkeeper(p)) {
      return;
    }
    this.selectedFineTunePlayerId = p.sessionPlayerId;
    this.errorMsg = '';
  }

  canFineTuneSelectedPlayer(): boolean {
    const player = this.effectiveStartingXi.find(p => p.sessionPlayerId === this.selectedFineTunePlayerId)
      ?? this.data.startingXi.find(p => p.sessionPlayerId === this.selectedFineTunePlayerId);
    return !!player && !this.isGoalkeeper(player);
  }

  nudgeSelectedPlayer(dx: number, dy: number): void {
    if (!this.selectedFineTunePlayerId || !this.canFineTuneSelectedPlayer()) {
      return;
    }
    const current = this.positionTweaks.get(this.selectedFineTunePlayerId) ?? { x: 0, y: 0 };
    this.positionTweaks.set(this.selectedFineTunePlayerId, {
      x: this.clampPixelTweak(current.x + dx),
      y: this.clampPixelTweak(current.y + dy)
    });
  }

  resetSelectedPlayerPosition(): void {
    if (!this.selectedFineTunePlayerId) {
      return;
    }
    this.positionTweaks.delete(this.selectedFineTunePlayerId);
  }

  getFineTuneX(sessionPlayerId: string): number {
    return this.positionTweaks.get(sessionPlayerId)?.x ?? 0;
  }

  getFineTuneY(sessionPlayerId: string): number {
    return this.positionTweaks.get(sessionPlayerId)?.y ?? 0;
  }

  getFineTuneLabel(): string {
    const player = this.effectiveStartingXi.find(p => p.sessionPlayerId === this.selectedFineTunePlayerId)
      ?? this.data.startingXi.find(p => p.sessionPlayerId === this.selectedFineTunePlayerId);
    if (!player) {
      return 'Seleccioná un jugador de cancha para ajustar píxeles.';
    }
    if (this.isGoalkeeper(player)) {
      return 'El arquero queda fijo en el área chica.';
    }
    const tweak = this.positionTweaks.get(player.sessionPlayerId);
    if (!tweak) {
      return `${player.displayName}: posición base`;
    }
    return `${player.displayName}: X ${tweak.x}px · Y ${tweak.y}px`;
  }

  confirm(): void {
    if (!this.canConfirm) {
      return;
    }
    const changes = this.pendingChanges.length > 0
      ? this.pendingChanges
      : this.currentSelectionAsPending();
    if (changes.length === 0) {
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';
    let formationSaveAttempted = false;
    from(changes)
      .pipe(
        concatMap(change => this.engineService.substitutePlayer(
          this.data.matchId,
          change.playerOffId,
          change.playerOnId
        )),
        toArray(),
        switchMap(results => {
          const failed = results.find(result => !result.success && !this.isAlreadyAppliedSubstitutionResult(result));
          if (failed || this.positionTweaks.size === 0) {
            return of({ results, formationResult: null });
          }
          formationSaveAttempted = true;
          return this.engineService.changeFormation(
            this.data.matchId,
            this.buildLiveFormationSlots(changes),
            this.data.formation || '4-4-2'
          ).pipe(
            timeout(15000),
            switchMap(formationResult => of({ results, formationResult }))
          );
        }),
        timeout(25000),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ results, formationResult }) => {
          const failed = results.find(result => !result.success && !this.isAlreadyAppliedSubstitutionResult(result));
          if (!failed) {
            this.snackBar.open(
              changes.length > 1
                ? `Sustituciones realizadas (${changes.length})`
                : `Sustitución realizada (minuto ${results[0]?.minuteApplied ?? this.data.currentMinute})`,
              'OK',
              { duration: 3000, panelClass: 'success-toast' }
            );
            const firstChange = changes[0];
            this.dialogRef.close({
              success: true,
              result: results[results.length - 1],
              results,
              formationResult,
              substitutionsApplied: changes.length,
              substitutions: changes,
              playerOffId: firstChange.playerOffId,
              playerOnId: firstChange.playerOnId
            });
          } else {
            this.errorMsg = failed.error || 'Sustitución rechazada por el servidor';
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          this.errorMsg = formationSaveAttempted
            ? 'La sustitución se aplicó, pero falló el guardado del ajuste de posición. Podés cerrar y reabrir Partido/Formación para revisar la táctica.'
            : this.formatSubstitutionError(err);
          this.cdr.markForCheck();
        }
      });
  }

  private isAlreadyAppliedSubstitutionResult(result: SubstitutionResult): boolean {
    if (result.success) {
      return false;
    }
    const error = (result.error || '').toLowerCase();
    return error.includes('already been substituted off')
      || error.includes('already been substituted on')
      || error.includes('is on the pitch already');
  }

  private formatSubstitutionError(err: unknown): string {
    const candidate = err as {
      error?: { error?: string; message?: string; detail?: string } | string;
      message?: string;
      status?: number;
    };
    if (typeof candidate.error === 'string' && candidate.error.trim()) {
      return candidate.error;
    }
    const serverError = typeof candidate.error === 'object' && candidate.error !== null
      ? candidate.error
      : null;
    const serverMessage = serverError?.error || serverError?.message || serverError?.detail;
    if (serverMessage) {
      return serverMessage;
    }
    if (candidate.status && candidate.status >= 400 && candidate.status < 500) {
      return `Sustitución rechazada por el servidor (HTTP ${candidate.status}).`;
    }
    if (candidate.message && candidate.message !== 'network') {
      return candidate.message;
    }
    return 'Error de red al intentar la sustitución';
  }

  private currentSelectionAsPending(): PendingSubstitution[] {
    if (!this.playerOff || !this.playerOn || !this.playerOffId || !this.playerOnId || !this.canAddPendingChange) {
      return [];
    }
    return [{
      playerOffId: this.playerOffId,
      playerOnId: this.playerOnId,
      playerOffName: this.playerOff.displayName,
      playerOnName: this.playerOn.displayName
    }];
  }

  private stagedChanges(): PendingSubstitution[] {
    const current = this.currentSelectionAsPending();
    return current.length > 0
      ? [...this.pendingChanges, ...current]
      : this.pendingChanges;
  }

  private buildLiveFormationSlots(changes: PendingSubstitution[]): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }> {
    const finalXi = this.data.startingXi.map(starter => {
      const change = changes.find(c => c.playerOffId === starter.sessionPlayerId);
      const benchPlayer = change
        ? this.data.bench.find(p => p.sessionPlayerId === change.playerOnId)
        : null;
      return benchPlayer ? { ...benchPlayer, isStarter: true } : starter;
    });
    const visibleLines = this.buildPitchLines(finalXi);
    const slots: Array<{
      sessionPlayerId: string;
      position: string;
      slotIndex: number;
      customXPercent?: number | null;
      customYPercent?: number | null;
    }> = [];
    let slotIndex = 0;
    visibleLines.forEach((line, lineIndex) => {
      line.players.forEach((player, playerIndex) => {
        const base = this.basePercentForVisualSlot(lineIndex, playerIndex, line.players.length, visibleLines.length);
        const incomingChange = changes.find(change => change.playerOnId === player.sessionPlayerId);
        const tweak = this.positionTweaks.get(player.sessionPlayerId)
          ?? (incomingChange ? this.positionTweaks.get(incomingChange.playerOffId) : undefined);
        const percentPerPixel = 0.12;
        slots.push({
          sessionPlayerId: player.sessionPlayerId,
          position: player.position || line.category,
          slotIndex,
          customXPercent: tweak ? this.clampPercent(base.x + tweak.x * percentPerPixel) : null,
          customYPercent: tweak ? this.clampPercent(base.y + tweak.y * percentPerPixel) : null
        });
        slotIndex++;
      });
    });
    return slots;
  }

  cancel(): void {
    this.dialogRef.close({ success: false, reason: 'cancelled' });
  }

  get effectiveStartingXi(): SubModalPlayer[] {
    const changes = this.stagedChanges();
    if (changes.length === 0) {
      return this.data.startingXi;
    }
    return this.data.startingXi.map(starter => {
      const change = changes.find(c => c.playerOffId === starter.sessionPlayerId);
      if (!change) {
        return starter;
      }
      const benchPlayer = this.data.bench.find(p => p.sessionPlayerId === change.playerOnId);
      if (!benchPlayer) {
        return starter;
      }
      return { ...benchPlayer, isStarter: true };
    });
  }

  /** trackBy for *ngFor on player lists. */
  trackByPlayer = (_idx: number, p: SubModalPlayer) => p.sessionPlayerId;

  // Effectiveness class used by SALE/ENTRA chips.
  getEffClass(sessionPlayerId: string): 'eff-good' | 'eff-warning' | 'eff-bad' | null {
    const v = this.data.effectivenessMap?.[sessionPlayerId];
    if (v == null) { return null; }
    if (v >= 0.9) { return 'eff-good'; }
    if (v >= 0.7) { return 'eff-warning'; }
    return 'eff-bad';
  }

  // Effectiveness percentage label for a player, when available.
  getEffBadge(sessionPlayerId: string): string | null {
    const v = this.data.effectivenessMap?.[sessionPlayerId];
    if (v == null) { return null; }
    return `${Math.round(v * 100)}%`;
  }

  // Visual pitch rows grouped by position category.
  get pitchLines(): PitchLine[] {
    return this.buildPitchLines(this.effectiveStartingXi);
  }

  private buildPitchLines(players: SubModalPlayer[]): PitchLine[] {
    const lines: PitchLine[] = [
      { category: 'GK',      players: [] },
      { category: 'DEF',     players: [] },
      { category: 'MID',     players: [] },
      { category: 'WINGER',  players: [] },
      { category: 'ATT',     players: [] }
    ];
    const categorize = (pos: string): number => {
      const p = (pos || 'MID').toUpperCase();
      if (p === 'GK' || p.startsWith('GK')) return 0;
      if (p === 'DEF' || p === 'D' || p === 'CB' || p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB') return 1;
      // WINGER check is more specific than the generic MID/ATT checks below.
      if (p === 'WINGER' || p === 'W' || p === 'LW' || p === 'RW' || p === 'LWF' || p === 'RWF') return 3;
      if (p === 'MID' || p === 'M' || p === 'CM' || p === 'CDM' || p === 'CAM' || p === 'LM' || p === 'RM') return 2;
      if (p === 'ATT' || p === 'A' || p === 'ST' || p === 'CF' || p === 'FW' || p === 'LF' || p === 'RF') return 4;
      // Defensive default for unknown positions.
      return 2;
    };
    for (const p of players) {
      const bucket = categorize(p.position);
      lines[bucket].players.push(p);
    }
    // Drop empty trailing lines so 4-3-3 doesn't render an empty WINGER row.
    return lines.filter(line => line.players.length > 0);
  }

  private basePercentForVisualSlot(
    lineIndex: number,
    playerIndex: number,
    playersInLine: number,
    linesCount: number
  ): { x: number; y: number } {
    const x = ((playerIndex + 1) / (playersInLine + 1)) * 100;
    const y = ((lineIndex + 1) / (linesCount + 1)) * 100;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) {
      return 50;
    }
    return Number(Math.max(0, Math.min(100, value)).toFixed(2));
  }

  private clampPixelTweak(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(-80, Math.min(80, value));
  }

  private isGoalkeeper(player: SubModalPlayer): boolean {
    return (player.position || '').toUpperCase().startsWith('GK');
  }

  private scoreRecommendedSubstitution(
    playerOff: SubModalPlayer,
    playerOn: SubModalPlayer,
    kind: 'medical' | 'tactical' = 'tactical'
  ): RecommendedSubstitution {
    const offRating = playerOff.rating ?? 70;
    const onRating = playerOn.rating ?? 70;
    const ratingDelta = onRating - offRating;
    const sameLine = this.positionGroup(playerOff.position) === this.positionGroup(playerOn.position);
    const roleShiftPenalty = sameLine ? 0 : -2.5;
    const injuryBonus = kind === 'medical' || this.isActiveInjuredStarter(playerOff.sessionPlayerId) ? 18 : 0;
    let objectiveScore = 0;
    let reason = '';
    if (kind === 'medical') {
      const sameProfile = this.positionProfile(playerOff.position) === this.positionProfile(playerOn.position);
      const offLine = this.positionGroup(playerOff.position);
      const onLine = this.positionGroup(playerOn.position);
      const sameLine = offLine === onLine;
      const adjacentAttackingCover = offLine === 'ATT' && onLine === 'WINGER' ? 3 : 0;
      const centralMidCoverPenalty = offLine === 'ATT' && onLine === 'MID' ? -1 : 0;
      const profileBonus = sameProfile ? 8 : sameLine ? 4 : -7;
      const ratingSafety = Math.max(-3, ratingDelta * 0.35);
      objectiveScore = 100
        + profileBonus
        + adjacentAttackingCover
        + centralMidCoverPenalty
        + ratingSafety
        + this.balancedIntent(playerOn);
      reason = `Prioridad médica: ${playerOff.displayName} está lesionado. Si lo dejás en cancha, el equipo sigue jugando con penalización.`;
      return {
        playerOff,
        playerOn,
        reason,
        score: objectiveScore,
        kind
      };
    }
    if (this.coachObjective === 'NEED_GOAL') {
      const sameProfile = this.positionProfile(playerOff.position) === this.positionProfile(playerOn.position);
      const sameLine = this.positionGroup(playerOff.position) === this.positionGroup(playerOn.position);
      const profileBonus = sameProfile ? 4 : sameLine ? 2 : -5;
      const defensiveBreakPenalty = this.positionGroup(playerOff.position) === 'DEF' && this.positionGroup(playerOn.position) === 'ATT'
        ? -8
        : 0;
      objectiveScore = this.attackIntent(playerOn) * 4
        + Math.max(0, ratingDelta) * 0.55
        + profileBonus
        + defensiveBreakPenalty
        + injuryBonus;
      reason = this.data.preSelectedPlayerId === playerOff.sessionPlayerId
        ? 'Prioriza un reemplazo que no apague el ataque.'
        : 'Prioriza amenaza ofensiva y llegada.';
    } else if (this.coachObjective === 'PROTECT_RESULT') {
      const sameProfile = this.positionProfile(playerOff.position) === this.positionProfile(playerOn.position);
      const onLine = this.positionGroup(playerOn.position);
      const profileBonus = onLine === 'ATT'
        ? -4
        : onLine === 'WINGER'
          ? -1
          : sameProfile
            ? 4
            : sameLine
              ? 1
              : -5;
      const protectionGain = this.protectIntent(playerOn) - this.protectIntent(playerOff);
      const defensiveStarterPenalty = this.positionGroup(playerOff.position) === 'DEF' && !sameProfile
        ? -4
        : 0;
      const attackingBenchPenalty = onLine === 'ATT'
        ? -4
        : onLine === 'WINGER'
          ? -1.5
          : 0;
      objectiveScore = protectionGain * 3
        + this.protectIntent(playerOn) * 1.2
        + Math.max(0, ratingDelta) * 0.45
        + profileBonus
        + defensiveStarterPenalty
        + attackingBenchPenalty
        + injuryBonus;
      reason = this.data.preSelectedPlayerId === playerOff.sessionPlayerId
        ? 'Prioriza sostener estructura y bajar riesgo.'
        : 'Prioriza estructura, marca y control del riesgo.';
    } else {
      objectiveScore = ratingDelta
        + (sameLine ? 3 : -1.5)
        + this.balancedIntent(playerOn) * 1.5
        + injuryBonus;
      reason = sameLine
        ? 'Cambio natural para mejorar sin romper la estructura.'
        : 'Mejora posible, pero cambia la estructura del equipo.';
    }
    return {
      playerOff,
      playerOn,
      reason,
      score: objectiveScore,
      kind
    };
  }

  private activeInjuredStarter(): SubModalPlayer | null {
    const preselected = this.data.preSelectedPlayerId
      ? this.data.startingXi.find(p => p.sessionPlayerId === this.data.preSelectedPlayerId && !this.isGoalkeeper(p)) ?? null
      : null;
    if (preselected) {
      return preselected;
    }
    return this.data.startingXi
      .filter(p => !this.isGoalkeeper(p) && this.isActiveInjuredStarter(p.sessionPlayerId))
      .sort((a, b) => {
        const injuriesB = this.getRating(b.sessionPlayerId)?.injuries ?? 0;
        const injuriesA = this.getRating(a.sessionPlayerId)?.injuries ?? 0;
        return injuriesB - injuriesA;
      })[0] ?? null;
  }

  private isActiveInjuredStarter(playerId: string): boolean {
    return (this.getRating(playerId)?.injuries ?? 0) > 0;
  }

  private attackIntent(player: SubModalPlayer): number {
    switch (this.positionGroup(player.position)) {
      case 'ATT': return 3;
      case 'WINGER': return 2.6;
      case 'MID': return 1.5;
      case 'DEF': return 0.4;
      default: return 0;
    }
  }

  private protectIntent(player: SubModalPlayer): number {
    switch (this.positionGroup(player.position)) {
      case 'DEF': return 3;
      case 'MID': return 2.2;
      case 'WINGER': return 1.1;
      case 'ATT': return 0.3;
      default: return 0;
    }
  }

  private balancedIntent(player: SubModalPlayer): number {
    const group = this.positionGroup(player.position);
    return group === 'MID' ? 2 : group === 'DEF' || group === 'ATT' ? 1.4 : 1.2;
  }

  private positionGroup(position: string): PitchLine['category'] {
    const p = (position || 'MID').toUpperCase();
    if (p === 'GK' || p.startsWith('GK')) return 'GK';
    if (p === 'DEF' || p === 'D' || p === 'CB' || p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB') return 'DEF';
    if (p === 'WINGER' || p === 'W' || p === 'LW' || p === 'RW' || p === 'LWF' || p === 'RWF') return 'WINGER';
    if (p === 'ATT' || p === 'A' || p === 'ST' || p === 'CF' || p === 'FW' || p === 'LF' || p === 'RF') return 'ATT';
    return 'MID';
  }

  private positionProfile(position: string): string {
    const p = (position || 'MID').toUpperCase();
    if (p === 'GK' || p.startsWith('GK')) return 'GK';
    if (p === 'CB' || p === 'DEF') return 'CB';
    if (p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB') return 'FB';
    if (p === 'LW' || p === 'RW' || p === 'WINGER' || p === 'LWF' || p === 'RWF') return 'WIDE';
    if (p === 'ST' || p === 'CF' || p === 'FW' || p === 'ATT') return 'ST';
    if (p === 'CAM' || p === 'AM') return 'AM';
    if (p === 'CDM' || p === 'DM') return 'DM';
    return 'CM';
  }

  /**
   * : dot's category-class binding. Maps the pitch-line category
   * (GK / DEF / MID / WINGER / ATT) to the CSS class used by the inline
   * styles (is-gk / is-def / is-mid / is-winger / is-att).
   */
  dotClass(lineCategory: PitchLine['category']): string {
    return `is-${lineCategory.toLowerCase()}`;
  }

  // Per-player live rating entry, when available.
  getRating(playerId: string): V24LivePlayerRating | null {
    if (!this.data.playerRatings) { return null; }
    for (const r of this.data.playerRatings) {
      if (r.playerId === playerId) { return r; }
    }
    return null;
  }

  /**
   * : count of non-zero chips for a player — used by the template
   * to decide if any chip strip is worth rendering. Empty rating or
   * zero across all stats → no strip.
   */
  hasAnyChip(playerId: string): boolean {
    const r = this.getRating(playerId);
    if (!r) { return false; }
    return r.goals > 0 || r.keyPasses > 0 || r.yellowCards > 0
        || r.fouls > 0 || r.injuries > 0;
  }

  /**
   * : trackBy for the dot *ngFor so DOM nodes are reused across
   * re-renders triggered by the SSE consumer (playerRatings change every
   * tick).
   */
  trackByDot = (_idx: number, p: SubModalPlayer) => p.sessionPlayerId;
  trackByLine = (_idx: number, line: PitchLine) => line.category;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
