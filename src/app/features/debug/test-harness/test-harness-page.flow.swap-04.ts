import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessPlayerSwapBestProtectPick(ctx: any, rows: any): any {
    if (rows.length === 0) return null;
    const defensiveRows = rows.filter((row: any) => {
      const benchPosition = row.swapPlayerPosition;
      const starterPosition = row.baselinePlayerPosition;
      return ['DEF', 'MID'].includes(benchPosition)
        || ['DEF', 'MID'].includes(starterPosition)
        || row.swapFit === 'Same profile'
        || row.swapFit === 'Same line';
    });
    const pool = defensiveRows.length > 0 ? defensiveRows : rows;
    return [...pool].sort((a, b) =>
      ctx.playerSwapProtectSpecialistScore(b) - ctx.playerSwapProtectSpecialistScore(a)
    )[0] ?? null;
  
}

export function runTestHarnessPlayerSwapCoachAttackScore(ctx: any, row: any): any {
    return getPlayerSwapCoachAttackScore(row);
  
}

export function runTestHarnessPlayerSwapCoachNetScore(ctx: any, row: any): any {
    return getPlayerSwapCoachNetScore(row);
  
}

export function runTestHarnessPlayerSwapCoachObjectiveRead(ctx: any): any {
    return ctx.scenarioBatteryCoachObjectiveLabel(ctx.playerSwapEffectiveCoachObjective());
  
}

export function runTestHarnessPlayerSwapCoachRead(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapCoachRead(ctx.playerSwapCoachReadLevel(row, candidate));
  
}

export function runTestHarnessPlayerSwapCoachReadClass(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapCoachReadClass(ctx.playerSwapCoachReadLevel(row, candidate));
  
}

export function runTestHarnessPlayerSwapCoachReadLevel(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapCoachReadLevel(row, ctx.playerSwapRoleRisk(candidate));
  
}

export function runTestHarnessPlayerSwapCoachRiskScore(ctx: any, row: any): any {
    return getPlayerSwapCoachRiskScore(row);
  
}

export function runTestHarnessPlayerSwapComparisonKey(ctx: any, row: any): any {
    return `${row.slotId}:${row.baselinePlayer}:${row.swapPlayer}`;
  
}

export function runTestHarnessPlayerSwapDecisionScore(ctx: any, row: any, objective: any): any {
    return getPlayerSwapDecisionScore(row, objective);
  
}

export function runTestHarnessPlayerSwapEffectiveCoachObjective(ctx: any): any {
    const match = ctx.selectedMatch();
    if (!match) {
      return ctx.scenarioBatteryCoachObjectiveModel === 'AUTO' ? 'NEUTRAL' : ctx.scenarioBatteryCoachObjectiveModel;
    }
    const side = ctx.resolveControlledSideForMatch(match);
    return ctx.scenarioBatteryEffectiveCoachObjective(match, side);
  
}

export function runTestHarnessPlayerSwapEstresExpectedLines(ctx: any, testCase: any): any {
    if (testCase.includes('atacante por defensor')) return { starterLine: 'ATT', benchLine: 'DEF' };
    if (testCase.includes('defensor por atacante')) return { starterLine: 'DEF', benchLine: 'ATT' };
    if (testCase.includes('medio por atacante') || testCase.includes('medio por banda/ataque')) return { starterLine: 'MID', benchLine: 'ATT' };
    if (testCase.includes('medio por defensor')) return { starterLine: 'MID', benchLine: 'DEF' };
    return null;
  
}

export function runTestHarnessPlayerSwapFit(ctx: any, candidate: any): any {
    return getPlayerSwapFitText(ctx.playerSwapFitLevel(candidate));
  
}

export function runTestHarnessPlayerSwapFitClass(ctx: any, candidate: any): any {
    return getPlayerSwapFitClass(ctx.playerSwapFitLevel(candidate));
  
}

export function runTestHarnessPlayerSwapFitLevel(ctx: any, candidate: any): any {
    return getPlayerSwapFitLevel(candidate, (position) => ctx.positionPixelLine(position));
  
}

export function runTestHarnessPlayerSwapHasLargeQualityDrop(ctx: any, row: any): any {
    return hasLargePlayerSwapQualityDrop(row);
  
}

export function runTestHarnessPlayerSwapIsActionableRecommendation(ctx: any, row: any): any {
    return getPlayerSwapIsActionableRecommendation(row);
  
}

export function runTestHarnessPlayerSwapObjectiveContrastText(ctx: any, summary: any): any {
    return getPlayerSwapObjectiveContrastText(summary);
  
}

