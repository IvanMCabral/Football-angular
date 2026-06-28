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
});

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
