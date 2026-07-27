import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessActionLabel(ctx: any, row: any): any {
    if (row.actionType === 'STYLE') {
      return ctx.styleShort(row.changedStyle);
    }
    if (row.actionType === 'FORMATION') {
      return row.actionDetail || 'Formation';
    }
    if (row.actionType === 'POSITION') {
      return row.actionDetail || 'Position';
    }
    if (row.actionType === 'NOOP_REPLAY') {
      return row.actionDetail || 'Replay sin cambio';
    }
    if (row.actionType === 'SUBSTITUTION') {
      return row.actionDetail || 'Substitution';
    }
    return 'Base';
  
}

export function runTestHarnessBackFiveContextClass(ctx: any, best: any, safest: any, offensive: any): any {
    return getBackFiveContextClass(best, safest, offensive);
  
}

export function runTestHarnessBackFiveContextRead(ctx: any, best: any, safest: any, offensive: any): any {
    return getBackFiveContextRead(best, safest, offensive);
  
}

export function runTestHarnessBackFiveFamilyClass(ctx: any, key: any, deltaXgFor: any, deltaXgAgainst: any, deltaWideShotsFor: any, deltaWideShotsAgainst: any): any {
    return getBackFiveFamilyClass(key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
  
}

export function runTestHarnessBackFiveFamilyRead(ctx: any, key: any, deltaXgFor: any, deltaXgAgainst: any, deltaWideShotsFor: any, deltaWideShotsAgainst: any): any {
    return getBackFiveFamilyRead(key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
  
}

export function runTestHarnessBackFiveTransitionClass(ctx: any, variant: any, deltaXgFor: any, deltaXgAgainst: any, deltaWideShotsFor: any): any {
    return getBackFiveTransitionClass(variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor);
  
}

export function runTestHarnessBackFiveTransitionRead(ctx: any, variant: any, deltaXgFor: any, deltaXgAgainst: any, deltaWideShotsFor: any): any {
    return getBackFiveTransitionRead(variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor);
  
}

export function runTestHarnessBuildBackFiveContextSmokeRow(ctx: any, match: any, controlledSide: any, seedStart: any, seedCount: any, rows: any): any {
    const family = ctx.buildBackFiveFamilyRowsFromFormationSummary(rows);
    const byFormation = new Map<string, any>(family.map((row: any) => [row.formation, row]));
    const low = byFormation.get('5-4-1') ?? null;
    const transition = byFormation.get('5-3-2') ?? null;
    const wingbacks = byFormation.get('3-5-2') ?? null;
    const available = family.length > 0 ? family : [];
    const best = ctx.maxBy(available, (row: any) => row.avgXgDiff);
    const safest = ctx.minBy(available, (row: any) => row.avgXgAgainst);
    const offensive = ctx.maxBy(available, (row: any) => row.avgXgFor);
    const read = ctx.backFiveContextRead(best, safest, offensive);
    return {
      matchId: match.matchId,
      matchLabel: `${match.homeTeamName} vs ${match.awayTeamName}`,
      controlledSide,
      controlledTeamName: controlledSide === 'HOME' ? match.homeTeamName : match.awayTeamName,
      seedStart,
      seedCount,
      bestPlan: best?.formation ?? '-',
      safestPlan: safest?.formation ?? '-',
      mostOffensivePlan: offensive?.formation ?? '-',
      bestXgDiff: best?.avgXgDiff ?? 0,
      safestXga: safest?.avgXgAgainst ?? 0,
      mostOffensiveXg: offensive?.avgXgFor ?? 0,
      lowBlockDiff: low?.avgXgDiff ?? null,
      transitionDiff: transition?.avgXgDiff ?? null,
      wingbackDiff: wingbacks?.avgXgDiff ?? null,
      read,
      className: ctx.backFiveContextClass(best, safest, offensive),
    };
  
}

export function runTestHarnessBuildBackFiveFamilyLabRows(ctx: any, items: any): any {
    const base = items.find((item: any) => item.key === 'transition')?.summary ?? items[0]?.summary;
    return items.map((item: any) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaWideShotsFor = summary.avgWideShotsFor - (base?.avgWideShotsFor ?? summary.avgWideShotsFor);
      const deltaWideShotsAgainst = summary.avgWideShotsAgainst - (base?.avgWideShotsAgainst ?? summary.avgWideShotsAgainst);
      const read = ctx.backFiveFamilyRead(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
      return {
        key: item.key,
        label: item.label,
        formation: item.formation,
        visualPlan: item.visualPlan,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsFor: summary.avgCentralShotsFor,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaWideShotsFor,
        deltaWideShotsAgainst,
        read,
        className: ctx.backFiveFamilyClass(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst),
      };
    });
  
}

export function runTestHarnessBuildBackFiveFamilyRowsFromFormationSummary(ctx: any, rows: any): any {
    const wanted = [
      { key: 'low-block' as const, label: 'Bloque bajo', formation: '5-4-1', visualPlan: 'canónico' },
      { key: 'transition' as const, label: 'Transición', formation: '5-3-2', visualPlan: 'canónico' },
      { key: 'wingback-control' as const, label: 'Carrileros altos', formation: '3-5-2', visualPlan: 'canónico' },
    ];
    const byFormation = new Map<string, any>(rows.map((row: any) => [row.formation, row]));
    const items = wanted
      .map((plan) => {
        const summary = byFormation.get(plan.formation);
        return summary ? { ...plan, summary } : null;
      })
      .filter((item): item is {
        key: BackFiveFamilyLabRow['key'];
        label: string;
        formation: string;
        visualPlan: string;
        summary: FormationMatrixSummaryRow;
      } => !!item);
    const base = items.find((item) => item.key === 'transition')?.summary ?? items[0]?.summary;
    return items.map((item) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaWideShotsFor = summary.avgWideShotsFor - (base?.avgWideShotsFor ?? summary.avgWideShotsFor);
      const deltaWideShotsAgainst = summary.avgWideShotsAgainst - (base?.avgWideShotsAgainst ?? summary.avgWideShotsAgainst);
      const read = ctx.backFiveFamilyRead(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst);
      return {
        key: item.key,
        label: item.label,
        formation: item.formation,
        visualPlan: item.visualPlan,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsFor: summary.avgCentralShotsFor,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaWideShotsFor,
        deltaWideShotsAgainst,
        read,
        className: ctx.backFiveFamilyClass(item.key, deltaXgFor, deltaXgAgainst, deltaWideShotsFor, deltaWideShotsAgainst),
      };
    });
  
}

export function runTestHarnessBuildBackFiveTransitionLabRows(ctx: any, items: any): any {
    const base = items.find((item: any) => item.variant.variant === 'base')?.summary ?? items[0]?.summary;
    return items.map((item: any) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaWideShotsFor = summary.avgWideShotsFor - (base?.avgWideShotsFor ?? summary.avgWideShotsFor);
      const deltaWideShotsAgainst = summary.avgWideShotsAgainst - (base?.avgWideShotsAgainst ?? summary.avgWideShotsAgainst);
      const read = ctx.backFiveTransitionRead(item.variant.variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor);
      return {
        variant: item.variant.variant,
        label: item.variant.label,
        wingbackY: item.variant.y,
        formation: summary.formation,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsFor: summary.avgWideShotsFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaWideShotsFor,
        deltaWideShotsAgainst,
        read,
        className: ctx.backFiveTransitionClass(item.variant.variant, deltaXgFor, deltaXgAgainst, deltaWideShotsFor),
      };
    });
  
}

