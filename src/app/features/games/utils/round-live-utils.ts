import { MatchState } from '../../../core/services/match-engine.model';
import { RoundMatchVM } from '../models/round-live.model';

export type FixtureStatus = 'SCHEDULED' | 'SIMULATED' | 'CANCELLED';

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Por Iniciar',
  RUNNING: 'En Juego',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado'
};

const EVENT_ICONS: Record<string, string> = {
  GOAL: '⚽',
  CARD: '🟨',
  INJURY: '🚑',
  SUBSTITUTION: '🔄'
};

export function getRoundStatusText(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getRoundEventIcon(eventType: string): string {
  return EVENT_ICONS[eventType] || '📋';
}

export function getLastRoundEvents<T>(events: T[], count: number): T[] {
  return events.slice(-count).reverse();
}

export function mapRoundFixtureStatus(fixtureStatus: string): FixtureStatus {
  switch (fixtureStatus) {
    case 'PENDING':
    case 'SIMULATING':
    case 'NOT_STARTED':
    case 'RUNNING':
    case 'PAUSED':
      return 'SCHEDULED';
    case 'COMPLETED':
    case 'FINISHED':
      return 'SIMULATED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'SCHEDULED';
  }
}

export function isTerminalRoundState(status: string | undefined): boolean {
  return status === 'FINISHED' || status === 'CANCELLED';
}

export function findRoundControlAnchorMatch(vm: { matches: RoundMatchVM[] }): RoundMatchVM | null {
  return vm.matches.find(match => match.isUserMatch && !isTerminalRoundState(match.state?.status))
    ?? vm.matches.find(match => !isTerminalRoundState(match.state?.status))
    ?? null;
}

export function normalizeTerminalLiveState(state: MatchState): MatchState {
  if (
    state.currentMinute >= 90 &&
    state.status !== 'FINISHED' &&
    state.status !== 'CANCELLED' &&
    state.status !== 'PAUSED'
  ) {
    return { ...state, status: 'FINISHED' };
  }

  return state;
}

export function wasPlayerSubstitutedOffInState(state: MatchState, playerId: string): boolean {
  return (state.events ?? []).some(event =>
    event.eventType === 'SUBSTITUTION' &&
    String(event.playerId ?? '') === playerId
  );
}
