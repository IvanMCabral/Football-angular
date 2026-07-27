import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessEnsureProfessionalQaChecklistMatch(ctx: any): any {
    const selectedId = ctx.selectedMatchId();
    const userMatches = ctx.userTeamMatches();
    const selectedStillExists = selectedId
      ? userMatches.some((candidate: any) => candidate.matchId === selectedId)
      : false;
    if (selectedId && selectedStillExists && ctx.selectedMatchIncludesUserTeam()) {
      return;
    }
    const match =
      userMatches.find((candidate: any) => String(candidate.status).toUpperCase() === 'COMPLETED') ??
      ctx.scenarioBatteryCandidateMatches()[0] ??
      null;
    if (!match) {
      return;
    }
    ctx.selectMatch(match);
  
}

export function runTestHarnessEnsureProfessionalQaEvidenceStatus(ctx: any, check: any): any {
    if (!['Pixel movement signal', 'Pixel no-cliff rule'].includes(check)) {
      return;
    }
    const checklistRow = ctx.professionalQaChecklistRows().find((row: any) => row.check === check);
    if (checklistRow?.verdict === 'OK') {
      return;
    }
    const diagnostics = ctx.lastPositionPixelRunDiagnostics();
    const responseDiagnostics = ctx.lastPositionPixelResponseDiagnostics();
    const mappedRowsFromDiagnostics = Number(responseDiagnostics?.match(/mapped=(\d+)/)?.[1] ?? 0);
    const mappedRows = Math.max(ctx.positionPixelMatrixRows().length, ctx.lastPositionPixelMappedRows(), mappedRowsFromDiagnostics);
    if (mappedRows > 0) {
      ctx.positionPixelEvidenceNote.set(null);
      ctx.setProfessionalQaActionStatus(check, {
        state: checklistRow?.verdict === 'Review' ? 'error' : 'done',
        message: checklistRow?.verdict === 'Review'
          ? `Hay ${mappedRows} filas mapeadas, pero sin señal suficiente; revisar sensibilidad/seeds. ${responseDiagnostics ?? ''}`
          : `${mappedRows} filas mapeadas con contrato válido. ${responseDiagnostics ?? ''}`,
      });
      return;
    }
    const note = diagnostics
      ? `${check}: termin? sin evidencia numérica. ${diagnostics} ${responseDiagnostics ?? ''} Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`
      : `${check}: termin? sin evidencia numérica. Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`;
    if (!ctx.positionPixelEvidenceNote()) {
      ctx.positionPixelEvidenceNote.set(note);
    }
    ctx.setProfessionalQaActionStatus(check, {
      state: 'error',
      message: checklistRow?.verdict === 'Review'
        ? 'Revisión necesaria: el resultado no cumple contrato OK.'
        : 'Sin evidencia nueva: revisar si este check produjo filas.',
    });
  
}

