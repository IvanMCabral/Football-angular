import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessAllFormationsLineAuditToast(ctx: any, totalRows: any, reviewCount: any, fallbackCount: any): any {
    if (reviewCount > 0) {
      return `Auditoría todas las formaciones: ${reviewCount} line checks need review.`;
    }
    if (fallbackCount > 0) {
      return `Auditoría todas las formaciones OK with ${fallbackCount} penalized fallback line checks (${totalRows} total).`;
    }
    return `Auditoría todas las formaciones OK (${totalRows} line checks).`;
  
}

export function runTestHarnessAllFormationsRoleSlotSmokeExportPayload(ctx: any): any {
    const rows = ctx.allFormationRoleSlotSmokeRows();
    const match = ctx.selectedMatch();
    const matchLabel = match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Unknown match';
    return {
      match: matchLabel,
      seedStart: ctx.summarySeedStart(),
      seedCount: 5,
      generatedAt: new Date().toISOString(),
      summary: countAllFormationsRoleSlotSmokeVerdicts(rows),
      rows,
    };
  
}

export function runTestHarnessAllFormationsRoleSlotSmokeMarkdownReport(ctx: any): any {
    return buildAllFormationsRoleSlotSmokeMarkdownReport(
      ctx.allFormationsRoleSlotSmokeExportPayload(),
      (value) => ctx.fmtPct(value)
    );
  
}

export function runTestHarnessApplyAllFormationsLineAuditRows(ctx: any, rows: any, last: any): any {
    ctx.formationLineSmokeRows.set(rows);
    if (last) {
      ctx.lineupDebugSnapshot.set(ctx.buildLineupDebugSnapshot(
        last,
        'Auditoría todas las formaciones (last formation)',
        null,
        (['DEF', 'MID', 'ATT'] as const).flatMap((line) => ctx.pickPositionPixelLineCandidates(last, line, 6))
      ));
    }
  
}

export function runTestHarnessAutoPositionPixelCandidates(ctx: any): any {
    return [
      { starterId: '__AUTO_DEF', starterName: 'Auto DEF', starterPosition: 'DEF', slotId: '' },
      { starterId: '__AUTO_MID', starterName: 'Auto MID', starterPosition: 'MID', slotId: '' },
      { starterId: '__AUTO_ATT', starterName: 'Auto ATT', starterPosition: 'ATT', slotId: '' },
    ];
  
}

export function runTestHarnessBackFiveWingbackVariantSlots(ctx: any, lineup: any, wingbackY: any, formation: any): any {
    const playerById = new Map<string, any>((lineup.players ?? []).map((player: any) => [player.playerId, player]));
    return ctx.buildLineupSlots(lineup).map((slot: any) => {
      const player = playerById.get(slot.playerId);
      const position = String(player?.position ?? '').toUpperCase();
      const x = ctx.matchContextXPercent(slot) ?? ctx.canonicalXPercent(formation, slot) ?? 50;
      const y = ctx.matchContextYPercent(slot) ?? ctx.canonicalYPercent(formation, slot) ?? 50;
      const isWideWingback = (position === 'DEF' || position === 'MID') && (x <= 24 || x >= 76);
      return {
        ...slot,
        customXPercent: x,
        customYPercent: isWideWingback ? wingbackY : y,
      };
    });
  
}

export function runTestHarnessBaselineSlotsForLastModalMove(ctx: any, originalSlots: any, modalMove: any): any {
    let found = false;
    const slots = originalSlots.map((slot: any) => {
      if (slot.playerId !== modalMove.playerId) { return { ...slot }; }
      found = true;
      return {
        ...slot,
        subdivisionId: modalMove.slotId ?? slot.subdivisionId,
        customXPercent: modalMove.fromXPercent,
        customYPercent: modalMove.fromYPercent,
      };
    });
    return found ? slots : null;
  
}

export function runTestHarnessBuildAllFormationsLineAuditRows$(ctx: any, matchCount: any): any {
    const formations = [...ctx.formationCodes];
    return ctx.harness.getCurrentLineup().pipe(
      take(1),
      switchMap((originalLineup) => {
        const originalSlots = ctx.buildLineupSlots(originalLineup);
        const originalPlayerIds = ctx.lineupPlayerIdsFromSlots(originalSlots);
        return from(formations).pipe(
          concatMap((formation) =>
            ctx.harness.autoSelectLineup(formation).pipe(
              map((lineup) => ({ formation, lineup }))
            )
          ),
          toArray(),
          switchMap((items) =>
            ctx.harness.manualSelectLineup((originalLineup as any).formation, originalPlayerIds, originalSlots).pipe(
              map(() => {
                const typedItems = items as Array<{ formation: any; lineup: any }>;
                const rows = typedItems.flatMap(({ formation, lineup }) =>
                  (['DEF', 'MID', 'ATT'] as const).map((line) =>
                    ctx.toFormationLineSmokeRow(
                      { ...lineup, formation: lineup.formation ?? formation },
                      line,
                      matchCount
                    )
                  )
                );
                return {
                  rows,
                  last: typedItems[typedItems.length - 1]?.lineup ?? null,
                };
              })
            )
          )
        );
      })
    );
  
}

