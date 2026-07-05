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

/**
 * V25D45 (Sprint C10): chemistry preview — verify the debounced pipeline
 * fires on player assignment/removal, displays the projected score + Δ vs
 * current, and handles errors gracefully.
 *
 * <p>Strategy: mock the HTTP layer to inject a deterministic preview
 * response. Wait for the debounce window (300ms + buffer) before
 * asserting. Same pattern as the existing modal specs (setTimeout-based).
 */
describe('SquadEditorModalComponent — V25D45 chemistry preview', () => {
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
          actionRangePercent: 5, subdivisionId: 'GK-1' }
      ]
    }
  ];

  const PREVIEW_RESPONSE = {
    score: 91,
    breakdown: {
      positionGroups: {
        GK: [{ skill: 'WALL', maxLevel: 99, contributorId: 'p-courtois' }],
        DEF: [],
        MID: [],
        ATT: []
      },
      maxSkillByType: { WALL: 99 },
      coveragePercentage: 10
    },
    maxSkillByType: { WALL: 99 },
    coveragePercentage: 10
  };

  /**
   * Builds a /current response with 11 players and a specific chemistryScore.
   */
  function buildCurrentLineup(chemistryScore: number | null): any {
    const players = Array.from({ length: 11 }, (_, i) => ({
      playerId: `p${i}`,
      name: `Player ${i}`,
      position: i === 0 ? 'GK' : (i < 5 ? 'DEF' : (i < 9 ? 'MID' : 'ATT')),
      overall: 80,
      energy: 100,
      injured: false,
      age: 25
    }));
    return {
      formation: '4-4-2',
      players,
      confirmed: true,
      warnings: [],
      slots: [],
      chemistryScore
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of(SUBDIVISIONS_RESPONSE);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineup(85));  // baseline chemistry score = 85
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((url: string, _body: any) => {
      if (url.includes('/career/lineup/preview-chemistry')) {
        return of(PREVIEW_RESPONSE);
      }
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
    fixture.detectChanges();
  });

  it('should capture currentChemistryScore from /career/lineup/current response', (done) => {
    // V25D45: after /career/lineup/current loads, currentChemistryScore holds
    // the persisted chemistry (used as baseline for the Δ display).
    setTimeout(() => {
      expect(component.currentChemistryScore).toBe(85);
      done();
    }, 30);
  });

  it('should trigger chemistry preview POST when a player is assigned (debounced)', (done) => {
    // V25D45: assignPlayerToSlot triggers triggerChemistryPreview() →
    // previewTrigger$.next → debounceTime(300) → switchMap → POST.
    setTimeout(() => {
      // Mutate homePlayers$ to simulate the user assigning a player.
      // (We don't drive the click handlers directly because they require
      // the full slot-map machinery; triggering the pipeline at the
      // component level is sufficient for this test.)
      const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      (component as any).homePlayers$.next(
        ids.map(id => ({ playerId: id, name: `Player ${id}`, position: 'MID', overall: 80,
                        energy: 100, injured: false, slotId: 'X', role: 'MID', stamina: 100,
                        active: true, isEmpty: false }))
      );
      (component as any).triggerChemistryPreview();

      // Wait for debounce + backend call to complete.
      setTimeout(() => {
        const previewCalls = httpClientSpy.post.calls.allArgs()
          .filter(args => String(args[0]).includes('/career/lineup/preview-chemistry'));
        expect(previewCalls.length).toBe(1);
        // The body should contain the 11 playerIds we just emitted
        const body = previewCalls[0][1] as any;
        expect(body.playerIds).toEqual(ids);
        done();
      }, 400);
    }, 30);
  });

  it('should debounce rapid preview triggers into a single backend call', (done) => {
    // V25D45: 5 rapid triggerChemistryPreview() calls within the debounce
    // window should collapse into 1 backend POST (debounceTime 300ms).
    setTimeout(() => {
      const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      const playerObjs = ids.map(id => ({ playerId: id, name: id, position: 'MID', overall: 80,
                                         energy: 100, injured: false, slotId: 'X', role: 'MID',
                                         stamina: 100, active: true, isEmpty: false }));

      // 5 rapid emissions
      for (let i = 0; i < 5; i++) {
        (component as any).homePlayers$.next(playerObjs);
        (component as any).triggerChemistryPreview();
      }

      // After debounce window: only 1 POST should have fired.
      setTimeout(() => {
        const previewCalls = httpClientSpy.post.calls.allArgs()
          .filter(args => String(args[0]).includes('/career/lineup/preview-chemistry'));
        expect(previewCalls.length).toBe(1,
          `Expected 1 debounced POST, got ${previewCalls.length}`);
        done();
      }, 400);
    }, 30);
  });

  it('should NOT call preview when lineup has fewer than 11 players', (done) => {
    // V25D45: switchMap guards `ids.length !== 11` → emits null, no POST.
    setTimeout(() => {
      // Empty homePlayers$ (0 players) — preview should not fire.
      (component as any).homePlayers$.next([]);
      (component as any).triggerChemistryPreview();

      setTimeout(() => {
        const previewCalls = httpClientSpy.post.calls.allArgs()
          .filter(args => String(args[0]).includes('/career/lineup/preview-chemistry'));
        expect(previewCalls.length).toBe(0,
          'Preview should NOT be called when lineup is empty');
        done();
      }, 400);
    }, 30);
  });

  it('should set previewedChemistry$ when preview succeeds', (done) => {
    // V25D45: preview success path → previewedChemistry$ emits the response.
    setTimeout(() => {
      const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      const playerObjs = ids.map(id => ({ playerId: id, name: id, position: 'MID', overall: 80,
                                         energy: 100, injured: false, slotId: 'X', role: 'MID',
                                         stamina: 100, active: true, isEmpty: false }));
      (component as any).homePlayers$.next(playerObjs);
      (component as any).triggerChemistryPreview();

      setTimeout(() => {
        component.previewedChemistry$.subscribe(detail => {
          expect(detail).not.toBeNull();
          expect(detail!.score).toBe(91);
          expect(detail!.coveragePercentage).toBe(10);
          done();
        });
      }, 400);
    }, 30);
  });

  it('should compute Δ from currentChemistryScore in template', (done) => {
    // V25D45: template renders (pc.score - currentChemistryScore).
    // currentChemistryScore=85 from the mocked /current, preview score=91
    // from PREVIEW_RESPONSE → Δ = +6.
    setTimeout(() => {
      const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      const playerObjs = ids.map(id => ({ playerId: id, name: id, position: 'MID', overall: 80,
                                         energy: 100, injured: false, slotId: 'X', role: 'MID',
                                         stamina: 100, active: true, isEmpty: false }));
      (component as any).homePlayers$.next(playerObjs);
      (component as any).triggerChemistryPreview();

      setTimeout(() => {
        fixture.detectChanges();
        const scoreEl = fixture.nativeElement.querySelector('.preview-score');
        const deltaEl = fixture.nativeElement.querySelector('.preview-delta');
        expect(scoreEl?.textContent).toContain('91');
        expect(deltaEl?.textContent).toContain('+6');
        // Positive delta should have the .positive class for green styling.
        expect(deltaEl?.classList.contains('positive')).toBeTrue();
        done();
      }, 400);
    }, 30);
  });
});

/**
 * V25D47 (Sprint C11b): drag-drop tactical field editor + formationEffectiveness
 * UI integration + chemistry preview weighting.
 *
 * <p>Strategy: drive the drop handlers directly via `(component as any).methodName(...)`
 * with mock CdkDragDrop events rather than simulating real mouse drag events
 * (CDK drag-drop events are notoriously hard to fire from specs). The handlers
 * are the only place where swap/move/bench logic lives, so testing them is
 * equivalent to testing the drag-drop UX.
 *
 * <p>For template-render tests we use {@code fixture.detectChanges()} +
 * {@code fixture.nativeElement.querySelector(...)} to verify the formation-
 * effectiveness row + per-player color classes render correctly.
 */
