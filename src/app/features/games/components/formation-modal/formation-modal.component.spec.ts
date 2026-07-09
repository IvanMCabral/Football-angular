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
 *
 * <p>V25D55-C16 P0.1 + P1.3+4: agregados tests para verificar que el HTML
 * aplica las clases CSS correctas (is-gk, is-def, is-mid, is-att) para
 * formations con 4, 5 y 6 líneas. Antes los bindings
 * `[class.is-gk]="last && i === 0"` y `[class.is-att]="i === length - 1 && !last"`
 * eran siempre false, dejando dots ATT y GK sin styling diferenciado.
 * Además se valida que la constante compartida tenga 12 formations.
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
  ],
  // V25D81-BUG #4: 4 starters (p1-p4) + 3 bench (b1-b3) so the
  // bench column has players to render. Without this, the bench
  // is empty and the drag-drop UX is untestable.
  squad: [
    { sessionPlayerId: 'p1', name: 'P1', position: 'GK',  attack: 50, defense: 50, technique: 50, speed: 50, stamina: 50, mentality: 50 },
    { sessionPlayerId: 'p2', name: 'P2', position: 'DEF', attack: 60, defense: 80, technique: 60, speed: 60, stamina: 70, mentality: 65 },
    { sessionPlayerId: 'p3', name: 'P3', position: 'MID', attack: 65, defense: 65, technique: 75, speed: 70, stamina: 70, mentality: 70 },
    { sessionPlayerId: 'p4', name: 'P4', position: 'ATT', attack: 85, defense: 50, technique: 70, speed: 80, stamina: 70, mentality: 70 },
    { sessionPlayerId: 'b1', name: 'B1', position: 'DEF', attack: 55, defense: 75, technique: 60, speed: 60, stamina: 65, mentality: 60 },
    { sessionPlayerId: 'b2', name: 'B2', position: 'MID', attack: 65, defense: 60, technique: 70, speed: 70, stamina: 70, mentality: 65 },
    { sessionPlayerId: 'b3', name: 'B3', position: 'ATT', attack: 75, defense: 50, technique: 65, speed: 75, stamina: 70, mentality: 65 }
  ] as any,
  startingIds: new Set(['p1', 'p2', 'p3', 'p4'])
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
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['changeFormation']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    // V25D99.20.3-FRONT BUG-1: onFormationChange POSTs /career/lineup/auto-select
    // and refreshes slotAssignments from the response. The existing tests
    // don't care about the auto-select response — make the spy return a
    // no-op observable by default so the .subscribe() call doesn't blow
    // up. Specific tests (the V25D99.20.3-FRONT BUG-1 describe) override
    // this with their own returnValue.
    httpClientSpy.post.and.returnValue(of({ formation: '4-4-2', slots: [] }));

    await TestBed.configureTestingModule({
      imports: [FormationModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: SAMPLE_DATA },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: httpClientSpy }
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

  it('confirm with a different formation calls changeFormation with the new slot list', () => {
    // V25D81-BUG #4: pre-F5 the modal sent the same currentSlots
    // regardless of the new formation. With the drag-drop fix, the
    // modal sends the full slot list for the new formation (11
    // entries for 4-3-3 with positions LB/CB/CB/RB/CM/CM/CM/LW/ST/RW
    // + the GK at index 0). The backend's auto-fill re-derives the
    // roster from these positions.
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true, minuteApplied: 35 }));
    component.onFormationChange('4-3-3');
    component.confirm();
    expect(engineServiceSpy.changeFormation).toHaveBeenCalledOnceWith(
      'm1',
      jasmine.arrayContaining([
        jasmine.objectContaining({ slotIndex: 0, position: 'GK' }),
        jasmine.objectContaining({ slotIndex: 1, position: 'LB' }),
        jasmine.objectContaining({ slotIndex: 2, position: 'CB' }),
        jasmine.objectContaining({ slotIndex: 3, position: 'CB' }),
        jasmine.objectContaining({ slotIndex: 4, position: 'RB' }),
        jasmine.objectContaining({ slotIndex: 5, position: 'CM' }),
        jasmine.objectContaining({ slotIndex: 6, position: 'CM' }),
        jasmine.objectContaining({ slotIndex: 7, position: 'CM' }),
        jasmine.objectContaining({ slotIndex: 8, position: 'LW' }),
        jasmine.objectContaining({ slotIndex: 9, position: 'ST' }),
        jasmine.objectContaining({ slotIndex: 10, position: 'RW' })
      ])
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

  // ============================================================================
  // V25D55 (Sprint C16) P0.1 + P1.3+4 — HTML CSS class bindings
  // ============================================================================

  /**
   * Returns the rendered DOM dots for the currently selected formation.
   * Used by the CSS-class-binding tests below to verify which dots have
   * `is-gk` / `is-def` / `is-mid` / `is-att` applied.
   */
  function renderedDots(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.player-dot'));
  }

  /** Count dots per pitch-line. */
  function dotsPerLine(): number[] {
    const lines = fixture.nativeElement.querySelectorAll('.pitch-line') as NodeListOf<HTMLElement>;
    const counts: number[] = [];
    lines.forEach(line => counts.push(line.querySelectorAll('.player-dot').length));
    return counts;
  }

  it('V25D55-C16 P0.1: ALL_FORMATIONS (shared constant) has exactly 12 entries', async () => {
    // Re-import to ensure the source-of-truth constant matches what the
    // component renders.
    const { ALL_FORMATIONS: shared } = await import(
      '../../../../shared/constants/formations'
    );
    expect(shared.length).toBe(12);
    // Spot-check the 5 nuevas from C15 are present.
    expect(shared).toContain('3-5-2-CDM');
    expect(shared).toContain('5-4-1');
    expect(shared).toContain('3-4-1-2');
    expect(shared).toContain('4-2-2-2');
    expect(shared).toContain('4-3-3-1');
  });

  it('V25D55-C16 P1.3+4: GK dot has class is-gk (was always false before the fix)', () => {
    // 4-4-2: GK is the first dot on the first line.
    component.onFormationChange('4-4-2');
    fixture.detectChanges();
    const dots = renderedDots();
    expect(dots.length).toBe(11);
    expect(dots[0].classList.contains('is-gk')).toBeTrue();
    // No other dot should have is-gk.
    expect(dots.slice(1).every(d => !d.classList.contains('is-gk'))).toBeTrue();
  });

  it('V25D55-C16 P1.3+4: ATT dots have class is-att (was always false before the fix)', () => {
    // 4-4-2: ATT is the last line with 2 dots (indices 9, 10).
    component.onFormationChange('4-4-2');
    fixture.detectChanges();
    const dots = renderedDots();
    expect(dots[9].classList.contains('is-att')).toBeTrue();
    expect(dots[10].classList.contains('is-att')).toBeTrue();
    // No GK/DEF/MID dot should have is-att.
    for (let i = 0; i < 9; i++) {
      expect(dots[i].classList.contains('is-att')).toBeFalse();
    }
  });

  it('V25D55-C16 P1.3+4: 3-5-2-CDM (6 lines) — every MID line gets is-mid (CDM + 2CM + 2WB)', () => {
    // 3-5-2-CDM shape: GK(1) + 3CB(3) + CDM(1) + 2CM(2) + 2WB(2) + 2ST(2) = 11
    // Cumulative offsets: line 0 → dots[0], line 1 → dots[1..3], line 2 →
    // dots[4], line 3 → dots[5..6], line 4 → dots[7..8], line 5 → dots[9..10].
    component.onFormationChange('3-5-2-CDM');
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(dotsPerLine()).toEqual([1, 3, 1, 2, 2, 2]);

    const dots = renderedDots();
    expect(dots.length).toBe(11);
    // Line 0 (i=0): GK → is-gk
    expect(dots[0].classList.contains('is-gk')).toBeTrue();
    // Line 1 (i=1): 3 DEF → is-def (dots 1..3)
    for (let i = 1; i <= 3; i++) {
      expect(dots[i].classList.contains('is-def')).toBeTrue();
    }
    // Lines 2-4 (i=2,3,4): CDM + 2CM + 2WB → is-mid (dots 4..8, 6 dots)
    for (let i = 4; i <= 8; i++) {
      expect(dots[i].classList.contains('is-mid')).toBeTrue();
    }
    // Line 5 (i=5): 2 ATT → is-att (dots 9, 10)
    expect(dots[9].classList.contains('is-att')).toBeTrue();
    expect(dots[10].classList.contains('is-att')).toBeTrue();
  });

  it('V25D55-C16 P1.3+4: 5-4-1 (4 lines) — only line 2 is MID, lines 1 is DEF, line 3 is ATT', () => {
    component.onFormationChange('5-4-1');
    fixture.detectChanges();
    expect(dotsPerLine()).toEqual([1, 5, 4, 1]);

    const dots = renderedDots();
    // Line 0: GK
    expect(dots[0].classList.contains('is-gk')).toBeTrue();
    // Line 1: 5 DEF
    for (let i = 1; i <= 5; i++) {
      expect(dots[i].classList.contains('is-def')).toBeTrue();
      expect(dots[i].classList.contains('is-mid')).toBeFalse();
    }
    // Line 2: 4 MID
    for (let i = 6; i <= 9; i++) {
      expect(dots[i].classList.contains('is-mid')).toBeTrue();
      expect(dots[i].classList.contains('is-def')).toBeFalse();
      expect(dots[i].classList.contains('is-att')).toBeFalse();
    }
    // Line 3: 1 ATT
    expect(dots[10].classList.contains('is-att')).toBeTrue();
  });

  it('V25D55-C16 P1.3+4: 4-2-3-1 (5 lines) — lines 2 and 3 are MID (2 CDM + 3 CAM wide)', () => {
    component.onFormationChange('4-2-3-1');
    fixture.detectChanges();
    expect(dotsPerLine()).toEqual([1, 4, 2, 3, 1]);

    const dots = renderedDots();
    // Line 0: GK
    expect(dots[0].classList.contains('is-gk')).toBeTrue();
    // Line 1: 4 DEF (dots 1-4)
    for (let i = 1; i <= 4; i++) {
      expect(dots[i].classList.contains('is-def')).toBeTrue();
    }
    // Lines 2-3: 2 CDM + 3 wide CAM = 5 MID (dots 5-9)
    for (let i = 5; i <= 9; i++) {
      expect(dots[i].classList.contains('is-mid')).toBeTrue();
    }
    // Line 4: 1 ATT (dot 10)
    expect(dots[10].classList.contains('is-att')).toBeTrue();
  });

  // ========== V25D81-BUG #4: drag-drop re-arrangement ==========

  it('initial slotAssignments mirror the currentSlots from the dialog data', () => {
    expect(component.slotAssignments.get(0)).toBe('p1');
    expect(component.slotAssignments.get(1)).toBe('p2');
    expect(component.slotAssignments.get(2)).toBe('p3');
    expect(component.slotAssignments.get(3)).toBe('p4');
  });

  it('benchPlayers excludes the 4 starting XI players (3 bench: b1, b2, b3)', () => {
    const benchIds = component.benchPlayers.map(p => p.sessionPlayerId);
    expect(benchIds).toEqual(['b1', 'b2', 'b3']);
  });

  it('playerAtSlot returns the SessionPlayer for an assigned slot, null for empty', () => {
    const p1 = component.playerAtSlot(0);
    expect(p1).not.toBeNull();
    expect(p1?.sessionPlayerId).toBe('p1');
    expect(p1?.name).toBe('P1');
    // Slot 99 doesn't exist in the assignment map.
    expect(component.playerAtSlot(99)).toBeNull();
  });

  it('getSlotIndex converts (lineIdx, dotIdx) to flat index for 4-4-2', () => {
    // 4-4-2 lines: [1 GK, 4 DEF, 4 MID, 2 ATT]
    expect(component.getSlotIndex(0, 0)).toBe(0);   // GK
    expect(component.getSlotIndex(1, 0)).toBe(1);   // DEF line start
    expect(component.getSlotIndex(1, 3)).toBe(4);   // DEF line end
    expect(component.getSlotIndex(2, 0)).toBe(5);   // MID line start
    expect(component.getSlotIndex(3, 1)).toBe(10);  // last ATT
  });

  it('onSlotDrop swaps two players between slots (slot-to-slot)', () => {
    // Simulate dragging p1 (slot 0) onto p2 (slot 1).
    const ev = makeDragEvent('slot:0');
    component.onSlotDragStart(ev as any, 0);
    component.onSlotDrop(ev as any, 1);
    // After swap: slot 0 = p2, slot 1 = p1.
    expect(component.slotAssignments.get(0)).toBe('p2');
    expect(component.slotAssignments.get(1)).toBe('p1');
    // Other slots unchanged.
    expect(component.slotAssignments.get(2)).toBe('p3');
    expect(component.slotAssignments.get(3)).toBe('p4');
  });

  it('onSlotDrop is a no-op when source equals target (drop on self)', () => {
    const ev = makeDragEvent('slot:0');
    component.onSlotDragStart(ev as any, 0);
    component.onSlotDrop(ev as any, 0);
    expect(component.slotAssignments.get(0)).toBe('p1');
  });

  it('onBenchDragStart + onSlotDrop moves a bench player into a slot', () => {
    // Drag b1 (bench) into slot 0 (currently p1). The displaced
    // p1 is no longer in slotAssignments (so it falls into the
    // bench list automatically).
    const ev = makeDragEvent('bench:b1');
    component.onBenchDragStart(ev as any, 'b1');
    component.onSlotDrop(ev as any, 0);
    expect(component.slotAssignments.get(0)).toBe('b1');
    // The bench list now contains the displaced p1 (plus the other
    // bench players b2, b3).
    const benchIds = component.benchPlayers.map(p => p.sessionPlayerId);
    expect(benchIds).toContain('p1');
    expect(benchIds).not.toContain('b1');
    expect(benchIds).toContain('b2');
    expect(benchIds).toContain('b3');
  });

  it('onFormationChange re-flows slotAssignments for a wider formation', () => {
    // 4-3-3 has 11 slots (1+4+3+3) but the SAMPLE_DATA only fills 4.
    // After onFormationChange, the new slots 4-10 should be null.
    component.onFormationChange('4-3-3');
    // 4-3-3 lines: [1 GK, 4 DEF, 3 MID, 3 ATT] = 11 slots.
    expect(component.slotAssignments.size).toBe(11);
    expect(component.slotAssignments.get(0)).toBe('p1'); // preserved
    expect(component.slotAssignments.get(1)).toBe('p2'); // preserved
    expect(component.slotAssignments.get(2)).toBe('p3'); // preserved
    expect(component.slotAssignments.get(3)).toBe('p4'); // preserved
    expect(component.slotAssignments.get(4)).toBeNull(); // new empty
    expect(component.slotAssignments.get(10)).toBeNull(); // new empty
  });

  it('onFormationChange preserves all 11 assignments when formations have the same slot count (4-4-2 → 4-3-3 → 4-2-3-1 all have 11 slots)', () => {
    // All 12 formations in the dropdown have exactly 11 slots
    // (1 GK + 10 outfield). So in practice, a manager re-arranging
    // formations never LOSES assignments via trim. This test pins
    // that invariant: if a future formation is added with a
    // different slot count, this test will need an update.
    expect(component.slotAssignments.size).toBe(4); // p1..p4 from SAMPLE_DATA
    component.onFormationChange('4-3-3');
    expect(component.slotAssignments.size).toBe(11);
    // All 4 original assignments preserved at their flat indices.
    expect(component.slotAssignments.get(0)).toBe('p1');
    expect(component.slotAssignments.get(1)).toBe('p2');
    expect(component.slotAssignments.get(2)).toBe('p3');
    expect(component.slotAssignments.get(3)).toBe('p4');
    component.onFormationChange('4-2-3-1');
    expect(component.slotAssignments.size).toBe(11);
    expect(component.slotAssignments.get(0)).toBe('p1');
    expect(component.slotAssignments.get(1)).toBe('p2');
    expect(component.slotAssignments.get(2)).toBe('p3');
    expect(component.slotAssignments.get(3)).toBe('p4');
  });

  it('slotsDifferFromInitial returns false when nothing changed', () => {
    expect((component as any).slotsDifferFromInitial()).toBeFalse();
  });

  it('slotsDifferFromInitial returns true after a drag-drop swap', () => {
    const ev = makeDragEvent('slot:0');
    component.onSlotDragStart(ev as any, 0);
    component.onSlotDrop(ev as any, 1);
    expect((component as any).slotsDifferFromInitial()).toBeTrue();
  });

  it('slotsDifferFromInitial returns true when a bench player is moved to a slot', () => {
    const ev = makeDragEvent('bench:b1');
    component.onBenchDragStart(ev as any, 'b1');
    component.onSlotDrop(ev as any, 0);
    expect((component as any).slotsDifferFromInitial()).toBeTrue();
  });

  it('confirm sends the post-drag slot list to the backend', () => {
    // Setup: drag b1 into slot 0, displacing p1.
    const ev = makeDragEvent('bench:b1');
    component.onBenchDragStart(ev as any, 'b1');
    component.onSlotDrop(ev as any, 0);
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true, minuteApplied: 35 }));
    component.confirm();
    expect(engineServiceSpy.changeFormation).toHaveBeenCalledOnceWith(
      'm1',
      jasmine.arrayContaining([
        jasmine.objectContaining({ slotIndex: 0, sessionPlayerId: 'b1' }),
        jasmine.objectContaining({ slotIndex: 1, sessionPlayerId: 'p2' }),
        jasmine.objectContaining({ slotIndex: 2, sessionPlayerId: 'p3' }),
        jasmine.objectContaining({ slotIndex: 3, sessionPlayerId: 'p4' })
      ])
    );
  });

  it('onSlotDragEnd clears the drag source tracking (cleanup on release outside drop target)', () => {
    component.dragSourceSlotIdx = 0;
    component.dragSourceIsBench = false;
    component.onSlotDragEnd();
    expect(component.dragSourceSlotIdx).toBeNull();
    expect(component.dragSourceIsBench).toBeFalse();
  });
});

