import {
  AllFormationRoleSlotSmokeRow,
  RoleSlotImpactSmokeRow,
} from '../models/test-harness.model';

export interface RoleSlotImpactSmokeExportPayload {
  match: string;
  formation: string | null;
  seedStart: number;
  seedCount: number;
  generatedAt: string;
  summary: Record<string, number>;
  rows: RoleSlotImpactSmokeRow[];
}

export interface AllFormationsRoleSlotSmokeExportPayload {
  match: string;
  seedStart: number;
  seedCount: number;
  generatedAt: string;
  summary: Record<string, number>;
  rows: AllFormationRoleSlotSmokeRow[];
}

export function roleSlotImpactSmokeVerdictCounter(rows: RoleSlotImpactSmokeRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.verdict || 'Sin veredicto';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function allFormationsRoleSlotSmokeVerdictCounter(
  rows: AllFormationRoleSlotSmokeRow[]
): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.verdict] = (acc[row.verdict] ?? 0) + 1;
    return acc;
  }, {});
}

export function roleSlotImpactSmokeMarkdownReport(
  payload: RoleSlotImpactSmokeExportPayload,
  formatPercent: (value: number) => string
): string {
  const summaryText = summaryTextFromCounter(payload.summary);
  const lines = [
    '# Role Slot Impact Smoke',
    '',
    `Match: ${payload.match}`,
    `Formation: ${payload.formation ?? 'n/a'}`,
    `Seeds: ${payload.seedStart}..${payload.seedStart + payload.seedCount - 1}`,
    `Generated at: ${payload.generatedAt}`,
    '',
    `Summary: ${summaryText}`,
    '',
    '| Slot | Jugador | Mejor rol | Eff | Peor rol | Eff | Gap | Veredicto |',
    '| --- | --- | --- | ---: | --- | ---: | ---: | --- |',
    ...payload.rows.map((row) =>
      `| ${row.slotId} | ${row.player} | ${row.bestRole} | ${formatPercent(row.bestEff * 100)} | ${row.worstRole} | ${formatPercent(row.worstEff * 100)} | ${formatPercent(row.gap * 100)} | ${row.verdict} |`
    ),
    '',
    'Lectura: si un slot defensivo prefiere DEF/LB/RB/CB y penaliza ATT, y un slot ofensivo prefiere ATT/WINGER/LW/RW y penaliza DEF, el modal esta llegando al motor. Si aparece "Revisar", ese slot necesita calibracion visual o de efectividad.',
    '',
  ];
  return lines.join('\n');
}

export function allFormationsRoleSlotSmokeMarkdownReport(
  payload: AllFormationsRoleSlotSmokeExportPayload,
  formatPercent: (value: number) => string
): string {
  const summaryText = summaryTextFromCounter(payload.summary);
  const lines = [
    '# All Formations Role Slot Smoke',
    '',
    `Match: ${payload.match}`,
    `Seeds: ${payload.seedStart}..${payload.seedStart + payload.seedCount - 1}`,
    `Generated at: ${payload.generatedAt}`,
    '',
    `Summary: ${summaryText}`,
    '',
    '| Formación | Slots | Claro | Visible | Revisar | Min gap | Avg gap | Slot débil | Veredicto |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...payload.rows.map((row) =>
      `| ${row.formation} | ${row.slots} | ${row.clear} | ${row.visible} | ${row.review} | ${formatPercent(row.minGap * 100)} | ${formatPercent(row.avgGap * 100)} | ${row.weakestSlot} | ${row.verdict} |`
    ),
    '',
    'Lectura: cada formación debe sostener gaps claros/visibles entre rol natural e improvisado. Si una formación cae en "Revisar", hay que abrir su detalle de slots y calibrar auto-select, coordenadas o efectividad.',
    '',
  ];
  return lines.join('\n');
}

function summaryTextFromCounter(summary: Record<string, number>): string {
  return Object.entries(summary)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || 'sin filas';
}
