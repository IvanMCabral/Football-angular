import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, V24MatchDetailPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessOnRunAllFormationsRoleSlotSmoke(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = 5;
    const formations = [...FORMATION_CODES];
    let restore: { formation: string; playerIds: string[]; slots: LineupSlotDTO[] } | null = null;
    ctx.allFormationRoleSlotSmokeRows.set([]);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Smoke roles-slot por formacion corriendo: ${formations.length} formaciones x 10 slots...`);
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
        return from(formations).pipe(
          concatMap((formation) =>
            ctx.harness.autoSelectLineup(formation).pipe(
              switchMap((lineup) => {
                ctx.selectedFormationModel = formation;
                const slots = ctx.roleSlotOptionsFromLineup(lineup)
                  .filter((option: any) => option.slotId && option.slotId !== 'GK-1')
                  .slice(0, 10);
                if (slots.length === 0) {
                  return of(ctx.emptyAllFormationRoleSlotSmokeRow(formation, 'Sin slots reales'));
                }
                return from(slots).pipe(
                  concatMap((slot) =>
                    ctx.harness.runRoleSlotImpactSummary(matchId, {
                      slotId: (slot as any).slotId,
                      naturalPositions: ctx.roleSlotImpactNaturalPositionsForSlot((slot as any).slotId),
                      seedStart,
                      seedCount,
                      controlledTeamSide: 'USER',
                    }).pipe(
                      map((rows) => ctx.toRoleSlotImpactSmokeRow(slot, rows ?? [])),
                      catchError((err) => of({
                        slotId: (slot as any).slotId,
                        player: (slot as any).label,
                        bestRole: '?',
                        bestEff: 0,
                        worstRole: '?',
                        worstEff: 0,
                        gap: 0,
                        verdict: ctx.fmtError(err, 'Review'),
                        className: 'delta-negative',
                      } satisfies RoleSlotImpactSmokeRow))
                    )
                  ),
                  toArray(),
                  map((rows) => ctx.toAllFormationRoleSlotSmokeRow(formation, rows))
                );
              })
            )
          ),
          toArray()
        );
      }),
      finalize(() => {
        if (restore) {
          ctx.harness.manualSelectLineup(restore.formation, restore.playerIds, restore.slots).pipe(take(1)).subscribe({
            next: () => {
              ctx.selectedFormationModel = restore?.formation as FormationCode;
            },
            error: (err: any) => {
              ctx.snackBar.open(ctx.fmtError(err, 'No pude restaurar la alineacion original'), 'OK', { duration: 5000 });
            },
          });
        }
      })
    ).subscribe({
      next: (rows: any) => {
        ctx.allFormationRoleSlotSmokeRows.set(rows);
        ctx.mutationInFlight.set(false);
        const reviews = rows.filter((row: any) => row.review > 0 || row.verdict.includes('Revisar')).length;
        ctx.markReplayAnalysisReady(
          reviews === 0
            ? `Smoke roles-slot por formacion OK (${rows.length} formaciones).`
            : `Smoke roles-slot por formacion: ${reviews} formaciones con slots a revisar.`
        );
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Smoke roles-slot por formacion falló'));
      },
    });
  
}

export function runTestHarnessOnRunAllRoleSlotsSmoke(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const slots = ctx.roleSlotImpactAvailableSlotOptions()
      .filter((option: any) => option.slotId && option.slotId !== 'GK-1')
      .slice(0, 10);
    if (slots.length === 0) {
      ctx.snackBar.open('No hay slots reales cargados. Seleccioná partido o refrescá lineup.', 'OK', { duration: 4000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = 10;
    ctx.roleSlotImpactSmokeRows.set([]);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Smoke todos los roles-slot corriendo: ${slots.length} slots x ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    from(slots).pipe(
      concatMap((slot) =>
        ctx.harness.runRoleSlotImpactSummary(matchId, {
          slotId: (slot as any).slotId,
          naturalPositions: ctx.roleSlotImpactNaturalPositionsForSlot((slot as any).slotId),
          seedStart,
          seedCount,
          controlledTeamSide: 'USER',
        }).pipe(
          map((rows) => ctx.toRoleSlotImpactSmokeRow(slot, rows ?? [])),
          catchError((err) => of({
            slotId: (slot as any).slotId,
            player: (slot as any).label,
            bestRole: '?',
            bestEff: 0,
            worstRole: '?',
            worstEff: 0,
            gap: 0,
            verdict: ctx.fmtError(err, 'Review'),
            className: 'delta-negative',
          } satisfies RoleSlotImpactSmokeRow))
        )
      ),
      toArray()
    ).subscribe({
      next: (rows) => {
        ctx.roleSlotImpactSmokeRows.set(rows);
        ctx.mutationInFlight.set(false);
        ctx.markReplayAnalysisReady(`Smoke todos los roles-slot completo (${rows.length} slots).`);
      },
      error: (err) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Smoke todos los roles-slot falló'));
      },
    });
  
}

export function runTestHarnessOnRunCurrentFormationLineAudit(ctx: any): any {
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
      ctx.snackBar.open(`No completed ${ctx.userTeamName() || 'user team'} matches available for formation line audit.`, 'OK', { duration: 4000 });
      return;
    }
    const formation = ctx.selectedFormationModel ?? '4-4-2';
    ctx.clearFormationLineAuditResults();
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Auditoría líneas formación corriendo para ${formation}...`);
    ctx.currentOrAutoSelectedLineup(formation).subscribe({
      next: (lineup: any) => {
        const rows = (['DEF', 'MID', 'ATT'] as const).map((line) =>
          ctx.toFormationLineSmokeRow(lineup, line, matches.length)
        );
        ctx.formationLineSmokeRows.set(rows);
        const allOk = rows.every((row) => row.candidates > 0);
        ctx.lineupDebugSnapshot.set(ctx.buildLineupDebugSnapshot(
          lineup,
          'Auditoría líneas formación',
          null,
          rows.flatMap((row) => ctx.pickPositionPixelLineCandidates(lineup, row.line, 6))
        ));
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          allOk ? `Auditoría líneas formación OK (${formation}).` : `Auditoría líneas formación con avisos (${formation}).`,
          'OK',
          { duration: 4000 }
        );
        ctx.markReplayAnalysisReady(`Auditoría líneas formación listo para ${formation}.`);
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Auditoría líneas formación falló'));
        ctx.snackBar.open(ctx.fmtError(err, 'Failed to run formation line audit'), 'OK', { duration: 5000 });
      },
    });
  
}

