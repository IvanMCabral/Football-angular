// V24D24: Tests for TestHarnessPageComponent.
//
// These tests focus on the state-management contract (signals, handlers).
// The full template rendering (Material modules, V24MatchDetailPageComponent
// re-mount, etc.) is exercised by REVISOR's manual smoke — Angular Material
// component specs would need NoopAnimations + providers for every nested
// component, which is high-cost relative to value for a debug-only page.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { TestHarnessPageComponent } from './test-harness-page.component';
import { CareerService } from '../../../core/services/career.service';
import { TestHarnessService } from '../services/test-harness.service';
import { MatchDetailApiService } from '../../match-detail/services/match-detail-api.service';
import { TimelineSnapshot } from '../../match-detail/models/match-detail.model';
import { FormationMatrixSummaryRow } from '../models/test-harness.model';

describe('TestHarnessPageComponent', () => {
  let component: TestHarnessPageComponent;
  let fixture: ComponentFixture<TestHarnessPageComponent>;
  let careerService: jasmine.SpyObj<CareerService>;
  let harness: jasmine.SpyObj<TestHarnessService>;
  let matchDetailApi: jasmine.SpyObj<MatchDetailApiService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    window.localStorage.removeItem('manager:last-modal-position-move');
    careerService = jasmine.createSpyObj('CareerService', [
      'getCareerStatus',
      'getAllFixturesWithBye',
    ]);
      harness = jasmine.createSpyObj('TestHarnessService', [
        'setFormation',
        'setStyle',
        'getCurrentLineup',
        'autoSelectLineup',
        'manualSelectLineup',
      'resetInjuries',
      'replaceFixtures',
      'replayMatch',
      'simulateRound',
      'runFormationMatrix',
      'runFormationMatrixSummary',
      'runPositionPixelMatrixSummary',
      'runScenarioMatrixSummary',
    ]);
    matchDetailApi = jasmine.createSpyObj('MatchDetailApiService', [
      'getMatchTimeline',
      'getMatchDetail',
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Default happy path: a career exists with one round of one match.
    careerService.getCareerStatus.and.returnValue(
      of({
        careerId: 'career-1',
        season: 1,
        currentRound: 1,
        totalRounds: 1,
        userTeamId: 'team-1',
        userSessionTeamId: 'team-1',
        userTeamName: 'My Team',
        hasLastMatchPlayed: false,
        nextMatchId: 'match-1',
        engineStatus: 'IDLE',
        canAdvanceRound: true,
        careerPhase: 'IN_PROGRESS',
        squadSize: 11,
        freePlayersCount: 0,
      })
    );
    careerService.getAllFixturesWithBye.and.returnValue(
      of({
        rounds: [
          {
            round: 1,
            byeTeam: null,
            matches: [
              {
                matchId: 'match-1',
                homeTeamId: 'team-1',
                awayTeamId: 'team-2',
                round: 1,
                status: 'PENDING',
                homeGoals: null,
                awayGoals: null,
                roundId: 'round-uuid-1',
              },
            ],
          },
        ],
      })
    );
    // Default: timeline returns a stable snapshot for any minute.
    matchDetailApi.getMatchTimeline.and.returnValue(
      of(sampleSnapshot(0))
    );
    // Default: detail is unavailable (404 → null).
    matchDetailApi.getMatchDetail.and.returnValue(of(null));
    harness.setStyle.and.returnValue(
      of({ success: true, message: 'style ok', style: 'BALANCED' } as any)
    );
    harness.getCurrentLineup.and.returnValue(of(sampleLineup('4-4-2')) as any);
    harness.autoSelectLineup.and.returnValue(of(sampleLineup('4-4-2')) as any);
    harness.manualSelectLineup.and.returnValue(of(sampleLineup('4-4-2')) as any);
    harness.resetInjuries.and.returnValue(of({ success: true, message: 'reset' } as any));
    harness.runFormationMatrix.and.returnValue(of([]) as any);
    harness.runFormationMatrixSummary.and.returnValue(of([]) as any);
    harness.runScenarioMatrixSummary.and.returnValue(of([]) as any);

    await TestBed.configureTestingModule({
      imports: [TestHarnessPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CareerService, useValue: careerService },
        { provide: TestHarnessService, useValue: harness },
        { provide: MatchDetailApiService, useValue: matchDetailApi },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHarnessPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads the active career and matches on init', () => {
    expect(component.careerId()).toBe('career-1');
    expect(component.rounds().length).toBe(1);
    expect(component.rounds()[0].matches.length).toBe(1);
    expect(component.loading()).toBeFalse();
    expect(component.loadError()).toBeNull();
  });

  it('exposes stable match row ids and enables player swap smoke after selecting a match', () => {
    const row: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="match-row"][data-match-id="match-1"]'
    );
    expect(row).withContext('Panel C match row should expose a stable selector').not.toBeNull();

    const swapButtonBefore: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="player-swap-full-smoke-button"]'
    );
    expect(swapButtonBefore).withContext('player swap full smoke button should exist').not.toBeNull();
    expect(swapButtonBefore?.disabled).toBeTrue();

    row?.click();
    fixture.detectChanges();

    expect(component.selectedMatchId()).toBe('match-1');

    const swapButtonAfter: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="player-swap-full-smoke-button"]'
    );
    expect(swapButtonAfter?.disabled).toBeFalse();
  });

  it('reselects a real user-team match before checklist steps when the selected match is stale', () => {
    component.rounds.set([
      {
        round: 1,
        byeTeam: null,
        matches: [
          {
            matchId: 'match-1',
            round: 1,
            homeTeamId: 'team-1',
            homeTeamName: 'My Team',
            awayTeamId: 'team-2',
            awayTeamName: 'Rival',
            status: 'COMPLETED',
            homeGoals: 1,
            awayGoals: 0,
            homeFormation: null,
            awayFormation: null,
            roundId: 'round-uuid-1',
          },
        ],
      },
    ]);
    component.selectMatch({
      matchId: 'stale-match-id',
      round: 99,
      homeTeamId: 'team-1',
      homeTeamName: 'My Team',
      awayTeamId: 'team-x',
      awayTeamName: 'Old Rival',
      status: 'COMPLETED',
      homeGoals: 1,
      awayGoals: 1,
      homeFormation: null,
      awayFormation: null,
    });

    (component as any).ensureProfessionalQaChecklistMatch();

    expect(component.selectedMatchId()).toBe('match-1');
  });

  it('runs the full position smoke board for the QA pixel movement action', () => {
    component.selectMatch(makeMatchRow('match-qa-pixel') as any);
    const fullSmokeSpy = spyOn(component, 'onRunFullPositionSmokeBoard');
    const presetSpy = spyOn(component, 'onRunPositionPixelMatrix');
    spyOn(component as any, 'watchProfessionalQaActionCompletion');

    component.onRunProfessionalQaAction('Pixel movement signal');

    expect(fullSmokeSpy).toHaveBeenCalled();
    expect(presetSpy).not.toHaveBeenCalled();
    expect(component.professionalQaActionLabel('Pixel movement signal')).toContain('full position smoke');
  });

  it('builds the Match Compare route for the selected match', () => {
    expect(component.selectedMatchCompareRoute()).toBeNull();

    component.selectMatch(makeMatchRow('match-compare-1') as any);

    expect(component.selectedMatchCompareRoute()).toEqual([
      '/careers',
      'career-1',
      'matches',
      'match-compare-1',
      'compare',
    ]);
  });

  it('shows a guided professional compare workflow', () => {
    let steps = component.compareWorkflowSteps();
    expect(steps.length).toBe(4);
    expect(steps[0].state).toBe('active');
    expect(steps[0].title).toContain('Elegir partido');
    expect(steps[1].state).toBe('pending');

    component.selectMatch(makeMatchRow('match-flow-1') as any);

    steps = component.compareWorkflowSteps();
    expect(steps[0].state).toBe('done');
    expect(steps[0].status).toBe('OK');
    expect(steps[1].state).toBe('active');
    expect(steps[3].body).toContain('Open Match Compare');
  });

  it('falls back to the test-harness snapshot when Panel C fixture endpoint is empty', async () => {
    careerService.getAllFixturesWithBye.and.returnValue(of({ rounds: [] }));

    component.reload();
    const snapshotReq = httpMock.expectOne((req) =>
      req.url.endsWith('/api/v1/test-harness/career/snapshot')
    );
    snapshotReq.flush({
      fixtures: [
        {
          matchId: 'snapshot-match-1',
          homeTeamId: 'team-3',
          homeTeamName: 'Snapshot Home',
          awayTeamId: 'team-1',
          awayTeamName: 'My Team',
          round: 2,
          status: 'COMPLETED',
          homeGoals: 1,
          awayGoals: 2,
        },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.rounds().length).toBe(1);
    expect(component.rounds()[0].round).toBe(2);
    expect(component.rounds()[0].matches[0].matchId).toBe('snapshot-match-1');
    expect(component.rounds()[0].matches[0].homeTeamName).toBe('Snapshot Home');
    expect(component.rounds()[0].matches[0].awayGoals).toBe(2);
    expect(component.loading()).toBeFalse();
    expect(component.loadError()).toBeNull();
  });

  it('starts with no selected match', () => {
    expect(component.selectedMatchId()).toBeNull();
  });

  it('defaults player swap battery precision to balanced for tuning reads', () => {
    expect(component.playerSwapBatteryPrecisionModel).toBe('balanced');
    expect(component.playerSwapSeedCountModel).toBe(10);
    expect(component.playerSwapBatteryPrecisionHint()).toContain('recomendado para decidir tuning');
  });

  it('falls back to balanced when player swap battery precision is invalid', () => {
    component.onPlayerSwapBatteryPrecisionChange('unknown');

    expect(component.playerSwapBatteryPrecisionModel).toBe('balanced');
    expect(component.playerSwapSeedCountModel).toBe(10);
  });

  it('wires the Position presets matrix button to the position pixel handler', () => {
    const runSpy = spyOn(component, 'onRunPositionPixelMatrix');
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-1',
      homeTeamName: 'My Team',
      awayTeamId: 'team-2',
      awayTeamName: 'Rival',
      status: 'PENDING',
      homeGoals: null,
      awayGoals: null,
      homeFormation: null,
      awayFormation: null,
      roundId: 'round-uuid-1',
    });
    fixture.detectChanges();

    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="position-presets-matrix-button"]'
    );
    expect(button).withContext('button should be present').not.toBeNull();
    expect(button?.type).toBe('button');
    expect(button?.disabled).toBeFalse();

    button?.click();

    expect(runSpy).toHaveBeenCalled();
  });

  it('exposes stable test ids for the main matrix buttons', () => {
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-1',
      homeTeamName: 'My Team',
      awayTeamId: 'team-2',
      awayTeamName: 'Rival',
      status: 'PENDING',
      homeGoals: null,
      awayGoals: null,
      homeFormation: null,
      awayFormation: null,
      roundId: 'round-uuid-1',
    });
    fixture.detectChanges();

    for (const testId of [
      'player-swap-matrix-button',
      'player-swap-battery-button',
      'position-presets-matrix-button',
      'formation-avg-button',
    ]) {
      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        `[data-testid="${testId}"]`
      );
      expect(button).withContext(`${testId} should be present`).not.toBeNull();
      expect(button?.disabled).withContext(`${testId} should be enabled`).toBeFalse();
    }
  });

  it('selectMatch updates the signal', () => {
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-1',
      homeTeamName: 'Team 1',
      awayTeamId: 'team-2',
      awayTeamName: 'Team 2',
      status: 'PENDING',
      homeGoals: null,
      awayGoals: null,
      homeFormation: null,
      awayFormation: null,
    });
    expect(component.selectedMatchId()).toBe('match-1');
  });

  it('shows selected match context and For/Ag perspective', () => {
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-1',
      homeTeamName: 'My Team',
      awayTeamId: 'team-2',
      awayTeamName: 'Rival',
      status: 'PENDING',
      homeGoals: null,
      awayGoals: null,
      homeFormation: null,
      awayFormation: null,
      roundId: 'round-uuid-1',
    });
    fixture.detectChanges();

    const context: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="selected-match-context"]'
    );

    expect(context).withContext('context card should be present').not.toBeNull();
    expect(context?.textContent).toContain('My Team vs Rival');
    expect(context?.textContent).toContain('Mi equipo: My Team');
    expect(context?.textContent).toContain('For = My Team; Ag = Rival');
  });

  it('warns when selected match does not include the user team', () => {
    component.selectMatch({
      matchId: 'match-other',
      round: 1,
      homeTeamId: 'team-2',
      homeTeamName: 'Other Team',
      awayTeamId: 'team-3',
      awayTeamName: 'Similar Generated Team',
      status: 'COMPLETED',
      homeGoals: 0,
      awayGoals: 0,
      homeFormation: null,
      awayFormation: null,
      roundId: 'round-uuid-1',
    });
    fixture.detectChanges();

    expect(component.selectedMatchIncludesUserTeam()).toBeFalse();
    expect(component.selectedMatchScopeWarning()).toContain('Other Team vs Similar Generated Team');
    expect(component.selectedMatchScopeWarning()).toContain('Set Formation / modal DT afectan a My Team');
    expect(component.selectedMatchScopeWarning()).toContain('Controlar: Local/Visitante');
  });

  it('disables user-lineup formation audit when controlling local or visitor', () => {
    component.controlledTeamSideModel = 'HOME';

    expect(component.canRunUserLineupAudit()).toBeFalse();
    expect(component.userLineupAuditDisabledReason()).toContain('Formation matrix');
  });

  it('does not run all-formations user lineup audit for local or visitor scope', () => {
    component.controlledTeamSideModel = 'AWAY';
    harness.getCurrentLineup.calls.reset();
    harness.autoSelectLineup.calls.reset();
    snackBarSpy.open.calls.reset();

    component.onRunAllFormationsLineAudit();

    expect(harness.getCurrentLineup).not.toHaveBeenCalled();
    expect(harness.autoSelectLineup).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/Formation matrix|Formation avg/),
      'OK',
      { duration: 5000 }
    );
  });

  it('runs formation matrix for local or visitor without touching editable user lineup', () => {
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-2',
      homeTeamName: 'Local Team',
      awayTeamId: 'team-3',
      awayTeamName: 'Away Team',
      status: 'COMPLETED',
      homeGoals: 1,
      awayGoals: 0,
      homeFormation: null,
      awayFormation: null,
      roundId: 'round-uuid-1',
    });
    component.controlledTeamSideModel = 'HOME';
    harness.runFormationMatrix.calls.reset();
    const getCurrentLineupCallsBefore = harness.getCurrentLineup.calls.count();
    const manualSelectLineupCallsBefore = harness.manualSelectLineup.calls.count();

    component.onRunFormationMatrix();

    expect(harness.getCurrentLineup.calls.count()).toBe(getCurrentLineupCallsBefore);
    expect(harness.manualSelectLineup.calls.count()).toBe(manualSelectLineupCallsBefore);
    expect(harness.runFormationMatrix).toHaveBeenCalledWith('match-1', component.seedInputModel, 'HOME');
  });

  it('runs professional smoke for the controlled home side without touching editable user lineup', () => {
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-2',
      homeTeamName: 'Local Team',
      awayTeamId: 'team-3',
      awayTeamName: 'Away Team',
      status: 'COMPLETED',
      homeGoals: 1,
      awayGoals: 0,
      homeFormation: null,
      awayFormation: null,
      roundId: 'round-uuid-1',
    });
    component.controlledTeamSideModel = 'HOME';
    harness.getCurrentLineup.calls.reset();
    harness.manualSelectLineup.calls.reset();
    harness.runFormationMatrixSummary.calls.reset();
    harness.runScenarioMatrixSummary.calls.reset();

    component.onRunProfessionalSmoke();

    expect(harness.getCurrentLineup).not.toHaveBeenCalled();
    expect(harness.manualSelectLineup).not.toHaveBeenCalled();
    expect(harness.runFormationMatrixSummary).toHaveBeenCalledWith(
      'match-1',
      (component as any).summarySeedStart(),
      component.scenarioMatrixSummaryEffectiveSeedCount(),
      'HOME'
    );
    expect(harness.runScenarioMatrixSummary).toHaveBeenCalledWith(
      'match-1',
      (component as any).summarySeedStart(),
      component.scenarioMatrixSmokeSeedCount(),
      'ALL',
      'HOME'
    );
    expect(component.professionalSmokeSummary()?.scope).toBe('HOME');
    expect(component.professionalSmokeSummary()?.skipped.join(' ')).toContain('Local/Visitante');
  });

  it('blocks full professional smoke outside the editable user-team scope', () => {
    component.controlledTeamSideModel = 'HOME';
    snackBarSpy.open.calls.reset();
    harness.runFormationMatrixSummary.calls.reset();
    harness.runScenarioMatrixSummary.calls.reset();

    component.onRunProfessionalSmokeFull();

    expect(harness.runFormationMatrixSummary).not.toHaveBeenCalled();
    expect(harness.runScenarioMatrixSummary).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/Mi equipo/),
      'OK',
      { duration: 4500 }
    );
  });

  it('summarizes full professional smoke with pixel and player-swap coverage', () => {
    component.professionalSmokeSummary.set({
      controlledTeam: 'My Team (mi equipo)',
      scope: 'USER',
      formationRows: 12,
      scenarioRows: 20,
      pixelRows: 0,
      swapRows: 0,
      formationSeedCount: 20,
      scenarioSeedCount: 5,
      included: ['Formation avg: 12 formaciones x 20 seeds'],
      skipped: [],
      read: 'base',
    });
    component.positionPixelMatrixRows.set([{} as any, {} as any]);
    component.playerSwapBatterySummaries.set([{} as any]);
    snackBarSpy.open.calls.reset();

    (component as any).finalizeProfessionalSmokeFullSummary();

    expect(component.professionalSmokeSummary()?.pixelRows).toBe(2);
    expect(component.professionalSmokeSummary()?.swapRows).toBe(1);
    expect(component.professionalSmokeSummary()?.included.join(' ')).toContain('Player swap battery');
    expect(component.analysisReadyMessage()).toContain('Professional smoke full listo');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Professional smoke full complete: 2 pixel rows, 1 swaps.',
      'OK',
      { duration: 4500 }
    );
  });

  it('onFormationChange updates the model', () => {
    component.onFormationChange('3-5-2');
    expect(component.selectedFormationModel).toBe('3-5-2');
  });

  it('onFormationChange handles null gracefully', () => {
    component.onFormationChange(null as unknown as string);
    expect(component.selectedFormationModel).toBeNull();
  });

  it('applyFormation applies the selected formation and auto-selects tactical slots', () => {
    harness.setFormation.and.returnValue(
      of({ success: true, message: 'ok' } as any)
    );
    harness.autoSelectLineup.and.returnValue(of(sampleLineup('4-3-3')) as any);
    component.selectedFormationModel = '4-3-3';
    component.applyFormation();
    expect(harness.setFormation).toHaveBeenCalledWith('4-3-3');
    expect(harness.autoSelectLineup).toHaveBeenCalledWith('4-3-3');
    expect(harness.manualSelectLineup).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.mutationInFlight()).toBeFalse();
  });

  it('applyFormation does not call the service when no formation is selected', () => {
    component.selectedFormationModel = null;
    component.applyFormation();
    expect(harness.setFormation).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('applyFormation surfaces errors via the snackbar', () => {
    harness.setFormation.and.returnValue(throwError(() => new Error('boom')));
    component.selectedFormationModel = '4-4-2';
    component.applyFormation();
    expect(component.mutationInFlight()).toBeFalse();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('prepare DEF fallback lab swaps a non-defensive starter into a defensive slot and stores restore point', () => {
    const lineup = {
      ...sampleLineup('4-3-3'),
      players: [
        { playerId: 'p1', name: 'GK', position: 'GK', overall: 70 },
        { playerId: 'p2', name: 'CB', position: 'CB', overall: 70 },
        { playerId: 'p3', name: 'CB 2', position: 'CB', overall: 70 },
        { playerId: 'p4', name: 'LB', position: 'LB', overall: 70 },
        { playerId: 'p5', name: 'RB', position: 'RB', overall: 70 },
        { playerId: 'p6', name: 'CM fallback', position: 'CM', overall: 70 },
        { playerId: 'p7', name: 'CAM fallback', position: 'CAM', overall: 70 },
        { playerId: 'p8', name: 'CM 2', position: 'CM', overall: 70 },
        { playerId: 'p9', name: 'ST', position: 'ST', overall: 70 },
        { playerId: 'p10', name: 'ST 2', position: 'ST', overall: 70 },
        { playerId: 'p11', name: 'ST 3', position: 'ST', overall: 70 },
      ],
      slots: [
        { playerId: 'p1', subdivisionId: 'GK-1' },
        { playerId: 'p2', subdivisionId: 'S23-1' },
        { playerId: 'p3', subdivisionId: 'S23-3' },
        { playerId: 'p4', subdivisionId: 'S22-2' },
        { playerId: 'p5', subdivisionId: 'S24-2' },
        { playerId: 'p6', subdivisionId: 'S17-1' },
        { playerId: 'p7', subdivisionId: 'S17-2' },
        { playerId: 'p8', subdivisionId: 'S17-3' },
        { playerId: 'p9', subdivisionId: 'S04-1' },
        { playerId: 'p10', subdivisionId: 'S05-2' },
        { playerId: 'p11', subdivisionId: 'S06-3' },
      ],
    };
    (component as any).formationPositionsByName.set({
      '4-3-3': [
        { role: 'GK', subdivisionId: 'GK-1' },
        { role: 'CB', subdivisionId: 'S23-1' },
        { role: 'CB', subdivisionId: 'S23-3' },
        { role: 'LB', subdivisionId: 'S22-2' },
        { role: 'RB', subdivisionId: 'S24-2' },
        { role: 'CM', subdivisionId: 'S17-1' },
        { role: 'CM', subdivisionId: 'S17-2' },
        { role: 'CM', subdivisionId: 'S17-3' },
        { role: 'LW', subdivisionId: 'S04-1' },
        { role: 'ST', subdivisionId: 'S05-2' },
        { role: 'RW', subdivisionId: 'S06-3' },
      ],
    });
    harness.setFormation.and.returnValue(of({ success: true, message: 'formation ok' } as any));
    harness.autoSelectLineup.and.returnValue(of(lineup as any));
    harness.getCurrentLineup.and.returnValue(of(lineup as any));
    harness.manualSelectLineup.and.returnValue(of(lineup as any));

    component.onPrepareDefensiveFallbackLineupLab();

    expect(harness.manualSelectLineup).toHaveBeenCalled();
    const [, playerIds, slots] = harness.manualSelectLineup.calls.mostRecent().args;
    const savedSlots = slots ?? [];
    expect(playerIds).toContain('p9');
    expect(savedSlots.find((slot: any) => slot.subdivisionId === 'S23-1')?.playerId).toBe('p9');
    expect(savedSlots.find((slot: any) => slot.subdivisionId === 'S04-1')?.playerId).toBe('p2');
    expect(component.defensiveFallbackRestore?.slots.find((slot) => slot.subdivisionId === 'S23-1')?.playerId).toBe('p2');
    expect(component.defensiveFallbackLabRead).toContain('ST (ST) -> CB S23-1');
  });

  it('does not call a relative-best but objectively bad formation solid', () => {
    const leastBad = makeFormationSummary({
      formation: '3-5-2',
      avgXgFor: 0.33,
      avgXgAgainst: 1.43,
      avgXgDiff: -1.10,
      avgShotsFor: 12.2,
      avgShotsAgainst: 20.85,
      avgShotDiff: -8.65,
    });
    const worse = makeFormationSummary({
      formation: '4-3-3',
      avgXgFor: 0.36,
      avgXgAgainst: 2.86,
      avgXgDiff: -2.50,
      avgShotsFor: 13.05,
      avgShotsAgainst: 25.2,
      avgShotDiff: -12.15,
    });

    component.formationMatrixSummaryResults.set([leastBad, worse]);

    expect(component.formationSummaryRead(leastBad)).toBe('Tradeoff');
  });

  it('flags objectively bad formation averages for review instead of neutral', () => {
    const bad = makeFormationSummary({
      formation: '4-2-2-2',
      avgXgFor: 0.38,
      avgXgAgainst: 2.15,
      avgXgDiff: -1.77,
      avgShotsFor: 13.3,
      avgShotsAgainst: 23.3,
      avgShotDiff: -10,
    });
    const better = makeFormationSummary({
      formation: '3-5-2',
      avgXgFor: 0.33,
      avgXgAgainst: 1.43,
      avgXgDiff: -1.10,
      avgShotsFor: 12.2,
      avgShotsAgainst: 20.85,
      avgShotDiff: -8.65,
    });

    component.formationMatrixSummaryResults.set([bad, better]);

    expect(component.formationSummaryRead(bad)).toBe('Revisar');
  });

  it('flags sterile low-block formations for review even when xGA is acceptable', () => {
    const sterile = makeFormationSummary({
      formation: '5-4-1',
      avgXgFor: 0.34,
      avgXgAgainst: 0.94,
      avgXgDiff: -0.60,
      avgShotsFor: 9.8,
      avgShotsAgainst: 15.5,
      avgShotDiff: -5.7,
    });
    const balanced = makeFormationSummary({
      formation: '4-2-3-1',
      avgXgFor: 0.95,
      avgXgAgainst: 0.58,
      avgXgDiff: 0.37,
      avgShotsFor: 16.85,
      avgShotsAgainst: 14.7,
      avgShotDiff: 2.15,
    });

    component.formationMatrixSummaryResults.set([balanced, sterile]);

    expect(component.formationSummaryRead(sterile)).toBe('Revisar');
  });

  it('explains formation identity with profile, own channel and opponent risk', () => {
    const row = makeFormationSummary({
      formation: '4-2-3-1',
      avgXgFor: 1.02,
      avgXgAgainst: 0.72,
      avgXgDiff: 0.30,
      avgShotsFor: 16,
      avgShotsAgainst: 12,
      avgCentralShotsFor: 9,
      avgWideShotsFor: 4,
      avgLongShotsFor: 3,
      avgCentralShotsAgainst: 3,
      avgWideShotsAgainst: 7,
      avgLongShotsAgainst: 2,
      avgShapeAttackLeft: 0.45,
      avgShapeAttackCenter: 0.68,
      avgShapeAttackRight: 0.44,
      avgShapeDefenseLeft: 0.58,
      avgShapeDefenseCenter: 0.82,
      avgShapeDefenseRight: 0.76,
    });

    expect(component.formationSummaryIdentity(row)).toBe('plan completo · ataca por centro · riesgo por banda izquierda');
  });

  it('marks sterile low-block identity as a reviewable tactical profile', () => {
    const row = makeFormationSummary({
      formation: '5-4-1',
      avgXgFor: 0.34,
      avgXgAgainst: 0.94,
      avgXgDiff: -0.60,
      avgShotsFor: 9.8,
      avgShotsAgainst: 15.5,
      avgShotDiff: -5.7,
      avgCentralShotsFor: 3,
      avgWideShotsFor: 4,
      avgLongShotsFor: 3,
    });

    component.formationMatrixSummaryResults.set([
      makeFormationSummary({
        formation: '4-2-3-1',
        avgXgFor: 0.95,
        avgXgAgainst: 0.58,
        avgXgDiff: 0.37,
      }),
      row,
    ]);

    expect(component.formationSummaryIdentity(row)).toContain('bloque esteril');
  });

  it('reads hybrid front-three formations as mixed with bands instead of pure center', () => {
    const row = makeFormationSummary({
      formation: '3-4-3',
      avgXgFor: 0.98,
      avgXgAgainst: 0.71,
      avgXgDiff: 0.27,
      avgShotsFor: 18.35,
      avgShotsAgainst: 16.8,
      avgCentralShotsFor: 8.55,
      avgWideShotsFor: 5.0,
      avgLongShotsFor: 4.8,
      avgShapeAttackLeft: 0.64,
      avgShapeAttackCenter: 0.79,
      avgShapeAttackRight: 0.67,
    });

    expect(component.formationSummaryIdentity(row)).toContain('ataque mixto con banda derecha');
  });

  it('prioritizes own wide xG side when attack is flank-specific', () => {
    const row = makeFormationSummary({
      formation: '4-3-3',
      avgXgFor: 1.05,
      avgCentralShotsFor: 8,
      avgWideShotsFor: 6,
      avgLongShotsFor: 3,
      avgLeftWideXgFor: 0.23,
      avgRightWideXgFor: 0.08,
      avgShapeAttackLeft: 0.55,
      avgShapeAttackCenter: 0.72,
      avgShapeAttackRight: 0.75,
    });

    expect(component.formationSummaryIdentity(row)).toContain('ataca por banda izquierda');
  });

  it('reports shared wide attack when attacking xG is high but balanced', () => {
    const row = makeFormationSummary({
      formation: '4-4-2',
      avgXgFor: 1.1,
      avgCentralShotsFor: 6,
      avgWideShotsFor: 8,
      avgLongShotsFor: 3,
      avgLeftWideXgFor: 0.16,
      avgRightWideXgFor: 0.15,
      avgShapeAttackLeft: 0.62,
      avgShapeAttackCenter: 0.72,
      avgShapeAttackRight: 0.64,
    });

    expect(component.formationSummaryIdentity(row)).toContain('ataca por bandas');
  });

  it('prioritizes opponent wide xG side when formation risk is flank-specific', () => {
    const row = makeFormationSummary({
      formation: '4-3-3',
      avgXgAgainst: 0.84,
      avgCentralShotsAgainst: 7.5,
      avgWideShotsAgainst: 5.5,
      avgLongShotsAgainst: 2,
      avgLeftWideXgAgainst: 0.18,
      avgRightWideXgAgainst: 0.05,
      avgShapeDefenseLeft: 0.74,
      avgShapeDefenseCenter: 0.86,
      avgShapeDefenseRight: 0.72,
    });

    expect(component.formationSummaryIdentity(row)).toContain('riesgo por banda izquierda');
  });

  it('keeps central risk when wide xG side signal is too small', () => {
    const row = makeFormationSummary({
      formation: '4-2-3-1',
      avgXgAgainst: 0.95,
      avgCentralShotsAgainst: 8,
      avgWideShotsAgainst: 4,
      avgLongShotsAgainst: 2,
      avgLeftWideXgAgainst: 0.06,
      avgRightWideXgAgainst: 0.05,
      avgShapeDefenseLeft: 0.72,
      avgShapeDefenseCenter: 0.82,
      avgShapeDefenseRight: 0.70,
    });

    expect(component.formationSummaryIdentity(row)).toContain('riesgo por centro');
  });

  it('reports shared flank risk when conceded wide xG is high but balanced', () => {
    const row = makeFormationSummary({
      formation: '4-4-2',
      avgXgAgainst: 1.2,
      avgCentralShotsAgainst: 4.4,
      avgWideShotsAgainst: 13.25,
      avgLongShotsAgainst: 3.35,
      avgLeftWideXgAgainst: 0.15,
      avgRightWideXgAgainst: 0.14,
      avgShapeDefenseLeft: 0.94,
      avgShapeDefenseCenter: 0.90,
      avgShapeDefenseRight: 0.89,
    });

    expect(component.formationSummaryIdentity(row)).toContain('riesgo por bandas');
  });

  it('onResetInjuries calls the service', () => {
    harness.resetInjuries.and.returnValue(
      of({ success: true, message: 'reset' } as any)
    );
    component.onResetInjuries();
    expect(harness.resetInjuries).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.mutationInFlight()).toBeFalse();
  });

  it('onResetInjuries surfaces errors', () => {
    harness.resetInjuries.and.returnValue(throwError(() => new Error('boom')));
    component.onResetInjuries();
    expect(component.mutationInFlight()).toBeFalse();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('onReplaceFixtures calls the service and reloads the match list', () => {
    harness.replaceFixtures.and.returnValue(
      of({ success: true, message: 'ok' } as any)
    );
    component.onReplaceFixtures();
    expect(harness.replaceFixtures).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
    // The match list is reloaded via getAllFixturesWithBye
    expect(careerService.getAllFixturesWithBye).toHaveBeenCalled();
  });

  it('onReplaceFixtures clears stale selected match and replay analysis', () => {
    const userMatch = {
      ...makeMatchRow('old-match'),
      homeTeamId: 'betis',
      homeTeamName: 'Real Betis',
      awayTeamId: 'sevilla',
      awayTeamName: 'Sevilla',
      status: 'COMPLETED' as const,
    };
    component.userTeamName.set('Real Betis');
    component.rounds.set([{ round: 1, byeTeam: null, matches: [userMatch] }] as any);
    component.selectMatch(userMatch as any);
    component.positionPixelMatrixRows.set([makePositionPixelRow({})] as any);
    harness.replaceFixtures.and.returnValue(
      of({ success: true, message: 'ok' } as any)
    );

    component.onReplaceFixtures();

    expect(harness.replaceFixtures).toHaveBeenCalledWith([
      jasmine.objectContaining({
        round: 1,
        homeTeamId: 'betis',
        awayTeamId: 'sevilla',
      }),
    ]);
    expect(component.selectedMatchId()).toBeNull();
    expect(component.selectedMatch()).toBeNull();
    expect(component.positionPixelMatrixRows().length).toBe(0);
    expect(component.analysisReadyMessage()).toContain('Elegí un partido nuevo');
  });

  it('handles missing career (CareerStatus with null careerId)', async () => {
    careerService.getCareerStatus.and.returnValue(
      of({
        careerId: null,
        season: 0,
        currentRound: 0,
        totalRounds: 0,
        userTeamId: null,
        userSessionTeamId: null,
        userTeamName: null,
        hasLastMatchPlayed: false,
        nextMatchId: null,
        engineStatus: 'IDLE',
        canAdvanceRound: false,
        careerPhase: null,
        squadSize: 0,
        freePlayersCount: 0,
      })
    );
    // Re-trigger the load path
    component.reload();
    await fixture.whenStable();
    expect(component.careerId()).toBeNull();
    expect(component.rounds().length).toBe(0);
    expect(component.hasCareer()).toBeFalse();
  });

  it('surfaces getCareerStatus errors', async () => {
    careerService.getCareerStatus.and.returnValue(
      throwError(() => ({ message: 'network down' }))
    );
    component.reload();
    await fixture.whenStable();
    expect(component.loadError()).toBe('network down');
    expect(component.loading()).toBeFalse();
  });

  // ============== V24D24 F3: Panel D timeline scrubber ==============

  it('starts with selectedMinute at 0 and no snapshot loaded', () => {
    expect(component.selectedMinute()).toBe(0);
    expect(component.timelineSnapshot()).toBeNull();
    expect(component.timelineError()).toBeNull();
  });

  it('selectMatch resets the selected minute to 0', () => {
    // First select a match (effect runs, snapshot loads).
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-1',
      homeTeamName: 'Team 1',
      awayTeamId: 'team-2',
      awayTeamName: 'Team 2',
      status: 'PENDING',
      homeGoals: null,
      awayGoals: null,
      homeFormation: null,
      awayFormation: null,
    });
    component.onSliderInput({ target: { value: '45' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(45);

    // Re-select the same match → minute resets to 0.
    component.selectMatch({
      matchId: 'match-1',
      round: 1,
      homeTeamId: 'team-1',
      homeTeamName: 'Team 1',
      awayTeamId: 'team-2',
      awayTeamName: 'Team 2',
      status: 'PENDING',
      homeGoals: null,
      awayGoals: null,
      homeFormation: null,
      awayFormation: null,
    });
    expect(component.selectedMinute()).toBe(0);
  });

  it('onSliderInput updates selectedMinute when value is in range', () => {
    component.onSliderInput({ target: { value: '45' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(45);

    component.onSliderInput({ target: { value: '0' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(0);

    component.onSliderInput({ target: { value: '90' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(90);
  });

  it('onSliderInput rejects out-of-range and non-finite values', () => {
    component.selectedMinute.set(50);
    component.onSliderInput({ target: { value: '120' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(50); // unchanged

    component.onSliderInput({ target: { value: '-1' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(50);

    component.onSliderInput({ target: { value: 'abc' } } as unknown as Event);
    expect(component.selectedMinute()).toBe(50);
  });

  it('effect fetches the timeline when a match is selected', async () => {
    matchDetailApi.getMatchTimeline.calls.reset();
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    // Wait for the debounce (150ms) to elapse and the HTTP call to land.
    await new Promise((r) => setTimeout(r, 200));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(matchDetailApi.getMatchTimeline).toHaveBeenCalledWith(
      'career-1',
      'match-1',
      0
    );
    expect(component.timelineSnapshot()?.minute).toBe(0);
    expect(component.timelineLoading()).toBeFalse();
  });

  it('effect refetches the timeline when the slider moves', async () => {
    matchDetailApi.getMatchTimeline.calls.reset();
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    expect(matchDetailApi.getMatchTimeline).toHaveBeenCalledTimes(1);

    component.onSliderInput({ target: { value: '45' } } as unknown as Event);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    expect(matchDetailApi.getMatchTimeline).toHaveBeenCalledTimes(2);
    expect(matchDetailApi.getMatchTimeline.calls.mostRecent().args[2]).toBe(45);
  });

  it('effect clears the snapshot when no match is selected', async () => {
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    expect(component.timelineSnapshot()).not.toBeNull();

    // Set selectedMatchId back to null by selecting nothing (via the
    // internal signal — public API only updates via selectMatch with a row).
    // Workaround: assign via the signal directly.
    (component as unknown as { selectedMatchId: { set: (v: string | null) => void } })
      .selectedMatchId.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));

    expect(component.timelineSnapshot()).toBeNull();
    expect(component.timelineLoading()).toBeFalse();
  });

  it('effect surfaces HTTP errors on the timeline signal', async () => {
    matchDetailApi.getMatchTimeline.and.returnValue(
      throwError(() => ({ message: 'upstream down' }))
    );

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));

    expect(component.timelineError()).toBe('upstream down');
    expect(component.timelineSnapshot()).toBeNull();
    expect(component.timelineLoading()).toBeFalse();
  });

  it('effect debounces rapid slider changes (final value is 45)', async () => {
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));
    matchDetailApi.getMatchTimeline.calls.reset();

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    // The initial fetch ran — reset the spy.
    matchDetailApi.getMatchTimeline.calls.reset();

    // Fire 5 rapid slider changes. The implementation debounces 150ms
    // via setTimeout inside the effect, so the spy is called at most
    // once with the LAST value (45). The exact count of intermediate
    // calls depends on the test environment's zone scheduling.
    for (const m of [10, 20, 30, 40, 45]) {
      component.onSliderInput({ target: { value: String(m) } } as unknown as Event);
      fixture.detectChanges();
    }
    await fixture.whenStable();
    // After debounce settles, the last value wins.
    await new Promise((r) => setTimeout(r, 250));
    fixture.detectChanges();
    await fixture.whenStable();

    // At least one call happened after the rapid changes.
    expect(matchDetailApi.getMatchTimeline).toHaveBeenCalled();
    // The LAST call (which is what the debounce should leave standing)
    // has the final value 45.
    expect(matchDetailApi.getMatchTimeline.calls.mostRecent().args[2]).toBe(45);
  });

  it('exposes TIMELINE_MAX_MINUTE and TIMELINE_STEP for the template', () => {
    expect(component.TIMELINE_MAX_MINUTE).toBe(90);
    expect(component.TIMELINE_STEP).toBe(5);
  });

  it('renders the minute tick list (0,5,...,90)', () => {
    expect(component.minuteTicks.length).toBe(19); // 0,5,...,90 = 19 ticks
    expect(component.minuteTicks[0]).toBe(0);
    expect(component.minuteTicks[component.minuteTicks.length - 1]).toBe(90);
    expect(component.minuteTicks.every((m, i) => i === 0 || m - component.minuteTicks[i - 1] === 5)).toBeTrue();
  });

  it('effect handles null snapshot (404 from getMatchTimeline)', async () => {
    matchDetailApi.getMatchTimeline.and.returnValue(of(null));

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));

    expect(component.timelineSnapshot()).toBeNull();
    expect(component.timelineError()).toBeNull();
    expect(component.timelineLoading()).toBeFalse();
  });

  it('effect handles a snapshot with zero events (empty match)', async () => {
    matchDetailApi.getMatchTimeline.and.returnValue(
      of({ ...sampleSnapshot(0), events: [] })
    );

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));

    expect(component.timelineSnapshot()?.events.length).toBe(0);
    expect(component.timelineLoading()).toBeFalse();
  });

  it('effect resets the snapshot when careerId becomes null', async () => {
    // First: select match and let the effect fetch a snapshot.
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));
    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    expect(component.timelineSnapshot()).not.toBeNull();

    // Then: careerId becomes null (e.g., the user lost their session).
    (component as unknown as { careerId: { set: (v: string | null) => void } })
      .careerId.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));

    expect(component.timelineSnapshot()).toBeNull();
    expect(component.timelineError()).toBeNull();
    expect(component.timelineLoading()).toBeFalse();
  });

  it('refreshDetailAfterMutation remounts detail panel without clearing the selected match', async () => {
    const detail1 = sampleSnapshot(0);
    const detail2 = { ...sampleSnapshot(45), homeGoals: 5 };
    matchDetailApi.getMatchTimeline.and.returnValues(of(detail1), of(detail2));
    matchDetailApi.getMatchDetail.and.returnValue(of(null));

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    expect(component.timelineSnapshot()?.homeGoals).toBe(1);

    // Stub a successful formation mutation to trigger refreshDetailAfterMutation
    harness.setFormation.and.returnValue(
      of({ success: true, message: 'ok' } as any)
    );
    component.applyFormation();
    fixture.detectChanges();
    await fixture.whenStable();
    // Allow the stable remount microtask to settle.
    await new Promise((r) => setTimeout(r, 250));
    fixture.detectChanges();
    await fixture.whenStable();

    // The old implementation briefly set selectedMatchId(null). The stable
    // remount keeps Panel B/D state intact while Panel A refreshes.
    expect(component.selectedMatchId()).toBe('match-1');
    expect(component.detailPanelVisible()).toBeTrue();
    expect(component.detailRefreshToken()).toBeGreaterThan(0);
    expect(matchDetailApi.getMatchTimeline).toHaveBeenCalled();
  });

  it('ngOnDestroy clears the pending debounce timer', async () => {
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));
    matchDetailApi.getMatchTimeline.calls.reset();

    component.selectMatch(makeMatchRow('match-1'));
    // Schedule a slider change that would normally trigger a debounced fetch
    component.onSliderInput({ target: { value: '30' } } as unknown as Event);
    // IMMEDIATELY destroy the component (before the 150ms debounce fires)
    fixture.destroy();

    // Wait past the original debounce window
    await new Promise((r) => setTimeout(r, 250));

    // The service was NOT called for the destroyed component (or at most
    // once for the very first fetch that fired before destroy).
    // ngOnDestroy cancels the timer, so the slider-change fetch is dropped.
    const calls = matchDetailApi.getMatchTimeline.calls.allArgs();
    expect(calls.length).toBeLessThanOrEqual(1);
  });

  // ============== V24D24.2: Replay-with-seed + Simulate-round ==============

  it('seeds the replay input with the documented default (12345)', () => {
    expect(component.seedInputModel).toBe(12345);
  });

  it('starts with no round selected in the simulate-round dropdown', () => {
    expect(component.selectedRoundModel).toBeNull();
  });

  it('selectMatch auto-selects the match round for simulate-round', () => {
    component.selectedRoundModel = null;

    component.selectMatch(makeMatchRow('match-1'));

    expect(component.selectedRoundModel as number | null).toBe(1);
  });

  it('onSeedChange coerces numeric input and rejects non-finite', () => {
    component.onSeedChange(42);
    expect(component.seedInputModel).toBe(42);

    component.onSeedChange('99');
    expect(component.seedInputModel).toBe(99);

    component.onSeedChange('not-a-number');
    expect(component.seedInputModel).toBeNull();

    component.onSeedChange('');
    expect(component.seedInputModel).toBeNull();

    component.onSeedChange(null);
    expect(component.seedInputModel).toBeNull();
  });

  it('onRoundSelect updates the selected round', () => {
    component.onRoundSelect(3);
    expect(component.selectedRoundModel).toBe(3);

    component.onRoundSelect(null);
    expect(component.selectedRoundModel).toBeNull();

    component.onRoundSelect('7' as unknown as number);
    // Non-number input is rejected (the dropdown only emits numbers).
    expect(component.selectedRoundModel).toBeNull();
  });

  it('onReplayWithSeed calls the service with the typed seed', () => {
    component.selectMatch(makeMatchRow('match-1'));
    component.seedInputModel = 999;
    harness.replayMatch.and.returnValue(
      of({
        matchId: 'match-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        status: 'COMPLETED',
        result: { homeGoals: 3, awayGoals: 0 },
      })
    );

    component.onReplayWithSeed();

    expect(harness.replayMatch).toHaveBeenCalledWith('match-1', 999);
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.mutationInFlight()).toBeFalse();
  });

  it('onReplayWithSeed sends seed=null when the input is cleared', () => {
    component.selectMatch(makeMatchRow('match-1'));
    component.seedInputModel = null;
    harness.replayMatch.and.returnValue(
      of({
        matchId: 'match-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        status: 'COMPLETED',
        result: { homeGoals: 0, awayGoals: 0 },
      })
    );

    component.onReplayWithSeed();

    expect(harness.replayMatch).toHaveBeenCalledWith('match-1', null);
  });

  it('onReplayWithSeed refuses to fire when no match is selected', () => {
    component.selectedMatchId.set(null);
    component.onReplayWithSeed();

    expect(harness.replayMatch).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('onReplayWithSeed surfaces errors via the snackbar', () => {
    component.selectMatch(makeMatchRow('match-1'));
    harness.replayMatch.and.returnValue(throwError(() => new Error('boom')));
    component.onReplayWithSeed();

    expect(component.mutationInFlight()).toBeFalse();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('onReplayWithSeed reloads the match list after a successful replay', () => {
    component.selectMatch(makeMatchRow('match-1'));
    harness.replayMatch.and.returnValue(
      of({
        matchId: 'match-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        status: 'COMPLETED',
        result: { homeGoals: 2, awayGoals: 1 },
      })
    );
    careerService.getAllFixturesWithBye.calls.reset();
    careerService.getAllFixturesWithBye.and.returnValue(
      of({ rounds: [] })
    );

    component.onReplayWithSeed();

    expect(careerService.getAllFixturesWithBye).toHaveBeenCalled();
  });

  // ============== V24D24.2-F2.5: Bug #1 + Bug #2 regression tests ==============

  it('F2.5: Panel C surfaces backend team names when hydrated (BUG_FIXTURES_TEAM_NAMES_UUID)', async () => {
    // Backend hydrates team names on /fixtures/round-with-bye (MatchInfo
    // record). The UI must display those names instead of the teamId
    // (UUID-style) it was falling back to before F2.5.
    careerService.getAllFixturesWithBye.and.returnValue(
      of({
        rounds: [
          {
            round: 1,
            byeTeam: null,
            matches: [
              {
                matchId: 'match-1',
                homeTeamId: 'team-uuid-home',
                homeTeamName: 'Boca Juniors',
                awayTeamId: 'team-uuid-away',
                awayTeamName: 'River Plate',
                round: 1,
                status: 'PENDING',
                homeGoals: null,
                awayGoals: null,
                roundId: 'round-uuid-1',
              },
            ],
          },
        ],
      })
    );

    component.reload();
    await fixture.whenStable();

    const row = component.rounds()[0].matches[0];
    expect(row.homeTeamName).toBe('Boca Juniors');
    expect(row.awayTeamName).toBe('River Plate');
    // The teamId stays available for the simulate-round payload.
    expect(row.homeTeamId).toBe('team-uuid-home');
    expect(row.awayTeamId).toBe('team-uuid-away');
  });

  it('F2.5: Panel C falls back to teamId when backend omits team names (legacy endpoint)', async () => {
    // Defensive fallback: if a future endpoint forgets to hydrate the
    // names (or a legacy career pre-dates the roll-out), we still
    // render the teamId so the row is not blank.
    careerService.getAllFixturesWithBye.and.returnValue(
      of({
        rounds: [
          {
            round: 1,
            byeTeam: null,
            matches: [
              {
                matchId: 'match-1',
                homeTeamId: 'team-uuid-home',
                awayTeamId: 'team-uuid-away',
                round: 1,
                status: 'PENDING',
                homeGoals: null,
                awayGoals: null,
                roundId: 'round-uuid-1',
              },
            ],
          },
        ],
      })
    );

    component.reload();
    await fixture.whenStable();

    const row = component.rounds()[0].matches[0];
    expect(row.homeTeamName).toBe('team-uuid-home');
    expect(row.awayTeamName).toBe('team-uuid-away');
  });

  it('F2.5: onReplayWithSeed remounts detail without clearing the selected match (BUG_REPLAY_NO_REFRESH_UI)', async () => {
    // The replay handler must trigger refreshDetailAfterMutation() in the
    // success callback. Current implementation remounts only Panel A and keeps
    // selectedMatchId stable, avoiding the old null-and-reset flicker.
    matchDetailApi.getMatchTimeline.calls.reset();
    matchDetailApi.getMatchTimeline.and.returnValue(of(sampleSnapshot(0)));
    matchDetailApi.getMatchDetail.and.returnValue(of(null));

    component.selectMatch(makeMatchRow('match-1'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 200));
    const callsAfterSelect = matchDetailApi.getMatchTimeline.calls.allArgs().length;
    expect(callsAfterSelect).toBeGreaterThanOrEqual(1);

    // Stub a successful replay.
    harness.replayMatch.and.returnValue(
      of({
        matchId: 'match-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        status: 'COMPLETED',
        result: { homeGoals: 4, awayGoals: 2 },
      })
    );

    component.onReplayWithSeed();
    fixture.detectChanges();
    await fixture.whenStable();
    // Allow the stable remount microtask to settle.
    await new Promise((r) => setTimeout(r, 250));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedMatchId()).toBe('match-1');
    expect(component.detailPanelVisible()).toBeTrue();
    expect(component.detailRefreshToken()).toBeGreaterThan(0);
    expect(matchDetailApi.getMatchTimeline.calls.allArgs().length).toBeGreaterThanOrEqual(callsAfterSelect);
  });

  it('onSimulateRound calls the service with the roundId + matches of the selected round', () => {
    component.selectedRoundModel = 1;
    harness.simulateRound.and.returnValue(
      of({ roundId: 'round-uuid-1', status: 'IN_PROGRESS' } as any)
    );

    component.onSimulateRound();

    expect(harness.simulateRound).toHaveBeenCalledWith(
      'round-uuid-1',
      [
        {
          matchId: 'match-1',
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
        },
      ]
    );
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.mutationInFlight()).toBeFalse();
  });

  it('onSimulateRound refuses to fire when no round is selected', () => {
    component.selectedRoundModel = null;
    component.onSimulateRound();

    expect(harness.simulateRound).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('onSimulateRound surfaces errors via the snackbar', () => {
    component.selectedRoundModel = 1;
    harness.simulateRound.and.returnValue(throwError(() => new Error('boom')));
    component.onSimulateRound();

    expect(component.mutationInFlight()).toBeFalse();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('onSimulateRound surfaces a friendly error when a round has no roundId hydrated', () => {
    // Override the default fixture to strip roundId.
    careerService.getAllFixturesWithBye.and.returnValue(
      of({
        rounds: [
          {
            round: 1,
            byeTeam: null,
            matches: [
              {
                matchId: 'match-1',
                homeTeamId: 'team-1',
                awayTeamId: 'team-2',
                round: 1,
                status: 'PENDING',
                homeGoals: null,
                awayGoals: null,
                // roundId intentionally omitted (legacy backend)
              },
            ],
          },
        ],
      })
    );
    component.reload();
    component.selectedRoundModel = 1;

    component.onSimulateRound();

    expect(harness.simulateRound).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('does not label a defensive action as Cuidar when total xGA gets clearly worse', () => {
    const cards = (component as any).buildScenarioDecisionCards([
      makeScenarioSummaryRow({
        scenario: 'base-noop',
        actionType: 'NONE',
        actionDetail: 'noop',
      }),
      makeScenarioSummaryRow({
        scenario: 'm45-shape-defensive-step',
        actionType: 'STYLE',
        actionDetail: 'Paso defensivo',
        avgUserXgDelta: -0.38,
        avgOpponentXgDelta: 0.11,
        avgOpponentCentralXgDelta: -0.11,
        avgOpponentWideXgDelta: 0.02,
        avgOpponentLeftWideXgDelta: 0.02,
        avgOpponentRightWideXgDelta: 0.01,
      }),
    ]) as Array<{ title: string; label: string }>;

    expect(cards.some((card) => card.title === 'Cuidar' && card.label === 'Paso defensivo')).toBeFalse();
    expect(cards.some((card) => card.title === 'Evitar' && card.label === 'Paso defensivo')).toBeTrue();
  });

  it('copies a professional Markdown report for the player swap battery', async () => {
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    component.selectMatch({
      ...makeMatchRow('match-1'),
      homeTeamName: 'Real Betis',
      awayTeamName: 'Real Madrid',
    });
    component.playerSwapBatteryPrecisionModel = 'balanced';
    component.playerSwapBatteryModeModel = 'natural';
    component.playerSwapBatterySummaries.set([
      makePlayerSwapSummary({
        baselinePlayer: 'Jude Bellingham',
        swapPlayer: 'Endrick',
        swapRead: 'Clear upgrade',
        swapFit: 'Same profile',
        deltaShotsFor: 2.25,
        deltaShotsAgainst: 0.5,
        deltaXgFor: 0.18,
        deltaXgAgainst: 0.03,
        deltaXgDiff: 0.15,
        preAutoSubDeltaXgDiff: 0.11,
        signalRead: 'Alta 0.150',
        tacticalAttackRead: 'Ataque +',
        tacticalCentralControlRead: 'Control =',
        tacticalProtectionRead: 'Proteccion =',
        tacticalChannelsRead: 'Canales =',
      }),
      makePlayerSwapSummary({
        baselinePlayer: 'Federico Valverde',
        swapPlayer: 'Luka Modric',
        swapRead: 'Clear downgrade',
        swapFit: 'Same profile',
        deltaShotsFor: -1.5,
        deltaShotsAgainst: 1.25,
        deltaXgFor: -0.08,
        deltaXgAgainst: 0.06,
        deltaXgDiff: -0.14,
        preAutoSubDeltaXgDiff: -0.09,
      }),
    ] as any);

    component.copyPlayerSwapBatteryReport();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalled();
    const report = writeText.calls.mostRecent().args[0] as string;
    expect(report).toContain('# Player Swap Battery Report');
    expect(report).toContain('Match: Real Betis vs Real Madrid');
    expect(report).toContain('Mode: natural');
    expect(report).toContain('Precision: balanced');
    expect(report).toContain('Confidence: Medium confidence');
    expect(report).toContain('Seeds: 12345..12354');
    expect(report).toContain('Best: Jude Bellingham -> Endrick');
    expect(report).toContain('Worst: Federico Valverde -> Luka Modric');
    expect(report).toContain('Reads: 1 Clear upgrade · 1 Clear downgrade');
    expect(report).toContain('Fit: 2 Same profile');
    expect(report).toContain('Coach read: Lectura balanceada');
    expect(report).toContain('| Swap | OVR | Fit | Read |');
    expect(report).toContain('| Ataque | Control | Proteccion | Canales | Shots | Shots Ag. | xG For | xG Ag. | xG Diff | Pre xG Diff |');
    expect(report).toContain('| Jude Bellingham -> Endrick | — | Same profile | Clear upgrade | Alta 0.150 | Ataque + | Control = | Proteccion = | Canales = | +2.25 | +0.50 | +0.18 | +0.03 | +0.15 | +0.11 |');
    expect(report).toContain('## Tactical breakdown detail');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Player swap battery report copied.', 'OK', { duration: 2500 });
  });

  it('keeps soft repeated 5px risks as playable variation instead of a review pattern', () => {
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({ label: 'R1 ? 5px forward', signalScore: 0.04 }),
      makePositionPixelRow({ label: 'R1 ? 5px deeper', signalScore: 0.04 }),
      makePositionPixelRow({ label: 'R1 ? 5px wide', signalScore: 0.04 }),
    ] as any);

    const [summary] = component.positionPixelMatchSmokeSummary();
    const noCliffRow = component.professionalQaChecklistRows()
      .find((row) => row.check === 'Pixel no-cliff rule');

    expect(summary.verdict).toBe('Playable variation');
    expect(noCliffRow?.verdict).toBe('OK');
    expect(noCliffRow?.observed).toContain('0 match repeated 5px bias');
    expect(noCliffRow?.observed).toContain('0 visible 5px pattern(s)');
  });

  it('separates position pixel threat, connection and coverage reads', () => {
    const attackingWideMove = makePositionPixelRow({
      deltaXgFor: 0.08,
      deltaShotsFor: 1.2,
      deltaWideXgFor: 0.06,
      deltaWideShotsFor: 1.1,
      deltaRightWideXgFor: 0.05,
      deltaPossessionFor: -1.0,
      deltaCentralXgFor: -0.03,
      deltaCentralShotsFor: -0.8,
      deltaXgAgainst: 0.09,
      deltaShotsAgainst: 1.4,
      deltaWideXgAgainst: 0.06,
      deltaWideShotsAgainst: 1.2,
    });
    const controlMove = makePositionPixelRow({
      deltaPossessionFor: 3.2,
      deltaCentralXgFor: 0.05,
      deltaCentralShotsFor: 1.0,
      deltaXgAgainst: -0.06,
      deltaShotsAgainst: -1.1,
      deltaWideXgAgainst: -0.04,
      deltaWideShotsAgainst: -0.8,
    });

    expect(component.positionPixelChannelBreakdownRead(attackingWideMove as any)).toBe('Amenaza + · Conex. - · Cobertura -');
    expect(component.positionPixelChannelBreakdownClass(attackingWideMove as any)).toBe('read-strong');
    expect(component.positionPixelChannelBreakdownDetail(attackingWideMove as any)).toContain('amenaza');
    expect(component.positionPixelChannelBreakdownRead(controlMove as any)).toBe('Amenaza = · Conex. + · Cobertura +');
    expect(component.positionPixelChannelBreakdownClass(controlMove as any)).toBe('read-visible');
  });

  it('marks attacker drops as contextual coverage tradeoffs when defensive risk rises', () => {
    const attackerDropWithRisk = makePositionPixelRow({
      playerPosition: 'ATT',
      fromYPercent: 12,
      targetYPercent: 38,
      deltaXgFor: -0.03,
      deltaShotsFor: -0.4,
      deltaPossessionFor: 2.0,
      deltaCentralXgFor: 0.04,
      deltaCentralShotsFor: 0.8,
      deltaXgAgainst: 0.10,
      deltaShotsAgainst: -2.0,
      deltaWideXgAgainst: -0.08,
      deltaWideShotsAgainst: -1.5,
      deltaCentralXgAgainst: -0.04,
      deltaCentralShotsAgainst: -1.0,
    });

    expect(component.positionPixelChannelBreakdownRead(attackerDropWithRisk as any)).toContain('Cobertura ctx +');
    expect(component.positionPixelChannelBreakdownDetail(attackerDropWithRisk as any)).toContain('cobertura contextual');
    expect(component.positionPixelVisualExpectationRead(attackerDropWithRisk as any)).toBe('Visual OK');
    expect(component.positionPixelVisualExpectationDetail(attackerDropWithRisk as any)).toContain('Cobertura ctx +');
    expect(component.positionPixelVisualEngineTensionRead(attackerDropWithRisk as any)).toBe('Tradeoff');
    expect(component.positionPixelVisualEngineTensionDetail(attackerDropWithRisk as any)).toContain('no asumir cobertura real');
    expect(component.positionPixelCoachRead(attackerDropWithRisk as any)).toContain('Baja un delantero');
  });

  it('flags visual expectation mismatches for position pixels', () => {
    const attackerUpWithoutThreat = makePositionPixelRow({
      playerPosition: 'ATT',
      fromYPercent: 22,
      targetYPercent: 17,
      deltaXgFor: 0,
      deltaShotsFor: 0,
      deltaWideXgFor: 0,
      deltaWideShotsFor: 0,
      deltaXgAgainst: -0.04,
      deltaShotsAgainst: -0.7,
    });
    const defenderDownWithCoverage = makePositionPixelRow({
      playerPosition: 'DEF',
      fromYPercent: 78,
      targetYPercent: 83,
      deltaXgAgainst: -0.06,
      deltaShotsAgainst: -1.1,
      deltaWideXgAgainst: -0.03,
      deltaWideShotsAgainst: -0.7,
    });
    const attackerUpWithCentralDanger = makePositionPixelRow({
      playerPosition: 'ATT',
      fromYPercent: 22,
      targetYPercent: 17,
      deltaXgFor: 0,
      deltaShotsFor: -0.3,
      deltaCentralXgFor: 0.015,
    });
    const attackerDropWithConnection = makePositionPixelRow({
      playerPosition: 'ATT',
      fromYPercent: 18,
      targetYPercent: 23,
      deltaXgFor: 0.059,
      deltaShotsFor: -0.3,
      deltaCentralXgFor: 0.044,
      deltaWideXgFor: 0.004,
      deltaPossessionFor: -0.1,
      deltaXgAgainst: -0.042,
      deltaShotsAgainst: 0.2,
      signalScore: 0.101,
    });
    const microWideWithSmallBandSignal = makePositionPixelRow({
      playerPosition: 'ATT',
      fromXPercent: 39,
      targetXPercent: 34,
      fromYPercent: 17,
      targetYPercent: 17,
      deltaWideXgFor: -0.006,
      deltaWideShotsFor: -0.1,
    });
    const wideWithoutBandSignal = makePositionPixelRow({
      playerPosition: 'ATT',
      fromXPercent: 39,
      targetXPercent: 30,
      fromYPercent: 17,
      targetYPercent: 17,
      deltaWideXgFor: 0,
      deltaWideShotsFor: 0,
      deltaWideXgAgainst: 0,
      deltaWideShotsAgainst: 0,
    });

    expect(component.positionPixelVisualExpectationRead(attackerUpWithoutThreat as any)).toBe('Visual mismatch');
    expect(component.positionPixelVisualExpectationClass(attackerUpWithoutThreat as any)).toBe('read-check');
    expect(component.positionPixelVisualExpectationDetail(attackerUpWithoutThreat as any)).toContain('ATT sube');
    expect(component.positionPixelVisualExpectationRead(defenderDownWithCoverage as any)).toBe('Visual OK');
    expect(component.positionPixelVisualExpectationClass(defenderDownWithCoverage as any)).toBe('read-stable');
    expect(component.positionPixelVisualExpectationRead(attackerUpWithCentralDanger as any)).toBe('Visual OK');
    expect(component.positionPixelVisualExpectationRead(attackerDropWithConnection as any)).toBe('Visual OK');
    expect(component.positionPixelVisualExpectationRead(microWideWithSmallBandSignal as any)).toBe('Visual OK');
    expect(component.positionPixelVisualExpectationRead(wideWithoutBandSignal as any)).toBe('Visual micro');
  });

  it('flags visual engine tension when threat rises but attack output drops', () => {
    const threatUpAttackLoss = makePositionPixelRow({
      deltaXgFor: -0.05,
      deltaShotsFor: -1.0,
      deltaWideXgFor: 0.12,
      deltaWideShotsFor: 2.4,
      deltaRightWideXgFor: 0.10,
    });
    const coherentAttackGain = makePositionPixelRow({
      deltaXgFor: 0.08,
      deltaShotsFor: 1.4,
      deltaWideXgFor: 0.04,
      deltaWideShotsFor: 0.9,
    });

    expect(component.positionPixelVisualEngineTensionRead(threatUpAttackLoss as any)).toBe('Contradicción');
    expect(component.positionPixelVisualEngineTensionClass(threatUpAttackLoss as any)).toBe('read-check');
    expect(component.positionPixelVisualEngineTensionDetail(threatUpAttackLoss as any)).toContain('amenaza visual sube');
    expect(component.positionPixelVisualEngineTensionRead(coherentAttackGain as any)).toBe('Coherente');
  });

  it('labels soft visual engine tension as a tactical tradeoff', () => {
    const connectionUpButRisky = makePositionPixelRow({
      playerPosition: 'WINGER',
      fromXPercent: 18,
      fromYPercent: 18,
      targetXPercent: 23,
      targetYPercent: 23,
      deltaXgFor: 0.02,
      deltaShotsFor: -0.8,
      deltaCentralXgFor: 0.044,
      deltaCentralShotsFor: 0.1,
      deltaPossessionFor: -0.6,
      deltaXgAgainst: 0.017,
      deltaShotsAgainst: 0.9,
      deltaWideXgAgainst: 0.032,
      deltaWideShotsAgainst: 0.6,
    });

    expect(component.positionPixelVisualExpectationRead(connectionUpButRisky as any)).toBe('Visual OK');
    expect(component.positionPixelVisualEngineTensionRead(connectionUpButRisky as any)).toBe('Tradeoff');
    expect(component.positionPixelVisualEngineTensionDetail(connectionUpButRisky as any)).toContain('balance del motor cae');
  });

  it('reads defender steps as attacking tradeoffs when defensive risk rises', () => {
    const defenderStepWithRisk = makePositionPixelRow({
      playerPosition: 'DEF',
      fromYPercent: 83,
      targetYPercent: 57,
      deltaXgFor: 0.08,
      deltaShotsFor: 1.2,
      deltaWideXgFor: 0.03,
      deltaWideShotsFor: 0.8,
      deltaPossessionFor: 1.2,
      deltaXgAgainst: 0.08,
      deltaShotsAgainst: 1.1,
      deltaWideXgAgainst: 0.04,
      deltaWideShotsAgainst: 0.7,
    });

    expect(component.positionPixelVisualEngineTensionRead(defenderStepWithRisk as any)).toBe('Coherente');
    expect(component.positionPixelVisualExpectationRead(defenderStepWithRisk as any)).toBe('Visual OK');
    expect(component.positionPixelTacticalRead(defenderStepWithRisk as any)).toContain('Tradeoff');
    expect(component.positionPixelCoachRead(defenderStepWithRisk as any)).toContain('Sube un defensor');
    expect(component.positionPixelCoachRead(defenderStepWithRisk as any)).toContain('tradeoff de riesgo');
  });

  it('explains large DEF to MID moves as strong defensive-line breaks', () => {
    const defenderBigStepWithoutGain = makePositionPixelRow({
      playerPosition: 'DEF',
      fromYPercent: 83,
      targetYPercent: 65,
      deltaXgFor: -0.12,
      deltaShotsFor: -1.6,
      deltaXgAgainst: 0.18,
      deltaShotsAgainst: 2.5,
      deltaPossessionFor: -1.7,
    });

    expect(component.positionPixelTacticalRead(defenderBigStepWithoutGain as any)).toContain('Bad tradeoff');
    expect(component.positionPixelCoachRead(defenderBigStepWithoutGain as any)).toContain('DEF->MID grande');
    expect(component.positionPixelCoachRead(defenderBigStepWithoutGain as any)).toContain('rompe la línea defensiva');
  });

  it('does not over-flag diagonal defender moves that are tactical tradeoffs', () => {
    const defenderWideUpWithCoverage = makePositionPixelRow({
      playerPosition: 'DEF',
      fromXPercent: 16.65,
      fromYPercent: 83,
      targetXPercent: 11.65,
      targetYPercent: 78,
      deltaXgAgainst: -0.056,
      deltaShotsAgainst: -0.4,
      deltaWideXgAgainst: -0.010,
      deltaWideShotsAgainst: -0.2,
      deltaCentralXgFor: -0.013,
    });
    const defenderWideDownBadTradeoff = makePositionPixelRow({
      playerPosition: 'DEF',
      fromXPercent: 16.65,
      fromYPercent: 83,
      targetXPercent: 11.65,
      targetYPercent: 88,
      deltaXgFor: -0.034,
      deltaXgAgainst: 0.059,
      deltaShotsFor: -0.7,
      deltaShotsAgainst: 0.9,
      deltaCentralXgFor: -0.038,
      deltaCentralShotsFor: -0.6,
      deltaWideXgAgainst: 0.012,
    });

    expect(component.positionPixelVisualExpectationRead(defenderWideUpWithCoverage as any)).toBe('Visual OK');
    expect(component.positionPixelCoachRead(defenderWideUpWithCoverage as any)).toContain('Mejora protección');
    expect(component.positionPixelVisualExpectationRead(defenderWideDownBadTradeoff as any)).toBe('Visual OK');
    expect(component.positionPixelTacticalRead(defenderWideDownBadTradeoff as any)).toContain('Bad tradeoff');
  });

  it('prioritizes wide and inside movement tradeoffs when flank risk also rises', () => {
    const wideTradeoff = makePositionPixelRow({
      playerPosition: 'MID',
      fromXPercent: 50,
      targetXPercent: 82,
      fromYPercent: 50,
      targetYPercent: 50,
      deltaXgFor: 0.08,
      deltaShotsFor: 1.1,
      deltaWideXgFor: 0.06,
      deltaWideShotsFor: 1.0,
      deltaRightWideXgFor: 0.05,
      deltaXgAgainst: 0.08,
      deltaShotsAgainst: 1.0,
      deltaWideXgAgainst: 0.06,
      deltaWideShotsAgainst: 1.0,
      deltaRightWideXgAgainst: 0.05,
    });
    const insideTradeoff = makePositionPixelRow({
      playerPosition: 'MID',
      fromXPercent: 82,
      targetXPercent: 50,
      fromYPercent: 50,
      targetYPercent: 50,
      deltaXgFor: 0.07,
      deltaShotsFor: 0.9,
      deltaPossessionFor: 2.0,
      deltaCentralXgFor: 0.04,
      deltaCentralShotsFor: 0.8,
      deltaXgAgainst: 0.08,
      deltaShotsAgainst: 1.0,
      deltaWideXgAgainst: 0.06,
      deltaWideShotsAgainst: 1.0,
      deltaRightWideXgAgainst: 0.05,
    });

    expect(component.positionPixelCoachRead(wideTradeoff as any)).toContain('tradeoff de amplitud');
    expect(component.positionPixelCoachRead(wideTradeoff as any)).toContain('rival tambien encuentra ese costado');
    expect(component.positionPixelCoachRead(insideTradeoff as any)).toContain('tradeoff interior/exterior');
    expect(component.positionPixelCoachRead(insideTradeoff as any)).toContain('libera la banda');
  });

  it('reads diagonal lateral plus vertical moves as explicit tactical tradeoffs', () => {
    const wideUp = makePositionPixelRow({
      playerPosition: 'MID',
      fromXPercent: 50,
      targetXPercent: 82,
      fromYPercent: 58,
      targetYPercent: 44,
      deltaXgFor: 0.08,
      deltaShotsFor: 1.1,
      deltaWideXgFor: 0.05,
      deltaWideShotsFor: 1.0,
      deltaXgAgainst: 0.07,
      deltaShotsAgainst: 1.0,
      deltaWideXgAgainst: 0.05,
      deltaWideShotsAgainst: 0.7,
    });
    const insideDown = makePositionPixelRow({
      playerPosition: 'MID',
      fromXPercent: 82,
      targetXPercent: 50,
      fromYPercent: 48,
      targetYPercent: 62,
      deltaXgFor: -0.05,
      deltaShotsFor: -0.9,
      deltaWideXgFor: -0.04,
      deltaWideShotsFor: -0.8,
      deltaXgAgainst: -0.08,
      deltaShotsAgainst: -1.0,
      deltaWideXgAgainst: -0.05,
      deltaWideShotsAgainst: -0.8,
    });

    expect(component.positionPixelCoachRead(wideUp as any)).toContain('Diagonal abierta alta');
    expect(component.positionPixelCoachRead(wideUp as any)).toContain('tradeoff banda-altura');
    expect(component.positionPixelCoachRead(insideDown as any)).toContain('Diagonal interior baja');
    expect(component.positionPixelCoachRead(insideDown as any)).toContain('reduce amplitud');
  });

  it('summarizes visual engine tension rows for position pixels', () => {
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({
        deltaXgFor: -0.05,
        deltaShotsFor: -1.0,
        deltaWideXgFor: 0.12,
        deltaWideShotsFor: 2.4,
        deltaRightWideXgFor: 0.10,
      }),
      makePositionPixelRow({
        deltaXgFor: 0.08,
        deltaShotsFor: 1.4,
        deltaWideXgFor: 0.04,
        deltaWideShotsFor: 0.9,
      }),
    ] as any);

    const summary = component.positionPixelVisualEngineTensionSummary();
    expect(summary.find((item) => item.label === 'Contradicción')?.count).toBe(1);
    expect(summary.find((item) => item.label === 'Coherente')?.count).toBe(1);
    expect(summary.find((item) => item.label === 'Tradeoff')?.count).toBe(0);
  });

  it('builds manual extreme position hunt candidates and meaningful presets', () => {
    const lineup = { ...sampleLineup('4-4-2'), slots: [] };
    const candidates = (component as any).pickManualExtremeCandidates(lineup);
    const lines = candidates.map((candidate: any) => candidate.starterPosition);

    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(lines).toContain('DEF');
    expect(lines).toContain('MID');
    expect(lines).toContain('ATT');

    const attackerPresets = (component as any).manualExtremeMovementPresets(55, 18, {
      starterId: 'p10',
      starterName: 'Attacker',
      starterPosition: 'ATT',
      slotId: 'S03-2',
    });

    expect(attackerPresets.map((preset: any) => preset.label)).toContain('ATT drop link');
    expect(attackerPresets.every((preset: any) => Math.abs(preset.dx) + Math.abs(preset.dy) >= 6)).toBeTrue();
  });

  it('includes diagonal 5px presets in the same-seed position movement smoke', () => {
    const presets = (component as any).positionMovementPresets(50, 52);
    const labels = presets.map((preset: any) => preset.label);

    expect(labels).toContain('5px wide forward');
    expect(labels).toContain('5px wide deeper');
    expect(labels).toContain('5px center forward');
    expect(labels).toContain('5px center deeper');

    const diagonal = presets.find((preset: any) => preset.label === '5px wide forward');
    expect(Math.abs(diagonal.dx)).toBe(5);
    expect(Math.abs(diagonal.dy)).toBe(5);
  });

  it('labels same-zone diagonal position pixels as diagonals in shape read', () => {
    const wideForward = makePositionPixelRow({
      playerPosition: 'MID',
      fromXPercent: 45,
      fromYPercent: 50,
      targetXPercent: 40,
      targetYPercent: 45,
    });
    const insideDeeper = makePositionPixelRow({
      playerPosition: 'MID',
      fromXPercent: 38,
      fromYPercent: 50,
      targetXPercent: 43,
      targetYPercent: 55,
    });

    expect(component.positionPixelShapeMove(wideForward as any)).toContain('diagonal abierto alto');
    expect(component.positionPixelShapeMoveDetail(wideForward as any)).toContain('diagonal');
    expect(component.positionPixelShapeMove(insideDeeper as any)).toContain('diagonal interior bajo');
  });

  it('summarizes diagonal position pixels with best worst and review counters', () => {
    const goodDiagonal = makePositionPixelRow({
      label: 'R1 ? 5px center deeper',
      playerName: 'Good Mid',
      fromXPercent: 38,
      fromYPercent: 50,
      targetXPercent: 43,
      targetYPercent: 55,
      deltaXgFor: 0.01,
      deltaXgAgainst: -0.08,
      deltaShotsFor: -0.1,
      deltaShotsAgainst: -1.0,
      deltaPossessionFor: 0.4,
    });
    const riskyDiagonal = makePositionPixelRow({
      label: 'R1 ? 5px center forward',
      playerName: 'Risk Def',
      playerPosition: 'DEF',
      fromXPercent: 18,
      fromYPercent: 83,
      targetXPercent: 23,
      targetYPercent: 78,
      deltaXgFor: 0,
      deltaXgAgainst: 0.09,
      deltaShotsFor: -0.2,
      deltaShotsAgainst: 1.1,
      deltaWideXgAgainst: 0.04,
      deltaWideShotsAgainst: 0.8,
    });
    const mismatchDiagonal = makePositionPixelRow({
      label: 'R1 ? 5px wide forward',
      playerName: 'Mismatch Att',
      playerPosition: 'ATT',
      fromXPercent: 50,
      fromYPercent: 12,
      targetXPercent: 55,
      targetYPercent: 7,
      deltaXgFor: 0,
      deltaShotsFor: 0,
      deltaCentralShotsFor: 0,
      deltaWideShotsFor: 0,
      signalScore: 0.16,
    });
    const straightMove = makePositionPixelRow({
      label: 'R1 ? 5px forward',
      fromXPercent: 50,
      fromYPercent: 50,
      targetXPercent: 50,
      targetYPercent: 45,
    });

    component.positionPixelMatrixRows.set([goodDiagonal, riskyDiagonal, mismatchDiagonal, straightMove] as any);

    const summary = component.positionPixelDiagonalSummary();
    expect(summary?.total).toBe(3);
    expect(summary?.risk).toBe(2);
    expect(summary?.defenseGain).toBe(1);
    expect(summary?.best?.playerName).toBe('Good Mid');
    expect(summary?.worst?.playerName).toBe('Risk Def');
    expect(summary?.worstVisualMismatch?.playerName).toBe('Mismatch Att');
    expect(summary?.worstVisualReview?.playerName).toBe('Mismatch Att');
    expect(component.positionPixelDiagonalSummaryRowText(summary?.best ?? null)).toContain('Good Mid');
  });

  it('filters displayed position rows to diagonals only', () => {
    const diagonal = makePositionPixelRow({
      label: 'R1 ? 5px wide forward',
      fromXPercent: 50,
      fromYPercent: 50,
      targetXPercent: 55,
      targetYPercent: 45,
    });
    const straight = makePositionPixelRow({
      label: 'R1 ? 5px forward',
      fromXPercent: 50,
      fromYPercent: 50,
      targetXPercent: 50,
      targetYPercent: 45,
    });

    component.positionPixelMatrixRows.set([diagonal, straight] as any);
    component.setPositionPixelReadFilter('diagonal');

    expect(component.displayedPositionPixelMatrixRows().length).toBe(1);
    expect(component.displayedPositionPixelMatrixRows()[0].label).toContain('wide forward');

    component.setPositionPixelReadFilter('not-real');
    expect(component.positionPixelReadFilter()).toBe('all');
  });

  it('filters displayed position rows by visual mismatch and visual review', () => {
    const visualMismatch = makePositionPixelRow({
      label: 'R1 ? 5px center forward',
      playerName: 'Mismatch Att',
      playerPosition: 'ATT',
      fromXPercent: 50,
      fromYPercent: 18,
      targetXPercent: 50,
      targetYPercent: 14,
      deltaXgFor: 0,
      deltaShotsFor: 0,
      deltaCentralShotsFor: 0,
      deltaWideShotsFor: 0,
      signalScore: 0.08,
    });
    const visualReview = makePositionPixelRow({
      label: 'R1 ? big zone cross',
      playerName: 'Review Mid',
      fromXPercent: 80,
      fromYPercent: 80,
      targetXPercent: 75,
      targetYPercent: 75,
      deltaXgFor: -0.08,
      deltaShotsFor: -1.2,
      deltaWideXgFor: 0.12,
      deltaWideShotsFor: 2.4,
      deltaRightWideXgFor: 0.10,
    });
    const coherent = makePositionPixelRow({
      label: 'R1 ? 5px forward',
      playerName: 'Coherent',
      fromXPercent: 50,
      fromYPercent: 50,
      targetXPercent: 50,
      targetYPercent: 50,
    });
    const lineBreak = makePositionPixelRow({
      label: 'R2 ? big zone cross',
      playerName: 'Line Break Def',
      playerPosition: 'DEF',
      fromXPercent: 16.65,
      fromYPercent: 83,
      targetXPercent: 16.65,
      targetYPercent: 65,
    });

    component.positionPixelMatrixRows.set([visualMismatch, visualReview, coherent, lineBreak] as any);

    component.setPositionPixelReadFilter('visual-mismatch');
    expect(component.displayedPositionPixelMatrixRows().map((row) => row.playerName)).toContain('Mismatch Att');
    expect(component.displayedPositionPixelMatrixRows().every((row) => component.positionPixelVisualExpectationRead(row as any) === 'Visual mismatch')).toBeTrue();

    component.setPositionPixelReadFilter('visual-review');
    expect(component.displayedPositionPixelMatrixRows().map((row) => row.playerName)).toContain('Review Mid');
    expect(component.displayedPositionPixelMatrixRows().every((row) => component.positionPixelVisualEngineTensionRead(row as any) !== 'Coherente')).toBeTrue();

    component.setPositionPixelReadFilter('diagonal-mismatch');
    expect(component.displayedPositionPixelMatrixRows().every((row) =>
      (component as any).positionPixelIsDiagonalMove(row as any)
        && component.positionPixelVisualExpectationRead(row as any) === 'Visual mismatch'
    )).toBeTrue();

    component.setPositionPixelReadFilter('diagonal-review');
    expect(component.displayedPositionPixelMatrixRows().every((row) =>
      (component as any).positionPixelIsDiagonalMove(row as any)
        && component.positionPixelVisualEngineTensionRead(row as any) !== 'Coherente'
    )).toBeTrue();

    component.setPositionPixelReadFilter('big-move');
    expect(component.displayedPositionPixelMatrixRows().map((row) => row.playerName)).toEqual(['Review Mid', 'Line Break Def']);

    component.setPositionPixelReadFilter('line-break');
    expect(component.displayedPositionPixelMatrixRows().map((row) => row.playerName)).toEqual(['Line Break Def']);
  });

  it('jumps from diagonal summary to the selected position row', (done) => {
    const diagonal = makePositionPixelRow({
      label: 'R1 ? 5px wide forward',
      playerName: 'Jump Mid',
      fromXPercent: 50,
      fromYPercent: 50,
      targetXPercent: 55,
      targetYPercent: 45,
    });
    const target = document.createElement('div');
    const scrollSpy = spyOn(target, 'scrollIntoView');
    const querySpy = spyOn(document, 'querySelector').and.returnValue(target);

    component.jumpToPositionPixelRow(diagonal as any);

    expect(component.positionPixelReadFilter()).toBe('diagonal');
    expect(component.selectedPositionPixelRowKey()).toBe(component.positionPixelRowKey(diagonal as any));

    setTimeout(() => {
      expect(querySpy).toHaveBeenCalledWith(`[data-position-row-key="${component.positionPixelRowKey(diagonal as any)}"]`);
      expect(scrollSpy).toHaveBeenCalled();
      done();
    }, 0);
  });

  it('jumps to position rows with a visual filter when requested', () => {
    const mismatch = makePositionPixelRow({
      label: 'R1 ? 5px center forward',
      playerName: 'Jump Mismatch',
      fromXPercent: 50,
      fromYPercent: 50,
      targetXPercent: 55,
      targetYPercent: 45,
    });

    component.jumpToPositionPixelRow(mismatch as any, 'diagonal-mismatch');

    expect(component.positionPixelReadFilter()).toBe('diagonal-mismatch');
    expect(component.selectedPositionPixelRowKey()).toBe(component.positionPixelRowKey(mismatch as any));
  });

  it('summarizes visual expectation mismatches for position pixels', () => {
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({
        playerPosition: 'ATT',
        fromYPercent: 22,
        targetYPercent: 17,
        deltaXgFor: 0,
        deltaShotsFor: 0,
      }),
      makePositionPixelRow({
        playerPosition: 'DEF',
        fromYPercent: 78,
        targetYPercent: 83,
        deltaXgAgainst: -0.06,
        deltaShotsAgainst: -1.1,
      }),
    ] as any);

    const summary = component.positionPixelVisualExpectationSummary();
    const mismatch = summary.find((item) => item.label === 'Visual mismatch');
    const ok = summary.find((item) => item.label === 'Visual OK');

    expect(mismatch?.count).toBe(1);
    expect(mismatch?.className).toBe('read-check');
    expect(ok?.count).toBe(1);
  });

  it('summarizes position line breaks by borderline, big, strong and tactical read', () => {
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({
        playerName: 'Border Forward',
        playerPosition: 'ATT',
        label: 'R1 ? 5px deeper',
        fromXPercent: 18,
        fromYPercent: 31,
        targetXPercent: 18,
        targetYPercent: 35,
        deltaXgFor: 0.05,
        deltaXgAgainst: -0.02,
        deltaShotsFor: 0.4,
      }),
      makePositionPixelRow({
        playerName: 'Risk Defender',
        playerPosition: 'DEF',
        label: 'R1 ? big zone cross',
        fromXPercent: 16.65,
        fromYPercent: 83,
        targetXPercent: 16.65,
        targetYPercent: 65,
        signalScore: 0.31,
        deltaXgFor: -0.12,
        deltaXgAgainst: 0.18,
        deltaXgDiff: -0.30,
        deltaShotsFor: -1.6,
        deltaShotsAgainst: 2.5,
      }),
      makePositionPixelRow({
        playerName: 'Same Line Mid',
        playerPosition: 'MID',
        label: 'R1 ? 5px wide',
        fromXPercent: 50,
        fromYPercent: 50,
        targetXPercent: 55,
        targetYPercent: 50,
      }),
    ] as any);

    const summary = component.positionPixelLineBreakSummary();

    expect(summary?.total).toBe(2);
    expect(summary?.borderline).toBe(1);
    expect(summary?.big).toBe(1);
    expect(summary?.strong).toBe(1);
    expect(summary?.badTradeoff).toBe(1);
    expect(summary?.attackGain).toBe(1);
    expect(summary?.worst?.playerName).toBe('Risk Defender');
    expect(summary?.best?.playerName).toBe('Border Forward');
  });

  it('keeps visual MID line through the softened MID/DEF border at 67px', () => {
    expect((component as any).positionPixelVisualLine(66)).toBe('MID');
    expect((component as any).positionPixelVisualLine(67)).toBe('MID');
    expect((component as any).positionPixelVisualLine(68.9)).toBe('MID');
    expect((component as any).positionPixelVisualLine(69)).toBe('DEF');
  });

  it('labels softened visual transition bands for coach readability', () => {
    expect(component.positionPixelVisualLineLabel(31.9)).toBe('ATT');
    expect(component.positionPixelVisualLineLabel(32)).toBe('ATT/MID');
    expect(component.positionPixelVisualLineLabel(34)).toBe('ATT/MID');
    expect(component.positionPixelVisualLineLabel(36)).toBe('ATT/MID');
    expect(component.positionPixelVisualLineLabel(37)).toBe('MID');
    expect(component.positionPixelVisualLineLabel(65)).toBe('MID/DEF');
    expect(component.positionPixelVisualLineLabel(67)).toBe('MID/DEF');
    expect(component.positionPixelVisualLineLabel(69)).toBe('MID/DEF');
    expect(component.positionPixelVisualLineLabel(70)).toBe('DEF');
  });

  it('records position smoke run summaries by scope for comparison', () => {
    (component as any).recordPositionPixelSmokeRun('MID', 'MID calibration sweep', [
      makePositionPixelRow({
        label: 'R1 vs Sevilla ? 5px wide',
        playerName: 'Mid One',
        playerPosition: 'MID',
        slotId: 'm1',
        deltaXgAgainst: 0.04,
        deltaShotsAgainst: 0.5,
      }),
    ]);
    (component as any).recordPositionPixelSmokeRun('DEF', 'DEF calibration sweep', [
      makePositionPixelRow({
        label: 'R2 vs Valencia ? 5px deeper',
        playerName: 'Def One',
        playerPosition: 'DEF',
        slotId: 'd1',
      }),
    ]);
    (component as any).recordPositionPixelSmokeRun('MID', 'MID calibration sweep rerun', [
      makePositionPixelRow({
        label: 'R2 vs Valencia ? 5px center',
        playerName: 'Mid Two',
        playerPosition: 'MID',
        slotId: 'm2',
      }),
    ]);

    const summaries = component.positionPixelSmokeRunSummaries();
    expect(summaries.map((item) => item.scope)).toEqual(['DEF', 'MID']);
    expect(summaries.find((item) => item.scope === 'MID')?.label).toBe('MID calibration sweep rerun');
    expect(summaries.find((item) => item.scope === 'MID')?.matchCount).toBe(1);
    expect(summaries.find((item) => item.scope === 'DEF')?.playerCount).toBe(1);
  });

  it('flags repeated 5px risks only when the signal is strong enough', () => {
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({ label: 'R1 ? 5px forward', signalScore: 0.17 }),
      makePositionPixelRow({ label: 'R1 ? 5px deeper', signalScore: 0.17 }),
      makePositionPixelRow({ label: 'R1 ? 5px wide', signalScore: 0.17 }),
    ] as any);

    const [summary] = component.positionPixelMatchSmokeSummary();
    const noCliffRow = component.professionalQaChecklistRows()
      .find((row) => row.check === 'Pixel no-cliff rule');

    expect(summary.verdict).toBe('5px visible pattern');
    expect(noCliffRow?.verdict).toBe('OK');
    expect(noCliffRow?.observed).toContain('2 visible 5px pattern(s)');
  });

  it('does not let a big move trigger a repeated 5px bias verdict', () => {
    const softFivePxRisk = (label: string) => makePositionPixelRow({
      label,
      signalScore: 0.045,
      deltaXgAgainst: 0.02,
      deltaShotsAgainst: 0.35,
    });
    component.positionPixelMatrixRows.set([
      softFivePxRisk('R1 ? 5px forward'),
      softFivePxRisk('R1 ? 5px deeper'),
      softFivePxRisk('R1 ? 5px wide'),
      softFivePxRisk('R1 ? 5px center'),
      softFivePxRisk('R1 ? 5px wide forward'),
      softFivePxRisk('R1 ? 5px center deeper'),
      makePositionPixelRow({
        label: 'R1 ? big zone cross',
        signalScore: 0.30,
        deltaXgAgainst: 0.20,
        deltaShotsAgainst: 2.0,
      }),
    ] as any);

    const [summary] = component.positionPixelMatchSmokeSummary();

    expect(summary.fivePxRiskRows).toBe(6);
    expect(summary.worstSignal).toBe(0.30);
    expect(summary.verdict).not.toBe('Repeated 5px bias');
    expect(summary.verdict).not.toBe('5px visible pattern');
  });

  it('labels low-impact big moves separately from stable micro moves', () => {
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({
        label: 'R1 ? big zone cross',
        fromXPercent: 38,
        fromYPercent: 50,
        targetXPercent: 38,
        targetYPercent: 32,
        signalScore: 0.03,
        deltaXgFor: 0.02,
        deltaXgAgainst: 0.01,
        deltaShotsFor: 0.2,
        deltaShotsAgainst: 0.1,
      }),
    ] as any);

    const [matchSummary] = component.positionPixelMatchSmokeSummary();
    const [playerSummary] = component.positionPixelPlayerSmokeSummary();

    expect(matchSummary.verdict).toBe('Big neutral move');
    expect(playerSummary.verdict).toBe('Big neutral move');
  });

  it('keeps professional QA checklist combined across formation, pixel and swap batteries', () => {
    component.formationLineSmokeRows.set([
      {
        formation: '4-4-2',
        line: 'DEF',
        candidates: 4,
        expectedPlayers: 4,
        rows: 8,
        candidateNames: 'A · B · C · D',
        slotRoles: 'LB · CB · CB · RB',
        verdict: 'OK',
        warnings: '-',
      },
    ] as any);
    component.positionPixelMatrixRows.set([
      makePositionPixelRow({ label: 'R1 ? 5px forward', signalScore: 0.04 }),
    ] as any);
    component.playerSwapBatterySummaries.set([
      makePlayerSwapSummary({ swapRead: 'Clear upgrade' }),
    ] as any);

    const rows = component.professionalQaChecklistRows();
    const formation = rows.find((row) => row.check === 'All formations audit');
    const pixel = rows.find((row) => row.check === 'Pixel movement signal');
    const swap = rows.find((row) => row.check === 'Player swap signal');

    expect(formation?.observed).toContain('1/36 rows');
    expect(pixel?.observed).toContain('1 rows');
    expect(swap?.observed).toContain('1 swaps');
    expect(swap?.verdict).toBe('OK');
  });

  it('marks all-formations line audit as a complete visible contract', () => {
    const lines = ['DEF', 'MID', 'ATT'] as const;
    const rows = (component as any).formationCodes.flatMap((formation: string) =>
      lines.map((line) => ({
        formation,
        line,
        candidates: line === 'DEF' ? 4 : 3,
        expectedRows: 12,
        players: `${formation}-${line}`,
        slotRoles: line,
        verdict: 'OK',
        warnings: '-',
      }))
    );

    component.formationLineSmokeRows.set(rows as any);

    const audit = component.professionalQaChecklistRows()
      .find((row) => row.check === 'All formations audit');

    expect(audit?.observed).toContain('36/36 rows');
    expect(audit?.observed).toContain('12/12 formations');
    expect(audit?.verdict).toBe('OK');
  });

  it('reports all-formations fallback as penalized OK instead of hard review', () => {
    const toast = (component as any).allFormationsLineAuditToast(36, 0, 2);

    expect(toast).toContain('OK');
    expect(toast).toContain('2 penalized fallback');
    expect(toast).not.toContain('need review');
  });

  it('reports all-formations hard reviews only when review rows exist', () => {
    const toast = (component as any).allFormationsLineAuditToast(36, 1, 2);

    expect(toast).toBe('All formations line audit: 1 line checks need review.');
  });

  it('formats current lineup multi-seed as a readable coach summary', () => {
    const summary = {
      formation: '4-4-2',
      seedCount: 12,
      avgGoalsFor: 1.42,
      avgGoalsAgainst: 0.83,
      avgPossessionFor: 53.4,
      avgXgDiff: 0.24,
      avgShotDiff: 1.1,
    } as any;

    expect(component.currentLineupMultiSeedReadable(summary)).toContain('12 seeds');
    expect(component.currentLineupMultiSeedReadable(summary)).toContain('4-4-2');
    expect(component.currentLineupMultiSeedSignal(summary)).toBe('Señal positiva');
  });

  it('uses precision comparison rows as player swap checklist evidence', () => {
    component.playerSwapPrecisionComparisonRows.set([
      {
        candidateKey: 'stable',
        starter: 'Starter A',
        bench: 'Bench A',
        slotId: 'S05-1',
        fit: 'Same profile',
        quick: makePlayerSwapSummary({ swapRead: 'Noise / neutral' }),
        balanced: makePlayerSwapSummary({ swapRead: 'Noise / neutral' }),
        stability: 'Stable read',
        stabilityClass: 'read-neutral',
      },
      {
        candidateKey: 'changed',
        starter: 'Starter B',
        bench: 'Bench B',
        slotId: 'S06-1',
        fit: 'Same line',
        quick: makePlayerSwapSummary({ swapRead: 'Clear upgrade' }),
        balanced: makePlayerSwapSummary({ swapRead: 'Noise / neutral' }),
        stability: 'Changed read',
        stabilityClass: 'read-warning',
      },
      {
        candidateKey: 'needs-seeds',
        starter: 'Starter C',
        bench: 'Bench C',
        slotId: 'S07-1',
        fit: 'Same line',
        quick: makePlayerSwapSummary({ swapRead: 'Clear upgrade' }),
        balanced: makePlayerSwapSummary({ swapRead: 'Clear upgrade' }),
        stability: 'Needs more seeds',
        stabilityClass: 'read-warning',
      },
    ] as any);

    const swap = component.professionalQaChecklistRows()
      .find((row) => row.check === 'Player swap signal');

    expect(swap?.observed).toContain('3 precision swaps');
    expect(swap?.observed).toContain('1 stable');
    expect(swap?.observed).toContain('1 changed');
    expect(swap?.observed).toContain('1 need more seeds');
    expect(swap?.verdict).toBe('Review');
    expect(swap?.next).toContain('Trust balanced reads');
  });

  it('adds action context to scenario coach reads', () => {
    const formationRead = component.scenarioSummaryCoachRead(makeScenarioSummaryRow({
      actionType: 'FORMATION',
      actionDetail: '4-3-3',
      avgUserXgDelta: 0.18,
      avgUserShotsDelta: 2.2,
      avgUserWideDelta: 2.0,
      avgUserWideXgDelta: 0.12,
    }));
    const subRead = component.scenarioSummaryCoachRead(makeScenarioSummaryRow({
      actionType: 'SUBSTITUTION',
      actionDetail: 'ST -> MID',
      avgUserXgDelta: -0.12,
      avgUserShotsDelta: -2.0,
      avgUserWideDelta: -1.5,
      avgUserWideXgDelta: -0.08,
    }));
    const opponentRead = component.scenarioSummaryCoachRead(makeScenarioSummaryRow({
      scenario: 'm45-opponent-wide-left',
      actionType: 'OPPONENT_STYLE',
      actionDetail: 'Opponent wide left',
      avgOpponentXgDelta: 0.12,
      avgOpponentShotsDelta: 2.0,
      avgOpponentLeftWideXgDelta: 0.14,
    }));
    const shapeRead = component.scenarioSummaryCoachRead(makeScenarioSummaryRow({
      scenario: 'm45-shape-right-overload',
      actionType: 'POSITION',
      actionDetail: 'right-overload',
      avgOpponentXgDelta: 0.14,
      avgOpponentShotsDelta: 2.0,
    }));
    const wideShapeRead = component.scenarioSummaryCoachRead(makeScenarioSummaryRow({
      scenario: 'm45-shape-wide-overload',
      actionType: 'POSITION',
      actionDetail: 'wide-overload -> x50/y50',
      avgOpponentXgDelta: 0.14,
      avgOpponentShotsDelta: 2.0,
    }));

    expect(formationRead).toContain('formacion:');
    expect(formationRead).toContain('gana ataque');
    expect(subRead).toContain('cambio:');
    expect(subRead).toContain('pierde ataque');
    expect(opponentRead).toContain('rival: rival amenaza');
    expect(shapeRead).toContain('forma:');
    expect(shapeRead).not.toContain('posicion:');
    expect(wideShapeRead).toContain('forma:');
    expect(wideShapeRead).not.toContain('posicion:');
  });

  it('turns scenario reads into DT recommendations', () => {
    const upgrade = makeScenarioSummaryRow({
      actionType: 'FORMATION',
      avgUserXgDelta: 0.18,
      avgUserShotsDelta: 2.2,
      avgOpponentXgDelta: -0.08,
      avgOpponentShotsDelta: -1.0,
    });
    const risk = makeScenarioSummaryRow({
      actionType: 'POSITION',
      avgOpponentXgDelta: 0.14,
      avgOpponentShotsDelta: 2.5,
    });
    const review = makeScenarioSummaryRow({
      actionType: 'SUBSTITUTION',
      actionDetail: 'offensive-upgrade-sub',
      avgUserXgDelta: -0.16,
      avgUserShotsDelta: -2.5,
    });

    expect(component.scenarioSummaryRecommendation(upgrade)).toBe('Usar como plan A');
    expect(component.scenarioSummaryRecommendation(risk)).toBe('Evitar si defendes');
    expect(component.scenarioSummaryRecommendation(review)).toBe('Revisar con mas seeds');
    expect(component.scenarioSummaryRecommendationDetail(upgrade)).toContain('lectura:');
  });

  it('labels attacking upside with defensive exposure as high risk instead of no-forzar', () => {
    const rows = [
      makeScenarioSummaryRow({
        scenario: 'base-balanced',
        actionType: 'NONE',
        actionDetail: 'Baseline',
      }),
      makeScenarioSummaryRow({
        scenario: 'm45-position-mid-up',
        actionType: 'POSITION',
        actionDetail: 'CM -> x50/y40',
        avgUserXgDelta: 0.10,
        avgOpponentXgDelta: 0.16,
        avgOpponentShotsDelta: 1.6,
      }),
    ];

    const cards = (component as any).buildScenarioDecisionCards(rows);
    const decision = (component as any).scenarioBatteryDecision(cards);

    expect(cards.some((card: any) => card.title === 'Riesgo ofensivo')).toBeTrue();
    expect(decision.label).toContain('Riesgo alto: CM -> x50/y40');
    expect(decision.label).not.toContain('No forzar');
    expect(decision.detail).toContain('mejora el ataque pero abre espacios');
  });

  it('adapts tactical battery decision to coach objective', () => {
    const rows = [
      makeScenarioSummaryRow({
        scenario: 'base-balanced',
        actionType: 'NONE',
        actionDetail: 'Baseline',
      }),
      makeScenarioSummaryRow({
        scenario: 'm45-position-mid-up',
        actionType: 'POSITION',
        actionDetail: 'CM -> x50/y40',
        avgUserXgDelta: 0.03,
        avgOpponentXgDelta: 0.18,
        avgOpponentShotsDelta: 1.8,
      }),
    ];

    const cards = (component as any).buildScenarioDecisionCards(rows);
    const neutral = (component as any).scenarioBatteryDecision(cards, 'NEUTRAL');
    const chasing = (component as any).scenarioBatteryDecision(cards, 'NEED_GOAL');
    const protecting = (component as any).scenarioBatteryDecision(cards, 'PROTECT_RESULT');

    expect(neutral.label).toContain('Riesgo alto: CM -> x50/y40');
    expect(chasing.label).toContain('Riesgo asumible: CM -> x50/y40');
    expect(chasing.detail).toContain('si necesitas gol');
    expect(protecting.label).toContain('No arriesgar: CM -> x50/y40');
    expect(protecting.detail).toContain('cuidar resultado');
  });

  it('labels double-gain protect-result plans as control instead of risk', () => {
    const cards = [
      {
        title: 'Doble ganancia',
        label: 'Centro',
        metrics: 'xG +0.05 / xGA -0.07 / media',
        detail: 'mejora control central y baja xGA',
      },
      {
        title: 'Riesgo ofensivo',
        label: '4-3-3',
        metrics: 'xG +0.09 / xGA +0.61 / fuerte',
        detail: 'abre riesgo',
      },
    ];

    const decision = (component as any).scenarioBatteryDecision(cards, 'PROTECT_RESULT');
    const review = (component as any).scenarioBatteryDecisionReview('PROTECT_RESULT', decision.label, cards);

    expect(decision.label).toBe('Controlar: Centro');
    expect(decision.detail).toContain('encaja con cuidar resultado');
    expect(review.label).toBe('OK');
  });

  it('marks chasing teams without attacking route as no clear path', () => {
    const cards = [
      {
        title: 'Evitar',
        label: '4-3-3',
        metrics: 'xG 0.00 / xGA +0.70 / fuerte',
        detail: 'rival amenaza por centro',
      },
      {
        title: 'Amenaza rival',
        label: 'Rival: canal derecho',
        metrics: 'xGA +0.04 / canal +0.36 / fuerte',
        detail: 'rival amenaza por banda derecha',
      },
    ];

    const decision = (component as any).scenarioBatteryDecision(cards, 'NEED_GOAL');
    const review = (component as any).scenarioBatteryDecisionReview('NEED_GOAL', decision.label, cards);

    expect(decision.label).toBe('Sin via clara: 4-3-3');
    expect(decision.detail).toContain('no encontro una via ofensiva clara');
    expect(review.label).toBe('Revisar: sin via');
  });

  it('infers tactical battery coach objective from score and minute in auto mode', () => {
    const losingLate = {
      ...makeMatchRow('match-losing-late'),
      status: 'COMPLETED' as const,
      homeGoals: 0,
      awayGoals: 1,
    };
    const winningLate = {
      ...makeMatchRow('match-winning-late'),
      status: 'COMPLETED' as const,
      homeGoals: 2,
      awayGoals: 1,
    };
    const awayWinning = {
      ...makeMatchRow('match-away-winning'),
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 2,
    };
    const draw = {
      ...makeMatchRow('match-draw'),
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 1,
    };
    const favoriteHomeDraw = {
      ...makeMatchRow('match-favorite-home-draw'),
      homeTeamName: 'Real Madrid',
      awayTeamName: 'Mallorca',
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 1,
    };
    const underdogAwayDraw = {
      ...makeMatchRow('match-underdog-away-draw'),
      homeTeamName: 'Real Madrid',
      awayTeamName: 'Mallorca',
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 1,
    };
    const realStrengthFavoriteHomeDraw = {
      ...makeMatchRow('match-real-strength-home-draw'),
      homeTeamName: 'Unknown Home',
      awayTeamName: 'Unknown Away',
      homeStrength: { startingOvr: 84, squadOvr: 82 },
      awayStrength: { startingOvr: 74, squadOvr: 73 },
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 1,
    };
    const freshSmallFavoriteHomeDraw = {
      ...makeMatchRow('match-fresh-small-favorite-home-draw'),
      homeTeamName: 'Fresh Home',
      awayTeamName: 'Normal Away',
      homeStrength: { startingOvr: 78, squadOvr: 77, avgEnergy: 95, avgStamina: 82, avgForm: 70 },
      awayStrength: { startingOvr: 76, squadOvr: 76, avgEnergy: 82, avgStamina: 76, avgForm: 55 },
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 1,
    };
    const tiredUnderdogAwayDraw = {
      ...makeMatchRow('match-tired-underdog-away-draw'),
      homeTeamName: 'Strong Home',
      awayTeamName: 'Tired Away',
      homeStrength: { startingOvr: 82, squadOvr: 82, avgEnergy: 86, avgStamina: 80, avgForm: 60 },
      awayStrength: { startingOvr: 76, squadOvr: 75, avgEnergy: 68, avgStamina: 70, avgForm: 48 },
      status: 'COMPLETED' as const,
      homeGoals: 1,
      awayGoals: 1,
    };
    const tiredHomeWinning = {
      ...makeMatchRow('match-tired-home-winning'),
      homeStrength: { startingOvr: 78, squadOvr: 77, avgEnergy: 69, avgStamina: 74, avgForm: 55 },
      awayStrength: { startingOvr: 78, squadOvr: 77, avgEnergy: 86, avgStamina: 78, avgForm: 60 },
      status: 'COMPLETED' as const,
      homeGoals: 2,
      awayGoals: 1,
    };

    component.selectedMinute.set(70);

    expect((component as any).inferScenarioBatteryCoachObjective(losingLate, 'HOME')).toBe('NEED_GOAL');
    expect((component as any).inferScenarioBatteryCoachObjective(winningLate, 'HOME')).toBe('PROTECT_RESULT');
    expect((component as any).inferScenarioBatteryCoachObjective(draw, 'HOME')).toBe('NEUTRAL');
    expect((component as any).inferScenarioBatteryCoachObjective(winningLate, 'HOME', 30)).toBe('NEUTRAL');
    expect((component as any).inferScenarioBatteryCoachObjective(favoriteHomeDraw, 'HOME', 75)).toBe('NEED_GOAL');
    expect((component as any).inferScenarioBatteryCoachObjective(underdogAwayDraw, 'AWAY', 75)).toBe('PROTECT_RESULT');
    expect((component as any).inferScenarioBatteryCoachObjective(awayWinning, 'AWAY', 60)).toBe('PROTECT_RESULT');
    expect((component as any).inferScenarioBatteryCoachObjective(realStrengthFavoriteHomeDraw, 'HOME', 75)).toBe('NEED_GOAL');
    expect((component as any).scenarioBatteryContextPressure(realStrengthFavoriteHomeDraw, 'HOME').label).toContain('/ovr');
    expect((component as any).inferScenarioBatteryCoachObjective(freshSmallFavoriteHomeDraw, 'HOME', 65)).toBe('NEED_GOAL');
    expect((component as any).scenarioBatteryContextPressure(freshSmallFavoriteHomeDraw, 'HOME').label).toContain('/fresco');
    expect((component as any).inferScenarioBatteryCoachObjective(tiredUnderdogAwayDraw, 'AWAY', 70)).toBe('PROTECT_RESULT');
    expect((component as any).scenarioBatteryContextPressure(tiredUnderdogAwayDraw, 'AWAY').label).toContain('/cansado');
    expect((component as any).inferScenarioBatteryCoachObjective(tiredHomeWinning, 'HOME', 60)).toBe('PROTECT_RESULT');
    const context = (component as any).scenarioBatteryCoachContext(freshSmallFavoriteHomeDraw, 'HOME');
    expect(context.summary).toContain('1-1 min 70');
    expect(context.summary).toContain('OVR 78-76');
    expect(context.summary).toContain('EN 95');
    expect(context.summary).toContain('/fresco');
    expect(context.detail).toContain('empatado');
    expect(context.detail).toContain('startingOvr 78');
    expect((component as any).scenarioBatteryDecisionReview('NEED_GOAL', 'No arriesgar: Player -> x40/y50', [
      { title: 'Riesgo ofensivo', label: 'Player -> x40/y50', metrics: 'xG +0.10 / xGA +0.20 / media', detail: 'test' },
    ]).label).toContain('Revisar');
    expect((component as any).scenarioBatteryDecisionReview('PROTECT_RESULT', 'Riesgo asumible: Player -> x60/y30', [
      { title: 'Riesgo ofensivo', label: 'Player -> x60/y30', metrics: 'xG +0.10 / xGA +0.20 / media', detail: 'test' },
    ]).label).toContain('Revisar');
    expect((component as any).scenarioBatteryDecisionReview('PROTECT_RESULT', 'No arriesgar: Player -> x60/y30', [
      { title: 'Riesgo ofensivo', label: 'Player -> x60/y30', metrics: 'xG +0.10 / xGA +0.20 / media', detail: 'test' },
    ]).label).toBe('OK');
    expect((component as any).scenarioBatteryDecisionReview('NEED_GOAL', 'Riesgo asumible: Player -> x60/y30', [
      { title: 'Riesgo ofensivo', label: 'Player -> x60/y30', metrics: 'xG +0.10 / xGA +0.20 / media', detail: 'test' },
    ]).label).toBe('OK');
    component.scenarioBatteryRows.set([
      { review: 'OK' },
      { review: 'OK' },
    ] as any);
    expect(component.scenarioBatteryReviewHint()).toContain('Revision OK: 2/2');
    component.scenarioBatteryRows.set([
      { review: 'OK' },
      { review: 'Revisar: poco gol' },
    ] as any);
    expect(component.scenarioBatteryReviewCount()).toBe(1);
    expect(component.scenarioBatteryReviewHint()).toContain('1/2 para mirar');
    component.scenarioBatteryRows.set([
      {
        matchId: 'm1',
        controlledSide: 'HOME',
        controlledTeam: 'Atletico Madrid',
        matchLabel: 'Atletico Madrid vs Sevilla',
        coachContext: '1-1 min 75',
        decision: 'No forzar',
        review: 'Revisar: poco gol',
        reviewDetail: 'test detail',
      },
    ] as any);
    expect(component.scenarioBatteryReviewItems()[0].summary).toContain('Atletico Madrid');
    expect(component.scenarioBatteryReviewItems()[0].detail).toContain('No forzar');
  });

  it('renders scenario summary headers with stable separators', () => {
    component.scenarioMatrixSummaryResults.set([
      makeScenarioSummaryRow({
        scenario: 'm45-shape-wide-overload',
        actionType: 'POSITION',
        actionDetail: 'wide-overload -> x50/y50',
        avgUserXgDelta: -0.23,
        avgOpponentXgDelta: 0.23,
        avgUserShotsDelta: -1.8,
        avgOpponentShotsDelta: 1.8,
      }),
    ]);
    fixture.detectChanges();

    const panel: HTMLElement | null = fixture.nativeElement.querySelector('.scenario-matrix');
    expect(panel?.textContent).toContain('Same match - seeds');
    expect(panel?.textContent).toContain('Delta xG For avg');
    expect(panel?.textContent).toContain('F -1.80');
    expect(panel?.textContent).toContain('vs');
    expect(panel?.textContent).not.toContain('?xG');
    expect(panel?.textContent).not.toContain(' ? ');
  });

  it('keeps scenario smoke errors visible in Panel E state', () => {
    harness.runScenarioMatrixSummary.and.returnValue(
      throwError(() => ({ status: 404, message: 'Not Found' })) as any
    );
    component.selectMatch(makeMatchRow('match-1') as any);

    component.onRunScenarioMatrixSmoke();

    expect(component.analysisReadyMessage()).toContain('Scenario smoke no pudo generar Panel E');
    expect(component.analysisReadyMessage()).toContain('Not Found');
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('replays the last modal move with persisted before and after coordinates', () => {
    const modalMove = {
      version: 1,
      createdAt: '2026-07-17T00:00:00.000Z',
      source: 'squad-editor-modal',
      formation: '4-4-2',
      playerId: 'p6',
      playerName: 'Player 6',
      playerPosition: 'MID',
      playerRole: 'MID',
      slotId: 'S06-1',
      fromXPercent: 38.85,
      fromYPercent: 50,
      targetXPercent: 38.85,
      targetYPercent: 32,
      deltaXPercent: 0,
      deltaYPercent: -18,
      coachReadTitle: 'Player 6: MIDC -> MIDC',
      coachReadBody: 'test',
    };
    window.localStorage.setItem('manager:last-modal-position-move', JSON.stringify(modalMove));
    harness.runPositionPixelMatrixSummary.and.returnValue(of(makePositionPixelRow({
      matchId: 'match-1',
      playerId: 'p6',
      playerName: 'Player 6',
      playerPosition: 'MID',
      slotId: 'S06-1',
      fromXPercent: 38.85,
      fromYPercent: 50,
      targetXPercent: 38.85,
      targetYPercent: 32,
      deltaXgFor: 0.04,
      deltaXgAgainst: 0.01,
      deltaXgDiff: 0.03,
    })) as any);
    component.selectMatch(makeMatchRow('match-1') as any);

    component.onRunLastModalMovePositionSmoke();

    expect(harness.resetInjuries).toHaveBeenCalled();
    expect(harness.manualSelectLineup).toHaveBeenCalledWith(
      '4-4-2',
      jasmine.arrayContaining(['p6']),
      jasmine.arrayContaining([
        jasmine.objectContaining({
          playerId: 'p6',
          subdivisionId: 'S06-1',
          customXPercent: 38.85,
          customYPercent: 50,
        }),
      ])
    );
    expect(harness.runPositionPixelMatrixSummary).toHaveBeenCalledWith('match-1', jasmine.objectContaining({
      playerId: 'p6',
      targetXPercent: 38.85,
      targetYPercent: 32,
      deltaXPercent: 0,
      deltaYPercent: -18,
      seedStart: 12345,
      seedCount: 10,
    }));
    expect(component.positionPixelMatrixRows().length).toBe(1);
    expect(component.positionPixelMatrixRows()[0].targetYPercent).toBe(32);
    expect(component.lineupDebugSnapshot()?.rows.map((row) => row.name)).toEqual([
      'Player 6 (antes)',
      'Player 6 (despues)',
    ]);
    expect(component.lineupDebugSnapshot()?.rows.map((row) => row.y)).toEqual([50, 32]);
  });
});

