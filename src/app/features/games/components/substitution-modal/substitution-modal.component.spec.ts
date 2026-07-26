// Unit tests for the live substitution modal.

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

describe('SubstitutionModalComponent', () => {
  let component: SubstitutionModalComponent;
  let fixture: ComponentFixture<SubstitutionModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SubstitutionModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    spyOn(console, 'error').and.stub();
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['substitutePlayer', 'changeFormation']);
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

  it('confirm calls substitutePlayer with ids and lets backend use the live minute', () => {
    engineServiceSpy.substitutePlayer.and.returnValue(of({
      success: true, minuteApplied: 35, substitutionsRemaining: 2
    }));
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.confirm();
    expect(engineServiceSpy.substitutePlayer).toHaveBeenCalledOnceWith(
      'm1', 'p1', 'b1'
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

  it('addPendingChange queues a selected swap and clears current selection', () => {
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.addPendingChange();

    expect(component.pendingChanges.length).toBe(1);
    expect(component.pendingChanges[0]).toEqual(jasmine.objectContaining({
      playerOffId: 'p1',
      playerOnId: 'b1',
      playerOffName: 'Starter 1',
      playerOnName: 'Bench 1'
    }));
    expect(component.playerOffId).toBeNull();
    expect(component.playerOnId).toBeNull();
    expect(component.canConfirm).toBeTrue();
  });

  it('confirm applies multiple pending substitutions in order', () => {
    engineServiceSpy.substitutePlayer.and.returnValues(
      of({ success: true, minuteApplied: 35, substitutionsRemaining: 2 }),
      of({ success: true, minuteApplied: 35, substitutionsRemaining: 1 })
    );

    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.addPendingChange();
    component.selectOff(SAMPLE_PLAYERS[1]);
    component.selectOn(SAMPLE_PLAYERS[5]);
    component.addPendingChange();
    component.confirm();

    expect(engineServiceSpy.substitutePlayer.calls.count()).toBe(2);
    expect(engineServiceSpy.substitutePlayer.calls.argsFor(0)).toEqual(['m1', 'p1', 'b1']);
    expect(engineServiceSpy.substitutePlayer.calls.argsFor(1)).toEqual(['m1', 'p2', 'b2']);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
      success: true,
      substitutionsApplied: 2,
      playerOffId: 'p1',
      playerOnId: 'b1'
    }));
    const closePayload = dialogRefSpy.close.calls.mostRecent().args[0] as any;
    expect(closePayload.substitutions.length).toBe(2);
  });

  it('confirm treats an already-applied multi substitution response as idempotent', () => {
    engineServiceSpy.substitutePlayer.and.returnValues(
      of({ success: true, minuteApplied: 35, substitutionsRemaining: 2 }),
      of({
        success: false,
        minuteApplied: 0,
        substitutionsRemaining: 2,
        error: 'Player p2 has already been substituted off'
      })
    );

    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.addPendingChange();
    component.selectOff(SAMPLE_PLAYERS[1]);
    component.selectOn(SAMPLE_PLAYERS[5]);
    component.addPendingChange();
    component.confirm();

    expect(engineServiceSpy.substitutePlayer.calls.count()).toBe(2);
    expect(component.errorMsg).toBe('');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
      success: true,
      substitutionsApplied: 2,
      playerOffId: 'p1',
      playerOnId: 'b1'
    }));
    const closePayload = dialogRefSpy.close.calls.mostRecent().args[0] as any;
    expect(closePayload.substitutions.length).toBe(2);
  });

  it('confirm sends fine-tuned pixel positions after substitutions', () => {
    engineServiceSpy.substitutePlayer.and.returnValue(of({
      success: true, minuteApplied: 35, substitutionsRemaining: 2
    }));
    engineServiceSpy.changeFormation.and.returnValue(of({ success: true } as any));

    component.selectOff(SAMPLE_PLAYERS[2]);
    component.selectOn(SAMPLE_PLAYERS[5]);
    component.nudgeSelectedPlayer(1, -1);
    component.confirm();

    expect(engineServiceSpy.substitutePlayer).toHaveBeenCalledOnceWith('m1', 'p3', 'b2');
    expect(engineServiceSpy.changeFormation).toHaveBeenCalled();
    const formationArgs = engineServiceSpy.changeFormation.calls.mostRecent().args;
    expect(formationArgs[0]).toBe('m1');
    expect(formationArgs[2]).toBe('4-4-2');
    const slots = formationArgs[1] as any[];
    const tunedSlot = slots.find(slot => slot.sessionPlayerId === 'b2');
    expect(tunedSlot.customXPercent).not.toBeNull();
    expect(tunedSlot.customYPercent).not.toBeNull();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
      success: true,
      formationResult: jasmine.objectContaining({ success: true })
    }));
  });

  it('selecting a bench player makes the incoming preview the fine-tune target without changing the off player', () => {
    component.selectOff(SAMPLE_PLAYERS[2]);
    component.selectOn(SAMPLE_PLAYERS[5]);

    expect(component.playerOffId).toBe('p3');
    expect(component.playerOnId).toBe('b2');
    expect(component.selectedFineTunePlayerId).toBe('b2');

    component.handlePitchPlayerClick({ ...SAMPLE_PLAYERS[5], isStarter: true });

    expect(component.playerOffId).toBe('p3');
    expect(component.playerOnId).toBe('b2');
    expect(component.selectedFineTunePlayerId).toBe('b2');
  });

  it('hides bench players that are already prepared to come on', () => {
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.addPendingChange();

    expect(component.availableBench.map(p => p.sessionPlayerId)).toEqual(['b2', 'b3']);
  });

  it('previews the current selected swap together with existing pending swaps', () => {
    component.selectOff(SAMPLE_PLAYERS[0]);
    component.selectOn(SAMPLE_PLAYERS[4]);
    component.addPendingChange();

    component.selectOff(SAMPLE_PLAYERS[1]);
    component.selectOn(SAMPLE_PLAYERS[5]);

    expect(component.effectiveStartingXi.map(p => p.sessionPlayerId)).toEqual([
      'b1', 'b2', 'p3', 'p4'
    ]);
    expect(component.canFineTuneSelectedPlayer()).toBeTrue();
    expect(component.selectedFineTunePlayerId).toBe('b2');
  });

  it('confirm backend success=false keeps the modal open with inline error', () => {
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

  it('reads coach objective as need goal when the manager is losing', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 62,
      score: { home: 0, away: 1 },
      managerSide: 'HOME'
    };
    expect(component.coachObjective).toBe('NEED_GOAL');
    expect(component.coachObjectiveLabel).toBe('Necesito gol');
    expect(component.coachObjectiveText).toContain('Vas 1 abajo');
  });

  it('reads coach objective as protect result when the manager is winning late', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 75,
      score: { home: 2, away: 1 },
      managerSide: 'HOME'
    };
    expect(component.coachObjective).toBe('PROTECT_RESULT');
    expect(component.coachObjectiveLabel).toBe('Cuidar resultado');
    expect(component.coachObjectiveText).toContain('Vas 1 arriba');
  });

  it('renders the coach objective card in the substitution modal', () => {
    const card = fixture.nativeElement.querySelector('[data-testid="coach-objective-card"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Objetivo DT');
  });

  it('recommends an attacking bench player when the manager needs a goal', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 70,
      score: { home: 0, away: 1 },
      managerSide: 'HOME'
    };
    const rec = component.recommendedSubstitution;
    expect(rec).not.toBeNull();
    expect(rec?.playerOn.position).toBe('ATT');
    expect(component.recommendedSubstitutionText).toContain('Prioriza amenaza ofensiva');
  });

  it('prioritizes an active injured starter and keeps a tactical alternative visible', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 55,
      score: { home: 0, away: 1 },
      managerSide: 'HOME',
      playerRatings: [
        {
          playerId: 'p4',
          playerName: 'Starter 4',
          teamId: 'team-1',
          position: 'ATT',
          rating: 5.9,
          goals: 0,
          assists: 0,
          keyPasses: 0,
          shots: 1,
          yellowCards: 0,
          redCards: 0,
          injuries: 1,
          fouls: 0,
          substitutedIn: false,
          substitutedOut: false
        }
      ]
    };

    const rec = component.recommendedSubstitution;
    const alt = component.tacticalAlternativeSubstitution;

    expect(rec).not.toBeNull();
    expect(rec?.kind).toBe('medical');
    expect(rec?.playerOff.sessionPlayerId).toBe('p4');
    expect(rec?.playerOn.position).toBe('ATT');
    expect(component.recommendedSubstitutionText).toContain('Prioridad médica');
    expect(alt).not.toBeNull();
    expect(alt?.kind).toBe('tactical');
    expect(alt?.playerOff.sessionPlayerId).not.toBe('p4');
    expect(alt?.reason).toContain('Prioriza amenaza ofensiva');
  });

  it('uses an attacking wide player before a central mid when replacing an injured striker without bench strikers', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 55,
      score: { home: 0, away: 1 },
      managerSide: 'HOME',
      bench: [
        { sessionPlayerId: 'mid-higher', displayName: 'Higher Mid', position: 'MID', rating: 76, isStarter: false },
        { sessionPlayerId: 'wide-cover', displayName: 'Wide Cover', position: 'WINGER', rating: 73, isStarter: false }
      ],
      playerRatings: [
        {
          playerId: 'p4',
          playerName: 'Starter 4',
          teamId: 'team-1',
          position: 'ATT',
          rating: 5.9,
          goals: 0,
          assists: 0,
          keyPasses: 0,
          shots: 1,
          yellowCards: 0,
          redCards: 0,
          injuries: 1,
          fouls: 0,
          substitutedIn: false,
          substitutedOut: false
        }
      ]
    };

    const rec = component.recommendedSubstitution;

    expect(rec?.kind).toBe('medical');
    expect(rec?.playerOff.sessionPlayerId).toBe('p4');
    expect(rec?.playerOn.sessionPlayerId).toBe('wide-cover');
  });

  it('recommends a protective bench player when the manager is winning late', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 78,
      score: { home: 2, away: 1 },
      managerSide: 'HOME',
      bench: [
        { ...SAMPLE_PLAYERS[4], rating: 86 },
        SAMPLE_PLAYERS[5],
        SAMPLE_PLAYERS[6]
      ]
    };
    const rec = component.recommendedSubstitution;
    expect(rec).not.toBeNull();
    expect(rec?.playerOn.position).toBe('DEF');
    expect(component.recommendedSubstitutionText).toContain('Prioriza estructura');
  });

  it('avoids a defensive reshuffle as the best protect-result recommendation', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 78,
      score: { home: 2, away: 1 },
      managerSide: 'HOME',
      startingXi: [
        { sessionPlayerId: 'gk', displayName: 'GK', position: 'GK', rating: 80, isStarter: true },
        { sessionPlayerId: 'cb', displayName: 'Center Back', position: 'CB', rating: 76, isStarter: true },
        { sessionPlayerId: 'mid', displayName: 'Midfielder', position: 'MID', rating: 75, isStarter: true },
      ],
      bench: [
        { sessionPlayerId: 'rb', displayName: 'Fullback', position: 'RB', rating: 77, isStarter: false },
        { sessionPlayerId: 'mid2', displayName: 'Fresh Midfielder', position: 'MID', rating: 79, isStarter: false },
      ],
    };

    const rec = component.recommendedSubstitution;

    expect(rec).not.toBeNull();
    expect(rec?.playerOff.sessionPlayerId).toBe('mid');
    expect(rec?.playerOn.sessionPlayerId).toBe('mid2');
  });

  it('does not force a weak protect-result recommendation', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 78,
      score: { home: 2, away: 1 },
      managerSide: 'HOME',
      startingXi: [
        { sessionPlayerId: 'gk', displayName: 'GK', position: 'GK', rating: 80, isStarter: true },
        { sessionPlayerId: 'cb', displayName: 'Center Back', position: 'CB', rating: 76, isStarter: true },
        { sessionPlayerId: 'att', displayName: 'Forward', position: 'ATT', rating: 77, isStarter: true },
      ],
      bench: [
        { sessionPlayerId: 'rb', displayName: 'Fullback', position: 'RB', rating: 77, isStarter: false },
        { sessionPlayerId: 'att2', displayName: 'Better Forward', position: 'ATT', rating: 81, isStarter: false },
      ],
    };

    expect(component.recommendedSubstitution).toBeNull();
    expect(component.recommendedSubstitutionText).toContain('Sin recomendación clara');
  });

  it('applyRecommendedSubstitution selects the suggested off and on players', () => {
    (component as any).data = {
      ...SAMPLE_DATA,
      currentMinute: 70,
      score: { home: 0, away: 1 },
      managerSide: 'HOME'
    };
    const rec = component.recommendedSubstitution;
    expect(rec).not.toBeNull();
    component.applyRecommendedSubstitution();
    expect(component.playerOffId).toBe(rec!.playerOff.sessionPlayerId);
    expect(component.playerOnId).toBe(rec!.playerOn.sessionPlayerId);
    expect(component.canConfirm).toBeTrue();
  });

  it('cancel closes the dialog with success=false', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ success: false, reason: 'cancelled' })
    );
  });
});