export function runTestHarnessOnRunPositionPixelMatrix(ctx: any): any {
    // Position movement is more sensitive than a simple smoke replay. Keep this
    // at medium confidence by default so a 5px move is not over-read from only
    // three seeds inherited from the swap-battery quick mode.
    const seedCount = Math.max(10, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 10)));
    ctx.clearReplayAnalysisResultsForLatestRun();
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any) => ctx.positionMovementPresets(fromX, fromY),
      'Matriz presets posición'
    );
  
}

export function runTestHarnessOnRunRoleSlotImpactSummary(ctx: any): any {
    const matchId = ctx.selectedMatchId();
    if (!matchId) {
      ctx.snackBar.open('Select a match in Panel C first.', 'OK', { duration: 3000 });
      return;
    }
    const seedStart = ctx.summarySeedStart();
    const seedCount = Math.max(20, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 20)));
    const availableSlots = ctx.roleSlotImpactAvailableSlotOptions();
    const selectedSlotExists = availableSlots.some((option: any) => option.slotId === ctx.roleSlotImpactSlotIdModel);
    const slotId = selectedSlotExists
      ? ctx.roleSlotImpactSlotIdModel
      : (availableSlots[0]?.slotId ?? 'S06-3');
    ctx.roleSlotImpactSlotIdModel = slotId;
    const naturalPositions = ctx.roleSlotImpactNaturalPositionsForSlot(slotId);
    ctx.roleSlotImpactRows.set([]);
    ctx.mutationInFlight.set(true);
    ctx.analysisReadyMessage.set(`Impacto rol-slot corriendo: slot ${slotId}, ${seedCount} seeds...`);
    window.setTimeout(() => ctx.scrollToReplayAnalysis(), 0);
    ctx.harness.runRoleSlotImpactSummary(matchId, {
      slotId,
      naturalPositions,
      seedStart,
      seedCount,
      controlledTeamSide: 'USER',
    }).subscribe({
      next: (rows: any) => {
        const safeRows = [...(rows ?? [])].sort((a, b) => b.playerEffectiveness - a.playerEffectiveness);
        ctx.roleSlotImpactRows.set(safeRows);
        ctx.mutationInFlight.set(false);
        ctx.markReplayAnalysisReady(`Impacto rol-slot completo (${safeRows.length} roles, ${seedCount} seeds).`);
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.analysisReadyMessage.set(ctx.fmtError(err, 'Impacto rol-slot falló'));
      },
    });
  
}