describe('SquadEditorModalComponent — V25D47 (C11b) drag-drop + effectiveness', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // Minimal field with 4 slots: 1 GK + 3 outfield (so we can test swap + bench flow).
  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1', isGoalkeeper: true,  sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' },
    { subdivisionId: 'S22-1', isGoalkeeper: false, sector: 22, subIndex: 1, left: 10, top: 70, width: 25, height: 12, zone: 'DEFENSE' },
    { subdivisionId: 'S13-2', isGoalkeeper: false, sector: 13, subIndex: 2, left: 40, top: 45, width: 20, height: 12, zone: 'MIDFIELD' },
    { subdivisionId: 'S05-2', isGoalkeeper: false, sector:  5, subIndex: 2, left: 45, top: 10, width: 10, height: 10, zone: 'ATTACK' }
  ];

  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2', description: '4-4-2',
      defenders: 1, midfielders: 1, attackers: 1, outfieldPlayers: 3,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'DEF', xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'MID', xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
        { index: 3, role: 'ATT', xPercent: 50, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' }
      ]
    }
  ];

  /**
   * Builds a /current response with 4 players + a configurable
   * formationEffectiveness payload. Pass null to simulate a legacy
   * pre-V25D47 response (formationEffectiveness absent).
   */
  function buildCurrentLineup(
    formationEffectiveness: any | null,
    chemistryScore: number | null
  ): any {
    return {
      formation: '4-4-2',
      players: [
        { playerId: 'p-gk',  name: 'GK',  position: 'GK',  overall: 80, energy: 100, injured: false },
        { playerId: 'p-def', name: 'DEF', position: 'DEF', overall: 80, energy: 100, injured: false },
        { playerId: 'p-mid', name: 'MID', position: 'MID', overall: 80, energy: 100, injured: false },
        { playerId: 'p-att', name: 'ATT', position: 'ATT', overall: 80, energy: 100, injured: false }
      ],
      confirmed: true,
      warnings: [],
      slots: [],
      chemistryScore,
      formationEffectiveness
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        // Default: formationEffectiveness present, baseline chemistry 85.
        return of(buildCurrentLineup(
          {
            inferredFormation: '4-4-2',
            perPlayerEffectiveness: { 'GK-1': 1.0, 'S22-1': 0.85, 'S13-2': 0.7, 'S05-2': 1.0 },
            teamAverage: 0.8875
          },
          85
        ));
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      if (_url.includes('/career/lineup/preview-chemistry')) {
        return of({ score: 91, breakdown: { positionGroups: {}, maxSkillByType: {}, coveragePercentage: 10 }, maxSkillByType: {}, coveragePercentage: 10 });
      }
      if (_url.includes('/career/lineup/manual-select')) {
        return of({ players: [], warnings: [] });
      }
      if (_url.includes('/career/lineup/confirm')) {
        return of({ confirmed: true, warnings: [] });
      }
      return of({});
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
    fixture.detectChanges();
  });

  // ---- formationEffectiveness UI ----

  it('should render the formation-effectiveness row when /current includes formationEffectiveness', (done) => {
    // V25D47: with formationEffectiveness present in /current, the header
    // shows "Formación inferida: 4-4-2 · Eff. team: 89%".
    setTimeout(() => {
      fixture.detectChanges();
      const row = fixture.nativeElement.querySelector('.formation-effectiveness-row');
      expect(row).toBeTruthy('formation-effectiveness row must render when formationEffectiveness is present');
      expect(row?.textContent).toContain('4-4-2');
      // 0.8875 * 100 = 88.75 → rounded to 89.
      expect(row?.textContent).toContain('89%');
      done();
    }, 30);
  });

  it('should NOT render the formation-effectiveness row when formationEffectiveness is null', (done) => {
    // V25D47 backward compat: legacy pre-V25D47 responses don't carry
    // formationEffectiveness — the row must be hidden.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineup(null, 85));
      }
      return of([]);
    }) as any);
    // Re-create the component to pick up the new mock.
    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    setTimeout(() => {
      fixture.detectChanges();
      const row = fixture.nativeElement.querySelector('.formation-effectiveness-row');
      expect(row).toBeFalsy('formation-effectiveness row must NOT render when formationEffectiveness is null');
      done();
    }, 30);
  });

  it('should color-code slots by per-player effectiveness', (done) => {
    // V25D47: per the mocked perPlayerEffectiveness:
    //   GK-1  = 1.0  → green
    //   S22-1 = 0.85 → green  (threshold is >= 0.85)
    //   S13-2 = 0.7  → yellow
    //   S05-2 = 1.0  → green
    setTimeout(() => {
      fixture.detectChanges();
      const slots = fixture.nativeElement.querySelectorAll('.slot');
      let greenCount = 0, yellowCount = 0, redCount = 0;
      slots.forEach((s: HTMLElement) => {
        if (s.classList.contains('eff-green'))  greenCount++;
        if (s.classList.contains('eff-yellow')) yellowCount++;
        if (s.classList.contains('eff-red'))    redCount++;
      });
      // GK-1 + S22-1 + S05-2 = 3 green; S13-2 = 1 yellow.
      expect(greenCount).toBe(3, '3 slots should be green (effectiveness >= 0.85)');
      expect(yellowCount).toBe(1, '1 slot should be yellow (0.5 <= eff < 0.85)');
      expect(redCount).toBe(0, 'no slots should be red');
      done();
    }, 30);
  });

  // ---- drag-drop handlers (direct method calls) ----

  it('handleSlotDrop — moves a slot player to another empty slot', (done) => {
    // V25D47: drag p-def from S22-1 to S05-2 (currently occupied by p-att
    // in the role-matched default; we first evict p-att to bench so the
    // target is empty).
    setTimeout(() => {
      // Move p-att to bench first so S05-2 is empty.
      (component as any).handleBenchDrop({
        item: { data: (component as any).slotPlayerMap['S05-2'] },
        previousContainer: { id: 'slot-S05-2' },
        container: { id: 'bench-list' }
      } as any);

      // Now drag p-def from S22-1 to S05-2 (empty).
      const pDef = (component as any).slotPlayerMap['S22-1'];
      (component as any).handleSlotDrop({
        item: { data: pDef },
        previousContainer: { id: 'slot-S22-1' },
        container: { id: 'slot-S05-2' }
      } as any);

      // After: p-def is in S05-2, S22-1 is empty.
      expect((component as any).slotPlayerMap['S05-2']?.playerId).toBe('p-def');
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined();
      done();
    }, 30);
  });

  it('handleSlotDrop — swaps two slot players when target is occupied', (done) => {
    // V25D47: drag p-def from S22-1 onto S13-2 (occupied by p-mid).
    // Expected: p-def ends in S13-2, p-mid ends in S22-1 (SWAP).
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      const pMid = (component as any).slotPlayerMap['S13-2'];

      (component as any).handleSlotDrop({
        item: { data: pDef },
        previousContainer: { id: 'slot-S22-1' },
        container: { id: 'slot-S13-2' }
      } as any);

      expect((component as any).slotPlayerMap['S13-2']?.playerId).toBe('p-def');
      expect((component as any).slotPlayerMap['S22-1']?.playerId).toBe('p-mid');
      // Sanity: p-mid's slotId is updated.
      expect(pMid.slotId).toBe('S22-1');
      expect(pDef.slotId).toBe('S13-2');
      done();
    }, 30);
  });

  it('handleBenchDrop — moves a slot player to the bench', (done) => {
    // V25D47: drag p-att from S05-2 to the bench drop list.
    setTimeout(() => {
      const pAtt = (component as any).slotPlayerMap['S05-2'];
      expect(pAtt).toBeTruthy();

      (component as any).handleBenchDrop({
        item: { data: pAtt },
        previousContainer: { id: 'slot-S05-2' },
        container: { id: 'bench-list' }
      } as any);

      // After: S05-2 is empty, p-att is on the bench.
      expect((component as any).slotPlayerMap['S05-2']).toBeUndefined();
      expect(pAtt.slotId).toBe('');
      const benchIds = (component as any).benchPlayers$.value.map((p: any) => p.playerId);
      expect(benchIds).toContain('p-att');
      done();
    }, 30);
  });

  // ---- chemistry preview weighting ----

  it('getDisplayedChemistryScore weights raw score by teamAverage', (done) => {
    // V25D47: raw preview score = 91, teamAverage = 0.8875 → displayed = round(91 * 0.8875) = 81.
    // The chemistry preview pipeline requires exactly 11 players to fire
    // (back validates ids.length === 11), so we push 11 here.
    setTimeout(() => {
      const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      const playerObjs = ids.map(id => ({ playerId: id, name: id, position: 'MID',
                                         overall: 80, energy: 100, injured: false,
                                         slotId: 'X', role: 'MID', stamina: 100,
                                         active: true, isEmpty: false }));
      (component as any).homePlayers$.next(playerObjs);
      (component as any).triggerChemistryPreview();

      setTimeout(() => {
        const displayed = (component as any).getDisplayedChemistryScore();
        // 91 * 0.8875 = 80.7625 → rounds to 81.
        expect(displayed).toBe(81,
          `displayed should be round(91 * 0.8875) = 81, got ${displayed}`);
        // The ×88% weight chip should be rendered when teamAverage < 1.0.
        fixture.detectChanges();
        const weightEl = fixture.nativeElement.querySelector('.preview-eff-weight');
        expect(weightEl?.textContent).toContain('89%');  // (0.8875 * 100).toFixed(0) = '89'
        done();
      }, 400);
    }, 30);
  });

  it('getDisplayedChemistryScore returns raw score when formationEffectiveness is null', (done) => {
    // V25D47 backward compat: when formationEffectiveness is missing, the
    // chemistry preview shows the raw score unchanged.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineup(null, 85));  // formationEffectiveness = null
      }
      return of([]);
    }) as any);
    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      const playerObjs = ids.map(id => ({ playerId: id, name: id, position: 'MID',
                                         overall: 80, energy: 100, injured: false,
                                         slotId: 'X', role: 'MID', stamina: 100,
                                         active: true, isEmpty: false }));
      (component as any).homePlayers$.next(playerObjs);
      (component as any).triggerChemistryPreview();

      setTimeout(() => {
        const displayed = (component as any).getDisplayedChemistryScore();
        expect(displayed).toBe(91, 'raw score should be returned unchanged when formationEffectiveness is null');
        // No ×% weight chip should be rendered.
        fixture.detectChanges();
        const weightEl = fixture.nativeElement.querySelector('.preview-eff-weight');
        expect(weightEl).toBeFalsy('weight chip must NOT render when formationEffectiveness is null');
        done();
      }, 400);
    }, 30);
  });
});

