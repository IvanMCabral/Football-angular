import {
  getLastRoundEvents,
  getRoundEventIcon,
  getRoundStatusText,
  mapRoundFixtureStatus
} from './round-live-utils';

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
});
