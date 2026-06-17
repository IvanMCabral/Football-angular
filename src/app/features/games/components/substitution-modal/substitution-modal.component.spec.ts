/**
 * LIVE-MATCH-F3-UI-LIVE FE4: unit tests for {@link SubstitutionModalComponent}.
 *
 * <p>Validates the validation contract and the substitution flow without
 * involving a real backend (HttpClient is mocked via a Spy).
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { SubstitutionModalComponent, SubstitutionDialogData } from './substitution-modal.component';
import { SubModalPlayer } from '../../../../core/services/match-engine.model';
import { MatchEngineService } from '../../../../core/services/match-engine.service';

const SAMPLE_PLAYERS: SubModalPlayer[] = [
  { sessionPlayerId: 'p1', displayName: 'Starter 1', position: 'GK',   rating: 80, isStarter: true },
  { sessionPlayerId: 'p2', displayName: 'Starter 2', position: 'DEF',  rating: 75, isStarter: true },
  { sessionPlayerId: 'p3', displayName: 'Starter 3', position: 'MID',  rating: 78, isStarter: true },
  { sessionPlayerId: 'p4', displayName: 'Starter 4', position: 'ATT',  rating: 82, isStarter: true },
  { sessionPlayerId: 'b1', displayName: 'Bench 1',   position: 'DEF',  rating: 70, isStarter: false },
  { sessionPlayerId: 'b2', displayName: 'Bench 2',   position: 'MID',  rating: 72, isStarter: false },
  { sessionPlayerId: 'b3', displayName: 'Bench 3',   position: 'ATT',  rating: 76, isStarter: false }
];

const SAMPLE_DATA: SubstitutionDialogData = {
  matchId: 'm1',
  currentMinute: 35,
  startingXi: SAMPLE_PLAYERS.filter(p => p.isStarter),
  bench: SAMPLE_PLAYERS.filter(p => !p.isStarter),
  substitutionsRemaining: 3
};

describe('SubstitutionModalComponent — LIVE-MATCH-F3-UI-LIVE FE4', () => {
  let component: SubstitutionModalComponent;
  let fixture: ComponentFixture<SubstitutionModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SubstitutionModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['substitutePlayer']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: SAMPLE_DATA },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubstitutionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initial state — no selection, canConfirm is false, no error', () => {
    expect(component.playerOffId).toBeNull();
    expect(component.playerOnId).toBeNull();
    expect(component.canConfirm).toBeFalse();
    expect(component.errorMsg).toBe('');
  });

  it('selectOff + selectOn enables canConfirm', () => {
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    expect(component.playerOffId).toBe('p1');
    expect(component.playerOnId).toBe('b1');
    expect(component.canConfirm).toBeTrue();
  });

  it('selectOff clears the previous off selection on a new click', () => {
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOff(SAMPLE_PLAYERS[1]);
    expect(component.playerOffId).toBe('p2');
  });

  it('clearOff resets the off selection via the X mark', () => {
    component.selectOff(SAMPLE_PLAYERS[0]);
    const ev = new Event('click');
    spyOn(ev, 'stopPropagation');
    component.clearOff(ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(component.playerOffId).toBeNull();
  });

  it('confirm calls substitutePlayer with the right ids + current minute', () => {
    engineServiceSpy.substitutePlayer.and.returnValue(of({
      success: true, minuteApplied: 35, substitutionsRemaining: 2
    }));
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.confirm();
    expect(engineServiceSpy.substitutePlayer).toHaveBeenCalledOnceWith(
      'm1', 'p1', 'b1', 35
    );
  });

  it('confirm success → snackbar + dialog close', () => {
    engineServiceSpy.substitutePlayer.and.returnValue(of({
      success: true, minuteApplied: 35, substitutionsRemaining: 2
    }));
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.confirm();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ success: true })
    );
  });

  it('confirm backend success=false → inline error, no close', () => {
    engineServiceSpy.substitutePlayer.and.returnValue(of({
      success: false, minuteApplied: 0, substitutionsRemaining: 3,
      error: 'Player not on bench'
    }));
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.confirm();
    expect(component.errorMsg).toContain('Player not on bench');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('confirm backend error → "Error de red" message, no close', () => {
    engineServiceSpy.substitutePlayer.and.returnValue(throwError(() => new Error('network')));
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.confirm();
    expect(component.errorMsg).toContain('Error de red');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  });

  it('isOutOfSubs is true when substitutionsRemaining == 0', () => {
    const noSubs = { ...SAMPLE_DATA, substitutionsRemaining: 0 };
    (component as any).data = noSubs;
    expect(component.isOutOfSubs).toBeTrue();
    // Selections should not register when out of subs.
    component.selectOff(SAMPLE_PLAYERS[0]);
    expect(component.playerOffId).toBeNull();
  });

  it('cancel closes the dialog with success=false', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ success: false, reason: 'cancelled' })
    );
  });
});
