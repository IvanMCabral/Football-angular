import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessScenarioBatteryCoverageHint(ctx: any): any {
    return getScenarioBatteryCoverageHint(
      ctx.scenarioBatteryScopeModel,
      ctx.scenarioBatteryRows().length,
      ctx.scenarioMatrixSmokeSeedCount(),
      ctx.scenarioBatteryCandidateMatches().length,
      ctx.scenarioBatteryMatchLimit()
    );
  
}

export function runTestHarnessScenarioBatteryDecision(ctx: any, cards: any, objective: any): any {
    return getScenarioBatteryDecision(cards, objective);
  
}

export function runTestHarnessScenarioBatteryDecisionMinute(ctx: any, match: any): any {
    return getScenarioBatteryDecisionMinute(match, ctx.selectedMinute());
  
}

export function runTestHarnessScenarioBatteryDecisionReview(ctx: any, objective: any, decisionLabel: any, cards: any): any {
    return getScenarioBatteryDecisionReview(
      objective,
      decisionLabel,
      cards,
      ctx.scenarioBatteryCoachObjectiveLabel(objective)
    );
  
}

export function runTestHarnessScenarioBatteryEffectiveCoachObjective(ctx: any, match: any, controlledSide: any): any {
    return ctx.scenarioBatteryCoachObjectiveModel === 'AUTO'
      ? ctx.inferScenarioBatteryCoachObjective(match, controlledSide)
      : ctx.scenarioBatteryCoachObjectiveModel;
  
}

export function runTestHarnessScenarioBatteryExportRow(ctx: any, row: any): any {
    return getScenarioBatteryExportRow(row);
  
}

export function runTestHarnessScenarioBatteryGoalDiff(ctx: any, match: any, controlledSide: any): any {
    return getScenarioBatteryGoalDiff(match, controlledSide);
  
}

export function runTestHarnessScenarioBatteryGroupHint(ctx: any): any {
    return getScenarioBatteryGroupHint(ctx.scenarioBatteryGroupModel);
  
}

export function runTestHarnessScenarioBatteryGroupLabel(ctx: any, group: any): any {
    return getScenarioBatteryGroupLabel(group);
  
}

export function runTestHarnessScenarioBatteryMatchLimit(ctx: any): any {
    return ctx.scenarioBatteryScopeModel === 'balanced' ? 4 : 2;
  
}

export function runTestHarnessScenarioBatteryMatchStateText(ctx: any, match: any, controlledSide: any): any {
    return getScenarioBatteryMatchStateText(match, controlledSide, ctx.selectedMinute());
  
}

export function runTestHarnessScenarioBatteryMetricText(ctx: any, value: any, label: any): any {
    return getScenarioBatteryMetricText(value, label);
  
}

export function runTestHarnessScenarioBatteryProgressText(ctx: any, completed: any, total: any, availableMatches: any, targetMatches: any, nextJob: any): any {
    return getScenarioBatteryProgressText(completed, total, availableMatches, targetMatches, nextJob);
  
}

export function runTestHarnessScenarioBatteryReviewCount(ctx: any): any {
    return getScenarioBatteryReviewCount(ctx.scenarioBatteryRows());
  
}

export function runTestHarnessScenarioBatteryReviewHint(ctx: any): any {
    return getScenarioBatteryReviewHint(ctx.scenarioBatteryRows());
  
}

export function runTestHarnessScenarioBatteryReviewItems(ctx: any): any {
    return getScenarioBatteryReviewItems(ctx.scenarioBatteryRows());
  
}

export function runTestHarnessScenarioBatteryRiskCardSummary(ctx: any, row: any): any {
    return getScenarioBatteryRiskCardSummary(row);
  
}

export function runTestHarnessScenarioBatteryScenarioCountEstimate(ctx: any, group: any): any {
    return getScenarioBatteryScenarioCountEstimate(group);
  
}

export function runTestHarnessScenarioBatteryScopeHint(ctx: any): any {
    return getScenarioBatteryScopeHint(
      ctx.scenarioBatteryScopeModel,
      ctx.scenarioBatteryCandidateMatches().length,
      ctx.scenarioBatteryMatchLimit()
    );
  
}

export function runTestHarnessScenarioBatterySquadText(ctx: any, strength: any): any {
    return getScenarioBatterySquadText(strength);
  
}

export function runTestHarnessScenarioBatteryTeamCondition(ctx: any, strength: any): any {
    return getScenarioBatteryTeamCondition(strength);
  
}

export function runTestHarnessScenarioBatteryTeamRating(ctx: any, teamName: any, strength: any): any {
    return getScenarioBatteryTeamRating(teamName, strength);
  
}

export function runTestHarnessScenarioBatteryTeamReputation(ctx: any, teamName: any): any {
    return getScenarioBatteryTeamReputation(teamName);
  
}

export function runTestHarnessScenarioSummaryCoherentSubstitutionSignal(ctx: any, row: any): any {
    return getScenarioSummaryCoherentSubstitutionSignal(row);
  
}

