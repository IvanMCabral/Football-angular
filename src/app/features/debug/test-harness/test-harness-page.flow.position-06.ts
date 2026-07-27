import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessToPositionPixelMatrixSummary(ctx: any, row: any, label: any): any {
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
      baselineTacticalPosition: row.baselineTacticalPosition ?? ctx.positionPixelVisualLine(row.fromYPercent),
      movedTacticalPosition: row.movedTacticalPosition ?? ctx.positionPixelVisualLine(row.targetYPercent),
      baselinePlayerEffectiveness: row.baselinePlayerEffectiveness ?? 1,
      movedPlayerEffectiveness: row.movedPlayerEffectiveness ?? 1,
      deltaPlayerEffectiveness: row.deltaPlayerEffectiveness ?? 0,
      baselinePlayerCollective: row.baselinePlayerCollective ?? 0,
      movedPlayerCollective: row.movedPlayerCollective ?? 0,
      deltaPlayerCollective: row.deltaPlayerCollective ?? 0,
      signalScore: ctx.positionPixelSignalScoreFromRow(row),
      signalRead: ctx.positionPixelSignalReadFromRow(row),
      signalClass: ctx.positionPixelSignalClassFromRow(row),
      signalDetail: ctx.positionPixelSignalDetailFromRow(row),
      timestamp: new Date().toISOString(),
    };
  
}

