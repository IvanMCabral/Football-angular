import {
  ControlledTeamSide,
  RoundGroup,
  ScenarioBatteryCoachAdvice,
  ScenarioBatteryCoachObjective,
  ScenarioBatteryCoachObjectiveModel,
  ScenarioBatteryReviewItem,
  ScenarioBatteryRow,
  ScenarioDecisionCard,
  ScenarioMatrixSummaryRow,
  TeamStyleOption,
  TestHarnessMatchRow,
} from '../models/test-harness.model';

type ScenarioBatteryControlledSide = Exclude<ControlledTeamSide, 'USER'>;
type ScenarioBatteryStrength = TestHarnessMatchRow['homeStrength'] | null;

export interface ScenarioBatteryRowBuilderDeps {
  buildDecisionCards: (rows: ScenarioMatrixSummaryRow[]) => ScenarioDecisionCard[];
  coachContext: (
    match: TestHarnessMatchRow,
    controlledSide: ScenarioBatteryControlledSide
  ) => { summary: string; detail: string };
  coachObjective: (
    match: TestHarnessMatchRow,
    controlledSide: ScenarioBatteryControlledSide
  ) => ScenarioBatteryCoachObjective;
  decision: (
    cards: ScenarioDecisionCard[],
    objective: ScenarioBatteryCoachObjective
  ) => { label: string; detail: string };
  review: (
    objective: ScenarioBatteryCoachObjective,
    decisionLabel: string,
    cards: ScenarioDecisionCard[]
  ) => { label: string; detail: string };
}

export interface ScenarioDecisionCardBuilderDeps {
  actionKey: (row: ScenarioMatrixSummaryRow) => string;
  attackCandidateIsCoachWorthy: (row: ScenarioMatrixSummaryRow) => boolean;
  attackPlanScore: (row: ScenarioMatrixSummaryRow) => number;
  cardFromRow: (title: string, row: ScenarioMatrixSummaryRow, className: string, detail: string) => ScenarioDecisionCard;
  isOpponentRow: (row: ScenarioMatrixSummaryRow) => boolean;
  opponentMaxChannelXgDelta: (row: ScenarioMatrixSummaryRow) => number;
  opponentMinChannelXgDelta: (row: ScenarioMatrixSummaryRow) => number;
  opponentProtectionRead: (row: ScenarioMatrixSummaryRow) => string;
  opponentRiskRead: (row: ScenarioMatrixSummaryRow) => string;
  protectionCandidateIsCoachWorthy: (row: ScenarioMatrixSummaryRow) => boolean;
  summaryActionLabel: (row: ScenarioMatrixSummaryRow) => string;
  summaryCoachRead: (row: ScenarioMatrixSummaryRow) => string;
  userChannelRead: (row: ScenarioMatrixSummaryRow) => string;
  twoWayScore: (row: ScenarioMatrixSummaryRow) => number;
  formatDeltaNumber: (value: number) => string;
}

export function scenarioBatteryCoachObjectiveLabel(objective: ScenarioBatteryCoachObjective): string {
  switch (objective) {
    case 'NEED_GOAL':
      return 'Necesito gol';
    case 'PROTECT_RESULT':
      return 'Cuidar resultado';
    default:
      return 'Neutral';
  }
}

export function scenarioBatteryScopeHint(scope: 'quick' | 'balanced', available: number, limit: number): string {
  const suffix = available < limit
    ? ` Hoy hay ${available}/${limit} partidos completados disponibles.`
    : ` ${available}/${limit} partidos disponibles.`;
  return scope === 'balanced'
    ? `Media: hasta 4 partidos x Local/Visitante.${suffix}`
    : `Rápida: hasta 2 partidos x Local/Visitante.${suffix}`;
}

export function scenarioBatteryCoachObjectiveHint(model: ScenarioBatteryCoachObjectiveModel, autoHint: string): string {
  switch (model) {
    case 'AUTO':
      return autoHint;
    case 'NEED_GOAL':
      return 'Prioriza upside ofensivo aunque abra espacios.';
    case 'PROTECT_RESULT':
      return 'Prioriza bajar riesgo y evitar intercambios.';
    default:
      return 'Lectura equilibrada para partido abierto.';
  }
}

export function scenarioBatteryGroupHint(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): string {
  switch (group) {
    case 'ALL':
      return 'Todo: ataque, defensa y lectura del rival.';
    case 'DEFENSE':
      return 'Defensa: mide protección, riesgos y cierres.';
    case 'OPPONENT':
      return 'Rival: mide por donde nos puede atacar.';
    default:
      return 'Ataque: mide canales, forma y riesgo ofensivo.';
  }
}

