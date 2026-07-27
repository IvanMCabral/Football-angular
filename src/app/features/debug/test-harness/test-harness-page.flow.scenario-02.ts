import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessFormationSummaryOpponentChannel(ctx: any, row: any): any {
    const totalShots = row.avgCentralShotsAgainst + row.avgWideShotsAgainst + row.avgLongShotsAgainst;
    const centralShare = ctx.safeRatio(row.avgCentralShotsAgainst, totalShots);
    const wideShare = ctx.safeRatio(row.avgWideShotsAgainst, totalShots);
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

export function runTestHarnessHandleLabMutationSuccess(ctx: any): any {
    ctx.mutationInFlight.set(false);
    ctx.scenarioMatrixResults.set([]);
    ctx.scenarioMatrixSummaryResults.set([]);
    ctx.analysisReadyMessage.set(
      'Lab aplicado. El partido sigue seleccionado; corre el smoke/matriz otra vez para regenerar Panel E.'
    );
    ctx.refreshLineupContext();
    ctx.refreshDetailAfterMutation();
  
}

export function runTestHarnessIsDefensiveFallbackCompatiblePosition(ctx: any, position: any): any {
    return ['CB', 'DEF', 'CDM', 'LB', 'RB', 'LWB', 'RWB'].includes(String(position ?? '').toUpperCase());
  
}

export function runTestHarnessIsOpponentScenarioRow(ctx: any, row: any): any {
    return getScenarioSummaryIsOpponentRow(row);
  
}

export function runTestHarnessIsScenarioShapeAction(ctx: any, actionDetail: any): any {
    return getScenarioSummaryIsShapeAction(actionDetail);
  
}

export function runTestHarnessLowBlockLabClass(ctx: any, variant: any, deltaXgAgainst: any, deltaShotsAgainst: any): any {
    return getLowBlockLabClass(variant, deltaXgAgainst, deltaShotsAgainst);
  
}

export function runTestHarnessLowBlockLabRead(ctx: any, variant: any, deltaXgFor: any, deltaXgAgainst: any, deltaShotsAgainst: any, deltaPossessionFor: any): any {
    return getLowBlockLabRead(variant, deltaXgFor, deltaXgAgainst, deltaShotsAgainst, deltaPossessionFor);
  
}

export function runTestHarnessMapSyntheticSideMirrorRows(ctx: any, rows: any): any {
    return mapSyntheticSideMirrorRowsUtils(rows, ctx.formationPositionsByName());
  
}

export function runTestHarnessMatchStatusLabel(ctx: any, status: any): any {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'COMPLETED') return 'Completado';
    if (normalized === 'PENDING') return 'Pendiente';
    if (normalized === 'IN_PROGRESS') return 'En juego';
    if (normalized === 'PAUSED') return 'Pausado';
    return status ?? '';
  
}

