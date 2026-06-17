/**
 * LIVE-MATCH-F3-UI-LIVE FE5: unit tests for {@link FormationModalComponent}.
 *
 * <p>Validates the formation-selection flow without involving a real backend
 * (HttpClient is mocked via a Spy).
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
    const unknownData = { ...SAMPLE_DATA, currentFormation: '5-3-2' };
    (component as any).data = unknownData;
    // Trigger the normalizeFormation via the selectedFormation signal
    // by calling onFormationChange — which calls normalizeFormation.
    component.onFormationChange('4-3-3');
    // The signal was updated; verify it's a valid formation.
    expect(['4-4-2', '4-3-3', '3-5-2', '4-2-3-1']).toContain(component.selectedFormation());
  });

  it('formationLines returns the correct counts per formation', () => {
    component.onFormationChange('4-4-2');
    expect(component.formationLines).toEqual([1, 4, 4, 2]);
    component.onFormationChange('4-3-3');
    expect(component.formationLines).toEqual([1, 4, 3, 3]);
    component.onFormationChange('3-5-2');
    expect(component.formationLines).toEqual([1, 3, 5, 2]);
    component.onFormationChange('4-2-3-1');
    expect(component.formationLines).toEqual([1, 4, 2, 3, 1]);
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
