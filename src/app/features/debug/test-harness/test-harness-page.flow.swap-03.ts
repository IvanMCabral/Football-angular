import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRunScenarioBatteryBoard(ctx: any): any {
    const matches = ctx.scenarioBatteryCandidateMatches();
    if (matches.length === 0) {
      ctx.snackBar.open('No hay partidos completados para armar la batería.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? 12345;
    const seedCount = ctx.scenarioMatrixSmokeSeedCount();
    const scenarioGroup = ctx.scenarioBatteryGroupModel;
    const jobs = matches.flatMap((match: any) => ([
      { match, controlledSide: 'HOME' as const },
      { match, controlledSide: 'AWAY' as const },
    ]));
    const partialRows: Array<ScenarioBatteryRow | undefined> = [];
    const estimatedScenarios = ctx.scenarioBatteryScenarioCountEstimate(scenarioGroup);
    const estimatedRuns = jobs.length * estimatedScenarios * seedCount;
    ctx.scenarioBatteryRows.set([]);
    ctx.scenarioBatteryWorkload.set(
      `${jobs.length} lecturas x ${estimatedScenarios} escenarios x ${seedCount} seeds = ${estimatedRuns} simulaciones estimadas.`
    );
    ctx.scenarioMatrixSummarySeedCount.set(seedCount);
    ctx.scenarioBatteryProgress.set(
      ctx.scenarioBatteryProgressText(0, jobs.length, matches.length, ctx.scenarioBatteryMatchLimit(), jobs[0])
    );
    ctx.mutationInFlight.set(true);
    from(jobs).pipe(
      mergeMap((job, index) =>
        ctx.harness.runScenarioMatrixSummary(
        (job as any).match.matchId,
          seedStart,
          seedCount,
          scenarioGroup,
        (job as any).controlledSide
        ).pipe(
          map((rows) => {
            const row = ctx.buildScenarioBatteryRow(
            (job as any).match,
            (job as any).controlledSide,
              scenarioGroup,
              seedStart,
              seedCount,
              rows ?? []
            );
            partialRows[index] = row;
            const completedRows = partialRows.filter((item): item is ScenarioBatteryRow => !!item);
            ctx.scenarioBatteryRows.set(completedRows);
            const nextJob = jobs[completedRows.length] ?? null;
            ctx.scenarioBatteryProgress.set(
              ctx.scenarioBatteryProgressText(completedRows.length, jobs.length, matches.length, ctx.scenarioBatteryMatchLimit(), nextJob)
            );
            return row;
          })
        )
      , 2),
      toArray()
    ).subscribe({
      next: () => {
        ctx.scenarioBatteryRows.set(partialRows.filter((item): item is ScenarioBatteryRow => !!item));
        ctx.mutationInFlight.set(false);
        ctx.scenarioBatteryProgress.set('');
        ctx.scenarioBatteryWorkload.set('');
        ctx.markReplayAnalysisReady(`Tablero batería listo: ${partialRows.filter(Boolean).length} lecturas (${ctx.scenarioBatteryGroupLabel(scenarioGroup)}, ${matches.length} partidos x local/visitante).`);
        ctx.snackBar.open(`Tablero batería completo: ${partialRows.filter(Boolean).length} lecturas (${ctx.scenarioBatteryGroupLabel(scenarioGroup)}).`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.scenarioBatteryProgress.set('');
        ctx.scenarioBatteryWorkload.set('');
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to run tactical battery board'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnRunSubstitutionTimingMatrix(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Matriz minuto de cambio usa el XI de tu equipo para replicar el modal.', 'OK', { duration: 3500 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 10)));
    ctx.playerSwapSeedCountModel = seedCount;
    ctx.substitutionWhatIfSummary.set(null);
    ctx.substitutionTimingMatrixRows.set([]);
    ctx.analysisReadyMessage.set(`Matriz minuto de cambio corriendo: ${seedCount} seeds x ${ctx.substitutionWhatIfMinuteOptions.length} minutos...`);
    ctx.mutationInFlight.set(true);
    forkJoin({
      lineup: ctx.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: (ctx.http as HttpClient).get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        const candidate = ctx.pickAutomaticSwapCandidate(lineup, squad);
        const playerOffId = ctx.selectedSwapStarterIdModel || candidate?.starterId;
        const playerOnId = ctx.selectedSwapBenchIdModel || candidate?.benchId;
        if (!playerOffId || !playerOnId) {
          throw new Error('No pude resolver titular y suplente para la matriz de sustitución.');
        }
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() =>
            from(ctx.substitutionWhatIfMinuteOptions).pipe(
              concatMap((minute) =>
                ctx.harness.runSubstitutionWhatIfSummary(matchId, {
                  playerOffId,
                  playerOnId,
                  minute,
                  seedStart,
                  seedCount,
                  controlledTeamSide: 'USER',
                }).pipe(map((row) => ctx.toSubstitutionTimingMatrixRow(row)))
              ),
              toArray()
            )
          )
        );
      })
    ).subscribe({
      next: (rows) => {
        ctx.substitutionTimingMatrixRows.set([...(rows as any[])].sort((a, b) => a.minute - b.minute));
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Matriz minuto de cambio fallo antes de generar Panel E'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run substitution timing matrix'), 'OK', { duration: 5000 });
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const rows = ctx.substitutionTimingMatrixRows();
        ctx.snackBar.open(
          rows.length > 0
            ? `Matriz minuto de cambio lista: ${rows[0].playerOffName} -> ${rows[0].playerOnName}, ${rows.length} minutos.`
            : 'Matriz minuto de cambio lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Matriz minuto de cambio listo en Panel E.');
        ctx.refreshLineupContext();
      },
    });
  
}

