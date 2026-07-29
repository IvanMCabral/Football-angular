import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRunProfessionalSmoke(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.canRunScenarioSummaryForControlledSide()) {
      ctx.snackBar.open('Elegí Mi equipo, Local o Visitante válido para correr el smoke profesional.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const formationSeedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    const scenarioSeedCount = ctx.scenarioMatrixSmokeSeedCount();
    const controlledSide = ctx.controlledTeamSideModel;
    const controlledName = ctx.controlledTeamDisplayName();
    const runId = ++ctx.professionalSmokeRunId;
    ctx.clearFormationAverageResults();
    ctx.professionalSmokeSummary.set(null);
    ctx.scenarioMatrixSummaryResults.set([]);
    ctx.scenarioMatrixSummarySeedCount.set(formationSeedCount);
    ctx.analysisReadyMessage.set(
      `Smoke profesional corriendo para ${controlledName}: formaciones ${formationSeedCount} seeds + escenarios ${scenarioSeedCount} seeds...`
    );
    ctx.mutationInFlight.set(true);
    ctx.guardProfessionalSmokeTimeout(runId, controlledName, controlledSide, formationSeedCount, scenarioSeedCount);
    const stepTimeoutMs = 60_000;
    const formationRows$ = ctx.harness.runFormationMatrixSummary(matchId, seedStart, formationSeedCount, controlledSide).pipe(
      timeout(stepTimeoutMs),
      map((rows) => ({ rows: rows ?? [], issue: null as string | null })),
      catchError((err) => of({
        rows: [] as FormationMatrixSummaryRow[],
        issue: ctx.fmtError(err, `Formation avg timeout/error after ${stepTimeoutMs / 1000}s`),
      }))
    );
    const scenarioRows$ = ctx.harness.runScenarioMatrixSummary(matchId, seedStart, scenarioSeedCount, 'ALL', controlledSide).pipe(
      timeout(stepTimeoutMs),
      map((rows) => ({ rows: rows ?? [], issue: null as string | null })),
      catchError((err) => of({
        rows: [] as ScenarioMatrixSummaryRow[],
        issue: ctx.fmtError(err, `Scenario smoke timeout/error after ${stepTimeoutMs / 1000}s`),
      }))
    );
    ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
      switchMap(() => formationRows$.pipe(
        switchMap((formation) => scenarioRows$.pipe(
          map((scenario) => ({ formation, scenario }))
        ))
      ))
    ).subscribe({
      next: ({ formation, scenario }: any) => {
        if (runId !== ctx.professionalSmokeRunId) return;
        const safeFormationRows = formation.rows;
        const safeScenarioRows = scenario.rows;
        const stepIssues = [formation.issue, scenario.issue].filter((issue): issue is string => !!issue);
        ctx.formationMatrixSummaryResults.set(safeFormationRows);
        ctx.scenarioMatrixSummaryResults.set(safeScenarioRows);
        const userScope = controlledSide === 'USER';
        ctx.professionalSmokeSummary.set({
          controlledTeam: controlledName,
          scope: controlledSide,
          formationRows: safeFormationRows.length,
          scenarioRows: safeScenarioRows.length,
          pixelRows: 0,
          swapRows: 0,
          formationSeedCount,
          scenarioSeedCount,
          included: [
            `Formation avg: ${safeFormationRows.length} formaciones x ${formationSeedCount} seeds`,
            `Scenario smoke: ${safeScenarioRows.length} escenarios x ${scenarioSeedCount} seeds`,
            ...stepIssues,
          ],
          skipped: userScope
            ? [
                'Píxeles y swaps se corren desde sus botones dedicados para preservar evidencia detallada.',
                'Compare baseline/live queda disponible en Abrir comparador.',
              ]
            : [
                'Píxeles y swaps requieren lineup editable de Mi equipo; no se simulan para Local/Visitante.',
                'Compare baseline/live queda disponible en Abrir comparador.',
              ],
          read: `${controlledName}: ${safeFormationRows.length} formaciones · ${safeScenarioRows.length} escenarios · scope ${controlledSide}${stepIssues.length > 0 ? ' · revisar etapa lenta/fallida' : ''}.`,
        });
        ctx.markReplayAnalysisReady(
          `Smoke profesional listo para ${controlledName}: ${safeFormationRows.length} formaciones · ${safeScenarioRows.length} escenarios${stepIssues.length > 0 ? ' · con observaciones' : ''}.`
        );
        ctx.snackBar.open(
          `Smoke profesional listo: ${safeFormationRows.length} formaciones, ${safeScenarioRows.length} escenarios.`,
          'OK',
          { duration: 4500 }
        );
      },
      error: (err: any) => {
        if (runId !== ctx.professionalSmokeRunId) return;
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Smoke profesional falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'No se pudo correr smoke profesional'), 'OK', { duration: 6000 });
      },
      complete: () => {
        if (runId !== ctx.professionalSmokeRunId) return;
        ctx.mutationInFlight.set(false);
      },
    });
  
}

