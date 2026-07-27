export type SquadEditorCoachReadLevel = 'good' | 'warn' | 'danger' | 'info';

export interface SquadEditorCoachRead {
  title: string;
  body: string;
  level: SquadEditorCoachReadLevel;
}

export interface SquadEditorTacticalMatrixRow {
  zone: 'ATT' | 'MID' | 'DEF';
  left: number;
  center: number;
  right: number;
}

export interface SquadEditorTacticalSummary {
  width: number;
  compactness: number;
}

export interface SquadEditorCoachReadInput {
  outfieldPlayerCount: number;
  matrix: SquadEditorTacticalMatrixRow[];
  summary: SquadEditorTacticalSummary;
  wideHigh: number;
  wideCover: number;
  offRoleCount: number;
  severeOffRoleCount: number;
}

export function buildSquadEditorTacticalCoachReads(input: SquadEditorCoachReadInput): SquadEditorCoachRead[] {
  if (input.outfieldPlayerCount < 10) {
    return [{
      title: 'Lineup incompleto',
      body: 'Completa los 11 para leer ataque, cobertura y bandas con sentido.',
      level: 'warn',
    }];
  }

  const attRow = input.matrix.find(row => row.zone === 'ATT');
  const defRow = input.matrix.find(row => row.zone === 'DEF');
  const totalLeft = input.matrix.reduce((acc, row) => acc + row.left, 0);
  const totalCenter = input.matrix.reduce((acc, row) => acc + row.center, 0);
  const totalRight = input.matrix.reduce((acc, row) => acc + row.right, 0);
  const attCount = (attRow?.left ?? 0) + (attRow?.center ?? 0) + (attRow?.right ?? 0);
  const defCount = (defRow?.left ?? 0) + (defRow?.center ?? 0) + (defRow?.right ?? 0);
  const notes: SquadEditorCoachRead[] = [];

  if (input.summary.width < 45) {
    notes.push({
      title: 'Equipo cerrado',
      body: 'Concentras jugadores por dentro: podes combinar, pero te pueden entrar por fuera.',
      level: 'warn',
    });
  } else if (input.summary.width > 75) {
    notes.push({
      title: 'Equipo muy ancho',
      body: 'Das amplitud, pero si no hay medio suficiente el bloque puede partirse.',
      level: 'warn',
    });
  } else {
    notes.push({
      title: 'Ancho sano',
      body: 'La ocupacion lateral es razonable: hay bandas sin romper demasiado el centro.',
      level: 'good',
    });
  }

  if (totalLeft <= 1 || totalRight <= 1) {
    notes.push({
      title: 'Banda descubierta',
      body: `${totalLeft <= 1 ? 'Izquierda' : 'Derecha'} queda con poca ayuda. El rival puede atacar ese costado.`,
      level: 'danger',
    });
  } else if (Math.abs(totalLeft - totalRight) >= 3) {
    notes.push({
      title: 'Equipo inclinado',
      body: totalLeft > totalRight
        ? 'Cargas mas la izquierda: generas superioridad ahi, pero ojo el lado derecho.'
        : 'Cargas mas la derecha: generas superioridad ahi, pero ojo el lado izquierdo.',
      level: 'info',
    });
  }

  if (totalCenter <= 2) {
    notes.push({
      title: 'Centro liviano',
      body: 'Hay poca presencia interior: cuesta sostener posesion y defender segunda jugada.',
      level: 'warn',
    });
  } else if (totalCenter >= 5) {
    notes.push({
      title: 'Centro fuerte',
      body: 'Tenes buena presencia interior: mejora control, pero revisa que no falte amplitud.',
      level: 'good',
    });
  }

  if (input.wideHigh >= 2 && input.wideCover <= 1) {
    notes.push({
      title: 'Carrileros altos',
      body: 'Hay proyeccion por banda, pero poca cobertura detras. Plan ofensivo con riesgo.',
      level: 'warn',
    });
  } else if (input.wideCover >= 2 && input.wideHigh <= 1) {
    notes.push({
      title: 'Bandas protegidas',
      body: 'Los costados quedan cubiertos. Mejor para cuidar resultado, menos agresivo arriba.',
      level: 'good',
    });
  } else if (input.wideHigh >= 1 && input.wideCover >= 1) {
    notes.push({
      title: 'Banda compensada',
      body: 'Tenes salida por fuera y una ayuda cercana para no quedar tan largo.',
      level: 'good',
    });
  }

  if (input.summary.compactness < 45) {
    notes.push({
      title: 'Bloque largo',
      body: 'Las lineas estan separadas: puede aparecer espacio entre defensa y medio.',
      level: 'warn',
    });
  } else if (input.summary.compactness >= 68) {
    notes.push({
      title: 'Bloque compacto',
      body: 'Las lineas estan cerca: ayuda a presionar y recuperar, aunque puede faltar profundidad.',
      level: 'good',
    });
  }

  if (attCount >= 4 && defCount <= 3) {
    notes.push({
      title: 'Plan agresivo',
      body: 'Muchos jugadores arriba y pocos atras: puede generar ocasiones, pero concede transiciones.',
      level: 'warn',
    });
  } else if (defCount >= 5 && attCount <= 2) {
    notes.push({
      title: 'Plan conservador',
      body: 'Mucha cobertura defensiva. Sirve para proteger, pero puede aislar a los delanteros.',
      level: 'info',
    });
  }

  if (input.severeOffRoleCount > 0) {
    notes.push({
      title: 'Roles forzados',
      body: `${input.severeOffRoleCount} jugador(es) estan muy fuera de rol. El motor lo va a penalizar.`,
      level: 'danger',
    });
  } else if (input.offRoleCount > 0) {
    notes.push({
      title: 'Ajustes de rol',
      body: `${input.offRoleCount} jugador(es) fuera de zona natural. Es jugable, pero revisa si tiene sentido.`,
      level: 'warn',
    });
  }

  return notes.length > 0 ? notes.slice(0, 5) : [{
    title: 'Forma estable',
    body: 'No hay alertas claras: el dibujo se ve coherente para probar en partido.',
    level: 'good',
  }];
}