export function runTestHarnessOnRunSubstitutionWhatIf(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Simular sustitución usa el XI de tu equipo para replicar el modal.', 'OK', { duration: 3500 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 10)));
    const minute = ctx.substitutionWhatIfMinuteOptions.includes(ctx.substitutionWhatIfMinuteModel as 45 | 60 | 70 | 80)
      ? ctx.substitutionWhatIfMinuteModel
      : 60;
    ctx.playerSwapSeedCountModel = seedCount;
    let candidate: PlayerSwapCandidate | null = null;
    ctx.substitutionWhatIfSummary.set(null);
    ctx.modalRecommendationCandidateAttempts.set([]);
    ctx.substitutionTimingMatrixRows.set([]);
    ctx.analysisReadyMessage.set(`Simular sustitución corriendo: min ${minute}, ${seedCount} seeds...`);
    ctx.mutationInFlight.set(true);
    forkJoin({
      lineup: ctx.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: (ctx.http as HttpClient).get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        candidate = ctx.pickAutomaticSwapCandidate(lineup, squad);
        const playerOffId = ctx.selectedSwapStarterIdModel || candidate?.starterId;
        const playerOnId = ctx.selectedSwapBenchIdModel || candidate?.benchId;
        if (!playerOffId || !playerOnId) {
          throw new Error('No pude resolver titular y suplente para la sustitución.');
        }
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() =>
            ctx.harness.runSubstitutionWhatIfSummary(matchId, {
              playerOffId,
              playerOnId,
              minute,
              seedStart,
              seedCount,
              controlledTeamSide: 'USER',
            })
          )
        );
      })
    ).subscribe({
      next: (row) => {
        ctx.substitutionWhatIfSummary.set({
          ...(row as any),
          readClass: ctx.deltaClass((row as any).deltaXgDiff + (row as any).deltaShotsFor * 0.04 - (row as any).deltaXgAgainst * 0.6),
        });
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Simular sustitución falló antes de generar Panel E'));
        ctx.snackBar.open(ctx.fmtError(err, 'No se pudo correr simulación de sustitución'), 'OK', { duration: 5000 });
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const summary = ctx.substitutionWhatIfSummary();
        ctx.snackBar.open(
          summary
            ? `Simular sustitución lista: ${summary.playerOffName} -> ${summary.playerOnName}, Delta xG ${ctx.fmtDeltaNumber(summary.deltaXgFor)}.`
            : 'Simular sustitución lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Simular sustitución listo en Panel E.');
        ctx.refreshLineupContext();
      },
    });
  
}

