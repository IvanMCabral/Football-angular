import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessBuildLineupDebugSnapshot(ctx: any, lineup: any, label: any, visualLineFilter: any, candidates: any): any {
    const formation = lineup.formation ?? ctx.selectedFormationModel ?? '';
    const persistedSlots = ctx.buildLineupSlots(lineup);
    const effectiveSlots = ctx.effectivePositionPixelSlots(lineup);
    const persistedByPlayer = new Map<string, any>(persistedSlots.map((slot: any) => [slot.playerId, slot]));
    const effectiveByPlayer = new Map<string, any>(effectiveSlots.map((slot: any) => [slot.playerId, slot]));
    const candidateIds = new Set(candidates.map((candidate: any) => candidate.starterId));
    const warnings: string[] = [];
    const players = lineup.players ?? [];
    if (players.length === 0 && candidates.length > 0) {
      warnings.push('Sweep de calibración sin XI actual; usa candidatos preset del partido.');
    } else if (players.length !== 11) {
      warnings.push(`XI incompleto: ${players.length}/11 jugadores.`);
    }
    if (persistedSlots.length < Math.min(players.length, 11)) {
      warnings.push(`Persisted slots incomplete: ${persistedSlots.length}/${Math.min(players.length, 11)}. Canonical fallback may be used.`);
    }
    if (visualLineFilter && candidates.length <= 1) {
      warnings.push(`${visualLineFilter} smoke has only ${candidates.length} candidate(s); verify lineup slots or tactical roles.`);
    }
    const rows = players.map((player: any, index: any): LineupDebugRow => {
      const persisted = persistedByPlayer.get(player.playerId);
      const effective = effectiveByPlayer.get(player.playerId);
      const slot = effective ?? persisted ?? null;
      const x = ctx.matchContextXPercent(slot) ?? ctx.canonicalXPercent(formation, slot);
      const y = ctx.matchContextYPercent(slot) ?? ctx.canonicalYPercent(formation, slot);
      const source: LineupDebugRow['source'] = persisted
        ? 'persisted'
        : effective
          ? 'canonical'
          : 'missing';
      const visualLine: LineupDebugRow['visualLine'] = player.position === 'GK'
        ? 'GK'
        : y === null
          ? 'UNKNOWN'
          : ctx.positionPixelVisualLine(y);
      return {
        index: index + 1,
        playerId: player.playerId,
        name: candidateIds.has(player.playerId) ? `${player.name} *` : player.name,
        position: player.position,
        slotId: slot?.subdivisionId ?? '',
        x,
        y,
        visualLine,
        source,
      };
    });
    return {
      label,
      formation,
      selectedFormation: ctx.selectedFormationModel ?? '',
      playerCount: players.length,
      nonGkCount: players.filter((player: any) => player.position !== 'GK').length,
      persistedSlotCount: persistedSlots.length,
      effectiveSlotCount: effectiveSlots.length,
      candidatesCount: candidates.length,
      visualLineFilter: visualLineFilter ?? 'any',
      rows,
      warnings,
    };
  
}

export function runTestHarnessBuildSingleMatchPreset(ctx: any): any {
    const userTeam = ctx.userTeamName();
    if (!userTeam) {
      return [];
    }
    const userMatches = ctx.rounds()
      .flatMap((round: any) => round.matches)
      .filter((match: any) => match.homeTeamName === userTeam || match.awayTeamName === userTeam);
    const rivals = new Map<string, { teamId: string; teamName: string }>();
    let userTeamId: string | null = null;
    for (const match of userMatches) {
      const isHome: boolean = match.homeTeamName === userTeam;
      const currentUserTeamId: string = isHome ? match.homeTeamId : match.awayTeamId;
      const rivalTeamId: string = isHome ? match.awayTeamId : match.homeTeamId;
      const rivalTeamName: string = isHome ? match.awayTeamName : match.homeTeamName;
      if (!currentUserTeamId || !rivalTeamId || !rivalTeamName || rivalTeamName === userTeam) {
        continue;
      }
      userTeamId = userTeamId ?? currentUserTeamId;
      if (!rivals.has(rivalTeamId)) {
        rivals.set(rivalTeamId, { teamId: rivalTeamId, teamName: rivalTeamName });
      }
    }
    if (!userTeamId || rivals.size === 0) {
      return [];
    }
    return Array.from(rivals.values()).slice(0, 3).map((rival, index) => {
      const userHome = index % 2 === 0;
      return {
        round: index + 1,
        homeTeamId: userHome ? userTeamId : rival.teamId,
        awayTeamId: userHome ? rival.teamId : userTeamId,
        matchId: null,
      };
    });
  
}

export function runTestHarnessClearRoundRefreshTimers(ctx: any): any {
    for (const timer of ctx.roundRefreshTimers) {
      clearTimeout(timer);
    }
    ctx.roundRefreshTimers = [];
  
}

