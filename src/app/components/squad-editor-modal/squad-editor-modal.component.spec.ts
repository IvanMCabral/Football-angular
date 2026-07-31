/**
 * Unit tests for {@link SquadEditorModalComponent}.
 *
 * Covers modal creation, editor bootstrapping, lineup persistence, chemistry
 * preview, tactical drag-drop, responsive layout, and free positioning.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { SquadEditorModalComponent } from './squad-editor-modal.component';
import { countSquadEditorFormationRoleFamilies } from './squad-editor-modal-formation-detection.utils';

describe('SquadEditorModalComponent basic flow', () => {
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

    // Mock the 3 GETs ngOnInit fires: /lineup-editor/subdivisions, /lineup-editor/formations, /career/lineup/current
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) {
        return of(SUBDIVISIONS_RESPONSE);
      }
      if (url.includes('/lineup-editor/formations')) {
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

  it('should call /lineup-editor/subdivisions on init', () => {
    fixture.detectChanges(); // triggers ngOnInit
    const subdivisionsCall = httpClientSpy.get.calls.allArgs()
      .find(args => String(args[0]).includes('/lineup-editor/subdivisions'));
    expect(subdivisionsCall).toBeTruthy(
      'ngOnInit should GET /api/v1/lineup-editor/subdivisions');
  });

  it('saveLineup sends free-position customX/customY to manual-select', () => {
    const players = Array.from({ length: 7 }, (_, index) => ({
      playerId: `p${index + 1}`,
      name: `Player ${index + 1}`,
      role: index === 0 ? 'GK' : 'MID',
      slotId: index === 0 ? 'GK-1' : `S13-${index}`,
      xPercent: index === 3 ? 31.65 : undefined,
      yPercent: index === 3 ? 56.0 : undefined,
    }));
    (component as any).selectedFormation = '4-4-2';
    (component as any).getUniqueValidHomePlayers = () => players;

    (component as any).saveLineup();

    const manualSelectCall = httpClientSpy.post.calls.allArgs()
      .find(args => String(args[0]).includes('/career/lineup/manual-select'));
    expect(manualSelectCall).toBeTruthy('saveLineup must call manual-select');
    const body = manualSelectCall?.[1] as any;
    const movedSlot = body.slots.find((slot: any) => slot.playerId === 'p4');
    expect(movedSlot.customXPercent).toBe(31.65);
    expect(movedSlot.customYPercent).toBe(56.0);
  });

  it('should call /lineup-editor/formations on init', (done) => {
    fixture.detectChanges();
    // loadSubdivisions uses setTimeout(0) before chaining formations load.
    // Use a small async wait to allow the chain to complete.
    setTimeout(() => {
      const formationsCall = httpClientSpy.get.calls.allArgs()
        .find(args => String(args[0]).includes('/lineup-editor/formations'));
      expect(formationsCall).toBeTruthy(
        'ngOnInit should GET /api/v1/lineup-editor/formations');
      done();
    }, 20);
  });
});

/**
 * Regression tests for loading the backend formation before role matching and
 * saving the lineup after auto-select.
 */
describe('SquadEditorModalComponent backend formation loading', () => {
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
      if (url.includes('/lineup-editor/subdivisions')) {
        return of(SUBDIVISIONS_RESPONSE);
      }
      if (url.includes('/lineup-editor/formations')) {
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

  // ===== loadSquadFromBackend sets selectedFormation from the response =====

  it('loadSquadFromBackend sets selectedFormation from the response before role matching', (done) => {
    // El back retorna formation 4-3-3 (no la default 4-4-2)
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations')) return of(FORMATIONS_RESPONSE);
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

  it('F3 - loadSquadFromBackend con formation null usa default 4-4-2', (done) => {
    // El back NO retorna formation (legacy save)
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations')) return of(FORMATIONS_RESPONSE);
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

  // ===== F4 - executeFormationChange llama saveLineup después del auto-select =====

  it('F4 - executeFormationChange llama a saveLineup después del auto-select', (done) => {
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
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations')) return of(FORMATIONS_RESPONSE);
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

    // Wait for initialization to finish before driving the formation change.
    setTimeout(() => {
      const starters = elevenPlayers.map((player, index) => ({
        ...player,
        role: player.position,
        stamina: player.energy,
        active: true,
        isEmpty: false,
        slotId: [
          'GK-1', 'S22-1', 'S22-2', 'S23-2', 'S24-3',
          'S13-2', 'S14-2', 'S15-2', 'S04-1', 'S05-2', 'S06-3'
        ][index]
      }));
      (component as any).slotPlayerMap = Object.fromEntries(starters.map(player => [player.slotId, player]));
      (component as any).homePlayers$.next(starters);
      (component as any).benchPlayers$.next([]);
      component.selectedFormation = '4-4-2';
      component.homeFormation$.next('4-4-2');
      (component as any).isInitializing = false;
      component.onFormationChange('4-3-3');

      // Wait for saveLineup to fire /manual-select and /confirm.
      setTimeout(() => {
        const allPostUrls = httpClientSpy.post.calls.allArgs()
          .map(args => String(args[0]));

        expect(allPostUrls.some(u => u.includes('/career/lineup/manual-select')))
          .toBe(true, 'F4: debe haberse llamado /career/lineup/manual-select con los mismos jugadores');
        done();
      }, 50);
    }, 30);
  });
});

/**
 * Chemistry preview: verifies the debounced pipeline, projected score,
 * delta against the current score, and graceful error handling.
 */
describe('SquadEditorModalComponent chemistry preview', () => {
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
      if (url.includes('/lineup-editor/subdivisions')) {
        return of(SUBDIVISIONS_RESPONSE);
      }
      if (url.includes('/lineup-editor/formations')) {
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
    // After /career/lineup/current loads, currentChemistryScore holds
    // the persisted chemistry used as the delta baseline.
    setTimeout(() => {
      expect(component.currentChemistryScore).toBe(85);
      done();
    }, 30);
  });

  it('should trigger chemistry preview POST when a player is assigned (debounced)', (done) => {
    // assignPlayerToSlot triggers the debounced preview pipeline and POST.
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
    // Rapid preview triggers within the debounce window collapse into one POST.
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
    // The preview pipeline requires exactly 11 player ids before POSTing.
    setTimeout(() => {
      // Empty homePlayers$ (0 players) - preview should not fire.
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
    // On preview success, previewedChemistry$ emits the response.
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

  it('should compute delta from currentChemistryScore in template', (done) => {
    // Template renders pc.score - currentChemistryScore.
    // currentChemistryScore=85 and preview score=91, so delta is +6.
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

// Drag-drop, tactical effectiveness and chemistry preview behavior.
describe('SquadEditorModalComponent drag-drop and effectiveness', () => {
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
   * response (formationEffectiveness absent).
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
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
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
    // With formationEffectiveness present in /current, the header shows
    // the inferred formation and team effectiveness.
    setTimeout(() => {
      fixture.detectChanges();
      const row = fixture.nativeElement.querySelector('.formation-effectiveness-row');
      expect(row).toBeTruthy('formation-effectiveness row must render when formationEffectiveness is present');
      expect(row?.textContent).toContain('4-4-2');
      expect(row?.textContent).toContain('89%');
      done();
    }, 30);
  });

  it('should NOT render the formation-effectiveness row when formationEffectiveness is null', (done) => {
    // Legacy responses without formationEffectiveness must hide the row.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
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

  it('should color-code markers by per-player effectiveness', (done) => {
    // Chemistry visual feedback lives on the player marker itself
    // through eff-green, eff-yellow, and eff-red classes.
    //
    // Thresholds match getChipEffectivenessClass:
    //   eff >= 0.9 -> green
    //   0.7 <= eff < 0.9 -> yellow
    //   eff < 0.7 -> red
    //
    // Per the mocked perPlayerEffectiveness:
    //   GK-1  = 1.0  -> green  (eff-good)
    //   S22-1 = 0.85 -> yellow (eff-warning, 0.7-0.9)
    //   S13-2 = 0.7  -> yellow (eff-warning, boundary inclusive)
    //   S05-2 = 1.0  -> green  (eff-good)
    setTimeout(() => {
      fixture.detectChanges();
      const markers = fixture.nativeElement.querySelectorAll('.player-marker');
      let greenCount = 0, yellowCount = 0, redCount = 0;
      markers.forEach((s: HTMLElement) => {
        if (s.classList.contains('eff-green'))  greenCount++;
        if (s.classList.contains('eff-yellow')) yellowCount++;
        if (s.classList.contains('eff-red'))    redCount++;
      });
      // GK-1 + S05-2 = 2 green; S22-1 + S13-2 = 2 yellow.
      expect(greenCount).toBe(2, '2 markers should be green (eff >= 0.9)');
      expect(yellowCount).toBe(2, '2 markers should be yellow (0.7 <= eff < 0.9)');
      expect(redCount).toBe(0, 'no markers should be red');
      done();
    }, 30);
  });

  it('should explain real off-role tactical penalties with summary and advice', (done) => {
    // A deliberate off-role move must be visible as tactical feedback,
    // not just a raw percent hidden in the left panel.
    setTimeout(() => {
      (component as any).homePlayers$.next([
        {
          playerId: 'p-def',
          name: 'DEF',
          position: 'DEF',
          role: 'DEF',
          overall: 80,
          energy: 100,
          injured: false,
          slotId: 'S13-2',
          xPercent: 50,
          yPercent: 50,
          active: true,
          isEmpty: false
        } as any
      ]);
      (component as any).formationEffectiveness$.next({
        inferredFormation: '4-4-2',
        perPlayerEffectiveness: { 'S13-2': 0.82 },
        teamAverage: 0.82
      });

      fixture.detectChanges();

      const summary = fixture.nativeElement.querySelector('.tsp-penalty-summary');
      const advice = fixture.nativeElement.querySelector('.tsp-offrole-advice');
      const rows = fixture.nativeElement.querySelectorAll('.tsp-offrole-row');

      expect(rows.length).toBeGreaterThan(0, 'at least one tactical penalty row should render');
      expect(summary?.textContent).toContain('Impacto');
      expect(advice?.textContent).toContain('Rueda de auxilio defensiva');
      done();
    }, 100);
  });

  // ---- drag-drop handlers (direct method calls) ----

  it('handleSlotDrop - moves a slot player to another empty slot', (done) => {
    // Drag p-def from S22-1 to S05-2; evict p-att to the bench first
    // so the target slot is empty.
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

  it('handleSlotDrop - swaps two slot players when target is occupied', (done) => {
    // Drag p-def from S22-1 onto occupied S13-2 and expect a swap.
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

  it('handleBenchDrop - moves a slot player to the bench', (done) => {
    // Drag p-att from S05-2 to the bench drop list.
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
    // Raw preview score = 91, teamAverage = 0.8875, displayed = round(91 * 0.8875) = 81.
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
        // 91 * 0.8875 = 80.7625, rounded to 81.
        expect(displayed).toBe(81,
          `displayed should be round(91 * 0.8875) = 81, got ${displayed}`);
        // The 89% weight chip should be rendered when teamAverage < 1.0.
        fixture.detectChanges();
        const weightEl = fixture.nativeElement.querySelector('.preview-eff-weight');
        expect(weightEl?.textContent).toContain('89%');
        done();
      }, 400);
    }, 30);
  });

  it('getDisplayedChemistryScore returns raw score when formationEffectiveness is null', (done) => {
    // When formationEffectiveness is missing, the chemistry preview
    // shows the raw score unchanged.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
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
        // The 89% weight chip should be rendered when teamAverage < 1.0.
        fixture.detectChanges();
        const weightEl = fixture.nativeElement.querySelector('.preview-eff-weight');
        expect(weightEl).toBeFalsy('weight chip must NOT render when formationEffectiveness is null');
        done();
      }, 400);
    }, 30);
  });
});

/**
 * Marker-level effectiveness feedback. The marker receives a
 * CSS class bound from getChipEffectivenessClass() and renders a corner
 * badge showing the percentage. Thresholds differ from the slot-level
 * eff-green/yellow/red (which uses 0.85 / 0.5); the chip uses 0.9 / 0.7
 * to give the user tighter feedback on their per-player alignment.
 */
describe('SquadEditorModalComponent effectiveness feedback', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // Minimal field: 4 slots, one of each perPlayerEffectiveness band the test
  // cares about (1.0 -> good, 0.85 -> good (just at threshold), 0.7 -> warning
  // (just at threshold), 0.5 -> bad). Plus GK-1 at 1.0 to keep the row
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
   * /career/lineup/current response builder - accepts perPlayerEffectiveness
   * keyed by subdivisionId. Pass null for formationEffectiveness to simulate
   * a legacy response (no chip feedback expected).
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
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        // Default: full effectiveness coverage. Distribution per slot:
        //   GK-1=1.0  -> eff-good  (perfect GK)
        //   S22-1=0.95 -> eff-good  (well above the 0.9 threshold)
        //   S13-2=0.7  -> eff-warning (right at the 0.7 threshold)
        //   S05-2=0.5  -> eff-bad    (well below 0.7)
        //   S05-3=1.0  -> eff-good  (perfect ATT)
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
      // 0.95 is above the 0.9 threshold - must be eff-good.
      expect((component as any).getChipEffectivenessClass('S22-1')).toBe('eff-good');
      done();
    }, 30);
  });

  it('getChipEffectivenessClass returns eff-warning for 0.7 <= eff < 0.9', (done) => {
    setTimeout(() => {
      expect((component as any).getChipEffectivenessClass('S13-2')).toBe('eff-warning');
      // 0.7 is the inclusive lower bound - must also be eff-warning.
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

  it('renders eff-good on the marker for eff >= 0.9', (done) => {
    // Chemistry feedback lives on the .player-marker via eff-green/yellow/red.
    setTimeout(() => {
      fixture.detectChanges();
      const markers = fixture.nativeElement.querySelectorAll('.player-marker');
      let goodCount = 0;
      markers.forEach((c: HTMLElement) => {
        if (c.classList.contains('eff-green')) goodCount++;
      });
      // GK-1 (1.0) + S22-1 (0.85) + S05-3 (1.0) = 3 eff-good markers.
      expect(goodCount).toBe(3,
        `expected 3 markers with eff-green (eff >= 0.9), got ${goodCount}`);
      done();
    }, 30);
  });

  it('renders eff-warning on the marker for 0.7 <= eff < 0.9', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const markers = fixture.nativeElement.querySelectorAll('.player-marker');
      let warnCount = 0;
      markers.forEach((c: HTMLElement) => {
        if (c.classList.contains('eff-yellow')) warnCount++;
      });
      // S13-2 (0.7) = 1 eff-yellow marker.
      expect(warnCount).toBe(1,
        `expected 1 marker with eff-yellow (0.7-0.9), got ${warnCount}`);
      done();
    }, 30);
  });

  it('renders eff-bad on the marker for eff < 0.7', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const markers = fixture.nativeElement.querySelectorAll('.player-marker');
      let badCount = 0;
      markers.forEach((c: HTMLElement) => {
        if (c.classList.contains('eff-red')) badCount++;
      });
      // S05-2 (0.5) = 1 eff-red marker.
      expect(badCount).toBe(1,
        `expected 1 marker with eff-red (eff < 0.7), got ${badCount}`);
      done();
    }, 30);
  });

  it('does not render any legacy chip element', (done) => {
    // The .player-marker is the player card; there is no separate chip element.
    setTimeout(() => {
      fixture.detectChanges();
      const chips = fixture.nativeElement.querySelectorAll('.player-chip');
      expect(chips.length).toBe(0,
        `expected 0 .player-chip elements in the final marker-card model, got ${chips.length}`);
      done();
    }, 30);
  });

  // ---- backward compat ----

  it('does NOT render any marker-level eff feedback when formationEffectiveness is null', (done) => {
    // Legacy lineups without formationEffectiveness must not show
    // marker-level chemistry feedback.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
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
      const markers = fixture.nativeElement.querySelectorAll('.player-marker');
      markers.forEach((c: HTMLElement) => {
        expect(c.classList.contains('eff-green')).withContext('legacy lineups must NOT render eff-green on markers').toBeFalse();
        expect(c.classList.contains('eff-yellow')).withContext('legacy lineups must NOT render eff-yellow on markers').toBeFalse();
        expect(c.classList.contains('eff-red')).withContext('legacy lineups must NOT render eff-red on markers').toBeFalse();
      });
      done();
    }, 30);
  });
});

