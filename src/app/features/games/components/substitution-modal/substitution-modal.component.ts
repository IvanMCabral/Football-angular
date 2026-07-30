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
import { SubModalPlayer, SubstitutionResult, LivePlayerRating } from '../../../../core/services/match-engine.model';
import { clampFieldPixelTweak } from '../../../../shared/utils/field-percent.utils';
import { buildSubstitutionPitchLines, SubstitutionPitchLine } from './substitution-modal-pitch.utils';
import {
  CoachObjective,
  RecommendedSubstitution,
  scoreRecommendedSubstitution
} from './substitution-modal-recommendation.utils';
import {
  applyPendingSubstitutionsToStartingXi,
  buildSubstitutionLiveFormationSlots,
  SubstitutionLiveFormationSlot,
} from './substitution-modal-live-slots.utils';
import { PendingSubstitution, PlayerPositionTweak, SubstitutionDialogData } from './substitution-modal.models';
import { formatSubstitutionError, isAlreadyAppliedSubstitutionResult } from './substitution-modal-result.utils';

import {
  findSubstitutionPlayerRating,
  hasSubstitutionRatingChip,
  isInjuredFromSubstitutionRatings
} from './substitution-modal-ratings.utils';
import {
  inferSubstitutionCoachObjective,
  recommendedSubstitutionText,
  substitutionCoachObjectiveClass,
  substitutionCoachObjectiveLabel,
  substitutionCoachObjectiveText
} from './substitution-modal-coach-objective.utils';
import {
  isSubstitutionGoalkeeper,
  substitutionEffectivenessBadge,
  substitutionEffectivenessClass,
  SubstitutionEffectivenessClass
} from './substitution-modal-player-view.utils';

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
    return inferSubstitutionCoachObjective(this.data);
  }
  get coachObjectiveLabel(): string {
    return substitutionCoachObjectiveLabel(this.coachObjective);
  }
  get coachObjectiveClass(): string {
    return substitutionCoachObjectiveClass(this.coachObjective);
  }
  get coachObjectiveText(): string {
    return substitutionCoachObjectiveText({ ...this.data, objective: this.coachObjective });
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
      this.errorMsg = 'Ese jugador ya est? preparado para salir en otro cambio.';
      return;
    }
    this.playerOffId = p.sessionPlayerId;
    this.selectedFineTunePlayerId = p.sessionPlayerId;
    this.errorMsg = '';
  }
  selectOn(p: SubModalPlayer): void {
    if (this.pendingChanges.some(change => change.playerOnId === p.sessionPlayerId)) {
      this.errorMsg = 'Ese suplente ya est? preparado para entrar en otro cambio.';
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
      return 'Seleccion? un jugador de cancha para ajustar p?xeles.';
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
                : `Sustituci?n realizada (minuto ${results[0]?.minuteApplied ?? this.data.currentMinute})`,
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
    return isAlreadyAppliedSubstitutionResult(result);
  }
  private formatSubstitutionError(err: unknown): string {
    return formatSubstitutionError(err);
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
  private buildLiveFormationSlots(changes: PendingSubstitution[]): SubstitutionLiveFormationSlot[] {
    return buildSubstitutionLiveFormationSlots({
      startingXi: this.data.startingXi,
      bench: this.data.bench,
      changes,
      positionTweaks: this.positionTweaks
    });
  }
  cancel(): void {
    this.dialogRef.close({ success: false, reason: 'cancelled' });
  }
  get effectiveStartingXi(): SubModalPlayer[] {
    return applyPendingSubstitutionsToStartingXi(this.data.startingXi, this.data.bench, this.stagedChanges());
  }
  trackByPlayer = (_idx: number, p: SubModalPlayer) => p.sessionPlayerId;
  getEffClass(sessionPlayerId: string): SubstitutionEffectivenessClass {
    return substitutionEffectivenessClass(this.data.effectivenessMap, sessionPlayerId);
  }
  getEffBadge(sessionPlayerId: string): string | null {
    return substitutionEffectivenessBadge(this.data.effectivenessMap, sessionPlayerId);
  }
  get pitchLines(): SubstitutionPitchLine[] {
    return buildSubstitutionPitchLines(this.effectiveStartingXi);
  }
  private clampPixelTweak(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return clampFieldPixelTweak(value);
  }
  private isGoalkeeper(player: SubModalPlayer): boolean {
    return isSubstitutionGoalkeeper(player);
  }
  private scoreRecommendedSubstitution(
    playerOff: SubModalPlayer,
    playerOn: SubModalPlayer,
    kind: 'medical' | 'tactical' = 'tactical'
  ): RecommendedSubstitution {
    return scoreRecommendedSubstitution({
      playerOff,
      playerOn,
      kind,
      coachObjective: this.coachObjective,
      preSelectedPlayerId: this.data.preSelectedPlayerId,
      isActiveInjuredStarter: playerId => this.isActiveInjuredStarter(playerId)
    });
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
    return isInjuredFromSubstitutionRatings(this.data.playerRatings, playerId);
  }
  dotClass(lineCategory: SubstitutionPitchLine['category']): string {
    return `is-${lineCategory.toLowerCase()}`;
  }
  getRating(playerId: string): LivePlayerRating | null {
    return findSubstitutionPlayerRating(this.data.playerRatings, playerId);
  }
  hasAnyChip(playerId: string): boolean {
    return hasSubstitutionRatingChip(this.getRating(playerId));
  }
  trackByDot = (_idx: number, p: SubModalPlayer) => p.sessionPlayerId;
  trackByLine = (_idx: number, line: SubstitutionPitchLine) => line.category;
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
