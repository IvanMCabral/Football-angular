import {
  buildPartidoStatsRows,
  displayPartidoEventDescription,
  displayPartidoPosition,
  getPartidoEventIcon,
  recentPartidoEvents
} from './partido-modal-match-view.utils';
import { MatchEvent } from '../../../../core/services/match-engine.model';

function event(eventType: string, teamId = 'home', description = ''): MatchEvent {
  return {
    minute: 1,
    eventType,
    teamId,
    description
  } as MatchEvent;
}

describe('partido-modal-match-view utils', () => {
  it('builds stats rows from home and away events', () => {
    const rows = buildPartidoStatsRows({
      homeTeamId: 'home',
      awayTeamId: 'away',
      score: { home: 2, away: 1 },
      homePossession: 55,
      awayPossession: 45,
      events: [
        event('SHOT', 'home'),
        event('SHOT_ON_TARGET', 'home'),
        event('CORNER', 'away'),
        event('FOUL', 'away'),
        event('YELLOW_CARD', 'home'),
        event('RED_CARD', 'away')
      ]
    });

    expect(rows.find(row => row.label === 'Posesión')?.home).toBe('55%');
    expect(rows.find(row => row.label === 'Goles')?.away).toBe('1');
    expect(rows.find(row => row.label === 'Tiros totales')?.home).toBe('2');
    expect(rows.find(row => row.label === 'Tiros a puerta')?.home).toBe('1');
    expect(rows.find(row => row.label === 'Tarjetas A:R')?.away).toBe('0:1');
  });

  it('returns recent events newest first', () => {
    const events = Array.from({ length: 8 }, (_, index) => event('SHOT', 'home', String(index)));
    expect(recentPartidoEvents(events).map(e => e.description)).toEqual(['7', '6', '5', '4', '3', '2']);
  });

  it('formats icons, positions and common event descriptions', () => {
    expect(getPartidoEventIcon('GOAL')).toBe('GOL');
    expect(getPartidoEventIcon('UNKNOWN')).toBe('EV');
    expect(displayPartidoPosition('WINGER')).toBe('EXT');
    expect(displayPartidoEventDescription(event('INJURY', 'home', '',))).toContain('se lesionó');
    expect(displayPartidoEventDescription(event('TACTICAL_CHANGE', 'home', 'Formation changed from 4-4-2 to 4-3-3'))).toBe('Cambio táctico: 4-4-2 → 4-3-3');
  });
});

