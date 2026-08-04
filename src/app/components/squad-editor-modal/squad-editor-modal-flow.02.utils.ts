import { of, forkJoin, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PlayerOnFieldDto } from '../../shared/models/lineup/player-on-field.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';
import { FormationDTO, FormationPositionDTO } from '../../shared/models/lineup/formation.dto';
import { FieldSubdivisionDTO } from '../../shared/models/lineup/field-subdivision.dto';
import { LineupWarningDTO } from '../../shared/models/lineup/lineup-warning.dto';
import { clampFieldPercent } from '../../shared/utils/field-percent.utils';
import { SessionPlayer } from '../../shared/models/player.model';
import { SquadEditorAutoSelectResponse, SquadEditorCurrentLineupResponse, SquadEditorLineupPlayer } from './squad-editor-modal.models';
import { SQUAD_EDITOR_GOALKEEPER_SLOT_ID, isInsideSquadEditorGoalkeeperProtectedArea } from './squad-editor-modal-goalkeeper.utils';
import { remapSquadEditorCurrentXiToFormation } from './squad-editor-modal-lineup-remap.utils';
import { applySquadEditorSlotDropMutation, assignSquadEditorBenchPlayerToSlot, moveSquadEditorPlayerToBench } from './squad-editor-modal-lineup-mutation.utils';
import { clearSquadEditorDragTransform, getSquadEditorDragData, getSquadEditorDragRef, resetSquadEditorDragSource } from './squad-editor-modal-drag.utils';
import { SquadEditorRect, computeSquadEditorFieldDropPercent, computeSquadEditorSlotCenter, findClosestSquadEditorSubdivision, getSquadEditorFormationPositionCoord, getSquadEditorMarkerCoord, isPointOverAnyInsetRect, isSquadEditorDropNearSlotCenter, squadEditorSubdivisionIdFromDropListId } from './squad-editor-modal-geometry.utils';
import { buildSquadEditorCoachMoveRead, describeSquadEditorCoachMoveSpatialRead } from './squad-editor-modal-move-read.utils';
import { USER_FORMATION_LABEL } from '../../shared/constants/formations';
import { detectSquadEditorFormationFromFamilies, isSquadEditorTacticalRoleMismatch } from './squad-editor-modal-formation-detection.utils';
import { buildSquadEditorTacticalCoachReads } from './squad-editor-modal-tactical-read.utils';
import { buildSquadEditorCoachChannelDeltas, buildSquadEditorVisualChannelDeltas, buildSquadEditorVisualEngineTension, describeSquadEditorCoachDeltaSeverity, pushSquadEditorCoachDelta, squadEditorVisualDeltaHasHardWarning } from './squad-editor-modal-move-impact.utils';

export function runSquadEditorExecuteAutoSelect(ctx: any, formation: any): any {
    ctx.loadingFormation$.next(true);

    (ctx.http as HttpClient).post<SquadEditorAutoSelectResponse>(`${environment.apiUrl}/career/lineup/auto-select`, {
      formation: formation
    }).subscribe({
      next: (response: any) => {
        ctx.loadingFormation$.next(false);
        ctx.applyLineupToSlots(formation, response?.players || [], response?.slots || []);
        ctx.isInitializing = false;
        ctx.cdr.detectChanges();
      },
      error: () => {
        ctx.loadingFormation$.next(false);
        ctx.isInitializing = false;
        ctx.cdr.detectChanges();
      }
    });
  
}

export function runSquadEditorExecuteFormationChange(ctx: any, newFormation: any): any {
    // Formation selection is a local draft.  The only write is the explicit
    // Save/confirm action exposed by the modal footer.
    ctx.applyCurrentXiToFormation(newFormation);
    ctx.loadingFormation$.next(false);
    ctx.isFormationChanging = false;
    ctx.captureRatingsFromFormationEffectiveness();
    ctx.requestRatingsPreview();
    ctx.formationChanged.emit({
      formation: newFormation,
      players: ctx.homePlayers$.value.slice(0, 11)
    });
    ctx.formationChangeComplete.emit(ctx.formationChangeCompleteSubject);
  
}