describe('Substitution modal effectiveness feedback', () => {
  let component: SubstitutionModalComponent;
  let fixture: ComponentFixture<SubstitutionModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SubstitutionModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  // Build dialog data with known effectiveness values for starter and bench cases.
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
        p1: 1.0,
        p2: 0.95,
        p3: 0.75
      }
    };
  }

  beforeEach(async () => {
    engineServiceSpy = jasmine.createSpyObj('MatchEngineService', ['substitutePlayer']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Reset dialog data between scenarios.
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
    // Effectiveness classes are rendered on the visual pitch dots.
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

  // Good effectiveness should have the same DOM hook as warning/bad states.
  it('eff-good class is applied to SALE dot with eff >= 0.9 (green border symmetry check)', () => {
    const dots = fixture.nativeElement.querySelectorAll('.v25d79-pitch-dot') as NodeListOf<HTMLElement>;
    const goodDots = Array.from(dots).filter((dot: HTMLElement) =>
      dot.classList.contains('eff-good'));
    expect(goodDots.length).toBe(2,
      `expected 2 SALE dots with eff-good (p1 eff=1.0, p2 eff=0.95), got ${goodDots.length}`);
    goodDots.forEach((dot: HTMLElement) => {
      expect(dot.classList.contains('eff-warning')).withContext('eff-good dot must not also be eff-warning').toBeFalse();
      expect(dot.classList.contains('eff-bad')).withContext('eff-good dot must not also be eff-bad').toBeFalse();
    });
  });
});

// Live data rendering: visual pitch, player stat chips, and substitutions left.
describe('Substitution modal visual pitch, stats chips, and remaining substitutions', () => {
  let component: SubstitutionModalComponent;
  let fixture: ComponentFixture<SubstitutionModalComponent>;
  let engineServiceSpy: jasmine.SpyObj<MatchEngineService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SubstitutionModalComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  // Build controlled live data with ratings and event counters.
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
      // Three substitutions remaining.
      substitutionsRemaining: 3,
      formation: '4-3-3',
      playerRatings: [
        // GK with defensive events.
        { playerId: 'p1', playerName: 'Home GK', teamId: 'home', position: 'GK',
          rating: 7.2, goals: 0, assists: 0, keyPasses: 0, shots: 0,
          yellowCards: 1, redCards: 0, injuries: 0, fouls: 2,
          substitutedIn: false, substitutedOut: false },
        // CB with yellow card and key passes.
        { playerId: 'p2', playerName: 'Home CB', teamId: 'home', position: 'CB',
          rating: 7.0, goals: 0, assists: 1, keyPasses: 3, shots: 0,
          yellowCards: 1, redCards: 0, injuries: 0, fouls: 1,
          substitutedIn: false, substitutedOut: false },
        // CDM with injury event.
        { playerId: 'p3', playerName: 'Home CDM', teamId: 'home', position: 'CDM',
          rating: 6.5, goals: 0, assists: 0, keyPasses: 0, shots: 0,
          yellowCards: 0, redCards: 0, injuries: 1, fouls: 0,
          substitutedIn: false, substitutedOut: false },
        // ST with attacking output.
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

    // Reset dialog data between scenarios.
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
    // for visual smoke checks too.
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
    // Category grouping is documented in the pitchLines getter.
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
    // substitutionsRemaining comes from the live state. The modal uses it
    // to gate canConfirm and isOutOfSubs, with a safe fallback before the
    // stream has produced the field.
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

  // ========== Injury preselection ==========

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

  it('injury flow renders the coach guide, context banner and injured pitch dot', () => {
    TestBed.resetTestingModule();
    const data: SubstitutionDialogData = {
      ...SAMPLE_DATA,
      preSelectedPlayerId: 'p2',
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

    const guide = f.nativeElement.querySelector('[data-testid="sub-flow-guide"]') as HTMLElement;
    expect(guide).not.toBeNull();
    expect(guide.textContent).toContain('1. Elegí quién sale');
    expect(guide.textContent).toContain('2. Elegí quién entra');
    expect(guide.textContent).toContain('3. Confirmá el cambio');

    const context = f.nativeElement.querySelector('[data-testid="injury-context"]') as HTMLElement;
    expect(context).not.toBeNull();
    expect(context.textContent).toContain('jugador lesionado');

    const injuredDot = f.nativeElement.querySelector('.v25d79-pitch-dot.is-injury-target') as HTMLElement;
    expect(injuredDot).not.toBeNull();
    expect(injuredDot.textContent).toContain('Starter 2');
  });
});


