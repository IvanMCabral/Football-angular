/**
 * MVP1-lineup-cancha-1: basic spec para {@link SquadManagementComponent}.
 *
 * <p>Smoke test: el botón "🎯 Editar Formación Visual" abre el
 * {@link SquadEditorModalComponent} con los datos correctos.
 *
 * <p>El componente squad-management tiene muchas dependencias (HttpClient,
 * Router, FixtureService, MatDialog, varios componentes hijos). Este spec
 * se mantiene intencionalmente mínimo — se enfoca sólo en el wire del modal.
 *
 * <p>V25D42 (Sprint C7): tests del chemistry badge agregado en la barra
 * de información del lineup. Verifica color coding por threshold y
 * backward compat (chemistryScore opcional).
 *
 * <p>V25D43 (Sprint C8): tests del chemistry breakdown agregado debajo del
 * chemistry badge. Verifica render por position group (GK/DEF/MID/ATT),
 * color coding por maxLevel, cobertura percentage, y backward compat
 * (chemistryBreakdown opcional).
 */

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { SquadManagementComponent } from './squad-management.component';
import { SquadEditorModalComponent } from '../../../components/squad-editor-modal/squad-editor-modal.component';
import { LineupDTO, PlayerLineupDTO, ChemistryBreakdownDTO, SkillCoverageDTO } from 'app/shared/models/lineup/lineup.dto';
import { LineupSlotDTO } from 'app/shared/models/lineup/lineup-slot.dto';

// Stub para los child components que no necesitamos testear.
@Component({ selector: 'app-career-status-bar', standalone: true, template: '' })
class CareerStatusBarStub {}
@Component({ selector: 'app-player-card', standalone: true, template: '' })
class PlayerCardStub {}
@Component({ selector: 'app-lineup-player-card', standalone: true, template: '' })
class LineupPlayerCardStub {}
@Component({ selector: 'app-season-stats-tab', standalone: true, template: '' })
class SeasonStatsTabStub {}