export function runTestHarnessFinalizeProfessionalSmokeFullSummary(ctx: any): any {
    const current = ctx.professionalSmokeSummary();
    const controlledName = ctx.controlledTeamDisplayName();
    const pixelRows = ctx.professionalSmokeFullPixelRows || ctx.positionPixelMatrixRows().length;
    const swapRows = ctx.playerSwapBatterySummaries().length;
    const substitutionRows = ctx.substitutionWhatIfSummary() ? 1 : 0;
    const baseIncluded = current?.included ?? [];
    const auditRows = ctx.formationLineSmokeRows().length;
    const auditFallbackRows = ctx.formationLineSmokeRows().filter((row: any) => row.verdict === 'Fallback').length;
    const auditReviewRows = ctx.formationLineSmokeRows().filter((row: any) => row.verdict === 'Review').length;
    const finalVerdict = ctx.professionalSmokeFinalVerdict();
    const skipped = [
      ...((current?.skipped ?? []).filter((item: any) => {
        const lower = item.toLowerCase();
        return !lower.includes('píxeles y swaps') && !lower.includes('compare baseline/live');
      })),
      'Compare baseline/live queda disponible en Abrir comparador.',
    ];
    const filteredSkipped = skipped.filter((item) => !item.toLowerCase().includes('preservar evidencia detallada'));
    const finalRead = `${controlledName}: smoke full · ${current?.formationRows ?? ctx.formationMatrixSummaryResults().length} formaciones · ${current?.scenarioRows ?? ctx.scenarioMatrixSummaryResults().length} escenarios · ${pixelRows} píxeles · ${swapRows} swaps · ${substitutionRows} sustituciones.`;
    ctx.professionalSmokeSummary.set({
      controlledTeam: current?.controlledTeam ?? controlledName,
      scope: 'USER',
      verdict: finalVerdict.verdict,
      verdictDetail: finalVerdict.detail,
      formationRows: current?.formationRows ?? ctx.formationMatrixSummaryResults().length,
      scenarioRows: current?.scenarioRows ?? ctx.scenarioMatrixSummaryResults().length,
      formationAuditRows: auditRows,
      formationAuditFallbackRows: auditFallbackRows,
      formationAuditReviewRows: auditReviewRows,
      pixelRows,
      swapRows,
      substitutionRows,
      formationSeedCount: current?.formationSeedCount ?? ctx.scenarioMatrixSummaryEffectiveSeedCount(),
      scenarioSeedCount: current?.scenarioSeedCount ?? ctx.scenarioMatrixSmokeSeedCount(),
      included: [
        ...baseIncluded,
        `Pixel sensitivity: ${pixelRows} filas`,
        `Batería cambio jugador: ${swapRows} cambios`,
        `Simular sustitución: ${substitutionRows} caso(s)`,
      ],
      skipped: filteredSkipped,
      read: finalRead,
    });
    ctx.markReplayAnalysisReady(`Smoke profesional full listo para ${controlledName}: ${pixelRows} píxeles · ${swapRows} swaps · ${substitutionRows} sustituciones.`);
    ctx.snackBar.open(`Smoke profesional completo listo: ${pixelRows} filas píxel, ${swapRows} swaps, ${substitutionRows} sustituciones.`, 'OK', { duration: 4500 });
  
}

export function runTestHarnessGuardProfessionalSmokeFullTimeout(ctx: any, runId: any): any {
    window.setTimeout(() => {
      if (runId !== ctx.professionalSmokeFullRunId || !ctx.mutationInFlight()) return;
      const controlledName = ctx.controlledTeamDisplayName();
      const pixelRows = ctx.professionalSmokeFullPixelRows || ctx.positionPixelMatrixRows().length;
      const swapRows = ctx.playerSwapBatterySummaries().length;
      const substitutionRows = ctx.substitutionWhatIfSummary() ? 1 : 0;
      const formationRows = ctx.formationMatrixSummaryResults().length;
      const scenarioRows = ctx.scenarioMatrixSummaryResults().length;
      ctx.professionalSmokeFullRunId++;
      ctx.mutationInFlight.set(false);
      ctx.professionalSmokeSummary.set({
        controlledTeam: controlledName,
        scope: 'USER',
        verdict: 'Partial',
        verdictDetail: 'Smoke cortado por timeout defensivo; usar solo como evidencia parcial.',
        formationRows,
        scenarioRows,
        formationAuditRows: ctx.formationLineSmokeRows().length,
        formationAuditFallbackRows: ctx.formationLineSmokeRows().filter((row: any) => row.verdict === 'Fallback').length,
        formationAuditReviewRows: ctx.formationLineSmokeRows().filter((row: any) => row.verdict === 'Review').length,
        pixelRows,
        swapRows,
        substitutionRows,
        formationSeedCount: ctx.scenarioMatrixSummaryEffectiveSeedCount(),
        scenarioSeedCount: ctx.scenarioMatrixSmokeSeedCount(),
        included: [
          `Formation avg: ${formationRows} formaciones`,
          `Scenario smoke: ${scenarioRows} escenarios`,
          `Pixel sensitivity: ${pixelRows} filas`,
          `Batería cambio jugador: ${swapRows} cambios`,
          `Simular sustitución: ${substitutionRows} caso(s)`,
        ],
        skipped: ['Smoke full cortado por timeout defensivo; revisar etapa lenta antes de calibrar.'],
        read: `${controlledName}: smoke full parcial por timeout · ${formationRows} formaciones · ${scenarioRows} escenarios · ${pixelRows} píxeles · ${swapRows} swaps.`,
      });
      ctx.analysisReadyMessage.set('Smoke profesional full cortado por timeout defensivo. Resultados parciales abajo.');
      ctx.snackBar.open('Smoke profesional full timeout: resultados parciales disponibles.', 'OK', { duration: 6000 });
    }, 240_000);
  
}

