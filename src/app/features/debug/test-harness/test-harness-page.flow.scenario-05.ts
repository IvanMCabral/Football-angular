import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessScenarioSummaryReadClass(ctx: any, row: any): any {
    if (ctx.scenarioSummaryIsFormationNoop(row)) return 'read-noise';
    const level = ctx.scenarioSummaryReadLevel(row);
    if (level === 'review') return 'read-check';
    if (level === 'strong') return 'read-strong';
    if (level === 'visible') return 'read-visible';
    if (level === 'small') return 'read-stable';
    return 'delta-neutral';
  
}

export function runTestHarnessScenarioSummaryReadLevel(ctx: any, row: any): any {
    if (ctx.scenarioSummaryIsFormationNoop(row)) return 'noise';
    const score = ctx.scenarioSummaryImpactScore(row);
    const check = ctx.scenarioSummaryNeedsReview(row);
    if (check) return 'review';
    if (score >= 3.0) return 'strong';
    if (score >= 1.35) return 'visible';
    if (ctx.scenarioSummaryCoherentSubstitutionSignal(row)) return 'small';
    if (score >= 0.65) return 'small';
    return 'noise';
  
}

export function runTestHarnessScenarioSummaryReadReason(ctx: any, row: any): any {
    const parts = [
      `impact ${ctx.scenarioSummaryImpactScore(row).toFixed(2)}`,
      `xG ${ctx.fmtDeltaNumber(row.avgUserXgDelta)}`,
      `xGA ${ctx.fmtDeltaNumber(row.avgOpponentXgDelta)}`,
      `shots ${ctx.fmtDeltaNumber(row.avgUserShotsDelta)}/${ctx.fmtDeltaNumber(row.avgOpponentShotsDelta)}`,
      `poss ${ctx.fmtDeltaNumber(row.avgUserPossessionDelta)}pp`,
    ];
    if (ctx.scenarioSummaryNeedsReview(row)) {
      parts.unshift('Opposite/noisy sign for labelled substitution');
    }
    return parts.join(' ? ');
  
}

export function runTestHarnessScenarioSummaryReadSeverity(ctx: any, row: any): any {
    const level = ctx.scenarioSummaryReadLevel(row);
    if (level === 'review') return 5;
    if (level === 'strong') return 4;
    if (level === 'visible') return 3;
    if (level === 'small') return 2;
    return 1;
  
}

export function runTestHarnessScenarioSummaryRecommendation(ctx: any, row: any): any {
    return getScenarioSummaryRecommendationFromOutcome(
      ctx.scenarioSummaryIsFormationNoop(row),
      ctx.scenarioSummaryReadLevel(row),
      ctx.scenarioSummaryOutcome(row),
      ctx.scenarioSummaryCoachReadPrefix(row)
    );
  
}

export function runTestHarnessScenarioSummaryRecommendationClass(ctx: any, row: any): any {
    return getScenarioSummaryRecommendationClass(ctx.scenarioSummaryRecommendation(row));
  
}

export function runTestHarnessScenarioSummaryUserChannelRead(ctx: any, row: any): any {
    return getScenarioSummaryUserChannelRead(row);
  
}

export function runTestHarnessScenarioTwoWayScore(ctx: any, row: any): any {
    return getScenarioTwoWayScore(row);
  
}

export function runTestHarnessScenarioXgAgainst(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.awayXg : row.homeXg;
  
}

export function runTestHarnessScenarioXgDiff(ctx: any, row: any): any {
    const baseline = ctx.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return ctx.scenarioXgFor(row) - ctx.scenarioXgFor(baseline);
  
}

export function runTestHarnessScenarioXgFor(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.homeXg : row.awayXg;
  
}

export function runTestHarnessScenarioZoneDiff(ctx: any, row: any): any {
    const baseline = ctx.scenarioBaseline();
    if (!baseline || row === baseline) {
      return { central: 0, wide: 0, long: 0 };
    }
    const rowZones = ctx.scenarioZonesFor(row);
    const baselineZones = ctx.scenarioZonesFor(baseline);
    return {
      central: rowZones.central - baselineZones.central,
      wide: rowZones.wide - baselineZones.wide,
      long: rowZones.long - baselineZones.long,
    };
  
}

export function runTestHarnessScenarioZonesAgainst(ctx: any, row: any): any {
    if (ctx.selectedUserTeamIsHome()) {
      return { central: row.awayCentralShots, wide: row.awayWideShots, long: row.awayLongShots };
    }
    return { central: row.homeCentralShots, wide: row.homeWideShots, long: row.homeLongShots };
  
}

