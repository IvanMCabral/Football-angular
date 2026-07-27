import { FORMATION_LINES_BY_FORMATION } from './partido-modal.component';
import { MatchEvent } from '../../../../core/services/match-engine.model';
import { SessionPlayer } from '../../../../shared/models/player.model';

export function partidoOnFormationChange(ctx: any, value: string): void {
    const newFormation = ctx.normalizeFormation(value);
    ctx.selectedFormation.set(newFormation);
    const currentXi = Array.from(ctx.slotAssignments.values()).filter((playerId): playerId is string => !!playerId);
    const autoFilledPlayerIds = new Set(Array.from(ctx.autoFilledSlots.values()).filter(Boolean));
    const autoFillSourceByPlayerId = new Map<string, string>();
    for (const [slotIdx, playerId] of ctx.autoFilledSlots) {
      const sourcePlayerId = ctx.autoFillSourcePlayerBySlot.get(slotIdx);
      if (playerId && sourcePlayerId) {
        autoFillSourceByPlayerId.set(playerId, sourcePlayerId);
      }
    }
    const coordsByPlayerId = new Map<string, { x: number; y: number }>();
    for (const [slotIdx, playerId] of ctx.slotAssignments) {
      if (!playerId) {
        continue;
      }
      const coords = ctx.freeSlotCoords.get(slotIdx);
      if (coords) {
        coordsByPlayerId.set(playerId, coords);
      }
    }
    const newLineCount = (FORMATION_LINES_BY_FORMATION[newFormation] ?? []).reduce(
      (sum, line) => sum + line.length, 0
    );
    ctx.slotAssignments = new Map();
    ctx.freeSlotCoords.clear();
    ctx.autoFilledSlots.clear();
    ctx.autoFillSourcePlayerBySlot.clear();
    ctx.bumpFreePositionRevision();
    for (let i = 0; i < newLineCount; i++) {
      const playerId = currentXi[i] ?? null;
      ctx.slotAssignments.set(i, playerId);
      if (playerId) {
        const coords = coordsByPlayerId.get(playerId);
        if (coords) {
          ctx.freeSlotCoords.set(i, coords);
        }
        if (autoFilledPlayerIds.has(playerId)) {
          ctx.autoFilledSlots.set(i, playerId);
          const sourcePlayerId = autoFillSourceByPlayerId.get(playerId);
          if (sourcePlayerId) {
            ctx.autoFillSourcePlayerBySlot.set(i, sourcePlayerId);
          }
        }
      }
    }
    ctx.errorMsg = '';
    ctx.selectedNudgeSlotIdx = null;
  
}

export function partidoOnSlotDrop(ctx: any, event: DragEvent, targetSlotIdx: number): void {
    event.preventDefault();
    if (ctx.dragSourceSlotIdx === null) {
      return;
    }
    if (ctx.isGoalkeeperSlot(targetSlotIdx) || ctx.isGoalkeeperSlot(ctx.dragSourceSlotIdx)) {
      ctx.onSlotDragEnd();
      return;
    }
    if (ctx.dragSourceIsBench) {
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const playerId = raw.startsWith('bench:') ? raw.substring(6) : null;
      if (!playerId) {
        return;
      }
      const playerOffId = ctx.playerOffIdForBenchPlacement(targetSlotIdx, playerId);
      if (ctx.isAutoFilledSlot(targetSlotIdx) && !playerOffId && !ctx.isConfirmingSameAutoPlayer(targetSlotIdx, playerId)) {
        ctx.errorMsg = 'No se puede confirmar AUTO porque falta identificar quién sale. Usá un cambio manual o reabrí el modal.';
        ctx.onSlotDragEnd();
        return;
      }
      if (playerOffId && playerOffId !== playerId) {
        if (!ctx.registerPendingSubstitution(playerOffId, playerId, targetSlotIdx)) {
          ctx.onSlotDragEnd();
          return;
        }
      }
      ctx.slotAssignments.set(targetSlotIdx, playerId);
      ctx.clearAutoFillMarker(targetSlotIdx);
      ctx.freeSlotCoords.delete(targetSlotIdx);
      ctx.bumpFreePositionRevision();
    } else {
      const sourceSlot = ctx.dragSourceSlotIdx;
      if (sourceSlot === targetSlotIdx) {
        return;
      }
      const sourcePlayer = ctx.slotAssignments.get(sourceSlot) ?? null;
      const targetPlayer = ctx.slotAssignments.get(targetSlotIdx) ?? null;
      ctx.slotAssignments.set(targetSlotIdx, sourcePlayer);
      ctx.slotAssignments.set(sourceSlot, targetPlayer);
      ctx.swapFreeSlotCoords(sourceSlot, targetSlotIdx);
      ctx.clearAutoFillMarker(targetSlotIdx);
      ctx.clearAutoFillMarker(sourceSlot);
    }
    ctx.dragSourceSlotIdx = null;
    ctx.dragSourceIsBench = false;
    // Force CD by bumping the formation signal (signals don't track Map
    // mutations, so we need a tick to re-render the dots + the
    // hasPendingChanges computed).
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}

