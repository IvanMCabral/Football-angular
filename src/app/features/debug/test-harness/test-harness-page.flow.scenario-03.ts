import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRestoreWeakWideDefendersLab(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.restoreWeakWideDefendersLab().subscribe({
      next: (result: any) => {
        ctx.handleLabMutationSuccess();
        ctx.snackBar.open(
          `${result.message}. Run Multi-seed matrix again for baseline wide defense.`,
          'OK',
          { duration: 6000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to restore weak wide DEF lab'),
          'OK',
          { duration: 6000 }
        );
      },
    });
  
}

export function runTestHarnessOnRunBackFiveAnySideFamilyLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.canRunScenarioSummaryForControlledSide()) {
      ctx.snackBar.open('Elegí Local, Visitante o un partido donde juegue tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    const scope = ctx.controlledTeamDisplayName();
    ctx.backFiveFamilyLabRows.set([]);
    ctx.backFiveFamilyLabScope.set(scope);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Línea de 5 any side corriendo para ${scope}: ${seedCount} seeds por formación...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
      switchMap(() => ctx.harness.runFormationMatrixSummary(matchId, seedStart, seedCount, ctx.controlledTeamSideModel)),
      map((rows) => ctx.buildBackFiveFamilyRowsFromFormationSummary(rows ?? []))
    ).subscribe({
      next: (rows: any) => {
        ctx.backFiveFamilyLabRows.set(rows);
        if (rows.length > 0) {
          ctx.markReplayAnalysisReady(`Línea de 5 any side listo para ${scope} (${rows.length} planes).`);
        } else {
          ctx.analysisReadyMessage.set('Línea de 5 any side no devolvió filas para 5-4-1 / 5-3-2 / 3-5-2.');
        }
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Línea de 5 any side falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run any-side back-five family lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open('Línea de 5 any side completed.', 'OK', { duration: 3500 });
      },
    });
  
}

export function runTestHarnessOnRunBackFiveContextSmoke(ctx: any): any {
    const matches = ctx.scenarioBatteryCandidateMatches();
    if (matches.length === 0) {
      ctx.snackBar.open('No hay partidos completados para correr Línea de 5 context smoke.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? 12345;
    const seedCount = ctx.scenarioMatrixSmokeSeedCount();
    const jobs = matches.flatMap((match: any) => ([
      { match, controlledSide: 'HOME' as const },
      { match, controlledSide: 'AWAY' as const },
    ]));
    const partialRows: Array<BackFiveContextSmokeRow | undefined> = [];
    ctx.backFiveContextSmokeRows.set([]);
    ctx.scenarioMatrixSummarySeedCount.set(seedCount);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Línea de 5 context smoke corriendo: ${jobs.length} lecturas x 3 formaciones x ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    from(jobs).pipe(
      mergeMap((job, index) =>
        ctx.harness.runFormationMatrixSummary((job as any).match.matchId, seedStart, seedCount, (job as any).controlledSide).pipe(
          map((rows) => {
            const row = ctx.buildBackFiveContextSmokeRow((job as any).match, (job as any).controlledSide, seedStart, seedCount, rows ?? []);
            partialRows[index] = row;
            ctx.backFiveContextSmokeRows.set(partialRows.filter((item): item is BackFiveContextSmokeRow => !!item));
            return row;
          })
        ),
      2),
      toArray()
    ).subscribe({
      next: () => {
        const rows = partialRows.filter((item): item is BackFiveContextSmokeRow => !!item);
        ctx.backFiveContextSmokeRows.set(rows);
        ctx.markReplayAnalysisReady(`Línea de 5 context smoke listo: ${rows.length} lecturas (${matches.length} partidos x local/visitante).`);
        ctx.snackBar.open(`Línea de 5 context smoke completo: ${rows.length} lecturas.`, 'OK', { duration: 3500 });
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Línea de 5 context smoke falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run back-five context smoke'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
      },
    });
  
}

export function runTestHarnessOnRunBackFiveFamilyLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Línea de 5 family lab necesita un partido de tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    ctx.backFiveFamilyLabRows.set([]);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Línea de 5 family lab corriendo: 5-4-1 / 5-3-2 / 3-5-2 x ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    const plans = [
      {
        key: 'low-block' as const,
        label: 'Bloque bajo',
        formation: '5-4-1',
        visualPlan: '2da línea y76',
        slotsFor: (lineup: LineupDTO) => ctx.lowBlockVariantSlots(lineup, 76),
      },
      {
        key: 'transition' as const,
        label: 'Transición',
        formation: '5-3-2',
        visualPlan: 'carrileros y63',
        slotsFor: (lineup: LineupDTO) => ctx.backFiveWingbackVariantSlots(lineup, 63, '5-3-2'),
      },
      {
        key: 'wingback-control' as const,
        label: 'Carrileros altos',
        formation: '3-5-2',
        visualPlan: 'carrileros y46',
        slotsFor: (lineup: LineupDTO) => ctx.backFiveWingbackVariantSlots(lineup, 46, '3-5-2'),
      },
    ];
    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = ctx.buildLineupSlots(originalLineup);
        restore = {
          formation: (originalLineup as any).formation ?? ctx.selectedFormationModel ?? '4-4-2',
          playerIds: ctx.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return from(plans).pipe(
          concatMap((plan) =>
            ctx.harness.autoSelectLineup(plan.formation).pipe(
              switchMap((lineup) => {
                const playerIds = ctx.lineupPlayerIdsFromSlots(ctx.buildLineupSlots(lineup as LineupDTO));
                const slots = plan.slotsFor(lineup as LineupDTO);
                return ctx.harness.manualSelectLineup(plan.formation, playerIds, slots);
              }),
              switchMap(() => ctx.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, ctx.controlledTeamSideModel)),
              map((summary) => ({
                key: plan.key,
                label: plan.label,
                formation: plan.formation,
                visualPlan: plan.visualPlan,
                summary,
              }))
            )
          ),
          toArray()
        );
      }),
      switchMap((items) => {
        const rows = ctx.buildBackFiveFamilyLabRows(items);
        ctx.backFiveFamilyLabRows.set(rows);
        if (!restore) return of(rows);
        return ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(map(() => rows));
      })
    ).subscribe({
      next: (rows: any) => ctx.markReplayAnalysisReady(`Línea de 5 family lab listo (${rows.length} planes).`),
      error: (err: any) => {
        if (restore) {
          ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Línea de 5 family lab falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run back-five family lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.refreshLineupContext();
        ctx.snackBar.open('Línea de 5 family lab completed.', 'OK', { duration: 3500 });
      },
    });
  
}