export function runTestHarnessScenarioZonesFor(ctx: any, row: any): any {
    if (ctx.selectedUserTeamIsHome()) {
      return { central: row.homeCentralShots, wide: row.homeWideShots, long: row.homeLongShots };
    }
    return { central: row.awayCentralShots, wide: row.awayWideShots, long: row.awayLongShots };
  
}

export function runTestHarnessSelectedStyleLabel(ctx: any): any {
    return ctx.teamStyleOptions.find((o: any) => o.value === ctx.selectedStyleModel)?.label ?? ctx.selectedStyleModel;
  
}

export function runTestHarnessSetScenarioSummaryReadFilter(ctx: any, value: any): any {
    const allowed: ScenarioSummaryReadFilter[] = ['all', 'actionable', 'review', 'strong', 'visible', 'small', 'noise'];
    ctx.scenarioSummaryReadFilter.set(
      allowed.includes(value as ScenarioSummaryReadFilter) ? (value as ScenarioSummaryReadFilter) : 'all'
    );
  
}

export function runTestHarnessSetScenarioSummarySortMode(ctx: any, value: any): any {
    const allowed: ScenarioSummarySortMode[] = ['default', 'read-desc', 'impact-desc', 'xg-desc'];
    ctx.scenarioSummarySortMode.set(
      allowed.includes(value as ScenarioSummarySortMode) ? (value as ScenarioSummarySortMode) : 'read-desc'
    );
  
}

export function runTestHarnessSideMirrorRealRead(ctx: any, verdict: any, formation: any, weakLeftRightEdge: any, weakRightLeftEdge: any, width: any, wingback: any): any {
    return getSideMirrorRealRead(verdict, formation, weakLeftRightEdge, weakRightLeftEdge, width, wingback);
  
}

export function runTestHarnessSideMirrorVerdictClass(ctx: any, row: any): any {
    return ctx.sideMirrorVerdictLabelClass(row.verdict);
  
}

export function runTestHarnessSideMirrorVerdictLabelClass(ctx: any, verdict: any): any {
    if (verdict === 'OK') return 'read-strong';
    if (verdict === 'Parcial') return 'read-visible';
    return 'read-check';
  
}

export function runTestHarnessSummaryActionLabel(ctx: any, row: any): any {
    return getScenarioSummaryActionLabel(row, ctx.teamStyleOptions);
  
}