export function scenarioBatteryCoverageHint(
  scope: 'quick' | 'balanced',
  readings: number,
  seeds: number,
  availableMatches: number,
  targetMatches: number
): string {
  const coverage = readings > 0 ? `${readings} lecturas x ${seeds} seeds` : `${seeds} seeds`;
  if (scope === 'balanced' && availableMatches < targetMatches) {
    return `Cobertura limitada: ${coverage}; faltan partidos completados para decidir tendencias.`;
  }
  return scope === 'balanced'
    ? `Cobertura media: ${coverage}; usar para decidir tendencias.`
    : `Cobertura smoke: ${coverage}; usar para detectar señales, no para cerrar balance.`;
}

export function scenarioBatteryProgressText(
  completed: number,
  total: number,
  availableMatches: number,
  targetMatches: number,
  nextJob: { match: TestHarnessMatchRow; controlledSide: ScenarioBatteryControlledSide } | null | undefined
): string {
  const next = nextJob
    ? ` Próximo: ${nextJob.match.homeTeamName} vs ${nextJob.match.awayTeamName} (${nextJob.controlledSide === 'HOME' ? 'local' : 'visitante'}).`
    : ' Cerrando tablero...';
  return `Tablero batería: ${completed}/${total} lecturas (${availableMatches}/${targetMatches} partidos).${next}`;
}

export function scenarioBatteryScenarioCountEstimate(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): number {
  switch (group) {
    case 'ALL':
      return 29;
    case 'DEFENSE':
      return 7;
    case 'OPPONENT':
      return 5;
    default:
      return 19;
  }
}

export function scenarioBatteryCandidateMatches(
  rounds: RoundGroup[],
  selectedMatchId: string | null,
  limit: number
): TestHarnessMatchRow[] {
  const completed = rounds
    .flatMap((round) => round.matches)
    .filter((match) => String(match.status).toUpperCase() === 'COMPLETED');
  if (!selectedMatchId) {
    return completed.slice(0, limit);
  }
  const selected = completed.find((match) => match.matchId === selectedMatchId);
  if (!selected) {
    return completed.slice(0, limit);
  }
  return [
    selected,
    ...completed.filter((match) => match.matchId !== selectedMatchId),
  ].slice(0, limit);
}

export function buildScenarioBatteryRow(
  match: TestHarnessMatchRow,
  controlledSide: ScenarioBatteryControlledSide,
  scenarioGroup: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT',
  seedStart: number,
  seedCount: number,
  rows: ScenarioMatrixSummaryRow[],
  deps: ScenarioBatteryRowBuilderDeps
): ScenarioBatteryRow {
  const cards = deps.buildDecisionCards(rows);
  const coachObjective = deps.coachObjective(match, controlledSide);
  const coachContext = deps.coachContext(match, controlledSide);
  const decision = deps.decision(cards, coachObjective);
  const review = deps.review(coachObjective, decision.label, cards);
  return {
    matchId: match.matchId,
    matchLabel: `${match.homeTeamName} vs ${match.awayTeamName}`,
    controlledSide,
    controlledTeam: controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName,
    scenarioGroup,
    coachObjective,
    coachContext: coachContext.summary,
    coachContextDetail: coachContext.detail,
    seedStart,
    seedCount,
    scenarioCount: rows.length,
    decision: decision.label,
    decisionDetail: decision.detail,
    review: review.label,
    reviewDetail: review.detail,
    cards,
  };
}

export function scenarioBatteryMetricText(value: number | null | undefined, label: string): string {
  return value === null || value === undefined ? `${label} ?` : `${label} ${Math.round(value)}`;
}

export function scenarioBatteryTeamReputation(teamName: string): number {
  const normalized = teamName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/(real madrid|barcelona|atletico madrid)/.test(normalized)) return 5;
  if (/(sevilla|real sociedad|athletic club|villarreal|real betis|valencia)/.test(normalized)) return 4;
  if (/(girona|celta vigo|osasuna|mallorca|getafe|rayo vallecano|espanyol|leganes|las palmas|alaves)/.test(normalized)) return 3;
  if (/(granada|malaga|murcia|zaragoza|valladolid|santander|coruna|pamplona|bilbao|vigo|san sebastian|madrid reserve|barcelona b|valencia city|sevilla athletic)/.test(normalized)) return 2;
  return 3;
}

export function scenarioBatteryTeamRating(
  teamName: string,
  strength: ScenarioBatteryStrength
): { value: number; source: 'strength' | 'name' } {
  const realRating = strength?.startingOvr ?? strength?.squadOvr;
  return realRating !== null && realRating !== undefined
    ? { value: realRating, source: 'strength' }
    : { value: scenarioBatteryTeamReputation(teamName), source: 'name' };
}

