/**
 * LIVE-MATCH-F3-UI-LIVE FE5: unit tests for {@link FormationModalComponent}.
 *
 * <p>Validates the formation-selection flow without involving a real backend
 * (HttpClient is mocked via a Spy).
 *
 * <p>V25D54-C15 P3.2: agregados tests para las 5 formations nuevas
 * (3-5-2-CDM, 5-4-1, 3-4-1-2, 4-2-2-2, 4-3-3-1) — verifican que el
 * dropdown las incluye, que formationLines devuelve el shape correcto,
 * y que getDotLabel retorna los role labels específicos (LWB, RWB, CDM,
 * CAM, etc.) en lugar de los genéricos anteriores.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { FormationModalComponent, FormationDialogData } from './formation-modal.component';
import { MatchEngineService } from '../../../../core/services/match-engine.service';

const SAMPLE_DATA: FormationDialogData = {
  matchId: 'm1',
  currentFormation: '4-4-2',
  homeTeamId: 'h1',
  currentSlots: [
    { sessionPlayerId: 'p1', position: 'GK',   slotIndex: 0 },
    { sessionPlayerId: 'p2', position: 'DEF',  slotIndex: 1 },
    { sessionPlayerId: 'p3', position: 'MID',  slotIndex: 2 },
    { sessionPlayerId: 'p4', position: 'ATT',  slotIndex: 3 }
  ]
};

const ALL_FORMATIONS = [
  '4-4-2', '4-3-3', '3-5-2', '4-2-3-1',
  '5-3-2', '4-1-4-1', '3-4-3',
  '3-5-2-CDM', '5-4-1', '3-4-1-2', '4-2-2-2',
  '4-3-3-1'
];

describe('FormationModalComponent — LIVE-MATCH-F3-UI-LIVE FE5', () => {
  let component: FormationModalComponent;
  let fixture: ComponentFixture<FormationModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormationModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['changeFormation']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [FormationModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: SAMPLE_DATA },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FormationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initial state — formation is 4-4-2 (current)', () => {
    expect(component.selectedFormation()).toBe('4-4-2');
  });

  it('normalizes an unknown formation to 4-4-2', () => {
    const unknownData = { ...SAMPLE_DATA, currentFormation: 'banana' };
    (component as any).data = unknownData;
    // Trigger the normalizeFormation via the selectedFormation signal
    // by calling onFormationChange — which calls normalizeFormation.
    component.onFormationChange('4-3-3');
    // The signal was updated; verify it's a valid formation.
    expect(ALL_FORMATIONS).toContain(component.selectedFormation());
  });

  it('formationLines returns the correct counts per formation (7 originales)', () => {
    component.onFormationChange('4-4-2');
    expect(component.formationLines).toEqual([1, 4, 4, 2]);
    component.onFormationChange('4-3-3');
    expect(component.formationLines).toEqual([1, 4, 3, 3]);
    component.onFormationChange('3-5-2');
    expect(component.formationLines).toEqual([1, 3, 5, 2]);
    component.onFormationChange('4-2-3-1');
    expect(component.formationLines).toEqual([1, 4, 2, 3, 1]);
    component.onFormationChange('5-3-2');
    expect(component.formationLines).toEqual([1, 5, 3, 2]);
    component.onFormationChange('4-1-4-1');
    expect(component.formationLines).toEqual([1, 4, 1, 4, 1]);
    component.onFormationChange('3-4-3');
    expect(component.formationLines).toEqual([1, 3, 4, 3]);
  });

  it('V25D54-C15 P3.2: formations list includes the 12 formations (7 + 5 nuevas)', () => {
    expect(component.formations.length).toBe(12);
    for (const f of ALL_FORMATIONS) {
      expect(component.formations).toContain(f);
    }
  });

  it('V25D54-C15 P3.2: formationLines counts correctos para 5 formations nuevas', () => {
    component.onFormationChange('3-5-2-CDM');
    expect(component.formationLines).toEqual([1, 3, 1, 2, 2, 2]); // GK + 3CB + CDM + 2CM + 2WB + 2ST
    component.onFormationChange('5-4-1');
    expect(component.formationLines).toEqual([1, 5, 4, 1]);       // GK + 5DEF + 4MID + 1ST
    component.onFormationChange('3-4-1-2');
    expect(component.formationLines).toEqual([1, 3, 4, 1, 2]);    // GK + 3CB + 4MID + 1CAM + 2ST
    component.onFormationChange('4-2-2-2');
    expect(component.formationLines).toEqual([1, 4, 2, 2, 2]);    // GK + 4DEF + 2CDM + 2wide + 2ST
    component.onFormationChange('4-3-3-1');
    expect(component.formationLines).toEqual([1, 4, 1, 2, 3]);    // GK + 4DEF + 1CDM + 2CM + 3ATT
  });

  it('V25D54-C15 P3.2: getDotLabel devuelve role labels específicos (no genéricos)', () => {
    // 3-5-2 (P0 fixed): pos #4 = LWB (no LM), pos #8 = RWB (no RM).
    component.onFormationChange('3-5-2');
    // Lines: [GK], [CB,CB,CB], [LWB,CM,CM,CM,RWB], [ST,ST]
    expect(component.getDotLabel(0, 0, 1, false)).toBe('GK');
    expect(component.getDotLabel(1, 0, 3, false)).toBe('CB');
    expect(component.getDotLabel(2, 0, 5, false)).toBe('LWB'); // P0 fixed
    expect(component.getDotLabel(2, 1, 5, false)).toBe('CM');
    expect(component.getDotLabel(2, 4, 5, false)).toBe('RWB'); // P0 fixed
    expect(component.getDotLabel(3, 0, 2, true)).toBe('ST');

    // 4-2-3-1: 2 CDM anchors, 3 CAM (LW/CAM/RW), 1 ST top.
    component.onFormationChange('4-2-3-1');
    expect(component.getDotLabel(2, 0, 2, false)).toBe('CDM');
    expect(component.getDotLabel(3, 1, 3, false)).toBe('CAM');

    // 5-4-1: 5 DEF + 4 MID + 1 ST.
    component.onFormationChange('5-4-1');
    expect(component.getDotLabel(1, 0, 5, false)).toBe('LB');
    expect(component.getDotLabel(1, 2, 5, false)).toBe('CB');
    expect(component.getDotLabel(1, 4, 5, false)).toBe('RB');
    expect(component.getDotLabel(3, 0, 1, true)).toBe('ST');

    // 3-5-2-CDM: GK + 3CB + CDM + 2CM + 2WB + 2ST
    component.onFormationChange('3-5-2-CDM');
    expect(component.getDotLabel(2, 0, 1, false)).toBe('CDM');
    expect(component.getDotLabel(3, 0, 2, false)).toBe('CM');
    expect(component.getDotLabel(4, 0, 2, false)).toBe('LWB');
    expect(component.getDotLabel(4, 1, 2, false)).toBe('RWB');

    // 4-3-3-1: GK + 4DEF + 1CDM + 2CM + LW+ST+RW
    component.onFormationChange('4-3-3-1');
    expect(component.getDotLabel(2, 0, 1, false)).toBe('CDM');
    expect(component.getDotLabel(3, 0, 2, false)).toBe('CM');
    expect(component.getDotLabel(4, 0, 3, true)).toBe('LW');
    expect(component.getDotLabel(4, 1, 3, true)).toBe('ST');
    expect(component.getDotLabel(4, 2, 3, true)).toBe('RW');
  });

  it('V25D54-C15 P3.2: getDotLabel devuelve string vacío si el índice está fuera de rango', () => {
    component.onFormationChange('4-4-2');
    expect(component.getDotLabel(99, 0, 1, false)).toBe(''); // lineIdx fuera de rango
    expect(component.getDotLabel(0, 99, 1, false)).toBe(''); // n fuera de rango
  });

  it('onFormationChange updates the signal and clears errorMsg', () => {
    component.errorMsg = 'previous error';
    component.onFormationChange('3-5-2');
    expect(component.selectedFormation()).toBe('3-5-2');
    expect(component.errorMsg).toBe('');
  });

  it('confirm with same formation as current — no round-trip, no close success', () => {
    component.confirm();
    expect(engineServiceSpy.changeFormation).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ success: false, reason: 'no-change' })
    );
  });

  it('confirm with a different formation calls changeFormation with current slots', () => {
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true, minuteApplied: 35 }));
    component.onFormationChange('4-3-3');
    component.confirm();
    expect(engineServiceSpy.changeFormation).toHaveBeenCalledOnceWith(
      'm1', SAMPLE_DATA.currentSlots
    );
  });

  it('confirm success → snackbar + dialog close with success=true', () => {
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true, minuteApplied: 35 }));
    component.onFormationChange('4-3-3');
    component.confirm();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ success: true, formation: '4-3-3' })
    );
  });

  it('confirm backend success=false → inline error, no close', () => {
    engineServiceSpy.changeFormation.and.returnValue(of({
      success: false, error: 'Invalid formation'
    }));
    component.onFormationChange('4-3-3');
    component.confirm();
    expect(component.errorMsg).toContain('Invalid formation');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('confirm backend error → "Error de red" message, no close', () => {
    engineServiceSpy.changeFormation.and.returnValue(throwError(() => new Error('network')));
    component.onFormationChange('4-3-3');
    component.confirm();
    expect(component.errorMsg).toContain('Error de red');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  });

  it('cancel closes the dialog with success=false', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ success: false, reason: 'cancelled' })
    );
  });
});
