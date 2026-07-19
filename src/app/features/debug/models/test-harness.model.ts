/**
 * V24D24: Test-Harness UI models.
 *
 * The test-harness UI is a debug page at /debug/test-harness that lets
 * Iván play with formation / seed / injuries / fixtures and see the impact
 * on match results. All endpoints are profile-gated to dev/local/test on
 * the backend (see TestHarnessController).
 *
 * No mutation here — these are wire types only.
 */

import { MatchDetail } from '../../match-detail/models/match-detail.model';
import { ALL_FORMATIONS, FormationCode } from '../../../shared/constants/formations';

/**
 * V25D55-C16 P0.1: re-export the shared {@link FormationCode} type from
 * `shared/constants/formations.ts`. Source of truth moved out — every
 * front-end dropdown that exposes formations now shares the same array
 * AND the same derived union type, so adding a formation in the back-end
 * is a one-line change in the shared file.
 *
 * Deprecated: hand-written unions like `'4-3-3' | '4-4-2' | ...` will
 * silently miss any formation added after they were last updated.
 */
export type { FormationCode };

/**
 * Allowed formation codes for the test-harness UI select.
 * V25D55-C16 P0.1: now an alias of {@link ALL_FORMATIONS} (12 formations,
 * up from the 7 stale entries the file used to hardcode).
 */
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
  /**
   * V24D24.2 — deterministic UUID for this (careerId, round) pair, hydrated
   * by the backend. All matches in the same round share the same roundId.
   * The "Simulate round N" button POSTs this roundId to
   * `/api/v1/match-engine/rounds/start`.
   */
  roundId?: string | null;
}

/**
 * V24D24.2 — wire type for the body of
 * {@code POST /api/v1/test-harness/career/match/{matchId}/replay}.
 *
 * <p>{@code seed} is the random seed for the V24 engine replay. Pass an
 * explicit number for a reproducible replay (same match + same seed = same
 * result byte-exact). Pass {@code null} (or omit the body) for a non-
 * reproducible replay that uses {@code System.currentTimeMillis()} as the
 * seed.
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
 * V24D24.2 — wire type for the body of
 * {@code POST /api/v1/match-engine/rounds/start} (the simulate-round endpoint).
 *
 * <p>The backend derives {@code userId} from the JWT (auth) — it is NOT sent
 * here. The caller picks a {@code roundId} from the roundId-hydrated fixtures
 * and includes all matches of that round (the backend starts one MatchEngine
 * per match).
 */
export interface SimulateRoundRequest {
  roundId: string;
  matches: Array<{
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
  }>;
}

/**
 * V24D24.2 — match fixture as returned by
 * {@code POST /api/v1/test-harness/career/match/{matchId}/replay}.
 *
 * <p>Mirrors the backend {@code com.footballmanager.domain.model.valueobject.MatchFixture}
 * shape (only the fields the UI cares about).
 */
export interface MatchFixture {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  status: 'PENDING' | 'SIMULATING' | 'COMPLETED' | 'CANCELLED' | string;
  result?: MatchResultData | null;
}

/** Subset of {@code MatchFixture.MatchResultData} that the UI reads. */
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

/**
 * V24D24.2 — response shape for {@code POST /match-engine/rounds/start}.
 *
 * <p>The backend returns a snapshot of all matches that were just started.
 * The UI doesn't currently consume the full shape — it only needs to know
 * the round started — so we model just enough fields to type the observable.
 */
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
