import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessSelectedUserTeamIsHome(ctx: any): any {
    const match = ctx.selectedMatch();
    const userTeam = ctx.userTeamName();
    return !!match && !!userTeam && match.homeTeamName === userTeam;
  
}

export function runTestHarnessSessionPlayerOverall(ctx: any, player: any): any {
    const raw = (player as SessionPlayer & { overall?: number }).overall;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    return Math.round(ctx.playerSwapBenchScore(player) / 6);
  
}

export function runTestHarnessSigned(ctx: any, value: any): any {
    const numeric = Number(value ?? 0);
    const fixed = Math.abs(numeric) >= 10 ? numeric.toFixed(1) : numeric.toFixed(2);
    return `${numeric >= 0 ? '+' : ''}${fixed}`;
  
}

export function runTestHarnessStyleShort(ctx: any, style: any): any {
    if (!style) {
      return '-';
    }
    return ctx.teamStyleOptions.find((o: any) => o.value === style)?.label ?? style;
  
}

export function runTestHarnessSummarizeShotZones(ctx: any, detail: any): any {
    return summarizeMatchShotZones(detail);
  
}

export function runTestHarnessTacticalRoleFromVisualLine(ctx: any, line: any): any {
    if (line === 'DEF') return 'DEF';
    if (line === 'ATT') return 'ATT';
    return 'MID';
  
}

export function runTestHarnessToFormationCoachPick(ctx: any, label: any, row: any): any {
    const bestOfBad = ctx.formationPickIsBestOfBad(row);
    const badCoachSlot = bestOfBad && (label.includes('balance') || label.includes('segura'));
    const displayLabel = badCoachSlot
      ? 'Mejor dentro de mal escenario'
      : label;
    const read = badCoachSlot ? 'Mal menor' : ctx.formationSummaryRead(row);
    const detail = [
      ...(badCoachSlot ? ['no es plan ganador; necesita mejorar XI/tactica'] : []),
      `xG ${ctx.fmtXg(row.avgXgFor)} / ${ctx.fmtXg(row.avgXgAgainst)}`,
      `diff ${ctx.fmtDeltaNumber(row.avgXgDiff)}`,
      `tiros ${ctx.fmtXg(row.avgShotsFor)} / ${ctx.fmtXg(row.avgShotsAgainst)}`,
      `posesion ${ctx.fmtPct(row.avgPossessionFor)}`,
    ].join(' · ');
    return {
      label: displayLabel,
      formation: row.formation,
      read,
      detail,
      identity: ctx.formationSummaryIdentity(row),
      cssClass: badCoachSlot ? 'read-check' : ctx.formationSummaryReadClass(row),
    };
  
}

export function runTestHarnessTrackByFormationSummary(ctx: any, _index: any, row: any): any {
    return row.formation;
  
}

export function runTestHarnessTrackByLineupDiagnosticPlayer(ctx: any, _index: any, player: any): any {
    return player.playerId;
  
}

export function runTestHarnessTrackByLineupDiagnosticTeam(ctx: any, _index: any, team: any): any {
    return team.teamId;
  
}

export function runTestHarnessTrackByMatchId(ctx: any, _index: any, m: any): any {
    return m.matchId;
  
}

export function runTestHarnessUnwrapHarnessResponseRow(ctx: any, row: any): any {
    if (row && typeof row === 'object') {
      const payload = row as PositionPixelMatrixSummaryRow & {
        body?: PositionPixelMatrixSummaryRow;
        data?: PositionPixelMatrixSummaryRow;
      };
      return payload.body ?? payload.data ?? row;
    }
    return row;
  
}

export function runTestHarnessUserLineupAuditDisabledReason(ctx: any): any {
    if (!ctx.userTeamName()) {
      return 'Necesitás una carrera con equipo de usuario para auditar el lineup editable.';
    }
    if (ctx.controlledTeamSideModel !== 'USER') {
      return 'Este audit usa el lineup editable de Mi equipo. Para Local/Visitante usá Matriz formaciones o Formation avg.';
    }
    return 'Audita el lineup editable de Mi equipo.';
  
}

export function runTestHarnessUserTeamMatches(ctx: any): any {
    const team = ctx.userTeamName();
    if (!team) return [];
    return ctx.rounds()
      .flatMap((round: any) => round.matches)
      .filter((match: any) => match.homeTeamName === team || match.awayTeamName === team);
  
}

export function readTestHarnessDirtyHarnessCaseMessage(ctx: any): any {
    const health = ctx.squadHealthSummary();
    if (!health || !ctx.dirtyHarnessCase()) {
      return null;
    }
    const parts: string[] = [];
    if ((health.injuredCount ?? 0) > 0) {
      parts.push(`${health.injuredCount} lesionado(s)`);
    }
    if ((health.suspendedCount ?? 0) > 0) {
      parts.push(`${health.suspendedCount} suspendido(s)`);
    }
    if ((health.redCardsCount ?? 0) > 0) {
      parts.push(`${health.redCardsCount} roja(s)`);
    }
    return `Caso sucio para comparar: ${parts.join(' · ')}. Usá Reset Injuries antes de correr matrices si querés una lectura limpia del DT.`;
  
}

export function readTestHarnessFormationCoachSummary(ctx: any): any {
    const rows = ctx.formationMatrixSummaryResults();
    if (rows.length === 0) return null;
    const byMax = (score: (row: FormationMatrixSummaryRow) => number) =>
      [...rows].sort((a, b) => score(b) - score(a))[0];
    const byMin = (score: (row: FormationMatrixSummaryRow) => number) =>
      [...rows].sort((a, b) => score(a) - score(b))[0];
    const bestBalance = byMax((row) =>
      row.avgXgDiff * 1.3
      + row.avgShotDiff * 0.035
      + row.avgPossessionFor * 0.004
      - row.avgXgAgainst * 0.15
    );
    const bestAttack = byMax((row) =>
      row.avgXgFor * 1.1
      + row.avgShotsFor * 0.018
      + row.avgShapeAttackVolumeMultiplier * 0.12
    );
    const safest = byMin((row) =>
      row.avgXgAgainst * 1.15
      + row.avgShotsAgainst * 0.018
      - row.avgShapeDefensiveResistanceMultiplier * 0.10
    );
    const avoid = byMin((row) =>
      row.avgXgDiff * 1.25
      + row.avgShotDiff * 0.035
      - row.avgXgAgainst * 0.20
    );
    return {
      bestBalance: ctx.toFormationCoachPick('Mejor balance', bestBalance),
      bestAttack: ctx.toFormationCoachPick('Más ofensiva', bestAttack),
      safest: ctx.toFormationCoachPick('Más segura', safest),
      avoid: ctx.toFormationCoachPick('Evitar / revisar', avoid),
    };
  
}
