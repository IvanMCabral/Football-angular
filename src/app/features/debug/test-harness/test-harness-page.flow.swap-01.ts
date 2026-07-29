import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessAutoBackendPlayerSwapCandidate(ctx: any): any {
    return {
      starterId: ctx.AUTO_PLAYER_SWAP_STARTER,
      starterName: 'Auto starter',
      starterPosition: 'AUTO',
      benchId: ctx.AUTO_PLAYER_SWAP_BENCH,
      benchName: 'Auto bench',
      benchPosition: 'AUTO',
      slotId: '',
    };
  
}

export function runTestHarnessBuildEstresPlayerSwapBatteryCandidates(ctx: any, starters: any, eligibleBench: any, slotByPlayer: any, limit: any): any {
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
          .filter((bench: any) => !usedBenchIds.has(bench.sessionPlayerId) && benchPredicate(bench, starter))
          .sort((a: any, b: any) => preferWorstBench
            ? ctx.playerSwapBenchScore(a) - ctx.playerSwapBenchScore(b)
            : ctx.playerSwapBenchScore(b) - ctx.playerSwapBenchScore(a));
        const bench = benchPool[0];
        if (!bench) continue;
        const key = `${starter.playerId}:${bench.sessionPlayerId}`;
        if (usedPairs.has(key)) continue;
        usedPairs.add(key);
        usedBenchIds.add(bench.sessionPlayerId);
        candidates.push(ctx.buildPlayerSwapCandidate(starter, bench, slotByPlayer, testCase));
        break;
      }
    };
    addCase(
      'Estres: atacante por defensor',
      (starter) => ctx.positionPixelLine(starter.position) === 'ATT',
      (bench) => ctx.positionPixelLine(bench.position) === 'DEF'
    );
    addCase(
      'Estres: defensor por atacante',
      (starter) => ctx.positionPixelLine(starter.position) === 'DEF',
      (bench) => ctx.positionPixelLine(bench.position) === 'ATT'
    );
    addCase(
      'Estres: medio por banda/ataque',
      (starter) => ctx.positionPixelLine(starter.position) === 'MID',
      (bench) => ctx.positionPixelLine(bench.position) === 'ATT'
    );
    addCase(
      'Estres: fuera de línea',
      () => true,
      (bench, starter) => ctx.positionPixelLine(bench.position) !== ctx.positionPixelLine(starter.position)
    );
    addCase(
      'Estres: menor OVR / encaje',
      () => true,
      (bench, starter) => ctx.sessionPlayerOverall(bench) <= starter.overall - 4,
      true
    );
    addCase(
      'Estres: upgrade OVR',
      () => true,
      (bench, starter) => ctx.sessionPlayerOverall(bench) >= starter.overall + 4
    );
    if (candidates.length >= limit) {
      return candidates.slice(0, limit);
    }
    return ctx.buildPlayerSwapBatteryCandidates(starters, eligibleBench, slotByPlayer, limit, 'out', candidates);
  
}