export function partidoOnPitchDrop(ctx: any, event: DragEvent): void {
    event.preventDefault();
    if (ctx.dragSourceSlotIdx === null || ctx.dragSourceIsBench || ctx.dragSourceSlotIdx < 0) {
      ctx.onSlotDragEnd();
      return;
    }
    if (ctx.isGoalkeeperSlot(ctx.dragSourceSlotIdx)) {
      ctx.onSlotDragEnd();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || !rect.height) {
      ctx.onSlotDragEnd();
      return;
    }
    const x = ctx.clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = ctx.clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    ctx.freeSlotCoords.set(ctx.dragSourceSlotIdx, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    });
    ctx.bumpFreePositionRevision();
    ctx.clearAutoFillMarker(ctx.dragSourceSlotIdx);
    ctx.onSlotDragEnd();
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}

export function partidoOnPitchPointerMove(ctx: any, event: PointerEvent): void {
    if (ctx.activePointerDragSlotIdx === null) {
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const next = ctx.coordsFromPointerEvent(event, target);
    if (!next) {
      return;
    }
    const slotIdx = ctx.activePointerDragSlotIdx;
    const current = ctx.freeSlotCoords.get(slotIdx) ?? ctx.baseSlotCoords(slotIdx);
    const moved = Math.abs(current.x - next.x) >= 0.05 || Math.abs(current.y - next.y) >= 0.05;
    if (!moved) {
      return;
    }
    ctx.pointerDragMoved = true;
    ctx.freeSlotCoords.set(slotIdx, next);
    ctx.clearAutoFillMarker(slotIdx);
    ctx.bumpFreePositionRevision();
    ctx.selectedFormation.set(ctx.selectedFormation());
    ctx.cdr.markForCheck();
    event.preventDefault();
  
}

export function partidoOnPitchPointerUp(ctx: any, event: PointerEvent): void {
    if (ctx.activePointerDragSlotIdx === null) {
      return;
    }
    const slotIdx = ctx.activePointerDragSlotIdx;
    const start = ctx.pointerDragStartCoords ?? ctx.baseSlotCoords(slotIdx);
    const target = event.currentTarget as HTMLElement;
    const next = ctx.coordsFromPointerEvent(event, target) ?? ctx.freeSlotCoords.get(slotIdx) ?? start;
    if (ctx.pointerDragMoved) {
      ctx.freeSlotCoords.set(slotIdx, next);
      ctx.clearAutoFillMarker(slotIdx);
      ctx.bumpFreePositionRevision();
      ctx.persistLastNudgeHarnessCase(slotIdx, start, next);
      ctx.rememberCurrentPlayerCoord(slotIdx, next);
      ctx.suppressNextSlotClick = true;
    }
    ctx.activePointerDragSlotIdx = null;
    ctx.pointerDragStartCoords = null;
    ctx.pointerDragMoved = false;
    ctx.selectedFormation.set(ctx.selectedFormation());
    ctx.cdr.markForCheck();
    event.preventDefault();
  
}

export function partidoOnPitchSlotClick(ctx: any, slotIdx: number): void {
    if (ctx.suppressNextSlotClick) {
      ctx.suppressNextSlotClick = false;
      return;
    }
    if (!ctx.selectedBenchPlayerId) {
      ctx.selectNudgeSlot(slotIdx);
      return;
    }
    if (ctx.isGoalkeeperSlot(slotIdx)) {
      ctx.errorMsg = 'El arquero no se puede reemplazar desde este flujo.';
      return;
    }
    const playerOnId = ctx.selectedBenchPlayerId;
    const playerOffId = ctx.playerOffIdForBenchPlacement(slotIdx, playerOnId);
    if (ctx.isAutoFilledSlot(slotIdx) && !playerOffId && !ctx.isConfirmingSameAutoPlayer(slotIdx, playerOnId)) {
      ctx.errorMsg = 'No se puede confirmar AUTO porque falta identificar quién sale. Usá un cambio manual o reabrí el modal.';
      return;
    }
    if (playerOffId && playerOffId !== playerOnId) {
      if (!ctx.registerPendingSubstitution(playerOffId, playerOnId, slotIdx)) {
        return;
      }
    }
    ctx.slotAssignments.set(slotIdx, playerOnId);
    ctx.clearAutoFillMarker(slotIdx);
    ctx.selectedBenchPlayerId = null;
    ctx.errorMsg = '';
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}

export function partidoAutoFillEmptySlots(ctx: any): void {
    ctx.autoFilledSlots.clear();
    ctx.autoFillSourcePlayerBySlot.clear();
    ctx.warningMsg = '';
    ctx.sanitizeDuplicateSlotAssignments();
    const lines = FORMATION_LINES_BY_FORMATION[ctx.selectedFormation()] ?? [];
    let slotIdx = 0;
    let unfilled = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        const current = ctx.slotAssignments.get(slotIdx);
        if (current) {
          slotIdx++;
          continue;
        }
        const roleLabel = line[dotIdx];
        const filled = ctx.tryFillSlot(slotIdx, roleLabel);
        if (!filled) {
          unfilled++;
        }
        slotIdx++;
      }
    }
    if (unfilled > 0) {
      ctx.warningMsg = ctx.hasLocalDebugPartidoEvent()
        ? `${unfilled} posición(es) quedaron sin AUTO porque no tienen una lesión propia asociada. Revisá el estado de la fecha o usá un cambio manual.`
        : `${unfilled} posición(es) no se pudieron completar; no hay suficientes jugadores en el banquillo con posición compatible.`;
    }
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}

