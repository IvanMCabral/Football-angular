import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRunSideMirrorSmoke(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Elegí un partido de tu equipo para preparar labs del rival.', 'OK', { duration: 4500 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    ctx.sideMirrorSmokeRows.set([]);
    ctx.sideMirrorSmokeMode.set('real');
    ctx.analysisReadyMessage.set(`Smoke espejo bandas corriendo: ${seedCount} seeds por formación y por lado...`);
    ctx.mutationInFlight.set(true);
    ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
      switchMap(() => ctx.restoreSideMirrorLabs(matchId)),
      switchMap(() => ctx.harness.prepareOpponentWeakLeftDefenderLab(matchId)),
      switchMap(() => ctx.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, ctx.controlledTeamSideModel)),
      switchMap((weakLeftRows) =>
        ctx.harness.restoreOpponentWeakLeftDefenderLab(matchId).pipe(
          catchError(() => of(null)),
          map(() => weakLeftRows ?? [])
        )
      ),
      switchMap((weakLeftRows) =>
        ctx.harness.prepareOpponentWeakRightDefenderLab(matchId).pipe(
          switchMap(() => ctx.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, ctx.controlledTeamSideModel)),
          switchMap((weakRightRows) =>
            ctx.harness.restoreOpponentWeakRightDefenderLab(matchId).pipe(
              catchError(() => of(null)),
              map(() => ({ weakLeftRows, weakRightRows: weakRightRows ?? [] }))
            )
          )
        )
      ),
      switchMap((result) =>
        ctx.restoreSideMirrorLabs(matchId).pipe(
          catchError(() => of(null)),
          map(() => result)
        )
      )
    ).subscribe({
      next: ({ weakLeftRows, weakRightRows }: any) => {
        const rows = ctx.buildSideMirrorSmokeRows(weakLeftRows, weakRightRows);
        ctx.sideMirrorSmokeRows.set(rows);
        ctx.realSideMirrorRows.set(rows);
        ctx.markReplayAnalysisReady(`Smoke espejo bandas listo: ${rows.length} formaciones comparadas.`);
        ctx.snackBar.open(`Smoke espejo bandas listo (${rows.length} formaciones).`, 'OK', { duration: 3500 });
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.restoreSideMirrorLabs(matchId).subscribe({ error: () => undefined });
        ctx.analysisReadyMessage.set(`Smoke espejo bandas falló: ${ctx.fmtError(err, 'Failed to run side mirror smoke')}`);
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run side mirror smoke'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
      },
    });
  
}

export function runTestHarnessOnRunSideMirrorSyntheticLab(ctx: any): any {
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    ctx.sideMirrorSmokeRows.set([]);
    ctx.sideMirrorSmokeMode.set('synthetic');
    ctx.analysisReadyMessage.set(`Lab espejo sintetico corriendo: ${seedCount} seeds por formación y por lado...`);
    ctx.mutationInFlight.set(true);
    ctx.harness.runSideMirrorSyntheticLab(seedStart, seedCount).subscribe({
      next: (rows: any) => {
        const mappedRows = ctx.mapSyntheticSideMirrorRows(rows ?? []);
        ctx.sideMirrorSmokeRows.set(mappedRows);
        ctx.syntheticSideMirrorRows.set(mappedRows);
        ctx.markReplayAnalysisReady(`Lab espejo sintetico listo: ${(rows ?? []).length} formaciones comparadas.`);
        ctx.snackBar.open(`Lab espejo sintético listo (${(rows ?? []).length} formaciones).`, 'OK', { duration: 3500 });
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(`Lab espejo sintetico falló: ${ctx.fmtError(err, 'Failed to run synthetic mirror lab')}`);
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run synthetic mirror lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
      },
    });
  
}

export function runTestHarnessProfessionalQaActionLabel(ctx: any, check: any): any {
    return getProfessionalQaActionLabel(check);
  
}