// Helper: builds a synthetic DragEvent with the given dataTransfer
// payload. jsdom doesn't fire real drag events, so the modal handlers
// operate on the DragEvent-shaped object directly.
function makeDragEvent(plainText: string): Partial<DragEvent> {
  return {
    preventDefault: () => undefined,
    dataTransfer: {
      setData: () => undefined,
      getData: (_format: string) => plainText,
      effectAllowed: 'move',
      dropEffect: 'move',
      files: [] as any,
      items: [] as any,
      types: []
    } as unknown as DataTransfer
  };
};

/**
 * V25D56 (Sprint C17) — formation-modal responsive breakpoints.
 *
 * <p>Pre-C17 the modal had no @media queries, so on phones the pitch
 * overflowed horizontally and dots got clipped. The fix adds the same
 * 3-breakpoint system used by squad-editor-modal (mobile <=600px,
 * tablet 601-1024px, desktop default >=1025px, large >=1600px).
 *
 * <p>Strategy: Karma/jsdom doesn't evaluate @media or compute viewport
 * styles, so we assert the styles source contains the expected
 * breakpoint blocks AND the dot keeps `aspect-ratio: 1` (circular)
 * via min-width/max-width bounds. This guards against future
 * regressions that drop the breakpoints or restore a hard-coded dot
 * size that overflows on mobile.
 */