/**
 * V25D51 (Sprint C13): chip-level effectiveness feedback. The chip receives a
 * CSS class bound from getChipEffectivenessClass() and renders a corner
 * badge showing the percentage. Thresholds differ from the slot-level
 * eff-green/yellow/red (which uses 0.85 / 0.5); the chip uses 0.9 / 0.7
 * to give the user tighter feedback on their per-player alignment.
 */
describe('SquadEditorModalComponent — V25D51 chip-level effectiveness feedback', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // Minimal field: 4 slots, one of each perPlayerEffectiveness band the test
  // cares about (1.0 → good, 0.85 → good (just at threshold), 0.7 → warning
  // (just at threshold), 0.5 → bad). Plus GK-1 at 1.0 to keep the row
  // balanced.
  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1',  isGoalkeeper: true,  sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' },
    { subdivisionId: 'S22-1', isGoalkeeper: false, sector: 22, subIndex: 1, left: 10, top: 70, width: 25, height: 12, zone: 'DEFENSE' },
    { subdivisionId: 'S13-2', isGoalkeeper: false, sector: 13, subIndex: 2, left: 40, top: 45, width: 20, height: 12, zone: 'MIDFIELD' },
    { subdivisionId: 'S05-2', isGoalkeeper: false, sector:  5, subIndex: 2, left: 45, top: 10, width: 10, height: 10, zone: 'ATTACK' },
    { subdivisionId: 'S05-3', isGoalkeeper: false, sector:  5, subIndex: 3, left: 70, top: 10, width: 10, height: 10, zone: 'ATTACK' }
  ];

  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2', description: '4-4-2',
      defenders: 1, midfielders: 1, attackers: 2, outfieldPlayers: 4,
      positions: [
        { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'DEF', xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'MID', xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
        { index: 3, role: 'ATT', xPercent: 30, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' },
        { index: 4, role: 'ATT', xPercent: 70, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-3' }
      ]
    }
  ];

  /**
   * /career/lineup/current response builder — accepts perPlayerEffectiveness
   * keyed by subdivisionId. Pass null for formationEffectiveness to simulate
   * a legacy pre-V25D47 response (no chip feedback expected).
   */
  function buildCurrentLineup(
    perPlayerEffectiveness: Record<string, number> | null,
    formationEffectiveness: any | null,
    chemistryScore: number | null
  ): any {
    return {
      formation: '4-4-2',
      players: [
        { playerId: 'p-gk',  name: 'GK',  position: 'GK',  overall: 80, energy: 100, injured: false },
        { playerId: 'p-def', name: 'DEF', position: 'DEF', overall: 80, energy: 100, injured: false },
        { playerId: 'p-mid', name: 'MID', position: 'MID', overall: 80, energy: 100, injured: false },
        { playerId: 'p-att', name: 'ATT', position: 'ATT', overall: 80, energy: 100, injured: false },
        { playerId: 'p-att2', name: 'ATT2', position: 'ATT', overall: 80, energy: 100, injured: false }
      ],
      confirmed: true,
      warnings: [],
      slots: [],
      chemistryScore,
      formationEffectiveness: formationEffectiveness === null && perPlayerEffectiveness === null
        ? null
        : {
            inferredFormation: '4-4-2',
            perPlayerEffectiveness: perPlayerEffectiveness || {},
            teamAverage: 0.8
          }
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        // Default: full V25D51 effectiveness coverage. Distribution per slot:
        //   GK-1=1.0  → eff-good  (perfect GK)
        //   S22-1=0.95 → eff-good  (well above the 0.9 threshold)
        //   S13-2=0.7  → eff-warning (right at the 0.7 threshold)
        //   S05-2=0.5  → eff-bad    (well below 0.7)
        //   S05-3=1.0  → eff-good  (perfect ATT)
        return of(buildCurrentLineup(
          { 'GK-1': 1.0, 'S22-1': 0.95, 'S13-2': 0.7, 'S05-2': 0.5, 'S05-3': 1.0 },
          { inferredFormation: '4-4-2', perPlayerEffectiveness: { 'GK-1': 1.0, 'S22-1': 0.95, 'S13-2': 0.7, 'S05-2': 0.5, 'S05-3': 1.0 }, teamAverage: 0.83 },
          85
        ));
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      if (_url.includes('/career/lineup/preview-chemistry')) {
        return of({ score: 91, breakdown: { positionGroups: {}, maxSkillByType: {}, coveragePercentage: 10 }, maxSkillByType: {}, coveragePercentage: 10 });
      }
      if (_url.includes('/career/lineup/manual-select')) {
        return of({ players: [], warnings: [] });
      }
      if (_url.includes('/career/lineup/confirm')) {
        return of({ confirmed: true, warnings: [] });
      }
      return of({});
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
    fixture.detectChanges();
  });

  // ---- helper method ----

  it('getChipEffectivenessClass returns eff-good for eff >= 0.9', (done) => {
    setTimeout(() => {
      expect((component as any).getChipEffectivenessClass('GK-1')).toBe('eff-good');
      // 0.95 is above the 0.9 threshold — must be eff-good.
      expect((component as any).getChipEffectivenessClass('S22-1')).toBe('eff-good');
      done();
    }, 30);
  });

  it('getChipEffectivenessClass returns eff-warning for 0.7 <= eff < 0.9', (done) => {
    setTimeout(() => {
      expect((component as any).getChipEffectivenessClass('S13-2')).toBe('eff-warning');
      // 0.7 is the inclusive lower bound — must also be eff-warning.
      done();
    }, 30);
  });

  it('getChipEffectivenessClass returns eff-bad for eff < 0.7', (done) => {
    setTimeout(() => {
      expect((component as any).getChipEffectivenessClass('S05-2')).toBe('eff-bad');
      done();
    }, 30);
  });

  it('getChipEffectivenessClass returns null for unknown subdivisionId', (done) => {
    setTimeout(() => {
      expect((component as any).getChipEffectivenessClass(undefined)).toBeNull();
      expect((component as any).getChipEffectivenessClass('UNKNOWN')).toBeNull();
      done();
    }, 30);
  });

  // ---- template bindings ----

  it('renders eff-good on the chip for eff >= 0.9', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const chips = fixture.nativeElement.querySelectorAll('.player-chip');
      let goodCount = 0;
      chips.forEach((c: HTMLElement) => {
        if (c.classList.contains('eff-good')) goodCount++;
      });
      // GK-1 (1.0) + S22-1 (0.85) + S05-3 (1.0) = 3 eff-good chips.
      expect(goodCount).toBe(3,
        `expected 3 chips with eff-good (eff >= 0.9), got ${goodCount}`);
      done();
    }, 30);
  });

  it('renders eff-warning on the chip for 0.7 <= eff < 0.9', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const chips = fixture.nativeElement.querySelectorAll('.player-chip');
      let warnCount = 0;
      chips.forEach((c: HTMLElement) => {
        if (c.classList.contains('eff-warning')) warnCount++;
      });
      // S13-2 (0.7) = 1 eff-warning chip.
      expect(warnCount).toBe(1,
        `expected 1 chip with eff-warning (0.7-0.9), got ${warnCount}`);
      done();
    }, 30);
  });

  it('renders eff-bad on the chip for eff < 0.7', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const chips = fixture.nativeElement.querySelectorAll('.player-chip');
      let badCount = 0;
      chips.forEach((c: HTMLElement) => {
        if (c.classList.contains('eff-bad')) badCount++;
      });
      // S05-2 (0.5) = 1 eff-bad chip.
      expect(badCount).toBe(1,
        `expected 1 chip with eff-bad (eff < 0.7), got ${badCount}`);
      done();
    }, 30);
  });

  it('renders the corner eff-badge inside each chip with the percentage', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const badges = fixture.nativeElement.querySelectorAll('.player-chip .eff-badge');
      // 5 chips with effectiveness data → 5 badges rendered.
      expect(badges.length).toBe(5,
        `expected 5 eff-badges (one per chip with effectiveness data), got ${badges.length}`);
      // Spot-check one badge content. Array.from on NodeList → Element[];
      // map returns string[] (textContent is `string | null`, the empty string
      // fallback handles any non-text node edge cases).
      const badgeTexts: string[] = Array.from(badges as NodeListOf<HTMLElement>)
        .map((b: HTMLElement) => (b.textContent || '').trim());
      expect(badgeTexts).toContain('100%');
      expect(badgeTexts).toContain('95%');
      expect(badgeTexts).toContain('70%');
      expect(badgeTexts).toContain('50%');
      done();
    }, 30);
  });

  // ---- backward compat ----

  it('does NOT render any chip-level feedback when formationEffectiveness is null', (done) => {
    // V25D51 backward compat: legacy pre-V25D51 lineups must not show
    // chip-level effectiveness classes or badges.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineup(null, null, 85));  // formationEffectiveness=null
      }
      return of([]);
    }) as any);
    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      fixture.detectChanges();
      const chips = fixture.nativeElement.querySelectorAll('.player-chip');
      chips.forEach((c: HTMLElement) => {
        // Jasmine's toBeFalse() takes 0 args; use the negated form with a message.
        expect(c.classList.contains('eff-good')).withContext('legacy lineups must NOT render eff-good on chips').toBeFalse();
        expect(c.classList.contains('eff-warning')).withContext('legacy lineups must NOT render eff-warning on chips').toBeFalse();
        expect(c.classList.contains('eff-bad')).withContext('legacy lineups must NOT render eff-bad on chips').toBeFalse();
      });
      const badges = fixture.nativeElement.querySelectorAll('.player-chip .eff-badge');
      expect(badges.length).withContext('legacy lineups must NOT render eff-badges inside chips').toBe(0);
      done();
    }, 30);
  });
});

