import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray } from 'rxjs';
import { CareerService } from '../../../core/services/career.service';
import { Fixture } from '../../../core/services/career.model';
import { environment } from '../../../environments/environment';
import { MatchDetailApiService } from '../../match-detail/services/match-detail-api.service';
import { MatchDetail, MatchEvent, TimelineSnapshot } from '../../match-detail/models/match-detail.model';
import { V24MatchDetailPageComponent } from '../../match-detail/pages/v24-match-detail-page.component';
import { SquadEditorModalComponent } from '../../../components/squad-editor-modal/squad-editor-modal.component';
import { SessionPlayer } from '../../../shared/models/player.model';
import { LineupDTO } from '../../../shared/models/lineup/lineup.dto';
import { LineupSlotDTO } from '../../../shared/models/lineup/lineup-slot.dto';
import { FormationDTO } from '../../../shared/models/lineup/formation.dto';
import {
  FORMATION_CODES,
  CustomFixture,
  FormationCode,
  FormationMatrixRow,
  FormationMatrixSummaryRow,
  LabMutationResult,
  LineupDiagnostic,
  LineupDiagnosticPlayer,
  LineupDiagnosticTeam,
  MatchFixture,
  MatchPreviewSummary,
  PlayerSwapMatrixSummaryRow,
  PositionPixelMatrixSummaryRow,
  RoleSlotImpactSummaryRow,
  ScenarioMatrixRow,
  ScenarioMatrixSummaryRow,
  SideMirrorSyntheticLabRow,
  TestHarnessMatchRow,
  TeamStyle,
} from '../models/test-harness.model';
import { TestHarnessService } from '../services/test-harness.service';
interface RoundGroup {
  round: number;
  byeTeam: string | null;
  matches: TestHarnessMatchRow[];
}
interface TestHarnessSnapshotFixture {
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
interface TestHarnessSnapshotResponse {
  fixtures?: TestHarnessSnapshotFixture[] | null;
}
interface FormationReplayResult {
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
interface CurrentLineupReplayResult {
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
interface CurrentLineupMultiSeedSummary {
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
interface LowBlockLabRow {
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
interface BackFiveTransitionLabRow {
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
interface ModalVsCanonicalSummary {
  label: string;
  formation: string | null;
  style: TeamStyle;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  customSlotCount: number;
  customMovableSlotCount: number;
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
interface FormationCoachPick {
  label: string;
  formation: string;
  read: string;
  detail: string;
  identity: string;
  cssClass: string;
}
interface FormationCoachSummary {
  bestBalance: FormationCoachPick;
  bestAttack: FormationCoachPick;
  safest: FormationCoachPick;
  avoid: FormationCoachPick;
}
interface CurrentLineupReplaySample {
  lineup: LineupDTO;
  fixture: MatchFixture;
  detail: MatchDetail | null;
  seed: number;
}
interface PlayerSwapMatrixSummary {
  testCase: string;
  slotId: string;
  formation: string;
  seedStart: number;
  seedEnd: number;
  seedCount: number;
  baselinePlayer: string;
  swapPlayer: string;
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
interface PlayerSwapSlotOption {
  playerId: string;
  playerName: string;
  position: string;
  slotId: string;
  label: string;
}
interface PlayerSwapBenchOption {
  playerId: string;
  playerName: string;
  position: string;
  score: number;
  label: string;
}
interface PlayerSwapCandidate {
  starterId: string;
  starterName: string;
  starterPosition: string;
  benchId: string;
  benchName: string;
  benchPosition: string;
  slotId: string;
  testCase?: string;
}
interface PlayerSwapBatterySummary {
  total: number;
  mode: string;
  precision: string;
  confidence: string;
  best: PlayerSwapMatrixSummary | null;
  worst: PlayerSwapMatrixSummary | null;
  reads: Record<string, number>;
  fits: Record<string, number>;
}
interface PlayerSwapPrecisionComparisonRow {
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
interface PositionPixelMatrixSummary {
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
interface PositionPixelMatchSmokeSummary {
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
interface PositionPixelPlayerSmokeSummary {
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
interface RoleSlotImpactSmokeRow {
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
interface BackFiveFamilyLabRow {
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
interface BackFiveContextSmokeRow {
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
interface BackFiveContextSmokeSummary {
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
interface ProfessionalSmokeSummary {
  controlledTeam: string;
  scope: ControlledTeamSide;
  formationRows: number;
  scenarioRows: number;
  pixelRows: number;
  swapRows: number;
  formationSeedCount: number;
  scenarioSeedCount: number;
  included: string[];
  skipped: string[];
  read: string;
}
interface AllFormationRoleSlotSmokeRow {
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
type PositionPixelSmokeScope = 'ALL' | 'DEF' | 'MID' | 'ATT';
interface PositionPixelSmokeRunSummary extends PositionPixelMatchSmokeSummary {
  scope: PositionPixelSmokeScope;
  label: string;
  matchCount: number;
  playerCount: number;
  runAt: string;
}
interface PositionPixelDiagonalSummary {
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
interface PositionPixelLineBreakSummary {
  total: number;
  borderline: number;
  big: number;
  strong: number;
  badTradeoff: number;
  attackGain: number;
  best: PositionPixelMatrixSummary | null;
  worst: PositionPixelMatrixSummary | null;
}
type PositionPixelReadLevel = 'stable' | 'visible' | 'strong' | 'check';
type PositionPixelReadFilter =
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
type PositionPixelSortMode = 'default' | 'read-desc' | 'impact-desc' | 'distance-desc';
type ScenarioSummaryReadLevel = 'noise' | 'small' | 'visible' | 'strong' | 'review';
type ScenarioSummaryReadFilter = 'all' | ScenarioSummaryReadLevel | 'actionable';
type ScenarioSummarySortMode = 'default' | 'read-desc' | 'impact-desc' | 'xg-desc';
type ControlledTeamSide = 'USER' | 'HOME' | 'AWAY';
type ScenarioBatteryCoachObjective = 'NEUTRAL' | 'NEED_GOAL' | 'PROTECT_RESULT';
type ScenarioBatteryCoachObjectiveModel = ScenarioBatteryCoachObjective | 'AUTO';
interface ScenarioScoutingNote {
  title: string;
  body: string;
  className: string;
}
interface SideMirrorSmokeRow {
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
interface SideMirrorSmokeSummary {
  total: number;
  ok: number;
  partial: number;
  review: number;
  avgWeakLeftExpectedEdge: number;
  avgWeakRightExpectedEdge: number;
  mirrorGap: number;
  read: string;
  className: string;
}
interface SideMirrorDecisionRow {
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
interface FormationWidthRead {
  verdict: 'OK' | 'Parcial' | 'Estrecha' | 'Revisar lado' | 'Revisar ancho';
  className: string;
  read: string;
}
interface FormationWingbackRead {
  verdict: 'OK' | 'Sin carrileros' | 'Revisar lado' | 'Revisar altura';
  className: string;
  read: string;
}
interface WingbackLabRow {
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
interface ScenarioDecisionCard {
  title: string;
  label: string;
  metrics: string;
  detail: string;
  className: string;
}
interface ScenarioBatteryRow {
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
interface ScenarioBatteryReviewItem {
  key: string;
  summary: string;
  detail: string;
}
type PositionPixelExportRow = PositionPixelMatrixSummary & {
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
interface PositionPixelCandidate {
  starterId: string;
  starterName: string;
  starterPosition: string;
  slotId: string;
}
interface LastModalPositionMoveCase {
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
interface LineupDebugRow {
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
interface LineupDebugSnapshot {
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
interface FormationLineSmokeRow {
  formation: string;
  line: 'DEF' | 'MID' | 'ATT';
  candidates: number;
  expectedRows: number;
  players: string;
  slotRoles: string;
  verdict: string;
  warnings: string;
}
interface ProfessionalQaChecklistRow {
  check: string;
  expected: string;
  observed: string;
  verdict: 'OK' | 'Fallback' | 'Review' | 'Pending';
  next: string;
}
interface ProfessionalQaActionStatus {
  state: 'running' | 'done' | 'error';
  message: string;
}
interface TeamStyleOption {
  value: TeamStyle;
  label: string;
  hint: string;
}
const TIMELINE_DEBOUNCE_MS = 150;
const TIMELINE_MAX_MINUTE = 90;
const TIMELINE_STEP = 5;
/**
 * V24D24.2: Default seed for the "Replay with seed" button. Same number as
 * the regression-test baseline so Iv?n can reproduce a known result with
 * one click. The user is free to override.
 */
const DEFAULT_REPLAY_SEED = 12345;
const CURRENT_LINEUP_MULTI_SEED_COUNT = 5;
const CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS = 15000;
/**
 * V24D24: Test-Harness UI page (4-panel layout).
 *
 * <p>Route: {@code /debug/test-harness}.
 *
 * <p>Layout (desktop, ?768px):
 * <pre>
 * +-----------------+-----------------+
 * |  Panel A        |  Panel B        |
 * |  V24 match      |  Formation      |
 * |  detail (reused)|  select + btns  |
 * +-----------------+-----------------+
 * |  Panel C (match list, full width)  |
 * +-----------------------------------+
 * |  Panel D (timeline scrubber, full) |
 * +-----------------------------------+
 * </pre>
 *
 * <p>Backend gating: this UI is a debug surface - the backend is
 * profile-gated ({@code dev | local | test}). The /detail and /timeline
 * endpoints return 404 in prod. REVISOR runs the smoke against the
 * dev profile.
 */
@Component({
  selector: 'app-test-harness-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    V24MatchDetailPageComponent,
  ],
  template: `
    <div class="test-harness-page">
      <header class="page-header">
        <h1 class="page-title">Test Harness</h1>
        <p class="page-subtitle">
          Debug surface - change formation, replay, and inspect match detail.
        </p>
        <a routerLink="/dashboard" class="link link-back" aria-label="Back to dashboard">
          &larr; Back to dashboard
        </a>
      </header>
      <!-- Empty state: no career active -->
      <div *ngIf="!loading() && !loadError() && !hasCareer()" class="state-container" role="status">
        <div class="state-icon info-icon" aria-hidden="true">i</div>
        <h2 class="state-title">No active career</h2>
        <p class="state-text">You need an active career to use the test harness.</p>
        <a routerLink="/career/setup" class="btn btn-primary">Set up a career</a>
      </div>
      <!-- Load error -->
      <div *ngIf="!loading() && loadError()" class="state-container" role="alert">
        <div class="state-icon error-icon" aria-hidden="true">!</div>
        <p class="error-text">{{ loadError() }}</p>
        <button (click)="reload()" class="btn btn-primary" aria-label="Retry loading">Retry</button>
      </div>
      <!-- Loading state -->
      <div *ngIf="loading()" class="state-container" role="status" aria-live="polite">
        <div class="state-spinner" aria-hidden="true"></div>
        <p class="loading-text">Loading test harness?</p>
      </div>
      <!-- Main grid -->
      <div *ngIf="!loading() && !loadError() && hasCareer()" class="test-harness-grid">
        <!-- Panel A: Reused V24 match detail (F2) -->
        <section class="panel panel-a" aria-labelledby="panel-a-heading">
          <h2 id="panel-a-heading" class="panel-title">Panel A - Match Detail</h2>
          <p class="panel-hint" *ngIf="!selectedMatchId()">
            Select a match in Panel C to view its V24 detail.
          </p>
          <app-v24-match-detail-page
            *ngIf="selectedMatchId() && detailPanelVisible()"
            [inputCareerId]="careerId()"
            [inputMatchId]="selectedMatchId()"
            [inputRefreshToken]="detailRefreshToken()"
          ></app-v24-match-detail-page>
        </section>
        <!-- Panel B: Mutation controls -->
        <section class="panel panel-b" aria-labelledby="panel-b-heading">
          <h2 id="panel-b-heading" class="panel-title">Panel B - Mutations</h2>
          <div
            class="selected-match-context"
            data-testid="selected-match-context"
            aria-live="polite"
          >
            <div class="context-chip">
              <span class="context-label">Partido</span>
              <strong>{{ selectedMatchLabel() }}</strong>
            </div>
            <div class="context-chip">
              <span class="context-label">Controlando</span>
              <strong>{{ controlledTeamContextLabel() }}</strong>
            </div>
            <div class="context-chip context-chip-wide">
              <span class="context-label">Lectura</span>
              <strong>{{ resultPerspectiveLabel() }}</strong>
            </div>
          </div>
          <div class="compare-workflow-card" data-testid="compare-workflow-card">
            <div class="compare-workflow-header">
              <span class="context-label">Flujo profesional</span>
              <strong>Modal DT â†’ Harness â†’ Motor â†’ Compare</strong>
            </div>
            <ol class="compare-workflow-steps">
              <li
                *ngFor="let step of compareWorkflowSteps()"
                [class.done]="step.state === 'done'"
                [class.active]="step.state === 'active'"
                [class.pending]="step.state === 'pending'"
              >
                <span class="workflow-step-status">{{ step.status }}</span>
                <span>
                  <strong>{{ step.title }}</strong>
                  <small>{{ step.body }}</small>
                </span>
              </li>
            </ol>
          </div>
          <div class="control-group">
            <mat-form-field appearance="outline" class="formation-field">
              <mat-label>Formation</mat-label>
              <mat-select
                [(ngModel)]="selectedFormationModel"
                (selectionChange)="onFormationChange($event.value)"
                aria-label="Select formation"
              >
                <mat-option *ngFor="let code of formationCodes" [value]="code">
                  {{ code }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <div class="button-stack">
              <button
                mat-raised-button
                color="primary"
                (click)="applyFormation()"
                [disabled]="mutationInFlight() || !selectedFormationModel"
                aria-label="Apply selected formation"
              >
                Set Formation
              </button>
              <button
                mat-stroked-button
                (click)="onResetInjuries()"
                [disabled]="mutationInFlight()"
                aria-label="Reset all injuries"
              >
                Reset Injuries
              </button>
              <button
                mat-stroked-button
                (click)="onReplaceFixtures()"
                [disabled]="mutationInFlight()"
                aria-label="Replace fixtures with a Barcelona rival"
              >
                Replace Fixtures
              </button>
              <button
                mat-stroked-button
                (click)="openSquadEditor()"
                [disabled]="mutationInFlight()"
                aria-label="Open visual squad editor"
              >
                Open squad editor
              </button>
            </div>
          </div>
          <!-- V24D24.2: replay-with-seed + simulate-round block.
               Kept in its own control-group separated by a subtle divider so
               the layout stays predictable when more controls land later. -->
          <div class="control-group control-group-replay">
            <div class="control-group-divider" aria-hidden="true"></div>
            <mat-form-field appearance="outline" class="seed-field">
              <mat-label>Seed</mat-label>
              <input
                matInput
                type="number"
                [(ngModel)]="seedInputModel"
                (ngModelChange)="onSeedChange($event)"
                placeholder="12345"
                aria-label="Replay seed (number, empty for non-reproducible)"
              />
            </mat-form-field>
            <mat-form-field appearance="outline" class="style-field">
              <mat-label>Focus</mat-label>
              <mat-select
                [(ngModel)]="selectedStyleModel"
                aria-label="Select tactical focus for replay"
              >
                <mat-option *ngFor="let option of teamStyleOptions" [value]="option.value">
                  {{ option.label }}
                </mat-option>
              </mat-select>
              <mat-hint>{{ selectedStyleHint() }}</mat-hint>
            </mat-form-field>
            <div class="swap-selector-row" aria-label="Player swap matrix selectors">
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Swap slot</mat-label>
                <mat-select
                  [(ngModel)]="selectedSwapStarterIdModel"
                  aria-label="Select starter slot for player swap matrix"
                >
                  <mat-option [value]="null">Auto attacker</mat-option>
                  <mat-option *ngFor="let option of playerSwapSlotOptions(); trackBy: trackBySwapSlotOption" [value]="option.playerId">
                    {{ option.label }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Swap player</mat-label>
                <mat-select
                  [(ngModel)]="selectedSwapBenchIdModel"
                  aria-label="Select bench player for player swap matrix"
                >
                  <mat-option [value]="null">Auto bench attacker</mat-option>
                  <mat-option *ngFor="let option of playerSwapBenchOptions(); trackBy: trackBySwapBenchOption" [value]="option.playerId">
                    {{ option.label }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-seed-count-field">
                <mat-label>Swap seeds</mat-label>
                <input
                  matInput
                  type="number"
                  min="1"
                  max="50"
                  [(ngModel)]="playerSwapSeedCountModel"
                  (ngModelChange)="onPlayerSwapSeedCountChange($event)"
                  aria-label="Number of seeds for player swap matrix"
                />
                <mat-hint>1-50 - Multi-seed usa min 20</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Battery precision</mat-label>
                <mat-select
                  [(ngModel)]="playerSwapBatteryPrecisionModel"
                  (ngModelChange)="onPlayerSwapBatteryPrecisionChange($event)"
                  aria-label="Select player swap battery precision"
                >
                  <mat-option value="quick">Quick</mat-option>
                  <mat-option value="balanced">Balanced</mat-option>
                  <mat-option value="reliable">Reliable</mat-option>
                </mat-select>
                <mat-hint>{{ playerSwapBatteryPrecisionHint() }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Battery mode</mat-label>
                <mat-select
                  [(ngModel)]="playerSwapBatteryModeModel"
                  aria-label="Select player swap battery mode"
                >
                  <mat-option value="natural">Natural only</mat-option>
                  <mat-option value="mixed">Include experiments</mat-option>
                  <mat-option value="stress">Stress test</mat-option>
                </mat-select>
                <mat-hint>{{ playerSwapBatteryModeHint() }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Controlar</mat-label>
                <mat-select
                  [(ngModel)]="controlledTeamSideModel"
                  (ngModelChange)="onControlledTeamSideChanged($event)"
                  aria-label="Select controlled team side for scenario smokes"
                >
                  <mat-option value="USER" [disabled]="selectedMatchId() !== null && !selectedMatchIncludesUserTeam()">
                    Mi equipo
                  </mat-option>
                  <mat-option value="HOME">Local</mat-option>
                  <mat-option value="AWAY">Visitante</mat-option>
                </mat-select>
                <mat-hint>{{ controlledTeamSideHint() }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Slot lab</mat-label>
                <mat-select
                  [(ngModel)]="roleSlotImpactSlotIdModel"
                  aria-label="Select tactical slot for role impact lab"
                >
                  <mat-option *ngFor="let option of roleSlotImpactAvailableSlotOptions()" [value]="option.slotId">
                    {{ option.label }}
                  </mat-option>
                </mat-select>
                <mat-hint>{{ roleSlotImpactSlotHint() }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Battery tablero</mat-label>
                <mat-select
                  [(ngModel)]="scenarioBatteryGroupModel"
                  aria-label="Select tactical battery group"
                >
                  <mat-option value="OFFENSE">Ataque</mat-option>
                  <mat-option value="DEFENSE">Defensa</mat-option>
                  <mat-option value="OPPONENT">Rival</mat-option>
                  <mat-option value="ALL">Todo</mat-option>
                </mat-select>
                <mat-hint>{{ scenarioBatteryGroupHint() }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Battery alcance</mat-label>
                <mat-select
                  [(ngModel)]="scenarioBatteryScopeModel"
                  aria-label="Select tactical battery scope"
                >
                  <mat-option value="quick">Rapida</mat-option>
                  <mat-option value="balanced">Media</mat-option>
                </mat-select>
                <mat-hint>{{ scenarioBatteryScopeHint() }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="swap-field">
                <mat-label>Objetivo DT</mat-label>
                <mat-select
                  [(ngModel)]="scenarioBatteryCoachObjectiveModel"
                  aria-label="Select tactical battery coach objective"
                >
                  <mat-option value="AUTO">Auto</mat-option>
                  <mat-option value="NEUTRAL">Neutral</mat-option>
                  <mat-option value="NEED_GOAL">Necesito gol</mat-option>
                  <mat-option value="PROTECT_RESULT">Cuidar resultado</mat-option>
                </mat-select>
                <mat-hint>{{ scenarioBatteryCoachObjectiveHint() }}</mat-hint>
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="round-field">
              <mat-label>Round</mat-label>
              <mat-select
                [(ngModel)]="selectedRoundModel"
                (selectionChange)="onRoundSelect($event.value)"
                aria-label="Select round to simulate"
              >
                <mat-option *ngFor="let r of rounds()" [value]="r.round">
                  Round {{ r.round }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <div class="button-stack">
              <button
                mat-raised-button
                color="primary"
                (click)="onReplayWithSeed()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Replay selected match with seed"
              >
                Replay with seed
              </button>
              <a
                mat-stroked-button
                color="primary"
                *ngIf="selectedMatchCompareRoute() as compareRoute"
                [routerLink]="compareRoute"
                aria-label="Open professional baseline vs live comparison for the selected match"
              >
                Open Match Compare
              </a>
              <button
                mat-stroked-button
                color="primary"
                *ngIf="!selectedMatchCompareRoute()"
                disabled
                aria-label="Select a match before opening Match Compare"
              >
                Open Match Compare
              </button>
              <button
                mat-raised-button
                color="accent"
                (click)="onReplayCurrentLineup()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Replay selected match with the current visual lineup and seed"
              >
                Replay current lineup
              </button>
              <button
                mat-stroked-button
                (click)="onRunCurrentLineupMultiSeed()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Replay current visual lineup across multiple seeds"
              >
                Current lineup multi-seed
              </button>
              <button
                mat-stroked-button
                (click)="onRunModalVsCanonicalMultiSeed()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Compare canonical lineup against modal custom pixels across multiple seeds"
              >
                Base vs modal pixels
              </button>
              <button
                mat-stroked-button
                data-testid="lineup-diagnostic-button"
                (click)="onRunLineupDiagnostic()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Inspect effective starting elevens used by the match engine"
              >
                XI efectivo
              </button>
              <button
                mat-stroked-button
                data-testid="player-swap-matrix-button"
                (click)="onRunAutoPlayerSwapMatrix()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Compare a starter attacker against a bench attacker across multiple seeds"
              >
                Player swap matrix
              </button>
              <button
                mat-stroked-button
                data-testid="player-swap-battery-button"
                (click)="onRunPlayerSwapBattery()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Compare several starter and bench player swaps across multiple seeds"
              >
                Player swap battery
              </button>
              <button
                mat-stroked-button
                data-testid="player-swap-full-smoke-button"
                (click)="onRunPlayerSwapFullSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Compare natural and stress player swap batteries together"
              >
                Player swap full smoke
              </button>
              <button
                mat-stroked-button
                (click)="onRunPlayerSwapPrecisionCompare()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Compare player swap battery reads between quick and balanced precision"
              >
                Compare precision
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="position-presets-matrix-button"
                (click)="onRunPositionPixelMatrix()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Compare multiple pixel movement presets for the selected starter across seeds"
              >
                Position presets matrix
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="role-slot-impact-button"
                (click)="onRunRoleSlotImpactSummary()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Compare natural roles in the same tactical slot across seeds"
              >
                Role slot impact
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="all-role-slots-smoke-button"
                (click)="onRunAllRoleSlotsSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run role impact smoke for every real slot in the current starting eleven"
              >
                All role slots smoke
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="all-formations-role-slot-smoke-button"
                (click)="onRunAllFormationsRoleSlotSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run role slot smoke across every formation"
              >
                All formations role-slot smoke
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="last-modal-move-position-smoke-button"
                (click)="onRunLastModalMovePositionSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Replay the last position move made in the formation modal across seeds"
              >
                Last modal move
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="wingback-pixel-lab-button"
                (click)="onRunWingbackPixelLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run a focused pixel lab for left and right wingbacks"
              >
                Wingback pixel lab
              </button>
              <button
                type="button"
                mat-stroked-button
                (click)="onRunPositionSensitivityCheck()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Run high-seed micro-movement sensitivity check for position pixels"
              >
                Sensitivity check
              </button>
              <button
                type="button"
                mat-stroked-button
                data-testid="manual-extremes-position-hunt-button"
                (click)="onRunManualExtremesPositionHunt()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Run aggressive but football-plausible manual position extremes to hunt visual engine contradictions"
              >
                Manual extremes hunt
              </button>
              <button
                mat-stroked-button
                (click)="onRunPositionCalibrationSweep()"
                [disabled]="mutationInFlight() || !userTeamName()"
                aria-label="Run position movement smoke across multiple completed user-team matches"
              >
                Multi-match position smoke
              </button>
              <button
                mat-stroked-button
                (click)="onRunMidfielderPositionSweep()"
                [disabled]="mutationInFlight() || !userTeamName()"
                aria-label="Run midfield-only position movement smoke across multiple completed user-team matches"
              >
                MID position smoke
              </button>
              <button
                mat-stroked-button
                (click)="onRunLinePositionSweep('DEF')"
                [disabled]="mutationInFlight() || !userTeamName()"
                aria-label="Run defensive-line position movement smoke across multiple completed user-team matches"
              >
                DEF position smoke
              </button>
              <button
                mat-stroked-button
                (click)="onRunLinePositionSweep('ATT')"
                [disabled]="mutationInFlight() || !userTeamName()"
                aria-label="Run attacking-line position movement smoke across multiple completed user-team matches"
              >
                ATT position smoke
              </button>
              <button
                mat-stroked-button
                (click)="onRunFullPositionSmokeBoard()"
                [disabled]="mutationInFlight() || !userTeamName()"
                aria-label="Run full position smoke comparison board across completed user-team matches"
              >
                Full position smoke board
              </button>
              <button
                mat-stroked-button
                (click)="onRunCurrentFormationLineAudit()"
                [disabled]="mutationInFlight() || !canRunUserLineupAudit()"
                [title]="userLineupAuditDisabledReason()"
                aria-label="Audit current formation DEF MID ATT candidates before running line smokes"
              >
                Formation line audit
              </button>
              <button
                mat-stroked-button
                (click)="onRunAllFormationsLineAudit()"
                [disabled]="mutationInFlight() || !canRunUserLineupAudit()"
                [title]="userLineupAuditDisabledReason()"
                aria-label="Audit every formation DEF MID ATT candidates before running expensive line smokes"
              >
                All formations line audit
              </button>
              <button
                mat-stroked-button
                (click)="onRunFormationMatrix()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                [title]="formationMatrixDisabledReason()"
                aria-label="Replay selected match with every formation and the same seed"
              >
                Formation matrix
              </button>
              <button
                mat-stroked-button
                data-testid="formation-avg-button"
                (click)="onRunFormationMatrixSummary()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                [title]="formationMatrixDisabledReason()"
                aria-label="Average every formation across multiple seeds"
              >
                Formation avg ({{ scenarioMatrixSummaryEffectiveSeedCount() }} seeds)
              </button>
              <button
                mat-flat-button
                color="primary"
                data-testid="professional-smoke-button"
                (click)="onRunProfessionalSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Run professional controlled smoke with formation averages and tactical scenario reads"
              >
                Run professional smoke
              </button>
              <button
                mat-stroked-button
                data-testid="professional-smoke-full-button"
                (click)="onRunProfessionalSmokeFull()"
                [disabled]="mutationInFlight() || controlledTeamSideModel !== 'USER' || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run full professional user-team smoke with formations scenarios pixels and swaps"
              >
                Run professional smoke full
              </button>
              <button
                mat-stroked-button
                data-testid="low-block-lab-button"
                (click)="onRunLowBlockLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Compare 5-4-1 low block high base and low second line across seeds"
              >
                5-4-1 low block lab
              </button>
              <button
                mat-stroked-button
                data-testid="back-five-transition-lab-button"
                (click)="onRunBackFiveTransitionLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Compare 5-3-2 wingbacks low base and high across seeds"
              >
                5-3-2 transition lab
              </button>
              <button
                mat-stroked-button
                data-testid="back-five-family-lab-button"
                (click)="onRunBackFiveFamilyLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Compare 5-4-1 5-3-2 and 3-5-2 back five tactical identities across seeds"
              >
                Línea de 5 family lab
              </button>
              <button
                mat-stroked-button
                data-testid="back-five-any-side-family-lab-button"
                (click)="onRunBackFiveAnySideFamilyLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Compare back five tactical family for the currently controlled home away or user side"
              >
                Línea de 5 any side
              </button>
              <button
                mat-stroked-button
                data-testid="back-five-context-smoke-button"
                (click)="onRunBackFiveContextSmoke()"
                [disabled]="mutationInFlight() || scenarioBatteryCandidateMatches().length === 0"
                aria-label="Run back five context smoke across completed matches and both sides"
              >
                Línea de 5 context smoke
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrix()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run controlled live tactical scenarios for the selected match and seed"
              >
                Scenario matrix
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrixSummary()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Run controlled live tactical scenarios across multiple seeds"
              >
                Multi-seed matrix ({{ scenarioMatrixSummaryEffectiveSeedCount() }} seeds)
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrixSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Run quick controlled live tactical scenario smoke across five seeds"
              >
                Scenario smoke (5 seeds)
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrixBlockSmoke('OFFENSE')"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Run quick offensive scenario smoke across five seeds"
              >
                Smoke ataque
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrixBlockSmoke('DEFENSE')"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Run quick defensive scenario smoke across five seeds"
              >
                Smoke defensa
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrixBlockSmoke('OPPONENT')"
                [disabled]="mutationInFlight() || !selectedMatchId() || !canRunScenarioSummaryForControlledSide()"
                aria-label="Run quick opponent channel exposure scenario smoke across five seeds"
              >
                Smoke rival
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioBatteryBoard()"
                [disabled]="mutationInFlight() || scenarioBatteryCandidateMatches().length === 0"
                aria-label="Run quick tactical battery board across several matches and both sides"
              >
                Battery tablero
              </button>
              <span *ngIf="scenarioBatteryProgress()" class="inline-progress" aria-live="polite">
                {{ scenarioBatteryProgress() }}
              </span>
              <span *ngIf="scenarioBatteryWorkload()" class="inline-progress">
                {{ scenarioBatteryWorkload() }}
              </span>
              <button
                mat-stroked-button
                (click)="onPrepareOffensiveUpgradeLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare controlled offensive substitution upgrade lab"
              >
                Prepare offensive lab
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreOffensiveUpgradeLab()"
                [disabled]="mutationInFlight()"
                aria-label="Restore controlled offensive substitution upgrade lab"
              >
                Restore lab
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareDefensiveDowngradeLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare controlled defensive substitution downgrade lab"
              >
                Prepare defensive lab
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreDefensiveDowngradeLab()"
                [disabled]="mutationInFlight()"
                aria-label="Restore controlled defensive substitution downgrade lab"
              >
                Restore defensive lab
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareWeakWideDefendersLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare weak wide defenders exposure lab"
              >
                Prepare weak wide DEF lab
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreWeakWideDefendersLab()"
                [disabled]="mutationInFlight()"
                aria-label="Restore weak wide defenders exposure lab"
              >
                Restore weak wide DEF lab
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareOpponentWeakWideDefendersLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Prepare selected opponent weak wide defenders lab"
              >
                Prepare rival weak wide DEF
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreOpponentWeakWideDefendersLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Restore selected opponent weak wide defenders lab"
              >
                Restore rival weak wide DEF
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareOpponentWeakLeftDefenderLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Prepare selected opponent weak left defender lab"
              >
                Prepare rival weak left DEF
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreOpponentWeakLeftDefenderLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Restore selected opponent weak left defender lab"
              >
                Restore rival weak left DEF
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareOpponentWeakRightDefenderLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Prepare selected opponent weak right defender lab"
              >
                Prepare rival weak right DEF
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreOpponentWeakRightDefenderLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Restore selected opponent weak right defender lab"
              >
                Restore rival weak right DEF
              </button>
              <button
                mat-stroked-button
                color="primary"
                (click)="onRunSideMirrorSmoke()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run side mirror smoke"
              >
                Side mirror smoke
              </button>
              <button
                mat-stroked-button
                color="primary"
                (click)="onRunSideMirrorSyntheticLab()"
                [disabled]="mutationInFlight()"
                aria-label="Run synthetic side mirror lab"
              >
                Synthetic mirror lab
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareOpponentWeakCenterBacksLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Prepare selected opponent weak center backs lab"
              >
                Prepare rival weak CB
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreOpponentWeakCenterBacksLab()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Restore selected opponent weak center backs lab"
              >
                Restore rival weak CB
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareWeakLeftDefenderLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare weak left defender channel lab"
              >
                Prepare weak left DEF
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreWeakLeftDefenderLab()"
                [disabled]="mutationInFlight()"
                aria-label="Restore weak left defender channel lab"
              >
                Restore weak left DEF
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareWeakRightDefenderLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare weak right defender channel lab"
              >
                Prepare weak right DEF
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreWeakRightDefenderLab()"
                [disabled]="mutationInFlight()"
                aria-label="Restore weak right defender channel lab"
              >
                Restore weak right DEF
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareWeakCenterBacksLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare weak center backs channel lab"
              >
                Prepare weak CB lab
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreWeakCenterBacksLab()"
                [disabled]="mutationInFlight()"
                aria-label="Restore weak center backs channel lab"
              >
                Restore weak CB lab
              </button>
              <button
                mat-stroked-button
                (click)="onPrepareDefensiveFallbackLineupLab()"
                [disabled]="mutationInFlight()"
                aria-label="Prepare defensive fallback lineup lab"
              >
                Prepare DEF fallback lab
              </button>
              <button
                mat-stroked-button
                (click)="onRestoreDefensiveFallbackLineupLab()"
                [disabled]="mutationInFlight() || !defensiveFallbackRestore"
                aria-label="Restore defensive fallback lineup lab"
              >
                Restore DEF fallback lab
              </button>
              <button
                mat-stroked-button
                (click)="onSimulateRound()"
                [disabled]="mutationInFlight() || selectedRoundModel === null"
                aria-label="Simulate selected round"
              >
                Simulate round {{ selectedRoundModel ?? '?' }}
              </button>
            </div>
            <p
              *ngIf="selectedMatchId() && !selectedMatchIncludesUserTeam()"
              class="harness-warning"
              role="status"
            >
              {{ selectedMatchScopeWarning() }}
            </p>
            <p
              *ngIf="analysisReadyMessage()"
              class="analysis-ready-banner"
              role="status"
              aria-live="polite"
            >
              {{ analysisReadyMessage() }}
              <button type="button" (click)="scrollToReplayAnalysis()">View Panel E</button>
            </p>
          </div>
        </section>
        <!-- Panel E: replay analysis matrices (full width) -->
        <section
          *ngIf="currentLineupReplayResult() || currentLineupMultiSeedSummary() || modalVsCanonicalSummary() || lineupDiagnostic() || playerSwapMatrixSummary() || playerSwapBatterySummaries().length > 0 || playerSwapPrecisionComparisonRows().length > 0 || roleSlotImpactRows().length > 0 || roleSlotImpactSmokeRows().length > 0 || allFormationRoleSlotSmokeRows().length > 0 || positionPixelEvidenceNote() || positionPixelMatrixSummary() || positionPixelMatrixRows().length > 0 || formationLineSmokeRows().length > 0 || lineupDebugSnapshot() || formationReplayResults().length > 0 || formationMatrixSummaryResults().length > 0 || professionalSmokeSummary() || lowBlockLabRows().length > 0 || backFiveTransitionLabRows().length > 0 || backFiveFamilyLabRows().length > 0 || backFiveContextSmokeRows().length > 0 || sideMirrorSmokeRows().length > 0 || scenarioMatrixResults().length > 0 || scenarioMatrixSummaryResults().length > 0 || scenarioBatteryRows().length > 0"
          id="test-harness-replay-analysis"
          class="panel panel-e"
          aria-labelledby="panel-e-heading"
        >
          <h2 id="panel-e-heading" class="panel-title">Panel E - Replay Analysis</h2>
          <p class="panel-hint">
            Compare the same match and seed across formations, live tactical changes and substitutions.
          </p>
          <div class="analysis-context-row">
            <span class="controlled-team-badge">Controlando: {{ controlledTeamDisplayName() }}</span>
            <span *ngIf="selectedMatch() as panelMatch" class="controlled-team-badge">
              Partido: {{ panelMatch.homeTeamName }} vs {{ panelMatch.awayTeamName }}
            </span>
          </div>
          <article *ngIf="professionalSmokeSummary() as smoke" class="position-read-summary professional-smoke-summary" data-testid="professional-smoke-summary">
            <strong>Professional smoke</strong>
            <span>{{ smoke.read }}</span>
            <small>
              Incluye: {{ smoke.included.join(' · ') }}
            </small>
            <small *ngIf="smoke.skipped.length > 0">
              Pendiente/omitido: {{ smoke.skipped.join(' · ') }}
            </small>
          </article>
          <div class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <div>
                <strong>Professional QA checklist</strong>
                <span>Expected vs observed read for modal â†’ lineup â†’ engine contracts</span>
              </div>
              <button
                type="button"
                class="qa-run-all-button"
                (click)="onRunProfessionalQaChecklist()"
                [disabled]="qaChecklistRunningAll() || mutationInFlight()"
              >
                {{ qaChecklistRunningAll() ? 'Checklist corriendo...' : 'Correr todo el checklist' }}
              </button>
            </div>
            <div class="qa-checklist-grid">
              <article
                *ngFor="let row of professionalQaChecklistRows(); trackBy: trackByProfessionalQaChecklistRow"
                class="qa-check-card"
                [attr.data-testid]="professionalQaChecklistTestId(row.check)"
              >
                <div class="qa-check-card-header">
                  <strong>{{ row.check }}</strong>
                  <span class="qa-verdict-badge" [class]="professionalQaVerdictClass(row.verdict)">
                    {{ row.verdict }}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Esperado</dt>
                    <dd>{{ row.expected }}</dd>
                  </div>
                  <div>
                    <dt>Observado</dt>
                    <dd>{{ row.observed }}</dd>
                  </div>
                  <div>
                    <dt>Siguiente</dt>
                    <dd>{{ row.next }}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  class="qa-action-button"
                  (click)="onRunProfessionalQaAction(row.check)"
                  [disabled]="!professionalQaActionEnabled(row.check)"
                >
                  {{ professionalQaActionLabel(row.check) }}
                </button>
                <span
                  *ngIf="professionalQaActionStatus(row.check) as status"
                  class="qa-action-status"
                  [class]="professionalQaActionStatusClass(status.state)"
                >
                  {{ status.message }}
                </span>
              </article>
            </div>
          </div>
          <div *ngIf="lineupDiagnostic() as diagnostic" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>XI efectivo del motor</strong>
              <span>Seed {{ diagnostic.seed }} · titulares, roles, eficacia y promedio colectivo usados para diagnosticar el partido</span>
            </div>
            <div class="diagnostic-team-grid">
              <div class="diagnostic-team-card" *ngFor="let team of lineupDiagnosticTeams(diagnostic); trackBy: trackByLineupDiagnosticTeam">
                <h3>{{ team.teamName }}</h3>
                <p>
                  {{ team.formation }} · {{ team.style }} · {{ team.starters }}/11
                  · OVR {{ team.avgOverall | number:'1.1-1' }}
                  · Colectivo {{ team.avgCollective | number:'1.1-1' }}
                  · Eff {{ team.avgEffectiveness | percent:'1.0-0' }}
                </p>
                <div *ngIf="team.width as width" class="width-diagnostic-card">
                  <div>
                    <span class="diagnostic-muted">Ancho tactico</span>
                    <strong [class]="lineupWidthVerdictClass(width.verdict)">{{ width.verdict }}</strong>
                  </div>
                  <div class="width-diagnostic-stats">
                    <span>Izq {{ width.leftCount }}</span>
                    <span>Centro {{ width.centerCount }}</span>
                    <span>Der {{ width.rightCount }}</span>
                    <span>Ancho {{ width.widthScore | number:'1.0-0' }}%</span>
                    <span>Balance {{ width.sideBalance | number:'1.0-0' }}%</span>
                  </div>
                  <p>{{ width.read }}</p>
                </div>
                <div class="table-scroll compact-position-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Jugador</th>
                        <th>Nat â†’ Slot</th>
                        <th>Rol/Lado</th>
                        <th>Perfil</th>
                        <th>Score</th>
                        <th>Lectura</th>
                        <th>Slot</th>
                        <th>XY</th>
                        <th>Fuente</th>
                        <th>OVR</th>
                        <th>ATT</th>
                        <th>DEF</th>
                        <th>MEN</th>
                        <th>Eff</th>
                        <th>Colectivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let p of team.players; trackBy: trackByLineupDiagnosticPlayer">
                        <td>{{ p.name }}</td>
                        <td>{{ p.naturalPosition }} â†’ {{ p.tacticalPosition }}</td>
                        <td>{{ p.slotRole || '?' }} / {{ p.slotSide || '?' }}</td>
                        <td>
                          <span class="diagnostic-muted">Rol:</span> {{ p.curatedRoles || '-' }}
                          <br>
                          <span class="diagnostic-muted">Lado:</span> {{ p.preferredSides || '-' }}
                        </td>
                        <td>
                          {{ p.assignmentScore ?? '-' }}
                          <br>
                          <span [class]="lineupAssignmentVerdictClass(p.assignmentVerdict)">
                            {{ p.assignmentVerdict || 'Aceptable' }}
                          </span>
                          <br>
                          <span class="diagnostic-muted">rol {{ p.roleBonus ?? 0 }} · lado {{ p.sideBonus ?? 0 }}</span>
                        </td>
                        <td class="diagnostic-read">{{ p.assignmentRead || '-' }}</td>
                        <td>{{ p.slotId || 'manual' }}</td>
                        <td>{{ lineupDiagnosticCoord(p) }}</td>
                        <td>
                          <span class="source-pill" [class.source-custom]="p.positionSource === 'modal-custom'">
                            {{ lineupDiagnosticSource(p) }}
                          </span>
                        </td>
                        <td>{{ p.overall }}</td>
                        <td>{{ p.attack }}</td>
                        <td>{{ p.defense }}</td>
                        <td>{{ p.mentality }}</td>
                        <td>{{ p.effectiveness | percent:'1.0-0' }}</td>
                        <td>{{ p.collective | number:'1.1-1' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="formationLineSmokeRows().length > 0" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Formation line audit</strong>
              <span>DEF/MID/ATT candidates for the current visual formation</span>
            </div>
            <div class="table-scroll compact-position-table">
              <table>
                <thead>
                  <tr>
                    <th>Formation</th>
                    <th>Line</th>
                    <th>Candidates</th>
                    <th>Expected rows</th>
                    <th>Players</th>
                    <th>Slot roles</th>
                    <th>Verdict</th>
                    <th>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of formationLineSmokeRows(); trackBy: trackByFormationLineSmokeRow">
                    <td>{{ row.formation }}</td>
                    <td>{{ row.line }}</td>
                    <td>{{ row.candidates }}</td>
                    <td>{{ row.expectedRows }}</td>
                    <td>{{ row.players }}</td>
                    <td>{{ row.slotRoles }}</td>
                    <td>{{ row.verdict }}</td>
                    <td>{{ row.warnings || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="currentLineupReplayResult() as replay" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Current lineup replay</strong>
              <span>
                {{ replay.label }} · formation {{ replay.formation || '?' }}
                · seed {{ replay.seed ?? 'auto' }} · {{ selectedStyleLabel() }}
              </span>
              <button type="button" class="matrix-export" (click)="copyCurrentLineupReplayJson()">
                Copy JSON
              </button>
            </div>
            <div class="current-replay-grid" role="group" aria-label="Current lineup replay summary">
              <div class="metric-card">
                <span class="metric-label">Score</span>
                <span class="metric-value">{{ replay.score }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Possession</span>
                <span class="metric-value">{{ replay.possession }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Shots</span>
                <span class="metric-value">{{ replay.shots }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">xG</span>
                <span class="metric-value">{{ replay.xg }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Zones C/W/L</span>
                <span class="metric-value">{{ replay.zones }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Starters</span>
                <span class="metric-value">{{ replay.playerCount }}/11</span>
              </div>
            </div>
            <p class="panel-hint current-replay-starters">
              {{ replay.starters.join(' · ') }}
            </p>
          </div>
          <div *ngIf="currentLineupMultiSeedSummary() as summary" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Current lineup multi-seed</strong>
              <span>
                {{ summary.label }} · formation {{ summary.formation || '?' }}
                · seeds {{ summary.seedStart }}..{{ summary.seedEnd }} · {{ selectedStyleLabel() }}
              </span>
              <button type="button" class="matrix-export" (click)="copyCurrentLineupMultiSeedJson()">
                Copy JSON
              </button>
            </div>
            <div
              class="qa-readable-strip"
              data-testid="current-lineup-multiseed-readout"
              aria-label="Current lineup multi-seed readable summary"
            >
              <span>{{ currentLineupMultiSeedReadable(summary) }}</span>
              <span [class]="deltaClass(summary.avgXgDiff)">xG {{ fmtDeltaNumber(summary.avgXgDiff) }}</span>
              <span [class]="deltaClass(summary.avgShotDiff)">Shots {{ fmtDeltaNumber(summary.avgShotDiff) }}</span>
              <span>{{ currentLineupMultiSeedSignal(summary) }}</span>
            </div>
            <div class="current-replay-grid" role="group" aria-label="Current lineup multi-seed summary">
              <div class="metric-card">
                <span class="metric-label">Avg Score</span>
                <span class="metric-value">{{ fmtXg(summary.avgGoalsFor) }}-{{ fmtXg(summary.avgGoalsAgainst) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Avg GD</span>
                <span class="metric-value" [class]="deltaClass(summary.avgGoalDiff)">{{ fmtDeltaNumber(summary.avgGoalDiff) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Avg Poss</span>
                <span class="metric-value">{{ fmtPct(summary.avgPossessionFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Avg Shots</span>
                <span class="metric-value">
                  {{ fmtXg(summary.avgShotsFor) }} / {{ fmtXg(summary.avgShotsAgainst) }}
                  <span [class]="deltaClass(summary.avgShotDiff)">({{ fmtDeltaNumber(summary.avgShotDiff) }})</span>
                </span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Avg xG</span>
                <span class="metric-value">
                  {{ fmtXg(summary.avgXgFor) }} / {{ fmtXg(summary.avgXgAgainst) }}
                  <span [class]="deltaClass(summary.avgXgDiff)">({{ fmtDeltaNumber(summary.avgXgDiff) }})</span>
                </span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Avg zones C/W/L</span>
                <span class="metric-value">
                  {{ fmtXg(summary.avgCentralShotsFor) }}/{{ fmtXg(summary.avgWideShotsFor) }}/{{ fmtXg(summary.avgLongShotsFor) }}
                  /
                  {{ fmtXg(summary.avgCentralShotsAgainst) }}/{{ fmtXg(summary.avgWideShotsAgainst) }}/{{ fmtXg(summary.avgLongShotsAgainst) }}
                </span>
              </div>
            </div>
            <p class="panel-hint current-replay-starters">
              Starters {{ summary.playerCount }}/11 · {{ summary.starters.join(' · ') }}
            </p>
          </div>
          <div *ngIf="modalVsCanonicalSummary() as summary" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Base vs modal pixels</strong>
              <span>
                {{ summary.label }} · formation {{ summary.formation || '?' }}
                · seeds {{ summary.seedStart }}..{{ summary.seedEnd }} · custom field slots {{ summary.customMovableSlotCount }}/{{ summary.customSlotCount }}
              </span>
              <button type="button" class="matrix-export" (click)="copyModalVsCanonicalJson()">
                Copy JSON
              </button>
            </div>
            <div class="current-replay-grid" role="group" aria-label="Base vs modal pixels summary">
              <div class="metric-card">
                <span class="metric-label">Coach read</span>
                <span class="metric-value" [class]="summary.coachReadClass">{{ summary.coachRead }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” xG For</span>
                <span class="metric-value" [class]="deltaClass(summary.deltaXgFor)">{{ fmtDeltaNumber(summary.deltaXgFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” xG Ag.</span>
                <span class="metric-value" [class]="deltaClass(-summary.deltaXgAgainst)">{{ fmtDeltaNumber(summary.deltaXgAgainst) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” Shots</span>
                <span class="metric-value" [class]="deltaClass(summary.deltaShotDiff)">{{ fmtDeltaNumber(summary.deltaShotDiff) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” Poss</span>
                <span class="metric-value" [class]="deltaClass(summary.deltaPossessionFor)">{{ fmtDeltaNumber(summary.deltaPossessionFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” Zones C/W/L</span>
                <span class="metric-value">
                  {{ fmtDeltaNumber(summary.deltaCentralShotsFor) }}/{{ fmtDeltaNumber(summary.deltaWideShotsFor) }}/{{ fmtDeltaNumber(summary.deltaLongShotsFor) }}
                </span>
              </div>
            </div>
            <div class="compare-table-wrap">
              <table class="matrix-table compact-table">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>xG</th>
                    <th>Tiros</th>
                    <th>Pos.</th>
                    <th>Zonas C/W/L</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Base formacion</td>
                    <td>{{ fmtXg(summary.canonical.avgXgFor) }} / {{ fmtXg(summary.canonical.avgXgAgainst) }}</td>
                    <td>{{ fmtXg(summary.canonical.avgShotsFor) }} / {{ fmtXg(summary.canonical.avgShotsAgainst) }}</td>
                    <td>{{ fmtPct(summary.canonical.avgPossessionFor) }}</td>
                    <td>{{ fmtXg(summary.canonical.avgCentralShotsFor) }}/{{ fmtXg(summary.canonical.avgWideShotsFor) }}/{{ fmtXg(summary.canonical.avgLongShotsFor) }}</td>
                  </tr>
                  <tr>
                    <td>Modal custom</td>
                    <td>{{ fmtXg(summary.modal.avgXgFor) }} / {{ fmtXg(summary.modal.avgXgAgainst) }}</td>
                    <td>{{ fmtXg(summary.modal.avgShotsFor) }} / {{ fmtXg(summary.modal.avgShotsAgainst) }}</td>
                    <td>{{ fmtPct(summary.modal.avgPossessionFor) }}</td>
                    <td>{{ fmtXg(summary.modal.avgCentralShotsFor) }}/{{ fmtXg(summary.modal.avgWideShotsFor) }}/{{ fmtXg(summary.modal.avgLongShotsFor) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="playerSwapMatrixSummary() as swap" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Player swap matrix</strong>
              <span>
                {{ swap.baselinePlayer }} vs {{ swap.swapPlayer }}
                · slot {{ swap.slotId }} · seeds {{ swap.seedStart }}..{{ swap.seedEnd }}
              </span>
              <button type="button" class="matrix-export" (click)="copyPlayerSwapMatrixJson()">
                Copy JSON
              </button>
              <button type="button" class="matrix-export" (click)="downloadPlayerSwapMatrixCsv()">
                CSV
              </button>
            </div>
            <div class="current-replay-grid" role="group" aria-label="Player swap matrix summary">
              <div class="metric-card">
                <span class="metric-label">Coach read</span>
                <span class="metric-value" [class]="swap.swapReadClass">{{ swap.swapRead }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” GF</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaGoalsFor)">{{ fmtDeltaNumber(swap.deltaGoalsFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” GA</span>
                <span class="metric-value" [class]="deltaClass(-swap.deltaGoalsAgainst)">{{ fmtDeltaNumber(swap.deltaGoalsAgainst) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” GD</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaGoalDiff)">{{ fmtDeltaNumber(swap.deltaGoalDiff) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” Shots</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaShotsFor)">{{ fmtDeltaNumber(swap.deltaShotsFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta Poss</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaPossessionFor)">{{ fmtDeltaNumber(swap.deltaPossessionFor) }}%</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” xG For</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaXgFor)">{{ fmtDeltaNumber(swap.deltaXgFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Î” xG Diff</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaXgDiff)">{{ fmtDeltaNumber(swap.deltaXgDiff) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta Zones For C/W/L</span>
                <span class="metric-value" [class]="deltaClass(swap.deltaCentralShotsFor + swap.deltaWideShotsFor + swap.deltaLongShotsFor)">
                  {{ fmtDeltaNumber(swap.deltaCentralShotsFor) }}/{{ fmtDeltaNumber(swap.deltaWideShotsFor) }}/{{ fmtDeltaNumber(swap.deltaLongShotsFor) }}
                </span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta Zones Ag. C/W/L</span>
                <span class="metric-value" [class]="deltaClass(-(swap.deltaCentralShotsAgainst + swap.deltaWideShotsAgainst + swap.deltaLongShotsAgainst))">
                  {{ fmtDeltaNumber(swap.deltaCentralShotsAgainst) }}/{{ fmtDeltaNumber(swap.deltaWideShotsAgainst) }}/{{ fmtDeltaNumber(swap.deltaLongShotsAgainst) }}
                </span>
              </div>
            </div>
            <p class="panel-hint current-replay-starters" *ngIf="swap.preAutoSubDeltaXgFor !== undefined">
              Pre-auto-sub 1'-59':
              Î” Shots {{ fmtDeltaNumber(swap.preAutoSubDeltaShotsFor || 0) }}
              · Î” Shots Ag. {{ fmtDeltaNumber(swap.preAutoSubDeltaShotsAgainst || 0) }}
              · Î” xG For {{ fmtDeltaNumber(swap.preAutoSubDeltaXgFor || 0) }}
              · Î” xG Ag. {{ fmtDeltaNumber(swap.preAutoSubDeltaXgAgainst || 0) }}
              · Î” xG Diff {{ fmtDeltaNumber(swap.preAutoSubDeltaXgDiff || 0) }}
            </p>
            <p class="panel-hint current-replay-starters">
              Coach read: {{ swap.swapReadDetail }}
            </p>
            <p class="panel-hint current-replay-starters">
              Baseline avg xG {{ fmtXg(swap.baseline.avgXgFor) }} / {{ fmtXg(swap.baseline.avgXgAgainst) }}
              â†’ Swapped avg xG {{ fmtXg(swap.swapped.avgXgFor) }} / {{ fmtXg(swap.swapped.avgXgAgainst) }}
            </p>
            <p class="panel-hint current-replay-starters">
              Poss {{ fmtPct(swap.baseline.avgPossessionFor) }} â†’ {{ fmtPct(swap.swapped.avgPossessionFor) }}
              · Zones for C/W/L
              {{ fmtXg(swap.baseline.avgCentralShotsFor) }}/{{ fmtXg(swap.baseline.avgWideShotsFor) }}/{{ fmtXg(swap.baseline.avgLongShotsFor) }}
              â†’
              {{ fmtXg(swap.swapped.avgCentralShotsFor) }}/{{ fmtXg(swap.swapped.avgWideShotsFor) }}/{{ fmtXg(swap.swapped.avgLongShotsFor) }}
              · Against
              {{ fmtXg(swap.baseline.avgCentralShotsAgainst) }}/{{ fmtXg(swap.baseline.avgWideShotsAgainst) }}/{{ fmtXg(swap.baseline.avgLongShotsAgainst) }}
              â†’
              {{ fmtXg(swap.swapped.avgCentralShotsAgainst) }}/{{ fmtXg(swap.swapped.avgWideShotsAgainst) }}/{{ fmtXg(swap.swapped.avgLongShotsAgainst) }}
            </p>
          </div>
          <div *ngIf="playerSwapBatterySummaries().length > 0" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Player swap battery</strong>
              <span>{{ playerSwapBatterySummaries().length }} swaps · seeds {{ playerSwapBatterySummaries()[0].seedStart }}..{{ playerSwapBatterySummaries()[0].seedEnd }}</span>
              <button type="button" class="matrix-export" (click)="copyPlayerSwapBatteryJson()">
                Copy JSON
              </button>
              <button type="button" class="matrix-export" (click)="copyPlayerSwapBatteryReport()">
                Copy report
              </button>
              <button type="button" class="matrix-export" (click)="downloadPlayerSwapBatteryCsv()">
                CSV
              </button>
            </div>
            <div *ngIf="playerSwapBatterySummary() as battery" class="current-replay-grid" role="group" aria-label="Player swap battery summary">
              <div class="metric-card">
                <span class="metric-label">Best</span>
                <span class="metric-value delta-positive">{{ playerSwapBatteryBestWorstText(battery.best) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Worst</span>
                <span class="metric-value delta-negative">{{ playerSwapBatteryBestWorstText(battery.worst) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Reads</span>
                <span class="metric-value">{{ playerSwapBatteryCounterText(battery.reads) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Fit</span>
                <span class="metric-value">{{ playerSwapBatteryCounterText(battery.fits) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Mode</span>
                <span class="metric-value">{{ battery.mode }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Confidence</span>
                <span class="metric-value">{{ battery.confidence }} · {{ battery.precision }}</span>
              </div>
            </div>
            <div class="table-scroll compact-position-table">
              <table>
                <thead>
                  <tr>
                    <th>Caso</th>
                    <th>Read</th>
                    <th>Fit</th>
                    <th>Starter</th>
                    <th>Bench</th>
                    <th>OVR</th>
                    <th>Slot</th>
                    <th>Shots</th>
                    <th>Shots Ag.</th>
                    <th>xG For</th>
                    <th>xG Ag.</th>
                    <th>xG Diff</th>
                    <th>Pre xG Diff</th>
                    <th>Señal</th>
                    <th>Ataque</th>
                    <th>Control</th>
                    <th>Proteccion</th>
                    <th>Canales</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let swap of playerSwapBatterySummaries(); trackBy: trackByPlayerSwapSummary">
                    <td>{{ swap.testCase }}</td>
                    <td [class]="swap.swapReadClass">{{ swap.swapRead }}</td>
                    <td [class]="swap.swapFitClass">{{ swap.swapFit }}</td>
                    <td>{{ swap.baselinePlayer }}</td>
                    <td>{{ swap.swapPlayer }}</td>
                    <td [class]="deltaClass(swap.deltaPlayerOverall || 0)">
                      {{ playerSwapOverallText(swap) }}
                    </td>
                    <td>{{ swap.slotId }}</td>
                    <td [class]="deltaClass(swap.deltaShotsFor)">{{ fmtDeltaNumber(swap.deltaShotsFor) }}</td>
                    <td [class]="deltaClass(-swap.deltaShotsAgainst)">{{ fmtDeltaNumber(swap.deltaShotsAgainst) }}</td>
                    <td [class]="deltaClass(swap.deltaXgFor)">{{ fmtDeltaNumber(swap.deltaXgFor) }}</td>
                    <td [class]="deltaClass(-swap.deltaXgAgainst)">{{ fmtDeltaNumber(swap.deltaXgAgainst) }}</td>
                    <td [class]="deltaClass(swap.deltaXgDiff)">{{ fmtDeltaNumber(swap.deltaXgDiff) }}</td>
                    <td [class]="deltaClass(swap.preAutoSubDeltaXgDiff || 0)">{{ fmtDeltaNumber(swap.preAutoSubDeltaXgDiff || 0) }}</td>
                    <td [class]="swap.signalClass" [title]="swap.signalDetail">{{ swap.signalRead }}</td>
                    <td [class]="swap.tacticalAttackClass">{{ swap.tacticalAttackRead }}</td>
                    <td [class]="swap.tacticalCentralControlClass">{{ swap.tacticalCentralControlRead }}</td>
                    <td [class]="swap.tacticalProtectionClass">{{ swap.tacticalProtectionRead }}</td>
                    <td [class]="swap.tacticalChannelsClass" [title]="swap.tacticalBreakdownDetail">{{ swap.tacticalChannelsRead }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="playerSwapPrecisionComparisonRows().length > 0" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Player swap precision compare</strong>
              <span>Quick 3 seeds vs Balanced 10 seeds · {{ playerSwapPrecisionComparisonRows().length }} swaps</span>
            </div>
            <div class="table-scroll compact-position-table">
              <table>
                <thead>
                  <tr>
                    <th>Stability</th>
                    <th>Fit</th>
                    <th>Starter</th>
                    <th>Bench</th>
                    <th>Quick read</th>
                    <th>Balanced read</th>
                    <th>Quick xG Diff</th>
                    <th>Balanced xG Diff</th>
                    <th>Quick pre</th>
                    <th>Balanced pre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of playerSwapPrecisionComparisonRows(); trackBy: trackByPlayerSwapPrecisionComparison">
                    <td [class]="row.stabilityClass">{{ row.stability }}</td>
                    <td>{{ row.fit }}</td>
                    <td>{{ row.starter }}</td>
                    <td>{{ row.bench }}</td>
                    <td [class]="row.quick.swapReadClass">{{ row.quick.swapRead }}</td>
                    <td [class]="row.balanced.swapReadClass">{{ row.balanced.swapRead }}</td>
                    <td [class]="deltaClass(row.quick.deltaXgDiff)">{{ fmtDeltaNumber(row.quick.deltaXgDiff) }}</td>
                    <td [class]="deltaClass(row.balanced.deltaXgDiff)">{{ fmtDeltaNumber(row.balanced.deltaXgDiff) }}</td>
                    <td [class]="deltaClass(row.quick.preAutoSubDeltaXgDiff || 0)">{{ fmtDeltaNumber(row.quick.preAutoSubDeltaXgDiff || 0) }}</td>
                    <td [class]="deltaClass(row.balanced.preAutoSubDeltaXgDiff || 0)">{{ fmtDeltaNumber(row.balanced.preAutoSubDeltaXgDiff || 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="roleSlotImpactRows().length > 0" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Role slot impact</strong>
              <span *ngIf="roleSlotImpactRows()[0] as first">
                {{ first.baselinePlayerName }} · slot {{ first.slotId }}
                · XY {{ first.slotXPercent }}/{{ first.slotYPercent }}
                · seeds {{ first.seedStart }}..{{ first.seedEnd }}
              </span>
            </div>
            <p class="panel-hint current-replay-starters">
              Prueba aislada: mismo jugador base, mismo slot, mismas seeds. Solo cambia el rol natural en memoria para medir si el modal y el motor hablan el mismo idioma.
              {{ roleSlotImpactCoachRead() }}
            </p>
            <div class="matrix-table-wrap">
              <table class="matrix-table" aria-label="Role slot impact summary">
                <thead>
                  <tr>
                    <th>Rol probado</th>
                    <th>Rol motor</th>
                    <th>Eff</th>
                    <th>Colectivo</th>
                    <th>xG</th>
                    <th>xGA</th>
                    <th>xGD</th>
                    <th>Tiros</th>
                    <th>Banda</th>
                    <th>Centro</th>
                    <th>Pos.</th>
                    <th>Lectura</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of roleSlotImpactRows(); trackBy: trackByRoleSlotImpactRow">
                    <td>{{ row.testedNaturalPosition }}</td>
                    <td>{{ row.tacticalPosition }}</td>
                    <td [class]="roleSlotImpactFitClass(row)">{{ fmtPct(row.playerEffectiveness * 100) }}</td>
                    <td>{{ fmtXg(row.playerCollective) }}</td>
                    <td>{{ fmtXg(row.avgXgFor) }}</td>
                    <td>{{ fmtXg(row.avgXgAgainst) }}</td>
                    <td [class]="deltaClass(row.avgXgDiff)">{{ fmtDeltaNumber(row.avgXgDiff) }}</td>
                    <td>{{ fmtXg(row.avgShotsFor) }}</td>
                    <td>{{ fmtXg(row.avgWideShotsFor) }}</td>
                    <td>{{ fmtXg(row.avgCentralShotsFor) }}</td>
                    <td>{{ fmtXg(row.avgPossessionFor) }}%</td>
                    <td [class]="roleSlotImpactFitClass(row)">{{ roleSlotImpactFitRead(row) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="roleSlotImpactSmokeRows().length > 0" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>All role slots smoke</strong>
              <button type="button" class="matrix-export" (click)="copyRoleSlotImpactSmokeJson()">
                Copy JSON
              </button>
              <button type="button" class="matrix-export" (click)="copyRoleSlotImpactSmokeReport()">
                Copy MD
              </button>
              <span>{{ roleSlotImpactSmokeRows().length }} slots · lectura rápida del XI</span>
            </div>
            <p class="panel-hint current-replay-starters">
              Semáforo: si el mejor rol tiene mucha ventaja contra el peor, el slot está leyendo rol/posición de forma clara.
            </p>
            <div class="matrix-table-wrap">
              <table class="matrix-table" aria-label="All role slots smoke">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Jugador</th>
                    <th>Mejor rol</th>
                    <th>Eff</th>
                    <th>Peor rol</th>
                    <th>Eff</th>
                    <th>Gap</th>
                    <th>Veredicto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of roleSlotImpactSmokeRows(); trackBy: trackByRoleSlotImpactSmokeRow">
                    <td>{{ row.slotId }}</td>
                    <td>{{ row.player }}</td>
                    <td>{{ row.bestRole }}</td>
                    <td>{{ fmtPct(row.bestEff * 100) }}</td>
                    <td>{{ row.worstRole }}</td>
                    <td>{{ fmtPct(row.worstEff * 100) }}</td>
                    <td [class]="deltaClass(row.gap)">{{ fmtPct(row.gap * 100) }}</td>
                    <td [class]="row.className">{{ row.verdict }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="allFormationRoleSlotSmokeRows().length > 0" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>All formations role-slot smoke</strong>
              <span>{{ allFormationRoleSlotSmokeRows().length }} formaciones · roles por slot real</span>
              <button type="button" class="matrix-export" (click)="copyAllFormationsRoleSlotSmokeJson()">
                Copy JSON
              </button>
              <button type="button" class="matrix-export" (click)="copyAllFormationsRoleSlotSmokeReport()">
                Copy MD
              </button>
            </div>
            <p class="panel-hint current-replay-starters">
              Verifica si cada formacion auto-seleccionada conserva slots con lectura fuerte de rol natural vs improvisado.
            </p>
            <div class="matrix-table-wrap">
              <table class="matrix-table" aria-label="All formations role slot smoke">
                <thead>
                  <tr>
                    <th>Formacion</th>
                    <th>Slots</th>
                    <th>Claro</th>
                    <th>Visible</th>
                    <th>Revisar</th>
                    <th>Min gap</th>
                    <th>Avg gap</th>
                    <th>Slot debil</th>
                    <th>Veredicto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of allFormationRoleSlotSmokeRows(); trackBy: trackByAllFormationRoleSlotSmokeRow">
                    <td>{{ row.formation }}</td>
                    <td>{{ row.slots }}</td>
                    <td>{{ row.clear }}</td>
                    <td>{{ row.visible }}</td>
                    <td>{{ row.review }}</td>
                    <td [class]="deltaClass(row.minGap)">{{ fmtPct(row.minGap * 100) }}</td>
                    <td [class]="deltaClass(row.avgGap)">{{ fmtPct(row.avgGap * 100) }}</td>
                    <td>{{ row.weakestSlot }}</td>
                    <td [class]="row.className">{{ row.verdict }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="positionPixelMatrixSummary() as pixel" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Position pixel matrix</strong>
              <span>
                {{ pixel.playerName }} ({{ pixel.playerPosition }}) · slot {{ pixel.slotId }}
                · {{ pixel.fromXPercent }}/{{ pixel.fromYPercent }} â†’ {{ pixel.targetXPercent }}/{{ pixel.targetYPercent }}
                · seeds {{ pixel.seedStart }}..{{ pixel.seedEnd }}
              </span>
            </div>
            <div class="current-replay-grid" role="group" aria-label="Position pixel matrix summary">
              <div class="metric-card">
                <span class="metric-label">Delta Shots</span>
                <span class="metric-value" [class]="deltaClass(pixel.deltaShotsFor)">{{ fmtDeltaNumber(pixel.deltaShotsFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta Poss</span>
                <span class="metric-value" [class]="deltaClass(pixel.deltaPossessionFor)">{{ fmtDeltaNumber(pixel.deltaPossessionFor) }}%</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta xG For</span>
                <span class="metric-value" [class]="deltaClass(pixel.deltaXgFor)">{{ fmtDeltaNumber(pixel.deltaXgFor) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta xG Diff</span>
                <span class="metric-value" [class]="deltaClass(pixel.deltaXgDiff)">{{ fmtDeltaNumber(pixel.deltaXgDiff) }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta Zones C/W/L</span>
                <span class="metric-value" [class]="deltaClass(pixel.deltaCentralShotsFor + pixel.deltaWideShotsFor + pixel.deltaLongShotsFor)">
                  {{ fmtDeltaNumber(pixel.deltaCentralShotsFor) }}/{{ fmtDeltaNumber(pixel.deltaWideShotsFor) }}/{{ fmtDeltaNumber(pixel.deltaLongShotsFor) }}
                </span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta Zones Ag. C/W/L</span>
                <span class="metric-value" [class]="deltaClass(-(pixel.deltaCentralShotsAgainst + pixel.deltaWideShotsAgainst + pixel.deltaLongShotsAgainst))">
                  {{ fmtDeltaNumber(pixel.deltaCentralShotsAgainst) }}/{{ fmtDeltaNumber(pixel.deltaWideShotsAgainst) }}/{{ fmtDeltaNumber(pixel.deltaLongShotsAgainst) }}
                </span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Delta xG Ag. C/W/L</span>
                <span class="metric-value" [class]="deltaClass(-(pixel.deltaCentralXgAgainst + pixel.deltaWideXgAgainst + pixel.deltaLongXgAgainst))">
                  {{ fmtDeltaNumber(pixel.deltaCentralXgAgainst) }}/{{ fmtDeltaNumber(pixel.deltaWideXgAgainst) }}/{{ fmtDeltaNumber(pixel.deltaLongXgAgainst) }}
                </span>
              </div>
            </div>
            <p class="panel-hint current-replay-starters">
              xG for {{ fmtXg(pixel.baselineXgFor) }} -> {{ fmtXg(pixel.movedXgFor) }}
              · xG against {{ fmtXg(pixel.baselineXgAgainst) }} -> {{ fmtXg(pixel.movedXgAgainst) }}.
              Movimiento destacado: {{ positionPixelMoveLabel(pixel) }} - Tactical read: {{ positionPixelTacticalRead(pixel) }}.
            </p>
            <div class="position-before-after" role="table" aria-label="Position movement before and after">
              <div class="position-before-after-row position-before-after-head" role="row">
                <span role="columnheader">Estado</span>
                <span role="columnheader">XY</span>
                <span role="columnheader">Linea</span>
                <span role="columnheader">Canal</span>
                <span role="columnheader">Rol motor</span>
                <span role="columnheader">Eff</span>
                <span role="columnheader">Colectivo</span>
                <span role="columnheader">xG For</span>
                <span role="columnheader">xG Ag.</span>
                <span role="columnheader">Tiros</span>
                <span role="columnheader">Posesion</span>
              </div>
              <div class="position-before-after-row" role="row">
                <span role="cell">Antes</span>
                <span role="cell">{{ fmtPctCoord(pixel.fromXPercent) }}/{{ fmtPctCoord(pixel.fromYPercent) }}</span>
                <span role="cell">{{ positionPixelVisualLineLabel(pixel.fromYPercent) }}</span>
                <span role="cell">{{ positionPixelVisualChannelLabel(pixel.fromXPercent) }}</span>
                <span role="cell">{{ pixel.baselineTacticalPosition }}</span>
                <span role="cell">{{ fmtPct(pixel.baselinePlayerEffectiveness * 100) }}</span>
                <span role="cell">{{ fmtXg(pixel.baselinePlayerCollective) }}</span>
                <span role="cell">{{ fmtXg(pixel.baselineXgFor) }}</span>
                <span role="cell">{{ fmtXg(pixel.baselineXgAgainst) }}</span>
                <span role="cell">{{ fmtXg(pixel.baselineShotsFor) }}</span>
                <span role="cell">{{ fmtXg(pixel.baselinePossessionFor) }}%</span>
              </div>
              <div class="position-before-after-row" role="row">
                <span role="cell">Despues</span>
                <span role="cell">{{ fmtPctCoord(pixel.targetXPercent) }}/{{ fmtPctCoord(pixel.targetYPercent) }}</span>
                <span role="cell">{{ positionPixelVisualLineLabel(pixel.targetYPercent) }}</span>
                <span role="cell">{{ positionPixelVisualChannelLabel(pixel.targetXPercent) }}</span>
                <span role="cell">{{ pixel.movedTacticalPosition }}</span>
                <span role="cell" [class]="deltaClass(pixel.deltaPlayerEffectiveness)">{{ fmtPct(pixel.movedPlayerEffectiveness * 100) }}</span>
                <span role="cell" [class]="deltaClass(pixel.deltaPlayerCollective)">{{ fmtXg(pixel.movedPlayerCollective) }}</span>
                <span role="cell" [class]="deltaClass(pixel.deltaXgFor)">{{ fmtXg(pixel.movedXgFor) }}</span>
                <span role="cell" [class]="deltaClass(-pixel.deltaXgAgainst)">{{ fmtXg(pixel.movedXgAgainst) }}</span>
                <span role="cell" [class]="deltaClass(pixel.deltaShotsFor)">{{ fmtXg(pixel.movedShotsFor) }}</span>
                <span role="cell" [class]="deltaClass(pixel.deltaPossessionFor)">{{ fmtXg(pixel.movedPossessionFor) }}%</span>
              </div>
            </div>
          </div>
          <div *ngIf="lineupDebugSnapshot() as debug" class="formation-matrix analysis-matrix current-lineup-replay">
            <div class="matrix-header">
              <strong>Current lineup debug</strong>
              <span>
                {{ debug.label }} · {{ lineupDebugScopeLabel(debug) }} · formation {{ debug.formation || '?' }}
                · selected {{ debug.selectedFormation || '?' }}
                · players {{ debug.playerCount }}/11
                · slots {{ debug.persistedSlotCount }}/{{ debug.effectiveSlotCount }}
                · candidates {{ debug.candidatesCount }}
              </span>
            </div>
            <p class="panel-hint current-replay-starters" *ngIf="debug.warnings.length > 0">
              {{ debug.warnings.join(' · ') }}
            </p>
            <div class="table-scroll compact-position-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Role</th>
                    <th>Slot</th>
                    <th>X/Y</th>
                    <th>Visual line</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of debug.rows; trackBy: trackByLineupDebugRow">
                    <td>{{ row.index }}</td>
                    <td>{{ row.name }}</td>
                    <td>{{ row.position }}</td>
                    <td>{{ row.slotId || '-' }}</td>
                    <td>{{ row.x ?? '?' }}/{{ row.y ?? '?' }}</td>
                    <td>{{ row.visualLine }}</td>
                    <td>{{ row.source }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="positionPixelEvidenceNote() as pixelNote" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Position movement evidence</strong>
              <span>Diagnóstico del último check de píxeles</span>
            </div>
            <div class="qa-evidence-note">
              {{ pixelNote }}
            </div>
          </div>
          <div *ngIf="positionPixelMatrixRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Position movement presets</strong>
              <span>Selected tactical candidates + same seeds, multiple pixel moves</span>
              <button type="button" class="matrix-export" (click)="copyPositionPixelMatrixJson()">
                Copy filtered JSON
              </button>
              <button type="button" class="matrix-export" (click)="downloadPositionPixelMatrixCsv()">
                CSV
              </button>
            </div>
            <div class="position-read-summary" aria-label="Position movement read summary">
              <span
                *ngFor="let item of positionPixelReadSummary()"
                class="read-pill"
                [ngClass]="'read-' + item.level"
              >
                {{ item.label }} {{ item.count }}
              </span>
              <span *ngIf="positionPixelHasChecks()" class="read-alert">
                Review Check rows before tuning.
              </span>
            </div>
            <div class="position-read-summary tactical-read-summary" aria-label="Position movement tactical summary">
              <span
                *ngFor="let item of positionPixelTacticalReadSummary()"
                class="read-pill tactical-read-pill"
                [class]="item.className"
                [title]="item.hint"
              >
                {{ item.label }} {{ item.count }}
              </span>
            </div>
            <div class="position-read-summary tactical-read-summary" aria-label="Position movement visual expectation summary">
              <span
                *ngFor="let item of positionPixelVisualExpectationSummary()"
                class="read-pill tactical-read-pill"
                [class]="item.className"
                [title]="item.hint"
              >
                {{ item.label }} {{ item.count }}
              </span>
            </div>
            <div class="position-read-summary tactical-read-summary" aria-label="Position movement visual engine summary">
              <span
                *ngFor="let item of positionPixelVisualEngineTensionSummary()"
                class="read-pill tactical-read-pill"
                [class]="item.className"
                [title]="item.hint"
              >
                {{ item.label }} {{ item.count }}
              </span>
            </div>
            <div *ngIf="positionPixelDiagonalSummary() as diagonal" class="current-replay-grid diagonal-summary" role="group" aria-label="Position diagonal summary">
              <div>
                <span>Diagonales</span>
                <strong>{{ diagonal.total }}</strong>
                <small>5px o más en X/Y</small>
              </div>
              <div>
                <span>Riesgo</span>
                <strong [class]="diagonal.risk > 0 ? 'read-check' : 'read-stable'">{{ diagonal.risk }}</strong>
                <small>Riesgo o xGA sensible</small>
              </div>
              <div>
                <span>Defensa +</span>
                <strong [class]="diagonal.defenseGain > 0 ? 'delta-positive' : 'delta-neutral'">{{ diagonal.defenseGain }}</strong>
                <small>Cobertura/defensa mejora</small>
              </div>
              <div>
                <span>Visual mismatch</span>
                <strong [class]="diagonal.visualMismatch > 0 ? 'read-check' : 'read-stable'">{{ diagonal.visualMismatch }}</strong>
                <small>Promesa visual no acompañada</small>
                <button
                  *ngIf="diagonal.worstVisualMismatch"
                  type="button"
                  class="summary-jump-btn"
                  (click)="jumpToPositionPixelRow(diagonal.worstVisualMismatch, 'diagonal-mismatch')"
                >
                  Ver peor
                </button>
              </div>
              <div>
                <span>Visual micro</span>
                <strong [class]="diagonal.visualMicro > 0 ? 'read-stable' : 'delta-neutral'">{{ diagonal.visualMicro }}</strong>
                <small>Ruido visual estable</small>
              </div>
              <div>
                <span>Visual tradeoff</span>
                <strong [class]="diagonal.visualEngineReview > 0 ? 'read-strong' : 'read-stable'">{{ diagonal.visualEngineReview }}</strong>
                <small>Mejora visual con costo</small>
                <button
                  *ngIf="diagonal.worstVisualReview"
                  type="button"
                  class="summary-jump-btn"
                  (click)="jumpToPositionPixelRow(diagonal.worstVisualReview, 'diagonal-review')"
                >
                  Ver peor
                </button>
              </div>
              <div>
                <span>Mejor diagonal</span>
                <strong [class]="positionPixelDiagonalSummaryRowClass(diagonal.best, true)">
                  {{ positionPixelDiagonalSummaryRowText(diagonal.best) }}
                </strong>
                <small>{{ diagonal.best ? positionPixelCoachRead(diagonal.best) : 'Sin filas' }}</small>
                <button
                  *ngIf="diagonal.best"
                  type="button"
                  class="summary-jump-btn"
                  (click)="jumpToPositionPixelRow(diagonal.best, 'diagonal')"
                >
                  Ver fila
                </button>
              </div>
              <div>
                <span>Peor diagonal</span>
                <strong [class]="positionPixelDiagonalSummaryRowClass(diagonal.worst, false)">
                  {{ positionPixelDiagonalSummaryRowText(diagonal.worst) }}
                </strong>
                <small>{{ diagonal.worst ? positionPixelCoachRead(diagonal.worst) : 'Sin filas' }}</small>
                <button
                  *ngIf="diagonal.worst"
                  type="button"
                  class="summary-jump-btn"
                  (click)="jumpToPositionPixelRow(diagonal.worst, 'diagonal')"
                >
                  Ver fila
                </button>
              </div>
            </div>
            <div *ngIf="positionPixelLineBreakSummary() as lineBreak" class="current-replay-grid diagonal-summary" role="group" aria-label="Position line break summary">
              <div>
                <span>Line breaks</span>
                <strong>{{ lineBreak.total }}</strong>
                <small>Cruzan ATT/MID/DEF</small>
              </div>
              <div>
                <span>Borde</span>
                <strong [class]="lineBreak.borderline > 0 ? 'delta-neutral' : 'read-stable'">{{ lineBreak.borderline }}</strong>
                <small>Distancia <= 6px</small>
              </div>
              <div>
                <span>Grandes</span>
                <strong [class]="lineBreak.big > 0 ? 'read-visible' : 'read-stable'">{{ lineBreak.big }}</strong>
                <small>Big zone / más de 6px</small>
              </div>
              <div>
                <span>Strong</span>
                <strong [class]="lineBreak.strong > 0 ? 'read-strong' : 'read-stable'">{{ lineBreak.strong }}</strong>
                <small>Impacto alto</small>
              </div>
              <div>
                <span>Bad tradeoff</span>
                <strong [class]="lineBreak.badTradeoff > 0 ? 'read-check' : 'read-stable'">{{ lineBreak.badTradeoff }}</strong>
                <small>Riesgo/costo claro</small>
                <button
                  *ngIf="lineBreak.worst"
                  type="button"
                  class="summary-jump-btn"
                  (click)="jumpToPositionPixelRow(lineBreak.worst, 'line-break')"
                >
                  Ver peor
                </button>
              </div>
              <div>
                <span>Attack gain</span>
                <strong [class]="lineBreak.attackGain > 0 ? 'delta-positive' : 'delta-neutral'">{{ lineBreak.attackGain }}</strong>
                <small>Mejora ofensiva</small>
                <button
                  *ngIf="lineBreak.best"
                  type="button"
                  class="summary-jump-btn"
                  (click)="jumpToPositionPixelRow(lineBreak.best, 'line-break')"
                >
                  Ver mejor
                </button>
              </div>
            </div>
            <div *ngIf="positionPixelSmokeRunSummaries().length > 1" class="matrix-scroll position-smoke-summary">
              <div class="matrix-table position-smoke-table" role="table" aria-label="Position smoke comparison by scope">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Scope</span>
                  <span role="columnheader">Matches</span>
                  <span role="columnheader">Players</span>
                  <span role="columnheader">Rows</span>
                  <span role="columnheader">Stable</span>
                  <span role="columnheader">Visible</span>
                  <span role="columnheader">Strong</span>
                  <span role="columnheader">Check</span>
                  <span role="columnheader">5px risk</span>
                  <span role="columnheader">Big strong</span>
                  <span role="columnheader">Avg señal</span>
                  <span role="columnheader">Worst</span>
                  <span role="columnheader">Worst move</span>
                  <span role="columnheader">Cause</span>
                  <span role="columnheader">Verdict</span>
                </div>
                <div *ngFor="let item of positionPixelSmokeRunSummaries()" class="matrix-row formation-matrix-row" role="row">
                  <span role="cell">{{ item.scope }}</span>
                  <span role="cell">{{ item.matchCount }}</span>
                  <span role="cell">{{ item.playerCount }}</span>
                  <span role="cell">{{ item.rows }}</span>
                  <span role="cell">{{ item.stable }}</span>
                  <span role="cell">{{ item.visible }}</span>
                  <span role="cell">{{ item.strong }}</span>
                  <span role="cell">{{ item.check }}</span>
                  <span role="cell">{{ item.fivePxRiskRows }}</span>
                  <span role="cell">{{ item.bigMoveStrongRows }}/{{ item.bigMoveRows }}</span>
                  <span role="cell">{{ item.avgSignal.toFixed(3) }}</span>
                  <span role="cell">{{ item.worstSignal.toFixed(3) }}</span>
                  <span role="cell">{{ item.worstMove }}</span>
                  <span role="cell" [title]="item.dominantCause">{{ item.dominantCause }}</span>
                  <span role="cell" [class]="item.verdictClass">{{ item.verdict }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="positionPixelMatchSmokeSummary().length > 1" class="matrix-scroll position-smoke-summary">
              <div class="matrix-table position-smoke-table" role="table" aria-label="Multi-match position smoke summary">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Match</span>
                  <span role="columnheader">Rows</span>
                  <span role="columnheader">Stable</span>
                  <span role="columnheader">Visible</span>
                  <span role="columnheader">Strong</span>
                  <span role="columnheader">Check</span>
                  <span role="columnheader">Micro</span>
                  <span role="columnheader">Visible risk</span>
                  <span role="columnheader">Att loss</span>
                  <span role="columnheader">Big bad</span>
                  <span role="columnheader">5px risk</span>
                  <span role="columnheader">5px cost</span>
                  <span role="columnheader">Big strong</span>
                  <span role="columnheader">Avg señal</span>
                  <span role="columnheader">Worst</span>
                  <span role="columnheader">Worst move</span>
                  <span role="columnheader">Cause</span>
                  <span role="columnheader">A/C/C trend</span>
                  <span role="columnheader">Verdict</span>
                </div>
                <div *ngFor="let item of positionPixelMatchSmokeSummary()" class="matrix-row formation-matrix-row" role="row">
                  <span role="cell">{{ item.matchLabel }}</span>
                  <span role="cell">{{ item.rows }}</span>
                  <span role="cell">{{ item.stable }}</span>
                  <span role="cell">{{ item.visible }}</span>
                  <span role="cell">{{ item.strong }}</span>
                  <span role="cell">{{ item.check }}</span>
                  <span role="cell">{{ item.microReview }}</span>
                  <span role="cell">{{ item.visibleRisk }}</span>
                  <span role="cell">{{ item.visibleAttackLoss }}</span>
                  <span role="cell">{{ item.bigBadTradeoff }}</span>
                  <span role="cell">{{ item.fivePxRiskRows }}</span>
                  <span role="cell">{{ item.fivePxCostRows }}</span>
                  <span role="cell">{{ item.bigMoveStrongRows }}/{{ item.bigMoveRows }}</span>
                  <span role="cell">{{ item.avgSignal.toFixed(3) }}</span>
                  <span role="cell" [title]="item.worstMove">{{ item.worstSignal.toFixed(3) }}</span>
                  <span role="cell" [title]="item.worstTacticalRead">{{ item.worstMove }}</span>
                  <span role="cell" [title]="item.dominantCause">{{ item.dominantCause }}</span>
                  <span role="cell" [class]="item.verdictClass">{{ item.verdict }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="positionPixelPlayerSmokeSummary().length > 0" class="matrix-scroll position-smoke-summary">
              <div class="matrix-table position-smoke-table" role="table" aria-label="Position smoke summary by player">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Player</span>
                  <span role="columnheader">Pos</span>
                  <span role="columnheader">Rows</span>
                  <span role="columnheader">5px risk</span>
                  <span role="columnheader">5px cost</span>
                  <span role="columnheader">Big strong</span>
                  <span role="columnheader">Avg señal</span>
                  <span role="columnheader">Worst</span>
                  <span role="columnheader">Worst move</span>
                  <span role="columnheader">Cause</span>
                  <span role="columnheader">A/C/C trend</span>
                  <span role="columnheader">Verdict</span>
                </div>
                <div *ngFor="let item of positionPixelPlayerSmokeSummary()" class="matrix-row formation-matrix-row" role="row">
                  <span role="cell">{{ item.playerName }}</span>
                  <span role="cell">{{ item.playerPosition }}</span>
                  <span role="cell">{{ item.rows }}</span>
                  <span role="cell">{{ item.fivePxRiskRows }}</span>
                  <span role="cell">{{ item.fivePxCostRows }}</span>
                  <span role="cell">{{ item.bigMoveStrongRows }}/{{ item.bigMoveRows }}</span>
                  <span role="cell">{{ item.avgSignal.toFixed(3) }}</span>
                  <span role="cell">{{ item.worstSignal.toFixed(3) }}</span>
                  <span role="cell">{{ item.worstMove }}</span>
                  <span role="cell" [title]="item.dominantCause">{{ item.dominantCause }}</span>
                  <span role="cell" [title]="item.channelBreakdownTrend">{{ item.channelBreakdownTrend }}</span>
                  <span role="cell" [class]="item.verdictClass">{{ item.verdict }}</span>
                </div>
              </div>
            </div>
            <div class="position-read-controls" aria-label="Position movement table controls">
              <label>
                Read
                <select [ngModel]="positionPixelReadFilter()" (ngModelChange)="setPositionPixelReadFilter($event)">
                  <option value="all">All</option>
                  <option value="diagonal">Diagonals</option>
                  <option value="diagonal-mismatch">Diagonal mismatch</option>
                  <option value="diagonal-micro">Diagonal micro</option>
                  <option value="diagonal-review">Diagonal tradeoff</option>
                  <option value="visual-mismatch">Visual mismatch</option>
                  <option value="visual-micro">Visual micro</option>
                  <option value="visual-review">Visual tradeoff</option>
                  <option value="big-move">Big moves</option>
                  <option value="line-break">Line breaks</option>
                  <option value="check">Check</option>
                  <option value="strong">Strong</option>
                  <option value="visible">Visible</option>
                  <option value="stable">Stable</option>
                </select>
              </label>
              <label>
                Sort
                <select [ngModel]="positionPixelSortMode()" (ngModelChange)="setPositionPixelSortMode($event)">
                  <option value="default">Run order</option>
                  <option value="read-desc">Read priority</option>
                  <option value="impact-desc">Impact</option>
                  <option value="distance-desc">Movement distance</option>
                </select>
              </label>
              <span class="position-read-count">
                Showing {{ displayedPositionPixelMatrixRows().length }} / {{ positionPixelMatrixRows().length }}
              </span>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-scroll-hint" aria-hidden="true">Scroll horizontal para ver lectura ofensiva/defensiva completa â†’</div>
              <div class="matrix-table position-movement-table" role="table" aria-label="Position movement preset comparison">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Player</span>
                  <span role="columnheader">Move</span>
                  <span role="columnheader">Coord.</span>
                  <span role="columnheader">Delta xG</span>
                  <span role="columnheader">Delta xG Ag.</span>
                  <span role="columnheader">Delta shots</span>
                  <span role="columnheader">Shots Ag.</span>
                  <span role="columnheader">Delta poss</span>
                  <span role="columnheader">Delta zones C/W/L</span>
                  <span role="columnheader">Zones Ag. C/W/L</span>
                  <span role="columnheader">xG zones C/W/L</span>
                  <span role="columnheader">xG Ag. C/W/L</span>
                  <span role="columnheader">Wide L/R</span>
                  <span role="columnheader">Wide Ag. L/R</span>
                  <span role="columnheader">Señal</span>
                  <span role="columnheader">Shape move</span>
                <span role="columnheader">Canal A/C/C</span>
                <span role="columnheader">Visual expect</span>
                <span role="columnheader">Visual vs engine</span>
                <span role="columnheader">Tactical read</span>
                <span role="columnheader">Read</span>
                </div>
                <div
                  *ngFor="let row of displayedPositionPixelMatrixRows(); trackBy: trackByPositionPixelRow"
                  class="matrix-row formation-matrix-row"
                  [class.position-row-highlight]="selectedPositionPixelRowKey() === positionPixelRowKey(row)"
                  [attr.data-position-row-key]="positionPixelRowKey(row)"
                  role="row"
                >
                  <span role="cell">{{ row.playerName }} ({{ row.playerPosition }})</span>
                  <span role="cell">{{ row.label }}</span>
                  <span role="cell">{{ row.fromXPercent }}/{{ row.fromYPercent }} -> {{ row.targetXPercent }}/{{ row.targetYPercent }}</span>
                  <span role="cell" [class]="deltaClass(row.deltaXgFor)">{{ fmtDeltaMicro(row.deltaXgFor) }}</span>
                  <span role="cell" [class]="deltaClass(-row.deltaXgAgainst)">{{ fmtDeltaMicro(row.deltaXgAgainst) }}</span>
                  <span role="cell" [class]="deltaClass(row.deltaShotsFor)">{{ fmtDeltaNumber(row.deltaShotsFor) }}</span>
                  <span role="cell" [class]="deltaClass(-row.deltaShotsAgainst)">{{ fmtDeltaNumber(row.deltaShotsAgainst) }}</span>
                  <span role="cell" [class]="deltaClass(row.deltaPossessionFor)">{{ fmtDeltaNumber(row.deltaPossessionFor) }}%</span>
                  <span role="cell" [class]="deltaClass(row.deltaCentralShotsFor + row.deltaWideShotsFor + row.deltaLongShotsFor)">
                    {{ fmtDeltaNumber(row.deltaCentralShotsFor) }}/{{ fmtDeltaNumber(row.deltaWideShotsFor) }}/{{ fmtDeltaNumber(row.deltaLongShotsFor) }}
                  </span>
                  <span role="cell" [class]="deltaClass(-(row.deltaCentralShotsAgainst + row.deltaWideShotsAgainst + row.deltaLongShotsAgainst))">
                    {{ fmtDeltaNumber(row.deltaCentralShotsAgainst) }}/{{ fmtDeltaNumber(row.deltaWideShotsAgainst) }}/{{ fmtDeltaNumber(row.deltaLongShotsAgainst) }}
                  </span>
                  <span role="cell" [class]="deltaClass(row.deltaCentralXgFor + row.deltaWideXgFor + row.deltaLongXgFor)">
                    {{ fmtDeltaMicro(row.deltaCentralXgFor) }}/{{ fmtDeltaMicro(row.deltaWideXgFor) }}/{{ fmtDeltaMicro(row.deltaLongXgFor) }}
                  </span>
                  <span role="cell" [class]="deltaClass(-(row.deltaCentralXgAgainst + row.deltaWideXgAgainst + row.deltaLongXgAgainst))">
                    {{ fmtDeltaMicro(row.deltaCentralXgAgainst) }}/{{ fmtDeltaMicro(row.deltaWideXgAgainst) }}/{{ fmtDeltaMicro(row.deltaLongXgAgainst) }}
                  </span>
                  <span role="cell" [class]="deltaClass(row.deltaLeftWideXgFor + row.deltaRightWideXgFor)" [title]="'shots L/R ' + fmtDeltaNumber(row.deltaLeftWideShotsFor) + '/' + fmtDeltaNumber(row.deltaRightWideShotsFor)">
                    xG {{ fmtDeltaMicro(row.deltaLeftWideXgFor) }}/{{ fmtDeltaMicro(row.deltaRightWideXgFor) }}
                  </span>
                  <span role="cell" [class]="deltaClass(-(row.deltaLeftWideXgAgainst + row.deltaRightWideXgAgainst))" [title]="'shots ag. L/R ' + fmtDeltaNumber(row.deltaLeftWideShotsAgainst) + '/' + fmtDeltaNumber(row.deltaRightWideShotsAgainst)">
                    xG {{ fmtDeltaMicro(row.deltaLeftWideXgAgainst) }}/{{ fmtDeltaMicro(row.deltaRightWideXgAgainst) }}
                  </span>
                  <span role="cell" [class]="row.signalClass" [title]="row.signalDetail">{{ row.signalRead }}</span>
                  <span role="cell" class="shape-move-read" [title]="positionPixelShapeMoveDetail(row)">
                    {{ positionPixelShapeMove(row) }}
                  </span>
                  <span role="cell" [class]="positionPixelChannelBreakdownClass(row)" [title]="positionPixelChannelBreakdownDetail(row)">
                    {{ positionPixelChannelBreakdownRead(row) }}
                  </span>
                  <span role="cell" [class]="positionPixelVisualExpectationClass(row)" [title]="positionPixelVisualExpectationDetail(row)">
                    {{ positionPixelVisualExpectationRead(row) }}
                  </span>
                  <span role="cell" [class]="positionPixelVisualEngineTensionClass(row)" [title]="positionPixelVisualEngineTensionDetail(row)">
                    {{ positionPixelVisualEngineTensionRead(row) }}
                  </span>
                  <span role="cell" [class]="positionPixelTacticalReadClass(row)" [title]="positionPixelTacticalReadReason(row)">
                    {{ positionPixelTacticalRead(row) }}
                    <small class="tactical-read-coach-note">{{ positionPixelCoachRead(row) }}</small>
                  </span>
                  <span role="cell" [class]="positionPixelReadClass(row)">{{ positionPixelRead(row) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="formationReplayResults().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Formation matrix</strong>
              <span>Same match + seed {{ seedInputModel ?? 'auto' }} + {{ selectedStyleLabel() }}</span>
              <button type="button" class="matrix-export" (click)="copyFormationMatrixJson()">
                Copy JSON
              </button>
              <button type="button" class="matrix-export" (click)="downloadFormationMatrixCsv()">
                CSV
              </button>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Formation replay comparison">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Form.</span>
                  <span role="columnheader">Score For/Ag.</span>
                  <span role="columnheader">Delta Score</span>
                  <span role="columnheader">Poss For/Ag.</span>
                  <span role="columnheader">Delta Poss</span>
                  <span role="columnheader">Shots For/Ag.</span>
                  <span role="columnheader">Delta Shots</span>
                  <span role="columnheader">xG For/Ag.</span>
                  <span role="columnheader">Delta xG</span>
                  <span role="columnheader">Zones For C/W/L</span>
                  <span role="columnheader">Delta Zones</span>
                </div>
                <div
                  *ngFor="let row of formationReplayResults(); trackBy: trackByFormationReplay"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">{{ row.formation }}</span>
                  <span role="cell">{{ row.homeGoals ?? '?' }}-{{ row.awayGoals ?? '?' }}</span>
                  <span role="cell">{{ fmtPct(row.homePossession) }} / {{ fmtPct(row.awayPossession) }}</span>
                  <span role="cell">{{ row.homeShots ?? '-' }} / {{ row.awayShots ?? '-' }}</span>
                  <span role="cell">{{ fmtXg(row.homeXg) }} / {{ fmtXg(row.awayXg) }}</span>
                  <span role="cell">
                    {{ row.homeCentralShots }}/{{ row.homeWideShots }}/{{ row.homeLongShots }}
                    /
                    {{ row.awayCentralShots }}/{{ row.awayWideShots }}/{{ row.awayLongShots }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="formationMatrixSummaryResults().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Formation averages</strong>
              <span>
                Seeds {{ formationMatrixSummaryResults()[0].seedStart }}-{{ formationMatrixSummaryResults()[0].seedEnd }}
                · {{ formationMatrixSummaryResults()[0].seedCount }} runs per formation
              </span>
            </div>
            <div *ngIf="formationCoachSummary() as coach" class="current-replay-grid" role="group" aria-label="Formation coach recommendations">
              <div>
                <span>{{ coach.bestBalance.label }}</span>
                <strong>{{ coach.bestBalance.formation }}</strong>
                <small>{{ coach.bestBalance.identity }}</small>
                <small [class]="coach.bestBalance.cssClass">{{ coach.bestBalance.read }} · {{ coach.bestBalance.detail }}</small>
              </div>
              <div>
                <span>{{ coach.bestAttack.label }}</span>
                <strong>{{ coach.bestAttack.formation }}</strong>
                <small>{{ coach.bestAttack.identity }}</small>
                <small [class]="coach.bestAttack.cssClass">{{ coach.bestAttack.read }} · {{ coach.bestAttack.detail }}</small>
              </div>
              <div>
                <span>{{ coach.safest.label }}</span>
                <strong>{{ coach.safest.formation }}</strong>
                <small>{{ coach.safest.identity }}</small>
                <small [class]="coach.safest.cssClass">{{ coach.safest.read }} · {{ coach.safest.detail }}</small>
              </div>
              <div>
                <span>{{ coach.avoid.label }}</span>
                <strong>{{ coach.avoid.formation }}</strong>
                <small>{{ coach.avoid.identity }}</small>
                <small [class]="coach.avoid.cssClass">{{ coach.avoid.read }} · {{ coach.avoid.detail }}</small>
              </div>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Formation average comparison">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Form.</span>
                  <span role="columnheader">Read</span>
                  <span role="columnheader">Goals F/Ag.</span>
                  <span role="columnheader">Goal diff</span>
                  <span role="columnheader">Poss For</span>
                  <span role="columnheader">Shots F/Ag.</span>
                  <span role="columnheader">Shot diff</span>
                  <span role="columnheader">xG F/Ag.</span>
                  <span role="columnheader">xG diff</span>
                  <span role="columnheader">Zones F C/W/L</span>
                  <span role="columnheader">Zones Ag C/W/L</span>
                  <span role="columnheader">Wide F L/R xG</span>
                  <span role="columnheader">Wide Ag L/R xG</span>
                  <span role="columnheader">Shape P/A/D</span>
                  <span role="columnheader">Atk L/C/R</span>
                  <span role="columnheader">Def L/C/R</span>
                </div>
                <div
                  *ngFor="let row of formationMatrixSummaryResults(); trackBy: trackByFormationSummary"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">{{ row.formation }}</span>
                  <span role="cell" class="shape-move-read" [class]="formationSummaryReadClass(row)" [title]="formationSummaryReadDetail(row)">
                    {{ formationSummaryRead(row) }}
                  </span>
                  <span role="cell">{{ fmtXg(row.avgGoalsFor) }} / {{ fmtXg(row.avgGoalsAgainst) }}</span>
                  <span role="cell">{{ fmtDeltaNumber(row.avgGoalDiff) }}</span>
                  <span role="cell">{{ fmtPct(row.avgPossessionFor) }}</span>
                  <span role="cell">{{ fmtXg(row.avgShotsFor) }} / {{ fmtXg(row.avgShotsAgainst) }}</span>
                  <span role="cell">{{ fmtDeltaNumber(row.avgShotDiff) }}</span>
                  <span role="cell">{{ fmtXg(row.avgXgFor) }} / {{ fmtXg(row.avgXgAgainst) }}</span>
                  <span role="cell">{{ fmtDeltaNumber(row.avgXgDiff) }}</span>
                  <span role="cell">
                    {{ fmtXg(row.avgCentralShotsFor) }}/{{ fmtXg(row.avgWideShotsFor) }}/{{ fmtXg(row.avgLongShotsFor) }}
                  </span>
                  <span role="cell">
                    {{ fmtXg(row.avgCentralShotsAgainst) }}/{{ fmtXg(row.avgWideShotsAgainst) }}/{{ fmtXg(row.avgLongShotsAgainst) }}
                  </span>
                  <span role="cell">
                    {{ fmtXg(row.avgLeftWideXgFor ?? 0) }}/{{ fmtXg(row.avgRightWideXgFor ?? 0) }}
                  </span>
                  <span role="cell">
                    {{ fmtXg(row.avgLeftWideXgAgainst ?? 0) }}/{{ fmtXg(row.avgRightWideXgAgainst ?? 0) }}
                  </span>
                  <span role="cell">
                    {{ fmtXg(row.avgShapePossessionMultiplier) }}/{{ fmtXg(row.avgShapeAttackVolumeMultiplier) }}/{{ fmtXg(row.avgShapeDefensiveResistanceMultiplier) }}
                  </span>
                  <span role="cell">
                    {{ fmtXg(row.avgShapeAttackLeft) }}/{{ fmtXg(row.avgShapeAttackCenter) }}/{{ fmtXg(row.avgShapeAttackRight) }}
                  </span>
                  <span role="cell">
                    {{ fmtXg(row.avgShapeDefenseLeft) }}/{{ fmtXg(row.avgShapeDefenseCenter) }}/{{ fmtXg(row.avgShapeDefenseRight) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="lowBlockLabRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>5-4-1 low block lab</strong>
              <span>
                Segunda línea alta / base / baja · {{ lowBlockLabRows()[0].seedCount }} seeds
              </span>
            </div>
            <p class="panel-hint">
              Compara el mismo partido y los mismos jugadores: solo cambia la altura visual de la segunda línea del 5-4-1.
              La base es el punto cero; las otras filas muestran cuánto cambia el motor.
            </p>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="5-4-1 low block visual lab">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Variante</span>
                  <span role="columnheader">Lectura</span>
                  <span role="columnheader">xG</span>
                  <span role="columnheader">xGA</span>
                  <span role="columnheader">Dif xG</span>
                  <span role="columnheader">Shots contra</span>
                  <span role="columnheader">Pos.</span>
                  <span role="columnheader">Contra centro/bandas</span>
                </div>
                <div
                  *ngFor="let row of lowBlockLabRows(); trackBy: trackByLowBlockLabRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">
                    <strong>{{ row.label }}</strong>
                    <small>y{{ row.secondLineY }}</small>
                  </span>
                  <span role="cell" [class]="row.className">{{ row.read }}</span>
                  <span role="cell">
                    {{ row.avgXgFor | number:'1.2-2' }}
                    <small>{{ signed(row.deltaXgFor) }}</small>
                  </span>
                  <span role="cell">
                    {{ row.avgXgAgainst | number:'1.2-2' }}
                    <small>{{ signed(row.deltaXgAgainst) }}</small>
                  </span>
                  <span role="cell">{{ signed(row.deltaXgDiff) }}</span>
                  <span role="cell">
                    {{ row.avgShotsAgainst | number:'1.1-1' }}
                    <small>{{ signed(row.deltaShotsAgainst) }}</small>
                  </span>
                  <span role="cell">
                    {{ row.avgPossessionFor | number:'1.1-1' }}%
                    <small>{{ signed(row.deltaPossessionFor) }}</small>
                  </span>
                  <span role="cell">
                    C {{ row.avgCentralShotsAgainst | number:'1.1-1' }} · B {{ row.avgWideShotsAgainst | number:'1.1-1' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="backFiveTransitionLabRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>5-3-2 transition lab</strong>
              <span>Carrileros bajos / base / altos · {{ backFiveTransitionLabRows()[0].seedCount }} seeds</span>
            </div>
            <p class="panel-hint">
              Compara el mismo partido y los mismos jugadores: solo cambia la altura visual de los carrileros del 5-3-2.
            </p>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="5-3-2 transition lab">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Variante</span>
                  <span role="columnheader">Lectura</span>
                  <span role="columnheader">xG</span>
                  <span role="columnheader">xGA</span>
                  <span role="columnheader">Dif xG</span>
                  <span role="columnheader">Bandas propias</span>
                  <span role="columnheader">Bandas contra</span>
                  <span role="columnheader">Shots contra</span>
                </div>
                <div
                  *ngFor="let row of backFiveTransitionLabRows(); trackBy: trackByBackFiveTransitionLabRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">
                    <strong>{{ row.label }}</strong>
                    <small>y{{ row.wingbackY }}</small>
                  </span>
                  <span role="cell" [class]="row.className">{{ row.read }}</span>
                  <span role="cell">{{ row.avgXgFor | number:'1.2-2' }} <small>{{ signed(row.deltaXgFor) }}</small></span>
                  <span role="cell">{{ row.avgXgAgainst | number:'1.2-2' }} <small>{{ signed(row.deltaXgAgainst) }}</small></span>
                  <span role="cell">{{ signed(row.deltaXgDiff) }}</span>
                  <span role="cell">{{ row.avgWideShotsFor | number:'1.1-1' }} <small>{{ signed(row.deltaWideShotsFor) }}</small></span>
                  <span role="cell">{{ row.avgWideShotsAgainst | number:'1.1-1' }} <small>{{ signed(row.deltaWideShotsAgainst) }}</small></span>
                  <span role="cell">{{ row.avgShotsAgainst | number:'1.1-1' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="backFiveFamilyLabRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Línea de 5 family lab</strong>
              <span>
                5-4-1 / 5-3-2 / 3-5-2 · {{ backFiveFamilyLabRows()[0].seedCount }} seeds
                <ng-container *ngIf="backFiveFamilyLabScope() as scope"> · {{ scope }}</ng-container>
              </span>
            </div>
            <p class="panel-hint">
              Compara tres identidades de línea de 5 en el mismo partido: bloque bajo, transición y control por carrileros.
              La referencia es 5-3-2; las diferencias muestran qué gana y qué pierde cada plan.
            </p>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Back five family lab">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Plan</span>
                  <span role="columnheader">Lectura</span>
                  <span role="columnheader">xG</span>
                  <span role="columnheader">xGA</span>
                  <span role="columnheader">Dif xG</span>
                  <span role="columnheader">Bandas propias</span>
                  <span role="columnheader">Bandas contra</span>
                  <span role="columnheader">Pos.</span>
                  <span role="columnheader">Shots contra</span>
                </div>
                <div
                  *ngFor="let row of backFiveFamilyLabRows(); trackBy: trackByBackFiveFamilyLabRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">
                    <strong>{{ row.label }}</strong>
                    <small>{{ row.formation }} · {{ row.visualPlan }}</small>
                  </span>
                  <span role="cell" [class]="row.className">{{ row.read }}</span>
                  <span role="cell">{{ row.avgXgFor | number:'1.2-2' }} <small>{{ signed(row.deltaXgFor) }}</small></span>
                  <span role="cell">{{ row.avgXgAgainst | number:'1.2-2' }} <small>{{ signed(row.deltaXgAgainst) }}</small></span>
                  <span role="cell">{{ signed(row.deltaXgDiff) }}</span>
                  <span role="cell">{{ row.avgWideShotsFor | number:'1.1-1' }} <small>{{ signed(row.deltaWideShotsFor) }}</small></span>
                  <span role="cell">{{ row.avgWideShotsAgainst | number:'1.1-1' }} <small>{{ signed(row.deltaWideShotsAgainst) }}</small></span>
                  <span role="cell">{{ row.avgPossessionFor | number:'1.1-1' }}%</span>
                  <span role="cell">{{ row.avgShotsAgainst | number:'1.1-1' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="backFiveContextSmokeRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Línea de 5 context smoke</strong>
              <span>
                {{ backFiveContextSmokeRows().length }} lecturas ·
                {{ backFiveContextSmokeRows()[0].seedCount }} seeds · local/visitante
              </span>
            </div>
            <p class="panel-hint">
              Recorre varios partidos completados y ambos lados. Resume qué plan de línea de 5 gana diferencial,
              cuál protege mejor y cuál genera más xG.
            </p>
            <div *ngIf="backFiveContextSmokeSummary() as summary" class="coach-pick-grid">
              <article class="coach-pick-card">
                <span class="coach-pick-label">Gana diferencial</span>
                <div class="context-summary-counts">
                  <span><strong>5-4-1</strong> {{ summary.best541 }}</span>
                  <span><strong>5-3-2</strong> {{ summary.best532 }}</span>
                  <span><strong>3-5-2</strong> {{ summary.best352 }}</span>
                </div>
                <small>{{ summary.total }} contextos evaluados</small>
                <span class="shape-move-read" [class]="summary.className">{{ summary.read }}</span>
              </article>
              <article class="coach-pick-card">
                <span class="coach-pick-label">Más seguro</span>
                <div class="context-summary-counts">
                  <span><strong>5-4-1</strong> {{ summary.safest541 }}</span>
                  <span><strong>5-3-2</strong> {{ summary.safest532 }}</span>
                  <span><strong>3-5-2</strong> {{ summary.safest352 }}</span>
                </div>
                <small>Cuenta el menor xGA por contexto.</small>
              </article>
              <article class="coach-pick-card">
                <span class="coach-pick-label">Más ofensivo</span>
                <div class="context-summary-counts">
                  <span><strong>5-4-1</strong> {{ summary.offensive541 }}</span>
                  <span><strong>5-3-2</strong> {{ summary.offensive532 }}</span>
                  <span><strong>3-5-2</strong> {{ summary.offensive352 }}</span>
                </div>
                <small>Cuenta el mayor xG por contexto.</small>
              </article>
              <article class="coach-pick-card context-review-card">
                <span class="coach-pick-label">Revisar</span>
                <strong>{{ summary.review }} casos</strong>
                <div *ngIf="summary.reviewDetails.length > 0" class="context-review-details">
                  <small *ngFor="let detail of summary.reviewDetails">&bull; {{ detail }}</small>
                </div>
                <small>Casos donde el mejor plan sigue negativo o la lectura queda frágil.</small>
              </article>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Back five context smoke">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Contexto</span>
                  <span role="columnheader">Lectura</span>
                  <span role="columnheader">Mejor plan</span>
                  <span role="columnheader">Más seguro</span>
                  <span role="columnheader">Más ofensivo</span>
                  <span role="columnheader">5-4-1</span>
                  <span role="columnheader">5-3-2</span>
                  <span role="columnheader">3-5-2</span>
                </div>
                <div
                  *ngFor="let row of backFiveContextSmokeRows(); trackBy: trackByBackFiveContextSmokeRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">
                    <strong>{{ row.controlledTeamName }}</strong>
                    <small>{{ row.controlledSide === 'HOME' ? 'local' : 'visitante' }} · {{ row.matchLabel }}</small>
                  </span>
                  <span role="cell" [class]="row.className">{{ row.read }}</span>
                  <span role="cell">{{ row.bestPlan }} <small>{{ signed(row.bestXgDiff) }}</small></span>
                  <span role="cell">{{ row.safestPlan }} <small>xGA {{ row.safestXga | number:'1.2-2' }}</small></span>
                  <span role="cell">{{ row.mostOffensivePlan }} <small>xG {{ row.mostOffensiveXg | number:'1.2-2' }}</small></span>
                  <span role="cell">{{ row.lowBlockDiff === null ? 'â€”' : signed(row.lowBlockDiff) }}</span>
                  <span role="cell">{{ row.transitionDiff === null ? 'â€”' : signed(row.transitionDiff) }}</span>
                  <span role="cell">{{ row.wingbackDiff === null ? 'â€”' : signed(row.wingbackDiff) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="sideMirrorSmokeRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>{{ sideMirrorSmokeMode() === 'synthetic' ? 'Synthetic mirror lab' : 'Side mirror smoke' }}</strong>
              <span>
                {{ sideMirrorSmokeMode() === 'synthetic' ? 'Equipos espejados, solo cambia lateral debil' : 'Rival weak left/right' }}
                · Seeds {{ sideMirrorSmokeRows()[0].seedStart }}-{{ sideMirrorSmokeRows()[0].seedEnd }}
                · {{ sideMirrorSmokeRows()[0].seedCount }} runs per formacion
              </span>
            </div>
            <div *ngIf="sideMirrorSmokeSummary() as summary" class="coach-pick-grid">
              <article class="coach-pick-card">
                <span class="coach-pick-label">Resumen espejo</span>
                <strong>{{ summary.ok }}/{{ summary.total }} OK · {{ summary.partial }} parciales · {{ summary.review }} revisar</strong>
                <small>
                  Edge promedio esperado:
                  weak-left â†’ derecha {{ fmtDeltaNumber(summary.avgWeakLeftExpectedEdge) }}
                  · weak-right â†’ izquierda {{ fmtDeltaNumber(summary.avgWeakRightExpectedEdge) }}
                </small>
                <span class="shape-move-read" [class]="summary.className">
                  Gap espejo {{ fmtDeltaNumber(summary.mirrorGap) }} · {{ summary.read }}
                </span>
              </article>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Side mirror smoke comparison">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Form.</span>
                  <span role="columnheader">Verdict</span>
                  <span role="columnheader">Weak left rival â†’ F L/R xG</span>
                  <span role="columnheader">Weak right rival â†’ F L/R xG</span>
                  <span role="columnheader">Shots L/R weak left</span>
                  <span role="columnheader">Shots L/R weak right</span>
                  <span role="columnheader">Edges expected</span>
                  <span role="columnheader">Ancho</span>
                  <span role="columnheader">Carrileros</span>
                  <span role="columnheader">Read</span>
                </div>
                <div
                  *ngFor="let row of sideMirrorSmokeRows(); trackBy: trackBySideMirrorSmokeRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">{{ row.formation }}</span>
                  <span role="cell" class="shape-move-read" [class]="sideMirrorVerdictClass(row)">
                    {{ row.verdict }}
                  </span>
                  <span role="cell">{{ fmtXg(row.weakLeftWideXgL) }} / {{ fmtXg(row.weakLeftWideXgR) }}</span>
                  <span role="cell">{{ fmtXg(row.weakRightWideXgL) }} / {{ fmtXg(row.weakRightWideXgR) }}</span>
                  <span role="cell">{{ fmtXg(row.weakLeftWideShotsL) }} / {{ fmtXg(row.weakLeftWideShotsR) }}</span>
                  <span role="cell">{{ fmtXg(row.weakRightWideShotsL) }} / {{ fmtXg(row.weakRightWideShotsR) }}</span>
                  <span role="cell">
                    R-vs-L {{ fmtDeltaNumber(row.weakLeftRightEdge) }} · L-vs-R {{ fmtDeltaNumber(row.weakRightLeftEdge) }}
                  </span>
                  <span role="cell" class="shape-move-read" [class]="row.widthClass">{{ row.widthRead }}</span>
                  <span role="cell" class="shape-move-read" [class]="row.wingbackClass">{{ row.wingbackRead }}</span>
                  <span role="cell">{{ row.read }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="wingbackLabRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Carrileros lab</strong>
              <span>Lectura fina de LWB/RWB usando el mismo Side mirror smoke</span>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Wingback lab comparison">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Form.</span>
                  <span role="columnheader">Carrileros</span>
                  <span role="columnheader">Verdict</span>
                  <span role="columnheader">Edge prom.</span>
                  <span role="columnheader">Edge min.</span>
                  <span role="columnheader">Gap lado</span>
                  <span role="columnheader">Ataque</span>
                  <span role="columnheader">Diagnóstico</span>
                </div>
                <div
                  *ngFor="let row of wingbackLabRows(); trackBy: trackByWingbackLabRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">{{ row.formation }}</span>
                  <span role="cell" class="shape-move-read" [class]="row.wingbackClass">{{ row.wingbackRead }}</span>
                  <span role="cell" class="shape-move-read" [class]="sideMirrorVerdictLabelClass(row.verdict)">
                    {{ row.verdict }}
                  </span>
                  <span role="cell">{{ fmtDeltaNumber(row.expectedEdgeAvg) }}</span>
                  <span role="cell">{{ fmtDeltaNumber(row.expectedEdgeMin) }}</span>
                  <span role="cell">{{ fmtXg(row.sideGap) }}</span>
                  <span role="cell">{{ row.attackRead }}</span>
                  <span role="cell" class="shape-move-read" [class]="row.className">{{ row.diagnosis }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="sideMirrorDecisionRows().length > 0" class="formation-matrix analysis-matrix">
            <div class="matrix-header">
              <strong>Mirror decision: sintético vs real</strong>
              <span>Control sano contra partido real · decide si tocar motor o revisar DT/plantel</span>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table formation-matrix-table" role="table" aria-label="Synthetic vs real side mirror decision">
                <div class="matrix-row formation-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Form.</span>
                  <span role="columnheader">Sintético</span>
                  <span role="columnheader">Real</span>
                  <span role="columnheader">Edges sintético</span>
                  <span role="columnheader">Edges real</span>
                  <span role="columnheader">Ancho</span>
                  <span role="columnheader">Decisión</span>
                </div>
                <div
                  *ngFor="let row of sideMirrorDecisionRows(); trackBy: trackBySideMirrorDecisionRow"
                  class="matrix-row formation-matrix-row"
                  role="row"
                >
                  <span role="cell">{{ row.formation }}</span>
                  <span role="cell" class="shape-move-read" [class]="sideMirrorVerdictLabelClass(row.syntheticVerdict)">
                    {{ row.syntheticVerdict }}
                  </span>
                  <span role="cell" class="shape-move-read" [class]="sideMirrorVerdictLabelClass(row.realVerdict)">
                    {{ row.realVerdict }}
                  </span>
                  <span role="cell">{{ row.syntheticEdges }}</span>
                  <span role="cell">{{ row.realEdges }}</span>
                  <span role="cell" class="shape-move-read" [class]="row.widthClass">{{ row.widthRead }}</span>
                  <span role="cell" class="shape-move-read" [class]="row.className">{{ row.decision }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="scenarioMatrixResults().length > 0" class="formation-matrix analysis-matrix scenario-matrix">
            <div class="matrix-header">
              <strong>Scenario matrix</strong>
              <span>Same match + seed {{ seedInputModel ?? 'auto' }} ? live tactical changes</span>
              <button type="button" class="matrix-export" (click)="copyScenarioMatrixJson()">
                Copy JSON
              </button>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table scenario-matrix-table" role="table" aria-label="Live tactical scenario comparison">
                <div class="matrix-row scenario-matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Scenario</span>
                  <span role="columnheader">Minute</span>
                  <span role="columnheader">Action</span>
                  <span role="columnheader">Score For/Ag.</span>
                  <span role="columnheader">Delta Score</span>
                  <span role="columnheader">Poss For/Ag.</span>
                  <span role="columnheader">Delta Poss</span>
                  <span role="columnheader">Shots For/Ag.</span>
                  <span role="columnheader">Delta Shots</span>
                  <span role="columnheader">xG For/Ag.</span>
                  <span role="columnheader">Delta xG</span>
                  <span role="columnheader">Zones For C/W/L</span>
                  <span role="columnheader">Delta Zones</span>
                </div>
                <div
                  *ngFor="let row of scenarioMatrixResults(); trackBy: trackByScenarioMatrix"
                  class="matrix-row scenario-matrix-row"
                  role="row"
                >
                  <span role="cell" [title]="row.description">{{ row.scenario }}</span>
                  <span role="cell">{{ row.changeMinute ?? 'Base' }}</span>
                  <span role="cell" [title]="row.actionDetail">{{ actionLabel(row) }}</span>
                  <span role="cell">{{ scenarioGoalsFor(row) }}-{{ scenarioGoalsAgainst(row) }}</span>
                  <span role="cell" [class]="deltaClass(scenarioGoalDiff(row))">
                    {{ fmtDeltaInt(scenarioGoalDiff(row)) }}
                  </span>
                  <span role="cell">{{ fmtPct(scenarioPossessionFor(row)) }} / {{ fmtPct(scenarioPossessionAgainst(row)) }}</span>
                  <span role="cell" [class]="deltaClass(scenarioPossessionDiff(row))">
                    {{ fmtDeltaInt(scenarioPossessionDiff(row)) }}pp
                  </span>
                  <span role="cell">{{ scenarioShotsFor(row) }} / {{ scenarioShotsAgainst(row) }}</span>
                  <span role="cell" [class]="deltaClass(scenarioShotDiff(row))">
                    {{ fmtDeltaInt(scenarioShotDiff(row)) }}
                  </span>
                  <span role="cell">{{ fmtXg(scenarioXgFor(row)) }} / {{ fmtXg(scenarioXgAgainst(row)) }}</span>
                  <span role="cell" [class]="deltaClass(scenarioXgDiff(row))">
                    {{ fmtDeltaNumber(scenarioXgDiff(row)) }}
                  </span>
                  <span role="cell">
                    {{ scenarioZonesFor(row).central }}/{{ scenarioZonesFor(row).wide }}/{{ scenarioZonesFor(row).long }}
                  </span>
                  <span role="cell" [class]="deltaClass(scenarioZoneDiff(row).central + scenarioZoneDiff(row).wide + scenarioZoneDiff(row).long)">
                    C {{ fmtDeltaInt(scenarioZoneDiff(row).central) }}
                    ? W {{ fmtDeltaInt(scenarioZoneDiff(row).wide) }}
                    ? L {{ fmtDeltaInt(scenarioZoneDiff(row).long) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="scenarioMatrixSummaryResults().length > 0" class="formation-matrix analysis-matrix scenario-matrix">
            <div class="matrix-header">
              <strong>Multi-seed scenario summary</strong>
              <span>
                Same match - seeds {{ summarySeedStart() }}..{{ summarySeedEnd() }}
                - averages vs minute baselines
              </span>
              <span *ngIf="scenarioSummaryBaseFormation()" class="controlled-team-badge">
                Base formation: {{ scenarioSummaryBaseFormation() }}
              </span>
              <span class="controlled-team-badge">
                Controlando: {{ controlledTeamDisplayName() }}
              </span>
              <button type="button" class="matrix-export" (click)="copyScenarioMatrixSummaryJson()">
                Copy filtered JSON
              </button>
              <button type="button" class="matrix-export" (click)="downloadScenarioMatrixSummaryCsv()">
                CSV
              </button>
            </div>
            <div class="position-read-summary tactical-read-summary" aria-label="Equipo controlado">
              <span class="read-pill tactical-read-pill read-visible">
                Controlando: {{ controlledTeamDisplayName() }}
              </span>
            </div>
            <div
              *ngIf="scenarioScoutingNotes().length > 0"
              class="position-read-summary tactical-read-summary"
              aria-label="Scouting rapido"
            >
              <span
                *ngFor="let note of scenarioScoutingNotes()"
                class="read-pill tactical-read-pill"
                [class]="note.className"
                [title]="note.body"
              >
                {{ note.title }}: {{ note.body }}
              </span>
            </div>
            <div
              *ngIf="scenarioDecisionCards().length > 0"
              class="scenario-decision-grid"
              aria-label="Decision tactica rapida"
            >
              <article
                *ngFor="let card of scenarioDecisionCards()"
                class="scenario-decision-card"
                [class]="card.className"
                [title]="card.detail"
              >
                <span class="decision-title">{{ card.title }}</span>
                <strong>{{ card.label }}</strong>
                <span class="decision-metrics">{{ card.metrics }}</span>
                <small>{{ card.detail }}</small>
              </article>
            </div>
            <div class="position-read-controls" aria-label="Scenario summary table controls">
              <label>
                Read
                <select [ngModel]="scenarioSummaryReadFilter()" (ngModelChange)="setScenarioSummaryReadFilter($event)">
                  <option value="all">All</option>
                  <option value="actionable">Actionable</option>
                  <option value="review">Review</option>
                  <option value="strong">Strong</option>
                  <option value="visible">Visible</option>
                  <option value="small">Small signal</option>
                  <option value="noise">Noise</option>
                </select>
              </label>
              <label>
                Sort
                <select [ngModel]="scenarioSummarySortMode()" (ngModelChange)="setScenarioSummarySortMode($event)">
                  <option value="read-desc">Read priority</option>
                  <option value="impact-desc">Impact</option>
                  <option value="xg-desc">xG movement</option>
                  <option value="default">Run order</option>
                </select>
              </label>
              <span class="position-read-count">
                Showing {{ displayedScenarioMatrixSummaryRows().length }} / {{ scenarioMatrixSummaryResults().length }}
              </span>
            </div>
            <div class="position-read-summary tactical-read-summary" aria-label="Scenario summary outcome summary">
              <span
                *ngFor="let item of scenarioSummaryOutcomeSummary()"
                class="read-pill tactical-read-pill"
                [class]="item.className"
                [title]="item.hint"
              >
                {{ item.label }} {{ item.count }}
              </span>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table scenario-matrix-table" role="table" aria-label="Multi-seed tactical scenario summary">
                <div class="matrix-row scenario-matrix-summary-row matrix-row-head" role="row">
                  <span role="columnheader">Scenario</span>
                  <span role="columnheader">Baseline</span>
                  <span role="columnheader">Action</span>
                  <span role="columnheader">Formation</span>
                  <span role="columnheader">Coach read</span>
                  <span role="columnheader">DT tip</span>
                  <span role="columnheader">Read</span>
                  <span role="columnheader">Outcome</span>
                  <span role="columnheader">Seeds</span>
                  <span role="columnheader">Delta xG For avg</span>
                  <span role="columnheader">Delta xG For min/max</span>
                  <span role="columnheader">Delta xG Ag.</span>
                  <span role="columnheader">Delta Shots For/Ag.</span>
                  <span role="columnheader">Delta Poss</span>
                  <span role="columnheader">Delta Zones C/W</span>
                  <span role="columnheader">Delta Opp zones C/W</span>
                  <span role="columnheader">Delta Opp xG C/W</span>
                  <span role="columnheader">Delta Opp wide L/R xG</span>
                </div>
                <div
                  *ngFor="let row of displayedScenarioMatrixSummaryRows(); trackBy: trackByScenarioMatrixSummary"
                  class="matrix-row scenario-matrix-summary-row"
                  role="row"
                >
                  <span role="cell">{{ row.scenario }}</span>
                  <span role="cell">{{ row.baselineScenario }}</span>
                  <span role="cell" [title]="row.actionDetail">{{ summaryActionLabel(row) }}</span>
                  <span role="cell" [title]="scenarioSummaryFormationHint(row)">
                    {{ scenarioSummaryFormationLabel(row) }}
                  </span>
                  <span role="cell" class="shape-move-read" [title]="scenarioSummaryCoachReadDetail(row)">
                    {{ scenarioSummaryCoachRead(row) }}
                  </span>
                  <span role="cell" class="shape-move-read" [class]="scenarioSummaryRecommendationClass(row)" [title]="scenarioSummaryRecommendationDetail(row)">
                    {{ scenarioSummaryRecommendation(row) }}
                  </span>
                  <span
                    role="cell"
                    [class]="scenarioSummaryReadClass(row)"
                    [title]="scenarioSummaryReadReason(row)"
                  >
                    {{ scenarioSummaryRead(row) }}
                  </span>
                  <span
                    role="cell"
                    [class]="scenarioSummaryOutcomeClass(row)"
                    [title]="scenarioSummaryOutcomeReason(row)"
                  >
                    {{ scenarioSummaryOutcome(row) }}
                  </span>
                  <span role="cell">{{ row.seedCount }}</span>
                  <span role="cell" [class]="deltaClass(row.avgUserXgDelta)">
                    {{ fmtDeltaNumber(row.avgUserXgDelta) }}
                  </span>
                  <span role="cell">
                    {{ fmtDeltaNumber(row.minUserXgDelta) }} / {{ fmtDeltaNumber(row.maxUserXgDelta) }}
                  </span>
                  <span role="cell" [class]="deltaClass(-row.avgOpponentXgDelta)">
                    {{ fmtDeltaNumber(row.avgOpponentXgDelta) }}
                  </span>
                  <span role="cell">
                    <span [class]="deltaClass(row.avgUserShotsDelta)">
                      F {{ fmtDeltaNumber(row.avgUserShotsDelta) }}
                    </span>
                    vs
                    <span [class]="deltaClass(-row.avgOpponentShotsDelta)">
                      Ag {{ fmtDeltaNumber(row.avgOpponentShotsDelta) }}
                    </span>
                  </span>
                  <span role="cell" [class]="deltaClass(row.avgUserPossessionDelta)">
                    {{ fmtDeltaNumber(row.avgUserPossessionDelta) }}pp
                  </span>
                  <span role="cell">
                    C {{ fmtDeltaNumber(row.avgUserCentralDelta) }}
                    | W {{ fmtDeltaNumber(row.avgUserWideDelta) }}
                  </span>
                  <span role="cell">
                    C {{ fmtDeltaNumber(row.avgOpponentCentralDelta) }}
                    | W {{ fmtDeltaNumber(row.avgOpponentWideDelta) }}
                  </span>
                  <span role="cell">
                    C {{ fmtDeltaNumber(row.avgOpponentCentralXgDelta) }}
                    | W {{ fmtDeltaNumber(row.avgOpponentWideXgDelta) }}
                  </span>
                  <span role="cell">
                    L {{ fmtDeltaNumber(row.avgOpponentLeftWideXgDelta) }}
                    | R {{ fmtDeltaNumber(row.avgOpponentRightWideXgDelta) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="scenarioBatteryRows().length > 0" class="formation-matrix analysis-matrix scenario-battery">
            <div class="matrix-header">
              <strong>Battery tablero tactico</strong>
              <span>
                {{ scenarioBatteryRows().length }} lecturas - seeds {{ summarySeedStart() }}..{{ summarySeedStart() + scenarioMatrixSmokeSeedCount() - 1 }}
                - {{ scenarioBatteryGroupLabel(scenarioBatteryRows()[0]?.scenarioGroup || scenarioBatteryGroupModel) }}
                - {{ scenarioBatteryCandidateMatches().length }}/{{ scenarioBatteryMatchLimit() }} partidos disponibles
              </span>
              <button type="button" class="matrix-export" (click)="copyScenarioBatteryJson()">
                Copy JSON
              </button>
              <button type="button" class="matrix-export" (click)="downloadScenarioBatteryCsv()">
                CSV
              </button>
            </div>
            <div class="position-read-summary tactical-read-summary" aria-label="Scenario battery notes">
              <span class="read-pill tactical-read-pill read-visible">
                {{ scenarioBatteryScopeHint() }}
              </span>
              <span class="read-pill tactical-read-pill read-stable">
                {{ scenarioBatteryGroupHint() }}
              </span>
              <span class="read-pill tactical-read-pill read-noise">
                {{ scenarioBatteryCoverageHint() }}
              </span>
              <span class="read-pill tactical-read-pill" [class.read-visible]="scenarioBatteryReviewCount() === 0" [class.read-noise]="scenarioBatteryReviewCount() > 0">
                {{ scenarioBatteryReviewHint() }}
              </span>
            </div>
            <div *ngIf="scenarioBatteryReviewItems().length > 0" class="position-read-summary tactical-read-summary" aria-label="Scenario battery review items">
              <span
                *ngFor="let item of scenarioBatteryReviewItems(); trackBy: trackByScenarioBatteryReviewItem"
                class="read-pill tactical-read-pill read-noise"
                [title]="item.detail"
              >
                {{ item.summary }}
              </span>
            </div>
            <div class="matrix-scroll">
              <div class="matrix-table scenario-battery-table" role="table" aria-label="Tactical battery board">
                <div class="matrix-row scenario-battery-row matrix-row-head" role="row">
                  <span role="columnheader">Partido</span>
                  <span role="columnheader">Controlando</span>
                  <span role="columnheader">Grupo</span>
                  <span role="columnheader">Objetivo</span>
                  <span role="columnheader">Contexto</span>
                  <span role="columnheader">Decision</span>
                  <span role="columnheader">Revision</span>
                  <span role="columnheader">Plan</span>
                  <span role="columnheader">Doble</span>
                  <span role="columnheader">Atacar</span>
                  <span role="columnheader">Forma</span>
                  <span role="columnheader">Cuidar</span>
                  <span role="columnheader">Riesgo</span>
                  <span role="columnheader">Amenaza rival</span>
                  <span role="columnheader">Escenarios</span>
                </div>
                <div
                  *ngFor="let row of scenarioBatteryRows(); trackBy: trackByScenarioBattery"
                  class="matrix-row scenario-battery-row"
                  role="row"
                >
                  <span role="cell">{{ row.matchLabel }}</span>
                  <span role="cell">{{ row.controlledTeam }} ({{ row.controlledSide === 'HOME' ? 'local' : 'visitante' }})</span>
                  <span role="cell">{{ scenarioBatteryGroupLabel(row.scenarioGroup) }}</span>
                  <span role="cell">{{ scenarioBatteryCoachObjectiveLabel(row.coachObjective) }}</span>
                  <span role="cell" [title]="row.coachContextDetail">{{ row.coachContext }}</span>
                  <span role="cell" [title]="row.decisionDetail">{{ row.decision }}</span>
                  <span role="cell" [title]="row.reviewDetail">{{ row.review }}</span>
                  <span role="cell" [title]="scenarioBatteryCardDetail(row, 'Plan actual')">
                    {{ scenarioBatteryCardSummary(row, 'Plan actual') }}
                  </span>
                  <span role="cell" [title]="scenarioBatteryCardDetail(row, 'Doble ganancia')">
                    {{ scenarioBatteryCardSummary(row, 'Doble ganancia') }}
                  </span>
                  <span role="cell" [title]="scenarioBatteryCardDetail(row, 'Atacar')">
                    {{ scenarioBatteryCardSummary(row, 'Atacar') }}
                  </span>
                  <span role="cell" [title]="scenarioBatteryCardDetail(row, 'Forma')">
                    {{ scenarioBatteryCardSummary(row, 'Forma') }}
                  </span>
                  <span role="cell" [title]="scenarioBatteryCardDetail(row, 'Cuidar')">
                    {{ scenarioBatteryCardSummary(row, 'Cuidar') }}
                  </span>
                  <span role="cell" [title]="scenarioBatteryRiskCardDetail(row)">
                    {{ scenarioBatteryRiskCardSummary(row) }}
                  </span>
                  <span role="cell" [title]="scenarioBatteryCardDetail(row, 'Amenaza rival')">
                    {{ scenarioBatteryCardSummary(row, 'Amenaza rival') }}
                  </span>
                  <span role="cell">{{ row.scenarioCount }} x {{ row.seedCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <!-- Panel C: Match list (full width) -->
        <section class="panel panel-c" aria-labelledby="panel-c-heading">
          <h2 id="panel-c-heading" class="panel-title">Panel C - Matches</h2>
          <p class="panel-hint">Click a match to load its detail in Panel A and the scrubber in Panel D.</p>
          <div *ngIf="rounds().length === 0" class="empty-rounds">
            <p>No matches in the active career.</p>
          </div>
          <ul class="rounds-list" *ngIf="rounds().length > 0">
            <li *ngFor="let r of rounds(); trackBy: trackByRound" class="round-block">
              <div class="round-header">
                <span class="round-label">Round {{ r.round }}</span>
                <span *ngIf="r.byeTeam" class="round-bye">BYE: {{ r.byeTeam }}</span>
              </div>
              <ul class="match-list">
                <li
                  *ngFor="let m of r.matches; trackBy: trackByMatchId"
                  class="match-row"
                  data-testid="match-row"
                  [attr.data-match-id]="m.matchId"
                  [class.match-row-selected]="m.matchId === selectedMatchId()"
                  (click)="selectMatch(m)"
                  (keyup.enter)="selectMatch(m)"
                  tabindex="0"
                  [attr.aria-pressed]="m.matchId === selectedMatchId()"
                  [attr.aria-label]="'Match ' + m.homeTeamName + ' vs ' + m.awayTeamName + ', status ' + m.status"
                >
                  <span class="match-teams">
                    <span class="team-home">{{ m.homeTeamName }}</span>
                    <span class="team-sep">vs</span>
                    <span class="team-away">{{ m.awayTeamName }}</span>
                  </span>
                  <span class="match-score">
                    <ng-container *ngIf="m.homeGoals !== null && m.awayGoals !== null; else pendingScore">
                      {{ m.homeGoals }} - {{ m.awayGoals }}
                    </ng-container>
                    <ng-template #pendingScore>?</ng-template>
                  </span>
                  <span class="match-status" [attr.data-status]="m.status">{{ m.status }}</span>
                </li>
              </ul>
            </li>
          </ul>
        </section>
        <!-- Panel D: Timeline scrubber (F3) -->
        <section class="panel panel-d" aria-labelledby="panel-d-heading">
          <h2 id="panel-d-heading" class="panel-title">Panel D - Timeline Scrubber</h2>
          <p class="panel-hint" *ngIf="!selectedMatchId()">
            Select a match in Panel C to use the timeline scrubber.
          </p>
          <div *ngIf="selectedMatchId()" class="scrubber-content">
            <div class="scrubber-header">
              <span class="minute-label">Minute {{ selectedMinute() }}</span>
              <span *ngIf="timelineSnapshot() as snap" class="match-context">
                of {{ snap.events.length }} events
              </span>
            </div>
            <input
              type="range"
              class="minute-slider"
              min="0"
              [max]="TIMELINE_MAX_MINUTE"
              [step]="TIMELINE_STEP"
              [value]="selectedMinute()"
              (input)="onSliderInput($event)"
              [attr.aria-label]="'Match minute, currently ' + selectedMinute()"
              [attr.aria-valuemin]="0"
              [attr.aria-valuemax]="TIMELINE_MAX_MINUTE"
              [attr.aria-valuenow]="selectedMinute()"
              [disabled]="timelineLoading()"
            />
            <div class="minute-ticks" aria-hidden="true">
              <span *ngFor="let m of minuteTicks" class="tick" [class.tick-active]="m === selectedMinute()">
                {{ m }}
              </span>
            </div>
            <!-- Loading skeleton -->
            <div *ngIf="timelineLoading()" class="scrubber-skeleton" aria-live="polite">
              <div class="skeleton-row skeleton-score"></div>
              <div class="skeleton-grid">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
              </div>
            </div>
            <!-- Snapshot content -->
            <ng-container *ngIf="!timelineLoading() && timelineSnapshot() as snap">
              <div class="scrubber-score" role="status" aria-live="polite">
                <span class="score-home">{{ snap.homeGoals }}</span>
                <span class="score-sep">-</span>
                <span class="score-away">{{ snap.awayGoals }}</span>
              </div>
              <div class="metric-grid">
                <div class="metric-card">
                  <span class="metric-label">Home xG</span>
                  <span class="metric-value">{{ snap.homeXg | number:'1.2-2' }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Away xG</span>
                  <span class="metric-value">{{ snap.awayXg | number:'1.2-2' }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Home Shots</span>
                  <span class="metric-value">{{ snap.homeShots }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Away Shots</span>
                  <span class="metric-value">{{ snap.awayShots }}</span>
                </div>
              </div>
            </ng-container>
            <!-- Empty / error state -->
            <div *ngIf="!timelineLoading() && !timelineSnapshot() && !timelineError()" class="empty-snapshot">
              <p>Timeline not available for this match (feature off, or no V24 detail persisted).</p>
            </div>
            <div *ngIf="!timelineLoading() && timelineError()" class="error-snapshot" role="alert">
              <p>{{ timelineError() }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 1rem; max-width: 1400px; margin: 0 auto; }
    .test-harness-page { color: var(--text-color, #222); }
    .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0; font-size: 1.5rem; }
    .page-subtitle { margin: 0.25rem 0 0; color: var(--text-muted, #666); font-size: 0.9rem; }
    .link-back { display: inline-block; margin-top: 0.5rem; font-size: 0.85rem; }
    .state-container { padding: 2rem; text-align: center; }
    .state-spinner {
      width: 32px; height: 32px; border: 3px solid #ccc; border-top-color: #1976d2;
      border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .test-harness-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "a b"
        "e e"
        "c c"
        "d d";
      gap: 1rem;
    }
    @media (max-width: 767px) {
      .test-harness-grid {
        grid-template-columns: 1fr;
        grid-template-areas: "a" "b" "e" "c" "d";
      }
    }
    .panel { border: 1px solid var(--border-color, #e0e0e0); border-radius: 6px; padding: 1rem; background: var(--panel-bg, #fff); }
    .panel-a { grid-area: a; min-height: 320px; }
    .panel-b { grid-area: b; }
    .panel-e { grid-area: e; }
    .panel-c { grid-area: c; }
    .panel-d { grid-area: d; }
    .panel-title { margin: 0 0 0.5rem; font-size: 1rem; }
    .panel-hint { margin: 0 0 1rem; color: var(--text-muted, #666); font-size: 0.85rem; }
    .selected-match-context {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
      margin: 0 0 0.85rem;
      padding: 0.65rem;
      border-radius: 8px;
      border: 1px solid rgba(25, 118, 210, 0.28);
      background: rgba(25, 118, 210, 0.06);
    }
    .context-chip {
      min-width: 0;
      padding: 0.45rem 0.55rem;
      border-radius: 6px;
      background: var(--panel-bg, #fff);
      border: 1px solid rgba(25, 118, 210, 0.16);
      line-height: 1.25;
    }
    .context-chip-wide { grid-column: 1 / -1; }
    .context-label {
      display: block;
      margin-bottom: 0.15rem;
      color: var(--text-muted, #666);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
    }
    .context-chip strong {
      display: block;
      overflow-wrap: anywhere;
      font-size: 0.88rem;
    }
    .compare-workflow-card {
      margin: 0 0 0.9rem;
      padding: 0.7rem;
      border-radius: 8px;
      border: 1px solid rgba(46, 125, 50, 0.28);
      background: linear-gradient(180deg, rgba(46, 125, 50, 0.08), rgba(25, 118, 210, 0.045));
    }
    .compare-workflow-header {
      margin-bottom: 0.55rem;
    }
    .compare-workflow-header strong {
      display: block;
      color: #143f28;
      font-size: 0.9rem;
      line-height: 1.2;
    }
    .compare-workflow-steps {
      display: grid;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .compare-workflow-steps li {
      display: grid;
      grid-template-columns: 2.2rem 1fr;
      gap: 0.5rem;
      align-items: start;
      padding: 0.48rem 0.55rem;
      border-radius: 7px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      background: rgba(255, 255, 255, 0.78);
    }
    .compare-workflow-steps li.active {
      border-color: rgba(25, 118, 210, 0.34);
      background: rgba(25, 118, 210, 0.08);
    }
    .compare-workflow-steps li.done {
      border-color: rgba(46, 125, 50, 0.34);
      background: rgba(46, 125, 50, 0.09);
    }
    .workflow-step-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.75rem;
      height: 1.75rem;
      border-radius: 999px;
      color: #fff;
      background: #78909c;
      font-size: 0.68rem;
      font-weight: 900;
    }
    .compare-workflow-steps li.active .workflow-step-status {
      background: #1976d2;
    }
    .compare-workflow-steps li.done .workflow-step-status {
      background: #2e7d32;
    }
    .compare-workflow-steps strong {
      display: block;
      color: #183326;
      font-size: 0.82rem;
      line-height: 1.2;
    }
    .compare-workflow-steps small {
      display: block;
      margin-top: 0.1rem;
      color: var(--text-muted, #555);
      font-size: 0.74rem;
      line-height: 1.25;
    }
    @media (max-width: 767px) {
      .selected-match-context { grid-template-columns: 1fr; }
      .context-chip-wide { grid-column: auto; }
    }
    .formation-field { width: 100%; }
    .seed-field, .round-field { width: 100%; }
    .swap-selector-row {
      display: grid;
      grid-template-columns: 1fr 1fr minmax(110px, 0.45fr);
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .swap-field, .swap-seed-count-field { width: 100%; }
    @media (max-width: 767px) {
      .swap-selector-row { grid-template-columns: 1fr; }
    }
    .control-group-divider {
      height: 1px;
      background: var(--border-color, #e0e0e0);
      margin: 1rem 0;
    }
    .button-stack { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .harness-warning {
      margin: 0.75rem 0 0;
      padding: 0.55rem 0.7rem;
      border-radius: 6px;
      background: #fff8e1;
      color: #795548;
      border: 1px solid #ffe0a3;
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .analysis-ready-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin: 0.75rem 0 0;
      padding: 0.6rem 0.7rem;
      border: 1px solid rgba(34, 197, 94, 0.45);
      border-radius: 6px;
      background: rgba(34, 197, 94, 0.12);
      color: #166534;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.35;
    }
    .analysis-ready-banner button {
      border: 0;
      border-radius: 999px;
      background: #166534;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 800;
      padding: 0.32rem 0.6rem;
      white-space: nowrap;
    }
    .analysis-ready-banner button:hover {
      background: #14532d;
    }
    .formation-matrix {
      margin-top: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      background: #fafafa;
    }
    .panel-e .formation-matrix {
      margin-top: 0.75rem;
    }
    .matrix-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: var(--text-muted, #666);
      background: #f3f6f3;
    }
    .matrix-export {
      border: 1px solid #cfd8dc;
      border-radius: 999px;
      background: #fff;
      color: #2e5f3e;
      font-size: 0.72rem;
      padding: 0.18rem 0.55rem;
      cursor: pointer;
    }
    .controlled-team-badge {
      border: 1px solid #1565c0;
      border-radius: 999px;
      background: #eaf4ff;
      color: #0d47a1;
      font-size: 0.74rem;
      font-weight: 900;
      padding: 0.18rem 0.6rem;
    }
    .analysis-context-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: -0.35rem 0 0.75rem;
    }
    .matrix-scroll {
      overflow-x: auto;
      width: 100%;
      border-top: 1px solid #edf2ee;
      scrollbar-color: #9bb8a4 #edf2ee;
    }
    .matrix-scroll-hint {
      position: sticky;
      left: 0;
      width: max-content;
      max-width: 100%;
      padding: 0.25rem 0.75rem;
      color: var(--text-muted, #667);
      font-size: 0.72rem;
      font-weight: 700;
      background: linear-gradient(90deg, #fbfdfb 70%, rgba(251, 253, 251, 0));
      z-index: 1;
    }
    .matrix-table { display: grid; font-size: 0.8rem; min-width: 760px; }
    .matrix-row {
      display: grid;
      grid-template-columns: 72px 62px 92px 78px 78px minmax(128px, 1fr);
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-top: 1px solid #eee;
      font-variant-numeric: tabular-nums;
    }
    .formation-matrix-row {
      grid-template-columns: 120px 82px 126px 82px 86px 86px minmax(190px, 1fr) 92px;
    }
    .position-movement-table {
      min-width: 1540px;
      font-size: 0.74rem;
    }
    .position-movement-table .matrix-row {
      grid-template-columns:
        126px 112px 128px
        72px 74px 72px 72px 72px
        120px 120px 96px 126px 96px 72px;
      gap: 0.35rem;
      padding: 0.34rem 0.65rem;
      align-items: center;
    }
    .position-movement-table .matrix-row > span {
      white-space: normal;
      line-height: 1.2;
    }
    .position-movement-table .matrix-row > span:nth-child(4),
    .position-movement-table .matrix-row > span:nth-child(5),
    .position-movement-table .matrix-row > span:nth-child(6),
    .position-movement-table .matrix-row > span:nth-child(7),
    .position-movement-table .matrix-row > span:nth-child(8) {
      text-align: right;
      white-space: nowrap;
    }
    .position-movement-table .matrix-row > span:nth-child(9),
    .position-movement-table .matrix-row > span:nth-child(10) {
      font-size: 0.7rem;
      white-space: nowrap;
    }
    .shape-move-read {
      color: #245b39;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .coach-pick-label {
      display: block;
      margin-bottom: 0.25rem;
      color: #4f6f5c;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .coach-pick-card > strong {
      display: block;
      margin: 0.2rem 0;
    }
    .coach-pick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.6rem;
      max-width: 980px;
      margin: 0.65rem 0;
    }
    .coach-pick-card {
      border: 1px solid #e0e9e4;
      border-radius: 10px;
      padding: 0.55rem 0.65rem;
      background: rgba(255, 255, 255, 0.72);
    }
    .coach-pick-card .shape-move-read {
      display: block;
      margin-top: 0.25rem;
      line-height: 1.25;
    }
    .context-review-card {
      grid-column: span 2;
    }
    @media (max-width: 820px) {
      .context-review-card {
        grid-column: span 1;
      }
    }
    .context-summary-counts {
      display: grid;
      grid-template-columns: repeat(3, minmax(58px, 1fr));
      gap: 0.3rem;
      margin: 0.25rem 0;
    }
    .context-summary-counts span {
      border: 1px solid #dde8e1;
      border-radius: 8px;
      padding: 0.24rem 0.35rem;
      color: #244733;
      font-size: 0.74rem;
      line-height: 1.15;
      text-align: center;
      white-space: nowrap;
    }
    .context-summary-counts strong {
      display: block;
      color: #102719;
      font-size: 0.68rem;
    }
    .context-review-details {
      display: grid;
      gap: 0.18rem;
      margin: 0.25rem 0;
    }
    .context-review-details small {
      display: block;
      color: #7f4b12;
      font-weight: 700;
      line-height: 1.25;
      white-space: normal;
    }
    .qa-checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0.65rem;
      margin-top: 0.65rem;
      max-width: 940px;
    }
    .qa-run-all-button {
      border: 1px solid #9fc9b2;
      border-radius: 999px;
      padding: 0.38rem 0.8rem;
      background: #e8f6ee;
      color: #145a32;
      cursor: pointer;
      font-size: 0.74rem;
      font-weight: 900;
      white-space: nowrap;
    }
    .qa-run-all-button:hover:not(:disabled) {
      background: #d8efdf;
    }
    .qa-run-all-button:disabled {
      border-color: #d8dfdc;
      background: #f3f5f4;
      color: #7d8983;
      cursor: not-allowed;
    }
    .qa-check-card {
      border: 1px solid #e0e9e4;
      border-radius: 12px;
      padding: 0.65rem 0.75rem;
      background: rgba(255, 255, 255, 0.76);
    }
    .qa-check-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.55rem;
      margin-bottom: 0.55rem;
    }
    .qa-check-card-header strong {
      color: #102719;
      line-height: 1.2;
    }
    .qa-verdict-badge {
      border-radius: 999px;
      padding: 0.18rem 0.48rem;
      font-size: 0.68rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .qa-verdict-ok {
      background: #dff5e7;
      color: #176236;
    }
    .qa-verdict-fallback {
      background: #fff4cd;
      color: #7a5410;
    }
    .qa-verdict-review {
      background: #ffe0df;
      color: #8a2724;
    }
    .qa-verdict-pending {
      background: #eef2f0;
      color: #57635d;
    }
    .qa-check-card dl {
      display: grid;
      gap: 0.45rem;
      margin: 0;
    }
    .qa-check-card dl div {
      display: grid;
      gap: 0.12rem;
    }
    .qa-check-card dt {
      color: #5d7468;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .qa-check-card dd {
      margin: 0;
      color: #25382f;
      font-size: 0.75rem;
      line-height: 1.25;
    }
    .qa-action-button {
      margin-top: 0.65rem;
      border: 1px solid #b9d7c6;
      border-radius: 999px;
      padding: 0.32rem 0.7rem;
      background: #f4faf6;
      color: #176236;
      cursor: pointer;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .qa-action-button:hover:not(:disabled) {
      background: #e7f5ed;
    }
    .qa-action-button:disabled {
      border-color: #d8dfdc;
      background: #f3f5f4;
      color: #7d8983;
      cursor: not-allowed;
    }
    .qa-action-status {
      display: block;
      margin-top: 0.35rem;
      border-radius: 8px;
      padding: 0.28rem 0.45rem;
      font-size: 0.7rem;
      font-weight: 800;
      line-height: 1.2;
    }
    .qa-action-status-running {
      background: #eef5ff;
      color: #245384;
    }
    .qa-action-status-done {
      background: #e4f7eb;
      color: #176236;
    }
    .qa-action-status-error {
      background: #ffe5e3;
      color: #8a2724;
    }
    .qa-evidence-note {
      margin-top: 0.75rem;
      padding: 0.85rem 1rem;
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 12px;
      color: #8a5b05;
      background: rgba(255, 247, 214, 0.86);
      line-height: 1.45;
      font-weight: 700;
    }
    .tactical-read-coach-note {
      display: block;
      margin-top: 0.15rem;
      max-width: 18rem;
      color: rgba(36, 91, 57, 0.82);
      font-size: 0.66rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: normal;
    }
    .position-before-after {
      display: grid;
      gap: 0.15rem;
      margin: 0.65rem 0 0;
      border: 1px solid #e2ebe5;
      border-radius: 10px;
      overflow-x: auto;
      font-size: 0.76rem;
      font-variant-numeric: tabular-nums;
    }
    .position-before-after-row {
      display: grid;
      grid-template-columns: 82px 112px 72px 86px 82px 64px 82px 72px 72px 72px 82px;
      gap: 0.45rem;
      min-width: 1040px;
      padding: 0.36rem 0.65rem;
      align-items: center;
      border-top: 1px solid #edf3ef;
    }
    .position-before-after-row:first-child {
      border-top: 0;
    }
    .position-before-after-head {
      background: #f6fbf7;
      color: #356348;
      font-weight: 900;
      text-transform: uppercase;
      font-size: 0.68rem;
    }
    .scenario-matrix-table {
      min-width: 1600px;
    }
    .scenario-matrix-row {
      grid-template-columns:
        190px 72px minmax(240px, 1.5fr)
        78px 78px
        120px 78px
        100px 78px
        110px 78px
        minmax(220px, 1fr) 170px;
    }
    .scenario-matrix-summary-row {
      grid-template-columns:
        190px 150px minmax(240px, 1.5fr)
        150px 96px 108px 64px 100px 130px 100px
        150px 100px 130px 150px 150px 170px;
    }
    .scenario-battery-table {
      min-width: 2200px;
    }
    .scenario-battery-row {
      grid-template-columns:
        220px 180px 86px
        minmax(220px, 1.1fr)
        minmax(180px, 0.9fr)
        minmax(210px, 1fr)
        minmax(210px, 1fr)
        minmax(210px, 1fr)
        minmax(210px, 1fr)
        minmax(210px, 1fr)
        minmax(210px, 1fr)
        90px;
    }
    .diagnostic-team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 1rem;
    }
    .diagnostic-team-card {
      border: 1px solid var(--border-color, #ddd);
      border-radius: 12px;
      padding: 0.85rem;
      background: rgba(255, 255, 255, 0.04);
    }
    .diagnostic-team-card h3 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
    }
    .diagnostic-team-card p {
      margin: 0 0 0.65rem;
      color: var(--text-muted, #777);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .width-diagnostic-card {
      display: grid;
      gap: 0.45rem;
      margin: 0 0 0.75rem;
      padding: 0.65rem;
      border-radius: 12px;
      background: rgba(20, 55, 35, 0.08);
      border: 1px solid rgba(65, 150, 95, 0.18);
    }
    .width-diagnostic-card > div:first-child {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .width-diagnostic-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .width-diagnostic-stats span {
      border-radius: 999px;
      padding: 0.12rem 0.45rem;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted, #777);
      font-size: 0.74rem;
      font-weight: 800;
    }
    .width-diagnostic-card p {
      margin: 0;
      font-weight: 600;
      line-height: 1.35;
    }
    .width-ok {
      color: #1f9d61;
    }
    .width-partial {
      color: #a67c00;
    }
    .width-review {
      color: #c73333;
    }
    .diagnostic-muted {
      color: var(--text-muted, #777);
      font-size: 0.78rem;
    }
    .diagnostic-read {
      max-width: 220px;
      min-width: 160px;
      white-space: normal;
      color: var(--text-muted, #777);
    }
    .assignment-verdict {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.1rem 0.45rem;
      font-size: 0.72rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .assignment-ok {
      background: rgba(31, 185, 109, 0.18);
      color: #1f9d61;
    }
    .assignment-neutral {
      background: rgba(214, 178, 66, 0.18);
      color: #a67c00;
    }
    .assignment-review {
      background: rgba(255, 88, 88, 0.18);
      color: #c73333;
    }
    .source-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.12rem 0.45rem;
      background: #eef3ef;
      color: #31583b;
      font-size: 0.72rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .source-pill.source-custom {
      background: #fff4cc;
      color: #8a5a00;
      border: 1px solid #f3c84f;
    }
    .inline-progress {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 0 0.75rem;
      border-radius: 999px;
      background: #eef7ff;
      color: #0d47a1;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .matrix-row > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .delta-positive {
      color: #087f23;
      font-weight: 700;
    }
    .delta-negative {
      color: #b71c1c;
      font-weight: 700;
    }
    .delta-neutral {
      color: var(--text-muted, #777);
    }
    .read-stable {
      color: var(--text-muted, #777);
      font-weight: 700;
    }
    .read-visible {
      color: #1565c0;
      font-weight: 700;
    }
    .read-strong {
      color: #ef6c00;
      font-weight: 700;
    }
    .read-check {
      color: #b71c1c;
      font-weight: 800;
    }
    .position-read-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
      margin: 0.35rem 0 0.65rem;
    }
    .tactical-read-summary {
      margin-top: -0.25rem;
    }
    .read-pill {
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 0.16rem 0.5rem;
      background: rgba(255, 255, 255, 0.66);
      font-size: 0.74rem;
      font-weight: 800;
    }
    .tactical-read-pill {
      background: rgba(46, 95, 62, 0.06);
    }
    .diagonal-summary {
      margin: 0.35rem 0 0.8rem;
    }
    .diagonal-summary strong {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .summary-jump-btn {
      align-self: flex-start;
      border: 1px solid #8fb99c;
      border-radius: 999px;
      padding: 0.18rem 0.55rem;
      background: #f5fff7;
      color: #245d35;
      font-size: 0.72rem;
      font-weight: 900;
      cursor: pointer;
    }
    .summary-jump-btn:hover {
      background: #e5f7ea;
    }
    .position-row-highlight {
      outline: 2px solid #f5c542;
      outline-offset: -2px;
      background: rgba(245, 197, 66, 0.18);
    }
    .scenario-decision-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.55rem;
      margin: 0.1rem 0 0.8rem;
    }
    .scenario-decision-card {
      display: flex;
      flex-direction: column;
      gap: 0.22rem;
      min-height: 92px;
      padding: 0.55rem 0.65rem;
      border: 1px solid #dbe7dd;
      border-left: 4px solid #9e9e9e;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .scenario-decision-card .decision-title {
      color: var(--text-muted, #666);
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .scenario-decision-card strong {
      color: #163f28;
      font-size: 0.86rem;
      line-height: 1.15;
    }
    .scenario-decision-card .decision-metrics {
      font-size: 0.78rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .scenario-decision-card small {
      color: var(--text-muted, #555);
      font-size: 0.72rem;
      line-height: 1.2;
    }
    .scenario-decision-card.decision-attack {
      border-left-color: #1565c0;
      background: #f7fbff;
    }
    .scenario-decision-card.decision-shape {
      border-left-color: #6a1b9a;
      background: #fbf7ff;
    }
    .scenario-decision-card.decision-safe {
      border-left-color: #2e7d32;
      background: #f7fff8;
    }
    .scenario-decision-card.decision-risk {
      border-left-color: #b71c1c;
      background: #fff7f7;
    }
    .read-alert {
      border-radius: 999px;
      padding: 0.16rem 0.55rem;
      background: rgba(183, 28, 28, 0.1);
      color: #b71c1c;
      font-size: 0.74rem;
      font-weight: 800;
    }
    .position-read-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
      margin: 0 0 0.75rem;
      color: var(--text-muted, #555);
      font-size: 0.78rem;
    }
    .position-read-controls label {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 700;
    }
    .position-read-controls select {
      border: 1px solid #d6e4d8;
      border-radius: 999px;
      padding: 0.18rem 0.5rem;
      background: #fff;
      color: var(--text-color, #1f2d24);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .position-read-count {
      margin-left: auto;
      font-weight: 700;
    }
    .matrix-row-head {
      font-weight: 700;
      color: var(--text-muted, #555);
      background: #fff;
    }
    .rounds-list { list-style: none; margin: 0; padding: 0; }
    .round-block { margin-bottom: 1rem; }
    .round-header { display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.5rem; }
    .round-label { font-weight: 600; }
    .round-bye { font-size: 0.8rem; color: var(--text-muted, #888); }
    .match-list { list-style: none; margin: 0; padding: 0; border: 1px solid #eee; border-radius: 4px; }
    .match-row {
      display: grid;
      grid-template-columns: 2fr 80px 100px;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.1s;
    }
    .match-row:last-child { border-bottom: none; }
    .match-row:hover { background: #f8f8f8; }
    .match-row:focus { outline: 2px solid #1976d2; outline-offset: -2px; }
    .match-row-selected { background: #e3f2fd !important; }
    .match-teams { display: flex; gap: 0.5rem; }
    .team-sep { color: var(--text-muted, #888); }
    .match-score { text-align: center; font-variant-numeric: tabular-nums; }
    .match-status { text-align: right; font-size: 0.8rem; color: var(--text-muted, #666); }
    .empty-rounds { color: var(--text-muted, #666); font-size: 0.9rem; }
    .state-icon { font-weight: 700; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .info-icon { color: #1976d2; }
    .error-icon { color: #d32f2f; }
    .error-text { color: #d32f2f; }
    /* === Panel D: timeline scrubber === */
    .scrubber-content { display: flex; flex-direction: column; gap: 0.75rem; }
    .scrubber-header { display: flex; align-items: baseline; gap: 0.5rem; }
    .minute-label { font-size: 1.1rem; font-weight: 600; }
    .match-context { font-size: 0.8rem; color: var(--text-muted, #888); }
    .minute-slider { width: 100%; cursor: pointer; }
    .minute-slider:disabled { cursor: not-allowed; opacity: 0.6; }
    .minute-ticks {
      display: flex; justify-content: space-between;
      font-size: 0.7rem; color: var(--text-muted, #888);
      font-variant-numeric: tabular-nums;
    }
    .tick { padding: 0 0.25rem; }
    .tick-active { color: #1976d2; font-weight: 600; }
    .scrubber-score {
      font-size: 2rem; font-weight: 700;
      display: flex; justify-content: center; gap: 0.5rem;
      font-variant-numeric: tabular-nums;
      margin: 0.5rem 0;
    }
    .score-home { color: #1565c0; }
    .score-away { color: #c62828; }
    .score-sep { color: var(--text-muted, #888); }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
    }
    .current-replay-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .qa-readable-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid rgba(46, 125, 50, 0.28);
      border-radius: 8px;
      background: rgba(46, 125, 50, 0.08);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #1b1b1b);
    }
    .qa-readable-strip span {
      white-space: nowrap;
    }
    .current-replay-starters {
      margin-top: 0.75rem;
      line-height: 1.4;
    }
    .metric-card {
      display: flex; flex-direction: column; align-items: center;
      padding: 0.5rem; border: 1px solid #eee; border-radius: 4px;
      background: #fafafa;
    }
    .metric-label { font-size: 0.75rem; color: var(--text-muted, #666); }
    .metric-value { font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .empty-snapshot { color: var(--text-muted, #666); font-size: 0.85rem; padding: 0.5rem 0; }
    .error-snapshot { color: #d32f2f; font-size: 0.85rem; padding: 0.5rem 0; }
    .scrubber-skeleton { display: flex; flex-direction: column; gap: 0.5rem; }
    .skeleton-row { background: #eee; height: 32px; border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; }
    .skeleton-card { background: #eee; height: 56px; border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `],
})
export class TestHarnessPageComponent implements OnInit, OnDestroy {
  private careerService = inject(CareerService);
  private matchDetailApi = inject(MatchDetailApiService);
  private harness = inject(TestHarnessService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private readonly AUTO_PLAYER_SWAP_STARTER = '__AUTO_STARTER';
  private readonly AUTO_PLAYER_SWAP_BENCH = '__AUTO_BENCH';
  private readonly formationPositionsByName = signal<Record<string, FormationDTO['positions']>>({});
  /** Allowed formation codes (UI select options). */
  readonly formationCodes: readonly FormationCode[] = FORMATION_CODES;
  readonly teamStyleOptions: readonly TeamStyleOption[] = [
    { value: 'BALANCED', label: 'Balanceado', hint: 'Sin sesgo de canal.' },
    { value: 'WIDE_PLAY', label: 'Bandas', hint: 'Busca m?s ataques y remates por los costados.' },
    { value: 'LEFT_FLANK', label: 'Canal izquierdo', hint: 'Carga ataques por el canal izquierdo del modelo.' },
    { value: 'RIGHT_FLANK', label: 'Canal derecho', hint: 'Carga ataques por el canal derecho del modelo.' },
    { value: 'CENTRAL_PLAY', label: 'Centro', hint: 'Concentra juego interior y remates centrales.' },
    { value: 'ATTACKING', label: 'Ofensivo', hint: 'Sube volumen general de chances.' },
    { value: 'DEFENSIVE', label: 'Defensivo', hint: 'Baja ritmo y prioriza protecci?n.' },
    { value: 'COUNTER', label: 'Contra', hint: 'Menos posesi?n, m?s transici?n.' },
    { value: 'POSSESSION', label: 'Posesi?n', hint: 'M?s posesi?n y elaboraci?n.' },
  ];
  /** Constants exposed to the template. */
  readonly TIMELINE_MAX_MINUTE = TIMELINE_MAX_MINUTE;
  readonly TIMELINE_STEP = TIMELINE_STEP;
  /** Tick marks shown below the slider. */
  readonly minuteTicks: readonly number[] = (() => {
    const ticks: number[] = [];
    for (let m = 0; m <= TIMELINE_MAX_MINUTE; m += TIMELINE_STEP) {
      ticks.push(m);
    }
    return ticks;
  })();
  /** Selected formation (two-way bound to mat-select via ngModel). */
  selectedFormationModel: FormationCode | null = '4-3-3';
  selectedStyleModel: TeamStyle = 'BALANCED';
  selectedSwapStarterIdModel: string | null = null;
  selectedSwapBenchIdModel: string | null = null;
  playerSwapSeedCountModel = 10;
  playerSwapBatteryModeModel: 'natural' | 'mixed' | 'stress' = 'natural';
  playerSwapBatteryPrecisionModel: 'quick' | 'balanced' | 'reliable' = 'balanced';
  controlledTeamSideModel: ControlledTeamSide = 'USER';
  roleSlotImpactSlotIdModel = 'S06-3';
  readonly roleSlotImpactSlotOptions = [
    { slotId: 'S04-1', label: 'LW alto · S04-1', kind: 'wideAtt' },
    { slotId: 'S06-3', label: 'RW alto · S06-3', kind: 'wideAtt' },
    { slotId: 'S05-2', label: 'ST centro · S05-2', kind: 'att' },
    { slotId: 'S17-2', label: 'CM centro · S17-2', kind: 'mid' },
    { slotId: 'S22-2', label: 'LB · S22-2', kind: 'def' },
    { slotId: 'S24-2', label: 'RB · S24-2', kind: 'def' },
    { slotId: 'S23-1', label: 'CB izq · S23-1', kind: 'def' },
    { slotId: 'S23-3', label: 'CB der · S23-3', kind: 'def' },
  ] as const;
  scenarioBatteryGroupModel: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT' = 'OFFENSE';
  scenarioBatteryScopeModel: 'quick' | 'balanced' = 'quick';
  scenarioBatteryCoachObjectiveModel: ScenarioBatteryCoachObjectiveModel = 'AUTO';
  /** V24D24.2: seed for the "Replay with seed" button (null = non-reproducible). */
  seedInputModel: number | null = DEFAULT_REPLAY_SEED;
  /** V24D24.2: round selected in the "Simulate round N" dropdown. */
  selectedRoundModel: number | null = null;
  // ============== State signals ==============
  /** The active careerId (resolved from CareerStatus; null if no career). */
  readonly careerId = signal<string | null>(null);
  readonly userTeamName = signal<string | null>(null);
  /** Currently selected match (Panel C click ? Panel A renders). */
  readonly selectedMatchId = signal<string | null>(null);
  readonly detailPanelVisible = signal<boolean>(true);
  readonly detailRefreshToken = signal<number>(0);
  readonly selectedMatch = signal<TestHarnessMatchRow | null>(null);
  /** All matches of the active career, grouped by round. */
  readonly rounds = signal<RoundGroup[]>([]);
  /** True while we are loading the initial data (career + matches). */
  readonly loading = signal<boolean>(true);
  /** True while a mutation (set-formation, reset-injuries, replace-fixtures) is in flight. */
  readonly mutationInFlight = signal<boolean>(false);
  defensiveFallbackRestore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
  defensiveFallbackLabRead: string | null = null;
  /** Error message from the initial load (null when OK). */
  readonly loadError = signal<string | null>(null);
  /** Formation comparison results for selected match + seed. */
  readonly formationReplayResults = signal<FormationReplayResult[]>([]);
  /** Averaged formation comparison across multiple seeds. */
  readonly formationMatrixSummaryResults = signal<FormationMatrixSummaryRow[]>([]);
  readonly professionalSmokeSummary = signal<ProfessionalSmokeSummary | null>(null);
  private professionalSmokeFullPixelRows = 0;
  private professionalSmokeFullRunId = 0;
  readonly lowBlockLabRows = signal<LowBlockLabRow[]>([]);
  readonly backFiveTransitionLabRows = signal<BackFiveTransitionLabRow[]>([]);
  readonly backFiveFamilyLabRows = signal<BackFiveFamilyLabRow[]>([]);
  readonly backFiveFamilyLabScope = signal<string>('');
  readonly backFiveContextSmokeRows = signal<BackFiveContextSmokeRow[]>([]);
  readonly backFiveContextSmokeSummary = computed<BackFiveContextSmokeSummary | null>(() =>
    this.toBackFiveContextSmokeSummary(this.backFiveContextSmokeRows())
  );
  readonly sideMirrorSmokeRows = signal<SideMirrorSmokeRow[]>([]);
  readonly sideMirrorSmokeMode = signal<'real' | 'synthetic'>('real');
  readonly realSideMirrorRows = signal<SideMirrorSmokeRow[]>([]);
  readonly syntheticSideMirrorRows = signal<SideMirrorSmokeRow[]>([]);
  readonly sideMirrorDecisionRows = computed<SideMirrorDecisionRow[]>(() => {
    const realRows = this.realSideMirrorRows();
    const syntheticRows = this.syntheticSideMirrorRows();
    if (realRows.length === 0 || syntheticRows.length === 0) return [];
    const realByFormation = new Map(realRows.map((row) => [row.formation, row]));
    return syntheticRows
      .map((synthetic) => {
        const real = realByFormation.get(synthetic.formation);
        if (!real) return null;
        const syntheticOk = synthetic.verdict === 'OK';
        const realOk = real.verdict === 'OK';
        const decision = syntheticOk && realOk
          ? 'Sano: motor y caso real responden.'
          : syntheticOk
            ? 'Motor sano: revisar plantel, roles, ancho y quimica real.'
            : realOk
              ? 'Caso real compensa, pero el control sintetico pide revisar formacion/motor.'
              : 'Revisar formacion/motor antes de calibrar plantel.';
        const className = syntheticOk && realOk
          ? 'read-strong'
          : syntheticOk
            ? 'read-visible'
            : 'read-check';
        const width = this.formationWidthRead(synthetic.formation);
        return {
          formation: synthetic.formation,
          syntheticVerdict: synthetic.verdict,
          realVerdict: real.verdict,
          syntheticEdges: `R ${this.fmtDeltaNumber(synthetic.weakLeftRightEdge)} / L ${this.fmtDeltaNumber(synthetic.weakRightLeftEdge)}`,
          realEdges: `R ${this.fmtDeltaNumber(real.weakLeftRightEdge)} / L ${this.fmtDeltaNumber(real.weakRightLeftEdge)}`,
          widthRead: width.read,
          widthClass: width.className,
          decision,
          className,
        };
      })
      .filter((row): row is SideMirrorDecisionRow => row !== null)
      .sort((a, b) => {
        const order = (row: SideMirrorDecisionRow) =>
          row.syntheticVerdict === 'OK' && row.realVerdict !== 'OK' ? 0
            : row.syntheticVerdict !== 'OK' ? 1
              : 2;
        return order(a) - order(b) || a.formation.localeCompare(b.formation);
      });
  });
  readonly sideMirrorSmokeSummary = computed<SideMirrorSmokeSummary | null>(() => {
    const rows = this.sideMirrorSmokeRows();
    if (rows.length === 0) return null;
    const ok = rows.filter((row) => row.verdict === 'OK').length;
    const partial = rows.filter((row) => row.verdict === 'Parcial').length;
    const review = rows.filter((row) => row.verdict === 'Revisar').length;
    const avgWeakLeftExpectedEdge = this.roundTo(
      rows.reduce((sum, row) => sum + row.weakLeftRightEdge, 0) / rows.length,
      3
    );
    const avgWeakRightExpectedEdge = this.roundTo(
      rows.reduce((sum, row) => sum + row.weakRightLeftEdge, 0) / rows.length,
      3
    );
    const mirrorGap = this.roundTo(avgWeakLeftExpectedEdge - avgWeakRightExpectedEdge, 3);
    const balanced = Math.abs(mirrorGap) <= 0.025;
    const read = balanced
      ? 'Espejo bastante equilibrado: ambos lados responden parecido en promedio.'
      : mirrorGap > 0
        ? 'El lado weak-left responde mas fuerte: revisar si el plantel/formacion carga mejor por derecha.'
        : 'El lado weak-right responde mas fuerte: revisar si el plantel/formacion carga mejor por izquierda.';
    const className = ok >= Math.ceil(rows.length * 0.6) && balanced
      ? 'read-strong'
      : review > 0
        ? 'read-check'
        : 'read-visible';
    return {
      total: rows.length,
      ok,
      partial,
      review,
      avgWeakLeftExpectedEdge,
      avgWeakRightExpectedEdge,
      mirrorGap,
      read,
      className,
    };
  });
  readonly wingbackLabRows = computed<WingbackLabRow[]>(() =>
    this.sideMirrorSmokeRows()
      .filter((row) => row.wingbackRead !== 'Sin LWB/RWB')
      .map((row) => {
        const expectedEdgeAvg = this.roundTo((row.weakLeftRightEdge + row.weakRightLeftEdge) / 2, 3);
        const expectedEdgeMin = this.roundTo(Math.min(row.weakLeftRightEdge, row.weakRightLeftEdge), 3);
        const sideGap = this.roundTo(Math.abs(row.weakLeftRightEdge - row.weakRightLeftEdge), 3);
        const lowWingbacks = row.wingbackRead.includes('bajos');
        const attackRead = expectedEdgeAvg >= 0.055
          ? 'Ataque lateral fuerte'
          : expectedEdgeAvg >= 0.025
            ? 'Ataque lateral visible'
            : 'Ataque lateral bajo';
        const diagnosis = row.verdict === 'OK'
          ? 'Carrileros/anchura responden bien en ambos lados.'
          : expectedEdgeMin < 0.005 && !lowWingbacks
            ? 'Carrileros medios: revisar por qué un lado no genera ventaja.'
            : expectedEdgeAvg < 0.025 && lowWingbacks
              ? 'Carrileros bajos: lectura conservadora esperable; revisar si se buscaba atacar.'
              : sideGap > 0.055
                ? 'Respuesta asimétrica: revisar plantel o sesgo de lado.'
                : 'Señal parcial razonable: ajustar solo si el plan era cargar bandas.';
        const className = row.verdict === 'OK'
          ? 'read-strong'
          : expectedEdgeMin < 0.005 && !lowWingbacks
            ? 'read-check'
            : 'read-visible';
        return {
          formation: row.formation,
          wingbackRead: row.wingbackRead,
          wingbackClass: row.wingbackClass,
          verdict: row.verdict,
          expectedEdgeAvg,
          expectedEdgeMin,
          sideGap,
          attackRead,
          diagnosis,
          className,
        };
      })
      .sort((a, b) => {
        const aLow = a.wingbackRead.includes('bajos') ? 1 : 0;
        const bLow = b.wingbackRead.includes('bajos') ? 1 : 0;
        return aLow - bLow || b.expectedEdgeAvg - a.expectedEdgeAvg || a.formation.localeCompare(b.formation);
      })
  );
  readonly formationCoachSummary = computed<FormationCoachSummary | null>(() => {
    const rows = this.formationMatrixSummaryResults();
    if (rows.length === 0) return null;
    const byMax = (score: (row: FormationMatrixSummaryRow) => number) =>
      [...rows].sort((a, b) => score(b) - score(a))[0];
    const byMin = (score: (row: FormationMatrixSummaryRow) => number) =>
      [...rows].sort((a, b) => score(a) - score(b))[0];
    const bestBalance = byMax((row) =>
      row.avgXgDiff * 1.3
      + row.avgShotDiff * 0.035
      + row.avgPossessionFor * 0.004
      - row.avgXgAgainst * 0.15
    );
    const bestAttack = byMax((row) =>
      row.avgXgFor * 1.1
      + row.avgShotsFor * 0.018
      + row.avgShapeAttackVolumeMultiplier * 0.12
    );
    const safest = byMin((row) =>
      row.avgXgAgainst * 1.15
      + row.avgShotsAgainst * 0.018
      - row.avgShapeDefensiveResistanceMultiplier * 0.10
    );
    const avoid = byMin((row) =>
      row.avgXgDiff * 1.25
      + row.avgShotDiff * 0.035
      - row.avgXgAgainst * 0.20
    );
    return {
      bestBalance: this.toFormationCoachPick('Mejor balance', bestBalance),
      bestAttack: this.toFormationCoachPick('Más ofensiva', bestAttack),
      safest: this.toFormationCoachPick('Más segura', safest),
      avoid: this.toFormationCoachPick('Evitar / revisar', avoid),
    };
  });
  /** One-click proof that the selected match was replayed with the current visual lineup. */
  readonly currentLineupReplayResult = signal<CurrentLineupReplayResult | null>(null);
  /** Current visual lineup averaged across multiple deterministic seeds. */
  readonly currentLineupMultiSeedSummary = signal<CurrentLineupMultiSeedSummary | null>(null);
  /** Direct proof that modal custom pixels change the averaged match output. */
  readonly modalVsCanonicalSummary = signal<ModalVsCanonicalSummary | null>(null);
  /** Backend diagnostic of the exact starting XIs used by the V24 context. */
  readonly lineupDiagnostic = signal<LineupDiagnostic | null>(null);
  /** Automatic starter-vs-bench player swap comparison. */
  readonly playerSwapMatrixSummary = signal<PlayerSwapMatrixSummary | null>(null);
  readonly playerSwapBatterySummaries = signal<PlayerSwapMatrixSummary[]>([]);
  readonly playerSwapPrecisionComparisonRows = signal<PlayerSwapPrecisionComparisonRow[]>([]);
  readonly playerSwapBatterySummary = computed<PlayerSwapBatterySummary>(() => {
    const rows = this.playerSwapBatterySummaries();
    const reads: Record<string, number> = {};
    const fits: Record<string, number> = {};
    for (const row of rows) {
      reads[row.swapRead] = (reads[row.swapRead] ?? 0) + 1;
      fits[row.swapFit] = (fits[row.swapFit] ?? 0) + 1;
    }
    const sorted = [...rows].sort((a, b) => this.playerSwapDecisionScore(b) - this.playerSwapDecisionScore(a));
    const seedCount = rows[0]?.seedCount ?? this.playerSwapSeedCountModel;
    const hasStressRows = rows.some((row) => (row.testCase || '').toLowerCase().includes('stress'));
    const hasNaturalRows = rows.some((row) => (row.testCase || '').toLowerCase().includes('battery: natural'));
    const mode = hasStressRows && hasNaturalRows ? 'combined' : rows[0]?.testCase?.toLowerCase().includes('stress') ? 'stress' : this.playerSwapBatteryModeModel;
    return {
      total: rows.length,
      mode,
      precision: this.playerSwapBatteryPrecisionModel,
      confidence: this.playerSwapBatteryConfidenceLabel(seedCount),
      best: sorted[0] ?? null,
      worst: sorted[sorted.length - 1] ?? null,
      reads,
      fits,
    };
  });
  /** One-pixel starter movement comparison. */
  readonly positionPixelMatrixSummary = signal<PositionPixelMatrixSummary | null>(null);
  readonly positionPixelMatrixRows = signal<PositionPixelMatrixSummary[]>([]);
  readonly roleSlotImpactRows = signal<RoleSlotImpactSummaryRow[]>([]);
  readonly roleSlotImpactSmokeRows = signal<RoleSlotImpactSmokeRow[]>([]);
  readonly allFormationRoleSlotSmokeRows = signal<AllFormationRoleSlotSmokeRow[]>([]);
  readonly positionPixelSmokeRunSummaries = signal<PositionPixelSmokeRunSummary[]>([]);
  readonly selectedPositionPixelRowKey = signal<string | null>(null);
  readonly lineupDebugSnapshot = signal<LineupDebugSnapshot | null>(null);
  readonly formationLineSmokeRows = signal<FormationLineSmokeRow[]>([]);
  readonly positionPixelEvidenceNote = signal<string | null>(null);
  readonly lastPositionPixelRunDiagnostics = signal<string | null>(null);
  readonly lastPositionPixelResponseDiagnostics = signal<string | null>(null);
  readonly lastPositionPixelMappedRows = signal<number>(0);
  readonly professionalQaActionStatuses = signal<Record<string, ProfessionalQaActionStatus>>({});
  readonly qaChecklistRunningAll = signal<boolean>(false);
  readonly professionalQaChecklistRows = computed<ProfessionalQaChecklistRow[]>(() => {
      const rows = this.formationLineSmokeRows();
      const pixelRows = this.positionPixelMatrixRows();
      const lastPixelMappedRows = this.lastPositionPixelMappedRows();
      const pixelMatchSummaries = this.positionPixelMatchSmokeSummary();
      const pixelPlayerSummaries = this.positionPixelPlayerSmokeSummary();
      const pixelRunSummaries = this.positionPixelSmokeRunSummaries();
      const pixelEvidenceNote = this.positionPixelEvidenceNote();
      const swapBattery = this.playerSwapBatterySummary();
      const swapPrecisionRows = this.playerSwapPrecisionComparisonRows();
    const expectedFormationAuditRows = this.formationCodes.length * 3;
    const auditedFormationCount = new Set(rows.map((row) => row.formation)).size;
    const hasAudit = rows.length > 0;
    const hasAllFormationAudit = rows.length >= expectedFormationAuditRows
      && auditedFormationCount >= this.formationCodes.length;
    const hasPixelRows = pixelRows.length > 0 || lastPixelMappedRows > 0;
    const hasPixelSummaryRows = pixelMatchSummaries.length + pixelPlayerSummaries.length + pixelRunSummaries.length > 0;
    const hasPixelEvidence = hasPixelRows || hasPixelSummaryRows || !!pixelEvidenceNote;
    const hasSwapBattery = swapBattery.total > 0;
    const hasSwapPrecision = swapPrecisionRows.length > 0;
    const rowsByLine = (line: 'DEF' | 'MID' | 'ATT') => rows.filter((row) => row.line === line);
    const countByVerdict = (verdict: string) => rows.filter((row) => row.verdict === verdict).length;
    const hardReviews = rows.filter((row) => row.verdict === 'Review');
    const fallbackRows = rows.filter((row) => row.verdict === 'Fallback');
    const defenseRows = rowsByLine('DEF');
    const cleanDefenseRows = defenseRows.filter((row) => row.verdict === 'OK').length;
    const camOk = rows.some((row) =>
      row.formation === '3-4-1-2'
      && row.line === 'MID'
      && row.verdict === 'OK'
      && row.slotRoles.includes('CAM')
    );
    const strikerOk = rows.some((row) =>
      row.formation === '3-4-1-2'
      && row.line === 'ATT'
      && row.verdict === 'OK'
      && row.slotRoles
        .split(/[·?]/)
        .map((role) => role.trim())
        .filter((role) => role === 'ST')
        .length >= 2
    );
    const camFallback = rows.some((row) =>
      row.formation === '3-4-1-2'
      && row.line === 'MID'
      && row.verdict === 'Fallback'
      && row.slotRoles.includes('CAM')
    );
      const pixelVisibleRows = pixelRows.filter((row) => this.positionPixelReadLevel(row) !== 'stable').length;
      const pixelCliffRows = pixelRows.filter((row) => this.positionPixelDistance(row) <= 1.5 && this.positionPixelReadLevel(row) === 'strong').length;
      const pixelRepeatedFivePxRows = pixelMatchSummaries.filter((row) => row.verdict === 'Repeated 5px bias').length;
      const pixelPlayerRepeatedFivePxRows = pixelPlayerSummaries.filter((row) => row.verdict === 'Repeated 5px bias').length;
      const pixelVisibleFivePxRows = pixelMatchSummaries.filter((row) => row.verdict === '5px visible pattern').length
        + pixelPlayerSummaries.filter((row) => row.verdict === '5px visible pattern').length
        + pixelRunSummaries.filter((row) => row.verdict === '5px visible pattern').length;
      const pixelBigTacticalMoveRows = pixelMatchSummaries.filter((row) => row.verdict === 'Strong review' || row.verdict === 'Big tactical move').length
        + pixelPlayerSummaries.filter((row) => row.verdict === 'Strong review' || row.verdict === 'Big tactical move').length
        + pixelRunSummaries.filter((row) => row.verdict === 'Strong review' || row.verdict === 'Big tactical move').length;
      const pixelRunVisibleRows = pixelRunSummaries.reduce((sum, row) => sum + row.visible + row.strong + row.check + row.microReview, 0);
      const pixelRowsAreMicroOnly = pixelRows.length > 0
        && pixelRows.every((row) => this.positionPixelDistance(row) <= 1.5);
      const hasVisiblePixelSignal = pixelVisibleRows > 0
        || pixelVisibleFivePxRows > 0
        || pixelBigTacticalMoveRows > 0
        || pixelRunVisibleRows > 0
        || pixelRowsAreMicroOnly;
    const swapActionableReads = Object.entries(swapBattery.reads)
      .filter(([read]) => !['No clear effect', 'Neutral', 'Noise / neutral', 'Sin lectura clara'].includes(read))
      .reduce((sum, [, count]) => sum + count, 0);
    const swapMode = swapBattery.mode;
    const swapRowsForChecklist = this.playerSwapBatterySummaries();
    const swapStressActionableReads = swapRowsForChecklist
      .filter((row) => (row.testCase || '').toLowerCase().includes('stress'))
      .filter((row) => !['No clear effect', 'Neutral', 'Noise / neutral', 'Sin lectura clara'].includes(row.swapRead))
      .length;
    const swapStressSignalOk = (swapMode === 'stress' && swapActionableReads > 0)
      || (swapMode === 'combined' && swapStressActionableReads > 0);
    const swapNaturalStable = swapMode === 'natural' && swapBattery.total > 0 && swapActionableReads === 0;
    const stableSwapReads = swapPrecisionRows.filter((row) => row.stability === 'Stable read').length;
    const changedSwapReads = swapPrecisionRows.filter((row) => row.stability === 'Changed read').length;
    const needsMoreSwapSeeds = swapPrecisionRows.filter((row) => row.stability === 'Needs more seeds').length;
    const swapObserved = hasSwapBattery
      ? `${swapBattery.total} swaps · ${swapActionableReads} actionable read(s) · ${swapBattery.confidence} · mode ${swapMode}`
      : hasSwapPrecision
        ? `${swapPrecisionRows.length} precision swaps · ${stableSwapReads} stable · ${changedSwapReads} changed · ${needsMoreSwapSeeds} need more seeds`
        : 'Not run yet';
    const swapVerdict: ProfessionalQaChecklistRow['verdict'] = hasSwapBattery
      ? swapStressSignalOk ? 'OK' : swapNaturalStable ? 'Fallback' : swapActionableReads > 0 ? 'OK' : 'Review'
      : hasSwapPrecision
        ? changedSwapReads > 0 ? 'Review' : needsMoreSwapSeeds > 0 ? 'Fallback' : 'OK'
        : 'Pending';
    const swapNext = hasSwapBattery
      ? swapStressSignalOk
        ? swapMode === 'combined'
          ? 'Combined smoke OK: natural stability plus stress sensitivity.'
          : 'Stress sensitivity OK; use best/worst to tune role quality.'
        : swapNaturalStable
          ? 'Natural swaps are stable/neutral; run Stress test to verify sensitivity.'
          : swapActionableReads > 0
            ? 'Use best/worst to tune role quality.'
            : 'Check whether substitutions influence engine enough.'
      : hasSwapPrecision
        ? changedSwapReads > 0 ? 'Trust balanced reads; quick is smoke only.' : needsMoreSwapSeeds > 0 ? 'Run balanced or more seeds for borderline swaps.' : 'Precision stable enough.'
        : 'Run Player swap battery or Compare precision.';
    return [
      {
        check: 'All formations audit',
        expected: `${expectedFormationAuditRows} line checks after running all ${this.formationCodes.length} formations.`,
        observed: hasAudit
          ? `${rows.length}/${expectedFormationAuditRows} rows · ${auditedFormationCount}/${this.formationCodes.length} formations · ${countByVerdict('OK')} OK · ${countByVerdict('Fallback')} fallback · ${countByVerdict('Review')} review`
          : 'Not run yet',
        verdict: !hasAudit ? 'Pending' : !hasAllFormationAudit ? 'Review' : hardReviews.length > 0 ? 'Review' : fallbackRows.length > 0 ? 'Fallback' : 'OK',
        next: !hasAudit ? 'Run All formations line audit.' : !hasAllFormationAudit ? 'Run the all-formations audit, not only current formation.' : hardReviews.length > 0 ? 'Inspect Review rows first.' : fallbackRows.length > 0 ? 'Fallbacks are allowed; preview/engine apply role-fit penalties.' : 'Keep as contract.',
      },
      {
        check: 'Defensive side mapping',
        expected: 'LB/RB and LWB/RWB stay on their tactical side; no crossing.',
        observed: hasAudit ? `${cleanDefenseRows}/${defenseRows.length} defensive lines clean` : 'Not run yet',
        verdict: !hasAudit ? 'Pending' : defenseRows.length > 0 && cleanDefenseRows === defenseRows.length ? 'OK' : 'Review',
        next: !hasAudit ? 'Run formation audit.' : cleanDefenseRows === defenseRows.length ? 'Keep as contract.' : 'Check side mapping / persisted slots.',
      },
      {
        check: '3-4-1-2 spine',
        expected: 'CAM natural in CAM and two CF/ST preserved for both ST slots.',
        observed: hasAudit ? `CAM ${camOk ? 'OK' : camFallback ? 'fallback' : 'missing'} · ST pair ${strikerOk ? 'OK' : 'missing'}` : 'Not run yet',
        verdict: !hasAudit ? 'Pending' : camOk && strikerOk ? 'OK' : strikerOk && camFallback ? 'Fallback' : 'Review',
        next: !hasAudit ? 'Run formation audit.' : camOk && strikerOk ? 'Pinned by backend test.' : strikerOk && camFallback ? 'Acceptable if squad lacks natural CAM; calibrate penalty.' : 'Recheck auto-select reservation.',
      },
      {
        check: 'Wide-role scarcity',
        expected: 'Missing natural wingers/LM/RM becomes Fallback, not silent OK.',
        observed: hasAudit ? `${fallbackRows.length} fallback line(s)` : 'Not run yet',
        verdict: !hasAudit ? 'Pending' : fallbackRows.length > 0 ? 'Fallback' : 'OK',
        next: fallbackRows.length > 0 ? 'Fallback is exposed here and penalized by role/slot fit in preview + engine.' : 'No fallback detected for this squad.',
      },
      {
        check: 'Pixel movement signal',
        expected: 'Manual x/y movement creates a measurable multi-seed signal.',
        observed: hasPixelEvidence
          ? `${Math.max(pixelRows.length, lastPixelMappedRows)} rows · ${pixelMatchSummaries.length + pixelRunSummaries.length} match summaries · ${pixelPlayerSummaries.length} player summaries · ${pixelVisibleRows + pixelVisibleFivePxRows + pixelBigTacticalMoveRows + pixelRunVisibleRows} visible/non-stable`
          : 'Not run yet',
        verdict: !hasPixelEvidence ? 'Pending' : hasVisiblePixelSignal ? 'OK' : pixelEvidenceNote ? 'Review' : 'Review',
        next: !hasPixelEvidence
          ? 'Run Position presets matrix or line smokes.'
          : pixelEvidenceNote && !hasVisiblePixelSignal
            ? pixelEvidenceNote
            : pixelVisibleRows > 0 || pixelVisibleFivePxRows > 0 || pixelBigTacticalMoveRows > 0
            ? 'Use rows to calibrate direction.'
            : pixelRowsAreMicroOnly
              ? 'Micro movements are stable; run Position presets matrix for larger tactical moves.'
              : 'Increase seeds or inspect engine sensitivity.',
      },
        {
          check: 'Pixel no-cliff rule',
          expected: '1px moves should be smooth, not strong cliff jumps.',
          observed: hasPixelEvidence ? `${pixelCliffRows} strong 1px cliff row(s) · ${pixelRepeatedFivePxRows} match repeated 5px bias · ${pixelPlayerRepeatedFivePxRows} player repeated 5px bias · ${pixelVisibleFivePxRows} visible 5px pattern(s) · ${pixelBigTacticalMoveRows} big tactical move(s)` : 'Not run yet',
          verdict: !hasPixelEvidence ? 'Pending' : pixelEvidenceNote || pixelCliffRows > 0 || pixelRepeatedFivePxRows > 0 || pixelPlayerRepeatedFivePxRows > 0 ? 'Review' : 'OK',
          next: !hasPixelEvidence ? 'Run Sensitivity check.' : pixelEvidenceNote ? pixelEvidenceNote : pixelCliffRows > 0 ? 'Inspect 1px thresholds / zone boundaries.' : pixelRepeatedFivePxRows > 0 || pixelPlayerRepeatedFivePxRows > 0 ? 'Inspect 5px directional sensitivity / zone boundaries.' : pixelVisibleFivePxRows > 0 || pixelBigTacticalMoveRows > 0 ? 'Micro is smooth; calibrate 5px/big tactical sensitivity separately.' : 'Keep as contract.',
        },
      {
        check: 'Player swap signal',
        expected: 'Changing players should affect role quality and match averages.',
        observed: swapObserved,
        verdict: swapVerdict,
        next: swapNext,
      },
    ];
  });
  readonly positionPixelReadFilter = signal<PositionPixelReadFilter>('all');
  readonly positionPixelSortMode = signal<PositionPixelSortMode>('default');
  readonly displayedPositionPixelMatrixRows = computed(() => {
    const filter = this.positionPixelReadFilter();
    const sort = this.positionPixelSortMode();
    const rows = this.positionPixelMatrixRows()
      .filter((row) => {
        if (filter === 'all') return true;
        if (filter === 'diagonal') return this.positionPixelIsDiagonalMove(row);
        if (filter === 'diagonal-mismatch') {
          return this.positionPixelIsDiagonalMove(row) && this.positionPixelVisualExpectationRead(row) === 'Visual mismatch';
        }
        if (filter === 'diagonal-micro') {
          return this.positionPixelIsDiagonalMove(row) && this.positionPixelVisualExpectationRead(row) === 'Visual micro';
        }
        if (filter === 'diagonal-review') {
          return this.positionPixelIsDiagonalMove(row) && this.positionPixelVisualEngineTensionRead(row) !== 'Coherente';
        }
        if (filter === 'visual-mismatch') return this.positionPixelVisualExpectationRead(row) === 'Visual mismatch';
        if (filter === 'visual-micro') return this.positionPixelVisualExpectationRead(row) === 'Visual micro';
        if (filter === 'visual-review') return this.positionPixelVisualEngineTensionRead(row) !== 'Coherente';
        if (filter === 'big-move') return this.positionPixelIsBigMove(row);
        if (filter === 'line-break') return this.positionPixelIsLineBreak(row);
        return this.positionPixelReadLevel(row) === filter;
      })
      .map((row, index) => ({ row, index }));
    if (sort !== 'default') {
      rows.sort((a, b) => {
        if (sort === 'read-desc') {
          return this.positionPixelReadSeverity(b.row) - this.positionPixelReadSeverity(a.row) || a.index - b.index;
        }
        if (sort === 'impact-desc') {
          return this.positionPixelImpactScore(b.row) - this.positionPixelImpactScore(a.row) || a.index - b.index;
        }
        return this.positionPixelDistance(b.row) - this.positionPixelDistance(a.row) || a.index - b.index;
      });
    }
    return rows.map((item) => item.row);
  });
  readonly positionPixelMatchSmokeSummary = computed<PositionPixelMatchSmokeSummary[]>(() => {
    const groups = new Map<string, PositionPixelMatrixSummary[]>();
    for (const row of this.positionPixelMatrixRows()) {
      const key = this.positionPixelMatchLabel(row);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].map(([matchLabel, rows]) => this.toPositionPixelMatchSmokeSummary(matchLabel, rows));
  });
  readonly positionPixelPlayerSmokeSummary = computed<PositionPixelPlayerSmokeSummary[]>(() => {
    const groups = new Map<string, PositionPixelMatrixSummary[]>();
    for (const row of this.positionPixelMatrixRows()) {
      const key = `${row.playerName}|${row.playerPosition}|${row.slotId}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()]
      .map(([key, rows]) => this.toPositionPixelPlayerSmokeSummary(key, rows))
      .sort((a, b) => this.positionPixelPlayerSmokeSeverity(b) - this.positionPixelPlayerSmokeSeverity(a) || b.fivePxRiskRows - a.fivePxRiskRows);
  });
  readonly positionPixelDiagonalSummary = computed<PositionPixelDiagonalSummary | null>(() => {
    const rows = this.positionPixelMatrixRows().filter((row) => this.positionPixelIsDiagonalMove(row));
    if (rows.length === 0) return null;
    const best = rows.reduce((candidate, row) =>
      this.positionPixelDecisionScore(row) > this.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    const worst = rows.reduce((candidate, row) =>
      this.positionPixelDecisionScore(row) < this.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    const visualMismatchRows = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual mismatch');
    const visualMicroRows = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual micro');
    const visualReviewRows = rows.filter((row) => this.positionPixelVisualEngineTensionRead(row) !== 'Coherente');
    const worstVisualMismatch = this.pickWorstPositionPixelReviewRow(visualMismatchRows);
    const worstVisualReview = this.pickWorstPositionPixelReviewRow(visualReviewRows);
    return {
      total: rows.length,
      risk: rows.filter((row) => this.positionPixelDefensiveRiskScore(row) >= 0.8 || this.positionPixelTacticalRead(row) === 'Risk').length,
      defenseGain: rows.filter((row) => this.positionPixelDefensiveGainScore(row) >= 0.8 || this.positionPixelTacticalRead(row) === 'Def. gain').length,
      visualMismatch: visualMismatchRows.length,
      visualMicro: visualMicroRows.length,
      visualEngineReview: visualReviewRows.length,
      worstVisualMismatch,
      worstVisualReview,
      best,
      worst,
    };
  });
  readonly positionPixelLineBreakSummary = computed<PositionPixelLineBreakSummary | null>(() => {
    const rows = this.positionPixelMatrixRows().filter((row) => this.positionPixelIsLineBreak(row));
    if (rows.length === 0) return null;
    const best = rows.reduce((candidate, row) =>
      this.positionPixelDecisionScore(row) > this.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    const worst = rows.reduce((candidate, row) =>
      this.positionPixelDecisionScore(row) < this.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    return {
      total: rows.length,
      borderline: rows.filter((row) => this.positionPixelDistance(row) <= 6).length,
      big: rows.filter((row) => this.positionPixelIsBigMove(row)).length,
      strong: rows.filter((row) => this.positionPixelReadLevel(row) === 'strong').length,
      badTradeoff: rows.filter((row) => this.positionPixelTacticalRead(row) === 'Bad tradeoff').length,
      attackGain: rows.filter((row) => this.positionPixelAttackGainScore(row) >= 0.8).length,
      best,
      worst,
    };
  });
  readonly playerSwapSlotOptions = signal<PlayerSwapSlotOption[]>([]);
  readonly roleSlotImpactAvailableSlotOptions = computed(() => {
    const liveOptions = this.playerSwapSlotOptions()
      .filter((option) => !!option.slotId)
      .map((option) => ({
        slotId: option.slotId,
        label: `${option.slotId} · ${option.playerName} (${option.position})`,
        kind: this.roleSlotImpactKindForSlot(option.slotId),
      }));
    return liveOptions.length > 0 ? liveOptions : [...this.roleSlotImpactSlotOptions];
  });
  readonly playerSwapBenchOptions = signal<PlayerSwapBenchOption[]>([]);
  /** Controlled live tactical scenarios for selected match + seed. */
  readonly scenarioMatrixResults = signal<ScenarioMatrixRow[]>([]);
  /** Averaged controlled scenarios across multiple seeds. */
  readonly scenarioMatrixSummaryResults = signal<ScenarioMatrixSummaryRow[]>([]);
  readonly scenarioBatteryRows = signal<ScenarioBatteryRow[]>([]);
  readonly scenarioBatteryProgress = signal<string>('');
  readonly scenarioBatteryWorkload = signal<string>('');
  readonly scenarioMatrixSummarySeedCount = signal<number>(20);
  readonly scenarioSummaryReadFilter = signal<ScenarioSummaryReadFilter>('all');
  readonly scenarioSummarySortMode = signal<ScenarioSummarySortMode>('read-desc');
  readonly displayedScenarioMatrixSummaryRows = computed(() => {
    const filter = this.scenarioSummaryReadFilter();
    const sort = this.scenarioSummarySortMode();
    const rows = this.scenarioMatrixSummaryResults()
      .filter((row) => {
        const level = this.scenarioSummaryReadLevel(row);
        if (filter === 'all') return true;
        if (filter === 'actionable') return level === 'review' || level === 'strong' || level === 'visible';
        return level === filter;
      })
      .map((row, index) => ({ row, index }));
    if (sort !== 'default') {
      rows.sort((a, b) => {
        if (sort === 'read-desc') {
          return this.scenarioSummaryReadSeverity(b.row) - this.scenarioSummaryReadSeverity(a.row) || a.index - b.index;
        }
        if (sort === 'impact-desc') {
          return this.scenarioSummaryImpactScore(b.row) - this.scenarioSummaryImpactScore(a.row) || a.index - b.index;
        }
        return Math.abs(b.row.avgUserXgDelta) - Math.abs(a.row.avgUserXgDelta) || a.index - b.index;
      });
    }
    return rows.map((item) => item.row);
  });
  readonly scenarioScoutingNotes = computed<ScenarioScoutingNote[]>(() => {
    const rows = this.scenarioMatrixSummaryResults()
      .filter((row) => !row.scenario.includes('noop') && !row.scenario.startsWith('base-'));
    if (rows.length === 0) {
      return [];
    }
    const notes: ScenarioScoutingNote[] = [];
    const channelCandidates = rows
      .filter((row) => ['m45-central', 'm45-wide', 'm45-left', 'm45-right'].includes(row.scenario))
      .filter((row) => row.avgUserXgDelta >= 0.06 && row.avgOpponentXgDelta <= 0.14)
      .sort((a, b) => b.avgUserXgDelta - a.avgUserXgDelta);
    const channelAttack = channelCandidates[0];
    if (channelAttack) {
      const runnerUp = channelCandidates[1];
      const runnerUpDelta = runnerUp ? channelAttack.avgUserXgDelta - runnerUp.avgUserXgDelta : 0;
      const runnerUpText = runnerUp
        ? Math.abs(runnerUpDelta) < 0.005
          ? ` Queda parejo con ${this.summaryActionLabel(runnerUp)}; conviene mirar xGA y zonas.`
          : ` Supera a ${this.summaryActionLabel(runnerUp)} por ${this.fmtDeltaNumber(runnerUpDelta)} xG.`
        : '';
      notes.push({
        title: 'Canal recomendado',
        body: `${this.summaryActionLabel(channelAttack)}: ${this.scenarioSummaryUserChannelRead(channelAttack)} (${this.fmtDeltaNumber(channelAttack.avgUserXgDelta)} xG, xGA ${this.fmtDeltaNumber(channelAttack.avgOpponentXgDelta)}).${runnerUpText}`,
        className: 'read-visible',
      });
    }
    const shapeAttack = rows
      .filter((row) => row.scenario.startsWith('m45-shape-'))
      .filter((row) => row.avgUserXgDelta >= 0.08 && row.avgOpponentXgDelta <= 0.12)
      .sort((a, b) => b.avgUserXgDelta - a.avgUserXgDelta)[0];
    if (shapeAttack && (!channelAttack || shapeAttack.avgUserXgDelta >= channelAttack.avgUserXgDelta + 0.04)) {
      const channelComparison = channelAttack
        ? ` Mejora al canal puro por ${this.fmtDeltaNumber(shapeAttack.avgUserXgDelta - channelAttack.avgUserXgDelta)} xG.`
        : '';
      notes.push({
        title: 'Mejor ajuste de forma',
        body: `${this.summaryActionLabel(shapeAttack)}: ${this.scenarioSummaryUserChannelRead(shapeAttack)} (${this.fmtDeltaNumber(shapeAttack.avgUserXgDelta)} xG, xGA ${this.fmtDeltaNumber(shapeAttack.avgOpponentXgDelta)}).${channelComparison}`,
        className: 'read-visible',
      });
    }
    const bestProtection = rows
      .filter((row) => row.avgOpponentXgDelta <= -0.06 || this.scenarioOpponentMinChannelXgDelta(row) <= -0.08)
      .filter((row) => this.scenarioOpponentMaxChannelXgDelta(row) < 0.10)
      .sort((a, b) => Math.min(a.avgOpponentXgDelta, this.scenarioOpponentMinChannelXgDelta(a))
        - Math.min(b.avgOpponentXgDelta, this.scenarioOpponentMinChannelXgDelta(b)))[0];
    if (bestProtection) {
      const attackCost = bestProtection.avgUserXgDelta < -0.04
        ? ` Coste ofensivo ${this.fmtDeltaNumber(bestProtection.avgUserXgDelta)} xG.`
        : bestProtection.avgUserXgDelta > 0.04
          ? ` Ademas suma ${this.fmtDeltaNumber(bestProtection.avgUserXgDelta)} xG.`
          : '';
      notes.push({
        title: 'Mejor proteccion',
        body: `${this.summaryActionLabel(bestProtection)}: ${this.scenarioSummaryOpponentChannelRead(bestProtection)} (xGA ${this.fmtDeltaNumber(bestProtection.avgOpponentXgDelta)}).${attackCost}`,
        className: 'read-stable',
      });
    }
    const biggestRisk = rows
      .filter((row) => this.scenarioOpponentMaxChannelXgDelta(row) >= 0.10 || row.avgOpponentXgDelta >= 0.10)
      .sort((a, b) => Math.max(b.avgOpponentXgDelta, this.scenarioOpponentMaxChannelXgDelta(b))
        - Math.max(a.avgOpponentXgDelta, this.scenarioOpponentMaxChannelXgDelta(a)))[0];
    if (biggestRisk) {
      notes.push({
        title: 'Cuidado',
        body: `${this.summaryActionLabel(biggestRisk)} abre riesgo: ${this.scenarioOpponentRiskRead(biggestRisk)} (xGA ${this.fmtDeltaNumber(biggestRisk.avgOpponentXgDelta)}).`,
        className: 'read-check',
      });
    }
    return notes.slice(0, 4);
  });
  readonly scenarioDecisionCards = computed<ScenarioDecisionCard[]>(() =>
    this.buildScenarioDecisionCards(this.scenarioMatrixSummaryResults())
  );
  scenarioBatteryCandidateMatches(): TestHarnessMatchRow[] {
    const completed = this.rounds()
      .flatMap((round) => round.matches)
      .filter((match) => String(match.status).toUpperCase() === 'COMPLETED');
    return completed.slice(0, this.scenarioBatteryMatchLimit());
  }
  private buildScenarioDecisionCards(summaryRows: ScenarioMatrixSummaryRow[]): ScenarioDecisionCard[] {
    const rows = summaryRows
      .filter((row) => !row.scenario.includes('noop') && !row.scenario.startsWith('base-'));
    if (rows.length === 0) {
      return [];
    }
    const cards: ScenarioDecisionCard[] = [];
    const usedActionKeys = new Set<string>();
    const ownRows = rows.filter((row) => !this.isOpponentScenarioRow(row));
    const opponentRows = rows.filter((row) => this.isOpponentScenarioRow(row));
    const baseline = summaryRows
      .find((row) => row.scenario.includes('noop') || row.scenario.startsWith('base-'));
    cards.push({
      title: 'Plan actual',
      label: baseline ? this.summaryActionLabel(baseline) : 'Baseline',
      metrics: baseline
        ? `xG ${this.fmtDeltaNumber(baseline.avgUserXgDelta)} / xGA ${this.fmtDeltaNumber(baseline.avgOpponentXgDelta)}`
        : 'Referencia del partido',
      detail: baseline
        ? this.scenarioSummaryCoachRead(baseline)
        : 'Punto de comparacion para medir cada ajuste.',
      className: 'decision-neutral',
    });
    const twoWayAction = ownRows
      .filter((row) => row.avgUserXgDelta >= 0.04 && row.avgOpponentXgDelta <= -0.04)
      .sort((a, b) => this.scenarioTwoWayScore(b) - this.scenarioTwoWayScore(a))[0];
    if (twoWayAction) {
      cards.push(this.scenarioDecisionCardFromRow(
        'Doble ganancia',
        twoWayAction,
        'decision-attack',
        `${this.scenarioSummaryUserChannelRead(twoWayAction)} / ${this.scenarioOpponentProtectionRead(twoWayAction)}`,
      ));
      usedActionKeys.add(this.scenarioActionKey(twoWayAction));
    }
    const channelAttack = ownRows
      .filter((row) => ['m45-central', 'm45-wide', 'm45-left', 'm45-right'].includes(row.scenario))
      .filter((row) => !usedActionKeys.has(this.scenarioActionKey(row)))
      .filter((row) => row.avgUserXgDelta >= 0.06 && row.avgOpponentXgDelta <= 0.14)
      .sort((a, b) => b.avgUserXgDelta - a.avgUserXgDelta)[0];
    if (channelAttack) {
      cards.push(this.scenarioDecisionCardFromRow(
        'Atacar',
        channelAttack,
        'decision-attack',
        this.scenarioSummaryUserChannelRead(channelAttack),
      ));
      usedActionKeys.add(this.scenarioActionKey(channelAttack));
    }
    const shapeAttack = ownRows
      .filter((row) => row.scenario.startsWith('m45-shape-'))
      .filter((row) => !usedActionKeys.has(this.scenarioActionKey(row)))
      .filter((row) => row.avgUserXgDelta >= 0.08 && row.avgOpponentXgDelta <= 0.12)
      .sort((a, b) => b.avgUserXgDelta - a.avgUserXgDelta)[0];
    if (shapeAttack && (!channelAttack || shapeAttack.avgUserXgDelta >= channelAttack.avgUserXgDelta + 0.04)) {
      cards.push(this.scenarioDecisionCardFromRow(
        'Forma',
        shapeAttack,
        'decision-shape',
        this.scenarioSummaryUserChannelRead(shapeAttack),
      ));
      usedActionKeys.add(this.scenarioActionKey(shapeAttack));
    }
    const bestProtection = ownRows
      .filter((row) => !usedActionKeys.has(this.scenarioActionKey(row)))
      .filter((row) => this.scenarioProtectionCandidateIsCoachWorthy(row))
      .filter((row) => row.avgOpponentXgDelta <= 0.03)
      .filter((row) => row.avgOpponentXgDelta <= -0.06 || this.scenarioOpponentMinChannelXgDelta(row) <= -0.08)
      .filter((row) => this.scenarioOpponentMaxChannelXgDelta(row) < 0.10)
      .sort((a, b) => Math.min(a.avgOpponentXgDelta, this.scenarioOpponentMinChannelXgDelta(a))
        - Math.min(b.avgOpponentXgDelta, this.scenarioOpponentMinChannelXgDelta(b)))[0];
    if (bestProtection) {
      cards.push(this.scenarioDecisionCardFromRow(
        'Cuidar',
        bestProtection,
        'decision-safe',
        this.scenarioOpponentProtectionRead(bestProtection),
      ));
      usedActionKeys.add(this.scenarioActionKey(bestProtection));
    }
    const biggestRisk = ownRows
      .filter((row) => this.scenarioOpponentMaxChannelXgDelta(row) >= 0.10 || row.avgOpponentXgDelta >= 0.10)
      .sort((a, b) => Math.max(b.avgOpponentXgDelta, this.scenarioOpponentMaxChannelXgDelta(b))
        - Math.max(a.avgOpponentXgDelta, this.scenarioOpponentMaxChannelXgDelta(a)))[0];
    if (biggestRisk) {
      const offensiveRisk = biggestRisk.avgUserXgDelta >= 0.02;
      cards.push(this.scenarioDecisionCardFromRow(
        offensiveRisk ? 'Riesgo ofensivo' : 'Evitar',
        biggestRisk,
        'decision-risk',
        offensiveRisk
          ? `${this.scenarioSummaryUserChannelRead(biggestRisk)} / ${this.scenarioOpponentRiskRead(biggestRisk)}`
          : this.scenarioOpponentRiskRead(biggestRisk),
      ));
    }
    const opponentThreat = opponentRows
      .filter((row) => this.scenarioOpponentMaxChannelXgDelta(row) >= 0.025 || row.avgOpponentXgDelta >= 0.025)
      .sort((a, b) => Math.max(b.avgOpponentXgDelta, this.scenarioOpponentMaxChannelXgDelta(b))
        - Math.max(a.avgOpponentXgDelta, this.scenarioOpponentMaxChannelXgDelta(a)))[0];
    if (opponentThreat) {
      cards.push(this.scenarioDecisionCardFromRow(
        'Amenaza rival',
        opponentThreat,
        'decision-risk',
        this.scenarioOpponentRiskRead(opponentThreat),
      ));
    }
    return cards.slice(0, 7);
  }
  /** User-facing pointer to the latest finished replay-analysis result. */
  readonly analysisReadyMessage = signal<string | null>(null);
  /** True if there is an active career. */
  readonly hasCareer = computed(() => this.careerId() !== null);
  readonly selectedMatchIncludesUserTeam = computed(() => {
    const m = this.selectedMatch();
    const team = this.userTeamName();
    if (!m || !team) {
      return false;
    }
    return m.homeTeamName === team || m.awayTeamName === team;
  });
  readonly selectedMatchLabel = computed(() => {
    const m = this.selectedMatch();
    if (!m) {
      return 'Sin partido seleccionado';
    }
    return `${m.homeTeamName} vs ${m.awayTeamName}`;
  });
  selectedMatchScopeWarning(): string {
    const m = this.selectedMatch();
    const userTeam = this.userTeamName() || 'tu equipo';
    if (!m) {
      return '';
    }
    return `Ojo: el partido seleccionado es ${m.homeTeamName} vs ${m.awayTeamName}, pero Set Formation / modal DT afectan a ${userTeam}. Para probar el motor de tu equipo, elegí un partido donde juegue ${userTeam}. Si querés analizar este partido igual, usá Controlar: Local/Visitante.`;
  }
  controlledTeamContextLabel(): string {
    const m = this.selectedMatch();
    if (!m) {
      return 'Elegí un partido';
    }
    const side = this.effectiveControlledSide();
    if (this.controlledTeamSideModel === 'USER' && this.selectedMatchIncludesUserTeam()) {
      return `Mi equipo: ${this.userTeamName() ?? 'usuario'} (${side === 'AWAY' ? 'visitante' : 'local'})`;
    }
    if (side === 'HOME') {
      return `Local: ${m.homeTeamName}`;
    }
    if (side === 'AWAY') {
      return `Visitante: ${m.awayTeamName}`;
    }
    return `Mi equipo: ${this.userTeamName() ?? 'sin carrera'}`;
  }
  resultPerspectiveLabel(): string {
    const m = this.selectedMatch();
    if (!m) {
      return 'For/Ag se activa al seleccionar un partido.';
    }
    const side = this.effectiveControlledSide();
    const controlled = side === 'AWAY' ? m.awayTeamName : m.homeTeamName;
    const rival = side === 'AWAY' ? m.homeTeamName : m.awayTeamName;
    return `For = ${controlled}; Ag = ${rival}`;
  }
  // ============== Panel D state ==============
  /** Selected minute on the timeline scrubber (0-90 step 5). */
  readonly selectedMinute = signal<number>(0);
  /** Latest timeline snapshot (null when feature off or no detail). */
  readonly timelineSnapshot = signal<TimelineSnapshot | null>(null);
  /** True while fetching the timeline. */
  readonly timelineLoading = signal<boolean>(false);
  /** Error from the latest timeline fetch. */
  readonly timelineError = signal<string | null>(null);
  /** Active debounce timer for the timeline fetch. */
  private timelineFetchTimer: ReturnType<typeof setTimeout> | null = null;
  /** Timers used to refresh Panel C after async round simulation starts. */
  private roundRefreshTimers: Array<ReturnType<typeof setTimeout>> = [];
  /** Monotonic counter for stale-response rejection. */
  private timelineFetchSeq = 0;
  // ============== Constructor / effects ==============
  constructor() {
    // V24D24 F3: re-fetch the timeline snapshot whenever the selected
    // match or the selected minute changes. Debounced 150ms so a fast
    // slider drag doesn't fire 18 requests.
    effect(() => {
      const matchId = this.selectedMatchId();
      const minute = this.selectedMinute();
      const careerId = this.careerId();
      if (this.timelineFetchTimer) {
        clearTimeout(this.timelineFetchTimer);
        this.timelineFetchTimer = null;
      }
      if (!matchId || !careerId) {
        this.timelineSnapshot.set(null);
        this.timelineError.set(null);
        this.timelineLoading.set(false);
        return;
      }
      this.timelineLoading.set(true);
      this.timelineError.set(null);
      const fetchId = ++this.timelineFetchSeq;
      this.timelineFetchTimer = setTimeout(() => {
        this.matchDetailApi.getMatchTimeline(careerId, matchId, minute).subscribe({
          next: (snap) => {
            if (fetchId !== this.timelineFetchSeq) {
              return; // stale response
            }
            this.timelineSnapshot.set(snap);
            this.timelineLoading.set(false);
          },
          error: (err) => {
            if (fetchId !== this.timelineFetchSeq) {
              return;
            }
            this.timelineError.set(
              this.fmtError(err, 'Failed to load timeline snapshot')
            );
            this.timelineSnapshot.set(null);
            this.timelineLoading.set(false);
          },
        });
      }, TIMELINE_DEBOUNCE_MS);
    });
  }
  // ============== Lifecycle ==============
  ngOnInit(): void {
    this.loadFormationCoordinateCache();
    this.reload();
  }
  ngOnDestroy(): void {
    if (this.timelineFetchTimer) {
      clearTimeout(this.timelineFetchTimer);
      this.timelineFetchTimer = null;
    }
    this.clearRoundRefreshTimers();
  }
  private loadFormationCoordinateCache(): void {
    this.http.get<FormationDTO[]>(`${environment.apiUrl}/editor/formations`)
      .pipe(catchError(() => of([] as FormationDTO[])))
      .subscribe((formations) => {
        const next: Record<string, FormationDTO['positions']> = {};
        for (const formation of formations ?? []) {
          if (formation?.name) {
            next[formation.name] = formation.positions ?? [];
          }
        }
        this.formationPositionsByName.set(next);
      });
  }
  /** Re-load the career status and the match list. */
  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.careerService.getCareerStatus().subscribe({
      next: (status) => {
        if (!status.careerId) {
          this.careerId.set(null);
          this.userTeamName.set(null);
          this.selectedMatch.set(null);
          this.rounds.set([]);
          this.loading.set(false);
          return;
        }
        this.careerId.set(status.careerId);
        this.userTeamName.set(status.userTeamName ?? null);
        this.refreshLineupContext();
        this.loadMatches();
      },
      error: (err) => {
        this.loadError.set(
          err?.error?.message ?? err?.message ?? 'Failed to load career status.'
        );
        this.loading.set(false);
      },
    });
  }
  /** Set the selected match (Panel C -> Panel A re-render via @Input). */
  selectMatch(m: TestHarnessMatchRow): void {
    const previousMatchId = this.selectedMatchId();
    this.selectedMatchId.set(m.matchId);
    this.selectedMatch.set(m);
    if (typeof m.round === 'number' && this.selectedRoundModel !== m.round) {
      this.selectedRoundModel = m.round;
    }
    if (!this.selectedMatchIncludesUserTeam() && this.controlledTeamSideModel === 'USER') {
      this.controlledTeamSideModel = 'HOME';
    }
    // Reset the scrubber to the start of the match when switching matches.
    this.selectedMinute.set(0);
    if (previousMatchId !== m.matchId) {
      this.clearReplayAnalysisForMatchChange(m);
    }
    this.refreshLineupContext();
  }
  selectedMatchCompareRoute(): unknown[] | null {
    const careerId = this.careerId();
    const matchId = this.selectedMatchId();
    if (!careerId || !matchId) {
      return null;
    }
    return ['/careers', careerId, 'matches', matchId, 'compare'];
  }
  compareWorkflowSteps(): Array<{
    title: string;
    body: string;
    status: string;
    state: 'done' | 'active' | 'pending';
  }> {
    const hasMatch = !!this.selectedMatchId();
    const hasReplayResult = !!this.currentLineupReplayResult()
      || !!this.currentLineupMultiSeedSummary()
      || !!this.modalVsCanonicalSummary()
      || this.scenarioMatrixSummaryResults().length > 0
      || this.scenarioBatteryRows().length > 0;
    const hasPanelE = hasReplayResult
      || !!this.lineupDiagnostic()
      || !!this.playerSwapMatrixSummary()
      || this.playerSwapBatterySummaries().length > 0
      || this.playerSwapPrecisionComparisonRows().length > 0
      || !!this.positionPixelMatrixSummary()
      || this.positionPixelMatrixRows().length > 0
      || this.formationReplayResults().length > 0
      || this.formationMatrixSummaryResults().length > 0;
    return [
      {
        title: '1. Elegir partido',
        body: hasMatch
          ? `${this.selectedMatchLabel()} seleccionado.`
          : 'Selecciona un partido en Panel C para fijar el caso de prueba.',
        status: hasMatch ? 'OK' : '1',
        state: hasMatch ? 'done' : 'active',
      },
      {
        title: '2. Correr baseline con seed',
        body: hasMatch
          ? `Usa Replay with seed (${this.seedInputModel ?? 'auto'}) para fijar una referencia reproducible.`
          : 'Primero necesitamos un partido seleccionado.',
        status: hasReplayResult ? 'OK' : '2',
        state: hasReplayResult ? 'done' : hasMatch ? 'active' : 'pending',
      },
      {
        title: '3. Aplicar cambio DT',
        body: hasMatch
          ? 'Abre el modal, cambia formación/jugadores/píxeles y vuelve a correr Current lineup, Base vs modal o Scenario.'
          : 'El cambio DT tiene sentido después de elegir partido.',
        status: hasPanelE ? 'OK' : '3',
        state: hasPanelE ? 'done' : hasReplayResult ? 'active' : 'pending',
      },
      {
        title: '4. Abrir comparación',
        body: hasMatch
          ? 'Open Match Compare abre baseline vs live del mismo partido para leer goles, xG, tiros, posesión y timeline.'
          : 'La comparación se habilita cuando hay carrera y partido.',
        status: hasMatch ? 'GO' : '4',
        state: hasPanelE && hasMatch ? 'active' : hasMatch ? 'pending' : 'pending',
      },
    ];
  }
  /**
   * Panel D slider handler. Called on every `input` event from the
   * <input type="range">. The effect in the constructor debounces the
   * actual HTTP call.
   */
  onSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (Number.isFinite(value) && value >= 0 && value <= TIMELINE_MAX_MINUTE) {
      this.selectedMinute.set(value);
    }
  }
  // ============== Panel B handlers ==============
  /** Two-way binding shim for mat-select. */
  onFormationChange(value: string): void {
    this.selectedFormationModel = (value as FormationCode) ?? null;
  }
  applyFormation(): void {
    const formation = this.selectedFormationModel;
    if (!formation) {
      this.snackBar.open('Pick a formation first.', 'OK', { duration: 3000 });
      return;
    }
    this.mutationInFlight.set(true);
    this.harness.setFormation(formation).pipe(
      switchMap((resp) =>
        this.harness.autoSelectLineup(formation).pipe(
          map(() => resp)
        )
      )
    ).subscribe({
      next: (resp) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          resp?.message ?? `Formation ${formation} applied with auto-selected tactical slots.`,
          'OK',
          { duration: 3000 }
        );
        this.refreshLineupContext();
        this.refreshDetailAfterMutation();
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to set formation'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  private buildCanonicalSlotsForFormation(formation: string, playerIds: string[]): LineupSlotDTO[] {
    const positions = [...(this.formationPositionsByName()[formation] ?? [])]
      .filter((position) => !!position?.subdivisionId && position.subdivisionId !== 'GK-1')
      .sort((a, b) => a.index - b.index);
    const fallbackSubdivisionIds = this.fallbackCanonicalSubdivisionIds(formation);
    const subdivisionIds = positions.length >= 10
      ? positions.slice(0, 10).map((position) => position.subdivisionId)
      : fallbackSubdivisionIds;
    if (playerIds.length !== 11 || subdivisionIds.length < 10) {
      return [];
    }
    return [
      { playerId: playerIds[0], subdivisionId: 'GK-1' },
      ...playerIds.slice(1, 11).map((playerId, index) => ({
        playerId,
        subdivisionId: subdivisionIds[index] ?? `S${String(index + 1).padStart(2, '0')}-1`,
      })),
    ];
  }
  private fallbackCanonicalSubdivisionIds(formation: string): string[] {
    const fallback: Record<string, string[]> = {
      '4-4-2': ['S22-2', 'S23-1', 'S23-3', 'S24-2', 'S16-2', 'S17-1', 'S17-3', 'S18-2', 'S05-1', 'S05-3'],
      '4-3-3': ['S22-2', 'S23-1', 'S23-3', 'S24-2', 'S17-1', 'S17-2', 'S17-3', 'S04-1', 'S05-2', 'S06-3'],
      '3-5-2': ['S22-2', 'S23-2', 'S24-2', 'S15-1', 'S17-1', 'S17-2', 'S17-3', 'S18-3', 'S05-1', 'S05-3'],
      };
      return fallback[formation] ?? [];
    }
  private currentOrAutoSelectedLineup(formation: string): Observable<LineupDTO> {
    return this.harness.getCurrentLineup().pipe(
      switchMap((lineup) => {
        const playerCount = lineup.players?.length ?? 0;
        const slotCount = this.effectivePositionPixelSlots(lineup).length;
        if (playerCount === 11 && slotCount >= 11) {
          return of(lineup);
        }
        this.analysisReadyMessage.set(
          `Current lineup vac?o; auto-select ${formation} antes de correr el harness.`
        );
        return this.harness.autoSelectLineup(formation);
      })
    );
  }
  onResetInjuries(): void {
    this.mutationInFlight.set(true);
    this.harness.resetInjuries().subscribe({
      next: (resp) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          resp?.message ?? 'Injuries reset.',
          'OK',
          { duration: 3000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to reset injuries'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  onReplaceFixtures(): void {
    // V24D24 F2: For now the UI only triggers a no-op POST (the backend
    // expects a real CustomFixture[]). The full "Barcelona rival" preset
    // builder is out of F2 scope. Until then, we send an empty array.
    const preset = this.buildSingleMatchPreset();
    this.mutationInFlight.set(true);
    this.harness.replaceFixtures(preset).subscribe({
      next: (resp) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          resp?.message ?? 'Fixtures replaced.',
          'OK',
          { duration: 3000 }
        );
        this.clearMatchSelectionAfterFixtureMutation();
        // Match list will change ? reload.
        this.loadMatches();
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to replace fixtures'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  fmtXg(value: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬?';
    }
    return value.toFixed(2);
  }
  copyFormationMatrixJson(): void {
    const payload = JSON.stringify(this.formationReplayResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Formation matrix JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyCurrentLineupReplayJson(): void {
    const payload = JSON.stringify(this.currentLineupReplayResult(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Current lineup replay JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyCurrentLineupMultiSeedJson(): void {
    const payload = JSON.stringify(this.currentLineupMultiSeedSummary(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Current lineup multi-seed JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyModalVsCanonicalJson(): void {
    const payload = JSON.stringify(this.modalVsCanonicalSummary(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Base vs modal JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyPlayerSwapMatrixJson(): void {
    const payload = JSON.stringify(this.playerSwapMatrixSummary(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Player swap matrix JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyPlayerSwapBatteryJson(): void {
    const payload = JSON.stringify({
      mode: this.playerSwapBatteryModeModel,
      summary: this.playerSwapBatterySummary(),
      rows: this.playerSwapBatterySummaries(),
    }, null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Player swap battery JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyPlayerSwapBatteryReport(): void {
    const payload = this.playerSwapBatteryMarkdownReport();
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Player swap battery report copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyPositionPixelMatrixJson(): void {
    const payload = JSON.stringify(this.positionPixelExportPayload(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Filtered position movement JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyScenarioMatrixJson(): void {
    const payload = JSON.stringify(this.scenarioMatrixResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Scenario matrix JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyScenarioMatrixSummaryJson(): void {
    const payload = JSON.stringify(this.displayedScenarioMatrixSummaryRows(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Multi-seed scenario summary JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyScenarioBatteryJson(): void {
    const payload = JSON.stringify(this.scenarioBatteryRows(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Scenario battery JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  summarySeedStart(): number {
    return this.seedInputModel ?? 12345;
  }
  summarySeedEnd(): number {
    return this.summarySeedStart() + this.scenarioMatrixSummarySeedCount() - 1;
  }
  scenarioMatrixSummaryEffectiveSeedCount(): number {
    return Math.max(20, Math.min(50, Math.round(this.playerSwapSeedCountModel || 20)));
  }
  scenarioMatrixSmokeSeedCount(): number {
    return 5;
  }
  scrollToReplayAnalysis(): void {
    document.getElementById('test-harness-replay-analysis')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
  private markReplayAnalysisReady(message: string): void {
    this.analysisReadyMessage.set(`${message} Resultados listos abajo.`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
  }
  private clearReplayAnalysisResults(): void {
    this.currentLineupReplayResult.set(null);
    this.currentLineupMultiSeedSummary.set(null);
    this.modalVsCanonicalSummary.set(null);
    this.playerSwapMatrixSummary.set(null);
    this.playerSwapBatterySummaries.set([]);
    this.playerSwapPrecisionComparisonRows.set([]);
    this.positionPixelMatrixSummary.set(null);
    this.positionPixelMatrixRows.set([]);
    this.positionPixelEvidenceNote.set(null);
    this.roleSlotImpactRows.set([]);
    this.roleSlotImpactSmokeRows.set([]);
    this.roleSlotImpactSmokeRows.set([]);
    this.lineupDebugSnapshot.set(null);
    this.formationLineSmokeRows.set([]);
    this.formationReplayResults.set([]);
    this.formationMatrixSummaryResults.set([]);
    this.lowBlockLabRows.set([]);
    this.backFiveTransitionLabRows.set([]);
    this.backFiveFamilyLabRows.set([]);
    this.backFiveFamilyLabScope.set('');
    this.backFiveContextSmokeRows.set([]);
    this.scenarioMatrixResults.set([]);
    this.scenarioMatrixSummaryResults.set([]);
    this.scenarioBatteryRows.set([]);
    this.scenarioBatteryWorkload.set('');
  }
  private clearMatchSelectionAfterFixtureMutation(): void {
    this.selectedMatchId.set(null);
    this.selectedMatch.set(null);
    this.detailPanelVisible.set(true);
    this.timelineSnapshot.set(null);
    this.timelineError.set(null);
    this.timelineLoading.set(false);
    this.clearReplayAnalysisResults();
    this.analysisReadyMessage.set('Fixtures reemplazados. Elegí un partido nuevo antes de correr smokes.');
  }
  private clearPlayerSwapAnalysisResults(): void {
    this.playerSwapMatrixSummary.set(null);
    this.playerSwapBatterySummaries.set([]);
    this.playerSwapPrecisionComparisonRows.set([]);
  }
  private clearPositionPixelAnalysisResults(): void {
    this.positionPixelMatrixSummary.set(null);
    this.positionPixelMatrixRows.set([]);
    this.positionPixelEvidenceNote.set(null);
  }
  private clearReplayAnalysisResultsForLatestRun(): void {
    this.currentLineupReplayResult.set(null);
    this.currentLineupMultiSeedSummary.set(null);
    this.modalVsCanonicalSummary.set(null);
    this.lineupDiagnostic.set(null);
    this.playerSwapMatrixSummary.set(null);
    this.playerSwapBatterySummaries.set([]);
    this.playerSwapPrecisionComparisonRows.set([]);
    this.positionPixelMatrixSummary.set(null);
    this.positionPixelMatrixRows.set([]);
    this.positionPixelEvidenceNote.set(null);
    this.roleSlotImpactRows.set([]);
    this.roleSlotImpactSmokeRows.set([]);
    this.allFormationRoleSlotSmokeRows.set([]);
    this.lineupDebugSnapshot.set(null);
    this.formationReplayResults.set([]);
    this.formationMatrixSummaryResults.set([]);
    this.lowBlockLabRows.set([]);
    this.backFiveTransitionLabRows.set([]);
    this.backFiveFamilyLabRows.set([]);
    this.backFiveFamilyLabScope.set('');
    this.backFiveContextSmokeRows.set([]);
    this.sideMirrorSmokeRows.set([]);
    this.realSideMirrorRows.set([]);
    this.syntheticSideMirrorRows.set([]);
    this.scenarioMatrixResults.set([]);
    this.scenarioMatrixSummaryResults.set([]);
    this.scenarioBatteryRows.set([]);
  }
  private clearFormationLineAuditResults(): void {
    this.formationLineSmokeRows.set([]);
  }
  private clearFormationAverageResults(): void {
    this.formationMatrixSummaryResults.set([]);
    this.lowBlockLabRows.set([]);
    this.backFiveTransitionLabRows.set([]);
    this.backFiveFamilyLabRows.set([]);
    this.backFiveFamilyLabScope.set('');
    this.backFiveContextSmokeRows.set([]);
  }
  downloadFormationMatrixCsv(): void {
    const rows = this.formationReplayResults();
    const header = [
      'formation', 'homeGoals', 'awayGoals', 'homePossession', 'awayPossession',
      'homeShots', 'awayShots', 'homeXg', 'awayXg',
      'homeCentralShots', 'homeWideShots', 'homeLongShots',
      'awayCentralShots', 'awayWideShots', 'awayLongShots',
    ];
    const lines = [
      header.join(','),
      ...rows.map((r) => header.map((key) => this.csvCell((r as unknown as Record<string, unknown>)[key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formation-matrix-${this.seedInputModel ?? 'auto'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  downloadPlayerSwapMatrixCsv(): void {
    const row = this.playerSwapMatrixSummary();
    if (!row) {
      this.snackBar.open('Run Player swap matrix first.', 'OK', { duration: 2500 });
      return;
    }
    const exportRow = this.playerSwapExportRow(row);
    const header = [
      'swapRead', 'swapReadDetail', 'swapFit', 'swapFitDetail',
      'tacticalAttackRead', 'tacticalCentralControlRead', 'tacticalProtectionRead', 'tacticalChannelsRead', 'tacticalBreakdownDetail',
      'formation', 'slotId', 'baselinePlayer', 'swapPlayer',
      'baselinePlayerOverall', 'swapPlayerOverall', 'deltaPlayerOverall',
      'seedStart', 'seedEnd', 'seedCount',
      'deltaGoalsFor', 'deltaGoalsAgainst', 'deltaGoalDiff',
      'deltaShotsFor', 'deltaShotsAgainst', 'deltaPossessionFor',
      'deltaXgFor', 'deltaXgAgainst', 'deltaXgDiff',
      'preAutoSubDeltaShotsFor', 'preAutoSubDeltaShotsAgainst',
      'preAutoSubDeltaXgFor', 'preAutoSubDeltaXgAgainst', 'preAutoSubDeltaXgDiff',
      'deltaCentralShotsFor', 'deltaWideShotsFor', 'deltaLongShotsFor',
      'deltaCentralShotsAgainst', 'deltaWideShotsAgainst', 'deltaLongShotsAgainst',
      'baselineAvgXgFor', 'baselineAvgXgAgainst', 'baselineAvgXgDiff',
      'swappedAvgXgFor', 'swappedAvgXgAgainst', 'swappedAvgXgDiff',
      'timestamp',
    ];
    const lines = [
      header.join(','),
      header.map((key) => this.csvCell((exportRow as Record<string, unknown>)[key])).join(','),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-swap-${row.formation}-${row.slotId}-${row.seedStart}-${row.seedEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Player swap matrix CSV exported.', 'OK', { duration: 2500 });
  }
  downloadPlayerSwapBatteryCsv(): void {
    const rows = this.playerSwapBatterySummaries();
    if (rows.length === 0) {
      this.snackBar.open('Run Player swap battery first.', 'OK', { duration: 2500 });
      return;
    }
    const exportRows = rows.map((row) => this.playerSwapExportRow(row));
    const header = [
      'swapRead', 'swapReadDetail', 'swapFit', 'swapFitDetail',
      'tacticalAttackRead', 'tacticalCentralControlRead', 'tacticalProtectionRead', 'tacticalChannelsRead', 'tacticalBreakdownDetail',
      'formation', 'slotId', 'baselinePlayer', 'swapPlayer',
      'baselinePlayerOverall', 'swapPlayerOverall', 'deltaPlayerOverall',
      'seedStart', 'seedEnd', 'seedCount',
      'deltaGoalsFor', 'deltaGoalsAgainst', 'deltaGoalDiff',
      'deltaShotsFor', 'deltaShotsAgainst', 'deltaPossessionFor',
      'deltaXgFor', 'deltaXgAgainst', 'deltaXgDiff',
      'preAutoSubDeltaShotsFor', 'preAutoSubDeltaShotsAgainst',
      'preAutoSubDeltaXgFor', 'preAutoSubDeltaXgAgainst', 'preAutoSubDeltaXgDiff',
      'deltaCentralShotsFor', 'deltaWideShotsFor', 'deltaLongShotsFor',
      'deltaCentralShotsAgainst', 'deltaWideShotsAgainst', 'deltaLongShotsAgainst',
      'baselineAvgXgFor', 'baselineAvgXgAgainst', 'baselineAvgXgDiff',
      'swappedAvgXgFor', 'swappedAvgXgAgainst', 'swappedAvgXgDiff',
      'timestamp',
    ];
    const lines = [
      header.join(','),
      ...exportRows.map((row) => header.map((key) => this.csvCell(row[key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-swap-battery-${this.playerSwapBatteryPrecisionModel}-${rows[0].formation}-${rows[0].seedStart}-${rows[0].seedEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open(`Player swap battery CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  downloadPositionPixelMatrixCsv(): void {
    const rows = this.displayedPositionPixelMatrixRows().map((row) => this.positionPixelExportRow(row));
    const header = [
      'read', 'label', 'playerName', 'playerPosition', 'slotId',
      'fromXPercent', 'fromYPercent', 'targetXPercent', 'targetYPercent',
      'movementDistance', 'impactScore', 'shapeMove', 'shapeMoveDetail', 'tacticalRead', 'tacticalReadReason',
      'attackGainScore', 'attackLossScore', 'defensiveRiskScore', 'defensiveGainScore',
      'seedStart', 'seedEnd',
      'deltaXgFor', 'deltaXgAgainst', 'deltaXgDiff', 'deltaShotsFor', 'deltaShotsAgainst', 'deltaPossessionFor',
      'deltaCentralShotsFor', 'deltaWideShotsFor', 'deltaLongShotsFor',
      'deltaCentralShotsAgainst', 'deltaWideShotsAgainst', 'deltaLongShotsAgainst',
      'deltaCentralXgAgainst', 'deltaWideXgAgainst', 'deltaLongXgAgainst',
      'baselineXgFor', 'baselineXgAgainst', 'movedXgFor', 'movedXgAgainst', 'timestamp',
    ];
    const lines = [
      header.join(','),
      ...rows.map((r) => header.map((key) => this.csvCell((r as unknown as Record<string, unknown>)[key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `position-movement-${this.positionPixelReadFilter()}-${this.positionPixelSortMode()}-${this.seedInputModel ?? 'auto'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open(`Position movement CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  downloadScenarioMatrixSummaryCsv(): void {
    const rows = this.displayedScenarioMatrixSummaryRows().map((row) => this.scenarioSummaryExportRow(row));
    if (rows.length === 0) {
      this.snackBar.open('No scenario rows match the current filters.', 'OK', { duration: 2500 });
      return;
    }
    const header = [
      'read', 'impactScore', 'readReason',
      'coachRead', 'coachReadDetail', 'outcome', 'outcomeReason', 'attackGainScore', 'attackLossScore', 'defensiveGainScore', 'defensiveRiskScore',
      'scenario', 'baselineScenario', 'actionType', 'actionDetail',
      'seedStart', 'seedEnd', 'seedCount',
      'avgUserXgDelta', 'minUserXgDelta', 'maxUserXgDelta', 'avgOpponentXgDelta',
      'avgUserShotsDelta', 'avgOpponentShotsDelta', 'avgUserPossessionDelta',
      'avgUserCentralDelta', 'avgUserWideDelta', 'avgOpponentCentralDelta', 'avgOpponentWideDelta',
      'avgUserCentralXgDelta', 'avgUserWideXgDelta', 'avgOpponentCentralXgDelta', 'avgOpponentWideXgDelta',
      'avgUserLeftWideDelta', 'avgUserRightWideDelta', 'avgOpponentLeftWideDelta', 'avgOpponentRightWideDelta',
      'avgUserLeftWideXgDelta', 'avgUserRightWideXgDelta', 'avgOpponentLeftWideXgDelta', 'avgOpponentRightWideXgDelta',
    ];
    const lines = [
      header.join(','),
      ...rows.map((row) => header.map((key) => this.csvCell(row[key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-summary-${this.scenarioSummaryReadFilter()}-${this.scenarioSummarySortMode()}-${this.summarySeedStart()}-${this.summarySeedEnd()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open(`Scenario summary CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  downloadScenarioBatteryCsv(): void {
    const rows = this.scenarioBatteryRows().map((row) => this.scenarioBatteryExportRow(row));
    if (rows.length === 0) {
      this.snackBar.open('Run Battery tablero first.', 'OK', { duration: 2500 });
      return;
    }
    const header = [
      'match', 'controlledTeam', 'controlledSide', 'scenarioGroup', 'coachObjective', 'coachContext', 'coachContextDetail', 'review', 'reviewDetail', 'seedStart', 'seedCount', 'scenarioCount',
      'decision', 'decisionDetail',
      'plan', 'twoWay', 'attack', 'shape', 'protect', 'avoid', 'opponentThreat',
      'planDetail', 'twoWayDetail', 'attackDetail', 'shapeDetail', 'protectDetail', 'avoidDetail', 'opponentThreatDetail',
    ];
    const lines = [
      header.join(','),
      ...rows.map((row) => header.map((key) => this.csvCell(row[key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-battery-${this.summarySeedStart()}-${this.summarySeedStart() + this.scenarioMatrixSmokeSeedCount() - 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open(`Scenario battery CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  private csvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
  private playerSwapExportRow(row: PlayerSwapMatrixSummary): Record<string, unknown> {
    return {
      testCase: row.testCase,
      swapRead: row.swapRead,
      swapReadDetail: row.swapReadDetail,
      swapFit: row.swapFit,
      swapFitDetail: row.swapFitDetail,
      signalScore: row.signalScore,
      signalRead: row.signalRead,
      signalDetail: row.signalDetail,
      tacticalAttackRead: row.tacticalAttackRead,
      tacticalCentralControlRead: row.tacticalCentralControlRead,
      tacticalProtectionRead: row.tacticalProtectionRead,
      tacticalChannelsRead: row.tacticalChannelsRead,
      tacticalBreakdownDetail: row.tacticalBreakdownDetail,
      formation: row.formation,
      slotId: row.slotId,
      baselinePlayer: row.baselinePlayer,
      swapPlayer: row.swapPlayer,
      baselinePlayerOverall: row.baselinePlayerOverall,
      swapPlayerOverall: row.swapPlayerOverall,
      deltaPlayerOverall: row.deltaPlayerOverall,
      seedStart: row.seedStart,
      seedEnd: row.seedEnd,
      seedCount: row.seedCount,
      deltaGoalsFor: row.deltaGoalsFor,
      deltaGoalsAgainst: row.deltaGoalsAgainst,
      deltaGoalDiff: row.deltaGoalDiff,
      deltaShotsFor: row.deltaShotsFor,
      deltaShotsAgainst: row.deltaShotsAgainst,
      deltaPossessionFor: row.deltaPossessionFor,
      deltaXgFor: row.deltaXgFor,
      deltaXgAgainst: row.deltaXgAgainst,
      deltaXgDiff: row.deltaXgDiff,
      preAutoSubDeltaShotsFor: row.preAutoSubDeltaShotsFor,
      preAutoSubDeltaShotsAgainst: row.preAutoSubDeltaShotsAgainst,
      preAutoSubDeltaXgFor: row.preAutoSubDeltaXgFor,
      preAutoSubDeltaXgAgainst: row.preAutoSubDeltaXgAgainst,
      preAutoSubDeltaXgDiff: row.preAutoSubDeltaXgDiff,
      deltaCentralShotsFor: row.deltaCentralShotsFor,
      deltaWideShotsFor: row.deltaWideShotsFor,
      deltaLongShotsFor: row.deltaLongShotsFor,
      deltaCentralShotsAgainst: row.deltaCentralShotsAgainst,
      deltaWideShotsAgainst: row.deltaWideShotsAgainst,
      deltaLongShotsAgainst: row.deltaLongShotsAgainst,
      baselineAvgXgFor: row.baseline.avgXgFor,
      baselineAvgXgAgainst: row.baseline.avgXgAgainst,
      baselineAvgXgDiff: row.baseline.avgXgDiff,
      swappedAvgXgFor: row.swapped.avgXgFor,
      swappedAvgXgAgainst: row.swapped.avgXgAgainst,
      swappedAvgXgDiff: row.swapped.avgXgDiff,
      timestamp: row.timestamp,
    };
  }
  private playerSwapBatteryMarkdownReport(): string {
    const rows = this.playerSwapBatterySummaries();
    const summary = this.playerSwapBatterySummary();
    const match = this.selectedMatch();
    const matchLabel = match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Unknown match';
    const first = rows[0] ?? null;
    const lines = [
      '# Player Swap Battery Report',
      '',
      `Match: ${matchLabel}`,
      `Mode: ${summary.mode}`,
      `Precision: ${summary.precision}`,
      `Confidence: ${summary.confidence}`,
      `Seeds: ${first ? `${first.seedStart}..${first.seedEnd}` : 'n/a'}`,
      '',
      `Best: ${this.playerSwapBatteryBestWorstText(summary.best)}`,
      `Worst: ${this.playerSwapBatteryBestWorstText(summary.worst)}`,
      '',
      `Reads: ${this.playerSwapBatteryCounterText(summary.reads)}`,
      `Fit: ${this.playerSwapBatteryCounterText(summary.fits)}`,
      '',
      `Coach read: ${this.playerSwapBatteryCoachRead(summary)}`,
      '',
      '| Swap | OVR | Fit | Read | Señal | Ataque | Control | Proteccion | Canales | Shots | Shots Ag. | xG For | xG Ag. | xG Diff | Pre xG Diff |',
      '| --- | ---: | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...rows.map((row) =>
        `| ${row.baselinePlayer} -> ${row.swapPlayer} | ${this.playerSwapOverallText(row)} | ${row.swapFit} | ${row.swapRead} | ${row.signalRead} | ${row.tacticalAttackRead} | ${row.tacticalCentralControlRead} | ${row.tacticalProtectionRead} | ${row.tacticalChannelsRead} | ${this.fmtDeltaNumber(row.deltaShotsFor)} | ${this.fmtDeltaNumber(row.deltaShotsAgainst)} | ${this.fmtDeltaNumber(row.deltaXgFor)} | ${this.fmtDeltaNumber(row.deltaXgAgainst)} | ${this.fmtDeltaNumber(row.deltaXgDiff)} | ${this.fmtDeltaNumber(row.preAutoSubDeltaXgDiff || 0)} |`
      ),
      '',
      '## Tactical breakdown detail',
      '',
      ...rows.map((row) => `- ${row.baselinePlayer} -> ${row.swapPlayer}: ${row.tacticalBreakdownDetail}`),
      '',
    ];
    return lines.join('\n');
  }
  private playerSwapBatteryCoachRead(summary: PlayerSwapBatterySummary): string {
    if (summary.total === 0) {
      return 'No hay swaps medidos todavia. Ejecutar Player swap battery antes de sacar conclusiones.';
    }
    const upgrades = summary.reads['Clear upgrade'] ?? 0;
    const downgrades = summary.reads['Clear downgrade'] ?? 0;
    const reviews = summary.reads['Needs review'] ?? 0;
    const noise = summary.reads['Noise / neutral'] ?? 0;
    const outOfRole = summary.fits['Out of role'] ?? 0;
    const confidencePrefix = summary.precision === 'quick'
      ? 'Smoke test de baja confianza: usar para detectar se?ales, no para decidir definitivo. '
      : summary.precision === 'balanced'
        ? 'Lectura balanceada: buena para decidir que casos repetir en Reliable. '
        : 'Lectura reliable: apta para tomar decisiones de calibracion si la senal es consistente. ';
    const fitWarning = outOfRole > 0
      ? `Hay ${outOfRole} cambio(s) fuera de rol; separar esos experimentos de los cambios naturales. `
      : '';
    if (upgrades > 0 && downgrades === 0 && reviews === 0) {
      return `${confidencePrefix}${fitWarning}La bateria favorece cambios positivos claros (${upgrades}/${summary.total}).`;
    }
    if (downgrades > 0 && upgrades === 0 && reviews === 0) {
      return `${confidencePrefix}${fitWarning}La bateria detecta riesgo de empeorar el equipo (${downgrades}/${summary.total}).`;
    }
    if (upgrades > 0 || downgrades > 0 || reviews > 0) {
      return `${confidencePrefix}${fitWarning}Hay senales mixtas: ${upgrades} upgrade(s), ${downgrades} downgrade(s), ${reviews} para revisar y ${noise} neutro(s). Repetir los casos decisivos con mas seeds.`;
    }
    return `${confidencePrefix}${fitWarning}No aparece una senal fuerte: los cambios medidos se comportan como ruido o impacto menor.`;
  }
  private positionPixelExportPayload(): {
    metadata: {
      matchId: string | null;
      matchLabel: string | null;
      readFilter: PositionPixelReadFilter;
      sortMode: PositionPixelSortMode;
      visibleRows: number;
      totalRows: number;
      readSummary: Array<{ label: string; level: PositionPixelReadLevel; count: number }>;
      tacticalReadSummary: Array<{ label: string; count: number; className: string; hint: string }>;
      visualExpectationSummary: Array<{ label: string; count: number; className: string; hint: string }>;
      visualEngineTensionSummary: Array<{ label: string; count: number; className: string; hint: string }>;
      lineupDebug: LineupDebugSnapshot | null;
    };
    rows: PositionPixelExportRow[];
  } {
    const match = this.selectedMatch();
    return {
      metadata: {
        matchId: this.selectedMatchId(),
        matchLabel: match ? `${match.homeTeamName} vs ${match.awayTeamName}` : null,
        readFilter: this.positionPixelReadFilter(),
        sortMode: this.positionPixelSortMode(),
        visibleRows: this.displayedPositionPixelMatrixRows().length,
        totalRows: this.positionPixelMatrixRows().length,
        readSummary: this.positionPixelReadSummary(),
        tacticalReadSummary: this.positionPixelTacticalReadSummary(),
        visualExpectationSummary: this.positionPixelVisualExpectationSummary(),
        visualEngineTensionSummary: this.positionPixelVisualEngineTensionSummary(),
        lineupDebug: this.lineupDebugSnapshot(),
      },
      rows: this.displayedPositionPixelMatrixRows().map((row) => this.positionPixelExportRow(row)),
    };
  }
  private positionPixelExportRow(row: PositionPixelMatrixSummary): PositionPixelExportRow {
    return {
      ...row,
      read: this.positionPixelRead(row),
      tacticalRead: this.positionPixelTacticalRead(row),
      tacticalReadReason: this.positionPixelTacticalReadReason(row),
      channelBreakdownRead: this.positionPixelChannelBreakdownRead(row),
      channelBreakdownDetail: this.positionPixelChannelBreakdownDetail(row),
      visualExpectationRead: this.positionPixelVisualExpectationRead(row),
      visualExpectationDetail: this.positionPixelVisualExpectationDetail(row),
      visualEngineTensionRead: this.positionPixelVisualEngineTensionRead(row),
      visualEngineTensionDetail: this.positionPixelVisualEngineTensionDetail(row),
      shapeMove: this.positionPixelShapeMove(row),
      shapeMoveDetail: this.positionPixelShapeMoveDetail(row),
      movementDistance: Number(this.positionPixelDistance(row).toFixed(3)),
      impactScore: Number(this.positionPixelImpactScore(row).toFixed(3)),
      signalScore: Number(row.signalScore.toFixed(3)),
      signalRead: row.signalRead,
      signalDetail: row.signalDetail,
      attackGainScore: Number(this.positionPixelAttackGainScore(row).toFixed(3)),
      attackLossScore: Number(this.positionPixelAttackLossScore(row).toFixed(3)),
      defensiveRiskScore: Number(this.positionPixelDefensiveRiskScore(row).toFixed(3)),
      defensiveGainScore: Number(this.positionPixelDefensiveGainScore(row).toFixed(3)),
    };
  }
  private buildFormationReplayResult(
    formation: FormationCode,
    fixture: MatchFixture,
    detail: MatchDetail | null
  ): FormationReplayResult {
    const zoneSummary = this.summarizeShotZones(detail);
    return {
      formation,
      homeGoals: fixture?.result?.homeGoals ?? null,
      awayGoals: fixture?.result?.awayGoals ?? null,
      homePossession: fixture?.result?.homePossession ?? null,
      awayPossession: fixture?.result?.awayPossession ?? null,
      homeShots: fixture?.result?.homeShots ?? null,
      awayShots: fixture?.result?.awayShots ?? null,
      homeXg: detail?.homeXg ?? null,
      awayXg: detail?.awayXg ?? null,
      homeCentralShots: zoneSummary.home.central,
      homeWideShots: zoneSummary.home.wide,
      homeLongShots: zoneSummary.home.long,
      awayCentralShots: zoneSummary.away.central,
      awayWideShots: zoneSummary.away.wide,
      awayLongShots: zoneSummary.away.long,
    };
  }
  private buildFormationReplayResultFromMatrix(row: FormationMatrixRow): FormationReplayResult {
    return {
      formation: row.formation as FormationCode,
      homeGoals: row.homeGoals,
      awayGoals: row.awayGoals,
      homePossession: row.homePossession,
      awayPossession: row.awayPossession,
      homeShots: row.homeShots,
      awayShots: row.awayShots,
      homeXg: row.homeXg,
      awayXg: row.awayXg,
      homeCentralShots: row.homeCentralShots,
      homeWideShots: row.homeWideShots,
      homeLongShots: row.homeLongShots,
      awayCentralShots: row.awayCentralShots,
      awayWideShots: row.awayWideShots,
      awayLongShots: row.awayLongShots,
    };
  }
  private buildCurrentLineupReplayResult(
    lineup: LineupDTO,
    fixture: MatchFixture,
    detail: MatchDetail | null
  ): CurrentLineupReplayResult {
    const zoneSummary = this.summarizeShotZones(detail);
    const userIsHome = this.selectedUserTeamIsHome();
    const goalsFor = userIsHome ? fixture?.result?.homeGoals : fixture?.result?.awayGoals;
    const goalsAgainst = userIsHome ? fixture?.result?.awayGoals : fixture?.result?.homeGoals;
    const possessionFor = userIsHome ? fixture?.result?.homePossession : fixture?.result?.awayPossession;
    const possessionAgainst = userIsHome ? fixture?.result?.awayPossession : fixture?.result?.homePossession;
    const shotsFor = userIsHome ? fixture?.result?.homeShots : fixture?.result?.awayShots;
    const shotsAgainst = userIsHome ? fixture?.result?.awayShots : fixture?.result?.homeShots;
    const xgFor = userIsHome ? detail?.homeXg : detail?.awayXg;
    const xgAgainst = userIsHome ? detail?.awayXg : detail?.homeXg;
    const zonesFor = userIsHome ? zoneSummary.home : zoneSummary.away;
    const zonesAgainst = userIsHome ? zoneSummary.away : zoneSummary.home;
    return {
      label: `${this.userTeamName() || 'User team'} vs current opponent`,
      formation: lineup?.formation ?? null,
      seed: this.seedInputModel,
      style: this.selectedStyleModel,
      playerCount: lineup?.players?.length ?? 0,
      starters: (lineup?.players ?? []).map((p) => `${p.name} (${p.position})`),
      score: `${goalsFor ?? '?'}-${goalsAgainst ?? '?'}`,
      possession: `${this.fmtPct(possessionFor ?? null)} / ${this.fmtPct(possessionAgainst ?? null)}`,
      shots: `${shotsFor ?? '?'} / ${shotsAgainst ?? '?'}`,
      xg: `${this.fmtXg(xgFor ?? null)} / ${this.fmtXg(xgAgainst ?? null)}`,
      zones: `${zonesFor.central}/${zonesFor.wide}/${zonesFor.long} / ${zonesAgainst.central}/${zonesAgainst.wide}/${zonesAgainst.long}`,
      timestamp: new Date().toISOString(),
    };
  }
  private buildCurrentLineupMultiSeedSummary(
    samples: CurrentLineupReplaySample[]
  ): CurrentLineupMultiSeedSummary | null {
    if (samples.length === 0) {
      return null;
    }
    const first = samples[0];
    const sums = samples.reduce((acc, sample) => {
      const metrics = this.currentLineupSampleMetrics(sample.fixture, sample.detail);
      acc.goalsFor += metrics.goalsFor;
      acc.goalsAgainst += metrics.goalsAgainst;
      acc.possessionFor += metrics.possessionFor;
      acc.shotsFor += metrics.shotsFor;
      acc.shotsAgainst += metrics.shotsAgainst;
      acc.xgFor += metrics.xgFor;
      acc.xgAgainst += metrics.xgAgainst;
      acc.centralShotsFor += metrics.centralShotsFor;
      acc.wideShotsFor += metrics.wideShotsFor;
      acc.longShotsFor += metrics.longShotsFor;
      acc.centralShotsAgainst += metrics.centralShotsAgainst;
      acc.wideShotsAgainst += metrics.wideShotsAgainst;
      acc.longShotsAgainst += metrics.longShotsAgainst;
      return acc;
    }, {
      goalsFor: 0,
      goalsAgainst: 0,
      possessionFor: 0,
      shotsFor: 0,
      shotsAgainst: 0,
      xgFor: 0,
      xgAgainst: 0,
      centralShotsFor: 0,
      wideShotsFor: 0,
      longShotsFor: 0,
      centralShotsAgainst: 0,
      wideShotsAgainst: 0,
      longShotsAgainst: 0,
    });
    const n = samples.length;
    const avgGoalsFor = sums.goalsFor / n;
    const avgGoalsAgainst = sums.goalsAgainst / n;
    const avgShotsFor = sums.shotsFor / n;
    const avgShotsAgainst = sums.shotsAgainst / n;
    const avgXgFor = sums.xgFor / n;
    const avgXgAgainst = sums.xgAgainst / n;
    const seeds = samples.map((s) => s.seed);
    return {
      label: `${this.userTeamName() || 'User team'} vs current opponent`,
      formation: first.lineup?.formation ?? null,
      style: this.selectedStyleModel,
      seedStart: Math.min(...seeds),
      seedEnd: Math.max(...seeds),
      seedCount: n,
      playerCount: first.lineup?.players?.length ?? 0,
      starters: (first.lineup?.players ?? []).map((p) => `${p.name} (${p.position})`),
      avgGoalsFor,
      avgGoalsAgainst,
      avgGoalDiff: avgGoalsFor - avgGoalsAgainst,
      avgPossessionFor: sums.possessionFor / n,
      avgShotsFor,
      avgShotsAgainst,
      avgShotDiff: avgShotsFor - avgShotsAgainst,
      avgXgFor,
      avgXgAgainst,
      avgXgDiff: avgXgFor - avgXgAgainst,
      avgCentralShotsFor: sums.centralShotsFor / n,
      avgWideShotsFor: sums.wideShotsFor / n,
      avgLongShotsFor: sums.longShotsFor / n,
      avgCentralShotsAgainst: sums.centralShotsAgainst / n,
      avgWideShotsAgainst: sums.wideShotsAgainst / n,
      avgLongShotsAgainst: sums.longShotsAgainst / n,
      timestamp: new Date().toISOString(),
    };
  }
  private buildModalVsCanonicalSummary(
    originalLineup: LineupDTO,
    canonical: CurrentLineupMultiSeedSummary,
    modal: CurrentLineupMultiSeedSummary
  ): ModalVsCanonicalSummary {
    const deltaGoalsFor = modal.avgGoalsFor - canonical.avgGoalsFor;
    const deltaGoalsAgainst = modal.avgGoalsAgainst - canonical.avgGoalsAgainst;
    const deltaXgFor = modal.avgXgFor - canonical.avgXgFor;
    const deltaXgAgainst = modal.avgXgAgainst - canonical.avgXgAgainst;
    const deltaShotDiff = modal.avgShotDiff - canonical.avgShotDiff;
    const customSlotCount = (originalLineup.slots ?? []).filter((slot) =>
      Number.isFinite(slot.customXPercent) || Number.isFinite(slot.customYPercent)
    ).length;
    const customMovableSlotCount = this.countCustomMovableSlots(originalLineup);
    const net = deltaXgFor - deltaXgAgainst + deltaShotDiff * 0.03;
    const coachRead = customMovableSlotCount === 0
      ? 'Sin jugador de campo movido'
      : net > 0.05
      ? 'Modal mejora'
      : net < -0.05
        ? 'Modal empeora'
        : 'Impacto leve';
    return {
      label: `${this.userTeamName() || 'User team'} vs current opponent`,
      formation: originalLineup.formation ?? null,
      style: this.selectedStyleModel,
      seedStart: Math.min(canonical.seedStart, modal.seedStart),
      seedEnd: Math.max(canonical.seedEnd, modal.seedEnd),
      seedCount: Math.min(canonical.seedCount, modal.seedCount),
      customSlotCount,
      customMovableSlotCount,
      canonical,
      modal,
      deltaGoalsFor,
      deltaGoalsAgainst,
      deltaGoalDiff: modal.avgGoalDiff - canonical.avgGoalDiff,
      deltaPossessionFor: modal.avgPossessionFor - canonical.avgPossessionFor,
      deltaShotsFor: modal.avgShotsFor - canonical.avgShotsFor,
      deltaShotsAgainst: modal.avgShotsAgainst - canonical.avgShotsAgainst,
      deltaShotDiff,
      deltaXgFor,
      deltaXgAgainst,
      deltaXgDiff: modal.avgXgDiff - canonical.avgXgDiff,
      deltaCentralShotsFor: modal.avgCentralShotsFor - canonical.avgCentralShotsFor,
      deltaWideShotsFor: modal.avgWideShotsFor - canonical.avgWideShotsFor,
      deltaLongShotsFor: modal.avgLongShotsFor - canonical.avgLongShotsFor,
      deltaCentralShotsAgainst: modal.avgCentralShotsAgainst - canonical.avgCentralShotsAgainst,
      deltaWideShotsAgainst: modal.avgWideShotsAgainst - canonical.avgWideShotsAgainst,
      deltaLongShotsAgainst: modal.avgLongShotsAgainst - canonical.avgLongShotsAgainst,
      coachRead,
      coachReadClass: customMovableSlotCount === 0 ? 'delta-neutral' : net > 0.05 ? 'delta-good' : net < -0.05 ? 'delta-bad' : 'delta-neutral',
      timestamp: new Date().toISOString(),
    };
  }
  private currentLineupSummaryFromPreview(
    lineup: LineupDTO,
    preview: MatchPreviewSummary
  ): CurrentLineupMultiSeedSummary {
    return {
      label: `${this.userTeamName() || preview.teamName || 'User team'} vs current opponent`,
      formation: preview.formation ?? lineup.formation ?? null,
      style: this.selectedStyleModel,
      seedStart: preview.seedStart,
      seedEnd: preview.seedEnd,
      seedCount: preview.seedCount,
      playerCount: lineup.players?.length ?? 0,
      starters: (lineup.players ?? []).map((p) => `${p.name} (${p.position})`),
      avgGoalsFor: preview.avgGoalsFor,
      avgGoalsAgainst: preview.avgGoalsAgainst,
      avgGoalDiff: preview.avgGoalDiff,
      avgPossessionFor: preview.avgPossessionFor,
      avgShotsFor: preview.avgShotsFor,
      avgShotsAgainst: preview.avgShotsAgainst,
      avgShotDiff: preview.avgShotDiff,
      avgXgFor: preview.avgXgFor,
      avgXgAgainst: preview.avgXgAgainst,
      avgXgDiff: preview.avgXgDiff,
      avgCentralShotsFor: preview.avgCentralShotsFor,
      avgWideShotsFor: preview.avgWideShotsFor,
      avgLongShotsFor: preview.avgLongShotsFor,
      avgCentralShotsAgainst: preview.avgCentralShotsAgainst,
      avgWideShotsAgainst: preview.avgWideShotsAgainst,
      avgLongShotsAgainst: preview.avgLongShotsAgainst,
      timestamp: new Date().toISOString(),
    };
  }
  private canonicalizeLineupSlots(lineup: LineupDTO): LineupSlotDTO[] {
    return this.buildLineupSlots(lineup).map((slot) => ({
      playerId: slot.playerId,
      subdivisionId: slot.subdivisionId,
    }));
  }
  private toPlayerSwapMatrixSummary(
    row: PlayerSwapMatrixSummaryRow,
    candidate: PlayerSwapCandidate | null
  ): PlayerSwapMatrixSummary {
    const baselinePlayer = row.baselinePlayerName || candidate?.starterName || row.baselinePlayerId;
    const swapPlayer = row.swapPlayerName || candidate?.benchName || row.swapPlayerId;
    const fitCandidate: PlayerSwapCandidate | null = candidate
      ? {
          ...candidate,
          starterName: baselinePlayer,
          benchName: swapPlayer,
          starterPosition: row.baselinePlayerPosition || candidate.starterPosition,
          benchPosition: row.swapPlayerPosition || candidate.benchPosition,
        }
      : null;
    const baseline: CurrentLineupMultiSeedSummary = {
      label: `${baselinePlayer} como titular`,
      formation: row.formation,
      style: this.selectedStyleModel,
      seedStart: row.seedStart,
      seedEnd: row.seedEnd,
      seedCount: row.seedCount,
      playerCount: 11,
      starters: [`${baselinePlayer} (${row.baselinePlayerPosition || 'starter'})`],
      avgGoalsFor: row.baselineAvgGoalsFor,
      avgGoalsAgainst: row.baselineAvgGoalsAgainst,
      avgGoalDiff: row.baselineAvgGoalDiff,
      avgPossessionFor: row.baselineAvgPossessionFor,
      avgShotsFor: row.baselineAvgShotsFor,
      avgShotsAgainst: row.baselineAvgShotsAgainst,
      avgShotDiff: row.baselineAvgShotsFor - row.baselineAvgShotsAgainst,
      avgXgFor: row.baselineAvgXgFor,
      avgXgAgainst: row.baselineAvgXgAgainst,
      avgXgDiff: row.baselineAvgXgDiff,
      avgCentralShotsFor: row.baselineAvgCentralShotsFor,
      avgWideShotsFor: row.baselineAvgWideShotsFor,
      avgLongShotsFor: row.baselineAvgLongShotsFor,
      avgCentralShotsAgainst: row.baselineAvgCentralShotsAgainst,
      avgWideShotsAgainst: row.baselineAvgWideShotsAgainst,
      avgLongShotsAgainst: row.baselineAvgLongShotsAgainst,
      timestamp: new Date().toISOString(),
    };
    const swapped: CurrentLineupMultiSeedSummary = {
      ...baseline,
      label: `${swapPlayer} en el mismo slot`,
      starters: [`${swapPlayer} (${row.swapPlayerPosition || 'bench'})`],
      avgGoalsFor: row.swappedAvgGoalsFor,
      avgGoalsAgainst: row.swappedAvgGoalsAgainst,
      avgGoalDiff: row.swappedAvgGoalDiff,
      avgPossessionFor: row.swappedAvgPossessionFor,
      avgShotsFor: row.swappedAvgShotsFor,
      avgShotsAgainst: row.swappedAvgShotsAgainst,
      avgShotDiff: row.swappedAvgShotsFor - row.swappedAvgShotsAgainst,
      avgXgFor: row.swappedAvgXgFor,
      avgXgAgainst: row.swappedAvgXgAgainst,
      avgXgDiff: row.swappedAvgXgDiff,
      avgCentralShotsFor: row.swappedAvgCentralShotsFor,
      avgWideShotsFor: row.swappedAvgWideShotsFor,
      avgLongShotsFor: row.swappedAvgLongShotsFor,
      avgCentralShotsAgainst: row.swappedAvgCentralShotsAgainst,
      avgWideShotsAgainst: row.swappedAvgWideShotsAgainst,
      avgLongShotsAgainst: row.swappedAvgLongShotsAgainst,
    };
    const testCase = this.playerSwapResolvedTestCase(candidate, fitCandidate);
    return {
      testCase,
      slotId: row.slotId || candidate?.slotId || 'slot',
      formation: row.formation,
      seedStart: row.seedStart,
      seedEnd: row.seedEnd,
      seedCount: row.seedCount,
      baselinePlayer,
      swapPlayer,
      baselinePlayerOverall: row.baselinePlayerOverall ?? null,
      swapPlayerOverall: row.swapPlayerOverall ?? null,
      deltaPlayerOverall: row.baselinePlayerOverall != null && row.swapPlayerOverall != null
        ? row.swapPlayerOverall - row.baselinePlayerOverall
        : null,
      baseline,
      swapped,
      deltaGoalsFor: row.deltaGoalsFor,
      deltaGoalsAgainst: row.deltaGoalsAgainst,
      deltaGoalDiff: row.deltaGoalDiff,
      deltaShotsFor: row.deltaShotsFor,
      deltaShotsAgainst: row.deltaShotsAgainst,
      deltaPossessionFor: row.deltaPossessionFor,
      deltaXgFor: row.deltaXgFor,
      deltaXgAgainst: row.deltaXgAgainst,
      deltaXgDiff: row.deltaXgDiff,
      deltaCentralShotsFor: row.deltaCentralShotsFor,
      deltaWideShotsFor: row.deltaWideShotsFor,
      deltaLongShotsFor: row.deltaLongShotsFor,
      deltaCentralShotsAgainst: row.deltaCentralShotsAgainst,
      deltaWideShotsAgainst: row.deltaWideShotsAgainst,
      deltaLongShotsAgainst: row.deltaLongShotsAgainst,
      preAutoSubDeltaShotsFor: row.preAutoSubDeltaShotsFor,
      preAutoSubDeltaShotsAgainst: row.preAutoSubDeltaShotsAgainst,
      preAutoSubDeltaXgFor: row.preAutoSubDeltaXgFor,
      preAutoSubDeltaXgAgainst: row.preAutoSubDeltaXgAgainst,
      preAutoSubDeltaXgDiff: row.preAutoSubDeltaXgDiff,
      swapRead: this.playerSwapCoachRead(row, fitCandidate),
      swapReadDetail: this.playerSwapCoachReadDetail(row, fitCandidate),
      swapReadClass: this.playerSwapCoachReadClass(row, fitCandidate),
      swapFit: this.playerSwapFit(fitCandidate),
      swapFitDetail: this.playerSwapFitDetail(fitCandidate),
      swapFitClass: this.playerSwapFitClass(fitCandidate),
      signalScore: this.playerSwapSignalScore(row, fitCandidate),
      signalRead: this.playerSwapSignalRead(row, fitCandidate),
      signalClass: this.playerSwapSignalClass(row, fitCandidate),
      signalDetail: this.playerSwapSignalDetail(row, fitCandidate),
      ...this.playerSwapTacticalBreakdown(row, fitCandidate),
      timestamp: new Date().toISOString(),
    };
  }
  private roleSlotImpactSmokeExportPayload(): {
    match: string;
    formation: string | null;
    seedStart: number;
    seedCount: number;
    generatedAt: string;
    summary: Record<string, number>;
    rows: RoleSlotImpactSmokeRow[];
  } {
    const rows = this.roleSlotImpactSmokeRows();
    const match = this.selectedMatch();
    const matchLabel = match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Unknown match';
    return {
      match: matchLabel,
      formation: this.selectedFormationModel ?? null,
      seedStart: this.summarySeedStart(),
      seedCount: 10,
      generatedAt: new Date().toISOString(),
      summary: this.roleSlotImpactSmokeVerdictCounter(rows),
      rows,
    };
  }
  private roleSlotImpactSmokeMarkdownReport(): string {
    const payload = this.roleSlotImpactSmokeExportPayload();
    const rows = payload.rows;
    const summaryText = Object.entries(payload.summary)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ') || 'sin filas';
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
      ...rows.map((row) =>
        `| ${row.slotId} | ${row.player} | ${row.bestRole} | ${this.fmtPct(row.bestEff * 100)} | ${row.worstRole} | ${this.fmtPct(row.worstEff * 100)} | ${this.fmtPct(row.gap * 100)} | ${row.verdict} |`
      ),
      '',
      'Lectura: si un slot defensivo prefiere DEF/LB/RB/CB y penaliza ATT, y un slot ofensivo prefiere ATT/WINGER/LW/RW y penaliza DEF, el modal esta llegando al motor. Si aparece "Revisar", ese slot necesita calibracion visual o de efectividad.',
      '',
    ];
    return lines.join('\n');
  }
  private roleSlotImpactSmokeVerdictCounter(rows: RoleSlotImpactSmokeRow[]): Record<string, number> {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.verdict || 'Sin veredicto';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }
  private allFormationsRoleSlotSmokeExportPayload(): {
    match: string;
    seedStart: number;
    seedCount: number;
    generatedAt: string;
    summary: Record<string, number>;
    rows: AllFormationRoleSlotSmokeRow[];
  } {
    const rows = this.allFormationRoleSlotSmokeRows();
    const match = this.selectedMatch();
    const matchLabel = match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Unknown match';
    return {
      match: matchLabel,
      seedStart: this.summarySeedStart(),
      seedCount: 5,
      generatedAt: new Date().toISOString(),
      summary: rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.verdict] = (acc[row.verdict] ?? 0) + 1;
        return acc;
      }, {}),
      rows,
    };
  }
  private allFormationsRoleSlotSmokeMarkdownReport(): string {
    const payload = this.allFormationsRoleSlotSmokeExportPayload();
    const summaryText = Object.entries(payload.summary)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ') || 'sin filas';
    const lines = [
      '# All Formations Role Slot Smoke',
      '',
      `Match: ${payload.match}`,
      `Seeds: ${payload.seedStart}..${payload.seedStart + payload.seedCount - 1}`,
      `Generated at: ${payload.generatedAt}`,
      '',
      `Summary: ${summaryText}`,
      '',
      '| Formacion | Slots | Claro | Visible | Revisar | Min gap | Avg gap | Slot debil | Veredicto |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
      ...payload.rows.map((row) =>
        `| ${row.formation} | ${row.slots} | ${row.clear} | ${row.visible} | ${row.review} | ${this.fmtPct(row.minGap * 100)} | ${this.fmtPct(row.avgGap * 100)} | ${row.weakestSlot} | ${row.verdict} |`
      ),
      '',
      'Lectura: cada formacion debe sostener gaps claros/visibles entre rol natural e improvisado. Si una formacion cae en "Revisar", hay que abrir su detalle de slots y calibrar auto-select, coordenadas o efectividad.',
      '',
    ];
    return lines.join('\n');
  }
  copyRoleSlotImpactSmokeJson(): void {
    const payload = JSON.stringify(this.roleSlotImpactSmokeExportPayload(), null, 2);
    this.copyTextPayload(payload, 'Role slot smoke JSON copied.');
  }
  copyRoleSlotImpactSmokeReport(): void {
    const payload = this.roleSlotImpactSmokeMarkdownReport();
    this.copyTextPayload(payload, 'Role slot smoke report copied.');
  }
  copyAllFormationsRoleSlotSmokeJson(): void {
    const payload = JSON.stringify(this.allFormationsRoleSlotSmokeExportPayload(), null, 2);
    this.copyTextPayload(payload, 'All formations role-slot JSON copied.');
  }
  copyAllFormationsRoleSlotSmokeReport(): void {
    const payload = this.allFormationsRoleSlotSmokeMarkdownReport();
    this.copyTextPayload(payload, 'All formations role-slot report copied.');
  }
  private copyTextPayload(payload: string, successMessage: string): void {
    const fallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = payload;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      this.snackBar.open(copied ? successMessage : payload, 'OK', { duration: copied ? 2500 : 5000 });
    };
    const clipboardWrite = navigator.clipboard?.writeText(payload);
    if (!clipboardWrite) {
      fallback();
      return;
    }
    clipboardWrite.then(
      () => this.snackBar.open(successMessage, 'OK', { duration: 2500 }),
      fallback
    );
  }
  private playerSwapResolvedTestCase(candidate: PlayerSwapCandidate | null, resolved: PlayerSwapCandidate | null): string {
    const base = candidate?.testCase ?? this.playerSwapFit(candidate);
    if (!candidate?.testCase?.startsWith('Stress:') || !resolved) {
      return base;
    }
    const expected = this.playerSwapStressExpectedLines(candidate.testCase);
    if (!expected) {
      return base;
    }
    const starterLine = this.positionPixelLine(resolved.starterPosition);
    const benchLine = this.positionPixelLine(resolved.benchPosition);
    if (starterLine === expected.starterLine && benchLine === expected.benchLine) {
      return base;
    }
    return `${base} · fallback ${starterLine}->${benchLine}`;
  }
  private playerSwapStressExpectedLines(testCase: string): { starterLine: 'ATT' | 'MID' | 'DEF'; benchLine: 'ATT' | 'MID' | 'DEF' } | null {
    if (testCase.includes('atacante por defensor')) return { starterLine: 'ATT', benchLine: 'DEF' };
    if (testCase.includes('defensor por atacante')) return { starterLine: 'DEF', benchLine: 'ATT' };
    if (testCase.includes('medio por atacante') || testCase.includes('medio por banda/ataque')) return { starterLine: 'MID', benchLine: 'ATT' };
    if (testCase.includes('medio por defensor')) return { starterLine: 'MID', benchLine: 'DEF' };
    return null;
  }
  playerSwapOverallText(row: PlayerSwapMatrixSummary): string {
    if (row.baselinePlayerOverall == null || row.swapPlayerOverall == null || row.deltaPlayerOverall == null) {
      return String.fromCharCode(8212);
    }
    return `${row.baselinePlayerOverall}${String.fromCharCode(8594)}${row.swapPlayerOverall} (${this.fmtDeltaNumber(row.deltaPlayerOverall)})`;
  }
  private toPositionPixelMatrixSummary(row: PositionPixelMatrixSummaryRow, label = '1px forward'): PositionPixelMatrixSummary {
    return {
      label,
      playerName: row.playerName,
      playerPosition: row.playerPosition,
      slotId: row.slotId,
      fromXPercent: row.fromXPercent,
      fromYPercent: row.fromYPercent,
      targetXPercent: row.targetXPercent,
      targetYPercent: row.targetYPercent,
      seedStart: row.seedStart,
      seedEnd: row.seedEnd,
      deltaShotsFor: row.deltaShotsFor,
      deltaShotsAgainst: row.deltaShotsAgainst,
      deltaPossessionFor: row.deltaPossessionFor,
      deltaXgFor: row.deltaXgFor,
      deltaXgAgainst: row.deltaXgAgainst,
      deltaXgDiff: row.deltaXgDiff,
      deltaCentralShotsFor: row.deltaCentralShotsFor,
      deltaWideShotsFor: row.deltaWideShotsFor,
      deltaLongShotsFor: row.deltaLongShotsFor,
      deltaCentralShotsAgainst: row.deltaCentralShotsAgainst,
      deltaWideShotsAgainst: row.deltaWideShotsAgainst,
      deltaLongShotsAgainst: row.deltaLongShotsAgainst,
      deltaCentralXgFor: row.deltaCentralXgFor,
      deltaWideXgFor: row.deltaWideXgFor,
      deltaLongXgFor: row.deltaLongXgFor,
      deltaLeftWideShotsFor: row.deltaLeftWideShotsFor ?? 0,
      deltaRightWideShotsFor: row.deltaRightWideShotsFor ?? 0,
      deltaLeftWideXgFor: row.deltaLeftWideXgFor ?? 0,
      deltaRightWideXgFor: row.deltaRightWideXgFor ?? 0,
      deltaCentralXgAgainst: row.deltaCentralXgAgainst,
      deltaWideXgAgainst: row.deltaWideXgAgainst,
      deltaLongXgAgainst: row.deltaLongXgAgainst,
      deltaLeftWideShotsAgainst: row.deltaLeftWideShotsAgainst ?? 0,
      deltaRightWideShotsAgainst: row.deltaRightWideShotsAgainst ?? 0,
      deltaLeftWideXgAgainst: row.deltaLeftWideXgAgainst ?? 0,
      deltaRightWideXgAgainst: row.deltaRightWideXgAgainst ?? 0,
      baselineXgFor: row.baselineAvgXgFor,
      baselineXgAgainst: row.baselineAvgXgAgainst,
      baselineShotsFor: row.baselineAvgShotsFor,
      baselinePossessionFor: row.baselineAvgPossessionFor,
      movedXgFor: row.movedAvgXgFor,
      movedXgAgainst: row.movedAvgXgAgainst,
      movedShotsFor: row.movedAvgShotsFor,
      movedPossessionFor: row.movedAvgPossessionFor,
      baselineTacticalPosition: row.baselineTacticalPosition ?? this.positionPixelVisualLine(row.fromYPercent),
      movedTacticalPosition: row.movedTacticalPosition ?? this.positionPixelVisualLine(row.targetYPercent),
      baselinePlayerEffectiveness: row.baselinePlayerEffectiveness ?? 1,
      movedPlayerEffectiveness: row.movedPlayerEffectiveness ?? 1,
      deltaPlayerEffectiveness: row.deltaPlayerEffectiveness ?? 0,
      baselinePlayerCollective: row.baselinePlayerCollective ?? 0,
      movedPlayerCollective: row.movedPlayerCollective ?? 0,
      deltaPlayerCollective: row.deltaPlayerCollective ?? 0,
      signalScore: this.positionPixelSignalScoreFromRow(row),
      signalRead: this.positionPixelSignalReadFromRow(row),
      signalClass: this.positionPixelSignalClassFromRow(row),
      signalDetail: this.positionPixelSignalDetailFromRow(row),
      timestamp: new Date().toISOString(),
    };
  }
  private playerSwapCoachRead(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const read = this.playerSwapCoachReadLevel(row, candidate);
    if (read === 'upgrade') return 'Clear upgrade';
    if (read === 'downgrade') return 'Clear downgrade';
    if (read === 'tradeoff') return 'Trade-off';
    if (read === 'review') return 'Needs review';
    return 'Noise / neutral';
  }
  private playerSwapCoachReadClass(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const read = this.playerSwapCoachReadLevel(row, candidate);
    if (read === 'upgrade') return 'delta-positive';
    if (read === 'downgrade') return 'delta-negative';
    if (read === 'tradeoff') return 'read-strong';
    if (read === 'review') return 'read-check';
    return 'delta-neutral';
  }
  private playerSwapCoachReadDetail(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const read = this.playerSwapCoachRead(row, candidate);
    const xgDiff = this.fmtDeltaNumber(row.deltaXgDiff);
    const preXgDiff = this.fmtDeltaNumber(row.preAutoSubDeltaXgDiff || 0);
    const xgFor = this.fmtDeltaNumber(row.deltaXgFor);
    const xgAgainst = this.fmtDeltaNumber(row.deltaXgAgainst);
    const shotsFor = this.fmtDeltaNumber(row.deltaShotsFor);
    const shotsAgainst = this.fmtDeltaNumber(row.deltaShotsAgainst);
    if (read === 'Clear upgrade') {
      return `mejora el diferencial xG (${xgDiff}; pre-auto-sub ${preXgDiff}) con riesgo defensivo controlado. Shots ${shotsFor}, shots ag. ${shotsAgainst}.`;
    }
    if (read === 'Clear downgrade') {
      return `empeora el balance esperado (${xgDiff}; pre-auto-sub ${preXgDiff}) o aumenta demasiado el riesgo defensivo. xG for ${xgFor}, xG ag. ${xgAgainst}.`;
    }
    if (read === 'Trade-off') {
      return `gana algo en ataque, pero tambien concede mas. xG for ${xgFor}, xG ag. ${xgAgainst}, shots ag. ${shotsAgainst}.`;
    }
    if (read === 'Needs review') {
      return `la senal es grande pero mezclada; conviene repetir con mas seeds o mirar eventos. xG diff ${xgDiff}, shots ${shotsFor}/${shotsAgainst}.`;
    }
    const roleRisk = this.playerSwapRoleRisk(candidate);
    const roleDetail = roleRisk.detail ? ` ${roleRisk.detail}.` : '';
    return `no hay senal suficiente de resultado para decidir por este cambio. xG diff ${xgDiff}, pre-auto-sub ${preXgDiff}.${roleDetail}`;
  }
  private playerSwapCoachReadLevel(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): 'upgrade' | 'downgrade' | 'tradeoff' | 'neutral' | 'review' {
    const net = this.playerSwapCoachNetScore(row);
    const attack = this.playerSwapCoachAttackScore(row);
    const risk = this.playerSwapCoachRiskScore(row);
    const roleRisk = this.playerSwapRoleRisk(candidate);
    const roleSignal = Math.max(Math.abs(roleRisk.attack), Math.abs(roleRisk.control), Math.abs(roleRisk.protection));
    const signal = Math.max(
      Math.abs(row.deltaXgDiff),
      Math.abs(row.preAutoSubDeltaXgDiff || 0),
      Math.abs(row.deltaXgFor),
      Math.abs(row.deltaXgAgainst),
      Math.abs(row.deltaShotsFor) * 0.025,
      Math.abs(row.deltaShotsAgainst) * 0.025,
      roleSignal,
    );
    if (signal < 0.035) return 'neutral';
    if (roleSignal >= 0.050 && risk < 0.08 && Math.abs(net) < 0.05) return 'review';
    if (this.playerSwapRoleTradeoff(row, candidate)) return 'tradeoff';
    if (net >= 0.08 && risk <= 0.16) return 'upgrade';
    if (net <= -0.08 && (risk >= 0.10 || row.deltaXgFor <= 0)) return 'downgrade';
    if (attack >= 0.12 && risk >= 0.12) return 'tradeoff';
    if (signal >= 0.18 || Math.abs(net) >= 0.06) return 'review';
    return 'neutral';
  }
  private playerSwapCoachNetScore(row: PlayerSwapMatrixSummaryRow): number {
    const shotDiff = row.deltaShotsFor - row.deltaShotsAgainst;
    return row.deltaXgDiff + (row.preAutoSubDeltaXgDiff || 0) * 0.60 + shotDiff * 0.015 + row.deltaPossessionFor * 0.0015;
  }
  private playerSwapCoachAttackScore(row: PlayerSwapMatrixSummaryRow): number {
    return Math.max(0, row.deltaXgFor) + Math.max(0, row.preAutoSubDeltaXgFor || 0) * 0.60 + Math.max(0, row.deltaShotsFor) * 0.015;
  }
  private playerSwapCoachRiskScore(row: PlayerSwapMatrixSummaryRow): number {
    return Math.max(0, row.deltaXgAgainst) + Math.max(0, row.preAutoSubDeltaXgAgainst || 0) * 0.60 + Math.max(0, row.deltaShotsAgainst) * 0.015;
  }
  private playerSwapRoleTradeoff(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): boolean {
    const roleRisk = this.playerSwapRoleRisk(candidate);
    const defensiveGain =
      Math.max(0, -row.deltaXgAgainst)
      + Math.max(0, -(row.preAutoSubDeltaXgAgainst || 0)) * 0.60
      + Math.max(0, -row.deltaShotsAgainst) * 0.015
      + Math.max(0, roleRisk.protection);
    const attackCost =
      Math.max(0, -row.deltaXgFor)
      + Math.max(0, -(row.preAutoSubDeltaXgFor || 0)) * 0.60
      + Math.max(0, -row.deltaShotsFor) * 0.015
      + Math.max(0, -roleRisk.attack);
    const protectionCost = Math.max(0, -roleRisk.protection);
    const attackGain = this.playerSwapCoachAttackScore(row) + Math.max(0, roleRisk.attack);
    if (attackCost >= 0.050 && defensiveGain >= 0.060) return true;
    if (protectionCost >= 0.050 && attackGain >= 0.050) return true;
    return false;
  }
  private playerSwapSignalScore(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): number {
    const roleRisk = this.playerSwapRoleRisk(candidate);
    return Math.max(
      Math.abs(row.deltaXgDiff),
      Math.abs(row.preAutoSubDeltaXgDiff || 0),
      Math.abs(row.deltaXgFor),
      Math.abs(row.deltaXgAgainst),
      Math.abs(row.deltaShotsFor) * 0.025,
      Math.abs(row.deltaShotsAgainst) * 0.025,
      Math.abs(roleRisk.attack),
      Math.abs(roleRisk.control),
      Math.abs(roleRisk.protection),
    );
  }
  private playerSwapSignalRead(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const score = this.playerSwapSignalScore(row, candidate);
    if (score >= 0.120) return `Alta ${score.toFixed(3)}`;
    if (score >= 0.050) return `Media ${score.toFixed(3)}`;
    if (score >= 0.020) return `Baja ${score.toFixed(3)}`;
    return `Micro ${score.toFixed(3)}`;
  }
  private playerSwapSignalClass(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const score = this.playerSwapSignalScore(row, candidate);
    if (score >= 0.120) return 'delta-negative';
    if (score >= 0.050) return 'read-check';
    if (score >= 0.020) return 'read-stable';
    return 'delta-neutral';
  }
  private playerSwapSignalDetail(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const roleRisk = this.playerSwapRoleRisk(candidate);
    return [
      `senal ${this.playerSwapSignalScore(row, candidate).toFixed(3)}`,
      `xG diff ${this.fmtDeltaNumber(row.deltaXgDiff)}`,
      `pre-auto-sub ${this.fmtDeltaNumber(row.preAutoSubDeltaXgDiff || 0)}`,
      `shots ${this.fmtDeltaNumber(row.deltaShotsFor)}/${this.fmtDeltaNumber(row.deltaShotsAgainst)}`,
      `rol att/control/prot ${roleRisk.attack.toFixed(3)}/${roleRisk.control.toFixed(3)}/${roleRisk.protection.toFixed(3)}`,
    ].join(' · ');
  }
  private playerSwapTacticalBreakdown(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null): Pick<
    PlayerSwapMatrixSummary,
    | 'tacticalAttackRead'
    | 'tacticalAttackClass'
    | 'tacticalCentralControlRead'
    | 'tacticalCentralControlClass'
    | 'tacticalProtectionRead'
    | 'tacticalProtectionClass'
    | 'tacticalChannelsRead'
    | 'tacticalChannelsClass'
    | 'tacticalBreakdownDetail'
  > {
    const roleRisk = this.playerSwapRoleRisk(candidate);
    const attackScore =
      row.deltaXgFor
      + (row.preAutoSubDeltaXgFor || 0) * 0.55
      + row.deltaShotsFor * 0.020
      + roleRisk.attack;
    const centralControlScore =
      row.deltaPossessionFor * 0.010
      + row.deltaCentralShotsFor * 0.030
      - row.deltaCentralShotsAgainst * 0.035
      + roleRisk.control;
    const protectionScore =
      -row.deltaXgAgainst
      - (row.preAutoSubDeltaXgAgainst || 0) * 0.55
      - row.deltaShotsAgainst * 0.018
      + roleRisk.protection;
    const channelScore =
      (row.deltaWideShotsFor - row.deltaWideShotsAgainst) * 0.028
      + (row.deltaLongShotsFor - row.deltaLongShotsAgainst) * 0.010;
    const attack = this.playerSwapTacticalLabel(attackScore, 'Ataque');
    const control = this.playerSwapTacticalLabel(centralControlScore, 'Control');
    const protection = this.playerSwapTacticalLabel(protectionScore, 'Proteccion');
    const channels = this.playerSwapTacticalLabel(channelScore, 'Canales');
    return {
      tacticalAttackRead: attack.label,
      tacticalAttackClass: attack.cssClass,
      tacticalCentralControlRead: control.label,
      tacticalCentralControlClass: control.cssClass,
      tacticalProtectionRead: protection.label,
      tacticalProtectionClass: protection.cssClass,
      tacticalChannelsRead: channels.label,
      tacticalChannelsClass: channels.cssClass,
      tacticalBreakdownDetail:
        `Ataque ${this.fmtDeltaNumber(attackScore)} ? Control ${this.fmtDeltaNumber(centralControlScore)} ? `
        + `Proteccion ${this.fmtDeltaNumber(protectionScore)} ? Canales ${this.fmtDeltaNumber(channelScore)}. `
        + (roleRisk.detail ? `${roleRisk.detail}. ` : '')
        + `Zonas for C/W/L ${this.fmtDeltaNumber(row.deltaCentralShotsFor)}/${this.fmtDeltaNumber(row.deltaWideShotsFor)}/${this.fmtDeltaNumber(row.deltaLongShotsFor)}; `
        + `against C/W/L ${this.fmtDeltaNumber(row.deltaCentralShotsAgainst)}/${this.fmtDeltaNumber(row.deltaWideShotsAgainst)}/${this.fmtDeltaNumber(row.deltaLongShotsAgainst)}.`,
    };
  }
  private playerSwapRoleRisk(candidate: PlayerSwapCandidate | null): { attack: number; control: number; protection: number; detail: string } {
    if (!candidate || this.playerSwapFitLevel(candidate) !== 'out') {
      return { attack: 0, control: 0, protection: 0, detail: '' };
    }
    const starter = this.positionPixelLine(candidate.starterPosition);
    const bench = this.positionPixelLine(candidate.benchPosition);
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
  private playerSwapTacticalLabel(score: number, dimension: string): { label: string; cssClass: string } {
    if (score >= 0.10) return { label: `${dimension} ++`, cssClass: 'delta-positive' };
    if (score >= 0.035) return { label: `${dimension} +`, cssClass: 'delta-positive' };
    if (score <= -0.10) return { label: `${dimension} --`, cssClass: 'delta-negative' };
    if (score <= -0.035) return { label: `${dimension} -`, cssClass: 'delta-negative' };
    return { label: `${dimension} =`, cssClass: 'delta-neutral' };
  }
  private playerSwapDecisionScore(row: PlayerSwapMatrixSummary): number {
    const shotDiff = row.deltaShotsFor - row.deltaShotsAgainst;
    return row.deltaXgDiff + (row.preAutoSubDeltaXgDiff || 0) * 0.60 + shotDiff * 0.015 + row.deltaPossessionFor * 0.0015;
  }
  private playerSwapFit(candidate: PlayerSwapCandidate | null): string {
    const level = this.playerSwapFitLevel(candidate);
    if (level === 'profile') return 'Same profile';
    if (level === 'line') return 'Same line';
    return 'Out of role';
  }
  private playerSwapFitClass(candidate: PlayerSwapCandidate | null): string {
    const level = this.playerSwapFitLevel(candidate);
    if (level === 'profile') return 'delta-positive';
    if (level === 'line') return 'read-stable';
    return 'read-check';
  }
  private playerSwapFitDetail(candidate: PlayerSwapCandidate | null): string {
    if (!candidate) return 'No candidate metadata available.';
    const starterProfile = this.playerSwapProfile(candidate.starterPosition);
    const benchProfile = this.playerSwapProfile(candidate.benchPosition);
    const starterLine = this.positionPixelLine(candidate.starterPosition) ?? 'NONE';
    const benchLine = this.positionPixelLine(candidate.benchPosition) ?? 'NONE';
    const fit = this.playerSwapFit(candidate);
    return `${fit}: ${candidate.starterPosition}/${starterProfile}/${starterLine} -> ${candidate.benchPosition}/${benchProfile}/${benchLine}.`;
  }
  private playerSwapFitLevel(candidate: PlayerSwapCandidate | null): 'profile' | 'line' | 'out' {
    if (!candidate) return 'out';
    if (this.playerSwapProfile(candidate.starterPosition) === this.playerSwapProfile(candidate.benchPosition)) return 'profile';
    if (this.positionPixelLine(candidate.starterPosition) === this.positionPixelLine(candidate.benchPosition)) return 'line';
    return 'out';
  }
  private positionMovementPresets(fromX: number, fromY: number): Array<{ label: string; x: number; y: number; dx: number; dy: number }> {
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
    const wideDelta = fromX <= 50 ? -5 : 5;
    const centerDelta = fromX <= 50 ? 5 : -5;
    const crossDelta = fromY <= 50 ? 18 : -18;
    return [
      { label: '1px forward', x: clamp(fromX), y: clamp(fromY - 1), dx: 0, dy: -1 },
      { label: '5px forward', x: clamp(fromX), y: clamp(fromY - 5), dx: 0, dy: -5 },
      { label: '5px deeper', x: clamp(fromX), y: clamp(fromY + 5), dx: 0, dy: 5 },
      { label: '5px wide', x: clamp(fromX + wideDelta), y: clamp(fromY), dx: wideDelta, dy: 0 },
      { label: '5px center', x: clamp(fromX + centerDelta), y: clamp(fromY), dx: centerDelta, dy: 0 },
      { label: '5px wide forward', x: clamp(fromX + wideDelta), y: clamp(fromY - 5), dx: wideDelta, dy: -5 },
      { label: '5px wide deeper', x: clamp(fromX + wideDelta), y: clamp(fromY + 5), dx: wideDelta, dy: 5 },
      { label: '5px center forward', x: clamp(fromX + centerDelta), y: clamp(fromY - 5), dx: centerDelta, dy: -5 },
      { label: '5px center deeper', x: clamp(fromX + centerDelta), y: clamp(fromY + 5), dx: centerDelta, dy: 5 },
      { label: 'big zone cross', x: clamp(50), y: clamp(fromY + crossDelta), dx: clamp(50) - clamp(fromX), dy: crossDelta },
    ];
  }
  private wingbackMovementPresets(
    fromX: number,
    fromY: number,
    candidate: PositionPixelCandidate
  ): Array<{ label: string; x: number; y: number; dx: number; dy: number }> {
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
    const slotSide = this.wingbackSlotSide(candidate.slotId);
    const wideDelta = slotSide === 'left' ? -4 : slotSide === 'right' ? 4 : fromX <= 50 ? -4 : 4;
    const centerDelta = -wideDelta;
    return [
      { label: 'WB 5px forward', x: clamp(fromX), y: clamp(fromY - 5), dx: 0, dy: -5 },
      { label: 'WB 5px deeper', x: clamp(fromX), y: clamp(fromY + 5), dx: 0, dy: 5 },
      { label: 'WB hug touchline', x: clamp(fromX + wideDelta), y: clamp(fromY), dx: wideDelta, dy: 0 },
      { label: 'WB tuck inside', x: clamp(fromX + centerDelta), y: clamp(fromY), dx: centerDelta, dy: 0 },
    ];
  }
  private wingbackSlotSide(slotId: string | null | undefined): 'left' | 'right' | null {
    const parsed = this.parseSubdivision(slotId);
    if (!parsed) return null;
    const [, subIndex] = parsed;
    if (subIndex === 1) return 'left';
    if (subIndex === 3) return 'right';
    return null;
  }
  private manualExtremeMovementPresets(
    fromX: number,
    fromY: number,
    candidate: PositionPixelCandidate
  ): Array<{ label: string; x: number; y: number; dx: number; dy: number }> {
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
    const line = this.strictPositionPixelLine(candidate.starterPosition) ?? this.positionPixelVisualLine(fromY);
    const sideX = fromX <= 50 ? 18 : 82;
    const halfSpaceX = fromX <= 50 ? 38 : 62;
    const overlapX = fromX <= 50 ? 12 : 88;
    const presets = line === 'ATT'
      ? [
          { label: 'ATT wide channel', x: sideX, y: 18 },
          { label: 'ATT half-space', x: halfSpaceX, y: 24 },
          { label: 'ATT drop link', x: 50, y: 42 },
        ]
      : line === 'MID'
        ? [
            { label: 'MID late run', x: clamp(fromX), y: 26 },
            { label: 'MID wide overload', x: sideX, y: 38 },
            { label: 'MID anchor drop', x: 50, y: 70 },
          ]
        : [
            { label: 'DEF step midfield', x: clamp(fromX), y: 58 },
            { label: 'DEF overlap lane', x: overlapX, y: 48 },
            { label: 'DEF cover depth', x: clamp(fromX), y: 90 },
          ];
    return presets
      .map((preset) => ({
        label: preset.label,
        x: clamp(preset.x),
        y: clamp(preset.y),
        dx: clamp(preset.x) - clamp(fromX),
        dy: clamp(preset.y) - clamp(fromY),
      }))
      .filter((preset) => Math.abs(preset.dx) + Math.abs(preset.dy) >= 6);
  }
  private positionMicroMovementPresets(fromX: number, fromY: number): Array<{ label: string; x: number; y: number; dx: number; dy: number }> {
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
    const wideDelta = fromX <= 50 ? -1 : 1;
    const centerDelta = fromX <= 50 ? 1 : -1;
    return [
      { label: '1px forward', x: clamp(fromX), y: clamp(fromY - 1), dx: 0, dy: -1 },
      { label: '1px deeper', x: clamp(fromX), y: clamp(fromY + 1), dx: 0, dy: 1 },
      { label: '1px wide', x: clamp(fromX + wideDelta), y: clamp(fromY), dx: wideDelta, dy: 0 },
      { label: '1px center', x: clamp(fromX + centerDelta), y: clamp(fromY), dx: centerDelta, dy: 0 },
    ];
  }
  private fallbackYForPosition(position: string | null | undefined): number {
    const p = String(position ?? '').toUpperCase();
    if (p === 'GK') return 94;
    if (p === 'DEF') return 78;
    if (p === 'ATT' || p === 'WINGER' || p === 'ST' || p === 'CF' || p === 'LW' || p === 'RW') return 18;
    return 52;
  }
  private canonicalXPercent(formation: string | null | undefined, slot: LineupSlotDTO | null | undefined): number | null {
    const position = this.canonicalFormationPosition(formation, slot);
    if (position && Number.isFinite(position.xPercent)) {
      return this.clampPercent(position.xPercent);
    }
    const parsed = this.parseSubdivision(slot?.subdivisionId);
    if (!parsed) return null;
    const [sector, subIndex] = parsed;
    const sectorCol = (sector - 1) % 3;
    const left = (sectorCol * 3 + (subIndex - 1)) * 11.11;
    return this.clampPercent(left + 11.11 / 2);
  }
  private canonicalYPercent(formation: string | null | undefined, slot: LineupSlotDTO | null | undefined): number | null {
    const position = this.canonicalFormationPosition(formation, slot);
    if (position && Number.isFinite(position.yPercent)) {
      return this.clampPercent(position.yPercent);
    }
    if (slot?.subdivisionId === 'GK-1') return 93;
    const parsed = this.parseSubdivision(slot?.subdivisionId);
    if (!parsed) return null;
    const [sector] = parsed;
    const sectorRow = Math.floor((sector - 1) / 3);
    const top = sectorRow * 11.11;
    return this.clampPercent(top + 11.11 / 2);
  }
  private matchContextXPercent(slot: LineupSlotDTO | null | undefined): number | null {
    if (typeof slot?.customXPercent === 'number' && Number.isFinite(slot.customXPercent)) {
      return this.clampPercent(slot.customXPercent);
    }
    return this.subdivisionXPercent(slot?.subdivisionId);
  }
  private matchContextYPercent(slot: LineupSlotDTO | null | undefined): number | null {
    if (typeof slot?.customYPercent === 'number' && Number.isFinite(slot.customYPercent)) {
      return this.clampPercent(slot.customYPercent);
    }
    return this.subdivisionYPercent(slot?.subdivisionId);
  }
  private subdivisionXPercent(subdivisionId: string | null | undefined): number | null {
    const parsed = this.parseSubdivision(subdivisionId);
    if (!parsed) return null;
    const [sector, subIndex] = parsed;
    const sectorCol = (sector - 1) % 3;
    const left = (sectorCol * 3 + (subIndex - 1)) * 11.11;
    return this.clampPercent(left + 11.11 / 2);
  }
  private subdivisionYPercent(subdivisionId: string | null | undefined): number | null {
    if (subdivisionId === 'GK-1') return 93;
    const parsed = this.parseSubdivision(subdivisionId);
    if (!parsed) return null;
    const [sector] = parsed;
    const sectorRow = Math.floor((sector - 1) / 3);
    const top = sectorRow * 11.11;
    return this.clampPercent(top + 11.11 / 2);
  }
  private canonicalFormationPosition(
    formation: string | null | undefined,
    slot: LineupSlotDTO | null | undefined
  ): FormationDTO['positions'][number] | null {
    const formationName = String(formation ?? '').trim();
    const slotId = slot?.subdivisionId;
    if (!formationName || !slotId) return null;
    const positions = this.formationPositionsByName()[formationName] ?? [];
    return positions.find((p) => p.subdivisionId === slotId) ?? null;
  }
  private parseSubdivision(subdivisionId: string | null | undefined): [number, number] | null {
    if (!subdivisionId?.startsWith('S')) return null;
    const dash = subdivisionId.indexOf('-');
    if (dash < 0 || dash >= subdivisionId.length - 1) return null;
    const sector = Number(subdivisionId.slice(1, dash));
    const subIndex = Number(subdivisionId.slice(dash + 1));
    if (!Number.isInteger(sector) || !Number.isInteger(subIndex)) return null;
    if (sector < 1 || sector > 27 || subIndex < 1 || subIndex > 3) return null;
    return [sector, subIndex];
  }
  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
  }
  private currentLineupSampleMetrics(
    fixture: MatchFixture,
    detail: MatchDetail | null
  ): {
    goalsFor: number;
    goalsAgainst: number;
    possessionFor: number;
    shotsFor: number;
    shotsAgainst: number;
    xgFor: number;
    xgAgainst: number;
    centralShotsFor: number;
    wideShotsFor: number;
    longShotsFor: number;
    centralShotsAgainst: number;
    wideShotsAgainst: number;
    longShotsAgainst: number;
  } {
    const zoneSummary = this.summarizeShotZones(detail);
    const userIsHome = this.selectedUserTeamIsHome();
    const zonesFor = userIsHome ? zoneSummary.home : zoneSummary.away;
    const zonesAgainst = userIsHome ? zoneSummary.away : zoneSummary.home;
    return {
      goalsFor: userIsHome ? fixture?.result?.homeGoals ?? 0 : fixture?.result?.awayGoals ?? 0,
      goalsAgainst: userIsHome ? fixture?.result?.awayGoals ?? 0 : fixture?.result?.homeGoals ?? 0,
      possessionFor: userIsHome ? fixture?.result?.homePossession ?? 0 : fixture?.result?.awayPossession ?? 0,
      shotsFor: userIsHome ? fixture?.result?.homeShots ?? 0 : fixture?.result?.awayShots ?? 0,
      shotsAgainst: userIsHome ? fixture?.result?.awayShots ?? 0 : fixture?.result?.homeShots ?? 0,
      xgFor: userIsHome ? detail?.homeXg ?? 0 : detail?.awayXg ?? 0,
      xgAgainst: userIsHome ? detail?.awayXg ?? 0 : detail?.homeXg ?? 0,
      centralShotsFor: zonesFor.central,
      wideShotsFor: zonesFor.wide,
      longShotsFor: zonesFor.long,
      centralShotsAgainst: zonesAgainst.central,
      wideShotsAgainst: zonesAgainst.wide,
      longShotsAgainst: zonesAgainst.long,
    };
  }
  private buildLineupSlots(lineup: LineupDTO): LineupSlotDTO[] {
    const slotsByPlayer = new Map((lineup.slots ?? []).map((slot) => [slot.playerId, slot]));
    return (lineup.players ?? [])
      .map((player) => slotsByPlayer.get(player.playerId))
      .filter((slot): slot is LineupSlotDTO => !!slot?.playerId && !!slot?.subdivisionId);
  }
  private lowBlockVariantSlots(lineup: LineupDTO, secondLineY: number): LineupSlotDTO[] {
    const playerById = new Map((lineup.players ?? []).map((player) => [player.playerId, player]));
    return this.buildLineupSlots(lineup).map((slot) => {
      const player = playerById.get(slot.playerId);
      const position = String(player?.position ?? '').toUpperCase();
      const x = this.matchContextXPercent(slot) ?? this.canonicalXPercent('5-4-1', slot) ?? 50;
      const y = this.matchContextYPercent(slot) ?? this.canonicalYPercent('5-4-1', slot) ?? 50;
      return {
        ...slot,
        customXPercent: x,
        customYPercent: position === 'MID' ? secondLineY : y,
      };
    });
  }
  private backFiveWingbackVariantSlots(lineup: LineupDTO, wingbackY: number, formation = '5-3-2'): LineupSlotDTO[] {
    const playerById = new Map((lineup.players ?? []).map((player) => [player.playerId, player]));
    return this.buildLineupSlots(lineup).map((slot) => {
      const player = playerById.get(slot.playerId);
      const position = String(player?.position ?? '').toUpperCase();
      const x = this.matchContextXPercent(slot) ?? this.canonicalXPercent(formation, slot) ?? 50;
      const y = this.matchContextYPercent(slot) ?? this.canonicalYPercent(formation, slot) ?? 50;
      const isWideWingback = (position === 'DEF' || position === 'MID') && (x <= 24 || x >= 76);
      return {
        ...slot,
        customXPercent: x,
        customYPercent: isWideWingback ? wingbackY : y,
      };
    });
  }
  private buildLowBlockLabRows(items: Array<{
    variant: { variant: LowBlockLabRow['variant']; label: string; y: number };
    summary: MatchPreviewSummary;
  }>): LowBlockLabRow[] {
    const base = items.find((item) => item.variant.variant === 'base')?.summary ?? items[0]?.summary;
    return items.map((item) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaShotsAgainst = summary.avgShotsAgainst - (base?.avgShotsAgainst ?? summary.avgShotsAgainst);
      const deltaPossessionFor = summary.avgPossessionFor - (base?.avgPossessionFor ?? summary.avgPossessionFor);
      const read = this.lowBlockLabRead(item.variant.variant, deltaXgFor, deltaXgAgainst, deltaShotsAgainst);
      return {
        variant: item.variant.variant,
        label: item.variant.label,
        secondLineY: item.variant.y,
        formation: summary.formation,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaShotsAgainst,
        deltaPossessionFor,
        read,
        className: this.lowBlockLabClass(item.variant.variant, deltaXgAgainst, deltaShotsAgainst),
      };
    });
  }
  private lowBlockLabRead(
    variant: LowBlockLabRow['variant'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaShotsAgainst: number
  ): string {
    if (variant === 'base') return 'Referencia';
    if (variant === 'high') {
      if (deltaXgFor > 0.03 && (deltaXgAgainst > 0.02 || deltaShotsAgainst > 0.20)) {
        return 'Mas salida, mas riesgo';
      }
      if (deltaXgFor > 0.03) return 'Mas salida';
      return 'Revisar salida';
    }
    if (deltaXgAgainst < -0.02 || deltaShotsAgainst < -0.20) return 'Mas bloque';
    return 'Bloque similar';
  }
  private lowBlockLabClass(
    variant: LowBlockLabRow['variant'],
    deltaXgAgainst: number,
    deltaShotsAgainst: number
  ): string {
    if (variant === 'base') return 'read-check';
    if (variant === 'low') {
      return deltaXgAgainst < -0.02 || deltaShotsAgainst < -0.20 ? 'read-strong' : 'read-visible';
    }
    return deltaXgAgainst > 0.02 || deltaShotsAgainst > 0.20 ? 'read-visible' : 'read-check';
  }
  private buildBackFiveTransitionLabRows(items: Array<{
    variant: { variant: BackFiveTransitionLabRow['variant']; label: string; y: number };
    summary: MatchPreviewSummary;
  }>): BackFiveTransitionLabRow[] {
    const base = items.find((item) => item.variant.variant === 'base')?.summary ?? items[0]?.summary;
    return items.map((item) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaWideShotsFor = summary.avgWideShotsFor - (base?.avgWideShotsFor ?? summary.avgWideShotsFor);
      const deltaWideShotsAgainst = summary.avgWideShotsAgainst - (base?.avgWideShotsAgainst ?? summary.avgWideShotsAgainst);
      const read = this.backFiveTransitionRead(item.variant.variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor);
      return {
        variant: item.variant.variant,
        label: item.variant.label,
        wingbackY: item.variant.y,
        formation: summary.formation,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaWideShotsFor,
        deltaWideShotsAgainst,
        read,
        className: this.backFiveTransitionClass(item.variant.variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor),
      };
    });
  }
  private backFiveTransitionRead(
    variant: BackFiveTransitionLabRow['variant'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaWideShotsFor: number
  ): string {
    if (variant === 'base') return 'Referencia';
    if (variant === 'high') {
      if ((deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) && deltaXgAgainst > 0.02) return 'Mas transición, mas riesgo';
      if (deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) return 'Mas transición';
      return 'Revisar salida';
    }
    if (deltaXgAgainst < -0.02) return 'Mas cobertura';
    return 'Cobertura similar';
  }
  private backFiveTransitionClass(
    variant: BackFiveTransitionLabRow['variant'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaWideShotsFor: number
  ): string {
    if (variant === 'base') return 'read-check';
    if (variant === 'high') return deltaXgFor > 0.03 || deltaWideShotsFor > 0.20 ? 'read-visible' : 'read-check';
    return deltaXgAgainst < -0.02 ? 'read-strong' : 'read-visible';
  }
  private buildBackFiveFamilyLabRows(items: Array<{
    key: BackFiveFamilyLabRow['key'];
    label: string;
    formation: string;
    visualPlan: string;
    summary: MatchPreviewSummary;
  }>): BackFiveFamilyLabRow[] {
    const base = items.find((item) => item.key === 'transition')?.summary ?? items[0]?.summary;
    return items.map((item) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaWideShotsFor = summary.avgWideShotsFor - (base?.avgWideShotsFor ?? summary.avgWideShotsFor);
      const deltaWideShotsAgainst = summary.avgWideShotsAgainst - (base?.avgWideShotsAgainst ?? summary.avgWideShotsAgainst);
      const read = this.backFiveFamilyRead(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
      return {
        key: item.key,
        label: item.label,
        formation: item.formation,
        visualPlan: item.visualPlan,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsFor: summary.avgCentralShotsFor,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaWideShotsFor,
        deltaWideShotsAgainst,
        read,
        className: this.backFiveFamilyClass(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst),
      };
    });
  }
  private buildBackFiveFamilyRowsFromFormationSummary(rows: FormationMatrixSummaryRow[]): BackFiveFamilyLabRow[] {
    const wanted = [
      { key: 'low-block' as const, label: 'Bloque bajo', formation: '5-4-1', visualPlan: 'canónico' },
      { key: 'transition' as const, label: 'Transición', formation: '5-3-2', visualPlan: 'canónico' },
      { key: 'wingback-control' as const, label: 'Carrileros altos', formation: '3-5-2', visualPlan: 'canónico' },
    ];
    const byFormation = new Map(rows.map((row) => [row.formation, row]));
    const items = wanted
      .map((plan) => {
        const summary = byFormation.get(plan.formation);
        return summary ? { ...plan, summary } : null;
      })
      .filter((item): item is {
        key: BackFiveFamilyLabRow['key'];
        label: string;
        formation: string;
        visualPlan: string;
        summary: FormationMatrixSummaryRow;
      } => !!item);
    const base = items.find((item) => item.key === 'transition')?.summary ?? items[0]?.summary;
    return items.map((item) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaWideShotsFor = summary.avgWideShotsFor - (base?.avgWideShotsFor ?? summary.avgWideShotsFor);
      const deltaWideShotsAgainst = summary.avgWideShotsAgainst - (base?.avgWideShotsAgainst ?? summary.avgWideShotsAgainst);
      const read = this.backFiveFamilyRead(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
      return {
        key: item.key,
        label: item.label,
        formation: item.formation,
        visualPlan: item.visualPlan,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsFor: summary.avgCentralShotsFor,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaWideShotsFor,
        deltaWideShotsAgainst,
        read,
        className: this.backFiveFamilyClass(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst),
      };
    });
  }
  private buildBackFiveContextSmokeRow(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>,
    seedStart: number,
    seedCount: number,
    rows: FormationMatrixSummaryRow[]
  ): BackFiveContextSmokeRow {
    const family = this.buildBackFiveFamilyRowsFromFormationSummary(rows);
    const byFormation = new Map(family.map((row) => [row.formation, row]));
    const low = byFormation.get('5-4-1') ?? null;
    const transition = byFormation.get('5-3-2') ?? null;
    const wingbacks = byFormation.get('3-5-2') ?? null;
    const available = family.length > 0 ? family : [];
    const best = this.maxBy(available, (row) => row.avgXgDiff);
    const safest = this.minBy(available, (row) => row.avgXgAgainst);
    const offensive = this.maxBy(available, (row) => row.avgXgFor);
    const read = this.backFiveContextRead(best, safest, offensive);
    return {
      matchId: match.matchId,
      matchLabel: `${match.homeTeamName} vs ${match.awayTeamName}`,
      controlledSide,
      controlledTeamName: controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName,
      seedStart,
      seedCount,
      bestPlan: best?.formation ?? 'â€”',
      safestPlan: safest?.formation ?? 'â€”',
      mostOffensivePlan: offensive?.formation ?? 'â€”',
      bestXgDiff: best?.avgXgDiff ?? 0,
      safestXga: safest?.avgXgAgainst ?? 0,
      mostOffensiveXg: offensive?.avgXgFor ?? 0,
      lowBlockDiff: low?.avgXgDiff ?? null,
      transitionDiff: transition?.avgXgDiff ?? null,
      wingbackDiff: wingbacks?.avgXgDiff ?? null,
      read,
      className: this.backFiveContextClass(best, safest, offensive),
    };
  }
  private toBackFiveContextSmokeSummary(rows: BackFiveContextSmokeRow[]): BackFiveContextSmokeSummary | null {
    if (rows.length === 0) return null;
    const count = (selector: (row: BackFiveContextSmokeRow) => string, formation: string) =>
      rows.filter((row) => selector(row) === formation).length;
    const reviewRows = rows.filter((row) => row.bestXgDiff < -0.25 || row.read.toLowerCase().includes('revisar'));
    const review = reviewRows.length;
    const reviewDetails = reviewRows.slice(0, 4).map((row) => {
      const sideLabel = row.controlledSide === 'HOME' ? 'local' : 'visitante';
      const reason = row.bestXgDiff < -0.25
        ? `mejor ${row.bestPlan} sigue ${this.signed(row.bestXgDiff)}`
        : row.read;
      return `${row.controlledTeamName} ${sideLabel}: ${reason}`;
    });
    const best541 = count((row) => row.bestPlan, '5-4-1');
    const best532 = count((row) => row.bestPlan, '5-3-2');
    const best352 = count((row) => row.bestPlan, '3-5-2');
    const dominantBest = Math.max(best541, best532, best352);
    const read = dominantBest >= Math.ceil(rows.length * 0.75)
      ? 'Ojo: una formación domina demasiado'
      : 'Distribución contextual sana';
    return {
      total: rows.length,
      best541,
      best532,
      best352,
      safest541: count((row) => row.safestPlan, '5-4-1'),
      safest532: count((row) => row.safestPlan, '5-3-2'),
      safest352: count((row) => row.safestPlan, '3-5-2'),
      offensive541: count((row) => row.mostOffensivePlan, '5-4-1'),
      offensive532: count((row) => row.mostOffensivePlan, '5-3-2'),
      offensive352: count((row) => row.mostOffensivePlan, '3-5-2'),
      review,
      reviewDetails,
      read,
      className: dominantBest >= Math.ceil(rows.length * 0.75) ? 'read-visible' : 'read-strong',
    };
  }
  private backFiveContextRead(
    best: BackFiveFamilyLabRow | null,
    safest: BackFiveFamilyLabRow | null,
    offensive: BackFiveFamilyLabRow | null
  ): string {
    if (!best) return 'Sin datos';
    if (best.formation === '5-4-1') return safest?.formation === '5-4-1' ? 'Contexto pide bloque' : 'Bloque gana diferencial';
    if (best.formation === '3-5-2') {
      return offensive?.formation === '3-5-2' ? 'Contexto pide carrileros' : 'Carrileros ganan diferencial';
    }
    if (safest?.formation === '5-4-1' && offensive?.formation === '3-5-2') return 'Transición equilibra extremos';
    return '5-3-2 punto medio';
  }
  private backFiveContextClass(
    best: BackFiveFamilyLabRow | null,
    safest: BackFiveFamilyLabRow | null,
    offensive: BackFiveFamilyLabRow | null
  ): string {
    if (!best) return 'read-visible';
    if (best.formation === safest?.formation && best.formation === offensive?.formation) return 'read-strong';
    if (best.formation === '5-3-2') return 'read-check';
    return 'read-visible';
  }
  private maxBy<T>(items: T[], score: (item: T) => number): T | null {
    return items.reduce<T | null>((best, item) => !best || score(item) > score(best) ? item : best, null);
  }
  private minBy<T>(items: T[], score: (item: T) => number): T | null {
    return items.reduce<T | null>((best, item) => !best || score(item) < score(best) ? item : best, null);
  }
  private backFiveFamilyRead(
    key: BackFiveFamilyLabRow['key'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaWideShotsFor: number,
    deltaWideShotsAgainst: number
  ): string {
    if (key === 'transition') return 'Referencia transición';
    if (key === 'low-block') {
      if (deltaXgAgainst < -0.03 && deltaXgFor < -0.03) return 'Bloque bajo: protege, resigna salida';
      if (deltaXgAgainst < -0.03) return 'Bloque bajo más seguro';
      return 'Bloque bajo a revisar';
    }
    if ((deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) && (deltaXgAgainst > 0.02 || deltaWideShotsAgainst > 0.15)) {
      return 'Carrileros altos: más banda, más riesgo';
    }
    if (deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) return 'Carrileros altos: más banda';
    if (deltaXgAgainst > 0.12) return 'Carrileros altos: riesgo sin ventaja clara';
    return 'Carrileros altos neutros';
  }
  private backFiveFamilyClass(
    key: BackFiveFamilyLabRow['key'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaWideShotsFor: number,
    deltaWideShotsAgainst: number
  ): string {
    if (key === 'transition') return 'read-check';
    if (key === 'low-block') return deltaXgAgainst < -0.03 ? 'read-strong' : 'read-visible';
    return deltaXgFor > 0.03 || deltaWideShotsFor > 0.20 || deltaWideShotsAgainst > 0.15 ? 'read-visible' : 'read-check';
  }
  private countCustomMovableSlots(lineup: LineupDTO): number {
    const playerPositionById = new Map((lineup.players ?? []).map((player) => [
      player.playerId,
      String(player.position ?? '').toUpperCase(),
    ]));
    return (lineup.slots ?? []).filter((slot) => {
      const isCustom = Number.isFinite(slot.customXPercent) || Number.isFinite(slot.customYPercent);
      return isCustom && playerPositionById.get(slot.playerId) !== 'GK';
    }).length;
  }
  private swapLineupSlot(
    slots: LineupSlotDTO[],
    starterPlayerId: string,
    benchPlayerId: string
  ): LineupSlotDTO[] {
    return slots.map((slot) =>
      slot.playerId === starterPlayerId
        ? { ...slot, playerId: benchPlayerId }
        : { ...slot }
    );
  }
  private lineupPlayerIdsFromSlots(slots: LineupSlotDTO[]): string[] {
    return slots.map((slot) => slot.playerId);
  }
  private isAttackingPosition(position: string | null | undefined): boolean {
    return ['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM', 'WINGER', 'ATT'].includes(String(position ?? '').toUpperCase());
  }
  private positionPixelLine(position: string | null | undefined): 'DEF' | 'MID' | 'ATT' | null {
    const p = String(position ?? '').toUpperCase();
    if (p === 'GK') return null;
    if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
    if (['MID', 'CM', 'CDM', 'DM', 'CAM', 'AM', 'LM', 'RM'].includes(p)) return 'MID';
    if (this.isAttackingPosition(p)) return 'ATT';
    return 'MID';
  }
  private strictPositionPixelLine(position: string | null | undefined): 'DEF' | 'MID' | 'ATT' | null {
    const p = String(position ?? '').trim().toUpperCase();
    if (!p || p === 'UNKNOWN' || p === 'NONE') return null;
    if (p === 'GK') return null;
    if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
    if (['MID', 'CM', 'CDM', 'DM', 'CAM', 'AM', 'LM', 'RM'].includes(p)) return 'MID';
    if (this.isAttackingPosition(p)) return 'ATT';
    return null;
  }
  private positionPixelLineFromSlot(
    formation: string | null | undefined,
    slot: LineupSlotDTO | null | undefined
  ): 'DEF' | 'MID' | 'ATT' | null {
    const y = this.matchContextYPercent(slot) ?? this.canonicalYPercent(formation, slot);
    if (y === null || !Number.isFinite(y)) return null;
    if (y < 34) return 'ATT';
    if (y < 67) return 'MID';
    return 'DEF';
  }
  private pickPositionPixelCandidates(lineup: LineupDTO): PositionPixelCandidate[] {
    const slots = this.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const slotMetaByPlayer = new Map(slots.map((slot) => [slot.playerId, slot]));
    const playerLine = (player: LineupDTO['players'][number]): 'DEF' | 'MID' | 'ATT' | null =>
      this.positionPixelLineFromSlot(lineup.formation, slotMetaByPlayer.get(player.playerId))
        ?? this.strictPositionPixelLine(player.position)
        ?? this.positionPixelLine(player.position);
    const movablePlayers = (lineup.players ?? [])
      .filter((player) => !!player.playerId && player.position !== 'GK');
    const selected = this.selectedSwapStarterIdModel
      ? movablePlayers.find((player) => player.playerId === this.selectedSwapStarterIdModel)
      : null;
    const byLine = new Map<'DEF' | 'MID' | 'ATT', typeof movablePlayers[number]>();
    for (const player of movablePlayers) {
      const line = playerLine(player);
      if (line && !byLine.has(line)) {
        byLine.set(line, player);
      }
    }
    const ordered = [
      selected,
      byLine.get('DEF') ?? null,
      byLine.get('MID') ?? null,
      byLine.get('ATT') ?? null,
    ].filter((player): player is typeof movablePlayers[number] => !!player);
    const unique = new Map<string, typeof movablePlayers[number]>();
    for (const player of ordered) {
      unique.set(player.playerId, player);
    }
    return Array.from(unique.values())
      .map((player) => ({
        starterId: player.playerId,
        starterName: player.name,
        starterPosition: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
      }))
      .filter((candidate) => !!candidate.starterId);
  }
  private pickPositionPixelLineCandidates(lineup: LineupDTO, line: 'DEF' | 'MID' | 'ATT', maxCount: number): PositionPixelCandidate[] {
    const slots = this.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const slotMetaByPlayer = new Map(slots.map((slot) => [slot.playerId, slot]));
    const playerLine = (player: LineupDTO['players'][number]): 'DEF' | 'MID' | 'ATT' | null =>
      this.positionPixelLineFromSlot(lineup.formation, slotMetaByPlayer.get(player.playerId))
        ?? this.strictPositionPixelLine(player.position);
    const selected = this.selectedSwapStarterIdModel
      ? (lineup.players ?? []).find((player) => !!player.playerId && player.playerId === this.selectedSwapStarterIdModel && player.position !== 'GK')
      : null;
    const players = (lineup.players ?? [])
      .filter((player) => !!player.playerId && player.position !== 'GK' && playerLine(player) === line)
      .sort((a, b) => {
        const aHasSlot = slotByPlayer.has(a.playerId) ? 0 : 1;
        const bHasSlot = slotByPlayer.has(b.playerId) ? 0 : 1;
        return aHasSlot - bHasSlot || a.name.localeCompare(b.name);
      });
    const ordered = selected && playerLine(selected) === line
      ? [selected, ...players.filter((player) => player.playerId !== selected.playerId)]
      : players;
    return ordered.slice(0, maxCount)
      .map((player) => ({
        starterId: player.playerId,
        starterName: player.name,
        starterPosition: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
      }))
      .filter((candidate) => !!candidate.starterId);
  }
  private pickManualExtremeCandidates(lineup: LineupDTO): PositionPixelCandidate[] {
    const unique = new Map<string, PositionPixelCandidate>();
    for (const candidate of (['ATT', 'MID', 'DEF'] as const)
      .flatMap((line) => this.pickPositionPixelLineCandidates(lineup, line, 2))) {
      if (!candidate.starterId || unique.has(candidate.starterId)) { continue; }
      unique.set(candidate.starterId, candidate);
    }
    return Array.from(unique.values()).slice(0, 6);
  }
  private pickWingbackPixelCandidates(lineup: LineupDTO): PositionPixelCandidate[] {
    const slots = this.effectivePositionPixelSlots(lineup);
    const playersById = new Map((lineup.players ?? []).map((player) => [player.playerId, player]));
    const wingbackSlots = slots
      .map((slot) => ({
        slot,
        role: this.canonicalFormationPosition(lineup.formation, slot)?.role?.toUpperCase() ?? '',
        x: this.matchContextXPercent(slot) ?? this.canonicalXPercent(lineup.formation, slot) ?? 50,
      }))
      .filter((item) => ['LWB', 'RWB', 'LM', 'RM'].includes(item.role) || item.x <= 22 || item.x >= 78)
      .sort((a, b) => a.x - b.x);
    const selected = [
      wingbackSlots[0] ?? null,
      wingbackSlots.length > 1 ? wingbackSlots[wingbackSlots.length - 1] : null,
    ].filter((item): item is typeof wingbackSlots[number] => !!item);
    const unique = new Map<string, typeof wingbackSlots[number]>();
    for (const item of selected) {
      if (item.slot.playerId) {
        unique.set(item.slot.playerId, item);
      }
    }
    return Array.from(unique.values())
      .map((item) => {
        const player = playersById.get(item.slot.playerId);
        return {
          starterId: item.slot.playerId,
          starterName: player?.name ?? item.slot.playerId,
          starterPosition: player?.position ?? (item.role || 'MID'),
          slotId: item.slot.subdivisionId ?? '',
        };
      })
      .filter((candidate) => !!candidate.starterId);
  }
  private effectivePositionPixelSlots(lineup: LineupDTO): LineupSlotDTO[] {
    const existingSlots = this.buildLineupSlots(lineup);
    const playerIds = (lineup.players ?? [])
      .map((player) => player.playerId)
      .filter(Boolean);
    const expectedSlotCount = Math.min(playerIds.length, 11);
    const canonicalSlots = existingSlots.length >= expectedSlotCount
      ? []
      : this.buildCanonicalSlotsForFormation(lineup.formation ?? this.selectedFormationModel ?? '4-4-2', playerIds);
    const existingByPlayer = new Map(existingSlots.map((slot) => [slot.playerId, slot]));
    return existingSlots.length >= expectedSlotCount
      ? existingSlots
      : canonicalSlots.map((slot) => existingByPlayer.get(slot.playerId) ?? slot);
  }
  private buildLineupDebugSnapshot(
    lineup: LineupDTO,
    label: string,
    visualLineFilter: 'DEF' | 'MID' | 'ATT' | null,
    candidates: PositionPixelCandidate[]
  ): LineupDebugSnapshot {
    const formation = lineup.formation ?? this.selectedFormationModel ?? '';
    const persistedSlots = this.buildLineupSlots(lineup);
    const effectiveSlots = this.effectivePositionPixelSlots(lineup);
    const persistedByPlayer = new Map(persistedSlots.map((slot) => [slot.playerId, slot]));
    const effectiveByPlayer = new Map(effectiveSlots.map((slot) => [slot.playerId, slot]));
    const candidateIds = new Set(candidates.map((candidate) => candidate.starterId));
    const warnings: string[] = [];
    const players = lineup.players ?? [];
    if (players.length !== 11) {
      warnings.push(`Expected 11 players, got ${players.length}.`);
    }
    if (persistedSlots.length < Math.min(players.length, 11)) {
      warnings.push(`Persisted slots incomplete: ${persistedSlots.length}/${Math.min(players.length, 11)}. Canonical fallback may be used.`);
    }
    if (visualLineFilter && candidates.length <= 1) {
      warnings.push(`${visualLineFilter} smoke has only ${candidates.length} candidate(s); verify lineup slots or tactical roles.`);
    }
    const rows = players.map((player, index): LineupDebugRow => {
      const persisted = persistedByPlayer.get(player.playerId);
      const effective = effectiveByPlayer.get(player.playerId);
      const slot = effective ?? persisted ?? null;
      const x = this.matchContextXPercent(slot) ?? this.canonicalXPercent(formation, slot);
      const y = this.matchContextYPercent(slot) ?? this.canonicalYPercent(formation, slot);
      const source: LineupDebugRow['source'] = persisted
        ? 'persisted'
        : effective
          ? 'canonical'
          : 'missing';
      const visualLine: LineupDebugRow['visualLine'] = player.position === 'GK'
        ? 'GK'
        : y === null
          ? 'UNKNOWN'
          : this.positionPixelVisualLine(y);
      return {
        index: index + 1,
        playerId: player.playerId,
        name: candidateIds.has(player.playerId) ? `${player.name} *` : player.name,
        position: player.position,
        slotId: slot?.subdivisionId ?? '',
        x,
        y,
        visualLine,
        source,
      };
    });
    return {
      label,
      formation,
      selectedFormation: this.selectedFormationModel ?? '',
      playerCount: players.length,
      nonGkCount: players.filter((player) => player.position !== 'GK').length,
      persistedSlotCount: persistedSlots.length,
      effectiveSlotCount: effectiveSlots.length,
      candidatesCount: candidates.length,
      visualLineFilter: visualLineFilter ?? 'any',
      rows,
      warnings,
    };
  }
  private autoPositionPixelCandidates(): PositionPixelCandidate[] {
    return [
      { starterId: '__AUTO_DEF', starterName: 'Auto DEF', starterPosition: 'DEF', slotId: '' },
      { starterId: '__AUTO_MID', starterName: 'Auto MID', starterPosition: 'MID', slotId: '' },
      { starterId: '__AUTO_ATT', starterName: 'Auto ATT', starterPosition: 'ATT', slotId: '' },
    ];
  }
  private pickAutomaticSwapCandidate(lineup: LineupDTO, squad: SessionPlayer[]): PlayerSwapCandidate | null {
    const lineupIds = new Set((lineup.players ?? []).map((p) => p.playerId));
    const slots = this.buildLineupSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? []).filter((player) => player.position !== 'GK');
    const starter =
      (this.selectedSwapStarterIdModel
        ? starters.find((player) => player.playerId === this.selectedSwapStarterIdModel)
        : null)
      ?? starters.find((player) => this.isAttackingPosition(player.position) && slotByPlayer.has(player.playerId))
      ?? starters.find((player) => this.isAttackingPosition(player.position))
      ?? starters.find((player) => slotByPlayer.has(player.playerId))
      ?? starters[0];
    if (!starter) {
      return null;
    }
    const eligibleBench = squad
      .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK');
    const manualBench = this.selectedSwapBenchIdModel
      ? eligibleBench.find((player) => player.sessionPlayerId === this.selectedSwapBenchIdModel)
      : null;
    const bench =
      manualBench
      ?? squad
        .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended)
        .filter((player) => this.isAttackingPosition(player.position))
        .sort((a, b) => (b.attack + b.technique + b.speed) - (a.attack + a.technique + a.speed))[0]
      ?? squad
        .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
        .sort((a, b) => (b.attack + b.technique + b.speed) - (a.attack + a.technique + a.speed))[0];
    if (!bench) {
      return null;
    }
    return {
      starterId: starter.playerId,
      starterName: starter.name,
      starterPosition: starter.position,
      benchId: bench.sessionPlayerId,
      benchName: bench.name,
      benchPosition: bench.position,
      slotId: slotByPlayer.get(starter.playerId) ?? '',
    };
  }
  private autoBackendPlayerSwapCandidate(): PlayerSwapCandidate {
    return {
      starterId: this.AUTO_PLAYER_SWAP_STARTER,
      starterName: 'Auto starter',
      starterPosition: 'AUTO',
      benchId: this.AUTO_PLAYER_SWAP_BENCH,
      benchName: 'Auto bench',
      benchPosition: 'AUTO',
      slotId: '',
    };
  }
  private autoBackendStressSwapCandidates(): PlayerSwapCandidate[] {
    return [
      this.autoBackendStressSwapCandidate('ATT_TO_DEF', 'Stress: atacante por defensor'),
      this.autoBackendStressSwapCandidate('DEF_TO_ATT', 'Stress: defensor por atacante'),
      this.autoBackendStressSwapCandidate('MID_TO_ATT', 'Stress: medio por atacante'),
      this.autoBackendStressSwapCandidate('MID_TO_DEF', 'Stress: medio por defensor'),
      this.autoBackendStressSwapCandidate('OUT_OF_LINE', 'Stress: fuera de linea'),
      this.autoBackendStressSwapCandidate('DOWNGRADE', 'Stress: menor OVR / encaje'),
    ];
  }
  private autoBackendStressSwapCandidate(mode: string, testCase: string): PlayerSwapCandidate {
    return {
      starterId: `__AUTO_SWAP_${mode}`,
      starterName: `Auto ${mode}`,
      starterPosition: 'AUTO',
      benchId: this.AUTO_PLAYER_SWAP_BENCH,
      benchName: 'Auto bench',
      benchPosition: 'AUTO',
      slotId: '',
      testCase,
    };
  }
  private pickPlayerSwapBatteryCandidates(lineup: LineupDTO, squad: SessionPlayer[], limit = 6, mode = this.playerSwapBatteryModeModel): PlayerSwapCandidate[] {
    const lineupIds = new Set((lineup.players ?? []).map((p) => p.playerId));
    const slots = this.buildLineupSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? [])
      .filter((player) => player.position !== 'GK');
    const eligibleBench = squad
      .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
      .sort((a, b) => this.playerSwapBenchScore(b) - this.playerSwapBenchScore(a));
    const profileOrder = ['ST', 'WIDE', 'AM', 'CM', 'DM', 'FB', 'CB', 'ATT', 'MID', 'DEF'];
    const orderedStarters = [...starters].sort((a, b) => {
      const profileA = this.playerSwapProfile(a.position);
      const profileB = this.playerSwapProfile(b.position);
      return profileOrder.indexOf(profileA) - profileOrder.indexOf(profileB);
    });
    if (mode === 'stress') {
      return this.buildStressPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit);
    }
    const natural = this.buildPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit, 'natural');
    if (mode === 'natural' || natural.length >= limit) {
      return natural;
    }
    return this.buildPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit, 'mixed', natural);
  }
  private buildStressPlayerSwapBatteryCandidates(
    starters: LineupDTO['players'],
    eligibleBench: SessionPlayer[],
    slotByPlayer: Map<string, string>,
    limit: number
  ): PlayerSwapCandidate[] {
    const candidates: PlayerSwapCandidate[] = [];
    const usedPairs = new Set<string>();
    const usedBenchIds = new Set<string>();
    const addCase = (
      testCase: string,
      starterPredicate: (starter: LineupDTO['players'][number]) => boolean,
      benchPredicate: (bench: SessionPlayer, starter: LineupDTO['players'][number]) => boolean,
      preferWorstBench = false
    ): void => {
      if (candidates.length >= limit) return;
      const starterPool = starters.filter(starterPredicate);
      for (const starter of starterPool) {
        const benchPool = eligibleBench
          .filter((bench) => !usedBenchIds.has(bench.sessionPlayerId) && benchPredicate(bench, starter))
          .sort((a, b) => preferWorstBench
            ? this.playerSwapBenchScore(a) - this.playerSwapBenchScore(b)
            : this.playerSwapBenchScore(b) - this.playerSwapBenchScore(a));
        const bench = benchPool[0];
        if (!bench) continue;
        const key = `${starter.playerId}:${bench.sessionPlayerId}`;
        if (usedPairs.has(key)) continue;
        usedPairs.add(key);
        usedBenchIds.add(bench.sessionPlayerId);
        candidates.push(this.buildPlayerSwapCandidate(starter, bench, slotByPlayer, testCase));
        break;
      }
    };
    addCase(
      'Stress: atacante por defensor',
      (starter) => this.positionPixelLine(starter.position) === 'ATT',
      (bench) => this.positionPixelLine(bench.position) === 'DEF'
    );
    addCase(
      'Stress: defensor por atacante',
      (starter) => this.positionPixelLine(starter.position) === 'DEF',
      (bench) => this.positionPixelLine(bench.position) === 'ATT'
    );
    addCase(
      'Stress: medio por banda/ataque',
      (starter) => this.positionPixelLine(starter.position) === 'MID',
      (bench) => this.positionPixelLine(bench.position) === 'ATT'
    );
    addCase(
      'Stress: fuera de linea',
      () => true,
      (bench, starter) => this.positionPixelLine(bench.position) !== this.positionPixelLine(starter.position)
    );
    addCase(
      'Stress: menor OVR / encaje',
      () => true,
      (bench, starter) => this.sessionPlayerOverall(bench) <= starter.overall - 4,
      true
    );
    addCase(
      'Stress: upgrade OVR',
      () => true,
      (bench, starter) => this.sessionPlayerOverall(bench) >= starter.overall + 4
    );
    if (candidates.length >= limit) {
      return candidates.slice(0, limit);
    }
    return this.buildPlayerSwapBatteryCandidates(starters, eligibleBench, slotByPlayer, limit, 'out', candidates);
  }
  private buildPlayerSwapBatteryCandidates(
    starters: LineupDTO['players'],
    eligibleBench: SessionPlayer[],
    slotByPlayer: Map<string, string>,
    limit: number,
    mode: 'natural' | 'mixed' | 'out',
    seedCandidates: PlayerSwapCandidate[] = []
  ): PlayerSwapCandidate[] {
    const candidates = [...seedCandidates];
    const usedPairs = new Set(candidates.map((candidate) => `${candidate.starterId}:${candidate.benchId}`));
    const usedBenchIds = new Set(candidates.map((candidate) => candidate.benchId));
    for (const starter of starters) {
      const bench = this.pickBenchForBatteryMode(starter.position, eligibleBench, usedBenchIds, mode);
      if (!bench) continue;
      const key = `${starter.playerId}:${bench.sessionPlayerId}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      usedBenchIds.add(bench.sessionPlayerId);
      candidates.push(this.buildPlayerSwapCandidate(starter, bench, slotByPlayer, `Battery: ${mode}`));
      if (candidates.length >= limit) break;
    }
    return candidates;
  }
  private buildPlayerSwapCandidate(
    starter: LineupDTO['players'][number],
    bench: SessionPlayer,
    slotByPlayer: Map<string, string>,
    testCase: string
  ): PlayerSwapCandidate {
    return {
      starterId: starter.playerId,
      starterName: starter.name,
      starterPosition: starter.position,
      benchId: bench.sessionPlayerId,
      benchName: bench.name,
      benchPosition: bench.position,
      slotId: slotByPlayer.get(starter.playerId) ?? '',
      testCase,
    };
  }
  private sessionPlayerOverall(player: SessionPlayer): number {
    const raw = (player as SessionPlayer & { overall?: number }).overall;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    return Math.round(this.playerSwapBenchScore(player) / 6);
  }
  private pickBenchForBatteryMode(
    starterPosition: string,
    eligibleBench: SessionPlayer[],
    usedBenchIds: Set<string>,
    mode: 'natural' | 'mixed' | 'out'
  ): SessionPlayer | null {
    const starterProfile = this.playerSwapProfile(starterPosition);
    const starterLine = this.positionPixelLine(starterPosition);
    const unused = eligibleBench.filter((player) => !usedBenchIds.has(player.sessionPlayerId));
    const pool = unused.length > 0 ? unused : eligibleBench;
    if (mode === 'out') {
      return pool.find((player) => this.positionPixelLine(player.position) !== starterLine)
        ?? pool.find((player) => this.playerSwapProfile(player.position) !== starterProfile)
        ?? null;
    }
    if (mode === 'natural') {
      return pool.find((player) => this.playerSwapProfile(player.position) === starterProfile)
        ?? pool.find((player) => this.positionPixelLine(player.position) === starterLine)
        ?? null;
    }
    return pool.find((player) => this.playerSwapProfile(player.position) === starterProfile)
      ?? pool.find((player) => this.positionPixelLine(player.position) === starterLine)
      ?? pool[0]
      ?? null;
  }
  private pickDiverseBenchForStarter(
    starterPosition: string,
    eligibleBench: SessionPlayer[],
    usedBenchIds: Set<string>
  ): SessionPlayer | null {
    const starterProfile = this.playerSwapProfile(starterPosition);
    const starterLine = this.positionPixelLine(starterPosition);
    return eligibleBench.find((player) => !usedBenchIds.has(player.sessionPlayerId) && this.playerSwapProfile(player.position) === starterProfile)
      ?? eligibleBench.find((player) => !usedBenchIds.has(player.sessionPlayerId) && this.positionPixelLine(player.position) === starterLine)
      ?? eligibleBench.find((player) => !usedBenchIds.has(player.sessionPlayerId))
      ?? null;
  }
  private playerSwapProfile(position: string | null | undefined): string {
    const p = String(position ?? '').toUpperCase();
    if (['ST', 'CF', 'ATT'].includes(p)) return 'ST';
    if (['LW', 'RW', 'LM', 'RM', 'WINGER'].includes(p)) return 'WIDE';
    if (['CAM', 'AM'].includes(p)) return 'AM';
    if (['CDM', 'DM'].includes(p)) return 'DM';
    if (['CM', 'MID'].includes(p)) return 'CM';
    if (['LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'FB';
    if (['CB', 'DEF'].includes(p)) return 'CB';
    return this.positionPixelLine(p) ?? 'MID';
  }
  private playerSwapBenchScore(player: SessionPlayer): number {
    return player.attack + player.defense + player.technique + player.speed + player.stamina + player.mentality;
  }
  private runLineupSamples(
    lineup: LineupDTO,
    matchId: string,
    careerId: string,
    seeds: number[]
  ): Observable<CurrentLineupReplaySample | null> {
    return from(seeds).pipe(
      concatMap((seed) =>
        this.harness.replayMatch(matchId, seed).pipe(
          switchMap((fixture) =>
            this.matchDetailApi.getMatchDetail(careerId, matchId).pipe(
              catchError(() => of(null)),
              map((detail) => ({ lineup, fixture, detail, seed }))
            )
          ),
          timeout(CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS),
          catchError(() => of(null))
        )
      )
    );
  }
  private summarizeShotZones(detail: MatchDetail | null): {
    home: { central: number; wide: number; long: number };
    away: { central: number; wide: number; long: number };
  } {
    const summary = {
      home: { central: 0, wide: 0, long: 0 },
      away: { central: 0, wide: 0, long: 0 },
    };
    if (!detail) return summary;
    for (const event of detail.timeline ?? []) {
      if (!this.isShotLikeEvent(event)) continue;
      const bucket = event.teamId === detail.homeTeamId ? summary.home : summary.away;
      const location = event.shotCoordinate?.location;
      if (location === 'PENALTY_AREA_WIDE') {
        bucket.wide++;
      } else if (location === 'OUTSIDE_BOX' || location === 'LONG_RANGE') {
        bucket.long++;
      } else {
        bucket.central++;
      }
    }
    return summary;
  }
  private isShotLikeEvent(event: MatchEvent): boolean {
    return (
        event.type === 'SHOT'
        || event.type === 'SHOT_ON_TARGET'
        || event.type === 'MISS'
        || event.type === 'BLOCK'
        || event.type === 'GOAL'
      )
      && event.xg !== null
      && event.xg !== undefined
      && event.xg > 0;
  }
  /**
   * Opens the same visual editor used by /squad, directly from the replay lab.
   *
   * This is intentionally not a second implementation: player swaps, bench
   * moves, free pixel positioning, customX/customY persistence, tactical
   * chemistry preview and manual-select save all stay inside the production
   * SquadEditorModalComponent. The harness only provides the current career
   * context and refreshes after the modal closes.
   */
  openSquadEditor(): void {
    const careerId = this.careerId();
    if (!careerId) {
      this.snackBar.open('No active career loaded.', 'OK', { duration: 3000 });
      return;
    }
    this.mutationInFlight.set(true);
    forkJoin({
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        catchError(() => of([] as SessionPlayer[]))
      ),
      lineup: this.http.get<{ formation?: string | null }>(`${environment.apiUrl}/career/lineup/current`).pipe(
        catchError(() => of({ formation: this.selectedFormationModel }))
      ),
    }).subscribe({
      next: ({ squad, lineup }) => {
        this.mutationInFlight.set(false);
        const currentFormation =
          lineup?.formation ?? this.selectedFormationModel ?? '4-4-2';
        const ref = this.dialog.open(SquadEditorModalComponent, {
          data: {
            careerId,
            matchId: null,
            squad,
            currentFormation,
          },
          width: '98vw',
          height: '90vh',
          disableClose: false,
          panelClass: 'squad-editor-panel',
        });
        ref.afterClosed().subscribe(() => {
          this.refreshLineupContext();
          this.loadMatches();
          this.refreshDetailAfterMutation();
        });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to open squad editor'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  // ============== V24D24.2: Replay-with-seed + Simulate-round handlers ==============
  /**
   * Two-way binding shim for the seed number input. Empty / NaN input
   * ? null (non-reproducible replay). Otherwise coerce to a number.
   */
  onSeedChange(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.seedInputModel = null;
      return;
    }
    const n = typeof value === 'number' ? value : Number(value);
    this.seedInputModel = Number.isFinite(n) ? n : null;
  }
  /** Two-way binding shim for the round mat-select. */
  onRoundSelect(value: unknown): void {
    this.selectedRoundModel = typeof value === 'number' ? value : null;
  }
  onPlayerSwapSeedCountChange(value: unknown): void {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      this.playerSwapSeedCountModel = 3;
      return;
    }
    this.playerSwapSeedCountModel = Math.max(1, Math.min(50, Math.round(n)));
  }
  onPlayerSwapBatteryPrecisionChange(value: string): void {
    const allowed: Array<typeof this.playerSwapBatteryPrecisionModel> = ['quick', 'balanced', 'reliable'];
    this.playerSwapBatteryPrecisionModel = allowed.includes(value as typeof this.playerSwapBatteryPrecisionModel)
      ? (value as typeof this.playerSwapBatteryPrecisionModel)
      : 'balanced';
    this.playerSwapSeedCountModel = this.playerSwapBatteryPrecisionSeedCount(this.playerSwapBatteryPrecisionModel);
  }
  /**
   * V24D24.2: replay the currently-selected match (Panel C click ? selected
   * match) with the seed typed in Panel B. Refresca Panel A + D via
   * {@link refreshDetailAfterMutation}.
   *
   * <p>Respects the existing {@code mutationInFlight} contract: the button
   * is disabled while any other mutation is in flight, and we set the flag
   * here so all sibling buttons disable while we wait.
   */
  onReplayWithSeed(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.harness.replayMatch(matchId, this.seedInputModel))
    ).subscribe({
      next: (fixture) => {
        this.mutationInFlight.set(false);
        const seedDesc =
          this.seedInputModel !== null
            ? `seed=${this.seedInputModel}`
            : 'non-reproducible seed';
        const score =
          fixture?.result != null
            ? ` ? ${fixture.result.homeGoals}-${fixture.result.awayGoals}`
            : '';
        this.snackBar.open(
          `Match replayed (${seedDesc}, ${this.selectedStyleLabel()})${score}.`,
          'OK',
          { duration: 3000 }
        );
        // The match list will update too ? reload so Panel C reflects the
        // new score, then refresh Panel A + D (existing pattern).
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
        // V25D99.278: the replay endpoint persists fixture + V24 detail, and
        // Match Compare can already read the new live detail. In the harness,
        // however, Panel A is an embedded detail page and can briefly repaint
        // from the previous request if the immediate refresh wins the race.
        // Keep one late refresh so the visible Panel A settles on the same
        // data as /detail and /compare without requiring the manager to
        // reselect the match.
        this.refreshDetailAfterMutation(2500);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to replay match'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  onRunLineupDiagnostic(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    this.lineupDiagnostic.set(null);
    this.mutationInFlight.set(true);
    this.harness.lineupDiagnostic(matchId, this.seedInputModel).subscribe({
      next: (diagnostic) => {
        this.lineupDiagnostic.set(diagnostic);
        this.mutationInFlight.set(false);
        this.markReplayAnalysisReady('XI efectivo listo en Panel E.');
        this.snackBar.open('XI efectivo cargado para diagnosticar el motor.', 'OK', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to load lineup diagnostic'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  /**
   * Manager-lab proof button: replay the selected match using the currently
   * persisted visual lineup (players + manual slot coordinates), then render a
   * compact evidence card. This avoids confusing an old completed timeline with
   * the latest modal state.
   */
  onReplayCurrentLineup(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open(
        `Pick a match involving ${this.userTeamName() || 'your team'} before replaying the current lineup.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    this.currentLineupReplayResult.set(null);
    this.mutationInFlight.set(true);
    this.harness.getCurrentLineup().pipe(
      switchMap((lineup) =>
        this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => this.harness.replayMatch(matchId, this.seedInputModel)),
          switchMap((fixture) =>
            this.matchDetailApi.getMatchDetail(careerId, matchId).pipe(
              catchError(() => of(null)),
              map((detail) => this.buildCurrentLineupReplayResult(lineup, fixture, detail))
            )
          )
        )
      )
    ).subscribe({
      next: (result) => {
        this.currentLineupReplayResult.set(result);
        this.mutationInFlight.set(false);
        this.snackBar.open(
          `Current lineup replayed (${result.score}, seed=${result.seed ?? 'auto'}).`,
          'OK',
          { duration: 3500 }
        );
        this.markReplayAnalysisReady('Current lineup replay listo en Panel E.');
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to replay current lineup'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  /**
   * Multi-seed version of current-lineup replay. This is the reproducible
   * "does the modal matter?" smoke: edit lineup visually, close modal, then
   * average the exact persisted lineup across consecutive seeds.
   */
  onRunCurrentLineupMultiSeed(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open(
        `Pick a match involving ${this.userTeamName() || 'your team'} before running the current lineup multi-seed summary.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = CURRENT_LINEUP_MULTI_SEED_COUNT;
    this.currentLineupMultiSeedSummary.set(null);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Current lineup multi-seed corriendo: ${seedCount} seeds...`);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((lineup) =>
        this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => this.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER')),
          map((preview) => this.currentLineupSummaryFromPreview(lineup, preview))
        )
      )
    ).subscribe({
      next: (summary) => {
        this.currentLineupMultiSeedSummary.set(summary);
        this.snackBar.open(
          `Current lineup multi-seed complete (${summary.seedCount} seeds, avg xG ${this.fmtXg(summary.avgXgFor)}-${this.fmtXg(summary.avgXgAgainst)}).`,
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Current lineup multi-seed listo en Panel E.');
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run current lineup multi-seed summary'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }
  onRunModalVsCanonicalMultiSeed(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open(
        `Pick a match involving ${this.userTeamName() || 'your team'} before comparing base vs modal pixels.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = CURRENT_LINEUP_MULTI_SEED_COUNT;
    let originalLineup: LineupDTO | null = null;
    this.modalVsCanonicalSummary.set(null);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Base vs modal pixels rapido: ${seedCount} seeds por estado...`);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((lineup) => {
        originalLineup = lineup;
        const originalSlots = this.buildLineupSlots(lineup);
        const playerIds = this.lineupPlayerIdsFromSlots(originalSlots);
        if (this.countCustomMovableSlots(lineup) === 0) {
          throw new Error('No hay jugador de campo movido en el modal. Move un jugador en la cancha o corre Position presets matrix / Sensitivity check para probar pixels automaticos.');
        }
        const canonicalSlots = this.canonicalizeLineupSlots(lineup);
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => this.harness.manualSelectLineup(lineup.formation, playerIds, canonicalSlots)),
          switchMap((canonicalLineup) =>
            this.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER').pipe(
              map((canonicalPreview) => ({ canonicalLineup, canonicalPreview }))
            )
          ),
          switchMap(({ canonicalLineup, canonicalPreview }) =>
            this.harness.manualSelectLineup(lineup.formation, playerIds, originalSlots).pipe(
              switchMap((modalLineup) =>
                this.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER').pipe(
                  map((modalPreview) => ({ canonicalLineup, canonicalPreview, modalLineup, modalPreview, originalSlots, playerIds }))
                )
              )
            )
          ),
          switchMap((result) =>
            this.harness.manualSelectLineup(lineup.formation, result.playerIds, result.originalSlots).pipe(
              map(() => result)
            )
          )
        );
      })
    ).subscribe({
      next: ({ canonicalLineup, canonicalPreview, modalLineup, modalPreview }) => {
        const canonical = this.currentLineupSummaryFromPreview(canonicalLineup, canonicalPreview);
        const modal = this.currentLineupSummaryFromPreview(modalLineup, modalPreview);
        if (!originalLineup || !canonical || !modal) {
          this.modalVsCanonicalSummary.set(null);
          this.snackBar.open('Base vs modal completed with insufficient samples.', 'OK', { duration: 4500 });
          return;
        }
        const summary = this.buildModalVsCanonicalSummary(originalLineup, canonical, modal);
        this.modalVsCanonicalSummary.set(summary);
        this.snackBar.open(
          `Base vs modal complete (${summary.seedCount} seeds, Î”xG ${this.fmtDeltaNumber(summary.deltaXgFor)}).`,
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Base vs modal pixels listo en Panel E.');
      },
      error: (err) => {
        if (originalLineup) {
          const restoreSlots = this.buildLineupSlots(originalLineup);
          const restoreIds = this.lineupPlayerIdsFromSlots(restoreSlots);
          this.harness.manualSelectLineup(originalLineup.formation, restoreIds, restoreSlots)
            .pipe(take(1), catchError(() => of(null)))
            .subscribe();
        }
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Base vs modal pixels no pudo generar Panel E'));
        this.snackBar.open(
          this.fmtError(err, 'Failed to compare base vs modal pixels'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.loadMatches();
        this.refreshLineupContext();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }
  onRunAutoPlayerSwapMatrix(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(this.playerSwapSeedCountModel || 3)));
    this.playerSwapSeedCountModel = seedCount;
    let candidate: PlayerSwapCandidate | null = null;
    this.clearPlayerSwapAnalysisResults();
    this.analysisReadyMessage.set(`Player swap matrix corriendo: ${seedCount} seeds...`);
    this.mutationInFlight.set(true);
    const source$ = this.selectedMatchIncludesUserTeam()
      ? forkJoin({
          lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
          squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
            take(1),
            timeout(10_000),
            catchError(() => of([] as SessionPlayer[]))
          ),
        })
      : of({ lineup: null as LineupDTO | null, squad: [] as SessionPlayer[] });
    source$.pipe(
      switchMap(({ lineup, squad }) => {
        candidate = lineup ? this.pickAutomaticSwapCandidate(lineup, squad) : this.autoBackendPlayerSwapCandidate();
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() =>
            this.harness.runPlayerSwapMatrixSummary(matchId, {
              starterPlayerId: candidate?.starterId ?? this.AUTO_PLAYER_SWAP_STARTER,
              benchPlayerId: candidate?.benchId ?? this.AUTO_PLAYER_SWAP_BENCH,
              slotId: candidate?.slotId ?? '',
              seedStart,
              seedCount,
              controlledTeamSide: this.controlledTeamSideModel,
            })
          )
        );
      })
    ).subscribe({
      next: (row) => {
        this.playerSwapMatrixSummary.set(this.toPlayerSwapMatrixSummary(row, candidate));
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(
          this.fmtError(err, 'Player swap matrix falló antes de generar Panel E')
        );
        this.snackBar.open(
          this.fmtError(err, 'Failed to run player swap matrix'),
          'OK',
          { duration: 5000 }
        );
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const summary = this.playerSwapMatrixSummary();
        this.snackBar.open(
          summary
            ? `Player swap matrix complete: ${summary.baselinePlayer} vs ${summary.swapPlayer}, Î”xG ${this.fmtDeltaNumber(summary.deltaXgFor)}.`
            : 'Player swap matrix completed with insufficient samples.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Player swap matrix listo en Panel E.');
        this.refreshLineupContext();
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }
  onRunPlayerSwapBattery(options: { preservePositionPixels?: boolean } = {}): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = this.playerSwapBatteryEffectiveSeedCount();
    this.playerSwapSeedCountModel = seedCount;
    const preservedPixelSummary = options.preservePositionPixels ? this.positionPixelMatrixSummary() : null;
    const preservedPixelRows = options.preservePositionPixels ? this.positionPixelMatrixRows() : [];
    const preservedPixelNote = options.preservePositionPixels ? this.positionPixelEvidenceNote() : null;
    this.clearReplayAnalysisResultsForLatestRun();
    if (options.preservePositionPixels) {
      this.positionPixelMatrixSummary.set(preservedPixelSummary);
      this.positionPixelMatrixRows.set(preservedPixelRows);
      this.positionPixelEvidenceNote.set(preservedPixelNote);
    }
    this.analysisReadyMessage.set(`Player swap battery corriendo: ${seedCount} seeds por cambio...`);
    this.mutationInFlight.set(true);
    const source$ = this.selectedMatchIncludesUserTeam()
      ? forkJoin({
          lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
          squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
            take(1),
            timeout(10_000),
            catchError(() => of([] as SessionPlayer[]))
          ),
        })
      : of({ lineup: null as LineupDTO | null, squad: [] as SessionPlayer[] });
    source$.pipe(
      switchMap(({ lineup, squad }) => {
          const candidates = lineup ? this.pickPlayerSwapBatteryCandidates(lineup, squad, 6) : [];
          const effectiveCandidates = candidates.length > 0
            ? candidates
            : this.playerSwapBatteryModeModel === 'stress'
              ? this.autoBackendStressSwapCandidates()
              : [this.autoBackendPlayerSwapCandidate()];
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => from(effectiveCandidates).pipe(
            concatMap((candidate) =>
              this.harness.runPlayerSwapMatrixSummary(matchId, {
                starterPlayerId: candidate.starterId,
                benchPlayerId: candidate.benchId,
                slotId: candidate.slotId,
                seedStart,
                seedCount,
                controlledTeamSide: this.controlledTeamSideModel,
              }).pipe(map((row) => this.toPlayerSwapMatrixSummary(row, candidate)))
            ),
            toArray()
          ))
        );
      })
    ).subscribe({
      next: (summaries) => {
        this.playerSwapBatterySummaries.set(summaries);
        this.playerSwapMatrixSummary.set(summaries[0] ?? null);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(
          this.fmtError(err, 'Player swap battery falló antes de generar Panel E')
        );
        this.snackBar.open(this.fmtError(err, 'Failed to run player swap battery'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const count = this.playerSwapBatterySummaries().length;
        this.snackBar.open(
          count > 0 ? `Player swap battery complete: ${count} swaps measured.` : 'Player swap battery completed with insufficient samples.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Player swap battery lista en Panel E.');
        this.refreshLineupContext();
      },
    });
  }
  onRunPlayerSwapPrecisionCompare(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    this.clearPlayerSwapAnalysisResults();
    this.analysisReadyMessage.set('Precision compare corriendo...');
    this.mutationInFlight.set(true);
    const source$ = this.selectedMatchIncludesUserTeam()
      ? forkJoin({
          lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
          squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
            take(1),
            timeout(10_000),
            catchError(() => of([] as SessionPlayer[]))
          ),
        })
      : of({ lineup: null as LineupDTO | null, squad: [] as SessionPlayer[] });
    source$.pipe(
      switchMap(({ lineup, squad }) => {
        const candidates = lineup ? this.pickPlayerSwapBatteryCandidates(lineup, squad, 6) : [];
        const effectiveCandidates = candidates.length > 0
          ? candidates
          : this.playerSwapBatteryModeModel === 'stress'
            ? this.autoBackendStressSwapCandidates()
            : [this.autoBackendPlayerSwapCandidate()];
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => this.runPlayerSwapCandidates(matchId, effectiveCandidates, seedStart, 3)),
          switchMap((quick) =>
            this.runPlayerSwapCandidates(matchId, effectiveCandidates, seedStart, 10).pipe(
              map((balanced) => this.buildPlayerSwapPrecisionComparisonRows(quick, balanced))
            )
          )
        );
      })
    ).subscribe({
      next: (rows) => {
        this.playerSwapPrecisionComparisonRows.set(rows);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Precision compare falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to compare player swap precision'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const changed = this.playerSwapPrecisionComparisonRows().filter((row) => row.stability !== 'Stable read').length;
        this.snackBar.open(
          `Precision compare complete: ${changed} changed/needs review.`,
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Precision compare listo en Panel E.');
        this.refreshLineupContext();
      },
    });
  }
  private runPlayerSwapCandidates(
    matchId: string,
    candidates: PlayerSwapCandidate[],
    seedStart: number,
    seedCount: number
  ): Observable<PlayerSwapMatrixSummary[]> {
    return from(candidates).pipe(
      concatMap((candidate) =>
        this.harness.runPlayerSwapMatrixSummary(matchId, {
          starterPlayerId: candidate.starterId,
          benchPlayerId: candidate.benchId,
          slotId: candidate.slotId,
          seedStart,
          seedCount,
          controlledTeamSide: this.controlledTeamSideModel,
        }).pipe(map((row) => this.toPlayerSwapMatrixSummary(row, candidate)))
      ),
      toArray()
    );
  }
  private runPlayerSwapBatteryMode(
    matchId: string,
    seedStart: number,
    seedCount: number,
    mode: 'natural' | 'stress',
    lineup: LineupDTO | null,
    squad: SessionPlayer[]
  ): Observable<PlayerSwapMatrixSummary[]> {
    const candidates = lineup ? this.pickPlayerSwapBatteryCandidates(lineup, squad, 6, mode) : [];
    const effectiveCandidates = candidates.length > 0
      ? candidates
      : mode === 'stress'
        ? this.autoBackendStressSwapCandidates()
        : [this.autoBackendPlayerSwapCandidate()];
    return this.runPlayerSwapCandidates(matchId, effectiveCandidates, seedStart, seedCount);
  }
  private buildPlayerSwapPrecisionComparisonRows(
    quick: PlayerSwapMatrixSummary[],
    balanced: PlayerSwapMatrixSummary[]
  ): PlayerSwapPrecisionComparisonRow[] {
    const balancedByKey = new Map(balanced.map((row) => [this.playerSwapComparisonKey(row), row]));
    return quick
      .map((quickRow) => {
        const balancedRow = balancedByKey.get(this.playerSwapComparisonKey(quickRow));
        if (!balancedRow) return null;
        const stability = this.playerSwapPrecisionStability(quickRow, balancedRow);
        return {
          candidateKey: this.playerSwapComparisonKey(quickRow),
          starter: quickRow.baselinePlayer,
          bench: quickRow.swapPlayer,
          slotId: quickRow.slotId,
          fit: quickRow.swapFit,
          quick: quickRow,
          balanced: balancedRow,
          stability,
          stabilityClass: this.playerSwapPrecisionStabilityClass(stability),
        };
      })
      .filter((row): row is PlayerSwapPrecisionComparisonRow => !!row);
  }
  private playerSwapComparisonKey(row: PlayerSwapMatrixSummary): string {
    return `${row.slotId}:${row.baselinePlayer}:${row.swapPlayer}`;
  }
  private playerSwapPrecisionStability(quick: PlayerSwapMatrixSummary, balanced: PlayerSwapMatrixSummary): string {
    if (quick.swapRead === balanced.swapRead) return 'Stable read';
    const quickScore = this.playerSwapDecisionScore(quick);
    const balancedScore = this.playerSwapDecisionScore(balanced);
    if (Math.sign(quickScore) !== Math.sign(balancedScore) || Math.abs(quickScore - balancedScore) > 0.12) {
      return 'Changed read';
    }
    return 'Needs more seeds';
  }
  private playerSwapPrecisionStabilityClass(stability: string): string {
    if (stability === 'Stable read') return 'delta-positive';
    if (stability === 'Changed read') return 'delta-negative';
    return 'read-check';
  }
  onRunPositionPixelMatrix(): void {
    // Position movement is more sensitive than a simple smoke replay. Keep this
    // at medium confidence by default so a 5px move is not over-read from only
    // three seeds inherited from the swap-battery quick mode.
    const seedCount = Math.max(10, Math.min(50, Math.round(this.playerSwapSeedCountModel || 10)));
    this.clearReplayAnalysisResultsForLatestRun();
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY) => this.positionMovementPresets(fromX, fromY),
      'Position presets matrix'
    );
  }
  onRunRoleSlotImpactSummary(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = Math.max(20, Math.min(50, Math.round(this.playerSwapSeedCountModel || 20)));
    const availableSlots = this.roleSlotImpactAvailableSlotOptions();
    const selectedSlotExists = availableSlots.some((option) => option.slotId === this.roleSlotImpactSlotIdModel);
    const slotId = selectedSlotExists
      ? this.roleSlotImpactSlotIdModel
      : (availableSlots[0]?.slotId ?? 'S06-3');
    this.roleSlotImpactSlotIdModel = slotId;
    const naturalPositions = this.roleSlotImpactNaturalPositionsForSlot(slotId);
    this.roleSlotImpactRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Role slot impact corriendo: slot ${slotId}, ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    this.harness.runRoleSlotImpactSummary(matchId, {
      slotId,
      naturalPositions,
      seedStart,
      seedCount,
      controlledTeamSide: 'USER',
    }).subscribe({
      next: (rows) => {
        const safeRows = [...(rows ?? [])].sort((a, b) => b.playerEffectiveness - a.playerEffectiveness);
        this.roleSlotImpactRows.set(safeRows);
        this.mutationInFlight.set(false);
        this.markReplayAnalysisReady(`Role slot impact completo (${safeRows.length} roles, ${seedCount} seeds).`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Role slot impact falló'));
      },
    });
  }
  onRunAllRoleSlotsSmoke(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const slots = this.roleSlotImpactAvailableSlotOptions()
      .filter((option) => option.slotId && option.slotId !== 'GK-1')
      .slice(0, 10);
    if (slots.length === 0) {
      this.snackBar.open('No hay slots reales cargados. Seleccioná partido o refrescá lineup.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = 10;
    this.roleSlotImpactSmokeRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`All role slots smoke corriendo: ${slots.length} slots x ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    from(slots).pipe(
      concatMap((slot) =>
        this.harness.runRoleSlotImpactSummary(matchId, {
          slotId: slot.slotId,
          naturalPositions: this.roleSlotImpactNaturalPositionsForSlot(slot.slotId),
          seedStart,
          seedCount,
          controlledTeamSide: 'USER',
        }).pipe(
          map((rows) => this.toRoleSlotImpactSmokeRow(slot, rows ?? [])),
          catchError((err) => of({
            slotId: slot.slotId,
            player: slot.label,
            bestRole: '?',
            bestEff: 0,
            worstRole: '?',
            worstEff: 0,
            gap: 0,
            verdict: this.fmtError(err, 'Review'),
            className: 'delta-negative',
          } satisfies RoleSlotImpactSmokeRow))
        )
      ),
      toArray()
    ).subscribe({
      next: (rows) => {
        this.roleSlotImpactSmokeRows.set(rows);
        this.mutationInFlight.set(false);
        this.markReplayAnalysisReady(`All role slots smoke completo (${rows.length} slots).`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'All role slots smoke falló'));
      },
    });
  }
  onRunAllFormationsRoleSlotSmoke(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = 5;
    const formations = [...FORMATION_CODES];
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.allFormationRoleSlotSmokeRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`All formations role-slot smoke corriendo: ${formations.length} formaciones x 10 slots...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        restore = {
          formation: originalLineup.formation ?? this.selectedFormationModel ?? '4-4-2',
          playerIds: this.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return from(formations).pipe(
          concatMap((formation) =>
            this.harness.autoSelectLineup(formation).pipe(
              switchMap((lineup) => {
                this.selectedFormationModel = formation;
                const slots = this.roleSlotOptionsFromLineup(lineup)
                  .filter((option) => option.slotId && option.slotId !== 'GK-1')
                  .slice(0, 10);
                if (slots.length === 0) {
                  return of(this.emptyAllFormationRoleSlotSmokeRow(formation, 'Sin slots reales'));
                }
                return from(slots).pipe(
                  concatMap((slot) =>
                    this.harness.runRoleSlotImpactSummary(matchId, {
                      slotId: slot.slotId,
                      naturalPositions: this.roleSlotImpactNaturalPositionsForSlot(slot.slotId),
                      seedStart,
                      seedCount,
                      controlledTeamSide: 'USER',
                    }).pipe(
                      map((rows) => this.toRoleSlotImpactSmokeRow(slot, rows ?? [])),
                      catchError((err) => of({
                        slotId: slot.slotId,
                        player: slot.label,
                        bestRole: '?',
                        bestEff: 0,
                        worstRole: '?',
                        worstEff: 0,
                        gap: 0,
                        verdict: this.fmtError(err, 'Review'),
                        className: 'delta-negative',
                      } satisfies RoleSlotImpactSmokeRow))
                    )
                  ),
                  toArray(),
                  map((rows) => this.toAllFormationRoleSlotSmokeRow(formation, rows))
                );
              })
            )
          ),
          toArray()
        );
      }),
      finalize(() => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(take(1)).subscribe({
            next: () => {
              this.selectedFormationModel = restore?.formation as FormationCode;
            },
            error: (err) => {
              this.snackBar.open(this.fmtError(err, 'No pude restaurar la alineacion original'), 'OK', { duration: 5000 });
            },
          });
        }
      })
    ).subscribe({
      next: (rows) => {
        this.allFormationRoleSlotSmokeRows.set(rows);
        this.mutationInFlight.set(false);
        const reviews = rows.filter((row) => row.review > 0 || row.verdict.includes('Revisar')).length;
        this.markReplayAnalysisReady(
          reviews === 0
            ? `All formations role-slot smoke OK (${rows.length} formaciones).`
            : `All formations role-slot smoke: ${reviews} formaciones con slots a revisar.`
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'All formations role-slot smoke falló'));
      },
    });
  }
  onRunLastModalMovePositionSmoke(): void {
    const modalMove = this.readLastModalPositionMoveCase();
    if (!modalMove) {
      this.snackBar.open('No hay ultimo movimiento del modal guardado. Mové un jugador en Editar Formación Visual primero.', 'OK', { duration: 5000 });
      return;
    }
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = Math.max(10, Math.min(50, Math.round(this.playerSwapSeedCountModel || 10)));
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.clearReplayAnalysisResultsForLatestRun();
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Last modal move: preparando ${modalMove.playerName} (${seedCount} seeds)...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    this.harness.resetInjuries().pipe(
      take(1),
      switchMap(() => this.harness.getCurrentLineup()),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        const originalPlayerIds = this.lineupPlayerIdsFromSlots(originalSlots);
        restore = {
          formation: originalLineup.formation ?? modalMove.formation ?? this.selectedFormationModel ?? '4-4-2',
          playerIds: originalPlayerIds,
          slots: originalSlots,
        };
        const baselineSlots = this.baselineSlotsForLastModalMove(originalSlots, modalMove);
        if (!baselineSlots) {
          throw new Error(`No pude encontrar al jugador ${modalMove.playerName} en el XI actual para reconstruir el antes del movimiento.`);
        }
        return this.harness.manualSelectLineup(restore.formation, originalPlayerIds, baselineSlots);
      }),
      switchMap(() => this.harness.runPositionPixelMatrixSummary(matchId, {
        playerId: modalMove.playerId,
        targetXPercent: modalMove.targetXPercent,
        targetYPercent: modalMove.targetYPercent,
        deltaXPercent: modalMove.deltaXPercent,
        deltaYPercent: modalMove.deltaYPercent,
        seedStart,
        seedCount,
        controlledTeamSide: this.controlledTeamSideModel,
      })),
      finalize(() => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(take(1)).subscribe({
            error: (err) => console.warn('[TEST-HARNESS] Failed to restore lineup after last modal move smoke:', err),
          });
        }
      })
    ).subscribe({
      next: (row) => {
        const label = `modal ${modalMove.playerName}: ${modalMove.fromXPercent.toFixed(1)},${modalMove.fromYPercent.toFixed(1)} -> ${modalMove.targetXPercent.toFixed(1)},${modalMove.targetYPercent.toFixed(1)}`;
        const summary = this.toPositionPixelMatrixSummary(row, label);
        this.positionPixelMatrixRows.set([summary]);
        this.positionPixelMatrixSummary.set(summary);
        this.lineupDebugSnapshot.set({
          label: 'Last modal move',
          formation: modalMove.formation,
          selectedFormation: this.selectedFormationModel ?? modalMove.formation,
          playerCount: 1,
          nonGkCount: 1,
          persistedSlotCount: 1,
          effectiveSlotCount: 1,
          candidatesCount: 1,
          visualLineFilter: 'LAST_MODAL_MOVE',
          rows: [
            {
              index: 1,
              playerId: modalMove.playerId,
              name: `${modalMove.playerName} (antes)`,
              position: modalMove.playerPosition ?? modalMove.playerRole ?? '?',
              slotId: modalMove.slotId ?? row.slotId,
              x: modalMove.fromXPercent,
              y: modalMove.fromYPercent,
              visualLine: this.positionPixelVisualLine(modalMove.fromYPercent),
              source: 'persisted',
            },
            {
              index: 2,
              playerId: modalMove.playerId,
              name: `${modalMove.playerName} (despues)`,
              position: modalMove.playerPosition ?? modalMove.playerRole ?? '?',
              slotId: modalMove.slotId ?? row.slotId,
              x: modalMove.targetXPercent,
              y: modalMove.targetYPercent,
              visualLine: this.positionPixelVisualLine(modalMove.targetYPercent),
              source: 'persisted',
            },
          ],
          warnings: modalMove.coachReadTitle ? [modalMove.coachReadTitle] : [],
        });
        this.markReplayAnalysisReady(`Last modal move listo: ${modalMove.playerName}.`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Last modal move falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run last modal move'), 'OK', { duration: 5000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.snackBar.open(`Last modal move complete: ${modalMove.playerName}, ${seedCount} seeds.`, 'OK', { duration: 4500 });
      },
    });
  }
  private readLastModalPositionMoveCase(): LastModalPositionMoveCase | null {
    try {
      const raw = window.localStorage.getItem('manager:last-modal-position-move');
      if (!raw) { return null; }
      const parsed = JSON.parse(raw) as Partial<LastModalPositionMoveCase>;
      const numericFields = [
        parsed.fromXPercent,
        parsed.fromYPercent,
        parsed.targetXPercent,
        parsed.targetYPercent,
        parsed.deltaXPercent,
        parsed.deltaYPercent,
      ];
      if (!parsed.playerId || !parsed.playerName || numericFields.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        return null;
      }
      return parsed as LastModalPositionMoveCase;
    } catch {
      return null;
    }
  }
  private baselineSlotsForLastModalMove(
    originalSlots: LineupSlotDTO[],
    modalMove: LastModalPositionMoveCase
  ): LineupSlotDTO[] | null {
    let found = false;
    const slots = originalSlots.map((slot) => {
      if (slot.playerId !== modalMove.playerId) { return { ...slot }; }
      found = true;
      return {
        ...slot,
        subdivisionId: modalMove.slotId ?? slot.subdivisionId,
        customXPercent: modalMove.fromXPercent,
        customYPercent: modalMove.fromYPercent,
      };
    });
    return found ? slots : null;
  }
  onRunWingbackPixelLab(): void {
    const seedCount = Math.max(20, Math.min(50, Math.round(this.playerSwapSeedCountModel || 20)));
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY, candidate) => this.wingbackMovementPresets(fromX, fromY, candidate),
      'Wingback pixel lab',
      null,
      (lineup) => this.pickWingbackPixelCandidates(lineup),
      null,
      false
    );
  }
  onRunPositionSensitivityCheck(): void {
    const seedCount = Math.max(20, Math.min(50, Math.round(this.playerSwapSeedCountModel || 20)));
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY) => this.positionMicroMovementPresets(fromX, fromY),
      'Sensitivity check'
    );
  }
  onRunManualExtremesPositionHunt(): void {
    const seedCount = Math.max(10, Math.min(30, Math.round(this.playerSwapSeedCountModel || 10)));
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY, candidate) => this.manualExtremeMovementPresets(fromX, fromY, candidate),
      'Manual extremes hunt',
      null,
      (lineup) => this.pickManualExtremeCandidates(lineup)
    );
  }
  onRunPositionCalibrationSweep(): void {
    const seedCount = Math.max(10, Math.min(30, Math.round(this.playerSwapSeedCountModel || 10)));
    const matches = this.userTeamMatches()
      .filter((match) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      this.snackBar.open(`No completed ${this.userTeamName() || 'user team'} matches available for position smoke.`, 'OK', { duration: 4000 });
      return;
    }
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY) => this.positionMovementPresets(fromX, fromY)
        .filter((preset) => [
          '5px forward',
          '5px deeper',
          '5px wide',
          '5px center',
          '5px wide forward',
          '5px wide deeper',
          '5px center forward',
          '5px center deeper',
          'big zone cross',
        ].includes(preset.label)),
      'Calibration sweep',
      matches,
      null,
      null,
      true,
      'ALL'
    );
  }
  onRunMidfielderPositionSweep(): void {
    this.onRunLinePositionSweep('MID');
  }
  onRunLinePositionSweep(line: 'DEF' | 'MID' | 'ATT'): void {
    const seedCount = Math.max(10, Math.min(30, Math.round(this.playerSwapSeedCountModel || 10)));
    const matches = this.userTeamMatches()
      .filter((match) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      this.snackBar.open(`No completed ${this.userTeamName() || 'user team'} matches available for ${line} position smoke.`, 'OK', { duration: 4000 });
      return;
    }
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY) => this.positionMovementPresets(fromX, fromY)
        .filter((preset) => ['5px forward', '5px deeper', '5px wide', '5px center'].includes(preset.label)),
      `${line} calibration sweep`,
      matches,
      (lineup) => this.pickPositionPixelLineCandidates(lineup, line, 6),
      line,
      true,
      line
    );
  }
  onRunFullPositionSmokeBoard(): void {
    const seedCount = Math.max(10, Math.min(30, Math.round(this.playerSwapSeedCountModel || 10)));
    const matches = this.userTeamMatches()
      .filter((match) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      this.snackBar.open(`No completed ${this.userTeamName() || 'user team'} matches available for full position board.`, 'OK', { duration: 4000 });
      return;
    }
    const scopes: PositionPixelSmokeScope[] = ['ALL', 'DEF', 'MID', 'ATT'];
    this.positionPixelSmokeRunSummaries.set([]);
    const runScope = (index: number): void => {
      const scope = scopes[index];
      if (!scope) {
        this.snackBar.open('Full position smoke board complete.', 'OK', { duration: 4500 });
        this.markReplayAnalysisReady('Full position smoke board listo en Panel E.');
        return;
      }
      if (scope === 'ALL') {
        this.runPositionPixelMatrixWithPresets(
          seedCount,
          (fromX, fromY) => this.positionMovementPresets(fromX, fromY)
            .filter((preset) => [
              '5px forward',
              '5px deeper',
              '5px wide',
              '5px center',
              '5px wide forward',
              '5px wide deeper',
              '5px center forward',
              '5px center deeper',
              'big zone cross',
            ].includes(preset.label)),
          'Full board · ALL',
          matches,
          null,
          null,
          true,
          'ALL',
          () => runScope(index + 1)
        );
        return;
      }
      this.runPositionPixelMatrixWithPresets(
        seedCount,
        (fromX, fromY) => this.positionMovementPresets(fromX, fromY)
          .filter((preset) => ['5px forward', '5px deeper', '5px wide', '5px center'].includes(preset.label)),
        `Full board · ${scope}`,
        matches,
        (lineup) => this.pickPositionPixelLineCandidates(lineup, scope, 6),
        scope,
        true,
        scope,
        () => runScope(index + 1)
      );
    };
    runScope(0);
  }
  onRunCurrentFormationLineAudit(): void {
    if (!this.canRunUserLineupAudit()) {
      const reason = this.userLineupAuditDisabledReason();
      this.analysisReadyMessage.set(reason);
      this.snackBar.open(reason, 'OK', { duration: 5000 });
      return;
    }
    const matches = this.userTeamMatches()
      .filter((match) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      this.snackBar.open(`No completed ${this.userTeamName() || 'user team'} matches available for formation line audit.`, 'OK', { duration: 4000 });
      return;
    }
    const formation = this.selectedFormationModel ?? '4-4-2';
    this.clearFormationLineAuditResults();
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Formation line audit corriendo para ${formation}...`);
    this.currentOrAutoSelectedLineup(formation).subscribe({
      next: (lineup) => {
        const rows = (['DEF', 'MID', 'ATT'] as const).map((line) =>
          this.toFormationLineSmokeRow(lineup, line, matches.length)
        );
        this.formationLineSmokeRows.set(rows);
        const allOk = rows.every((row) => row.candidates > 0);
        this.lineupDebugSnapshot.set(this.buildLineupDebugSnapshot(
          lineup,
          'Formation line audit',
          null,
          rows.flatMap((row) => this.pickPositionPixelLineCandidates(lineup, row.line, 6))
        ));
        this.mutationInFlight.set(false);
        this.snackBar.open(
          allOk ? `Formation line audit OK (${formation}).` : `Formation line audit has warnings (${formation}).`,
          'OK',
          { duration: 4000 }
        );
        this.markReplayAnalysisReady(`Formation line audit listo para ${formation}.`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Formation line audit falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run formation line audit'), 'OK', { duration: 5000 });
      },
    });
  }
  onRunAllFormationsLineAudit(): void {
    if (!this.canRunUserLineupAudit()) {
      const reason = this.userLineupAuditDisabledReason();
      this.analysisReadyMessage.set(reason);
      this.snackBar.open(reason, 'OK', { duration: 5000 });
      return;
    }
    const matches = this.userTeamMatches()
      .filter((match) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      this.snackBar.open(`No completed ${this.userTeamName() || 'user team'} matches available for all-formations line audit.`, 'OK', { duration: 4000 });
      return;
    }
    const formations = [...this.formationCodes];
    this.clearFormationLineAuditResults();
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`All formations line audit corriendo: ${formations.length} formaciones...`);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        const originalPlayerIds = this.lineupPlayerIdsFromSlots(originalSlots);
        return from(formations).pipe(
          concatMap((formation) =>
            this.harness.autoSelectLineup(formation).pipe(
              map((lineup) => ({ formation, lineup }))
            )
          ),
          toArray(),
          switchMap((items) =>
            this.harness.manualSelectLineup(originalLineup.formation, originalPlayerIds, originalSlots).pipe(
              map(() => items)
            )
          )
        );
      })
    ).subscribe({
      next: (items) => {
        const rows = items.flatMap(({ formation, lineup }) =>
          (['DEF', 'MID', 'ATT'] as const).map((line) =>
            this.toFormationLineSmokeRow(
              { ...lineup, formation: lineup.formation ?? formation },
              line,
              matches.length
            )
          )
        );
        this.formationLineSmokeRows.set(rows);
        const last = items[items.length - 1]?.lineup ?? null;
        if (last) {
          this.lineupDebugSnapshot.set(this.buildLineupDebugSnapshot(
            last,
            'All formations line audit (last formation)',
            null,
            (['DEF', 'MID', 'ATT'] as const).flatMap((line) => this.pickPositionPixelLineCandidates(last, line, 6))
          ));
        }
        const reviewCount = rows.filter((row) => row.verdict === 'Review').length;
        const fallbackCount = rows.filter((row) => row.verdict === 'Fallback').length;
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.allFormationsLineAuditToast(rows.length, reviewCount, fallbackCount),
          'OK',
          { duration: 5000 }
        );
        this.markReplayAnalysisReady(
          reviewCount === 0
            ? `All formations line audit listo: ${rows.length} line checks · ${fallbackCount} fallback penalizado.`
            : `All formations line audit listo: ${rows.length} line checks · ${reviewCount} revisar · ${fallbackCount} fallback.`
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'All formations line audit falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run all formations line audit'), 'OK', { duration: 5000 });
      },
    });
  }
  private allFormationsLineAuditToast(totalRows: number, reviewCount: number, fallbackCount: number): string {
    if (reviewCount > 0) {
      return `All formations line audit: ${reviewCount} line checks need review.`;
    }
    if (fallbackCount > 0) {
      return `All formations line audit OK with ${fallbackCount} penalized fallback line checks (${totalRows} total).`;
    }
    return `All formations line audit OK (${totalRows} line checks).`;
  }
  private toFormationLineSmokeRow(
    lineup: LineupDTO,
    line: 'DEF' | 'MID' | 'ATT',
    matchCount: number
  ): FormationLineSmokeRow {
    const candidates = this.pickPositionPixelLineCandidates(lineup, line, 6);
    const expectedRows = candidates.length * 4 * matchCount;
    const minExpected = line === 'ATT' ? 1 : 2;
    const warnings: string[] = [];
    const effectiveSlots = this.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map(effectiveSlots.map((slot) => [slot.playerId, slot]));
    const slotRolesByPlayer = new Map(candidates.map((candidate) => {
      const slot = slotByPlayer.get(candidate.starterId);
      const role = this.canonicalFormationPosition(lineup.formation, slot)?.role
        ?? this.tacticalRoleFromVisualLine(line);
      return [candidate.starterId, role] as const;
    }));
    if ((lineup.players?.length ?? 0) !== 11) warnings.push(`players ${lineup.players?.length ?? 0}/11`);
    if ((lineup.slots?.length ?? 0) !== 11) warnings.push(`slots ${lineup.slots?.length ?? 0}/11`);
    if (candidates.length < minExpected) warnings.push(`few ${line} candidates`);
    const offRoleCandidates = candidates.filter((candidate) =>
      !this.naturalFitsTacticalRole(candidate.starterPosition, slotRolesByPlayer.get(candidate.starterId) ?? line)
    );
    const hardOffRoleCount = offRoleCandidates.filter((candidate) =>
      this.isHardFormationLineOffRole(candidate.starterPosition, slotRolesByPlayer.get(candidate.starterId) ?? line)
    ).length;
    const fallbackOffRoleCount = offRoleCandidates.length - hardOffRoleCount;
    if (hardOffRoleCount > 0) warnings.push(`hard off-role ${hardOffRoleCount}/${candidates.length}`);
    if (fallbackOffRoleCount > 0) warnings.push(`fallback profile ${fallbackOffRoleCount}/${candidates.length}`);
    const verdict = warnings.some((warning) =>
      warning.startsWith('players ')
      || warning.startsWith('slots ')
      || warning.startsWith('few ')
      || warning.startsWith('hard off-role ')
    )
      ? 'Review'
      : warnings.length > 0 ? 'Fallback' : 'OK';
    return {
      formation: lineup.formation ?? this.selectedFormationModel ?? '?',
      line,
      candidates: candidates.length,
      expectedRows,
      players: candidates.map((candidate) => `${candidate.starterName} (${candidate.starterPosition})`).join(' · '),
      slotRoles: candidates.map((candidate) => slotRolesByPlayer.get(candidate.starterId) ?? '?').join(' · '),
      verdict,
      warnings: warnings.join(' · '),
    };
  }
  private tacticalRoleFromVisualLine(line: 'DEF' | 'MID' | 'ATT'): string {
    if (line === 'DEF') return 'DEF';
    if (line === 'ATT') return 'ATT';
    return 'MID';
  }
  private naturalFitsTacticalRole(naturalPosition: string | null | undefined, tacticalRole: string | null | undefined): boolean {
    const natural = String(naturalPosition ?? '').trim().toUpperCase();
    const role = String(tacticalRole ?? '').trim().toUpperCase();
    if (!natural || !role) return true;
    if (natural === role) return true;
    const fitGroups: Record<string, string[]> = {
      LWB: ['LB', 'LW', 'LM', 'WINGER', 'DEF', 'MID'],
      RWB: ['RB', 'RW', 'RM', 'WINGER', 'DEF', 'MID'],
      LM: ['LW', 'LWB', 'LB', 'WINGER', 'MID'],
      RM: ['RW', 'RWB', 'RB', 'WINGER', 'MID'],
      CAM: ['CM', 'AM', 'CAM', 'CF', 'WINGER', 'MID', 'ATT'],
      AM: ['CM', 'CAM', 'CF', 'WINGER', 'MID', 'ATT'],
      CDM: ['CM', 'CDM', 'DM', 'CB', 'MID', 'DEF'],
      DM: ['CM', 'CDM', 'DM', 'CB', 'MID', 'DEF'],
      CF: ['ST', 'CF', 'CAM', 'ATT'],
      ST: ['ST', 'CF', 'ATT'],
      LW: ['LW', 'LM', 'WINGER'],
      RW: ['RW', 'RM', 'WINGER'],
      CB: ['CB', 'DEF'],
      LB: ['LB', 'LWB', 'DEF'],
      RB: ['RB', 'RWB', 'DEF'],
    };
    if (fitGroups[role]) {
      return fitGroups[role].includes(natural);
    }
    const naturalLine = this.strictPositionPixelLine(natural);
    const roleLine = this.strictPositionPixelLine(role);
    return !!naturalLine && !!roleLine && naturalLine === roleLine;
  }
  private isHardFormationLineOffRole(naturalPosition: string | null | undefined, tacticalRole: string | null | undefined): boolean {
    const natural = String(naturalPosition ?? '').trim().toUpperCase();
    const role = String(tacticalRole ?? '').trim().toUpperCase();
    if (!natural || !role) return false;
    if (this.isAcceptableFormationLineFallback(natural, role)) return false;
    const naturalLine = this.strictPositionPixelLine(natural);
    const roleLine = this.strictPositionPixelLine(role);
    if (!naturalLine || !roleLine) return false;
    return naturalLine !== roleLine;
  }
  private isAcceptableFormationLineFallback(naturalPosition: string, tacticalRole: string): boolean {
    if (['CDM', 'CM', 'CAM'].includes(tacticalRole)
      && ['WINGER', 'LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'].includes(naturalPosition)) {
      return true;
    }
    return ['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'].includes(tacticalRole)
      && ['MID', 'CM', 'CDM', 'DM', 'CAM', 'AM'].includes(naturalPosition);
  }
  private runPositionPixelMatrixWithPresets(
    seedCount: number,
    presetsFor: (fromX: number, fromY: number, candidate: PositionPixelCandidate) => Array<{ label: string; x: number; y: number; dx: number; dy: number }>,
    label: string,
    targetMatches: TestHarnessMatchRow[] | null = null,
    candidatesFor: ((lineup: LineupDTO) => PositionPixelCandidate[]) | null = null,
    visualLineFilter: 'DEF' | 'MID' | 'ATT' | null = null,
    allowAutoFallback = true,
    smokeScope: PositionPixelSmokeScope | null = null,
    onComplete: (() => void) | null = null
  ): void {
    if (!targetMatches && (!this.selectedMatchId() || !this.selectedMatchIncludesUserTeam())) {
      this.ensureProfessionalQaChecklistMatch();
    }
    const effectiveSelectedMatch = this.selectedMatch();
    const matches = targetMatches ?? (effectiveSelectedMatch ? [effectiveSelectedMatch] : []);
    if (!this.selectedMatchId() && matches.length === 0) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    this.playerSwapSeedCountModel = seedCount;
    this.clearPositionPixelAnalysisResults();
    this.mutationInFlight.set(true);
    this.positionPixelEvidenceNote.set(null);
    this.lastPositionPixelRunDiagnostics.set(null);
    this.lastPositionPixelResponseDiagnostics.set(null);
    let lastPixelRunDiagnostics = `${label}: sin diagnostico todavia.`;
    this.analysisReadyMessage.set(`${label} corriendo: preparando titulares, movimientos y ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    const lineup$ = this.selectedMatchIncludesUserTeam()
      ? this.currentOrAutoSelectedLineup(this.selectedFormationModel ?? '4-4-2')
      : of({
          formation: this.selectedFormationModel ?? 'AUTO',
          players: [] as LineupDTO['players'],
          slots: [] as LineupDTO['slots'],
        } as LineupDTO);
    lineup$.pipe(
      switchMap((lineup) => {
        let candidates = candidatesFor ? candidatesFor(lineup) : this.pickPositionPixelCandidates(lineup);
        const playerCount = lineup.players?.length ?? 0;
        const slotCount = lineup.slots?.length ?? 0;
        const nonGkCount = (lineup.players ?? []).filter((player) => player.position !== 'GK').length;
        if (allowAutoFallback && ((candidates.length === 0 && playerCount === 0) || !this.selectedMatchIncludesUserTeam())) {
          candidates = this.autoPositionPixelCandidates();
          this.analysisReadyMessage.set(
            `${label} corriendo: current lineup vac?o; usando Auto DEF/MID/ATT del XI real del partido.`
          );
        }
        if (candidates.length === 0) {
          throw new Error(
            `No suitable non-GK starters found for pixel movement. `
            + `lineup players=${playerCount}, nonGK=${nonGkCount}, slots=${slotCount}, formation=${lineup.formation ?? 'unknown'}.`
          );
        }
        const slots = this.effectivePositionPixelSlots(lineup);
        const candidateContexts = candidates.map((candidate) => {
          const slot = slots.find((s) => s.playerId === candidate.starterId);
          const fromX = this.matchContextXPercent(slot) ?? this.canonicalXPercent(lineup.formation, slot) ?? 50;
          const fromY = this.matchContextYPercent(slot) ?? this.canonicalYPercent(lineup.formation, slot) ?? this.fallbackYForPosition(candidate.starterPosition);
          return { candidate, fromX, fromY };
        }).filter((context) => !visualLineFilter || this.positionPixelVisualLine(context.fromY) === visualLineFilter);
        this.lineupDebugSnapshot.set(this.buildLineupDebugSnapshot(
          lineup,
          label,
          visualLineFilter,
          candidateContexts.map((context) => context.candidate)
        ));
        if (candidateContexts.length === 0) {
          throw new Error(
            `${label} found no candidates in visual line ${visualLineFilter ?? 'any'}. `
            + `lineup players=${playerCount}, nonGK=${nonGkCount}, slots=${slotCount}, formation=${lineup.formation ?? 'unknown'}.`
          );
        }
        const requests = candidateContexts.flatMap(({ candidate, fromX, fromY }) => {
          const presets = presetsFor(fromX, fromY, candidate);
          return matches.flatMap((match) =>
            presets.map((preset) =>
              this.harness.runPositionPixelMatrixSummary(match.matchId, {
                playerId: candidate.starterId,
                targetXPercent: preset.x,
                targetYPercent: preset.y,
                deltaXPercent: preset.dx,
                deltaYPercent: preset.dy,
                seedStart,
                seedCount,
                controlledTeamSide: this.controlledTeamSideModel,
              }).pipe(
                map((row) => ({
                  label: this.calibrationLabel(match, preset.label),
                  row,
                  empty: false,
                  error: null as string | null,
                })),
                defaultIfEmpty({
                  label: this.calibrationLabel(match, preset.label),
                  row: null as any,
                  empty: true,
                  error: null,
                }),
                catchError((err) => of({
                  label: this.calibrationLabel(match, preset.label),
                  row: null as any,
                  empty: false,
                  error: this.fmtError(err, 'position pixel request failed'),
                }))
              )
            )
          );
        });
        lastPixelRunDiagnostics = `${label}: matches=${matches.length}, candidates=${candidateContexts.length}, requests=${requests.length}, line=${visualLineFilter ?? 'any'}, selected=${this.selectedMatchId() ?? 'none'}.`;
        this.lastPositionPixelRunDiagnostics.set(lastPixelRunDiagnostics);
        if (requests.length === 0) {
          throw new Error(`No pixel movement requests were built for ${label}. ${lastPixelRunDiagnostics}`);
        }
        this.analysisReadyMessage.set(
          `${label} corriendo: ${requests.length} jugador/movimiento requests x ${seedCount} seeds.`
        );
        return from(requests).pipe(
          mergeMap((request$) => request$, 4),
          toArray()
        );
      })
    ).subscribe({
      next: (items) => {
        const validItems = items
          .map((item) => ({
            ...item,
            row: (item.row as any)?.body ?? (item.row as any)?.data ?? item.row,
          }))
          .filter((item) => item.row);
        const emptyCount = items.filter((item) => item.empty).length;
        const errorItems = items.filter((item) => item.error);
        const rows: PositionPixelMatrixSummary[] = [];
        const mapErrors: string[] = [];
        for (const item of validItems) {
          try {
            rows.push(this.toPositionPixelMatrixSummary(item.row, item.label));
          } catch (err) {
            mapErrors.push(`${item.label}: ${this.fmtError(err, 'map failed')}`);
          }
        }
        const responseDiagnostics = `${label}: responses=${items.length}, valid=${validItems.length}, mapped=${rows.length}, empty=${emptyCount}, errors=${errorItems.length}, mapErrors=${mapErrors.length}.`;
        this.lastPositionPixelResponseDiagnostics.set(responseDiagnostics);
        this.lastPositionPixelMappedRows.set(rows.length);
        this.positionPixelMatrixRows.set(rows);
        this.positionPixelMatrixSummary.set(this.pickPositionPixelHeadlineRow(rows));
        this.positionPixelEvidenceNote.set(rows.length > 0
          ? (mapErrors.length > 0 ? `${label}: filas parciales. ${responseDiagnostics} ${mapErrors[0]}` : null)
          : `${label}: sin filas utiles. ${lastPixelRunDiagnostics} ${responseDiagnostics} ${mapErrors[0] ?? errorItems[0]?.error ?? 'El motor/interceptor no devolvio cuerpo usable.'}`);
        if (smokeScope) {
          this.recordPositionPixelSmokeRun(smokeScope, label, rows);
        }
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        const note = this.fmtError(err, `${label} falló antes de generar filas`);
        this.positionPixelEvidenceNote.set(note);
        this.analysisReadyMessage.set(note);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run position pixel matrix'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const summary = this.positionPixelMatrixSummary();
        this.snackBar.open(
          summary
            ? `${label} complete: ${this.positionPixelMatrixRows().length} player/move rows, ${seedCount} seeds.`
            : 'Position pixel matrix completed with no summary.',
          'OK',
          { duration: 4500 }
        );
        if (summary) {
          this.markReplayAnalysisReady(`${label} listo en Panel E.`);
        } else {
          const note = this.positionPixelEvidenceNote()
            ?? `${label} terminó sin filas. ${lastPixelRunDiagnostics} Revisar candidatos, slots, partido seleccionado y presets.`;
          this.positionPixelEvidenceNote.set(note);
          this.analysisReadyMessage.set(note);
          window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
        }
        onComplete?.();
      },
    });
  }
  private pickPositionPixelHeadlineRow(rows: PositionPixelMatrixSummary[]): PositionPixelMatrixSummary | null {
    if (rows.length === 0) return null;
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) =>
        this.positionPixelReadSeverity(b.row) - this.positionPixelReadSeverity(a.row)
        || this.positionPixelImpactScore(b.row) - this.positionPixelImpactScore(a.row)
        || this.positionPixelDistance(b.row) - this.positionPixelDistance(a.row)
        || a.index - b.index
      )[0].row;
  }
  private recordPositionPixelSmokeRun(
    scope: PositionPixelSmokeScope,
    label: string,
    rows: PositionPixelMatrixSummary[]
  ): void {
    if (rows.length === 0) return;
    const aggregate = this.toPositionPixelMatchSmokeSummary('All completed matches', rows);
    const matchCount = new Set(rows.map((row) => this.positionPixelMatchLabel(row))).size;
    const playerCount = new Set(rows.map((row) => `${row.playerName}|${row.slotId}`)).size;
    const next: PositionPixelSmokeRunSummary = {
      ...aggregate,
      scope,
      label,
      matchCount,
      playerCount,
      runAt: new Date().toISOString(),
    };
    this.positionPixelSmokeRunSummaries.update((items) => {
      const withoutScope = items.filter((item) => item.scope !== scope);
      return [...withoutScope, next].sort((a, b) =>
        this.positionPixelSmokeScopeOrder(a.scope) - this.positionPixelSmokeScopeOrder(b.scope)
      );
    });
  }
  private positionPixelSmokeScopeOrder(scope: PositionPixelSmokeScope): number {
    return ({ ALL: 0, DEF: 1, MID: 2, ATT: 3 } as const)[scope];
  }
  private userTeamMatches(): TestHarnessMatchRow[] {
    const team = this.userTeamName();
    if (!team) return [];
    return this.rounds()
      .flatMap((round) => round.matches)
      .filter((match) => match.homeTeamName === team || match.awayTeamName === team);
  }
  private calibrationLabel(match: TestHarnessMatchRow, presetLabel: string): string {
    const team = this.userTeamName();
    const opponent = team && match.homeTeamName === team ? match.awayTeamName : match.homeTeamName;
    return `R${match.round} vs ${opponent} · ${presetLabel}`;
  }
  /**
   * V24D24.2: simulate the selected round (Panel B dropdown). Extracts the
   * matches of that round from {@code rounds()}, builds the request body,
   * and POSTs to {@code /api/v1/match-engine/rounds/start}.
   *
   * <p>The backend runs the simulation async ? we get back the initial
   * RoundStateResponse and let Iv?n watch the scores land by reloading
   * Panel C (the round will eventually mark matches COMPLETED).
   */
  onSimulateRound(): void {
    const roundNumber = this.selectedRoundModel;
    if (roundNumber === null) {
      this.snackBar.open('Pick a round in the dropdown first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const roundGroup = this.rounds().find((r) => r.round === roundNumber);
    if (!roundGroup || roundGroup.matches.length === 0) {
      this.snackBar.open(
        `Round ${roundNumber} has no matches to simulate.`,
        'OK',
        { duration: 3000 }
      );
      return;
    }
    // Pick the roundId from the first match ? all matches of the round
    // share the same deterministic UUID (F1 backend contract).
    const roundId = roundGroup.matches[0]?.roundId ?? null;
    if (!roundId) {
      this.snackBar.open(
        `Round ${roundNumber} has no roundId (backend did not hydrate it). Reload the page.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const matchesPayload = roundGroup.matches.map((m) => ({
      matchId: m.matchId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }));
    this.mutationInFlight.set(true);
    this.harness.simulateRound(roundId, matchesPayload).subscribe({
      next: () => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          `Round ${roundNumber} simulation started (${matchesPayload.length} matches).`,
          'OK',
          { duration: 3000 }
        );
        // The simulation is async: refresh Panel C several times so the UI
        // catches the completed fixtures instead of freezing on the initial
        // PENDING snapshot returned by /rounds/start.
        this.scheduleRoundCompletionRefresh(roundNumber, matchesPayload.length);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, `Failed to simulate round ${roundNumber}`),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  // ============== Track-by ==============
  trackByRound(_index: number, r: RoundGroup): number {
    return r.round;
  }
  trackByMatchId(_index: number, m: TestHarnessMatchRow): string {
    return m.matchId;
  }
  trackByFormationReplay(_index: number, row: FormationReplayResult): string {
    return row.formation;
  }
  trackByFormationSummary(_index: number, row: FormationMatrixSummaryRow): string {
    return row.formation;
  }
  trackByLowBlockLabRow(_index: number, row: LowBlockLabRow): string {
    return row.variant;
  }
  trackByBackFiveTransitionLabRow(_index: number, row: BackFiveTransitionLabRow): string {
    return row.variant;
  }
  trackByBackFiveFamilyLabRow(_index: number, row: BackFiveFamilyLabRow): string {
    return row.key;
  }
  trackByBackFiveContextSmokeRow(_index: number, row: BackFiveContextSmokeRow): string {
    return `${row.matchId}-${row.controlledSide}`;
  }
  signed(value: number | null | undefined): string {
    const numeric = Number(value ?? 0);
    const fixed = Math.abs(numeric) >= 10 ? numeric.toFixed(1) : numeric.toFixed(2);
    return `${numeric >= 0 ? '+' : ''}${fixed}`;
  }
  trackBySideMirrorSmokeRow(_index: number, row: SideMirrorSmokeRow): string {
    return row.formation;
  }
  trackBySideMirrorDecisionRow(_index: number, row: SideMirrorDecisionRow): string {
    return row.formation;
  }
  trackByWingbackLabRow(_index: number, row: WingbackLabRow): string {
    return row.formation;
  }
  sideMirrorVerdictClass(row: SideMirrorSmokeRow): string {
    return this.sideMirrorVerdictLabelClass(row.verdict);
  }
  sideMirrorVerdictLabelClass(verdict: SideMirrorSmokeRow['verdict']): string {
    if (verdict === 'OK') return 'read-strong';
    if (verdict === 'Parcial') return 'read-visible';
    return 'read-check';
  }
  formationSummaryRead(row: FormationMatrixSummaryRow): string {
    const level = this.formationSummaryReadLevel(row);
    switch (level) {
      case 'strong': return 'Ventaja clara';
      case 'solid': return 'Solida';
      case 'tradeoff': return 'Tradeoff';
      case 'review': return 'Revisar';
      default: return 'Neutra';
    }
  }
  formationSummaryReadClass(row: FormationMatrixSummaryRow): string {
    const level = this.formationSummaryReadLevel(row);
    if (level === 'strong' || level === 'solid') return 'read-strong';
    if (level === 'tradeoff') return 'read-visible';
    if (level === 'review') return 'read-check';
    return 'read-stable';
  }
  formationSummaryReadDetail(row: FormationMatrixSummaryRow): string {
    const attackShape = `${this.fmtXg(row.avgShapeAttackVolumeMultiplier)} atkVol`;
    const defenseShape = `${this.fmtXg(row.avgShapeDefensiveResistanceMultiplier)} defRes`;
    const attackChannels = `Atk L/C/R ${this.fmtXg(row.avgShapeAttackLeft)}/${this.fmtXg(row.avgShapeAttackCenter)}/${this.fmtXg(row.avgShapeAttackRight)}`;
    const defenseChannels = `Def L/C/R ${this.fmtXg(row.avgShapeDefenseLeft)}/${this.fmtXg(row.avgShapeDefenseCenter)}/${this.fmtXg(row.avgShapeDefenseRight)}`;
    return [
      this.formationSummaryRead(row),
      `xG ${this.fmtXg(row.avgXgFor)} / xGA ${this.fmtXg(row.avgXgAgainst)} / diff ${this.fmtDeltaNumber(row.avgXgDiff)}`,
      `shots ${this.fmtXg(row.avgShotsFor)} / ag ${this.fmtXg(row.avgShotsAgainst)}`,
      `poss ${this.fmtPct(row.avgPossessionFor)}`,
      `${attackShape}; ${defenseShape}`,
      attackChannels,
      defenseChannels,
    ].join(' · ');
  }
  private toFormationCoachPick(label: string, row: FormationMatrixSummaryRow): FormationCoachPick {
    const read = this.formationSummaryRead(row);
    const detail = [
      `xG ${this.fmtXg(row.avgXgFor)} / ${this.fmtXg(row.avgXgAgainst)}`,
      `diff ${this.fmtDeltaNumber(row.avgXgDiff)}`,
      `tiros ${this.fmtXg(row.avgShotsFor)} / ${this.fmtXg(row.avgShotsAgainst)}`,
      `posesion ${this.fmtPct(row.avgPossessionFor)}`,
    ].join(' · ');
    return {
      label,
      formation: row.formation,
      read,
      detail,
      identity: this.formationSummaryIdentity(row),
      cssClass: this.formationSummaryReadClass(row),
    };
  }
  formationSummaryIdentity(row: FormationMatrixSummaryRow): string {
    const ownChannel = this.formationSummaryOwnChannel(row);
    const opponentChannel = this.formationSummaryOpponentChannel(row);
    const profile = this.formationSummaryProfile(row);
    return `${profile} · ${ownChannel} · ${opponentChannel}`;
  }
  private formationSummaryOwnChannel(row: FormationMatrixSummaryRow): string {
    const totalShots = row.avgCentralShotsFor + row.avgWideShotsFor + row.avgLongShotsFor;
    const centralShare = this.safeRatio(row.avgCentralShotsFor, totalShots);
    const wideShare = this.safeRatio(row.avgWideShotsFor, totalShots);
    const leftWideXg = row.avgLeftWideXgFor ?? 0;
    const rightWideXg = row.avgRightWideXgFor ?? 0;
    const wideXg = leftWideXg + rightWideXg;
    const strongestWideXg = Math.max(leftWideXg, rightWideXg);
    const wideSideGap = Math.abs(leftWideXg - rightWideXg);
    const xgSide = leftWideXg >= rightWideXg ? 'izquierda' : 'derecha';
    const wideXgSignal = strongestWideXg >= 0.12
      && (wideXg >= 0.28 || wideXg >= row.avgXgFor * 0.24 || wideSideGap >= 0.05);
    const centralLean = row.avgShapeAttackCenter - Math.max(row.avgShapeAttackLeft, row.avgShapeAttackRight);
    const wideLean = Math.max(row.avgShapeAttackLeft, row.avgShapeAttackRight) - row.avgShapeAttackCenter;
    const side = row.avgShapeAttackLeft >= row.avgShapeAttackRight ? 'izquierda' : 'derecha';
    if (wideXgSignal) return wideSideGap >= 0.05 ? `ataca por banda ${xgSide}` : 'ataca por bandas';
    if (centralLean >= 0.16 || centralShare >= 0.52) return 'ataca por centro';
    if (wideShare >= 0.26 && Math.max(row.avgShapeAttackLeft, row.avgShapeAttackRight) >= 0.60) {
      return `ataque mixto con banda ${side}`;
    }
    if (wideLean >= 0.10 || wideShare >= 0.40) return `ataca por banda ${side}`;
    return 'ataque repartido';
  }
  private formationSummaryOpponentChannel(row: FormationMatrixSummaryRow): string {
    const totalShots = row.avgCentralShotsAgainst + row.avgWideShotsAgainst + row.avgLongShotsAgainst;
    const centralShare = this.safeRatio(row.avgCentralShotsAgainst, totalShots);
    const wideShare = this.safeRatio(row.avgWideShotsAgainst, totalShots);
    const leftWideXg = row.avgLeftWideXgAgainst ?? 0;
    const rightWideXg = row.avgRightWideXgAgainst ?? 0;
    const wideXg = leftWideXg + rightWideXg;
    const strongestWideXg = Math.max(leftWideXg, rightWideXg);
    const wideSideGap = Math.abs(leftWideXg - rightWideXg);
    const strongestWideSide = leftWideXg >= rightWideXg ? 'izquierda' : 'derecha';
    const wideXgSignal = strongestWideXg >= 0.10
      && (wideXg >= 0.24 || wideXg >= row.avgXgAgainst * 0.20 || wideSideGap >= 0.045);
    const weakestWideDefense = Math.min(row.avgShapeDefenseLeft, row.avgShapeDefenseRight);
    const centerGap = row.avgShapeDefenseCenter <= weakestWideDefense - 0.10;
    const wideGap = weakestWideDefense <= row.avgShapeDefenseCenter - 0.10;
    const side = row.avgShapeDefenseLeft <= row.avgShapeDefenseRight ? 'izquierda' : 'derecha';
    if (wideXgSignal) return wideSideGap >= 0.045 ? `riesgo por banda ${strongestWideSide}` : 'riesgo por bandas';
    if (centerGap || centralShare >= 0.50) return 'riesgo por centro';
    if (wideGap || wideShare >= 0.42) return `riesgo por banda ${side}`;
    return 'riesgo repartido';
  }
  private formationSummaryProfile(row: FormationMatrixSummaryRow): string {
    const readLevel = this.formationSummaryReadLevel(row);
    const sterile = row.avgXgFor <= 0.75 && row.avgShotsFor <= 13.0;
    if (readLevel === 'review' && sterile) return 'bloque esteril';
    if (row.avgXgFor >= 0.90 && row.avgXgAgainst <= 0.85 && row.avgXgDiff >= 0.18) return 'plan completo';
    if (row.avgXgFor >= 0.95 || row.avgShapeAttackVolumeMultiplier >= 1.08) return 'plan ofensivo';
    if (row.avgXgAgainst <= 0.70 || row.avgShapeDefensiveResistanceMultiplier <= 0.84) return 'plan seguro';
    if (readLevel === 'tradeoff') return 'plan de contexto';
    return 'plan neutro';
  }
  private safeRatio(value: number, total: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return value / total;
  }
  private formationSummaryReadLevel(row: FormationMatrixSummaryRow): 'neutral' | 'solid' | 'strong' | 'tradeoff' | 'review' {
    const rows = this.formationMatrixSummaryResults();
    const bestXgDiff = rows.length > 0 ? Math.max(...rows.map((candidate) => candidate.avgXgDiff)) : row.avgXgDiff;
    const bestXga = rows.length > 0 ? Math.min(...rows.map((candidate) => candidate.avgXgAgainst)) : row.avgXgAgainst;
    const relativeDiffGap = bestXgDiff - row.avgXgDiff;
    const relativeXgaGap = row.avgXgAgainst - bestXga;
    const strongResult = row.avgXgDiff >= 0.20 && row.avgShotDiff >= 1.0;
    const solidResult = row.avgXgDiff >= 0.06 && row.avgXgAgainst <= 1.15;
    const lowBlockProfile = row.avgShapeAttackVolumeMultiplier <= 0.92
      && row.avgShapeDefensiveResistanceMultiplier <= 0.88;
    const overExposed = row.avgXgAgainst >= 1.30
      || (row.avgShotsAgainst >= 18.0 && row.avgXgAgainst >= 1.12);
    const bluntAttack = row.avgXgFor <= 0.75 && row.avgShotsFor <= 13.0;
    const sterileLowBlock = bluntAttack && row.avgXgDiff <= -0.45 && row.avgXgAgainst <= 1.15;
    const controlledDefense = row.avgXgAgainst <= 1.05
      || row.avgShapeDefensiveResistanceMultiplier <= 0.82;
    const acceptableAbsoluteResult = row.avgXgDiff >= -0.35 && row.avgXgAgainst <= 1.25;
    const bestOfBadResult = row.avgXgDiff < -0.75 || row.avgXgAgainst >= 1.35;
    const objectivelyBad = row.avgXgAgainst >= 1.80 || row.avgXgDiff <= -1.50;
    if (strongResult) return 'strong';
    if (sterileLowBlock) return 'review';
    if (relativeDiffGap <= 0.12 && relativeXgaGap <= 0.35) {
      return acceptableAbsoluteResult ? 'solid' : 'tradeoff';
    }
    if (bestOfBadResult && (relativeDiffGap <= 0.35 || relativeXgaGap <= 0.45)) return 'tradeoff';
    if (relativeDiffGap <= 0.35 && (relativeXgaGap <= 0.75 || row.avgShotDiff >= -9.0)) return 'tradeoff';
    if (objectivelyBad) return 'review';
    if (overExposed && lowBlockProfile) return 'review';
    if (overExposed && relativeDiffGap >= 0.90) return 'review';
    if (lowBlockProfile && controlledDefense && bluntAttack) return 'tradeoff';
    if (solidResult || (controlledDefense && row.avgXgDiff >= -0.05)) return 'solid';
    if (bluntAttack && row.avgXgAgainst <= 1.12) return 'tradeoff';
    return 'neutral';
  }
  trackByScenarioMatrix(_index: number, row: ScenarioMatrixRow): string {
    return row.scenario;
  }
  trackByScenarioMatrixSummary(_index: number, row: ScenarioMatrixSummaryRow): string {
    return row.scenario;
  }
  trackByScenarioBattery(_index: number, row: ScenarioBatteryRow): string {
    return `${row.matchId}:${row.controlledSide}:${row.seedStart}:${row.seedCount}`;
  }
  trackBySwapSlotOption(_index: number, option: PlayerSwapSlotOption): string {
    return option.playerId;
  }
  trackBySwapBenchOption(_index: number, option: PlayerSwapBenchOption): string {
    return option.playerId;
  }
  trackByPlayerSwapSummary(_index: number, summary: PlayerSwapMatrixSummary): string {
    return `${summary.slotId}:${summary.baselinePlayer}:${summary.swapPlayer}:${summary.seedStart}:${summary.seedEnd}`;
  }
  trackByPlayerSwapPrecisionComparison(_index: number, row: PlayerSwapPrecisionComparisonRow): string {
    return row.candidateKey;
  }
  readonly trackByPositionPixelRow = (_index: number, row: PositionPixelMatrixSummary): string => {
    return this.positionPixelRowKey(row);
  };
  readonly trackByRoleSlotImpactRow = (_index: number, row: RoleSlotImpactSummaryRow): string => {
    return `${row.slotId}:${row.testedNaturalPosition}:${row.seedStart}:${row.seedCount}`;
  };
  readonly trackByRoleSlotImpactSmokeRow = (_index: number, row: RoleSlotImpactSmokeRow): string => {
    return row.slotId;
  };
  readonly trackByAllFormationRoleSlotSmokeRow = (_index: number, row: AllFormationRoleSlotSmokeRow): string => {
    return row.formation;
  };
  private roleSlotOptionsFromLineup(lineup: LineupDTO): { slotId: string; label: string }[] {
    const playerById = new Map((lineup.players ?? []).map((player) => [player.playerId, player]));
    return this.buildLineupSlots(lineup).map((slot) => {
      const player = playerById.get(slot.playerId);
      return {
        slotId: slot.subdivisionId,
        label: `${slot.subdivisionId} · ${player?.name ?? slot.playerId} (${player?.position ?? '?'})`,
      };
    });
  }
  private toRoleSlotImpactSmokeRow(
    slot: { slotId: string; label: string },
    rows: RoleSlotImpactSummaryRow[]
  ): RoleSlotImpactSmokeRow {
    if (rows.length === 0) {
      return {
        slotId: slot.slotId,
        player: slot.label,
        bestRole: '?',
        bestEff: 0,
        worstRole: '?',
        worstEff: 0,
        gap: 0,
        verdict: 'Sin datos',
        className: 'read-check',
      };
    }
    const best = rows.reduce((acc, row) => row.playerEffectiveness > acc.playerEffectiveness ? row : acc, rows[0]);
    const worst = rows.reduce((acc, row) => row.playerEffectiveness < acc.playerEffectiveness ? row : acc, rows[0]);
    const gap = best.playerEffectiveness - worst.playerEffectiveness;
    const verdict = gap >= 0.45 ? 'OK claro' : gap >= 0.25 ? 'OK visible' : 'Revisar peso';
    const className = gap >= 0.45 ? 'delta-positive' : gap >= 0.25 ? 'read-stable' : 'read-check';
    return {
      slotId: slot.slotId,
      player: best.baselinePlayerName || slot.label,
      bestRole: best.testedNaturalPosition,
      bestEff: best.playerEffectiveness,
      worstRole: worst.testedNaturalPosition,
      worstEff: worst.playerEffectiveness,
      gap,
      verdict,
      className,
    };
  }
  private emptyAllFormationRoleSlotSmokeRow(
    formation: FormationCode,
    verdict: string
  ): AllFormationRoleSlotSmokeRow {
    return {
      formation,
      slots: 0,
      clear: 0,
      visible: 0,
      review: 1,
      minGap: 0,
      avgGap: 0,
      weakestSlot: '-',
      verdict,
      className: 'delta-negative',
    };
  }
  private toAllFormationRoleSlotSmokeRow(
    formation: FormationCode,
    rows: RoleSlotImpactSmokeRow[]
  ): AllFormationRoleSlotSmokeRow {
    if (rows.length === 0) {
      return this.emptyAllFormationRoleSlotSmokeRow(formation, 'Sin datos');
    }
    const clear = rows.filter((row) => row.verdict === 'OK claro').length;
    const visible = rows.filter((row) => row.verdict === 'OK visible').length;
    const review = rows.length - clear - visible;
    const min = rows.reduce((acc, row) => row.gap < acc.gap ? row : acc, rows[0]);
    const totalGap = rows.reduce((acc, row) => acc + row.gap, 0);
    const avgGap = totalGap / rows.length;
    const verdict = review > 0
      ? 'Revisar'
      : clear >= Math.ceil(rows.length * 0.55)
        ? 'OK fuerte'
        : 'OK visible';
    const className = verdict === 'OK fuerte'
      ? 'delta-positive'
      : verdict === 'OK visible'
        ? 'read-stable'
        : 'read-check';
    return {
      formation,
      slots: rows.length,
      clear,
      visible,
      review,
      minGap: min.gap,
      avgGap,
      weakestSlot: `${min.slotId} ${min.player} (${min.verdict})`,
      verdict,
      className,
    };
  }
  roleSlotImpactFitRead(row: RoleSlotImpactSummaryRow): string {
    if (row.playerEffectiveness >= 0.85) return 'rol natural / ideal';
    if (row.playerEffectiveness >= 0.68) return 'sirve, no ideal';
    if (row.playerEffectiveness >= 0.45) return 'improvisado';
    return 'fuera de rol grave';
  }
  roleSlotImpactFitClass(row: RoleSlotImpactSummaryRow): string {
    if (row.playerEffectiveness >= 0.85) return 'delta-positive';
    if (row.playerEffectiveness >= 0.68) return 'read-stable';
    if (row.playerEffectiveness >= 0.45) return 'read-check';
    return 'delta-negative';
  }
  roleSlotImpactSlotHint(): string {
    const option = this.roleSlotImpactAvailableSlotOptions().find((candidate) => candidate.slotId === this.roleSlotImpactSlotIdModel);
    if (!option) return 'Elegí un slot táctico';
    if (option.kind === 'wideAtt') return 'Compara extremo natural vs improvisados';
    if (option.kind === 'att') return 'Compara delantero vs extremos/medios/defensas';
    if (option.kind === 'mid') return 'Compara mediocentro vs atacante/defensor';
    return 'Compara defensor natural vs improvisados';
  }
  roleSlotImpactNaturalPositionsForSlot(slotId: string): string[] {
    const kind = this.roleSlotImpactKindForSlot(slotId);
    if (kind === 'wideAtt') return ['RW', 'LW', 'WINGER', 'ATT', 'CAM', 'MID', 'DEF'];
    if (kind === 'att') return ['ST', 'CF', 'ATT', 'WINGER', 'CAM', 'MID', 'DEF'];
    if (kind === 'mid') return ['CM', 'MID', 'CDM', 'CAM', 'WINGER', 'ATT', 'DEF'];
    return ['CB', 'DEF', 'LB', 'RB', 'CDM', 'MID', 'ATT', 'WINGER'];
  }
  roleSlotImpactKindForSlot(slotId: string): 'wideAtt' | 'att' | 'mid' | 'def' {
    const preset = this.roleSlotImpactSlotOptions.find((option) => option.slotId === slotId)?.kind;
    if (preset) return preset;
    const y = this.subdivisionYPercent(slotId);
    if (typeof y === 'number') {
      if (y <= 35) {
        const x = this.subdivisionXPercent(slotId) ?? 50;
        return typeof x === 'number' && Math.abs(x - 50) >= 28 ? 'wideAtt' : 'att';
      }
      if (y <= 68) return 'mid';
    }
    return 'def';
  }
  roleSlotImpactCoachRead(): string {
    const rows = this.roleSlotImpactRows();
    if (rows.length === 0) return '';
    const best = rows.reduce((acc, row) => row.playerEffectiveness > acc.playerEffectiveness ? row : acc, rows[0]);
    const worst = rows.reduce((acc, row) => row.playerEffectiveness < acc.playerEffectiveness ? row : acc, rows[0]);
    const gap = best.playerEffectiveness - worst.playerEffectiveness;
    if (gap >= 0.45) {
      return `Lectura: ${best.testedNaturalPosition} encaja muchísimo mejor que ${worst.testedNaturalPosition}; el slot no es cosmético.`;
    }
    if (gap >= 0.20) {
      return `Lectura: hay diferencia visible entre roles; conviene mirar xG/tiros para decidir si está calibrado.`;
    }
    return 'Lectura: señal suave; revisar si este slot necesita más peso en el motor.';
  }
  trackByLineupDebugRow(_index: number, row: LineupDebugRow): string {
    return row.playerId || `${row.index}-${row.slotId}`;
  }
  lineupDebugScopeLabel(debug: LineupDebugSnapshot): string {
    if (debug.visualLineFilter === 'LAST_MODAL_MOVE') {
      return 'foco: último jugador movido';
    }
    if (debug.visualLineFilter === 'any') {
      return 'foco: formación auditada';
    }
    if (debug.visualLineFilter && debug.visualLineFilter !== 'ALL') {
      return `foco: línea ${debug.visualLineFilter}`;
    }
    return 'foco: XI completo';
  }
  trackByFormationLineSmokeRow(_index: number, row: FormationLineSmokeRow): string {
    return `${row.formation}-${row.line}`;
  }
  trackByProfessionalQaChecklistRow(_index: number, row: ProfessionalQaChecklistRow): string {
    return row.check;
  }
  professionalQaChecklistTestId(check: string): string {
    return `qa-check-${check.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  }
  professionalQaVerdictClass(verdict: ProfessionalQaChecklistRow['verdict']): string {
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
  professionalQaActionLabel(check: string): string {
    switch (check) {
      case 'All formations audit':
        return 'Correr all formations audit';
      case 'Defensive side mapping':
      case '3-4-1-2 spine':
      case 'Wide-role scarcity':
        return 'Correr formation audit';
      case 'Pixel movement signal':
        return 'Correr full position smoke';
      case 'Pixel no-cliff rule':
        return 'Correr sensitivity check';
      case 'Player swap signal':
        return 'Correr player swap battery';
      default:
        return 'Sin acción directa';
    }
  }
  professionalQaActionEnabled(check: string): boolean {
    if (this.mutationInFlight()) return false;
    switch (check) {
      case 'All formations audit':
      case 'Defensive side mapping':
      case '3-4-1-2 spine':
      case 'Wide-role scarcity':
        return !!this.userTeamName();
      case 'Pixel movement signal':
      case 'Pixel no-cliff rule':
      case 'Player swap signal':
        return !!this.selectedMatchId();
      default:
        return false;
    }
  }
  professionalQaActionStatus(check: string): ProfessionalQaActionStatus | null {
    return this.professionalQaActionStatuses()[check] ?? null;
  }
  professionalQaActionStatusClass(state: ProfessionalQaActionStatus['state']): string {
    return `qa-action-status-${state}`;
  }
  onRunProfessionalQaAction(check: string): void {
    if (!this.professionalQaActionEnabled(check)) {
      this.snackBar.open('Seleccioná un partido o esperá a que termine la acción actual.', 'OK', { duration: 3000 });
      return;
    }
    this.setProfessionalQaActionStatus(check, {
      state: 'running',
      message: 'En curso...',
    });
    switch (check) {
      case 'All formations audit':
        this.onRunAllFormationsLineAudit();
        this.watchProfessionalQaActionCompletion(check);
        return;
      case 'Defensive side mapping':
      case '3-4-1-2 spine':
      case 'Wide-role scarcity':
        this.onRunCurrentFormationLineAudit();
        this.watchProfessionalQaActionCompletion(check);
        return;
      case 'Pixel movement signal':
        this.onRunFullPositionSmokeBoard();
        this.watchProfessionalQaActionCompletion(check);
        return;
      case 'Pixel no-cliff rule':
        this.onRunPositionSensitivityCheck();
        this.watchProfessionalQaActionCompletion(check);
        return;
      case 'Player swap signal':
        this.onRunPlayerSwapBattery();
        this.watchProfessionalQaActionCompletion(check);
        return;
      default:
        this.snackBar.open('Este check todavía no tiene acción directa.', 'OK', { duration: 3000 });
    }
  }
  onRunProfessionalQaChecklist(): void {
    if (this.qaChecklistRunningAll() || this.mutationInFlight()) return;
    this.ensureProfessionalQaChecklistMatch();
    const queue = [
      'All formations audit',
      'Pixel movement signal',
      'Pixel no-cliff rule',
      'Player swap signal',
    ];
    this.qaChecklistRunningAll.set(true);
    window.setTimeout(() => this.runProfessionalQaChecklistQueue(queue, 0), 250);
  }
  private ensureProfessionalQaChecklistMatch(): void {
    const selectedId = this.selectedMatchId();
    const userMatches = this.userTeamMatches();
    const selectedStillExists = selectedId
      ? userMatches.some((candidate) => candidate.matchId === selectedId)
      : false;
    if (selectedId && selectedStillExists && this.selectedMatchIncludesUserTeam()) {
      return;
    }
    const match =
      userMatches.find((candidate) => String(candidate.status).toUpperCase() === 'COMPLETED') ??
      this.scenarioBatteryCandidateMatches()[0] ??
      null;
    if (!match) {
      return;
    }
    this.selectMatch(match);
  }
  private runProfessionalQaChecklistQueue(queue: string[], index: number): void {
    if (index >= queue.length) {
      this.ensureProfessionalQaPixelEvidenceStatuses();
      this.qaChecklistRunningAll.set(false);
      this.snackBar.open('Checklist QA completo.', 'OK', { duration: 3500 });
      return;
    }
    const check = queue[index];
    if (check !== 'All formations audit') {
      this.ensureProfessionalQaChecklistMatch();
    }
    if (!this.professionalQaActionEnabled(check)) {
      this.setProfessionalQaActionStatus(check, {
        state: 'error',
        message: check === 'All formations audit'
          ? 'Pendiente: falta carrera/equipo.'
          : 'Pendiente: seleccioná un partido.',
      });
      this.runProfessionalQaChecklistQueue(queue, index + 1);
      return;
    }
    this.onRunProfessionalQaAction(check);
    this.waitProfessionalQaChecklistStep(check, () => this.runProfessionalQaChecklistQueue(queue, index + 1));
  }
  private waitProfessionalQaChecklistStep(check: string, next: () => void): void {
    window.setTimeout(() => {
      const status = this.professionalQaActionStatus(check);
      if (this.mutationInFlight() || status?.state === 'running') {
        this.waitProfessionalQaChecklistStep(check, next);
        return;
      }
      this.ensureProfessionalQaEvidenceStatus(check);
      next();
    }, 500);
  }
  private ensureProfessionalQaPixelEvidenceStatuses(): void {
    for (const check of ['Pixel movement signal', 'Pixel no-cliff rule']) {
      this.ensureProfessionalQaEvidenceStatus(check);
    }
  }
  private ensureProfessionalQaEvidenceStatus(check: string): void {
    if (!['Pixel movement signal', 'Pixel no-cliff rule'].includes(check)) {
      return;
    }
    const checklistRow = this.professionalQaChecklistRows().find((row) => row.check === check);
    if (checklistRow?.verdict === 'OK') {
      return;
    }
    const diagnostics = this.lastPositionPixelRunDiagnostics();
    const responseDiagnostics = this.lastPositionPixelResponseDiagnostics();
    const mappedRowsFromDiagnostics = Number(responseDiagnostics?.match(/mapped=(\d+)/)?.[1] ?? 0);
    const mappedRows = Math.max(this.positionPixelMatrixRows().length, this.lastPositionPixelMappedRows(), mappedRowsFromDiagnostics);
    if (mappedRows > 0) {
      this.positionPixelEvidenceNote.set(null);
      this.setProfessionalQaActionStatus(check, {
        state: checklistRow?.verdict === 'Review' ? 'error' : 'done',
        message: checklistRow?.verdict === 'Review'
          ? `Hay ${mappedRows} filas mapeadas, pero sin señal suficiente; revisar sensibilidad/seeds. ${responseDiagnostics ?? ''}`
          : `${mappedRows} filas mapeadas con contrato válido. ${responseDiagnostics ?? ''}`,
      });
      return;
    }
    const note = diagnostics
      ? `${check}: terminó sin evidencia numérica. ${diagnostics} ${responseDiagnostics ?? ''} Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`
      : `${check}: terminó sin evidencia numérica. Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`;
    if (!this.positionPixelEvidenceNote()) {
      this.positionPixelEvidenceNote.set(note);
    }
    this.setProfessionalQaActionStatus(check, {
      state: 'error',
      message: checklistRow?.verdict === 'Review'
        ? 'Revisión necesaria: el resultado no cumple contrato OK.'
        : 'Sin evidencia nueva: revisar si este check produjo filas.',
    });
  }
  private setProfessionalQaActionStatus(check: string, status: ProfessionalQaActionStatus): void {
    const checklistRow = status.state === 'done'
      ? this.professionalQaChecklistRows().find((row) => row.check === check)
      : null;
    const pixelDoneWithoutRows = status.state === 'done'
      && ['Pixel movement signal', 'Pixel no-cliff rule'].includes(check)
      && this.positionPixelMatrixRows().length === 0;
    if (pixelDoneWithoutRows && !this.positionPixelEvidenceNote()) {
      this.positionPixelEvidenceNote.set(`${check}: terminó sin evidencia numérica. Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`);
    }
    const pixelDoneWithoutOk = status.state === 'done'
      && ['Pixel movement signal', 'Pixel no-cliff rule'].includes(check)
      && checklistRow?.verdict !== 'OK';
    const safeStatus: ProfessionalQaActionStatus = checklistRow?.verdict === 'Pending' || pixelDoneWithoutRows || pixelDoneWithoutOk
      ? {
          state: 'error',
          message: 'Sin evidencia nueva: revisar si este check produjo filas.',
        }
      : status;
    this.professionalQaActionStatuses.update((statuses) => ({
      ...statuses,
      [check]: safeStatus,
    }));
  }
  private watchProfessionalQaActionCompletion(check: string): void {
    window.setTimeout(() => {
      if (this.mutationInFlight()) {
        this.watchProfessionalQaActionCompletion(check);
        return;
      }
      const message = this.analysisReadyMessage() ?? 'Acción finalizada.';
      const failed = /fall[oó]|failed|error/i.test(message);
      const checklistRow = this.professionalQaChecklistRows().find((row) => row.check === check);
      const missingEvidence = !failed && checklistRow?.verdict === 'Pending';
      this.setProfessionalQaActionStatus(check, {
        state: failed || missingEvidence ? 'error' : 'done',
        message: failed
          ? 'Falló: revisar mensaje del panel.'
          : missingEvidence
            ? 'Sin evidencia nueva: revisar si este check produjo filas.'
            : 'Listo: diagnóstico actualizado.',
      });
    }, 350);
  }
  currentLineupMultiSeedReadable(summary: CurrentLineupMultiSeedSummary): string {
    return `${summary.seedCount} seeds · ${summary.formation || '?'} · score ${this.fmtXg(summary.avgGoalsFor)}-${this.fmtXg(summary.avgGoalsAgainst)} · poss ${this.fmtPct(summary.avgPossessionFor)}`;
  }
  currentLineupMultiSeedSignal(summary: CurrentLineupMultiSeedSummary): string {
    const xg = summary.avgXgDiff;
    const shots = summary.avgShotDiff;
    if (xg >= 0.20 && shots >= 0.5) {
      return 'Señal positiva';
    }
    if (xg <= -0.20 && shots <= -0.5) {
      return 'Señal negativa';
    }
    if (Math.abs(xg) < 0.10 && Math.abs(shots) < 0.5) {
      return 'Partido parejo';
    }
    return 'Señal mixta';
  }
  trackByLineupDiagnosticTeam(_index: number, team: LineupDiagnosticTeam): string {
    return team.teamId;
  }
  trackByLineupDiagnosticPlayer(_index: number, player: LineupDiagnosticPlayer): string {
    return player.playerId;
  }
  lineupDiagnosticTeams(diagnostic: LineupDiagnostic): LineupDiagnosticTeam[] {
    return [diagnostic.home, diagnostic.away];
  }
  lineupDiagnosticCoord(player: LineupDiagnosticPlayer): string {
    if (typeof player.xPercent !== 'number' || typeof player.yPercent !== 'number') {
      return 'slot';
    }
    return `${player.xPercent.toFixed(0)}/${player.yPercent.toFixed(0)}`;
  }
  lineupDiagnosticSource(player: LineupDiagnosticPlayer): string {
    switch (player.positionSource) {
      case 'modal-custom':
        return 'Modal custom';
      case 'persisted-slot':
        return 'Slot guardado';
      case 'canonical':
        return 'Formacion';
      default:
        return 'Sin fuente';
    }
  }
  lineupAssignmentVerdictClass(verdict: string | null | undefined): string {
    if (verdict === 'OK') return 'assignment-verdict assignment-ok';
    if (verdict === 'Revisar lado' || verdict === 'Revisar rol') return 'assignment-verdict assignment-review';
    return 'assignment-verdict assignment-neutral';
  }
  lineupWidthVerdictClass(verdict: string | null | undefined): string {
    if (verdict === 'OK') return 'width-ok';
    if (verdict === 'Parcial' || verdict === 'Estrecha') return 'width-partial';
    return 'width-review';
  }
  fmtPctCoord(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : '-';
  }
  positionPixelVisualLineLabel(yPercent: number): string {
    if (yPercent >= 32 && yPercent <= 36) return 'ATT/MID';
    if (yPercent >= 65 && yPercent <= 69) return 'MID/DEF';
    return this.positionPixelVisualLine(yPercent);
  }
  positionPixelVisualChannelLabel(xPercent: number): string {
    return this.positionPixelChannelLabel(this.positionPixelVisualChannel(xPercent));
  }
  selectedStyleLabel(): string {
    return this.teamStyleOptions.find((o) => o.value === this.selectedStyleModel)?.label ?? this.selectedStyleModel;
  }
  selectedStyleHint(): string {
    return this.teamStyleOptions.find((o) => o.value === this.selectedStyleModel)?.hint ?? '';
  }
  playerSwapBatteryModeHint(): string {
    if (this.playerSwapBatteryModeModel === 'stress') return 'Busca swaps fuera de rol para testear limites.';
    if (this.playerSwapBatteryModeModel === 'mixed') return 'Permite cambios naturales y experimentos.';
    return 'Prioriza mismo perfil o misma linea.';
  }
  playerSwapBatteryPrecisionHint(): string {
    const seeds = this.playerSwapBatteryEffectiveSeedCount();
    if (this.playerSwapBatteryModeModel === 'stress' && this.playerSwapBatteryPrecisionModel === 'quick') {
      return `${seeds} seeds - Stress test usa minimo 10 para evitar ruido.`;
    }
    if (this.playerSwapBatteryPrecisionModel === 'reliable') return `${seeds} seeds - High confidence para calibracion fina.`;
    if (this.playerSwapBatteryPrecisionModel === 'balanced') return `${seeds} seeds - Medium confidence, recomendado para decidir tuning.`;
    return `${seeds} seeds - Low confidence, solo smoke exploratorio.`;
  }
  playerSwapBatteryConfidenceLabel(seedCount = this.playerSwapSeedCountModel): string {
    if (seedCount >= 30) return 'High confidence';
    if (seedCount >= 10) return 'Medium confidence';
    return 'Low confidence';
  }
  private playerSwapBatteryPrecisionSeedCount(precision: typeof this.playerSwapBatteryPrecisionModel): number {
    if (precision === 'reliable') return 30;
    if (precision === 'balanced') return 10;
    return 3;
  }
  private playerSwapBatteryEffectiveSeedCount(): number {
    const baseSeedCount = this.playerSwapBatteryPrecisionSeedCount(this.playerSwapBatteryPrecisionModel);
    return this.playerSwapBatteryModeModel === 'stress' ? Math.max(10, baseSeedCount) : baseSeedCount;
  }
  playerSwapBatteryCounterText(counts: Record<string, number>): string {
    const entries = Object.entries(counts).filter(([, count]) => count > 0);
    return entries.length > 0 ? entries.map(([label, count]) => `${count} ${label}`).join(` ${String.fromCharCode(183)} `) : 'sin datos';
  }
  playerSwapBatteryBestWorstText(row: PlayerSwapMatrixSummary | null): string {
    if (!row) return 'sin datos';
    return `${row.baselinePlayer} -> ${row.swapPlayer} (${this.fmtDeltaNumber(row.deltaXgDiff)} xG diff, ${row.swapFit})`;
  }
  styleShort(style: TeamStyle | null): string {
    if (!style) {
      return '-';
    }
    return this.teamStyleOptions.find((o) => o.value === style)?.label ?? style;
  }
  controlledTeamSideHint(): string {
    const match = this.selectedMatch();
    if (!match) {
      return 'Elegí un partido para probar escenarios.';
    }
    if (this.controlledTeamSideModel === 'HOME') {
      return `Controlando local: ${match.homeTeamName}`;
    }
    if (this.controlledTeamSideModel === 'AWAY') {
      return `Controlando visitante: ${match.awayTeamName}`;
    }
    return this.selectedMatchIncludesUserTeam()
      ? `Controlando mi equipo: ${this.userTeamName() || 'usuario'}`
      : 'Mi equipo no juega este partido; eleg? Local o Visitante.';
  }
  onControlledTeamSideChanged(value: ControlledTeamSide): void {
    const match = this.selectedMatch();
    if (value === 'USER' && match && !this.selectedMatchIncludesUserTeam()) {
      this.controlledTeamSideModel = 'HOME';
      this.analysisReadyMessage.set('Mi equipo no juega este partido; dejé el control en Local. Podés elegir Visitante manualmente.');
      return;
    }
    if (!match) {
      return;
    }
    this.clearReplayAnalysisResultsForLatestRun();
    this.analysisReadyMessage.set(`Control cambiado a ${this.controlledTeamDisplayName()}. Corré de nuevo la matriz/smoke para regenerar Panel E.`);
  }
  controlledTeamDisplayName(): string {
    const match = this.selectedMatch();
    if (!match) {
      return this.userTeamName() || 'Sin partido';
    }
    if (this.controlledTeamSideModel === 'HOME') {
      return `${match.homeTeamName} (local)`;
    }
    if (this.controlledTeamSideModel === 'AWAY') {
      return `${match.awayTeamName} (visitante)`;
    }
    return `${this.userTeamName() || 'Mi equipo'} (mi equipo)`;
  }
  private resolveControlledSideForMatch(match: TestHarnessMatchRow): Exclude<ControlledTeamSide, 'USER'> {
    if (this.controlledTeamSideModel === 'HOME' || this.controlledTeamSideModel === 'AWAY') {
      return this.controlledTeamSideModel;
    }
    const userTeam = this.userTeamName();
    return userTeam && match.awayTeamName === userTeam ? 'AWAY' : 'HOME';
  }
  private effectiveControlledSide(): Exclude<ControlledTeamSide, 'USER'> {
    const match = this.selectedMatch();
    return match ? this.resolveControlledSideForMatch(match) : 'HOME';
  }
  canRunScenarioSummaryForControlledSide(): boolean {
    return this.controlledTeamSideModel === 'USER'
      ? this.selectedMatchIncludesUserTeam()
      : this.selectedMatchId() !== null;
  }
  canRunUserLineupAudit(): boolean {
    return !!this.userTeamName() && this.controlledTeamSideModel === 'USER';
  }
  userLineupAuditDisabledReason(): string {
    if (!this.userTeamName()) {
      return 'Necesitás una carrera con equipo de usuario para auditar el lineup editable.';
    }
    if (this.controlledTeamSideModel !== 'USER') {
      return 'Este audit usa el lineup editable de Mi equipo. Para Local/Visitante usá Formation matrix o Formation avg.';
    }
    return 'Audita el lineup editable de Mi equipo.';
  }
  scenarioBatteryScopeHint(): string {
    const available = this.scenarioBatteryCandidateMatches().length;
    const limit = this.scenarioBatteryMatchLimit();
    const suffix = available < limit
      ? ` Hoy hay ${available}/${limit} partidos completados disponibles.`
      : ` ${available}/${limit} partidos disponibles.`;
    return this.scenarioBatteryScopeModel === 'balanced'
      ? `Media: hasta 4 partidos x Local/Visitante.${suffix}`
      : `Rapida: hasta 2 partidos x Local/Visitante.${suffix}`;
  }
  scenarioBatteryCoachObjectiveHint(): string {
    switch (this.scenarioBatteryCoachObjectiveModel) {
      case 'AUTO':
        return this.scenarioBatteryAutoObjectiveHint();
      case 'NEED_GOAL':
        return 'Prioriza upside ofensivo aunque abra espacios.';
      case 'PROTECT_RESULT':
        return 'Prioriza bajar riesgo y evitar intercambios.';
      default:
        return 'Lectura equilibrada para partido abierto.';
    }
  }
  private scenarioBatteryAutoObjectiveHint(): string {
    const match = this.selectedMatch();
    if (!match) {
      return 'Auto: usa resultado y minuto; sin partido seleccionado, lectura equilibrada.';
    }
    const side = this.resolveControlledSideForMatch(match);
    const objective = this.inferScenarioBatteryCoachObjective(match, side);
    const label = this.scenarioBatteryCoachObjectiveLabel(objective);
    const minute = this.scenarioBatteryDecisionMinute(match);
    const goalDiff = this.scenarioBatteryGoalDiff(match, side);
    const pressure = this.scenarioBatteryContextPressure(match, side);
    const diffText = goalDiff === null
      ? 'marcador desconocido'
      : goalDiff > 0
        ? `ganando por ${goalDiff}`
        : goalDiff < 0
          ? `perdiendo por ${Math.abs(goalDiff)}`
          : 'empatado';
    return `Auto: ${label} (${diffText}, min ${minute}, ${pressure.label}).`;
  }
  private scenarioBatteryEffectiveCoachObjective(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): ScenarioBatteryCoachObjective {
    return this.scenarioBatteryCoachObjectiveModel === 'AUTO'
      ? this.inferScenarioBatteryCoachObjective(match, controlledSide)
      : this.scenarioBatteryCoachObjectiveModel;
  }
  private inferScenarioBatteryCoachObjective(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>,
    minute = this.scenarioBatteryDecisionMinute(match)
  ): ScenarioBatteryCoachObjective {
    const goalDiff = this.scenarioBatteryGoalDiff(match, controlledSide);
    if (goalDiff === null) {
      return 'NEUTRAL';
    }
    const pressure = this.scenarioBatteryContextPressure(match, controlledSide);
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
  private scenarioBatteryContextPressure(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): { label: string; reputationDelta: number; away: boolean; strongThreshold: number; tired: boolean; fresh: boolean } {
    const ownName = controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName;
    const rivalName = controlledSide === 'HOME' ? match.awayTeamName : match.homeTeamName;
    const ownStrength = controlledSide === 'HOME' ? match.homeStrength : match.awayStrength;
    const rivalStrength = controlledSide === 'HOME' ? match.awayStrength : match.homeStrength;
    const ownRating = this.scenarioBatteryTeamRating(ownName, ownStrength ?? null);
    const rivalRating = this.scenarioBatteryTeamRating(rivalName, rivalStrength ?? null);
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
    const condition = this.scenarioBatteryTeamCondition(ownStrength ?? null);
    return {
      label: `${venue}/${level}/${source}/${condition.label}`,
      reputationDelta,
      away,
      strongThreshold,
      tired: condition.tired,
      fresh: condition.fresh,
    };
  }
  private scenarioBatteryCoachContext(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): { summary: string; detail: string } {
    const ownName = controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName;
    const rivalName = controlledSide === 'HOME' ? match.awayTeamName : match.homeTeamName;
    const ownStrength = controlledSide === 'HOME' ? match.homeStrength : match.awayStrength;
    const rivalStrength = controlledSide === 'HOME' ? match.awayStrength : match.homeStrength;
    const pressure = this.scenarioBatteryContextPressure(match, controlledSide);
    const ownRating = this.scenarioBatteryTeamRating(ownName, ownStrength ?? null);
    const rivalRating = this.scenarioBatteryTeamRating(rivalName, rivalStrength ?? null);
    const ownEnergy = this.scenarioBatteryMetricText(ownStrength?.avgEnergy, 'EN');
    const ownForm = this.scenarioBatteryMetricText(ownStrength?.avgForm, 'FOR');
    const ownStamina = this.scenarioBatteryMetricText(ownStrength?.avgStamina, 'STA');
    const matchState = this.scenarioBatteryMatchStateText(match, controlledSide);
    const source = ownRating.source === 'strength' && rivalRating.source === 'strength' ? 'OVR real' : 'fallback nombre';
    const summary = `${matchState.summary} ? ${pressure.label} ? OVR ${ownRating.value}-${rivalRating.value} ? ${ownEnergy}`;
    const detail = [
      `${ownName} vs ${rivalName}`,
      `Partido: ${matchState.detail}`,
      `Contexto: ${pressure.label}`,
      `Fuente: ${source}`,
      `OVR propio/rival: ${ownRating.value}/${rivalRating.value}`,
      `Condicion propia: ${ownEnergy}, ${ownForm}, ${ownStamina}`,
      `Plantel propio: ${this.scenarioBatterySquadText(ownStrength ?? null)}`,
      `Plantel rival: ${this.scenarioBatterySquadText(rivalStrength ?? null)}`,
    ].join(' ? ');
    return { summary, detail };
  }
  private scenarioBatteryMetricText(value: number | null | undefined, label: string): string {
    return value === null || value === undefined ? `${label} ?` : `${label} ${Math.round(value)}`;
  }
  private scenarioBatteryMatchStateText(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): { summary: string; detail: string } {
    const minute = this.scenarioBatteryDecisionMinute(match);
    const homeGoals = match.homeGoals;
    const awayGoals = match.awayGoals;
    const score = homeGoals === null || homeGoals === undefined || awayGoals === null || awayGoals === undefined
      ? 'marcador ?'
      : `${homeGoals}-${awayGoals}`;
    const goalDiff = this.scenarioBatteryGoalDiff(match, controlledSide);
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
  private scenarioBatterySquadText(strength: TestHarnessMatchRow['homeStrength'] | null): string {
    if (!strength) return 'sin strength';
    const squad = strength.squadOvr ?? '?';
    const starters = strength.startingOvr ?? '?';
    const size = strength.squadSize ?? '?';
    const starterCount = strength.starterCount ?? '?';
    return `squadOvr ${squad}, startingOvr ${starters}, squad ${size}, XI ${starterCount}`;
  }
  private scenarioBatteryTeamCondition(
    strength: TestHarnessMatchRow['homeStrength'] | null
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
  private scenarioBatteryTeamRating(
    teamName: string,
    strength: TestHarnessMatchRow['homeStrength'] | null
  ): { value: number; source: 'strength' | 'name' } {
    const realRating = strength?.startingOvr ?? strength?.squadOvr;
    return realRating !== null && realRating !== undefined
      ? { value: realRating, source: 'strength' }
      : { value: this.scenarioBatteryTeamReputation(teamName), source: 'name' };
  }
  private scenarioBatteryTeamReputation(teamName: string): number {
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
  private scenarioBatteryGoalDiff(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): number | null {
    if (match.homeGoals === null || match.awayGoals === null) {
      return null;
    }
    return controlledSide === 'HOME'
      ? match.homeGoals - match.awayGoals
      : match.awayGoals - match.homeGoals;
  }
  private scenarioBatteryDecisionMinute(match: TestHarnessMatchRow): number {
    const selected = this.selectedMinute();
    if (selected > 0) {
      return selected;
    }
    return String(match.status).toUpperCase() === 'COMPLETED' ? 75 : 45;
  }
  scenarioBatteryCoachObjectiveLabel(objective: ScenarioBatteryCoachObjective): string {
    switch (objective) {
      case 'NEED_GOAL':
        return 'Necesito gol';
      case 'PROTECT_RESULT':
        return 'Cuidar resultado';
      default:
        return 'Neutral';
    }
  }
  scenarioBatteryGroupHint(): string {
    switch (this.scenarioBatteryGroupModel) {
      case 'ALL':
        return 'Todo: ataque, defensa y lectura del rival.';
      case 'DEFENSE':
        return 'Defensa: mide proteccion, riesgos y cierres.';
      case 'OPPONENT':
        return 'Rival: mide por donde nos puede atacar.';
      default:
        return 'Ataque: mide canales, forma y riesgo ofensivo.';
    }
  }
  scenarioBatteryCoverageHint(): string {
    const readings = this.scenarioBatteryRows().length;
    const seeds = this.scenarioMatrixSmokeSeedCount();
    const coverage = readings > 0 ? `${readings} lecturas x ${seeds} seeds` : `${seeds} seeds`;
    const availableMatches = this.scenarioBatteryCandidateMatches().length;
    const targetMatches = this.scenarioBatteryMatchLimit();
    if (this.scenarioBatteryScopeModel === 'balanced' && availableMatches < targetMatches) {
      return `Cobertura limitada: ${coverage}; faltan partidos completados para decidir tendencias.`;
    }
    return this.scenarioBatteryScopeModel === 'balanced'
      ? `Cobertura media: ${coverage}; usar para decidir tendencias.`
      : `Cobertura smoke: ${coverage}; usar para detectar senales, no para cerrar balance.`;
  }
  scenarioBatteryReviewCount(): number {
    return this.scenarioBatteryRows().filter((row) => row.review.startsWith('Revisar')).length;
  }
  scenarioBatteryReviewHint(): string {
    const rows = this.scenarioBatteryRows();
    if (rows.length === 0) {
      return 'Revision pendiente: corre Battery tablero.';
    }
    const reviewCount = this.scenarioBatteryReviewCount();
    if (reviewCount === 0) {
      return `Revision OK: ${rows.length}/${rows.length} lecturas coherentes.`;
    }
    const labels = Array.from(new Set(rows
      .filter((row) => row.review.startsWith('Revisar'))
      .map((row) => row.review)
    ));
    const sample = labels.slice(0, 2).join(' + ');
    const suffix = labels.length > 2 ? ` +${labels.length - 2}` : '';
    return `Revision: ${reviewCount}/${rows.length} para mirar (${sample}${suffix}).`;
  }
  scenarioBatteryReviewItems(): ScenarioBatteryReviewItem[] {
    return this.scenarioBatteryRows()
      .filter((row) => row.review.startsWith('Revisar'))
      .slice(0, 5)
      .map((row) => ({
        key: `${row.matchId}-${row.controlledSide}-${row.review}`,
        summary: `${row.review}: ${row.controlledTeam} vs ${row.matchLabel}`,
        detail: `${row.coachContext} ? ${row.decision} ? ${row.reviewDetail}`,
      }));
  }
  trackByScenarioBatteryReviewItem(_: number, item: ScenarioBatteryReviewItem): string {
    return item.key;
  }
  scenarioBatteryGroupLabel(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): string {
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
  scenarioBatteryMatchLimit(): number {
    return this.scenarioBatteryScopeModel === 'balanced' ? 4 : 2;
  }
  private styleLabelFromActionDetail(actionDetail: string | null | undefined): string | null {
    if (!actionDetail) {
      return null;
    }
    const normalized = actionDetail.trim().toUpperCase();
    const option = this.teamStyleOptions.find((o) => o.value === normalized);
    return option?.label ?? null;
  }
  private scenarioActionLabel(actionDetail: string | null | undefined): string | null {
    if (!actionDetail) {
      return null;
    }
    const detail = actionDetail.trim();
    const normalized = detail.toUpperCase();
    if (normalized.startsWith('OPPONENT ')) {
      const opponentStyle = normalized.replace(/^OPPONENT\s+/, '');
      const label = this.styleLabelFromActionDetail(opponentStyle);
      return label ? `Rival: ${label.toLowerCase()}` : `Rival: ${detail.replace(/^Opponent\s+/i, '')}`;
    }
    const ownStyle = this.styleLabelFromActionDetail(detail);
    if (ownStyle) {
      return ownStyle;
    }
    const shapeLabel = this.scenarioShapeActionLabel(detail);
    if (shapeLabel) {
      return shapeLabel;
    }
    return detail;
  }
  private scenarioShapeActionLabel(actionDetail: string): string | null {
    const normalized = actionDetail.trim().toLowerCase();
    if (normalized.startsWith('right-overload')) return 'Sobrecarga derecha';
    if (normalized.startsWith('left-overload')) return 'Sobrecarga izquierda';
    if (normalized.startsWith('wide-overload')) return 'Amplitud ofensiva';
    if (normalized.startsWith('compact-center')) return 'Cerrar el centro';
    if (normalized.startsWith('attacking-high')) return 'Ataque alto';
    if (normalized.startsWith('attacking-step')) return 'Paso ofensivo';
    if (normalized.startsWith('defensive-step')) return 'Paso defensivo';
    if (normalized.startsWith('defensive-low')) return 'Bloque bajo';
    if (normalized.startsWith('central-compact')) return 'Bloque compacto';
    return null;
  }
  actionLabel(row: ScenarioMatrixRow): string {
    if (row.actionType === 'STYLE') {
      return this.styleShort(row.changedStyle);
    }
    if (row.actionType === 'FORMATION') {
      return row.actionDetail || 'Formation';
    }
    if (row.actionType === 'POSITION') {
      return row.actionDetail || 'Position';
    }
    if (row.actionType === 'NOOP_REPLAY') {
      return row.actionDetail || 'Replay sin cambio';
    }
    if (row.actionType === 'SUBSTITUTION') {
      return row.actionDetail || 'Substitution';
    }
    return 'Base';
  }
  summaryActionLabel(row: ScenarioMatrixSummaryRow): string {
    if (row.actionType === 'NONE') {
      return 'Base';
    }
    if (row.actionType === 'STYLE') {
      return this.scenarioActionLabel(row.actionDetail) ?? 'Estilo';
    }
    return this.scenarioActionLabel(row.actionDetail) ?? (row.actionDetail || row.actionType);
  }
  scenarioSummaryBaseFormation(): string {
    const row = this.scenarioMatrixSummaryResults()
      .find((item) => !!item.baselineFormation);
    return row?.baselineFormation || '';
  }
  scenarioSummaryIsFormationNoop(row: ScenarioMatrixSummaryRow): boolean {
    return row.actionType === 'FORMATION' && !!row.sameFormationAsBaseline;
  }
  scenarioSummaryFormationLabel(row: ScenarioMatrixSummaryRow): string {
    const base = row.baselineFormation || '';
    const changed = row.changedFormation || (row.actionType === 'FORMATION' ? row.actionDetail : '');
    if (row.actionType !== 'FORMATION') return base || 'â€”';
    if (this.scenarioSummaryIsFormationNoop(row)) return `${base} = ${changed || base}`;
    return `${base || 'base'} â†’ ${changed || row.actionDetail || 'sin dato'}`;
  }
  scenarioSummaryFormationHint(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) {
      return 'La formación del escenario coincide con la formación base; se interpreta como control/no-op, no como fallo del motor.';
    }
    if (row.actionType === 'FORMATION') {
      return `Cambio de formación: ${row.baselineFormation || 'base'} â†’ ${row.changedFormation || row.actionDetail || 'sin dato'}`;
    }
    return row.baselineFormation
      ? `Formación base: ${row.baselineFormation}`
      : 'Sin cambio de formación en este escenario.';
  }
  scenarioSummaryRead(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) return 'Baseline/no-op';
    const level = this.scenarioSummaryReadLevel(row);
    if (level === 'review') return 'Review';
    if (level === 'strong') return 'Strong';
    if (level === 'visible') return 'Visible';
    if (level === 'small') return 'Small signal';
    return 'Noise';
  }
  scenarioSummaryReadLevel(row: ScenarioMatrixSummaryRow): ScenarioSummaryReadLevel {
    if (this.scenarioSummaryIsFormationNoop(row)) return 'noise';
    const score = this.scenarioSummaryImpactScore(row);
    const check = this.scenarioSummaryNeedsReview(row);
    if (check) return 'review';
    if (score >= 3.0) return 'strong';
    if (score >= 1.35) return 'visible';
    if (this.scenarioSummaryCoherentSubstitutionSignal(row)) return 'small';
    if (score >= 0.65) return 'small';
    return 'noise';
  }
  scenarioSummaryReadClass(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) return 'read-noise';
    const level = this.scenarioSummaryReadLevel(row);
    if (level === 'review') return 'read-check';
    if (level === 'strong') return 'read-strong';
    if (level === 'visible') return 'read-visible';
    if (level === 'small') return 'read-stable';
    return 'delta-neutral';
  }
  scenarioSummaryReadSeverity(row: ScenarioMatrixSummaryRow): number {
    const level = this.scenarioSummaryReadLevel(row);
    if (level === 'review') return 5;
    if (level === 'strong') return 4;
    if (level === 'visible') return 3;
    if (level === 'small') return 2;
    return 1;
  }
  scenarioSummaryReadReason(row: ScenarioMatrixSummaryRow): string {
    const parts = [
      `impact ${this.scenarioSummaryImpactScore(row).toFixed(2)}`,
      `xG ${this.fmtDeltaNumber(row.avgUserXgDelta)}`,
      `xGA ${this.fmtDeltaNumber(row.avgOpponentXgDelta)}`,
      `shots ${this.fmtDeltaNumber(row.avgUserShotsDelta)}/${this.fmtDeltaNumber(row.avgOpponentShotsDelta)}`,
      `poss ${this.fmtDeltaNumber(row.avgUserPossessionDelta)}pp`,
    ];
    if (this.scenarioSummaryNeedsReview(row)) {
      parts.unshift('Opposite/noisy sign for labelled substitution');
    }
    return parts.join(' ? ');
  }
  scenarioSummaryOutcome(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) return 'Baseline/no-op';
    if (this.scenarioSummaryReadLevel(row) === 'noise') return 'Neutral';
    if (row.scenario.startsWith('m45-opponent-')) {
      const defensiveGain = this.scenarioSummaryDefensiveGainScore(row);
      const defensiveRisk = this.scenarioSummaryDefensiveRiskScore(row);
      const wideChannelExposure = Math.max(row.avgOpponentLeftWideXgDelta, row.avgOpponentRightWideXgDelta);
      const centralExposure = row.avgOpponentCentralXgDelta;
      const wideContained = Math.min(row.avgOpponentLeftWideXgDelta, row.avgOpponentRightWideXgDelta);
      const channelExposure = Math.max(wideChannelExposure, centralExposure);
      if (channelExposure >= 0.10 && row.avgOpponentXgDelta >= 0.04) return 'Exposure';
      if (channelExposure >= 0.08) return 'Channel shift';
      if (wideContained <= -0.08 || centralExposure <= -0.08) return 'Contained';
      if (defensiveRisk >= 1.15 && row.avgOpponentXgDelta >= 0.04) return 'Exposure';
      if (defensiveGain >= 1.15) return 'Contained';
      return 'Neutral';
    }
    const attackGain = this.scenarioSummaryAttackGainScore(row);
    const attackLoss = this.scenarioSummaryAttackLossScore(row);
    const defensiveGain = this.scenarioSummaryDefensiveGainScore(row);
    const defensiveRisk = this.scenarioSummaryDefensiveRiskScore(row);
    if (attackGain >= 1.15 && defensiveGain >= 0.85) return 'Upgrade';
    if (attackLoss >= 1.15 && defensiveRisk >= 0.85) return 'Downgrade';
    if (attackGain >= 1.0 && defensiveRisk >= 0.8) return 'Tradeoff';
    if (defensiveGain >= 1.0 && attackLoss >= 0.8) return 'Tradeoff';
    if (attackGain >= 1.15 || defensiveGain >= 1.15) return 'Lean up';
    if (attackLoss >= 1.15 || defensiveRisk >= 1.15) return 'Risk';
    return 'Neutral';
  }
  scenarioSummaryOutcomeClass(row: ScenarioMatrixSummaryRow): string {
    const outcome = this.scenarioSummaryOutcome(row);
    if (outcome === 'Baseline/no-op') return 'read-noise';
    if (outcome === 'Upgrade' || outcome === 'Lean up') return 'read-visible';
    if (outcome === 'Contained') return 'read-visible';
    if (outcome === 'Channel shift') return 'read-visible';
    if (outcome === 'Tradeoff') return 'read-strong';
    if (outcome === 'Downgrade' || outcome === 'Risk' || outcome === 'Exposure') return 'read-check';
    return 'read-stable';
  }
  scenarioSummaryOutcomeReason(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) {
      return `Misma formación que la base: ${row.baselineFormation || '?'} = ${row.changedFormation || row.actionDetail || '?'}`;
    }
    return [
      `attack gain ${this.scenarioSummaryAttackGainScore(row).toFixed(2)}`,
      `attack loss ${this.scenarioSummaryAttackLossScore(row).toFixed(2)}`,
      `defensive gain ${this.scenarioSummaryDefensiveGainScore(row).toFixed(2)}`,
      `defensive risk ${this.scenarioSummaryDefensiveRiskScore(row).toFixed(2)}`,
    ].join(' ? ');
  }
  scenarioSummaryCoachRead(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) {
      return `formacion: misma que la base (${row.baselineFormation || row.changedFormation || row.actionDetail || '?'})`;
    }
    const attackGain = this.scenarioSummaryAttackGainScore(row);
    const attackLoss = this.scenarioSummaryAttackLossScore(row);
    const defensiveGain = this.scenarioSummaryDefensiveGainScore(row);
    const defensiveRisk = this.scenarioSummaryDefensiveRiskScore(row);
    const userChannel = this.scenarioSummaryUserChannelRead(row);
    const opponentChannel = this.scenarioSummaryOpponentChannelRead(row);
    const prefix = this.scenarioSummaryCoachReadPrefix(row);
    if (row.scenario.startsWith('m45-opponent-')) {
      const strongestOpponentChannel = Math.max(
        row.avgOpponentCentralXgDelta,
        row.avgOpponentLeftWideXgDelta,
        row.avgOpponentRightWideXgDelta
      );
      if ((defensiveRisk >= 0.85 || row.avgOpponentXgDelta > 0.04) && row.avgOpponentXgDelta >= 0.04) {
        return `${prefix}: rival amenaza ${opponentChannel}`;
      }
      if (strongestOpponentChannel >= 0.08) return `${prefix}: rival cambia canal ${opponentChannel}`;
      if (defensiveGain >= 0.85 || row.avgOpponentXgDelta < -0.04) return `${prefix}: rival contenido ${opponentChannel}`;
      return `${prefix}: ${opponentChannel}`;
    }
    if (this.scenarioSummaryReadLevel(row) === 'noise') {
      return userChannel !== 'sin canal claro' ? `${prefix}: leve ${userChannel}` : `${prefix}: sin senal fuerte`;
    }
    if (attackGain >= 1.15 && defensiveRisk >= 0.9) return `${prefix}: mas ataque, mas riesgo (${userChannel})`;
    if (defensiveGain >= 1.15 && attackLoss >= 0.9) return `${prefix}: mas seguro, menos ataque (${opponentChannel})`;
    if (attackGain >= 1.15) return `${prefix}: gana ataque ${userChannel}`;
    if (attackLoss >= 1.15) return `${prefix}: pierde ataque ${userChannel}`;
    if (defensiveRisk >= 1.15) return `${prefix}: abre riesgo ${opponentChannel}`;
    if (defensiveGain >= 1.15) return `${prefix}: protege mejor ${opponentChannel}`;
    return `${prefix}: ${userChannel} / ${opponentChannel}`;
  }
  private scenarioSummaryCoachReadPrefix(row: ScenarioMatrixSummaryRow): string {
    if (row.actionType === 'FORMATION') return 'formacion';
    if (row.actionType === 'STYLE') return 'estilo';
    if (row.actionType === 'SUBSTITUTION') return 'cambio';
    if (row.actionType === 'POSITION') {
      return this.isScenarioShapeAction(row.actionDetail) ? 'forma' : 'posicion';
    }
    if (this.isOpponentScenarioRow(row)) return 'rival';
    if (row.actionType === 'NOOP_REPLAY' || row.actionType === 'NONE') return 'base';
    return 'escenario';
  }
  private isScenarioShapeAction(actionDetail: string | null | undefined): boolean {
    return !!actionDetail && !!this.scenarioShapeActionLabel(actionDetail);
  }
  scenarioSummaryCoachReadDetail(row: ScenarioMatrixSummaryRow): string {
    return [
      this.scenarioSummaryCoachRead(row),
      `usuario: ${this.scenarioSummaryUserChannelRead(row)}`,
      `rival: ${this.scenarioSummaryOpponentChannelRead(row)}`,
      `xG ${this.fmtDeltaNumber(row.avgUserXgDelta)} / xGA ${this.fmtDeltaNumber(row.avgOpponentXgDelta)}`,
      `shots ${this.fmtDeltaNumber(row.avgUserShotsDelta)} / ag ${this.fmtDeltaNumber(row.avgOpponentShotsDelta)}`,
      `wide L/R rival xG ${this.fmtDeltaNumber(row.avgOpponentLeftWideXgDelta)} / ${this.fmtDeltaNumber(row.avgOpponentRightWideXgDelta)}`,
    ].join(' ? ');
  }
  scenarioSummaryRecommendation(row: ScenarioMatrixSummaryRow): string {
    if (this.scenarioSummaryIsFormationNoop(row)) return 'Control/no-op';
    const level = this.scenarioSummaryReadLevel(row);
    const outcome = this.scenarioSummaryOutcome(row);
    const prefix = this.scenarioSummaryCoachReadPrefix(row);
    if (level === 'noise') return 'No decidir con esto';
    if (level === 'review') return 'Revisar con mas seeds';
    if (outcome === 'Upgrade') return prefix === 'rival' ? 'Plan rival peligroso' : 'Usar como plan A';
    if (outcome === 'Lean up') return prefix === 'rival' ? 'Vigilar ese canal' : 'Usar si necesitas empujar';
    if (outcome === 'Contained') return 'Usar para proteger';
    if (outcome === 'Channel shift') return 'Usar para cambiar foco';
    if (outcome === 'Tradeoff') return 'Usar solo por contexto';
    if (outcome === 'Downgrade') return 'Evitar salvo urgencia';
    if (outcome === 'Risk' || outcome === 'Exposure') return 'Evitar si defendes';
    return 'Senal leve: confirmar';
  }
  scenarioSummaryRecommendationClass(row: ScenarioMatrixSummaryRow): string {
    const recommendation = this.scenarioSummaryRecommendation(row);
    if (recommendation === 'Control/no-op') return 'read-noise';
    if (recommendation.startsWith('Usar como plan A') || recommendation.startsWith('Usar para proteger')) return 'read-visible';
    if (recommendation.startsWith('Usar si') || recommendation.startsWith('Usar para cambiar') || recommendation.startsWith('Plan rival')) return 'read-visible';
    if (recommendation.startsWith('Usar solo') || recommendation.startsWith('Revisar') || recommendation.startsWith('Vigilar')) return 'read-check';
    if (recommendation.startsWith('Evitar')) return 'read-strong';
    return 'read-stable';
  }
  scenarioSummaryRecommendationDetail(row: ScenarioMatrixSummaryRow): string {
    return [
      this.scenarioSummaryRecommendation(row),
      `lectura: ${this.scenarioSummaryRead(row)}`,
      `resultado: ${this.scenarioSummaryOutcome(row)}`,
      this.scenarioSummaryCoachReadDetail(row),
    ].join(' ? ');
  }
  private scenarioDecisionCardFromRow(
    title: string,
    row: ScenarioMatrixSummaryRow,
    className: string,
    detail: string,
  ): ScenarioDecisionCard {
    return {
      title,
      label: this.summaryActionLabel(row),
      metrics: this.scenarioDecisionMetrics(title, row),
      detail,
      className,
    };
  }
  private scenarioDecisionMetrics(title: string, row: ScenarioMatrixSummaryRow): string {
    if (title === 'Amenaza rival' || this.isOpponentScenarioRow(row)) {
      return `xGA ${this.fmtDeltaNumber(row.avgOpponentXgDelta)} / canal ${this.fmtDeltaNumber(this.scenarioOpponentMaxChannelXgDelta(row))} / ${this.scenarioDecisionConfidence(row)}`;
    }
    return `xG ${this.fmtDeltaNumber(row.avgUserXgDelta)} / xGA ${this.fmtDeltaNumber(row.avgOpponentXgDelta)} / ${this.scenarioDecisionConfidence(row)}`;
  }
  private isOpponentScenarioRow(row: ScenarioMatrixSummaryRow): boolean {
    return row.scenario.startsWith('m45-opponent-') || row.actionType === 'OPPONENT_STYLE';
  }
  private scenarioActionKey(row: ScenarioMatrixSummaryRow): string {
    return `${row.actionType}:${row.actionDetail || row.scenario}`;
  }
  private scenarioTwoWayScore(row: ScenarioMatrixSummaryRow): number {
    return Math.max(0, row.avgUserXgDelta) + Math.max(0, -row.avgOpponentXgDelta);
  }
  private scenarioDecisionConfidence(row: ScenarioMatrixSummaryRow): string {
    const level = this.scenarioSummaryReadLevel(row);
    if (level === 'strong' || level === 'review') return 'fuerte';
    if (level === 'visible') return 'media';
    if (level === 'small') return 'leve';
    return 'marginal';
  }
  private scenarioProtectionCandidateIsCoachWorthy(row: ScenarioMatrixSummaryRow): boolean {
    const looksLikeSubstitution = row.actionType === 'SUBSTITUTION'
      || (row.actionDetail ?? '').includes('->')
      || this.summaryActionLabel(row).includes('->');
    if (!looksLikeSubstitution) {
      return true;
    }
    const defensiveImpact = Math.max(0, -row.avgOpponentXgDelta);
    const shotImpact = Math.max(0, -row.avgOpponentShotsDelta);
    return defensiveImpact >= 0.045 && (shotImpact >= 0.25 || defensiveImpact >= 0.065);
  }
  private buildScenarioBatteryRow(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>,
    scenarioGroup: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT',
    seedStart: number,
    seedCount: number,
    rows: ScenarioMatrixSummaryRow[]
  ): ScenarioBatteryRow {
    const cards = this.buildScenarioDecisionCards(rows);
    const coachObjective = this.scenarioBatteryEffectiveCoachObjective(match, controlledSide);
    const coachContext = this.scenarioBatteryCoachContext(match, controlledSide);
    const decision = this.scenarioBatteryDecision(cards, coachObjective);
    const review = this.scenarioBatteryDecisionReview(coachObjective, decision.label, cards);
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
  private scenarioBatteryDecision(
    cards: ScenarioDecisionCard[],
    objective: ScenarioBatteryCoachObjective = 'NEUTRAL'
  ): { label: string; detail: string } {
    const card = (title: string) => cards.find((item) => item.title === title);
    const twoWay = card('Doble ganancia');
    if (twoWay) {
      return {
        label: `Aprovechar: ${twoWay.label}`,
        detail: `${twoWay.label} da doble ganancia. ${twoWay.metrics}. ${twoWay.detail}`,
      };
    }
    const protect = card('Cuidar');
    const threat = card('Amenaza rival');
    const offensiveRisk = card('Riesgo ofensivo');
    const avoid = card('Evitar');
    if (objective === 'PROTECT_RESULT') {
      if (protect) {
        return {
          label: `Cerrar partido: ${protect.label}`,
          detail: `${protect.label} es la mejor proteccion para cuidar resultado. ${protect.metrics}. ${protect.detail}`,
        };
      }
      if (threat) {
        return {
          label: `Cerrar amenaza: ${threat.label}`,
          detail: `${threat.label} es la amenaza principal si estas cuidando el partido. ${threat.metrics}. ${threat.detail}`,
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
          detail: `${avoid.label} abre riesgo y no conviene si estas protegiendo resultado. ${avoid.metrics}. ${avoid.detail}`,
        };
      }
    }
    const attack = card('Atacar');
    if (objective === 'NEED_GOAL' && offensiveRisk) {
      return {
        label: `Riesgo asumible: ${offensiveRisk.label}`,
        detail: `${offensiveRisk.label} mejora el ataque y puede valer la pena si necesitas gol. Ojo: abre espacios. ${offensiveRisk.metrics}. ${offensiveRisk.detail}`,
      };
    }
    if (attack) {
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
        detail: `${protect.label} es la mejor proteccion detectada. ${protect.metrics}. ${protect.detail}`,
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
        detail: `${offensiveRisk.label} mejora el ataque pero abre espacios. Usarlo si necesitas gol o aceptas intercambio. ${offensiveRisk.metrics}. ${offensiveRisk.detail}`,
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
      detail: 'No hay una senal suficientemente clara para recomendar un cambio de DT en esta bateria.',
    };
  }
  private scenarioBatteryDecisionReview(
    objective: ScenarioBatteryCoachObjective,
    decisionLabel: string,
    cards: ScenarioDecisionCard[]
  ): { label: string; detail: string } {
    const has = (title: string) => cards.some((card) => card.title === title);
    const starts = (...prefixes: string[]) => prefixes.some((prefix) => decisionLabel.startsWith(prefix));
    if (objective === 'NEED_GOAL') {
      if (starts('Cerrar partido', 'Cerrar amenaza', 'Proteger', 'No forzar', 'No arriesgar', 'Mantener equipo')) {
        return {
          label: 'Revisar: poco gol',
          detail: `El objetivo es buscar gol, pero la decision fue "${decisionLabel}". Revisar si faltan escenarios ofensivos claros o si el motor penaliza demasiado el riesgo.`,
        };
      }
      if (!has('Atacar') && !has('Riesgo ofensivo') && !has('Doble ganancia')) {
        return {
          label: 'Revisar: sin via',
          detail: 'El objetivo es buscar gol, pero la bateria no encontro Atacar, Riesgo ofensivo ni Doble ganancia. Puede ser correcto si no hay buen cambio, pero conviene auditar.',
        };
      }
    }
    if (objective === 'PROTECT_RESULT') {
      if (starts('Atacar', 'Riesgo alto', 'Riesgo asumible', 'Aprovechar')) {
        return {
          label: 'Revisar: mucho riesgo',
          detail: `El objetivo es cuidar resultado, pero la decision fue "${decisionLabel}". Revisar si el escenario abre demasiado xGA o si falta una alternativa defensiva mejor.`,
        };
      }
      if (!has('Cuidar') && !has('Amenaza rival') && !has('Evitar') && !has('Riesgo ofensivo')) {
        return {
          label: 'Revisar: sin cierre',
          detail: 'El objetivo es cuidar resultado, pero la bateria no encontro Cuidar, Amenaza rival, Evitar ni una accion ofensiva para descartar. Puede faltar cobertura defensiva en los escenarios.',
        };
      }
    }
    if (objective === 'NEUTRAL' && starts('Riesgo alto')) {
      return {
        label: 'Revisar: riesgo neutral',
        detail: `El objetivo es neutral y la decision fue "${decisionLabel}". Puede estar bien, pero conviene revisar si el beneficio ofensivo compensa el riesgo.`,
      };
    }
    return {
      label: 'OK',
      detail: `La decision "${decisionLabel}" es consistente con el objetivo ${this.scenarioBatteryCoachObjectiveLabel(objective)} y las senales disponibles.`,
    };
  }
  scenarioBatteryCardSummary(row: ScenarioBatteryRow, title: string): string {
    const card = row.cards.find((item) => item.title === title);
    return card ? `${card.label} ? ${card.metrics}` : '-';
  }
  scenarioBatteryCardDetail(row: ScenarioBatteryRow, title: string): string {
    const card = row.cards.find((item) => item.title === title);
    return card ? card.detail : 'Sin senal clara en esta bateria.';
  }
  scenarioBatteryRiskCardSummary(row: ScenarioBatteryRow): string {
    const card = row.cards.find((item) => item.title === 'Riesgo ofensivo')
      ?? row.cards.find((item) => item.title === 'Evitar');
    return card ? `${card.label} Ãƒâ€š? ${card.metrics}` : '-';
  }
  scenarioBatteryRiskCardDetail(row: ScenarioBatteryRow): string {
    const card = row.cards.find((item) => item.title === 'Riesgo ofensivo')
      ?? row.cards.find((item) => item.title === 'Evitar');
    return card ? card.detail : 'Sin riesgo claro en esta bateria.';
  }
  private scenarioBatteryExportRow(row: ScenarioBatteryRow): Record<string, unknown> {
    const summary = (title: string) => this.scenarioBatteryCardSummary(row, title);
    const detail = (title: string) => this.scenarioBatteryCardDetail(row, title);
    return {
      match: row.matchLabel,
      controlledTeam: row.controlledTeam,
      controlledSide: row.controlledSide,
      scenarioGroup: this.scenarioBatteryGroupLabel(row.scenarioGroup),
      coachObjective: this.scenarioBatteryCoachObjectiveLabel(row.coachObjective),
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
      avoid: this.scenarioBatteryRiskCardSummary(row),
      opponentThreat: summary('Amenaza rival'),
      planDetail: detail('Plan actual'),
      twoWayDetail: detail('Doble ganancia'),
      attackDetail: detail('Atacar'),
      shapeDetail: detail('Forma'),
      protectDetail: detail('Cuidar'),
      avoidDetail: this.scenarioBatteryRiskCardDetail(row),
      opponentThreatDetail: detail('Amenaza rival'),
    };
  }
  private scenarioOpponentMaxChannelXgDelta(row: ScenarioMatrixSummaryRow): number {
    return Math.max(
      row.avgOpponentCentralXgDelta,
      row.avgOpponentLeftWideXgDelta,
      row.avgOpponentRightWideXgDelta,
    );
  }
  private scenarioOpponentMinChannelXgDelta(row: ScenarioMatrixSummaryRow): number {
    return Math.min(
      row.avgOpponentCentralXgDelta,
      row.avgOpponentLeftWideXgDelta,
      row.avgOpponentRightWideXgDelta,
    );
  }
  private scenarioOpponentRiskRead(row: ScenarioMatrixSummaryRow): string {
    const channels = [
      { label: 'centro', value: row.avgOpponentCentralXgDelta },
      { label: 'banda izquierda', value: row.avgOpponentLeftWideXgDelta },
      { label: 'banda derecha', value: row.avgOpponentRightWideXgDelta },
    ].sort((a, b) => b.value - a.value);
    const top = channels[0];
    if (top.value >= 0.025) {
      return `rival amenaza por ${top.label} (${this.fmtDeltaNumber(top.value)} xG canal)`;
    }
    return this.scenarioSummaryOpponentChannelRead(row);
  }
  private scenarioOpponentProtectionRead(row: ScenarioMatrixSummaryRow): string {
    const channels = [
      { label: 'centro', value: row.avgOpponentCentralXgDelta },
      { label: 'banda izquierda', value: row.avgOpponentLeftWideXgDelta },
      { label: 'banda derecha', value: row.avgOpponentRightWideXgDelta },
    ].sort((a, b) => a.value - b.value);
    const best = channels[0];
    if (best.value <= -0.025) {
      return `rival contenido por ${best.label} (${this.fmtDeltaNumber(best.value)} xG canal)`;
    }
    return this.scenarioSummaryOpponentChannelRead(row);
  }
  private scenarioSummaryUserChannelRead(row: ScenarioMatrixSummaryRow): string {
    const central = row.avgUserCentralXgDelta;
    const wide = row.avgUserWideXgDelta;
    const left = row.avgUserLeftWideXgDelta;
    const right = row.avgUserRightWideXgDelta;
    const bestWideSide = Math.abs(left) >= Math.abs(right) ? 'izquierda' : 'derecha';
    const bestWideValue = Math.abs(left) >= Math.abs(right) ? left : right;
    if (Math.abs(central) >= Math.abs(wide) && Math.abs(central) >= 0.025) {
      return central > 0 ? 'mas peligro por centro' : 'menos peligro por centro';
    }
    if (Math.abs(wide) >= 0.025) {
      if (Math.abs(bestWideValue) >= 0.018) {
        return bestWideValue > 0 ? `mas peligro por banda ${bestWideSide}` : `menos peligro por banda ${bestWideSide}`;
      }
      return wide > 0 ? 'mas peligro por bandas' : 'menos peligro por bandas';
    }
    if (Math.abs(row.avgUserCentralDelta) > Math.abs(row.avgUserWideDelta) && Math.abs(row.avgUserCentralDelta) >= 0.5) {
      return row.avgUserCentralDelta > 0 ? 'mas volumen por centro' : 'menos volumen por centro';
    }
    if (Math.abs(row.avgUserWideDelta) >= 0.5) {
      return row.avgUserWideDelta > 0 ? 'mas volumen por bandas' : 'menos volumen por bandas';
    }
    return 'sin canal claro';
  }
  private scenarioSummaryOpponentChannelRead(row: ScenarioMatrixSummaryRow): string {
    const central = row.avgOpponentCentralXgDelta;
    const wide = row.avgOpponentWideXgDelta;
    const left = row.avgOpponentLeftWideXgDelta;
    const right = row.avgOpponentRightWideXgDelta;
    const exposedSide = Math.abs(left) >= Math.abs(right) ? 'izquierda' : 'derecha';
    const exposedValue = Math.abs(left) >= Math.abs(right) ? left : right;
    if (Math.abs(central) >= Math.abs(wide) && Math.abs(central) >= 0.025) {
      return central > 0 ? 'rival entra mas por centro' : 'rival contenido por centro';
    }
    if (Math.abs(wide) >= 0.025) {
      if (Math.abs(exposedValue) >= 0.018) {
        return exposedValue > 0 ? `rival entra mas por banda ${exposedSide}` : `rival contenido por banda ${exposedSide}`;
      }
      return wide > 0 ? 'rival entra mas por bandas' : 'rival contenido por bandas';
    }
    if (Math.abs(row.avgOpponentCentralDelta) > Math.abs(row.avgOpponentWideDelta) && Math.abs(row.avgOpponentCentralDelta) >= 0.5) {
      return row.avgOpponentCentralDelta > 0 ? 'rival tira mas por centro' : 'rival tira menos por centro';
    }
    if (Math.abs(row.avgOpponentWideDelta) >= 0.5) {
      return row.avgOpponentWideDelta > 0 ? 'rival tira mas por bandas' : 'rival tira menos por bandas';
    }
    return 'sin riesgo claro';
  }
  scenarioSummaryOutcomeSummary(): Array<{ label: string; count: number; className: string; hint: string }> {
    const rows = this.scenarioMatrixSummaryResults();
    const definitions = [
      {
        label: 'Upgrade',
        className: 'read-visible',
        hint: 'Mejora clara: sube ataque y/o baja amenaza rival sin coste fuerte.',
        matches: (outcome: string) => outcome === 'Upgrade' || outcome === 'Lean up',
      },
      {
        label: 'Tradeoff',
        className: 'read-strong',
        hint: 'Gana algo y paga algo: mejor ataque con m?s riesgo, o m?s protecci?n con menos ataque.',
        matches: (outcome: string) => outcome === 'Tradeoff',
      },
      {
        label: 'Risk/Exposure',
        className: 'read-check',
        hint: 'Empeora el equipo, abre riesgo importante o el rival expone un carril/zona.',
        matches: (outcome: string) => outcome === 'Risk' || outcome === 'Downgrade' || outcome === 'Exposure',
      },
      {
        label: 'Contained',
        className: 'read-visible',
        hint: 'El rival prueba un carril/plan pero queda contenido.',
        matches: (outcome: string) => outcome === 'Contained',
      },
      {
        label: 'Neutral',
        className: 'read-stable',
        hint: 'Sin cambio futbol?stico suficiente para tomar decisi?n.',
        matches: (outcome: string) => outcome === 'Neutral',
      },
    ];
    return definitions.map((definition) => ({
      label: definition.label,
      className: definition.className,
      hint: definition.hint,
      count: rows.filter((row) => definition.matches(this.scenarioSummaryOutcome(row))).length,
    }));
  }
  private scenarioSummaryExportRow(row: ScenarioMatrixSummaryRow): Record<string, unknown> {
    return {
      read: this.scenarioSummaryRead(row),
      impactScore: this.scenarioSummaryImpactScore(row).toFixed(3),
      readReason: this.scenarioSummaryReadReason(row),
      coachRead: this.scenarioSummaryCoachRead(row),
      coachReadDetail: this.scenarioSummaryCoachReadDetail(row),
      recommendation: this.scenarioSummaryRecommendation(row),
      recommendationDetail: this.scenarioSummaryRecommendationDetail(row),
      outcome: this.scenarioSummaryOutcome(row),
      outcomeReason: this.scenarioSummaryOutcomeReason(row),
      attackGainScore: this.scenarioSummaryAttackGainScore(row).toFixed(3),
      attackLossScore: this.scenarioSummaryAttackLossScore(row).toFixed(3),
      defensiveGainScore: this.scenarioSummaryDefensiveGainScore(row).toFixed(3),
      defensiveRiskScore: this.scenarioSummaryDefensiveRiskScore(row).toFixed(3),
      scenario: row.scenario,
      baselineScenario: row.baselineScenario,
      actionType: row.actionType,
      actionDetail: row.actionDetail,
      seedStart: this.summarySeedStart(),
      seedEnd: this.summarySeedEnd(),
      seedCount: row.seedCount,
      avgUserXgDelta: row.avgUserXgDelta,
      minUserXgDelta: row.minUserXgDelta,
      maxUserXgDelta: row.maxUserXgDelta,
      avgOpponentXgDelta: row.avgOpponentXgDelta,
      avgUserShotsDelta: row.avgUserShotsDelta,
      avgOpponentShotsDelta: row.avgOpponentShotsDelta,
      avgUserPossessionDelta: row.avgUserPossessionDelta,
      avgUserCentralDelta: row.avgUserCentralDelta,
      avgUserWideDelta: row.avgUserWideDelta,
      avgOpponentCentralDelta: row.avgOpponentCentralDelta,
      avgOpponentWideDelta: row.avgOpponentWideDelta,
      avgUserCentralXgDelta: row.avgUserCentralXgDelta,
      avgUserWideXgDelta: row.avgUserWideXgDelta,
      avgOpponentCentralXgDelta: row.avgOpponentCentralXgDelta,
      avgOpponentWideXgDelta: row.avgOpponentWideXgDelta,
      avgUserLeftWideDelta: row.avgUserLeftWideDelta,
      avgUserRightWideDelta: row.avgUserRightWideDelta,
      avgOpponentLeftWideDelta: row.avgOpponentLeftWideDelta,
      avgOpponentRightWideDelta: row.avgOpponentRightWideDelta,
      avgUserLeftWideXgDelta: row.avgUserLeftWideXgDelta,
      avgUserRightWideXgDelta: row.avgUserRightWideXgDelta,
      avgOpponentLeftWideXgDelta: row.avgOpponentLeftWideXgDelta,
      avgOpponentRightWideXgDelta: row.avgOpponentRightWideXgDelta,
    };
  }
  private scenarioSummaryImpactScore(row: ScenarioMatrixSummaryRow): number {
    const userXg = Math.abs(row.avgUserXgDelta) / 0.12;
    const opponentXg = Math.abs(row.avgOpponentXgDelta) / 0.10;
    const userShots = Math.abs(row.avgUserShotsDelta) / 2.0;
    const opponentShots = Math.abs(row.avgOpponentShotsDelta) / 2.0;
    const possession = Math.abs(row.avgUserPossessionDelta) / 2.0;
    const zoneShift = (
      Math.abs(row.avgUserCentralDelta)
      + Math.abs(row.avgUserWideDelta)
      + Math.abs(row.avgOpponentCentralDelta)
      + Math.abs(row.avgOpponentWideDelta)
    ) / 5.0;
    const channelXg = (
      Math.abs(row.avgOpponentCentralXgDelta)
      + Math.abs(row.avgOpponentWideXgDelta)
      + Math.abs(row.avgOpponentLeftWideXgDelta)
      + Math.abs(row.avgOpponentRightWideXgDelta)
    ) / 0.16;
    return Math.max(userXg, opponentXg, userShots, opponentShots, possession, zoneShift, channelXg);
  }
  private scenarioSummaryAttackGainScore(row: ScenarioMatrixSummaryRow): number {
    return Math.max(0, row.avgUserXgDelta) / 0.08
      + Math.max(0, row.avgUserShotsDelta) / 1.5
      + Math.max(0, row.avgUserPossessionDelta) / 3.0
      + Math.max(0, row.avgUserCentralDelta + row.avgUserWideDelta) / 3.0;
  }
  private scenarioSummaryAttackLossScore(row: ScenarioMatrixSummaryRow): number {
    return Math.max(0, -row.avgUserXgDelta) / 0.08
      + Math.max(0, -row.avgUserShotsDelta) / 1.5
      + Math.max(0, -row.avgUserPossessionDelta) / 3.0
      + Math.max(0, -(row.avgUserCentralDelta + row.avgUserWideDelta)) / 3.0;
  }
  private scenarioSummaryDefensiveGainScore(row: ScenarioMatrixSummaryRow): number {
    return Math.max(0, -row.avgOpponentXgDelta) / 0.08
      + Math.max(0, -row.avgOpponentShotsDelta) / 1.5
      + Math.max(0, -(row.avgOpponentCentralDelta + row.avgOpponentWideDelta)) / 3.0
      + Math.max(0, -(row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta)) / 0.12;
  }
  private scenarioSummaryDefensiveRiskScore(row: ScenarioMatrixSummaryRow): number {
    return Math.max(0, row.avgOpponentXgDelta) / 0.08
      + Math.max(0, row.avgOpponentShotsDelta) / 1.5
      + Math.max(0, row.avgOpponentCentralDelta + row.avgOpponentWideDelta) / 3.0
      + Math.max(0, row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta) / 0.12;
  }
  private scenarioSummaryNeedsReview(row: ScenarioMatrixSummaryRow): boolean {
    if (row.actionType !== 'SUBSTITUTION') return false;
    const detail = `${row.scenario} ${row.actionDetail}`.toLowerCase();
    const isDowngrade = detail.includes('downgrade') || /\[-\d+/.test(detail);
    const isUpgrade = detail.includes('upgrade') || /\[\+\d+/.test(detail);
    if (isDowngrade && row.avgUserXgDelta > 0.08 && row.avgOpponentXgDelta <= 0.02) {
      return true;
    }
    if (isUpgrade && row.avgUserXgDelta < -0.08 && row.avgOpponentXgDelta >= -0.02) {
      return true;
    }
    return false;
  }
  private scenarioSummaryCoherentSubstitutionSignal(row: ScenarioMatrixSummaryRow): boolean {
    if (row.actionType !== 'SUBSTITUTION') return false;
    const detail = `${row.scenario} ${row.actionDetail}`.toLowerCase();
    const isDowngrade = detail.includes('downgrade') || /\[-\d+/.test(detail);
    const isUpgrade = detail.includes('upgrade') || /\[\+\d+/.test(detail);
    const isDefensive = detail.includes('defensive') || detail.includes('(def)');
    const isOffensive = detail.includes('offensive') || detail.includes('(att)');
    if (isDowngrade && isDefensive) {
      const xgaWorse = row.avgOpponentXgDelta >= 0.04;
      const shotsWorse = row.avgOpponentShotsDelta >= 0.45;
      const territoryWorse = (row.avgOpponentCentralDelta + row.avgOpponentWideDelta) >= 0.35;
      const channelWorse = (row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta
        + Math.max(row.avgOpponentLeftWideXgDelta, 0)
        + Math.max(row.avgOpponentRightWideXgDelta, 0)) >= 0.035;
      return (xgaWorse && shotsWorse) || (xgaWorse && territoryWorse) || (shotsWorse && channelWorse);
    }
    if (isUpgrade && isDefensive) {
      const xgaBetter = row.avgOpponentXgDelta <= -0.04;
      const shotsBetter = row.avgOpponentShotsDelta <= -0.45;
      const territoryBetter = (row.avgOpponentCentralDelta + row.avgOpponentWideDelta) <= -0.35;
      const channelBetter = (row.avgOpponentCentralXgDelta + row.avgOpponentWideXgDelta
        + Math.min(row.avgOpponentLeftWideXgDelta, 0)
        + Math.min(row.avgOpponentRightWideXgDelta, 0)) <= -0.035;
      return (xgaBetter && shotsBetter) || (xgaBetter && territoryBetter) || (shotsBetter && channelBetter);
    }
    if (isUpgrade && isOffensive) {
      return row.avgUserXgDelta >= 0.04 && row.avgUserShotsDelta >= 0.35;
    }
    if (isDowngrade && isOffensive) {
      return row.avgUserXgDelta <= -0.04 && row.avgUserShotsDelta <= -0.35;
    }
    return false;
  }
  scenarioGoalDiff(row: ScenarioMatrixRow): number {
    const baseline = this.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return this.goalDifference(row) - this.goalDifference(baseline);
  }
  scenarioPossessionDiff(row: ScenarioMatrixRow): number {
    const baseline = this.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return this.scenarioPossessionFor(row) - this.scenarioPossessionFor(baseline);
  }
  scenarioShotDiff(row: ScenarioMatrixRow): number {
    const baseline = this.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return this.scenarioShotsFor(row) - this.scenarioShotsFor(baseline);
  }
  scenarioXgDiff(row: ScenarioMatrixRow): number {
    const baseline = this.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return this.scenarioXgFor(row) - this.scenarioXgFor(baseline);
  }
  scenarioZoneDiff(row: ScenarioMatrixRow): { central: number; wide: number; long: number } {
    const baseline = this.scenarioBaseline();
    if (!baseline || row === baseline) {
      return { central: 0, wide: 0, long: 0 };
    }
    const rowZones = this.scenarioZonesFor(row);
    const baselineZones = this.scenarioZonesFor(baseline);
    return {
      central: rowZones.central - baselineZones.central,
      wide: rowZones.wide - baselineZones.wide,
      long: rowZones.long - baselineZones.long,
    };
  }
  scenarioGoalsFor(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.homeGoals : row.awayGoals;
  }
  scenarioGoalsAgainst(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.awayGoals : row.homeGoals;
  }
  scenarioPossessionFor(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.homePossession : row.awayPossession;
  }
  scenarioPossessionAgainst(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.awayPossession : row.homePossession;
  }
  scenarioShotsFor(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.homeShots : row.awayShots;
  }
  scenarioShotsAgainst(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.awayShots : row.homeShots;
  }
  scenarioXgFor(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.homeXg : row.awayXg;
  }
  scenarioXgAgainst(row: ScenarioMatrixRow): number {
    return this.selectedUserTeamIsHome() ? row.awayXg : row.homeXg;
  }
  scenarioZonesFor(row: ScenarioMatrixRow): { central: number; wide: number; long: number } {
    if (this.selectedUserTeamIsHome()) {
      return { central: row.homeCentralShots, wide: row.homeWideShots, long: row.homeLongShots };
    }
    return { central: row.awayCentralShots, wide: row.awayWideShots, long: row.awayLongShots };
  }
  scenarioZonesAgainst(row: ScenarioMatrixRow): { central: number; wide: number; long: number } {
    if (this.selectedUserTeamIsHome()) {
      return { central: row.awayCentralShots, wide: row.awayWideShots, long: row.awayLongShots };
    }
    return { central: row.homeCentralShots, wide: row.homeWideShots, long: row.homeLongShots };
  }
  fmtDeltaInt(value: number): string {
    if (!Number.isFinite(value) || value === 0) {
      return '0';
    }
    return value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;
  }
  fmtDeltaNumber(value: number): string {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
      return '0.00';
    }
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  }
  private roundTo(value: number, decimals: number): number {
    if (!Number.isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  fmtDeltaMicro(value: number): string {
    if (!Number.isFinite(value) || Math.abs(value) < 0.0005) {
      return '\u00b10.000';
    }
    return value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
  }
  deltaClass(value: number): string {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
      return 'delta-neutral';
    }
    return value > 0 ? 'delta-positive' : 'delta-negative';
  }
  positionPixelRead(row: PositionPixelMatrixSummary): string {
    const level = this.positionPixelReadLevel(row);
    switch (level) {
      case 'check':
        return 'Check';
      case 'strong':
        return 'Strong';
      case 'visible':
        return 'Visible';
      default:
        return 'Stable';
    }
  }
  positionPixelReadClass(row: PositionPixelMatrixSummary): string {
    return `read-${this.positionPixelReadLevel(row)}`;
  }
  private positionPixelSignalScoreFromRow(row: PositionPixelMatrixSummaryRow): number {
    const distance = Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent);
    const xgSignal = Math.max(
      Math.abs(row.deltaXgFor),
      Math.abs(row.deltaXgAgainst),
      Math.abs(row.deltaXgDiff),
      Math.abs(row.deltaCentralXgFor),
      Math.abs(row.deltaWideXgFor),
      Math.abs(row.deltaLongXgFor),
      Math.abs(row.deltaCentralXgAgainst),
      Math.abs(row.deltaWideXgAgainst),
      Math.abs(row.deltaLongXgAgainst),
      Math.abs(row.deltaLeftWideXgFor ?? 0),
      Math.abs(row.deltaRightWideXgFor ?? 0),
      Math.abs(row.deltaLeftWideXgAgainst ?? 0),
      Math.abs(row.deltaRightWideXgAgainst ?? 0),
    );
    const shotSignal = Math.max(
      Math.abs(row.deltaShotsFor),
      Math.abs(row.deltaShotsAgainst),
      Math.abs(row.deltaCentralShotsFor) + Math.abs(row.deltaWideShotsFor) + Math.abs(row.deltaLongShotsFor),
      Math.abs(row.deltaCentralShotsAgainst) + Math.abs(row.deltaWideShotsAgainst) + Math.abs(row.deltaLongShotsAgainst),
    ) * 0.025;
    const possSignal = Math.abs(row.deltaPossessionFor) * 0.010;
    const distanceSignal = Math.min(0.090, distance * (distance <= 1.25 ? 0.008 : 0.012));
    const playerTacticalSignal = Math.max(
      Math.abs(row.deltaPlayerEffectiveness ?? 0) * 0.50,
      Math.abs(row.deltaPlayerCollective ?? 0) * 0.015,
    );
    const rawSignal = Math.max(xgSignal, shotSignal, possSignal, distanceSignal, playerTacticalSignal);
    return rawSignal * this.positionPixelMovementConfidence(distance);
  }
  private positionPixelSignalReadFromRow(row: PositionPixelMatrixSummaryRow): string {
    const score = this.positionPixelSignalScoreFromRow(row);
    const distance = Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent);
    if (distance <= 1.25 && score >= 0.050) return `Micro-check ${score.toFixed(3)}`;
    if (score >= 0.120) return `Alta ${score.toFixed(3)}`;
    if (score >= 0.050) return `Media ${score.toFixed(3)}`;
    if (score >= 0.020) return `Baja ${score.toFixed(3)}`;
    return `Micro ${score.toFixed(3)}`;
  }
  private positionPixelSignalClassFromRow(row: PositionPixelMatrixSummaryRow): string {
    const score = this.positionPixelSignalScoreFromRow(row);
    const distance = Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent);
    if (distance <= 1.25 && score >= 0.050) return 'read-check';
    if (score >= 0.120) return 'delta-negative';
    if (score >= 0.050) return 'read-check';
    if (score >= 0.020) return 'read-stable';
    return 'delta-neutral';
  }
  private positionPixelSignalDetailFromRow(row: PositionPixelMatrixSummaryRow): string {
    return [
      `senal ${this.positionPixelSignalScoreFromRow(row).toFixed(3)}`,
      `xG for/ag/diff ${this.fmtDeltaMicro(row.deltaXgFor)}/${this.fmtDeltaMicro(row.deltaXgAgainst)}/${this.fmtDeltaMicro(row.deltaXgDiff)}`,
      `shots for/ag ${this.fmtDeltaNumber(row.deltaShotsFor)}/${this.fmtDeltaNumber(row.deltaShotsAgainst)}`,
      `poss ${this.fmtDeltaNumber(row.deltaPossessionFor)}%`,
      `eff ${this.fmtDeltaMicro(row.deltaPlayerEffectiveness ?? 0)}`,
      `collective ${this.fmtDeltaNumber(row.deltaPlayerCollective ?? 0)}`,
      `dist ${Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent).toFixed(2)}px`,
    ].join(' ? ');
  }
  private positionPixelMovementConfidence(distance: number): number {
    if (!Number.isFinite(distance)) return 1;
    if (distance <= 1.25) return 0.35;
    if (distance <= 6.0) return 0.70;
    return 1;
  }
  positionPixelTacticalRead(row: PositionPixelMatrixSummary): string {
    const attackGain = this.positionPixelAttackGainScore(row);
    const attackLoss = this.positionPixelAttackLossScore(row);
    const defensiveRisk = this.positionPixelDefensiveRiskScore(row);
    const defensiveGain = this.positionPixelDefensiveGainScore(row);
    const distance = this.positionPixelDistance(row);
    if (distance <= 1.25) {
      return row.signalScore >= 0.050 ? 'Micro review' : 'Micro stable';
    }
    if (distance <= 6.0) {
      if (attackLoss >= 1.0 && defensiveRisk >= 1.0) return 'Visible risk';
      if (attackGain >= 1.0 && defensiveRisk >= 1.0) return 'Visible trade-off';
      if (attackLoss >= 1.0 && defensiveGain >= 0.8) return 'Visible def+ / att-';
      if (attackGain >= 1.0 && defensiveGain >= 0.8) return 'Visible double gain';
      if (defensiveRisk >= 1.0) return 'Visible risk';
      if (attackLoss >= 1.0) return 'Visible attack loss';
      if (attackGain >= 1.0) return 'Visible attack gain';
      if (defensiveGain >= 1.0) return 'Visible def. gain';
      if (attackGain >= 0.6 || attackLoss >= 0.6 || defensiveRisk >= 0.6 || defensiveGain >= 0.6) return 'Visible small';
      return 'Neutral';
    }
    if (attackLoss >= 1.2 && defensiveGain >= 1.0) return 'Tradeoff: def+ / att-';
    if (attackGain >= 1.2 && defensiveRisk >= 1.0) return 'Tradeoff: att+ / risk+';
    if (attackLoss >= 1.0 && defensiveRisk >= 1.0) return 'Bad tradeoff';
    if (attackGain >= 1.0 && defensiveGain >= 1.0) return 'Double gain';
    if (defensiveRisk >= 1.6 && attackGain < 1.2) return 'Risk';
    if (attackGain >= 1.6 && defensiveRisk >= 1.2) return 'Trade-off';
    if (attackLoss >= 1.6 && defensiveGain < 1.0) return 'Attack loss';
    if (attackGain >= 1.4 && defensiveRisk < 0.8) return 'Attack gain';
    if (defensiveGain >= 1.4 && attackGain < 1.0) return 'Def. gain';
    if (defensiveRisk >= 1.0 && defensiveGain >= 0.8) return 'Compensated';
    if (attackGain >= 0.8 || attackLoss >= 0.8 || defensiveRisk >= 0.8 || defensiveGain >= 0.8) return 'Small signal';
    return 'Neutral';
  }
  positionPixelTacticalReadClass(row: PositionPixelMatrixSummary): string {
    const read = this.positionPixelTacticalRead(row);
    if (read === 'Micro review') return 'read-check';
    if (read === 'Micro stable') return 'read-stable';
    if (read.startsWith('Visible risk') || read === 'Visible attack loss') return 'read-check';
    if (read.startsWith('Visible')) return 'read-visible';
    if (read === 'Risk') return 'read-check';
    if (read === 'Trade-off' || read === 'Tradeoff: att+ / risk+' || read === 'Bad tradeoff') return 'read-strong';
    if (read === 'Tradeoff: def+ / att-') return 'read-visible';
    if (read === 'Double gain') return 'read-visible';
    if (read === 'Attack loss') return 'read-check';
    if (read === 'Attack gain' || read === 'Def. gain') return 'read-visible';
    if (read === 'Compensated' || read === 'Small signal') return 'read-stable';
    return 'delta-neutral';
  }
  positionPixelTacticalReadReason(row: PositionPixelMatrixSummary): string {
    const attackGain = this.positionPixelAttackGainScore(row);
    const attackLoss = this.positionPixelAttackLossScore(row);
    const defensiveRisk = this.positionPixelDefensiveRiskScore(row);
    const defensiveGain = this.positionPixelDefensiveGainScore(row);
    return [
      this.positionPixelCoachRead(row),
      `attack gain ${attackGain.toFixed(2)}`,
      `attack loss ${attackLoss.toFixed(2)}`,
      `defensive risk ${defensiveRisk.toFixed(2)}`,
      `defensive gain ${defensiveGain.toFixed(2)}`,
      this.positionPixelWideChannelReason(row)
    ].join(' ? ');
  }
  positionPixelChannelBreakdownRead(row: PositionPixelMatrixSummary): string {
    const breakdown = this.positionPixelChannelBreakdown(row);
    return `Amenaza ${this.positionPixelChannelSign(breakdown.threat)} · Conex. ${this.positionPixelChannelSign(breakdown.connection)} · ${this.positionPixelCoverageChannelLabel(row, breakdown.coverage)}`;
  }
  positionPixelChannelBreakdownClass(row: PositionPixelMatrixSummary): string {
    const breakdown = this.positionPixelChannelBreakdown(row);
    const positive = [breakdown.threat, breakdown.connection, breakdown.coverage].filter((value) => value >= 0.35).length;
    const negative = [breakdown.threat, breakdown.connection, breakdown.coverage].filter((value) => value <= -0.35).length;
    if (positive > 0 && negative > 0) return 'read-strong';
    if (positive >= 2 && negative === 0) return 'read-visible';
    if (negative >= 2) return 'read-check';
    if (positive > 0 || negative > 0) return 'read-stable';
    return 'delta-neutral';
  }
  positionPixelChannelBreakdownDetail(row: PositionPixelMatrixSummary): string {
    const breakdown = this.positionPixelChannelBreakdown(row);
    const parts = [
      `amenaza ${breakdown.threat.toFixed(2)}: xG ${this.fmtDeltaMicro(row.deltaXgFor)}, shots ${this.fmtDeltaNumber(row.deltaShotsFor)}, banda ${this.fmtDeltaMicro(row.deltaWideXgFor)}/${this.fmtDeltaNumber(row.deltaWideShotsFor)}`,
      `conexion ${breakdown.connection.toFixed(2)}: posesion ${this.fmtDeltaNumber(row.deltaPossessionFor)}%, centro ${this.fmtDeltaMicro(row.deltaCentralXgFor)}/${this.fmtDeltaNumber(row.deltaCentralShotsFor)}`,
      `cobertura ${breakdown.coverage.toFixed(2)}: xGA ${this.fmtDeltaMicro(-row.deltaXgAgainst)}, shots ag ${this.fmtDeltaNumber(-row.deltaShotsAgainst)}, banda ag ${this.fmtDeltaMicro(-row.deltaWideXgAgainst)}/${this.fmtDeltaNumber(-row.deltaWideShotsAgainst)}`
    ];
    const contextualCoverage = this.positionPixelContextualCoverageNote(row, breakdown.coverage);
    if (contextualCoverage) {
      parts.push(contextualCoverage);
    }
    return parts.join(' · ');
  }
  positionPixelVisualExpectationRead(row: PositionPixelMatrixSummary): string {
    if (this.positionPixelVisualExpectationMismatches(row).length === 0) return 'Visual OK';
    return this.positionPixelIsMicroVisualMismatch(row) ? 'Visual micro' : 'Visual mismatch';
  }
  positionPixelVisualExpectationClass(row: PositionPixelMatrixSummary): string {
    const read = this.positionPixelVisualExpectationRead(row);
    if (read === 'Visual mismatch') return 'read-check';
    if (read === 'Visual micro') return 'read-stable';
    return 'read-stable';
  }
  positionPixelVisualExpectationDetail(row: PositionPixelMatrixSummary): string {
    const mismatches = this.positionPixelVisualExpectationMismatches(row);
    if (mismatches.length > 0) {
      return mismatches.join(' · ');
    }
    return `coherente: ${this.positionPixelShapeMove(row)} · ${this.positionPixelChannelBreakdownRead(row)}`;
  }
  private positionPixelIsMicroVisualMismatch(row: PositionPixelMatrixSummary): boolean {
    return this.positionPixelReadLevel(row) === 'stable' && row.signalScore < 0.05;
  }
  positionPixelVisualEngineTensionRead(row: PositionPixelMatrixSummary): string {
    const tension = this.positionPixelVisualEngineTensions(row);
    if (tension.some((item) => item.level === 'hard')) return 'Contradicción';
    if (tension.length > 0) return 'Tradeoff';
    return 'Coherente';
  }
  positionPixelVisualEngineTensionClass(row: PositionPixelMatrixSummary): string {
    const tension = this.positionPixelVisualEngineTensions(row);
    if (tension.some((item) => item.level === 'hard')) return 'read-check';
    if (tension.length > 0) return 'read-strong';
    return 'read-stable';
  }
  positionPixelVisualEngineTensionDetail(row: PositionPixelMatrixSummary): string {
    const tension = this.positionPixelVisualEngineTensions(row);
    if (tension.length === 0) {
      return `visual y motor alineados: ${this.positionPixelChannelBreakdownRead(row)} · ${this.positionPixelTacticalRead(row)}`;
    }
    return tension.map((item) => item.detail).join(' · ');
  }
  private positionPixelVisualEngineTensions(row: PositionPixelMatrixSummary): Array<{ level: 'soft' | 'hard'; detail: string }> {
    const breakdown = this.positionPixelChannelBreakdown(row);
    const attackLoss = this.positionPixelAttackLossScore(row);
    const attackGain = this.positionPixelAttackGainScore(row);
    const defensiveRisk = this.positionPixelDefensiveRiskScore(row);
    const defensiveGain = this.positionPixelDefensiveGainScore(row);
    const tacticalRead = this.positionPixelTacticalRead(row);
    const result: Array<{ level: 'soft' | 'hard'; detail: string }> = [];
    const visualExpectationMismatches = this.positionPixelVisualExpectationMismatches(row);
    if (visualExpectationMismatches.length > 0 && !this.positionPixelIsMicroVisualMismatch(row)) {
      result.push({
        level: 'soft',
        detail: `expectativa visual pendiente: ${visualExpectationMismatches.join(' / ')}`,
      });
    }
    const mixedVisualTradeoff = (breakdown.threat >= 0.20 || breakdown.connection >= 0.20 || breakdown.coverage >= 0.20)
      && (breakdown.threat <= -0.20 || breakdown.connection <= -0.20 || breakdown.coverage <= -0.20);
    if (breakdown.threat >= 0.35
        && (tacticalRead === 'Attack loss'
          || (row.deltaXgFor <= -0.035 && row.deltaShotsFor <= -0.50)
          || (attackLoss >= 0.8 && attackLoss > attackGain + 0.25))) {
      result.push({
        level: 'hard',
        detail: `amenaza visual sube (${breakdown.threat.toFixed(2)}) pero el motor lee pérdida ofensiva (${attackLoss.toFixed(2)})`,
      });
    }
    if (breakdown.threat <= -0.35
        && (tacticalRead === 'Attack gain'
          || (row.deltaXgFor >= 0.035 && row.deltaShotsFor >= 0.50)
          || (attackGain >= 0.8 && attackGain > attackLoss + 0.25))) {
      result.push({
        level: 'hard',
        detail: `amenaza visual baja (${breakdown.threat.toFixed(2)}) pero el motor lee ganancia ofensiva (${attackGain.toFixed(2)})`,
      });
    }
    if (this.positionPixelHasContextualCoverageConflict(row, breakdown.coverage, defensiveRisk, defensiveGain, tacticalRead)) {
      result.push({
        level: 'soft',
        detail: `cobertura contextual sube (${breakdown.coverage.toFixed(2)}) pero el motor lee riesgo defensivo (${defensiveRisk.toFixed(2)}): no asumir cobertura real`,
      });
    }
    if (breakdown.coverage <= -0.35 && (tacticalRead === 'Def. gain' || (defensiveGain >= 0.8 && defensiveGain > defensiveRisk + 0.25))) {
      result.push({
        level: 'hard',
        detail: `cobertura visual baja (${breakdown.coverage.toFixed(2)}) pero el motor lee mejora defensiva (${defensiveGain.toFixed(2)})`,
      });
    }
    if (breakdown.connection >= 0.35 && attackLoss + defensiveRisk >= 1.8 && attackGain + defensiveGain < 0.8) {
      result.push({
        level: 'soft',
        detail: `conexión visual sube (${breakdown.connection.toFixed(2)}) pero el balance del motor cae fuerte`,
      });
    }
    if (mixedVisualTradeoff && this.positionPixelDistance(row) >= 6) {
      return result.map((item) => item.level === 'hard'
        ? {
          level: 'soft',
          detail: `${item.detail}; tradeoff visual mixto, no contradiccion dura`,
        }
        : item);
    }
    return result;
  }
  private positionPixelVisualExpectationMismatches(row: PositionPixelMatrixSummary): string[] {
    const breakdown = this.positionPixelChannelBreakdown(row);
    const line = this.strictPositionPixelLine(row.playerPosition) ?? this.positionPixelVisualLine(row.fromYPercent);
    const movedUp = row.targetYPercent <= row.fromYPercent - 3.5;
    const movedDown = row.targetYPercent >= row.fromYPercent + 3.5;
    const movedInside = Math.abs(row.targetXPercent - 50) < Math.abs(row.fromXPercent - 50) - 2.5;
    const movedWide = Math.abs(row.targetXPercent - 50) > Math.abs(row.fromXPercent - 50) + 2.5;
    const targetCentralish = Math.abs(row.targetXPercent - 50) <= 18;
    const fromWideish = Math.abs(row.fromXPercent - 50) >= 18;
    const targetWideish = Math.abs(row.targetXPercent - 50) >= 18;
    const mismatches: string[] = [];
    const attackGainScore = this.positionPixelAttackGainScore(row);
    const attackLossScore = this.positionPixelAttackLossScore(row);
    const defensiveGainScore = this.positionPixelDefensiveGainScore(row);
    const defensiveRiskScore = this.positionPixelDefensiveRiskScore(row);
    const isBigTacticalMove = this.positionPixelDistance(row) >= 6;
    const visualBenefit = breakdown.threat > 0.20 || breakdown.connection > 0.20 || breakdown.coverage > 0.20;
    const visualCost = breakdown.threat < -0.20 || breakdown.connection < -0.20 || breakdown.coverage < -0.20;
    const engineBenefit = attackGainScore >= 0.55 || defensiveGainScore >= 0.55;
    const engineCost = attackLossScore >= 0.55 || defensiveRiskScore >= 0.55;
    if (isBigTacticalMove && !movedWide && visualCost && engineCost) return mismatches;
    if (isBigTacticalMove && !movedWide && visualBenefit && visualCost && (engineBenefit || engineCost)) return mismatches;
    const distance = this.positionPixelDistance(row);
    const ownThreatSignal = Math.max(
      row.deltaXgFor,
      row.deltaCentralXgFor,
      row.deltaWideXgFor,
      row.deltaLeftWideXgFor,
      row.deltaRightWideXgFor,
      row.deltaShotsFor * 0.025
    );
    const centralThreatSignal = Math.max(
      row.deltaCentralXgFor,
      row.deltaXgFor,
      row.deltaCentralShotsFor * 0.025
    );
    const coverageSignal = Math.max(
      -row.deltaXgAgainst,
      -row.deltaCentralXgAgainst,
      -row.deltaWideXgAgainst,
      -row.deltaShotsAgainst * 0.020
    );
    if (line === 'ATT' && movedUp && breakdown.threat < 0.20 && ownThreatSignal < 0.010) {
      mismatches.push('ATT sube: se esperaba algo de amenaza/profundidad');
    }
    if (line === 'DEF' && movedDown && !movedWide && breakdown.coverage < 0.20 && coverageSignal < 0.010) {
      mismatches.push('DEF baja: se esperaba mas cobertura');
    }
    if (line === 'DEF'
        && movedUp
        && breakdown.threat < 0.20
        && breakdown.connection < 0.20
        && breakdown.coverage < 0.35
        && defensiveRiskScore < 0.6
        && attackLossScore < 0.6) {
      mismatches.push('DEF sube: se esperaba aporte ofensivo o conexión');
    }
    if (movedInside
        && targetCentralish
        && breakdown.connection < -0.20
        && breakdown.threat < 0.20
        && centralThreatSignal < (distance <= 6.0 ? 0.006 : 0.018)
        && attackGainScore < 0.75) {
      mismatches.push('se cierra: se esperaba más conexión o amenaza central');
    }
    const wideXgSignal = Math.max(Math.abs(row.deltaWideXgFor), Math.abs(row.deltaWideXgAgainst));
    const wideShotSignal = Math.max(Math.abs(row.deltaWideShotsFor), Math.abs(row.deltaWideShotsAgainst));
    const requiredWideXgSignal = distance <= 6.0 ? 0.005 : 0.010;
    const requiredWideShotSignal = distance <= 6.0 ? 0.10 : 0.25;
    if (movedWide
        && (fromWideish || targetWideish)
        && wideXgSignal < requiredWideXgSignal
        && wideShotSignal < requiredWideShotSignal
        && breakdown.threat < 0.35
        && breakdown.connection < 0.35
        && attackGainScore < 0.75) {
      mismatches.push('se abre: se esperaba alguna señal de banda');
    }
    return mismatches;
  }
  positionPixelChannelBreakdown(row: PositionPixelMatrixSummary): { threat: number; connection: number; coverage: number } {
    const threat = (row.deltaXgFor * 8)
      + (row.deltaShotsFor * 0.35)
      + (row.deltaWideXgFor * 10)
      + (row.deltaWideShotsFor * 0.20)
      + (Math.max(row.deltaLeftWideXgFor, row.deltaRightWideXgFor, 0) * 8);
    const connection = (row.deltaPossessionFor * 0.12)
      + (row.deltaCentralXgFor * 10)
      + (row.deltaCentralShotsFor * 0.25)
      - (Math.max(0, row.deltaLongShotsFor) * 0.08)
      - (Math.max(0, row.deltaLongXgFor) * 3);
    const coverage = (-row.deltaXgAgainst * 8)
      + (-row.deltaShotsAgainst * 0.30)
      + (-row.deltaWideXgAgainst * 9)
      + (-row.deltaWideShotsAgainst * 0.18)
      + (-row.deltaCentralXgAgainst * 7)
      + (-row.deltaCentralShotsAgainst * 0.18);
    return {
      threat: this.positionPixelClampBreakdownScore(threat),
      connection: this.positionPixelClampBreakdownScore(connection),
      coverage: this.positionPixelClampBreakdownScore(coverage),
    };
  }
  private positionPixelChannelSign(value: number): '+' | '-' | '=' {
    if (value >= 0.35) return '+';
    if (value <= -0.35) return '-';
    return '=';
  }
  private positionPixelCoverageChannelLabel(row: PositionPixelMatrixSummary, coverage: number): string {
    const sign = this.positionPixelChannelSign(coverage);
    if (this.positionPixelUsesContextualCoverage(row, coverage)) {
      return `Cobertura ctx ${sign}`;
    }
    return `Cobertura ${sign}`;
  }
  private positionPixelContextualCoverageNote(row: PositionPixelMatrixSummary, coverage: number): string | null {
    if (!this.positionPixelUsesContextualCoverage(row, coverage)) {
      return null;
    }
    const defensiveRisk = this.positionPixelDefensiveRiskScore(row);
    if (defensiveRisk >= 0.8) {
      return `cobertura contextual: ATT bajó pero el riesgo defensivo sube (${defensiveRisk.toFixed(2)}); tratar como alerta, no como mejora limpia`;
    }
    return 'cobertura contextual: ATT bajó; validar si realmente protege o solo cambia el dibujo';
  }
  private positionPixelUsesContextualCoverage(row: PositionPixelMatrixSummary, coverage: number): boolean {
    const line = this.strictPositionPixelLine(row.playerPosition) ?? this.positionPixelVisualLine(row.fromYPercent);
    const movedDown = row.targetYPercent >= row.fromYPercent + 3.5;
    return line === 'ATT' && movedDown && coverage >= 0.35;
  }
  private positionPixelHasContextualCoverageConflict(
    row: PositionPixelMatrixSummary,
    coverage: number,
    defensiveRisk: number,
    defensiveGain: number,
    tacticalRead: string
  ): boolean {
    return coverage >= 0.35
      && ((tacticalRead === 'Risk' || tacticalRead === 'Bad tradeoff')
        || (defensiveRisk >= 0.8 && defensiveRisk > defensiveGain + 0.25)
        || (this.positionPixelUsesContextualCoverage(row, coverage) && defensiveRisk >= 0.65));
  }
  private positionPixelClampBreakdownScore(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-9.99, Math.min(9.99, value));
  }
  positionPixelCoachRead(row: PositionPixelMatrixSummary): string {
    const vertical = row.targetYPercent - row.fromYPercent;
    const horizontal = row.targetXPercent - row.fromXPercent;
    const movedUp = vertical <= -3.5;
    const movedDown = vertical >= 3.5;
    const movedWide = Math.abs(row.targetXPercent - 50) > Math.abs(row.fromXPercent - 50) + 2.5;
    const movedInside = Math.abs(row.targetXPercent - 50) < Math.abs(row.fromXPercent - 50) - 2.5;
    const attackGain = this.positionPixelAttackGainScore(row);
    const attackLoss = this.positionPixelAttackLossScore(row);
    const defensiveRisk = this.positionPixelDefensiveRiskScore(row);
    const defensiveGain = this.positionPixelDefensiveGainScore(row);
    const coverageBreakdown = this.positionPixelChannelBreakdown(row).coverage;
    const contextualCoverage = this.positionPixelUsesContextualCoverage(row, coverageBreakdown);
    const ownWideDelta = row.deltaWideShotsFor + Math.abs(row.deltaLeftWideXgFor) + Math.abs(row.deltaRightWideXgFor);
    const againstWideDelta = row.deltaWideShotsAgainst + Math.abs(row.deltaLeftWideXgAgainst) + Math.abs(row.deltaRightWideXgAgainst);
    const centralDelta = row.deltaCentralShotsFor + row.deltaCentralXgFor;
    const centralAgainstDelta = row.deltaCentralShotsAgainst + row.deltaCentralXgAgainst;
    if (this.positionPixelDistance(row) <= 1.25) {
      return row.signalScore >= 0.050
        ? 'Micro con señal: revisar si ese borde de zona pesa demasiado.'
        : 'Micro estable: el pixel no rompe la lectura del motor.';
    }
    if (movedWide && movedUp && attackGain >= 0.7 && defensiveRisk >= 0.7) {
      return 'Diagonal abierta alta: gana amplitud/profundidad, pero deja espalda; tradeoff banda-altura.';
    }
    if (movedWide && movedDown && defensiveGain >= 0.7 && attackLoss >= 0.5) {
      return 'Diagonal abierta baja: suma cobertura exterior, pero pierde amenaza/conexion interior.';
    }
    if (movedInside && movedUp && attackGain >= 0.7 && defensiveRisk >= 0.7) {
      return 'Diagonal interior alta: suma presencia central, pero puede liberar banda; tradeoff centro-banda.';
    }
    if (movedInside && movedDown && defensiveGain >= 0.7 && attackLoss >= 0.5) {
      return 'Diagonal interior baja: compacta el bloque, pero reduce amplitud y salida.';
    }
    if (movedUp && attackGain >= 0.9 && defensiveRisk >= 0.7) {
      const line = this.strictPositionPixelLine(row.playerPosition) ?? this.positionPixelVisualLine(row.fromYPercent);
      if (line === 'DEF') {
        return 'Sube un defensor: suma salida/amenaza, pero abre espalda; tratarlo como tradeoff de riesgo.';
      }
      return 'Proyecta al jugador: suma ataque, pero deja espalda para el rival.';
    }
    if (movedUp && defensiveRisk >= 0.9 && attackGain < 0.7) {
      const line = this.strictPositionPixelLine(row.playerPosition) ?? this.positionPixelVisualLine(row.fromYPercent);
      const targetLine = this.positionPixelVisualLine(row.targetYPercent);
      if (line === 'DEF' && targetLine === 'MID' && this.positionPixelDistance(row) > 10) {
        return 'DEF->MID grande: rompe la línea defensiva sin ganancia clara; alerta fuerte de riesgo.';
      }
      return 'Sube sin ventaja clara: gana riesgo y puede quedar desconectado.';
    }
    if (contextualCoverage && defensiveRisk >= 0.8) {
      return 'Baja un delantero: cobertura contextual, pero sube el riesgo; no asumir mejora defensiva real.';
    }
    if (contextualCoverage && defensiveGain >= 0.8 && attackLoss >= 0.6) {
      return 'Baja un delantero: suma apoyo contextual, pero resigna amenaza ofensiva.';
    }
    if (contextualCoverage && defensiveGain >= 0.8) {
      return 'Baja un delantero: puede ayudar al bloque, pero validar en partido si protege de verdad.';
    }
    if (movedDown && defensiveGain >= 0.8 && attackLoss >= 0.6) {
      return 'Baja para cubrir: protege mejor, pero resigna salida ofensiva.';
    }
    if (movedDown && defensiveGain >= 0.8) {
      return 'Mejora cobertura: el equipo queda mas protegido atras.';
    }
    if (movedWide && attackGain >= 0.7 && defensiveRisk >= 0.8 && againstWideDelta >= 0.3) {
      return 'Abre la cancha: gana banda, pero el rival tambien encuentra ese costado; tradeoff de amplitud.';
    }
    if (movedWide && defensiveRisk >= 0.8 && againstWideDelta >= 0.3) {
      return 'Abre la banda, pero el rival tambien encuentra ese costado.';
    }
    if (movedWide && attackGain >= 0.7 && ownWideDelta >= 0.4) {
      return 'Abre la cancha: mejora ataque por banda.';
    }
    if (movedInside && (attackGain >= 0.7 || centralDelta >= 0.2) && defensiveRisk >= 0.8 && againstWideDelta >= 0.3) {
      return 'Se cierra por dentro: mejora conexion, pero libera la banda; tradeoff interior/exterior.';
    }
    if (movedInside && attackGain >= 0.7 && centralDelta >= 0.2) {
      return 'Se cierra por dentro: mejora conexión y juego central.';
    }
    if (movedInside && defensiveRisk >= 0.8 && againstWideDelta >= 0.3) {
      return 'Se mete al centro: puede liberar la banda a la espalda.';
    }
    if (attackGain >= 0.9 && defensiveGain >= 0.8) {
      return 'Ajuste positivo: mejora ataque y control defensivo en este contexto.';
    }
    if (attackLoss >= 0.9 && defensiveRisk >= 0.8) {
      return 'Mal ajuste: pierde amenaza y concede mas riesgo.';
    }
    if (attackGain >= 0.9) {
      return 'Gana amenaza ofensiva: el movimiento ayuda a generar ocasiones.';
    }
    if (attackLoss >= 0.9) {
      return 'Pierde amenaza: el equipo ataca peor con esa ubicación.';
    }
    if (defensiveRisk >= 0.9) {
      return centralAgainstDelta >= againstWideDelta
        ? 'Aumenta riesgo por dentro: revisar cobertura central.'
        : 'Aumenta riesgo por banda: revisar espalda y ayudas.';
    }
    if (defensiveGain >= 0.9) {
      return 'Mejora protección: baja la producción ofensiva rival.';
    }
    return 'Cambio leve: señal baja, sin lectura táctica dominante.';
  }
  private positionPixelWideChannelReason(row: PositionPixelMatrixSummary): string {
    const ownLeft = row.deltaLeftWideXgFor;
    const ownRight = row.deltaRightWideXgFor;
    const agLeft = row.deltaLeftWideXgAgainst;
    const agRight = row.deltaRightWideXgAgainst;
    const ownSide = Math.abs(ownLeft) >= Math.abs(ownRight)
      ? `own L ${this.fmtDeltaMicro(ownLeft)}`
      : `own R ${this.fmtDeltaMicro(ownRight)}`;
    const agSide = Math.abs(agLeft) >= Math.abs(agRight)
      ? `ag L ${this.fmtDeltaMicro(agLeft)}`
      : `ag R ${this.fmtDeltaMicro(agRight)}`;
    return `wide channel ${ownSide} / ${agSide}`;
  }
  positionPixelShapeMove(row: PositionPixelMatrixSummary): string {
    const fromLine = this.positionPixelVisualLine(row.fromYPercent);
    const toLine = this.positionPixelVisualLine(row.targetYPercent);
    const fromChannel = this.positionPixelVisualChannel(row.fromXPercent);
    const toChannel = this.positionPixelVisualChannel(row.targetXPercent);
    if (fromLine === toLine && fromChannel === toChannel) {
      const vertical = row.targetYPercent - row.fromYPercent;
      const horizontal = row.targetXPercent - row.fromXPercent;
      if (Math.abs(vertical) >= 4 && Math.abs(horizontal) >= 4) {
        const verticalLabel = vertical < 0 ? 'alto' : 'bajo';
        const horizontalLabel = Math.abs(row.targetXPercent - 50) > Math.abs(row.fromXPercent - 50)
          ? 'abierto'
          : 'interior';
        return `${toLine} ${toChannel}: diagonal ${horizontalLabel} ${verticalLabel}`;
      }
      if (Math.abs(vertical) >= 4) {
        return vertical < 0
          ? `${toLine} ${toChannel}: mas alto`
          : `${toLine} ${toChannel}: mas bajo`;
      }
      if (Math.abs(horizontal) >= 4) {
        return horizontal < 0
          ? `${toLine} ${toChannel}: mas izquierdo`
          : `${toLine} ${toChannel}: mas derecho`;
      }
      return `${toLine} ${toChannel}: microajuste`;
    }
    const parts: string[] = [];
    if (fromChannel !== toChannel) {
      parts.push(`-${fromChannel} +${toChannel}`);
    }
    if (fromLine !== toLine) {
      parts.push(`${fromLine}->${toLine}`);
    }
    return parts.length > 0 ? parts.join(' / ') : `${fromLine} ${fromChannel}->${toLine} ${toChannel}`;
  }
  positionPixelShapeMoveDetail(row: PositionPixelMatrixSummary): string {
    const fromLine = this.positionPixelVisualLine(row.fromYPercent);
    const toLine = this.positionPixelVisualLine(row.targetYPercent);
    const fromChannel = this.positionPixelVisualChannel(row.fromXPercent);
    const toChannel = this.positionPixelVisualChannel(row.targetXPercent);
    const notes: string[] = [];
    if (fromChannel !== toChannel) {
      notes.push(`perdiste presencia en ${this.positionPixelChannelLabel(fromChannel)}`);
      notes.push(`ganaste presencia en ${this.positionPixelChannelLabel(toChannel)}`);
    }
    if (fromLine !== toLine) {
      notes.push(row.targetYPercent < row.fromYPercent
        ? `subiste al jugador de ${fromLine} a ${toLine}`
        : `bajaste al jugador de ${fromLine} a ${toLine}`);
    }
    if (fromLine === toLine && fromChannel === toChannel) {
      const vertical = row.targetYPercent - row.fromYPercent;
      const horizontal = row.targetXPercent - row.fromXPercent;
      if (Math.abs(vertical) >= 4 && Math.abs(horizontal) >= 4) {
        const horizontalLabel = Math.abs(row.targetXPercent - 50) > Math.abs(row.fromXPercent - 50)
          ? 'gana amplitud'
          : 'se mete por dentro';
        notes.push(vertical < 0
          ? `diagonal: ${horizontalLabel} y gana altura`
          : `diagonal: ${horizontalLabel} y baja a cubrir`);
      } else if (Math.abs(vertical) >= Math.abs(horizontal) && Math.abs(vertical) >= 1) {
        notes.push(vertical < 0 ? 'ajuste fino: mas profundidad ofensiva' : 'ajuste fino: mas cobertura');
      } else if (Math.abs(horizontal) >= 1) {
        notes.push(horizontal < 0 ? 'ajuste fino: carga mas la izquierda' : 'ajuste fino: carga mas la derecha');
      } else {
        notes.push('microajuste visual sin cambio de zona');
      }
    }
    return `${notes.join(' ? ')} ? ${this.positionPixelShapeDeltaText(fromLine, fromChannel, toLine, toChannel)}`;
  }
  private positionPixelShapeDeltaText(
    fromLine: 'ATT' | 'MID' | 'DEF',
    fromChannel: 'L' | 'C' | 'R',
    toLine: 'ATT' | 'MID' | 'DEF',
    toChannel: 'L' | 'C' | 'R'
  ): string {
    if (fromLine === toLine && fromChannel === toChannel) {
      return `shape ${toLine} ${toChannel} sin cambio de casillero`;
    }
    return `shape ${fromLine} ${fromChannel} -1 / ${toLine} ${toChannel} +1`;
  }
  private positionPixelVisualChannel(xPercent: number): 'L' | 'C' | 'R' {
    if (xPercent < 34) return 'L';
    if (xPercent > 66) return 'R';
    return 'C';
  }
  private positionPixelVisualLine(yPercent: number): 'ATT' | 'MID' | 'DEF' {
    if (yPercent < 32) return 'ATT';
    if (yPercent < 69) return 'MID';
    return 'DEF';
  }
  private positionPixelChannelLabel(channel: 'L' | 'C' | 'R'): string {
    if (channel === 'L') return 'banda izquierda';
    if (channel === 'R') return 'banda derecha';
    return 'el centro';
  }
  setPositionPixelReadFilter(value: string): void {
    const allowed: PositionPixelReadFilter[] = [
      'all',
      'diagonal',
      'diagonal-mismatch',
      'diagonal-micro',
      'diagonal-review',
      'visual-mismatch',
      'visual-micro',
      'visual-review',
      'big-move',
      'line-break',
      'stable',
      'visible',
      'strong',
      'check',
    ];
    this.positionPixelReadFilter.set(allowed.includes(value as PositionPixelReadFilter) ? (value as PositionPixelReadFilter) : 'all');
  }
  setPositionPixelSortMode(value: string): void {
    const allowed: PositionPixelSortMode[] = ['default', 'read-desc', 'impact-desc', 'distance-desc'];
    this.positionPixelSortMode.set(allowed.includes(value as PositionPixelSortMode) ? (value as PositionPixelSortMode) : 'default');
  }
  setScenarioSummaryReadFilter(value: string): void {
    const allowed: ScenarioSummaryReadFilter[] = ['all', 'actionable', 'review', 'strong', 'visible', 'small', 'noise'];
    this.scenarioSummaryReadFilter.set(
      allowed.includes(value as ScenarioSummaryReadFilter) ? (value as ScenarioSummaryReadFilter) : 'all'
    );
  }
  setScenarioSummarySortMode(value: string): void {
    const allowed: ScenarioSummarySortMode[] = ['default', 'read-desc', 'impact-desc', 'xg-desc'];
    this.scenarioSummarySortMode.set(
      allowed.includes(value as ScenarioSummarySortMode) ? (value as ScenarioSummarySortMode) : 'read-desc'
    );
  }
  positionPixelReadSummary(): Array<{ label: string; level: PositionPixelReadLevel; count: number }> {
    const counts: Record<PositionPixelReadLevel, number> = {
      stable: 0,
      visible: 0,
      strong: 0,
      check: 0,
    };
    for (const row of this.positionPixelMatrixRows()) {
      counts[this.positionPixelReadLevel(row)] += 1;
    }
    return [
      { label: 'Stable', level: 'stable', count: counts.stable },
      { label: 'Visible', level: 'visible', count: counts.visible },
      { label: 'Strong', level: 'strong', count: counts.strong },
      { label: 'Check', level: 'check', count: counts.check },
    ];
  }
  positionPixelTacticalReadSummary(): Array<{ label: string; count: number; className: string; hint: string }> {
    const rows = this.positionPixelMatrixRows();
    const definitions = [
      {
        label: 'Tradeoffs',
        className: 'read-strong',
        hint: 'Movimientos que ganan algo pero pagan algo: m?s ataque con m?s riesgo, o m?s protecci?n con menos ataque.',
        matches: (read: string) => read.startsWith('Tradeoff'),
      },
      {
        label: 'Double gain',
        className: 'read-visible',
        hint: 'Movimientos que mejoran ataque y defensa a la vez.',
        matches: (read: string) => read === 'Double gain',
      },
      {
        label: 'Attack gain',
        className: 'read-visible',
        hint: 'Movimientos que mejoran amenaza ofensiva sin abrir demasiado riesgo.',
        matches: (read: string) => read === 'Attack gain',
      },
      {
        label: 'Def. gain',
        className: 'read-visible',
        hint: 'Movimientos que protegen mejor sin una p?rdida ofensiva fuerte.',
        matches: (read: string) => read === 'Def. gain',
      },
      {
        label: 'Risk/Bad',
        className: 'read-check',
        hint: 'Movimientos que abren riesgo defensivo o empeoran ataque y defensa.',
        matches: (read: string) => read === 'Risk' || read === 'Bad tradeoff' || read === 'Visible risk',
      },
      {
        label: 'Cost',
        className: 'read-visible',
        hint: 'Movimientos que tienen costo ofensivo visible, pero no necesariamente abren riesgo defensivo.',
        matches: (read: string) => read === 'Attack loss' || read === 'Visible attack loss',
      },
      {
        label: 'Micro review',
        className: 'read-check',
        hint: 'Micro-movimientos con senal llamativa: revisar con mas seeds antes de decidir.',
        matches: (read: string) => read === 'Micro review',
      },
      {
        label: 'Neutral/Small',
        className: 'read-stable',
        hint: 'Movimientos con se?al chica, compensada, micro o neutra.',
        matches: (read: string) => read === 'Neutral' || read === 'Small signal' || read === 'Compensated' || read === 'Micro stable' || read === 'Visible small',
      },
    ];
    return definitions.map((definition) => ({
      label: definition.label,
      className: definition.className,
      hint: definition.hint,
      count: rows.filter((row) => definition.matches(this.positionPixelTacticalRead(row))).length,
    }));
  }
  positionPixelVisualExpectationSummary(): Array<{ label: string; count: number; className: string; hint: string }> {
    const rows = this.positionPixelMatrixRows();
    const mismatch = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual mismatch').length;
    const micro = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual micro').length;
    const ok = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual OK').length;
    return [
      {
        label: 'Visual mismatch',
        count: mismatch,
        className: mismatch > 0 ? 'read-check' : 'read-stable',
        hint: 'Filas donde la lectura visual de DT no coincide con la respuesta del motor.',
      },
      {
        label: 'Visual micro',
        count: micro,
        className: micro > 0 ? 'read-review' : 'read-stable',
        hint: 'Filas con seÃƒÂ±al visual muy chica: no son bugs directos, pero conviene revisarlas con mÃƒ¡s seeds.',
      },
      {
        label: 'Visual OK',
        count: ok,
        className: 'read-stable',
        hint: 'Filas donde la respuesta del motor es compatible con la expectativa visual básica.',
      },
    ];
  }
  positionPixelVisualEngineTensionSummary(): Array<{ label: string; count: number; className: string; hint: string }> {
    const rows = this.positionPixelMatrixRows();
    const contradiction = rows.filter((row) => this.positionPixelVisualEngineTensionRead(row) === 'Contradicción').length;
    const review = rows.filter((row) => this.positionPixelVisualEngineTensionRead(row) === 'Tradeoff').length;
    const coherent = Math.max(0, rows.length - contradiction - review);
    return [
      {
        label: 'Contradicción',
        count: contradiction,
        className: contradiction > 0 ? 'read-check' : 'read-stable',
        hint: 'A/C/C visual y salida del motor van en direcciones opuestas. Candidato directo a calibración.',
      },
      {
        label: 'Tradeoff',
        count: review,
        className: review > 0 ? 'read-strong' : 'read-stable',
        hint: 'Una mejora visual queda compensada por una pérdida táctica. No es bug directo; es decisión de DT.',
      },
      {
        label: 'Coherente',
        count: coherent,
        className: 'read-stable',
        hint: 'La lectura visual y el motor cuentan una historia compatible.',
      },
    ];
  }
  private positionPixelMatchLabel(row: PositionPixelMatrixSummary): string {
    const marker = row.label.includes(' · ') ? ' · ' : ' ? ';
    const index = row.label.indexOf(marker);
    return index >= 0 ? row.label.slice(0, index) : 'Selected match';
  }
  positionPixelMoveLabel(row: PositionPixelMatrixSummary): string {
    const marker = row.label.includes(' · ') ? ' · ' : ' ? ';
    const index = row.label.indexOf(marker);
    return index >= 0 ? row.label.slice(index + marker.length) : row.label;
  }
  positionPixelDiagonalSummaryRowText(row: PositionPixelMatrixSummary | null): string {
    if (!row) return 'Sin filas';
    const score = this.positionPixelDecisionScore(row);
    return `${row.playerName} · ${this.positionPixelMoveLabel(row)} · score ${this.fmtDeltaNumber(score)} · xG ${this.fmtDeltaMicro(row.deltaXgFor)}/${this.fmtDeltaMicro(row.deltaXgAgainst)}`;
  }
  positionPixelDiagonalSummaryRowClass(row: PositionPixelMatrixSummary | null, positive = true): string {
    if (!row) return 'delta-neutral';
    const score = this.positionPixelDecisionScore(row);
    return positive ? this.deltaClass(score) : this.deltaClass(-score);
  }
  jumpToPositionPixelRow(row: PositionPixelMatrixSummary | null, filter: PositionPixelReadFilter = 'diagonal'): void {
    if (!row) return;
    const key = this.positionPixelRowKey(row);
    this.positionPixelReadFilter.set(filter);
    this.selectedPositionPixelRowKey.set(key);
    const scrollToTarget = (attempt = 0) => {
      const target = document.querySelector(`[data-position-row-key="${key}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }
      if (attempt < 5) {
        setTimeout(() => scrollToTarget(attempt + 1), 50);
      }
    };
    setTimeout(() => scrollToTarget(), 0);
  }
  positionPixelRowKey(row: PositionPixelMatrixSummary): string {
    return this.safeDomKey(`${row.playerName}-${row.label}-${row.fromXPercent}-${row.fromYPercent}-${row.targetXPercent}-${row.targetYPercent}`);
  }
  private pickWorstPositionPixelReviewRow(rows: PositionPixelMatrixSummary[]): PositionPixelMatrixSummary | null {
    if (rows.length === 0) return null;
    return rows.reduce((candidate, row) => {
      const rowImpact = this.positionPixelImpactScore(row);
      const candidateImpact = this.positionPixelImpactScore(candidate);
      if (rowImpact !== candidateImpact) return rowImpact > candidateImpact ? row : candidate;
      return this.positionPixelDecisionScore(row) < this.positionPixelDecisionScore(candidate) ? row : candidate;
    }, rows[0]);
  }
  private safeDomKey(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  private positionPixelIsDiagonalMove(row: PositionPixelMatrixSummary): boolean {
    return Math.abs(row.targetXPercent - row.fromXPercent) >= 4
      && Math.abs(row.targetYPercent - row.fromYPercent) >= 4;
  }
  private positionPixelIsBigMove(row: PositionPixelMatrixSummary): boolean {
    return this.positionPixelMoveLabel(row) === 'big zone cross' || this.positionPixelDistance(row) > 6.0;
  }
  private positionPixelIsLineBreak(row: PositionPixelMatrixSummary): boolean {
    return this.positionPixelVisualLine(row.fromYPercent) !== this.positionPixelVisualLine(row.targetYPercent);
  }
  private positionPixelDecisionScore(row: PositionPixelMatrixSummary): number {
    const shotDiff = row.deltaShotsFor - row.deltaShotsAgainst;
    return row.deltaXgDiff
      + shotDiff * 0.015
      + row.deltaPossessionFor * 0.0015
      + this.positionPixelDefensiveGainScore(row) * 0.020
      - this.positionPixelDefensiveRiskScore(row) * 0.020;
  }
  private toPositionPixelMatchSmokeSummary(
    matchLabel: string,
    rows: PositionPixelMatrixSummary[]
  ): PositionPixelMatchSmokeSummary {
    const readCounts: Record<PositionPixelReadLevel, number> = {
      stable: 0,
      visible: 0,
      strong: 0,
      check: 0,
    };
    let microReview = 0;
    let visibleRisk = 0;
    let visibleAttackLoss = 0;
    let bigBadTradeoff = 0;
    let fivePxRiskRows = 0;
    let fivePxCostRows = 0;
    let bigMoveRows = 0;
    let bigMoveStrongRows = 0;
    let signalSum = 0;
    let worst: PositionPixelMatrixSummary | null = null;
    let worstFivePxRiskSignal = 0;
    let fivePxRiskSignalSum = 0;
    for (const row of rows) {
      readCounts[this.positionPixelReadLevel(row)] += 1;
      const tacticalRead = this.positionPixelTacticalRead(row);
      const moveLabel = this.positionPixelMoveLabel(row);
      const isBigMove = this.positionPixelIsBigMove(row);
      if (tacticalRead === 'Micro review') microReview += 1;
      if (tacticalRead === 'Visible risk') visibleRisk += 1;
      if (tacticalRead === 'Visible attack loss') visibleAttackLoss += 1;
      if (tacticalRead === 'Bad tradeoff') bigBadTradeoff += 1;
      if (!isBigMove && tacticalRead === 'Visible risk') {
        fivePxRiskRows += 1;
        worstFivePxRiskSignal = Math.max(worstFivePxRiskSignal, row.signalScore);
        fivePxRiskSignalSum += row.signalScore;
      }
      if (!isBigMove && tacticalRead === 'Visible attack loss') fivePxCostRows += 1;
      if (isBigMove) {
        bigMoveRows += 1;
        if (this.positionPixelReadLevel(row) === 'strong' || tacticalRead === 'Bad tradeoff' || tacticalRead === 'Risk') {
          bigMoveStrongRows += 1;
        }
      }
      signalSum += row.signalScore;
      if (!worst || row.signalScore > worst.signalScore) {
        worst = row;
      }
    }
    const avgSignal = rows.length > 0 ? signalSum / rows.length : 0;
    const avgFivePxRiskSignal = fivePxRiskRows > 0 ? fivePxRiskSignalSum / fivePxRiskRows : 0;
    const worstSignal = worst?.signalScore ?? 0;
    const verdict = this.positionPixelMatchSmokeVerdict(
      readCounts,
      microReview,
      visibleRisk,
      visibleAttackLoss,
      bigBadTradeoff,
      fivePxRiskRows,
      fivePxCostRows,
      bigMoveRows,
      bigMoveStrongRows,
      avgSignal,
      worstSignal,
      worstFivePxRiskSignal,
      avgFivePxRiskSignal
    );
    const worstMove = worst ? this.positionPixelMoveLabel(worst) : 'No rows';
    return {
      matchLabel,
      rows: rows.length,
      stable: readCounts.stable,
      visible: readCounts.visible,
      strong: readCounts.strong,
      check: readCounts.check,
      microReview,
      visibleRisk,
      visibleAttackLoss,
      bigBadTradeoff,
      fivePxRiskRows,
      fivePxCostRows,
      bigMoveRows,
      bigMoveStrongRows,
      avgSignal,
      worstSignal,
      worstMove,
      worstTacticalRead: worst ? `${worst.playerName} - ${worstMove} - ${this.positionPixelTacticalRead(worst)}` : 'No rows',
      dominantCause: this.positionPixelDominantCause(rows),
      verdict,
      verdictClass: this.positionPixelMatchSmokeVerdictClass(verdict),
    };
  }
  private positionPixelMatchSmokeVerdict(
    readCounts: Record<PositionPixelReadLevel, number>,
    microReview: number,
    visibleRisk: number,
    visibleAttackLoss: number,
    bigBadTradeoff: number,
    fivePxRiskRows: number,
    fivePxCostRows: number,
    bigMoveRows: number,
    bigMoveStrongRows: number,
    avgSignal: number,
    worstSignal: number,
    worstFivePxRiskSignal = worstSignal,
    avgFivePxRiskSignal = avgSignal
  ): string {
    if (fivePxRiskRows >= 6 && (avgFivePxRiskSignal >= 0.075 || worstFivePxRiskSignal >= 0.160)) return 'Repeated 5px bias';
    if (fivePxRiskRows >= 3 && (avgFivePxRiskSignal >= 0.065 || worstFivePxRiskSignal >= 0.160)) return '5px visible pattern';
    if (bigMoveRows > 0 && bigMoveStrongRows === bigMoveRows && readCounts.strong <= bigMoveStrongRows) return 'Big tactical move';
    if (bigBadTradeoff > 0 || readCounts.strong > 0) return 'Strong review';
    if (readCounts.check > 1 || microReview > 1) return 'Needs seeds';
    if (visibleRisk >= 4) return 'Visible risk pattern';
    if (fivePxCostRows >= 4 || visibleRisk + visibleAttackLoss >= 4) return 'Visible cost pattern';
    if (readCounts.visible > 0) return 'Playable variation';
    if (bigMoveRows > 0) return 'Big neutral move';
    return 'Stable';
  }
  private positionPixelMatchSmokeVerdictClass(verdict: string): string {
    if (verdict === 'Repeated 5px bias') return 'read-strong';
    if (verdict === '5px visible pattern') return 'read-check';
    if (verdict === 'Big tactical move') return 'read-visible';
    if (verdict === 'Strong review') return 'read-strong';
    if (verdict === 'Needs seeds' || verdict === 'Visible risk pattern') return 'read-check';
    if (verdict === 'Visible cost pattern') return 'read-visible';
    if (verdict === 'Playable variation') return 'read-visible';
    if (verdict === 'Big neutral move') return 'delta-neutral';
    return 'read-stable';
  }
  private toPositionPixelPlayerSmokeSummary(
    key: string,
    rows: PositionPixelMatrixSummary[]
  ): PositionPixelPlayerSmokeSummary {
    let fivePxRiskRows = 0;
    let fivePxCostRows = 0;
    let bigMoveRows = 0;
    let bigMoveStrongRows = 0;
    let signalSum = 0;
    let worst: PositionPixelMatrixSummary | null = null;
    for (const row of rows) {
      const tacticalRead = this.positionPixelTacticalRead(row);
      const moveLabel = this.positionPixelMoveLabel(row);
      const isBigMove = this.positionPixelIsBigMove(row);
      if (!isBigMove && tacticalRead === 'Visible risk') {
        fivePxRiskRows += 1;
      }
      if (!isBigMove && tacticalRead === 'Visible attack loss') {
        fivePxCostRows += 1;
      }
      if (isBigMove) {
        bigMoveRows += 1;
        if (this.positionPixelReadLevel(row) === 'strong' || tacticalRead === 'Bad tradeoff' || tacticalRead === 'Risk') {
          bigMoveStrongRows += 1;
        }
      }
      signalSum += row.signalScore;
      if (!worst || row.signalScore > worst.signalScore) {
        worst = row;
      }
    }
    const first = rows[0];
    const avgSignal = rows.length > 0 ? signalSum / rows.length : 0;
    const worstSignal = worst?.signalScore ?? 0;
    const verdict = this.positionPixelPlayerSmokeVerdict(fivePxRiskRows, bigMoveRows, bigMoveStrongRows, avgSignal, worstSignal);
    return {
      key,
      playerName: first?.playerName ?? key,
      playerPosition: first?.playerPosition ?? '-',
      rows: rows.length,
      fivePxRiskRows,
      fivePxCostRows,
      bigMoveRows,
      bigMoveStrongRows,
      avgSignal,
      worstSignal,
      worstMove: worst ? this.positionPixelMoveLabel(worst) : 'No rows',
      dominantCause: this.positionPixelDominantCause(rows),
      channelBreakdownTrend: this.positionPixelChannelBreakdownTrend(rows),
      verdict,
      verdictClass: this.positionPixelMatchSmokeVerdictClass(verdict),
    };
  }
  private positionPixelPlayerSmokeVerdict(
    fivePxRiskRows: number,
    bigMoveRows: number,
    bigMoveStrongRows: number,
    avgSignal: number,
    worstSignal: number
  ): string {
    if (fivePxRiskRows >= 6 && (avgSignal >= 0.075 || worstSignal >= 0.160)) return 'Repeated 5px bias';
    if (fivePxRiskRows >= 3 && (avgSignal >= 0.065 || worstSignal >= 0.160)) return '5px visible pattern';
    if (bigMoveStrongRows > 0) return 'Big tactical move';
    if (bigMoveRows > 0) return 'Big neutral move';
    return 'Stable';
  }
  private positionPixelPlayerSmokeSeverity(item: PositionPixelPlayerSmokeSummary): number {
    if (item.verdict === 'Repeated 5px bias') return 5;
    if (item.verdict === '5px visible pattern') return 4;
    if (item.verdict === 'Strong review') return 3;
    if (item.verdict === 'Big tactical move') return 2;
    return 1;
  }
  private positionPixelDominantCause(rows: PositionPixelMatrixSummary[]): string {
    if (rows.length === 0) return 'No rows';
    const totals = rows.reduce(
      (acc, row) => {
        acc.attackGain += this.positionPixelAttackGainScore(row);
        acc.attackLoss += this.positionPixelAttackLossScore(row);
        acc.defensiveRisk += this.positionPixelDefensiveRiskScore(row);
        acc.defensiveGain += this.positionPixelDefensiveGainScore(row);
        acc.wideShift += Math.abs(row.deltaLeftWideXgFor)
          + Math.abs(row.deltaRightWideXgFor)
          + Math.abs(row.deltaLeftWideXgAgainst)
          + Math.abs(row.deltaRightWideXgAgainst);
        acc.possession += Math.abs(row.deltaPossessionFor) * 0.10;
        return acc;
      },
      {
        attackGain: 0,
        attackLoss: 0,
        defensiveRisk: 0,
        defensiveGain: 0,
        wideShift: 0,
        possession: 0,
      }
    );
    const entries = [
      ['attack+', totals.attackGain],
      ['attack-', totals.attackLoss],
      ['risk+', totals.defensiveRisk],
      ['def+', totals.defensiveGain],
      ['wide', totals.wideShift],
      ['poss', totals.possession],
    ] as const;
    const [label, value] = entries.reduce((best, item) => item[1] > best[1] ? item : best, entries[0]);
    if (value < 0.75) return 'low/noise';
    return `${label} ${value.toFixed(1)}`;
  }
  private positionPixelChannelBreakdownTrend(rows: PositionPixelMatrixSummary[]): string {
    if (rows.length === 0) return 'A= C= Cob=';
    const totals = rows.reduce(
      (acc, row) => {
        const breakdown = this.positionPixelChannelBreakdown(row);
        acc.threat += breakdown.threat;
        acc.connection += breakdown.connection;
        acc.coverage += breakdown.coverage;
        return acc;
      },
      { threat: 0, connection: 0, coverage: 0 }
    );
    const count = rows.length || 1;
    const threat = totals.threat / count;
    const connection = totals.connection / count;
    const coverage = totals.coverage / count;
    return `A${this.positionPixelChannelSign(threat)} C${this.positionPixelChannelSign(connection)} Cob${this.positionPixelChannelSign(coverage)}`;
  }
  positionPixelHasChecks(): boolean {
    return this.positionPixelMatrixRows().some((row) => this.positionPixelReadLevel(row) === 'check');
  }
  private positionPixelReadLevel(row: PositionPixelMatrixSummary): PositionPixelReadLevel {
    const distance = this.positionPixelDistance(row);
    const xg = Math.max(Math.abs(row.deltaXgFor), Math.abs(row.deltaXgAgainst), Math.abs(row.deltaXgDiff));
    const shots = Math.max(Math.abs(row.deltaShotsFor), Math.abs(row.deltaShotsAgainst));
    const poss = Math.abs(row.deltaPossessionFor);
    const zoneShots = Math.max(
      Math.abs(row.deltaCentralShotsFor) + Math.abs(row.deltaWideShotsFor) + Math.abs(row.deltaLongShotsFor),
      Math.abs(row.deltaCentralShotsAgainst) + Math.abs(row.deltaWideShotsAgainst) + Math.abs(row.deltaLongShotsAgainst),
    );
    const sideXg = Math.max(
      Math.abs(row.deltaLeftWideXgFor),
      Math.abs(row.deltaRightWideXgFor),
      Math.abs(row.deltaLeftWideXgAgainst),
      Math.abs(row.deltaRightWideXgAgainst),
    );
    if (distance <= 1.25) {
      return row.signalScore >= 0.050 ? 'check' : 'stable';
    }
    if (distance <= 6.0) {
      const tacticalRead = this.positionPixelTacticalRead(row);
      if (tacticalRead.startsWith('Visible') && tacticalRead !== 'Visible small') return 'visible';
      if (xg > 0.22 || sideXg > 0.12 || shots > 4.0 || poss > 4.0 || zoneShots > 5.0) return 'check';
      if (xg > 0.06 || sideXg > 0.035 || shots > 1.0 || poss > 1.0 || zoneShots > 1.5) return 'visible';
      return 'stable';
    }
    if (xg > 0.22 || sideXg > 0.12 || shots > 4.0 || poss > 4.0 || zoneShots > 5.0) return 'strong';
    if (xg > 0.06 || sideXg > 0.035 || shots > 1.0 || poss > 1.0 || zoneShots > 1.5) return 'visible';
    return 'stable';
  }
  private positionPixelReadSeverity(row: PositionPixelMatrixSummary): number {
    switch (this.positionPixelReadLevel(row)) {
      case 'check':
        return 4;
      case 'strong':
        return 3;
      case 'visible':
        return 2;
      default:
        return 1;
    }
  }
  private positionPixelImpactScore(row: PositionPixelMatrixSummary): number {
    return (
      Math.abs(row.deltaXgFor) * 10 +
      Math.abs(row.deltaXgAgainst) * 10 +
      Math.abs(row.deltaXgDiff) * 8 +
      Math.abs(row.deltaShotsFor) +
      Math.abs(row.deltaShotsAgainst) +
      Math.abs(row.deltaPossessionFor) * 0.4 +
      (Math.abs(row.deltaCentralShotsFor) + Math.abs(row.deltaWideShotsFor) + Math.abs(row.deltaLongShotsFor)) * 0.5 +
      (Math.abs(row.deltaCentralShotsAgainst) + Math.abs(row.deltaWideShotsAgainst) + Math.abs(row.deltaLongShotsAgainst)) * 0.5 +
      (Math.abs(row.deltaLeftWideXgFor) + Math.abs(row.deltaRightWideXgFor)
        + Math.abs(row.deltaLeftWideXgAgainst) + Math.abs(row.deltaRightWideXgAgainst)) * 8
    );
  }
  private positionPixelAttackGainScore(row: PositionPixelMatrixSummary): number {
    return Math.max(0, row.deltaXgFor) * 10
      + Math.max(0, row.deltaShotsFor) * 0.75
      + Math.max(0, row.deltaPossessionFor) * 0.25
      + Math.max(0, row.deltaCentralShotsFor + row.deltaWideShotsFor + row.deltaLongShotsFor) * 0.35
      + Math.max(0, row.deltaLeftWideXgFor + row.deltaRightWideXgFor) * 8;
  }
  private positionPixelAttackLossScore(row: PositionPixelMatrixSummary): number {
    return Math.max(0, -row.deltaXgFor) * 10
      + Math.max(0, -row.deltaShotsFor) * 0.75
      + Math.max(0, -row.deltaPossessionFor) * 0.25
      + Math.max(0, -(row.deltaCentralShotsFor + row.deltaWideShotsFor + row.deltaLongShotsFor)) * 0.35
      + Math.max(0, -(row.deltaLeftWideXgFor + row.deltaRightWideXgFor)) * 8;
  }
  private positionPixelDefensiveRiskScore(row: PositionPixelMatrixSummary): number {
    return Math.max(0, row.deltaXgAgainst) * 12
      + Math.max(0, row.deltaShotsAgainst) * 0.85
      + Math.max(0, row.deltaCentralShotsAgainst + row.deltaWideShotsAgainst + row.deltaLongShotsAgainst) * 0.45
      + Math.max(0, row.deltaCentralXgAgainst + row.deltaWideXgAgainst + row.deltaLongXgAgainst) * 8
      + Math.max(0, row.deltaLeftWideXgAgainst + row.deltaRightWideXgAgainst) * 8;
  }
  private positionPixelDefensiveGainScore(row: PositionPixelMatrixSummary): number {
    return Math.max(0, -row.deltaXgAgainst) * 12
      + Math.max(0, -row.deltaShotsAgainst) * 0.85
      + Math.max(0, -(row.deltaCentralShotsAgainst + row.deltaWideShotsAgainst + row.deltaLongShotsAgainst)) * 0.45
      + Math.max(0, -(row.deltaLeftWideXgAgainst + row.deltaRightWideXgAgainst)) * 8;
  }
  private positionPixelDistance(row: PositionPixelMatrixSummary): number {
    return Math.hypot(row.targetXPercent - row.fromXPercent, row.targetYPercent - row.fromYPercent);
  }
  private scenarioBaseline(): ScenarioMatrixRow | null {
    return this.scenarioMatrixResults()[0] ?? null;
  }
  private goalDifference(row: ScenarioMatrixRow): number {
    return this.scenarioGoalsFor(row) - this.scenarioGoalsAgainst(row);
  }
  private selectedUserTeamIsHome(): boolean {
    const match = this.selectedMatch();
    const userTeam = this.userTeamName();
    return !!match && !!userTeam && match.homeTeamName === userTeam;
  }
  fmtPct(value: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '?';
    }
    return `${Math.round(value)}%`;
  }
  formationMatrixDisabledReason(): string {
    if (this.mutationInFlight()) {
      return 'Hay una prueba corriendo; espera a que termine.';
    }
    if (!this.selectedMatchId()) {
      return 'Selecciona un partido completado del Panel C.';
    }
    return `Ejecutar matriz de formaciones para ${this.controlledTeamDisplayName()}.`;
  }
  /**
   * Replay-lab shortcut: run the selected match once per formation with the
   * same seed, then render the score/possession/shot/xG/zone table in Panel E.
   *
   * V25D99.59: uses the backend in-memory formation-matrix endpoint instead
   * of 12 full replay+detail-persist cycles. The backend still applies the
   * real formation label plus canonical visual slots, so the engine sees the
   * same geometry contract as the squad modal without paying the Redis detail
   * cost for every row.
   */
  onRunFormationMatrix(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const careerId = this.careerId();
    if (!careerId) {
      this.snackBar.open('Active career id is not available.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const seed = this.seedInputModel;
    this.formationReplayResults.set([]);
    this.mutationInFlight.set(true);
    const runMatrix$ = this.controlledTeamSideModel === 'USER'
      ? this.harness.getCurrentLineup().pipe(
        switchMap((originalLineup) => {
          const originalFormation =
            originalLineup?.formation || this.selectedFormationModel || null;
          const originalPlayerIds =
            originalLineup?.players?.map((p) => p.playerId).filter(Boolean) ?? [];
          const originalSlots = originalLineup?.slots ?? [];
          if (originalPlayerIds.length !== 11) {
            throw new Error(
              `Formation matrix needs exactly 11 current lineup players, got ${originalPlayerIds.length}.`
            );
          }
          return this.harness.setStyle(this.selectedStyleModel).pipe(
            switchMap(() => this.harness.runFormationMatrix(matchId, seed, this.controlledTeamSideModel)),
            switchMap((rows) => {
              const mappedRows = rows.map((row) => this.buildFormationReplayResultFromMatrix(row));
              this.formationReplayResults.set(mappedRows);
              if (!originalFormation) {
                return of(mappedRows);
              }
              return this.harness.manualSelectLineup(
                originalFormation,
                originalPlayerIds,
                originalSlots
              ).pipe(map(() => mappedRows));
            })
          );
        })
      )
      : this.harness.setStyle(this.selectedStyleModel).pipe(
        switchMap(() => this.harness.runFormationMatrix(matchId, seed, this.controlledTeamSideModel)),
        map((rows) => {
          const mappedRows = rows.map((row) => this.buildFormationReplayResultFromMatrix(row));
          this.formationReplayResults.set(mappedRows);
          return mappedRows;
        })
      );
    runMatrix$.subscribe({
      next: () => {
        // The backend returns the complete matrix in one response.
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run formation matrix'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        this.mutationInFlight.set(false);
        if (this.controlledTeamSideModel === 'USER') {
          this.refreshLineupContext();
        }
        this.snackBar.open(
          `Formation matrix completed (${this.formationReplayResults().length} formations).`,
          'OK',
          { duration: 3000 }
        );
        this.markReplayAnalysisReady('Formation matrix lista en Panel E.');
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }
  onRunFormationMatrixSummary(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    this.scenarioMatrixSummarySeedCount.set(seedCount);
    this.clearFormationAverageResults();
    this.analysisReadyMessage.set(`Formation averages corriendo: ${seedCount} seeds por formacion...`);
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel))
    ).subscribe({
      next: (rows) => {
        const safeRows = rows ?? [];
        this.formationMatrixSummaryResults.set(safeRows);
        this.snackBar.open(
          `Formation averages completed (${safeRows.length} formations ? ${seedCount} seeds).`,
          'OK',
          { duration: 3000 }
        );
        if (safeRows.length > 0) {
          this.markReplayAnalysisReady('Formation averages listas en Panel E.');
        } else {
          this.analysisReadyMessage.set('Formation averages no devolvio filas. Revisar endpoint/datos del partido antes de leer impacto de formaciones.');
        }
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run formation averages'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        this.mutationInFlight.set(false);
      },
    });
  }
  onRunProfessionalSmoke(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.canRunScenarioSummaryForControlledSide()) {
      this.snackBar.open('Elegí Mi equipo, Local o Visitante válido para correr el smoke profesional.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const formationSeedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    const scenarioSeedCount = this.scenarioMatrixSmokeSeedCount();
    const controlledSide = this.controlledTeamSideModel;
    const controlledName = this.controlledTeamDisplayName();
    this.clearFormationAverageResults();
    this.professionalSmokeSummary.set(null);
    this.scenarioMatrixSummaryResults.set([]);
    this.scenarioMatrixSummarySeedCount.set(formationSeedCount);
    this.analysisReadyMessage.set(
      `Professional smoke corriendo para ${controlledName}: formaciones ${formationSeedCount} seeds + escenarios ${scenarioSeedCount} seeds...`
    );
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => forkJoin({
        formationRows: this.harness.runFormationMatrixSummary(matchId, seedStart, formationSeedCount, controlledSide),
        scenarioRows: this.harness.runScenarioMatrixSummary(matchId, seedStart, scenarioSeedCount, 'ALL', controlledSide),
      }))
    ).subscribe({
      next: ({ formationRows, scenarioRows }) => {
        const safeFormationRows = formationRows ?? [];
        const safeScenarioRows = scenarioRows ?? [];
        this.formationMatrixSummaryResults.set(safeFormationRows);
        this.scenarioMatrixSummaryResults.set(safeScenarioRows);
        const userScope = controlledSide === 'USER';
        this.professionalSmokeSummary.set({
          controlledTeam: controlledName,
          scope: controlledSide,
          formationRows: safeFormationRows.length,
          scenarioRows: safeScenarioRows.length,
          pixelRows: 0,
          swapRows: 0,
          formationSeedCount,
          scenarioSeedCount,
          included: [
            `Formation avg: ${safeFormationRows.length} formaciones x ${formationSeedCount} seeds`,
            `Scenario smoke: ${safeScenarioRows.length} escenarios x ${scenarioSeedCount} seeds`,
          ],
          skipped: userScope
            ? [
                'Píxeles y swaps se corren desde sus botones dedicados para preservar evidencia detallada.',
                'Compare baseline/live queda disponible en Open Match Compare.',
              ]
            : [
                'Píxeles y swaps requieren lineup editable de Mi equipo; no se simulan para Local/Visitante.',
                'Compare baseline/live queda disponible en Open Match Compare.',
              ],
          read: `${controlledName}: ${safeFormationRows.length} formaciones · ${safeScenarioRows.length} escenarios · scope ${controlledSide}.`,
        });
        this.markReplayAnalysisReady(
          `Professional smoke listo para ${controlledName}: ${safeFormationRows.length} formaciones · ${safeScenarioRows.length} escenarios.`
        );
        this.snackBar.open(
          `Professional smoke complete: ${safeFormationRows.length} formations, ${safeScenarioRows.length} scenarios.`,
          'OK',
          { duration: 4500 }
        );
      },
      error: (err) => {
        this.analysisReadyMessage.set(this.fmtError(err, 'Professional smoke falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run professional smoke'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
      },
    });
  }
  onRunProfessionalSmokeFull(): void {
    if (this.controlledTeamSideModel !== 'USER' || !this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('El smoke full usa píxeles y swaps del lineup editable; poné Controlar en Mi equipo.', 'OK', { duration: 4500 });
      return;
    }
    if (!this.selectedMatchId()) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const runId = ++this.professionalSmokeFullRunId;
    this.professionalSmokeFullPixelRows = 0;
    this.guardProfessionalSmokeFullTimeout(runId);
    this.onRunProfessionalSmoke();
    this.waitForProfessionalSmokeStep('formation/scenario', () => {
      this.runProfessionalSmokePixelStage(() => {
        if (runId !== this.professionalSmokeFullRunId) return;
        this.professionalSmokeFullPixelRows = this.positionPixelMatrixRows().length;
        this.onRunPlayerSwapBattery({ preservePositionPixels: true });
        this.waitForProfessionalSmokeStep('player swaps', () => {
          if (runId !== this.professionalSmokeFullRunId) return;
          this.finalizeProfessionalSmokeFullSummary();
        });
      });
    });
  }
  private guardProfessionalSmokeFullTimeout(runId: number): void {
    window.setTimeout(() => {
      if (runId !== this.professionalSmokeFullRunId || !this.mutationInFlight()) return;
      const controlledName = this.controlledTeamDisplayName();
      const pixelRows = this.professionalSmokeFullPixelRows || this.positionPixelMatrixRows().length;
      const swapRows = this.playerSwapBatterySummaries().length;
      const formationRows = this.formationMatrixSummaryResults().length;
      const scenarioRows = this.scenarioMatrixSummaryResults().length;
      this.professionalSmokeFullRunId++;
      this.mutationInFlight.set(false);
      this.professionalSmokeSummary.set({
        controlledTeam: controlledName,
        scope: 'USER',
        formationRows,
        scenarioRows,
        pixelRows,
        swapRows,
        formationSeedCount: this.scenarioMatrixSummaryEffectiveSeedCount(),
        scenarioSeedCount: this.scenarioMatrixSmokeSeedCount(),
        included: [
          `Formation avg: ${formationRows} formaciones`,
          `Scenario smoke: ${scenarioRows} escenarios`,
          `Pixel sensitivity: ${pixelRows} filas`,
          `Player swap battery: ${swapRows} cambios`,
        ],
        skipped: ['Smoke full cortado por timeout defensivo; revisar etapa lenta antes de calibrar.'],
        read: `${controlledName}: smoke full parcial por timeout · ${formationRows} formaciones · ${scenarioRows} escenarios · ${pixelRows} píxeles · ${swapRows} swaps.`,
      });
      this.analysisReadyMessage.set('Professional smoke full cortado por timeout defensivo. Resultados parciales abajo.');
      this.snackBar.open('Professional smoke full timeout: resultados parciales disponibles.', 'OK', { duration: 6000 });
    }, 180_000);
  }
  private runProfessionalSmokePixelStage(onComplete: () => void): void {
    const seedCount = Math.max(20, Math.min(30, Math.round(this.playerSwapSeedCountModel || 20)));
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY) => this.positionMovementPresets(fromX, fromY)
        .filter((preset) => [
          '5px forward',
          '5px deeper',
          '5px wide',
          '5px center',
          'big zone cross',
        ].includes(preset.label)),
      'Professional smoke pixel sweep',
      null,
      null,
      null,
      true,
      'ALL',
      onComplete
    );
  }
  private waitForProfessionalSmokeStep(label: string, next: () => void, attempts = 0): void {
    window.setTimeout(() => {
      if (attempts > 240) {
        this.snackBar.open(`Professional smoke full: timeout esperando ${label}.`, 'OK', { duration: 5000 });
        return;
      }
      if (this.mutationInFlight()) {
        this.waitForProfessionalSmokeStep(label, next, attempts + 1);
        return;
      }
      next();
    }, 500);
  }
  private finalizeProfessionalSmokeFullSummary(): void {
    const current = this.professionalSmokeSummary();
    const controlledName = this.controlledTeamDisplayName();
    const pixelRows = this.professionalSmokeFullPixelRows || this.positionPixelMatrixRows().length;
    const swapRows = this.playerSwapBatterySummaries().length;
    const baseIncluded = current?.included ?? [];
    this.professionalSmokeSummary.set({
      controlledTeam: current?.controlledTeam ?? controlledName,
      scope: 'USER',
      formationRows: current?.formationRows ?? this.formationMatrixSummaryResults().length,
      scenarioRows: current?.scenarioRows ?? this.scenarioMatrixSummaryResults().length,
      pixelRows,
      swapRows,
      formationSeedCount: current?.formationSeedCount ?? this.scenarioMatrixSummaryEffectiveSeedCount(),
      scenarioSeedCount: current?.scenarioSeedCount ?? this.scenarioMatrixSmokeSeedCount(),
      included: [
        ...baseIncluded,
        `Pixel sensitivity: ${pixelRows} filas`,
        `Player swap battery: ${swapRows} cambios`,
      ],
      skipped: ['Compare baseline/live queda disponible en Open Match Compare.'],
      read: `${controlledName}: smoke full · ${current?.formationRows ?? this.formationMatrixSummaryResults().length} formaciones · ${current?.scenarioRows ?? this.scenarioMatrixSummaryResults().length} escenarios · ${pixelRows} píxeles · ${swapRows} swaps.`,
    });
    this.markReplayAnalysisReady(`Professional smoke full listo para ${controlledName}: ${pixelRows} píxeles · ${swapRows} swaps.`);
    this.snackBar.open(`Professional smoke full complete: ${pixelRows} pixel rows, ${swapRows} swaps.`, 'OK', { duration: 4500 });
  }
  onRunLowBlockLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Low block lab necesita un partido de tu equipo para modificar el XI.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.lowBlockLabRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`5-4-1 low block lab corriendo: alta/base/baja x ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        restore = {
          formation: originalLineup.formation ?? this.selectedFormationModel ?? '4-4-2',
          playerIds: this.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return this.harness.autoSelectLineup('5-4-1');
      }),
      switchMap((lineup541) => {
        const variants = [
          { variant: 'high' as const, label: 'Alta', y: 50 },
          { variant: 'base' as const, label: 'Base', y: 68 },
          { variant: 'low' as const, label: 'Baja', y: 76 },
        ];
        const playerIds = this.lineupPlayerIdsFromSlots(this.buildLineupSlots(lineup541));
        return from(variants).pipe(
          concatMap((variant) => {
            const slots = this.lowBlockVariantSlots(lineup541, variant.y);
            return this.harness.manualSelectLineup('5-4-1', playerIds, slots).pipe(
              switchMap(() => this.harness.runMatchPreviewSummary(
                matchId,
                seedStart,
                seedCount,
                this.controlledTeamSideModel
              )),
              map((summary) => ({ variant, summary }))
            );
          }),
          toArray()
        );
      }),
      switchMap((items) => {
        const rows = this.buildLowBlockLabRows(items);
        this.lowBlockLabRows.set(rows);
        if (!restore) return of(rows);
        return this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(
          map(() => rows)
        );
      })
    ).subscribe({
      next: (rows) => {
        this.markReplayAnalysisReady(`5-4-1 low block lab listo (${rows.length} variantes).`);
      },
      error: (err) => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, '5-4-1 low block lab falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run low block lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.refreshLineupContext();
        this.snackBar.open('5-4-1 low block lab completed.', 'OK', { duration: 3500 });
      },
    });
  }
  onRunBackFiveTransitionLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('5-3-2 transition lab necesita un partido de tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.backFiveTransitionLabRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`5-3-2 transition lab corriendo: carrileros bajos/base/altos x ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        restore = {
          formation: originalLineup.formation ?? this.selectedFormationModel ?? '4-4-2',
          playerIds: this.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return this.harness.autoSelectLineup('5-3-2');
      }),
      switchMap((lineup532) => {
        const variants = [
          { variant: 'low' as const, label: 'Bajos', y: 76 },
          { variant: 'base' as const, label: 'Base', y: 63 },
          { variant: 'high' as const, label: 'Altos', y: 46 },
        ];
        const playerIds = this.lineupPlayerIdsFromSlots(this.buildLineupSlots(lineup532));
        return from(variants).pipe(
          concatMap((variant) => {
            const slots = this.backFiveWingbackVariantSlots(lineup532, variant.y);
            return this.harness.manualSelectLineup('5-3-2', playerIds, slots).pipe(
              switchMap(() => this.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel)),
              map((summary) => ({ variant, summary }))
            );
          }),
          toArray()
        );
      }),
      switchMap((items) => {
        const rows = this.buildBackFiveTransitionLabRows(items);
        this.backFiveTransitionLabRows.set(rows);
        if (!restore) return of(rows);
        return this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(map(() => rows));
      })
    ).subscribe({
      next: (rows) => this.markReplayAnalysisReady(`5-3-2 transition lab listo (${rows.length} variantes).`),
      error: (err) => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, '5-3-2 transition lab falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run 5-3-2 transition lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.refreshLineupContext();
        this.snackBar.open('5-3-2 transition lab completed.', 'OK', { duration: 3500 });
      },
    });
  }
  onRunBackFiveFamilyLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Línea de 5 family lab necesita un partido de tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.backFiveFamilyLabRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Línea de 5 family lab corriendo: 5-4-1 / 5-3-2 / 3-5-2 x ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    const plans = [
      {
        key: 'low-block' as const,
        label: 'Bloque bajo',
        formation: '5-4-1',
        visualPlan: '2da línea y76',
        slotsFor: (lineup: LineupDTO) => this.lowBlockVariantSlots(lineup, 76),
      },
      {
        key: 'transition' as const,
        label: 'Transición',
        formation: '5-3-2',
        visualPlan: 'carrileros y63',
        slotsFor: (lineup: LineupDTO) => this.backFiveWingbackVariantSlots(lineup, 63, '5-3-2'),
      },
      {
        key: 'wingback-control' as const,
        label: 'Carrileros altos',
        formation: '3-5-2',
        visualPlan: 'carrileros y46',
        slotsFor: (lineup: LineupDTO) => this.backFiveWingbackVariantSlots(lineup, 46, '3-5-2'),
      },
    ];
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        restore = {
          formation: originalLineup.formation ?? this.selectedFormationModel ?? '4-4-2',
          playerIds: this.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return from(plans).pipe(
          concatMap((plan) =>
            this.harness.autoSelectLineup(plan.formation).pipe(
              switchMap((lineup) => {
                const playerIds = this.lineupPlayerIdsFromSlots(this.buildLineupSlots(lineup));
                const slots = plan.slotsFor(lineup);
                return this.harness.manualSelectLineup(plan.formation, playerIds, slots);
              }),
              switchMap(() => this.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel)),
              map((summary) => ({
                key: plan.key,
                label: plan.label,
                formation: plan.formation,
                visualPlan: plan.visualPlan,
                summary,
              }))
            )
          ),
          toArray()
        );
      }),
      switchMap((items) => {
        const rows = this.buildBackFiveFamilyLabRows(items);
        this.backFiveFamilyLabRows.set(rows);
        if (!restore) return of(rows);
        return this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(map(() => rows));
      })
    ).subscribe({
      next: (rows) => this.markReplayAnalysisReady(`Línea de 5 family lab listo (${rows.length} planes).`),
      error: (err) => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Línea de 5 family lab falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run back-five family lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.refreshLineupContext();
        this.snackBar.open('Línea de 5 family lab completed.', 'OK', { duration: 3500 });
      },
    });
  }
  onRunBackFiveAnySideFamilyLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.canRunScenarioSummaryForControlledSide()) {
      this.snackBar.open('Elegí Local, Visitante o un partido donde juegue tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    const scope = this.controlledTeamDisplayName();
    this.backFiveFamilyLabRows.set([]);
    this.backFiveFamilyLabScope.set(scope);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Línea de 5 any side corriendo para ${scope}: ${seedCount} seeds por formación...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel)),
      map((rows) => this.buildBackFiveFamilyRowsFromFormationSummary(rows ?? []))
    ).subscribe({
      next: (rows) => {
        this.backFiveFamilyLabRows.set(rows);
        if (rows.length > 0) {
          this.markReplayAnalysisReady(`Línea de 5 any side listo para ${scope} (${rows.length} planes).`);
        } else {
          this.analysisReadyMessage.set('Línea de 5 any side no devolvió filas para 5-4-1 / 5-3-2 / 3-5-2.');
        }
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Línea de 5 any side falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run any-side back-five family lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.snackBar.open('Línea de 5 any side completed.', 'OK', { duration: 3500 });
      },
    });
  }
  onRunBackFiveContextSmoke(): void {
    const matches = this.scenarioBatteryCandidateMatches();
    if (matches.length === 0) {
      this.snackBar.open('No hay partidos completados para correr Línea de 5 context smoke.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.seedInputModel ?? 12345;
    const seedCount = this.scenarioMatrixSmokeSeedCount();
    const jobs = matches.flatMap((match) => ([
      { match, controlledSide: 'HOME' as const },
      { match, controlledSide: 'AWAY' as const },
    ]));
    const partialRows: Array<BackFiveContextSmokeRow | undefined> = [];
    this.backFiveContextSmokeRows.set([]);
    this.scenarioMatrixSummarySeedCount.set(seedCount);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Línea de 5 context smoke corriendo: ${jobs.length} lecturas x 3 formaciones x ${seedCount} seeds...`);
    window.setTimeout(() => this.scrollToReplayAnalysis(), 0);
    from(jobs).pipe(
      mergeMap((job, index) =>
        this.harness.runFormationMatrixSummary(job.match.matchId, seedStart, seedCount, job.controlledSide).pipe(
          map((rows) => {
            const row = this.buildBackFiveContextSmokeRow(job.match, job.controlledSide, seedStart, seedCount, rows ?? []);
            partialRows[index] = row;
            this.backFiveContextSmokeRows.set(partialRows.filter((item): item is BackFiveContextSmokeRow => !!item));
            return row;
          })
        ),
      2),
      toArray()
    ).subscribe({
      next: () => {
        const rows = partialRows.filter((item): item is BackFiveContextSmokeRow => !!item);
        this.backFiveContextSmokeRows.set(rows);
        this.markReplayAnalysisReady(`Línea de 5 context smoke listo: ${rows.length} lecturas (${matches.length} partidos x local/visitante).`);
        this.snackBar.open(`Línea de 5 context smoke completo: ${rows.length} lecturas.`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Línea de 5 context smoke falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run back-five context smoke'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
      },
    });
  }
  onRunSideMirrorSmoke(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Elegí un partido de tu equipo para preparar labs del rival.', 'OK', { duration: 4500 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    this.sideMirrorSmokeRows.set([]);
    this.sideMirrorSmokeMode.set('real');
    this.analysisReadyMessage.set(`Side mirror smoke corriendo: ${seedCount} seeds por formacion y por lado...`);
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.restoreSideMirrorLabs(matchId)),
      switchMap(() => this.harness.prepareOpponentWeakLeftDefenderLab(matchId)),
      switchMap(() => this.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel)),
      switchMap((weakLeftRows) =>
        this.harness.restoreOpponentWeakLeftDefenderLab(matchId).pipe(
          catchError(() => of(null)),
          map(() => weakLeftRows ?? [])
        )
      ),
      switchMap((weakLeftRows) =>
        this.harness.prepareOpponentWeakRightDefenderLab(matchId).pipe(
          switchMap(() => this.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel)),
          switchMap((weakRightRows) =>
            this.harness.restoreOpponentWeakRightDefenderLab(matchId).pipe(
              catchError(() => of(null)),
              map(() => ({ weakLeftRows, weakRightRows: weakRightRows ?? [] }))
            )
          )
        )
      ),
      switchMap((result) =>
        this.restoreSideMirrorLabs(matchId).pipe(
          catchError(() => of(null)),
          map(() => result)
        )
      )
    ).subscribe({
      next: ({ weakLeftRows, weakRightRows }) => {
        const rows = this.buildSideMirrorSmokeRows(weakLeftRows, weakRightRows);
        this.sideMirrorSmokeRows.set(rows);
        this.realSideMirrorRows.set(rows);
        this.markReplayAnalysisReady(`Side mirror smoke listo: ${rows.length} formaciones comparadas.`);
        this.snackBar.open(`Side mirror smoke completed (${rows.length} formaciones).`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.restoreSideMirrorLabs(matchId).subscribe({ error: () => undefined });
        this.analysisReadyMessage.set(`Side mirror smoke falló: ${this.fmtError(err, 'Failed to run side mirror smoke')}`);
        this.snackBar.open(this.fmtError(err, 'Failed to run side mirror smoke'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
      },
    });
  }
  onRunSideMirrorSyntheticLab(): void {
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    this.sideMirrorSmokeRows.set([]);
    this.sideMirrorSmokeMode.set('synthetic');
    this.analysisReadyMessage.set(`Synthetic mirror lab corriendo: ${seedCount} seeds por formacion y por lado...`);
    this.mutationInFlight.set(true);
    this.harness.runSideMirrorSyntheticLab(seedStart, seedCount).subscribe({
      next: (rows) => {
        const mappedRows = this.mapSyntheticSideMirrorRows(rows ?? []);
        this.sideMirrorSmokeRows.set(mappedRows);
        this.syntheticSideMirrorRows.set(mappedRows);
        this.markReplayAnalysisReady(`Synthetic mirror lab listo: ${(rows ?? []).length} formaciones comparadas.`);
        this.snackBar.open(`Synthetic mirror lab completed (${(rows ?? []).length} formaciones).`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(`Synthetic mirror lab falló: ${this.fmtError(err, 'Failed to run synthetic mirror lab')}`);
        this.snackBar.open(this.fmtError(err, 'Failed to run synthetic mirror lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
      },
    });
  }
  private restoreSideMirrorLabs(matchId: string): Observable<unknown> {
    return this.harness.restoreOpponentWeakLeftDefenderLab(matchId).pipe(
      catchError(() => of(null)),
      switchMap(() => this.harness.restoreOpponentWeakRightDefenderLab(matchId).pipe(catchError(() => of(null))))
    );
  }
  private formationWidthRead(formation: string): FormationWidthRead {
    const positions = this.formationPositionsByName()[formation] ?? [];
    const outfield = positions.filter((position) => String(position.role ?? '').toUpperCase() !== 'GK');
    let leftCount = 0;
    let centerCount = 0;
    let rightCount = 0;
    for (const position of outfield) {
      const lane = this.formationPositionLane(position);
      if (lane === 'LEFT') leftCount++;
      else if (lane === 'RIGHT') rightCount++;
      else centerCount++;
    }
    const wideCount = leftCount + rightCount;
    const widthScore = outfield.length > 0 ? (wideCount * 100) / outfield.length : 0;
    const sideBalance = wideCount > 0 ? 100 - (Math.abs(leftCount - rightCount) * 100 / wideCount) : 0;
    const verdict: FormationWidthRead['verdict'] = wideCount < 2
      ? 'Revisar ancho'
      : sideBalance < 45
        ? 'Revisar lado'
        : widthScore < 35
          ? 'Estrecha'
          : sideBalance < 70
            ? 'Parcial'
            : 'OK';
    const className = verdict === 'OK'
      ? 'read-strong'
      : verdict === 'Parcial' || verdict === 'Estrecha'
        ? 'read-visible'
        : 'read-check';
    return {
      verdict,
      className,
      read: `${verdict}: I${leftCount}/C${centerCount}/D${rightCount} · ancho ${Math.round(widthScore)}% · bal ${Math.round(sideBalance)}%`,
    };
  }
  private formationWingbackRead(formation: string): FormationWingbackRead {
    const positions = this.formationPositionsByName()[formation] ?? [];
    const left = positions.find((position) => String(position.role ?? '').toUpperCase() === 'LWB');
    const right = positions.find((position) => String(position.role ?? '').toUpperCase() === 'RWB');
    if (!left && !right) {
      return {
        verdict: 'Sin carrileros',
        className: 'read-check',
        read: 'Sin LWB/RWB',
      };
    }
    if (!left || !right) {
      return {
        verdict: 'Revisar lado',
        className: 'read-check',
        read: left ? 'Solo LWB' : 'Solo RWB',
      };
    }
    const leftX = Number(left.xPercent);
    const rightX = Number(right.xPercent);
    const leftY = Number(left.yPercent);
    const rightY = Number(right.yPercent);
    const avgY = [leftY, rightY].filter(Number.isFinite).reduce((sum, value) => sum + value, 0) / 2;
    const symmetry = Number.isFinite(leftX) && Number.isFinite(rightX)
      ? 100 - Math.abs((100 - rightX) - leftX)
      : 0;
    const yGap = Number.isFinite(leftY) && Number.isFinite(rightY) ? Math.abs(leftY - rightY) : 99;
    const heightRead = Number.isFinite(avgY)
      ? avgY >= 70
        ? 'bajos'
        : avgY >= 48
          ? 'medios'
          : 'altos'
      : 'altura ?';
    const verdict: FormationWingbackRead['verdict'] = symmetry < 88 || yGap > 8
      ? 'Revisar lado'
      : Number.isFinite(avgY) && (avgY < 44 || avgY > 82)
        ? 'Revisar altura'
        : 'OK';
    const className = verdict === 'OK'
      ? 'read-strong'
      : verdict === 'Revisar altura'
        ? 'read-visible'
        : 'read-check';
    return {
      verdict,
      className,
      read: `${verdict}: ${heightRead} · sim ${Math.round(symmetry)}%`,
    };
  }
  private formationPositionLane(position: FormationDTO['positions'][number]): 'LEFT' | 'CENTER' | 'RIGHT' {
    const role = String(position.role ?? '').toUpperCase();
    if (['LB', 'LWB', 'LM', 'LW'].includes(role)) return 'LEFT';
    if (['RB', 'RWB', 'RM', 'RW'].includes(role)) return 'RIGHT';
    const x = Number(position.xPercent);
    if (Number.isFinite(x)) {
      if (x <= 42) return 'LEFT';
      if (x >= 58) return 'RIGHT';
    }
    return 'CENTER';
  }
  private buildSideMirrorSmokeRows(
    weakLeftRows: FormationMatrixSummaryRow[],
    weakRightRows: FormationMatrixSummaryRow[]
  ): SideMirrorSmokeRow[] {
    const rightByFormation = new Map(weakRightRows.map((row) => [row.formation, row]));
    return weakLeftRows
      .map((weakLeft) => {
        const weakRight = rightByFormation.get(weakLeft.formation);
        if (!weakRight) return null;
        const weakLeftWideXgL = weakLeft.avgLeftWideXgFor ?? 0;
        const weakLeftWideXgR = weakLeft.avgRightWideXgFor ?? 0;
        const weakRightWideXgL = weakRight.avgLeftWideXgFor ?? 0;
        const weakRightWideXgR = weakRight.avgRightWideXgFor ?? 0;
        const weakLeftRightEdge = this.roundTo(weakLeftWideXgR - weakLeftWideXgL, 3);
        const weakRightLeftEdge = this.roundTo(weakRightWideXgL - weakRightWideXgR, 3);
        const weakLeftOk = weakLeftRightEdge >= 0.015;
        const weakRightOk = weakRightLeftEdge >= 0.015;
        const verdict: SideMirrorSmokeRow['verdict'] = weakLeftOk && weakRightOk
          ? 'OK'
          : weakLeftOk || weakRightOk
            ? 'Parcial'
            : 'Revisar';
        const read = verdict === 'OK'
          ? 'El espejo lateral responde en ambos sentidos.'
          : verdict === 'Parcial'
            ? 'Un lado responde; el otro puede estar tapado por sesgo de plantel/formacion.'
            : 'No hay señal lateral suficiente; revisar motor o muestra.';
        const width = this.formationWidthRead(weakLeft.formation);
        const wingback = this.formationWingbackRead(weakLeft.formation);
        return {
          formation: weakLeft.formation,
          seedStart: weakLeft.seedStart,
          seedEnd: weakLeft.seedEnd,
          seedCount: weakLeft.seedCount,
          weakLeftWideXgL,
          weakLeftWideXgR,
          weakRightWideXgL,
          weakRightWideXgR,
          weakLeftWideShotsL: weakLeft.avgLeftWideShotsFor ?? 0,
          weakLeftWideShotsR: weakLeft.avgRightWideShotsFor ?? 0,
          weakRightWideShotsL: weakRight.avgLeftWideShotsFor ?? 0,
          weakRightWideShotsR: weakRight.avgRightWideShotsFor ?? 0,
          weakLeftRightEdge,
          weakRightLeftEdge,
          verdict,
          widthRead: width.read,
          widthClass: width.className,
          wingbackRead: wingback.read,
          wingbackClass: wingback.className,
          read,
        };
      })
      .filter((row): row is SideMirrorSmokeRow => row !== null)
      .sort((a, b) => {
        const order = { OK: 0, Parcial: 1, Revisar: 2 };
        return order[a.verdict] - order[b.verdict] || a.formation.localeCompare(b.formation);
      });
  }
  private mapSyntheticSideMirrorRows(rows: SideMirrorSyntheticLabRow[]): SideMirrorSmokeRow[] {
    return rows
      .map((row) => {
        const width = this.formationWidthRead(row.formation);
        const wingback = this.formationWingbackRead(row.formation);
        return {
          formation: row.formation,
          seedStart: row.seedStart,
          seedEnd: row.seedEnd,
          seedCount: row.seedCount,
          weakLeftWideXgL: row.weakLeftWideXgL,
          weakLeftWideXgR: row.weakLeftWideXgR,
          weakRightWideXgL: row.weakRightWideXgL,
          weakRightWideXgR: row.weakRightWideXgR,
          weakLeftWideShotsL: row.weakLeftWideShotsL,
          weakLeftWideShotsR: row.weakLeftWideShotsR,
          weakRightWideShotsL: row.weakRightWideShotsL,
          weakRightWideShotsR: row.weakRightWideShotsR,
          weakLeftRightEdge: row.weakLeftRightEdge,
          weakRightLeftEdge: row.weakRightLeftEdge,
          verdict: row.verdict,
          widthRead: width.read,
          widthClass: width.className,
          wingbackRead: wingback.read,
          wingbackClass: wingback.className,
          read: row.read,
        };
      })
      .sort((a, b) => {
        const order = { OK: 0, Parcial: 1, Revisar: 2 };
        return order[a.verdict] - order[b.verdict] || a.formation.localeCompare(b.formation);
      });
  }
  onRunScenarioMatrix(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open(
        `Pick a match involving ${this.userTeamName() || 'your team'} before running the scenario matrix.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    this.scenarioMatrixResults.set([]);
    this.scenarioMatrixSummaryResults.set([]);
    this.mutationInFlight.set(true);
    this.harness.runScenarioMatrix(matchId, this.seedInputModel).subscribe({
      next: (rows) => {
        this.scenarioMatrixResults.set(rows ?? []);
        this.mutationInFlight.set(false);
        this.snackBar.open(
          `Scenario matrix completed (${rows?.length ?? 0} scenarios).`,
          'OK',
          { duration: 3000 }
        );
        this.markReplayAnalysisReady('Scenario matrix lista en Panel E.');
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run scenario matrix'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  onRunScenarioMatrixSummary(): void {
    this.runScenarioMatrixSummaryWithSeedCount(
      this.scenarioMatrixSummaryEffectiveSeedCount(),
      'Multi-seed matrix',
      'Multi-seed matrix lista en Panel E.',
      'ALL'
    );
  }
  onRunScenarioMatrixSmoke(): void {
    this.runScenarioMatrixSummaryWithSeedCount(
      this.scenarioMatrixSmokeSeedCount(),
      'Scenario smoke',
      'Scenario smoke listo en Panel E.',
      'ALL'
    );
  }
  onRunScenarioMatrixBlockSmoke(group: 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): void {
    const label = group === 'OFFENSE'
      ? 'Smoke ataque'
      : group === 'DEFENSE'
        ? 'Smoke defensa'
        : 'Smoke rival';
    this.runScenarioMatrixSummaryWithSeedCount(
      this.scenarioMatrixSmokeSeedCount(),
      label,
      `${label} listo en Panel E.`,
      group
    );
  }
  onRunScenarioBatteryBoard(): void {
    const matches = this.scenarioBatteryCandidateMatches();
    if (matches.length === 0) {
      this.snackBar.open('No hay partidos completados para armar la bateria.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.seedInputModel ?? 12345;
    const seedCount = this.scenarioMatrixSmokeSeedCount();
    const scenarioGroup = this.scenarioBatteryGroupModel;
    const jobs = matches.flatMap((match) => ([
      { match, controlledSide: 'HOME' as const },
      { match, controlledSide: 'AWAY' as const },
    ]));
    const partialRows: Array<ScenarioBatteryRow | undefined> = [];
    const estimatedScenarios = this.scenarioBatteryScenarioCountEstimate(scenarioGroup);
    const estimatedRuns = jobs.length * estimatedScenarios * seedCount;
    this.scenarioBatteryRows.set([]);
    this.scenarioBatteryWorkload.set(
      `${jobs.length} lecturas x ${estimatedScenarios} escenarios x ${seedCount} seeds = ${estimatedRuns} simulaciones estimadas.`
    );
    this.scenarioMatrixSummarySeedCount.set(seedCount);
    this.scenarioBatteryProgress.set(
      this.scenarioBatteryProgressText(0, jobs.length, matches.length, this.scenarioBatteryMatchLimit(), jobs[0])
    );
    this.mutationInFlight.set(true);
    from(jobs).pipe(
      mergeMap((job, index) =>
        this.harness.runScenarioMatrixSummary(
          job.match.matchId,
          seedStart,
          seedCount,
          scenarioGroup,
          job.controlledSide
        ).pipe(
          map((rows) => {
            const row = this.buildScenarioBatteryRow(
              job.match,
              job.controlledSide,
              scenarioGroup,
              seedStart,
              seedCount,
              rows ?? []
            );
            partialRows[index] = row;
            const completedRows = partialRows.filter((item): item is ScenarioBatteryRow => !!item);
            this.scenarioBatteryRows.set(completedRows);
            const nextJob = jobs[completedRows.length] ?? null;
            this.scenarioBatteryProgress.set(
              this.scenarioBatteryProgressText(completedRows.length, jobs.length, matches.length, this.scenarioBatteryMatchLimit(), nextJob)
            );
            return row;
          })
        )
      , 2),
      toArray()
    ).subscribe({
      next: () => {
        this.scenarioBatteryRows.set(partialRows.filter((item): item is ScenarioBatteryRow => !!item));
        this.mutationInFlight.set(false);
        this.scenarioBatteryProgress.set('');
        this.scenarioBatteryWorkload.set('');
        this.markReplayAnalysisReady(`Battery tablero listo: ${partialRows.filter(Boolean).length} lecturas (${this.scenarioBatteryGroupLabel(scenarioGroup)}, ${matches.length} partidos x local/visitante).`);
        this.snackBar.open(`Battery tablero completo: ${partialRows.filter(Boolean).length} lecturas (${this.scenarioBatteryGroupLabel(scenarioGroup)}).`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.scenarioBatteryProgress.set('');
        this.scenarioBatteryWorkload.set('');
        this.snackBar.open(
          this.fmtError(err, 'Failed to run tactical battery board'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  private runScenarioMatrixSummaryWithSeedCount(
    seedCount: number,
    label: string,
    readyMessage: string,
    scenarioGroup: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'
  ): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.canRunScenarioSummaryForControlledSide()) {
      this.snackBar.open(
        `Elegí Local o Visitante para correr ${label} en un partido sin ${this.userTeamName() || 'tu equipo'}.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const seedStart = this.seedInputModel ?? 12345;
    this.scenarioMatrixSummarySeedCount.set(seedCount);
    this.scenarioMatrixSummaryResults.set([]);
    this.mutationInFlight.set(true);
    this.harness.runScenarioMatrixSummary(
      matchId,
      seedStart,
      seedCount,
      scenarioGroup,
      this.controlledTeamSideModel
    ).subscribe({
      next: (rows) => {
        const safeRows = rows ?? [];
        this.scenarioMatrixSummaryResults.set(safeRows);
        this.mutationInFlight.set(false);
        this.snackBar.open(
          `${label} completed (${safeRows.length} scenarios x ${seedCount} seeds).`,
          'OK',
          { duration: 3500 }
        );
        if (safeRows.length > 0) {
          this.markReplayAnalysisReady(readyMessage);
        } else {
          this.analysisReadyMessage.set(
            `${label} no devolvio escenarios para Panel E. Verifica que el partido siga seleccionado y que el grupo tenga escenarios.`
          );
        }
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        const message = this.fmtError(err, `Failed to run ${label.toLowerCase()}`);
        this.analysisReadyMessage.set(
          `${label} no pudo generar Panel E: ${message}`
        );
        this.snackBar.open(
          message,
          'OK',
          { duration: 5000 }
        );
      },
    });
  }
  onPrepareOffensiveUpgradeLab(): void {
    this.mutationInFlight.set(true);
    this.harness.prepareOffensiveUpgradeLab().subscribe({
      next: (result) => {
        this.mutationInFlight.set(false);
        this.scenarioMatrixResults.set([]);
        this.scenarioMatrixSummaryResults.set([]);
        this.snackBar.open(
          `${result.message}. Run Scenario matrix to measure m60-offensive-upgrade-sub.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to prepare offensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onRestoreOffensiveUpgradeLab(): void {
    this.mutationInFlight.set(true);
    this.harness.restoreOffensiveUpgradeLab().subscribe({
      next: (result) => {
        this.mutationInFlight.set(false);
        this.scenarioMatrixResults.set([]);
        this.scenarioMatrixSummaryResults.set([]);
        this.snackBar.open(
          `${result.message}. Run Scenario matrix again for baseline squad.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to restore offensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onPrepareDefensiveDowngradeLab(): void {
    this.mutationInFlight.set(true);
    this.harness.prepareDefensiveDowngradeLab().subscribe({
      next: (result) => {
        this.mutationInFlight.set(false);
        this.scenarioMatrixResults.set([]);
        this.scenarioMatrixSummaryResults.set([]);
        this.snackBar.open(
          `${result.message}. Run Scenario matrix to measure m60-defensive-downgrade-sub.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to prepare defensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onRestoreDefensiveDowngradeLab(): void {
    this.mutationInFlight.set(true);
    this.harness.restoreDefensiveDowngradeLab().subscribe({
      next: (result) => {
        this.mutationInFlight.set(false);
        this.scenarioMatrixResults.set([]);
        this.scenarioMatrixSummaryResults.set([]);
        this.snackBar.open(
          `${result.message}. Run Scenario matrix again for baseline squad.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to restore defensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onPrepareWeakWideDefendersLab(): void {
    this.mutationInFlight.set(true);
    this.harness.prepareWeakWideDefendersLab().subscribe({
      next: (result) => {
        this.handleLabMutationSuccess();
        this.snackBar.open(
          `${result.message}. Run Multi-seed matrix and inspect m45-opponent-wide.`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to prepare weak wide DEF lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onRestoreWeakWideDefendersLab(): void {
    this.mutationInFlight.set(true);
    this.harness.restoreWeakWideDefendersLab().subscribe({
      next: (result) => {
        this.handleLabMutationSuccess();
        this.snackBar.open(
          `${result.message}. Run Multi-seed matrix again for baseline wide defense.`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to restore weak wide DEF lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onPrepareOpponentWeakWideDefendersLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.prepareOpponentWeakWideDefendersLab(matchId),
      'Failed to prepare rival weak wide DEF lab',
      'Run Formation avg with Bandas vs Centro to inspect offensive wide exploitation.'
    );
  }
  onRestoreOpponentWeakWideDefendersLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.restoreOpponentWeakWideDefendersLab(matchId),
      'Failed to restore rival weak wide DEF lab',
      'Rival wide defense restored for this selected match.'
    );
  }
  onPrepareOpponentWeakLeftDefenderLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.prepareOpponentWeakLeftDefenderLab(matchId),
      'Failed to prepare rival weak left DEF lab',
      'Run Smoke ataque and inspect right-side/wide exploitation.'
    );
  }
  onRestoreOpponentWeakLeftDefenderLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.restoreOpponentWeakLeftDefenderLab(matchId),
      'Failed to restore rival weak left DEF lab',
      'Rival left defender restored for this selected match.'
    );
  }
  onPrepareOpponentWeakRightDefenderLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.prepareOpponentWeakRightDefenderLab(matchId),
      'Failed to prepare rival weak right DEF lab',
      'Run Smoke ataque and inspect left-side/wide exploitation.'
    );
  }
  onRestoreOpponentWeakRightDefenderLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.restoreOpponentWeakRightDefenderLab(matchId),
      'Failed to restore rival weak right DEF lab',
      'Rival right defender restored for this selected match.'
    );
  }
  onPrepareOpponentWeakCenterBacksLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.prepareOpponentWeakCenterBacksLab(matchId),
      'Failed to prepare rival weak CB lab',
      'Run Formation avg with Centro vs Bandas to inspect offensive central exploitation.'
    );
  }
  onRestoreOpponentWeakCenterBacksLab(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) return;
    this.runLabMutation(
      () => this.harness.restoreOpponentWeakCenterBacksLab(matchId),
      'Failed to restore rival weak CB lab',
      'Rival center backs restored for this selected match.'
    );
  }
  onPrepareWeakLeftDefenderLab(): void {
    this.runLabMutation(
      () => this.harness.prepareWeakLeftDefenderLab(),
      'Failed to prepare weak left DEF lab',
      'Run Multi-seed matrix and inspect opponent wide xG.'
    );
  }
  onRestoreWeakLeftDefenderLab(): void {
    this.runLabMutation(
      () => this.harness.restoreWeakLeftDefenderLab(),
      'Failed to restore weak left DEF lab',
      'Baseline left channel restored.'
    );
  }
  onPrepareWeakRightDefenderLab(): void {
    this.runLabMutation(
      () => this.harness.prepareWeakRightDefenderLab(),
      'Failed to prepare weak right DEF lab',
      'Run Multi-seed matrix and inspect opponent wide xG.'
    );
  }
  onRestoreWeakRightDefenderLab(): void {
    this.runLabMutation(
      () => this.harness.restoreWeakRightDefenderLab(),
      'Failed to restore weak right DEF lab',
      'Baseline right channel restored.'
    );
  }
  onPrepareWeakCenterBacksLab(): void {
    this.runLabMutation(
      () => this.harness.prepareWeakCenterBacksLab(),
      'Failed to prepare weak CB lab',
      'Run Multi-seed matrix and inspect opponent central xG.'
    );
  }
  onRestoreWeakCenterBacksLab(): void {
    this.runLabMutation(
      () => this.harness.restoreWeakCenterBacksLab(),
      'Failed to restore weak CB lab',
      'Baseline central defense restored.'
    );
  }
  onPrepareDefensiveFallbackLineupLab(): void {
    this.mutationInFlight.set(true);
    let restorePoint: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = this.buildLineupSlots(originalLineup);
        restorePoint = {
          formation: originalLineup.formation ?? this.selectedFormationModel ?? '4-4-2',
          playerIds: this.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return this.harness.setFormation('4-3-3').pipe(
          switchMap(() => this.harness.autoSelectLineup('4-3-3'))
        );
      }),
      switchMap(() => this.harness.getCurrentLineup()),
      switchMap((lineup) => {
        const lab = this.buildDefensiveFallbackLineupLab(lineup);
        this.defensiveFallbackRestore = restorePoint ?? lab.restore;
        this.defensiveFallbackLabRead = lab.read;
        return this.harness.manualSelectLineup(lab.formation, lab.playerIds, lab.slots);
      })
    ).subscribe({
      next: () => {
        this.handleLabMutationSuccess();
        this.analysisReadyMessage.set(`DEF fallback lab listo: ${this.defensiveFallbackLabRead ?? 'corré XI efectivo para ver fallback defensivo.'}`);
        this.snackBar.open('DEF fallback lab preparado. Corré XI efectivo.', 'OK', { duration: 4500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(this.fmtError(err, 'Failed to prepare DEF fallback lab'), 'OK', { duration: 6000 });
      },
    });
  }
  onRunPlayerSwapFullSmoke(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = this.playerSwapBatteryEffectiveSeedCount();
    this.playerSwapSeedCountModel = seedCount;
    this.clearReplayAnalysisResultsForLatestRun();
    this.analysisReadyMessage.set(`Player swap full smoke corriendo: natural + stress, ${seedCount} seeds por cambio...`);
    this.mutationInFlight.set(true);
    const source$ = this.selectedMatchIncludesUserTeam()
      ? forkJoin({
          lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
          squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
            take(1),
            timeout(10_000),
            catchError(() => of([] as SessionPlayer[]))
          ),
        })
      : of({ lineup: null as LineupDTO | null, squad: [] as SessionPlayer[] });
    source$.pipe(
      switchMap(({ lineup, squad }) => this.harness.setStyle(this.selectedStyleModel).pipe(
        switchMap(() => forkJoin({
          natural: this.runPlayerSwapBatteryMode(matchId, seedStart, seedCount, 'natural', lineup, squad),
          stress: this.runPlayerSwapBatteryMode(matchId, seedStart, seedCount, 'stress', lineup, squad),
        }))
      )),
      map(({ natural, stress }) => [...natural, ...stress])
    ).subscribe({
      next: (summaries) => {
        this.playerSwapBatterySummaries.set(summaries);
        this.playerSwapMatrixSummary.set(summaries[0] ?? null);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(
          this.fmtError(err, 'Player swap full smoke fallÃƒÂ³ antes de generar Panel E')
        );
        this.snackBar.open(this.fmtError(err, 'Failed to run player swap full smoke'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const count = this.playerSwapBatterySummaries().length;
        this.snackBar.open(
          count > 0 ? `Player swap full smoke complete: ${count} swaps measured.` : 'Player swap full smoke completed with insufficient samples.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Player swap full smoke listo en Panel E.');
        this.refreshLineupContext();
      },
    });
  }
  onRestoreDefensiveFallbackLineupLab(): void {
    const restore = this.defensiveFallbackRestore;
    if (!restore) {
      this.snackBar.open('No DEF fallback lab restore point available.', 'OK', { duration: 3500 });
      return;
    }
    this.mutationInFlight.set(true);
    this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(take(1)).subscribe({
      next: () => {
        this.defensiveFallbackRestore = null;
        this.defensiveFallbackLabRead = null;
        this.handleLabMutationSuccess();
        this.analysisReadyMessage.set('DEF fallback lab restaurado.');
        this.snackBar.open('DEF fallback lab restaurado.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(this.fmtError(err, 'Failed to restore DEF fallback lab'), 'OK', { duration: 6000 });
      },
    });
  }
  private buildDefensiveFallbackLineupLab(lineup: LineupDTO): {
    formation: string;
    playerIds: string[];
    slots: LineupSlotDTO[];
    restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] };
    read: string;
  } {
    const formation = lineup.formation ?? this.selectedFormationModel ?? '4-4-2';
    const originalSlots = this.buildLineupSlots(lineup);
    const originalPlayerIds = this.lineupPlayerIdsFromSlots(originalSlots);
    if (originalSlots.length !== 11 || originalPlayerIds.length !== 11) {
      throw new Error(`DEF fallback lab necesita 11 slots actuales, tiene ${originalSlots.length}. Corré auto-select primero.`);
    }
    const players = lineup.players ?? [];
    const playerById = new Map(players.map((player) => [player.playerId, player]));
    const defensiveSlots = originalSlots
      .map((slot) => ({
        slot,
        role: this.canonicalFormationPosition(
          formation,
          slot.subdivisionId ? { playerId: slot.playerId, subdivisionId: slot.subdivisionId } : null
        )?.role?.toUpperCase() ?? '',
      }))
      .filter((entry) => ['CB', 'LB', 'RB'].includes(entry.role))
      .sort((a, b) => this.defensiveFallbackTargetPriority(a.role, a.slot.subdivisionId) - this.defensiveFallbackTargetPriority(b.role, b.slot.subdivisionId));
    const defensiveSlot = defensiveSlots[0]?.slot ?? originalSlots.find((slot) => this.isDefensiveFallbackTargetSlot(slot.subdivisionId, formation));
    if (!defensiveSlot) {
      throw new Error('DEF fallback lab no encontró slot defensivo CB/LB/RB para forzar.');
    }
    const attackingOrMidSlot = originalSlots
      .map((slot) => {
        const player = playerById.get(slot.playerId);
        return { slot, player, priority: this.defensiveFallbackSourcePriority(player?.position) };
      })
      .filter((entry) => {
        const player = entry.player;
        return !!player
          && player.playerId !== defensiveSlot.playerId
          && String(player.position ?? '').toUpperCase() !== 'GK'
          && !this.isDefensiveFallbackCompatiblePosition(player.position);
      })
      .sort((a, b) => a.priority - b.priority)[0]?.slot;
    if (!attackingOrMidSlot) {
      throw new Error('DEF fallback lab no encontró un titular no-defensivo para mover a defensa.');
    }
    const targetPlayerId = attackingOrMidSlot.playerId;
    const displacedDefenderId = defensiveSlot.playerId;
    const targetPlayer = playerById.get(targetPlayerId);
    const displacedPlayer = playerById.get(displacedDefenderId);
    const defensiveRole = this.canonicalFormationPosition(formation, defensiveSlot)?.role?.toUpperCase() ?? 'DEF';
    const nextSlots = originalSlots.map((slot) => {
      if (slot.subdivisionId === defensiveSlot.subdivisionId) {
        return { ...slot, playerId: targetPlayerId };
      }
      if (slot.subdivisionId === attackingOrMidSlot.subdivisionId) {
        return { ...slot, playerId: displacedDefenderId };
      }
      return { ...slot };
    });
    return {
      formation,
      playerIds: this.lineupPlayerIdsFromSlots(nextSlots),
      slots: nextSlots,
      restore: {
        formation,
        playerIds: originalPlayerIds,
        slots: originalSlots,
      },
      read: `${targetPlayer?.name ?? targetPlayerId} (${targetPlayer?.position ?? '?'}) -> ${defensiveRole} ${defensiveSlot.subdivisionId}; `
        + `${displacedPlayer?.name ?? displacedDefenderId} vuelve a ${attackingOrMidSlot.subdivisionId}. Corré XI efectivo para ver fallback defensivo.`,
    };
  }
  private defensiveFallbackTargetPriority(role: string, subdivisionId: string | null | undefined): number {
    if (role === 'CB') return subdivisionId === 'S23-1' ? 0 : 1;
    if (role === 'LB' || role === 'RB') return 2;
    return 9;
  }
  private defensiveFallbackSourcePriority(position: string | null | undefined): number {
    const pos = String(position ?? '').toUpperCase();
    if (['ST', 'CF', 'ATT'].includes(pos)) return 0;
    if (['CAM', 'LW', 'RW', 'WINGER'].includes(pos)) return 1;
    if (['CM', 'MID', 'LM', 'RM'].includes(pos)) return 2;
    return 3;
  }
  private isDefensiveFallbackTargetSlot(subdivisionId: string | null | undefined, formation: string): boolean {
    const role = this.canonicalFormationPosition(
      formation,
      subdivisionId ? { playerId: '__lab__', subdivisionId } : null
    )?.role?.toUpperCase() ?? '';
    return ['CB', 'LB', 'RB'].includes(role);
  }
  private isDefensiveFallbackCompatiblePosition(position: string | null | undefined): boolean {
    return ['CB', 'DEF', 'CDM', 'LB', 'RB', 'LWB', 'RWB'].includes(String(position ?? '').toUpperCase());
  }
  private runLabMutation(
    action: () => Observable<LabMutationResult>,
    errorMessage: string,
    successHint: string
  ): void {
    this.mutationInFlight.set(true);
    action().subscribe({
      next: (result) => {
        this.handleLabMutationSuccess();
        this.snackBar.open(
          `${result.message}. ${successHint}`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, errorMessage),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  /**
   * Lab mutations intentionally invalidate Panel E because the same scenario
   * table would now compare against stale player qualities. Keep the selected
   * match stable, refresh the visible detail/lineup context, and show an
   * explicit "rerun" message instead of leaving a stale "ready" banner.
   */
  private handleLabMutationSuccess(): void {
    this.mutationInFlight.set(false);
    this.scenarioMatrixResults.set([]);
    this.scenarioMatrixSummaryResults.set([]);
    this.analysisReadyMessage.set(
      'Lab aplicado. El partido sigue seleccionado; corre el smoke/matriz otra vez para regenerar Panel E.'
    );
    this.refreshLineupContext();
    this.refreshDetailAfterMutation();
  }
  private clearReplayAnalysisForMatchChange(match: TestHarnessMatchRow): void {
    this.currentLineupReplayResult.set(null);
    this.currentLineupMultiSeedSummary.set(null);
    this.modalVsCanonicalSummary.set(null);
    this.lineupDiagnostic.set(null);
    this.playerSwapMatrixSummary.set(null);
    this.playerSwapBatterySummaries.set([]);
    this.playerSwapPrecisionComparisonRows.set([]);
    this.positionPixelMatrixSummary.set(null);
    this.positionPixelMatrixRows.set([]);
    this.positionPixelEvidenceNote.set(null);
    this.roleSlotImpactRows.set([]);
    this.formationReplayResults.set([]);
    this.formationMatrixSummaryResults.set([]);
    this.scenarioMatrixResults.set([]);
    this.scenarioMatrixSummaryResults.set([]);
    const teamName = this.userTeamName() || 'tu equipo';
    const matchName = `${match.homeTeamName} vs ${match.awayTeamName}`;
    this.analysisReadyMessage.set(
      match.homeTeamName === teamName || match.awayTeamName === teamName
        ? `Panel E limpiado para ${matchName}. Corre un smoke/matriz para este partido.`
        : `Panel E limpiado para ${matchName}. Controlar quedo en Local; podes correr smokes multi-seed para este partido.`
    );
  }
  // ============== Internal helpers ==============
  private loadMatches(onLoaded?: (rounds: RoundGroup[]) => void): void {
    this.careerService.getAllFixturesWithBye().subscribe({
      next: (resp) => {
        const rounds: RoundGroup[] = (resp?.rounds ?? []).map((rd) => ({
          round: rd.round,
          byeTeam: rd.byeTeam ?? null,
          matches: (rd.matches ?? []).map((f: Fixture) =>
            this.fixtureToMatchRow(f)
          ),
        }));
        const matchCount = rounds.reduce((acc, round) => acc + round.matches.length, 0);
        if (matchCount === 0) {
          this.loadMatchesFromSnapshot(onLoaded);
          return;
        }
        this.rounds.set(rounds);
        this.rehydrateSelectedMatchFromRounds(rounds);
        this.loading.set(false);
        onLoaded?.(rounds);
      },
      error: (err) => {
        this.loadError.set(
          this.fmtError(err, 'Failed to load match list')
        );
        this.loading.set(false);
      },
    });
  }
  private loadMatchesFromSnapshot(onLoaded?: (rounds: RoundGroup[]) => void): void {
    this.http.get<TestHarnessSnapshotResponse>(`${environment.apiUrl}/test-harness/career/snapshot`).subscribe({
      next: (snapshot) => {
        const rounds = this.snapshotFixturesToRoundGroups(snapshot?.fixtures ?? []);
        this.rounds.set(rounds);
        this.rehydrateSelectedMatchFromRounds(rounds);
        this.loading.set(false);
        onLoaded?.(rounds);
      },
      error: (err) => {
        this.loadError.set(
          this.fmtError(err, 'Failed to load match list')
        );
        this.loading.set(false);
      },
    });
  }
  private rehydrateSelectedMatchFromRounds(rounds: RoundGroup[]): void {
    const currentMatchId = this.selectedMatchId();
    if (!currentMatchId) {
      return;
    }
    const refreshedMatch = rounds
      .flatMap((round) => round.matches)
      .find((match) => match.matchId === currentMatchId);
    if (refreshedMatch) {
      this.selectedMatch.set(refreshedMatch);
      if (typeof refreshedMatch.round === 'number' && this.selectedRoundModel !== refreshedMatch.round) {
        this.selectedRoundModel = refreshedMatch.round;
      }
    }
  }
  private snapshotFixturesToRoundGroups(fixtures: TestHarnessSnapshotFixture[]): RoundGroup[] {
    const byRound = new Map<number, TestHarnessMatchRow[]>();
    for (const fixture of fixtures ?? []) {
      if (!fixture?.matchId || !Number.isFinite(Number(fixture.round))) {
        continue;
      }
      const round = Number(fixture.round);
      const matches = byRound.get(round) ?? [];
      matches.push(this.snapshotFixtureToMatchRow(fixture));
      byRound.set(round, matches);
    }
    return Array.from(byRound.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, matches]) => ({
        round,
        byeTeam: null,
        matches,
      }));
  }
  private snapshotFixtureToMatchRow(f: TestHarnessSnapshotFixture): TestHarnessMatchRow {
    return {
      matchId: f.matchId,
      round: f.round,
      homeTeamId: f.homeTeamId,
      homeTeamName: f.homeTeamName ?? f.homeTeamId,
      awayTeamId: f.awayTeamId,
      awayTeamName: f.awayTeamName ?? f.awayTeamId,
      status: f.status,
      homeGoals: f.homeGoals ?? null,
      awayGoals: f.awayGoals ?? null,
      homeStrength: null,
      awayStrength: null,
      homeFormation: null,
      awayFormation: null,
      roundId: f.roundId ?? null,
    };
  }
  private scenarioBatteryProgressText(
    completed: number,
    total: number,
    availableMatches: number,
    targetMatches: number,
    nextJob: { match: TestHarnessMatchRow; controlledSide: 'HOME' | 'AWAY' } | null | undefined
  ): string {
    const next = nextJob
      ? ` Proximo: ${nextJob.match.homeTeamName} vs ${nextJob.match.awayTeamName} (${nextJob.controlledSide === 'HOME' ? 'local' : 'visitante'}).`
      : ' Cerrando tablero...';
    return `Battery tablero: ${completed}/${total} lecturas (${availableMatches}/${targetMatches} partidos).${next}`;
  }
  private scenarioBatteryScenarioCountEstimate(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): number {
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
  private scheduleRoundCompletionRefresh(roundNumber: number, expectedMatchCount: number): void {
    this.clearRoundRefreshTimers();
    const refresh = () => {
      this.loadMatches((rounds) => {
        const roundGroup = rounds.find((r) => r.round === roundNumber);
        const completed = (roundGroup?.matches ?? [])
          .filter((match) => String(match.status).toUpperCase() === 'COMPLETED')
          .length;
        if (expectedMatchCount > 0 && completed >= expectedMatchCount) {
          this.clearRoundRefreshTimers();
          this.snackBar.open(
            `Round ${roundNumber} completed (${completed}/${expectedMatchCount}). Battery tablero ya tiene mas muestra.`,
            'OK',
            { duration: 3500 }
          );
        }
      });
    };
    refresh();
    for (const delayMs of [1500, 4000, 8000, 12000, 20000, 35000, 50000, 65000]) {
      this.roundRefreshTimers.push(setTimeout(refresh, delayMs));
    }
  }
  private clearRoundRefreshTimers(): void {
    for (const timer of this.roundRefreshTimers) {
      clearTimeout(timer);
    }
    this.roundRefreshTimers = [];
  }
  /**
   * Build a TestHarnessMatchRow from a CareerService Fixture.
   *
   * <p>Team display names: the backend {@code GET /career/fixtures/
   * round-with-bye} endpoint (the one this UI calls via
   * {@code getAllFixturesWithBye}) hydrates {@code homeTeamName} and
   * {@code awayTeamName} on each fixture via the
   * {@code FixtureQueryDtos.MatchInfo} record. V24D24.2-F2.5 surfaces
   * those names in Panel C instead of falling back to the teamId.
   *
   * <p>Defensive fallback: if the backend ever returns a fixture
   * without the names hydrated (legacy endpoint, race condition on a
   * freshly created career), we still render the teamId so the row is
   * not blank.
   *
   * <p>V24D24.2: also carries through {@code roundId} so the dropdown /
   * Simulate button can POST it directly to
   * {@code /api/v1/match-engine/rounds/start}.
   */
  private fixtureToMatchRow(f: Fixture): TestHarnessMatchRow {
    return {
      matchId: f.matchId,
      round: f.round,
      homeTeamId: f.homeTeamId,
      homeTeamName: f.homeTeamName ?? f.homeTeamId,
      awayTeamId: f.awayTeamId,
      awayTeamName: f.awayTeamName ?? f.awayTeamId,
      status: f.status,
      homeGoals: f.homeGoals ?? null,
      awayGoals: f.awayGoals ?? null,
      homeStrength: f.homeStrength ?? null,
      awayStrength: f.awayStrength ?? null,
      homeFormation: null,
      awayFormation: null,
      roundId: f.roundId ?? null,
    };
  }
  /**
   * Builds a tiny, controlled fixture set around the current user team.
   *
   * The original debug button sent an empty array, which was technically safe
   * but not useful for testing a fresh career. This keeps the workflow local:
   * reuse real team ids already present in the career schedule, pick distinct
   * opponents for the user's team, and create one match per round.
   */
  private buildSingleMatchPreset(): CustomFixture[] {
    const userTeam = this.userTeamName();
    if (!userTeam) {
      return [];
    }
    const userMatches = this.rounds()
      .flatMap((round) => round.matches)
      .filter((match) => match.homeTeamName === userTeam || match.awayTeamName === userTeam);
    const rivals = new Map<string, { teamId: string; teamName: string }>();
    let userTeamId: string | null = null;
    for (const match of userMatches) {
      const isHome: boolean = match.homeTeamName === userTeam;
      const currentUserTeamId: string = isHome ? match.homeTeamId : match.awayTeamId;
      const rivalTeamId: string = isHome ? match.awayTeamId : match.homeTeamId;
      const rivalTeamName: string = isHome ? match.awayTeamName : match.homeTeamName;
      if (!currentUserTeamId || !rivalTeamId || !rivalTeamName || rivalTeamName === userTeam) {
        continue;
      }
      userTeamId = userTeamId ?? currentUserTeamId;
      if (!rivals.has(rivalTeamId)) {
        rivals.set(rivalTeamId, { teamId: rivalTeamId, teamName: rivalTeamName });
      }
    }
    if (!userTeamId || rivals.size === 0) {
      return [];
    }
    return Array.from(rivals.values()).slice(0, 3).map((rival, index) => {
      const userHome = index % 2 === 0;
      return {
        round: index + 1,
        homeTeamId: userHome ? userTeamId : rival.teamId,
        awayTeamId: userHome ? rival.teamId : userTeamId,
        matchId: null,
      };
    });
  }
  /**
   * Force Panel A to re-fetch without clearing the global selected match.
   *
   * Previous implementation temporarily set selectedMatchId(null) and then
   * restored it on the next microtask. That remounted Panel A, but it also made
   * Panel B/D briefly believe no match was selected. During long replay flows
   * like Formation matrix, that transient null could collapse controls and make
   * the matrix table disappear or leave buttons disabled. Keep selectedMatchId
   * stable and toggle only the detail panel visibility.
   */
  private refreshDetailAfterMutation(delayMs = 0): void {
    const current = this.selectedMatchId();
    if (current) {
      const remount = () => {
        this.detailRefreshToken.update((value) => value + 1);
        this.detailPanelVisible.set(false);
        setTimeout(() => this.detailPanelVisible.set(true), 0);
      };
      if (delayMs > 0) {
        setTimeout(remount, delayMs);
      } else {
        remount();
      }
    }
  }
  private refreshLineupContext(): void {
    if (typeof this.harness.getCurrentLineup !== 'function') {
      return;
    }
    const lineup$ = this.harness.getCurrentLineup();
    if (!lineup$ || typeof lineup$.pipe !== 'function') {
      return;
    }
    forkJoin({
      lineup: lineup$.pipe(catchError(() => of(null))),
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        catchError(() => of([] as SessionPlayer[]))
      ),
    })
      .pipe(catchError(() => of(null)))
      .subscribe((context) => {
        const lineup = context?.lineup ?? null;
        const squad = context?.squad ?? [];
        const formation = lineup?.formation;
        if (formation && this.formationCodes.includes(formation as FormationCode)) {
          this.selectedFormationModel = formation as FormationCode;
        }
        this.rebuildPlayerSwapOptions(lineup, squad);
      });
  }
  private rebuildPlayerSwapOptions(lineup: LineupDTO | null, squad: SessionPlayer[]): void {
    if (!lineup) {
      this.playerSwapSlotOptions.set([]);
      this.playerSwapBenchOptions.set([]);
      return;
    }
    const slots = this.buildLineupSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const lineupIds = new Set((lineup.players ?? []).map((player) => player.playerId));
    const slotOptions = (lineup.players ?? [])
      .filter((player) => player.position !== 'GK' && slotByPlayer.has(player.playerId))
      .map((player) => ({
        playerId: player.playerId,
        playerName: player.name,
        position: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
        label: `${player.name} (${player.position}) ? ${slotByPlayer.get(player.playerId) ?? 'slot'}`,
      }));
    const benchOptions = squad
      .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
      .map((player) => ({
        playerId: player.sessionPlayerId,
        playerName: player.name,
        position: player.position,
        score: player.attack + player.technique + player.speed,
        label: `${player.name} (${player.position}) ? atk ${player.attack} ? tech ${player.technique} ? pace ${player.speed}`,
      }))
      .sort((a, b) => b.score - a.score);
    this.playerSwapSlotOptions.set(slotOptions);
    this.playerSwapBenchOptions.set(benchOptions);
    if (this.selectedSwapStarterIdModel && !slotOptions.some((option) => option.playerId === this.selectedSwapStarterIdModel)) {
      this.selectedSwapStarterIdModel = null;
    }
    if (this.selectedSwapBenchIdModel && !benchOptions.some((option) => option.playerId === this.selectedSwapBenchIdModel)) {
      this.selectedSwapBenchIdModel = null;
    }
  }
  private fmtError(err: any, fallback: string): string {
    return err?.error?.message ?? err?.message ?? fallback;
  }
}