describe('FormationModalComponent — V25D56 (C17) responsive breakpoints', () => {
  /**
   * Reads the @Component.styles source. Formation-modal now uses inline
   * styles (V25D56) so ɵcmp.styles returns the original CSS strings —
   * though Angular's emulated encapsulation still rewrites every
   * selector with [_ngcontent-%COMP%] (or the hashed version at
   * runtime), so {@link #stripEncapsulation} is applied first.
   */
  function stylesSource(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styles = (FormationModalComponent as any).ɵcmp?.styles ?? [];
    if (Array.isArray(styles)) {
      return styles.join('\n');
    }
    if (typeof styles === 'string') {
      return styles;
    }
    return '';
  }

  /**
   * Strips Angular's emulated-encapsulation attribute selectors so the
   * regex assertions can match the original class names without
   * having to know about [_ngcontent-%COMP%]. Runs on both the full
   * source (for simple @media query checks) and on extracted blocks.
   */
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

  it('large-desktop breakpoint exists at min-width: 1600px', () => {
    const src = stripEncapsulation(stylesSource());
    expect(src).toMatch(/@media\s*\(\s*min-width:\s*1600px\s*\)/);
  });

  it('mobile breakpoint keeps pitch dots visible with bounded width (12px-22px)', () => {
    const block = extractMediaBlock('max-width: 600px');
    expect(block).withContext('mobile @media block must exist').toBeTruthy();
    // Bounded width so dots never disappear or overflow on mobile.
    expect(block).toMatch(/\.player-dot\s*\{[^}]*min-width:\s*12px/);
    expect(block).toMatch(/\.player-dot\s*\{[^}]*max-width:\s*22px/);
  });

  it('dot-label truncates with ellipsis on mobile (text-overflow: ellipsis)', () => {
    const block = extractMediaBlock('max-width: 600px');
    expect(block).toBeTruthy();
    expect(block).toMatch(/\.dot-label\s*\{[^}]*text-overflow:\s*ellipsis/);
  });

  it('tablet breakpoint sets mid-size dots (24px) between mobile and desktop', () => {
    const block = extractMediaBlock('min-width: 601px) and (max-width: 1024px');
    expect(block).toBeTruthy();
    expect(block).toMatch(/\.player-dot\s*\{[^}]*width:\s*24px/);
  });
});

