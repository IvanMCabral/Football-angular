import { CommonModule, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBar, MatDialog, MatDialogModule, HttpClient, Observable, catchError, concatMap, defaultIfEmpty, finalize, forkJoin, from, map, mergeMap, of, switchMap, take, timeout, toArray, CareerService, AppLoggerService, Fixture, environment, MatchDetailApiService, MatchDetail, MatchEvent, TimelineSnapshot, DetailedMatchPageComponent, SquadEditorModalComponent, SessionPlayer, LineupDTO, LineupSlotDTO, FormationDTO, FORMATION_CODES, AllFormationRoleSlotSmokeRow, BackFiveContextSmokeRow, BackFiveContextSmokeSummary, BackFiveFamilyLabRow, BackFiveTransitionLabRow, ControlledTeamSide, CustomFixture, CurrentLineupReplaySample, CurrentLineupMultiSeedSummary, CurrentLineupReplayResult, FocusedWideBatteryRow, FormationCoachPick, FormationCoachSummary, FormationCode, FormationLineSmokeRow, FormationMatrixRow, FormationMatrixSummaryRow, FormationReplayResult, LabMutationResult, LastModalPositionMoveCase, LineupDebugRow, LineupDebugSnapshot, LineupDiagnostic, LineupDiagnosticPlayer, LineupDiagnosticTeam, LowBlockLabRow, MatchFixture, MatchPreviewSummary, ModalVsCanonicalSummary, ModalRecommendationCandidateAttempt, PlayerSwapBatterySummary, PlayerSwapBenchOption, PlayerSwapCandidate, PlayerSwapMatrixSummaryRow, PlayerSwapMatrixSummary, PlayerSwapPrecisionComparisonRow, PlayerSwapSlotOption, PositionPixelQaLine, PositionPixelQaSummaryRow, PositionPixelCandidate, PositionPixelDiagonalSummary, PositionPixelExportRow, PositionPixelLineBreakSummary, PositionPixelReadFilter, PositionPixelReadLevel, PositionPixelMatrixSummaryRow, PositionPixelMatrixSummary, PositionPixelMatchSmokeSummary, PositionPixelPlayerSmokeSummary, PositionPixelSmokeRunSummary, PositionPixelSmokeScope, PositionPixelSortMode, ProfessionalQaActionStatus, ProfessionalQaChecklistRow, ProfessionalSmokeSummary, RoleSlotImpactSmokeRow, RoleSlotImpactSummaryRow, RoundGroup, ScenarioBatteryCoachObjective, ScenarioBatteryCoachObjectiveModel, ScenarioBatteryCoachAdvice, ScenarioBatteryReviewItem, ScenarioBatteryRow, ScenarioDecisionCard, ScenarioMatrixRow, ScenarioMatrixSummaryRow, ScenarioScoutingNote, ScenarioSummaryReadFilter, ScenarioSummaryReadLevel, ScenarioSummarySortMode, SideMirrorDecisionRow, SideMirrorDecisionSummary, SideMirrorSmokeRow, SideMirrorSmokeSummary, SideMirrorSyntheticLabRow, SubstitutionWhatIfSummaryRow, SubstitutionWhatIfSummary, SubstitutionTimingMatrixRow, TestHarnessMatchRow, TestHarnessSquadHealthSummary, TestHarnessSnapshotFixture, TestHarnessSnapshotResponse, TeamStyle, FormationWidthRead, FormationWingbackRead, WingbackLabRow, TestHarnessService, CURRENT_LINEUP_MULTI_SEED_COUNT, CURRENT_LINEUP_MULTI_SEED_TIMEOUT_MS, DEFAULT_REPLAY_SEED, SINGLE_MATCH_REPLAY_TIMEOUT_MS, TEST_HARNESS_MINUTE_TICKS, TIMELINE_DEBOUNCE_MS, TIMELINE_MAX_MINUTE, TIMELINE_STEP, AUTO_PLAYER_SWAP_BENCH, AUTO_PLAYER_SWAP_STARTER, ROLE_SLOT_IMPACT_SLOT_OPTIONS, SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS, TEAM_STYLE_OPTIONS, formatCsvCell, buildCsvLines, saveTextFile, playerSwapMatrixExportRow, deltaClassName, formatDeltaInt, formatDeltaMicro, formatDeltaNumber, formatPercent, formatXg, getProfessionalQaActionLabel, getProfessionalQaActionStatusClass, getProfessionalQaCheckLabel, getProfessionalQaChecklistTestId, getProfessionalQaTextLabel, getProfessionalQaVerdictClass, getProfessionalQaVerdictLabel, getProfessionalSmokeVerdictClass, buildScenarioBatteryRowUtils, buildScenarioDecisionCardsFromSummaryUtils, inferScenarioBatteryCoachObjectiveUtils, getScenarioActionLabel, getScenarioActionKey, getScenarioAttackCandidateIsCoachWorthy, getScenarioAttackPlanScore, getScenarioBatteryCardDetail, getScenarioBatteryCardSummary, getScenarioBatteryCandidateMatches, getScenarioBatteryAutoObjectiveHint, getScenarioBatteryCoachContext, getScenarioBatteryCoachAdvice, getScenarioBatteryCoachObjectiveHint, getScenarioBatteryDecision, getScenarioBatteryDecisionMinute, getScenarioBatteryDecisionReview, getScenarioBatteryCoachObjectiveLabel, getScenarioBatteryExportRow, getScenarioBatteryCoverageHint, getScenarioBatteryContextPressure, getScenarioBatteryGroupHint, getScenarioBatteryGroupLabel, getScenarioBatteryGoalDiff, getScenarioBatteryMatchStateText, getScenarioBatteryMetricText, getScenarioBatteryReviewCount, getScenarioBatteryReviewHint, getScenarioBatteryReviewItems, getScenarioBatteryRiskCardDetail, getScenarioBatteryRiskCardSummary, getScenarioBatteryProgressText, getScenarioBatteryScenarioCountEstimate, getScenarioBatteryScopeHint, getScenarioBatterySquadText, getScenarioBatteryTeamCondition, getScenarioBatteryTeamRating, getScenarioBatteryTeamReputation, getScenarioDecisionMetrics, getScenarioOpponentProtectionRead, getScenarioOpponentRiskRead, getScenarioProtectionCandidateIsCoachWorthy, getScenarioShapeActionLabel, getScenarioSummaryActionLabel, getScenarioSummaryAttackGainScore, getScenarioSummaryAttackLossScore, getScenarioSummaryCoachRead, getScenarioSummaryCoachReadDetail, getScenarioSummaryCoachReadPrefix, getScenarioSummaryCoherentSubstitutionSignal, getScenarioDecisionConfidenceFromReadLevel, getScenarioSummaryDefensiveGainScore, getScenarioSummaryDefensiveRiskScore, getScenarioSummaryFormationHint, getScenarioSummaryFormationLabel, getScenarioSummaryImpactScore, getScenarioSummaryIsFormationNoop, getScenarioSummaryNeedsReview, getScenarioSummaryIsOpponentRow, getScenarioSummaryIsShapeAction, getScenarioSummaryOpponentChannelRead, getScenarioSummaryOutcome, getScenarioSummaryOutcomeClass, getScenarioSummaryOutcomeReason, getScenarioSummaryOutcomeSummaryFromOutcomes, getScenarioSummaryRecommendationClass, getScenarioSummaryRecommendationDetail, getScenarioSummaryRecommendationFromOutcome, getScenarioSummaryUserChannelRead, getScenarioTwoWayScore, getStyleLabelFromActionDetail, buildSideMirrorSmokeRowsFromMatrixUtils, getFormationWidthReadFromPositions, getFormationWingbackReadFromPositions, mapSyntheticSideMirrorRowsUtils, getSideMirrorRealRead, buildAllFormationsRoleSlotSmokeMarkdownReport, countAllFormationsRoleSlotSmokeVerdicts, buildRoleSlotImpactSmokeMarkdownReport, countRoleSlotImpactSmokeVerdicts, getBackFiveContextClass, getBackFiveContextRead, getBackFiveFamilyClass, getBackFiveFamilyRead, getBackFiveTransitionClass, getBackFiveTransitionRead, getLowBlockLabClass, getLowBlockLabRead, hasLargePlayerSwapQualityDrop, getPlayerSwapBatteryCoachRead, getPlayerSwapBatteryCounterText, getPlayerSwapBatteryBestWorstText, getPlayerSwapObjectiveContrastText, getPlayerSwapObjectiveText, getPlayerSwapOverallDelta, getPlayerSwapOverallDeltaText, getPlayerSwapQualityWarning, getPlayerSwapCoachAttackScore, getPlayerSwapCoachNetScore, getPlayerSwapCoachRead, getPlayerSwapCoachReadClass, getPlayerSwapCoachReadDetail, getPlayerSwapCoachReadLevel, getPlayerSwapCoachRiskScore, getPlayerSwapDecisionScore, getPlayerSwapIsActionableRecommendation, getPlayerSwapProtectSpecialistScore, getPlayerSwapPrecisionStability, getPlayerSwapPrecisionStabilityClass, getPlayerSwapRoleTradeoff, getPlayerSwapSignalClass, getPlayerSwapSignalRead, getPlayerSwapSignalScore, getPlayerSwapTacticalBreakdown, getPlayerSwapTacticalLabel, getPlayerSwapFitClass, getPlayerSwapFitDetail, getPlayerSwapFitLevel, getPlayerSwapFitText, getPlayerSwapProfile, getPlayerSwapRoleRisk, getPositionPixelAttackGainScore, getPositionPixelAttackLossScore, getPositionPixelChannelBreakdown, getPositionPixelChannelBreakdownClass, getPositionPixelChannelBreakdownDetail, getPositionPixelChannelBreakdownRead, PositionPixelChannelBreakdown, getPositionPixelChannelSign, getPositionPixelCoachRead, getPositionPixelContextualCoverageNote, getPositionPixelCoverageChannelLabel, getPositionPixelDecisionScore, getPositionPixelDefensiveGainScore, getPositionPixelDefensiveRiskScore, getPositionPixelDistance, getPositionPixelImpactScore, getPositionPixelMovementConfidence, getPositionPixelMatchSmokeVerdict, getPositionPixelPlayerSmokeSeverity, getPositionPixelPlayerSmokeVerdict, getPositionPixelReadLevel, getPositionPixelReadSeverity, getPositionPixelSignalClass, getPositionPixelSignalDetail, getPositionPixelSignalRead, getPositionPixelSignalScore, getPositionPixelSmokeVerdictClass, getPositionPixelChannelLabel, getPositionPixelShapeDeltaText, getPositionPixelShapeMove, getPositionPixelShapeMoveDetail, getPositionPixelTacticalRead, getPositionPixelTacticalReadClass, getPositionPixelTacticalReadReason, getPositionPixelUsesContextualCoverage, getPositionPixelVisualExpectationClass, getPositionPixelVisualExpectationDetail, getPositionPixelVisualExpectationMismatches, getPositionPixelVisualExpectationRead, getPositionPixelVisualEngineTensionClass, getPositionPixelVisualEngineTensionDetail, getPositionPixelVisualEngineTensionRead, getPositionPixelVisualEngineTensions, PositionPixelVisualEngineTension, getPositionPixelIsMicroVisualMismatch, getPositionPixelVisualChannel, PositionPixelVisualChannel, getPositionPixelVisualLine, PositionPixelVisualLine, getPositionPixelWideChannelReason, clampFieldPercent, parseFieldSubdivision, subdivisionXPercent, subdivisionYPercent, buildManualExtremeMovementPresets, buildManualShapeVsPresetPresets, buildPositionMicroMovementPresets, buildPositionMovementPresets, buildWingbackMovementPresets, getWingbackSlotSide, buildLineupSlotsFromLineup, getCanonicalXPercent, getCanonicalYPercent, countCustomMovableLineupSlots, getFallbackYForPosition, isAttackingPlayerPosition, getLineupPlayerIdsFromSlots, getMatchContextXPercent, getMatchContextYPercent, getPositionPixelLine, getStrictPositionPixelLine, swapLineupSlotPlayer, buildCurrentLineupSampleMetrics, checkShotLikeEvent, summarizeMatchShotZones } from './test-harness-page.flow.shared';