export function runTestHarnessOnRunBackFiveTransitionLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Lab transicion 5-3-2 necesita un partido de tu equipo.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    ctx.backFiveTransitionLabRows.set([]);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Lab transicion 5-3-2 corriendo: carrileros bajos/base/altos x ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = ctx.buildLineupSlots(originalLineup);
        restore = {
          formation: (originalLineup as any).formation ?? ctx.selectedFormationModel ?? '4-4-2',
          playerIds: ctx.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return ctx.harness.autoSelectLineup('5-3-2');
      }),
      switchMap((lineup532) => {
        const variants = [
          { variant: 'low' as const, label: 'Bajos', y: 76 },
          { variant: 'base' as const, label: 'Base', y: 63 },
          { variant: 'high' as const, label: 'Altos', y: 46 },
        ];
        const playerIds = ctx.lineupPlayerIdsFromSlots(ctx.buildLineupSlots(lineup532));
        return from(variants).pipe(
          concatMap((variant) => {
            const slots = ctx.backFiveWingbackVariantSlots(lineup532, variant.y);
            return ctx.harness.manualSelectLineup('5-3-2', playerIds, slots).pipe(
              switchMap(() => ctx.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, ctx.controlledTeamSideModel)),
              map((summary) => ({ variant, summary }))
            );
          }),
          toArray()
        );
      }),
      switchMap((items) => {
        const rows = ctx.buildBackFiveTransitionLabRows(items);
        ctx.backFiveTransitionLabRows.set(rows);
        if (!restore) return of(rows);
        return ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(map(() => rows));
      })
    ).subscribe({
      next: (rows: any) => ctx.markReplayAnalysisReady(`Lab transicion 5-3-2 listo (${rows.length} variantes).`),
      error: (err: any) => {
        if (restore) {
          ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Lab transicion 5-3-2 falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run Lab transicion 5-3-2'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.refreshLineupContext();
        ctx.snackBar.open('Lab transicion 5-3-2 completed.', 'OK', { duration: 3500 });
      },
    });
  
}