export function runTestHarnessFixtureToMatchRow(ctx: any, f: any): any {
    return {
      matchId: f.matchId,
      round: f.round,
      homeTeamId: f.homeTeamId,
      homeTeamName: f.homeTeamName ?? f.homeTeamId,
      awayTeamId: f.awayTeamId,
      awayTeamName: f.awayTeamName ?? f.awayTeamId,
      status: f.status,
      homeGoals: f.homeGoals ?? null,
      awayGoals: f.awayGoals ?? null,
      homeStrength: f.homeStrength ?? null,
      awayStrength: f.awayStrength ?? null,
      homeFormation: null,
      awayFormation: null,
      roundId: f.roundId ?? null,
    };
  
}

export function runTestHarnessFmtError(ctx: any, err: any, fallback: any): any {
    if (err && typeof err === 'object') {
      const nested = (err as { error?: { message?: unknown } }).error;
      if (nested?.message) {
        return String(nested.message);
      }
      const message = (err as { message?: unknown }).message;
      if (message) {
        return String(message);
      }
    }
    return fallback;
  
}

export function runTestHarnessFormationSummaryReadDetail(ctx: any, row: any): any {
    const attackShape = `${ctx.fmtXg(row.avgShapeAttackVolumeMultiplier)} atkVol`;
    const defenseShape = `${ctx.fmtXg(row.avgShapeDefensiveResistanceMultiplier)} defRes`;
    const attackChannels = `Atk L/C/R ${ctx.fmtXg(row.avgShapeAttackLeft)}/${ctx.fmtXg(row.avgShapeAttackCenter)}/${ctx.fmtXg(row.avgShapeAttackRight)}`;
    const defenseChannels = `Def L/C/R ${ctx.fmtXg(row.avgShapeDefenseLeft)}/${ctx.fmtXg(row.avgShapeDefenseCenter)}/${ctx.fmtXg(row.avgShapeDefenseRight)}`;
    return [
      ctx.formationSummaryRead(row),
      `xG ${ctx.fmtXg(row.avgXgFor)} / xGA ${ctx.fmtXg(row.avgXgAgainst)} / diff ${ctx.fmtDeltaNumber(row.avgXgDiff)}`,
      `shots ${ctx.fmtXg(row.avgShotsFor)} / ag ${ctx.fmtXg(row.avgShotsAgainst)}`,
      `poss ${ctx.fmtPct(row.avgPossessionFor)}`,
      `${attackShape}; ${defenseShape}`,
      attackChannels,
      defenseChannels,
    ].join(' · ');
  
}

export function runTestHarnessLoadMatches(ctx: any, onLoaded: any): any {
    ctx.careerService.getAllFixturesWithBye().subscribe({
      next: (resp: any) => {
        const rounds: RoundGroup[] = (resp?.rounds ?? []).map((rd: any) => ({
          round: rd.round,
          byeTeam: rd.byeTeam ?? null,
          matches: (rd.matches ?? []).map((f: Fixture) =>
            ctx.fixtureToMatchRow(f)
          ),
        }));
        const matchCount = rounds.reduce((acc, round) => acc + round.matches.length, 0);
        if (matchCount === 0) {
          ctx.loadMatchesFromSnapshot(onLoaded);
          return;
        }
        ctx.rounds.set(rounds);
        ctx.rehydrateSelectedMatchFromRounds(rounds);
        ctx.loading.set(false);
        onLoaded?.(rounds);
      },
      error: (err: any) => {
        ctx.loadError.set(
          ctx.fmtError(err, 'Failed to load match list')
        );
        ctx.loading.set(false);
      },
    });
  
}

export function runTestHarnessLoadMatchesFromSnapshot(ctx: any, onLoaded: any): any {
    (ctx.http as HttpClient).get<TestHarnessSnapshotResponse>(`${environment.apiUrl}/test-harness/career/snapshot`).subscribe({
      next: (snapshot: any) => {
        ctx.squadHealthSummary.set(snapshot?.squadHealthSummary ?? null);
        const rounds = ctx.snapshotFixturesToRoundGroups(snapshot?.fixtures ?? []);
        ctx.rounds.set(rounds);
        ctx.rehydrateSelectedMatchFromRounds(rounds);
        ctx.loading.set(false);
        onLoaded?.(rounds);
      },
      error: (err: any) => {
        ctx.loadError.set(
          ctx.fmtError(err, 'Failed to load match list')
        );
        ctx.loading.set(false);
      },
    });
  
}

export function runTestHarnessLogHarnessRestoreWarning(ctx: any, err: any): any {
    ctx.logger.warn('[TEST-HARNESS] Failed to restore lineup after last modal move smoke:', err);
  
}