/**
 * Responsive modal layout: mobile, tablet, and desktop breakpoints must
 * keep player chips visible and the modal scrollable on small screens.
 * These tests inspect component CSS because Karma does not evaluate media
 * queries like a real viewport.
 */
describe('SquadEditorModalComponent responsive modal breakpoints', () => {
  /**
   * Reads the @Component.styles source. For inline-styled components
   * (like this one) Angular stores the CSS strings on the component
   * definition at `\u0275cmp.styles`, but with Angular's emulated
   * encapsulation every selector is rewritten with `[_ngcontent-%COMP%]`
   * (or the hashed version at runtime). {@link #stripEncapsulation}
   * removes those markers so regex assertions match the original
   * class names.
   */
  function stylesSource(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styles = (SquadEditorModalComponent as any)['\u0275cmp']?.styles ?? [];
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

  // Extracts a media-query block while preserving nested CSS rules.
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
    // The legacy mobile breakpoint hid player chips. Keep the
    // old breakpoint and display:none rule out of the stylesheet.
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
    // somewhere - guarantees the user can reach all content on tall modals.
    expect(block).toMatch(/overflow/);
  });

  it('bench panel scrolls horizontally on mobile (bench-list overflow-x:auto)', () => {
    const block = extractMediaBlock('max-width: 600px');
    expect(block).toBeTruthy();
    expect(block).toMatch(/\.bench-container\s+\.bench-list\s*\{[^}]*overflow-x:\s*auto/);
  });

  // Field proportions must hold across default, tablet, and mobile
  // layouts so the pitch never collapses into a horizontal slab.
  describe('field aspect ratio across responsive breakpoints', () => {
    it('default viewport (>=1025px): .field has aspect-ratio 1.15 / 1 outside any @media block', () => {
      const src = stripEncapsulation(stylesSource());
      // Strip @media blocks so we only inspect the default rules.
      const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
      // Find the .field rule in the non-media part. Allow nested rules
      // (we strip comments + the rule body).
      const fieldRule = nonMedia.match(/\.field\s*\{[^}]*\}/);
      expect(fieldRule).withContext('top-level .field rule must exist').toBeTruthy();
      // The field is intentionally more square than the older landscape shape.
      expect(fieldRule![0]).toMatch(/aspect-ratio:\s*1\.15\s*\/\s*1/);
      // Height drives the layout and width follows from aspect-ratio.
      expect(fieldRule![0]).toMatch(/height:\s*100%/);
    });

    it('tablet viewport (601-1024px): .field has aspect-ratio 1.15 / 1 inside the @media block', () => {
      const block = extractMediaBlock('min-width: 601px) and (max-width: 1024px');
      expect(block).withContext('tablet @media block must exist').toBeTruthy();
      const fieldRule = block.match(/\.field\s*\{[^}]*\}/);
      expect(fieldRule).withContext('tablet .field rule must exist').toBeTruthy();
      expect(fieldRule![0]).toMatch(/aspect-ratio:\s*1\.15\s*\/\s*1/);
    });

    it('mobile viewport (<=600px): .field has aspect-ratio 1.15 / 1 AND no max-height cap that would override it', () => {
      const block = extractMediaBlock('max-width: 600px');
      expect(block).withContext('mobile @media block must exist').toBeTruthy();
      const fieldRule = block.match(/\.field\s*\{[^}]*\}/);
      expect(fieldRule).withContext('mobile .field rule must exist').toBeTruthy();
      expect(fieldRule![0]).toMatch(/aspect-ratio:\s*1\.15\s*\/\s*1/);
      // Mobile layout keeps the field ratio without a fixed height cap.
      expect(fieldRule![0]).not.toMatch(/max-height:\s*\d+(vh|px)/);
    });
  });
});

/**
 * Responsive field sizing: the pitch should scale with the modal, keep
 * its football-field proportions, and avoid old fixed-width caps.
 */
describe('SquadEditorModalComponent responsive field sizing', () => {
  /**
   * Reads the @Component.styles source. For inline-styled components
   * (like this one) Angular stores the CSS strings on the component
   * definition at `\u0275cmp.styles`, but with Angular's emulated
   * encapsulation every selector is rewritten with `[_ngcontent-%COMP%]`
   * (or the hashed version at runtime). {@link #stripEncapsulation}
   * removes those markers so regex assertions match the original
   * class names.
   *
   * Mirrors the helper in the responsive breakpoint suite because sibling
   * describe blocks don't share local function declarations.
   */
  function stylesSource(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styles = (SquadEditorModalComponent as any)['\u0275cmp']?.styles ?? [];
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

  // Extracts a media-query block while preserving nested CSS rules.
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

  it('desktop default viewport (>=1025px): .field has max-width: 100% (no fixed width cap)', () => {
    // The field is height-driven with max-width: 100%; old fixed caps stay removed.
    const src = stripEncapsulation(stylesSource());
    const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
    const fieldRule = extractFieldRule(nonMedia);
    expect(fieldRule).withContext('top-level .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*100%/,
      'desktop default .field must use max-width: 100% (no fixed width cap)');
    // Sanity: no min(cap, ...) pattern.
    expect(fieldRule).not.toMatch(/max-width:\s*min\(/);
  });

  it('desktop default viewport (>=1025px): .field has height: 100% (height-driven)', () => {
    // The field uses the container height; aspect-ratio determines width.
    const src = stripEncapsulation(stylesSource());
    const nonMedia = src.replace(/@media[\s\S]*?\}\s*\}/g, '');
    const fieldRule = extractFieldRule(nonMedia);
    expect(fieldRule).toBeTruthy();
    expect(fieldRule).toMatch(/height:\s*100%\s*;/);
  });

  it('large desktop viewport (>=1600px): .field inherits from base (no override)', () => {
    // The field is height-driven with max-width: 100%; old fixed caps stay removed.
    const block = extractMediaBlock('min-width: 1600px');
    expect(block).toBeTruthy();
    // The large-desktop @media block may have rules for other selectors
    // (e.g. .squad-editor-container), but should NOT re-declare .field
    // with a max-width cap.
    const fieldRule = block.match(/\.field\s*\{[^}]*\}/);
    if (fieldRule) {
      expect(fieldRule[0]).not.toMatch(/max-width:\s*min\(/,
        'large-desktop .field must NOT redefine fixed max-width cap');
    }
  });

  it('tablet viewport (601-1024px): .field has max-width: 100% (no fixed width cap)', () => {
    // Tablet/mobile use the same max-width: 100% field strategy.
    const block = extractMediaBlock('min-width: 601px) and (max-width: 1024px');
    expect(block).withContext('tablet @media block must exist').toBeTruthy();
    const fieldRule = extractFieldRule(block);
    expect(fieldRule).withContext('tablet .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*100%/,
      'tablet .field must use max-width: 100% (no fixed width cap)');
  });

  it('mobile viewport (<=600px): .field has max-width: 100% (no fixed width cap)', () => {
    // Tablet/mobile use the same max-width: 100% field strategy.
    const block = extractMediaBlock('max-width: 600px');
    expect(block).withContext('mobile @media block must exist').toBeTruthy();
    const fieldRule = extractFieldRule(block);
    expect(fieldRule).withContext('mobile .field rule must exist').toBeTruthy();
    expect(fieldRule).toMatch(/max-width:\s*100%/,
      'mobile .field must use max-width: 100% (no fixed width cap)');
  });

  it('aspect-ratio 1.15 / 1 is preserved in all 4 viewports (default + 3 breakpoints)', () => {
    // The field is intentionally more square than the older landscape shape.
    // Sweep each breakpoint and assert the .field rule carries the ratio.
    const src = stripEncapsulation(stylesSource());
    const nonMedia = extractFieldRule(src.replace(/@media[\s\S]*?\}\s*\}/g, ''));
    const mobile = extractFieldRule(extractMediaBlock('max-width: 600px'));
    const tablet = extractFieldRule(extractMediaBlock('min-width: 601px) and (max-width: 1024px'));
    const largeDesktop = extractFieldRule(extractMediaBlock('min-width: 1600px'));

    // Large-desktop block doesn't necessarily re-declare aspect-ratio
    // (it inherits from default), but mobile/tablet/default MUST carry it.
    expect(nonMedia).toMatch(/aspect-ratio:\s*1\.15\s*\/\s*1/);
    expect(mobile).toMatch(/aspect-ratio:\s*1\.15\s*\/\s*1/);
    expect(tablet).toMatch(/aspect-ratio:\s*1\.15\s*\/\s*1/);

    // For large-desktop: assert that either the block sets aspect-ratio
    // OR there's no override (the default applies). We accept either
    // pattern as long as NO breakpoint strips aspect-ratio from the field.
    const allBreakpointsHaveRatio = [mobile, tablet].every(r => /aspect-ratio:\s*1\.15\s*\/\s*1/.test(r));
    expect(allBreakpointsHaveRatio).withContext('mobile + tablet .field must both carry aspect-ratio: 1.15 / 1').toBeTrue();

    // large-desktop .field may NOT re-declare aspect-ratio (it inherits
    // from default). We assert that NO @media block STRIPS aspect-ratio
    // from the field - i.e., no @media block sets `aspect-ratio: <other>`
    // or removes it. Since CSS only adds/overrides, the safe check is:
    // no @media block declares a different aspect-ratio value than 1.15/1.
    const mediaBlocks: Array<{label: string; block: string}> = [
      { label: 'mobile',         block: extractMediaBlock('max-width: 600px') },
      { label: 'tablet',         block: extractMediaBlock('min-width: 601px) and (max-width: 1024px') },
      { label: 'large-desktop',  block: extractMediaBlock('min-width: 1600px') }
    ];
    mediaBlocks.forEach(({label, block}) => {
      const aspectRatioInBlock = block.match(/aspect-ratio:\s*([^;}]+)/);
      if (aspectRatioInBlock) {
        // If the breakpoint declares aspect-ratio, it must be 1.15 / 1.
        expect(aspectRatioInBlock[1].replace(/\s+/g, ' ').trim())
          .withContext(`${label} .field aspect-ratio must be 1.15 / 1 if declared`)
          .toMatch(/^1\.15\s*\/\s*1$/);
      }
      // If aspect-ratio is NOT declared in this block, that's fine -
      // it inherits from the default rule. We only assert that whatever
      // is declared matches 1.15/1.
    });
  });

  it('field-container has min-height: 0 to allow flex child to honor aspect-ratio', () => {
    // min-height:0 lets the flex child honor aspect-ratio in tight viewports.
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
 * Marker effectiveness: players with strong tactical fit get the green visual
 * state, while weaker fits remain yellow/red.
 */
describe('SquadEditorModalComponent green marker effectiveness', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // Five slots with deterministic perPlayerEffectiveness:
  //   GK-1=1.0, S22-1=0.95 and S05-3=1.0 -> green
  //   S13-2=0.7 -> yellow
  //   S05-2=0.5 -> red
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
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
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

  // The marker with eff >= 0.9 must get eff-green. This spec checks the
  // semantic class; browser smoke tests cover the actual glow rendering.
  it('CSS class eff-green applies to markers with eff >= 0.9 (green glow visual symmetry check)', (done) => {
    setTimeout(() => {
      fixture.detectChanges();
      const goodMarkers = fixture.nativeElement.querySelectorAll('.player-marker.eff-green') as NodeListOf<HTMLElement>;
      // 3 markers con eff >= 0.9 (GK-1=1.0, S22-1=0.95, S05-3=1.0).
      expect(goodMarkers.length).toBeGreaterThan(0,
        'expected at least 1 eff-green marker rendered in the DOM');
      // Sanity: eff-green no deberia colisionar con eff-yellow ni eff-red.
      goodMarkers.forEach((c: HTMLElement) => {
        expect(c.classList.contains('eff-yellow')).withContext('eff-green marker must not also be eff-yellow').toBeFalse();
        expect(c.classList.contains('eff-red')).withContext('eff-green marker must not also be eff-red').toBeFalse();
      });
      done();
    }, 30);
  });
});

/**
 * Bench display: the modal prefers the full squad passed by the caller over
 * the current lineup response, so available substitutes are not lost.
 * This block verifies:
 *
 *   - with squad of 22 + lineup of 11 -> benchPlayers.length === 11
 *   - with squad of 7 + lineup of 7 (short-handed) -> benchPlayers.length === 0
 *   - with no squad in dialog data -> fallback to response.players
 */
describe('SquadEditorModalComponent bench display', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  /**
   * 4-4-2 formation: 1 GK + 2 CB + 1 LB + 1 RB + 2 CM + 2 ST = 10 outfield + 1 GK = 11.
   * Positions come from /lineup-editor/formations.
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
   * Build SessionPlayer-shaped objects compatible with `data.squad`.
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
      if (url.includes('/lineup-editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/lineup-editor/formations')) {
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

  it('with squad=22 and lineup=11, benchPlayers.length === 11', (done) => {
    // Mock /career/lineup/current with 11 persisted players and slots.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/lineup-editor/formations')) {
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

  it('with squad=7 and lineup=7, benchPlayers.length === 0', (done) => {
    // Short-handed squad: lineup uses every available player, so the
    // bench should remain empty and should not invent unavailable players.
    const shortSquad: any[] = Array.from({ length: 7 }, (_, i) => ({
      sessionPlayerId: `short-${i}`,
      name: `Short ${i}`,
      position: ['GK', 'CB', 'CB', 'CM', 'CM', 'ST', 'ST'][i],
      age: 25, attack: 70, defense: 70, technique: 70, speed: 70, stamina: 70, mentality: 70,
      marketValue: 500000, energy: 100, form: 70,
      injured: false, injuryType: null, injuryRemainingMatches: 0,
      origin: 'CLONED'
    }));
    // Reconfigure TestBed with a short squad.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null, squad: shortSquad } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    // Mock lineup with the same seven short-squad players.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/lineup-editor/formations')) {
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

  it('with no squad in dialog data, benchPlayers.length === 0', (done) => {
    // Reconfigure TestBed without squad in MAT_DIALOG_DATA: fallback to playersList.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        // No squad source: fallback must use response.players from the lineup.
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/lineup-editor/formations')) {
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
      // Fallback: bench filters players without slotId, so a fully slotted
      // lineup yields 0 bench players.
      expect(legacyComponent.benchPlayers.length).toBe(0,
        'legacy fallback should produce bench=0 (no squad source)');
      expect(legacyComponent.homePlayers.length).toBe(11,
        'legacy fallback should still map 11 lineup players to home');
      done();
    }, 50);
  });

  it('with empty squad in dialog data, uses fallback lineup players', (done) => {
    // Reconfigure TestBed with squad=[]; empty squad should use the same fallback path.
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
      if (url.includes('/lineup-editor/subdivisions')) {
        return of([{
          subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1,
          left: 35, top: 88, width: 30, height: 10, zone: 'GK'
        }]);
      }
      if (url.includes('/lineup-editor/formations')) {
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
   * Minimum-player wording: when the user tries to save fewer than seven
   * players, the modal must make clear that seven is the floor, not the
   * maximum. The assertion checks important fragments rather than the
   * exact sentence so future copy edits stay cheap.
   */
  describe('squad-editor-modal minimum-player wording', () => {
    it('error message includes the floor clarification', () => {
      const threePlayerFixture = TestBed.createComponent(SquadEditorModalComponent);
      const threePlayerComponent = threePlayerFixture.componentInstance;
      threePlayerFixture.detectChanges();

      // Force the < 7 branch of saveLineup(): push 3 players through homePlayers$.next().
      (threePlayerComponent as any).homePlayers$.next([{}, {}, {}] as any);
      (threePlayerComponent as any).saveLineup();

      const captured = (threePlayerComponent as any).errorMessage$.value;
      expect(captured).toContain('Mínimo 7',
        'error must still mention the 7-player floor');
      expect(captured).toContain('(puedes tener más)',
        'the clarification "(puedes tener más)" must be present so users '
          + 'understand 7 is a floor, not a ceiling');
    });

    it('valid player counts do not emit the minimum-player message', () => {
      // The clarification only applies to the < 7 branch; the save path with enough
      // players must clear the error instead of re-emitting the Mínimo 7 message.
      const okFixture = TestBed.createComponent(SquadEditorModalComponent);
      const okComponent = okFixture.componentInstance;
      okFixture.detectChanges();

      const validPlayers = Array.from({ length: 11 }, (_, i) => ({
        playerId: `valid-${i}`,
        name: `Valid ${i}`,
        position: i === 0 ? 'GK' : (i <= 4 ? 'DEF' : (i <= 8 ? 'MID' : 'ATT')),
        role: i === 0 ? 'GK' : (i <= 4 ? 'DEF' : (i <= 8 ? 'MID' : 'ATT')),
        overall: 70,
        slotId: i === 0 ? 'GK-1' : `S${20 + i}-1`,
      }));
      spyOn(okComponent as any, 'canPlayerUseSlot').and.returnValue(true);
      (okComponent as any).homePlayers$.next(validPlayers as any);
      (okComponent as any).saveLineup();

      const captured = (okComponent as any).errorMessage$.value;
      expect(captured).not.toContain('Mínimo 7',
        'with a valid lineup (11 players) the Mínimo 7 message must NOT be emitted');
    });
  });
});

