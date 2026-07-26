import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LineupDTO } from '../../../shared/models/lineup/lineup.dto';
import { LineupSlotDTO } from '../../../shared/models/lineup/lineup-slot.dto';
import {
  CustomFixture,
  LabMutationResult,
  LineupDiagnostic,
  MatchPreviewSummary,
  MatchFixture,
  PlayerSwapMatrixSummaryRequest,
  PlayerSwapMatrixSummaryRow,
  PositionPixelMatrixSummaryRequest,
  PositionPixelMatrixSummaryRow,
  RoleSlotImpactRequest,
  RoleSlotImpactSummaryRow,
  FormationMatrixRow,
  FormationMatrixSummaryRow,
  ReplayMatchRequest,
  RoundStateResponse,
  ScenarioMatrixRow,
  ScenarioMatrixSummaryRequest,
  ScenarioMatrixSummaryRow,
  SideMirrorSyntheticLabRow,
  SetFormationRequest,
  SetStyleRequest,
  SimulateRoundRequest,
  SubstitutionWhatIfRequest,
  SubstitutionWhatIfSummaryRow,
  TestHarnessMutationResponse,
  TeamStyle,
} from '../models/test-harness.model';

/**
 * Mutation wrapper for the debug test harness.
 *
 * Read endpoints are handled by their owning services so the harness page can
 * stay a thin orchestrator.
 */
