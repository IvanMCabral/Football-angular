import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessPositionPixelChannelBreakdown(ctx: any, row: any): any {
    return getPositionPixelChannelBreakdown(row);
  
}

export function runTestHarnessPositionPixelChannelBreakdownClass(ctx: any, row: any): any {
    return getPositionPixelChannelBreakdownClass(ctx.positionPixelChannelBreakdown(row));
  
}

export function runTestHarnessPositionPixelChannelBreakdownRead(ctx: any, row: any): any {
    const breakdown = ctx.positionPixelChannelBreakdown(row);
    return getPositionPixelChannelBreakdownRead(breakdown, ctx.positionPixelCoverageChannelLabel(row, breakdown.coverage));
  
}

export function runTestHarnessPositionPixelChannelBreakdownTrend(ctx: any, rows: any): any {
    if (rows.length === 0) return 'A= C= Cob=';
    const totals = rows.reduce(
      (acc: any, row: any) => {
        const breakdown = ctx.positionPixelChannelBreakdown(row);
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
    return `A${ctx.positionPixelChannelSign(threat)} C${ctx.positionPixelChannelSign(connection)} Cob${ctx.positionPixelChannelSign(coverage)}`;
  
}

export function runTestHarnessPositionPixelChannelLabel(ctx: any, channel: any): any {
    return getPositionPixelChannelLabel(channel);
  
}

export function runTestHarnessPositionPixelChannelSign(ctx: any, value: any): any {
    return getPositionPixelChannelSign(value);
  
}

export function runTestHarnessPositionPixelClampBreakdownScore(ctx: any, value: any): any {
    return Math.max(-9.99, Math.min(9.99, Number.isFinite(value) ? value : 0));
  
}

export function runTestHarnessPositionPixelCoachRead(ctx: any, row: any): any {
    return getPositionPixelCoachRead(row);
  
}

export function runTestHarnessPositionPixelContextualCoverageNote(ctx: any, row: any, coverage: any): any {
    return getPositionPixelContextualCoverageNote(row, ctx.positionPixelSourceLine(row), coverage);
  
}

export function runTestHarnessPositionPixelCoverageChannelLabel(ctx: any, row: any, coverage: any): any {
    return getPositionPixelCoverageChannelLabel(ctx.positionPixelUsesContextualCoverage(row, coverage), coverage);
  
}

export function runTestHarnessPositionPixelDecisionScore(ctx: any, row: any): any {
    return getPositionPixelDecisionScore(row);
  
}

export function runTestHarnessPositionPixelDefensiveGainScore(ctx: any, row: any): any {
    return getPositionPixelDefensiveGainScore(row);
  
}

export function runTestHarnessPositionPixelDefensiveRiskScore(ctx: any, row: any): any {
    return getPositionPixelDefensiveRiskScore(row);
  
}

export function runTestHarnessPositionPixelDiagonalSummaryRowClass(ctx: any, row: any, positive: any): any {
    if (!row) return 'delta-neutral';
    const score = ctx.positionPixelDecisionScore(row);
    return positive ? ctx.deltaClass(score) : ctx.deltaClass(-score);
  
}

export function runTestHarnessPositionPixelDiagonalSummaryRowText(ctx: any, row: any): any {
    if (!row) return 'Sin filas';
    const score = ctx.positionPixelDecisionScore(row);
    return `${row.playerName} · ${ctx.positionPixelMoveLabel(row)} · score ${ctx.fmtDeltaNumber(score)} · xG ${ctx.fmtDeltaMicro(row.deltaXgFor)}/${ctx.fmtDeltaMicro(row.deltaXgAgainst)}`;
  
}

export function runTestHarnessPositionPixelDistance(ctx: any, row: any): any {
    return getPositionPixelDistance(row);
  
}

export function runTestHarnessPositionPixelDominantCause(ctx: any, rows: any): any {
    if (rows.length === 0) return 'No rows';
    const totals = rows.reduce(
      (acc: any, row: any) => {
        acc.attackGain += ctx.positionPixelAttackGainScore(row);
        acc.attackLoss += ctx.positionPixelAttackLossScore(row);
        acc.defensiveRisk += ctx.positionPixelDefensiveRiskScore(row);
        acc.defensiveGain += ctx.positionPixelDefensiveGainScore(row);
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

export function runTestHarnessPositionPixelExportPayload(ctx: any): any {
    const match = ctx.selectedMatch();
    return {
      metadata: {
        matchId: ctx.selectedMatchId(),
        matchLabel: match ? `${match.homeTeamName} vs ${match.awayTeamName}` : null,
        readFilter: ctx.positionPixelReadFilter(),
        sortMode: ctx.positionPixelSortMode(),
        visibleRows: ctx.displayedPositionPixelMatrixRows().length,
        totalRows: ctx.positionPixelMatrixRows().length,
        readSummary: ctx.positionPixelReadSummary(),
        tacticalReadSummary: ctx.positionPixelTacticalReadSummary(),
        visualExpectationSummary: ctx.positionPixelVisualExpectationSummary(),
        visualEngineTensionSummary: ctx.positionPixelVisualEngineTensionSummary(),
        lineupDebug: ctx.lineupDebugSnapshot(),
      },
      rows: ctx.displayedPositionPixelMatrixRows().map((row: any) => ctx.positionPixelExportRow(row)),
    };
  
}

export function runTestHarnessPositionPixelExportRow(ctx: any, row: any): any {
    return {
      ...row,
      read: ctx.positionPixelRead(row),
      tacticalRead: ctx.positionPixelTacticalRead(row),
      tacticalReadReason: ctx.positionPixelTacticalReadReason(row),
      channelBreakdownRead: ctx.positionPixelChannelBreakdownRead(row),
      channelBreakdownDetail: ctx.positionPixelChannelBreakdownDetail(row),
      visualExpectationRead: ctx.positionPixelVisualExpectationRead(row),
      visualExpectationDetail: ctx.positionPixelVisualExpectationDetail(row),
      visualEngineTensionRead: ctx.positionPixelVisualEngineTensionRead(row),
      visualEngineTensionDetail: ctx.positionPixelVisualEngineTensionDetail(row),
      shapeMove: ctx.positionPixelShapeMove(row),
      shapeMoveDetail: ctx.positionPixelShapeMoveDetail(row),
      movementDistance: Number(ctx.positionPixelDistance(row).toFixed(3)),
      impactScore: Number(ctx.positionPixelImpactScore(row).toFixed(3)),
      signalScore: Number(row.signalScore.toFixed(3)),
      signalRead: row.signalRead,
      signalDetail: row.signalDetail,
      attackGainScore: Number(ctx.positionPixelAttackGainScore(row).toFixed(3)),
      attackLossScore: Number(ctx.positionPixelAttackLossScore(row).toFixed(3)),
      defensiveRiskScore: Number(ctx.positionPixelDefensiveRiskScore(row).toFixed(3)),
      defensiveGainScore: Number(ctx.positionPixelDefensiveGainScore(row).toFixed(3)),
    };
  
}

export function runTestHarnessPositionPixelHasChecks(ctx: any): any {
    return ctx.positionPixelMatrixRows().some((row: any) => ctx.positionPixelReadLevel(row) === 'check');
  
}

export function runTestHarnessPositionPixelImpactScore(ctx: any, row: any): any {
    return getPositionPixelImpactScore(row);
  
}

export function runTestHarnessPositionPixelIsBigMove(ctx: any, row: any): any {
    return ctx.positionPixelMoveLabel(row) === 'big zone cross' || ctx.positionPixelDistance(row) > 6.0;
  
}

export function runTestHarnessPositionPixelIsDiagonalMove(ctx: any, row: any): any {
    return Math.abs(row.targetXPercent - row.fromXPercent) >= 4
      && Math.abs(row.targetYPercent - row.fromYPercent) >= 4;
  
}

export function runTestHarnessPositionPixelIsLineBreak(ctx: any, row: any): any {
    return ctx.positionPixelVisualLine(row.fromYPercent) !== ctx.positionPixelVisualLine(row.targetYPercent);
  
}

export function runTestHarnessPositionPixelIsMicroVisualMismatch(ctx: any, row: any): any {
    return getPositionPixelIsMicroVisualMismatch(row);
  
}

export function runTestHarnessPositionPixelLine(ctx: any, position: any): any {
    return getPositionPixelLine(position);
  
}

export function runTestHarnessPositionPixelLineFromSlot(ctx: any, formation: any, slot: any): any {
    const y = ctx.matchContextYPercent(slot) ?? ctx.canonicalYPercent(formation, slot);
    if (y === null || !Number.isFinite(y)) return null;
    if (y < 34) return 'ATT';
    if (y < 67) return 'MID';
    return 'DEF';
  
}

export function runTestHarnessPositionPixelMatchLabel(ctx: any, row: any): any {
    const parts = row.label.split(/\s[?·]\s/);
    return parts.length > 1 ? parts[0] : 'Selected match';
  
}

export function runTestHarnessPositionPixelMatchSmokeVerdict(ctx: any, readCounts: any, microReview: any, visibleRisk: any, visibleAttackLoss: any, bigBadTradeoff: any, fivePxRiskRows: any, fivePxCostRows: any, bigMoveRows: any, bigMoveStrongRows: any, avgSignal: any, worstSignal: any, worstFivePxRiskSignal: any, avgFivePxRiskSignal: any): any {
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

export function runTestHarnessPositionPixelMatchSmokeVerdictClass(ctx: any, verdict: any): any {
    return getPositionPixelSmokeVerdictClass(verdict);
  
}

export function runTestHarnessPositionPixelMoveLabel(ctx: any, row: any): any {
    const parts = row.label.split(/\s[?·]\s/);
    return parts.length > 1 ? parts.slice(1).join(' · ') : row.label;
  
}

export function runTestHarnessPositionPixelMovementConfidence(ctx: any, distance: any): any {
    return getPositionPixelMovementConfidence(distance);
  
}

export function runTestHarnessPositionPixelPlayerSmokeSeverity(ctx: any, item: any): any {
    return getPositionPixelPlayerSmokeSeverity(item.verdict);
  
}

export function runTestHarnessPositionPixelPlayerSmokeVerdict(ctx: any, fivePxRiskRows: any, bigMoveRows: any, bigMoveStrongRows: any, avgSignal: any, worstSignal: any): any {
    return getPositionPixelPlayerSmokeVerdict(fivePxRiskRows, bigMoveRows, bigMoveStrongRows, avgSignal, worstSignal);
  
}

export function runTestHarnessPositionPixelQaSummaryBoard(ctx: any): any {
    const rows = ctx.positionPixelMatrixRows();
    const lines: PositionPixelQaLine[] = ['ALL', 'DEF', 'MID', 'ATT'];
    return lines.map((line) => {
      const rowLine = (row: PositionPixelMatrixSummary): PositionPixelQaLine => {
        const position = String(row.playerPosition || '').toUpperCase();
        if (position === 'DEF' || position === 'MID' || position === 'ATT') {
          return position;
        }
        return ctx.strictPositionPixelLine(row.playerPosition) || ctx.positionPixelVisualLine(row.fromYPercent);
      };
      const scoped = line === 'ALL'
        ? rows
        : rows.filter((row: any) => rowLine(row) === line);
      const isStable = (row: PositionPixelMatrixSummary) => ctx.positionPixelRead(row).toLowerCase().includes('estable');
      const isReview = (row: PositionPixelMatrixSummary) => ctx.positionPixelRead(row).toLowerCase().includes('revis');
      const microOk = scoped.filter((row: any) =>
        ctx.positionPixelDistance(row) <= 1.5
        && Math.abs(row.signalScore || 0) < 0.05
      ).length;
      const visibleOk = scoped.filter((row: any) =>
        Math.abs(row.signalScore || 0) >= 0.05
        || Math.abs(row.deltaXgFor || 0) >= 0.05
        || Math.abs(row.deltaXgAgainst || 0) >= 0.05
        || Math.abs(row.deltaShotsFor || 0) >= 1
        || Math.abs(row.deltaShotsAgainst || 0) >= 1
      ).length;
      const contradiction = scoped.filter((row: any) =>
        Math.abs(row.signalScore || 0) >= 0.15
        &&
        (row.deltaWideXgFor || 0) > 0.08
        && ((row.deltaXgFor || 0) < -0.03 || (row.deltaShotsFor || 0) < -0.5)
      ).length;
      const strongCoherent = scoped.filter((row: any) => Math.abs(row.signalScore || 0) >= 0.15).length - contradiction;
      const visualReview = scoped.filter((row: any) => isReview(row)).length;
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

export function runTestHarnessPositionPixelRead(ctx: any, row: any): any {
    const level = ctx.positionPixelReadLevel(row);
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

export function runTestHarnessPositionPixelReadClass(ctx: any, row: any): any {
    return `read-${ctx.positionPixelReadLevel(row)}`;
  
}

export function runTestHarnessPositionPixelReadLevel(ctx: any, row: any): any {
    return getPositionPixelReadLevel(row, ctx.positionPixelTacticalRead(row));
  
}

export function runTestHarnessPositionPixelReadSeverity(ctx: any, row: any): any {
    return getPositionPixelReadSeverity(row, ctx.positionPixelTacticalRead(row));
  
}

export function runTestHarnessPositionPixelReadSummary(ctx: any): any {
    const counts: Record<PositionPixelReadLevel, number> = {
      stable: 0,
      visible: 0,
      strong: 0,
      check: 0,
    };
    for (const row of ctx.positionPixelMatrixRows()) {
      counts[ctx.positionPixelReadLevel(row) as PositionPixelReadLevel] += 1;
    }
    return [
      { label: 'Stable', level: 'stable', count: counts.stable },
      { label: 'Visible', level: 'visible', count: counts.visible },
      { label: 'Strong', level: 'strong', count: counts.strong },
      { label: 'Check', level: 'check', count: counts.check },
    ];
  
}

export function runTestHarnessPositionPixelRowKey(ctx: any, row: any): any {
    return ctx.safeDomKey(`${row.playerName}-${row.label}-${row.fromXPercent}-${row.fromYPercent}-${row.targetXPercent}-${row.targetYPercent}`);
  
}

export function runTestHarnessPositionPixelShapeDeltaText(ctx: any, fromLine: any, fromChannel: any, toLine: any, toChannel: any): any {
    return getPositionPixelShapeDeltaText(fromLine, fromChannel, toLine, toChannel);
  
}

export function runTestHarnessPositionPixelShapeMove(ctx: any, row: any): any {
    return getPositionPixelShapeMove(row);
  
}

export function runTestHarnessPositionPixelSignalClassFromRow(ctx: any, row: any): any {
    const score = ctx.positionPixelSignalScoreFromRow(row);
    return getPositionPixelSignalClass(score, getPositionPixelDistance(row));
  
}

export function runTestHarnessPositionPixelSignalReadFromRow(ctx: any, row: any): any {
    const score = ctx.positionPixelSignalScoreFromRow(row);
    return getPositionPixelSignalRead(score, getPositionPixelDistance(row));
  
}

export function runTestHarnessPositionPixelSignalScoreFromRow(ctx: any, row: any): any {
    return getPositionPixelSignalScore(row);
  
}

export function runTestHarnessPositionPixelSmokeScopeOrder(ctx: any, scope: any): any {
    return ({ ALL: 0, DEF: 1, MID: 2, ATT: 3 } as Record<string, number>)[scope];
  
}

export function runTestHarnessPositionPixelSourceLine(ctx: any, row: any): any {
    return ctx.strictPositionPixelLine(row.playerPosition) ?? ctx.positionPixelVisualLine(row.fromYPercent);
  
}

export function runTestHarnessPositionPixelTacticalRead(ctx: any, row: any): any {
    return getPositionPixelTacticalRead(row);
  
}

export function runTestHarnessPositionPixelTacticalReadClass(ctx: any, row: any): any {
    return getPositionPixelTacticalReadClass(ctx.positionPixelTacticalRead(row));
  
}

export function runTestHarnessPositionPixelTacticalReadReason(ctx: any, row: any): any {
    return getPositionPixelTacticalReadReason(row, ctx.positionPixelCoachRead(row), (value) => ctx.fmtDeltaMicro(value));
  
}
