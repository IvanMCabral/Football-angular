/**
 * Wire types for the debug test harness.
 *
 * The harness lets us replay matches with different formations, seeds,
 * injuries, fixtures and tactical changes to inspect engine behavior.
 */

import { MatchDetail } from '../../match-detail/models/match-detail.model';
import { ALL_FORMATIONS, FormationCode } from '../../../shared/constants/formations';
import { LineupDTO } from '../../../shared/models/lineup/lineup.dto';

// Re-export the shared formation type so every dropdown uses the same source of truth.
export type { FormationCode };

/** Allowed formation codes for the test-harness UI select. */
export const FORMATION_CODES: readonly FormationCode[] = ALL_FORMATIONS;

/** Body for POST /api/v1/test-harness/career/set-formation. */
export interface SetFormationRequest {
  formation: string;
}

export type TeamStyle =
  | 'BALANCED'
  | 'ATTACKING'
  | 'DEFENSIVE'
  | 'COUNTER'
  | 'POSSESSION'
  | 'WIDE_PLAY'
  | 'LEFT_FLANK'
  | 'RIGHT_FLANK'
  | 'CENTRAL_PLAY';

/** Body for POST /api/v1/test-harness/career/set-style. */
export interface SetStyleRequest {
  style: TeamStyle;
}

/** Body item for POST /api/v1/test-harness/career/replace-fixtures. */
export interface CustomFixture {
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  matchId?: string | null;
}

/** Response shape for /create-custom, /reset-injuries, /set-formation. */
export interface TestHarnessMutationResponse {
  success: boolean;
  message: string;
  // Present on /create-custom
  careerId?: string;
  userSessionTeamId?: string;
  totalRounds?: number;
  currentRound?: number;
  teamsPerDivision?: number;
  // Present on /set-formation
  formation?: string;
  // Present on /set-style
  style?: TeamStyle;
  // Present on /replace-fixtures
  fixtureCount?: number;
  maxRound?: number;
}