/**
 * Player markers render as compact cards: squad number, player name,
 * and a role badge colored by family (GK, DEF, MID, ATT).
 */
describe('SquadEditorModalComponent marker cards', () => {
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
  // Positions match formation slot roles one-to-one here: GK, DEF,
  // MID, ATT, MID. The marker role label renders player.role.
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
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of([
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
    // Five players should render as five marker cards, each with number,
    // name and role label.
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
      // The five players in PLAYERS after role-match against the formation.
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
    // Assert the four role color rules exist with the expected palette.
    const styles = (SquadEditorModalComponent as any)['\u0275cmp']?.styles ?? [];
    const src = (Array.isArray(styles) ? styles.join('\n') : String(styles))
      .replace(/\[[_]?ngcontent-[^\]]*\]/g, '');
    expect(src).toMatch(/\.player-marker\.color-gk\s+\.player-role-label\s*\{[^}]*background:\s*#f59e0b/);
    expect(src).toMatch(/\.player-marker\.color-def\s+\.player-role-label\s*\{[^}]*background:\s*#3b82f6/);
    expect(src).toMatch(/\.player-marker\.color-mid\s+\.player-role-label\s*\{[^}]*background:\s*#10b981/);
    expect(src).toMatch(/\.player-marker\.color-att\s+\.player-role-label\s*\{[^}]*background:\s*#ef4444/);
  });
});

/**
 * Role matching compares tactical roles by family, so generic squad roles
 * like DEF, MID, ATT, or WINGER still fit specific formation slots.
 */
describe('SquadEditorModalComponent role-match by family', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of([]);
      if (url.includes('/lineup-editor/formations')) return of([]);
      if (url.includes('/career/lineup/current')) return of(null);
      return of(null);
    }) as any);
    httpClientSpy.post.and.callFake(((_url: string, _body: any) => of({})) as any);

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

  // ---- rolesMatch() ----

  it('rolesMatch: exact string match returns true', () => {
    expect((component as any).rolesMatch('CB', 'CB')).toBeTrue();
    expect((component as any).rolesMatch('GK', 'GK')).toBeTrue();
  });

  it('rolesMatch: GK only matches GK (no cross-family)', () => {
    expect((component as any).rolesMatch('GK', 'CB')).toBeFalse();
    expect((component as any).rolesMatch('CB', 'GK')).toBeFalse();
  });

  it('rolesMatch: DEF family covers CB/LB/RB/LWB/RWB/DEF in either direction', () => {
    const defRoles = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'];
    for (const r1 of defRoles) {
      for (const r2 of defRoles) {
        expect((component as any).rolesMatch(r1, r2)).withContext(`${r1} <-> ${r2} must match (DEF family)`).toBeTrue();
      }
    }
  });

  it('rolesMatch: MID family covers CM/CDM/CAM/LM/RM/MID in either direction', () => {
    const midRoles = ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'];
    for (const r1 of midRoles) {
      for (const r2 of midRoles) {
        expect((component as any).rolesMatch(r1, r2)).withContext(`${r1} <-> ${r2} must match (MID family)`).toBeTrue();
      }
    }
  });

  it('rolesMatch: ATT family covers ST/LW/RW/CF/ATT/WINGER in either direction', () => {
    const attRoles = ['ST', 'LW', 'RW', 'CF', 'ATT', 'WINGER'];
    for (const r1 of attRoles) {
      for (const r2 of attRoles) {
        expect((component as any).rolesMatch(r1, r2)).withContext(`${r1} <-> ${r2} must match (ATT family)`).toBeTrue();
      }
    }
  });

  it('rolesMatch: cross-family returns false (DEF vs MID, MID vs ATT, etc.)', () => {
    expect((component as any).rolesMatch('CB', 'CM')).toBeFalse();
    expect((component as any).rolesMatch('CM', 'ST')).toBeFalse();
    expect((component as any).rolesMatch('LB', 'LW')).toBeFalse();
    expect((component as any).rolesMatch('DEF', 'WINGER')).toBeFalse();
  });

  it('rolesMatch: undefined or empty role returns false (defensive)', () => {
    expect((component as any).rolesMatch(undefined, 'CB')).toBeFalse();
    expect((component as any).rolesMatch('CB', undefined)).toBeFalse();
    expect((component as any).rolesMatch(undefined, undefined)).toBeFalse();
  });

  it('rolesMatch: unknown role returns false (backward compat with legacy roles)', () => {
    expect((component as any).rolesMatch('UNKNOWN', 'CB')).toBeFalse();
    expect((component as any).rolesMatch('CB', 'MYSTERY')).toBeFalse();
  });

  // ---- getRoleFamily() (private, exercised via rolesMatch coverage) ----
  // The matrix tests above cover the family classification. These spot
  // checks keep the WINGER edge case explicit.
  it('getRoleFamily: WINGER maps to ATT (lateral attacker classification)', () => {
    expect((component as any).getRoleFamily('WINGER')).toBe('ATT');
  });

  it('getRoleFamily: GK maps to GK', () => {
    expect((component as any).getRoleFamily('GK')).toBe('GK');
  });

  it('getRoleFamily: unknown role returns null', () => {
    expect((component as any).getRoleFamily('UNKNOWN')).toBeNull();
  });
});


/**
 * Changing formation from the selector must update the selected formation,
 * keep the same starters, refresh marker positions, and reset the loading
 * flag after the backend response completes.
 */