export function runTestHarnessPlayerSwapObjectiveText(ctx: any, row: any, objective: any): any {
    return getPlayerSwapObjectiveText(row, objective, (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessPlayerSwapOverallDelta(ctx: any, row: any): any {
    return getPlayerSwapOverallDelta(row);
  
}

export function runTestHarnessPlayerSwapOverallDeltaText(ctx: any, row: any): any {
    return getPlayerSwapOverallDeltaText(row, (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessPlayerSwapOverallText(ctx: any, row: any): any {
    if (row.baselinePlayerOverall == null || row.swapPlayerOverall == null || row.deltaPlayerOverall == null) {
      return String.fromCharCode(8212);
    }
    return `${row.baselinePlayerOverall}${String.fromCharCode(8594)}${row.swapPlayerOverall} (${ctx.fmtDeltaNumber(row.deltaPlayerOverall)})`;
  
}

export function runTestHarnessPlayerSwapPrecisionStability(ctx: any, quick: any, balanced: any): any {
    return getPlayerSwapPrecisionStability(quick, balanced, ctx.playerSwapEffectiveCoachObjective());
  
}

export function runTestHarnessPlayerSwapPrecisionStabilityClass(ctx: any, stability: any): any {
    return getPlayerSwapPrecisionStabilityClass(stability);
  
}

export function runTestHarnessPlayerSwapProfile(ctx: any, position: any): any {
    return getPlayerSwapProfile(position, (value) => ctx.positionPixelLine(value));
  
}

export function runTestHarnessPlayerSwapProtectSpecialistScore(ctx: any, row: any): any {
    return getPlayerSwapProtectSpecialistScore(row);
  
}

export function runTestHarnessPlayerSwapQualityWarning(ctx: any, row: any): any {
    return getPlayerSwapQualityWarning(row, (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessPlayerSwapResolvedTestCase(ctx: any, candidate: any, resolved: any): any {
    const base = candidate?.testCase ?? ctx.playerSwapFit(candidate);
    if (!candidate?.testCase?.startsWith('Estres:') || !resolved) {
      return base;
    }
    const expected = ctx.playerSwapEstresExpectedLines(candidate.testCase);
    if (!expected) {
      return base;
    }
    const starterLine = ctx.positionPixelLine(resolved.starterPosition);
    const benchLine = ctx.positionPixelLine(resolved.benchPosition);
    if (starterLine === expected.starterLine && benchLine === expected.benchLine) {
      return base;
    }
      return `${base} · fallback ${starterLine}→${benchLine}`;
  
}

export function runTestHarnessPlayerSwapRoleRisk(ctx: any, candidate: any): any {
    const roleRisk = getPlayerSwapRoleRisk(candidate, (position) => ctx.positionPixelLine(position));
    return {
      attack: roleRisk.attack,
      control: roleRisk.control,
      protection: roleRisk.protection,
      detail: roleRisk.detail ?? '',
    };
  
}

export function runTestHarnessPlayerSwapRoleTradeoff(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapRoleTradeoff(row, ctx.playerSwapRoleRisk(candidate));
  
}

export function runTestHarnessPlayerSwapSignalClass(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapSignalClass(ctx.playerSwapSignalScore(row, candidate));
  
}

export function runTestHarnessPlayerSwapSignalRead(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapSignalRead(ctx.playerSwapSignalScore(row, candidate));
  
}

export function runTestHarnessPlayerSwapSignalScore(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapSignalScore(row, ctx.playerSwapRoleRisk(candidate));
  
}

export function runTestHarnessPlayerSwapTacticalBreakdown(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapTacticalBreakdown(row, ctx.playerSwapRoleRisk(candidate), (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessPlayerSwapTacticalLabel(ctx: any, score: any, dimension: any): any {
    return getPlayerSwapTacticalLabel(score, dimension);
  
}

export function runTestHarnessRebuildPlayerSwapOptions(ctx: any, lineup: any, squad: any): any {
    if (!lineup) {
      ctx.playerSwapSlotOptions.set([]);
      ctx.playerSwapBenchOptions.set([]);
      return;
    }
    const slots = ctx.buildLineupSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const lineupIds = new Set((lineup.players ?? []).map((player: any) => player.playerId));
    const slotOptions = (lineup.players ?? [])
      .filter((player: any) => player.position !== 'GK' && slotByPlayer.has(player.playerId))
      .map((player: any) => ({
        playerId: player.playerId,
        playerName: player.name,
        position: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
        label: `${player.name} (${player.position}) · ${slotByPlayer.get(player.playerId) ?? 'slot'}`,
      }));
    const benchOptions = squad
      .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
      .map((player: any) => ({
        playerId: player.sessionPlayerId,
        playerName: player.name,
        position: player.position,
        score: player.attack + player.technique + player.speed,
        label: `${player.name} (${player.position}) · atk ${player.attack} · tech ${player.technique} · pace ${player.speed}`,
      }))
      .sort((a: any, b: any) => b.score - a.score);
    ctx.playerSwapSlotOptions.set(slotOptions);
    ctx.playerSwapBenchOptions.set(benchOptions);
    if (ctx.selectedSwapStarterIdModel && !slotOptions.some((option: any) => option.playerId === ctx.selectedSwapStarterIdModel)) {
      ctx.selectedSwapStarterIdModel = null;
    }
    if (ctx.selectedSwapBenchIdModel && !benchOptions.some((option: any) => option.playerId === ctx.selectedSwapBenchIdModel)) {
      ctx.selectedSwapBenchIdModel = null;
    }
  
}

export function runTestHarnessRunModalSubstitutionCandidates(ctx: any, matchId: any, candidates: any, seedStart: any, seedCount: any, minute: any, objective: any): any {
    return from(candidates).pipe(
      concatMap((candidate) =>
        ctx.harness.runSubstitutionWhatIfSummary(matchId, {
          playerOffId: (candidate as any).starterId,
          playerOnId: (candidate as any).benchId,
          minute,
          seedStart,
          seedCount,
          controlledTeamSide: ctx.controlledTeamSideModel,
        }).pipe(map((row) => ({ candidate, row })))
      ),
      toArray(),
      map((items) => objective === 'PROTECT_RESULT'
        ? items.sort((a: any, b: any) => ctx.modalProtectWhatIfScore(b.row) - ctx.modalProtectWhatIfScore(a.row))
        : items.sort((a: any, b: any) => ctx.modalRecommendationWhatIfScore(b.row, objective) - ctx.modalRecommendationWhatIfScore(a.row, objective))
      )
    );
  
}

export function runTestHarnessRunPlayerSwapBatteryMode(ctx: any, matchId: any, seedStart: any, seedCount: any, mode: any, lineup: any, squad: any): any {
    const candidates = lineup ? ctx.pickPlayerSwapBatteryCandidates(lineup, squad, 6, mode) : [];
    const effectiveCandidates = candidates.length > 0
      ? candidates
      : mode === 'stress'
        ? ctx.autoBackendEstresSwapCandidates()
        : [ctx.autoBackendPlayerSwapCandidate()];
    return ctx.runPlayerSwapCandidates(matchId, effectiveCandidates, seedStart, seedCount);
  
}

export function runTestHarnessRunPlayerSwapCandidates(ctx: any, matchId: any, candidates: any, seedStart: any, seedCount: any): any {
    return from(candidates).pipe(
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
    );
  
}

export function runTestHarnessRunProfessionalSmokeSubstitutionStage(ctx: any, onComplete: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      onComplete();
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    const seedCount = Math.max(10, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 10)));
    const minute = 60;
    ctx.substitutionWhatIfSummary.set(null);
    ctx.analysisReadyMessage.set(`Smoke profesional full: substitution what-if min ${minute}, ${seedCount} seeds...`);
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
        const objective = ctx.playerSwapEffectiveCoachObjective();
        const manualCandidate = ctx.pickAutomaticSwapCandidate(lineup, squad);
        const manualPlayerOffId = ctx.selectedSwapStarterIdModel || manualCandidate?.starterId;
        const manualPlayerOnId = ctx.selectedSwapBenchIdModel || manualCandidate?.benchId;
        const objectiveCandidates = ctx.pickModalRecommendationSwapCandidates(lineup, squad, objective, 6);
        const candidates = ctx.selectedSwapStarterIdModel || ctx.selectedSwapBenchIdModel
          ? manualPlayerOffId && manualPlayerOnId
            ? [{
                starterId: manualPlayerOffId,
                starterName: manualCandidate?.starterName ?? 'Manual starter',
                starterPosition: manualCandidate?.starterPosition ?? 'AUTO',
                benchId: manualPlayerOnId,
                benchName: manualCandidate?.benchName ?? 'Manual bench',
                benchPosition: manualCandidate?.benchPosition ?? 'AUTO',
                slotId: manualCandidate?.slotId ?? '',
                testCase: `Smoke manual: ${ctx.scenarioBatteryCoachObjectiveLabel(objective)}`,
              }]
            : []
          : objectiveCandidates;
        if (candidates.length === 0) {
          throw new Error('No pude resolver candidatos seguros para substitution smoke.');
        }
        return ctx.harness.setStyle(ctx.selectedStyleModel).pipe(
          switchMap(() => ctx.runModalSubstitutionCandidates(matchId, candidates, seedStart, seedCount, minute, objective)),
          map((items) => {
            const safe = (items as any).find((item: any) => ctx.modalRecommendationWhatIfIsSafe(item.row, objective));
            if (!safe) {
              throw new Error(`Sin sustitución segura para ${ctx.scenarioBatteryCoachObjectiveLabel(objective)}.`);
            }
            return safe.row;
          })
        );
      }),
      timeout(60_000),
      map((row) => ({ row, issue: null as string | null })),
      catchError((err) => of({
        row: null as SubstitutionWhatIfSummaryRow | null,
        issue: ctx.fmtError(err, 'Simular sustitución timeout/error'),
      }))
    ).subscribe({
      next: ({ row, issue }) => {
        const before = ctx.professionalSmokeSummary();
        if (row) {
          ctx.substitutionWhatIfSummary.set({
            ...row,
            readClass: ctx.deltaClass((row as any).deltaXgDiff + (row as any).deltaShotsFor * 0.04 - (row as any).deltaXgAgainst * 0.6),
          });
        }
        ctx.professionalSmokeSummary.set({
          controlledTeam: before?.controlledTeam ?? ctx.controlledTeamDisplayName(),
          scope: 'USER',
          verdict: before?.verdict,
          verdictDetail: before?.verdictDetail,
          formationRows: before?.formationRows ?? ctx.formationMatrixSummaryResults().length,
          scenarioRows: before?.scenarioRows ?? ctx.scenarioMatrixSummaryResults().length,
          formationAuditRows: before?.formationAuditRows,
          formationAuditFallbackRows: before?.formationAuditFallbackRows,
          formationAuditReviewRows: before?.formationAuditReviewRows,
          pixelRows: before?.pixelRows ?? ctx.positionPixelMatrixRows().length,
          swapRows: before?.swapRows ?? ctx.playerSwapBatterySummaries().length,
          substitutionRows: row ? 1 : 0,
          formationSeedCount: before?.formationSeedCount ?? ctx.scenarioMatrixSummaryEffectiveSeedCount(),
          scenarioSeedCount: before?.scenarioSeedCount ?? ctx.scenarioMatrixSmokeSeedCount(),
          included: [
            ...(before?.included ?? []),
            issue ?? `Simular sustitución: ${(row as any)?.playerOffName ?? 'starter'} -> ${(row as any)?.playerOnName ?? 'bench'} min ${minute} x ${seedCount} seeds`,
          ],
          skipped: before?.skipped ?? [],
          read: before?.read ?? `${ctx.controlledTeamDisplayName()}: smoke full en progreso.`,
        });
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        onComplete();
      },
    });
  
}

export function runTestHarnessScenarioBatteryAutoObjectiveHint(ctx: any): any {
    const match = ctx.selectedMatch();
    if (!match) {
      return getScenarioBatteryAutoObjectiveHint(null, 'HOME', ctx.selectedMinute());
    }
    const side = ctx.resolveControlledSideForMatch(match);
    return getScenarioBatteryAutoObjectiveHint(match, side, ctx.selectedMinute());
  
}

export function runTestHarnessScenarioBatteryCandidateMatches(ctx: any): any {
    return getScenarioBatteryCandidateMatches(
      ctx.rounds(),
      ctx.selectedMatchId(),
      ctx.scenarioBatteryMatchLimit()
    );
  
}

export function runTestHarnessScenarioBatteryCardSummary(ctx: any, row: any, title: any): any {
    return getScenarioBatteryCardSummary(row, title);
  
}

export function runTestHarnessScenarioBatteryCoachAdvice(ctx: any): any {
    return getScenarioBatteryCoachAdvice(ctx.scenarioBatteryRows());
  
}

export function runTestHarnessScenarioBatteryCoachContext(ctx: any, match: any, controlledSide: any): any {
    return getScenarioBatteryCoachContext(match, controlledSide, ctx.selectedMinute());
  
}

export function runTestHarnessScenarioBatteryCoachObjectiveHint(ctx: any): any {
    return getScenarioBatteryCoachObjectiveHint(
      ctx.scenarioBatteryCoachObjectiveModel,
      ctx.scenarioBatteryAutoObjectiveHint()
    );
  
}

export function runTestHarnessScenarioBatteryCoachObjectiveLabel(ctx: any, objective: any): any {
    return getScenarioBatteryCoachObjectiveLabel(objective);
  
}

export function runTestHarnessScenarioBatteryContextPressure(ctx: any, match: any, controlledSide: any): any {
    return getScenarioBatteryContextPressure(match, controlledSide);
  
}