export interface LabMutationResult {
  labKey: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Match summary row used by the test-harness Panel C match list.
 * Derived from CareerService.getAllFixturesWithBye() — each round has
 * multiple matches; we flatten into a list of (round, home, away, status)
 * for the test-harness UI.
 */
export interface TestHarnessMatchRow {
  matchId: string;
  round: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeStrength?: TeamStrengthInfo | null;
  awayStrength?: TeamStrengthInfo | null;
  homeFormation: string | null;
  awayFormation: string | null;
  /** Deterministic backend round id shared by every match in the same round. */
  roundId?: string | null;
}

export interface RoundGroup {
  round: number;
  byeTeam: string | null;
  matches: TestHarnessMatchRow[];
}

export interface TestHarnessSnapshotFixture {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  roundId?: string | null;
}

export interface TestHarnessSnapshotResponse {
  fixtures?: TestHarnessSnapshotFixture[] | null;
  squadHealthSummary?: TestHarnessSquadHealthSummary | null;
}

export interface TestHarnessSquadHealthSummary {
  squadSize?: number | null;
  injuredCount?: number | null;
  suspendedCount?: number | null;
  yellowCardsCount?: number | null;
  redCardsCount?: number | null;
}

export interface FocusedWideBatteryRow {
  formation: string;
  style: TeamStyle;
  styleLabel: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgWideShotsFor: number;
  avgCentralShotsFor: number;
  wideShare: number;
  deltaXgFor: number;
  deltaWideShotsFor: number;
  deltaWideShare: number;
  read: string;
  className: string;
}

export interface FormationReplayResult {
  formation: FormationCode;
  homeGoals: number | null;
  awayGoals: number | null;
  homePossession: number | null;
  awayPossession: number | null;
  homeShots: number | null;
  awayShots: number | null;
  homeXg: number | null;
  awayXg: number | null;
  homeCentralShots: number;
  homeWideShots: number;
  homeLongShots: number;
  awayCentralShots: number;
  awayWideShots: number;
  awayLongShots: number;
}

export interface CurrentLineupReplayResult {
  label: string;
  formation: string | null;
  seed: number | null;
  style: TeamStyle;
  playerCount: number;
  starters: string[];
  score: string;
  possession: string;
  shots: string;
  xg: string;
  zones: string;
  timestamp: string;
}

export interface CurrentLineupMultiSeedSummary {
  label: string;
  formation: string | null;
  style: TeamStyle;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  playerCount: number;
  starters: string[];
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgGoalDiff: number;
  avgPossessionFor: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgShotDiff: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgCentralShotsFor: number;
  avgWideShotsFor: number;
  avgLongShotsFor: number;
  avgCentralShotsAgainst: number;
  avgWideShotsAgainst: number;
  avgLongShotsAgainst: number;
  timestamp: string;
}

export interface CurrentLineupReplaySample {
  lineup: LineupDTO;
  fixture: MatchFixture;
  detail: MatchDetail | null;
  seed: number;
}

export interface LowBlockLabRow {
  variant: 'high' | 'base' | 'low';
  label: string;
  secondLineY: number;
  formation: string | null;
  seedStart: number;
  seedCount: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgPossessionFor: number;
  avgWideShotsAgainst: number;
  avgCentralShotsAgainst: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaShotsAgainst: number;
  deltaPossessionFor: number;
  read: string;
  className: string;
}

export interface BackFiveTransitionLabRow {
  variant: 'low' | 'base' | 'high';
  label: string;
  wingbackY: number;
  formation: string | null;
  seedStart: number;
  seedCount: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgPossessionFor: number;
  avgWideShotsFor: number;
  avgWideShotsAgainst: number;
  avgCentralShotsAgainst: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaWideShotsFor: number;
  deltaWideShotsAgainst: number;
  read: string;
  className: string;
}

export interface ModalVsCanonicalSummary {
  label: string;
  formation: string | null;
  style: TeamStyle;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  customSlotCount: number;
  customMovableSlotCount: number;
  movedPlayers: string[];
  engineImpactLabel: string;
  engineImpactDetail: string;
  canonical: CurrentLineupMultiSeedSummary;
  modal: CurrentLineupMultiSeedSummary;
  deltaGoalsFor: number;
  deltaGoalsAgainst: number;
  deltaGoalDiff: number;
  deltaPossessionFor: number;
  deltaShotsFor: number;
  deltaShotsAgainst: number;
  deltaShotDiff: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaCentralShotsFor: number;
  deltaWideShotsFor: number;
  deltaLongShotsFor: number;
  deltaCentralShotsAgainst: number;
  deltaWideShotsAgainst: number;
  deltaLongShotsAgainst: number;
  coachRead: string;
  coachReadClass: string;
  timestamp: string;
}

export type PositionPixelSmokeScope = 'ALL' | 'DEF' | 'MID' | 'ATT';
export type PositionPixelReadLevel = 'stable' | 'visible' | 'strong' | 'check';
export type PositionPixelReadFilter =
  | 'all'
  | 'diagonal'
  | 'diagonal-mismatch'
  | 'diagonal-micro'
  | 'diagonal-review'
  | 'visual-mismatch'
  | 'visual-micro'
  | 'visual-review'
  | 'big-move'
  | 'line-break'
  | PositionPixelReadLevel;
export type PositionPixelSortMode = 'default' | 'read-desc' | 'impact-desc' | 'distance-desc';

export type ScenarioSummaryReadLevel = 'noise' | 'small' | 'visible' | 'strong' | 'review';
export type ScenarioSummaryReadFilter = 'all' | ScenarioSummaryReadLevel | 'actionable';
export type ScenarioSummarySortMode = 'default' | 'read-desc' | 'impact-desc' | 'xg-desc';

export type ControlledTeamSide = 'USER' | 'HOME' | 'AWAY';
export type ScenarioBatteryCoachObjective = 'NEUTRAL' | 'NEED_GOAL' | 'PROTECT_RESULT';
export type ScenarioBatteryCoachObjectiveModel = ScenarioBatteryCoachObjective | 'AUTO';
export type PositionPixelQaLine = 'ALL' | 'DEF' | 'MID' | 'ATT';

export interface PositionPixelMatchSmokeSummary {
  matchLabel: string;
  rows: number;
  stable: number;
  visible: number;
  strong: number;
  check: number;
  microReview: number;
  visibleRisk: number;
  visibleAttackLoss: number;
  bigBadTradeoff: number;
  avgSignal: number;
  worstSignal: number;
  worstMove: string;
  worstTacticalRead: string;
  dominantCause: string;
  fivePxRiskRows: number;
  fivePxCostRows: number;
  bigMoveRows: number;
  bigMoveStrongRows: number;
  verdict: string;
  verdictClass: string;
}

export interface PositionPixelPlayerSmokeSummary {
  key: string;
  playerName: string;
  playerPosition: string;
  rows: number;
  fivePxRiskRows: number;
  fivePxCostRows: number;
  bigMoveStrongRows: number;
  bigMoveRows: number;
  avgSignal: number;
  worstSignal: number;
  worstMove: string;
  dominantCause: string;
  channelBreakdownTrend: string;
  verdict: string;
  verdictClass: string;
}

export interface RoleSlotImpactSmokeRow {
  slotId: string;
  player: string;
  bestRole: string;
  bestEff: number;
  worstRole: string;
  worstEff: number;
  gap: number;
  verdict: string;
  className: string;
}

export interface BackFiveFamilyLabRow {
  key: 'low-block' | 'transition' | 'wingback-control';
  label: string;
  formation: string;
  visualPlan: string;
  seedStart: number;
  seedCount: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgPossessionFor: number;
  avgWideShotsFor: number;
  avgWideShotsAgainst: number;
  avgCentralShotsFor: number;
  avgCentralShotsAgainst: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaWideShotsFor: number;
  deltaWideShotsAgainst: number;
  read: string;
  className: string;
}

export interface BackFiveContextSmokeRow {
  matchId: string;
  matchLabel: string;
  controlledSide: Exclude<ControlledTeamSide, 'USER'>;
  controlledTeamName: string;
  seedStart: number;
  seedCount: number;
  bestPlan: string;
  safestPlan: string;
  mostOffensivePlan: string;
  bestXgDiff: number;
  safestXga: number;
  mostOffensiveXg: number;
  lowBlockDiff: number | null;
  transitionDiff: number | null;
  wingbackDiff: number | null;
  read: string;
  className: string;
}

export interface BackFiveContextSmokeSummary {
  total: number;
  best541: number;
  best532: number;
  best352: number;
  safest541: number;
  safest532: number;
  safest352: number;
  offensive541: number;
  offensive532: number;
  offensive352: number;
  review: number;
  reviewDetails: string[];
  read: string;
  className: string;
}

export interface ProfessionalSmokeSummary {
  controlledTeam: string;
  scope: ControlledTeamSide;
  verdict?: 'OK' | 'Review' | 'Fail' | 'Partial';
  verdictDetail?: string;
  formationRows: number;
  scenarioRows: number;
  formationAuditRows?: number;
  formationAuditFallbackRows?: number;
  formationAuditReviewRows?: number;
  pixelRows: number;
  swapRows: number;
  substitutionRows?: number;
  formationSeedCount: number;
  scenarioSeedCount: number;
  included: string[];
  skipped: string[];
  read: string;
}

export interface AllFormationRoleSlotSmokeRow {
  formation: FormationCode;
  slots: number;
  clear: number;
  visible: number;
  review: number;
  minGap: number;
  avgGap: number;
  weakestSlot: string;
  verdict: string;
  className: string;
}

export interface PositionPixelSmokeRunSummary extends PositionPixelMatchSmokeSummary {
  scope: PositionPixelSmokeScope;
  label: string;
  matchCount: number;
  playerCount: number;
  runAt: string;
}

export interface PositionPixelQaSummaryRow {
  line: PositionPixelQaLine;
  total: number;
  microOk: number;
  visibleOk: number;
  strongCoherent: number;
  visualReview: number;
  contradiction: number;
  verdict: string;
  verdictClass: string;
}

export interface FormationCoachPick {
  label: string;
  formation: string;
  read: string;
  detail: string;
  identity: string;
  cssClass: string;
}

export interface FormationCoachSummary {
  bestBalance: FormationCoachPick;
  bestAttack: FormationCoachPick;
  safest: FormationCoachPick;
  avoid: FormationCoachPick;
}

export interface LineupDebugRow {
  index: number;
  playerId: string;
  name: string;
  position: string;
  slotId: string;
  x: number | null;
  y: number | null;
  visualLine: 'GK' | 'DEF' | 'MID' | 'ATT' | 'UNKNOWN';
  source: 'persisted' | 'canonical' | 'missing';
}

export interface LineupDebugSnapshot {
  label: string;
  formation: string;
  selectedFormation: string;
  playerCount: number;
  nonGkCount: number;
  persistedSlotCount: number;
  effectiveSlotCount: number;
  candidatesCount: number;
  visualLineFilter: string;
  rows: LineupDebugRow[];
  warnings: string[];
}

export interface FormationLineSmokeRow {
  formation: string;
  line: 'DEF' | 'MID' | 'ATT';
  candidates: number;
  expectedRows: number;
  players: string;
  slotRoles: string;
  verdict: string;
  warnings: string;
}

export interface ProfessionalQaChecklistRow {
  check: string;
  expected: string;
  observed: string;
  verdict: 'OK' | 'Fallback' | 'Review' | 'Pending';
  next: string;
}

export interface ProfessionalQaActionStatus {
  state: 'running' | 'done' | 'error';
  message: string;
}

export interface TeamStyleOption {
  value: TeamStyle;
  label: string;
  hint: string;
}

/**
 * Request body for replaying one match.
 *
 * A numeric seed makes the replay reproducible. Null asks the backend to use
 * a fresh seed.
 */
export interface ReplayMatchRequest {
  seed: number | null;
  controlledTeamSide?: 'USER' | 'HOME' | 'AWAY';
}

export interface TeamStrengthInfo {
  squadOvr?: number | null;
  startingOvr?: number | null;
  avgEnergy?: number | null;
  avgForm?: number | null;
  avgStamina?: number | null;
  squadSize?: number | null;
  starterCount?: number | null;
}

export interface FormationMatrixRow {
  formation: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  awayPossession: number;
  homeCentralShots: number;
  homeWideShots: number;
  homeLongShots: number;
  awayCentralShots: number;
  awayWideShots: number;
  awayLongShots: number;
  shapePossessionMultiplier: number;
  shapeAttackVolumeMultiplier: number;
  shapeDefensiveResistanceMultiplier: number;
  shapeAttackLeft: number;
  shapeAttackCenter: number;
  shapeAttackRight: number;
  shapeDefenseLeft: number;
  shapeDefenseCenter: number;
  shapeDefenseRight: number;
}

export interface FormationMatrixSummaryRow {
  formation: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgGoalDiff: number;
  avgPossessionFor: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgShotDiff: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgCentralShotsFor: number;
  avgWideShotsFor: number;
  avgLongShotsFor: number;
  avgCentralShotsAgainst: number;
  avgWideShotsAgainst: number;
  avgLongShotsAgainst: number;
  avgLeftWideShotsFor?: number;
  avgRightWideShotsFor?: number;
  avgLeftWideShotsAgainst?: number;
  avgRightWideShotsAgainst?: number;
  avgLeftWideXgFor?: number;
  avgRightWideXgFor?: number;
  avgLeftWideXgAgainst?: number;
  avgRightWideXgAgainst?: number;
  avgShapePossessionMultiplier: number;
  avgShapeAttackVolumeMultiplier: number;
  avgShapeDefensiveResistanceMultiplier: number;
  avgShapeAttackLeft: number;
  avgShapeAttackCenter: number;
  avgShapeAttackRight: number;
  avgShapeDefenseLeft: number;
  avgShapeDefenseCenter: number;
  avgShapeDefenseRight: number;
}

export interface SideMirrorSyntheticLabRow {
  formation: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  weakLeftWideXgL: number;
  weakLeftWideXgR: number;
  weakRightWideXgL: number;
  weakRightWideXgR: number;
  weakLeftWideShotsL: number;
  weakLeftWideShotsR: number;
  weakRightWideShotsL: number;
  weakRightWideShotsR: number;
  weakLeftRightEdge: number;
  weakRightLeftEdge: number;
  mirrorGap: number;
  verdict: 'OK' | 'Parcial' | 'Revisar';
  read: string;
}

export interface LineupDiagnostic {
  matchId: string;
  seed: number;
  home: LineupDiagnosticTeam;
  away: LineupDiagnosticTeam;
}

export interface LineupDiagnosticTeam {
  teamId: string;
  teamName: string;
  formation: string;
  style: TeamStyle;
  avgOverall: number;
  avgCollective: number;
  avgEffectiveness: number;
  starters: number;
  width?: LineupWidthDiagnostic | null;
  players: LineupDiagnosticPlayer[];
}

export interface LineupWidthDiagnostic {
  leftCount: number;
  centerCount: number;
  rightCount: number;
  wideCount: number;
  leftAvgX: number;
  rightAvgX: number;
  widthScore: number;
  sideBalance: number;
  verdict: string;
  read: string;
}

export interface LineupDiagnosticPlayer {
  playerId: string;
  name: string;
  naturalPosition: string;
  tacticalPosition: string;
  slotRole?: string | null;
  slotSide?: string | null;
  slotId: string | null;
  xPercent: number | null;
  yPercent: number | null;
  positionSource?: string | null;
  curatedRoles?: string | null;
  preferredSides?: string | null;
  roleBonus?: number | null;
  sideBonus?: number | null;
  assignmentScore?: number | null;
  assignmentVerdict?: string | null;
  assignmentRead?: string | null;
  attack: number;
  defense: number;
  technique: number;
  speed: number;
  stamina: number;
  mentality: number;
  overall: number;
  effectiveness: number;
  collective: number;
}

export interface MatchPreviewSummary {
  matchId: string;
  controlledTeamSide: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  teamName: string;
  formation: string | null;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgGoalDiff: number;
  avgPossessionFor: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgShotDiff: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgCentralShotsFor: number;
  avgWideShotsFor: number;
  avgLongShotsFor: number;
  avgCentralShotsAgainst: number;
  avgWideShotsAgainst: number;
  avgLongShotsAgainst: number;
}

/**
 * Request body for starting all matches in a round.
 *
 * The backend derives the user from auth; the UI sends the round id and match
 * pairs to simulate.
 */
export interface SimulateRoundRequest {
  roundId: string;
  matches: Array<{
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
  }>;
}

/** Match fixture fields consumed by the harness after replay. */
export interface MatchFixture {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | 'CANCELLED' | string;
  result?: MatchResultData | null;
}

/** Match result fields consumed by the harness. */
export interface MatchResultData {
  homeGoals: number;
  awayGoals: number;
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
}

export interface ScenarioMatrixRow {
  scenario: string;
  description: string;
  formation: string;
  initialStyle: TeamStyle;
  changeMinute: number | null;
  changedStyle: TeamStyle | null;
  actionType: 'NONE' | 'STYLE' | 'FORMATION' | 'SUBSTITUTION' | string;
  actionDetail: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  awayPossession: number;
  homeCentralShots: number;
  homeWideShots: number;
  homeLongShots: number;
  awayCentralShots: number;
  awayWideShots: number;
  awayLongShots: number;
  homeCentralXg: number;
  homeWideXg: number;
  homeLongXg: number;
  homeLeftWideShots: number;
  homeRightWideShots: number;
  homeLeftWideXg: number;
  homeRightWideXg: number;
  awayCentralXg: number;
  awayWideXg: number;
  awayLongXg: number;
  awayLeftWideShots: number;
  awayRightWideShots: number;
  awayLeftWideXg: number;
  awayRightWideXg: number;
  tacticalChanges: number;
  substitutions: number;
}

export interface ScenarioMatrixSummaryRequest {
  seedStart: number;
  seedCount: number;
  scenarioGroup?: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT';
  controlledTeamSide?: 'USER' | 'HOME' | 'AWAY';
}

export interface PlayerSwapMatrixSummaryRequest {
  starterPlayerId: string;
  benchPlayerId: string;
  slotId?: string | null;
  seedStart: number;
  seedCount: number;
  controlledTeamSide?: 'USER' | 'HOME' | 'AWAY';
}

export interface SubstitutionWhatIfRequest {
  playerOffId: string;
  playerOnId: string;
  minute?: number | null;
  seedStart: number;
  seedCount: number;
  controlledTeamSide?: 'USER' | 'HOME' | 'AWAY';
}

export interface PlayerSwapMatrixSummaryRow {
  matchId: string;
  formation: string;
  slotId: string | null;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  baselinePlayerId: string;
  baselinePlayerName: string;
  baselinePlayerPosition: string;
  baselinePlayerOverall: number | null;
  swapPlayerId: string;
  swapPlayerName: string;
  swapPlayerPosition: string;
  swapPlayerOverall: number | null;
  baselineAvgGoalsFor: number;
  baselineAvgGoalsAgainst: number;
  baselineAvgGoalDiff: number;
  baselineAvgShotsFor: number;
  baselineAvgShotsAgainst: number;
  baselineAvgPossessionFor: number;
  baselineAvgXgFor: number;
  baselineAvgXgAgainst: number;
  baselineAvgXgDiff: number;
  baselineAvgCentralShotsFor: number;
  baselineAvgWideShotsFor: number;
  baselineAvgLongShotsFor: number;
  baselineAvgCentralShotsAgainst: number;
  baselineAvgWideShotsAgainst: number;
  baselineAvgLongShotsAgainst: number;
  baselineAvgCentralXgFor: number;
  baselineAvgWideXgFor: number;
  baselineAvgLongXgFor: number;
  baselineAvgCentralXgAgainst: number;
  baselineAvgWideXgAgainst: number;
  baselineAvgLongXgAgainst: number;
  swappedAvgGoalsFor: number;
  swappedAvgGoalsAgainst: number;
  swappedAvgGoalDiff: number;
  swappedAvgShotsFor: number;
  swappedAvgShotsAgainst: number;
  swappedAvgPossessionFor: number;
  swappedAvgXgFor: number;
  swappedAvgXgAgainst: number;
  swappedAvgXgDiff: number;
  swappedAvgCentralShotsFor: number;
  swappedAvgWideShotsFor: number;
  swappedAvgLongShotsFor: number;
  swappedAvgCentralShotsAgainst: number;
  swappedAvgWideShotsAgainst: number;
  swappedAvgLongShotsAgainst: number;
  swappedAvgCentralXgFor: number;
  swappedAvgWideXgFor: number;
  swappedAvgLongXgFor: number;
  swappedAvgCentralXgAgainst: number;
  swappedAvgWideXgAgainst: number;
  swappedAvgLongXgAgainst: number;
  deltaGoalsFor: number;
  deltaGoalsAgainst: number;
  deltaGoalDiff: number;
  deltaShotsFor: number;
  deltaShotsAgainst: number;
  deltaPossessionFor: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaCentralShotsFor: number;
  deltaWideShotsFor: number;
  deltaLongShotsFor: number;
  deltaCentralShotsAgainst: number;
  deltaWideShotsAgainst: number;
  deltaLongShotsAgainst: number;
  deltaCentralXgFor: number;
  deltaWideXgFor: number;
  deltaLongXgFor: number;
  deltaCentralXgAgainst: number;
  deltaWideXgAgainst: number;
  deltaLongXgAgainst: number;
  preAutoSubDeltaShotsFor?: number;
  preAutoSubDeltaShotsAgainst?: number;
  preAutoSubDeltaXgFor?: number;
  preAutoSubDeltaXgAgainst?: number;
  preAutoSubDeltaXgDiff?: number;
}

export interface SubstitutionWhatIfSummaryRow {
  matchId: string;
  formation: string;
  minute: number;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  playerOffId: string;
  playerOffName: string;
  playerOffPosition: string;
  playerOffOverall: number | null;
  playerOnId: string;
  playerOnName: string;
  playerOnPosition: string;
  playerOnOverall: number | null;
  baselineAvgGoalsFor: number;
  baselineAvgGoalsAgainst: number;
  baselineAvgGoalDiff: number;
  baselineAvgShotsFor: number;
  baselineAvgShotsAgainst: number;
  baselineAvgPossessionFor: number;
  baselineAvgXgFor: number;
  baselineAvgXgAgainst: number;
  baselineAvgXgDiff: number;
  substitutedAvgGoalsFor: number;
  substitutedAvgGoalsAgainst: number;
  substitutedAvgGoalDiff: number;
  substitutedAvgShotsFor: number;
  substitutedAvgShotsAgainst: number;
  substitutedAvgPossessionFor: number;
  substitutedAvgXgFor: number;
  substitutedAvgXgAgainst: number;
  substitutedAvgXgDiff: number;
  deltaGoalsFor: number;
  deltaGoalsAgainst: number;
  deltaGoalDiff: number;
  deltaShotsFor: number;
  deltaShotsAgainst: number;
  deltaPossessionFor: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaCentralShotsFor: number;
  deltaWideShotsFor: number;
  deltaLongShotsFor: number;
  deltaCentralXgFor: number;
  deltaWideXgFor: number;
  deltaLongXgFor: number;
  read: string;
}

export interface PlayerSwapMatrixSummary {
  testCase: string;
  slotId: string;
  formation: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  baselinePlayer: string;
  swapPlayer: string;
  baselinePlayerPosition: string;
  swapPlayerPosition: string;
  baselinePlayerOverall: number | null;
  swapPlayerOverall: number | null;
  deltaPlayerOverall: number | null;
  baseline: CurrentLineupMultiSeedSummary;
  swapped: CurrentLineupMultiSeedSummary;
  deltaGoalsFor: number;
  deltaGoalsAgainst: number;
  deltaGoalDiff: number;
  deltaShotsFor: number;
  deltaShotsAgainst: number;
  deltaPossessionFor: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaCentralShotsFor: number;
  deltaWideShotsFor: number;
  deltaLongShotsFor: number;
  deltaCentralShotsAgainst: number;
  deltaWideShotsAgainst: number;
  deltaLongShotsAgainst: number;
  preAutoSubDeltaShotsFor?: number;
  preAutoSubDeltaShotsAgainst?: number;
  preAutoSubDeltaXgFor?: number;
  preAutoSubDeltaXgAgainst?: number;
  preAutoSubDeltaXgDiff?: number;
  swapRead: string;
  swapReadDetail: string;
  swapReadClass: string;
  swapFit: string;
  swapFitDetail: string;
  swapFitClass: string;
  tacticalAttackRead: string;
  tacticalAttackClass: string;
  tacticalCentralControlRead: string;
  tacticalCentralControlClass: string;
  tacticalProtectionRead: string;
  tacticalProtectionClass: string;
  tacticalChannelsRead: string;
  tacticalChannelsClass: string;
  tacticalBreakdownDetail: string;
  signalScore: number;
  signalRead: string;
  signalClass: string;
  signalDetail: string;
  timestamp: string;
}

export interface PlayerSwapSlotOption {
  playerId: string;
  playerName: string;
  position: string;
  slotId: string;
  label: string;
}

export interface PlayerSwapBenchOption {
  playerId: string;
  playerName: string;
  position: string;
  score: number;
  label: string;
}

export interface PlayerSwapCandidate {
  starterId: string;
  starterName: string;
  starterPosition: string;
  benchId: string;
  benchName: string;
  benchPosition: string;
  slotId: string;
  testCase?: string;
}

export interface SubstitutionWhatIfSummary extends SubstitutionWhatIfSummaryRow {
  readClass: string;
}

export interface ModalRecommendationCandidateAttempt {
  candidate: PlayerSwapCandidate;
  row: SubstitutionWhatIfSummaryRow | null;
  safe: boolean;
  score: number;
  status: 'RUNNING' | 'SAFE' | 'REJECTED' | 'NO_SAMPLE';
}

export interface SubstitutionTimingMatrixRow extends SubstitutionWhatIfSummary {
  timingRead: string;
}

export interface PlayerSwapBatterySummary {
  total: number;
  mode: string;
  precision: string;
  confidence: string;
  best: PlayerSwapMatrixSummary | null;
  bestAttack: PlayerSwapMatrixSummary | null;
  bestProtect: PlayerSwapMatrixSummary | null;
  worst: PlayerSwapMatrixSummary | null;
  reads: Record<string, number>;
  fits: Record<string, number>;
}

export interface PlayerSwapPrecisionComparisonRow {
  candidateKey: string;
  starter: string;
  bench: string;
  slotId: string;
  fit: string;
  quick: PlayerSwapMatrixSummary;
  balanced: PlayerSwapMatrixSummary;
  stability: string;
  stabilityClass: string;
}

export interface PositionPixelMatrixSummaryRequest {
  playerId: string;
  targetXPercent: number;
  targetYPercent: number;
  deltaXPercent?: number;
  deltaYPercent?: number;
  seedStart: number;
  seedCount: number;
  controlledTeamSide?: 'USER' | 'HOME' | 'AWAY';
}

export interface RoleSlotImpactRequest {
  slotId: string;
  naturalPositions: string[];
  seedStart: number;
  seedCount: number;
  controlledTeamSide?: 'USER' | 'HOME' | 'AWAY';
}

export interface RoleSlotImpactSummaryRow {
  matchId: string;
  formation: string;
  slotId: string;
  slotXPercent: number;
  slotYPercent: number;
  baselinePlayerId: string;
  baselinePlayerName: string;
  baselineNaturalPosition: string;
  testedNaturalPosition: string;
  tacticalPosition: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  playerEffectiveness: number;
  playerCollective: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgGoalDiff: number;
  avgShotsFor: number;
  avgShotsAgainst: number;
  avgPossessionFor: number;
  avgXgFor: number;
  avgXgAgainst: number;
  avgXgDiff: number;
  avgCentralShotsFor: number;
  avgWideShotsFor: number;
  avgLongShotsFor: number;
  avgCentralXgFor: number;
  avgWideXgFor: number;
  avgLongXgFor: number;
}

export interface PositionPixelMatrixSummaryRow {
  matchId: string;
  formation: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  slotId: string;
  fromXPercent: number;
  fromYPercent: number;
  targetXPercent: number;
  targetYPercent: number;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  baselineAvgShotsFor: number;
  baselineAvgPossessionFor: number;
  baselineAvgXgFor: number;
  baselineAvgXgAgainst: number;
  movedAvgShotsFor: number;
  movedAvgPossessionFor: number;
  movedAvgXgFor: number;
  movedAvgXgAgainst: number;
  deltaGoalsFor: number;
  deltaGoalsAgainst: number;
  deltaGoalDiff: number;
  deltaShotsFor: number;
  deltaShotsAgainst: number;
  deltaPossessionFor: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaCentralShotsFor: number;
  deltaWideShotsFor: number;
  deltaLongShotsFor: number;
  deltaCentralShotsAgainst: number;
  deltaWideShotsAgainst: number;
  deltaLongShotsAgainst: number;
  deltaCentralXgFor: number;
  deltaWideXgFor: number;
  deltaLongXgFor: number;
  deltaLeftWideShotsFor: number;
  deltaRightWideShotsFor: number;
  deltaLeftWideXgFor: number;
  deltaRightWideXgFor: number;
  deltaCentralXgAgainst: number;
  deltaWideXgAgainst: number;
  deltaLongXgAgainst: number;
  deltaLeftWideShotsAgainst: number;
  deltaRightWideShotsAgainst: number;
  deltaLeftWideXgAgainst: number;
  deltaRightWideXgAgainst: number;
  baselineTacticalPosition?: string;
  movedTacticalPosition?: string;
  baselinePlayerEffectiveness?: number;
  movedPlayerEffectiveness?: number;
  deltaPlayerEffectiveness?: number;
  baselinePlayerCollective?: number;
  movedPlayerCollective?: number;
  deltaPlayerCollective?: number;
  baselineAvgCentralShotsAgainst: number;
  baselineAvgWideShotsAgainst: number;
  baselineAvgLongShotsAgainst: number;
  movedAvgCentralShotsAgainst: number;
  movedAvgWideShotsAgainst: number;
  movedAvgLongShotsAgainst: number;
}

export interface PositionPixelMatrixSummary {
  label: string;
  playerName: string;
  playerPosition: string;
  slotId: string;
  fromXPercent: number;
  fromYPercent: number;
  targetXPercent: number;
  targetYPercent: number;
  seedStart: number;
  seedEnd: number;
  deltaShotsFor: number;
  deltaShotsAgainst: number;
  deltaPossessionFor: number;
  deltaXgFor: number;
  deltaXgAgainst: number;
  deltaXgDiff: number;
  deltaCentralShotsFor: number;
  deltaWideShotsFor: number;
  deltaLongShotsFor: number;
  deltaCentralShotsAgainst: number;
  deltaWideShotsAgainst: number;
  deltaLongShotsAgainst: number;
  deltaCentralXgFor: number;
  deltaWideXgFor: number;
  deltaLongXgFor: number;
  deltaLeftWideShotsFor: number;
  deltaRightWideShotsFor: number;
  deltaLeftWideXgFor: number;
  deltaRightWideXgFor: number;
  deltaCentralXgAgainst: number;
  deltaWideXgAgainst: number;
  deltaLongXgAgainst: number;
  deltaLeftWideShotsAgainst: number;
  deltaRightWideShotsAgainst: number;
  deltaLeftWideXgAgainst: number;
  deltaRightWideXgAgainst: number;
  baselineXgFor: number;
  baselineXgAgainst: number;
  baselineShotsFor: number;
  baselinePossessionFor: number;
  movedXgFor: number;
  movedXgAgainst: number;
  movedShotsFor: number;
  movedPossessionFor: number;
  baselineTacticalPosition: string;
  movedTacticalPosition: string;
  baselinePlayerEffectiveness: number;
  movedPlayerEffectiveness: number;
  deltaPlayerEffectiveness: number;
  baselinePlayerCollective: number;
  movedPlayerCollective: number;
  deltaPlayerCollective: number;
  signalScore: number;
  signalRead: string;
  signalClass: string;
  signalDetail: string;
  timestamp: string;
}

export interface PositionPixelDiagonalSummary {
  total: number;
  risk: number;
  defenseGain: number;
  visualMismatch: number;
  visualMicro: number;
  visualEngineReview: number;
  worstVisualMismatch: PositionPixelMatrixSummary | null;
  worstVisualReview: PositionPixelMatrixSummary | null;
  best: PositionPixelMatrixSummary | null;
  worst: PositionPixelMatrixSummary | null;
}

export interface PositionPixelLineBreakSummary {
  total: number;
  borderline: number;
  big: number;
  strong: number;
  badTradeoff: number;
  attackGain: number;
  best: PositionPixelMatrixSummary | null;
  worst: PositionPixelMatrixSummary | null;
}

export type PositionPixelExportRow = PositionPixelMatrixSummary & {
  read: string;
  tacticalRead: string;
  tacticalReadReason: string;
  channelBreakdownRead: string;
  channelBreakdownDetail: string;
  visualExpectationRead: string;
  visualExpectationDetail: string;
  visualEngineTensionRead: string;
  visualEngineTensionDetail: string;
  shapeMove: string;
  shapeMoveDetail: string;
  movementDistance: number;
  impactScore: number;
  signalScore: number;
  signalRead: string;
  signalDetail: string;
  attackGainScore: number;
  attackLossScore: number;
  defensiveRiskScore: number;
  defensiveGainScore: number;
};

export interface PositionPixelCandidate {
  starterId: string;
  starterName: string;
  starterPosition: string;
  slotId: string;
}

export interface LastModalPositionMoveCase {
  version: number;
  createdAt: string;
  source: 'squad-editor-modal';
  formation: string;
  playerId: string;
  playerName: string;
  playerPosition: string | null;
  playerRole: string | null;
  slotId: string | null;
  fromXPercent: number;
  fromYPercent: number;
  targetXPercent: number;
  targetYPercent: number;
  deltaXPercent: number;
  deltaYPercent: number;
  coachReadTitle: string | null;
  coachReadBody: string | null;
}

export interface ScenarioScoutingNote {
  title: string;
  body: string;
  className: string;
}

export interface SideMirrorSmokeRow {
  formation: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  weakLeftWideXgL: number;
  weakLeftWideXgR: number;
  weakRightWideXgL: number;
  weakRightWideXgR: number;
  weakLeftWideShotsL: number;
  weakLeftWideShotsR: number;
  weakRightWideShotsL: number;
  weakRightWideShotsR: number;
  weakLeftRightEdge: number;
  weakRightLeftEdge: number;
  verdict: 'OK' | 'Parcial' | 'Revisar';
  widthRead: string;
  widthClass: string;
  wingbackRead: string;
  wingbackClass: string;
  read: string;
}

export interface SideMirrorSmokeSummary {
  total: number;
  ok: number;
  partial: number;
  review: number;
  partialFormations: string;
  reviewFormations: string;
  avgWeakLeftExpectedEdge: number;
  avgWeakRightExpectedEdge: number;
  mirrorGap: number;
  read: string;
  nextAction: string;
  className: string;
}

export interface SideMirrorDecisionRow {
  formation: string;
  syntheticVerdict: SideMirrorSmokeRow['verdict'];
  realVerdict: SideMirrorSmokeRow['verdict'];
  syntheticEdges: string;
  realEdges: string;
  widthRead: string;
  widthClass: string;
  decision: string;
  className: string;
}

export interface SideMirrorDecisionSummary {
  total: number;
  engineHealthyRealBiased: number;
  engineReview: number;
  fullyHealthy: number;
  read: string;
  focus: string;
  className: string;
}

export interface FormationWidthRead {
  verdict: 'OK' | 'Parcial' | 'Estrecha' | 'Revisar lado' | 'Revisar ancho';
  className: string;
  read: string;
}

export interface FormationWingbackRead {
  verdict: 'OK' | 'Sin carrileros' | 'Revisar lado' | 'Revisar altura';
  className: string;
  read: string;
}

export interface WingbackLabRow {
  formation: string;
  wingbackRead: string;
  wingbackClass: string;
  verdict: SideMirrorSmokeRow['verdict'];
  expectedEdgeAvg: number;
  expectedEdgeMin: number;
  sideGap: number;
  attackRead: string;
  diagnosis: string;
  className: string;
}

export interface ScenarioDecisionCard {
  title: string;
  label: string;
  metrics: string;
  detail: string;
  className: string;
}

export interface ScenarioBatteryRow {
  matchId: string;
  matchLabel: string;
  controlledSide: Exclude<ControlledTeamSide, 'USER'>;
  controlledTeam: string;
  scenarioGroup: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT';
  coachObjective: ScenarioBatteryCoachObjective;
  coachContext: string;
  coachContextDetail: string;
  seedStart: number;
  seedCount: number;
  scenarioCount: number;
  decision: string;
  decisionDetail: string;
  review: string;
  reviewDetail: string;
  cards: ScenarioDecisionCard[];
}

export interface ScenarioBatteryReviewItem {
  key: string;
  summary: string;
  detail: string;
}

export interface ScenarioBatteryCoachAdvice {
  plan: string;
  risk: string;
  why: string;
  next: string;
}

export interface ScenarioMatrixSummaryRow {
  scenario: string;
  actionType: 'NONE' | 'STYLE' | 'FORMATION' | 'SUBSTITUTION' | string;
  actionDetail: string;
  seedCount: number;
  avgUserXgDelta: number;
  minUserXgDelta: number;
  maxUserXgDelta: number;
  avgOpponentXgDelta: number;
  avgUserShotsDelta: number;
  avgOpponentShotsDelta: number;
  avgUserPossessionDelta: number;
  avgUserCentralDelta: number;
  avgUserWideDelta: number;
  avgOpponentCentralDelta: number;
  avgOpponentWideDelta: number;
  avgUserCentralXgDelta: number;
  avgUserWideXgDelta: number;
  avgOpponentCentralXgDelta: number;
  avgOpponentWideXgDelta: number;
  avgUserLeftWideDelta: number;
  avgUserRightWideDelta: number;
  avgOpponentLeftWideDelta: number;
  avgOpponentRightWideDelta: number;
  avgUserLeftWideXgDelta: number;
  avgUserRightWideXgDelta: number;
  avgOpponentLeftWideXgDelta: number;
  avgOpponentRightWideXgDelta: number;
  baselineScenario: string;
  baselineFormation?: string | null;
  changedFormation?: string | null;
  sameFormationAsBaseline?: boolean;
}

/** Minimal response shape for a started round. */
export interface RoundStateResponse {
  roundId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | string;
  startedAt?: string;
  matchIds?: string[];
}

/**
 * Re-export of MatchDetail for consumers that import test-harness models
 * first. Keeps the test-harness public surface self-contained.
 */
export type { MatchDetail };
