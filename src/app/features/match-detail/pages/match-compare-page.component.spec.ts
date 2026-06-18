// F6 Sprint 2 (LIVE-MATCH-F6-MATCH-COMPARE): Tests for
// MatchComparePageComponent. Pattern: provide the real service, then
// spy on it after the component is created.

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { MatchComparePageComponent } from './match-compare-page.component';
import { MatchCompareApiService } from '../services/match-compare-api.service';
import { MatchComparison } from '../models/match-compare.model';

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
        MatchCompareApiService,   // provide the real service (will be spied)
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchComparePageComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(MatchCompareApiService);
  });

  it('renders the comparison on 200', waitForAsync(() => {
    spyOn(api, 'getMatchCompare').and.returnValue(of(sampleComparison()));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.comparison).toBeTruthy();
      expect(component.loading).toBeFalse();
      expect(component.error).toBe('');

      const html = fixture.nativeElement.textContent;
      expect(html).toContain('Baseline');
      expect(html).toContain('Live');
      expect(html).toContain('Match Compare');
    });
  }));

  it('shows error when comparison is null (no baseline or no detail)', waitForAsync(() => {
    spyOn(api, 'getMatchCompare').and.returnValue(of(null));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.comparison).toBeNull();
      expect(component.error).toContain('Comparación no disponible');
      expect(snackBarSpy.open).toHaveBeenCalled();
    });
  }));

  it('shows error on HTTP failure', waitForAsync(() => {
    spyOn(api, 'getMatchCompare').and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.comparison).toBeNull();
      expect(component.error).toContain('Error al cargar');
      expect(snackBarSpy.open).toHaveBeenCalled();
    });
  }));
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
      schemaVersion: '1', engineVersion: 'V24',
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
      schemaVersion: '1', engineVersion: 'V24',
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
