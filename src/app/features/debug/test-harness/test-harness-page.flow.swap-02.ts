import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRunAutoPlayerSwapMatrix(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 3)));
    ctx.playerSwapSeedCountModel = seedCount;
    let candidate: PlayerSwapCandidate | null = null;
    ctx.clearPlayerSwapAnalysisResults();
    ctx.analysisReadyMessage.set(`Matriz cambio jugador corriendo: ${seedCount} seeds...`);
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
    (source$ as any).pipe(
      switchMap(({ lineup, squad }) => {
        candidate = lineup ? ctx.pickAutomaticSwapCandidate(lineup, squad) : ctx.autoBackendPlayerSwapCandidate();
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() =>
            ctx.harness.runPlayerSwapMatrixSummary(matchId, {
              starterPlayerId: candidate?.starterId ?? ctx.AUTO_PLAYER_SWAP_STARTER,
              benchPlayerId: candidate?.benchId ?? ctx.AUTO_PLAYER_SWAP_BENCH,
              slotId: candidate?.slotId ?? '',
              seedStart,
              seedCount,
              controlledTeamSide: ctx.controlledTeamSideModel,
            })
          )
        );
      })
    ).subscribe({
      next: (row: any) => {
        ctx.playerSwapMatrixSummary.set(ctx.toPlayerSwapMatrixSummary(row, candidate));
      },
      error: (err: unknown) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(
          ctx.fmtError(err, 'Matriz cambio jugador falló antes de generar Panel E')
        );
        ctx.snackBar.open(
          ctx.fmtError(err, 'No se pudo correr matriz de cambio de jugador'),
          'OK',
          { duration: 5000 }
        );
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const summary = ctx.playerSwapMatrixSummary();
        ctx.snackBar.open(
          summary
            ? `Matriz cambio jugador lista: ${summary.baselinePlayer} vs ${summary.swapPlayer}, Delta xG ${ctx.fmtDeltaNumber(summary.deltaXgFor)}.`
            : 'Matriz cambio jugador lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Matriz cambio jugador listo en Panel E.');
        ctx.refreshLineupContext();
        ctx.loadMatches();
        ctx.refreshDetailAfterMutation();
        ctx.refreshDetailAfterMutation(1200);
      },
    });
  
}

export function runTestHarnessOnRunFocusedPixelBattery(ctx: any): any {
    const seedCount = Math.max(20, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 20)));
    const formation = ctx.selectedFormationModel ?? '4-4-2';
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any) => ctx.positionMovementPresets(fromX, fromY)
        .filter((preset: any) => ['5px wide', '5px center', '5px forward', '5px deeper'].includes(preset.label)),
      `Batería píxeles enfocada · ${formation}`,
      null,
      (lineup: any) => ctx.pickFocusedPixelCandidates(lineup),
      null,
      false,
      'ALL'
    );
  
}