export function partidoResolveAutoFillSourcePlayerId(ctx: any, roleLabel: string): string | null {
    const assigned = new Set(Array.from(ctx.slotAssignments.values()).filter((id): id is string => !!id));
    const alreadyLinkedSources = new Set(ctx.autoFillSourcePlayerBySlot.values());
    const compatibleGroups = ctx.compatibleGroupForRole(roleLabel);
    const squad: SessionPlayer[] = ctx.data.squad ?? [];
    const events: MatchEvent[] = ctx.data.events ?? [];
    const squadIds = new Set(squad.map(player => player.sessionPlayerId).filter(Boolean));
    const candidates = [...events]
      .filter(event => event.eventType === 'INJURY' && !!event.playerId)
      .filter(event => !event.teamId || event.teamId === ctx.data.homeTeamId || squadIds.has(event.playerId ?? ''))
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
      .map(event => event.playerId as string)
      .find(playerId => {
        if (assigned.has(playerId) || alreadyLinkedSources.has(playerId)) {
          return false;
        }
        return true;
      });
    if (!candidates) {
      return null;
    }
    const compatibleCandidate = [...events]
      .filter(event => event.eventType === 'INJURY' && !!event.playerId)
      .filter(event => !event.teamId || event.teamId === ctx.data.homeTeamId || squadIds.has(event.playerId ?? ''))
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
      .map(event => event.playerId as string)
      .find(playerId => {
        if (assigned.has(playerId) || alreadyLinkedSources.has(playerId)) {
          return false;
        }
        const player = squad.find(p => p.sessionPlayerId === playerId);
        if (!player) {
          return false;
        }
        const position = (player.position || '').toUpperCase();
        return compatibleGroups.includes(position);
      });
    return compatibleCandidate ?? candidates;
  
}