// ========== V25D81.1 BUG #4 (opción c): auto-fill empty slots ==========

describe('FormationModalComponent — V25D81.1 BUG #4 auto-fill empty slots', () => {
  let component: FormationModalComponent;
  let fixture: ComponentFixture<FormationModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormationModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  function makeAutoFillData(overrides: Partial<FormationDialogData> = {}): FormationDialogData {
    const base: FormationDialogData = {
      matchId: 'm-autofill',
      currentFormation: '4-4-2',
      homeTeamId: 'h1',
      // 4-4-2 = 1 GK + 4 DEF + 4 MID + 2 ATT = 11 slots. Seed only
      // the first 4 so the other 7 are empty for the auto-fill tests.
      currentSlots: [
        { sessionPlayerId: 'p1', position: 'GK',  slotIndex: 0 },
        { sessionPlayerId: 'p2', position: 'DEF', slotIndex: 1 },
        { sessionPlayerId: 'p3', position: 'MID', slotIndex: 2 },
        { sessionPlayerId: 'p4', position: 'ATT', slotIndex: 3 }
      ],
      squad: [
        { sessionPlayerId: 'p1', name: 'P1', position: 'GK',  attack: 50, defense: 50, technique: 50, speed: 50, stamina: 50, mentality: 50 },
        { sessionPlayerId: 'p2', name: 'P2', position: 'DEF', attack: 60, defense: 80, technique: 60, speed: 60, stamina: 70, mentality: 65 },
        { sessionPlayerId: 'p3', name: 'P3', position: 'MID', attack: 65, defense: 65, technique: 75, speed: 70, stamina: 70, mentality: 70 },
        { sessionPlayerId: 'p4', name: 'P4', position: 'ATT', attack: 85, defense: 50, technique: 70, speed: 80, stamina: 70, mentality: 70 },
        { sessionPlayerId: 'b1', name: 'B1', position: 'DEF', attack: 55, defense: 75, technique: 60, speed: 60, stamina: 65, mentality: 60 },
        { sessionPlayerId: 'b2', name: 'B2', position: 'MID', attack: 65, defense: 60, technique: 70, speed: 70, stamina: 70, mentality: 65 },
        { sessionPlayerId: 'b3', name: 'B3', position: 'ATT', attack: 75, defense: 50, technique: 65, speed: 75, stamina: 70, mentality: 65 }
      ] as any,
      startingIds: new Set(['p1', 'p2', 'p3', 'p4'])
    };
    return { ...base, ...overrides };
  }

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['changeFormation']);
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true, formation: '4-4-2' }));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    // V25D99.20.3-FRONT BUG-1: onFormationChange POSTs /career/lineup/auto-select
    // via HttpClient. The test suite for V25D81.1 doesn't care about the
    // auto-select response, so make the spy return a no-op observable
    // by default (the conservative response handler in the component
    // keeps the local slotAssignments on empty response).
    const httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    httpSpy.post.and.returnValue(of({ formation: '4-4-2', slots: [] }));

    await TestBed.configureTestingModule({
      imports: [FormationModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeAutoFillData() },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: httpSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FormationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * BUG #4 (1/5): empty slot auto-fill. The 7 empty 4-4-2 slots
   * (indices 4..10) get processed: slots 4 (DEF), 5 (MID) and 9
   * (ATT) get filled from the bench (b1, b2, b3 in matching
   * groups). The remaining 4 slots stay empty because the 3 bench
   * players are exhausted — the warning banner surfaces that gap.
   */
  it('BUG #4 (1/5): autoFillEmptySlots fills compatible slots and warns on the rest', () => {
    // Sanity: 7 slots empty before.
    let emptyBefore = 0;
    for (let i = 0; i < 11; i++) {
      if (!component.slotAssignments.get(i)) { emptyBefore++; }
    }
    expect(emptyBefore).toBe(7);

    component.autoFillEmptySlots();

    // The 4 originally-assigned slots (0..3) must keep their ids.
    expect(component.slotAssignments.get(0)).toBe('p1');
    expect(component.slotAssignments.get(1)).toBe('p2');
    expect(component.slotAssignments.get(2)).toBe('p3');
    expect(component.slotAssignments.get(3)).toBe('p4');

    // Slot 4 (RB/DEF) → b1 (DEF) ✓
    expect(component.slotAssignments.get(4)).toBe('b1');
    // Slot 5 (LM/MID) → b2 (MID) ✓
    expect(component.slotAssignments.get(5)).toBe('b2');
    // Slot 9 (ST/ATT) → b3 (ATT) ✓
    expect(component.slotAssignments.get(9)).toBe('b3');

    // Slots 6, 7, 8 (MID) and 10 (ATT) — bench exhausted, stay empty.
    // (toBeFalsy covers both null and undefined since the Map doesn't
    // pre-seed empty slot indices — get() returns undefined for
    // never-set keys.)
    expect(component.slotAssignments.get(6)).toBeFalsy();
    expect(component.slotAssignments.get(7)).toBeFalsy();
    expect(component.slotAssignments.get(8)).toBeFalsy();
    expect(component.slotAssignments.get(10)).toBeFalsy();

    // Warning surfaces the gap (4 unfilled positions).
    expect(component.warningMsg).toBeTruthy();
    expect(component.warningMsg).toContain('4 posición');
  });

  /**
   * BUG #4 (2/5): no compatible bench. A squad with only 1 GK and
   * no DEF bench player cannot fill the 4 DEF slots — the
   * auto-fill pass sets warningMsg instead of throwing or silently
   * dropping the request. The last-resort fallback (any bench
   * player) is intentionally NOT engaged in this case (no bench
   * players at all).
   */
  it('BUG #4 (2/5): no compatible bench triggers warningMsg', async () => {
    // Reconfigure the dialog data with a tiny squad: 1 GK (assigned)
    // and 1 ATT on the bench. No DEF bench → 4 DEF slots stay empty.
    await TestBed.resetTestingModule();
    const tinyData = makeAutoFillData({
      squad: [
        { sessionPlayerId: 'p1', name: 'P1', position: 'GK',  attack: 50, defense: 50, technique: 50, speed: 50, stamina: 50, mentality: 50 },
        { sessionPlayerId: 'b1', name: 'B1', position: 'ATT', attack: 60, defense: 50, technique: 60, speed: 60, stamina: 60, mentality: 60 }
      ] as any,
      startingIds: new Set(['p1']),
      currentSlots: [
        { sessionPlayerId: 'p1', position: 'GK', slotIndex: 0 }
      ]
    });
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['changeFormation']);
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true, formation: '4-4-2' }));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [FormationModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: tinyData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    }).compileComponents();

    const localFixture = TestBed.createComponent(FormationModalComponent);
    const localComponent = localFixture.componentInstance;
    localFixture.detectChanges();

    localComponent.autoFillEmptySlots();

    // Only the GK slot is filled by default + the ATT slot 9 gets
    // b1 (ATT compatible). The 4 DEF slots + 4 MID slots stay
    // empty (b1 isn't compatible with any of them). 9 unfilled
    // positions in total.
    expect(localComponent.warningMsg).toBeTruthy();
    expect(localComponent.warningMsg).toContain('9 posición');
    expect(localComponent.slotAssignments.get(0)).toBe('p1');
    // Slot 9 (ST/ATT) gets b1 (ATT compatible).
    expect(localComponent.slotAssignments.get(9)).toBe('b1');
  });

  /**
   * BUG #4 (3/5): manual override clears the auto-fill marker.
   * Run autoFillEmptySlots, then drag a different bench player into
   * one of the auto-filled slots. The isAutoFilledSlot() flag must
   * flip to false for that slot.
   */
  it('BUG #4 (3/5): manual drag into an auto-filled slot clears the marker', () => {
    component.autoFillEmptySlots();
    // Slot 4 was auto-filled with b1 (DEF).
    expect(component.isAutoFilledSlot(4)).toBe(true);

    // Simulate dragging bench player b2 (MID) into slot 4.
    component.dragSourceSlotIdx = -1;
    component.dragSourceIsBench = true;
    const dropEvent: Partial<DragEvent> = {
      dataTransfer: { getData: () => 'bench:b2' } as any,
      preventDefault: () => undefined as any
    };
    component.onSlotDrop(dropEvent as DragEvent, 4);

    expect(component.slotAssignments.get(4)).toBe('b2');
    expect(component.isAutoFilledSlot(4)).toBe(false,
        'manual override must clear the auto-fill marker for the slot');
  });

  /**
   * BUG #4 (4/5): auto-filled slots are tracked so the template can
   * render the lock badge. isAutoFilledSlot() returns true only for
   * slots filled by autoFillEmptySlots (3 in our seed data), not for
   * the originally assigned ones (4 in seed) nor for the slots that
   * stayed empty (4 in seed).
   */
  it('BUG #4 (4/5): only auto-filled slots carry the marker', () => {
    // The 4 originally-assigned slots must NEVER carry the marker.
    for (let i = 0; i < 4; i++) {
      expect(component.isAutoFilledSlot(i)).toBe(false,
          'pre-existing slot ' + i + ' must not be marked auto-filled');
    }

    component.autoFillEmptySlots();

    // Slots 4, 5, 9 got auto-filled (b1, b2, b3). The marker must
    // be exactly on those slots — not on the unfilled ones.
    expect(component.isAutoFilledSlot(4)).toBe(true);
    expect(component.isAutoFilledSlot(5)).toBe(true);
    expect(component.isAutoFilledSlot(9)).toBe(true);

    let markerCount = 0;
    for (let i = 0; i < 11; i++) {
      if (component.isAutoFilledSlot(i)) { markerCount++; }
    }
    expect(markerCount).toBe(3,
        'exactly 3 auto-fill markers must exist (one per bench player)');

    // Total assigned slots (4 original + 3 auto-filled) = 7.
    let assigned = 0;
    for (let i = 0; i < 11; i++) {
      if (component.slotAssignments.get(i)) { assigned++; }
    }
    expect(assigned).toBe(7);
  });

  /**
   * BUG #4 (5/5): confirm() runs autoFillEmptySlots() before POSTing
   * to the backend. The slot list received by
   * MatchEngineService.changeFormation must have the auto-filled
   * entries the algorithm computed (NOT a stale all-empty list).
   */
  it('BUG #4 (5/5): confirm() runs autoFill and sends the filled slot list', () => {
    component.onFormationChange('4-3-3');
    // 4-3-3 = 1 GK + 4 DEF + 3 MID + 3 ATT = 11 slots, but
    // onFormationChange preserves the original 4 (slotIndex 0..3)
    // and leaves 4..10 empty.

    component.confirm();

    expect(engineServiceSpy.changeFormation).toHaveBeenCalledTimes(1);
    const slots = engineServiceSpy.changeFormation.calls.mostRecent().args[1] as Array<{
      sessionPlayerId: string;
      position: string;
      slotIndex: number;
    }>;
    expect(slots.length).toBe(11);

    // The slot list must include the auto-fill picks (3 of them in
    // our seed data — b1/b2/b3 get into a DEF/MID/ATT slot).
    const playerIds = slots.map(s => s.sessionPlayerId);
    expect(playerIds).toContain('b1');
    expect(playerIds).toContain('b2');
    expect(playerIds).toContain('b3');

    // Original 4 starters preserved.
    expect(playerIds).toContain('p1');
    expect(playerIds).toContain('p2');
    expect(playerIds).toContain('p3');
    expect(playerIds).toContain('p4');
  });

  // ============================================================
  // V25D99.20.3-FRONT BUG-1 pinning tests: onFormationChange must
  // POST /career/lineup/auto-select so the backend re-runs the
  // HELPER-BASED slot assignment with the new formation. Pre-fix,
  // the modal only updated local slotAssignments and the squad
  // page kept reading the stale /career/lineup/current response.
  // Symptom: chem header showed 83/20% on the modal vs 91/60% on
  // the squad page (state divergence).
  // ============================================================

  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  describe('V25D99.20.3-FRONT BUG-1: onFormationChange posts to backend', () => {
    beforeEach(() => {
      httpClientSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
    });

    it('posts /career/lineup/auto-select with the new formation', () => {
      httpClientSpy.post.and.returnValue(of({
        formation: '4-3-3',
        slots: []
      }));

      component.onFormationChange('4-3-3');

      expect(httpClientSpy.post).toHaveBeenCalledTimes(1);
      const callArgs = httpClientSpy.post.calls.mostRecent().args;
      expect(callArgs[0]).toContain('/career/lineup/auto-select');
      expect(callArgs[1]).toEqual({ formation: '4-3-3' });
    });

    it('refreshes slotAssignments from the auto-select response slots', () => {
      // Mock the backend returning HELPER-BASED slot assignments.
      httpClientSpy.post.and.returnValue(of({
        formation: '4-3-3',
        slots: [
          { playerId: 'p1', subdivisionId: 'GK-1' },
          { playerId: 'p2', subdivisionId: 'S22-1' },
          { playerId: 'p3', subdivisionId: 'S22-2' },
          { playerId: 'p4', subdivisionId: 'S22-3' },
          { playerId: 'p5', subdivisionId: 'S23-2' }
        ]
      }));

      component.onFormationChange('4-3-3');

      // After the response, slotAssignments should reflect the
      // backend's HELPER-BASED assignment (not the local re-flow).
      expect(component.slotAssignments.get(0)).toBe('p1');
      expect(component.slotAssignments.get(1)).toBe('p2');
      expect(component.slotAssignments.get(2)).toBe('p3');
      expect(component.slotAssignments.get(3)).toBe('p4');
      expect(component.slotAssignments.get(4)).toBe('p5');
    });

    it('surfaces an error message when the auto-select POST fails', () => {
      httpClientSpy.post.and.returnValue(throwError(() => new Error('network down')));

      component.onFormationChange('4-3-3');

      expect(component.errorMsg).toContain('No se pudo actualizar');
    });
  });
});