export function runTestHarnessBuildCanonicalSlotsForFormation(ctx: any, formation: any, playerIds: any): any {
    const positions = [...(ctx.formationPositionsByName()[formation] ?? [])]
      .filter((position) => !!position?.subdivisionId && position.subdivisionId !== 'GK-1')
      .sort((a, b) => a.index - b.index);
    const fallbackSubdivisionIds = ctx.fallbackCanonicalSubdivisionIds(formation);
    const subdivisionIds = positions.length >= 10
      ? positions.slice(0, 10).map((position) => position.subdivisionId)
      : fallbackSubdivisionIds;
    if (playerIds.length !== 11 || subdivisionIds.length < 10) {
      return [];
    }
    return [
      { playerId: playerIds[0], subdivisionId: 'GK-1' },
      ...playerIds.slice(1, 11).map((playerId: any, index: any) => ({
        playerId,
        subdivisionId: subdivisionIds[index] ?? `S${String(index + 1).padStart(2, '0')}-1`,
      })),
    ];
  
}

export function runTestHarnessBuildLineupSlots(ctx: any, lineup: any): any {
    return buildLineupSlotsFromLineup(lineup);
  
}

export function runTestHarnessCanonicalFormationPosition(ctx: any, formation: any, slot: any): any {
    const formationName = String(formation ?? '').trim();
    const slotId = slot?.subdivisionId;
    if (!formationName || !slotId) return null;
    const positions = ctx.formationPositionsByName()[formationName] ?? [];
    return positions.find((p: any) => p.subdivisionId === slotId) ?? null;
  
}

export function runTestHarnessCanonicalizeLineupSlots(ctx: any, lineup: any): any {
    return ctx.buildLineupSlots(lineup).map((slot: any) => ({
      playerId: slot.playerId,
      subdivisionId: slot.subdivisionId,
    }));
  
}

export function runTestHarnessCanonicalXPercent(ctx: any, formation: any, slot: any): any {
    return getCanonicalXPercent(slot, ctx.canonicalFormationPosition(formation, slot));
  
}

export function runTestHarnessCanonicalYPercent(ctx: any, formation: any, slot: any): any {
    return getCanonicalYPercent(slot, ctx.canonicalFormationPosition(formation, slot));
  
}

export function runTestHarnessClearFormationLineAuditResults(ctx: any): any {
    ctx.formationLineSmokeRows.set([]);
  
}

export function runTestHarnessClearPositionPixelAnalysisResults(ctx: any): any {
    ctx.positionPixelMatrixSummary.set(null);
    ctx.positionPixelMatrixRows.set([]);
    ctx.positionPixelEvidenceNote.set(null);
  
}

export function runTestHarnessCopyAllFormationsRoleSlotSmokeJson(ctx: any): any {
    const payload = JSON.stringify(ctx.allFormationsRoleSlotSmokeExportPayload(), null, 2);
    ctx.copyTextPayload(payload, 'All formations role-slot JSON copied.');
  
}

export function runTestHarnessCopyAllFormationsRoleSlotSmokeReport(ctx: any): any {
    const payload = ctx.allFormationsRoleSlotSmokeMarkdownReport();
    ctx.copyTextPayload(payload, 'All formations role-slot report copied.');
  
}

