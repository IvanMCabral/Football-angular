import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessNaturalFitsTacticalRole(ctx: any, naturalPosition: any, tacticalRole: any): any {
    const natural = String(naturalPosition ?? '').trim().toUpperCase();
    const role = String(tacticalRole ?? '').trim().toUpperCase();
    if (!natural || !role) return true;
    if (natural === role) return true;
    const fitGroups: Record<string, string[]> = {
      LWB: ['LB', 'LW', 'LM', 'WINGER', 'DEF', 'MID'],
      RWB: ['RB', 'RW', 'RM', 'WINGER', 'DEF', 'MID'],
      LM: ['LW', 'LWB', 'LB', 'WINGER', 'MID'],
      RM: ['RW', 'RWB', 'RB', 'WINGER', 'MID'],
      CAM: ['CM', 'AM', 'CAM', 'CF', 'WINGER', 'MID', 'ATT'],
      AM: ['CM', 'CAM', 'CF', 'WINGER', 'MID', 'ATT'],
      CDM: ['CM', 'CDM', 'DM', 'CB', 'MID', 'DEF'],
      DM: ['CM', 'CDM', 'DM', 'CB', 'MID', 'DEF'],
      CF: ['ST', 'CF', 'CAM', 'ATT'],
      ST: ['ST', 'CF', 'ATT'],
      LW: ['LW', 'LM', 'WINGER'],
      RW: ['RW', 'RM', 'WINGER'],
      CB: ['CB', 'DEF'],
      LB: ['LB', 'LWB', 'DEF'],
      RB: ['RB', 'RWB', 'DEF'],
    };
    if (fitGroups[role]) {
      return fitGroups[role].includes(natural);
    }
    const naturalLine = ctx.strictPositionPixelLine(natural);
    const roleLine = ctx.strictPositionPixelLine(role);
    return !!naturalLine && !!roleLine && naturalLine === roleLine;
  
}

export function runTestHarnessOnControlledTeamSideChanged(ctx: any, value: any): any {
    const match = ctx.selectedMatch();
    if (value === 'USER' && match && !ctx.selectedMatchIncludesUserTeam()) {
      ctx.controlledTeamSideModel = 'HOME';
      ctx.analysisReadyMessage.set('Mi equipo no juega este partido; dejá el control en Local. Podés elegir Visitante manualmente.');
      return;
    }
    if (!match) {
      return;
    }
    ctx.clearReplayAnalysisResultsForLatestRun();
    ctx.analysisReadyMessage.set(`Control cambiado a ${ctx.controlledTeamDisplayName()}. Corr? de nuevo la matriz/smoke para regenerar Panel E.`);
  
}

export function runTestHarnessOnFormationChange(ctx: any, value: any): any {
    ctx.selectedFormationModel = (value as FormationCode) ?? null;
  
}

export function runTestHarnessOnReplaceFixtures(ctx: any): any {
    // For now the UI only triggers a no-op POST (the backend
    // expects a real CustomFixture[]). The full "Barcelona rival" preset
    // builder is out of F2 scope. Until then, we send an empty array.
    const preset = ctx.buildSingleMatchPreset();
    ctx.mutationInFlight.set(true);
    ctx.harness.replaceFixtures(preset).subscribe({
      next: (resp: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          resp?.message ?? 'Fixtures replaced.',
          'OK',
          { duration: 3000 }
        );
        ctx.clearMatchSelectionAfterFixtureMutation();
        // Match list will change ? reload.
        ctx.loadMatches();
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to replace fixtures'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnResetInjuries(ctx: any): any {
    ctx.mutationInFlight.set(true);
    ctx.harness.resetInjuries().subscribe({
      next: (resp: any) => {
        ctx.mutationInFlight.set(false);
        ctx.squadHealthSummary.set({
          ...(ctx.squadHealthSummary() ?? {}),
          injuredCount: 0,
          suspendedCount: 0,
          yellowCardsCount: 0,
          redCardsCount: 0,
        });
        ctx.snackBar.open(
          resp?.message ?? 'Injuries reset.',
          'OK',
          { duration: 3000 }
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to reset injuries'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnRunLinePositionSweep(ctx: any, line: any): any {
    const seedCount = Math.max(10, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 10)));
    const matches = ctx.userTeamMatches()
      .filter((match: any) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      ctx.snackBar.open(`No completed ${ctx.userTeamName() || 'user team'} matches available for ${line} position smoke.`, 'OK', { duration: 4000 });
      return;
    }
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any) => ctx.positionMovementPresets(fromX, fromY)
        .filter((preset: any) => ['5px forward', '5px deeper', '5px wide', '5px center'].includes(preset.label)),
      `${line} calibration sweep`,
      matches,
      (lineup: any) => ctx.pickPositionPixelLineCandidates(lineup, line, 6),
      line,
      true,
      line
    );
  
}

export function runTestHarnessOnRunLineupDiagnostic(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    ctx.lineupDiagnostic.set(null);
    ctx.mutationInFlight.set(true);
    ctx.harness.lineupDiagnostic(matchId, ctx.seedInputModel).subscribe({
      next: (diagnostic: any) => {
        ctx.lineupDiagnostic.set(diagnostic);
        ctx.mutationInFlight.set(false);
        ctx.markReplayAnalysisReady('XI efectivo listo en Panel E.');
        ctx.snackBar.open('XI efectivo cargado para diagnosticar el motor.', 'OK', {
          duration: 3000,
        });
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to load lineup diagnostic'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessOnRunManualExtremesPositionHunt(ctx: any): any {
    const seedCount = Math.max(10, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 10)));
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any, candidate: any) => ctx.manualExtremeMovementPresets(fromX, fromY, candidate),
      'Buscar extremos manuales',
      null,
      (lineup: any) => ctx.pickManualExtremeCandidates(lineup)
    );
  
}

export function runTestHarnessOnRunMidfielderPositionSweep(ctx: any): any {
    ctx.onRunLinePositionSweep('MID');
  
}

export function runTestHarnessOnRunPositionCalibrationSweep(ctx: any): any {
    const seedCount = Math.max(10, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 10)));
    const matches = ctx.userTeamMatches()
      .filter((match: any) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      ctx.snackBar.open(`No completed ${ctx.userTeamName() || 'user team'} matches available for position smoke.`, 'OK', { duration: 4000 });
      return;
    }
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
      'Calibration sweep',
      matches,
      null,
      null,
      true,
      'ALL'
    );
  
}