@Injectable({ providedIn: 'root' })
export class TestHarnessService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/test-harness/career`;
  private matchEngineUrl = `${environment.apiUrl}/match-engine`;
  private lineupUrl = `${environment.apiUrl}/career/lineup`;

  /**
   * POST /api/v1/test-harness/career/set-formation
   *
   * Persists the user team's formation for both UI state and engine input.
   *
   * @param formation a formation code (e.g. "4-3-3")
   * @returns Observable<TestHarnessMutationResponse> with success flag and
   *   the formation that was persisted
   */
  setFormation(formation: string): Observable<TestHarnessMutationResponse> {
    const body: SetFormationRequest = { formation };
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/set-formation`,
      body
    );
  }

  setStyle(style: TeamStyle): Observable<TestHarnessMutationResponse> {
    const body: SetStyleRequest = { style };
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/set-style`,
      body
    );
  }

  getCurrentLineup(): Observable<LineupDTO> {
    return this.http.get<LineupDTO>(`${this.lineupUrl}/current`);
  }

  autoSelectLineup(formation: string): Observable<LineupDTO> {
    return this.http.post<LineupDTO>(`${this.lineupUrl}/auto-select`, {
      formation,
    });
  }

  /**
   * Persist a lineup through the real lineup endpoint.
   *
   * Used by the Formation matrix when we want the V24 engine to receive a real
   * tactical shape, not only a formation label. Passing no slots lets the backend
   * rebuild canonical slots for the requested formation while preserving the
   * same player IDs. Passing slots restores the exact original manual/custom
   * shape after the matrix finishes.
   */
  manualSelectLineup(
    formation: string,
    playerIds: string[],
    slots?: LineupSlotDTO[]
  ): Observable<LineupDTO> {
    return this.http.post<LineupDTO>(`${this.lineupUrl}/manual-select`, {
      formation,
      playerIds,
      slots: slots ?? [],
    });
  }

  /** Clears injury, suspension and card flags across the entire squad. */
  resetInjuries(): Observable<TestHarnessMutationResponse> {
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/reset-injuries`,
      {}
    );
  }

  /** Replaces the current tournament fixtures with caller-provided matches. */
  replaceFixtures(
    fixtures: CustomFixture[]
  ): Observable<TestHarnessMutationResponse> {
    return this.http.post<TestHarnessMutationResponse>(
      `${this.apiUrl}/replace-fixtures`,
      fixtures
    );
  }

  /**
   * Re-simulates a single match with the given seed.
   *
   * Same match plus same seed should produce the same result. Null seed asks
   * the backend for a non-reproducible replay.
   */
  replayMatch(matchId: string, seed: number | null): Observable<MatchFixture> {
    const body: ReplayMatchRequest = { seed };
    return this.http.post<MatchFixture>(
      `${this.apiUrl}/match/${matchId}/replay`,
      body
    );
  }

  lineupDiagnostic(matchId: string, seed: number | null): Observable<LineupDiagnostic> {
    const body: ReplayMatchRequest = { seed };
    return this.http.post<LineupDiagnostic>(
      `${this.apiUrl}/match/${matchId}/lineup-diagnostic`,
      body
    );
  }

  runMatchPreviewSummary(
    matchId: string,
    seedStart: number,
    seedCount: number,
    controlledTeamSide: ScenarioMatrixSummaryRequest['controlledTeamSide'] = 'USER'
  ): Observable<MatchPreviewSummary> {
    const body: ScenarioMatrixSummaryRequest = { seedStart, seedCount, controlledTeamSide };
    return this.http.post<MatchPreviewSummary>(
      `${this.apiUrl}/match/${matchId}/preview-summary`,
      body
    );
  }

  runFormationMatrix(
    matchId: string,
    seed: number | null,
    controlledTeamSide: ScenarioMatrixSummaryRequest['controlledTeamSide'] = 'USER'
  ): Observable<FormationMatrixRow[]> {
    const body: ReplayMatchRequest = { seed, controlledTeamSide };
    return this.http.post<FormationMatrixRow[]>(
      `${this.apiUrl}/match/${matchId}/formation-matrix`,
      body
    );
  }

  runFormationMatrixSummary(
    matchId: string,
    seedStart: number,
    seedCount: number,
    controlledTeamSide: ScenarioMatrixSummaryRequest['controlledTeamSide'] = 'USER'
  ): Observable<FormationMatrixSummaryRow[]> {
    const body: ScenarioMatrixSummaryRequest = { seedStart, seedCount, controlledTeamSide };
    return this.http.post<FormationMatrixSummaryRow[]>(
      `${this.apiUrl}/match/${matchId}/formation-matrix/summary`,
      body
    );
  }

  runSideMirrorSyntheticLab(
    seedStart: number,
    seedCount: number
  ): Observable<SideMirrorSyntheticLabRow[]> {
    const body: ScenarioMatrixSummaryRequest = { seedStart, seedCount };
    return this.http.post<SideMirrorSyntheticLabRow[]>(
      `${this.apiUrl}/labs/side-mirror-synthetic`,
      body
    );
  }

  runScenarioMatrix(matchId: string, seed: number | null): Observable<ScenarioMatrixRow[]> {
    const body: ReplayMatchRequest = { seed };
    return this.http.post<ScenarioMatrixRow[]>(
      `${this.apiUrl}/match/${matchId}/scenario-matrix`,
      body
    );
  }

  runScenarioMatrixSummary(
    matchId: string,
    seedStart: number,
    seedCount: number,
    scenarioGroup: ScenarioMatrixSummaryRequest['scenarioGroup'] = 'ALL',
    controlledTeamSide: ScenarioMatrixSummaryRequest['controlledTeamSide'] = 'USER'
  ): Observable<ScenarioMatrixSummaryRow[]> {
    const body: ScenarioMatrixSummaryRequest = { seedStart, seedCount, scenarioGroup, controlledTeamSide };
    return this.http.post<ScenarioMatrixSummaryRow[]>(
      `${this.apiUrl}/match/${matchId}/scenario-matrix/summary`,
      body
    );
  }

  runPlayerSwapMatrixSummary(
    matchId: string,
    request: PlayerSwapMatrixSummaryRequest
  ): Observable<PlayerSwapMatrixSummaryRow> {
    return this.http.post<PlayerSwapMatrixSummaryRow>(
      `${this.apiUrl}/match/${matchId}/player-swap-matrix/summary`,
      request
    );
  }

  runSubstitutionWhatIfSummary(
    matchId: string,
    request: SubstitutionWhatIfRequest
  ): Observable<SubstitutionWhatIfSummaryRow> {
    return this.http.post<SubstitutionWhatIfSummaryRow>(
      `${this.apiUrl}/match/${matchId}/substitution-what-if/summary`,
      request
    );
  }

  runPositionPixelMatrixSummary(
    matchId: string,
    request: PositionPixelMatrixSummaryRequest
  ): Observable<PositionPixelMatrixSummaryRow> {
    return this.http.post<PositionPixelMatrixSummaryRow>(
      `${this.apiUrl}/match/${matchId}/position-pixel-matrix/summary`,
      request
    );
  }

  runRoleSlotImpactSummary(
    matchId: string,
    request: RoleSlotImpactRequest
  ): Observable<RoleSlotImpactSummaryRow[]> {
    return this.http.post<RoleSlotImpactSummaryRow[]>(
      `${this.apiUrl}/match/${matchId}/role-slot-impact/summary`,
      request
    );
  }

  prepareOffensiveUpgradeLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/offensive-upgrade/prepare`,
      {}
    );
  }

  restoreOffensiveUpgradeLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/offensive-upgrade/restore`,
      {}
    );
  }

  prepareDefensiveDowngradeLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/defensive-downgrade/prepare`,
      {}
    );
  }

  restoreDefensiveDowngradeLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/defensive-downgrade/restore`,
      {}
    );
  }

  prepareObjectiveContrastLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/objective-contrast/prepare`,
      {}
    );
  }

  restoreObjectiveContrastLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/objective-contrast/restore`,
      {}
    );
  }

  prepareWeakWideDefendersLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-wide-defenders/prepare`,
      {}
    );
  }

  restoreWeakWideDefendersLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-wide-defenders/restore`,
      {}
    );
  }

  prepareOpponentWeakWideDefendersLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-wide-defenders/prepare`,
      {}
    );
  }

  restoreOpponentWeakWideDefendersLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-wide-defenders/restore`,
      {}
    );
  }

  prepareOpponentWeakLeftDefenderLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-left-defender/prepare`,
      {}
    );
  }

  restoreOpponentWeakLeftDefenderLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-left-defender/restore`,
      {}
    );
  }

  prepareOpponentWeakRightDefenderLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-right-defender/prepare`,
      {}
    );
  }

  restoreOpponentWeakRightDefenderLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-right-defender/restore`,
      {}
    );
  }

  prepareOpponentWeakCenterBacksLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-center-backs/prepare`,
      {}
    );
  }

  restoreOpponentWeakCenterBacksLab(matchId: string): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/match/${matchId}/labs/opponent-weak-center-backs/restore`,
      {}
    );
  }

  prepareWeakLeftDefenderLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-left-defender/prepare`,
      {}
    );
  }

  restoreWeakLeftDefenderLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-left-defender/restore`,
      {}
    );
  }

  prepareWeakRightDefenderLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-right-defender/prepare`,
      {}
    );
  }

  restoreWeakRightDefenderLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-right-defender/restore`,
      {}
    );
  }

  prepareWeakCenterBacksLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-center-backs/prepare`,
      {}
    );
  }

  restoreWeakCenterBacksLab(): Observable<LabMutationResult> {
    return this.http.post<LabMutationResult>(
      `${this.apiUrl}/labs/weak-center-backs/restore`,
      {}
    );
  }

  /**
   * Starts a full round of matches.
   *
   * The backend derives the user from auth and runs the simulation
   * asynchronously.
   */
  simulateRound(
    roundId: string,
    matches: Array<{ matchId: string; homeTeamId: string; awayTeamId: string }>
  ): Observable<RoundStateResponse> {
    const body: SimulateRoundRequest = { roundId, matches };
    return this.http.post<RoundStateResponse>(
      `${this.matchEngineUrl}/rounds/start`,
      body
    );
  }
}