export function runTestHarnessOnPrepareDefensiveDowngradeLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.prepareDefensiveDowngradeLab().subscribe({
      next: (result: any) => {
        ctx.mutationInFlight.set(false);
        ctx.scenarioMatrixResults.set([]);
        ctx.scenarioMatrixSummaryResults.set([]);
        ctx.snackBar.open(
          `${result.message}. Run Matriz escenarios to measure m60-defensive-downgrade-sub.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to prepare defensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnPrepareDefensiveFallbackLineupLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    let restorePoint: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup: LineupDTO) => {
        const originalSlots = ctx.buildLineupSlots(originalLineup);
        restorePoint = {
          formation: originalLineup.formation ?? ctx.selectedFormationModel ?? '4-4-2',
          playerIds: ctx.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return ctx.harness.setFormation('4-3-3').pipe(
          switchMap(() => ctx.harness.autoSelectLineup('4-3-3'))
        );
      }),
      switchMap(() => ctx.harness.getCurrentLineup()),
      switchMap((lineup) => {
        const lab = ctx.buildDefensiveFallbackLineupLab(lineup);
        ctx.defensiveFallbackRestore = restorePoint ?? lab.restore;
        ctx.defensiveFallbackLabRead = lab.read;
        return ctx.harness.manualSelectLineup(lab.formation, lab.playerIds, lab.slots);
      })
    ).subscribe({
      next: () => {
        ctx.handleLabMutationSuccess();
        ctx.analysisReadyMessage.set(`DEF fallback lab listo: ${ctx.defensiveFallbackLabRead ?? 'corré XI efectivo para ver fallback defensivo.'}`);
        ctx.snackBar.open('DEF fallback lab preparado. Corré XI efectivo.', 'OK', { duration: 4500 });
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to prepare DEF fallback lab'), 'OK', { duration: 6000 });
      },
    });
  
}

export function runTestHarnessOnPrepareObjectiveContrastLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.prepareObjectiveContrastLab().subscribe({
      next: (result: any) => {
        ctx.handleLabMutationSuccess();
        ctx.snackBar.open(
          `${result.message}. Run Smoke completo de cambios to compare Objetivo DT, Mejor ataque and Mejor cierre.`,
          'OK',
          { duration: 7000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to prepare objective contrast lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnPrepareOffensiveUpgradeLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.prepareOffensiveUpgradeLab().subscribe({
      next: (result: any) => {
        ctx.mutationInFlight.set(false);
        ctx.scenarioMatrixResults.set([]);
        ctx.scenarioMatrixSummaryResults.set([]);
        ctx.snackBar.open(
          `${result.message}. Run Matriz escenarios to measure m60-offensive-upgrade-sub.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to prepare offensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnPrepareOpponentWeakCenterBacksLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.prepareOpponentWeakCenterBacksLab(matchId),
      'Failed to prepare rival weak CB lab',
      'Run Formation avg with Centro vs Bandas to inspect offensive central exploitation.'
    );
  
}

export function runTestHarnessOnPrepareOpponentWeakLeftDefenderLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.prepareOpponentWeakLeftDefenderLab(matchId),
      'Failed to prepare rival weak left DEF lab',
      'Run Smoke ataque and inspect right-side/wide exploitation.'
    );
  
}

export function runTestHarnessOnPrepareOpponentWeakRightDefenderLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.prepareOpponentWeakRightDefenderLab(matchId),
      'Failed to prepare rival weak right DEF lab',
      'Run Smoke ataque and inspect left-side/wide exploitation.'
    );
  
}

export function runTestHarnessOnPrepareOpponentWeakWideDefendersLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.prepareOpponentWeakWideDefendersLab(matchId),
      'Failed to prepare rival weak wide DEF lab',
      'Run Formation avg with Bandas vs Centro to inspect offensive wide exploitation.'
    );
  
}

export function runTestHarnessOnPrepareWeakCenterBacksLab(ctx: any): any {
    ctx.runLabMutation(
      () => ctx.harness.prepareWeakCenterBacksLab(),
      'Failed to prepare weak CB lab',
      'Run Multi-seed matrix and inspect opponent central xG.'
    );
  
}

export function runTestHarnessOnPrepareWeakLeftDefenderLab(ctx: any): any {
    ctx.runLabMutation(
      () => ctx.harness.prepareWeakLeftDefenderLab(),
      'Failed to prepare weak left DEF lab',
      'Run Multi-seed matrix and inspect opponent wide xG.'
    );
  
}

export function runTestHarnessOnPrepareWeakRightDefenderLab(ctx: any): any {
    ctx.runLabMutation(
      () => ctx.harness.prepareWeakRightDefenderLab(),
      'Failed to prepare weak right DEF lab',
      'Run Multi-seed matrix and inspect opponent wide xG.'
    );
  
}