export function runTestHarnessPickBenchForBatteryMode(ctx: any, starterPosition: any, eligibleBench: any, usedBenchIds: any, mode: any): any {
    const starterProfile = ctx.playerSwapProfile(starterPosition);
    const starterLine = ctx.positionPixelLine(starterPosition);
    const unused = eligibleBench.filter((player: any) => !usedBenchIds.has(player.sessionPlayerId));
    const pool = unused.length > 0 ? unused : eligibleBench;
    if (mode === 'out') {
      return pool.find((player: any) => ctx.positionPixelLine(player.position) !== starterLine)
        ?? pool.find((player: any) => ctx.playerSwapProfile(player.position) !== starterProfile)
        ?? null;
    }
    if (mode === 'natural') {
      return pool.find((player: any) => ctx.playerSwapProfile(player.position) === starterProfile)
        ?? pool.find((player: any) => ctx.positionPixelLine(player.position) === starterLine)
        ?? null;
    }
    return pool.find((player: any) => ctx.playerSwapProfile(player.position) === starterProfile)
      ?? pool.find((player: any) => ctx.positionPixelLine(player.position) === starterLine)
      ?? pool[0]
      ?? null;
  
}

export function runTestHarnessPickDiverseBenchForStarter(ctx: any, starterPosition: any, eligibleBench: any, usedBenchIds: any): any {
    const starterProfile = ctx.playerSwapProfile(starterPosition);
    const starterLine = ctx.positionPixelLine(starterPosition);
    return eligibleBench.find((player: any) => !usedBenchIds.has(player.sessionPlayerId) && ctx.playerSwapProfile(player.position) === starterProfile)
      ?? eligibleBench.find((player: any) => !usedBenchIds.has(player.sessionPlayerId) && ctx.positionPixelLine(player.position) === starterLine)
      ?? eligibleBench.find((player: any) => !usedBenchIds.has(player.sessionPlayerId))
      ?? null;
  
}

export function runTestHarnessPickModalRecommendationSwapCandidate(ctx: any, lineup: any, squad: any, objective: any): any {
    const lineupIds = new Set((lineup.players ?? []).map((p: any) => p.playerId));
    const slots = ctx.buildLineupSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? []).filter((player: any) => player.position !== 'GK');
    const eligibleBench = squad
      .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK');
    const manualStarter = ctx.selectedSwapStarterIdModel
      ? starters.find((player: any) => player.playerId === ctx.selectedSwapStarterIdModel)
      : null;
    const manualBench = ctx.selectedSwapBenchIdModel
      ? eligibleBench.find((player: any) => player.sessionPlayerId === ctx.selectedSwapBenchIdModel)
      : null;
    if (manualStarter && manualBench) {
      return ctx.buildPlayerSwapCandidate(manualStarter, manualBench, slotByPlayer, `Modal DT manual: ${ctx.scenarioBatteryCoachObjectiveLabel(objective)}`);
    }
    const pairs: Array<{ starter: LineupDTO['players'][number]; bench: SessionPlayer; score: number }> = [];
    for (const starter of manualStarter ? [manualStarter] : starters) {
      for (const bench of manualBench ? [manualBench] : eligibleBench) {
        pairs.push({
          starter,
          bench,
          score: ctx.modalRecommendationCandidateScore(starter, bench, objective),
        });
      }
    }
    const best = pairs.sort((a, b) => b.score - a.score)[0];
    if (!best) {
      return null;
    }
    if (objective === 'PROTECT_RESULT' && best.score < 8) {
      return null;
    }
    return ctx.buildPlayerSwapCandidate(
      best.starter,
      best.bench,
      slotByPlayer,
      `Modal DT: ${ctx.scenarioBatteryCoachObjectiveLabel(objective)} (${best.score.toFixed(1)})`
    );
  
}

