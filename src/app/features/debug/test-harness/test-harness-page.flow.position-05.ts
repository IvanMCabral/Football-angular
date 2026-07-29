import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessRunPositionPixelMatrixWithPresets(ctx: any, seedCount: any, presetsFor: any, label: any, targetMatches: any, candidatesFor: any, visualLineFilter: any, allowAutoFallback: any, smokeScope: any, onComplete: any): any {
    if (!targetMatches && (!ctx.selectedMatchId() || !ctx.selectedMatchIncludesUserTeam())) {
      ctx.ensureProfessionalQaChecklistMatch();
    }
    const effectiveSelectedMatch = ctx.selectedMatch();
    const matches = targetMatches ?? (effectiveSelectedMatch ? [effectiveSelectedMatch] : []);
    if (!ctx.selectedMatchId() && matches.length === 0) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.seedInputModel ?? DEFAULT_REPLAY_SEED;
    ctx.playerSwapSeedCountModel = seedCount;
    ctx.clearPositionPixelAnalysisResults();
    ctx.mutationInFlight.set(true);
    ctx.positionPixelEvidenceNote.set(null);
    ctx.lastPositionPixelRunDiagnostics.set(null);
    ctx.lastPositionPixelResponseDiagnostics.set(null);
    let lastPixelRunDiagnostics = `${label}: sin diagnóstico todavía.`;
    ctx.analysisReadyMessage.set(`${label} corriendo: preparando titulares, movimientos y ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    const lineup$ = ctx.selectedMatchIncludesUserTeam()
      ? ctx.currentOrAutoSelectedLineup(ctx.selectedFormationModel ?? '4-4-2')
      : of({
          formation: ctx.selectedFormationModel ?? 'AUTO',
          players: [] as LineupDTO['players'],
          slots: [] as LineupDTO['slots'],
        } as LineupDTO);
    lineup$.pipe(
      switchMap((lineup) => {
        let candidates = candidatesFor ? candidatesFor(lineup) : ctx.pickPositionPixelCandidates(lineup);
        const playerCount = (lineup as any).players?.length ?? 0;
        const slotCount = (lineup as any).slots?.length ?? 0;
        const nonGkCount = ((lineup as any).players ?? []).filter((player: any) => player.position !== 'GK').length;
        if (allowAutoFallback && ((candidates.length === 0 && playerCount === 0) || !ctx.selectedMatchIncludesUserTeam())) {
          candidates = ctx.autoPositionPixelCandidates();
          ctx.analysisReadyMessage.set(
            `${label} corriendo: current lineup vacío; usando Auto DEF/MID/ATT del XI real del partido.`
          );
        }
        if (candidates.length === 0) {
          throw new Error(
            `No suitable non-GK starters found for pixel movement. ` +
            `lineup players=${playerCount}, nonGK=${nonGkCount}, slots=${slotCount}, formation=${(lineup as any).formation ?? 'unknown'}.`
          );
        }
        const slots = ctx.effectivePositionPixelSlots(lineup);
        const candidateContexts = candidates.map((candidate: any) => {
          const slot = slots.find((s: any) => s.playerId === candidate.starterId);
          const fromX = ctx.matchContextXPercent(slot) ?? ctx.canonicalXPercent((lineup as any).formation, slot) ?? 50;
          const fromY = ctx.matchContextYPercent(slot) ?? ctx.canonicalYPercent((lineup as any).formation, slot) ?? ctx.fallbackYForPosition(candidate.starterPosition);
          return { candidate, fromX, fromY };
        }).filter((context: any) => !visualLineFilter || ctx.positionPixelVisualLine(context.fromY) === visualLineFilter);
        ctx.lineupDebugSnapshot.set(ctx.buildLineupDebugSnapshot(
          lineup,
          label,
          visualLineFilter,
          candidateContexts.map((context: any) => context.candidate)
        ));
        if (candidateContexts.length === 0) {
          throw new Error(
            `${label} found no candidates in visual line ${visualLineFilter ?? 'any'}. ` +
            `lineup players=${playerCount}, nonGK=${nonGkCount}, slots=${slotCount}, formation=${(lineup as any).formation ?? 'unknown'}.`
          );
        }
        const requests = candidateContexts.flatMap(({ candidate, fromX, fromY }: any) => {
          const presets = presetsFor(fromX, fromY, candidate);
          return matches.flatMap((match: any) =>
            presets.map((preset: any) =>
              ctx.harness.runPositionPixelMatrixSummary(match.matchId, {
                playerId: candidate.starterId,
                targetXPercent: preset.x,
                targetYPercent: preset.y,
                deltaXPercent: preset.dx,
                deltaYPercent: preset.dy,
                seedStart,
                seedCount,
                controlledTeamSide: ctx.controlledTeamSideModel,
              }).pipe(
                map((row) => ({
                  label: ctx.calibrationLabel(match, preset.label),
                  row,
                  empty: false,
                  error: null as string | null,
                })),
                defaultIfEmpty({
                  label: ctx.calibrationLabel(match, preset.label),
                  row: null as PositionPixelMatrixSummaryRow | null,
                  empty: true,
                  error: null,
                }),
                catchError((err) => of({
                  label: ctx.calibrationLabel(match, preset.label),
                  row: null as PositionPixelMatrixSummaryRow | null,
                  empty: false,
                  error: ctx.fmtError(err, 'position pixel request failed'),
                }))
              )
            )
          );
        });
        lastPixelRunDiagnostics = `${label}: matches=${matches.length}, candidates=${candidateContexts.length}, requests=${requests.length}, line=${visualLineFilter ?? 'any'}, selected=${ctx.selectedMatchId() ?? 'none'}.`;
        ctx.lastPositionPixelRunDiagnostics.set(lastPixelRunDiagnostics);
        if (requests.length === 0) {
          throw new Error(`No pixel movement requests were built for ${label}. ${lastPixelRunDiagnostics}`);
        }
        ctx.analysisReadyMessage.set(
          `${label} corriendo: ${requests.length} jugador/movimiento requests x ${seedCount} seeds.`
        );
        return from(requests).pipe(
          mergeMap((request$: any) => request$, 4),
          toArray()
        );
      })
    ).subscribe({
      next: (items: any) => {
        const validItems = items
          .map((item: any) => ({
            ...item,
            row: ctx.unwrapHarnessResponseRow(item.row),
          }))
          .filter((item: any): item is typeof item & { row: PositionPixelMatrixSummaryRow } => item.row !== null);
        const emptyCount = items.filter((item: any) => item.empty).length;
        const errorItems = items.filter((item: any) => item.error);
        const rows: PositionPixelMatrixSummary[] = [];
        const mapErrors: string[] = [];
        for (const item of validItems) {
          try {
            rows.push(ctx.toPositionPixelMatrixSummary(item.row, item.label));
          } catch (err) {
            mapErrors.push(`${item.label}: ${ctx.fmtError(err, 'map failed')}`);
          }
        }
        const responseDiagnostics = `${label}: responses=${items.length}, valid=${validItems.length}, mapped=${rows.length}, empty=${emptyCount}, errors=${errorItems.length}, mapErrors=${mapErrors.length}.`;
        ctx.lastPositionPixelResponseDiagnostics.set(responseDiagnostics);
        ctx.lastPositionPixelMappedRows.set(rows.length);
        ctx.positionPixelMatrixRows.set(rows);
        ctx.positionPixelMatrixSummary.set(ctx.pickPositionPixelHeadlineRow(rows));
        ctx.positionPixelEvidenceNote.set(rows.length > 0
          ? (mapErrors.length > 0 ? `${label}: filas parciales. ${responseDiagnostics} ${mapErrors[0]}` : null)
          : `${label}: sin filas útiles. ${lastPixelRunDiagnostics} ${responseDiagnostics} ${mapErrors[0] ?? errorItems[0]?.error ?? 'El motor/interceptor no devolvió cuerpo usable.'}`);
        if (smokeScope) {
          ctx.recordPositionPixelSmokeRun(smokeScope, label, rows);
        }
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        const note = ctx.fmtError(err, `${label} falló antes de generar filas`);
        ctx.positionPixelEvidenceNote.set(note);
        ctx.analysisReadyMessage.set(note);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to run position pixel matrix'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        ctx.mutationInFlight.set(false);
        const summary = ctx.positionPixelMatrixSummary();
        ctx.snackBar.open(
          summary
            ? `${label} listo: ${ctx.positionPixelMatrixRows().length} filas jugador/movimiento, ${seedCount} seeds.`
            : 'Matriz de píxeles lista sin resumen.',
          'OK',
          { duration: 4500 }
        );
        if (summary) {
          ctx.markReplayAnalysisReady(`${label} listo en Panel E.`);
        } else {
          const note = ctx.positionPixelEvidenceNote()
            ?? `${label} terminó sin filas. ${lastPixelRunDiagnostics} Revisar candidatos, slots, partido seleccionado y presets.`;
          ctx.positionPixelEvidenceNote.set(note);
          ctx.analysisReadyMessage.set(note);
          window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
        }
        onComplete?.();
      },
    });
  
}

export function runTestHarnessRunProfessionalSmokePixelStage(ctx: any, onComplete: any): any {
    const seedCount = Math.max(20, Math.min(30, Math.round(ctx.playerSwapSeedCountModel || 20)));
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any) => ctx.positionMovementPresets(fromX, fromY)
        .filter((preset: any) => [
          '5px forward',
          '5px deeper',
          '5px wide',
          '5px center',
          'big zone cross',
        ].includes(preset.label)),
      'Smoke profesional pixel sweep',
      null,
      null,
      null,
      true,
      'ALL',
      onComplete
    );
  
}

export function runTestHarnessSetPositionPixelReadFilter(ctx: any, value: any): any {
    const allowed: PositionPixelReadFilter[] = [
      'all',
      'diagonal',
      'diagonal-mismatch',
      'diagonal-micro',
      'diagonal-review',
      'visual-mismatch',
      'visual-micro',
      'visual-review',
      'big-move',
      'line-break',
      'stable',
      'visible',
      'strong',
      'check',
    ];
    ctx.positionPixelReadFilter.set(allowed.includes(value as PositionPixelReadFilter) ? (value as PositionPixelReadFilter) : 'all');
  
}

export function runTestHarnessSetPositionPixelSortMode(ctx: any, value: any): any {
    const allowed: PositionPixelSortMode[] = ['default', 'read-desc', 'impact-desc', 'distance-desc'];
    ctx.positionPixelSortMode.set(allowed.includes(value as PositionPixelSortMode) ? (value as PositionPixelSortMode) : 'default');
  
}

export function runTestHarnessStrictPositionPixelLine(ctx: any, position: any): any {
    return getStrictPositionPixelLine(position);
  
}

export function runTestHarnessSwapLineupSlot(ctx: any, slots: any, starterPlayerId: any, benchPlayerId: any): any {
    return swapLineupSlotPlayer(slots, starterPlayerId, benchPlayerId);
  
}

export function runTestHarnessToAllFormationRoleSlotSmokeRow(ctx: any, formation: any, rows: any): any {
    if (rows.length === 0) {
      return ctx.emptyAllFormationRoleSlotSmokeRow(formation, 'Sin datos');
    }
    const clear = rows.filter((row: any) => row.verdict === 'OK claro').length;
    const visible = rows.filter((row: any) => row.verdict === 'OK visible').length;
    const review = rows.length - clear - visible;
    const min = rows.reduce((acc: any, row: any) => row.gap < acc.gap ? row : acc, rows[0]);
    const totalGap = rows.reduce((acc: any, row: any) => acc + row.gap, 0);
    const avgGap = totalGap / rows.length;
    const verdict = review > 0
      ? 'Revisar'
      : clear >= Math.ceil(rows.length * 0.55)
        ? 'OK fuerte'
        : 'OK visible';
    const className = verdict === 'OK fuerte'
      ? 'delta-positive'
      : verdict === 'OK visible'
        ? 'read-stable'
        : 'read-check';
    return {
      formation,
      slots: rows.length,
      clear,
      visible,
      review,
      minGap: min.gap,
      avgGap,
      weakestSlot: `${min.slotId} ${min.player} (${min.verdict})`,
      verdict,
      className,
    };
  
}

export function runTestHarnessToFormationLineSmokeRow(ctx: any, lineup: any, line: any, matchCount: any): any {
    const candidates = ctx.pickPositionPixelLineCandidates(lineup, line, 6);
    const expectedRows = candidates.length * 4 * matchCount;
    const minExpected = line === 'ATT' ? 1 : 2;
    const warnings: string[] = [];
    const effectiveSlots = ctx.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map<string, any>(effectiveSlots.map((slot: any) => [slot.playerId, slot]));
    const slotRolesByPlayer = new Map<string, any>(candidates.map((candidate: any) => {
      const slot = slotByPlayer.get(candidate.starterId);
      const role = ctx.canonicalFormationPosition(lineup.formation, slot)?.role
        ?? ctx.tacticalRoleFromVisualLine(line);
      return [candidate.starterId, role] as const;
    }));
    if ((lineup.players?.length ?? 0) !== 11) warnings.push(`players ${lineup.players?.length ?? 0}/11`);
    if ((lineup.slots?.length ?? 0) !== 11) warnings.push(`slots ${lineup.slots?.length ?? 0}/11`);
    if (candidates.length < minExpected) warnings.push(`few ${line} candidates`);
    const offRoleCandidates = candidates.filter((candidate: any) =>
      !ctx.naturalFitsTacticalRole(candidate.starterPosition, slotRolesByPlayer.get(candidate.starterId) ?? line)
    );
    const hardOffRoleCount = offRoleCandidates.filter((candidate: any) =>
      ctx.isHardFormationLineOffRole(candidate.starterPosition, slotRolesByPlayer.get(candidate.starterId) ?? line)
    ).length;
    const fallbackOffRoleCount = offRoleCandidates.length - hardOffRoleCount;
    if (hardOffRoleCount > 0) warnings.push(`hard off-role ${hardOffRoleCount}/${candidates.length}`);
    if (fallbackOffRoleCount > 0) warnings.push(`fallback profile ${fallbackOffRoleCount}/${candidates.length}`);
    const verdict = warnings.some((warning) =>
      warning.startsWith('players ')
      || warning.startsWith('slots ')
      || warning.startsWith('few ')
      || warning.startsWith('hard off-role ')
    )
      ? 'Review'
      : warnings.length > 0 ? 'Fallback' : 'OK';
    return {
      formation: lineup.formation ?? ctx.selectedFormationModel ?? '?',
      line,
      candidates: candidates.length,
      expectedRows,
      players: candidates.map((candidate: any) => `${candidate.starterName} (${candidate.starterPosition})`).join(' · '),
      slotRoles: candidates.map((candidate: any) => slotRolesByPlayer.get(candidate.starterId) ?? '?').join(' · '),
      verdict,
      warnings: warnings.join(' · '),
    };
  
}

export function runTestHarnessToPositionPixelMatchSmokeSummary(ctx: any, matchLabel: any, rows: any): any {
    const readCounts: Record<PositionPixelReadLevel, number> = {
      stable: 0,
      visible: 0,
      strong: 0,
      check: 0,
    };
    let microReview = 0;
    let visibleRisk = 0;
    let visibleAttackLoss = 0;
    let bigBadTradeoff = 0;
    let fivePxRiskRows = 0;
    let fivePxCostRows = 0;
    let bigMoveRows = 0;
    let bigMoveStrongRows = 0;
    let signalSum = 0;
    let worst: PositionPixelMatrixSummary | null = null;
    let worstFivePxRiskSignal = 0;
    let fivePxRiskSignalSum = 0;
    for (const row of rows) {
      readCounts[ctx.positionPixelReadLevel(row) as PositionPixelReadLevel] += 1;
      const tacticalRead = ctx.positionPixelTacticalRead(row);
      const moveLabel = ctx.positionPixelMoveLabel(row);
      const isBigMove = ctx.positionPixelIsBigMove(row);
      if (tacticalRead === 'Micro review') microReview += 1;
      if (tacticalRead === 'Visible risk') visibleRisk += 1;
      if (tacticalRead === 'Visible attack loss') visibleAttackLoss += 1;
      if (tacticalRead === 'Bad tradeoff') bigBadTradeoff += 1;
      if (!isBigMove && tacticalRead === 'Visible risk') {
        fivePxRiskRows += 1;
        worstFivePxRiskSignal = Math.max(worstFivePxRiskSignal, row.signalScore);
        fivePxRiskSignalSum += row.signalScore;
      }
      if (!isBigMove && tacticalRead === 'Visible attack loss') fivePxCostRows += 1;
      if (isBigMove) {
        bigMoveRows += 1;
        if (ctx.positionPixelReadLevel(row) === 'strong' || tacticalRead === 'Bad tradeoff' || tacticalRead === 'Risk') {
          bigMoveStrongRows += 1;
        }
      }
      signalSum += row.signalScore;
      if (!worst || row.signalScore > worst.signalScore) {
        worst = row;
      }
    }
    const avgSignal = rows.length > 0 ? signalSum / rows.length : 0;
    const avgFivePxRiskSignal = fivePxRiskRows > 0 ? fivePxRiskSignalSum / fivePxRiskRows : 0;
    const worstSignal = worst?.signalScore ?? 0;
    const verdict = ctx.positionPixelMatchSmokeVerdict(
      readCounts,
      microReview,
      visibleRisk,
      visibleAttackLoss,
      bigBadTradeoff,
      fivePxRiskRows,
      fivePxCostRows,
      bigMoveRows,
      bigMoveStrongRows,
      avgSignal,
      worstSignal,
      worstFivePxRiskSignal,
      avgFivePxRiskSignal
    );
    const worstMove = worst ? ctx.positionPixelMoveLabel(worst) : 'No rows';
    return {
      matchLabel,
      rows: rows.length,
      stable: readCounts.stable,
      visible: readCounts.visible,
      strong: readCounts.strong,
      check: readCounts.check,
      microReview,
      visibleRisk,
      visibleAttackLoss,
      bigBadTradeoff,
      fivePxRiskRows,
      fivePxCostRows,
      bigMoveRows,
      bigMoveStrongRows,
      avgSignal,
      worstSignal,
      worstMove,
      worstTacticalRead: worst ? `${worst.playerName} - ${worstMove} - ${ctx.positionPixelTacticalRead(worst)}` : 'No rows',
      dominantCause: ctx.positionPixelDominantCause(rows),
      verdict,
      verdictClass: ctx.positionPixelMatchSmokeVerdictClass(verdict),
    };
  
}