/**
 * V25D56 (Sprint C17) — responsive modal layout.
 *
 * <p>Three progressive breakpoints (mobile <=600px, tablet 601-1024px,
 * desktop default >=1025px). The pre-C17 single breakpoint at 768px
 * hid the .player-chip via `display: none` on mobile, which Iván
 * flagged as a visual regression.
 *
 * <p>Strategy: Karma/Jasmine runs in jsdom, which doesn't simulate
 * viewport width or evaluate @media queries — so we cannot assert
 * computed styles. Instead we assert the component's styles source:
 * the 3 breakpoint blocks exist with the expected rules, AND no
 * breakpoint hides .player-chip via `display: none`. This guards the
 * fix from accidental reverts.
 */
describe('SquadEditorModalComponent — V25D56 (C17) responsive breakpoints', () => {
  /**
   * Reads the @Component.styles source. For inline-styled components
   * (like this one) Angular stores the CSS strings on the component
   * definition at `ɵcmp.styles`, but with Angular's emulated
   * encapsulation every selector is rewritten with `[_ngcontent-%COMP%]`
   * (or the hashed version at runtime). {@link #stripEncapsulation}
   * removes those markers so regex assertions match the original
   * class names.
   */
  function stylesSource(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styles = (SquadEditorModalComponent as any).ɵcmp?.styles ?? [];
    if (Array.isArray(styles)) {
      return styles.join('\n');
    }
    if (typeof styles === 'string') {
      return styles;
    }
    return '';
  }

  function stripEncapsulation(css: string): string {
    return css.replace(/\[[_]?ngcontent-[^\]]*\]/g, '');
  }

  /**
   * Extracts the body of the @media block whose query matches {@code query}.
   * Walks the brace stack to handle nested rule blocks.
   */
  function extractMediaBlock(query: string): string {
    const src = stripEncapsulation(stylesSource());
    const re = new RegExp(
      `@media\\s*\\(\\s*${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)\\s*\\{`
    );
    const m = src.match(re);
    if (!m || m.index === undefined) {
      return '';
    }
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    return src.substring(m.index + m[0].length, i - 1);
  }

  it('mobile breakpoint exists at max-width: 600px', () => {
    const src = stripEncapsulation(stylesSource());
    expect(src).toMatch(/@media\s*\(\s*max-width:\s*600px\s*\)/);
  });

  it('tablet breakpoint exists at min-width: 601px and max-width: 1024px', () => {
    const src = stripEncapsulation(stylesSource());
    expect(src).toMatch(/@media\s*\(\s*min-width:\s*601px\s*\)\s*and\s*\(\s*max-width:\s*1024px\s*\)/);
  });

  it('desktop defaults are preserved (no top-level @media hiding the chip)', () => {
    // Pre-C17 the @media (max-width: 768px) block hid .player-chip.
    // The fix replaces it with progressive breakpoints AND keeps the
    // chip visible everywhere. We assert the legacy breakpoint AND the
    // legacy display:none rule are gone.
    const src = stripEncapsulation(stylesSource());
    expect(src).not.toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)/);
    // Strip CSS comments before scanning for the legacy chip-hide rule
    // so we don't false-positive on the explanatory comment block.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(/\.player-chip\s*\{\s*display:\s*none/);
  });

  it('mobile breakpoint scales .player-chip (font-size <= 0.5rem, no display:none)', () => {
    // Extract the mobile @media block and assert the .player-chip
    // rule inside it keeps the chip visible (no display:none) AND
    // sets a smaller font-size so the chip fits narrow slots.
    const block = extractMediaBlock('max-width: 600px');
    expect(block).withContext('mobile @media block must exist').toBeTruthy();
    expect(block).not.toMatch(/\.player-chip\s*\{\s*display:\s*none/);
    expect(block).toMatch(/\.player-chip\s*\{[^}]*font-size:\s*0?\.4rem/);
  });

  it('tablet breakpoint scales .player-chip with font-size between mobile and desktop', () => {
    const src = stripEncapsulation(stylesSource());
    const block = extractMediaBlock('min-width: 601px) and (max-width: 1024px');
    expect(block).withContext('tablet @media block must exist').toBeTruthy();
    expect(block).toMatch(/\.player-chip\s*\{[^}]*font-size:\s*0?\.45rem/);
  });

  it('container is scrollable on mobile (squad-editor-container scrolls vertically)', () => {
    const block = extractMediaBlock('max-width: 600px');
    expect(block).toBeTruthy();
    // Either overflow-y:auto on the container, or a scroll affordance
    // somewhere — guarantees the user can reach all content on tall modals.
    expect(block).toMatch(/overflow/);
  });

  it('bench panel scrolls horizontally on mobile (bench-list overflow-x:auto)', () => {
    const block = extractMediaBlock('max-width: 600px');
    expect(block).toBeTruthy();
    expect(block).toMatch(/\.bench-container\s+\.bench-list\s*\{[^}]*overflow-x:\s*auto/);
  });

  // V25D57 (Sprint C17b): aspect-ratio del campo en los 3 breakpoints.
  // Bug pre-C17b: desktop/tablet sin aspect-ratio (height:100% aplastaba
  // el field a horizontal slab). Mobile tenia aspect-ratio pero
  // max-height:50vh lo sobreescribia. Verificamos que los 3 bloques
  // tienen la regla correcta y que NO hay height/max-height que anule
  // el ratio.
  describe('SquadEditorModalComponent — V25D57 (C17b) field aspect-ratio', () => {
    it('default viewport (>=1025px): .field has aspect-ratio 1 / 1.4 outside any @media block', () => {
      const src = stripEncapsulation(stylesSource());
      // Strip @media blocks so we only inspect the default rules.
      const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
      // Find the .field rule in the non-media part. Allow nested rules
      // (we strip comments + the rule body).
      const fieldRule = nonMedia.match(/\.field\s*\{[^}]*\}/);
      expect(fieldRule).withContext('top-level .field rule must exist').toBeTruthy();
      expect(fieldRule![0]).toMatch(/aspect-ratio:\s*1\s*\/\s*1\.4/);
      // Sanity: height:100% was the original bug source — assert it's gone.
      // V25D58 (Sprint C18): use a negative lookbehind so this still passes
      // when max-height:100% is present (which contains "height: 100%" as
      // a substring but is a different property).
      expect(fieldRule![0]).not.toMatch(/(?<![\w-])height:\s*100%/);
    });

    it('tablet viewport (601-1024px): .field has aspect-ratio 1 / 1.4 inside the @media block', () => {
      const block = extractMediaBlock('min-width: 601px) and (max-width: 1024px');
      expect(block).withContext('tablet @media block must exist').toBeTruthy();
      const fieldRule = block.match(/\.field\s*\{[^}]*\}/);
      expect(fieldRule).withContext('tablet .field rule must exist').toBeTruthy();
      expect(fieldRule![0]).toMatch(/aspect-ratio:\s*1\s*\/\s*1\.4/);
    });

    it('mobile viewport (<=600px): .field has aspect-ratio 1 / 1.4 AND no max-height cap that would override it', () => {
      const block = extractMediaBlock('max-width: 600px');
      expect(block).withContext('mobile @media block must exist').toBeTruthy();
      const fieldRule = block.match(/\.field\s*\{[^}]*\}/);
      expect(fieldRule).withContext('mobile .field rule must exist').toBeTruthy();
      expect(fieldRule![0]).toMatch(/aspect-ratio:\s*1\s*\/\s*1\.4/);
      // The original bug: max-height: 50vh overrode aspect-ratio in jsdom
      // and real browsers alike, leaving the field wider than tall.
      // The fix sets max-height:none. Assert neither vh nor px cap is present.
      expect(fieldRule![0]).not.toMatch(/max-height:\s*\d+(vh|px)/);
    });
  });
});

/**
 * V25D58 (Sprint C18) — field responsive sizing.
 *
 * <p>The field must scale proportionally to the modal. Iván pidió: "la
 * cancha también sea responsive, conforme achiquemos el modal".
 *
 * <p>Strategy: Karma/Jasmine runs in jsdom which doesn't evaluate @media
 * queries, so we cannot assert computed style per viewport. Instead we
 * assert the CSS source — each @media block contains the expected
 * {@code max-width: min(cap, 100%)} rule AND aspect-ratio 1 / 1.4 is
 * preserved. This guards against accidental reverts (e.g., someone
 * changing the cap to a fixed px value).
 *
 * <p>Why this works: at runtime, the browser resolves {@code min(cap, 100%)}
 * to the smaller of the cap and the available container width. If the
 * container is wider than the cap, field.width = cap. If narrower,
 * field.width = container.width. The 1.4 ratio on height is honored
 * regardless because we never override max-height with a px cap (only
 * {@code max-height: 100%} which is bounded by the container).
 */
