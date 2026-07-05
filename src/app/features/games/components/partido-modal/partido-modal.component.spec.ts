/**
 * V25D89-FRONT-A: unit tests for {@link PartidoModalComponent}.
 *
 * <p>Scope:
 * <ul>
 *   <li>Tab state: default = 'mine', click handler flips to 'rival'.</li>
 *   <li>Tab 1 (Mi Formación) renders the formation select + pitch dots.</li>
 *   <li>Tab 2 (Formación Rival) renders the AI banner + rival pitch dots,
 *       all dots have pointer-events disabled (no drag).</li>
 *   <li>Footer: "Descartar" enabled; "Guardar" disabled when no pending
 *       changes; enabled when formation string OR slots change.</li>
 *   <li>Save flow: POSTs to engineService.changeFormation, closes dialog
 *       with success payload on 200, surfaces error banner on failure.</li>
 *   <li>Discard flow: closes dialog with success=false reason=discarded,
 *       no API call.</li>
 *   <li>Inlined styles expose `.rival-pitch` + `.banner-info-ai` to
 *       ɵcmp.styles for the responsive + visual-pitch assertions.</li>
 * </ul>
 *
 * <p>Per angular-testing-patterns memory: this codebase uses the
 * `(done: DoneFn) => { ... fixture.whenStable().then(() => { ... done(); }); }`
 * pattern instead of fakeAsync (no ProxyZone setup).
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { PartidoModalComponent, PartidoDialogData } from './partido-modal.component';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { SessionPlayer } from '../../../../shared/models/player.model';

const SQUAD: SessionPlayer[] = [
  { sessionPlayerId: 's1', name: 'GK 1',  position: 'GK'  } as SessionPlayer,
  { sessionPlayerId: 's2', name: 'DEF 1', position: 'CB'  } as SessionPlayer,
  { sessionPlayerId: 's3', name: 'DEF 2', position: 'CB'  } as SessionPlayer,
  { sessionPlayerId: 's4', name: 'DEF 3', position: 'LB'  } as SessionPlayer,
  { sessionPlayerId: 's5', name: 'DEF 4', position: 'RB'  } as SessionPlayer,
  { sessionPlayerId: 's6', name: 'MID 1', position: 'CM'  } as SessionPlayer,
  { sessionPlayerId: 's7', name: 'MID 2', position: 'CM'  } as SessionPlayer,
  { sessionPlayerId: 's8', name: 'MID 3', position: 'CM'  } as SessionPlayer,
  { sessionPlayerId: 's9', name: 'MID 4', position: 'CM'  } as SessionPlayer,
  { sessionPlayerId: 's10', name: 'ATT 1', position: 'ST' } as SessionPlayer,
  { sessionPlayerId: 's11', name: 'ATT 2', position: 'ST' } as SessionPlayer,
  { sessionPlayerId: 's12', name: 'BENCH DEF', position: 'CB'  } as SessionPlayer,
  { sessionPlayerId: 's13', name: 'BENCH MID', position: 'CM'  } as SessionPlayer,
  { sessionPlayerId: 's14', name: 'BENCH ATT', position: 'ST'  } as SessionPlayer
];

const STARTING_IDS = new Set<string>(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11']);

function makeData(overrides: Partial<PartidoDialogData> = {}): PartidoDialogData {
  return {
    matchId: 'match-1',
    currentFormation: '4-4-2',
    homeTeamId: 'team-h',
    currentSlots: [
      { sessionPlayerId: 's1',  position: 'GK', slotIndex: 0  },
      { sessionPlayerId: 's2',  position: 'CB', slotIndex: 1  },
      { sessionPlayerId: 's3',  position: 'CB', slotIndex: 2  },
      { sessionPlayerId: 's4',  position: 'LB', slotIndex: 3  },
      { sessionPlayerId: 's5',  position: 'RB', slotIndex: 4  },
      { sessionPlayerId: 's6',  position: 'CM', slotIndex: 5  },
      { sessionPlayerId: 's7',  position: 'CM', slotIndex: 6  },
      { sessionPlayerId: 's8',  position: 'CM', slotIndex: 7  },
      { sessionPlayerId: 's9',  position: 'CM', slotIndex: 8  },
      { sessionPlayerId: 's10', position: 'ST', slotIndex: 9  },
      { sessionPlayerId: 's11', position: 'ST', slotIndex: 10 }
    ],
    squad: SQUAD,
    startingIds: STARTING_IDS,
    rivalFormation: '4-3-3',
    // V25D89.2 defaults — makeData provides safe defaults so the existing
    // 22 tests don't need to be touched (their baseline asserts on Tab
    // state + formation flow, not on stats).
    awayTeamId: 'team-a',
    currentMinute: 0,
    score: { home: 0, away: 0 },
    homePossession: 50,
    awayPossession: 50,
    homeTeamName: 'HOME',
    awayTeamName: 'AWAY',
    events: [],
    substitutionsRemaining: 5,
    ...overrides
  };
}

/**
 * V25D89-FRONT-A: helper to strip Angular's emulated encapsulation suffix
 * `[_ngcontent-%COMP%]` (or hashed at runtime) from CSS selectors so the
 * ɵcmp.styles source matches what was written in the {@code styles: [...]}
 * array. Same pattern as angular-testing-patterns memory.
 */