export function scenarioBatteryTeamCondition(
  strength: ScenarioBatteryStrength
): { label: string; tired: boolean; fresh: boolean } {
  const energy = strength?.avgEnergy;
  const stamina = strength?.avgStamina;
  const form = strength?.avgForm;
  const hasRealCondition = energy !== null && energy !== undefined
    || stamina !== null && stamina !== undefined
    || form !== null && form !== undefined;
  if (!hasRealCondition) {
    return { label: 'condicion?', tired: false, fresh: false };
  }
  const tired = (energy !== null && energy !== undefined && energy < 72)
    || (stamina !== null && stamina !== undefined && stamina < 72)
    || (form !== null && form !== undefined && form < 45);
  const fresh = (energy === null || energy === undefined || energy >= 88)
    && (stamina === null || stamina === undefined || stamina >= 78)
    && (form === null || form === undefined || form >= 60);
  if (tired) return { label: 'cansado', tired: true, fresh: false };
  if (fresh) return { label: 'fresco', tired: false, fresh: true };
  return { label: 'normal', tired: false, fresh: false };
}

export function scenarioBatterySquadText(strength: ScenarioBatteryStrength): string {
  if (!strength) return 'sin strength';
  const squad = strength.squadOvr ?? '?';
  const starters = strength.startingOvr ?? '?';
  const size = strength.squadSize ?? '?';
  const starterCount = strength.starterCount ?? '?';
  return `squadOvr ${squad}, startingOvr ${starters}, squad ${size}, XI ${starterCount}`;
}

export function scenarioBatteryGoalDiff(
  match: TestHarnessMatchRow,
  controlledSide: ScenarioBatteryControlledSide
): number | null {
  if (match.homeGoals === null || match.awayGoals === null) {
    return null;
  }
  return controlledSide === 'HOME'
    ? match.homeGoals - match.awayGoals
    : match.awayGoals - match.homeGoals;
}

export function scenarioBatteryDecisionMinute(match: TestHarnessMatchRow, selectedMinute: number): number {
  if (selectedMinute > 0) {
    return selectedMinute;
  }
  return String(match.status).toUpperCase() === 'COMPLETED' ? 75 : 45;
}

export function scenarioBatteryMatchStateText(
  match: TestHarnessMatchRow,
  controlledSide: ScenarioBatteryControlledSide,
  selectedMinute: number
): { summary: string; detail: string } {
  const minute = scenarioBatteryDecisionMinute(match, selectedMinute);
  const homeGoals = match.homeGoals;
  const awayGoals = match.awayGoals;
  const score = homeGoals === null || homeGoals === undefined || awayGoals === null || awayGoals === undefined
    ? 'marcador ?'
    : `${homeGoals}-${awayGoals}`;
  const goalDiff = scenarioBatteryGoalDiff(match, controlledSide);
  const state = goalDiff === null
    ? 'estado ?'
    : goalDiff > 0
      ? `ganando +${goalDiff}`
      : goalDiff < 0
        ? `perdiendo ${goalDiff}`
        : 'empatado';
  return {
    summary: `${score} min ${minute}`,
    detail: `${score}, min ${minute}, ${state}`,
  };
}

export function scenarioBatteryContextPressure(
  match: TestHarnessMatchRow,
  controlledSide: ScenarioBatteryControlledSide
): { label: string; reputationDelta: number; away: boolean; strongThreshold: number; tired: boolean; fresh: boolean } {
  const ownName = controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName;
  const rivalName = controlledSide === 'HOME' ? match.awayTeamName : match.homeTeamName;
  const ownStrength = controlledSide === 'HOME' ? match.homeStrength : match.awayStrength;
  const rivalStrength = controlledSide === 'HOME' ? match.awayStrength : match.homeStrength;
  const ownRating = scenarioBatteryTeamRating(ownName, ownStrength ?? null);
  const rivalRating = scenarioBatteryTeamRating(rivalName, rivalStrength ?? null);
  const reputationDelta = ownRating.value - rivalRating.value;
  const away = controlledSide === 'AWAY';
  const venue = away ? 'visitante' : 'local';
  const strongThreshold = ownRating.source === 'strength' && rivalRating.source === 'strength' ? 4 : 2;
  const level = reputationDelta >= strongThreshold
    ? 'favorito'
    : reputationDelta <= -strongThreshold
      ? 'underdog'
      : 'parejo';
  const source = ownRating.source === 'strength' && rivalRating.source === 'strength' ? 'ovr' : 'nombre';
  const condition = scenarioBatteryTeamCondition(ownStrength ?? null);
  return {
    label: `${venue}/${level}/${source}/${condition.label}`,
    reputationDelta,
    away,
    strongThreshold,
    tired: condition.tired,
    fresh: condition.fresh,
  };
}

