import { TacticalChannel } from '../../shared/utils/tactical-shape-utils';

export interface SquadEditorVisualChannelSnapshot {
  label: TacticalChannel;
  threat: number;
  connection: number;
  coverage: number;
}

export type SquadEditorChannelScoresSnapshot = {
  left: number | null;
  center: number | null;
  right: number | null;
};

export function pushSquadEditorCoachDelta(
  parts: string[],
  magnitudes: number[],
  label: string,
  delta: number
): void {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1) {
    return;
  }

  const rounded = Math.round(delta);
  magnitudes.push(Math.abs(rounded));
  parts.push(`${label} ${rounded > 0 ? '+' : ''}${rounded}`);
}

export function buildSquadEditorCoachChannelDeltas(
  baseline: SquadEditorChannelScoresSnapshot,
  current: SquadEditorChannelScoresSnapshot,
  magnitudes: number[],
  baseBody = ''
): string[] {
  const result: string[] = [];
  pushSquadEditorCoachChannelDelta(result, magnitudes, 'L', baseline.left, current.left, baseBody);
  pushSquadEditorCoachChannelDelta(result, magnitudes, 'C', baseline.center, current.center, baseBody);
  pushSquadEditorCoachChannelDelta(result, magnitudes, 'R', baseline.right, current.right, baseBody);
  return result;
}

export function pushSquadEditorCoachChannelDelta(
  parts: string[],
  magnitudes: number[],
  label: TacticalChannel,
  before: number | null,
  after: number | null,
  baseBody = ''
): void {
  if (before === null || after === null) {
    return;
  }

  const delta = Math.round(after - before);
  if (Math.abs(delta) < 1) {
    return;
  }

  magnitudes.push(Math.abs(delta));
  const sign = delta > 0 ? '+' : '';
  const isWideProjection = baseBody.includes('gana profundidad')
    || baseBody.includes('Sube por banda')
    || baseBody.includes('amenaza por banda');
  const projectedWideTradeoff = delta < 0 && isWideProjection && label !== 'C';
  const detail = projectedWideTradeoff
    ? ' (mas profundidad, menos conexion/cobertura)'
    : '';

  parts.push(`${label} ${sign}${delta}${detail}`);
}

export function buildSquadEditorVisualChannelDeltas(
  baseline: SquadEditorVisualChannelSnapshot[],
  current: SquadEditorVisualChannelSnapshot[],
  magnitudes: number[]
): string[] {
  const result: string[] = [];

  for (const before of baseline) {
    const after = current.find(row => row.label === before.label);
    if (!after) {
      continue;
    }

    pushSquadEditorVisualMetricDelta(result, magnitudes, before.label, 'Amenaza', before.threat, after.threat);
    pushSquadEditorVisualMetricDelta(result, magnitudes, before.label, 'Conexion', before.connection, after.connection);
    pushSquadEditorVisualMetricDelta(result, magnitudes, before.label, 'Cobertura', before.coverage, after.coverage);
  }

  return result.slice(0, 4);
}

export function pushSquadEditorVisualMetricDelta(
  parts: string[],
  magnitudes: number[],
  channel: TacticalChannel,
  label: 'Amenaza' | 'Conexion' | 'Cobertura',
  before: number,
  after: number
): void {
  const delta = Math.round(after - before);
  if (!Number.isFinite(delta) || Math.abs(delta) < 6) {
    return;
  }

  magnitudes.push(Math.min(18, Math.ceil(Math.abs(delta) / 2)));
  const sign = delta > 0 ? '+' : '';
  parts.push(`${channel} ${label} ${sign}${delta}%`);
}

export function squadEditorVisualDeltaHasHardWarning(visualDeltas: string[]): boolean {
  return visualDeltas.some(delta =>
    delta.includes('Cobertura -')
    || delta.includes('Amenaza -')
    || delta.includes('Conexion -'));
}

export function buildSquadEditorVisualEngineTension(
  baseline: SquadEditorVisualChannelSnapshot[],
  current: SquadEditorVisualChannelSnapshot[],
  attackDelta: number,
  defenseDelta: number
): string {
  let threatDelta = 0;
  let coverageDelta = 0;
  let connectionDelta = 0;

  for (const before of baseline) {
    const after = current.find(row => row.label === before.label);
    if (!after) {
      continue;
    }

    threatDelta += after.threat - before.threat;
    coverageDelta += after.coverage - before.coverage;
    connectionDelta += after.connection - before.connection;
  }

  if (threatDelta >= 12 && attackDelta <= -4) {
    return 'sube la amenaza visual, pero baja ATT general. Probable penalizacion por rol/zona; conviene probarlo en harness.';
  }
  if (coverageDelta >= 12 && defenseDelta <= -4) {
    return 'sube la cobertura visual, pero baja DEF general. Revisar si el motor penaliza el cambio de rol mas que la posicion.';
  }
  if (connectionDelta >= 12 && attackDelta + defenseDelta <= -10) {
    return 'mejora la conexion visual, pero el balance general cae fuerte. Puede ser un tradeoff real o una frontera exagerada.';
  }

  return '';
}

export function describeSquadEditorCoachDeltaSeverity(magnitudes: number[]): string {
  if (magnitudes.length === 0) {
    return '';
  }

  const max = Math.max(...magnitudes);
  if (max >= 25) {
    return 'Impacto extremo: revisar si el movimiento representa un cambio táctico grande o si el motor está exagerando la frontera de zona.';
  }
  if (max >= 11) {
    return 'Impacto fuerte: debería sentirse claramente en el partido.';
  }
  if (max >= 4) {
    return 'Impacto medio: ajuste táctico perceptible, pero controlado.';
  }

  return 'Impacto leve: microajuste estable.';
}