export function runTestHarnessPickModalRecommendationSwapCandidates(ctx: any, lineup: any, squad: any, objective: any, limit: any): any {
    const lineupIds = new Set((lineup.players ?? []).map((p: any) => p.playerId));
    const slots = ctx.buildLineupSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? []).filter((player: any) => player.position !== 'GK');
    const eligibleBench = squad
      .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK');
    const manualStarter = ctx.selectedSwapStarterIdModel
      ? starters.find((player: any) => player.playerId === ctx.selectedSwapStarterIdModel)
      : null;
    const manualBench = ctx.selectedSwapBenchIdModel
      ? eligibleBench.find((player: any) => player.sessionPlayerId === ctx.selectedSwapBenchIdModel)
      : null;
    if (manualStarter && manualBench) {
      return [ctx.buildPlayerSwapCandidate(manualStarter, manualBench, slotByPlayer, `Modal DT manual: ${ctx.scenarioBatteryCoachObjectiveLabel(objective)}`)];
    }
    const pairs: Array<{ starter: LineupDTO['players'][number]; bench: SessionPlayer; score: number }> = [];
    for (const starter of manualStarter ? [manualStarter] : starters) {
      for (const bench of manualBench ? [manualBench] : eligibleBench) {
        pairs.push({
          starter,
          bench,
          score: ctx.modalRecommendationCandidateScore(starter, bench, objective),
        });
      }
    }
    return pairs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((pair) => ctx.buildPlayerSwapCandidate(
        pair.starter,
        pair.bench,
        slotByPlayer,
        `Modal DT search: ${ctx.scenarioBatteryCoachObjectiveLabel(objective)} (${pair.score.toFixed(1)})`
      ));
  
}

export function runTestHarnessPickPlayerSwapBatteryCandidates(ctx: any, lineup: any, squad: any, limit: any, mode: any): any {
    const lineupIds = new Set((lineup.players ?? []).map((p: any) => p.playerId));
    const slots = ctx.buildLineupSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? [])
      .filter((player: any) => player.position !== 'GK');
    const eligibleBench = squad
      .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
      .sort((a: any, b: any) => ctx.playerSwapBenchScore(b) - ctx.playerSwapBenchScore(a));
    const profileOrder = ['ST', 'WIDE', 'AM', 'CM', 'DM', 'FB', 'CB', 'ATT', 'MID', 'DEF'];
    const orderedStarters = [...starters].sort((a, b) => {
      const profileA = ctx.playerSwapProfile(a.position);
      const profileB = ctx.playerSwapProfile(b.position);
      return profileOrder.indexOf(profileA) - profileOrder.indexOf(profileB);
    });
    if (mode === 'stress') {
      return ctx.buildEstresPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit);
    }
    const natural = ctx.buildPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit, 'natural');
    if (mode === 'natural' || natural.length >= limit) {
      return natural;
    }
    return ctx.buildPlayerSwapBatteryCandidates(orderedStarters, eligibleBench, slotByPlayer, limit, 'mixed', natural);
  
}

export function runTestHarnessPlayerSwapBatteryBestWorstText(ctx: any, row: any): any {
    return getPlayerSwapBatteryBestWorstText(
      row,
      ctx.playerSwapEffectiveCoachObjective(),
      (value) => ctx.fmtDeltaNumber(value),
      (item) => ctx.playerSwapIsActionableRecommendation(item)
    );
  
}

export function runTestHarnessPlayerSwapBatteryCoachRead(ctx: any, summary: any): any {
    return getPlayerSwapBatteryCoachRead(summary);
  
}

export function runTestHarnessPlayerSwapBatteryConfidenceLabel(ctx: any, seedCount: any): any {
    if (seedCount >= 30) return 'High confidence';
    if (seedCount >= 10) return 'Confianza media';
    return 'Low confidence';
  
}

export function runTestHarnessPlayerSwapBatteryCounterText(ctx: any, counts: any): any {
    return getPlayerSwapBatteryCounterText(counts);
  
}