export function inferScenarioBatteryCoachObjective(
  match: TestHarnessMatchRow,
  controlledSide: ScenarioBatteryControlledSide,
  selectedMinute: number
): ScenarioBatteryCoachObjective {
  const minute = scenarioBatteryDecisionMinute(match, selectedMinute);
  const goalDiff = scenarioBatteryGoalDiff(match, controlledSide);
  if (goalDiff === null) {
    return 'NEUTRAL';
  }
  const pressure = scenarioBatteryContextPressure(match, controlledSide);
  if (goalDiff < 0 && (minute >= (pressure.tired ? 45 : 50) || goalDiff <= -2)) {
    return 'NEED_GOAL';
  }
  if (goalDiff > 0 && (
    minute >= (pressure.tired ? 60 : 70)
    || (minute >= (pressure.tired ? 55 : 60) && (pressure.away || pressure.reputationDelta <= 0))
  )) {
    return 'PROTECT_RESULT';
  }
  if (goalDiff === 0 && (minute >= 70 || (pressure.fresh && !pressure.away && pressure.reputationDelta > 0 && minute >= 65))) {
    if (pressure.tired && (pressure.away || pressure.reputationDelta <= 0) && minute >= 70) {
      return 'PROTECT_RESULT';
    }
    if (!pressure.tired && !pressure.away && pressure.reputationDelta >= pressure.strongThreshold) {
      return 'NEED_GOAL';
    }
    if (pressure.fresh && !pressure.away && pressure.reputationDelta > 0 && minute >= 65) {
      return 'NEED_GOAL';
    }
    if (pressure.away && pressure.reputationDelta <= -pressure.strongThreshold && minute >= (pressure.tired ? 70 : 75)) {
      return 'PROTECT_RESULT';
    }
  }
  return 'NEUTRAL';
}

export function scenarioBatteryAutoObjectiveHint(
  match: TestHarnessMatchRow | null,
  controlledSide: ScenarioBatteryControlledSide,
  selectedMinute: number
): string {
  if (!match) {
    return 'Auto: usa resultado y minuto; sin partido seleccionado, lectura equilibrada.';
  }
  const objective = inferScenarioBatteryCoachObjective(match, controlledSide, selectedMinute);
  const label = scenarioBatteryCoachObjectiveLabel(objective);
  const minute = scenarioBatteryDecisionMinute(match, selectedMinute);
  const goalDiff = scenarioBatteryGoalDiff(match, controlledSide);
  const pressure = scenarioBatteryContextPressure(match, controlledSide);
  const diffText = goalDiff === null
    ? 'marcador desconocido'
    : goalDiff > 0
      ? `ganando por ${goalDiff}`
      : goalDiff < 0
        ? `perdiendo por ${Math.abs(goalDiff)}`
        : 'empatado';
  return `Auto: ${label} (${diffText}, min ${minute}, ${pressure.label}).`;
}

export function scenarioBatteryCoachContext(
  match: TestHarnessMatchRow,
  controlledSide: ScenarioBatteryControlledSide,
  selectedMinute: number
): { summary: string; detail: string } {
  const ownName = controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName;
  const rivalName = controlledSide === 'HOME' ? match.awayTeamName : match.homeTeamName;
  const ownStrength = controlledSide === 'HOME' ? match.homeStrength : match.awayStrength;
  const rivalStrength = controlledSide === 'HOME' ? match.awayStrength : match.homeStrength;
  const pressure = scenarioBatteryContextPressure(match, controlledSide);
  const ownRating = scenarioBatteryTeamRating(ownName, ownStrength ?? null);
  const rivalRating = scenarioBatteryTeamRating(rivalName, rivalStrength ?? null);
  const ownEnergy = scenarioBatteryMetricText(ownStrength?.avgEnergy, 'EN');
  const ownForm = scenarioBatteryMetricText(ownStrength?.avgForm, 'FOR');
  const ownStamina = scenarioBatteryMetricText(ownStrength?.avgStamina, 'STA');
  const matchState = scenarioBatteryMatchStateText(match, controlledSide, selectedMinute);
  const source = ownRating.source === 'strength' && rivalRating.source === 'strength' ? 'OVR real' : 'fallback nombre';
  const summary = `${matchState.summary} · ${pressure.label} · OVR ${ownRating.value}-${rivalRating.value} · ${ownEnergy}`;
  const detail = [
    `${ownName} vs ${rivalName}`,
    `Partido: ${matchState.detail}`,
    `Contexto: ${pressure.label}`,
    `Fuente: ${source}`,
    `OVR propio/rival: ${ownRating.value}/${rivalRating.value}`,
    `Condición propia: ${ownEnergy}, ${ownForm}, ${ownStamina}`,
    `Plantel propio: ${scenarioBatterySquadText(ownStrength ?? null)}`,
    `Plantel rival: ${scenarioBatterySquadText(rivalStrength ?? null)}`,
  ].join(' · ');
  return { summary, detail };
}