export function runTestHarnessOnRunFocusedWideBattery(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId || !ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Elegí un partido de tu equipo para correr Batería bandas enfocada.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? 12345;
    const seedCount = ctx.scenarioMatrixSummaryEffectiveSeedCount();
    const formations = ['4-2-3-1', '4-4-2', '5-4-1'];
    const styles: TeamStyle[] = ['BALANCED', 'WIDE_PLAY'];
    const originalStyle = ctx.selectedStyleModel;
    ctx.focusedWideBatteryRows.set([]);
    ctx.scenarioMatrixSummarySeedCount.set(seedCount);
    ctx.analysisReadyMessage.set(`Batería bandas enfocada corriendo: ${formations.length} formaciones x ${styles.length} estilos x ${seedCount} seeds...`);
    ctx.mutationInFlight.set(true);

    ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalFormation = (originalLineup as any).formation ?? ctx.selectedFormationModel ?? '4-4-2';
        const originalPlayerIds = ((originalLineup as any).players ?? []).map((player: any) => player.playerId);
        const originalSlots = (originalLineup as any).slots ?? [];
        if (originalPlayerIds.length !== 11 || originalSlots.length !== 11) {
          throw new Error(`Batería bandas enfocada necesita 11 titulares y 11 slots; tiene ${originalPlayerIds.length}/${originalSlots.length}.`);
        }
        const jobs = formations.flatMap((formation) => styles.map((style) => ({ formation, style })));
        return from(jobs).pipe(
          concatMap((job) =>
            ctx.harness.manualSelectLineup(job.formation, originalPlayerIds).pipe(
              switchMap(() => ctx.harness.setStyle(job.style)),
              switchMap(() => ctx.harness.runMatchPreviewSummary(matchId, seedStart, seedCount, 'USER')),
              map((summary) => ({ job, summary }))
            )
          ),
          toArray(),
          switchMap((results) =>
            ctx.harness.manualSelectLineup(originalFormation, originalPlayerIds, originalSlots).pipe(
              switchMap(() => ctx.harness.setStyle(originalStyle)),
              map(() => ctx.toFocusedWideBatteryRows(results))
            )
          )
        );
      }),
      finalize(() => ctx.mutationInFlight.set(false))
    ).subscribe({
      next: (rows: any) => {
        ctx.focusedWideBatteryRows.set(rows);
        ctx.markReplayAnalysisReady(`Batería bandas enfocada lista: ${rows.length} lecturas.`);
        ctx.snackBar.open('Batería bandas enfocada completed.', 'OK', { duration: 3500 });
      },
      error: (err: any) => {
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Batería bandas enfocada falló'));
      },
    });
  
}

