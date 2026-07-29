import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function readTestHarnessProfessionalQaChecklistRows(ctx: any): any {
      const rows: any[] = ctx.formationLineSmokeRows();
      const pixelRows: any[] = ctx.positionPixelMatrixRows();
      const lastPixelMappedRows = ctx.lastPositionPixelMappedRows();
      const pixelMatchSummaries: any[] = ctx.positionPixelMatchSmokeSummary();
      const pixelPlayerSummaries: any[] = ctx.positionPixelPlayerSmokeSummary();
      const pixelRunSummaries: any[] = ctx.positionPixelSmokeRunSummaries();
      const pixelEvidenceNote = ctx.positionPixelEvidenceNote();
      const swapBattery = ctx.playerSwapBatterySummary();
      const swapPrecisionRows: any[] = ctx.playerSwapPrecisionComparisonRows();
      const substitutionSummary = ctx.substitutionWhatIfSummary();
    const expectedFormationAuditRows = ctx.formationCodes.length * 3;
    const auditedFormationCount = new Set(rows.map((row) => row.formation)).size;
    const hasAudit = rows.length > 0;
    const hasAllFormationAudit = rows.length >= expectedFormationAuditRows
      && auditedFormationCount >= ctx.formationCodes.length;
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
        .map((role: string) => role.trim())
        .filter((role: string) => role === 'ST')
        .length >= 2
    );
    const camFallback = rows.some((row) =>
      row.formation === '3-4-1-2'
      && row.line === 'MID'
      && row.verdict === 'Fallback'
      && row.slotRoles.includes('CAM')
    );
      const pixelVisibleRows = pixelRows.filter((row) => ctx.positionPixelReadLevel(row) !== 'stable').length;
      const pixelCliffRows = pixelRows.filter((row) => ctx.positionPixelDistance(row) <= 1.5 && ctx.positionPixelReadLevel(row) === 'strong').length;
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
        ctx.positionPixelDistance(row) > 1.25
        && ctx.positionPixelDistance(row) <= 6.0
        && row.signalScore >= 0.040
      ).length;
      const pixelRowsAreMicroOnly = pixelRows.length > 0
        && pixelRows.every((row) => ctx.positionPixelDistance(row) <= 1.5);
      const hasVisiblePixelSignal = pixelVisibleRows > 0
        || pixelVisibleFivePxRows > 0
        || pixelBigTacticalMoveRows > 0
        || pixelRunVisibleRows > 0
        || pixelMeasurableSmoothRows > 0
        || pixelRowsAreMicroOnly;
    const swapActionableReads = Object.entries(swapBattery.reads)
      .filter(([read]) => !['No clear effect', 'Neutral', 'Noise / neutral', 'Sin lectura clara'].includes(read))
      .reduce((sum: number, [, count]) => sum + Number(count), 0);
    const swapMode = swapBattery.mode;
    const swapRowsForChecklist: any[] = ctx.playerSwapBatterySummaries();
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
    const substitutionTimingRows: any[] = ctx.substitutionTimingMatrixRows();
    const hasSubstitutionWhatIf = !!substitutionSummary;
    const hasSubstitutionTiming = substitutionTimingRows.length > 0;
    const smokeNotes: string[] = [
      ...(ctx.professionalSmokeSummary()?.included ?? []),
      ...(ctx.professionalSmokeSummary()?.skipped ?? []),
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
    const substitutionObjective = ctx.playerSwapEffectiveCoachObjective();
    const substitutionObjectiveOk = !substitutionSummary
      ? substitutionTimingSignalRows > 0
      : substitutionObjective === 'NEED_GOAL'
        ? substitutionSummary.deltaXgFor > 0.001 || substitutionSummary.deltaShotsFor > 0.01
        : substitutionObjective === 'PROTECT_RESULT'
          ? substitutionSummary.deltaXgAgainst < -0.001 || substitutionSummary.deltaShotsAgainst < -0.01
          : substitutionSignal;
    const substitutionObserved = substitutionSummary
      ? `${substitutionSummary.playerOffName} → ${substitutionSummary.playerOnName} min ${substitutionSummary.minute} · dXG ${ctx.fmtDeltaNumber(substitutionSummary.deltaXgFor)} · dShots ${ctx.fmtDeltaNumber(substitutionSummary.deltaShotsFor)}`
      : hasSubstitutionTiming
        ? `${substitutionTimingRows[0].playerOffName} → ${substitutionTimingRows[0].playerOnName} min ${substitutionTimingRows.map((row) => `${row.minute}'`).join('/')} · ${substitutionTimingSignalRows}/${substitutionTimingRows.length} con señal`
        : hasNoSafeSubstitution
          ? 'Sin sustitución segura para el objetivo DT actual.'
        : 'Not run yet';
    return [
      {
        check: 'All formations audit',
        expected: `${expectedFormationAuditRows} line checks after running all ${ctx.formationCodes.length} formations.`,
        observed: hasAudit
          ? `${rows.length}/${expectedFormationAuditRows} rows · ${auditedFormationCount}/${ctx.formationCodes.length} formations · ${countByVerdict('OK')} OK · ${countByVerdict('Fallback')} fallback · ${countByVerdict('Review')} review`
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
  
}