export function runTestHarnessApplyFormation(ctx: any): any {
    const formation = ctx.selectedFormationModel;
    if (!formation) {
      ctx.snackBar.open('Pick a formation first.', 'OK', { duration: 3000 });
      return;
    }
    ctx.mutationInFlight.set(true);
    ctx.harness.setFormation(formation).pipe(
      switchMap((resp) =>
        ctx.harness.autoSelectLineup(formation).pipe(
          map(() => resp)
        )
      )
    ).subscribe({
      next: (resp: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          resp?.message ?? `Formation ${formation} applied with auto-selected tactical slots.`,
          'OK',
          { duration: 3000 }
        );
        ctx.refreshLineupContext();
        ctx.refreshDetailAfterMutation();
      },
      error: (err: any) => {
        ctx.mutationInFlight.set(false);
        ctx.snackBar.open(
          ctx.fmtError(err, 'Failed to set formation'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  
}

export function runTestHarnessAutoBackendEstresSwapCandidate(ctx: any, mode: any, testCase: any): any {
    return {
      starterId: `__AUTO_SWAP_${mode}`,
      starterName: `Auto ${mode}`,
      starterPosition: 'AUTO',
      benchId: ctx.AUTO_PLAYER_SWAP_BENCH,
      benchName: 'Auto bench',
      benchPosition: 'AUTO',
      slotId: '',
      testCase,
    };
  
}

export function runTestHarnessAutoBackendEstresSwapCandidates(ctx: any): any {
    return [
      ctx.autoBackendEstresSwapCandidate('ATT_TO_DEF', 'Estres: atacante por defensor'),
      ctx.autoBackendEstresSwapCandidate('DEF_TO_ATT', 'Estres: defensor por atacante'),
      ctx.autoBackendEstresSwapCandidate('MID_TO_ATT', 'Estres: medio por atacante'),
      ctx.autoBackendEstresSwapCandidate('MID_TO_DEF', 'Estres: medio por defensor'),
      ctx.autoBackendEstresSwapCandidate('OUT_OF_LINE', 'Estres: fuera de línea'),
      ctx.autoBackendEstresSwapCandidate('DOWNGRADE', 'Estres: menor OVR / encaje'),
    ];
  
}

export function runTestHarnessCanRunUserLineupAudit(ctx: any): any {
    return !!ctx.userTeamName() && ctx.controlledTeamSideModel === 'USER';
  
}

export function runTestHarnessClearFormationAverageResults(ctx: any): any {
    ctx.formationMatrixSummaryResults.set([]);
    ctx.lowBlockLabRows.set([]);
    ctx.backFiveTransitionLabRows.set([]);
    ctx.backFiveFamilyLabRows.set([]);
    ctx.backFiveFamilyLabScope.set('');
    ctx.backFiveContextSmokeRows.set([]);
  
}

export function runTestHarnessClearMatchSelectionAfterFixtureMutation(ctx: any): any {
    ctx.selectedMatchId.set(null);
    ctx.selectedMatch.set(null);
    ctx.detailPanelVisible.set(true);
    ctx.timelineSnapshot.set(null);
    ctx.timelineError.set(null);
    ctx.timelineLoading.set(false);
    ctx.clearReplayAnalysisResults();
    ctx.analysisReadyMessage.set('Fixtures reemplazados. Elegí un partido nuevo antes de correr smokes.');
  
}

export function runTestHarnessControlledTeamDisplayName(ctx: any): any {
    const match = ctx.selectedMatch();
    if (!match) {
      return ctx.userTeamName() || 'Sin partido';
    }
    if (ctx.controlledTeamSideModel === 'HOME') {
      return `${match.homeTeamName} (local)`;
    }
    if (ctx.controlledTeamSideModel === 'AWAY') {
      return `${match.awayTeamName} (visitante)`;
    }
    return `${ctx.userTeamName() || 'Mi equipo'} (mi equipo)`;
  
}

export function runTestHarnessControlledTeamSideHint(ctx: any): any {
    const match = ctx.selectedMatch();
    if (!match) {
      return 'Elegí un partido para probar escenarios.';
    }
    if (ctx.controlledTeamSideModel === 'HOME') {
      return `Controlando local: ${match.homeTeamName}`;
    }
    if (ctx.controlledTeamSideModel === 'AWAY') {
      return `Controlando visitante: ${match.awayTeamName}`;
    }
    return ctx.selectedMatchIncludesUserTeam()
      ? `Controlando mi equipo: ${ctx.userTeamName() || 'usuario'}`
      : 'Mi equipo no juega este partido; eleg? Local o Visitante.';
  
}

export function runTestHarnessCurrentOrAutoSelectedLineup(ctx: any, formation: any): any {
    return ctx.harness.getCurrentLineup().pipe(
      switchMap((lineup) => {
        const playerCount = (lineup as any).players?.length ?? 0;
        const slotCount = ctx.effectivePositionPixelSlots(lineup).length;
        if (playerCount === 11 && slotCount >= 11) {
          return of(lineup);
        }
        ctx.analysisReadyMessage.set(
          `Current lineup vacío; auto-select ${formation} antes de correr el harness.`
        );
        return ctx.harness.autoSelectLineup(formation);
      })
    );
  
}

export function runTestHarnessDeltaClass(ctx: any, value: any): any {
    return deltaClassName(value);
  
}

export function runTestHarnessEffectiveControlledSide(ctx: any): any {
    const match = ctx.selectedMatch();
    return match ? ctx.resolveControlledSideForMatch(match) : 'HOME';
  
}

export function runTestHarnessFallbackYForPosition(ctx: any, position: any): any {
    return getFallbackYForPosition(position);
  
}

export function runTestHarnessFindMatch(ctx: any, matchId: any): any {
    for (const round of ctx.rounds()) {
      const match = round.matches.find((item: any) => item.matchId === matchId);
      if (match) {
        return match;
      }
    }
    return null;
  
}

export function runTestHarnessFmtDeltaInt(ctx: any, value: any): any {
    return formatDeltaInt(value);
  
}

export function runTestHarnessFmtDeltaMicro(ctx: any, value: any): any {
    return formatDeltaMicro(value);
  
}

export function runTestHarnessFmtDeltaNumber(ctx: any, value: any): any {
    return formatDeltaNumber(value);
  
}

export function runTestHarnessFmtPct(ctx: any, value: any): any {
    return formatPercent(value);
  
}

export function runTestHarnessFmtPctCoord(ctx: any, value: any): any {
    return Number.isFinite(value) ? value.toFixed(2) : '-';
  
}

export function runTestHarnessFmtXg(ctx: any, value: any): any {
    return formatXg(value);
  
}

export function runTestHarnessFormationPickIsBestOfBad(ctx: any, row: any): any {
    return row.avgXgDiff <= -0.75 || row.avgXgAgainst >= 1.35;
  
}

export function runTestHarnessFormationSummaryIdentity(ctx: any, row: any): any {
    const ownChannel = ctx.formationSummaryOwnChannel(row);
    const opponentChannel = ctx.formationSummaryOpponentChannel(row);
    const profile = ctx.formationSummaryProfile(row);
    return `${profile} · ${ownChannel} · ${opponentChannel}`;
  
}

export function runTestHarnessFormationSummaryOwnChannel(ctx: any, row: any): any {
    const totalShots = row.avgCentralShotsFor + row.avgWideShotsFor + row.avgLongShotsFor;
    const centralShare = ctx.safeRatio(row.avgCentralShotsFor, totalShots);
    const wideShare = ctx.safeRatio(row.avgWideShotsFor, totalShots);
    const leftWideXg = row.avgLeftWideXgFor ?? 0;
    const rightWideXg = row.avgRightWideXgFor ?? 0;
    const wideXg = leftWideXg + rightWideXg;
    const strongestWideXg = Math.max(leftWideXg, rightWideXg);
    const wideSideGap = Math.abs(leftWideXg - rightWideXg);
    const xgSide = leftWideXg >= rightWideXg ? 'izquierda' : 'derecha';
    const wideXgSignal = strongestWideXg >= 0.12
      && (wideXg >= 0.28 || wideXg >= row.avgXgFor * 0.24 || wideSideGap >= 0.05);
    const centralLean = row.avgShapeAttackCenter - Math.max(row.avgShapeAttackLeft, row.avgShapeAttackRight);
    const wideLean = Math.max(row.avgShapeAttackLeft, row.avgShapeAttackRight) - row.avgShapeAttackCenter;
    const side = row.avgShapeAttackLeft >= row.avgShapeAttackRight ? 'izquierda' : 'derecha';
    if (wideXgSignal) return wideSideGap >= 0.05 ? `ataca por banda ${xgSide}` : 'ataca por bandas';
    if (centralLean >= 0.16 || centralShare >= 0.52) return 'ataca por centro';
    if (wideShare >= 0.26 && Math.max(row.avgShapeAttackLeft, row.avgShapeAttackRight) >= 0.60) {
      return `ataque mixto con banda ${side}`;
    }
    if (wideLean >= 0.10 || wideShare >= 0.40) return `ataca por banda ${side}`;
    return 'ataque repartido';
  
}

export function runTestHarnessFormationSummaryProfile(ctx: any, row: any): any {
    const readLevel = ctx.formationSummaryReadLevel(row);
    const sterile = row.avgXgFor <= 0.75 && row.avgShotsFor <= 13.0;
    if (readLevel === 'review' && sterile) return 'bloque esteril';
    if (row.avgXgFor >= 0.90 && row.avgXgAgainst <= 0.85 && row.avgXgDiff >= 0.18) return 'plan completo';
    if (row.avgXgFor >= 0.95 || row.avgShapeAttackVolumeMultiplier >= 1.08) return 'plan ofensivo';
    if (row.avgXgAgainst <= 0.70 || row.avgShapeDefensiveResistanceMultiplier <= 0.84) return 'plan seguro';
    if (readLevel === 'tradeoff') return 'plan de contexto';
    return 'plan neutro';
  
}

export function runTestHarnessFormationSummaryRead(ctx: any, row: any): any {
    const level = ctx.formationSummaryReadLevel(row);
    switch (level) {
      case 'strong': return 'Ventaja clara';
      case 'solid': return 'Solida';
      case 'tradeoff': return 'Tradeoff';
      case 'review': return 'Revisar';
      default: return 'Neutra';
    }
  
}

export function runTestHarnessFormationSummaryReadClass(ctx: any, row: any): any {
    const level = ctx.formationSummaryReadLevel(row);
    if (level === 'strong' || level === 'solid') return 'read-strong';
    if (level === 'tradeoff') return 'read-visible';
    if (level === 'review') return 'read-check';
    return 'read-stable';
  
}

export function runTestHarnessFormationSummaryReadLevel(ctx: any, row: any): any {
    const rows = ctx.formationMatrixSummaryResults();
    const bestXgDiff = rows.length > 0 ? Math.max(...rows.map((candidate: any) => candidate.avgXgDiff)) : row.avgXgDiff;
    const bestXga = rows.length > 0 ? Math.min(...rows.map((candidate: any) => candidate.avgXgAgainst)) : row.avgXgAgainst;
    const relativeDiffGap = bestXgDiff - row.avgXgDiff;
    const relativeXgaGap = row.avgXgAgainst - bestXga;
    const strongResult = row.avgXgDiff >= 0.20 && row.avgShotDiff >= 1.0;
    const solidResult = row.avgXgDiff >= 0.06 && row.avgXgAgainst <= 1.15;
    const lowBlockProfile = row.avgShapeAttackVolumeMultiplier <= 0.92
      && row.avgShapeDefensiveResistanceMultiplier <= 0.88;
    const overExposed = row.avgXgAgainst >= 1.30
      || (row.avgShotsAgainst >= 18.0 && row.avgXgAgainst >= 1.12);
    const bluntAttack = row.avgXgFor <= 0.75 && row.avgShotsFor <= 13.0;
    const sterileLowBlock = bluntAttack && row.avgXgDiff <= -0.45 && row.avgXgAgainst <= 1.15;
    const controlledDefense = row.avgXgAgainst <= 1.05
      || row.avgShapeDefensiveResistanceMultiplier <= 0.82;
    const acceptableAbsoluteResult = row.avgXgDiff >= -0.35 && row.avgXgAgainst <= 1.25;
    const bestOfBadResult = row.avgXgDiff < -0.75 || row.avgXgAgainst >= 1.35;
    const objectivelyBad = row.avgXgAgainst >= 1.80 || row.avgXgDiff <= -1.50;
    if (strongResult) return 'strong';
    if (sterileLowBlock) return 'review';
    if (relativeDiffGap <= 0.12 && relativeXgaGap <= 0.35) {
      return acceptableAbsoluteResult ? 'solid' : 'tradeoff';
    }
    if (bestOfBadResult && (relativeDiffGap <= 0.35 || relativeXgaGap <= 0.45)) return 'tradeoff';
    if (relativeDiffGap <= 0.35 && (relativeXgaGap <= 0.75 || row.avgShotDiff >= -9.0)) return 'tradeoff';
    if (objectivelyBad) return 'review';
    if (overExposed && lowBlockProfile) return 'review';
    if (overExposed && relativeDiffGap >= 0.90) return 'review';
    if (lowBlockProfile && controlledDefense && bluntAttack) return 'tradeoff';
    if (solidResult || (controlledDefense && row.avgXgDiff >= -0.05)) return 'solid';
    if (bluntAttack && row.avgXgAgainst <= 1.12) return 'tradeoff';
    return 'neutral';
  
}

export function runTestHarnessFormationWidthRead(ctx: any, formation: any): any {
    const positions = ctx.formationPositionsByName()[formation] ?? [];
    return getFormationWidthReadFromPositions(positions);
  
}

export function runTestHarnessFormationWingbackRead(ctx: any, formation: any): any {
    const positions = ctx.formationPositionsByName()[formation] ?? [];
    return getFormationWingbackReadFromPositions(positions);
  
}

export function runTestHarnessGoalDifference(ctx: any, row: any): any {
    return ctx.scenarioGoalsFor(row) - ctx.scenarioGoalsAgainst(row);
  
}

export function runTestHarnessIsAttackingPosition(ctx: any, position: any): any {
    return isAttackingPlayerPosition(position);
  
}

export function runTestHarnessIsShotLikeEvent(ctx: any, event: any): any {
    return checkShotLikeEvent(event);
  
}

export function runTestHarnessLineupDiagnosticCoord(ctx: any, player: any): any {
    if (typeof player.xPercent !== 'number' || typeof player.yPercent !== 'number') {
      return 'slot';
    }
    return `${player.xPercent.toFixed(0)}/${player.yPercent.toFixed(0)}`;
  
}

export function runTestHarnessLineupDiagnosticSource(ctx: any, player: any): any {
    switch (player.positionSource) {
      case 'modal-custom':
        return 'Modal custom';
      case 'persisted-slot':
        return 'Slot guardado';
      case 'canonical':
        return 'Formacion';
      default:
        return 'Sin fuente';
    }
  
}

export function runTestHarnessLineupDiagnosticTeams(ctx: any, diagnostic: any): any {
    return [diagnostic.home, diagnostic.away];
  
}

export function runTestHarnessLoadFormationCoordinateCache(ctx: any): any {
    (ctx.http as HttpClient).get<FormationDTO[]>(`${environment.apiUrl}/editor/formations`)
      .pipe(catchError(() => of([] as FormationDTO[])))
      .subscribe((formations: any) => {
        const next: Record<string, FormationDTO['positions']> = {};
        for (const formation of formations ?? []) {
          if (formation?.name) {
            next[formation.name] = formation.positions ?? [];
          }
        }
        ctx.formationPositionsByName.set(next);
      });
  
}

export function runTestHarnessManualShapeVsPresetPresets(ctx: any, fromX: any, fromY: any, candidate: any): any {
    void candidate;
    return buildManualShapeVsPresetPresets(fromX, fromY, ctx.positionPixelVisualLine(fromY));
  
}

export function runTestHarnessMatchContextXPercent(ctx: any, slot: any): any {
    return getMatchContextXPercent(slot);
  
}

export function runTestHarnessMatchContextYPercent(ctx: any, slot: any): any {
    return getMatchContextYPercent(slot);
  
}

export function runTestHarnessMaxBy(ctx: any, items: any, score: any): any {
    return items.reduce((best: any, item: any) => !best || score(item) > score(best) ? item : best, null);
  
}

export function runTestHarnessMinBy(ctx: any, items: any, score: any): any {
    return items.reduce((best: any, item: any) => !best || score(item) < score(best) ? item : best, null);
  
}

export function runTestHarnessModalAttackIntent(ctx: any, position: any): any {
    const line = ctx.positionPixelLine(position);
    if (line === 'ATT') return 3;
    if (ctx.playerSwapProfile(position) === 'WIDE') return 2.6;
    if (line === 'MID') return 1.5;
    if (line === 'DEF') return 0.4;
    return 0;
  
}

export function runTestHarnessModalMovedPlayers(ctx: any, lineup: any): any {
    const playersById = new Map<string, any>((lineup.players ?? []).map((player: any) => [player.playerId, player]));
    return (lineup.slots ?? [])
      .filter((slot: any) => {
        const player = playersById.get(slot.playerId);
        if (player?.position?.toUpperCase() === 'GK') return false;
        return Number.isFinite(slot.customXPercent) || Number.isFinite(slot.customYPercent);
      })
      .map((slot: any) => {
        const player = playersById.get(slot.playerId);
        const name = player?.name ?? slot.playerId;
        const position = player?.position ?? 'slot';
        const x = Number.isFinite(slot.customXPercent) ? `${Number(slot.customXPercent).toFixed(1)}%` : 'base';
        const y = Number.isFinite(slot.customYPercent) ? `${Number(slot.customYPercent).toFixed(1)}%` : 'base';
        return `${name} (${position}, ${x}/${y})`;
      });
  
}

export function runTestHarnessModalProtectIntent(ctx: any, position: any): any {
    const line = ctx.positionPixelLine(position);
    if (line === 'DEF') return 3;
    if (line === 'MID') return 2.2;
    if (ctx.playerSwapProfile(position) === 'WIDE') return 1.1;
    if (line === 'ATT') return 0.3;
    return 0;
  
}

export function runTestHarnessModalProtectWhatIfIsSafe(ctx: any, row: any): any {
    return row.deltaXgAgainst < -0.001
      || row.deltaShotsAgainst < -0.01
      || (row.deltaXgAgainst <= 0.001 && row.deltaShotsAgainst <= 0.01 && row.deltaXgDiff >= 0.02);
  
}

export function runTestHarnessModalProtectWhatIfScore(ctx: any, row: any): any {
    return Math.max(0, -row.deltaXgAgainst) * 2.5
      + Math.max(0, -row.deltaShotsAgainst) * 0.08
      + Math.max(0, row.deltaXgDiff) * 0.35
      - Math.max(0, row.deltaXgAgainst) * 3.5
      - Math.max(0, row.deltaShotsAgainst) * 0.12;
  
}
