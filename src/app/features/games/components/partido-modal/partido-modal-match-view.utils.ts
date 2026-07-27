import { MatchEvent } from '../../../../core/services/match-engine.model';

export interface PartidoStatRow {
  label: string;
  home: string;
  away: string;
}

export interface BuildPartidoStatsInput {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  score?: { home: number; away: number };
  homePossession?: number;
  awayPossession?: number;
}

export function buildPartidoStatsRows(input: BuildPartidoStatsInput): PartidoStatRow[] {
  const homeId = String(input.homeTeamId ?? '');
  const awayId = String(input.awayTeamId ?? '');

  let homeShots = 0, awayShots = 0;
  let homeShotsOnTarget = 0, awayShotsOnTarget = 0;
  let homeCorners = 0, awayCorners = 0;
  let homeFouls = 0, awayFouls = 0;
  let homeOffsides = 0, awayOffsides = 0;
  let homeYellow = 0, awayYellow = 0;
  let homeRed = 0, awayRed = 0;

  for (const event of input.events) {
    if (!event) { continue; }
    const teamId = String(event.teamId ?? '');
    const isHome = teamId === homeId;
    const isAway = teamId === awayId;
    if (!isHome && !isAway) { continue; }
    const bucket = isHome
      ? {
          shots: () => homeShots++,
          sot: () => homeShotsOnTarget++,
          corner: () => homeCorners++,
          foul: () => homeFouls++,
          offside: () => homeOffsides++,
          yellow: () => homeYellow++,
          red: () => homeRed++
        }
      : {
          shots: () => awayShots++,
          sot: () => awayShotsOnTarget++,
          corner: () => awayCorners++,
          foul: () => awayFouls++,
          offside: () => awayOffsides++,
          yellow: () => awayYellow++,
          red: () => awayRed++
        };

    switch (event.eventType) {
      case 'SHOT':
      case 'SHOT_ON_TARGET':
        bucket.shots();
        if (event.eventType === 'SHOT_ON_TARGET') { bucket.sot(); }
        break;
      case 'CORNER':
        bucket.corner();
        break;
      case 'FOUL':
        bucket.foul();
        break;
      case 'OFFSIDE':
        bucket.offside();
        break;
      case 'YELLOW_CARD':
        bucket.yellow();
        break;
      case 'RED_CARD':
        bucket.red();
        break;
    }
  }

  const score = input.score ?? { home: 0, away: 0 };
  const homePossession = input.homePossession ?? 50;
  const awayPossession = input.awayPossession ?? 50;

  return [
    { label: 'Posesión', home: `${homePossession}%`, away: `${awayPossession}%` },
    { label: 'Goles', home: String(score.home), away: String(score.away) },
    { label: 'Tiros totales', home: String(homeShots), away: String(awayShots) },
    { label: 'Tiros a puerta', home: String(homeShotsOnTarget), away: String(awayShotsOnTarget) },
    { label: 'Corners', home: String(homeCorners), away: String(awayCorners) },
    { label: 'Faltas', home: String(homeFouls), away: String(awayFouls) },
    { label: 'Offsides', home: String(homeOffsides), away: String(awayOffsides) },
    { label: 'Tarjetas A:R', home: `${homeYellow}:${homeRed}`, away: `${awayYellow}:${awayRed}` }
  ];
}

export function recentPartidoEvents(events: MatchEvent[], limit = 6): MatchEvent[] {
  return events.slice(-limit).reverse();
}

export function getPartidoEventIcon(eventType: string): string {
  const iconMap: Record<string, string> = {
    GOAL: 'GOL',
    SHOT: 'TIR',
    SHOT_ON_TARGET: 'TIR',
    MISS: 'ERR',
    BLOCK: 'BLO',
    SAVE: 'ATA',
    CHANCE_CREATED: 'OC',
    FOUL: 'FAL',
    YELLOW_CARD: 'TA',
    RED_CARD: 'TR',
    INJURY: 'LES',
    CORNER: 'COR',
    OFFSIDE: 'OFF',
    SUBSTITUTION: 'SUB',
    CARD: 'TA',
    TACTICAL_CHANGE: 'TAC'
  };
  return iconMap[eventType] || 'EV';
}

export function displayPartidoPosition(position: string | null | undefined): string {
  const map: Record<string, string> = {
    GK: 'ARQ',
    DEF: 'DEF',
    MID: 'MED',
    WINGER: 'EXT',
    ATT: 'DEL'
  };
  return map[(position || '').toUpperCase()] || position || '';
}

export function displayPartidoEventDescription(event: MatchEvent | null | undefined): string {
  if (!event) { return ''; }
  const description = event.description || '';
  const playerName = event.playerName || 'Jugador';
  const relatedName = event.relatedPlayerName || '';

  if (event.eventType === 'SUBSTITUTION') {
    const match = description.match(/^Substitution:\s+(.+?)\s+on for\s+(.+)$/i);
    if (match) {
      return `Cambio: entra ${match[1]}, sale ${match[2]}`;
    }
    if (relatedName) {
      return `Cambio: entra ${playerName}, sale ${relatedName}`;
    }
    return description || 'Cambio realizado';
  }

  if (event.eventType === 'INJURY') {
    return `${playerName} se lesionó`;
  }
  if (description === 'Shot saved') {
    return 'Remate atajado';
  }
  if (description === 'Shot missed') {
    return 'Remate desviado';
  }
  if (description === 'Goal') {
    return 'Gol';
  }
  if (description === 'Shot blocked') {
    return 'Remate bloqueado';
  }

  const yellowCardMatch = description.match(/^(.+?) received a yellow card$/i);
  if (yellowCardMatch) {
    return `${yellowCardMatch[1]} recibió amarilla`;
  }
  const redCardMatch = description.match(/^(.+?) received a red card$/i);
  if (redCardMatch) {
    return `${redCardMatch[1]} recibió roja`;
  }
  const foulMatch = description.match(/^(.+?) committed a foul$/i);
  if (foulMatch) {
    return `${foulMatch[1]} cometió una falta`;
  }
  const chanceMatch = description.match(/^Chance created for (.+)$/i);
  if (chanceMatch) {
    return `Chance creada para ${chanceMatch[1]}`;
  }
  const formationMatch = description.match(/^Formation changed from (.+?) to (.+?)(?: \| pixels: (.*))?$/i);
  if (formationMatch) {
    return `Cambio táctico: ${formationMatch[1]} → ${formationMatch[2]}`;
  }

  return description;
}