export function runSquadEditorFindClosestSubdivision(ctx: any, xPct: any, yPct: any, player: any): any {
    return findClosestSquadEditorSubdivision({
      xPct,
      yPct,
      subdivisions: ctx.subdivisions,
      canUseSubdivision: player
        ? (sub: any) => ctx.canPlayerUseSlot(player, sub.subdivisionId)
        : undefined,
    });
  
}

export function runSquadEditorGetChipEffectivenessClass(ctx: any, subdivisionId: any): any {
    const v = ctx.getEffectivenessForSlot(subdivisionId);
    if (v === null) { return null; }
    if (v >= 0.9) { return 'eff-good'; }
    if (v >= 0.7) { return 'eff-warning'; }
    return 'eff-bad';
  
}

export function runSquadEditorGetDisplayedChemistryScore(ctx: any): any {
    const raw = ctx.previewedChemistry$.value;
    if (!raw) { return null; }
    const fe = ctx.formationEffectiveness$.value;
    if (!fe || typeof fe.teamAverage !== 'number') {
      return raw.score;
    }
    return Math.round(raw.score * fe.teamAverage);
  
}

export function runSquadEditorGetDisplayedFormationLabel(ctx: any, fe: any): any {
    if (!ctx.isCustomLineup() && ctx.selectedFormation !== ctx.userFormationLabel) {
      return ctx.selectedFormation;
    }
    return fe?.inferredFormation || ctx.selectedFormation;
  
}

export function runSquadEditorGetEffectivenessForSlot(ctx: any, subdivisionId: any): any {
    if (!subdivisionId) { return null; }
    const fe = ctx.formationEffectiveness$.value;
    if (!fe) { return null; }
    const v = fe.perPlayerEffectiveness?.[subdivisionId];
    return typeof v === 'number' ? v : null;
  
}

export function runSquadEditorGetFormationPositionCoord(ctx: any, slotId: any, axis: any): any {
    return getSquadEditorFormationPositionCoord({
      slotId,
      axis,
      positions: ctx.formationPositions[ctx.selectedFormation],
    });
  
}

export function runSquadEditorGetMarkerX(ctx: any, player: any): any {
    return getSquadEditorMarkerCoord({
      player,
      axis: 'x',
      positions: ctx.formationPositions[ctx.selectedFormation],
      subdivisions: ctx.subdivisions,
    });
  
}

export function runSquadEditorGetMarkerY(ctx: any, player: any): any {
    return getSquadEditorMarkerCoord({
      player,
      axis: 'y',
      positions: ctx.formationPositions[ctx.selectedFormation],
      subdivisions: ctx.subdivisions,
    });
  
}

export function runSquadEditorGetOffRoleAdvice(ctx: any, naturalRole: any, actualZone: any, penaltyPct: any): any {
    const naturalFamily = ctx.getRoleFamily(naturalRole);
    const actualFamily = ctx.getRoleFamily(actualZone) ?? actualZone;
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

export function runSquadEditorGetPositionRoleFamily(ctx: any, player: any): any {
    if (typeof player.xPercent === 'number' && isFinite(player.xPercent) &&
        typeof player.yPercent === 'number' && isFinite(player.yPercent) &&
        ctx.subdivisions && ctx.subdivisions.length > 0) {
      const closest = ctx.findClosestSubdivision(player.xPercent, player.yPercent, player);
      if (closest) {
        const zone = closest.zone ?? '';
        if (zone === 'GK') return 'GK';
        if (zone === 'DEFENSE') return 'DEF';
        if (zone === 'MIDFIELD') return 'MID';
        if (zone === 'ATTACK') return 'ATT';
      }
    }
    // No position info -> fall back to the player's underlying role.
    return ctx.getRoleFamily(player.role);
  
}

export function runSquadEditorGetRecommendedRoleBySlotId(ctx: any, slotId: any): any {
    const positions = ctx.formationPositions[ctx.selectedFormation];
    if (!positions) return '';
    const pos = positions.find((p: any) => p.subdivisionId === slotId);
    return pos?.role || '';
  
}

export function runSquadEditorGetTacticalChannelScoresSnapshot(ctx: any): any {
    const scores = ctx.previewedChemistry$.value?.breakdown?.tacticalChemistry?.channelScores;
    return {
      left: ctx.readCoachChannelScore(scores, 'LEFT'),
      center: ctx.readCoachChannelScore(scores, 'CENTER'),
      right: ctx.readCoachChannelScore(scores, 'RIGHT'),
    };
  
}

export function runSquadEditorGetUniqueValidHomePlayers(ctx: any): any {
    const seenPlayers = new Set<string>();
    const seenSlots = new Set<string>();
    const result: PlayerOnFieldDto[] = [];
    for (const player of ctx.homePlayers) {
      if (!player?.playerId || !player.slotId) {
        continue;
      }
      if (seenPlayers.has(player.playerId) || seenSlots.has(player.slotId)) {
        continue;
      }
      if (!ctx.canPlayerUseSlot(player, player.slotId)) {
        continue;
      }
      seenPlayers.add(player.playerId);
      seenSlots.add(player.slotId);
      result.push(player);
    }
    return result;
  
}

export function runSquadEditorHandleBenchDrop(ctx: any, event: any): any {
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player || !player.slotId) { return; }
    if (event.previousContainer.id === ctx.BENCH_DROP_LIST_ID) { return; }
    ctx.movePlayerToBench(player);
  
}

