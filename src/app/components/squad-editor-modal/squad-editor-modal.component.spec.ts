/**
 * MVP1-lineup-cancha-1: basic spec para {@link SquadEditorModalComponent}.
 *
 * <p>Smoke test: el componente se crea sin errores y dispara las llamadas
 * esperadas al backend (subdivisions + formations + current) en init.
 *
 * <p>El componente es complejo (1293 líneas, click-to-assign con 82 slots)
 * y depende de Angular Material Dialog. Este spec se mantiene intencionalmente
 * mínimo — el flujo end-to-end (asignar jugador, confirmar, persistir) se
 * valida vía smoke de REVISOR y los E2E HTTP del back cubren la persistencia.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { SquadEditorModalComponent } from './squad-editor-modal.component';

describe('SquadEditorModalComponent — MVP1-lineup-cancha-1', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  const SUBDIVISIONS_RESPONSE = [
    {
      subdivisionId: 'GK-1',
      isGoalkeeper: true,
      sector: 26,
      subIndex: 1,
      left: 35, top: 88, width: 30, height: 10,
      zone: 'GK'
    }
  ];

  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2',
      description: '4 defenders, 4 mids, 2 att',
      defenders: 4, midfielders: 4, attackers: 2, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93,
          actionRangePercent: 5, subdivisionId: 'GK-1' }
      ]
    }
  ];

  const CURRENT_LINEUP_RESPONSE = {
    formation: '4-4-2',
    players: [],
    confirmed: false,
    warnings: [],
    slots: []
  };

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    // Mock the 3 GETs ngOnInit fires: /editor/subdivisions, /editor/formations, /career/lineup/current
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of(SUBDIVISIONS_RESPONSE);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      if (url.includes('/career/lineup/current')) {
        return of(CURRENT_LINEUP_RESPONSE);
      }
      return of([]);
    }) as any);

    // Mock POST (used by auto-select when no players are loaded).
    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      return of({ formation: '4-4-2', players: [], warnings: [] });
    }) as any);

    await TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
  });

  it('should create without errors', () => {
    expect(component).toBeTruthy();
  });

  it('should call /editor/subdivisions on init', () => {
    fixture.detectChanges(); // triggers ngOnInit
    const subdivisionsCall = httpClientSpy.get.calls.allArgs()
      .find(args => String(args[0]).includes('/editor/subdivisions'));
    expect(subdivisionsCall).toBeTruthy(
      'ngOnInit should GET /api/v1/editor/subdivisions');
  });

  it('should call /editor/formations on init', (done) => {
    fixture.detectChanges();
    // loadSubdivisions uses setTimeout(0) before chaining formations load.
    // Use a small async wait to allow the chain to complete.
    setTimeout(() => {
      const formationsCall = httpClientSpy.get.calls.allArgs()
        .find(args => String(args[0]).includes('/editor/formations'));
      expect(formationsCall).toBeTruthy(
        'ngOnInit should GET /api/v1/editor/formations');
      done();
    }, 20);
  });
});

/**
 * MVP1-lineup-cancha-1.5: specs para los fixes F3 (loadSquadFromBackend usa
 * formation del response antes de role-match) y F4 (executeFormationChange
 * llama saveLineup después del auto-select).
 */