export function runTestHarnessOnRunProfessionalSmokeFull(ctx: any): any {
    if (ctx.controlledTeamSideModel !== 'USER' || !ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('El smoke full usa píxeles y swaps del lineup editable; poné Controlar en Mi equipo.', 'OK', { duration: 4500 });
      return;
    }
    if (!ctx.selectedMatchId()) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const runId = ++ctx.professionalSmokeFullRunId;
    ctx.professionalSmokeFullPixelRows = 0;
    ctx.guardProfessionalSmokeFullTimeout(runId);
    ctx.onRunProfessionalSmoke();
    ctx.waitForProfessionalSmokeStep('formation/scenario', () => {
      const baseSummary = ctx.professionalSmokeSummary();
      const baseSmokeNotes = [...(baseSummary?.skipped ?? []), ...(baseSummary?.included ?? [])];
      const baseHadIssue = baseSmokeNotes.some((item) => {
        const lower = item.toLowerCase();
        return lower.includes('timeout') || lower.includes('timed out') || lower.includes('error');
      });
      if (baseHadIssue) {
        ctx.analysisReadyMessage.set('Smoke profesional full sigue con píxeles/swaps: la etapa base tuvo observaciones, pero no se corta la evidencia restante.');
        ctx.snackBar.open('Smoke full: etapa base con observaciones; sigo con píxeles/swaps.', 'OK', { duration: 4500 });
      }
      ctx.runProfessionalSmokeFormationAuditStage(() => {
        if (runId !== ctx.professionalSmokeFullRunId) return;
        ctx.runProfessionalSmokePixelStage(() => {
          if (runId !== ctx.professionalSmokeFullRunId) return;
          ctx.professionalSmokeFullPixelRows = ctx.positionPixelMatrixRows().length;
          ctx.onRunPlayerSwapBattery({ preservePositionPixels: true });
          ctx.waitForProfessionalSmokeStep('cambios de jugador', () => {
            if (runId !== ctx.professionalSmokeFullRunId) return;
            ctx.runProfessionalSmokeSubstitutionStage(() => {
              if (runId !== ctx.professionalSmokeFullRunId) return;
              ctx.finalizeProfessionalSmokeFullSummary();
            });
          });
        });
      });
    });
  
}

export function runTestHarnessProfessionalQaActionEnabled(ctx: any, check: any): any {
    if (ctx.mutationInFlight()) return false;
    switch (check) {
      case 'All formations audit':
      case 'Defensive side mapping':
      case '3-4-1-2 spine':
      case 'Wide-role scarcity':
        return !!ctx.userTeamName();
      case 'Pixel movement signal':
      case 'Pixel no-cliff rule':
      case 'Señal cambio jugador':
        return !!ctx.selectedMatchId();
      default:
        return false;
    }
  
}

export function runTestHarnessProfessionalQaActionStatus(ctx: any, check: any): any {
    return ctx.professionalQaActionStatuses()[check] ?? null;
  
}