export function buildScenarioDecisionCardsFromSummary(
  summaryRows: ScenarioMatrixSummaryRow[],
  deps: ScenarioDecisionCardBuilderDeps
): ScenarioDecisionCard[] {
  const rows = summaryRows
    .filter((row) => !row.scenario.includes('noop') && !row.scenario.startsWith('base-'));
  if (rows.length === 0) {
    return [];
  }
  const cards: ScenarioDecisionCard[] = [];
  const usedActionKeys = new Set<string>();
  const ownRows = rows.filter((row) => !deps.isOpponentRow(row));
  const opponentRows = rows.filter((row) => deps.isOpponentRow(row));
  const baseline = summaryRows
    .find((row) => row.scenario.includes('noop') || row.scenario.startsWith('base-'));
  cards.push({
    title: 'Plan actual',
    label: baseline ? deps.summaryActionLabel(baseline) : 'Baseline',
    metrics: baseline
      ? `xG ${deps.formatDeltaNumber(baseline.avgUserXgDelta)} / xGA ${deps.formatDeltaNumber(baseline.avgOpponentXgDelta)}`
      : 'Referencia del partido',
    detail: baseline
      ? deps.summaryCoachRead(baseline)
      : 'Punto de comparacion para medir cada ajuste.',
    className: 'decision-neutral',
  });
  const twoWayAction = ownRows
    .filter((row) => row.avgUserXgDelta >= 0.04 && row.avgOpponentXgDelta <= -0.04)
    .sort((a, b) => deps.twoWayScore(b) - deps.twoWayScore(a))[0];
  if (twoWayAction) {
    cards.push(deps.cardFromRow(
      'Doble ganancia',
      twoWayAction,
      'decision-attack',
      `${deps.userChannelRead(twoWayAction)} / ${deps.opponentProtectionRead(twoWayAction)}`,
    ));
    usedActionKeys.add(deps.actionKey(twoWayAction));
  }
  const attackPlan = ownRows
    .filter((row) => !usedActionKeys.has(deps.actionKey(row)))
    .filter((row) => deps.attackCandidateIsCoachWorthy(row))
    .sort((a, b) => deps.attackPlanScore(b) - deps.attackPlanScore(a))[0];
  if (attackPlan) {
    cards.push(deps.cardFromRow(
      'Atacar',
      attackPlan,
      'decision-attack',
      deps.userChannelRead(attackPlan),
    ));
    usedActionKeys.add(deps.actionKey(attackPlan));
  }
  const shapeAttack = ownRows
    .filter((row) => row.scenario.startsWith('m45-shape-'))
    .filter((row) => !usedActionKeys.has(deps.actionKey(row)))
    .filter((row) => row.avgUserXgDelta >= 0.08 && row.avgOpponentXgDelta <= 0.12)
    .sort((a, b) => b.avgUserXgDelta - a.avgUserXgDelta)[0];
  if (shapeAttack && (!attackPlan || shapeAttack.avgUserXgDelta >= attackPlan.avgUserXgDelta + 0.04)) {
    cards.push(deps.cardFromRow(
      'Forma',
      shapeAttack,
      'decision-shape',
      deps.userChannelRead(shapeAttack),
    ));
    usedActionKeys.add(deps.actionKey(shapeAttack));
  }
  const bestProtection = ownRows
    .filter((row) => !usedActionKeys.has(deps.actionKey(row)))
    .filter((row) => deps.protectionCandidateIsCoachWorthy(row))
    .filter((row) => row.avgOpponentXgDelta <= 0.03)
    .filter((row) => row.avgOpponentXgDelta <= -0.06 || deps.opponentMinChannelXgDelta(row) <= -0.08)
    .filter((row) => deps.opponentMaxChannelXgDelta(row) < 0.10)
    .sort((a, b) => Math.min(a.avgOpponentXgDelta, deps.opponentMinChannelXgDelta(a))
      - Math.min(b.avgOpponentXgDelta, deps.opponentMinChannelXgDelta(b)))[0];
  if (bestProtection) {
    cards.push(deps.cardFromRow(
      'Cuidar',
      bestProtection,
      'decision-safe',
      deps.opponentProtectionRead(bestProtection),
    ));
    usedActionKeys.add(deps.actionKey(bestProtection));
  }
  const biggestRisk = ownRows
    .filter((row) => deps.opponentMaxChannelXgDelta(row) >= 0.10 || row.avgOpponentXgDelta >= 0.10)
    .sort((a, b) => Math.max(b.avgOpponentXgDelta, deps.opponentMaxChannelXgDelta(b))
      - Math.max(a.avgOpponentXgDelta, deps.opponentMaxChannelXgDelta(a)))[0];
  if (biggestRisk) {
    const offensiveRisk = biggestRisk.avgUserXgDelta >= 0.02;
    cards.push(deps.cardFromRow(
      offensiveRisk ? 'Riesgo ofensivo' : 'Evitar',
      biggestRisk,
      'decision-risk',
      offensiveRisk
        ? `${deps.userChannelRead(biggestRisk)} / ${deps.opponentRiskRead(biggestRisk)}`
        : deps.opponentRiskRead(biggestRisk),
    ));
  }
  const opponentThreat = opponentRows
    .filter((row) => deps.opponentMaxChannelXgDelta(row) >= 0.025 || row.avgOpponentXgDelta >= 0.025)
    .sort((a, b) => Math.max(b.avgOpponentXgDelta, deps.opponentMaxChannelXgDelta(b))
      - Math.max(a.avgOpponentXgDelta, deps.opponentMaxChannelXgDelta(a)))[0];
  if (opponentThreat) {
    cards.push(deps.cardFromRow(
      'Amenaza rival',
      opponentThreat,
      'decision-risk',
      deps.opponentRiskRead(opponentThreat),
    ));
  }
  return cards.slice(0, 7);
}

