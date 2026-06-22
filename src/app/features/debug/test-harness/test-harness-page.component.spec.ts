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

describe('TestHarnessPageComponent', () => {
  let component: TestHarnessPageComponent;
  let fixture: ComponentFixture<TestHarnessPageComponent>;
  let careerService: jasmine.SpyObj<CareerService>;
  let harness: jasmine.SpyObj<TestHarnessService>;
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

    await TestBed.configureTestingModule({
      imports: [TestHarnessPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CareerService, useValue: careerService },
        { provide: TestHarnessService, useValue: harness },
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
});