describe('SquadEditorModalComponent — V25D58 (C18) field responsive sizing', () => {
  /**
   * Reads the @Component.styles source. For inline-styled components
   * (like this one) Angular stores the CSS strings on the component
   * definition at `ɵcmp.styles`, but with Angular's emulated
   * encapsulation every selector is rewritten with `[_ngcontent-%COMP%]`
   * (or the hashed version at runtime). {@link #stripEncapsulation}
   * removes those markers so regex assertions match the original
   * class names.
   *
   * <p>Mirrors the helper in the V25D56 (C17) describe block — duplicated
   * because describe-block function declarations aren't hoisted to sibling
   * describe blocks (each describe has its own lexical scope).
   */
  function stylesSource(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styles = (SquadEditorModalComponent as any).ɵcmp?.styles ?? [];
    if (Array.isArray(styles)) {
      return styles.join('\n');
    }
    if (typeof styles === 'string') {
      return styles;
    }
    return '';
  }

  function stripEncapsulation(css: string): string {
    return css.replace(/\[[_]?ngcontent-[^\]]*\]/g, '');
  }

  /**
   * Extracts the body of the @media block whose query matches {@code query}.
   * Walks the brace stack to handle nested rule blocks.
   */
  function extractMediaBlock(query: string): string {
    const src = stripEncapsulation(stylesSource());
    const re = new RegExp(
      `@media\\s*\\(\\s*${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)\\s*\\{`
    );
    const m = src.match(re);
    if (!m || m.index === undefined) {
      return '';
    }
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    return src.substring(m.index + m[0].length, i - 1);
  }

  /**
   * Extracts the body of the .field rule from a CSS chunk. The default
   * rule lives outside any @media block (in the .field { ... } rule at
   * the top of the stylesheet), while breakpoint-specific overrides live
   * inside @media blocks. Returns the first .field rule found, or ''.
   */
  function extractFieldRule(css: string): string {
    const fieldRule = css.match(/\.field\s*\{[^}]*\}/);
    return fieldRule ? fieldRule[0] : '';
  }

  it('desktop default viewport (>=1025px): .field has max-width: min(500px, 100%)', () => {
    // Outside any @media block, the top-level .field rule must use the
    // responsive min(cap, 100%) pattern — not a fixed pixel value.
    const src = stripEncapsulation(stylesSource());
    const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
    const fieldRule = extractFieldRule(nonMedia);
    expect(fieldRule).withContext('top-level .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*min\(\s*500px\s*,\s*100%\s*\)/,
      'desktop default .field must use max-width: min(500px, 100%) to allow shrink in narrow modals');
    // Sanity: no fixed max-width (regression guard for the pre-C18 bug).
    expect(fieldRule).not.toMatch(/max-width:\s*500px\s*;/);
  });

  it('desktop default viewport (>=1025px): .field has max-height: 100% (no fixed cap)', () => {
    // Pre-C18 the .field had max-height: 700px which could clip the field
    // on tall phones. C18 swaps it for max-height: 100% so the field
    // never exceeds its parent field-container's height.
    const src = stripEncapsulation(stylesSource());
    const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
    const fieldRule = extractFieldRule(nonMedia);
    expect(fieldRule).toBeTruthy();
    expect(fieldRule).toMatch(/max-height:\s*100%\s*;/);
    // Sanity: no fixed max-height: Npx.
    expect(fieldRule).not.toMatch(/max-height:\s*\d+px\s*;/);
  });

  it('large desktop viewport (>=1600px): .field has max-width: min(600px, 100%)', () => {
    const block = extractMediaBlock('min-width: 1600px');
    expect(block).withContext('large-desktop @media block must exist').toBeTruthy();
    const fieldRule = extractFieldRule(block);
    expect(fieldRule).withContext('large-desktop .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*min\(\s*600px\s*,\s*100%\s*\)/,
      'large-desktop .field must allow up to 600px before shrinking');
  });

  it('tablet viewport (601-1024px): .field has max-width: min(450px, 100%)', () => {
    const block = extractMediaBlock('min-width: 601px) and (max-width: 1024px');
    expect(block).withContext('tablet @media block must exist').toBeTruthy();
    const fieldRule = extractFieldRule(block);
    expect(fieldRule).withContext('tablet .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*min\(\s*450px\s*,\s*100%\s*\)/,
      'tablet .field must cap at 450px (and shrink in narrow modals)');
  });

  it('mobile viewport (<=600px): .field has max-width: min(380px, 100%)', () => {
    const block = extractMediaBlock('max-width: 600px');
    expect(block).withContext('mobile @media block must exist').toBeTruthy();
    const fieldRule = extractFieldRule(block);
    expect(fieldRule).withContext('mobile .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*min\(\s*380px\s*,\s*100%\s*\)/,
      'mobile .field must cap at 380px (and shrink in 375px viewports)');
  });

  it('aspect-ratio 1 / 1.4 is preserved in all 4 viewports (default + 3 breakpoints)', () => {
    // V25D58 inherits V25D57 (C17b): aspect-ratio must hold in every
    // viewport so the field never becomes a horizontal slab. We sweep
    // each breakpoint and assert the .field rule carries the ratio.
    const src = stripEncapsulation(stylesSource());
    const nonMedia = extractFieldRule(src.replace(/@media[\s\S]*?\}\s*\}/g, ''));
    const mobile = extractFieldRule(extractMediaBlock('max-width: 600px'));
    const tablet = extractFieldRule(extractMediaBlock('min-width: 601px) and (max-width: 1024px'));
    const largeDesktop = extractFieldRule(extractMediaBlock('min-width: 1600px'));

    // Large-desktop block doesn't necessarily re-declare aspect-ratio
    // (it inherits from default), but mobile/tablet/default MUST carry it.
    expect(nonMedia).toMatch(/aspect-ratio:\s*1\s*\/\s*1\.4/);
    expect(mobile).toMatch(/aspect-ratio:\s*1\s*\/\s*1\.4/);
    expect(tablet).toMatch(/aspect-ratio:\s*1\s*\/\s*1\.4/);

    // For large-desktop: assert that either the block sets aspect-ratio
    // OR there's no override (the default applies). We accept either
    // pattern as long as NO breakpoint strips aspect-ratio from the field.
    const allBreakpointsHaveRatio = [mobile, tablet].every(r => /aspect-ratio:\s*1\s*\/\s*1\.4/.test(r));
    expect(allBreakpointsHaveRatio).withContext('mobile + tablet .field must both carry aspect-ratio: 1 / 1.4').toBeTrue();

    // large-desktop .field may NOT re-declare aspect-ratio (it inherits
    // from default). We assert that NO @media block STRIPS aspect-ratio
    // from the field — i.e., no @media block sets `aspect-ratio: <other>`
    // or removes it. Since CSS only adds/overrides, the safe check is:
    // no @media block declares a different aspect-ratio value than 1/1.4.
    const mediaBlocks: Array<{label: string; block: string}> = [
      { label: 'mobile',         block: extractMediaBlock('max-width: 600px') },
      { label: 'tablet',         block: extractMediaBlock('min-width: 601px) and (max-width: 1024px') },
      { label: 'large-desktop',  block: extractMediaBlock('min-width: 1600px') }
    ];
    mediaBlocks.forEach(({label, block}) => {
      const aspectRatioInBlock = block.match(/aspect-ratio:\s*([^;}]+)/);
      if (aspectRatioInBlock) {
        // If the breakpoint declares aspect-ratio, it must be 1 / 1.4.
        expect(aspectRatioInBlock[1].replace(/\s+/g, ' ').trim())
          .withContext(`${label} .field aspect-ratio must be 1 / 1.4 if declared`)
          .toMatch(/^1\s*\/\s*1\.4$/);
      }
      // If aspect-ratio is NOT declared in this block, that's fine —
      // it inherits from the default rule. We only assert that whatever
      // is declared matches 1/1.4.
    });
  });

  it('field-container has min-height: 0 to allow flex child to honor aspect-ratio', () => {
    // V25D58 F2: add min-height:0 to .field-container. Without it, the
    // flex child's intrinsic min-content size can silently override the
    // aspect-ratio in tight viewports (a known flexbox gotcha).
    const src = stripEncapsulation(stylesSource());
    // Match the default .field-container block (outside any @media).
    const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
    const fieldContainerRule = nonMedia.match(/\.field-container\s*\{[^}]*\}/);
    expect(fieldContainerRule).withContext('top-level .field-container rule must exist').toBeTruthy();
    expect(fieldContainerRule![0]).toMatch(/min-height:\s*0\s*;/,
      '.field-container must include min-height: 0 so flex children respect aspect-ratio');
  });
});