export function runSquadEditorHandleSlotDrop(ctx: any, event: any): any {
    const player = event.item.data as PlayerOnFieldDto | undefined;
    if (!player) { return; }

    const targetSubdivisionId = ctx.subdivisionIdFromDropListId(event.container.id);
    if (!targetSubdivisionId) { return; }

    const sourceDropListId = event.previousContainer.id;
    if (sourceDropListId === 'slot-' + targetSubdivisionId) {
      return;
    }

    const sourceSlotId = sourceDropListId === ctx.BENCH_DROP_LIST_ID
      ? null
      : ctx.subdivisionIdFromDropListId(sourceDropListId);

    const occupant = ctx.slotPlayerMap[targetSubdivisionId] ?? null;
    ctx.applySlotAssignment(player, sourceSlotId, targetSubdivisionId, occupant);
  
}

export function runSquadEditorIsDropOverBenchCard(ctx: any, dropX: any, dropY: any): any {
    const benchRects: SquadEditorRect[] = Array
      .from(document.querySelectorAll('.bench-container .bench-player'))
      .map((card) => (card as HTMLElement).getBoundingClientRect());

    return isPointOverAnyInsetRect({ x: dropX, y: dropY }, benchRects);
  
}

export function runSquadEditorIsOffRole(ctx: any, player: any): any {
    if (!player.slotId) { return false; }
    const sub = ctx.subdivisions.find((s: any) => s.subdivisionId === player.slotId);
    if (!sub) { return false; }
    const recommended = ctx.getRecommendedRole(sub);
    if (!recommended) { return false; }
    const actual = ctx.getPositionRoleFamily(player);
    return ctx.isTacticalRoleMismatch(player.role, recommended, actual);
  
}

export function runSquadEditorIsRecommendedSlot(ctx: any, sub: any): any {
    const positions = ctx.formationPositions[ctx.selectedFormation];
    if (!positions) return false;

    return positions.some((pos: any) => pos.subdivisionId === sub.subdivisionId);
  
}

export function runSquadEditorIsSlotAbandonedByOverride(ctx: any, sub: any): any {
    if (ctx.slotPlayerMap[sub.subdivisionId]) { return false; }
    const abandoned = ctx.homePlayers$.value.find((p: any) =>
      p.slotId === sub.subdivisionId && ctx.hasOverridePosition(p));
    return !!abandoned;
  
}

export function runSquadEditorIsSlotInActiveFormation(ctx: any, subdivisionId: any): any {
    if (!subdivisionId) { return false; }
    if (ctx._isCustomLineup && ctx.slotPlayerMap[subdivisionId]) {
      return true;
    }
    const positions = ctx.formationPositions[ctx.selectedFormation];
    if (!positions || positions.length === 0) { return false; }
    return positions.some((pos: any) => pos.subdivisionId === subdivisionId);
  
}