describe('SquadEditorModalComponent — MVP1-lineup-cancha-1.5 fixes', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  const SUBDIVISIONS_RESPONSE = [
    {
      subdivisionId: 'GK-1',
      isGoalkeeper: true,
      sector: 26,
      subIndex: 1,
      left: 35, top: 88, width: 30, height: 10,
      zone: 'GK'
    }
  ];

  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2',
      description: '4-4-2',
      defenders: 4, midfielders: 4, attackers: 2, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93,
          actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'LB', xPercent: 11, yPercent: 83,
          actionRangePercent: 7, subdivisionId: 'S22-1' }
      ]
    },
    {
      name: '4-3-3',
      description: '4-3-3',
      defenders: 4, midfielders: 3, attackers: 3, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93,
          actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'LB', xPercent: 11, yPercent: 83,
          actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CB', xPercent: 33, yPercent: 83,
          actionRangePercent: 6, subdivisionId: 'S22-2' },
        { index: 3, role: 'CB', xPercent: 67, yPercent: 83,
          actionRangePercent: 6, subdivisionId: 'S23-2' },
        { index: 4, role: 'RB', xPercent: 89, yPercent: 83,
          actionRangePercent: 7, subdivisionId: 'S24-3' },
        { index: 5, role: 'CM', xPercent: 30, yPercent: 50,
          actionRangePercent: 8, subdivisionId: 'S13-2' },
        { index: 6, role: 'CM', xPercent: 50, yPercent: 55,
          actionRangePercent: 7, subdivisionId: 'S14-2' },
        { index: 7, role: 'CM', xPercent: 70, yPercent: 50,
          actionRangePercent: 8, subdivisionId: 'S15-2' },
        { index: 8, role: 'LW', xPercent: 11, yPercent: 17,
          actionRangePercent: 7, subdivisionId: 'S04-1' },
        { index: 9, role: 'ST', xPercent: 50, yPercent: 12,
          actionRangePercent: 6, subdivisionId: 'S05-2' },
        { index: 10, role: 'RW', xPercent: 89, yPercent: 17,
          actionRangePercent: 7, subdivisionId: 'S06-3' }
      ]
    }
  ];

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    // Defaults for subdivisions + formations. /current gets overridden per test.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of(SUBDIVISIONS_RESPONSE);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      return of(null);
    }) as any);

    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      return of({ formation: '4-4-2', players: [], warnings: [] });
    }) as any);

    await TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
  });

  // ===== F3 — loadSquadFromBackend setea selectedFormation del response =====

  it('F3 — loadSquadFromBackend setea selectedFormation del response antes del role-match', (done) => {
    // El back retorna formation 4-3-3 (no la default 4-4-2)
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations')) return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: '4-3-3',
          players: [],
          confirmed: false,
          warnings: [],
          slots: []
        });
      }
      return of(null);
    }) as any);

    fixture.detectChanges(); // triggers ngOnInit -> loadSquadFromBackend
    setTimeout(() => {
      expect(component.selectedFormation).toBe('4-3-3',
        'selectedFormation debe ser la del response, no la default 4-4-2');
      done();
    }, 30);
  });

  it('F3 — loadSquadFromBackend con formation null usa default 4-4-2', (done) => {
    // El back NO retorna formation (legacy save)
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations')) return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: null,
          players: [],
          confirmed: false,
          warnings: [],
          slots: []
        });
      }
      return of(null);
    }) as any);

    fixture.detectChanges();
    setTimeout(() => {
      // 4-4-2 default debe aplicarse
      expect(component.selectedFormation).toBe('4-4-2');
      done();
    }, 30);
  });

  // ===== F4 — executeFormationChange llama saveLineup después del auto-select =====

  it('F4 — executeFormationChange llama a saveLineup después del auto-select', (done) => {
    // Auto-select retorna 11 players con posiciones matching 4-3-3 formation
    // (GK + LB + 2 CB + RB + 3 CM + LW + ST + RW) para que role-match asigne
    // todos a slots y saveLineup NO se bloquee por el guard de playerCount < 7.
    const elevenPlayers = [
      { playerId: 'p-gk', name: 'GK', position: 'GK', overall: 80, energy: 100, injured: false },
      { playerId: 'p-lb', name: 'LB', position: 'LB', overall: 80, energy: 100, injured: false },
      { playerId: 'p-cb1', name: 'CB1', position: 'CB', overall: 80, energy: 100, injured: false },
      { playerId: 'p-cb2', name: 'CB2', position: 'CB', overall: 80, energy: 100, injured: false },
      { playerId: 'p-rb', name: 'RB', position: 'RB', overall: 80, energy: 100, injured: false },
      { playerId: 'p-cm1', name: 'CM1', position: 'CM', overall: 80, energy: 100, injured: false },
      { playerId: 'p-cm2', name: 'CM2', position: 'CM', overall: 80, energy: 100, injured: false },
      { playerId: 'p-cm3', name: 'CM3', position: 'CM', overall: 80, energy: 100, injured: false },
      { playerId: 'p-lw', name: 'LW', position: 'LW', overall: 80, energy: 100, injured: false },
      { playerId: 'p-st', name: 'ST', position: 'ST', overall: 80, energy: 100, injured: false },
      { playerId: 'p-rw', name: 'RW', position: 'RW', overall: 80, energy: 100, injured: false }
    ];

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations')) return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: '4-4-2',
          players: elevenPlayers,
          confirmed: false,
          warnings: [],
          slots: []
        });
      }
      return of(null);
    }) as any);

    httpClientSpy.post.and.callFake(((url: string, _body: any) => {
      if (url.includes('/career/lineup/auto-select')) {
        return of({ formation: '4-3-3', players: elevenPlayers, warnings: [] });
      }
      if (url.includes('/career/lineup/manual-select')) {
        return of({ players: elevenPlayers, warnings: [] });
      }
      if (url.includes('/career/lineup/confirm')) {
        return of({ confirmed: true, warnings: [] });
      }
      return of({});
    }) as any);

    fixture.detectChanges();

    // Esperar a que termine la inicialización (loadSquadFromBackend + formations + current)
    setTimeout(() => {
      // Forzar selectedFormation a 4-3-3 y disparar onFormationChange
      component.selectedFormation = '4-3-3';
      component.onFormationChange();

      // Esperar a que el Promise de executeFormationChange se resuelva
      // y saveLineup dispare los POSTs a /manual-select y /confirm
      setTimeout(() => {
        const allPostUrls = httpClientSpy.post.calls.allArgs()
          .map(args => String(args[0]));

        expect(allPostUrls.some(u => u.includes('/career/lineup/auto-select')))
          .toBe(true, 'debe haberse llamado /career/lineup/auto-select');
        expect(allPostUrls.some(u => u.includes('/career/lineup/manual-select')))
          .toBe(true, 'F4: debe haberse llamado /career/lineup/manual-select (saveLineup defensivo)');
        done();
      }, 50);
    }, 30);
  });
});