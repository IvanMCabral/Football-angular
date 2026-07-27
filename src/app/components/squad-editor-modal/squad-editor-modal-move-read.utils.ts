import {
  TacticalChannel,
  TacticalLine,
  tacticalChannelFromX,
  tacticalLineFromY,
} from '../../shared/utils/tactical-shape-utils';

export interface SquadEditorCoachMoveRead {
  title: string;
  body: string;
  level: 'good' | 'warn' | 'danger' | 'info';
}

export interface SquadEditorCoachMoveReadInput {
  playerName: string;
  playerRole: string;
  naturalFamily: TacticalLine | 'GK' | null;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  snappedToNative: boolean;
}

export function buildSquadEditorCoachMoveRead(input: SquadEditorCoachMoveReadInput): SquadEditorCoachMoveRead {
  const dx = input.toX - input.fromX;
  const dy = input.toY - input.fromY;
  const distance = Math.hypot(dx, dy);
  const fineTrace = describeSquadEditorCoachMoveFineTrace(input.fromX, input.fromY, input.toX, input.toY);

  if (input.snappedToNative) {
    return {
      title: `${input.playerName} vuelve a base`,
      body: `Volvió cerca de su punto natural: se limpia el ajuste manual y se recupera la referencia de la formación.${fineTrace}`,
      level: 'info',
    };
  }

  if (distance < 1.0) {
    return {
      title: `${input.playerName} microajuste`,
      body: `Movimiento muy chico: debería ser estable y no provocar saltos fuertes, pero queda registrado como ajuste manual.${fineTrace}`,
      level: 'info',
    };
  }

  const fromLine = tacticalLineFromY(input.fromY);
  const toLine = tacticalLineFromY(input.toY);
  const fromChannel = tacticalChannelFromX(input.fromX);
  const toChannel = tacticalChannelFromX(input.toX);
  const movedUp = dy <= -3.5;
  const movedDown = dy >= 3.5;
  const movedWide = Math.abs(input.toX - 50) > Math.abs(input.fromX - 50) + 2.5;
  const movedInside = Math.abs(input.toX - 50) < Math.abs(input.fromX - 50) - 2.5;
  const forcedRole = input.naturalFamily && input.naturalFamily !== 'GK' && input.naturalFamily !== toLine;
  const spatialRead = `${describeSquadEditorCoachMoveSpatialRead(input.fromX, input.fromY, input.toX, input.toY)}${fineTrace}`;
  const lateralTradeoff = movedWide
    ? ' Además se abre: gana amplitud, pero puede aislarse o abrir espalda en ese costado.'
    : movedInside
      ? ' Además se cierra: gana conexión interior, pero puede liberar la banda.'
      : '';

  if (fromLine !== toLine) {
    const attackerDrop = input.naturalFamily === 'ATT' && toLine !== 'ATT' && input.toY > input.fromY;
    const defenderStep = input.naturalFamily === 'DEF' && toLine !== 'DEF' && input.toY < input.fromY;

    return {
      title: `${input.playerName}: ${fromLine} → ${toLine}`,
      body: attackerDrop
        ? `Baja un delantero: cambia el dibujo y puede dar cobertura contextual, pero no asumir mejora defensiva real hasta probar riesgo en harness.${lateralTradeoff}${spatialRead}`
        : defenderStep
          ? `Sube un defensor: puede sumar salida, presión o amenaza, pero abre espalda y debe validarse como tradeoff de riesgo en harness.${lateralTradeoff}${spatialRead}`
          : forcedRole
            ? `Cambio fuerte de zona: ahora juega como ${toLine}, pero su rol natural es ${input.playerRole}. El motor puede penalizarlo.${lateralTradeoff}${spatialRead}`
            : `Cambio fuerte de zona: modifica la estructura real de la formación y debería sentirse en el motor.${lateralTradeoff}${spatialRead}`,
      level: attackerDrop || defenderStep || forcedRole ? 'danger' : 'warn',
    };
  }

  if (movedWide && movedUp) {
    return {
      title: `${input.playerName} se proyecta abierto`,
      body: `Diagonal hacia banda y adelante: gana profundidad y amplitud, pero puede quedar aislado y dejar espalda si no hay cobertura. Tradeoff de amplitud/profundidad.${spatialRead}`,
      level: 'warn',
    };
  }
  if (movedWide && movedDown) {
    return {
      title: `${input.playerName} baja abierto`,
      body: `Diagonal hacia banda y atrás: suma cobertura exterior, pero puede alejarse del circuito interior y bajar amenaza. Tradeoff cobertura/amplitud.${spatialRead}`,
      level: 'info',
    };
  }
  if (movedInside && movedUp) {
    return {
      title: `${input.playerName} ataca por dentro`,
      body: `Diagonal hacia dentro y adelante: suma presencia central/ofensiva, pero puede liberar la banda y partir ayudas. Tradeoff interior/profundidad.${spatialRead}`,
      level: 'warn',
    };
  }
  if (movedInside && movedDown) {
    return {
      title: `${input.playerName} cierra para cubrir`,
      body: `Diagonal hacia dentro y atrás: puede compactar el bloque, pero reduce amplitud y puede dejar el costado sin salida. Tradeoff compactación/amplitud.${spatialRead}`,
      level: 'info',
    };
  }

  if (movedUp && Math.abs(input.fromX - 50) >= 30) {
    return {
      title: `${input.playerName} se proyecta`,
      body: `Sube por banda: gana profundidad ofensiva, pero puede dejar espalda si no hay cobertura.${spatialRead}`,
      level: 'warn',
    };
  }
  if (movedDown && Math.abs(input.fromX - 50) >= 30) {
    return {
      title: `${input.playerName} baja a cubrir`,
      body: `Baja por banda: mejora la protección del costado, con menor agresividad arriba.${spatialRead}`,
      level: 'good',
    };
  }
  if (movedUp) {
    return {
      title: `${input.playerName} más alto`,
      body: `Gana metros para presionar o atacar, pero revisa que no se rompa la distancia con su línea.${spatialRead}`,
      level: 'info',
    };
  }
  if (movedDown) {
    return {
      title: `${input.playerName} más bajo`,
      body: input.naturalFamily === 'ATT'
        ? `Baja un delantero: puede sumar apoyo contextual, pero valida en harness si realmente protege o si solo pierde amenaza.${spatialRead}`
        : `Da más cobertura y apoyo atrás; puede perder llegada si queda demasiado retrasado.${spatialRead}`,
      level: input.naturalFamily === 'ATT' ? 'warn' : 'info',
    };
  }
  if (movedWide) {
    return {
      title: `${input.playerName} abre la cancha`,
      body: `Gana amplitud y amenaza por fuera, pero puede aislarse, separar ayudas y abrir espalda si el rival explota ese costado. Tradeoff de amplitud: validalo en harness/partido.${spatialRead}`,
      level: 'warn',
    };
  }
  if (movedInside) {
    return {
      title: `${input.playerName} se cierra`,
      body: `Mejora conexión interior y control central, pero puede liberar la banda y dejar al equipo sin amplitud. Tradeoff interior/exterior: validalo en harness/partido.${spatialRead}`,
      level: 'warn',
    };
  }

  return {
    title: `${input.playerName}: ajuste ${fromChannel} → ${toChannel}`,
    body: `Ajuste lateral leve: mira si mejora conexiones o deja una banda menos cubierta.${spatialRead}`,
    level: 'info',
  };
}

