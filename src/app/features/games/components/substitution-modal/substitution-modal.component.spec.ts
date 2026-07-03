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

describe('V25D63-C23 P0: substitution modal shows effectiveness feedback', () => {
  let component: SubstitutionModalComponent;
  let fixture: ComponentFixture<SubstitutionModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SubstitutionModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  /**
   * Build a SubstitutionDialogData with effectivenessMap populated.
   *
   * <p>Players:
   * <ul>
   *   <li>p1 (GK, rating 85)            → eff=1.0  (eff-good)</li>
   *   <li>p2 (CB, rating 80)            → eff=0.95 (eff-good, just above 0.9)</li>
   *   <li>p3 (CDM, rating 78)           → eff=0.75 (eff-warning, 0.7-0.9 band)</li>
   *   <li>b1 (CB-bench, rating 75)      → NO en el map (no jugó en XI pre-match) → null</li>
   * </ul>
   */
  function buildDataWithEffectiveness(): SubstitutionDialogData {
    return {
      matchId: 'm1',
      currentMinute: 30,
      substitutionsRemaining: 5,
      startingXi: [
        { sessionPlayerId: 'p1', displayName: 'GK', position: 'GK', rating: 85, isStarter: true },
        { sessionPlayerId: 'p2', displayName: 'CB-good', position: 'CB', rating: 80, isStarter: true },
        { sessionPlayerId: 'p3', displayName: 'CDM-warning', position: 'CDM', rating: 78, isStarter: true }
      ],
      bench: [
        { sessionPlayerId: 'b1', displayName: 'CB-bench', position: 'CB', rating: 75, isStarter: false }
      ],
      effectivenessMap: {
        p1: 1.0,    // eff-good
        p2: 0.95,   // eff-good
        p3: 0.75    // eff-warning
        // b1 NO en el map (no jugó en XI pre-match) → null
      }
    };
  }

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['substitutePlayer']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    // V25D63-C23 P0: resetTestingModule antes de re-configurar para que el
    // MAT_DIALOG_DATA del describe anterior (SAMPLE_DATA) no contamine este.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: buildDataWithEffectiveness() },
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

  it('getEffClass returns eff-good for p1 (eff=1.0)', () => {
    expect(component.getEffClass('p1')).toBe('eff-good');
  });

  it('getEffClass returns eff-warning for p3 (eff=0.75)', () => {
    expect(component.getEffClass('p3')).toBe('eff-warning');
  });

  it('getEffClass returns null for bench player without data (b1)', () => {
    expect(component.getEffClass('b1')).toBeNull();
  });

  it('getEffBadge returns "100%" for p1', () => {
    expect(component.getEffBadge('p1')).toBe('100%');
  });

  it('getEffBadge returns "75%" for p3', () => {
    expect(component.getEffBadge('p3')).toBe('75%');
  });

  it('renders eff-good class on starting XI dot for p1', () => {
    // V25D79: starting XI is rendered as a click-only visual pitch (not a
    // list). The eff-good / eff-warning / eff-bad classes move from the
    // <li> to the corresponding .v25d79-pitch-dot so the V25D63 / V25D64
    // effectiveness-feedback chain keeps working visually.
    const dots = fixture.nativeElement.querySelectorAll('.v25d79-pitch-dot') as NodeListOf<HTMLElement>;
    const p1Dot = Array.from(dots).find((dot: HTMLElement) =>
      dot.querySelector('.v25d79-dot-name')?.textContent?.includes('GK') ?? false);
    expect(p1Dot?.classList.contains('eff-good')).toBeTrue();
  });

  it('renders eff-warning class on starting XI dot for p3', () => {
    const dots = fixture.nativeElement.querySelectorAll('.v25d79-pitch-dot') as NodeListOf<HTMLElement>;
    const p3Dot = Array.from(dots).find((dot: HTMLElement) =>
      dot.querySelector('.v25d79-dot-name')?.textContent?.includes('CDM-warning') ?? false);
    expect(p3Dot?.classList.contains('eff-warning')).toBeTrue();
  });

  it('renders eff-badge with percentage inside starting XI dot for p1', () => {
    const dots = fixture.nativeElement.querySelectorAll('.v25d79-pitch-dot') as NodeListOf<HTMLElement>;
    const p1Dot = Array.from(dots).find((dot: HTMLElement) =>
      dot.querySelector('.v25d79-dot-name')?.textContent?.includes('GK') ?? false);
    const badge = p1Dot?.querySelector('.eff-badge');
    expect(badge?.textContent?.trim()).toBe('100%');
  });

  it('bench player without effectiveness data renders NO eff class and NO eff-badge', () => {
    const lis = fixture.nativeElement.querySelectorAll('.col-bench .player-list li') as NodeListOf<HTMLElement>;
    const b1Li = lis[0];
    expect(b1Li.classList.contains('eff-good')).toBeFalse();
    expect(b1Li.classList.contains('eff-warning')).toBeFalse();
    expect(b1Li.classList.contains('eff-bad')).toBeFalse();
    expect(b1Li.querySelector('.eff-badge')).toBeNull();
  });

  // V25D64 (Sprint C24) P0: eff-good border verde (#10b981 emerald-500) para
  // simetria visual con eff-warning (amber) y eff-bad (red). El color real se
  // valida en smoke REVISOR; aca validamos que el class eff-good sigue bindeando
  // en el DOM para los SALE dots con eff >= 0.9 (consistency check).
  //
  // V25D79: query changed from `.col-starter .player-list li` to
  // `.v25d79-pitch-dot` because the starting XI is now a pitch, not a list.
  it('eff-good class is applied to SALE dot with eff >= 0.9 (green border symmetry check)', () => {
    const dots = fixture.nativeElement.querySelectorAll('.v25d79-pitch-dot') as NodeListOf<HTMLElement>;
    // p1 (eff=1.0) y p2 (eff=0.95) deben tener eff-good. p3 (eff=0.75) eff-warning.
    const goodDots = Array.from(dots).filter((dot: HTMLElement) =>
      dot.classList.contains('eff-good'));
    expect(goodDots.length).toBe(2,
      `expected 2 SALE dots with eff-good (p1 eff=1.0, p2 eff=0.95), got ${goodDots.length}`);
    // Sanity: los dots eff-good no deben colisionar con eff-warning ni eff-bad.
    goodDots.forEach((dot: HTMLElement) => {
      expect(dot.classList.contains('eff-warning')).withContext('eff-good dot must not also be eff-warning').toBeFalse();
      expect(dot.classList.contains('eff-bad')).withContext('eff-good dot must not also be eff-bad').toBeFalse();
    });
  });
});

