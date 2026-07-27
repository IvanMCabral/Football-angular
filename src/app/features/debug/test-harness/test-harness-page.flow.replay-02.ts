import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessDownloadFormationMatrixCsv(ctx: any): any {
    const rows = ctx.formationReplayResults();
    const header = [
      'formation', 'homeGoals', 'awayGoals', 'homePossession', 'awayPossession',
      'homeShots', 'awayShots', 'homeXg', 'awayXg',
      'homeCentralShots', 'homeWideShots', 'homeLongShots',
      'awayCentralShots', 'awayWideShots', 'awayLongShots',
    ];
    const lines = ctx.csvLines(header, rows);
    ctx.downloadCsv(lines, `formation-matrix-${ctx.seedInputModel ?? 'auto'}.csv`);
    ctx.snackBar.open(`Matriz formaciones CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  
}

export function runTestHarnessFormationMatrixDisabledReason(ctx: any): any {
    if (ctx.mutationInFlight()) {
      return 'Hay una prueba corriendo; espera a que termine.';
    }
    if (!ctx.selectedMatchId()) {
      return 'Selecciona un partido completado del Panel C.';
    }
    return `Ejecutar matriz de formaciones para ${ctx.controlledTeamDisplayName()}.`;
  
}

export function runTestHarnessMarkReplayAnalysisReady(ctx: any, message: any): any {
    ctx.analysisReadyMessage.set(`${message} Resultados listos abajo.`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
  
}

export function runTestHarnessOnPlayerSwapSeedCountChange(ctx: any, value: any): any {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      ctx.playerSwapSeedCountModel = 3;
      return;
    }
    ctx.playerSwapSeedCountModel = Math.max(1, Math.min(50, Math.round(n)));
  
}

export function runTestHarnessOnReplayCurrentLineup(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open(
        `Pick a match involving ${ctx.userTeamName() || 'your team'} before replaying the current lineup.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    ctx.currentLineupReplayResult.set(null);
    ctx.mutationInFlight.set(true);
    ctx.harness.getCurrentLineup().pipe(
      switchMap((lineup) =>
        ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() => ctx.harness.replayMatch(matchId, ctx.seedInputModel)),
          switchMap((fixture) =>
            ctx.matchDetailApi.getMatchDetail(careerId, matchId).pipe(
              catchError(() => of(null)),
              map((detail) => ctx.buildCurrentLineupReplayResult(lineup, fixture, detail))
            )
          )
        )
      ),
      timeout(CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS),
      finalize(() => ctx.mutationInFlight.set(false))
    ).subscribe({
      next: (result: any) => {
        ctx.currentLineupReplayResult.set(result);
        ctx.snackBar.open(
          `Current lineup replayed (${result.score}, seed=${result.seed ?? 'auto'}).`,
          'OK',
          { duration: 3500 }
        );
        ctx.markReplayAnalysisReady('Current lineup replay listo en Panel E.');
        ctx.loadMatches();
        ctx.refreshDetailAfterMutation();
        ctx.refreshDetailAfterMutation(1200);
      },
      error: (err: any) => {
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to replay current lineup'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnReplayWithSeed(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.replayStatusMessage.set('Elegí un partido en Panel C antes de repetir con seed.');
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const seedDesc =
      ctx.seedInputModel !== null
        ? `seed=${ctx.seedInputModel}`
        : 'seed no reproducible';
    ctx.replayStatusMessage.set(
      `Repitiendo ${ctx.selectedMatchLabel()} con ${seedDesc} y foco ${ctx.selectedStyleLabel()}...`
    );
    ctx.mutationInFlight.set(true);
    ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
      switchMap(() => ctx.harness.replayMatch(matchId, ctx.seedInputModel)),
      timeout(SINGLE_MATCH_REPLAY_TIMEOUT_MS),
      finalize(() => ctx.mutationInFlight.set(false))
    ).subscribe({
      next: (fixture: any) => {
        const score =
          fixture?.result != null
            ? ` ? ${fixture.result.homeGoals}-${fixture.result.awayGoals}`
            : '';
        const status = fixture?.status ? String(fixture.status).toUpperCase() : 'sin estado';
        const visualScore = fixture?.result != null
          ? `${fixture.result.homeGoals}-${fixture.result.awayGoals}`
          : 'sin marcador';
        ctx.replayStatusMessage.set(
          `Replay listo: ${ctx.selectedMatchLabel()} quedó ${status}, resultado ${visualScore}. ` +
          'Panel A/D se actualizan con el detalle; si querés comparar contra el vivo, abrí el comparador.'
        );
        ctx.snackBar.open(
          `Match replayed (${seedDesc}, ${ctx.selectedStyleLabel()})${score}.`,
          'OK',
          { duration: 3000 }
        );
        // The match list will update too ? reload so Panel C reflects the
        // new score, then refresh Panel A + D (existing pattern).
        ctx.loadMatches();
        ctx.refreshDetailAfterMutation();
        ctx.refreshDetailAfterMutation(1200);
        // The replay endpoint persists fixture and match detail, and
        // Match Compare can already read the new live detail. In the harness,
        // however, Panel A is an embedded detail page and can briefly repaint
        // from the previous request if the immediate refresh wins the race.
        // Keep one late refresh so the visible Panel A settles on the same
        // data as /detail and /compare without requiring the manager to
        // reselect the match.
        ctx.refreshDetailAfterMutation(2500);
      },
      error: (err: any) => {
        ctx.replayStatusMessage.set(
          `No se pudo repetir el partido con seed: ${ctx.fmtError(err, 'error desconocido')}`
        );
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to replay match'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnRoundSelect(ctx: any, value: any): any {
    ctx.selectedRoundModel = typeof value === 'number' ? value : null;
  
}

export function runTestHarnessOnRunCurrentLineupMultiSeed(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open(
        `Pick a match involving ${ctx.userTeamName() || 'your team'} before running the current lineup multi-seed summary.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = CURRENT_LINEUP_MULTI_SEED_COUNT;
    ctx.currentLineupMultiSeedSummary.set(null);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`XI actual multi-seed corriendo: ${seedCount} seeds...`);
    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((lineup) =>
        ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() => ctx.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER')),
          map((preview) => ctx.currentLineupSummaryFromPreview(lineup, preview))
        )
      )
    ).subscribe({
      next: (summary: any) => {
        ctx.currentLineupMultiSeedSummary.set(summary);
        ctx.snackBar.open(
          `XI actual multi-seed complete (${summary.seedCount} seeds, avg xG ${ctx.fmtXg(summary.avgXgFor)}-${ctx.fmtXg(summary.avgXgAgainst)}).`,
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('XI actual multi-seed listo en Panel E.');
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to run current lineup multi-seed summary'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.loadMatches();
        ctx.refreshDetailAfterMutation();
        ctx.refreshDetailAfterMutation(1200);
      },
    });
  
}

export function runTestHarnessOnRunFormationMatrix(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const careerId = ctx.careerId();
    if (!careerId) {
      ctx.snackBar.open('Active career id is not available.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const seed = ctx.seedInputModel;
    ctx.formationReplayResults.set([]);
    ctx.mutationInFlight.set(true);
    const runMatrix$ = ctx.controlledTeamSideModel === 'USER'
      ? ctx.harness.getCurrentLineup().pipe(
        switchMap((originalLineup) => {
          const originalFormation =
            (originalLineup as any)?.formation || ctx.selectedFormationModel || null;
          const originalPlayerIds =
            (originalLineup as any)?.players?.map((p: any) => p.playerId).filter(Boolean) ?? [];
          const originalSlots = (originalLineup as any)?.slots ?? [];
          if (originalPlayerIds.length !== 11) {
            throw new Error(
              `Matriz formaciones needs exactly 11 current lineup players, got ${originalPlayerIds.length}.`
            );
          }
          return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
            switchMap(() => ctx.harness.runFormationMatrix(matchId, seed, ctx.controlledTeamSideModel)),
            switchMap((rows) => {
              const mappedRows = (rows as any).map((row: any) => ctx.buildFormationReplayResultFromMatrix(row));
              ctx.formationReplayResults.set(mappedRows);
              if (!originalFormation) {
                return of(mappedRows);
              }
              return ctx.harness.manualSelectLineup(
                originalFormation,
                originalPlayerIds,
                originalSlots
              ).pipe(map(() => mappedRows));
            })
          );
        })
      )
      : ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
        switchMap(() => ctx.harness.runFormationMatrix(matchId, seed, ctx.controlledTeamSideModel)),
        map((rows) => {
          const mappedRows = (rows as any).map((row: any) => ctx.buildFormationReplayResultFromMatrix(row));
          ctx.formationReplayResults.set(mappedRows);
          return mappedRows;
        })
      );
    runMatrix$.subscribe({
      next: () => {
        // The backend returns the complete matrix in one response.
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to run formation matrix'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        if (ctx.controlledTeamSideModel === 'USER') {
          ctx.refreshLineupContext();
        }
        ctx.snackBar.open(
          `Matriz formaciones lista (${ctx.formationReplayResults().length} formaciones).`,
          'OK',
          { duration: 3000 }
        );
        ctx.markReplayAnalysisReady('Matriz formaciones lista en Panel E.');
        ctx.loadMatches();
        ctx.refreshDetailAfterMutation();
        ctx.refreshDetailAfterMutation(1200);
      },
    });
  
}

export function runTestHarnessOnRunFormationMatrixSummary(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Elegí un partido en el Panel C primero.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    ctx.scenarioMatrixSummarySeedCount.set(seedCount);
    ctx.clearFormationAverageResults();
    ctx.analysisReadyMessage.set(`Promedio formaciones corriendo: ${seedCount} seeds por formación...`);
    ctx.mutationInFlight.set(true);
    ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
      switchMap(() => ctx.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, ctx.controlledTeamSideModel))
    ).subscribe({
      next: (rows: any) => {
        const safeRows = rows ?? [];
        ctx.formationMatrixSummaryResults.set(safeRows);
        ctx.snackBar.open(
          `Promedio formaciones listo (${safeRows.length} formaciones · ${seedCount} seeds).`,
          'OK',
          { duration: 3000 }
        );
        if (safeRows.length > 0) {
          ctx.markReplayAnalysisReady('Formation averages listas en Panel E.');
        } else {
          ctx.analysisReadyMessage.set('Formation averages no devolvio filas. Revisar endpoint/datos del partido antes de leer impacto de formaciones.');
        }
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to run formation averages'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
      },
    });
  
}

export function runTestHarnessOnRunModalVsCanonicalMultiSeed(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open(
        `Pick a match involving ${ctx.userTeamName() || 'your team'} before comparing base vs modal pixels.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = CURRENT_LINEUP_MULTI_SEED_COUNT;
    let originalLineup: LineupDTO | null = null;
    ctx.modalVsCanonicalSummary.set(null);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Base vs píxeles del modal rápido: ${seedCount} seeds por estado...`);
    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((lineup) => {
        originalLineup = lineup as LineupDTO;
        const originalSlots = ctx.buildLineupSlots(lineup);
        const playerIds = ctx.lineupPlayerIdsFromSlots(originalSlots);
        if (ctx.countCustomMovableSlots(lineup) === 0) {
          throw new Error('No hay jugador de campo con píxeles persistidos en la alineación actual. Si querés medir el último movimiento hecho en Partido, usá último movimiento modal; para pruebas automáticas usá Matriz presets posición o Chequeo sensibilidad.');
        }
        const canonicalSlots = ctx.canonicalizeLineupSlots(lineup);
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() => ctx.harness.manualSelectLineup((lineup as any).formation, playerIds, canonicalSlots)),
          switchMap((canonicalLineup) =>
            ctx.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER').pipe(
              map((canonicalPreview) => ({ canonicalLineup, canonicalPreview }))
            )
          ),
          switchMap(({ canonicalLineup, canonicalPreview }) =>
            ctx.harness.manualSelectLineup((lineup as any).formation, playerIds, originalSlots).pipe(
              switchMap((modalLineup) =>
                ctx.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER').pipe(
                  map((modalPreview) => ({ canonicalLineup, canonicalPreview, modalLineup, modalPreview, originalSlots, playerIds }))
                )
              )
            )
          ),
          switchMap((result) =>
            ctx.harness.manualSelectLineup((lineup as any).formation, (result as any).playerIds, (result as any).originalSlots).pipe(
              map(() => result)
            )
          )
        );
      })
    ).subscribe({
      next: ({ canonicalLineup, canonicalPreview, modalLineup, modalPreview }: any) => {
        const canonical = ctx.currentLineupSummaryFromPreview(canonicalLineup, canonicalPreview);
        const modal = ctx.currentLineupSummaryFromPreview(modalLineup, modalPreview);
        if (!originalLineup || !canonical || !modal) {
          ctx.modalVsCanonicalSummary.set(null);
          ctx.snackBar.open('Base vs modal listo con muestra insuficiente.', 'OK', { duration: 4500 });
          return;
        }
        const summary = ctx.buildModalVsCanonicalSummary(originalLineup, canonical, modal);
        ctx.modalVsCanonicalSummary.set(summary);
        ctx.snackBar.open(
          `Base vs modal complete (${summary.seedCount} seeds, Delta xG ${ctx.fmtDeltaNumber(summary.deltaXgFor)}).`,
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Base vs píxeles del modal listo en Panel E.');
      },
      error: (err: any) => {
        if (originalLineup) {
          const restoreSlots = ctx.buildLineupSlots(originalLineup);
          const restoreIds = ctx.lineupPlayerIdsFromSlots(restoreSlots);
          ctx.harness.manualSelectLineup(originalLineup.formation, restoreIds, restoreSlots)
            .pipe(take(1), catchError(() => of(null)))
            .subscribe();
        }
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Base vs píxeles del modal no pudo generar Panel E'));
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to compare base vs modal pixels'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.loadMatches();
        ctx.refreshLineupContext();
        ctx.refreshDetailAfterMutation();
        ctx.refreshDetailAfterMutation(1200);
      },
    });
  
}