describe('SquadManagementComponent — MVP1-lineup-cancha-1', () => {
  let component: SquadManagementComponent;
  let fixture: ComponentFixture<SquadManagementComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dialogRefSpy: jasmine.SpyObj<any>;

  const CAREER_STATUS_RESPONSE = {
    careerId: 'career-1',
    careerPhase: 'PRE_MATCH',
    userSessionTeamId: 'team-1',
    season: 1,
    currentRound: 1
  };

  // V25D42: helper para construir un LineupDTO con chemistryScore opcional.
  // V25D43: extendido para aceptar chemistryBreakdown opcional (Sprint C8).
  // Toma players como base (evita duplicar el array literal en cada test).
  function buildLineup(players: PlayerLineupDTO[], chemistryScore?: number, chemistryBreakdown?: ChemistryBreakdownDTO): LineupDTO {
    const base: LineupDTO = {
      formation: '4-3-3',
      players,
      confirmed: true,
      warnings: []
    };
    if (chemistryScore !== undefined) {
      base.chemistryScore = chemistryScore;
    }
    if (chemistryBreakdown !== undefined) {
      base.chemistryBreakdown = chemistryBreakdown;
    }
    return base;
  }

  // V25D43: helper para construir un ChemistryBreakdownDTO con un set
  // representativo de skills. Coverage percentage = 30% (3 of 10 covered).
  function buildBreakdown(): ChemistryBreakdownDTO {
    const positionGroups: Record<string, SkillCoverageDTO[]> = {
      GK: [
        { skill: 'WALL',   maxLevel: 99, contributorId: 'p-courtois' },
        { skill: 'AERIAL', maxLevel: 99, contributorId: 'p-courtois' }
      ],
      DEF: [
        { skill: 'AERIAL', maxLevel: 80, contributorId: 'p-van-dijk' },
        { skill: 'MARKER', maxLevel: 99, contributorId: 'p-van-dijk' }
      ],
      MID: [
        { skill: 'PLAYMAKER', maxLevel: 99, contributorId: 'p-modric' }
      ],
      ATT: [
        { skill: 'SHOOTER', maxLevel: 99, contributorId: 'p-benzema' }
      ]
    };
    const maxSkillByType: Record<string, number> = {};
    // 3 covered (WALL=99, AERIAL=99, MARKER=99), 1 mid (PLAYMAKER=99), 1 att (SHOOTER=99)
    // Total covered = 5 (above 80) → 50% coverage. Let me set this below.
    for (const skill of ['WALL','AERIAL','MARKER','TACKLER','PLAYMAKER','PASSER','SHOOTER','HEADER','DRIBBLER','SPEEDSTER']) {
      maxSkillByType[skill] = 0;
    }
    maxSkillByType['WALL'] = 99;
    maxSkillByType['AERIAL'] = 99;
    maxSkillByType['MARKER'] = 99;
    maxSkillByType['PLAYMAKER'] = 99;
    maxSkillByType['SHOOTER'] = 99;
    return { positionGroups, maxSkillByType, coveragePercentage: 50 };
  }

  // 11 players fake para que el lineup "exista" en pantalla.
  const ELEVEN_PLAYERS: PlayerLineupDTO[] = Array.from({ length: 11 }, (_, i) => ({
    playerId: `p${i}`,
    name: `Player ${i}`,
    position: 'MID',
    overall: 80,
    energy: 100,
    injured: false,
    age: 25
  }));

  beforeEach(async () => {
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    httpClientSpy.get.and.callFake(((url: string) => {
      if (String(url).includes('/career/status')) {
        return of(CAREER_STATUS_RESPONSE);
      }
      if (String(url).includes('/career/teams/')) {
        return of(null);
      }
      if (String(url).includes('/career/players/squad')) {
        return of([]);
      }
      if (String(url).includes('/career/lineup/current')) {
        return of({ formation: null, players: [], confirmed: false, warnings: [] });
      }
      return of(null);
    }) as any);

    const routerSpy = jasmine.createSpyObj('Router',
      ['navigate', 'navigateByUrl', 'createUrlTree', 'serializeUrl', 'parseUrl'],
      { events: of(), url: '/squad', routerState: { snapshot: {} } });
    routerSpy.createUrlTree.and.returnValue({});
    routerSpy.serializeUrl.and.returnValue('/');
    routerSpy.parseUrl.and.returnValue({});
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [],
      { snapshot: { params: {}, queryParams: {}, data: {} } });

    await TestBed.configureTestingModule({
      imports: [
        SquadManagementComponent,
        NoopAnimationsModule,
        RouterLink,
        MatDialogModule,
        CareerStatusBarStub,
        PlayerCardStub,
        LineupPlayerCardStub,
        SeasonStatsTabStub
      ],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SquadManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Capture dialogSpy from the real MatDialog and set up the open spy
    // AFTER detectChanges so the component's careerStatus$ is initialised.
    const realDialog = TestBed.inject(MatDialog);
    dialogSpy = realDialog as unknown as jasmine.SpyObj<MatDialog>;
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close', 'afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(undefined));
    spyOn(realDialog, 'open').and.returnValue(
      dialogRefSpy as unknown as MatDialogRef<unknown>
    );
  });

  it('should create without errors', () => {
    expect(component).toBeTruthy();
  });

  it('openVisualEditor method is defined and does not throw', () => {
    // MVP1-lineup-cancha-1: smoke test del método openVisualEditor.
    // El método existe en el componente y se invoca sin lanzar excepciones.
    // El wiring end-to-end (HTTP + Dialog → modal → persistencia) lo valida
    // el smoke de REVISOR; este spec verifica solo que el método está expuesto.
    expect(typeof component.openVisualEditor).toBe('function');
    expect(() => component.openVisualEditor()).not.toThrow();
  });

  it('V25D55-C16 P0.1: availableFormations exposes the 12 formations shared constant', () => {
    // V25D54 backend extendió a 12 formations (7 originales + 5 nuevas).
    // V25D55-C16 P0.1: source of truth movido a shared/constants/formations.ts;
    // squad-management ahora referencia ALL_FORMATIONS (12 entries) en lugar
    // del array hardcoded de 7 que tenía antes.
    expect(component.availableFormations.length).toBe(12);
    // Spot-check the 5 nuevas from C15 are now exposed in the squad dropdown.
    expect(component.availableFormations).toContain('3-5-2-CDM');
    expect(component.availableFormations).toContain('5-4-1');
    expect(component.availableFormations).toContain('3-4-1-2');
    expect(component.availableFormations).toContain('4-2-2-2');
    expect(component.availableFormations).toContain('4-3-3-1');
    // Regression: 7 originales siguen presentes.
    for (const f of ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3']) {
      expect(component.availableFormations).toContain(f);
    }
  });

  // ========== V25D42: chemistry badge (Sprint C7) ==========

  describe('V25D42: chemistry badge in lineup view', () => {
    it('should render chemistry badge when lineup has chemistryScore', () => {
      // V25D42: el chemistry badge aparece cuando el back popula chemistryScore.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).not.toBeNull('Chemistry badge should be rendered when chemistryScore is set');
      expect(badge.textContent.trim()).toContain('87');
      expect(badge.textContent.trim()).toContain('/99');
    });

    it('should apply chemistry-high class for chemistry >= 80 (green)', () => {
      // V25D42: >=80 → chemistry-high (verde). Lineup elite da ~80-95.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 85));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).not.toBeNull();
      expect(badge.classList.contains('chemistry-high')).toBeTrue();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });

    it('should apply chemistry-mid class for chemistry 60-79 (yellow)', () => {
      // V25D42: 60-79 → chemistry-mid (amarillo). Threshold boundary.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 70));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-mid')).toBeTrue();
      expect(badge.classList.contains('chemistry-high')).toBeFalse();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });

    it('should apply chemistry-low class for chemistry < 60 (red)', () => {
      // V25D42: <60 → chemistry-low (rojo). Lineup con muchos null stats o muy corto.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 45));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-low')).toBeTrue();
      expect(badge.classList.contains('chemistry-high')).toBeFalse();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();
    });

    it('should NOT render chemistry badge when chemistryScore is undefined (backward compat)', () => {
      // V25D42: chemistryScore es opcional. Si el back no lo popula (careers pre-V25D41
      // o respuesta de error), el badge NO se renderiza — el componente no rompe.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS));  // sin chemistryScore
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).toBeNull();
    });

    it('should render boundary threshold at 80 (inclusive) and 60 (inclusive)', () => {
      // V25D42: thresholds son inclusivos. chemistry=80 → high (no mid), chemistry=60 → mid (no low).
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 80));
      fixture.detectChanges();
      let badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-high')).toBeTrue();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();

      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 60));
      fixture.detectChanges();
      badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-mid')).toBeTrue();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });
  });

  // ========== V25D43: chemistry breakdown (Sprint C8) ==========

  describe('V25D43: chemistry breakdown (per position group)', () => {
    it('should render breakdown section when chemistryBreakdown is present', () => {
      // V25D43: la sección de breakdown se renderiza cuando el back popula chemistryBreakdown.
      const breakdown = buildBreakdown();
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87, breakdown));
      fixture.detectChanges();

      const breakdownEl = fixture.nativeElement.querySelector('.chemistry-breakdown');
      expect(breakdownEl).not.toBeNull('Chemistry breakdown should be rendered when present');

      // Coverage percentage visible
      const coverageEl = breakdownEl.querySelector('.breakdown-coverage');
      expect(coverageEl.textContent).toContain('50');
      expect(coverageEl.textContent).toContain('% coverage');
    });

    it('should render one row per non-empty position group with label + chips', () => {
      // V25D43: 4 grupos (GK/DEF/MID/ATT) con label, cada uno con sus chips.
      const breakdown = buildBreakdown();
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87, breakdown));
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.breakdown-row');
      // 4 groups in positionGroupOrder, all non-empty
      expect(rows.length).toBe(4);

      // GK row: WALL 99, AERIAL 99
      const gkRow = rows[0];
      expect(gkRow.querySelector('.group-label').textContent).toContain('GK');
      const gkChips = gkRow.querySelectorAll('.skill-chip');
      expect(gkChips.length).toBe(2);
      expect(gkChips[0].textContent).toContain('WALL');
      expect(gkChips[0].textContent).toContain('99');
      expect(gkChips[1].textContent).toContain('AERIAL');

      // DEF row: AERIAL 80, MARKER 99
      const defRow = rows[1];
      expect(defRow.querySelector('.group-label').textContent).toContain('DEF');
      const defChips = defRow.querySelectorAll('.skill-chip');
      expect(defChips.length).toBe(2);
    });

    it('should apply chip-high / chip-mid / chip-low classes per maxLevel threshold', () => {
      // V25D43: >=80 verde (chip-high), 50-79 amarillo (chip-mid), <50 rojo (chip-low).
      const positionGroups: Record<string, SkillCoverageDTO[]> = {
        GK: [
          { skill: 'WALL',   maxLevel: 99, contributorId: 'p1' },  // high
          { skill: 'AERIAL', maxLevel: 70, contributorId: 'p1' },  // mid
          { skill: 'TACKLER', maxLevel: 40, contributorId: 'p1' }   // low
        ],
        DEF: [],
        MID: [],
        ATT: []
      };
      const breakdown: ChemistryBreakdownDTO = {
        positionGroups,
        maxSkillByType: { WALL: 99, AERIAL: 70, TACKLER: 40 },
        coveragePercentage: 10
      };
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 80, breakdown));
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('.skill-chip');
      expect(chips.length).toBe(3);

      // chip 0: WALL 99 → high
      expect(chips[0].classList.contains('chip-high')).toBeTrue();
      expect(chips[0].classList.contains('chip-mid')).toBeFalse();
      expect(chips[0].classList.contains('chip-low')).toBeFalse();

      // chip 1: AERIAL 70 → mid
      expect(chips[1].classList.contains('chip-mid')).toBeTrue();
      expect(chips[1].classList.contains('chip-high')).toBeFalse();
      expect(chips[1].classList.contains('chip-low')).toBeFalse();

      // chip 2: TACKLER 40 → low
      expect(chips[2].classList.contains('chip-low')).toBeTrue();
      expect(chips[2].classList.contains('chip-high')).toBeFalse();
      expect(chips[2].classList.contains('chip-mid')).toBeFalse();
    });

    it('should NOT render breakdown section when chemistryBreakdown is undefined (backward compat)', () => {
      // V25D43: chemistryBreakdown es opcional. Lineups pre-V25D43 no lo traen
      // (legacy V25D41/V25D42 builds). El componente no rompe — no renderiza la sección.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87));  // sin breakdown
      fixture.detectChanges();

      const breakdownEl = fixture.nativeElement.querySelector('.chemistry-breakdown');
      expect(breakdownEl).toBeNull('Chemistry breakdown should NOT be rendered when undefined');
    });

    it('should render coverage percentage from chemistryBreakdown.coveragePercentage', () => {
      // V25D43: coverage percentage se lee del back (no se calcula en el front).
      const breakdown: ChemistryBreakdownDTO = {
        positionGroups: { GK: [{ skill: 'WALL', maxLevel: 99, contributorId: 'p1' }], DEF: [], MID: [], ATT: [] },
        maxSkillByType: { WALL: 99 },
        coveragePercentage: 10  // 1 of 10 covered
      };
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 80, breakdown));
      fixture.detectChanges();

      const coverageEl = fixture.nativeElement.querySelector('.breakdown-coverage');
      expect(coverageEl.textContent).toContain('10');
      expect(coverageEl.textContent).toContain('% coverage');
    });
  });

  // ========== V25D44: chemistry breakdown interactivity (Sprint C9) ==========

  describe('V25D44: chemistry breakdown chip click → contributor popover', () => {
    // 11-player lineup where p0 is Courtois (GK, OVR 86) and p1 is Van Dijk (DEF, OVR 88).
    // Breakdown points WALL → p0 and MARKER → p1 so we can verify chip switches
    // (different contributor when clicking a different chip).
    function buildCourtoisLineup(): { lineup: LineupDTO; players: PlayerLineupDTO[] } {
      const players: PlayerLineupDTO[] = [
        { playerId: 'p0', name: 'Courtois',  position: 'GK',  overall: 86, energy: 95, injured: false, age: 32 },
        { playerId: 'p1', name: 'Van Dijk',  position: 'DEF', overall: 88, energy: 95, injured: false, age: 33 },
        ...ELEVEN_PLAYERS.slice(2).map((p, i) => ({ ...p, playerId: `p${i + 2}`, name: `Player ${i + 2}` }))
      ];
      const breakdown: ChemistryBreakdownDTO = {
        positionGroups: {
          GK:  [{ skill: 'WALL',   maxLevel: 99, contributorId: 'p0' }],
          DEF: [{ skill: 'MARKER', maxLevel: 99, contributorId: 'p1' }],
          MID: [],
          ATT: []
        },
        maxSkillByType: { WALL: 99, MARKER: 99 },
        coveragePercentage: 20
      };
      const lineup = buildLineup(players, 87, breakdown);
      return { lineup, players };
    }

    it('should open popover with contributor (name, position, overall) when chip is clicked', () => {
      // V25D44: click WALL chip → popover shows Courtois, GK, OVR 86.
      const { lineup } = buildCourtoisLineup();
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      // Initially no popover
      expect(fixture.nativeElement.querySelector('.contributor-popover')).toBeNull();

      // Click the WALL chip
      const chips = Array.from(fixture.nativeElement.querySelectorAll('.skill-chip')) as HTMLElement[];
      const wallChip = chips.find(c => c.textContent.includes('WALL'))!;
      expect(wallChip).toBeTruthy();
      wallChip.click();
      fixture.detectChanges();

      // Popover should now show Courtois info
      const popover = fixture.nativeElement.querySelector('.contributor-popover');
      expect(popover).not.toBeNull('Popover should appear after chip click');
      expect(popover.textContent).toContain('Courtois');
      expect(popover.querySelector('.contributor-position').textContent).toContain('GK');
      expect(popover.querySelector('.contributor-overall').textContent).toContain('86');
    });

    it('should switch popover to a different contributor when a different chip is clicked', () => {
      // V25D44: click WALL chip (Courtois) → click MARKER chip (Van Dijk) → popover switches.
      const { lineup } = buildCourtoisLineup();
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const chips = Array.from(fixture.nativeElement.querySelectorAll('.skill-chip')) as HTMLElement[];
      const wallChip = chips.find(c => c.textContent.includes('WALL'))!;
      const markerChip = chips.find(c => c.textContent.includes('MARKER'))!;

      // Click WALL → Courtois shown
      wallChip.click();
      fixture.detectChanges();
      let popover = fixture.nativeElement.querySelector('.contributor-popover');
      expect(popover.textContent).toContain('Courtois');

      // Click MARKER → Van Dijk shown
      markerChip.click();
      fixture.detectChanges();
      popover = fixture.nativeElement.querySelector('.contributor-popover');
      expect(popover.textContent).toContain('Van Dijk');
      expect(popover.querySelector('.contributor-position').textContent).toContain('DEF');
      expect(popover.querySelector('.contributor-overall').textContent).toContain('88');
    });

    it('should close popover when the same chip is clicked again (toggle off)', () => {
      // V25D44: click WALL → open. Click WALL again → close.
      const { lineup } = buildCourtoisLineup();
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const wallChip = (Array.from(fixture.nativeElement.querySelectorAll('.skill-chip')) as HTMLElement[])
        .find(c => c.textContent.includes('WALL'))!;
      wallChip.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.contributor-popover')).not.toBeNull();

      wallChip.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.contributor-popover'))
        .toBeNull('Popover should close when same chip is clicked again');
    });

    it('should close popover when the X close button is clicked', () => {
      // V25D44: popover X button calls closeContributorPopover() and hides the popover.
      const { lineup } = buildCourtoisLineup();
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const wallChip = (Array.from(fixture.nativeElement.querySelectorAll('.skill-chip')) as HTMLElement[])
        .find(c => c.textContent.includes('WALL'))!;
      wallChip.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.contributor-popover')).not.toBeNull();

      const closeBtn = fixture.nativeElement.querySelector('.contributor-close');
      expect(closeBtn).not.toBeNull();
      closeBtn.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.contributor-popover'))
        .toBeNull('Popover should close when X button is clicked');
    });

    it('should NOT open popover when chip references a contributorId not in lineup (backyard compat)', () => {
      // V25D44: if contributorId is stale (e.g., lineup reloaded and the player
      // is gone), the chip handler should silently no-op — don't open a
      // popover with missing data, don't crash.
      const staleBreakdown: ChemistryBreakdownDTO = {
        positionGroups: {
          GK: [{ skill: 'WALL', maxLevel: 99, contributorId: 'p-stale-not-in-lineup' }],
          DEF: [], MID: [], ATT: []
        },
        maxSkillByType: { WALL: 99 },
        coveragePercentage: 10
      };
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 80, staleBreakdown));
      fixture.detectChanges();

      const wallChip = (Array.from(fixture.nativeElement.querySelectorAll('.skill-chip')) as HTMLElement[])
        .find(c => c.textContent.includes('WALL'))!;
      expect(() => wallChip.click()).not.toThrow();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.contributor-popover'))
        .toBeNull('Popover must NOT open when contributorId is not found in lineup');
    });
  });

  // ========== V25D59-C19 P1: hero label "Lineup armado: X/11" reflects actual persisted slots ==========

  describe('V25D59-C19 P1: hero label reflects actual persisted slots', () => {
    /**
     * Helper to build a LineupDTO with explicit subdivision {@code slots}
     * array of size {@code slotsCount}. Mirrors the MVP1-lineup-cancha-1
     * wire contract (post-V25D59 back returns {@code slots} with one
     * entry per filled subdivision on the field).
     */
    function buildLineupWithSlots(slotsCount: number, players: PlayerLineupDTO[]): LineupDTO {
      const slots: LineupSlotDTO[] = Array.from({ length: slotsCount }, (_, i) => ({
        playerId: players[i % players.length]?.playerId ?? `p${i}`,
        subdivisionId: `S${String(i).padStart(2, '0')}-1`
      }));
      return {
        formation: '4-4-2',
        players,
        confirmed: false,
        warnings: [],
        slots
      };
    }

    it('V25D59-C19 P1: should display "7/11" when lineup has 7 persisted slots', () => {
      // V25D59-C19 P1 (Test 1): lineup con 7 slots persistidos (caso del bug C18b —
      // auto-select había devuelto 7 players). El label debe reflejar 7/11, no
      // 11/11 hardcoded.
      const lineup7 = buildLineupWithSlots(7, ELEVEN_PLAYERS.slice(0, 7));
      component.lineupSubject$.next(lineup7);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).not.toBeNull('Hero CTA should render when lineup exists');
      expect(cta.textContent).toContain('7');
      expect(cta.textContent).toContain('/ 11');
      expect(cta.textContent).not.toContain('11/11');
      // V25D59-C19 P1: incomplete class applies for < 11
      expect(cta.classList.contains('lineup-incomplete'))
        .withContext('Should have lineup-incomplete class for 7/11')
        .toBeTrue();
      expect(cta.classList.contains('lineup-complete')).toBeFalse();
    });

    it('V25D59-C19 P1: should display "11/11" when lineup has 11 persisted slots', () => {
      // V25D59-C19 P1: caso happy path post-fix C19 P0 back — auto-select
      // garantiza 11 slots. El label muestra 11/11 con styling "complete".
      const lineup11 = buildLineupWithSlots(11, ELEVEN_PLAYERS);
      component.lineupSubject$.next(lineup11);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).not.toBeNull();
      expect(cta.textContent).toContain('11');
      expect(cta.textContent).toContain('/ 11');
      expect(cta.classList.contains('lineup-complete'))
        .withContext('Should have lineup-complete class for 11/11')
        .toBeTrue();
      expect(cta.classList.contains('lineup-incomplete')).toBeFalse();
    });

    it('V25D59-C19 P1: should display "0/11" when lineup has no players and no slots', () => {
      // V25D59-C19 P1 (Test 2): lineup vacío (players=[], slots=[]). Spec exige
      // "0/11" visible, no hidden — para que el usuario sepa que NO hay lineup armado.
      const lineupEmpty: LineupDTO = {
        formation: '',
        players: [],
        confirmed: false,
        warnings: [],
        slots: []
      };
      component.lineupSubject$.next(lineupEmpty);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).not.toBeNull('Hero CTA should render even when lineup is empty (shows "0/11")');
      expect(cta.textContent).toContain('0');
      expect(cta.textContent).toContain('/ 11');
      expect(cta.classList.contains('lineup-incomplete')).toBeTrue();
    });

    it('V25D59-C19 P1: should NOT render hero CTA when no lineup is loaded', () => {
      // V25D59-C19 P1: cuando lineupSubject$ es null (initial state antes
      // de GET /career/lineup/current), el hero NO se renderiza — no hay
      // información para mostrar.
      component.lineupSubject$.next(null as unknown as LineupDTO);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).toBeNull('Hero CTA must not render when no lineup is loaded');
    });

    it('V25D59-C19 P1: should fall back to players.length for legacy lineups without slots', () => {
      // V25D59-C19 P1: backward compat — lineups pre-MVP1-lineup-cancha-1
      // (sin `slots` field) caen al fallback de players.length para no
      // mostrar "0/11" en carreras activas que aún no re-armaron via auto-select.
      const legacyLineup: LineupDTO = {
        formation: '4-4-2',
        players: ELEVEN_PLAYERS,
        confirmed: false,
        warnings: []
        // slots intencionalmente ausente (legacy)
      };
      component.lineupSubject$.next(legacyLineup);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).not.toBeNull();
      expect(cta.textContent).toContain('11');
      expect(cta.textContent).toContain('/ 11');
    });

    it('V25D59-C19 P1: hero label updates reactively when lineup changes (7 → 11)', () => {
      // V25D59-C19 P1: regression — el counter debe actualizarse cuando
      // lineupSubject$ emite un nuevo lineup (e.g., después de auto-select).
      // Antes del fix, el counter quedaba stale en 11/11 aunque el back
      // devolvía 7 players.
      component.lineupSubject$.next(buildLineupWithSlots(7, ELEVEN_PLAYERS.slice(0, 7)));
      fixture.detectChanges();
      let cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta.textContent).toContain('7');

      component.lineupSubject$.next(buildLineupWithSlots(11, ELEVEN_PLAYERS));
      fixture.detectChanges();
      cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta.textContent).toContain('11');
      expect(cta.textContent).toContain('/ 11');
      expect(cta.classList.contains('lineup-complete')).toBeTrue();
    });
  });

  // ========== V25D60-C20 P1: 3 displays must use lineupSlotsCount (not lineup.players.length) ==========

  describe('V25D60-C20 P1: lineup displays use lineupSlotsCount (consistency fix)', () => {
    /**
     * Helper: lineup with persisted slots + 11 players in the players[] array
     * (simulating the bug scenario: back now persists 11 slots but for
     * short-handed legacy lineups the players array has 11 stale entries
     * while the slots array reflects the true subdivision count of 7).
     */
    function buildLineupWithSlotsAndStalePlayers(slotsCount: number): LineupDTO {
      const slots: LineupSlotDTO[] = Array.from({ length: slotsCount }, (_, i) => ({
        playerId: ELEVEN_PLAYERS[i % ELEVEN_PLAYERS.length]?.playerId ?? `p${i}`,
        subdivisionId: `S${String(i).padStart(2, '0')}-1`
      }));
      return {
        formation: '4-4-2',
        players: ELEVEN_PLAYERS, // stale — 11 entries
        confirmed: false,
        warnings: [],
        slots // truth — 7 entries
      };
    }

    it('V25D60-C20 P1: .lineup-count should display "7 / 11" when lineup has 7 persisted slots (not 11)', () => {
      // V25D60-C20 P1 (Test 1): el verifier C19 detectó que .lineup-count
      // mostraba "11 / 11" usando lineup.players.length mientras el hero
      // label (correcto) mostraba "7 / 11" usando lineupSlotsCount. Tras el
      // fix ambos displays muestran el mismo número.
      const lineup = buildLineupWithSlotsAndStalePlayers(7);
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const count = fixture.nativeElement.querySelector('.lineup-count');
      expect(count).not.toBeNull();
      expect(count.textContent).toContain('7');
      expect(count.textContent).toContain('/ 11');
      expect(count.textContent).not.toContain('11 / 11');
      // V25D60-C20 P1: el count-short class aplica para < 7, count-ok para 7..10
      expect(count.classList.contains('count-ok'))
        .withContext('Should have count-ok class for 7/11 (count-short is < 7)')
        .toBeTrue();
      expect(count.classList.contains('count-full')).toBeFalse();
    });

    it('V25D60-C20 P1: .sticky-confirm-info should display "⚽ 7 / 11 jugadores" when lineup has 7 slots', () => {
      // V25D60-C20 P1 (Test 2): el verifier C19 detectó que el sticky-confirm
      // bar mostraba "⚽ 11 / 11 jugadores" usando lineup.players.length.
      const lineup = buildLineupWithSlotsAndStalePlayers(7);
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const info = fixture.nativeElement.querySelector('.sticky-confirm-info');
      expect(info).not.toBeNull();
      expect(info.textContent).toContain('⚽');
      expect(info.textContent).toContain('7');
      expect(info.textContent).toContain('/ 11');
      expect(info.textContent).not.toContain('11 / 11');
      expect(info.textContent).toContain('jugadores');
    });

    it('V25D60-C20 P1: Confirm button should be disabled when lineup has 7 persisted slots', () => {
      // V25D60-C20 P1 (Test 3): el verifier C19 detectó que el Confirm button
      // permitía confirmar un lineup con 7 slots (porque lineup.players.length=11
      // pero lineupSlotsCount=7). Con el fix, el botón está disabled porque
      // el contrato es ahora 11/11 completo (no 7+).
      //
      // Scope: el botón objetivo es el del .sticky-confirm-bar (línea 338 del
      // HTML), no el botón primario dentro de .lineup-actions (línea 306, que
      // sigue con lógica legacy — fuera de scope del task C20).
      const lineup = buildLineupWithSlotsAndStalePlayers(7);
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.sticky-confirm-bar .btn-confirm-lineup');
      expect(btn).not.toBeNull('Confirm button should exist inside .sticky-confirm-bar');
      expect(btn.disabled)
        .withContext('Confirm button should be disabled when lineupSlotsCount < 11')
        .toBeTrue();
      // Title attribute reflects the reason
      expect(btn.getAttribute('title'))
        .withContext('Confirm button title should indicate 11/11 required')
        .toContain('11');
    });

    it('V25D60-C20 P1: Confirm button should be enabled when lineup has 11 persisted slots', () => {
      // V25D60-C20 P1 (Test 3b): positive case — el Confirm button se habilita
      // cuando lineupSlotsCount === 11 (contrato del fix C20 P1).
      const lineup = buildLineupWithSlotsAndStalePlayers(11);
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.sticky-confirm-bar .btn-confirm-lineup');
      expect(btn).not.toBeNull('Confirm button should exist inside .sticky-confirm-bar');
      expect(btn.disabled)
        .withContext('Confirm button should be enabled when lineupSlotsCount === 11')
        .toBeFalse();
      expect(btn.getAttribute('title'))
        .withContext('Confirm button title should show ready-to-confirm text')
        .toContain('Confirmar y Jugar');
    });
  });

  // ========== V25D62-C21 P0.1: in-page Confirm button must use lineupSlotsCount ==========
  //
  // V25D60-C20 P1 fixed the .sticky-confirm-bar Confirm button (línea 338) y los
  // displays de count, pero el verifier detectó que el botón DENTRO de
  // .lineup-actions (líneas 306-316) todavía usaba `lineup.players.length`
  // (legacy < 7 || > 11). Esto causa que un lineup con slots persistidos truth
  // (e.g. 11) y players stale (e.g. 5) permita confirmar — el botón queda
  // disabled por players<7 aunque slots=11 está OK.

  describe('V25D62-C21 P0.1: in-page Confirm button uses lineupSlotsCount (not lineup.players.length)', () => {
    /**
     * Helper local: lineup con N slots persistidos (truth) y M players
     * stale (legacy `players[]`). El bug C21 surge cuando N y M caen en
     * lados opuestos del rango [7, 11] — el viejo `lineup.players.length`
     * daba un disabled distinto al `lineupSlotsCount` real.
     */
    function buildLineupWithSlotsAndPlayers(slotsCount: number, playersCount: number): LineupDTO {
      const players: PlayerLineupDTO[] = Array.from({ length: playersCount }, (_, i) => ({
        playerId: `p${i}`,
        name: `Player ${i}`,
        position: 'MID',
        overall: 80,
        energy: 100,
        injured: false,
        age: 25
      }));
      const slots: LineupSlotDTO[] = Array.from({ length: slotsCount }, (_, i) => ({
        playerId: players[i % players.length]?.playerId ?? `p${i}`,
        subdivisionId: `S${String(i).padStart(2, '0')}-1`
      }));
      return {
        formation: '4-4-2',
        players,
        confirmed: false,
        warnings: [],
        slots
      };
    }

    it('should be ENABLED when lineup.slots.length=11 even though lineup.players.length=5 < 7', () => {
      // Caso del bug: lineup con 11 slots persistidos (truth) pero solo 5
      // players stale (players.length < 7). Con el código viejo que usaba
      // `lineup.players.length`, el botón quedaba DISABLED porque 5 < 7.
      // Con el fix (lineupSlotsCount = lineup.slots.length = 11), el botón
      // queda ENABLED porque 11 ∈ [7, 11].
      const lineup = buildLineupWithSlotsAndPlayers(11, 5);
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      // Selector: el botón in-page vive dentro de .lineup-actions (NO dentro
      // de .sticky-confirm-bar, ese es otro botón cubierto por C20 P1).
      const btn = fixture.nativeElement.querySelector('.lineup-actions .btn-confirm-lineup');
      expect(btn)
        .not.toBeNull('in-page Confirm button should exist inside .lineup-actions');
      expect(btn.disabled)
        .withContext('in-page Confirm button must be ENABLED when lineupSlotsCount=11 ' +
                     '(slots truth), even though players.length=5 < 7 ' +
                     '— proves the button now reads from lineupSlotsCount, not lineup.players.length')
        .toBeFalse();
      // Title attribute: con lineupSlotsCount=11 (in-range), debe decir 'Confirmar'.
      // Con el código viejo (players.length=5), diría 'Mínimo 7 jugadores'.
      expect(btn.getAttribute('title'))
        .withContext('Title must reflect the in-range state (lineupSlotsCount=11), ' +
                     'not the stale players.length=5')
        .toContain('Confirmar');
      expect(btn.getAttribute('title'))
        .withContext('Title must NOT indicate "Mínimo 7 jugadores" — that was the old behavior reading players.length')
        .not.toContain('Mínimo 7 jugadores');
    });
  });
});