/**
 * V25D79: visual pitch + per-player stats chips + substitutionsRemaining
 * derived from the SSE-fed MatchState (D3 + D5).
 *
 * <p>3 tests per task spec:
 * <ol>
 *   <li>{@code rendersStatsChips_whenPlayerRatingsContainsPlayerId} —
 *       stats chips (goals G, keyPasses KP, yellows Y, fouls F, injuries I)
 *       render on each dot when {@code data.playerRatings} carries a
 *       matching entry for that playerId.</li>
 *   <li>{@code rendersVisualFormationPitch_withLinesGroupedByCategory} —
 *       the starting XI renders as a click-only visual pitch (not a flat
 *       list) when {@code data.formation} is present.</li>
 *   <li>{@code substitutionsRemaining_isSourcedFromData} — the modal
 *       derives the canConfirm + isOutOfSubs gates from
 *       {@code data.substitutionsRemaining}, which the service
 *       propagates from the SSE state's V25D79 field (D5).</li>
 * </ol>
 */
describe('V25D79: visual pitch + stats chips + substitutionsRemaining', () => {
  let component: SubstitutionModalComponent;
  let fixture: ComponentFixture<SubstitutionModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SubstitutionModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  /**
   * Build a controlled SubstitutionDialogData with playerRatings (per spec
   * task: "Render stats chips cuando hay eventos con playerId"). Player
   * states mimic what the back's V24PlayerMatchStatsModel.computeRatings
   * produces after the engine has run for some minutes:
   *  - p1 (GK): one goal (rare for a GK but illustrative), one foul.
   *  - p2 (CB): one yellow card, 3 key passes.
   *  - p3 (CDM): one injury, no other stats.
   *  - p4 (ST): 2 goals, 1 key pass, 1 yellow.
   *  - b1 (CB-bench): 1 goal, but on the bench (no chips since the bench
   *    is a list not a pitch).
   */
  function buildDataWithStats(): SubstitutionDialogData {
    return {
      matchId: 'm1',
      currentMinute: 35,
      startingXi: [
        { sessionPlayerId: 'p1', displayName: 'Home GK', position: 'GK', rating: 80, isStarter: true },
        { sessionPlayerId: 'p2', displayName: 'Home CB', position: 'CB', rating: 75, isStarter: true },
        { sessionPlayerId: 'p3', displayName: 'Home CDM', position: 'CDM', rating: 78, isStarter: true },
        { sessionPlayerId: 'p4', displayName: 'Home ST', position: 'ST', rating: 82, isStarter: true }
      ],
      bench: [
        { sessionPlayerId: 'b1', displayName: 'Bench CB', position: 'CB', rating: 70, isStarter: false }
      ],
      // V25D79 (D5): 3 subs remaining (2 already used).
      substitutionsRemaining: 3,
      formation: '4-3-3',
      playerRatings: [
        // GK — defensive stats only (rare for a GK to score, but spec illustrates chip rendering).
        { playerId: 'p1', playerName: 'Home GK', teamId: 'home', position: 'GK',
          rating: 7.2, goals: 0, assists: 0, keyPasses: 0, shots: 0,
          yellowCards: 1, redCards: 0, injuries: 0, fouls: 2,
          substitutedIn: false, substitutedOut: false },
        // CB — yellow card + key passes (typical defensive mid).
        { playerId: 'p2', playerName: 'Home CB', teamId: 'home', position: 'CB',
          rating: 7.0, goals: 0, assists: 1, keyPasses: 3, shots: 0,
          yellowCards: 1, redCards: 0, injuries: 0, fouls: 1,
          substitutedIn: false, substitutedOut: false },
        // CDM — injury (no other stats).
        { playerId: 'p3', playerName: 'Home CDM', teamId: 'home', position: 'CDM',
          rating: 6.5, goals: 0, assists: 0, keyPasses: 0, shots: 0,
          yellowCards: 0, redCards: 0, injuries: 1, fouls: 0,
          substitutedIn: false, substitutedOut: false },
        // ST — prolific: 2 goals + 1 KP + 1 yellow.
        { playerId: 'p4', playerName: 'Home ST', teamId: 'home', position: 'ST',
          rating: 8.4, goals: 2, assists: 0, keyPasses: 1, shots: 4,
          yellowCards: 1, redCards: 0, injuries: 0, fouls: 0,
          substitutedIn: false, substitutedOut: false }
      ],
      managerSide: 'HOME'
    };
  }

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['substitutePlayer']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    // V25D79: resetTestingModule para que el MAT_DIALOG_DATA del describe
    // anterior (SAMPLE_DATA / buildDataWithEffectiveness) no contamine este.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: buildDataWithStats() },
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

  it('rendersStatsChips_whenPlayerRatingsContainsPlayerId', () => {
    // The visual pitch renders each starting-XI dot. p4 (ST) has the richest
    // chips: 2G + 1KP + 1Y. Verifying via data-testid leaves a stable hook
    // for REVISOR smoke checks too.
    const stChip = fixture.nativeElement.querySelector(
      '[data-testid="chip-goals-p4"]') as HTMLElement;
    expect(stChip).withContext('ST goals chip should render for player p4').not.toBeNull();
    expect(stChip.textContent?.trim()).toBe('2G');

    const stKp = fixture.nativeElement.querySelector(
      '[data-testid="chip-kp-p4"]') as HTMLElement;
    expect(stKp?.textContent?.trim()).toBe('1KP');

    const stYc = fixture.nativeElement.querySelector(
      '[data-testid="chip-yc-p4"]') as HTMLElement;
    expect(stYc?.textContent?.trim()).toBe('1Y');

    // p2 (CB) — yellow + keyPasses (no goals, no injuries, no fouls in this setup for p2's KPs).
    const cbKp = fixture.nativeElement.querySelector(
      '[data-testid="chip-kp-p2"]') as HTMLElement;
    expect(cbKp?.textContent?.trim()).toBe('3KP');

    // p3 (CDM) — injury (1I).
    const cdmInj = fixture.nativeElement.querySelector(
      '[data-testid="chip-inj-p3"]') as HTMLElement;
    expect(cdmInj?.textContent?.trim()).toBe('1I');

    // Bench players must NOT render chip strips (only the visual pitch does).
    const benchGoalsChip = fixture.nativeElement.querySelector('[data-testid="chip-goals-b1"]');
    expect(benchGoalsChip).withContext('bench player chips are intentionally not rendered').toBeNull();
  });

  it('rendersVisualFormationPitch_withLinesGroupedByCategory', () => {
    // Per spec D4: visual formation click-only, NO drag. Each pitch-line
    // should have at least one dot; the GK line should be a single dot
    // (GK category always 1); DEF line should hold any CB/CDM players;
    // ATT line should hold any ST/CF players. The lines are categorized,
    // not formation-line-counts (4-4-2 → 4 lines, etc.) — this is the
    // V25D79 simplification documented in pitchLines getter.
    const pitchLines = fixture.nativeElement.querySelectorAll(
      '.v25d79-pitch .v25d79-pitch-line');
    expect(pitchLines.length).withContext('pitch should have at least one line').toBeGreaterThan(0);

    // GK line should be a single row holding p1 (GK).
    const gkLine = Array.from(pitchLines as NodeListOf<HTMLElement>).find(
      line => line.getAttribute('data-category') === 'GK');
    expect(gkLine).withContext('GK line should be present').not.toBeNull();
    const gkDots = gkLine!.querySelectorAll('.v25d79-pitch-dot');
    expect(gkDots.length).toBe(1, 'GK line should hold exactly 1 GK player');

    // ATT line should hold p4 (ST).
    const attLine = Array.from(pitchLines as NodeListOf<HTMLElement>).find(
      line => line.getAttribute('data-category') === 'ATT');
    expect(attLine).withContext('ATT line should be present (ST >= 1)').not.toBeNull();
    const attDots = attLine!.querySelectorAll('.v25d79-pitch-dot');
    expect(attDots.length).toBeGreaterThanOrEqual(1, 'ATT line should hold p4 (ST)');

    // All dots must be clickable (click-only, no drag). The (click) handler
    // is selectOff — verify clicking a dot sets playerOffId.
    const p4Dot = attLine!.querySelector(
      '.v25d79-pitch-dot[aria-label*="Home ST"]') as HTMLElement;
    expect(p4Dot).withContext('ST player p4 dot should be in the ATT line').not.toBeNull();
    p4Dot.click();
    // OnPush component — re-run change detection so the [class.selected]
    // binding re-evaluates with the new playerOffId.
    fixture.detectChanges();
    expect(component.playerOffId).toBe('p4', 'clicking the dot must set playerOffId = p4');

    // The selected dot must carry the .selected class.
    expect(p4Dot.classList.contains('selected'))
      .withContext('selected dot must carry the .selected class for visual feedback').toBeTrue();

    // Empty WINGER row must NOT render — sanity for the empty-line filter.
    const wingerLine = Array.from(pitchLines as NodeListOf<HTMLElement>).find(
      line => line.getAttribute('data-category') === 'WINGER');
    expect(wingerLine).withContext('WINGER line is filtered out when no WINGER players').toBeUndefined();
  });

  it('substitutionsRemaining_isSourcedFromData', () => {
    // V25D79 (D5): substitutionsRemaining comes from the live SSE state
    // (computed by MatchSession.adaptV24Snapshot as max(0, 5 - SUBSTITUTION
    // events)). The modal uses it to gate canConfirm + isOutOfSubs. The
    // service sources it from `state.substitutionsRemaining` and falls back
    // to 5 when the SSE feed hasn't arrived.
    //
    // This test rebuilds the TestBed with TWO distinct dialog-data shapes:
    // one with subs=3 (positive case), one with subs=0 (zero case). Each
    // gets a fresh component instance so the OnPush change-detection
    // binds reliably on first render.
    expect(component.isOutOfSubs).withContext('3 remaining (initial) → NOT out of subs').toBeFalse();

    component.selectOff({ sessionPlayerId: 'p4', displayName: 'Home ST',
      position: 'ST', rating: 82, isStarter: true } as SubModalPlayer);
    component.selectOn({ sessionPlayerId: 'b1', displayName: 'Bench CB',
      position: 'CB', rating: 70, isStarter: false } as SubModalPlayer);
    expect(component.canConfirm).withContext('selection is valid + subs remaining → canConfirm = true').toBeTrue();

    // Rebuild the test bed with substitutionsRemaining=0 so the modal
    // renders the .is-zero class on first detection (no mutation, no CD
    // workaround). Each rebuild yields a clean component instance + clean
    // data reference.
    TestBed.resetTestingModule();
    const zeroSubsData = { ...buildDataWithStats(), substitutionsRemaining: 0 };
    TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: zeroSubsData },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
        { provide: MatchEngineService, useValue: jasmine.createSpyObj('MatchEngineService', ['substitutePlayer']) },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    });
    const zeroFixture = TestBed.createComponent(SubstitutionModalComponent);
    zeroFixture.detectChanges();
    const zeroComponent = zeroFixture.componentInstance;

    expect(zeroComponent.isOutOfSubs).withContext('0 remaining → isOutOfSubs must be true on fresh render').toBeTrue();
    expect(zeroComponent.canConfirm).withContext('canConfirm must be false when 0 subs remaining').toBeFalse();

    // Also verify the styled remaining-tag carries the is-zero class for
    // visual feedback (the user-facing indicator).
    const remainingTag = zeroFixture.nativeElement.querySelector('.v25d79-remaining') as HTMLElement;
    expect(remainingTag).not.toBeNull();
    expect(remainingTag.classList.contains('is-zero'))
      .withContext('is-zero class must be applied when substitutionsRemaining = 0').toBeTrue();
  });

  // ========== V25D81-BUG #3: preSelectedPlayerId auto-select on INJURY ==========

  it('preSelectedPlayerId matching a starter auto-selects that player in ngOnInit', () => {
    TestBed.resetTestingModule();
    const preSelectedData: SubstitutionDialogData = {
      ...SAMPLE_DATA,
      preSelectedPlayerId: 'p2', // p2 is in the starting XI
      reason: 'INJURY_FORCED_SUBSTITUTION'
    };
    TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: preSelectedData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    });
    const f = TestBed.createComponent(SubstitutionModalComponent);
    f.detectChanges(); // triggers ngOnInit
    const c = f.componentInstance;
    expect(c.playerOffId)
      .withContext('playerOffId must be pre-populated from preSelectedPlayerId on ngOnInit')
      .toBe('p2');
    expect(c.canConfirm)
      .withContext('canConfirm must remain false until the ON player is picked')
      .toBeFalse();
  });

  it('preSelectedPlayerId NOT in starting XI is a silent no-op (manager picks manually)', () => {
    TestBed.resetTestingModule();
    const preSelectedData: SubstitutionDialogData = {
      ...SAMPLE_DATA,
      preSelectedPlayerId: 'unknown-pid',
      reason: 'INJURY_FORCED_SUBSTITUTION'
    };
    TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: preSelectedData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    });
    const f = TestBed.createComponent(SubstitutionModalComponent);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.playerOffId)
      .withContext('playerOffId must remain null when preSelectedPlayerId is not in starting XI')
      .toBeNull();
  });

  it('manual opens (no preSelectedPlayerId) keep the legacy click-to-pick UX', () => {
    expect(component.playerOffId)
      .withContext('manual open must NOT pre-select any OFF player')
      .toBeNull();
  });

  it('reason=INJURY_FORCED_SUBSTITUTION renders the reason badge in the title', () => {
    TestBed.resetTestingModule();
    const data: SubstitutionDialogData = {
      ...SAMPLE_DATA,
      preSelectedPlayerId: 'p1',
      reason: 'INJURY_FORCED_SUBSTITUTION'
    };
    TestBed.configureTestingModule({
      imports: [SubstitutionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatchEngineService, useValue: engineServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get', 'post']) }
      ]
    });
    const f = TestBed.createComponent(SubstitutionModalComponent);
    f.detectChanges();
    const reasonBadge = f.nativeElement.querySelector('.reason-badge') as HTMLElement;
    expect(reasonBadge).not.toBeNull();
    expect(reasonBadge.getAttribute('data-reason')).toBe('injury');
    expect(reasonBadge.textContent).toContain('Sustitución por lesión');
  });

  it('reason=undefined (manual open) does NOT render the reason badge', () => {
    const reasonBadge = fixture.nativeElement.querySelector('.reason-badge') as HTMLElement;
    expect(reasonBadge)
      .withContext('manual open must not render the INJURY reason badge')
      .toBeNull();
  });
});