function makeMatchRow(matchId: string) {
  return {
    matchId,
    round: 1,
    homeTeamId: 'team-1',
    homeTeamName: 'Team 1',
    awayTeamId: 'team-2',
    awayTeamName: 'Team 2',
    status: 'PENDING' as const,
    homeGoals: null,
    awayGoals: null,
    homeFormation: null,
    awayFormation: null,
    roundId: 'round-uuid-1',
  };
}

function makeScenarioSummaryRow(overrides: Partial<any> = {}): any {
  return {
    scenario: 'm45-formation-433',
    actionType: 'FORMATION',
    actionDetail: '4-3-3',
    seedCount: 10,
    avgUserXgDelta: 0,
    minUserXgDelta: 0,
    maxUserXgDelta: 0,
    avgOpponentXgDelta: 0,
    avgUserShotsDelta: 0,
    avgOpponentShotsDelta: 0,
    avgUserPossessionDelta: 0,
    avgUserCentralDelta: 0,
    avgUserWideDelta: 0,
    avgOpponentCentralDelta: 0,
    avgOpponentWideDelta: 0,
    avgUserCentralXgDelta: 0,
    avgUserWideXgDelta: 0,
    avgOpponentCentralXgDelta: 0,
    avgOpponentWideXgDelta: 0,
    avgUserLeftWideDelta: 0,
    avgUserRightWideDelta: 0,
    avgOpponentLeftWideDelta: 0,
    avgOpponentRightWideDelta: 0,
    avgUserLeftWideXgDelta: 0,
    avgUserRightWideXgDelta: 0,
    avgOpponentLeftWideXgDelta: 0,
    avgOpponentRightWideXgDelta: 0,
    baselineScenario: 'baseline',
    ...overrides,
  };
}