export function runTestHarnessPlayerSwapBatteryMarkdownReport(ctx: any): any {
    const rows = ctx.playerSwapBatterySummaries();
    const summary = ctx.playerSwapBatterySummary();
    const match = ctx.selectedMatch();
    const matchLabel = match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Unknown match';
    const first = rows[0] ?? null;
    const lines = [
      '# Player Swap Battery Report',
      '',
      `Match: ${matchLabel}`,
      `Mode: ${summary.mode}`,
      `Precision: ${summary.precision}`,
      `Confidence: ${summary.confidence}`,
      `Seeds: ${first ? `${first.seedStart}..${first.seedEnd}` : 'n/a'}`,
      '',
      `Recommendation: ${ctx.playerSwapBatteryBestWorstText(summary.best)}`,
      `Worst: ${ctx.playerSwapBatteryBestWorstText(summary.worst)}`,
      '',
      `Reads: ${ctx.playerSwapBatteryCounterText(summary.reads)}`,
      `Fit: ${ctx.playerSwapBatteryCounterText(summary.fits)}`,
      '',
      `Coach read: ${ctx.playerSwapBatteryCoachRead(summary)}`,
      '',
      '| Swap | OVR | Fit | Read | Señal | Ataque | Control | Proteccion | Canales | Shots | Shots Ag. | xG For | xG Ag. | xG Diff | Pre xG Diff |',
      '| --- | ---: | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...rows.map((row: any) =>
        `| ${row.baselinePlayer} -> ${row.swapPlayer} | ${ctx.playerSwapOverallText(row)} | ${row.swapFit} | ${row.swapRead} | ${row.signalRead} | ${row.tacticalAttackRead} | ${row.tacticalCentralControlRead} | ${row.tacticalProtectionRead} | ${row.tacticalChannelsRead} | ${ctx.fmtDeltaNumber(row.deltaShotsFor)} | ${ctx.fmtDeltaNumber(row.deltaShotsAgainst)} | ${ctx.fmtDeltaNumber(row.deltaXgFor)} | ${ctx.fmtDeltaNumber(row.deltaXgAgainst)} | ${ctx.fmtDeltaNumber(row.deltaXgDiff)} | ${ctx.fmtDeltaNumber(row.preAutoSubDeltaXgDiff || 0)} |`
      ),
      '',
      '## Tactical breakdown detail',
      '',
      ...rows.map((row: any) => `- ${row.baselinePlayer} -> ${row.swapPlayer}: ${row.tacticalBreakdownDetail}`),
      '',
    ];
    return lines.join('\n');
  
}

export function runTestHarnessPlayerSwapBatteryModeHint(ctx: any): any {
    if (ctx.playerSwapBatteryModeModel === 'stress') return 'Busca swaps fuera de rol para testear limites.';
    if (ctx.playerSwapBatteryModeModel === 'mixed') return 'Permite cambios naturales y experimentos.';
    return 'Prioriza mismo perfil o misma línea.';
  
}

export function runTestHarnessPlayerSwapBatteryPrecisionHint(ctx: any): any {
    const seeds = ctx.playerSwapBatteryEffectiveSeedCount();
    if (ctx.playerSwapBatteryModeModel === 'stress' && ctx.playerSwapBatteryPrecisionModel === 'quick') {
      return `${seeds} seeds - Estres test usa minimo 10 para evitar ruido.`;
    }
    if (ctx.playerSwapBatteryPrecisionModel === 'reliable') return `${seeds} seeds - High confidence para calibracion fina.`;
    if (ctx.playerSwapBatteryPrecisionModel === 'balanced') return `${seeds} seeds - Confianza media, recomendado para decidir tuning.`;
    return `${seeds} seeds - Low confidence, solo smoke exploratorio.`;
  
}

export function runTestHarnessPlayerSwapBenchScore(ctx: any, player: any): any {
    return player.attack + player.defense + player.technique + player.speed + player.stamina + player.mentality;
  
}