export function partidoSanitizeDuplicateSlotAssignments(ctx: any): void {
    const seen = new Set<string>();
    let changed = false;
    const assignments = Array.from(ctx.slotAssignments.entries()) as Array<[number, string | null]>;
    for (const [slotIdx, playerId] of assignments.sort((a, b) => a[0] - b[0])) {
      if (!playerId) {
        continue;
      }
      if (seen.has(playerId)) {
        ctx.slotAssignments.set(slotIdx, null);
        ctx.freeSlotCoords.delete(slotIdx);
        ctx.clearAutoFillMarker(slotIdx);
        changed = true;
        continue;
      }
      seen.add(playerId);
    }
    if (changed) {
      ctx.bumpFreePositionRevision();
      if (!ctx.warningMsg) {
        ctx.warningMsg = 'Se corrigió un XI duplicado antes de guardar.';
      }
    }
  
}

export function partidoPersistLastNudgeHarnessCase(ctx: any, slotIdx: number, from: { x: number; y: number }, target: { x: number; y: number }): void {
    const player = ctx.playerAtSlot(slotIdx);
    if (!player || ctx.isGoalkeeperSlot(slotIdx)) {
      return;
    }
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    if (!Number.isFinite(distance) || distance < 0.5) {
      return;
    }
    const role = ctx.roleLabelForSlot(slotIdx);
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: 'partido-modal-nudge',
      formation: ctx.selectedFormation(),
      playerId: player.sessionPlayerId,
      playerName: player.name,
      playerPosition: player.position ?? role,
      playerRole: role,
      slotId: null,
      fromXPercent: Number(from.x.toFixed(3)),
      fromYPercent: Number(from.y.toFixed(3)),
      targetXPercent: Number(target.x.toFixed(3)),
      targetYPercent: Number(target.y.toFixed(3)),
      deltaXPercent: Number((target.x - from.x).toFixed(3)),
      deltaYPercent: Number((target.y - from.y).toFixed(3)),
      coachReadTitle: 'Partido modal nudge',
      coachReadBody: `${player.name}: ${from.x.toFixed(1)},${from.y.toFixed(1)} -> ${target.x.toFixed(1)},${target.y.toFixed(1)}`,
    };
    try {
      window.localStorage.setItem('manager:last-modal-position-move', JSON.stringify(payload));
    } catch {
      // Local QA metadata is best-effort; the user-facing save flow must continue.
    }
  
}

export function partidoHydrateRememberedPlayerCoords(ctx: any): void {
    const remembered = ctx.readRememberedPlayerCoords();
    let changed = false;
    for (const [slotIdx, playerId] of ctx.slotAssignments) {
      if (!playerId) {
        continue;
      }
      const coords = remembered[playerId];
      if (!coords) {
        continue;
      }
      ctx.freeSlotCoords.set(slotIdx, {
        x: ctx.clampPercent(coords.x),
        y: ctx.clampPercent(coords.y)
      });
      changed = true;
    }
    if (changed) {
      ctx.bumpFreePositionRevision();
    }
  
}