export function runTestHarnessOnRunLowBlockLab(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Low block lab necesita un partido de tu equipo para modificar el XI.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    ctx.lowBlockLabRows.set([]);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Lab bloque bajo 5-4-1 corriendo: alta/base/baja x ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = ctx.buildLineupSlots(originalLineup);
        restore = {
          formation: (originalLineup as any).formation ?? ctx.selectedFormationModel ?? '4-4-2',
          playerIds: ctx.lineupPlayerIdsFromSlots(originalSlots),
          slots: originalSlots,
        };
        return ctx.harness.autoSelectLineup('5-4-1');
      }),
      switchMap((lineup541) => {
        const variants = [
          { variant: 'high' as const, label: 'Alta', y: 50 },
          { variant: 'base' as const, label: 'Base', y: 68 },
          { variant: 'low' as const, label: 'Baja', y: 76 },
        ];
        const playerIds = ctx.lineupPlayerIdsFromSlots(ctx.buildLineupSlots(lineup541));
        return from(variants).pipe(
          concatMap((variant) => {
            const slots = ctx.lowBlockVariantSlots(lineup541, variant.y);
            return ctx.harness.manualSelectLineup('5-4-1', playerIds, slots).pipe(
              switchMap(() => ctx.harness.runMatchPreviewSummary(
                matchId,
                seedStart,
                seedCount,
                ctx.controlledTeamSideModel
              )),
              map((summary) => ({ variant, summary }))
            );
          }),
          toArray()
        );
      }),
      switchMap((items) => {
        const rows = ctx.buildLowBlockLabRows(items);
        ctx.lowBlockLabRows.set(rows);
        if (!restore) return of(rows);
        return ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(
          map(() => rows)
        );
      })
    ).subscribe({
      next: (rows: any) => {
        ctx.markReplayAnalysisReady(`Lab bloque bajo 5-4-1 listo (${rows.length} variantes).`);
      },
      error: (err: any) => {
        if (restore) {
          ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots)
            .pipe(take(1))
            .subscribe({ error: () => undefined });
        }
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Lab bloque bajo 5-4-1 falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run low block lab'), 'OK', { duration: 6000 });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        ctx.refreshLineupContext();
        ctx.snackBar.open('Lab bloque bajo 5-4-1 completed.', 'OK', { duration: 3500 });
      },
    });
  
}

export function runTestHarnessOnRunScenarioMatrix(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open(
        `Pick a match involving ${ctx.userTeamName() || 'your team'} before running the scenario matrix.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    ctx.scenarioMatrixResults.set([]);
    ctx.scenarioMatrixSummaryResults.set([]);
    ctx.mutationInFlight.set(true);
    ctx.harness.runScenarioMatrix(matchId, ctx.seedInputModel).subscribe({
      next: (rows: any) => {
        ctx.scenarioMatrixResults.set(rows ?? []);
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          `Matriz escenarios lista (${rows?.length ?? 0} escenarios).`,
          'OK',
          { duration: 3000 }
        );
        ctx.markReplayAnalysisReady('Matriz escenarios lista en Panel E.');
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to run scenario matrix'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnRunScenarioMatrixBlockSmoke(ctx: any, group: any): any {
    const label = group === 'OFFENSE'
      ? 'Smoke ataque'
      : group === 'DEFENSE'
        ? 'Smoke defensa'
        : 'Smoke rival';
    ctx.runScenarioMatrixSummaryWithSeedCount(
      ctx.scenarioMatrixSmokeSeedCount(),
      label,
      `${label} listo en Panel E.`,
      group
    );
  
}

export function runTestHarnessOnRunScenarioMatrixSmoke(ctx: any): any {
    ctx.runScenarioMatrixSummaryWithSeedCount(
      ctx.scenarioMatrixSmokeSeedCount(),
      'Scenario smoke',
      'Scenario smoke listo en Panel E.',
      'ALL'
    );
  
}

export function runTestHarnessOnRunScenarioMatrixSummary(ctx: any): any {
    ctx.runScenarioMatrixSummaryWithSeedCount(
      ctx.scenarioMatrixSummaryEffectiveSeedCount(),
      'Multi-seed matrix',
      'Multi-seed matrix lista en Panel E.',
      'ALL'
    );
  
}
