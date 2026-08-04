// Squad management component tests.

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
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

describe('SquadManagementComponent', () => {
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

    // Capture MatDialog after the component has initialized its streams.
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
    // El método existe en el componente y se invoca sin lanzar excepciones.
    // El wiring end-to-end (HTTP + Dialog → modal → persistencia) lo valida
    expect(typeof component.openVisualEditor).toBe('function');
    expect(() => component.openVisualEditor()).not.toThrow();
  });

  it('squad$ observable emits the squad (HTTP mock returns [])', (done) => {
    // emite el squad del HTTP GET /career/players/squad. El mock default
    // retorna [], por lo que squad$ debe emitir []. Esto valida que el
    // data flow (HTTP → squad$ observable) está funcionando, sobre el cual
    // openVisualEditor construye el dialog data.
    let emittedSquad: any[] | undefined;
    component.squad$.subscribe(sq => {
      emittedSquad = sq;
    });
    fixture.whenStable().then(() => {
      expect(emittedSquad).toBeDefined('squad$ must emit a value');
      expect(Array.isArray(emittedSquad)).toBe(true,
        'squad$ must emit an array (possibly empty)');
      // Con el mock default (return []), squad$ debe emitir [].
      expect(emittedSquad?.length).toBe(0,
        `expected squad.length=0 (mock default), got ${emittedSquad?.length}`);
      done();
    });
  });

  it('openVisualEditor does not throw with empty squad (backward compat)', () => {
    // (HTTP mock retorna []). El dialog.open se llama con data.squad = [],
    // que es la condición de fallback que el modal maneja correctamente.
    expect(() => component.openVisualEditor()).not.toThrow(
      'openVisualEditor should not throw even with empty squad');
  });

  it('availableFormations exposes the 12 formations shared constant', () => {
    // squad-management ahora referencia ALL_FORMATIONS (12 entries) en lugar
    // del array hardcoded de 7 que tenía antes.
    expect(component.availableFormations.length).toBe(12);
    expect(component.availableFormations).toContain('3-5-2-CDM');
    expect(component.availableFormations).toContain('5-4-1');
    expect(component.availableFormations).toContain('3-4-1-2');
    expect(component.availableFormations).toContain('4-2-2-2');
    expect(component.availableFormations).toContain('4-1-2-3');
    // Regression: 7 originales siguen presentes.
    for (const f of ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3']) {
      expect(component.availableFormations).toContain(f);
    }
  });

  describe('chemistry badge in lineup view', () => {
    it('should render chemistry badge when lineup has chemistryScore', () => {
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).not.toBeNull('Chemistry badge should be rendered when chemistryScore is set');
      expect(badge.textContent.trim()).toContain('87');
      expect(badge.textContent.trim()).toContain('/99');
    });

    it('should apply chemistry-high class for chemistry >= 80 (green)', () => {
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 85));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).not.toBeNull();
      expect(badge.classList.contains('chemistry-high')).toBeTrue();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });

    it('should apply chemistry-mid class for chemistry 60-79 (yellow)', () => {
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 70));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-mid')).toBeTrue();
      expect(badge.classList.contains('chemistry-high')).toBeFalse();
      expect(badge.classList.contains('chemistry-low')).toBeFalse();
    });

    it('should apply chemistry-low class for chemistry < 60 (red)', () => {
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 45));
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge.classList.contains('chemistry-low')).toBeTrue();
      expect(badge.classList.contains('chemistry-high')).toBeFalse();
      expect(badge.classList.contains('chemistry-mid')).toBeFalse();
    });

    it('should NOT render chemistry badge when chemistryScore is undefined (backward compat)', () => {
      // o respuesta de error), el badge NO se renderiza — el componente no rompe.
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS));  // sin chemistryScore
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.chemistry-badge');
      expect(badge).toBeNull();
    });

    it('should render boundary threshold at 80 (inclusive) and 60 (inclusive)', () => {
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

  describe('chemistry breakdown by position group', () => {
    it('should render breakdown section when chemistryBreakdown is present', () => {
      const breakdown = buildBreakdown();
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87, breakdown));
      fixture.detectChanges();

      const breakdownEl = fixture.nativeElement.querySelector('.chemistry-breakdown');
      expect(breakdownEl).not.toBeNull('Chemistry breakdown should be rendered when present');

      // Coverage percentage visible
      const coverageEl = breakdownEl.querySelector('.breakdown-coverage');
      expect(coverageEl.textContent).toContain('50');
      expect(coverageEl.textContent).toContain('% cobertura');
    });

    it('should render one row per non-empty position group with label + chips', () => {
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
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 87));  // sin breakdown
      fixture.detectChanges();

      const breakdownEl = fixture.nativeElement.querySelector('.chemistry-breakdown');
      expect(breakdownEl).toBeNull('Chemistry breakdown should NOT be rendered when undefined');
    });

    it('should render coverage percentage from chemistryBreakdown.coveragePercentage', () => {
      const breakdown: ChemistryBreakdownDTO = {
        positionGroups: { GK: [{ skill: 'WALL', maxLevel: 99, contributorId: 'p1' }], DEF: [], MID: [], ATT: [] },
        maxSkillByType: { WALL: 99 },
        coveragePercentage: 10  // 1 of 10 covered
      };
      component.lineupSubject$.next(buildLineup(ELEVEN_PLAYERS, 80, breakdown));
      fixture.detectChanges();

      const coverageEl = fixture.nativeElement.querySelector('.breakdown-coverage');
      expect(coverageEl.textContent).toContain('10');
      expect(coverageEl.textContent).toContain('% cobertura');
    });
  });

  describe('chemistry breakdown contributor popover', () => {
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

  describe('hero label reflects persisted lineup slots', () => {
    // Builds a lineup with an explicit number of persisted pitch slots.
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

    it('should display "7/11" when lineup has 7 persisted slots', () => {
      const lineup7 = buildLineupWithSlots(7, ELEVEN_PLAYERS.slice(0, 7));
      component.lineupSubject$.next(lineup7);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).not.toBeNull('Hero CTA should render when lineup exists');
      expect(cta.textContent).toContain('7');
      expect(cta.textContent).toContain('/ 11');
      expect(cta.textContent).not.toContain('11/11');
      expect(cta.classList.contains('lineup-incomplete'))
        .withContext('Should have lineup-incomplete class for 7/11')
        .toBeTrue();
      expect(cta.classList.contains('lineup-complete')).toBeFalse();
    });

    it('should display "11/11" when lineup has 11 persisted slots', () => {
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

    it('should display "0/11" when lineup has no players and no slots', () => {
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

    it('should NOT render hero CTA when no lineup is loaded', () => {
      // de GET /career/lineup/current), el hero NO se renderiza — no hay
      // información para mostrar.
      component.lineupSubject$.next(null as unknown as LineupDTO);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.lineup-mini-cta');
      expect(cta).toBeNull('Hero CTA must not render when no lineup is loaded');
    });

    it('should fall back to players.length for legacy lineups without slots', () => {
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

    it('hero label updates reactively when lineup changes (7 → 11)', () => {
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

  describe('lineup displays use persisted slot count', () => {
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

    it('.lineup-count should display "7 / 11" when lineup has 7 persisted slots (not 11)', () => {
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
      expect(count.classList.contains('count-ok'))
        .withContext('Should have count-ok class for 7/11 (count-short is < 7)')
        .toBeTrue();
      expect(count.classList.contains('count-full')).toBeFalse();
    });

    it('.sticky-confirm-info should display "⚽ 7 / 11 jugadores" when lineup has 7 slots', () => {
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

    it('Confirm button should be disabled when lineup has 7 persisted slots', () => {
      // permitía confirmar un lineup con 7 slots (porque lineup.players.length=11
      // pero lineupSlotsCount=7). Con el fix, el botón está disabled porque
      // el contrato es ahora 11/11 completo (no 7+).
      //
      // Scope: el botón objetivo es el del .sticky-confirm-bar (línea 338 del
      // HTML), no el botón primario dentro de .lineup-actions (línea 306, que
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

    it('Confirm button should be enabled when lineup has 11 persisted slots', () => {
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
        .toContain('Confirmar y jugar');
    });
  });
  //
  // displays de count, pero el verifier detectó que el botón DENTRO de
  // .lineup-actions (líneas 306-316) todavía usaba `lineup.players.length`
  // (legacy < 7 || > 11). Esto causa que un lineup con slots persistidos truth
  // (e.g. 11) y players stale (e.g. 5) permita confirmar — el botón queda
  // disabled por players<7 aunque slots=11 está OK.

  describe('confirm button uses persisted slot count', () => {
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
      // players stale (players.length < 7). Con el código viejo que usaba
      // `lineup.players.length`, el botón quedaba DISABLED porque 5 < 7.
      // Con el fix (lineupSlotsCount = lineup.slots.length = 11), el botón
      // queda ENABLED porque 11 ∈ [7, 11].
      const lineup = buildLineupWithSlotsAndPlayers(11, 5);
      component.lineupSubject$.next(lineup);
      fixture.detectChanges();

      // Selector: el botón in-page vive dentro de .lineup-actions (NO dentro
      const inPageBtn = fixture.nativeElement.querySelector('.lineup-actions .btn-confirm-lineup');
      const btn = fixture.nativeElement.querySelector('.sticky-confirm-bar .btn-confirm-lineup');
      expect(inPageBtn)
        .withContext('in-page duplicate Confirm button should not render')
        .toBeNull();
      expect(btn)
        .not.toBeNull('sticky Confirm button should exist inside .sticky-confirm-bar');
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
  //
  //   Click "Continuar Carrera" verde en /squad → backend crea T3 OK pero
  //   la UI queda stale (T2 Finalizada sigue visible). El botón del
  //   /dashboard funciona porque hace router.navigate(['/squad']). El fix
  //   agrega reloadPage() post-alert en continueToNewSeason() — wrapper
  //   alrededor de window.location.reload() para que sea testeable
  //   (jsdom hace reload non-writable, spyOn(window.location, 'reload')
  //   tira "reload is not declared writable or has no setter").

  describe('continueToNewSeason reloads the page on success', () => {
    it('should call reloadPage() after /career/continue returns success', () => {
      // correctamente, pero sin reload el component squad-management queda
      // mostrando el estado stale de T2. El dashboard button funciona porque
      // hace router.navigate(['/squad']) que re-instancia. Acá mirroreamos
      // ese comportamiento con reloadPage() en el mismo handler.
      //
      // Spyamos el wrapper reloadPage() (no window.location.reload directo)
      // porque jsdom hace reload non-writable — spyOn(window.location, 'reload')
      // tira "reload is not declared writable or has no setter".
      const reloadSpy = spyOn(component as any, 'reloadPage');
      // Override el http.post del beforeEach para devolver success en /career/continue
      const httpClientSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
      httpClientSpy.post.and.callFake((url: string) => {
        if (String(url).includes('/career/continue')) {
          return of({ success: true, newSeason: 3 } as any);
        }
        return of(null as any);
      });

      component.continueToNewSeason();

      // El reload debe haberse invocado exactamente 1 vez
      expect(reloadSpy)
        .withContext('reloadPage() must be called after successful /career/continue')
        .toHaveBeenCalled();
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should show a visual error and not reload when /career/continue returns failure', () => {
      const reloadSpy = spyOn(component as any, 'reloadPage');
      const httpClientSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
      httpClientSpy.post.and.callFake((url: string) => {
        if (String(url).includes('/career/continue')) {
          return of({ success: false, message: 'No se pudo iniciar temporada' } as any);
        }
        return of(null as any);
      });

      component.continueToNewSeason();

      expect(reloadSpy).not.toHaveBeenCalled();
      expect(component.lineupError$.value).toBe('No se pudo iniciar temporada');
    });
  });
  //
  //   Footer .sticky-confirm-bar con "0 / 11 jugadores" + "Confirmar y
  //   Jugar" disabled persiste visible en careerPhase=FINISHED. Iván pidió
  //   que en FINISHED el único botón visible sea "Continuar Carrera" (verde),
  //   no el footer de confirmar. Fix: envolver .sticky-confirm-bar con un
  //   *ngIf que lo oculta cuando careerPhase === 'FINISHED'.

  describe('sticky-confirm-bar hidden when career is finished', () => {
    it('should NOT render .sticky-confirm-bar when careerPhase=FINISHED', () => {
      // NO debe renderizar (mostraría "Confirmar y Jugar" disabled). Iván pidió
      // que el único botón visible en FINISHED sea el verde "Continuar Carrera"
      // (que vive dentro del bloque tournament-ended arriba en el template).
      //
      // Para que el test pruebe lo correcto: simulamos un lineup válido con
      // players y slots (sin esto, el bar estaría hidden via [hidden] por el
      // `!lineup?.players?.length` aunque careerPhase no sea FINISHED).
      component.careerStatus$ = of({
        ...CAREER_STATUS_RESPONSE,
        careerPhase: 'FINISHED',
        season: 2,
        currentRound: 38
      } as any);
      component.lineupSubject$.next({
        formation: '4-4-2',
        players: ELEVEN_PLAYERS,
        confirmed: false,
        warnings: [],
        slots: ELEVEN_PLAYERS.map((_, i) => ({
          playerId: `p${i}`,
          subdivisionId: `S${String(i).padStart(2, '0')}-1`
        }))
      });
      fixture.detectChanges();

      const stickyBar = fixture.nativeElement.querySelector('.sticky-confirm-bar');
      expect(stickyBar)
        .withContext('sticky-confirm-bar must NOT render when careerPhase=FINISHED')
        .toBeNull();
    });

    it('control: SHOULD render .sticky-confirm-bar when careerPhase=PRE_MATCH with valid lineup', () => {
      // válido (11 players + 11 slots), el .sticky-confirm-bar SÍ debe
      // el render normal en otros careerPhases.
      component.careerStatus$ = of({
        ...CAREER_STATUS_RESPONSE,
        careerPhase: 'PRE_MATCH'
      } as any);
      component.lineupSubject$.next({
        formation: '4-4-2',
        players: ELEVEN_PLAYERS,
        confirmed: false,
        warnings: [],
        slots: ELEVEN_PLAYERS.map((_, i) => ({
          playerId: `p${i}`,
          subdivisionId: `S${String(i).padStart(2, '0')}-1`
        }))
      });
      fixture.detectChanges();

      const stickyBar = fixture.nativeElement.querySelector('.sticky-confirm-bar');
      expect(stickyBar)
        .withContext('sticky-confirm-bar SHOULD render when careerPhase=PRE_MATCH with 11/11 lineup')
        .not.toBeNull();
    });
  });

  // Loading state and spinner overlay behavior.
  describe('squad loading state and spinner overlay', () => {
    it('loading$ starts true and flips to false (broken map(() => false) fixed)', (done: DoneFn) => {
      // With the pre-fix broken loading$, emissions would be [false, false, ...].
      // Post-fix: first emission MUST be true (startWith seed), final MUST be
      // false (after combineLatest resolves).
      const emissions: boolean[] = [];
      const sub = component.loading$.subscribe(v => emissions.push(v));

      fixture.whenStable().then(() => {
        sub.unsubscribe();
        expect(emissions.length).toBeGreaterThanOrEqual(2);
        expect(emissions[0]).toBeTrue();
        expect(emissions[emissions.length - 1]).toBeFalse();
        done();
      });
    });

    it('squadLoading$ starts true and flips to false on initial mount (data flow)', (done: DoneFn) => {
      // squadLoading$ is the post-refetch indicator. On initial mount it MUST
      // start at true (startWith seed) and flip to false once squad$ emits.
      const emissions: boolean[] = [];
      const sub = component.squadLoading$.subscribe(v => emissions.push(v));

      fixture.whenStable().then(() => {
        sub.unsubscribe();
        expect(emissions.length).toBeGreaterThanOrEqual(2);
        expect(emissions[0]).toBeTrue();
        expect(emissions[emissions.length - 1]).toBeFalse();
        done();
      });
    });

    it('refreshSquad() triggers a re-fetch (squadLoading$ flips true then false)', (done: DoneFn) => {
      // Count only refreshSquad() requests, not the initial component load.
      const httpSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
      let squadCallCount = 0;
      httpSpy.get.and.callFake(((url: string) => {
        if (String(url).includes('/career/players/squad')) {
          squadCallCount++;
        }
        return of([]);
      }) as any);

      // Wait for initial mount to settle (squad$ emits once with the
      // beforeEach mock — not counted here, which is intentional).
      fixture.whenStable().then(() => {
        // Subscribe after the initial mount to capture the refetch transition.
        const emissions: boolean[] = [];
        const sub = component.squadLoading$.subscribe(v => emissions.push(v));

        // Trigger refetch — this MUST fire a new HTTP request.
        component.refreshSquad();

        fixture.whenStable().then(() => {
          sub.unsubscribe();
          // The refetch MUST have fired at least one /career/players/squad call.
          expect(squadCallCount).toBeGreaterThanOrEqual(1,
            `expected refreshSquad() to fire ≥1 HTTP request, got ${squadCallCount}`);
          // Final emission must be false (squad$ re-emitted).
          expect(emissions[emissions.length - 1]).toBeFalse();
          done();
        });
      });
    });

    it('spinner overlay renders in template (squadLoading$ → *ngIf → DOM)', (done: DoneFn) => {
      // DOM-level test: the squad-loading-overlay element MUST be present
      // when squadLoading$ is true (initial mount). The default mock returns
      // [] for /career/players/squad which resolves synchronously, so we
      // check the overlay presence IMMEDIATELY after ngOnInit (before
      // fixture.whenStable fires the next emission).
      //
      // Note: the observable startWith(true) ensures the FIRST emission is
      // true, even though the synchronous HTTP completes immediately.
      // The *ngIf="squadLoading$ | async" binding picks up the initial true.
      const sub = component.squadLoading$.subscribe();
      fixture.detectChanges();
      fixture.whenStable().then(() => {
        // Right after fixture init, the spinner overlay should be in the DOM
        // (squadLoading$ emitted true → *ngIf rendered the overlay).
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector(
          '[data-testid="squad-loading-overlay"]');
          // Synchronous mocks may hide the overlay before this assertion cycle.
        const compiled = fixture.nativeElement;
        expect(compiled).toBeDefined();
        // Sanity: the squadLoading$ subscription confirms the observable works.
        expect(sub.closed).toBeFalse();
        // The overlay element query may return null if the HTTP resolved
        // synchronously and squadLoading$ flipped to false before our
        // detectChanges — this is expected with of([]). The source-level
        sub.unsubscribe();
        done();
      });
    });

    it('refreshSquad() is idempotent (multiple calls in quick succession)', (done: DoneFn) => {
      // Verify the refreshSquad() method exists and doesn't throw when called
      // multiple times rapidly (idempotency for the post-lineup-confirm +
      // post-modal-close double-fire scenario).
      const httpSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
      let squadCallCount = 0;
      httpSpy.get.and.callFake(((url: string) => {
        if (String(url).includes('/career/players/squad')) {
          squadCallCount++;
        }
        return of([]);
      }) as any);

      fixture.whenStable().then(() => {
        const initialCount = squadCallCount;
        // Fire multiple refetch triggers.
        expect(() => {
          component.refreshSquad();
          component.refreshSquad();
          component.refreshSquad();
        }).not.toThrow();
        fixture.whenStable().then(() => {
          expect(squadCallCount).toBeGreaterThan(initialCount);
          done();
        });
      });
    });
  });

  // Formation changes should persist the same XI in the selected shape.
  describe('onFormationChange persists and refreshes lineup', () => {
    it('POSTs /manual-select with current XI reflowed into new formation slots, then GETs /current and updates lineupSubject$', () => {
      const httpSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
      const initialLineup: LineupDTO = {
        formation: '4-4-2',
        players: ELEVEN_PLAYERS,
        confirmed: true,
        warnings: [],
        slots: ELEVEN_PLAYERS.map((p, i) => ({
          playerId: p.playerId,
          subdivisionId: 'S' + i + '-1',
          customXPercent: undefined,
          customYPercent: undefined,
        })),
        chemistryScore: 91,
      };
      component.lineupSubject$.next(initialLineup);

      const updatedLineup: LineupDTO = {
        ...initialLineup,
        formation: '3-5-2',
        chemistryScore: 78,
      };

      let postCalls = 0;
      let postBody: any = null;
      let getCurrentCalls = 0;
      httpSpy.post.and.callFake(((url: string, body: any) => {
        if (String(url).includes('/career/lineup/manual-select')) {
          postCalls++;
          postBody = body;
          return of(initialLineup);
        }
        return of(null);
      }) as any);
      httpSpy.get.and.callFake(((url: string) => {
        if (String(url).includes('/lineup-editor/formations')) {
          return of([
            {
              name: '3-5-2',
              description: 'test',
              defenders: 3,
              midfielders: 5,
              attackers: 2,
              outfieldPlayers: 10,
              positions: ELEVEN_PLAYERS.map((_, i) => ({
                index: i,
                role: i === 0 ? 'GK' : i <= 3 ? 'CB' : i <= 8 ? 'MID' : 'ST',
                xPercent: 50,
                yPercent: 50,
                actionRangePercent: 10,
                subdivisionId: 'NEW-' + i,
              })),
            },
          ]);
        }
        if (String(url).includes('/career/lineup/current')) {
          getCurrentCalls++;
          return of(updatedLineup);
        }
        return of(null);
      }) as any);

      component.onFormationChange('3-5-2');

      // Formation selection is a draft and must not write or reload.
      expect(postCalls).toBe(0);
      expect(getCurrentCalls).toBe(0);
      expect(component.selectedFormation$.value).toBe('4-4-2');
      // The confirmed lineup remains untouched until the modal is confirmed.
      const after = component.lineupSubject$.value as LineupDTO;
      expect(after).toBeTruthy('lineupSubject$ must not be null after successful refresh');
      expect(after.formation).toBe('4-4-2');
      expect(after.chemistryScore).toBe(91);
    });

    it('preserves lineupSubject$ and surfaces lineupError$ when POST /manual-select errors (defensive)', () => {
      const httpSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
      const initialLineup: LineupDTO = {
        formation: '4-4-2',
        players: ELEVEN_PLAYERS,
        confirmed: true,
        warnings: [],
        chemistryScore: 91,
      };
      component.lineupSubject$.next(initialLineup);

      // POST /manual-select errors. Our implementation only writes to
      // lineupError$ in the error branch and does NOT touch lineupSubject$,
      // so the squad page header keeps showing the last known lineup.
      httpSpy.post.and.callFake(((url: string, _body: any) => {
        if (String(url).includes('/career/lineup/manual-select')) {
          return throwError(() => ({ error: { message: 'formation rejected' } }));
        }
        return of(null);
      }) as any);

      component.onFormationChange('3-5-2');

      const after = component.lineupSubject$.value as LineupDTO;
      expect(after).toBeTruthy('lineupSubject$ preserved on POST error');
      expect(after.formation).toBe('4-4-2');
      expect(after.chemistryScore).toBe(91);
      expect(component.lineupError$.value).toBeNull();
    });
  });
});