export function runTestHarnessOnPrepareWeakWideDefendersLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.prepareWeakWideDefendersLab().subscribe({
      next: (result: any) => {
        ctx.handleLabMutationSuccess();
        ctx.snackBar.open(
          `${result.message}. Run Multi-seed matrix and inspect m45-opponent-wide.`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to prepare weak wide DEF lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnRestoreDefensiveDowngradeLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.restoreDefensiveDowngradeLab().subscribe({
      next: (result: any) => {
        ctx.mutationInFlight.set(false);
        ctx.scenarioMatrixResults.set([]);
        ctx.scenarioMatrixSummaryResults.set([]);
        ctx.snackBar.open(
          `${result.message}. Run Matriz escenarios again for baseline squad.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to restore defensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnRestoreDefensiveFallbackLineupLab(ctx: any): any {
    const restore = ctx.defensiveFallbackRestore;
    if (!restore) {
      ctx.snackBar.open('No DEF fallback lab restore point available.', 'OK', { duration: 3500 });
      return;
    }
    ctx.mutationInFlight.set(true);
    ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(take(1)).subscribe({
      next: () => {
        ctx.defensiveFallbackRestore = null;
        ctx.defensiveFallbackLabRead = null;
        ctx.handleLabMutationSuccess();
        ctx.analysisReadyMessage.set('DEF fallback lab restaurado.');
        ctx.snackBar.open('DEF fallback lab restaurado.', 'OK', { duration: 3500 });
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to restore DEF fallback lab'), 'OK', { duration: 6000 });
      },
    });
  
}

export function runTestHarnessOnRestoreObjectiveContrastLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.restoreObjectiveContrastLab().subscribe({
      next: (result: any) => {
        ctx.handleLabMutationSuccess();
        ctx.snackBar.open(
          `${result.message}. Run Smoke completo de cambios again for baseline objective reads.`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to restore objective contrast lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnRestoreOffensiveUpgradeLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.restoreOffensiveUpgradeLab().subscribe({
      next: (result: any) => {
        ctx.mutationInFlight.set(false);
        ctx.scenarioMatrixResults.set([]);
        ctx.scenarioMatrixSummaryResults.set([]);
        ctx.snackBar.open(
          `${result.message}. Run Matriz escenarios again for baseline squad.`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to restore offensive lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnRestoreOpponentWeakCenterBacksLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.restoreOpponentWeakCenterBacksLab(matchId),
      'Failed to restore rival weak CB lab',
      'Rival center backs restored for this selected match.'
    );
  
}

export function runTestHarnessOnRestoreOpponentWeakLeftDefenderLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.restoreOpponentWeakLeftDefenderLab(matchId),
      'Failed to restore rival weak left DEF lab',
      'Rival left defender restored for this selected match.'
    );
  
}

export function runTestHarnessOnRestoreOpponentWeakRightDefenderLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.restoreOpponentWeakRightDefenderLab(matchId),
      'Failed to restore rival weak right DEF lab',
      'Rival right defender restored for this selected match.'
    );
  
}

export function runTestHarnessOnRestoreOpponentWeakWideDefendersLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) return;
    ctx.runLabMutation(
      () => ctx.harness.restoreOpponentWeakWideDefendersLab(matchId),
      'Failed to restore rival weak wide DEF lab',
      'Rival wide defense restored for this selected match.'
    );
  
}

export function runTestHarnessOnRestoreWeakCenterBacksLab(ctx: any): any {
    ctx.runLabMutation(
      () => ctx.harness.restoreWeakCenterBacksLab(),
      'Failed to restore weak CB lab',
      'Baseline central defense restored.'
    );
  
}

export function runTestHarnessOnRestoreWeakLeftDefenderLab(ctx: any): any {
    ctx.runLabMutation(
      () => ctx.harness.restoreWeakLeftDefenderLab(),
      'Failed to restore weak left DEF lab',
      'Baseline left channel restored.'
    );
  
}

export function runTestHarnessOnRestoreWeakRightDefenderLab(ctx: any): any {
    ctx.runLabMutation(
      () => ctx.harness.restoreWeakRightDefenderLab(),
      'Failed to restore weak right DEF lab',
      'Baseline right channel restored.'
    );
  
}