export function runTestHarnessProfessionalQaCheckLabel(ctx: any, check: any): any {
    return getProfessionalQaCheckLabel(check);
  
}

export function runTestHarnessProfessionalQaTextLabel(ctx: any, text: any): any {
    return getProfessionalQaTextLabel(text);
  
}

export function runTestHarnessProfessionalQaVerdictLabel(ctx: any, verdict: any): any {
    return getProfessionalQaVerdictLabel(verdict);
  
}

export function runTestHarnessRestoreSideMirrorLabs(ctx: any, matchId: any): any {
    return ctx.harness.restoreOpponentWeakLeftDefenderLab(matchId).pipe(
      catchError(() => of(null)),
      switchMap(() => ctx.harness.restoreOpponentWeakRightDefenderLab(matchId).pipe(catchError(() => of(null))))
    );
  
}

export function runTestHarnessResultPerspectiveLabel(ctx: any): any {
    const m = ctx.selectedMatch();
    if (!m) {
      return 'A favor/en contra se activa al seleccionar un partido.';
    }
    const side = ctx.effectiveControlledSide();
    const controlled = side === 'AWAY' ? m.awayTeamName : m.homeTeamName;
    const rival = side === 'AWAY' ? m.homeTeamName : m.awayTeamName;
    return `For = ${controlled}; Ag = ${rival}`;
  
}