export function runTestHarnessToFocusedWideBatteryRows(ctx: any, results: any): any {
    const baseByFormation = new Map<string, MatchPreviewSummary>();
    for (const item of results) {
      if (item.job.style === 'BALANCED') {
        baseByFormation.set(item.job.formation, item.summary);
      }
    }
    return results.map((item: any) => {
      const summary = item.summary;
      const base = baseByFormation.get(item.job.formation) ?? summary;
      const wideShare = ctx.safeRatio(summary.avgWideShotsFor, summary.avgWideShotsFor + summary.avgCentralShotsFor);
      const baseWideShare = ctx.safeRatio(base.avgWideShotsFor, base.avgWideShotsFor + base.avgCentralShotsFor);
      const deltaXgFor = ctx.roundTo(summary.avgXgFor - base.avgXgFor, 3);
      const deltaWideShotsFor = ctx.roundTo(summary.avgWideShotsFor - base.avgWideShotsFor, 3);
      const deltaWideShare = ctx.roundTo(wideShare - baseWideShare, 3);
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
        styleLabel: ctx.styleShort(item.job.style),
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

export function runTestHarnessToPlayerSwapMatrixSummary(ctx: any, row: any, candidate: any): any {
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
      style: ctx.selectedStyleModel,
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
    const testCase = ctx.playerSwapResolvedTestCase(candidate, fitCandidate);
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
      swapRead: ctx.playerSwapCoachRead(row, fitCandidate),
      swapReadDetail: ctx.playerSwapCoachReadDetail(row, fitCandidate),
      swapReadClass: ctx.playerSwapCoachReadClass(row, fitCandidate),
      swapFit: ctx.playerSwapFit(fitCandidate),
      swapFitDetail: ctx.playerSwapFitDetail(fitCandidate),
      swapFitClass: ctx.playerSwapFitClass(fitCandidate),
      signalScore: ctx.playerSwapSignalScore(row, fitCandidate),
      signalRead: ctx.playerSwapSignalRead(row, fitCandidate),
      signalClass: ctx.playerSwapSignalClass(row, fitCandidate),
      signalDetail: ctx.playerSwapSignalDetail(row, fitCandidate),
      ...ctx.playerSwapTacticalBreakdown(row, fitCandidate),
      timestamp: new Date().toISOString(),
    };
  
}

export function runTestHarnessToSubstitutionTimingMatrixRow(ctx: any, row: any): any {
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
      readClass: ctx.deltaClass(score),
      timingRead,
    };
  
}

export function runTestHarnessTrackByFocusedWideBatteryRow(ctx: any, _index: any, row: any): any {
    return `${row.formation}:${row.style}`;
  
}

export function runTestHarnessTrackByModalRecommendationCandidateAttempt(ctx: any, _index: any, item: any): any {
    return `${item.candidate.starterId}:${item.candidate.benchId}:${item.row?.minute ?? 'pending'}:${item.row?.seedStart ?? 'pending'}:${item.row?.seedEnd ?? 'pending'}`;
  
}

export function runTestHarnessTrackByPlayerSwapPrecisionComparison(ctx: any, _index: any, row: any): any {
    return row.candidateKey;
  
}

export function runTestHarnessTrackByPlayerSwapSummary(ctx: any, _index: any, summary: any): any {
    return `${summary.slotId}:${summary.baselinePlayer}:${summary.swapPlayer}:${summary.seedStart}:${summary.seedEnd}`;
  
}

export function runTestHarnessTrackByScenarioBattery(ctx: any, _index: any, row: any): any {
    return `${row.matchId}:${row.controlledSide}:${row.seedStart}:${row.seedCount}`;
  
}

export function runTestHarnessTrackByScenarioBatteryReviewItem(ctx: any, _: any, item: any): any {
    return item.key;
  
}

export function runTestHarnessTrackBySubstitutionTimingRow(ctx: any, _index: any, row: any): any {
    return `${row.playerOffId}:${row.playerOnId}:${row.minute}:${row.seedStart}:${row.seedEnd}`;
  
}

export function runTestHarnessTrackBySwapBenchOption(ctx: any, _index: any, option: any): any {
    return option.playerId;
  
}

export function readTestHarnessPlayerSwapBatterySummary(ctx: any): any {
    const rows: any[] = ctx.playerSwapBatterySummaries();
    const reads: Record<string, number> = {};
    const fits: Record<string, number> = {};
    for (const row of rows) {
      reads[row.swapRead] = (reads[row.swapRead] ?? 0) + 1;
      fits[row.swapFit] = (fits[row.swapFit] ?? 0) + 1;
    }
    const objective = ctx.playerSwapEffectiveCoachObjective();
    const sorted = [...rows].sort((a, b) => ctx.playerSwapDecisionScore(b, objective) - ctx.playerSwapDecisionScore(a, objective));
    const recommended = sorted.filter((row) => ctx.playerSwapIsActionableRecommendation(row));
    const seedCount = rows[0]?.seedCount ?? ctx.playerSwapSeedCountModel;
    const hasEstresRows = rows.some((row) => (row.testCase || '').toLowerCase().includes('stress'));
    const hasNaturalRows = rows.some((row) => (row.testCase || '').toLowerCase().includes('battery: natural'));
    const mode = hasEstresRows && hasNaturalRows ? 'combined' : rows[0]?.testCase?.toLowerCase().includes('stress') ? 'stress' : ctx.playerSwapBatteryModeModel;
    return {
      total: rows.length,
      mode,
      precision: ctx.playerSwapBatteryPrecisionModel,
      confidence: ctx.playerSwapBatteryConfidenceLabel(seedCount),
      best: recommended[0] ?? sorted[0] ?? null,
      bestAttack: [...rows].sort((a, b) => ctx.playerSwapDecisionScore(b, 'NEED_GOAL') - ctx.playerSwapDecisionScore(a, 'NEED_GOAL'))[0] ?? null,
      bestProtect: ctx.playerSwapBestProtectPick(rows),
      worst: sorted[sorted.length - 1] ?? null,
      reads,
      fits,
    };
  
}
