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

export function runSquadEditorApplyLineupToSlots(ctx: any, formationName: any, playersList: any, backendSlots: any): void {
    ctx.slotPlayerMap = {};

    const positions = ctx.formationPositions[formationName] || [];

    const squadSource: SquadEditorLineupPlayer[] = (ctx.data?.squad && ctx.data.squad.length > 0)
      ? ctx.data.squad.map((sp: SessionPlayer) => ({
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
      backendSlots.forEach((slot: any) => {
        const player = playerById.get(slot.playerId);
        if (!player
          || !slot.subdivisionId
          || usedSubdivisionIds.has(slot.subdivisionId)
          || usedPlayerIds.has(slot.playerId)
          || !ctx.canPlayerUseSlot(player, slot.subdivisionId)) {
          return;
        }
        player.slotId = slot.subdivisionId;
        if (typeof slot.customXPercent === 'number' && isFinite(slot.customXPercent)) {
          player.xPercent = clampFieldPercent(slot.customXPercent);
        }
        if (typeof slot.customYPercent === 'number' && isFinite(slot.customYPercent)) {
          player.yPercent = clampFieldPercent(slot.customYPercent);
        }
        ctx.slotPlayerMap[slot.subdivisionId] = player;
        usedSubdivisionIds.add(slot.subdivisionId);
        usedPlayerIds.add(slot.playerId);
      });
    }

    if (!ctx.slotPlayerMap['GK-1']) {
      const goalkeeper = allPlayers.find(player =>
        ctx.isGoalkeeperPlayer(player) && !usedPlayerIds.has(player.playerId));
      if (goalkeeper) {
        ctx.lockGoalkeeperToGoalArea(goalkeeper);
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
        if (ctx.rolesMatch(player.position, posRole)) {
          const slotId = positions[i].subdivisionId;
          player.slotId = slotId;
          ctx.slotPlayerMap[slotId] = player;
          assignedPositions.add(i);
          break;
        }
      }
    });

    ctx.homePlayers$.next(allPlayers.filter((p: any) => p.slotId));
    ctx.benchPlayers$.next(allPlayers.filter((p: any) => !p.slotId));
    ctx.triggerChemistryPreview();

    ctx.selectedFormation = formationName;
    ctx.homeFormation$.next(formationName);
    ctx._isCustomLineup = false;

    ctx.cdr.markForCheck();
    ctx.cdr.detectChanges();
  
}

export function runSquadEditorApplySlotAssignment(ctx: any, player: any, sourceSlotId: any, targetSlotId: any, occupant: any): void {
    if (!ctx.canPlayerUseSlot(player, targetSlotId)) {
      return;
    }
    ctx.beginCoachMoveImpactTracking();
    if (sourceSlotId) {
      delete ctx.slotPlayerMap[sourceSlotId];
    }

    const fromX = ctx.getMarkerX(player);
    const fromY = ctx.getMarkerY(player);
    const fromLine = ctx.visualLineFromCoords(fromY);
    const fromChannel = ctx.visualChannelFromCoords(fromX);
    const mutation = applySquadEditorSlotDropMutation({
      player,
      sourceSlotId,
      targetSlotId,
      occupant,
      state: {
        homePlayers: ctx.homePlayers$.value,
        benchPlayers: ctx.benchPlayers$.value,
        slotPlayerMap: ctx.slotPlayerMap,
      },
    });
    ctx.slotPlayerMap = mutation.slotPlayerMap;
    const targetX = ctx.getFormationPositionCoord(targetSlotId, 'x') ?? ctx.getMarkerX(player);
    const targetY = ctx.getFormationPositionCoord(targetSlotId, 'y') ?? ctx.getMarkerY(player);
    const toLine = ctx.visualLineFromCoords(targetY);
    const toChannel = ctx.visualChannelFromCoords(targetX);
    const spatialRead = describeSquadEditorCoachMoveSpatialRead(
      fromX,
      fromY,
      targetX,
      targetY
    );
    ctx.lastCoachMoveRead = {
      title: `${player.name}: ${fromLine}${fromChannel} → ${toLine}${toChannel}`,
      body: fromLine !== toLine
        ? `Cambio de slot con impacto estructural: revisa ATT/MID/DEF y la penalización de rol.${spatialRead}`
        : `Reubicado en slot táctico: vuelve a una referencia limpia de formación.${spatialRead}`,
      level: fromLine !== toLine ? 'warn' : 'info',
    };

    ctx.benchPlayers$.next(mutation.benchPlayers);
    ctx.homePlayers$.next(mutation.homePlayers);

    ctx.refreshAfterLineupMutation();
  
}

export function runSquadEditorAssignPlayerToSlot(ctx: any): void {
    if (!ctx.selectedSlot || !ctx.selectedPlayerToAssign) return;

    const player = ctx.benchPlayers.find((p: any) => p.playerId === ctx.selectedPlayerToAssign);
    if (!player) return;
    if (!ctx.canPlayerUseSlot(player, ctx.selectedSlot.subdivisionId)) {
      return;
    }

    ctx.showConditionWarning(player);

    const slotId = ctx.selectedSlot.subdivisionId;
    const mutation = assignSquadEditorBenchPlayerToSlot({
      player,
      targetSlotId: slotId,
      state: {
        homePlayers: ctx.homePlayers$.value,
        benchPlayers: ctx.benchPlayers$.value,
        slotPlayerMap: ctx.slotPlayerMap,
      },
    });
    ctx.slotPlayerMap = mutation.slotPlayerMap;
    ctx.benchPlayers$.next(mutation.benchPlayers);
    ctx.homePlayers$.next(mutation.homePlayers);

    ctx.selectedSlot = null;
    ctx.selectedPlayerToAssign = '';
    ctx.saveLineup();
    ctx.triggerChemistryPreview();
    ctx.updateFormationDetection();
    ctx.cdr.detectChanges();
  
}

export function runSquadEditorEnrichLastCoachMoveReadWithLatestDelta(ctx: any): void {
    if (!ctx.pendingCoachMoveBaseline || !ctx.lastCoachMoveRead) { return; }
    const baseline = ctx.pendingCoachMoveBaseline;
    const currentChemistry = ctx.getDisplayedChemistryScore();
    const deltas: string[] = [];
    const magnitudes: number[] = [];

    pushSquadEditorCoachDelta(deltas, magnitudes, 'ATT', ctx.attackRating - baseline.attack);
    pushSquadEditorCoachDelta(deltas, magnitudes, 'MID', ctx.midfieldRating - baseline.midfield);
    pushSquadEditorCoachDelta(deltas, magnitudes, 'DEF', ctx.defenseRating - baseline.defense);
    if (baseline.chemistry !== null && currentChemistry !== null) {
      pushSquadEditorCoachDelta(deltas, magnitudes, 'Chem', currentChemistry - baseline.chemistry);
    }
    const baseBody = ctx.lastCoachMoveRead.baseBody
      ?? ctx.lastCoachMoveRead.body.split(' Cambios:')[0];
    const channelDeltas = buildSquadEditorCoachChannelDeltas(
      baseline.channels,
      ctx.getTacticalChannelScoresSnapshot(),
      magnitudes,
      baseBody
    );
    const visualDeltas = buildSquadEditorVisualChannelDeltas(
      baseline.visualChannels,
      ctx.tacticalChannelBreakdown,
      magnitudes
    );
    const visualEngineTension = buildSquadEditorVisualEngineTension(
      baseline.visualChannels,
      ctx.tacticalChannelBreakdown,
      ctx.attackRating - baseline.attack,
      ctx.defenseRating - baseline.defense
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

    ctx.lastCoachMoveRead = {
      ...ctx.lastCoachMoveRead,
      baseBody,
      body: `${baseBody}${impact}`,
      level: severity.includes('Impacto extremo') || squadEditorVisualDeltaHasHardWarning(visualDeltas) || !!visualEngineTension
        ? 'danger'
        : ctx.lastCoachMoveRead.level,
    };
  
}

export function runSquadEditorFetchRatingsPreview(ctx: any): void {
    const slots = ctx.homePlayers
      .filter((p: any) => !!p.slotId)
      .map((p: any) => {
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
    const body = { formation: ctx.selectedFormation, slots };
    (ctx.http as HttpClient).post<{
      attackRating: number;
      midfieldRating: number;
      defenseRating: number;
      inferredFormation?: string;
      perPlayerEffectiveness?: Record<string, number>;
      teamAverage?: number;
    }>(
      `${environment.apiUrl}/career/lineup/preview-ratings`, body)
      .subscribe({
        next: (res: any) => {
          if (res && typeof res.attackRating === 'number'
              && typeof res.midfieldRating === 'number'
              && typeof res.defenseRating === 'number') {
            ctx.liveRatings = {
              attackRating: Math.round(res.attackRating),
              midfieldRating: Math.round(res.midfieldRating),
              defenseRating: Math.round(res.defenseRating),
            };
            if (typeof res.teamAverage === 'number') {
              ctx.formationEffectiveness$.next({
                inferredFormation: res.inferredFormation || ctx.selectedFormation,
                perPlayerEffectiveness: res.perPlayerEffectiveness || {},
                teamAverage: res.teamAverage,
                attackRating: res.attackRating,
                midfieldRating: res.midfieldRating,
                defenseRating: res.defenseRating,
              });
            }
            ctx.enrichLastCoachMoveReadWithLatestDelta();
            ctx.cdr.markForCheck();
            ctx.cdr.detectChanges();
          }
        },
        error: () => {
        }
      });
  
}

export function runSquadEditorHandleMarkerDragEnd(ctx: any, event: any, player: any): void {
    if (!player) { return; }
    if (ctx.isGoalkeeperPlayer(player)) {
      ctx.lockGoalkeeperToGoalArea(player);
      resetSquadEditorDragSource(event.source);
      ctx.homePlayers$.next([...ctx.homePlayers$.value]);
      ctx.cdr.markForCheck();
      return;
    }
    const previousX = ctx.getMarkerX(player);
    const previousY = ctx.getMarkerY(player);
    ctx.beginCoachMoveImpactTracking();

    const fieldEl = ctx.fieldContainer?.nativeElement;
    if (!fieldEl) { return; }
    const rect = fieldEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { return; }
    const dropX = event.dropPoint?.x ?? rect.left;
    const dropY = event.dropPoint?.y ?? rect.top;

    if (ctx.isDropOverBenchCard(dropX, dropY)) {
      ctx.movePlayerToBench(player);
      return;
    }

    const pickup = ctx.markerPickupOffset.get(player.playerId) ?? { x: 35, y: 24 };
    ctx.markerPickupOffset.delete(player.playerId);

    const sourceEl = getSquadEditorDragRef(event.source)?.element?.nativeElement;
    const markerRect = sourceEl?.getBoundingClientRect();
    const halfHeight = (markerRect?.height ?? 48) / 2;

    const { xPct, yPct } = computeSquadEditorFieldDropPercent({
      dropPoint: { x: dropX, y: dropY },
      pickupOffset: pickup,
      fieldRect: rect,
      markerHalfHeight: halfHeight,
    });

    // Dropping a marker on another occupied canonical slot is a slot
    // operation, not a free-position override.  The marker element sits
    // above the CDK drop-list, so the marker drag-end callback receives these
    // drops directly.  Resolve the nearest compatible slot before applying a
    // pixel move to keep the visible semantics deterministic (swap for an
    // occupied slot, free positioning everywhere else).
    const targetSlot = ctx.findClosestSubdivision(xPct, yPct, player);
    if (targetSlot && targetSlot.subdivisionId !== player.slotId) {
      const targetCenter = computeSquadEditorSlotCenter({
        canonicalX: ctx.getFormationPositionCoord(targetSlot.subdivisionId, 'x'),
        canonicalY: ctx.getFormationPositionCoord(targetSlot.subdivisionId, 'y'),
        slotRect: targetSlot,
      });
      if (isSquadEditorDropNearSlotCenter({
        drop: { xPct, yPct },
        center: targetCenter,
        thresholdPct: 4,
      })) {
        const occupant = ctx.slotPlayerMap[targetSlot.subdivisionId] ?? null;
        ctx.applySlotAssignment(player, player.slotId || null, targetSlot.subdivisionId, occupant);
        resetSquadEditorDragSource(event.source);
        const dragRef = getSquadEditorDragRef(event.source);
        if (dragRef) {
          clearSquadEditorDragTransform(dragRef);
        }
        return;
      }
    }

    if (ctx.isInsideGoalkeeperProtectedArea(xPct, yPct)) {
      ctx.pendingCoachMoveBaseline = null;
      if (player.slotId) {
        delete player.xPercent;
        delete player.yPercent;
        ctx.slotPlayerMap[player.slotId] = player;
      }
      resetSquadEditorDragSource(event.source);
      ctx.refreshAfterLineupMutation();
      return;
    }

    ctx.applyMarkerFieldDrop(player, { previousX, previousY, xPct, yPct });

    ctx.captureRatingsFromFormationEffectiveness();
    ctx.requestRatingsPreview();

    ctx.refreshAfterLineupMutation();

    const dragRef = getSquadEditorDragRef(event.source);
    if (dragRef) {
      resetSquadEditorDragSource(event.source);
      clearSquadEditorDragTransform(dragRef);
    }
  
}

export function runSquadEditorLoadSquadFromBackend(ctx: any): void {
    (ctx.http as HttpClient).get<SquadEditorCurrentLineupResponse>(`${environment.apiUrl}/career/lineup/current`).subscribe({
      next: (response: any) => {
        ctx.currentChemistryScore = (typeof response?.chemistryScore === 'number')
            ? response.chemistryScore
            : null;

        ctx.formationEffectiveness$.next(
          (response?.formationEffectiveness && typeof response.formationEffectiveness.teamAverage === 'number')
            ? response.formationEffectiveness
            : null
        );
        ctx.captureRatingsFromFormationEffectiveness();

        const formationName = response?.formation
          || ctx.data?.currentFormation
          || ctx.selectedFormation
          || '4-4-2';
        const positions = ctx.formationPositions[formationName] || [];

        ctx.homeFormation$.next(formationName);
        ctx.selectedFormation = formationName;

        ctx.slotPlayerMap = {};

        const playersList = response?.players || [];
        if (playersList.length === 0) {
          ctx.executeAutoSelect(formationName);
        }

        const squadSource: SquadEditorLineupPlayer[] = (ctx.data?.squad && ctx.data.squad.length > 0)
          ? ctx.data.squad.map((sp: SessionPlayer) => ({
              playerId: sp.sessionPlayerId,
              name: sp.name,
              position: sp.position,
              overall: sp.attack ?? 70,
              energy: sp.energy ?? 100,
              injured: sp.injured ?? false
            }))
          : playersList;

        const squadById = new Map<string, SquadEditorLineupPlayer>();
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
              player.xPercent = clampFieldPercent(slot.customXPercent);
            }
            if (typeof slot.customYPercent === 'number' && isFinite(slot.customYPercent)) {
              player.yPercent = clampFieldPercent(slot.customYPercent);
            }
            ctx.slotPlayerMap[slot.subdivisionId] = player;
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
            if (ctx.rolesMatch(player.position, posRole)) {
              const slotId = positions[i].subdivisionId;
              player.slotId = slotId;
              ctx.slotPlayerMap[slotId] = player;
              assignedPositions.add(i);
              break;
            }
          }
        }

        for (const player of allPlayers) {
          if (!player.slotId) { continue; }
          if (ctx.isSlotInActiveFormation(player.slotId)) { continue; }
          delete ctx.slotPlayerMap[player.slotId];
          player.slotId = '';
        }

        for (const player of allPlayers) {
          if (player.slotId) { continue; }
          for (let i = 0; i < positions.length; i++) {
            if (assignedPositions.has(i)) { continue; }
            const posRole = positions[i].role;
            if (ctx.rolesMatch(player.position, posRole)) {
              const slotId = positions[i].subdivisionId;
              player.slotId = slotId;
              ctx.slotPlayerMap[slotId] = player;
              assignedPositions.add(i);
              break;
            }
          }
        }

        const seenSubdivisionIds = new Set<string>();
        for (const player of allPlayers) {
          if (!player.slotId) { continue; }
          if (seenSubdivisionIds.has(player.slotId)) {
            delete ctx.slotPlayerMap[player.slotId];
            player.slotId = '';
            continue;
          }
          seenSubdivisionIds.add(player.slotId);
        }

        ctx.homePlayers$.next(allPlayers.filter((p: any) => p.slotId));
        ctx.benchPlayers$.next(allPlayers.filter((p: any) => !p.slotId));
        ctx.triggerChemistryPreview();

        ctx.isInitializing = false;
        ctx.cdr.detectChanges();
      },
      error: () => {
        ctx.homeFormation$.next(ctx.selectedFormation || '4-4-2');
        ctx.isInitializing = false;
        ctx.cdr.detectChanges();
      }
    });
  
}

export function runSquadEditorOnFormationChange(ctx: any, newFormation: any): void {
    // Bloquear si hay un cambio en progreso
    if (ctx.isFormationChanging) {
      return;
    }

// Ignorar cambios durante inicialización (evita NG0100)
    if (ctx.isInitializing) {
      return;
    }

    // siempre actualizado) sobre ctx.selectedFormation (puede no estarlo si se
    // llama el handler programáticamente antes de que Angular sincronice el DOM).
    const targetFormation = newFormation ?? ctx.selectedFormation;
    if (!targetFormation) {
      return;
    }

    if (ctx.selectedFormation !== targetFormation) {
      ctx.selectedFormation = targetFormation;
    }

    if (targetFormation === ctx.homeFormation$.value) {
      return;
    }

    ctx.isFormationChanging = true;
    ctx.cdr.markForCheck();

    ctx.formationChangeCompleteSubject = new Subject<void>();

    ctx.homeFormation$.next(targetFormation);

    ctx.executeFormationChange(targetFormation);
  
}

export function runSquadEditorSaveLineup(ctx: any, onDone: any): void {
    const validHomePlayers = ctx.getUniqueValidHomePlayers();
    const playerCount = validHomePlayers.length;
    if (playerCount < 7) {
      ctx.errorMessage$.next('Mínimo 7 jugadores para guardar (puedes tener más)');
      ctx.lineupWarning$.next(null);
      onDone?.();
      return;
    }
    if (playerCount > 11) {
      ctx.errorMessage$.next('Máximo 11 jugadores');
      ctx.lineupWarning$.next(null);
      onDone?.();
      return;
    }
    ctx.errorMessage$.next('');

    const playerIds: string[] = validHomePlayers.map((p: any) => p.playerId);
    const slots: LineupSlotDTO[] = validHomePlayers
      .filter((p: any) => !!p.slotId)
      .map((p: any) => {
        const dto: LineupSlotDTO = { playerId: p.playerId, subdivisionId: p.slotId };
        if (typeof p.xPercent === 'number') { dto.customXPercent = p.xPercent; }
        if (typeof p.yPercent === 'number') { dto.customYPercent = p.yPercent; }
        return dto;
      });

    (ctx.http as HttpClient).post<{warnings?: LineupWarningDTO[]}>(
      `${environment.apiUrl}/career/lineup/manual-select`,
      {
        formation: ctx.selectedFormation,
        playerIds,
        slots
      }
    ).subscribe({
      next: () => {
        (ctx.http as HttpClient).post<{warnings?: LineupWarningDTO[]}>(
          `${environment.apiUrl}/career/lineup/confirm`,
          {}
        ).subscribe({
          next: (response: any) => {
            const warnings = response?.warnings ?? [];
            ctx.lineupWarning$.next(warnings.length > 0 ? warnings[0] : null);
            onDone?.();
          },
          error: (err: any) => {
            if (err.error?.code) {
              ctx.errorMessage$.next(err.error.message || 'Error al guardar');
            }
            onDone?.();
          }
        });
      },
      error: (err: any) => {
        if (err.error?.code) {
          ctx.errorMessage$.next(err.error.message || 'Error al guardar');
        }
        onDone?.();
      }
    });
  
}

export function runSquadEditorTriggerChemistryPreview(ctx: any): void {
    const ids = ctx.homePlayers.map((p: any) => p.playerId);
    const slots: LineupSlotDTO[] = ctx.homePlayers
      .filter((p: any) => !!p.slotId)
      .map((p: any) => {
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
      formation: ctx.selectedFormation,
      slots: slots.map((s: any) => ({
        p: s.playerId,
        s: s.subdivisionId,
        x: typeof s.customXPercent === 'number' ? Number(s.customXPercent.toFixed(2)) : null,
        y: typeof s.customYPercent === 'number' ? Number(s.customYPercent.toFixed(2)) : null,
      }))
    });
    ctx.previewTrigger$.next({
      ids,
      formation: ctx.selectedFormation,
      slots,
      signature
    });
  
}

export function runSquadEditorApplyCurrentXiToFormation(ctx: any, formationName: any): any {
    const positions = ctx.formationPositions[formationName] || [];
    if (positions.length === 0) { return; }

    const mutation = remapSquadEditorCurrentXiToFormation({
      positions,
      currentXi: ctx.getUniqueValidHomePlayers().slice(0, 11),
      currentHomePlayers: ctx.homePlayers$.value,
      currentBenchPlayers: ctx.benchPlayers$.value,
      isGoalkeeper: player => ctx.isGoalkeeperPlayer(player),
      canPlayerUseSlot: (player, slotId) => ctx.canPlayerUseSlot(player, slotId),
      roleFamily: role => ctx.getRoleFamily(role ?? ''),
      goalkeeperSlotId: SQUAD_EDITOR_GOALKEEPER_SLOT_ID,
    });

    ctx.slotPlayerMap = mutation.slotPlayerMap;
    ctx.homePlayers$.next(mutation.homePlayers);
    ctx.benchPlayers$.next(mutation.benchPlayers);
    ctx.selectedFormation = formationName;
    ctx.homeFormation$.next(formationName);
    ctx._isCustomLineup = false;
  
}

export function runSquadEditorApplyMarkerFieldDrop(ctx: any, player: any, move: any): any {
    if (!player.slotId || player.slotId === '') {
      const closest = ctx.findClosestSubdivision(move.xPct, move.yPct, player);
      if (closest) { player.slotId = closest.subdivisionId; }
    }

    const owningSlot = player.slotId
      ? ctx.subdivisions.find((s: any) => s.subdivisionId === player.slotId) ?? null
      : null;
    const canonicalX = player.slotId ? ctx.getFormationPositionCoord(player.slotId, 'x') : null;
    const canonicalY = player.slotId ? ctx.getFormationPositionCoord(player.slotId, 'y') : null;
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
      ctx.snapPlayerBackToSlotCenter(player, move, nativeCenter);
      return;
    }

    ctx.keepPlayerAtFreeDropPosition(player, move);
  
}