export function runTestHarnessOnRunWingbackPixelLab(ctx: any): any {
    const seedCount = Math.max(20, Math.min(50, Math.round(ctx.playerSwapSeedCountModel || 20)));
    ctx.runPositionPixelMatrixWithPresets(
      seedCount,
      (fromX: any, fromY: any, candidate: any) => ctx.wingbackMovementPresets(fromX, fromY, candidate),
      'Lab píxeles carrileros',
      null,
      (lineup: any) => ctx.pickWingbackPixelCandidates(lineup),
      null,
      false
    );
  
}

export function runTestHarnessPickFocusedPixelCandidates(ctx: any, lineup: any): any {
    const slots = ctx.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const slotMetaByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot]));
    const players = (lineup.players ?? []).filter((player: any) => !!player.playerId && player.position !== 'GK');
    const scored = players.map((player: any) => {
      const slot = slotMetaByPlayer.get(player.playerId);
      const x = ctx.matchContextXPercent(slot) ?? ctx.canonicalXPercent(lineup.formation, slot) ?? 50;
      const line = ctx.positionPixelLineFromSlot(lineup.formation, slot)
        ?? ctx.strictPositionPixelLine(player.position)
        ?? ctx.positionPixelLine(player.position);
      const natural = String(player.position ?? '').toUpperCase();
      const wideRole = ['WINGER', 'LW', 'RW', 'LM', 'RM', 'LWB', 'RWB', 'LB', 'RB'].includes(natural);
      const wideSlot = x <= 30 || x >= 70;
      const attackingLine = line === 'ATT' || line === 'MID';
      const score = (wideSlot ? 4 : 0) + (wideRole ? 3 : 0) + (attackingLine ? 2 : 0) - (line === 'DEF' ? 2 : 0);
      return { player, score, x };
    }).sort((a: any, b: any) => b.score - a.score || Math.abs(b.x - 50) - Math.abs(a.x - 50));
    const unique = new Map<string, PositionPixelCandidate>();
    for (const item of scored) {
      if (item.score <= 0 || unique.has(item.player.playerId)) continue;
      unique.set(item.player.playerId, {
        starterId: item.player.playerId,
        starterName: item.player.name,
        starterPosition: item.player.position,
        slotId: slotByPlayer.get(item.player.playerId) ?? '',
      });
      if (unique.size >= 4) break;
    }
    if (unique.size < 2) {
      for (const candidate of (['ATT', 'MID'] as const).flatMap((line) => ctx.pickPositionPixelLineCandidates(lineup, line, 2))) {
        if (!candidate.starterId || unique.has(candidate.starterId)) continue;
        unique.set(candidate.starterId, candidate);
        if (unique.size >= 4) break;
      }
    }
    return Array.from(unique.values());
  
}

export function runTestHarnessPickPositionPixelCandidates(ctx: any, lineup: any): any {
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
    const byLine = new Map<'DEF' | 'MID' | 'ATT', typeof movablePlayers[number]>();
    for (const player of movablePlayers) {
      const line = playerLine(player);
      if (line && !byLine.has(line)) {
        byLine.set(line, player);
      }
    }
    const ordered = [
      selected,
      byLine.get('DEF') ?? null,
      byLine.get('MID') ?? null,
      byLine.get('ATT') ?? null,
    ].filter((player): player is typeof movablePlayers[number] => !!player);
    const unique = new Map<string, typeof movablePlayers[number]>();
    for (const player of ordered) {
      unique.set(player.playerId, player);
    }
    return Array.from(unique.values())
      .map((player) => ({
        starterId: player.playerId,
        starterName: player.name,
        starterPosition: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
      }))
      .filter((candidate) => !!candidate.starterId);
  
}

export function runTestHarnessPickPositionPixelHeadlineRow(ctx: any, rows: any): any {
    if (rows.length === 0) return null;
    return rows
      .map((row: any, index: any) => ({ row, index }))
      .sort((a: any, b: any) =>
        ctx.positionPixelReadSeverity(b.row) - ctx.positionPixelReadSeverity(a.row)
        || ctx.positionPixelImpactScore(b.row) - ctx.positionPixelImpactScore(a.row)
        || ctx.positionPixelDistance(b.row) - ctx.positionPixelDistance(a.row)
        || a.index - b.index
      )[0].row;
  
}

