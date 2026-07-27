import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessPositionPixelTacticalReadSummary(ctx: any): any {
    const rows = ctx.positionPixelMatrixRows();
    const definitions = [
      {
        label: 'Tradeoffs',
        className: 'read-strong',
        hint: 'Movimientos que ganan algo pero pagan algo: más ataque con más riesgo, o más protección con menos ataque.',
        matches: (read: string) => read.startsWith('Tradeoff'),
      },
      {
        label: 'Double gain',
        className: 'read-visible',
        hint: 'Movimientos que mejoran ataque y defensa a la vez.',
        matches: (read: string) => read === 'Double gain',
      },
      {
        label: 'Attack gain',
        className: 'read-visible',
        hint: 'Movimientos que mejoran amenaza ofensiva sin abrir demasiado riesgo.',
        matches: (read: string) => read === 'Attack gain',
      },
      {
        label: 'Def. gain',
        className: 'read-visible',
        hint: 'Movimientos que protegen mejor sin una pérdida ofensiva fuerte.',
        matches: (read: string) => read === 'Def. gain',
      },
      {
        label: 'Risk/Bad',
        className: 'read-check',
        hint: 'Movimientos que abren riesgo defensivo o empeoran ataque y defensa.',
        matches: (read: string) => read === 'Risk' || read === 'Bad tradeoff' || read === 'Visible risk',
      },
      {
        label: 'Cost',
        className: 'read-visible',
        hint: 'Movimientos que tienen costo ofensivo visible, pero no necesariamente abren riesgo defensivo.',
        matches: (read: string) => read === 'Attack loss' || read === 'Visible attack loss',
      },
      {
        label: 'Micro review',
        className: 'read-check',
        hint: 'Micro-movimientos con señal llamativa: revisar con más seeds antes de decidir.',
        matches: (read: string) => read === 'Micro review',
      },
      {
        label: 'Neutral/Small',
        className: 'read-stable',
        hint: 'Movimientos con señal chica, compensada, micro o neutra.',
        matches: (read: string) => read === 'Neutral' || read === 'Small signal' || read === 'Compensated' || read === 'Micro stable' || read === 'Visible small',
      },
    ];
    return definitions.map((definition) => ({
      label: definition.label,
      className: definition.className,
      hint: definition.hint,
      count: rows.filter((row: any) => definition.matches(ctx.positionPixelTacticalRead(row))).length,
    }));
  
}

export function runTestHarnessPositionPixelUsesContextualCoverage(ctx: any, row: any, coverage: any): any {
    return getPositionPixelUsesContextualCoverage(row, ctx.positionPixelSourceLine(row), coverage);
  
}

export function runTestHarnessPositionPixelVisualChannel(ctx: any, xPercent: any): any {
    return getPositionPixelVisualChannel(xPercent);
  
}

export function runTestHarnessPositionPixelVisualChannelLabel(ctx: any, xPercent: any): any {
    return ctx.positionPixelChannelLabel(ctx.positionPixelVisualChannel(xPercent));
  
}

export function runTestHarnessPositionPixelVisualEngineTensionClass(ctx: any, row: any): any {
    return getPositionPixelVisualEngineTensionClass(ctx.positionPixelVisualEngineTensions(row));
  
}

export function runTestHarnessPositionPixelVisualEngineTensionRead(ctx: any, row: any): any {
    return getPositionPixelVisualEngineTensionRead(ctx.positionPixelVisualEngineTensions(row));
  
}

export function runTestHarnessPositionPixelVisualEngineTensions(ctx: any, row: any): any {
    return getPositionPixelVisualEngineTensions(row, ctx.positionPixelSourceLine(row));
  
}

export function runTestHarnessPositionPixelVisualEngineTensionSummary(ctx: any): any {
    const rows: any[] = ctx.positionPixelMatrixRows();
    const contradiction = rows.filter((row) => ctx.positionPixelVisualEngineTensionRead(row) === 'Contradicción').length;
    const review = rows.filter((row) => ctx.positionPixelVisualEngineTensionRead(row) === 'Tradeoff').length;
    const coherent = Math.max(0, rows.length - contradiction - review);
    return [
      {
        label: 'Contradicción',
        count: contradiction,
        className: contradiction > 0 ? 'read-check' : 'read-stable',
        hint: 'A/C/C visual y salida del motor van en direcciones opuestas. Candidato directo a calibración.',
      },
      {
        label: 'Tradeoff',
        count: review,
        className: review > 0 ? 'read-strong' : 'read-stable',
        hint: 'Una mejora visual queda compensada por una pérdida táctica. No es bug directo; es decisión de DT.',
      },
      {
        label: 'Coherente',
        count: coherent,
        className: 'read-stable',
        hint: 'La lectura visual y el motor cuentan una historia compatible.',
      },
    ];
  
}