export function runTestHarnessBuildPlayerSwapBatteryCandidates(ctx: any, starters: any, eligibleBench: any, slotByPlayer: any, limit: any, mode: any, seedCandidates: any): any {
    const candidates = [...seedCandidates];
    const usedPairs = new Set(candidates.map((candidate) => `${candidate.starterId}:${candidate.benchId}`));
    const usedBenchIds = new Set(candidates.map((candidate) => candidate.benchId));
    for (const starter of starters) {
      const bench = ctx.pickBenchForBatteryMode(starter.position, eligibleBench, usedBenchIds, mode);
      if (!bench) continue;
      const key = `${starter.playerId}:${bench.sessionPlayerId}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      usedBenchIds.add(bench.sessionPlayerId);
      candidates.push(ctx.buildPlayerSwapCandidate(starter, bench, slotByPlayer, `Battery: ${mode}`));
      if (candidates.length >= limit) break;
    }
    return candidates;
  
}

export function runTestHarnessBuildPlayerSwapCandidate(ctx: any, starter: any, bench: any, slotByPlayer: any, testCase: any): any {
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

export function runTestHarnessBuildPlayerSwapPrecisionComparisonRows(ctx: any, quick: any, balanced: any): any {
    const balancedByKey = new Map<string, any>(balanced.map((row: any) => [ctx.playerSwapComparisonKey(row), row]));
    return quick
      .map((quickRow: any) => {
        const balancedRow = balancedByKey.get(ctx.playerSwapComparisonKey(quickRow));
        if (!balancedRow) return null;
        const stability = ctx.playerSwapPrecisionStability(quickRow, balancedRow);
        return {
          candidateKey: ctx.playerSwapComparisonKey(quickRow),
          starter: quickRow.baselinePlayer,
          bench: quickRow.swapPlayer,
          slotId: quickRow.slotId,
          fit: quickRow.swapFit,
          quick: quickRow,
          balanced: balancedRow,
          stability,
          stabilityClass: ctx.playerSwapPrecisionStabilityClass(stability),
        };
      })
      .filter((row: any): row is PlayerSwapPrecisionComparisonRow => !!row);
  
}

export function runTestHarnessBuildScenarioBatteryRow(ctx: any, match: any, controlledSide: any, scenarioGroup: any, seedStart: any, seedCount: any, rows: any): any {
    return buildScenarioBatteryRowUtils(match, controlledSide, scenarioGroup, seedStart, seedCount, rows, {
      buildDecisionCards: (summaryRows) => ctx.buildScenarioDecisionCards(summaryRows),
      coachContext: (targetMatch, side) => ctx.scenarioBatteryCoachContext(targetMatch, side),
      coachObjective: (targetMatch, side) => ctx.scenarioBatteryEffectiveCoachObjective(targetMatch, side),
      decision: (cards, objective) => ctx.scenarioBatteryDecision(cards, objective),
      review: (objective, decisionLabel, cards) => ctx.scenarioBatteryDecisionReview(objective, decisionLabel, cards),
    });
  
}

export function runTestHarnessClearPlayerSwapAnalysisResults(ctx: any): any {
    ctx.playerSwapMatrixSummary.set(null);
    ctx.substitutionWhatIfSummary.set(null);
    ctx.substitutionTimingMatrixRows.set([]);
    ctx.playerSwapBatterySummaries.set([]);
    ctx.playerSwapPrecisionComparisonRows.set([]);
  
}

export function runTestHarnessConfirmScenarioBatteryRow(ctx: any, row: any): any {
    ctx.selectedMatchId.set(row.matchId);
    ctx.controlledTeamSideModel = row.controlledSide;
    ctx.scenarioBatteryGroupModel = row.scenarioGroup;
    const match = ctx.findMatch(row.matchId);
    if (match) {
      ctx.selectedMatch.set(match);
    }
    ctx.harness.runScenarioMatrixSummary(row.matchId, row.seedStart, 20, row.scenarioGroup, row.controlledSide)
      .subscribe((rows: any) => {
        ctx.scenarioMatrixSummaryResults.set(rows || []);
      });
  
}

export function runTestHarnessCopyPlayerSwapBatteryJson(ctx: any): any {
    const payload = JSON.stringify({
      mode: ctx.playerSwapBatteryModeModel,
      summary: ctx.playerSwapBatterySummary(),
      rows: ctx.playerSwapBatterySummaries(),
    }, null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Batería cambio jugador JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyPlayerSwapBatteryReport(ctx: any): any {
    const payload = ctx.playerSwapBatteryMarkdownReport();
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Batería cambio jugador report copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyPlayerSwapMatrixJson(ctx: any): any {
    const payload = JSON.stringify(ctx.playerSwapMatrixSummary(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Matriz cambio jugador JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyScenarioBatteryJson(ctx: any): any {
    const payload = JSON.stringify(ctx.scenarioBatteryRows(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Scenario battery JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessDownloadPlayerSwapBatteryCsv(ctx: any): any {
    const rows = ctx.playerSwapBatterySummaries();
    if (rows.length === 0) {
      ctx.snackBar.open('Run Batería cambio jugador first.', 'OK', { duration: 2500 });
      return;
    }
    const exportRows = rows.map((row: any) => playerSwapMatrixExportRow(row));
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
    const lines = ctx.csvLines(header, exportRows);
    ctx.downloadCsv(lines, `player-swap-battery-${ctx.playerSwapBatteryPrecisionModel}-${rows[0].formation}-${rows[0].seedStart}-${rows[0].seedEnd}.csv`);
    ctx.snackBar.open(`Batería cambio jugador CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  
}

export function runTestHarnessDownloadPlayerSwapMatrixCsv(ctx: any): any {
    const row = ctx.playerSwapMatrixSummary();
    if (!row) {
      ctx.snackBar.open('Run Matriz cambio jugador first.', 'OK', { duration: 2500 });
      return;
    }
    const exportRow = playerSwapMatrixExportRow(row);
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
    const lines = ctx.csvLines(header, [exportRow]);
    ctx.downloadCsv(lines, `player-swap-${row.formation}-${row.slotId}-${row.seedStart}-${row.seedEnd}.csv`);
    ctx.snackBar.open('Matriz cambio jugador CSV exported.', 'OK', { duration: 2500 });
  
}

export function runTestHarnessDownloadScenarioBatteryCsv(ctx: any): any {
    const rows = ctx.scenarioBatteryRows().map((row: any) => ctx.scenarioBatteryExportRow(row));
    if (rows.length === 0) {
      ctx.snackBar.open('Run Tablero batería first.', 'OK', { duration: 2500 });
      return;
    }
    const header = [
      'match', 'controlledTeam', 'controlledSide', 'scenarioGroup', 'coachObjective', 'coachContext', 'coachContextDetail', 'review', 'reviewDetail', 'seedStart', 'seedCount', 'scenarioCount',
      'decision', 'decisionDetail',
      'plan', 'twoWay', 'attack', 'shape', 'protect', 'avoid', 'opponentThreat',
      'planDetail', 'twoWayDetail', 'attackDetail', 'shapeDetail', 'protectDetail', 'avoidDetail', 'opponentThreatDetail',
    ];
    const lines = ctx.csvLines(header, rows);
    ctx.downloadCsv(lines, `scenario-battery-${ctx.summarySeedStart()}-${ctx.summarySeedStart() + ctx.scenarioMatrixSmokeSeedCount() - 1}.csv`);
    ctx.snackBar.open(`Scenario battery CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  
}

export function runTestHarnessInferScenarioBatteryCoachObjective(ctx: any, match: any, controlledSide: any, minute: any): any {
    return inferScenarioBatteryCoachObjectiveUtils(match, controlledSide, minute);
  
}

export function runTestHarnessModalRecommendationCandidateScore(ctx: any, starter: any, bench: any, objective: any): any {
    const starterLine = ctx.positionPixelLine(starter.position);
    const benchLine = ctx.positionPixelLine(bench.position);
    const ratingDelta = ctx.sessionPlayerOverall(bench) - (starter.overall ?? 70);
    const sameLineBonus = starterLine === benchLine ? 3 : -2.5;
    if (objective === 'NEED_GOAL') {
      const starterProfile = ctx.playerSwapProfile(starter.position);
      const benchProfile = ctx.playerSwapProfile(bench.position);
      const profileBonus = starterProfile === benchProfile
        ? 4
        : starterLine === benchLine
          ? 2
          : -5;
      const defensiveBreakPenalty = starterLine === 'DEF' && benchLine === 'ATT' ? -8 : 0;
      return ctx.modalAttackIntent(bench.position) * 4
        + Math.max(0, ratingDelta) * 0.55
        + profileBonus
        + defensiveBreakPenalty;
    }
    if (objective === 'PROTECT_RESULT') {
      const starterProfile = ctx.playerSwapProfile(starter.position);
      const benchProfile = ctx.playerSwapProfile(bench.position);
      const profileBonus = benchLine === 'ATT'
        ? -4
        : benchProfile === 'WIDE'
          ? -1
          : starterProfile === benchProfile
            ? 4
            : starterLine === benchLine
              ? 1
              : -5;
      const protectionGain = ctx.modalProtectIntent(bench.position) - ctx.modalProtectIntent(starter.position);
      const defensiveStarterPenalty = starterLine === 'DEF' && starterProfile !== benchProfile
        ? -4
        : 0;
      const attackingBenchPenalty = benchLine === 'ATT'
        ? -4
        : benchProfile === 'WIDE'
          ? -1.5
          : 0;
      return protectionGain * 3
        + ctx.modalProtectIntent(bench.position) * 1.2
        + Math.max(0, ratingDelta) * 0.45
        + profileBonus
        + defensiveStarterPenalty
        + attackingBenchPenalty;
    }
    const starterProfile = ctx.playerSwapProfile(starter.position);
    const benchProfile = ctx.playerSwapProfile(bench.position);
    const profileBonus = starterProfile === benchProfile
      ? 8
      : starterLine === benchLine
        ? 1
        : -8;
    const aggressionSwing = Math.max(0, ctx.modalAttackIntent(bench.position) - ctx.modalAttackIntent(starter.position));
    const protectionLoss = Math.max(0, ctx.modalProtectIntent(starter.position) - ctx.modalProtectIntent(bench.position));
    return ratingDelta
      + profileBonus
      - aggressionSwing * 2.5
      - protectionLoss * 1.4
      + (starterLine === 'MID' && benchLine === 'MID' ? 2 : 0);
  
}

export function runTestHarnessModalRecommendationWhatIfIsSafe(ctx: any, row: any, objective: any): any {
    if (objective === 'NEED_GOAL') {
      return row.deltaXgFor > 0.001
        || row.deltaShotsFor > 0.01
        || (row.deltaXgFor >= -0.001 && row.deltaShotsFor >= -0.01 && row.deltaXgDiff >= 0.02);
    }
    if (objective === 'PROTECT_RESULT') {
      return ctx.modalProtectWhatIfIsSafe(row);
    }
    return Math.abs(row.deltaXgFor) >= 0.001
      || Math.abs(row.deltaXgAgainst) >= 0.001
      || Math.abs(row.deltaShotsFor) >= 0.01
      || Math.abs(row.deltaShotsAgainst) >= 0.01;
  
}

export function runTestHarnessModalRecommendationWhatIfScore(ctx: any, row: any, objective: any): any {
    if (objective === 'NEED_GOAL') {
      return row.deltaXgFor + row.deltaShotsFor * 0.04 - Math.max(0, row.deltaXgAgainst) * 0.25;
    }
    if (objective === 'PROTECT_RESULT') {
      return -row.deltaXgAgainst - row.deltaShotsAgainst * 0.035 + Math.max(0, row.deltaXgFor) * 0.25;
    }
    return row.deltaXgDiff + row.deltaShotsFor * 0.03 - row.deltaXgAgainst * 0.35;
  
}

export function runTestHarnessOnPlayerSwapBatteryPrecisionChange(ctx: any, value: any): any {
    const allowed: Array<typeof ctx.playerSwapBatteryPrecisionModel> = ['quick', 'balanced', 'reliable'];
    ctx.playerSwapBatteryPrecisionModel = allowed.includes(value as typeof ctx.playerSwapBatteryPrecisionModel)
      ? (value as typeof ctx.playerSwapBatteryPrecisionModel)
      : 'balanced';
    ctx.playerSwapSeedCountModel = ctx.playerSwapBatteryPrecisionSeedCount(ctx.playerSwapBatteryPrecisionModel);
  
}
