import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessBuildCurrentLineupMultiSeedSummary(ctx: any, samples: any): any {
    if (samples.length === 0) {
      return null;
    }
    const first = samples[0];
    const sums = samples.reduce((acc: any, sample: any) => {
      const metrics = ctx.currentLineupSampleMetrics(sample.fixture, sample.detail);
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
    const seeds = samples.map((s: any) => s.seed);
    return {
      label: `${ctx.userTeamName() || 'User team'} vs current opponent`,
      formation: first.lineup?.formation ?? null,
      style: ctx.selectedStyleModel,
      seedStart: Math.min(...seeds),
      seedEnd: Math.max(...seeds),
      seedCount: n,
      playerCount: first.lineup?.players?.length ?? 0,
      starters: (first.lineup?.players ?? []).map((p: any) => `${p.name} (${p.position})`),
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

export function runTestHarnessBuildCurrentLineupReplayResult(ctx: any, lineup: any, fixture: any, detail: any): any {
    const zoneSummary = ctx.summarizeShotZones(detail);
    const userIsHome = ctx.selectedUserTeamIsHome();
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
      label: `${ctx.userTeamName() || 'User team'} vs current opponent`,
      formation: lineup?.formation ?? null,
      seed: ctx.seedInputModel,
      style: ctx.selectedStyleModel,
      playerCount: lineup?.players?.length ?? 0,
      starters: (lineup?.players ?? []).map((p: any) => `${p.name} (${p.position})`),
      score: `${goalsFor ?? '?'}-${goalsAgainst ?? '?'}`,
      possession: `${ctx.fmtPct(possessionFor ?? null)} / ${ctx.fmtPct(possessionAgainst ?? null)}`,
      shots: `${shotsFor ?? '?'} / ${shotsAgainst ?? '?'}`,
      xg: `${ctx.fmtXg(xgFor ?? null)} / ${ctx.fmtXg(xgAgainst ?? null)}`,
      zones: `${zonesFor.central}/${zonesFor.wide}/${zonesFor.long} / ${zonesAgainst.central}/${zonesAgainst.wide}/${zonesAgainst.long}`,
      timestamp: new Date().toISOString(),
    };
  
}

export function runTestHarnessBuildFormationReplayResult(ctx: any, formation: any, fixture: any, detail: any): any {
    const zoneSummary = ctx.summarizeShotZones(detail);
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

export function runTestHarnessBuildFormationReplayResultFromMatrix(ctx: any, row: any): any {
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

export function runTestHarnessBuildModalVsCanonicalSummary(ctx: any, originalLineup: any, canonical: any, modal: any): any {
    const deltaGoalsFor = modal.avgGoalsFor - canonical.avgGoalsFor;
    const deltaGoalsAgainst = modal.avgGoalsAgainst - canonical.avgGoalsAgainst;
    const deltaXgFor = modal.avgXgFor - canonical.avgXgFor;
    const deltaXgAgainst = modal.avgXgAgainst - canonical.avgXgAgainst;
    const deltaShotDiff = modal.avgShotDiff - canonical.avgShotDiff;
    const customSlotCount = (originalLineup.slots ?? []).filter((slot: any) =>
      Number.isFinite(slot.customXPercent) || Number.isFinite(slot.customYPercent)
    ).length;
    const customMovableSlotCount = ctx.countCustomMovableSlots(originalLineup);
    const net = deltaXgFor - deltaXgAgainst + deltaShotDiff * 0.03;
    const movedPlayers = ctx.modalMovedPlayers(originalLineup);
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
      label: `${ctx.userTeamName() || 'User team'} vs current opponent`,
      formation: originalLineup.formation ?? null,
      style: ctx.selectedStyleModel,
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

export function runTestHarnessClearReplayAnalysisForMatchChange(ctx: any, match: any): any {
    ctx.currentLineupReplayResult.set(null);
    ctx.currentLineupMultiSeedSummary.set(null);
    ctx.modalVsCanonicalSummary.set(null);
    ctx.lineupDiagnostic.set(null);
    ctx.playerSwapMatrixSummary.set(null);
    ctx.playerSwapBatterySummaries.set([]);
    ctx.playerSwapPrecisionComparisonRows.set([]);
    ctx.positionPixelMatrixSummary.set(null);
    ctx.positionPixelMatrixRows.set([]);
    ctx.positionPixelEvidenceNote.set(null);
    ctx.roleSlotImpactRows.set([]);
    ctx.formationReplayResults.set([]);
    ctx.formationMatrixSummaryResults.set([]);
    ctx.scenarioMatrixResults.set([]);
    ctx.scenarioMatrixSummaryResults.set([]);
    const teamName = ctx.userTeamName() || 'tu equipo';
    const matchName = `${match.homeTeamName} vs ${match.awayTeamName}`;
    ctx.analysisReadyMessage.set(
      match.homeTeamName === teamName || match.awayTeamName === teamName
        ? `Panel E preparado para ${matchName}. Corre un smoke/matriz para generar una lectura nueva.`
        : `Panel E preparado para ${matchName}. Controlar quedó en Local; podés correr smokes multi-seed para este partido.`
    );
  
}

export function runTestHarnessClearReplayAnalysisResults(ctx: any): any {
    ctx.currentLineupReplayResult.set(null);
    ctx.currentLineupMultiSeedSummary.set(null);
    ctx.modalVsCanonicalSummary.set(null);
    ctx.playerSwapMatrixSummary.set(null);
    ctx.playerSwapBatterySummaries.set([]);
    ctx.playerSwapPrecisionComparisonRows.set([]);
    ctx.positionPixelMatrixSummary.set(null);
    ctx.positionPixelMatrixRows.set([]);
    ctx.positionPixelEvidenceNote.set(null);
    ctx.roleSlotImpactRows.set([]);
    ctx.roleSlotImpactSmokeRows.set([]);
    ctx.roleSlotImpactSmokeRows.set([]);
    ctx.lineupDebugSnapshot.set(null);
    ctx.formationLineSmokeRows.set([]);
    ctx.formationReplayResults.set([]);
    ctx.formationMatrixSummaryResults.set([]);
    ctx.lowBlockLabRows.set([]);
    ctx.backFiveTransitionLabRows.set([]);
    ctx.backFiveFamilyLabRows.set([]);
    ctx.backFiveFamilyLabScope.set('');
    ctx.backFiveContextSmokeRows.set([]);
    ctx.scenarioMatrixResults.set([]);
    ctx.scenarioMatrixSummaryResults.set([]);
    ctx.scenarioBatteryRows.set([]);
    ctx.scenarioBatteryWorkload.set('');
  
}

export function runTestHarnessClearReplayAnalysisResultsForLatestRun(ctx: any): any {
    ctx.currentLineupReplayResult.set(null);
    ctx.currentLineupMultiSeedSummary.set(null);
    ctx.modalVsCanonicalSummary.set(null);
    ctx.lineupDiagnostic.set(null);
    ctx.playerSwapMatrixSummary.set(null);
    ctx.substitutionWhatIfSummary.set(null);
    ctx.substitutionTimingMatrixRows.set([]);
    ctx.playerSwapBatterySummaries.set([]);
    ctx.playerSwapPrecisionComparisonRows.set([]);
    ctx.positionPixelMatrixSummary.set(null);
    ctx.positionPixelMatrixRows.set([]);
    ctx.positionPixelEvidenceNote.set(null);
    ctx.roleSlotImpactRows.set([]);
    ctx.roleSlotImpactSmokeRows.set([]);
    ctx.allFormationRoleSlotSmokeRows.set([]);
    ctx.lineupDebugSnapshot.set(null);
    ctx.formationReplayResults.set([]);
    ctx.formationMatrixSummaryResults.set([]);
    ctx.lowBlockLabRows.set([]);
    ctx.backFiveTransitionLabRows.set([]);
    ctx.backFiveFamilyLabRows.set([]);
    ctx.backFiveFamilyLabScope.set('');
    ctx.backFiveContextSmokeRows.set([]);
    ctx.sideMirrorSmokeRows.set([]);
    ctx.realSideMirrorRows.set([]);
    ctx.syntheticSideMirrorRows.set([]);
    ctx.scenarioMatrixResults.set([]);
    ctx.scenarioMatrixSummaryResults.set([]);
    ctx.scenarioBatteryRows.set([]);
  
}

export function runTestHarnessCompareWorkflowSteps(ctx: any): any {
    const hasMatch = !!ctx.selectedMatchId();
    const timeline = ctx.timelineSnapshot();
    const hasTimelineBaseline = !!timeline;
    const hasReplayResult = !!ctx.currentLineupReplayResult()
      || !!ctx.currentLineupMultiSeedSummary()
      || !!ctx.modalVsCanonicalSummary()
      || ctx.scenarioMatrixSummaryResults().length > 0
      || ctx.scenarioBatteryRows().length > 0;
    const hasBaselineEvidence = hasReplayResult || hasTimelineBaseline;
    const hasPanelE = hasReplayResult
      || !!ctx.lineupDiagnostic()
      || !!ctx.playerSwapMatrixSummary()
      || ctx.playerSwapBatterySummaries().length > 0
      || ctx.playerSwapPrecisionComparisonRows().length > 0
      || !!ctx.positionPixelMatrixSummary()
      || ctx.positionPixelMatrixRows().length > 0
      || ctx.formationReplayResults().length > 0
      || ctx.formationMatrixSummaryResults().length > 0;
    return [
      {
        title: '1. Elegir partido',
        body: hasMatch
          ? `${ctx.selectedMatchLabel()} seleccionado.`
          : 'Selecciona un partido en Panel C para fijar el caso de prueba.',
        status: hasMatch ? 'OK' : '1',
        state: hasMatch ? 'done' : 'active',
      },
      {
        title: '2. Correr baseline con seed',
        body: hasTimelineBaseline && !hasReplayResult
          ? 'El partido ya tiene detalle minuto a minuto cargado; corre Repetir con seed si queres fijar una referencia nueva.'
          : hasMatch
          ? `Usa Repetir con seed (${ctx.seedInputModel ?? 'auto'}) para fijar una referencia reproducible.`
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

export function runTestHarnessCopyCurrentLineupMultiSeedJson(ctx: any): any {
    const payload = JSON.stringify(ctx.currentLineupMultiSeedSummary(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('XI actual multi-seed JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyCurrentLineupReplayJson(ctx: any): any {
    const payload = JSON.stringify(ctx.currentLineupReplayResult(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Current lineup replay JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyFormationMatrixJson(ctx: any): any {
    const payload = JSON.stringify(ctx.formationReplayResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Matriz formaciones JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyModalVsCanonicalJson(ctx: any): any {
    const payload = JSON.stringify(ctx.modalVsCanonicalSummary(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Base vs modal JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCurrentLineupMultiSeedReadable(ctx: any, summary: any): any {
    return `${summary.seedCount} seeds ? ${summary.formation || '?'} ? score ${ctx.fmtXg(summary.avgGoalsFor)}-${ctx.fmtXg(summary.avgGoalsAgainst)} ? poss ${ctx.fmtPct(summary.avgPossessionFor)}`;
  
}

export function runTestHarnessCurrentLineupMultiSeedSignal(ctx: any, summary: any): any {
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

export function runTestHarnessCurrentLineupSampleMetrics(ctx: any, fixture: any, detail: any): any {
    return buildCurrentLineupSampleMetrics(fixture, detail, ctx.selectedUserTeamIsHome());
  
}

export function runTestHarnessCurrentLineupSummaryFromPreview(ctx: any, lineup: any, preview: any): any {
    return {
      label: `${ctx.userTeamName() || preview.teamName || 'User team'} vs current opponent`,
      formation: preview.formation ?? lineup.formation ?? null,
      style: ctx.selectedStyleModel,
      seedStart: preview.seedStart,
      seedEnd: preview.seedEnd,
      seedCount: preview.seedCount,
      playerCount: lineup.players?.length ?? 0,
      starters: (lineup.players ?? []).map((p: any) => `${p.name} (${p.position})`),
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