function makeFormationSummary(overrides: Partial<FormationMatrixSummaryRow> = {}): FormationMatrixSummaryRow {
  return {
    formation: '4-4-2',
    seedStart: 12345,
    seedEnd: 12364,
    seedCount: 20,
    avgGoalsFor: 0.5,
    avgGoalsAgainst: 0.5,
    avgGoalDiff: 0,
    avgPossessionFor: 50,
    avgShotsFor: 10,
    avgShotsAgainst: 10,
    avgShotDiff: 0,
    avgXgFor: 1,
    avgXgAgainst: 1,
    avgXgDiff: 0,
    avgCentralShotsFor: 5,
    avgWideShotsFor: 3,
    avgLongShotsFor: 2,
    avgCentralShotsAgainst: 5,
    avgWideShotsAgainst: 3,
    avgLongShotsAgainst: 2,
    avgShapePossessionMultiplier: 0.84,
    avgShapeAttackVolumeMultiplier: 0.95,
    avgShapeDefensiveResistanceMultiplier: 1,
    avgShapeAttackLeft: 0.35,
    avgShapeAttackCenter: 0.6,
    avgShapeAttackRight: 0.35,
    avgShapeDefenseLeft: 0.7,
    avgShapeDefenseCenter: 0.8,
    avgShapeDefenseRight: 0.7,
    ...overrides,
  };
}

