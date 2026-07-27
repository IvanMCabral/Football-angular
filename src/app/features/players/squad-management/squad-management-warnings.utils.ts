import { PlayerLineupDTO } from 'app/shared/models/lineup/lineup.dto';
import { LineupWarningDTO } from 'app/shared/models/lineup/lineup-warning.dto';

export function isSuspendedLineupPlayer(player: { suspended?: boolean; suspensionRemainingMatches?: number }): boolean {
  return player.suspended === true || (player.suspensionRemainingMatches ?? 0) > 0;
}

export function buildRiskyLineupMessage(players: PlayerLineupDTO[]): string | null {
  if (!players || players.length === 0) {
    return null;
  }
  const suspended = players.filter(player => isSuspendedLineupPlayer(player));
  const injured = players.filter(player => !isSuspendedLineupPlayer(player) && player.injured === true);
  const exhausted = players.filter(player => !isSuspendedLineupPlayer(player) && (player.energy ?? 100) <= 19);
  const veryTired = players.filter(player => {
    const energy = player.energy ?? 100;
    return !isSuspendedLineupPlayer(player) && player.injured !== true && energy >= 20 && energy <= 39;
  });
  if (suspended.length === 0 && injured.length === 0 && exhausted.length === 0 && veryTired.length === 0) {
    return null;
  }
  const parts = [
    riskPart(suspended.length, 'jugador suspendido', 'jugadores suspendidos'),
    riskPart(injured.length, 'jugador lesionado', 'jugadores lesionados'),
    riskPart(exhausted.length, 'jugador agotado', 'jugadores agotados'),
    riskPart(veryTired.length, 'jugador muy cansado', 'jugadores muy cansados')
  ].filter(Boolean);
  return `Atención: ${parts.join(', ')} en el once. Esto puede afectar el rendimiento. Tocá "Confirmar y jugar" otra vez para continuar.`;
}

export function pickLineupWarning(warnings?: LineupWarningDTO[]): LineupWarningDTO | null {
  if (!warnings || warnings.length === 0) {
    return null;
  }
  return warnings.find(warning => warning.severity === 'ERROR') ?? warnings[0];
}

export function displayLineupWarningMessage(warning: LineupWarningDTO): string {
  const availableMatch = warning.message?.match(/Only\s+(\d+)\s+available players/i);
  if (availableMatch) {
    return `Solo hay ${availableMatch[1]} jugadores disponibles. El equipo jugará con uno menos.`;
  }
  const offPositionMatch = warning.message?.match(/(\d+)\s+([A-Z]+)\s+slot filled by off-position players/i);
  if (offPositionMatch) {
    return `${offPositionMatch[1]} slot ${offPositionMatch[2]} está cubierto por jugadores fuera de posición. Se aplica penalización de efectividad.`;
  }
  if (/short-handed/i.test(warning.message || '')) {
    return 'El equipo jugará con menos de 11 jugadores disponibles.';
  }
  if (warning.code === 'LINEUP_NO_GOALKEEPER') {
    return 'La alineación necesita un arquero.';
  }
  if (warning.code === 'LINEUP_MINIMUM_PLAYERS_NOT_MET') {
    return 'Necesitás al menos 7 jugadores para jugar.';
  }
  return warning.message;
}

function riskPart(count: number, singular: string, plural: string): string | null {
  return count > 0 ? `${count} ${count > 1 ? plural : singular}` : null;
}
