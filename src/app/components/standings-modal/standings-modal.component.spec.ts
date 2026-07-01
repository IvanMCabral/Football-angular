/**
 * V25D78-C55.2 phase 4 UI (c2): tests for {@link StandingsModalComponent}.
 *
 * <p>Coverage:
 * <ul>
 *   <li>Constant {@code TEAMS_PROMOTED_OR_RELEGATED} exposed (= 3).</li>
 *   <li>Green/red zone legend renders (c2 contract).</li>
 *   <li>Divisions loaded from CareerService.getAllStandings().</li>
 *   <li>User's tab auto-selected based on {@code isUserDivision}.</li>
 * </ul>
 */
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { StandingsModalComponent } from './standings-modal.component';
import { CareerService } from '../../core/services/career.service';
import { AllStandingsResponse } from '../../core/services/career.model';

@Component({
  selector: 'app-stub',
  standalone: true,
  template: ''
})
class StubComponent {}

describe('StandingsModalComponent — V25D78-C55.2 phase 4 UI (c2)', () => {
  let component: StandingsModalComponent;
  let fixture: ComponentFixture<StandingsModalComponent>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<StandingsModalComponent>>;

  const PRIMERA_STANDINGS = [
    { teamId: 't-1', teamName: 'A', division: 'PRIMERA', played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2, points: 3 },
    { teamId: 't-2', teamName: 'B', division: 'PRIMERA', played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0, points: 1 },
    { teamId: 't-3', teamName: 'C', division: 'PRIMERA', played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 2, goalDifference: -2, points: 0 }
  ];

  const ALL_STANDINGS: AllStandingsResponse = {
    divisions: [
      { divisionId: 'd-1', divisionName: 'PRIMERA', isUserDivision: true, standings: PRIMERA_STANDINGS },
      { divisionId: 'd-2', divisionName: 'SEGUNDA', isUserDivision: false, standings: [] },
      { divisionId: 'd-3', divisionName: 'TERCERA', isUserDivision: false, standings: [] }
    ]
  };

  beforeEach(async () => {
    careerServiceSpy = jasmine.createSpyObj('CareerService', ['getAllStandings']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    careerServiceSpy.getAllStandings.and.returnValue(of(ALL_STANDINGS));

    await TestBed.configureTestingModule({
      imports: [StandingsModalComponent, MatDialogModule, StubComponent],
      providers: [
        { provide: CareerService, useValue: careerServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { userTeamId: 't-1' } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StandingsModalComponent);
    component = fixture.componentInstance;
  });

  it('exposes TEAMS_PROMOTED_OR_RELEGATED = 3', () => {
    expect(component.TEAMS_PROMOTED_OR_RELEGATED).toBe(3);
  });

  it('loads divisions from CareerService on init', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      let divisions: any[] | undefined;
      component.divisions$.subscribe(d => { divisions = d; });
      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(divisions).toBeDefined('divisions$ must emit');
        expect(divisions!.length).toBe(3);
        expect(divisions![0].divisionName).toBe('PRIMERA');
        done();
      });
    });
  });

  it('auto-selects the user-division tab (selectedTabIndex$ = 0)', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      let tabIndex: number | undefined;
      component.selectedTabIndex$.subscribe(i => { tabIndex = i; });
      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(tabIndex).toBe(0, 'user-division tab should be auto-selected (PRIMERA is at index 0)');
        done();
      });
    });
  });

  it('renders the zone legend with promotion/relegation items', (done: DoneFn) => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const legend = fixture.nativeElement.querySelector('.zone-legend');
      expect(legend).not.toBeNull('zone-legend must render');
      const promo = legend.querySelector('.zone-promotion');
      const releg = legend.querySelector('.zone-relegation');
      expect(promo).not.toBeNull();
      expect(releg).not.toBeNull();
      done();
    });
  });

  it('(C55.10 Item 3): user team row has `.highlight` class and the ⭐ marker (gap A3/B5)', (done: DoneFn) => {
    // C55.10 Item 3 — same fix as standings-page: the modal used the same
    // subtle 3px gold border + 15% tint before. Now 6px + gradient + bold.
    // Visual prominence is verified via smoke; this spec asserts the
    // structural wiring (.highlight + .user-team-marker) lands on the
    // user's row.
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const highlightedRows = fixture.nativeElement.querySelectorAll('tr.highlight');
      expect(highlightedRows.length).toBeGreaterThan(0, 'at least one tr.highlight must render');
      expect(highlightedRows.length).toBe(1,
        `expected exactly 1 highlighted row in the user-division tab, got ${highlightedRows.length}`);

      const userRow = highlightedRows[0];
      expect(userRow.textContent).toContain('A',
        "user-team row should contain the user-team name (data: 'A' for t-1)");

      const marker = userRow.querySelector('.user-team-marker');
      expect(marker).not.toBeNull('highlighted row should contain the .user-team-marker');
      expect(marker.textContent.trim()).toBe('⭐');
      done();
    });
  });
});