export function runTestHarnessBuildDefensiveFallbackLineupLab(ctx: any, lineup: any): any {
    const formation = lineup.formation ?? ctx.selectedFormationModel ?? '4-4-2';
    const originalSlots = ctx.buildLineupSlots(lineup);
    const originalPlayerIds = ctx.lineupPlayerIdsFromSlots(originalSlots);
    if (originalSlots.length !== 11 || originalPlayerIds.length !== 11) {
      throw new Error(`DEF fallback lab necesita 11 slots actuales, tiene ${originalSlots.length}. Corré auto-select primero.`);
    }
    const players = lineup.players ?? [];
    const playerById = new Map<string, any>(players.map((player: any) => [player.playerId, player]));
    const defensiveSlots = originalSlots
      .map((slot: any) => ({
        slot,
        role: ctx.canonicalFormationPosition(
          formation,
          slot.subdivisionId ? { playerId: slot.playerId, subdivisionId: slot.subdivisionId } : null
        )?.role?.toUpperCase() ?? '',
      }))
      .filter((entry: any) => ['CB', 'LB', 'RB'].includes(entry.role))
      .sort((a: any, b: any) => ctx.defensiveFallbackTargetPriority(a.role, a.slot.subdivisionId) - ctx.defensiveFallbackTargetPriority(b.role, b.slot.subdivisionId));
    const defensiveSlot = defensiveSlots[0]?.slot ?? originalSlots.find((slot: any) => ctx.isDefensiveFallbackTargetSlot(slot.subdivisionId, formation));
    if (!defensiveSlot) {
      throw new Error('DEF fallback lab no encontró slot defensivo CB/LB/RB para forzar.');
    }
    const attackingOrMidSlot = originalSlots
      .map((slot: any) => {
        const player = playerById.get(slot.playerId);
        return { slot, player, priority: ctx.defensiveFallbackSourcePriority(player?.position) };
      })
      .filter((entry: any) => {
        const player = entry.player;
        return !!player
          && player.playerId !== defensiveSlot.playerId
          && String(player.position ?? '').toUpperCase() !== 'GK'
          && !ctx.isDefensiveFallbackCompatiblePosition(player.position);
      })
      .sort((a: any, b: any) => a.priority - b.priority)[0]?.slot;
    if (!attackingOrMidSlot) {
      throw new Error('DEF fallback lab no encontró un titular no-defensivo para mover a defensa.');
    }
    const targetPlayerId = attackingOrMidSlot.playerId;
    const displacedDefenderId = defensiveSlot.playerId;
    const targetPlayer = playerById.get(targetPlayerId);
    const displacedPlayer = playerById.get(displacedDefenderId);
    const defensiveRole = ctx.canonicalFormationPosition(formation, defensiveSlot)?.role?.toUpperCase() ?? 'DEF';
    const nextSlots = originalSlots.map((slot: any) => {
      if (slot.subdivisionId === defensiveSlot.subdivisionId) {
        return { ...slot, playerId: targetPlayerId };
      }
      if (slot.subdivisionId === attackingOrMidSlot.subdivisionId) {
        return { ...slot, playerId: displacedDefenderId };
      }
      return { ...slot };
    });
    return {
      formation,
      playerIds: ctx.lineupPlayerIdsFromSlots(nextSlots),
      slots: nextSlots,
      restore: {
        formation,
        playerIds: originalPlayerIds,
        slots: originalSlots,
      },
      read: `${targetPlayer?.name ?? targetPlayerId} (${targetPlayer?.position ?? '?'}) -> ${defensiveRole} ${defensiveSlot.subdivisionId}; `
        + `${displacedPlayer?.name ?? displacedDefenderId} vuelve a ${attackingOrMidSlot.subdivisionId}. Corré XI efectivo para ver fallback defensivo.`,
    };
  
}