export function runTestHarnessOnRunPositionSensitivityCheck(ctx: any): any {
    const seedCount = Math.max(20, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 20)));
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any) => ctx.positionMicroMovementPresets(fromX, fromY),
      'Chequeo sensibilidad'
    );
  
}

export function runTestHarnessOnSliderInput(ctx: any, event: any): any {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (Number.isFinite(value) && value >= 0 && value <= TIMELINE_MAX_MINUTE) {
      ctx.selectedMinute.set(value);
    }
  
}

export function runTestHarnessOpenSquadEditor(ctx: any): any {
    const careerId = ctx.careerId();
    if (!careerId) {
      ctx.snackBar.open('Sin carrera activa loaded.', 'OK', { duration: 3000 });
      return;
    }
    ctx.mutationInFlight.set(true);
    forkJoin({
      squad: (ctx.http as HttpClient).get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        catchError(() => of([] as SessionPlayer[]))
      ),
      lineup: (ctx.http as HttpClient).get<{ formation?: string | null }>(`${environment.apiUrl}/career/lineup/current`).pipe(
        catchError(() => of({ formation: ctx.selectedFormationModel }))
      ),
    }).subscribe({
      next: ({ squad, lineup }) => {
        ctx.mutationInFlight.set(false);
        const currentFormation =
          lineup?.formation ?? ctx.selectedFormationModel ?? '4-4-2';
        const ref = ctx.dialog.open(SquadEditorModalComponent, {
          data: {
            careerId,
            matchId: null,
            squad,
            currentFormation,
          },
          width: '98vw',
          height: '90vh',
          disableClose: false,
          panelClass: 'squad-editor-panel',
        });
        ref.afterClosed().subscribe(() => {
          ctx.refreshLineupContext();
          ctx.loadMatches();
          ctx.refreshDetailAfterMutation();
        });
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to open squad editor'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessPickAutomaticSwapCandidate(ctx: any, lineup: any, squad: any): any {
    const lineupIds = new Set((lineup.players ?? []).map((p: any) => p.playerId));
    const slots = ctx.buildLineupSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const starters = (lineup.players ?? []).filter((player: any) => player.position !== 'GK');
    const starter =
      (ctx.selectedSwapStarterIdModel
        ? starters.find((player: any) => player.playerId === ctx.selectedSwapStarterIdModel)
        : null)
      ?? starters.find((player: any) => ctx.isAttackingPosition(player.position) && slotByPlayer.has(player.playerId))
      ?? starters.find((player: any) => ctx.isAttackingPosition(player.position))
      ?? starters.find((player: any) => slotByPlayer.has(player.playerId))
      ?? starters[0];
    if (!starter) {
      return null;
    }
    const eligibleBench = squad
      .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK');
    const manualBench = ctx.selectedSwapBenchIdModel
      ? eligibleBench.find((player: any) => player.sessionPlayerId === ctx.selectedSwapBenchIdModel)
      : null;
    const bench =
      manualBench
      ?? squad
        .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended)
        .filter((player: any) => ctx.isAttackingPosition(player.position))
        .sort((a: any, b: any) => (b.attack + b.technique + b.speed) - (a.attack + a.technique + a.speed))[0]
      ?? squad
        .filter((player: any) => !lineupIds.has(player.sessionPlayerId) && !player.injured && !player.suspended && player.position !== 'GK')
        .sort((a: any, b: any) => (b.attack + b.technique + b.speed) - (a.attack + a.technique + a.speed))[0];
    if (!bench) {
      return null;
    }
    return {
      starterId: starter.playerId,
      starterName: starter.name,
      starterPosition: starter.position,
      benchId: bench.sessionPlayerId,
      benchName: bench.name,
      benchPosition: bench.position,
      slotId: slotByPlayer.get(starter.playerId) ?? '',
    };
  
}

export function runTestHarnessPickManualExtremeCandidates(ctx: any, lineup: any): any {
    const unique = new Map<string, PositionPixelCandidate>();
    for (const candidate of (['ATT', 'MID', 'DEF'] as const)
      .flatMap((line) => ctx.pickPositionPixelLineCandidates(lineup, line, 2))) {
      if (!candidate.starterId || unique.has(candidate.starterId)) { continue; }
      unique.set(candidate.starterId, candidate);
    }
    return Array.from(unique.values()).slice(0, 6);
  
}

export function runTestHarnessPickManualShapeVsPresetCandidates(ctx: any, lineup: any): any {
    const slots = ctx.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const slotMetaByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot]));
    const playerLine = (player: LineupDTO['players'][number]): 'DEF' | 'MID' | 'ATT' | null =>
      ctx.positionPixelLineFromSlot(lineup.formation, slotMetaByPlayer.get(player.playerId))
        ?? ctx.strictPositionPixelLine(player.position)
        ?? ctx.positionPixelLine(player.position);
    const movablePlayers = (lineup.players ?? [])
      .filter((player: any) => !!player.playerId && player.position !== 'GK');
    const selected = ctx.selectedSwapStarterIdModel
      ? movablePlayers.find((player: any) => player.playerId === ctx.selectedSwapStarterIdModel)
      : null;
    const byLine = new Map<'DEF' | 'MID' | 'ATT', typeof movablePlayers[number][]>();
    for (const player of movablePlayers) {
      const line = playerLine(player);
      if (!line) continue;
      const current = byLine.get(line) ?? [];
      current.push(player);
      byLine.set(line, current);
    }
    const ordered = [
      selected ?? null,
      ...(byLine.get('MID') ?? []).slice(0, 2),
      ...(byLine.get('ATT') ?? []).slice(0, 1),
      ...(byLine.get('DEF') ?? []).slice(0, 1),
    ].filter((player): player is typeof movablePlayers[number] => !!player);
    const unique = new Map<string, typeof movablePlayers[number]>();
    for (const player of ordered) {
      unique.set(player.playerId, player);
    }
    return Array.from(unique.values())
      .slice(0, 3)
      .map((player) => ({
        starterId: player.playerId,
        starterName: player.name,
        starterPosition: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
      }))
      .filter((candidate) => !!candidate.starterId);
  
}

