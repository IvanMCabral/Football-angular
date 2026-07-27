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
import { AppLoggerService } from '../../../core/services/app-logger.service';
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
  AllFormationRoleSlotSmokeRow,
  BackFiveContextSmokeRow,
  BackFiveContextSmokeSummary,
  BackFiveFamilyLabRow,
  BackFiveTransitionLabRow,
  ControlledTeamSide,
  CustomFixture,
  CurrentLineupReplaySample,
  CurrentLineupMultiSeedSummary,
  CurrentLineupReplayResult,
  FocusedWideBatteryRow,
  FormationCoachPick,
  FormationCoachSummary,
  FormationCode,
  FormationLineSmokeRow,
  FormationMatrixRow,
  FormationMatrixSummaryRow,
  FormationReplayResult,
  LabMutationResult,
  LastModalPositionMoveCase,
  LineupDebugRow,
  LineupDebugSnapshot,
  LineupDiagnostic,
  LineupDiagnosticPlayer,
  LineupDiagnosticTeam,
  LowBlockLabRow,
  MatchFixture,
  MatchPreviewSummary,
  ModalVsCanonicalSummary,
  ModalRecommendationCandidateAttempt,
  PlayerSwapBatterySummary,
  PlayerSwapBenchOption,
  PlayerSwapCandidate,
  PlayerSwapMatrixSummaryRow,
  PlayerSwapMatrixSummary,
  PlayerSwapPrecisionComparisonRow,
  PlayerSwapSlotOption,
  PositionPixelQaLine,
  PositionPixelQaSummaryRow,
  PositionPixelCandidate,
  PositionPixelDiagonalSummary,
  PositionPixelExportRow,
  PositionPixelLineBreakSummary,
  PositionPixelReadFilter,
  PositionPixelReadLevel,
  PositionPixelMatrixSummaryRow,
  PositionPixelMatrixSummary,
  PositionPixelMatchSmokeSummary,
  PositionPixelPlayerSmokeSummary,
  PositionPixelSmokeRunSummary,
  PositionPixelSmokeScope,
  PositionPixelSortMode,
  ProfessionalQaActionStatus,
  ProfessionalQaChecklistRow,
  ProfessionalSmokeSummary,
  RoleSlotImpactSmokeRow,
  RoleSlotImpactSummaryRow,
  RoundGroup,
  ScenarioBatteryCoachObjective,
  ScenarioBatteryCoachObjectiveModel,
  ScenarioBatteryCoachAdvice,
  ScenarioBatteryReviewItem,
  ScenarioBatteryRow,
  ScenarioDecisionCard,
  ScenarioMatrixRow,
  ScenarioMatrixSummaryRow,
  ScenarioScoutingNote,
  ScenarioSummaryReadFilter,
  ScenarioSummaryReadLevel,
  ScenarioSummarySortMode,
  SideMirrorDecisionRow,
  SideMirrorDecisionSummary,
  SideMirrorSmokeRow,
  SideMirrorSmokeSummary,
  SideMirrorSyntheticLabRow,
  SubstitutionWhatIfSummaryRow,
  SubstitutionWhatIfSummary,
  SubstitutionTimingMatrixRow,
  TestHarnessMatchRow,
  TestHarnessSquadHealthSummary,
  TestHarnessSnapshotFixture,
  TestHarnessSnapshotResponse,
  TeamStyle,
  FormationWidthRead,
  FormationWingbackRead,
  WingbackLabRow,
} from '../models/test-harness.model';
import { TestHarnessService } from '../services/test-harness.service';
import {
  CURRENT_LINEUP_MULTI_SEED_COUNT,
  CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS,
  DEFAULT_REPLAY_SEED,
  SINGLE_MATCH_REPLAY_TIMEOUT_MS,
  TEST_HARNESS_MINUTE_TICKS,
  TIMELINE_DEBOUNCE_MS,
  TIMELINE_MAX_MINUTE,
  TIMELINE_STEP,
} from './test-harness.constants';
import {
  AUTO_PLAYER_SWAP_BENCH,
  AUTO_PLAYER_SWAP_STARTER,
  ROLE_SLOT_IMPACT_SLOT_OPTIONS,
  SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS,
  TEAM_STYLE_OPTIONS,
} from './test-harness-page.options';
import {
  csvCell as formatCsvCell,
  csvLines as buildCsvLines,
  downloadTextFile as saveTextFile,
} from './test-harness-export-utils';
import {
  deltaClassName,
  formatDeltaInt,
  formatDeltaMicro,
  formatDeltaNumber,
  formatPercent,
  formatXg,
} from './test-harness-format-utils';
import {
  professionalQaActionLabel as getProfessionalQaActionLabel,
  professionalQaActionStatusClass as getProfessionalQaActionStatusClass,
  professionalQaCheckLabel as getProfessionalQaCheckLabel,
  professionalQaChecklistTestId as getProfessionalQaChecklistTestId,
  professionalQaTextLabel as getProfessionalQaTextLabel,
  professionalQaVerdictClass as getProfessionalQaVerdictClass,
  professionalQaVerdictLabel as getProfessionalQaVerdictLabel,
  professionalSmokeVerdictClass as getProfessionalSmokeVerdictClass,
} from './test-harness-professional-qa-utils';
import {
  buildScenarioBatteryRow as buildScenarioBatteryRowUtils,
  buildScenarioDecisionCardsFromSummary as buildScenarioDecisionCardsFromSummaryUtils,
  inferScenarioBatteryCoachObjective as inferScenarioBatteryCoachObjectiveUtils,
  scenarioActionLabel as getScenarioActionLabel,
  scenarioActionKey as getScenarioActionKey,
  scenarioAttackCandidateIsCoachWorthy as getScenarioAttackCandidateIsCoachWorthy,
  scenarioAttackPlanScore as getScenarioAttackPlanScore,
  scenarioBatteryCardDetail as getScenarioBatteryCardDetail,
  scenarioBatteryCardSummary as getScenarioBatteryCardSummary,
  scenarioBatteryCandidateMatches as getScenarioBatteryCandidateMatches,
  scenarioBatteryAutoObjectiveHint as getScenarioBatteryAutoObjectiveHint,
  scenarioBatteryCoachContext as getScenarioBatteryCoachContext,
  scenarioBatteryCoachAdvice as getScenarioBatteryCoachAdvice,
  scenarioBatteryCoachObjectiveHint as getScenarioBatteryCoachObjectiveHint,
  scenarioBatteryDecision as getScenarioBatteryDecision,
  scenarioBatteryDecisionMinute as getScenarioBatteryDecisionMinute,
  scenarioBatteryDecisionReview as getScenarioBatteryDecisionReview,
  scenarioBatteryCoachObjectiveLabel as getScenarioBatteryCoachObjectiveLabel,
  scenarioBatteryExportRow as getScenarioBatteryExportRow,
  scenarioBatteryCoverageHint as getScenarioBatteryCoverageHint,
  scenarioBatteryContextPressure as getScenarioBatteryContextPressure,
  scenarioBatteryGroupHint as getScenarioBatteryGroupHint,
  scenarioBatteryGroupLabel as getScenarioBatteryGroupLabel,
  scenarioBatteryGoalDiff as getScenarioBatteryGoalDiff,
  scenarioBatteryMatchStateText as getScenarioBatteryMatchStateText,
  scenarioBatteryMetricText as getScenarioBatteryMetricText,
  scenarioBatteryReviewCount as getScenarioBatteryReviewCount,
  scenarioBatteryReviewHint as getScenarioBatteryReviewHint,
  scenarioBatteryReviewItems as getScenarioBatteryReviewItems,
  scenarioBatteryRiskCardDetail as getScenarioBatteryRiskCardDetail,
  scenarioBatteryRiskCardSummary as getScenarioBatteryRiskCardSummary,
  scenarioBatteryProgressText as getScenarioBatteryProgressText,
  scenarioBatteryScenarioCountEstimate as getScenarioBatteryScenarioCountEstimate,
  scenarioBatteryScopeHint as getScenarioBatteryScopeHint,
  scenarioBatterySquadText as getScenarioBatterySquadText,
  scenarioBatteryTeamCondition as getScenarioBatteryTeamCondition,
  scenarioBatteryTeamRating as getScenarioBatteryTeamRating,
  scenarioBatteryTeamReputation as getScenarioBatteryTeamReputation,
  scenarioDecisionMetrics as getScenarioDecisionMetrics,
  scenarioOpponentProtectionRead as getScenarioOpponentProtectionRead,
  scenarioOpponentRiskRead as getScenarioOpponentRiskRead,
  scenarioProtectionCandidateIsCoachWorthy as getScenarioProtectionCandidateIsCoachWorthy,
  scenarioShapeActionLabel as getScenarioShapeActionLabel,
  scenarioSummaryActionLabel as getScenarioSummaryActionLabel,
  scenarioSummaryAttackGainScore as getScenarioSummaryAttackGainScore,
  scenarioSummaryAttackLossScore as getScenarioSummaryAttackLossScore,
  scenarioSummaryCoachRead as getScenarioSummaryCoachRead,
  scenarioSummaryCoachReadDetail as getScenarioSummaryCoachReadDetail,
  scenarioSummaryCoachReadPrefix as getScenarioSummaryCoachReadPrefix,
  scenarioSummaryCoherentSubstitutionSignal as getScenarioSummaryCoherentSubstitutionSignal,
  scenarioDecisionConfidenceFromReadLevel as getScenarioDecisionConfidenceFromReadLevel,
  scenarioSummaryDefensiveGainScore as getScenarioSummaryDefensiveGainScore,
  scenarioSummaryDefensiveRiskScore as getScenarioSummaryDefensiveRiskScore,
  scenarioSummaryFormationHint as getScenarioSummaryFormationHint,
  scenarioSummaryFormationLabel as getScenarioSummaryFormationLabel,
  scenarioSummaryImpactScore as getScenarioSummaryImpactScore,
  scenarioSummaryIsFormationNoop as getScenarioSummaryIsFormationNoop,
  scenarioSummaryNeedsReview as getScenarioSummaryNeedsReview,
  scenarioSummaryIsOpponentRow as getScenarioSummaryIsOpponentRow,
  scenarioSummaryIsShapeAction as getScenarioSummaryIsShapeAction,
  scenarioSummaryOpponentChannelRead as getScenarioSummaryOpponentChannelRead,
  scenarioSummaryOutcome as getScenarioSummaryOutcome,
  scenarioSummaryOutcomeClass as getScenarioSummaryOutcomeClass,
  scenarioSummaryOutcomeReason as getScenarioSummaryOutcomeReason,
  scenarioSummaryOutcomeSummaryFromOutcomes as getScenarioSummaryOutcomeSummaryFromOutcomes,
  scenarioSummaryRecommendationClass as getScenarioSummaryRecommendationClass,
  scenarioSummaryRecommendationDetail as getScenarioSummaryRecommendationDetail,
  scenarioSummaryRecommendationFromOutcome as getScenarioSummaryRecommendationFromOutcome,
  scenarioSummaryUserChannelRead as getScenarioSummaryUserChannelRead,
  scenarioTwoWayScore as getScenarioTwoWayScore,
  styleLabelFromActionDetail as getStyleLabelFromActionDetail,
} from './test-harness-scenario-battery-utils';
import {
  buildSideMirrorSmokeRowsFromMatrix as buildSideMirrorSmokeRowsFromMatrixUtils,
  formationWidthReadFromPositions as getFormationWidthReadFromPositions,
  formationWingbackReadFromPositions as getFormationWingbackReadFromPositions,
  mapSyntheticSideMirrorRows as mapSyntheticSideMirrorRowsUtils,
  sideMirrorRealRead as getSideMirrorRealRead,
} from './side-mirror-read-utils';
import {
  allFormationsRoleSlotSmokeMarkdownReport as buildAllFormationsRoleSlotSmokeMarkdownReport,
  allFormationsRoleSlotSmokeVerdictCounter as countAllFormationsRoleSlotSmokeVerdicts,
  roleSlotImpactSmokeMarkdownReport as buildRoleSlotImpactSmokeMarkdownReport,
  roleSlotImpactSmokeVerdictCounter as countRoleSlotImpactSmokeVerdicts,
} from './role-slot-smoke-report-utils';
import {
  backFiveContextClass as getBackFiveContextClass,
  backFiveContextRead as getBackFiveContextRead,
  backFiveFamilyClass as getBackFiveFamilyClass,
  backFiveFamilyRead as getBackFiveFamilyRead,
  backFiveTransitionClass as getBackFiveTransitionClass,
  backFiveTransitionRead as getBackFiveTransitionRead,
  lowBlockLabClass as getLowBlockLabClass,
  lowBlockLabRead as getLowBlockLabRead,
} from './tactical-lab-read-utils';
import {
  playerSwapHasLargeQualityDrop as hasLargePlayerSwapQualityDrop,
  playerSwapBatteryCoachRead as getPlayerSwapBatteryCoachRead,
  playerSwapBatteryCounterText as getPlayerSwapBatteryCounterText,
  playerSwapBatteryBestWorstText as getPlayerSwapBatteryBestWorstText,
  playerSwapObjectiveContrastText as getPlayerSwapObjectiveContrastText,
  playerSwapObjectiveText as getPlayerSwapObjectiveText,
  playerSwapOverallDelta as getPlayerSwapOverallDelta,
  playerSwapOverallDeltaText as getPlayerSwapOverallDeltaText,
  playerSwapQualityWarning as getPlayerSwapQualityWarning,
  playerSwapCoachAttackScore as getPlayerSwapCoachAttackScore,
  playerSwapCoachNetScore as getPlayerSwapCoachNetScore,
  playerSwapCoachRead as getPlayerSwapCoachRead,
  playerSwapCoachReadClass as getPlayerSwapCoachReadClass,
  playerSwapCoachReadDetail as getPlayerSwapCoachReadDetail,
  playerSwapCoachReadLevel as getPlayerSwapCoachReadLevel,
  playerSwapCoachRiskScore as getPlayerSwapCoachRiskScore,
  playerSwapDecisionScore as getPlayerSwapDecisionScore,
  playerSwapIsActionableRecommendation as getPlayerSwapIsActionableRecommendation,
  playerSwapProtectSpecialistScore as getPlayerSwapProtectSpecialistScore,
  playerSwapPrecisionStability as getPlayerSwapPrecisionStability,
  playerSwapPrecisionStabilityClass as getPlayerSwapPrecisionStabilityClass,
  playerSwapRoleTradeoff as getPlayerSwapRoleTradeoff,
  playerSwapSignalClass as getPlayerSwapSignalClass,
  playerSwapSignalRead as getPlayerSwapSignalRead,
  playerSwapSignalScore as getPlayerSwapSignalScore,
  playerSwapTacticalBreakdown as getPlayerSwapTacticalBreakdown,
  playerSwapTacticalLabel as getPlayerSwapTacticalLabel,
} from './player-swap-analysis';
import {
  positionPixelAttackGainScore as getPositionPixelAttackGainScore,
  positionPixelAttackLossScore as getPositionPixelAttackLossScore,
  positionPixelChannelBreakdown as getPositionPixelChannelBreakdown,
  positionPixelChannelBreakdownClass as getPositionPixelChannelBreakdownClass,
  positionPixelChannelBreakdownDetail as getPositionPixelChannelBreakdownDetail,
  positionPixelChannelBreakdownRead as getPositionPixelChannelBreakdownRead,
  PositionPixelChannelBreakdown,
  positionPixelChannelSign as getPositionPixelChannelSign,
  positionPixelCoachRead as getPositionPixelCoachRead,
  positionPixelContextualCoverageNote as getPositionPixelContextualCoverageNote,
  positionPixelCoverageChannelLabel as getPositionPixelCoverageChannelLabel,
  positionPixelDecisionScore as getPositionPixelDecisionScore,
  positionPixelDefensiveGainScore as getPositionPixelDefensiveGainScore,
  positionPixelDefensiveRiskScore as getPositionPixelDefensiveRiskScore,
  positionPixelDistance as getPositionPixelDistance,
  positionPixelImpactScore as getPositionPixelImpactScore,
  positionPixelMovementConfidence as getPositionPixelMovementConfidence,
  positionPixelMatchSmokeVerdict as getPositionPixelMatchSmokeVerdict,
  positionPixelPlayerSmokeSeverity as getPositionPixelPlayerSmokeSeverity,
  positionPixelPlayerSmokeVerdict as getPositionPixelPlayerSmokeVerdict,
  positionPixelReadLevel as getPositionPixelReadLevel,
  positionPixelReadSeverity as getPositionPixelReadSeverity,
  positionPixelSignalClass as getPositionPixelSignalClass,
  positionPixelSignalDetail as getPositionPixelSignalDetail,
  positionPixelSignalRead as getPositionPixelSignalRead,
  positionPixelSignalScore as getPositionPixelSignalScore,
  positionPixelSmokeVerdictClass as getPositionPixelSmokeVerdictClass,
  positionPixelChannelLabel as getPositionPixelChannelLabel,
  positionPixelShapeDeltaText as getPositionPixelShapeDeltaText,
  positionPixelShapeMove as getPositionPixelShapeMove,
  positionPixelShapeMoveDetail as getPositionPixelShapeMoveDetail,
  positionPixelTacticalRead as getPositionPixelTacticalRead,
  positionPixelTacticalReadClass as getPositionPixelTacticalReadClass,
  positionPixelTacticalReadReason as getPositionPixelTacticalReadReason,
  positionPixelUsesContextualCoverage as getPositionPixelUsesContextualCoverage,
  positionPixelVisualExpectationClass as getPositionPixelVisualExpectationClass,
  positionPixelVisualExpectationDetail as getPositionPixelVisualExpectationDetail,
  positionPixelVisualExpectationMismatches as getPositionPixelVisualExpectationMismatches,
  positionPixelVisualExpectationRead as getPositionPixelVisualExpectationRead,
  positionPixelVisualEngineTensionClass as getPositionPixelVisualEngineTensionClass,
  positionPixelVisualEngineTensionDetail as getPositionPixelVisualEngineTensionDetail,
  positionPixelVisualEngineTensionRead as getPositionPixelVisualEngineTensionRead,
  positionPixelVisualEngineTensions as getPositionPixelVisualEngineTensions,
  PositionPixelVisualEngineTension,
  positionPixelIsMicroVisualMismatch as getPositionPixelIsMicroVisualMismatch,
  positionPixelVisualChannel as getPositionPixelVisualChannel,
  PositionPixelVisualChannel,
  positionPixelVisualLine as getPositionPixelVisualLine,
  PositionPixelVisualLine,
  positionPixelWideChannelReason as getPositionPixelWideChannelReason,
  clampFieldPercent,
  parseFieldSubdivision,
  subdivisionXPercent,
  subdivisionYPercent,
} from './position-pixel-analysis';
/**
 * Debug page for replaying and comparing match-engine scenarios.
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
  templateUrl: './test-harness-page.component.html',
  styleUrl: './test-harness-page.component.css',
})
export class TestHarnessPageComponent implements OnInit, OnDestroy {
  private careerService = inject(CareerService);
  private matchDetailApi = inject(MatchDetailApiService);
  private harness = inject(TestHarnessService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private logger = inject(AppLoggerService);
  private readonly AUTO_PLAYER_SWAP_STARTER = AUTO_PLAYER_SWAP_STARTER;
  private readonly AUTO_PLAYER_SWAP_BENCH = AUTO_PLAYER_SWAP_BENCH;
  private readonly formationPositionsByName = signal<Record<string, FormationDTO['positions']>>({});
  /** Allowed formation codes (UI select options). */
  readonly formationCodes: readonly FormationCode[] = FORMATION_CODES;
  readonly teamStyleOptions = TEAM_STYLE_OPTIONS;
  /** Constants exposed to the template. */
  readonly TIMELINE_MAX_MINUTE = TIMELINE_MAX_MINUTE;
  readonly TIMELINE_STEP = TIMELINE_STEP;
  /** Tick marks shown below the slider. */
  readonly minuteTicks = TEST_HARNESS_MINUTE_TICKS;
  /** Selected formation (two-way bound to mat-select via ngModel). */
  selectedFormationModel: FormationCode | null = '4-3-3';
  selectedStyleModel: TeamStyle = 'BALANCED';
  selectedSwapStarterIdModel: string | null = null;
  selectedSwapBenchIdModel: string | null = null;
  playerSwapSeedCountModel = 10;
  substitutionWhatIfMinuteModel = 60;
  readonly substitutionWhatIfMinuteOptions = SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS;
  playerSwapBatteryModeModel: 'natural' | 'mixed' | 'stress' = 'natural';
  playerSwapBatteryPrecisionModel: 'quick' | 'balanced' | 'reliable' = 'balanced';
  controlledTeamSideModel: ControlledTeamSide = 'USER';
  roleSlotImpactSlotIdModel = 'S06-3';
  readonly roleSlotImpactSlotOptions = ROLE_SLOT_IMPACT_SLOT_OPTIONS;
  scenarioBatteryGroupModel: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT' = 'OFFENSE';
  scenarioBatteryScopeModel: 'quick' | 'balanced' = 'quick';
  scenarioBatteryCoachObjectiveModel: ScenarioBatteryCoachObjectiveModel = 'AUTO';
  /** Seed for the replay button; null means non-reproducible. */
  seedInputModel: number | null = DEFAULT_REPLAY_SEED;
  /** Round selected in the simulate-round dropdown. */
  selectedRoundModel: number | null = null;
  // ============== State signals ==============
  /** The active careerId (resolved from CareerStatus; null if no career). */
  readonly careerId = signal<string | null>(null);
  readonly userTeamName = signal<string | null>(null);
  readonly squadHealthSummary = signal<TestHarnessSquadHealthSummary | null>(null);
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
  readonly replayStatusMessage = signal<string | null>(null);
  defensiveFallbackRestore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
  defensiveFallbackLabRead: string | null = null;
  /** Error message from the initial load (null when OK). */
  readonly loadError = signal<string | null>(null);
  /** Formation comparison results for selected match + seed. */
  readonly formationReplayResults = signal<FormationReplayResult[]>([]);
  /** Averaged formation comparison across multiple seeds. */
  readonly formationMatrixSummaryResults = signal<FormationMatrixSummaryRow[]>([]);
  readonly focusedWideBatteryRows = signal<FocusedWideBatteryRow[]>([]);
  readonly professionalSmokeSummary = signal<ProfessionalSmokeSummary | null>(null);
  private professionalSmokeRunId = 0;
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
            ? 'Motor sano: revisar plantel, roles, ancho y química real.'
            : realOk
              ? 'Caso real compensa, pero el control sintético pide revisar formación/motor.'
              : 'Revisar control sintético/formación antes de calibrar plantel.';
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
  readonly sideMirrorDecisionSummary = computed<SideMirrorDecisionSummary | null>(() => {
    const rows = this.sideMirrorDecisionRows();
    if (rows.length === 0) return null;
    const engineHealthyRealBiased = rows.filter((row) =>
      row.syntheticVerdict === 'OK' && row.realVerdict !== 'OK'
    ).length;
    const engineReview = rows.filter((row) => row.syntheticVerdict !== 'OK').length;
    const fullyHealthy = rows.filter((row) =>
      row.syntheticVerdict === 'OK' && row.realVerdict === 'OK'
    ).length;
    const focusRows = rows
      .filter((row) => row.syntheticVerdict !== 'OK' || row.realVerdict !== 'OK')
      .slice(0, 5)
      .map((row) => row.formation);
    const focus = focusRows.length > 0 ? focusRows.join(', ') : 'sin focos urgentes';
    const read = engineReview > 0
      ? `Primero revisar control sintético/formación en ${engineReview} caso(s); después mirar plantel real.`
      : engineHealthyRealBiased > 0
        ? `Motor controlado sano; ${engineHealthyRealBiased} caso(s) reales piden revisar plantel, roles, ancho o química.`
        : 'Motor y caso real responden parejo en las formaciones comparadas.';
    const className = engineReview > 0 ? 'read-check' : engineHealthyRealBiased > 0 ? 'read-visible' : 'read-strong';
    return {
      total: rows.length,
      engineHealthyRealBiased,
      engineReview,
      fullyHealthy,
      read,
      focus,
      className,
    };
  });
  readonly sideMirrorSmokeSummary = computed<SideMirrorSmokeSummary | null>(() => {
    const rows = this.sideMirrorSmokeRows();
    if (rows.length === 0) return null;
    const ok = rows.filter((row) => row.verdict === 'OK').length;
    const partial = rows.filter((row) => row.verdict === 'Parcial').length;
    const review = rows.filter((row) => row.verdict === 'Revisar').length;
    const partialFormations = rows
      .filter((row) => row.verdict === 'Parcial')
      .map((row) => row.formation)
      .join(', ');
    const reviewFormations = rows
      .filter((row) => row.verdict === 'Revisar')
      .map((row) => row.formation)
      .join(', ');
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
        ? 'El lado weak-left responde más fuerte: revisar si el plantel/formación carga mejor por derecha.'
        : 'El lado weak-right responde más fuerte: revisar si el plantel/formación carga mejor por izquierda.';
    const nextAction = review > 0
      ? `Prioridad: repetir/revisar ${reviewFormations || 'las formaciones marcadas'} con más seeds.`
      : partial > 0
        ? `Señal usable pero no perfecta: revisar ${partialFormations || 'los parciales'} si son tácticas clave.`
        : 'Sin deuda lateral inmediata en este smoke.';
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
      partialFormations,
      reviewFormations,
      avgWeakLeftExpectedEdge,
      avgWeakRightExpectedEdge,
      mirrorGap,
      read,
      nextAction,
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
            ? 'Carrileros medios: revisar por qu? un lado no genera ventaja.'
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
  /** Live-substitution replay comparison for the selected starter/bench pair. */
  readonly substitutionWhatIfSummary = signal<SubstitutionWhatIfSummary | null>(null);
  readonly modalRecommendationCandidateAttempts = signal<ModalRecommendationCandidateAttempt[]>([]);
  readonly substitutionTimingMatrixRows = signal<SubstitutionTimingMatrixRow[]>([]);
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
    const objective = this.playerSwapEffectiveCoachObjective();
    const sorted = [...rows].sort((a, b) => this.playerSwapDecisionScore(b, objective) - this.playerSwapDecisionScore(a, objective));
    const recommended = sorted.filter((row) => this.playerSwapIsActionableRecommendation(row));
    const seedCount = rows[0]?.seedCount ?? this.playerSwapSeedCountModel;
    const hasEstresRows = rows.some((row) => (row.testCase || '').toLowerCase().includes('stress'));
    const hasNaturalRows = rows.some((row) => (row.testCase || '').toLowerCase().includes('battery: natural'));
    const mode = hasEstresRows && hasNaturalRows ? 'combined' : rows[0]?.testCase?.toLowerCase().includes('stress') ? 'stress' : this.playerSwapBatteryModeModel;
    return {
      total: rows.length,
      mode,
      precision: this.playerSwapBatteryPrecisionModel,
      confidence: this.playerSwapBatteryConfidenceLabel(seedCount),
      best: recommended[0] ?? sorted[0] ?? null,
      bestAttack: [...rows].sort((a, b) => this.playerSwapDecisionScore(b, 'NEED_GOAL') - this.playerSwapDecisionScore(a, 'NEED_GOAL'))[0] ?? null,
      bestProtect: this.playerSwapBestProtectPick(rows),
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
      const substitutionSummary = this.substitutionWhatIfSummary();
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
        .split(/[?,·]/)
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
      const pixelMeasurableSmoothRows = pixelRows.filter((row) =>
        this.positionPixelDistance(row) > 1.25
        && this.positionPixelDistance(row) <= 6.0
        && row.signalScore >= 0.040
      ).length;
      const pixelRowsAreMicroOnly = pixelRows.length > 0
        && pixelRows.every((row) => this.positionPixelDistance(row) <= 1.5);
      const hasVisiblePixelSignal = pixelVisibleRows > 0
        || pixelVisibleFivePxRows > 0
        || pixelBigTacticalMoveRows > 0
        || pixelRunVisibleRows > 0
        || pixelMeasurableSmoothRows > 0
        || pixelRowsAreMicroOnly;
    const swapActionableReads = Object.entries(swapBattery.reads)
      .filter(([read]) => !['No clear effect', 'Neutral', 'Noise / neutral', 'Sin lectura clara'].includes(read))
      .reduce((sum, [, count]) => sum + count, 0);
    const swapMode = swapBattery.mode;
    const swapRowsForChecklist = this.playerSwapBatterySummaries();
    const swapEstresActionableReads = swapRowsForChecklist
      .filter((row) => (row.testCase || '').toLowerCase().includes('stress'))
      .filter((row) => !['No clear effect', 'Neutral', 'Noise / neutral', 'Sin lectura clara'].includes(row.swapRead))
      .length;
    const swapEstresSignalOk = (swapMode === 'stress' && swapActionableReads > 0)
      || (swapMode === 'combined' && swapEstresActionableReads > 0);
    const swapNaturalStable = swapMode === 'natural' && swapBattery.total > 0 && swapActionableReads === 0;
    const stableSwapReads = swapPrecisionRows.filter((row) => row.stability === 'Stable read').length;
    const changedSwapReads = swapPrecisionRows.filter((row) => row.stability === 'Changed read').length;
    const needsMoreSwapSeeds = swapPrecisionRows.filter((row) => row.stability === 'Needs more seeds').length;
    const swapObserved = hasSwapBattery
      ? `${swapBattery.total} swaps · ${swapActionableReads} actionable read(s) · ${swapBattery.confidence} · mode ${swapMode}`
      : hasSwapPrecision
        ? `${swapPrecisionRows.length} precision swaps ? ${stableSwapReads} stable ? ${changedSwapReads} changed ? ${needsMoreSwapSeeds} need more seeds`
        : 'Not run yet';
    const swapVerdict: ProfessionalQaChecklistRow['verdict'] = hasSwapBattery
      ? swapEstresSignalOk ? 'OK' : swapNaturalStable ? 'Fallback' : swapActionableReads > 0 ? 'OK' : 'Review'
      : hasSwapPrecision
        ? changedSwapReads > 0 ? 'Review' : needsMoreSwapSeeds > 0 ? 'Fallback' : 'OK'
        : 'Pending';
    const swapNext = hasSwapBattery
      ? swapEstresSignalOk
        ? swapMode === 'combined'
          ? 'Combined smoke OK: natural stability plus stress sensitivity.'
          : 'Estres sensitivity OK; use best/worst to tune role quality.'
        : swapNaturalStable
          ? 'Natural swaps are stable/neutral; run Estres test to verify sensitivity.'
          : swapActionableReads > 0
            ? 'Use best/worst to tune role quality.'
            : 'Check whether substitutions influence engine enough.'
      : hasSwapPrecision
        ? changedSwapReads > 0 ? 'Trust balanced reads; quick is smoke only.' : needsMoreSwapSeeds > 0 ? 'Run balanced or more seeds for borderline swaps.' : 'Precision stable enough.'
        : 'Run Batería cambio jugador or Comparar precisión.';
    const substitutionTimingRows = this.substitutionTimingMatrixRows();
    const hasSubstitutionWhatIf = !!substitutionSummary;
    const hasSubstitutionTiming = substitutionTimingRows.length > 0;
    const smokeNotes = [
      ...(this.professionalSmokeSummary()?.included ?? []),
      ...(this.professionalSmokeSummary()?.skipped ?? []),
    ];
    const hasNoSafeSubstitution = smokeNotes.some((note) =>
      note.toLowerCase().includes('sin sustitución segura')
      || note.toLowerCase().includes('sin sustitucion segura')
    );
    const substitutionTimingSignalRows = substitutionTimingRows.filter((row) =>
      Math.abs(row.deltaXgFor) >= 0.001
      || Math.abs(row.deltaXgAgainst) >= 0.001
      || Math.abs(row.deltaShotsFor) >= 0.01
      || Math.abs(row.deltaShotsAgainst) >= 0.01
      || Math.abs(row.deltaGoalsFor) >= 0.01
      || Math.abs(row.deltaGoalsAgainst) >= 0.01
    ).length;
    const substitutionSignal = substitutionSummary
      ? Math.abs(substitutionSummary.deltaXgFor) >= 0.001
        || Math.abs(substitutionSummary.deltaXgAgainst) >= 0.001
        || Math.abs(substitutionSummary.deltaShotsFor) >= 0.01
        || Math.abs(substitutionSummary.deltaShotsAgainst) >= 0.01
        || Math.abs(substitutionSummary.deltaGoalsFor) >= 0.01
        || Math.abs(substitutionSummary.deltaGoalsAgainst) >= 0.01
      : substitutionTimingSignalRows > 0;
    const substitutionObjective = this.playerSwapEffectiveCoachObjective();
    const substitutionObjectiveOk = !substitutionSummary
      ? substitutionTimingSignalRows > 0
      : substitutionObjective === 'NEED_GOAL'
        ? substitutionSummary.deltaXgFor > 0.001 || substitutionSummary.deltaShotsFor > 0.01
        : substitutionObjective === 'PROTECT_RESULT'
          ? substitutionSummary.deltaXgAgainst < -0.001 || substitutionSummary.deltaShotsAgainst < -0.01
          : substitutionSignal;
    const substitutionObserved = substitutionSummary
      ? `${substitutionSummary.playerOffName} → ${substitutionSummary.playerOnName} min ${substitutionSummary.minute} · dXG ${this.fmtDeltaNumber(substitutionSummary.deltaXgFor)} · dShots ${this.fmtDeltaNumber(substitutionSummary.deltaShotsFor)}`
      : hasSubstitutionTiming
        ? `${substitutionTimingRows[0].playerOffName} → ${substitutionTimingRows[0].playerOnName} min ${substitutionTimingRows.map((row) => `${row.minute}'`).join('/')} · ${substitutionTimingSignalRows}/${substitutionTimingRows.length} con señal`
        : hasNoSafeSubstitution
          ? 'Sin sustitución segura para el objetivo DT actual.'
        : 'Not run yet';
    return [
      {
        check: 'All formations audit',
        expected: `${expectedFormationAuditRows} line checks after running all ${this.formationCodes.length} formations.`,
        observed: hasAudit
          ? `${rows.length}/${expectedFormationAuditRows} rows · ${auditedFormationCount}/${this.formationCodes.length} formations · ${countByVerdict('OK')} OK · ${countByVerdict('Fallback')} fallback · ${countByVerdict('Review')} review`
          : 'Not run yet',
        verdict: !hasAudit ? 'Pending' : !hasAllFormationAudit ? 'Review' : hardReviews.length > 0 ? 'Review' : fallbackRows.length > 0 ? 'Fallback' : 'OK',
        next: !hasAudit ? 'Run Auditoría todas las formaciones.' : !hasAllFormationAudit ? 'Run the all-formations audit, not only current formation.' : hardReviews.length > 0 ? 'Inspect Review rows first.' : fallbackRows.length > 0 ? 'Fallbacks are allowed; preview/engine apply role-fit penalties.' : 'Keep as contract.',
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
          ? `${Math.max(pixelRows.length, lastPixelMappedRows)} rows · ${pixelMatchSummaries.length + pixelRunSummaries.length} match summaries · ${pixelPlayerSummaries.length} player summaries · ${pixelVisibleRows + pixelVisibleFivePxRows + pixelBigTacticalMoveRows + pixelRunVisibleRows} visible/non-stable · ${pixelMeasurableSmoothRows} measurable smooth`
          : 'Not run yet',
        verdict: !hasPixelEvidence ? 'Pending' : hasVisiblePixelSignal ? 'OK' : pixelEvidenceNote ? 'Review' : 'Review',
        next: !hasPixelEvidence
          ? 'Run Matriz presets posición or line smokes.'
          : pixelEvidenceNote && !hasVisiblePixelSignal
            ? pixelEvidenceNote
            : pixelVisibleRows > 0 || pixelVisibleFivePxRows > 0 || pixelBigTacticalMoveRows > 0
            ? 'Use rows to calibrate direction.'
            : pixelMeasurableSmoothRows > 0
              ? 'Smooth low-block signal: keep as valid unless tuning needs more weight.'
            : pixelRowsAreMicroOnly
              ? 'Micro movements are stable; run Matriz presets posición for larger tactical moves.'
              : 'Increase seeds or inspect engine sensitivity.',
      },
        {
          check: 'Pixel no-cliff rule',
          expected: '1px moves should be smooth, not strong cliff jumps.',
          observed: hasPixelEvidence ? `${pixelCliffRows} strong 1px cliff row(s) · ${pixelRepeatedFivePxRows} match repeated 5px bias · ${pixelPlayerRepeatedFivePxRows} player repeated 5px bias · ${pixelVisibleFivePxRows} visible 5px pattern(s) · ${pixelBigTacticalMoveRows} big tactical move(s)` : 'Not run yet',
          verdict: !hasPixelEvidence ? 'Pending' : pixelEvidenceNote || pixelCliffRows > 0 || pixelRepeatedFivePxRows > 0 || pixelPlayerRepeatedFivePxRows > 0 ? 'Review' : 'OK',
          next: !hasPixelEvidence ? 'Run Chequeo sensibilidad.' : pixelEvidenceNote ? pixelEvidenceNote : pixelCliffRows > 0 ? 'Inspect 1px thresholds / zone boundaries.' : pixelRepeatedFivePxRows > 0 || pixelPlayerRepeatedFivePxRows > 0 ? 'Inspect 5px directional sensitivity / zone boundaries.' : pixelVisibleFivePxRows > 0 || pixelBigTacticalMoveRows > 0 ? 'Micro is smooth; calibrate 5px/big tactical sensitivity separately.' : 'Keep as contract.',
        },
      {
        check: 'Señal cambio jugador',
        expected: 'Changing players should affect role quality and match averages.',
        observed: swapObserved,
        verdict: swapVerdict,
        next: swapNext,
      },
      {
        check: 'Live substitution signal',
        expected: 'Same seed baseline vs minute substitution should alter match averages in the selected coach objective direction.',
        observed: substitutionObserved,
        verdict: hasNoSafeSubstitution
          ? 'Fallback'
          : !hasSubstitutionWhatIf && !hasSubstitutionTiming ? 'Pending' : substitutionSignal && substitutionObjectiveOk ? 'OK' : 'Review',
        next: !hasSubstitutionWhatIf && !hasSubstitutionTiming
          ? hasNoSafeSubstitution
            ? 'No safe substitution for the current coach objective; keep structure or change manually.'
            : 'Run Simular sustitución or Smoke profesional full.'
          : substitutionSignal && substitutionObjectiveOk
            ? 'Keep as modal -> harness -> engine contract.'
            : substitutionObjective === 'PROTECT_RESULT'
              ? 'Protect objective must lower xGA or shots against; inspect candidate quality and role fit.'
              : substitutionObjective === 'NEED_GOAL'
                ? 'Need-goal objective must raise xG or shots; inspect candidate quality and attacking role fit.'
                : 'Inspect candidate quality, IDs, and minute impact; increase seeds if borderline.',
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
          return this.positionPixelIsDiagonalMove(row) && this.positionPixelVisualExpectationRead(row) === 'Visual review';
        }
        if (filter === 'diagonal-micro') {
          return this.positionPixelIsDiagonalMove(row) && this.positionPixelVisualExpectationRead(row) === 'Visual micro';
        }
        if (filter === 'diagonal-review') {
          return this.positionPixelIsDiagonalMove(row) && this.positionPixelVisualEngineTensionRead(row) !== 'Coherente';
        }
        if (filter === 'visual-mismatch') return this.positionPixelVisualExpectationRead(row) === 'Visual review';
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
    const visualMismatchRows = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual review');
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
        title: 'Mejor protección',
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
    return getScenarioBatteryCandidateMatches(
      this.rounds(),
      this.selectedMatchId(),
      this.scenarioBatteryMatchLimit()
    );
  }
  private buildScenarioDecisionCards(summaryRows: ScenarioMatrixSummaryRow[]): ScenarioDecisionCard[] {
    return buildScenarioDecisionCardsFromSummaryUtils(summaryRows, {
      actionKey: (row) => this.scenarioActionKey(row),
      attackCandidateIsCoachWorthy: (row) => this.scenarioAttackCandidateIsCoachWorthy(row),
      attackPlanScore: (row) => this.scenarioAttackPlanScore(row),
      cardFromRow: (title, row, className, detail) => this.scenarioDecisionCardFromRow(title, row, className, detail),
      isOpponentRow: (row) => this.isOpponentScenarioRow(row),
      opponentMaxChannelXgDelta: (row) => this.scenarioOpponentMaxChannelXgDelta(row),
      opponentMinChannelXgDelta: (row) => this.scenarioOpponentMinChannelXgDelta(row),
      opponentProtectionRead: (row) => this.scenarioOpponentProtectionRead(row),
      opponentRiskRead: (row) => this.scenarioOpponentRiskRead(row),
      protectionCandidateIsCoachWorthy: (row) => this.scenarioProtectionCandidateIsCoachWorthy(row),
      summaryActionLabel: (row) => this.summaryActionLabel(row),
      summaryCoachRead: (row) => this.scenarioSummaryCoachRead(row),
      userChannelRead: (row) => this.scenarioSummaryUserChannelRead(row),
      twoWayScore: (row) => this.scenarioTwoWayScore(row),
      formatDeltaNumber: (value) => this.fmtDeltaNumber(value),
    });
  }
  /** User-facing pointer to the latest finished replay-analysis result. */
  readonly analysisReadyMessage = signal<string | null>(null);
  readonly dirtyHarnessCase = computed(() => {
    const health = this.squadHealthSummary();
    if (!health) {
      return false;
    }
    return (health.injuredCount ?? 0) > 0
      || (health.suspendedCount ?? 0) > 0
      || (health.redCardsCount ?? 0) > 0;
  });
  readonly dirtyHarnessCaseMessage = computed(() => {
    const health = this.squadHealthSummary();
    if (!health || !this.dirtyHarnessCase()) {
      return null;
    }
    const parts: string[] = [];
    if ((health.injuredCount ?? 0) > 0) {
      parts.push(`${health.injuredCount} lesionado(s)`);
    }
    if ((health.suspendedCount ?? 0) > 0) {
      parts.push(`${health.suspendedCount} suspendido(s)`);
    }
    if ((health.redCardsCount ?? 0) > 0) {
      parts.push(`${health.redCardsCount} roja(s)`);
    }
    return `Caso sucio para comparar: ${parts.join(' · ')}. Usá Reset Injuries antes de correr matrices si querés una lectura limpia del DT.`;
  });
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
  readonly selectedMatchHasDetail = computed(() => {
    const status = String(this.selectedMatch()?.status ?? '').toUpperCase();
    return status === 'COMPLETED';
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
    return `Ojo: el partido seleccionado es ${m.homeTeamName} vs ${m.awayTeamName}, pero Aplicar formación / modal DT afectan a ${userTeam}. Para probar el motor de tu equipo, elegí un partido donde juegue ${userTeam}. Si querés analizar este partido igual, usa Controlar: Local/Visitante.`;
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
      return 'A favor/en contra se activa al seleccionar un partido.';
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
    // Re-fetch the timeline snapshot whenever the selected
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
      if (!matchId || !careerId || !this.selectedMatchHasDetail()) {
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

  private logHarnessRestoreWarning(err: unknown): void {
    this.logger.warn('[TEST-HARNESS] Failed to restore lineup after last modal move smoke:', err);
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
    const timeline = this.timelineSnapshot();
    const hasTimelineBaseline = !!timeline;
    const hasReplayResult = !!this.currentLineupReplayResult()
      || !!this.currentLineupMultiSeedSummary()
      || !!this.modalVsCanonicalSummary()
      || this.scenarioMatrixSummaryResults().length > 0
      || this.scenarioBatteryRows().length > 0;
    const hasBaselineEvidence = hasReplayResult || hasTimelineBaseline;
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
        body: hasTimelineBaseline && !hasReplayResult
          ? 'El partido ya tiene detalle minuto a minuto cargado; corre Repetir con seed si queres fijar una referencia nueva.'
          : hasMatch
          ? `Usa Repetir con seed (${this.seedInputModel ?? 'auto'}) para fijar una referencia reproducible.`
          : 'Primero necesitamos un partido seleccionado.',
        status: hasBaselineEvidence ? 'OK' : '2',
        state: hasBaselineEvidence ? 'done' : hasMatch ? 'active' : 'pending',
      },
      {
        title: '3. Aplicar cambio DT',
        body: hasMatch
          ? 'Abre el modal, cambia formación/jugadores/píxeles y vuelve a correr Current lineup, Base vs modal o Scenario.'
          : 'El cambio DT tiene sentido después de elegir partido.',
        status: hasPanelE ? 'OK' : '3',
        state: hasPanelE ? 'done' : hasBaselineEvidence ? 'active' : 'pending',
      },
      {
        title: '4. Abrir comparación',
        body: hasMatch
          ? 'Abrir comparador abre baseline vs live del mismo partido para leer goles, xG, tiros, posesión y timeline.'
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
          `Current lineup vacío; auto-select ${formation} antes de correr el harness.`
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
        this.squadHealthSummary.set({
          ...(this.squadHealthSummary() ?? {}),
          injuredCount: 0,
          suspendedCount: 0,
          yellowCardsCount: 0,
          redCardsCount: 0,
        });
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
    // For now the UI only triggers a no-op POST (the backend
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
    return formatXg(value);
  }
  copyFormationMatrixJson(): void {
    const payload = JSON.stringify(this.formationReplayResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Matriz formaciones JSON copied.', 'OK', { duration: 2500 }),
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
      () => this.snackBar.open('XI actual multi-seed JSON copied.', 'OK', { duration: 2500 }),
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
      () => this.snackBar.open('Matriz cambio jugador JSON copied.', 'OK', { duration: 2500 }),
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
      () => this.snackBar.open('Batería cambio jugador JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }
  copyPlayerSwapBatteryReport(): void {
    const payload = this.playerSwapBatteryMarkdownReport();
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Batería cambio jugador report copied.', 'OK', { duration: 2500 }),
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
      () => this.snackBar.open('Matriz escenarios JSON copied.', 'OK', { duration: 2500 }),
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
    this.substitutionWhatIfSummary.set(null);
    this.substitutionTimingMatrixRows.set([]);
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
    this.substitutionWhatIfSummary.set(null);
    this.substitutionTimingMatrixRows.set([]);
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
    const lines = this.csvLines(header, rows as unknown as Record<string, unknown>[]);
    this.downloadCsv(lines, `formation-matrix-${this.seedInputModel ?? 'auto'}.csv`);
    this.snackBar.open(`Matriz formaciones CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  downloadPlayerSwapMatrixCsv(): void {
    const row = this.playerSwapMatrixSummary();
    if (!row) {
      this.snackBar.open('Run Matriz cambio jugador first.', 'OK', { duration: 2500 });
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
    const lines = this.csvLines(header, [exportRow as Record<string, unknown>]);
    this.downloadCsv(lines, `player-swap-${row.formation}-${row.slotId}-${row.seedStart}-${row.seedEnd}.csv`);
    this.snackBar.open('Matriz cambio jugador CSV exported.', 'OK', { duration: 2500 });
  }
  downloadPlayerSwapBatteryCsv(): void {
    const rows = this.playerSwapBatterySummaries();
    if (rows.length === 0) {
      this.snackBar.open('Run Batería cambio jugador first.', 'OK', { duration: 2500 });
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
    const lines = this.csvLines(header, exportRows);
    this.downloadCsv(lines, `player-swap-battery-${this.playerSwapBatteryPrecisionModel}-${rows[0].formation}-${rows[0].seedStart}-${rows[0].seedEnd}.csv`);
    this.snackBar.open(`Batería cambio jugador CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
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
    const lines = this.csvLines(header, rows as unknown as Record<string, unknown>[]);
    this.downloadCsv(lines, `position-movement-${this.positionPixelReadFilter()}-${this.positionPixelSortMode()}-${this.seedInputModel ?? 'auto'}.csv`);
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
    const lines = this.csvLines(header, rows);
    this.downloadCsv(lines, `scenario-summary-${this.scenarioSummaryReadFilter()}-${this.scenarioSummarySortMode()}-${this.summarySeedStart()}-${this.summarySeedEnd()}.csv`);
    this.snackBar.open(`Scenario summary CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  downloadScenarioBatteryCsv(): void {
    const rows = this.scenarioBatteryRows().map((row) => this.scenarioBatteryExportRow(row));
    if (rows.length === 0) {
      this.snackBar.open('Run Tablero batería first.', 'OK', { duration: 2500 });
      return;
    }
    const header = [
      'match', 'controlledTeam', 'controlledSide', 'scenarioGroup', 'coachObjective', 'coachContext', 'coachContextDetail', 'review', 'reviewDetail', 'seedStart', 'seedCount', 'scenarioCount',
      'decision', 'decisionDetail',
      'plan', 'twoWay', 'attack', 'shape', 'protect', 'avoid', 'opponentThreat',
      'planDetail', 'twoWayDetail', 'attackDetail', 'shapeDetail', 'protectDetail', 'avoidDetail', 'opponentThreatDetail',
    ];
    const lines = this.csvLines(header, rows);
    this.downloadCsv(lines, `scenario-battery-${this.summarySeedStart()}-${this.summarySeedStart() + this.scenarioMatrixSmokeSeedCount() - 1}.csv`);
    this.snackBar.open(`Scenario battery CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  }
  private csvCell(value: unknown): string {
    return formatCsvCell(value);
  }
  private csvLines(header: string[], rows: Record<string, unknown>[]): string[] {
    return buildCsvLines(header, rows);
  }
  private downloadCsv(lines: string[], filename: string): void {
    saveTextFile(lines.join('\n'), filename, 'text/csv;charset=utf-8');
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
      `Recommendation: ${this.playerSwapBatteryBestWorstText(summary.best)}`,
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
    return getPlayerSwapBatteryCoachRead(summary);
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
    const movedPlayers = this.modalMovedPlayers(originalLineup);
    const rawImpact = Math.abs(deltaXgFor)
      + Math.abs(deltaXgAgainst)
      + Math.abs(deltaShotDiff) * 0.03
      + Math.abs(modal.avgPossessionFor - canonical.avgPossessionFor) * 0.01;
    const engineImpactLabel = rawImpact >= 0.18
      ? 'impacto claro'
      : rawImpact >= 0.06
        ? 'impacto visible'
        : rawImpact >= 0.015
          ? 'impacto leve'
          : 'casi neutro';
    const engineImpactDetail = rawImpact >= 0.015
      ? 'el motor está leyendo el cambio guardado; revisar dirección y peso con más seeds si el caso es fino'
      : customMovableSlotCount > 0
        ? 'el cambio guardado existe, pero esta muestra no movió el partido de forma visible; probar más seeds o un movimiento mayor'
        : 'primero mover un jugador de campo en el Modal DT';
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
      movedPlayers,
      engineImpactLabel,
      engineImpactDetail,
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
  private modalMovedPlayers(lineup: LineupDTO): string[] {
    const playersById = new Map((lineup.players ?? []).map((player) => [player.playerId, player]));
    return (lineup.slots ?? [])
      .filter((slot) => {
        const player = playersById.get(slot.playerId);
        if (player?.position?.toUpperCase() === 'GK') return false;
        return Number.isFinite(slot.customXPercent) || Number.isFinite(slot.customYPercent);
      })
      .map((slot) => {
        const player = playersById.get(slot.playerId);
        const name = player?.name ?? slot.playerId;
        const position = player?.position ?? 'slot';
        const x = Number.isFinite(slot.customXPercent) ? `${Number(slot.customXPercent).toFixed(1)}%` : 'base';
        const y = Number.isFinite(slot.customYPercent) ? `${Number(slot.customYPercent).toFixed(1)}%` : 'base';
        return `${name} (${position}, ${x}/${y})`;
      });
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
      baselinePlayerPosition: row.baselinePlayerPosition || candidate?.starterPosition || 'UNK',
      swapPlayerPosition: row.swapPlayerPosition || candidate?.benchPosition || 'UNK',
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

  private toSubstitutionTimingMatrixRow(row: SubstitutionWhatIfSummaryRow): SubstitutionTimingMatrixRow {
    const score = row.deltaXgDiff + row.deltaShotsFor * 0.04 - row.deltaXgAgainst * 0.6;
    const timingRead = score >= 0.18
      ? 'Fuerte mejora'
      : score >= 0.05
        ? 'Mejora leve'
        : score <= -0.18
          ? 'Empeora'
          : 'Casi neutro';
    return {
      ...row,
      readClass: this.deltaClass(score),
      timingRead,
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
      summary: countRoleSlotImpactSmokeVerdicts(rows),
      rows,
    };
  }
  private roleSlotImpactSmokeMarkdownReport(): string {
    return buildRoleSlotImpactSmokeMarkdownReport(
      this.roleSlotImpactSmokeExportPayload(),
      (value) => this.fmtPct(value)
    );
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
      summary: countAllFormationsRoleSlotSmokeVerdicts(rows),
      rows,
    };
  }
  private allFormationsRoleSlotSmokeMarkdownReport(): string {
    return buildAllFormationsRoleSlotSmokeMarkdownReport(
      this.allFormationsRoleSlotSmokeExportPayload(),
      (value) => this.fmtPct(value)
    );
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
    if (!candidate?.testCase?.startsWith('Estres:') || !resolved) {
      return base;
    }
    const expected = this.playerSwapEstresExpectedLines(candidate.testCase);
    if (!expected) {
      return base;
    }
    const starterLine = this.positionPixelLine(resolved.starterPosition);
    const benchLine = this.positionPixelLine(resolved.benchPosition);
    if (starterLine === expected.starterLine && benchLine === expected.benchLine) {
      return base;
    }
      return `${base} · fallback ${starterLine}→${benchLine}`;
  }
  private playerSwapEstresExpectedLines(testCase: string): { starterLine: 'ATT' | 'MID' | 'DEF'; benchLine: 'ATT' | 'MID' | 'DEF' } | null {
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
    return getPlayerSwapCoachRead(this.playerSwapCoachReadLevel(row, candidate));
  }
  private playerSwapCoachReadClass(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    return getPlayerSwapCoachReadClass(this.playerSwapCoachReadLevel(row, candidate));
  }
  private playerSwapCoachReadDetail(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    return getPlayerSwapCoachReadDetail(row, this.playerSwapRoleRisk(candidate), (value) => this.fmtDeltaNumber(value));
  }
  private playerSwapCoachReadLevel(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): 'upgrade' | 'downgrade' | 'tradeoff' | 'neutral' | 'review' {
    return getPlayerSwapCoachReadLevel(row, this.playerSwapRoleRisk(candidate));
  }
  private playerSwapHasLargeQualityDrop(row: Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>): boolean {
    return hasLargePlayerSwapQualityDrop(row);
  }
  private playerSwapQualityWarning(row: Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>): string {
    return getPlayerSwapQualityWarning(row, (value) => this.fmtDeltaNumber(value));
  }
  private playerSwapOverallDelta(row: Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>): number | null {
    return getPlayerSwapOverallDelta(row);
  }
  private playerSwapOverallDeltaText(row: Pick<PlayerSwapMatrixSummaryRow, 'baselinePlayerOverall' | 'swapPlayerOverall'>): string {
    return getPlayerSwapOverallDeltaText(row, (value) => this.fmtDeltaNumber(value));
  }
  private playerSwapCoachNetScore(row: PlayerSwapMatrixSummaryRow): number {
    return getPlayerSwapCoachNetScore(row);
  }
  private playerSwapCoachAttackScore(row: PlayerSwapMatrixSummaryRow): number {
    return getPlayerSwapCoachAttackScore(row);
  }
  private playerSwapCoachRiskScore(row: PlayerSwapMatrixSummaryRow): number {
    return getPlayerSwapCoachRiskScore(row);
  }
  private playerSwapRoleTradeoff(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): boolean {
    return getPlayerSwapRoleTradeoff(row, this.playerSwapRoleRisk(candidate));
  }
  private playerSwapSignalScore(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): number {
    return getPlayerSwapSignalScore(row, this.playerSwapRoleRisk(candidate));
  }
  private playerSwapSignalRead(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    return getPlayerSwapSignalRead(this.playerSwapSignalScore(row, candidate));
  }
  private playerSwapSignalClass(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    return getPlayerSwapSignalClass(this.playerSwapSignalScore(row, candidate));
  }
  private playerSwapSignalDetail(row: PlayerSwapMatrixSummaryRow, candidate: PlayerSwapCandidate | null = null): string {
    const roleRisk = this.playerSwapRoleRisk(candidate);
    return [
      `señal ${this.playerSwapSignalScore(row, candidate).toFixed(3)}`,
      `xG diff ${this.fmtDeltaNumber(row.deltaXgDiff)}`,
      `pre-auto-sub ${this.fmtDeltaNumber(row.preAutoSubDeltaXgDiff || 0)}`,
      `shots ${this.fmtDeltaNumber(row.deltaShotsFor)}/${this.fmtDeltaNumber(row.deltaShotsAgainst)}`,
      `rol att/control/prot ${roleRisk.attack.toFixed(3)}/${roleRisk.control.toFixed(3)}/${roleRisk.protection.toFixed(3)}`,
    ].join(' ? ');
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
    return getPlayerSwapTacticalBreakdown(row, this.playerSwapRoleRisk(candidate), (value) => this.fmtDeltaNumber(value));
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
        detail: 'Alerta de rol: cambia defensa por atacante/banda y expone protección',
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
    return getPlayerSwapTacticalLabel(score, dimension);
  }
  private playerSwapDecisionScore(
    row: PlayerSwapMatrixSummary,
    objective: ScenarioBatteryCoachObjective = this.playerSwapEffectiveCoachObjective()
  ): number {
    return getPlayerSwapDecisionScore(row, objective);
  }
  private playerSwapBestProtectPick(rows: PlayerSwapMatrixSummary[]): PlayerSwapMatrixSummary | null {
    if (rows.length === 0) return null;
    const defensiveRows = rows.filter((row) => {
      const benchPosition = row.swapPlayerPosition;
      const starterPosition = row.baselinePlayerPosition;
      return ['DEF', 'MID'].includes(benchPosition)
        || ['DEF', 'MID'].includes(starterPosition)
        || row.swapFit === 'Same profile'
        || row.swapFit === 'Same line';
    });
    const pool = defensiveRows.length > 0 ? defensiveRows : rows;
    return [...pool].sort((a, b) =>
      this.playerSwapProtectSpecialistScore(b) - this.playerSwapProtectSpecialistScore(a)
    )[0] ?? null;
  }
  private playerSwapProtectSpecialistScore(row: PlayerSwapMatrixSummary): number {
    return getPlayerSwapProtectSpecialistScore(row);
  }
  private playerSwapIsActionableRecommendation(row: PlayerSwapMatrixSummary): boolean {
    return getPlayerSwapIsActionableRecommendation(row);
  }
  playerSwapFit(candidate: PlayerSwapCandidate | null): string {
    const level = this.playerSwapFitLevel(candidate);
    if (level === 'profile') return 'Same profile';
    if (level === 'line') return 'Same line';
    return 'Out of role';
  }
  playerSwapFitClass(candidate: PlayerSwapCandidate | null): string {
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
    const clamp = clampFieldPercent;
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
  private manualShapeVsPresetPresets(
    fromX: number,
    fromY: number,
    candidate: PositionPixelCandidate
  ): Array<{ label: string; x: number; y: number; dx: number; dy: number }> {
    const clamp = clampFieldPercent;
    const line = this.positionPixelVisualLine(fromY);
    const toCenter = clamp(50) - clamp(fromX);
    const smallCenterStep = Math.max(-5, Math.min(5, toCenter));
    if (line === 'DEF') {
      return [
        { label: 'manual 4-4-2 same spot', x: clamp(fromX), y: clamp(fromY), dx: 0, dy: 0 },
        { label: 'manual DEF 5px step', x: clamp(fromX), y: clamp(fromY - 5), dx: 0, dy: -5 },
        { label: 'manual DEF 10px step', x: clamp(fromX), y: clamp(fromY - 10), dx: 0, dy: -10 },
        { label: 'manual DEF tuck center', x: clamp(fromX + smallCenterStep), y: clamp(fromY), dx: smallCenterStep, dy: 0 },
        { label: 'manual DEF line break', x: clamp(fromX + smallCenterStep), y: clamp(58), dx: smallCenterStep, dy: clamp(58) - clamp(fromY) },
      ];
    }
    if (line === 'ATT') {
      return [
        { label: 'manual 4-4-2 same spot', x: clamp(fromX), y: clamp(fromY), dx: 0, dy: 0 },
        { label: 'manual ATT 5px higher', x: clamp(fromX), y: clamp(fromY - 5), dx: 0, dy: -5 },
        { label: 'manual ATT 10px higher', x: clamp(fromX), y: clamp(fromY - 10), dx: 0, dy: -10 },
        { label: 'manual ATT half-space', x: clamp(fromX + smallCenterStep), y: clamp(fromY + 2), dx: smallCenterStep, dy: 2 },
        { label: 'manual ATT drop to 4-2-3-1', x: clamp(fromX + smallCenterStep), y: clamp(38), dx: smallCenterStep, dy: clamp(38) - clamp(fromY) },
      ];
    }
    const wideDelta = fromX <= 50 ? -6 : 6;
    return [
      { label: 'manual 4-4-2 same spot', x: clamp(fromX), y: clamp(fromY), dx: 0, dy: 0 },
      { label: 'manual MID 5px higher', x: clamp(fromX), y: clamp(fromY - 5), dx: 0, dy: -5 },
      { label: 'manual MID 10px higher', x: clamp(fromX), y: clamp(fromY - 10), dx: 0, dy: -10 },
      { label: 'manual MID tuck center', x: clamp(fromX + smallCenterStep), y: clamp(fromY), dx: smallCenterStep, dy: 0 },
      { label: 'manual MID wide to 4-3-3', x: clamp(fromX + wideDelta), y: clamp(25), dx: wideDelta, dy: clamp(25) - clamp(fromY) },
    ];
  }
  private wingbackMovementPresets(
    fromX: number,
    fromY: number,
    candidate: PositionPixelCandidate
  ): Array<{ label: string; x: number; y: number; dx: number; dy: number }> {
    const clamp = clampFieldPercent;
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
    const parsed = parseFieldSubdivision(slotId);
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
    const clamp = clampFieldPercent;
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
    const clamp = clampFieldPercent;
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
      return clampFieldPercent(position.xPercent);
    }
    const parsed = parseFieldSubdivision(slot?.subdivisionId);
    if (!parsed) return null;
    const [sector, subIndex] = parsed;
    const sectorCol = (sector - 1) % 3;
    const left = (sectorCol * 3 + (subIndex - 1)) * 11.11;
    return clampFieldPercent(left + 11.11 / 2);
  }
  private canonicalYPercent(formation: string | null | undefined, slot: LineupSlotDTO | null | undefined): number | null {
    const position = this.canonicalFormationPosition(formation, slot);
    if (position && Number.isFinite(position.yPercent)) {
      return clampFieldPercent(position.yPercent);
    }
    if (slot?.subdivisionId === 'GK-1') return 93;
    const parsed = parseFieldSubdivision(slot?.subdivisionId);
    if (!parsed) return null;
    const [sector] = parsed;
    const sectorRow = Math.floor((sector - 1) / 3);
    const top = sectorRow * 11.11;
    return clampFieldPercent(top + 11.11 / 2);
  }
  private matchContextXPercent(slot: LineupSlotDTO | null | undefined): number | null {
    if (typeof slot?.customXPercent === 'number' && Number.isFinite(slot.customXPercent)) {
      return clampFieldPercent(slot.customXPercent);
    }
    return subdivisionXPercent(slot?.subdivisionId);
  }
  private matchContextYPercent(slot: LineupSlotDTO | null | undefined): number | null {
    if (typeof slot?.customYPercent === 'number' && Number.isFinite(slot.customYPercent)) {
      return clampFieldPercent(slot.customYPercent);
    }
    return subdivisionYPercent(slot?.subdivisionId);
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
      const read = this.lowBlockLabRead(
        item.variant.variant,
        deltaXgFor,
        deltaXgAgainst,
        deltaShotsAgainst,
        deltaPossessionFor
      );
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
    deltaShotsAgainst: number,
    deltaPossessionFor: number
  ): string {
    return getLowBlockLabRead(variant, deltaXgFor, deltaXgAgainst, deltaShotsAgainst, deltaPossessionFor);
  }
  private lowBlockLabClass(
    variant: LowBlockLabRow['variant'],
    deltaXgAgainst: number,
    deltaShotsAgainst: number
  ): string {
    return getLowBlockLabClass(variant, deltaXgAgainst, deltaShotsAgainst);
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
    return getBackFiveTransitionRead(variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor);
  }
  private backFiveTransitionClass(
    variant: BackFiveTransitionLabRow['variant'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaWideShotsFor: number
  ): string {
    return getBackFiveTransitionClass(variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor);
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
      bestPlan: best?.formation ?? '-',
      safestPlan: safest?.formation ?? '-',
      mostOffensivePlan: offensive?.formation ?? '-',
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
    return getBackFiveContextRead(best, safest, offensive);
  }
  private backFiveContextClass(
    best: BackFiveFamilyLabRow | null,
    safest: BackFiveFamilyLabRow | null,
    offensive: BackFiveFamilyLabRow | null
  ): string {
    return getBackFiveContextClass(best, safest, offensive);
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
    return getBackFiveFamilyRead(key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
  }
  private backFiveFamilyClass(
    key: BackFiveFamilyLabRow['key'],
    deltaXgFor: number,
    deltaXgAgainst: number,
    deltaWideShotsFor: number,
    deltaWideShotsAgainst: number
  ): string {
    return getBackFiveFamilyClass(key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
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
  private pickManualShapeVsPresetCandidates(lineup: LineupDTO): PositionPixelCandidate[] {
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
    const byLine = new Map<'DEF' | 'MID' | 'ATT', typeof movablePlayers[number][]>();
    for (const player of movablePlayers) {
      const line = playerLine(player);
      if (!line) continue;
      const current = byLine.get(line) ?? [];
      current.push(player);
      byLine.set(line, current);
    }
    const ordered = [
      selected ?? null,
      ...(byLine.get('MID') ?? []).slice(0, 2),
      ...(byLine.get('ATT') ?? []).slice(0, 1),
      ...(byLine.get('DEF') ?? []).slice(0, 1),
    ].filter((player): player is typeof movablePlayers[number] => !!player);
    const unique = new Map<string, typeof movablePlayers[number]>();
    for (const player of ordered) {
      unique.set(player.playerId, player);
    }
    return Array.from(unique.values())
      .slice(0, 3)
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
  private pickFocusedPixelCandidates(lineup: LineupDTO): PositionPixelCandidate[] {
    const slots = this.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const slotMetaByPlayer = new Map(slots.map((slot) => [slot.playerId, slot]));
    const players = (lineup.players ?? []).filter((player) => !!player.playerId && player.position !== 'GK');
    const scored = players.map((player) => {
      const slot = slotMetaByPlayer.get(player.playerId);
      const x = this.matchContextXPercent(slot) ?? this.canonicalXPercent(lineup.formation, slot) ?? 50;
      const line = this.positionPixelLineFromSlot(lineup.formation, slot)
        ?? this.strictPositionPixelLine(player.position)
        ?? this.positionPixelLine(player.position);
      const natural = String(player.position ?? '').toUpperCase();
      const wideRole = ['WINGER', 'LW', 'RW', 'LM', 'RM', 'LWB', 'RWB', 'LB', 'RB'].includes(natural);
      const wideSlot = x <= 30 || x >= 70;
      const attackingLine = line === 'ATT' || line === 'MID';
      const score = (wideSlot ? 4 : 0) + (wideRole ? 3 : 0) + (attackingLine ? 2 : 0) - (line === 'DEF' ? 2 : 0);
      return { player, score, x };
    }).sort((a, b) => b.score - a.score || Math.abs(b.x - 50) - Math.abs(a.x - 50));
    const unique = new Map<string, PositionPixelCandidate>();
    for (const item of scored) {
      if (item.score <= 0 || unique.has(item.player.playerId)) continue;
      unique.set(item.player.playerId, {
        starterId: item.player.playerId,
        starterName: item.player.name,
        starterPosition: item.player.position,
        slotId: slotByPlayer.get(item.player.playerId) ?? '',
      });
      if (unique.size >= 4) break;
    }
    if (unique.size < 2) {
      for (const candidate of (['ATT', 'MID'] as const).flatMap((line) => this.pickPositionPixelLineCandidates(lineup, line, 2))) {
        if (!candidate.starterId || unique.has(candidate.starterId)) continue;
        unique.set(candidate.starterId, candidate);
        if (unique.size >= 4) break;
      }
    }
    return Array.from(unique.values());
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
    if (players.length === 0 && candidates.length > 0) {
      warnings.push('Sweep de calibración sin XI actual; usa candidatos preset del partido.');
    } else if (players.length !== 11) {
      warnings.push(`XI incompleto: ${players.length}/11 jugadores.`);
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
  private pickModalRecommendationSwapCandidate(
    lineup: LineupDTO,
    squad: SessionPlayer[],
    objective: ScenarioBatteryCoachObjective
  ): PlayerSwapCandidate | null {
    const lineupIds = new Set((lineup.players ?? []).map((p) => p.playerId));
    const slots = this.buildLineupSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? []).filter((player) => player.position !== 'GK');
    const eligibleBench = squad
      .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK');
    const manualStarter = this.selectedSwapStarterIdModel
      ? starters.find((player) => player.playerId === this.selectedSwapStarterIdModel)
      : null;
    const manualBench = this.selectedSwapBenchIdModel
      ? eligibleBench.find((player) => player.sessionPlayerId === this.selectedSwapBenchIdModel)
      : null;
    if (manualStarter && manualBench) {
      return this.buildPlayerSwapCandidate(manualStarter, manualBench, slotByPlayer, `Modal DT manual: ${this.scenarioBatteryCoachObjectiveLabel(objective)}`);
    }
    const pairs: Array<{ starter: LineupDTO['players'][number]; bench: SessionPlayer; score: number }> = [];
    for (const starter of manualStarter ? [manualStarter] : starters) {
      for (const bench of manualBench ? [manualBench] : eligibleBench) {
        pairs.push({
          starter,
          bench,
          score: this.modalRecommendationCandidateScore(starter, bench, objective),
        });
      }
    }
    const best = pairs.sort((a, b) => b.score - a.score)[0];
    if (!best) {
      return null;
    }
    if (objective === 'PROTECT_RESULT' && best.score < 8) {
      return null;
    }
    return this.buildPlayerSwapCandidate(
      best.starter,
      best.bench,
      slotByPlayer,
      `Modal DT: ${this.scenarioBatteryCoachObjectiveLabel(objective)} (${best.score.toFixed(1)})`
    );
  }
  private pickModalRecommendationSwapCandidates(
    lineup: LineupDTO,
    squad: SessionPlayer[],
    objective: ScenarioBatteryCoachObjective,
    limit = 5
  ): PlayerSwapCandidate[] {
    const lineupIds = new Set((lineup.players ?? []).map((p) => p.playerId));
    const slots = this.buildLineupSlots(lineup);
    const slotByPlayer = new Map(slots.map((slot) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? []).filter((player) => player.position !== 'GK');
    const eligibleBench = squad
      .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK');
    const manualStarter = this.selectedSwapStarterIdModel
      ? starters.find((player) => player.playerId === this.selectedSwapStarterIdModel)
      : null;
    const manualBench = this.selectedSwapBenchIdModel
      ? eligibleBench.find((player) => player.sessionPlayerId === this.selectedSwapBenchIdModel)
      : null;
    if (manualStarter && manualBench) {
      return [this.buildPlayerSwapCandidate(manualStarter, manualBench, slotByPlayer, `Modal DT manual: ${this.scenarioBatteryCoachObjectiveLabel(objective)}`)];
    }
    const pairs: Array<{ starter: LineupDTO['players'][number]; bench: SessionPlayer; score: number }> = [];
    for (const starter of manualStarter ? [manualStarter] : starters) {
      for (const bench of manualBench ? [manualBench] : eligibleBench) {
        pairs.push({
          starter,
          bench,
          score: this.modalRecommendationCandidateScore(starter, bench, objective),
        });
      }
    }
    return pairs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((pair) => this.buildPlayerSwapCandidate(
        pair.starter,
        pair.bench,
        slotByPlayer,
        `Modal DT search: ${this.scenarioBatteryCoachObjectiveLabel(objective)} (${pair.score.toFixed(1)})`
      ));
  }
  private modalRecommendationCandidateScore(
    starter: LineupDTO['players'][number],
    bench: SessionPlayer,
    objective: ScenarioBatteryCoachObjective
  ): number {
    const starterLine = this.positionPixelLine(starter.position);
    const benchLine = this.positionPixelLine(bench.position);
    const ratingDelta = this.sessionPlayerOverall(bench) - (starter.overall ?? 70);
    const sameLineBonus = starterLine === benchLine ? 3 : -2.5;
    if (objective === 'NEED_GOAL') {
      const starterProfile = this.playerSwapProfile(starter.position);
      const benchProfile = this.playerSwapProfile(bench.position);
      const profileBonus = starterProfile === benchProfile
        ? 4
        : starterLine === benchLine
          ? 2
          : -5;
      const defensiveBreakPenalty = starterLine === 'DEF' && benchLine === 'ATT' ? -8 : 0;
      return this.modalAttackIntent(bench.position) * 4
        + Math.max(0, ratingDelta) * 0.55
        + profileBonus
        + defensiveBreakPenalty;
    }
    if (objective === 'PROTECT_RESULT') {
      const starterProfile = this.playerSwapProfile(starter.position);
      const benchProfile = this.playerSwapProfile(bench.position);
      const profileBonus = benchLine === 'ATT'
        ? -4
        : benchProfile === 'WIDE'
          ? -1
          : starterProfile === benchProfile
            ? 4
            : starterLine === benchLine
              ? 1
              : -5;
      const protectionGain = this.modalProtectIntent(bench.position) - this.modalProtectIntent(starter.position);
      const defensiveStarterPenalty = starterLine === 'DEF' && starterProfile !== benchProfile
        ? -4
        : 0;
      const attackingBenchPenalty = benchLine === 'ATT'
        ? -4
        : benchProfile === 'WIDE'
          ? -1.5
          : 0;
      return protectionGain * 3
        + this.modalProtectIntent(bench.position) * 1.2
        + Math.max(0, ratingDelta) * 0.45
        + profileBonus
        + defensiveStarterPenalty
        + attackingBenchPenalty;
    }
    const starterProfile = this.playerSwapProfile(starter.position);
    const benchProfile = this.playerSwapProfile(bench.position);
    const profileBonus = starterProfile === benchProfile
      ? 8
      : starterLine === benchLine
        ? 1
        : -8;
    const aggressionSwing = Math.max(0, this.modalAttackIntent(bench.position) - this.modalAttackIntent(starter.position));
    const protectionLoss = Math.max(0, this.modalProtectIntent(starter.position) - this.modalProtectIntent(bench.position));
    return ratingDelta
      + profileBonus
      - aggressionSwing * 2.5
      - protectionLoss * 1.4
      + (starterLine === 'MID' && benchLine === 'MID' ? 2 : 0);
  }
  private modalAttackIntent(position: string): number {
    const line = this.positionPixelLine(position);
    if (line === 'ATT') return 3;
    if (this.playerSwapProfile(position) === 'WIDE') return 2.6;
    if (line === 'MID') return 1.5;
    if (line === 'DEF') return 0.4;
    return 0;
  }
  private modalProtectIntent(position: string): number {
    const line = this.positionPixelLine(position);
    if (line === 'DEF') return 3;
    if (line === 'MID') return 2.2;
    if (this.playerSwapProfile(position) === 'WIDE') return 1.1;
    if (line === 'ATT') return 0.3;
    return 0;
  }
  private modalRecommendationWhatIfScore(
    row: SubstitutionWhatIfSummaryRow,
    objective: ScenarioBatteryCoachObjective
  ): number {
    if (objective === 'NEED_GOAL') {
      return row.deltaXgFor + row.deltaShotsFor * 0.04 - Math.max(0, row.deltaXgAgainst) * 0.25;
    }
    if (objective === 'PROTECT_RESULT') {
      return -row.deltaXgAgainst - row.deltaShotsAgainst * 0.035 + Math.max(0, row.deltaXgFor) * 0.25;
    }
    return row.deltaXgDiff + row.deltaShotsFor * 0.03 - row.deltaXgAgainst * 0.35;
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
  private autoBackendEstresSwapCandidates(): PlayerSwapCandidate[] {
    return [
      this.autoBackendEstresSwapCandidate('ATT_TO_DEF', 'Estres: atacante por defensor'),
      this.autoBackendEstresSwapCandidate('DEF_TO_ATT', 'Estres: defensor por atacante'),
      this.autoBackendEstresSwapCandidate('MID_TO_ATT', 'Estres: medio por atacante'),
      this.autoBackendEstresSwapCandidate('MID_TO_DEF', 'Estres: medio por defensor'),
      this.autoBackendEstresSwapCandidate('OUT_OF_LINE', 'Estres: fuera de línea'),
      this.autoBackendEstresSwapCandidate('DOWNGRADE', 'Estres: menor OVR / encaje'),
    ];
  }
  private autoBackendEstresSwapCandidate(mode: string, testCase: string): PlayerSwapCandidate {
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
      return this.buildEstresPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit);
    }
    const natural = this.buildPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit, 'natural');
    if (mode === 'natural' || natural.length >= limit) {
      return natural;
    }
    return this.buildPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit, 'mixed', natural);
  }
  private buildEstresPlayerSwapBatteryCandidates(
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
      'Estres: atacante por defensor',
      (starter) => this.positionPixelLine(starter.position) === 'ATT',
      (bench) => this.positionPixelLine(bench.position) === 'DEF'
    );
    addCase(
      'Estres: defensor por atacante',
      (starter) => this.positionPixelLine(starter.position) === 'DEF',
      (bench) => this.positionPixelLine(bench.position) === 'ATT'
    );
    addCase(
      'Estres: medio por banda/ataque',
      (starter) => this.positionPixelLine(starter.position) === 'MID',
      (bench) => this.positionPixelLine(bench.position) === 'ATT'
    );
    addCase(
      'Estres: fuera de línea',
      () => true,
      (bench, starter) => this.positionPixelLine(bench.position) !== this.positionPixelLine(starter.position)
    );
    addCase(
      'Estres: menor OVR / encaje',
      () => true,
      (bench, starter) => this.sessionPlayerOverall(bench) <= starter.overall - 4,
      true
    );
    addCase(
      'Estres: upgrade OVR',
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
   * This is intentionally not a second implementation: cambios de jugador, bench
   * moves, free pixel positioning, customX/customY persistence, tactical
   * chemistry preview and manual-select save all stay inside the production
   * SquadEditorModalComponent. The harness only provides the current career
   * context and refreshes after the modal closes.
   */
  openSquadEditor(): void {
    const careerId = this.careerId();
    if (!careerId) {
      this.snackBar.open('Sin carrera activa loaded.', 'OK', { duration: 3000 });
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
  // Replay-with-seed and simulate-round handlers.
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
   * Replays the selected match with the current seed and refreshes the detail panels.
   */
  onReplayWithSeed(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.replayStatusMessage.set('Elegí un partido en Panel C antes de repetir con seed.');
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const seedDesc =
      this.seedInputModel !== null
        ? `seed=${this.seedInputModel}`
        : 'seed no reproducible';
    this.replayStatusMessage.set(
      `Repitiendo ${this.selectedMatchLabel()} con ${seedDesc} y foco ${this.selectedStyleLabel()}...`
    );
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.harness.replayMatch(matchId, this.seedInputModel)),
      timeout(SINGLE_MATCH_REPLAY_TIMEOUT_MS),
      finalize(() => this.mutationInFlight.set(false))
    ).subscribe({
      next: (fixture) => {
        const score =
          fixture?.result != null
            ? ` ? ${fixture.result.homeGoals}-${fixture.result.awayGoals}`
            : '';
        const status = fixture?.status ? String(fixture.status).toUpperCase() : 'sin estado';
        const visualScore = fixture?.result != null
          ? `${fixture.result.homeGoals}-${fixture.result.awayGoals}`
          : 'sin marcador';
        this.replayStatusMessage.set(
          `Replay listo: ${this.selectedMatchLabel()} quedó ${status}, resultado ${visualScore}. ` +
          'Panel A/D se actualizan con el detalle; si querés comparar contra el vivo, abrí el comparador.'
        );
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
        // The replay endpoint persists fixture and match detail, and
        // Match Compare can already read the new live detail. In the harness,
        // however, Panel A is an embedded detail page and can briefly repaint
        // from the previous request if the immediate refresh wins the race.
        // Keep one late refresh so the visible Panel A settles on the same
        // data as /detail and /compare without requiring the manager to
        // reselect the match.
        this.refreshDetailAfterMutation(2500);
      },
      error: (err) => {
        this.replayStatusMessage.set(
          `No se pudo repetir el partido con seed: ${this.fmtError(err, 'error desconocido')}`
        );
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
      ),
      timeout(CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS),
      finalize(() => this.mutationInFlight.set(false))
    ).subscribe({
      next: (result) => {
        this.currentLineupReplayResult.set(result);
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
    this.analysisReadyMessage.set(`XI actual multi-seed corriendo: ${seedCount} seeds...`);
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
          `XI actual multi-seed complete (${summary.seedCount} seeds, avg xG ${this.fmtXg(summary.avgXgFor)}-${this.fmtXg(summary.avgXgAgainst)}).`,
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('XI actual multi-seed listo en Panel E.');
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
    this.analysisReadyMessage.set(`Base vs píxeles del modal rápido: ${seedCount} seeds por estado...`);
    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((lineup) => {
        originalLineup = lineup;
        const originalSlots = this.buildLineupSlots(lineup);
        const playerIds = this.lineupPlayerIdsFromSlots(originalSlots);
        if (this.countCustomMovableSlots(lineup) === 0) {
          throw new Error('No hay jugador de campo con píxeles persistidos en la alineación actual. Si querés medir el último movimiento hecho en Partido, usá último movimiento modal; para pruebas automáticas usá Matriz presets posición o Chequeo sensibilidad.');
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
          this.snackBar.open('Base vs modal listo con muestra insuficiente.', 'OK', { duration: 4500 });
          return;
        }
        const summary = this.buildModalVsCanonicalSummary(originalLineup, canonical, modal);
        this.modalVsCanonicalSummary.set(summary);
        this.snackBar.open(
          `Base vs modal complete (${summary.seedCount} seeds, Delta xG ${this.fmtDeltaNumber(summary.deltaXgFor)}).`,
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Base vs píxeles del modal listo en Panel E.');
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
        this.analysisReadyMessage.set(this.fmtError(err, 'Base vs píxeles del modal no pudo generar Panel E'));
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
    this.analysisReadyMessage.set(`Matriz cambio jugador corriendo: ${seedCount} seeds...`);
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
          this.fmtError(err, 'Matriz cambio jugador falló antes de generar Panel E')
        );
        this.snackBar.open(
          this.fmtError(err, 'No se pudo correr matriz de cambio de jugador'),
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
            ? `Matriz cambio jugador lista: ${summary.baselinePlayer} vs ${summary.swapPlayer}, Delta xG ${this.fmtDeltaNumber(summary.deltaXgFor)}.`
            : 'Matriz cambio jugador lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Matriz cambio jugador listo en Panel E.');
        this.refreshLineupContext();
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }

  onRunSubstitutionWhatIf(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Simular sustitución usa el XI de tu equipo para replicar el modal.', 'OK', { duration: 3500 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(this.playerSwapSeedCountModel || 10)));
    const minute = this.substitutionWhatIfMinuteOptions.includes(this.substitutionWhatIfMinuteModel as 45 | 60 | 70 | 80)
      ? this.substitutionWhatIfMinuteModel
      : 60;
    this.playerSwapSeedCountModel = seedCount;
    let candidate: PlayerSwapCandidate | null = null;
    this.substitutionWhatIfSummary.set(null);
    this.modalRecommendationCandidateAttempts.set([]);
    this.substitutionTimingMatrixRows.set([]);
    this.analysisReadyMessage.set(`Simular sustitución corriendo: min ${minute}, ${seedCount} seeds...`);
    this.mutationInFlight.set(true);
    forkJoin({
      lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        candidate = this.pickAutomaticSwapCandidate(lineup, squad);
        const playerOffId = this.selectedSwapStarterIdModel || candidate?.starterId;
        const playerOnId = this.selectedSwapBenchIdModel || candidate?.benchId;
        if (!playerOffId || !playerOnId) {
          throw new Error('No pude resolver titular y suplente para la sustitución.');
        }
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() =>
            this.harness.runSubstitutionWhatIfSummary(matchId, {
              playerOffId,
              playerOnId,
              minute,
              seedStart,
              seedCount,
              controlledTeamSide: 'USER',
            })
          )
        );
      })
    ).subscribe({
      next: (row) => {
        this.substitutionWhatIfSummary.set({
          ...row,
          readClass: this.deltaClass(row.deltaXgDiff + row.deltaShotsFor * 0.04 - row.deltaXgAgainst * 0.6),
        });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Simular sustitución falló antes de generar Panel E'));
        this.snackBar.open(this.fmtError(err, 'No se pudo correr simulación de sustitución'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const summary = this.substitutionWhatIfSummary();
        this.snackBar.open(
          summary
            ? `Simular sustitución lista: ${summary.playerOffName} -> ${summary.playerOnName}, Delta xG ${this.fmtDeltaNumber(summary.deltaXgFor)}.`
            : 'Simular sustitución lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Simular sustitución listo en Panel E.');
        this.refreshLineupContext();
      },
    });
  }

  onRunModalRecommendationWhatIf(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Probar recomendación modal usa el XI de tu equipo.', 'OK', { duration: 3500 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(this.playerSwapSeedCountModel || 10)));
    const minute = this.substitutionWhatIfMinuteOptions.includes(this.substitutionWhatIfMinuteModel as 45 | 60 | 70 | 80)
      ? this.substitutionWhatIfMinuteModel
      : 60;
    this.playerSwapSeedCountModel = seedCount;
    this.substitutionWhatIfSummary.set(null);
    this.modalRecommendationCandidateAttempts.set([]);
    this.substitutionTimingMatrixRows.set([]);
    this.analysisReadyMessage.set(`Probar recomendación modal corriendo: ${this.playerSwapCoachObjectiveRead()}, min ${minute}, ${seedCount} seeds...`);
    this.mutationInFlight.set(true);
    let candidate: PlayerSwapCandidate | null = null;
    forkJoin({
      lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        const objective = this.playerSwapEffectiveCoachObjective();
        if (objective === 'PROTECT_RESULT') {
          const candidates = this.pickModalRecommendationSwapCandidates(lineup, squad, objective, 5);
          if (candidates.length === 0) {
            this.mutationInFlight.set(false);
            this.analysisReadyMessage.set(`Sin recomendación automática suficientemente segura para ${this.playerSwapCoachObjectiveRead()}. No se corre Panel E con un falso positivo.`);
            this.snackBar.open('Sin recomendación segura: mantené estructura o elegí un cambio manual.', 'OK', { duration: 5000 });
            return of(null);
          }
          this.modalRecommendationCandidateAttempts.set(candidates.map((candidate) => ({
            candidate,
            row: null,
            safe: false,
            score: 0,
            status: 'RUNNING',
          })));
          this.analysisReadyMessage.set(`Buscando cierre real: ${candidates.length} candidatos, min ${minute}, ${seedCount} seeds...`);
          return this.harness.setStyle(this.selectedStyleModel).pipe(
            switchMap(() => this.runModalSubstitutionCandidates(matchId, candidates, seedStart, seedCount, minute, objective)),
            map((items) => {
              const itemByPair = new Map(items.map((item) => [`${item.candidate.starterId}:${item.candidate.benchId}`, item]));
              this.modalRecommendationCandidateAttempts.set(candidates.map((candidate) => {
                const item = itemByPair.get(`${candidate.starterId}:${candidate.benchId}`);
                if (!item) {
                  return {
                    candidate,
                    row: null,
                    safe: false,
                    score: 0,
                    status: 'NO_SAMPLE' as const,
                  };
                }
                const safe = this.modalProtectWhatIfIsSafe(item.row);
                return {
                  candidate,
                  row: item.row,
                  safe,
                  score: this.modalProtectWhatIfScore(item.row),
                  status: safe ? 'SAFE' as const : 'REJECTED' as const,
                };
              }));
              const best = items[0] ?? null;
              if (!best || !this.modalProtectWhatIfIsSafe(best.row)) {
                candidate = null;
                this.mutationInFlight.set(false);
                this.analysisReadyMessage.set(`Sin cierre real encontrado para ${this.playerSwapCoachObjectiveRead()}: ningún candidato bajó xGA/tiros con este seed.`);
                this.snackBar.open('Sin cierre real: mantené estructura o probá cambio manual.', 'OK', { duration: 5000 });
                return null;
              }
              candidate = best.candidate;
              return best.row;
            })
          );
        }
        candidate = this.pickModalRecommendationSwapCandidate(lineup, squad, this.playerSwapEffectiveCoachObjective());
        if (!candidate?.starterId || !candidate?.benchId) {
          this.mutationInFlight.set(false);
          this.analysisReadyMessage.set(`Sin recomendación automática suficientemente segura para ${this.playerSwapCoachObjectiveRead()}. No se corre Panel E con un falso positivo.`);
          this.snackBar.open('Sin recomendación segura: mantené estructura o elegí un cambio manual.', 'OK', { duration: 5000 });
          return of(null);
        }
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() =>
            this.harness.runSubstitutionWhatIfSummary(matchId, {
              playerOffId: candidate!.starterId,
              playerOnId: candidate!.benchId,
              minute,
              seedStart,
              seedCount,
              controlledTeamSide: 'USER',
            })
          )
        );
      })
    ).subscribe({
      next: (row) => {
        if (!row) {
          return;
        }
        this.substitutionWhatIfSummary.set({
          ...row,
          readClass: this.deltaClass(this.modalRecommendationWhatIfScore(row, this.playerSwapEffectiveCoachObjective())),
          read: `${row.read} · Modal DT: ${this.playerSwapCoachObjectiveRead()} · ${candidate?.testCase ?? 'recomendación'}`,
        });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Probar recomendación modal falló antes de generar Panel E'));
        this.snackBar.open(this.fmtError(err, 'Failed to run modal recommendation what-if'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const summary = this.substitutionWhatIfSummary();
        if (!summary && !candidate) {
          this.refreshLineupContext();
          return;
        }
        this.snackBar.open(
          summary
            ? `Probar recomendación modal: ${summary.playerOffName} → ${summary.playerOnName}, ${this.playerSwapCoachObjectiveRead()}.`
            : 'Probar recomendación modal lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Probar recomendación modal listo en Panel E.');
        this.refreshLineupContext();
      },
    });
  }

  onRunSubstitutionTimingMatrix(): void {
    const matchId = this.selectedMatchId();
    const careerId = this.careerId();
    if (!matchId || !careerId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Matriz minuto de cambio usa el XI de tu equipo para replicar el modal.', 'OK', { duration: 3500 });
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(this.playerSwapSeedCountModel || 10)));
    this.playerSwapSeedCountModel = seedCount;
    this.substitutionWhatIfSummary.set(null);
    this.substitutionTimingMatrixRows.set([]);
    this.analysisReadyMessage.set(`Matriz minuto de cambio corriendo: ${seedCount} seeds x ${this.substitutionWhatIfMinuteOptions.length} minutos...`);
    this.mutationInFlight.set(true);
    forkJoin({
      lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        const candidate = this.pickAutomaticSwapCandidate(lineup, squad);
        const playerOffId = this.selectedSwapStarterIdModel || candidate?.starterId;
        const playerOnId = this.selectedSwapBenchIdModel || candidate?.benchId;
        if (!playerOffId || !playerOnId) {
          throw new Error('No pude resolver titular y suplente para la matriz de sustitución.');
        }
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() =>
            from(this.substitutionWhatIfMinuteOptions).pipe(
              concatMap((minute) =>
                this.harness.runSubstitutionWhatIfSummary(matchId, {
                  playerOffId,
                  playerOnId,
                  minute,
                  seedStart,
                  seedCount,
                  controlledTeamSide: 'USER',
                }).pipe(map((row) => this.toSubstitutionTimingMatrixRow(row)))
              ),
              toArray()
            )
          )
        );
      })
    ).subscribe({
      next: (rows) => {
        this.substitutionTimingMatrixRows.set([...rows].sort((a, b) => a.minute - b.minute));
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Matriz minuto de cambio fallo antes de generar Panel E'));
        this.snackBar.open(this.fmtError(err, 'Failed to run substitution timing matrix'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const rows = this.substitutionTimingMatrixRows();
        this.snackBar.open(
          rows.length > 0
            ? `Matriz minuto de cambio lista: ${rows[0].playerOffName} -> ${rows[0].playerOnName}, ${rows.length} minutos.`
            : 'Matriz minuto de cambio lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Matriz minuto de cambio listo en Panel E.');
        this.refreshLineupContext();
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
    this.analysisReadyMessage.set(`Batería cambio jugador corriendo: ${seedCount} seeds por cambio...`);
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
              ? this.autoBackendEstresSwapCandidates()
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
          this.fmtError(err, 'Batería cambio jugador falló antes de generar Panel E')
        );
        this.snackBar.open(this.fmtError(err, 'No se pudo correr batería de cambio de jugador'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const count = this.playerSwapBatterySummaries().length;
        this.snackBar.open(
          count > 0 ? `Batería cambio jugador lista: ${count} swaps medidos.` : 'Batería cambio jugador lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Batería cambio jugador lista en Panel E.');
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
            ? this.autoBackendEstresSwapCandidates()
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
        this.snackBar.open(this.fmtError(err, 'No se pudo comparar precision de cambios'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const changed = this.playerSwapPrecisionComparisonRows().filter((row) => row.stability !== 'Stable read').length;
        this.snackBar.open(
          `Comparación de precisión lista: ${changed} cambiaron o necesitan revisión.`,
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
  private runModalSubstitutionCandidates(
    matchId: string,
    candidates: PlayerSwapCandidate[],
    seedStart: number,
    seedCount: number,
    minute: number,
    objective: ScenarioBatteryCoachObjective
  ): Observable<Array<{ candidate: PlayerSwapCandidate; row: SubstitutionWhatIfSummaryRow }>> {
    return from(candidates).pipe(
      concatMap((candidate) =>
        this.harness.runSubstitutionWhatIfSummary(matchId, {
          playerOffId: candidate.starterId,
          playerOnId: candidate.benchId,
          minute,
          seedStart,
          seedCount,
          controlledTeamSide: this.controlledTeamSideModel,
        }).pipe(map((row) => ({ candidate, row })))
      ),
      toArray(),
      map((items) => objective === 'PROTECT_RESULT'
        ? items.sort((a, b) => this.modalProtectWhatIfScore(b.row) - this.modalProtectWhatIfScore(a.row))
        : items.sort((a, b) => this.modalRecommendationWhatIfScore(b.row, objective) - this.modalRecommendationWhatIfScore(a.row, objective))
      )
    );
  }
  private modalProtectWhatIfScore(row: SubstitutionWhatIfSummaryRow): number {
    return Math.max(0, -row.deltaXgAgainst) * 2.5
      + Math.max(0, -row.deltaShotsAgainst) * 0.08
      + Math.max(0, row.deltaXgDiff) * 0.35
      - Math.max(0, row.deltaXgAgainst) * 3.5
      - Math.max(0, row.deltaShotsAgainst) * 0.12;
  }
  private modalProtectWhatIfIsSafe(row: SubstitutionWhatIfSummaryRow): boolean {
    return row.deltaXgAgainst < -0.001
      || row.deltaShotsAgainst < -0.01
      || (row.deltaXgAgainst <= 0.001 && row.deltaShotsAgainst <= 0.01 && row.deltaXgDiff >= 0.02);
  }
  private modalRecommendationWhatIfIsSafe(
    row: SubstitutionWhatIfSummaryRow,
    objective: ScenarioBatteryCoachObjective
  ): boolean {
    if (objective === 'NEED_GOAL') {
      return row.deltaXgFor > 0.001
        || row.deltaShotsFor > 0.01
        || (row.deltaXgFor >= -0.001 && row.deltaShotsFor >= -0.01 && row.deltaXgDiff >= 0.02);
    }
    if (objective === 'PROTECT_RESULT') {
      return this.modalProtectWhatIfIsSafe(row);
    }
    return Math.abs(row.deltaXgFor) >= 0.001
      || Math.abs(row.deltaXgAgainst) >= 0.001
      || Math.abs(row.deltaShotsFor) >= 0.01
      || Math.abs(row.deltaShotsAgainst) >= 0.01;
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
        ? this.autoBackendEstresSwapCandidates()
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
    return getPlayerSwapPrecisionStability(quick, balanced, this.playerSwapEffectiveCoachObjective());
  }
  private playerSwapPrecisionStabilityClass(stability: string): string {
    return getPlayerSwapPrecisionStabilityClass(stability);
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
      'Matriz presets posición'
    );
  }
  onRunManualShapeVsPresetSmoke(): void {
    const seedCount = Math.max(20, Math.min(50, Math.round(this.playerSwapSeedCountModel || 20)));
    this.clearReplayAnalysisResultsForLatestRun();
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY, candidate) => this.manualShapeVsPresetPresets(fromX, fromY, candidate),
      'Forma manual vs preset',
      null,
      (lineup) => this.pickManualShapeVsPresetCandidates(lineup),
      null,
      false
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
    this.analysisReadyMessage.set(`Impacto rol-slot corriendo: slot ${slotId}, ${seedCount} seeds...`);
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
        this.markReplayAnalysisReady(`Impacto rol-slot completo (${safeRows.length} roles, ${seedCount} seeds).`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Impacto rol-slot falló'));
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
    this.analysisReadyMessage.set(`Smoke todos los roles-slot corriendo: ${slots.length} slots x ${seedCount} seeds...`);
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
        this.markReplayAnalysisReady(`Smoke todos los roles-slot completo (${rows.length} slots).`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Smoke todos los roles-slot falló'));
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
    this.analysisReadyMessage.set(`Smoke roles-slot por formacion corriendo: ${formations.length} formaciones x 10 slots...`);
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
            ? `Smoke roles-slot por formacion OK (${rows.length} formaciones).`
            : `Smoke roles-slot por formacion: ${reviews} formaciones con slots a revisar.`
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Smoke roles-slot por formacion falló'));
      },
    });
  }
  onRunLastModalMovePositionSmoke(): void {
    const modalMove = this.readLastModalPositionMoveCase();
    if (!modalMove) {
      this.snackBar.open('No hay último movimiento del modal guardado. Mové un jugador en Editar Formación Visual primero.', 'OK', { duration: 5000 });
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
    this.analysisReadyMessage.set(`Último movimiento modal: preparando ${modalMove.playerName} (${seedCount} seeds)...`);
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
            error: (err) => this.logHarnessRestoreWarning(err),
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
          label: 'Último movimiento modal',
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
              name: `${modalMove.playerName} (después)`,
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
        this.markReplayAnalysisReady(`Último movimiento modal listo: ${modalMove.playerName}.`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Último movimiento modal falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run last modal move'), 'OK', { duration: 5000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.snackBar.open(`Último movimiento modal listo: ${modalMove.playerName}, ${seedCount} seeds.`, 'OK', { duration: 4500 });
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
      'Lab píxeles carrileros',
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
      'Chequeo sensibilidad'
    );
  }
  onRunManualExtremesPositionHunt(): void {
    const seedCount = Math.max(10, Math.min(30, Math.round(this.playerSwapSeedCountModel || 10)));
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY, candidate) => this.manualExtremeMovementPresets(fromX, fromY, candidate),
      'Buscar extremos manuales',
      null,
      (lineup) => this.pickManualExtremeCandidates(lineup)
    );
  }
  onRunFocusedPixelBattery(): void {
    const seedCount = Math.max(20, Math.min(30, Math.round(this.playerSwapSeedCountModel || 20)));
    const formation = this.selectedFormationModel ?? '4-4-2';
    this.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX, fromY) => this.positionMovementPresets(fromX, fromY)
        .filter((preset) => ['5px wide', '5px center', '5px forward', '5px deeper'].includes(preset.label)),
      `Batería píxeles enfocada · ${formation}`,
      null,
      (lineup) => this.pickFocusedPixelCandidates(lineup),
      null,
      false,
      'ALL'
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
        this.snackBar.open('Tablero completo posición complete.', 'OK', { duration: 4500 });
        this.markReplayAnalysisReady('Tablero completo posición listo en Panel E.');
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
    this.analysisReadyMessage.set(`Auditoría líneas formación corriendo para ${formation}...`);
    this.currentOrAutoSelectedLineup(formation).subscribe({
      next: (lineup) => {
        const rows = (['DEF', 'MID', 'ATT'] as const).map((line) =>
          this.toFormationLineSmokeRow(lineup, line, matches.length)
        );
        this.formationLineSmokeRows.set(rows);
        const allOk = rows.every((row) => row.candidates > 0);
        this.lineupDebugSnapshot.set(this.buildLineupDebugSnapshot(
          lineup,
          'Auditoría líneas formación',
          null,
          rows.flatMap((row) => this.pickPositionPixelLineCandidates(lineup, row.line, 6))
        ));
        this.mutationInFlight.set(false);
        this.snackBar.open(
          allOk ? `Auditoría líneas formación OK (${formation}).` : `Auditoría líneas formación con avisos (${formation}).`,
          'OK',
          { duration: 4000 }
        );
        this.markReplayAnalysisReady(`Auditoría líneas formación listo para ${formation}.`);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Auditoría líneas formación falló'));
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
    this.analysisReadyMessage.set(`Auditoría todas las formaciones corriendo: ${formations.length} formaciones...`);
    this.buildAllFormationsLineAuditRows$(matches.length).subscribe({
      next: ({ rows, last }) => {
        this.applyAllFormationsLineAuditRows(rows, last);
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
            ? `Auditoría todas las formaciones listo: ${rows.length} line checks · ${fallbackCount} fallback penalizado.`
            : `Auditoría todas las formaciones listo: ${rows.length} line checks · ${reviewCount} revisar · ${fallbackCount} fallback.`
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Auditoría todas las formaciones falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run all formations line audit'), 'OK', { duration: 5000 });
      },
    });
  }
  private buildAllFormationsLineAuditRows$(matchCount: number): Observable<{ rows: FormationLineSmokeRow[]; last: LineupDTO | null }> {
    const formations = [...this.formationCodes];
    return this.harness.getCurrentLineup().pipe(
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
              map(() => {
                const rows = items.flatMap(({ formation, lineup }) =>
                  (['DEF', 'MID', 'ATT'] as const).map((line) =>
                    this.toFormationLineSmokeRow(
                      { ...lineup, formation: lineup.formation ?? formation },
                      line,
                      matchCount
                    )
                  )
                );
                return {
                  rows,
                  last: items[items.length - 1]?.lineup ?? null,
                };
              })
            )
          )
        );
      })
    );
  }
  private applyAllFormationsLineAuditRows(rows: FormationLineSmokeRow[], last: LineupDTO | null): void {
    this.formationLineSmokeRows.set(rows);
    if (last) {
      this.lineupDebugSnapshot.set(this.buildLineupDebugSnapshot(
        last,
        'Auditoría todas las formaciones (last formation)',
        null,
        (['DEF', 'MID', 'ATT'] as const).flatMap((line) => this.pickPositionPixelLineCandidates(last, line, 6))
      ));
    }
  }
  private allFormationsLineAuditToast(totalRows: number, reviewCount: number, fallbackCount: number): string {
    if (reviewCount > 0) {
      return `Auditoría todas las formaciones: ${reviewCount} line checks need review.`;
    }
    if (fallbackCount > 0) {
      return `Auditoría todas las formaciones OK with ${fallbackCount} penalized fallback line checks (${totalRows} total).`;
    }
    return `Auditoría todas las formaciones OK (${totalRows} line checks).`;
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
    let lastPixelRunDiagnostics = `${label}: sin diagnóstico todavía.`;
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
            `${label} corriendo: current lineup vacío; usando Auto DEF/MID/ATT del XI real del partido.`
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
          : `${label}: sin filas útiles. ${lastPixelRunDiagnostics} ${responseDiagnostics} ${mapErrors[0] ?? errorItems[0]?.error ?? 'El motor/interceptor no devolvió cuerpo usable.'}`);
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
            ? `${label} listo: ${this.positionPixelMatrixRows().length} filas jugador/movimiento, ${seedCount} seeds.`
            : 'Matriz de píxeles lista sin resumen.',
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
   * Simulates the selected round and refreshes Panel C while the backend finishes.
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
  matchStatusLabel(status: string | null | undefined): string {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'COMPLETED') return 'Completado';
    if (normalized === 'PENDING') return 'Pendiente';
    if (normalized === 'IN_PROGRESS') return 'En juego';
    if (normalized === 'PAUSED') return 'Pausado';
    return status ?? '';
  }
  trackByFormationReplay(_index: number, row: FormationReplayResult): string {
    return row.formation;
  }
  trackByFormationSummary(_index: number, row: FormationMatrixSummaryRow): string {
    return row.formation;
  }
  trackByFocusedWideBatteryRow(_index: number, row: FocusedWideBatteryRow): string {
    return `${row.formation}:${row.style}`;
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
    const bestOfBad = this.formationPickIsBestOfBad(row);
    const badCoachSlot = bestOfBad && (label.includes('balance') || label.includes('segura'));
    const displayLabel = badCoachSlot
      ? 'Mejor dentro de mal escenario'
      : label;
    const read = badCoachSlot ? 'Mal menor' : this.formationSummaryRead(row);
    const detail = [
      ...(badCoachSlot ? ['no es plan ganador; necesita mejorar XI/tactica'] : []),
      `xG ${this.fmtXg(row.avgXgFor)} / ${this.fmtXg(row.avgXgAgainst)}`,
      `diff ${this.fmtDeltaNumber(row.avgXgDiff)}`,
      `tiros ${this.fmtXg(row.avgShotsFor)} / ${this.fmtXg(row.avgShotsAgainst)}`,
      `posesion ${this.fmtPct(row.avgPossessionFor)}`,
    ].join(' · ');
    return {
      label: displayLabel,
      formation: row.formation,
      read,
      detail,
      identity: this.formationSummaryIdentity(row),
      cssClass: badCoachSlot ? 'read-check' : this.formationSummaryReadClass(row),
    };
  }
  private formationPickIsBestOfBad(row: FormationMatrixSummaryRow): boolean {
    return row.avgXgDiff <= -0.75 || row.avgXgAgainst >= 1.35;
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
  trackBySubstitutionTimingRow(_index: number, row: SubstitutionTimingMatrixRow): string {
    return `${row.playerOffId}:${row.playerOnId}:${row.minute}:${row.seedStart}:${row.seedEnd}`;
  }
  trackByModalRecommendationCandidateAttempt(_index: number, item: ModalRecommendationCandidateAttempt): string {
    return `${item.candidate.starterId}:${item.candidate.benchId}:${item.row?.minute ?? 'pending'}:${item.row?.seedStart ?? 'pending'}:${item.row?.seedEnd ?? 'pending'}`;
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
    const y = subdivisionYPercent(slotId);
    if (typeof y === 'number') {
      if (y <= 35) {
        const x = subdivisionXPercent(slotId) ?? 50;
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
  lineupDebugPlayerCountLabel(debug: LineupDebugSnapshot): string {
    if (debug.playerCount === 0 && debug.candidatesCount > 0) {
      return `presets (${debug.candidatesCount})`;
    }
    return `${debug.playerCount}/11`;
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
    return getProfessionalQaChecklistTestId(check);
  }
  professionalQaVerdictClass(verdict: ProfessionalQaChecklistRow['verdict']): string {
    return getProfessionalQaVerdictClass(verdict);
  }
  professionalQaVerdictLabel(verdict: ProfessionalQaChecklistRow['verdict']): string {
    return getProfessionalQaVerdictLabel(verdict);
  }
  professionalQaCheckLabel(check: string): string {
    return getProfessionalQaCheckLabel(check);
  }
  professionalQaTextLabel(text: string | null | undefined): string {
    return getProfessionalQaTextLabel(text);
  }
  professionalSmokeVerdictClass(verdict: ProfessionalSmokeSummary['verdict']): string {
    return getProfessionalSmokeVerdictClass(verdict);
  }
  professionalQaActionLabel(check: string): string {
    return getProfessionalQaActionLabel(check);
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
      case 'Señal cambio jugador':
        return !!this.selectedMatchId();
      default:
        return false;
    }
  }
  professionalQaActionStatus(check: string): ProfessionalQaActionStatus | null {
    return this.professionalQaActionStatuses()[check] ?? null;
  }
  professionalQaActionStatusClass(state: ProfessionalQaActionStatus['state']): string {
    return getProfessionalQaActionStatusClass(state);
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
      case 'Señal cambio jugador':
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
      'Señal cambio jugador',
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
          : 'Pendiente: seleccion? un partido.',
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
      ? `${check}: termin? sin evidencia numérica. ${diagnostics} ${responseDiagnostics ?? ''} Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`
      : `${check}: termin? sin evidencia numérica. Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`;
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
      this.positionPixelEvidenceNote.set(`${check}: termin? sin evidencia numérica. Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`);
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
      const failed = /fall[o?]|failed|error/i.test(message);
      const checklistRow = this.professionalQaChecklistRows().find((row) => row.check === check);
      const missingEvidence = !failed && checklistRow?.verdict === 'Pending';
      this.setProfessionalQaActionStatus(check, {
        state: failed || missingEvidence ? 'error' : 'done',
        message: failed
          ? 'Fall?: revisar mensaje del panel.'
          : missingEvidence
            ? 'Sin evidencia nueva: revisar si este check produjo filas.'
            : 'Listo: diagnóstico actualizado.',
      });
    }, 350);
  }
  currentLineupMultiSeedReadable(summary: CurrentLineupMultiSeedSummary): string {
    return `${summary.seedCount} seeds ? ${summary.formation || '?'} ? score ${this.fmtXg(summary.avgGoalsFor)}-${this.fmtXg(summary.avgGoalsAgainst)} ? poss ${this.fmtPct(summary.avgPossessionFor)}`;
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
    return 'Prioriza mismo perfil o misma línea.';
  }
  playerSwapBatteryPrecisionHint(): string {
    const seeds = this.playerSwapBatteryEffectiveSeedCount();
    if (this.playerSwapBatteryModeModel === 'stress' && this.playerSwapBatteryPrecisionModel === 'quick') {
      return `${seeds} seeds - Estres test usa minimo 10 para evitar ruido.`;
    }
    if (this.playerSwapBatteryPrecisionModel === 'reliable') return `${seeds} seeds - High confidence para calibracion fina.`;
    if (this.playerSwapBatteryPrecisionModel === 'balanced') return `${seeds} seeds - Confianza media, recomendado para decidir tuning.`;
    return `${seeds} seeds - Low confidence, solo smoke exploratorio.`;
  }
  playerSwapBatteryConfidenceLabel(seedCount = this.playerSwapSeedCountModel): string {
    if (seedCount >= 30) return 'High confidence';
    if (seedCount >= 10) return 'Confianza media';
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
    return getPlayerSwapBatteryCounterText(counts);
  }
  playerSwapBatteryBestWorstText(row: PlayerSwapMatrixSummary | null): string {
    return getPlayerSwapBatteryBestWorstText(
      row,
      this.playerSwapEffectiveCoachObjective(),
      (value) => this.fmtDeltaNumber(value),
      (item) => this.playerSwapIsActionableRecommendation(item)
    );
  }
  playerSwapObjectiveText(row: PlayerSwapMatrixSummary | null, objective: ScenarioBatteryCoachObjective): string {
    return getPlayerSwapObjectiveText(row, objective, (value) => this.fmtDeltaNumber(value));
  }
  playerSwapObjectiveContrastText(summary: PlayerSwapBatterySummary): string {
    return getPlayerSwapObjectiveContrastText(summary);
  }
  playerSwapCoachObjectiveRead(): string {
    return this.scenarioBatteryCoachObjectiveLabel(this.playerSwapEffectiveCoachObjective());
  }
  private playerSwapEffectiveCoachObjective(): ScenarioBatteryCoachObjective {
    const match = this.selectedMatch();
    if (!match) {
      return this.scenarioBatteryCoachObjectiveModel === 'AUTO' ? 'NEUTRAL' : this.scenarioBatteryCoachObjectiveModel;
    }
    const side = this.resolveControlledSideForMatch(match);
    return this.scenarioBatteryEffectiveCoachObjective(match, side);
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
      this.analysisReadyMessage.set('Mi equipo no juega este partido; dejá el control en Local. Podés elegir Visitante manualmente.');
      return;
    }
    if (!match) {
      return;
    }
    this.clearReplayAnalysisResultsForLatestRun();
    this.analysisReadyMessage.set(`Control cambiado a ${this.controlledTeamDisplayName()}. Corr? de nuevo la matriz/smoke para regenerar Panel E.`);
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
      return 'Este audit usa el lineup editable de Mi equipo. Para Local/Visitante usá Matriz formaciones o Formation avg.';
    }
    return 'Audita el lineup editable de Mi equipo.';
  }
  scenarioBatteryScopeHint(): string {
    return getScenarioBatteryScopeHint(
      this.scenarioBatteryScopeModel,
      this.scenarioBatteryCandidateMatches().length,
      this.scenarioBatteryMatchLimit()
    );
  }
  scenarioBatteryCoachObjectiveHint(): string {
    return getScenarioBatteryCoachObjectiveHint(
      this.scenarioBatteryCoachObjectiveModel,
      this.scenarioBatteryAutoObjectiveHint()
    );
  }
  private scenarioBatteryAutoObjectiveHint(): string {
    const match = this.selectedMatch();
    if (!match) {
      return getScenarioBatteryAutoObjectiveHint(null, 'HOME', this.selectedMinute());
    }
    const side = this.resolveControlledSideForMatch(match);
    return getScenarioBatteryAutoObjectiveHint(match, side, this.selectedMinute());
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
    return inferScenarioBatteryCoachObjectiveUtils(match, controlledSide, minute);
  }
  private scenarioBatteryContextPressure(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): { label: string; reputationDelta: number; away: boolean; strongThreshold: number; tired: boolean; fresh: boolean } {
    return getScenarioBatteryContextPressure(match, controlledSide);
  }
  private scenarioBatteryCoachContext(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): { summary: string; detail: string } {
    return getScenarioBatteryCoachContext(match, controlledSide, this.selectedMinute());
  }
  private scenarioBatteryMetricText(value: number | null | undefined, label: string): string {
    return getScenarioBatteryMetricText(value, label);
  }
  private scenarioBatteryMatchStateText(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): { summary: string; detail: string } {
    return getScenarioBatteryMatchStateText(match, controlledSide, this.selectedMinute());
  }
  private scenarioBatterySquadText(strength: TestHarnessMatchRow['homeStrength'] | null): string {
    return getScenarioBatterySquadText(strength);
  }
  private scenarioBatteryTeamCondition(
    strength: TestHarnessMatchRow['homeStrength'] | null
  ): { label: string; tired: boolean; fresh: boolean } {
    return getScenarioBatteryTeamCondition(strength);
  }
  private scenarioBatteryTeamRating(
    teamName: string,
    strength: TestHarnessMatchRow['homeStrength'] | null
  ): { value: number; source: 'strength' | 'name' } {
    return getScenarioBatteryTeamRating(teamName, strength);
  }
  private scenarioBatteryTeamReputation(teamName: string): number {
    return getScenarioBatteryTeamReputation(teamName);
  }
  private scenarioBatteryGoalDiff(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>
  ): number | null {
    return getScenarioBatteryGoalDiff(match, controlledSide);
  }
  private scenarioBatteryDecisionMinute(match: TestHarnessMatchRow): number {
    return getScenarioBatteryDecisionMinute(match, this.selectedMinute());
  }
  scenarioBatteryCoachObjectiveLabel(objective: ScenarioBatteryCoachObjective): string {
    return getScenarioBatteryCoachObjectiveLabel(objective);
  }
  scenarioBatteryGroupHint(): string {
    return getScenarioBatteryGroupHint(this.scenarioBatteryGroupModel);
  }
  scenarioBatteryCoverageHint(): string {
    return getScenarioBatteryCoverageHint(
      this.scenarioBatteryScopeModel,
      this.scenarioBatteryRows().length,
      this.scenarioMatrixSmokeSeedCount(),
      this.scenarioBatteryCandidateMatches().length,
      this.scenarioBatteryMatchLimit()
    );
  }
  scenarioBatteryReviewCount(): number {
    return getScenarioBatteryReviewCount(this.scenarioBatteryRows());
  }
  scenarioBatteryReviewHint(): string {
    return getScenarioBatteryReviewHint(this.scenarioBatteryRows());
  }
  scenarioBatteryReviewItems(): ScenarioBatteryReviewItem[] {
    return getScenarioBatteryReviewItems(this.scenarioBatteryRows());
  }
  scenarioBatteryCoachAdvice(): ScenarioBatteryCoachAdvice | null {
    return getScenarioBatteryCoachAdvice(this.scenarioBatteryRows());
  }
  confirmScenarioBatteryRow(row: ScenarioBatteryRow): void {
    this.selectedMatchId.set(row.matchId);
    this.controlledTeamSideModel = row.controlledSide;
    this.scenarioBatteryGroupModel = row.scenarioGroup;
    const match = this.findMatch(row.matchId);
    if (match) {
      this.selectedMatch.set(match);
    }
    this.harness.runScenarioMatrixSummary(row.matchId, row.seedStart, 20, row.scenarioGroup, row.controlledSide)
      .subscribe((rows) => {
        this.scenarioMatrixSummaryResults.set(rows || []);
      });
  }
  private findMatch(matchId: string): TestHarnessMatchRow | null {
    for (const round of this.rounds()) {
      const match = round.matches.find((item) => item.matchId === matchId);
      if (match) {
        return match;
      }
    }
    return null;
  }
  trackByScenarioBatteryReviewItem(_: number, item: ScenarioBatteryReviewItem): string {
    return item.key;
  }
  scenarioBatteryGroupLabel(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): string {
    return getScenarioBatteryGroupLabel(group);
  }
  scenarioBatteryMatchLimit(): number {
    return this.scenarioBatteryScopeModel === 'balanced' ? 4 : 2;
  }
  private styleLabelFromActionDetail(actionDetail: string | null | undefined): string | null {
    return getStyleLabelFromActionDetail(actionDetail, this.teamStyleOptions);
  }
  private scenarioActionLabel(actionDetail: string | null | undefined): string | null {
    return getScenarioActionLabel(actionDetail, this.teamStyleOptions);
  }
  private scenarioShapeActionLabel(actionDetail: string): string | null {
    return getScenarioShapeActionLabel(actionDetail);
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
    return getScenarioSummaryActionLabel(row, this.teamStyleOptions);
  }
  scenarioSummaryBaseFormation(): string {
    const row = this.scenarioMatrixSummaryResults()
      .find((item) => !!item.baselineFormation);
    return row?.baselineFormation || '';
  }
  scenarioSummaryIsFormationNoop(row: ScenarioMatrixSummaryRow): boolean {
    return getScenarioSummaryIsFormationNoop(row);
  }
  scenarioSummaryFormationLabel(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryFormationLabel(row);
  }
  scenarioSummaryFormationHint(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryFormationHint(row);
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
    return getScenarioSummaryOutcome(
      row,
      this.scenarioSummaryIsFormationNoop(row),
      this.scenarioSummaryReadLevel(row)
    );
  }
  scenarioSummaryOutcomeClass(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryOutcomeClass(this.scenarioSummaryOutcome(row));
  }
  scenarioSummaryOutcomeReason(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryOutcomeReason(
      row,
      this.scenarioSummaryIsFormationNoop(row),
      this.scenarioSummaryAttackGainScore(row),
      this.scenarioSummaryAttackLossScore(row),
      this.scenarioSummaryDefensiveGainScore(row),
      this.scenarioSummaryDefensiveRiskScore(row)
    );
  }
  scenarioSummaryCoachRead(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryCoachRead(
      row,
      this.scenarioSummaryIsFormationNoop(row),
      this.scenarioSummaryReadLevel(row),
      this.scenarioSummaryUserChannelRead(row),
      this.scenarioSummaryOpponentChannelRead(row),
      this.scenarioSummaryCoachReadPrefix(row)
    );
  }
  private scenarioSummaryCoachReadPrefix(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryCoachReadPrefix(row);
  }
  private isScenarioShapeAction(actionDetail: string | null | undefined): boolean {
    return getScenarioSummaryIsShapeAction(actionDetail);
  }
  scenarioSummaryCoachReadDetail(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryCoachReadDetail(
      this.scenarioSummaryCoachRead(row),
      this.scenarioSummaryUserChannelRead(row),
      this.scenarioSummaryOpponentChannelRead(row),
      this.fmtDeltaNumber(row.avgUserXgDelta),
      this.fmtDeltaNumber(row.avgOpponentXgDelta),
      this.fmtDeltaNumber(row.avgUserShotsDelta),
      this.fmtDeltaNumber(row.avgOpponentShotsDelta),
      this.fmtDeltaNumber(row.avgOpponentLeftWideXgDelta),
      this.fmtDeltaNumber(row.avgOpponentRightWideXgDelta)
    );
  }
  scenarioSummaryRecommendation(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryRecommendationFromOutcome(
      this.scenarioSummaryIsFormationNoop(row),
      this.scenarioSummaryReadLevel(row),
      this.scenarioSummaryOutcome(row),
      this.scenarioSummaryCoachReadPrefix(row)
    );
  }
  scenarioSummaryRecommendationClass(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryRecommendationClass(this.scenarioSummaryRecommendation(row));
  }
  scenarioSummaryRecommendationDetail(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryRecommendationDetail(
      this.scenarioSummaryRecommendation(row),
      this.scenarioSummaryRead(row),
      this.scenarioSummaryOutcome(row),
      this.scenarioSummaryCoachReadDetail(row)
    );
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
    return getScenarioDecisionMetrics(
      title,
      row,
      this.isOpponentScenarioRow(row),
      this.scenarioOpponentMaxChannelXgDelta(row),
      this.scenarioDecisionConfidence(row),
      (value) => this.fmtDeltaNumber(value)
    );
  }
  private isOpponentScenarioRow(row: ScenarioMatrixSummaryRow): boolean {
    return getScenarioSummaryIsOpponentRow(row);
  }
  private scenarioActionKey(row: ScenarioMatrixSummaryRow): string {
    return getScenarioActionKey(row);
  }
  private scenarioTwoWayScore(row: ScenarioMatrixSummaryRow): number {
    return getScenarioTwoWayScore(row);
  }
  private scenarioAttackCandidateIsCoachWorthy(row: ScenarioMatrixSummaryRow): boolean {
    return getScenarioAttackCandidateIsCoachWorthy(row);
  }
  private scenarioAttackPlanScore(row: ScenarioMatrixSummaryRow): number {
    return getScenarioAttackPlanScore(row);
  }
  private scenarioDecisionConfidence(row: ScenarioMatrixSummaryRow): string {
    return getScenarioDecisionConfidenceFromReadLevel(this.scenarioSummaryReadLevel(row));
  }
  private scenarioProtectionCandidateIsCoachWorthy(row: ScenarioMatrixSummaryRow): boolean {
    return getScenarioProtectionCandidateIsCoachWorthy(row, this.summaryActionLabel(row));
  }
  private buildScenarioBatteryRow(
    match: TestHarnessMatchRow,
    controlledSide: Exclude<ControlledTeamSide, 'USER'>,
    scenarioGroup: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT',
    seedStart: number,
    seedCount: number,
    rows: ScenarioMatrixSummaryRow[]
  ): ScenarioBatteryRow {
    return buildScenarioBatteryRowUtils(match, controlledSide, scenarioGroup, seedStart, seedCount, rows, {
      buildDecisionCards: (summaryRows) => this.buildScenarioDecisionCards(summaryRows),
      coachContext: (targetMatch, side) => this.scenarioBatteryCoachContext(targetMatch, side),
      coachObjective: (targetMatch, side) => this.scenarioBatteryEffectiveCoachObjective(targetMatch, side),
      decision: (cards, objective) => this.scenarioBatteryDecision(cards, objective),
      review: (objective, decisionLabel, cards) => this.scenarioBatteryDecisionReview(objective, decisionLabel, cards),
    });
  }
  private scenarioBatteryDecision(
    cards: ScenarioDecisionCard[],
    objective: ScenarioBatteryCoachObjective = 'NEUTRAL'
  ): { label: string; detail: string } {
    return getScenarioBatteryDecision(cards, objective);
  }
  private scenarioBatteryDecisionReview(
    objective: ScenarioBatteryCoachObjective,
    decisionLabel: string,
    cards: ScenarioDecisionCard[]
  ): { label: string; detail: string } {
    return getScenarioBatteryDecisionReview(
      objective,
      decisionLabel,
      cards,
      this.scenarioBatteryCoachObjectiveLabel(objective)
    );
  }
  scenarioBatteryCardSummary(row: ScenarioBatteryRow, title: string): string {
    return getScenarioBatteryCardSummary(row, title);
  }
  scenarioBatteryCardDetail(row: ScenarioBatteryRow, title: string): string {
    return getScenarioBatteryCardDetail(row, title);
  }
  scenarioBatteryRiskCardSummary(row: ScenarioBatteryRow): string {
    return getScenarioBatteryRiskCardSummary(row);
  }
  scenarioBatteryRiskCardDetail(row: ScenarioBatteryRow): string {
    return getScenarioBatteryRiskCardDetail(row);
  }
  private scenarioBatteryExportRow(row: ScenarioBatteryRow): Record<string, unknown> {
    return getScenarioBatteryExportRow(row);
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
    return getScenarioOpponentRiskRead(row, (value) => this.fmtDeltaNumber(value));
  }
  private scenarioOpponentProtectionRead(row: ScenarioMatrixSummaryRow): string {
    return getScenarioOpponentProtectionRead(row, (value) => this.fmtDeltaNumber(value));
  }
  private scenarioSummaryUserChannelRead(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryUserChannelRead(row);
  }
  private scenarioSummaryOpponentChannelRead(row: ScenarioMatrixSummaryRow): string {
    return getScenarioSummaryOpponentChannelRead(row);
  }
  scenarioSummaryOutcomeSummary(): Array<{ label: string; count: number; className: string; hint: string }> {
    return getScenarioSummaryOutcomeSummaryFromOutcomes(
      this.scenarioMatrixSummaryResults().map((row) => this.scenarioSummaryOutcome(row))
    );
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
    return getScenarioSummaryImpactScore(row);
  }
  private scenarioSummaryAttackGainScore(row: ScenarioMatrixSummaryRow): number {
    return getScenarioSummaryAttackGainScore(row);
  }
  private scenarioSummaryAttackLossScore(row: ScenarioMatrixSummaryRow): number {
    return getScenarioSummaryAttackLossScore(row);
  }
  private scenarioSummaryDefensiveGainScore(row: ScenarioMatrixSummaryRow): number {
    return getScenarioSummaryDefensiveGainScore(row);
  }
  private scenarioSummaryDefensiveRiskScore(row: ScenarioMatrixSummaryRow): number {
    return getScenarioSummaryDefensiveRiskScore(row);
  }
  private scenarioSummaryNeedsReview(row: ScenarioMatrixSummaryRow): boolean {
    return getScenarioSummaryNeedsReview(row);
  }
  private scenarioSummaryCoherentSubstitutionSignal(row: ScenarioMatrixSummaryRow): boolean {
    return getScenarioSummaryCoherentSubstitutionSignal(row);
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
    return formatDeltaInt(value);
  }
  fmtDeltaNumber(value: number): string {
    return formatDeltaNumber(value);
  }
  private roundTo(value: number, decimals: number): number {
    if (!Number.isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  fmtDeltaMicro(value: number): string {
    return formatDeltaMicro(value);
  }
  deltaClass(value: number): string {
    return deltaClassName(value);
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
    return getPositionPixelSignalScore(row);
  }
  private positionPixelSignalReadFromRow(row: PositionPixelMatrixSummaryRow): string {
    const score = this.positionPixelSignalScoreFromRow(row);
    return getPositionPixelSignalRead(score, getPositionPixelDistance(row));
  }
  private positionPixelSignalClassFromRow(row: PositionPixelMatrixSummaryRow): string {
    const score = this.positionPixelSignalScoreFromRow(row);
    return getPositionPixelSignalClass(score, getPositionPixelDistance(row));
  }
  private positionPixelSignalDetailFromRow(row: PositionPixelMatrixSummaryRow): string {
    return getPositionPixelSignalDetail(row, (value) => this.fmtDeltaMicro(value), (value) => this.fmtDeltaNumber(value));
  }
  private positionPixelMovementConfidence(distance: number): number {
    return getPositionPixelMovementConfidence(distance);
  }
  positionPixelTacticalRead(row: PositionPixelMatrixSummary): string {
    return getPositionPixelTacticalRead(row);
  }
  positionPixelTacticalReadClass(row: PositionPixelMatrixSummary): string {
    return getPositionPixelTacticalReadClass(this.positionPixelTacticalRead(row));
  }
  positionPixelTacticalReadReason(row: PositionPixelMatrixSummary): string {
    return getPositionPixelTacticalReadReason(row, this.positionPixelCoachRead(row), (value) => this.fmtDeltaMicro(value));
  }
  positionPixelChannelBreakdownRead(row: PositionPixelMatrixSummary): string {
    const breakdown = this.positionPixelChannelBreakdown(row);
    return getPositionPixelChannelBreakdownRead(breakdown, this.positionPixelCoverageChannelLabel(row, breakdown.coverage));
  }
  positionPixelChannelBreakdownClass(row: PositionPixelMatrixSummary): string {
    return getPositionPixelChannelBreakdownClass(this.positionPixelChannelBreakdown(row));
  }
  positionPixelChannelBreakdownDetail(row: PositionPixelMatrixSummary): string {
    const breakdown = this.positionPixelChannelBreakdown(row);
    return getPositionPixelChannelBreakdownDetail(
      row,
      breakdown,
      (value) => this.fmtDeltaMicro(value),
      (value) => this.fmtDeltaNumber(value),
      this.positionPixelContextualCoverageNote(row, breakdown.coverage)
    );
  }
  positionPixelVisualExpectationRead(row: PositionPixelMatrixSummary): string {
    return getPositionPixelVisualExpectationRead(row, this.positionPixelSourceLine(row));
  }
  positionPixelVisualExpectationClass(row: PositionPixelMatrixSummary): string {
    return getPositionPixelVisualExpectationClass(this.positionPixelVisualExpectationRead(row));
  }
  positionPixelVisualExpectationDetail(row: PositionPixelMatrixSummary): string {
    return getPositionPixelVisualExpectationDetail(
      row,
      this.positionPixelSourceLine(row),
      this.positionPixelShapeMove(row),
      this.positionPixelChannelBreakdownRead(row)
    );
  }
  private positionPixelIsMicroVisualMismatch(row: PositionPixelMatrixSummary): boolean {
    return getPositionPixelIsMicroVisualMismatch(row);
  }
  positionPixelVisualEngineTensionRead(row: PositionPixelMatrixSummary): string {
    return getPositionPixelVisualEngineTensionRead(this.positionPixelVisualEngineTensions(row));
  }
  positionPixelVisualEngineTensionClass(row: PositionPixelMatrixSummary): string {
    return getPositionPixelVisualEngineTensionClass(this.positionPixelVisualEngineTensions(row));
  }
  positionPixelVisualEngineTensionDetail(row: PositionPixelMatrixSummary): string {
    return getPositionPixelVisualEngineTensionDetail(
      this.positionPixelVisualEngineTensions(row),
      this.positionPixelChannelBreakdownRead(row),
      this.positionPixelTacticalRead(row)
    );
  }
  private positionPixelVisualEngineTensions(row: PositionPixelMatrixSummary): PositionPixelVisualEngineTension[] {
    return getPositionPixelVisualEngineTensions(row, this.positionPixelSourceLine(row));
  }
  private positionPixelVisualExpectationMismatches(row: PositionPixelMatrixSummary): string[] {
    return getPositionPixelVisualExpectationMismatches(row, this.positionPixelSourceLine(row));
  }
  positionPixelChannelBreakdown(row: PositionPixelMatrixSummary): PositionPixelChannelBreakdown {
    return getPositionPixelChannelBreakdown(row);
  }
  private positionPixelChannelSign(value: number): '+' | '-' | '=' {
    return getPositionPixelChannelSign(value);
  }
  private positionPixelCoverageChannelLabel(row: PositionPixelMatrixSummary, coverage: number): string {
    return getPositionPixelCoverageChannelLabel(this.positionPixelUsesContextualCoverage(row, coverage), coverage);
  }
  private positionPixelContextualCoverageNote(row: PositionPixelMatrixSummary, coverage: number): string | null {
    return getPositionPixelContextualCoverageNote(row, this.positionPixelSourceLine(row), coverage);
  }
  private positionPixelUsesContextualCoverage(row: PositionPixelMatrixSummary, coverage: number): boolean {
    return getPositionPixelUsesContextualCoverage(row, this.positionPixelSourceLine(row), coverage);
  }
  private positionPixelSourceLine(row: PositionPixelMatrixSummary): 'ATT' | 'MID' | 'DEF' {
    return this.strictPositionPixelLine(row.playerPosition) ?? this.positionPixelVisualLine(row.fromYPercent);
  }
  private positionPixelClampBreakdownScore(value: number): number {
    return Math.max(-9.99, Math.min(9.99, Number.isFinite(value) ? value : 0));
  }
  positionPixelCoachRead(row: PositionPixelMatrixSummary): string {
    return getPositionPixelCoachRead(row);
  }
  private positionPixelWideChannelReason(row: PositionPixelMatrixSummary): string {
    return getPositionPixelWideChannelReason(row, (value) => this.fmtDeltaMicro(value));
  }
  positionPixelShapeMove(row: PositionPixelMatrixSummary): string {
    return getPositionPixelShapeMove(row);
  }
  positionPixelShapeMoveDetail(row: PositionPixelMatrixSummary): string {
    return getPositionPixelShapeMoveDetail(row);
  }
  private positionPixelShapeDeltaText(
    fromLine: PositionPixelVisualLine,
    fromChannel: PositionPixelVisualChannel,
    toLine: PositionPixelVisualLine,
    toChannel: PositionPixelVisualChannel
  ): string {
    return getPositionPixelShapeDeltaText(fromLine, fromChannel, toLine, toChannel);
  }
  private positionPixelVisualChannel(xPercent: number): PositionPixelVisualChannel {
    return getPositionPixelVisualChannel(xPercent);
  }
  private positionPixelVisualLine(yPercent: number): PositionPixelVisualLine {
    return getPositionPixelVisualLine(yPercent);
  }
  positionPixelQaSummaryBoard(): PositionPixelQaSummaryRow[] {
    const rows = this.positionPixelMatrixRows();
    const lines: PositionPixelQaLine[] = ['ALL', 'DEF', 'MID', 'ATT'];
    return lines.map((line) => {
      const rowLine = (row: PositionPixelMatrixSummary): PositionPixelQaLine => {
        const position = String(row.playerPosition || '').toUpperCase();
        if (position === 'DEF' || position === 'MID' || position === 'ATT') {
          return position;
        }
        return this.strictPositionPixelLine(row.playerPosition) || this.positionPixelVisualLine(row.fromYPercent);
      };
      const scoped = line === 'ALL'
        ? rows
        : rows.filter((row) => rowLine(row) === line);
      const isStable = (row: PositionPixelMatrixSummary) => this.positionPixelRead(row).toLowerCase().includes('estable');
      const isReview = (row: PositionPixelMatrixSummary) => this.positionPixelRead(row).toLowerCase().includes('revis');
      const microOk = scoped.filter((row) =>
        this.positionPixelDistance(row) <= 1.5
        && Math.abs(row.signalScore || 0) < 0.05
      ).length;
      const visibleOk = scoped.filter((row) =>
        Math.abs(row.signalScore || 0) >= 0.05
        || Math.abs(row.deltaXgFor || 0) >= 0.05
        || Math.abs(row.deltaXgAgainst || 0) >= 0.05
        || Math.abs(row.deltaShotsFor || 0) >= 1
        || Math.abs(row.deltaShotsAgainst || 0) >= 1
      ).length;
      const contradiction = scoped.filter((row) =>
        Math.abs(row.signalScore || 0) >= 0.15
        &&
        (row.deltaWideXgFor || 0) > 0.08
        && ((row.deltaXgFor || 0) < -0.03 || (row.deltaShotsFor || 0) < -0.5)
      ).length;
      const strongCoherent = scoped.filter((row) => Math.abs(row.signalScore || 0) >= 0.15).length - contradiction;
      const visualReview = scoped.filter((row) => isReview(row)).length;
      const verdict = contradiction > 0 ? 'Revisar motor' : visualReview > 0 ? 'Revisar' : 'OK';
      return {
        line,
        total: scoped.length,
        microOk,
        visibleOk,
        strongCoherent,
        visualReview,
        contradiction,
        verdict,
        verdictClass: contradiction > 0 ? 'read-check' : visualReview > 0 ? 'delta-neutral' : 'read-stable',
      };
    });
  }
  readonly trackByPositionPixelQaSummaryRow = (_index: number, row: PositionPixelQaSummaryRow): string => row.line;
  private positionPixelChannelLabel(channel: PositionPixelVisualChannel): string {
    return getPositionPixelChannelLabel(channel);
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
        hint: 'Movimientos que ganan algo pero pagan algo: más ataque con más riesgo, o más protección con menos ataque.',
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
        hint: 'Movimientos que protegen mejor sin una pérdida ofensiva fuerte.',
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
        hint: 'Micro-movimientos con señal llamativa: revisar con más seeds antes de decidir.',
        matches: (read: string) => read === 'Micro review',
      },
      {
        label: 'Neutral/Small',
        className: 'read-stable',
        hint: 'Movimientos con señal chica, compensada, micro o neutra.',
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
    const mismatch = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual review').length;
    const micro = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual micro').length;
    const ok = rows.filter((row) => this.positionPixelVisualExpectationRead(row) === 'Visual OK').length;
    return [
      {
        label: 'Visual review',
        count: mismatch,
        className: mismatch > 0 ? 'read-check' : 'read-stable',
        hint: 'Filas donde la expectativa visual básica necesita revisión contextual; no es contradicción automática.',
      },
      {
        label: 'Visual micro',
        count: micro,
        className: micro > 0 ? 'read-review' : 'read-stable',
        hint: 'Filas con señal visual muy chica: no son bugs directos, pero conviene revisarlas con más seeds.',
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
    const parts = row.label.split(/\s[?·]\s/);
    return parts.length > 1 ? parts[0] : 'Selected match';
  }
  positionPixelMoveLabel(row: PositionPixelMatrixSummary): string {
    const parts = row.label.split(/\s[?·]\s/);
    return parts.length > 1 ? parts.slice(1).join(' · ') : row.label;
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
    return getPositionPixelDecisionScore(row);
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
    return getPositionPixelMatchSmokeVerdict(
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
  }
  private positionPixelMatchSmokeVerdictClass(verdict: string): string {
    return getPositionPixelSmokeVerdictClass(verdict);
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
    return getPositionPixelPlayerSmokeVerdict(fivePxRiskRows, bigMoveRows, bigMoveStrongRows, avgSignal, worstSignal);
  }
  private positionPixelPlayerSmokeSeverity(item: PositionPixelPlayerSmokeSummary): number {
    return getPositionPixelPlayerSmokeSeverity(item.verdict);
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
    return getPositionPixelReadLevel(row, this.positionPixelTacticalRead(row));
  }
  private positionPixelReadSeverity(row: PositionPixelMatrixSummary): number {
    return getPositionPixelReadSeverity(row, this.positionPixelTacticalRead(row));
  }
  private positionPixelImpactScore(row: PositionPixelMatrixSummary): number {
    return getPositionPixelImpactScore(row);
  }
  private positionPixelAttackGainScore(row: PositionPixelMatrixSummary): number {
    return getPositionPixelAttackGainScore(row);
  }
  private positionPixelAttackLossScore(row: PositionPixelMatrixSummary): number {
    return getPositionPixelAttackLossScore(row);
  }
  private positionPixelDefensiveRiskScore(row: PositionPixelMatrixSummary): number {
    return getPositionPixelDefensiveRiskScore(row);
  }
  private positionPixelDefensiveGainScore(row: PositionPixelMatrixSummary): number {
    return getPositionPixelDefensiveGainScore(row);
  }
  private positionPixelDistance(row: PositionPixelMatrixSummary): number {
    return getPositionPixelDistance(row);
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
    return formatPercent(value);
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
   * Uses the backend in-memory formation-matrix endpoint instead of 12 full
   * replay-and-persist cycles. The backend still applies the
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
              `Matriz formaciones needs exactly 11 current lineup players, got ${originalPlayerIds.length}.`
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
          `Matriz formaciones lista (${this.formationReplayResults().length} formaciones).`,
          'OK',
          { duration: 3000 }
        );
        this.markReplayAnalysisReady('Matriz formaciones lista en Panel E.');
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }
  onRunFormationMatrixSummary(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Elegí un partido en el Panel C primero.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    this.scenarioMatrixSummarySeedCount.set(seedCount);
    this.clearFormationAverageResults();
    this.analysisReadyMessage.set(`Promedio formaciones corriendo: ${seedCount} seeds por formación...`);
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, this.controlledTeamSideModel))
    ).subscribe({
      next: (rows) => {
        const safeRows = rows ?? [];
        this.formationMatrixSummaryResults.set(safeRows);
        this.snackBar.open(
          `Promedio formaciones listo (${safeRows.length} formaciones · ${seedCount} seeds).`,
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
    const runId = ++this.professionalSmokeRunId;
    this.clearFormationAverageResults();
    this.professionalSmokeSummary.set(null);
    this.scenarioMatrixSummaryResults.set([]);
    this.scenarioMatrixSummarySeedCount.set(formationSeedCount);
    this.analysisReadyMessage.set(
      `Smoke profesional corriendo para ${controlledName}: formaciones ${formationSeedCount} seeds + escenarios ${scenarioSeedCount} seeds...`
    );
    this.mutationInFlight.set(true);
    this.guardProfessionalSmokeTimeout(runId, controlledName, controlledSide, formationSeedCount, scenarioSeedCount);
    const stepTimeoutMs = 60_000;
    const formationRows$ = this.harness.runFormationMatrixSummary(matchId, seedStart, formationSeedCount, controlledSide).pipe(
      timeout(stepTimeoutMs),
      map((rows) => ({ rows: rows ?? [], issue: null as string | null })),
      catchError((err) => of({
        rows: [] as FormationMatrixSummaryRow[],
        issue: this.fmtError(err, `Formation avg timeout/error after ${stepTimeoutMs / 1000}s`),
      }))
    );
    const scenarioRows$ = this.harness.runScenarioMatrixSummary(matchId, seedStart, scenarioSeedCount, 'ALL', controlledSide).pipe(
      timeout(stepTimeoutMs),
      map((rows) => ({ rows: rows ?? [], issue: null as string | null })),
      catchError((err) => of({
        rows: [] as ScenarioMatrixSummaryRow[],
        issue: this.fmtError(err, `Scenario smoke timeout/error after ${stepTimeoutMs / 1000}s`),
      }))
    );
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => formationRows$.pipe(
        switchMap((formation) => scenarioRows$.pipe(
          map((scenario) => ({ formation, scenario }))
        ))
      ))
    ).subscribe({
      next: ({ formation, scenario }) => {
        if (runId !== this.professionalSmokeRunId) return;
        const safeFormationRows = formation.rows;
        const safeScenarioRows = scenario.rows;
        const stepIssues = [formation.issue, scenario.issue].filter((issue): issue is string => !!issue);
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
            ...stepIssues,
          ],
          skipped: userScope
            ? [
                'Píxeles y swaps se corren desde sus botones dedicados para preservar evidencia detallada.',
                'Compare baseline/live queda disponible en Abrir comparador.',
              ]
            : [
                'Píxeles y swaps requieren lineup editable de Mi equipo; no se simulan para Local/Visitante.',
                'Compare baseline/live queda disponible en Abrir comparador.',
              ],
          read: `${controlledName}: ${safeFormationRows.length} formaciones · ${safeScenarioRows.length} escenarios · scope ${controlledSide}${stepIssues.length > 0 ? ' · revisar etapa lenta/fallida' : ''}.`,
        });
        this.markReplayAnalysisReady(
          `Smoke profesional listo para ${controlledName}: ${safeFormationRows.length} formaciones · ${safeScenarioRows.length} escenarios${stepIssues.length > 0 ? ' · con observaciones' : ''}.`
        );
        this.snackBar.open(
          `Smoke profesional listo: ${safeFormationRows.length} formaciones, ${safeScenarioRows.length} escenarios.`,
          'OK',
          { duration: 4500 }
        );
      },
      error: (err) => {
        if (runId !== this.professionalSmokeRunId) return;
        this.analysisReadyMessage.set(this.fmtError(err, 'Smoke profesional falló'));
        this.snackBar.open(this.fmtError(err, 'No se pudo correr smoke profesional'), 'OK', { duration: 6000 });
      },
      complete: () => {
        if (runId !== this.professionalSmokeRunId) return;
        this.mutationInFlight.set(false);
      },
    });
  }
  private guardProfessionalSmokeTimeout(
    runId: number,
    controlledName: string,
    controlledSide: ControlledTeamSide,
    formationSeedCount: number,
    scenarioSeedCount: number
  ): void {
    window.setTimeout(() => {
      if (runId !== this.professionalSmokeRunId || !this.mutationInFlight()) return;
      const formationRows = this.formationMatrixSummaryResults().length;
      const scenarioRows = this.scenarioMatrixSummaryResults().length;
      this.professionalSmokeRunId++;
      this.mutationInFlight.set(false);
      this.professionalSmokeSummary.set({
        controlledTeam: controlledName,
        scope: controlledSide,
        formationRows,
        scenarioRows,
        pixelRows: 0,
        swapRows: 0,
        formationSeedCount,
        scenarioSeedCount,
        included: [
          `Formation avg: ${formationRows} formaciones`,
          `Scenario smoke: ${scenarioRows} escenarios`,
        ],
        skipped: ['Smoke profesional cortado por timeout defensivo; revisar partido/endpoint lento antes de calibrar.'],
        read: `${controlledName}: professional smoke parcial por timeout · ${formationRows} formaciones · ${scenarioRows} escenarios · scope ${controlledSide}.`,
      });
      this.analysisReadyMessage.set('Smoke profesional cortado por timeout defensivo. Resultados parciales abajo.');
      this.snackBar.open('Smoke profesional timeout: resultados parciales disponibles.', 'OK', { duration: 6000 });
    }, 150_000);
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
      const baseSummary = this.professionalSmokeSummary();
      const baseSmokeNotes = [...(baseSummary?.skipped ?? []), ...(baseSummary?.included ?? [])];
      const baseHadIssue = baseSmokeNotes.some((item) => {
        const lower = item.toLowerCase();
        return lower.includes('timeout') || lower.includes('timed out') || lower.includes('error');
      });
      if (baseHadIssue) {
        this.analysisReadyMessage.set('Smoke profesional full sigue con píxeles/swaps: la etapa base tuvo observaciones, pero no se corta la evidencia restante.');
        this.snackBar.open('Smoke full: etapa base con observaciones; sigo con píxeles/swaps.', 'OK', { duration: 4500 });
      }
      this.runProfessionalSmokeFormationAuditStage(() => {
        if (runId !== this.professionalSmokeFullRunId) return;
        this.runProfessionalSmokePixelStage(() => {
          if (runId !== this.professionalSmokeFullRunId) return;
          this.professionalSmokeFullPixelRows = this.positionPixelMatrixRows().length;
          this.onRunPlayerSwapBattery({ preservePositionPixels: true });
          this.waitForProfessionalSmokeStep('cambios de jugador', () => {
            if (runId !== this.professionalSmokeFullRunId) return;
            this.runProfessionalSmokeSubstitutionStage(() => {
              if (runId !== this.professionalSmokeFullRunId) return;
              this.finalizeProfessionalSmokeFullSummary();
            });
          });
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
      const substitutionRows = this.substitutionWhatIfSummary() ? 1 : 0;
      const formationRows = this.formationMatrixSummaryResults().length;
      const scenarioRows = this.scenarioMatrixSummaryResults().length;
      this.professionalSmokeFullRunId++;
      this.mutationInFlight.set(false);
      this.professionalSmokeSummary.set({
        controlledTeam: controlledName,
        scope: 'USER',
        verdict: 'Partial',
        verdictDetail: 'Smoke cortado por timeout defensivo; usar solo como evidencia parcial.',
        formationRows,
        scenarioRows,
        formationAuditRows: this.formationLineSmokeRows().length,
        formationAuditFallbackRows: this.formationLineSmokeRows().filter((row) => row.verdict === 'Fallback').length,
        formationAuditReviewRows: this.formationLineSmokeRows().filter((row) => row.verdict === 'Review').length,
        pixelRows,
        swapRows,
        substitutionRows,
        formationSeedCount: this.scenarioMatrixSummaryEffectiveSeedCount(),
        scenarioSeedCount: this.scenarioMatrixSmokeSeedCount(),
        included: [
          `Formation avg: ${formationRows} formaciones`,
          `Scenario smoke: ${scenarioRows} escenarios`,
          `Pixel sensitivity: ${pixelRows} filas`,
          `Batería cambio jugador: ${swapRows} cambios`,
          `Simular sustitución: ${substitutionRows} caso(s)`,
        ],
        skipped: ['Smoke full cortado por timeout defensivo; revisar etapa lenta antes de calibrar.'],
        read: `${controlledName}: smoke full parcial por timeout · ${formationRows} formaciones · ${scenarioRows} escenarios · ${pixelRows} píxeles · ${swapRows} swaps.`,
      });
      this.analysisReadyMessage.set('Smoke profesional full cortado por timeout defensivo. Resultados parciales abajo.');
      this.snackBar.open('Smoke profesional full timeout: resultados parciales disponibles.', 'OK', { duration: 6000 });
    }, 240_000);
  }
  private runProfessionalSmokeFormationAuditStage(onComplete: () => void): void {
    const matches = this.userTeamMatches()
      .filter((match) => match.status === 'COMPLETED')
      .slice(0, 3);
    const current = this.professionalSmokeSummary();
    if (matches.length === 0) {
      this.professionalSmokeSummary.set({
        controlledTeam: current?.controlledTeam ?? this.controlledTeamDisplayName(),
        scope: 'USER',
        formationRows: current?.formationRows ?? this.formationMatrixSummaryResults().length,
        scenarioRows: current?.scenarioRows ?? this.scenarioMatrixSummaryResults().length,
        formationAuditRows: 0,
        formationAuditFallbackRows: 0,
        formationAuditReviewRows: 0,
        pixelRows: current?.pixelRows ?? 0,
        swapRows: current?.swapRows ?? 0,
        formationSeedCount: current?.formationSeedCount ?? this.scenarioMatrixSummaryEffectiveSeedCount(),
        scenarioSeedCount: current?.scenarioSeedCount ?? this.scenarioMatrixSmokeSeedCount(),
        included: current?.included ?? [],
        skipped: [
          ...(current?.skipped ?? []),
          'Auditoría todas las formaciones omitido: no hay partidos completados del usuario.',
        ],
        read: current?.read ?? `${this.controlledTeamDisplayName()}: smoke full en progreso.`,
      });
      onComplete();
      return;
    }
    this.clearFormationLineAuditResults();
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set('Smoke profesional full: auditando slots/lados de todas las formaciones...');
    this.buildAllFormationsLineAuditRows$(matches.length).pipe(
      timeout(60_000),
      map((result) => ({ result, issue: null as string | null })),
      catchError((err) => of({
        result: { rows: [] as FormationLineSmokeRow[], last: null as LineupDTO | null },
        issue: this.fmtError(err, 'Auditoría todas las formaciones timeout/error'),
      }))
    ).subscribe({
      next: ({ result, issue }) => {
        const before = this.professionalSmokeSummary();
        if (!issue) {
          this.applyAllFormationsLineAuditRows(result.rows, result.last);
        }
        const rows = this.formationLineSmokeRows();
        const fallbackRows = rows.filter((row) => row.verdict === 'Fallback').length;
        const reviewRows = rows.filter((row) => row.verdict === 'Review').length;
        this.professionalSmokeSummary.set({
          controlledTeam: before?.controlledTeam ?? this.controlledTeamDisplayName(),
          scope: 'USER',
          formationRows: before?.formationRows ?? this.formationMatrixSummaryResults().length,
          scenarioRows: before?.scenarioRows ?? this.scenarioMatrixSummaryResults().length,
          formationAuditRows: rows.length,
          formationAuditFallbackRows: fallbackRows,
          formationAuditReviewRows: reviewRows,
          pixelRows: before?.pixelRows ?? 0,
          swapRows: before?.swapRows ?? 0,
          formationSeedCount: before?.formationSeedCount ?? this.scenarioMatrixSummaryEffectiveSeedCount(),
          scenarioSeedCount: before?.scenarioSeedCount ?? this.scenarioMatrixSmokeSeedCount(),
          included: [
            ...(before?.included ?? []),
            issue ?? `Auditoría todas las formaciones: ${rows.length} checks · ${fallbackRows} fallback · ${reviewRows} review`,
          ],
          skipped: before?.skipped ?? [],
          read: before?.read ?? `${this.controlledTeamDisplayName()}: smoke full en progreso.`,
        });
      },
      error: (err) => {
        const before = this.professionalSmokeSummary();
        this.professionalSmokeSummary.set({
          controlledTeam: before?.controlledTeam ?? this.controlledTeamDisplayName(),
          scope: 'USER',
          formationRows: before?.formationRows ?? this.formationMatrixSummaryResults().length,
          scenarioRows: before?.scenarioRows ?? this.scenarioMatrixSummaryResults().length,
          formationAuditRows: this.formationLineSmokeRows().length,
          formationAuditFallbackRows: this.formationLineSmokeRows().filter((row) => row.verdict === 'Fallback').length,
          formationAuditReviewRows: this.formationLineSmokeRows().filter((row) => row.verdict === 'Review').length,
          pixelRows: before?.pixelRows ?? 0,
          swapRows: before?.swapRows ?? 0,
          formationSeedCount: before?.formationSeedCount ?? this.scenarioMatrixSummaryEffectiveSeedCount(),
          scenarioSeedCount: before?.scenarioSeedCount ?? this.scenarioMatrixSmokeSeedCount(),
          included: before?.included ?? [],
          skipped: [
            ...(before?.skipped ?? []),
            this.fmtError(err, 'Auditoría todas las formaciones falló dentro del smoke full'),
          ],
          read: before?.read ?? `${this.controlledTeamDisplayName()}: smoke full en progreso.`,
        });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        onComplete();
      },
    });
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
      'Smoke profesional pixel sweep',
      null,
      null,
      null,
      true,
      'ALL',
      onComplete
    );
  }
  private runProfessionalSmokeSubstitutionStage(onComplete: () => void): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      onComplete();
      return;
    }
    const seedStart = this.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(10, Math.min(30, Math.round(this.playerSwapSeedCountModel || 10)));
    const minute = 60;
    this.substitutionWhatIfSummary.set(null);
    this.analysisReadyMessage.set(`Smoke profesional full: substitution what-if min ${minute}, ${seedCount} seeds...`);
    this.mutationInFlight.set(true);
    forkJoin({
      lineup: this.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        const objective = this.playerSwapEffectiveCoachObjective();
        const manualCandidate = this.pickAutomaticSwapCandidate(lineup, squad);
        const manualPlayerOffId = this.selectedSwapStarterIdModel || manualCandidate?.starterId;
        const manualPlayerOnId = this.selectedSwapBenchIdModel || manualCandidate?.benchId;
        const objectiveCandidates = this.pickModalRecommendationSwapCandidates(lineup, squad, objective, 6);
        const candidates = this.selectedSwapStarterIdModel || this.selectedSwapBenchIdModel
          ? manualPlayerOffId && manualPlayerOnId
            ? [{
                starterId: manualPlayerOffId,
                starterName: manualCandidate?.starterName ?? 'Manual starter',
                starterPosition: manualCandidate?.starterPosition ?? 'AUTO',
                benchId: manualPlayerOnId,
                benchName: manualCandidate?.benchName ?? 'Manual bench',
                benchPosition: manualCandidate?.benchPosition ?? 'AUTO',
                slotId: manualCandidate?.slotId ?? '',
                testCase: `Smoke manual: ${this.scenarioBatteryCoachObjectiveLabel(objective)}`,
              }]
            : []
          : objectiveCandidates;
        if (candidates.length === 0) {
          throw new Error('No pude resolver candidatos seguros para substitution smoke.');
        }
        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => this.runModalSubstitutionCandidates(matchId, candidates, seedStart, seedCount, minute, objective)),
          map((items) => {
            const safe = items.find((item) => this.modalRecommendationWhatIfIsSafe(item.row, objective));
            if (!safe) {
              throw new Error(`Sin sustitución segura para ${this.scenarioBatteryCoachObjectiveLabel(objective)}.`);
            }
            return safe.row;
          })
        );
      }),
      timeout(60_000),
      map((row) => ({ row, issue: null as string | null })),
      catchError((err) => of({
        row: null as SubstitutionWhatIfSummaryRow | null,
        issue: this.fmtError(err, 'Simular sustitución timeout/error'),
      }))
    ).subscribe({
      next: ({ row, issue }) => {
        const before = this.professionalSmokeSummary();
        if (row) {
          this.substitutionWhatIfSummary.set({
            ...row,
            readClass: this.deltaClass(row.deltaXgDiff + row.deltaShotsFor * 0.04 - row.deltaXgAgainst * 0.6),
          });
        }
        this.professionalSmokeSummary.set({
          controlledTeam: before?.controlledTeam ?? this.controlledTeamDisplayName(),
          scope: 'USER',
          verdict: before?.verdict,
          verdictDetail: before?.verdictDetail,
          formationRows: before?.formationRows ?? this.formationMatrixSummaryResults().length,
          scenarioRows: before?.scenarioRows ?? this.scenarioMatrixSummaryResults().length,
          formationAuditRows: before?.formationAuditRows,
          formationAuditFallbackRows: before?.formationAuditFallbackRows,
          formationAuditReviewRows: before?.formationAuditReviewRows,
          pixelRows: before?.pixelRows ?? this.positionPixelMatrixRows().length,
          swapRows: before?.swapRows ?? this.playerSwapBatterySummaries().length,
          substitutionRows: row ? 1 : 0,
          formationSeedCount: before?.formationSeedCount ?? this.scenarioMatrixSummaryEffectiveSeedCount(),
          scenarioSeedCount: before?.scenarioSeedCount ?? this.scenarioMatrixSmokeSeedCount(),
          included: [
            ...(before?.included ?? []),
            issue ?? `Simular sustitución: ${row?.playerOffName ?? 'starter'} -> ${row?.playerOnName ?? 'bench'} min ${minute} x ${seedCount} seeds`,
          ],
          skipped: before?.skipped ?? [],
          read: before?.read ?? `${this.controlledTeamDisplayName()}: smoke full en progreso.`,
        });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        onComplete();
      },
    });
  }
  private waitForProfessionalSmokeStep(label: string, next: () => void, attempts = 0): void {
    window.setTimeout(() => {
      if (attempts > 240) {
        this.snackBar.open(`Smoke profesional full: timeout esperando ${label}.`, 'OK', { duration: 5000 });
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
    const substitutionRows = this.substitutionWhatIfSummary() ? 1 : 0;
    const baseIncluded = current?.included ?? [];
    const auditRows = this.formationLineSmokeRows().length;
    const auditFallbackRows = this.formationLineSmokeRows().filter((row) => row.verdict === 'Fallback').length;
    const auditReviewRows = this.formationLineSmokeRows().filter((row) => row.verdict === 'Review').length;
    const finalVerdict = this.professionalSmokeFinalVerdict();
    const skipped = [
      ...((current?.skipped ?? []).filter((item) => {
        const lower = item.toLowerCase();
        return !lower.includes('píxeles y swaps') && !lower.includes('compare baseline/live');
      })),
      'Compare baseline/live queda disponible en Abrir comparador.',
    ];
    const filteredSkipped = skipped.filter((item) => !item.toLowerCase().includes('preservar evidencia detallada'));
    const finalRead = `${controlledName}: smoke full · ${current?.formationRows ?? this.formationMatrixSummaryResults().length} formaciones · ${current?.scenarioRows ?? this.scenarioMatrixSummaryResults().length} escenarios · ${pixelRows} píxeles · ${swapRows} swaps · ${substitutionRows} sustituciones.`;
    this.professionalSmokeSummary.set({
      controlledTeam: current?.controlledTeam ?? controlledName,
      scope: 'USER',
      verdict: finalVerdict.verdict,
      verdictDetail: finalVerdict.detail,
      formationRows: current?.formationRows ?? this.formationMatrixSummaryResults().length,
      scenarioRows: current?.scenarioRows ?? this.scenarioMatrixSummaryResults().length,
      formationAuditRows: auditRows,
      formationAuditFallbackRows: auditFallbackRows,
      formationAuditReviewRows: auditReviewRows,
      pixelRows,
      swapRows,
      substitutionRows,
      formationSeedCount: current?.formationSeedCount ?? this.scenarioMatrixSummaryEffectiveSeedCount(),
      scenarioSeedCount: current?.scenarioSeedCount ?? this.scenarioMatrixSmokeSeedCount(),
      included: [
        ...baseIncluded,
        `Pixel sensitivity: ${pixelRows} filas`,
        `Batería cambio jugador: ${swapRows} cambios`,
        `Simular sustitución: ${substitutionRows} caso(s)`,
      ],
      skipped: filteredSkipped,
      read: finalRead,
    });
    this.markReplayAnalysisReady(`Smoke profesional full listo para ${controlledName}: ${pixelRows} píxeles · ${swapRows} swaps · ${substitutionRows} sustituciones.`);
    this.snackBar.open(`Smoke profesional completo listo: ${pixelRows} filas píxel, ${swapRows} swaps, ${substitutionRows} sustituciones.`, 'OK', { duration: 4500 });
  }
  private professionalSmokeFinalVerdict(): { verdict: NonNullable<ProfessionalSmokeSummary['verdict']>; detail: string } {
    const checks = this.professionalQaChecklistRows();
    const total = checks.length;
    const ok = checks.filter((row) => row.verdict === 'OK').length;
    const fallback = checks.filter((row) => row.verdict === 'Fallback').length;
    const review = checks.filter((row) => row.verdict === 'Review').length;
    const pending = checks.filter((row) => row.verdict === 'Pending').length;
    const notes = [
      ...(this.professionalSmokeSummary()?.included ?? []),
      ...(this.professionalSmokeSummary()?.skipped ?? []),
    ].join(' ').toLowerCase();
    if (notes.includes('timeout') || notes.includes('timed out') || notes.includes('error') || notes.includes('fallo') || notes.includes('failed')) {
      return {
        verdict: 'Partial',
        detail: `${ok}/${total} checks OK, ${fallback} fallback aceptado, ${review} review, ${pending} pending; hubo etapa lenta/fallida.`,
      };
    }
    if (review > 0) {
      return {
        verdict: 'Fail',
        detail: `${review} check(s) requieren correccion antes de calibrar profesionalmente.`,
      };
    }
    if (pending > 0) {
      return {
        verdict: 'Review',
        detail: `${pending} check(s) quedaron pendientes; correrlos o integrarlos antes de cerrar QA.`,
      };
    }
    return {
      verdict: 'OK',
      detail: `${ok}/${total} checks OK${fallback > 0 ? `, ${fallback} fallback visible/penalizado` : ''}.`,
    };
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
    this.analysisReadyMessage.set(`Lab bloque bajo 5-4-1 corriendo: alta/base/baja x ${seedCount} seeds...`);
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
        this.markReplayAnalysisReady(`Lab bloque bajo 5-4-1 listo (${rows.length} variantes).`);
      },
      error: (err) => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Lab bloque bajo 5-4-1 falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run low block lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.refreshLineupContext();
        this.snackBar.open('Lab bloque bajo 5-4-1 completed.', 'OK', { duration: 3500 });
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
      this.snackBar.open('Lab transicion 5-3-2 necesita un partido de tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.summarySeedStart();
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    this.backFiveTransitionLabRows.set([]);
    this.mutationInFlight.set(true);
    this.analysisReadyMessage.set(`Lab transicion 5-3-2 corriendo: carrileros bajos/base/altos x ${seedCount} seeds...`);
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
      next: (rows) => this.markReplayAnalysisReady(`Lab transicion 5-3-2 listo (${rows.length} variantes).`),
      error: (err) => {
        if (restore) {
          this.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(this.fmtError(err, 'Lab transicion 5-3-2 falló'));
        this.snackBar.open(this.fmtError(err, 'Failed to run Lab transicion 5-3-2'), 'OK', { duration: 6000 });
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.refreshLineupContext();
        this.snackBar.open('Lab transicion 5-3-2 completed.', 'OK', { duration: 3500 });
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
    this.analysisReadyMessage.set(`Smoke espejo bandas corriendo: ${seedCount} seeds por formación y por lado...`);
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
        this.markReplayAnalysisReady(`Smoke espejo bandas listo: ${rows.length} formaciones comparadas.`);
        this.snackBar.open(`Smoke espejo bandas listo (${rows.length} formaciones).`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.restoreSideMirrorLabs(matchId).subscribe({ error: () => undefined });
        this.analysisReadyMessage.set(`Smoke espejo bandas falló: ${this.fmtError(err, 'Failed to run side mirror smoke')}`);
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
    this.analysisReadyMessage.set(`Lab espejo sintetico corriendo: ${seedCount} seeds por formación y por lado...`);
    this.mutationInFlight.set(true);
    this.harness.runSideMirrorSyntheticLab(seedStart, seedCount).subscribe({
      next: (rows) => {
        const mappedRows = this.mapSyntheticSideMirrorRows(rows ?? []);
        this.sideMirrorSmokeRows.set(mappedRows);
        this.syntheticSideMirrorRows.set(mappedRows);
        this.markReplayAnalysisReady(`Lab espejo sintetico listo: ${(rows ?? []).length} formaciones comparadas.`);
        this.snackBar.open(`Lab espejo sintético listo (${(rows ?? []).length} formaciones).`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.analysisReadyMessage.set(`Lab espejo sintetico falló: ${this.fmtError(err, 'Failed to run synthetic mirror lab')}`);
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
    return getFormationWidthReadFromPositions(positions);
  }
  private formationWingbackRead(formation: string): FormationWingbackRead {
    const positions = this.formationPositionsByName()[formation] ?? [];
    return getFormationWingbackReadFromPositions(positions);
  }
  private buildSideMirrorSmokeRows(
    weakLeftRows: FormationMatrixSummaryRow[],
    weakRightRows: FormationMatrixSummaryRow[]
  ): SideMirrorSmokeRow[] {
    return buildSideMirrorSmokeRowsFromMatrixUtils(
      weakLeftRows,
      weakRightRows,
      this.formationPositionsByName()
    );
  }
  private sideMirrorRealRead(
    verdict: SideMirrorSmokeRow['verdict'],
    formation: string,
    weakLeftRightEdge: number,
    weakRightLeftEdge: number,
    width: FormationWidthRead,
    wingback: FormationWingbackRead
  ): string {
    return getSideMirrorRealRead(verdict, formation, weakLeftRightEdge, weakRightLeftEdge, width, wingback);
  }
  private mapSyntheticSideMirrorRows(rows: SideMirrorSyntheticLabRow[]): SideMirrorSmokeRow[] {
    return mapSyntheticSideMirrorRowsUtils(rows, this.formationPositionsByName());
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
          `Matriz escenarios lista (${rows?.length ?? 0} escenarios).`,
          'OK',
          { duration: 3000 }
        );
        this.markReplayAnalysisReady('Matriz escenarios lista en Panel E.');
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

  onRunFocusedWideBattery(): void {
    const matchId = this.selectedMatchId();
    if (!matchId || !this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open('Elegí un partido de tu equipo para correr Batería bandas enfocada.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = this.seedInputModel ?? 12345;
    const seedCount = this.scenarioMatrixSummaryEffectiveSeedCount();
    const formations = ['4-2-3-1', '4-4-2', '5-4-1'];
    const styles: TeamStyle[] = ['BALANCED', 'WIDE_PLAY'];
    const originalStyle = this.selectedStyleModel;
    this.focusedWideBatteryRows.set([]);
    this.scenarioMatrixSummarySeedCount.set(seedCount);
    this.analysisReadyMessage.set(`Batería bandas enfocada corriendo: ${formations.length} formaciones x ${styles.length} estilos x ${seedCount} seeds...`);
    this.mutationInFlight.set(true);

    this.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalFormation = originalLineup.formation ?? this.selectedFormationModel ?? '4-4-2';
        const originalPlayerIds = (originalLineup.players ?? []).map((player) => player.playerId);
        const originalSlots = originalLineup.slots ?? [];
        if (originalPlayerIds.length !== 11 || originalSlots.length !== 11) {
          throw new Error(`Batería bandas enfocada necesita 11 titulares y 11 slots; tiene ${originalPlayerIds.length}/${originalSlots.length}.`);
        }
        const jobs = formations.flatMap((formation) => styles.map((style) => ({ formation, style })));
        return from(jobs).pipe(
          concatMap((job) =>
            this.harness.manualSelectLineup(job.formation, originalPlayerIds).pipe(
              switchMap(() => this.harness.setStyle(job.style)),
              switchMap(() => this.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER')),
              map((summary) => ({ job, summary }))
            )
          ),
          toArray(),
          switchMap((results) =>
            this.harness.manualSelectLineup(originalFormation, originalPlayerIds, originalSlots).pipe(
              switchMap(() => this.harness.setStyle(originalStyle)),
              map(() => this.toFocusedWideBatteryRows(results))
            )
          )
        );
      }),
      finalize(() => this.mutationInFlight.set(false))
    ).subscribe({
      next: (rows) => {
        this.focusedWideBatteryRows.set(rows);
        this.markReplayAnalysisReady(`Batería bandas enfocada lista: ${rows.length} lecturas.`);
        this.snackBar.open('Batería bandas enfocada completed.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.analysisReadyMessage.set(this.fmtError(err, 'Batería bandas enfocada falló'));
      },
    });
  }

  private toFocusedWideBatteryRows(
    results: Array<{ job: { formation: string; style: TeamStyle }; summary: MatchPreviewSummary }>
  ): FocusedWideBatteryRow[] {
    const baseByFormation = new Map<string, MatchPreviewSummary>();
    for (const item of results) {
      if (item.job.style === 'BALANCED') {
        baseByFormation.set(item.job.formation, item.summary);
      }
    }
    return results.map((item) => {
      const summary = item.summary;
      const base = baseByFormation.get(item.job.formation) ?? summary;
      const wideShare = this.safeRatio(summary.avgWideShotsFor, summary.avgWideShotsFor + summary.avgCentralShotsFor);
      const baseWideShare = this.safeRatio(base.avgWideShotsFor, base.avgWideShotsFor + base.avgCentralShotsFor);
      const deltaXgFor = this.roundTo(summary.avgXgFor - base.avgXgFor, 3);
      const deltaWideShotsFor = this.roundTo(summary.avgWideShotsFor - base.avgWideShotsFor, 3);
      const deltaWideShare = this.roundTo(wideShare - baseWideShare, 3);
      const wideStyle = item.job.style === 'WIDE_PLAY';
      const signal = deltaWideShotsFor >= 0.35 || deltaWideShare >= 0.025;
      const harmful = deltaXgFor < -0.05 && !signal;
      const read = !wideStyle
        ? 'Base de comparación.'
        : signal
          ? 'Bandas afecta el plan: sube canal exterior.'
          : harmful
            ? 'Bandas baja ataque sin abrir banda: calibrar estilo/roles.'
            : 'Bandas queda plano: revisar roles, amplitud o sensibilidad.';
      const className = !wideStyle
        ? 'read-visible'
        : signal
          ? 'read-strong'
          : harmful
            ? 'read-check'
            : 'read-visible';
      return {
        formation: item.job.formation,
        style: item.job.style,
        styleLabel: this.styleShort(item.job.style),
        seedStart: summary.seedStart,
        seedEnd: summary.seedEnd,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgCentralShotsFor: summary.avgCentralShotsFor,
        wideShare,
        deltaXgFor,
        deltaWideShotsFor,
        deltaWideShare,
        read,
        className,
      };
    });
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
      this.snackBar.open('No hay partidos completados para armar la batería.', 'OK', { duration: 3000 });
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
        this.markReplayAnalysisReady(`Tablero batería listo: ${partialRows.filter(Boolean).length} lecturas (${this.scenarioBatteryGroupLabel(scenarioGroup)}, ${matches.length} partidos x local/visitante).`);
        this.snackBar.open(`Tablero batería completo: ${partialRows.filter(Boolean).length} lecturas (${this.scenarioBatteryGroupLabel(scenarioGroup)}).`, 'OK', { duration: 3500 });
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
    this.analysisReadyMessage.set(
      `${label} calculando Panel E (${seedCount} seeds). Mismo partido, mismo seed base; esperando resultados multi-seed...`
    );
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
          `${label} listo (${safeRows.length} escenarios x ${seedCount} seeds).`,
          'OK',
          { duration: 3500 }
        );
        if (safeRows.length > 0) {
          this.markReplayAnalysisReady(readyMessage);
        } else {
          this.analysisReadyMessage.set(
            `${label} no devolvió escenarios para Panel E. Verificá que el partido siga seleccionado y que el grupo tenga escenarios.`
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
          `${result.message}. Run Matriz escenarios to measure m60-offensive-upgrade-sub.`,
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
          `${result.message}. Run Matriz escenarios again for baseline squad.`,
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
          `${result.message}. Run Matriz escenarios to measure m60-defensive-downgrade-sub.`,
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
          `${result.message}. Run Matriz escenarios again for baseline squad.`,
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
  onPrepareObjectiveContrastLab(): void {
    this.mutationInFlight.set(true);
    this.harness.prepareObjectiveContrastLab().subscribe({
      next: (result) => {
        this.handleLabMutationSuccess();
        this.snackBar.open(
          `${result.message}. Run Smoke completo de cambios to compare Objetivo DT, Mejor ataque and Mejor cierre.`,
          'OK',
          { duration: 7000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to prepare objective contrast lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  }
  onRestoreObjectiveContrastLab(): void {
    this.mutationInFlight.set(true);
    this.harness.restoreObjectiveContrastLab().subscribe({
      next: (result) => {
        this.handleLabMutationSuccess();
        this.snackBar.open(
          `${result.message}. Run Smoke completo de cambios again for baseline objective reads.`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to restore objective contrast lab'),
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
    this.analysisReadyMessage.set(`Smoke completo de cambios corriendo: natural + stress, ${seedCount} seeds por cambio...`);
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
          this.fmtError(err, 'Smoke completo de cambios falló antes de generar Panel E')
        );
        this.snackBar.open(this.fmtError(err, 'No se pudo correr smoke completo de cambios'), 'OK', { duration: 5000 });
        this.refreshLineupContext();
      },
      complete: () => {
        this.mutationInFlight.set(false);
        const count = this.playerSwapBatterySummaries().length;
        this.snackBar.open(
          count > 0 ? `Smoke completo de cambios listo: ${count} swaps medidos.` : 'Smoke completo de cambios listo con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        this.markReplayAnalysisReady('Smoke completo de cambios listo en Panel E.');
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
        ? `Panel E preparado para ${matchName}. Corre un smoke/matriz para generar una lectura nueva.`
        : `Panel E preparado para ${matchName}. Controlar quedó en Local; podés correr smokes multi-seed para este partido.`
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
        this.squadHealthSummary.set(snapshot?.squadHealthSummary ?? null);
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
    return getScenarioBatteryProgressText(completed, total, availableMatches, targetMatches, nextJob);
  }
  private scenarioBatteryScenarioCountEstimate(group: 'ALL' | 'OFFENSE' | 'DEFENSE' | 'OPPONENT'): number {
    return getScenarioBatteryScenarioCountEstimate(group);
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
            `Fecha ${roundNumber} completada (${completed}/${expectedMatchCount}). Tablero batería ya tiene más muestra.`,
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
   * Builds a harness match row from a career fixture.
   *
   * Team names are preferred when hydrated by the backend; IDs remain as a
   * defensive fallback so the row is never blank.
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
   * like Matriz formaciones, that transient null could collapse controls and make
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
        label: `${player.name} (${player.position}) · ${slotByPlayer.get(player.playerId) ?? 'slot'}`,
      }));
    const benchOptions = squad
      .filter((player) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
      .map((player) => ({
        playerId: player.sessionPlayerId,
        playerName: player.name,
        position: player.position,
        score: player.attack + player.technique + player.speed,
        label: `${player.name} (${player.position}) · atk ${player.attack} · tech ${player.technique} · pace ${player.speed}`,
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

