import {
  buildPersistedInjuryAutoModalPayload,
  buildPendingRoundStartMatches,
  buildPendingLiveModalNotice,
  findInjuryAutoModalCandidates,
  findRestorableInjuryAutoModals,
  findRivalRedCardModalCandidate,
  findRoundControlAnchorMatch,
  getLastRoundEvents,
  getRoundEventIcon,
  getRoundStatusText,
  getRoundTeamName,
  hasCompleteTacticalSlotSnapshot,
  isLocalDebugHost,
  isTerminalRoundState,
  mapRoundFixtureStatus,
  normalizeTacticalSlotSnapshotForDebug,
  normalizeTerminalLiveState,
  patchRoundMatchFormation,
  parsePersistedInjuryAutoModalRefs,
  readStorageFlag,
  resolveRoundManagerTeamId,
  ROUND_LIVE_DEBUG_STORAGE_KEYS,
  shouldQueueInjuryAutoModal,
  shouldQueueRivalCardModal,
  wasPlayerSubstitutedOffInState,
  writeStorageFlag
} from './round-live-utils';
import { RoundMatchVM } from '../models/round-live.model';
import { MatchState } from '../../../core/services/match-engine.model';

type LiveStatus = MatchState['status'];

describe('round-live-utils', () => {
  it('returns user-facing labels for known live statuses', () => {
    expect(getRoundStatusText('NOT_STARTED')).toBe('Por Iniciar');
    expect(getRoundStatusText('RUNNING')).toBe('En Juego');
    expect(getRoundStatusText('PAUSED')).toBe('Pausado');
    expect(getRoundStatusText('FINISHED')).toBe('Finalizado');
    expect(getRoundStatusText('CANCELLED')).toBe('Cancelado');
  });

  it('keeps unknown status values readable', () => {
    expect(getRoundStatusText('POSTPONED')).toBe('POSTPONED');
  });

  it('returns icons for known match events', () => {
    expect(getRoundEventIcon('GOAL')).toBe('⚽');
    expect(getRoundEventIcon('CARD')).toBe('🟨');
    expect(getRoundEventIcon('INJURY')).toBe('🚑');
    expect(getRoundEventIcon('SUBSTITUTION')).toBe('🔄');
  });

  it('uses a neutral icon for unknown events', () => {
    expect(getRoundEventIcon('VAR')).toBe('📋');
  });

  it('returns the latest events first without mutating the original list', () => {
    const events = ['1', '2', '3', '4'];

    expect(getLastRoundEvents(events, 2)).toEqual(['4', '3']);
    expect(events).toEqual(['1', '2', '3', '4']);
  });

  it('resolves team names with a readable fallback', () => {
    expect(getRoundTeamName('team-1', { 'team-1': 'Osasuna' })).toBe('Osasuna');
    expect(getRoundTeamName('1234567890abcdef', null)).toBe('12345678');
  });

  it('maps backend fixture and live statuses to card statuses', () => {
    expect(mapRoundFixtureStatus('PENDING')).toBe('SCHEDULED');
    expect(mapRoundFixtureStatus('SIMULATING')).toBe('SCHEDULED');
    expect(mapRoundFixtureStatus('NOT_STARTED')).toBe('SCHEDULED');
    expect(mapRoundFixtureStatus('RUNNING')).toBe('SCHEDULED');
    expect(mapRoundFixtureStatus('PAUSED')).toBe('SCHEDULED');
    expect(mapRoundFixtureStatus('COMPLETED')).toBe('SIMULATED');
    expect(mapRoundFixtureStatus('FINISHED')).toBe('SIMULATED');
    expect(mapRoundFixtureStatus('CANCELLED')).toBe('CANCELLED');
    expect(mapRoundFixtureStatus('UNKNOWN')).toBe('SCHEDULED');
  });

  it('identifies terminal live states', () => {
    expect(isTerminalRoundState('FINISHED')).toBeTrue();
    expect(isTerminalRoundState('CANCELLED')).toBeTrue();
    expect(isTerminalRoundState('RUNNING')).toBeFalse();
    expect(isTerminalRoundState(undefined)).toBeFalse();
  });

  it('prefers the manager match as round-control anchor when available', () => {
    const matches = [
      roundMatch('other', false, 'RUNNING'),
      roundMatch('user', true, 'RUNNING')
    ];

    expect(findRoundControlAnchorMatch({ matches })?.match.id).toBe('user');
  });

  it('builds start payloads only for matches that have not started', () => {
    const matches = [
      roundMatch('no-state', false, 'RUNNING'),
      roundMatch('pending', false, 'NOT_STARTED'),
      roundMatch('running', false, 'RUNNING'),
      roundMatch('finished', false, 'FINISHED')
    ];
    matches[0].state = undefined;

    expect(buildPendingRoundStartMatches(matches)).toEqual([
      {
        matchId: 'no-state',
        homeTeamId: 'no-state-home',
        awayTeamId: 'no-state-away'
      },
      {
        matchId: 'pending',
        homeTeamId: 'pending-home',
        awayTeamId: 'pending-away'
      }
    ]);
  });

  it('resolves the manager team id from explicit match or session data', () => {
    const state = matchState({
      homeTeamId: 'home',
      awayTeamId: 'away'
    });

    expect(resolveRoundManagerTeamId({
      userMatch: roundMatchWithState('m1', true, state, 'away'),
      state,
      currentUserSessionTeamId: null
    })).toBe('away');

    expect(resolveRoundManagerTeamId({
      userMatch: roundMatchWithState('m1', true, state),
      state,
      currentUserSessionTeamId: 'home'
    })).toBe('home');
  });

  it('falls back to the fixture home team when manager team data is stale', () => {
    const state = matchState({
      homeTeamId: 'home',
      awayTeamId: 'away'
    });

    expect(resolveRoundManagerTeamId({
      userMatch: roundMatchWithState('m1', true, state, 'other-team'),
      state,
      currentUserSessionTeamId: 'also-other'
    })).toBe('m1-home');
  });

  it('queues rival red-card notices while the round is running or another live modal is open', () => {
    expect(shouldQueueRivalCardModal({
      status: 'RUNNING',
      isRivalCardModalOpen: false,
      isCriticalLiveModalOpen: false
    })).toBeTrue();
    expect(shouldQueueRivalCardModal({
      status: 'PAUSED',
      isRivalCardModalOpen: true,
      isCriticalLiveModalOpen: false
    })).toBeTrue();
    expect(shouldQueueRivalCardModal({
      status: 'PAUSED',
      isRivalCardModalOpen: false,
      isCriticalLiveModalOpen: true
    })).toBeTrue();
    expect(shouldQueueRivalCardModal({
      status: 'PAUSED',
      isRivalCardModalOpen: false,
      isCriticalLiveModalOpen: false
    })).toBeFalse();
  });

  it('queues injury auto-modals while another critical live modal is open', () => {
    expect(shouldQueueInjuryAutoModal({
      isAutoModalOpen: true,
      isCriticalLiveModalOpen: false
    })).toBeTrue();
    expect(shouldQueueInjuryAutoModal({
      isAutoModalOpen: false,
      isCriticalLiveModalOpen: true
    })).toBeTrue();
    expect(shouldQueueInjuryAutoModal({
      isAutoModalOpen: false,
      isCriticalLiveModalOpen: false
    })).toBeFalse();
  });

  it('builds persisted injury modal payloads only when there is something to restore', () => {
    expect(buildPersistedInjuryAutoModalPayload({
      active: null,
      queued: []
    })).toBeNull();

    expect(buildPersistedInjuryAutoModalPayload({
      active: { matchId: 'm1', preSelectedPlayerId: 'p1' },
      queued: [{ matchId: 'm2', preSelectedPlayerId: 'p2' }]
    })).toEqual({
      active: [{ matchId: 'm1', preSelectedPlayerId: 'p1' }],
      queued: [{ matchId: 'm2', preSelectedPlayerId: 'p2' }]
    });
  });

  it('parses persisted injury modal refs and drops incomplete entries', () => {
    expect(parsePersistedInjuryAutoModalRefs('{bad json')).toBeNull();
    expect(parsePersistedInjuryAutoModalRefs(JSON.stringify({
      active: [{ matchId: 'm1', preSelectedPlayerId: 'p1' }],
      queued: [
        { matchId: 'm2', preSelectedPlayerId: 'p2' },
        { matchId: '', preSelectedPlayerId: 'p3' },
        { matchId: 'm4', preSelectedPlayerId: '' }
      ]
    }))).toEqual([
      { matchId: 'm1', preSelectedPlayerId: 'p1' },
      { matchId: 'm2', preSelectedPlayerId: 'p2' }
    ]);
  });

  it('restores only actionable persisted injury modal refs', () => {
    const running = roundMatchWithState('running', true, matchState({
      matchId: 'running',
      status: 'RUNNING'
    }));
    const finished = roundMatchWithState('finished', true, matchState({
      matchId: 'finished',
      status: 'FINISHED'
    }));
    const alreadySubbed = roundMatchWithState('already-subbed', true, matchState({
      matchId: 'already-subbed',
      status: 'PAUSED',
      events: [{ eventType: 'SUBSTITUTION', playerId: 'p3' } as any]
    }));

    expect(findRestorableInjuryAutoModals({
      refs: [
        { matchId: 'running', preSelectedPlayerId: 'p1' },
        { matchId: 'finished', preSelectedPlayerId: 'p2' },
        { matchId: 'already-subbed', preSelectedPlayerId: 'p3' },
        { matchId: 'missing', preSelectedPlayerId: 'p4' }
      ],
      matches: [running, finished, alreadySubbed]
    }).map(item => ({
      matchId: item.matchId,
      preSelectedPlayerId: item.preSelectedPlayerId,
      status: item.state.status
    }))).toEqual([
      { matchId: 'running', preSelectedPlayerId: 'p1', status: 'RUNNING' }
    ]);
  });

  it('patches the visible formation for the manager side only', () => {
    const userHome = roundMatchWithState('home-match', true, matchState({
      matchId: 'home-match',
      homeTeamId: 'home',
      awayTeamId: 'away',
      homeFormation: '4-4-2',
      awayFormation: '4-3-3'
    }), 'home');
    const userAway = roundMatchWithState('away-match', true, matchState({
      matchId: 'away-match',
      homeTeamId: 'home',
      awayTeamId: 'away',
      homeFormation: '4-4-2',
      awayFormation: '4-3-3'
    }), 'away');

    const patchedHome = patchRoundMatchFormation({
      matches: [userHome, userAway],
      matchId: 'home-match',
      state: userHome.state!,
      formation: '3-5-2'
    });
    const patchedAway = patchRoundMatchFormation({
      matches: patchedHome,
      matchId: 'away-match',
      state: userAway.state!,
      formation: '4-2-3-1'
    });

    expect(patchedAway[0].state?.homeFormation).toBe('3-5-2');
    expect(patchedAway[0].state?.awayFormation).toBe('4-3-3');
    expect(patchedAway[1].state?.homeFormation).toBe('4-4-2');
    expect(patchedAway[1].state?.awayFormation).toBe('4-2-3-1');
  });

  it('falls back to any active match as round-control anchor', () => {
    const matches = [
      roundMatch('user', true, 'FINISHED'),
      roundMatch('other', false, 'RUNNING')
    ];

    expect(findRoundControlAnchorMatch({ matches })?.match.id).toBe('other');
  });

  it('returns no round-control anchor when every match is terminal', () => {
    const matches = [
      roundMatch('user', true, 'FINISHED'),
      roundMatch('other', false, 'CANCELLED')
    ];

    expect(findRoundControlAnchorMatch({ matches })).toBeNull();
  });

  it('normalizes live states stuck past full time', () => {
    const state = matchState({ currentMinute: 90, status: 'RUNNING' });

    expect(normalizeTerminalLiveState(state).status).toBe('FINISHED');
  });

  it('does not normalize paused or already terminal live states', () => {
    const paused = matchState({ currentMinute: 92, status: 'PAUSED' });
    const finished = matchState({ currentMinute: 92, status: 'FINISHED' });

    expect(normalizeTerminalLiveState(paused)).toBe(paused);
    expect(normalizeTerminalLiveState(finished)).toBe(finished);
  });

  it('detects whether a player was substituted off', () => {
    const state = matchState({
      events: [
        { eventType: 'GOAL', playerId: 'p1' },
        { eventType: 'SUBSTITUTION', playerId: 'p2' }
      ] as any[]
    });

    expect(wasPlayerSubstitutedOffInState(state, 'p2')).toBeTrue();
    expect(wasPlayerSubstitutedOffInState(state, 'p1')).toBeFalse();
  });

  it('builds pending injury modal notices with queue count', () => {
    expect(buildPendingLiveModalNotice({
      queuedInjuryCount: 1,
      hasQueuedRivalCard: false,
      isCriticalLiveModalOpen: false
    })).toBe('Evento pendiente: lesión propia. Al cerrar el modal actual se abrirá Sustitución.');

    expect(buildPendingLiveModalNotice({
      queuedInjuryCount: 2,
      hasQueuedRivalCard: true,
      isCriticalLiveModalOpen: true
    })).toBe('Evento pendiente: lesión propia (2). Al cerrar el modal actual se abrirá Sustitución.');
  });

  it('builds pending rival red-card notices based on the current modal state', () => {
    expect(buildPendingLiveModalNotice({
      queuedInjuryCount: 0,
      hasQueuedRivalCard: true,
      isCriticalLiveModalOpen: true
    })).toBe('Evento pendiente: roja rival. Al cerrar el modal actual verás el aviso táctico.');

    expect(buildPendingLiveModalNotice({
      queuedInjuryCount: 0,
      hasQueuedRivalCard: true,
      isCriticalLiveModalOpen: false
    })).toBe('Evento pendiente: roja rival. Pausá el partido o abrí Partido para revisarlo sin cortar el juego.');
  });

  it('returns no pending modal notice when there are no queued events', () => {
    expect(buildPendingLiveModalNotice({
      queuedInjuryCount: 0,
      hasQueuedRivalCard: false,
      isCriticalLiveModalOpen: false
    })).toBeNull();
  });

  it('finds actionable manager injury modal candidates', () => {
    const state = matchState({
      matchId: 'match-injury',
      homeTeamId: 'manager',
      awayTeamId: 'rival',
      events: [
        { eventType: 'INJURY', playerId: 'p9', teamId: 'manager', minute: 22 }
      ] as any[]
    });
    const matches = [roundMatchWithState('match-injury', true, state, 'manager')];

    const candidates = findInjuryAutoModalCandidates({
      matches,
      userTeamId: 'manager',
      shownEventIds: new Set()
    });

    expect(candidates.length).toBe(1);
    expect(candidates[0].eventId).toBe('match-injury|22|p9');
    expect(candidates[0].preSelectedPlayerId).toBe('p9');
    expect(candidates[0].alreadyResolved).toBeFalse();
  });

  it('skips injury candidates from the rival team or already shown events', () => {
    const state = matchState({
      matchId: 'match-injury',
      homeTeamId: 'manager',
      awayTeamId: 'rival',
      events: [
        { eventType: 'INJURY', playerId: 'r7', teamId: 'rival', minute: 11 },
        { eventType: 'INJURY', playerId: 'p9', teamId: 'manager', minute: 22 }
      ] as any[]
    });
    const matches = [roundMatchWithState('match-injury', true, state, 'manager')];

    const candidates = findInjuryAutoModalCandidates({
      matches,
      userTeamId: 'manager',
      shownEventIds: new Set(['match-injury|22|p9'])
    });

    expect(candidates).toEqual([]);
  });

  it('marks injury candidates as already resolved when the player left the pitch', () => {
    const state = matchState({
      matchId: 'match-injury',
      homeTeamId: 'manager',
      awayTeamId: 'rival',
      events: [
        { eventType: 'INJURY', playerId: 'p9', teamId: 'manager', minute: 22 },
        { eventType: 'SUBSTITUTION', playerId: 'p9', minute: 24 }
      ] as any[]
    });
    const matches = [roundMatchWithState('match-injury', true, state, 'manager')];

    const candidates = findInjuryAutoModalCandidates({
      matches,
      userTeamId: 'manager',
      shownEventIds: new Set()
    });

    expect(candidates.length).toBe(1);
    expect(candidates[0].alreadyResolved).toBeTrue();
  });

  it('finds the first actionable rival red-card candidate for the user match', () => {
    const state = matchState({
      matchId: 'match-card',
      homeTeamId: 'manager',
      awayTeamId: 'rival',
      events: [
        { eventType: 'RED_CARD', playerId: 'r4', playerName: 'Rival CB', teamId: 'rival', minute: 55 }
      ] as any[]
    });
    const matches = [roundMatchWithState('match-card', true, state, 'manager')];

    const candidate = findRivalRedCardModalCandidate({
      matches,
      shownEventIds: new Set()
    });

    expect(candidate?.dedupKey).toBe('match-card|55|r4');
    expect(candidate?.playerName).toBe('Rival CB');
    expect(candidate?.minute).toBe(55);
  });

  it('skips manager red cards and already shown rival red cards', () => {
    const state = matchState({
      matchId: 'match-card',
      homeTeamId: 'manager',
      awayTeamId: 'rival',
      events: [
        { eventType: 'RED_CARD', playerId: 'm2', teamId: 'manager', minute: 40 },
        { eventType: 'RED_CARD', playerId: 'r4', teamId: 'rival', minute: 55 }
      ] as any[]
    });
    const matches = [roundMatchWithState('match-card', true, state, 'manager')];

    const candidate = findRivalRedCardModalCandidate({
      matches,
      shownEventIds: new Set(['match-card|55|r4'])
    });

    expect(candidate).toBeNull();
  });

  it('identifies local debug hosts', () => {
    expect(isLocalDebugHost('localhost')).toBeTrue();
    expect(isLocalDebugHost('127.0.0.1')).toBeTrue();
    expect(isLocalDebugHost('example.com')).toBeFalse();
    expect(ROUND_LIVE_DEBUG_STORAGE_KEYS.freeze).toBe('manager.deFreezeLiveRound');
    expect(readStorageFlag(memoryStorage({ test: '1' }), 'test')).toBeTrue();
    expect(readStorageFlag(memoryStorage({ test: '0' }), 'test')).toBeFalse();
    expect(readStorageFlag(undefined, 'test')).toBeFalse();
  });

  it('writes local storage flags without leaking storage exceptions', () => {
    const storage = memoryStorage({});

    writeStorageFlag(storage, 'feature', true);
    expect(storage.getItem('feature')).toBe('1');

    writeStorageFlag(storage, 'feature', false);
    expect(storage.getItem('feature')).toBe('0');

    expect(() => writeStorageFlag(throwingStorage(), 'feature', true)).not.toThrow();
    expect(readStorageFlag(throwingStorage(), 'feature')).toBeFalse();
  });

  it('normalizes complete tactical slot snapshots by slot index', () => {
    const slots = Array.from({ length: 11 }, (_, index) => ({
      playerId: `p${index}`,
      slotIndex: 10 - index
    }));

    const normalized = normalizeTacticalSlotSnapshotForDebug(slots);

    expect(normalized?.map(slot => slot.slotIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(hasCompleteTacticalSlotSnapshot(slots)).toBeTrue();
  });

  it('uses fallback order when tactical slot indexes are missing', () => {
    const slots = Array.from({ length: 11 }, (_, index) => ({
      playerId: `p${index}`,
      slotIndex: index < 9 ? index : null
    }));

    const normalized = normalizeTacticalSlotSnapshotForDebug(slots);

    expect(normalized?.map(slot => slot.playerId)).toEqual([
      'p0', 'p9', 'p10', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'
    ]);
  });

  it('rejects incomplete or duplicated tactical slot snapshots', () => {
    const complete = Array.from({ length: 11 }, (_, index) => ({
      playerId: `p${index}`,
      slotIndex: index
    }));

    expect(normalizeTacticalSlotSnapshotForDebug(complete.slice(0, 10))).toBeNull();
    expect(normalizeTacticalSlotSnapshotForDebug([
      ...complete.slice(0, 10),
      { playerId: 'p0', slotIndex: 10 }
    ])).toBeNull();
  });

  it('can repair invalid tactical indexes when the XI still has eleven unique players', () => {
    const complete = Array.from({ length: 11 }, (_, index) => ({
      playerId: `p${index}`,
      slotIndex: index
    }));

    const normalized = normalizeTacticalSlotSnapshotForDebug([
      ...complete.slice(0, 10),
      { playerId: 'p10', slotIndex: 99 }
    ]);

    expect(normalized?.map(slot => slot.slotIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('repairs multiple invalid tactical indexes when the XI still has eleven unique players', () => {
    const complete = Array.from({ length: 11 }, (_, index) => ({
      playerId: `p${index}`,
      slotIndex: index
    }));

    const normalized = normalizeTacticalSlotSnapshotForDebug([
      ...complete.slice(0, 9),
      { playerId: 'p9', slotIndex: 99 },
      { playerId: 'p10', slotIndex: 100 }
    ]);

    expect(normalized?.map(slot => slot.slotIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('rejects tactical snapshots with players that cannot be identified', () => {
    const complete = Array.from({ length: 11 }, (_, index) => ({
      playerId: `p${index}`,
      slotIndex: index
    }));

    expect(normalizeTacticalSlotSnapshotForDebug([
      ...complete.slice(0, 10),
      { playerId: '', slotIndex: 10 }
    ])).toBeNull();
  });
});

function roundMatch(id: string, isUserMatch: boolean, status: LiveStatus): RoundMatchVM {
  return roundMatchWithState(id, isUserMatch, matchState({ status }), isUserMatch ? `${id}-home` : undefined);
}

function roundMatchWithState(
  id: string,
  isUserMatch: boolean,
  state: MatchState,
  userTeamId?: string
): RoundMatchVM {
  return {
    match: {
      id,
      homeTeamId: `${id}-home`,
      awayTeamId: `${id}-away`,
      round: 1,
      scheduledAt: '',
      status: 'SCHEDULED',
      result: null,
      createdAt: '',
      simulatedAt: null
    },
    isUserMatch,
    userTeamId,
    state
  };
}

function matchState(overrides: Partial<MatchState>): MatchState {
  return {
    matchId: 'match-1',
    roundId: 'round-1',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeScore: 0,
    awayScore: 0,
    currentMinute: 1,
    status: 'RUNNING',
    homePossession: 50,
    awayPossession: 50,
    events: [],
    ...overrides
  } as MatchState;
}

function memoryStorage(initial: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  } as Storage;
}

function throwingStorage(): Storage {
  return {
    get length() {
      throw new Error('blocked');
    },
    clear: () => { throw new Error('blocked'); },
    getItem: () => { throw new Error('blocked'); },
    key: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); }
  } as unknown as Storage;
}