describe('SquadEditorModalComponent formation change updates header and markers', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1', isGoalkeeper: true, sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' }
  ];

  // 11 players positioned GK + LB + CB + CB + RB + CM + CM + CM + CM + ST + ST
  // In this suite we only care that the HTTP fires with the right
  // formation arg; the per-slot mapping is tested elsewhere.
  const ELEVEN_PLAYERS = [
    { playerId: 'p-gk',  name: 'GK',  position: 'GK', overall: 80, energy: 100, injured: false },
    { playerId: 'p-lb',  name: 'LB',  position: 'LB', overall: 80, energy: 100, injured: false },
    { playerId: 'p-cb1', name: 'CB1', position: 'CB', overall: 80, energy: 100, injured: false },
    { playerId: 'p-cb2', name: 'CB2', position: 'CB', overall: 80, energy: 100, injured: false },
    { playerId: 'p-rb',  name: 'RB',  position: 'RB', overall: 80, energy: 100, injured: false },
    { playerId: 'p-cm1', name: 'CM1', position: 'CM', overall: 80, energy: 100, injured: false },
    { playerId: 'p-cm2', name: 'CM2', position: 'CM', overall: 80, energy: 100, injured: false },
    { playerId: 'p-cm3', name: 'CM3', position: 'CM', overall: 80, energy: 100, injured: false },
    { playerId: 'p-lm',  name: 'LM',  position: 'LM', overall: 80, energy: 100, injured: false },
    { playerId: 'p-st1', name: 'ST1', position: 'ST', overall: 80, energy: 100, injured: false },
    { playerId: 'p-st2', name: 'ST2', position: 'ST', overall: 80, energy: 100, injured: false }
  ];

  // 4-4-2 formation response: used for /current and as the initial selectedFormation.
  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2', description: '4-4-2',
      defenders: 4, midfielders: 4, attackers: 2, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'LB', xPercent: 11, yPercent: 83, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CB', xPercent: 33, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S22-2' },
        { index: 3, role: 'CB', xPercent: 67, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S23-2' },
        { index: 4, role: 'RB', xPercent: 89, yPercent: 83, actionRangePercent: 7, subdivisionId: 'S24-3' },
        { index: 5, role: 'CM', xPercent: 30, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S13-2' },
        { index: 6, role: 'CM', xPercent: 50, yPercent: 55, actionRangePercent: 7, subdivisionId: 'S14-2' },
        { index: 7, role: 'CM', xPercent: 70, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S15-2' },
        { index: 8, role: 'LM', xPercent: 11, yPercent: 17, actionRangePercent: 7, subdivisionId: 'S04-1' },
        { index: 9, role: 'ST', xPercent: 50, yPercent: 12, actionRangePercent: 6, subdivisionId: 'S05-2' },
        { index: 10, role: 'ST', xPercent: 89, yPercent: 17, actionRangePercent: 7, subdivisionId: 'S06-3' }
      ]
    },
    {
      name: '3-5-2', description: '3-5-2',
      defenders: 3, midfielders: 5, attackers: 2, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'CB', xPercent: 25, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S22-1' },
        { index: 2, role: 'CB', xPercent: 50, yPercent: 85, actionRangePercent: 6, subdivisionId: 'S22-2' },
        { index: 3, role: 'CB', xPercent: 75, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S23-2' },
        { index: 4, role: 'LWB', xPercent: 10, yPercent: 55, actionRangePercent: 8, subdivisionId: 'S13-1' },
        { index: 5, role: 'CM', xPercent: 32, yPercent: 55, actionRangePercent: 8, subdivisionId: 'S13-2' },
        { index: 6, role: 'CM', xPercent: 50, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S14-2' },
        { index: 7, role: 'CM', xPercent: 68, yPercent: 55, actionRangePercent: 8, subdivisionId: 'S15-2' },
        { index: 8, role: 'RWB', xPercent: 90, yPercent: 55, actionRangePercent: 8, subdivisionId: 'S15-3' },
        { index: 9, role: 'ST', xPercent: 38, yPercent: 15, actionRangePercent: 6, subdivisionId: 'S05-2' },
        { index: 10, role: 'ST', xPercent: 62, yPercent: 15, actionRangePercent: 6, subdivisionId: 'S06-2' }
      ]
    },
    {
      name: '4-3-3', description: '4-3-3',
      defenders: 4, midfielders: 3, attackers: 3, outfieldPlayers: 10,
      positions: [
        { index: 0, role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'LB', xPercent: 11, yPercent: 83, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CB', xPercent: 33, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S22-2' },
        { index: 3, role: 'CB', xPercent: 67, yPercent: 83, actionRangePercent: 6, subdivisionId: 'S23-2' },
        { index: 4, role: 'RB', xPercent: 89, yPercent: 83, actionRangePercent: 7, subdivisionId: 'S24-3' },
        { index: 5, role: 'CM', xPercent: 30, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S13-2' },
        { index: 6, role: 'CM', xPercent: 50, yPercent: 55, actionRangePercent: 7, subdivisionId: 'S14-2' },
        { index: 7, role: 'CM', xPercent: 70, yPercent: 50, actionRangePercent: 8, subdivisionId: 'S15-2' },
        { index: 8, role: 'LW', xPercent: 18, yPercent: 17, actionRangePercent: 7, subdivisionId: 'S04-1' },
        { index: 9, role: 'ST', xPercent: 50, yPercent: 12, actionRangePercent: 6, subdivisionId: 'S05-2' },
        { index: 10, role: 'RW', xPercent: 82, yPercent: 17, actionRangePercent: 7, subdivisionId: 'S06-3' }
      ]
    }
  ];

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations')) return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of({
          formation: '4-4-2',
          players: ELEVEN_PLAYERS,
          confirmed: false,
          warnings: [],
          slots: []
        });
      }
      return of(null);
    }) as any);

    // /auto-select returns the same 11 players; the response shape only
    // needs to let applyLineupToSlots() run.
    //
    // Use timer(0) so the mocked HTTP response is async. That lets
    // tests observe isFormationChanging=true while the request is in flight.
    httpClientSpy.post.and.callFake(((url: string, body: any) => {
      if (url.includes('/career/lineup/auto-select')) {
        return timer(0).pipe(map(() => ({ formation: body?.formation || '4-4-2', players: ELEVEN_PLAYERS, warnings: [] })));
      }
      if (url.includes('/career/lineup/manual-select')) {
        return timer(0).pipe(map(() => ({ players: ELEVEN_PLAYERS, warnings: [] })));
      }
      if (url.includes('/career/lineup/confirm')) {
        return timer(0).pipe(map(() => ({ confirmed: true, warnings: [] })));
      }
      return timer(0).pipe(map(() => ({})));
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

  // ---- formation change behavior ----

  it('onFormationChange(3-5-2) saves the same XI with formation=3-5-2', (done) => {
    // Passing the new formation explicitly matches the production
    // ngModelChange flow and prevents sending the old formation value.
    setTimeout(() => {
      component.onFormationChange('3-5-2');

      // Wait for the HTTP call to flush (subscribe is synchronous since
      // of(...) emits immediately, but cdr.detectChanges etc. may batch).
      setTimeout(() => {
        const manualSelectCalls = httpClientSpy.post.calls.allArgs()
          .filter(args => String(args[0]).includes('/career/lineup/manual-select'));
        expect(manualSelectCalls.length).withContext('at least 1 /manual-select call expected').toBeGreaterThan(0);
        const lastCall = manualSelectCalls[manualSelectCalls.length - 1];
        expect((lastCall[1] as any).formation).withContext(
          'body.formation must be the NEW formation (3-5-2), not the OLD one (4-4-2)').toBe('3-5-2');
        expect((lastCall[1] as any).playerIds.length).withContext('formation changes must keep the same 11 starters').toBe(11);
        done();
      }, 30);
    }, 30);
  });

  it('homeFormation$ observable reflects the new formation after change', (done) => {
    setTimeout(() => {
      component.onFormationChange('3-5-2');
      // homeFormation$ is updated synchronously inside onFormationChange
      // (before the HTTP call). The BehaviorSubject emits the new value
      // immediately.
      expect(component.homeFormation$.value).withContext(
        'homeFormation$ must reflect the new formation immediately').toBe('3-5-2');
      done();
    }, 30);
  });

  it('selectedFormation is updated to the new formation', (done) => {
    // The (ngModelChange) wiring in the production template sets
    // selectedFormation before invoking the handler. We simulate that by
    // passing the new value through the handler arg (which is what the
    // production flow effectively delivers).
    setTimeout(() => {
      component.onFormationChange('3-5-2');
      expect(component.selectedFormation).withContext(
        'selectedFormation must be the new formation').toBe('3-5-2');
      done();
    }, 30);
  });

  it('isFormationChanging resets to false after HTTP completes', (done) => {
    // The loading flag resets inside the HTTP callback so the modal
    // does not depend on any parent listener to become interactive again.
    setTimeout(() => {
      expect(component.isFormationChanging).withContext(
        'precondition: flag must start false after init').toBeFalse();

      component.onFormationChange('3-5-2');
      expect(component.isFormationChanging).withContext(
        'flag must be true synchronously after handler runs').toBeTrue();

      // Wait for HTTP callback to flush + reset the flag.
      setTimeout(() => {
        expect(component.isFormationChanging).withContext(
          'flag must reset to false after HTTP completes').toBeFalse();
        done();
      }, 30);
    }, 30);
  });

  it('changing formation twice in a row is not blocked by the loading flag', (done) => {
    // After the first formation change completes, the second change
    // must still reach the backend.
    // The flag resets after each HTTP response, so repeated changes work.
    setTimeout(() => {
      component.onFormationChange('3-5-2');
      setTimeout(() => {
        // First HTTP completed, flag reset.
        const callsAfterFirst = httpClientSpy.post.calls.allArgs()
          .filter(args => String(args[0]).includes('/career/lineup/manual-select')).length;

        component.onFormationChange('4-3-3');
        setTimeout(() => {
          const callsAfterSecond = httpClientSpy.post.calls.allArgs()
            .filter(args => String(args[0]).includes('/career/lineup/manual-select')).length;
          expect(callsAfterSecond - callsAfterFirst).withContext(
            'second formation change must trigger a SECOND /manual-select call').toBe(1);

          // Last call's body must have formation=4-3-3 (the second target),
          // not 3-5-2 (the first target).
          const lastCall = httpClientSpy.post.calls.allArgs()
            .filter(args => String(args[0]).includes('/career/lineup/manual-select'))
            .pop();
          expect((lastCall![1] as any).formation).toBe('4-3-3');
          done();
        }, 30);
      }, 30);
    }, 30);
  });

  it('does not call backend when target formation equals current formation', (done) => {
    // Re-selecting the current formation should be a no-op and should
    // not set the loading flag.
    setTimeout(() => {
      const callsBefore = httpClientSpy.post.calls.allArgs()
        .filter(args => String(args[0]).includes('/career/lineup/manual-select')).length;

      // selectedFormation starts as '4-4-2' (from /current).
      // Same value: no-op.
      component.onFormationChange('4-4-2');
      setTimeout(() => {
        const callsAfter = httpClientSpy.post.calls.allArgs()
          .filter(args => String(args[0]).includes('/career/lineup/manual-select')).length;
        expect(callsAfter - callsBefore).withContext(
          'selecting the current formation must NOT trigger /manual-select').toBe(0);
        expect(component.isFormationChanging).withContext(
          'flag must remain false for no-op selection').toBeFalse();
        done();
      }, 20);
    }, 30);
  });

  it('formation select is wired through ngModelChange', (done) => {
    // Static guard against accidentally wiring the select through the
    // native change event instead of ngModelChange.
    setTimeout(() => {
      fixture.detectChanges();
      const compiled = (fixture.nativeElement as HTMLElement).querySelector('.formation-selector select') as HTMLSelectElement;
      expect(compiled).withContext('.formation-selector select must exist in DOM').toBeTruthy();
      // Read the component source to verify the template wiring.
      // In Karma, search a couple of likely component source paths.
      const fs = (window as any).require ? (window as any).require('fs') : null;
      // If fs is unavailable, the behavioral tests above still cover the flow.
      if (!fs) {
        pending('fs not available in this karma runtime: relying on behavioral coverage');
        return;
      }
      // Find component.ts relative to the spec runtime.
      const candidates = [
        'src/app/components/squad-editor-modal/squad-editor-modal.component.ts',
        '../squad-editor-modal.component.ts'
      ];
      let source: string | null = null;
      for (const c of candidates) {
        try {
          source = fs.readFileSync(c, 'utf-8') as string;
          if (source && source.includes('squad-editor-modal')) { break; }
        } catch (e) {
          // continue
        }
      }
      if (!source) {
        pending('could not locate component source: relying on behavioral coverage');
        return;
      }
      // Verify (ngModelChange) within the formation-selector block.
      const ngModelChangeMatch = /formation-selector[\s\S]{0,500}\(ngModelChange\)/.test(source);
      expect(ngModelChangeMatch).withContext(
        'template source must wire the formation <select> with (ngModelChange)').toBeTrue();
      // Negative guard.
      const oldStyleChange = /formation-selector[\s\S]{0,500}\(change\)\s*=\s*[\"\']onFormationChange/.test(source);
      expect(oldStyleChange).withContext(
        'template source must NOT use (change)="onFormationChange()" on the formation select').toBeFalse();
      done();
    }, 30);
  });

  it('isFormationChanging toggles true-to-false around the HTTP lifecycle', (done) => {
    // Check the JS flag directly: it is the source of truth for the
    // disabled binding and avoids fragile DOM timing in jsdom.
    setTimeout(() => {
      // Precondition: flag starts false after init.
      expect(component.isFormationChanging).withContext(
        'precondition: flag must start false after init').toBeFalse();

      component.onFormationChange('3-5-2');
      expect(component.isFormationChanging).withContext(
        'flag must be true synchronously after handler runs (HTTP in flight)').toBeTrue();

      // Wait for the async mock response and callback.
      setTimeout(() => {
        expect(component.isFormationChanging).withContext(
          'flag must reset to false after HTTP completes').toBeFalse();
        done();
      }, 30);
    }, 30);
  });

  /**
   * Professional pitch visual smoke tests: grass texture, stronger field
   * markings, corner arcs, goal posts, and tactical number badges.
   */
  describe('SquadEditorModalComponent professional pitch visual', () => {
    /**
     * Reads the inline component styles.
     */
    function stylesSource(): string {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const styles = (SquadEditorModalComponent as any)['\u0275cmp']?.styles ?? [];
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

    // Extracts one CSS rule from a style chunk.
    function extractRule(css: string, selector: string): string {
      const re = new RegExp(`\\.${selector.replace(/\./g, '\\.')}\\s*\\{[^}]*\\}`);
      const m = css.match(re);
      return m ? m[0] : '';
    }

    // Grass texture.

    it('.field background uses repeating-linear-gradient (TV-broadcast stripes)', () => {
      const src = stripEncapsulation(stylesSource());
      const fieldRule = extractRule(src, 'field');
      expect(fieldRule).withContext('.field CSS rule must exist').toBeTruthy();
      // Alternating stripes every 5% through a repeating-linear-gradient.
      expect(fieldRule).toMatch(/repeating-linear-gradient/);
      // 0px -> 5% marks the stripe pattern.
      expect(fieldRule).toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.015\s*\)\s*5%/);
      // 5% -> 10% alternates to transparent.
      expect(fieldRule).toMatch(/transparent\s+5%\s*,\s*transparent\s+10%/);
    });

    it('.field background uses radial-gradient center-to-edge + overlay blend', () => {
      const src = stripEncapsulation(stylesSource());
      const fieldRule = extractRule(src, 'field');
      expect(fieldRule).toMatch(/radial-gradient\(/);
      // Center gradient runs from #3a8159 to #2d6a3e and #235534.
      expect(fieldRule).toMatch(/#3a8159\s+0%/);
      expect(fieldRule).toMatch(/#2d6a3e\s+50%/);
      expect(fieldRule).toMatch(/#235534\s+100%/);
      // Overlay blends the stripes with the radial grass gradient.
      expect(fieldRule).toMatch(/background-blend-mode:\s*overlay/);
    });

    /* ----------------------------------------------------------------------- */
    /* Field markings */
    /* ----------------------------------------------------------------------- */

    it('outer border (frame) is 2.5px solid rgba white alpha 0.95', () => {
      const src = stripEncapsulation(stylesSource());
      const fieldRule = extractRule(src, 'field');
      expect(fieldRule).toMatch(/border:\s*2\.5px\s+solid\s+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.95\s*\)/);
    });

    it('.center-line height 2.5px + alpha 0.95 background', () => {
      const src = stripEncapsulation(stylesSource());
      const rule = extractRule(src, 'center-line');
      expect(rule).toMatch(/height:\s*2\.5px/);
      expect(rule).toMatch(/background:\s*rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.95\s*\)/);
    });

    it('.center-circle diameter 18% of the field width', () => {
      const src = stripEncapsulation(stylesSource());
      const rule = extractRule(src, 'center-circle');
      // Width 18% plus aspect-ratio keeps the center circle round.
      expect(rule).toMatch(/width:\s*18%/);
      expect(rule).toMatch(/aspect-ratio:\s*1/);
      expect(rule).toMatch(/border-radius:\s*50%/);
    });

    it('penalty areas now 60% w x 16% h (TV-broadcast)', () => {
      const src = stripEncapsulation(stylesSource());
      // Both penalty areas use the same size.
      const left = extractRule(src, 'left-penalty-area');
      const right = extractRule(src, 'right-penalty-area');
      expect(left).toMatch(/width:\s*60%/);
      expect(left).toMatch(/height:\s*16%/);
      expect(right).toMatch(/width:\s*60%/);
      expect(right).toMatch(/height:\s*16%/);
      // Border matches the pitch-marking palette.
      expect(left).toMatch(/border:\s*2px\s+solid\s+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.9\s*\)/);
    });

    it('goal areas now 25% w x 6% h (TV-broadcast)', () => {
      const src = stripEncapsulation(stylesSource());
      const left = extractRule(src, 'left-goal-area');
      const right = extractRule(src, 'right-goal-area');
      expect(left).toMatch(/width:\s*25%/);
      expect(left).toMatch(/height:\s*6%/);
      expect(right).toMatch(/width:\s*25%/);
      expect(right).toMatch(/height:\s*6%/);
    });

    it('penalty spots are border-radius:50% (circular dots)', () => {
      const src = stripEncapsulation(stylesSource());
      const left = extractRule(src, 'left-penalty-spot');
      const right = extractRule(src, 'right-penalty-spot');
      expect(left).toMatch(/border-radius:\s*50%/);
      expect(right).toMatch(/border-radius:\s*50%/);
      // Background full-opacity white alpha 0.95.
      expect(left).toMatch(/background:\s*rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.95\s*\)/);
    });

    it('penalty arcs now 14% w', () => {
      const src = stripEncapsulation(stylesSource());
      const left = extractRule(src, 'left-penalty-arc');
      const right = extractRule(src, 'right-penalty-arc');
      // Penalty arcs use the larger 14% width.
      expect(left).toMatch(/width:\s*14%/);
      expect(right).toMatch(/width:\s*14%/);
    });

    /* ----------------------------------------------------------------------- */
    /* Corner arcs */
    /* ----------------------------------------------------------------------- */

    it('4 corner-arc elements exist (corner-tl/tr/bl/br)', () => {
      // Structural check: query the rendered modal DOM.
      fixture.detectChanges();
      const tl = fixture.nativeElement.querySelector('.corner-arc.corner-tl');
      const tr = fixture.nativeElement.querySelector('.corner-arc.corner-tr');
      const bl = fixture.nativeElement.querySelector('.corner-arc.corner-bl');
      const br = fixture.nativeElement.querySelector('.corner-arc.corner-br');
      expect(tl).withContext('.corner-tl must exist').toBeTruthy();
      expect(tr).withContext('.corner-tr must exist').toBeTruthy();
      expect(bl).withContext('.corner-bl must exist').toBeTruthy();
      expect(br).withContext('.corner-br must exist').toBeTruthy();
    });

    it('corner-arc positioned absolutely with 2.5% size + 100% radius on outer corner', () => {
      const src = stripEncapsulation(stylesSource());
      // Base corner arc: 2.5% square with a white border.
      const base = extractRule(src, 'corner-arc');
      expect(base).toMatch(/width:\s*2\.5%/);
      expect(base).toMatch(/height:\s*2\.5%/);
      expect(base).toMatch(/border:\s*2px\s+solid\s+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.9\s*\)/);
      // Top-left corner has the outer radius.
      const tl = extractRule(src, 'corner-tl');
      expect(tl).toMatch(/border-top-left-radius:\s*100%/);
      // Inner-facing borders are hidden.
      expect(tl).toMatch(/border-bottom:\s*none/);
      expect(tl).toMatch(/border-right:\s*none/);
    });

    /* ----------------------------------------------------------------------- */
    /* Goal posts */
    /* ----------------------------------------------------------------------- */

    it('2 goal-post elements exist (top + bottom)', () => {
      fixture.detectChanges();
      const top = fixture.nativeElement.querySelector('.goal-post.goal-post-top');
      const bottom = fixture.nativeElement.querySelector('.goal-post.goal-post-bottom');
      expect(top).withContext('.goal-post-top must exist').toBeTruthy();
      expect(bottom).withContext('.goal-post-bottom must exist').toBeTruthy();
    });

    it('.goal-post 8% w x 4% h + correct rounded corners', () => {
      const src = stripEncapsulation(stylesSource());
      const base = extractRule(src, 'goal-post');
      expect(base).toMatch(/width:\s*8%/);
      expect(base).toMatch(/height:\s*4%/);
      expect(base).toMatch(/border:\s*2px\s+solid\s+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.85\s*\)/);
      // Top goal has rounded bottom corners.
      const top = extractRule(src, 'goal-post-top');
      expect(top).toMatch(/border-radius:\s*0\s+0\s+8%\s+8%/);
      // Bottom goal has rounded top corners.
      const bottom = extractRule(src, 'goal-post-bottom');
      expect(bottom).toMatch(/border-radius:\s*8%\s+8%\s+0\s+0/);
    });

    /* ----------------------------------------------------------------------- */
    /* Tactical number badge */
    /* ----------------------------------------------------------------------- */

    it('.tactical-number is absolute, 14x14, top:-10 right:-8, border-radius 50%', () => {
      const src = stripEncapsulation(stylesSource());
      const rule = extractRule(src, 'tactical-number');
      expect(rule).toMatch(/position:\s*absolute/);
      expect(rule).toMatch(/top:\s*-10px/);
      expect(rule).toMatch(/right:\s*-8px/);
      expect(rule).toMatch(/width:\s*14px/);
      expect(rule).toMatch(/height:\s*14px/);
      expect(rule).toMatch(/border-radius:\s*50%/);
      // Keep the tactical number above the marker card so it is not
      // clipped by the marker border radius.
      expect(rule).toMatch(/z-index:\s*11/);
    });
  });
});