export function runTestHarnessReadLastModalPositionMoveCase(ctx: any): any {
    try {
      const raw = window.localStorage.getItem('manager:last-modal-position-move');
      if (!raw) { return null; }
      const parsed = JSON.parse(raw) as Partial<LastModalPositionMoveCase>;
      const numericFields = [
        parsed.fromXPercent,
        parsed.fromYPercent,
        parsed.targetXPercent,
        parsed.targetYPercent,
        parsed.deltaXPercent,
        parsed.deltaYPercent,
      ];
      if (!parsed.playerId || !parsed.playerName || numericFields.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        return null;
      }
      return parsed as LastModalPositionMoveCase;
    } catch {
      return null;
    }
  
}

export function runTestHarnessResolveControlledSideForMatch(ctx: any, match: any): any {
    if (ctx.controlledTeamSideModel === 'HOME' || ctx.controlledTeamSideModel === 'AWAY') {
      return ctx.controlledTeamSideModel;
    }
    const userTeam = ctx.userTeamName();
    return userTeam && match.awayTeamName === userTeam ? 'AWAY' : 'HOME';
  
}

export function runTestHarnessRunLineupSamples(ctx: any, lineup: any, matchId: any, careerId: any, seeds: any): any {
    return from(seeds).pipe(
      concatMap((seed) =>
        ctx.harness.replayMatch(matchId, seed).pipe(
          switchMap((fixture) =>
            ctx.matchDetailApi.getMatchDetail(careerId, matchId).pipe(
              catchError(() => of(null)),
              map((detail) => ({ lineup, fixture, detail, seed }))
            )
          ),
          timeout(CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS),
          catchError(() => of(null))
        )
      )
    );
  
}

export function runTestHarnessSafeDomKey(ctx: any, value: any): any {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  
}

export function runTestHarnessSafeRatio(ctx: any, value: any, total: any): any {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return value / total;
  
}

export function runTestHarnessSelectedMatchScopeWarning(ctx: any): any {
    const m = ctx.selectedMatch();
    const userTeam = ctx.userTeamName() || 'tu equipo';
    if (!m) {
      return '';
    }
    return `Ojo: el partido seleccionado es ${m.homeTeamName} vs ${m.awayTeamName}, pero Aplicar formación / modal DT afectan a ${userTeam}. Para probar el motor de tu equipo, elegí un partido donde juegue ${userTeam}. Si querés analizar este partido igual, usa Controlar: Local/Visitante.`;
  
}

export function runTestHarnessSelectedStyleHint(ctx: any): any {
    return ctx.teamStyleOptions.find((o: any) => o.value === ctx.selectedStyleModel)?.hint ?? '';
  
}
