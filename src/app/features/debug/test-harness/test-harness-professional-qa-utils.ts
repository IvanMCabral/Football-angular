import {
  ProfessionalQaActionStatus,
  ProfessionalQaChecklistRow,
  ProfessionalSmokeSummary,
} from '../models/test-harness.model';

export function professionalQaChecklistTestId(check: string): string {
  return `qa-check-${check.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function professionalQaVerdictClass(verdict: ProfessionalQaChecklistRow['verdict']): string {
  switch (verdict) {
    case 'OK':
      return 'qa-verdict-ok';
    case 'Fallback':
      return 'qa-verdict-fallback';
    case 'Review':
      return 'qa-verdict-review';
    default:
      return 'qa-verdict-pending';
  }
}

export function professionalQaVerdictLabel(verdict: ProfessionalQaChecklistRow['verdict']): string {
  if (verdict === 'Pending') return 'Pendiente';
  if (verdict === 'Review') return 'Revisar';
  return verdict === 'Fallback' ? 'OK con avisos' : verdict;
}

export function professionalQaCheckLabel(check: string): string {
  const labels: Record<string, string> = {
    'All formations audit': 'Auditoría de todas las formaciones',
    'Defensive side mapping': 'Lados defensivos',
    '3-4-1-2 spine': 'Columna 3-4-1-2',
    'Wide-role scarcity': 'Escasez de roles de banda',
    'Pixel movement signal': 'Señal de movimiento por píxeles',
    'Pixel no-cliff rule': 'Regla sin saltos bruscos',
    'Señal cambio jugador': 'Señal cambio jugador',
    'Live substitution signal': 'Señal de sustitución en vivo',
  };
  return labels[check] ?? check;
}

export function professionalQaTextLabel(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/Not run yet/g, 'Todavía no corrido')
    .replace(/Pending/g, 'Pendiente')
    .replace(/Review/g, 'Revisar')
    .replace(/Fallback/g, 'Fallback')
    .replace(/OK/g, 'OK')
    .replace(/line checks after running all/g, 'chequeos de línea después de correr las')
    .replace(/formations/g, 'formaciones')
    .replace(/formation/g, 'formación')
    .replace(/rows/g, 'filas')
    .replace(/row\(s\)/g, 'fila(s)')
    .replace(/match summaries/g, 'resúmenes de partido')
    .replace(/player summaries/g, 'resúmenes de jugador')
    .replace(/visible\/non-stable/g, 'visibles/no estables')
    .replace(/measurable smooth/g, 'suaves medibles')
    .replace(/defensive lines clean/g, 'líneas defensivas limpias')
    .replace(/LB\/RB and LWB\/RWB stay on their tactical side; no crossing\./g, 'LB/RB y LWB/RWB se mantienen en su lado táctico; no se cruzan.')
    .replace(/CAM natural in CAM and two CF\/ST preserved for both ST slots\./g, 'CAM natural en CAM y dos CF/ST preservados para los dos slots ST.')
    .replace(/Missing natural wingers\/LM\/RM becomes Fallback, not silent OK\./g, 'Si faltan extremos/LM/RM naturales, aparece Fallback; no queda como OK silencioso.')
    .replace(/Manual x\/y movement creates a measurable multi-seed signal\./g, 'Mover x/y manualmente genera una señal multi-seed medible.')
    .replace(/1px moves should be smooth, not strong cliff jumps\./g, 'Mover 1px debe ser suave, no un salto brusco.')
    .replace(/Changing players should affect role quality and match averages\./g, 'Cambiar jugadores debe afectar calidad de rol y promedios del partido.')
    .replace(/Same seed baseline vs minute substitution should alter match averages in the selected coach objective direction\./g, 'Mismo seed base vs sustitución por minuto debe cambiar los promedios según el objetivo DT.')
    .replace(/Run Auditoría todas las formaciones\./g, 'Corré Auditoría todas las formaciones.')
    .replace(/Run the all-formations audit, not only current formación\./g, 'Corré la auditoría de todas las formaciones, no solo la actual.')
    .replace(/Run formation audit\./g, 'Corré auditoría de formación.')
    .replace(/Run formación audit\./g, 'Corré auditoría de formación.')
    .replace(/Run Batería cambio jugador or Comparar precisión\./g, 'Corré Batería cambio jugador o Comparar precisión.')
    .replace(/Run Matriz presets posición or line smokes\./g, 'Corré Matriz presets posición o smokes de líneas.')
    .replace(/Run Matriz presets posicion or line smokes\./g, 'Corré Matriz presets posición o smokes de líneas.')
    .replace(/Run Chequeo sensibilidad\./g, 'Corré Chequeo sensibilidad.')
    .replace(/Run Simular sustitución or Smoke profesional full\./g, 'Corré Simular sustitución o Smoke profesional full.')
    .replace(/Keep as contract\./g, 'Mantener como contrato.')
    .replace(/No fallback detected for this squad\./g, 'No se detectó fallback en este plantel.')
    .replace(/Check side mapping \/ persisted slots\./g, 'Revisar mapeo de lados / slots guardados.')
    .replace(/Fallbacks are allowed; preview\/engine apply role-fit penalties\./g, 'Los fallback son válidos si quedan visibles y el preview/motor aplican penalización de rol.')
    .replace(/Fallback is exposed here and penalized by role-fit in preview \+ engine\./g, 'El fallback queda visible y penalizado por encaje de rol en preview + motor.')
    .replace(/Pinned by backend test\./g, 'Fijado por test de backend.')
    .replace(/Recheck auto-select reservation\./g, 'Revisar reserva del auto-select.')
    .replace(/Use best\/worst to tune role quality\./g, 'Usar mejor/peor caso para calibrar calidad de rol.')
    .replace(/Need-goal objective must raise xG or shots; inspect candidate quality and attacking role fit\./g, 'Si el objetivo es buscar gol, debe subir xG o tiros; revisar calidad del candidato y encaje ofensivo.')
    .replace(/Micro is smooth; calibrate 5px\/big tactical sensitivity separately\./g, 'El micro-movimiento es suave; calibrar aparte sensibilidad de 5px y movimientos tácticos grandes.')
    .replace(/Use filas to calibrate direction\./g, 'Usar las filas para calibrar dirección.')
    .replace(/Inspect/g, 'Revisar')
    .replace(/Use rows to calibrate direction\./g, 'Usar las filas para calibrar dirección.');
}

export function professionalSmokeVerdictClass(verdict: ProfessionalSmokeSummary['verdict']): string {
  if (verdict === 'OK') return 'qa-verdict-ok';
  if (verdict === 'Review' || verdict === 'Fail') return 'qa-verdict-review';
  if (verdict === 'Partial') return 'qa-verdict-fallback';
  return 'qa-verdict-pending';
}

export function professionalQaActionLabel(check: string): string {
  switch (check) {
    case 'All formations audit':
      return 'Correr auditoría completa';
    case 'Defensive side mapping':
    case '3-4-1-2 spine':
    case 'Wide-role scarcity':
      return 'Correr auditoría formación';
    case 'Pixel movement signal':
      return 'Correr smoke posición completo';
    case 'Pixel no-cliff rule':
      return 'Correr chequeo sensibilidad';
    case 'Señal cambio jugador':
      return 'Correr batería de cambio jugador';
    default:
      return 'Sin acción directa';
  }
}

export function professionalQaActionStatusClass(state: ProfessionalQaActionStatus['state']): string {
  return `qa-action-status-${state}`;
}