export function runTestHarnessNgOnDestroy(ctx: any): any {
    if (ctx.timelineFetchTimer) {
      clearTimeout(ctx.timelineFetchTimer);
      ctx.timelineFetchTimer = null;
    }
    ctx.clearRoundRefreshTimers();
  
}

export function runTestHarnessNgOnInit(ctx: any): any {
    ctx.loadFormationCoordinateCache();
    ctx.reload();
  
}

export function runTestHarnessPlayerSwapCoachReadDetail(ctx: any, row: any, candidate: any): any {
    return getPlayerSwapCoachReadDetail(row, ctx.playerSwapRoleRisk(candidate), (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessPlayerSwapFitDetail(ctx: any, candidate: any): any {
    return getPlayerSwapFitDetail(candidate, (position) => ctx.positionPixelLine(position));
  
}

export function runTestHarnessPlayerSwapSignalDetail(ctx: any, row: any, candidate: any): any {
    const roleRisk = ctx.playerSwapRoleRisk(candidate);
    return [
      `señal ${ctx.playerSwapSignalScore(row, candidate).toFixed(3)}`,
      `xG diff ${ctx.fmtDeltaNumber(row.deltaXgDiff)}`,
      `pre-auto-sub ${ctx.fmtDeltaNumber(row.preAutoSubDeltaXgDiff || 0)}`,
      `shots ${ctx.fmtDeltaNumber(row.deltaShotsFor)}/${ctx.fmtDeltaNumber(row.deltaShotsAgainst)}`,
      `rol att/control/prot ${roleRisk.attack.toFixed(3)}/${roleRisk.control.toFixed(3)}/${roleRisk.protection.toFixed(3)}`,
    ].join(' ? ');
  
}

export function runTestHarnessPositionPixelChannelBreakdownDetail(ctx: any, row: any): any {
    const breakdown = ctx.positionPixelChannelBreakdown(row);
    return getPositionPixelChannelBreakdownDetail(
      row,
      breakdown,
      (value) => ctx.fmtDeltaMicro(value),
      (value) => ctx.fmtDeltaNumber(value),
      ctx.positionPixelContextualCoverageNote(row, breakdown.coverage)
    );
  
}

export function runTestHarnessPositionPixelShapeMoveDetail(ctx: any, row: any): any {
    return getPositionPixelShapeMoveDetail(row);
  
}

export function runTestHarnessPositionPixelSignalDetailFromRow(ctx: any, row: any): any {
    return getPositionPixelSignalDetail(row, (value) => ctx.fmtDeltaMicro(value), (value) => ctx.fmtDeltaNumber(value));
  
}

export function runTestHarnessPositionPixelVisualEngineTensionDetail(ctx: any, row: any): any {
    return getPositionPixelVisualEngineTensionDetail(
      ctx.positionPixelVisualEngineTensions(row),
      ctx.positionPixelChannelBreakdownRead(row),
      ctx.positionPixelTacticalRead(row)
    );
  
}

export function runTestHarnessPositionPixelVisualExpectationDetail(ctx: any, row: any): any {
    return getPositionPixelVisualExpectationDetail(
      row,
      ctx.positionPixelSourceLine(row),
      ctx.positionPixelShapeMove(row),
      ctx.positionPixelChannelBreakdownRead(row)
    );
  
}

export function runTestHarnessRefreshDetailAfterMutation(ctx: any, delayMs: any): any {
    const current = ctx.selectedMatchId();
    if (current) {
      const remount = () => {
        ctx.detailRefreshToken.update((value: any) => value + 1);
        ctx.detailPanelVisible.set(false);
        setTimeout(() => ctx.detailPanelVisible.set(true), 0);
      };
      if (delayMs > 0) {
        setTimeout(remount, delayMs);
      } else {
        remount();
      }
    }
  
}

export function runTestHarnessRefreshLineupContext(ctx: any): any {
    if (typeof ctx.harness.getCurrentLineup !== 'function') {
      return;
    }
    const lineup$ = ctx.harness.getCurrentLineup();
    if (!lineup$ || typeof lineup$.pipe !== 'function') {
      return;
    }
    forkJoin({
      lineup: lineup$.pipe(catchError(() => of(null))),
      squad: (ctx.http as HttpClient).get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        catchError(() => of([] as SessionPlayer[]))
      ),
    })
      .pipe(catchError(() => of(null)))
      .subscribe((context) => {
        const lineup = (context as any)?.lineup ?? null;
        const squad = (context as any)?.squad ?? [];
        const formation = lineup?.formation;
        if (formation && ctx.formationCodes.includes(formation as FormationCode)) {
          ctx.selectedFormationModel = formation as FormationCode;
        }
        ctx.rebuildPlayerSwapOptions(lineup, squad);
      });
  
}

export function runTestHarnessRehydrateSelectedMatchFromRounds(ctx: any, rounds: any): any {
    const currentMatchId = ctx.selectedMatchId();
    if (!currentMatchId) {
      return;
    }
    const refreshedMatch = rounds
      .flatMap((round: any) => round.matches)
      .find((match: any) => match.matchId === currentMatchId);
    if (refreshedMatch) {
      ctx.selectedMatch.set(refreshedMatch);
      if (typeof refreshedMatch.round === 'number' && ctx.selectedRoundModel !== refreshedMatch.round) {
        ctx.selectedRoundModel = refreshedMatch.round;
      }
    }
  
}

export function runTestHarnessReload(ctx: any): any {
    ctx.loading.set(true);
    ctx.loadError.set(null);
    ctx.careerService.getCareerStatus().subscribe({
      next: (status: any) => {
        if (!status.careerId) {
          ctx.careerId.set(null);
          ctx.userTeamName.set(null);
          ctx.selectedMatch.set(null);
          ctx.rounds.set([]);
          ctx.loading.set(false);
          return;
        }
        ctx.careerId.set(status.careerId);
        ctx.userTeamName.set(status.userTeamName ?? null);
        ctx.refreshLineupContext();
        ctx.loadMatches();
      },
      error: (err: any) => {
        ctx.loadError.set(
          err?.error?.message ?? err?.message ?? 'Failed to load career status.'
        );
        ctx.loading.set(false);
      },
    });
  
}

export function runTestHarnessScenarioBatteryCardDetail(ctx: any, row: any, title: any): any {
    return getScenarioBatteryCardDetail(row, title);
  
}

export function runTestHarnessScenarioBatteryRiskCardDetail(ctx: any, row: any): any {
    return getScenarioBatteryRiskCardDetail(row);
  
}

export function runTestHarnessScenarioSummaryCoachReadDetail(ctx: any, row: any): any {
    return getScenarioSummaryCoachReadDetail(
      ctx.scenarioSummaryCoachRead(row),
      ctx.scenarioSummaryUserChannelRead(row),
      ctx.scenarioSummaryOpponentChannelRead(row),
      ctx.fmtDeltaNumber(row.avgUserXgDelta),
      ctx.fmtDeltaNumber(row.avgOpponentXgDelta),
      ctx.fmtDeltaNumber(row.avgUserShotsDelta),
      ctx.fmtDeltaNumber(row.avgOpponentShotsDelta),
      ctx.fmtDeltaNumber(row.avgOpponentLeftWideXgDelta),
      ctx.fmtDeltaNumber(row.avgOpponentRightWideXgDelta)
    );
  
}

export function runTestHarnessScenarioSummaryRecommendationDetail(ctx: any, row: any): any {
    return getScenarioSummaryRecommendationDetail(
      ctx.scenarioSummaryRecommendation(row),
      ctx.scenarioSummaryRead(row),
      ctx.scenarioSummaryOutcome(row),
      ctx.scenarioSummaryCoachReadDetail(row)
    );
  
}

export function runTestHarnessScheduleRoundCompletionRefresh(ctx: any, roundNumber: any, expectedMatchCount: any): any {
    ctx.clearRoundRefreshTimers();
    const refresh = () => {
      ctx.loadMatches((rounds: any) => {
        const roundGroup = rounds.find((r: any) => r.round === roundNumber);
        const completed = (roundGroup?.matches ?? [])
          .filter((match: any) => String(match.status).toUpperCase() === 'COMPLETED')
          .length;
        if (expectedMatchCount > 0 && completed >= expectedMatchCount) {
          ctx.clearRoundRefreshTimers();
          ctx.snackBar.open(
            `Fecha ${roundNumber} completada (${completed}/${expectedMatchCount}). Tablero batería ya tiene más muestra.`,
            'OK',
            { duration: 3500 }
          );
        }
      });
    };
    refresh();
    for (const delayMs of [1500, 4000, 8000, 12000, 20000, 35000, 50000, 65000]) {
      ctx.roundRefreshTimers.push(setTimeout(refresh, delayMs));
    }
  
}

export function runTestHarnessSelectMatch(ctx: any, m: any): any {
    const previousMatchId = ctx.selectedMatchId();
    ctx.selectedMatchId.set(m.matchId);
    ctx.selectedMatch.set(m);
    if (typeof m.round === 'number' && ctx.selectedRoundModel !== m.round) {
      ctx.selectedRoundModel = m.round;
    }
    if (!ctx.selectedMatchIncludesUserTeam() && ctx.controlledTeamSideModel === 'USER') {
      ctx.controlledTeamSideModel = 'HOME';
    }
    // Reset the scrubber to the start of the match when switching matches.
    ctx.selectedMinute.set(0);
    if (previousMatchId !== m.matchId) {
      ctx.clearReplayAnalysisForMatchChange(m);
    }
    ctx.refreshLineupContext();
  
}
