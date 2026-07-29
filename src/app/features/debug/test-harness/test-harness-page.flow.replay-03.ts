import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRunPlayerSwapPrecisionCompare(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    ctx.clearPlayerSwapAnalysisResults();
    ctx.analysisReadyMessage.set('Precision compare corriendo...');
    ctx.mutationInFlight.set(true);
    const source$ = ctx.selectedMatchIncludesUserTeam()
      ? forkJoin({
          lineup: ctx.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
          squad: (ctx.http as HttpClient).get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
            take(1),
            timeout(10_000),
            catchError(() => of([] as SessionPlayer[]))
          ),
        })
      : of({ lineup: null as LineupDTO | null, squad: [] as SessionPlayer[] });
    source$.pipe(
      switchMap(({ lineup, squad }) => {
        const candidates = lineup ? ctx.pickPlayerSwapBatteryCandidates(lineup, squad, 6) : [];
        const effectiveCandidates = candidates.length > 0
          ? candidates
          : ctx.playerSwapBatteryModeModel === 'stress'
            ? ctx.autoBackendEstresSwapCandidates()
            : [ctx.autoBackendPlayerSwapCandidate()];
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() => ctx.runPlayerSwapCandidates(matchId, effectiveCandidates, seedStart, 3)),
          switchMap((quick) =>
            ctx.runPlayerSwapCandidates(matchId, effectiveCandidates, seedStart, 10).pipe(
              map((balanced) => ctx.buildPlayerSwapPrecisionComparisonRows(quick, balanced))
            )
          )
        );
      })
    ).subscribe({
      next: (rows: any) => {
        ctx.playerSwapPrecisionComparisonRows.set(rows);
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Precision compare falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'No se pudo comparar precision de cambios'), 'OK', { duration: 5000 });
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const changed = ctx.playerSwapPrecisionComparisonRows().filter((row: any) => row.stability !== 'Stable read').length;
        ctx.snackBar.open(
          `Comparación de precisión lista: ${changed} cambiaron o necesitan revisión.`,
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Precision compare listo en Panel E.');
        ctx.refreshLineupContext();
      },
    });
  
}

export function runTestHarnessOnSeedChange(ctx: any, value: any): any {
    if (value === null || value === undefined || value === '') {
      ctx.seedInputModel = null;
      return;
    }
    const n = typeof value === 'number' ? value : Number(value);
    ctx.seedInputModel = Number.isFinite(n) ? n : null;
  
}

export function runTestHarnessOnSimulateRound(ctx: any): any {
    const roundNumber = ctx.selectedRoundModel;
    if (roundNumber === null) {
      ctx.snackBar.open('Pick a round in the dropdown first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const roundGroup = ctx.rounds().find((r: any) => r.round === roundNumber);
    if (!roundGroup || roundGroup.matches.length === 0) {
      ctx.snackBar.open(
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
      ctx.snackBar.open(
        `Round ${roundNumber} has no roundId (backend did not hydrate it). Reload the page.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const matchesPayload = roundGroup.matches.map((m: any) => ({
      matchId: m.matchId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }));
    ctx.mutationInFlight.set(true);
    ctx.harness.simulateRound(roundId, matchesPayload).subscribe({
      next: () => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          `Round ${roundNumber} simulation started (${matchesPayload.length} matches).`,
          'OK',
          { duration: 3000 }
        );
        // The simulation is async: refresh Panel C several times so the UI
        // catches the completed fixtures instead of freezing on the initial
        // PENDING snapshot returned by /rounds/start.
        ctx.scheduleRoundCompletionRefresh(roundNumber, matchesPayload.length);
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, `Failed to simulate round ${roundNumber}`),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessPlayerSwapBatteryEffectiveSeedCount(ctx: any): any {
    const baseSeedCount = ctx.playerSwapBatteryPrecisionSeedCount(ctx.playerSwapBatteryPrecisionModel);
    return ctx.playerSwapBatteryModeModel === 'stress' ? Math.max(10, baseSeedCount) : baseSeedCount;
  
}

export function runTestHarnessPlayerSwapBatteryPrecisionSeedCount(ctx: any, precision: any): any {
    if (precision === 'reliable') return 30;
    if (precision === 'balanced') return 10;
    return 3;
  
}

export function runTestHarnessRoundTo(ctx: any, value: any, decimals: any): any {
    if (!Number.isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  
}

export function runTestHarnessRunScenarioMatrixSummaryWithSeedCount(ctx: any, seedCount: any, label: any, readyMessage: any, scenarioGroup: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!ctx.canRunScenarioSummaryForControlledSide()) {
      ctx.snackBar.open(
        `Elegí Local o Visitante para correr ${label} en un partido sin ${ctx.userTeamName() || 'tu equipo'}.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const seedStart = ctx.seedInputModel ?? 12345;
    ctx.scenarioMatrixSummarySeedCount.set(seedCount);
    ctx.scenarioMatrixSummaryResults.set([]);
    ctx.analysisReadyMessage.set(
      `${label} calculando Panel E (${seedCount} seeds). Mismo partido, mismo seed base; esperando resultados multi-seed...`
    );
    ctx.mutationInFlight.set(true);
    ctx.harness.runScenarioMatrixSummary(
      matchId,
      seedStart,
      seedCount,
      scenarioGroup,
      ctx.controlledTeamSideModel
    ).subscribe({
      next: (rows: any) => {
        const safeRows = rows ?? [];
        ctx.scenarioMatrixSummaryResults.set(safeRows);
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          `${label} listo (${safeRows.length} escenarios x ${seedCount} seeds).`,
          'OK',
          { duration: 3500 }
        );
        if (safeRows.length > 0) {
          ctx.markReplayAnalysisReady(readyMessage);
        } else {
          ctx.analysisReadyMessage.set(
            `${label} no devolvió escenarios para Panel E. Verificá que el partido siga seleccionado y que el grupo tenga escenarios.`
          );
        }
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        const message = ctx.fmtError(err, `Failed to run ${label.toLowerCase()}`);
        ctx.analysisReadyMessage.set(
          `${label} no pudo generar Panel E: ${message}`
        );
        ctx.snackBar.open(
          message,
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessScenarioMatrixSmokeSeedCount(ctx: any): any {
    return 5;
  
}

export function runTestHarnessScenarioMatrixSummaryEffectiveSeedCount(ctx: any): any {
    return Math.max(20, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 20)));
  
}

export function runTestHarnessScrollToReplayAnalysis(ctx: any): any {
    document.getElementById('test-harness-replay-analysis')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  
}

export function runTestHarnessSelectedMatchCompareRoute(ctx: any): any {
    const careerId = ctx.careerId();
    const matchId = ctx.selectedMatchId();
    if (!careerId || !matchId) {
      return null;
    }
    return ['/careers', careerId, 'matches', matchId, 'compare'];
  
}

export function runTestHarnessSummarySeedEnd(ctx: any): any {
    return ctx.summarySeedStart() + ctx.scenarioMatrixSummarySeedCount() - 1;
  
}

export function runTestHarnessSummarySeedStart(ctx: any): any {
    return ctx.seedInputModel ?? 12345;
  
}

export function runTestHarnessTrackByFormationReplay(ctx: any, _index: any, row: any): any {
    return row.formation;
  
}

export function runTestHarnessTrackByRound(ctx: any, _index: any, r: any): any {
    return r.round;
  
}