export function runTestHarnessProfessionalQaActionStatusClass(ctx: any, state: any): any {
    return getProfessionalQaActionStatusClass(state);
  
}

export function runTestHarnessProfessionalQaChecklistTestId(ctx: any, check: any): any {
    return getProfessionalQaChecklistTestId(check);
  
}

export function runTestHarnessProfessionalQaVerdictClass(ctx: any, verdict: any): any {
    return getProfessionalQaVerdictClass(verdict);
  
}

export function runTestHarnessProfessionalSmokeFinalVerdict(ctx: any): any {
    const checks = ctx.professionalQaChecklistRows();
    const total = checks.length;
    const ok = checks.filter((row: any) => row.verdict === 'OK').length;
    const fallback = checks.filter((row: any) => row.verdict === 'Fallback').length;
    const review = checks.filter((row: any) => row.verdict === 'Review').length;
    const pending = checks.filter((row: any) => row.verdict === 'Pending').length;
    const notes = [
      ...(ctx.professionalSmokeSummary()?.included ?? []),
      ...(ctx.professionalSmokeSummary()?.skipped ?? []),
    ].join(' ').toLowerCase();
    if (notes.includes('timeout') || notes.includes('timed out') || notes.includes('error') || notes.includes('fallo') || notes.includes('failed')) {
      return {
        verdict: 'Partial',
        detail: `${ok}/${total} checks OK, ${fallback} fallback aceptado, ${review} review, ${pending} pending; hubo etapa lenta/fallida.`,
      };
    }
    if (review > 0) {
      return {
        verdict: 'Fail',
        detail: `${review} check(s) requieren correccion antes de calibrar profesionalmente.`,
      };
    }
    if (pending > 0) {
      return {
        verdict: 'Review',
        detail: `${pending} check(s) quedaron pendientes; correrlos o integrarlos antes de cerrar QA.`,
      };
    }
    return {
      verdict: 'OK',
      detail: `${ok}/${total} checks OK${fallback > 0 ? `, ${fallback} fallback visible/penalizado` : ''}.`,
    };
  
}

export function runTestHarnessProfessionalSmokeVerdictClass(ctx: any, verdict: any): any {
    return getProfessionalSmokeVerdictClass(verdict);
  
}

export function runTestHarnessRunProfessionalQaChecklistQueue(ctx: any, queue: any, index: any): any {
    if (index >= queue.length) {
      ctx.ensureProfessionalQaPixelEvidenceStatuses();
      ctx.qaChecklistRunningAll.set(false);
      ctx.snackBar.open('Checklist QA completo.', 'OK', { duration: 3500 });
      return;
    }
    const check = queue[index];
    if (check !== 'All formations audit') {
      ctx.ensureProfessionalQaChecklistMatch();
    }
    if (!ctx.professionalQaActionEnabled(check)) {
      ctx.setProfessionalQaActionStatus(check, {
        state: 'error',
        message: check === 'All formations audit'
          ? 'Pendiente: falta carrera/equipo.'
          : 'Pendiente: seleccion? un partido.',
      });
      ctx.runProfessionalQaChecklistQueue(queue, index + 1);
      return;
    }
    ctx.onRunProfessionalQaAction(check);
    ctx.waitProfessionalQaChecklistStep(check, () => ctx.runProfessionalQaChecklistQueue(queue, index + 1));
  
}

