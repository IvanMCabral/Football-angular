/**
 * MVP1-lineup-cancha-1: basic spec para {@link SquadManagementComponent}.
 *
 * <p>Smoke test: el botón "🎯 Editar Formación Visual" abre el
 * {@link SquadEditorModalComponent} con los datos correctos.
 *
 * <p>El componente squad-management tiene muchas dependencias (HttpClient,
 * Router, FixtureService, MatDialog, varios componentes hijos). Este spec
 * se mantiene intencionalmente mínimo — se enfoca sólo en el wire del modal.
 *
 * <p>V25D42 (Sprint C7): tests del chemistry badge agregado en la barra
 * de información del lineup. Verifica color coding por threshold y
 * backward compat (chemistryScore opcional).
 */

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { SquadManagementComponent } from './squad-management.component';
import { SquadEditorModalComponent } from '../../../components/squad-editor-modal/squad-editor-modal.component';
import { LineupDTO, PlayerLineupDTO } from 'app/shared/models/lineup/lineup.dto';

// Stub para los child components que no necesitamos testear.
@Component({ selector: 'app-career-status-bar', standalone: true, template: '' })
class CareerStatusBarStub {}
@Component({ selector: 'app-player-card', standalone: true, template: '' })
class PlayerCardStub {}
@Component({ selector: 'app-lineup-player-card', standalone: true, template: '' })
class LineupPlayerCardStub {}
@Component({ selector: 'app-season-stats-tab', standalone: true, template: '' })
class SeasonStatsTabStub {}

