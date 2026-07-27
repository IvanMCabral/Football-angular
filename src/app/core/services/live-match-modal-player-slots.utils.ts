import { PartidoDialogData } from '../../features/games/components/partido-modal/partido-modal.component';
import { LiveFormationSlot, SubModalPlayer } from './match-engine.model';
import { PlayerLineupDTO } from '../../shared/models/lineup/lineup.dto';
import { SessionPlayer } from '../../shared/models/player.model';
import { MatchState } from './match-engine.model';

export function normalizeLivePlayerName(name: string | null | undefined): string {
  return (name ?? '').trim().toLocaleLowerCase();
}

export function isPlaceholderLivePlayerName(name: string | null | undefined, position: string | null | undefined): boolean {
  const value = (name ?? '').trim();
  if (!value) { return true; }

  const pos = (position ?? '').trim();
  if (pos && value.toLocaleLowerCase() === pos.toLocaleLowerCase()) { return true; }

  return /^(GK|DEF|MID|ATT|WINGER|CB|LB|RB|LWB|RWB|CM|CDM|CAM|LM|RM|ST|CF|LW|RW)$/i.test(value);
}

export function buildPartidoCurrentSlots(
  livePlayers: PlayerLineupDTO[],
  liveSlots: LiveFormationSlot[] | null | undefined,
  substitutions: Array<{ playerOffId: string; playerOnId: string }> = [],
  preservePartialLiveSlots = false
): PartidoDialogData['currentSlots'] {
  const playersById = new Map((livePlayers ?? []).map(player => [player.playerId, player]));
  const substitutionByOffId = new Map(
    substitutions
      .filter(s => !!s.playerOffId && !!s.playerOnId)
      .map(s => [s.playerOffId, s.playerOnId])
  );
  const validLiveSlots = (liveSlots ?? [])
    .map((slot, index) => {
      const rawSessionPlayerId = slot.sessionPlayerId || slot.playerId || '';
      if (!rawSessionPlayerId) return null;

      const substitutedSessionPlayerId = substitutionByOffId.get(rawSessionPlayerId) ?? rawSessionPlayerId;
      const slotStillInLiveXi = playersById.has(substitutedSessionPlayerId);
      const sessionPlayerId = slotStillInLiveXi
        ? substitutedSessionPlayerId
        : (livePlayers[index]?.playerId ?? substitutedSessionPlayerId);
      const fallback = playersById.get(sessionPlayerId);

      return {
        sessionPlayerId,
        position: slot.position || fallback?.position || 'MID',
        slotIndex: typeof slot.slotIndex === 'number' ? slot.slotIndex : index,
        customXPercent: finitePercentOrNull(slot.customXPercent),
        customYPercent: finitePercentOrNull(slot.customYPercent)
      };
    })
    .filter((slot): slot is NonNullable<typeof slot> => !!slot);

  if (validLiveSlots.length >= 11 || (preservePartialLiveSlots && validLiveSlots.length > 0)) {
    return validLiveSlots.sort((a, b) => a.slotIndex - b.slotIndex);
  }

  return (livePlayers ?? []).map((p, i) => ({
    sessionPlayerId: p.playerId,
    position: p.position,
    slotIndex: i
  }));
}

export function isLocalDebugPartidoState(state: MatchState | null | undefined): boolean {
  return (state?.events ?? []).some(event =>
    event.eventType === 'INJURY'
    && typeof event.description === 'string'
    && event.description.includes('Debug Partido:')
  );
}

export function ensureUniqueCurrentSlots(
  currentSlots: PartidoDialogData['currentSlots'],
  squad: SessionPlayer[]
): PartidoDialogData['currentSlots'] {
  const used = new Set<string>();
  const squadByRole = new Map<string, SessionPlayer[]>();
  const squadFallback: SessionPlayer[] = [];

  for (const player of squad ?? []) {
    if (!player.sessionPlayerId) continue;

    const role = zoneRole(player.position);
    const list = squadByRole.get(role) ?? [];
    list.push(player);
    squadByRole.set(role, list);
    squadFallback.push(player);
  }

  return (currentSlots ?? []).map(slot => {
    const id = slot.sessionPlayerId;
    if (id && !used.has(id)) {
      used.add(id);
      return slot;
    }

    const wantedRole = zoneRole(slot.position);
    const replacement = [
      ...(squadByRole.get(wantedRole) ?? []),
      ...squadFallback
    ].find(player => !!player.sessionPlayerId && !used.has(player.sessionPlayerId));

    if (!replacement?.sessionPlayerId) return slot;

    used.add(replacement.sessionPlayerId);
    return {
      ...slot,
      sessionPlayerId: replacement.sessionPlayerId,
      position: slot.position || replacement.position || 'MID'
    };
  });
}

export function mergeSquadWithLivePlayers(squad: SessionPlayer[], livePlayers: PlayerLineupDTO[]): SessionPlayer[] {
  const merged = [...(squad ?? [])];
  const existing = new Set(merged.map(player => player.sessionPlayerId).filter(Boolean));

  for (const player of livePlayers ?? []) {
    if (!player.playerId || existing.has(player.playerId)) continue;

    merged.push({
      sessionPlayerId: player.playerId,
      basePlayerId: null,
      name: player.name,
      age: player.age ?? 0,
      position: player.position,
      attack: player.overall ?? 0,
      defense: player.overall ?? 0,
      technique: player.overall ?? 0,
      speed: player.overall ?? 0,
      stamina: player.energy ?? 100,
      mentality: player.overall ?? 0,
      marketValue: 0,
      energy: player.energy ?? 100,
      form: 100,
      injured: player.injured ?? false,
      injuryType: null,
      injuryRemainingMatches: 0,
      origin: 'CUSTOM'
    });
    existing.add(player.playerId);
  }

  return merged;
}

export function sessionPlayerOverall(sp: SessionPlayer): number | undefined {
  const values = [sp.attack, sp.defense, sp.technique, sp.speed, sp.stamina, sp.mentality]
    .filter((value): value is number => typeof value === 'number');
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : undefined;
}

export function toSubModalPlayer(p: PlayerLineupDTO, isStarter: boolean): SubModalPlayer {
  return {
    sessionPlayerId: p.playerId,
    displayName: p.name,
    position: p.position,
    rating: p.overall,
    isStarter
  };
}

export function toSubModalPlayerFromSession(sp: SessionPlayer, isStarter: boolean): SubModalPlayer {
  return {
    sessionPlayerId: sp.sessionPlayerId,
    displayName: sp.name || 'Unknown',
    position: sp.position || 'MID',
    rating: Math.round(
      ((sp.attack ?? 50) +
        (sp.defense ?? 50) +
        (sp.technique ?? 50) +
        (sp.speed ?? 50) +
        (sp.stamina ?? 50) +
        (sp.mentality ?? 50)) / 6
    ),
    isStarter
  };
}

export function zoneRole(position: string | null | undefined): string {
  const pos = (position ?? '').toUpperCase();
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(pos)) return 'DEF';
  if (['ST', 'CF', 'LW', 'RW', 'ATT', 'WINGER'].includes(pos)) return 'ATT';
  return 'MID';
}

function finitePercentOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