export function runTestHarnessBuildLowBlockLabRows(ctx: any, items: any): any {
    const base = items.find((item: any) => item.variant.variant === 'base')?.summary ?? items[0]?.summary;
    return items.map((item: any) => {
      const summary = item.summary;
      const deltaXgFor = summary.avgXgFor - (base?.avgXgFor ?? summary.avgXgFor);
      const deltaXgAgainst = summary.avgXgAgainst - (base?.avgXgAgainst ?? summary.avgXgAgainst);
      const deltaXgDiff = summary.avgXgDiff - (base?.avgXgDiff ?? summary.avgXgDiff);
      const deltaShotsAgainst = summary.avgShotsAgainst - (base?.avgShotsAgainst ?? summary.avgShotsAgainst);
      const deltaPossessionFor = summary.avgPossessionFor - (base?.avgPossessionFor ?? summary.avgPossessionFor);
      const read = ctx.lowBlockLabRead(
        item.variant.variant,
        deltaXgFor,
        deltaXgAgainst,
        deltaShotsAgainst,
        deltaPossessionFor
      );
      return {
        variant: item.variant.variant,
        label: item.variant.label,
        secondLineY: item.variant.y,
        formation: summary.formation,
        seedStart: summary.seedStart,
        seedCount: summary.seedCount,
        avgXgFor: summary.avgXgFor,
        avgXgAgainst: summary.avgXgAgainst,
        avgXgDiff: summary.avgXgDiff,
        avgShotsFor: summary.avgShotsFor,
        avgShotsAgainst: summary.avgShotsAgainst,
        avgPossessionFor: summary.avgPossessionFor,
        avgWideShotsAgainst: summary.avgWideShotsAgainst,
        avgCentralShotsAgainst: summary.avgCentralShotsAgainst,
        deltaXgFor,
        deltaXgAgainst,
        deltaXgDiff,
        deltaShotsAgainst,
        deltaPossessionFor,
        read,
        className: ctx.lowBlockLabClass(item.variant.variant, deltaXgAgainst, deltaShotsAgainst),
      };
    });
  
}