export function partidoRememberPlayerCoordsForSavedSlots(ctx: any, slots: Array<{
    sessionPlayerId: string;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>): void {
    const remembered = ctx.readRememberedPlayerCoords();
    for (const slot of slots) {
      if (!slot.sessionPlayerId) {
        continue;
      }
      if (ctx.isFinitePercent(slot.customXPercent) && ctx.isFinitePercent(slot.customYPercent)) {
        remembered[slot.sessionPlayerId] = {
          x: ctx.clampPercent(slot.customXPercent),
          y: ctx.clampPercent(slot.customYPercent)
        };
      } else {
        delete remembered[slot.sessionPlayerId];
      }
    }
    ctx.writeRememberedPlayerCoords(remembered);
  
}


export function partidoFocusPreSelectedPlayerIfPresent(ctx: any): void {
    const playerId = ctx.data.preSelectedPlayerId;
    if (!playerId) {
      return;
    }
    const slotIdx = ctx.slotIndexByPlayerId(playerId);
    if (slotIdx === null) {
      return;
    }
    ctx.selectedNudgeSlotIdx = slotIdx;
    if (ctx.data.reason === 'INJURY_FORCED_SUBSTITUTION') {
      ctx.errorMsg = `${ctx.playerNameById(playerId)} está lesionado: elegí un suplente y tocá su ficha para preparar el cambio. También podés ajustar formación y píxeles antes de guardar.`;
    }
  
}

export function partidoOnSlotDragStart(ctx: any, event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    if (ctx.isGoalkeeperSlot(slotIdx)) {
      event.preventDefault();
      ctx.onSlotDragEnd();
      return;
    }
    ctx.dragSourceSlotIdx = slotIdx;
    ctx.dragSourceIsBench = false;
    event.dataTransfer.setData('text/plain', `slot:${slotIdx}`);
    event.dataTransfer.effectAllowed = 'move';
  
}

export function partidoOnPitchSlotPointerDown(ctx: any, event: PointerEvent, slotIdx: number): void {
    if (event.button !== 0 || ctx.isGoalkeeperSlot(slotIdx) || !ctx.playerAtSlot(slotIdx)) {
      return;
    }
    ctx.activePointerDragSlotIdx = slotIdx;
    ctx.selectedNudgeSlotIdx = slotIdx;
    ctx.pointerDragStartCoords = ctx.freeSlotCoords.get(slotIdx) ?? ctx.baseSlotCoords(slotIdx);
    ctx.pointerDragMoved = false;
    ctx.suppressNextSlotClick = false;
    ctx.errorMsg = '';
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  
}

export function partidoCoordsFromPointerEvent(ctx: any, event: PointerEvent, pitchEl: HTMLElement): { x: number; y: number } | null {
    const rect = pitchEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    const x = ctx.clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = ctx.clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  
}

export function partidoSelectNudgeSlot(ctx: any, slotIdx: number): void {
    if (ctx.isGoalkeeperSlot(slotIdx)) {
      ctx.selectedNudgeSlotIdx = null;
      ctx.errorMsg = 'El arquero queda fijo en el área chica y no se puede mover manualmente.';
      return;
    }
    if (!ctx.playerAtSlot(slotIdx)) {
      ctx.selectedNudgeSlotIdx = null;
      return;
    }
    ctx.selectedNudgeSlotIdx = slotIdx;
    ctx.errorMsg = '';
  
}

export function partidoNudgeSelectedSlot(ctx: any, dx: number, dy: number): void {
    if (!ctx.canNudgeSelectedSlot() || ctx.selectedNudgeSlotIdx === null) {
      return;
    }
    const slotIdx = ctx.selectedNudgeSlotIdx;
    const base = ctx.baseSlotCoords(slotIdx);
    const current = ctx.freeSlotCoords.get(slotIdx) ?? base;
    const next = {
      x: Number(ctx.clampPercent(current.x + dx).toFixed(2)),
      y: Number(ctx.clampPercent(current.y + dy).toFixed(2)),
    };
    ctx.freeSlotCoords.set(slotIdx, {
      x: next.x,
      y: next.y,
    });
    ctx.persistLastNudgeHarnessCase(slotIdx, current, next);
    ctx.clearAutoFillMarker(slotIdx);
    ctx.bumpFreePositionRevision();
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}

export function partidoResetSelectedSlotPosition(ctx: any): void {
    if (ctx.selectedNudgeSlotIdx === null) {
      return;
    }
    ctx.freeSlotCoords.delete(ctx.selectedNudgeSlotIdx);
    const playerId = ctx.slotAssignments.get(ctx.selectedNudgeSlotIdx) ?? null;
    if (playerId) {
      ctx.forgetRememberedPlayerCoord(playerId);
    }
    ctx.bumpFreePositionRevision();
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}

export function partidoTryFillSlot(ctx: any, slotIdx: number, roleLabel: string): boolean {
    const compatibleGroups = ctx.compatibleGroupForRole(roleLabel);
    const bench = (ctx.benchPlayers as SessionPlayer[]).filter((p: SessionPlayer) => ctx.isPlayerAvailableForAutoFill(p));
    const pick = bench.find((p: SessionPlayer) => compatibleGroups.includes((p.position || '').toUpperCase()));
    if (!pick) {
      return false;
    }
    const sourcePlayerId = ctx.resolveAutoFillSourcePlayerId(roleLabel);
    if (ctx.hasLocalDebugPartidoEvent() && !sourcePlayerId) {
      return false;
    }
    ctx.slotAssignments.set(slotIdx, pick.sessionPlayerId);
    ctx.autoFilledSlots.set(slotIdx, pick.sessionPlayerId);
    if (sourcePlayerId) {
      ctx.autoFillSourcePlayerBySlot.set(slotIdx, sourcePlayerId);
    }
    return true;
  
}

export function partidoCompatibleGroupForRole(ctx: any, roleLabel: string): string[] {
    const upper = (roleLabel || '').toUpperCase();
    const groups = ctx.constructor.POSITION_GROUPS as Record<string, string[]>;
    for (const group of Object.keys(groups)) {
      if (groups[group].includes(upper)) {
        return groups[group];
      }
    }
    return [
      ...groups['GK'],
      ...groups['DEF'],
      ...groups['MID'],
      ...groups['ATT']
    ];
  
}

export function partidoIsGoalkeeperSlot(ctx: any, slotIdx: number): boolean {
    if (slotIdx < 0) {
      return false;
    }
    const lines = FORMATION_LINES_BY_FORMATION[ctx.selectedFormation()] ?? [];
    let current = 0;
    for (const line of lines) {
      for (const role of line) {
        if (current === slotIdx) {
          return (role || '').toUpperCase() === 'GK';
        }
        current++;
      }
    }
    const player = ctx.playerAtSlot(slotIdx);
    return (player?.position || '').toUpperCase() === 'GK';
  
}

export function partidoRememberCurrentPlayerCoord(ctx: any, slotIdx: number, coords: { x: number; y: number }): void {
    const playerId = ctx.slotAssignments.get(slotIdx);
    if (!playerId) {
      return;
    }
    const remembered = ctx.readRememberedPlayerCoords();
    remembered[playerId] = {
      x: ctx.clampPercent(coords.x),
      y: ctx.clampPercent(coords.y)
    };
    ctx.writeRememberedPlayerCoords(remembered);
  
}

export function partidoRegisterPendingSubstitution(ctx: any, playerOffId: string, playerOnId: string, slotIndex: number): boolean {
    const nextSubstitutions = (ctx.pendingSubstitutions as Array<{ playerOffId: string; playerOnId: string; slotIndex: number }>)
      .filter(sub => sub.playerOffId !== playerOffId && sub.playerOnId !== playerOnId);

    if (nextSubstitutions.length >= ctx.substitutionsRemaining()) {
      ctx.errorMsg = 'No quedan sustituciones disponibles para preparar otro cambio.';
      return false;
    }
    ctx.pendingSubstitutions = [
      ...nextSubstitutions,
      { playerOffId, playerOnId, slotIndex }
    ];
    ctx.pendingSubstitutionRevision.update((value: number) => value + 1);
    return true;
  
}

export function partidoPendingSubstitutionRows(ctx: any): Array<{
    playerOffName: string;
    playerOnName: string;
    slotIndex: number;
  }> {
    ctx.pendingSubstitutionRevision();
    return (ctx.pendingSubstitutions as Array<{ playerOffId: string; playerOnId: string; slotIndex: number }>).map(sub => ({
      playerOffName: ctx.playerNameById(sub.playerOffId),
      playerOnName: ctx.playerNameById(sub.playerOnId),
      slotIndex: sub.slotIndex
    }));
  
}

export function partidoRemovePendingSubstitution(ctx: any, index: number): void {
    const sub = ctx.pendingSubstitutions[index];
    if (!sub) {
      return;
    }
    const currentSlotPlayerId = ctx.slotAssignments.get(sub.slotIndex) ?? null;
    if (!currentSlotPlayerId || currentSlotPlayerId === sub.playerOnId) {
      ctx.slotAssignments.set(sub.slotIndex, sub.playerOffId);
      ctx.freeSlotCoords.delete(sub.slotIndex);
      ctx.clearAutoFillMarker(sub.slotIndex);
      ctx.bumpFreePositionRevision();
    }
    ctx.pendingSubstitutions = ctx.pendingSubstitutions.filter((_item: unknown, idx: number) => idx !== index);
    ctx.pendingSubstitutionRevision.update((value: number) => value + 1);
    ctx.selectedBenchPlayerId = null;
    ctx.errorMsg = '';
    ctx.selectedFormation.set(ctx.selectedFormation());
  
}