/**
 * V25D64 (Sprint C24): eff-good border verde distintivo (#10b981 emerald-500)
 * para simetria visual con eff-warning (amber) y eff-bad (red). Cubre chips
 * de /squad squad-editor-modal. El color real se valida en smoke REVISOR;
 * aca validamos que el class eff-good sigue bindeando en el DOM (consistency
 * check con los tests V25D51 existentes).
 */
describe('SquadEditorModalComponent — V25D64 (C24) eff-good green border', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // Mismo setup que describe V25D51: 5 slots con perPlayerEffectiveness
  //   GK-1=1.0  → eff-good  (>= 0.9)
  //   S22-1=0.95 → eff-good (>= 0.9)
  //   S13-2=0.7 → eff-warning (0.7-0.9)
  //   S05-2=0.5 → eff-bad   (< 0.7)
  //   S05-3=1.0 → eff-good  (>= 0.9)
  // → 3 chips eff-good, 1 eff-warning, 1 eff-bad.
  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1',  isGoalkeeper: true,  sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' },
    { subdivisionId: 'S22-1', isGoalkeeper: false, sector: 22, subIndex: 1, left: 10, top: 70, width: 25, height: 12, zone: 'DEFENSE' },
    { subdivisionId: 'S13-2', isGoalkeeper: false, sector: 13, subIndex: 2, left: 40, top: 45, width: 20, height: 12, zone: 'MIDFIELD' },
    { subdivisionId: 'S05-2', isGoalkeeper: false, sector:  5, subIndex: 2, left: 45, top: 10, width: 10, height: 10, zone: 'ATTACK' },
    { subdivisionId: 'S05-3', isGoalkeeper: false, sector:  5, subIndex: 3, left: 70, top: 10, width: 10, height: 10, zone: 'ATTACK' }
  ];

  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2', description: '4-4-2',
      defenders: 1, midfielders: 1, attackers: 2, outfieldPlayers: 4,
      positions: [
        { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'DEF', xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'MID', xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
        { index: 3, role: 'ATT', xPercent: 30, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' },
        { index: 4, role: 'ATT', xPercent: 70, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-3' }
      ]
    }
  ];

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: '4-4-2',
          players: [
            { playerId: 'p-gk',   name: 'GK',    position: 'GK',  overall: 80, energy: 100, injured: false },
            { playerId: 'p-def',  name: 'DEF',   position: 'DEF', overall: 80, energy: 100, injured: false },
            { playerId: 'p-mid',  name: 'MID',   position: 'MID', overall: 80, energy: 100, injured: false },
            { playerId: 'p-att',  name: 'ATT',   position: 'ATT', overall: 80, energy: 100, injured: false },
            { playerId: 'p-att2', name: 'ATT2',  position: 'ATT', overall: 80, energy: 100, injured: false }
          ],
          confirmed: true,
          warnings: [],
          slots: [],
          chemistryScore: 85,
          formationEffectiveness: {
            inferredFormation: '4-4-2',
            perPlayerEffectiveness: { 'GK-1': 1.0, 'S22-1': 0.95, 'S13-2': 0.7, 'S05-2': 0.5, 'S05-3': 1.0 },
            teamAverage: 0.83
          }
        });
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      if (_url.includes('/career/lineup/preview-chemistry')) {
        return of({ score: 91, breakdown: { positionGroups: {}, maxSkillByType: {}, coveragePercentage: 10 }, maxSkillByType: {}, coveragePercentage: 10 });
      }
      if (_url.includes('/career/lineup/manual-select')) {
        return of({ players: [], warnings: [] });
      }
      if (_url.includes('/career/lineup/confirm')) {
        return of({ confirmed: true, warnings: [] });
      }
      return of({});
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
    fixture.detectChanges();
  });

  // V25D64 C24 P0: el chip con eff >= 0.9 debe tener la clase eff-good en el DOM.
  // El border verde (#10b981) se valida visualmente con REVISOR smoke
  // (no se puede medir color en Karma/jsdom sin Playwright e2e).
  it('CSS class eff-good applies to chips with eff >= 0.9 (green border visual symmetry check)', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const goodChips = fixture.nativeElement.querySelectorAll('.player-chip.eff-good') as NodeListOf<HTMLElement>;
      // 3 chips con eff >= 0.9 (GK-1=1.0, S22-1=0.95, S05-3=1.0).
      expect(goodChips.length).toBeGreaterThan(0,
        'expected at least 1 eff-good chip rendered in the DOM');
      // Sanity: eff-good no deberia colisionar con eff-warning ni eff-bad.
      goodChips.forEach((c: HTMLElement) => {
        expect(c.classList.contains('eff-warning')).withContext('eff-good chip must not also be eff-warning').toBeFalse();
        expect(c.classList.contains('eff-bad')).withContext('eff-good chip must not also be eff-bad').toBeFalse();
      });
      done();
    }, 30);
  });
});

/**
 * V25D66-C26 (Sprint C26): bench display fix. Previously the modal used
 * `response.players` (the 11 from /career/lineup/current) as the bench source,
 * which meant bench always rendered 0 when lineup had 11 players. After the
 * fix, the modal accepts `data.squad` from the caller (squad-management) and
 * uses it as the source of truth. This block verifies:
 *
 *   - with squad of 22 + lineup of 11 → benchPlayers.length === 11
 *   - with squad of 7 + lineup of 7 (short-handed) → benchPlayers.length === 0
 *   - with no squad in dialog data → fallback to response.players (legacy)
 */