export function runTestHarnessBuildScenarioDecisionCards(ctx: any, summaryRows: any): any {
    return buildScenarioDecisionCardsFromSummaryUtils(summaryRows, {
      actionKey: (row) => ctx.scenarioActionKey(row),
      attackCandidateIsCoachWorthy: (row) => ctx.scenarioAttackCandidateIsCoachWorthy(row),
      attackPlanScore: (row) => ctx.scenarioAttackPlanScore(row),
      cardFromRow: (title, row, className, detail) => ctx.scenarioDecisionCardFromRow(title, row, className, detail),
      isOpponentRow: (row) => ctx.isOpponentScenarioRow(row),
      opponentMaxChannelXgDelta: (row) => ctx.scenarioOpponentMaxChannelXgDelta(row),
      opponentMinChannelXgDelta: (row) => ctx.scenarioOpponentMinChannelXgDelta(row),
      opponentProtectionRead: (row) => ctx.scenarioOpponentProtectionRead(row),
      opponentRiskRead: (row) => ctx.scenarioOpponentRiskRead(row),
      protectionCandidateIsCoachWorthy: (row) => ctx.scenarioProtectionCandidateIsCoachWorthy(row),
      summaryActionLabel: (row) => ctx.summaryActionLabel(row),
      summaryCoachRead: (row) => ctx.scenarioSummaryCoachRead(row),
      userChannelRead: (row) => ctx.scenarioSummaryUserChannelRead(row),
      twoWayScore: (row) => ctx.scenarioTwoWayScore(row),
      formatDeltaNumber: (value) => ctx.fmtDeltaNumber(value),
    });
  
}

export function runTestHarnessBuildSideMirrorSmokeRows(ctx: any, weakLeftRows: any, weakRightRows: any): any {
    return buildSideMirrorSmokeRowsFromMatrixUtils(
      weakLeftRows,
      weakRightRows,
      ctx.formationPositionsByName()
    );
  
}

export function runTestHarnessCalibrationLabel(ctx: any, match: any, presetLabel: any): any {
    const team = ctx.userTeamName();
    const opponent = team && match.homeTeamName === team ? match.awayTeamName : match.homeTeamName;
    return `R${match.round} vs ${opponent} · ${presetLabel}`;
  
}

export function runTestHarnessCanRunScenarioSummaryForControlledSide(ctx: any): any {
    return ctx.controlledTeamSideModel === 'USER'
      ? ctx.selectedMatchIncludesUserTeam()
      : ctx.selectedMatchId() !== null;
  
}