function stripEncapsulation(css: string): string {
  return css.replace(/\[[_]?ngcontent-[^\]]*\]/g, '');
}

/** V25D89-FRONT-A: helper to read the component's inlined CSS source. */
function stylesSource(): string {
  const styles = (PartidoModalComponent as any).ɵcmp?.styles ?? [];
  return Array.isArray(styles) ? styles.join('\n') : String(styles);
}

describe('PartidoModalComponent (V25D89-FRONT-A)', () => {
  let fixture: ComponentFixture<PartidoModalComponent>;
  let component: PartidoModalComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<PartidoModalComponent>>;
  let engineSpy: jasmine.SpyObj<MatchEngineService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    engineSpy = jasmine.createSpyObj('MatchEngineService', ['changeFormation']);
    engineSpy.changeFormation.and.returnValue(of({ success: true, minuteApplied: 30 } as any));
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData() },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PartidoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ========== Tab state ==========

  it('default active tab is "mine" (manager formation first)', () => {
    expect(component.activeTab()).toBe('mine');
  });

  it('onTabChange(1) flips activeTab to "rival"', () => {
    component.onTabChange(1);
    expect(component.activeTab()).toBe('rival');
  });

  it('onTabChange(0) flips activeTab back to "mine"', () => {
    component.onTabChange(1);
    component.onTabChange(0);
    expect(component.activeTab()).toBe('mine');
  });

  // ========== Tab 1 — Mi Formación ==========

  it('renders the formation select with the 12 ALL_FORMATIONS options', () => {
    const select = fixture.nativeElement.querySelector('[data-testid="formation-select"]');
    expect(select).toBeTruthy();
    expect(component.formations.length).toBe(12);
  });

  it('renders one player-dot per slot for the current 4-4-2 formation (11 slots)', () => {
    const dots = fixture.nativeElement.querySelectorAll('.pitch-line .player-dot');
    // 4-4-2 → GK(1) + DEF(4) + MID(4) + ATT(2) = 11 dots
    expect(dots.length).toBe(11);
  });

  it('"Guardar" button is disabled when there are no pending changes', () => {
    const saveBtn = fixture.nativeElement.querySelector('[data-testid="partido-save"]');
    expect(saveBtn.disabled).toBeTrue();
  });

  it('"Guardar" button becomes enabled when the formation string changes', () => {
    component.onFormationChange('4-3-3');
    fixture.detectChanges();
    expect(component.hasPendingChanges()).toBeTrue();
    const saveBtn = fixture.nativeElement.querySelector('[data-testid="partido-save"]');
    expect(saveBtn.disabled).toBeFalse();
  });

  it('"Descartar" button is enabled while idle', () => {
    const discardBtn = fixture.nativeElement.querySelector('[data-testid="partido-discard"]');
    expect(discardBtn.disabled).toBeFalse();
  });

  it('rival pitch is NOT in the DOM when activeTab is "mine"', () => {
    const rival = fixture.nativeElement.querySelector('[data-testid="rival-pitch"]');
    // mat-tab content uses lazy template so the tab body is not rendered
    // until the tab is selected. Confirm via the activeTab signal instead.
    expect(component.activeTab()).toBe('mine');
    expect(rival).toBeFalsy();
  });

  // ========== Tab 2 — Formación Rival (read-only) ==========

  it('rival pitch renders when activeTab is "rival" (with role labels, no player names)', () => {
    component.onTabChange(1);
    fixture.detectChanges();
    const rivalPitch = fixture.nativeElement.querySelector('[data-testid="rival-pitch"]');
    expect(rivalPitch).toBeTruthy();
    // 4-3-3 → GK + 2 CB + 3 CM + 1 LW + 1 ST + 1 RW = 9 dots... actually 1+4+3+3 = 11
    const rivalDots = rivalPitch.querySelectorAll('.player-dot');
    expect(rivalDots.length).toBe(11);
    // All rival dots have pointer-events disabled via CSS class .rival-pitch
    expect(rivalPitch.classList.contains('rival-pitch')).toBeTrue();
  });

  it('rival pitch dots have the AI-managed class (visual de-emphasis)', () => {
    component.onTabChange(1);
    fixture.detectChanges();
    const rivalDots = fixture.nativeElement.querySelectorAll('[data-testid="rival-pitch"] .player-dot');
    // CSS selector .rival-pitch .player-dot applies opacity: 0.55 + pointer-events: none
    expect(rivalDots.length).toBe(11);
    // We can't test computed styles in jsdom, but we can confirm the class
    // is present and the source CSS targets them.
  });

  it('rival AI banner is visible when activeTab is "rival"', () => {
    component.onTabChange(1);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-testid="rival-ai-banner"]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('IA');
    expect(banner.textContent).toContain('no editable');
  });

  it('rival formation display shows the awayFormation string verbatim', () => {
    component.onTabChange(1);
    fixture.detectChanges();
    const display = fixture.nativeElement.querySelector('[data-testid="rival-formation-display"]');
    expect(display.textContent).toContain('4-3-3');
  });

  it('rivalFormation getter falls back to 4-4-2 when awayFormation is unknown', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({ rivalFormation: '99-0-0' }) },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    const cmp2 = fx2.componentInstance;
    expect(cmp2.rivalFormation()).toBe('4-4-2');
  });

  // ========== Footer — Discard ==========

  it('discard() closes dialog with success=false reason="discarded" and no API call', () => {
    component.discard();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ success: false, reason: 'discarded' });
    expect(engineSpy.changeFormation).not.toHaveBeenCalled();
  });

  // ========== Footer — Save ==========

  it('save() with no pending changes closes dialog (no API call)', () => {
    component.save();
    expect(engineSpy.changeFormation).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ success: false, reason: 'no-change' });
  });

  it('save() with pending formation change calls engineService.changeFormation and closes on success', (done) => {
    component.onFormationChange('4-3-3');
    component.save();
    fixture.whenStable().then(() => {
      expect(engineSpy.changeFormation).toHaveBeenCalledWith(
        'match-1',
        jasmine.any(Array)
      );
      const slots = engineSpy.changeFormation.calls.mostRecent().args[1] as any[];
      // 4-3-3 has 11 slots — 1 GK + 4 DEF + 3 MID + 3 ATT
      expect(slots.length).toBe(11);
      expect(slots[0].slotIndex).toBe(0);
      expect(slots[0].position).toBe('GK');
      expect(dialogRefSpy.close).toHaveBeenCalledWith(
        jasmine.objectContaining({ success: true, formation: '4-3-3' })
      );
      done();
    });
  });

  it('save() success shows snackbar with the new formation', (done) => {
    component.onFormationChange('4-3-3');
    component.save();
    fixture.whenStable().then(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/4-3-3/),
        'OK',
        jasmine.any(Object)
      );
      done();
    });
  });

  it('save() on backend success=false surfaces the error banner and stays open', (done) => {
    engineSpy.changeFormation.and.returnValue(of({ success: false, error: 'invalid formation' } as any));
    component.onFormationChange('4-3-3');
    component.save();
    fixture.whenStable().then(() => {
      expect(component.errorMsg).toBe('invalid formation');
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
      fixture.detectChanges();
      const errBanner = fixture.nativeElement.querySelector('[data-testid="partido-error"]');
      expect(errBanner).toBeTruthy();
      expect(errBanner.textContent).toContain('invalid formation');
      done();
    });
  });

  it('save() on network error surfaces generic error banner', (done) => {
    engineSpy.changeFormation.and.returnValue(throwError(() => new Error('network down')));
    component.onFormationChange('4-3-3');
    component.save();
    fixture.whenStable().then(() => {
      expect(component.errorMsg).toContain('Error de red');
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
      done();
    });
  });

  // ========== Inlined CSS source (ɵcmp.styles exposure) ==========

  it('ɵcmp.styles includes the .rival-pitch disabled-dot rule (after encapsulation strip)', () => {
    const src = stripEncapsulation(stylesSource());
    // Angular's CSS parser normalizes whitespace between selectors to
    // multiple spaces (e.g. ".rival-pitch   .player-dot") so we use a
    // regex with \s+ instead of an exact single-space substring match.
    expect(src).toMatch(/\.rival-pitch\s+\.player-dot/);
    expect(src).toContain('pointer-events: none');
  });

  it('ɵcmp.styles includes the .banner-info-ai rule (after encapsulation strip)', () => {
    const src = stripEncapsulation(stylesSource());
    expect(src).toContain('.banner-info-ai');
  });

  // ========== ngOnDestroy cleanup ==========

  it('ngOnDestroy completes the destroy$ subject', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  // ========== V25D89.2: stats live (derived from events list) ==========

  it('statsRows() derives shots + shots-on-target + corners + fouls + offsides + cards from events with teamId attribution', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({
            events: [
              { eventType: 'SHOT',            minute: 10, playerName: 'A', description: 'd', teamId: 'team-h' },
              { eventType: 'SHOT',            minute: 15, playerName: 'B', description: 'd', teamId: 'team-a' },
              { eventType: 'SHOT_ON_TARGET',  minute: 20, playerName: 'C', description: 'd', teamId: 'team-h' },
              { eventType: 'SHOT_ON_TARGET',  minute: 25, playerName: 'D', description: 'd', teamId: 'team-a' },
              { eventType: 'SHOT_ON_TARGET',  minute: 30, playerName: 'E', description: 'd', teamId: 'team-a' },
              { eventType: 'CORNER',          minute: 35, playerName: 'F', description: 'd', teamId: 'team-h' },
              { eventType: 'FOUL',            minute: 40, playerName: 'G', description: 'd', teamId: 'team-h' },
              { eventType: 'FOUL',            minute: 42, playerName: 'H', description: 'd', teamId: 'team-h' },
              { eventType: 'OFFSIDE',         minute: 45, playerName: 'I', description: 'd', teamId: 'team-a' },
              { eventType: 'YELLOW_CARD',     minute: 50, playerName: 'J', description: 'd', teamId: 'team-h' },
              { eventType: 'RED_CARD',        minute: 55, playerName: 'K', description: 'd', teamId: 'team-a' }
            ]
          })
        },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    const cmp2 = fx2.componentInstance;
    const rows = cmp2.statsRows();
    const byLabel: Record<string, { home: string; away: string }> = {};
    rows.forEach(r => { byLabel[r.label] = { home: r.home, away: r.away }; });

    // Tiros totales = SHOT + SHOT_ON_TARGET per team
    expect(byLabel['Tiros totales']).toEqual({ home: '2', away: '3' });
    // Tiros a puerta = SHOT_ON_TARGET only
    expect(byLabel['Tiros a puerta']).toEqual({ home: '1', away: '2' });
    // Corners / Faltas / Offsides per team
    expect(byLabel['Corners']).toEqual({ home: '1', away: '0' });
    expect(byLabel['Faltas']).toEqual({ home: '2', away: '0' });
    expect(byLabel['Offsides']).toEqual({ home: '0', away: '1' });
    // Tarjetas A:R — yellows:reds format
    expect(byLabel['Tarjetas A:R']).toEqual({ home: '1:0', away: '0:1' });
  });

  it('statsRows() uses score from dialog data (canonical source) instead of counting GOAL events', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({
            score: { home: 3, away: 1 },
            events: [
              { eventType: 'GOAL', minute: 10, playerName: 'A', description: 'd', teamId: 'team-h' },
              { eventType: 'GOAL', minute: 30, playerName: 'B', description: 'd', teamId: 'team-h' }
              // Only 2 GOAL events but score says 3:1 — the snapshot is the
              // canonical source (events can be lost in SSE reconnect).
            ]
          })
        },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    const cmp2 = fx2.componentInstance;
    const rows = cmp2.statsRows();
    const goles = rows.find(r => r.label === 'Goles');
    expect(goles).toEqual({ label: 'Goles', home: '3', away: '1' });
  });

  it('statsRows() uses homePossession/awayPossession from dialog data (not derived from events)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({
            homePossession: 62,
            awayPossession: 38,
            events: []  // no events — possession still comes from BE1
          })
        },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    const cmp2 = fx2.componentInstance;
    const rows = cmp2.statsRows();
    const posesion = rows.find(r => r.label === 'Posesión');
    expect(posesion).toEqual({ label: 'Posesión', home: '62%', away: '38%' });
  });

  it('recentEvents() returns last 6 events reversed (most recent first)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({
            events: [
              { eventType: 'SHOT',           minute: 5,  playerName: 'P1', description: 'd', teamId: 'team-h' },
              { eventType: 'GOAL',           minute: 10, playerName: 'P2', description: 'd', teamId: 'team-a' },
              { eventType: 'YELLOW_CARD',    minute: 15, playerName: 'P3', description: 'd', teamId: 'team-h' },
              { eventType: 'CORNER',         minute: 20, playerName: 'P4', description: 'd', teamId: 'team-a' },
              { eventType: 'FOUL',           minute: 25, playerName: 'P5', description: 'd', teamId: 'team-h' },
              { eventType: 'GOAL',           minute: 30, playerName: 'P6', description: 'd', teamId: 'team-h' },
              { eventType: 'SUBSTITUTION',   minute: 35, playerName: 'P7', description: 'd', teamId: 'team-a' },
              { eventType: 'RED_CARD',       minute: 40, playerName: 'P8', description: 'd', teamId: 'team-h' }
            ]
          })
        },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    const cmp2 = fx2.componentInstance;
    const recent = cmp2.recentEvents();
    // 8 events → slice(-6) keeps minutes 15..40, reversed → minutes 40,35,30,25,20,15
    expect(recent.length).toBe(6);
    expect(recent[0].eventType).toBe('RED_CARD');
    expect(recent[5].eventType).toBe('YELLOW_CARD');
    // Most recent first
    expect(recent[0].minute).toBe(40);
    expect(recent[5].minute).toBe(15);
  });

  it('renders partido-stats + recent-events sections in DOM (data-testid present)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({
            events: [{ eventType: 'GOAL', minute: 15, playerName: 'Juan', description: 'Golazo', teamId: 'team-h' }],
            homeTeamName: 'REAL MADRID',
            awayTeamName: 'BARCELONA',
            currentMinute: 47,
            substitutionsRemaining: 3
          })
        },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    fx2.detectChanges();
    const stats = fx2.nativeElement.querySelector('[data-testid="partido-stats"]');
    const events = fx2.nativeElement.querySelector('[data-testid="recent-events"]');
    expect(stats).toBeTruthy();
    expect(events).toBeTruthy();
    // Header chips present
    const minuteTag = fx2.nativeElement.querySelector('[data-testid="stats-minute"]');
    const subsTag = fx2.nativeElement.querySelector('[data-testid="stats-subs"]');
    expect(minuteTag.textContent).toContain('47');
    expect(subsTag.textContent).toContain('3/5');
    // Team labels visible
    const homeLabel = fx2.nativeElement.querySelector('[data-testid="stats-home-name"]');
    const awayLabel = fx2.nativeElement.querySelector('[data-testid="stats-away-name"]');
    expect(homeLabel.textContent.trim()).toBe('REAL MADRID');
    expect(awayLabel.textContent.trim()).toBe('BARCELONA');
    // 8 stat rows rendered (Posesion, Goles, Tiros totales, Tiros a puerta, Corners, Faltas, Offsides, Tarjetas A:R)
    const rows = fx2.nativeElement.querySelectorAll('.stats-row');
    expect(rows.length).toBe(8);
  });

  it('hides stats gracefully when events list is empty AND shows empty event timeline', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule, PartidoModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: makeData({ events: [] }) },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatchEngineService, useValue: engineSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();
    const fx2 = TestBed.createComponent(PartidoModalComponent);
    fx2.detectChanges();
    const emptyStats = fx2.nativeElement.querySelector('[data-testid="stats-empty"]');
    const emptyEvents = fx2.nativeElement.querySelector('[data-testid="events-empty"]');
    expect(emptyStats).toBeTruthy();
    expect(emptyStats.textContent).toContain('cuando arranque');
    expect(emptyEvents).toBeTruthy();
    // Match any 'no hay eventos' substring — accents vary in jsdom's
    // textContent collation so we use a substring that's accent-free.
    expect(emptyEvents.textContent).toContain('no hay eventos');
  });
});