export function runTestHarnessPickPositionPixelLineCandidates(ctx: any, lineup: any, line: any, maxCount: any): any {
    const slots = ctx.effectivePositionPixelSlots(lineup);
    const slotByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot.subdivisionId]));
    const slotMetaByPlayer = new Map<string, any>(slots.map((slot: any) => [slot.playerId, slot]));
    const playerLine = (player: LineupDTO['players'][number]): 'DEF' | 'MID' | 'ATT' | null =>
      ctx.positionPixelLineFromSlot(lineup.formation, slotMetaByPlayer.get(player.playerId))
        ?? ctx.strictPositionPixelLine(player.position);
    const selected = ctx.selectedSwapStarterIdModel
      ? (lineup.players ?? []).find((player: any) => !!player.playerId && player.playerId === ctx.selectedSwapStarterIdModel && player.position !== 'GK')
      : null;
    const players = (lineup.players ?? [])
      .filter((player: any) => !!player.playerId && player.position !== 'GK' && playerLine(player) === line)
      .sort((a: any, b: any) => {
        const aHasSlot = slotByPlayer.has(a.playerId) ? 0 : 1;
        const bHasSlot = slotByPlayer.has(b.playerId) ? 0 : 1;
        return aHasSlot - bHasSlot || a.name.localeCompare(b.name);
      });
    const ordered = selected && playerLine(selected) === line
      ? [selected, ...players.filter((player: any) => player.playerId !== selected.playerId)]
      : players;
    return ordered.slice(0, maxCount)
      .map((player: any) => ({
        starterId: player.playerId,
        starterName: player.name,
        starterPosition: player.position,
        slotId: slotByPlayer.get(player.playerId) ?? '',
      }))
      .filter((candidate: any) => !!candidate.starterId);
  
}

export function runTestHarnessPickWingbackPixelCandidates(ctx: any, lineup: any): any {
    const slots = ctx.effectivePositionPixelSlots(lineup);
    const playersById = new Map<string, any>((lineup.players ?? []).map((player: any) => [player.playerId, player]));
    const wingbackSlots = slots
      .map((slot: any) => ({
        slot,
        role: ctx.canonicalFormationPosition(lineup.formation, slot)?.role?.toUpperCase() ?? '',
        x: ctx.matchContextXPercent(slot) ?? ctx.canonicalXPercent(lineup.formation, slot) ?? 50,
      }))
      .filter((item: any) => ['LWB', 'RWB', 'LM', 'RM'].includes(item.role) || item.x <= 22 || item.x >= 78)
      .sort((a: any, b: any) => a.x - b.x);
    const selected = [
      wingbackSlots[0] ?? null,
      wingbackSlots.length > 1 ? wingbackSlots[wingbackSlots.length - 1] : null,
    ].filter((item): item is typeof wingbackSlots[number] => !!item);
    const unique = new Map<string, typeof wingbackSlots[number]>();
    for (const item of selected) {
      if (item.slot.playerId) {
        unique.set(item.slot.playerId, item);
      }
    }
    return Array.from(unique.values())
      .map((item) => {
        const player = playersById.get(item.slot.playerId);
        return {
          starterId: item.slot.playerId,
          starterName: player?.name ?? item.slot.playerId,
          starterPosition: player?.position ?? (item.role || 'MID'),
          slotId: item.slot.subdivisionId ?? '',
        };
      })
      .filter((candidate) => !!candidate.starterId);
  
}

export function runTestHarnessPickWorstPositionPixelReviewRow(ctx: any, rows: any): any {
    if (rows.length === 0) return null;
    return rows.reduce((candidate: any, row: any) => {
      const rowImpact = ctx.positionPixelImpactScore(row);
      const candidateImpact = ctx.positionPixelImpactScore(candidate);
      if (rowImpact !== candidateImpact) return rowImpact > candidateImpact ? row : candidate;
      return ctx.positionPixelDecisionScore(row) < ctx.positionPixelDecisionScore(candidate) ? row : candidate;
    }, rows[0]);
  
}

export function runTestHarnessPositionMicroMovementPresets(ctx: any, fromX: any, fromY: any): any {
    return buildPositionMicroMovementPresets(fromX, fromY);
  
}

export function runTestHarnessPositionMovementPresets(ctx: any, fromX: any, fromY: any): any {
    return buildPositionMovementPresets(fromX, fromY);
  
}

export function runTestHarnessPositionPixelAttackGainScore(ctx: any, row: any): any {
    return getPositionPixelAttackGainScore(row);
  
}

export function runTestHarnessPositionPixelAttackLossScore(ctx: any, row: any): any {
    return getPositionPixelAttackLossScore(row);
  
}