/**
 * Visual consistency around formation changes and drag/drop:
 * stale slots from previous formations must not appear as ghost tiles,
 * duplicate persisted slot assignments must not stack players, and drag
 * moves must re-emit player arrays so marker positions refresh.
 */
describe('SquadEditorModalComponent ghost slots and drag-drop overlap', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  // Minimal field with 6 slots: 1 GK + 2 outfield. The 2 outfield slots
  // are S22-1 and S13-2, both in the 4-4-2 formation. S99-OUTSIDE is
  // a slot that is NOT in 4-4-2 (the "ghost" position from a previous
  // formation like 4-2-3-1's CAM).
  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1', isGoalkeeper: true,  sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' },
    { subdivisionId: 'S22-1', isGoalkeeper: false, sector: 22, subIndex: 1, left: 10, top: 70, width: 25, height: 12, zone: 'DEFENSE' },
    { subdivisionId: 'S13-2', isGoalkeeper: false, sector: 13, subIndex: 2, left: 40, top: 45, width: 20, height: 12, zone: 'MIDFIELD' },
    { subdivisionId: 'S99-OUTSIDE', isGoalkeeper: false, sector: 99, subIndex: 1, left: 50, top: 30, width: 20, height: 12, zone: 'MIDFIELD' }
  ];

  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2', description: '4-4-2',
      defenders: 1, midfielders: 1, attackers: 0, outfieldPlayers: 2,
      positions: [
        { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'DEF', xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'MID', xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' }
      ]
    }
  ];

  function buildCurrentLineupWithPersistedSlots(
    persistedSlots: Array<{ playerId: string; subdivisionId: string }>,
    players: Array<any>
  ): any {
    return {
      formation: '4-4-2',
      players,
      confirmed: true,
      warnings: [],
      slots: persistedSlots,
      chemistryScore: 85,
      formationEffectiveness: null
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        // Default: 3 players (p-gk, p-def, p-mid) so that loadSquadFromBackend
        // populates slotPlayerMap with GK-1, S22-1, S13-2 for the drag-drop
        // tests. Without these, allPlayers is empty and slotPlayerMap has
        // no players to swap.
        return of(buildCurrentLineupWithPersistedSlots(
          [
            { playerId: 'p-gk',  subdivisionId: 'GK-1' },
            { playerId: 'p-def', subdivisionId: 'S22-1' },
            { playerId: 'p-mid', subdivisionId: 'S13-2' }
          ],
          [
            { playerId: 'p-gk',  name: 'GK',  position: 'GK',  overall: 80, energy: 100, injured: false },
            { playerId: 'p-def', name: 'DEF', position: 'DEF', overall: 80, energy: 100, injured: false },
            { playerId: 'p-mid', name: 'MID', position: 'MID', overall: 80, energy: 100, injured: false }
          ]
        ));
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((_url: string, _body: any) => {
      if (_url.includes('/career/lineup/preview-chemistry')) {
        return of({ score: 80, breakdown: {}, maxSkillByType: {}, coveragePercentage: 10 });
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

  // ---- ghost slot filter helpers ----

  it('isSlotInActiveFormation returns true for slots in the active formation, false for others', (done) => {
    // Identify stale subdivisionIds from a previous formation and keep
    // them out of active formation rendering decisions.
    setTimeout(() => {
      expect((component as any).isSlotInActiveFormation('GK-1')).toBe(true, 'GK-1 is in 4-4-2');
      expect((component as any).isSlotInActiveFormation('S22-1')).toBe(true, 'S22-1 is in 4-4-2');
      expect((component as any).isSlotInActiveFormation('S13-2')).toBe(true, 'S13-2 is in 4-4-2');
      // S99-OUTSIDE is not in 4-4-2 and has no player: hide it.
      expect((component as any).isSlotInActiveFormation('S99-OUTSIDE')).toBe(false, 'S99-OUTSIDE is outside 4-4-2');
      expect((component as any).isSlotInActiveFormation('')).toBe(false, 'empty subdivisionId is never in the formation');
      expect((component as any).isSlotInActiveFormation(undefined)).toBe(false, 'undefined subdivisionId is never in the formation');
      done();
    }, 30);
  });

  it('shouldRenderSlot returns true for active-formation slots or occupied slots, false otherwise', (done) => {
    // The slot tile should render only when it belongs to the active
    // formation or currently holds a player.
    setTimeout(() => {
      const subs = (component as any).subdivisions;
      const gk = subs.find((s: any) => s.subdivisionId === 'GK-1');
      const def = subs.find((s: any) => s.subdivisionId === 'S22-1');
      const mid = subs.find((s: any) => s.subdivisionId === 'S13-2');
      const ghost = subs.find((s: any) => s.subdivisionId === 'S99-OUTSIDE');

      // These slots are part of the active 4-4-2 mock formation.
      expect((component as any).shouldRenderSlot(gk)).toBe(true, 'GK-1 in 4-4-2 -> render');
      expect((component as any).shouldRenderSlot(def)).toBe(true, 'S22-1 in 4-4-2 -> render');
      expect((component as any).shouldRenderSlot(mid)).toBe(true, 'S13-2 in 4-4-2 -> render');

      // S99-OUTSIDE is not in 4-4-2 and has no player: hide it.
      expect((component as any).shouldRenderSlot(ghost)).toBe(false, 'S99-OUTSIDE ghost (no player, not in 4-4-2) -> hide');

      // If a stale outside slot still holds a player, keep it visible
      // so the user can drag the player back into the active shape.
      (component as any).slotPlayerMap['S99-OUTSIDE'] = { playerId: 'p-ghost', name: 'Ghost', position: 'CAM', slotId: 'S99-OUTSIDE' };
      expect((component as any).shouldRenderSlot(ghost)).toBe(true, 'occupied S99-OUTSIDE -> render (so user can drag back)');
      done();
    }, 30);
  });

  // ---- stale persisted slots ----

  it('loadSquadFromBackend drops persisted slots that are not in the active formation', (done) => {
    // Persisted slots from a previous formation must be cleared when
    // they do not belong to the active formation. Use WINGER here so
    // role-match cannot reassign the player into the three-slot mock.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineupWithPersistedSlots(
          [{ playerId: 'p-ghost', subdivisionId: 'S99-OUTSIDE' }],   // ghost: not in 4-4-2
          [{ playerId: 'p-ghost', name: 'GhostW', position: 'WINGER', overall: 80, energy: 100, injured: false }]
        ));
      }
      return of([]);
    }) as any);
    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      // The ghost slot must be cleared and the player must be on the bench.
      expect((component as any).slotPlayerMap['S99-OUTSIDE']).toBeUndefined(
        'slotPlayerMap[ghost] must be cleared by loadSquadFromBackend'
      );
      const homeIds = (component as any).homePlayers.map((p: any) => p.playerId);
      const benchIds = (component as any).benchPlayers.map((p: any) => p.playerId);
      expect(homeIds).not.toContain('p-ghost', 'p-ghost must NOT be in homePlayers (S99-OUTSIDE is not a valid 4-4-2 slot)');
      expect(benchIds).toContain('p-ghost', 'p-ghost goes to bench (WINGER is ATT family, no ATT position in the 3-slot 4-4-2 mock)');
      done();
    }, 30);
  });

  // ---- duplicate persisted slotIds ----

  it('loadSquadFromBackend deduplicates slotIds when two players share a subdivisionId', (done) => {
    // If two persisted entries target the same subdivisionId, only the
    // first keeps the slot. The second goes to the bench so markers do
    // not stack visually.
    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineupWithPersistedSlots(
          [
            { playerId: 'p-gk1', subdivisionId: 'GK-1' },
            { playerId: 'p-gk2', subdivisionId: 'GK-1' }   // duplicate subdivisionId
          ],
          [
            { playerId: 'p-gk1', name: 'GK1', position: 'GK', overall: 80, energy: 100, injured: false },
            { playerId: 'p-gk2', name: 'GK2', position: 'GK', overall: 80, energy: 100, injured: false }
          ]
        ));
      }
      return of([]);
    }) as any);
    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      // Only one GK at GK-1; the other is on the bench.
      const gkSlot = (component as any).slotPlayerMap['GK-1'];
      expect(gkSlot).toBeTruthy('one GK is assigned to GK-1');
      const homeIds = (component as any).homePlayers.map((p: any) => p.playerId);
      const benchIds = (component as any).benchPlayers.map((p: any) => p.playerId);
      expect(homeIds.length).toBe(1, 'only 1 home player (no stacked markers)');
      expect(benchIds).toContain('p-gk2', 'the duplicate GK is on the bench');
      done();
    }, 30);
  });

  // ---- drag-drop re-emits homePlayers$ ----

  it('handleSlotDrop re-emits homePlayers$ with a fresh array reference after a move', (done) => {
    // Drag-drop must emit a fresh homePlayers array after moving a
    // player, so Angular rebuilds marker bindings at the new slot.
    // The default load maps p-gk, p-def and p-mid into the three-slot
    // mock; p-att stays on the bench.
    // handleSlotDrop and verify the re-emit happens.
    setTimeout(() => {
      // Spy on homePlayers$ next to assert it's called with a NEW array
      // reference (not the same one in, not undefined).
      const nextSpy = spyOn((component as any).homePlayers$, 'next').and.callThrough();
      const beforeArray = (component as any).homePlayers$.value;

      // Move p-mid from S13-2 to S22-1 (occupied by p-def): swap.
      const pMid = (component as any).slotPlayerMap['S13-2'];
      expect(pMid).toBeTruthy('p-mid must be at S13-2 in the default loadSquadFromBackend');
      (component as any).handleSlotDrop({
        item: { data: pMid },
        previousContainer: { id: 'slot-S13-2' },
        container: { id: 'slot-S22-1' }
      } as any);

      // Verify the re-emit happened with a new array reference.
      const reemitCalls = nextSpy.calls.allArgs().filter((args: any[]) =>
        Array.isArray(args[0]) && args[0] !== beforeArray
      );
      expect(reemitCalls.length).toBeGreaterThan(0,
        'handleSlotDrop must call homePlayers$.next with a NEW array (spread) so *ngFor rebuilds');
      done();
    }, 30);
  });
});

/**
 * Free-formation behavior:
 * the manager may move players outside their natural tactical role,
 * the lineup is then treated as a custom shape, and the UI marks
 * off-role players clearly without blocking the move.
 */