export function scenarioBatteryDecision(
  cards: ScenarioDecisionCard[],
  objective: ScenarioBatteryCoachObjective = 'NEUTRAL'
): { label: string; detail: string } {
  const card = (title: string) => cards.find((item) => item.title === title);
  const twoWay = card('Doble ganancia');
  const protect = card('Cuidar');
  const threat = card('Amenaza rival');
  const offensiveRisk = card('Riesgo ofensivo');
  const avoid = card('Evitar');
  if (objective === 'PROTECT_RESULT' && twoWay) {
    if (threat) {
      return {
        label: `Cerrar amenaza: ${threat.label} + ${twoWay.label}`,
        detail: `La amenaza rival sigue visible. Cierre: ${twoWay.metrics}. Amenaza: ${threat.metrics}. ${twoWay.detail}`,
      };
    }
    return {
      label: `Controlar: ${twoWay.label}`,
      detail: `${twoWay.label} da doble ganancia y encaja con cuidar resultado porque mejora el plan sin abrir xGA. ${twoWay.metrics}. ${twoWay.detail}`,
    };
  }
  if (twoWay) {
    if (threat) {
      return {
        label: `Aprovechar con cuidado: ${twoWay.label} vs ${threat.label}`,
        detail: `${twoWay.label} da doble ganancia. Amenaza: ${threat.metrics}. ${twoWay.metrics}. ${twoWay.detail}`,
      };
    }
    return {
      label: `Aprovechar: ${twoWay.label}`,
      detail: `${twoWay.label} da doble ganancia. ${twoWay.metrics}. ${twoWay.detail}`,
    };
  }
  if (objective === 'PROTECT_RESULT') {
    if (protect) {
      if (threat) {
        return {
          label: `Cerrar amenaza: ${threat.label} + ${protect.label}`,
          detail: `La amenaza rival pide cierre específico. Cierre: ${protect.metrics}. Amenaza: ${threat.metrics}. ${protect.detail}`,
        };
      }
      return {
        label: `Cerrar partido: ${protect.label}`,
        detail: `${protect.label} es la mejor protección para cuidar resultado. ${protect.metrics}. ${protect.detail}`,
      };
    }
    if (threat) {
      return {
        label: `Cerrar amenaza: ${threat.label}`,
        detail: `${threat.label} es la amenaza principal si estás cuidando el partido. ${threat.metrics}. ${threat.detail}`,
      };
    }
    if (offensiveRisk) {
      return {
        label: `No arriesgar: ${offensiveRisk.label}`,
        detail: `${offensiveRisk.label} puede mejorar ataque, pero no encaja con cuidar resultado porque abre espacios. ${offensiveRisk.metrics}. ${offensiveRisk.detail}`,
      };
    }
    if (avoid) {
      return {
        label: `No forzar: ${avoid.label}`,
        detail: `${avoid.label} abre riesgo y no conviene si estás protegiendo resultado. ${avoid.metrics}. ${avoid.detail}`,
      };
    }
  }
  const attack = card('Atacar');
  if (objective === 'NEED_GOAL' && offensiveRisk) {
    return {
      label: `Riesgo asumible: ${offensiveRisk.label}`,
      detail: `${offensiveRisk.label} mejora el ataque y puede valer la pena si necesitás gol. Ojo: abre espacios. ${offensiveRisk.metrics}. ${offensiveRisk.detail}`,
    };
  }
  if (objective === 'NEED_GOAL' && !attack && !offensiveRisk && !twoWay && avoid) {
    return {
      label: `Sin vía clara: ${avoid.label}`,
      detail: `Necesitás gol, pero la batería no encontró una vía ofensiva clara; ${avoid.label} aparece como acción a evitar, no como solución. ${avoid.metrics}. ${avoid.detail}`,
    };
  }
  if (attack) {
    if (threat) {
      return {
        label: `Atacar con cuidado: ${attack.label} vs ${threat.label}`,
        detail: `${attack.label} es la vía ofensiva, pero hay amenaza rival. Ataque: ${attack.metrics}. Amenaza: ${threat.metrics}. ${attack.detail}`,
      };
    }
    return {
      label: `Atacar: ${attack.label}`,
      detail: `${attack.label} es el mejor plan ofensivo visible. ${attack.metrics}. ${attack.detail}`,
    };
  }
  const shape = card('Forma');
  if (shape) {
    return {
      label: `Ajustar forma: ${shape.label}`,
      detail: `${shape.label} cambia la forma con impacto visible. ${shape.metrics}. ${shape.detail}`,
    };
  }
  if (protect) {
    return {
      label: `Proteger: ${protect.label}`,
      detail: `${protect.label} es la mejor protección detectada. ${protect.metrics}. ${protect.detail}`,
    };
  }
  if (threat) {
    return {
      label: `Vigilar: ${threat.label}`,
      detail: `${threat.label} es la amenaza principal del rival. ${threat.metrics}. ${threat.detail}`,
    };
  }
  if (offensiveRisk) {
    return {
      label: `Riesgo alto: ${offensiveRisk.label}`,
      detail: `${offensiveRisk.label} mejora el ataque pero abre espacios. Usarlo si necesitás gol o aceptás intercambio. ${offensiveRisk.metrics}. ${offensiveRisk.detail}`,
    };
  }
  if (avoid) {
    return {
      label: `No forzar: ${avoid.label}`,
      detail: `${avoid.label} abre riesgo y conviene evitarlo salvo necesidad. ${avoid.metrics}. ${avoid.detail}`,
    };
  }
  return {
    label: 'Mantener equipo',
    detail: 'No hay una señal suficientemente clara para recomendar un cambio de DT en esta batería.',
  };
}

