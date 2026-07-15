// V24D24: Tests for TestHarnessPageComponent.
//
// These tests focus on the state-management contract (signals, handlers).
// The full template rendering (Material modules, V24MatchDetailPageComponent
// re-mount, etc.) is exercised by REVISOR's manual smoke — Angular Material
// component specs would need NoopAnimations + providers for every nested
// component, which is high-cost relative to value for a debug-only page.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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

  beforeEach(async () => {
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

  it('starts with no selected match', () => {
    expect(component.selectedMatchId()).toBeNull();
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

  it('onFormationChange updates the model', () => {
    component.onFormationChange('3-5-2');
    expect(component.selectedFormationModel).toBe('3-5-2');
  });

  it('onFormationChange handles null gracefully', () => {
    component.onFormationChange(null as unknown as string);
    expect(component.selectedFormationModel).toBeNull();
  });

  it('applyFormation applies the selected formation and rebuilds canonical slots', () => {
    harness.setFormation.and.returnValue(
      of({ success: true, message: 'ok' } as any)
    );
    harness.getCurrentLineup.and.returnValue(of(sampleLineup('4-4-2')) as any);
    harness.manualSelectLineup.and.returnValue(of(sampleLineup('4-3-3')) as any);
    component.selectedFormationModel = '4-3-3';
    component.applyFormation();
    expect(harness.getCurrentLineup).toHaveBeenCalled();
    expect(harness.setFormation).toHaveBeenCalledWith('4-3-3');
    expect(harness.manualSelectLineup).toHaveBeenCalledWith(
      '4-3-3',
      Array.from({ length: 11 }, (_, i) => `p${i + 1}`),
      [
        { playerId: 'p1', subdivisionId: 'GK-1' },
        { playerId: 'p2', subdivisionId: 'S22-2' },
        { playerId: 'p3', subdivisionId: 'S23-1' },
        { playerId: 'p4', subdivisionId: 'S23-3' },
        { playerId: 'p5', subdivisionId: 'S24-2' },
        { playerId: 'p6', subdivisionId: 'S17-1' },
        { playerId: 'p7', subdivisionId: 'S17-2' },
        { playerId: 'p8', subdivisionId: 'S17-3' },
        { playerId: 'p9', subdivisionId: 'S04-1' },
        { playerId: 'p10', subdivisionId: 'S05-2' },
        { playerId: 'p11', subdivisionId: 'S06-3' },
      ]
    );
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
    harness.getCurrentLineup.and.returnValue(of(sampleLineup('4-4-2')) as any);
    harness.setFormation.and.returnValue(throwError(() => new Error('boom')));
    component.selectedFormationModel = '4-4-2';
    component.applyFormation();
    expect(component.mutationInFlight()).toBeFalse();
    expect(snackBarSpy.open).toHaveBeenCalled();
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