export function runTestHarnessGuardProfessionalSmokeTimeout(ctx: any, runId: any, controlledName: any, controlledSide: any, formationSeedCount: any, scenarioSeedCount: any): any {
    window.setTimeout(() => {
      if (runId !== ctx.professionalSmokeRunId || !ctx.mutationInFlight()) return;
      const formationRows = ctx.formationMatrixSummaryResults().length;
      const scenarioRows = ctx.scenarioMatrixSummaryResults().length;
      ctx.professionalSmokeRunId++;
      ctx.mutationInFlight.set(false);
      ctx.professionalSmokeSummary.set({
        controlledTeam: controlledName,
        scope: controlledSide,
        formationRows,
        scenarioRows,
        pixelRows: 0,
        swapRows: 0,
        formationSeedCount,
        scenarioSeedCount,
        included: [
          `Formation avg: ${formationRows} formaciones`,
          `Scenario smoke: ${scenarioRows} escenarios`,
        ],
        skipped: ['Smoke profesional cortado por timeout defensivo; revisar partido/endpoint lento antes de calibrar.'],
        read: `${controlledName}: professional smoke parcial por timeout · ${formationRows} formaciones · ${scenarioRows} escenarios · scope ${controlledSide}.`,
      });
      ctx.analysisReadyMessage.set('Smoke profesional cortado por timeout defensivo. Resultados parciales abajo.');
      ctx.snackBar.open('Smoke profesional timeout: resultados parciales disponibles.', 'OK', { duration: 6000 });
    }, 150_000);
  
}

export function runTestHarnessLineupAssignmentVerdictClass(ctx: any, verdict: any): any {
    if (verdict === 'OK') return 'assignment-verdict assignment-ok';
    if (verdict === 'Revisar lado' || verdict === 'Revisar rol') return 'assignment-verdict assignment-review';
    return 'assignment-verdict assignment-neutral';
  
}

export function runTestHarnessLineupWidthVerdictClass(ctx: any, verdict: any): any {
    if (verdict === 'OK') return 'width-ok';
    if (verdict === 'Parcial' || verdict === 'Estrecha') return 'width-partial';
    return 'width-review';
  
}

export function runTestHarnessOnRunFullPositionSmokeBoard(ctx: any): any {
    const seedCount = Math.max(10, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 10)));
    const matches = ctx.userTeamMatches()
      .filter((match: any) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      ctx.snackBar.open(`No completed ${ctx.userTeamName() || 'user team'} matches available for full position board.`, 'OK', { duration: 4000 });
      return;
    }
    const scopes: PositionPixelSmokeScope[] = ['ALL', 'DEF', 'MID', 'ATT'];
    ctx.positionPixelSmokeRunSummaries.set([]);
    const runScope = (index: number): void => {
      const scope = scopes[index];
      if (!scope) {
        ctx.snackBar.open('Tablero completo posición complete.', 'OK', { duration: 4500 });
        ctx.markReplayAnalysisReady('Tablero completo posición listo en Panel E.');
        return;
      }
      if (scope === 'ALL') {
        ctx.runPositionPixelMatrixWithPresets(
          seedCount,
          (fromX: any, fromY: any) => ctx.positionMovementPresets(fromX, fromY)
            .filter((preset: any) => [
              '5px forward',
              '5px deeper',
              '5px wide',
              '5px center',
              '5px wide forward',
              '5px wide deeper',
              '5px center forward',
              '5px center deeper',
              'big zone cross',
            ].includes(preset.label)),
      'Full board · ALL',
          matches,
          null,
          null,
          true,
          'ALL',
          () => runScope(index + 1)
        );
        return;
      }
      ctx.runPositionPixelMatrixWithPresets(
        seedCount,
        (fromX: any, fromY: any) => ctx.positionMovementPresets(fromX, fromY)
          .filter((preset: any) => ['5px forward', '5px deeper', '5px wide', '5px center'].includes(preset.label)),
      `Full board · ${scope}`,
        matches,
        (lineup: any) => ctx.pickPositionPixelLineCandidates(lineup, scope, 6),
        scope,
        true,
        scope,
        () => runScope(index + 1)
      );
    };
    runScope(0);
  
}