export function runTestHarnessRunProfessionalSmokeFormationAuditStage(ctx: any, onComplete: any): any {
    const matches = ctx.userTeamMatches()
      .filter((match: any) => match.status === 'COMPLETED')
      .slice(0, 3);
    const current = ctx.professionalSmokeSummary();
    if (matches.length === 0) {
      ctx.professionalSmokeSummary.set({
        controlledTeam: current?.controlledTeam ?? ctx.controlledTeamDisplayName(),
        scope: 'USER',
        formationRows: current?.formationRows ?? ctx.formationMatrixSummaryResults().length,
        scenarioRows: current?.scenarioRows ?? ctx.scenarioMatrixSummaryResults().length,
        formationAuditRows: 0,
        formationAuditFallbackRows: 0,
        formationAuditReviewRows: 0,
        pixelRows: current?.pixelRows ?? 0,
        swapRows: current?.swapRows ?? 0,
        formationSeedCount: current?.formationSeedCount ?? ctx.scenarioMatrixSummaryEffectiveSeedCount(),
        scenarioSeedCount: current?.scenarioSeedCount ?? ctx.scenarioMatrixSmokeSeedCount(),
        included: current?.included ?? [],
        skipped: [
          ...(current?.skipped ?? []),
          'Auditoría todas las formaciones omitido: no hay partidos completados del usuario.',
        ],
        read: current?.read ?? `${ctx.controlledTeamDisplayName()}: smoke full en progreso.`,
      });
      onComplete();
      return;
    }
    ctx.clearFormationLineAuditResults();
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set('Smoke profesional full: auditando slots/lados de todas las formaciones...');
    ctx.buildAllFormationsLineAuditRows$(matches.length).pipe(
      timeout(60_000),
      map((result) => ({ result, issue: null as string | null })),
      catchError((err) => of({
        result: { rows: [] as FormationLineSmokeRow[], last: null as LineupDTO | null },
        issue: ctx.fmtError(err, 'Auditoría todas las formaciones timeout/error'),
      }))
    ).subscribe({
      next: ({ result, issue }: any) => {
        const before = ctx.professionalSmokeSummary();
        if (!issue) {
          ctx.applyAllFormationsLineAuditRows(result.rows, result.last);
        }
        const rows = ctx.formationLineSmokeRows();
        const fallbackRows = rows.filter((row: any) => row.verdict === 'Fallback').length;
        const reviewRows = rows.filter((row: any) => row.verdict === 'Review').length;
        ctx.professionalSmokeSummary.set({
          controlledTeam: before?.controlledTeam ?? ctx.controlledTeamDisplayName(),
          scope: 'USER',
          formationRows: before?.formationRows ?? ctx.formationMatrixSummaryResults().length,
          scenarioRows: before?.scenarioRows ?? ctx.scenarioMatrixSummaryResults().length,
          formationAuditRows: rows.length,
          formationAuditFallbackRows: fallbackRows,
          formationAuditReviewRows: reviewRows,
          pixelRows: before?.pixelRows ?? 0,
          swapRows: before?.swapRows ?? 0,
          formationSeedCount: before?.formationSeedCount ?? ctx.scenarioMatrixSummaryEffectiveSeedCount(),
          scenarioSeedCount: before?.scenarioSeedCount ?? ctx.scenarioMatrixSmokeSeedCount(),
          included: [
            ...(before?.included ?? []),
            issue ?? `Auditoría todas las formaciones: ${rows.length} checks · ${fallbackRows} fallback · ${reviewRows} review`,
          ],
          skipped: before?.skipped ?? [],
          read: before?.read ?? `${ctx.controlledTeamDisplayName()}: smoke full en progreso.`,
        });
      },
      error: (err: any) => {
        const before = ctx.professionalSmokeSummary();
        ctx.professionalSmokeSummary.set({
          controlledTeam: before?.controlledTeam ?? ctx.controlledTeamDisplayName(),
          scope: 'USER',
          formationRows: before?.formationRows ?? ctx.formationMatrixSummaryResults().length,
          scenarioRows: before?.scenarioRows ?? ctx.scenarioMatrixSummaryResults().length,
          formationAuditRows: ctx.formationLineSmokeRows().length,
          formationAuditFallbackRows: ctx.formationLineSmokeRows().filter((row: any) => row.verdict === 'Fallback').length,
          formationAuditReviewRows: ctx.formationLineSmokeRows().filter((row: any) => row.verdict === 'Review').length,
          pixelRows: before?.pixelRows ?? 0,
          swapRows: before?.swapRows ?? 0,
          formationSeedCount: before?.formationSeedCount ?? ctx.scenarioMatrixSummaryEffectiveSeedCount(),
          scenarioSeedCount: before?.scenarioSeedCount ?? ctx.scenarioMatrixSmokeSeedCount(),
          included: before?.included ?? [],
          skipped: [
            ...(before?.skipped ?? []),
            ctx.fmtError(err, 'Auditoría todas las formaciones falló dentro del smoke full'),
          ],
          read: before?.read ?? `${ctx.controlledTeamDisplayName()}: smoke full en progreso.`,
        });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        onComplete();
      },
    });
  
}