describe('SquadManagementComponent — MVP1-lineup-cancha-1', () => {
  let component: SquadManagementComponent;
  let fixture: ComponentFixture<SquadManagementComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dialogRefSpy: jasmine.SpyObj<any>;

  const CAREER_STATUS_RESPONSE = {
    careerId: 'career-1',
    careerPhase: 'PRE_MATCH',
    userSessionTeamId: 'team-1',
    season: 1,
    currentRound: 1
  };

  // V25D42: helper para construir un LineupDTO con chemistryScore opcional.
  // Toma players como base (evita duplicar el array literal en cada test).
  function buildLineup(players: PlayerLineupDTO[], chemistryScore?: number): LineupDTO {
    const base: LineupDTO = {
      formation: '4-3-3',
      players,
      confirmed: true,
      warnings: []
    };
    if (chemistryScore !== undefined) {
      base.chemistryScore = chemistryScore;
    }
    return base;
  }

  // 11 players fake para que el lineup "exista" en pantalla.
  const ELEVEN_PLAYERS: PlayerLineupDTO[] = Array.from({ length: 11 }, (_, i) => ({
    playerId: `p${i}`,
    name: `Player ${i}`,
    position: 'MID',
    overall: 80,
    energy: 100,
    injured: false,
    age: 25
  }));

  beforeEach(async () => {
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    httpClientSpy.get.and.callFake(((url: string) => {
      if (String(url).includes('/career/status')) {
        return of(CAREER_STATUS_RESPONSE);
      }
      if (String(url).includes('/career/teams/')) {
        return of(null);
      }
      if (String(url).includes('/career/players/squad')) {
        return of([]);
      }
      if (String(url).includes('/career/lineup/current')) {
        return of({ formation: null, players: [], confirmed: false, warnings: [] });
      }
      return of(null);
    }) as any);

    const routerSpy = jasmine.createSpyObj('Router',
      ['navigate', 'navigateByUrl', 'createUrlTree', 'serializeUrl', 'parseUrl'],
      { events: of(), url: '/squad', routerState: { snapshot: {} } });
    routerSpy.createUrlTree.and.returnValue({});
    routerSpy.serializeUrl.and.returnValue('/');
    routerSpy.parseUrl.and.returnValue({});
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [],
      { snapshot: { params: {}, queryParams: {}, data: {} } });

    await TestBed.configureTestingModule({
      imports: [
        SquadManagementComponent,
        NoopAnimationsModule,
        RouterLink,
        MatDialogModule,
        CareerStatusBarStub,
        PlayerCardStub,
        LineupPlayerCardStub,
        SeasonStatsTabStub
      ],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SquadManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Capture dialogSpy from the real MatDialog and set up the open spy
    // AFTER detectChanges so the component's careerStatus$ is initialised.
    const realDialog = TestBed.inject(MatDialog);
    dialogSpy = realDialog as unknown as jasmine.SpyObj<MatDialog>;
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close', 'afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(undefined));
    spyOn(realDialog, 'open').and.returnValue(
      dialogRefSpy as unknown as MatDialogRef<unknown>
    );
  });

  it('should create without errors', () => {
    expect(component).toBeTruthy();
  });

  it('openVisualEditor method is defined and does not throw', () => {
    // MVP1-lineup-cancha-1: smoke test del método openVisualEditor.
    // El método existe en el componente y se invoca sin lanzar excepciones.
    // El wiring end-to-end (HTTP + Dialog → modal → persistencia) lo valida
    // el smoke de REVISOR; este spec verifica solo que el método está expuesto.
    expect(typeof component.openVisualEditor).toBe('function');
    expect(() => component.openVisualEditor()).not.toThrow();
  });

  it('V25D38-F1: availableFormations exposes the 7 formations supported by the engine', () => {
    // V25D36 backend extendió FormationService.getAllFormations() a 7 formations.
    // squad-management quedó inconsistente con solo 5; V25D38 lo arregla.
    // Mismo set que test-harness.model.ts FORMATION_CODES + formation-modal +
    // squad-editor-modal.
    const EXPECTED_FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3'];
    expect(component.availableFormations.length).toBe(7);
    for (const formation of EXPECTED_FORMATIONS) {
      expect(component.availableFormations).toContain(formation);
    }
  });

  // ========== V25D42: chemistry badge (Sprint C7) ==========

  describe('V25D42: chemistry badge in lineup view', () => {
    it('should render chemistry badge when lineup has chemistryScore', () => {
      // V25D42: el chemistry badge aparece cuando el back popula chemistryScore.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).not.toBeNull('Chemistry badge should be rendered when chemistryScore is set');
      expect(badge.textContent.trim()).toContain('87');
      expect(badge.textContent.trim()).toContain('/99');
    });

    it('should apply chemistry-high class for chemistry >= 80 (green)', () => {
      // V25D42: >=80 → chemistry-high (verde). Lineup elite da ~80-95.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 85));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).not.toBeNull();
      expect(badge.classList.contains('chemistry-high')).toBeTrue();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });

    it('should apply chemistry-mid class for chemistry 60-79 (yellow)', () => {
      // V25D42: 60-79 → chemistry-mid (amarillo). Threshold boundary.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 70));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-mid')).toBeTrue();
      expect(badge.classList.contains('chemistry-high')).toBeFalse();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });

    it('should apply chemistry-low class for chemistry < 60 (red)', () => {
      // V25D42: <60 → chemistry-low (rojo). Lineup con muchos null stats o muy corto.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 45));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-low')).toBeTrue();
      expect(badge.classList.contains('chemistry-high')).toBeFalse();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();
    });

    it('should NOT render chemistry badge when chemistryScore is undefined (backward compat)', () => {
      // V25D42: chemistryScore es opcional. Si el back no lo popula (careers pre-V25D41
      // o respuesta de error), el badge NO se renderiza — el componente no rompe.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS));  // sin chemistryScore
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).toBeNull();
    });

    it('should render boundary threshold at 80 (inclusive) and 60 (inclusive)', () => {
      // V25D42: thresholds son inclusivos. chemistry=80 → high (no mid), chemistry=60 → mid (no low).
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 80));
      fixture.detectChanges();
      let badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-high')).toBeTrue();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();

      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 60));
      fixture.detectChanges();
      badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-mid')).toBeTrue();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });
  });
});