export function runSquadEditorIsTacticalRoleMismatch(ctx: any, playerRole: any, tacticalRole: any, actualZone: any): any {
    return isSquadEditorTacticalRoleMismatch(playerRole, tacticalRole, actualZone);
  
}

export function runSquadEditorKeepPlayerAtFreeDropPosition(ctx: any, player: any, move: any): any {
    player.xPercent = move.xPct;
    player.yPercent = move.yPct;
    if (player.slotId) {
      delete ctx.slotPlayerMap[player.slotId];
    }
    ctx.setLastCoachMoveReadForDrag(player, move.previousX, move.previousY, move.xPct, move.yPct, false);
    ctx.persistLastModalMoveHarnessCase(player, move.previousX, move.previousY, move.xPct, move.yPct);
  
}

export function runSquadEditorLoadSubdivisions(ctx: any): any {
    forkJoin({
      subs: (ctx.http as HttpClient).get<FieldSubdivisionDTO[]>(`${environment.apiUrl}/lineup-editor/subdivisions`),
      formations: (ctx.http as HttpClient).get<FormationDTO[]>(`${environment.apiUrl}/lineup-editor/formations`).pipe(
        catchError(() => of([] as FormationDTO[]))
      )
    }).subscribe({
      next: ({ subs, formations }) => {
        ctx.subdivisions$.next(subs);
        formations.forEach((f: any) => {
          ctx.formationPositions[f.name] = f.positions;
        });
        ctx.loadSquadFromBackend();
        ctx.cdr.markForCheck();
        ctx.cdr.detectChanges();
      },
      error: () => {
        ctx.errorMessage$.next('Error al cargar las subdivisiones del campo');
        ctx.cdr.detectChanges();
      }
    });
  
}

export function runSquadEditorLockGoalkeeperToGoalArea(ctx: any, player: any): any {
    player.slotId = SQUAD_EDITOR_GOALKEEPER_SLOT_ID;
    delete player.xPercent;
    delete player.yPercent;
    ctx.slotPlayerMap[SQUAD_EDITOR_GOALKEEPER_SLOT_ID] = player;
  
}

export function runSquadEditorMovePlayerToBench(ctx: any, player: any): any {
    if (ctx.isGoalkeeperPlayer(player)) {
      ctx.lockGoalkeeperToGoalArea(player);
      ctx.homePlayers$.next([...ctx.homePlayers$.value]);
      ctx.cdr.markForCheck();
      return;
    }
    if (!player.slotId) { return; } // already on bench
    ctx.beginCoachMoveImpactTracking();
    ctx.lastCoachMoveRead = {
      title: `${player.name} sale del XI`,
      body: 'Lo mandaste al banco: baja ocupación del dibujo y puede dejar una zona sin cobertura hasta reemplazarlo.',
      level: 'warn',
    };
    const mutation = moveSquadEditorPlayerToBench({
      player,
      state: {
        homePlayers: ctx.homePlayers$.value,
        benchPlayers: ctx.benchPlayers$.value,
        slotPlayerMap: ctx.slotPlayerMap,
      },
    });
    ctx.slotPlayerMap = mutation.slotPlayerMap;
    ctx.homePlayers$.next(mutation.homePlayers);
    ctx.benchPlayers$.next(mutation.benchPlayers);

    ctx.refreshAfterLineupMutation();
  
}

export function runSquadEditorOnFormationSelect(ctx: any, newValue: any): any {
    if (newValue === USER_FORMATION_LABEL || !newValue) {
      // Disabled pseudo-option click. Force-restore the displayed value via
      // CD so the select visually re-syncs (some browsers briefly swap the
      // label into the select before re-rendering).
      ctx.cdr.detectChanges();
      return;
    }
    // Delegate to the canonical formation-change handler. Formation changes
    // keep the same XI, remap it into the new shape and persist it manually.
    ctx.onFormationChange(newValue);
  
}

export function runSquadEditorOnMarkerClick(ctx: any, player: any): any {
    ctx.selectedSlot = player?.slotId
      ? ctx.subdivisions.find((s: any) => s.subdivisionId === player.slotId) ?? null
      : null;
    ctx.selectedPlayerToAssign = '';
  
}