export function runTestHarnessCopyPositionPixelMatrixJson(ctx: any): any {
    const payload = JSON.stringify(ctx.positionPixelExportPayload(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Filtered position movement JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyRoleSlotImpactSmokeJson(ctx: any): any {
    const payload = JSON.stringify(ctx.roleSlotImpactSmokeExportPayload(), null, 2);
    ctx.copyTextPayload(payload, 'Role slot smoke JSON copied.');
  
}

export function runTestHarnessCopyRoleSlotImpactSmokeReport(ctx: any): any {
    const payload = ctx.roleSlotImpactSmokeMarkdownReport();
    ctx.copyTextPayload(payload, 'Role slot smoke report copied.');
  
}

export function runTestHarnessCountCustomMovableSlots(ctx: any, lineup: any): any {
    return countCustomMovableLineupSlots(lineup);
  
}

export function runTestHarnessDownloadPositionPixelMatrixCsv(ctx: any): any {
    const rows = ctx.displayedPositionPixelMatrixRows().map((row: any) => ctx.positionPixelExportRow(row));
    const header = [
      'read', 'label', 'playerName', 'playerPosition', 'slotId',
      'fromXPercent', 'fromYPercent', 'targetXPercent', 'targetYPercent',
      'movementDistance', 'impactScore', 'shapeMove', 'shapeMoveDetail', 'tacticalRead', 'tacticalReadReason',
      'attackGainScore', 'attackLossScore', 'defensiveRiskScore', 'defensiveGainScore',
      'seedStart', 'seedEnd',
      'deltaXgFor', 'deltaXgAgainst', 'deltaXgDiff', 'deltaShotsFor', 'deltaShotsAgainst', 'deltaPossessionFor',
      'deltaCentralShotsFor', 'deltaWideShotsFor', 'deltaLongShotsFor',
      'deltaCentralShotsAgainst', 'deltaWideShotsAgainst', 'deltaLongShotsAgainst',
      'deltaCentralXgAgainst', 'deltaWideXgAgainst', 'deltaLongXgAgainst',
      'baselineXgFor', 'baselineXgAgainst', 'movedXgFor', 'movedXgAgainst', 'timestamp',
    ];
    const lines = ctx.csvLines(header, rows);
    ctx.downloadCsv(lines, `position-movement-${ctx.positionPixelReadFilter()}-${ctx.positionPixelSortMode()}-${ctx.seedInputModel ?? 'auto'}.csv`);
    ctx.snackBar.open(`Position movement CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  
}

export function runTestHarnessEffectivePositionPixelSlots(ctx: any, lineup: any): any {
    const existingSlots = ctx.buildLineupSlots(lineup);
    const playerIds = (lineup.players ?? [])
      .map((player: any) => player.playerId)
      .filter(Boolean);
    const expectedSlotCount = Math.min(playerIds.length, 11);
    const canonicalSlots = existingSlots.length >= expectedSlotCount
      ? []
      : ctx.buildCanonicalSlotsForFormation(lineup.formation ?? ctx.selectedFormationModel ?? '4-4-2', playerIds);
    const existingByPlayer = new Map<string, any>(existingSlots.map((slot: any) => [slot.playerId, slot]));
    return existingSlots.length >= expectedSlotCount
      ? existingSlots
      : canonicalSlots.map((slot: any) => existingByPlayer.get(slot.playerId) ?? slot);
  
}

export function runTestHarnessEmptyAllFormationRoleSlotSmokeRow(ctx: any, formation: any, verdict: any): any {
    return {
      formation,
      slots: 0,
      clear: 0,
      visible: 0,
      review: 1,
      minGap: 0,
      avgGap: 0,
      weakestSlot: '-',
      verdict,
      className: 'delta-negative',
    };
  
}

export function runTestHarnessEnsureProfessionalQaPixelEvidenceStatuses(ctx: any): any {
    for (const check of ['Pixel movement signal', 'Pixel no-cliff rule']) {
      ctx.ensureProfessionalQaEvidenceStatus(check);
    }
  
}

export function runTestHarnessFallbackCanonicalSubdivisionIds(ctx: any, formation: any): any {
    const fallback: Record<string, string[]> = {
      '4-4-2': ['S22-2', 'S23-1', 'S23-3', 'S24-2', 'S16-2', 'S17-1', 'S17-3', 'S18-2', 'S05-1', 'S05-3'],
      '4-3-3': ['S22-2', 'S23-1', 'S23-3', 'S24-2', 'S17-1', 'S17-2', 'S17-3', 'S04-1', 'S05-2', 'S06-3'],
      '3-5-2': ['S22-2', 'S23-2', 'S24-2', 'S15-1', 'S17-1', 'S17-2', 'S17-3', 'S18-3', 'S05-1', 'S05-3'],
      };
      return fallback[formation] ?? [];
    
}

export function runTestHarnessIsAcceptableFormationLineFallback(ctx: any, naturalPosition: any, tacticalRole: any): any {
    if (['CDM', 'CM', 'CAM'].includes(tacticalRole)
      && ['WINGER', 'LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'].includes(naturalPosition)) {
      return true;
    }
    return ['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'].includes(tacticalRole)
      && ['MID', 'CM', 'CDM', 'DM', 'CAM', 'AM'].includes(naturalPosition);
  
}

export function runTestHarnessIsDefensiveFallbackTargetSlot(ctx: any, subdivisionId: any, formation: any): any {
    const role = ctx.canonicalFormationPosition(
      formation,
      subdivisionId ? { playerId: '__lab__', subdivisionId } : null
    )?.role?.toUpperCase() ?? '';
    return ['CB', 'LB', 'RB'].includes(role);
  
}

export function runTestHarnessIsHardFormationLineOffRole(ctx: any, naturalPosition: any, tacticalRole: any): any {
    const natural = String(naturalPosition ?? '').trim().toUpperCase();
    const role = String(tacticalRole ?? '').trim().toUpperCase();
    if (!natural || !role) return false;
    if (ctx.isAcceptableFormationLineFallback(natural, role)) return false;
    const naturalLine = ctx.strictPositionPixelLine(natural);
    const roleLine = ctx.strictPositionPixelLine(role);
    if (!naturalLine || !roleLine) return false;
    return naturalLine !== roleLine;
  
}

export function runTestHarnessJumpToPositionPixelRow(ctx: any, row: any, filter: any): any {
    if (!row) return;
    const key = ctx.positionPixelRowKey(row);
    ctx.positionPixelReadFilter.set(filter);
    ctx.selectedPositionPixelRowKey.set(key);
    const scrollToTarget = (attempt = 0) => {
      const target = document.querySelector(`[data-position-row-key="${key}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }
      if (attempt < 5) {
        setTimeout(() => scrollToTarget(attempt + 1), 50);
      }
    };
    setTimeout(() => scrollToTarget(), 0);
  
}

export function runTestHarnessLineupDebugPlayerCountLabel(ctx: any, debug: any): any {
    if (debug.playerCount === 0 && debug.candidatesCount > 0) {
      return `presets (${debug.candidatesCount})`;
    }
    return `${debug.playerCount}/11`;
  
}

export function runTestHarnessLineupDebugScopeLabel(ctx: any, debug: any): any {
    if (debug.visualLineFilter === 'LAST_MODAL_MOVE') {
      return 'foco: último jugador movido';
    }
    if (debug.visualLineFilter === 'any') {
      return 'foco: formación auditada';
    }
    if (debug.visualLineFilter && debug.visualLineFilter !== 'ALL') {
      return `foco: línea ${debug.visualLineFilter}`;
    }
    return 'foco: XI completo';
  
}

export function runTestHarnessLineupPlayerIdsFromSlots(ctx: any, slots: any): any {
    return getLineupPlayerIdsFromSlots(slots);
  
}

export function runTestHarnessLowBlockVariantSlots(ctx: any, lineup: any, secondLineY: any): any {
    const playerById = new Map<string, any>((lineup.players ?? []).map((player: any) => [player.playerId, player]));
    return ctx.buildLineupSlots(lineup).map((slot: any) => {
      const player = playerById.get(slot.playerId);
      const position = String(player?.position ?? '').toUpperCase();
      const x = ctx.matchContextXPercent(slot) ?? ctx.canonicalXPercent('5-4-1', slot) ?? 50;
      const y = ctx.matchContextYPercent(slot) ?? ctx.canonicalYPercent('5-4-1', slot) ?? 50;
      return {
        ...slot,
        customXPercent: x,
        customYPercent: position === 'MID' ? secondLineY : y,
      };
    });
  
}

export function runTestHarnessManualExtremeMovementPresets(ctx: any, fromX: any, fromY: any, candidate: any): any {
    const line = ctx.strictPositionPixelLine(candidate.starterPosition) ?? ctx.positionPixelVisualLine(fromY);
    return buildManualExtremeMovementPresets(fromX, fromY, candidate, line);
  
}

export function runTestHarnessOnRunAllFormationsLineAudit(ctx: any): any {
    if (!ctx.canRunUserLineupAudit()) {
      const reason = ctx.userLineupAuditDisabledReason();
      ctx.analysisReadyMessage.set(reason);
      ctx.snackBar.open(reason, 'OK', { duration: 5000 });
      return;
    }
    const matches = ctx.userTeamMatches()
      .filter((match: any) => match.status === 'COMPLETED')
      .slice(0, 3);
    if (matches.length === 0) {
      ctx.snackBar.open(`No completed ${ctx.userTeamName() || 'user team'} matches available for all-formations line audit.`, 'OK', { duration: 4000 });
      return;
    }
    const formations = [...ctx.formationCodes];
    ctx.clearFormationLineAuditResults();
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Auditoría todas las formaciones corriendo: ${formations.length} formaciones...`);
    ctx.buildAllFormationsLineAuditRows$(matches.length).subscribe({
      next: ({ rows, last }: any) => {
        ctx.applyAllFormationsLineAuditRows(rows, last);
        const reviewCount = rows.filter((row: any) => row.verdict === 'Review').length;
        const fallbackCount = rows.filter((row: any) => row.verdict === 'Fallback').length;
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.allFormationsLineAuditToast(rows.length, reviewCount, fallbackCount),
          'OK',
          { duration: 5000 }
        );
        ctx.markReplayAnalysisReady(
          reviewCount === 0
            ? `Auditoría todas las formaciones listo: ${rows.length} line checks · ${fallbackCount} fallback penalizado.`
            : `Auditoría todas las formaciones listo: ${rows.length} line checks · ${reviewCount} revisar · ${fallbackCount} fallback.`
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Auditoría todas las formaciones falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run all formations line audit'), 'OK', { duration: 5000 });
      },
    });
  
}
