import { PlayerSwapCandidate } from '../models/test-harness.model';
import { PlayerSwapRoleRiskRead } from './player-swap-analysis';

export type PlayerSwapLine = 'ATT' | 'MID' | 'DEF';
export type PlayerSwapFitLevel = 'profile' | 'line' | 'out';

export function playerSwapProfile(
  position: string | null | undefined,
  positionLine: (position: string | null | undefined) => PlayerSwapLine | null
): string {
  const p = String(position ?? '').toUpperCase();
  if (['ST', 'CF', 'ATT'].includes(p)) return 'ST';
  if (['LW', 'RW', 'LM', 'RM', 'WINGER'].includes(p)) return 'WIDE';
  if (['CAM', 'AM'].includes(p)) return 'AM';
  if (['CDM', 'DM'].includes(p)) return 'DM';
  if (['CM', 'MID'].includes(p)) return 'CM';
  if (['LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'FB';
  if (['CB', 'DEF'].includes(p)) return 'CB';
  return positionLine(p) ?? 'MID';
}

export function playerSwapFitLevel(
  candidate: PlayerSwapCandidate | null,
  positionLine: (position: string | null | undefined) => PlayerSwapLine | null
): PlayerSwapFitLevel {
  if (!candidate) return 'out';
  const starterProfile = playerSwapProfile(candidate.starterPosition, positionLine);
  const benchProfile = playerSwapProfile(candidate.benchPosition, positionLine);
  if (starterProfile === benchProfile) return 'profile';
  if (positionLine(candidate.starterPosition) === positionLine(candidate.benchPosition)) return 'line';
  return 'out';
}

export function playerSwapFitText(level: PlayerSwapFitLevel): string {
  if (level === 'profile') return 'Same profile';
  if (level === 'line') return 'Same line';
  return 'Out of role';
}

export function playerSwapFitClass(level: PlayerSwapFitLevel): string {
  if (level === 'profile') return 'delta-positive';
  if (level === 'line') return 'read-stable';
  return 'read-check';
}

export function playerSwapFitDetail(
  candidate: PlayerSwapCandidate | null,
  positionLine: (position: string | null | undefined) => PlayerSwapLine | null
): string {
  if (!candidate) return 'No candidate metadata available.';
  const starterProfile = playerSwapProfile(candidate.starterPosition, positionLine);
  const benchProfile = playerSwapProfile(candidate.benchPosition, positionLine);
  const starterLine = positionLine(candidate.starterPosition) ?? 'NONE';
  const benchLine = positionLine(candidate.benchPosition) ?? 'NONE';
  const fit = playerSwapFitText(playerSwapFitLevel(candidate, positionLine));
  return `${fit}: ${candidate.starterPosition}/${starterProfile}/${starterLine} -> ${candidate.benchPosition}/${benchProfile}/${benchLine}.`;
}

export function playerSwapRoleRisk(
  candidate: PlayerSwapCandidate | null,
  positionLine: (position: string | null | undefined) => PlayerSwapLine | null
): PlayerSwapRoleRiskRead {
  if (!candidate || playerSwapFitLevel(candidate, positionLine) !== 'out') {
    return { attack: 0, control: 0, protection: 0, detail: '' };
  }
  const starter = positionLine(candidate.starterPosition);
  const bench = positionLine(candidate.benchPosition);
  if (starter === 'MID' && bench === 'ATT') {
    return {
      attack: 0.020,
      control: -0.055,
      protection: -0.045,
      detail: 'Alerta de rol: reemplaza un mediocampista por atacante/banda en zona de control',
    };
  }
  if (starter === 'MID' && bench === 'DEF') {
    return {
      attack: -0.010,
      control: -0.040,
      protection: -0.010,
      detail: 'Alerta de rol: gana marca potencial, pero pierde gestion de pelota en el medio',
    };
  }
  if (starter === 'DEF' && bench === 'ATT') {
    return {
      attack: 0.025,
      control: -0.015,
      protection: -0.055,
      detail: 'Alerta de rol: cambia defensa por atacante/banda y expone proteccion',
    };
  }
  if (starter === 'ATT' && (bench === 'DEF' || bench === 'MID')) {
    return {
      attack: -0.055,
      control: bench === 'MID' ? 0.020 : -0.010,
      protection: bench === 'DEF' ? 0.025 : 0.010,
      detail: 'Alerta de rol: cambia amenaza ofensiva por perfil mas conservador',
    };
  }
  return { attack: 0, control: 0, protection: 0, detail: '' };
}