export function runSquadEditorOnMarkerDragStarted(ctx: any, event: any): any {
    const dragRef = getSquadEditorDragRef(event.source);
    if (!dragRef) { return; }
    const data = getSquadEditorDragData<PlayerOnFieldDto>(event.source);
    if (!data?.playerId) { return; }
    if (ctx.isGoalkeeperPlayer(data)) {
      resetSquadEditorDragSource(event.source);
      return;
    }
    ctx.markerPickupOffset.set(data.playerId, {
      // CdkDrag does not expose the pointer offset as public API.  Use the
      // marker centre consistently instead of reaching into its private
      // DragRef implementation.
      x: 35,
      y: 24,
    });
  
}

export function runSquadEditorOnSlotClick(ctx: any, sub: any): any {
    if (ctx.isSlotAbandonedByOverride(sub)) {
      return;
    }
    ctx.selectedSlot = null;
    ctx.selectedPlayerToAssign = '';
  
}

export function runSquadEditorPersistLastModalMoveHarnessCase(ctx: any, player: any, fromX: any, fromY: any, targetX: any, targetY: any): any {
    if (!player?.playerId || ctx.isGoalkeeperPlayer(player)) { return; }
    const distance = Math.hypot(targetX - fromX, targetY - fromY);
    if (!isFinite(distance) || distance < 1) { return; }
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: 'squad-editor-modal',
      formation: ctx.dropdownFormationValue,
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
      coachReadTitle: ctx.lastCoachMoveRead?.title ?? null,
      coachReadBody: ctx.lastCoachMoveRead?.body ?? null,
    };
    try {
      window.localStorage.setItem('manager:last-modal-position-move', JSON.stringify(payload));
    } catch {
    }
  
}

export function runSquadEditorRefreshAfterLineupMutation(ctx: any): any {
    ctx.triggerChemistryPreview();
    ctx.updateFormationDetection();
    ctx.homePlayers$.next([...ctx.homePlayers$.value]);
    ctx.cdr.markForCheck();
    ctx.cdr.detectChanges();
  
}

export function runSquadEditorRemovePlayerFromSlot(ctx: any, player: any): any {
    if (!player.slotId) return;

    const mutation = moveSquadEditorPlayerToBench({
      player,
      state: {
        homePlayers: ctx.homePlayers$.value,
        benchPlayers: ctx.benchPlayers$.value,
        slotPlayerMap: ctx.slotPlayerMap,
      },
    });
    ctx.slotPlayerMap = mutation.slotPlayerMap;
    ctx.homePlayers$.next(mutation.homePlayers);
    ctx.benchPlayers$.next(mutation.benchPlayers);

    ctx.selectedSlot = null;
    ctx.triggerChemistryPreview();
    ctx.updateFormationDetection();
    ctx.cdr.detectChanges();
  
}

export function runSquadEditorRequestRatingsPreview(ctx: any): any {
    if (ctx.ratingsPreviewTimer) {
      clearTimeout(ctx.ratingsPreviewTimer);
    }
    ctx.ratingsPreviewTimer = setTimeout(() => {
      ctx.ratingsPreviewTimer = null;
      ctx.fetchRatingsPreview();
    }, 150);
  
}

export function runSquadEditorResetCustomPositions(ctx: any): any {
    // slotPlayerMap entry for each player (handleFieldDrop intentionally
    // removed it so the slot looked truly empty). Without this restore
    // the markers would snap to slot centers but the slots would remain
    // "unoccupied" in the slotPlayerMap -> isSlotOccupied would return
    // removal: re-add player to slotPlayerMap[player.slotId].
    for (const player of ctx.homePlayers$.value) {
      delete player.xPercent;
      delete player.yPercent;
      if (player.slotId) {
        ctx.slotPlayerMap[player.slotId] = player;
      }
    }
    ctx.homePlayers$.next([...ctx.homePlayers$.value]);
    ctx.lastCoachMoveRead = null;
    ctx.pendingCoachMoveBaseline = null;
    ctx.triggerChemistryPreview();
    ctx.updateFormationDetection();
    ctx.cdr.markForCheck();
    ctx.cdr.detectChanges();
  
}

