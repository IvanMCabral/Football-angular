// Tests for the match comparison page.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { MatchComparePageComponent } from './match-compare-page.component';
import { MatchCompareApiService } from '../services/match-compare-api.service';
import { MatchComparison } from '../models/match-compare.model';
import { DETAILED_MATCH_ENGINE_TYPE } from '../models/detailed-match-discriminators.model';

describe('MatchComparePageComponent', () => {
  let component: MatchComparePageComponent;
  let fixture: ComponentFixture<MatchComparePageComponent>;
  let api: MatchCompareApiService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const routeStub = {
      snapshot: { paramMap: { get: (key: string) => key === 'careerId' ? 'career-1' : 'match-1' } },
    };

    await TestBed.configureTestingModule({
      imports: [MatchComparePageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MatchCompareApiService,
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchComparePageComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(MatchCompareApiService);
  });

  it('renders the comparison on 200', async () => {
    spyOn(api, 'getMatchCompare').and.returnValue(of(sampleComparison()));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.comparison).toBeTruthy();
    expect(component.loading).toBeFalse();
    expect(component.error).toBe('');

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('Baseline');
    expect(html).toContain('Live');
    expect(html).toContain('Comparaci\u00f3n de partido');
  });

  it('shows error when comparison is null (no baseline or no detail)', async () => {
    spyOn(api, 'getMatchCompare').and.returnValue(of(null));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.comparison).toBeNull();
    expect(component.error).toContain('Comparaci\u00f3n no disponible');
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('shows error on HTTP failure', async () => {
    spyOn(api, 'getMatchCompare').and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.comparison).toBeNull();
    expect(component.error).toContain('Error al cargar');
    expect(snackBarSpy.open).toHaveBeenCalled();
  });
});

function sampleComparison(): MatchComparison {
  return {
    baseline: {
      matchId: 'match-1', careerId: 'career-1', seasonNumber: 1, round: 5,
      homeTeamId: 'home', awayTeamId: 'away',
      homeTeamName: 'Home', awayTeamName: 'Away',
      homeGoals: 1, awayGoals: 0,
      homeXg: 1.0, awayXg: 0.5,
      homeShots: 8, awayShots: 5,
      homePossession: 50, awayPossession: 50,
      timeline: [], playerRatings: [],
      schemaVersion: '1', engineType: DETAILED_MATCH_ENGINE_TYPE,
      createdAt: new Date().toISOString(),
    },
    live: {
      matchId: 'match-1', careerId: 'career-1', seasonNumber: 1, round: 5,
      homeTeamId: 'home', awayTeamId: 'away',
      homeTeamName: 'Home', awayTeamName: 'Away',
      homeGoals: 2, awayGoals: 1,
      homeXg: 1.8, awayXg: 0.9,
      homeShots: 12, awayShots: 8,
      homePossession: 55, awayPossession: 45,
      timeline: [], playerRatings: [],
      schemaVersion: '1', engineType: DETAILED_MATCH_ENGINE_TYPE,
      createdAt: new Date().toISOString(),
    },
    diff: {
      scoreDeltaHome: 1, scoreDeltaAway: 1,
      xgDeltaHome: 0.8, xgDeltaAway: 0.4,
      shotsDeltaHome: 4, shotsDeltaAway: 3,
      possessionDeltaHome: 5,
      timelineDiff: [],
    },
  };
}