export function scenarioBatteryDecisionReview(
  objective: ScenarioBatteryCoachObjective,
  decisionLabel: string,
  cards: ScenarioDecisionCard[],
  objectiveLabel: string
): { label: string; detail: string } {
  const has = (title: string) => cards.some((card) => card.title === title);
  const starts = (...prefixes: string[]) => prefixes.some((prefix) => decisionLabel.startsWith(prefix));
  if (objective === 'NEED_GOAL') {
    if (starts('Sin vía clara')) {
      return {
        label: 'OK: sin vía clara',
        detail: `El objetivo es buscar gol y la batería confirmó que no hay Atacar, Riesgo ofensivo ni Doble ganancia; "${decisionLabel}" queda como diagnóstico, no como falso positivo.`,
      };
    }
    if (starts('Cerrar partido', 'Cerrar amenaza', 'Proteger', 'No forzar', 'No arriesgar', 'Mantener equipo')) {
      return {
        label: 'Revisar: poco gol',
        detail: `El objetivo es buscar gol, pero la decisión fue "${decisionLabel}". Revisar si faltan escenarios ofensivos claros o si el motor penaliza demasiado el riesgo.`,
      };
    }
    if (!has('Atacar') && !has('Riesgo ofensivo') && !has('Doble ganancia')) {
      return {
        label: 'Revisar: sin vía',
        detail: 'El objetivo es buscar gol, pero la batería no encontró Atacar, Riesgo ofensivo ni Doble ganancia. Puede ser correcto si no hay buen cambio, pero conviene auditar.',
      };
    }
  }
  if (objective === 'PROTECT_RESULT') {
    if (starts('Atacar', 'Riesgo alto', 'Riesgo asumible', 'Aprovechar')) {
      return {
        label: 'Revisar: mucho riesgo',
        detail: `El objetivo es cuidar resultado, pero la decisión fue "${decisionLabel}". Revisar si el escenario abre demasiado xGA o si falta una alternativa defensiva mejor.`,
      };
    }
    if (!has('Cuidar') && !has('Amenaza rival') && !has('Evitar') && !has('Riesgo ofensivo')) {
      return {
        label: 'Revisar: sin cierre',
        detail: 'El objetivo es cuidar resultado, pero la batería no encontró Cuidar, Amenaza rival, Evitar ni una acción ofensiva para descartar. Puede faltar cobertura defensiva en los escenarios.',
      };
    }
  }
  if (objective === 'NEUTRAL' && starts('Riesgo alto')) {
    return {
      label: 'Revisar: riesgo neutral',
      detail: `El objetivo es neutral y la decisión fue "${decisionLabel}". Puede estar bien, pero conviene revisar si el beneficio ofensivo compensa el riesgo.`,
    };
  }
  if (starts('Atacar con cuidado', 'Aprovechar con cuidado')) {
    return {
      label: 'OK: ataque contextual',
      detail: `La decisión "${decisionLabel}" combina vía ofensiva con amenaza rival visible.`,
    };
  }
  return {
    label: 'OK',
    detail: `La decisión "${decisionLabel}" es consistente con el objetivo ${objectiveLabel} y las señales disponibles.`,
  };
}