export function runTestHarnessPositionPixelVisualExpectationClass(ctx: any, row: any): any {
    return getPositionPixelVisualExpectationClass(ctx.positionPixelVisualExpectationRead(row));
  
}

export function runTestHarnessPositionPixelVisualExpectationMismatches(ctx: any, row: any): any {
    return getPositionPixelVisualExpectationMismatches(row, ctx.positionPixelSourceLine(row));
  
}

export function runTestHarnessPositionPixelVisualExpectationRead(ctx: any, row: any): any {
    return getPositionPixelVisualExpectationRead(row, ctx.positionPixelSourceLine(row));
  
}

export function runTestHarnessPositionPixelVisualExpectationSummary(ctx: any): any {
    const rows = ctx.positionPixelMatrixRows();
    const mismatch = rows.filter((row: any) => ctx.positionPixelVisualExpectationRead(row) === 'Visual review').length;
    const micro = rows.filter((row: any) => ctx.positionPixelVisualExpectationRead(row) === 'Visual micro').length;
    const ok = rows.filter((row: any) => ctx.positionPixelVisualExpectationRead(row) === 'Visual OK').length;
    return [
      {
        label: 'Visual review',
        count: mismatch,
        className: mismatch > 0 ? 'read-check' : 'read-stable',
        hint: 'Filas donde la expectativa visual básica necesita revisión contextual; no es contradicción automática.',
      },
      {
        label: 'Visual micro',
        count: micro,
        className: micro > 0 ? 'read-review' : 'read-stable',
        hint: 'Filas con señal visual muy chica: no son bugs directos, pero conviene revisarlas con más seeds.',
      },
      {
        label: 'Visual OK',
        count: ok,
        className: 'read-stable',
        hint: 'Filas donde la respuesta del motor es compatible con la expectativa visual básica.',
      },
    ];
  
}

export function runTestHarnessPositionPixelVisualLine(ctx: any, yPercent: any): any {
    return getPositionPixelVisualLine(yPercent);
  
}

export function runTestHarnessPositionPixelVisualLineLabel(ctx: any, yPercent: any): any {
    if (yPercent >= 32 && yPercent <= 36) return 'ATT/MID';
    if (yPercent >= 65 && yPercent <= 69) return 'MID/DEF';
    return ctx.positionPixelVisualLine(yPercent);
  
}

export function runTestHarnessPositionPixelWideChannelReason(ctx: any, row: any): any {
    return getPositionPixelWideChannelReason(row, (value) => ctx.fmtDeltaMicro(value));
  
}

export function runTestHarnessRecordPositionPixelSmokeRun(ctx: any, scope: any, label: any, rows: any): any {
    if (rows.length === 0) return;
    const aggregate = ctx.toPositionPixelMatchSmokeSummary('All completed matches', rows);
    const matchCount = new Set(rows.map((row: any) => ctx.positionPixelMatchLabel(row))).size;
    const playerCount = new Set(rows.map((row: any) => `${row.playerName}|${row.slotId}`)).size;
    const next: PositionPixelSmokeRunSummary = {
      ...aggregate,
      scope,
      label,
      matchCount,
      playerCount,
      runAt: new Date().toISOString(),
    };
    ctx.positionPixelSmokeRunSummaries.update((items: any[]) => {
      const withoutScope = items.filter((item: any) => item.scope !== scope);
      return [...withoutScope, next].sort((a, b) =>
        ctx.positionPixelSmokeScopeOrder(a.scope) - ctx.positionPixelSmokeScopeOrder(b.scope)
      );
    });
  
}

export function runTestHarnessRoleSlotImpactCoachRead(ctx: any): any {
    const rows: any[] = ctx.roleSlotImpactRows();
    if (rows.length === 0) return '';
    const best = rows.reduce((acc: any, row: any) => row.playerEffectiveness > acc.playerEffectiveness ? row : acc, rows[0]);
    const worst = rows.reduce((acc: any, row: any) => row.playerEffectiveness < acc.playerEffectiveness ? row : acc, rows[0]);
    const gap = best.playerEffectiveness - worst.playerEffectiveness;
    if (gap >= 0.45) {
      return `Lectura: ${best.testedNaturalPosition} encaja muchísimo mejor que ${worst.testedNaturalPosition}; el slot no es cosmético.`;
    }
    if (gap >= 0.20) {
      return `Lectura: hay diferencia visible entre roles; conviene mirar xG/tiros para decidir si está calibrado.`;
    }
    return 'Lectura: señal suave; revisar si este slot necesita más peso en el motor.';
  
}