export function runTestHarnessRunLabMutation(ctx: any, action: any, errorMessage: any, successHint: any): any {
    ctx.mutationInFlight.set(true);
    action().subscribe({
      next: (result: any) => {
        ctx.handleLabMutationSuccess();
        ctx.snackBar.open(
          `${result.message}. ${successHint}`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, errorMessage),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessScenarioActionKey(ctx: any, row: any): any {
    return getScenarioActionKey(row);
  
}

export function runTestHarnessScenarioActionLabel(ctx: any, actionDetail: any): any {
    return getScenarioActionLabel(actionDetail, ctx.teamStyleOptions);
  
}

export function runTestHarnessScenarioAttackCandidateIsCoachWorthy(ctx: any, row: any): any {
    return getScenarioAttackCandidateIsCoachWorthy(row);
  
}

export function runTestHarnessScenarioAttackPlanScore(ctx: any, row: any): any {
    return getScenarioAttackPlanScore(row);
  
}

export function runTestHarnessScenarioBaseline(ctx: any): any {
    return ctx.scenarioMatrixResults()[0] ?? null;
  
}

export function runTestHarnessScenarioDecisionCardFromRow(ctx: any, title: any, row: any, className: any, detail: any): any {
    return {
      title,
      label: ctx.summaryActionLabel(row),
      metrics: ctx.scenarioDecisionMetrics(title, row),
      detail,
      className,
    };
  
}

export function runTestHarnessScenarioDecisionConfidence(ctx: any, row: any): any {
    return getScenarioDecisionConfidenceFromReadLevel(ctx.scenarioSummaryReadLevel(row));
  
}

export function runTestHarnessScenarioDecisionMetrics(ctx: any, title: any, row: any): any {
    return getScenarioDecisionMetrics(
      title,
      row,
      ctx.isOpponentScenarioRow(row),
      ctx.scenarioOpponentMaxChannelXgDelta(row),
      ctx.scenarioDecisionConfidence(row),
      (value) => ctx.fmtDeltaNumber(value)
    );
  
}

export function runTestHarnessScenarioGoalDiff(ctx: any, row: any): any {
    const baseline = ctx.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return ctx.goalDifference(row) - ctx.goalDifference(baseline);
  
}

export function runTestHarnessScenarioGoalsAgainst(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.awayGoals : row.homeGoals;
  
}

export function runTestHarnessScenarioGoalsFor(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.homeGoals : row.awayGoals;
  
}

export function runTestHarnessScenarioOpponentMaxChannelXgDelta(ctx: any, row: any): any {
    return Math.max(
      row.avgOpponentCentralXgDelta,
      row.avgOpponentLeftWideXgDelta,
      row.avgOpponentRightWideXgDelta,
    );
  
}

export function runTestHarnessScenarioOpponentMinChannelXgDelta(ctx: any, row: any): any {
    return Math.min(
      row.avgOpponentCentralXgDelta,
      row.avgOpponentLeftWideXgDelta,
      row.avgOpponentRightWideXgDelta,
    );
  
}

export function runTestHarnessScenarioOpponentProtectionRead(ctx: any, row: any): any {
    return getScenarioOpponentProtectionRead(row, (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessScenarioOpponentRiskRead(ctx: any, row: any): any {
    return getScenarioOpponentRiskRead(row, (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessScenarioPossessionAgainst(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.awayPossession : row.homePossession;
  
}

export function runTestHarnessScenarioPossessionDiff(ctx: any, row: any): any {
    const baseline = ctx.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return ctx.scenarioPossessionFor(row) - ctx.scenarioPossessionFor(baseline);
  
}

export function runTestHarnessScenarioPossessionFor(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.homePossession : row.awayPossession;
  
}

export function runTestHarnessScenarioProtectionCandidateIsCoachWorthy(ctx: any, row: any): any {
    return getScenarioProtectionCandidateIsCoachWorthy(row, ctx.summaryActionLabel(row));
  
}

export function runTestHarnessScenarioShapeActionLabel(ctx: any, actionDetail: any): any {
    return getScenarioShapeActionLabel(actionDetail);
  
}

export function runTestHarnessScenarioShotDiff(ctx: any, row: any): any {
    const baseline = ctx.scenarioBaseline();
    if (!baseline || row === baseline) return 0;
    return ctx.scenarioShotsFor(row) - ctx.scenarioShotsFor(baseline);
  
}

export function runTestHarnessScenarioShotsAgainst(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.awayShots : row.homeShots;
  
}

export function runTestHarnessScenarioShotsFor(ctx: any, row: any): any {
    return ctx.selectedUserTeamIsHome() ? row.homeShots : row.awayShots;
  
}

export function runTestHarnessScenarioSummaryAttackGainScore(ctx: any, row: any): any {
    return getScenarioSummaryAttackGainScore(row);
  
}

export function runTestHarnessScenarioSummaryAttackLossScore(ctx: any, row: any): any {
    return getScenarioSummaryAttackLossScore(row);
  
}

export function runTestHarnessScenarioSummaryBaseFormation(ctx: any): any {
    const row = ctx.scenarioMatrixSummaryResults()
      .find((item: any) => !!item.baselineFormation);
    return row?.baselineFormation || '';
  
}

export function runTestHarnessScenarioSummaryCoachRead(ctx: any, row: any): any {
    return getScenarioSummaryCoachRead(
      row,
      ctx.scenarioSummaryIsFormationNoop(row),
      ctx.scenarioSummaryReadLevel(row),
      ctx.scenarioSummaryUserChannelRead(row),
      ctx.scenarioSummaryOpponentChannelRead(row),
      ctx.scenarioSummaryCoachReadPrefix(row)
    );
  
}

export function runTestHarnessScenarioSummaryCoachReadPrefix(ctx: any, row: any): any {
    return getScenarioSummaryCoachReadPrefix(row);
  
}

export function runTestHarnessScenarioSummaryDefensiveGainScore(ctx: any, row: any): any {
    return getScenarioSummaryDefensiveGainScore(row);
  
}

export function runTestHarnessScenarioSummaryDefensiveRiskScore(ctx: any, row: any): any {
    return getScenarioSummaryDefensiveRiskScore(row);
  
}

export function runTestHarnessScenarioSummaryExportRow(ctx: any, row: any): any {
    return {
      read: ctx.scenarioSummaryRead(row),
      impactScore: ctx.scenarioSummaryImpactScore(row).toFixed(3),
      readReason: ctx.scenarioSummaryReadReason(row),
      coachRead: ctx.scenarioSummaryCoachRead(row),
      coachReadDetail: ctx.scenarioSummaryCoachReadDetail(row),
      recommendation: ctx.scenarioSummaryRecommendation(row),
      recommendationDetail: ctx.scenarioSummaryRecommendationDetail(row),
      outcome: ctx.scenarioSummaryOutcome(row),
      outcomeReason: ctx.scenarioSummaryOutcomeReason(row),
      attackGainScore: ctx.scenarioSummaryAttackGainScore(row).toFixed(3),
      attackLossScore: ctx.scenarioSummaryAttackLossScore(row).toFixed(3),
      defensiveGainScore: ctx.scenarioSummaryDefensiveGainScore(row).toFixed(3),
      defensiveRiskScore: ctx.scenarioSummaryDefensiveRiskScore(row).toFixed(3),
      scenario: row.scenario,
      baselineScenario: row.baselineScenario,
      actionType: row.actionType,
      actionDetail: row.actionDetail,
      seedStart: ctx.summarySeedStart(),
      seedEnd: ctx.summarySeedEnd(),
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

export function runTestHarnessScenarioSummaryFormationHint(ctx: any, row: any): any {
    return getScenarioSummaryFormationHint(row);
  
}

export function runTestHarnessScenarioSummaryFormationLabel(ctx: any, row: any): any {
    return getScenarioSummaryFormationLabel(row);
  
}

export function runTestHarnessScenarioSummaryImpactScore(ctx: any, row: any): any {
    return getScenarioSummaryImpactScore(row);
  
}

export function runTestHarnessScenarioSummaryIsFormationNoop(ctx: any, row: any): any {
    return getScenarioSummaryIsFormationNoop(row);
  
}

export function runTestHarnessScenarioSummaryNeedsReview(ctx: any, row: any): any {
    return getScenarioSummaryNeedsReview(row);
  
}

export function runTestHarnessScenarioSummaryOpponentChannelRead(ctx: any, row: any): any {
    return getScenarioSummaryOpponentChannelRead(row);
  
}

export function runTestHarnessScenarioSummaryOutcome(ctx: any, row: any): any {
    return getScenarioSummaryOutcome(
      row,
      ctx.scenarioSummaryIsFormationNoop(row),
      ctx.scenarioSummaryReadLevel(row)
    );
  
}

export function runTestHarnessScenarioSummaryOutcomeClass(ctx: any, row: any): any {
    return getScenarioSummaryOutcomeClass(ctx.scenarioSummaryOutcome(row));
  
}

export function runTestHarnessScenarioSummaryOutcomeReason(ctx: any, row: any): any {
    return getScenarioSummaryOutcomeReason(
      row,
      ctx.scenarioSummaryIsFormationNoop(row),
      ctx.scenarioSummaryAttackGainScore(row),
      ctx.scenarioSummaryAttackLossScore(row),
      ctx.scenarioSummaryDefensiveGainScore(row),
      ctx.scenarioSummaryDefensiveRiskScore(row)
    );
  
}

export function runTestHarnessScenarioSummaryOutcomeSummary(ctx: any): any {
    return getScenarioSummaryOutcomeSummaryFromOutcomes(
      ctx.scenarioMatrixSummaryResults().map((row: any) => ctx.scenarioSummaryOutcome(row))
    );
  
}

export function runTestHarnessScenarioSummaryRead(ctx: any, row: any): any {
    if (ctx.scenarioSummaryIsFormationNoop(row)) return 'Baseline/no-op';
    const level = ctx.scenarioSummaryReadLevel(row);
    if (level === 'review') return 'Review';
    if (level === 'strong') return 'Strong';
    if (level === 'visible') return 'Visible';
    if (level === 'small') return 'Small signal';
    return 'Noise';
  
}