export function scenarioBatteryCardSummary(row: ScenarioBatteryRow, title: string): string {
  const card = row.cards.find((item) => item.title === title);
  return card ? `${card.label} - ${card.metrics}` : '-';
}

export function scenarioBatteryCardDetail(row: ScenarioBatteryRow, title: string): string {
  const card = row.cards.find((item) => item.title === title);
  return card ? card.detail : 'Sin señal clara en esta batería.';
}

export function scenarioBatteryRiskCardSummary(row: ScenarioBatteryRow): string {
  const card = row.cards.find((item) => item.title === 'Riesgo ofensivo')
    ?? row.cards.find((item) => item.title === 'Evitar');
  return card ? `${card.label} - ${card.metrics}` : '-';
}

export function scenarioBatteryRiskCardDetail(row: ScenarioBatteryRow): string {
  const card = row.cards.find((item) => item.title === 'Riesgo ofensivo')
    ?? row.cards.find((item) => item.title === 'Evitar');
  return card ? card.detail : 'Sin riesgo claro en esta batería.';
}

export function scenarioBatteryExportRow(row: ScenarioBatteryRow): Record<string, unknown> {
  const summary = (title: string) => scenarioBatteryCardSummary(row, title);
  const detail = (title: string) => scenarioBatteryCardDetail(row, title);
  return {
    match: row.matchLabel,
    controlledTeam: row.controlledTeam,
    controlledSide: row.controlledSide,
    scenarioGroup: scenarioBatteryGroupLabel(row.scenarioGroup),
    coachObjective: scenarioBatteryCoachObjectiveLabel(row.coachObjective),
    coachContext: row.coachContext,
    coachContextDetail: row.coachContextDetail,
    review: row.review,
    reviewDetail: row.reviewDetail,
    seedStart: row.seedStart,
    seedCount: row.seedCount,
    scenarioCount: row.scenarioCount,
    decision: row.decision,
    decisionDetail: row.decisionDetail,
    plan: summary('Plan actual'),
    twoWay: summary('Doble ganancia'),
    attack: summary('Atacar'),
    shape: summary('Forma'),
    protect: summary('Cuidar'),
    avoid: scenarioBatteryRiskCardSummary(row),
    opponentThreat: summary('Amenaza rival'),
    planDetail: detail('Plan actual'),
    twoWayDetail: detail('Doble ganancia'),
    attackDetail: detail('Atacar'),
    shapeDetail: detail('Forma'),
    protectDetail: detail('Cuidar'),
    avoidDetail: scenarioBatteryRiskCardDetail(row),
    opponentThreatDetail: detail('Amenaza rival'),
  };
}

export function scenarioBatteryGroupLabel(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): string {
  switch (group) {
    case 'ALL':
      return 'Todo';
    case 'DEFENSE':
      return 'Defensa';
    case 'OPPONENT':
      return 'Rival';
    default:
      return 'Ataque';
  }
}

export function scenarioBatteryReviewCount(rows: ScenarioBatteryRow[]): number {
  return rows.filter((row) => row.review.startsWith('Revisar')).length;
}

export function scenarioBatteryReviewHint(rows: ScenarioBatteryRow[]): string {
  if (rows.length === 0) {
    return 'Revisión pendiente: corre Tablero batería.';
  }
  const reviewCount = scenarioBatteryReviewCount(rows);
  if (reviewCount === 0) {
    return `Revisión OK: ${rows.length}/${rows.length} lecturas coherentes.`;
  }
  const labels = Array.from(new Set(rows
    .filter((row) => row.review.startsWith('Revisar'))
    .map((row) => row.review)
  ));
  const sample = labels.slice(0, 2).join(' + ');
  const suffix = labels.length > 2 ? ` +${labels.length - 2}` : '';
  return `Revisión: ${reviewCount}/${rows.length} para mirar (${sample}${suffix}).`;
}

export function scenarioBatteryReviewItems(rows: ScenarioBatteryRow[]): ScenarioBatteryReviewItem[] {
  return rows
    .filter((row) => row.review.startsWith('Revisar'))
    .slice(0, 5)
    .map((row) => ({
      key: `${row.matchId}-${row.controlledSide}-${row.review}`,
      summary: `${row.review}: ${row.controlledTeam} vs ${row.matchLabel}`,
      detail: `${row.coachContext} · ${row.decision} · ${row.reviewDetail}`,
    }));
}