export function runTestHarnessRoleSlotImpactFitClass(ctx: any, row: any): any {
    if (row.playerEffectiveness >= 0.85) return 'delta-positive';
    if (row.playerEffectiveness >= 0.68) return 'read-stable';
    if (row.playerEffectiveness >= 0.45) return 'read-check';
    return 'delta-negative';
  
}

export function runTestHarnessRoleSlotImpactFitRead(ctx: any, row: any): any {
    if (row.playerEffectiveness >= 0.85) return 'rol natural / ideal';
    if (row.playerEffectiveness >= 0.68) return 'sirve, no ideal';
    if (row.playerEffectiveness >= 0.45) return 'improvisado';
    return 'fuera de rol grave';
  
}

export function runTestHarnessRoleSlotImpactKindForSlot(ctx: any, slotId: any): any {
    const preset = ctx.roleSlotImpactSlotOptions.find((option: any) => option.slotId === slotId)?.kind;
    if (preset) return preset;
    const y = subdivisionYPercent(slotId);
    if (typeof y === 'number') {
      if (y <= 35) {
        const x = subdivisionXPercent(slotId) ?? 50;
        return typeof x === 'number' && Math.abs(x - 50) >= 28 ? 'wideAtt' : 'att';
      }
      if (y <= 68) return 'mid';
    }
    return 'def';
  
}

export function runTestHarnessRoleSlotImpactNaturalPositionsForSlot(ctx: any, slotId: any): any {
    const kind = ctx.roleSlotImpactKindForSlot(slotId);
    if (kind === 'wideAtt') return ['RW', 'LW', 'WINGER', 'ATT', 'CAM', 'MID', 'DEF'];
    if (kind === 'att') return ['ST', 'CF', 'ATT', 'WINGER', 'CAM', 'MID', 'DEF'];
    if (kind === 'mid') return ['CM', 'MID', 'CDM', 'CAM', 'WINGER', 'ATT', 'DEF'];
    return ['CB', 'DEF', 'LB', 'RB', 'CDM', 'MID', 'ATT', 'WINGER'];
  
}

export function runTestHarnessRoleSlotImpactSlotHint(ctx: any): any {
    const option = ctx.roleSlotImpactAvailableSlotOptions().find((candidate: any) => candidate.slotId === ctx.roleSlotImpactSlotIdModel);
    if (!option) return 'Elegí un slot táctico';
    if (option.kind === 'wideAtt') return 'Compara extremo natural vs improvisados';
    if (option.kind === 'att') return 'Compara delantero vs extremos/medios/defensas';
    if (option.kind === 'mid') return 'Compara mediocentro vs atacante/defensor';
    return 'Compara defensor natural vs improvisados';
  
}

export function runTestHarnessRoleSlotImpactSmokeExportPayload(ctx: any): any {
    const rows = ctx.roleSlotImpactSmokeRows();
    const match = ctx.selectedMatch();
    const matchLabel = match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Unknown match';
    return {
      match: matchLabel,
      formation: ctx.selectedFormationModel ?? null,
      seedStart: ctx.summarySeedStart(),
      seedCount: 10,
      generatedAt: new Date().toISOString(),
      summary: countRoleSlotImpactSmokeVerdicts(rows),
      rows,
    };
  
}

export function runTestHarnessRoleSlotImpactSmokeMarkdownReport(ctx: any): any {
    return buildRoleSlotImpactSmokeMarkdownReport(
      ctx.roleSlotImpactSmokeExportPayload(),
      (value) => ctx.fmtPct(value)
    );
  
}

export function runTestHarnessRoleSlotOptionsFromLineup(ctx: any, lineup: any): any {
    const playerById = new Map<string, any>((lineup.players ?? []).map((player: any) => [player.playerId, player]));
    return ctx.buildLineupSlots(lineup).map((slot: any) => {
      const player = playerById.get(slot.playerId);
      return {
        slotId: slot.subdivisionId,
        label: `${slot.subdivisionId} · ${player?.name ?? slot.playerId} (${player?.position ?? '?'})`,
      };
    });
  
}