export function runTestHarnessOnRunModalRecommendationWhatIf(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    if (!ctx.selectedMatchIncludesUserTeam()) {
      ctx.snackBar.open('Probar recomendación modal usa el XI de tu equipo.', 'OK', { duration: 3500 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(1, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 10)));
    const minute = ctx.substitutionWhatIfMinuteOptions.includes(ctx.substitutionWhatIfMinuteModel as 45 | 60 | 70 | 80)
      ? ctx.substitutionWhatIfMinuteModel
      : 60;
    ctx.playerSwapSeedCountModel = seedCount;
    ctx.substitutionWhatIfSummary.set(null);
    ctx.modalRecommendationCandidateAttempts.set([]);
    ctx.substitutionTimingMatrixRows.set([]);
    ctx.analysisReadyMessage.set(`Probar recomendación modal corriendo: ${ctx.playerSwapCoachObjectiveRead()}, min ${minute}, ${seedCount} seeds...`);
    ctx.mutationInFlight.set(true);
    let candidate: PlayerSwapCandidate | null = null;
    forkJoin({
      lineup: ctx.harness.getCurrentLineup().pipe(take(1), timeout(10_000)),
      squad: (ctx.http as HttpClient).get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        take(1),
        timeout(10_000),
        catchError(() => of([] as SessionPlayer[]))
      ),
    }).pipe(
      switchMap(({ lineup, squad }) => {
        const objective = ctx.playerSwapEffectiveCoachObjective();
        if (objective === 'PROTECT_RESULT') {
          const candidates = ctx.pickModalRecommendationSwapCandidates(lineup, squad, objective, 5);
          if (candidates.length === 0) {
            ctx.mutationInFlight.set(false);
            ctx.analysisReadyMessage.set(`Sin recomendación automática suficientemente segura para ${ctx.playerSwapCoachObjectiveRead()}. No se corre Panel E con un falso positivo.`);
            ctx.snackBar.open('Sin recomendación segura: mantené estructura o elegí un cambio manual.', 'OK', { duration: 5000 });
            return of(null);
          }
          ctx.modalRecommendationCandidateAttempts.set(candidates.map((candidate: any) => ({
            candidate,
            row: null,
            safe: false,
            score: 0,
            status: 'RUNNING',
          })));
          ctx.analysisReadyMessage.set(`Buscando cierre real: ${candidates.length} candidatos, min ${minute}, ${seedCount} seeds...`);
          return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
            switchMap(() => ctx.runModalSubstitutionCandidates(matchId, candidates, seedStart, seedCount, minute, objective)),
            map((items) => {
              const itemByPair = new Map<string, any>((items as any).map((item: any) => [`${item.candidate.starterId}:${item.candidate.benchId}`, item]));
              ctx.modalRecommendationCandidateAttempts.set(candidates.map((candidate: any) => {
                const item = itemByPair.get(`${candidate.starterId}:${candidate.benchId}`);
                if (!item) {
                  return {
                    candidate,
                    row: null,
                    safe: false,
                    score: 0,
                    status: 'NO_SAMPLE' as const,
                  };
                }
                const safe = ctx.modalProtectWhatIfIsSafe(item.row);
                return {
                  candidate,
                  row: item.row,
                  safe,
                  score: ctx.modalProtectWhatIfScore(item.row),
                  status: safe ? 'SAFE' as const : 'REJECTED' as const,
                };
              }));
              const best = (items as any)[0] ?? null;
              if (!best || !ctx.modalProtectWhatIfIsSafe(best.row)) {
                candidate = null;
                ctx.mutationInFlight.set(false);
                ctx.analysisReadyMessage.set(`Sin cierre real encontrado para ${ctx.playerSwapCoachObjectiveRead()}: ningún candidato bajó xGA/tiros con este seed.`);
                ctx.snackBar.open('Sin cierre real: mantené estructura o probá cambio manual.', 'OK', { duration: 5000 });
                return null;
              }
              candidate = best.candidate;
              return best.row;
            })
          );
        }
        candidate = ctx.pickModalRecommendationSwapCandidate(lineup, squad, ctx.playerSwapEffectiveCoachObjective());
        if (!candidate?.starterId || !candidate?.benchId) {
          ctx.mutationInFlight.set(false);
          ctx.analysisReadyMessage.set(`Sin recomendación automática suficientemente segura para ${ctx.playerSwapCoachObjectiveRead()}. No se corre Panel E con un falso positivo.`);
          ctx.snackBar.open('Sin recomendación segura: mantené estructura o elegí un cambio manual.', 'OK', { duration: 5000 });
          return of(null);
        }
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() =>
            ctx.harness.runSubstitutionWhatIfSummary(matchId, {
              playerOffId: candidate!.starterId,
              playerOnId: candidate!.benchId,
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
        if (!row) {
          return;
        }
        ctx.substitutionWhatIfSummary.set({
          ...row,
          readClass: ctx.deltaClass(ctx.modalRecommendationWhatIfScore(row, ctx.playerSwapEffectiveCoachObjective())),
          read: `${(row as any).read} · Modal DT: ${ctx.playerSwapCoachObjectiveRead()} · ${candidate?.testCase ?? 'recomendación'}`,
        });
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Probar recomendación modal falló antes de generar Panel E'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run modal recommendation what-if'), 'OK', { duration: 5000 });
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const summary = ctx.substitutionWhatIfSummary();
        if (!summary && !candidate) {
          ctx.refreshLineupContext();
          return;
        }
        ctx.snackBar.open(
          summary
            ? `Probar recomendación modal: ${summary.playerOffName} → ${summary.playerOnName}, ${ctx.playerSwapCoachObjectiveRead()}.`
            : 'Probar recomendación modal lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Probar recomendación modal listo en Panel E.');
        ctx.refreshLineupContext();
      },
    });
  
}