export function runTestHarnessControlledTeamContextLabel(ctx: any): any {
    const m = ctx.selectedMatch();
    if (!m) {
      return 'Elegí un partido';
    }
    const side = ctx.effectiveControlledSide();
    if (ctx.controlledTeamSideModel === 'USER' && ctx.selectedMatchIncludesUserTeam()) {
      return `Mi equipo: ${ctx.userTeamName() ?? 'usuario'} (${side === 'AWAY' ? 'visitante' : 'local'})`;
    }
    if (side === 'HOME') {
      return `Local: ${m.homeTeamName}`;
    }
    if (side === 'AWAY') {
      return `Visitante: ${m.awayTeamName}`;
    }
    return `Mi equipo: ${ctx.userTeamName() ?? 'sin carrera'}`;
  
}

export function runTestHarnessCopyScenarioMatrixJson(ctx: any): any {
    const payload = JSON.stringify(ctx.scenarioMatrixResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Matriz escenarios JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessCopyScenarioMatrixSummaryJson(ctx: any): any {
    const payload = JSON.stringify(ctx.displayedScenarioMatrixSummaryRows(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => ctx.snackBar.open('Multi-seed scenario summary JSON copied.', 'OK', { duration: 2500 }),
      () => ctx.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  
}

export function runTestHarnessDefensiveFallbackSourcePriority(ctx: any, position: any): any {
    const pos = String(position ?? '').toUpperCase();
    if (['ST', 'CF', 'ATT'].includes(pos)) return 0;
    if (['CAM', 'LW', 'RW', 'WINGER'].includes(pos)) return 1;
    if (['CM', 'MID', 'LM', 'RM'].includes(pos)) return 2;
    return 3;
  
}

export function runTestHarnessDefensiveFallbackTargetPriority(ctx: any, role: any, subdivisionId: any): any {
    if (role === 'CB') return subdivisionId === 'S23-1' ? 0 : 1;
    if (role === 'LB' || role === 'RB') return 2;
    return 9;
  
}

export function runTestHarnessDownloadScenarioMatrixSummaryCsv(ctx: any): any {
    const rows = ctx.displayedScenarioMatrixSummaryRows().map((row: any) => ctx.scenarioSummaryExportRow(row));
    if (rows.length === 0) {
      ctx.snackBar.open('No scenario rows match the current filters.', 'OK', { duration: 2500 });
      return;
    }
    const header = [
      'read', 'impactScore', 'readReason',
      'coachRead', 'coachReadDetail', 'outcome', 'outcomeReason', 'attackGainScore', 'attackLossScore', 'defensiveGainScore', 'defensiveRiskScore',
      'scenario', 'baselineScenario', 'actionType', 'actionDetail',
      'seedStart', 'seedEnd', 'seedCount',
      'avgUserXgDelta', 'minUserXgDelta', 'maxUserXgDelta', 'avgOpponentXgDelta',
      'avgUserShotsDelta', 'avgOpponentShotsDelta', 'avgUserPossessionDelta',
      'avgUserCentralDelta', 'avgUserWideDelta', 'avgOpponentCentralDelta', 'avgOpponentWideDelta',
      'avgUserCentralXgDelta', 'avgUserWideXgDelta', 'avgOpponentCentralXgDelta', 'avgOpponentWideXgDelta',
      'avgUserLeftWideDelta', 'avgUserRightWideDelta', 'avgOpponentLeftWideDelta', 'avgOpponentRightWideDelta',
      'avgUserLeftWideXgDelta', 'avgUserRightWideXgDelta', 'avgOpponentLeftWideXgDelta', 'avgOpponentRightWideXgDelta',
    ];
    const lines = ctx.csvLines(header, rows);
    ctx.downloadCsv(lines, `scenario-summary-${ctx.scenarioSummaryReadFilter()}-${ctx.scenarioSummarySortMode()}-${ctx.summarySeedStart()}-${ctx.summarySeedEnd()}.csv`);
    ctx.snackBar.open(`Scenario summary CSV exported (${rows.length} rows).`, 'OK', { duration: 2500 });
  
}