function sampleSnapshot(minute: number): TimelineSnapshot {
  return {
    minute,
    homeGoals: 1,
    awayGoals: 0,
    homeXg: 0.55,
    awayXg: 0.10,
    homeShots: 4,
    awayShots: 1,
    events: [],
  };
}

function sampleLineup(formation: string) {
  return {
    formation,
    confirmed: true,
    warnings: [],
    players: Array.from({ length: 11 }, (_, i) => ({
      playerId: `p${i + 1}`,
      name: `Player ${i + 1}`,
      position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 9 ? 'MID' : 'ATT',
      overall: 70,
    })),
    slots: Array.from({ length: 11 }, (_, i) => ({
      playerId: `p${i + 1}`,
      subdivisionId: i === 0 ? 'GK-1' : `S${String(i + 1).padStart(2, '0')}-1`,
    })),
  };
}

function makePlayerSwapSummary(overrides: Record<string, unknown>) {
  const baseline = {
    label: 'baseline',
    formation: '4-3-3',
    style: 'BALANCED',
    seedStart: 12345,
    seedEnd: 12354,
    seedCount: 10,
    playerCount: 11,
    starters: [],
    avgGoalsFor: 1,
    avgGoalsAgainst: 1,
    avgGoalDiff: 0,
    avgPossessionFor: 55,
    avgShotsFor: 10,
    avgShotsAgainst: 8,
    avgShotDiff: 2,
    avgXgFor: 1.25,
    avgXgAgainst: 0.9,
    avgXgDiff: 0.35,
    avgCentralShotsFor: 4,
    avgWideShotsFor: 4,
    avgLongShotsFor: 2,
    avgCentralShotsAgainst: 3,
    avgWideShotsAgainst: 3,
    avgLongShotsAgainst: 2,
    timestamp: '2026-07-13T00:00:00.000Z',
  };
  return {
    slotId: 'S05-1',
    formation: '4-3-3',
    seedStart: 12345,
    seedEnd: 12354,
    seedCount: 10,
    baselinePlayer: 'Starter',
    swapPlayer: 'Bench',
    baseline,
    swapped: { ...baseline, label: 'swapped' },
    deltaGoalsFor: 0,
    deltaGoalsAgainst: 0,
    deltaGoalDiff: 0,
    deltaShotsFor: 0,
    deltaShotsAgainst: 0,
    deltaPossessionFor: 0,
    deltaXgFor: 0,
    deltaXgAgainst: 0,
    deltaXgDiff: 0,
    deltaCentralShotsFor: 0,
    deltaWideShotsFor: 0,
    deltaLongShotsFor: 0,
    deltaCentralShotsAgainst: 0,
    deltaWideShotsAgainst: 0,
    deltaLongShotsAgainst: 0,
    preAutoSubDeltaShotsFor: 0,
    preAutoSubDeltaShotsAgainst: 0,
    preAutoSubDeltaXgFor: 0,
    preAutoSubDeltaXgAgainst: 0,
    preAutoSubDeltaXgDiff: 0,
    swapRead: 'Noise / neutral',
    swapReadDetail: 'test',
    swapReadClass: 'read-neutral',
    swapFit: 'Same profile',
    swapFitDetail: 'test',
    swapFitClass: 'fit-good',
    signalScore: 0,
    signalRead: 'Micro 0.000',
    signalClass: 'delta-neutral',
    signalDetail: 'test',
    tacticalAttackRead: 'Ataque =',
    tacticalAttackClass: 'delta-neutral',
    tacticalCentralControlRead: 'Control =',
    tacticalCentralControlClass: 'delta-neutral',
    tacticalProtectionRead: 'Proteccion =',
    tacticalProtectionClass: 'delta-neutral',
    tacticalChannelsRead: 'Canales =',
    tacticalChannelsClass: 'delta-neutral',
    tacticalBreakdownDetail: 'test',
    timestamp: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

function makePositionPixelRow(overrides: Record<string, unknown> = {}) {
  return {
    label: 'R1 ? 5px forward',
    matchId: 'match-1',
    formation: '4-4-2',
    playerId: 'p2',
    playerName: 'Starter RB',
    playerPosition: 'RB',
    slotId: 'S24-2',
    fromXPercent: 80,
    fromYPercent: 80,
    targetXPercent: 80,
    targetYPercent: 75,
    seedStart: 12345,
    seedEnd: 12347,
    seedCount: 3,
    baselineAvgShotsFor: 10,
    baselineAvgPossessionFor: 50,
    baselineAvgXgFor: 1,
    baselineAvgXgAgainst: 1,
    movedAvgShotsFor: 10,
    movedAvgPossessionFor: 50,
    movedAvgXgFor: 1,
    movedAvgXgAgainst: 1.03,
    deltaGoalsFor: 0,
    deltaGoalsAgainst: 0,
    deltaGoalDiff: 0,
    deltaShotsFor: 0,
    deltaShotsAgainst: 0.3,
    deltaPossessionFor: 0,
    deltaXgFor: 0,
    deltaXgAgainst: 0.03,
    deltaXgDiff: -0.03,
    deltaCentralShotsFor: 0,
    deltaWideShotsFor: 0,
    deltaLongShotsFor: 0,
    deltaCentralShotsAgainst: 0.2,
    deltaWideShotsAgainst: 0.2,
    deltaLongShotsAgainst: 0,
    deltaCentralXgFor: 0,
    deltaWideXgFor: 0,
    deltaLongXgFor: 0,
    deltaLeftWideShotsFor: 0,
    deltaRightWideShotsFor: 0,
    deltaLeftWideXgFor: 0,
    deltaRightWideXgFor: 0,
    deltaCentralXgAgainst: 0.015,
    deltaWideXgAgainst: 0.015,
    deltaLongXgAgainst: 0,
    deltaLeftWideShotsAgainst: 0,
    deltaRightWideShotsAgainst: 0,
    deltaLeftWideXgAgainst: 0.01,
    deltaRightWideXgAgainst: 0.01,
    baselineAvgCentralShotsAgainst: 3,
    baselineAvgWideShotsAgainst: 3,
    baselineAvgLongShotsAgainst: 2,
    movedAvgCentralShotsAgainst: 3.2,
    movedAvgWideShotsAgainst: 3.2,
    movedAvgLongShotsAgainst: 2,
    signalScore: 0.04,
    signalRead: 'Baja 0.040',
    signalClass: 'read-stable',
    signalDetail: 'test',
    ...overrides,
  };
}
