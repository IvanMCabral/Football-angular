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