export function runTestHarnessToBackFiveContextSmokeSummary(ctx: any, rows: any): any {
    if (rows.length === 0) return null;
    const count = (selector: (row: BackFiveContextSmokeRow) => string, formation: string) =>
      rows.filter((row: any) => selector(row) === formation).length;
    const reviewRows = rows.filter((row: any) => row.bestXgDiff < -0.25 || row.read.toLowerCase().includes('revisar'));
    const review = reviewRows.length;
    const reviewDetails = reviewRows.slice(0, 4).map((row: any) => {
      const sideLabel = row.controlledSide === 'HOME' ? 'local' : 'visitante';
      const reason = row.bestXgDiff < -0.25
        ? `mejor ${row.bestPlan} sigue ${ctx.signed(row.bestXgDiff)}`
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

export function runTestHarnessTrackByBackFiveContextSmokeRow(ctx: any, _index: any, row: any): any {
    return `${row.matchId}-${row.controlledSide}`;
  
}

export function runTestHarnessTrackByBackFiveFamilyLabRow(ctx: any, _index: any, row: any): any {
    return row.key;
  
}

export function runTestHarnessTrackByBackFiveTransitionLabRow(ctx: any, _index: any, row: any): any {
    return row.variant;
  
}

export function runTestHarnessTrackByLowBlockLabRow(ctx: any, _index: any, row: any): any {
    return row.variant;
  
}

export function runTestHarnessTrackByScenarioMatrix(ctx: any, _index: any, row: any): any {
    return row.scenario;
  
}

export function runTestHarnessTrackByScenarioMatrixSummary(ctx: any, _index: any, row: any): any {
    return row.scenario;
  
}

export function runTestHarnessTrackBySideMirrorDecisionRow(ctx: any, _index: any, row: any): any {
    return row.formation;
  
}

export function runTestHarnessTrackBySideMirrorSmokeRow(ctx: any, _index: any, row: any): any {
    return row.formation;
  
}

export function runTestHarnessTrackByWingbackLabRow(ctx: any, _index: any, row: any): any {
    return row.formation;
  
}

export function readTestHarnessWingbackLabRows(ctx: any): any {
    return ctx.sideMirrorSmokeRows()
      .filter((row: any) => row.wingbackRead !== 'Sin LWB/RWB')
      .map((row: any) => {
        const expectedEdgeAvg = ctx.roundTo((row.weakLeftRightEdge + row.weakRightLeftEdge) / 2, 3);
        const expectedEdgeMin = ctx.roundTo(Math.min(row.weakLeftRightEdge, row.weakRightLeftEdge), 3);
        const sideGap = ctx.roundTo(Math.abs(row.weakLeftRightEdge - row.weakRightLeftEdge), 3);
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
      .sort((a: any, b: any) => {
        const aLow = a.wingbackRead.includes('bajos') ? 1 : 0;
        const bLow = b.wingbackRead.includes('bajos') ? 1 : 0;
        return aLow - bLow || b.expectedEdgeAvg - a.expectedEdgeAvg || a.formation.localeCompare(b.formation);
      });
}

export function readTestHarnessDisplayedScenarioMatrixSummaryRows(ctx: any): any {
    const filter = ctx.scenarioSummaryReadFilter();
    const sort = ctx.scenarioSummarySortMode();
    const rows = ctx.scenarioMatrixSummaryResults()
      .filter((row: any) => {
        const level = ctx.scenarioSummaryReadLevel(row);
        if (filter === 'all') return true;
        if (filter === 'actionable') return level === 'review' || level === 'strong' || level === 'visible';
        return level === filter;
      })
      .map((row: any, index: any) => ({ row, index }));
    if (sort !== 'default') {
      rows.sort((a: any, b: any) => {
        if (sort === 'read-desc') {
          return ctx.scenarioSummaryReadSeverity(b.row) - ctx.scenarioSummaryReadSeverity(a.row) || a.index - b.index;
        }
        if (sort === 'impact-desc') {
          return ctx.scenarioSummaryImpactScore(b.row) - ctx.scenarioSummaryImpactScore(a.row) || a.index - b.index;
        }
        return Math.abs(b.row.avgUserXgDelta) - Math.abs(a.row.avgUserXgDelta) || a.index - b.index;
      });
    }
    return rows.map((item: any) => item.row);
  
}

export function readTestHarnessScenarioScoutingNotes(ctx: any): any {
    const rows = ctx.scenarioMatrixSummaryResults()
      .filter((row: any) => !row.scenario.includes('noop') && !row.scenario.startsWith('base-'));
    if (rows.length === 0) {
      return [];
    }
    const notes: ScenarioScoutingNote[] = [];
    const channelCandidates = rows
      .filter((row: any) => ['m45-central', 'm45-wide', 'm45-left', 'm45-right'].includes(row.scenario))
      .filter((row: any) => row.avgUserXgDelta >= 0.06 && row.avgOpponentXgDelta <= 0.14)
      .sort((a: any, b: any) => b.avgUserXgDelta - a.avgUserXgDelta);
    const channelAttack = channelCandidates[0];
    if (channelAttack) {
      const runnerUp = channelCandidates[1];
      const runnerUpDelta = runnerUp ? channelAttack.avgUserXgDelta - runnerUp.avgUserXgDelta : 0;
      const runnerUpText = runnerUp
        ? Math.abs(runnerUpDelta) < 0.005
          ? ` Queda parejo con ${ctx.summaryActionLabel(runnerUp)}; conviene mirar xGA y zonas.`
          : ` Supera a ${ctx.summaryActionLabel(runnerUp)} por ${ctx.fmtDeltaNumber(runnerUpDelta)} xG.`
        : '';
      notes.push({
        title: 'Canal recomendado',
        body: `${ctx.summaryActionLabel(channelAttack)}: ${ctx.scenarioSummaryUserChannelRead(channelAttack)} (${ctx.fmtDeltaNumber(channelAttack.avgUserXgDelta)} xG, xGA ${ctx.fmtDeltaNumber(channelAttack.avgOpponentXgDelta)}).${runnerUpText}`,
        className: 'read-visible',
      });
    }
    const shapeAttack = rows
      .filter((row: any) => row.scenario.startsWith('m45-shape-'))
      .filter((row: any) => row.avgUserXgDelta >= 0.08 && row.avgOpponentXgDelta <= 0.12)
      .sort((a: any, b: any) => b.avgUserXgDelta - a.avgUserXgDelta)[0];
    if (shapeAttack && (!channelAttack || shapeAttack.avgUserXgDelta >= channelAttack.avgUserXgDelta + 0.04)) {
      const channelComparison = channelAttack
        ? ` Mejora al canal puro por ${ctx.fmtDeltaNumber(shapeAttack.avgUserXgDelta - channelAttack.avgUserXgDelta)} xG.`
        : '';
      notes.push({
        title: 'Mejor ajuste de forma',
        body: `${ctx.summaryActionLabel(shapeAttack)}: ${ctx.scenarioSummaryUserChannelRead(shapeAttack)} (${ctx.fmtDeltaNumber(shapeAttack.avgUserXgDelta)} xG, xGA ${ctx.fmtDeltaNumber(shapeAttack.avgOpponentXgDelta)}).${channelComparison}`,
        className: 'read-visible',
      });
    }
    const bestProtection = rows
      .filter((row: any) => row.avgOpponentXgDelta <= -0.06 || ctx.scenarioOpponentMinChannelXgDelta(row) <= -0.08)
      .filter((row: any) => ctx.scenarioOpponentMaxChannelXgDelta(row) < 0.10)
      .sort((a: any, b: any) => Math.min(a.avgOpponentXgDelta, ctx.scenarioOpponentMinChannelXgDelta(a))
        - Math.min(b.avgOpponentXgDelta, ctx.scenarioOpponentMinChannelXgDelta(b)))[0];
    if (bestProtection) {
      const attackCost = bestProtection.avgUserXgDelta < -0.04
        ? ` Coste ofensivo ${ctx.fmtDeltaNumber(bestProtection.avgUserXgDelta)} xG.`
        : bestProtection.avgUserXgDelta > 0.04
          ? ` Ademas suma ${ctx.fmtDeltaNumber(bestProtection.avgUserXgDelta)} xG.`
          : '';
      notes.push({
        title: 'Mejor protección',
        body: `${ctx.summaryActionLabel(bestProtection)}: ${ctx.scenarioSummaryOpponentChannelRead(bestProtection)} (xGA ${ctx.fmtDeltaNumber(bestProtection.avgOpponentXgDelta)}).${attackCost}`,
        className: 'read-stable',
      });
    }
    const biggestRisk = rows
      .filter((row: any) => ctx.scenarioOpponentMaxChannelXgDelta(row) >= 0.10 || row.avgOpponentXgDelta >= 0.10)
      .sort((a: any, b: any) => Math.max(b.avgOpponentXgDelta, ctx.scenarioOpponentMaxChannelXgDelta(b))
        - Math.max(a.avgOpponentXgDelta, ctx.scenarioOpponentMaxChannelXgDelta(a)))[0];
    if (biggestRisk) {
      notes.push({
        title: 'Cuidado',
        body: `${ctx.summaryActionLabel(biggestRisk)} abre riesgo: ${ctx.scenarioOpponentRiskRead(biggestRisk)} (xGA ${ctx.fmtDeltaNumber(biggestRisk.avgOpponentXgDelta)}).`,
        className: 'read-check',
      });
    }
    return notes.slice(0, 4);
  
}

export function readTestHarnessSideMirrorDecisionRows(ctx: any): any {
    const realRows = ctx.realSideMirrorRows();
    const syntheticRows = ctx.syntheticSideMirrorRows();
    if (realRows.length === 0 || syntheticRows.length === 0) return [];
    const realByFormation = new Map<string, any>(realRows.map((row: any) => [row.formation, row]));
    return syntheticRows
      .map((synthetic: any) => {
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
        const width = ctx.formationWidthRead(synthetic.formation);
        return {
          formation: synthetic.formation,
          syntheticVerdict: synthetic.verdict,
          realVerdict: real.verdict,
          syntheticEdges: `R ${ctx.fmtDeltaNumber(synthetic.weakLeftRightEdge)} / L ${ctx.fmtDeltaNumber(synthetic.weakRightLeftEdge)}`,
          realEdges: `R ${ctx.fmtDeltaNumber(real.weakLeftRightEdge)} / L ${ctx.fmtDeltaNumber(real.weakRightLeftEdge)}`,
          widthRead: width.read,
          widthClass: width.className,
          decision,
          className,
        };
      })
      .filter((row: any): row is SideMirrorDecisionRow => row !== null)
      .sort((a: any, b: any) => {
        const order = (row: SideMirrorDecisionRow) =>
          row.syntheticVerdict === 'OK' && row.realVerdict !== 'OK' ? 0
            : row.syntheticVerdict !== 'OK' ? 1
              : 2;
        return order(a) - order(b) || a.formation.localeCompare(b.formation);
      });
  
}

export function readTestHarnessSideMirrorDecisionSummary(ctx: any): any {
    const rows = ctx.sideMirrorDecisionRows();
    if (rows.length === 0) return null;
    const engineHealthyRealBiased = rows.filter((row: any) =>
      row.syntheticVerdict === 'OK' && row.realVerdict !== 'OK'
    ).length;
    const engineReview = rows.filter((row: any) => row.syntheticVerdict !== 'OK').length;
    const fullyHealthy = rows.filter((row: any) =>
      row.syntheticVerdict === 'OK' && row.realVerdict === 'OK'
    ).length;
    const focusRows = rows
      .filter((row: any) => row.syntheticVerdict !== 'OK' || row.realVerdict !== 'OK')
      .slice(0, 5)
      .map((row: any) => row.formation);
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
  
}