export function runTestHarnessSetProfessionalQaActionStatus(ctx: any, check: any, status: any): any {
    const checklistRow = status.state === 'done'
      ? ctx.professionalQaChecklistRows().find((row: any) => row.check === check)
      : null;
    const pixelDoneWithoutRows = status.state === 'done'
      && ['Pixel movement signal', 'Pixel no-cliff rule'].includes(check)
      && ctx.positionPixelMatrixRows().length === 0;
    if (pixelDoneWithoutRows && !ctx.positionPixelEvidenceNote()) {
      ctx.positionPixelEvidenceNote.set(`${check}: termin? sin evidencia numérica. Revisar partido seleccionado, candidatos reales DEF/MID/ATT y respuesta del motor.`);
    }
    const pixelDoneWithoutOk = status.state === 'done'
      && ['Pixel movement signal', 'Pixel no-cliff rule'].includes(check)
      && checklistRow?.verdict !== 'OK';
    const safeStatus: ProfessionalQaActionStatus = checklistRow?.verdict === 'Pending' || pixelDoneWithoutRows || pixelDoneWithoutOk
      ? {
          state: 'error',
          message: 'Sin evidencia nueva: revisar si este check produjo filas.',
        }
      : status;
    ctx.professionalQaActionStatuses.update((statuses: any) => ({
      ...statuses,
      [check]: safeStatus,
    }));
  
}

export function runTestHarnessTrackByProfessionalQaChecklistRow(ctx: any, _index: any, row: any): any {
    return row.check;
  
}

export function runTestHarnessWaitForProfessionalSmokeStep(ctx: any, label: any, next: any, attempts: any): any {
    window.setTimeout(() => {
      if (attempts > 240) {
        ctx.snackBar.open(`Smoke profesional full: timeout esperando ${label}.`, 'OK', { duration: 5000 });
        return;
      }
      if (ctx.mutationInFlight()) {
        ctx.waitForProfessionalSmokeStep(label, next, attempts + 1);
        return;
      }
      next();
    }, 500);
  
}

export function runTestHarnessWaitProfessionalQaChecklistStep(ctx: any, check: any, next: any): any {
    window.setTimeout(() => {
      const status = ctx.professionalQaActionStatus(check);
      if (ctx.mutationInFlight() || status?.state === 'running') {
        ctx.waitProfessionalQaChecklistStep(check, next);
        return;
      }
      ctx.ensureProfessionalQaEvidenceStatus(check);
      next();
    }, 500);
  
}

export function runTestHarnessWatchProfessionalQaActionCompletion(ctx: any, check: any): any {
    window.setTimeout(() => {
      if (ctx.mutationInFlight()) {
        ctx.watchProfessionalQaActionCompletion(check);
        return;
      }
      const message = ctx.analysisReadyMessage() ?? 'Acción finalizada.';
      const failed = /fall[o?]|failed|error/i.test(message);
      const checklistRow = ctx.professionalQaChecklistRows().find((row: any) => row.check === check);
      const missingEvidence = !failed && checklistRow?.verdict === 'Pending';
      ctx.setProfessionalQaActionStatus(check, {
        state: failed || missingEvidence ? 'error' : 'done',
        message: failed
          ? 'Fall?: revisar mensaje del panel.'
          : missingEvidence
            ? 'Sin evidencia nueva: revisar si este check produjo filas.'
            : 'Listo: diagnóstico actualizado.',
      });
    }, 350);
  
}