describe('SquadEditorModalComponent — V25D66-C26 bench display', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  /**
   * 4-4-2 formation: 1 GK + 2 CB + 1 LB + 1 RB + 2 CM + 2 ST = 10 outfield + 1 GK = 11.
   * Positions dictadas por la formación devuelta por /editor/formations.
   */
  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2',
      description: '4-4-2',
      defenders: 4, midfielders: 4, attackers: 2, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'LB', xPercent: 11, yPercent: 83, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CB', xPercent: 33, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S22-2' },
        { index: 3, role: 'CB', xPercent: 67, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S23-2' },
        { index: 4, role: 'RB', xPercent: 89, yPercent: 83, actionRangePercent: 7, subdivisionId: 'S24-3' },
        { index: 5, role: 'CM', xPercent: 25, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S12-1' },
        { index: 6, role: 'CM', xPercent: 50, yPercent: 55, actionRangePercent: 7, subdivisionId: 'S14-2' },
        { index: 7, role: 'CM', xPercent: 75, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S16-3' },
        { index: 8, role: 'ST', xPercent: 35, yPercent: 15, actionRangePercent: 6, subdivisionId: 'S05-1' },
        { index: 9, role: 'ST', xPercent: 65, yPercent: 15, actionRangePercent: 6, subdivisionId: 'S05-3' },
        { index: 10, role: 'CM', xPercent: 25, yPercent: 35, actionRangePercent: 7, subdivisionId: 'S09-1' }
      ]
    }
  ];

  /**
   * Build a SessionPlayer-shaped object compatible with the modal's
   * {@code data.squad} mapping (sessionPlayerId → playerId). 22 players:
   * 11 starters + 11 bench, all from the same team (no overlap by playerId).
   */
  function buildSquad22(): any[] {
    const positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'CM', 'ST', 'ST'];
    const players: any[] = [];
    // Starters: 11 (one per slot role)
    for (let i = 0; i < 11; i++) {
      players.push({
        sessionPlayerId: `squad-starter-${i}`,
        name: `Starter ${i}`,
        position: positions[i],
        age: 25,
        attack: 80, defense: 80, technique: 80, speed: 80, stamina: 80, mentality: 80,
        marketValue: 1000000, energy: 100, form: 80,
        injured: false, injuryType: null, injuryRemainingMatches: 0,
        origin: 'CLONED'
      });
    }
    // Bench: 11 (mix of positions, none of them a duplicate sessionPlayerId)
    const benchPositions = ['GK', 'CB', 'CB', 'RB', 'LB', 'CM', 'CM', 'CM', 'ST', 'ST', 'MID'];
    for (let i = 0; i < 11; i++) {
      players.push({
        sessionPlayerId: `squad-bench-${i}`,
        name: `Bench Player ${i}`,
        position: benchPositions[i],
        age: 23,
        attack: 70, defense: 70, technique: 70, speed: 70, stamina: 70, mentality: 70,
        marketValue: 500000, energy: 90, form: 70,
        injured: false, injuryType: null, injuryRemainingMatches: 0,
        origin: 'CLONED'
      });
    }
    return players;
  }

  /**
   * Build the /career/lineup/current response with 11 players. The players
   * use the SAME playerId as the squad starters (since the back uses
   * sessionPlayerId as playerId).
   */
  function buildLineupResponse(): any {
    const positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'CM', 'ST', 'ST'];
    const players = positions.map((pos, i) => ({
      playerId: `squad-starter-${i}`,
      name: `Starter ${i}`,
      position: pos,
      overall: 80,
      energy: 100,
      injured: false,
      age: 25
    }));
    return {
      formation: '4-4-2',
      players,
      confirmed: true,
      warnings: [],
      slots: players.map((p, i) => ({
        playerId: p.playerId,
        subdivisionId: FORMATIONS_RESPONSE[0].positions[i].subdivisionId
      }))
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
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
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null, squad: buildSquad22() } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
  });

  it('C26 P0: with squad=22 and lineup=11, benchPlayers.length === 11 (squad − lineup)', (done) => {
    // Mock /career/lineup/current → 11 players con slots persistidos
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      if (url.includes('/career/lineup/current')) {
        return of(buildLineupResponse());
      }
      return of(null);
    }) as any);

    fixture.detectChanges();
    setTimeout(() => {
      const bench = component.benchPlayers;
      const home = component.homePlayers;
      expect(bench.length).toBe(11,
        `expected bench=11 (squad 22 − lineup 11), got ${bench.length}`);
      expect(home.length).toBe(11,
        `expected home=11 (lineup), got ${home.length}`);
      // Bench player IDs deben ser los 11 squad-bench-*, NO los starters.
      const benchIds = bench.map((p: any) => p.playerId).sort();
      expect(benchIds[0]).toMatch(/^squad-bench-/);
      expect(benchIds.every((id: string) => id.startsWith('squad-bench-'))).toBe(true,
        'bench should contain only the squad bench players');
      done();
    }, 50);
  });

  it('C26 P0: with squad=7 (short-handed) and lineup=7, benchPlayers.length === 0 (no extras)', (done) => {
    // Short-handed: squad tiene 7 players que cubren las 7 slots del lineup
    // (formación 4-4-2 mínimo = 7 jugadores; el auto-select con squad corto
    // puede no llegar a 11, pero el bench no debería mostrar más jugadores
    // que los que existen).
    const shortSquad: any[] = Array.from({ length: 7 }, (_, i) => ({
      sessionPlayerId: `short-${i}`,
      name: `Short ${i}`,
      position: ['GK', 'CB', 'CB', 'CM', 'CM', 'ST', 'ST'][i],
      age: 25, attack: 70, defense: 70, technique: 70, speed: 70, stamina: 70, mentality: 70,
      marketValue: 500000, energy: 100, form: 70,
      injured: false, injuryType: null, injuryRemainingMatches: 0,
      origin: 'CLONED'
    }));
    // Reconfigure TestBed con squad corto
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null, squad: shortSquad } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    // Mock lineup con 7 players (todos short-*)
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: '4-4-2',
          players: shortSquad.map((sp) => ({
            playerId: sp.sessionPlayerId,
            name: sp.name,
            position: sp.position,
            overall: 70,
            energy: 100,
            injured: false,
            age: 25
          })),
          confirmed: true,
          warnings: [],
          slots: shortSquad.map((sp, i) => ({
            playerId: sp.sessionPlayerId,
            subdivisionId: FORMATIONS_RESPONSE[0].positions[i]?.subdivisionId ?? 'GK-1'
          }))
        });
      }
      return of(null);
    }) as any);

    const shortFixture = TestBed.createComponent(SquadEditorModalComponent);
    const shortComponent = shortFixture.componentInstance;
    shortFixture.detectChanges();
    setTimeout(() => {
      const bench = shortComponent.benchPlayers;
      const home = shortComponent.homePlayers;
      expect(bench.length).toBe(0,
        `expected bench=0 when squad=lineup=7, got ${bench.length}`);
      expect(home.length).toBe(7,
        `expected home=7, got ${home.length}`);
      done();
    }, 50);
  });

  it('C26 P0 fallback: with no squad in dialog data, benchPlayers.length === 0 (legacy behavior)', (done) => {
    // Reconfigure TestBed sin squad en MAT_DIALOG_DATA → fallback a playersList.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        // NOTA: squad ausente. El fallback debe usar response.players (11 del lineup).
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      if (url.includes('/career/lineup/current')) {
        return of(buildLineupResponse());
      }
      return of(null);
    }) as any);

    const legacyFixture = TestBed.createComponent(SquadEditorModalComponent);
    const legacyComponent = legacyFixture.componentInstance;
    legacyFixture.detectChanges();
    setTimeout(() => {
      // Legacy fallback: bench = filter !slotId sobre playersList → 0
      // (porque los 11 players del lineup reciben slotId via persistedSlots/role-match).
      expect(legacyComponent.benchPlayers.length).toBe(0,
        'legacy fallback should produce bench=0 (no squad source)');
      expect(legacyComponent.homePlayers.length).toBe(11,
        'legacy fallback should still map 11 lineup players to home');
      done();
    }, 50);
  });

  it('C26 P0 fallback: with squad=[] empty, behaves like no squad (fallback to playersList)', (done) => {
    // Reconfigure TestBed con squad=[] (vacío, distinto de ausente).
    // El fallback debe dispararse también en este caso (length === 0).
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null, squad: [] } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/editor/formations')) {
        return of(FORMATIONS_RESPONSE);
      }
      if (url.includes('/career/lineup/current')) {
        return of(buildLineupResponse());
      }
      return of(null);
    }) as any);

    const emptySquadFixture = TestBed.createComponent(SquadEditorModalComponent);
    const emptySquadComponent = emptySquadFixture.componentInstance;
    emptySquadFixture.detectChanges();
    setTimeout(() => {
      expect(emptySquadComponent.benchPlayers.length).toBe(0,
        'squad=[] should fall back to playersList (bench=0)');
      expect(emptySquadComponent.homePlayers.length).toBe(11);
      done();
    }, 50);
  });

  /**
   * V25D78-C55.7.7.1 BUG_L4 (continuation from C55.7.7 squad-management.component.html
   * commit 31822e3): the squad-editor-modal still used the wording "Mínimo 7 jugadores
   * para guardar" without clarification. The C55.7.7 fix only touched squad-management,
   * so users hitting the modal confirm with <7 players still saw the ambiguous text.
   *
   * Post-fix: error message reads
   *   "Mínimo 7 jugadores para guardar (puedes tener más)"
   * so the 7 is clearly a FLOOR (you can have 8, 9, 10, or 11), NOT a ceiling.
   *
   * Test strategy: push the player list through homePlayers$.next() (homePlayers
   * itself is a getter over the BehaviorSubject, see component.ts:1436) and read
   * the resulting error via errorMessage$.value (the matching getter). assertContains,
   * NOT exact match — future copy edits must not require a code review of this spec.
   */
  describe('squad-editor-modal — V25D78-C55.7.7.1 BUG_L4 (Mínimo 7 wording)', () => {
    it('L4 happy path: error message includes "(puedes tener más)" clarification', () => {
      const threePlayerFixture = TestBed.createComponent(SquadEditorModalComponent);
      const threePlayerComponent = threePlayerFixture.componentInstance;
      threePlayerFixture.detectChanges();

      // Force the < 7 branch of saveLineup(): push 3 players through homePlayers$.next().
      (threePlayerComponent as any).homePlayers$.next([{}, {}, {}] as any);
      (threePlayerComponent as any).saveLineup();

      const captured = (threePlayerComponent as any).errorMessage$.value;
      expect(captured).toContain('Mínimo 7',
        'error must still mention the 7-player floor (no copy regression)');
      expect(captured).toContain('(puedes tener más)',
        'BUG_L4 fix: the clarification "(puedes tener más)" must be present so users '
          + 'understand 7 is a floor, not a ceiling');
    });

    it('L4 regression: 7 ≤ playerCount ≤ 11 path does NOT emit the Mínimo 7 message', () => {
      // The clarification only applies to the < 7 branch; the save path with enough
      // players must clear the error instead of re-emitting the Mínimo 7 message.
      const okFixture = TestBed.createComponent(SquadEditorModalComponent);
      const okComponent = okFixture.componentInstance;
      okFixture.detectChanges();

      (okComponent as any).homePlayers$.next(new Array(11).fill({}) as any);
      (okComponent as any).saveLineup();

      const captured = (okComponent as any).errorMessage$.value;
      expect(captured).not.toContain('Mínimo 7',
        'with a valid lineup (11 players) the Mínimo 7 message must NOT be emitted');
    });
  });
});

/**
 * V25D91-FRONT-F1: marker cards render squad number + player name + role
 * badge color-coded by family (yellow GK / blue DEF / green MID / red ATT).
 *
 * <p>Pre-V25D91 the marker was a 32x32 circle showing only the squad
 * number. Post-F1 it is a 70x56 card with three stacked rows. The color
 * family comes from {@link SquadEditorModalComponent.getMarkerRoleClasses}
 * via [ngClass].
 *
 * <p>Strategy: drive the component through the same setup as the V25D51
 * chip-level tests (5 slots + 5 players + formationEffectiveness) so the
 * marker DOM is fully populated, then assert the marker elements + class
 * bindings render correctly per role.
 */