export function runTestHarnessOnRunLastModalMovePositionSmoke(ctx: any): any {
    const modalMove = ctx.readLastModalPositionMoveCase();
    if (!modalMove) {
      ctx.snackBar.open('No hay último movimiento del modal guardado. Mové un jugador en Editar Formación Visual primero.', 'OK', { duration: 5000 });
      return;
    }
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = Math.max(10, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 10)));
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    ctx.clearReplayAnalysisResultsForLatestRun();
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Último movimiento modal: preparando ${modalMove.playerName} (${seedCount} seeds)...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    ctx.harness.resetInjuries().pipe(
      take(1),
      switchMap(() => ctx.harness.getCurrentLineup()),
      switchMap((originalLineup) => {
        const originalSlots = ctx.buildLineupSlots(originalLineup);
        const originalPlayerIds = ctx.lineupPlayerIdsFromSlots(originalSlots);
        restore = {
          formation: (originalLineup as any).formation ?? modalMove.formation ?? ctx.selectedFormationModel ?? '4-4-2',
          playerIds: originalPlayerIds,
          slots: originalSlots,
        };
        const baselineSlots = ctx.baselineSlotsForLastModalMove(originalSlots, modalMove);
        if (!baselineSlots) {
          throw new Error(`No pude encontrar al jugador ${modalMove.playerName} en el XI actual para reconstruir el antes del movimiento.`);
        }
        return ctx.harness.manualSelectLineup(restore.formation, originalPlayerIds, baselineSlots);
      }),
      switchMap(() => ctx.harness.runPositionPixelMatrixSummary(matchId, {
        playerId: modalMove.playerId,
        targetXPercent: modalMove.targetXPercent,
        targetYPercent: modalMove.targetYPercent,
        deltaXPercent: modalMove.deltaXPercent,
        deltaYPercent: modalMove.deltaYPercent,
        seedStart,
        seedCount,
        controlledTeamSide: ctx.controlledTeamSideModel,
      })),
      finalize(() => {
        if (restore) {
          ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(take(1)).subscribe({
            error: (err: any) => ctx.logHarnessRestoreWarning(err),
          });
        }
      })
    ).subscribe({
      next: (row: any) => {
        const label = `modal ${modalMove.playerName}: ${modalMove.fromXPercent.toFixed(1)},${modalMove.fromYPercent.toFixed(1)} -> ${modalMove.targetXPercent.toFixed(1)},${modalMove.targetYPercent.toFixed(1)}`;
        const summary = ctx.toPositionPixelMatrixSummary(row, label);
        ctx.positionPixelMatrixRows.set([summary]);
        ctx.positionPixelMatrixSummary.set(summary);
        ctx.lineupDebugSnapshot.set({
          label: 'Último movimiento modal',
          formation: modalMove.formation,
          selectedFormation: ctx.selectedFormationModel ?? modalMove.formation,
          playerCount: 1,
          nonGkCount: 1,
          persistedSlotCount: 1,
          effectiveSlotCount: 1,
          candidatesCount: 1,
          visualLineFilter: 'LAST_MODAL_MOVE',
          rows: [
            {
              index: 1,
              playerId: modalMove.playerId,
              name: `${modalMove.playerName} (antes)`,
              position: modalMove.playerPosition ?? modalMove.playerRole ?? '?',
              slotId: modalMove.slotId ?? row.slotId,
              x: modalMove.fromXPercent,
              y: modalMove.fromYPercent,
              visualLine: ctx.positionPixelVisualLine(modalMove.fromYPercent),
              source: 'persisted',
            },
            {
              index: 2,
              playerId: modalMove.playerId,
              name: `${modalMove.playerName} (después)`,
              position: modalMove.playerPosition ?? modalMove.playerRole ?? '?',
              slotId: modalMove.slotId ?? row.slotId,
              x: modalMove.targetXPercent,
              y: modalMove.targetYPercent,
              visualLine: ctx.positionPixelVisualLine(modalMove.targetYPercent),
              source: 'persisted',
            },
          ],
          warnings: modalMove.coachReadTitle ? [modalMove.coachReadTitle] : [],
        });
        ctx.markReplayAnalysisReady(`Último movimiento modal listo: ${modalMove.playerName}.`);
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Último movimiento modal falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run last modal move'), 'OK', { duration: 5000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(`Último movimiento modal listo: ${modalMove.playerName}, ${seedCount} seeds.`, 'OK', { duration: 4500 });
      },
    });
  
}