export function runSquadEditorSetLastCoachMoveReadForDrag(ctx: any, player: any, fromX: any, fromY: any, toX: any, toY: any, snappedToNative: any): any {
    ctx.lastCoachMoveRead = buildSquadEditorCoachMoveRead({
      playerName: player.name,
      playerRole: player.role,
      naturalFamily: ctx.getRoleFamily(player.role),
      fromX,
      fromY,
      toX,
      toY,
      snappedToNative,
    });
  
}

export function runSquadEditorSetupChemistryPreviewPipeline(ctx: any): any {
    ctx.previewTrigger$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a: any, b: any) => a.signature === b.signature),
        switchMap((snapshot: any) => {
          if (!snapshot.ids || snapshot.ids.length !== 11) {
            ctx.previewError = false;
            return of(null);
          }
          return ctx.chemistryPreview.previewChemistry(
            snapshot.ids,
            snapshot.formation,
            snapshot.slots
          ).pipe(
            catchError(() => {
              ctx.previewError = true;
              return of(null);
            })
          );
        }),
        takeUntil(ctx.destroy$)
      )
      .subscribe((detail: any) => {
        if (detail) {
          ctx.previewError = false;
        }
        ctx.previewedChemistry$.next(detail);
        ctx.enrichLastCoachMoveReadWithLatestDelta();
        ctx.cdr.markForCheck();
        ctx.cdr.detectChanges();
      });
  
}

export function runSquadEditorShowConditionWarning(ctx: any, player: any): any {
    if (player.injured) {
      ctx.conditionWarning$.next('Jugador lesionado seleccionado. Conviene reemplazarlo antes de confirmar.');
    } else if ((player.stamina ?? 100) <= 19) {
      ctx.conditionWarning$.next('Jugador agotado seleccionado. Ponerlo puede afectar su rendimiento.');
    } else if ((player.stamina ?? 100) <= 39) {
      ctx.conditionWarning$.next('Jugador muy cansado seleccionado. Conviene darle descanso.');
    } else if ((player.stamina ?? 100) <= 59) {
      ctx.conditionWarning$.next('Jugador cansado seleccionado. Puede rendir por debajo de su nivel.');
    } else {
      ctx.conditionWarning$.next('');
    }
  
}

export function runSquadEditorSnapPlayerBackToSlotCenter(ctx: any, player: any, move: any, nativeCenter: any): any {
    delete player.xPercent;
    delete player.yPercent;
    if (player.slotId) {
      ctx.slotPlayerMap[player.slotId] = player;
    }
    ctx.setLastCoachMoveReadForDrag(
      player,
      move.previousX,
      move.previousY,
      nativeCenter.x ?? move.xPct,
      nativeCenter.y ?? move.yPct,
      true
    );
  
}

export function runSquadEditorUpdateFormationDetection(ctx: any): any {
    ctx.detectFormation();
    ctx.cdr.markForCheck();
    // ratings reflect the new lineup within ~150ms (no save needed).
    ctx.requestRatingsPreview();
  
}

export function readSquadEditorOffRolePlayers(ctx: any): any {
    const fe = ctx.formationEffectiveness$.value;
    const effMap = (fe && fe.perPlayerEffectiveness) || {};
    const result: Array<{
      player: PlayerOnFieldDto;
      naturalRole: string;
      actualZone: string;
      penaltyPct: number;
      advice: string;
    }> = [];
    for (const p of ctx.homePlayers) {
      const natural = ctx.getRoleFamily(p.role);
      const actual = ctx.getPositionRoleFamily(p);
      const tacticalRole = p.slotId ? ctx.getRecommendedRoleBySlotId(p.slotId) : '';
      if (!natural || !actual) { continue; }
      if (!ctx.isTacticalRoleMismatch(p.role, tacticalRole, actual)) { continue; }
      const eff = (p.slotId && typeof effMap[p.slotId] === 'number') ? effMap[p.slotId] : 1.0;
      const penaltyPct = Math.max(0, Math.round((1 - eff) * 100));
      result.push({
        player: p,
        naturalRole: p.role,
        actualZone: tacticalRole || actual,
        penaltyPct,
        advice: ctx.getOffRoleAdvice(p.role, tacticalRole || actual, penaltyPct),
      });
    }
    result.sort((a, b) => b.penaltyPct - a.penaltyPct);
    return result;
  
}