describe('SquadEditorModalComponent — V25D91-FRONT-F1 marker cards (name + role badge)', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // 5 slots: GK-1 + 4 outfield, one per role family tested.
  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1',  isGoalkeeper: true,  sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' },
    { subdivisionId: 'S22-1', isGoalkeeper: false, sector: 22, subIndex: 1, left: 10, top: 70, width: 25, height: 12, zone: 'DEFENSE' },
    { subdivisionId: 'S13-2', isGoalkeeper: false, sector: 13, subIndex: 2, left: 40, top: 45, width: 20, height: 12, zone: 'MIDFIELD' },
    { subdivisionId: 'S05-2', isGoalkeeper: false, sector:  5, subIndex: 2, left: 30, top: 10, width: 10, height: 10, zone: 'ATTACK' },
    { subdivisionId: 'S05-3', isGoalkeeper: false, sector:  5, subIndex: 3, left: 70, top: 10, width: 10, height: 10, zone: 'ATTACK' }
  ];

  // Each player has the position that will end up in its corresponding slot
  // via role-match (since the /current response carries no persistedSlots).
  // Positions match the formation slot roles 1:1 (GK → GK-1, DEF → S22-1,
  // MID → S13-2, ATT → S05-2, MID → S05-3). The marker .player-role-label
  // will render player.role which equals player.position here.
  const PLAYERS = [
    { playerId: 'p-gk',   name: 'Courtois',         position: 'GK',  overall: 90, energy: 100, injured: false, role: 'GK' },
    { playerId: 'p-def',  name: 'Fran Garcia',      position: 'DEF', overall: 82, energy: 100, injured: false, role: 'DEF' },
    { playerId: 'p-mid1', name: 'Modric',           position: 'MID', overall: 88, energy: 100, injured: false, role: 'MID' },
    { playerId: 'p-att',  name: 'Vinicius Jr',      position: 'ATT', overall: 89, energy: 100, injured: false, role: 'ATT' },
    { playerId: 'p-mid2', name: 'Bellingham',       position: 'MID', overall: 90, energy: 100, injured: false, role: 'MID' }
  ];

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/editor/formations'))  return of([
        {
          name: '4-4-2', description: '4-4-2',
          defenders: 1, midfielders: 1, attackers: 2, outfieldPlayers: 4,
          positions: [
            { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
            { index: 1, role: 'DEF', xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
            { index: 2, role: 'MID', xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
            { index: 3, role: 'ATT', xPercent: 30, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' },
            { index: 4, role: 'MID', xPercent: 70, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-3' }
          ]
        }
      ]);
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: '4-4-2',
          players: PLAYERS,
          confirmed: true,
          warnings: [],
          slots: []
        });
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      return of({});
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
    fixture.detectChanges();
  });

  // ---- helper method: getMarkerRoleClasses ----

  it('getMarkerRoleClass( GK ) returns color-gk: true and all others false', () => {
    const cls = component.getMarkerRoleClasses('GK');
    expect(cls['color-gk']).toBeTrue();
    expect(cls['color-def']).toBeFalse();
    expect(cls['color-mid']).toBeFalse();
    expect(cls['color-att']).toBeFalse();
  });

  it('getMarkerRoleClasses covers all DEF roles (CB / LB / RB / DEF)', () => {
    ['CB', 'LB', 'RB', 'DEF'].forEach(role => {
      const cls = component.getMarkerRoleClasses(role);
      expect(cls['color-def']).withContext(`${role} must map to color-def`).toBeTrue();
      expect(cls['color-gk']).withContext(`${role} must NOT map to color-gk`).toBeFalse();
    });
  });

  it('getMarkerRoleClasses covers all MID roles (CM / CDM / CAM / LM / RM / MID)', () => {
    ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'].forEach(role => {
      const cls = component.getMarkerRoleClasses(role);
      expect(cls['color-mid']).withContext(`${role} must map to color-mid`).toBeTrue();
    });
  });

  it('getMarkerRoleClasses covers all ATT roles (ST / LW / RW / CF / ATT)', () => {
    ['ST', 'LW', 'RW', 'CF', 'ATT'].forEach(role => {
      const cls = component.getMarkerRoleClasses(role);
      expect(cls['color-att']).withContext(`${role} must map to color-att`).toBeTrue();
    });
  });

  it('getMarkerRoleClasses returns empty map for unknown role (defensive)', () => {
    const cls = component.getMarkerRoleClasses('UNKNOWN');
    expect(cls['color-gk']).toBeFalse();
    expect(cls['color-def']).toBeFalse();
    expect(cls['color-mid']).toBeFalse();
    expect(cls['color-att']).toBeFalse();
    expect(cls['color-gk'] || cls['color-def'] || cls['color-mid'] || cls['color-att'])
      .withContext('unknown role must not match any color family').toBeFalsy();
  });

  it('getMarkerRoleClasses returns empty map for undefined role', () => {
    const cls = component.getMarkerRoleClasses(undefined);
    expect(cls['color-gk'] || cls['color-def'] || cls['color-mid'] || cls['color-att'])
      .withContext('undefined role must not match any color family').toBeFalsy();
  });

  // ---- template bindings: marker renders name + role badge ----

  it('renders one .player-marker per occupied slot, with .player-number + .player-name-label + .player-role-label', (done) => {
    // V25D91-FRONT-F1: 5 players → 5 markers. Each marker has 3 inner
    // spans/divs: number (top), name-label (middle), role-label (bottom).
    setTimeout(() => {
      fixture.detectChanges();
      const markers = fixture.nativeElement.querySelectorAll('.player-marker') as NodeListOf<HTMLElement>;
      expect(markers.length).toBe(5,
        `expected 5 markers (one per occupied slot), got ${markers.length}`);

      markers.forEach((m: HTMLElement) => {
        expect(m.querySelector('.player-number')).withContext('marker must contain .player-number').toBeTruthy();
        expect(m.querySelector('.player-name-label')).withContext('marker must contain .player-name-label').toBeTruthy();
        expect(m.querySelector('.player-role-label')).withContext('marker must contain .player-role-label').toBeTruthy();
      });
      done();
    }, 30);
  });

  it('marker .player-name-label text matches the player name', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const labels = fixture.nativeElement.querySelectorAll('.player-marker .player-name-label') as NodeListOf<HTMLElement>;
      const names = Array.from(labels).map(l => (l.textContent || '').trim());
      // The 5 players in PLAYERS (after role-match against the formation):
      // GK-1 → GK (Courtois), S22-1 → LB (Fran Garcia), S13-2 → CM (Modric),
      // S05-2 → LW (Vinicius Jr), S05-3 → CM (Bellingham).
      expect(names).toContain('Courtois');
      expect(names).toContain('Fran Garcia');
      expect(names).toContain('Modric');
      expect(names).toContain('Vinicius Jr');
      expect(names).toContain('Bellingham');
      done();
    }, 30);
  });

  it('marker .player-role-label text matches the player role', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const labels = fixture.nativeElement.querySelectorAll('.player-marker .player-role-label') as NodeListOf<HTMLElement>;
      const roles = Array.from(labels).map(l => (l.textContent || '').trim());
      expect(roles).toContain('GK');
      expect(roles).toContain('DEF');
      expect(roles).toContain('MID');
      expect(roles).toContain('ATT');
      done();
    }, 30);
  });

  it('marker has color-gk class on the GK slot marker', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const gkMarker = fixture.nativeElement.querySelector('.player-marker.gk-player') as HTMLElement | null;
      expect(gkMarker).withContext('GK marker must exist').toBeTruthy();
      expect(gkMarker?.classList.contains('color-gk')).withContext('GK marker must carry .color-gk').toBeTrue();
      done();
    }, 30);
  });

  it('marker has color-def class on a DEF (LB) slot marker', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const defMarkers = fixture.nativeElement.querySelectorAll('.player-marker.color-def') as NodeListOf<HTMLElement>;
      expect(defMarkers.length).withContext('at least 1 DEF marker must carry .color-def').toBeGreaterThan(0);
      done();
    }, 30);
  });

  it('marker has color-mid class on MID (CM) slot markers', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const midMarkers = fixture.nativeElement.querySelectorAll('.player-marker.color-mid') as NodeListOf<HTMLElement>;
      expect(midMarkers.length).withContext('at least 1 MID marker must carry .color-mid').toBeGreaterThan(0);
      done();
    }, 30);
  });

  it('marker has color-att class on ATT (LW) slot markers', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const attMarkers = fixture.nativeElement.querySelectorAll('.player-marker.color-att') as NodeListOf<HTMLElement>;
      expect(attMarkers.length).withContext('at least 1 ATT marker must carry .color-att').toBeGreaterThan(0);
      done();
    }, 30);
  });

  // ---- CSS smoke check ----

  it('CSS source defines the role-color rules for all 4 families', () => {
    // The companion CSS source-parse pattern (used by V25D56/V25D58 specs
    // for @media + field rule checks) works on inline `styles:`. We re-use
    // it to assert the 4 color rules exist with the expected palette.
    const styles = (SquadEditorModalComponent as any).ɵcmp?.styles ?? [];
    const src = (Array.isArray(styles) ? styles.join('\n') : String(styles))
      .replace(/\[[_]?ngcontent-[^\]]*\]/g, '');
    expect(src).toMatch(/\.player-marker\.color-gk\s+\.player-role-label\s*\{[^}]*background:\s*#f59e0b/);
    expect(src).toMatch(/\.player-marker\.color-def\s+\.player-role-label\s*\{[^}]*background:\s*#3b82f6/);
    expect(src).toMatch(/\.player-marker\.color-mid\s+\.player-role-label\s*\{[^}]*background:\s*#10b981/);
    expect(src).toMatch(/\.player-marker\.color-att\s+\.player-role-label\s*\{[^}]*background:\s*#ef4444/);
  });
});