export function runTestHarnessToPositionPixelPlayerSmokeSummary(ctx: any, key: any, rows: any): any {
    let fivePxRiskRows = 0;
    let fivePxCostRows = 0;
    let bigMoveRows = 0;
    let bigMoveStrongRows = 0;
    let signalSum = 0;
    let worst: PositionPixelMatrixSummary | null = null;
    for (const row of rows) {
      const tacticalRead = ctx.positionPixelTacticalRead(row);
      const moveLabel = ctx.positionPixelMoveLabel(row);
      const isBigMove = ctx.positionPixelIsBigMove(row);
      if (!isBigMove && tacticalRead === 'Visible risk') {
        fivePxRiskRows += 1;
      }
      if (!isBigMove && tacticalRead === 'Visible attack loss') {
        fivePxCostRows += 1;
      }
      if (isBigMove) {
        bigMoveRows += 1;
        if (ctx.positionPixelReadLevel(row) === 'strong' || tacticalRead === 'Bad tradeoff' || tacticalRead === 'Risk') {
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
    const verdict = ctx.positionPixelPlayerSmokeVerdict(fivePxRiskRows, bigMoveRows, bigMoveStrongRows, avgSignal, worstSignal);
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
      worstMove: worst ? ctx.positionPixelMoveLabel(worst) : 'No rows',
      dominantCause: ctx.positionPixelDominantCause(rows),
      channelBreakdownTrend: ctx.positionPixelChannelBreakdownTrend(rows),
      verdict,
      verdictClass: ctx.positionPixelMatchSmokeVerdictClass(verdict),
    };
  
}

export function runTestHarnessToRoleSlotImpactSmokeRow(ctx: any, slot: any, rows: any): any {
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
    const best = rows.reduce((acc: any, row: any) => row.playerEffectiveness > acc.playerEffectiveness ? row : acc, rows[0]);
    const worst = rows.reduce((acc: any, row: any) => row.playerEffectiveness < acc.playerEffectiveness ? row : acc, rows[0]);
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

export function runTestHarnessTrackByFormationLineSmokeRow(ctx: any, _index: any, row: any): any {
    return `${row.formation}-${row.line}`;
  
}

export function runTestHarnessTrackByLineupDebugRow(ctx: any, _index: any, row: any): any {
    return row.playerId || `${row.index}-${row.slotId}`;
  
}

export function runTestHarnessTrackBySwapSlotOption(ctx: any, _index: any, option: any): any {
    return option.playerId;
  
}

export function runTestHarnessWingbackMovementPresets(ctx: any, fromX: any, fromY: any, candidate: any): any {
    return buildWingbackMovementPresets(fromX, fromY, candidate);
  
}

export function runTestHarnessWingbackSlotSide(ctx: any, slotId: any): any {
    return getWingbackSlotSide(slotId);
  
}

export function readTestHarnessDisplayedPositionPixelMatrixRows(ctx: any): any {
    const filter = ctx.positionPixelReadFilter();
    const sort = ctx.positionPixelSortMode();
    const rows = ctx.positionPixelMatrixRows()
      .filter((row: any) => {
        if (filter === 'all') return true;
        if (filter === 'diagonal') return ctx.positionPixelIsDiagonalMove(row);
        if (filter === 'diagonal-mismatch') {
          return ctx.positionPixelIsDiagonalMove(row) && ctx.positionPixelVisualExpectationRead(row) === 'Visual review';
        }
        if (filter === 'diagonal-micro') {
          return ctx.positionPixelIsDiagonalMove(row) && ctx.positionPixelVisualExpectationRead(row) === 'Visual micro';
        }
        if (filter === 'diagonal-review') {
          return ctx.positionPixelIsDiagonalMove(row) && ctx.positionPixelVisualEngineTensionRead(row) !== 'Coherente';
        }
        if (filter === 'visual-mismatch') return ctx.positionPixelVisualExpectationRead(row) === 'Visual review';
        if (filter === 'visual-micro') return ctx.positionPixelVisualExpectationRead(row) === 'Visual micro';
        if (filter === 'visual-review') return ctx.positionPixelVisualEngineTensionRead(row) !== 'Coherente';
        if (filter === 'big-move') return ctx.positionPixelIsBigMove(row);
        if (filter === 'line-break') return ctx.positionPixelIsLineBreak(row);
        return ctx.positionPixelReadLevel(row) === filter;
      })
      .map((row: any, index: number) => ({ row, index }));
    if (sort !== 'default') {
      rows.sort((a: any, b: any) => {
        if (sort === 'read-desc') {
          return ctx.positionPixelReadSeverity(b.row) - ctx.positionPixelReadSeverity(a.row) || a.index - b.index;
        }
        if (sort === 'impact-desc') {
          return ctx.positionPixelImpactScore(b.row) - ctx.positionPixelImpactScore(a.row) || a.index - b.index;
        }
        return ctx.positionPixelDistance(b.row) - ctx.positionPixelDistance(a.row) || a.index - b.index;
      });
    }
    return rows.map((item: any) => item.row);
  
}

export function readTestHarnessPositionPixelDiagonalSummary(ctx: any): any {
    const rows: any[] = ctx.positionPixelMatrixRows().filter((row: any) => ctx.positionPixelIsDiagonalMove(row));
    if (rows.length === 0) return null;
    const best = rows.reduce((candidate, row: any) =>
      ctx.positionPixelDecisionScore(row) > ctx.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    const worst = rows.reduce((candidate, row: any) =>
      ctx.positionPixelDecisionScore(row) < ctx.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    const visualMismatchRows = rows.filter((row: any) => ctx.positionPixelVisualExpectationRead(row) === 'Visual review');
    const visualMicroRows = rows.filter((row: any) => ctx.positionPixelVisualExpectationRead(row) === 'Visual micro');
    const visualReviewRows = rows.filter((row: any) => ctx.positionPixelVisualEngineTensionRead(row) !== 'Coherente');
    const worstVisualMismatch = ctx.pickWorstPositionPixelReviewRow(visualMismatchRows);
    const worstVisualReview = ctx.pickWorstPositionPixelReviewRow(visualReviewRows);
    return {
      total: rows.length,
      risk: rows.filter((row: any) => ctx.positionPixelDefensiveRiskScore(row) >= 0.8 || ctx.positionPixelTacticalRead(row) === 'Risk').length,
      defenseGain: rows.filter((row: any) => ctx.positionPixelDefensiveGainScore(row) >= 0.8 || ctx.positionPixelTacticalRead(row) === 'Def. gain').length,
      visualMismatch: visualMismatchRows.length,
      visualMicro: visualMicroRows.length,
      visualEngineReview: visualReviewRows.length,
      worstVisualMismatch,
      worstVisualReview,
      best,
      worst,
    };
  
}

export function readTestHarnessPositionPixelLineBreakSummary(ctx: any): any {
    const rows: any[] = ctx.positionPixelMatrixRows().filter((row: any) => ctx.positionPixelIsLineBreak(row));
    if (rows.length === 0) return null;
    const best = rows.reduce((candidate, row: any) =>
      ctx.positionPixelDecisionScore(row) > ctx.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    const worst = rows.reduce((candidate, row: any) =>
      ctx.positionPixelDecisionScore(row) < ctx.positionPixelDecisionScore(candidate) ? row : candidate,
      rows[0]
    );
    return {
      total: rows.length,
      borderline: rows.filter((row: any) => ctx.positionPixelDistance(row) <= 6).length,
      big: rows.filter((row: any) => ctx.positionPixelIsBigMove(row)).length,
      strong: rows.filter((row: any) => ctx.positionPixelReadLevel(row) === 'strong').length,
      badTradeoff: rows.filter((row: any) => ctx.positionPixelTacticalRead(row) === 'Bad tradeoff').length,
      attackGain: rows.filter((row: any) => ctx.positionPixelAttackGainScore(row) >= 0.8).length,
      best,
      worst,
    };
  
}