export function readSquadEditorTacticalCoachReads(ctx: any): any {
    const players = ctx.getUniqueValidHomePlayers().filter((p: any) => !ctx.isGoalkeeperPlayer(p));
    const wideHigh = players.filter((p: any) => Math.abs(ctx.getMarkerX(p) - 50) >= 32 && ctx.getMarkerY(p) < 58).length;
    const wideCover = players.filter((p: any) => Math.abs(ctx.getMarkerX(p) - 50) >= 32 && ctx.getMarkerY(p) >= 58).length;

    return buildSquadEditorTacticalCoachReads({
      outfieldPlayerCount: players.length,
      matrix: ctx.tacticalShapeMatrix,
      summary: ctx.tacticalShapeSummary,
      wideHigh,
      wideCover,
      offRoleCount: ctx.offRolePlayers.length,
      severeOffRoleCount: ctx.offRolePlayers.filter((row: any) => row.penaltyPct >= 20).length,
    });
  
}

export function readSquadEditorTacticalPenaltySummary(ctx: any): any {
    const rows = ctx.offRolePlayers;
    const totalPenalty = rows.reduce((acc: any, row: any) => acc + row.penaltyPct, 0);
    const severeRows = rows.filter((row: any) => row.penaltyPct >= 25).length;
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

export function readSquadEditorTacticalShapeWarnings(ctx: any): any {
    const matrix = ctx.tacticalShapeMatrix;
    const summary = ctx.tacticalShapeSummary;
    const warnings: string[] = [];
    const totalLeft = matrix.reduce((acc: any, r: any) => acc + r.left, 0);
    const totalCenter = matrix.reduce((acc: any, r: any) => acc + r.center, 0);
    const totalRight = matrix.reduce((acc: any, r: any) => acc + r.right, 0);
    if (totalLeft <= 1) { warnings.push('Banda izquierda muy expuesta'); }
    if (totalRight <= 1) { warnings.push('Banda derecha muy expuesta'); }
    if (totalCenter <= 2) { warnings.push('Centro con poca presencia'); }
    if (summary.width < 45) { warnings.push('Equipo muy cerrado: vulnerable por fuera'); }
    if (summary.width > 75) { warnings.push('Equipo muy ancho: puede partirse por dentro'); }
    if (summary.compactness < 45) { warnings.push('Bloque largo: líneas separadas'); }
    return warnings;
  
}

export function readSquadEditorZoneBreakdown(ctx: any): any {
    const zones: Array<'GK' | 'DEF' | 'MID' | 'ATT'> = ['GK', 'DEF', 'MID', 'ATT'];
    const fe = ctx.formationEffectiveness$.value;
    const effMap = (fe && fe.perPlayerEffectiveness) || {};
    const players = ctx.homePlayers;

    const rows = zones.map(zone => {
      const zonePlayers = players.filter((p: any) => ctx.getPositionRoleFamily(p) === zone);
      const count = zonePlayers.length;
      const avgOverall = count === 0
        ? 0
        : Math.round(zonePlayers.reduce((acc: any, p: any) => acc + (p.overall || 70), 0) / count);
      const avgEff = count === 0
        ? 0
        : Math.round(
            (zonePlayers.reduce((acc: any, p: any) => {
              const e = (p.slotId && typeof effMap[p.slotId] === 'number') ? effMap[p.slotId] : 1;
              return acc + e;
            }, 0) / count) * 100
          );
      const contributionScore = count * avgOverall * (avgEff / 100);
      return { zone, count, avgOverall, avgEff, contributionScore };
    });

    const totalContribution = rows.reduce((acc: any, r: any) => acc + r.contributionScore, 0);
    return rows.map((r: any) => ({
      zone: r.zone,
      count: r.count,
      avgOverall: r.avgOverall,
      avgEff: r.avgEff,
      contributionPct: totalContribution === 0
        ? 0
        : Math.round((r.contributionScore / totalContribution) * 100),
    }));
  
}
