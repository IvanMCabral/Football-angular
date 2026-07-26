import {
  buildPendingLiveModalNotice,
  findRoundControlAnchorMatch,
  getLastRoundEvents,
  getRoundEventIcon,
  getRoundStatusText,
  isTerminalRoundState,
  mapRoundFixtureStatus,
  normalizeTerminalLiveState,
  wasPlayerSubstitutedOffInState
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
});

function roundMatch(id: string, isUserMatch: boolean, status: LiveStatus): RoundMatchVM {
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
    userTeamId: isUserMatch ? `${id}-home` : undefined,
    state: matchState({ status })
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
