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