export function describeSquadEditorCoachMoveSpatialRead(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string {
  const fromChannel = tacticalChannelFromX(fromX);
  const toChannel = tacticalChannelFromX(toX);
  const fromLine = tacticalLineFromY(fromY);
  const toLine = tacticalLineFromY(toY);
  const channelLabel = coachChannelLabel(toChannel);
  const notes: string[] = [channelLabel];

  if (fromChannel !== toChannel) {
    notes.push(`${coachChannelLabel(fromChannel)} -> ${channelLabel}`);
  }
  if (toLine === 'ATT' && Math.abs(toX - 50) >= 28) {
    notes.push('amenaza por banda');
  }
  if (toLine === 'DEF' && Math.abs(toX - 50) >= 28) {
    notes.push('cobertura lateral');
  }
  if (toLine === 'MID' && toChannel === 'C') {
    notes.push('control central');
  }
  if (toLine === 'ATT' && fromLine !== 'ATT') {
    notes.push('riesgo espalda');
  }
  if (toLine === 'DEF' && fromLine !== 'DEF') {
    notes.push('baja el bloque');
  }
  if (Math.abs(toX - 50) > Math.abs(fromX - 50) + 2.5) {
    notes.push('más amplitud');
  }
  if (Math.abs(toX - 50) < Math.abs(fromX - 50) - 2.5) {
    notes.push('más interior');
  }

  return ` Zona: ${notes.join(' · ')}.`;
}

export function describeSquadEditorCoachMoveFineTrace(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  const horizontal = Math.abs(dx) < 0.2
    ? 'mismo carril'
    : dx < 0
      ? `${Math.abs(dx).toFixed(1)}% hacia izquierda`
      : `${Math.abs(dx).toFixed(1)}% hacia derecha`;
  const vertical = Math.abs(dy) < 0.2
    ? 'misma altura'
    : dy < 0
      ? `${Math.abs(dy).toFixed(1)}% más alto`
      : `${Math.abs(dy).toFixed(1)}% más bajo`;
  const scale = distance < 1
    ? 'micro'
    : distance < 4
      ? 'fino'
      : distance < 10
        ? 'medio'
        : 'grande';

  return ` Traza fina: ${scale}, ${distance.toFixed(1)} pts de cancha (${horizontal}, ${vertical}); coords ${fromX.toFixed(1)}/${fromY.toFixed(1)} -> ${toX.toFixed(1)}/${toY.toFixed(1)}.`;
}

function coachChannelLabel(channel: TacticalChannel): string {
  if (channel === 'L') {
    return 'izquierda';
  }
  if (channel === 'R') {
    return 'derecha';
  }
  return 'centro';
}