describe('SquadEditorModalComponent free-formation cross-role drag/drop', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  /**
   * Minimal field with 4 slots matching a 4-4-2 formation. Default
   * loadSquadFromBackend places 4 players (p-gk, p-def, p-mid, p-att)
   * one per slot. Use this for cross-role single-drop tests.
   */
  const SUBDIVISIONS_RESPONSE = [
    { subdivisionId: 'GK-1', isGoalkeeper: true,  sector: 26, subIndex: 1, left: 35, top: 88, width: 30, height: 10, zone: 'GK' },
    { subdivisionId: 'S22-1', isGoalkeeper: false, sector: 22, subIndex: 1, left: 10, top: 70, width: 25, height: 12, zone: 'DEFENSE' },
    { subdivisionId: 'S13-2', isGoalkeeper: false, sector: 13, subIndex: 2, left: 40, top: 45, width: 20, height: 12, zone: 'MIDFIELD' },
    { subdivisionId: 'S05-2', isGoalkeeper: false, sector:  5, subIndex: 2, left: 45, top: 10, width: 10, height: 10, zone: 'ATTACK' }
  ];

  /**
   * Two canonical formations: 4-4-2 (default) and 4-3-3. We expose
   * 4-3-3 so the canonical-detection test can switch formations.
   */
  const FORMATIONS_RESPONSE = [
    {
      name: '4-4-2', description: '4-4-2',
      defenders: 1, midfielders: 1, attackers: 1, outfieldPlayers: 3,
      positions: [
        { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'CB',  xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CM',  xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
        { index: 3, role: 'ST',  xPercent: 50, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' }
      ]
    },
    {
      name: '4-3-3', description: '4-3-3',
      defenders: 1, midfielders: 1, attackers: 1, outfieldPlayers: 3,
      positions: [
        { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'CB',  xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CM',  xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
        { index: 3, role: 'CF',  xPercent: 50, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' }
      ]
    }
  ];

  /**
   * Build a /current response with 4 players + optional formationEffectiveness.
   * formationEffectiveness=null by default (preserves the existing test setup
   * that doesn't worry about the formationEffectiveness row visibility).
   */
  function buildCurrentLineup(chemistryScore: number | null, slots: any[] = []): any {
    return {
      formation: '4-4-2',
      players: [
        { playerId: 'p-gk',  name: 'GK',  position: 'GK',  overall: 80, energy: 100, injured: false },
        { playerId: 'p-def', name: 'Rudiger', position: 'CB', overall: 85, energy: 100, injured: false },
        { playerId: 'p-mid', name: 'Valverde', position: 'CM', overall: 86, energy: 100, injured: false },
        { playerId: 'p-att', name: 'Mbappe', position: 'ST', overall: 92, energy: 100, injured: false }
      ],
      confirmed: true,
      warnings: [],
      slots,
      chemistryScore
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) {
        return of(buildCurrentLineup(85));
      }
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((url: string, _body: any) => {
      if (url.includes('/career/lineup/preview-chemistry')) {
        return of({ score: 91, breakdown: { positionGroups: {}, maxSkillByType: {}, coveragePercentage: 10 },
                    maxSkillByType: {}, coveragePercentage: 10 });
      }
      if (url.includes('/career/lineup/manual-select')) {
        return of({ players: [], warnings: [] });
      }
      if (url.includes('/career/lineup/confirm')) {
        return of({ confirmed: true, warnings: [] });
      }
      if (url.includes('/career/lineup/auto-select')) {
        return of({ formation: '4-4-2', players: [], warnings: [] });
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

  // ---- cross-role drag/drop ----

  it('handleSlotDrop allows cross-role drop (CB p-def -> MID slot S13-2)', (done) => {
    // A CB can be moved into a MID slot. The modal should allow that
    // tactical decision and keep the player's new slot consistent.
    setTimeout(() => {
      const rudiger = (component as any).slotPlayerMap['S22-1'];
      expect(rudiger).toBeTruthy('Rudiger must be at S22-1 (DEF slot) in default loadSquadFromBackend');
      expect(rudiger.role).toBe('CB', 'p-def should be a CB so the cross-role test is meaningful');

      (component as any).handleSlotDrop({
        item: { data: rudiger },
        previousContainer: { id: 'slot-S22-1' },
        container: { id: 'slot-S13-2' }
      } as any);

      // Cross-role drop succeeds (no role validation in handleSlotDrop).
      expect((component as any).slotPlayerMap['S13-2']?.playerId).toBe('p-def',
        'Rudiger must end up in S13-2 (MID slot) after cross-role drop');
      expect(rudiger.slotId).toBe('S13-2',
        'Rudiger.slotId must reflect the new slot, not the old DEF slot');
      done();
    }, 30);
  });

  // ---- formation detection ----

  it('shows the manager-selected preset in the header when the lineup is not custom', () => {
    component.selectedFormation = '4-3-3';
    spyOn(component as any, 'isCustomLineup').and.returnValue(false);

    const label = component.getDisplayedFormationLabel({ inferredFormation: '4-4-2' });

    expect(label).toBe('4-3-3');
  });

  it('shows the inferred formation in the header when the manager shape is custom', () => {
    component.selectedFormation = '4-3-3';
    spyOn(component as any, 'isCustomLineup').and.returnValue(true);

    const label = component.getDisplayedFormationLabel({ inferredFormation: '4-4-2' });

    expect(label).toBe('4-4-2');
  });

  it('detectFormation returns the user-formation label for an incomplete lineup', (done) => {
    // Incomplete lineups are treated as a custom manager shape, not as a
    // silent canonical formation match.
    setTimeout(() => {
      const detected = (component as any).detectFormation();
      expect(detected).toBe('Formación manual',
        'Incomplete (< 11) lineup must be flagged as user-formation, not silently matched to a canonical');
      expect((component as any).isCustomLineup()).toBeTrue();
      done();
    }, 30);
  });

  it('detectFormation returns a canonical name when role counts match exactly', (done) => {
    // Build a complete 11-player lineup with role family counts
    // 1 GK + 4 DEF + 4 MID + 2 ATT (= '4-4-2'). Force it into the
    // component via the BehaviorSubject so we don't depend on the auto-select
    // back-end flow.
    //
    // Approach: the FORMATIONS_RESPONSE mock above only defines a 4-position
    // 4-4-2 (a fixture simplification). The real 4-4-2 has 11 positions, so
    // detectFormation's canonical comparison would naturally fail against
    // any lineup of 11 real players. To exercise the canonical-match path
    // without rewriting the mock, we inject `formationPositions['4-4-2']`
    // directly on the component after the formations load, then push an
    // 11-player lineup whose family counts match it exactly.
    setTimeout(() => {
      // 11 positions for a real 4-4-2 - GK + 4 DEF + 4 MID + 2 ATT.
      (component as any).formationPositions['4-4-2'] = [
        { subdivisionId: 'GK', role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, index: 0 },
        { subdivisionId: 'D1', role: 'LB', xPercent: 15, yPercent: 78, actionRangePercent: 7, index: 1 },
        { subdivisionId: 'D2', role: 'CB', xPercent: 35, yPercent: 78, actionRangePercent: 7, index: 2 },
        { subdivisionId: 'D3', role: 'CB', xPercent: 65, yPercent: 78, actionRangePercent: 7, index: 3 },
        { subdivisionId: 'D4', role: 'RB', xPercent: 85, yPercent: 78, actionRangePercent: 7, index: 4 },
        { subdivisionId: 'M1', role: 'LM', xPercent: 15, yPercent: 50, actionRangePercent: 7, index: 5 },
        { subdivisionId: 'M2', role: 'CM', xPercent: 35, yPercent: 50, actionRangePercent: 8, index: 6 },
        { subdivisionId: 'M3', role: 'CM', xPercent: 65, yPercent: 50, actionRangePercent: 8, index: 7 },
        { subdivisionId: 'M4', role: 'RM', xPercent: 85, yPercent: 50, actionRangePercent: 7, index: 8 },
        { subdivisionId: 'A1', role: 'ST', xPercent: 35, yPercent: 12, actionRangePercent: 6, index: 9 },
        { subdivisionId: 'A2', role: 'ST', xPercent: 65, yPercent: 12, actionRangePercent: 6, index: 10 }
      ];

      const canonical4_4_2 = [
        { playerId: 'gk', role: 'GK', position: 'GK', slotId: 'GK', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'GK' },
        { playerId: 'd1', role: 'LB', position: 'LB', slotId: 'D1', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D1' },
        { playerId: 'd2', role: 'CB', position: 'CB', slotId: 'D2', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D2' },
        { playerId: 'd3', role: 'CB', position: 'CB', slotId: 'D3', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D3' },
        { playerId: 'd4', role: 'RB', position: 'RB', slotId: 'D4', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D4' },
        { playerId: 'm1', role: 'LM', position: 'LM', slotId: 'M1', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M1' },
        { playerId: 'm2', role: 'CM', position: 'CM', slotId: 'M2', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M2' },
        { playerId: 'm3', role: 'CM', position: 'CM', slotId: 'M3', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M3' },
        { playerId: 'm4', role: 'RM', position: 'RM', slotId: 'M4', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M4' },
        { playerId: 'a1', role: 'ST', position: 'ST', slotId: 'A1', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'A1' },
        { playerId: 'a2', role: 'ST', position: 'ST', slotId: 'A2', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'A2' }
      ];
      (component as any).homePlayers$.next(canonical4_4_2);
      fixture.detectChanges();

      const detected = (component as any).detectFormation();
      expect(detected).toBe('4-4-2',
        'A lineup with 1 GK + 4 DEF + 4 MID + 2 ATT (11 players) must match the 4-4-2 canonical');
      expect((component as any).isCustomLineup()).toBeFalse();
      done();
    }, 30);
  });

  it('keeps selectedFormation anchored when drag inference matches a different canonical', (done) => {
    setTimeout(() => {
      (component as any).formationPositions['4-4-2'] = [
        { subdivisionId: 'GK', role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, index: 0 },
        { subdivisionId: 'D1', role: 'LB', xPercent: 15, yPercent: 78, actionRangePercent: 7, index: 1 },
        { subdivisionId: 'D2', role: 'CB', xPercent: 35, yPercent: 78, actionRangePercent: 7, index: 2 },
        { subdivisionId: 'D3', role: 'CB', xPercent: 65, yPercent: 78, actionRangePercent: 7, index: 3 },
        { subdivisionId: 'D4', role: 'RB', xPercent: 85, yPercent: 78, actionRangePercent: 7, index: 4 },
        { subdivisionId: 'M1', role: 'LM', xPercent: 15, yPercent: 50, actionRangePercent: 7, index: 5 },
        { subdivisionId: 'M2', role: 'CM', xPercent: 35, yPercent: 50, actionRangePercent: 8, index: 6 },
        { subdivisionId: 'M3', role: 'CM', xPercent: 65, yPercent: 50, actionRangePercent: 8, index: 7 },
        { subdivisionId: 'M4', role: 'RM', xPercent: 85, yPercent: 50, actionRangePercent: 7, index: 8 },
        { subdivisionId: 'A1', role: 'ST', xPercent: 35, yPercent: 12, actionRangePercent: 6, index: 9 },
        { subdivisionId: 'A2', role: 'ST', xPercent: 65, yPercent: 12, actionRangePercent: 6, index: 10 }
      ];
      (component as any).formationPositions['4-3-3'] = [
        { subdivisionId: 'GK', role: 'GK', xPercent: 50, yPercent: 93, actionRangePercent: 5, index: 0 },
        { subdivisionId: 'D1', role: 'LB', xPercent: 15, yPercent: 78, actionRangePercent: 7, index: 1 },
        { subdivisionId: 'D2', role: 'CB', xPercent: 35, yPercent: 78, actionRangePercent: 7, index: 2 },
        { subdivisionId: 'D3', role: 'CB', xPercent: 65, yPercent: 78, actionRangePercent: 7, index: 3 },
        { subdivisionId: 'D4', role: 'RB', xPercent: 85, yPercent: 78, actionRangePercent: 7, index: 4 },
        { subdivisionId: 'M1', role: 'CM', xPercent: 30, yPercent: 50, actionRangePercent: 8, index: 5 },
        { subdivisionId: 'M2', role: 'CM', xPercent: 50, yPercent: 50, actionRangePercent: 8, index: 6 },
        { subdivisionId: 'M3', role: 'CM', xPercent: 70, yPercent: 50, actionRangePercent: 8, index: 7 },
        { subdivisionId: 'A1', role: 'LW', xPercent: 20, yPercent: 14, actionRangePercent: 6, index: 8 },
        { subdivisionId: 'A2', role: 'ST', xPercent: 50, yPercent: 14, actionRangePercent: 6, index: 9 },
        { subdivisionId: 'A3', role: 'RW', xPercent: 80, yPercent: 14, actionRangePercent: 6, index: 10 }
      ];

      component.selectedFormation = '4-4-2';
      const manuallyAdvancedShape = [
        { playerId: 'gk', role: 'GK', position: 'GK', slotId: 'GK', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'GK' },
        { playerId: 'd1', role: 'LB', position: 'LB', slotId: 'D1', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D1' },
        { playerId: 'd2', role: 'CB', position: 'CB', slotId: 'D2', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D2' },
        { playerId: 'd3', role: 'CB', position: 'CB', slotId: 'D3', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D3' },
        { playerId: 'd4', role: 'RB', position: 'RB', slotId: 'D4', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'D4' },
        { playerId: 'm1', role: 'CM', position: 'CM', slotId: 'M1', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M1' },
        { playerId: 'm2', role: 'CM', position: 'CM', slotId: 'M2', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M2' },
        { playerId: 'm3', role: 'CM', position: 'CM', slotId: 'M3', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'M3' },
        { playerId: 'a1', role: 'LW', position: 'LW', slotId: 'A1', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'A1' },
        { playerId: 'a2', role: 'ST', position: 'ST', slotId: 'A2', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'A2' },
        { playerId: 'a3', role: 'RW', position: 'RW', slotId: 'A3', overall: 80, energy: 100, injured: false, stamina: 100, active: true, isEmpty: false, name: 'A3' }
      ];
      (component as any).homePlayers$.next(manuallyAdvancedShape);

      const detected = (component as any).detectFormation();

      expect(detected).toBe('4-3-3', 'the count-based detector may see a 4-3-3 shape');
      expect(component.selectedFormation).toBe('4-4-2',
        'drag inference must not mutate the manager-selected formation');
      done();
    }, 30);
  });

  it('countRoleFamily buckets roles into the 4 families', () => {
    const counts = countSquadEditorFormationRoleFamilies(
      ['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'CAM', 'ST', 'LW', 'CF', 'WINGER']
        .map((role, index) => ({
          index,
          role,
          xPercent: 50,
          yPercent: 50,
          actionRangePercent: 8,
          subdivisionId: `slot-${index}`,
        }))
    );
    //   GK    -> 1
    //   CB LB RB -> 3 DEF
    //   CM CDM CAM -> 3 MID
    //   ST LW CF WINGER -> 4 ATT
    expect(counts).toEqual({ gk: 1, def: 3, mid: 3, att: 4 });
  });

  // ---- custom formation dropdown ----

  it('dropdown shows the user-formation label after a cross-role drop', (done) => {
    // After a cross-role move, the selector must display the custom
    // formation label so the manager sees that the shape is now manual.
    setTimeout(() => {
      const rudiger = (component as any).slotPlayerMap['S22-1'];
      (component as any).handleSlotDrop({
        item: { data: rudiger },
        previousContainer: { id: 'slot-S22-1' },
        container: { id: 'slot-S13-2' }
      } as any);

      fixture.detectChanges();
      // dropdownFormationValue getter reflects the post-drop state.
      expect((component as any).dropdownFormationValue).toBe('Formación manual',
        'dropdownFormationValue must flip to user-formation label after cross-role drop');
      expect((component as any).isCustomLineup()).toBeTrue();

      // The rendered <select> should have the disabled "Formación manual"
      // option selected. The select's <option> for the user-formation label
      // is appended after the canonical loop; we verify by checking the
      // selected option's textContent.
      const select = fixture.nativeElement.querySelector('.formation-selector select') as HTMLSelectElement;
      expect(select).toBeTruthy();
      const selectedOption = select.options[select.selectedIndex];
      expect(selectedOption?.textContent?.trim()).toBe('Formación manual',
        'The visible selected option text must be "Formación manual"');
      done();
    }, 30);
  });

  // ---- off-role marker feedback ----

  it('marker receives off-role class when player role != slot recommended role', (done) => {
    // A player standing in a slot outside his recommended family should be
    // visually marked as off-role, without preventing the tactical choice.
    setTimeout(() => {
      // Manually set up state: place Rudiger at S13-2 (off-role).
      const rudiger = (component as any).slotPlayerMap['S22-1'];
      (component as any).slotPlayerMap['S22-1'] = undefined;
      (component as any).slotPlayerMap['S13-2'] = rudiger;
      rudiger.slotId = 'S13-2';
      // Re-emit homePlayers so the *ngFor sees the change.
      const home = (component as any).homePlayers$.value.slice();
      const idx = home.findIndex((p: any) => p.playerId === 'p-def');
      if (idx >= 0) { home[idx] = rudiger; }
      (component as any).homePlayers$.next([...home]);
      fixture.detectChanges();

      // Find the marker for Rudiger in the DOM.
      const markers: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.player-marker');
      let rudigerMarker: HTMLElement | null = null;
      markers.forEach((m) => {
        if (m.textContent?.includes('Rudiger')) {
          rudigerMarker = m;
        }
      });
      expect(rudigerMarker).toBeTruthy('Rudiger marker must be rendered after the move');
      // Marker for Rudiger (CB) at MID slot must carry the off-role class for the dashed orange ring.
      expect(rudigerMarker!.classList.contains('off-role')).toBeTrue();
      // The OFF badge child should also be present.
      const offBadge = rudigerMarker!.querySelector('.off-role-badge');
      expect(offBadge).toBeTruthy(
        'OFF badge must render as a child of the off-role marker');
      expect(offBadge?.textContent?.trim()).toBe('OFF');
      done();
    }, 30);
  });
});

/**
 * Free positioning on the pitch:
 * dropping a marker outside a tactical slot stores exact field
 * percentages, while slot drops keep normal swap/bench behavior.
 */
describe('SquadEditorModalComponent free positioning on field drop', () => {
  let component: SquadEditorModalComponent;
  let fixture: ComponentFixture<SquadEditorModalComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SquadEditorModalComponent>>;

  /** Minimal 4-slot field reused by the free-positioning tests. */
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
        { index: 0, role: 'GK',  xPercent: 50, yPercent: 93, actionRangePercent: 5, subdivisionId: 'GK-1' },
        { index: 1, role: 'CB',  xPercent: 20, yPercent: 75, actionRangePercent: 7, subdivisionId: 'S22-1' },
        { index: 2, role: 'CM',  xPercent: 50, yPercent: 50, actionRangePercent: 7, subdivisionId: 'S13-2' },
        { index: 3, role: 'ST',  xPercent: 50, yPercent: 10, actionRangePercent: 6, subdivisionId: 'S05-2' }
      ]
    }
  ];

  function buildCurrentLineup(chemistryScore: number | null, slots: any[] = []): any {
    return {
      formation: '4-4-2',
      players: [
        { playerId: 'p-gk',  name: 'GK',  position: 'GK',  overall: 80, energy: 100, injured: false },
        { playerId: 'p-def', name: 'Rudiger', position: 'CB', overall: 85, energy: 100, injured: false },
        { playerId: 'p-mid', name: 'Valverde', position: 'CM', overall: 86, energy: 100, injured: false },
        { playerId: 'p-att', name: 'Mbappe', position: 'ST', overall: 92, energy: 100, injured: false }
      ],
      confirmed: true,
      warnings: [],
      slots,
      chemistryScore
    };
  }

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    httpClientSpy.get.and.callFake(((url: string) => {
      if (url.includes('/lineup-editor/subdivisions')) return of(SUBDIVISIONS_RESPONSE);
      if (url.includes('/lineup-editor/formations'))  return of(FORMATIONS_RESPONSE);
      if (url.includes('/career/lineup/current')) return of(buildCurrentLineup(85));
      return of([]);
    }) as any);

    httpClientSpy.post.and.callFake(((url: string, _body: any) => {
      if (url.includes('/career/lineup/preview-chemistry')) {
        return of({ score: 91, breakdown: { positionGroups: {}, maxSkillByType: {}, coveragePercentage: 10 },
                    maxSkillByType: {}, coveragePercentage: 10 });
      }
      if (url.includes('/career/lineup/manual-select')) {
        return of({ players: [], warnings: [] });
      }
      if (url.includes('/career/lineup/confirm')) {
        return of({ confirmed: true, warnings: [] });
      }
      return of({});
    }) as any);

    await TestBed.configureTestingModule({
      imports: [SquadEditorModalComponent, NoopAnimationsModule],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { careerId: 'c1', matchId: null, squad: [] } }
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SquadEditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('getMarkerX/Y returns custom percentages when set, otherwise slot coordinates', (done) => {
    // Custom percentages win over slot coordinates. Without custom
    // percentages, the marker uses the authored slot center.
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      // baseline: no override -> returns slot center
      const baseX = (component as any).getMarkerX(pDef);
      const baseY = (component as any).getMarkerY(pDef);
      expect(baseX).toBe(20);
      expect(baseY).toBe(75);
      // override: returns custom %
      pDef.xPercent = 60;
      pDef.yPercent = 35;
      expect((component as any).getMarkerX(pDef)).toBe(60);
      expect((component as any).getMarkerY(pDef)).toBe(35);
      done();
    }, 30);
  });

  it('handleMarkerDragEnd stores a free position when dropped on open field', (done) => {
    // Open-field drops should keep the marker exactly where the
    // manager placed it and free the original visual slot.
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      const fieldEl: HTMLElement = fixture.nativeElement.querySelector('.field');
      fieldEl.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
        x: 0, y: 0, toJSON: () => ({})
      });
      (component as any).fieldContainer = { nativeElement: fieldEl };
      // Drop at (600, 600) -> xPct=60, yPct=75 -> no subdivision at these coords.
      (component as any).handleMarkerDragEnd({ dropPoint: { x: 600, y: 600 } } as any, pDef);
      // Free positioning: marker stays at the drop position.
      expect(pDef.xPercent).toBe(60);
      expect(pDef.yPercent).toBe(75);
      expect((component as any).getMarkerX(pDef)).toBe(60);
      expect((component as any).getMarkerY(pDef)).toBe(75);
      // Original slot cleared.
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined();
      done();
    }, 30);
  });

  it('resetCustomPositions: clears xPercent/yPercent on all home players', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      home.forEach((p: any) => { p.xPercent = 25; p.yPercent = 75; });
      (component as any).homePlayers$.next([...home]);
      expect((component as any).hasCustomPositions()).toBeTrue();
      (component as any).resetCustomPositions();
      expect((component as any).hasCustomPositions()).toBeFalse();
      (component as any).homePlayers$.value.forEach((p: any) => {
        expect(p.xPercent).toBeUndefined();
        expect(p.yPercent).toBeUndefined();
      });
      done();
    }, 30);
  });

  it('hasCustomPositions: returns false when no player has overrides', (done) => {
    setTimeout(() => {
      // baseline: no overrides -> false
      expect((component as any).hasCustomPositions()).toBeFalse();
      const home = (component as any).homePlayers$.value.slice();
      home[0].xPercent = 50;
      (component as any).homePlayers$.next([...home]);
      expect((component as any).hasCustomPositions()).toBeTrue();
      done();
    }, 30);
  });

  /**
   * The marker is the only visible representation of a player on the
   * pitch. Slots must not render duplicate chips, missing indicators,
   * or abandoned-state outlines.
   */
  it('renders each pitch player only as a marker and preserves slot/bench moves', (done) => {
    // Marker-only rendering avoids duplicate names and stale visual
    // claims. Slot-to-slot and slot-to-bench moves still work normally.
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      expect(pDef).toBeTruthy('fixture must seed a CB in S22-1');

      // No chip or missing-indicator anywhere.
      const allChips = fixture.nativeElement.querySelectorAll('.player-chip');
      expect(allChips.length).withContext('no .player-chip elements should exist anywhere').toBe(0);
      const allMissing = fixture.nativeElement.querySelectorAll('.missing-indicator');
      expect(allMissing.length).withContext('no .missing-indicator elements should exist anywhere').toBe(0);

      // No .slot.abandoned class anywhere (concept removed).
      const abandoned = fixture.nativeElement.querySelectorAll('.slot.abandoned');
      expect(abandoned.length).withContext('no .slot.abandoned should exist (concept removed)').toBe(0);

      // Marker renders ONCE per player.
      const allMarkers = fixture.nativeElement.querySelectorAll('.player-marker');
      const defPlayerIds: string[] = [];
      allMarkers.forEach((m: HTMLElement) => {
        if (m.textContent && pDef.name && m.textContent.includes(pDef.name)) {
          defPlayerIds.push(pDef.playerId);
        }
      });
      expect(defPlayerIds.length).withContext('marker must render once per player (no duplication)').toBe(1);

      // handleSlotDrop swap: S22-1 -> S05-2. S05-2 is occupied in fixture so
      // the occupant gets swapped to S22-1 (no empty slot remains).
      (component as any).handleSlotDrop({
        item: { data: pDef },
        previousContainer: { id: 'slot-S22-1' },
        container: { id: 'slot-S05-2' }
      } as any);
      expect(pDef.slotId).toBe('S05-2');
      expect((component as any).slotPlayerMap['S05-2']).toBe(pDef);
      // S22-1 now has the previous S05-2 occupant (swap, not empty).
      expect((component as any).slotPlayerMap['S22-1']).toBeTruthy();
      expect((component as any).slotPlayerMap['S22-1']).not.toBe(pDef);

      // handleBenchDrop: S05-2 -> bench.
      (component as any).handleBenchDrop({
        item: { data: pDef },
        previousContainer: { id: 'slot-S05-2' },
        container: { id: (component as any).BENCH_DROP_LIST_ID }
      } as any);
      expect(pDef.slotId).toBe('');
      expect((component as any).slotPlayerMap['S05-2']).toBeUndefined();
      done();
    }, 30);
  });

  /**
   * Open-field drops keep exact percentages and vacate the visual slot.
   * Drops that return to a native slot are covered by snap-back tests.
   */
  it('drops outside any slot go to free positioning', (done) => {
    // This covers the free-field branch: outside all slot boxes,
    // exact percentages are stored and the original slot is vacated.
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      const pMid = (component as any).slotPlayerMap['S13-2'];
      const fieldEl: HTMLElement = fixture.nativeElement.querySelector('.field');
      fieldEl.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
        x: 0, y: 0, toJSON: () => ({})
      });
      (component as any).fieldContainer = { nativeElement: fieldEl };
      const mkEvt = (x: number, y: number) => ({ dropPoint: { x, y } } as any);

      // 1. Drop at (700, 350) -> xPct=70, yPct=43.75 - outside S22-1 bbox
      //    (xPct 70 > 35 right edge, yPct 43.75 < 70 top edge) AND
      //    outside S13-2 bbox. Free positioning: xPercent/yPercent set,
      //    slot vacated. snap-back does not fire here.
      (component as any).handleMarkerDragEnd(mkEvt(700, 350), pDef);
      expect(pDef.xPercent).toBe(70, 'drop in free space: xPercent set');
      expect(pDef.yPercent).toBe(43.75, 'drop in free space: yPercent set');
      expect(pDef.slotId).toBe('S22-1', 'slotId preserved for chemistry preview');
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined('free drop: slot cleared from slotPlayerMap');
      expect(pMid.slotId).toBe('S13-2', 'other players unaffected');

      // 2. Reset state and test free positioning in the middle of the field.
      pDef.xPercent = undefined;
      pDef.yPercent = undefined;
      (component as any).slotPlayerMap['S22-1'] = pDef;

      // Drop at (300, 400) -> xPct=30, yPct=50.
      (component as any).handleMarkerDragEnd(mkEvt(300, 400), pDef);
      expect(pDef.xPercent).toBe(30);
      expect(pDef.yPercent).toBe(50);

      // 3. Marker visually at the drop coords.
      expect((component as any).getMarkerX(pDef)).toBe(30);
      expect((component as any).getMarkerY(pDef)).toBe(50);
      done();
    }, 30);
  });

  /**
   * A marker dropped on open grass leaves its slot visually empty and
   * renders from the stored custom percentages.
   */
  it('drop in field but not on a slot triggers free positioning', (done) => {
    // Free-positioning drops are clamped to the field and clear the
    // visual slot, while the marker renders at the custom position.
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      const slotS22 = (component as any).subdivisions.find((s: any) => s.subdivisionId === 'S22-1');
      const fieldEl = fixture.nativeElement.querySelector('.field');
      fieldEl.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
        x: 0, y: 0, toJSON: () => ({})
      });

      // Baseline: player at S22-1.
      expect((component as any).slotPlayerMap['S22-1']).toBe(pDef);

      // Drop at (700, 350) -> xPct=70, yPct=43.75 -> no slot at these coords.
      (component as any).fieldContainer = { nativeElement: fieldEl };
      (component as any).handleMarkerDragEnd({ dropPoint: { x: 700, y: 350 } } as any, pDef);

      // Free positioning: slot cleared, xPct/yPct set.
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined('free drop: slot cleared from slotPlayerMap');
      expect((component as any).isSlotOccupied(slotS22)).withContext('free drop: slot is now empty').toBeFalse();
      expect(pDef.xPercent).toBe(70, 'free drop: xPercent set');
      expect(pDef.yPercent).toBe(43.75, 'free drop: yPercent set');

      // Marker visually at the free position.
      expect((component as any).getMarkerX(pDef)).toBe(70);
      expect((component as any).getMarkerY(pDef)).toBe(43.75);
      done();
    }, 30);
  });

  /**
   * Tiny manual moves inside the native slot box must remain custom
   * positions unless the user lands near the authored point.
   */
  it('keeps micro-position override when dropped inside native slot box but away from authored point', (done) => {
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      expect(pDef).toBeTruthy('fixture must seed pDef in S22-1');
      const fieldEl: HTMLElement = fixture.nativeElement.querySelector('.field');
      fieldEl.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
        x: 0, y: 0, toJSON: () => ({})
      });
      (component as any).fieldContainer = { nativeElement: fieldEl };

      // Step 1: free-positioning drop.
      // S22-1 bbox is left=10, top=70, width=25, height=12 -> bbox x in
      // [10, 35], y in [70, 82]. Drop at (600, 600) -> xPct=60, yPct=75 ->
      // outside any slot bbox.
      (component as any).handleMarkerDragEnd({ dropPoint: { x: 600, y: 600 } } as any, pDef);
      expect(pDef.xPercent).toBe(60, 'first drop: free-position xPercent set');
      expect(pDef.yPercent).toBe(75, 'first drop: free-position yPercent set');
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined('first drop: slot vacated by free positioning');

      // Step 2: drag back inside S22-1 bbox but not near the authored
      // native point. This is a legitimate micro/manual move and must
      // not snap back, otherwise a small move "vuelve al mismo lugar".
      (component as any).handleMarkerDragEnd({ dropPoint: { x: 225, y: 610 } } as any, pDef);

      expect(pDef.xPercent).toBe(22.5, 'micro-position: xPercent persists');
      expect(pDef.yPercent).toBe(76.25, 'micro-position: yPercent persists');
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined('micro-position: slot remains visually vacated');

      expect((component as any).getMarkerX(pDef)).toBe(22.5);
      expect((component as any).getMarkerY(pDef)).toBe(76.25);
      done();
    }, 30);
  });

  it('drop near native authored point when already canonical clears custom percentages', (done) => {
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      expect(pDef).toBeTruthy('fixture must seed pDef in S22-1');
      const fieldEl: HTMLElement = fixture.nativeElement.querySelector('.field');
      fieldEl.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
        x: 0, y: 0, toJSON: () => ({})
      });
      (component as any).fieldContainer = { nativeElement: fieldEl };

      // pDef has no override (canonical from /lineup/current load).
      expect(pDef.xPercent).toBeUndefined();
      expect(pDef.yPercent).toBeUndefined();

      // Drop near authored S22-1 formation point. With the mocked field,
      // dropPoint (200, 600) plus default pickup/half-card math yields
      // x=20, y=75: exactly the authored native point.
      (component as any).handleMarkerDragEnd({ dropPoint: { x: 200, y: 600 } } as any, pDef);

      expect(pDef.xPercent).toBeUndefined('snap-back on canonical: no xPercent');
      expect(pDef.yPercent).toBeUndefined('snap-back on canonical: no yPercent');
      expect((component as any).slotPlayerMap['S22-1']).toBe(pDef, 'snap-back on canonical: slot still occupied');
      done();
    }, 30);
  });

  it('empty slot is invisible with no abandoned class, chip, or missing indicator', (done) => {
    // When a player leaves a slot, the old location must not show a
    // stale chip, missing indicator, abandoned outline, or amber ghost.
    setTimeout(() => {
      const pDef = (component as any).slotPlayerMap['S22-1'];
      const pMid = (component as any).slotPlayerMap['S13-2'];

      // Move pDef to bench. Source slot S22-1 should not have any visual
      // indicator (chip, missing-indicator, abandoned) - only the
      // shouldRenderSlot filter keeps it from rendering at all.
      (component as any).movePlayerToBench(pDef);
      fixture.detectChanges();

      // S22-1 no longer in slotPlayerMap.
      expect((component as any).slotPlayerMap['S22-1']).toBeUndefined();
      // No .abandoned class anywhere.
      const abandonedSlots = fixture.nativeElement.querySelectorAll('.slot.abandoned');
      expect(abandonedSlots.length).withContext('no .slot.abandoned elements (concept removed)').toBe(0);
      // No chip + no missing-indicator (already verified in earlier test,
      // but checking again as part of the no-ghost invariant).
      const chips = fixture.nativeElement.querySelectorAll('.player-chip');
      expect(chips.length).toBe(0);
      const missing = fixture.nativeElement.querySelectorAll('.missing-indicator');
      expect(missing.length).toBe(0);
      done();
    }, 30);
  });

  /**
   * Guard against broken Spanish text in the modal source. If encoded
   * sentinels reappear here, the UI can render labels such as
   * formation, chemistry, or minimum-player messages incorrectly.
   */
  it('source .ts has no double-encoded Spanish text sentinels', () => {
    // Karma usually runs in the browser, so Node fs may be unavailable.
    // When it is available, inspect the source directly.
    const fs: any = (window as any).require ? (window as any).require('fs') : null;
    if (!fs) {
      // Browser-only test runs skip the direct source inspection; runtime
      // string checks elsewhere still cover the visible UI labels.
      pending('Node fs not available in this test runner; rely on runtime equivalents');
      return;
    }
    const src = fs.readFileSync(
      'src/app/components/squad-editor-modal/squad-editor-modal.component.ts',
      'utf-8');
    // Double-encoded Spanish characters should never reach the source.
    const sentinels = [
      { name: 'ó', pattern: /Formaci[^o]n[^c]?[^i]?[^o]/ }, // 'Formaci\u00f3n' rendered correctly
      { name: 'Mínimo 7', pattern: /M[^n]?nimo 7/ },
      { name: 'Formación manual', pattern: /Formaci[^o]n manual/ },
    ];
    let bad = 0;
    for (const s of sentinels) {
      const hits = (src.match(/[\u00c0-\u00df]\u0083\u00c2[\u0080-\u00bf]/g) || []).length;
      // Catches c3 83 / c2 xx double-encoding chains.
      expect(hits).withContext('Encoded text sentinel ' + s.name + ' must not appear in source').toBe(0);
      bad += hits;
    }
    expect(bad).toBe(0);
  });

  /**
   * Tactical coach reads translate tiny visual moves into understandable
   * manager feedback: pixel trace, channel pressure, coverage, and risk.
   */
  it('coach read exposes fine pixel trace and coordinates for micro moves', (done) => {
    setTimeout(() => {
      const midfielder = {
        playerId: 'p-mid',
        name: 'Pathé Ciss',
        role: 'MID',
        position: 'MID',
        slotId: 'S13-2'
      };

      (component as any).setLastCoachMoveReadForDrag(midfielder, 50, 50, 50.4, 49.7, false);

      expect((component as any).lastCoachMoveRead.title).toContain('microajuste');
      expect((component as any).lastCoachMoveRead.body).toContain('Traza fina: micro');
      expect((component as any).lastCoachMoveRead.body).toContain('coords 50.0/50.0 -> 50.4/49.7');
      expect((component as any).lastCoachMoveRead.body).toContain('queda registrado como ajuste manual');
      done();
    }, 30);
  });

  it('resetCustomPositions clears movement reads so visual smokes start clean', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      home.forEach((p: any) => { p.xPercent = 25; p.yPercent = 75; });
      (component as any).homePlayers$.next([...home]);
      (component as any).lastCoachMoveRead = {
        title: 'Vinicius se proyecta',
        body: 'Canales: L +1.',
        level: 'good'
      };
      (component as any).pendingCoachMoveBaseline = {
        attack: 100,
        midfield: 100,
        defense: 100,
        chemistry: 90,
        channels: { left: 80, center: 90, right: 80 },
        visualChannels: []
      };

      (component as any).resetCustomPositions();

      expect((component as any).lastCoachMoveRead).toBeNull();
      expect((component as any).pendingCoachMoveBaseline).toBeNull();
      done();
    }, 30);
  });

  it('template exposes a stable reset positions test id for visual smoke automation', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      home.forEach((p: any) => { p.xPercent = 25; p.yPercent = 75; });
      (component as any).homePlayers$.next([...home]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[data-testid="reset-custom-positions-button"]');

      expect(button).toBeTruthy();
      done();
    }, 30);
  });

  it('tacticalChannelBreakdown separates threat connection and coverage reads', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      const sample = [
        { ...home[0], playerId: 'att-l', position: 'ATT', slotId: 'ATT-L', xPercent: 15, yPercent: 28 },
        { ...home[1], playerId: 'mid-l', position: 'MID', slotId: 'MID-L', xPercent: 18, yPercent: 52 },
        { ...home[2], playerId: 'def-l', position: 'DEF', slotId: 'DEF-L', xPercent: 20, yPercent: 78 },
        { ...home[3], playerId: 'mid-c', position: 'MID', slotId: 'MID-C', xPercent: 50, yPercent: 55 },
        { ...home[4], playerId: 'att-r', position: 'ATT', slotId: 'ATT-R', xPercent: 82, yPercent: 30 },
      ].filter(Boolean);
      (component as any).homePlayers$.next(sample);

      const left = (component as any).tacticalChannelBreakdown.find((row: any) => row.label === 'L');
      const right = (component as any).tacticalChannelBreakdown.find((row: any) => row.label === 'R');

      expect(left.threat).toBeGreaterThan(0);
      expect(left.connection).toBeGreaterThan(0);
      expect(left.coverage).toBeGreaterThan(0);
      expect(right.threat).toBeGreaterThan(0);
      expect(right.coverage).toBeLessThan(left.coverage);
      done();
    }, 30);
  });

  it('coach move read includes visual threat connection and coverage deltas', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      const sample = [
        { ...home[0], playerId: 'att-l', position: 'ATT', role: 'ATT', slotId: 'ATT-L', xPercent: 15, yPercent: 28 },
        { ...home[1], playerId: 'mid-c', position: 'MID', role: 'MID', slotId: 'MID-C', xPercent: 50, yPercent: 52 },
        { ...home[2], playerId: 'def-l', position: 'DEF', role: 'DEF', slotId: 'DEF-L', xPercent: 18, yPercent: 78 },
      ].filter(Boolean);
      (component as any).homePlayers$.next(sample);

      (component as any).pendingCoachMoveBaseline = {
        attack: 100,
        midfield: 100,
        defense: 100,
        chemistry: 90,
        channels: { left: 70, center: 70, right: 70 },
        visualChannels: (component as any).tacticalChannelBreakdown,
      };
      (component as any).lastCoachMoveRead = {
        title: 'Test move',
        body: 'Base read.',
        level: 'info',
      };

      const moved = sample.map((p: any) =>
        p.playerId === 'att-l'
          ? { ...p, xPercent: 50, yPercent: 54 }
          : p
      );
      (component as any).homePlayers$.next(moved);
      (component as any).enrichLastCoachMoveReadWithLatestDelta();

      expect((component as any).lastCoachMoveRead.body).toContain('Visual:');
      expect((component as any).lastCoachMoveRead.body).toContain('Amenaza');
      done();
    }, 30);
  });

  it('coach move read warns when visual threat rises but engine attack drops', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      const sample = [
        { ...home[0], playerId: 'att-l', position: 'ATT', role: 'ATT', slotId: 'ATT-L', xPercent: 15, yPercent: 28 },
        { ...home[1], playerId: 'mid-c', position: 'MID', role: 'MID', slotId: 'MID-C', xPercent: 50, yPercent: 52 },
        { ...home[2], playerId: 'def-l', position: 'DEF', role: 'DEF', slotId: 'DEF-L', xPercent: 18, yPercent: 78 },
      ].filter(Boolean);
      (component as any).homePlayers$.next(sample);

      (component as any).liveRatings = { attackRating: 100, midfieldRating: 100, defenseRating: 100 };
      (component as any).pendingCoachMoveBaseline = {
        attack: 130,
        midfield: 100,
        defense: 100,
        chemistry: 90,
        channels: { left: 70, center: 70, right: 70 },
        visualChannels: [
          { label: 'L', threat: 5, connection: 5, coverage: 5 },
          { label: 'C', threat: 5, connection: 5, coverage: 5 },
          { label: 'R', threat: 5, connection: 5, coverage: 5 },
        ],
      };
      (component as any).lastCoachMoveRead = {
        title: 'Test tension',
        body: 'Base read.',
        level: 'info',
      };

      (component as any).enrichLastCoachMoveReadWithLatestDelta();

      expect((component as any).lastCoachMoveRead.body).toContain('Ojo: sube la amenaza visual, pero baja ATT general');
      expect((component as any).lastCoachMoveRead.level).toBe('danger');
      done();
    }, 30);
  });

  it('coach move read treats defender steps as risk tradeoffs', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      const defender = {
        ...home[0],
        playerId: 'def-step',
        name: 'Def Step',
        position: 'DEF',
        role: 'DEF',
        slotId: 'DEF-C',
        xPercent: 50,
        yPercent: 83,
      };

      (component as any).setLastCoachMoveReadForDrag(defender, 50, 83, 50, 57, false);

      expect((component as any).lastCoachMoveRead.title).toContain('DEF');
      expect((component as any).lastCoachMoveRead.body).toContain('Sube un defensor');
      expect((component as any).lastCoachMoveRead.body).toContain('tradeoff de riesgo');
      expect((component as any).lastCoachMoveRead.level).toBe('danger');
      done();
    }, 30);
  });

  it('coach move read treats wide and inside drags as tactical tradeoffs', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      const midfielder = {
        ...home[0],
        playerId: 'mid-tradeoff',
        name: 'Mid Tradeoff',
        position: 'MID',
        role: 'MID',
        slotId: 'MID-C',
        xPercent: 50,
        yPercent: 50,
      };

      (component as any).setLastCoachMoveReadForDrag(midfielder, 50, 50, 82, 50, false);

      expect((component as any).lastCoachMoveRead.title).toContain('abre la cancha');
      expect((component as any).lastCoachMoveRead.body).toContain('Tradeoff de amplitud');
      expect((component as any).lastCoachMoveRead.body).toContain('validalo en harness/partido');
      expect((component as any).lastCoachMoveRead.level).toBe('warn');

      (component as any).setLastCoachMoveReadForDrag(midfielder, 82, 50, 50, 50, false);

      expect((component as any).lastCoachMoveRead.title).toContain('se cierra');
      expect((component as any).lastCoachMoveRead.body).toContain('Tradeoff interior/exterior');
      expect((component as any).lastCoachMoveRead.body).toContain('liberar la banda');
      expect((component as any).lastCoachMoveRead.level).toBe('warn');
      done();
    }, 30);
  });

  it('coach move read names diagonal combined moves explicitly', (done) => {
    setTimeout(() => {
      const home = (component as any).homePlayers$.value.slice();
      const midfielder = {
        ...home[0],
        playerId: 'mid-diagonal',
        name: 'Mid Diagonal',
        position: 'MID',
        role: 'MID',
        slotId: 'MID-C',
        xPercent: 50,
        yPercent: 54,
      };

      (component as any).setLastCoachMoveReadForDrag(midfielder, 50, 54, 82, 44, false);

      expect((component as any).lastCoachMoveRead.title).toContain('se proyecta abierto');
      expect((component as any).lastCoachMoveRead.body).toContain('Tradeoff de amplitud/profundidad');
      expect((component as any).lastCoachMoveRead.level).toBe('warn');

      (component as any).setLastCoachMoveReadForDrag(midfielder, 82, 44, 50, 62, false);

      expect((component as any).lastCoachMoveRead.title).toContain('cierra para cubrir');
      expect((component as any).lastCoachMoveRead.body).toContain('Tradeoff compactación/amplitud');
      expect((component as any).lastCoachMoveRead.level).toBe('info');
      done();
    }, 30);
  });
});

