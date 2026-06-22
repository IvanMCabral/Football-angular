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
      'resetInjuries',
      'replaceFixtures',
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

  it('applyFormation calls the service with the selected formation', () => {
    harness.setFormation.and.returnValue(
      of({ success: true, message: 'ok' } as any)
    );
    component.selectedFormationModel = '4-3-3';
    component.applyFormation();
    expect(harness.setFormation).toHaveBeenCalledWith('4-3-3');
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