export function runSquadEditorBeginCoachMoveImpactTracking(ctx: any): any {
    ctx.pendingCoachMoveBaseline = {
      attack: ctx.attackRating,
      midfield: ctx.midfieldRating,
      defense: ctx.defenseRating,
      chemistry: ctx.getDisplayedChemistryScore(),
      channels: ctx.getTacticalChannelScoresSnapshot(),
      visualChannels: ctx.tacticalChannelBreakdown,
    };
  
}

export function runSquadEditorCaptureRatingsFromFormationEffectiveness(ctx: any): any {
    const fe = ctx.formationEffectiveness$.value;
    if (fe && typeof fe.attackRating === 'number'
        && typeof fe.midfieldRating === 'number'
        && typeof fe.defenseRating === 'number') {
      ctx.liveRatings = {
        attackRating: Math.round(fe.attackRating),
        midfieldRating: Math.round(fe.midfieldRating),
        defenseRating: Math.round(fe.defenseRating),
      };
    }
  
}

export function runSquadEditorDeriveStyleTags(ctx: any, formationLabel: any, players: any): any {
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

export function runSquadEditorDetectFormation(ctx: any): any {
    const players = ctx.homePlayers.filter((p: any) => !!p.slotId);

    // position, not their underlying role. This makes the formation
    // label reflect drag-drop changes (see getPositionRoleFamily).
    const result = detectSquadEditorFormationFromFamilies(
      players.map((p: any) => ctx.getPositionRoleFamily(p)),
      ctx.formationPositions,
    );
    ctx._isCustomLineup = result.isCustomLineup;
    //
    // The manager-selected formation is tactical intent. A manual drag can
    // make the current shape *look* like another canonical by count for one
    // frame (e.g. a 4-4-2 MID crosses into ATT and count-based detection says
    // 4-3-3). Keep the dropdown anchored to explicit manager choice; changing
    // formation should happen via the select/autoselect flow, not free drag.
    return result.label;
  
}