export function runTestHarnessOnRunManualShapeVsPresetSmoke(ctx: any): any {
    const seedCount = Math.max(20, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 20)));
    ctx.clearReplayAnalysisResultsForLatestRun();
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any, candidate: any) => ctx.manualShapeVsPresetPresets(fromX, fromY, candidate),
      'Forma manual vs preset',
      null,
      (lineup: any) => ctx.pickManualShapeVsPresetCandidates(lineup),
      null,
      false
    );
  
}

export function runTestHarnessOnRunProfessionalQaAction(ctx: any, check: any): any {
    if (!ctx.professionalQaActionEnabled(check)) {
      ctx.snackBar.open('Seleccioná un partido o esperá a que termine la acción actual.', 'OK', { duration: 3000 });
      return;
    }
    ctx.setProfessionalQaActionStatus(check, {
      state: 'running',
      message: 'En curso...',
    });
    switch (check) {
      case 'All formations audit':
        ctx.onRunAllFormationsLineAudit();
        ctx.watchProfessionalQaActionCompletion(check);
        return;
      case 'Defensive side mapping':
      case '3-4-1-2 spine':
      case 'Wide-role scarcity':
        ctx.onRunCurrentFormationLineAudit();
        ctx.watchProfessionalQaActionCompletion(check);
        return;
      case 'Pixel movement signal':
        ctx.onRunFullPositionSmokeBoard();
        ctx.watchProfessionalQaActionCompletion(check);
        return;
      case 'Pixel no-cliff rule':
        ctx.onRunPositionSensitivityCheck();
        ctx.watchProfessionalQaActionCompletion(check);
        return;
      case 'Señal cambio jugador':
        ctx.onRunPlayerSwapBattery();
        ctx.watchProfessionalQaActionCompletion(check);
        return;
      default:
        ctx.snackBar.open('Este check todavía no tiene acción directa.', 'OK', { duration: 3000 });
    }
  
}

export function runTestHarnessOnRunProfessionalQaChecklist(ctx: any): any {
    if (ctx.qaChecklistRunningAll() || ctx.mutationInFlight()) return;
    ctx.ensureProfessionalQaChecklistMatch();
    const queue = [
      'All formations audit',
      'Pixel movement signal',
      'Pixel no-cliff rule',
      'Señal cambio jugador',
    ];
    ctx.qaChecklistRunningAll.set(true);
    window.setTimeout(() => ctx.runProfessionalQaChecklistQueue(queue, 0), 250);
  
}