export function runTestHarnessOnRunPlayerSwapBattery(ctx: any, options: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = ctx.playerSwapBatteryEffectiveSeedCount();
    ctx.playerSwapSeedCountModel = seedCount;
    const preservedPixelSummary = options.preservePositionPixels ? ctx.positionPixelMatrixSummary() : null;
    const preservedPixelRows = options.preservePositionPixels ? ctx.positionPixelMatrixRows() : [];
    const preservedPixelNote = options.preservePositionPixels ? ctx.positionPixelEvidenceNote() : null;
    ctx.clearReplayAnalysisResultsForLatestRun();
    if (options.preservePositionPixels) {
      ctx.positionPixelMatrixSummary.set(preservedPixelSummary);
      ctx.positionPixelMatrixRows.set(preservedPixelRows);
      ctx.positionPixelEvidenceNote.set(preservedPixelNote);
    }
    ctx.analysisReadyMessage.set(`Batería cambio jugador corriendo: ${seedCount} seeds por cambio...`);
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
          switchMap(() => from(effectiveCandidates).pipe(
            concatMap((candidate) =>
              ctx.harness.runPlayerSwapMatrixSummary(matchId, {
                starterPlayerId: (candidate as any).starterId,
                benchPlayerId: (candidate as any).benchId,
                slotId: (candidate as any).slotId,
                seedStart,
                seedCount,
                controlledTeamSide: ctx.controlledTeamSideModel,
              }).pipe(map((row) => ctx.toPlayerSwapMatrixSummary(row, candidate)))
            ),
            toArray()
          ))
        );
      })
    ).subscribe({
      next: (summaries) => {
        ctx.playerSwapBatterySummaries.set(summaries);
        ctx.playerSwapMatrixSummary.set((summaries as any)[0] ?? null);
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(
          ctx.fmtError(err, 'Batería cambio jugador falló antes de generar Panel E')
        );
        ctx.snackBar.open(ctx.fmtError(err, 'No se pudo correr batería de cambio de jugador'), 'OK', { duration: 5000 });
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const count = ctx.playerSwapBatterySummaries().length;
        ctx.snackBar.open(
          count > 0 ? `Batería cambio jugador lista: ${count} swaps medidos.` : 'Batería cambio jugador lista con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Batería cambio jugador lista en Panel E.');
        ctx.refreshLineupContext();
      },
    });
  
}

export function runTestHarnessOnRunPlayerSwapFullSmoke(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    const careerId = ctx.careerId();
    if (!matchId || !careerId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = ctx.playerSwapBatteryEffectiveSeedCount();
    ctx.playerSwapSeedCountModel = seedCount;
    ctx.clearReplayAnalysisResultsForLatestRun();
    ctx.analysisReadyMessage.set(`Smoke completo de cambios corriendo: natural + stress, ${seedCount} seeds por cambio...`);
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
      switchMap(({ lineup, squad }) => ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
        switchMap(() => forkJoin({
          natural: ctx.runPlayerSwapBatteryMode(matchId, seedStart, seedCount, 'natural', lineup, squad),
          stress: ctx.runPlayerSwapBatteryMode(matchId, seedStart, seedCount, 'stress', lineup, squad),
        }) as any)
      )),
      map(({ natural, stress }: any) => [...natural, ...stress])
    ).subscribe({
      next: (summaries) => {
        ctx.playerSwapBatterySummaries.set(summaries);
        ctx.playerSwapMatrixSummary.set(summaries[0] ?? null);
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(
          ctx.fmtError(err, 'Smoke completo de cambios falló antes de generar Panel E')
        );
        ctx.snackBar.open(ctx.fmtError(err, 'No se pudo correr smoke completo de cambios'), 'OK', { duration: 5000 });
        ctx.refreshLineupContext();
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const count = ctx.playerSwapBatterySummaries().length;
        ctx.snackBar.open(
          count > 0 ? `Smoke completo de cambios listo: ${count} swaps medidos.` : 'Smoke completo de cambios listo con muestra insuficiente.',
          'OK',
          { duration: 4500 }
        );
        ctx.markReplayAnalysisReady('Smoke completo de cambios listo en Panel E.');
        ctx.refreshLineupContext();
      },
    });
  
}
